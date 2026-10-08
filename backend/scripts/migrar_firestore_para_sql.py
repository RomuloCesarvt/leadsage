"""Copia os dados do Firestore para o banco SQL (Postgres/Supabase).

Rode UMA vez, depois de apontar o DATABASE_URL para o Supabase e antes de ligar
FIRESTORE_DESLIGADO=1 na Vercel. Pode rodar de novo: cada registro e gravado por
cima (nao duplica). O Firestore so e LIDO, nunca alterado.

    # 1) puxe as variaveis de producao para um arquivo local (NAO versione esse arquivo)
    npx vercel env pull .env.migracao --environment production
    # 2) simule: so conta o que seria copiado
    python scripts/migrar_firestore_para_sql.py --env .env.migracao --simular
    # 3) copie de verdade
    python scripts/migrar_firestore_para_sql.py --env .env.migracao

O arquivo .env.migracao precisa ter FIREBASE_SERVICE_ACCOUNT_JSON e DATABASE_URL.
Se o Firestore responder "429 Quota exceeded", espere a cota voltar (cerca de 4h da
manha, horario de Brasilia) e rode de novo.
"""
import argparse
import asyncio
import os
import sys
import uuid
from datetime import datetime
from typing import Any, Callable, Dict, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _carregar_env(caminho: str) -> None:
    from dotenv import dotenv_values
    for k, v in dotenv_values(caminho).items():
        if v is not None:
            os.environ[k] = v


def _dict(doc) -> Dict[str, Any]:
    return doc.to_dict() or {}


