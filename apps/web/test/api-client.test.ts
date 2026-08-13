import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from '../src/api/client.js';

describe('resolveApiBaseUrl', () => {
  it('returns the configured url when provided', () => {
    expect(resolveApiBaseUrl('https://api.example.com/v1')).toBe('https://api.example.com/v1');
  });

  it('uses the local API host in development when the env var is missing', () => {
    expect(resolveApiBaseUrl(undefined, 'development')).toBe('http://localhost:4000/api/v1');
  });

  it('falls back to a relative api path in production when the env var is missing', () => {
    expect(resolveApiBaseUrl(undefined, 'production')).toBe('/api/v1');
  });

  it('falls back to a relative api path when the env var is blank', () => {
    expect(resolveApiBaseUrl('   ', 'production')).toBe('/api/v1');
  });
});
