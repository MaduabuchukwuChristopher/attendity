# Report Filtering and Dashboard Shell Implementation Plan

> **For Codex:** Follow these test-driven tasks in order. Do not broaden this repair into a router rewrite or unrelated redesign.

**Goal:** Make lecturer attendance reports accurately reflect an inclusive selected date range, sort recent attendance first, export the complete filtered dataset, and improve shared dashboard navigation, scrollbar, spacing, and dark-mode surfaces.

**Architecture:** The API remains authoritative for institution-local dates, report population, ordering, pagination, and export content. Pure helpers make report behavior testable. Shared UI primitives and reusable dashboard scroll hooks distribute the shell fixes without page-level duplication.

**Tech stack:** React 19, TypeScript, TanStack Query, Express, Zod, MongoDB/Mongoose, PDFKit, ExcelJS, Tailwind CSS, Vitest, and the Node test runner.

**Design reference:** `docs/superpowers/specs/2026-08-14-report-filtering-and-dashboard-shell-design.md`

---

## Task 1: Define inclusive report-date behavior

**Files:**

- Modify: `apps/api/test/analytics-periods.test.ts`
- Modify: `apps/api/test/analytics.test.ts`
- Modify: `apps/api/src/validators/analytics.validator.ts`
- Modify: `apps/api/src/services/analytics.service.ts`

1. Add failing tests for an exported `resolveReportDateRange` helper. For `Africa/Lagos`, verify that `2026-08-01` starts at `2026-07-31T23:00:00.000Z`, that the selected end day remains included through the next local midnight minus one millisecond, and that reversed or over-one-year ranges fail.
2. Change report validation tests to require strict `YYYY-MM-DD` strings instead of eagerly coerced `Date` values.
3. Run `npm run test -w @qr/api -- --test-name-pattern="report|analytics period"` and confirm the new tests fail.
4. Reuse `zonedMidnight` to implement the report-specific resolver. Calculate the end boundary from the following local midnight so time-zone offset changes remain correct.
5. Preserve date-only values in `analyticsReportQuerySchema` for service-layer resolution.
6. Re-run the focused test and commit as `fix: resolve inclusive report date ranges`.

## Task 2: Build deterministic date-scoped report rows

**Files:**

- Modify: `packages/types/src/index.ts`
- Modify: `apps/api/src/services/analytics.service.ts`
- Modify: `apps/api/test/analytics.test.ts`

1. Extend the analytics fixture with multiple students, recent and older check-ins, a registered absentee, and a course without selected-range sessions.
2. Add failing tests for a pure `buildAnalyticsReportRows` helper. Require zero-session courses to be omitted, registered absentees to remain when a course had a session, `latestAttendanceAt` to use the newest matching check-in, attended rows to sort newest-first, and no-check-in rows to sort last with deterministic name/registration tie-breakers.
3. Run `npm run test -w @qr/api -- --test-name-pattern="report rows"` and confirm failure.
4. Add optional `latestAttendanceAt` to `AnalyticsReportRow` and implement the pure row builder from the already tenant- and date-scoped dataset.
5. Preserve risk-scope filtering and refactor `AnalyticsService.report` to use the helper.
6. Re-run the focused test and commit as `fix: order live report rows by recent attendance`.

## Task 3: Unify preview and complete-export generation

**Files:**

- Modify: `apps/api/src/controllers/analytics.controller.ts`
- Modify: `apps/api/src/services/analytics.service.ts`
- Modify: `apps/api/test/analytics.test.ts`

1. Add failing tests showing that preview mode slices the requested page while export mode returns all filtered rows with the same summary, filters, and order.
2. Run `npm run test -w @qr/api -- --test-name-pattern="report"` and confirm the complete-export assertion fails.
3. Replace duplicated controller date manipulation with one service-level request path that loads the institution timezone and resolves the inclusive range.
4. Add an explicit internal pagination mode: preview paginates; export returns the complete dataset. Do not simulate full export with an oversized client limit.
5. Re-run the focused test and commit as `fix: export complete filtered attendance reports`.

## Task 4: Make PDF, Excel, and CSV reflect the filtered dataset

**Files:**

- Modify: `apps/api/src/services/analytics-export.service.ts`
- Modify: `apps/api/test/branded-exports.test.ts`

1. Add failing assertions that CSV and Excel include the selected period, latest-attendance column, and all filtered rows. Add a PDF fixture exceeding eighteen rows and require successful multipage generation.
2. Run `npm run test -w @qr/api -- --test-name-pattern="branded analytics exports"`.
3. Remove PDF row truncation, add safe page breaks with repeated table context, and show the inclusive period and latest attendance in all three formats. Use `No check-in` for absent timestamps.
4. Preserve logo handling, report branding, report ID, and checksum metadata.
5. Re-run the export test and commit as `fix: include full date-filtered data in report exports`.

## Task 5: Align report preview and download requests

**Files:**

- Modify: `apps/web/src/features/reports/reports-page.tsx`
- Modify: `apps/web/src/features/reports/report-export.ts`
- Modify: `apps/web/test/branded-report-actions.test.ts`
- Create: `apps/web/test/reports-page.test.tsx`

