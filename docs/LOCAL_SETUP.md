# Local backend setup (Windows + XAMPP)

## Your errors explained

| Error | Meaning |
|-------|---------|
| `Access denied for user 'root'@'localhost'` | Wrong `DB_PASSWORD` in `.env`. XAMPP default is **empty** password: `DB_PASSWORD=` (no quotes). |
| `sequelizemeta doesn't exist in engine` | **Corrupt MySQL data** — `.ibd` files without valid InnoDB catalog. Fix: delete DB folder and recreate (see below). |
| `Database tables not found` | Migrations did not finish; app cannot start. |
| `AWS Rekognition ... credential` | **Safe to ignore** for API testing unless you use face/kiosk AWS features. |

## 1. XAMPP MySQL

1. Open **XAMPP Control Panel** → Start **MySQL**.
2. `.env` should match:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=thinktech_attendance
DB_USER=root
DB_PASSWORD=
```

## 2. Clean database (if corrupt)

Stop MySQL, delete folder, start MySQL, create DB:

```powershell
Stop-Process -Name mysqld -Force
Remove-Item -Recurse -Force C:\xampp\mysql\data\thinktech_attendance
# Start MySQL again from XAMPP
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE thinktech_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## 3. Migrations (important)

This repo has **two** migration folders. Use:

```bash
npm run migrate:all
```

(`migrations/` first, then `src/migrations/`)

Default `npm run migrate` alone is **not enough** for a fresh install.

If migration fails mid-way, ask for a **MySQL dump from staging/production** and import it — fastest for a full schema.

## 4. Start server

```bash
npm start
```

Check: `http://localhost:4000/health` → `{"ok":true}`

## 5. API testing without local DB

You can test APIs against production:

- Base URL: `https://backend.vetansutra.com`
- Postman: `docs/openapi.yaml` + OTP/login for token

Use only test accounts; do not run destructive tests on production.
