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
    }
    if include_html:
        data["html"] = row.html or ""
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


async def create_site(uid: str, company: str, html: str, template: str = "", lead_id: str = "") -> Dict[str, Any]:
    if not html.strip():
        raise ValueError("O site não tem conteúdo para publicar.")
    if len(html.encode("utf-8")) > MAX_HTML_BYTES:
        raise ValueError("O site gerado é grande demais para ser salvo.")

    site = {
        "id": f"site_{uuid.uuid4().hex[:10]}",
        "company": company or "Site sem nome",
        "template": template,
        "lead_id": lead_id,
        "html": html,
        "created_at": _now(),
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
