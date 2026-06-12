with open("c:/Users/Admin/thinktech/salary_backend/src/routes/admin.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "salaryCalculation" in line or "settingsPayableDays" in line or "salary_calculation" in line or "payable_days" in line:
        print(f"{i+1}: {line.strip()}")
