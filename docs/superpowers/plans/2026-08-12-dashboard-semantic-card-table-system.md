# Dashboard Semantic Card and Table System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply context-aware value colors, meaningful colored title icons, non-white card surfaces, tinted tables/lists, and explicit danger-styled deactivation controls throughout every authenticated Attendity dashboard and subpage.

**Architecture:** Establish the visual contract in shared `@qr/ui` primitives, then migrate authenticated features in bounded page groups. Shared components enforce safe defaults; page code supplies business meaning through semantic tones and meaningful icons without changing API calls, permissions, mutations, routing, or data flow.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, TanStack Query, Vitest, Testing Library.

## Global Constraints

- Below 60% is rose/red, 60–74% is amber, and 75% or above is emerald.
- Non-percentage colors follow metric meaning, including the meaning of zero.
- No primary card number or percentage may use black, near-black, or generic body text.
- No authenticated dashboard card, table, or list may be white-dominated in light mode or retain a light surface in dark mode.
- Every statistic card must use a meaningful title icon inside a coordinated colored badge.
- Color must not be the only status signal; existing labels, icons, badges, captions, and text remain.
- Administrator `Deactivate` controls use the danger button treatment and a `Power` icon without changing confirmation or permission behavior.
- Preserve all business logic, responsive behavior, API contracts, and existing functionality.
- This workspace is not a Git repository, so commit steps become local verification checkpoints.

---

### Task 1: Shared semantic values, headings, cards, and metrics

**Files:**

- Create: `packages/ui/src/components/semantic-value.tsx`
- Create: `packages/ui/src/components/card-header.tsx`
- Modify: `packages/ui/src/components/card.tsx`
- Modify: `packages/ui/src/components/metric-card.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/web/test/dashboard-shared-primitives.test.tsx`
- Modify: `apps/web/test/dashboard-colour-semantics.test.tsx`

**Interfaces:**

- Produces: `SemanticTone = 'green' | 'teal' | 'navy' | 'blue' | 'gold' | 'rose' | 'violet'`.
- Produces: `SemanticValue({ value, tone, suffix?, className? })` for non-percentage card values.
- Produces: `CardHeader({ icon, title, description?, tone, level? })` for coordinated heading icons.
- Extends: `CardProps.tone?: SemanticTone | 'slate'` with a non-white-dominated default surface.
- Extends: `MetricCardTone` with `teal` and upgrades every tone to a tinted gradient.

- [ ] **Step 1: Write failing shared-component behavior tests**

Add real rendered assertions that would fail if values inherit body text, cards return to white, or headings lose their icon badge:

```tsx
render(
  <>
    <Card aria-label="Default dashboard card">
      <span>Operations</span>
    </Card>
    <SemanticValue tone="blue" value={128} />
    <CardHeader icon={<CalendarDays />} title="Sessions" tone="violet" />
    <MetricCard icon={<Users />} label="Students" tone="teal" value={420} />
  </>,
);

expect(screen.getByRole('region', { name: 'Default dashboard card' })).toHaveClass(
  'from-slate-100',
  'dark:from-slate-900',
);
expect(screen.getByText('128')).toHaveClass('text-blue-700', 'dark:text-blue-300');
expect(screen.getByRole('heading', { name: 'Sessions' }).previousElementSibling).toHaveClass(
  'bg-violet-700',
);
expect(screen.getByText('420')).toHaveClass('text-teal-800', 'dark:text-teal-200');
```

- [ ] **Step 2: Run the shared tests and verify RED**

Run from `apps/web`:

```powershell
npm exec vitest -- run test/dashboard-shared-primitives.test.tsx test/dashboard-colour-semantics.test.tsx
```

Expected: imports or assertions fail because the semantic primitives, teal metric tone, and non-white default card treatment do not exist.

- [ ] **Step 3: Implement `SemanticValue`**

Create a shared tone map with explicit light/dark foreground classes and render values with tabular figures:

