"""O robo le o que ja foi dito antes de responder.

Travado aqui (casos reais do WhatsApp do usuario):
- duas respostas escritas no mesmo segundo saem na ordem em que foram escritas (a apresentacao saiu por ultimo);
- a abordagem que o LeadSage ja mandou entra na conversa: o robo nao se apresenta de novo nem repete o pitch;
- resposta que repete o que ja foi dito, ou se apresenta de novo, e recusada e reescrita;
- "quem cuida disso e o Gustavo, o numero e..." vira aviso para o dono, nao um novo pitch;
- propaganda/boas-vindas do outro lado, percebida pelo modelo, nao e respondida.
"""
from app import conector_whatsapp as cw
from app import fila_envio, meta_canais, robo_service
from app.ai_robo import decidir
from app.ai_sdr import problemas_da_resposta
import pytest
from test_robo import com_robo, rodar  # noqa: F401

ABORDAGEM = ("Boa tarde! Sou o Alex, da LeadSage. Vi a clínica no Google e notei que ainda não há um site. "
             "Montei uma prévia, posso te mostrar sem compromisso?")


def cfg():
    return {"uid": "alice", "email": "alice@example.com", "gancho": "g", "ativo": True, "objetivo": "agendar", "cw_hash": "h"}


def msg(texto, n=1, contato="5514997434625"):
    return meta_canais.Recebida(canal="whatsapp", contato=contato, nome="Clínica", texto=texto, meta_id=f"m{n}", momento=n)


class Envio:
    def __init__(self):
        self.enviados = []

    async def __call__(self, canal, contato, texto, cfg):
        self.enviados.append(texto)
        return "x"


# ------------------------------------------------------------------ ordem

def test_duas_respostas_do_mesmo_segundo_saem_na_ordem_escrita(rodar, com_robo):
    c = {**cfg(), "uid": "ordem1"}
    # o mesmo "criado" (segundo), ids aleatorios: antes a ordem dependia do id
    for texto in ("primeira: acolhe", "segunda: conduz", "terceira"):
        rodar(cw.enfileirar_resposta, c, "5514997434625", texto)
    t = rodar(cw.tarefas, {**c, "cw_hash": "h"})
    assert [x["texto"] for x in t["tarefas"]] == ["primeira: acolhe", "segunda: conduz", "terceira"]


# ------------------------------------------------------------------ contexto

def test_a_abordagem_enviada_entra_na_conversa_e_chega_ao_modelo(rodar, com_robo):
    rodar(fila_envio._gravar, "alice", {"id": "f_L9", "lead_id": "L9", "nome": "Clínica", "canal": "whatsapp", "texto": ABORDAGEM,
                                         "status": "enviado", "enviado_em": "2026-10-14T12:00:00+00:00",
                                         "contato": {"phone": "14997434625"}})
    prompts = []

    def gerar(p):
        prompts.append(p)
        return {"mensagens": ["Que bom! Posso te ligar amanhã?"], "etapa": "descoberta"}

    c = rodar(robo_service.processar, cfg(), msg("Olá, tudo bem? Pode falar."), gerar=gerar, enviar=Envio())
    assert c["mensagens"][0]["de"] == "robo" and c["mensagens"][0]["origem"] == "abordagem"
    assert "VOCÊ: Boa tarde! Sou o Alex, da LeadSage" in prompts[0] and "NUNCA se apresente de novo" in prompts[0]


def test_lead_que_escreveu_primeiro_nao_ganha_abordagem_inventada(rodar, com_robo):
    c = rodar(robo_service.processar, cfg(), msg("Oi, vi o anúncio", contato="5511911112222"),
              gerar=lambda p: {"mensagens": ["Olá!"]}, enviar=Envio())
    assert c["mensagens"][0]["de"] == "contato"


# ------------------------------------------------------------------ nao repetir

HISTORICO = [{"de": "robo", "texto": ABORDAGEM}, {"de": "contato", "texto": "Pode falar"}]


