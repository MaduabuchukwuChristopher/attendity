# Attendity Dashboard Feedback, Profile Identity, and Institution Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make saved profile photographs update throughout the dashboard, standardize accessible feedback for dashboard data-entry forms, and securely apply institution branding to supported generated Attendity outputs.

**Architecture:** Extend authenticated presentation state without changing JWT claims, centralize form feedback in reusable React primitives, store institution logos as tenant-owned Cloudinary media assets, and resolve export images through a server-side trusted-media boundary. Existing domain services keep their authorization and business rules; form pages and export renderers consume the new shared interfaces.

**Tech Stack:** TypeScript 5.9, React 19, Zustand, TanStack Query, Vitest/Testing Library, Express 5, Mongoose 8, Zod 4, Cloudinary HTTP API, PDFKit, ExcelJS, Node test runner.

## Global Constraints

- Preserve the existing monorepo, role permissions, tenant isolation, authentication boundaries, Cloudinary storage, historical clearance integrity, scanner flows, and attendance workflows.
- Keep JWT access and refresh claims unchanged; `photoUrl` is presentation data only.
- Accept JPEG, PNG, and WebP images up to exactly 10 MB, with client guidance and authoritative server validation.
- Institution-logo mutation requires `settings:write`; profile-photo ownership remains scoped to the authenticated profile flow.
- Never fetch an arbitrary export image URL. Only the configured Cloudinary delivery account is trusted.
- Previously issued clearance records remain immutable; current branding affects only new records and operational exports.
- CSV remains plain text and must not pretend to contain an embedded image.
- Specialized scanner/check-in feedback remains independent and must not produce duplicate generic form notifications.
- Run focused tests for each task before affected type checks. Broaden verification only when a shared change demonstrates wider risk.
- This source snapshot has no `.git` directory. During execution, replace commit steps with named file/test checkpoints. If the work is moved to a Git-enabled clone, use the provided commit message at each checkpoint.

## File Structure

### Shared contracts and identity

- Modify `packages/types/src/index.ts`: add optional presentation and managed-branding fields.
- Modify `apps/api/src/services/auth.service.ts`: serialize `photoUrl` without adding it to token claims.
- Modify `apps/web/src/store/auth-store.ts`: add `updateUserPresentation`.
- Create `apps/web/src/components/user-avatar.tsx`: one image/initials fallback implementation.
- Modify `apps/web/src/layouts/dashboard-topbar.tsx`: render the shared avatar.
- Modify `apps/web/src/layouts/dashboard-sidebar.tsx`: use the avatar only in personal identity surfaces already present.

### Feedback system

- Create `apps/web/src/components/form-action-feedback.tsx`: durable inline status.
- Create `apps/web/src/contexts/dashboard-toast-context.tsx`: toast provider, hook, queue, lifecycle, and accessible viewport.
- Modify `apps/web/src/layouts/dashboard-layout.tsx`: mount the provider once around dashboard content.
- Create `apps/web/test/dashboard-identity-feedback.test.tsx`: shared identity and feedback behavior.

### Institution branding

- Modify `apps/api/src/models/media-asset.model.ts`: add `institution_logo` context.
- Modify `apps/api/src/models/university.model.ts`: add optional `logoAssetId` reference.
- Modify `apps/api/src/services/media-upload.service.ts`: support and validate institution-logo assets.
- Modify `apps/api/src/controllers/media-upload.controller.ts`: add institution-logo upload handler.
- Modify `apps/api/src/routes/media-upload.route.ts`: add permission-protected logo upload endpoint.
- Modify `apps/api/src/validators/settings.validator.ts`: add dedicated managed-branding input.
- Modify `apps/api/src/services/settings.service.ts`: associate, replace, remove, and retire tenant-owned logos.
- Modify `apps/api/src/controllers/settings.controller.ts` and `apps/api/src/routes/settings.route.ts`: expose branding update endpoint.
- Create `apps/web/src/features/settings/institution-logo-field.tsx`: preview/upload/remove control.
- Modify `apps/web/src/features/settings/settings-page.tsx`: replace manual URL entry with managed branding.
- Create `apps/api/test/institution-branding.test.ts` and `apps/web/test/institution-branding.test.tsx`.

### Trusted export images and snapshots

