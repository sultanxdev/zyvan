// ─────────────────────────────────────────────────────────────
// Zyvan Worker — RabbitMQ Connection Manager
// Same topology as the API, but this side CONSUMES from the
// delivery queue instead of publishing.
// ─────────────────────────────────────────────────────────────

import amqplib from 'amqplib';
import type { Connection, Channel } from 'amqplib';

// ─── Constants ───────────────────────────────────────────────

export const EXCHANGE_NAME = 'zyvan.events';
export const DELIVERY_QUEUE = 'zyvan.delivery';
export const RETRY_QUEUE = 'zyvan.delivery.retry';
export const DELIVERY_ROUTING_KEY = 'delivery.process';

// ─── Singleton State ─────────────────────────────────────────

let connection: Connection | null = null;
let channel: Channel | null = null;

// ─── Connect ─────────────────────────────────────────────────

export async function connectRabbitMQ(
  rabbitmqUrl: string,
  prefetch: number = 5,
  logger: any
): Promise<void> {
  const conn = await amqplib.connect(rabbitmqUrl);
  const ch = await conn.createChannel();

  connection = conn;
  channel = ch;

  // Prefetch controls worker concurrency
  await ch.prefetch(prefetch);

  // Assert topology (same as API — idempotent)
  await ch.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

  await ch.assertQueue(DELIVERY_QUEUE, {
    durable: true,
    arguments: {},
  });

  await ch.bindQueue(DELIVERY_QUEUE, EXCHANGE_NAME, DELIVERY_ROUTING_KEY);

  await ch.assertQueue(RETRY_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': EXCHANGE_NAME,
      'x-dead-letter-routing-key': DELIVERY_ROUTING_KEY,
    },
  });

  // Handle connection errors
  conn.on('error', (err) => {
    logger.error({ err }, 'RabbitMQ connection error');
    connection = null;
    channel = null;
  });

  conn.on('close', () => {
    logger.warn('RabbitMQ connection closed');
    connection = null;
    channel = null;
  });

  logger.info('✅ RabbitMQ connected — topology asserted');
}

// ─── Get Channel ─────────────────────────────────────────────

export function getChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ channel not available');
  }
  return channel;
}

// ─── Publish (Retry) ─────────────────────────────────────────

/**
 * Publish a delivery job to the retry queue with a delay.
 */
export function publishRetryJob(deliveryId: string, eventId: string, delayMs: number, logger: any): void {
  const ch = getChannel();
  const payload = JSON.stringify({ deliveryId, eventId });

  ch.sendToQueue(RETRY_QUEUE, Buffer.from(payload), {
    persistent: true,
    contentType: 'application/json',
    expiration: String(delayMs),
  });

  logger.debug({ deliveryId, eventId, delayMs }, 'Published retry job with delay');
}

// ─── Disconnect ──────────────────────────────────────────────

export async function disconnectRabbitMQ(logger: any): Promise<void> {
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
