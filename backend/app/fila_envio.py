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
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple
from urllib.parse import quote

from sqlalchemy import select

from app import pipeline_store
from app.database import AsyncSessionLocal, DBRobo
from app.firebase_config import db as firestore_db
from app.robo_store import agora

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")

LIMITE_EMAIL_DIA = 40
LOTE_MAXIMO = 8
STATUS = ("pendente", "enviado", "pulado", "aguardando_limite", "falhou")

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
    if firestore_db is not None:
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
    if firestore_db is not None:
        try:
            doc = _doc(uid, item_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as exc:
            print(f"Falha ao ler a fila: {exc}")
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave(uid, item_id)))).scalar_one_or_none()
        return dict(row.data or {}) if row else None


async def listar(uid: str) -> List[Dict[str, Any]]:
    itens: List[Dict[str, Any]] = []
    lido = False
    if firestore_db is not None:
        try:
            itens = [d.to_dict() for d in firestore_db.collection("users").document(uid).collection("fila_envio").stream()]
            lido = True
        except Exception as exc:
            print(f"Falha ao listar a fila: {exc}")
    if not lido:
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


async def _ja_contatado(uid: str, lead_id: str, existentes: List[Dict[str, Any]]) -> str:
    """Motivo para não preparar de novo, ou vazio."""
    for i in existentes:
        if i.get("lead_id") == lead_id and i.get("status") in ("pendente", "enviado", "aguardando_limite"):
            return "já está na fila" if i["status"] != "enviado" else "já recebeu a abordagem"
    item = await pipeline_store.obter(uid, lead_id)
    if item and (pipeline_store.etapa_valida(item.get("etapa", "")) or "Novo Lead") != "Novo Lead":
        return "já está em andamento no pipeline"
    return ""


async def preparar_lote(
    uid: str,
    leads: List[Dict[str, Any]],
    gerar: Gerar,
    enviar_email: EnviarEmail,
    pode_enviar: PodeEnviar,
    cobrar_email: Cobrar,
    pausa: float = 0.8,
) -> Dict[str, Any]:
    """Prepara até LOTE_MAXIMO leads. Devolve o que aconteceu com cada um.

    `gerar`, `enviar_email` e `cobrar_email` entram de fora: assim o fluxo
    inteiro testa sem rede, sem SMTP e sem IA.
    """
    leads = leads[:LOTE_MAXIMO]
    existentes = await listar(uid)
    restante = max(0, LIMITE_EMAIL_DIA - emails_enviados_hoje(existentes))
    saida: List[Dict[str, Any]] = []

    # 1) decide o canal e filtra quem não deve receber
    alvos: List[Tuple[Dict[str, Any], str]] = []
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
        alvos.append((lead, canal))

    # 2) escreve as mensagens, algumas por vez
    sem = asyncio.Semaphore(4)

    async def escrever(lead: Dict[str, Any], canal: str):
        async with sem:
            try:
                return await gerar(lead, canal)
            except Exception as exc:
                return exc

    textos = await asyncio.gather(*[escrever(l, c) for l, c in alvos])

    # 3) entrega cada uma no canal dela
    for (lead, canal), pronto in zip(alvos, textos):
        lid = str(lead["id"])
        nome = lead.get("company") or lead.get("name") or lid
        if isinstance(pronto, Exception):
            saida.append({"lead_id": lid, "nome": nome, "resultado": "falhou",
                          "motivo": f"não foi possível escrever a mensagem: {str(pronto)[:120]}"})
            continue

        assunto = (pronto.get("subject") or "").strip()
        corpo = (pronto.get("body") or "").strip()
        if not corpo:
            saida.append({"lead_id": lid, "nome": nome, "resultado": "falhou", "motivo": "a IA devolveu uma mensagem vazia"})
            continue
        if canal == "email":
            corpo = com_rodape_de_saida(corpo)

        item = {
            "id": f"f_{lid}",
            "lead_id": lid,
            "nome": nome,
            "canal": canal,
            "assunto": assunto,
            "texto": corpo,
            "link": link_do_canal(canal, lead, corpo),
            "gancho": (pronto.get("hook") or "")[:240],
            "seguimentos": pronto.get("follow_ups") or [],
            "contato": {"email": lead.get("email") or "", "phone": lead.get("phone") or "",
                        "instagram": _instagram(lead), "linkedin": _linkedin(lead)},
            "status": "pendente",
            "criado": agora(),
        }
        # garante que o servidor conhece o lead (o robô reconhece quem responde por ele)
        try:
            await pipeline_store.registrar(uid, {**lead, "id": lid})
        except Exception as exc:
            print(f"Fila: não registrou no pipeline: {exc}")

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
