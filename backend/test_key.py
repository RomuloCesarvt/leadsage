import sys
import httpx

key = sys.argv[1]
url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurantes+em+sao+paulo&key={key}"
r = httpx.get(url)
print(r.status_code)
print(r.json())
