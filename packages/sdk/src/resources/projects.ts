// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Projects Resource
// Exposes API-key authorized project inspection operations.
// ─────────────────────────────────────────────────────────────

import { Resource } from './base';
import type { Project } from './types';

export class ProjectsResource extends Resource {
  /**
   * List all projects accessible to the authenticated API key / organization.
   *
   * @returns Array of project records
   * @throws {AuthenticationError} If the API key is invalid or expired
   * @throws {AuthorizationError} If lacking 'projects:read' scope
   * @throws {ServerError} If an internal server error occurs
   */
  public async list(): Promise<Project[]> {
    const res = await this.httpGet<{ data: Project[] }>('/v1/projects');
    return res.data;
  }

  /**
   * Retrieve details of a single project by its unique identifier.
   *
   * @param id The project ID
   * @returns The project record
   * @throws {NotFoundError} If the project does not exist in the organization
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'projects:read' scope
   */
  public async get(id: string): Promise<Project> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Project ID is required and must be a non-empty string');
    }
    const res = await this.httpGet<{ data: Project }>(`/v1/projects/${encodeURIComponent(id.trim())}`);
    return res.data;
  }
}
