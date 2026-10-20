"""Fila de envio: o robô prepara a abordagem de cada lead e entrega no canal certo.

Nem todo canal permite que um robô fale primeiro, e a fila existe para dizer
a verdade sobre isso em vez de fingir:

- **e-mail**: o robô envia de verdade (SMTP do próprio usuário), com limite
  diário e opção de sair no rodapé;
- **WhatsApp, Instagram e LinkedIn**: o robô escreve a mensagem, deixa o link
  pronto e a pessoa só aperta enviar. Nenhuma dessas três plataformas deixa um
  robô abrir conversa fria sem custo (WhatsApp) ou sem risco para a conta
  (Instagram e LinkedIn não têm API para isso).

Cada item da fila é uma mensagem pronta, com o canal, o texto e o link. Ao
marcar como enviado, o card do lead anda no pipeline para "Contato Enviado".
"""
import asyncio
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple
from urllib.parse import quote

from sqlalchemy import select

from app import pipeline_store
from app.database import AsyncSessionLocal, DBRobo
from app.firebase_config import db as firestore_db
from app import robo_store
from app.robo_store import agora
agora_iso = agora  # (o parametro `agora` de promover_seguimentos e um datetime)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")

LIMITE_EMAIL_DIA = 40
LOTE_MAXIMO = 8
STATUS = ("rascunho", "pendente", "enviado", "pulado", "aguardando_limite", "falhou")
# mensagens que ainda podem ser corrigidas antes de sair
EDITAVEIS = ("rascunho", "pendente", "aguardando_limite", "falhou")

RODAPE_SAIR = "\n\n—\nSe preferir não receber mais mensagens, é só responder SAIR."

ROTULO_CANAL = {
    "email": "E-mail",
    "whatsapp": "WhatsApp",
    "instagram_direct": "Instagram",
    "linkedin_msg": "LinkedIn",
}


# ------------------------------------------------------------------ canais

def _tem_telefone(lead: Dict[str, Any]) -> bool:
    return len(re.sub(r"\D", "", lead.get("phone") or "")) >= 10


def _instagram(lead: Dict[str, Any]) -> str:
    return (lead.get("instagram") or (lead.get("socials") or {}).get("instagram") or "").strip()


def _linkedin(lead: Dict[str, Any]) -> str:
    return ((lead.get("socials") or {}).get("linkedin") or "").strip()


def escolher_canal(lead: Dict[str, Any]) -> Optional[str]:
    """O melhor canal que este lead permite.

    E-mail primeiro: é o único que o robô envia sozinho e sem custo extra.
    Depois WhatsApp (o que mais responde no Brasil), Instagram e LinkedIn.
    """
    if EMAIL_RE.match((lead.get("email") or "").strip()):
        return "email"
    if _tem_telefone(lead):
        return "whatsapp"
    if _instagram(lead):
        return "instagram_direct"
    if _linkedin(lead):
        return "linkedin_msg"
    return None


def link_do_canal(canal: str, lead: Dict[str, Any], texto: str) -> str:
    """O link que abre a conversa já no lugar certo, ou vazio."""
    from app.dispatcher import link_instagram_dm, link_linkedin_dm

    if canal == "whatsapp":
        digitos = re.sub(r"\D", "", lead.get("phone") or "")
        return f"https://wa.me/{digitos}?text={quote(texto[:1500])}" if digitos else ""
    if canal == "instagram_direct":
        return link_instagram_dm(_instagram(lead))
    if canal == "linkedin_msg":
        return link_linkedin_dm(_linkedin(lead))[0]
    return ""


def com_rodape_de_saida(texto: str) -> str:
    return texto if "responder SAIR" in texto else texto.rstrip() + RODAPE_SAIR


# ------------------------------------------------------------ armazenamento

def _chave(uid: str, item_id: str) -> str:
    return f"fila:{uid}:{item_id}"


def _doc(uid: str, item_id: str):
    return firestore_db.collection("users").document(uid).collection("fila_envio").document(item_id)


async def _gravar(uid: str, item: Dict[str, Any]) -> None:
    item["atualizado"] = agora()
    if firestore_db is not None and not robo_store._sql_primeiro():
        try:
            _doc(uid, item["id"]).set(item)
            return
        except Exception as exc:
            print(f"Falha ao gravar a fila: {exc}")
    chave = _chave(uid, item["id"])
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == chave))).scalar_one_or_none()
        if row:
            row.data = item
            row.atualizado = item["atualizado"]
        else:
            s.add(DBRobo(chave=chave, uid=uid, tipo="fila", data=item, atualizado=item["atualizado"]))
        await s.commit()


