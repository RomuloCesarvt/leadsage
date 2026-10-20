"""O portão da IA gratuita: quem pode ser chamado agora, sem desperdiçar chamada e sem derrubar o lote.

O problema: os planos gratuitos têm limites pequenos (o Groq libera 8.000 tokens por minuto por modelo; o Gemini, poucas chamadas
por minuto e por dia). Uma abordagem de WhatsApp gasta uns 2.800 tokens, então o Groq aguenta só duas por minuto em cada modelo.
Quando várias pessoas geram lotes ao mesmo tempo, o sistema antigo disparava cada pedido contra TODOS os modelos em cascata:
em 25 minutos foram mais de 1.000 chamadas recusadas (429) e quase nenhuma resposta, e o usuário via "IA com alta demanda".

Agora cada pedido passa por aqui:
  1. cada alvo (um modelo de um provedor) tem o seu orçamento de tokens por minuto e a sua pausa depois de uma recusa;
  2. o pedido vai para o primeiro alvo livre e que comporta o tamanho dele; se nenhum está livre, ESPERA o primeiro liberar
     (ou, se a espera passa do prazo, falha NA HORA dizendo em quantos segundos tentar de novo: nada de cascata de recusas);
  3. o que cada resposta ensina vale para todos: o cabeçalho do provedor diz quantos tokens restam e quando volta; uma recusa
     traz o tempo de espera ("retry in 23s") e se o limite é diário;
  4. com banco SQL, o orçamento e as pausas são COMPARTILHADOS entre todas as instâncias do servidor (a Vercel abre várias).
"""
import asyncio
import contextvars
import os
import re
import time
from collections import deque
from typing import Any, Deque, Dict, List, Optional, Tuple

# Orçamento por minuto de cada tipo de alvo (abaixo do limite real, para sobrar margem). Provedores com cabeçalho de limite
# (Groq, Cerebras) corrigem estes valores sozinhos a cada resposta.
TPM_PADRAO = {"groq": 6500, "cerebras": 40000, "mistral": 30000, "openrouter": 15000, "gemini": 120000}
RPM_PADRAO = {"groq": 25, "cerebras": 20, "mistral": 20, "openrouter": 8, "gemini": 8}
PAUSA_APOS_RECUSA_S = 20.0
PAUSA_DIARIO_S = 1800.0

# Quem pede: "alta" (resposta do robô a quem escreveu: não pode esperar) usa o orçamento inteiro; "normal" (gerar lote de mensagens e sites)
# deixa uma reserva, para a conversa de um lead nunca ficar sem resposta porque alguém está gerando 15 mensagens.
PRIORIDADE: "contextvars.ContextVar[str]" = contextvars.ContextVar("prioridade_da_ia", default="normal")
RESERVA_PARA_CONVERSA = 0.30

LOOP: Optional[asyncio.AbstractEventLoop] = None   # o laço do servidor: as threads de IA usam para falar com o banco
_LOCK = None
_ESTADO: Dict[str, Dict[str, Any]] = {}
_AVISADO: Dict[str, float] = {}


def _env_int(nome: str) -> int:
    try:
        return int(os.getenv(nome) or 0)
    except ValueError:
        return 0


class Alvo:
    """Um modelo de um provedor. `chamar(limite_s)` faz o pedido e devolve o texto."""

    def __init__(self, chave: str, tipo: str, chamar, tpm: Optional[int] = None, rpm: Optional[int] = None):
        self.chave, self.tipo, self.chamar = chave, tipo, chamar
        # com a conta paga (ex.: créditos do Google AI Ultra) os limites sobem: IA_RPM_GEMINI=300 IA_TPM_GEMINI=2000000 (e igual para os outros tipos)
        self.tpm = tpm or _env_int(f"IA_TPM_{tipo.upper()}") or TPM_PADRAO.get(tipo, 20000)
        self.rpm = rpm or _env_int(f"IA_RPM_{tipo.upper()}") or RPM_PADRAO.get(tipo, 10)

    def __repr__(self) -> str:
        return f"Alvo({self.chave})"


