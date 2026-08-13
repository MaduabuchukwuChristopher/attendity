import {
  formatCountryTrustStatement,
  GENERIC_COUNTRY_TRUST_STATEMENT,
  normalizeCountryCode,
} from '@qr/shared';
import type { CountryPersonalization } from '@qr/types';
import { Globe2, MapPin } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { publicApiUrl } from '../lib/api.js';

const CACHE_KEY = 'attendity-country-personalization-v1';
const CLIENT_CACHE_MS = 7 * 24 * 60 * 60_000;

interface CachedCountry extends CountryPersonalization {
  readonly expiresAt: number;
}

function readCache(): CachedCountry | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'statement' in parsed &&
      typeof parsed.statement === 'string' &&
      'source' in parsed &&
      typeof parsed.source === 'string' &&
      'expiresAt' in parsed &&
      typeof parsed.expiresAt === 'number' &&
      parsed.expiresAt > Date.now()
    )
      return parsed as CachedCountry;
  } catch {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // A restricted storage context must not block the public page.
    }
  }
  return undefined;
}

function cache(value: CountryPersonalization): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...value, expiresAt: Date.now() + CLIENT_CACHE_MS }),
    );
  } catch {
    // Personalization remains functional when storage is unavailable.
  }
}

export function CountryTrustStatement() {
  const [personalization, setPersonalization] = useState<CountryPersonalization>(() => {
    const cached = readCache();
    return (
      cached ?? {
        statement: GENERIC_COUNTRY_TRUST_STATEMENT,
        source: 'fallback',
        resolvedAt: new Date().toISOString(),
      }
    );
  });

  useEffect(() => {
    if (personalization.source === 'manual') return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    void fetch(`${publicApiUrl}/country`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Country lookup failed.');
        return (await response.json()) as { readonly data: CountryPersonalization };
      })
      .then(({ data }) => {
        setPersonalization(data);
        cache(data);
      })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timeout));
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [personalization.source]);

  const applyManualCountry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rawCountryName = data.get('countryName');
    const countryName = typeof rawCountryName === 'string' ? rawCountryName.trim() : '';
    const countryCode = normalizeCountryCode(data.get('countryCode'));
    if (!countryName && !countryCode) return;
    const copy = formatCountryTrustStatement({
      ...(countryCode ? { countryCode } : {}),
      ...(countryName ? { countryName } : {}),
    });
    const manual: CountryPersonalization = {
      ...(countryCode ? { countryCode } : {}),
      ...(countryName ? { countryName } : {}),
      ...(copy.demonym ? { demonym: copy.demonym } : {}),
      statement: copy.statement,
      source: 'manual',
      resolvedAt: new Date().toISOString(),
    };
    setPersonalization(manual);
    cache(manual);
  };

  return (
    <div className="country-trust">
      <p aria-live="polite" className="country-trust-copy">
        <Globe2 aria-hidden="true" size={16} />
        <span>{personalization.statement}</span>
      </p>
      <details className="country-manual">
        <summary>Choose a country manually</summary>
        <form className="country-manual-form" onSubmit={applyManualCountry}>
          <label>
            <span>Country</span>
            <input
              defaultValue={personalization.countryName ?? ''}
              name="countryName"
              placeholder="Ghana"
            />
          </label>
          <label>
            <span>ISO code</span>
            <input
              defaultValue={personalization.countryCode ?? ''}
              maxLength={2}
              name="countryCode"
              placeholder="GH"
            />
          </label>
          <button type="submit">
            <MapPin size={14} /> Apply
          </button>
        </form>
      </details>
    </div>
  );
}
