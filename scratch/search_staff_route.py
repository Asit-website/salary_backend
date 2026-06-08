import os

filepath = r"c:\Users\Admin\thinktech\salary_backend\src\routes\admin.js"

with open(filepath, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "router.get(" in line and "/staff" in line:
            print(f"Line {idx+1}: {line.strip()}")
