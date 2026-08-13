# Attendity design QA

## Comparison target

- Source visual truth: `C:\Users\HomePC\Documents\3MTT\Capstone Project\ChatGPT Image Jul 30, 2026, 07_09_53 AM.png`
- Supporting source visuals: `C:\Users\HomePC\Documents\3MTT\Capstone Project\Screenshot 2026-07-30 074736.jpg` and `C:\Users\HomePC\Documents\3MTT\Capstone Project\Screenshot 2026-07-30 at 06-59-41 QR Attendance Management System Behance.png`
- Rendered implementation: `C:\Users\HomePC\Documents\3MTT\Capstone Project\qr-attendance-system\design-qa-desktop.png`
- Route: Attendity landing home page
- State: light theme, initial page state

## Capture details

- Browser: Codex in-app browser
- Requested desktop viewport: 1440 × 1000 CSS pixels
- Measured document viewport: 1425 CSS pixels wide after scrollbar allocation
- Measured page height: 11,250 CSS pixels
- Device density: 1
- Source dimensions: primary reference 1536 × 1024 pixels
- Implementation screenshot: full-page browser capture; exact encoded pixel dimensions could not be re-read after the Windows preview runner stopped responding
- Density normalization: source and implementation were reviewed at their native density because the references communicate direction rather than a pixel-identical landing-page composition

## Full-view comparison evidence

The implementation carries over the references' strongest qualities—high-contrast navigation, structured academic information, clear green attendance states, dark navy institutional surfaces, rounded but restrained panels, and real campus/student imagery—without copying their dashboard layouts onto the public marketing site. The hero uses a two-column editorial composition, mature forest green, navy, and restrained gold accents. The new photography is sharp, correctly cropped, and loaded at 1536 × 1024 pixels.

The first full-page capture exhibited repeated viewport tiles during screenshot stitching. DOM evidence showed a single document with 20 sections, a 1:1 client/scroll width of 1425 pixels, and no horizontal overflow, so the repetition is classified as a capture-tool defect rather than duplicated page markup.

## Focused-region comparison evidence

The hero was readable in the captured viewport: the Attendity brand, academic value proposition, CTAs, campus image, supporting seminar image, and trust indicators all formed a clear hierarchy. The generated imagery matched the requested premium university/student art direction. A second focused capture and mobile capture could not be completed because the Windows browser-preview runner became unavailable after the first capture.

## Required fidelity surfaces

- Fonts and typography: strong display hierarchy, readable body copy, balanced line lengths, and consistent uppercase kicker treatment were visible in the captured hero.
- Spacing and layout rhythm: the desktop hero maintained a balanced two-column composition with generous whitespace and aligned CTAs; DOM measurement found no horizontal overflow.
- Colours and tokens: mature forest green, institutional navy, and restrained gold are consistently used; automated compliance confirms no prohibited gradient backgrounds in the landing stylesheet or shared button variants.
- Image quality and asset fidelity: all three approved original visuals load at 1536 × 1024 pixels with descriptive alternative text and role-appropriate crops.
- Copy and content: language is university-specific, professional, and centred on attendance, learning, academic integrity, and future growth.
- Responsiveness and accessibility: automated component coverage confirms accessible hash navigation, keyboard-operable product-demo tabs, reduced-motion handling, and carousel controls; a browser-rendered mobile evidence capture remains unavailable.

## Findings

- [P2] Mobile browser-rendered evidence is unavailable.
  - Location: landing page at the mobile breakpoint and the embedded phone preview.
  - Evidence: responsive containment rules and automated tests pass, but the browser-preview runner stopped responding before the mobile screenshot could be captured.
  - Impact: the final visual containment of the phone mockup cannot be independently certified from rendered evidence in this QA run.
  - Fix: repeat the 390 × 844 browser capture when the preview runner is available and compare the phone frame, navigation menu, CTAs, and section stacking against the references.

## Comparison history

- Pass 1: desktop full-page capture completed; no horizontal overflow or missing approved imagery was found. Screenshot stitching repeated the viewport, identified as a capture-tool defect through DOM measurements.
- Pass 2: attempted focused desktop and mobile capture; blocked when the local browser-preview runner became unavailable. No implementation change was made in response because no page-level defect was established.

## Primary interactions tested

- In-page `Explore Attendity` navigation and focus transfer
- Viewport-triggered product demonstration playback
- Keyboard navigation for product-demo tabs
- FAQ search filtering
- Authentication layout rendering while preserving existing login and registration handlers

## Console errors checked

The production builds completed successfully. Browser console retrieval was interrupted by the same preview-runner failure; automated unit and integration suites pass.

## Implementation checklist

- [x] Use all three approved Attendity university/student visuals
- [x] Preserve mature solid brand colours without gradient backgrounds
- [x] Confirm desktop document has no horizontal overflow
- [x] Confirm automated accessibility and interaction coverage
- [ ] Capture and visually certify the mobile breakpoint when the browser runner is available

## Final result

final result: blocked

Blocker: the final mobile and focused browser-rendered comparison could not be captured after the Windows preview runner became unavailable.
