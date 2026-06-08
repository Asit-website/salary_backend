import os

filepath = r"c:\Users\Admin\thinktech\salary_backend\src\routes\attendance.js"

with open(filepath, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "punchedInAt" in line or "punched_in_at" in line:
            print(f"Line {idx+1}: {line.strip()}")
