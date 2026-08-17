// Reusable booking payloads for the restful-booker suite.

function validBooking(overrides = {}) {
  return {
    firstname: 'Jim',
    lastname: 'Brown',
    totalprice: 111,
    depositpaid: true,
    bookingdates: {
      checkin: '2026-09-01',
      checkout: '2026-09-10',
    },
    additionalneeds: 'Breakfast',
    ...overrides,
  };
}

function validBookingWithoutOptionalField() {
  const booking = validBooking();
  delete booking.additionalneeds;
  return booking;
}

const REQUIRED_TOP_LEVEL_FIELDS = ['firstname', 'lastname', 'totalprice', 'depositpaid', 'bookingdates'];

module.exports = { validBooking, validBookingWithoutOptionalField, REQUIRED_TOP_LEVEL_FIELDS };
