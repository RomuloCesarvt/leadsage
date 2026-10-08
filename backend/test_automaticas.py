"""O robo percebe quando do outro lado tem outro robo, e uma falha da IA nao prende a conversa."""
import pytest

from app import meta_canais, robo_service
from app.ai_robo import decidir, parece_automatica
from test_robo import com_robo, ia, rodar  # noqa: F401

AUTOMATICAS = [
    "Agradeço o seu contato. 😊 Em caso de dúvidas ou necessidade, estamos à disposição.",
    "➡️ *Sobre qual deles você quer conversar?*",
    "Gabriel, sua parcela já está disponível para pagamento. Acesse: https://pague.exemplo.com/abc",
    "Olá! Digite 1 para vendas, 2 para suporte ou 3 para falar com um atendente.",
    "Este é um atendimento automático. Em breve um atendente responde.",
    "Seu protocolo de atendimento é 2026100812345.",
    "Escolha uma das opções:\n1) Financeiro\n2) Comercial\n3) Suporte",
]

HUMANAS = [
    "boa tarde",
    "vocês fazem sites?",
    "me explique melhor! preciso entender se vale meu tempo",
    "hoje eu sou engenheiro de Novos Negócios, faço prospecção de imobiliárias e corretores",
    "qual o horário de atendimento de vocês?",
    "pode ser em breve, estou viajando",
    "quanto custa? me manda o link do site de exemplo",
    "???",
]


@pytest.mark.parametrize("texto", AUTOMATICAS)
def test_reconhece_atendimento_automatico(texto):
    assert parece_automatica(texto)


@pytest.mark.parametrize("texto", HUMANAS)
def test_nao_confunde_gente_com_robo(texto):
    assert not parece_automatica(texto)


def test_a_mesma_mensagem_repetida_e_robo():
    msgs = [{"de": "contato", "texto": "Estamos fechados no momento."}, {"de": "robo", "texto": "Oi!"},
            {"de": "contato", "texto": "Estamos fechados no momento."}]
    assert not parece_automatica("Estamos fechados no momento.", msgs[:1])
    assert parece_automatica("Estamos fechados no momento.", msgs)


def test_decidir_nao_chama_a_ia_para_robo():
    chamadas = []
    d = decidir([{"de": "contato", "texto": AUTOMATICAS[1]}], "whatsapp", {}, {"ativo": True}, None,
                lambda p: chamadas.append(p) or {})
    assert d.automatica and not d.mensagens and chamadas == []


def cfg():
    return {"uid": "alice", "email": "alice@example.com", "gancho": "g", "ativo": True, "objetivo": "agendar"}


class Envio:
    def __init__(self):
        self.enviados = []

    async def __call__(self, canal, contato, texto, cfg):
        self.enviados.append(texto)
        return "x"


def msg(texto, n):
    return meta_canais.Recebida(canal="whatsapp", contato="5511964623668", nome="Loja", texto=texto, meta_id=f"m{n}", momento=n)


def test_tres_automaticas_tiram_o_contato_da_lista_do_robo(com_robo, rodar):
    envio = Envio()
    for i, texto in enumerate(AUTOMATICAS[:3]):
        c = rodar(robo_service.processar, cfg(), msg(texto, i), gerar=ia(), enviar=envio)
        if i < 2:
            assert c["robo_ativo"] and not c.get("contato_robo") and "outro robô" in c["silencio"]
    assert envio.enviados == []                      # nunca respondeu a robo
    assert c["robo_ativo"] is False and c["contato_robo"] is True
    assert "saiu da lista do robô" in c["silencio"]


