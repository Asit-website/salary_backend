"""
Generate API documentation from Express route files.
Output: docs/API.md and docs/API_ENDPOINTS.md
"""
import json
import re
import os
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.js"
ROUTES_DIR = ROOT / "src" / "routes"
DOCS = ROOT / "docs"

# index.js mount: app.use('/prefix', variable)
MOUNT_MAP = {
    "authRoutes": "/auth",
    "adminRoutes": "/admin",
    "superadminRoutes": "/superadmin",
    "attendanceRoutes": "/attendance",
    "kioskRoutes": "/kiosk",
    "salesRoutes": "/sales",
    "leaveRoutes": "/leave",
    "meRoutes": "/me",
    "documentsRoutes": "/documents",
    "securityRoutes": "/security",
    "salaryTemplateRoutes": "/salary-templates",
    "subscriptionRoutes": "/subscription",
    "rolesRoutes": None,  # multiple mounts
    "userAccessRoutes": "/admin/user-access",
    "letterRoutes": "/admin/letters",
    "salesIncentiveRoutes": "/admin/sales-incentives",
    "todoRoutes": "/activities",
    "meetingRoutes": "/meetings",
    "ticketRoutes": "/tickets",
    "taskManagementRoutes": "/admin/task-management",
    "rosterRoutes": "",
    "shiftRotationRoutes": "/admin/shift-rotation",
    "aiRoutes": None,
    "channelPartnerRoutes": "/channel-partner",
    "superadminMailRoutes": "/superadmin/mail",
    "recruitmentRoutes": "/admin/recruitment",
    "socialRoutes": "/admin/social",
    "notificationRoutes": "/admin/notifications",
    "wishesRoutes": "/admin/wishes",
}

EXTRA_MOUNTS = {
    "roles.js": ["/admin/roles", "/mobile/roles"],
    "ai.js": ["/admin/ai", "/ai"],
    "weeklyOff.js": ["/leave/weekly-off"],
    "esslWebhook.js": ["/api/webhook/essl"],
    "tally.js": ["/admin/tally"],
}

ROUTE_RE = re.compile(
    r"router\.(get|post|put|patch|delete)\s*\(\s*['\"`]([^'\"`]+)['\"`]",
    re.IGNORECASE | re.MULTILINE,
)
# Collapse newlines between router.METHOD( and path string
def preprocess_routes_source(text: str) -> str:
    return re.sub(
        r"router\.(get|post|put|patch|delete)\s*\(\s*\n\s*['\"`]([^'\"`]+)['\"`]",
        lambda m: f"router.{m.group(1)}('{m.group(2)}'",
        text,
        flags=re.IGNORECASE,
    )
ROUTER_USE_RE = re.compile(
    r"router\.use\s*\(\s*(authRequired|requireRole|tenantEnforce|authLimiter)[^)]*\)",
)


def normalize_path(prefix: str, route_path: str) -> str:
    if not route_path.startswith("/"):
        route_path = "/" + route_path
    prefix = prefix or ""
    if prefix and not prefix.startswith("/"):
        prefix = "/" + prefix
    if prefix.endswith("/") and route_path.startswith("/"):
        return prefix[:-1] + route_path
    if not prefix:
        return route_path
    return prefix + route_path


def file_for_export(name: str) -> str:
    mapping = {
        "authRoutes": "auth.js",
        "adminRoutes": "admin.js",
    }
    if name in mapping:
        return mapping[name]
    # require('./src/routes/foo') or fooRoutes -> foo.js
    if name.endswith("Routes"):
        base = name[:-6]
        # camelCase to kebab? superadminMail -> superadminMail.js
        return re.sub(r"([a-z])([A-Z])", r"\1\2", base).lower()
    return name


