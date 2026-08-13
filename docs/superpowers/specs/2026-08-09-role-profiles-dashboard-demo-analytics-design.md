# Attendity Role Profiles, Dashboard, and Demo Analytics Design

## Purpose

Extend the existing Attendity platform with secure lecturer onboarding, discoverable role access, role-specific profile management, curriculum-aware course registration, richer dashboards, and realistic demonstration analytics. Preserve the established monorepo, tenant-aware RBAC, attendance engine, clearance verification, event attendance, reporting, and notification behaviour.

## Scope

This work covers:

- Dashboard button contrast, navigation, visual hierarchy, and role-specific presentation.
- Secure staff invitations and activation.
- Student and lecturer profile management.
- Institution-configured matriculation-number rules.
- Curriculum mappings and automatic core-course registrations.
- Elective selection and borrowed-course request CRUD.
- Lecturer teaching assignments.
- Institution and lecturer analytics across daily, weekly, monthly, semester, and custom periods.
- Deterministic fictional MVP records within the requested limits.
- Discoverable student examination-clearance PDF/print, lecturer class QR, and event-manager QR workflows.

Out of scope are public privileged-role registration, replacement of the existing authentication system, replacement of the attendance engine, and unrelated refactoring.

## Architectural Direction

Extend the existing domain using focused, tenant-scoped modules. Do not place every new field directly on `User`, and do not introduce a generic schema engine.

`User` remains the authentication identity and stores shared identity fields: name, email, phone, photo, role, account status, and institution. Existing compatible academic fields remain readable during migration.

Add these focused records:

- `StudentProfile`: user, institution, matriculation number, campus, faculty, department, programme, level, admission session, phone/photo metadata, and completion state.
- `LecturerProfile`: user, institution, employee number, title, campus, faculty, department, office/contact information, biography, and completion state.
- `StaffInvitation`: institution, invited email, intended role, initial scope, secure token hash, inviter, expiry, acceptance/revocation timestamps, and status.
- `CurriculumMapping`: institution, course, programme, level, academic period or semester, course classification, and status.
- `LecturerAssignment`: institution, lecturer, course, academic period, assignment role, and status.

Existing `CourseRegistration` records remain the source of truth for permission to attend a course. Existing course, attendance, and clearance identifiers remain compatible.

All new records use tenant scoping, audit metadata, indexes, uniqueness constraints, and soft-deactivation conventions consistent with the current models.

## Account Provisioning and Access

Public registration remains student-only. The interface must state this clearly.

The platform provisions the first Institution Administrator when an institution is created. Institution Administrators can then open `People -> Invite staff`, select a permitted staff role, assign initial academic scope, and send an invitation.

Staff invitations must be expiring, single-use, tenant-scoped, revocable, resendable, and stored only as secure token hashes. Invitation acceptance confirms the institutional email, establishes the password, creates the correct role profile, and activates the account according to verification policy. An inviter cannot grant a role outside their own permissions.

Every role uses the same login form. After authentication, role routing sends users to:

- Institution and scoped administrators: `/app`
- Lecturer: `/app/lecturer`
- Student: `/app/student`
- Examiner: `/app/examiner`

The login page explains this automatic routing so users do not need separate sign-in pages.

## Profile Management

Add a dedicated `My profile` destination, separate from password, device-session, notification, and institution settings.

### Student Profile

The student selects a validated hierarchy of campus, faculty, department, programme, level, and admission or academic session. The form collects the institution-labelled matriculation number, phone number, and profile photograph. It displays the institution's example and guidance while validating the configured pattern on both client and server.

Selecting the required academic fields previews the matching curriculum. Saving a valid profile idempotently creates approved registrations for active core courses. Institution-configured electives can be selected through the same flow. Borrowed courses use explicit pending, approved, rejected, withdrawn, and resubmitted states with appropriate CRUD controls and audit history.

Academic changes that affect approved registrations must not erase attendance history. Affected registrations enter administrative review, and the student receives clear status feedback.

### Lecturer Profile

The lecturer can update title, employee number, phone, photograph, campus, faculty, department, office, and biography. Assigned courses and academic periods appear read-only in the personal profile. Authorised administrators control lecturer assignments; lecturers cannot grant themselves teaching access.

### Administrative Oversight

The People area displays role, invitation status, profile-completion status, academic scope, last access, and account state. Authorised administrators can invite, resend, revoke, activate, suspend, and scope users within RBAC boundaries.

## Institution Configuration and Curriculum

Institution settings gain:

- Student identifier label.
- Human-readable matriculation example.
- Safe validation pattern and guidance text.
- Profile fields required by role.

Academic management retains the institution-owned course catalogue. Authorised administrators map courses to programme, level, semester or term, and classification. Core mappings drive automatic approved registrations. Elective mappings define selectable courses. Borrowed-course requests may target other permitted departments and require approval.

Lecturer assignments associate one or more lecturers with courses for defined academic periods while preserving compatibility with the existing primary lecturer field during migration. Attendance-session authorization resolves from active assignments and retains the existing tenant and course checks.

## Dashboard Experience

Use a mature university SaaS visual language: institutional navy, Attendity green, restrained academic gold, layered solid surfaces, and clear typography. Do not use gradients.

The dashboard shell includes:

- Institution-branded sidebar with institution name and user role.
- Grouped, permission-filtered destinations with stronger active states.
- Collapsible desktop navigation and polished mobile drawer.
- Breadcrumb and current-page context.
- Notifications, theme control, and a richer account menu.
- Separate `My profile`, `Security`, and authorised institution `Settings` entries.
- Responsive and keyboard-accessible behaviour.

