# Attendity Enhancement Completion Record

This record documents the enhancement programme defined in
`ATTENDITY_PROJECT_ENHANCEMENTS_v2.md`. The implementation extends the existing Attendity
monorepo; it does not replace the attendance engine, authorization model, design system, or
existing course data. The implementation is complete, but the release gate remains open until the
web/landing Vitest, Vite build, and Playwright commands are rerun in an environment that permits
their configuration loader to read the workspace. See **Verification results** below.

## Preserved platform capabilities

- Multi-tenant institution isolation and role/permission authorization.
- Course registration, class sessions, rotating encrypted QR attendance, optional GPS and
  provider-backed face verification, manual attendance, duplicate prevention, and audit trails.
- Role-specific student, lecturer, examiner, management, and administrative workspaces.
- Attendance analytics, risk insight, reports, examination clearance, public clearance
  verification, authentication, PWA behavior, realtime updates, and operational tooling.
- Shared TypeScript domain packages and accessible UI components used by the landing and product
  applications.

## Enhancement modules delivered

- Global institution terminology and configuration with safe compatibility defaults.
- Privacy-conscious, server-side country personalization with natural demonyms, immediate generic
  fallback, manual selection, caching, timeout handling, and endpoint rate limiting.
- Premium responsive landing experience with university/student imagery, product demonstrations,
  mobile and management previews, academic quotes, accessible animated CTAs, FAQ, and mature footer.
- Class schedules and user-controlled reminder preferences, quiet hours, per-class overrides,
  push-device consent, idempotent scheduling, delivery history, cancellation, retries, and tests.
- Tenant-scoped announcements with role-aware publishing, audience targeting, scheduling,
  attachments, acknowledgement/read receipts, pinning, delivery status, realtime events, and jobs.
- Institution events with scoped audiences, registration, mandatory participation, reusable
  QR/GPS/face/PIN/manual verification, student history views, analytics, exports, reminders,
  lifecycle processing, persisted notification retries, attendance report snapshots, and complete
  audit controls.
- Dashboard and navigation integration for upcoming classes, events, mandatory participation, and
  recent announcements without altering course attendance or exam-eligibility calculations.
- Dedicated institution-structure management, secure Cloudinary upload signing/validation, and an
  immutable administrator audit-log workspace.

## Files added and substantially modified

The enhancement is organized by domain rather than duplicating existing application layers.

- Shared contracts and permissions: `packages/types/src/index.ts`, `packages/shared/src/index.ts`,
  `packages/ui/src/components/data-table.tsx`.
- Institution configuration and structure: `apps/api/src/models/institution-structure.model.ts`,
  `apps/api/src/repositories/institution-structure.repository.ts`,
  `apps/api/src/services/institution-structure.service.ts`,
  `apps/api/src/controllers/institution-structure.controller.ts`,
  `apps/api/src/validators/institution-structure.validator.ts`,
  `apps/web/src/features/academic/institution-structure-page.tsx`.
- Media: `apps/api/src/models/media-asset.model.ts`,
  `apps/api/src/services/media-upload.service.ts`,
  `apps/api/src/controllers/media-upload.controller.ts`,
  `apps/api/src/routes/media-upload.route.ts`,
  `apps/web/src/features/uploads/secure-attachment-uploader.tsx`.
- Events and external delivery: `apps/api/src/models/event.model.ts`,
  `event-registration.model.ts`, `event-verification-attempt.model.ts`,
  `event-notification-preference.model.ts`, `event-notification-delivery.model.ts`, and
  `event-report-snapshot.model.ts`; `apps/api/src/services/event.service.ts`,
  `event-notification.service.ts`, and `event-export.service.ts`;
  `apps/api/src/controllers/event.controller.ts`, `apps/api/src/routes/event.route.ts`, and
  `apps/api/src/validators/event.validator.ts`; `apps/web/src/features/events/events-page.tsx`,
  `event-editor.tsx`, and `use-events.ts`.
- Dashboards, notifications, and governance:
  `apps/web/src/features/portals/engagement-dashboard-panel.tsx`, the role workspace pages,
  `apps/web/src/features/notifications/event-notification-preferences-panel.tsx`,
  `apps/api/src/controllers/audit.controller.ts`, `apps/api/src/routes/audit.route.ts`,
  `apps/api/src/validators/audit.validator.ts`, `apps/web/src/features/audit/audit-log-page.tsx`,
  `apps/web/src/layouts/dashboard-layout.tsx`, and `apps/web/src/routes/router.tsx`.
