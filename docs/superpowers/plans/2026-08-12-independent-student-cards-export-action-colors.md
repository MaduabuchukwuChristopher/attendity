# Independent Student Cards and Export Action Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Student Dashboard cards independently sized and give every matching export, print, and share action a distinct, accessible semantic color.

**Architecture:** Repair both stretching defects through grid cross-axis alignment rather than fixed heights. Extend the shared `Button` API with semantic action variants, then adopt those variants only on existing document, image, spreadsheet, print, and share controls.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS 4, Vitest, Testing Library, shared `@qr/ui` package.

## Global Constraints

- Preserve the monorepo architecture and existing behavior.
- Reuse the shared `Button` component; do not duplicate action-color class strings in feature pages.
- Use solid colors only; do not introduce gradients.
- Keep controls legible and focus-visible in light and dark modes.
- Run only focused tests and affected type checks.

---

### Task 1: Independent Student Workspace Cards

**Files:**

- Modify: `apps/web/test/role-dashboard-treatments.test.tsx`
- Modify: `apps/web/src/features/portals/student-workspace-page.tsx`

**Interfaces:**

- Consumes: existing scanner region label `Scan the live QR scanner` and manual region label `Manual check-in card`.
- Produces: start-aligned two-card grid with independently sized scanner and manual-entry cards.

- [ ] **Step 1: Write the failing test**

Add assertions that the scanner's parent grid has `items-start` and the Manual Entry card has `self-start`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @qr/web -- role-dashboard-treatments.test.tsx`

Expected: FAIL because the student grid and/or manual card lacks the alignment class.

- [ ] **Step 3: Write minimal implementation**

Change the grid to `className="mt-8 grid items-start gap-5 lg:grid-cols-2"` and add `self-start` to the Manual Entry card.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @qr/web -- role-dashboard-treatments.test.tsx`

Expected: PASS.

### Task 2: Independent Attendance Clearance Cards

**Files:**

- Modify: `apps/web/test/clearance-actions.test.tsx`
- Modify: `apps/web/src/features/clearance/clearance-page.tsx`

**Interfaces:**

- Consumes: `data-testid="clearance-course-card"` and current per-course clearance generation state.
- Produces: a start-aligned course grid where eligible CSC 405 can expand without stretching either neighboring Not Eligible card.

- [ ] **Step 1: Write the failing test**

Render two Not Eligible courses followed by eligible CSC 405. Assert the cards' parent grid has `items-start`, every course card has `self-start`, generate CSC 405, and reassert the two Not Eligible cards retain `self-start` while CSC 405 displays its PDF actions.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @qr/web -- clearance-actions.test.tsx`

Expected: FAIL because the clearance grid and course cards lack independent alignment.

- [ ] **Step 3: Write minimal implementation**

Add `items-start` to the eligibility grid and `self-start` to every clearance course card. Do not change responsive columns or generation state.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @qr/web -- clearance-actions.test.tsx`

Expected: PASS.

### Task 3: Shared Semantic Export Button Variants

**Files:**

- Modify: `apps/web/test/button-contrast.test.ts`
- Modify: `packages/ui/src/components/button.tsx`

**Interfaces:**

- Consumes: `buttonClassName(variant)` and `ButtonProps['variant']`.
- Produces: `download`, `print`, `excel`, `csv`, `share`, and `image` variants.

- [ ] **Step 1: Write the failing tests**

Assert that each new variant returns its semantic solid background, explicit readable foreground, dark-mode foreground, focus ring, and action-colored shadow classes.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @qr/web -- button-contrast.test.ts`

Expected: TypeScript/test failure because the new variants do not exist.

- [ ] **Step 3: Write minimal implementation**

Extend the variant union and `variantClasses` with blue `download`, violet `print`, emerald `excel`, amber `csv`, cyan `share`, and rose `image` solid treatments. Keep existing disabled behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @qr/web -- button-contrast.test.ts`

Expected: PASS.

### Task 4: Adopt Semantic Variants on Existing Actions

**Files:**

- Modify: `apps/web/test/clearance-actions.test.tsx`
- Modify: `apps/web/test/lecturer-qr-modes.test.tsx`
- Modify: `apps/web/test/dashboard-action-treatments.test.tsx`
- Modify: `apps/web/src/features/clearance/clearance-page.tsx`
- Modify: `apps/web/src/features/attendance/qr-session-controls.tsx`
- Modify: `apps/web/src/features/events/events-page.tsx`

**Interfaces:**

- Consumes: shared variants from Task 3.
- Produces: consistent action colors on PDF/general downloads, printing, Excel, CSV, sharing, and PNG downloads.

- [ ] **Step 1: Write failing feature tests**

Assert clearance PDF buttons use `download`, print buttons use `print`, Excel uses `excel`, CSV uses `csv`, Share uses `share`; assert static QR PNG uses `image`, QR PDF uses `download`, QR print uses `print`; assert event CSV and print controls use their matching variants.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @qr/web -- clearance-actions.test.tsx lecturer-qr-modes.test.tsx dashboard-action-treatments.test.tsx`

Expected: FAIL because controls still use primary or secondary styling.

- [ ] **Step 3: Apply the shared variants**

Set only the matching existing `Button` controls to their semantic variants. Preserve labels, icons, callbacks, disabled states, permissions, and data generation.

- [ ] **Step 4: Run focused tests**

Run: `npm test -w @qr/web -- clearance-actions.test.tsx lecturer-qr-modes.test.tsx dashboard-action-treatments.test.tsx role-dashboard-treatments.test.tsx button-contrast.test.ts`

Expected: PASS.

### Task 5: Focused Verification

**Files:**

- Verify all files modified above.

**Interfaces:**

- Consumes: completed layout and semantic-button changes.
- Produces: verified, formatted, type-safe implementation.

- [ ] **Step 1: Format changed files**

Run Prettier only on the modified plan, source, and test files.

- [ ] **Step 2: Run affected type checks**

Run: `npm run typecheck -w @qr/ui && npm run typecheck -w @qr/web`

Expected: both exit successfully.

- [ ] **Step 3: Run the focused regression suite**

Run: `npm test -w @qr/web -- clearance-actions.test.tsx lecturer-qr-modes.test.tsx dashboard-action-treatments.test.tsx role-dashboard-treatments.test.tsx button-contrast.test.ts`

Expected: all selected tests pass with no failures.

- [ ] **Step 4: Review the final diff**

Confirm only the specified layout classes, shared semantic variants, matching action assignments, tests, and documentation changed.
