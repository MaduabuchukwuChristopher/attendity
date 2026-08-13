# Dashboard semantic card and table system design

## Objective

Apply a consistent, professional, context-aware color system to every authenticated Attendity dashboard and subpage. No dashboard card, number, percentage, table, or list should be white-dominated or use black-looking value text. Cards should pair their titles with meaningful colored icons, and administrative deactivation actions should read as explicit controls rather than plain text.

## Scope

This design covers authenticated dashboard routes and their embedded panels, including administrator, lecturer, student, examiner, event-management, academic-management, reports, analytics, profile, settings, notifications, registration, audit, and clearance experiences.

Public landing and authentication pages are outside this migration unless they consume a shared primitive whose safe visual improvement is intentionally global. Existing specialized treatments that already satisfy these rules remain intact.

## Semantic value colors

Percentage values use academic attendance thresholds:

- Below 60%: rose/red, indicating an attendance or eligibility risk.
- 60–74%: amber, indicating caution or proximity to the requirement.
- 75% and above: emerald, indicating the normal qualifying range.

Non-percentage figures use context rather than raw magnitude:

- Successful, verified, eligible, completed, or healthy figures: emerald or teal.
- Informational totals, sessions, courses, and operational volume: blue, teal, violet, or navy.
- Pending or cautionary figures: amber or orange.
- Failed, absent, overdue, revoked, ineligible, or risk figures: rose/red.
- Zero follows the metric meaning. Zero absences is positive; zero recorded attendance is negative.

No primary card value may inherit black, near-black, or generic body text. Light mode values use color shades at or darker than 700 for contrast. Dark mode values use corresponding 200–300 shades.

## Card system

Shared card primitives gain semantic tone support using emerald, teal, blue, violet, amber, rose, and navy treatments. Each treatment combines:

- A visibly tinted surface or restrained gradient that is not white-dominated.
- A coordinated border and subtle colored shadow.
- Dark-mode colors with readable contrast and no retained light surface.
- A title icon contained in a colored rounded badge.
- A coordinated primary value color.

Metric cards retain their existing tone API and expand it where required. Metric cards representing dashboard statistics must supply a meaningful icon. The icon must describe the metric rather than act as decoration—for example, a calendar for sessions, a shield/check for verified records, users for enrolment, and an alert or absence-related icon for risk.

Content cards use a shared card-heading treatment where a visible title exists. Cards without a title, such as narrow action containers or layout-only wrappers, do not receive an artificial heading. Existing specialized cards may keep their treatment when it already provides a colored surface, colored heading icon, and accessible value colors.

## Table and list system

The shared `DataTable` becomes the default enforcement point for dashboard tables:

- Mature navy-to-emerald or navy-to-teal header treatment with white labels.
- Alternating softly tinted rows rather than white and near-white rows.
- Semantic row-tone support that colors both the left border and a subtle row surface.
- Hover treatments that remain visible in light and dark modes.
- First-column identifiers retain strong color contrast.
- Dark mode uses slate/colored surfaces rather than a white table surface.

Custom tables and card-based lists receive the same treatment directly or migrate to the shared table/list primitives. Lists use colored row borders or identifier badges to make groups easy to scan. Course codes, registration numbers, roles, statuses, and percentages retain or gain semantic badges.

## Administrative actions

Every active “Deactivate” control in administrator tables becomes a compact danger-styled button with a rose/red surface, white text, visible hover/focus states, and a `Power` icon. It keeps existing confirmation-dialog and permission behavior.

Other action-column controls remain semantically distinct: edit/view actions use blue or violet, revoke/destructive actions use danger styling, and historical/inactive states use badges or muted labels rather than clickable-looking text.

## Architecture and migration

The implementation starts with shared primitives so new and existing screens inherit safe defaults:

- `Card`: semantic tone and non-white default authenticated surface support.
- `MetricCard`: expanded tones, coordinated value treatments, and meaningful icon enforcement during dashboard migration.
- `PercentageValue` and `ProgressMeter`: shared academic threshold colors.
- `DataTable`: tinted surfaces, alternating rows, and semantic row treatments.
- `Button`: reuse the existing danger variant; add a compact size only if repeated action-column styling cannot remain clear without it.
- `CardHeader` and `SemanticValue` primitives provide the repeated icon-badge, title, numeric-value, and contextual-tone styling required by bespoke dashboard cards.

After shared changes, every authenticated feature directory is audited. Page-specific changes are limited to assigning semantic tones, adding meaningful icons, wrapping exposed values, tinting custom lists, and converting action controls. Business logic, API calls, permissions, data flow, responsive behavior, and content remain unchanged.

## Accessibility and dark mode

- Color is never the only signal: icons, labels, badges, and text continue to communicate meaning.
- All foreground/background pairs must remain readable in both themes.
- Buttons retain visible keyboard focus rings and minimum practical touch targets.
- Table headers preserve scope and captions; row coloration does not replace status text.
- Decorative icons are hidden from assistive technology unless they convey information not otherwise stated.
- Reduced-motion preferences continue to be respected by existing dashboard motion rules.

## Testing and acceptance

Shared-component tests verify:

- Every metric tone produces a non-black primary value and a tinted light/dark surface.
- Academic percentage thresholds produce rose, amber, and emerald treatments at their boundaries.
- Data tables contain no white-dominated default row or wrapper treatment and preserve dark-mode surfaces.
- Semantic row tones affect both border and surface.

Feature tests verify:

- Representative administrator, lecturer, student, and examiner cards use meaningful icons and colored values.
- Representative custom lists and tables use tinted surfaces and colored identifiers.
- Administrator `Deactivate` controls render as danger buttons while preserving their existing callbacks and confirmation flows.

An inventory check covers every authenticated feature file containing cards, metric values, percentages, custom tables, lists, or action columns. Focused TypeScript, lint, formatting, and relevant visual-component tests must pass before completion.