- Create `apps/api/src/services/media-image-validation.ts`: reusable image signature/type logic.
- Create `apps/api/src/services/trusted-media.service.ts`: Cloudinary allowlist, normalized image retrieval, and typed fallback.
- Modify `apps/api/src/services/media-upload.service.ts`: consume shared image validation.
- Modify `apps/api/src/models/clearance-report.model.ts`, `apps/api/src/repositories/clearance.repository.ts`, and `apps/api/src/services/clearance.service.ts`: snapshot managed asset identifiers for new reports.
- Create `apps/api/test/trusted-media.test.ts`: resolver security tests.

### Branded outputs

- Modify `apps/api/src/services/clearance-export.service.ts` and `apps/api/src/controllers/clearance.controller.ts`: embed resolved logo/headshot in PDF and Excel.
- Modify `apps/api/src/services/attendance-qr-export.service.ts` and `apps/api/src/services/attendance.service.ts`: brand static QR PDF.
- Modify `apps/web/src/features/attendance/static-qr-poster.ts` and `apps/web/src/features/portals/lecturer-workspace-page.tsx`: brand PNG/print poster.
- Modify `apps/api/src/services/event-export.service.ts`, `apps/api/src/services/event.service.ts`, and `apps/api/src/controllers/event.controller.ts`: brand event PDF/Excel.
- Create `apps/api/src/services/analytics-export.service.ts`; modify analytics controller, route, validator, and reports page to expose branded PDF/XLSX/CSV downloads.
- Create `apps/api/test/branded-exports.test.ts`; extend existing clearance, attendance, event, and report UI tests.

### Form migration

- Modify the dashboard form pages listed in Task 8 to use `FormActionFeedback` and `useDashboardToast` while retaining existing specialized domain notices.
- Create `apps/web/test/dashboard-form-feedback-migration.test.tsx`: representative migration assertions.

---

### Task 1: Authenticated profile identity and reusable avatar

**Files:**

- Modify: `packages/types/src/index.ts`
- Modify: `apps/api/src/services/auth.service.ts`
- Modify: `apps/web/src/store/auth-store.ts`
- Create: `apps/web/src/components/user-avatar.tsx`
- Modify: `apps/web/src/layouts/dashboard-topbar.tsx`
- Modify: `apps/web/src/layouts/dashboard-sidebar.tsx`
- Test: `apps/api/test/auth-registration-login.test.ts`
- Test: `apps/web/test/dashboard-identity-feedback.test.tsx`

**Interfaces:**

- Produces: `AuthenticatedUser.photoUrl?: string`.
- Produces: `updateUserPresentation(patch: Partial<Pick<AuthenticatedUser, 'fullName' | 'photoUrl'>>): void`.
- Produces: `UserAvatar({ fullName, photoUrl, className?, imageClassName? }): JSX.Element`.
- Constraint: token signing continues selecting only `id`, `universityId`, `email`, `fullName`, and `role`.

- [ ] **Step 1: Write failing API and web tests**

```ts
assert.equal(
  login.body.data.user.photoUrl,
  'https://res.cloudinary.com/demo/image/upload/photo.jpg',
);
assert.equal(decode(login.body.data.tokens.accessToken).photoUrl, undefined);

useAuthStore.getState().updateUserPresentation({ photoUrl });
expect(screen.getByRole('img', { name: /profile photograph/i })).toHaveAttribute('src', photoUrl);
fireEvent.error(screen.getByRole('img', { name: /profile photograph/i }));
expect(screen.getByText('AS')).toBeVisible();
```

- [ ] **Step 2: Run the focused tests and confirm the missing type/store/avatar behavior fails**

Run: `npm test -w @qr/web -- dashboard-identity-feedback && cd apps/api && npx tsx --conditions=development --import ./test/setup.ts --test --test-name-pattern="profile photograph presentation" test/auth-registration-login.test.ts`

Expected: FAIL because `photoUrl`, `updateUserPresentation`, and `UserAvatar` do not exist.

- [ ] **Step 3: Implement the presentation-only identity path**

```ts
export interface AuthenticatedUser {
  readonly id: string;
  readonly universityId: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: UserRole;
  readonly photoUrl?: string;
}

updateUserPresentation: (patch) =>
  set((state) => ({ user: state.user ? { ...state.user, ...patch } : null })),
```

