"""O servico que o robo vende e o conhecimento de ramo.

O que estes testes travam:

- o preco cadastrado e o UNICO valor que o robo pode citar (mais o desconto
  autorizado): numero fora disso vai para o humano;
- sem preco ou prazo cadastrado, o prompt manda o robo nao prometer;
- o esboço so e "ja pronto" quando existe site preparado para o lead;
- cada ramo recebe o guia certo, e ramo desconhecido recebe o metodo, nao
  um guia errado (palavra no meio de outra nao casa: "spa" em "espaco").
"""
import pytest

from app import ai_oferta, nicho_guia
from app.ai_robo import decidir
from app.ai_sdr import montar_prompt, problemas_da_resposta, valores_permitidos

OFERTA = {
    "servico": "site", "nome": "Site profissional", "preco": "1.500", "prazo_dias": 7,
    "inclui": "Site responsivo com WhatsApp.", "nao_inclui": "Domínio e hospedagem.",
    "esboco": "gratis", "esboco_prazo": "em até 48 horas", "pagamento": "50% e 50%",
}
CFG = {"objetivo": "agendar", "oferta": OFERTA}
LEAD = {"id": "x", "company": "Clínica Sorriso", "niche": "Dentista", "city": "Botucatu"}


# ------------------------------------------------------------------ normalizar

@pytest.mark.parametrize("bruto,esperado", [
    ("1.500", 1500.0), ("1500", 1500.0), ("1500,50", 1500.5), ("R$ 2.000", 2000.0),
    ("2.000,00", 2000.0), ("", 0.0), ("abc", 0.0), (None, 0.0), (-5, 5.0), ("12.5", 12.5),
])
def test_preco_em_qualquer_formato(bruto, esperado):
    assert ai_oferta.normalizar({"preco": bruto})["preco"] == esperado


def test_normalizar_limita_e_corrige():
    o = ai_oferta.normalizar({"servico": "inventado", "esboco": "talvez", "prazo_dias": "9999", "nome": "x" * 500,
                              "campo_estranho": "lixo"})
    assert o["servico"] == "site" and o["esboco"] == "nao" and o["prazo_dias"] == 365
    assert len(o["nome"]) == 80 and "campo_estranho" not in o


def test_preco_do_esboco_so_existe_se_for_pago():
    assert ai_oferta.normalizar({"esboco": "gratis", "esboco_preco": "300"})["esboco_preco"] == 0
    assert ai_oferta.normalizar({"esboco": "pago", "esboco_preco": "300"})["esboco_preco"] == 300


def test_entrada_que_nao_e_dict_nao_quebra():
    assert ai_oferta.normalizar("lixo")["servico"] == "site"


# --------------------------------------------------------------------- aplicar

def test_oferta_vira_catalogo():
    cfg = ai_oferta.aplicar(CFG)
    assert "Site profissional: R$ 1.500 (entrega em 7 dias)" in cfg["catalogo"]


def test_aplicar_e_idempotente_e_soma_o_catalogo_livre():
    uma = ai_oferta.aplicar({**CFG, "catalogo": "Gestão de redes: R$ 900"})
    duas = ai_oferta.aplicar(uma)
    assert duas["catalogo"] == uma["catalogo"] and uma["catalogo"].count("Site profissional") == 1
    assert "Gestão de redes: R$ 900" in uma["catalogo"]


def test_sem_oferta_nada_muda():
    cfg = {"objetivo": "agendar", "catalogo": "x"}
    assert ai_oferta.aplicar(cfg) is cfg


# ------------------------------------------------------------------ verificador

def test_so_o_preco_cadastrado_e_permitido():
    cfg = ai_oferta.aplicar({**CFG, "desconto_maximo": 10})
    msgs = [{"de": "contato", "texto": "quanto custa?"}]
    assert problemas_da_resposta(["Fica R$ 1.500 e entrego em 7 dias."], cfg, msgs) == []
    assert problemas_da_resposta(["Fechando à vista consigo R$ 1.350."], cfg, msgs) == []
    assert problemas_da_resposta(["Faço por R$ 900."], cfg, msgs)
    assert 1500.0 in valores_permitidos(cfg, msgs)


def test_valores_que_o_dono_escreveu_sao_permitidos():
    """Regressao medida em simulacao: 'R$ 40 de hospedagem' e dado do dono."""
    cfg = ai_oferta.aplicar({"oferta": {**OFERTA, "nao_inclui": "Hospedagem: cerca de R$ 40 por mês.",
                                         "pagamento": "50% na aprovação e 50% na entrega; cartão em até 6x"}})
    msgs = [{"de": "contato", "texto": "e a hospedagem?"}]
    assert problemas_da_resposta(["A hospedagem fica em torno de R$ 40 por mês."], cfg, msgs) == []
    assert problemas_da_resposta(["A entrada é de R$ 750."], cfg, msgs) == []
    assert problemas_da_resposta(["Em 6x fica R$ 250 por parcela."], cfg, msgs) == []
    assert problemas_da_resposta(["A hospedagem custa R$ 400 por mês."], cfg, msgs)


