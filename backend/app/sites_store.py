"""Persistencia dos sites gerados pela IA.

Antes o HTML so vivia no useState da tela de criacao: ao sair, sumia, e a
tela "Meus Sites" ficava num estado vazio permanente.

O banco SQL (Postgres em producao, SQLite no dev) e a fonte principal; o Firestore guarda uma copia e os
sites antigos, que passam para o SQL quando sao lidos.
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




# --------------------------------------------------------------------------------------------- onde o site mora
#
# O banco SQL (Postgres na Vercel) é a fonte principal; o Firestore é só uma cópia e a origem dos sites antigos.
# Antes era o contrário, e o Firestore sem cota quebrava o link: o site criado durante a falta de cota ia só para o SQL,
# mas o link público procurava só no Firestore ("Site não encontrado"); e o site gravado no Firestore sem o índice do
# apelido (a segunda gravação falhava) também sumia.

_CAMPOS = ("id", "company", "template", "lead_id", "html", "builder_data", "slug", "created_at", "updated_at")


def _fs_sites(uid: str):
    return firestore_db.collection("users").document(uid).collection("sites")


def _fs_ler(uid: str, site_id: str) -> Optional[Dict[str, Any]]:
    if firestore_db is None:
        return None
    try:
        doc = _fs_sites(uid).document(site_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as exc:
        print(f"Firestore: não leu o site {site_id}: {type(exc).__name__}")
        return None


def _fs_listar(uid: str) -> List[Dict[str, Any]]:
    if firestore_db is None:
        return []
    try:
        return [dict(d.to_dict() or {}) for d in _fs_sites(uid).stream()]
    except Exception as exc:
        print(f"Firestore: não listou os sites: {type(exc).__name__}")
        return []


def _fs_gravar(uid: str, site: Dict[str, Any], so_mudancas: Optional[Dict[str, Any]] = None) -> None:
    """Cópia no Firestore (melhor esforço: falhar aqui não perde nada, o SQL já tem)."""
    if firestore_db is None:
        return
    try:
        ref = _fs_sites(uid).document(site["id"])
        if so_mudancas is not None:
            ref.set(so_mudancas, merge=True)
        else:
            ref.set({k: site.get(k) for k in _CAMPOS})
        if site.get("slug"):
            _registrar_apelido(site["slug"], uid, site["id"])
    except Exception as exc:
        print(f"Firestore: cópia do site não gravada ({type(exc).__name__}); o SQL tem o site")


async def _sql_linha(session, uid: str, site_id: str):
    return (await session.execute(select(DBSite).where(DBSite.id == site_id, DBSite.owner_uid == uid))).scalar_one_or_none()


async def _sql_guardar(uid: str, site: Dict[str, Any]) -> None:
    """Grava (ou regrava) o site inteiro no SQL."""
    async with AsyncSessionLocal() as session:
        row = await _sql_linha(session, uid, site["id"])
        dados = {k: (site.get(k) if site.get(k) is not None else "") for k in _CAMPOS if k != "id"}
        if row is None:
            session.add(DBSite(owner_uid=uid, id=site["id"], **dados))
        else:
            for k, v in dados.items():
                setattr(row, k, v)
        await session.commit()


async def contar_sites(uid: str) -> int:
    """Quantos sites o usuario ja tem. Base para a cota do plano."""
    return len(await list_sites(uid))


async def html_publico(slug: str) -> Optional[str]:
    """O HTML de um site pelo apelido, sem login.

    E o que faz a venda acontecer: o dono da padaria abre o link no celular e ve o site pronto. Devolve so o HTML.
    SQL primeiro; sem ele, o indice do Firestore (sites antigos), e o site achado la passa a morar no SQL.
    """
    if not slug:
        return None
    async with AsyncSessionLocal() as session:
        row = (await session.execute(select(DBSite).where(DBSite.slug == slug))).scalars().first()
        if row is not None and (row.html or "").strip():
            return row.html
    if firestore_db is None:
        return None
    try:
        ponteiro = firestore_db.collection("sites_publicos").document(slug).get()
        if not ponteiro.exists:
            return None
        dados = ponteiro.to_dict() or {}
        uid, site_id = dados.get("uid", ""), dados.get("site_id", "")
        site = _fs_ler(uid, site_id)
        if not site:
            return None
        await _sql_guardar(uid, {**site, "id": site_id})
        return site.get("html")
    except Exception as exc:
        print(f"Falha ao ler site publico no Firestore: {exc}")
        return None


async def garantir_apelido(uid: str, site: Dict[str, Any]) -> Dict[str, Any]:
    """Da apelido a um site criado antes desta funcionalidade existir."""
    if site.get("slug"):
        return site
    completo = await get_site(uid, site["id"]) or site
    novo = apelido(site.get("company", "") or completo.get("company", ""))
    completo = {**completo, "slug": novo}
    await _sql_guardar(uid, completo)
    _fs_gravar(uid, completo, {"slug": novo})
    site["slug"] = novo
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
    await _sql_guardar(uid, site)      # se falhar aqui, a criação falha de verdade (nada de "criado" que não existe)
    _fs_gravar(uid, site)
    return site


async def update_site(
    uid: str, site_id: str, company: str, html: str, template: str = "",
    builder_data: str = "", marcar_edicao: bool = True,
) -> Optional[Dict[str, Any]]:
    """Regrava um site que ja existe (editar não gasta vaga). None quando o site nao e do usuario."""
    _validar(html, builder_data)
    atual = await get_site(uid, site_id)
    if atual is None:
        return None
    mudancas = {
        "company": company or atual.get("company") or "Site sem nome",
        "template": template or atual.get("template") or "",
        "html": html,
        "builder_data": builder_data,
        "updated_at": _now() if marcar_edicao else (atual.get("updated_at") or ""),
    }
    novo = {**atual, **mudancas, "id": site_id}
    if not novo.get("slug"):
        novo["slug"] = apelido(novo["company"])
    await _sql_guardar(uid, novo)
    _fs_gravar(uid, novo, {**mudancas, "slug": novo["slug"]})
    return novo


async def list_sites(uid: str) -> List[Dict[str, Any]]:
    """Lista sem o HTML. Junta o SQL com os sites antigos que só existem no Firestore."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBSite).where(DBSite.owner_uid == uid))
        itens = {r.id: _row_to_dict(r, include_html=False) for r in result.scalars().all()}
    for s in _fs_listar(uid):
        if s.get("id") and s["id"] not in itens:
            # site que só existia no Firestore: passa a morar no SQL (assim o link público dele abre mesmo sem o índice antigo)
            if str(s.get("html") or "").strip():
                try:
                    await _sql_guardar(uid, s)
                except Exception as exc:
                    print(f"Não copiou o site {s['id']} para o SQL: {type(exc).__name__}")
            itens[s["id"]] = {k: v for k, v in s.items() if k not in ("html", "builder_data")}
    return sorted(itens.values(), key=lambda s: s.get("created_at") or "", reverse=True)