Implement `UserAvatar` with local image-error state reset when `photoUrl` changes, accessible alternative text, initials fallback, and existing topbar color tokens.

- [ ] **Step 4: Run focused tests and type checks**

Run: `npm test -w @qr/web -- dashboard-identity-feedback && npm run typecheck -w @qr/web && npm run typecheck -w @qr/api`

Expected: PASS.

- [ ] **Step 5: Record checkpoint**

Checkpoint: `feat: synchronize dashboard profile identity`

### Task 2: Shared inline feedback and dashboard toast system

**Files:**

- Create: `apps/web/src/components/form-action-feedback.tsx`
- Create: `apps/web/src/contexts/dashboard-toast-context.tsx`
- Modify: `apps/web/src/layouts/dashboard-layout.tsx`
- Test: `apps/web/test/dashboard-identity-feedback.test.tsx`

**Interfaces:**

- Produces: `FormActionFeedback({ status: 'idle' | 'success' | 'error', message? }): JSX.Element | null`.
- Produces: `useDashboardToast(): { notify(input: DashboardToastInput): string; dismiss(id: string): void }`.
- `DashboardToastInput`: `{ tone: 'success' | 'error'; title: string; message: string; durationMs?: number }`.
- Queue policy: three visible messages, default duration 5,000 ms, manually dismissible.

- [ ] **Step 1: Add failing component/provider tests**

```tsx
render(<FormActionFeedback status="success" message="Profile saved." />);
expect(screen.getByRole('status')).toHaveTextContent('Profile saved.');
expect(screen.getByRole('status')).toHaveClass('font-bold');

act(() => result.current.notify({ tone: 'success', title: 'Saved', message: 'Profile saved.' }));
expect(screen.getByText('Saved')).toBeVisible();
expect(screen.getAllByRole('status')).toHaveLength(1);
```

Add fake-timer assertions for auto-dismiss, explicit close, reduced-motion classes, and a fourth notification evicting the oldest visible item.

- [ ] **Step 2: Run the focused web test and verify failure**

Run: `npm test -w @qr/web -- dashboard-identity-feedback`

Expected: FAIL because the components and provider are absent.

- [ ] **Step 3: Implement the primitives and mount the provider**

```ts
export interface DashboardToastInput {
  readonly tone: 'success' | 'error';
  readonly title: string;
  readonly message: string;
  readonly durationMs?: number;
}
```

Use stable generated IDs, timer cleanup on dismissal/unmount, one fixed viewport below the dashboard topbar, `aria-live="polite"` for success, `role="alert"` for errors, and visible dismiss labels. Wrap `DashboardLayout` content once so every dashboard form can call the hook.

- [ ] **Step 4: Run focused tests and type check**

Run: `npm test -w @qr/web -- dashboard-identity-feedback && npm run typecheck -w @qr/web`

Expected: PASS.

- [ ] **Step 5: Record checkpoint**

Checkpoint: `feat: add accessible dashboard form feedback`

### Task 3: Profile save feedback and immediate avatar refresh

**Files:**

- Modify: `apps/web/src/features/profiles/use-profile.ts`
- Modify: `apps/web/src/features/profiles/profile-page.tsx`
- Modify: `apps/web/src/features/profiles/student-profile-form.tsx`
- Modify: `apps/web/src/features/profiles/lecturer-profile-form.tsx`
- Test: `apps/web/test/profile-save.test.ts`
- Test: `apps/web/test/profile-flows.test.tsx`

**Interfaces:**

- Consumes: `updateUserPresentation`, `FormActionFeedback`, and `useDashboardToast` from Tasks 1-2.
- Produces: profile-save mutation result containing the authoritative `user.photoUrl` and role profile.

- [ ] **Step 1: Extend profile tests with immediate identity and local feedback assertions**

```ts
await result.current.save(values);
expect(useAuthStore.getState().user?.photoUrl).toBe(savedPhotoUrl);
expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['profile'] });

expect(screen.getByTestId('student-profile-actions')).toContainElement(
  screen.getByRole('status', { name: /profile saved/i }),
);
expect(screen.getByText('Profile and photograph saved successfully.')).toHaveClass('font-bold');
```

