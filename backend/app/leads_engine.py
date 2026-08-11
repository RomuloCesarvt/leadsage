import random
import uuid
from typing import List, Dict, Any
from app.models import LeadItem, LeadSocialLinks

AVATARS_FEMALE = [
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1594824813566-78853679014b?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1614644147724-2d4785d69962?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
]

AVATARS_MALE = [
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"
]

DATA_BY_NICHE: Dict[str, Dict[str, Any]] = {
    "farmaceutico": {
        "roles": ["Farmacêutico RT", "Gerente Farmacêutico", "Proprietário de Drogaria", "Farmacêutico Bioquímico", "Especialista em Farmácia Clínica", "Farmacêutico Magistral"],
        "companies": ["Drogaria Vitalis Botucatu", "Farmácia DrogaMax", "PharmaBio Manipulação", "Drogaria São Paulo Botucatu", "Farmácia de Manipulação Botufarma", "Rede Nova Saúde", "Botucatu Manipulações"],
        "bios": ["Especialista em formulação magistral e assistência farmacêutica dedicada à atenção primária em saúde.", "Atuando com gestão de drogaria e orientação ao paciente há 8+ anos.", "Pós-graduando em Farmácia Estética e Manipulação personalizada."]
    },
    "medico": {
        "roles": ["Médico Dermatologista", "Médico Cardiologista", "Diretor Clínico", "Cirurgião Geral", "Médico da Família", "Pediatra", "Ortopedista"],
        "companies": ["Clínica Botucatu de Especialidades", "Instituto Sanare Saúde", "Centro Médico Vitalis", "Hospital & Maternidade Botucatu", "Clínica Dermacare", "Consultório Médico Integrado"],
        "bios": ["CRM-SP ativo. Foco em dermatologia preventiva e tratamentos a laser modernos.", "Especialista em cirurgia de alta precisão e medicina diagnóstica.", "Atendimento humanizado e medicina baseada em evidências."]
    },
    "dentista": {
        "roles": ["Cirurgião-Dentista", "Ortodontista", "Implantodontista", "Especialista em Estética Dental", "Endodontista"],
        "companies": ["OdontoArt Botucatu", "Clínica Sorria Botucatu", "Studio Odontológico VIP", "Instituto Dental Care", "OdontoPrev Centro"],
        "bios": ["Especialista em lentes de contato dental e reabilitação oral estética.", "Transformando sorrisos com odontologia digital e scanner 3D.", "Referência em implantes guiados por computador em Botucatu."]
    },
    "corretor": {
        "roles": ["Corretor de Imóveis Senior", "Consultor Imobiliário", "Diretor Comercial Imobiliário", "Gestor de Carteira Residencial"],
        "companies": ["Botucatu Imóveis VIP", "Lopes Botucatu", "Imobiliária Aliança", "Prime Real Estate", "Morada Nobre Imóveis"],
        "bios": ["Especialista em imóveis de alto padrão e investimentos imobiliários na região de Botucatu.", "Ajudo famílias a encontrarem o imóvel dos sonhos com segurança jurídica."]
    },
    "advogado": {
        "roles": ["Advogado Especialista em Direito Médico", "Sócio Fundador", "Advogado Trabalhista", "Consultor Jurídico Empresarial"],
        "companies": ["Melo & Advogados Associados", "Botucatu Advocacia Empresarial", "Leite & Rocha Sociedade de Advogados", "Lex Consultoria"],
        "bios": ["Especialista em defesas ético-disciplinares e compliance para profissionais da saúde.", "Pós-graduado em Direito Civil e Processual com foco corporativo."]
    }
}

FIRST_NAMES_MALE = ["Gabriel", "Lucas", "Rodrigo", "Felipe", "Matheus", "Eduardo", "Marcelo", "Thiago", "Bruno", "Carlos", "Renato", "Gustavo"]
FIRST_NAMES_FEMALE = ["Camila", "Mariana", "Beatriz", "Fernanda", "Juliana", "Aline", "Patrícia", "Larissa", "Carla", "Vanessa", "Letícia", "Amanda"]
LAST_NAMES = ["Melo", "Leite", "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Pereira", "Carvalho", "Gomes", "Martins"]

def normalize_key(text: str) -> str:
    t = text.lower().strip()
    if "farmac" in t or "droga" in t:
        return "farmaceutico"
    elif "med" in t or "dermat" in t or "clinic" in t:
        return "medico"
    elif "dent" in t or "odon" in t:
        return "dentista"
    elif "imov" in t or "corret" in t or "imobil" in t:
        return "corretor"
    elif "adv" in t or "juri" in t:
        return "advogado"
    return "farmaceutico"

import google.generativeai as genai
from app.config import settings
import json

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

