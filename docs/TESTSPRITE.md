# TestSprite — API upload & access

## Step 2: Upload API docs

Click **Upload API Docs** and choose:

```
vetansutra-backend/docs/openapi.yaml
```

Full path on your machine:

`C:\Users\manoj\Desktop\ThinkTech\vetansutra-backend\docs\openapi.yaml`

This file lists **691 endpoints** (OpenAPI 3.0) with:

- **17 public** (`security: []`) — login, OTP, health, etc.
- **674 protected** — `bearerAuth` (JWT)

Optional reference (not OpenAPI): `API_ENDPOINTS.md` is a markdown table only — prefer **openapi.yaml** for TestSprite.

---

## Access details (credentials)

### Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://backend.vetansutra.com` |
| Local | `http://localhost:4000` |

Use **production** only if TestSprite is allowed to hit live data; otherwise use a staging URL if you have one.

### How to get a JWT for protected endpoints

1. `POST /auth/send-otp`  
   Body: `{ "phone": "<10-digit test phone>" }`

2. `POST /auth/verify-otp`  
   Body: `{ "phone": "<same>", "code": "<OTP from SMS>" }`  
   Response includes `token` — use as **Bearer** token.

   Or: `POST /auth/login` with `{ "phone", "password" }` for password users.

3. For all other APIs:  
   `Authorization: Bearer <token>`

### Public endpoints (no JWT)

- `GET /health`
- `POST /auth/send-otp`, `/auth/verify-otp`, `/auth/login`, `/auth/signup-admin`
- `POST /auth/refresh`, `/auth/refresh-mobile`, `/auth/logout`, `/auth/logout-mobile`
- `POST /auth/impersonate/exchange`
- `POST /kiosk/login`
- `POST /api/webhook/essl` → header `x-webhook-secret` (not JWT)

When TestSprite asks to mark auth per endpoint: set **None** only for the paths above; everything else **Bearer** with the token from step 2.

### Suggested test accounts (you provide)

Give TestSprite **grey-box** credentials separately (do not commit passwords):

- Admin test phone + OTP or password  
- Staff test phone  
- Optional: superadmin (only if in scope)

---

## If upload fails

- Regenerate: `cd vetansutra-backend && npm run docs:api`
- File must be **openapi.yaml** (not `.xlsx` or only `API.md`)

---

## Extra context (Step 3)

- Multi-tenant HRMS; most routes need org context in JWT (`orgAccountId`).
- Rate limits on `/auth/send-otp`, `/auth/login` (5 req / 5 min per IP).
- Prefer testing **after business hours** if using production (per your PT questionnaire).