- [ ] **Step 2: Run profile tests and verify failure**

Run: `npm test -w @qr/web -- profile-save profile-flows`

Expected: FAIL because the auth store is not patched and feedback is outside the form action area.

- [ ] **Step 3: Implement save orchestration**

After the upload and role-profile request succeeds, return the refreshed profile response, patch `photoUrl`, invalidate/refetch `['profile']`, and emit one success toast. On failure, keep selected inputs and preview, derive the safe API message through `apiErrorMessage`, render it beside the submit button, and emit one error toast.

- [ ] **Step 4: Run focused tests and type check**

Run: `npm test -w @qr/web -- profile-save profile-flows dashboard-identity-feedback && npm run typecheck -w @qr/web`

Expected: PASS.

- [ ] **Step 5: Record checkpoint**

Checkpoint: `fix: reflect saved profile photos and feedback`

### Task 4: Tenant-owned institution logo API and settings control

**Files:**

- Modify: `packages/types/src/index.ts`
- Modify: `apps/api/src/models/media-asset.model.ts`
- Modify: `apps/api/src/models/university.model.ts`
- Modify: `apps/api/src/services/media-upload.service.ts`
- Modify: `apps/api/src/controllers/media-upload.controller.ts`
- Modify: `apps/api/src/routes/media-upload.route.ts`
- Modify: `apps/api/src/validators/settings.validator.ts`
- Modify: `apps/api/src/repositories/settings.repository.ts`
- Modify: `apps/api/src/services/settings.service.ts`
- Modify: `apps/api/src/controllers/settings.controller.ts`
- Modify: `apps/api/src/routes/settings.route.ts`
- Create: `apps/web/src/features/settings/institution-logo-field.tsx`
- Modify: `apps/web/src/features/settings/settings-page.tsx`
- Test: `apps/api/test/institution-branding.test.ts`
- Test: `apps/web/test/institution-branding.test.tsx`

**Interfaces:**

- Produces: `InstitutionSettings.logoAssetId?: string` alongside `logoUrl?: string`.
- Produces: `POST /uploads/institution-logo` for authenticated actors with `settings:write`.
- Produces: `PUT /settings/branding` body `{ logoAssetId: string | null; logoUrl?: string }`.
- Produces: `InstitutionLogoField({ current, disabled, onChange })`, where `current` and `onChange` use `{ assetId: string; url: string } | null`.

- [ ] **Step 1: Write failing permission, ownership, replacement, removal, and UI tests**

