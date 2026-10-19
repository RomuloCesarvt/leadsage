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
    assert (r["processadas"], r["respondidas"]) == (1, 1)
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
    assert (r["processadas"], r["respondidas"]) == (1, 1)
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
    assert (resp["processadas"], resp["respondidas"]) == (1, 1)


def test_tres_mensagens_seguidas_viram_uma_resposta_so(com_robo, rodar):
    from app import robo_store
    envio = Envio()
    for i, texto in enumerate(["boa tarde", "vocês fazem sites?", "quanto custa mais ou menos?"]):
        c = rodar(robo_service.processar, cfg(), msg(texto, i), gerar=ia("nao deveria responder ainda"), enviar=envio, adiar=True)
    assert envio.enviados == []                          # guardou as tres, sem responder nenhuma
    assert [m["de"] for m in c["mensagens"]] == ["contato"] * 3
    # quando o lead para de escrever, UMA resposta que enxerga as tres
    prompts = []

    def gerador(prompt):
        prompts.append(prompt)
        return {"mensagens": ["Fazemos sim! Posso te mostrar uma prévia?"], "etapa": "descoberta", "temperatura": "morno"}

    r = rodar(robo_service.responder_pendentes, cfg(), contato="5511964623668", gerar=gerador, enviar=envio)
    assert r["processadas"] == 1 and r["respondidas"] == 1
    assert envio.enviados == ["Fazemos sim! Posso te mostrar uma prévia?"]
    assert "quanto custa" in prompts[0] and "vocês fazem sites" in prompts[0] and "boa tarde" in prompts[0]


def test_reprocessar_devolve_a_dica_de_tentar_de_novo(com_robo, rodar):
    def quebrada(prompt):
        raise RuntimeError("503")

    rodar(robo_service.processar, cfg(), msg("oi, vocês fazem sites?", 1), gerar=quebrada, enviar=Envio(), adiar=True)
    r = rodar(robo_service.responder_pendentes, cfg(), contato="5511964623668", gerar=quebrada, enviar=Envio())
    assert r["respondidas"] == 0 and r["tentar_de_novo"] is True


# ------------------------------------------------ a mesma mensagem nao vira "3 automaticas" (defeito que tirava o lead da lista do robo)
def test_varias_passadas_pela_mesma_mensagem_automatica_contam_uma_vez(com_robo, rodar):
    envio = Envio()
    primeira = msg(AUTOMATICAS[0], 1)
    c = rodar(robo_service.processar, cfg(), primeira, gerar=ia(), enviar=envio)
    for _ in range(5):                                  # a varredura volta à mesma mensagem, de novo e de novo
        c = rodar(robo_service.processar, cfg(), primeira, gerar=ia(), enviar=envio, reprocessar=True)
    assert c["automaticas"] == 1 and c["robo_ativo"] and not c.get("contato_robo")


def test_varredura_nao_volta_a_mensagem_ja_julgada_automatica(com_robo, rodar):
    from app import robo_store
    envio = Envio()
    rodar(robo_service.processar, cfg(), msg(AUTOMATICAS[0], 1), gerar=ia(), enviar=envio)
    chamadas = []
    r = rodar(robo_service.responder_pendentes, cfg(), gerar=lambda p: chamadas.append(p) or {"mensagens": ["x"]}, enviar=envio)
    assert chamadas == [] and envio.enviados == [] and r["processadas"] == 0
    # chegou outra mensagem (agora de gente): volta a ser atendido
    c = rodar(robo_service.processar, cfg(), msg("oi, vocês fazem sites?", 2), gerar=ia("Fazemos sim!"), enviar=envio)
    assert envio.enviados == ["Fazemos sim!"] and c["automaticas"] == 0


