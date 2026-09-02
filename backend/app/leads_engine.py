import random
import uuid
import httpx
import json
import asyncio
# google-genai is used in ai_generator.py, not here
from typing import List, Dict, Any
from app.social_scraper import SocialScraper
from app.models import LeadItem, LeadSocialLinks
from app.config import settings

AVATARS_FEMALE = [
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1594824813566-78853679014b?w=150&auto=format&fit=crop&q=80"
]

AVATARS_MALE = [
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80"
]

DATA_BY_NICHE: Dict[str, Dict[str, Any]] = {
    "farmaceutico": {"roles": ["Farmacêutico", "Proprietário", "Gerente"], "companies": ["Farmácia", "Drogaria"]},
    "medico": {"roles": ["Médico", "Diretor Clínico"], "companies": ["Clínica", "Consultório"]},
    "dentista": {"roles": ["Dentista", "Ortodontista"], "companies": ["Odonto", "Clínica Dental"]},
    "corretor": {"roles": ["Corretor", "Diretor"], "companies": ["Imobiliária", "Imóveis"]},
    "advogado": {"roles": ["Advogado", "Sócio"], "companies": ["Advocacia", "Sociedade de Advogados"]}
}

FIRST_NAMES_MALE = ["Gabriel", "Lucas", "Rodrigo", "Felipe", "Matheus", "Carlos"]
FIRST_NAMES_FEMALE = ["Camila", "Mariana", "Beatriz", "Fernanda", "Juliana", "Aline"]
LAST_NAMES = ["Melo", "Leite", "Silva", "Santos", "Oliveira", "Souza"]

def normalize_key(text: str) -> str:
    t = text.lower().strip()
    if "farmac" in t or "droga" in t: return "farmaceutico"
    elif "med" in t or "clinic" in t: return "medico"
    elif "dent" in t or "odon" in t: return "dentista"
    elif "imov" in t or "corret" in t: return "corretor"
    elif "adv" in t or "juri" in t: return "advogado"
    return t

class LeadsEngine:
    @staticmethod
    async def search_leads(niche: str, location: str, query: str = "", limit: int = 10, api_key: str = None) -> List[LeadItem]:
        niche_key = normalize_key(niche)
        niche_data = DATA_BY_NICHE.get(niche_key, {
            "roles": ["Proprietario", "Profissional", "Gerente"],
            "companies": [niche.capitalize(), f"Empresa de {niche.capitalize()}"]
        })
        
        city_display = location.strip() if location.strip() else "Botucatu, SP"
        if not ("SP" in city_display or "RJ" in city_display or "MG" in city_display or "PR" in city_display):
            city_display = f"{city_display}, SP"

        leads: List[LeadItem] = []

        if api_key:
            try:
                search_query = f"{niche} em {city_display}"
                places_url = "https://places.googleapis.com/v1/places:searchText"
                
                headers = {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.photos"
                }
                
                payload = {
                    "textQuery": search_query,
                    "languageCode": "pt-BR"
                }
                
                async with httpx.AsyncClient() as client:
                    resp = await client.post(places_url, headers=headers, json=payload)
                    data = resp.json()
                    
                    if resp.status_code == 200:
                        results = data.get("places", [])[:limit]
                        
                        for place in results:
                            # Places API (New) fields
                            company_name = place.get("displayName", {}).get("text", "Empresa Desconhecida")
                            address = place.get("formattedAddress", city_display)
                            phone = place.get("nationalPhoneNumber", "")
                            website = place.get("websiteUri", "")
                            rating = place.get("rating", 0.0)
                            
                            # Get actual photo from Google Maps
                            photos = place.get("photos", [])
                            if photos:
                                photo_name = photos[0].get("name")
                                avatar = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=400&maxWidthPx=400&key={api_key}"
                            else:
                                avatar = f"https://ui-avatars.com/api/?name={company_name.replace(' ', '+')}&background=random&size=150"
                            
                            # Clean phone number
                            clean_phone = ''.join(filter(str.isdigit, phone)) if phone else ""
                            if clean_phone and not clean_phone.startswith("55"):
                                clean_phone = f"55{clean_phone}"
                            
                            # Calculate opportunity score
                            missing_assets = []
                            opportunity_score = int(random.uniform(50, 80))
                            
                            if not website:
                                missing_assets.append("website")
                                opportunity_score += 15
                                
                            if rating > 4.5:
                                opportunity_score += 5
                                
                            # Guess whatsapp based on phone prefix
                            has_whatsapp = bool(clean_phone and len(clean_phone) >= 12 and clean_phone[4] == '9')
                            
                            # Google Maps API does not provide Instagram/LinkedIn
                            missing_assets.append("instagram")
                            
                            email = f"contato@{company_name.lower().replace(' ', '')}.com.br" if website else ""
                            
                            leads.append(LeadItem(
                                id=place.get("id", f"ld_{uuid.uuid4().hex[:8]}"),
                                name=company_name,
                                company=company_name,
                                role=random.choice(niche_data["roles"]),
                                niche=niche,
                                city=address.split(',')[0] if ',' in address else city_display,
                                location=address,
                                email=email,
                                phone=clean_phone if clean_phone else "",
                                whatsapp=has_whatsapp,
                                website=website,
                                address=address,
                                avatar=avatar,
                                opportunityScore=min(99, opportunity_score),
                                quality_score=min(99, opportunity_score),
                                verified=True,
                                missingDigitalAssets=missing_assets,
                                socials=LeadSocialLinks(
                                    linkedin=None,
                                    instagram=None,
                                    website=website
                                ),
                                ai_summary=f"Encontrado no Google Maps. Nota {rating}. {'Precisa de presenca online forte' if missing_assets else 'Pode otimizar conversao'}."
                            ))
                                
                        # Run deep enrichment for all leads concurrently (limit to 3 at a time)
                        sem = asyncio.Semaphore(3)
                        async def bounded_enrich(lead):
                            async with sem:
                                return await SocialScraper.enrich_lead(lead.company, lead.city, lead.socials.website)
                        
                        enrich_tasks = [
                            bounded_enrich(lead)
                            for lead in leads
                        ]
                        enrich_results = await asyncio.gather(*enrich_tasks, return_exceptions=True)
                        
                        for i, result in enumerate(enrich_results):
                            if isinstance(result, dict):
                                lead = leads[i]
                                lead.socials.instagram = result.get("instagram")
                                lead.socials.linkedin = result.get("linkedin")
                                lead.socials.facebook = result.get("facebook")
                                lead.socials.x_twitter = result.get("twitter")
                                lead.socials.tiktok = result.get("tiktok")
                                
                                # Remove missing assets if found
                                if lead.socials.instagram and "instagram" in lead.missingDigitalAssets:
                                    lead.missingDigitalAssets.remove("instagram")
                                    
                                if result.get("bio"):
                                    lead.bio = result.get("bio")
                                    lead.ai_summary += f" [Bio Info: {result.get('bio')[:100]}...]"
                    else:
                        error_msg = data.get('error', {}).get('message', 'Erro desconhecido na API do Google Maps')
                        print(f"Google Maps API failed. Status: {resp.status_code}. Error: {error_msg}")
                        raise ValueError(f"Erro na API do Google Maps: {error_msg}")
            except Exception as e:
                print(f"Error calling Maps API: {e}")
                raise ValueError(f"Erro ao buscar no Google Maps: {e}")
        else:
            raise ValueError("Chave da API do Google Maps ausente.")

        leads.sort(key=lambda x: x.opportunityScore or 0, reverse=True)
        return leads
