with open("c:/Users/Admin/thinktech/salary_backend/src/routes/admin.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "BusinessFunction" in line or "business-function" in line or "business_function" in line or "business-functions" in line:
        print(f"{i+1}: {line.strip()}")