def test_quem_foi_tirado_da_lista_por_engano_volta_a_ser_atendido(com_robo, rodar):
    """Dado real: conversas com UMA mensagem do contato apareciam pausadas por '3 mensagens automáticas'."""
    from app import robo_store
    cid = robo_store.id_da_conversa("whatsapp", "5511964623668")
    rodar(robo_store.salvar_conversa, "alice", {
        "id": cid, "canal": "whatsapp", "contato": "5511964623668", "nome": "Loja", "lead_id": "", "robo_ativo": False, "contato_robo": True,
        "automaticas": 3, "optout": False, "precisa_humano": False, "motivo": "", "silencio": "Parece outro robô (3 mensagens automáticas)",
        "mensagens": [{"de": "robo", "texto": "Oi!", "em": "2026-10-19T18:00:00", "meta_id": "a"},
                      {"de": "contato", "texto": "Boa tarde! Tudo bem? Pode falar.", "em": "2026-10-19T18:05:00", "meta_id": "b"}],
        "criado": "x", "atualizado": "2026-10-19T18:05:00+00:00"})
    envio = Envio()
    c = rodar(robo_service.processar, cfg(), msg("Boa tarde! Tudo bem? Pode falar.", 3).__class__(canal="whatsapp", contato="5511964623668", nome="Loja", texto="Boa tarde! Tudo bem? Pode falar.", meta_id="b", momento=3),
              gerar=ia("Oi! Que bom. Posso te mostrar a prévia?"), enviar=envio, reprocessar=True)
    assert c["robo_ativo"] and not c.get("contato_robo") and envio.enviados == ["Oi! Que bom. Posso te mostrar a prévia?"]


def test_quem_o_dono_assumiu_nao_volta_para_o_robo(com_robo, rodar):
    from app import robo_store
    cid = robo_store.id_da_conversa("whatsapp", "5511964623668")
    rodar(robo_store.salvar_conversa, "alice", {
        "id": cid, "canal": "whatsapp", "contato": "5511964623668", "nome": "Loja", "lead_id": "", "robo_ativo": False, "contato_robo": True,
        "optout": False, "precisa_humano": False, "motivo": "",
        "mensagens": [{"de": "contato", "texto": "oi", "em": "x", "meta_id": "a"}, {"de": "voce", "texto": "Oi! Aqui é o Max", "em": "y"},
                      {"de": "contato", "texto": "pode ser", "em": "z", "meta_id": "b"}], "criado": "x"})
    envio = Envio()
    c = rodar(robo_service.processar, cfg(), msg("pode ser", 9), gerar=ia("não deveria"), enviar=envio)
    assert envio.enviados == [] and not c["robo_ativo"]


def test_resposta_com_so_um_sinal_fraco_vai_para_a_ia_decidir():
    """"Agradecemos pelo seu contato" sozinho pode ser gente: a IA decide (e responde automatica=true se for saudação)."""
    from app.ai_robo import certeza_de_robo
    assert parece_automatica("Agradecemos pela sua mensagem.\n\nClínica Alluve ✨") and not certeza_de_robo("Agradecemos pela sua mensagem.\n\nClínica Alluve ✨")
    assert certeza_de_robo(AUTOMATICAS[3]) and certeza_de_robo(AUTOMATICAS[4]) and certeza_de_robo(AUTOMATICAS[1])
    chamadas = []
    d = decidir([{"de": "robo", "texto": "Oi!"}, {"de": "contato", "texto": "Agradecemos pela sua mensagem. Qual o valor do site?"}], "whatsapp", {}, {"ativo": True}, None,
                lambda p: chamadas.append(p) or {"mensagens": ["O valor depende do escopo; posso te mostrar a prévia?"]})
    assert chamadas and d.mensagens                                    # a IA foi consultada e respondeu


def test_falha_passageira_da_ia_ao_decidir_nao_pausa_a_conversa(com_robo, rodar):
    from app.ai_robo import Decisao
    envio = Envio()

    def sem_resposta(prompt):
        return {"mensagens": [], "tipo": "outro"}

    c = rodar(robo_service.processar, cfg(), msg("oi, vocês fazem sites?", 1), gerar=sem_resposta, enviar=envio)
    assert c["robo_ativo"] is True                                     # nunca pausa de vez por falha da IA