def test_preco_inventado_vai_para_o_humano():
    chamadas = []

    def gerar(prompt):
        chamadas.append(prompt)
        return {"mensagens": ["Faço por R$ 999 hoje."], "etapa": "proposta", "temperatura": "morno"}

    d = decidir([{"de": "contato", "texto": "quanto?"}], "whatsapp", {}, CFG, LEAD, gerar)
    assert d.passar_para_humano and len(chamadas) == 2


def test_preco_cadastrado_passa():
    def gerar(prompt):
        return {"mensagens": ["O site profissional sai R$ 1.500, com entrega em 7 dias. Faz sentido ver o esboço?"],
                "etapa": "proposta", "temperatura": "morno"}

    d = decidir([{"de": "contato", "texto": "quanto?"}], "whatsapp", {}, CFG, LEAD, gerar)
    assert not d.passar_para_humano and "R$ 1.500" in d.resposta


# ----------------------------------------------------------------------- prompt

def prompt(cfg=CFG, lead=LEAD):
    return montar_prompt([{"de": "contato", "texto": "oi"}], "whatsapp", {"company_name": "LeadSage"}, cfg, lead)


def test_prompt_traz_os_fatos_do_dono():
    p = prompt()
    for trecho in ("Site profissional", "R$ 1.500", "7 dias", "NÃO inclui", "Domínio e hospedagem", "50% e 50%"):
        assert trecho in p


def test_sem_preco_e_prazo_o_prompt_manda_nao_prometer():
    p = prompt({"oferta": {"servico": "site"}})
    assert "Preço: NÃO cadastrado" in p and "Prazo: NÃO cadastrado" in p


def test_esboco_so_e_pronto_se_ha_site_preparado():
    com = prompt(lead={**LEAD, "site_publicado": "https://x.test/s/abc"})
    sem = prompt()
    assert "já existe um esboço pronto" in com
    assert "Não diga que o esboço já está pronto" in sem and "já existe um esboço pronto" not in sem


def test_esboco_pago_e_sem_esboco():
    pago = prompt({"oferta": {**OFERTA, "esboco": "pago", "esboco_preco": "300"}})
    assert "R$ 300" in pago
    assert "não há esboço antes de fechar" in prompt({"oferta": {**OFERTA, "esboco": "nao"}})


def test_prompt_tem_o_metodo_da_reuniao():
    p = prompt()
    assert "COMO TRAZER A REUNIÃO" in p and "Regra dos 3 turnos" in p and "dois horários concretos" in p


def test_cada_servico_tem_roteiro_proprio():
    assert "Google" in prompt({"oferta": {"servico": "gmn"}}) and "Gestão de redes" in prompt({"oferta": {"servico": "social"}})
    assert "Nunca prometa número de clientes" in prompt({"oferta": {"servico": "trafego"}})


def test_prompt_sem_oferta_continua_funcionando():
    p = prompt({"objetivo": "agendar", "catalogo": "Site: R$ 2.000"})
    assert "Site: R$ 2.000" in p and "O SERVIÇO QUE VOCÊ VENDE AGORA" not in p


# ------------------------------------------------------------------------ ramos

@pytest.mark.parametrize("nicho,esperado", [
    ("Padaria", "Padaria"), ("Dentista", "Dentista"), ("Odontologia", "Dentista"),
    ("Advogados", "Advocacia"), ("Contadores", "Contabilidade"), ("Farmacêuticos", "farmácia"),
    ("Clínica de estética", "Estética"), ("Clínica médica", "Clínica médica"), ("Médicos", "Clínica médica"),
    ("Pizzaria", "Restaurante"), ("Bar e Petiscaria", "Restaurante"), ("Oficina mecânica", "Oficina"),
    ("Encanador", "residenciais"), ("Imobiliária", "Imobiliária"), ("Academia de musculação", "Academia"),
    ("Pet shop", "Pet shop"), ("Espaço Spa", "Estética"),
])
def test_ramo_certo(nicho, esperado):
    assert esperado in nicho_guia.achar(nicho)["nome"]


@pytest.mark.parametrize("nicho", ["Loja de Tintas", "Carpete e tapetes", "Clínica", "", None, "Livraria"])
def test_ramo_desconhecido_recebe_o_metodo(nicho):
    assert nicho_guia.achar(nicho) is None
    assert "não está no guia" in nicho_guia.bloco(nicho)


def test_o_prompt_leva_o_guia_do_ramo():
    assert "Dentista e odontologia" in prompt()
    assert "não está no guia" in prompt(lead={**LEAD, "niche": "Livraria"})


def test_guia_nao_afirma_fato_do_negocio():
    # o guia e conhecimento geral: o prompt manda confirmar, nao afirmar
    assert "confirme perguntando, não afirme" in nicho_guia.bloco("Padaria")


# ------------------------------------------------------------------------- rota

def test_config_guarda_e_normaliza_a_oferta(client, com_plano):
    com_plano("agencia")
    r = client.put("/api/robo/config", json={"oferta": {**OFERTA, "preco": "R$ 1.500", "campo_estranho": "x"}})
    assert r.status_code == 200
    o = r.json()["oferta"]
    assert o["preco"] == 1500.0 and o["esboco"] == "gratis" and "campo_estranho" not in o
    assert client.get("/api/robo/config").json()["oferta"]["prazo_dias"] == 7


def test_config_sem_oferta_devolve_vazio(client, com_plano):
    com_plano("agencia")
    assert client.get("/api/robo/config").json()["oferta"] == {}
