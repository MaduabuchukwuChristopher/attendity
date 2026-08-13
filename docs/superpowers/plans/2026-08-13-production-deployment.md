# Attendity Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Attendity's API, dashboard, and landing site on the connected free-tier services with Atlas persistence, Cloudinary media, and Resend HTTPS email delivery.

**Architecture:** The existing centralized email service will delegate to a focused transport module that prefers Resend HTTPS and retains SMTP as a local fallback. The Express/Socket.IO API will run as one Render web service; the two Vite applications will run as separate Vercel projects and will use provider-assigned HTTPS URLs for cross-service configuration.

**Tech Stack:** Node.js 22, TypeScript 5.9, Express 5, Socket.IO 4, Nodemailer 9, native Fetch API, MongoDB Atlas, Cloudinary, Resend HTTP API, Render, Vercel, npm workspaces.

## Global Constraints

- Preserve the existing monorepo architecture and centralized `emailService` caller interface.
- Prefer Resend HTTPS when `RESEND_API_KEY` and `RESEND_FROM` are present; otherwise use complete SMTP configuration.
- Reject production startup when neither email provider is complete; suppress email only in development and test.
- Never commit, print, log, or return real database, Cloudinary, Resend, JWT, QR, or report secrets.
- Keep demo seeding opt-in and disabled during normal production startup.
- Render Free is acceptable for assessment despite idle spin-down and is not represented as university-grade production infrastructure.
- Each deployment must use the public GitHub `main` branch and exact HTTPS origins.

## File map

- Create `apps/api/src/services/email-delivery.ts`: provider-neutral email message type, Resend HTTP transport, SMTP adapter, provider selection, and sanitized delivery errors.
- Create `apps/api/test/email-delivery.test.ts`: focused tests for Resend, SMTP fallback, incomplete configuration, and provider failure sanitization.
- Modify `apps/api/src/services/email.service.ts`: construct the delivery transport once and keep every public email method unchanged.
- Modify `apps/api/src/config/environment.ts`: validate Resend variables and production email-provider alternatives.
- Modify `apps/api/src/controllers/auth.controller.ts`: issue a secure host-only cross-site refresh cookie for separate Render and Vercel origins.
- Modify `.env.example`: document non-secret Resend samples and provider selection.
- Modify `docs/deployment.md`: record Render Free, Resend HTTPS, Vercel monorepo, and final smoke-check instructions.
- Create `render.yaml`: non-secret Render service definition, build/start commands, health endpoint, and secret prompts.
- Create `apps/web/vercel.json`: dashboard SPA fallback.
- Create `apps/landing/vercel.json`: landing-site deployment metadata.

---

### Task 1: Resend HTTPS delivery with SMTP fallback

**Files:**

- Create: `apps/api/src/services/email-delivery.ts`
- Create: `apps/api/test/email-delivery.test.ts`
- Modify: `apps/api/src/services/email.service.ts`

**Interfaces:**

- Consumes: `environment.RESEND_API_KEY`, `environment.RESEND_FROM`, existing SMTP values, native `fetch`, and Nodemailer's `Transporter.sendMail`.
- Produces: `EmailMessage`, `EmailDelivery`, and `createEmailDelivery(options): EmailDelivery | null`, where `EmailDelivery` exposes `send(message: EmailMessage): Promise<void>` and `provider: 'resend' | 'smtp'`.

- [ ] **Step 1: Write the failing transport tests**

Create tests that instantiate the desired transport through dependency injection. The Resend test server must assert bearer authentication and this JSON body:

```ts
{
  from: 'Attendity <onboarding@resend.dev>',
  to: ['student@example.edu'],
  subject: 'Verify your Attendity account',
  text: 'Plain text',
  html: '<p>HTML</p>'
}
```

The test cases must prove:

```ts
it('prefers Resend HTTPS when both Resend values exist');
it('uses SMTP when Resend is absent and SMTP is complete');
it('returns null when neither provider is complete');
it('rejects a Resend failure without exposing its response body or API key');
```

- [ ] **Step 2: Run the focused test and verify the RED state**

