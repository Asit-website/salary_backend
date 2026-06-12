with open("c:/Users/Admin/thinktech/salary_backend/src/routes/admin.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "salaryAccess" in line or "SalaryAccess" in line or "allowCurrentCycleSalaryAccess" in line or "salary_access" in line:
        print(f"{i+1}: {line.strip()}")
