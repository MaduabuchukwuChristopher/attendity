# Attendity Role Profiles, Dashboard, and Demo Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver secure lecturer provisioning, role-specific profiles, curriculum-aware registrations, richer role dashboards, period-aware analytics, and deterministic university demonstration data without regressing Attendity's working attendance and clearance flows.

**Architecture:** Extend the existing Express/Mongoose tenant-aware API with focused invitation, profile, curriculum, and lecturer-assignment services. Keep `User` as the authentication identity and `CourseRegistration` as attendance authorization, then compose role-specific React pages through the existing router, query client, shared UI package, and RBAC permissions.

**Tech Stack:** React 19, TypeScript 5.9, React Router, TanStack Query, Tailwind CSS 4, Express 5, Mongoose 8, Zod 4, Node test runner, Vitest, MongoDB.

## Global Constraints

- Preserve the established monorepo: `apps/landing`, `apps/web`, `apps/api`, and shared packages.
- Preserve existing authentication, attendance, QR, GPS, face verification, events, clearance, reports, notifications, and audit history.
- Enforce university tenant isolation and role permissions at every API boundary.
- Public registration creates student accounts only; privileged accounts require administrator-issued invitations.
- Use strong TypeScript types and existing UI, API, service, repository, validation, and audit patterns.
- Use institutional navy, Attendity green, restrained academic gold, and solid layered surfaces; do not use gradients.
- Meet WCAG 2.2 AA-oriented contrast, keyboard, focus, labelling, touch-target, responsive, and reduced-motion expectations.
- Generate approximately 240 fictional students and 18 fictional lecturers, never more than 1,000 students or 100 lecturers.
- Run only focused affected tests, changed-workspace type checks, and targeted linting.
- The current workspace has no `.git` directory. Preserve the commit commands below for execution after repository association is restored; do not initialize a new repository without user authorization.

---

## File Responsibility Map

### Shared contracts

- `packages/types/src/index.ts`: public invitation, profile, curriculum, assignment, dashboard, and analytics period contracts.
- `packages/shared/src/index.ts`: supported staff invitation roles and reusable role labels.

### API domain

- `apps/api/src/models/staff-invitation.model.ts`: expiring single-use staff invitation persistence.
- `apps/api/src/models/student-profile.model.ts`: student academic identity.
- `apps/api/src/models/lecturer-profile.model.ts`: lecturer professional identity.
- `apps/api/src/models/curriculum-mapping.model.ts`: course applicability by programme, level, and period.
- `apps/api/src/models/lecturer-assignment.model.ts`: lecturer teaching responsibility by period.
- `apps/api/src/validators/invitation.validator.ts`: invitation request and acceptance validation.
- `apps/api/src/validators/profile.validator.ts`: role-specific profile validation.
- `apps/api/src/validators/curriculum.validator.ts`: curriculum and assignment validation.
- `apps/api/src/services/invitation.service.ts`: secure invitation lifecycle.
- `apps/api/src/services/profile.service.ts`: self-service profile read/update and academic hierarchy validation.
- `apps/api/src/services/curriculum.service.ts`: curriculum reconciliation and borrowed-course lifecycle.
- `apps/api/src/services/lecturer-assignment.service.ts`: teaching assignment lifecycle and authorization lookup.
- Existing controllers/routes expose these services through `/api/v1/auth`, `/api/v1/users`, `/api/v1/profiles`, `/api/v1/academic`, and `/api/v1/registrations`.

### Web application

- `apps/web/src/layouts/dashboard-nav-config.ts`: role/permission-aware navigation configuration.
- `apps/web/src/layouts/dashboard-sidebar.tsx`: desktop and mobile navigation presentation.
- `apps/web/src/layouts/dashboard-topbar.tsx`: breadcrumb, actions, theme, and account controls.
- `apps/web/src/layouts/dashboard-layout.tsx`: shell state and composition only.
- `apps/web/src/features/profiles/profile-page.tsx`: role-aware profile entry point.
- `apps/web/src/features/profiles/student-profile-form.tsx`: student academic profile and curriculum preview.
- `apps/web/src/features/profiles/lecturer-profile-form.tsx`: lecturer professional profile and assignments.
- `apps/web/src/features/users/staff-invitation-dialog.tsx`: administrator staff invitation UI.
- `apps/web/src/features/academic/curriculum-management-page.tsx`: curriculum mapping management.
- Existing portal and analytics pages consume the expanded summaries and period query.

---

### Task 1: Fix dashboard button contrast and decompose navigation

**Files:**