def test_gente_no_meio_zera_a_contagem(com_robo, rodar):
    envio = Envio()
    rodar(robo_service.processar, cfg(), msg(AUTOMATICAS[0], 1), gerar=ia(), enviar=envio)
    rodar(robo_service.processar, cfg(), msg(AUTOMATICAS[1], 2), gerar=ia(), enviar=envio)
    c = rodar(robo_service.processar, cfg(), msg("oi, quanto custa o site?", 3), gerar=ia("Posso te mostrar?"), enviar=envio)
    assert c["automaticas"] == 0 and envio.enviados == ["Posso te mostrar?"]
    assert c["robo_ativo"] and not c.get("contato_robo")


def test_falha_da_ia_nao_prende_a_conversa(com_robo, rodar):
    envio = Envio()

    def quebrada(prompt):
        raise RuntimeError("503 UNAVAILABLE")

    c = rodar(robo_service.processar, cfg(), msg("oi, vocês fazem sites?", 1), gerar=quebrada, enviar=envio)
    assert not c["precisa_humano"] and "tenta de novo" in c["silencio"].lower() and c["falhas_ia"] == 1
    # a proxima mensagem e respondida normalmente
    c = rodar(robo_service.processar, cfg(), msg("???", 2), gerar=ia("Fazemos sim! Posso te mostrar?"), enviar=envio)
    assert envio.enviados == ["Fazemos sim! Posso te mostrar?"] and c["falhas_ia"] == 0 and not c["precisa_humano"]


def test_varias_falhas_seguidas_chamam_o_dono(com_robo, rodar):
    def quebrada(prompt):
        raise RuntimeError("timeout")

    for i in range(3):
        c = rodar(robo_service.processar, cfg(), msg(f"oi {i}", i), gerar=quebrada, enviar=Envio())
    assert c["precisa_humano"] and "3 vezes seguidas" in c["motivo"]


def test_conversa_presa_por_falha_antiga_da_ia_volta_a_responder(com_robo, rodar):
    """Quem ficou preso pelo comportamento antigo (marcou 'precisa de voce' por demora da IA) destrava."""
    from app import robo_store
    cid = robo_store.id_da_conversa("whatsapp", "5511964623668")
    rodar(robo_store.salvar_conversa, "alice", {
        "id": cid, "canal": "whatsapp", "contato": "5511964623668", "nome": "Max", "lead_id": "", "robo_ativo": True,
        "optout": False, "precisa_humano": True, "motivo": "a IA demorou demais para responder — responda você",
        "mensagens": [{"de": "contato", "texto": "oi", "em": "x", "meta_id": "a"}], "criado": "x"})
    envio = Envio()
    c = rodar(robo_service.processar, cfg(), msg("???", 9), gerar=ia("Oi, Max! Estou aqui."), enviar=envio)
    assert envio.enviados == ["Oi, Max! Estou aqui."] and not c["precisa_humano"]


def test_gente_repetindo_frase_curta_nao_e_robo():
    msgs = [{"de": "contato", "texto": "oi"}, {"de": "robo", "texto": "Oi!"}, {"de": "contato", "texto": "oi"}]
    assert not parece_automatica("oi", msgs)
    assert not parece_automatica("???", [{"de": "contato", "texto": "???"}, {"de": "contato", "texto": "???"}])


# ------------------------------------------------ responder o que ficou sem resposta

def conversa_base(contato, mensagens, **extra):
    from app import robo_store
    return {"id": robo_store.id_da_conversa("whatsapp", contato), "canal": "whatsapp", "contato": contato, "nome": "Lead",
            "lead_id": "", "robo_ativo": True, "optout": False, "precisa_humano": False, "motivo": "",
            "mensagens": mensagens, "criado": robo_store.agora(), "atualizado": robo_store.agora(), **extra}


def fala(de, texto, n=0):
    return {"de": de, "texto": texto, "em": "x", "meta_id": f"{de}{n}"}


