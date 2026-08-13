# Attendity Events API

The versioned `/api/v1/events` domain manages institution events independently from courses and class schedules. All records remain tenant scoped and all endpoints require `events:read`; organizer and analytics operations also require `events:write`.

## Attendance context

Event sessions extend the existing attendance engine using `EVENT_SESSION`. Class sessions remain `CLASS_SESSION`. Both contexts use the same encrypted rotating QR token, GPS radius validation, biometric provider adapter, duplicate-prevention index, audit service, notification service, and authorized Socket.IO rooms. Existing course attendance and exam eligibility calculations explicitly exclude event records.

Supported event methods are dynamic QR, GPS, face verification, authorized manual attendance, and secure PIN. Face verification is rejected when a provider is not configured. SMS remains unavailable until an approved provider is configured.

## Lifecycle and mandatory events

Events move through `draft`, `scheduled`, `active`, `completed`, `cancelled`, and `archived`. Publishing materializes the role and academic-unit audience into unique event registrations. The notification worker activates and completes events, sends idempotent reminders, closes live attendance sessions, and converts unresolved mandatory participation to `absent`. Authorized organizers can approve an `excused` absence with a reason and complete audit record.

The management workspace exposes draft editing, publication, cancellation, archival, attendance opening
and closing, participant search, manual attendance, and excused-absence controls according to organizer
scope. Event banners must be selected from verified image uploads, and all event attachments use the same
tenant-owned, content-validated media pipeline as announcements.

Event participation never changes course exam eligibility unless a future institution policy explicitly connects the two.

## Reporting

`GET /events/:eventId/analytics` provides tenant-scoped participation and verification metrics. `/analytics/export/csv`, `/analytics/export/xlsx`, and `/analytics/export/pdf` create downloadable reports. Students and staff can retrieve their separate participation history through `GET /events/history`.

## Compatibility migration

Existing class sessions and attendance records are backfilled with the class context before event indexes are created:

```text
ALLOW_EVENT_MIGRATION=true npm run migrate:events -w @qr/api
```
