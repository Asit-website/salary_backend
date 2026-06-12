with open("c:/Users/Admin/thinktech/salary_backend/src/routes/admin.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "HolidayTemplate" in line or "holiday-templates" in line or "StaffHolidayAssignment" in line or "holiday-assignments" in line or "HolidayDate" in line:
        print(f"{i+1}: {line.strip()}")
