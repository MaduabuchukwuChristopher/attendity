# Attendity Dashboard Feedback, Profile Identity, and Institution Branding Design

**Date:** 2026-08-12
**Status:** Approved design; awaiting written-spec approval

## Objective

Ensure saved profile photographs appear immediately wherever dashboard identity is shown, standardize clear inline and popup feedback across dashboard data-entry forms, and provide secure institution-logo management whose branding is carried into Attendity's supported PDFs, images, printed documents, and spreadsheets.

The implementation must preserve the established monorepo, role permissions, tenant isolation, authentication boundaries, Cloudinary storage, historical clearance integrity, export behavior, accessibility, dark-mode styling, and all existing scanner and attendance workflows.

## Confirmed Problems

1. Profile photos are successfully stored in Cloudinary and referenced by the saved profile, but the authenticated dashboard identity contains no photo URL. The dashboard header therefore continues to render initials after a successful save.
2. Profile and settings pages use isolated success/error text, often far from the submit control. Similar create, update, configure, invite, and upload forms provide inconsistent feedback.
3. Institution settings currently accept only a manually entered logo URL. They do not provide a secure upload, preview, replacement, removal, or tenant-owned asset relationship.
4. Clearance export recognizes only base64 data-image values. Cloudinary HTTPS URLs for student photographs and institution logos are therefore omitted from generated PDFs.
5. Other export services either receive no branding information or do not have a shared, secure mechanism for resolving stored image assets.

## Chosen Architecture

The work will use shared, narrowly scoped primitives rather than page-specific patches or a global network interceptor:

- an authenticated-user identity extension and reusable avatar;
- a shared inline form-feedback component;
- a dashboard toast provider and hook;
- a reusable institution-logo upload field;
- tenant-owned institution-logo media records;
- a server-side trusted-media resolver for generated documents;
- branding inputs added to the existing export boundaries that can render images.

A global network interceptor is intentionally excluded because it cannot distinguish user-submitted forms from background refreshes, scanners, and polling. Existing specialized scanner/check-in notices remain independent to prevent duplicate messages.

## Profile Identity Synchronization

### Authentication response

Add an optional `photoUrl` field to the authenticated-user response type and the API's user serializer. The field is presentation data only. JWT access and refresh claims remain limited to the existing security identity fields and will not include the image URL.

### Client state

The authentication store will expose a typed method for patching presentation-safe user fields after a successful account/profile update. The student or lecturer profile save operation will update this identity from the authoritative saved response and refresh the relevant profile query. This makes the new photograph visible immediately without signing out or reloading.

### Display surfaces

A reusable user-avatar component will render the stored photograph in dashboard identity surfaces, including the dashboard header/account area, and retain initials as a deterministic fallback when no photograph exists or loading fails. The profile form continues showing both the current saved image and any pending local preview.

The sidebar's institutional brand mark remains an institution/product identity and will not be incorrectly replaced by a personal photograph. Any sidebar account summary that already represents the signed-in person may use the shared avatar.

## Shared Dashboard Form Feedback

### Inline feedback

Create a `FormActionFeedback` primitive for the form's local success or failure state. It will:

- appear in the same card or panel, adjacent to the submit/action area;
- use bold, readable text and a clear success or error icon;
- preserve actionable safe messages returned by the API;
- use explicit light- and dark-mode surfaces;
- expose status changes through an accessible live region;
- retain the message until the user retries, edits the relevant form, dismisses it where supported, or navigates away.

### Popup feedback

Add one dashboard-level toast provider so forms can announce completion without implementing their own popup. Toasts will:

- show a verified badge for success and a distinct error icon for failure;
- display a short heading and safe message;
- be keyboard accessible and manually dismissible;
- auto-dismiss after approximately five seconds;
- limit the visible queue to three items;
- use an accessible live region without stealing focus.

Successful and failed form submissions will normally produce both local inline feedback and one toast. Local feedback provides durable context; the popup confirms the result even when the submit area is partly outside the viewport.

### Migration scope

The shared feedback behavior applies to mutation-backed dashboard forms that create, edit, save, configure, invite, or upload information, including:

- student, lecturer, examiner, and administrator profile/account forms where present;
- institution and dashboard settings;
- institution branding;
- courses, academic structures, class/session configuration, and related administrative forms;
- events, invitations, reminders, announcements, and comparable management forms.

Instant scanner/check-in feedback, continuous scanning, logout, background refreshes, read-only exports, and specialized confirmation dialogs retain their current domain-specific feedback unless they directly contain an editable submission form. This boundary prevents duplicate or misleading notifications.

## Institution Logo Management

### Dashboard experience

Institution administrators will receive a dedicated Institution Branding area in settings. The logo field will:

- show the currently saved logo;
- validate and preview a newly selected image before upload;
- show filename, size, and selection state;
- accept JPEG, PNG, or WebP images up to 10 MB;
- support replacement and removal;
- disable conflicting actions while saving;
- use the shared inline and popup feedback system.

