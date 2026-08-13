# Examiner Clearance Scanner Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make newly generated clearance PDFs pass live examiner integrity verification and show every scanner verification state inside the examiner scanner card.

**Architecture:** Canonicalize clearance statistics before signing so the hashed payload exactly matches the strict Mongoose schema representation. Centralize integrity and reuse decisions in pure helpers used by both generation and verification. Keep continuous QR capture in the shared scanner while rendering examiner-specific pending, verified, rejected, and request-error feedback through its existing `feedback` slot.

**Tech Stack:** TypeScript 5.9, Node.js, Express 5, Mongoose 8, React 19, TanStack Query, Vitest, Testing Library, `html5-qrcode`, PDFKit, Playwright with installed Chrome for artifact decoding.

## Global Constraints

- Do not weaken checksum or HMAC verification.
- Do not accept a printed clearance decision without a live valid server response.
- Do not rewrite an invalid historical report's checksum or signature.
- Do not expose stack traces, database errors, secrets, or internal identifiers in browser feedback.
- Preserve tenant isolation, examiner authorization, report transactions, and existing eligibility rules.
- Preserve continuous scanning and rapid duplicate-scan suppression.
- Limit tests to clearance integrity, examiner scanner feedback, and directly affected type checks.
- The workspace has no Git metadata, so commit steps are intentionally omitted.

---

## File Structure

- Modify `apps/api/src/services/clearance.service.ts`: own canonical snapshot statistics, integrity validation, and safe report-reuse decisions.
- Modify `apps/api/test/clearance.test.ts`: cover schema-stable signing and rejection of an integrity-invalid current report.
- Modify `apps/web/src/features/attendance/qr-scanner.tsx`: announce camera-active guidance inside every open scanner.
- Modify `apps/web/src/features/portals/examiner-workspace-page.tsx`: render server-verification feedback inside the clearance scanner card.
- Modify `apps/web/test/qr-scanner-reliability.test.tsx`: cover camera-active feedback.
- Create `apps/web/test/examiner-scanner-feedback.test.tsx`: cover examiner pending, verified, rejected, and sanitized-error feedback at the scanner boundary.

### Task 1: Canonical clearance integrity and reuse guard

**Files:**

- Modify: `apps/api/src/services/clearance.service.ts`
- Test: `apps/api/test/clearance.test.ts`

**Interfaces:**

- Produces: `snapshotStatistics(result: CourseEligibility): StoredSnapshot['statistics']`.
- Produces: `reportIntegrityMatches(report: ReportDocument): boolean`.
- Produces: `canReuseReport(report: ReportDocument, sourceDataHash: string): boolean`.
- Consumes: existing `checksum`, HMAC `sign`, `documentPayload`, `CourseEligibility`, and hydrated clearance report documents.

- [ ] **Step 1: Write the schema-stable signing test**

Add a test whose literal `CourseEligibility` includes helper properties that are intentionally absent from the persisted statistics schema. Call `snapshotStatistics`, build and sign a report payload, hydrate it through `ClearanceReportModel`, and assert:

```ts
assert.deepEqual(Object.keys(statistics).sort(), [
  'absent',
  'attendancePercentage',
  'attendanceScore',
  'calculatedAt',
  'currentStreak',
  'decision',
  'excused',
  'late',
  'present',
  'requiredPercentage',
  'sessionsHeld',
]);
assert.equal(reportIntegrityMatches(hydratedReport), true);
```

The expected key list is hand-derived from `clearance-report.model.ts`, not from the helper under test.

- [ ] **Step 2: Write the invalid-current-report reuse test**

Hydrate a report whose stored checksum was created from the pre-fix expanded statistics payload. Assert:

```ts
assert.equal(canReuseReport(invalidReport, invalidReport.sourceDataHash), false);
```

Also hydrate a canonically signed report with the same source-data hash and assert `true`. This catches removal of either the source-hash comparison or integrity guard.

- [ ] **Step 3: Run the focused API test and verify RED**

Run from `apps/api`:

```powershell
npx tsx --conditions=development --import ./test/setup.ts --test test/clearance.test.ts
```

Expected: the new tests fail because `snapshotStatistics`, `reportIntegrityMatches`, and `canReuseReport` are not implemented.

