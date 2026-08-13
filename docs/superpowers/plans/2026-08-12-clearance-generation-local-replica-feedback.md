# Clearance Generation and Course-Scoped Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable atomic clearance generation against the existing local MongoDB data and show generation/export feedback inside the exact student course card that initiated the action.

**Architecture:** Convert the installed local MongoDB service from standalone mode to a single-node replica set without changing its data directory, then initialise and verify a writable primary. Preserve the API's existing transaction-backed clearance repository. On the web client, separate archive feedback from course-card feedback using a course-ID-keyed state map and extract only sanitized API response messages.

**Tech Stack:** MongoDB Server and `mongosh`, Mongoose transactions, Express/TypeScript, React 19, TanStack Query, Axios, Vitest, Testing Library.

## Global Constraints

- Preserve the current local MongoDB data directory and all existing Attendity records.
- Do not reseed, delete, export/import, or reset the database.
- Keep the existing multi-document clearance transaction and unique-valid-report constraint.
- Do not add a non-transactional repository fallback.
- Never expose MongoDB errors, stack traces, or internal identifiers in UI feedback.
- Generation, download, and print feedback initiated from a course card must render inside that same course card.
- Archive actions retain archive-level feedback.
- Run only clearance-related tests and static checks.
- The workspace has no Git metadata, so commit steps are local verification checkpoints.

---

### Task 1: Convert local MongoDB to a single-node replica set

**Files:**

- Inspect: MongoDB Windows service executable path and configuration arguments
- Modify: the exact existing `mongod.cfg` referenced by the installed MongoDB Windows service
- Preserve: the exact existing `storage.dbPath`

**Interfaces:**

- Consumes: the installed MongoDB Windows service and its current configuration.
- Produces: a local replica set named `rs0` with the existing node as writable primary.

- [ ] **Step 1: Resolve and record the exact service configuration**

Run:

```powershell
Get-CimInstance Win32_Service -Filter "Name LIKE 'MongoDB%'" |
  Select-Object Name, State, StartMode, PathName
Get-CimInstance Win32_Process -Filter "Name = 'mongod.exe'" |
  Select-Object ProcessId, CommandLine
```

Expected: one installed MongoDB service or running `mongod` command line that identifies the active `--config` file. Read that configuration and record its existing `storage.dbPath`, `net.port`, and `net.bindIp` before editing.

- [ ] **Step 2: Back up the active configuration file**

Copy only the configuration file to a timestamped sibling path. Do not copy, move, or modify the database directory.

```powershell
Copy-Item -LiteralPath $mongoConfigPath -Destination "$mongoConfigPath.attendity-backup"
```

Expected: the original configuration and backup have identical hashes before modification.

- [ ] **Step 3: Add the replica-set setting without changing storage or networking**

Add this top-level YAML block to the active configuration when it is absent:

```yaml
replication:
  replSetName: rs0
```

Use `apply_patch` when the configuration is inside an editable workspace path; otherwise use a narrowly scoped PowerShell configuration update after confirming the exact absolute path. Preserve every existing setting byte-for-byte except the new replication block.

- [ ] **Step 4: Restart only the MongoDB service and initialise `rs0`**

Restart the resolved MongoDB service, wait until port `27017` accepts connections, then run:

```javascript
const hello = db.hello();
if (!hello.setName) {
  rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] });
}
```

Poll `db.hello()` until `setName === 'rs0'` and `isWritablePrimary === true`. Do not run `rs.reconfig()` when an existing replica-set configuration is already present.

- [ ] **Step 5: Verify existing Attendity data remains present**

Read the database name from `MONGODB_URI` without printing credentials, connect with `mongosh`, and compare representative collection counts before and after configuration. At minimum verify users, courses, course registrations, attendance sessions, and attendance records remain non-destructively accessible.

Expected: the same database and records are readable, and `db.hello()` reports `rs0` as writable primary.

---

### Task 2: Add course-scoped clearance feedback tests

**Files:**

- Modify: `apps/web/test/clearance-actions.test.tsx`

**Interfaces:**

- Consumes: `ClearancePage`, mocked eligibility/archive/generation endpoints, and the existing generated action buttons.
- Produces: regression coverage for `courseFeedback[courseId]` behavior and sanitized server messages.

- [ ] **Step 1: Write a failing per-card error test**

Render two eligible courses. Reject generation for `course-1` with an Axios-shaped response containing the safe message `Clearance report transaction could not be completed.` Click only the first course's generation button and assert:

```tsx
const cards = screen.getAllByTestId('clearance-course-card');
expect(within(cards[0]!).getByRole('alert')).toHaveTextContent(
  'Clearance report transaction could not be completed.',
);
expect(within(cards[1]!).queryByRole('alert')).toBeNull();
```

- [ ] **Step 2: Write a failing per-card success test**

Resolve generation for `course-2`, click its button, and assert only the second card contains the success status plus Download PDF and Print PDF controls. The first card must remain unchanged.

- [ ] **Step 3: Run RED verification**

Run from `apps/web`:

```powershell
npm exec vitest -- run test/clearance-actions.test.tsx
```

Expected: failures because feedback is still page-wide and course cards do not expose stable test regions.

---

### Task 3: Implement course-scoped feedback and safe API errors

**Files:**

- Modify: `apps/web/src/features/clearance/clearance-page.tsx`
- Reuse: `apps/web/src/features/auth/auth-utils.ts`
- Test: `apps/web/test/clearance-actions.test.tsx`

**Interfaces:**

- Consumes: `apiErrorMessage(error, fallback): string` and existing clearance hooks/export helpers.
- Produces: `courseFeedback: Record<string, { tone: 'success' | 'error'; message: string }>`.

