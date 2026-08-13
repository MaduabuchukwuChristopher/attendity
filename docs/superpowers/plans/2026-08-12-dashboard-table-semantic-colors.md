# Dashboard Table Semantic Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every authenticated data table an explicit, dark-safe semantic color treatment and render closed lecturer sessions with a red danger badge.

**Architecture:** Extend the shared `DataTable` column contract with fixed or row-derived cell tones. Add one web-level `StatusBadge` that translates Attendity lifecycle states into the existing shared `Badge` tones, then audit every authenticated `DataTable` declaration and assign meaning-based tones without changing data or behavior.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS 4, shared `@qr/ui`, Vitest, Testing Library.

## Global Constraints

- Preserve every query, permission, action, row, status value, and responsive table behavior.
- Use solid colors only; do not introduce gradients.
- Do not choose colors by column position; assign tones by meaning.
- Keep explicit components such as `Badge`, `IdentifierBadge`, `PercentageValue`, `SemanticValue`, buttons, and links in control of their own foreground colors.
- Preserve visible labels so color is never the sole status signal.
- Support readable light and dark modes.
- Run only affected UI/web tests, type checks, and formatting.

---

### Task 1: Typed DataTable Cell Tones

**Files:**

- Modify: `apps/web/test/dashboard-colour-semantics.test.tsx`
- Modify: `packages/ui/src/components/data-table.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Consumes: `DataTableColumn<T>` and existing `SemanticTone` palette.
- Produces: `DataTableCellTone` and `DataTableColumn<T>['tone']`, accepting a fixed tone or `(row, index) => tone`.

- [ ] **Step 1: Write failing tests for fixed and row-derived tones**

Add a `DataTable` containing a fixed blue course column and a row-derived green/rose count column. Assert the rendered cells receive `text-blue-700 dark:text-blue-300`, `text-emerald-700 dark:text-emerald-300`, and `text-rose-700 dark:text-rose-300` as appropriate.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -w @qr/web -- dashboard-colour-semantics.test.tsx`

Expected: FAIL because `DataTableColumn` does not accept `tone` and cells lack semantic classes.

- [ ] **Step 3: Implement the typed tone contract**

Define:

```ts
export type DataTableCellTone = SemanticTone | 'muted';

export interface DataTableColumn<T> {
  readonly id: string;
  readonly header: string;
  readonly cell: (row: T) => ReactNode;
  readonly tone?: DataTableCellTone | ((row: T, index: number) => DataTableCellTone);
}
```

Resolve the tone per cell and apply the established semantic foreground class plus `text-slate-600 dark:text-slate-300` for `muted`. Export `DataTableCellTone` from `packages/ui/src/index.ts`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -w @qr/web -- dashboard-colour-semantics.test.tsx`

Expected: PASS.

### Task 2: Reusable Attendity Status Badge

**Files:**

- Create: `apps/web/src/components/status-badge.tsx`
- Create: `apps/web/test/status-badge.test.tsx`

**Interfaces:**

- Consumes: shared `Badge` and a status string.
- Produces: `StatusBadge({ status, label?, className? })` with centralized status-to-tone mapping.

- [ ] **Step 1: Write the failing status vocabulary tests**

Render `closed`, `open`, `pending`, and an unknown value. Assert red danger, green success, amber warning, and neutral slate classes respectively. Assert underscore-separated status text becomes readable when no label is supplied.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -w @qr/web -- status-badge.test.tsx`

Expected: FAIL because `StatusBadge` does not exist.

- [ ] **Step 3: Implement the status mapping**