- Create: `apps/web/src/layouts/dashboard-nav-config.ts`
- Create: `apps/web/src/layouts/dashboard-sidebar.tsx`
- Create: `apps/web/src/layouts/dashboard-topbar.tsx`
- Modify: `apps/web/src/layouts/dashboard-layout.tsx`
- Modify: `apps/web/src/styles/index.css`
- Modify: `packages/ui/src/components/button.tsx`
- Test: `apps/web/test/dashboard-navigation.test.tsx`
- Test: `apps/web/test/button-contrast.test.ts`

**Interfaces:**

- Produces: `buildDashboardNavigation(user: AuthenticatedUser, permissions: readonly Permission[], terminology?: InstitutionTerminology): readonly DashboardNavGroup[]`.
- Produces: `DashboardSidebar` and `DashboardTopbar` components consumed by `DashboardLayout`.

- [ ] **Step 1: Write failing contrast and navigation tests**

```ts
expect(buttonClassName('primary')).toContain('dark:text-white');
expect(buttonClassName('secondary')).toContain('dark:bg-dark-surface');
expect(
  buildDashboardNavigation(admin, ROLE_PERMISSIONS.university_admin)
    .flatMap((g) => g.items)
    .map((i) => i.label),
).toContain('Invite staff');
expect(
  buildDashboardNavigation(student, ROLE_PERMISSIONS.student)
    .flatMap((g) => g.items)
    .map((i) => i.label),
).toContain('My profile');
```

- [ ] **Step 2: Run the focused tests and confirm the intended failures**

Run: `npm exec -w @qr/web -- vitest run test/dashboard-navigation.test.tsx test/button-contrast.test.ts`

Expected: FAIL because the navigation builder does not exist and primary/secondary variants do not yet expose explicit dark-state tokens.

- [ ] **Step 3: Implement explicit button states and navigation configuration**

```ts
const variantClasses = {
  primary:
    'bg-primary text-white dark:text-white hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-700',
  secondary:
    'border border-border bg-surface text-slate-900 dark:border-slate-700 dark:bg-dark-surface dark:text-slate-100',
  outline: 'border-2 border-primary text-primary dark:border-emerald-400 dark:text-emerald-300',
} as const;
```

Move role path calculation and grouped navigation into `dashboard-nav-config.ts`. Keep permission filtering in the builder and add `My profile`, `Security`, and administrator-only `Invite staff` destinations.

- [ ] **Step 4: Compose the sidebar and topbar without changing protected-route behaviour**

```tsx
<DashboardSidebar groups={groups} institutionName={institutionName} open={open} onClose={close} user={user} />
<DashboardTopbar onMenu={() => setOpen(true)} user={user} />
<main id="main-content" tabIndex={-1}>{children}</main>
```

Add solid navy/green/gold tokens, sidebar collapse styles, mobile drawer sizing, and reduced-motion fallbacks in `apps/web/src/styles/index.css`.

- [ ] **Step 5: Run focused verification**

Run: `npm exec -w @qr/web -- vitest run test/dashboard-navigation.test.tsx test/button-contrast.test.ts && npm run typecheck -w @qr/web`

Expected: PASS.

- [ ] **Step 6: Record the intended commit**

```bash
git add apps/web/src/layouts apps/web/src/styles/index.css packages/ui/src/components/button.tsx apps/web/test
git commit -m "feat(web): enrich role-aware dashboard navigation"
```

### Task 2: Add profile, invitation, curriculum, and assignment contracts/models

**Files:**

- Modify: `packages/types/src/index.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `apps/api/src/models/staff-invitation.model.ts`
- Create: `apps/api/src/models/student-profile.model.ts`
- Create: `apps/api/src/models/lecturer-profile.model.ts`
- Create: `apps/api/src/models/curriculum-mapping.model.ts`
- Create: `apps/api/src/models/lecturer-assignment.model.ts`
- Modify: `apps/api/src/models/course-registration.model.ts`
- Test: `apps/api/test/profile-domain.test.ts`

**Interfaces:**

- Produces: `StudentProfile`, `LecturerProfile`, `StaffInvitationSummary`, `CurriculumMappingSummary`, `LecturerAssignmentSummary`, `RegistrationSource`, and `CourseRegistrationStatus`.

- [ ] **Step 1: Write failing model invariant tests**

```ts
assert.equal(STAFF_INVITABLE_ROLES.includes('student'), false);
assert.equal(STAFF_INVITABLE_ROLES.includes('lecturer'), true);
assert.equal(COURSE_REGISTRATION_STATUSES.includes('rejected'), true);
assert.equal(COURSE_REGISTRATION_SOURCES.includes('borrowed'), true);
```

- [ ] **Step 2: Run the model test and confirm missing contracts**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/profile-domain.test.ts`

