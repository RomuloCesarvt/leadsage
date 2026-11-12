import asyncio

import pytest

from app import agente_ia, robo_store

ARM = {}


@pytest.fixture(autouse=True)
def banco(monkeypatch):
    ARM.clear()

    async def get(k): return ARM.get(k)
    async def put(k, uid, tipo, d): ARM[k] = dict(d)
    monkeypatch.setattr(robo_store, "_sql_get", get)
    monkeypatch.setattr(robo_store, "_sql_put", put)


def leads(n, whatsapp=True):
    return [{"id": f"p{i}", "company": f"Fisio {i}", "whatsapp": whatsapp, "phone": "5519999", "email": "a@b.com" if i % 2 else "", "site_status": "none"} for i in range(n)]


def ferramentas(n=100, saldo=480, chamadas=None):
    chamadas = chamadas if chamadas is not None else []
    base = leads(n)

    async def buscar(nicho, local, qtd):
        chamadas.append(("buscar", nicho, local, qtd))
        return {"search_id": "s1", "credits_consumed": min(n, qtd), "leads": base[:qtd]}

    async def sal(): return saldo
    async def da_busca(sid): return base if sid == "s1" else []

    async def lote(ls):
        chamadas.append(("lote", len(ls)))
        return {"resultados": [{"lead_id": l["id"], "resultado": "para revisar"} for l in ls]}

    async def fila(): return {"rascunhos": 7, "pendentes": 0, "enviados": 1}
    return agente_ia.Ferramentas(buscar, sal, da_busca, lote, fila)


def llm_de(*respostas):
    fila = list(respostas)
    return lambda prompt: fila.pop(0)


def run(c): return asyncio.run(c)


def test_busca_exige_confirmacao_e_so_gasta_ao_confirmar():
    chamadas = []
    f = ferramentas(chamadas=chamadas)
    llm = llm_de({"fala": "ok", "acao": {"nome": "buscar_leads", "args": {"nicho": "fisioterapeuta", "local": "Campinas, SP", "quantidade": 100}}})
    r = run(agente_ia.conversar("u1", "busque fisioterapeutas em Campinas, 100 leads", "m_profissional", False, llm, f))
    assert r["pendente"]["quantidade"] == 100 and r["pendente"]["custo"] == 100
    assert chamadas == []                                    # nada gastou ainda
    r = run(agente_ia.confirmar("u1", True, "m_profissional", False, f))
    assert chamadas == [("buscar", "fisioterapeuta", "Campinas, SP", 100)]
    assert r["pendente"] is None and r["nao_lidas"] == 1
    assert "Trouxe" in r["mensagens"][-1]["texto"] and r["mensagens"][-1]["cartao"]["tipo"] == "busca"


def test_cancelar_nao_gasta():
    chamadas = []
    f = ferramentas(chamadas=chamadas)
    run(agente_ia.conversar("u1", "busca x em y", "start", False, llm_de({"fala": "", "acao": {"nome": "buscar_leads", "args": {"nicho": "x", "local": "y", "quantidade": 10}}}), f))
    r = run(agente_ia.confirmar("u1", False, "start", False, f))
    assert chamadas == [] and "cancelei" in r["mensagens"][-1]["texto"]


def test_quantidade_e_limitada_a_100_e_saldo_curto_nao_propoe():
    f = ferramentas(saldo=50)
    r = run(agente_ia.conversar("u1", "x", "start", False, llm_de({"fala": "", "acao": {"nome": "buscar_leads", "args": {"nicho": "a", "local": "b", "quantidade": 5000}}}), f))
    assert r["pendente"] is None and "tem 50" in r["mensagens"][-1]["texto"].replace("você tem 50", "tem 50")
    f2 = ferramentas(saldo=500)
    r = run(agente_ia.conversar("u2", "x", "start", False, llm_de({"fala": "", "acao": {"nome": "buscar_leads", "args": {"nicho": "a", "local": "b", "quantidade": 5000}}}), f2))
    assert r["pendente"]["quantidade"] == 100


