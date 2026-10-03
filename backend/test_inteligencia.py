"""Testes da inteligencia do lead, da revisao de copy e dos geradores.

Cobrem o que separa uma busca rica de uma lista de nomes, e uma
abordagem que recebe resposta de um texto que qualquer um poderia ter
mandado:

- o diagnostico do site (e daqui que sai "seu site nao abre no celular");
- os ganchos verificados que abrem a conversa;
- a revisao que segura cliche, tamanho errado de canal e numero inventado;
- o JSON da IA, que chega torto com frequencia e precisa ser consertado;
- a degradacao da mascara do Google, para a busca nao morrer quando a
  conta nao tem direito aos campos ricos.

Rodar:  cd backend && python -m pytest test_inteligencia.py -v
"""
import json

import pytest

from app.ai_client import AIIndisponivel, gerar_json, reparar_json
from app.copy_knowledge import regras_do_tom, revisar_copy
from app.lead_intel import (
    analisar_site,
    faixa_de_preco,
    ler_avaliacoes,
    melhor_canal,
    montar_diagnostico,
    montar_ganchos,
    qualidade_do_site,
)
from app.leads_engine import _e_recusa_de_mascara, score_lead


HTML_RUIM = """<html><head><title>Oficina</title></head>
<body><p>Rodape</p>&copy; 2018 Oficina<div class="wp-content"></div></body></html>"""

HTML_BOM = """<html><head><title>Clinica Sorriso</title>
<meta name="viewport" content="width=device-width">
<meta name="description" content="Clinica odontologica em Salvador com atendimento humanizado.">
<script src="https://www.googletagmanager.com/gtag/js"></script></head>
<body><a href="https://wa.me/5571999990000">WhatsApp</a>
<a href="tel:+557133334444">Ligar</a><form></form>
<a href="/agendar">Agende sua consulta</a></body></html>"""


# ------------------------------------------------------- diagnostico do site

def test_site_que_nao_abre_e_um_achado_e_nao_um_vazio():
    """Site no Google que responde erro e argumento de venda, nao ausencia."""
    sinais = analisar_site("", "https://exemplo.com.br", status=0)
    nota, problemas = qualidade_do_site(sinais, 2026)
    assert nota == 0
    assert "não abre" in problemas[0]


def test_site_sem_viewport_perde_por_causa_do_celular():
    sinais = analisar_site(HTML_RUIM, "http://oficina.com.br", 200, 900)
    nota, problemas = qualidade_do_site(sinais, 2026)
    assert sinais["responsivo"] is False
    assert sinais["https"] is False
    assert sinais["plataforma"] == "WordPress"
    assert sinais["ano_rodape"] == 2018
    assert nota < 40
    assert any("celular" in p for p in problemas)
    assert any("2018" in p for p in problemas)


def test_site_completo_tira_nota_alta():
    sinais = analisar_site(HTML_BOM, "https://clinica.com.br", 200, 800)
    nota, problemas = qualidade_do_site(sinais, 2026)
    assert sinais["responsivo"] and sinais["tem_whatsapp"] and sinais["tem_agendamento"]
    assert sinais["tem_analytics"] and sinais["descricao"]
    assert nota >= 90, problemas


def test_site_lento_e_penalizado():
    rapido = qualidade_do_site(analisar_site(HTML_BOM, "https://x.com", 200, 500), 2026)[0]
    lento = qualidade_do_site(analisar_site(HTML_BOM, "https://x.com", 200, 6000), 2026)[0]
    assert lento < rapido


def test_construtor_gratuito_conta_como_falta_de_dominio():
    sinais = analisar_site(HTML_BOM, "https://padaria.wixsite.com/inicio", 200, 500)
    assert sinais["dominio_proprio"] is False
    assert any("domínio próprio" in p for p in qualidade_do_site(sinais, 2026)[1])


# ------------------------------------------------------------------ score

def test_site_ruim_vale_mais_oportunidade_que_site_bom():
    """Quem TEM site deixava de ser oportunidade, o que e falso: site que
    nao converte e venda de reforma."""
    args = (True, True, True, True, True, True, 4.5, 100)
    ruim = score_lead(*args, site_quality=25)[0]
    bom = score_lead(*args, site_quality=95)[0]
    assert ruim > bom


