// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Deliveries Resource
// Exposes delivery history query endpoints.
// ─────────────────────────────────────────────────────────────

import { Resource } from './base';
import type { ListDeliveriesInput, PaginatedDeliveriesResponse } from './types';

export class DeliveriesResource extends Resource {
  /**
   * List delivery attempts for a specific webhook destination with cursor-based pagination.
   *
   * @param destinationId The destination ID whose deliveries to list
   * @param params Optional cursor and limit parameters
   * @returns PaginatedDeliveriesResponse containing deliveries and pagination cursor
   * @throws {NotFoundError} If the destination does not exist
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'events:read' scope
   */
  public async list(
    destinationId: string,
    params?: ListDeliveriesInput
  ): Promise<PaginatedDeliveriesResponse> {
    if (!destinationId || typeof destinationId !== 'string' || destinationId.trim() === '') {
      throw new Error('Destination ID is required and must be a non-empty string');
    }

    const query: Record<string, string | number | undefined> = {};
    if (params) {
      if (params.cursor) query.cursor = params.cursor;
      if (params.limit !== undefined) query.limit = params.limit;
    }

    return this.get<PaginatedDeliveriesResponse>(
      `/v1/destinations/${encodeURIComponent(destinationId.trim())}/deliveries`,
      { query }
    );
  }
}
