import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../app';

describe('Health Routes', () => {
  it('GET /health returns 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /v1 returns 200 with service description', async () => {
    const res = await request(app).get('/v1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Zyvan API');
    expect(res.body.version).toBe('0.1.0');
  });

  it('GET /unknown-route returns 404 with Zyvan error contract', async () => {
    const res = await request(app).get('/random-path-that-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('not_found');
    expect(res.body.request_id).toBeDefined();
  });
});