Expected: FAIL because the exported constants and models do not exist.

- [ ] **Step 3: Define exact shared contracts**

```ts
export type StaffInvitableRole =
  'university_admin' | 'faculty_admin' | 'department_admin' | 'lecturer' | 'examiner' | 'viewer';
export type CourseRegistrationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';
export type RegistrationSource = 'core' | 'elective' | 'borrowed' | 'administrator';
export type AcademicPeriodPreset = 'daily' | 'weekly' | 'monthly' | 'semester' | 'custom';
```

Define read contracts with string IDs and ISO timestamps. Profiles expose `completionPercentage` and `missingFields`; invitations never expose token hashes.

- [ ] **Step 4: Implement tenant-audited models and indexes**

```ts
staffInvitationSchema.index({ universityId: 1, email: 1, status: 1 });
studentProfileSchema.index({ universityId: 1, userId: 1 }, { unique: true });
studentProfileSchema.index({ universityId: 1, matricNumber: 1 }, { unique: true });
curriculumMappingSchema.index(
  { universityId: 1, courseId: 1, programmeId: 1, levelId: 1, termId: 1 },
  { unique: true },
);
lecturerAssignmentSchema.index(
  { universityId: 1, lecturerId: 1, courseId: 1, termId: 1 },
  { unique: true },
);
```

Extend registrations with `source`, `requestedReason`, `reviewedBy`, `reviewedAt`, and `reviewNote`; preserve `pending`, `approved`, and `withdrawn` compatibility.

- [ ] **Step 5: Run focused model and type verification**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/profile-domain.test.ts && npm run typecheck -w @qr/api && npm run build -w @qr/types && npm run build -w @qr/shared`

Expected: PASS.

- [ ] **Step 6: Record the intended commit**

```bash
git add packages/types/src/index.ts packages/shared/src/index.ts apps/api/src/models apps/api/test/profile-domain.test.ts
git commit -m "feat(api): add role profile and curriculum domain models"
```

### Task 3: Implement secure staff invitations and role activation

**Files:**

- Create: `apps/api/src/validators/invitation.validator.ts`
- Create: `apps/api/src/services/invitation.service.ts`
- Modify: `apps/api/src/controllers/user.controller.ts`
- Modify: `apps/api/src/controllers/auth.controller.ts`
- Modify: `apps/api/src/routes/user.route.ts`
- Modify: `apps/api/src/routes/auth.route.ts`
- Modify: `apps/api/src/services/email.service.ts`
- Modify: `apps/api/src/docs/openapi.ts`
- Test: `apps/api/test/staff-invitations.test.ts`

**Interfaces:**

- Produces: `InvitationService.create(actor, input)`, `list(actor)`, `revoke(actor, id)`, `inspect(token)`, and `accept(input)`.
- HTTP: `POST/GET /api/v1/users/invitations`, `POST /api/v1/users/invitations/:id/revoke`, `GET /api/v1/auth/invitations/:token`, and `POST /api/v1/auth/invitations/accept`.

- [ ] **Step 1: Write failing authorization and lifecycle tests**

```ts
assert.equal(
  createInvitationSchema.safeParse({ body: { email: 'lecturer@uni.edu', role: 'lecturer' } })
    .success,
  true,
);
assert.equal(
  createInvitationSchema.safeParse({ body: { email: 'student@uni.edu', role: 'student' } }).success,
  false,
);
await assert.rejects(
  () => invitationService.accept({ token: expiredToken, password: strongPassword }),
  hasStatus(410),
);
await assert.rejects(
  () => invitationService.accept({ token: acceptedToken, password: strongPassword }),
  hasStatus(409),
);
```

- [ ] **Step 2: Run the invitation test and confirm failures**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/staff-invitations.test.ts`

Expected: FAIL because invitation validation and service endpoints are absent.

- [ ] **Step 3: Implement the secure invitation lifecycle**

```ts
const token = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(token).digest('hex');
const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
```

Allow only `super_admin` and `university_admin` to invite privileged staff in the same tenant. Permit scoped roles only when their granted scope is within the inviter's scope. On acceptance, transactionally create or activate the user, create the lecturer profile when required, mark the invitation accepted, send confirmation, and audit both creation and acceptance.

- [ ] **Step 4: Add rate-limited public acceptance routes and OpenAPI records**

Use the existing auth limiter and password rules. Return invitation email, role, institution name, and expiry from inspection; never return `tokenHash`.