async def obter(uid: str, item_id: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave(uid, item_id)))).scalar_one_or_none()
        no_sql = dict(row.data or {}) if row else None
    if no_sql and robo_store._sql_primeiro():
        return no_sql
    if firestore_db is not None:
        try:
            doc = _doc(uid, item_id).get()
            return doc.to_dict() if doc.exists else no_sql
        except Exception as exc:
            print(f"Falha ao ler a fila: {exc}")
    return no_sql


async def listar(uid: str) -> List[Dict[str, Any]]:
    itens: List[Dict[str, Any]] = []
    lido = False
    sql_principal = robo_store._sql_primeiro()
    if firestore_db is not None and (not sql_principal or not await robo_store._sql_get(f"sistema:fila_quente:{uid}")):
        try:
            itens = [d.to_dict() for d in firestore_db.collection("users").document(uid).collection("fila_envio").stream()]
            lido = True
            if sql_principal:
                # primeira vez com o SQL como principal: copia os itens antigos (uma leitura so) e nunca mais le o Firestore
                for i in itens:
                    if i.get("id"):
                        await robo_store._espelhar_sql(_chave(uid, i["id"]), uid, "fila", i)
                await robo_store._espelhar_sql(f"sistema:fila_quente:{uid}", uid, "sistema", {"em": agora()})
        except Exception as exc:
            print(f"Falha ao listar a fila: {exc}")
    if not lido or sql_principal:
        async with AsyncSessionLocal() as s:
            rows = (await s.execute(select(DBRobo).where(DBRobo.uid == uid, DBRobo.tipo == "fila"))).scalars().all()
            itens = [dict(r.data or {}) for r in rows]
    itens.sort(key=lambda i: i.get("criado") or "", reverse=True)
    return itens


def _hoje_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def emails_enviados_hoje(itens: List[Dict[str, Any]]) -> int:
    hoje = _hoje_utc()
    return sum(1 for i in itens if i.get("canal") == "email" and i.get("status") == "enviado"
               and str(i.get("enviado_em") or "").startswith(hoje))


def resumo(itens: List[Dict[str, Any]]) -> Dict[str, Any]:
    enviados_hoje = emails_enviados_hoje(itens)
    return {
        "rascunhos": sum(1 for i in itens if i.get("status") == "rascunho"),
        "pendentes": sum(1 for i in itens if i.get("status") == "pendente"),
        "aguardando_limite": sum(1 for i in itens if i.get("status") == "aguardando_limite"),
        "enviados": sum(1 for i in itens if i.get("status") == "enviado"),
        "email_hoje": enviados_hoje,
        "limite_email_dia": LIMITE_EMAIL_DIA,
        "email_restante": max(0, LIMITE_EMAIL_DIA - enviados_hoje),
    }


# ----------------------------------------------------------------- preparo

Gerar = Callable[[Dict[str, Any], str], Awaitable[Dict[str, Any]]]
EnviarEmail = Callable[[Dict[str, Any], str, str], Awaitable[str]]
PodeEnviar = Callable[[], Awaitable[bool]]
Cobrar = Callable[[], Awaitable[None]]


def _chave_do_telefone(bruto: Any) -> str:
    """DDD + 8 ultimos digitos: o mesmo numero escrito com ou sem 55 e com ou sem o 9 na frente cai na mesma chave."""
    d = re.sub(r"\D", "", str(bruto or ""))
    if len(d) < 10:
        return ""
    ddd = d[-11:-9] if len(d) >= 11 else d[-10:-8]
    return ddd + d[-8:]


def _telefone_com_pais(bruto: Any) -> str:
    d = re.sub(r"\D", "", str(bruto or ""))
    return "55" + d if len(d) in (10, 11) else d


