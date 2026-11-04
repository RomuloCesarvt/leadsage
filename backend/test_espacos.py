"""Espaços de trabalho por modo: o que é de um modo nunca aparece no outro; o que é da conta é compartilhado.
Rodar: cd backend && python -m pytest -q test_espacos.py"""
from app import espaco


def test_chaves_do_espaco():
    assert espaco.do_modo("u1", "agencia") == "u1" and espaco.do_modo("u1", "") == "u1"      # agência: a chave de sempre, nada é movido
    assert espaco.do_modo("u1", "empresa") == "u1~empresa"
    assert espaco.conta("u1~empresa") == "u1" and espaco.conta("u1") == "u1"
    assert espaco.do_modo("u1~empresa", "agencia") == "u1"                                       # nunca acumula sufixo
    assert espaco.modo_do_espaco("u1~empresa") == "empresa" and espaco.modo_do_espaco("u1") == "agencia"


def _lead(i, nome):
    return {"id": i, "name": nome, "company": nome, "niche": "Clínicas", "location": "Botucatu, SP"}


def test_pipeline_de_um_modo_nao_aparece_no_outro(client, com_plano):
    com_plano("agencia")
    cab_a, cab_e = {"X-Modo": "agencia"}, {"X-Modo": "empresa"}
    r = client.post("/api/pipeline/sync", json={"leads": [_lead("L1", "Clínica da Agência")]}, headers=cab_a)
    assert r.status_code == 200, r.text
    client.post("/api/pipeline/sync", json={"leads": [_lead("L2", "Clínica da Empresa")]}, headers=cab_e)
    def nomes(cab):
        itens = client.get("/api/pipeline", headers=cab).json().get("itens", [])
        return {(i.get("lead") or {}).get("company") for i in itens}
    assert nomes(cab_a) == {"Clínica da Agência"}
    assert nomes(cab_e) == {"Clínica da Empresa"}
    assert nomes({}) == {"Clínica da Agência"}                       # sem cabeçalho = agência (apps antigos continuam iguais)


def test_visitas_sao_do_modo_empresa(client):
    cab_e = {"X-Modo": "empresa"}
    client.post("/api/servico/visitas", json={"cliente": "Ana", "data": "2026-11-10"}, headers=cab_e)
    assert len(client.get("/api/servico/visitas", headers=cab_e).json()["visitas"]) == 1
    assert client.get("/api/servico/visitas", headers={"X-Modo": "agencia"}).json()["visitas"] == []


def test_config_do_robo_e_separada_por_modo(client, com_plano):
    com_plano("agencia")
    client.put("/api/robo/config", json={"oferta": {"servico": "ar", "nome": "Ar-condicionado"}}, headers={"X-Modo": "empresa"})
    assert client.get("/api/robo/config", headers={"X-Modo": "empresa"}).json()["oferta"].get("servico") == "ar"
    assert client.get("/api/robo/config", headers={"X-Modo": "agencia"}).json()["oferta"].get("servico") != "ar"


def test_conta_e_compartilhada(client):
    """Perfil e créditos são da conta: valem igual nos dois modos."""
    a = client.get("/api/credits/balance", headers={"X-Modo": "agencia"}).json()
    e = client.get("/api/credits/balance", headers={"X-Modo": "empresa"}).json()
    assert a == e
    client.put("/api/profile", json={"name": "Carlos"}, headers={"X-Modo": "empresa"})
    assert client.get("/api/profile", headers={"X-Modo": "agencia"}).json()["name"] == "Carlos"
