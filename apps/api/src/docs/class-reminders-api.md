# Attendity class reminders

The class reminder domain is tenant-scoped and available to authenticated students and lecturers. Administrators govern allowed channels and the maximum reminder window through institution settings.

## Timetable lifecycle

- `GET /api/v1/academic/schedules` returns only schedules within the actor's role scope.
- `POST /api/v1/academic/schedules` creates a future class and idempotently plans reminders.
- `PATCH /api/v1/academic/schedules/:scheduleId` increments the schedule revision, cancels obsolete deliveries, notifies affected users, and creates replacement deliveries.
- `POST /api/v1/academic/schedules/:scheduleId/cancel` cancels the class and pending deliveries, then sends an immediate in-app change notice.

## User preferences

`GET` and `PUT /api/v1/notifications/reminders/preferences` manage enablement, default lead time, channels, the user's IANA time zone, quiet hours, muted courses, and per-class overrides. `POST /reset` restores safe defaults. Delivery history is private and paginated at `/history`.

Supported offsets are 5, 10, 15, 30, 60, 120, and 1,440 minutes in the interface. The API accepts safe custom values from 5 to 10,080 minutes, subject to the institution maximum.

## Delivery guarantees

Each delivery has a tenant-unique idempotency key containing schedule revision, recipient, channel, and kind. The worker atomically claims due deliveries, recovers stale claims, and retries email or push failures up to five times with exponential backoff. A revision check prevents an obsolete timetable version from being delivered.

In-app delivery is built in. Email requires SMTP. PWA push requires `PUSH_DELIVERY_API_URL`, `PUSH_DELIVERY_API_TOKEN`, and `PUSH_VAPID_PUBLIC_KEY`; the configured gateway receives the encrypted-delivery subscription contract. SMS is policy-ready but remains unavailable until an approved provider is integrated.

Push endpoints and key material are private model fields. Delivery status is visible only to the recipient. Preference changes and timetable mutations are audit logged, and Socket.IO emits `reminder-preference:updated` and `class-reminder:created` events.

## Operations

Run `npm run migrate:class-reminders -w @qr/api` with `ALLOW_CLASS_REMINDER_MIGRATION=true` during deployment. The migration adds compatibility defaults and creates tenant, due-delivery, history, and idempotency indexes.
