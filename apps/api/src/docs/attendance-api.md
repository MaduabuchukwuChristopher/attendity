# Attendance API

All endpoints use the `/api/v1/attendance` prefix, require an access-token bearer header, enforce
tenant scope, and return the standard API envelope.

## Lecturer endpoints

- `GET /lecturer` returns assigned courses, recent sessions, current encrypted QR payloads,
  `qrMode`, rotation metadata, the automatic closing time, and live check-in counts. Requires
  `attendance:write`.
- `POST /sessions` opens a session. The body includes `courseId`, `durationMinutes`,
  `qrMode`, `qrRotationSeconds`, `gpsRequired`, optional venue coordinates,
  `maximumRadiusMetres`, and `faceVerificationRequired`. The check-in window is 5–180 minutes.
  `static` produces one session-bound credential that expires at `closesAt`; `rotating` refreshes
  every 30–120 seconds and is the backward-compatible default. GPS sessions require both
  coordinates. Requires `attendance:write`.
- `PATCH /sessions/:sessionId/close` closes a lecturer-owned session and invalidates its QR.
  Requires `attendance:write`.
- `GET /sessions/:sessionId/qr.pdf` downloads a branded PDF only for an open, lecturer-owned
  `static` session. Rotating, closed, expired, cross-tenant, and non-owner exports are rejected.
  Responses are private and carry `Cache-Control: no-store`.

Static sessions may be downloaded or printed by the lecturer portal. Rotating credentials are
digital-display only and never expose export controls. Both modes close automatically when their
check-in window ends, so every later scan is rejected even when the lecturer did not close the
session manually.

## Student endpoints

- `GET /student` returns registered-course progress, chronological attendance, calendar heatmap
  data, and face-profile readiness. Requires `attendance:read` and the student role.
- `POST /check-in/requirements` accepts either `{ token }` from a QR scan or `{ code }` from the
  manual fallback. It validates the active rotation and returns required verification steps.
- `POST /check-in` accepts the same credential plus GPS coordinates and/or `imageCapture` when the
  session requires them. Registration, replay, rotation, radius, biometric, and duplicate checks
  run server-side before the record is committed.
- `POST /face-profile` accepts a live image data URL and enrols or replaces the authenticated
  student's provider-backed face profile. Raw images are not persisted by Attendity.

## Verification endpoint

- `GET /clearance/:registrationNumber` is retained as a backward-compatible live attendance
  preview. Signed, archived examination clearance and QR verification use the dedicated endpoints
  documented in `clearance-api.md`.

## Real-time events

Authenticated Socket.IO clients join their university and user rooms. Attendance clients respond
to `attendance:session-created`, `attendance:session-closed`, `attendance:qr-updated`, and
`attendance:checked-in` by invalidating affected cached queries.
Each verified attendance event also emits `analytics:updated` and creates the applicable student or
lecturer notification. Closing a session recalculates course risk before high/critical alerts are
sent.
