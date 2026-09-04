import json
import time
from typing import Optional

from google import genai
from google.genai import types

from app.config import settings
from app.copy_knowledge import bloco_de_mercado, lista_de_cliches, regras_do_canal
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


def _e_transitorio(erro: Exception) -> bool:
    """503 e 429 sao pico de demanda, nao defeito: vale tentar de novo.

    404 (modelo removido) e 401 nao adianta repetir.
    """
    texto = str(erro)
    return "503" in texto or "429" in texto or "UNAVAILABLE" in texto or "RESOURCE_EXHAUSTED" in texto


def generate_with_fallback(client, prompt: str, tentativas: int = 2) -> str:
    """Tenta os modelos em ordem ate um responder. Memoriza o que funcionou.

    Sem o cache, um cold start pagava ~36s tentando modelos mortos antes
    de chegar ao que responde.

    Quando TODOS respondem 503 — o Gemini tem picos de demanda em que isso
    acontece com a familia inteira — espera e repete a rodada, em vez de
    devolver erro na cara do usuario.
    """
    global _working_model

    ultimo: Optional[Exception] = None
    houve_transitorio = False

    for rodada in range(max(1, tentativas)):
        if rodada:
            time.sleep(1.5 * rodada)   # espera curta e crescente

        chain = list(MODEL_CHAIN)
        if _working_model in chain:
            chain.remove(_working_model)
            chain.insert(0, _working_model)

        houve_transitorio = False
        for model in chain:
            try:
                response = client.models.generate_content(model=model, contents=prompt)
                text = (response.text or "").strip()
                if text:
                    _working_model = model
                    return text
                ultimo = RuntimeError(f"{model} devolveu resposta vazia")
            except Exception as exc:
                ultimo = exc
                if _e_transitorio(exc):
                    houve_transitorio = True
                continue

        # Se nenhuma falha foi transitoria, repetir nao muda nada.
        if not houve_transitorio:
            break

    if houve_transitorio:
        raise RuntimeError(
            "O Gemini está com alta demanda no momento e recusou as tentativas. "
            "Aguarde alguns segundos e gere novamente."
        )
    raise RuntimeError(f"Nenhum modelo Gemini disponivel. Ultimo erro: {ultimo}")


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

            cliches = lista_de_cliches()
            missing = lead.missingDigitalAssets or []
            gaps = ("não possui " + ", nem ".join(missing)) if missing else "nenhuma lacuna óbvia"

            mercado = bloco_de_mercado(lead.niche, lead.role)
            canal = regras_do_canal(getattr(req, "channel", "") or "email")

            prompt = f"""Você escreve o primeiro contato de um prestador de serviço para um
negócio local. Não é marketing de massa: é uma mensagem por vez, para
alguém que não pediu para ser contatado. Ela precisa parecer escrita por
uma pessoa que olhou aquele negócio antes de escrever.

QUEM ESCREVE
- Vende: {user_product_info}
- Assina como: {sender}

PARA QUEM (dados verificados no Google Maps — pode citar, são reais)
- Negócio: {lead.name}
- Ramo: {lead.role}
- Cidade: {lead.city}
- Reputação: {reputation}
- O que ele tem hoje: {presence}
- O que falta: {gaps}

COMO ESSE MERCADO FUNCIONA
{mercado}

CANAL: {canal['tom']}
- Tamanho: {canal['limite']}
- Estrutura: {canal['estrutura']}

COMO ESCREVER

1. Abra com um fato específico daquele negócio — a nota, o número de
   avaliações, o bairro, o tempo de casa. Nunca com saudação genérica.
   O leitor precisa perceber em três segundos que não é disparo em massa.

2. Ligue esse fato à perda concreta descrita acima. Não diga "melhorar a
   presença digital": diga o que ele deixa de ganhar, na moeda do negócio
   dele.

3. Ofereça uma coisa só, e pequena. Uma conversa de cinco minutos, ou ver
   uma prévia pronta. Nunca peça reunião longa no primeiro contato.

4. Termine com UMA pergunta que se responde em uma palavra.

5. Tom: {tone}. {req.custom_instructions or "Sem instrução extra."}

PROIBIDO
- Estes clichês, em qualquer variação: {cliches}
- Inventar dado que não está acima (faturamento, número de clientes,
  nome do dono, concorrente)
- Elogio vazio: "adorei o trabalho de vocês", "vi que vocês são referência"
- Mais de uma pergunta
- Emoji, a menos que o canal seja WhatsApp ou Instagram — e no máximo um
- Prometer resultado numérico que você não pode garantir

TESTE ANTES DE RESPONDER
Se a mensagem servisse, trocando só o nome, para qualquer outro negócio
da mesma cidade, ela está genérica. Reescreva usando algo que só vale
para {lead.name}.

RETORNO
JSON puro, sem blocos markdown, com exatamente duas chaves:
"subject" (assunto curto e concreto; string vazia se o canal não for
e-mail) e "body" (o texto, com quebras de linha reais).
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
