import os

filepaths = [
    r"c:\Users\Admin\thinktech\salary_frontend\src\components\AttendanceManagement.js",
    r"c:\Users\Admin\thinktech\salary_frontend\src\components\OrgReports.js",
    r"c:\Users\Admin\thinktech\salary_frontend\src\components\StaffProfileView.js"
]

for filepath in filepaths:
    if os.path.exists(filepath):
        print(f"=== {os.path.basename(filepath)} ===")
        with open(filepath, "r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                if any(x in line for x in ["checkIn", "punchedInAt", "punched_in_at"]):
                    print(f"Line {idx+1}: {line.strip()}")