async def get_site(uid: str, site_id: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        row = await _sql_linha(session, uid, site_id)
        if row is not None:
            return _row_to_dict(row)
    antigo = _fs_ler(uid, site_id)
    if antigo:
        antigo = {**antigo, "id": site_id}
        try:
            await _sql_guardar(uid, antigo)   # passa a morar no SQL
        except Exception as exc:
            print(f"Não copiou o site antigo para o SQL: {type(exc).__name__}")
        return antigo
    return None


async def delete_site(uid: str, site_id: str) -> bool:
    apagou = False
    slug = ""
    async with AsyncSessionLocal() as session:
        row = await _sql_linha(session, uid, site_id)   # o filtro por owner_uid impede apagar o site de outro usuario
        if row is not None:
            slug = row.slug or ""
            await session.delete(row)
            await session.commit()
            apagou = True
    if firestore_db is not None:
        try:
            ref = _fs_sites(uid).document(site_id)
            doc = ref.get()
            if doc.exists:
                slug = slug or (doc.to_dict() or {}).get("slug", "")
                ref.delete()
                apagou = True
        except Exception as exc:
            print(f"Firestore: não apagou a cópia do site: {type(exc).__name__}")
    # o apelido morre junto: link vivo apontando para site apagado e pior do que link quebrado
    _esquecer_apelido(slug)
    return apagou
