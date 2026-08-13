# Dashboard Reliability Shared-Primitives Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair Attendity's dashboard dialog, QR, scanner, clearance, dark-mode table, course-list, metric, and role-card defects through shared primitives and focused role integrations.

**Architecture:** Shared UI components own viewport bounds, dark surfaces, semantic values, and scanner presentation. The attendance API persists one private encrypted credential for static sessions while retaining nonce rotation for rotating sessions. Student, lecturer, examiner, and academic pages compose those shared behaviors without duplicating security or styling logic.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS 4, TanStack Query, Zod, Mongoose 8, Express 5, html5-qrcode, qrcode, Vitest/Testing Library, Node test runner.

## Global Constraints

- Follow `MASTER_PROMPT.md`, `CODING_RULES.md`, and `PROJECT_RULES.md`.
- Preserve the established monorepo and existing authentication, RBAC, tenant, attendance, GPS, biometric, registration, replay, and duplicate-check controls.
- Use mature emerald, university navy, academic gold, blue, rose, and violet; introduce no gradients.
- Use strict TypeScript and existing reusable components before adding new ones.
- Write each regression test first and observe the expected failure before production changes.
- Run only tests, typechecks, lint, and browser checks related to this repair.
- The workspace has no `.git` repository; save testable checkpoints without commit commands.

---

### Task 1: Viewport-Bounded Dialog and Dark-Safe Table Primitives

**Files:**

- Modify: `packages/ui/src/components/dialog.tsx`
- Modify: `packages/ui/src/components/data-table.tsx`
- Modify: `packages/ui/src/components/metric-card.tsx`
- Modify: `packages/ui/src/components/percentage-value.tsx`
- Test: `apps/web/test/dashboard-shared-primitives.test.tsx`

**Interfaces:**

- Consumes: existing `DialogProps`, `DataTable<T>`, `MetricCardProps`, and `PercentageValue` exports from `@qr/ui`.
- Produces: the same public interfaces with viewport-safe dialog structure, explicit table theme surfaces, and guaranteed semantic value styling.

- [ ] **Step 1: Write failing shared-primitive tests**

Add behavior tests that render the real components and assert:

```tsx
render(
  <Dialog
    isOpen
    onClose={() => undefined}
    title="Start class attendance"
    footer={<button>Open session</button>}
  >
    <div>Long form</div>
  </Dialog>,
);
expect(screen.getByRole('dialog').querySelector('section')).toHaveClass(
  'max-h-[calc(100dvh-2rem)]',
  'overflow-hidden',
);
expect(screen.getByTestId('dialog-scroll-region')).toHaveClass('overflow-y-auto');
expect(screen.getByText('Open session').closest('footer')).toHaveClass('shrink-0');
```

Render `DataTable` and verify its wrapper, body, rows, and cells expose explicit dark surfaces rather than relying on inherited color. Render `MetricCard` and `PercentageValue` at 35%, 65%, and 80% and verify rose, amber, and emerald classes respectively.

- [ ] **Step 2: Run the new test and confirm RED**

Run:

```powershell
node ../../node_modules/vitest/vitest.mjs run test/dashboard-shared-primitives.test.tsx
```

Expected: failures for missing dialog scroll-region semantics and incomplete explicit table dark surfaces.

- [ ] **Step 3: Implement the bounded dialog shell**

Change the dialog panel to:

```tsx
<section className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl ...">
  <header className="flex shrink-0 items-start justify-between gap-4 border-b ...">...</header>
  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4" data-testid="dialog-scroll-region">
    {children}
  </div>
  {footer ? (
    <footer className="flex shrink-0 justify-end gap-3 border-t ...">{footer}</footer>
  ) : null}
</section>
```

Retain focus trapping, Escape closure, body scroll lock, backdrop closure, and focus restoration.

- [ ] **Step 4: Implement explicit table and value surfaces**

Give the table wrapper and `tbody` explicit `dark:bg-slate-950`, rows explicit `dark:odd:bg-slate-900` and `dark:even:bg-slate-800/80`, cells explicit dark text, and visible dark borders/hover states. Keep the four-pixel semantic left border.

Ensure `MetricCard` always uses its tone's `value` class and `PercentageValue` resolves:

```ts
value >= 75 ? 'green' : value >= 60 ? 'gold' : 'rose';
```

