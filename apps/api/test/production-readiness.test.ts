import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/attendity_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://127.0.0.1:4174';
const { app } = await import('../src/app.js');

void describe('production readiness middleware', () => {
  void it('publishes liveness with hardened response headers and a request id', async () => {
    const response = await request(app).get('/api/v1/health/live').expect(200);
    assert.match(response.text, /"success":true/);
    assert.match(response.headers['x-request-id'] as string, /^[a-zA-Z0-9-]+$/);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['cache-control'], 'no-store, max-age=0');
  });

  void it('rejects operator-style keys before validation or persistence', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('content-type', 'application/json')
      .send({
        universityId: '6650f27f52cf1956c94d0101',
        email: 'user@example.edu.ng',
        password: 'NotARealPassword123!',
        $where: 'sleep(1000)',
      })
      .expect(400);
    assert.match(response.text, /"success":false/);
    assert.match(response.text, /unsupported field name/);
  });

  void it('serves a versioned OpenAPI document for every API domain', async () => {
    const response = await request(app).get('/api/openapi.json').expect(200);
    assert.match(response.text, /"openapi":"3.1.0"/);
    assert.match(response.text, /\/api\/v1\/attendance\/check-in/);
    assert.match(response.text, /\/api\/v1\/clearance\/verification\/\{reference\}/);
    assert.match(response.text, /\/api\/v1\/settings\/institution/);
    assert.match(response.text, /\/api\/v1\/academic\/schedules/);
    assert.match(response.text, /\/api\/v1\/notifications\/reminders\/preferences/);
  });

  void it('returns unavailable readiness when MongoDB is disconnected', async () => {
    const response = await request(app).get('/api/v1/health/ready').expect(503);
    assert.match(response.text, /"status":"unavailable"/);
  });
});
