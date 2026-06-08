import os

filepath = r"c:\Users\Admin\thinktech\salary_backend\src\routes\attendance.js"

if os.path.exists(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    for idx, line in enumerate(lines):
        if "router.get(" in line or "router.post(" in line:
            print(f"Line {idx+1}: {line.strip()}")
else:
    print("File not found")
