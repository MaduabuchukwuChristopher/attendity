# Attendity Dashboard Colour, QR Modes, and Navigation Design

## Purpose

Improve dashboard clarity and dark-mode presentation across every role while adding a secure, lecturer-controlled choice between printable static QR attendance and digital-only rotating QR attendance. Add an accessible landing-page back-to-top control without weakening existing attendance verification.

## Approved Experience

### Dashboard visual system

Attendity keeps mature institutional green, university navy, academic gold, blue, rose, and violet as a restrained semantic palette. No gradients are introduced.

- Metric cards use a matching icon, label, value colour, border, and surface treatment. The large value inherits the card tone instead of appearing identical across every metric.
- Percentage values communicate their meaning consistently: green at 75–100%, amber at 60–74%, and rose below 60%. Text, labels, and progress bars accompany colour so meaning is not colour-only.
- Reusable data tables use dark-mode-safe surfaces, a prominent university navigation/header treatment, row borders, and controlled row accents. Courses, registration or matriculation numbers, classifications, roles, and statuses receive reusable coloured badges or text treatments where appropriate.
- Table rows remain readable and distinguishable in light and dark themes. Hover, focus, odd/even surfaces, and left-edge accents retain sufficient contrast.
- Dashboard navigation uses a mature navy foundation with green and gold accents. Active, hover, focus, collapsed, mobile, and dark-mode states remain visible.

These treatments apply through shared components so administrator, lecturer, student, examiner, reports, profiles, courses, registrations, events, and other dashboard sections remain consistent.

## Attendance QR modes

### Static mode

A lecturer may select `Static` when opening a class attendance session. The server creates one QR credential that remains unchanged only until that session's check-in window ends.

- The check-in window accepts 5–180 minutes.
- The session closes automatically when the window ends, even when the lecturer does not manually close it.
- A manually closed session expires immediately.
- Static QR can be downloaded as a branded PNG, downloaded as a branded PDF, or printed.
- The export includes Attendity and institution branding, course code and title, lecturer, date, opening time, closing time, time zone context, and a clear `Static QR` label.
- The exported credential does not outlive the server-side session. Reopening or creating another class produces a new credential.

### Rotating mode

A lecturer may select `Rotating` for a digitally displayed QR that refreshes every 30–120 seconds.

- Rotating mode exposes no print, PNG-download, or PDF-download controls.
- The interface states that the code is intended for a lecture-hall, classroom, or event-centre display.
- The display shows institution, course or event, date, opening time, closing time, remaining window, rotation interval, and next-refresh countdown.
- The server rotates both QR nonce and manual check-in code using the existing secure lifecycle.

### Shared security rules

Both modes preserve all existing server-side checks: open and unexpired session, correct institution, valid QR signature and nonce, course registration, duplicate prevention, GPS when enabled, face verification when enabled, RBAC, tenant scoping, audit logging, and rate limiting.

The API uses an explicit typed `qrMode: 'static' | 'rotating'` field. Existing records without the field are treated as rotating for backward compatibility. Static token expiry is the session closing time; rotating token expiry is the earlier of the next rotation boundary or session closing time. Expired sessions are rejected regardless of the client display state.

## Components and data flow

### Shared UI

- Extend `MetricCard` so its value uses its typed tone and every caller can supply the correct semantic icon.
- Extend `ProgressMeter` so both the numeric percentage and bar use the resolved semantic tone.
- Extend `DataTable` with typed row-tone support and strong dark-mode-safe row separation. Callers may select tones from meaningful row data; the default remains neutral and accessible.
- Add reusable identifier and status treatments instead of duplicating colour logic across pages.

### Lecturer workspace

The session form uses an accessible Static/Rotating segmented control. Rotation interval is displayed only for rotating mode. Duration supports 5–180 minutes. The live session card adapts its guidance and controls to the selected mode.

### API and persistence

Attendance validation, shared types, session persistence, token generation, workspace responses, automatic rotation, and API documentation include `qrMode`. Rotation logic skips static sessions. Existing expiry cleanup remains the source of truth for automatic closure and check-in rejection.

### QR exports

The browser generates the QR image from the already-authorised live credential. Static export controls produce branded PNG and PDF artifacts and a print layout. Export controls disappear immediately for rotating sessions. The server never exposes export endpoints for rotating QR codes.

### Landing page

A fixed back-to-top button appears at the bottom-right after meaningful scrolling, stays clear of mobile navigation and safe areas, has a visible focus state and accessible label, and scrolls smoothly unless reduced motion is requested.

## Error and edge states

- Static exports remain disabled until the QR image is ready.
- Export generation failures produce a user-friendly message and do not affect the live session.
- The QR panel clearly indicates when the session has ended and removes the credential and export controls.
- Invalid duration or rotation values are rejected by both client and server validation.
- Long course or institution names wrap safely in the live panel, image, PDF, and print layout.
- Colour is never the sole carrier of attendance, risk, role, or status meaning.

## Focused verification

Only tests related to this change are required:

- Shared metric values, percentage levels, data-row accents, and dark-mode classes.
- Static token stability through its open window, automatic expiry, and rejection after closure.
- Rotating token refresh and continued non-exportability.
- Session validation for 5–180 minute duration and mode-specific rotation values.
- Lecturer mode toggle, conditional rotation field, metadata, and static-only export controls.
- PNG, PDF, and print actions using a live static QR credential.
- Back-to-top visibility, keyboard labelling, activation, and reduced-motion behaviour.
- Targeted TypeScript and lint checks for affected packages.
- Browser checks at representative desktop and mobile sizes in light and dark themes.

## Out of scope

- Permanently reusable QR codes.
- Printable rotating credentials.
- Removing manual session closure.
- Weakening course, tenant, GPS, face, duplicate, or authentication checks.
- Redesigning unrelated public-site sections or changing the established monorepo architecture.