def test_score_continua_funcionando_sem_os_campos_novos():
    """A assinatura antiga e usada em codigo e em teste ja existentes."""
    assert score_lead(False, False, False, False, False, False, 0, 0)[0] > 0


# ------------------------------------------------------------- avaliacoes

def test_avaliacoes_viram_material_de_conversa():
    lidas = ler_avaliacoes([
        {"rating": 5, "text": {"text": "Atendimento excelente, recomendo muito o lugar."},
         "relativePublishTimeDescription": "há 2 semanas"},
        {"rating": 2, "text": {"text": "Demora demais na fila e o lugar estava sujo."}},
    ])
    assert lidas["elogios"] == 1
    assert lidas["reclamacoes"] == 1
    assert "recomendo" in lidas["destaque"]
    assert lidas["amostra"][0]["when"] == "há 2 semanas"


def test_avaliacao_sem_texto_nao_entra():
    assert ler_avaliacoes([{"rating": 5}])["amostra"] == []


def test_faixa_de_preco_traduz_o_enum():
    assert faixa_de_preco("PRICE_LEVEL_MODERATE") == ("$$", 2)
    assert faixa_de_preco("") == ("", None)


# ---------------------------------------------------------------- ganchos

def retrato(**extra):
    base = {
        "company": "Padaria Pão Quente", "city": "Salvador", "neighborhood": "Pituba",
        "rating": 4.7, "rating_count": 213, "site_status": "none",
        "socials": {}, "phone": "5571999990000", "whatsapp": True, "email": "",
    }
    base.update(extra)
    return base


def test_gancho_usa_nota_no_formato_brasileiro():
    ganchos = montar_ganchos(retrato())
    assert "4,7" in ganchos[0] and "4.7" not in ganchos[0]


def test_gancho_diz_que_nao_ha_site():
    assert any("não tem para onde ir" in g for g in montar_ganchos(retrato()))


def test_gancho_de_site_com_defeito_cita_o_defeito():
    ganchos = montar_ganchos(retrato(
        site_status="own", site_issues=["não se adapta ao celular"], site_platform="Wix"
    ))
    assert any("não se adapta ao celular" in g for g in ganchos)
    assert any("Wix" in g for g in ganchos)


def test_diagnostico_separa_quem_precisa_construir_de_quem_precisa_reformar():
    sem_site = montar_diagnostico(retrato())
    com_site_ruim = montar_diagnostico(retrato(site_status="own", site_quality=35))
    assert "nenhum site próprio" in sem_site
    assert "reforma" in com_site_ruim


def test_melhor_canal_segue_o_que_o_lead_tem():
    assert melhor_canal(retrato()) == "whatsapp"
    assert melhor_canal(retrato(whatsapp=False, phone="", email="a@b.com")) == "email"
    assert melhor_canal(
        retrato(whatsapp=False, phone="", email="", socials={"instagram": "x"})
    ) == "instagram_direct"


# ------------------------------------------------------------ revisao da copy

def test_revisao_pega_cliche():
    problemas = revisar_copy("Espero que esteja bem. Podemos conversar?", "whatsapp")
    assert any("clichê" in p for p in problemas)


def test_revisao_cobra_o_tamanho_do_canal():
    texto = " ".join(["palavra"] * 120) + " Topa?"
    assert any("limite deste canal" in p for p in revisar_copy(texto, "whatsapp"))
    assert not any("limite deste canal" in p for p in revisar_copy(texto, "email"))


def test_revisao_recusa_duas_perguntas():
    assert any("perguntas" in p for p in revisar_copy("Tudo bem? Quer ver?", "whatsapp"))


def test_revisao_cobra_pergunta_no_fim():
    assert any("não termina em pergunta" in p for p in revisar_copy("Segue o material.", "email"))


def test_revisao_pega_campo_de_modelo_esquecido():
    assert any("modelo" in p for p in revisar_copy("Olá [NOME], vamos conversar?", "email"))


