import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import request from 'supertest';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/attendity_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://127.0.0.1:4174';
const { app } = await import('../src/app.js');

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));
const productionEnvironment = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/attendity_test',
  JWT_ACCESS_SECRET: 'production-access-secret-with-at-least-32-characters',
  JWT_REFRESH_SECRET: 'production-refresh-secret-with-at-least-32-characters',
  QR_ENCRYPTION_SECRET: 'production-qr-encryption-secret-at-least-32-characters',
  QR_SIGNING_SECRET: 'production-qr-signing-secret-with-at-least-32-characters',
  REPORT_SIGNING_SECRET: 'production-report-secret-with-at-least-32-characters',
  CORS_ORIGIN: 'https://attendity-app.vercel.app',
  ENFORCE_HTTPS: 'true',
  SMTP_HOST: '',
  SMTP_USER: '',
  SMTP_PASSWORD: '',
  SMTP_FROM: '',
  RESEND_API_KEY: '',
  RESEND_FROM: '',
};

function loadProductionEnvironment(overrides: Record<string, string>) {
  return spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '--eval',
      "import('./apps/api/src/config/environment.ts')",
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, ...productionEnvironment, ...overrides },
    },
  );
}

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

  void it('accepts complete Resend configuration without SMTP in production', () => {
    const result = loadProductionEnvironment({
      RESEND_API_KEY: 're_test_value_not_a_real_secret',
      RESEND_FROM: 'Attendity <onboarding@resend.dev>',
    });
    assert.equal(result.status, 0, result.stderr);
  });

  void it('rejects a Resend API key without a sender', () => {
    const result = loadProductionEnvironment({
      RESEND_API_KEY: 're_test_value_not_a_real_secret',
    });
    assert.notEqual(result.status, 0);
  });

  void it('rejects production when neither Resend nor SMTP is complete', () => {
    const result = loadProductionEnvironment({});
    assert.notEqual(result.status, 0);
  });
});
