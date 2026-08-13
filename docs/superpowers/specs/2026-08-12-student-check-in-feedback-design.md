# Student check-in card feedback design

## Objective

Make the student QR scanner and manual check-in areas visually distinctive, communicate the result within the card that initiated the request, and reinforce a successful attendance record with a compact verified notification.

## Visual treatment

- The QR scanner card uses an emerald and teal surface, stronger borders, a restrained decorative glow, and high-contrast light and dark mode text.
- The manual entry card uses an amber and gold surface with the same visual depth and dark mode guarantees.
- Both cards retain the existing Attendity dashboard spacing, radius, typography, button, and icon conventions.
- Decorative styling must not interfere with camera controls, form labels, keyboard navigation, or small-screen layouts.

## Feedback behavior

- Each check-in attempt records its origin as either `scanner` or `manual` before verification begins.
- Verification, face-enrolment requirements, successful check-in, and request errors render inside the originating card.
- Success feedback uses a bold emerald panel with a verified icon. Errors use a bold red panel and verification instructions use an informational blue panel.
- Feedback is announced through an accessible live region without moving focus.
- The existing attendance API requests and validation behavior remain unchanged.

## Success notification

- A successful attendance record also opens a compact fixed notification at the bottom-right of the viewport.
- The notification includes a verified badge icon, a clear success heading, and the attendance confirmation text.
- It dismisses automatically after five seconds and also provides an explicit close button.
- Repeated successful check-ins restart the dismissal timer so the newest result remains readable.
- The notification remains within the viewport on mobile and respects light and dark mode contrast.

## Component boundaries

- `QrScanner` accepts optional feedback content so scanner results can appear within its existing card rather than in a separate duplicate wrapper.
- `StudentWorkspacePage` owns request-origin state and the success notification because it coordinates scanner, manual entry, face verification, and API mutations.
- A small local feedback renderer maps message type to consistent icon, color, and accessibility treatment without altering shared application-wide notification behavior.

## Testing

- A student workspace test verifies that a scanned check-in success appears in the scanner card and opens the verified notification.
- A second test verifies that a manual check-in failure appears only in the manual-entry card.
- Existing QR scanner reliability tests continue to verify camera setup and scan dispatch behavior.
- Focused TypeScript, lint, formatting, and affected UI tests must pass.