```ts
await request(app)
  .post('/api/v1/uploads/institution-logo')
  .set(studentHeaders)
  .send(png)
  .expect(403);
await request(app)
  .put('/api/v1/settings/branding')
  .set(adminHeaders)
  .send({
    logoAssetId: otherTenantAsset.id,
    logoUrl: otherTenantAsset.url,
  })
  .expect(422);
assert.equal((await UniversityModel.findById(universityId))?.logoAssetId, originalAssetId);

await user.upload(screen.getByLabelText(/institution logo/i), logoFile);
expect(screen.getByAltText(/selected institution logo/i)).toBeVisible();
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `cd apps/api && npx tsx --conditions=development --import ./test/setup.ts --test test/institution-branding.test.ts; cd ../..; npm test -w @qr/web -- institution-branding`

Expected: FAIL because the managed context, endpoint, model reference, and field do not exist.

- [ ] **Step 3: Implement managed branding persistence**

```ts
const updateInstitutionBrandingSchema = z.object({
  body: z
    .object({
      logoAssetId: z
        .string()
        .regex(/^[a-f\d]{24}$/i)
        .nullable(),
      logoUrl: z.string().url().max(2048).optional(),
    })
    .superRefine((value, ctx) => {
      if (value.logoAssetId && !value.logoUrl)
        ctx.addIssue({
          code: 'custom',
          path: ['logoUrl'],
          message: 'Uploaded logo URL is required.',
        });
    }),
});
```

Validate that a non-null asset is ready, from the same university, in `institution_logo`, has an allowed image type, and matches the submitted URL. Save the new association before retiring the old one. A retirement failure is logged and does not revert the active setting. Remove the manual Logo URL input from the general settings payload.

- [ ] **Step 4: Implement the dashboard upload field and feedback**

Reuse profile-photo selection conventions for preview cleanup, file details, 10 MB validation, replace/remove controls, dark mode, and accessible status. Use `FormActionFeedback` beside branding actions and one dashboard toast per result.

- [ ] **Step 5: Run focused tests and type checks**

Run: `cd apps/api && npx tsx --conditions=development --import ./test/setup.ts --test test/institution-branding.test.ts; cd ../..; npm test -w @qr/web -- institution-branding; npm run typecheck -w @qr/api; npm run typecheck -w @qr/web`

Expected: PASS.

- [ ] **Step 6: Record checkpoint**

Checkpoint: `feat: add secure institution logo management`

### Task 5: Trusted Cloudinary image resolution and immutable snapshot references

**Files:**

- Create: `apps/api/src/services/media-image-validation.ts`
- Create: `apps/api/src/services/trusted-media.service.ts`
- Modify: `apps/api/src/services/media-upload.service.ts`
- Modify: `apps/api/src/models/clearance-report.model.ts`
- Modify: `apps/api/src/repositories/clearance.repository.ts`
- Modify: `apps/api/src/services/clearance.service.ts`
- Modify: `packages/types/src/index.ts`
- Test: `apps/api/test/trusted-media.test.ts`
- Test: `apps/api/test/clearance.test.ts`

**Interfaces:**

- Produces: `isImageContent(mimeType: ImageMimeType, buffer: Buffer): boolean`.
- Produces: `trustedMediaService.resolveImage(input): Promise<ResolvedImage | undefined>`.
- `ResolveImageInput`: `{ universityId: string; assetId?: string; snapshotUrl?: string; contexts: readonly ('profile' | 'institution_logo')[] }`.
- `ResolvedImage`: `{ buffer: Buffer; mimeType: 'image/png' | 'image/jpeg'; source: 'asset' | 'legacy_snapshot' }`.
- Adds optional `logoAssetId` and `photoAssetId` inside new clearance snapshots and public detail types.

- [ ] **Step 1: Write failing resolver security tests**

```ts
assert.equal(
  await service.resolveImage({
    universityId,
    snapshotUrl: 'https://evil.test/a.png',
    contexts: ['institution_logo'],
  }),
  undefined,
);
await assert.doesNotReject(() =>
  service.resolveImage({ universityId, assetId, contexts: ['institution_logo'] }),
);
assert.equal(
  await service.resolveImage({
    universityId: otherUniversityId,
    assetId,
    contexts: ['institution_logo'],
  }),
  undefined,
);
```

Stub fetch to test timeout, redirect rejection, oversized content length/body, content-type mismatch, bad signature, configured-cloud-name mismatch, and WebP normalization to a validated Cloudinary PNG derivative.

- [ ] **Step 2: Run resolver tests and verify failure**

Run: `cd apps/api && npx tsx --conditions=development --import ./test/setup.ts --test test/trusted-media.test.ts`

Expected: FAIL because the resolver and shared validator do not exist.

- [ ] **Step 3: Implement validation and trusted resolution**

Use `new URL`, require `https:`, require hostname `res.cloudinary.com`, require the first path segment to equal `environment.CLOUDINARY_CLOUD_NAME`, use `redirect: 'manual'`, `AbortSignal.timeout(5_000)`, reject declared or streamed bodies over 10 MB, and verify final bytes. For WebP, request a Cloudinary `f_png` derivative and validate it as PNG before returning it.

- [ ] **Step 4: Add managed IDs to new clearance snapshots without mutating old records**

Select `University.logoAssetId` and the role profile's `photoAssetId` from the existing source records, include them only when issuing a new snapshot, and preserve optional absence during serialization and integrity checks. Existing snapshot checksums continue using exactly their stored shape.

- [ ] **Step 5: Run focused tests and type check**

Run: `cd apps/api && npx tsx --conditions=development --import ./test/setup.ts --test test/trusted-media.test.ts test/clearance.test.ts; cd ../..; npm run typecheck -w @qr/api`

Expected: PASS.

- [ ] **Step 6: Record checkpoint**

Checkpoint: `feat: resolve trusted export media securely`

### Task 6: Branded clearance PDF and spreadsheet output

**Files:**

- Modify: `apps/api/src/services/clearance-export.service.ts`
- Modify: `apps/api/src/controllers/clearance.controller.ts`
- Modify: `apps/api/test/clearance-export.fixture.ts`
- Modify: `apps/api/test/clearance.test.ts`
- Test: `apps/api/test/branded-exports.test.ts`

**Interfaces:**

- Consumes: `trustedMediaService.resolveImage` from Task 5.
- Changes: `clearanceExportService.pdf(report, { universityId }): Promise<Buffer>`.
- Changes: `clearanceExportService.excel(report, { universityId }): Promise<Buffer>`.
- Leaves: `clearanceExportService.csv(report): string` image-free and schema-compatible.

- [ ] **Step 1: Write failing branded export tests**

```ts
const pdf = await clearanceExportService.pdf(report, { universityId });
assert.ok(pdf.subarray(0, 4).toString().startsWith('%PDF'));
assert.equal(resolveImage.mock.calls.length, 2);

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(await clearanceExportService.excel(report, { universityId }));
assert.ok(workbook.getImages().length >= 1);
```

Add a test proving resolver failure still produces a valid professional PDF and a test proving old URL-only Cloudinary snapshots use legacy compatibility resolution.

- [ ] **Step 2: Run export tests and verify failure**

Run: `cd apps/api && npx tsx --conditions=development --import ./test/setup.ts --test --test-name-pattern="branded clearance|media fallback" test/clearance.test.ts test/branded-exports.test.ts`

Expected: FAIL because HTTPS assets are not resolved or embedded.

- [ ] **Step 3: Implement async media preparation and renderer embedding**

Resolve the logo and headshot before opening PDFKit/ExcelJS render streams. Embed validated buffers in their current allocated regions, preserve aspect ratio, and use the existing Attendity wordmark/institution-name fallback when either image is unavailable. Pass `actor.universityId` from the authenticated controller.

- [ ] **Step 4: Run focused tests and type check**

Run: `cd apps/api && npx tsx --conditions=development --import ./test/setup.ts --test test/clearance.test.ts test/branded-exports.test.ts; cd ../..; npm run typecheck -w @qr/api`

Expected: PASS.

- [ ] **Step 5: Record checkpoint**

Checkpoint: `feat: brand clearance exports with managed media`

### Task 7: Brand QR, event, analytics, print, and image outputs

**Files:**

- Modify: `apps/api/src/services/attendance-qr-export.service.ts`
- Modify: `apps/api/src/services/attendance.service.ts`
- Modify: `apps/web/src/features/attendance/static-qr-poster.ts`
- Modify: `apps/web/src/features/portals/lecturer-workspace-page.tsx`
- Modify: `apps/api/src/services/event-export.service.ts`
- Modify: `apps/api/src/services/event.service.ts`
- Modify: `apps/api/src/controllers/event.controller.ts`
- Create: `apps/api/src/services/analytics-export.service.ts`
- Modify: `apps/api/src/controllers/analytics.controller.ts`
- Modify: `apps/api/src/routes/analytics.route.ts`
- Modify: `apps/api/src/validators/analytics.validator.ts`
- Modify: `apps/web/src/features/reports/reports-page.tsx`
- Modify: `apps/api/test/attendance.test.ts`
- Modify: `apps/api/test/events.test.ts`
- Modify: `apps/api/test/analytics.test.ts`
- Modify: `apps/web/test/lecturer-qr-modes.test.tsx`
- Create: `apps/web/test/branded-report-actions.test.tsx`
- Test: `apps/api/test/branded-exports.test.ts`

**Interfaces:**

- Adds optional `logo?: ResolvedImage` to server renderer inputs.
- Adds optional `logoUrl?: string` to `StaticQrPosterMetadata` for browser PNG/print output.
- Produces: `GET /analytics/reports/export?format=pdf|xlsx|csv&scope=...` with the same filters/permissions as `/analytics/reports`.
- Produces: `analyticsExportService.pdf(report, brandingImage?)`, `.excel(report, brandingImage?)`, and `.csv(report)`.

- [ ] **Step 1: Write failing renderer and route tests**

```ts
const result = await renderStaticAttendanceQrPdf({ ...input, logo: resolvedLogo });
assert.equal(result.subarray(0, 4).toString(), '%PDF');

