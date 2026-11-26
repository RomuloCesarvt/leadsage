"""Base de conhecimento do robô (RAG).

O dono sobe textos (catálogo, perguntas frequentes, políticas, procedimentos...). Cada texto é cortado em trechos e cada trecho ganha um
"embedding" (vetor que representa o sentido). Quando um lead pergunta algo, o robô busca os poucos trechos mais parecidos com a
pergunta e os coloca no prompt, em vez de mandar o cadastro inteiro.

Onde fica: na tabela `robo` (tipo "conhecimento"), uma linha por trecho, separada por espaço (agência = uid, empresa = uid~empresa).
A tabela `robo` é a que já funciona em todos os bancos (principal e reservas), então não depende de extensão `pgvector`. Cada conta tem
algumas centenas de trechos no máximo, e a similaridade (cosseno) sobre isso, em memória, é instantânea.

Sem chave de embeddings ou com a cota esgotada, a busca cai para palavras-chave (sem acento), então o recurso nunca fica fora do ar.
"""
import asyncio
import math
import os
import re
import unicodedata
import uuid
from typing import Any, Dict, List, Optional

import httpx

from app import robo_store

TIPO = "conhecimento"
MODELO_EMBEDDING = "gemini-embedding-001"
DIMENSOES = 256                  # vetores curtos: a linha no banco fica pequena e a busca rápida, com qualidade quase igual
TRECHO_CARACTERES = 700
SOBREPOSICAO = 120
MAX_TEXTO = 30_000               # por documento
MAX_TRECHOS_POR_ESPACO = 300
MAX_DOCUMENTOS = 40
LIMIAR_VETORIAL = 0.55           # abaixo disso o trecho não tem a ver com a pergunta
LIMIAR_PALAVRAS = 0.18


# ---------------------------------------------------------------- texto

def _sem_acento(t: str) -> str:
    return unicodedata.normalize("NFD", t or "").encode("ascii", "ignore").decode().lower()


_PARADAS = frozenset(
    "a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sobre e ou que se ao aos mais muito ja tem ter ser "
    "voce voces vcs vc eu nos nao sim mas como qual quais quando onde quanto isso isto esse essa este esta ate foi sao esta estao".split())


def _palavras(t: str) -> List[str]:
    return [p for p in re.findall(r"[a-z0-9]{3,}", _sem_acento(t)) if p not in _PARADAS]


def dividir(texto: str, tamanho: int = TRECHO_CARACTERES, sobreposicao: int = SOBREPOSICAO) -> List[str]:
    """Corta em trechos de ~`tamanho` caracteres, preferindo quebrar em parágrafo ou fim de frase, com um pedaço repetido entre trechos
    (o assunto não é cortado ao meio)."""
    limpo = re.sub(r"[ \t]+", " ", (texto or "").replace("\r", "")).strip()
    limpo = re.sub(r"\n{3,}", "\n\n", limpo)
    if not limpo:
        return []
    if len(limpo) <= tamanho:
        return [limpo]
    saida: List[str] = []
    ini = 0
    while ini < len(limpo):
        fim = min(ini + tamanho, len(limpo))
        if fim < len(limpo):
            janela = limpo[ini:fim]
            corte = max(janela.rfind("\n\n"), janela.rfind(". "), janela.rfind("? "), janela.rfind("! "), janela.rfind("\n"))
            if corte > tamanho * 0.5:
                fim = ini + corte + 1
        trecho = limpo[ini:fim].strip()
        if trecho:
            saida.append(trecho)
        if fim >= len(limpo):
            break
        ini = max(fim - sobreposicao, ini + 1)
    return saida


# ----------------------------------------------------------- embeddings

def _chaves_gemini() -> List[str]:
    chaves = [(os.getenv("GEMINI_API_KEY") or "").strip()]
    for n in range(2, 8):
        chaves.append((os.getenv(f"GEMINI_API_KEY_{n}") or "").strip())
    return [c for c in chaves if c]


