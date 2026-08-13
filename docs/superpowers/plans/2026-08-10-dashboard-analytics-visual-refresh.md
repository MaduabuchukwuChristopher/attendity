# Dashboard Analytics Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore visible analytics charts and give administrator, lecturer, student, and examiner dashboards a rich, role-appropriate data presentation.

**Architecture:** Repair chart sizing in the shared UI package, add reusable metric/progress presentation primitives, and compose role-specific dashboard sections from each role's existing live data. Preserve the dedicated administrator/lecturer analytics flow and avoid inventing examiner data before a verification occurs.

**Tech Stack:** React 19, strict TypeScript, Recharts 3, Tailwind CSS 4, TanStack Query, Vitest, Testing Library.

## Global Constraints

- Preserve the existing monorepo, authentication, RBAC, tenant boundaries, attendance, reporting, clearance, and event workflows.
- Reuse existing hooks, types, cards, badges, tables, and analytics APIs.
- Use white and mature Attendity green as primary brand colours with institutional navy and restrained semantic accents.
- Never use gradients.
- Keep all charts, tables, and dashboards responsive, accessible, and dark-mode compatible.
- Derive displayed values from API or current-workspace state; never hard-code analytics values.
- Run only focused tests and targeted type checks related to this change.
- This workspace is not Git-initialized, so do not create commits.

---

### Task 1: Shared visible chart contract

**Files:**

- Modify: `packages/ui/src/components/analytics-charts.tsx`
- Test: `apps/web/test/dashboard-analytics-visuals.test.tsx`

**Interfaces:**

- Consumes: existing `TrendChartDatum`, `ComparisonBarDatum`, and `DonutChartDatum` arrays.
- Produces: existing chart exports with a guaranteed 18rem parent height and optional typed palette support.

- [ ] **Step 1: Write the failing chart-height test**

Render each shared chart and assert that its labelled `figure` has an inline `height: 18rem` style so Recharts cannot inherit a zero-height container.

- [ ] **Step 2: Run the focused test and verify RED**

Run `npm test -w @qr/web -- dashboard-analytics-visuals.test.tsx` and confirm failure because the current charts only use `h-72`.

- [ ] **Step 3: Implement the chart contract**

Replace the fragile height-only utility dependency with an explicit chart-frame style, add mature green/navy/gold/blue/rose palette constants, and preserve accessible figure summaries.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the same Vitest command and confirm all chart sizing assertions pass.

### Task 2: Reusable dashboard data presentation

**Files:**