def parse_index_mounts():
    text = INDEX.read_text(encoding="utf-8", errors="ignore")
    mounts = {}
    for m in re.finditer(r"app\.use\(\s*['\"`]([^'\"`]*)['\"`]\s*,\s*require\('\./src/routes/([^']+)'\)", text):
        mounts[m.group(2) + ".js"] = m.group(1)
    for m in re.finditer(r"app\.use\(\s*['\"`]([^'\"`]*)['\"`]\s*,\s*(\w+Routes)\s*\)", text):
        var = m.group(2)
        fn = var[0].lower() + re.sub(r"([A-Z])", lambda x: x.group(1).lower(), var[1:])
        if var == "weeklyOffRoutes":
            continue
        # heuristic file names
        files = {
            "authRoutes": "auth.js",
            "adminRoutes": "admin.js",
            "superadminRoutes": "superadmin.js",
            "attendanceRoutes": "attendance.js",
            "kioskRoutes": "kiosk.js",
            "salesRoutes": "sales.js",
            "leaveRoutes": "leave.js",
            "meRoutes": "me.js",
            "documentsRoutes": "documents.js",
            "securityRoutes": "security.js",
            "salaryTemplateRoutes": "salaryTemplates.js",
            "subscriptionRoutes": "subscription.js",
            "rolesRoutes": "roles.js",
            "userAccessRoutes": "userAccess.js",
            "letterRoutes": "letter.js",
            "salesIncentiveRoutes": "salesIncentive.js",
            "todoRoutes": "todo.js",
            "meetingRoutes": "meeting.js",
            "ticketRoutes": "ticket.js",
            "taskManagementRoutes": "taskManagement.js",
            "rosterRoutes": "roster.js",
            "shiftRotationRoutes": "shiftRotation.js",
            "aiRoutes": "ai.js",
            "channelPartnerRoutes": "channelPartner.js",
            "superadminMailRoutes": "superadminMail.js",
            "recruitmentRoutes": "recruitment.js",
            "socialRoutes": "social.js",
            "notificationRoutes": "notification.js",
            "wishesRoutes": "wishes.js",
        }
        if var in files:
            mounts[files[var]] = m.group(1)
    for m in re.finditer(r"app\.use\(\s*(\w+Routes)\s*\)", text):
        var = m.group(1)
        if var == "rosterRoutes":
            mounts["roster.js"] = ""
    return mounts


def infer_auth(filepath: str, line_no: int, line: str, file_uses: list) -> str:
    if "authLimiter" in line and "authRequired" not in line:
        if "/send-otp" in line or "/login" in line:
            return "Public (rate limited)"
    if "authRequired" in line:
        auth = "Bearer JWT"
        if "tenantEnforce" in line:
            auth += " + tenant"
        if "requireRole" in line:
            auth += " + role"
        return auth
    if filepath.name == "admin.js":
        for use_line, middleware in file_uses:
            if use_line < line_no:
                if middleware == "authRequired" and line_no > use_line:
                    return "Bearer JWT + role + tenant (router default)"
        if line_no < 570:
            return "Varies / public (pre-auth routes)"
    if filepath.name in ("auth.js", "kiosk.js", "esslWebhook.js"):
        if any(x in line for x in ("send-otp", "verify-otp", "login", "signup", "refresh", "impersonate/exchange", "otp/latest", "reset-password")):
            return "Public (some rate limited)"
    if filepath.name == "esslWebhook.js":
        return "Webhook secret (ESSL_WEBHOOK_SECRET)"
    return "Bearer JWT (typical)"


PUBLIC_PATHS = {
    ("GET", "/health"),
    ("POST", "/auth/send-otp"),
    ("POST", "/auth/verify-otp"),
    ("POST", "/auth/login"),
    ("POST", "/auth/reset-password"),
    ("POST", "/auth/signup-admin"),
    ("POST", "/auth/refresh"),
    ("POST", "/auth/refresh-mobile"),
    ("POST", "/auth/logout"),
    ("POST", "/auth/logout-mobile"),
    ("POST", "/auth/impersonate/exchange"),
    ("GET", "/auth/otp/latest"),
    ("POST", "/kiosk/login"),
    ("POST", "/api/webhook/essl"),
    ("POST", "/api/webhook/essl/"),
}


def security_kind(method: str, path: str, auth: str) -> str:
    """none | bearer | webhook"""
    m = method.upper()
    p = path.rstrip("/")
    public_norm = {(a, b.rstrip("/")) for a, b in PUBLIC_PATHS}
    if (m, p) in public_norm:
        return "none"
    if "mock-pg" in path or "mock_pg" in path:
        return "none"
    if auth.startswith("Public") or auth == "Public":
        return "none"
    if "Webhook" in auth:
        return "webhook"
    return "bearer"


