import os

search_dir = "c:/Users/Admin/thinktech/salary_backend/src"
query_terms = ["BusinessFunction", "business-function", "business_function", "business-functions"]

for root, dirs, files in os.walk(search_dir):
    for file in files:
        if file.endswith(".js"):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                for term in query_terms:
                    if term in content:
                        print(f"Found '{term}' in {path}")
            except Exception as e:
                pass
