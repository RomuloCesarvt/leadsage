"""Mantém os bancos de reserva com os dados do principal.

Os bancos gratuitos (Neon, Supabase...) NÃO são cópias um do outro: o sistema usa o primeiro que responde. Se o principal cair ou estourar a
cota, o reserva assume, e se ele estiver vazio todas as contas apareceriam sem perfil, plano, créditos e conversas. Esta rotina copia do
banco que está em uso para os outros, em lotes pequenos (cabe numa função serverless), sem nunca sobrescrever o que o reserva tem de mais novo.

Regras de cópia, tabela por tabela (todas têm chave primária de uma coluna):
  - linha que o reserva ainda não tem  -> copia;
  - linha que existe nos dois          -> só substitui se a tabela tem data (`atualizado`/`updated_at`) e a do principal é mais nova;
  - créditos e histórico de créditos   -> só copia o que falta (um saldo antigo nunca "volta" sobre um saldo mais novo).
"""
import time
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.dialects import postgresql, sqlite

from app.database import Base

LOTE = 150
MAXIMO_POR_TABELA = 600            # por execução: o resto fica para a próxima (o cron roda todo dia)
COLUNAS_DE_DATA = ("atualizado", "updated_at")
SO_O_QUE_FALTA = ("creditos", "creditos_historico")


def _insert(engine):
    return (postgresql if engine.dialect.name == "postgresql" else sqlite).insert


async def _estado(conexao, tabela, pk, col_data) -> Dict[Any, Optional[str]]:
    colunas = [pk] + ([col_data] if col_data is not None else [])
    linhas = (await conexao.execute(select(*colunas))).all()
    return {l[0]: (str(l[1]) if col_data is not None and l[1] is not None else None) for l in linhas}


async def copiar_entre(origem, destino, maximo_por_tabela: int = MAXIMO_POR_TABELA, tabelas: Optional[List[str]] = None) -> Dict[str, Dict[str, int]]:
    """Copia do engine `origem` para o `destino`. Devolve, por tabela, quantas linhas foram copiadas e quantas ainda faltam."""
    relatorio: Dict[str, Dict[str, int]] = {}
    for tabela in Base.metadata.sorted_tables:
        if tabelas and tabela.name not in tabelas:
            continue
        pk = list(tabela.primary_key.columns)[0]
        col_data = next((tabela.c[n] for n in COLUNAS_DE_DATA if n in tabela.c), None)
        async with origem.connect() as o, destino.connect() as d:
            no_destino = await _estado(d, tabela, pk, col_data)
            na_origem = await _estado(o, tabela, pk, col_data)
            pendentes = []
            for chave, data in na_origem.items():
                if chave not in no_destino:
                    pendentes.append(chave)
                elif tabela.name not in SO_O_QUE_FALTA and col_data is not None and data and no_destino[chave] and data > no_destino[chave]:
                    pendentes.append(chave)
            copiadas = 0
            for i in range(0, min(len(pendentes), maximo_por_tabela), LOTE):
                lote = pendentes[i:min(i + LOTE, maximo_por_tabela)]
                linhas = (await o.execute(select(tabela).where(pk.in_(lote)))).mappings().all()
                if not linhas:
                    continue
                valores = [dict(l) for l in linhas]
                ins = _insert(destino)(tabela).values(valores)
                trocar = {c.name: ins.excluded[c.name] for c in tabela.columns if c.name != pk.name}
                await d.execute(ins.on_conflict_do_update(index_elements=[pk.name], set_=trocar) if trocar else ins.on_conflict_do_nothing())
                copiadas += len(valores)
            await d.commit()
        relatorio[tabela.name] = {"copiadas": copiadas, "faltam": max(0, len(pendentes) - copiadas)}
    return relatorio


async def sincronizar(maximo_por_tabela: int = MAXIMO_POR_TABELA) -> Dict[str, Any]:
    """Do banco em uso para cada um dos outros que estiver no ar. Nunca levanta erro: um reserva fora do ar não impede os demais."""
    from app import bancos
    conj = bancos.CONJUNTO
    if len(conj.fontes) < 2:
        return {"ok": True, "motivo": "só há um banco configurado", "bancos": []}
    ativo = conj.escolher()
    saida: List[Dict[str, Any]] = []
    inicio = time.monotonic()
    for f in conj.fontes:
        if f is ativo:
            continue
        if not f.disponivel:
            saida.append({"numero": f.numero, "pulado": "fora do ar", "erro": f.ultimo_erro})
            continue
        try:
            rel = await copiar_entre(ativo.engine, f.engine, maximo_por_tabela)
            saida.append({"numero": f.numero, "tabelas": rel, "copiadas": sum(t["copiadas"] for t in rel.values()), "faltam": sum(t["faltam"] for t in rel.values())})
        except Exception as exc:
            saida.append({"numero": f.numero, "erro": f"{type(exc).__name__}: {str(exc)[:160]}"})
    return {"ok": True, "de": ativo.numero, "bancos": saida, "segundos": round(time.monotonic() - inicio, 1)}
