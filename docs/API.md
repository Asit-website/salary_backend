# Vetansutra REST API Documentation

Version: **1.0** (package `thinktech-attendance-backend`)

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://backend.vetansutra.com` |
| Local | `http://localhost:4000` |

All paths below are relative to the base URL unless noted.

---

## Overview

Vetansutra is a **multi-tenant** HRMS SaaS API (attendance, payroll, leave, sales, recruitment, superadmin). It is a **JSON REST** API built with **Node.js 18+**, **Express 4**, and **MySQL** (Sequelize).

### Typical response envelope

```json
{
  "success": true,
  "message": "Optional human-readable message",
  "...": "resource-specific fields"
}
```

Errors:

```json
{
  "success": false,
  "message": "Reason"
}
```

Common HTTP status codes: `400` validation, `401` missing/invalid token, `403` forbidden/disabled user, `404` not found, `423` account lockout, `500` server error.

---

## Authentication & headers

### Login flow (OTP)

1. `POST /auth/send-otp` — body: `{ "phone": "9876543210" }` (10-digit Indian mobile)
2. `POST /auth/verify-otp` — body: `{ "phone", "code" }` → may return `requireSelection` with multiple org accounts
3. `POST /auth/switch-account` or selection on client → returns JWT + refresh cookie (web) or refresh token (mobile)

Alternative: `POST /auth/login` with `{ "phone", "password" }` for password-based users.

### JWT access token

- Send on every protected request: `Authorization: Bearer <access_token>`
- Access token TTL: **15 minutes**
- Refresh: `POST /auth/refresh` (HttpOnly `refreshToken` cookie, web) or `POST /auth/refresh-mobile` (body: `{ "refreshToken" }`)
- Refresh token TTL: **30 days** (configurable via `REFRESH_TOKEN_DAYS`)

### Optional headers

| Header | Purpose |
|--------|---------|
| `x-device-fingerprint` | Device trust / session binding |
| `x-app-platform` | `web`, `mobile-apk`, or `admin-apk` |
| `x-org-id` | Superadmin/channel partner: act on behalf of org (tenant override) |

### Query token (downloads only)

Some file URLs accept `?token=<jwt>` when `Authorization` cannot be sent (e.g. iframe). Prefer header when possible.

### Multi-tenancy

Most `/admin/*`, `/attendance/*`, `/me/*`, etc. require:

- Valid JWT with `orgAccountId` (except superadmin panel)
- `tenantEnforce` middleware scopes data to the user's organization

---

## Public & auth routes (`/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/send-otp` | Send SMS OTP (rate limited) |
| POST | `/auth/verify-otp` | Verify OTP, start session |
| POST | `/auth/login` | Password login (rate limited) |
| POST | `/auth/switch-account` | Switch org after multi-account OTP |
| POST | `/auth/add-organization` | Create new org (authenticated flow) |
| POST | `/auth/signup-admin` | Register new business (pending superadmin approval) |
| POST | `/auth/refresh` | Rotate access token (cookie) |
| POST | `/auth/refresh-mobile` | Rotate tokens (mobile) |
| POST | `/auth/logout` | Invalidate refresh session (web) |
| POST | `/auth/logout-mobile` | Logout mobile |
| POST | `/auth/impersonate/exchange` | Exchange one-time superadmin impersonation code |
| GET | `/auth/otp/latest` | Dev only — latest OTP if enabled |

---

## Kiosk (`/kiosk`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/kiosk/login` | Org kiosk username/password → org-scoped JWT |
| POST | `/kiosk/attendance` | Kiosk punch (authenticated) |

---

## Employee self-service (`/me`)

Staff/admin profile, payslips, attendance summary, location pings, profile photo. All require **Bearer JWT** + tenant.

Representative endpoints (see [API_ENDPOINTS.md](./API_ENDPOINTS.md) for full list):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Current user + staff profile |
| GET | `/me/payslips` | List payslips |
| GET | `/me/payslips/:id/download` | Download payslip PDF |
| GET | `/me/attendance` | Attendance history |
| POST | `/me/photo` | Upload profile photo (multipart) |

