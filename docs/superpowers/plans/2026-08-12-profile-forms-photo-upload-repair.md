# Attendity Profile Forms and Photo Upload Repair Implementation Plan

Status: Completed on 2026-08-12

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make student and lecturer profile forms reliably populate valid academic choices, preview selected profile photographs immediately, and permanently save those photographs through Attendity's authenticated Cloudinary upload flow.

**Architecture:** Add a focused reusable photo field, convert role forms to controlled cascading selectors, and move upload plus profile update into one awaited mutation. Repair existing institution hierarchy data with an idempotent tenant-safe script and correct the demonstration-data writer so the defect cannot recur.

**Tech Stack:** React 19, TypeScript 5.9, TanStack Query 5, Zustand 5, Axios, Express 5, Mongoose 8, Cloudinary REST API, Vitest/Testing Library, Node test runner.

## Global Constraints

- Preserve the existing monorepo boundaries and role permissions.
- Keep Cloudinary credentials server-side; the browser uploads only to `/api/v1/uploads/profile`.
- Accept only JPEG, PNG, and WebP profile photographs up to 10 MB.
- Preserve tenant isolation and active-record filtering in every academic hierarchy query and repair.
- Do not weaken server-side MIME signature, asset ownership, or hierarchy validation.
- Use strict TypeScript types, existing Attendity UI primitives, accessible feedback, and light/dark-mode-safe styles.
- Do not introduce a replacement storage provider, duplicate form components, or unrelated dashboard changes.
- Run focused tests and affected type checks rather than the entire repository suite.

---

## File Structure

- Create `apps/web/src/features/profiles/profile-photo-field.tsx`: reusable photo selection, validation, preview, and feedback UI.
- Modify `apps/web/src/features/profiles/student-profile-form.tsx`: controlled student hierarchy and shared photo field.
- Modify `apps/web/src/features/profiles/lecturer-profile-form.tsx`: controlled lecturer hierarchy and shared photo field.
- Modify `apps/web/src/features/profiles/use-profile.ts`: expose one upload-then-update mutation with a typed result.
- Modify `apps/web/src/features/profiles/profile-page.tsx`: render current photographs and role-local save feedback.
- Modify `apps/web/test/profile-flows.test.tsx`: focused photo and cascading-selector component tests.
- Create `apps/web/test/profile-save.test.ts`: upload ordering, pending state, error, and success refresh tests.
- Create `apps/api/src/scripts/repair-profile-hierarchy.ts`: gated, idempotent hierarchy repair for existing tenants.
- Modify `apps/api/src/scripts/persist-demo-data.ts`: create parented faculties and programme-specific levels.
- Modify `apps/api/package.json`: add the explicit hierarchy repair command.
- Create `apps/api/test/profile-hierarchy-repair.test.ts`: hierarchy repair and tenant-isolation integration coverage.
- Modify `apps/api/test/demo-seed.test.ts`: guard the corrected demo hierarchy plan.

---

### Task 1: Reusable Profile Photograph Field

**Files:**

- Create: `apps/web/src/features/profiles/profile-photo-field.tsx`
- Modify: `apps/web/test/profile-flows.test.tsx`

**Interfaces:**

- Produces: `ProfilePhotoField({ currentPhotoUrl?, disabled, value?, onChange })`.
- Produces: `validateProfilePhoto(file): string | null` for deterministic component validation.
- Consumes: JPEG/PNG/WebP and 10 MB rules already enforced by `media-upload.service.ts`.

- [ ] **Step 1: Write failing preview and validation tests**

Add tests that render `ProfilePhotoField`, upload a valid JPEG with `fireEvent.change`, and assert the preview, filename, size feedback, and callback. Add invalid-type and oversized-file cases asserting `role="alert"` and no callback with the invalid file.

