"""O WhatsApp do usuário visto de outro aparelho (o celular).

O chat de verdade mora no computador do usuário, no Conector. De lá, o LeadSage lê direto
(`127.0.0.1`). Mas o celular não alcança o computador, então aqui existe um **espelho curto**:

- o celular abre a tela do WhatsApp e avisa "estou olhando" (e qual conversa abriu);
- o Conector, que pergunta ao servidor o que fazer, vê o aviso e passa a mandar a lista de
  conversas e as mensagens da conversa aberta;
- o celular lê o espelho e, para responder, deixa uma mensagem na fila que o Conector envia.

Nada disso fica guardado para sempre: o espelho só vale por alguns minutos e só é atualizado
enquanto alguém está olhando. Sem ninguém olhando, o Conector não manda nada (poupa leituras do
banco e o histórico do WhatsApp não vai para a nuvem à toa).

O mesmo canal leva o estado da conexão (QR code, código de pareamento) para a tela do celular, e
o pedido de "conectar pelo número do telefone", que dispensa um segundo aparelho para escanear.
"""
import hashlib
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app import robo_store
from app.firebase_config import db as firestore_db

CHAT_ID_RE = re.compile(r"^[0-9A-Za-z._-]{1,40}@(c\.us|g\.us|lid)$")
TTL_OLHANDO_S = 120      # depois disso o Conector para de atualizar o espelho
TTL_ESPELHO_S = 600      # o que o celular le: mais velho que isso e dado velho
NOVA_ESCRITA_S = 20      # o celular repete o aviso a cada poucos segundos; grava no maximo a cada 20
MAX_ABRIR = 5
MAX_CHATS = 100
MAX_MENSAGENS = 150
MAX_QR = 24_000


def _agora() -> datetime:
    return datetime.now(timezone.utc)


