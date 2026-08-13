# Analytics, Reports, and Notifications API

All endpoints require a valid access token, are scoped to the authenticated university, and use the
standard API response envelope.

## Analytics

- `GET /api/v1/analytics/overview?days=30` requires `analytics:read`. It returns KPI cards, daily
  trends, course and department comparisons, student leaderboards, live attendance, evidence-backed
  insights, and explainable registration risk predictions. The period accepts 7–365 days.
- Lecturer requests are restricted to courses assigned to that lecturer. Administrative and viewer
  requests use the authenticated university scope.
- `GET /api/v1/analytics/my-risk?days=365` requires student attendance and report permissions. It
  returns only the authenticated student's registered-course predictions.

Risk projections combine the complete attendance rate with the latest five completed lectures. A
response includes the current and projected percentages, course requirement, risk level,
confidence, evidence, and a calculated recovery recommendation. Courses with no completed lectures
are not classified as at risk.

## Live reports

- `GET /api/v1/analytics/reports` requires `reports:read`.
- Supported scopes are `university`, `course`, `student`, and `risk`. Course scope requires a
  `courseId`; student users are always restricted to their own records.
- Optional `from`, `to`, `page`, and `limit` filters are validated and applied before report rows are
  calculated.
- Every response includes university branding, generation metadata, a report ID, live-data
  verification timestamp, and a SHA-256 checksum. Printable clearance documents, QR verification,
  PDF, and spreadsheet exports are available through the clearance API.

## Notification centre

- `GET /api/v1/notifications` supports `all`, `unread`, `read`, and `archived` status filters plus
  pagination.
- `PATCH /api/v1/notifications/read-all` marks all recipient notifications as read.
- `PATCH /api/v1/notifications/:notificationId/read` marks one notification as read.
- `PATCH /api/v1/notifications/:notificationId/archive` archives one notification.
- `DELETE /api/v1/notifications/:notificationId` soft-deletes one notification.

Attendance events create notifications for recorded and failed check-ins, session start, imminent
session closure, session completion, and high/critical attendance risk. Socket.IO sends new
notifications to the authenticated user's room and invalidates relevant client analytics caches.
