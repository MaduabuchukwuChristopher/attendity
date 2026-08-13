# Testing and security assurance

## Automated layers

- Forty-one Node tests exercise authentication validation, enquiries, attendance, registrations, users, analytics, clearance integrity, exports, and security middleware.
- Supertest verifies the live Express middleware chain, security headers, sanitisation, health probes, and OpenAPI delivery.
- Five Vitest and Testing Library tests verify client announcements and permission-aware routing.
- Ten applicable Playwright audits cover all landing, guest-authentication, and signed-in administrator surfaces at desktop and Pixel-sized mobile viewports, including keyboard entry and WCAG 2.2 AA Axe checks.
- TypeScript project references, ESLint, Prettier, Vite production builds, and Docker builds run in GitHub Actions.

Run the local release suite:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run security:audit
```

## Security controls

- Short-lived bearer access tokens and rotating, hashed, HttpOnly refresh tokens.
- Single-use hashed verification/reset tokens, SMTP delivery, device-session management, rotation-reuse revocation, secure password change, and non-enumerating recovery responses.
- SameSite strict cookies and trusted-origin validation on cookie-authenticated mutations.
- Permission checks and tenant-scoped repositories on protected operations.
- Helmet, strict CORS, HTTPS enforcement, payload limits, global/specialised rate limits, and sensitive-response no-store headers.
- Recursive rejection of MongoDB operator keys, dotted keys, and prototype-pollution keys before validation.
- Zod validation, account lockout, bcrypt password hashing, token redaction, and generic production errors.
- Encrypted, signed, short-lived QR credentials with nonce/replay protection.
- Signed clearance reports with checksum, current-source invalidation, archive history, and public server verification.

## Dependency risk policy

Dependabot checks npm, Docker, and GitHub Actions dependencies. CI rejects critical production advisories. High advisories are reviewed individually:

- `exceljs` is an explicit spreadsheet-export requirement and currently brings a `uuid` advisory for caller-supplied buffers in UUID v3/v5/v6 generation. Attendity does not call that API; the export service generates fixed in-memory workbook structures and filenames.
- The current React Router advisory applies to React Server Components action handling. Attendity is a client-side `createBrowserRouter` application and does not enable RSC mode, server actions, or Router framework mode.
- Build-only advisories from PWA or lint tooling execute in the isolated CI/build environment and are not copied into static runtime images.

Reassess each advisory when a compatible upstream release is published; never apply broad package overrides that break the lint, test, or build toolchain.

## Accessibility assurance

The interface uses semantic landmarks, labelled navigation, form labels, table captions, screen-reader chart summaries, visible focus, keyboard-accessible controls, trapped/restored dialog focus, skip links, and reduced-motion handling. The final Phase 10 review paired automated WCAG 2.2 AA checks with direct route and component inspection; future releases must retain both forms of assurance.