def _ler_data(texto: Optional[str]) -> Optional[datetime]:
    if not texto:
        return None
    try:
        d = datetime.fromisoformat(str(texto).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _idade_s(quando: Optional[str], agora: Optional[datetime] = None) -> Optional[int]:
    d = _ler_data(quando)
    return None if d is None else max(0, int(((agora or _agora()) - d).total_seconds()))


def _fresco(quando: Optional[str], ttl_s: float, agora: Optional[datetime] = None) -> bool:
    idade = _idade_s(quando, agora)
    return idade is not None and idade < ttl_s


def chat_valido(chat_id: str) -> bool:
    return bool(CHAT_ID_RE.match(chat_id or ""))


# ---------------------------------------------------------------- armazenamento

def _caminho(nome: str) -> str:
    return nome


async def _gravar(uid: str, nome: str, dados: Dict[str, Any]) -> None:
    if firestore_db is not None:
        try:
            firestore_db.collection("users").document(uid).collection("espelho").document(nome).set(dados)
            return
        except Exception as exc:
            print(f"Espelho: falha ao gravar {nome}: {exc}")
    await robo_store._sql_put(f"espelho:{uid}:{nome}", uid, "espelho", dados)


async def _ler(uid: str, nome: str) -> Dict[str, Any]:
    if firestore_db is not None:
        try:
            doc = firestore_db.collection("users").document(uid).collection("espelho").document(nome).get()
            return (doc.to_dict() or {}) if doc.exists else {}
        except Exception as exc:
            print(f"Espelho: falha ao ler {nome}: {exc}")
    return await robo_store._sql_get(f"espelho:{uid}:{nome}") or {}


def _nome_das_mensagens(chat_id: str) -> str:
    return "msgs_" + hashlib.sha1(chat_id.encode("utf-8")).hexdigest()[:20]


# ---------------------------------------------------------------- controle (o celular pede)

async def controle(uid: str) -> Dict[str, Any]:
    return await _ler(uid, "controle")


async def marcar_olhando(uid: str, abrir: str = "", agora: Optional[datetime] = None) -> None:
    """O celular avisa que esta olhando (e, opcionalmente, qual conversa). Grava pouco."""
    agora = agora or _agora()
    c = await controle(uid)
    idade = _idade_s(c.get("olhando_em"), agora)
    abrir_map = {k: v for k, v in (c.get("abrir") or {}).items() if _fresco(v, TTL_OLHANDO_S, agora)}
    precisa = idade is None or idade >= NOVA_ESCRITA_S or bool(abrir and (abrir not in abrir_map or not _fresco(abrir_map[abrir], NOVA_ESCRITA_S, agora)))
    if not precisa:
        return
    if abrir and chat_valido(abrir):
        abrir_map[abrir] = agora.isoformat()
        # so as mais recentes
        abrir_map = dict(sorted(abrir_map.items(), key=lambda kv: kv[1], reverse=True)[:MAX_ABRIR])
    c.update({"olhando_em": agora.isoformat(), "abrir": abrir_map})
    await _gravar(uid, "controle", c)


async def pedir_pareamento(uid: str, numero: str) -> str:
    """Conectar pelo numero do telefone: o Conector pede o codigo ao WhatsApp e ele aparece no celular."""
    digitos = re.sub(r"\D", "", numero or "")
    if not 10 <= len(digitos) <= 15:
        raise ValueError("Número de telefone inválido.")
    if len(digitos) in (10, 11):
        digitos = "55" + digitos
    c = await controle(uid)
    c.update({"parear": digitos, "parear_em": _agora().isoformat()})
    await _gravar(uid, "controle", c)
    return digitos


async def limpar_pareamento(uid: str) -> None:
    c = await controle(uid)
    if c.get("parear"):
        c.pop("parear", None)
        await _gravar(uid, "controle", c)


async def pedidos_para_o_conector(uid: str, agora: Optional[datetime] = None) -> Dict[str, Any]:
    """O que o Conector precisa saber: alguem esta olhando? quais conversas? ha pedido de pareamento?"""
    agora = agora or _agora()
    c = await controle(uid)
    olhando = _fresco(c.get("olhando_em"), TTL_OLHANDO_S, agora)
    abrir = [k for k, v in (c.get("abrir") or {}).items() if _fresco(v, TTL_OLHANDO_S, agora)]
    pareamento = c.get("parear") if _fresco(c.get("parear_em"), 600, agora) else ""
    return {"remoto": olhando, "abrir": abrir[:MAX_ABRIR] if olhando else [], "parear": pareamento or ""}


# ---------------------------------------------------------------- o que o Conector envia

async def salvar_estado(uid: str, fase: str, qr: str = "", codigo: str = "", numero: str = "") -> None:
    await _gravar(uid, "estado", {
        "fase": fase[:20], "qr": qr[:MAX_QR] if fase == "qr" else "", "codigo": codigo[:20] if codigo else "",
        "numero": re.sub(r"\D", "", numero)[:20], "em": _agora().isoformat(),
    })


async def ler_estado(uid: str) -> Dict[str, Any]:
    return await _ler(uid, "estado")


async def salvar_chats(uid: str, chats: List[Dict[str, Any]]) -> None:
    limpos = [c for c in (chats or [])[:MAX_CHATS] if isinstance(c, dict) and chat_valido(str(c.get("id", "")))]
    await _gravar(uid, "chats", {"chats": limpos, "em": _agora().isoformat()})


async def salvar_mensagens(uid: str, chat_id: str, mensagens: List[Dict[str, Any]]) -> None:
    if not chat_valido(chat_id):
        return
    await _gravar(uid, _nome_das_mensagens(chat_id), {
        "id": chat_id, "mensagens": [m for m in (mensagens or [])[-MAX_MENSAGENS:] if isinstance(m, dict)],
        "em": _agora().isoformat(),
    })


# ---------------------------------------------------------------- o que o celular le

async def ler_chats(uid: str) -> Tuple[List[Dict[str, Any]], Optional[int]]:
    d = await _ler(uid, "chats")
    idade = _idade_s(d.get("em"))
    if idade is None or idade > TTL_ESPELHO_S:
        return [], idade
    return d.get("chats") or [], idade


async def ler_mensagens(uid: str, chat_id: str) -> Tuple[List[Dict[str, Any]], Optional[int]]:
    if not chat_valido(chat_id):
        return [], None
    d = await _ler(uid, _nome_das_mensagens(chat_id))
    idade = _idade_s(d.get("em"))
    if idade is None or idade > TTL_ESPELHO_S:
        return [], idade
    return d.get("mensagens") or [], idade
