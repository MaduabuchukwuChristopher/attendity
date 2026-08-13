# Attendity Dashboard Analytics Visual Refresh Design

## Purpose

Make Attendity's role dashboards visibly analytical, polished, and presentation-ready while preserving the existing attendance, authentication, RBAC, reporting, clearance, and tenant-scoping behaviour.

## Diagnosed Defect

The existing Recharts components mount correctly and expose accessible chart summaries, but their `figure` elements resolve to zero height in the running portal. The shared chart component relies on a Tailwind `h-72` utility that is absent from the generated portal stylesheet. Every `ResponsiveContainer` therefore receives a zero-height parent and renders no chart surface.

The fix must give every shared chart an explicit, reusable block size independent of consumer stylesheet scanning.

## Approved Direction

Use an embedded-overview model:

- Institution administrators see a compact, live analytics overview directly on the main workspace and retain the detailed Analytics page.
- Lecturers retain their course-scoped analytics inside the lecturer workspace, with richer metric and chart presentation.
- Students receive personal course-performance graphics derived from their existing attendance records.
- Examiners receive a verification-activity visualization derived from checks completed during their current workspace session; no fabricated values are shown before a check occurs.

## Visual Language

Adapt the hierarchy of the supplied university dashboard references without copying their blue branding. Attendity keeps mature green and institutional navy as its anchors, then uses restrained academic gold, blue, rose, and violet accents to distinguish data categories.

- No gradients.
- Solid layered cards with clear borders and restrained shadows.
- Large, readable KPI values with tinted icon wells and semantic supporting text.
- Green for healthy/present/verified states.
- Academic gold and amber for attention states.
- Rose/red for critical or rejected states.
- Blue and violet for neutral comparison categories.
- Dark-mode equivalents preserve readable labels, axes, tooltips, and status distinctions.

## Shared Components

### Charts

Keep Recharts as required. `TrendChart`, `ComparisonBarChart`, and `DonutChart` receive a guaranteed 18rem block size and reusable palette support. Grid lines, axes, legends, and tooltips remain readable in both themes. Accessible figure labels and text summaries remain present.

### Metric Cards

Add a reusable metric card component with a typed tone, icon slot, value, label, and optional supporting text. Tone changes both the border/accent surface and icon treatment without relying on colour alone.

### Tables and Lists

Enhance the shared data table with a mature navy header, alternating solid row surfaces, hover/focus emphasis, and stronger first-column hierarchy. Dashboard tables add badges and compact progress meters where values represent attendance, risk, or verification status.

## Role Experiences

### Institution Administrator

The main workspace adds a monthly analytics preview containing total sessions, verified check-ins, average attendance, and at-risk registrations; a daily attendance line chart; risk-distribution donut; and course-comparison bars. The detailed Analytics page retains all existing reports and filters but gains the same richer KPI cards, chart framing, and coloured tabular values.

### Lecturer

The lecturer insight panel displays course-scoped KPIs, a visible attendance trend, risk count, and a course-comparison visualization when available. Existing QR/session controls remain unchanged and more prominent operationally than analytics.

### Student

The student workspace adds a personal course-attendance bar chart and coloured KPI cards from the existing `courses` payload. Course attendance and risk tables display compact coloured percentage meters and retain textual percentages for accessibility.

### Examiner

The examiner workspace adds coloured verification metrics and, after at least one search or scan, a verified-versus-rejected donut chart based on the local verification history. Before activity exists, the interface explains that the visual will populate from live server checks rather than displaying dummy analytics.

## Responsive and Accessibility Behaviour

Charts remain at a stable usable height from mobile through desktop and resize horizontally within their cards. Dashboard grids collapse to one column on small screens. Status continues to use text and icons in addition to colour. Charts retain screen-reader summaries, tables retain captions and headers, and focus/contrast behaviour follows the existing design system.

## Verification Scope

Use focused tests only:

- Shared charts have a non-zero explicit block size.
- Reusable metric tones and data-table colour hierarchy render as expected.
- Role dashboard components render their appropriate real-data visualization or honest empty state.
- Targeted web/UI type checking passes.
- Browser verification confirms visible SVG chart surfaces at representative desktop and mobile widths in light and dark themes.