- [ ] **Step 5: Run the focused test and confirm GREEN**

Run the command from Step 2. Expected: all Task 1 tests pass.

### Task 2: Persist One Private Credential for Static QR Sessions

**Files:**

- Modify: `apps/api/src/models/attendance-session.model.ts`
- Modify: `apps/api/src/services/attendance.service.ts`
- Modify: `apps/api/src/scripts/seed.ts`
- Modify: `apps/api/src/scripts/persist-demo-data.ts`
- Test: `apps/api/test/attendance.test.ts`

**Interfaces:**

- Adds private model field `staticQrToken?: string` with `select: false`.
- Adds service helper `private async stableQrToken(session): Promise<string>`.
- Lecturer workspace and static PDF continue returning existing `qrToken: string` without API contract changes.

- [ ] **Step 1: Write failing static-stability tests**

Create a static session fixture, read its lecturer representation twice, and assert the returned token is byte-for-byte identical. Assert a rotating session produces a new token after its nonce/rotation time changes. Assert JSON serialization excludes `staticQrToken`.

Use a literal behavioral assertion:

```ts
assert.equal(first.qrToken, second.qrToken);
assert.notEqual(rotatingBefore.qrToken, rotatingAfter.qrToken);
assert.equal('staticQrToken' in session.toJSON(), false);
```

- [ ] **Step 2: Run the attendance test and confirm RED**

Run:

```powershell
node ../../node_modules/tsx/dist/cli.mjs --conditions=development --import ./test/setup.ts --test test/attendance.test.ts
```

Expected: repeated static-token assertion fails because AES-GCM currently creates a new random IV per response.

- [ ] **Step 3: Add the private model field**

Add:

```ts
staticQrToken: { type: String, select: false, maxlength: 4096 },
```

Remove it in the model transform alongside nonce and private check-in fields.

- [ ] **Step 4: Implement stable token creation and legacy repair**

The service helper must:

```ts
if ((session.qrMode ?? 'rotating') !== 'static') return this.qrToken(session);
if (session.staticQrToken) return session.staticQrToken;
const token = this.qrToken(session);
const repaired = await AttendanceSessionModel.findOneAndUpdate(
  { _id: session._id, status: 'open', staticQrToken: { $exists: false } },
  { $set: { staticQrToken: token } },
  { new: true },
)
  .select('+staticQrToken +qrNonce +qrNonceHash +checkInCode')
  .exec();
return repaired?.staticQrToken ?? token;
```

Generate and persist the token immediately after creating a new static session. Select `+staticQrToken` in lecturer workspace and static PDF queries. Use `stableQrToken` for static workspace responses and PDF rendering; rotating sessions continue using `qrToken`.

- [ ] **Step 5: Keep seed behavior explicit**

Seeded historical demo sessions remain rotating and do not need static credentials. Add no plaintext production credential to seed data.

- [ ] **Step 6: Run the attendance test and confirm GREEN**

Run the command from Step 2. Expected: static stability, rotating behavior, expiry, role, and PDF tests all pass.

### Task 3: Improve Displayed QR and Camera Scanner Reliability

**Files:**

- Modify: `apps/web/src/features/attendance/check-in-qr.tsx`
- Modify: `apps/web/src/features/attendance/qr-scanner.tsx`
- Modify: `apps/web/src/features/portals/student-workspace-page.tsx`
- Test: `apps/web/test/qr-scanner-reliability.test.tsx`

**Interfaces:**

- Keeps `CheckInQr({ value, label, onReady })` and `QrScanner({ onScan, continuous, title, description })`.
- Adds internal scanner state `'closed' | 'starting' | 'active' | 'error'` without exposing new API.

- [ ] **Step 1: Write failing scanner tests**

Mock only the external camera library. Capture the real constructor configuration and assert:

```ts
expect(config.supportedScanTypes).toEqual([Html5QrcodeScanType.SCAN_TYPE_CAMERA]);
expect(config.qrbox(500, 400)).toEqual({ width: 280, height: 280 });
```

Invoke the captured decode callback with `v1.example` and assert the real `onScan` receives it once, duplicate suppression remains, and scanner cleanup runs when closed. Verify the button exposes a loading/active label and includes `gap-2`.

