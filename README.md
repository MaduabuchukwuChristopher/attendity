# Attendity

Attendity is a production-oriented, multi-tenant attendance and academic engagement platform for institutions of higher learning and post-secondary education worldwide. It combines live verified attendance, institution-aware terminology, analytics, notifications, attendance-risk insight, and signed examination-clearance reports in a React and Express TypeScript monorepo.

## Capabilities

- Role-specific workspaces for institution administrators, academic-unit administrators, educators, students, examiners, and viewers.
- Rotating encrypted and signed QR attendance with manual fallback, duplicate prevention, optional GPS radius and provider-backed face verification.
- Course registration, academic structure, settings, people, notifications, reports, and realtime Socket.IO updates.
- Tenant-scoped announcements with authorized publishing, audience targeting, scheduling, secure attachments, read and acknowledgement tracking, and realtime feeds.
- Institution events with scoped audiences, registration, mandatory participation, reusable QR/GPS/face/PIN/manual verification, student event records, reminders, analytics, and CSV/Excel/PDF exports.
- Explainable attendance analytics, live risk detection, lecturer insight, student recommendations, PDF/Excel/CSV exports, and print-ready reports.
- Live examination eligibility, HMAC-signed versioned clearance, opaque verification QR codes, continuous examiner scanning, public server verification, and audit history.
- Installable authenticated PWA shell, offline/update status, dark mode, responsive navigation, and WCAG-oriented interaction patterns.
- Complete institution-slug sign-in, student self-registration, SMTP email verification, password recovery/change, rotating session restoration, device-session revocation, and all-device logout.
- Public demonstration enquiries with validated persistence, bot protection, rate limiting, and route-specific landing content.
- Hardened API middleware, Swagger/OpenAPI, deterministic seed data, backup/restore tooling, Docker images, and GitHub Actions release gates.

## Monorepo

- `apps/landing` — public higher-learning marketing site.
- `apps/web` — authenticated React product and public clearance verification route.
- `apps/api` — Express API, Socket.IO server, workers, exports, and operational scripts.
- `packages/ui` — shared accessible design-system components and charts.
- `packages/types`, `shared`, `utils`, `config` — reusable domain and platform packages.
- `docker` — production API/static images and Nginx ingress configuration.
- `docs` — architecture, deployment, operations, security, and domain API guides.

## Requirements

- Node.js 22 or newer and npm 10 or newer.
- MongoDB Atlas for production. A local MongoDB service is supported for development; production transaction guarantees require an Atlas cluster or replica set.
- MongoDB Database Tools only when using repository backup or restore commands.
- Optional external face-verification provider matching the contract below.

## Local development

1. Copy `.env.example` to `.env`.
2. Set the Atlas URI, exact CORS origins, public application URLs, SMTP delivery, and unique secrets of at least 32 characters.
3. Run `npm ci` (or `npm install` while intentionally changing dependencies).
4. Run `npm run dev`.

The product app runs on `http://localhost:5173`, the landing site on `http://localhost:5174`, the API on `http://localhost:4000`, Swagger on `http://localhost:4000/api/docs`, and OpenAPI JSON on `http://localhost:4000/api/openapi.json`.

### Demonstration institution data

The guarded seed creates an idempotent, semester-scale fictional institution dataset with 240 students, 18 lecturers, academic structures, curricula, teaching assignments, registrations, 384 class sessions, and varied attendance histories. It never resets or deletes existing records. To run it intentionally, set `ALLOW_DEMO_SEED=true` and provide a unique `SEED_ACCOUNT_PASSWORD` containing at least 16 characters, then run `npm run seed -w @qr/api`. Re-running updates the same stable demonstration identities and compound records instead of duplicating them. Never enable the demonstration seed in production.

## Environment and security

Production startup validates all critical configuration and rejects missing dedicated QR/report secrets, SMTP delivery, or disabled HTTPS enforcement. Set `TRUST_PROXY=true` only behind a trusted ingress. `VITE_API_URL` must be an absolute public URL; `VITE_PORTAL_URL` links the landing site to institution sign-in; `WEB_APP_URL` creates verification and reset links; `CLEARANCE_VERIFICATION_BASE_URL` must end at the product verification route.

Face verification is optional. When enabled, set `FACE_VERIFICATION_API_URL`, `FACE_VERIFICATION_API_KEY`, and a threshold from `0.5` to `1`. The provider must support:

- `POST /enrolments` with `{ subjectId, universityId, image }`, returning `{ reference, provider }`.
- `POST /verifications` with `{ reference, subjectId, universityId, image }`, returning `{ matched, confidence, provider }`.

Attendity does not retain the captured face image; it stores only provider reference and verification outcome. See `.env.example` for every variable.

## Quality gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run security:audit
```

Install the Playwright Chromium runtime once with `npx playwright install chromium`. GitHub Actions installs it automatically and also builds the three production containers.

## Documentation

- [Architecture and flow diagrams](docs/architecture.md)
- [Deployment and release guide](docs/deployment.md)
- [Operations, backup, restore, and seed data](docs/operations.md)
- [Testing and security assurance](docs/testing-and-security.md)
- [Attendance API](apps/api/src/docs/attendance-api.md)
- [Analytics and notification API](apps/api/src/docs/analytics-api.md)
- [Announcements API](apps/api/src/docs/announcements-api.md)
- [Events API](apps/api/src/docs/events-api.md)
- [Clearance API](apps/api/src/docs/clearance-api.md)
- [Institution configuration](docs/institution-configuration.md)
- [Public country personalization](docs/country-personalization.md)
- [Enhancement completion and verification record](docs/enhancement-completion.md)

Interactive endpoint documentation is generated from the versioned OpenAPI 3.1 document at `/api/docs`.

## Containers

`docker compose up --build` starts the API, authenticated web app, landing site, and edge Nginx. MongoDB Atlas remains external by design. Use the development override described in the deployment guide for local container work.

## Data protection

Enable Atlas continuous backups and regularly test restores into an isolated project. `npm run backup -w @qr/api`, `npm run restore -w @qr/api`, and `npm run seed -w @qr/api` are guarded operational commands; see the operations guide before using them.

Attendity is proprietary institution software. Do not deploy demonstration credentials or example secrets.
