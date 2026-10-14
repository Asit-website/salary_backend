# Vetansutra API — Request / Response (test reference)

Auto-generated for **697** endpoints. Base URL: `http://localhost:4000`

1. Login: `POST /auth/login` with phone + password → copy `token`.
2. Set `export TOKEN=<access_jwt>` (bash) or use Postman `{{accessToken}}`.
3. Run cURL below; replace `:id` path params with real IDs.

Standard error body: `{"success": false, "message": "..."}`

---

## `POST` `/activities/`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/activities/' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/activities/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/activities/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/activities/:id/status`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/activities/:id/status' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/activities/:id/transfer`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/activities/:id/transfer' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/activities/me`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/activities/me' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/addon-settings`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/addon-settings' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/addon-settings`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/addon-settings' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/admins`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/admins' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/advances`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/advances?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/advances`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/advances' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/advances/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/advances/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/advances/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/advances/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/ai/anomalies`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/ai/anomalies' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/ai/anomalies/compute`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/ai/anomalies/compute' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/ai/anomalies/top-today`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/ai/anomalies/top-today' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/ai/ask`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/ai/ask' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/ai/attendance-productivity`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/ai/attendance-productivity' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/ai/chat`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/ai/chat' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/ai/reliability`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/ai/reliability' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/ai/reliability/compute`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/ai/reliability/compute' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/ai/salary-forecast`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/ai/salary-forecast' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/ai/salary-forecast/compute`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/ai/salary-forecast/compute' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/asset-assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/asset-assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/asset-assignments/:id/return`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/asset-assignments/:id/return' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/asset-maintenance`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/asset-maintenance' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/asset-maintenance`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/asset-maintenance' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/asset-maintenance/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/asset-maintenance/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/asset-maintenance/:id/complete`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/asset-maintenance/:id/complete' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/asset-maintenance/stats`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/asset-maintenance/stats' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/assets`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/assets' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/assets`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/assets' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/assets/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/assets/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/assets/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/assets/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/assets/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/assets/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/assets/:id/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/assets/:id/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/assets/:id/return`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/assets/:id/return' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/assets/stats`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/assets/stats' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/assignments' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/assignments/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/assignments/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/attendance`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/attendance' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/attendance`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/attendance' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/attendance-templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/attendance-templates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/attendance/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/attendance/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/attendance/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/attendance/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/attendance/bulk`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/attendance/bulk' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/attendance/check-leave`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/attendance/check-leave' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/attendance/check-special-day`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/attendance/check-special-day' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/attendance/check-special-days-batch`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/attendance/check-special-days-batch' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/attendance/export`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/attendance/export?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/attendance/month`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/attendance/month?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/attendance/note`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/attendance/note' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/attendance/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/attendance/templates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/attendance/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/attendance/templates' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/attendance/templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/attendance/templates/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/attendance/templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/attendance/templates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/business-functions`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/business-functions' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/business-functions`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/business-functions' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/business-functions/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/business-functions/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/business-functions/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/business-functions/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/business-functions/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/business-functions/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/business-functions/assign-department`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/business-functions/assign-department' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/business-functions/department/:name/staff`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/business-functions/department/:name/staff?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/business-functions/department/:name/staff/:userId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/business-functions/department/:name/staff/:userId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/clients`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/clients' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/clients/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/clients/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/construction/work-units/:id/verify`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/construction/work-units/:id/verify' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/dashboard`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/dashboard' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/dashboard/attendance-chart`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/dashboard/attendance-chart' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/dashboard/card-details`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/dashboard/card-details' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/dashboard/department-distribution`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/dashboard/department-distribution' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/dashboard/late-arrivals`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/dashboard/late-arrivals' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/dashboard/salary-chart`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/dashboard/salary-chart' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/dashboard/stats`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/dashboard/stats' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/dashboard/upcoming-holidays`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/dashboard/upcoming-holidays' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/device-management/devices`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/device-management/devices' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/document-types`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/document-types' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/document-types`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/document-types' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/document-types/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/document-types/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/document-types/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/document-types/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/documents/:docId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/documents/:docId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/documents/:docId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/documents/:docId' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/documents/:docId/status`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/documents/:docId/status' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/documents/assign-all`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/documents/assign-all' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/documents/recent`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/documents/recent' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/expenses`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/expenses' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/expenses/:claimId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/expenses/:claimId' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/expenses/:claimId/pay`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/expenses/:claimId/pay' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/expenses/:claimId/status`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/expenses/:claimId/status' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/expenses/export`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/expenses/export?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/geofence/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/geofence/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/geofence/assign/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/geofence/assign/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/geofence/assignments/:userId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/geofence/assignments/:userId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/geofence/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/geofence/templates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/geofence/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/geofence/templates' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/geofence/templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/geofence/templates/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/geofence/templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/geofence/templates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/geofence/templates/:id/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/geofence/templates/:id/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/geolocation`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/geolocation' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/geolocation/:staffId/timeline`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/geolocation/:staffId/timeline' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/geolocation/stats`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/geolocation/stats' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/holiday-work-pay/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/holiday-work-pay/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/holiday-work-pay/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/holiday-work-pay/assignments' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/holiday-work-pay/assignments/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/holiday-work-pay/assignments/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/holiday-work-pay/assignments/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/holiday-work-pay/assignments/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/holiday-work-pay/rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/holiday-work-pay/rules' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/holiday-work-pay/rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/holiday-work-pay/rules' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/holiday-work-pay/rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/holiday-work-pay/rules/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/holiday-work-pay/rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/holiday-work-pay/rules/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/holidays/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/holidays/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/holidays/assign/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/holidays/assign/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/holidays/master`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/holidays/master' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/holidays/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/holidays/templates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/holidays/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/holidays/templates' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/holidays/templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/holidays/templates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/holidays/templates/:id/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/holidays/templates/:id/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/incentives`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/incentives' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/incentives`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/incentives' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/incentives/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/incentives/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/leave/allocate`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/leave/allocate' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/leave/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/leave/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/leave/assign/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/leave/assign/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/leave/balances`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/leave/balances' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/leave/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/leave/templates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/leave/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/leave/templates' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/leave/templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/leave/templates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/leave/templates/:id/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/leave/templates/:id/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/leave/templates/:id/categories-bulk`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/leave/templates/:id/categories-bulk' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/leaves`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/leaves' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/leaves/:leaveId/status`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/leaves/:leaveId/status' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/letters/issue`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/letters/issue' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/letters/issued`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/letters/issued' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/letters/issued/:id`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/letters/issued/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/letters/templates`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/letters/templates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/letters/templates`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/letters/templates' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/letters/templates/:id`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/letters/templates/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/letters/templates/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/letters/templates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/loans`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/loans?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/loans`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/loans' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/loans/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/loans/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/loans/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/loans/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/mock-pg-checkout`