await request(app)
  .get('/api/v1/analytics/reports/export?format=pdf&scope=university')
  .set(adminHeaders)
  .expect('Content-Type', /application\/pdf/)
  .expect(200);
```

Test that CSV contains institution name but no image bytes, rotating QR remains non-exportable, PNG canvas loads the logo with `crossOrigin = 'anonymous'` before setting `src`, and a logo-load failure still downloads/prints a valid poster.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `cd apps/api && npx tsx --conditions=development --import ./test/setup.ts --test test/attendance.test.ts test/events.test.ts test/analytics.test.ts test/branded-exports.test.ts; cd ../..; npm test -w @qr/web -- lecturer-qr-modes branded-report-actions`

Expected: FAIL because renderer branding inputs and analytics export route do not exist.

- [ ] **Step 3: Implement server-rendered branding**

Have attendance, event, and analytics services load their institution's managed branding and resolve it before invoking the format renderer. Keep renderer functions deterministic by passing resolved buffers explicitly. PDF and XLSX embed the image; CSV adds institution identity as text without changing required data columns.

- [ ] **Step 4: Implement branded browser PNG/print and report download actions**

Pass `settings.logoUrl` into static poster metadata. The poster image loader sets `crossOrigin = 'anonymous'` before `src`; it draws a bounded logo when available and continues with the existing wordmark if it fails. Add distinct PDF, Excel, and CSV buttons to the reports page using authenticated blob downloads and the established report/share button variants.

- [ ] **Step 5: Run focused tests and type checks**

Run: `cd apps/api && npx tsx --conditions=development --import ./test/setup.ts --test test/attendance.test.ts test/events.test.ts test/analytics.test.ts test/branded-exports.test.ts; cd ../..; npm test -w @qr/web -- lecturer-qr-modes branded-report-actions; npm run typecheck -w @qr/api; npm run typecheck -w @qr/web`

Expected: PASS.

- [ ] **Step 6: Record checkpoint**

Checkpoint: `feat: apply institution branding to generated outputs`

### Task 8: Migrate dashboard create/update/upload forms to shared feedback

**Files:**

- Modify: `apps/web/src/features/settings/settings-page.tsx`
- Modify: `apps/web/src/features/profiles/profile-page.tsx`
- Modify: `apps/web/src/features/auth/account-page.tsx`
- Modify: `apps/web/src/features/users/staff-invitation-dialog.tsx`
- Modify: `apps/web/src/features/users/user-management-page.tsx`
- Modify: `apps/web/src/features/academic/institution-structure-page.tsx`
- Modify: `apps/web/src/features/academic/academic-management-page.tsx`
- Modify: `apps/web/src/features/academic/class-schedules-page.tsx`
- Modify: `apps/web/src/features/academic/curriculum-management-page.tsx`
- Modify: `apps/web/src/features/registrations/registration-management-page.tsx`
- Modify: `apps/web/src/features/announcements/announcements-page.tsx`
- Modify: `apps/web/src/features/events/events-page.tsx`
- Modify: `apps/web/src/features/notifications/event-notification-preferences-panel.tsx`
- Create: `apps/web/test/dashboard-form-feedback-migration.test.tsx`
- Modify: the existing focused test file for each migrated feature when one already exists.

**Interfaces:**

- Consumes: `FormActionFeedback` and `useDashboardToast` from Task 2.
- Rule: editable form submissions get inline feedback and one toast; row actions get one toast and keep their existing row-local state; scanners, check-ins, export downloads, notification read/archive actions, and logout do not use generic form toasts.

- [ ] **Step 1: Add failing representative migration tests**

```tsx
await user.click(screen.getByRole('button', { name: /save institution settings/i }));
expect(await screen.findByRole('status')).toHaveTextContent(/settings saved/i);
expect(screen.getByTestId('settings-submit-panel')).toContainElement(screen.getByRole('status'));

