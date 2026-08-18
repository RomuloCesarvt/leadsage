import sys
import httpx
import json

key = sys.argv[1]
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"

payload = {
    "contents": [{
        "parts": [{"text": "Hello, say 'API IS WORKING'."}]
    }]
}

headers = {'Content-Type': 'application/json'}

try:
    r = httpx.post(url, json=payload, headers=headers)
    print("STATUS CODE:", r.status_code)
    print("RESPONSE:", r.text)
except Exception as e:
    print("ERROR:", e)