Run:

```powershell
npx tsx --conditions=development --import ./apps/api/test/setup.ts --test apps/api/test/email-delivery.test.ts
```

Expected: failure because `email-delivery.ts` and `createEmailDelivery` do not exist.

- [ ] **Step 3: Implement the minimal transport module**

Implement these public contracts:

```ts
export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

export interface EmailDelivery {
  readonly provider: 'resend' | 'smtp';
  send(message: EmailMessage): Promise<void>;
}
```

Resend must call `POST https://api.resend.com/emails` through an injectable `fetchImpl`, use an `AbortSignal.timeout(10_000)`, and throw `new Error('Email provider rejected the delivery request.')` for non-2xx responses without including the response body. SMTP must continue to set `disableFileAccess` and `disableUrlAccess` to `true`.

- [ ] **Step 4: Replace direct Nodemailer usage in `email.service.ts`**

Construct `delivery` with validated environment values and pass the existing `{ to, subject, text, html }` object to `delivery.send`. Preserve all public method names, subjects, URLs, escaping, and `channel_unavailable` behavior.

- [ ] **Step 5: Run focused and regression tests**

Run:

```powershell
npx tsx --conditions=development --import ./apps/api/test/setup.ts --test apps/api/test/email-delivery.test.ts apps/api/test/auth-registration-login.test.ts apps/api/test/reminders.test.ts apps/api/test/staff-invitations.test.ts
npm run typecheck -w @qr/api
```

Expected: all selected tests pass and API type checking exits successfully.

- [ ] **Step 6: Commit the transport**

```powershell
git add apps/api/src/services/email-delivery.ts apps/api/src/services/email.service.ts apps/api/test/email-delivery.test.ts
git commit -m "feat: add Resend email delivery"
```

### Task 2: Production environment contract and deployment configuration

**Files:**

- Modify: `apps/api/src/config/environment.ts`
- Modify: `apps/api/src/controllers/auth.controller.ts`
- Modify: `.env.example`
- Modify: `docs/deployment.md`
- Create: `render.yaml`
- Create: `apps/web/vercel.json`
- Create: `apps/landing/vercel.json`
- Modify: `apps/api/test/production-readiness.test.ts`
- Create: `apps/api/test/auth-cookie.test.ts`

**Interfaces:**

- Consumes: the `createEmailDelivery` provider rules from Task 1.
- Produces: validated `environment.RESEND_API_KEY?: string`, `environment.RESEND_FROM?: string`, an optional `environment.COOKIE_DOMAIN`, production-safe cookie options, Render service metadata, and Vercel SPA rewrites.

- [ ] **Step 1: Add failing production-readiness cases**

Extend the environment child-process tests to prove:

```ts
it('accepts complete Resend configuration without SMTP in production');
it('rejects a Resend API key without a sender');
it('rejects production when neither Resend nor SMTP is complete');
```

The successful case must include all existing mandatory production values, `RESEND_API_KEY=re_test_value_not_a_real_secret`, and `RESEND_FROM=Attendity <onboarding@resend.dev>`.

- [ ] **Step 2: Run the readiness test and verify the RED state**

Run:

```powershell
npx tsx --conditions=development --import ./apps/api/test/setup.ts --test apps/api/test/production-readiness.test.ts
```

Expected: the Resend-only production case fails because the schema still requires SMTP.

- [ ] **Step 3: Implement the environment rules**

Add optional secrets for `RESEND_API_KEY` and `RESEND_FROM`, require them as a complete pair, and change the production rule to accept either a complete Resend pair or a complete SMTP set. Keep the minimum secret length at 16 characters. Change `COOKIE_DOMAIN` from a required default of `localhost` to an optional string so provider-assigned cross-origin deployments can use a host-only API cookie.

- [ ] **Step 4: Add the failing production cookie test**

Create `auth-cookie.test.ts` as a child-process test that imports the controller under a complete production environment and asserts the exported cookie-option helper returns:

```ts
{
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/api/v1/auth'
}
```

