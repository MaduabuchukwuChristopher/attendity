# Attendity Production Deployment Design

## Objective

Deploy the existing Attendity monorepo for public assessment without changing its application architecture or exposing secrets. The deployment must preserve authentication, live QR attendance over Socket.IO, reports, Cloudinary media, email workflows, and MongoDB transactions.

## Production topology

- Deploy `apps/api` as one Render Free web service using the existing Express and Socket.IO server.
- Deploy `apps/web` as an independent Vercel project for authenticated portals and public clearance verification.
- Deploy `apps/landing` as an independent Vercel project for the marketing site.
- Use the existing MongoDB Atlas `attendity` database and Cloudinary account as managed external services.
- Use Resend's HTTPS API for production email delivery because Render Free blocks outbound SMTP ports. Retain the existing SMTP transport as a local-development fallback.

## Email delivery design

The centralized email service will select exactly one provider at startup:

1. Use Resend HTTPS when both `RESEND_API_KEY` and `RESEND_FROM` are present.
2. Otherwise use SMTP when the complete SMTP configuration is present.
3. In production, reject startup if neither provider is complete.
4. In development, suppress delivery with a structured log when neither provider is configured.

All existing email callers keep their current interface. Requests to Resend use `POST https://api.resend.com/emails`, bearer authentication, JSON content, and an explicit timeout. Provider errors are converted to a safe application error and must never expose API keys or raw credentials in responses or logs.

The current `onboarding@resend.dev` sender is acceptable for assessment testing but can deliver only within Resend's test restrictions. A verified custom domain can replace `RESEND_FROM` later without a code change.

## Configuration and secret handling

- Add `RESEND_API_KEY` and `RESEND_FROM` to the validated API environment schema and `.env.example` with clearly non-secret sample values.
- Keep all real values exclusively in ignored local environment files and hosting-provider secret stores.
- Generate distinct production values for access JWT, refresh JWT, QR encryption, QR signing, and report signing secrets.
- Configure exact Vercel origins in `CORS_ORIGIN`, the dashboard URL in `WEB_APP_URL`, and the API and clearance URLs after the hosting platforms allocate domains.
- Keep demo seeding disabled during ordinary production startup. Run it only as an explicit one-off assessment setup operation.

## Deployment sequence

1. Implement and verify Resend HTTPS delivery locally.
2. Create the Render API service from the public GitHub repository and configure secrets.
3. Verify the API readiness endpoint, Atlas connection, Cloudinary configuration, and Resend delivery.
4. Create separate Vercel projects for the dashboard and landing applications.
5. Set their build-time API and portal URLs, deploy them, then update the API's exact CORS and public URL settings.
6. Redeploy affected services and run focused production smoke checks for health, registration/email, login, profile media, static QR attendance, live Socket.IO updates, reports, and clearance verification.

## Failure handling and free-tier constraints

- Render may sleep after 15 minutes without inbound HTTP or WebSocket traffic; the first request after sleep can be delayed. This is acceptable for assessment, not university production.
- Clients retain their existing reconnection behavior for Socket.IO interruptions.
- Email-provider failures surface as delivery failures without leaking provider response bodies or secrets.
- Atlas and Cloudinary remain systems of record; no persistent data is written to Render's ephemeral filesystem.

## Verification

- Unit tests cover Resend preference, SMTP fallback, incomplete configuration, successful delivery, and sanitized provider errors.
- API type checking, focused email tests, and existing relevant integration tests must pass before deployment.
- Each deployed URL must be checked directly after final environment values are applied.
- GitHub receives only code and non-secret examples; deployment credentials remain in Render and Vercel.

## Out of scope

- A paid always-on runtime, custom domain purchase, distributed Socket.IO adapter, separate background-worker service, or production-scale Atlas tier.
- Changing existing product flows or replacing the current centralized email-service interface.