- [ ] **Step 2: Run scanner test and confirm RED**

Run:

```powershell
node ../../node_modules/vitest/vitest.mjs run test/qr-scanner-reliability.test.tsx
```

Expected: failures for numeric scan type, fixed QR box, missing state copy, or missing button/card treatment.

- [ ] **Step 3: Increase QR rendering clarity**

Generate a 384px source image and display it responsively up to 320px:

```ts
QRCode.toDataURL(value, { width: 384, margin: 2, errorCorrectionLevel: 'M' });
```

Use `w-full max-w-80 aspect-square` styling so the QR does not overflow small screens.

- [ ] **Step 4: Implement explicit responsive camera configuration**

Import `Html5QrcodeScanType` and use:

```ts
fps: 15,
qrbox: (width, height) => {
  const size = Math.max(180, Math.min(280, Math.floor(Math.min(width, height) * 0.7)));
  return { width: size, height: size };
},
supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
```

Set starting, active, error, and closed states at real lifecycle boundaries. Preserve local-only camera frames, duplicate suppression, continuous examiner scanning, non-continuous student closure, and cleanup.

- [ ] **Step 5: Run scanner tests and confirm GREEN**

Run the command from Step 2.

### Task 4: Make Clearance Generation Download and Print Reliably

**Files:**

- Modify: `apps/web/src/features/clearance/use-clearance.ts`
- Modify: `apps/web/src/features/clearance/clearance-page.tsx`
- Test: `apps/web/test/clearance-actions.test.tsx`

**Interfaces:**

- Keeps `downloadClearance(reportId, format)`.
- Reworks `printClearance(reportId)` to reserve a window synchronously.
- Course cards track the latest generated report ID for repeat Download PDF and Print PDF actions.

- [ ] **Step 1: Write failing clearance behavior tests**

Assert the Generate action calls the report mutation, then requests `/clearance/reports/{reportId}/pdf`, triggers a real anchor download, and renders Download PDF and Print PDF buttons on that course card.

For print, use a controlled pending API promise and assert `window.open('about:blank', '_blank')` is called before resolving the request. Reject the request and assert the reserved window's `close()` is called.

- [ ] **Step 2: Run clearance test and confirm RED**

Run:

```powershell
node ../../node_modules/vitest/vitest.mjs run test/clearance-actions.test.tsx
```

Expected: generation does not currently download, card actions do not exist, and print opens only after awaiting the request.

- [ ] **Step 3: Implement automatic PDF download**

Use `generate.mutateAsync(course.courseId)`, store `{ courseId, reportId }`, call `downloadClearance(reportId, 'pdf')`, then refresh the archive. Keep pending and error feedback scoped to the action.

- [ ] **Step 4: Implement popup-safe printing**

Open a blank tab synchronously, set `opener = null`, then fetch the blob. On success assign the blob URL to the reserved tab. On failure close it, revoke any created URL, and rethrow.

- [ ] **Step 5: Add repeat card actions and semantic eligibility values**

After generation, render compact Download PDF and Print PDF controls on that course card. Use the existing `Badge` with padded pill styling and `PercentageValue` for attendance. Apply green/rose/gold colors to Present, Absent, and Streak counts.

- [ ] **Step 6: Run clearance tests and confirm GREEN**

Run the command from Step 2.

### Task 5: Beautify Lecturer Courses Through Existing Shared Components

**Files:**

- Modify: `apps/web/src/features/academic/academic-management-page.tsx`
- Test: `apps/web/test/academic-course-presentation.test.tsx`

**Interfaces:**

- Reuses `IdentifierBadge`, `Badge`, `PercentageValue`, `DataTable.rowTone`, `dashboardFormControlClassName`, and Lucide icons.
- Preserves existing API endpoints, permissions, create flow, and lecturer-assignment mutation.

- [ ] **Step 1: Write failing course-presentation tests**

Render course rows and assert course code identifier badge, unit badge, semantic percentage, row tone, heading icon, and dark-safe lecturer select are present. Render departments and assert compatible code badge/row treatment.

- [ ] **Step 2: Run course test and confirm RED**

Run:

```powershell
node ../../node_modules/vitest/vitest.mjs run test/academic-course-presentation.test.tsx
```

- [ ] **Step 3: Implement the shared presentation**

