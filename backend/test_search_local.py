import asyncio
from app.models import LeadSearchRequest
from app.leads_engine import LeadsEngine
from app.config import settings

async def test_search():
    print("Iniciando busca...")
    try:
        leads = await LeadsEngine.search_leads(
            niche="Restaurantes",
            location="Botucatu, SP, Brasil",
            query="",
            limit=5,
            api_key=settings.GOOGLE_MAPS_API_KEY
        )
        print(f"Sucesso! Encontrados {len(leads)} leads.")
        for l in leads:
            print(f"- {l.name}")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test_search())
