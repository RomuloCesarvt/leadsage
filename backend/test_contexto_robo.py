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
