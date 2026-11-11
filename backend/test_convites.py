import asyncio

from app import convites, credit_system, profile_store, robo_store


def test_convite_so_vale_para_o_email_certo():
    assert convites.convite_de("VizArbtu@Gmail.com")["modo"] == "empresa"
    assert convites.convite_de("outro@x.com") is None and convites.convite_de(None) is None


def test_aplica_uma_vez_empresa_20_creditos_e_plano_completo(monkeypatch):
    mem, feitos = {}, []

    async def get(k): return mem.get(k)
    async def put(k, uid, tipo, d): mem[k] = d
    async def liberar(uid, modos): feitos.append(("modos", uid, modos))
    async def salvar(uid, d): feitos.append(("perfil", uid, d))
    async def somar(carteira, n, motivo): feitos.append(("creditos", carteira, n))
    async def plano(uid, nome, sites, pid, extra): feitos.append(("plano", uid, pid, extra["assinatura_status"]))

    monkeypatch.setattr(robo_store, "_sql_get", get)
    monkeypatch.setattr(robo_store, "_sql_put", put)
    monkeypatch.setattr(profile_store, "liberar_modos", liberar)
    monkeypatch.setattr(profile_store, "save_profile", salvar)
    monkeypatch.setattr(profile_store, "conceder_plano", plano)
    monkeypatch.setattr(credit_system, "add_credits", somar)

    assert asyncio.run(convites.aplicar("u1", "vizarbtu@gmail.com")) is True
    assert asyncio.run(convites.aplicar("u1", "vizarbtu@gmail.com")) is False        # só uma vez
    assert asyncio.run(convites.aplicar("u2", "alguem@x.com")) is False
    assert ("modos", "u1", ["empresa"]) in feitos and ("creditos", "u1~empresa", 20) in feitos       # carteira da EMPRESA, não da agência
    assert any(f[0] == "plano" and f[2] == "m_escala" and f[3] == "convite" for f in feitos)
    # 20 do convite + 20 do bônus "mais 20", cada um uma vez só (a segunda chamada não soma nada)
    assert [f[2] for f in feitos if f[0] == "creditos"] == [20, 20]


def test_bonus_entra_mesmo_com_convite_ja_usado_e_so_uma_vez(monkeypatch):
    mem, somados = {"convite:u1": {"ja": True}}, []

    async def get(k): return mem.get(k)
    async def put(k, uid, tipo, d): mem[k] = d
    async def somar(carteira, n, motivo): somados.append((carteira, n))

    monkeypatch.setattr(robo_store, "_sql_get", get)
    monkeypatch.setattr(robo_store, "_sql_put", put)
    monkeypatch.setattr(credit_system, "add_credits", somar)

    assert asyncio.run(convites.aplicar("u1", "vizarbtu@gmail.com")) is False
    assert asyncio.run(convites.aplicar("u1", "vizarbtu@gmail.com")) is False
    assert somados == [("u1~empresa", 20)]