async def migrar(fs, simular: bool = False, aviso: Callable[[str], None] = print) -> Dict[str, int]:
    """Copia tudo. `fs` e um cliente do Firestore (ou um falso, nos testes)."""
    from sqlalchemy import select

    from app import integrations_store, profile_store
    from app.database import (AsyncSessionLocal, DBCredito, DBCreditoHistorico, DBDocument, DBRobo, DBSite,
                              init_db)

    if not simular:
        await init_db()
    n: Dict[str, int] = {}

    def contar(nome: str) -> None:
        n[nome] = n.get(nome, 0) + 1

    async def robo(chave: str, uid: str, tipo: str, dados: Dict[str, Any]) -> None:
        contar(tipo)
        if simular:
            return
        async with AsyncSessionLocal() as s:
            linha = (await s.execute(select(DBRobo).where(DBRobo.chave == chave))).scalar_one_or_none()
            quando = str(dados.get("atualizado") or dados.get("em") or datetime.now().isoformat())
            if linha:
                linha.data, linha.atualizado = dados, quando
            else:
                s.add(DBRobo(chave=chave, uid=uid, tipo=tipo, data=dados, atualizado=quando))
            await s.commit()

    # ---- raiz: canais do robo, ativos (chave do Conector, paginas), exclusoes da Meta
    for doc in fs.collection("robo_canais").stream():
        d = _dict(doc)
        await robo(f"canal:{doc.id}", d.get("uid", ""), "canal", d)
    for doc in fs.collection("robo_ativos").stream():
        d = _dict(doc)
        await robo(f"ativo:{doc.id}", d.get("uid", ""), "ativo", d)
    for doc in fs.collection("exclusoes_meta").stream():
        await robo(f"exclusao:{doc.id}", "", "exclusao", _dict(doc))

    # ---- por usuario
    usuarios = list(fs.collection("users").stream())
    aviso(f"{len(usuarios)} usuario(s) no Firestore")
    for u in usuarios:
        uid, d = u.id, _dict(u)
        contar("usuarios")

        perfil = d.get("profile")
        if perfil and not simular:
            await profile_store._save_sqlite(uid, dict(perfil))
        if perfil:
            contar("perfis")
        if d.get("integrations"):
            contar("integracoes")
            if not simular:
                await integrations_store._save_sqlite(uid, dict(d["integrations"]))

        # creditos e historico
        if "credits" in d or d.get("role"):
            contar("creditos")
            if not simular:
                async with AsyncSessionLocal() as s:
                    linha = (await s.execute(select(DBCredito).where(DBCredito.uid == uid))).scalar_one_or_none()
                    if linha is None:
                        s.add(DBCredito(uid=uid, credits=int(d.get("credits") or 0), role=d.get("role") or "user",
                                        created_at=str(d.get("createdAt") or datetime.now().isoformat())))
                    else:
                        linha.credits, linha.role = int(d.get("credits") or 0), d.get("role") or linha.role
                    await s.commit()
        for h in fs.collection("users").document(uid).collection("history").stream():
            contar("historico_creditos")
            if simular:
                continue
            x = _dict(h)
            async with AsyncSessionLocal() as s:
                existe = (await s.execute(select(DBCreditoHistorico).where(DBCreditoHistorico.id == f"fs_{uid}_{h.id}"))).scalar_one_or_none()
                if existe is None:
                    s.add(DBCreditoHistorico(id=f"fs_{uid}_{h.id}", uid=uid, description=str(x.get("description") or ""),
                                             amount=int(x.get("amount") or 0), type=str(x.get("type") or ""),
                                             timestamp=str(x.get("timestamp") or "")))
                    await s.commit()

        # subcolecoes que viram linhas da tabela "robo"
        for sub, tipo, prefixo in (("pipeline", "pipeline", "pipeline"), ("fila_envio", "fila", "fila"),
                                   ("robo_conversas", "conversa", "conversa"), ("raio_x", "raiox", "raiox"),
                                   ("conector_saida", "saida", "saida")):
            for doc in fs.collection("users").document(uid).collection(sub).stream():
                await robo(f"{prefixo}:{uid}:{doc.id}", uid, tipo, _dict(doc))

        # sites
        colunas_site = {c.name for c in DBSite.__table__.columns}
        for doc in fs.collection("users").document(uid).collection("sites").stream():
            contar("sites")
            if simular:
                continue
            x = _dict(doc)
            registro = {k: v for k, v in x.items() if k in colunas_site}
            registro.update({"id": x.get("id") or doc.id, "owner_uid": uid})
            async with AsyncSessionLocal() as s:
                await s.merge(DBSite(**registro))
                await s.commit()

        # documentos (propostas e contratos)
        colunas_doc = {c.name for c in DBDocument.__table__.columns}
        for doc in fs.collection("users").document(uid).collection("documents").stream():
            contar("documentos")
            if simular:
                continue
            x = _dict(doc)
            registro = {k: v for k, v in x.items() if k in colunas_doc}
            registro.update({"id": x.get("id") or doc.id, "owner_uid": uid})
            async with AsyncSessionLocal() as s:
                await s.merge(DBDocument(**registro))
                await s.commit()

    return n


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", default="", help="arquivo com FIREBASE_SERVICE_ACCOUNT_JSON e DATABASE_URL")
    ap.add_argument("--simular", action="store_true", help="so conta, nao grava")
    args = ap.parse_args()
    if args.env:
        _carregar_env(args.env)
    if not os.getenv("DATABASE_URL"):
        print("Falta DATABASE_URL (a conexao do Supabase).")
        return 2
    if not os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"):
        print("Falta FIREBASE_SERVICE_ACCOUNT_JSON (para ler o Firestore).")
        return 2
    os.environ.pop("FIRESTORE_DESLIGADO", None)   # aqui o Firestore precisa estar ligado para ser lido
    from app.firebase_config import db as fs
    if fs is None:
        print("Nao consegui abrir o Firestore. Confira a credencial.")
        return 2
    try:
        n = asyncio.run(migrar(fs, simular=args.simular))
    except Exception as exc:
        if "429" in str(exc) or "uota" in str(exc):
            print("O Firestore esta sem cota agora. Tente de novo depois das 4h da manha (Brasilia).")
            return 3
        raise
    print(("SIMULACAO: " if args.simular else "COPIADO: ") + ", ".join(f"{k}={v}" for k, v in sorted(n.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
