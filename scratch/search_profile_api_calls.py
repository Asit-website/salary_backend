import os

filepath = r"c:\Users\Admin\thinktech\salary_frontend\src\components\StaffProfileView.js"

with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "/attendance" in line or "attendance" in line.lower() or "checkin" in line.lower():
        if "api." in line or "fetch" in line or "axios" in line or "get" in line:
            print(f"Line {idx+1}: {line.strip()}")
