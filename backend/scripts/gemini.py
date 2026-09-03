import sys
import google.generativeai as genai

key = sys.argv[1]
genai.configure(api_key=key)
model = genai.GenerativeModel('gemini-2.5-flash')
try:
    response = model.generate_content('Hello')
    print("SUCCESS:", response.text)
except Exception as e:
    print("ERROR:", e)
