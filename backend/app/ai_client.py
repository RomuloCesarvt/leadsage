"""Acesso ao modelo: escolha, tempo, reparo de JSON e falha honesta.

Estava tudo dentro de `ai_generator`, junto com o prompt da abordagem.
Separar importa porque agora há três geradores (abordagem, site e
documento) e todos precisam da mesma disciplina:

- **um modelo que responde.** A família Gemini muda de nome e sai do ar
  sem aviso; a cadeia tenta em ordem e memoriza o que funcionou;
- **JSON que realmente é JSON.** Modelo rápido devolve bloco markdown,
  vírgula sobrando, aspas curvas e texto antes do objeto. Em vez de
  estourar no `json.loads`, o texto passa por um reparo e, se ainda
  assim não abrir, o modelo é chamado de novo dizendo o que veio errado;
- **falhar em voz alta.** O código antigo devolvia a exceção dentro do
  corpo da mensagem: o usuário recebia "Houve um erro ao processar com a
  IA: 404" no campo de texto e podia disparar isso para o prospect.
  Aqui um erro é um erro, e sobe.
"""
import contextvars
import json
import re
import time
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

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
    # Medido em out/2026, mesmo pedido de abordagem: 3.5-flash (sem "pensar") responde em ~2 s;
    # os "lite" ficaram instaveis (503) e levavam de 10 a 28 s. Os demais so entram se este
    # recusar (429 de limite por minuto, 503).
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.6-flash",
)

# Uma abordagem de WhatsApp sao 60 palavras; um contrato sao 1.500 e
# precisa de raciocinio. Cobrar o mesmo prazo dos dois entrega documento
# cortado no meio. O limite da funcao na Vercel e 60s (vercel.json), e
# estas janelas cabem dentro dele.
REQUEST_TIMEOUT_MS = 25_000          # abordagem: o usuario esta esperando na tela
TIMEOUT_LONGO_MS = 45_000            # site e documento: vale esperar

_working_model: Optional[str] = None


# Quanto tempo (s) um pedido de IA pode esperar por vaga nos motores gratuitos. O padrão cabe em uma requisição de 60 s; quem prepara
# VÁRIOS textos na mesma requisição (a fila de disparos) reduz, para todos caberem antes do limite da função.
PRAZO_DA_IA_S: "contextvars.ContextVar[float]" = contextvars.ContextVar("prazo_da_ia_s", default=40.0)


def prazo_maximo() -> float:
    return PRAZO_DA_IA_S.get()


class AIIndisponivel(RuntimeError):
    """Nenhum modelo respondeu. Vira 503 na API, nunca texto na tela. `espera_s`: em quantos segundos vale tentar de novo."""

    def __init__(self, mensagem: str = "", espera_s: int = 0):
        super().__init__(mensagem)
        self.espera_s = espera_s


def build_client(api_key: str, timeout_ms: int = REQUEST_TIMEOUT_MS) -> genai.Client:
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=timeout_ms),
    )


def _e_transitorio(erro: Exception) -> bool:
    """503 e 429 sao pico de demanda, nao defeito: vale tentar de novo.

    404 (modelo removido) e 401 nao adianta repetir.
    """
    texto = str(erro)
    return "503" in texto or "429" in texto or "UNAVAILABLE" in texto or "RESOURCE_EXHAUSTED" in texto


