// CreateBooking (POST /booking) - positive + negative + field assertions.

const { test, expect } = require('@playwright/test');
const {
  validBooking,
  validBookingWithoutOptionalField,
  REQUIRED_TOP_LEVEL_FIELDS,
} = require('./fixtures/booking');

function assertBookingShape(booking, expected) {
  for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
    expect(booking, `booking.${field}`).toHaveProperty(field);
  }
  expect(booking.firstname).toBe(expected.firstname);
  expect(booking.lastname).toBe(expected.lastname);
  expect(booking.totalprice).toBe(expected.totalprice);
  expect(booking.depositpaid).toBe(expected.depositpaid);
  expect(booking.bookingdates).toBeTruthy();
  expect(booking.bookingdates.checkin).toBe(expected.bookingdates.checkin);
  expect(booking.bookingdates.checkout).toBe(expected.bookingdates.checkout);
}

test.describe('API: CreateBooking (POST /booking)', () => {
  test.describe('Positive', () => {
    test('should create a booking with all fields and return 200 with a bookingid + echoed booking', async ({
      request,
    }) => {
      const payload = validBooking();
      const response = await request.post('/booking', { data: payload });
      const body = await response.json();

      expect(response.status()).toBe(200);
      expect(body).toHaveProperty('bookingid');
      expect(typeof body.bookingid).toBe('number');
      expect(body).toHaveProperty('booking');

      assertBookingShape(body.booking, payload);
      expect(body.booking.additionalneeds).toBe(payload.additionalneeds);
    });

    test('should create a booking without the optional additionalneeds field', async ({ request }) => {
      const payload = validBookingWithoutOptionalField();
      const response = await request.post('/booking', { data: payload });
      const body = await response.json();

      expect(response.status()).toBe(200);
      assertBookingShape(body.booking, payload);
    });

    test('should accept depositpaid: false as a valid boolean value', async ({ request }) => {
      const payload = validBooking({ depositpaid: false });
      const response = await request.post('/booking', { data: payload });
      const body = await response.json();

      expect(response.status()).toBe(200);
      expect(body.booking.depositpaid).toBe(false);
    });

    test('should return a unique bookingid across repeated creations', async ({ request }) => {
      const first = await (await request.post('/booking', { data: validBooking() })).json();
      const second = await (await request.post('/booking', { data: validBooking() })).json();

      expect(first.bookingid).not.toBe(second.bookingid);
    });
  });

  test.describe('Negative', () => {
    test('REJECT: should not return a 2xx for a syntactically malformed JSON body', async ({ request }) => {
      const response = await request.post('/booking', {
        headers: { 'Content-Type': 'application/json' },
        data: '{ firstname: "Jim", }', // deliberately invalid JSON, sent as a raw string
      });

      // restful-booker's Node backend fails to parse invalid JSON and is
      // documented/observed to respond with a server error rather than
      // silently accepting it.
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('REJECT: should not return a 2xx for an empty payload missing required fields', async ({ request }) => {
      // restful-booker now fails on an empty payload with a 500 and a
      // plain-text body (rather than the 200 + JSON echo it used to return),
      // so this only asserts the response is a non-2xx and doesn't attempt
      // to parse it as JSON.
      const response = await request.post('/booking', { data: {} });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('REJECT: should not silently coerce a non-numeric totalprice into a number', async ({ request }) => {
      const payload = validBooking({ totalprice: 'not-a-number' });
      const response = await request.post('/booking', { data: payload });
      const body = await response.json();

      // The API is lenient and will echo back whatever it was given; the
      // meaningful assertion here is that it must NOT fabricate a numeric
      // value it was never given.
      expect(typeof body.booking.totalprice).not.toBe('number');
    });
  });
});
