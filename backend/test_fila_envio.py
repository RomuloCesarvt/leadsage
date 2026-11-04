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


def preparar(rodar, leads, p, uid=UID, reabordar=False):
    return rodar(fila_envio.preparar_lote, uid, leads, p.gerar, p.enviar, p.pode, p.cobrar, 0, reabordar=reabordar)


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
    r = preparar(rodar, [lead("B", phone="+55 (14) 99800-3784"), lead("A", phone="14998003784")], p, reabordar=True)
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


def test_quem_ja_recebeu_sai_da_lista_e_o_robo_conduz_o_resto(com_robo, rodar):
    """Depois de uma atualizacao (ou de uma geracao interrompida) rodar de novo nunca manda duas vezes."""
    p = Pontas()
    preparar(rodar, [lead("A", phone="14998003784")], p)
    rodar(fila_envio.marcar_enviado, UID, "f_A")
    r = preparar(rodar, [lead("A", phone="14998003784"), lead("B", phone="+55 (14) 99800-3784"), lead("C", phone="14997001122")], p)
    por_lead = {x["lead_id"]: x for x in r["resultados"]}
    assert por_lead["A"]["resultado"] == "ignorado" and "já recebeu a abordagem" in por_lead["A"]["motivo"] and "robô conduz" in por_lead["A"]["motivo"]
    assert por_lead["B"]["resultado"] == "ignorado"                           # outro cadastro do mesmo numero
    assert por_lead["C"]["resultado"] != "ignorado"                           # quem nunca recebeu segue normalmente
    assert rodar(fila_envio.obter, UID, "f_A_r1") is None and rodar(fila_envio.obter, UID, "f_B") is None


# ------------------------------------------- quem ja foi abordado por fora da fila (Conversas, celular)
def test_conversa_ou_chat_do_whatsapp_tira_da_fila_e_do_novo_lead(com_robo, rodar):
    from app import espelho_whatsapp, robo_store
    p = Pontas()
    # tres leads com mensagem pronta na fila: A ja tem conversa, B ja tem chat no WhatsApp, C nao tem nada
    for l in (lead("A", phone="14998003784"), lead("B", phone="14997001122"), lead("C", phone="14996005533")):
        rodar(pipeline_store.registrar, UID, l, "", "salvo")                      # os três estão em Meus Leads
    r = preparar(rodar, [lead("A", phone="14998003784"), lead("B", phone="14997001122"), lead("C", phone="14996005533")], p, reabordar=True)
    assert [x["resultado"] for x in r["resultados"]] == ["na fila"] * 3
    rodar(robo_store.salvar_conversa, UID, {"id": robo_store.id_da_conversa("whatsapp", "5514998003784"), "canal": "whatsapp", "contato": "5514998003784",
                                           "mensagens": [{"de": "voce", "texto": "Oi! Vi sua padaria"}], "atualizado": "2026-11-03T10:00:00"})
    rodar(espelho_whatsapp.salvar_chats, UID, [{"id": "5514997001122@c.us", "nome": "Padaria B"}, {"id": "120363@g.us", "nome": "Grupo"}])

    rec = rodar(fila_envio.reconciliar, UID, True)
    assert rec["pulados"] == 2 and rec["movidos"] == 2
    assert set(rec["ja_contatados"]) == {fila_envio._chave_do_telefone("14998003784"), fila_envio._chave_do_telefone("14997001122")}
    assert rodar(fila_envio.obter, UID, "f_A")["status"] == "pulado" and rodar(fila_envio.obter, UID, "f_B")["status"] == "pulado"
    assert rodar(fila_envio.obter, UID, "f_C")["status"] == "pendente"          # quem nunca foi abordado segue na fila
    etapa = {i["id"]: i["etapa"] for i in rodar(pipeline_store.listar, UID)}
    assert etapa["A"] == "Contato Enviado" and etapa["B"] == "Contato Enviado" and etapa["C"] == "Novo Lead"


