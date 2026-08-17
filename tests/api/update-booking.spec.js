// UpdateBooking (PUT /booking/:id, plus PATCH partial update) -positive + negative + field assertions.

const { test, expect } = require('@playwright/test');
const { getAuthToken, cookieAuthHeader } = require('./helpers/auth');
const { validBooking } = require('./fixtures/booking');

test.describe('API: UpdateBooking (PUT/PATCH /booking/:id)', () => {
  let token;
  let bookingId;

  test.beforeEach(async ({ request }) => {
    token = await getAuthToken(request);
    const createResponse = await request.post('/booking', { data: validBooking() });
    bookingId = (await createResponse.json()).bookingid;
  });

  test.describe('Positive', () => {
    test('PUT: should fully update a booking and return the new values', async ({ request }) => {
      const updatedPayload = validBooking({
        firstname: 'James',
        lastname: 'Smith',
        totalprice: 222,
        depositpaid: false,
      });

      const response = await request.put(`/booking/${bookingId}`, {
        data: updatedPayload,
        headers: cookieAuthHeader(token),
      });
      const body = await response.json();

      expect(response.status()).toBe(200);
      expect(body.firstname).toBe('James');
      expect(body.lastname).toBe('Smith');
      expect(body.totalprice).toBe(222);
      expect(body.depositpaid).toBe(false);
      expect(body.bookingdates.checkin).toBe(updatedPayload.bookingdates.checkin);
      expect(body.bookingdates.checkout).toBe(updatedPayload.bookingdates.checkout);
    });

    test('PATCH: should partially update only the supplied fields', async ({ request }) => {
      const response = await request.patch(`/booking/${bookingId}`, {
        data: { firstname: 'Patched', totalprice: 555 },
        headers: cookieAuthHeader(token),
      });
      const body = await response.json();

      expect(response.status()).toBe(200);
      expect(body.firstname).toBe('Patched');
      expect(body.totalprice).toBe(555);
      // Fields not included in the PATCH body should be left untouched.
      expect(body.lastname).toBe('Brown');
    });

    test('the update should be durably persisted (a subsequent GET reflects it)', async ({ request }) => {
      await request.put(`/booking/${bookingId}`, {
        data: validBooking({ firstname: 'Persisted' }),
        headers: cookieAuthHeader(token),
      });

      const getResponse = await request.get(`/booking/${bookingId}`);
      const body = await getResponse.json();
      expect(body.firstname).toBe('Persisted');
    });
  });

  test.describe('Negative', () => {
    test('REJECT: PUT without an auth token/cookie should return 403', async ({ request }) => {
      const response = await request.put(`/booking/${bookingId}`, {
        data: validBooking({ firstname: 'NoAuth' }),
      });
      expect(response.status()).toBe(403);
    });

    test('REJECT: PUT with an invalid/garbage token should return 403', async ({ request }) => {
      const response = await request.put(`/booking/${bookingId}`, {
        data: validBooking(),
        headers: cookieAuthHeader('this-is-not-a-real-token'),
      });
      expect(response.status()).toBe(403);
    });

    test('REJECT: PUT against a non-existent bookingid should not return 200', async ({ request }) => {
      const response = await request.put(`/booking/999999999`, {
        data: validBooking(),
        headers: cookieAuthHeader(token),
      });
      expect(response.status()).not.toBe(200);
    });

    test('REJECT: PATCH without auth should return 403 and leave the record unchanged', async ({ request }) => {
      const response = await request.patch(`/booking/${bookingId}`, { data: { firstname: 'ShouldNotApply' } });
      expect(response.status()).toBe(403);

      const getResponse = await request.get(`/booking/${bookingId}`);
      const body = await getResponse.json();
      expect(body.firstname).not.toBe('ShouldNotApply');
    });
  });
});