def test_revisao_pega_numero_inventado():
    """A invencao escapa mais nos seguimentos, quando o modelo procura
    'algo novo para dizer'."""
    assert any("15 encomendas" in p for p in revisar_copy(
        "A padaria vizinha recebe 15 encomendas por mês. Faz sentido?", "whatsapp"))
    assert any("30%" in p for p in revisar_copy("Aumentamos 30% as vendas. Topa?", "whatsapp"))


def test_numero_real_do_google_nao_e_confundido_com_invencao():
    assert revisar_copy("Nota 4,7 com 213 avaliações e nenhum site. Quer ver?", "whatsapp") == []


def test_revisao_barra_emoji_em_email():
    assert any("emoji" in p for p in revisar_copy("Oi 😀 quer ver?", "email"))
    assert not any("emoji" in p for p in revisar_copy("Oi 😀 quer ver?", "whatsapp"))


def test_tom_devolve_instrucao_concreta_e_nao_um_rotulo():
    tom = regras_do_tom("Direto")
    assert "duas ou tres frases" in tom["postura"]
    assert regras_do_tom("inexistente") == regras_do_tom("Consultivo")


# ---------------------------------------------------------------- JSON da IA

def test_reparo_tira_bloco_markdown_e_virgula_sobrando():
    bruto = '```json\n{"a": 1, "b": [1, 2,],}\n```'
    assert json.loads(reparar_json(bruto)) == {"a": 1, "b": [1, 2]}


def test_reparo_aceita_texto_antes_e_depois():
    bruto = 'Claro! Aqui esta:\n{"body": "oi"}\nEspero ter ajudado.'
    assert json.loads(reparar_json(bruto))["body"] == "oi"


def test_reparo_conserta_quebra_de_linha_dentro_da_string():
    """O modelo escreve o corpo com Enter de verdade no lugar de \\n."""
    bruto = '{"body": "primeira linha\nsegunda linha"}'
    assert "\n" in json.loads(reparar_json(bruto))["body"]


def test_reparo_troca_aspas_curvas():
    assert json.loads(reparar_json('{“body”: “oi”}'))["body"] == "oi"


class ClienteFalso:
    """Modelo de mentira: devolve as respostas na ordem em que foram dadas."""

    def __init__(self, respostas):
        self.respostas = list(respostas)
        self.pedidos = []

    class _Models:
        def __init__(self, pai):
            self.pai = pai

        def generate_content(self, model, contents):
            self.pai.pedidos.append(contents)
            texto = self.pai.respostas.pop(0)

            class R:
                text = texto
            return R()

    @property
    def models(self):
        return ClienteFalso._Models(self)


def test_json_invalido_e_devolvido_ao_modelo_com_o_erro():
    cliente = ClienteFalso(["isso nao e json", '{"body": "certo"}'])
    assert gerar_json(cliente, "escreva", obrigatorias=["body"])["body"] == "certo"
    assert "não foi aceito" in cliente.pedidos[1]


def test_chave_obrigatoria_faltando_tambem_pede_de_novo():
    cliente = ClienteFalso(['{"subject": "oi"}', '{"body": "agora sim"}'])
    assert gerar_json(cliente, "escreva", obrigatorias=["body"])["body"] == "agora sim"


def test_json_que_nunca_abre_vira_falha_e_nao_texto_na_tela():
    cliente = ClienteFalso(["nada", "nada tambem"])
    with pytest.raises(AIIndisponivel):
        gerar_json(cliente, "escreva", obrigatorias=["body"], tentativas=2)


# ------------------------------------------------------- mascara do Google

@pytest.mark.parametrize("mensagem,status", [
    ("Invalid field mask: places.reviews", 400),
    ("Unknown name 'editorialSummary'", 400),
    ("This field is not supported for your SKU", 403),
])
def test_recusa_de_mascara_e_reconhecida(mensagem, status):
    assert _e_recusa_de_mascara(mensagem, status)


@pytest.mark.parametrize("mensagem,status", [
    ("Quota exceeded for quota metric 'SearchTextRequest'", 429),
    ("The service is currently unavailable", 503),
    ("API key not valid", 400),
])
def test_erro_que_nao_e_de_mascara_nao_degrada_a_busca(mensagem, status):
    assert not _e_recusa_de_mascara(mensagem, status)