def test_preparar_pula_quem_ja_tem_conversa_mesmo_sem_envio_na_fila(com_robo, rodar):
    from app import robo_store
    p = Pontas()
    rodar(robo_store.salvar_conversa, UID, {"id": robo_store.id_da_conversa("whatsapp", "5514998003784"), "canal": "whatsapp", "contato": "5514998003784",
                                           "mensagens": [{"de": "robo", "texto": "oi"}], "atualizado": "2026-11-03T10:00:00"})
    r = preparar(rodar, [lead("A", phone="14998003784"), lead("C", phone="14996005533")], p)
    por = {x["lead_id"]: x for x in r["resultados"]}
    assert por["A"]["resultado"] == "ignorado" and "já há conversa" in por["A"]["motivo"]
    assert por["C"]["resultado"] != "ignorado"


# ------------------------------------------------------------------ a régua de seguimentos (visão)
def test_regua_mostra_o_passo_de_cada_lead(com_robo, rodar):
    from datetime import datetime, timedelta, timezone
    from app import robo_store
    p = Pontas()
    base = datetime(2026, 11, 2, 12, 0, tzinfo=timezone.utc)          # segunda
    leads = [lead("A", phone="14998003784"), lead("B", phone="14997001122"), lead("C", phone="14996005533"), lead("D", phone="14995004411")]
    for l in leads:
        rodar(pipeline_store.registrar, UID, l, "", "salvo")
    preparar(rodar, leads, p)
    for i in ("A", "B", "C", "D"):
        item = rodar(fila_envio.obter, UID, f"f_{i}")
        item["seguimentos"] = [{"texto": "Passando para saber se viu a prévia."}, {"texto": "Último contato: sem pressão, a porta fica aberta."}]
        item.update(status="enviado", enviado_em=base.isoformat())
        fila_envio.agendar_seguimentos(item, base)
        rodar(fila_envio._gravar, UID, item)
    # B: o 1º seguimento já saiu; C: o lead respondeu; D: pediu para sair
    b = rodar(fila_envio.obter, UID, "f_B")
    b["agenda_seguimentos"][0]["estado"] = "na_fila"
    rodar(fila_envio._gravar, UID, b)
    rodar(fila_envio._gravar, UID, {"id": "f_B_s1", "lead_id": "B", "nome": "Padaria B", "canal": "whatsapp", "tipo": "seguimento", "status": "enviado",
                                   "enviado_em": (base + timedelta(days=2)).isoformat(), "contato": {"phone": "14997001122"}, "texto": "x"})
    for tel, extra in (("5514996005533", {"mensagens": [{"de": "robo", "texto": "oi"}, {"de": "contato", "texto": "pode mandar"}]}),
                       ("5514995004411", {"optout": True, "mensagens": [{"de": "robo", "texto": "oi"}, {"de": "contato", "texto": "pare"}]})):
        rodar(robo_store.salvar_conversa, UID, {"id": robo_store.id_da_conversa("whatsapp", tel), "canal": "whatsapp", "contato": tel,
                                               "atualizado": "2026-11-03T10:00:00", **extra})
    r = rodar(fila_envio.regua, UID, base + timedelta(days=3))
    por = {x["lead_id"]: x for x in r["leads"]}
    assert por["A"]["situacao"] == "na_regua" and "1º seguimento" in por["A"]["fase"]
    assert [x["rotulo"] for x in por["A"]["passos"]] == ["Abordagem", "1º seguimento", "Contato final"]
    assert por["B"]["situacao"] == "na_regua" and "contato final" in por["B"]["fase"] and por["B"]["passos"][1]["estado"] == "enviado"
    assert por["C"]["situacao"] == "respondeu" and por["D"]["situacao"] == "optout"
    assert r["resumo"]["na_regua"] == 2 and r["resumo"]["contato_final"] == 1 and r["resumo"]["responderam"] == 1 and r["resumo"]["total"] == 4
    assert r["dias_uteis"] == [2, 5]