def _estado(chave: str) -> Dict[str, Any]:
    e = _ESTADO.get(chave)
    if e is None:
        e = _ESTADO[chave] = {"livre_em": 0.0, "uso": deque(), "tpm": None, "quebrado_ate": 0.0}
    return e


def _podar(uso: Deque[Tuple[float, int]], agora: float) -> int:
    while uso and agora - uso[0][0] > 60.0:
        uso.popleft()
    return sum(t for _, t in uso)


def reiniciar() -> None:
    _ESTADO.clear()
    _AVISADO.clear()


# --------------------------------------------------------------------------------------------- decisão
def espera_do_alvo(alvo: Alvo, tokens: int, agora: Optional[float] = None) -> float:
    """Segundos até este alvo poder atender um pedido deste tamanho. 0 = pode agora; um número grande = nunca (não comporta)."""
    agora = agora if agora is not None else time.time()
    e = _estado(alvo.chave)
    tpm = e["tpm"] or alvo.tpm
    if tokens > tpm:
        return 1e9                      # pedido maior que o orçamento por minuto do modelo: nunca cabe aqui
    if e["quebrado_ate"] > agora:
        return e["quebrado_ate"] - agora
    espera = max(0.0, e["livre_em"] - agora)
    uso = e["uso"]
    usado = _podar(uso, agora)
    if PRIORIDADE.get() != "alta" and uso:
        tpm = int(tpm * (1 - RESERVA_PARA_CONVERSA))       # lote: só até 70% do orçamento; os 30% finais são das conversas
    if usado + tokens > tpm and uso:
        # espera o consumo mais antigo sair da janela de 60 s até caber
        soma, falta = usado, usado + tokens - tpm
        for t, n in uso:
            soma -= n
            falta -= n
            if falta <= 0:
                espera = max(espera, 60.0 - (agora - t))
                break
        else:
            espera = max(espera, 60.0)
    if len(uso) >= (alvo.rpm if PRIORIDADE.get() == "alta" else max(1, int(alvo.rpm * (1 - RESERVA_PARA_CONVERSA)))):
        espera = max(espera, 60.0 - (agora - uso[0][0]))
    return espera


def carga_do_alvo(alvo: Alvo, agora: float) -> float:
    """Quanto do orçamento por minuto deste alvo já está usado (0 a 1): o que vale é o mais apertado entre tokens e pedidos."""
    e = _estado(alvo.chave)
    uso = e["uso"]
    usado = _podar(uso, agora)
    return max(usado / max(1, e["tpm"] or alvo.tpm), len(uso) / max(1, alvo.rpm))


def escolher(alvos: List[Alvo], tokens: int) -> Tuple[Optional[Alvo], float]:
    """O alvo livre MENOS CARREGADO (e já reserva os tokens dele), ou (None, segundos até o primeiro liberar).

    Antes valia o primeiro livre da lista: o primeiro provedor ficava com tudo e o outro só entrava quando o primeiro enchia.
    Agora os pedidos se espalham entre todos os motores gratuitos (Groq e Gemini juntos); no empate, vale a ordem da lista."""
    agora = time.time()
    _sincronizar(alvos, agora)
    melhor = 1e9
    livres = []
    for i, a in enumerate(alvos):
        w = espera_do_alvo(a, tokens, agora)
        if w <= 0:
            livres.append((round(carga_do_alvo(a, agora), 2), i, a))
        else:
            melhor = min(melhor, w)
    if livres:
        livres.sort(key=lambda x: (x[0], x[1]))
        a = livres[0][2]
        _estado(a.chave)["uso"].append((agora, tokens))
        _publicar(a, tokens, agora)
        return a, 0.0
    return None, melhor


