# Student Check-in Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the student QR scanner and manual-entry cards rich complementary styling, show each check-in result inside its originating card, and display a compact verified success notification.

**Architecture:** Extend the existing `QrScanner` presentation boundary with an optional feedback slot. Keep attendance request origin and notification lifecycle in `StudentWorkspacePage`, passing the origin through React Query mutation variables so asynchronous responses cannot appear in the wrong card.

**Tech Stack:** React 19, TypeScript, TanStack Query, Tailwind CSS, Lucide React, Vitest, Testing Library.

## Global Constraints

- Preserve the existing attendance endpoints, credential formats, GPS checks, face-verification flow, and query invalidation.
- Use the established Attendity dashboard components and color tokens.
- Maintain readable light and dark mode contrast and keyboard-accessible controls.
- The verified notification dismisses after five seconds and includes a manual close button.
- Run only the tests and static checks related to this enhancement.
- This workspace is not a Git repository, so replace commit steps with local verification checkpoints.

---

### Task 1: Scanner feedback slot and premium card treatment

**Files:**

- Modify: `apps/web/test/qr-scanner-reliability.test.tsx`
- Modify: `apps/web/src/features/attendance/qr-scanner.tsx`

**Interfaces:**

- Consumes: existing `QrScannerProps` and `scannerToneClasses`.
- Produces: `QrScannerProps.feedback?: ReactNode`, rendered within the scanner card after camera/error content.

- [ ] **Step 1: Write the failing scanner-card test**

Add a test that renders real feedback through the public component API:

```tsx
it('renders attendance feedback inside the scanner card', () => {
  render(
    <QrScanner
      feedback={<p role="status">Attendance recorded successfully.</p>}
      onScan={() => undefined}
      tone="green"
    />,
  );

  const scanner = screen.getByRole('region', { name: 'Scan the live QR scanner' });
  expect(within(scanner).getByRole('status')).toHaveTextContent(
    'Attendance recorded successfully.',
  );
  expect(scanner).toHaveClass('from-emerald-50', 'dark:from-emerald-950');
});
```

- [ ] **Step 2: Run the scanner test and verify RED**

Run: `npm exec vitest -- run test/qr-scanner-reliability.test.tsx` from `apps/web`.

Expected: TypeScript/render failure because `QrScanner` does not accept `feedback`, proving the missing public behavior.

- [ ] **Step 3: Implement the feedback slot and card surfaces**

Import `ReactNode`, add `feedback?: ReactNode`, and render `{feedback}` as the final child of the existing card. Replace flat surfaces with restrained gradients while retaining explicit dark-mode classes:

```tsx
const scannerToneClasses = {
  blue: 'relative overflow-hidden border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-100 shadow-lg shadow-blue-950/5 dark:border-blue-800 dark:from-blue-950 dark:via-slate-950 dark:to-cyan-950',
  green:
    'relative overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-100 shadow-lg shadow-emerald-950/5 dark:border-emerald-800 dark:from-emerald-950 dark:via-slate-950 dark:to-teal-950',
} as const;
```

- [ ] **Step 4: Run the scanner test and verify GREEN**

Run: `npm exec vitest -- run test/qr-scanner-reliability.test.tsx` from `apps/web`.

Expected: all scanner reliability tests pass.

- [ ] **Step 5: Local checkpoint**

Confirm the scanner still opens, dispatches one distinct decoded credential, and cleans up its camera instance using the existing assertions.

---

### Task 2: Origin-aware student feedback and verified notification

**Files:**

- Create: `apps/web/test/student-check-in-feedback.test.tsx`
- Modify: `apps/web/src/features/portals/student-workspace-page.tsx`

**Interfaces:**

- Consumes: `QrScanner.feedback`, `apiClient.post`, `currentPosition`, and existing attendance credential types.
- Produces: `FeedbackSource = 'scanner' | 'manual'`, `CheckInFeedbackState`, an inline `CheckInFeedback` renderer, and an auto-dismissing verified notification.

- [ ] **Step 1: Write the failing manual-origin test**

Render the real student workspace with a student session and endpoint-specific API doubles. Submit the manual form, reject `/attendance/check-in/requirements`, and assert the error is inside the manual card but absent from the scanner card:

```tsx
fireEvent.change(screen.getByLabelText('Manual check-in code'), {
  target: { value: 'INVALID12' },
});
fireEvent.submit(screen.getByLabelText('Manual check-in code').closest('form')!);

const manualCard = screen.getByRole('region', { name: 'Manual check-in card' });
await within(manualCard).findByRole('alert');
expect(within(manualCard).getByRole('alert')).toHaveTextContent(
  'The attendance code could not be verified.',
);
expect(
  within(screen.getByRole('region', { name: 'Scan the live QR scanner' })).queryByRole('alert'),
).not.toBeInTheDocument();
```