The administrator will not need to copy a public URL manually. Existing manually stored logo URLs remain readable for backward compatibility but are migrated to managed assets when replaced through the new control.

### API and persistence

Extend the existing media system with an `institution_logo` context. Logo upload requires authentication plus the existing institution-settings write permission. The server will keep its current MIME, size, binary-signature, Cloudinary provenance, and tenant checks.

The university record will store both:

- a tenant-owned media-asset reference used for authorization and secure resolution; and
- the secure delivery URL used by ordinary web presentation and backward-compatible consumers.

The settings update accepts only an active logo asset owned by the same institution and created in the institution-logo context. It cannot attach another institution's asset or an arbitrary external URL.

Replacement is transactional at the application level: the existing logo remains active until the new upload and settings update both succeed. After a successful replacement or removal, the previous association is retired. Cleanup failure must not roll back the newly saved setting and can be retried safely.

## Secure Export Media Resolution

Generated documents need binary image data, not merely a Cloudinary URL. Add a server-side trusted-media resolver with the following contract:

1. Resolve the asset through its stored tenant-owned media reference where available.
2. Verify that the asset is active, belongs to the requested institution, and has an allowed context.
3. Fetch only HTTPS URLs on the configured Cloudinary delivery host/cloud namespace.
4. Enforce a short timeout, redirect restrictions, a 10 MB response ceiling, an allowed content type, and a matching image signature.
5. Return an image buffer and format, or a typed non-fatal media-unavailable result.

The resolver will never fetch arbitrary administrator-entered URLs. For legacy issued records that contain only a snapshot URL, compatibility resolution is permitted only when the URL matches the configured Cloudinary account and passes the same network and image checks. This closes the server-side request-forgery boundary while preserving existing valid records.

Exports remain usable if optional branding cannot be loaded: they fall back to a typography-based Attendity/institution header and omit the unavailable photograph. Export failure is reserved for required report data or document-generation errors, not an optional decorative image.

## Branding Across Generated Outputs

Branding data will be added to existing export inputs rather than read through hidden global state. Supported outputs include:

- student attendance-clearance PDFs and image-bearing spreadsheet formats;
- printable/downloadable static attendance QR PDFs and images;
- event attendance PDFs and image-bearing spreadsheets;
- analytics and attendance PDF/spreadsheet reports;
- other existing printable or downloadable outputs whose format supports an embedded image.

Student photographs will be resolved through the same trusted-media path and embedded where the current document design allocates a headshot.

CSV is a plain-text format and cannot embed a logo. CSV exports will retain institution-identifying text and may include an approved logo URL as metadata only when the existing schema has an appropriate metadata section. The URL will not replace required tabular fields.

Browser print actions will print the branded generated document or printable view; they will not independently fetch untrusted images in the browser.

## Historical Integrity

Previously issued attendance-clearance reports remain immutable. Their institution name, logo snapshot, student identity, and photo snapshot continue to represent the issuance time. New clearance reports snapshot the current approved institution logo and student photograph, including sufficient managed-asset identity for secure export resolution.

Operational exports that are not immutable records use the current institution branding when generated. Updating the logo therefore affects future QR sheets, event reports, analytics reports, and similar outputs but does not rewrite previously issued clearance records.

## Data Flow

### Profile save

1. User selects a valid profile image and sees a local preview.
2. Attendity uploads it through the authenticated profile-media endpoint.
3. The role-specific profile form saves the returned tenant-owned asset reference and secure URL.
4. The API returns the authoritative updated profile/user presentation data.
5. The page refreshes the profile query and patches authenticated-user presentation state.
6. The form shows bold inline success, the dashboard shows one verified popup, and all subscribed avatar surfaces update immediately.

### Institution logo save

1. Authorized administrator selects and previews a valid logo.
2. Attendity uploads it through the institution-logo media endpoint.
3. Settings update validates ownership/context and associates the asset with the university.
4. Settings and branding queries refresh.
5. The form shows local feedback and a popup; future generated outputs receive the new branding reference.

### Document generation

1. The export service loads the authorized report and institution branding context.
2. The trusted-media resolver obtains validated image buffers for the logo and optional subject photograph.
3. The format-specific renderer embeds supported images and applies the established Attendity typography/colors.
4. The existing authenticated download/print response is returned.

## Error Handling

- Invalid or oversized image: reject before upload where possible and repeat validation on the server.
- Upload failure: retain the local preview and entered form values, show the actual safe error beside the form, and permit retry.
- Profile/settings update failure after upload: do not change current user/branding state; report the failure and permit retry with the uploaded asset where safe.
- Cross-tenant, wrong-context, inactive, or missing logo asset: reject with a permission or validation response and keep the current logo.
- Image retrieval timeout or invalid response during export: use the no-image fallback while logging a privacy-safe diagnostic.
- Required export-data failure: return the existing structured API error and show it through the relevant download action.
- Toast rendering failure cannot suppress the inline form result; inline feedback is the durable source.

