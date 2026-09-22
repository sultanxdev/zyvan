import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZyvanClient } from '../../src/client';
import { ProjectsResource } from '../../src/resources/projects';
import { NotFoundError, AuthenticationError } from '../../src/errors';

describe('PR 4.2: ProjectsResource', () => {
  const apiKey = 'zyvan_test_api_key_123';
  let mockFetch: ReturnType<typeof vi.fn>;
  let client: ZyvanClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    client = new ZyvanClient({
      apiKey,
      fetch: mockFetch as unknown as typeof fetch,
    });
  });

  it('is exposed as a property on ZyvanClient', () => {
    expect(client.projects).toBeInstanceOf(ProjectsResource);
  });

  describe('list()', () => {
    it('fetches and unwraps projects list', async () => {
      const mockProjects = [
        {
          id: 'proj_1',
          organizationId: 'org_1',
          name: 'Production',
          status: 'active',
          createdAt: '2026-09-01T00:00:00.000Z',
        },
        {
          id: 'proj_2',
          organizationId: 'org_1',
          name: 'Staging',
          status: 'active',
          createdAt: '2026-09-02T00:00:00.000Z',
        },
      ];

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockProjects }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const projects = await client.projects.list();

      expect(projects).toEqual(mockProjects);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/projects',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        })
      );
      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe(`Bearer ${apiKey}`);
    });

    it('propagates AuthenticationError on 401 response', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'unauthorized',
            message: 'Invalid API key provided',
          }),
          { status: 401 }
        )
      );

      await expect(client.projects.list()).rejects.toThrow(AuthenticationError);
    });
  });

  describe('get(id)', () => {
    it('fetches and unwraps a single project by ID', async () => {
      const mockProject = {
        id: 'proj_abc123',
        organizationId: 'org_1',
        name: 'Main App',
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockProject }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const project = await client.projects.get('proj_abc123');

      expect(project).toEqual(mockProject);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/projects/proj_abc123',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('throws client-side Error when ID is empty or whitespace', async () => {
      await expect(client.projects.get('')).rejects.toThrow('Project ID is required');
      await expect(client.projects.get('   ')).rejects.toThrow('Project ID is required');
    });

    it('propagates NotFoundError on 404 response', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'not_found',
            message: 'Project not found in this organization',
          }),
          { status: 404 }
        )
      );

      await expect(client.projects.get('proj_missing')).rejects.toThrow(NotFoundError);
    });
  });
});
