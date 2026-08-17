// GetBooking (GET /booking/:id and GET /booking) - positive + negative + field assertions.

const { test, expect } = require('@playwright/test');
const { validBooking, REQUIRED_TOP_LEVEL_FIELDS } = require('./fixtures/booking');

test.describe('API: GetBooking (GET /booking/:id)', () => {
  let bookingId;
  let seedBooking;

  test.beforeEach(async ({ request }) => {
    seedBooking = validBooking({ firstname: 'Ada', lastname: 'Lovelace' });
    const response = await request.post('/booking', { data: seedBooking });
    const body = await response.json();
    bookingId = body.bookingid;
  });

  test.describe('Positive', () => {
    test('should return 200 and the full booking for a valid bookingid', async ({ request }) => {
      const response = await request.get(`/booking/${bookingId}`, { headers: { Accept: 'application/json' } });
      const booking = await response.json();

      expect(response.status()).toBe(200);
      for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
        expect(booking, `booking.${field}`).toHaveProperty(field);
      }
      expect(booking.firstname).toBe(seedBooking.firstname);
      expect(booking.lastname).toBe(seedBooking.lastname);
      expect(booking.totalprice).toBe(seedBooking.totalprice);
      expect(booking.depositpaid).toBe(seedBooking.depositpaid);
      expect(booking.bookingdates.checkin).toBe(seedBooking.bookingdates.checkin);
      expect(booking.bookingdates.checkout).toBe(seedBooking.bookingdates.checkout);
      expect(booking.additionalneeds).toBe(seedBooking.additionalneeds);
    });

    test('GetBookingIds: should return an array that includes the newly-created id', async ({ request }) => {
      const response = await request.get('/booking');
      const ids = (await response.json()).map((b) => b.bookingid);

      expect(response.status()).toBe(200);
      expect(ids).toContain(bookingId);
    });

    test('GetBookingIds: should support filtering by firstname/lastname', async ({ request }) => {
      const response = await request.get('/booking', {
        params: { firstname: seedBooking.firstname, lastname: seedBooking.lastname },
      });
      const ids = (await response.json()).map((b) => b.bookingid);

      expect(response.status()).toBe(200);
      expect(ids).toContain(bookingId);
    });
  });

  test.describe('Negative', () => {
    test('REJECT: should return 404 for a bookingid that does not exist', async ({ request }) => {
      const response = await request.get('/booking/999999999');
      expect(response.status()).toBe(404);
    });

    test('REJECT: should return 404 (not 500) for a non-numeric bookingid', async ({ request }) => {
      const response = await request.get('/booking/not-a-valid-id');
      expect(response.status()).toBe(404);
    });

    test('GetBookingIds: should return an empty array for filters matching no booking', async ({ request }) => {
      const response = await request.get('/booking', {
        params: { firstname: 'Zzzzzznonexistent', lastname: 'Qqqqqqnonexistent' },
      });
      const body = await response.json();

      expect(response.status()).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });
  });
});
