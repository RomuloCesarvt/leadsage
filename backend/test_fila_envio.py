"""Fila de envio: o robô prepara e entrega cada abordagem no canal que existe.

O que estes testes travam:

- cada lead cai no melhor canal que tem (e-mail, WhatsApp, Instagram, LinkedIn);
- só o e-mail sai sozinho, com rodapé de saída, limite diário e cobrança
  só depois de enviar de verdade;
- WhatsApp, Instagram e LinkedIn ficam na fila com o link pronto, sem fingir envio;
- quem já foi contatado não entra de novo;
- marcar como enviado move o card do pipeline.

Nada aqui chama IA, SMTP nem a Meta.
"""
import pytest

from app import fila_envio, pipeline_store
from test_robo import com_robo, rodar  # noqa: F401

UID = "alice"


def lead(i="L1", **kw):
    base = {"id": i, "company": f"Padaria {i}", "name": f"Padaria {i}", "email": "", "phone": "", "socials": {}}
    return {**base, **kw}


class Pontas:
    def __init__(self, creditos=100, falha_email=False):
        self.enviados, self.cobrancas, self.creditos, self.falha_email = [], 0, creditos, falha_email

    async def gerar(self, l, canal):
        return {"subject": f"Ideia para {l['company']}", "body": f"Olá! Vi a {l['company']} e tive uma ideia.",
                "hook": "fato", "follow_ups": []}

    async def enviar(self, l, assunto, corpo):
        if self.falha_email:
            raise RuntimeError("SMTP recusou")
        self.enviados.append((l["id"], assunto, corpo))
        return "ok"

    async def pode(self):
        return self.creditos >= 2

    async def cobrar(self):
        self.cobrancas += 1
        self.creditos -= 2


def preparar(rodar, leads, p, uid=UID):
    return rodar(fila_envio.preparar_lote, uid, leads, p.gerar, p.enviar, p.pode, p.cobrar, 0)


# ------------------------------------------------------------------ canais

def test_escolhe_o_melhor_canal_do_lead():
    assert fila_envio.escolher_canal(lead(email="a@b.com", phone="14998003784")) == "email"
    assert fila_envio.escolher_canal(lead(email="invalido", phone="14998003784")) == "whatsapp"
    assert fila_envio.escolher_canal(lead(socials={"instagram": "https://instagram.com/padaria"})) == "instagram_direct"
    assert fila_envio.escolher_canal(lead(socials={"linkedin": "https://linkedin.com/in/maria"})) == "linkedin_msg"
    assert fila_envio.escolher_canal(lead()) is None


def test_links_abrem_o_chat_certo():
    assert fila_envio.link_do_canal("whatsapp", lead(phone="+55 14 99800-3784"), "Oi tudo bem").startswith("https://wa.me/5514998003784?text=")
    assert fila_envio.link_do_canal("instagram_direct", lead(instagram="@padaria"), "x") == "https://ig.me/m/padaria"
    assert "linkedin.com/messaging/compose" in fila_envio.link_do_canal("linkedin_msg", lead(socials={"linkedin": "https://linkedin.com/in/maria"}), "x")
    assert fila_envio.link_do_canal("email", lead(), "x") == ""


def test_rodape_de_saida_so_uma_vez():
    t = fila_envio.com_rodape_de_saida("Olá")
    assert "responder SAIR" in t
    assert fila_envio.com_rodape_de_saida(t) == t


# ------------------------------------------------------------------- lote

def test_email_sai_sozinho_e_o_resto_vai_para_a_fila(com_robo, rodar):
    p = Pontas()
    leads = [lead("E", email="dono@padaria.com"), lead("W", phone="14998003784"),
             lead("I", socials={"instagram": "padariai"}), lead("N")]
    r = preparar(rodar, leads, p)
    por_id = {x["lead_id"]: x for x in r["resultados"]}

    assert por_id["E"]["resultado"] == "enviado" and por_id["E"]["canal"] == "email"
    assert por_id["W"]["resultado"] == "na fila" and por_id["W"]["canal"] == "whatsapp"
    assert por_id["I"]["resultado"] == "na fila" and por_id["I"]["canal"] == "instagram_direct"
    assert por_id["N"]["resultado"] == "ignorado"

    # só um e-mail foi de fato enviado, com rodapé, e cobrado uma vez
    assert len(p.enviados) == 1 and "responder SAIR" in p.enviados[0][2]
    assert p.cobrancas == 1

    itens = {i["lead_id"]: i for i in rodar(fila_envio.listar, UID)}
    assert itens["E"]["status"] == "enviado" and itens["E"]["enviado_por"] == "robô"
    assert itens["W"]["status"] == "pendente" and itens["W"]["link"].startswith("https://wa.me/")
    assert itens["I"]["status"] == "pendente" and itens["I"]["link"].endswith("/padariai")
    assert "N" not in itens
    # e-mail enviado já anda no pipeline; o que está na fila ainda não
    assert rodar(pipeline_store.obter, UID, "E")["etapa"] == "Contato Enviado"
    assert rodar(pipeline_store.obter, UID, "W")["etapa"] == "Novo Lead"