- **Auth:** Varies / public (pre-auth routes)
- **Note:** Only if ALLOW_MOCK_PAYMENTS=true

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/mock-pg-checkout'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/mock-pg-checkout/pay`

- **Auth:** Varies / public (pre-auth routes)
- **Note:** Only if ALLOW_MOCK_PAYMENTS=true

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/mock-pg-checkout/pay' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/mock_pg_checkout`

- **Auth:** Varies / public (pre-auth routes)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/mock_pg_checkout'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/mock_pg_checkout/pay`

- **Auth:** Varies / public (pre-auth routes)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/mock_pg_checkout/pay' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/my-organizations`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/my-organizations' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/my-payroll-status`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/my-payroll-status?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/notifications/`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/notifications/' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/notifications/:id/read`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/notifications/:id/read' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/notifications/read-all`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/notifications/read-all' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/org/staff`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/org/staff?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll-inspection/analyze`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll-inspection/analyze' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll-inspection/apply-fixes`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll-inspection/apply-fixes' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll-inspection/day-timeline`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll-inspection/day-timeline?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll-inspection/parse`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll-inspection/parse' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/:cycleId/compute`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/:cycleId/compute' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/:cycleId/disburse-cashfree`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/:cycleId/disburse-cashfree' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll/:cycleId/export`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll/:cycleId/export?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll/:cycleId/export-bank-file`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll/:cycleId/export-bank-file?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/payroll/:cycleId/line/:lineId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/payroll/:cycleId/line/:lineId' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/:cycleId/lines/mark-paid`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/:cycleId/lines/mark-paid' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/:cycleId/lock`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/:cycleId/lock' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/:cycleId/mark-paid`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/:cycleId/mark-paid' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll/:cycleId/salary-register-excel`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll/:cycleId/salary-register-excel?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/:cycleId/unlock`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/:cycleId/unlock' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll/fnf`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll/fnf?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/fnf/:id/pay`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/fnf/:id/pay' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll/fnf/:id/pdf`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll/fnf/:id/pdf?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/fnf/:id/settle`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/fnf/:id/settle' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll/fnf/eligible-staff`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll/fnf/eligible-staff?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/fnf/finalize`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/fnf/finalize' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll/fnf/settings`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll/fnf/settings?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/fnf/settings`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/fnf/settings' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll/fnf/staff-details/:userId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll/fnf/staff-details/:userId?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/generate-payslip`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/generate-payslip' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/manual-historical`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/manual-historical' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll/monthly-summary-excel`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll/monthly-summary-excel?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll/salary-register-excel-by-month`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll/salary-register-excel-by-month?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/payroll/salary-register-template-wise-excel`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/payroll/salary-register-template-wise-excel?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/payroll/test-attendance-reminder`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/payroll/test-attendance-reminder' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/performance/appraisals`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/performance/appraisals' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/performance/appraisals`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/performance/appraisals' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/performance/appraisals/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/performance/appraisals/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/performance/ratings`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/performance/ratings' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/performance/ratings`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/performance/ratings' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/performance/ratings/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/performance/ratings/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/qr-attendance/config`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/qr-attendance/config' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/qr-attendance/generate`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/qr-attendance/generate' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/qr-attendance/zones`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/qr-attendance/zones' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/qr-attendance/zones`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/qr-attendance/zones' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/qr-attendance/zones/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/qr-attendance/zones/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/qr-attendance/zones/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/qr-attendance/zones/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/qr-attendance/zones/:id/regenerate`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/qr-attendance/zones/:id/regenerate' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/recruitment/candidates`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/recruitment/candidates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/recruitment/candidates`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/recruitment/candidates' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/recruitment/candidates/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/recruitment/candidates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/recruitment/interviews`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/recruitment/interviews' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/recruitment/interviews`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/recruitment/interviews' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/recruitment/interviews/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/recruitment/interviews/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/recruitment/jobs`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/recruitment/jobs' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/recruitment/jobs`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/recruitment/jobs' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/recruitment/jobs/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/recruitment/jobs/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/absent-report`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/absent-report?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/comparison`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/comparison?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/late-penalty-analysis`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/late-penalty-analysis?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/monthly-attendance`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/monthly-attendance?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/org-activities`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/org-activities?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/org-applied-leave`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/org-applied-leave?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/org-attendance`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/org-attendance?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/org-attendance-matrix`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/org-attendance-matrix?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/org-detailed-attendance`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/org-detailed-attendance?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/org-leave`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/org-leave?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/org-leave-balance`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/org-leave-balance?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/org-meetings`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/org-meetings?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/org-punch-matrix`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/org-punch-matrix?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/org-sales`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/org-sales?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/org-tickets`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/org-tickets?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/ot-impact`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/ot-impact?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/per-day-salary-average`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/per-day-salary-average?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/reports/staff-login-logout`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/reports/staff-login-logout?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/rmo-settings`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/rmo-settings' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/rmo-settings`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/rmo-settings' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/roles/assign-role`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/roles/assign-role' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/roles/bulk-assign-role`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/roles/bulk-assign-role' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/roles/debug-geolocation`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/roles/debug-geolocation' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/roles/fix-geo-role`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/roles/fix-geo-role' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/roles/geolocation-limits`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/roles/geolocation-limits' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/roles/my-permissions`

- **Auth:** Bearer JWT

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/roles/my-permissions' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/roles/my-permissions-open`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/roles/my-permissions-open' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/roles/permissions`

