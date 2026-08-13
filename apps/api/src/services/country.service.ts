import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import {
  countryNameFromCode,
  formatCountryTrustStatement,
  GENERIC_COUNTRY_TRUST_STATEMENT,
  normalizeCountryCode,
} from '@qr/shared';
import type { CountryPersonalization } from '@qr/types';
import { z } from 'zod';
import { environment } from '../config/environment.js';

const providerResponseSchema = z
  .object({
    country_code: z.string().optional(),
    countryCode: z.string().optional(),
    country_code2: z.string().optional(),
    country: z.string().optional(),
    country_name: z.string().optional(),
    countryName: z.string().optional(),
  })
  .passthrough();

interface ProviderCountry {
  readonly countryCode: string;
  readonly countryName: string;
}

type CountryFetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function isPublicIpAddress(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const address = value.trim().replace(/^::ffff:/, '');
  const version = isIP(address);
  if (!version) return false;
  if (version === 4) {
    const [first = 0, second = 0, third = 0] = address.split('.').map(Number);
    if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
    if (first === 100 && second >= 64 && second <= 127) return false;
    if (first === 169 && second === 254) return false;
    if (first === 172 && second >= 16 && second <= 31) return false;
    if (first === 192 && (second === 168 || (second === 0 && (third === 0 || third === 2))))
      return false;
    if (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100)))
      return false;
    if (first === 203 && second === 0 && third === 113) return false;
    return true;
  }
  const lower = address.toLowerCase();
  return !(
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80:') ||
    lower.startsWith('ff') ||
    lower.startsWith('2001:db8:')
  );
}

export function parseCountryProviderResponse(value: unknown): ProviderCountry | undefined {
  const parsed = providerResponseSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const rawCode =
    parsed.data.country_code ??
    parsed.data.countryCode ??
    parsed.data.country_code2 ??
    (parsed.data.country?.length === 2 ? parsed.data.country : undefined);
  const countryCode = normalizeCountryCode(rawCode);
  if (!countryCode) return undefined;
  const rawName =
    parsed.data.country_name ??
    parsed.data.countryName ??
    (parsed.data.country && parsed.data.country.length > 2 ? parsed.data.country : undefined);
  const countryName = rawName?.trim() || countryNameFromCode(countryCode);
  return countryName ? { countryCode, countryName } : undefined;
}

export async function fetchCountryFromProvider(
  urlTemplate: string,
  ipAddress: string,
  options: {
    readonly token?: string;
    readonly timeoutMs: number;
    readonly fetcher?: CountryFetcher;
  },
): Promise<ProviderCountry | undefined> {
  const url = new URL(urlTemplate.replace('{ip}', encodeURIComponent(ipAddress)));
  if (!urlTemplate.includes('{ip}')) url.searchParams.set('ip', ipAddress);
  const headers = new Headers({ accept: 'application/json' });
  if (options.token) headers.set('authorization', `Bearer ${options.token}`);
  const response = await (options.fetcher ?? fetch)(url, {
    headers,
    signal: AbortSignal.timeout(options.timeoutMs),
  });
  if (!response.ok) return undefined;
  return parseCountryProviderResponse(await response.json());
}

interface CachedCountry extends ProviderCountry {
  readonly expiresAt: number;
}

class CountryService {
  private readonly cache = new Map<string, CachedCountry>();

  async resolve(input: {
    readonly edgeCountryCode?: string;
    readonly ipAddress?: string;
  }): Promise<CountryPersonalization> {
    const edgeCountryCode = normalizeCountryCode(input.edgeCountryCode);
    if (edgeCountryCode) {
      const countryName = countryNameFromCode(edgeCountryCode);
      if (countryName) return this.personalization(edgeCountryCode, countryName, 'edge');
    }

    const ipAddress = input.ipAddress?.trim().replace(/^::ffff:/, '');
    if (
      !ipAddress ||
      !isPublicIpAddress(ipAddress) ||
      !environment.IP_COUNTRY_PROVIDER_URL_TEMPLATE
    )
      return this.fallback();

    const key = createHash('sha256')
      .update(`${environment.JWT_ACCESS_SECRET}:${ipAddress}`)
      .digest('hex');
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now())
      return this.personalization(cached.countryCode, cached.countryName, 'provider');

    try {
      const country = await fetchCountryFromProvider(
        environment.IP_COUNTRY_PROVIDER_URL_TEMPLATE,
        ipAddress,
        {
          ...(environment.IP_COUNTRY_PROVIDER_TOKEN
            ? { token: environment.IP_COUNTRY_PROVIDER_TOKEN }
            : {}),
          timeoutMs: environment.IP_COUNTRY_TIMEOUT_MS,
        },
      );
      if (!country) return this.fallback();
      this.pruneCache();
      this.cache.set(key, {
        ...country,
        expiresAt: Date.now() + environment.IP_COUNTRY_CACHE_TTL_SECONDS * 1000,
      });
      return this.personalization(country.countryCode, country.countryName, 'provider');
    } catch {
      return this.fallback();
    }
  }

  private personalization(
    countryCode: string,
    countryName: string,
    source: 'edge' | 'provider',
  ): CountryPersonalization {
    const copy = formatCountryTrustStatement({ countryCode, countryName });
    return {
      countryCode,
      countryName,
      ...(copy.demonym ? { demonym: copy.demonym } : {}),
      statement: copy.statement,
      source,
      resolvedAt: new Date().toISOString(),
    };
  }

  private fallback(): CountryPersonalization {
    return {
      statement: GENERIC_COUNTRY_TRUST_STATEMENT,
      source: 'fallback',
      resolvedAt: new Date().toISOString(),
    };
  }

  private pruneCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache) if (value.expiresAt <= now) this.cache.delete(key);
    if (this.cache.size >= 5000) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) this.cache.delete(oldest.value);
    }
  }
}

export const countryService = new CountryService();