# --------------------------------------------------- endpoints dos geradores
#
# Fixtures (`client`, `com_plano`) vem de conftest.py.

def lead_minimo(**extra):
    base = {
        "id": "lead1", "name": "Padaria Teste", "avatar": "", "role": "Padaria",
        "niche": "padaria", "company": "Padaria Teste", "location": "Salvador - BA",
        "city": "Salvador", "email": "", "phone": "5571999990000",
        "socials": {}, "quality_score": 70, "verified": True,
        "outreach_status": "Pendente", "pipeline_stage": "Novos",
    }
    base.update(extra)
    return base


def test_falha_da_ia_vira_503_e_nao_texto_no_corpo_da_mensagem(client, com_plano, monkeypatch):
    """O erro ia para dentro do campo de texto, com o botao de disparar
    ligado: dava para mandar "Houve um erro ao processar com a IA: 404"
    para o prospect."""
    com_plano("agencia")

    async def explode(req, api_key=None):
        raise AIIndisponivel("O Gemini está com alta demanda.")

    monkeypatch.setattr("app.main.AIGenerator.generate_pitch", explode)
    resposta = client.post("/api/generate-pitch", json={"lead": lead_minimo(), "tone": "Direto"})
    assert resposta.status_code == 503
    assert "alta demanda" in resposta.json()["detail"]


def test_texto_do_site_devolve_conteudo_e_identidade(client, com_plano, monkeypatch):
    recebido = {}

    async def falso(alvo, chave, servico=""):
        recebido.update(alvo)
        return {
            "categoria": "Padaria", "slogan": "Pão quente", "sobre": "Somos daqui.",
            "servicos": [{"titulo": "Bolos", "descricao": "Por encomenda."}],
            "diferenciais": ["Aberto cedo"], "cta": "Encomendar",
            "seo_titulo": "Padaria Teste", "seo_descricao": "Padaria em Salvador",
            "identidade": {"primaria": "#9a3412", "destaque": "#f59e0b",
                           "tipografia": "classica", "cantos": "redondo", "layout": "vitrine"},
        }

    com_plano("agencia")
    monkeypatch.setattr("app.main.gerar_conteudo_de_site", falso)
    resposta = client.post("/api/generate-site-copy", json={"lead": lead_minimo()})
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["identidade"]["layout"] == "vitrine"
    assert corpo["servicos"][0]["titulo"] == "Bolos"
    assert recebido["company"] == "Padaria Teste"


def test_texto_do_site_exige_nome_da_empresa(client, com_plano):
    com_plano("agencia")
    resposta = client.post("/api/generate-site-copy", json={"empresa": "   "})
    assert resposta.status_code == 400


def test_plano_previa_nao_gera_documento(client):
    """propostas e contratos sao recursos de plano; sem plano, 402."""
    resposta = client.post("/api/generate-document", json={"kind": "proposta", "servico": "Site"})
    assert resposta.status_code == 402


def test_documento_com_ia_usa_o_lead_do_proprio_usuario(client, com_plano, monkeypatch):
    """lead_id de outra conta nao pode virar diagnostico no documento."""
    recebido = {}

    async def falso(kind, lead, perfil, dados, chave):
        recebido["lead"] = lead
        recebido["dados"] = dados
        return {
            "kind": kind, "title": "Proposta — Padaria", "content": "PROPOSTA\n\n" + "x" * 500,
            "resumo": "ok", "campos_faltando": ["VALOR"], "aviso": "Confira antes de enviar.",
        }

    com_plano("agencia")
    monkeypatch.setattr("app.main.gerar_documento", falso)
    resposta = client.post("/api/generate-document", json={
        "kind": "proposta", "lead_id": "lead-de-outro", "servico": "Site institucional",
    })
    assert resposta.status_code == 200
    # O lead nao e do usuario: o documento sai sem diagnostico, nao com o
    # diagnostico de outra conta.
    assert recebido["lead"] is None
    assert recebido["dados"]["servico"] == "Site institucional"
    assert resposta.json()["campos_faltando"] == ["VALOR"]


def test_tipo_de_documento_invalido_e_recusado(client, com_plano):
    com_plano("agencia")
    assert client.post("/api/generate-document", json={"kind": "recibo"}).status_code == 400