- Privacy and accessibility: `apps/web/src/features/attendance/face-capture.tsx`,
  `qr-scanner.tsx`, `apps/web/src/styles/index.css`, and `apps/landing/src/styles.css`.
- Operations, documentation, and verification: `apps/api/src/workers/notification.worker.ts`,
  `apps/api/src/scripts/migrate-events.ts`, `apps/api/test/events.test.ts`,
  `apps/api/test/reminders.test.ts`, `apps/api/test/setup.ts`, `apps/api/tsconfig.test.json`,
  `e2e/public-surfaces.spec.ts`, `.env.example`, `README.md`, and this record.

## Compatibility and migration order

Back up the target database and run each guarded migration once, in this order, using the same
release artifact that will serve the API:

```text
ALLOW_INSTITUTION_CONFIG_MIGRATION=true npm run migrate:institution-config -w @qr/api
ALLOW_CLASS_REMINDER_MIGRATION=true npm run migrate:class-reminders -w @qr/api
ALLOW_ANNOUNCEMENT_MIGRATION=true npm run migrate:announcements -w @qr/api
ALLOW_EVENT_MIGRATION=true npm run migrate:events -w @qr/api
```

The event migration backfills existing sessions and records as `CLASS_SESSION` before creating
event indexes. Existing class attendance remains separate from event participation. The migration
flags default to `false` and are operational confirmations, not long-lived application settings.

## Enhancement environment variables

Country personalization:

- `IP_COUNTRY_PROVIDER_URL_TEMPLATE`, `IP_COUNTRY_PROVIDER_TOKEN`
- `IP_COUNTRY_TIMEOUT_MS`, `IP_COUNTRY_CACHE_TTL_SECONDS`, `IP_COUNTRY_RATE_LIMIT`

External delivery and verification:

- `PUSH_DELIVERY_API_URL`, `PUSH_DELIVERY_API_TOKEN`, `PUSH_VAPID_PUBLIC_KEY`
- `PUSH_DELIVERY_TIMEOUT_MS`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- `FACE_VERIFICATION_API_URL`, `FACE_VERIFICATION_API_KEY`, `FACE_VERIFICATION_THRESHOLD`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`

Guarded data operations:

- `ALLOW_INSTITUTION_CONFIG_MIGRATION`, `ALLOW_CLASS_REMINDER_MIGRATION`
- `ALLOW_ANNOUNCEMENT_MIGRATION`, `ALLOW_EVENT_MIGRATION`
- `ALLOW_DEMO_SEED`, `SEED_ACCOUNT_PASSWORD`

See `.env.example` for the complete deployment contract and safe defaults.

## New API domains

All paths are below `/api/v1`.

| Domain               | Endpoint groups                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Country              | `GET /country`                                                                                                                                                                        |
| Institution          | `GET /settings/institution`, authorized `GET/PUT /settings`                                                                                                                           |
| Academic structure   | `GET/POST /academic/structure`, `PATCH/DELETE /academic/structure/:structureId`                                                                                                       |
| Schedules            | `GET/POST /academic/schedules`, `PATCH /academic/schedules/:id`, `POST /academic/schedules/:id/cancel`                                                                                |
| Reminder preferences | `GET/PUT /notifications/reminders/preferences`, reset, history, channel test, push subscription create/revoke                                                                         |
| Event preferences    | `GET/PUT /notifications/events/preferences`                                                                                                                                           |
| Announcements        | feed/detail, management list, create/update, schedule, publish, cancel, archive, pin, delivery, read, acknowledge                                                                     |
| Events               | feed/detail/history, management list, create/update, publish, register, cancel, archive, attendance open/close/requirements/check-in/manual/excuse, analytics and CSV/XLSX/PDF export |
| Secure uploads       | `GET /uploads/configuration`, `POST /uploads`                                                                                                                                         |
| Audit                | authorized, filtered, paginated `GET /audit`                                                                                                                                          |

Every private endpoint uses the established authentication, permission, validation, pagination,
tenant-scope, audit, and error-response conventions. The generated OpenAPI 3.1 document is served at
`/api/openapi.json` and the interactive documentation at `/api/docs` when enabled.

## Realtime events

- `announcement:published`, `announcement:acknowledged`, `announcement:cancelled`
- `class-schedule:created`, `class-schedule:updated`, `class-schedule:cancelled`
- `class-reminder:created`, `reminder-preference:updated`
- `event:published`, `event:updated`, `event:cancelled`
- `event:attendance-opened`, `event:attendance-recorded`, `event:attendance-closed`
- `event:report-updated`
- `notification:sent`, `dashboard:updated`, plus the preserved attendance, analytics, and clearance
  update events

Clients authenticate before joining institution- and user-scoped Socket.IO rooms.

## Background processing

The idempotent notification worker runs immediately at startup and then every minute. It handles:

- due class reminders and retry recovery;
- scheduled and expired announcements;
- event activation, reminders, completion, attendance closure, and missed mandatory-event warnings;
- persisted email/push retry delivery with exponential backoff and stale-claim recovery;
- idempotent event attendance-summary and report-snapshot generation;
- class attendance-session ending notices.

Persistent claims, attempt counters, idempotency keys, and stale-claim recovery prevent duplicate
delivery after normal retries or process restarts. External provider delivery still depends on the
credentials listed below.

## External provider status

The following integrations are real adapters, not simulated services, and must not be described as
fully operational until configured and tested in the deployment environment:

- SMTP email delivery;
- web-push delivery provider and VAPID public key;
- SMS delivery (no provider is configured by default and the channel remains unavailable);
- IP-country lookup provider (edge country headers, generic fallback, and manual selection work
  without it);
- face-verification provider.
- Cloudinary media storage and delivery.

In-app notifications, Socket.IO delivery, QR/GPS/PIN/manual event attendance, exports, and local
MongoDB persistence do not require those external provider credentials.

## Landing route checklist

| Route         | Verification focus                                                                                                                                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`           | Premium navigation; university/student hero; country trust copy; institution coverage; live credibility; interactive workflow; QR, face, GPS, events, reminders; mobile, lecturer, and management previews; clearance/report story; academic quotes; scenarios; FAQ; CTA; premium footer |
| `/features`   | Feature narrative and product capabilities                                                                                                                                                                                                                                               |
| `/solutions`  | Institution-use scenarios                                                                                                                                                                                                                                                                |
| `/pricing`    | Scope-led planning without unsupported price claims                                                                                                                                                                                                                                      |
| `/about`      | Product and higher-learning mission                                                                                                                                                                                                                                                      |
| `/contact`    | Validated, rate-limited demonstration enquiry flow                                                                                                                                                                                                                                       |
| `/faq`        | Accessible answers and implementation guidance                                                                                                                                                                                                                                           |
| `/privacy`    | Privacy and data-handling information                                                                                                                                                                                                                                                    |
| `/terms`      | Product terms information                                                                                                                                                                                                                                                                |
| unknown route | Branded, accessible not-found experience                                                                                                                                                                                                                                                 |

