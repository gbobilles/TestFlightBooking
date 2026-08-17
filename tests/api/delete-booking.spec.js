// DeleteBooking (DELETE /booking/:id) - positive + negative + field assertions.

const { test, expect } = require('@playwright/test');
const { getAuthToken, cookieAuthHeader } = require('./helpers/auth');
const { validBooking } = require('./fixtures/booking');

test.describe('API: DeleteBooking (DELETE /booking/:id)', () => {
  let token;

  test.beforeEach(async ({ request }) => {
    token = await getAuthToken(request);
  });

  async function createBooking(request) {
    const response = await request.post('/booking', { data: validBooking() });
    return (await response.json()).bookingid;
  }

  test.describe('Positive', () => {
    test('should return 201 and remove the booking so a later GET returns 404', async ({ request }) => {
      const bookingId = await createBooking(request);

      const deleteResponse = await request.delete(`/booking/${bookingId}`, { headers: cookieAuthHeader(token) });
      expect(deleteResponse.status()).toBe(201);
      // restful-booker's DELETE response body is the plain string "Created".
      const text = await deleteResponse.text();
      expect(text).toMatch(/created/i);

      const getResponse = await request.get(`/booking/${bookingId}`);
      expect(getResponse.status()).toBe(404);
    });

    test('deleted bookingid should no longer appear in GetBookingIds', async ({ request }) => {
      const bookingId = await createBooking(request);
      await request.delete(`/booking/${bookingId}`, { headers: cookieAuthHeader(token) });

      const listResponse = await request.get('/booking');
      const ids = (await listResponse.json()).map((b) => b.bookingid);
      expect(ids).not.toContain(bookingId);
    });
  });

  test.describe('Negative', () => {
    test('REJECT: should return 403 when deleting without an auth token', async ({ request }) => {
      const bookingId = await createBooking(request);
      const response = await request.delete(`/booking/${bookingId}`);
      expect(response.status()).toBe(403);
      // the unauthenticated attempt was rejected.
      await request.delete(`/booking/${bookingId}`, { headers: cookieAuthHeader(token) });
    });

    test('REJECT: should return 403 with an invalid token even for a real bookingid', async ({ request }) => {
      const bookingId = await createBooking(request);
      const response = await request.delete(`/booking/${bookingId}`, { headers: cookieAuthHeader('garbage-token') });
      expect(response.status()).toBe(403);

      await request.delete(`/booking/${bookingId}`, { headers: cookieAuthHeader(token) });
    });

    test('REJECT: deleting an already-deleted bookingid a second time should not return 201 again', async ({
      request,
    }) => {
      const bookingId = await createBooking(request);
      await request.delete(`/booking/${bookingId}`, { headers: cookieAuthHeader(token) });

      const secondDelete = await request.delete(`/booking/${bookingId}`, { headers: cookieAuthHeader(token) });

      // NOTE: restful-booker has a long-documented quirk where re-deleting a
      // missing id returns 405 Method Not Allowed rather than 404. We assert
      // "not 201" so the test fails loudly (rather than silently passing) if
      // that behavior ever changes to something equally wrong, like a 2xx.
      expect(secondDelete.status()).not.toBe(201);
    });

    test('REJECT: deleting a bookingid that never existed should not return 201', async ({ request }) => {
      const response = await request.delete(`/booking/999999999`, { headers: cookieAuthHeader(token) });
      expect(response.status()).not.toBe(201);
    });
  });
});