# --------------------------------------------------------------------------------------------- o que cada resposta ensina
def sucesso(alvo: Alvo, tokens_reais: Optional[int] = None) -> None:
    e = _estado(alvo.chave)
    if tokens_reais is not None and e["uso"]:
        t, _ = e["uso"][-1]
        e["uso"][-1] = (t, max(1, tokens_reais))


def aprender_cabecalhos(alvo: Alvo, restantes_tokens: Optional[int], reinicia_em_s: Optional[float], limite_tokens: Optional[int]) -> None:
    """Groq e Cerebras dizem quantos tokens restam e quando voltam: vale mais que o nosso palpite."""
    e = _estado(alvo.chave)
    if limite_tokens and limite_tokens > 0:
        e["tpm"] = int(limite_tokens * 0.85)
    if restantes_tokens is not None and restantes_tokens < 1500 and reinicia_em_s is not None:
        e["livre_em"] = max(e["livre_em"], time.time() + min(90.0, reinicia_em_s) + 0.3)


_ATRASO = re.compile(r"retry(?:Delay)?\D{0,12}?(\d+(?:\.\d+)?)\s*(ms|s)\b", re.I)


def atraso_do_erro(texto: str, cabecalho_retry_after: Optional[str] = None) -> Tuple[float, bool]:
    """(segundos de espera, é limite diário?) a partir do que o provedor devolveu numa recusa."""
    diario = bool(re.search(r"PerDay|per day|daily|RequestsPerDay|requests per day", texto or "", re.I))
    if cabecalho_retry_after:
        try:
            return float(cabecalho_retry_after), diario
        except ValueError:
            pass
    m = _ATRASO.search(texto or "")
    if m:
        v = float(m.group(1))
        return (v / 1000.0 if m.group(2).lower() == "ms" else v), diario
    return PAUSA_APOS_RECUSA_S, diario


def recusa(alvo: Alvo, texto_do_erro: str, retry_after: Optional[str] = None) -> float:
    """429: o alvo descansa pelo tempo que o provedor mandou (ou 20 s; limite diário: 30 min). Vale para todas as instâncias."""
    grande = re.search(r"too large.*?limit\s+(\d+)", texto_do_erro or "", re.I | re.S)
    if grande:
        # "Request too large ... Limit 6000, Requested 6500": o modelo aguenta no máximo isso por pedido; aprende e não pausa o modelo
        _estado(alvo.chave)["tpm"] = int(int(grande.group(1)) * 0.85)
        print(f"IA: {alvo.chave} aguenta só {grande.group(1)} tokens por pedido; orçamento ajustado")
        return 0.0
    espera, diario = atraso_do_erro(texto_do_erro, retry_after)
    espera = PAUSA_DIARIO_S if diario else min(max(espera, 2.0), 120.0)
    agora = time.time()
    e = _estado(alvo.chave)
    e["livre_em"] = max(e["livre_em"], agora + espera)
    if agora - _AVISADO.get(alvo.chave, 0) > 60:
        _AVISADO[alvo.chave] = agora
        print(f"IA: {alvo.chave} recusou (429); pausa de {int(espera)} s{' (limite diario)' if diario else ''}: {texto_do_erro[:140]}")
    _publicar(alvo, 0, agora, livre_em=e["livre_em"])
    return espera


def quebrou(alvo: Alvo, motivo: str, por_s: float = 600.0) -> None:
    """Modelo que não existe mais (404), chave recusada (401/403): fora por alguns minutos."""
    _estado(alvo.chave)["quebrado_ate"] = time.time() + por_s
    print(f"IA: {alvo.chave} fora por {int(por_s)} s: {motivo[:120]}")
    _publicar(alvo, 0, time.time(), quebrado_ate=time.time() + por_s)


# --------------------------------------------------------------------------------------------- compartilhado entre instâncias
def _chave_banco(alvo_chave: str) -> str:
    return f"iagate:{alvo_chave}"


