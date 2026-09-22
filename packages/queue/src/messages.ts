// ─────────────────────────────────────────────────────────────
// @zyvan/queue — Message Payloads
// Lean message contracts exchanged across RabbitMQ.
// PostgreSQL remains the system of record.
// ─────────────────────────────────────────────────────────────

export interface DeliveryJobMessage {
  deliveryId: string;
  attemptNo: number;
}