```tsx
const photo = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'student.jpg', {
  type: 'image/jpeg',
});
fireEvent.change(screen.getByLabelText('Profile photograph'), {
  target: { files: [photo] },
});
expect(screen.getByAltText('Selected profile preview')).toHaveAttribute(
  'src',
  'blob:attendity-photo',
);
expect(screen.getByText(/student\.jpg/i)).toBeVisible();
expect(screen.getByRole('status')).toHaveTextContent(/upload when you save/i);
expect(onChange).toHaveBeenLastCalledWith(photo);
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -w @qr/web -- profile-flows.test.tsx`

Expected: FAIL because `profile-photo-field.tsx` does not exist.

- [ ] **Step 3: Implement the typed photo field**

Implement constants and validation:

```ts
const PROFILE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PROFILE_PHOTO_BYTES = 10 * 1024 * 1024;

export function validateProfilePhoto(file: File): string | null {
  if (!PROFILE_PHOTO_TYPES.has(file.type)) return 'Choose a JPEG, PNG, or WebP image.';
  if (file.size === 0) return 'The selected image is empty.';
  if (file.size > MAX_PROFILE_PHOTO_BYTES) return 'Profile photographs must be 10 MB or smaller.';
  return null;
}
```

Use controlled `value`, `URL.createObjectURL`, `URL.revokeObjectURL`, an image preview, selected metadata, and a clear-selection button. Keep `currentPhotoUrl` as the fallback preview and use `aria-live="polite"` for selection feedback.

- [ ] **Step 4: Run the focused test and confirm success**

Run: `npm test -w @qr/web -- profile-flows.test.tsx`

Expected: PASS for preview, clear, replacement, type, and size cases.

- [ ] **Step 5: Commit the focused component change when Git metadata is available**

```bash
git add apps/web/src/features/profiles/profile-photo-field.tsx apps/web/test/profile-flows.test.tsx
git commit -m "feat(web): add profile photo preview field"
```

If this workspace remains a source snapshot without `.git`, record the completed task in the plan and continue without synthesizing repository metadata.

---

### Task 2: Controlled Student and Lecturer Academic Selectors

**Files:**

- Modify: `apps/web/src/features/profiles/student-profile-form.tsx`
- Modify: `apps/web/src/features/profiles/lecturer-profile-form.tsx`
- Modify: `apps/web/test/profile-flows.test.tsx`

**Interfaces:**

- Consumes: `ProfilePhotoField` from Task 1.
- Produces: `StudentProfileForm` with controlled `campusId`, `facultyId`, `programmeId`, `levelId`, `departmentId`, and `admissionSessionId`.
- Produces: `LecturerProfileForm` with controlled `campusId`, `facultyId`, and `departmentId`.
- Adds to both form props: `currentPhotoUrl?: string`.

- [ ] **Step 1: Write failing hierarchy interaction tests**

Use two campuses, two parented faculties, two programmes, programme-specific levels, and faculty-named departments. Assert that selecting campus A exposes only faculty A; changing to campus B clears faculty, programme, level, and department; and blank option text explains a missing prerequisite. Repeat the campus/faculty/department behavior for the lecturer form.

```tsx
fireEvent.change(screen.getByLabelText('Campus'), { target: { value: 'campus-a' } });
expect(screen.getByRole('option', { name: /FAC-A.*Science/i })).toBeInTheDocument();
expect(screen.queryByRole('option', { name: /FAC-B.*Law/i })).not.toBeInTheDocument();
fireEvent.change(screen.getByLabelText('Campus'), { target: { value: 'campus-b' } });
expect(screen.getByLabelText('Faculty or school')).toHaveValue('');
expect(screen.getByLabelText('Programme')).toHaveValue('');
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -w @qr/web -- profile-flows.test.tsx`

Expected: FAIL because dependent selectors remain uncontrolled and lecturer filtering is absent.

- [ ] **Step 3: Implement controlled cascading state**

Replace every dependent `defaultValue` with `value` and explicit state. Derive arrays with `useMemo`:

```ts
const faculties = useMemo(
  () => structures.filter((item) => item.kind === 'faculty' && item.parent?.id === campusId),
  [campusId, structures],
);
const programmes = useMemo(
  () => structures.filter((item) => item.kind === 'programme' && item.parent?.id === facultyId),
  [facultyId, structures],
);
const levels = useMemo(
  () => structures.filter((item) => item.kind === 'level' && item.parent?.id === programmeId),
  [programmeId, structures],
);
```

