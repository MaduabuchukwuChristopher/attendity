import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));
const baseEnvironment = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/attendity_test',
  JWT_ACCESS_SECRET: 'production-access-secret-with-at-least-32-characters',
  JWT_REFRESH_SECRET: 'production-refresh-secret-with-at-least-32-characters',
  QR_ENCRYPTION_SECRET: 'production-qr-encryption-secret-at-least-32-characters',
  QR_SIGNING_SECRET: 'production-qr-signing-secret-with-at-least-32-characters',
  REPORT_SIGNING_SECRET: 'production-report-secret-with-at-least-32-characters',
  CORS_ORIGIN: 'https://attendity-app.vercel.app',
  ENFORCE_HTTPS: 'true',
  RESEND_API_KEY: 're_test_value_not_a_real_secret',
  RESEND_FROM: 'Attendity <onboarding@resend.dev>',
  SMTP_HOST: '',
  SMTP_USER: '',
  SMTP_PASSWORD: '',
  SMTP_FROM: '',
};

function readCookieOptions(cookieDomain: string): Record<string, unknown> {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '--eval',
      "import('./apps/api/src/controllers/auth.controller.ts').then(({ refreshCookieOptions }) => console.log(JSON.stringify(refreshCookieOptions())))",
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, ...baseEnvironment, COOKIE_DOMAIN: cookieDomain },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const json = result.stdout.split(/\r?\n/).find((line) => line.trim().startsWith('{'));
  assert(json, `Cookie options were not printed. Output: ${result.stdout}`);
  return JSON.parse(json) as Record<string, unknown>;
}

void describe('production refresh cookie options', () => {
  void it('uses a secure host-only cross-site cookie for unrelated provider domains', () => {
    const options = readCookieOptions('');
    assert.deepEqual(options, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/v1/auth',
    });
  });

  void it('uses an explicit domain only when a shared parent domain is configured', () => {
    const options = readCookieOptions('.attendity.example');
    assert.equal(options.domain, '.attendity.example');
  });
});