- [ ] **Step 5: Run focused invitation verification**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/staff-invitations.test.ts test/auth-validator.test.ts && npm run typecheck -w @qr/api`

Expected: PASS.

- [ ] **Step 6: Record the intended commit**

```bash
git add apps/api/src/validators/invitation.validator.ts apps/api/src/services/invitation.service.ts apps/api/src/controllers apps/api/src/routes apps/api/src/services/email.service.ts apps/api/src/docs/openapi.ts apps/api/test/staff-invitations.test.ts
git commit -m "feat(auth): add administrator-issued staff invitations"
```

### Task 4: Implement institution matriculation rules and self-service profiles

**Files:**

- Modify: `packages/types/src/index.ts`
- Modify: `apps/api/src/models/system-settings.model.ts`
- Modify: `apps/api/src/validators/settings.validator.ts`
- Modify: `apps/api/src/services/settings.service.ts`
- Create: `apps/api/src/validators/profile.validator.ts`
- Create: `apps/api/src/services/profile.service.ts`
- Create: `apps/api/src/controllers/profile.controller.ts`
- Create: `apps/api/src/routes/profile.route.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/profiles.test.ts`
- Test: `apps/api/test/institution-settings.test.ts`

**Interfaces:**

- Produces: `ProfileService.mine(actor)`, `updateStudent(actor, input)`, and `updateLecturer(actor, input)`.
- HTTP: `GET /api/v1/profiles/me`, `PATCH /api/v1/profiles/student`, and `PATCH /api/v1/profiles/lecturer`.
- Adds settings fields: `studentIdentifierExample`, `studentIdentifierPattern`, and `studentIdentifierGuidance`.

- [ ] **Step 1: Write failing settings and profile validation tests**

```ts
const settings = updateSettingsSchema.safeParse({
  body: {
    studentIdentifierLabel: 'Matriculation number',
    studentIdentifierExample: 'LMU/CSC/2026/001',
    studentIdentifierPattern: '^LMU/[A-Z]{3}/\\d{4}/\\d{3}$',
    studentIdentifierGuidance: 'Use the identifier issued by Registry.',
  },
});
assert.equal(settings.success, true);
assert.equal(validateStudentIdentifier('LMU/CSC/2026/001', settingsPattern), true);
assert.equal(validateStudentIdentifier('invalid', settingsPattern), false);
```

- [ ] **Step 2: Run the focused tests and confirm failures**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/profiles.test.ts test/institution-settings.test.ts`

Expected: FAIL because matriculation rules and profile service are absent.

- [ ] **Step 3: Add safely bounded matriculation configuration**

Limit the pattern to 200 characters, compile it in a guarded helper, reject invalid expressions, and apply case-insensitive matching to a normalized value. Add defaults that accept the existing seed format without forcing a single institution convention.

- [ ] **Step 4: Implement hierarchical profile updates**

```ts
async updateStudent(actor: RequestActor, input: UpdateStudentProfileInput): Promise<StudentProfile>;
async updateLecturer(actor: RequestActor, input: UpdateLecturerProfileInput): Promise<LecturerProfile>;
```

Verify the selected campus -> faculty -> programme -> level chain through `InstitutionStructureModel` and verify the department belongs to the selected faculty. Enforce role ownership, tenant identity, matriculation uniqueness, secure photo URLs from institution-owned media assets, audit logging, and explicit completion fields.