def test_varredura_responde_so_o_que_ficou_sem_resposta(com_robo, rodar):
    from app import robo_store
    rodar(robo_store.salvar_conversa, "alice", conversa_base("5511900000001", [fala("contato", "???", 1)]))                  # sem resposta
    rodar(robo_store.salvar_conversa, "alice", conversa_base("5511900000002", [fala("contato", "oi", 1), fala("robo", "Olá!", 2)]))  # ja respondida
    rodar(robo_store.salvar_conversa, "alice", conversa_base("5511900000003", [fala("contato", "pare", 1)], optout=True))
    rodar(robo_store.salvar_conversa, "alice", conversa_base("5511900000004", [fala("contato", "Digite 1 para vendas", 1)], contato_robo=True, robo_ativo=False))
    rodar(robo_store.salvar_conversa, "alice", conversa_base("5511900000005", [fala("contato", "me ajuda", 1)], precisa_humano=True, motivo="pediu desconto"))
    envio = Envio()
    r = rodar(robo_service.responder_pendentes, cfg(), gerar=ia("Claro! Posso ajudar."), enviar=envio)
    assert r == {"processadas": 1, "respondidas": 1}
    assert envio.enviados == ["Claro! Posso ajudar."]
    # rodar de novo nao repete: a conversa agora termina numa fala do robo
    assert rodar(robo_service.responder_pendentes, cfg(), gerar=ia("de novo"), enviar=envio)["processadas"] == 0
    assert len(envio.enviados) == 1


def test_varredura_respeita_o_robo_desligado(com_robo, rodar):
    from app import robo_store
    rodar(robo_store.salvar_conversa, "alice", conversa_base("5511900000001", [fala("contato", "???", 1)]))
    envio = Envio()
    r = rodar(robo_service.responder_pendentes, {**cfg(), "ativo": False}, gerar=ia("x"), enviar=envio)
    assert r["processadas"] == 0 and envio.enviados == []


def test_reprocessar_um_contato_nao_duplica_a_mensagem(com_robo, rodar):
    from app import robo_store
    rodar(robo_store.salvar_conversa, "alice", conversa_base("5511900000001", [fala("contato", "???", 1)], falhas_ia=1))
    envio = Envio()
    r = rodar(robo_service.responder_pendentes, cfg(), contato="5511900000001", gerar=ia("Oi! Estou aqui."), enviar=envio)
    assert r == {"processadas": 1, "respondidas": 1}
    conversa = rodar(robo_store.obter_conversa, "alice", robo_store.id_da_conversa("whatsapp", "5511900000001"))
    assert [m["de"] for m in conversa["mensagens"]] == ["contato", "robo"]      # a pergunta nao foi duplicada
    assert conversa["falhas_ia"] == 0


def test_rota_de_reprocessar_e_dica_de_tentar_de_novo(client, com_robo, rodar, monkeypatch):
    from app import robo_store
    r = client.post("/api/robo/conector/gerar")
    chave = r.json()["chave"]
    h = {"x-conector-key": chave}
    assert client.post("/api/conector/reprocessar", json={}).status_code == 401
    assert client.post("/api/conector/reprocessar", headers=h, json={}).json()["processadas"] == 0   # robo ainda desligado

    # a IA falha na primeira mensagem: o servidor pede para tentar de novo
    def quebrada(prompt):
        raise RuntimeError("503")

    monkeypatch.setattr(robo_service, "_gerador_padrao", lambda: quebrada)
    client.put("/api/robo/config", json={"ativo": True})
    resp = client.post("/api/conector/mensagem", headers=h, json={"id": "m1", "contato": "5511900000009", "nome": "Ana", "texto": "oi, vocês fazem sites?"}).json()
    assert resp["ok"] and not resp["respondeu"] and resp["tentar_de_novo"] is True

    # e na nova tentativa (IA ja boa) ele responde
    monkeypatch.setattr(robo_service, "_gerador_padrao", lambda: ia("Fazemos sim! Posso te mostrar?"))
    resp = client.post("/api/conector/reprocessar", headers=h, json={"contato": "5511900000009"}).json()
    assert resp == {"processadas": 1, "respondidas": 1}