def collect_routes():
    index_mounts = parse_index_mounts()
    all_endpoints = []

    static_routes = [
        ("GET", "/health", "Public", "index.js", "Health check"),
        ("GET", "/view-pdf/:month/:filename", "Bearer JWT", "index.js", "Payslip PDF viewer HTML"),
        ("GET", "/uploads/*", "Bearer JWT (?token= query supported)", "index.js", "Authenticated file download"),
    ]
    for item in static_routes:
        all_endpoints.append({
            "method": item[0],
            "path": item[1],
            "auth": item[2],
            "security": security_kind(item[0], item[1], item[2]),
            "module": item[3],
            "note": item[4],
        })

    skip_orphan = {"assets.js", "assets-simple.js"}  # not mounted in index.js

    for js in sorted(ROUTES_DIR.glob("*.js")):
        if js.name in skip_orphan:
            continue
        text = preprocess_routes_source(js.read_text(encoding="utf-8", errors="ignore"))
        file_uses = []
        for i, line in enumerate(text.splitlines(), 1):
            um = ROUTER_USE_RE.search(line)
            if um:
                file_uses.append((i, um.group(1)))

        prefixes = []
        if js.name in EXTRA_MOUNTS:
            prefixes = EXTRA_MOUNTS[js.name]
        elif js.name in index_mounts:
            prefixes = [index_mounts[js.name]]
        else:
            prefixes = [""]

        for i, line in enumerate(text.splitlines(), 1):
            for m in ROUTE_RE.finditer(line):
                method = m.group(1).upper()
                path = m.group(2)
                auth = infer_auth(js, i, line, file_uses)
                note = ""
                if "mock-pg" in path:
                    note = "Only if ALLOW_MOCK_PAYMENTS=true"
                for prefix in prefixes:
                    full = normalize_path(prefix, path)
                    all_endpoints.append({
                        "method": method,
                        "path": full,
                        "auth": auth,
                        "security": security_kind(method, full, auth),
                        "module": js.name,
                        "note": note,
                    })

    # dedupe same method+path
    seen = set()
    unique = []
    for ep in all_endpoints:
        key = (ep["method"], ep["path"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(ep)
    unique.sort(key=lambda x: (x["path"], x["method"]))
    return unique


ERROR_RESPONSE = {"success": False, "message": "Reason (401/403/404/500)"}

KNOWN_REQUESTS = {
    ("POST", "/auth/send-otp"): {"phone": "9831052038", "purpose": "login"},
    ("POST", "/auth/verify-otp"): {"phone": "9831052038", "code": "123456"},
    ("POST", "/auth/login"): {"phone": "9831052038", "password": "Thinktech@123"},
    ("POST", "/auth/reset-password"): {
        "phone": "9831052038",
        "code": "123456",
        "newPassword": "Thinktech@123",
    },
    ("POST", "/auth/refresh-mobile"): {"refreshToken": "<refresh_token>"},
    ("POST", "/auth/impersonate/exchange"): {"code": "<one_time_code>"},
    ("POST", "/kiosk/login"): {"username": "kiosk_user", "password": "kiosk_password"},
    ("POST", "/attendance/punch-in"): {"latitude": 22.57, "longitude": 88.36},
    ("POST", "/attendance/punch-out"): {},
    ("GET", "/health"): None,
}


def path_key(method: str, path: str):
    p = path.rstrip("/") or "/"
    return (method.upper(), p)


def infer_request_example(method: str, path: str):
    key = path_key(method, path)
    if key in KNOWN_REQUESTS:
        return KNOWN_REQUESTS[key]
    m = method.upper()
    if m in ("GET", "DELETE", "HEAD", "OPTIONS"):
        return None
    if "upload" in path or "photo" in path or "multipart" in path:
        return {"_note": "multipart/form-data — see route (e.g. field photo, file)"}
    if m == "PATCH" or m == "PUT":
        return {"_example": "Partial or full resource fields as JSON"}
    return {"_example": "JSON body — see API.md module section or admin.js handler"}


def infer_query_string(method: str, path: str) -> str:
    if method.upper() != "GET":
        return ""
    if any(x in path for x in ("/staff", "/advances", "/loans", "/clients", "/users")):
        return "?page=1&pageSize=20"
    if "month" in path or "payroll" in path:
        return "?monthKey=2026-01"
    if "export" in path or "report" in path:
        return "?from=2026-01-01&to=2026-01-31"
    return ""


def infer_response_success(method: str, path: str, security: str):
    key = path_key(method, path)
    p = path.rstrip("/") or "/"
    if p == "/health":
        return {"ok": True}
    if p == "/auth/send-otp":
        return {"success": True, "message": "OTP sent"}
    if p in ("/auth/login", "/auth/verify-otp"):
        return {
            "success": True,
            "token": "<access_jwt>",
            "user": {
                "id": 1,
                "role": "superadmin",
                "phone": "9831052038",
                "orgAccountId": None,
            },
        }
    if security == "none" and method == "POST" and "/auth/" in p:
        return {"success": True, "message": "OK"}
    if method == "GET":
        return {"success": True, "data": [], "total": 0}
    if method == "DELETE":
        return {"success": True, "message": "Deleted"}
    return {"success": True, "message": "OK", "data": {}}


def curl_for_ep(ep, base="http://localhost:4000"):
    method = ep["method"]
    path = ep["path"] + infer_query_string(method, ep["path"])
    url = base + path
    parts = [f"curl -X {method} '{url}'"]
    if ep.get("security") == "bearer":
        parts.append("-H 'Authorization: Bearer $TOKEN'")
    if ep.get("security") == "webhook":
        parts.append("-H 'x-webhook-secret: $ESSL_WEBHOOK_SECRET'")
    req = infer_request_example(method, ep["path"])
    if req is not None and method.upper() not in ("GET", "DELETE"):
        body = json.dumps(req).replace('"', '\\"')
        parts.append('-H "Content-Type: application/json"')
        parts.append(f'-d "{body}"')
    return " \\\n  ".join(parts)


def write_endpoints_test(endpoints):
    lines = [
        "# Vetansutra API — Request / Response (test reference)",
        "",
        f"Auto-generated for **{len(endpoints)}** endpoints. Base URL: `http://localhost:4000`",
        "",
        "1. Login: `POST /auth/login` with phone + password → copy `token`.",
        "2. Set `export TOKEN=<access_jwt>` (bash) or use Postman `{{accessToken}}`.",
        "3. Run cURL below; replace `:id` path params with real IDs.",
        "",
        "Standard error body: `{\"success\": false, \"message\": \"...\"}`",
        "",
        "---",
        "",
    ]
    for ep in endpoints:
        method = ep["method"]
        path = ep["path"]
        req = infer_request_example(method, path)
        ok = infer_response_success(method, path, ep.get("security", "bearer"))
        q = infer_query_string(method, path)
        lines.append(f"## `{method}` `{path}`")
        lines.append("")
        lines.append(f"- **Auth:** {ep['auth']}")
        if ep.get("note"):
            lines.append(f"- **Note:** {ep['note']}")
        lines.append("")
        if method == "GET" and q:
            lines.append(f"**Query (typical):** `{q}`")
            lines.append("")
        if req is None:
            lines.append("**Request body:** none")
        else:
            lines.append("**Request body (example):**")
            lines.append("```json")
            lines.append(json.dumps(req, indent=2))
            lines.append("```")
        lines.append("")
        lines.append("**cURL:**")
        lines.append("```bash")
        lines.append(curl_for_ep(ep))
        lines.append("```")
        lines.append("")
        lines.append("**Response 200 (example):**")
        lines.append("```json")
        lines.append(json.dumps(ok, indent=2))
        lines.append("```")
        lines.append("")
        lines.append("**Response error (example):**")
        lines.append("```json")
        lines.append(json.dumps(ERROR_RESPONSE, indent=2))
        lines.append("```")
        lines.append("")
        lines.append("---")
        lines.append("")

    (DOCS / "API_ENDPOINTS_TEST.md").write_text("\n".join(lines), encoding="utf-8")


def write_docs(endpoints):
    DOCS.mkdir(exist_ok=True)

    by_module = defaultdict(list)
    for ep in endpoints:
        by_module[ep["module"]].append(ep)

    # Full endpoint list
    lines = [
        "# Vetansutra API — Endpoint Index",
        "",
        f"Auto-generated from route sources. **{len(endpoints)}** endpoints.",
        "",
        "Per-endpoint **request/response examples and cURL**: [API_ENDPOINTS_TEST.md](./API_ENDPOINTS_TEST.md)",
        "",
        "| Method | Path | Auth | Source | Notes |",
        "|--------|------|------|--------|-------|",
    ]
    for ep in endpoints:
        note = ep.get("note") or ""
        lines.append(
            f"| `{ep['method']}` | `{ep['path']}` | {ep['auth']} | {ep['module']} | {note} |"
        )
    (DOCS / "API_ENDPOINTS.md").write_text("\n".join(lines), encoding="utf-8")

    # Main API guide
    guide = """# Vetansutra REST API Documentation

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
"""
    (DOCS / "API.md").write_text(guide, encoding="utf-8")


def write_openapi(endpoints):
    public_n = sum(1 for e in endpoints if e.get("security") == "none")
    bearer_n = sum(1 for e in endpoints if e.get("security") == "bearer")
    webhook_n = sum(1 for e in endpoints if e.get("security") == "webhook")

    lines = [
        "openapi: 3.0.3",
        "info:",
        "  title: Vetansutra API",
        "  version: 1.0.0",
        "  description: |",
        "    Vetansutra REST API. Import into Postman:",
        "    1. Import docs/postman/Vetansutra.postman_environment.json",
        "    2. Collection Settings → Authorization → Bearer Token → `{{accessToken}}`",
        "    3. Run folder **Auth → Verify OTP** to fill `accessToken` automatically.",
        f"    Public endpoints (no auth): {public_n}. Bearer JWT: {bearer_n}. Webhook: {webhook_n}.",
        "servers:",
        "  - url: https://backend.vetansutra.com",
        "    description: Production",
        "  - url: http://localhost:4000",
        "    description: Local",
        "components:",
        "  securitySchemes:",
        "    bearerAuth:",
        "      type: http",
        "      scheme: bearer",
        "      bearerFormat: JWT",
        "      description: Access token from /auth/verify-otp or /auth/login (15 min TTL)",
        "    webhookSecret:",
        "      type: apiKey",
        "      in: header",
        "      name: x-webhook-secret",
        "      description: ESSL_WEBHOOK_SECRET env value",
        "paths:",
    ]
    by_path = defaultdict(list)
    for ep in endpoints:
        by_path[ep["path"]].append(ep)

    for path in sorted(by_path.keys()):
        oas_path = re.sub(r":(\w+)", r"{\1}", path)
        if "*" in oas_path:
            oas_path = oas_path.replace("*", "filePath")
        lines.append(f"  {oas_path}:")
        for ep in by_path[path]:
            method = ep["method"].lower()
            kind = ep.get("security", "bearer")
            lines.append(f"    {method}:")
            lines.append(f"      summary: {ep['module']}")
            lines.append(f"      description: Auth — {ep['auth']}")
            if kind == "none":
                lines.append("      security: []")
            elif kind == "webhook":
                lines.append("      security:")
                lines.append("        - webhookSecret: []")
            else:
                lines.append("      security:")
                lines.append("        - bearerAuth: []")
            req = infer_request_example(ep["method"], ep["path"])
            if req is not None and ep["method"].upper() not in ("GET", "DELETE"):
                lines.append("      requestBody:")
                lines.append("        required: true")
                lines.append("        content:")
                lines.append("          application/json:")
                lines.append("            example:")
                for rl in json.dumps(req, indent=2).splitlines():
                    lines.append(f"              {rl}")
            lines.append("      responses:")
            ok = infer_response_success(ep["method"], ep["path"], kind)
            lines.append('        "200":')
            lines.append("          description: OK")
            lines.append("          content:")
            lines.append("            application/json:")
            lines.append("              example:")
            for rl in json.dumps(ok, indent=2).splitlines():
                lines.append(f"                {rl}")
            lines.append('        "401":')
            lines.append("          description: Unauthorized")
            lines.append("          content:")
            lines.append("            application/json:")
            lines.append("              example:")
            for rl in json.dumps(ERROR_RESPONSE, indent=2).splitlines():
                lines.append(f"                {rl}")
    (DOCS / "openapi.yaml").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_postman_assets(endpoints):
    postman_dir = DOCS / "postman"
    postman_dir.mkdir(exist_ok=True)

    environment = {
        "id": "vetansutra-env",
        "name": "Vetansutra API",
        "values": [
            {"key": "baseUrl", "value": "http://localhost:4000", "enabled": True},
            {"key": "accessToken", "value": "", "enabled": True},
            {"key": "phone", "value": "9876543210", "enabled": True},
            {"key": "otp", "value": "", "enabled": True},
            {"key": "webhookSecret", "value": "", "enabled": True},
        ],
        "_postman_variable_scope": "environment",
    }
    (postman_dir / "Vetansutra.postman_environment.json").write_text(
        json.dumps(environment, indent=2), encoding="utf-8"
    )

    auth_folder = {
        "name": "Auth (No Auth — run first)",
        "auth": {"type": "noauth"},
        "item": [
            {
                "name": "Send OTP",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": '{\n  "phone": "{{phone}}"\n}',
                    },
                    "url": "{{baseUrl}}/auth/send-otp",
                },
            },
            {
                "name": "Verify OTP (saves accessToken)",
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "exec": [
                                "const j = pm.response.json();",
                                "if (j.token) {",
                                "  pm.environment.set('accessToken', j.token);",
                                "  pm.collectionVariables.set('accessToken', j.token);",
                                "}",
                            ],
                            "type": "text/javascript",
                        },
                    }
                ],
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": '{\n  "phone": "{{phone}}",\n  "code": "{{otp}}"\n}',
                    },
                    "url": "{{baseUrl}}/auth/verify-otp",
                },
            },
            {
                "name": "Login with password (saves accessToken)",
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "exec": [
                                "const j = pm.response.json();",
                                "if (j.token) {",
                                "  pm.environment.set('accessToken', j.token);",
                                "  pm.collectionVariables.set('accessToken', j.token);",
                                "}",
                            ],
                            "type": "text/javascript",
                        },
                    }
                ],
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": '{\n  "phone": "{{phone}}",\n  "password": "your_password"\n}',
                    },
                    "url": "{{baseUrl}}/auth/login",
                },
            },
            {"name": "Health", "request": {"method": "GET", "url": "{{baseUrl}}/health"}},
        ],
    }

    collection = {
        "info": {
            "name": "Vetansutra API (Auth helper)",
            "description": (
                "Set Collection Authorization: Bearer Token = {{accessToken}}. "
                "Run Auth folder first. Import openapi.yaml for full API."
            ),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "auth": {
            "type": "bearer",
            "bearer": [{"key": "token", "value": "{{accessToken}}", "type": "string"}],
        },
        "variable": [
            {"key": "baseUrl", "value": "http://localhost:4000"},
            {"key": "accessToken", "value": ""},
        ],
        "item": [auth_folder],
    }
    (postman_dir / "Vetansutra.postman_collection.json").write_text(
        json.dumps(collection, indent=2), encoding="utf-8"
    )

    public_n = sum(1 for e in endpoints if e.get("security") == "none")
    bearer_n = sum(1 for e in endpoints if e.get("security") == "bearer")
    readme = f"""# Postman setup

## Why you see \"478 endpoints need credentials\"

Most Vetansutra APIs require a **JWT**. Only **{public_n}** endpoints are public; **{bearer_n}** need `Authorization: Bearer <token>`.

You do **not** set auth on each request manually. Set it **once** at collection level.

## Quick setup

1. Import `Vetansutra.postman_environment.json` and select environment **Vetansutra API**.
2. Import `Vetansutra.postman_collection.json` OR re-import `../openapi.yaml` after regenerating docs.
3. Open collection **⋯ → Edit → Authorization**:
   - Type: **Bearer Token**
   - Token: `{{accessToken}}`
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
"""
    (postman_dir / "README.md").write_text(readme, encoding="utf-8")


def main():
    eps = collect_routes()
    write_docs(eps)
    write_endpoints_test(eps)
    write_openapi(eps)
    write_postman_assets(eps)
    public_n = sum(1 for e in eps if e.get("security") == "none")
    bearer_n = sum(1 for e in eps if e.get("security") == "bearer")
    print(
        f"Generated {len(eps)} endpoints (public={public_n}, bearer={bearer_n}) -> "
        f"docs/API.md, docs/API_ENDPOINTS.md, docs/API_ENDPOINTS_TEST.md, "
        f"docs/openapi.yaml, docs/postman/"
    )


if __name__ == "__main__":
    main()
