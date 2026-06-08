import os

root_dir = r"c:\Users\Admin\thinktech\salary_backend\src\models"
for filename in os.listdir(root_dir):
    if filename.endswith(".js"):
        filepath = os.path.join(root_dir, filename)
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            if "checkIn" in content:
                print(f"Found checkIn in model {filename}")
