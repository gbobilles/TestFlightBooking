// Develop tests for searching flights (positive + negative).

const { test, expect } = require('@playwright/test');
const { HomePage } = require('./pages/home.page');
const { ResultsPage } = require('./pages/results.page');

test.describe('Cheapflights - flight search', () => {
  let home;
  let results;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    results = new ResultsPage(page);
    await home.open();
  });

  test.describe('Positive scenarios', () => {
    test('should navigate to a results page when searching Sydney -> Melbourne', async ({ page }) => {
      await home.searchFlights({ origin: 'Sydney', destination: 'Melbourne' });

      await expect(page).toHaveURL(/\/(flight-search|flights|results)\//i, { timeout: 20000 });
      await expect(page).toHaveURL(/syd.*mel|mel.*syd/i);
    });

    test('should accept a one-way search with only a departure date', async () => {
      await home.searchFlights({ origin: 'Brisbane', destination: 'Perth', oneWay: true });

      await results.waitForResults();
      expect(await results.resultCards.count()).toBeGreaterThan(0);
    });

    test('should accept a round-trip search and open a date picker', async ({ page }) => {
      await home.selectOrigin('Melbourne');
      await home.selectDestination('Auckland');
      await home.departDateField.click();

      // Selecting concrete calendar days is highly markup-specific; we assert
      // the picker opens and is interactable rather than hard-coding a
      // date-grid selector that would be brittle across releases. Scoped to
      // :visible (a Playwright CSS extension) because a page can have more
      // than one [role="dialog"] node present at once (e.g. a sign-in modal
      // that's rendered but hidden) - without it, .first() can grab the
      // wrong, invisible dialog instead of the one that just opened.
      const datePicker = page.locator('[data-testid="date-picker"]:visible, [role="grid"]:visible, [role="dialog"]:visible');
      await expect(datePicker.first()).toBeVisible({ timeout: 8000 });
    });

    test('should prevent search until both origin and destination are chosen', async () => {
      await home.selectOrigin('Sydney');
      // Destination intentionally left blank.
      const isDisabled = await home.searchButton.isDisabled();
      if (isDisabled) {
        await expect(home.searchButton).toBeDisabled();
        return;
      }

      await home.searchButton.click();
      await expect(home.errorMessage.first()).toBeVisible();
    });
  });

  test.describe('Negative scenarios', () => {
    test('REJECT: should refuse to search with no origin or destination chosen', async () => {
      // Sites guard against an empty search in one of two common ways: they
      // keep the submit control disabled until the form is valid, or they
      // let you submit and show an inline validation error. Assert whichever
      // pattern this app uses actually blocks the search - never both, and
      // never neither.
      const isDisabled = await home.searchButton.isDisabled();

      if (isDisabled) {
        await expect(home.searchButton).toBeDisabled();
        return;
      }

      await home.searchButton.click();
      await expect(home.errorMessage.first()).toBeVisible();
    });

    test('REJECT: should show a validation error when origin and destination are the same city', async () => {
      // Dates need to be valid too: with them missing, the date validation
      await home.selectOrigin('Sydney');
      await home.selectDestination('Sydney');
      const departDate = new Date();
      departDate.setDate(departDate.getDate() + 3);
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + 7);
      await home.selectDates({ oneWay: false, departDate, returnDate });

      await home.searchButton.click();

      await expect(home.errorMessage.first()).toBeVisible();
      await expect(home.errorMessage.first()).toHaveText(/unique|same|different/i);
    });

    test('REJECT: should not offer autosuggest matches for gibberish origin input', async () => {
      await home.clearFieldChips(home.originFieldWrapper);
      await home.originInput.click();
      await home.originInput.fill('zzzzxxxxqqqq123');

      await expect(home.originSuggestions).toHaveCount(0);
    });

    test('REJECT: direct navigation to a malformed results URL should not render fabricated flights', async ({
      page,
    }) => {
      // Many SPAs serve a 200 for every client-side route and render the
      // not-found state in JS, so we don't assert on HTTP status here -- the
      // meaningful check is that an explicit error/no-results state is shown
      // instead of a blank page or (worse) invented flight results.
      await page.goto('/flights/not-a-real-route/9999-99-99/');

      const notFoundOrError = page
        .locator('[data-testid="no-results"], [data-testid="error-page"]')
        .or(page.getByText(/sorry, we could not find that page/i));
      const fabricatedResults = page.locator('[data-testid="result-card"]');

      await expect(notFoundOrError.first()).toBeVisible({ timeout: 15000 });
      await expect(fabricatedResults).toHaveCount(0);
    });
  });
});
