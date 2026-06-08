import os

filepath = r"c:\Users\Admin\thinktech\salary_backend\src\services\payrollService.js"

with open(filepath, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "shift" in line.lower() or "Shift" in line:
            print(f"Line {idx+1}: {line.strip()}")