Reset all descendants in the parent handler. Filter departments with the selected faculty's exact `name`. Provide explicit placeholder options such as `Select a campus first` and `No faculties configured for this campus`. Bind `ProfilePhotoField` to local `photoFile` state and pass the file directly in the submitted typed value.

- [ ] **Step 4: Run focused tests and web type checking**

Run: `npm test -w @qr/web -- profile-flows.test.tsx`

Run: `npm run typecheck -w @qr/web`

Expected: both commands PASS.

- [ ] **Step 5: Commit the form repair when Git metadata is available**

```bash
git add apps/web/src/features/profiles/student-profile-form.tsx apps/web/src/features/profiles/lecturer-profile-form.tsx apps/web/test/profile-flows.test.tsx
git commit -m "fix(web): control profile academic selectors"
```

---

### Task 3: Atomic Upload-and-Save Feedback Flow

**Files:**

- Modify: `apps/web/src/features/profiles/use-profile.ts`
- Modify: `apps/web/src/features/profiles/profile-page.tsx`
- Create: `apps/web/test/profile-save.test.ts`

**Interfaces:**

- Produces: `useSaveProfile(role)` mutation accepting `StudentProfileValues | LecturerProfileValues`.
- Produces: `ProfileSaveResult` containing `photoUrl?: string`.
- Consumes: `uploadProfilePhoto(file)` and existing `/profiles/:role` endpoints.

- [ ] **Step 1: Write failing upload-order and feedback tests**

Mock `apiClient.post` and `apiClient.patch`. Assert that the upload resolves before the PATCH, the PATCH receives `photoAssetId` plus `photoUrl`, upload rejection prevents PATCH, and the page displays the returned error message inside the active form region.

```ts
expect(apiClient.post).toHaveBeenCalledWith('/uploads/profile', photo, {
  headers: { 'Content-Type': 'image/jpeg', 'x-file-name': 'student.jpg' },
});
expect(apiClient.patch).toHaveBeenCalledWith(
  '/profiles/student',
  expect.objectContaining({ photoAssetId: 'asset-id', photoUrl: secureUrl }),
);
```

- [ ] **Step 2: Run the save-flow test and confirm failure**

Run: `npm test -w @qr/web -- profile-save.test.ts`

Expected: FAIL because the profile page currently launches an untracked async upload before a separate mutation.

- [ ] **Step 3: Implement one awaited mutation**

Add:

```ts
export function useSaveProfile(role: 'student' | 'lecturer') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (values: StudentProfileValues | LecturerProfileValues) => {
      const { photoFile, ...profile } = values;
      const photo = photoFile ? await uploadProfilePhoto(photoFile) : undefined;
      await apiClient.patch(`/profiles/${role}`, {
        ...profile,
        ...(photo ? { photoAssetId: photo.assetId, photoUrl: photo.url } : {}),
      });
      return { photoUrl: photo?.url } satisfies ProfileSaveResult;
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['profile', 'me'] }),
        client.invalidateQueries({ queryKey: ['registrations'] }),
      ]);
    },
  });
}
```

The request header must continue using `encodeURIComponent(file.name)` to preserve the existing backend filename decoding contract. On success, invalidate and refetch the profile query that owns `photoUrl`. Pass `profile.data.user.photoUrl` to the role form. Use mutation `isPending`, `isError`, `error`, and `isSuccess` for form-local progress and accessible feedback. The authenticated token identity intentionally remains unchanged because `AuthenticatedUser` contains authorization claims, not profile-media fields.

- [ ] **Step 4: Run save tests and affected type checks**

Run: `npm test -w @qr/web -- profile-save.test.ts profile-flows.test.tsx`

Run: `npm run typecheck -w @qr/web`

Expected: both commands PASS.

- [ ] **Step 5: Commit the save-flow repair when Git metadata is available**