def test_varredura_recupera_quem_foi_pausado_por_engano_como_na_producao(com_robo, rodar):
    """O caminho REAL do Conector: /reprocessar -> responder_pendentes. Conversa igual às de produção: 1 mensagem do contato, 'auto=3'."""
    from datetime import datetime, timezone
    from app import robo_store
    agora = datetime.now(timezone.utc).isoformat()
    cid = robo_store.id_da_conversa("whatsapp", "5511964623668")
    rodar(robo_store.salvar_conversa, "alice", {
        "id": cid, "canal": "whatsapp", "contato": "5511964623668", "nome": "Loja", "lead_id": "", "robo_ativo": False, "contato_robo": True,
        "automaticas": 3, "optout": False, "precisa_humano": False, "motivo": "", "silencio": "Parece outro robô (3 mensagens automáticas)",
        "mensagens": [{"de": "robo", "texto": "Oi!", "em": agora, "meta_id": "a"},
                      {"de": "contato", "texto": "Boa tarde! Pode falar, estou ouvindo.", "em": agora, "meta_id": "b"}],
        "criado": agora, "atualizado": agora})
    envio = Envio()
    r = rodar(robo_service.responder_pendentes, cfg(), gerar=ia("Oi! Que bom. Posso te mostrar a prévia do site?"), enviar=envio)
    assert r["processadas"] == 1 and r["respondidas"] == 1
    assert envio.enviados == ["Oi! Que bom. Posso te mostrar a prévia do site?"]
    c = rodar(robo_store.obter_conversa, "alice", cid)
    assert c["robo_ativo"] and not c.get("contato_robo")


def test_varredura_nao_mexe_em_quem_o_dono_assumiu_nem_em_robo_de_verdade(com_robo, rodar):
    from datetime import datetime, timezone
    from app import robo_store
    agora = datetime.now(timezone.utc).isoformat()
    base = {"canal": "whatsapp", "nome": "Loja", "lead_id": "", "robo_ativo": False, "contato_robo": True, "optout": False,
            "precisa_humano": False, "motivo": "", "criado": agora, "atualizado": agora}
    assumida = {**base, "id": robo_store.id_da_conversa("whatsapp", "5511900000001"), "contato": "5511900000001",
                "mensagens": [{"de": "contato", "texto": "oi", "em": agora, "meta_id": "a"}, {"de": "voce", "texto": "Oi! Max aqui", "em": agora},
                              {"de": "contato", "texto": "ok", "em": agora, "meta_id": "b"}]}
    mesmo_robo = {**base, "id": robo_store.id_da_conversa("whatsapp", "5511900000002"), "contato": "5511900000002", "automaticas": 3,
                  "mensagens": [{"de": "contato", "texto": AUTOMATICAS[3], "em": "1", "meta_id": "a"}, {"de": "robo", "texto": "?", "em": "2"},
                                {"de": "contato", "texto": AUTOMATICAS[3], "em": "3", "meta_id": "b"}, {"de": "robo", "texto": "?", "em": "4"},
                                {"de": "contato", "texto": AUTOMATICAS[3], "em": "5", "meta_id": "c"}]}
    for c in (assumida, mesmo_robo):
        rodar(robo_store.salvar_conversa, "alice", c)
    envio = Envio()
    r = rodar(robo_service.responder_pendentes, cfg(), gerar=ia("não deveria"), enviar=envio)
    assert r["processadas"] == 0 and envio.enviados == []


# ------------------------------------------------ "meu marido cria sites, nao tenho interesse": agradece e passa para o proximo lead
@pytest.mark.parametrize("texto,esperado", [
    ("Meu marido que cria sites, não tenho interesse", "ja_tem"),
    ("Obrigada, mas meu marido mesmo faz os sites", "ja_tem"),
    ("Já tenho quem faça, obrigado", "ja_tem"),
    ("Não tenho interesse", "sem_interesse"),
    ("Sem interesse, obrigado.", "sem_interesse"),
])
def test_recusa_clara_com_ou_sem_motivo_encerra(texto, esperado):
    from app.ai_robo import desinteresse_firme
    assert desinteresse_firme(texto) == esperado


@pytest.mark.parametrize("texto", [
    "Vocês fazem site? meu marido faz mas queria ver o valor",
    "Não tenho interesse agora, mas me manda um exemplo",
    "meu marido está viajando, depois te chamo",
    "oi, quanto custa?", "vou pensar", "agora não posso falar",
])
def test_quem_ainda_quer_conversar_nao_e_encerrado(texto):
    from app.ai_robo import desinteresse_firme
    assert desinteresse_firme(texto) == ""