- [ ] **Step 1: Split archive feedback from course feedback**

Replace the single `feedback` state with:

```tsx
interface CourseFeedback {
  readonly message: string;
  readonly tone: 'success' | 'error';
}

const [archiveFeedback, setArchiveFeedback] = useState('');
const [courseFeedback, setCourseFeedback] = useState<Record<string, CourseFeedback>>({});
```

Keep archive download/print/share messages in `archiveFeedback`.

- [ ] **Step 2: Add one keyed feedback updater**

Implement a small local helper:

```tsx
const updateCourseFeedback = (courseId: string, feedback?: CourseFeedback) => {
  setCourseFeedback((current) => {
    const next = { ...current };
    if (feedback) next[courseId] = feedback;
    else delete next[courseId];
    return next;
  });
};
```

This clears or replaces only the initiating course's feedback.

- [ ] **Step 3: Preserve generation errors and expose successful actions**

At generation start, clear only that course. On success, store its report ID and a success message. On failure, use:

```tsx
updateCourseFeedback(courseId, {
  tone: 'error',
  message: apiErrorMessage(error, 'Clearance could not be generated. Please retry.'),
});
```

Do not automatically download. Keep Download PDF and Print PDF visible after a successful report response.

- [ ] **Step 4: Route generated-card exports through the course ID**

Extend `exportReport` with an optional `courseId`. Generated-card Download PDF and Print PDF calls pass their course ID; archive actions omit it. Generated-card success/failure updates `courseFeedback[courseId]`; archive actions update `archiveFeedback`.

- [ ] **Step 5: Render feedback inside each eligibility card**

Add `data-testid="clearance-course-card"` to each course card and render beneath its actions:

```tsx
{
  courseFeedback[course.courseId] ? (
    <p
      className={
        courseFeedback[course.courseId]?.tone === 'success'
          ? 'mt-3 rounded-xl border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
          : 'mt-3 rounded-xl border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200'
      }
      role={courseFeedback[course.courseId]?.tone === 'error' ? 'alert' : 'status'}
    >
      {courseFeedback[course.courseId]?.message}
    </p>
  ) : null;
}
```

Remove the page-wide generation success/error messages so no course action reports outside its card.

- [ ] **Step 6: Run GREEN verification**

Run:

```powershell
npm exec vitest -- run test/clearance-actions.test.tsx
```

Expected: all course-scoped generation and export tests pass.

---

### Task 4: Verify real local clearance generation

**Files:**

- No application source changes expected
- Inspect: local API process and MongoDB collections

**Interfaces:**

- Consumes: the configured local replica set, existing demo/student credentials, and clearance API routes.
- Produces: evidence that the real transaction creates or reuses a valid signed report and its archive event.

- [ ] **Step 1: Confirm the API uses the configured local database**

Verify the running API listens on the configured port and its health endpoint reports database readiness. Restart the API only if it predates the MongoDB service restart or is disconnected.

- [ ] **Step 2: Identify an eligible demo student/course without exposing secrets**

Use read-only MongoDB queries or the eligibility endpoint with an existing demo credential to select one course whose decision is `eligible`. Do not alter attendance or registration data to force eligibility.

- [ ] **Step 3: Generate the real clearance through the API**

Authenticate as the selected student and POST the exact 24-character course ID to `/api/v1/clearance/reports`. Expected: HTTP `201`, a valid `ACL-YYYYMMDD-XXXXXXXXXX` report ID, and no transaction error.

- [ ] **Step 4: Verify report and archive persistence**

Read-only queries must confirm one valid report for the selected student/course and a matching `generated` report archive event. Do not print signature, verification code, token hash, password hash, or JWT secrets.

---

### Task 5: Focused final verification

**Files:**

- Verify: `apps/web/src/features/clearance/clearance-page.tsx`
- Verify: `apps/web/test/clearance-actions.test.tsx`
- Verify: local MongoDB replica-set state

**Interfaces:**

- Consumes: completed Tasks 1-4.
- Produces: final evidence for database topology, UI behavior, typing, lint, and formatting.

- [ ] **Step 1: Run focused clearance tests**

```powershell
cd apps/web
npm exec vitest -- run test/clearance-actions.test.tsx test/role-dashboard-treatments.test.tsx
```

Expected: all tests pass with no unhandled errors.

- [ ] **Step 2: Run API clearance tests**

Use the API package's existing test script or its Node test runner command targeted at `test/clearance.test.ts`. Expected: eligibility, validation, integrity, PDF, Excel, and CSV tests pass.

- [ ] **Step 3: Run static checks**

```powershell
npm run typecheck -w @qr/api
npm run typecheck -w @qr/web
npx eslint apps/web/src/features/clearance/clearance-page.tsx apps/web/test/clearance-actions.test.tsx --max-warnings=0
npx prettier --check apps/web/src/features/clearance/clearance-page.tsx apps/web/test/clearance-actions.test.tsx docs/superpowers/specs/2026-08-12-clearance-generation-local-replica-feedback-design.md docs/superpowers/plans/2026-08-12-clearance-generation-local-replica-feedback.md
```

Expected: both builds, lint, and formatting checks exit successfully.

- [ ] **Step 4: Reconfirm replica-set health**

Run `db.hello()` through `mongosh` and confirm `setName: 'rs0'` and `isWritablePrimary: true` before reporting completion.

- [ ] **Step 5: Local completion checkpoint**

Compare the implementation with the approved specification. Report the MongoDB configuration backup path, confirm data preservation, describe the per-card feedback behavior, and note that no Git integration was available.