def test_apresentar_de_novo_e_repetir_o_pitch_sao_recusados():
    erros = problemas_da_resposta(["Olá, Dra. Drielle! Me chamo Alex, da LeadSage. Estava vendo o seu perfil."], {}, HISTORICO)
    assert any("já se apresentou" in e for e in erros)
    erros = problemas_da_resposta(["Vi a clínica no Google e notei que ainda não há um site. Montei uma prévia, posso te mostrar sem compromisso?"], {}, HISTORICO)
    assert any("repetiu" in e for e in erros)
    assert problemas_da_resposta(["Perfeito! Amanhã às 15h ou sexta às 10h, qual fica melhor?"], {}, HISTORICO) == []


def test_decidir_pede_para_reescrever_quando_o_modelo_se_apresenta_de_novo():
    respostas = [{"mensagens": ["Olá! Me chamo Alex, da LeadSage."]}, {"mensagens": ["Combinado! Amanhã 15h ou sexta 10h?"]}]
    d = decidir(HISTORICO, "whatsapp", {}, {"ativo": True}, None, lambda p: respostas.pop(0))
    assert d.mensagens == ["Combinado! Amanhã 15h ou sexta 10h?"] and not respostas


# ------------------------------------------------------------------ entender o que veio

def test_contato_indicado_vai_para_o_dono_sem_novo_pitch():
    gerar = lambda p: {"entendi": "a recepção passou o contato do responsável", "tipo": "indicou_contato",
                       "mensagens": ["Obrigado! Vou falar com o Gustavo."],
                       "dados": {"decisor": "Gustavo Dias", "contato_decisor": "(14) 99743-4625"}}
    d = decidir(HISTORICO + [{"de": "contato", "texto": "Quem cuida é o Gustavo Dias, o contato é (14) 99743-4625"}],
                "whatsapp", {}, {"ativo": True}, None, gerar)
    assert d.passar_para_humano and "Gustavo Dias" in d.motivo and "99743-4625" in d.motivo
    assert d.sdr["entendi"].startswith("a recepção")


def test_propaganda_percebida_pelo_modelo_nao_e_respondida():
    longa = "✨ CUIDAR DE VOCÊ NÃO É LUXO! Vamos agendar sua avaliação? Siga nosso Instagram para conhecer nosso trabalho."
    d = decidir(HISTORICO + [{"de": "contato", "texto": longa}], "whatsapp", {}, {"ativo": True}, None,
                lambda p: {"automatica": True, "tipo": "automatica", "mensagens": []})
    assert d.automatica and not d.mensagens


# ------------------------------------------------------------------ valor so se perguntarem

def test_valor_so_sai_quando_o_cliente_pergunta():
    sem = [{"de": "contato", "texto": "Pode me mostrar o site"}]
    com = [{"de": "contato", "texto": "Quanto custa?"}]
    cfg_ = {"catalogo": "Site: R$ 600"}
    assert any("sem o cliente ter perguntado" in e for e in problemas_da_resposta(["O site fica R$ 600."], cfg_, sem))
    assert problemas_da_resposta(["O site fica R$ 600, com o primeiro ano incluso."], cfg_, com) == []
    assert problemas_da_resposta(["Posso te mostrar a prévia amanhã?"], cfg_, sem) == []


def test_decidir_reescreve_quando_o_modelo_solta_preco_sozinho():
    historico = [{"de": "robo", "texto": ABORDAGEM}, {"de": "contato", "texto": "Pode falar, o que é?"}]
    respostas = [{"mensagens": ["É um site completo por R$ 600!"]}, {"mensagens": ["É um site pronto pro seu negócio. Posso te mostrar a prévia?"]}]
    d = decidir(historico, "whatsapp", {}, {"ativo": True, "catalogo": "Site: R$ 600"}, None, lambda p: respostas.pop(0))
    assert d.mensagens == ["É um site pronto pro seu negócio. Posso te mostrar a prévia?"]


@pytest.mark.parametrize("pergunta", ["e depois do primeiro ano?", "tem mensalidade?", "preciso pagar domínio?", "é grátis?", "qual o valor"])
def test_perguntas_de_dinheiro_liberam_o_valor(pergunta):
    from app.ai_sdr import cliente_perguntou_de_valor
    assert not cliente_perguntou_de_valor([{"de": "contato", "texto": "pode mostrar"}])
    # "depois do primeiro ano" sozinho nao e valor; as demais sao
    assert cliente_perguntou_de_valor([{"de": "contato", "texto": pergunta}]) == (pergunta != "e depois do primeiro ano?")


