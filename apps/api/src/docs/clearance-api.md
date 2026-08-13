# Exam eligibility and attendance clearance API

All paths are relative to `/api/v1/clearance`. JSON endpoints use the standard API envelope. Except
for public QR verification, endpoints require a bearer access token and the listed permission.

## Eligibility and report generation

- `GET /eligibility` requires `reports:read` and a student account. It calculates every approved
  course registration from completed attendance sessions and returns `eligible`, `not_eligible`, or
  `pending`. A course with no completed sessions is always pending.
- `POST /reports` requires `reports:read`. Students send `{ "courseId": "..." }`. Staff with
  `reports:write` may additionally send `studentId`. Generation succeeds only for an approved
  registration with live attendance at or above the course requirement. If an unchanged valid
  version already exists, the same report is returned.

Generation stores the live-data hash, immutable report snapshot, SHA-256 document checksum, HMAC
digital signature, opaque QR reference, generated-by identity, generated date, and version. Only
one valid report may exist for a student and course. A transaction expires an older valid version
before creating a new report and its archive event.

## Archive and documents

- `GET /reports?page=1&limit=20&status=valid&search=...` requires `reports:read`. Students receive
  only their reports; authorized staff receive tenant-scoped reports. Search covers report ID,
  matric/registration number, student name, and course code.
- `GET /reports/:reportId` requires `reports:read` and applies the same student ownership rule.
- `GET /reports/:reportId/pdf` downloads a professional A4 portrait PDF.
- `GET /reports/:reportId/xlsx` downloads a styled Excel workbook.
- `GET /reports/:reportId/csv` downloads UTF-8 CSV.
- `GET /reports/:reportId/print` returns the professional PDF inline. The client prints this PDF;
  it never prints an application webpage.
- `POST /reports/:reportId/share` returns the public verification URL and records the share in the
  audit trail. The web client uses the device share sheet with a clipboard fallback.
- `PATCH /reports/:reportId/revoke` requires `reports:write` and accepts a 10-240 character
  `{ "reason": "..." }`.

Every document includes university branding, report metadata, student/course and attendance
details, issue timestamp, report ID, verification URL, checksum, and digital signature. The PDF
also includes a QR, watermark, footer, pagination, and signature area. Every download and print
creates an immutable archive event and audit entry and increments the report counters.

## Verification

- `GET /verification/:reference` is public and rate-limited. `reference` may be the opaque QR value
  or a report ID. It never trusts data in the QR. The server verifies the stored checksum and HMAC
  signature, reloads current attendance/registration data, and expires the report if its source
  hash changed. The response exposes only the examination fields required by the verification UI.
- `GET /examiner/search?reference=...` requires `clearance:verify`. It accepts an opaque QR
  reference, report ID, or matric/registration number and returns the latest per-course results.

Verification status is `valid`, `revoked`, `expired`, `tampered`, or `not_found`. `verified` is true
only when integrity passes, live data is unchanged, report status is valid, and eligibility remains
approved.

## Synchronisation and security

Closing an attendance session expires all valid reports for its course and emits
`clearance:updated`. Verification performs the same live-data safeguard for sessions closed by a
background or delayed process. Report references are random, tenant data never crosses university
boundaries, student archive access is owner-scoped, secrets are excluded from normal database
queries, and production requires `REPORT_SIGNING_SECRET`.
