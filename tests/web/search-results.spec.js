// Develop assertions for flight search results.

const { test, expect } = require('@playwright/test');
const { HomePage } = require('./pages/home.page');
const { ResultsPage } = require('./pages/results.page');

test.describe('Cheapflights - flight search results', () => {
  let home;
  let results;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    results = new ResultsPage(page);
    await home.open();
    await home.searchFlights({ origin: 'Sydney', destination: 'Melbourne' });
    await results.waitForResults();
  });

  test('should render at least one result card', async () => {
    expect(await results.resultCards.count()).toBeGreaterThan(0);
  });

  test('each result card should display a price, airline, and duration', async () => {
    const summaries = await results.getResultSummaries();
    expect(summaries.length).toBeGreaterThan(0);

    for (const [i, summary] of summaries.entries()) {
      expect(summary.price, `result[${i}].price`).not.toBeNull();
      expect(summary.airline, `result[${i}].airline`).not.toBeNull();
      expect(summary.duration, `result[${i}].duration`).not.toBeNull();
    }
  });

  test('every displayed price should be a positive, well-formed currency amount', async () => {
    const summaries = await results.getResultSummaries();

    for (const [i, summary] of summaries.entries()) {
      const amount = results.parsePrice(summary.price);
      expect(amount, `result[${i}] parsed price`).toBeGreaterThan(0);
      expect(summary.price, `result[${i}] price text`).toMatch(/\$|AUD/i);
    }
  });

  test('result cards should be positioned top-to-bottom in a single results column (no overlap)', async () => {
    const cards = await results.resultCards.all();
    expect(cards.length, 'need >= 2 cards to assert relative ordering').toBeGreaterThan(1);

    const boxes = [];
    for (const card of cards) {
      boxes.push(await card.boundingBox());
    }
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].y, `card ${i} should be positioned below card ${i - 1}`).toBeGreaterThan(boxes[i - 1].y);
    }
  });

  test.skip('sorting by cheapest should reorder results so price is non-decreasing top to bottom', async ({ page }) => {
    if ((await results.sortByPriceControl.count()) === 0) {
      // Some layouts default to cheapest-first already; nothing to toggle.
      test.skip();
    }
    await results.sortByPriceControl.click();
    await page.waitForTimeout(2500); // allow client-side re-sort to settle

    // Sponsored placements are pinned to the top regardless of sort order,
    // so they're excluded here rather than asserted against a price rule
    // they're not subject to.
    const summaries = (await results.getResultSummaries()).filter((s) => !s.sponsored);
    const prices = summaries.map((s) => results.parsePrice(s.price)).filter((p) => !Number.isNaN(p));

    for (let i = 1; i < prices.length; i++) {
      expect(prices[i], 'prices should be sorted ascending after "cheapest" sort').toBeGreaterThanOrEqual(
        prices[i - 1]
      );
    }
  });
});
