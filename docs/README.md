# Vetansutra API documentation

| File | Purpose |
|------|---------|
| [API.md](./API.md) | Human-readable guide (auth, modules, examples) |
| [API_ENDPOINTS.md](./API_ENDPOINTS.md) | Complete endpoint index (~690 routes) |
| [API_ENDPOINTS_TEST.md](./API_ENDPOINTS_TEST.md) | **Request / response + cURL** for every endpoint |
| [openapi.yaml](./openapi.yaml) | OpenAPI 3.0 path skeleton (import into Postman/Swagger UI) |

Regenerate after route changes:

```bash
cd vetansutra-backend
python scripts/generate_api_docs.py
```
