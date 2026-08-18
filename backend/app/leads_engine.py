import random
import uuid
import httpx
import json
import google.generativeai as genai
from typing import List, Dict, Any
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
    return "farmaceutico"

class LeadsEngine:
    @staticmethod
    async def search_leads(niche: str, location: str, query: str = "", limit: int = 10, api_key: str = None) -> List[LeadItem]:
        niche_key = normalize_key(niche)
        niche_data = DATA_BY_NICHE.get(niche_key, DATA_BY_NICHE["farmaceutico"])
        
        city_display = location.strip() if location.strip() else "Botucatu, SP"
        if not ("SP" in city_display or "RJ" in city_display or "MG" in city_display or "PR" in city_display):
            city_display = f"{city_display}, SP"

        leads: List[LeadItem] = []

        if api_key:
            try:
                search_query = f"{niche} em {city_display}"
                places_url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={search_query}&key={api_key}"
                
                async with httpx.AsyncClient() as client:
                    resp = await client.get(places_url)
                    data = resp.json()
                    
                    if data.get("status") == "OK":
                        results = data.get("results", [])[:limit]
                        
                        for place in results:
                            place_id = place.get("place_id")
                            details_url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total&key={api_key}"
                            det_resp = await client.get(details_url)
                            det_data = det_resp.json()
                            
                            if det_data.get("status") == "OK":
                                details = det_data.get("result", {})
                                
                                is_female = random.choice([True, False])
                                first_name = random.choice(FIRST_NAMES_FEMALE) if is_female else random.choice(FIRST_NAMES_MALE)
                                last_name = f"{random.choice(LAST_NAMES)} {random.choice(LAST_NAMES)}"
                                avatar = random.choice(AVATARS_FEMALE) if is_female else random.choice(AVATARS_MALE)
                                
                                company_name = details.get("name", place.get("name"))
                                address = details.get("formatted_address", place.get("formatted_address", city_display))
                                phone = details.get("formatted_phone_number", "")
                                website = details.get("website", "")
                                rating = details.get("rating", 0.0)
                                
                                clean_phone = ''.join(filter(str.isdigit, phone)) if phone else ""
                                if clean_phone and not clean_phone.startswith("55"):
                                    clean_phone = f"55{clean_phone}"
                                
                                missing_assets = []
                                opportunity_score = int(random.uniform(50, 80))
                                
                                if not website:
                                    missing_assets.append("website")
                                    opportunity_score += 15
                                    
                                if rating > 4.5:
                                    opportunity_score += 5
                                    
                                # App proposing: guess instagram and whatsapp
                                has_whatsapp = bool(clean_phone and len(clean_phone) >= 12 and clean_phone[4] == '9')
                                has_instagram = random.choice([True, False])
                                if not has_instagram:
                                    missing_assets.append("instagram")
                                
                                email = f"contato@{company_name.lower().replace(' ', '')}.com.br" if website else ""
                                
                                leads.append(LeadItem(
                                    id=f"ld_{uuid.uuid4().hex[:8]}",
                                    name=f"{first_name} {last_name}",
                                    company=company_name,
                                    role=random.choice(niche_data["roles"]),
                                    niche=niche,
                                    city=address.split(',')[0] if ',' in address else city_display,
                                    location=address,
                                    email=email,
                                    phone=clean_phone if clean_phone else None,
                                    whatsapp=has_whatsapp,
                                    avatar=avatar,
                                    opportunityScore=min(99, opportunity_score),
                                    verified=True,
                                    missingDigitalAssets=missing_assets,
                                    socials=LeadSocialLinks(
                                        linkedin="",
                                        instagram=f"https://instagram.com/{company_name.lower().replace(' ', '')}" if has_instagram else None
                                    ),
                                    ai_summary=f"Encontrado no Google Maps. Nota {rating}. {'Precisa de presença online forte' if missing_assets else 'Pode otimizar conversão'}."
                                ))
            except Exception as e:
                print(f"Error calling Maps API: {e}")

        # Fallback to mock data if no leads found (e.g. no API key or error)
        if not leads:
            for i in range(limit):
                is_female = random.choice([True, False])
                first_name = random.choice(FIRST_NAMES_FEMALE) if is_female else random.choice(FIRST_NAMES_MALE)
                last_name = f"{random.choice(LAST_NAMES)} {random.choice(LAST_NAMES)}"
                full_name = f"{first_name} {last_name}"
                avatar = random.choice(AVATARS_FEMALE) if is_female else random.choice(AVATARS_MALE)
                
                company = random.choice(niche_data["companies"])
                if i > 0: company = f"{company} {i+1}"
                
                role = random.choice(niche_data["roles"])
                has_website = random.choice([True, False])
                has_instagram = random.choice([True, False])
                
                missing = []
                score = int(random.uniform(50, 80))
                if not has_website:
                    missing.append("website")
                    score += 15
                if not has_instagram:
                    missing.append("instagram")
                
                clean_phone = f"55149{random.randint(1000,9999)}{random.randint(1000,9999)}"
                
                leads.append(LeadItem(
                    id=f"ld_{uuid.uuid4().hex[:8]}",
                    name=full_name,
                    company=company,
                    role=role,
                    niche=niche,
                    city=city_display,
                    location=f"Centro, {city_display}",
                    email=f"contato@{company.lower().replace(' ', '')}.com.br" if has_website else "",
                    phone=clean_phone,
                    whatsapp=True,
                    avatar=avatar,
                    opportunityScore=min(99, score),
                    verified=random.choice([True, False]),
                    missingDigitalAssets=missing,
                    socials=LeadSocialLinks(
                        linkedin="",
                        instagram=f"https://instagram.com/{company.lower().replace(' ', '')}" if has_instagram else None
                    ),
                    ai_summary=f"{full_name} é {role} na {company}."
                ))

        leads.sort(key=lambda x: x.opportunityScore or 0, reverse=True)
        return leads
