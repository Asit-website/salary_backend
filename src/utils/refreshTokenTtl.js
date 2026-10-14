const REFRESH_TOKEN_MS = Number(process.env.REFRESH_TOKEN_DAYS || 30) * 24 * 60 * 60 * 1000;

function getRefreshTokenExpiresAt() {
  return new Date(Date.now() + REFRESH_TOKEN_MS);
}

module.exports = { REFRESH_TOKEN_MS, getRefreshTokenExpiresAt };