- [ ] **Step 5: Run focused profile verification**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/profiles.test.ts test/institution-settings.test.ts && npm run typecheck -w @qr/api`

Expected: PASS.

- [ ] **Step 6: Record the intended commit**

```bash
git add packages/types/src/index.ts apps/api/src/models/system-settings.model.ts apps/api/src/validators apps/api/src/services apps/api/src/controllers/profile.controller.ts apps/api/src/routes/profile.route.ts apps/api/src/app.ts apps/api/test
git commit -m "feat(profiles): add institution-aware student and lecturer profiles"
```

### Task 5: Add curriculum mappings and registration reconciliation

**Files:**

- Create: `apps/api/src/validators/curriculum.validator.ts`
- Create: `apps/api/src/services/curriculum.service.ts`
- Modify: `apps/api/src/services/academic.service.ts`
- Modify: `apps/api/src/controllers/academic.controller.ts`
- Modify: `apps/api/src/routes/academic.route.ts`
- Modify: `apps/api/src/services/registration.service.ts`
- Modify: `apps/api/src/controllers/registration.controller.ts`
- Modify: `apps/api/src/routes/registration.route.ts`
- Modify: `apps/api/src/validators/registration.validator.ts`
- Test: `apps/api/test/curriculum.test.ts`
- Test: `apps/api/test/registration.test.ts`

**Interfaces:**

- Produces: `CurriculumService.list`, `create`, `update`, `deactivate`, `recommendForStudent`, and `reconcileCoreRegistrations`.
- HTTP: CRUD under `/api/v1/academic/curriculum`, `GET /api/v1/registrations/recommendations`, and borrowed-course request endpoints under `/api/v1/registrations/borrowed`.

- [ ] **Step 1: Write failing reconciliation and borrowed-course tests**

```ts
const first = await curriculumService.reconcileCoreRegistrations(studentActor);
const second = await curriculumService.reconcileCoreRegistrations(studentActor);
assert.equal(first.approvedCoreCourseIds.length, second.approvedCoreCourseIds.length);
assert.equal(
  await registrationsFor(studentActor.id, 'core').count(),
  first.approvedCoreCourseIds.length,
);
await assert.rejects(
  () => requestBorrowedCourse(studentActor, assignedCoreCourseId),
  hasStatus(409),
);
```

- [ ] **Step 2: Run focused curriculum tests and confirm failures**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/curriculum.test.ts test/registration.test.ts`

Expected: FAIL because mappings, recommendations, and borrowed requests are absent.

- [ ] **Step 3: Implement administrator curriculum CRUD**

Validate active course, programme, level, and term references in the same tenant. Store classification as `core` or `elective`, use soft deactivation, and audit every mutation.

- [ ] **Step 4: Implement idempotent student reconciliation and request lifecycle**

```ts
type BorrowedCourseAction = 'submit' | 'update' | 'withdraw' | 'approve' | 'reject' | 'resubmit';
```

Core mappings create approved `source: 'core'` registrations with deterministic registration references. Elective selections create pending or approved records according to institution policy. Borrowed requests remain pending until an authorised review. Profile changes mark incompatible active registrations for review without deleting attendance-bearing records.

- [ ] **Step 5: Run focused registration verification**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/curriculum.test.ts test/registration.test.ts test/attendance.test.ts && npm run typecheck -w @qr/api`

Expected: PASS, including the existing rule that only approved course registrations permit attendance.

- [ ] **Step 6: Record the intended commit**

```bash
git add apps/api/src/validators apps/api/src/services apps/api/src/controllers apps/api/src/routes apps/api/test/curriculum.test.ts apps/api/test/registration.test.ts
git commit -m "feat(academic): add curriculum-aware course registrations"
```

### Task 6: Add academic-period lecturer assignments

**Files:**

- Create: `apps/api/src/services/lecturer-assignment.service.ts`
- Modify: `apps/api/src/validators/curriculum.validator.ts`
- Modify: `apps/api/src/controllers/academic.controller.ts`
- Modify: `apps/api/src/routes/academic.route.ts`
- Modify: `apps/api/src/services/attendance.service.ts`
- Modify: `apps/api/src/services/schedule.service.ts`
- Modify: `apps/api/src/repositories/analytics.repository.ts`
- Test: `apps/api/test/lecturer-assignments.test.ts`
- Test: `apps/api/test/attendance.test.ts`

**Interfaces:**

- Produces: `LecturerAssignmentService.assign`, `list`, `deactivate`, and `activeCourseIds(actor, at)`.
- HTTP: `GET/POST /api/v1/academic/lecturer-assignments` and `PATCH /api/v1/academic/lecturer-assignments/:id/deactivate`.

- [ ] **Step 1: Write failing assignment authorization tests**

```ts
assert.deepEqual(await assignmentService.activeCourseIds(lecturerActor, termStart), [courseId]);
await assert.rejects(
  () => attendanceService.openSession(unassignedLecturer, sessionInput),
  hasStatus(403),
);
await assert.doesNotReject(() => attendanceService.openSession(assignedLecturer, sessionInput));
```

- [ ] **Step 2: Run focused assignment tests and confirm failures**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/lecturer-assignments.test.ts test/attendance.test.ts`

Expected: FAIL because attendance still resolves only `Course.lecturerId`.

- [ ] **Step 3: Implement assignment lifecycle and compatibility lookup**

Resolve active assignments first and accept the legacy `Course.lecturerId` only when no period assignment exists for that course. Enforce lecturer role, active account, tenant identity, valid term dates, and audit mutations.

- [ ] **Step 4: Replace lecturer course filters in attendance, schedules, and analytics**

Use `activeCourseIds(actor, referenceDate)` in each service rather than duplicating assignment queries.