# ------------------------------------------------------------------ beneficio antes do valor

def test_primeiro_preco_vem_depois_do_beneficio():
    from app.ai_sdr import forma_do_preco
    hist = [{"de": "robo", "texto": ABORDAGEM}, {"de": "contato", "texto": "Preço"}]
    seco = ["O site sai por R$ 600."]
    bom = ["Com o site, quem procura a clínica no Google acha o endereço e chama direto no WhatsApp, e a prévia já está pronta. Tudo isso por R$ 600."]
    assert forma_do_preco(seco, hist) and not forma_do_preco(bom, hist)
    # duas mensagens: o beneficio na primeira e o valor na segunda tambem vale
    assert not forma_do_preco(["Quem procura a clínica no Google acha o site e chama direto no WhatsApp, com a prévia já pronta para você ver.", "Tudo isso por R$ 600."], hist)
    # ja foi dito antes: negociar nao precisa repetir o beneficio
    assert not forma_do_preco(["À vista fica R$ 540."], hist + [{"de": "robo", "texto": "Fica R$ 600."}, {"de": "contato", "texto": "faz por 500?"}])


def test_decidir_reescreve_o_preco_seco_com_beneficio_antes():
    hist = [{"de": "robo", "texto": ABORDAGEM}, {"de": "contato", "texto": "Preço"}]
    respostas = [{"mensagens": ["R$ 600."]},
                 {"mensagens": ["Quem busca a clínica no Google acha o seu site e chama direto no WhatsApp, e a prévia já está pronta. Tudo isso por R$ 600. Quer ver?"]}]
    d = decidir(hist, "whatsapp", {}, {"ativo": True, "catalogo": "Site: R$ 600"}, None, lambda p: respostas.pop(0))
    assert "Tudo isso por R$ 600" in d.mensagens[0] and not d.passar_para_humano


def test_preco_seco_na_segunda_tentativa_ainda_sai_sem_chamar_o_humano():
    hist = [{"de": "robo", "texto": ABORDAGEM}, {"de": "contato", "texto": "Preço"}]
    d = decidir(hist, "whatsapp", {}, {"ativo": True, "catalogo": "Site: R$ 600"}, None, lambda p: {"mensagens": ["R$ 600."]})
    assert d.mensagens == ["R$ 600."] and not d.passar_para_humano


# ------------------------------------------------------------------ o caso real: [LINK_DA_PREVIA], "preparei" sem previa e resposta em quadruplicata

def test_marcador_de_modelo_nunca_chega_ao_cliente():
    from app.ai_sdr import resolver_marcadores
    erros = problemas_da_resposta(["Que ótimo! Segue o link da prévia: [LINK_DA_PREVIA]."], {}, HISTORICO, {"site_publicado": "https://x.test/s/a"})
    assert any("marcador" in e for e in erros)
    # com a previa criada, o marcador vira o link de verdade
    assert resolver_marcadores(["Segue: [LINK_DA_PREVIA]."], {"site_publicado": "https://x.test/s/a"}) == ["Segue: https://x.test/s/a."]
    # sem previa, nao ha o que colocar no lugar
    assert resolver_marcadores(["Segue: [LINK_DA_PREVIA]."], {}) == ["Segue: [LINK_DA_PREVIA]."]


@pytest.mark.parametrize("texto", [
    "Que ótimo! Preparei esse esboço focado em converter quem pesquisa por dentista.",
    "Vou te enviar o link da prévia agora.",
    "Segue o link da prévia para você analisar.",
    "Montei uma prévia do site de vocês.",
])
def test_sem_previa_criada_o_robo_nao_diz_que_preparou_nem_manda_link(texto):
    erros = problemas_da_resposta([texto], {}, HISTORICO, {})
    assert any("NENHUMA prévia" in e for e in erros)


def test_com_previa_criada_pode_falar_dela_mas_o_link_precisa_estar_la():
    lead = {"site_publicado": "https://x.test/s/clinica"}
    assert problemas_da_resposta(["Montei uma prévia do site de vocês."], {}, HISTORICO, lead) == []
    assert any("sem colocar o link" in e for e in problemas_da_resposta(["Segue o link da prévia, é só abrir."], {}, HISTORICO, lead))
    assert problemas_da_resposta(["Segue o link da prévia: https://x.test/s/clinica"], {}, HISTORICO, lead) == []


