# Public country personalization

Attendity may personalise one supporting landing-page statement using the visitor's approximate country. The generic statement renders immediately, so the lookup never blocks first paint and failure never blocks the public website.

## Data flow

1. The API first checks deployment-provided country headers such as Cloudflare or Vercel country codes.
2. If no usable header exists and the visitor address is public, an optional server-side provider can be called.
3. Private, local, malformed, proxy-special, or unknown values return generic copy.
4. The server caches provider results under a one-way salted address hash. Raw addresses are not stored in the cache or returned to the browser.
5. The browser caches the resolved country copy for seven days and provides a manual country fallback.

Country detection is never used for identity, authorization, academic decisions, or inference of sensitive characteristics.

## Provider configuration

Set `IP_COUNTRY_PROVIDER_URL_TEMPLATE` to an HTTPS provider endpoint. Include `{ip}` where the provider expects the address in its path; when omitted, Attendity adds an `ip` query parameter. `IP_COUNTRY_PROVIDER_TOKEN` is sent as a bearer token when configured.

The provider response may use `country_code`, `countryCode`, or `country_code2`, with an optional `country_name` or `countryName`. Configure timeout, hashed-result cache duration, and endpoint rate limiting through the related environment variables in `.env.example`.

No frontend provider key is used. When provider credentials are absent, edge headers and the generic/manual fallback remain operational.

## Local testing

Localhost intentionally receives generic copy. To test personalization without changing production behavior, send a deployment-style country header to the local API:

```powershell
Invoke-RestMethod -Headers @{ 'x-vercel-ip-country' = 'GH' } -Uri 'http://localhost:4000/api/v1/country'
```

You can also use the manual country control under the landing hero statement. Do not hardcode a production country or use country detection as an access-control input.
