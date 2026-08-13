import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectAccessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const violations = result.violations.filter(
    ({ impact }) => impact === 'critical' || impact === 'serious',
  );
  if (violations.length)
    throw new Error(
      violations
        .map(
          ({ id, nodes }) =>
            `${id}: ${nodes.map(({ target, failureSummary }) => `${target.join(' ')} — ${failureSummary ?? 'Failed accessibility rule.'}`).join('\n')}`,
        )
        .join('\n'),
    );
}

test('primary public surface is responsive, keyboard reachable, and accessible', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const isLanding = testInfo.project.name.startsWith('landing');
  if (!isLanding)
    await page.route('**/api/v1/auth/refresh', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'No session', data: null }),
      }),
    );
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page).toHaveTitle(/Attendity/);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: isLanding ? 'Skip to main content' : 'Skip to form' }),
  ).toBeFocused();
  if (isLanding) {
    const countryTrustStatement = page.locator('.country-trust-copy');
    await expect(countryTrustStatement).toBeVisible();
    await expect(countryTrustStatement).toHaveText(/\S/);
    await expect(page.getByText('Choose a country manually')).toBeVisible();
  } else await expect(page.getByRole('button', { name: 'Sign in securely' })).toBeVisible();
  await expectAccessible(page);
});

test('landing respects mobile, reduced-motion, and dark-mode preferences', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!testInfo.project.name.startsWith('landing'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(8, 21, 16)');
  const motion = await page
    .locator('.premium-cta')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationDuration: style.animationDuration,
        transitionDuration: style.transitionDuration,
        viewportDoesNotOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });
  const parseSeconds = (value: string) => {
    const normalized = value.replace(/s$/, '');
    return Number.parseFloat(normalized);
  };

  expect(parseSeconds(motion.animationDuration)).toBeCloseTo(1e-5, 10);
  expect(parseSeconds(motion.transitionDuration)).toBeCloseTo(1e-5, 10);
  expect(motion.viewportDoesNotOverflow).toBe(true);
  await expectAccessible(page);
});

test('all landing content routes have a unique heading and no serious accessibility violations', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  test.skip(!testInfo.project.name.startsWith('landing'));
  for (const path of [
    '/features',
    '/solutions',
    '/pricing',
    '/about',
    '/contact',
    '/faq',
    '/privacy',
    '/terms',
    '/missing-page',
  ]) {
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
    await expectAccessible(page);
  }
});

test('authentication routes remain complete and accessible without an active session', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  test.skip(!testInfo.project.name.startsWith('web'));
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'No session', data: null }),
    }),
  );
  for (const path of [
    '/login',
    '/register',
    '/forgot-password',
    '/resend-verification',
    '/reset-password',
    '/verify-email',
    '/missing-page',
  ]) {
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
    await expectAccessible(page);
  }
});

test('sign-in opens a permission-aware administrator workspace', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!testInfo.project.name.startsWith('web'));
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'No session', data: null }),
    }),
  );
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Signed in successfully.',
        data: {
          accessToken: 'browser-test-access-token',
          user: {
            id: '507f1f77bcf86cd799439011',
            universityId: '507f191e810c19729de860ea',
            email: 'admin@lmu.edu.ng',
            fullName: 'Chidinma Okeke',
            role: 'university_admin',
          },
        },
      }),
    }),
  );
  await page.route('**/api/v1/portal/summary', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { users: 8, departments: 4, courses: 4, unreadNotifications: 2 },
      }),
    }),
  );
  await page.route('**/api/v1/notifications**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: [], unread: 2, pagination: { page: 1, limit: 10, total: 0, pages: 0 } },
      }),
    }),
  );
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByLabel('Institution code').fill('lagos-metropolitan-university');
  await page.getByLabel('Email address').fill('admin@lmu.edu.ng');
  await page.locator('input[name="password"]').fill('ValidPassword2026!');
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: 'Institution administration' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeAttached();
  await expectAccessible(page);
});