def test_decidir_sem_previa_nao_deixa_o_modelo_alucinar_e_passa_ao_dono():
    hist = [{"de": "robo", "texto": ABORDAGEM}, {"de": "contato", "texto": "Ok"}]
    d = decidir(hist, "whatsapp", {}, {"ativo": True}, {"id": "L1", "name": "Clínica"},
                lambda p: {"mensagens": ["Que ótimo! Segue o link da prévia: [LINK_DA_PREVIA]."]})
    assert d.passar_para_humano and not d.mensagens and "conferência" in d.motivo


def test_prompt_diz_se_a_previa_existe():
    from app.ai_sdr import montar_prompt
    sem = montar_prompt(HISTORICO, "whatsapp", {}, {"ativo": True}, {"name": "Clínica"})
    com = montar_prompt(HISTORICO, "whatsapp", {}, {"ativo": True}, {"name": "Clínica", "site_publicado": "https://x.test/s/c"})
    assert "Ainda NÃO existe prévia criada" in sem and "https://x.test/s/c" in com and "Ainda NÃO existe prévia" not in com


@pytest.mark.parametrize("auto", [
    "Agradecemos pela sua mensagem.\n\nClínica Alluve ✨",
    "Olá! No momento não estamos disponíveis. Responderemos em breve.",
])
def test_resposta_automatica_de_clinica_nao_e_respondida(auto):
    from app.ai_robo import parece_automatica
    assert parece_automatica(auto)


def test_a_mesma_mensagem_do_lead_so_e_respondida_uma_vez_mesmo_com_chamadas_simultaneas(rodar, com_robo):
    import asyncio
    envio = Envio()
    chamadas = []

    def gerar(p):
        chamadas.append(1)
        return {"mensagens": ["Perfeito! Amanhã às 15h ou sexta às 10h, qual fica melhor?"], "etapa": "agendamento"}

    async def varias():
        m = msg("Pode me explicar melhor como funciona?", 1, contato="5511955556666")
        await robo_service.processar(cfg(), m, gerar=gerar, enviar=envio, adiar=True)       # guarda a mensagem
        # o agrupador, a nova tentativa e a varredura chamam ao mesmo tempo
        return await asyncio.gather(*[robo_service.processar(cfg(), m, gerar=gerar, enviar=envio, reprocessar=True) for _ in range(4)])

    rodar(varias)
    assert len(envio.enviados) == 1 and len(chamadas) == 1


# ------------------------------------------------------------------ o lead disse "ok": o robo CRIA a previa e manda o link

LEAD_CLINICA = {"id": "L77", "name": "Clínica Alluve", "company": "Clínica Alluve", "niche": "Estética", "city": "Botucatu",
                "phone": "5514998005560", "rating": 4.8, "rating_count": 115, "address": "Rua Amando de Barros, 480"}


@pytest.fixture(autouse=True)
def motor_de_sites_falso(monkeypatch):
    """O motor de sites (funcao Node) e o banco de imagens saem do ar nos testes: aqui so se confere o que o robo faz com eles."""
    from app import previa_site
    chamadas = []

    async def renderizar(lead, fotos):
        chamadas.append((lead, fotos))
        nome = lead.get("company") or lead.get("name") or "Empresa"
        return {"html": f"<!DOCTYPE html><html><body><h1>{nome}</h1><p>{lead.get('niche', '')}</p></body></html>",
                "template": "Modelo de teste", "company": nome, "builder_data": "{}"}

    async def fotos(nicho, quantidade=8):
        return ["https://exemplo.test/f1.jpg", "https://exemplo.test/f2.jpg"]

    monkeypatch.setattr(previa_site, "renderizar", renderizar)
    monkeypatch.setattr(previa_site, "fotos_do_ramo", fotos)
    return chamadas


def test_a_previa_e_o_site_da_empresa_com_os_dados_dela_e_fotos_do_ramo(rodar, com_robo, motor_de_sites_falso):
    from app import previa_site
    from app.sites_store import list_sites
    url, falha = rodar(previa_site.criar, "alice", "alice@example.com", LEAD_CLINICA)
    assert falha == "" and "/s/clinica-alluve-" in url
    lead, fotos = motor_de_sites_falso[0]
    assert lead["company"] == "Clínica Alluve" and lead["niche"] == "Estética" and lead["rating"] == 4.8 and lead["phone"] == "5514998005560"
    assert fotos == ["https://exemplo.test/f1.jpg", "https://exemplo.test/f2.jpg"]
    assert [s["template"] for s in rodar(list_sites, "alice") if s.get("lead_id") == "L77"] == ["Modelo de teste"]


