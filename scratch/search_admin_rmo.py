with open("c:/Users/Admin/thinktech/salary_backend/src/routes/admin.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "rmo_settings" in line or "rmoSettings" in line or "/settings/rmo" in line:
        print(f"{i+1}: {line.strip()}")
