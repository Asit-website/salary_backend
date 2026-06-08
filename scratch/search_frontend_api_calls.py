import os

root_dir = r"c:\Users\Admin\thinktech\salary_frontend"
ignore_dirs = {"node_modules", ".git", "build", "dist"}

for dirpath, dirnames, filenames in os.walk(root_dir):
    dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
    for filename in filenames:
        if filename.endswith(".js") or filename.endswith(".jsx"):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if "/attendance/user/" in content or "/user/" in content or "GET_USER_ATTENDANCE" in content:
                        print(f"Found call in {os.path.relpath(filepath, root_dir)}")
            except Exception:
                pass
