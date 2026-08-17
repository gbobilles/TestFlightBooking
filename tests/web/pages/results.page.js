// tests/web/pages/results.page.js
//
// Page Object for the flight search results page.
// See the SELECTOR NOTE in home.page.js -- the same caveat applies here.

class ResultsPage {
  constructor(page) {
    this.page = page;

    // Each flight offer is a role="group" with an aria-label like "Result
    // item 0" -- confirmed against a live search and preferred over the
    // component's own CSS classes, whose prefixes are per-build hashes
    // (e.g. "yuAt", "nrc6") that change on redeploy.
    this.resultCards = page.locator(
      '[data-testid="result-card"], [role="group"][aria-label^="Result item"], li[data-resultid], article[class*="result" i]'
    );
    // Exact name match on purpose: a broader /price/i pattern also catches
    // the unrelated "Price" filter-accordion toggle in the results sidebar.
    this.sortByPriceControl = page
      .locator('[data-testid="sort-price"]')
      .or(page.getByRole('button', { name: 'Cheapest', exact: true }));
    this.noResultsMessage = page.locator('[data-testid="no-results"], [data-testid="errors-region"]');
    this.loadingSpinner = page.locator(
      '[data-testid="results-loading"], [data-testid="loading-text-region"], [aria-busy="true"]'
    );
  }

  async waitForResults(timeout = 30000) {
    await this.loadingSpinner.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout }).catch(() => {});

    await Promise.race([
      this.resultCards.first().waitFor({ state: 'visible', timeout }),
      this.noResultsMessage.waitFor({ state: 'visible', timeout }),
    ]).catch(() => {});
  }

  async getResultSummaries() {
    const cards = await this.resultCards.all();
    const summaries = [];
    for (const card of cards) {
      // Class selectors here match on a stable descriptive *suffix*
      // (e.g. "...-price-text") rather than the full class, since the
      // per-build hash prefix (e.g. "e2GB-price-text") changes on redeploy.
      const priceEl = card.locator('[data-testid="price"], [class*="price-text" i], [class*="price" i]');
      const airlineEl = card.locator('[data-testid="airline-name"], [class*="operator-text" i], [class*="airline" i]');
      const durationEl = card
        .locator('[data-testid="duration"], [class*="duration" i]')
        .or(card.getByText(/^\d+h\s*\d+m$/));
      // Sponsored/ad placements are pinned regardless of sort order, so
      // price-ordering assertions need to be able to exclude them.
      const sponsoredAncestor = card.locator('xpath=ancestor::*[contains(@class, "sponsored-result")]');
      summaries.push({
        price: (await priceEl.count()) > 0 ? await priceEl.first().textContent() : null,
        airline: (await airlineEl.count()) > 0 ? await airlineEl.first().textContent() : null,
        duration: (await durationEl.count()) > 0 ? await durationEl.first().textContent() : null,
        sponsored: (await sponsoredAncestor.count()) > 0,
      });
    }
    return summaries;
  }

  parsePrice(priceText) {
    if (!priceText) return NaN;
    return Number(priceText.replace(/[^0-9.]/g, ''));
  }
}

module.exports = { ResultsPage };