- **Auth:** Bearer JWT

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/roles/permissions' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/roles/roles`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/roles/roles' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/roles/roles`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/roles/roles' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/roles/roles/:id`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/roles/roles/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/roles/roles/:id`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/roles/roles/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/roles/staff-with-roles`

- **Auth:** Bearer JWT + tenant

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/roles/staff-with-roles?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/roles/test-subscription`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/roles/test-subscription' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/roles/user-permissions`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/roles/user-permissions' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/roster`

- **Auth:** Bearer JWT + tenant + role

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/roster' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/roster`

- **Auth:** Bearer JWT + tenant + role

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/roster' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/roster/staff`

- **Auth:** Bearer JWT + tenant + role

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/roster/staff?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/routes`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/routes' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/routes`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/routes' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/routes/:id/stops-bulk`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/routes/:id/stops-bulk' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/routes/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/routes/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/salary-template-fields/:templateId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/salary-template-fields/:templateId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/salary-templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/salary-templates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/salary-templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/salary-templates' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/salary-templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/salary-templates/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/salary-templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/salary-templates/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/salary-templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/salary-templates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/salary/access`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/salary/access' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/salary/access-bulk`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/salary/access-bulk' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/salary/access/:userId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/salary/access/:userId' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/salary/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/salary/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/salary/assignment/:userId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/salary/assignment/:userId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/salary/compute/:userId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/salary/compute/:userId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/salary/esi-as-ta`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/salary/esi-as-ta' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/salary/esi-as-ta-bulk`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/salary/esi-as-ta-bulk' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/salary/no-absent-pay`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/salary/no-absent-pay' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/salary/no-absent-pay-bulk`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/salary/no-absent-pay-bulk' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/salary/payable-days`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/salary/payable-days' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/salary/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/salary/templates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/salary/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/salary/templates' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/salary/templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/salary/templates/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/salary/templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/salary/templates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/salary/wo-holiday-as-ot`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/salary/wo-holiday-as-ot' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/salary/wo-holiday-as-ot-bulk`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/salary/wo-holiday-as-ot-bulk' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales-incentives/`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales-incentives/' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/sales-incentives/`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/sales-incentives/' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/sales-incentives/:id`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/sales-incentives/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/sales-incentives/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/sales-incentives/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales-incentives/approvals`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales-incentives/approvals' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/sales-incentives/approvals/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/sales-incentives/approvals/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales-incentives/assignments`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales-incentives/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/sales-incentives/assignments`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/sales-incentives/assignments' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/sales-incentives/assignments/bulk`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/sales-incentives/assignments/bulk' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/sales/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/sales/assignments' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/sales/assignments/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/sales/assignments/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/sales/assignments/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/sales/assignments/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales/clients`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales/clients?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/sales/clients`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/sales/clients' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/sales/clients/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/sales/clients/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/sales/clients/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/sales/clients/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales/orders`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales/orders' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales/orders/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales/orders/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales/orders/export`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales/orders/export?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales/targets`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales/targets' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/sales/targets`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/sales/targets' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/sales/targets/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/sales/targets/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/sales/targets/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/sales/targets/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales/visits`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales/visits' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales/visits/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales/visits/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/sales/visits/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/sales/visits/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sales/visits/export`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sales/visits/export?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/admin/security/patrol/:id/adjust`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/admin/security/patrol/:id/adjust' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/security/patrol/:id/client-confirm`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/security/patrol/:id/client-confirm' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/security/patrol/:id/verify`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/security/patrol/:id/verify' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/attendance-templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/attendance-templates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/attendance-templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/attendance-templates' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/attendance-templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/attendance-templates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/attendance-templates/:id/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/attendance-templates/:id/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/attendance-templates/:id/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/attendance-templates/:id/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/attendance-templates/assign/:assignmentId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/attendance-templates/assign/:assignmentId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/attendance-templates/effective/:userId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/attendance-templates/effective/:userId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/automation-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/automation-rules' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/automation-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/automation-rules' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/bank-account`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/bank-account' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/bank-account`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/bank-account' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/bonus`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/bonus' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/bonus`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/bonus' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/bonus-assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/bonus-assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/bonus-assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/bonus-assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/bonus-assignments/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/bonus-assignments/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/bonus-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/bonus-rules' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/bonus-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/bonus-rules' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/bonus-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/bonus-rules/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/bonus-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/bonus-rules/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/brand`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/brand' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/brand`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/brand' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/break-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/break-rules' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/break-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/break-rules' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/break-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/break-rules/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/break-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/break-rules/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/break-rules/:id/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/break-rules/:id/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/break-rules/:id/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/break-rules/:id/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/break-rules/assignments/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/break-rules/assignments/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/business-info`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/business-info' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/business-info`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/business-info' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/business-info/logo`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/business-info/logo' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/business-info/logo`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/business-info/logo' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/business-info/signature`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/business-info/signature' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/business-info/signature`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/business-info/signature' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/early-exit-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/early-exit-rules' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/early-exit-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/early-exit-rules' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/early-exit-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/early-exit-rules/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/early-exit-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/early-exit-rules/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/early-exit-rules/:id/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/early-exit-rules/:id/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/early-exit-rules/:id/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/early-exit-rules/:id/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/early-exit-rules/assignments/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/early-exit-rules/assignments/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/early-overtime-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/early-overtime-rules' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/early-overtime-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/early-overtime-rules' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/early-overtime-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/early-overtime-rules/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/early-overtime-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/early-overtime-rules/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/early-overtime-rules/:id/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/early-overtime-rules/:id/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/early-overtime-rules/:id/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/early-overtime-rules/:id/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/early-overtime-rules/assignments/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/early-overtime-rules/assignments/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/geo-fence`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/geo-fence' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/geo-fence`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/geo-fence' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/kiosk`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/kiosk' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/kiosk`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/kiosk' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/kyb`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/kyb' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/kyb`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/kyb' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/kyb/doc/:key`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/kyb/doc/:key' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/late-punchin-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/late-punchin-rules' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/late-punchin-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/late-punchin-rules' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/late-punchin-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/late-punchin-rules/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/late-punchin-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/late-punchin-rules/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/late-punchin-rules/:id/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/late-punchin-rules/:id/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/late-punchin-rules/:id/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/late-punchin-rules/:id/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/late-punchin-rules/assignments/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/late-punchin-rules/assignments/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/mobile-punch-access`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/mobile-punch-access' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/mobile-punch-access/:userId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/mobile-punch-access/:userId' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/mobile-punch/staff`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/mobile-punch/staff?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/mobile-punch/staff/update`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/mobile-punch/staff/update' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/mobile-restriction`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/mobile-restriction' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/mobile-restriction`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/mobile-restriction' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/order-products`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/order-products' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/order-products`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/order-products' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/order-products/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/order-products/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/order-products/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/order-products/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/order-products/staff`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/order-products/staff?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/order-products/staff/:userId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/order-products/staff/:userId' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/org`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/org' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/org`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/org' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/overtime-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/overtime-rules' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/overtime-rules`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/overtime-rules' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/overtime-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/overtime-rules/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/overtime-rules/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/overtime-rules/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/overtime-rules/:id/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/overtime-rules/:id/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/overtime-rules/:id/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/overtime-rules/:id/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/overtime-rules/assignments/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/overtime-rules/assignments/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/payout-bank-config`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/payout-bank-config' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/payout-bank-config`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/payout-bank-config' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/payout-wallet`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/payout-wallet' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/payout-wallet/create-pg-link`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/payout-wallet/create-pg-link' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/payout-wallet/credentials`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/payout-wallet/credentials' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/payout-wallet/export-excel`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/payout-wallet/export-excel?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/payout-wallet/topup`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/payout-wallet/topup' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/payout-wallet/verify-pg-payment`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/payout-wallet/verify-pg-payment' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/qr-punch/staff`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/qr-punch/staff?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/qr-punch/staff/update`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/qr-punch/staff/update' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/salary`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/salary' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/salary`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/salary' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/sessions`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/sessions' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/settings/sessions/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/settings/sessions/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/settings/sessions/logout-all`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/settings/sessions/logout-all' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/settings/work-hours`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/settings/work-hours' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/settings/work-hours`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/settings/work-hours' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/shift-rotation/generate`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/shift-rotation/generate' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/shift-rotation/groups`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/shift-rotation/groups' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/shift-rotation/groups/assign`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/shift-rotation/groups/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/shift-rotation/rules`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/shift-rotation/rules' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/shift-rotation/rules`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/shift-rotation/rules' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/shifts/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/shifts/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/shifts/effective/:userId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/shifts/effective/:userId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/shifts/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/shifts/templates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/shifts/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/shifts/templates' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/shifts/templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/shifts/templates/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/shifts/templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/shifts/templates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/shifts/templates/:id/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/shifts/templates/:id/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/shifts/unassign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/shifts/unassign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sites`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sites' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/sites`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/sites' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/sites/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/sites/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/sites/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/sites/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/sites/:siteId/checkpoints`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/sites/:siteId/checkpoints' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/sites/:siteId/checkpoints`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/sites/:siteId/checkpoints' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/sites/:siteId/checkpoints/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/sites/:siteId/checkpoints/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/sites/:siteId/checkpoints/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/sites/:siteId/checkpoints/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/social/posts`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/social/posts' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/social/posts`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/social/posts' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/social/posts/:id/comment`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/social/posts/:id/comment' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/social/posts/:id/like`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/social/posts/:id/like' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/staff`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/staff' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/staff`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/staff' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff-salary-list`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff-salary-list?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/staff/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/staff/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/:id?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/staff/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/staff/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/staff/:id/active`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/staff/:id/active' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/staff/:id/assign-to-org`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/staff/:id/assign-to-org' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/:id/attendance`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/:id/attendance?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/:id/attendance-overview`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/:id/attendance-overview?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/:id/documents`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/:id/documents?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/staff/:id/documents`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/staff/:id/documents' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/:id/expenses`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/:id/expenses?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/staff/:id/expenses`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/staff/:id/expenses' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/:id/leaves`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/:id/leaves?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/:id/loans`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/:id/loans?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/staff/:id/loans`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/staff/:id/loans' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/:id/loans/summary`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/:id/loans/summary?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/staff/:id/profile`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/staff/:id/profile' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/staff/:id/recalculate-salary`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/staff/:id/recalculate-salary' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/staff/:id/salary`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/staff/:id/salary' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/:id/salary-compute`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/:id/salary-compute?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/:id/salary-details`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/:id/salary-details?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/staff/:id/salary-template`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/staff/:id/salary-template' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/staff/:id/unassign-from-org/:targetOrgId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/staff/:id/unassign-from-org/:targetOrgId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/staff/active`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/staff/active' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/staff/bulk-mobile-punch`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/staff/bulk-mobile-punch' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/staff/bulk-qr-punch`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/staff/bulk-qr-punch' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/staff/bulk-refresh`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/staff/bulk-refresh' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/export`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/export?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/staff/import`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/staff/import' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/import-template`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/import-template?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/leave-assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/leave-assignments?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/staff/stats`

