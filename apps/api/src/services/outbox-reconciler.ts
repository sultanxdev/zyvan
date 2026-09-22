// ─────────────────────────────────────────────────────────────
// Zyvan API — Outbox Reconciler Service
//
// Background reconciler ensuring durable, at-least-once delivery publishing.
// If the API crashes between committing to PostgreSQL and receiving RabbitMQ
// publisher confirms, the outbox reconciler discovers unconfirmed outbox rows
// and safely re-publishes them.
//
// Reliability Guarantees:
// 1. Multi-instance safety: Claims rows using PostgreSQL FOR UPDATE SKIP LOCKED.
// 2. 60s lease duration with 20s heartbeat renewal during in-flight publishing.
// 3. Stale lease reclaim: Rows with expired leases (> 60s) are automatically re-claimed.
// 4. Publisher confirms: Only deletes outbox rows after broker confirms disk persistence.
// 5. Unlocks on error: If publishing fails, releases the lease immediately for retry.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient, Prisma } from '@zyvan/db';
import { publishDeliveryJobsConfirmed, isRabbitMQConnected } from '../lib/rabbitmq';
import type { DeliveryJobMessage } from '@zyvan/queue';
import { logger } from '../lib/logger';
import crypto from 'crypto';

export interface ReconcilerConfig {
  pollIntervalMs?: number;
  batchSize?: number;
  leaseDurationSeconds?: number;
  heartbeatIntervalMs?: number;
  maxAttempts?: number;
}

export class OutboxReconciler {
  private readonly instanceId: string;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly leaseDurationSeconds: number;
  private readonly heartbeatIntervalMs: number;
  private readonly maxAttempts: number;

  private pollTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isProcessing = false;