It must also assert that `domain` is absent when `COOKIE_DOMAIN` is unset and is present only when an explicit shared parent domain is supplied.

- [ ] **Step 5: Run the cookie test and verify the RED state**

Run:

```powershell
npx tsx --conditions=development --import ./apps/api/test/setup.ts --test apps/api/test/auth-cookie.test.ts
```

Expected: failure because the current controller uses `SameSite=Strict`, always supplies a production domain, and does not export the helper.

- [ ] **Step 6: Implement production-safe refresh cookies**

Export `refreshCookieOptions(persistent = false)` from `auth.controller.ts`. Use `sameSite: 'none'` only in production, retain `strict` locally, require `secure: true` in production, and spread `{ domain: environment.COOKIE_DOMAIN }` only when an explicit domain exists. Use the same helper for login, refresh, logout, and logout-all so cookie clearing exactly matches cookie creation.

- [ ] **Step 7: Add provider-safe deployment configuration**

Create `render.yaml` with one free Node web service named `attendity-api`, region `oregon`, health check `/api/v1/health/ready`, build command:

```text
npm ci && npm run build -w @qr/types && npm run build -w @qr/shared && npm run build -w @qr/api
```

and start command:

```text
node apps/api/dist/server.js
```

Declare non-secret production values directly and every credential with `sync: false`. Do not include any real value from `.env`. Do not declare `COOKIE_DOMAIN` for the provider-assigned Render and Vercel domains.

Add the dashboard SPA rewrite to `apps/web/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Add a minimal schema-only configuration to `apps/landing/vercel.json`; React Router routes are already served by the landing application's static entry point and must be verified after deployment.

- [ ] **Step 8: Update operational documentation**

Document Resend HTTPS as the Render Free production transport, SMTP as local fallback, Vercel project roots `apps/web` and `apps/landing`, and the exact post-deployment URL update order.

- [ ] **Step 9: Verify configuration**

Run:

```powershell
npx tsx --conditions=development --import ./apps/api/test/setup.ts --test apps/api/test/production-readiness.test.ts apps/api/test/email-delivery.test.ts apps/api/test/auth-cookie.test.ts
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

Expected: every command exits with status 0.

- [ ] **Step 10: Commit deployment readiness**

```powershell
git add .env.example apps/api/src/config/environment.ts apps/api/src/controllers/auth.controller.ts apps/api/test/production-readiness.test.ts apps/api/test/auth-cookie.test.ts docs/deployment.md render.yaml apps/web/vercel.json apps/landing/vercel.json
git commit -m "chore: prepare free-tier production deployment"
```

### Task 3: Publish implementation and deploy the Render API

**Files:**

- No source changes expected unless deployment logs reveal a reproducible configuration defect.
- Provider state: GitHub `main`, Render service `attendity-api`.

**Interfaces:**

- Consumes: Task 2's build/start commands and the ignored local `.env` values.
- Produces: the canonical Render API HTTPS origin and a healthy `/api/v1/health/ready` endpoint.

- [ ] **Step 1: Verify and publish the two implementation commits**

Run the verification-before-completion checks, confirm `git status --porcelain` is empty, then push `main` to `origin`.

- [ ] **Step 2: Create the Render service from GitHub**

Create one Free Node web service in the connected workspace from `https://github.com/MaduabuchukwuChristopher/attendity`, branch `main`, with automatic deployment and the commands recorded in `render.yaml`.

- [ ] **Step 3: Configure Render variables securely**

Set the provider-assigned port as `API_PORT=10000`; set production flags; transfer the existing Atlas, Cloudinary, Resend, JWT, QR, and report values through Render's secret UI. Set `ALLOW_DEMO_SEED=false` and all migration/restore guards to `false`. Do not copy secrets into source files, chat messages, deployment logs, or provider descriptions.

- [ ] **Step 4: Validate the first deploy**

Inspect build and runtime logs. Verify the returned Render URL with:

```text
GET {Render HTTPS origin}/api/v1/health/ready
```

Expected: HTTP 200 and a ready database state. Confirm startup logs do not contain credentials.

- [ ] **Step 5: Verify production integrations**