- [ ] **Step 2: Write the failing scanner-success test**

Use the scanner library boundary only to deliver a decoded value, return no biometric or GPS requirement, then resolve the check-in request. Assert consumer-visible placement and notification behavior:

```tsx
fireEvent.click(screen.getByRole('button', { name: 'Open scanner' }));
await waitFor(() => expect(scanSuccess).toBeDefined());
scanSuccess?.('v1.encrypted-attendance-token');

const scannerCard = screen.getByRole('region', { name: 'Scan the live QR scanner' });
expect(await within(scannerCard).findByRole('status')).toHaveTextContent(
  'Attendance recorded successfully.',
);
expect(screen.getByRole('status', { name: 'Attendance verified' })).toBeInTheDocument();
```

- [ ] **Step 3: Run the student tests and verify RED**

Run: `npm exec vitest -- run test/student-check-in-feedback.test.tsx` from `apps/web`.

Expected: feedback remains in the current shared paragraph, so neither card-specific result nor verified notification can be found.

- [ ] **Step 4: Add origin-aware mutation variables**

Define the request state and carry `source` through both mutations:

```tsx
type FeedbackSource = 'scanner' | 'manual';
type FeedbackTone = 'success' | 'error' | 'info';

interface CheckInFeedbackState {
  readonly source: FeedbackSource;
  readonly message: string;
  readonly tone: FeedbackTone;
}
```

Change `prepare.mutate` calls to `{ credential, source }`. Include `source` in the pending face-verification value and the `checkIn` mutation variables. Use the mutation callback variable—not captured component state—to select the destination card for success, errors, and verification instructions.

- [ ] **Step 5: Add the inline feedback renderer**

Use `CircleAlert`, `CircleCheckBig`, and `ShieldCheck` to map error, success, and informational feedback to bold bordered panels. Success and informational panels use `role="status"`; errors use `role="alert"`. Render scanner feedback through `QrScanner.feedback` and manual feedback immediately before the manual form button.

- [ ] **Step 6: Add the verified success notification**

On successful `checkIn`, set a success-notification message and start a five-second effect timer:

```tsx
useEffect(() => {
  if (!successNotification) return undefined;
  const timer = window.setTimeout(() => setSuccessNotification(''), 5_000);
  return () => window.clearTimeout(timer);
}, [successNotification]);
```

Render a fixed bottom-right notification with `aria-label="Attendance verified"`, `role="status"`, a verified icon, bold heading, confirmation text, and an accessible close button. Use `inset-x-4 bottom-4 sm:left-auto sm:right-6 sm:max-w-sm` so it remains inside mobile viewports.

- [ ] **Step 7: Enrich both student card surfaces**

Pass `tone="green"` to `QrScanner`. Upgrade the manual card to an amber/gold gradient, stronger border, shadow, and dark-mode gradient while preserving its label and button contrast.

- [ ] **Step 8: Run the student and scanner tests and verify GREEN**

Run: `npm exec vitest -- run test/student-check-in-feedback.test.tsx test/qr-scanner-reliability.test.tsx test/role-dashboard-treatments.test.tsx` from `apps/web`.

Expected: all affected tests pass with no unhandled errors.

- [ ] **Step 9: Run focused static verification**

Run from the repository root:

```powershell
npm run typecheck -w @qr/web
npx eslint apps/web/src/features/attendance/qr-scanner.tsx apps/web/src/features/portals/student-workspace-page.tsx apps/web/test/qr-scanner-reliability.test.tsx apps/web/test/student-check-in-feedback.test.tsx apps/web/test/role-dashboard-treatments.test.tsx
npm exec prettier -- --check apps/web/src/features/attendance/qr-scanner.tsx apps/web/src/features/portals/student-workspace-page.tsx apps/web/test/qr-scanner-reliability.test.tsx apps/web/test/student-check-in-feedback.test.tsx apps/web/test/role-dashboard-treatments.test.tsx
```

Expected: TypeScript, ESLint, and Prettier exit successfully.

- [ ] **Step 10: Local completion checkpoint**

Confirm the delivered behavior against every section of `docs/superpowers/specs/2026-08-12-student-check-in-feedback-design.md`. No repository commit is possible until the workspace is initialized or restored as a Git repository.