- **Auth:** Bearer JWT + role + tenant (router default)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/staff/stats?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/tally/config`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/tally/config' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/tally/config`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/tally/config' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/tally/download-bridge`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/tally/download-bridge' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/tally/preview/:cycleId`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/tally/preview/:cycleId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/tally/xml/:cycleId`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/tally/xml/:cycleId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/targets`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/targets' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/targets`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/targets' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/task-management/activities`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/task-management/activities' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/task-management/activities`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/task-management/activities' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/admin/task-management/activities/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/admin/task-management/activities/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/admin/task-management/activities/:id/close`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/admin/task-management/activities/:id/close' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/task-management/activities/:id/history`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/task-management/activities/:id/history' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/task-management/meeting-attendance`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/task-management/meeting-attendance' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/task-management/meetings`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/task-management/meetings' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/task-management/meetings`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/task-management/meetings' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/admin/task-management/meetings/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/admin/task-management/meetings/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/admin/task-management/meetings/:id/close`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/admin/task-management/meetings/:id/close' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/task-management/meetings/:id/history`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/task-management/meetings/:id/history' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/task-management/observers`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/task-management/observers' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/task-management/observers/:id/mappings`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/task-management/observers/:id/mappings' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/task-management/observers/:id/mappings`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/task-management/observers/:id/mappings' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/admin/task-management/observers/:id/toggle`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/admin/task-management/observers/:id/toggle' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/task-management/tickets`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/task-management/tickets' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/task-management/tickets`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/task-management/tickets' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/admin/task-management/tickets/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/admin/task-management/tickets/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/admin/task-management/tickets/:id/close`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/admin/task-management/tickets/:id/close' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/task-management/tickets/:id/history`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/task-management/tickets/:id/history' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/task-management/tickets/search/:ticketId`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/task-management/tickets/search/:ticketId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/test-email`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/test-email' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/upload-profile-photo`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_note": "multipart/form-data \u2014 see route (e.g. field photo, file)"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/upload-profile-photo' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_note\": \"multipart/form-data \u2014 see route (e.g. field photo, file)\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/uploads/*`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/uploads/*' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/user-access/assign-badges`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/user-access/assign-badges' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/user-access/badges`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/user-access/badges' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/user-access/badges`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/user-access/badges' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/user-access/badges/:id`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/user-access/badges/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/user-access/badges/:id`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/user-access/badges/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/user-access/my-sidebar-permissions`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/user-access/my-sidebar-permissions' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/user-access/permission-options`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/user-access/permission-options' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/user-access/sidebar-brand`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/user-access/sidebar-brand' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/user-access/staff`

