import os

root_dir = r"c:\Users\Admin\thinktech\salary_backend"
ignore_dirs = {"node_modules", ".git", "build", "dist"}

for dirpath, dirnames, filenames in os.walk(root_dir):
    dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
    for filename in filenames:
        if filename.endswith(".js"):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if "workMinutes" in content or "work_minutes" in content:
                        # Find matching lines
                        lines = content.splitlines()
                        for idx, line in enumerate(lines):
                            if "min" in line or "max" in line or "validation" in line or "error" in line or "throw" in line:
                                if "workMinutes" in line or "work_minutes" in line:
                                    print(f"{os.path.relpath(filepath, root_dir)} (Line {idx+1}): {line.strip()}")
            except Exception:
                pass
