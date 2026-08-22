import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv('.env.test')
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.leads_engine import LeadsEngine

async def run():
    api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
    if not api_key:
        print("API KEY NOT FOUND")
        return
        
    try:
        leads = await LeadsEngine.search_leads('arquitetos', 'Botucatu', limit=3, api_key=api_key)
        print(f"Found {len(leads)} leads:")
        for l in leads:
            print(f"- {l.company} ({l.phone})")
    except Exception as e:
        print(f"ERROR: {e}")

asyncio.run(run())
