import os

filepath = r"c:\Users\Admin\thinktech\salary_backend\src\models\index.js"

with open(filepath, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "checkIn" in line or "checkOut" in line:
            print(f"Line {idx+1}: {line.strip()}")