  constructor(config: ReconcilerConfig = {}) {
    this.instanceId = `api-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
    this.pollIntervalMs = config.pollIntervalMs ?? 5_000;
    this.batchSize = config.batchSize ?? 100;
    this.leaseDurationSeconds = config.leaseDurationSeconds ?? 60;
    this.heartbeatIntervalMs = config.heartbeatIntervalMs ?? 20_000;
    this.maxAttempts = config.maxAttempts ?? 10;
  }

  /**
   * Start the outbox reconciler polling loop.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info(
      {
        instanceId: this.instanceId,
        pollIntervalMs: this.pollIntervalMs,
        leaseDurationSeconds: this.leaseDurationSeconds,
      },
      '🔄 Outbox Reconciler started'
    );

    // Initial run with a slight delay
    setTimeout(() => {
      if (this.isRunning) {
        this.tick();
      }
    }, 1_000);

    this.pollTimer = setInterval(() => {
      if (this.isRunning) {
        this.tick();
      }
    }, this.pollIntervalMs);
  }

  /**
   * Stop the reconciler and release any locks currently held by this instance.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    logger.info({ instanceId: this.instanceId }, 'Stopping Outbox Reconciler...');

    // Wait if a batch is currently executing (up to 5s)
    const startTime = Date.now();
    while (this.isProcessing && Date.now() - startTime < 5_000) {
      await new Promise((r) => setTimeout(r, 100));
    }

    // Release any remaining locks held by this instance
    try {
      const prisma = getPrismaClient();
      await prisma.$executeRaw`
        UPDATE outbox_messages
        SET locked_at = NULL, locked_by = NULL
        WHERE locked_by = ${this.instanceId}
      `;
      logger.info({ instanceId: this.instanceId }, 'Released all reconciler outbox locks');
    } catch (err) {
      logger.error({ err, instanceId: this.instanceId }, 'Error releasing reconciler outbox locks on shutdown');
    }

    logger.info({ instanceId: this.instanceId }, 'Outbox Reconciler stopped');
  }

  /**
   * Single reconciliation tick.
   * Atomically claims a batch of outbox messages, publishes them with confirms,
   * and deletes confirmed rows.
   */
  async tick(): Promise<number> {
    if (this.isProcessing) {
      return 0; // Skip tick if previous batch is still running
    }

    if (!isRabbitMQConnected()) {
      return 0; // Don't attempt if RabbitMQ is disconnected
    }

    this.isProcessing = true;

    try {
      return await this.processBatch();
    } catch (err) {
      logger.error({ err, instanceId: this.instanceId }, 'Error during outbox reconciliation batch');
      return 0;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Claims and processes a batch of pending outbox messages.
   */
  private async processBatch(): Promise<number> {
    const prisma = getPrismaClient();

    // 1. Atomic batch claim with 60s lease using FOR UPDATE SKIP LOCKED
    const claimedRows = await prisma.$queryRaw<
      Array<{
        id: string;
        delivery_id: string;
        organization_id: string;
        attempts: number;
      }>
    >`
      WITH candidate AS (
        SELECT id
        FROM outbox_messages
        WHERE (locked_at IS NULL OR locked_at < NOW() - (${this.leaseDurationSeconds} || ' seconds')::INTERVAL)
          AND attempts < ${this.maxAttempts}
        ORDER BY created_at ASC
        LIMIT ${this.batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE outbox_messages o
      SET
        locked_at = NOW(),
        locked_by = ${this.instanceId},
        attempts = o.attempts + 1
      FROM candidate
      WHERE o.id = candidate.id
      RETURNING o.id, o.delivery_id, o.organization_id, o.attempts
    `;

    if (!claimedRows || claimedRows.length === 0) {
      return 0;
    }

    const claimedDeliveryIds = claimedRows.map((r) => r.delivery_id);
    logger.info(
      { count: claimedRows.length, instanceId: this.instanceId },
      'Claimed orphaned/unconfirmed outbox rows for reconciliation'
    );

    // 2. Active lease heartbeat while batch in-flight
    const heartbeatTimer = setInterval(async () => {
      try {
        await prisma.$executeRaw`
          UPDATE outbox_messages
          SET locked_at = NOW()
          WHERE locked_by = ${this.instanceId}
            AND delivery_id IN (${Prisma.join(claimedDeliveryIds)})
        `;
        logger.debug(
          { count: claimedDeliveryIds.length, instanceId: this.instanceId },
          'Renewed outbox batch lease heartbeat'
        );
      } catch (err) {
        logger.warn({ err, instanceId: this.instanceId }, 'Failed to renew outbox lease heartbeat');
      }
    }, this.heartbeatIntervalMs);

    try {
      // 3. Prepare delivery jobs
      const jobs: DeliveryJobMessage[] = claimedRows.map((row) => ({
        deliveryId: row.delivery_id,
        attemptNo: 1, // State machine in worker will load actual attempt count from DB
      }));

      // 4. Batch publish with confirms
      const { confirmed, failed } = await publishDeliveryJobsConfirmed(jobs);

      // 5. Delete confirmed outbox rows
      if (confirmed.length > 0) {
        await prisma.$executeRaw`
          DELETE FROM outbox_messages
          WHERE delivery_id IN (${Prisma.join(confirmed)})
        `;
        logger.info(
          { confirmedCount: confirmed.length, instanceId: this.instanceId },
          'Reconciler successfully published and removed outbox records'
        );
      }

      // 6. Release lock on failed rows so another pass can retry
      if (failed.length > 0) {
        await prisma.$executeRaw`
          UPDATE outbox_messages
          SET
            locked_at = NULL,
            locked_by = NULL,
            last_error = 'Reconciler publish confirm failed or timed out'
          WHERE delivery_id IN (${Prisma.join(failed)})
        `;
        logger.warn(
          { failedCount: failed.length, instanceId: this.instanceId },
          'Reconciler released failed outbox rows for subsequent retry'
        );
      }

      return confirmed.length;
    } finally {
      clearInterval(heartbeatTimer);
    }
  }
}

// Singleton Reconciler
export const outboxReconciler = new OutboxReconciler();