## Security and Privacy

- Cloudinary credentials remain server-side.
- The browser uploads only to authenticated Attendity endpoints.
- Profile and logo endpoints preserve rate limiting, image signature checks, file-size checks, and tenant ownership.
- Logo management requires institution-settings write permission; students and lecturers cannot change institution branding.
- Profile-photo updates remain limited to the authenticated user's permitted profile flow or an existing authorized administrative flow.
- JWT claims are unchanged; presentation URLs are not trusted as authorization data.
- The export resolver uses an explicit Cloudinary allowlist and never performs unrestricted URL fetching.
- Logs contain identifiers and failure categories rather than image bytes, tokens, or personal document contents.

## Accessibility and Presentation

- Inline messages use both iconography and text; meaning never depends on color alone.
- Success, error, pending, remove, and upload controls remain keyboard accessible with visible focus states.
- Toasts use appropriate live-region urgency and do not move focus unexpectedly.
- Avatar and logo images have meaningful alternative text where informative and empty alternative text where decorative.
- Image previews are responsive and do not overflow small dashboard cards.
- All feedback, upload fields, and toast surfaces have explicit dark-mode colors and contrast.
- Reduced-motion preferences are respected by toast transitions.

## Focused Verification

Tests will be written before implementation and limited to affected packages and flows unless a shared change reveals wider risk.

### API and service tests

- Authenticated-user responses include optional profile-photo presentation data while JWT claims remain unchanged.
- Institution-logo upload enforces authentication, permission, tenant ownership, media context, type, signature, and size.
- Logo replacement preserves the current logo when association fails.
- Trusted-media resolution accepts managed images from the configured Cloudinary account.
- It rejects external hosts, mismatched cloud namespaces, redirects outside the allowlist, invalid signatures, oversized responses, and timeouts.
- Clearance exports embed valid Cloudinary logo/headshot buffers and retain a safe no-image fallback.
- New clearance snapshots contain the current managed branding references; old reports remain unchanged.
- QR, event, analytics, and attendance renderers receive and apply branding in image-capable formats.

### Web tests

- Saving a profile patches authenticated identity and updates the dashboard avatar immediately.
- The avatar falls back to initials when the photo is absent or fails to load.
- Profile and branding upload fields show current image, pending preview, file details, clear/replace state, and validation feedback.
- Shared inline feedback is bold, adjacent to the submit area, dark-mode safe, and accessible.
- Successful and failed form submissions produce one appropriate popup and preserve local feedback.
- The dashboard toast queue, dismissal, auto-dismissal, and maximum visible count behave predictably.
- Representative forms from each migration family use the shared feedback path.
- Existing scanner/check-in notices do not produce duplicate generic form toasts.

### Focused operational checks

- Save a real Cloudinary profile photo and confirm it appears in the profile and dashboard identity surfaces without re-login.
- Upload and replace an institution logo as an administrator.
- Generate and visually inspect one clearance PDF, one static QR output, one event/attendance report, and one spreadsheet format that supports images.
- Confirm CSV remains valid text and identifies the institution appropriately.
- Verify affected pages in light and dark modes at desktop and narrow widths.

## Rollout and Compatibility

Database additions are optional and backward compatible. Existing users without photos continue using initials. Existing institutions without managed logo assets continue using their current name and, where safe and compatible, an existing Cloudinary logo URL. No destructive bulk migration is required.

The implementation will migrate dashboard forms in coherent groups after the shared primitives are stable. Each group will retain its existing permissions and business logic; only feedback orchestration and presentation are centralized.

## Out of Scope

- Replacing Cloudinary or exposing direct unsigned browser-to-Cloudinary uploads.
- Rebranding Attendity again or redesigning unrelated dashboard content.
- Adding new user roles or changing registration/authentication policy.
- Rewriting export formats that do not currently exist.
- Embedding binary images in CSV files.
- Mutating previously issued clearance records to use a newer logo or photograph.
- Sending form-result notifications through email, SMS, or push services.

## Acceptance Criteria

- A successfully saved profile picture appears immediately in every personal dashboard identity surface that supports an avatar, without re-login.
- Profile and other applicable dashboard forms show bold local feedback beside their action area and one accessible success/error popup.
- Specialized scanner and check-in feedback remains independent and non-duplicated.
- An authorized institution administrator can preview, upload, replace, and remove the institution logo; unauthorized and cross-tenant attempts fail safely.
- The current institution logo appears in supported newly generated PDFs, printable/downloadable static QR outputs, event and analytics reports, and image-capable spreadsheets.
- Student photographs and institution logos stored as Cloudinary URLs render in newly generated clearance PDFs.
- Previously issued clearance records retain their issuance-time snapshots.
- Optional media retrieval failure produces a professional fallback rather than a broken document.
- All affected controls and feedback remain readable and usable in light mode, dark mode, and narrow layouts.
- Focused affected tests and TypeScript checks pass.