def test_motor_fora_do_ar_nao_publica_pagina_nenhuma(rodar, com_robo, monkeypatch):
    from app import previa_site
    from app.sites_store import list_sites

    async def cai(lead, fotos):
        raise RuntimeError("o motor de sites respondeu 502")
    monkeypatch.setattr(previa_site, "renderizar", cai)
    url, falha = rodar(previa_site.criar, "alice", "alice@example.com", LEAD_CLINICA)
    assert url == "" and "502" in falha
    assert [s for s in rodar(list_sites, "alice") if s.get("lead_id") == "L77"] == []   # nada de pagina generica no lugar


def test_o_servidor_chama_o_motor_com_o_segredo(rodar, monkeypatch):
    import httpx
    from app import previa_site
    from app.config import settings
    monkeypatch.undo()  # volta ao renderizar de verdade; so a rede e simulada
    visto = {}

    def tratar(req: httpx.Request) -> httpx.Response:
        import json
        visto["url"], visto["segredo"], visto["corpo"] = str(req.url), req.headers.get("x-render-secret"), json.loads(req.content)
        return httpx.Response(200, json={"html": "<html></html>", "template": "Noir Vidro", "company": "X", "builder_data": "{}"})

    real = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(tratar), **kw))
    monkeypatch.setattr(settings, "WORKER_SECRET", "segredo-do-motor-1234567890")
    saida = rodar(previa_site.renderizar, {**LEAD_CLINICA, "campo_estranho": "x"}, ["https://exemplo.test/f1.jpg"])
    assert saida["template"] == "Noir Vidro" and visto["url"].endswith("/api/render-site") and visto["segredo"] == "segredo-do-motor-1234567890"
    assert visto["corpo"]["lead"]["company"] == "Clínica Alluve" and "campo_estranho" not in visto["corpo"]["lead"]
    assert visto["corpo"]["fotos"] == ["https://exemplo.test/f1.jpg"]


def test_criar_previa_publica_o_site_do_lead_e_devolve_o_link(rodar, com_robo):
    from app import previa_site
    from app.sites_store import list_sites
    url, falha = rodar(previa_site.criar, "alice", "alice@example.com", LEAD_CLINICA)
    assert falha == "" and "/s/clinica-alluve-" in url
    assert any(s.get("lead_id") == "L77" for s in rodar(list_sites, "alice"))


def test_decidir_marca_para_criar_a_previa_quando_o_lead_aceita():
    hist = [{"de": "robo", "texto": ABORDAGEM}, {"de": "contato", "texto": "Ok"}]
    d = decidir(hist, "whatsapp", {}, {"ativo": True}, {"id": "L77", "name": "Clínica"},
                lambda p: {"mensagens": ["Perfeito! Aqui está a prévia: [LINK_DA_PREVIA] Me conta o que achou?"], "enviar_previa": True})
    assert d.criar_previa and not d.passar_para_humano and "[LINK_DA_PREVIA]" in d.mensagens[0]


def test_conversa_completa_o_lead_diz_ok_recebe_o_link_de_verdade_e_uma_unica_resposta(rodar, com_robo):
    import asyncio
    from app import pipeline_store
    envio = Envio()
    rodar(pipeline_store.registrar, "alice", {**LEAD_CLINICA})
    rodar(fila_envio._gravar, "alice", {"id": "f_L77", "lead_id": "L77", "nome": "Clínica Alluve", "canal": "whatsapp", "texto": ABORDAGEM,
                                         "status": "enviado", "enviado_em": "2026-10-14T12:00:00+00:00", "contato": {"phone": "5514998005560"}})
    chamadas = []

    def gerar(p):
        chamadas.append(p)
        return {"mensagens": ["Perfeito! Aqui está a prévia: [LINK_DA_PREVIA] Me conta o que achou?"], "enviar_previa": True, "etapa": "proposta"}

    async def fluxo():
        m = meta_canais.Recebida(canal="whatsapp", contato="5514998005560", nome="Clínica", texto="Ok", meta_id="mOK", momento=1)
        await robo_service.processar(cfg(), m, gerar=gerar, enviar=envio, adiar=True)
        return await asyncio.gather(*[robo_service.processar(cfg(), m, gerar=gerar, enviar=envio, reprocessar=True) for _ in range(3)])

    rodar(fluxo)
    assert len(envio.enviados) == 1
    texto = envio.enviados[0]
    assert "[LINK" not in texto and "/s/clinica-alluve-" in texto and "Me conta o que achou" in texto
    from app.sites_store import list_sites
    assert len([s for s in rodar(list_sites, "alice") if s.get("lead_id") == "L77"]) == 1   # criou UM site, nao tres


