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


class AIIndisponivel(RuntimeError):
    """Nenhum modelo respondeu. Vira 503 na API, nunca texto na tela."""


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


def generate_hedged(client, prompt: str, prazo: float, atraso: float = 4.0, max_tokens: Optional[int] = None) -> str:
    """Resposta mais rapida: se o primeiro modelo demora, o proximo ja comeca em paralelo.

    O Gemini as vezes leva 5 s e as vezes 80 s no mesmo pedido. Esperar o primeiro terminar
    (ou estourar o tempo) para so entao tentar o segundo soma as esperas; aqui a primeira
    resposta valida vence e as outras sao descartadas.
    """
    global _working_model
    from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait

    chain = list(MODEL_CHAIN)
    if _working_model in chain:
        chain.remove(_working_model)
        chain.insert(0, _working_model)

    executor = ThreadPoolExecutor(max_workers=len(chain))
    em_andamento: Dict[Any, str] = {}
    proximo = 0
    ultimo: Optional[Exception] = None
    transitorio = False

    def lancar() -> None:
        nonlocal proximo
        modelo = chain[proximo]
        proximo += 1
        limite_ms = int(max(3.0, min(prazo - time.monotonic(), REQUEST_TIMEOUT_MS / 1000)) * 1000)
        em_andamento[executor.submit(_tentar_modelo, client, modelo, prompt, limite_ms, max_tokens)] = modelo

    lancar()
    while True:
        restante = prazo - time.monotonic()
        if restante <= 0.5 or (not em_andamento and proximo >= len(chain)):
            break
        feitos, _ = wait(list(em_andamento), timeout=min(atraso, restante), return_when=FIRST_COMPLETED)
        for f in feitos:
            modelo = em_andamento.pop(f)
            try:
                texto = f.result()
            except Exception as exc:
                ultimo = exc
                transitorio = transitorio or _e_transitorio(exc)
                continue
            _working_model = modelo
            executor.shutdown(wait=False, cancel_futures=True)
            return texto
        # demorou, ou todos falharam: chama o proximo sem esperar os outros
        if proximo < len(chain) and (not feitos or not em_andamento):
            lancar()

    executor.shutdown(wait=False, cancel_futures=True)
    if transitorio or ultimo is None:
        raise AIIndisponivel(
            "O Gemini está com alta demanda no momento e demorou demais. Tente gerar de novo em alguns segundos."
        )
    raise AIIndisponivel(f"Nenhum modelo Gemini respondeu. Último erro: {ultimo}")


def generate_with_fallback(client, prompt: str, tentativas: int = 2, prazo: Optional[float] = None) -> str:
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

    def restante() -> float:
        return 1e9 if prazo is None else prazo - time.monotonic()

    for rodada in range(max(1, tentativas)):
        if rodada:
            if restante() < 8:
                break
            time.sleep(1.5 * rodada)   # espera curta e crescente

        chain = list(MODEL_CHAIN)
        if _working_model in chain:
            chain.remove(_working_model)
            chain.insert(0, _working_model)

        houve_transitorio = False
        for model in chain:
            if restante() < 4:
                ultimo = ultimo or TimeoutError("o tempo para escrever acabou")
                houve_transitorio = True
                break
            try:
                if prazo is None:
                    response = client.models.generate_content(model=model, contents=prompt)
                else:
                    # cada tentativa cabe no que sobrou do prazo: a funcao da
                    # Vercel morre aos 60 s e a tela ficaria girando sem resposta
                    limite_ms = int(max(3.0, min(restante(), REQUEST_TIMEOUT_MS / 1000)) * 1000)
                    response = client.models.generate_content(
                        model=model, contents=prompt,
                        config=types.GenerateContentConfig(http_options=types.HttpOptions(timeout=limite_ms)),
                    )
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
        raise AIIndisponivel(
            "O Gemini está com alta demanda no momento e recusou as tentativas. "
            "Aguarde alguns segundos e gere novamente."
        )
    raise AIIndisponivel(f"Nenhum modelo Gemini disponível. Último erro: {ultimo}")


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
