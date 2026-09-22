// ─────────────────────────────────────────────────────────────
// Zyvan API — RabbitMQ Connection & Confirmed Publisher Manager
//
// Singleton AMQP connection + ConfirmChannel via amqplib.
// Topology:
//   Exchange: zyvan.events (topic, durable)
//   Queue:    zyvan.delivery (durable, bound to delivery.process)
//   Queues:   zyvan.delivery.retry.<tier> (durable, DLX back to zyvan.events)
//
// The API publishes with publisher confirms — ensuring messages are safely
// persisted on disk by RabbitMQ before deleting transactional outbox records.
// ─────────────────────────────────────────────────────────────

import amqplib from 'amqplib';
import type { ChannelModel, ConfirmChannel } from 'amqplib';
import {
  EXCHANGE_EVENTS,
  QUEUE_DELIVERY,
  ROUTING_KEY_DELIVERY,
  RETRY_TIERS,
} from '@zyvan/queue';
import type { DeliveryJobMessage } from '@zyvan/queue';
import { config } from '../config';
import { logger } from './logger';

export {
  EXCHANGE_EVENTS,
  QUEUE_DELIVERY,
  ROUTING_KEY_DELIVERY,
  RETRY_TIERS,
};
export type { DeliveryJobMessage };

// Legacy backward-compatibility constants
export const QUEUE_RETRY = 'zyvan.delivery.retry';

// ─── Singleton State ─────────────────────────────────────────

let connection: ChannelModel | null = null;
let confirmChannel: ConfirmChannel | null = null;

// ─── Connect & Assert Topology ───────────────────────────────

/**
 * Connect to RabbitMQ with a ConfirmChannel and assert the exchange/queue topology.
 * Safe to call multiple times — returns existing connection.
 */
export async function connectRabbitMQ(): Promise<void> {
  if (connection && confirmChannel) return;

  logger.info({ url: config.rabbitmqUrl.replace(/\/\/.*@/, '//***@') }, 'Connecting to RabbitMQ with publisher confirms...');

  const conn = await amqplib.connect(config.rabbitmqUrl);
  const ch = await conn.createConfirmChannel();

  connection = conn;
  confirmChannel = ch;

  // Handle unexpected connection close
  conn.on('error', (err: any) => {
    logger.error({ err }, 'RabbitMQ connection error');
  });
  conn.on('close', () => {
    logger.warn('RabbitMQ connection closed');
    connection = null;
    confirmChannel = null;
  });

  // ─── Assert Exchange: zyvan.events ─────────────────────
  await ch.assertExchange(EXCHANGE_EVENTS, 'topic', {
    durable: true,
  });

  // ─── Assert Queue: zyvan.delivery ──────────────────────
  await ch.assertQueue(QUEUE_DELIVERY, {
    durable: true,
    arguments: {},
  });

  // Bind delivery queue to exchange
  await ch.bindQueue(QUEUE_DELIVERY, EXCHANGE_EVENTS, ROUTING_KEY_DELIVERY);

  // ─── Assert Tiered Retry Queues ────────────────────────
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

  logger.info('✅ RabbitMQ connected — topology asserted with publisher confirms');
}

// ─── Confirmed Publishing ────────────────────────────────────

/**
 * Publish a single delivery job and await broker confirmation.
 * Rejects if broker NACKs or times out.
 */
export function publishDeliveryJobConfirmed(
  job: DeliveryJobMessage,
  timeoutMs = 5000
): Promise<void> {
  if (!confirmChannel) {
    return Promise.reject(
      new Error('RabbitMQ confirm channel not available — call connectRabbitMQ() first')
    );
  }

  const message = Buffer.from(JSON.stringify(job));

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`RabbitMQ publish confirm timed out after ${timeoutMs}ms for delivery ${job.deliveryId}`));
      }
    }, timeoutMs);

    confirmChannel!.publish(
      EXCHANGE_EVENTS,
      ROUTING_KEY_DELIVERY,
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
          logger.error({ err, deliveryId: job.deliveryId }, 'RabbitMQ broker NACKed delivery job');
          return reject(err);
        }

        logger.debug({ deliveryId: job.deliveryId }, 'RabbitMQ confirmed delivery job publish');
        resolve();
      }
    );
  });
}

/**
 * Convenience wrapper for publishDeliveryJobConfirmed.
 */
export async function publishDeliveryJob(job: DeliveryJobMessage): Promise<void> {
  return publishDeliveryJobConfirmed(job);
}

/**
 * Batch-publish delivery jobs concurrently with broker confirms.
 * Returns arrays of confirmed and failed delivery IDs.
 */
export async function publishDeliveryJobsConfirmed(
  jobs: DeliveryJobMessage[]
): Promise<{ confirmed: string[]; failed: string[] }> {
  const confirmed: string[] = [];
  const failed: string[] = [];

  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      await publishDeliveryJobConfirmed(job);
      return job.deliveryId;
    })
  );

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    const deliveryId = jobs[i].deliveryId;
    if (res.status === 'fulfilled') {
      confirmed.push(deliveryId);
    } else {
      logger.warn(
        { deliveryId, reason: res.reason?.message || res.reason },
        'Failed to confirm delivery job publish'
      );
      failed.push(deliveryId);
    }
  }

  return { confirmed, failed };
}

// ─── Health / Accessors ──────────────────────────────────────

/**
 * Get the current ConfirmChannel. Throws if not connected.
 */
export function getChannel(): ConfirmChannel {
  if (!confirmChannel) {
    throw new Error('RabbitMQ confirm channel not available');
  }
  return confirmChannel;
}

/**
 * Check whether the RabbitMQ connection is alive.
 */
export function isRabbitMQConnected(): boolean {
  return connection !== null && confirmChannel !== null;
}

// ─── Graceful Shutdown ───────────────────────────────────────

/**
 * Close the RabbitMQ channel and connection.
 */
export async function disconnectRabbitMQ(): Promise<void> {
  try {
    if (confirmChannel) {
      await confirmChannel.close();
      confirmChannel = null;
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
