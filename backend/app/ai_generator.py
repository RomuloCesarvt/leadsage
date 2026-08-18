import json
import google.generativeai as genai
from app.config import settings
from app.models import LeadItem, PitchGenerationRequest, PitchGenerationResponse

class AIGenerator:
    @staticmethod
    async def generate_pitch(req: PitchGenerationRequest, api_key: str = None) -> PitchGenerationResponse:
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

        active_key = api_key or settings.GEMINI_API_KEY

        # Fallback caso a chave do Gemini não esteja presente
        if not active_key:
            first_name = placeholders["primeiro_nome"]
            subject = f"Oportunidade para a {lead.company} em {lead.city}"
            body = (
                f"Olá {first_name}, notei que atua como {lead.role}.\n\n"
                "Para configurar a IA real, insira sua chave Gemini nas Configurações -> Integrações.\n\n"
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
            genai.configure(api_key=active_key)
            model = genai.GenerativeModel('gemini-3.6-flash')
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
    async def generate_demo_site(req, api_key: str = None) -> dict:
        from app.models import DemoSiteResponse
        lead = getattr(req, 'lead', req)
        
        active_key = api_key or settings.GEMINI_API_KEY

        if not active_key:
            return DemoSiteResponse(
                lead_id=lead.id,
                preview_url="https://leadsage.app/preview/mock",
                html_content="<h1>Configure sua chave do Gemini em Configurações para gerar sites reais.</h1>",
                generation_time=0.5
            )

        try:
            genai.configure(api_key=active_key)
            model = genai.GenerativeModel('gemini-3.6-flash')
            
            # Simple prompt to generate a landing page structure
            prompt = f"""
Gere o código HTML completo de uma landing page profissional e responsiva (usando TailwindCSS via CDN) para a seguinte empresa:
- Empresa: {lead.company}
- Nicho: {lead.niche}
- Localização: {lead.city}
- Contato: {lead.phone}

A página deve ter:
1. Header com o nome da empresa e um CTA "Agendar Consulta/Contato"
2. Hero section impactante com um título persuasivo
3. Seção de Serviços/Benefícios com 3 itens
4. Seção "Sobre Nós" curta
5. Footer simples

Use classes do TailwindCSS.
O output DEVE ser apenas o código HTML, sem blocos markdown. Comece com <!DOCTYPE html> e termine com </html>.
"""
            response = model.generate_content(prompt)
            html_content = response.text.strip()
            if html_content.startswith("```html"):
                html_content = html_content[7:]
            if html_content.startswith("```"):
                html_content = html_content[3:]
            if html_content.endswith("```"):
                html_content = html_content[:-3]
                
            return DemoSiteResponse(
                lead_id=lead.id,
                preview_url=f"https://leadsage.app/preview/{lead.id}",
                html_content=html_content.strip(),
                generation_time=2.5
            )
        except Exception as e:
            print(f"Erro ao gerar site: {e}")
            return DemoSiteResponse(
                lead_id=lead.id,
                preview_url="https://leadsage.app/preview/error",
                html_content=f"<h1>Erro ao gerar site.</h1><p>{str(e)}</p>",
                generation_time=0.1
            )