async def _ler_linhas(chaves: List[str]) -> Dict[str, Dict[str, Any]]:
    from sqlalchemy import select

    from app.database import AsyncSessionLocal, DBRobo

    async with AsyncSessionLocal() as s:
        linhas = (await s.execute(select(DBRobo).where(DBRobo.chave.in_([_chave_banco(c) for c in chaves])))).scalars().all()
        return {l.chave[len("iagate:"):]: dict(l.data or {}) for l in linhas}


async def _gravar_linha(chave: str, dados: Dict[str, Any]) -> None:
    from sqlalchemy import select

    from app.database import AsyncSessionLocal, DBRobo

    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave_banco(chave)))).scalar_one_or_none()
        if row:
            row.data = dados
            row.atualizado = str(int(time.time()))
        else:
            s.add(DBRobo(chave=_chave_banco(chave), uid="_global", tipo="ia_gate", data=dados, atualizado=str(int(time.time()))))
        await s.commit()


def _no_laco(coro, timeout: float = 2.5):
    """Roda uma corrotina no laço do servidor a partir da thread da IA. Sem laço (testes, scripts): não faz nada."""
    if LOOP is None or LOOP.is_closed():
        coro.close()
        return None
    try:
        if asyncio.get_running_loop() is LOOP:
            coro.close()      # chamado direto de dentro do laço (código síncrono em função async): esperar aqui travaria o servidor
            return None
    except RuntimeError:
        pass
    try:
        return asyncio.run_coroutine_threadsafe(coro, LOOP).result(timeout=timeout)
    except Exception:
        return None


_ULTIMA_LEITURA: Dict[str, float] = {}


def _sincronizar(alvos: List[Alvo], agora: float) -> None:
    """Traz do banco as pausas e o consumo dos outros servidores (no máximo a cada 3 s por alvo)."""
    precisam = [a.chave for a in alvos if agora - _ULTIMA_LEITURA.get(a.chave, 0) > 3.0]
    if not precisam or LOOP is None:
        return
    for c in precisam:
        _ULTIMA_LEITURA[c] = agora
    linhas = _no_laco(_ler_linhas(precisam)) or {}
    for chave, d in linhas.items():
        e = _estado(chave)
        e["livre_em"] = max(e["livre_em"], float(d.get("livre_em") or 0))
        e["quebrado_ate"] = max(e["quebrado_ate"], float(d.get("quebrado_ate") or 0))
        if d.get("tpm"):
            e["tpm"] = int(d["tpm"])
        # o consumo dos outros servidores: entra como uso agregado (um item por janela de 10 s)
        outros = [(float(t), int(n)) for t, n in (d.get("uso") or []) if agora - float(t) <= 60]
        meu = {(round(t, 3)) for t, _ in e["uso"]}
        for t, n in outros:
            if round(t, 3) not in meu:
                e["uso"].append((t, n))
        e["uso"] = deque(sorted(e["uso"]))


def _publicar(alvo: Alvo, tokens: int, agora: float, **extra: Any) -> None:
    """Grava o consumo e as pausas deste alvo para os outros servidores (melhor esforço, sem bloquear a resposta)."""
    if LOOP is None:
        return
    e = _estado(alvo.chave)
    dados = {
        "livre_em": e["livre_em"], "quebrado_ate": e["quebrado_ate"], "tpm": e["tpm"],
        "uso": [[round(t, 3), n] for t, n in e["uso"] if agora - t <= 60][-40:],
    }
    dados.update(extra)

    async def gravar():
        try:
            await _gravar_linha(alvo.chave, dados)
        except Exception as exc:
            print(f"IA: não compartilhou o estado de {alvo.chave}: {type(exc).__name__}")

    try:
        if asyncio.get_running_loop() is LOOP:
            asyncio.ensure_future(gravar())
        else:
            asyncio.run_coroutine_threadsafe(gravar(), LOOP)
    except RuntimeError:
        try:
            asyncio.run_coroutine_threadsafe(gravar(), LOOP)
        except Exception:
            pass