```tsx
export type SemanticTone = 'green' | 'teal' | 'navy' | 'blue' | 'gold' | 'rose' | 'violet';

const valueClasses: Record<SemanticTone, string> = {
  green: 'text-emerald-700 dark:text-emerald-300',
  teal: 'text-teal-700 dark:text-teal-300',
  navy: 'text-blue-900 dark:text-blue-200',
  blue: 'text-blue-700 dark:text-blue-300',
  gold: 'text-amber-700 dark:text-amber-300',
  rose: 'text-rose-700 dark:text-rose-300',
  violet: 'text-violet-700 dark:text-violet-300',
};
```

`SemanticValue` accepts `ReactNode` values so formatted counts such as `1,024`, ratios, and text-number combinations retain semantic color without parsing.

- [ ] **Step 4: Implement `CardHeader`**

Use the same tone vocabulary for icon badge, title, and description. Support only `h2` and `h3` through `level?: 2 | 3`; mark the supplied icon `aria-hidden` at its call site when the title already names the meaning.

- [ ] **Step 5: Upgrade `Card` and `MetricCard` surfaces**

Add card surface classes using colored 50/100 gradients in light mode and 900/950 gradients in dark mode. Remove `bg-surface`, `bg-white`, and white-dominated `via-white` defaults. Keep specialized `glass` behavior unchanged because its transparent context is intentional.

Metric tones use coordinated border, gradient, shadow, label, value, and icon classes. Add `teal`; retain existing prop names so callers remain compatible.

- [ ] **Step 6: Export the new primitives and run GREEN verification**

Export value/type definitions from `packages/ui/src/index.ts`, then rerun the two shared test files. Expected: all shared semantic component tests pass.

- [ ] **Step 7: Local checkpoint**

Run `npm run typecheck -w @qr/ui` and confirm the package builds with exact optional-property typing enabled.

---

### Task 2: Colored table and list foundation

**Files:**

- Modify: `packages/ui/src/components/data-table.tsx`
- Modify: `packages/ui/src/components/identifier-badge.tsx`
- Modify: `apps/web/test/dashboard-shared-primitives.test.tsx`
- Modify: `apps/web/test/dashboard-colour-semantics.test.tsx`

**Interfaces:**

- Retains: `DataTableRowTone` and `rowTone(row, index)`.
- Changes: each row tone controls both left border and soft row surface.
- Retains: existing `DataTable` captions, headers, row keys, and column contracts.

- [ ] **Step 1: Write the failing table-surface tests**

Render neutral and rose rows and assert the table wrapper, body, and rows use colored—not white—surfaces:

```tsx
const table = screen.getByRole('table', { name: 'Attendance risks' });
expect(table.parentElement).toHaveClass('from-slate-100', 'to-emerald-100');
expect(table.querySelector('tbody')).toHaveClass('bg-emerald-50/70', 'dark:bg-slate-950');
expect(within(table).getByRole('row', { name: /At risk/ })).toHaveClass(
  'border-l-rose-600',
  'bg-rose-50/80',
  'dark:bg-rose-950/30',
);
```

- [ ] **Step 2: Run table tests and verify RED**

Run the two shared dashboard test files. Expected: assertions fail on the current `bg-white`, `odd:bg-white`, and border-only row tones.

- [ ] **Step 3: Implement tinted table surfaces**

Replace the wrapper and body white surfaces with slate/emerald gradients and dark slate equivalents. Use a navy-to-emerald header gradient. Define each row tone as `{ border, surface }`; combine semantic surface with subdued alternating overlays without allowing `odd:bg-white` or `even:bg-slate-50` to override it.

- [ ] **Step 4: Strengthen identifier badges**

Confirm every existing `IdentifierBadgeTone` has explicit colored background, border, light text, and dark text. Add `teal` to `IdentifierBadgeTone` with `border-teal-200 bg-teal-100 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200` so event and lecturer identifiers do not overuse blue.

- [ ] **Step 5: Run table tests and verify GREEN**

Rerun both shared dashboard test files. Expected: tinted surface, semantic row tone, identifier, caption, and dark-mode assertions pass.

---

### Task 3: Administrator action controls and academic-management pages

**Files:**

- Modify: `apps/web/src/features/academic/institution-structure-page.tsx`
- Modify: `apps/web/src/features/academic/curriculum-management-page.tsx`
- Modify: `apps/web/src/features/academic/academic-management-page.tsx`
- Modify: `apps/web/src/features/academic/class-schedules-page.tsx`
- Modify: `apps/web/src/features/registrations/registration-management-page.tsx`
- Modify: `apps/web/src/features/users/user-management-page.tsx`
- Create: `apps/web/test/admin-semantic-actions.test.tsx`
- Modify: `apps/web/test/academic-course-presentation.test.tsx`

