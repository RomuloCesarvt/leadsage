import json
import google.generativeai as genai
from app.config import settings
from app.models import LeadItem, PitchGenerationRequest, PitchGenerationResponse

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

class AIGenerator:
    @staticmethod
    async def generate_pitch(req: PitchGenerationRequest) -> PitchGenerationResponse:
        lead = req.lead
        tone = req.tone or "Consultivo"
        sender = req.sender_name or "LeadSage Prospecção"

        placeholders = {
            "nome": lead.name,
            "primeiro_nome": lead.name.split()[0],
            "cargo": lead.role,
            "empresa": lead.company,
            "cidade": lead.city,
            "nicho": lead.niche
        }

        # Fallback caso a chave do Gemini não esteja presente
        if not settings.GEMINI_API_KEY:
            first_name = placeholders["primeiro_nome"]
            subject = f"Oportunidade para a {lead.company} em {lead.city}"
            body = (
                f"Olá {first_name}, notei que atua como {lead.role}.\n\n"
                "Para configurar a IA real, adicione a chave GEMINI_API_KEY no arquivo .env.\n\n"
                f"Abraço,\n{sender}"
            )
            return PitchGenerationResponse(
                lead_id=lead.id,
                subject=subject,
                body=body,
                tone=tone,
                placeholders=placeholders
            )

        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"""
Você é um especialista em cold e-mail B2B de altíssima conversão.
Escreva um e-mail curto e direto para o seguinte Lead. 

DADOS DO LEAD:
- Nome: {lead.name}
- Cargo: {lead.role}
- Empresa: {lead.company}
- Localização: {lead.city} ({lead.location})
- Resumo IA: {lead.ai_summary}

DADOS DA MENSAGEM:
- Tom: {tone}
- Remetente: {sender}
- Instruções Extras: {req.custom_instructions or "Nenhuma. Foco em gerar uma reunião rápida de 5 minutos."}

REGRA ESTILÍSTICA:
Crie algo muito natural e persuasivo, sem parecer um robô.
Retorne um JSON exato com duas chaves: "subject" (o assunto do email) e "body" (o corpo do e-mail com quebras de linha). 
Não use blocos markdown (```json). Apenas as chaves.
"""
            response = model.generate_content(prompt)
            
            raw_text = response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
                
            data = json.loads(raw_text.strip())
            subject = data.get("subject", f"Oportunidade para a {lead.company}")
            body = data.get("body", "Erro ao gerar corpo do e-mail.")

        except Exception as e:
            print(f"Erro ao gerar Pitch: {e}")
            subject = f"Oportunidade para a {lead.company}"
            body = f"Olá,\n\nHouve um erro ao processar com a IA: {e}\n\nAbs,\n{sender}"

        return PitchGenerationResponse(
            lead_id=lead.id,
            subject=subject,
            body=body,
            tone=tone,
            placeholders=placeholders
        )

    @staticmethod
    async def generate_demo_site(req) -> dict:
        from app.models import DemoSiteResponse
        lead = req.lead

        # Fallback if no Gemini key
        if not settings.GEMINI_API_KEY:
            return DemoSiteResponse(
                lead_id=lead.id,
                hero_title=f"A Nova Era para {lead.company}",
                hero_subtitle=f"Soluções em {lead.niche} para transformar o seu negócio em {lead.city}.",
                about_text=f"A {lead.company} é líder em seu segmento, oferecendo o melhor atendimento para você.",
                services=["Atendimento Especializado", "Consultoria Rápida", "Suporte Contínuo"],
                cta_text="Falar com Especialista"
            )

        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"""
            Você é um Copywriter e Web Designer criando os textos de uma Landing Page matadora para a empresa abaixo.
            A ideia é impressionar o dono da empresa com um site novo.

            DADOS DA EMPRESA:
            - Nome: {lead.company}
            - Nicho: {lead.niche}
            - Cidade: {lead.city}

            Retorne UM JSON EXATO contendo:
            "hero_title": Título principal da página. Curto e de impacto.
            "hero_subtitle": Subtítulo persuasivo.
            "about_text": 2 ou 3 frases sobre a missão/empresa.
            "services": Lista com 3 strings curtas de serviços que eles possivelmente oferecem.
            "cta_text": Texto do botão principal (ex: "Agende uma Consulta").

            NÃO use markdown, devolva apenas o JSON.
            """
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]

            data = json.loads(raw_text.strip())
            return DemoSiteResponse(
                lead_id=lead.id,
                hero_title=data.get("hero_title", f"Bem-vindo à {lead.company}"),
                hero_subtitle=data.get("hero_subtitle", "Sua melhor opção."),
                about_text=data.get("about_text", ""),
                services=data.get("services", ["Serviço 1", "Serviço 2", "Serviço 3"]),
                cta_text=data.get("cta_text", "Saiba Mais")
            )
        except Exception as e:
            print(f"Erro no DemoSite: {e}")
            return DemoSiteResponse(
                lead_id=lead.id,
                hero_title=f"Site Oficial: {lead.company}",
                hero_subtitle="O melhor serviço da região.",
                about_text="Conheça mais sobre nós.",
                services=["Serviço A", "Serviço B", "Serviço C"],
                cta_text="Contato"
            )