def test_falha_de_email_nao_cobra_nem_move(com_robo, rodar):
    p = Pontas(falha_email=True)
    r = preparar(rodar, [lead("E", email="dono@padaria.com")], p)
    assert r["resultados"][0]["resultado"] == "falhou" and "SMTP" in r["resultados"][0]["motivo"]
    assert p.cobrancas == 0
    assert rodar(pipeline_store.obter, UID, "E")["etapa"] == "Novo Lead"


def test_sem_credito_o_email_espera(com_robo, rodar):
    p = Pontas(creditos=1)
    r = preparar(rodar, [lead("E", email="dono@padaria.com")], p)
    assert r["resultados"][0]["resultado"] == "aguardando"
    assert p.enviados == [] and p.cobrancas == 0
    assert r["resumo"]["aguardando_limite"] == 1


def test_limite_diario_de_email(com_robo, rodar, monkeypatch):
    monkeypatch.setattr(fila_envio, "LIMITE_EMAIL_DIA", 2)
    p = Pontas()
    leads = [lead(f"E{i}", email=f"d{i}@padaria.com") for i in range(4)]
    r = preparar(rodar, leads, p)
    res = [x["resultado"] for x in r["resultados"]]
    assert res.count("enviado") == 2 and res.count("aguardando") == 2
    assert r["resumo"]["email_restante"] == 0

    # no dia seguinte (limite maior), os que esperavam saem
    monkeypatch.setattr(fila_envio, "LIMITE_EMAIL_DIA", 10)
    out = rodar(fila_envio.enviar_aguardando, UID, p.enviar, p.pode, p.cobrar, 0)
    assert out["enviados"] == 2 and out["resumo"]["aguardando_limite"] == 0


def test_nao_repete_quem_ja_esta_na_fila_ou_no_pipeline(com_robo, rodar):
    p = Pontas()
    preparar(rodar, [lead("W", phone="14998003784")], p)
    r = preparar(rodar, [lead("W", phone="14998003784")], p)
    assert r["resultados"][0]["resultado"] == "ignorado" and "fila" in r["resultados"][0]["motivo"]

    # quem ja esta em andamento no pipeline NAO e ignorado: volta para a revisao com o aviso "ja recebeu mensagem"
    rodar(pipeline_store.registrar, UID, {"id": "P", "company": "Já em andamento", "phone": "14998003785"}, "Respondeu")
    r = preparar(rodar, [lead("P", phone="14998003785")], p)
    assert r["resultados"][0]["resultado"] == "para revisar"
    item = rodar(fila_envio.obter, UID, "f_P")
    assert item["status"] == "rascunho" and item["ja_contatado"]["respondeu"] is True


def test_lote_tem_tamanho_maximo(com_robo, rodar):
    p = Pontas()
    leads = [lead(f"W{i}", phone=f"1499800{3000 + i}") for i in range(fila_envio.LOTE_MAXIMO + 5)]
    r = preparar(rodar, leads, p)
    assert len(r["resultados"]) == fila_envio.LOTE_MAXIMO


def test_ia_que_falha_nao_derruba_o_lote(com_robo, rodar):
    p = Pontas()

    async def gerar(l, canal):
        if l["id"] == "RUIM":
            raise RuntimeError("IA fora do ar")
        return await Pontas.gerar(p, l, canal)

    leads = [lead("RUIM", phone="14998003784"), lead("BOM", phone="14998003785")]
    r = rodar(fila_envio.preparar_lote, UID, leads, gerar, p.enviar, p.pode, p.cobrar, 0)
    res = {x["lead_id"]: x["resultado"] for x in r["resultados"]}
    assert res == {"RUIM": "falhou", "BOM": "na fila"}


# --------------------------------------------------------- ações da pessoa

def test_marcar_como_enviado_move_o_card(com_robo, rodar):
    p = Pontas()
    preparar(rodar, [lead("W", phone="14998003784")], p)
    item = rodar(fila_envio.marcar_enviado, UID, "f_W")
    assert item["status"] == "enviado" and item["enviado_por"] == "voce"
    card = rodar(pipeline_store.obter, UID, "W")
    assert card["etapa"] == "Contato Enviado" and card["historico"][-1]["por"] == "voce"
    # repetir não duplica nem quebra
    assert rodar(fila_envio.marcar_enviado, UID, "f_W")["status"] == "enviado"
    assert rodar(fila_envio.marcar_enviado, UID, "nao_existe") is None


