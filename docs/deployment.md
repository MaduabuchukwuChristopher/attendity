# Attendity production deployment

## Production topology

- Deploy `apps/landing` as the public Attendity site on Vercel.
- Deploy `apps/web` as the authenticated portal on a separate Vercel project.
- Deploy `apps/api` as the Render web service described by `render.yaml`.
- Use MongoDB Atlas with network access restricted to the API runtime and automated Atlas backups enabled.
- Terminate TLS at the platform load balancer or Nginx ingress and forward `X-Forwarded-Proto`.
- Use Cloudinary for institution media when media upload endpoints are enabled; never store uploads on ephemeral container disks.

## Required environment

Copy `.env.example`, replace every example secret, and configure the public URLs. Production must set `NODE_ENV=production`, `TRUST_PROXY=true`, `ENFORCE_HTTPS=true`, dedicated QR/report secrets, an Atlas SRV URI, and exact comma-separated CORS origins. Never commit `.env` files.

`VITE_API_URL` is compiled into both React applications and must be the public absolute API URL ending in `/api/v1`. `VITE_PORTAL_URL` is compiled into the landing application and must point to the portal `/login` route. `WEB_APP_URL` is the portal origin used for verification and password-reset links. `API_PUBLIC_URL` is the Render service origin used in OpenAPI metadata. `CLEARANCE_VERIFICATION_BASE_URL` must point to the portal's public `/verify/clearance` route.

Resend HTTPS delivery is the preferred production email transport. Configure `RESEND_API_KEY` and `RESEND_FROM` together. `RESEND_FROM` must use a verified Resend sender; `onboarding@resend.dev` is suitable only for restricted testing. SMTP remains a fallback when all SMTP variables are supplied.

Keep `COOKIE_DOMAIN` unset while the Vercel and Render applications use unrelated provider domains. Attendity then uses a secure, host-only, `SameSite=None` refresh cookie in production. Set this variable only after all services share an intentional parent custom domain.

## Containers

Build and start the production topology:

```bash
docker compose build
docker compose up -d
```

The base compose file expects TLS to be terminated by an upstream production ingress. For local container development:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Add `127.0.0.1 attendity.local app.attendity.local` to the local hosts file and open port `8080`. The development override disables API HTTPS enforcement only in development.

The API image runs as an unprivileged user. Static services use read-only filesystems, immutable asset caching, SPA fallbacks, and restricted temporary mounts. MongoDB is intentionally not embedded in Compose; the project rule requires MongoDB Atlas.

## Render API

Create a Blueprint from the repository-root `render.yaml`. During initial creation, Render prompts for every variable marked `sync: false`; secrets are intentionally never committed.

Use these values after Render assigns the API hostname:

| Variable                          | Production value                                                     |
| --------------------------------- | -------------------------------------------------------------------- |
| `API_PUBLIC_URL`                  | `https://<api-service>.onrender.com`                                 |
| `WEB_APP_URL`                     | `https://<portal-project>.vercel.app`                                |
| `CORS_ORIGIN`                     | Comma-separated landing and portal origins, without trailing slashes |
| `CLEARANCE_VERIFICATION_BASE_URL` | `https://<portal-project>.vercel.app/verify/clearance`               |
| `MONGODB_URI`                     | Atlas `mongodb+srv://...` URI                                        |
| `RESEND_API_KEY`                  | Resend production API key                                            |
| `RESEND_FROM`                     | Verified sender, for example `Attendity <no-reply@example.edu>`      |
| `CLOUDINARY_*`                    | Cloudinary cloud name, API key, and API secret                       |

The Blueprint generates separate JWT, QR encryption, QR signing, and report signing secrets. It also disables demo seeding, restore, and migration switches by default. The API listens on port `10000`, permits WebSocket upgrades, and exposes readiness at `/api/v1/health/ready`.

## Vercel landing and portal

Import the GitHub repository twice:

1. Create `attendity-landing` with Root Directory `apps/landing`.
2. Create `attendity-portal` with Root Directory `apps/web`.
3. Keep Framework Preset `Vite`; Vercel detects the npm workspace and installs from the repository lockfile.
4. Add `VITE_API_URL=https://<api-service>.onrender.com/api/v1` to both projects.
5. Add `VITE_PORTAL_URL=https://<portal-project>.vercel.app/login` and `VITE_APP_NAME=Attendity` to the landing project.
6. Add `VITE_APP_NAME=Attendity` to the portal project.

Both application directories contain a Vercel SPA rewrite so refreshes and direct links resolve through `index.html`.

After both Vercel URLs are known, update the Render URL variables above and redeploy the API. If a Vercel domain changes, update `CORS_ORIGIN`, `WEB_APP_URL`, and `CLEARANCE_VERIFICATION_BASE_URL` before accepting production traffic.

## Atlas and provider safeguards

- Create a dedicated Atlas database user with access only to the Attendity database.
- Prefer Render's documented outbound ranges in the Atlas network allowlist. If temporary assessment access requires `0.0.0.0/0`, use strong credentials and replace it with restricted ranges after the demonstration.
- Keep Cloudinary and Resend credentials only in provider environment settings.
- Rotate any credential that was pasted into logs, screenshots, commits, or chat.
- Render Free services can sleep when idle; allow the first request time to wake the API before recording a demonstration.

## Release procedure

1. Run `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.
2. Review the OpenAPI document at `/api/docs` and the production dependency audit.
3. Back up Atlas and verify the restore runbook in a non-production project.
4. Build immutable images tagged with the commit SHA.
5. Deploy the API, then the portal and landing assets; run readiness and critical authentication, attendance, QR, profile-upload, and clearance checks.
6. Monitor error rate, latency, WebSocket connections, Atlas utilisation, and notification failures before completing the rollout.

Rollback by redeploying the previous immutable images. Database changes in this phase are additive; do not restore a database merely to roll back application code.
