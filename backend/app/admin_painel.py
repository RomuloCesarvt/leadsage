"""Painel do administrador: ver o pipeline e as pesquisas de outros usuarios e dar creditos infinitos.

So entra quem esta em ADMIN_EMAILS. Tudo aqui e somente leitura, menos o botao de creditos
infinitos, que fica registrado com quem deu e quando.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth as fb_auth
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import credit_system, pipeline_store
from app.credit_system import is_admin
from app.database import DBSearchHistory, get_db
from app.firebase_config import get_current_user

router = APIRouter(prefix="/api/admin")


async def exigir_admin(user: dict = Depends(get_current_user)) -> dict:
    if not is_admin(user.get("email")):
        raise HTTPException(status_code=403, detail="Área só para administradores.")
    return user


class Ilimitado(BaseModel):
    ativo: bool


def _quando(ms) -> str:
    try:
        return datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc).isoformat() if ms else ""
    except (TypeError, ValueError, OSError):
        return ""


def _listar_contas() -> List[Dict[str, Any]]:
    contas = []
    pagina = fb_auth.list_users()
    while pagina is not None and len(contas) < 500:
        for u in pagina.users:
            meta = u.user_metadata
            contas.append({
                "uid": u.uid, "email": u.email or "", "nome": u.display_name or "",
                "criado_em": _quando(getattr(meta, "creation_timestamp", 0)),
                "ultimo_acesso": _quando(getattr(meta, "last_sign_in_timestamp", 0)),
                "admin": is_admin(u.email),
            })
        pagina = pagina.get_next_page()
    return contas


@router.get("/usuarios")
async def usuarios(_: dict = Depends(exigir_admin)):
    try:
        contas = _listar_contas()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Não consegui listar os usuários: {exc}")
    for c in contas:
        c["ilimitado"] = await credit_system.e_ilimitado(c["uid"])
    contas.sort(key=lambda c: c["ultimo_acesso"] or c["criado_em"], reverse=True)
    return contas


@router.get("/usuarios/{uid}/pipeline")
async def pipeline_do_usuario(uid: str, _: dict = Depends(exigir_admin)):
    itens = await pipeline_store.listar(uid)
    return {"itens": itens}


@router.get("/usuarios/{uid}/pesquisas")
async def pesquisas_do_usuario(uid: str, _: dict = Depends(exigir_admin), db: AsyncSession = Depends(get_db)):
    linhas = (await db.execute(
        select(DBSearchHistory).where(DBSearchHistory.owner_uid == uid)
        .order_by(DBSearchHistory.timestamp.desc()).limit(100)
    )).scalars().all()
    return [{"id": h.id, "niche": h.niche, "location": h.location, "total_leads": h.total_leads,
             "timestamp": h.timestamp, "leads_preview": h.leads_preview} for h in linhas]


@router.post("/usuarios/{uid}/ilimitado")
async def definir_ilimitado(uid: str, req: Ilimitado, admin: dict = Depends(exigir_admin)):
    await credit_system.definir_ilimitado(uid, req.ativo, por=admin.get("email") or "")
    return {"uid": uid, "ilimitado": req.ativo}
