# Attendity Marketing and Authentication Redesign

## Purpose

Elevate Attendity into a polished university technology brand while preserving the working monorepo, API integrations, authentication flows, route architecture, accessibility, dark theme, and strict TypeScript standards.

## Approved visual direction

The redesign uses all three approved original AI-generated editorial images:

1. A diverse student group approaching a premium contemporary campus as the flagship landing-page hero.
2. A collaborative university seminar as the features, About, and academic-story visual.
3. A student using a smartphone at a lecture theatre entrance as the mobile-attendance, pricing, and authentication visual.

The product remains green-and-white first, with mature forest green (`#0B6B4F`), deep academic navy (`#0B2638`), warm ivory, sandstone, and restrained antique gold (`#C99A2E`). Background gradients are prohibited. Richness comes from photography, solid color blocking, typography, layering, borders, and restrained shadows.

## Landing-page experience

- Replace the current transparent-first navigation with a premium floating bar over the hero. It uses a light translucent surface at the top and changes to a solid deep academic navy theme after scrolling, while retaining strong contrast and keyboard focus.
- Restore explicit green fills and white text to all primary CTA states.
- Make `Explore Attendity` smoothly scroll to `#product-demo` and move focus to the target for keyboard users.
- Use the new campus image as the main hero artwork, with realistic crop handling at desktop, tablet, and mobile widths.
- Move “Attendity in every pocket” above “See how Attendity works.” Keep the phone preview entirely inside its device frame at all breakpoints.
- Start and reset the product walkthrough when the section enters the viewport. Pause only while the user is directly interacting with the walkthrough and respect reduced-motion settings.
- Strengthen all section headings with a reusable title treatment using solid green, navy, and gold—not gradients.
- Expand the academic principles to ten original attendance and learning quotations. Present them as an accessible, auto-advancing carousel that starts when visible, includes previous/next controls and position indicators, pauses during interaction, and respects reduced motion.

## Supporting marketing pages

- Features: replace the simple six-card wall with six alternating explanatory feature stories, icon-led details, product evidence, and the collaborative-learning image. Cards remain supporting elements rather than the whole page.
- Solutions: use a balanced five-role constellation on large screens with Institution Leadership as the central anchor and four role cards around it; collapse to a readable single column on mobile.
- Pricing: turn Institutional Demonstration into a two-column planning experience with the mobile-attendance image, scoped planning steps, included review items, and a prominent contact CTA.
- Contact: keep the existing API submission behavior and honeypot, but redesign the form as a premium conversion surface with clear grouping, richer focus/success/error states, and a stronger Implementation Desk card.
- About: add the founding scenario, mission, operating principles, academic quotes, and collaborative-learning imagery without making unsupported customer claims.
- FAQ: expand to at least twelve practical questions, retain search, add topic grouping, and include premium campus imagery.
- Privacy and Terms: expand into professional, clearly structured policy documents with effective date, scope, roles, security, retention, rights, acceptable use, service availability, liability, and contact guidance. Avoid claims not supported by the system.

## Authentication experience

- Preserve all login and registration requests, validation, session handling, navigation, success/error states, and accessibility.
- Use the lecture-theatre mobile-attendance image as the large-screen story panel.
- Add a richer solid-color form shell, clearer hierarchy, improved field rhythm, stronger submit button, responsive mobile composition, and consistent dark-theme treatment.
- Apply the shared AuthLayout improvements to password recovery and email-verification flows without changing their business behavior.

## Motion and accessibility

- Use Framer Motion and CSS transitions for entrance, navigation-theme, image, card, carousel, and CTA feedback.
- Never animate essential information in a way that blocks use. All continuous animation stops under `prefers-reduced-motion`.
- Preserve keyboard navigation, visible focus, semantic headings, landmark structure, live regions, form labels, sufficient contrast, and zero horizontal overflow.

## Verification

- Add failing behavioral tests before changes for hash navigation and viewport-triggered walkthrough behavior.
- Add component tests for quote carousel controls and expanded FAQ search.
- Run landing and web tests, typechecks, builds, lint/format checks available in the monorepo, and responsive browser QA.
- Verify primary navigation, `Explore Attendity`, walkthrough controls, contact form states, login, and registration at desktop and mobile sizes.
