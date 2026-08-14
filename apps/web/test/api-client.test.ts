import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from '../src/api/client.js';

describe('resolveApiBaseUrl', () => {
  it('returns the configured url when provided', () => {
    expect(resolveApiBaseUrl('https://api.example.com/v1')).toBe('https://api.example.com/v1');
  });

  it('uses the local API host in development when the env var is missing', () => {
    expect(resolveApiBaseUrl(undefined, 'development')).toBe('http://localhost:4000/api/v1');
  });

  it('uses the hosted Attendity API in production when the env var is missing', () => {
    expect(resolveApiBaseUrl(undefined, 'production')).toBe(
      'https://attendity-api.onrender.com/api/v1',
    );
  });

  it('uses the hosted Attendity API in production when the env var is blank', () => {
    expect(resolveApiBaseUrl('   ', 'production')).toBe(
      'https://attendity-api.onrender.com/api/v1',
    );
  });
});