---

## Attendance (`/attendance`)

Punch in/out, breaks, QR/geo attendance, templates, reports. Requires JWT + tenant.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/attendance/punch-in` | Punch in (optional photo/geo) |
| POST | `/attendance/punch-out` | Punch out |
| GET | `/attendance/today` | Today's attendance state |
| GET | `/attendance/report` | Admin/staff reports (role-dependent) |

---

## Leave (`/leave`, `/leave/weekly-off`)

Leave requests, balances, templates, approvals.

---

## Sales (`/sales`)

Field sales visits, orders, targets, client OTP signature flows (mobile + web).

---

## Documents (`/documents`)

Staff document types, uploads, assignments.

---

## Security patrol (`/security`)

Site check-in with photo/signature (authenticated).

---

## Subscription (`/subscription`)

Org plans, top-up, Cashfree payment links (production).

---

## Channel partner (`/channel-partner`)

Partner-managed client onboarding and visibility.

---

## Superadmin (`/superadmin`, `/superadmin/mail`)

Platform administration: clients, plans, leads, staff, holidays, impersonation (`POST /superadmin/clients/:id/impersonate` → returns one-time `code`), bulk mail.

Requires `superadmin` or `superadmin_staff` role (and permission flags for some routes).

---

## Admin (`/admin`)

Largest module: staff CRUD, payroll cycles, salary templates, shifts, holidays, expenses, assets, automation rules, Tally, AI reports, settings, recruitment, social, notifications, etc.

**Default middleware** (most routes after line ~570 in `admin.js`):

- `authRequired`
- `requireRole(['admin', 'superadmin', 'staff'])`
- `tenantEnforce`

Early routes include org addon settings (with explicit auth) and **mock payment** routes only when `ALLOW_MOCK_PAYMENTS=true`.

### Payroll (examples)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/payroll` | List payroll cycles |
| POST | `/admin/payroll` | Create cycle |
| POST | `/admin/payroll/:cycleId/compute` | Compute payroll |
| POST | `/admin/payroll/:cycleId/lock` | Lock cycle |
| GET | `/admin/payroll/:cycleId/export` | Export |

### Staff (examples)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/staff` | List staff |
| POST | `/admin/staff` | Create staff |
| GET | `/admin/staff/:id` | Staff detail |
| PUT | `/admin/staff/:id` | Update staff |

---

## Roles & permissions

| Mount | Description |
|-------|-------------|
| `/admin/roles` | Web admin role/permission management |
| `/mobile/roles` | Mobile permission endpoints |

---

## AI (`/admin/ai`, `/ai`)

Chat assistant, salary forecast, anomaly/risk reports (OpenAI when `OPENAI_API_KEY` set).

---