def test_se_nao_da_para_criar_a_previa_sai_so_o_aviso_e_o_dono_assume(rodar, com_robo, monkeypatch):
    from app import previa_site
    from app import pipeline_store

    async def falha(uid, email, lead):
        return "", "sem vagas"
    monkeypatch.setattr(previa_site, "criar", falha)
    envio = Envio()
    rodar(pipeline_store.registrar, "alice", {**LEAD_CLINICA})
    m = meta_canais.Recebida(canal="whatsapp", contato="5514998005560", nome="Clínica", texto="Ok", meta_id="mOK2", momento=1)
    c = rodar(robo_service.processar, cfg(), m, gerar=lambda p: {"mensagens": ["Aqui está: [LINK_DA_PREVIA]"], "enviar_previa": True}, enviar=envio)
    assert envio.enviados == ["Perfeito! Estou finalizando a prévia e já te envio o link por aqui."]
    assert c["precisa_humano"] and "crie e envie o link" in c["motivo"]


# ------------------------------------------------------------------ o dono manda a previa com um clique

def test_botao_enviar_previa_cria_o_site_e_manda_o_link_na_conversa(rodar, com_robo):
    from app import pipeline_store
    from app.sites_store import list_sites
    envio = Envio()
    rodar(pipeline_store.registrar, "alice", {**LEAD_CLINICA})
    m = meta_canais.Recebida(canal="whatsapp", contato="5514998005560", nome="Clínica", texto="Ok", meta_id="mBTN", momento=1)
    c = rodar(robo_service.processar, cfg(), m, adiar=True)           # a mensagem do lead ficou na conversa
    c["precisa_humano"], c["motivo"] = True, "o robô se perdeu"
    rodar(robo_service.robo_store.salvar_conversa, "alice", c)
    r = rodar(robo_service.enviar_previa, "alice", "alice@example.com", c["id"], envio)
    assert len(envio.enviados) == 1 and "/s/clinica-alluve-" in envio.enviados[0] and "[LINK" not in envio.enviados[0]
    assert not r["precisa_humano"] and r["sdr"]["previa_enviada"].startswith("http")
    assert len([s for s in rodar(list_sites, "alice") if s.get("lead_id") == "L77"]) == 1
    # clicar de novo manda o MESMO link, sem criar outro site
    rodar(robo_service.enviar_previa, "alice", "alice@example.com", c["id"], envio)
    assert envio.enviados[0].split(": ")[1].split("\n")[0] == envio.enviados[1].split(": ")[1].split("\n")[0]
    assert len([s for s in rodar(list_sites, "alice") if s.get("lead_id") == "L77"]) == 1


def test_previa_por_telefone_funciona_de_qualquer_tela(rodar, com_robo):
    from app import pipeline_store
    envio = Envio()
    rodar(pipeline_store.registrar, "alice", {**LEAD_CLINICA})
    r = rodar(robo_service.enviar_previa_por_telefone, "alice", "alice@example.com", "5514998005560", "", envio)
    assert "/s/clinica-alluve-" in r["url"] and len(envio.enviados) == 1 and r["url"] in envio.enviados[0]
    with pytest.raises(LookupError):
        rodar(robo_service.enviar_previa_por_telefone, "alice", "alice@example.com", "5511900000000", "", envio)


def test_rota_de_previa_por_telefone(client, com_robo):
    r = client.post("/api/robo/previa", json={"telefone": "5511900000000"})
    assert r.status_code in (404, 402, 403)
