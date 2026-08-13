# Examiner Clearance Scanner Integrity Repair

## Problem

The printed clearance QR in `ACL-20260812-6E0D9A9192.pdf` is visually legible and decodes successfully with Attendity's `html5-qrcode` library. Its verification URL resolves to the correct clearance report. An authenticated examiner lookup reaches the API but returns `tampered`.

Generation currently hashes a `CourseEligibility` object containing helper fields such as `registrationId`, `courseId`, and course labels. The strict clearance-report schema intentionally omits those helper fields from `snapshot.statistics`. Verification hashes the stored schema-shaped snapshot, so its checksum differs from the checksum created before persistence.

The examiner scanner also renders verification feedback below the scanner area. A user can therefore see an active camera with no nearby acknowledgement while a QR is being detected or verified.

## Approved Approach

### Canonical signed snapshot

Create clearance statistics explicitly from only the fields defined by the persisted clearance-report schema. Build the report payload from that canonical snapshot before calculating its checksum and digital signature. The object signed during generation must therefore have the same shape and values as the object loaded for verification.

Keep the existing HMAC signature, source-data hash, transaction, tenant restrictions, and server-side eligibility calculation unchanged.

### Invalid existing reports

Before reusing an existing valid report with an unchanged source-data hash, verify its checksum and digital signature. Reuse it only when both checks pass. If integrity fails, generation must proceed through the existing transaction, which expires the earlier valid report and creates a new signed version.

The existing affected demonstration report will be replaced through the authenticated generation workflow after the repair. No checksum will be rewritten in place, and no invalid historical report will be silently treated as valid.

### Examiner scanner feedback

Keep continuous scanning enabled. Show scanner-local feedback for these states:

- Camera active: instruct the examiner to align and hold the printed QR steady.
- QR detected and server check pending: show a visible progress status.
- Verified: show a prominent green confirmation with the report ID or student context.
- Rejected: show a prominent red integrity/status result.
- Request failure: show a sanitized retry message inside the scanner card.

Detailed verification results and recent-check history remain in their existing sections. Scanner-local feedback supplements rather than replaces those records.

## Security and Data Rules

- Do not weaken checksum or HMAC verification.
- Do not accept the printed decision without a live valid server response.
- Do not mutate an invalid report's stored checksum or signature.
- Do not expose stack traces, database errors, secrets, or internal identifiers in browser feedback.
- Preserve tenant isolation and examiner authorization.
- Continue deduplicating rapid repeated scans while allowing continuous admission checks.

## Focused Verification

1. Add a failing API test proving that a report signed from the canonical snapshot still passes integrity after Mongoose schema casting and hydration.
2. Add a failing test proving an integrity-invalid current report is not eligible for reuse.
3. Add a failing examiner UI test covering pending, verified, rejected, and error feedback inside the scanner card.
4. Confirm the tests fail for the identified reasons before implementation.
5. Implement the minimal canonicalization, integrity-reuse guard, and scanner feedback changes.
6. Run the focused API and web tests plus affected workspace type checks.
7. Generate a new report through the running API, decode its exported PDF QR with Attendity's QR library, and verify it through an authenticated examiner request.
8. Confirm the new report returns `verified: true`, persists as valid, and provides a valid PDF.

## Scope

This repair is limited to clearance snapshot integrity, safe report reuse, and examiner scanner feedback. It does not redesign attendance QR scanning, alter eligibility thresholds, relax report security, or change unrelated dashboards.

## Approved Scanner Completion Extension

### Close after server response

The examiner scanner remains open while the decoded QR is being checked. When the verification request settles, the examiner page sends a controlled close signal to the shared scanner. The camera must close for verified, rejected, and request-error outcomes. It must not close merely because a QR was detected, because the pending state needs to remain honest until the server responds.

The completed outcome remains visible inside the closed scanner card. Opening the scanner again clears the previous transient popup and allows a fresh admission check.

### Popup announcement

Show a fixed bottom-right popup using the established Student Scanner notification treatment:

- Verified: green verified shield/badge styling and the report ID when available.
- Rejected: red shield/error styling and the server-provided warning or report status.
- Request error: red error styling with only the sanitized API message.

Each popup uses an appropriate accessible `status` or `alert` role, includes a manual close control, and dismisses automatically after five seconds.

### Independent cards

The desktop scanner/search grid aligns its children to the start rather than stretching both grid items to the same row height. Each card also self-aligns to the start. Opening the camera can therefore expand only the Continuous Clearance Scanner card; Search the Archive retains its own content-driven height.

### Extension verification

Focused tests must prove that a settled verification closes and cleans up the scanner, the correct popup appears for verified/rejected/error outcomes, the popup can be dismissed and auto-dismisses, the in-card result remains available, and the grid/cards use independent start alignment.