def test_pular_tira_da_fila_e_libera_para_tentar_de_novo(com_robo, rodar):
    p = Pontas()
    preparar(rodar, [lead("W", phone="14998003784")], p)
    assert rodar(fila_envio.pular, UID, "f_W")["status"] == "pulado"
    r = preparar(rodar, [lead("W", phone="14998003784")], p)
    assert r["resultados"][0]["resultado"] == "na fila"


def test_filas_de_contas_diferentes_nao_se_misturam(com_robo, rodar):
    p = Pontas()
    preparar(rodar, [lead("W", phone="14998003784")], p, uid="alice")
    assert len(rodar(fila_envio.listar, "alice")) == 1
    assert rodar(fila_envio.listar, "bob") == []


# ------------------------------------------------------------------ revisar antes de enviar

def revisar(rodar, leads, p, uid=UID):
    return rodar(fila_envio.preparar_lote, uid, leads, p.gerar, p.enviar, p.pode, p.cobrar, 0, True)


def test_revisar_nao_envia_nada_e_deixa_tudo_como_rascunho(rodar, com_robo):
    p = Pontas()
    r = revisar(rodar, [lead("A", email="a@b.com"), lead("B", phone="14998003784")], p)
    assert [x["resultado"] for x in r["resultados"]] == ["para revisar", "para revisar"]
    assert p.enviados == [] and p.cobrancas == 0
    itens = rodar(fila_envio.listar, UID)
    assert {i["status"] for i in itens} == {"rascunho"} and r["resumo"]["rascunhos"] == 2


def test_rascunho_nao_vai_para_a_fila_do_conector(rodar, com_robo):
    from app import conector_whatsapp as cw
    revisar(rodar, [lead("B", phone="14998003784")], Pontas())
    assert rodar(cw._fila_whatsapp, UID) == []


def test_editar_muda_o_texto_o_link_do_whatsapp_e_o_rodape_do_email(rodar, com_robo):
    revisar(rodar, [lead("A", email="a@b.com"), lead("B", phone="14998003784")], Pontas())
    zap = rodar(fila_envio.editar, UID, "f_B", "Oi, tudo bem? Posso mostrar uma ideia?")
    assert zap["texto"] == "Oi, tudo bem? Posso mostrar uma ideia?" and "Oi%2C%20tudo%20bem" in zap["link"] and zap["editado"]
    mail = rodar(fila_envio.editar, UID, "f_A", "Texto novo sem rodapé", "Assunto novo")
    assert mail["assunto"] == "Assunto novo" and "responder SAIR" in mail["texto"]
    with pytest.raises(ValueError):
        rodar(fila_envio.editar, UID, "f_B", "   ")
    assert rodar(fila_envio.editar, UID, "f_nao_existe", "x") is None


def test_aprovar_libera_so_os_marcados_whatsapp_vai_para_a_fila_e_email_sai(rodar, com_robo):
    p = Pontas()
    revisar(rodar, [lead("A", email="a@b.com"), lead("B", phone="14998003784"), lead("C", phone="14998003785")], p)
    r = rodar(fila_envio.aprovar, UID, ["f_A", "f_B"], p.enviar, p.pode, p.cobrar, 0)
    assert {x["lead_id"]: x["resultado"] for x in r["resultados"]} == {"A": "enviado", "B": "na fila"}
    assert [e[0] for e in p.enviados] == ["A"] and p.cobrancas == 1
    status = {i["id"]: i["status"] for i in rodar(fila_envio.listar, UID)}
    assert status == {"f_A": "enviado", "f_B": "pendente", "f_C": "rascunho"}   # C continua esperando a decisao


def test_aprovar_email_sem_credito_espera_e_nao_envia_de_graca(rodar, com_robo):
    p = Pontas(creditos=0)
    revisar(rodar, [lead("A", email="a@b.com")], p)
    r = rodar(fila_envio.aprovar, UID, ["f_A"], p.enviar, p.pode, p.cobrar, 0)
    assert r["resultados"][0]["resultado"] == "aguardando" and p.enviados == []


def test_descartar_tira_da_fila_sem_enviar_e_nao_mexe_no_que_ja_saiu(rodar, com_robo):
    p = Pontas()
    revisar(rodar, [lead("A", email="a@b.com"), lead("B", phone="14998003784")], p)
    rodar(fila_envio.aprovar, UID, ["f_A"], p.enviar, p.pode, p.cobrar, 0)
    assert rodar(fila_envio.descartar, UID, ["f_A", "f_B"]) == 1          # A ja saiu: fica
    status = {i["id"]: i["status"] for i in rodar(fila_envio.listar, UID)}
    assert status == {"f_A": "enviado", "f_B": "pulado"}