class LeadsEngine:
    @staticmethod
    async def search_leads(niche: str, location: str, query: str = "", limit: int = 10) -> List[LeadItem]:
        niche_key = normalize_key(niche)
        niche_data = DATA_BY_NICHE.get(niche_key, DATA_BY_NICHE["farmaceutico"])
        
        city_display = location.strip() if location.strip() else "Botucatu, SP"
        if not ("SP" in city_display or "RJ" in city_display or "MG" in city_display or "PR" in city_display):
            city_display = f"{city_display}, SP"

        leads: List[LeadItem] = []

        for i in range(limit):
            is_female = random.choice([True, False])
            if is_female:
                first_name = random.choice(FIRST_NAMES_FEMALE)
                avatar = random.choice(AVATARS_FEMALE)
            else:
                first_name = random.choice(FIRST_NAMES_MALE)
                avatar = random.choice(AVATARS_MALE)
                
            last_name = f"{random.choice(LAST_NAMES)} {random.choice(LAST_NAMES)}"
            full_name = f"{first_name} {last_name}"
            
            role = random.choice(niche_data["roles"])
            company = random.choice(niche_data["companies"])
            bio = random.choice(niche_data["bios"])
            
            clean_name = first_name.lower() + "." + last_name.split()[0].lower()
            clean_company = company.lower().replace(" ", "").replace("&", "").replace("-", "")[:12]
            
            email = f"{clean_name}@{clean_company}.com.br"
            phone = f"(14) 9{random.randint(8000, 9999)}-{random.randint(1000, 9999)}"
            
            score = random.randint(85, 99)
            
            socials = LeadSocialLinks(
                linkedin=f"https://linkedin.com/in/{clean_name}-{random.randint(100,999)}",
                instagram=f"https://instagram.com/{clean_name}.official",
                tiktok=f"https://tiktok.com/@{clean_name}",
                facebook=f"https://facebook.com/{clean_name}",
                x_twitter=f"https://x.com/{clean_name}",
                reddit=f"https://reddit.com/user/{clean_name}",
                website=f"https://www.{clean_company}.com.br"
            )
            
            lead_id = f"lead_{uuid.uuid4().hex[:8]}"

            leads.append(LeadItem(
                id=lead_id,
                name=full_name,
                avatar=avatar,
                role=role,
                niche=niche.capitalize() if niche else "Farmacêutico",
                company=company,
                location=city_display,
                city=city_display.split(",")[0],
                email=email,
                phone=phone,
                socials=socials,
                quality_score=score,
                verified=True,
                bio=bio,
                ai_summary="Carregando resumo...",
                match_intent="",
                match_location="",
                match_business="",
                experience="",
                outreach_status="Pendente"
            ))

        leads.sort(key=lambda x: x.quality_score, reverse=True)

        # Usar o Gemini para enriquecer os leads se a chave estiver configurada
        if settings.GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel('gemini-1.5-flash')
                
                # Criar um payload leve para enviar ao Gemini
                leads_context = [{"id": l.id, "name": l.name, "role": l.role, "company": l.company} for l in leads]
                
                prompt = f"""
Você é um agente de prospecção de IA. Vou te passar uma lista de {len(leads)} leads do nicho {niche} em {location}.
Para cada lead, gere informações ricas e fictícias altamente profissionais em Português do Brasil.
Retorne um array JSON exato onde cada objeto tem o ID do lead e os seguintes campos preenchidos:
- ai_summary (1-2 frases sobre o que o lead faz focado em negócios)
- match_intent (1 frase dizendo o motivo dele ser um bom alvo de vendas)
- match_location (1 frase afirmando a compatibilidade da região)
- match_business (1 frase sobre a maturidade da empresa dele)
- experience (1 frase detalhando anos de mercado e conquistas)

Lista de Leads: {json.dumps(leads_context, ensure_ascii=False)}

O output DEVE ser APENAS o JSON. Sem blocos de código Markdown ao redor. Comece com [ e termine com ].
"""
                response = model.generate_content(prompt)
                
                # Parse do retorno da IA
                raw_text = response.text.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                    
                ai_data_list = json.loads(raw_text.strip())
                
                # Mescla as informações
                ai_dict = {item["id"]: item for item in ai_data_list}
                for l in leads:
                    if l.id in ai_dict:
                        enriched = ai_dict[l.id]
                        l.ai_summary = enriched.get("ai_summary", l.ai_summary)
                        l.match_intent = enriched.get("match_intent", l.match_intent)
                        l.match_location = enriched.get("match_location", l.match_location)
                        l.match_business = enriched.get("match_business", l.match_business)
                        l.experience = enriched.get("experience", l.experience)
            except Exception as e:
                print(f"Erro ao enriquecer com Gemini: {e}")

        return leads