## Webhooks

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/webhook/essl` | `x-webhook-secret` or `?secret=` (required in production) |

Biometric attendance push (eSSL). Encrypted payload optional via `data` + `password` query (legacy).

---

## Files & uploads

| Method | Path | Description |
|--------|------|-------------|
| GET | `/uploads/*` | Authenticated static files (payslips, photos, documents) |
| GET | `/view-pdf/:month/:filename` | HTML wrapper for payslip PDF |

Uploads use `multipart/form-data` on various `POST` routes (`/admin/staff/:id/documents`, `/documents`, `/attendance/*`, etc.). Prefer secure upload endpoints with MIME validation where implemented.

---

## Health

```http
GET /health
```

Response: `{ "ok": true }`

---

## Rate limiting

Applied on: `/auth/send-otp`, `/auth/verify-otp`, `/auth/login`, `/auth/signup-admin`, `/kiosk/login` (5 requests per 5 minutes per IP by default).

---

## Full endpoint index

See **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** for the complete machine-generated list of all routes.

---

## `/me` — all routes (JWT + tenant)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Current user + staff profile summary |
| GET | `/me/profile` | Profile details |
| PUT | `/me/profile` | Update profile |
| GET | `/me/general` | General info |
| PUT | `/me/general` | Update general info |
| GET | `/me/bank` | Bank details |
| PUT | `/me/bank` | Update bank details |
| PUT | `/me/phone` | Update phone |
| POST | `/me/profile/photo` | Upload photo (`multipart`, field `photo`) |
| GET | `/me/shift` | Assigned shift |
| GET | `/me/attendance-template` | Attendance template |
| GET | `/me/salary/access` | Salary visibility flags |
| GET | `/me/salary-compute` | Salary preview for period |
| GET | `/me/payslip` | Payslip PDF/stream (query: month/cycle) |
| GET | `/me/payroll-status` | Payroll cycle status |
| GET | `/me/salary-history-range` | Historical salary |
| GET | `/me/expenses` | My expense claims |
| POST | `/me/expenses` | Create expense (`multipart`) |
| PUT | `/me/expenses/:id` | Update expense |
| GET | `/me/staff-list` | Colleagues list (role-dependent) |

---

## `/attendance` — all routes (JWT + tenant)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/attendance/status` | Today status (in/out/break) |
| GET | `/attendance/history` | History with filters |
| POST | `/attendance/punch-in` | Punch in (`photo` optional) |
| POST | `/attendance/punch-out` | Punch out |
| POST | `/attendance/start-break` | Start break |
| POST | `/attendance/end-break` | End break |
| POST | `/attendance/qr-punch` | QR-based punch |
| POST | `/attendance/ping` | Legacy ping |
| POST | `/attendance/location/ping` | GPS ping |
| POST | `/attendance/auto-punchout` | Auto punch-out job/trigger |
| GET | `/attendance/report` | Report data |
| GET | `/attendance/report/pdf` | Report PDF |
| GET | `/attendance/weekly` | Weekly summary |
| GET | `/attendance/user/:userId` | User attendance (admin) |
| GET | `/attendance/settings/max-break` | Max break setting |
| PUT | `/attendance/settings/max-break` | Update max break |

---

## `/kiosk` — kiosk & face recognition

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/kiosk/login` | Public (rate limited) | `{ username, password }` → kiosk JWT |
| GET | `/kiosk/list-faces` | Kiosk JWT or `x-api-key` | AWS Rekognition enrolled faces |
| POST | `/kiosk/face-recognition` | Kiosk auth | Face match + attendance (`photo`) |
| POST | `/kiosk/punch` | Kiosk auth | Manual staff punch |

Kiosk auth: `Authorization: Bearer <kiosk_token>` or header `x-api-key: <KIOSK_API_KEY>`.

---

## Auth request/response reference

### `POST /auth/send-otp`

**Body:** `{ "phone": "9876543210" }`

**Response:** `{ "success": true, "message": "OTP sent", "exists": true }`

### `POST /auth/verify-otp`

**Body:** `{ "phone": "9876543210", "code": "123456" }`

**Response (single org):** `{ "success": true, "token": "...", "user": { ... } }` + `Set-Cookie: refreshToken`

**Response (multi org):** `{ "success": true, "requireSelection": true, "organizations": [...] }`

### `POST /auth/refresh`

**Cookie:** `refreshToken` (HttpOnly)

**Response:** `{ "success": true, "token": "<new_access_jwt>" }`

### `POST /auth/impersonate/exchange`

**Body:** `{ "code": "<one_time_code_from_superadmin>" }`

**Response:** `{ "success": true, "token", "user", "organizations", "canCreateOrg" }`

---

## Regenerating this documentation

```bash
python scripts/generate_api_docs.py
```

Outputs: `docs/API.md`, `docs/API_ENDPOINTS.md`, `docs/openapi.yaml`.

---

## Changelog (documentation)

- **2026-10-09**: Initial full API doc + endpoint index + OpenAPI skeleton generated from source.
