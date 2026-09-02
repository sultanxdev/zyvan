// ─────────────────────────────────────────────────────────────
// Zyvan API — RabbitMQ Connection Manager
//
// Singleton AMQP connection + channel via amqplib.
// Topology:
//   Exchange: zyvan.events (topic, durable)
//   Queue:    zyvan.delivery (durable, DLX → zyvan.retry.exchange)
//   Queue:    zyvan.delivery.retry (durable, TTL + DLX back to zyvan.events)
//
// The API only publishes — consuming is done by the Worker.
// ─────────────────────────────────────────────────────────────

import amqplib from 'amqplib';
import type { ChannelModel, Channel } from 'amqplib';
import { config } from '../config';
import { logger } from './logger';

// ─── Constants ───────────────────────────────────────────────

export const EXCHANGE_EVENTS = 'zyvan.events';
export const QUEUE_DELIVERY = 'zyvan.delivery';
export const QUEUE_RETRY = 'zyvan.delivery.retry';
export const ROUTING_KEY_DELIVERY = 'delivery.process';

// ─── Singleton State ─────────────────────────────────────────

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

// ─── Connect & Assert Topology ───────────────────────────────

/**
 * Connect to RabbitMQ and assert the exchange/queue topology.
 * Safe to call multiple times — returns existing connection.
 */
export async function connectRabbitMQ(): Promise<void> {
  if (connection && channel) return;

  logger.info({ url: config.rabbitmqUrl.replace(/\/\/.*@/, '//***@') }, 'Connecting to RabbitMQ...');

  const conn = await amqplib.connect(config.rabbitmqUrl);
  const ch = await conn.createChannel();

  connection = conn;
  channel = ch;

  // Handle unexpected connection close
  conn.on('error', (err: any) => {
    logger.error({ err }, 'RabbitMQ connection error');
  });
  conn.on('close', () => {
    logger.warn('RabbitMQ connection closed');
    connection = null;
    channel = null;
  });

  // ─── Assert Exchange: zyvan.events ─────────────────────
  // Main exchange — API publishes delivery jobs here
  await ch.assertExchange(EXCHANGE_EVENTS, 'topic', {
    durable: true,
  });

  // ─── Assert Queue: zyvan.delivery ──────────────────────
  // Main delivery queue — consumed by workers
  await ch.assertQueue(QUEUE_DELIVERY, {
    durable: true,
    arguments: {},
  });

  // Bind delivery queue to exchange
  await ch.bindQueue(QUEUE_DELIVERY, EXCHANGE_EVENTS, ROUTING_KEY_DELIVERY);

  // ─── Assert Queue: zyvan.delivery.retry ────────────────
  // Retry queue — messages sit here until their per-message TTL expires,
  // then RabbitMQ routes them back to zyvan.events via DLX
  await ch.assertQueue(QUEUE_RETRY, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': EXCHANGE_EVENTS,
      'x-dead-letter-routing-key': ROUTING_KEY_DELIVERY,
    },
  });

  logger.info('✅ RabbitMQ connected — topology asserted');
}

// ─── Publish ─────────────────────────────────────────────────

export interface DeliveryJobMessage {
  deliveryId: string;
  eventId: string;
  destinationId: string;
  attemptNo: number;
}

/**
 * Publish a delivery job to the main delivery queue.
 * Called after persisting event + delivery records in PostgreSQL.
 */
export function publishDeliveryJob(job: DeliveryJobMessage): void {
  if (!channel) {
    throw new Error('RabbitMQ channel not available — call connectRabbitMQ() first');
  }

  const message = Buffer.from(JSON.stringify(job));

  channel.publish(EXCHANGE_EVENTS, ROUTING_KEY_DELIVERY, message, {
    persistent: true, // Survive broker restart
    contentType: 'application/json',
    messageId: job.deliveryId,
    timestamp: Math.floor(Date.now() / 1000),
  });

  logger.debug(
    { deliveryId: job.deliveryId, eventId: job.eventId },
    'Published delivery job to RabbitMQ'
  );
}

/**
 * Publish a message to the retry queue with a per-message TTL.
 * When the TTL expires, RabbitMQ routes it back to zyvan.delivery via DLX.
 */
export function publishRetryJob(job: DeliveryJobMessage, delayMs: number): void {
  if (!channel) {
    throw new Error('RabbitMQ channel not available — call connectRabbitMQ() first');
  }

  const message = Buffer.from(JSON.stringify(job));

  channel.sendToQueue(QUEUE_RETRY, message, {
    persistent: true,
    contentType: 'application/json',
    messageId: job.deliveryId,
    timestamp: Math.floor(Date.now() / 1000),
    expiration: String(delayMs), // Per-message TTL in milliseconds
  });

  logger.debug(
    { deliveryId: job.deliveryId, delayMs },
    'Published retry job to RabbitMQ'
  );
}

// ─── Health / Accessors ──────────────────────────────────────

/**
 * Get the current channel. Throws if not connected.
 */
export function getChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ channel not available');
  }
  return channel;
}

/**
 * Check whether the RabbitMQ connection is alive.
 */
export function isRabbitMQConnected(): boolean {
  return connection !== null && channel !== null;
}

// ─── Graceful Shutdown ───────────────────────────────────────

/**
 * Close the RabbitMQ channel and connection.
 */
export async function disconnectRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('RabbitMQ connection closed');
  } catch (err) {
    logger.error({ err }, 'Error closing RabbitMQ connection');
  }
}