**Interfaces:**

- Consumes: `CardHeader`, `SemanticValue`, semantic `Card.tone`, enhanced `DataTable`, `Button variant="danger"`.
- Preserves: all current mutations, permission gates, confirmation dialogs, query invalidation, and row callbacks.

- [ ] **Step 1: Write failing administrator action tests**

Render institution structure and curriculum rows through their real pages with complete API fixtures. Assert each active `Deactivate` control is a button with danger surface and a `Power` icon, then click it and assert the existing confirmation or mutation path still starts.

```tsx
const deactivate = await screen.findByRole('button', { name: /Deactivate/ });
expect(deactivate).toHaveClass('bg-danger', 'text-white');
expect(deactivate.querySelector('svg')).toBeInTheDocument();
fireEvent.click(deactivate);
expect(screen.getByRole('dialog', { name: /Deactivate academic record/ })).toBeInTheDocument();
```

- [ ] **Step 2: Run admin tests and verify RED**

Run from `apps/web`:

```powershell
npm exec vitest -- run test/admin-semantic-actions.test.tsx test/academic-course-presentation.test.tsx
```

Expected: active deactivation actions still use the ghost/plain-text treatment and some academic cards lack semantic headings or surfaces.

- [ ] **Step 3: Convert all administrator deactivation cells**

In `institution-structure-page.tsx` and both action columns in `curriculum-management-page.tsx`, use:

```tsx
<Button className="gap-2 px-3" variant="danger" onClick={existingHandler}>
  <Power aria-hidden="true" size={16} />
  Deactivate
</Button>
```

Keep disabled states and existing dialog/mutation targets. Render historical/inactive states as neutral badges, not button-like text.

- [ ] **Step 4: Migrate academic and registration cards/tables**

Assign semantic card tones and meaningful `CardHeader` icons across institution structure, curriculum, courses, class schedules, and registration management. Use `IdentifierBadge` for codes and registration identifiers, `PercentageValue` for attendance requirements, and `rowTone` for active, inactive, pending, approved, and rejected records.

- [ ] **Step 5: Migrate user-management action and list treatments**

Keep invitation revoke destructive using `variant="danger"`; use colored role/status badges and semantic row tones. Add colored headers to invitation and account-management cards. Do not change staff invitation permissions or endpoint behavior.

- [ ] **Step 6: Run administrator tests and verify GREEN**

Rerun the administrator and academic tests. Expected: danger actions retain behavior and representative cards/tables satisfy semantic styling.

---

### Task 4: Portal, analytics, reports, clearance, and event dashboards

**Files:**

- Modify: `apps/web/src/features/portals/portal-page.tsx`
- Modify: `apps/web/src/features/portals/lecturer-workspace-page.tsx`
- Modify: `apps/web/src/features/portals/student-workspace-page.tsx`
- Modify: `apps/web/src/features/portals/examiner-workspace-page.tsx`
- Modify: `apps/web/src/features/portals/engagement-dashboard-panel.tsx`
- Modify: `apps/web/src/features/analytics/dashboard-analytics-overview.tsx`
- Modify: `apps/web/src/features/analytics/analytics-dashboard-page.tsx`
- Modify: `apps/web/src/features/analytics/student-analytics-panel.tsx`
- Modify: `apps/web/src/features/analytics/examiner-verification-overview.tsx`
- Modify: `apps/web/src/features/reports/reports-page.tsx`
- Modify: `apps/web/src/features/clearance/clearance-page.tsx`
- Modify: `apps/web/src/features/events/event-dashboard-panel.tsx`
- Modify: `apps/web/src/features/events/events-page.tsx`
- Modify: `apps/web/src/features/events/event-editor.tsx`
- Modify: `apps/web/test/role-dashboard-treatments.test.tsx`
- Modify: `apps/web/test/dashboard-analytics-visuals.test.tsx`
- Create: `apps/web/test/dashboard-semantic-values.test.tsx`

**Interfaces:**

