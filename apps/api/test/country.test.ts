import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { formatCountryTrustStatement, GENERIC_COUNTRY_TRUST_STATEMENT } from '@qr/shared';
import type { CountryPersonalization } from '@qr/types';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/attendity_country_test';
process.env.JWT_ACCESS_SECRET = 'country-test-access-secret-with-32-characters';
process.env.JWT_REFRESH_SECRET = 'country-test-refresh-secret-with-32-characters';
process.env.CORS_ORIGIN = 'http://127.0.0.1:4174';
process.env.IP_COUNTRY_PROVIDER_URL_TEMPLATE = '';

const { app } = await import('../src/app.js');
const { fetchCountryFromProvider, isPublicIpAddress, parseCountryProviderResponse } =
  await import('../src/services/country.service.js');

function extractCountryData(body: unknown): CountryPersonalization {
  assert.ok(body && typeof body === 'object' && 'data' in body);
  const { data } = body;
  assert.ok(data && typeof data === 'object');
  assert.ok('statement' in data && typeof data.statement === 'string');
  assert.ok('source' in data && typeof data.source === 'string');
  assert.ok('resolvedAt' in data && typeof data.resolvedAt === 'string');
  return data as CountryPersonalization;
}

void describe('country personalization', () => {
  void it('formats required irregular demonyms naturally', () => {
    assert.equal(formatCountryTrustStatement({ countryCode: 'NG' }).demonym, 'Nigerian');
    assert.equal(formatCountryTrustStatement({ countryCode: 'GH' }).demonym, 'Ghanaian');
    assert.equal(formatCountryTrustStatement({ countryCode: 'KE' }).demonym, 'Kenyan');
    assert.equal(formatCountryTrustStatement({ countryCode: 'GB' }).demonym, 'British');
    assert.equal(formatCountryTrustStatement({ countryCode: 'US' }).demonym, 'American');
    assert.equal(formatCountryTrustStatement({ countryCode: 'NL' }).demonym, 'Dutch');
    assert.equal(formatCountryTrustStatement({ countryCode: 'PH' }).demonym, 'Philippine');
    assert.equal(formatCountryTrustStatement({ countryCode: 'CI' }).demonym, 'Ivorian');
  });

  void it('uses natural country placement when no reliable demonym exists', () => {
    assert.equal(
      formatCountryTrustStatement({ countryCode: 'FJ', countryName: 'Fiji' }).statement,
      'Trusted attendance infrastructure for institutions of higher learning in Fiji.',
    );
    assert.equal(formatCountryTrustStatement().statement, GENERIC_COUNTRY_TRUST_STATEMENT);
  });

  void it('normalizes supported provider response shapes', () => {
    assert.deepEqual(parseCountryProviderResponse({ country_code: 'gb' }), {
      countryCode: 'GB',
      countryName: 'United Kingdom',
    });
    assert.deepEqual(
      parseCountryProviderResponse({ countryCode: 'CI', countryName: "Côte d'Ivoire" }),
      {
        countryCode: 'CI',
        countryName: "Côte d'Ivoire",
      },
    );
    assert.equal(parseCountryProviderResponse({ country: 'XX' }), undefined);
  });

  void it('does not send private or malformed addresses to a provider', () => {
    assert.equal(isPublicIpAddress('127.0.0.1'), false);
    assert.equal(isPublicIpAddress('10.0.0.8'), false);
    assert.equal(isPublicIpAddress('172.20.4.5'), false);
    assert.equal(isPublicIpAddress('192.168.1.8'), false);
    assert.equal(isPublicIpAddress('100.64.0.1'), false);
    assert.equal(isPublicIpAddress('198.51.100.2'), false);
    assert.equal(isPublicIpAddress('203.0.113.2'), false);
    assert.equal(isPublicIpAddress('::1'), false);
    assert.equal(isPublicIpAddress('2001:db8::1'), false);
    assert.equal(isPublicIpAddress('8.8.8.8'), true);
  });

  void it('aborts an unresponsive country provider', async () => {
    const stalledFetcher = (_input: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('provider timeout')));
      });
    await assert.rejects(
      fetchCountryFromProvider('https://country.example/{ip}', '8.8.8.8', {
        timeoutMs: 10,
        fetcher: stalledFetcher,
      }),
      /provider timeout/,
    );
  });

  void it('returns edge-personalized copy without exposing an address', async () => {
    const response = await request(app)
      .get('/api/v1/country')
      .set('x-vercel-ip-country', 'GB')
      .expect(200);
    const data = extractCountryData(response.body as unknown);
    assert.equal(data.countryCode, 'GB');
    assert.equal(
      data.statement,
      'Trusted attendance infrastructure for British institutions of higher learning.',
    );
    assert.equal(JSON.stringify(response.body).includes('127.0.0.1'), false);
  });

  void it('returns generic copy for localhost and unknown countries', async () => {
    const response = await request(app).get('/api/v1/country').expect(200);
    const data = extractCountryData(response.body as unknown);
    assert.equal(data.source, 'fallback');
    assert.equal(data.statement, GENERIC_COUNTRY_TRUST_STATEMENT);
  });
});
