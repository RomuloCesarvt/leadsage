"""Persistencia dos sites gerados pela IA.

Antes o HTML so vivia no useState da tela de criacao: ao sair, sumia, e a
tela "Meus Sites" ficava num estado vazio permanente.

Mesma estrategia do perfil: Firestore quando ha credencial (no Vercel o
SQLite fica em /tmp e e efemero) e SQLite no dev local.
"""
import re
import secrets
import unicodedata
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app.database import AsyncSessionLocal, DBSite
from app.firebase_config import db as firestore_db

# Firestore recusa documentos acima de ~1 MB.
MAX_HTML_BYTES = 900_000


def apelido(company: str) -> str:
    """Nome legivel + sufixo aleatorio.

    O legivel e para o dono do negocio reconhecer o proprio link quando
    receber. O sufixo e para o endereco nao ser adivinhavel: sem ele,
    qualquer um digitaria /s/padaria-central e leria a proposta visual
    montada para outra pessoa.
    """
    base = unicodedata.normalize("NFKD", company or "")
    base = base.encode("ascii", "ignore").decode("ascii").lower()
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")[:40].strip("-")
    return f"{base or 'site'}-{secrets.token_hex(4)}"


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
        "slug": row.slug or "",
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


def _registrar_apelido(slug: str, uid: str, site_id: str) -> None:
    """Indice plano de apelido -> dono.

    O site mora em users/<uid>/sites/<id>, entao servir /s/<apelido> sem
    saber o uid exigiria varrer todos os usuarios. Este indice resolve em
    uma leitura. Guarda so o ponteiro: o conteudo continua num lugar so.
    """
    if firestore_db is None or not slug:
        return
    try:
        firestore_db.collection("sites_publicos").document(slug).set(
            {"uid": uid, "site_id": site_id}
        )
    except Exception as exc:
        print(f"Falha ao registrar apelido do site: {exc}")


def _esquecer_apelido(slug: str) -> None:
    if firestore_db is None or not slug:
        return
    try:
        firestore_db.collection("sites_publicos").document(slug).delete()
    except Exception as exc:
        print(f"Falha ao remover apelido do site: {exc}")


async def html_publico(slug: str) -> Optional[str]:
    """O HTML de um site pelo apelido, sem login.

    E o que faz a venda acontecer: o dono da padaria abre o link no
    celular e ve o site pronto. Devolve so o HTML — nada de dono, lead
    ou data.
    """
    if not slug:
        return None

    if firestore_db is not None:
        try:
            ponteiro = firestore_db.collection("sites_publicos").document(slug).get()
            if not ponteiro.exists:
                return None
            dados = ponteiro.to_dict() or {}
            doc = (
                firestore_db.collection("users")
                .document(dados.get("uid", ""))
                .collection("sites")
                .document(dados.get("site_id", ""))
                .get()
            )
            return (doc.to_dict() or {}).get("html") if doc.exists else None
        except Exception as exc:
            print(f"Falha ao ler site publico no Firestore: {exc}")

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBSite).where(DBSite.slug == slug))
        row = result.scalar_one_or_none()
        return (row.html or "") if row else None


async def garantir_apelido(uid: str, site: Dict[str, Any]) -> Dict[str, Any]:
    """Da apelido a um site criado antes desta funcionalidade existir.

    Sem isso os sites que o usuario ja tinha ficariam sem link para
    sempre, e ele teria de refazer cada um so para conseguir mandar.
    """
    if site.get("slug"):
        return site

    novo = apelido(site.get("company", ""))
    site["slug"] = novo

    if firestore_db is not None:
        try:
            firestore_db.collection("users").document(uid).collection("sites").document(
                site["id"]
            ).update({"slug": novo})
            _registrar_apelido(novo, uid, site["id"])
            return site
        except Exception as exc:
            print(f"Falha ao dar apelido a site antigo: {exc}")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(DBSite).where(DBSite.id == site["id"], DBSite.owner_uid == uid)
        )
        row = result.scalar_one_or_none()
        if row is not None:
            row.slug = novo
            await session.commit()
    return site


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
        "slug": apelido(company),
        "created_at": _now(),
        "updated_at": "",
    }

    if firestore_db is not None:
        try:
            firestore_db.collection("users").document(uid).collection("sites").document(
                site["id"]
            ).set(site)
            _registrar_apelido(site["slug"], uid, site["id"])
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
            doc = ref.get()
            if doc.exists:
                # O apelido tem de morrer junto: um link vivo apontando
                # para site apagado e pior do que link quebrado.
                _esquecer_apelido((doc.to_dict() or {}).get("slug", ""))
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