- Consumes: shared semantic cards, headings, values, percentages, progress meters, badges, and table row tones.
- Preserves: QR, attendance, report, clearance, analytics, and event behavior.

- [ ] **Step 1: Write failing cross-role semantic tests**

Render representative admin, lecturer, student, and examiner dashboard datasets. Assert operational totals use blue/violet/teal, verified/eligible values use emerald, warning/risk values use amber/rose, and every tested metric card contains an icon badge.

Include the zero-context boundary: render zero absences as green and zero attendance as rose to prove the semantic tone comes from metric meaning rather than numeric magnitude.

- [ ] **Step 2: Run cross-role tests and verify RED**

Run:

```powershell
npm exec vitest -- run test/dashboard-semantic-values.test.tsx test/role-dashboard-treatments.test.tsx test/dashboard-analytics-visuals.test.tsx
```

Expected: bespoke numeric text and untinted cards fail the new consumer-visible assertions.

- [ ] **Step 3: Migrate portal and analytics metrics**

Assign a meaningful Lucide icon and semantic tone to every `MetricCard`. Replace raw prominent figures inside bespoke cards with `SemanticValue`; keep percentages on `PercentageValue` or `ProgressMeter`. Use context-aware tone selection at the call site for count values.

- [ ] **Step 4: Migrate report and clearance cards/tables**

Apply semantic headings and non-white tones to report filters, summary cards, clearance eligibility cards, and verification results. Use rose/amber/emerald for eligibility percentages and states. Apply row tones to report and course eligibility tables.

- [ ] **Step 5: Migrate event cards, lists, and tables**

Use teal/blue for event volume and registrations, emerald for checked-in/completed, amber for pending/upcoming, and rose for cancelled/failed/absent. Add meaningful icons to event metrics and card headings. Apply row tones to event attendance, registration, guest, and analytics lists.

- [ ] **Step 6: Run cross-role tests and verify GREEN**

Rerun the three cross-role test files plus `student-check-in-feedback.test.tsx` and `lecturer-qr-modes.test.tsx`. Expected: semantic presentation passes without QR or check-in regressions.

---

### Task 5: Remaining authenticated cards and custom lists

**Files:**

- Modify: `apps/web/src/features/announcements/announcement-editor.tsx`
- Modify: `apps/web/src/features/announcements/announcements-page.tsx`
- Modify: `apps/web/src/features/attendance/attendance-history.tsx`
- Modify: `apps/web/src/features/attendance/face-capture.tsx`
- Modify: `apps/web/src/features/audit/audit-log-page.tsx`
- Modify: `apps/web/src/features/notifications/event-notification-preferences-panel.tsx`
- Modify: `apps/web/src/features/notifications/notification-center-page.tsx`
- Modify: `apps/web/src/features/notifications/reminder-preferences-panel.tsx`
- Modify: `apps/web/src/features/profiles/profile-page.tsx`
- Modify: `apps/web/src/features/profiles/student-profile-form.tsx`
- Modify: `apps/web/src/features/profiles/lecturer-profile-form.tsx`
- Modify: `apps/web/src/features/settings/settings-page.tsx`
- Create: `apps/web/test/dashboard-secondary-pages-semantics.test.tsx`
- Modify: `apps/web/test/profile-flows.test.tsx`

**Interfaces:**

- Consumes: semantic shared primitives from Tasks 1–2.
- Preserves: forms, validation, notification preferences, audit filters, profile mutations, and settings permissions.

- [ ] **Step 1: Write failing secondary-page tests**

Render representative announcement, notification, profile, audit, and settings content. Assert card headings contain colored icons, card/list surfaces are tinted in light and dark mode, identifiers/statuses use badges, and prominent numbers use `SemanticValue` or percentage primitives.

- [ ] **Step 2: Run secondary-page tests and verify RED**

Run the new test with `profile-flows.test.tsx`. Expected: current flat content cards and custom white list rows fail the semantic surface assertions.

- [ ] **Step 3: Migrate announcement, notification, and audit experiences**

Apply blue/violet information tones, amber pending tones, emerald delivered/read tones, and rose failed/revoked tones. Add colored left borders to custom list rows and preserve filter, pagination, and editor behavior.

