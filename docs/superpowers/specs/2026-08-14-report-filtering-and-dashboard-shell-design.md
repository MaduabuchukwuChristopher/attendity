# Report Filtering and Dashboard Shell Design

## Status

Approved in conversation on 2026-08-14. This document defines the implementation scope for the lecturer report correctness repair and shared dashboard presentation improvements.

## Objectives

- Make attendance report previews and exports use the same live, date-bounded dataset.
- Make course reports academically accurate by retaining registered students who were absent during sessions in the selected range.
- Present the most recently active attendance rows first.
- Preserve dashboard navigation position between page changes.
- Standardize brand/icon spacing, modern scrollbars, and dark-mode card surfaces across dashboard roles.
- Preserve tenant isolation, role permissions, existing report formats, and all existing dashboard functionality.

## Report Semantics

### Date range

The `from` and `to` values represent inclusive institution-local calendar days. The API will resolve them to the institution timezone before querying:

- `from`: start of the selected day.
- `to`: end of the selected day.

The range must remain ordered and bounded by the existing validation policy. Preview and export endpoints will share the same range-resolution utility so they cannot diverge.

### Course population

A course report will include every approved registration when at least one course session occurred during the selected range. A registered student with no matching check-in remains in the report with zero attendance because that is an academically meaningful absence. If no sessions occurred in the selected range, the report returns no attendance rows rather than presenting unrelated registration history.

### Recency and sorting

Each report row will expose its latest matching attendance timestamp when one exists. Rows will be ordered deterministically by:

1. Latest matching attendance timestamp, descending.
2. Students with no matching check-in after students with matching attendance.
3. Student name and registration number as stable tie-breakers.

The report table and all exported formats will expose the latest-attendance value in a readable form. This makes the ordering understandable rather than silently rearranging aggregate rows.

### Live updates

Report queries remain keyed by the complete filter object. Attendance mutations will invalidate the analytics report query family so an open or subsequently generated report reflects newly verified attendance. Explicit report generation continues to reset pagination to the first page.

## Export Contract

PDF, Excel, and CSV exports will receive the same scope, course, student, and inclusive date filters used by the visible report. Export generation will request the complete filtered dataset independently of UI pagination.

The API service will separate report calculation from page slicing so exports do not rely on a client-supplied oversized page limit. All formats will include:

- Institution branding.
- Report identifier and generation timestamp.
- Selected inclusive reporting period.
- Summary metrics calculated from the filtered dataset.
- Complete filtered rows in the same newest-first order.
- Latest-attendance data.
- Existing verification metadata and checksum.

Export authorization and tenant scoping remain server-side.

## Dashboard Shell

### Sidebar position

The sidebar remains fixed to the viewport. Its internal scroll container will preserve its position across route-driven layout remounts using a small shared, session-scoped scroll-position mechanism. Mobile navigation will still close after a selection, while desktop navigation will restore the previous sidebar position after the next page mounts.

This focused repair avoids a high-risk conversion of every existing page to a nested router layout.

### Scrollbar treatment

Dashboard-owned scroll containers will use a shared scrollbar class with:

- A narrow thumb and no visually heavy track.
- A subdued color compatible with light and dark modes.
- Visibility while scrolling, hovering, or keyboard-focused.
- A short fade after pointer or wheel activity stops where the browser supports it.
- A stable thin native fallback where scrollbar fading is not supported.
- No removal of keyboard scrolling or forced hiding in high-contrast mode.

Reduced-motion preferences will disable nonessential fading transitions.

### Brand and icon spacing

The shared `BrandMark` will use a slightly larger explicit gap between the logo and Attendity name. Shared button styling will define a consistent icon/text gap so buttons and links no longer rely on incidental whitespace in JSX. Icon-only controls remain unaffected.

## Dark-Mode Surface System

Shared `Card` and `MetricCard` tones will use solid, colored surfaces instead of gradients. Dark-mode variants will use deep emerald, teal, navy, blue, amber, rose, and violet surfaces with matching borders and accessible text colors. No dark-mode card will retain a white or white-dominated background.

The change will be made in shared primitives first so dashboards and subpages inherit consistent treatment without duplicating page-specific classes. Existing semantic tones, icon badges, status communication, and light/dark contrast will be preserved. The implementation will not introduce gradients because all three project rule sets prohibit them.

## Error Handling and Accessibility

- Invalid date ranges continue to return actionable validation feedback.
- Export failures remain visible to the user and do not silently download an invalid file.
- Latest-attendance headers and values remain semantic table content.
- Scroll containers remain operable by keyboard and assistive technology.
- Color is supplementary; labels and values continue to communicate meaning without color alone.
- Focus indicators and forced-color behavior remain intact.

## Verification Strategy

Targeted tests will cover:

- Inclusive start/end day conversion in the institution timezone.
- Repository session filtering at both boundaries.
- Course rows retaining zero-check-in students only when sessions exist.
- Newest-first sorting with deterministic zero-attendance placement.
- Preview pagination versus complete export output.
- Identical filter parameters across PDF, Excel, and CSV requests.
- Report query invalidation after attendance mutations.
- Brand and shared button icon spacing.
- Sidebar scroll restoration.
- Thin, accessible dashboard scrollbar behavior.
- Solid non-white dark-mode card surfaces and the absence of gradient classes in shared card primitives.

Only the focused API and web test suites related to reports and shared dashboard primitives will be run initially, followed by TypeScript checks for affected workspaces.

## Out of Scope

- Replacing the current report model with an event-level audit report.
- Rebuilding all dashboard routes around a new nested layout.
- Changing attendance eligibility calculations or registration policy.
- Changing authentication, permissions, or tenant boundaries.
- Redesigning landing-site scrollbars or public cards.
