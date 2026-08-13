# Dashboard Reliability and Shared-Primitives Repair Design

**Date:** 2026-08-11

## Objective

Repair the reported dashboard interaction and dark-mode defects through shared UI primitives, while preserving Attendity's existing monorepo architecture, tenant isolation, role permissions, security controls, and mature university design system.

## Scope

This repair covers:

- Lecturer attendance-session dialog sizing.
- Stable static QR credentials and continuing rotating QR behavior.
- Student camera-scanner reliability.
- Student clearance generation, download, and printing.
- Shared metric-card values, percentages, and icons.
- Shared data-table dark-mode surfaces and row treatments.
- Lecturer Courses page presentation.
- Student and examiner scanner cards and buttons.
- Student manual check-in presentation.
- Examiner archive-search presentation and dark-mode placeholder visibility.
- Student eligibility status treatments.

It does not replace the QR encryption architecture, weaken attendance verification, create new user roles, or redesign unrelated dashboard routes.

## Architecture

The repair will start with the shared `Dialog`, `DataTable`, `MetricCard`, percentage-value, QR-rendering, and QR-scanner primitives. Role pages will compose those primitives and add only role-specific content or treatments. This prevents duplicate dark-mode and interaction fixes across the student, lecturer, examiner, and administrator workspaces.

## Dialog Behavior

The shared dialog overlay will use dynamic viewport height and safe-area-aware spacing. The dialog panel will be a bounded flex column:

- Header remains visible.
- Content region scrolls independently.
- Footer remains visible and contains the primary action.
- The complete panel never exceeds the visual viewport on mobile, tablet, or desktop.
- Keyboard focus trapping, Escape handling, focus restoration, and body scroll locking remain intact.

This behavior applies to the lecturer Start class attendance dialog and improves other existing dialogs without changing their content.

## Static and Rotating QR Credentials

### Static QR

When a lecturer opens a static session, the API will generate the encrypted QR credential once and store it in a private, non-serialized session field. Every lecturer-workspace refresh, PNG export, PDF export, print operation, and student scan will use this same credential until the session closes or expires.

Legacy open static sessions without a stored credential will be repaired once by generating and persisting one before returning the workspace response or export.

The stored credential will never be returned for closed sessions and will be excluded from normal model serialization.

### Rotating QR

Rotating sessions continue to replace their nonce, check-in code, and encrypted credential at the selected interval. They remain digital-display only and cannot be downloaded or printed.

### Security

Both modes retain institution, session, context, owner, expiry, nonce-hash, role, registration, duplicate, GPS, and biometric checks. A static credential is stable only for its bounded check-in window and becomes unusable when the session closes or expires.

## Scanner Reliability

The displayed QR will use a larger responsive visual size and sufficient source resolution for camera scanning. The scanner will use the library's explicit camera enum rather than a numeric literal, a viewport-responsive square scan region, and a camera-oriented frame rate. Existing duplicate-scan suppression and cleanup remain.

The scanner will expose clear states for:

- Camera closed.
- Camera starting.
- Camera active.
- Permission or device failure.
- Successful scan dispatch.

The student's scanned value continues to route encrypted `v1.` credentials as tokens and manual attendance codes as uppercase codes. Manual entry remains available as a resilient fallback.

## Clearance Generation and Export

Clicking **Generate approved clearance** will:

1. Generate or retrieve the current approved server report.
2. Refresh the clearance archive.
3. Immediately download the generated PDF.
4. Show persistent **Download PDF** and **Print PDF** actions on that course card.

The print flow will reserve a blank browser tab synchronously from the user's click, then load the authenticated PDF blob into that tab after the request succeeds. If the request fails, the reserved tab closes and a visible error is shown. This avoids browser popup blocking caused by opening a tab only after an asynchronous request.

Existing archive PDF, spreadsheet, CSV, share, and print actions remain available.

## Shared Dashboard Visual Semantics

### Metric Cards

Every dashboard metric card will include a title-appropriate Lucide icon. Numeric values will never use default black text. Each card uses one of the established mature tones: university navy, emerald, blue, academic gold, rose, or violet.

Percentage values communicate performance consistently:

- 75% and above: emerald/positive.
- 60% through 74%: academic gold/caution.
- Below 60%: rose/critical.

