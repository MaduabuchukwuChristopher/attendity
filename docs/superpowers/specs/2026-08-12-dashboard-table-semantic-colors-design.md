# Dashboard Table Semantic Colors Design

## Goal

Make Lecturer Dashboard Recent Sessions and comparable tables across every dashboard and subpage easier to scan by applying consistent semantic status badges and complementary column-content colors. Closed sessions must display with a red danger treatment.

## Scope

Audit every `DataTable` in the authenticated web application, including lecturer, student, examiner, administrator, analytics, reports, events, registrations, academic management, profile, user management, and audit-log surfaces.

This work changes table presentation only. It does not alter queries, sorting, pagination, permissions, table data, status values, actions, or business rules.

## Shared Table Architecture

Extend the shared `DataTableColumn<T>` contract with an optional typed cell tone. The tone may be a fixed semantic tone for the whole column or a function of the current row and row index when values require conditional meaning.

Supported column tones use the established Attendity palette:

- `navy` for primary names and institutional labels.
- `blue` for course codes and general identifiers.
- `violet` for registration numbers, roles, and academic references.
- `teal` for dates, times, venues, and contextual metadata.
- `green` for healthy counts and positive values.
- `gold` for thresholds, pending values, and attention states.
- `rose` for negative counts, failures, and danger values.
- `muted` for secondary explanatory content.

The table applies these tones at the cell container so plain text and numeric values inherit them. Components with their own semantic styling, including `Badge`, `IdentifierBadge`, `PercentageValue`, `SemanticValue`, buttons, and links, retain their explicit colors.

Columns without an assigned tone keep the current accessible foreground treatment. This avoids arbitrary color assignment based only on column position.

## Shared Status Treatment

Create a reusable status badge that accepts the existing status string and an optional visible label. It normalizes casing and underscore-separated values without changing the underlying data.

Status mapping:

- Danger/red: `closed`, `cancelled`, `inactive`, `deactivated`, `rejected`, `absent`, `revoked`, `expired`, `failed`, `blocked`, and `not_eligible`.
- Success/green: `open`, `active`, `approved`, `present`, `verified`, `completed`, `eligible`, `registered`, and `accepted`.
- Warning/amber: `pending`, `scheduled`, `late`, `invited`, `expiring`, and `awaiting_approval`.
- Information/blue: `current`, `excused`, `draft`, `published`, and other explicitly informational states.
- Neutral/slate: unknown statuses, preserving readable fallback behavior without inventing meaning.

The visible text remains present, so color is not the sole means of communicating status.

## Lecturer Recent Sessions

Update the table as the primary regression target:

- Course content uses a blue identifier treatment while preserving the course title.
- Opened date and time use teal.
- Status uses the shared status badge. `closed` must render with the danger/red treatment and `open` with success/green.
- Check-in counts use green for positive values and muted or gold for zero, without displaying any number in black.
- Open rows retain the existing green row treatment; closed rows gain a subtle rose row border/surface treatment so their lifecycle state is visible at both row and badge levels.

## Comparable Dashboard Tables

Audit all existing table declarations and assign explicit column tones according to their meaning. Reuse current `IdentifierBadge`, `PercentageValue`, `SemanticValue`, and action-button variants instead of wrapping or replacing them unnecessarily.

Replace ad hoc status badges inside tables with the shared status badge wherever their vocabulary matches the centralized contract. Preserve specialized domain badges such as risk levels, mandatory-event indicators, eligibility thresholds, and verification outcomes when those convey more precise meaning than a generic status.

The audit must cover:

- User and staff invitation tables.
- Course registrations and profile registration tables.
- Student course attendance, risk, and attendance timeline tables.
- Lecturer recent sessions.
- Analytics leaderboards, live feed, and risk tables.
- Reports tables.
- Institution structure, curriculum, courses, assignments, and academic management tables.
- Event participation, event analytics, and participant-management tables.
- Audit logs.
- Any other authenticated `DataTable` discovered during implementation.

## Visual and Accessibility Rules

- Use solid colors only; do not add gradients.
- Maintain sufficient foreground contrast in light and dark modes.
- Keep the existing colored table header, zebra surfaces, row borders, hover treatment, responsive overflow behavior, captions, and header scopes.
- Do not apply intense backgrounds to every cell. Color is primarily expressed through readable foregrounds, badges, identifiers, and existing row tones.
- Retain labels, icons, and textual status names so color never becomes the sole signal.
- Preserve keyboard, screen-reader, and focus behavior.

## Testing

Follow test-driven development:

1. Add a failing shared UI test for fixed and row-derived `DataTable` column tones in light and dark modes.
2. Add a failing shared status-badge test proving `closed` is danger/red, `open` is success/green, pending states are warning/amber, and unknown states fall back safely.
3. Add a failing Lecturer Dashboard regression test for closed/open badges, complementary course/date/check-in colors, and closed-row rose treatment.
4. Add focused source or rendered tests covering representative admin, student, analytics, reports, academic, event, and audit tables.
5. Implement the shared primitives and update every audited table.
6. Run only the affected UI/web tests, UI/web type checks, and formatting as requested.

## Completion Criteria

- Every Lecturer Recent Sessions `closed` status appears in red in light and dark modes.
- Comparable table statuses follow the shared semantic vocabulary.
- Meaningful columns use consistent complementary colors without arbitrary position-based styling.
- Existing specialized semantic components and application behavior remain intact.
- No authenticated `DataTable` is overlooked in the implementation audit.
- Focused tests and affected type checks pass.