Use the deployed API to perform a controlled registration to the Resend account's permitted test recipient, inspect Resend delivery status, and verify one Cloudinary-backed profile upload. Remove only the controlled assessment record if the flow creates one and removal is supported through an existing safe administrative path.

### Task 4: Deploy the dashboard and landing applications to Vercel

**Files:**

- Provider state: Vercel projects `attendity-app` and `attendity`.

**Interfaces:**

- Consumes: Task 3's canonical Render API origin.
- Produces: canonical Vercel dashboard and landing HTTPS origins.

- [ ] **Step 1: Create the dashboard project**

Import the public GitHub repository into the connected Vercel team, name it `attendity-app`, set root directory `apps/web`, use the Vite preset, and configure:

```text
VITE_API_URL={Render HTTPS origin}/api/v1
VITE_APP_NAME=Attendity
```

Deploy and verify `/login`, `/register`, `/verify/clearance`, and an authenticated `/app` route all load without a Vercel 404.

- [ ] **Step 2: Create the landing project**

Import the same repository, name it `attendity`, set root directory `apps/landing`, use the Vite preset, and configure:

```text
VITE_API_URL={Render HTTPS origin}/api/v1
VITE_PORTAL_URL={dashboard HTTPS origin}/login
```

Deploy and verify the home page, features, solutions, pricing, contact, FAQ, privacy, terms, and About routes.

- [ ] **Step 3: Complete the API URL loop**

Update Render with exact values derived from the deployed origins:

```text
CORS_ORIGIN={dashboard HTTPS origin},{landing HTTPS origin}
WEB_APP_URL={dashboard HTTPS origin}
API_PUBLIC_URL={Render HTTPS origin}
CLEARANCE_VERIFICATION_BASE_URL={dashboard HTTPS origin}/verify/clearance
```

Leave `COOKIE_DOMAIN` unset while the API and dashboard use unrelated provider-assigned domains. The API will then issue a secure host-only cookie for its own Render hostname with `SameSite=None`.

Redeploy the API, then redeploy both Vercel projects so compiled Vite variables match the final API and portal URLs.

### Task 5: Production smoke verification and handoff

**Files:**

- Modify: `docs/deployment.md` only if verified provider behavior differs from the documented procedure.
- Modify: `README.md` to add the final public assessment URLs after they are stable.

**Interfaces:**

- Consumes: final Render and Vercel origins from Tasks 3 and 4.
- Produces: an assessment-ready public deployment and reproducible operations record.

- [ ] **Step 1: Run focused public smoke checks**

Verify, in order:

1. Landing-to-login navigation.
2. Student registration and Resend verification delivery to the permitted assessment recipient.
3. Login and refresh-cookie persistence.
4. Institution admin, lecturer, student, and examiner dashboards.
5. Profile image upload and reflected Cloudinary image.
6. Static QR creation, scan, and attendance confirmation.
7. Rotating QR live update over Socket.IO.
8. Student attendance PDF and examiner clearance verification.
9. Report PDF, CSV, and Excel generation.

- [ ] **Step 2: Check hosting diagnostics**

Inspect Render runtime logs and Vercel deployment/runtime logs for failed requests, CORS rejection, WebSocket upgrade errors, email failures, and uncaught exceptions. Confirm no secrets appear in logs.

- [ ] **Step 3: Record final URLs and free-tier caveat**

Add the stable landing and dashboard URLs to `README.md` and retain the Render idle-wake warning in `docs/deployment.md`.

- [ ] **Step 4: Run final repository verification**

Run:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
git status --short
```

Expected: every quality command succeeds and only the intended URL documentation changes remain.

- [ ] **Step 5: Commit and publish the deployment record**

```powershell
git add README.md docs/deployment.md
git commit -m "docs: publish Attendity assessment deployment"
git push origin main
```

- [ ] **Step 6: Deliver the assessment handoff**

Report the public landing, portal, API health, and API documentation URLs; the supported demo roles; Render wake-up guidance; Resend test-recipient limitation; and the exact Git commit deployed by each service.