async def _embeddings(textos: List[str], tarefa: str) -> Optional[List[List[float]]]:
    """Um vetor por texto, ou None se nenhuma conta do Gemini respondeu (a busca cai para palavras-chave)."""
    if not textos:
        return []
    corpo = {"requests": [
        {"model": f"models/{MODELO_EMBEDDING}", "content": {"parts": [{"text": t[:2000]}]},
         "taskType": tarefa, "outputDimensionality": DIMENSOES} for t in textos]}
    for chave in _chaves_gemini():
        try:
            async with httpx.AsyncClient(timeout=20.0) as c:
                r = await c.post(f"https://generativelanguage.googleapis.com/v1beta/models/{MODELO_EMBEDDING}:batchEmbedContents",
                                 params={"key": chave}, json=corpo)
            if r.status_code != 200:
                continue                                  # cota ou erro desta conta: tenta a próxima
            vetores = [e.get("values") or [] for e in (r.json().get("embeddings") or [])]
            if len(vetores) == len(textos) and all(len(v) == DIMENSOES for v in vetores):
                return [_normalizar(v) for v in vetores]
        except Exception as exc:
            print(f"Conhecimento: embeddings falharam ({type(exc).__name__})")
    return None


def _normalizar(v: List[float]) -> List[float]:
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [round(x / n, 5) for x in v]


def _cosseno(a: List[float], b: List[float]) -> float:
    return sum(x * y for x, y in zip(a, b))        # os dois já vêm normalizados


# -------------------------------------------------------------- guardar

def _chave(espaco: str, doc_id: str, n: int) -> str:
    return f"{TIPO}:{espaco}:{doc_id}:{n:04d}"


async def _trechos_do_espaco(espaco: str) -> List[Dict[str, Any]]:
    try:
        return await robo_store._sql_listar(espaco, TIPO)
    except Exception as exc:
        print(f"Conhecimento: não consegui ler a base de {espaco}: {exc}")
        return []


async def listar(espaco: str) -> Dict[str, Any]:
    """Os documentos (sem os vetores) e quanto da cota de espaço já foi usada."""
    docs: Dict[str, Dict[str, Any]] = {}
    total = 0
    for t in await _trechos_do_espaco(espaco):
        total += 1
        d = docs.setdefault(t["doc_id"], {"id": t["doc_id"], "titulo": t.get("titulo", ""), "trechos": 0,
                                           "caracteres": 0, "criado": t.get("criado", ""), "vetorial": True})
        d["trechos"] += 1
        d["caracteres"] += len(t.get("texto", ""))
        d["vetorial"] = d["vetorial"] and bool(t.get("emb"))
    itens = sorted(docs.values(), key=lambda d: d["criado"], reverse=True)
    return {"documentos": itens, "trechos": total, "limite_trechos": MAX_TRECHOS_POR_ESPACO, "limite_documentos": MAX_DOCUMENTOS}


class LimiteExcedido(ValueError):
    pass


async def adicionar(espaco: str, titulo: str, texto: str) -> Dict[str, Any]:
    texto = (texto or "").strip()
    titulo = (titulo or "").strip()[:120] or "Sem título"
    if len(texto) < 20:
        raise LimiteExcedido("Escreva um pouco mais: o texto está muito curto para servir de consulta.")
    if len(texto) > MAX_TEXTO:
        raise LimiteExcedido(f"O texto passa de {MAX_TEXTO:,} caracteres. Divida em mais de um documento.".replace(",", "."))
    estado = await listar(espaco)
    pedacos = dividir(texto)
    if len(estado["documentos"]) >= MAX_DOCUMENTOS:
        raise LimiteExcedido(f"Limite de {MAX_DOCUMENTOS} documentos. Apague algum para adicionar outro.")
    if estado["trechos"] + len(pedacos) > MAX_TRECHOS_POR_ESPACO:
        raise LimiteExcedido("A base de conhecimento está cheia. Apague documentos antigos para adicionar este.")
    vetores = await _embeddings([f"{titulo}\n{p}" for p in pedacos], "RETRIEVAL_DOCUMENT")
    doc_id = uuid.uuid4().hex[:12]
    criado = robo_store.agora()
    for n, p in enumerate(pedacos):
        await robo_store._sql_put(_chave(espaco, doc_id, n), espaco, TIPO, {
            "doc_id": doc_id, "titulo": titulo, "texto": p, "n": n, "criado": criado,
            "emb": vetores[n] if vetores else None,
        })
    return {"id": doc_id, "titulo": titulo, "trechos": len(pedacos), "vetorial": bool(vetores)}


