// ─────────────────────────────────────────────────────────────
// Zyvan Worker — RabbitMQ Connection & Channel Manager
//
// Topology defined via shared @zyvan/queue contracts:
//   Exchange: zyvan.events (topic, durable)
//   Queue:    zyvan.delivery (durable, manual ACK)
//   Queues:   zyvan.delivery.retry.<tier> (durable, TTL + DLX back to zyvan.events)
//
// Channels:
//   - Consumer Channel: for consuming jobs from zyvan.delivery with prefetch & manual ack
//   - Confirm Channel: for publishing retry jobs with publisher confirms before acking
// ─────────────────────────────────────────────────────────────

import amqplib from 'amqplib';
import type { ChannelModel, Channel, ConfirmChannel } from 'amqplib';
import {
  EXCHANGE_EVENTS,
  QUEUE_DELIVERY,
  ROUTING_KEY_DELIVERY,
  RETRY_TIERS,
} from '@zyvan/queue';
import type { DeliveryJobMessage } from '@zyvan/queue';

export {
  EXCHANGE_EVENTS,
  QUEUE_DELIVERY,
  ROUTING_KEY_DELIVERY,
  RETRY_TIERS,
};
export type { DeliveryJobMessage };

// Legacy backward-compatibility constants
export const EXCHANGE_NAME = EXCHANGE_EVENTS;
export const DELIVERY_QUEUE = QUEUE_DELIVERY;
export const DELIVERY_ROUTING_KEY = ROUTING_KEY_DELIVERY;

// ─── Singleton State ─────────────────────────────────────────

let connection: ChannelModel | null = null;
let consumerChannel: Channel | null = null;
let confirmChannel: ConfirmChannel | null = null;

// ─── Connect ─────────────────────────────────────────────────

export async function connectRabbitMQ(
  rabbitmqUrl: string,
  prefetch: number = 5,
  logger: any
): Promise<void> {
  const conn = await amqplib.connect(rabbitmqUrl);
  const ch = await conn.createChannel();
  const cch = await conn.createConfirmChannel();

  connection = conn;
  consumerChannel = ch;
  confirmChannel = cch;

  // Prefetch controls worker concurrency
  await ch.prefetch(prefetch);

  // Assert main exchange
  await ch.assertExchange(EXCHANGE_EVENTS, 'topic', { durable: true });

  // Assert main delivery queue
  await ch.assertQueue(QUEUE_DELIVERY, {
    durable: true,
    arguments: {},
  });

  // Bind delivery queue to exchange
  await ch.bindQueue(QUEUE_DELIVERY, EXCHANGE_EVENTS, ROUTING_KEY_DELIVERY);

  // Assert tiered retry queues
  for (const tier of RETRY_TIERS) {
    await ch.assertQueue(tier.queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGE_EVENTS,
        'x-dead-letter-routing-key': ROUTING_KEY_DELIVERY,
        'x-message-ttl': tier.ttlMs,
      },
    });
  }

  // Handle connection errors
  conn.on('error', (err) => {
    logger.error({ err }, 'RabbitMQ connection error');
    connection = null;
    consumerChannel = null;
    confirmChannel = null;
  });

  conn.on('close', () => {
    logger.warn('RabbitMQ connection closed');
    connection = null;
    consumerChannel = null;
    confirmChannel = null;
  });

  logger.info('✅ RabbitMQ connected — topology asserted with tiered retry queues');
}

// ─── Channel Accessors ────────────────────────────────────────

export function getConsumerChannel(): Channel {
  if (!consumerChannel) {
    throw new Error('RabbitMQ consumer channel not available');
  }
  return consumerChannel;
}

export function getChannel(): Channel {
  return getConsumerChannel();
}

export function getConfirmChannel(): ConfirmChannel {
  if (!confirmChannel) {
    throw new Error('RabbitMQ confirm channel not available');
  }
  return confirmChannel;
}

// ─── Confirmed Retry Publishing ──────────────────────────────

/**
 * Publish a delivery retry job to a tiered retry queue and await broker confirmation.
 */
export function publishTieredRetryJobConfirmed(
  job: DeliveryJobMessage,
  targetQueue: string,
  timeoutMs = 5000
): Promise<void> {
  if (!confirmChannel) {
    return Promise.reject(new Error('RabbitMQ confirm channel not available'));
  }

  const message = Buffer.from(JSON.stringify(job));

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(
          new Error(
            `Retry publish confirm timed out after ${timeoutMs}ms for delivery ${job.deliveryId}`
          )
        );
      }
    }, timeoutMs);

    confirmChannel!.sendToQueue(
      targetQueue,
      message,
      {
        persistent: true,
        contentType: 'application/json',
        messageId: job.deliveryId,
        timestamp: Math.floor(Date.now() / 1000),
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (err) {
          return reject(err);
        }
        resolve();
      }
    );
  });
}

// ─── Disconnect ──────────────────────────────────────────────

export async function disconnectRabbitMQ(logger?: any): Promise<void> {
  try {
    if (consumerChannel) {
      await consumerChannel.close();
      consumerChannel = null;
    }
    if (confirmChannel) {
      await confirmChannel.close();
      confirmChannel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger?.info?.('RabbitMQ connection closed');
  } catch (err) {
    logger?.error?.({ err }, 'Error closing RabbitMQ connection');
  }
}