- Create: `packages/ui/src/components/metric-card.tsx`
- Create: `packages/ui/src/components/progress-meter.tsx`
- Modify: `packages/ui/src/components/data-table.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `apps/web/test/dashboard-analytics-visuals.test.tsx`

**Interfaces:**

- Produces: `MetricCard` with typed `tone`, `label`, `value`, `icon`, and `supportingText` props.
- Produces: `ProgressMeter` with `value`, `label`, and optional threshold-based tone props.
- Preserves: `DataTable<T>` call sites and adds default coloured row/header presentation without changing data behaviour.

- [ ] **Step 1: Write failing presentation tests**

Assert that metric tones include explicit light/dark surfaces and labels, progress meters expose readable text and ARIA values, and data-table rows have alternating and hover colour classes.

- [ ] **Step 2: Run the focused test and verify RED**

Confirm failure because `MetricCard` and `ProgressMeter` do not exist and the table has no coloured row hierarchy.

- [ ] **Step 3: Implement minimal reusable primitives**

Create strict typed components with solid colour surfaces only, export them from `@qr/ui`, and update the existing table markup while retaining captions, headers, row keys, and horizontal scrolling.

- [ ] **Step 4: Run the focused test and verify GREEN**

Confirm the new component and table assertions pass.

### Task 3: Administrator and lecturer analytics presentation

**Files:**

- Create: `apps/web/src/features/analytics/dashboard-analytics-overview.tsx`
- Modify: `apps/web/src/features/portals/portal-page.tsx`
- Modify: `apps/web/src/features/analytics/lecturer-insights-panel.tsx`
- Modify: `apps/web/src/features/analytics/analytics-dashboard-page.tsx`
- Test: `apps/web/test/dashboard-analytics-visuals.test.tsx`

**Interfaces:**

- Consumes: `useAnalyticsOverview(period)`, existing academic-period control, chart components, and analytics response types.
- Produces: `DashboardAnalyticsOverview` with `scopeLabel` and `compact` presentation options.

- [ ] **Step 1: Write a failing administrator-preview test**

Mock the analytics query with realistic values and assert that the embedded administrator overview includes attendance trend, risk distribution, course comparison, and semantic metric labels.

- [ ] **Step 2: Run the focused test and verify RED**

Confirm the administrator workspace lacks the embedded overview.

- [ ] **Step 3: Implement the shared overview and administrator embedding**

Compose real KPI data and the three shared charts into solid responsive cards, handle loading/error states, and place the section before administrative shortcuts.

- [ ] **Step 4: Enrich lecturer and detailed analytics views**

Reuse metric cards and progress/status presentation in the lecturer panel and detailed Analytics page while preserving filters, access rules, tables, and existing API queries.

- [ ] **Step 5: Run the focused test and verify GREEN**

Confirm the administrator and shared visual assertions pass.

### Task 4: Student personal analytics

**Files:**

- Create: `apps/web/src/features/analytics/student-analytics-panel.tsx`
- Modify: `apps/web/src/features/portals/student-workspace-page.tsx`
- Test: `apps/web/test/dashboard-analytics-visuals.test.tsx`

**Interfaces:**

- Consumes: the existing student `courses` array and personal attendance risk array.
- Produces: `StudentAnalyticsPanel` with course comparison chart, three KPI cards, and an honest empty state.

- [ ] **Step 1: Write a failing student-analytics test**

Render the panel with two realistic courses and assert that it exposes personal attendance graphics and accessible metric labels.

- [ ] **Step 2: Run the focused test and verify RED**

Confirm failure because the panel is not yet implemented.

- [ ] **Step 3: Implement and integrate the student panel**

Build the comparison chart from course percentages, replace plain KPI cards, and use progress meters in course/risk attendance cells while preserving check-in, clearance, face-profile, heatmap, and timeline workflows.

- [ ] **Step 4: Run the focused test and verify GREEN**

Confirm student analytics assertions pass.

### Task 5: Examiner verification analytics

**Files:**

- Create: `apps/web/src/features/analytics/examiner-verification-overview.tsx`
- Modify: `apps/web/src/features/portals/examiner-workspace-page.tsx`
- Test: `apps/web/test/dashboard-analytics-visuals.test.tsx`

**Interfaces:**

- Consumes: the examiner's existing in-memory `ClearanceVerification[]` history.
- Produces: verified/rejected metric cards and a donut chart only when real checks exist.

- [ ] **Step 1: Write a failing examiner-activity test**

Assert that an empty history renders an honest live-data explanation and a populated history renders verified/rejected totals plus a labelled distribution chart.

- [ ] **Step 2: Run the focused test and verify RED**

Confirm failure because the overview does not exist.

- [ ] **Step 3: Implement and integrate the examiner overview**

Derive counts from history, render solid semantic surfaces, and colour recent-check list rows without changing server verification or scanner behaviour.

- [ ] **Step 4: Run the focused test and verify GREEN**

Confirm both empty and populated states pass.

### Task 6: Focused verification and visual QA

**Files:**

- Verify all files changed in Tasks 1–5.

**Interfaces:**

- Validates: runtime charts, responsive layout, light/dark contrast, and strict TypeScript integration.

- [ ] **Step 1: Run focused automated verification**

Run `npm test -w @qr/web -- dashboard-analytics-visuals.test.tsx` and `npm run typecheck -w @qr/web`; read the complete output and fix only related failures.

- [ ] **Step 2: Verify the administrator and lecturer dashboards in the in-app browser**

Confirm chart containers and `svg.recharts-surface` elements have non-zero dimensions, period controls still work, and lists use the intended colour hierarchy.

- [ ] **Step 3: Verify student and examiner role states**

Use the seeded demo accounts to confirm student personal graphics, examiner honest empty/activity states, and no regression to core role workflows.

- [ ] **Step 4: Check representative responsive and theme states**

Inspect desktop and mobile widths in light and dark modes for clipped charts, unreadable labels, overflow, and status conveyed by colour alone.

- [ ] **Step 5: Compare against the supplied references**

Judge the final dashboard beside the two supplied university-dashboard images, retaining Attendity's own green/navy/gold identity and the no-gradient rule.