def test_robo_agradece_e_sai_sem_tentar_agendar_nem_chamar_a_ia(com_robo, rodar):
    chamadas = []
    envio = Envio()
    c = rodar(robo_service.processar, cfg(), msg("Meu marido que cria sites, não tenho interesse", 1),
              gerar=lambda p: chamadas.append(p) or {"mensagens": ["Que tal agendar uma conversa amanhã às 10h?"]}, enviar=envio)
    assert chamadas == []                                                   # nem consulta a IA: nada de insistir
    assert len(envio.enviados) == 1 and "agradeço" in envio.enviados[0] and "agendar" not in envio.enviados[0].lower()
    assert c["optout"] is True and c["robo_ativo"] is False                 # sai da lista: próximo lead
    assert "já tem quem faça" in c["motivo"]


def test_quem_recusou_nao_recebe_seguimento(com_robo, rodar):
    from app import fila_envio, robo_store
    item = {"id": "f_L1", "lead_id": "L1", "nome": "Loja", "canal": "whatsapp", "texto": "oi", "status": "enviado",
            "contato": {"phone": "5511964623668"}, "seguimentos": [{"quando": "2 dias", "texto": "Passando para saber da prévia."}]}
    fila_envio.agendar_seguimentos(item)
    rodar(fila_envio._gravar, "alice", item)
    rodar(robo_service.processar, cfg(), msg("Meu marido faz sites, não tenho interesse", 1), gerar=ia("x"), enviar=Envio())
    from datetime import datetime, timedelta, timezone
    assert rodar(fila_envio.promover_seguimentos, "alice", datetime.now(timezone.utc) + timedelta(days=10)) == 0


# ------------------------------------------------ resposta de quem recebeu a abordagem: liga ao lead original (e ao site que ja existe)
def test_resposta_de_quem_recebeu_a_abordagem_liga_ao_lead_original_mesmo_sem_card_no_pipeline(com_robo, rodar):
    """Caso real: o card sumiu do pipeline; a resposta virava 'contato novo' sem ramo e o robô criava OUTRO site genérico."""
    from app import fila_envio, pipeline_store, robo_store
    rodar(fila_envio._gravar, "alice", {"id": "f_ChIJabc", "lead_id": "ChIJabc", "nome": "Padaria e Confeitaria Que seja doce", "canal": "whatsapp",
                                        "status": "enviado", "enviado_em": "2026-10-19T17:50:00", "texto": "oi", "ramo": "Padarias", "nota": 4.9, "avaliacoes": 120,
                                        "contato": {"phone": "(14) 99838-7268"}, "criado": "2026-10-19T17:38:00"})
    assert rodar(pipeline_store.obter, "alice", "ChIJabc") is None             # o card não existe mais
    envio = Envio()
    c = rodar(robo_service.processar, cfg(), msg("Oi, boa tarde! Pode falar.", 1).__class__(canal="whatsapp", contato="5514998387268", nome="Padaria E Confeitaria Que Que seja doce",
              texto="Oi, boa tarde! Pode falar.", meta_id="m1", momento=1), gerar=ia("Oi! Posso te mostrar a prévia?"), enviar=envio)
    assert c["lead_id"] == "ChIJabc"                                           # o lead de verdade, não "in_whatsapp_..."
    card = rodar(pipeline_store.obter, "alice", "ChIJabc")
    assert card and card["lead"]["company"] == "Padaria e Confeitaria Que seja doce" and card["lead"]["niche"] == "Padarias"


def test_conversa_ja_ligada_a_contato_novo_e_religada_ao_original(com_robo, rodar):
    from app import fila_envio, robo_store
    rodar(fila_envio._gravar, "alice", {"id": "f_L9", "lead_id": "L9", "nome": "Doceria Estrela", "canal": "whatsapp", "status": "enviado", "enviado_em": "2026-10-19T17:50:00",
                                        "texto": "oi", "ramo": "Docerias", "contato": {"phone": "5511964623668"}, "criado": "x"})
    cid = robo_store.id_da_conversa("whatsapp", "5511964623668")
    rodar(robo_store.salvar_conversa, "alice", {"id": cid, "canal": "whatsapp", "contato": "5511964623668", "nome": "Doceria", "lead_id": "in_whatsapp_5511964623668",
                                                 "robo_ativo": True, "optout": False, "precisa_humano": False, "motivo": "", "criado": "x",
                                                 "mensagens": [{"de": "contato", "texto": "oi", "em": "x", "meta_id": "a"}]})
    c = rodar(robo_service.processar, cfg(), msg("pode falar", 2), gerar=ia("Oi!"), enviar=Envio())
    assert c["lead_id"] == "L9"
