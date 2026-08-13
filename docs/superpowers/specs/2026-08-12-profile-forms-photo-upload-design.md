# Attendity Profile Forms and Photo Upload Repair Design

Date: 2026-08-12
Status: Approved

## Objective

Repair the student and lecturer profile forms so that academic placement choices are populated and remain consistent, profile photographs provide immediate visual feedback and save permanently through Cloudinary, and every stage of the save operation gives clear, accessible feedback.

The implementation must preserve the existing monorepo architecture, tenant isolation, role permissions, Cloudinary storage requirement, profile validation rules, and current student/lecturer functionality.

## Confirmed Root Causes

1. The existing demonstration institution contains active faculties with no `parentId`. The student form correctly filters faculties by the selected campus, so all unlinked faculties disappear.
2. Demonstration levels also lack their required programme parent relationship. This can leave the level selector inconsistent even after the faculty issue is repaired.
3. The demonstration-data writer creates faculty and level structures without those parents, allowing the fault to return after reseeding.
4. Student academic selectors use `defaultValue` while also maintaining cascading React state. Resetting a parent value does not reliably reset the visible child control.
5. The lecturer form does not cascade campus, faculty, and department choices, allowing incompatible combinations to be displayed.
6. The raw-binary upload endpoint and Cloudinary service are structurally compatible, but the page does not model photo uploading as part of the pending/error lifecycle. An upload failure can therefore provide little or no useful form feedback.
7. File inputs do not show the current photograph, a selected-image preview, filename, size, validation result, or replacement/removal controls.

Cloudinary credentials were subsequently configured and authenticated successfully through a read-only API request. Permanent storage is therefore available once the API process reloads the environment.

## Chosen Architecture

### Shared profile-photo field

Create one reusable profile-photo field for student and lecturer forms. It will:

- show the account's current profile photograph when available;
- validate JPEG, PNG, and WebP files before submission;
- enforce the backend's 10 MB limit on the client while retaining server validation as authoritative;
- create an object-URL preview immediately after selection;
- display the selected filename and human-readable size;
- announce that the image is selected and will upload when the profile is saved;
- allow the user to replace or clear the pending selection;
- revoke superseded object URLs and clean them up on unmount;
- remain keyboard accessible and expose status/error messages to assistive technology.

The component will report the selected `File` through a typed callback. The forms will not rely on rereading an opaque file field from `FormData`.

### Controlled academic placement fields

Convert all dependent academic selectors to controlled values.

Student dependency chain:

`Campus -> Faculty -> Programme -> Level`

Department is filtered by the selected faculty's name because the existing department model stores `facultyName`. Admission session remains institution-scoped and independent.

Lecturer dependency chain:

`Campus -> Faculty -> Department`

Changing a parent clears every incompatible child value. Existing saved values are retained when they are still valid. Empty selectors will explicitly explain whether the user must choose a parent or an administrator must configure options, instead of presenting an apparently blank list.

The same dark-mode-safe select styling and validation feedback will be shared where practical without creating a generic form framework.

### Profile save orchestration

The profile page will own a single logical save operation:

1. Validate the local form and selected photo.
2. If a new photo exists, upload it to `/uploads/profile`.
3. Await the returned secure asset identifier and URL.
4. Submit those values with the role-specific profile payload.
5. Refresh the profile and authenticated user data so navigation avatars and forms show the saved photograph.

Upload and profile update failures will be caught by the same operation and displayed within the relevant profile area. The submit button will remain disabled and show accurate progress throughout both stages. A failed upload will not submit a profile referencing a nonexistent asset.

The existing raw binary upload protocol remains unchanged because it matches the API's `express.raw({ type: 'image/*' })` route and server-side content signature checks.

### Institution hierarchy repair

Add an idempotent, explicitly gated repair script for existing institution data. For each institution it will:

- identify the intended campus for legacy unparented faculties;
- assign that campus as the faculty parent only when the relationship can be resolved safely;
- link programmes to their matching faculty while preserving correct existing links;
- create or repair programme-specific level structures required by the validated hierarchy;
- update affected student profile and curriculum references when a legacy shared level must be replaced by a programme-specific level;
- leave already-correct institutions unchanged;
- report counts without exposing private records.

The demonstration-data writer will also be corrected so newly seeded faculties receive the campus parent and newly seeded levels are programme-specific. This prevents recurrence.

The repair will never weaken the API's hierarchy validation or fabricate cross-tenant relationships.

## Error Handling

- Unsupported type: explain that only JPEG, PNG, or WebP is accepted.
- Oversized file: explain the 10 MB maximum before any network request.
- Storage unavailable or rejected: retain the selected preview, present the API message, and allow retry.
- No faculties for a campus: show a configuration-focused option message rather than a silent empty menu.
- No dependent programme, level, or department: explain the missing prerequisite/configuration.
- Profile update rejected: keep entered values and show the server's actionable response.
- Success: confirm that the profile and photograph were saved, then refresh displayed identity data.

## Security and Data Integrity

- Cloudinary secrets remain server-side and are never sent to the browser.
- The browser uploads only to the authenticated Attendity endpoint.
- The server continues checking MIME type, file signature, file size, tenant ownership, uploader ownership, and Cloudinary URL provenance.
- Academic choices continue to be validated against active records belonging to the authenticated institution.
- The hierarchy repair remains opt-in and idempotent.

## Focused Verification

Add or update focused tests covering:

- immediate photo preview and selected-file feedback;
- invalid type and size rejection;
- clearing/replacing the selected photo;
- student campus-to-faculty filtering;
- downstream resets after a parent selection changes;
- lecturer faculty/department filtering;
- explicit empty-option guidance;
- upload-before-update ordering;
- combined pending and failure feedback;
- successful profile refresh after saving;
- profile option serialization retaining populated parent identities;
- hierarchy repair idempotency and tenant isolation;
- demonstration seed hierarchy correctness.

Run only the relevant profile, upload, hierarchy, and type-check targets unless a shared change indicates broader risk.

## Out of Scope

- Changing role permissions or public registration policy.
- Replacing Cloudinary with local disk or another storage provider.
- Redesigning unrelated dashboard pages.
- Allowing students or lecturers to create institution structures themselves.
- Changing course-assignment authorization.

## Acceptance Criteria

- Selecting a campus exposes its configured faculties on the student and lecturer profile forms.
- Every dependent field resets or filters correctly when its parent changes.
- A selected profile image appears immediately in the form with clear feedback.
- Saving uploads the image to Cloudinary and persists its secure asset reference.
- The newly saved image appears after profile refresh and in identity surfaces that consume the authenticated user's photo.
- Upload and profile-save failures are visible and actionable.
- Existing demo institution records are repaired without duplicate structures or cross-tenant changes.
- Future demo seeding creates a valid hierarchy.
- Focused tests and affected TypeScript checks pass.