- [ ] **Step 5: Run focused authorization verification**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/lecturer-assignments.test.ts test/attendance.test.ts test/analytics.test.ts test/reminders.test.ts && npm run typecheck -w @qr/api`

Expected: PASS.

- [ ] **Step 6: Record the intended commit**

```bash
git add apps/api/src/services/lecturer-assignment.service.ts apps/api/src/services/attendance.service.ts apps/api/src/services/schedule.service.ts apps/api/src/repositories/analytics.repository.ts apps/api/src/controllers/academic.controller.ts apps/api/src/routes/academic.route.ts apps/api/test
git commit -m "feat(academic): scope lecturer access by teaching assignment"
```

### Task 7: Build invitation, profile, curriculum, and registration interfaces

**Files:**

- Create: `apps/web/src/features/auth/accept-invitation-page.tsx`
- Create: `apps/web/src/features/users/staff-invitation-dialog.tsx`
- Create: `apps/web/src/features/profiles/use-profile.ts`
- Create: `apps/web/src/features/profiles/profile-page.tsx`
- Create: `apps/web/src/features/profiles/student-profile-form.tsx`
- Create: `apps/web/src/features/profiles/lecturer-profile-form.tsx`
- Create: `apps/web/src/features/academic/curriculum-management-page.tsx`
- Modify: `apps/web/src/features/users/user-management-page.tsx`
- Modify: `apps/web/src/features/registrations/registration-management-page.tsx`
- Modify: `apps/web/src/features/settings/settings-page.tsx`
- Modify: `apps/web/src/features/auth/login-page.tsx`
- Modify: `apps/web/src/routes/router.tsx`
- Test: `apps/web/test/profile-flows.test.tsx`
- Test: `apps/web/test/staff-invitation.test.tsx`

**Interfaces:**

- Consumes: invitation, profile, curriculum, and registration HTTP contracts from Tasks 3–6.
- Produces: `/accept-invitation`, `/app/profile`, and `/app/curriculum` routes.

- [ ] **Step 1: Write failing role-flow interface tests**

```tsx
expect(screen.getByText('Student registration')).toBeVisible();
expect(screen.getByText(/staff accounts are created by invitation/i)).toBeVisible();
expect(await screen.findByLabelText('Matriculation number')).toHaveAttribute(
  'placeholder',
  'LMU/CSC/2026/001',
);
expect(screen.getByRole('button', { name: 'Invite lecturer' })).toBeVisible();
```

- [ ] **Step 2: Run focused UI tests and confirm failures**

Run: `npm exec -w @qr/web -- vitest run test/profile-flows.test.tsx test/staff-invitation.test.tsx`

Expected: FAIL because the pages and controls do not exist.

- [ ] **Step 3: Build secure invitation acceptance and administrator invitation UI**

Use existing `AuthLayout`, `Input`, `Button`, `Dialog`, mutation error handling, password requirements, and query invalidation. Explain that all roles use one login and are redirected automatically.

- [ ] **Step 4: Build role-specific profile forms**

Student academic selectors load child choices only after the parent is selected. Show identifier label, example, and guidance from settings. Preview core/elective registrations before saving and show borrowed-course state controls. Lecturer fields remain editable while teaching assignments remain read-only.

- [ ] **Step 5: Build curriculum management and borrowed-course review**

Use searchable accessible tables and dialogs, not a raw CRUD layout. Include programme, level, term, classification, course, state, and audit-facing timestamps. Reuse current academic and registration components where possible.

- [ ] **Step 6: Run focused interface verification**

Run: `npm exec -w @qr/web -- vitest run test/profile-flows.test.tsx test/staff-invitation.test.tsx test/auth-presentation.test.tsx test/route-access.test.tsx && npm run typecheck -w @qr/web`

Expected: PASS.

- [ ] **Step 7: Record the intended commit**

```bash
git add apps/web/src/features apps/web/src/routes/router.tsx apps/web/test
git commit -m "feat(web): add staff onboarding and role profile management"
```

### Task 8: Add period-aware dashboard summaries and richer role dashboards

**Files:**

- Modify: `packages/types/src/index.ts`
- Modify: `apps/api/src/validators/analytics.validator.ts`
- Modify: `apps/api/src/services/analytics.service.ts`
- Modify: `apps/api/src/controllers/analytics.controller.ts`
- Modify: `apps/api/src/services/portal.service.ts`
- Modify: `apps/api/src/controllers/portal.controller.ts`
- Modify: `apps/web/src/features/analytics/use-analytics.ts`
- Modify: `apps/web/src/features/analytics/analytics-dashboard-page.tsx`
- Modify: `apps/web/src/features/analytics/lecturer-insights-panel.tsx`
- Modify: `apps/web/src/features/portals/portal-page.tsx`
- Modify: `apps/web/src/features/portals/lecturer-workspace-page.tsx`
- Modify: `apps/web/src/features/portals/student-workspace-page.tsx`
- Test: `apps/api/test/analytics-periods.test.ts`
- Test: `apps/web/test/dashboard-periods.test.tsx`

**Interfaces:**

- Produces: `resolveAnalyticsPeriod(settings, query, now): { from: Date; to: Date; preset: AcademicPeriodPreset }`.
- Extends `GET /api/v1/analytics/overview` with `period`, `from`, and `to`, preserving the existing `days` query.

- [ ] **Step 1: Write failing academic period boundary tests**

```ts
assert.deepEqual(resolveAnalyticsPeriod(settings, { period: 'weekly' }, mondayNoon), {
  preset: 'weekly',
  from: mondayStart,
  to: mondayNoon,
});
assert.deepEqual(
  resolveAnalyticsPeriod(settings, { period: 'semester' }, now).from,
  currentTermStart,
);
assert.throws(() =>
  resolveAnalyticsPeriod(settings, { period: 'custom', from: after, to: before }, now),
);
```

- [ ] **Step 2: Run focused analytics tests and confirm failures**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/analytics-periods.test.ts test/analytics.test.ts`

