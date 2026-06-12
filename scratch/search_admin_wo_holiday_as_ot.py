with open("c:/Users/Admin/thinktech/salary_backend/src/routes/admin.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "woHolidayAsOt" in line or "wo-holiday-as-ot" in line or "wo_holiday_as_ot" in line:
        print(f"{i+1}: {line.strip()}")