```bash
git add apps/web/src/features/profiles/use-profile.ts apps/web/src/features/profiles/profile-page.tsx apps/web/test/profile-save.test.ts
git commit -m "fix(web): await profile photo uploads and saves"
```

---

### Task 4: Correct Future Demo Hierarchies

**Files:**

- Modify: `apps/api/src/scripts/persist-demo-data.ts`
- Modify: `apps/api/test/demo-seed.test.ts`

**Interfaces:**

- Produces: faculties whose `parentId` is the generated campus ID.
- Produces: programme-specific level lookup keyed as `${programmeId}:${levelCode}`.
- Consumes: deterministic `buildDemoDataset()` output and existing Mongoose models.

- [ ] **Step 1: Extract and test the deterministic hierarchy plan**

Export a pure `buildDemoHierarchyPlan(data)` helper and assert every faculty names `MAIN` as its parent code, every programme names its faculty parent code, and every level names a programme parent code with a unique code no longer than 32 characters.

```ts
const hierarchy = buildDemoHierarchyPlan(buildDemoDataset(20260809));
assert.ok(hierarchy.faculties.every((item) => item.parentCode === 'MAIN'));
assert.ok(hierarchy.levels.every((item) => item.parentCode.startsWith('PRG-')));
assert.equal(new Set(hierarchy.levels.map((item) => item.code)).size, hierarchy.levels.length);
assert.ok(hierarchy.levels.every((item) => item.code.length <= 32));
```

- [ ] **Step 2: Run the demo test and confirm failure**

Run: `npm test -w @qr/api -- demo-seed.test.ts`

Expected: FAIL because the hierarchy plan is not exported and levels are currently shared.

- [ ] **Step 3: Update the demo persistence writer**

Pass `{ parentId: campus._id }` when upserting faculties. Replace the shared level map with programme-level entries using stable hashed codes, for example:

```ts
function programmeLevelCode(programmeCode: string, levelCode: string): string {
  return `LVL-${levelCode}-${createHash('sha1').update(programmeCode).digest('hex').slice(0, 8)}`;
}
```

Use each student's department programme when assigning `StudentProfile.levelId`; use each curriculum mapping's programme when assigning `CurriculumMapping.levelId`. Preserve all existing course, session, and attendance generation behavior.

- [ ] **Step 4: Run the focused API test and type check**

Run: `npm test -w @qr/api -- demo-seed.test.ts`

Run: `npm run typecheck -w @qr/api`

Expected: both commands PASS.

- [ ] **Step 5: Commit the corrected writer when Git metadata is available**

```bash
git add apps/api/src/scripts/persist-demo-data.ts apps/api/test/demo-seed.test.ts
git commit -m "fix(api): seed valid profile hierarchies"
```

---

### Task 5: Repair Existing Institution Profile Hierarchies

**Files:**