Expected: FAIL because only numeric day ranges are supported.

- [ ] **Step 3: Implement institution-time-zone period resolution**

Daily resolves from local midnight, weekly from local Monday, monthly from day one, semester from the active term structure record, and custom from validated dates. Apply a maximum one-year custom range. Preserve `days` as a compatibility alias.

- [ ] **Step 4: Expand dashboard summary contracts**

Return role-scoped counts for students, lecturers, courses, live sessions, attendance, risks, and profile completion plus recent sessions and alerts. Reuse analytics aggregation rather than hard-coding values.

- [ ] **Step 5: Enrich all three dashboards**

Use existing `Card`, accessible chart, `DataTable`, `Badge`, loading, empty, and error components. Add period segmented controls, academic context banners, quick actions, and role-specific content defined in the design. Do not introduce a chart dependency unless an existing shared chart cannot represent the required data.

- [ ] **Step 6: Run focused dashboard verification**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/analytics-periods.test.ts test/analytics.test.ts && npm exec -w @qr/web -- vitest run test/dashboard-periods.test.tsx test/dashboard-navigation.test.tsx && npm run typecheck -w @qr/api && npm run typecheck -w @qr/web`

Expected: PASS.

- [ ] **Step 7: Record the intended commit**

```bash
git add packages/types/src/index.ts apps/api/src/validators/analytics.validator.ts apps/api/src/services/analytics.service.ts apps/api/src/services/portal.service.ts apps/api/src/controllers apps/web/src/features/analytics apps/web/src/features/portals apps/api/test/analytics-periods.test.ts apps/web/test/dashboard-periods.test.tsx
git commit -m "feat(dashboard): add period-aware role analytics"
```

### Task 9: Generate deterministic semester-scale MVP data

**Files:**

- Create: `apps/api/src/scripts/demo-data.ts`
- Modify: `apps/api/src/scripts/seed.ts`
- Modify: `README.md`
- Test: `apps/api/test/demo-seed.test.ts`

**Interfaces:**

- Produces: `buildDemoDataset(seed: number): DemoDataset` as a pure deterministic generator.
- Keeps the existing `ALLOW_DEMO_SEED=true` and `SEED_ACCOUNT_PASSWORD` execution guards.

- [ ] **Step 1: Write failing deterministic data tests**

```ts
const first = buildDemoDataset(20260809);
const second = buildDemoDataset(20260809);
assert.deepEqual(first, second);
assert.equal(first.students.length, 240);
assert.equal(first.lecturers.length, 18);
assert.ok(first.students.length <= 1000);
assert.ok(first.lecturers.length <= 100);
assert.ok(new Set(first.attendance.map((row) => row.pattern)).size >= 5);
```

- [ ] **Step 2: Run the seed test and confirm failure**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/demo-seed.test.ts`

Expected: FAIL because `buildDemoDataset` does not exist.

- [ ] **Step 3: Implement the pure fictional dataset generator**

Generate stable IDs/keys, Nigerian and international fictional names, 18 lecturers, 240 students, multiple faculties/departments/programmes/levels, courses, mappings, assignments, and weekly semester sessions. Generate high, declining, persistently absent, late, and recovering attendance cohorts. Avoid names or emails used by real people supplied by the user.

