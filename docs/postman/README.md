# Postman setup

## Why you see "478 endpoints need credentials"

Most Vetansutra APIs require a **JWT**. Only **18** endpoints are public; **679** need `Authorization: Bearer <token>`.

You do **not** set auth on each request manually. Set it **once** at collection level.

## Quick setup

1. Import `Vetansutra.postman_environment.json` and select environment **Vetansutra API**.
2. Import `Vetansutra.postman_collection.json` OR re-import `../openapi.yaml` after regenerating docs.
3. Open collection **⋯ → Edit → Authorization**:
   - Type: **Bearer Token**
   - Token: `{accessToken}`
4. Run **Auth → Verify OTP** (set `phone` and `otp` in environment) — `accessToken` is saved automatically.
5. Re-import OpenAPI: public routes use **No Auth**; protected routes inherit Bearer from collection.

## Public endpoints (Auth Type: None)

- `GET /health`
- `POST /auth/send-otp`, `/auth/verify-otp`, `/auth/login`, `/auth/signup-admin`
- `POST /auth/refresh`, `/auth/refresh-mobile`, `/auth/logout`, `/auth/logout-mobile`
- `POST /auth/impersonate/exchange`, `GET /auth/otp/latest` (dev)
- `POST /kiosk/login`
- `POST /api/webhook/essl` (use header `x-webhook-secret` instead)

All other paths: paste JWT into `accessToken` or use collection Bearer auth above.