- [ ] **Step 4: Implement canonical statistics**

After `StoredSnapshot`, add:

```ts
export function snapshotStatistics(result: CourseEligibility): StoredSnapshot['statistics'] {
  return {
    sessionsHeld: result.sessionsHeld,
    present: result.present,
    late: result.late,
    absent: result.absent,
    excused: result.excused,
    attendancePercentage: result.attendancePercentage,
    requiredPercentage: result.requiredPercentage,
    attendanceScore: result.attendanceScore,
    currentStreak: result.currentStreak,
    decision: result.decision,
    calculatedAt: result.calculatedAt,
  };
}
```

Use `statistics: snapshotStatistics(result)` when constructing the report snapshot.

- [ ] **Step 5: Implement shared integrity and reuse decisions**

Add:

```ts
export function reportIntegrityMatches(report: ReportDocument): boolean {
  return (
    checksum(documentPayload(report)) === report.checksum &&
    signatureMatches(report.checksum, report.digitalSignature)
  );
}

export function canReuseReport(report: ReportDocument, sourceDataHash: string): boolean {
  return report.sourceDataHash === sourceDataHash && reportIntegrityMatches(report);
}
```

Replace the current source-hash-only reuse condition with `canReuseReport(current, sourceDataHash)`. Replace verification's duplicated checksum/signature condition with `reportIntegrityMatches(report)`.

- [ ] **Step 6: Run the focused API test and verify GREEN**

Run the Step 3 command. Expected: all clearance integrity and export tests pass with zero failures.

### Task 2: Scanner-local examiner feedback

**Files:**

- Modify: `apps/web/src/features/attendance/qr-scanner.tsx`
- Modify: `apps/web/src/features/portals/examiner-workspace-page.tsx`
- Modify: `apps/web/test/qr-scanner-reliability.test.tsx`
- Create: `apps/web/test/examiner-scanner-feedback.test.tsx`

**Interfaces:**

- Consumes: existing `QrScanner.feedback`, `useMutation`, `ClearanceVerification`, and `apiErrorMessage`.
- Produces: scanner-local accessible `status` or `alert` elements for camera-active, pending, verified, rejected, and request-error states.

- [ ] **Step 1: Add the failing camera-active guidance test**

Extend `qr-scanner-reliability.test.tsx`. Open the scanner, allow the mocked scanner module to initialize, and assert inside the scanner region:

```ts
expect(await within(scanner).findByRole('status')).toHaveTextContent(
  'Camera active. Hold the QR code steady inside the frame.',
);
```

- [ ] **Step 2: Add failing examiner feedback tests**

Create `examiner-scanner-feedback.test.tsx` with an examiner auth session, real `ExaminerWorkspacePage`, a QueryClient with retries disabled, a mocked `apiClient.get` boundary, and a scanner test double that calls its real `onScan` callback. Assert independently that:

```ts
expect(within(scanner).getByRole('status')).toHaveTextContent(
  'QR detected. Checking the live report',
);
expect(within(scanner).getByRole('status')).toHaveTextContent('Clearance verified');
expect(within(scanner).getByRole('alert')).toHaveTextContent('Clearance rejected');
expect(within(scanner).getByRole('alert')).toHaveTextContent(
  'The verification service is temporarily unavailable.',
);
```

Use complete `ClearanceVerification` fixtures for verified and rejected results. The error fixture must provide a sanitized API response message through the existing `apiErrorMessage` contract.

- [ ] **Step 3: Run the focused web tests and verify RED**

Run:

```powershell
npm test -w @qr/web -- --run test/qr-scanner-reliability.test.tsx test/examiner-scanner-feedback.test.tsx
```

Expected: failures show that camera-active and examiner mutation feedback are absent from the scanner card.

- [ ] **Step 4: Add camera-active guidance to the shared scanner**

In `QrScanner`, render the following only while `open && status === 'active' && !error`:

```tsx
<p
  className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
  role="status"
>
  Camera active. Hold the QR code steady inside the frame.
</p>
```

Use tone-aware green classes when `tone === 'green'` so the shared component remains visually coherent.

- [ ] **Step 5: Add examiner mutation feedback inside `QrScanner`**

