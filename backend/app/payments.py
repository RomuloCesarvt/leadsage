"""Compra de créditos.

A regra que organiza tudo aqui: **o crédito nunca é concedido pelo
frontend**. Antes, `POST /api/credits/topup` chamava `add_credits` com o
valor que viesse no corpo do request — qualquer pessoa logada podia
pedir 999999 créditos e recebê-los.

O fluxo correto tem quatro passos, e o terceiro é o único que mexe no
saldo:

1. o cliente escolhe um pacote (só o id viaja; o preço mora aqui)
2. o backend cria um pedido `pending` e uma cobrança no provedor
3. o provedor confirma por **webhook assinado** → crédito liberado
4. o frontend apenas consulta o pedido para mostrar o resultado

O passo 3 é assinado porque, sem isso, qualquer um poderia enviar um
POST fingindo ser o provedor.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app.credit_system import add_credits
from app.database import AsyncSessionLocal, DBOrder

# Catálogo no servidor. O cliente manda só o `id`: preço que viaja pelo
# request é preço que o cliente escolhe.
#
# Os planos são VITALÍCIOS — pagamento único, não assinatura mensal. Os
# valores vêm da tela de Assinatura, que já os definia.
PLANS: List[Dict[str, Any]] = [
    {
        "id": "start",
        "tipo": "plano",
        "nome": "Start Vitalício",
        "credits": 150,
        "sites": 10,
        "amount_cents": 6700,
        "descricao": "Acesso vitalício, 150 leads e 10 sites incluídos.",
        "destaque": False,
    },
    {
        "id": "pro",
        "tipo": "plano",
        "nome": "Pro Vitalício",
        "credits": 500,
        # A tela não informava a cota de sites do Pro — fica entre os 10
        # do Start e os 200 da Agência até você definir.
        "sites": 50,
        "amount_cents": 9700,
        "descricao": "Acesso vitalício, 500 leads e 50 sites incluídos.",
        "destaque": True,
    },
    {
        "id": "agencia",
        "tipo": "plano",
        "nome": "Agência Vitalício",
        "credits": 3000,
        "sites": 200,
        "amount_cents": 19700,
        "descricao": "Acesso vitalício, 3.000 leads e 200 sites incluídos.",
        "destaque": False,
    },
]

# Recarga avulsa, para quem já tem plano e estourou a cota.
PACKAGES: List[Dict[str, Any]] = [
    {
        "id": "recarga_100",
        "tipo": "recarga",
        "nome": "100 créditos",
        "credits": 100,
        "sites": 0,
        "amount_cents": 4900,
        "descricao": "100 leads adicionais.",
        "destaque": False,
    },
    {
        "id": "recarga_250",
        "tipo": "recarga",
        "nome": "250 créditos",
        "credits": 250,
        "sites": 0,
        "amount_cents": 9900,
        "descricao": "250 leads adicionais.",
        "destaque": True,
    },
    {
        "id": "recarga_600",
        "tipo": "recarga",
        "nome": "600 créditos",
        "credits": 600,
        "sites": 0,
        "amount_cents": 19900,
        "descricao": "600 leads adicionais.",
        "destaque": False,
    },
]

ITENS = PLANS + PACKAGES

STATUS_VALIDOS = ("pending", "paid", "failed", "expired")


def achar_pacote(package_id: str) -> Optional[Dict[str, Any]]:
    return next((p for p in ITENS if p["id"] == package_id), None)


def _com_preco(item: Dict[str, Any]) -> Dict[str, Any]:
    return {**item, "preco": f"R$ {item['amount_cents'] / 100:.2f}".replace(".", ",")}


def catalogo() -> Dict[str, List[Dict[str, Any]]]:
    """Preço já formatado, para a tela não fazer conta."""
    return {
        "planos": [_com_preco(p) for p in PLANS],
        "recargas": [_com_preco(p) for p in PACKAGES],
    }


def _agora() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _para_dict(row: DBOrder) -> Dict[str, Any]:
    return {
        "id": row.id,
        "package_id": row.package_id,
        "credits": row.credits,
        "sites": row.sites,
        "tipo": row.tipo,
        "amount_cents": row.amount_cents,
        "currency": row.currency,
        "status": row.status,
        "provider": row.provider,
        "created_at": row.created_at,
        "paid_at": row.paid_at,
    }


async def criar_pedido(uid: str, package_id: str, provider: str = "") -> Dict[str, Any]:
    """Cria o pedido pendente. Não concede crédito nenhum."""
    pacote = achar_pacote(package_id)
    if not pacote:
        raise ValueError(f"Pacote desconhecido: {package_id}")

    pedido = DBOrder(
        id=f"ord_{uuid.uuid4().hex[:12]}",
        owner_uid=uid,
        package_id=pacote["id"],
        credits=pacote["credits"],
        sites=pacote.get("sites", 0),
        tipo=pacote.get("tipo", "recarga"),
        amount_cents=pacote["amount_cents"],
        currency="BRL",
        status="pending",
        provider=provider or None,
        created_at=_agora(),
    )
    async with AsyncSessionLocal() as session:
        session.add(pedido)
        await session.commit()
    return _para_dict(pedido)


async def obter_pedido(uid: str, order_id: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(DBOrder).where(DBOrder.id == order_id, DBOrder.owner_uid == uid)
        )
        row = result.scalar_one_or_none()
        return _para_dict(row) if row else None


async def listar_pedidos(uid: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(DBOrder).where(DBOrder.owner_uid == uid).order_by(DBOrder.created_at.desc())
        )
        return [_para_dict(r) for r in result.scalars().all()]


async def vincular_cobranca(order_id: str, provider: str, provider_ref: str) -> None:
    """Guarda o id da cobrança do provedor, para o webhook achar o pedido."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBOrder).where(DBOrder.id == order_id))
        row = result.scalar_one_or_none()
        if row:
            row.provider = provider
            row.provider_ref = provider_ref
            await session.commit()


