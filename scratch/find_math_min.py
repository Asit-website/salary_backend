with open("c:/Users/Admin/thinktech/salary_frontend/src/components/PayrollList.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "Math.min" in line:
        print(f"{i+1}: {line.strip()}")