Non-percentage counts use the card's assigned semantic tone.

### Data Tables and Lists

The shared table wrapper, table body, headers, rows, cells, hover states, borders, and text will have explicit light and dark surfaces. Dark mode will not inherit or retain white row backgrounds.

Rows keep a four-pixel semantic left border. Alternating rows remain subtle and accessible in both themes. Text, badges, form controls, and identifiers meet readable contrast requirements.

## Lecturer Courses Page

The Courses view will retain its current permissions and CRUD behavior while adopting the established analytics/report presentation:

- Academic heading with matching icon.
- Course codes rendered as colored identifier badges.
- Credit units rendered as compact badges.
- Attendance requirements rendered with semantic percentage color.
- Alternating semantic row borders.
- Lecturer assignment select with explicit dark surface, text, and focus states.
- Empty, loading, error, and assignment-feedback behavior preserved.

Department presentation will receive compatible identifier and row treatments where it shares the same page primitive.

## Student Workspace

- Scanner card receives a distinctive blue/emerald surface and matching camera icon treatment.
- Open scanner uses a prominent primary/blue button with explicit spacing between icon and label.
- Manual check-in card receives an academic-gold or navy-accented treatment, a matching keypad icon, and a dark-safe input.
- Eligibility status is a compact padded pill with small rounded edges.
- Attendance percentage and supporting Present, Absent, and Streak figures use semantic colors rather than default black.

## Examiner Workspace

- Continuous scanner receives the same visible scanner treatment and icon spacing.
- Search the archive card receives a distinct violet/navy surface and search icon.
- Its input uses the shared dark-safe dashboard control class, including visible dark-mode placeholder text.
- Verification percentages use the shared semantic percentage component.
- Verified and rejected result rows retain explicit dark surfaces and semantic borders.

## Accessibility and Responsive Requirements

- All interactive controls remain keyboard accessible.
- Buttons retain visible focus indicators.
- Icons are decorative where labels already communicate meaning.
- Status changes use existing live regions or alerts.
- Dialog content is reachable at 320px-wide viewports and at increased browser zoom.
- QR sizing never causes horizontal overflow.
- Motion is not required to understand any status or complete any action.

## Error Handling

- Static-credential persistence failure prevents the credential from being presented as usable.
- Scanner startup and permission failures show a clear local error without losing manual entry.
- Clearance generation/export failures leave eligibility data intact and show actionable feedback.
- A failed reserved print tab is closed.
- Existing API error envelopes and role restrictions remain unchanged.

## Test Strategy

Focused tests will be written before implementation and will cover:

- Dialog panel uses a viewport-bounded shell with independently scrollable content and fixed footer.
- Static session workspace responses and PDF exports return the identical stored credential across repeated reads.
- Rotating sessions continue changing credentials at their configured interval.
- Static credentials still fail after closure or expiry.
- Scanner uses explicit camera mode, responsive scan bounds, dispatches encrypted tokens, and cleans up safely.
- Clearance generation immediately requests a PDF download and exposes repeat download/print controls.
- Print reserves its tab before awaiting the blob request and closes it on failure.
- Shared metric values, icons, and percentage thresholds use semantic colors.
- Shared tables have explicit dark wrapper, body, row, cell, hover, and border treatments.
- Courses use identifiers, semantic percentages, row tones, and dark-safe assignment controls.
- Student and examiner scanner, manual-code, archive-search, and eligibility treatments render as specified.

Only tests related to these repairs will be run, followed by focused TypeScript and lint checks for modified packages and browser verification of the affected role flows.

## Acceptance Criteria

- Start class attendance never exceeds the visible viewport, including when Rotating QR is selected.
- A static QR image does not change during polling and remains scannable until its session ends.
- A rotating QR continues to change at the selected interval and cannot be exported.
- A student can scan the lecturer's displayed QR and submit it to the existing attendance preparation flow.
- Generate approved clearance downloads the PDF and enables repeat download and print actions.
- Dashboard metric figures and percentages are semantically colored and accompanied by matching icons.
- Dashboard tables and lists use genuinely dark backgrounds in dark mode.
- Lecturer Courses, student scanner/manual entry, and examiner scanner/archive search match the established rich dashboard language.
- All affected controls remain visible, responsive, and accessible in light and dark modes.
