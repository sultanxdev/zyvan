// ─────────────────────────────────────────────────────────────
// Zyvan API — RabbitMQ Connection Manager
//
// Singleton AMQP connection + channel via amqplib.
// Used by the API to publish delivery jobs to the queue.
//
// Topology:
//   Exchange: zyvan.events (topic, durable)
//   Queue: zyvan.delivery (durable, persistent)
//   Queue: zyvan.delivery.retry (durable, TTL → DLX back to delivery)
// ─────────────────────────────────────────────────────────────

import amqp from 'amqplib';
import { config } from '../config';
import { logger } from './logger';

// ─── Constants ───────────────────────────────────────────────

export const EXCHANGE_NAME = 'zyvan.events';
export const DELIVERY_QUEUE = 'zyvan.delivery';
export const RETRY_QUEUE = 'zyvan.delivery.retry';
export const DELIVERY_ROUTING_KEY = 'delivery.process';

// ─── Singleton State ─────────────────────────────────────────

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

// ─── Connect ─────────────────────────────────────────────────

/**
 * Establish a connection to RabbitMQ and set up the exchange/queue topology.
 *
 * Topology:
 *   zyvan.events (topic exchange)
 *     └── delivery.process → zyvan.delivery (main delivery queue)
 *
 *   zyvan.delivery.retry (delay queue)
 *     TTL expires → dead-letter back to zyvan.events → zyvan.delivery
 *
 * This gives us delayed retry without plugins — messages published to
 * the retry queue with per-message TTL will automatically re-enter
 * the delivery queue when the TTL expires.
 */
export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqp.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();

    // Prefetch: worker processes one message at a time per channel
    await channel.prefetch(1);

    // ─── Declare exchange ──────────────────────────────────
    await channel.assertExchange(EXCHANGE_NAME, 'topic', {
      durable: true,
    });

    // ─── Declare main delivery queue ───────────────────────
    await channel.assertQueue(DELIVERY_QUEUE, {
      durable: true,
      arguments: {},
    });

    // Bind delivery queue to exchange
    await channel.bindQueue(DELIVERY_QUEUE, EXCHANGE_NAME, DELIVERY_ROUTING_KEY);

    // ─── Declare retry queue (with DLX back to main exchange) ─
    // Messages published here with per-message TTL will expire
    // and be routed back to zyvan.delivery via the dead-letter exchange.
    await channel.assertQueue(RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGE_NAME,
        'x-dead-letter-routing-key': DELIVERY_ROUTING_KEY,
      },
    });

    // Handle connection errors
    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

    logger.info('✅ RabbitMQ connected — topology asserted');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to RabbitMQ');
    throw err;
  }
}

// ─── Get Channel ─────────────────────────────────────────────

/**
 * Get the active AMQP channel.
 * Throws if not connected — caller should handle gracefully.
 */
export function getChannel(): amqp.Channel {
  if (!channel) {
    throw new Error('RabbitMQ channel not available — call connectRabbitMQ() first');
  }
  return channel;
}

/**
 * Check if RabbitMQ is connected and the channel is open.
 */
export function isRabbitMQConnected(): boolean {
  return connection !== null && channel !== null;
}

// ─── Publish ─────────────────────────────────────────────────

/**
 * Publish a delivery job to the main delivery queue.
 * The job payload is minimal — just IDs. The worker loads full
 * state from PostgreSQL (source of truth).
 *
 * @param deliveryId - The delivery record ID
 * @param eventId - The event record ID
 */
export function publishDeliveryJob(deliveryId: string, eventId: string): void {
  const ch = getChannel();
  const payload = JSON.stringify({ deliveryId, eventId });

  ch.publish(EXCHANGE_NAME, DELIVERY_ROUTING_KEY, Buffer.from(payload), {
    persistent: true, // Survive broker restart
    contentType: 'application/json',
  });

  logger.debug({ deliveryId, eventId }, 'Published delivery job to queue');
}

/**
 * Publish a delivery job to the retry queue with a delay.
 * The message will sit in the retry queue for `delayMs` milliseconds,
 * then be dead-lettered back to the main delivery queue.
 *
 * @param deliveryId - The delivery record ID
 * @param eventId - The event record ID
 * @param delayMs - Delay in milliseconds before re-processing
 */
export function publishRetryJob(deliveryId: string, eventId: string, delayMs: number): void {
  const ch = getChannel();
  const payload = JSON.stringify({ deliveryId, eventId });

  ch.sendToQueue(RETRY_QUEUE, Buffer.from(payload), {
    persistent: true,
    contentType: 'application/json',
    expiration: String(delayMs), // Per-message TTL
  });

  logger.debug({ deliveryId, eventId, delayMs }, 'Published retry job with delay');
}

// ─── Disconnect ──────────────────────────────────────────────

/**
 * Gracefully close the RabbitMQ connection.
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
