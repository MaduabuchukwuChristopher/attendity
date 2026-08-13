# Independent Student Cards and Export Action Colors

## Goals

1. Opening the Student Dashboard QR scanner must not stretch the adjacent Manual Entry card.
2. Generating clearance for an eligible course must not stretch neighboring Not Eligible course cards.
3. Report, export, print, and share actions must use bright, distinct, consistent colors across applicable dashboards and subpages.

## Student Card Layout

The Student Dashboard scanner/manual-entry grid aligns its items to the start. Both cards self-align to the start and keep content-driven heights. Opening the QR camera expands only the Scan the Live QR card. Manual Entry retains its natural height and remains visually independent.

The shared QR scanner already self-aligns after the examiner repair. Add `items-start` to the student grid and `self-start` to Manual Entry. Do not alter scanning, manual check-in, feedback, or responsive stacking behavior.

## Clearance Course Card Layout

The Attendance Clearance course grid also aligns items to the start. Every course card self-aligns to the start and retains a content-driven height. When an eligible course such as CSC 405 gains generation feedback and Download PDF / Print PDF controls, only that course card expands. Adjacent Not Eligible cards must retain their natural height.

Do not equalize card heights, hide generation feedback, overlay export controls, or alter the responsive column count. Preserve eligibility colors, decision badges, attendance statistics, and per-course feedback behavior.

## Shared Action Color Contract

Extend the shared Button component with reusable solid-color variants. Colors are assigned by action meaning and remain consistent wherever the action appears:

| Action                                    | Variant    | Visual color                      |
| ----------------------------------------- | ---------- | --------------------------------- |
| PDF download or general document download | `download` | Bright blue                       |
| Print, Print PDF, or Print QR             | `print`    | Vivid violet                      |
| Excel download                            | `excel`    | Emerald                           |
| CSV download                              | `csv`      | Amber-orange with dark foreground |
| Share verification/report                 | `share`    | Cyan-teal with dark foreground    |
| PNG or image download                     | `image`    | Rose                              |

Each variant provides a solid base background, readable foreground, darker hover state, visible focus ring, action-colored shadow, disabled opacity through the existing Button behavior, and dark-mode contrast. Do not introduce gradients.

Keep Attendity green for primary generation and approval actions. Keep danger red for destructive actions. Do not recolor unrelated navigation, form submission, authentication, CRUD, scanner-opening, or cancellation buttons.

## Affected Surfaces

- Student Attendance Clearance course-card PDF download and print actions.
- Clearance Report Archive PDF, Excel, CSV, Share, and Print actions.
- Lecturer Static QR export actions: PNG, PDF, and Print QR.
- Event report/export actions, including CSV and print controls in event details and analytics/report areas.
- Any directly matching report/export/share action discovered in the implementation audit.

## Accessibility

- Preserve visible text labels and matching icons.
- Preserve or add consistent icon-to-label spacing.
- Ensure focus rings remain visible against each action color.
- Ensure normal and dark-mode foreground/background combinations remain readable.
- Do not use color as the sole identifier; button labels and icons remain mandatory.

## Verification

1. Add a failing Student Dashboard test requiring start alignment on the scanner/manual-entry grid and Manual Entry card.
2. Add a failing Attendance Clearance test requiring start alignment on the course grid and every course card before and after generating an eligible course report.
3. Add failing shared Button tests for each new variant's stable semantic classes and readable foreground treatment.
4. Add failing feature tests requiring the correct variant on clearance, static QR, and event export controls.
5. Implement the minimal shared variants and apply them only to audited matching actions.
6. Run focused shared UI and web feature tests, then affected UI/web type checks and formatting.

## Scope

This change covers the Student Dashboard scanner/manual-entry card-stretch defect, the Attendance Clearance neighboring-course card-stretch defect, and visual treatment of report/export/print/share buttons. It does not change export payloads, file formats, report permissions, QR security, API behavior, or unrelated card layouts.
