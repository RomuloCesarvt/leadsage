import json
from typing import Optional

from google import genai
from google.genai import types

from app.config import settings
from app.models import LeadItem, PitchGenerationRequest, PitchGenerationResponse

# gemini-2.0-flash foi descontinuado e responde 404 NOT_FOUND: era por isso
# que todo pitch voltava como texto de erro.
#
# Ordem medida em 2026-09-03 (2 tentativas cada):
#   gemini-flash-lite-latest  5.8s / 10.1s  OK
#   gemini-flash-latest       >20s          timeout (modelo de raciocinio)
#   gemini-3.6-flash          16.6s         503 UNAVAILABLE
# O rapido e confiavel vai primeiro; os outros ficam so como rede de
# seguranca para quando este sair do ar.
MODEL_CHAIN = (
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-3.6-flash",
)

REQUEST_TIMEOUT_MS = 25_000

_working_model: Optional[str] = None


def build_client(api_key: str) -> genai.Client:
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS),
    )


def generate_with_fallback(client, prompt: str) -> str:
    """Tenta os modelos em ordem ate um responder. Memoriza o que funcionou.

    Sem o cache, um cold start pagava ~36s tentando modelos mortos antes
    de chegar ao que responde.
    """
    global _working_model

    chain = list(MODEL_CHAIN)
    if _working_model in chain:
        chain.remove(_working_model)
        chain.insert(0, _working_model)

    last_error: Optional[Exception] = None
    for model in chain:
        try:
            response = client.models.generate_content(model=model, contents=prompt)
            text = (response.text or "").strip()
            if text:
                _working_model = model
                return text
            last_error = RuntimeError(f"{model} devolveu resposta vazia")
        except Exception as exc:
            last_error = exc
            continue

    raise RuntimeError(f"Nenhum modelo Gemini disponivel. Ultimo erro: {last_error}")


def strip_code_fence(text: str) -> str:
    """Remove blocos ```json / ```html que o modelo insiste em adicionar."""
    text = text.strip()
    if text.startswith("```"):
        first_newline = text.find(chr(10))
        text = text[first_newline + 1:] if first_newline != -1 else text.lstrip("`")
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

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
            client = build_client(active_key)
            user_product_info = req.user_product or "Software/Serviço genérico"

            # Sinais reais do Google Maps + enriquecimento. Sao eles que
            # separam um gancho verdadeiro de um texto generico.
            if lead.rating and lead.rating_count:
                reputation = f"nota {lead.rating:.1f} com {lead.rating_count} avaliações no Google"
            elif lead.rating_count:
                reputation = f"{lead.rating_count} avaliações no Google"
            else:
                reputation = "ainda sem avaliações relevantes no Google"

            channels = []
            if lead.website:
                channels.append(f"site próprio ({lead.website})")
            if lead.socials and lead.socials.instagram:
                channels.append("Instagram")
            if lead.socials and lead.socials.facebook:
                channels.append("Facebook")
            if lead.whatsapp:
                channels.append("WhatsApp")
            presence = ", ".join(channels) if channels else "apenas o perfil no Google Maps"

            missing = lead.missingDigitalAssets or []
            gaps = ("não possui " + ", nem ".join(missing)) if missing else "nenhuma lacuna óbvia"

            prompt = f"""
Você é um especialista em cold e-mail B2B de altíssima conversão e um copywriter brilhante.
Sua missão é escrever o primeiro contato para um Lead. 

DADOS DO SEU PRODUTO/OFERTA:
- O que você vende / Problema que resolve: {user_product_info}

DADOS DO LEAD (ALVO) — tudo verificado no Google Maps, pode citar:
- Nome: {lead.name}
- Tipo de negócio: {lead.role}
- Localização: {lead.city} ({lead.location})
- Nicho: {lead.niche}
- Reputação: {reputation}
- Presença digital hoje: {presence}
- Lacunas concretas: {gaps}
- Resumo: {lead.ai_summary}

DADOS DA MENSAGEM:
- Tom: {tone}
- Remetente: {sender}
- Instruções Extras: {req.custom_instructions or "Nenhuma. Foco em gerar uma reunião rápida de 5 minutos."}

INSTRUÇÕES ESTRATÉGICAS:
1. Comece com um 'hook' (gancho) hiper-personalizado focado no nicho da empresa ({lead.company}) ou no seu resumo.
2. Apresente de forma fluida como o seu produto/oferta ({user_product_info}) resolve uma dor latente desse mercado.
3. Não seja genérico, não pareça um panfleto. Seja um consultor de negócios trazendo uma oportunidade.
4. Finalize com um CTA (Call to Action) claro e de baixo atrito.

RETORNO ESPERADO:
Retorne um JSON exato com duas chaves: "subject" (o assunto do email, chamativo e curto) e "body" (o corpo do e-mail com quebras de linha). 
Não use blocos markdown (```json). Apenas as chaves em formato JSON puro.
"""
            raw_text = strip_code_fence(generate_with_fallback(client, prompt))
            data = json.loads(raw_text)
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
            client = build_client(active_key)
            
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
            html_content = strip_code_fence(generate_with_fallback(client, prompt))

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
