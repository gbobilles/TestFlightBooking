// tests/api/helpers/auth.js
//
// Handles the /auth token restful-booker requires for PUT/PATCH/DELETE.
// Credentials are overridable via env vars; the values below are the
// documented default demo credentials for this public practice API.

const USERNAME = process.env.BOOKER_USERNAME || 'admin';
const PASSWORD = process.env.BOOKER_PASSWORD || 'password123';

async function getAuthToken(requestContext) {
  const response = await requestContext.post('/auth', {
    data: { username: USERNAME, password: PASSWORD },
  });
  const body = await response.json();
  if (response.status() !== 200 || !body || !body.token) {
    throw new Error(`Failed to obtain auth token (status ${response.status()}): ${JSON.stringify(body)}`);
  }
  return body.token;
}

// restful-booker accepts either a Cookie token or HTTP Basic auth for
// write/delete operations - both are provided so specs can exercise either.
function cookieAuthHeader(token) {
  return { Cookie: `token=${token}` };
}

function basicAuthHeader() {
  const encoded = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}

module.exports = { getAuthToken, cookieAuthHeader, basicAuthHeader, USERNAME, PASSWORD };
