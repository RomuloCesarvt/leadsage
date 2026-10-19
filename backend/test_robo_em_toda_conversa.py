"""O robô em TODA conversa do WhatsApp (não só nas que ele começou): ligar/pausar em qualquer uma, e a IA para o robô quando
o outro lado é propaganda ou outro robô, guardando o motivo para a pessoa reativar."""
import pytest

from app import ai_robo, robo_service, robo_store
from test_robo import com_robo  # noqa: F401

NUMERO = "5514998000111"


_PORTAL = {}


@pytest.fixture(autouse=True)
def _no_loop_do_app(request):
    """Roda no event loop do proprio app (o engine do banco fica preso a ele), quando o teste usa o banco."""
    if "client" in request.fixturenames or "com_robo" in request.fixturenames:
        _PORTAL["c"] = request.getfixturevalue("client")
    yield
    _PORTAL.clear()


async def _aguardar(coro):
    return await coro


def _rodar(coro):
    return _PORTAL["c"].portal.call(_aguardar, coro)


def msgs(*pares):
    return [{"texto": t, "minha": minha, "quando": 1700000000 + i * 60, "id": f"m{i}"} for i, (t, minha) in enumerate(pares)]


def ia(resposta, chamadas=None):
    def gerar(prompt):
        if chamadas is not None:
            chamadas.append(prompt)
        return resposta
    return gerar


# ------------------------------------------------------------------------------------------ o classificador

def test_pessoa_curta_e_seca_nao_e_robo_e_nem_chama_a_ia():
    chamadas = []
    r = ai_robo.classificar_contato([{"de": "voce", "texto": "Oi, posso mostrar um site?"}, {"de": "contato", "texto": "não tenho interesse"}], ia({}, chamadas))
    assert r["robo"] is False and chamadas == []


def test_menu_de_atendimento_e_robo_sem_gastar_ia():
    chamadas = []
    texto = "Olá! Este é um atendimento automático.\nDigite 1 para falar com vendas\nDigite 2 para suporte\nProtocolo 2024123"
    r = ai_robo.classificar_contato([{"de": "contato", "texto": texto}], ia({}, chamadas))
    assert r["robo"] is True and chamadas == []


def test_propaganda_longa_com_link_vai_para_a_ia_decidir():
    chamadas = []
    texto = "🔥 SUPER PROMOÇÃO só hoje! Compre agora e ganhe 50% de desconto em toda a loja: https://loja.example/oferta Aproveite!"
    r = ai_robo.classificar_contato([{"de": "contato", "texto": texto}], ia({"robo": True, "motivo": "propaganda de uma loja"}, chamadas))
    assert len(chamadas) == 1 and "CONTATO:" in chamadas[0]
    assert r == {"robo": True, "motivo": "propaganda de uma loja", "usou_ia": True}


def test_ia_que_diz_pessoa_mantem_o_robo_ligado():
    texto = "Olha esse link que você me mandou: https://meusite.example/abc, ficou bom!"
    r = ai_robo.classificar_contato([{"de": "contato", "texto": texto}], ia({"robo": False, "motivo": ""}))
    assert r["robo"] is False


def test_ia_fora_do_ar_nao_decide_nada():
    def quebra(prompt):
        raise RuntimeError("limite")
    texto = "Olha esse link que você me mandou: https://meusite.example/abc"
    assert ai_robo.classificar_contato([{"de": "contato", "texto": texto}], quebra) is None
    assert ai_robo.classificar_contato([{"de": "contato", "texto": texto}], ia("lixo")) is None


# ------------------------------------------------------------------------------------------ a conversa

def test_conversa_antiga_entra_com_o_robo_pausado_e_a_pessoa_liga(com_robo):
    c = _rodar(robo_service.avaliar_chat("alice", NUMERO, "Padaria Estrela", msgs(("Bom dia!", True), ("Bom dia, tudo bem?", False)), None, ia({})))
    assert c["robo_ativo"] is False and c["canal"] == "whatsapp" and len(c["mensagens"]) == 2
    assert [m["de"] for m in c["mensagens"]] == ["voce", "contato"]
    c = _rodar(robo_service.avaliar_chat("alice", NUMERO, "Padaria Estrela", [], True, ia({})))
    assert c["robo_ativo"] is True and c["contato_robo"] is False
    c = _rodar(robo_service.avaliar_chat("alice", NUMERO, "Padaria Estrela", [], False, ia({})))
    assert c["robo_ativo"] is False
    salva = _rodar(robo_store.obter_conversa("alice", robo_store.id_da_conversa("whatsapp", NUMERO)))
    assert salva["robo_ativo"] is False and len(salva["mensagens"]) == 2   # nao duplica o historico


