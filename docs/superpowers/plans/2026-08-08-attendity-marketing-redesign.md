# Attendity Marketing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a visually exceptional, fully responsive Attendity marketing and authentication experience using the three approved original university images while preserving every working flow.

**Architecture:** Extend the existing React/Vite monorepo rather than introducing a new application. Keep shared behavior in focused landing components, preserve the current API-backed contact and authentication handlers, and express the richer visual system through the existing CSS/theme layers without gradients.

**Tech Stack:** React 19, strict TypeScript, React Router 7, Framer Motion, Lucide React, Tailwind CSS 4, Vitest, Testing Library, Vite.

## Global Constraints

- Preserve the established `apps/landing`, `apps/web`, and `packages/ui` architecture.
- University-only, English language, Nigerian academic terminology.
- White and mature green are primary colors; no gradient backgrounds.
- Preserve `createBrowserRouter`, working API behavior, dark theme, accessibility, and responsive layouts.
- Reuse existing components and types before creating new implementations.
- No placeholder content, duplicate code, horizontal scrolling, broken tests, TypeScript errors, or console logging.

---

### Task 1: Integrate and optimize approved image assets

**Files:**

- Create: `apps/landing/public/images/attendity-campus-premium.webp`
- Create: `apps/landing/public/images/attendity-learning-premium.webp`
- Create: `apps/landing/public/images/attendity-mobile-attendance-premium.webp`
- Create: `apps/web/public/images/attendity-mobile-attendance-premium.webp`

**Interfaces:**

- Consumes: the three approved Image Gen PNG results.
- Produces: stable project-local WebP paths used by landing and auth components.

- [ ] **Step 1: Verify source image dimensions and file sizes**

Run: `Get-Item C:\Users\HomePC\.codex\generated_images\019fb5fd-465c-72c3-9355-937cbaf78a19\exec-*.png | Select-Object Name,Length`

- [ ] **Step 2: Convert non-destructively to WebP**

Use ImageMagick when available and retain the generated PNG originals:

```powershell
magick input.png -strip -quality 86 output.webp
```

- [ ] **Step 3: Validate each generated WebP visually**

Open each asset and confirm the subject, crop safety, natural anatomy, palette, and absence of text or watermarks.

### Task 2: Restore CTA styling and implement reliable section navigation

**Files:**

- Modify: `apps/landing/test/animated-cta.test.tsx`
- Modify: `apps/landing/src/components/animated-cta.tsx`
- Modify: `apps/landing/src/styles.css`

**Interfaces:**

- Consumes: `AnimatedCtaProps.to`.
- Produces: reliable in-page scrolling for hash destinations while preserving router links and disabled/loading behavior.

- [ ] **Step 1: Write a failing hash-navigation test**

```tsx
it('scrolls to and focuses an in-page destination', () => {
  const target = document.createElement('section');
  target.id = 'product-demo';
  target.tabIndex = -1;
  target.scrollIntoView = vi.fn();
  document.body.append(target);
  renderCta({ to: '#product-demo' });
  fireEvent.click(screen.getByRole('link'));
  expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  expect(target).toHaveFocus();
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `pnpm --filter @qr/landing test -- animated-cta.test.tsx`

- [ ] **Step 3: Add accessible hash handling and explicit primary CTA colors**

Use a typed click handler that prevents router navigation only for in-page targets, calls `scrollIntoView`, and focuses the destination. Set `.premium-cta-primary` to solid mature green with white text and defined hover/focus states.

- [ ] **Step 4: Run the focused and full landing tests**

Run: `pnpm --filter @qr/landing test`

### Task 3: Trigger the product walkthrough from viewport entry

**Files:**

- Modify: `apps/landing/test/product-demo.test.tsx`
- Modify: `apps/landing/src/components/product-demo.tsx`

**Interfaces:**

- Produces: `ProductDemo` that resets to step one and advances only after becoming visible.

- [ ] **Step 1: Write a failing IntersectionObserver test**

Provide a typed observer test double, render `ProductDemo`, trigger an intersecting entry, advance fake timers by 2600ms, and assert step two is selected.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @qr/landing test -- product-demo.test.tsx`