1. Add failing tests that submitting course/from/to sends the exact selected values and resets page one, the table displays `Latest attendance`, and all download formats use the same scope/course/from/to snapshot without UI page or limit.
2. Run `npm run test -w @qr/web -- branded-report-actions reports-page`.
3. Render latest attendance using the existing date-formatting conventions and an explicit `No check-in` label.
4. Change `downloadAnalyticsReport` to accept export-relevant filters only. Derive its immutable filter snapshot from the generated report so the download matches the visible result.
5. Re-run the tests and commit as `fix: align report previews and filtered downloads`.

## Task 6: Refresh analytics immediately after check-in

**Files:**

- Modify: `apps/web/src/features/portals/student-workspace-page.tsx`
- Modify: `apps/web/test/student-check-in-feedback.test.tsx`
- Verify unchanged behavior: `apps/web/src/app/realtime-provider.tsx`

1. Extend the successful check-in test to require invalidation of both `['attendance', 'student']` and the `['analytics']` query family.
2. Run `npm run test -w @qr/web -- student-check-in-feedback` and confirm failure.
3. Invalidate analytics after a local check-in succeeds. Retain the existing socket-driven invalidation for other connected roles; do not add duplicate listeners.
4. Re-run the test and commit as `fix: refresh analytics after attendance check-in`.

## Task 7: Preserve sidebar position and modernize scrollbars

**Files:**

- Create: `apps/web/src/hooks/use-persistent-scroll-region.ts`
- Create: `apps/web/src/hooks/use-dashboard-scrollbars.ts`
- Modify: `apps/web/src/layouts/dashboard-layout.tsx`
- Modify: `apps/web/src/layouts/dashboard-sidebar.tsx`
- Modify: `apps/web/src/styles/index.css`
- Create: `apps/web/test/dashboard-shell-behavior.test.tsx`

1. Add failing tests that sidebar scroll position survives remount, mobile selection still invokes `onClose`, and scrolling applies then clears a visible-scrollbar state after an idle timeout. Use fake timers.
2. Run `npm run test -w @qr/web -- dashboard-shell-behavior`.
3. Implement a typed persistent-scroll hook using a React ref, layout restoration, and throttled session storage updates.
4. Implement a dashboard scrollbar hook that marks active scroll targets and cleans timers/classes on unmount.
5. Apply the hooks to the fixed sidebar and dashboard root. Add thin solid-color WebKit and Firefox treatments with hover/focus reveal, reduced-motion handling, and a high-contrast fallback.
6. Run `npm run test -w @qr/web -- dashboard-shell-behavior dashboard-navigation` and commit as `fix: preserve dashboard navigation scroll state`.

## Task 8: Standardize icon spacing and solid card surfaces

**Files:**

- Modify: `packages/ui/src/components/brand-mark.tsx`
- Modify: `packages/ui/src/components/button.tsx`
- Modify: `packages/ui/src/components/card.tsx`
- Modify: `packages/ui/src/components/metric-card.tsx`
- Modify: `apps/web/src/features/registrations/registration-management-page.tsx`
- Modify: `apps/web/src/features/academic/academic-management-page.tsx`
- Modify: `apps/web/test/dashboard-shared-primitives.test.tsx`
- Modify: `apps/web/test/dashboard-colour-semantics.test.tsx`
- Modify: `apps/web/test/dark-mode-form-controls.test.tsx`

1. Update tests to require an explicit BrandMark icon/name gap, a shared text-button icon gap, solid colored light/dark Card and MetricCard surfaces, and no gradient utility classes in those primitives.
2. Add assertions that the currently unthemed registration and academic form controls have dark surfaces and visible text.
3. Run `npm run test -w @qr/web -- dashboard-shared-primitives dashboard-colour-semantics dark-mode-form-controls` and confirm expected failures.
4. Increase BrandMark spacing and add `gap-2` to the shared button base class.
5. Replace shared card gradients with solid semantic surfaces, deep solid dark surfaces, matching borders, and accessible text. Add missing dark classes only to the identified one-off controls. Keep the deliberately white QR quiet zone unchanged for scanner reliability.
6. Re-run the tests, then run `rg -n "bg-gradient|from-|via-|to-" packages/ui/src/components/card.tsx packages/ui/src/components/metric-card.tsx`; expect no matches.
7. Commit as `style: refine dashboard surfaces and control spacing`.

## Task 9: Document and verify the repair

**Files:**

- Modify: `apps/api/src/docs/analytics-api.md`
- Modify: `apps/api/src/docs/openapi.ts` if report query/row schemas are explicit there
- Modify: `README.md` only if it currently documents report behavior

1. Document strict date-only inputs, inclusive institution-local boundaries, latest-attendance ordering, absentee inclusion, and complete filter-aware exports.
2. Align OpenAPI examples and the optional `latestAttendanceAt` field if those schemas are present.
3. Run focused verification:
   - `npm run test -w @qr/api -- --test-name-pattern="analytics|report|branded"`
   - `npm run test -w @qr/web -- branded-report-actions reports-page student-check-in-feedback dashboard-shell-behavior dashboard-navigation dashboard-shared-primitives dashboard-colour-semantics dark-mode-form-controls`
   - `npm run typecheck -w @qr/api`
   - `npm run typecheck -w @qr/web`
   - `npm run typecheck -w @qr/ui`
   - `git diff --check`
4. Review the final diff for tenant/RBAC preservation, full export content, matching filters, absence of gradients, an untouched QR quiet zone, and dashboard-scoped scrollbar behavior.
5. Commit only changed documentation files as `docs: describe inclusive filtered attendance reports`.