- **Auth:** Bearer JWT + tenant

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/user-access/staff?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/weekly-off/assign`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/weekly-off/assign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/admin/weekly-off/assign/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/admin/weekly-off/assign/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/weekly-off/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/weekly-off/templates' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/admin/weekly-off/templates`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/admin/weekly-off/templates' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/admin/weekly-off/templates/:id`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/admin/weekly-off/templates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/weekly-off/templates/:id/assignments`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/weekly-off/templates/:id/assignments' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/weekly-off/user/:userId`

- **Auth:** Bearer JWT + role + tenant (router default)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/weekly-off/user/:userId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/admin/wishes/`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/admin/wishes/' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/ai/ask`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/ai/ask' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/ai/attendance-productivity`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/ai/attendance-productivity' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/ai/chat`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/ai/chat' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/ai/salary-forecast`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/ai/salary-forecast' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/ai/salary-forecast/compute`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/ai/salary-forecast/compute' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/api/webhook/essl/`

- **Auth:** Webhook secret (ESSL_WEBHOOK_SECRET)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/api/webhook/essl/' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/attendance/auto-punchout`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/attendance/auto-punchout' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/attendance/end-break`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/attendance/end-break' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/attendance/history`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/attendance/history' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/attendance/location/ping`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/attendance/location/ping' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/attendance/ping`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/attendance/ping' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/attendance/punch-in`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "latitude": 22.57,
  "longitude": 88.36
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/attendance/punch-in' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"latitude\": 22.57, \"longitude\": 88.36}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/attendance/punch-out`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/attendance/punch-out' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/attendance/qr-punch`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/attendance/qr-punch' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/attendance/report`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/attendance/report?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/attendance/report/pdf`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/attendance/report/pdf?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/attendance/settings/max-break`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/attendance/settings/max-break' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/attendance/settings/max-break`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/attendance/settings/max-break' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/attendance/start-break`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/attendance/start-break' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/attendance/status`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/attendance/status' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/attendance/user/:userId`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/attendance/user/:userId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/attendance/weekly`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/attendance/weekly' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/add-organization`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/add-organization' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/impersonate/exchange`

