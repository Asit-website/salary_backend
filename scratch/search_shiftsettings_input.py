import os

filepath = r"c:\Users\Admin\thinktech\salary_frontend\src\components\ShiftSettings.js"

if os.path.exists(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            if "max=" in line or "workHours" in line or "InputNumber" in line:
                print(f"Line {idx+1}: {line.strip()}")
else:
    print("File not found")