Import `apiErrorMessage`. Derive feedback in this precedence order: pending, request error, first verified result, first rejected result, otherwise none. Pass the element through `QrScanner.feedback`.

Pending copy:

```text
QR detected. Checking the live report…
```

Verified copy begins `Clearance verified` and includes the report ID when present. Rejected copy begins `Clearance rejected` and includes the report warning or status. Error copy uses:

```ts
apiErrorMessage(
  verification.error,
  'The verification service could not complete this check. Please retry.',
);
```

Render pending/verified with `role="status"` and rejected/error with `role="alert"`. Keep the existing latest-result and history sections unchanged.

- [ ] **Step 6: Run the focused web tests and verify GREEN**

Run the Step 3 command. Expected: all scanner reliability and examiner feedback tests pass.

### Task 3: Replace the affected invalid report through normal workflows

**Files:**

- No source-file changes.
- Inspect: running API and local MongoDB clearance collections.

**Interfaces:**

- Consumes: seeded student and examiner credentials from `.env` without printing the password or access tokens.
- Produces: a versioned valid replacement clearance report generated by the existing API transaction.

- [ ] **Step 1: Confirm the API and replica set are ready**

Call `/api/v1/health/ready` and `db.hello()`. Require API status `ready`, replica set `rs0`, and `isWritablePrimary: true`.

- [ ] **Step 2: Generate through the authenticated student API**

Login as `student.001@demo.attendity.invalid`, request `/api/v1/clearance/eligibility`, select the eligible `CSC 405` course, and POST `/api/v1/clearance/reports`. Do not directly edit the invalid report. Expected: the transaction expires version 1 and creates version 2 because `canReuseReport` rejects version 1's integrity.

- [ ] **Step 3: Download and render the replacement PDF**

Download the new report's authenticated PDF to `tmp/pdfs/examiner-clearance/replacement.pdf`, verify `%PDF`, and render page 1 with the bundled Poppler executable into `tmp/pdfs/examiner-clearance/replacement-page-1.png`.

- [ ] **Step 4: Decode the rendered PDF QR with Attendity's decoder**

Use installed Chrome and `html5-qrcode` against the full rendered page. Require a decoded clearance verification URL and extract its final reference segment.

- [ ] **Step 5: Verify through the authenticated examiner API**

Login as `examiner@lmu.edu.ng` and query `/api/v1/clearance/examiner/search` with the decoded reference. Require exactly one matching result with `verified: true`, `status: 'valid'`, and the new report ID.

- [ ] **Step 6: Confirm versioned persistence**

Read only the affected course's clearance reports and archive events. Require version 1 to remain historical and non-valid, version 2 to be valid, and the generation/download events to exist.

### Task 4: Focused final verification

**Files:**

- Verify only the files and workflows listed above.

- [ ] **Step 1: Run affected API tests**

```powershell
Push-Location apps/api
npx tsx --conditions=development --import ./test/setup.ts --test test/clearance.test.ts
Pop-Location
```

Expected: zero failures.

- [ ] **Step 2: Run affected web tests**

```powershell
npm test -w @qr/web -- --run test/qr-scanner-reliability.test.tsx test/examiner-scanner-feedback.test.tsx test/role-dashboard-treatments.test.tsx
```

Expected: zero failures.

- [ ] **Step 3: Run affected workspace type checks**

```powershell
npm run typecheck -w @qr/api
npm run typecheck -w @qr/web
```

Expected: both commands exit successfully.

- [ ] **Step 4: Check formatting**

```powershell
npx prettier --check apps/api/src/services/clearance.service.ts apps/api/test/clearance.test.ts apps/web/src/features/attendance/qr-scanner.tsx apps/web/src/features/portals/examiner-workspace-page.tsx apps/web/test/qr-scanner-reliability.test.tsx apps/web/test/examiner-scanner-feedback.test.tsx docs/superpowers/specs/2026-08-12-examiner-clearance-scanner-integrity-design.md docs/superpowers/plans/2026-08-12-examiner-clearance-scanner-integrity.md
```

Expected: every listed file uses the configured format.

- [ ] **Step 5: Report evidence**

Report the new clearance report ID, decoded QR success, authenticated examiner `verified: true` response, historical/versioned report states, and focused test counts. Do not report secrets or access tokens.

