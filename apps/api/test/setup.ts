import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

process.env.NODE_ENV = 'test';
if (process.env.MONGODB_URI) {
  const databaseUrl = new URL(process.env.MONGODB_URI);
  if (['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)) {
    databaseUrl.pathname = '/attendity_test';
    process.env.MONGODB_URI = databaseUrl.toString();
  }
} else {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/attendity_test';
}
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-with-at-least-32-characters';
process.env.CORS_ORIGIN ??= 'http://127.0.0.1:4174';