- [ ] **Step 3: Implement viewport state**

Observe the walkthrough root, reset `active` to zero on entry, run the interval only while in view and not directly interacted with, disconnect on unmount, and preserve reduced-motion behavior.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm --filter @qr/landing test -- product-demo.test.tsx`

### Task 4: Recompose the home page and add the academic-principles carousel

**Files:**

- Create: `apps/landing/src/components/academic-principles-carousel.tsx`
- Create: `apps/landing/test/academic-principles-carousel.test.tsx`
- Modify: `apps/landing/src/pages/home-page.tsx`
- Modify: `apps/landing/src/styles.css`

**Interfaces:**

- Produces: `AcademicPrinciplesCarousel` with ten strongly typed principles, previous/next controls, indicators, viewport autoplay, interaction pause, and reduced-motion support.

- [ ] **Step 1: Write failing carousel control and wraparound tests**

Assert that ten slide labels are represented, next/previous controls change the active quotation, and the previous control wraps from the first item to the tenth.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @qr/landing test -- academic-principles-carousel.test.tsx`

- [ ] **Step 3: Implement the carousel**

Keep one quotation visually primary, expose status as `Quotation N of 10`, and use Framer Motion for enter/exit transitions.

- [ ] **Step 4: Recompose the home-page sections**

Use the premium campus hero, move the mobile section above the walkthrough, use the mobile-attendance image beside the phone preview, replace the static three-quote grid, and apply the reusable enhanced section heading treatment.

- [ ] **Step 5: Correct phone-frame containment**

Give `.phone-shell` an explicit aspect ratio, make `.phone-screen` fill the shell, reserve bottom-navigation space, and remove mobile-width offsets that create horizontal overflow.

- [ ] **Step 6: Verify tests and typecheck**

Run: `pnpm --filter @qr/landing test` and `pnpm --filter @qr/landing typecheck`

### Task 5: Build rich feature, solution, pricing, about, and FAQ page compositions

**Files:**

- Create: `apps/landing/src/pages/feature-content.tsx`
- Create: `apps/landing/src/pages/solution-content.tsx`
- Create: `apps/landing/src/pages/about-content.tsx`
- Create: `apps/landing/src/pages/policy-content.tsx`
- Create: `apps/landing/src/components/faq-content.tsx`
- Create: `apps/landing/test/faq-content.test.tsx`
- Modify: `apps/landing/src/pages/content-page.tsx`
- Modify: `apps/landing/src/constants/content.ts`
- Modify: `apps/landing/src/styles.css`

**Interfaces:**

- Produces: focused route-specific content components selected by `ContentPage` without changing the router.

- [ ] **Step 1: Write failing FAQ expansion and search tests**

Assert that at least twelve questions exist and a search term filters visible results without removing the search field or empty state.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @qr/landing test -- faq-content.test.tsx`

- [ ] **Step 3: Extract and implement route-specific content**

Build explanatory feature stories, a five-role solution constellation, image-led institutional planning, the Attendity founding narrative, topic-grouped FAQ, and structured privacy/terms documents.

- [ ] **Step 4: Add premium responsive styling**

Use solid forest, navy, ivory, gold, and white surfaces with meaningful borders, image crops, hover/focus movement, and mobile-first stacking. Do not use gradients.

- [ ] **Step 5: Verify tests and typecheck**

Run: `pnpm --filter @qr/landing test` and `pnpm --filter @qr/landing typecheck`

### Task 6: Redesign the contact conversion experience without changing submission behavior

**Files:**

- Create: `apps/landing/test/contact-form.test.tsx`
- Modify: `apps/landing/src/components/contact-form.tsx`
- Modify: `apps/landing/src/pages/content-page.tsx`
- Modify: `apps/landing/src/styles.css`

**Interfaces:**

- Preserves: `POST ${publicApiUrl}/contact` payload, honeypot, pending, success reference, and error messaging.

- [ ] **Step 1: Write failing form-state tests**

Test the exact request payload and visible pending/success/error states with a fetch test double.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @qr/landing test -- contact-form.test.tsx`