- [ ] **Step 4: Upsert generated records idempotently**

Use stable emails, codes, and compound keys with `findOneAndUpdate(..., { upsert: true })`. Connect users to profiles, curricula, assignments, registrations, sessions, and attendance. Keep all records in the demonstration university tenant and log final counts.

- [ ] **Step 5: Run focused seed verification**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/demo-seed.test.ts test/analytics.test.ts && npm run typecheck -w @qr/api`

Expected: PASS without executing a destructive database reset.

- [ ] **Step 6: Record the intended commit**

```bash
git add apps/api/src/scripts/demo-data.ts apps/api/src/scripts/seed.ts apps/api/test/demo-seed.test.ts README.md
git commit -m "feat(demo): add deterministic semester attendance dataset"
```

### Task 10: Surface QR and examination-clearance workflows and run focused regression checks

**Files:**

- Modify: `apps/web/src/features/portals/student-workspace-page.tsx`
- Modify: `apps/web/src/features/portals/lecturer-workspace-page.tsx`
- Modify: `apps/web/src/features/events/events-page.tsx`
- Modify: `apps/web/src/features/clearance/clearance-page.tsx`
- Modify: `apps/web/src/layouts/dashboard-nav-config.ts`
- Test: `apps/web/test/attendance-actions.test.tsx`
- Test: `apps/api/test/clearance.test.ts`
- Test: `apps/api/test/events.test.ts`
- Test: `apps/api/test/attendance.test.ts`

**Interfaces:**

- Consumes the existing class-session QR, event-session QR/PIN, clearance PDF/print, and examiner verification APIs.
- Produces prominent role-appropriate shortcuts without changing cryptographic or attendance rules.

- [ ] **Step 1: Write failing discoverability tests**

```tsx
expect(screen.getByRole('link', { name: /attendance clearance/i })).toHaveAttribute(
  'href',
  '/app/clearance',
);
expect(screen.getByRole('button', { name: /start class attendance/i })).toBeVisible();
expect(screen.getByRole('button', { name: /open event attendance/i })).toBeVisible();
expect(screen.getByRole('button', { name: /download pdf/i })).toBeVisible();
```

- [ ] **Step 2: Run the focused UI test and confirm failure**

Run: `npm exec -w @qr/web -- vitest run test/attendance-actions.test.tsx`

Expected: FAIL because the actions are not consistently exposed with these accessible names.

- [ ] **Step 3: Add dashboard shortcuts and explanatory status panels**

Student: show attendance clearance eligibility and PDF/print action. Lecturer: show assigned-course session action leading to the existing rotating QR. Event manager: show event attendance action leading to the existing event QR/PIN controls. Examiner: retain scan/search verification and clarify printed-PDF scanning.

- [ ] **Step 4: Run only the affected end-to-end service regressions**

Run: `npm exec -w @qr/api -- tsx --conditions=development --import ./test/setup.ts --test test/attendance.test.ts test/clearance.test.ts test/events.test.ts && npm exec -w @qr/web -- vitest run test/attendance-actions.test.tsx test/dashboard-navigation.test.tsx test/button-contrast.test.ts && npm run typecheck -w @qr/api && npm run typecheck -w @qr/web`

Expected: PASS.

- [ ] **Step 5: Run targeted lint on changed implementation and test files**

Run: `npx eslint packages/types/src/index.ts packages/shared/src/index.ts apps/api/src/models apps/api/src/validators apps/api/src/services apps/api/src/controllers apps/api/src/routes apps/api/src/scripts apps/api/test apps/web/src/layouts apps/web/src/features apps/web/src/routes/router.tsx apps/web/test --max-warnings=0`

Expected: PASS.

- [ ] **Step 6: Record the intended commit**

```bash
git add packages apps/api apps/web README.md docs/superpowers
git commit -m "feat: complete role profiles and university dashboard experience"
```

## Completion Evidence

Before reporting completion, capture:

- Focused API test totals for invitations, profiles, curriculum, assignments, analytics periods, seed integrity, attendance, clearance, and events.
- Focused web test totals for navigation, contrast, invitation/profile flows, period controls, and attendance actions.
- Successful API and web type checks.
- Successful targeted lint.
- Manual light/dark verification at desktop and mobile widths for administrator, lecturer, and student navigation and dashboards.
- Database counts proving demo students `<= 1000` and lecturers `<= 100` and confirming deterministic re-runs create no duplicates.
