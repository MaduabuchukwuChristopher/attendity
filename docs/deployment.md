# Deployment guide

## Production topology

- Deploy `apps/landing` to Vercel or an equivalent static CDN.
- Deploy `apps/web` to Vercel or an equivalent static CDN with SPA rewrites to `index.html`.
- Deploy `apps/api` to Railway, Render, or a container platform that supports long-lived WebSocket connections.
- Use MongoDB Atlas with network access restricted to the API runtime and automated Atlas backups enabled.
- Terminate TLS at the platform load balancer or Nginx ingress and forward `X-Forwarded-Proto`.
- Use Cloudinary for institution media when media upload endpoints are enabled; never store uploads on ephemeral container disks.

## Required environment

Copy `.env.example`, replace every example secret, and configure the public URLs. Production must set `NODE_ENV=production`, `TRUST_PROXY=true`, `ENFORCE_HTTPS=true`, dedicated QR/report secrets, an Atlas SRV URI, and exact comma-separated CORS origins. Never commit `.env` files.

`VITE_API_URL` is compiled into both React applications and must be the public absolute API URL ending in `/api/v1`. `VITE_PORTAL_URL` is compiled into the landing application and must point to the product `/login` route. `WEB_APP_URL` is the API's trusted base for email verification and password-reset links. `API_PUBLIC_URL` is used in OpenAPI server metadata. `CLEARANCE_VERIFICATION_BASE_URL` must point to the public `/verify/clearance` route. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` for transactional account email.

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

## Vercel

Set the selected app root (`apps/landing` or `apps/web`), use `npm run build -w @qr/landing` or `npm run build -w @qr/web`, and publish the matching `dist` directory. Configure a catch-all rewrite to `/index.html` for the web app. Set `VITE_API_URL` before building.

## Railway or Render

Use `docker/api.Dockerfile`, expose port `4000`, enable health checks at `/api/v1/health/ready`, and allow WebSocket upgrades. Set graceful shutdown to at least 30 seconds. Do not scale background notification workers independently until distributed worker locking is configured.

## Release procedure

1. Run `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.
2. Review the OpenAPI document at `/api/docs` and the production dependency audit.
3. Back up Atlas and verify the restore runbook in a non-production project.
4. Build immutable images tagged with the commit SHA.
5. Deploy API, then web and landing assets; run readiness and critical attendance/clearance smoke checks.
6. Monitor error rate, latency, WebSocket connections, Atlas utilisation, and notification failures before completing the rollout.

Rollback by redeploying the previous immutable images. Database changes in this phase are additive; do not restore a database merely to roll back application code.
