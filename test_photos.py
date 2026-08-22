import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv('.env.test')

async def run():
    api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
    places_url = "https://places.googleapis.com/v1/places:searchText"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.photos"
    }
    
    payload = {
        "textQuery": "arquitetos em Botucatu",
        "languageCode": "pt-BR"
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(places_url, headers=headers, json=payload)
        data = resp.json()
        print("Status:", resp.status_code)
        
        if resp.status_code == 200:
            results = data.get("places", [])[:2]
            for place in results:
                name = place.get("displayName", {}).get("text", "")
                photos = place.get("photos", [])
                print("Name:", name)
                if photos:
                    photo_name = photos[0].get("name")
                    photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=400&maxWidthPx=400&key={api_key}"
                    print("Photo URL:", photo_url)
                else:
                    print("No photos")
        else:
            print("Error:", data)

asyncio.run(run())
