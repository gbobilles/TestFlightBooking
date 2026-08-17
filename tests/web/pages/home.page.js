// tests/web/pages/home.page.js
//
// Page Object for the cheapflights.com.au homepage / flight search form.
//
// SELECTOR NOTE: cheapflights.com.au is a client-rendered app whose exact
// data-testid / class names can change between deploys and A/B tests. Each
// locator below is built as a Playwright `.or()` chain (data-testid first,
// falling back to role/aria-label, falling back to visible text) so a single
// markup tweak doesn't break every locator at once. Before the first real
// run, open the site in DevTools and confirm/update these locators -- that
// is the only thing that should need editing in this file.

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// The calendar renders each day as [aria-label="<Month> <Day> <Year>..."]
// (e.g. "August 20 2026 Prices on this day are around average"), so matching
// on the date prefix is resilient to the trailing price-hint text changing.
function calendarDayLabelPrefix(date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
}

class HomePage {
  constructor(page) {
    this.page = page;

    this.logo = page
      .locator('[data-testid="logo-header"]')
      .or(page.getByRole('link', { name: /go to the cheapflights homepage/i }));

    this.signInButton = page
      .locator('[data-testid="header-sign-in"]')
      .or(page.getByRole('button', { name: /sign in/i }))
      .or(page.getByRole('link', { name: /sign in/i }));

    this.originFieldWrapper = page.locator('[aria-label="Flight origin input"]');
    this.destinationFieldWrapper = page.locator('[aria-label="Flight destination input"]');

    this.originInput = page
      .locator('[data-testid="origin-input"]')
      .or(page.getByRole('combobox', { name: /^origin/i }))
      .or(page.getByPlaceholder(/from/i));

    this.destinationInput = page
      .locator('[data-testid="destination-input"]')
      .or(page.getByRole('combobox', { name: /^destination/i }))
      .or(page.getByPlaceholder(/to/i));

    // Scoped to :visible (a Playwright CSS extension) because production
    // autocomplete widgets commonly leave a *previous* suggestion list in the
    // DOM (just hidden) after a selection is made elsewhere on the form. A
    // plain "any matching li" locator can then resolve to a stale, hidden
    // item instead of the currently-rendered one -- :visible rules that out.
    this.originSuggestions = page.locator(
      '#flight-origin-smarty-input-list li[role="option"]:visible, [data-testid="autosuggest-list"] li:visible'
    );
    this.destinationSuggestions = page.locator(
      '#flight-destination-smarty-input-list li[role="option"]:visible, [data-testid="autosuggest-list"] li:visible'
    );

    this.departDateField = page
      .locator('[data-testid="depart-date-field"]')
      .or(page.getByRole('button', { name: /departure/i }));

    this.returnDateField = page
      .locator('[data-testid="return-date-field"]')
      .or(page.getByRole('button', { name: /return/i }));

    this.searchButton = page
      .locator('[data-testid="submit-button"]')
      .or(page.getByRole('button', { name: /search/i }));

    // The trip-type control is a custom combobox (not a native <select>) that
    // must be opened before its "One-way" option becomes clickable. Scoped by
    // aria-controls rather than accessible name because the travelers-count
    // control on this page also carries an (apparently mislabeled) "Trip
    // type" aria-label, which would otherwise make a name-based lookup
    // ambiguous.
    this.tripTypeControl = page
      .locator('[data-testid="trip-type-control"]')
      .or(page.locator('[aria-controls="flight-trip-type-dropdown"]'));
    this.oneWayOption = page
      .locator('[data-testid="trip-type-oneway"]')
      .or(page.locator('#flight-trip-type-dropdown [aria-label="One-way"]'));

    this.errorMessage = page.locator('[data-testid="search-form-error"], [role="alert"]');
    this.signInDialog = page.locator('[role="dialog"]');
    this.datePickerDialog = page.locator('[role="dialog"]');
  }

  async open() {
    await this.page.goto('/');
    const consentButton = this.page.getByRole('button', { name: /accept|i agree/i });
    if (await consentButton.isVisible().catch(() => false)) {
      await consentButton.click().catch(() => {});
    }
    // The search form is server-rendered but not yet interactive until React
    // hydrates; a click that lands before then is silently swallowed (no
    // validation, no navigation, no error). There's no DOM signal for
    // "hydration complete", so a short fixed wait is the pragmatic fix here.
    await this.searchButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(800);
  }

  // The origin/destination fields are multi-value comboboxes that can arrive
  // pre-populated with a chip (e.g. a geo-IP-guessed home airport). Typing a
  // new city adds a second chip alongside it rather than replacing it, and
  // the site resolves the search against whichever chip came first -- so a
  // stale default silently hijacks the search unless it's removed first.
  async clearFieldChips(fieldWrapper) {
    const removeButtons = fieldWrapper.locator('[aria-label="Remove value"]');
    let remaining = await removeButtons.count();
    while (remaining > 0) {
      await removeButtons.first().click();
      remaining = await removeButtons.count();
    }
  }

  async selectOrigin(cityText) {
    await this.clearFieldChips(this.originFieldWrapper);
    await this.originInput.click();
    await this.originInput.fill(cityText);
    await this.originSuggestions.first().waitFor({ state: 'visible', timeout: 8000 });
    await this.originSuggestions.first().click();
  }

  async selectDestination(cityText) {
    await this.clearFieldChips(this.destinationFieldWrapper);
    await this.destinationInput.click();
    await this.destinationInput.fill(cityText);
    await this.destinationSuggestions.first().waitFor({ state: 'visible', timeout: 8000 });
    await this.destinationSuggestions.first().click();
  }

  // Picks a day in the currently-open calendar. The site keeps the same
  // calendar dialog open across both clicks for a round trip (depart, then
  // return), rather than reopening a fresh dialog for the return date.
  async pickCalendarDate(date) {
    const day = this.page.locator(`[aria-label^="${calendarDayLabelPrefix(date)}"]`).first();
    await day.waitFor({ state: 'visible', timeout: 8000 });
    await day.click();
  }

  async selectDates({ oneWay, departDate, returnDate }) {
    await this.departDateField.click();
    await this.pickCalendarDate(departDate);
    if (!oneWay) {
      await this.pickCalendarDate(returnDate);
    }
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async searchFlights({ origin, destination, oneWay = false, departInDays = 3, returnInDays = 7 }) {
    if (oneWay) {
      await this.tripTypeControl.click();
      // The dropdown occasionally doesn't expand on the very first click
      // (hydration timing) -- one retry covers it without masking a real
      // failure to open.
      const opened = await this.oneWayOption.waitFor({ state: 'visible', timeout: 3000 }).then(
        () => true,
        () => false
      );
      if (!opened) {
        await this.tripTypeControl.click();
        await this.oneWayOption.waitFor({ state: 'visible', timeout: 5000 });
      }
      await this.oneWayOption.click();
    }
    await this.selectOrigin(origin);
    await this.selectDestination(destination);

    const departDate = new Date();
    departDate.setDate(departDate.getDate() + departInDays);
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + returnInDays);
    await this.selectDates({ oneWay, departDate, returnDate });

    await this.searchButton.click();
  }
}

module.exports = { HomePage };
