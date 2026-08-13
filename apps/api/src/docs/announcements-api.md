# Announcements API

The versioned `/api/v1/announcements` domain provides tenant-scoped drafting, targeting, scheduling, publication, delivery tracking, read status, and acknowledgement.

## Authorization and scope

Every route requires authentication and `announcements:read`. Mutation and delivery-management routes additionally require `announcements:write`. Institution administrators may publish across their tenant, academic-unit administrators are restricted to their assigned faculty or department, and lecturers may publish only to an assigned course. Students, examiners, and viewers receive read-only feeds.

Audience filters may combine role, campus, faculty or school, department, programme, level, and course. Course targeting resolves approved registrations and the assigned lecturer without exposing the recipient list to ordinary users.

## Lifecycle

Announcements begin as `draft`. Authorized publishers may edit, preview, schedule, publish, cancel, pin, or archive them. The notification worker claims due scheduled announcements idempotently, retries failed publication, and archives expired published records. Recipient receipts have a unique tenant, announcement, and user key so a worker retry cannot duplicate targeting.

Published announcements emit `announcement:published`; acknowledgements emit `announcement:acknowledged`; cancellations emit `announcement:cancelled`. The web application uses these events to invalidate the appropriate role-scoped queries.

## Secure attachments and sorting

Authorized publishers can upload up to eight PDF, JPEG, PNG, WebP, CSV, Word, or Excel files per
announcement. `POST /api/v1/uploads` validates the declared type, file signature, size, tenant,
uploader permission, and storage response before returning attachment metadata. Uploads are recorded as
tenant-owned media assets and new attachment references are rejected unless they match a verified asset.
Cloudinary must be configured; the interface reports storage as unavailable when credentials are absent.

Feed and management queries accept `sort=newest|oldest|priority|expires_soon` in addition to their
existing search, filter, and pagination parameters.

## Delivery and attachments

In-app delivery reuses Attendity notifications with a unique delivery key. Email and PWA push are attempted only through configured providers. SMS is rejected until an approved provider exists. Delivery totals disclose counts rather than private message content.

Attachments are validated HTTPS references from institution-controlled storage. Allowed formats are PDF, JPEG, PNG, WebP, CSV, Word, and Excel, with a 10 MB metadata limit per file and a maximum of eight files per announcement. Message fields accept plain text only.

## Migration

Run the guarded compatibility command before first deployment:

```bash
ALLOW_ANNOUNCEMENT_MIGRATION=true npm run migrate:announcements -w @qr/api
```

The migration creates feed, scheduled-job, tenant-scope, delivery, and idempotency indexes without changing existing attendance, notification, or reminder data.
