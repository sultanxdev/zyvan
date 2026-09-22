// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Destinations Resource
// Exposes webhook destination management, toggling, and testing.
// ─────────────────────────────────────────────────────────────

import { Resource } from './base';
import type {
  CreateDestinationInput,
  UpdateDestinationInput,
  Destination,
  DestinationListInput,
  TestDestinationInput,
  TestDestinationResponse,
} from './types';

export class DestinationsResource extends Resource {
  /**
   * Create a new webhook destination.
   *
   * @param input Destination configuration including target URL and optional retry/rate-limit policies
   * @returns The created Destination
   * @throws {ValidationError} If the URL or policy configuration is invalid
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'destinations:manage' scope
   */
  public async create(input: CreateDestinationInput): Promise<Destination> {
    if (!input || !input.url || typeof input.url !== 'string' || input.url.trim() === '') {
      throw new Error('Destination URL is required and must be a non-empty string');
    }

    const res = await this.httpPost<{ data: Destination }>('/v1/destinations', input, {
      projectId: input.projectId?.trim(),
    });
    return res.data;
  }

  /**
   * List all webhook destinations within the organization or specified project.
   *
   * @param filters Optional project scoping filter
   * @returns Array of Destination records
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'destinations:manage' scope
   */
  public async list(filters?: DestinationListInput): Promise<Destination[]> {
    const query: Record<string, string | undefined> = {};
    if (filters?.projectId) {
      query.projectId = filters.projectId.trim();
    }

    const res = await this.httpGet<{ data: Destination[] }>('/v1/destinations', { query });
    return res.data;
  }

  /**
   * Retrieve a single destination by its unique identifier.
   *
   * @param id The destination ID
   * @returns Destination record
   * @throws {NotFoundError} If the destination is not found
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'destinations:manage' scope
   */
  public async get(id: string): Promise<Destination> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Destination ID is required and must be a non-empty string');
    }

    const res = await this.httpGet<{ data: Destination }>(`/v1/destinations/${encodeURIComponent(id.trim())}`);
    return res.data;
  }

  /**
   * Update configuration of an existing destination (URL, secret, policies, active state).
   *
   * @param id The destination ID
   * @param input Update fields
   * @returns The updated Destination record
   * @throws {NotFoundError} If the destination is not found
   * @throws {ValidationError} If updated attributes are invalid
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'destinations:manage' scope
   */
  public async update(id: string, input: UpdateDestinationInput): Promise<Destination> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Destination ID is required and must be a non-empty string');
    }

    const res = await this.httpPatch<{ data: Destination }>(
      `/v1/destinations/${encodeURIComponent(id.trim())}`,
      input
    );
    return res.data;
  }

  /**
   * Delete a webhook destination.
   *
   * @param id The destination ID
   * @throws {NotFoundError} If the destination is not found
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'destinations:manage' scope
   */
  public async delete(id: string): Promise<void> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Destination ID is required and must be a non-empty string');
    }

    await this.httpDelete(`/v1/destinations/${encodeURIComponent(id.trim())}`);
  }

  /**
   * Pause webhook delivery to this destination.
   *
   * @param id The destination ID
   * @returns The paused Destination record
   * @throws {NotFoundError} If the destination is not found
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'destinations:manage' scope
   */
  public async pause(id: string): Promise<Destination> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Destination ID is required and must be a non-empty string');
    }

    const res = await this.httpPost<{ data: Destination }>(
      `/v1/destinations/${encodeURIComponent(id.trim())}/pause`
    );
    return res.data;
  }

  /**
   * Resume webhook delivery to a paused destination.
   *
   * @param id The destination ID
   * @returns The resumed Destination record
   * @throws {NotFoundError} If the destination is not found
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'destinations:manage' scope
   */
  public async resume(id: string): Promise<Destination> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Destination ID is required and must be a non-empty string');
    }

    const res = await this.httpPost<{ data: Destination }>(
      `/v1/destinations/${encodeURIComponent(id.trim())}/resume`
    );
    return res.data;
  }

  /**
   * Dispatch a test ping event to verify the destination endpoint endpoint reachability.
   *
   * @param id The destination ID
   * @param input Optional payload for the test ping
   * @returns TestDestinationResponse indicating delivery outcome
   * @throws {NotFoundError} If the destination is not found
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'destinations:manage' scope
   */
  public async test(id: string, input?: TestDestinationInput): Promise<TestDestinationResponse> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Destination ID is required and must be a non-empty string');
    }

    const res = await this.httpPost<{ data: TestDestinationResponse }>(
      `/v1/destinations/${encodeURIComponent(id.trim())}/test`,
      input ?? {}
    );
    return res.data;
  }
}