def _config(limite_ms: int, max_tokens: Optional[int], com_thinking: bool) -> "types.GenerateContentConfig":
    kw: Dict[str, Any] = {"http_options": types.HttpOptions(timeout=limite_ms)}
    if max_tokens:
        kw["max_output_tokens"] = max_tokens
    if not com_thinking:
        # texto curto nao precisa "pensar": desligar corta segundos nos modelos que raciocinam
        kw["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
    return types.GenerateContentConfig(**kw)


_SEM_THINKING_NAO_SUPORTADO: set = set()

def _tentar_modelo(client, model: str, prompt: str, limite_ms: int, max_tokens: Optional[int]) -> str:
    quer_sem_pensar = "lite" not in model and model not in _SEM_THINKING_NAO_SUPORTADO
    try:
        r = client.models.generate_content(model=model, contents=prompt, config=_config(limite_ms, max_tokens, not quer_sem_pensar))
    except Exception as exc:
        if quer_sem_pensar and ("thinking" in str(exc).lower() or "INVALID_ARGUMENT" in str(exc)):
            _SEM_THINKING_NAO_SUPORTADO.add(model)
            r = client.models.generate_content(model=model, contents=prompt, config=_config(limite_ms, max_tokens, True))
        else:
            raise
    texto = (r.text or "").strip()
    if not texto:
        raise RuntimeError(f"{model} devolveu resposta vazia")
    return texto


def _tokens_do_pedido(prompt: str, max_tokens: Optional[int]) -> int:
    """Quanto o pedido pesa no limite por minuto: entrada (~3 caracteres por token em português) mais a saída pedida."""
    return int(len(prompt) / 3) + int(max_tokens or 1500)


def _alvos(client, prompt: str, max_tokens: Optional[int], json_mode: bool) -> list:
    """Todos os modelos que podem responder, do mais rápido ao mais lento: cada modelo de cada provedor gratuito com chave
    (respondem em ~1 s), depois os do Gemini. Cada um com o seu orçamento no portão (ia_gate)."""
    from app import ai_providers, ia_gate

    alvos = []
    for prov in ai_providers.ativos():
        for modelo in ai_providers.modelos_alvo(prov):
            chave = f"{prov['nome']}:{modelo}"
            alvo = ia_gate.Alvo(chave, prov["nome"], None)

            def chamar(limite_s, prov=prov, modelo=modelo, alvo=alvo):
                def aprender(h, status):
                    def num(nome):
                        try:
                            return float(str(h.get(nome)).rstrip("s")) if h.get(nome) is not None else None
                        except ValueError:
                            return None
                    def segundos(nome):
                        v = h.get(nome)
                        if v is None:
                            return None
                        m = re.fullmatch(r"(?:(\d+)m)?(?:(\d+(?:\.\d+)?)(ms|s))?", str(v).strip())
                        if not m or not any(m.groups()):
                            return None
                        total = int(m.group(1) or 0) * 60
                        if m.group(2):
                            total += float(m.group(2)) / (1000 if m.group(3) == "ms" else 1)
                        return total
                    ia_gate.aprender_cabecalhos(alvo, num("x-ratelimit-remaining-tokens"), segundos("x-ratelimit-reset-tokens"), num("x-ratelimit-limit-tokens"))
                return ai_providers.chamar(prov, prompt, limite_s, max_tokens, json_mode, modelo=modelo, ao_responder=aprender)

            alvo.chamar = chamar
            alvos.append(alvo)
    for modelo in MODEL_CHAIN:
        alvos.append(ia_gate.Alvo(
            f"gemini:{modelo}", "gemini",
            lambda limite_s, modelo=modelo: _tentar_modelo(client, modelo, prompt, int(max(3.0, limite_s) * 1000), max_tokens),
        ))
    return alvos


def _status_http(exc: Exception) -> int:
    """O código HTTP do erro, qualquer que seja a biblioteca: `status_code`/`code` (número) ou `status` quando for número.
    (O Gemini devolve `status` como TEXTO, "RESOURCE_EXHAUSTED": converter isso direto em número derrubou todos os disparos.)"""
    for atributo in ("status_code", "code", "status"):
        v = getattr(exc, atributo, None)
        if isinstance(v, bool):
            continue
        if isinstance(v, int):
            return v
        if isinstance(v, str) and v.strip().isdigit():
            return int(v)
    return 0


def _falha_do_alvo(alvo, exc: Exception) -> None:
    """Ensina ao portão o que a falha significa. Nunca levanta erro: um defeito aqui não pode derrubar quem pediu o texto."""
    try:
        _ensinar_falha(alvo, exc)
    except Exception as erro:
        print(f"IA: não classificou a falha de {getattr(alvo, 'chave', '?')}: {type(erro).__name__}: {erro}")


def _ensinar_falha(alvo, exc: Exception) -> None:
    """Pausa (429/503) ou fora do ar por um tempo (404, chave recusada)."""
    from app import ia_gate

    texto = str(exc)
    status = _status_http(exc)
    if status in (401, 403, 404) or " 404 " in texto or "NOT_FOUND" in texto or "PERMISSION_DENIED" in texto or "API key not valid" in texto:
        ia_gate.quebrou(alvo, texto)
    elif status == 429 or "429" in texto or "RESOURCE_EXHAUSTED" in texto:
        ia_gate.recusa(alvo, texto, getattr(exc, "retry_after", None))
    elif status == 503 or "503" in texto or "UNAVAILABLE" in texto or "overloaded" in texto.lower():
        ia_gate.recusa(alvo, "retry in 8s " + texto, None)
    elif status >= 500 or "timeout" in texto.lower() or "timed out" in texto.lower():
        ia_gate.recusa(alvo, "retry in 5s " + texto, None)


def generate_hedged(client, prompt: str, prazo: float, atraso: float = 7.0, max_tokens: Optional[int] = None,
                    json_mode: bool = True) -> str:
    """Escreve o texto no primeiro motor gratuito que está livre (portão da IA: ia_gate).

    Um pedido por vez em cada modelo, sem rajada: o motor livre mais rápido atende; se nenhum está livre, espera o primeiro
    liberar (o tempo vem do próprio provedor); se a espera passa do prazo, falha na hora dizendo em quanto tempo tentar de novo.
    Antes cada pedido disparava contra todos os modelos de uma vez e o limite gratuito acabava para todo mundo.
    """
    global _working_model
    from app import ia_gate

    try:
        alvos = _alvos(client, prompt, max_tokens, json_mode)
    except Exception as exc:
        raise AIIndisponivel(f"Os motores de IA não puderam ser preparados agora ({type(exc).__name__}). Tente de novo em instantes.", espera_s=10) from exc
    tokens = _tokens_do_pedido(prompt, max_tokens)
    ultimo: Optional[Exception] = None
    for _ in range(12):
        restante = prazo - time.monotonic()
        try:
            alvo, espera = ia_gate.escolher(alvos, tokens)
        except Exception as exc:                       # o portão nunca pode ser o motivo de ninguém ficar sem texto
            print(f"IA: portão falhou ({type(exc).__name__}: {exc}); escolhendo sem ele")
            alvo, espera = (alvos[0], 0.0) if alvos else (None, 0.0)
        if alvo is None:
            if espera >= 1e8:
                raise AIIndisponivel("Este pedido é grande demais para os motores gratuitos disponíveis agora.")
            if espera > restante - 5:
                raise AIIndisponivel(
                    f"A fila da IA gratuita está cheia agora (muita gente gerando ao mesmo tempo). Tente de novo em {int(espera) + 1} segundos.",
                    espera_s=int(espera) + 1,
                )
            time.sleep(min(espera + 0.2, max(0.0, restante - 5)))
            continue
        limite_s = max(4.0, min(restante, REQUEST_TIMEOUT_MS / 1000))
        try:
            texto = alvo.chamar(limite_s)
            ia_gate.sucesso(alvo)
            _working_model = alvo.chave
            return texto
        except Exception as exc:
            ultimo = exc
            _falha_do_alvo(alvo, exc)
            if prazo - time.monotonic() < 2.5:
                break
    raise AIIndisponivel(
        "A IA gratuita está com alta demanda neste momento. Tente de novo em alguns segundos."
        if ultimo is None or _e_transitorio(ultimo) else f"Nenhum motor de IA respondeu. Último erro: {str(ultimo)[:160]}",
        espera_s=15,
    )


def generate_with_fallback(client, prompt: str, tentativas: int = 2, prazo: Optional[float] = None) -> str:
    """Texto longo (documentos, páginas): mesmo portão, sem modo JSON. `prazo` None = 45 s."""
    return generate_hedged(client, prompt, prazo if prazo is not None else time.monotonic() + 45, max_tokens=4000, json_mode=False)


def strip_code_fence(text: str) -> str:
    """Remove blocos ```json / ```html que o modelo insiste em adicionar."""
    text = text.strip()
    if text.startswith("```"):
        first_newline = text.find(chr(10))
        text = text[first_newline + 1:] if first_newline != -1 else text.lstrip("`")
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


# Aspas tipográficas que o modelo usa dentro do JSON e quebram o parser.
ASPAS_CURVAS = {
    "“": '"', "”": '"', "„": '"',
    "‘": "'", "’": "'",
}


def _recortar_objeto(texto: str) -> str:
    """Fica com o trecho entre a primeira { e a última } que fecham.

    Modelo rápido gosta de explicar antes ("Aqui está o JSON:") e de
    comentar depois. O objeto está no meio.
    """
    inicio = texto.find("{")
    fim = texto.rfind("}")
    if inicio == -1 or fim == -1 or fim < inicio:
        return texto
    return texto[inicio:fim + 1]


def reparar_json(bruto: str) -> str:
    """Conserta os defeitos recorrentes antes de tentar abrir o JSON."""
    texto = strip_code_fence(bruto)
    texto = _recortar_objeto(texto)
    for curva, reta in ASPAS_CURVAS.items():
        texto = texto.replace(curva, reta)
    # vírgula sobrando antes de } ou ]
    texto = re.sub(r",\s*([}\]])", r"\1", texto)
    # quebras de linha literais dentro de string: o modelo escreve o
    # corpo da mensagem com Enter de verdade em vez de \n
    saida: List[str] = []
    dentro = False
    escapando = False
    for c in texto:
        if escapando:
            saida.append(c)
            escapando = False
            continue
        if c == "\\":
            saida.append(c)
            escapando = True
            continue
        if c == '"':
            dentro = not dentro
        if dentro and c == "\n":
            saida.append("\\n")
            continue
        if dentro and c == "\t":
            saida.append("\\t")
            continue
        saida.append(c)
    return "".join(saida)


def gerar_json(
    client,
    prompt: str,
    obrigatorias: Optional[List[str]] = None,
    tentativas: int = 2,
    prazo: Optional[float] = None,
    rapido: bool = False,
    max_tokens: Optional[int] = None,
) -> Dict[str, Any]:
    """Pede JSON ao modelo e devolve dicionário — ou levanta AIIndisponivel.

    Quando o texto não abre, a segunda tentativa não repete o mesmo
    pedido: manda de volta o que veio e diz qual foi o erro. Modelo
    conserta o próprio JSON com muito mais frequência do que acerta na
    repetição cega.
    """
    obrigatorias = obrigatorias or []
    pedido = prompt
    ultimo_erro = ""

    for tentativa in range(max(1, tentativas)):
        if rapido and prazo is not None:
            bruto = generate_hedged(client, pedido, prazo, max_tokens=max_tokens)
        else:
            bruto = generate_with_fallback(client, pedido, prazo=prazo)
        try:
            dados = json.loads(reparar_json(bruto))
            if not isinstance(dados, dict):
                raise ValueError("a resposta não é um objeto JSON")
            faltando = [c for c in obrigatorias if c not in dados]
            if faltando:
                raise ValueError(f"faltaram as chaves {', '.join(faltando)}")
            return dados
        except Exception as exc:
            ultimo_erro = str(exc)
            print(f"JSON da IA inválido (tentativa {tentativa + 1}): {ultimo_erro}")
            pedido = (
                f"{prompt}\n\n---\nVocê respondeu isto, e não foi aceito "
                f"({ultimo_erro}):\n{bruto[:2000]}\n\n"
                "Responda de novo APENAS o objeto JSON válido, sem texto antes ou depois, "
                "sem bloco markdown, com todas as chaves pedidas."
            )

    raise AIIndisponivel(
        "A IA respondeu em um formato que não deu para aproveitar "
        f"({ultimo_erro}). Tente gerar de novo."
    )


def contar_palavras(texto: str) -> int:
    return len([p for p in re.split(r"\s+", (texto or "").strip()) if p])