Use blue/violet identifier badges for codes, a navy/gold compact badge for units, `PercentageValue` for requirements, and deterministic alternating row tones. Use `dashboardFormControlClassName` plus `h-9` for lecturer selects. Add a `BookOpenCheck` or `Building2` icon to the heading based on page type and a `Plus` icon to Create.

- [ ] **Step 4: Run course test and confirm GREEN**

Run the command from Step 2.

### Task 6: Apply Role-Specific Scanner, Manual-Code, Archive, and Result Treatments

**Files:**

- Modify: `apps/web/src/features/attendance/qr-scanner.tsx`
- Modify: `apps/web/src/features/portals/student-workspace-page.tsx`
- Modify: `apps/web/src/features/portals/examiner-workspace-page.tsx`
- Test: `apps/web/test/role-dashboard-treatments.test.tsx`

**Interfaces:**

- Adds optional `tone?: 'blue' | 'green'` to `QrScannerProps`, defaulting to blue.
- Reuses `dashboardFormControlClassName` and `PercentageValue`.

- [ ] **Step 1: Write failing role-treatment tests**

Verify student and examiner Open scanner buttons use a prominent colored variant and `gap-2`; scanner cards have explicit light/dark tone surfaces; manual-code card has a keypad icon and gold/navy treatment; archive-search card has a search icon, violet/navy treatment, and dark placeholder classes; examiner result percentages use semantic colors.

- [ ] **Step 2: Run role test and confirm RED**

Run:

```powershell
node ../../node_modules/vitest/vitest.mjs run test/role-dashboard-treatments.test.tsx
```

- [ ] **Step 3: Implement role-specific composition**

Use `Camera`, `Keyboard`, `Search`, and `ScanLine` icons from Lucide. Apply explicit borders/backgrounds for light and dark themes. Keep card text readable, buttons at least 44px high, and scanner icon/label spacing explicit.

- [ ] **Step 4: Run role test and confirm GREEN**

Run the command from Step 2.

### Task 7: Focused Integration Verification

**Files:**

- Verify all files modified in Tasks 1–6.
- Update API documentation only if the private static-token persistence changes documented internal behavior; the public contract must remain unchanged.

**Interfaces:**

- No new public API endpoints.
- Existing route and role contracts remain stable.

- [ ] **Step 1: Run all focused web tests**

```powershell
node ../../node_modules/vitest/vitest.mjs run test/dashboard-shared-primitives.test.tsx test/qr-scanner-reliability.test.tsx test/clearance-actions.test.tsx test/academic-course-presentation.test.tsx test/role-dashboard-treatments.test.tsx test/lecturer-qr-modes.test.tsx test/dashboard-colour-semantics.test.tsx
```

- [ ] **Step 2: Run the focused attendance API test**

```powershell
node ../../node_modules/tsx/dist/cli.mjs --conditions=development --import ./test/setup.ts --test test/attendance.test.ts
```

- [ ] **Step 3: Run affected package typechecks**

Run `tsc -b --pretty false` from `packages/ui`, `apps/api`, and `apps/web` using the root TypeScript executable.

- [ ] **Step 4: Run lint only on modified files**

Use `node node_modules/eslint/bin/eslint.js` with the exact modified production and test paths and `--max-warnings=0`.

- [ ] **Step 5: Browser-verify affected flows**

In the in-app browser:

1. Lecturer dark mode: open Start class attendance at desktop and small viewport; confirm bounded panel, body scroll, fixed action, Static and Rotating controls.
2. Create or inspect a safe local static session; confirm the displayed QR source does not change across two workspace polls.
3. Student: confirm scanner card/button/manual card styling and camera initialization; use a displayed QR or supported controlled scan to reach attendance preparation.
4. Student clearance: generate an eligible course report and confirm immediate PDF download plus repeat Download/Print actions.
5. Examiner dark mode: confirm scanner/search card styling, visible placeholder, and semantic verification percentages.
6. Lecturer Courses dark mode: confirm identifiers, row borders, percentages, select text, hover states, and non-white table surfaces.

- [ ] **Step 6: Re-read the acceptance criteria and report exact evidence**

Report focused test counts, typecheck/lint exit codes, browser states verified, and any environment limitation without claiming unverified behavior.