async def confirmar_pagamento(
    provider_ref: str, provider_event: str = "", order_id: str = ""
) -> Dict[str, Any]:
    """Marca o pedido como pago e credita — uma única vez.

    Chamado apenas pelo webhook, depois da assinatura conferida.

    A idempotência importa de verdade: provedores reenviam o webhook
    quando não recebem 200, então sem isso a mesma compra creditaria
    várias vezes.
    """
    async with AsyncSessionLocal() as session:
        consulta = select(DBOrder)
        if order_id:
            consulta = consulta.where(DBOrder.id == order_id)
        else:
            consulta = consulta.where(DBOrder.provider_ref == provider_ref)

        result = await session.execute(consulta)
        pedido = result.scalar_one_or_none()

        if not pedido:
            return {"status": "ignorado", "motivo": "pedido nao encontrado"}

        if pedido.status == "paid":
            return {"status": "ja_processado", "order_id": pedido.id}

        if provider_event and pedido.provider_event == provider_event:
            return {"status": "ja_processado", "order_id": pedido.id}

        pedido.status = "paid"
        pedido.paid_at = _agora()
        pedido.provider_event = provider_event or None
        uid = pedido.owner_uid
        creditos = pedido.credits
        pid = pedido.id
        sites = pedido.sites or 0
        tipo = pedido.tipo or "recarga"
        package_id = pedido.package_id
        await session.commit()

    novo_saldo = await add_credits(uid, creditos, f"Compra: {package_id}")

    # Plano tambem concede cota de sites e marca o plano no perfil.
    if tipo == "plano":
        try:
            from app.profile_store import get_profile, save_profile

            perfil = await get_profile(uid)
            dados = perfil.model_dump()
            dados["plan"] = achar_pacote(package_id)["nome"]
            dados["sites_quota"] = (dados.get("sites_quota") or 0) + sites
            await save_profile(uid, dados)
        except Exception as exc:
            # O credito ja entrou; nao desfazer a compra por causa do perfil.
            print(f"Falha ao aplicar o plano no perfil: {exc}")

    return {
        "status": "creditado", "order_id": pid,
        "credits": creditos, "sites": sites, "saldo": novo_saldo,
    }


async def marcar_falha(provider_ref: str, motivo: str = "") -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBOrder).where(DBOrder.provider_ref == provider_ref))
        pedido = result.scalar_one_or_none()
        if pedido and pedido.status == "pending":
            pedido.status = "failed"
            await session.commit()
