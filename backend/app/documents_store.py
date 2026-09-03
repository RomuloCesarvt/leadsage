"""Documentos criados a partir dos modelos (propostas e contratos).

As telas de Propostas e Contratos so mostravam o texto do modelo com um
botao de copiar. Nao havia como preencher os campos, salvar a versao do
usuario nem voltar nela depois.

Mesma estrategia do perfil e dos sites: Firestore quando ha credencial
(no Vercel o SQLite fica em /tmp e e efemero) e SQLite no dev local.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app.database import AsyncSessionLocal, DBDocument
from app.firebase_config import db as firestore_db

KINDS = ("proposta", "contrato")
MAX_CONTENT_BYTES = 400_000


def _agora() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _row_to_dict(row: DBDocument, com_conteudo: bool = True) -> Dict[str, Any]:
    data = {
        "id": row.id,
        "kind": row.kind,
        "template_id": row.template_id,
        "title": row.title,
        "lead_id": row.lead_id,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }
    if com_conteudo:
        data["content"] = row.content or ""
        data["fields"] = row.fields or {}
    return data


def _validar(kind: str, title: str, content: str) -> None:
    if kind not in KINDS:
        raise ValueError(f"Tipo de documento inválido: {kind}")
    if not title.strip():
        raise ValueError("O documento precisa de um título.")
    if not content.strip():
        raise ValueError("O documento está vazio.")
    if len(content.encode("utf-8")) > MAX_CONTENT_BYTES:
        raise ValueError("O documento é grande demais para ser salvo.")


def _colecao(uid: str):
    return firestore_db.collection("users").document(uid).collection("documents")


async def create_document(
    uid: str,
    kind: str,
    title: str,
    content: str,
    fields: Optional[Dict[str, str]] = None,
    template_id: str = "",
    lead_id: str = "",
) -> Dict[str, Any]:
    _validar(kind, title, content)

    doc = {
        "id": f"doc_{uuid.uuid4().hex[:10]}",
        "kind": kind,
        "template_id": template_id,
        "title": title.strip(),
        "content": content,
        "fields": fields or {},
        "lead_id": lead_id,
        "created_at": _agora(),
        "updated_at": _agora(),
    }

    if firestore_db is not None:
        try:
            _colecao(uid).document(doc["id"]).set(doc)
            return doc
        except Exception as exc:
            print(f"Falha ao gravar documento no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        session.add(DBDocument(owner_uid=uid, **doc))
        await session.commit()
    return doc


async def update_document(
    uid: str, doc_id: str, title: str, content: str, fields: Optional[Dict[str, str]] = None
) -> Optional[Dict[str, Any]]:
    atual = await get_document(uid, doc_id)
    if not atual:
        return None

    _validar(atual["kind"], title, content)
    mudanca = {
        "title": title.strip(),
        "content": content,
        "fields": fields if fields is not None else atual.get("fields", {}),
        "updated_at": _agora(),
    }

    if firestore_db is not None:
        try:
            _colecao(uid).document(doc_id).set(mudanca, merge=True)
            return {**atual, **mudanca}
        except Exception as exc:
            print(f"Falha ao atualizar documento no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(DBDocument).where(DBDocument.id == doc_id, DBDocument.owner_uid == uid)
        )
        row = result.scalar_one_or_none()
        if not row:
            return None
        for chave, valor in mudanca.items():
            setattr(row, chave, valor)
        await session.commit()
        return _row_to_dict(row)


async def list_documents(uid: str, kind: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lista sem o conteudo: a galeria nao precisa carregar cada texto."""
    if firestore_db is not None:
        try:
            docs = _colecao(uid).stream()
            itens = [
                {k: v for k, v in (d.to_dict() or {}).items() if k not in ("content", "fields")}
                for d in docs
            ]
            if kind:
                itens = [i for i in itens if i.get("kind") == kind]
            itens.sort(key=lambda d: d.get("updated_at", ""), reverse=True)
            return itens
        except Exception as exc:
            print(f"Falha ao listar documentos no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        consulta = select(DBDocument).where(DBDocument.owner_uid == uid)
        if kind:
            consulta = consulta.where(DBDocument.kind == kind)
        result = await session.execute(consulta.order_by(DBDocument.updated_at.desc()))
        return [_row_to_dict(r, com_conteudo=False) for r in result.scalars().all()]


async def get_document(uid: str, doc_id: str) -> Optional[Dict[str, Any]]:
    if firestore_db is not None:
        try:
            snap = _colecao(uid).document(doc_id).get()
            if snap.exists:
                return snap.to_dict()
        except Exception as exc:
            print(f"Falha ao ler documento no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(DBDocument).where(DBDocument.id == doc_id, DBDocument.owner_uid == uid)
        )
        row = result.scalar_one_or_none()
        return _row_to_dict(row) if row else None


async def delete_document(uid: str, doc_id: str) -> bool:
    if firestore_db is not None:
        try:
            ref = _colecao(uid).document(doc_id)
            if ref.get().exists:
                ref.delete()
                return True
            return False
        except Exception as exc:
            print(f"Falha ao apagar documento no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        # O filtro por owner_uid impede apagar documento de outro usuario
        result = await session.execute(
            select(DBDocument).where(DBDocument.id == doc_id, DBDocument.owner_uid == uid)
        )
        row = result.scalar_one_or_none()
        if not row:
            return False
        await session.delete(row)
        await session.commit()
        return True
