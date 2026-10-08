"""Roda os caminhos de dados do LeadSage contra um Postgres de verdade.

Sem argumentos, sobe um Postgres embutido (pip install pgserver) numa pasta
temporaria. Com `--url postgresql://...`, usa o banco indicado (cuidado: ele cria
tabelas e grava dados de teste com prefixo "verif_").

Uso (na pasta backend):
    python scripts/verificar_postgres.py
    python scripts/verificar_postgres.py --url "postgresql://postgres.xxx:senha@host:6543/postgres"

Serve para ter certeza de que tudo que funciona no SQLite funciona no Postgres do Supabase
antes de ligar o sistema a ele: tipos, JSON, concorrencia, chaves.
"""
import argparse
import asyncio
import os
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def preparar_ambiente(url: str) -> None:
    os.environ["DATABASE_URL"] = url
    os.environ["FIRESTORE_DESLIGADO"] = "1"
    os.environ.setdefault("LEADSAGE_CREDITO_SEM_BANCO", "")


async def verificar() -> list:
    falhas: list = []

    def conferir(nome: str, condicao: bool, detalhe: str = "") -> None:
        print(("  ok   " if condicao else "  FALHOU ") + nome + (f"  [{detalhe}]" if detalhe and not condicao else ""))
        if not condicao:
            falhas.append(nome)

    from sqlalchemy import select

    from app import (conector_whatsapp as cw, credit_system as cs, documents_store, fila_envio,
                     integrations_store, pipeline_store, profile_store, raio_x, robo_store, sites_store)
    from app.database import (AsyncSessionLocal, DBLead, DBOrder, DBSearchHistory, EH_POSTGRES, chave_do_lead,
                              init_db)

    print(f"Banco: {'Postgres' if EH_POSTGRES else 'SQLite (nao e Postgres!)'}")
    conferir("e Postgres", EH_POSTGRES)
    t0 = time.time()
    await init_db()
    print(f"  tabelas criadas em {time.time() - t0:.1f}s")
    uid = f"verif_{int(time.time())}"

    print("Creditos")
    conferir("primeiro uso: 50 - 2 = 48", await cs.check_and_deduct_credits(uid, 2) == 48)
    conferir("saldo", (await cs.get_user_balance(uid))["credits"] == 48)
    conferir("recarga soma", await cs.add_credits(uid, 12, "teste") == 60)
    outros = f"{uid}_b"
    await cs.add_credits(outros, 5, "inicio")
    r = await asyncio.gather(*[cs.check_and_deduct_credits(outros, 1) for _ in range(12)])
    conferir("12 cobrancas simultaneas gastam so os 5 creditos", sum(1 for x in r if x is not None) == 5,
             str(r))
    conferir("saldo final zero", (await cs.get_user_balance(outros))["credits"] == 0)

    print("Perfil e plano")
    await profile_store.save_profile(uid, {"name": "Teste", "company_name": "Empresa Teste", "product_description": "Site"})
    await profile_store.conceder_plano(uid, "Pro Vitalício", 50, "pro")
    p = await profile_store.get_profile(uid)
    conferir("perfil e plano gravados", p.company_name == "Empresa Teste" and p.plan_id == "pro" and (p.sites_quota or 0) >= 50)

    print("Robo: canal, chave do Conector, conversa")
    canal = await robo_store.salvar_canal(uid, "t@exemplo.com", {"ativo": True, "objetivo": "agendar"})
    chave = await cw.criar_chave(canal)
    await robo_store.registrar_ativo("conector", canal["cw_hash"], uid, canal["gancho"])
    canal = await robo_store.substituir_canal(uid, canal)
    achado = await cw.canal_da_chave(chave)
    conferir("a chave do Conector acha o dono", bool(achado) and achado["uid"] == uid)
    conferir("chave errada nao acha", await cw.canal_da_chave("lsc_" + "z" * 43) is None)
    conversa = {"id": "whatsapp_5514998003784", "canal": "whatsapp", "contato": "5514998003784", "nome": "Ana",
                "mensagens": [{"de": "contato", "texto": "Oi", "em": robo_store.agora()}], "atualizado": robo_store.agora()}
    await robo_store.salvar_conversa(uid, conversa)
    conferir("conversa volta igual", (await robo_store.obter_conversa(uid, conversa["id"]))["mensagens"][0]["texto"] == "Oi")
    conferir("lista de conversas", len(await robo_store.listar_conversas(uid)) == 1)
    await cw.enfileirar_resposta(canal, "5514998003784", "Oi, tudo bem?")
    t = await cw.tarefas(dict(canal))
    conferir("resposta enfileirada sai nas tarefas", len(t["tarefas"]) == 1 and t["tarefas"][0]["tipo"] == "resposta")

    print("Funil e fila de envio")
    await pipeline_store.registrar(uid, {"id": "L1", "company": "Padaria A", "phone": "14998003784"})
    await pipeline_store.mover(uid, "L1", "Contato Enviado", motivo="teste")
    itens = await pipeline_store.listar(uid)
    conferir("funil guarda a etapa", len(itens) == 1 and itens[0]["etapa"] == "Contato Enviado")
    await fila_envio._gravar(uid, {"id": "f_L2", "lead_id": "L2", "nome": "Padaria B", "canal": "whatsapp", "assunto": "",
                                  "texto": "Oi!", "contato": {"phone": "14998003785"}, "status": "pendente", "criado": robo_store.agora()})
    conferir("fila guarda e lista", len(await fila_envio.listar(uid)) == 1)

    print("Sites, documentos, integracoes, raio-x")
    site = await sites_store.create_site(uid, "Padaria Teste", "<html><body>oi</body></html>", "forno", "L1")
    conferir("site criado e listado", len(await sites_store.list_sites(uid)) == 1)
    pub = await sites_store.html_publico(site["slug"])
    conferir("site publico serve o HTML pelo apelido", bool(pub) and "oi" in pub)
    conferir("conta de sites", await sites_store.contar_sites(uid) == 1)
    doc = await documents_store.create_document(uid, "proposta", "Proposta teste", "conteudo")
    conferir("documento criado", len(await documents_store.list_documents(uid)) == 1 and bool(doc))
    await integrations_store.save_integrations(uid, {"webhook_url": "https://exemplo.test/hook"})
    conferir("integracoes gravadas", (await integrations_store.get_integrations(uid)).get("webhook_url") == "https://exemplo.test/hook")
    await raio_x.gravar_cache(uid, "place1", {"gerado_em_ts": time.time(), "nota": 4.8})
    conferir("raio-x em cache", (await raio_x.ler_cache(uid, "place1") or {}).get("nota") == 4.8)

    print("Leads por dono, historico, pedidos")
    async with AsyncSessionLocal() as s:
        for dono in (uid, f"{uid}_b"):
            await s.merge(DBLead(id=chave_do_lead(dono, "ChIJ1"), name=f"Padaria de {dono}", owner_uid=dono, search_id=f"s_{dono}",
                                 hooks=["nota 4,8"], missingDigitalAssets=["website"], latitude=-22.88))
            s.add(DBSearchHistory(id=f"s_{dono}", niche="Padarias", location="Botucatu", total_leads=1,
                                  timestamp="2026-10-08T10:00:00", leads_preview=["x"], owner_uid=dono))
        s.add(DBOrder(id=f"o_{uid}", owner_uid=uid, package_id="pro", tipo="plano", credits=500, sites=50,
                      amount_cents=9700, status="pending", created_at="2026-10-08T10:00:00"))
        await s.commit()
        meus = (await s.execute(select(DBLead).where(DBLead.owner_uid == uid))).scalars().all()
        conferir("cada dono ve so o seu lead", len(meus) == 1 and meus[0].hooks == ["nota 4,8"])
        hist = (await s.execute(select(DBSearchHistory).where(DBSearchHistory.owner_uid == uid))).scalars().all()
        conferir("historico por dono", len(hist) == 1)
    return falhas


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="")
    args = ap.parse_args()
    servidor = None
    url = args.url
    if not url:
        import pgserver
        pasta = tempfile.mkdtemp(prefix="pg_leadsage_")
        servidor = pgserver.get_server(pasta)
        url = servidor.get_uri()
        print(f"Postgres embutido em {pasta}")
    preparar_ambiente(url)
    try:
        falhas = asyncio.run(verificar())
    finally:
        if servidor is not None:
            servidor.cleanup()
    print("\nRESULTADO:", "tudo certo" if not falhas else f"{len(falhas)} falha(s): {falhas}")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