- **Auth:** Public (some rate limited)

**Request body (example):**
```json
{
  "code": "<one_time_code>"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/impersonate/exchange' \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"<one_time_code>\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/login`

- **Auth:** Public (rate limited)

**Request body (example):**
```json
{
  "phone": "9831052038",
  "password": "Thinktech@123"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/login' \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"9831052038\", \"password\": \"Thinktech@123\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "token": "<access_jwt>",
  "user": {
    "id": 1,
    "role": "superadmin",
    "phone": "9831052038",
    "orgAccountId": null
  }
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/logout`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/logout' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/logout-mobile`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/logout-mobile' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/auth/otp/latest`

- **Auth:** Public (some rate limited)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/auth/otp/latest'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/refresh`

- **Auth:** Public (some rate limited)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/refresh' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/refresh-mobile`

- **Auth:** Public (some rate limited)

**Request body (example):**
```json
{
  "refreshToken": "<refresh_token>"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/refresh-mobile' \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"<refresh_token>\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/reset-password`

- **Auth:** Public (some rate limited)

**Request body (example):**
```json
{
  "phone": "9831052038",
  "code": "123456",
  "newPassword": "Thinktech@123"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/reset-password' \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"9831052038\", \"code\": \"123456\", \"newPassword\": \"Thinktech@123\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/send-otp`

- **Auth:** Public (rate limited)

**Request body (example):**
```json
{
  "phone": "9831052038",
  "purpose": "login"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/send-otp' \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"9831052038\", \"purpose\": \"login\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OTP sent"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/signup-admin`