- Create: `apps/api/src/scripts/repair-profile-hierarchy.ts`
- Create: `apps/api/test/profile-hierarchy-repair.test.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Produces: `repairProfileHierarchy(universityId?): Promise<RepairSummary>`.
- Produces: npm script `repair:profile-hierarchy`.
- Consumes: `UniversityModel`, `InstitutionStructureModel`, `StudentProfileModel`, and `CurriculumMappingModel`.

- [ ] **Step 1: Write a failing test with two isolated tenants**

Connect to `attendity_test`, create one tenant with one campus, an unparented faculty, a parented programme, a shared unparented level, a student profile, and a curriculum mapping. Create a second tenant as an isolation sentinel. Run the repair twice and assert:

```ts
assert.equal(String(repairedFaculty.parentId), String(campus._id));
assert.equal(String(repairedLevel.parentId), String(programme._id));
assert.equal(String(repairedStudent.levelId), String(repairedLevel._id));
assert.equal(String(repairedMapping.levelId), String(repairedLevel._id));
assert.deepEqual(secondRun, {
  facultiesLinked: 0,
  levelsCreated: 0,
  studentProfilesUpdated: 0,
  curriculumMappingsUpdated: 0,
  ambiguousInstitutions: 0,
});
assert.equal(
  await InstitutionStructureModel.countDocuments({ universityId: tenantB }),
  sentinelCount,
);
```

- [ ] **Step 2: Run the focused repair test and confirm failure**

Run: `npm test -w @qr/api -- profile-hierarchy-repair.test.ts`

Expected: FAIL because the repair function does not exist.

- [ ] **Step 3: Implement the gated idempotent repair**

Export the repair function without side effects, then make CLI execution require:

```ts
if (process.env.ALLOW_PROFILE_HIERARCHY_REPAIR !== 'true') {
  throw new Error('Set ALLOW_PROFILE_HIERARCHY_REPAIR=true to repair profile hierarchy data.');
}
```

For each selected tenant:

- link unparented faculties only when the tenant has exactly one active campus;
- record an ambiguity and make no faculty change when multiple campuses prevent a safe inference;
- for each student or curriculum mapping pair of `programmeId` and legacy unparented `levelId`, upsert a level with a stable programme-specific code and `parentId: programmeId`;
- update only records belonging to the same tenant;
- preserve already parented faculty and level records;
- return aggregate counts and close the database connection in the CLI wrapper.

Add `"repair:profile-hierarchy": "tsx --conditions=development src/scripts/repair-profile-hierarchy.ts"` to `apps/api/package.json`.

- [ ] **Step 4: Run repair tests and API type checking**

Run: `npm test -w @qr/api -- profile-hierarchy-repair.test.ts demo-seed.test.ts profile-domain.test.ts profiles.test.ts`

Run: `npm run typecheck -w @qr/api`

Expected: all commands PASS.

- [ ] **Step 5: Apply the repair to the local Attendity database**

Run for this process only:

```powershell
$env:ALLOW_PROFILE_HIERARCHY_REPAIR='true'
npm run repair:profile-hierarchy -w @qr/api
Remove-Item Env:ALLOW_PROFILE_HIERARCHY_REPAIR
```

Expected: six existing faculties are linked to the sole active campus, programme-specific levels are created and referenced, no tenant ambiguity is reported, and a second execution reports zero remaining repairs.

- [ ] **Step 6: Commit the repair when Git metadata is available**

```bash
git add apps/api/src/scripts/repair-profile-hierarchy.ts apps/api/test/profile-hierarchy-repair.test.ts apps/api/package.json
git commit -m "fix(api): repair profile academic hierarchies"
```

---

### Task 6: Focused End-to-End Verification

**Files:**

- Verify only; modify a task-owned file only if a test exposes a defect within this specification.

**Interfaces:**

- Consumes all outputs from Tasks 1–5.
- Produces evidence that local Cloudinary upload and the repaired profile flows work together.

- [ ] **Step 1: Restart the API so it reloads Cloudinary credentials**

Restart only the Attendity API development process; preserve MongoDB and the frontend process.

- [ ] **Step 2: Run focused automated verification**

Run:

```powershell
npm test -w @qr/web -- profile-flows.test.tsx profile-save.test.ts
npm test -w @qr/api -- profile-hierarchy-repair.test.ts demo-seed.test.ts profile-domain.test.ts profiles.test.ts
npm run typecheck -w @qr/web
npm run typecheck -w @qr/api
```

Expected: all commands PASS.

- [ ] **Step 3: Verify the local profile flow through the UI**

Sign in with an existing demo student and verify campus selection populates faculties, each downstream selector filters correctly, selecting a real image shows the preview and selected-file feedback, and saving retains the Cloudinary image after a reload. Repeat photo preview/save and campus/faculty/department selection with one demo lecturer.

- [ ] **Step 4: Verify the stored media record without revealing secrets**

Confirm the saved user has an HTTPS `res.cloudinary.com` photo URL and the corresponding `MediaAsset` belongs to the same user and tenant with `context: 'profile'` and `status: 'ready'`. Report only identifiers/counts and never print credential values.

- [ ] **Step 5: Record completion evidence**

Update the implementation handoff with focused test totals, the hierarchy repair summary, Cloudinary persistence confirmation, and any API restart instruction the user still needs.
