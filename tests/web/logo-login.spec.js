// Validate the logo and the sign-in ("login") button are displayed, including position/location assertions.

const { test, expect } = require('@playwright/test');
const { HomePage } = require('./pages/home.page');

test.describe('Cheapflights homepage - header elements', () => {
  let home;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    await home.open();
  });

  test.describe('Logo', () => {
    test('POSITIVE: should be present and visible', async () => {
      await expect(home.logo).toBeVisible();
    });

    test('POSITIVE: should be positioned in the top-left header region of the viewport', async ({ page }) => {
      const box = await home.logo.boundingBox();
      expect(box, 'logo should have a bounding box (i.e. be rendered)').not.toBeNull();

      const viewport = page.viewportSize();

      // Logo should sit near the top of the page ...
      expect(box.y, 'logo should be within the top header band').toBeLessThanOrEqual(120);
      // ... and in the left half of a standard desktop header (logos are
      // conventionally left-aligned; nav/account controls sit on the right).
      expect(box.x).toBeLessThanOrEqual(viewport.width / 2);
      // Sanity: it must actually occupy space, not be a collapsed 0x0 node.
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    });

    test('POSITIVE: clicking the logo should return to / stay on the homepage', async ({ page }) => {
      await home.logo.click();
      await expect(page).toHaveURL(/cheapflights\.com\.au\/?$/);
    });
  });

  test.describe('Sign in button', () => {
    test('POSITIVE: should be present and visible', async () => {
      await expect(home.signInButton).toBeVisible();
    });

    test('POSITIVE: should render in the header, to the right of the logo', async () => {
      const logoBox = await home.logo.boundingBox();
      const signInBox = await home.signInButton.boundingBox();

      expect(signInBox.y, 'sign-in control should be in the top header band').toBeLessThanOrEqual(140);
      expect(signInBox.x, 'sign-in control is expected to sit to the right of the logo').toBeGreaterThan(logoBox.x);
    });

    test('POSITIVE: should be enabled and clickable', async () => {
      await expect(home.signInButton).toBeEnabled();
    });

    test('POSITIVE: clicking sign in should present a sign-in/login UI (modal or navigation)', async ({ page }) => {
      await home.signInButton.click();

      const signInModalOrForm = page
        .locator('[data-testid="signin-modal"], [role="dialog"]')
        .or(page.locator('input[type="email"]'))
        .or(page.locator('input[type="password"]'));

      await expect(signInModalOrForm.first()).toBeVisible({ timeout: 10000 });
    });
  });
});
