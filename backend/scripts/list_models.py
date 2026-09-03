import sys
import httpx
import json

key = sys.argv[1]
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"

try:
    r = httpx.get(url)
    print("STATUS CODE:", r.status_code)
    data = r.json()
    if 'models' in data:
        for m in data['models']:
            print(m['name'])
    else:
        print(data)
except Exception as e:
    print("ERROR:", e)