### Task 5: Close completed examiner scans and announce outcomes

**Files:**

- Modify: `apps/web/src/features/attendance/qr-scanner.tsx`
- Modify: `apps/web/src/features/portals/examiner-workspace-page.tsx`
- Modify: `apps/web/test/examiner-scanner-feedback.test.tsx`
- Modify: `apps/web/test/role-dashboard-treatments.test.tsx`

**Interfaces:**

- Produces: optional `closeSignal?: number` on `QrScannerProps`; every changed numeric value closes the active scanner and invokes the existing cleanup path.
- Produces: examiner outcome popup state `{ tone: 'success' | 'error'; title: string; message: string }`.
- Consumes: the existing examiner verification mutation, scanner-local feedback, and shared QR scanner lifecycle.

- [ ] **Step 1: Add failing scanner-close and popup tests**

Extend `examiner-scanner-feedback.test.tsx` to assert that after verified, rejected, and request-error responses:

```ts
expect(within(scanner).getByRole('button', { name: 'Open scanner' })).toBeVisible();
expect(clearScanner).toHaveBeenCalled();
```

For verified response, require:

```ts
expect(screen.getByRole('status', { name: 'Clearance verified' })).toHaveTextContent(
  'ACL-20260812-A1B2C3D4E5',
);
```

For rejected and request-error responses, require an accessible popup alert with the corresponding safe message. Verify the manual close button removes the popup. Use fake timers in a separate verified test to prove it auto-dismisses after five seconds.

- [ ] **Step 2: Add the failing independent-card sizing test**

Extend `role-dashboard-treatments.test.tsx` to require `items-start` on the examiner grid and `self-start` on both the scanner region and Search the Archive card. The test must inspect rendered elements rather than source text.

- [ ] **Step 3: Run the focused tests and verify RED**

```powershell
npm test -w @qr/web -- --run test/examiner-scanner-feedback.test.tsx test/role-dashboard-treatments.test.tsx
```

Expected: failures identify the missing close signal, popup, and start alignment.

- [ ] **Step 4: Implement controlled scanner closure**

Add `closeSignal?: number` to `QrScannerProps`. Keep the latest signal in a ref and add an effect that calls `setOpen(false)` only when the supplied value changes after mount. Closing must use the existing scanner-effect cleanup so camera resources are cleared. Do not change the Student Scanner's close behavior.

In `ExaminerWorkspacePage`, increment a numeric close signal in the verification mutation's `onSettled` callback and pass it to `QrScanner`.

- [ ] **Step 5: Implement examiner outcome popup**

Create popup state from the completed verification result or sanitized request error. Render a fixed bottom-right notification matching the Student Scanner treatment, with `ShieldCheck` for verified and `ShieldX` or `CircleAlert` for failures. Include a button labelled `Dismiss verification notification`.

Use a `useEffect` timer to clear the popup after 5,000 milliseconds. Clear any existing popup when a fresh scan starts. Preserve scanner-card feedback after the scanner closes.

- [ ] **Step 6: Implement independent grid sizing**

Add `items-start` to the examiner two-column grid. Add `self-start` to the shared scanner card and Search the Archive card. Because the scanner is shared, `self-start` is safe and ensures every scanner sizes to its own content.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run the Step 3 command. Expected: all examiner scanner and dashboard-treatment tests pass.

- [ ] **Step 8: Run affected regression and static checks**

```powershell
npm test -w @qr/web -- --run test/qr-scanner-reliability.test.tsx test/examiner-scanner-feedback.test.tsx test/role-dashboard-treatments.test.tsx test/student-check-in-feedback.test.tsx
npm run typecheck -w @qr/web
npx prettier --check apps/web/src/features/attendance/qr-scanner.tsx apps/web/src/features/portals/examiner-workspace-page.tsx apps/web/test/examiner-scanner-feedback.test.tsx apps/web/test/role-dashboard-treatments.test.tsx docs/superpowers/specs/2026-08-12-examiner-clearance-scanner-integrity-design.md docs/superpowers/plans/2026-08-12-examiner-clearance-scanner-integrity.md
```

Expected: zero test failures, successful type checking, and clean formatting.
