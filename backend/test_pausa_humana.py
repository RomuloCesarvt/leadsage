"""Se uma PESSOA escreve na conversa pelo celular, o robô pausa sozinho e só volta quando ela o ligar na conversa."""
from app import meta_canais, robo_service, robo_store
from test_robo import CFG, com_robo, rodar  # noqa: F401

NUMERO = "5514999990001"


def _lead_escreve(rodar, texto="oi", mid="m1"):
    msg = meta_canais.Recebida(canal="whatsapp", contato=NUMERO, nome="Maria", texto=texto, meta_id=mid, momento=1)
    return rodar(robo_service.processar, CFG, msg, adiar=True)


def test_pessoa_escreve_no_celular_robo_pausa_e_nao_volta_sozinho(com_robo, rodar):
    _lead_escreve(rodar)
    c = rodar(robo_service.humano_respondeu, CFG, NUMERO, "Oi Maria, aqui é o Rômulo, já te respondo!", "w1")
    assert c["robo_ativo"] is False and c["pausa_humana"] is True
    assert c["mensagens"][-1]["de"] == "voce" and c["mensagens"][-1]["origem"] == "celular"

    def gerar(_):
        raise AssertionError("o robô não pode responder: uma pessoa assumiu")

    msg2 = meta_canais.Recebida(canal="whatsapp", contato=NUMERO, nome="Maria", texto="pode sim", meta_id="m2", momento=2)
    c2 = rodar(robo_service.processar, CFG, msg2, gerar=gerar)
    assert "pelo celular" in c2["silencio"] and c2["mensagens"][-1]["de"] == "contato"


def test_so_volta_quando_a_pessoa_liga_o_robo_na_conversa(com_robo, rodar):
    rodar(robo_service.humano_respondeu, CFG, NUMERO, "Oi, sou eu", "w1")
    c = rodar(robo_service.avaliar_chat, "alice", NUMERO, "Ana", [], ativar=True)
    assert c["robo_ativo"] is True and "pausa_humana" not in c


def test_eco_do_robo_e_repeticao_nao_pausam(com_robo, rodar):
    cid = robo_store.id_da_conversa("whatsapp", NUMERO)
    rodar(robo_store.salvar_conversa, "alice", {
        "id": cid, "canal": "whatsapp", "contato": NUMERO, "nome": "", "lead_id": "", "robo_ativo": True, "optout": False,
        "precisa_humano": False, "motivo": "", "criado": robo_store.agora(),
        "mensagens": [{"de": "robo", "texto": "Aqui está a prévia: https://x", "em": robo_store.agora()}]})
    c = rodar(robo_service.humano_respondeu, CFG, NUMERO, "Aqui está a prévia:   https://x", "eco1")
    assert c["robo_ativo"] is True                       # texto igual ao do robô: é eco do sistema
    c = rodar(robo_service.humano_respondeu, CFG, NUMERO, "Oi, posso ajudar?", "w9")
    de_novo = rodar(robo_service.humano_respondeu, CFG, NUMERO, "Oi, posso ajudar?", "w9")
    assert c["robo_ativo"] is False and len(de_novo["mensagens"]) == len(c["mensagens"])


def test_contato_novo_escrito_primeiro_pela_pessoa_nasce_pausado(com_robo, rodar):
    c = rodar(robo_service.humano_respondeu, CFG, "5514999990004", "Olá! Vi sua empresa", "w1")
    assert c["robo_ativo"] is False and c["pausa_humana"] is True


def test_evento_sem_texto_nao_pausa_o_robo(com_robo, rodar):
    c = rodar(robo_service.humano_respondeu, CFG, "5514999990009", "   ", "w0")
    assert c["robo_ativo"] is False and c["mensagens"] == []        # nasceu vazia e continua sem fala "você": nada foi registrado