- **Auth:** Public (some rate limited)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/signup-admin' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/switch-account`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/switch-account' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/auth/verify-otp`

- **Auth:** Public (some rate limited)

**Request body (example):**
```json
{
  "phone": "9831052038",
  "code": "123456"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/auth/verify-otp' \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"9831052038\", \"code\": \"123456\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "token": "<access_jwt>",
  "user": {
    "id": 1,
    "role": "superadmin",
    "phone": "9831052038",
    "orgAccountId": null
  }
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/channel-partner/client/:id/geo-staff-count`

- **Auth:** Bearer JWT

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/channel-partner/client/:id/geo-staff-count' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/channel-partner/client/:id/staff-count`

- **Auth:** Bearer JWT

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/channel-partner/client/:id/staff-count?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/channel-partner/clients`

- **Auth:** Bearer JWT

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/channel-partner/clients?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/channel-partner/clients/:id/plan-details`

- **Auth:** Bearer JWT

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/channel-partner/clients/:id/plan-details?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/documents/:documentTypeId/upload`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_note": "multipart/form-data \u2014 see route (e.g. field photo, file)"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/documents/:documentTypeId/upload' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_note\": \"multipart/form-data \u2014 see route (e.g. field photo, file)\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/documents/required`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/documents/required' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/health`

- **Auth:** Public
- **Note:** Health check

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/health'
```

**Response 200 (example):**
```json
{
  "ok": true
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/kiosk/face-recognition`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/kiosk/face-recognition' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/kiosk/list-faces`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/kiosk/list-faces' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/kiosk/login`

- **Auth:** Public (rate limited)

**Request body (example):**
```json
{
  "username": "kiosk_user",
  "password": "kiosk_password"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/kiosk/login' \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"kiosk_user\", \"password\": \"kiosk_password\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/leave/`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/leave/' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/leave/`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/leave/' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/leave/:id`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/leave/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/leave/:id/status`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/leave/:id/status' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/leave/categories`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/leave/categories' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/leave/check-range`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/leave/check-range' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/leave/encash/admin-create`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/leave/encash/admin-create' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/leave/encash/balance-check`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/leave/encash/balance-check' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/leave/encash/claim`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/leave/encash/claim' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/leave/encash/claims`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/leave/encash/claims' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/leave/encash/claims/:id`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/leave/encash/claims/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/leave/encash/claims/me`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/leave/encash/claims/me' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/leave/encash/review`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/leave/encash/review' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/leave/me`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/leave/me' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/leave/weekly-off/my`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/leave/weekly-off/my' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/attendance-template`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/attendance-template' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/bank`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/bank' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/me/bank`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/me/bank' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/expenses`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/expenses' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/me/expenses`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/me/expenses' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/me/expenses/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/me/expenses/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/general`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/general' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/me/general`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/me/general' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/me/password`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/me/password' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/payroll-status`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/payroll-status?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/payslip`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/payslip' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/me/phone`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/me/phone' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/profile`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/profile' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/me/profile`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/me/profile' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/me/profile/photo`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_note": "multipart/form-data \u2014 see route (e.g. field photo, file)"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/me/profile/photo' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_note\": \"multipart/form-data \u2014 see route (e.g. field photo, file)\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/salary-compute`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/salary-compute' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/salary-history-range`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/salary-history-range' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/salary/access`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/salary/access' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/shift`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/shift' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/me/staff-list`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/me/staff-list?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/meetings/`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/meetings/' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/meetings/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/meetings/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/meetings/:id/status`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/meetings/:id/status' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/meetings/me`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/meetings/me' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/mobile/roles/assign-role`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/mobile/roles/assign-role' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/mobile/roles/bulk-assign-role`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/mobile/roles/bulk-assign-role' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/mobile/roles/debug-geolocation`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/mobile/roles/debug-geolocation' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/mobile/roles/fix-geo-role`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/mobile/roles/fix-geo-role' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/mobile/roles/geolocation-limits`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/mobile/roles/geolocation-limits' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/mobile/roles/my-permissions`

- **Auth:** Bearer JWT

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/mobile/roles/my-permissions' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/mobile/roles/my-permissions-open`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/mobile/roles/my-permissions-open' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/mobile/roles/permissions`

- **Auth:** Bearer JWT

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/mobile/roles/permissions' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/mobile/roles/roles`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/mobile/roles/roles' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/mobile/roles/roles`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/mobile/roles/roles' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/mobile/roles/roles/:id`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/mobile/roles/roles/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/mobile/roles/roles/:id`

- **Auth:** Bearer JWT + tenant

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/mobile/roles/roles/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/mobile/roles/staff-with-roles`

- **Auth:** Bearer JWT + tenant

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/mobile/roles/staff-with-roles?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/mobile/roles/test-subscription`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/mobile/roles/test-subscription' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/mobile/roles/user-permissions`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/mobile/roles/user-permissions' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/salary-templates/`

- **Auth:** Bearer JWT + role

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/salary-templates/' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/salary-templates/`

- **Auth:** Bearer JWT + role

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/salary-templates/' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/salary-templates/:id`

- **Auth:** Bearer JWT + role

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/salary-templates/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/salary-templates/:id`

- **Auth:** Bearer JWT + role

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/salary-templates/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/salary-templates/:id`

- **Auth:** Bearer JWT + role

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/salary-templates/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/salary-templates/:id/calculate`

- **Auth:** Bearer JWT

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/salary-templates/:id/calculate' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/assigned-jobs`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/assigned-jobs' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/assigned-jobs/:id`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/assigned-jobs/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/sales/assigned-jobs/:id/status`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/sales/assigned-jobs/:id/status' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/assigned_jobs`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/assigned_jobs' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/assigned_jobs/:id`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/assigned_jobs/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/sales/assigned_jobs/:id/status`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/sales/assigned_jobs/:id/status' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/incentives/current`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/incentives/current' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/my-clients`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/my-clients' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/my-orders`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/my-orders' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/my-visits`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/my-visits' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/order-products`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/order-products' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/sales/orders`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/sales/orders' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/sales/send-client-otp`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/sales/send-client-otp' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/summary`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/summary' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/targets/current`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/targets/current' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/sales/visit`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/sales/visit' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/sales/weekly`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/sales/weekly' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/security/patrol/checkin`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/security/patrol/checkin' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/security/patrol/today`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/security/patrol/today' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/subscription/assign-subscription`

- **Auth:** Bearer JWT + role

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/subscription/assign-subscription' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/subscription/clients`

- **Auth:** Bearer JWT + role

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/subscription/clients?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/subscription/clients/:subscriptionId/geolocation-limit`

- **Auth:** Bearer JWT + role

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/subscription/clients/:subscriptionId/geolocation-limit' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/subscription/plans`

- **Auth:** Bearer JWT + role

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/subscription/plans' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/subscription/plans`

- **Auth:** Bearer JWT + role

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/subscription/plans' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/subscription/plans/:id`

- **Auth:** Bearer JWT + role

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/subscription/plans/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/subscription/subscription-info`

- **Auth:** Bearer JWT + tenant

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/subscription/subscription-info' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/channel-partners`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/channel-partners' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/channel-partners`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/channel-partners' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/superadmin/channel-partners/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/superadmin/channel-partners/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/client/:id/geo-staff-count`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/client/:id/geo-staff-count' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/client/:id/staff-count`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/client/:id/staff-count?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/clients`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/clients?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/clients`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/clients' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/superadmin/clients/:clientId/staff/:staffId`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/superadmin/clients/:clientId/staff/:staffId' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/superadmin/clients/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/superadmin/clients/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/clients/:id/impersonate`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/clients/:id/impersonate' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/clients/:id/plan-details`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/clients/:id/plan-details?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/superadmin/clients/:id/staff`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/superadmin/clients/:id/staff' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/clients/:id/staff`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/clients/:id/staff?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/clients/:id/subscription`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/clients/:id/subscription' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/clients/:id/toggle-status`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/clients/:id/toggle-status' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/dashboard`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/dashboard' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/holidays`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/holidays' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/holidays`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/holidays' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/superadmin/holidays/:id`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/superadmin/holidays/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/superadmin/holidays/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/superadmin/holidays/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/leads`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/leads' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/leads`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/leads' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/superadmin/leads/:id`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/superadmin/leads/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/superadmin/leads/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/superadmin/leads/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/leads/config`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/leads/config' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/superadmin/leads/config`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/superadmin/leads/config' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/leads/export`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/leads/export?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/leads/export-template`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/leads/export-template?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/leads/import`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/leads/import' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/mail/campaign`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/mail/campaign' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/mail/campaign/:id/details`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/mail/campaign/:id/details' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/mail/campaign/:id/export`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?from=2026-01-01&to=2026-01-31`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/mail/campaign/:id/export?from=2026-01-01&to=2026-01-31' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/mail/campaign/:id/pause`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/mail/campaign/:id/pause' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/mail/campaign/:id/resend`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/mail/campaign/:id/resend' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/mail/campaign/:id/resume`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/mail/campaign/:id/resume' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/mail/campaign/excel`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/mail/campaign/excel' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/mail/campaigns`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/mail/campaigns' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/mail/queue/:queueId/pause`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/mail/queue/:queueId/pause' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/mail/queue/:queueId/resume`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/mail/queue/:queueId/resume' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/mail/queue/batch-pause`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/mail/queue/batch-pause' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/mail/queue/batch-resume`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/mail/queue/batch-resume' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/mail/queue/stats`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/mail/queue/stats' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/mail/track/:queueId.gif`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/mail/track/:queueId.gif' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/plans`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/plans' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/plans`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/plans' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/superadmin/plans/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/superadmin/plans/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/superadmin/staff`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/superadmin/staff?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/staff`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/staff' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `DELETE` `/superadmin/staff/:id`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X DELETE 'http://localhost:4000/superadmin/staff/:id' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "Deleted"
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PUT` `/superadmin/staff/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PUT 'http://localhost:4000/superadmin/staff/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/superadmin/subscription-expiry-reminder-check`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/superadmin/subscription-expiry-reminder-check' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `POST` `/tickets/`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "JSON body \u2014 see API.md module section or admin.js handler"
}
```

**cURL:**
```bash
curl -X POST 'http://localhost:4000/tickets/' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"JSON body \u2014 see API.md module section or admin.js handler\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/tickets/:id`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/tickets/:id' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `PATCH` `/tickets/:id/status`

- **Auth:** Bearer JWT (typical)

**Request body (example):**
```json
{
  "_example": "Partial or full resource fields as JSON"
}
```

**cURL:**
```bash
curl -X PATCH 'http://localhost:4000/tickets/:id/status' \
  -H 'Authorization: Bearer $TOKEN' \
  -H "Content-Type: application/json" \
  -d "{\"_example\": \"Partial or full resource fields as JSON\"}"
```

**Response 200 (example):**
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/tickets/my`

- **Auth:** Bearer JWT (typical)

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/tickets/my' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/tickets/staff`

- **Auth:** Bearer JWT (typical)

**Query (typical):** `?page=1&pageSize=20`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/tickets/staff?page=1&pageSize=20' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/uploads/*`

- **Auth:** Bearer JWT (?token= query supported)
- **Note:** Authenticated file download

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/uploads/*' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---

## `GET` `/view-pdf/:month/:filename`

- **Auth:** Bearer JWT
- **Note:** Payslip PDF viewer HTML

**Query (typical):** `?monthKey=2026-01`

**Request body:** none

**cURL:**
```bash
curl -X GET 'http://localhost:4000/view-pdf/:month/:filename?monthKey=2026-01' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response 200 (example):**
```json
{
  "success": true,
  "data": [],
  "total": 0
}
```

**Response error (example):**
```json
{
  "success": false,
  "message": "Reason (401/403/404/500)"
}
```

---