Use readonly sets for danger, success, warning, and information vocabularies from the approved specification. Normalize with `trim().toLowerCase()` and render the provided label or title-cased status text through `Badge`. Unknown values use `neutral`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -w @qr/web -- status-badge.test.tsx`

Expected: PASS.

### Task 3: Lecturer Recent Sessions Regression

**Files:**

- Modify: `apps/web/test/role-dashboard-treatments.test.tsx`
- Modify: `apps/web/src/features/portals/lecturer-workspace-page.tsx`

**Interfaces:**

- Consumes: `StatusBadge` and typed `DataTable` column tones.
- Produces: red closed sessions, green open sessions, blue courses, teal opened dates, semantic counts, and rose closed-row treatment.

- [ ] **Step 1: Write the failing lecturer table regression**

Mock one closed and one open lecturer session. Render the Lecturer Dashboard and assert:

```ts
expect(screen.getByText('closed')).toHaveClass('text-red-700', 'dark:text-red-300');
expect(screen.getByText('open')).toHaveClass('text-emerald-700', 'dark:text-emerald-300');
expect(screen.getByRole('row', { name: /closed/i })).toHaveClass('border-l-rose-600');
```

Also assert the course, opened date, and check-in cells have blue, teal, and semantic green/gold classes.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -w @qr/web -- role-dashboard-treatments.test.tsx`

Expected: FAIL because closed currently uses a neutral badge and row.

- [ ] **Step 3: Implement the lecturer treatment**

Use `StatusBadge` in the status cell. Assign `blue`, `teal`, and row-derived count tones to the other columns. Return `rose` for closed rows and retain `green` for open rows.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -w @qr/web -- role-dashboard-treatments.test.tsx`

Expected: PASS.

### Task 4: Administrator, Academic, Registration, and Profile Tables

**Files:**

- Modify: `apps/web/test/admin-semantic-actions.test.tsx`
- Modify: `apps/web/test/academic-course-presentation.test.tsx`
- Modify: `apps/web/test/dashboard-secondary-pages-semantics.test.tsx`
- Modify: `apps/web/src/features/users/user-management-page.tsx`
- Modify: `apps/web/src/features/registrations/registration-management-page.tsx`
- Modify: `apps/web/src/features/profiles/profile-page.tsx`
- Modify: `apps/web/src/features/academic/institution-structure-page.tsx`
- Modify: `apps/web/src/features/academic/academic-management-page.tsx`
- Modify: `apps/web/src/features/academic/curriculum-management-page.tsx`

**Interfaces:**

- Consumes: Task 1 column tones and Task 2 `StatusBadge`.
- Produces: consistent user, invitation, registration, structure, course, and assignment table semantics.

- [ ] **Step 1: Write failing representative tests**

Assert active/approved statuses are green, inactive/rejected statuses are red, pending statuses are amber, identifiers remain blue/violet, dates use teal, and action columns preserve their existing colored buttons.

- [ ] **Step 2: Run representative tests and verify RED**

Run: `npm test -w @qr/web -- admin-semantic-actions.test.tsx academic-course-presentation.test.tsx dashboard-secondary-pages-semantics.test.tsx`

Expected: FAIL on missing column tones or centralized status treatments.

- [ ] **Step 3: Audit and update all six domain pages**

Assign explicit tones to every plain-text table column. Replace matching table status badges with `StatusBadge`. Preserve specialized classification, current-period, and action treatments.

- [ ] **Step 4: Run representative tests and verify GREEN**

Run the same three-test command.

Expected: PASS.

### Task 5: Student, Analytics, and Reports Tables

**Files:**

- Modify: `apps/web/test/dashboard-analytics-visuals.test.tsx`
- Modify: `apps/web/test/dashboard-semantic-values.test.tsx`
- Modify: `apps/web/src/features/portals/student-workspace-page.tsx`
- Modify: `apps/web/src/features/analytics/analytics-dashboard-page.tsx`
- Modify: `apps/web/src/features/reports/reports-page.tsx`

**Interfaces:**

- Consumes: shared column tones while retaining `IdentifierBadge`, `PercentageValue`, `RiskBadge`, and `SemanticValue`.
- Produces: complementary colors on course, student, registration, date, verification, count, and report columns.

- [ ] **Step 1: Write failing representative tests**

Assert student timeline statuses remain semantic, course codes remain blue, registration numbers remain violet, date/time values use teal, positive counts use green, negative counts use rose, and percentages retain their level-based colors.

- [ ] **Step 2: Run representative tests and verify RED**

Run: `npm test -w @qr/web -- dashboard-analytics-visuals.test.tsx dashboard-semantic-values.test.tsx`

Expected: FAIL on unstyled plain cells.

- [ ] **Step 3: Audit and update the three domain pages**

Assign tones to every plain-text column. Keep specialized percentage and risk components unchanged. Use `StatusBadge` only where it is more accurate than the existing specialized indicator.

- [ ] **Step 4: Run representative tests and verify GREEN**

Run the same two-test command.

Expected: PASS.

### Task 6: Event and Audit Tables

**Files:**

- Modify: `apps/web/test/dashboard-action-treatments.test.tsx`
- Modify: `apps/web/src/features/events/events-page.tsx`
- Modify: `apps/web/src/features/audit/audit-log-page.tsx`

**Interfaces:**

- Consumes: shared column tones and `StatusBadge`.
- Produces: consistent event status, participant, period, count, verification, and audit metadata coloring while retaining specialized mandatory and action controls.

- [ ] **Step 1: Write failing representative tests**

Assert event status mapping uses shared meanings, event/date/organizer/count columns have explicit tones, and audit time/action/actor/target columns have complementary tones without changing their contents.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -w @qr/web -- dashboard-action-treatments.test.tsx dashboard-colour-semantics.test.tsx`

