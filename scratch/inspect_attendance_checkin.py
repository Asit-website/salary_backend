import os

filepath = r"c:\Users\Admin\thinktech\salary_backend\src\routes\attendance.js"

with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "checkIn" in line or "checkOut" in line:
        # print 5 lines before and after
        start = max(0, idx - 3)
        end = min(len(lines), idx + 4)
        print(f"--- line {idx+1} ---")
        for i in range(start, end):
            print(f"{i+1}: {lines[i].strip()}")
