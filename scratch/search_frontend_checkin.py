import os

root_dir = r"c:\Users\Admin\thinktech\salary_frontend"
ignore_dirs = {"node_modules", ".git", "build", "dist"}

for dirpath, dirnames, filenames in os.walk(root_dir):
    dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
    for filename in filenames:
        if filename.endswith(".js"):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if "checkIn" in content or "punchedInAt" in content or "punched_in_at" in content:
                        print(f"Found in {os.path.relpath(filepath, root_dir)}")
            except Exception:
                pass