Verify the public pages at desktop and mobile widths with keyboard-only navigation, visible focus,
reduced motion, dark color-scheme preference, and automated accessibility checks.

## Local country-personalization testing

Localhost deliberately receives generic country copy. To test deployment-header behavior without
hardcoding or falsifying production logic, start the local API and send:

```powershell
Invoke-RestMethod -Headers @{ 'x-vercel-ip-country' = 'GH' } -Uri 'http://localhost:4000/api/v1/country'
```

Use another valid ISO alpha-2 country code to test other copy, omit the header to confirm generic
fallback, and use the landing page's manual country selector to verify the user-controlled path.
Raw IP addresses are never returned to the client or used for identity, authorization, or academic
decisions.

## Verification results

Results recorded on 1 August 2026:

- Type checking: passed for API, web, landing, types, shared, UI, and Playwright test sources.
- Lint: passed repository-wide with zero warnings.
- API unit/integration suite: passed **76 of 76** assertions using the compiled test path. The
  standard `tsx` entry point is additionally affected on this Windows/Node 25 host by
  `uv_os_get_passwd returned ENOMEM`; `npm run test:compiled -w @qr/api` avoids that host-specific
  loader failure without skipping tests.
- API and shared package production compilation: passed.
- Web and landing Vitest startup: blocked because the sandbox denied the Vite configuration loader
  permission to read the workspace (`Cannot read directory ... Access is denied`).
- Web and landing Vite production bundling: blocked by that same sandbox restriction after their
  TypeScript compilation passed.
- Playwright end-to-end verification: pending because its required Vite applications cannot start
  under the current sandbox restriction.

The failed commands did not report an application assertion, TypeScript, or lint failure. They are
nevertheless unresolved release gates. Rerun them in a normal local terminal or CI before release:

```text
npm run format:check
npm run lint
npm run typecheck
npm run test:compiled -w @qr/api
npm test -w @qr/web
npm test -w @qr/landing
npm run build
npm run test:e2e
npm run security:audit
```

Record the command results in the release ticket. Do not release while a required gate fails.