async def apagar(espaco: str, doc_id: str) -> int:
    apagados = 0
    for t in await _trechos_do_espaco(espaco):
        if t.get("doc_id") == doc_id:
            await robo_store._sql_apagar(_chave(espaco, doc_id, int(t.get("n", 0))))
            apagados += 1
    return apagados


# --------------------------------------------------------------- buscar

def _pontuacao_palavras(consulta: List[str], trecho: Dict[str, Any]) -> float:
    if not consulta:
        return 0.0
    base = set(_palavras(f"{trecho.get('titulo', '')} {trecho.get('texto', '')}"))
    if not base:
        return 0.0
    achadas = sum(1 for p in set(consulta) if p in base or any(b.startswith(p[:5]) for b in base if len(p) >= 5))
    return achadas / len(set(consulta))


async def buscar(espaco: str, pergunta: str, k: int = 4) -> List[Dict[str, Any]]:
    """Os `k` trechos que mais respondem à pergunta, do mais ao menos parecido. Lista vazia se nada tem a ver."""
    trechos = await _trechos_do_espaco(espaco)
    if not trechos or not (pergunta or "").strip():
        return []
    palavras = _palavras(pergunta)
    vetor_pergunta: Optional[List[float]] = None
    if any(t.get("emb") for t in trechos):
        vs = await _embeddings([pergunta[:500]], "RETRIEVAL_QUERY")
        vetor_pergunta = vs[0] if vs else None
    achados = []
    for t in trechos:
        lexical = _pontuacao_palavras(palavras, t)
        if vetor_pergunta and t.get("emb"):
            sem = _cosseno(vetor_pergunta, t["emb"])
            nota = max(sem, 0.0) * 0.75 + lexical * 0.25
            if sem >= LIMIAR_VETORIAL or lexical >= 0.5:
                achados.append((nota, t))
        elif lexical >= LIMIAR_PALAVRAS:
            achados.append((lexical, t))
    achados.sort(key=lambda x: x[0], reverse=True)
    return [{"titulo": t.get("titulo", ""), "texto": t.get("texto", ""), "nota": round(n, 3)} for n, t in achados[:k]]


def bloco_do_prompt(achados: List[Dict[str, Any]]) -> str:
    """O trecho do prompt do robô com o que a empresa cadastrou sobre o assunto da pergunta."""
    if not achados:
        return ""
    linhas = [f"[{a['titulo']}] {a['texto']}" for a in achados]
    return ("== CONSULTA NA BASE DE CONHECIMENTO DA EMPRESA (fatos oficiais sobre o que o cliente perguntou) ==\n"
            + "\n---\n".join(linhas)
            + "\nResponda com base nestes fatos. Se a pergunta pedir algo que NÃO está aqui nem no cadastro, não invente: "
              "diga que vai confirmar com a equipe.\n")


async def consultar_para_o_robo(espaco: str, mensagens: List[Dict[str, Any]], prazo_s: float = 6.0) -> str:
    """O bloco do prompt para a última fala do lead (com a fala anterior, para perguntas curtas como "e o preço?"). Nunca levanta erro:
    o robô responde mesmo sem a base."""
    try:
        do_lead = [m.get("texto", "") for m in mensagens if m.get("de") == "contato" and m.get("texto")]
        if not do_lead:
            return ""
        pergunta = " ".join(do_lead[-2:])[-500:]
        achados = await asyncio.wait_for(buscar(espaco, pergunta), timeout=prazo_s)
        return bloco_do_prompt(achados)
    except Exception as exc:
        print(f"Conhecimento: consulta ignorada ({type(exc).__name__}: {exc})")
        return ""