Expected: FAIL on missing event/audit column contracts.

- [ ] **Step 3: Audit and update both domain pages**

Apply explicit tones to every `DataTable` column in Events and Audit Logs. Replace generic event status badges with `StatusBadge` where the centralized mapping applies; retain mandatory, verification, and attendance-rate semantics.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the same two-test command.

Expected: PASS.

### Task 7: Exhaustive Table Audit and Focused Verification

**Files:**

- Modify: `apps/web/test/dashboard-table-audit.test.ts`
- Verify all files modified in Tasks 1–6.

**Interfaces:**

- Consumes: all authenticated `DataTable` declarations.
- Produces: an enforceable audit preventing new unreviewed plain tables from silently bypassing semantic treatments.

- [ ] **Step 1: Write the table audit test**

Create an explicit list of the twelve authenticated files containing `DataTable`. Assert the list matches the current source scan and that every declaration is reviewed through a nearby `tone:` assignment or specialized semantic cell component. Keep the allowlist explicit so a newly added table forces deliberate review.

- [ ] **Step 2: Run the audit and resolve only genuine omissions**

Run: `npm test -w @qr/web -- dashboard-table-audit.test.ts`

Expected: PASS only when all authenticated tables are represented and reviewed.

- [ ] **Step 3: Format changed files**

Run Prettier only on modified source, tests, specification, and this plan.

- [ ] **Step 4: Run affected type checks**

Run: `npm run typecheck -w @qr/ui && npm run typecheck -w @qr/web`

Expected: both commands exit successfully.

- [ ] **Step 5: Run the focused regression suite**

Run: `npm test -w @qr/web -- dashboard-colour-semantics.test.tsx dashboard-shared-primitives.test.tsx status-badge.test.tsx role-dashboard-treatments.test.tsx admin-semantic-actions.test.tsx academic-course-presentation.test.tsx dashboard-secondary-pages-semantics.test.tsx dashboard-analytics-visuals.test.tsx dashboard-semantic-values.test.tsx dashboard-action-treatments.test.tsx dashboard-table-audit.test.ts`

Expected: all selected tests pass with zero failures.

- [ ] **Step 6: Review final scope**

Confirm the implementation changes table presentation only, every authenticated `DataTable` is audited, closed lecturer sessions are red, no gradients were added, and no unrelated files or functionality changed.