- [ ] **Step 4: Migrate profile and settings experiences**

Use semantic card headings for identity, academic details, security, institution settings, attendance policy, and integration sections. Use colored badges for roles, account state, faculty, department, and identifiers. Preserve all form-control dark-mode classes and form submission behavior.

- [ ] **Step 5: Migrate attendance history and face capture**

Tint calendar/heatmap containers and face-verification cards without reducing camera contrast. Use semantic attendance intensity colors and keep every existing accessible label.

- [ ] **Step 6: Run secondary-page tests and verify GREEN**

Rerun the new test, profile flows, dark-mode form controls, and scanner reliability. Expected: visual requirements pass without form or camera regressions.

---

### Task 6: Authenticated-dashboard inventory and final verification

**Files:**

- Create: `apps/web/test/dashboard-semantic-inventory.test.tsx`
- Modify: only the exact authenticated feature files listed in Tasks 3–5 when their rendered inventory case fails.
- Review: `docs/superpowers/specs/2026-08-12-dashboard-semantic-card-table-system-design.md`

**Interfaces:**

- Consumes: the completed shared semantic system and migrated authenticated pages.
- Produces: a regression inventory proving representative render behavior for every authenticated feature group.

- [ ] **Step 1: Build the explicit inventory fixture**

Create a table-driven test whose literal cases cover these feature groups: academic management, analytics, announcements, attendance, audit, clearance, events, notifications, portals, profiles, registrations, reports, settings, and users. Each case renders a real exported page or panel with complete fixture data and asserts its principal card/table/list has a tinted surface and semantic text.

- [ ] **Step 2: Run the inventory and fix only real omissions**

Run `dashboard-semantic-inventory.test.tsx`. For each failure, migrate the exposed card, prominent value, table, or list in its owning feature file. Do not add source-code grep assertions; verify rendered behavior.

- [ ] **Step 3: Run all affected UI tests**

From `apps/web`, run:

```powershell
npm exec vitest -- run test/dashboard-shared-primitives.test.tsx test/dashboard-colour-semantics.test.tsx test/dashboard-semantic-values.test.tsx test/dashboard-secondary-pages-semantics.test.tsx test/dashboard-semantic-inventory.test.tsx test/admin-semantic-actions.test.tsx test/academic-course-presentation.test.tsx test/role-dashboard-treatments.test.tsx test/dashboard-analytics-visuals.test.tsx test/dark-mode-form-controls.test.tsx test/profile-flows.test.tsx test/qr-scanner-reliability.test.tsx test/student-check-in-feedback.test.tsx test/lecturer-qr-modes.test.tsx
```

Expected: all focused visual and behavior tests pass with no unhandled errors.

- [ ] **Step 4: Run static verification**

From the repository root:

```powershell
npm run typecheck -w @qr/ui
npm run typecheck -w @qr/web
npx eslint packages/ui/src/components packages/ui/src/index.ts apps/web/src/features apps/web/test/dashboard-shared-primitives.test.tsx apps/web/test/dashboard-colour-semantics.test.tsx apps/web/test/dashboard-semantic-values.test.tsx apps/web/test/dashboard-secondary-pages-semantics.test.tsx apps/web/test/dashboard-semantic-inventory.test.tsx apps/web/test/admin-semantic-actions.test.tsx
npm exec prettier -- --check packages/ui/src/components packages/ui/src/index.ts apps/web/src/features apps/web/test docs/superpowers/specs/2026-08-12-dashboard-semantic-card-table-system-design.md docs/superpowers/plans/2026-08-12-dashboard-semantic-card-table-system.md
```

Expected: both TypeScript builds, ESLint, and Prettier exit successfully.

- [ ] **Step 5: Perform the final visual and accessibility review**

Review one route for each user role at desktop and narrow viewport widths in light and dark mode. Confirm no prominent card value appears black, no card/table/list is white-dominated, card-title icons communicate the title, percentage colors match thresholds, row text remains readable, and every active administrator `Deactivate` action is an unmistakable danger button.

- [ ] **Step 6: Local completion checkpoint**

Compare the completed implementation line-by-line with the approved specification. Record any technically impossible exception explicitly; otherwise report full coverage. Git integration remains unavailable until repository metadata is restored or initialized.