def test_descartar_todos_esvazia_a_fila_e_preserva_o_enviado(rodar, com_robo):
    p = Pontas()
    revisar(rodar, [lead("A", email="a@b.com"), lead("B", phone="14998003784"), lead("C", phone="14998003785")], p)
    rodar(fila_envio.aprovar, UID, ["f_A"], p.enviar, p.pode, p.cobrar, 0)        # A sai; B e C seguem como rascunho
    assert rodar(fila_envio.descartar_todos, UID) == 2
    status = {i["id"]: i["status"] for i in rodar(fila_envio.listar, UID)}
    assert status == {"f_A": "enviado", "f_B": "pulado", "f_C": "pulado"}
    assert rodar(fila_envio.descartar_todos, UID) == 0                            # repetir nao quebra


def test_rota_descartar_todos(client, com_robo):
    assert client.post("/api/robo/fila/descartar-todos").json()["descartadas"] == 0


def test_rotas_de_revisao(client, com_robo):
    from app.main import app  # noqa: F401
    r = client.post("/api/robo/fila/aprovar", json={"ids": []})
    assert r.status_code in (200, 402, 403)
    assert client.patch("/api/robo/fila/f_x", json={"texto": "oi"}).status_code in (404, 402, 403)


# ------------------------------------------------------------ quem ja recebeu mensagem
def test_numero_que_ja_recebeu_volta_para_revisao_com_aviso_e_nao_sai_sozinho(com_robo, rodar):
    p = Pontas()
    preparar(rodar, [lead("A", phone="14998003784")], p)
    rodar(fila_envio.marcar_enviado, UID, "f_A")                              # A saiu pelo WhatsApp
    # outro lead com o MESMO numero (escrito com 55 e formatacao diferente) e o proprio A de novo
    r = preparar(rodar, [lead("B", phone="+55 (14) 99800-3784"), lead("A", phone="14998003784")], p)
    assert [x["resultado"] for x in r["resultados"]] == ["para revisar", "para revisar"]
    assert rodar(fila_envio.obter, UID, "f_A")["status"] == "enviado"          # o registro do envio antigo nao e apagado
    assert rodar(fila_envio.obter, UID, "f_A_r1")["status"] == "rascunho"
    b = rodar(fila_envio.obter, UID, "f_B")
    assert b["status"] == "rascunho" and b["ja_contatado"]["como"] == "whatsapp" and b["ja_contatado"]["quando"]
    assert p.enviados == []                                                    # nada saiu


def test_reenvio_so_com_confirmacao(com_robo, rodar):
    p = Pontas()
    preparar(rodar, [lead("A", phone="14998003784")], p)
    rodar(fila_envio.marcar_enviado, UID, "f_A")
    item = rodar(fila_envio.obter, UID, "f_A")
    item.update(id="f_A2", lead_id="A2", status="rascunho", ja_contatado={"quando": "2026-10-10T10:00:00", "como": "whatsapp", "respondeu": False})
    rodar(fila_envio._gravar, UID, item)
    sem = rodar(fila_envio.aprovar, UID, ["f_A2"], p.enviar, p.pode, p.cobrar, 0)
    assert sem["resultados"][0]["resultado"] == "ignorado" and "confirme o reenvio" in sem["resultados"][0]["motivo"]
    assert rodar(fila_envio.obter, UID, "f_A2")["status"] == "rascunho"
    com = rodar(fila_envio.aprovar, UID, ["f_A2"], p.enviar, p.pode, p.cobrar, 0, True)
    assert com["resultados"][0]["resultado"] == "na fila"


def test_quem_pediu_para_sair_continua_bloqueado(com_robo, rodar):
    from app import robo_store
    p = Pontas()
    rodar(robo_store.salvar_conversa, UID, {"id": robo_store.id_da_conversa("whatsapp", "5514998003784"), "canal": "whatsapp",
                                           "contato": "5514998003784", "optout": True, "mensagens": [{"de": "robo", "texto": "oi"}],
                                           "atualizado": "2026-10-10T10:00:00"})
    r = preparar(rodar, [lead("S", phone="14998003784")], p)
    assert r["resultados"][0]["resultado"] == "ignorado" and "não receber" in r["resultados"][0]["motivo"]


def test_a_ia_recebe_o_aviso_de_retomada_para_quem_ja_recebeu(com_robo, rodar):
    from app import main
    assert main._instrucao_de_retomada(None) == ""
    t = main._instrucao_de_retomada({"quando": "2026-10-10T10:00:00"})
    assert "JÁ RECEBEU" in t and "2026-10-10" in t and "retomada" in t