server.use(
  http.post('/api/v1/staff-invitations', () => HttpResponse.json(errorEnvelope, { status: 409 })),
);
await user.click(screen.getByRole('button', { name: /send invitation/i }));
expect(await screen.findByRole('alert')).toHaveTextContent(errorEnvelope.message);
```

Cover one form from settings/profile, academic/registration, invitation/account, event/announcement, and notification preferences. Add a negative assertion that student and examiner scanner success produces only its specialized popup.

- [ ] **Step 2: Run migration tests and verify failure**

Run: `npm test -w @qr/web -- dashboard-form-feedback-migration student-check-in-feedback examiner-scanner-feedback`

Expected: FAIL because the selected forms do not share the feedback system.

- [ ] **Step 3: Migrate settings, profile, account, invitation, and user forms**

For each mutation, clear stale local state when a new submission begins, derive safe API text with `apiErrorMessage`, show `FormActionFeedback` inside the owning action panel, and notify once in `onSuccess`/`onError`. Preserve confirmation dialogs and permission checks.

- [ ] **Step 4: Migrate academic, registration, announcement, event, and preference forms**

Apply the same mutation lifecycle. Keep instant row operations local: publish/cancel/deactivate/review actions receive one result toast, while their tables retain row pending/disabled behavior. Do not route scanner, check-in, export, notification read/archive, or background mutation results through the generic provider.

- [ ] **Step 5: Run focused feature tests and type check**

Run: `npm test -w @qr/web -- dashboard-form-feedback-migration profile-flows staff-invitation academic-course-presentation admin-semantic-actions student-check-in-feedback examiner-scanner-feedback && npm run typecheck -w @qr/web`

Expected: PASS with no duplicate scanner notifications.

- [ ] **Step 6: Record checkpoint**

Checkpoint: `feat: standardize dashboard form feedback`

### Task 9: Focused regression, visual, security, and document verification

**Files:**

- Modify only files revealed by a failing focused check.
- Verify: all files and tests listed in Tasks 1-8.

**Interfaces:**

- Consumes all previous task deliverables.
- Produces a verified handoff with test counts, checked user flows, and any environment-specific limitations.

- [ ] **Step 1: Run the focused API suites together**

Run: `cd apps/api && npx tsx --conditions=development --import ./test/setup.ts --test test/auth-registration-login.test.ts test/profiles.test.ts test/institution-settings.test.ts test/institution-branding.test.ts test/trusted-media.test.ts test/clearance.test.ts test/attendance.test.ts test/events.test.ts test/analytics.test.ts test/branded-exports.test.ts`

Expected: PASS.

- [ ] **Step 2: Run the focused web suites together**

Run: `npm test -w @qr/web -- dashboard-identity-feedback institution-branding profile-save profile-flows dashboard-form-feedback-migration lecturer-qr-modes branded-report-actions student-check-in-feedback examiner-scanner-feedback`

Expected: PASS.

- [ ] **Step 3: Run affected type checks and security audit**

Run: `npm run typecheck -w @qr/api && npm run typecheck -w @qr/web && npm run typecheck -w @qr/types && npm run security:audit`

Expected: all type checks pass and no critical production dependency vulnerability is reported.

- [ ] **Step 4: Perform real local Cloudinary and document checks**

Using an administrator, upload/replace the institution logo; using a student or lecturer, upload a profile photo; confirm immediate header/avatar updates. Generate and inspect a clearance PDF/XLSX, static QR PDF/PNG/print view, event PDF/XLSX, analytics PDF/XLSX, and CSV text metadata. Confirm old clearance snapshots remain unchanged.

- [ ] **Step 5: Verify responsive, dark-mode, and accessibility behavior**

Check the profile page, branding settings, representative migrated forms, toast viewport, dashboard header, and report actions at desktop and 320 px width in both themes. Confirm keyboard focus, dismiss labels, live regions, non-overflowing previews, and reduced-motion behavior.

- [ ] **Step 6: Record final checkpoint**

Checkpoint: `test: verify dashboard feedback identity and branding`

## Completion Criteria

- Every acceptance criterion in `docs/superpowers/specs/2026-08-12-dashboard-feedback-profile-branding-design.md` is mapped to a task above.
- Profile identity updates without re-login and safely falls back to initials.
- Managed branding is tenant-owned, permission-protected, previewable, replaceable, and removable.
- Trusted media resolution rejects unsafe URLs and malformed/oversized content.
- Supported image-capable generated outputs contain current institution branding; clearance history remains immutable.
- Applicable dashboard forms use consistent inline and popup feedback without duplicating scanner/check-in notices.
- Focused tests, affected type checks, security audit, and local visual/document verification pass.
