with open("c:/Users/Admin/thinktech/salary_backend/src/routes/admin.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "qr-attendance" in line or "qr_attendance" in line:
        print(f"{i+1}: {line.strip()}")
