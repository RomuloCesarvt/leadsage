"""Modo empresa: o robô é forte quando o cliente chama primeiro e usa o roteiro do serviço pedido."""
from app import ai_sdr

CFG_AR = {"oferta": {"servico": "ar", "tabela_precos": "Limpeza de split 9 a 12 mil BTU: R$ 150"}}


def _prompt(msgs, cfg=CFG_AR, lead=None):
    return ai_sdr.montar_prompt(msgs, "whatsapp", {"name": "Ana"}, dict(cfg), lead, raio=None)


def test_cliente_chamou_primeiro_ativa_o_bloco_receptivo():
    p = _prompt([{"de": "contato", "texto": "Oi, quanto custa a limpeza de um split?"}])
    assert "QUEM CHAMOU PRIMEIRO" in p and "ROTEIRO DO SERVIÇO PEDIDO" in p
    assert "SERVIÇO: LIMPEZA" in p and "SERVIÇO: INSTALAÇÃO" not in p


def test_abordagem_da_equipe_nao_ativa_o_receptivo():
    p = _prompt([{"de": "robo", "texto": "Bom dia! Trabalho com ar-condicionado."}, {"de": "contato", "texto": "pode ser"}])
    assert "QUEM CHAMOU PRIMEIRO" not in p
    assert not ai_sdr._contato_chamou_primeiro([{"de": "voce", "texto": "oi"}, {"de": "contato", "texto": "oi"}])


def test_roteiro_por_servico_e_urgencia():
    assert "CONSERTO" in ai_sdr._roteiro_do_servico([{"de": "contato", "texto": "meu ar parou de gelar e está pingando"}])
    assert "INSTALAÇÃO" in ai_sdr._roteiro_do_servico([{"de": "contato", "texto": "preciso instalar um split novo"}])
    assert "MANUTENÇÃO" in ai_sdr._roteiro_do_servico([{"de": "contato", "texto": "temos uma clínica e queremos manutenção preventiva"}])
    assert "AINDA NÃO DEFINIDO" in ai_sdr._roteiro_do_servico([{"de": "contato", "texto": "oi"}])
    assert "urgência" in ai_sdr.RECEPTIVO_LOCAL.lower() and "queimado" in ai_sdr.RECEPTIVO_LOCAL


def test_agencia_nao_recebe_blocos_do_modo_empresa():
    p = ai_sdr.montar_prompt([{"de": "contato", "texto": "oi"}], "whatsapp", {"name": "Ana"}, {}, None, raio=None)
    assert "QUEM CHAMOU PRIMEIRO" not in p and "ROTEIRO DO SERVIÇO PEDIDO" not in p