def test_propaganda_para_o_robo_com_motivo_e_a_pessoa_pode_reativar(com_robo):
    chamadas = []
    texto = "🔥 SUPER PROMOÇÃO só hoje! Compre agora e ganhe 50% de desconto: https://loja.example/oferta"
    c = _rodar(robo_service.avaliar_chat("alice", NUMERO, "Loja X", msgs((texto, False)), None, ia({"robo": True, "motivo": "propaganda de uma loja"}, chamadas)))
    assert c["contato_robo"] is True and c["robo_ativo"] is False
    assert "propaganda de uma loja" in c["motivo"] and "reative" in c["silencio"]
    # avaliar de novo a mesma fala nao gasta outra chamada da IA
    _rodar(robo_service.avaliar_chat("alice", NUMERO, "Loja X", msgs((texto, False)), None, ia({"robo": True, "motivo": "x"}, chamadas)))
    assert len(chamadas) == 1
    # a pessoa reativa: o aviso some
    c = _rodar(robo_service.avaliar_chat("alice", NUMERO, "Loja X", [], True, ia({})))
    assert c["robo_ativo"] is True and c["contato_robo"] is False and not c.get("silencio")


def test_ia_indisponivel_nao_marca_a_conversa_como_avaliada(com_robo):
    texto = "Olha esse link que você me mandou: https://meusite.example/abc"

    def quebra(prompt):
        raise RuntimeError("limite")
    c = _rodar(robo_service.avaliar_chat("alice", NUMERO, "Fulano", msgs((texto, False)), None, quebra))
    assert not c.get("avaliado_em") and c.get("contato_robo") in (None, False)
    c = _rodar(robo_service.avaliar_chat("alice", NUMERO, "Fulano", msgs((texto, False)), None, ia({"robo": False})))
    assert c.get("avaliado_em")


def test_quem_pediu_para_sair_nao_pode_ser_religado(com_robo):
    _rodar(robo_service.avaliar_chat("alice", NUMERO, "Fulano", msgs(("oi", True)), None, ia({})))
    cid = robo_store.id_da_conversa("whatsapp", NUMERO)
    conv = _rodar(robo_store.obter_conversa("alice", cid))
    conv["optout"] = True
    _rodar(robo_store.salvar_conversa("alice", conv))
    with pytest.raises(PermissionError):
        _rodar(robo_service.avaliar_chat("alice", NUMERO, "Fulano", [], True, ia({})))


def test_chat_sem_telefone_e_recusado(com_robo):
    with pytest.raises(ValueError):
        _rodar(robo_service.avaliar_chat("alice", "", "Grupo", [], None, ia({})))


def test_rota_liga_pausa_e_lista(client, com_robo):
    r = client.post("/api/robo/chat", json={"telefone": NUMERO, "nome": "Padaria", "mensagens": [{"texto": "oi", "minha": False, "quando": 1700000000, "id": "a"}]})
    assert r.status_code == 200 and r.json()["robo_ativo"] is False
    r = client.post("/api/robo/chat", json={"telefone": NUMERO, "ativar": True})
    assert r.json()["robo_ativo"] is True
    lista = client.get("/api/robo/conversas").json()
    assert [c for c in lista if c["contato"] == NUMERO and c["robo_ativo"]]
    assert client.post("/api/robo/chat", json={"telefone": "123"}).status_code == 400


def test_varredura_nao_reativa_o_que_a_ia_classificou_como_robo(com_robo):
    texto = "🔥 SUPER PROMOÇÃO só hoje! Compre agora e ganhe 50% de desconto: https://loja.example/oferta"
    c = _rodar(robo_service.avaliar_chat("alice", NUMERO, "Loja X", msgs((texto, False)), None, ia({"robo": True, "motivo": "propaganda"})))
    resumo = {**{k: v for k, v in c.items() if k != "mensagens"}, "ultima": c["mensagens"][-1], "contatos": 1, "humano": False}
    assert robo_service._pausa_por_engano(resumo) is False       # um robô comum, com pouca fala, seria recuperado; este não
    assert robo_service._pausa_por_engano({**resumo, "classificado": False}) is True
