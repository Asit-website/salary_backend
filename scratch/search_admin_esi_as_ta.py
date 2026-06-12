with open("c:/Users/Admin/thinktech/salary_backend/src/routes/admin.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "esiAsTa" in line or "esi-as-ta" in line or "esi_as_ta" in line:
        print(f"{i+1}: {line.strip()}")
