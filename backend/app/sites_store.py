"""Persistencia dos sites gerados pela IA.

Antes o HTML so vivia no useState da tela de criacao: ao sair, sumia, e a
tela "Meus Sites" ficava num estado vazio permanente.

Mesma estrategia do perfil: Firestore quando ha credencial (no Vercel o
SQLite fica em /tmp e e efemero) e SQLite no dev local.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app.database import AsyncSessionLocal, DBSite
from app.firebase_config import db as firestore_db

# Firestore recusa documentos acima de ~1 MB.
MAX_HTML_BYTES = 900_000


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _row_to_dict(row: DBSite, include_html: bool = True) -> Dict[str, Any]:
    data = {
        "id": row.id,
        "company": row.company,
        "template": row.template,
        "lead_id": row.lead_id,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }
    if include_html:
        data["html"] = row.html or ""
        data["builder_data"] = row.builder_data or ""
    return data


async def contar_sites(uid: str) -> int:
    """Quantos sites o usuario ja tem. Base para a cota do plano."""
    if firestore_db is not None:
        try:
            docs = firestore_db.collection("users").document(uid).collection("sites").stream()
            return sum(1 for _ in docs)
        except Exception as exc:
            print(f"Falha ao contar sites no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBSite).where(DBSite.owner_uid == uid))
        return len(result.scalars().all())


def _validar(html: str, builder_data: str) -> None:
    if not html.strip():
        raise ValueError("O site não tem conteúdo para publicar.")
    if len(html.encode("utf-8")) > MAX_HTML_BYTES:
        raise ValueError("O site gerado é grande demais para ser salvo.")
    if len(builder_data.encode("utf-8")) > MAX_HTML_BYTES:
        raise ValueError("As fotos do site ocupam espaço demais para serem guardadas.")


async def create_site(
    uid: str, company: str, html: str, template: str = "", lead_id: str = "",
    builder_data: str = "",
) -> Dict[str, Any]:
    _validar(html, builder_data)

    site = {
        "id": f"site_{uuid.uuid4().hex[:10]}",
        "company": company or "Site sem nome",
        "template": template,
        "lead_id": lead_id,
        "html": html,
        "builder_data": builder_data,
        "created_at": _now(),
        "updated_at": "",
    }

    if firestore_db is not None:
        try:
            firestore_db.collection("users").document(uid).collection("sites").document(
                site["id"]
            ).set(site)
            return site
        except Exception as exc:
            print(f"Falha ao gravar site no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        session.add(DBSite(owner_uid=uid, **site))
        await session.commit()
    return site


async def update_site(
    uid: str, site_id: str, company: str, html: str, template: str = "",
    builder_data: str = "",
) -> Optional[Dict[str, Any]]:
    """Regrava um site que ja existe.

    Antes so havia create_site: quem ajustava um site e publicava de novo
    ganhava um duplicado em "Meus Sites" e perdia mais uma vaga da cota.
    Editar nao deve custar uma vaga — a vaga foi paga na criacao.

    Devolve None quando o site nao e do usuario, para o endpoint responder
    404 em vez de criar um registro solto.
    """
    _validar(html, builder_data)
    atual = await get_site(uid, site_id)
    if atual is None:
        return None

    mudancas = {
        "company": company or atual.get("company") or "Site sem nome",
        "template": template or atual.get("template") or "",
        "html": html,
        "builder_data": builder_data,
        "updated_at": _now(),
    }

    if firestore_db is not None:
        try:
            firestore_db.collection("users").document(uid).collection("sites").document(
                site_id
            ).update(mudancas)
            return {**atual, **mudancas}
        except Exception as exc:
            print(f"Falha ao atualizar site no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(DBSite).where(DBSite.id == site_id, DBSite.owner_uid == uid)
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        for campo, valor in mudancas.items():
            setattr(row, campo, valor)
        await session.commit()
        return _row_to_dict(row)


async def list_sites(uid: str) -> List[Dict[str, Any]]:
    """Lista sem o HTML: a listagem nao precisa carregar cada pagina inteira."""
    if firestore_db is not None:
        try:
            docs = (
                firestore_db.collection("users").document(uid).collection("sites").stream()
            )
            items = [{k: v for k, v in (d.to_dict() or {}).items() if k != "html"} for d in docs]
            items.sort(key=lambda s: s.get("created_at", ""), reverse=True)
            return items
        except Exception as exc:
            print(f"Falha ao listar sites no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(DBSite).where(DBSite.owner_uid == uid).order_by(DBSite.created_at.desc())
        )
        return [_row_to_dict(r, include_html=False) for r in result.scalars().all()]


async def get_site(uid: str, site_id: str) -> Optional[Dict[str, Any]]:
    if firestore_db is not None:
        try:
            doc = (
                firestore_db.collection("users")
                .document(uid)
                .collection("sites")
                .document(site_id)
                .get()
            )
            if doc.exists:
                return doc.to_dict()
        except Exception as exc:
            print(f"Falha ao ler site no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(DBSite).where(DBSite.id == site_id, DBSite.owner_uid == uid)
        )
        row = result.scalar_one_or_none()
        return _row_to_dict(row) if row else None


async def delete_site(uid: str, site_id: str) -> bool:
    if firestore_db is not None:
        try:
            ref = (
                firestore_db.collection("users")
                .document(uid)
                .collection("sites")
                .document(site_id)
            )
            if ref.get().exists:
                ref.delete()
                return True
            return False
        except Exception as exc:
            print(f"Falha ao apagar site no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        # O filtro por owner_uid impede apagar o site de outro usuario
        result = await session.execute(
            select(DBSite).where(DBSite.id == site_id, DBSite.owner_uid == uid)
        )
        row = result.scalar_one_or_none()
        if not row:
            return False
        await session.delete(row)
        await session.commit()
        return True
