with open("c:/Users/Admin/thinktech/salary_backend/src/services/payrollService.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "fl" in line or "const fl" in line:
        print(f"{i+1}: {line.strip()}")
