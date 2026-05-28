const axios = require('axios');

/**
 * Verify Cloudflare Turnstile CAPTCHA token
 * @param {string} token - The client-submitted Turnstile token
 * @param {string} [ip] - The client's IP address
 * @returns {Promise<boolean>} - True if verified, false otherwise
 */
async function verifyTurnstileToken(token, ip) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // If not configured, bypass and warn in log to avoid breaking dev setup
    console.warn('[TURNSTILE] TURNSTILE_SECRET_KEY is not defined. Bypassing Turnstile validation.');
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip || ''
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const data = response.data;
    if (data && data.success) {
      return true;
    } else {
      console.error('[TURNSTILE] Validation failed:', data?.['error-codes']);
      return false;
    }
  } catch (error) {
    console.error('[TURNSTILE] Verification request failed:', error.message);
    return false;
  }
}

module.exports = {
  verifyTurnstileToken
};
