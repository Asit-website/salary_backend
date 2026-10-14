# Vetansutra API — Endpoint Index

Auto-generated from route sources. **697** endpoints.

Per-endpoint **request/response examples and cURL**: [API_ENDPOINTS_TEST.md](./API_ENDPOINTS_TEST.md)

| Method | Path | Auth | Source | Notes |
|--------|------|------|--------|-------|
| `POST` | `/activities/` | Bearer JWT (typical) | todo.js |  |
| `PATCH` | `/activities/:id` | Bearer JWT (typical) | todo.js |  |
| `PATCH` | `/activities/:id/status` | Bearer JWT (typical) | todo.js |  |
| `PATCH` | `/activities/:id/transfer` | Bearer JWT (typical) | todo.js |  |
| `GET` | `/activities/me` | Bearer JWT (typical) | todo.js |  |
| `GET` | `/admin/addon-settings` | Bearer JWT + tenant | admin.js |  |
| `POST` | `/admin/addon-settings` | Bearer JWT + tenant | admin.js |  |
| `GET` | `/admin/admins` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/advances` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/advances` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/advances/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/advances/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/ai/anomalies` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/ai/anomalies/compute` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/ai/anomalies/top-today` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/ai/ask` | Bearer JWT + tenant | ai.js |  |
| `GET` | `/admin/ai/attendance-productivity` | Bearer JWT (typical) | ai.js |  |
| `POST` | `/admin/ai/chat` | Bearer JWT (typical) | ai.js |  |
| `GET` | `/admin/ai/reliability` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/ai/reliability/compute` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/ai/salary-forecast` | Bearer JWT (typical) | ai.js |  |
| `POST` | `/admin/ai/salary-forecast/compute` | Bearer JWT (typical) | ai.js |  |
| `GET` | `/admin/asset-assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/asset-assignments/:id/return` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/asset-maintenance` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/asset-maintenance` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/asset-maintenance/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/asset-maintenance/:id/complete` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/asset-maintenance/stats` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/assets` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/assets` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/assets/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/assets/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/assets/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/assets/:id/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/assets/:id/return` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/assets/stats` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/assignments/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/attendance` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/attendance` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/attendance-templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/attendance/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/attendance/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/attendance/bulk` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/attendance/check-leave` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/attendance/check-special-day` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/attendance/check-special-days-batch` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/attendance/export` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/attendance/month` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/attendance/note` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/attendance/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/attendance/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/attendance/templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/attendance/templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/business-functions` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/business-functions` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/business-functions/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/business-functions/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/business-functions/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/business-functions/assign-department` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/business-functions/department/:name/staff` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/business-functions/department/:name/staff/:userId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/clients` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/clients/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/construction/work-units/:id/verify` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/dashboard` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/dashboard/attendance-chart` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/dashboard/card-details` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/dashboard/department-distribution` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/dashboard/late-arrivals` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/dashboard/salary-chart` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/dashboard/stats` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/dashboard/upcoming-holidays` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/device-management/devices` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/document-types` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/document-types` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/document-types/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/document-types/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/documents/:docId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/documents/:docId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/documents/:docId/status` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/documents/assign-all` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/documents/recent` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/expenses` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/expenses/:claimId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/expenses/:claimId/pay` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/expenses/:claimId/status` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/expenses/export` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/geofence/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/geofence/assign/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/geofence/assignments/:userId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/geofence/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/geofence/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/geofence/templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/geofence/templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/geofence/templates/:id/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/geolocation` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/geolocation/:staffId/timeline` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/geolocation/stats` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/holiday-work-pay/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/holiday-work-pay/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/holiday-work-pay/assignments/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/holiday-work-pay/assignments/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/holiday-work-pay/rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/holiday-work-pay/rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/holiday-work-pay/rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/holiday-work-pay/rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/holidays/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/holidays/assign/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/holidays/master` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/holidays/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/holidays/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/holidays/templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/holidays/templates/:id/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/incentives` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/incentives` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/incentives/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/leave/allocate` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/leave/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/leave/assign/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/leave/balances` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/leave/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/leave/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/leave/templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/leave/templates/:id/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/leave/templates/:id/categories-bulk` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/leaves` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/leaves/:leaveId/status` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/letters/issue` | Bearer JWT (typical) | letter.js |  |
| `GET` | `/admin/letters/issued` | Bearer JWT (typical) | letter.js |  |
| `GET` | `/admin/letters/issued/:id` | Bearer JWT (typical) | letter.js |  |
| `GET` | `/admin/letters/templates` | Bearer JWT (typical) | letter.js |  |
| `POST` | `/admin/letters/templates` | Bearer JWT (typical) | letter.js |  |
| `DELETE` | `/admin/letters/templates/:id` | Bearer JWT (typical) | letter.js |  |
| `PUT` | `/admin/letters/templates/:id` | Bearer JWT (typical) | letter.js |  |
| `GET` | `/admin/loans` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/loans` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/loans/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/loans/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/mock-pg-checkout` | Varies / public (pre-auth routes) | admin.js | Only if ALLOW_MOCK_PAYMENTS=true |
| `POST` | `/admin/mock-pg-checkout/pay` | Varies / public (pre-auth routes) | admin.js | Only if ALLOW_MOCK_PAYMENTS=true |
| `GET` | `/admin/mock_pg_checkout` | Varies / public (pre-auth routes) | admin.js |  |
| `POST` | `/admin/mock_pg_checkout/pay` | Varies / public (pre-auth routes) | admin.js |  |
| `GET` | `/admin/my-organizations` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/my-payroll-status` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/notifications/` | Bearer JWT (typical) | notification.js |  |
| `POST` | `/admin/notifications/:id/read` | Bearer JWT (typical) | notification.js |  |
| `POST` | `/admin/notifications/read-all` | Bearer JWT (typical) | notification.js |  |
| `GET` | `/admin/org/staff` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll-inspection/analyze` | Bearer JWT (typical) | payrollInspection.js |  |
| `POST` | `/admin/payroll-inspection/apply-fixes` | Bearer JWT (typical) | payrollInspection.js |  |
| `GET` | `/admin/payroll-inspection/day-timeline` | Bearer JWT (typical) | payrollInspection.js |  |
| `POST` | `/admin/payroll-inspection/parse` | Bearer JWT (typical) | payrollInspection.js |  |
| `POST` | `/admin/payroll/:cycleId/compute` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/:cycleId/disburse-cashfree` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll/:cycleId/export` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll/:cycleId/export-bank-file` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/payroll/:cycleId/line/:lineId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/:cycleId/lines/mark-paid` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/:cycleId/lock` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/:cycleId/mark-paid` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll/:cycleId/salary-register-excel` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/:cycleId/unlock` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll/fnf` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/fnf/:id/pay` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll/fnf/:id/pdf` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/fnf/:id/settle` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll/fnf/eligible-staff` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/fnf/finalize` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll/fnf/settings` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/fnf/settings` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll/fnf/staff-details/:userId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/generate-payslip` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/manual-historical` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll/monthly-summary-excel` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll/salary-register-excel-by-month` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/payroll/salary-register-template-wise-excel` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/payroll/test-attendance-reminder` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/performance/appraisals` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/performance/appraisals` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/performance/appraisals/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/performance/ratings` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/performance/ratings` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/performance/ratings/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/qr-attendance/config` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/qr-attendance/generate` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/qr-attendance/zones` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/qr-attendance/zones` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/qr-attendance/zones/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/qr-attendance/zones/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/qr-attendance/zones/:id/regenerate` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/recruitment/candidates` | Bearer JWT (typical) | recruitment.js |  |
| `POST` | `/admin/recruitment/candidates` | Bearer JWT (typical) | recruitment.js |  |
| `PUT` | `/admin/recruitment/candidates/:id` | Bearer JWT (typical) | recruitment.js |  |
| `GET` | `/admin/recruitment/interviews` | Bearer JWT (typical) | recruitment.js |  |
| `POST` | `/admin/recruitment/interviews` | Bearer JWT (typical) | recruitment.js |  |
| `PUT` | `/admin/recruitment/interviews/:id` | Bearer JWT (typical) | recruitment.js |  |
| `GET` | `/admin/recruitment/jobs` | Bearer JWT (typical) | recruitment.js |  |
| `POST` | `/admin/recruitment/jobs` | Bearer JWT (typical) | recruitment.js |  |
| `PUT` | `/admin/recruitment/jobs/:id` | Bearer JWT (typical) | recruitment.js |  |
| `GET` | `/admin/reports/absent-report` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/comparison` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/late-penalty-analysis` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/monthly-attendance` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/org-activities` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/org-applied-leave` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/org-attendance` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/org-attendance-matrix` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/org-detailed-attendance` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/org-leave` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/org-leave-balance` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/org-meetings` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/org-punch-matrix` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/org-sales` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/org-tickets` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/ot-impact` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/per-day-salary-average` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/reports/staff-login-logout` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/rmo-settings` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/rmo-settings` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/roles/assign-role` | Bearer JWT + tenant | roles.js |  |
| `POST` | `/admin/roles/bulk-assign-role` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/admin/roles/debug-geolocation` | Bearer JWT + tenant | roles.js |  |
| `POST` | `/admin/roles/fix-geo-role` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/admin/roles/geolocation-limits` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/admin/roles/my-permissions` | Bearer JWT | roles.js |  |
| `GET` | `/admin/roles/my-permissions-open` | Bearer JWT (typical) | roles.js |  |
| `GET` | `/admin/roles/permissions` | Bearer JWT | roles.js |  |
| `GET` | `/admin/roles/roles` | Bearer JWT + tenant | roles.js |  |
| `POST` | `/admin/roles/roles` | Bearer JWT + tenant | roles.js |  |
| `DELETE` | `/admin/roles/roles/:id` | Bearer JWT + tenant | roles.js |  |
| `PUT` | `/admin/roles/roles/:id` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/admin/roles/staff-with-roles` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/admin/roles/test-subscription` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/admin/roles/user-permissions` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/admin/roster` | Bearer JWT + tenant + role | roster.js |  |
| `POST` | `/admin/roster` | Bearer JWT + tenant + role | roster.js |  |
| `GET` | `/admin/roster/staff` | Bearer JWT + tenant + role | roster.js |  |
| `GET` | `/admin/routes` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/routes` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/routes/:id/stops-bulk` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/routes/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/salary-template-fields/:templateId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/salary-templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/salary-templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/salary-templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/salary-templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/salary-templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/salary/access` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/salary/access-bulk` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/salary/access/:userId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/salary/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/salary/assignment/:userId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/salary/compute/:userId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/salary/esi-as-ta` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/salary/esi-as-ta-bulk` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/salary/no-absent-pay` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/salary/no-absent-pay-bulk` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/salary/payable-days` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/salary/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/salary/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/salary/templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/salary/templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/salary/wo-holiday-as-ot` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/salary/wo-holiday-as-ot-bulk` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/sales-incentives/` | Bearer JWT (typical) | salesIncentive.js |  |
| `POST` | `/admin/sales-incentives/` | Bearer JWT (typical) | salesIncentive.js |  |
| `DELETE` | `/admin/sales-incentives/:id` | Bearer JWT (typical) | salesIncentive.js |  |
| `PUT` | `/admin/sales-incentives/:id` | Bearer JWT (typical) | salesIncentive.js |  |
| `GET` | `/admin/sales-incentives/approvals` | Bearer JWT (typical) | salesIncentive.js |  |
| `PUT` | `/admin/sales-incentives/approvals/:id` | Bearer JWT (typical) | salesIncentive.js |  |
| `GET` | `/admin/sales-incentives/assignments` | Bearer JWT (typical) | salesIncentive.js |  |
| `POST` | `/admin/sales-incentives/assignments` | Bearer JWT (typical) | salesIncentive.js |  |
| `POST` | `/admin/sales-incentives/assignments/bulk` | Bearer JWT (typical) | salesIncentive.js |  |
| `GET` | `/admin/sales/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/sales/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/sales/assignments/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/sales/assignments/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/sales/clients` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/sales/clients` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/sales/clients/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/sales/clients/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/sales/orders` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/sales/orders/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/sales/orders/export` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/sales/targets` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/sales/targets` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/sales/targets/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/sales/targets/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/sales/visits` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/sales/visits/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/sales/visits/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/sales/visits/export` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PATCH` | `/admin/security/patrol/:id/adjust` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/security/patrol/:id/client-confirm` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/security/patrol/:id/verify` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/attendance-templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/attendance-templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/attendance-templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/attendance-templates/:id/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/attendance-templates/:id/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/attendance-templates/assign/:assignmentId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/attendance-templates/effective/:userId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/automation-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/automation-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/bank-account` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/bank-account` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/bonus` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/bonus` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/bonus-assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/bonus-assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/bonus-assignments/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/bonus-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/bonus-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/bonus-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/bonus-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/brand` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/brand` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/break-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/break-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/break-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/break-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/break-rules/:id/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/break-rules/:id/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/break-rules/assignments/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/business-info` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/business-info` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/business-info/logo` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/business-info/logo` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/business-info/signature` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/business-info/signature` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/early-exit-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/early-exit-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/early-exit-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/early-exit-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/early-exit-rules/:id/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/early-exit-rules/:id/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/early-exit-rules/assignments/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/early-overtime-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/early-overtime-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/early-overtime-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/early-overtime-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/early-overtime-rules/:id/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/early-overtime-rules/:id/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/early-overtime-rules/assignments/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/geo-fence` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/geo-fence` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/kiosk` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/kiosk` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/kyb` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/kyb` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/kyb/doc/:key` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/late-punchin-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/late-punchin-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/late-punchin-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/late-punchin-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/late-punchin-rules/:id/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/late-punchin-rules/:id/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/late-punchin-rules/assignments/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/mobile-punch-access` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/mobile-punch-access/:userId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/mobile-punch/staff` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/mobile-punch/staff/update` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/mobile-restriction` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/mobile-restriction` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/order-products` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/order-products` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/order-products/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/order-products/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/order-products/staff` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/order-products/staff/:userId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/org` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/org` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/overtime-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/overtime-rules` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/overtime-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/overtime-rules/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/overtime-rules/:id/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/overtime-rules/:id/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/overtime-rules/assignments/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/payout-bank-config` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/payout-bank-config` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/payout-wallet` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/payout-wallet/create-pg-link` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/payout-wallet/credentials` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/payout-wallet/export-excel` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/payout-wallet/topup` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/payout-wallet/verify-pg-payment` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/qr-punch/staff` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/qr-punch/staff/update` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/salary` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/salary` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/sessions` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/settings/sessions/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/settings/sessions/logout-all` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/settings/work-hours` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/settings/work-hours` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/shift-rotation/generate` | Bearer JWT (typical) | shiftRotation.js |  |
| `GET` | `/admin/shift-rotation/groups` | Bearer JWT (typical) | shiftRotation.js |  |
| `POST` | `/admin/shift-rotation/groups/assign` | Bearer JWT (typical) | shiftRotation.js |  |
| `GET` | `/admin/shift-rotation/rules` | Bearer JWT (typical) | shiftRotation.js |  |
| `POST` | `/admin/shift-rotation/rules` | Bearer JWT (typical) | shiftRotation.js |  |
| `POST` | `/admin/shifts/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/shifts/effective/:userId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/shifts/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/shifts/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/shifts/templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/shifts/templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/shifts/templates/:id/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/shifts/unassign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/sites` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/sites` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/sites/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/sites/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/sites/:siteId/checkpoints` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/sites/:siteId/checkpoints` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/sites/:siteId/checkpoints/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/sites/:siteId/checkpoints/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/social/posts` | Bearer JWT (typical) | social.js |  |
| `POST` | `/admin/social/posts` | Bearer JWT (typical) | social.js |  |
| `POST` | `/admin/social/posts/:id/comment` | Bearer JWT (typical) | social.js |  |
| `POST` | `/admin/social/posts/:id/like` | Bearer JWT (typical) | social.js |  |
| `DELETE` | `/admin/staff` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/staff` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff-salary-list` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/staff/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/staff/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/staff/:id/active` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/staff/:id/assign-to-org` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/:id/attendance` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/:id/attendance-overview` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/:id/documents` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/staff/:id/documents` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/:id/expenses` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/staff/:id/expenses` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/:id/leaves` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/:id/loans` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/staff/:id/loans` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/:id/loans/summary` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/staff/:id/profile` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/staff/:id/recalculate-salary` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/staff/:id/salary` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/:id/salary-compute` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/:id/salary-details` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/staff/:id/salary-template` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/staff/:id/unassign-from-org/:targetOrgId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/staff/active` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/staff/bulk-mobile-punch` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/staff/bulk-qr-punch` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/staff/bulk-refresh` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/export` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/staff/import` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/import-template` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/leave-assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/staff/stats` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/tally/config` | Bearer JWT (typical) | tally.js |  |
| `PUT` | `/admin/tally/config` | Bearer JWT (typical) | tally.js |  |
| `GET` | `/admin/tally/download-bridge` | Bearer JWT (typical) | tally.js |  |
| `GET` | `/admin/tally/preview/:cycleId` | Bearer JWT (typical) | tally.js |  |
| `GET` | `/admin/tally/xml/:cycleId` | Bearer JWT (typical) | tally.js |  |
| `GET` | `/admin/targets` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/targets` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/task-management/activities` | Bearer JWT (typical) | taskManagement.js |  |
| `POST` | `/admin/task-management/activities` | Bearer JWT (typical) | taskManagement.js |  |
| `PATCH` | `/admin/task-management/activities/:id` | Bearer JWT (typical) | taskManagement.js |  |
| `PATCH` | `/admin/task-management/activities/:id/close` | Bearer JWT (typical) | taskManagement.js |  |
| `GET` | `/admin/task-management/activities/:id/history` | Bearer JWT (typical) | taskManagement.js |  |
| `GET` | `/admin/task-management/meeting-attendance` | Bearer JWT (typical) | taskManagement.js |  |
| `GET` | `/admin/task-management/meetings` | Bearer JWT (typical) | taskManagement.js |  |
| `POST` | `/admin/task-management/meetings` | Bearer JWT (typical) | taskManagement.js |  |
| `PATCH` | `/admin/task-management/meetings/:id` | Bearer JWT (typical) | taskManagement.js |  |
| `PATCH` | `/admin/task-management/meetings/:id/close` | Bearer JWT (typical) | taskManagement.js |  |
| `GET` | `/admin/task-management/meetings/:id/history` | Bearer JWT (typical) | taskManagement.js |  |
| `GET` | `/admin/task-management/observers` | Bearer JWT (typical) | taskManagement.js |  |
| `GET` | `/admin/task-management/observers/:id/mappings` | Bearer JWT (typical) | taskManagement.js |  |
| `POST` | `/admin/task-management/observers/:id/mappings` | Bearer JWT (typical) | taskManagement.js |  |
| `PATCH` | `/admin/task-management/observers/:id/toggle` | Bearer JWT (typical) | taskManagement.js |  |
| `GET` | `/admin/task-management/tickets` | Bearer JWT (typical) | taskManagement.js |  |
| `POST` | `/admin/task-management/tickets` | Bearer JWT (typical) | taskManagement.js |  |
| `PATCH` | `/admin/task-management/tickets/:id` | Bearer JWT (typical) | taskManagement.js |  |
| `PATCH` | `/admin/task-management/tickets/:id/close` | Bearer JWT (typical) | taskManagement.js |  |
| `GET` | `/admin/task-management/tickets/:id/history` | Bearer JWT (typical) | taskManagement.js |  |
| `GET` | `/admin/task-management/tickets/search/:ticketId` | Bearer JWT (typical) | taskManagement.js |  |
| `POST` | `/admin/test-email` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/upload-profile-photo` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/uploads/*` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/user-access/assign-badges` | Bearer JWT + tenant | userAccess.js |  |
| `GET` | `/admin/user-access/badges` | Bearer JWT + tenant | userAccess.js |  |
| `POST` | `/admin/user-access/badges` | Bearer JWT + tenant | userAccess.js |  |
| `DELETE` | `/admin/user-access/badges/:id` | Bearer JWT + tenant | userAccess.js |  |
| `PUT` | `/admin/user-access/badges/:id` | Bearer JWT + tenant | userAccess.js |  |
| `GET` | `/admin/user-access/my-sidebar-permissions` | Bearer JWT + tenant | userAccess.js |  |
| `GET` | `/admin/user-access/permission-options` | Bearer JWT + tenant | userAccess.js |  |
| `GET` | `/admin/user-access/sidebar-brand` | Bearer JWT + tenant | userAccess.js |  |
| `GET` | `/admin/user-access/staff` | Bearer JWT + tenant | userAccess.js |  |
| `POST` | `/admin/weekly-off/assign` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `DELETE` | `/admin/weekly-off/assign/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/weekly-off/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `POST` | `/admin/weekly-off/templates` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `PUT` | `/admin/weekly-off/templates/:id` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/weekly-off/templates/:id/assignments` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/weekly-off/user/:userId` | Bearer JWT + role + tenant (router default) | admin.js |  |
| `GET` | `/admin/wishes/` | Bearer JWT (typical) | wishes.js |  |
| `POST` | `/ai/ask` | Bearer JWT + tenant | ai.js |  |
| `GET` | `/ai/attendance-productivity` | Bearer JWT (typical) | ai.js |  |
| `POST` | `/ai/chat` | Bearer JWT (typical) | ai.js |  |
| `GET` | `/ai/salary-forecast` | Bearer JWT (typical) | ai.js |  |
| `POST` | `/ai/salary-forecast/compute` | Bearer JWT (typical) | ai.js |  |
| `POST` | `/api/webhook/essl/` | Webhook secret (ESSL_WEBHOOK_SECRET) | esslWebhook.js |  |
| `POST` | `/attendance/auto-punchout` | Bearer JWT (typical) | attendance.js |  |
| `POST` | `/attendance/end-break` | Bearer JWT (typical) | attendance.js |  |
| `GET` | `/attendance/history` | Bearer JWT (typical) | attendance.js |  |
| `POST` | `/attendance/location/ping` | Bearer JWT (typical) | attendance.js |  |
| `POST` | `/attendance/ping` | Bearer JWT (typical) | attendance.js |  |
| `POST` | `/attendance/punch-in` | Bearer JWT (typical) | attendance.js |  |
| `POST` | `/attendance/punch-out` | Bearer JWT (typical) | attendance.js |  |
| `POST` | `/attendance/qr-punch` | Bearer JWT (typical) | attendance.js |  |
| `GET` | `/attendance/report` | Bearer JWT (typical) | attendance.js |  |
| `GET` | `/attendance/report/pdf` | Bearer JWT (typical) | attendance.js |  |
| `GET` | `/attendance/settings/max-break` | Bearer JWT (typical) | attendance.js |  |
| `PUT` | `/attendance/settings/max-break` | Bearer JWT (typical) | attendance.js |  |
| `POST` | `/attendance/start-break` | Bearer JWT (typical) | attendance.js |  |
| `GET` | `/attendance/status` | Bearer JWT (typical) | attendance.js |  |
| `GET` | `/attendance/user/:userId` | Bearer JWT (typical) | attendance.js |  |
| `GET` | `/attendance/weekly` | Bearer JWT (typical) | attendance.js |  |
| `POST` | `/auth/add-organization` | Bearer JWT (typical) | auth.js |  |
| `POST` | `/auth/impersonate/exchange` | Public (some rate limited) | auth.js |  |
| `POST` | `/auth/login` | Public (rate limited) | auth.js |  |
| `POST` | `/auth/logout` | Bearer JWT (typical) | auth.js |  |
| `POST` | `/auth/logout-mobile` | Bearer JWT (typical) | auth.js |  |
| `GET` | `/auth/otp/latest` | Public (some rate limited) | auth.js |  |
| `POST` | `/auth/refresh` | Public (some rate limited) | auth.js |  |
| `POST` | `/auth/refresh-mobile` | Public (some rate limited) | auth.js |  |
| `POST` | `/auth/reset-password` | Public (some rate limited) | auth.js |  |
| `POST` | `/auth/send-otp` | Public (rate limited) | auth.js |  |
| `POST` | `/auth/signup-admin` | Public (some rate limited) | auth.js |  |
| `POST` | `/auth/switch-account` | Bearer JWT (typical) | auth.js |  |
| `POST` | `/auth/verify-otp` | Public (some rate limited) | auth.js |  |
| `GET` | `/channel-partner/client/:id/geo-staff-count` | Bearer JWT | channelPartner.js |  |
| `GET` | `/channel-partner/client/:id/staff-count` | Bearer JWT | channelPartner.js |  |
| `GET` | `/channel-partner/clients` | Bearer JWT | channelPartner.js |  |
| `GET` | `/channel-partner/clients/:id/plan-details` | Bearer JWT | channelPartner.js |  |
| `POST` | `/documents/:documentTypeId/upload` | Bearer JWT (typical) | documents.js |  |
| `GET` | `/documents/required` | Bearer JWT (typical) | documents.js |  |
| `GET` | `/health` | Public | index.js | Health check |
| `POST` | `/kiosk/face-recognition` | Bearer JWT (typical) | kiosk.js |  |
| `GET` | `/kiosk/list-faces` | Bearer JWT (typical) | kiosk.js |  |
| `POST` | `/kiosk/login` | Public (rate limited) | kiosk.js |  |
| `GET` | `/leave/` | Bearer JWT (typical) | leave.js |  |
| `POST` | `/leave/` | Bearer JWT (typical) | leave.js |  |
| `DELETE` | `/leave/:id` | Bearer JWT (typical) | leave.js |  |
| `PATCH` | `/leave/:id/status` | Bearer JWT (typical) | leave.js |  |
| `GET` | `/leave/categories` | Bearer JWT (typical) | leave.js |  |
| `GET` | `/leave/check-range` | Bearer JWT (typical) | leave.js |  |
| `POST` | `/leave/encash/admin-create` | Bearer JWT (typical) | leave.js |  |
| `GET` | `/leave/encash/balance-check` | Bearer JWT (typical) | leave.js |  |
| `POST` | `/leave/encash/claim` | Bearer JWT (typical) | leave.js |  |
| `GET` | `/leave/encash/claims` | Bearer JWT (typical) | leave.js |  |
| `DELETE` | `/leave/encash/claims/:id` | Bearer JWT (typical) | leave.js |  |
| `GET` | `/leave/encash/claims/me` | Bearer JWT (typical) | leave.js |  |
| `POST` | `/leave/encash/review` | Bearer JWT (typical) | leave.js |  |
| `GET` | `/leave/me` | Bearer JWT (typical) | leave.js |  |
| `GET` | `/leave/weekly-off/my` | Bearer JWT (typical) | weeklyOff.js |  |
| `GET` | `/me/` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/attendance-template` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/bank` | Bearer JWT (typical) | me.js |  |
| `PUT` | `/me/bank` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/expenses` | Bearer JWT (typical) | me.js |  |
| `POST` | `/me/expenses` | Bearer JWT (typical) | me.js |  |
| `PUT` | `/me/expenses/:id` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/general` | Bearer JWT (typical) | me.js |  |
| `PUT` | `/me/general` | Bearer JWT (typical) | me.js |  |
| `PUT` | `/me/password` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/payroll-status` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/payslip` | Bearer JWT (typical) | me.js |  |
| `PUT` | `/me/phone` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/profile` | Bearer JWT (typical) | me.js |  |
| `PUT` | `/me/profile` | Bearer JWT (typical) | me.js |  |
| `POST` | `/me/profile/photo` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/salary-compute` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/salary-history-range` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/salary/access` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/shift` | Bearer JWT (typical) | me.js |  |
| `GET` | `/me/staff-list` | Bearer JWT (typical) | me.js |  |
| `POST` | `/meetings/` | Bearer JWT (typical) | meeting.js |  |
| `PUT` | `/meetings/:id` | Bearer JWT (typical) | meeting.js |  |
| `PATCH` | `/meetings/:id/status` | Bearer JWT (typical) | meeting.js |  |
| `GET` | `/meetings/me` | Bearer JWT (typical) | meeting.js |  |
| `POST` | `/mobile/roles/assign-role` | Bearer JWT + tenant | roles.js |  |
| `POST` | `/mobile/roles/bulk-assign-role` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/mobile/roles/debug-geolocation` | Bearer JWT + tenant | roles.js |  |
| `POST` | `/mobile/roles/fix-geo-role` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/mobile/roles/geolocation-limits` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/mobile/roles/my-permissions` | Bearer JWT | roles.js |  |
| `GET` | `/mobile/roles/my-permissions-open` | Bearer JWT (typical) | roles.js |  |
| `GET` | `/mobile/roles/permissions` | Bearer JWT | roles.js |  |
| `GET` | `/mobile/roles/roles` | Bearer JWT + tenant | roles.js |  |
| `POST` | `/mobile/roles/roles` | Bearer JWT + tenant | roles.js |  |
| `DELETE` | `/mobile/roles/roles/:id` | Bearer JWT + tenant | roles.js |  |
| `PUT` | `/mobile/roles/roles/:id` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/mobile/roles/staff-with-roles` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/mobile/roles/test-subscription` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/mobile/roles/user-permissions` | Bearer JWT + tenant | roles.js |  |
| `GET` | `/salary-templates/` | Bearer JWT + role | salaryTemplates.js |  |
| `POST` | `/salary-templates/` | Bearer JWT + role | salaryTemplates.js |  |
| `DELETE` | `/salary-templates/:id` | Bearer JWT + role | salaryTemplates.js |  |
| `GET` | `/salary-templates/:id` | Bearer JWT + role | salaryTemplates.js |  |
| `PUT` | `/salary-templates/:id` | Bearer JWT + role | salaryTemplates.js |  |
| `POST` | `/salary-templates/:id/calculate` | Bearer JWT | salaryTemplates.js |  |
| `GET` | `/sales/assigned-jobs` | Bearer JWT (typical) | sales.js |  |
| `GET` | `/sales/assigned-jobs/:id` | Bearer JWT (typical) | sales.js |  |
| `PUT` | `/sales/assigned-jobs/:id/status` | Bearer JWT (typical) | sales.js |  |
| `GET` | `/sales/assigned_jobs` | Bearer JWT (typical) | sales.js |  |
| `GET` | `/sales/assigned_jobs/:id` | Bearer JWT (typical) | sales.js |  |
| `PUT` | `/sales/assigned_jobs/:id/status` | Bearer JWT (typical) | sales.js |  |
| `GET` | `/sales/incentives/current` | Bearer JWT (typical) | sales.js |  |
| `GET` | `/sales/my-clients` | Bearer JWT (typical) | sales.js |  |
| `GET` | `/sales/my-orders` | Bearer JWT (typical) | sales.js |  |
| `GET` | `/sales/my-visits` | Bearer JWT (typical) | sales.js |  |
| `GET` | `/sales/order-products` | Bearer JWT (typical) | sales.js |  |
| `POST` | `/sales/orders` | Bearer JWT (typical) | sales.js |  |
| `POST` | `/sales/send-client-otp` | Bearer JWT (typical) | sales.js |  |
| `GET` | `/sales/summary` | Bearer JWT (typical) | sales.js |  |
| `GET` | `/sales/targets/current` | Bearer JWT (typical) | sales.js |  |
| `POST` | `/sales/visit` | Bearer JWT (typical) | sales.js |  |
| `GET` | `/sales/weekly` | Bearer JWT (typical) | sales.js |  |
| `POST` | `/security/patrol/checkin` | Bearer JWT (typical) | security.js |  |
| `GET` | `/security/patrol/today` | Bearer JWT (typical) | security.js |  |
| `POST` | `/subscription/assign-subscription` | Bearer JWT + role | subscription.js |  |
| `GET` | `/subscription/clients` | Bearer JWT + role | subscription.js |  |
| `PUT` | `/subscription/clients/:subscriptionId/geolocation-limit` | Bearer JWT + role | subscription.js |  |
| `GET` | `/subscription/plans` | Bearer JWT + role | subscription.js |  |
| `POST` | `/subscription/plans` | Bearer JWT + role | subscription.js |  |
| `PUT` | `/subscription/plans/:id` | Bearer JWT + role | subscription.js |  |
| `GET` | `/subscription/subscription-info` | Bearer JWT + tenant | subscription.js |  |
| `GET` | `/superadmin/channel-partners` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/channel-partners` | Bearer JWT (typical) | superadmin.js |  |
| `PUT` | `/superadmin/channel-partners/:id` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/client/:id/geo-staff-count` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/client/:id/staff-count` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/clients` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/clients` | Bearer JWT (typical) | superadmin.js |  |
| `DELETE` | `/superadmin/clients/:clientId/staff/:staffId` | Bearer JWT (typical) | superadmin.js |  |
| `PUT` | `/superadmin/clients/:id` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/clients/:id/impersonate` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/clients/:id/plan-details` | Bearer JWT (typical) | superadmin.js |  |
| `DELETE` | `/superadmin/clients/:id/staff` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/clients/:id/staff` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/clients/:id/subscription` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/clients/:id/toggle-status` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/dashboard` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/holidays` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/holidays` | Bearer JWT (typical) | superadmin.js |  |
| `DELETE` | `/superadmin/holidays/:id` | Bearer JWT (typical) | superadmin.js |  |
| `PUT` | `/superadmin/holidays/:id` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/leads` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/leads` | Bearer JWT (typical) | superadmin.js |  |
| `DELETE` | `/superadmin/leads/:id` | Bearer JWT (typical) | superadmin.js |  |
| `PUT` | `/superadmin/leads/:id` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/leads/config` | Bearer JWT (typical) | superadmin.js |  |
| `PUT` | `/superadmin/leads/config` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/leads/export` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/leads/export-template` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/leads/import` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/mail/campaign` | Bearer JWT (typical) | superadminMail.js |  |
| `GET` | `/superadmin/mail/campaign/:id/details` | Bearer JWT (typical) | superadminMail.js |  |
| `GET` | `/superadmin/mail/campaign/:id/export` | Bearer JWT (typical) | superadminMail.js |  |
| `POST` | `/superadmin/mail/campaign/:id/pause` | Bearer JWT (typical) | superadminMail.js |  |
| `POST` | `/superadmin/mail/campaign/:id/resend` | Bearer JWT (typical) | superadminMail.js |  |
| `POST` | `/superadmin/mail/campaign/:id/resume` | Bearer JWT (typical) | superadminMail.js |  |
| `POST` | `/superadmin/mail/campaign/excel` | Bearer JWT (typical) | superadminMail.js |  |
| `GET` | `/superadmin/mail/campaigns` | Bearer JWT (typical) | superadminMail.js |  |
| `POST` | `/superadmin/mail/queue/:queueId/pause` | Bearer JWT (typical) | superadminMail.js |  |
| `POST` | `/superadmin/mail/queue/:queueId/resume` | Bearer JWT (typical) | superadminMail.js |  |
| `POST` | `/superadmin/mail/queue/batch-pause` | Bearer JWT (typical) | superadminMail.js |  |
| `POST` | `/superadmin/mail/queue/batch-resume` | Bearer JWT (typical) | superadminMail.js |  |
| `GET` | `/superadmin/mail/queue/stats` | Bearer JWT (typical) | superadminMail.js |  |
| `GET` | `/superadmin/mail/track/:queueId.gif` | Bearer JWT (typical) | superadminMail.js |  |
| `GET` | `/superadmin/plans` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/plans` | Bearer JWT (typical) | superadmin.js |  |
| `PUT` | `/superadmin/plans/:id` | Bearer JWT (typical) | superadmin.js |  |
| `GET` | `/superadmin/staff` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/staff` | Bearer JWT (typical) | superadmin.js |  |
| `DELETE` | `/superadmin/staff/:id` | Bearer JWT (typical) | superadmin.js |  |
| `PUT` | `/superadmin/staff/:id` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/superadmin/subscription-expiry-reminder-check` | Bearer JWT (typical) | superadmin.js |  |
| `POST` | `/tickets/` | Bearer JWT (typical) | ticket.js |  |
| `PATCH` | `/tickets/:id` | Bearer JWT (typical) | ticket.js |  |
| `PATCH` | `/tickets/:id/status` | Bearer JWT (typical) | ticket.js |  |
| `GET` | `/tickets/my` | Bearer JWT (typical) | ticket.js |  |
| `GET` | `/tickets/staff` | Bearer JWT (typical) | ticket.js |  |
| `GET` | `/uploads/*` | Bearer JWT (?token= query supported) | index.js | Authenticated file download |
| `GET` | `/view-pdf/:month/:filename` | Bearer JWT | index.js | Payslip PDF viewer HTML |