def test_fila_em_lotes_para_revisao_e_avisa_no_fim():
    chamadas = []
    f = ferramentas(n=20, chamadas=chamadas)
    run(agente_ia.conversar("u1", "x", "m_escala", False, llm_de({"fala": "", "acao": {"nome": "buscar_leads", "args": {"nicho": "a", "local": "b", "quantidade": 20}}}), f))
    run(agente_ia.confirmar("u1", True, "m_escala", False, f))
    r = run(agente_ia.conversar("u1", "coloque na fila", "m_escala", False, llm_de({"fala": "", "acao": {"nome": "preparar_fila", "args": {}}}), f))
    assert r["tarefa"]["status"] == "rodando" and r["tarefa"]["total"] == 20
    passos = 0
    while r["tarefa"]["status"] == "rodando":
        r = run(agente_ia.continuar("u1", "m_escala", False, f)); passos += 1
    assert passos == 3 and [c for c in chamadas if c[0] == "lote"] == [("lote", 8), ("lote", 8), ("lote", 4)]
    assert r["tarefa"]["para_revisar"] == 20 and "20 mensagens" in r["mensagens"][-1]["texto"] and r["mensagens"][-1]["cartao"]["tipo"] == "fila"
    assert r["nao_lidas"] == 2


def test_cota_do_dia_bloqueia_e_nao_chama_a_ia():
    f = ferramentas()
    chamou = []
    def llm(p): chamou.append(1); return {"fala": "oi", "acao": None}
    for _ in range(5):                                     # prévia: 5 por dia
        run(agente_ia.conversar("u1", "oi", "previa", False, llm, f))
    r = run(agente_ia.conversar("u1", "oi", "previa", False, llm, f))
    assert r["sem_cota"] and len(chamou) == 5
    v = run(agente_ia.visao("u1", "previa", False))
    assert v["cota"]["usados"] == 5 and v["cota"]["restantes"] == 0 and v["cota"]["volta_em"].endswith("-03:00")


def test_cota_e_da_conta_nao_do_modo():
    f = ferramentas()
    llm = lambda p: {"fala": "oi", "acao": None}
    for _ in range(5):
        run(agente_ia.conversar("u1", "oi", "previa", False, llm, f, conta="u1"))
    r = run(agente_ia.conversar("u1~empresa", "oi", "previa", False, llm, f, conta="u1"))
    assert r["sem_cota"]


def test_admin_nao_tem_limite_e_dia_seguinte_zera(monkeypatch):
    assert agente_ia.limite_do_plano("previa", True) is None
    f = ferramentas()
    llm = lambda p: {"fala": "oi", "acao": None}
    for _ in range(5):
        run(agente_ia.conversar("u1", "oi", "previa", False, llm, f))
    monkeypatch.setattr(agente_ia, "dia_de_hoje", lambda: "2099-01-01")
    r = run(agente_ia.conversar("u1", "oi", "previa", False, llm, f))
    assert not r.get("erro")


def test_ia_fora_do_ar_nao_gasta_cota():
    f = ferramentas()
    def llm(p): raise RuntimeError("503")
    r = run(agente_ia.conversar("u1", "oi", "start", False, llm, f))
    assert "muita demanda" in r["mensagens"][-1]["texto"] and r["cota"]["usados"] == 0


def test_acao_desconhecida_ou_envio_nao_existe():
    f = ferramentas()
    r = run(agente_ia.conversar("u1", "envie tudo", "start", False, llm_de({"fala": "Enviando!", "acao": {"nome": "enviar_mensagens", "args": {}}}), f))
    assert r["tarefa"] is None and r["pendente"] is None


def test_ver_leads_e_fila_consultam_sem_gastar():
    chamadas = []
    f = ferramentas(n=10, chamadas=chamadas)
    run(agente_ia.conversar("u1", "x", "start", False, llm_de({"fala": "", "acao": {"nome": "buscar_leads", "args": {"nicho": "a", "local": "b", "quantidade": 10}}}), f))
    run(agente_ia.confirmar("u1", True, "start", False, f))
    r = run(agente_ia.conversar("u1", "como está a fila?", "start", False, llm_de({"fala": "Veja:", "acao": {"nome": "ver_fila", "args": {}}}), f))
    assert "7 para revisar" in r["mensagens"][-1]["texto"]