Define explicit light and dark tokens for primary, secondary, outline, destructive, tab, icon, and disabled buttons. Button labels must satisfy contrast expectations in every state.

### Institution Administrator Dashboard

Show an academic-period welcome panel, institution health, student and lecturer totals, courses, active sessions, attendance rate, at-risk registrations, and profile completion. Include attendance trends, faculty and department comparisons, risk distribution, busy periods, recent sessions, alerts, and shortcuts for staff invitations, curriculum management, borrowed-course review, and reports.

### Lecturer Dashboard

Show assigned courses, today's timetable, active-session controls, recent attendance, daily through semester trends, student attendance distribution, persistent absences, late arrivals, and risk alerts. Provide direct access to class QR creation, schedules, announcements, analytics, and the lecturer profile.

### Student Dashboard

Show profile completion, registered courses, attendance standing, upcoming classes and events, risk guidance, pending borrowed-course requests, and direct access to attendance clearance.

## Analytics and Demonstration Data

Institution and lecturer analytics support daily, weekly, monthly, semester, and custom date ranges. Date handling uses the institution time zone and configured academic periods. Lecturer data remains limited to active assignments; scoped administrators remain limited to their faculty or department; student analytics remain personal.

The deterministic demo seed creates approximately 240 fictional students and 18 fictional lecturers, safely below the limits of 1,000 students and 100 lecturers. It also creates multiple faculties, departments, programmes, levels, courses, curriculum mappings, lecturer assignments, registrations, sessions, and attendance records spanning the current semester.

Attendance patterns should produce meaningful variation: high attendance, gradual decline, persistent absence, late arrival, and recovery. Dashboards must derive all totals and charts from seeded database records, never hard-coded presentation values. Re-running the seed updates known deterministic records rather than duplicating them. Demo creation remains protected by explicit environment flags and must never introduce demonstration secrets into production.

## Attendance and Verification Workflows

### Student Examination Clearance

Students can view course-by-course attendance, requirements, eligibility, academic period, and verification history. Eligible clearance can be downloaded as a branded PDF or printed.

The record contains student photograph, matriculation number, programme, level, course, attendance summary, report reference, issue date, tamper-evident checksum, and an opaque verification QR reference. It must not encode private student data directly.

Examiners scan the QR code from a phone, screen, or printed record. Server verification returns valid, expired, revoked, or ineligible status with the permitted student and course details.

### Lecture Attendance

Lecturers open a time-limited attendance session for an actively assigned course. Attendity generates a rotating QR code and optional short check-in code. Students scan from the dashboard or mobile interface. The existing registration, session, duplication, QR, GPS, and face-verification checks remain authoritative. Lecturers receive live updates and can close sessions early.

### Event Attendance

An authorised event manager opens an event attendance session and generates an event-specific rotating QR code and optional PIN. Existing QR, GPS, face, PIN, and authorised manual methods remain available. Event attendance remains separate from course attendance while contributing to event analytics and student participation history.

Dashboard shortcuts must make all three workflows immediately discoverable.

## Validation and Failure Handling

- Reject expired, used, revoked, cross-tenant, or unauthorised invitations.
- Validate and uniquely index matriculation numbers per institution.
- Validate every academic selection against the real institution hierarchy.
- Make automatic registration reconciliation idempotent.
- Preserve historical attendance whenever academic profiles or mappings change.
- Require explicit states and audit history for borrowed-course changes.
- Limit lecturer access to active, tenant-scoped academic-period assignments.
- Validate file type, size, ownership, and secure storage for profile photographs.
- Return actionable, accessible form errors without leaking sensitive account information.
- Preserve existing records through additive schemas and explicit compatibility or migration logic.

## Accessibility and Responsive Behaviour

All affected interfaces must provide semantic structure, keyboard access, visible focus states, accessible dialogs, labelled controls, screen-reader feedback, responsive touch targets, reduced-motion support, and WCAG 2.2 AA-oriented contrast. Status must never be communicated by colour alone.

## Focused Verification

Testing is limited to affected behaviours and their immediate regressions:

- Dark-mode button contrast and responsive navigation.
- Invitation creation, acceptance, expiry, revocation, RBAC, and tenant isolation.
- Student and lecturer profile validation and updates.
- Institution-specific matriculation rules and uniqueness.
- Curriculum matching and idempotent core registration.
- Elective selection and borrowed-course request lifecycle.
- Lecturer assignment authorization.
- Daily, weekly, monthly, semester, and custom analytics boundaries.
- Deterministic seed counts, idempotency, and referential integrity.
- Student clearance PDF/print and examiner QR verification.
- Lecturer class QR and event-manager QR paths.

Each implementation pass must use the narrowest relevant automated tests plus targeted type checking and linting for changed files. Visual checks cover both themes and representative desktop and mobile widths.

## Delivery Boundaries

Implement in cohesive passes while preserving a continuously usable application:

1. Dashboard shell, navigation, button contrast, and route discoverability.
2. Staff invitations and role access.
3. Profile APIs and role-specific profile interfaces.
4. Institution matriculation settings and curriculum mappings.
5. Automatic, elective, and borrowed-course registration flows.
6. Lecturer assignments and authorization compatibility.
7. Period-aware dashboards and analytics.
8. Deterministic MVP data and final focused verification.

No pass may remove or bypass working authentication, attendance, clearance, reporting, event, notification, audit, or tenant-isolation behaviour.
