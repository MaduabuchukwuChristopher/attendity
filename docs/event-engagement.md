# Event engagement, records, and analytics

Attendity treats institution events as a separate attendance domain. Event participation is stored, reported, and exported independently from course-attendance eligibility.

## Notification policy

Event messages are classified as informational, operational, security, or mandatory. Users may control optional event categories and available channels from Settings. In-app security messages and mandatory institutional notices remain enabled. Delivery also respects the event's configured channels, institution-level provider availability, tenant ownership, and an idempotent occurrence key.

Supported lifecycle messages include publication, registration confirmation, schedule or venue changes, cancellation, attendance opening and closing, successful and failed verification, missed mandatory attendance, post-event messages, and report availability.

## Student event record

`GET /api/v1/events/history` returns a paginated, tenant-scoped participation record for the signed-in user. Academic session, term, event type, mandatory status, and attendance status filters are supported. Timeline, table, and calendar views expose organizer, venue, check-in time, late or excused state, and the verification methods used. CSV and print actions never mix event attendance into course percentages.

## Event analytics

Authorized organizers and management users can retrieve analytics for events within their permitted scope. Analytics include attendance KPIs, institution-unit/programme/level/role breakdowns, cumulative attendance over time, check-in timeline, peak arrivals, verification distribution and failures, duplicate and suspicious attempts, comparable events, and semester summaries.

Verification attempts are persisted with tenant, event, user, outcome, failure classification, method, and timestamp. Network and device identifiers are stored only as one-way SHA-256 hashes and are excluded from normal query selection. Repeated failed attempts are marked suspicious for operational review.

Analytics accept optional ISO date-range parameters and update through authenticated tenant socket events during active attendance. CSV, Excel, PDF, and print-ready outputs use the same role-checked service as the screen.

## Operations

Run the guarded event migration after deployment to create event, registration, notification-preference, media, attendance, and verification-attempt indexes. Set `ALLOW_EVENT_MIGRATION=true` only for the migration process. Retain event verification telemetry according to the institution's privacy and retention policy.