- [ ] **Step 3: Recompose form and Implementation Desk presentation**

Add semantic field groups, supporting copy, response expectation, accessible state panels, premium solid-color shell, and the mobile-attendance image while leaving `submit` behavior intact.

- [ ] **Step 4: Verify GREEN and regressions**

Run: `pnpm --filter @qr/landing test`

### Task 7: Redesign authentication presentation while preserving working auth

**Files:**

- Create: `apps/web/test/auth-presentation.test.tsx`
- Modify: `apps/web/src/features/auth/auth-layout.tsx`
- Modify: `apps/web/src/features/auth/login-page.tsx`
- Modify: `apps/web/src/features/auth/register-page.tsx`
- Modify: `apps/web/src/styles/index.css`

**Interfaces:**

- Preserves: `/auth/login`, `/auth/register`, auth store session creation, role-based navigation, password requirement logic, verification success, and all existing field names.

- [ ] **Step 1: Write failing semantic presentation tests**

Assert that the shared layout exposes the premium academic story image and that login/register retain their required accessible field names and submit actions.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @qr/web test -- auth-presentation.test.tsx`

- [ ] **Step 3: Implement shared auth styling and markup**

Use the approved mobile-attendance image, a solid forest overlay, ivory form surface, clear section marker, stronger submit action, and responsive containment. Do not change request handlers.

- [ ] **Step 4: Verify auth tests and typecheck**

Run: `pnpm --filter @qr/web test` and `pnpm --filter @qr/web typecheck`

### Task 8: Remove prohibited gradients and finish navigation/footer themes

**Files:**

- Modify: `apps/landing/src/components/navbar.tsx`
- Modify: `apps/landing/src/components/animated-cta.tsx`
- Modify: `apps/landing/src/styles.css`
- Modify: `packages/ui/src/components/button.tsx`
- Test: affected landing and shared UI tests

**Interfaces:**

- Produces: solid-color top and scrolled navbar themes, consistent CTA variants, and a mature navy/forest footer.

- [ ] **Step 1: Add a static compliance test or source assertion for landing gradient removal**

Assert that landing CSS contains no `linear-gradient` or `radial-gradient` declarations.

- [ ] **Step 2: Verify RED**

Run the focused compliance test and confirm it detects current declarations.

- [ ] **Step 3: Replace gradient variants and declarations**

Use solid gold for the scroll indicator, solid green for active underlines, and a transparent solid tint for the scroll glow. Remove the unused landing `gradient` CTA option and replace the shared variant utility with a compliant solid treatment while preserving its public key for backward compatibility.

- [ ] **Step 4: Complete responsive/dark/accessibility styling**

Check contrast, focus, reduced motion, mobile navigation, content-page stacking, footer hierarchy, and zero overflow.

### Task 9: Full verification and visual QA

**Files:**

- Create: `design-qa.md`
- Modify: `README.md` only if setup or asset documentation changed.

**Interfaces:**

- Produces: verified landing and auth applications with documented visual QA status.

- [ ] **Step 1: Run automated verification**

```powershell
pnpm --filter @qr/landing test
pnpm --filter @qr/web test
pnpm --filter @qr/landing typecheck
pnpm --filter @qr/web typecheck
pnpm --filter @qr/landing build
pnpm --filter @qr/web build
pnpm lint
pnpm format:check
```

- [ ] **Step 2: Start the existing local applications**

Run the repository’s existing Vite development commands without changing runtime architecture.

- [ ] **Step 3: Browser-test core journeys**

Verify the scrolled navigation theme, `Explore Attendity`, mobile section containment, walkthrough autoplay, quote carousel, every marketing route, contact form states, login, and registration.

- [ ] **Step 4: Compare desktop and mobile captures**

Document visible mismatches in `design-qa.md`, fix P0–P2 findings, recapture, and finish only when `final result: passed`.

- [ ] **Step 5: Review final output against all authoritative project rules**

Confirm no gradients, placeholders, broken behavior, inaccessible controls, horizontal overflow, TypeScript errors, or failing tests remain.
