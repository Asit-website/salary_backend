import os

filepath = r"c:\Users\Admin\thinktech\salary_frontend\src\components\Settings.js"

with open(filepath, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "Salary Settings" in line or "EsiAsTa" in line or "SalarySettings" in line:
            print(f"Line {idx+1}: {line.strip()}")