async def historico_do_contato(uid: str, lead: Dict[str, Any], canal: str, existentes: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Ja falamos com este numero (ou e-mail)? Devolve {quando, como, respondeu, optout} ou nada.

    Olha o que ja saiu pela fila (de qualquer lead com o mesmo numero), a conversa do WhatsApp e o pipeline.
    """
    lid = str(lead.get("id") or "")
    telefone, email = lead.get("phone") or "", str(lead.get("email") or "").strip().lower()
    chave = _chave_do_telefone(telefone)
    quando, como = "", ""
    for i in existentes:
        if i.get("status") != "enviado" or i.get("canal") != canal:
            continue
        contato = i.get("contato") or {}
        mesmo = (canal == "email" and email and str(contato.get("email") or "").strip().lower() == email) or \
                (canal == "whatsapp" and chave and _chave_do_telefone(contato.get("phone")) == chave) or \
                (canal not in ("email", "whatsapp") and i.get("lead_id") == lid)
        if mesmo and (i.get("enviado_em") or "") >= quando:
            quando, como = i.get("enviado_em") or "", canal
    respondeu = optout = False
    if canal == "whatsapp" and telefone:
        conversa = await robo_store.obter_conversa(uid, robo_store.id_da_conversa("whatsapp", _telefone_com_pais(telefone)))
        if conversa and conversa.get("mensagens"):
            optout = bool(conversa.get("optout"))
            respondeu = any(m.get("de") == "contato" for m in conversa["mensagens"])
            if any(m.get("de") in ("robo", "voce") for m in conversa["mensagens"]):
                como = como or "whatsapp"
                quando = max(quando, str(conversa.get("atualizado") or ""))
    if not quando and not optout:
        item = await pipeline_store.obter(uid, lid)
        if item and (pipeline_store.etapa_valida(item.get("etapa", "")) or "Novo Lead") != "Novo Lead":
            como, quando = canal, str(item.get("atualizado") or item.get("criado") or "") or agora()
            respondeu = respondeu or item.get("etapa") == "Respondeu"
    if not (quando or optout):
        return None
    return {"quando": quando, "como": como or canal, "respondeu": respondeu, "optout": optout}


async def _ja_contatado(uid: str, lead_id: str, existentes: List[Dict[str, Any]]) -> str:
    """Motivo para não preparar de novo, ou vazio. Quem JA recebeu mensagem NAO entra aqui: volta para a revisão com um aviso."""
    for i in existentes:
        if i.get("lead_id") == lead_id and i.get("status") in ("rascunho", "pendente", "aguardando_limite"):
            return "já está na fila"
    return ""


SEGUIMENTO_DIAS_UTEIS = (2, 5)   # o 1o seguimento 2 dias uteis depois do envio; o 2o, 5 dias uteis depois


def dias_uteis_depois(base: datetime, n: int) -> datetime:
    """n dias uteis (segunda a sexta) depois de `base`."""
    atual = base
    while n > 0:
        atual += timedelta(days=1)
        if atual.weekday() < 5:
            n -= 1
    return atual


def agendar_seguimentos(item: Dict[str, Any], base: Optional[datetime] = None) -> None:
    """Depois de enviada a abordagem de WhatsApp, agenda os 2 seguimentos escritos junto com ela (se houver)."""
    if item.get("canal") != "whatsapp" or item.get("tipo") == "seguimento" or item.get("agenda_seguimentos"):
        return
    base = base or datetime.now(timezone.utc)
    agenda = []
    for n, (dias, seg) in enumerate(zip(SEGUIMENTO_DIAS_UTEIS, item.get("seguimentos") or []), start=1):
        texto = str((seg or {}).get("texto") or "").strip()
        if texto:
            agenda.append({"n": n, "ate": dias_uteis_depois(base, dias).isoformat(), "texto": texto[:1200], "estado": "agendado"})
    if agenda:
        item["agenda_seguimentos"] = agenda


async def promover_seguimentos(uid: str, agora: Optional[datetime] = None) -> int:
    """Seguimentos que venceram viram itens da fila (e saem no ritmo seguro dos disparos), a menos que a pessoa ja tenha respondido.

    Quem respondeu, ou pediu para sair, nunca recebe seguimento: o robo atende a conversa.
    """
    agora = agora or datetime.now(timezone.utc)
    promovidos = 0
    for item in await listar(uid):
        agenda = item.get("agenda_seguimentos") or []
        if not agenda or item.get("canal") != "whatsapp" or not any(a.get("estado") == "agendado" for a in agenda):
            continue
        telefone = re.sub(r"\D", "", (item.get("contato") or {}).get("phone", ""))
        conversa = await robo_store.obter_conversa(uid, robo_store.id_da_conversa("whatsapp", telefone)) if telefone else None
        respondeu = bool(conversa) and (conversa.get("optout") or any(m.get("de") == "contato" for m in conversa.get("mensagens") or []))
        mudou = False
        for a in agenda:
            if a.get("estado") != "agendado":
                continue
            if respondeu:
                a["estado"], mudou = "cancelado", True
                continue
            quando = datetime.fromisoformat(a["ate"])
            anterior_ok = all(b.get("estado") != "agendado" for b in agenda if b.get("n", 0) < a.get("n", 0))
            if quando <= agora and anterior_ok:
                contato = item.get("contato") or {}
                await _gravar(uid, {
                    "id": f"{item['id']}_s{a['n']}", "lead_id": item.get("lead_id", ""), "nome": item.get("nome", ""), "canal": "whatsapp",
                    "assunto": "", "texto": a["texto"], "link": link_do_canal("whatsapp", {"phone": contato.get("phone", "")}, a["texto"]),
                    "gancho": f"seguimento {a['n']}", "previa": item.get("previa", ""), "previa_url": item.get("previa_url", ""),
                    "seguimentos": [], "tipo": "seguimento", "seguimento_de": item["id"], "contato": contato,
                    "ramo": item.get("ramo", ""), "nota": item.get("nota"), "avaliacoes": item.get("avaliacoes"),
                    "status": "pendente", "criado": agora_iso(),
                })
                a["estado"], mudou = "na_fila", True
                promovidos += 1
        if mudou:
            await _gravar(uid, item)
    return promovidos


LIMIAR_DE_SEMELHANCA = 0.35   # trechos de 3 palavras em comum: acima disso a mensagem parece copia da outra


def _trigramas(texto: str) -> set:
    palavras = re.findall(r"\w+", (texto or "").lower())
    return {" ".join(palavras[i:i + 3]) for i in range(max(0, len(palavras) - 2))}


def semelhanca(a: str, b: str) -> float:
    """Quanto da menor mensagem aparece na outra (trechos de 3 palavras). 0 = diferentes, 1 = iguais."""
    ta, tb = _trigramas(a), _trigramas(b)
    return len(ta & tb) / max(1, min(len(ta), len(tb)))


_FAZ = re.compile(r"\b(ajudo|ajudamos|trabalho|cuido|crio|criamos|monto|faco|fazemos)\b")


def assinatura_da_abertura(texto: str) -> str:
    """Como a mensagem se apresenta, sem cumprimento nem nome: as 5 palavras a partir de "ajudo negócios locais a...".
    Duas mensagens com a mesma assinatura têm a mesma cara, mesmo com nomes e números diferentes."""
    import unicodedata

    t = unicodedata.normalize("NFD", (texto or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z0-9 ]+", " ", t)
    m = _FAZ.search(t)
    palavras = (t[m.start():] if m else re.sub(r"^\s*(boa tarde|bom dia|boa noite|oi|ola)\b", "", t)).split()
    return " ".join(palavras[:5])


def _apresentacao(texto: str) -> str:
    """O trecho em que a mensagem diz o que faz ("ajudo negócios locais a serem encontrados..."), com 8 palavras."""
    m = re.search(r"\b(ajudo|ajudamos|trabalho|cuido|crio|criamos|faço|faco|fazemos)\b", (texto or "").lower())
    return " ".join((texto or "")[m.start():].split()[:8]) if m else ""


def _fechamento(texto: str) -> str:
    """Como a mensagem TERMINA (a pergunta final), em 6 palavras sem acento: duas mensagens que fecham igual têm a mesma cara de disparo."""
    import unicodedata

    t = unicodedata.normalize("NFD", (texto or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    frases = [f for f in re.split(r"[.!?\n]+", t) if re.sub(r"[^a-z]", "", f)]
    return " ".join(re.sub(r"[^a-z0-9 ]+", " ", frases[-1]).split()[:6]) if frases else ""


def _abertura(texto: str, palavras: int = 9) -> str:
    return " ".join((texto or "").split()[:palavras])


async def _chamar_gerar(gerar, lead: Dict[str, Any], canal: str, evitar: List[str], variacao: int):
    """Chama o gerador com as aberturas a evitar, se ele aceitar (os geradores de teste antigos so recebem lead e canal)."""
    import inspect
    parametros = inspect.signature(gerar).parameters
    if "evitar" in parametros or any(p.kind == inspect.Parameter.VAR_KEYWORD for p in parametros.values()):
        return await gerar(lead, canal, evitar=evitar, variacao=variacao)
    return await gerar(lead, canal)


async def _diferenciar(gerar, lead: Dict[str, Any], canal: str, pronto: Dict[str, Any], usados: List[str]) -> Dict[str, Any]:
    """Cada mensagem tem de ser diferente das outras do lote: se esta parece copia, pede de novo (ate 2 vezes) sem a mesma abertura."""
    for tentativa in (1,):  # uma nova chance basta: cada chamada a mais pesa no limite por minuto da IA gratuita
        corpo = (pronto.get("body") or "").strip()
        # parecida = texto parecido OU a mesma abertura (as 7 primeiras palavras): "Boa tarde! Eu sou da LeadSage, ajudo..." repetida em várias mensagens
        ini = _abertura(corpo, 7).lower()
        fech = _fechamento(corpo)
        parecida = [u for u in usados if semelhanca(corpo, u) >= LIMIAR_DE_SEMELHANCA or (ini and _abertura(u, 7).lower() == ini)
                    or assinatura_da_abertura(u) == assinatura_da_abertura(corpo) or (len(fech.split()) >= 4 and _fechamento(u) == fech)]
        if not corpo or not parecida:
            break
        try:
            # além das aberturas, diz qual frase de apresentação NÃO repetir ("ajudo negócios locais a serem encontrados...")
            evitar = ([_abertura(u) for u in parecida[:3]] + [f"a frase de apresentação '{_apresentacao(u)}'" for u in parecida[:2] if _apresentacao(u)]
                      + [f"a pergunta final que termina em '{_fechamento(u)}'" for u in parecida[:2] if _fechamento(u)])
            nova = await _chamar_gerar(gerar, lead, canal, evitar, tentativa)
        except Exception:
            break
        if nova and (nova.get("body") or "").strip():
            melhor_semelhanca = max((semelhanca(nova["body"], u) for u in usados), default=0) < max((semelhanca(corpo, u) for u in usados), default=0)
            assinatura_nova = all(assinatura_da_abertura(nova["body"]) != assinatura_da_abertura(u) for u in usados)
            if melhor_semelhanca or assinatura_nova:
                pronto = nova
    return pronto


async def preparar_lote(
    uid: str,
    leads: List[Dict[str, Any]],
    gerar: Gerar,
    enviar_email: EnviarEmail,
    pode_enviar: PodeEnviar,
    cobrar_email: Cobrar,
    pausa: float = 0.8,
    revisar: bool = False,
    orcamento_s: float = 0.0,
) -> Dict[str, Any]:
    """Prepara até LOTE_MAXIMO leads. Com `revisar`, nada sai: as mensagens ficam como rascunho para a pessoa conferir. Devolve o que aconteceu com cada um.

    `gerar`, `enviar_email` e `cobrar_email` entram de fora: assim o fluxo
    inteiro testa sem rede, sem SMTP e sem IA.
    """
    leads = leads[:LOTE_MAXIMO]
    existentes = await listar(uid)
    restante = max(0, LIMITE_EMAIL_DIA - emails_enviados_hoje(existentes))
    saida: List[Dict[str, Any]] = []

    # 1) decide o canal e filtra quem não deve receber
    alvos: List[Tuple[Dict[str, Any], str]] = []
    historicos: Dict[str, Dict[str, Any]] = {}
    for lead in leads:
        lid = str(lead.get("id") or "")
        nome = lead.get("company") or lead.get("name") or lid
        if not lid:
            continue
        motivo = await _ja_contatado(uid, lid, existentes)
        if motivo:
            saida.append({"lead_id": lid, "nome": nome, "resultado": "ignorado", "motivo": motivo})
            continue
        canal = escolher_canal(lead)
        if not canal:
            saida.append({"lead_id": lid, "nome": nome, "resultado": "ignorado",
                          "motivo": "sem e-mail, telefone, Instagram nem LinkedIn"})
            continue
        antes = await historico_do_contato(uid, lead, canal, existentes)
        if antes and antes.get("optout"):
            saida.append({"lead_id": lid, "nome": nome, "resultado": "ignorado", "motivo": "pediu para não receber mensagens"})
            continue
        if antes:
            historicos[lid] = antes
        alvos.append((lead, canal))

    # 2) escreve as mensagens, algumas por vez
    # duas por vez: o Gemini gratuito recusa (429) rajada de chamadas e o lead inteiro falhava
    sem = asyncio.Semaphore(2)
    inicio = time.monotonic()

    async def escrever(lead: Dict[str, Any], canal: str):
        async with sem:
            for tentativa in (1, 2):
                try:
                    quem = {**lead, "_retomada": historicos[str(lead.get("id"))]} if str(lead.get("id")) in historicos else lead
                    return await gerar(quem, canal)
                except Exception as exc:
                    # pico de demanda: espera um pouco e tenta de novo, se ainda houver tempo dentro dos 55 s da requisicao
                    if tentativa == 1 and re.search(r"alta demanda|fila da IA", str(exc)) and time.monotonic() - inicio < 25:
                        await asyncio.sleep(4)
                        continue
                    return exc

    tarefas = [asyncio.ensure_future(escrever(l, c)) for l, c in alvos]
    # com `orcamento_s` a requisição tem um limite de tempo: o que não terminou vira "fila da IA" (a tela tenta de novo), nunca um 504 para tudo
    _, sobrou = await asyncio.wait(tarefas, timeout=orcamento_s or None) if tarefas else (set(), set())
    for t in sobrou:
        t.cancel()
    from app.ai_client import AIIndisponivel

    textos = []
    for t in tarefas:
        if t.done() and not t.cancelled():
            textos.append(t.result())
        else:
            textos.append(AIIndisponivel("A fila da IA gratuita está cheia agora (muita gente gerando ao mesmo tempo). Tente de novo em 20 segundos.", espera_s=20))

    # 3) entrega cada uma no canal dela
    usados: List[str] = [i.get("texto", "") for i in existentes if i.get("canal") == "whatsapp"][:40]
    for (lead, canal), pronto in zip(alvos, textos):
        lid = str(lead["id"])
        nome = lead.get("company") or lead.get("name") or lid
        if isinstance(pronto, Exception):
            saida.append({"lead_id": lid, "nome": nome, "resultado": "falhou", "espera_s": int(getattr(pronto, "espera_s", 0) or 0),
                          "motivo": f"não foi possível escrever a mensagem: {str(pronto)[:160]}"})
            continue
        if canal == "whatsapp" and not (orcamento_s and time.monotonic() - inicio > orcamento_s * 0.55):
            pronto = await _diferenciar(gerar, lead, canal, pronto, usados)
            usados.append((pronto.get("body") or "").strip())

        assunto = (pronto.get("subject") or "").strip()
        corpo = (pronto.get("body") or "").strip()
        if not corpo:
            saida.append({"lead_id": lid, "nome": nome, "resultado": "falhou", "motivo": "a IA devolveu uma mensagem vazia"})
            continue
        if canal == "email":
            corpo = com_rodape_de_saida(corpo)

        # mensagem nova para quem ja recebeu nao apaga o registro do que foi enviado: ganha um id proprio
        novo_id = f"f_{lid}"
        if any(i.get("id") == novo_id and i.get("status") in ("enviado", "enviando") for i in existentes):
            novo_id = f"f_{lid}_r{sum(1 for i in existentes if str(i.get('id', '')).startswith(f'f_{lid}_r')) + 1}"
        item = {
            "id": novo_id,
            "lead_id": lid,
            "nome": nome,
            "canal": canal,
            "assunto": assunto,
            "texto": corpo,
            "link": link_do_canal(canal, lead, corpo),
            "gancho": (pronto.get("hook") or "")[:240],
            "previa": pronto.get("previa") or "",
            "previa_url": pronto.get("previa_url") or "",
            "seguimentos": pronto.get("follow_ups") or [],
            "ramo": str(lead.get("niche") or lead.get("role") or "")[:80],
            "nota": lead.get("rating"), "avaliacoes": lead.get("rating_count"),
            "contato": {"email": lead.get("email") or "", "phone": lead.get("phone") or "",
                        "instagram": _instagram(lead), "linkedin": _linkedin(lead)},
            "status": "pendente",
            "criado": agora(),
        }
        if lid in historicos:
            # a pessoa decide: nada sai sozinho para quem ja recebeu mensagem
            item["ja_contatado"] = {k: historicos[lid][k] for k in ("quando", "como", "respondeu")}
        # garante que o servidor conhece o lead (o robô reconhece quem responde por ele)
        try:
            await pipeline_store.registrar(uid, {**lead, "id": lid})
        except Exception as exc:
            print(f"Fila: não registrou no pipeline: {exc}")

        if revisar or lid in historicos:
            item["status"] = "rascunho"
            await _gravar(uid, item)
            saida.append({"lead_id": lid, "nome": nome, "canal": canal, "resultado": "para revisar", "motivo": ""})
            continue

        if canal == "email":
            if restante <= 0:
                item["status"] = "aguardando_limite"
                item["motivo"] = f"limite de {LIMITE_EMAIL_DIA} e-mails por dia atingido; envie amanhã"
            elif not await pode_enviar():
                item["status"] = "aguardando_limite"
                item["motivo"] = "créditos insuficientes para enviar o e-mail"
            else:
                try:
                    await enviar_email(lead, assunto or "Contato", corpo)
                    await cobrar_email()
                    item["status"] = "enviado"
                    item["enviado_em"] = agora()
                    item["enviado_por"] = "robô"
                    restante -= 1
                    await pipeline_store.mover(uid, lid, "Contato Enviado", motivo="e-mail enviado pelo robô", por="robô")
                    await asyncio.sleep(pausa)
                except Exception as exc:
                    item["status"] = "falhou"
                    item["motivo"] = str(exc)[:200]
        await _gravar(uid, item)
        saida.append({
            "lead_id": lid, "nome": nome, "canal": canal,
            "resultado": {"enviado": "enviado", "pendente": "na fila", "aguardando_limite": "aguardando",
                          "falhou": "falhou"}[item["status"]],
            "motivo": item.get("motivo", ""),
        })

    return {"resultados": saida, "resumo": resumo(await listar(uid))}


# --------------------------------------------------------- ações da pessoa

async def marcar_enviado(uid: str, item_id: str) -> Optional[Dict[str, Any]]:
    item = await obter(uid, item_id)
    if item is None:
        return None
    if item.get("status") != "enviado":
        item["status"] = "enviado"
        item["enviado_em"] = agora()
        item["enviado_por"] = "voce"
        agendar_seguimentos(item)
        await _gravar(uid, item)
        await pipeline_store.mover(uid, item["lead_id"], "Contato Enviado",
                                   motivo=f"mensagem enviada por você ({ROTULO_CANAL.get(item['canal'], item['canal'])})", por="voce")
    return item


async def pular(uid: str, item_id: str) -> Optional[Dict[str, Any]]:
    item = await obter(uid, item_id)
    if item is None:
        return None
    if item.get("status") in ("pendente", "aguardando_limite", "falhou"):
        item["status"] = "pulado"
        await _gravar(uid, item)
    return item


async def enviar_aguardando(uid: str, enviar_email: EnviarEmail, pode_enviar: PodeEnviar, cobrar_email: Cobrar, pausa: float = 0.8) -> Dict[str, Any]:
    """Manda os e-mails que ficaram esperando o limite do dia ou os créditos."""
    itens = await listar(uid)
    restante = max(0, LIMITE_EMAIL_DIA - emails_enviados_hoje(itens))
    enviados = 0
    for item in [i for i in itens if i.get("canal") == "email" and i.get("status") == "aguardando_limite"]:
        if restante <= 0:
            break
        if not await pode_enviar():
            item["motivo"] = "créditos insuficientes para enviar o e-mail"
            await _gravar(uid, item)
            break
        lead = {"id": item["lead_id"], "name": item["nome"], "email": (item.get("contato") or {}).get("email", "")}
        try:
            await enviar_email(lead, item.get("assunto") or "Contato", item["texto"])
            await cobrar_email()
        except Exception as exc:
            item["status"] = "falhou"
            item["motivo"] = str(exc)[:200]
            await _gravar(uid, item)
            continue
        item["status"] = "enviado"
        item["enviado_em"] = agora()
        item["enviado_por"] = "robô"
        item["motivo"] = ""
        await _gravar(uid, item)
        await pipeline_store.mover(uid, item["lead_id"], "Contato Enviado", motivo="e-mail enviado pelo robô", por="robô")
        restante -= 1
        enviados += 1
        await asyncio.sleep(pausa)
    return {"enviados": enviados, "resumo": resumo(await listar(uid))}


# ------------------------------------------------------------- revisar antes de enviar

async def editar(uid: str, item_id: str, texto: Optional[str] = None, assunto: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Corrige a mensagem (ou o assunto) de um item que ainda nao saiu. None se nao existe ou ja saiu."""
    item = await obter(uid, item_id)
    if not item or item.get("status") not in EDITAVEIS:
        return None
    if texto is not None:
        novo = texto.strip()
        if not novo:
            raise ValueError("A mensagem não pode ficar vazia.")
        if item.get("canal") == "email":
            novo = com_rodape_de_saida(novo)
        novo = novo[:4000]
        contato = item.get("contato") or {}
        lead = {"phone": contato.get("phone", ""), "instagram": contato.get("instagram", ""),
                "socials": {"instagram": contato.get("instagram", ""), "linkedin": contato.get("linkedin", "")}}
        item["texto"] = novo
        item["link"] = link_do_canal(item.get("canal", ""), lead, novo)  # o link do WhatsApp leva o texto
    if assunto is not None:
        item["assunto"] = assunto.strip()[:200]
    item["editado"] = True
    await _gravar(uid, item)
    return item


async def descartar(uid: str, ids: List[str]) -> int:
    """Tira da fila (sem enviar) as mensagens escolhidas. Devolve quantas."""
    n = 0
    for iid in ids[:100]:
        item = await obter(uid, iid)
        if item and item.get("status") in EDITAVEIS:
            item["status"] = "pulado"
            item["motivo"] = "descartada na revisão"
            await _gravar(uid, item)
            n += 1
    return n


async def descartar_todos(uid: str) -> int:
    """Esvazia a fila: tudo que ainda nao saiu (rascunho, pendente, esperando limite, com falha). Nao mexe no que esta saindo agora."""
    n = 0
    for item in await listar(uid):
        if item.get("status") in EDITAVEIS:
            item["status"] = "pulado"
            item["motivo"] = "fila descartada pelo usuário"
            await _gravar(uid, item)
            n += 1
    return n


async def aprovar(uid: str, ids: List[str], enviar_email: EnviarEmail, pode_enviar: PodeEnviar,
                  cobrar_email: Cobrar, pausa: float = 0.8, confirmar_reenvio: bool = False) -> Dict[str, Any]:
    """Libera para sair as mensagens revisadas.

    WhatsApp vai para a fila de saida (o Conector envia com intervalo e limite do dia); e-mail sai agora, dentro
    do limite diario e dos creditos; Instagram e LinkedIn ficam prontos para a pessoa abrir.
    """
    todos = await listar(uid)
    por_id = {i["id"]: i for i in todos}
    restante = max(0, LIMITE_EMAIL_DIA - emails_enviados_hoje(todos))
    saida: List[Dict[str, Any]] = []
    for iid in ids[:60]:
        item = por_id.get(iid)
        if not item or item.get("status") != "rascunho":
            continue
        nome, lid = item.get("nome", ""), item.get("lead_id", "")
        if item.get("ja_contatado") and not confirmar_reenvio:
            saida.append({"lead_id": lid, "nome": nome, "canal": item.get("canal"), "resultado": "ignorado",
                          "motivo": "este contato já recebeu mensagem antes: confirme o reenvio para enviar de novo"})
            continue
        if item.get("canal") != "email":
            item["status"] = "pendente"
            item["motivo"] = ""
            await _gravar(uid, item)
            saida.append({"lead_id": lid, "nome": nome, "canal": item["canal"], "resultado": "na fila", "motivo": ""})
            continue
        if restante <= 0:
            item["status"], item["motivo"] = "aguardando_limite", f"limite de {LIMITE_EMAIL_DIA} e-mails por dia atingido; envie amanhã"
        elif not await pode_enviar():
            item["status"], item["motivo"] = "aguardando_limite", "créditos insuficientes para enviar o e-mail"
        else:
            lead = {"id": lid, "name": nome, "email": (item.get("contato") or {}).get("email", "")}
            try:
                await enviar_email(lead, item.get("assunto") or "Contato", item["texto"])
                await cobrar_email()
                item.update({"status": "enviado", "enviado_em": agora(), "enviado_por": "robô", "motivo": ""})
                restante -= 1
                await pipeline_store.mover(uid, lid, "Contato Enviado", motivo="e-mail enviado pelo robô", por="robô")
                await asyncio.sleep(pausa)
            except Exception as exc:
                item["status"], item["motivo"] = "falhou", str(exc)[:200]
        await _gravar(uid, item)
        saida.append({"lead_id": lid, "nome": nome, "canal": "email",
                      "resultado": {"enviado": "enviado", "aguardando_limite": "aguardando", "falhou": "falhou"}[item["status"]],
                      "motivo": item.get("motivo", "")})
    return {"resultados": saida, "resumo": resumo(await listar(uid))}
