"""O robô não acelera: antes de o lead ver o site e pedir valor ou fechamento, ele mostra a prévia e convida para conversar.
Rodar: cd backend && python -m pytest -q test_ritmo_da_conversa.py"""
from app import ai_robo, ai_sdr, fechamento

CFG = {"objetivo": "vender", "oferta": {"servico": "site", "preco": 1500, "prazo_dias": 7, "pix_chave": "x@y.com", "fechamento": "checklist"}}
LEAD = {"company": "Clínica Vida", "niche": "Clínicas", "city": "Botucatu", "phone": "5514999990000"}
OFERTA = {"de": "robo", "texto": "Quer que eu monte uma prévia do site da clínica para você ver como poderia ficar?"}


def M(*falas):
    return [{"de": d, "texto": t} for d, t in falas]


def decidir(mensagens, resposta=None, sdr=None, cfg=CFG, lead=LEAD):
    resposta = resposta or {"entendi": "x", "tipo": "interesse", "mensagens": ["Que bom! Posso te mostrar a prévia?"], "etapa": "descoberta"}
    return ai_robo.decidir(mensagens, "whatsapp", {"company_name": "Frio Total"}, cfg, lead, lambda p: resposta, sdr=sdr)


def test_pode_fazer_depois_da_oferta_da_previa_e_aceite_e_nao_pedido_de_fechamento():
    d = decidir(M(("robo", OFERTA["texto"]), ("contato", "Pode fazer")))
    assert d.criar_previa and any("LINK_DA_PREVIA" in m or "prévia" in m for m in d.mensagens)
    assert "pix" not in d.resposta.lower() and "x@y.com" not in d.resposta
    assert not d.passar_para_humano


def test_pode_seguir_sem_ter_visto_a_previa_nao_dispara_o_checklist():
    d = decidir(M(("robo", "Bom dia! Vi o perfil da clínica no Google."), ("contato", "pode seguir")))
    assert "x@y.com" not in d.resposta and "pix" not in d.resposta.lower()       # foi para a conversa normal, não para o checklist


def test_pedido_explicito_de_fechar_ainda_entrega_o_checklist_mesmo_sem_prévia():
    d = decidir(M(("robo", "Bom dia!"), ("contato", "quero fechar")))
    assert d.passar_para_humano and "x@y.com" in d.resposta


def test_depois_de_ver_a_previa_pode_fazer_vira_fechamento():
    d = decidir(M(("robo", "Aqui está a prévia: https://leadsage.app/s/clinica"), ("contato", "gostei, pode fazer")),
                sdr={"previa_enviada": "https://leadsage.app/s/clinica"})
    assert d.passar_para_humano and "x@y.com" in d.resposta


def test_resposta_do_modelo_que_puxa_pix_sem_o_lead_pedir_e_recusada_e_reescrita():
    chamadas = []

    def gerar(prompt):
        chamadas.append(prompt)
        if len(chamadas) == 1:
            return {"entendi": "x", "tipo": "interesse", "mensagens": ["Perfeito! Já te passo a chave Pix para fecharmos."], "etapa": "fechamento"}
        return {"entendi": "x", "tipo": "interesse", "mensagens": ["Perfeito! Posso te mostrar uma prévia do site?"], "etapa": "descoberta"}

    d = ai_robo.decidir(M(("robo", "Bom dia!"), ("contato", "Bom dia !!!")), "whatsapp", {"company_name": "Frio Total"}, CFG, LEAD, gerar)
    assert len(chamadas) == 2 and "Você puxou o fechamento" in chamadas[1]
    assert "pix" not in d.resposta.lower() and "prévia" in d.resposta


def test_quando_o_lead_pergunta_o_preco_o_robo_pode_falar_de_valor():
    assert ai_sdr.puxou_o_fechamento(["Fica R$ 1.500, com hospedagem inclusa."], M(("contato", "quanto custa?"))) is None


def test_prompt_do_modo_vender_manda_descobrir_mostrar_e_so_depois_fechar():
    p = ai_sdr.montar_prompt(M(("contato", "Bom dia")), "whatsapp", {"company_name": "Frio Total"}, CFG, LEAD)
    assert "RITMO: NÃO ACELERE" in p and "ponto de CHEGADA" in p
    assert "fechar a venda pela conversa" not in p                      # o texto antigo, que empurrava o fechamento desde o início
    assert "Regra dos 3 turnos" in p and "um convite concreto (fechar" not in p


def test_momento_de_compra_no_modo_vender_so_fecha_se_ele_pediu_de_verdade():
    from app import playbook_vendas as pv
    fraco = pv.bloco_do_momento("quero ver", None, False, "a equipe")          # `vender` chega False quando o pedido não é explícito
    assert "DOIS horários" in fraco or "dois horários" in fraco.lower()
    assert "forma de pagamento" not in fraco


def test_so_estas_frases_sao_pedido_explicito_de_fechamento():
    for t in ["quero fechar", "vamos fechar", "onde pago", "manda o pix", "quero contratar", "pode mandar o contrato"]:
        assert fechamento.quer_fechar_forte(t), t
    for t in ["pode fazer", "pode seguir", "pode começar", "aceito", "to dentro", "quero o site", "gostei", "quero ver"]:
        assert not fechamento.quer_fechar_forte(t), t


def test_promocao_so_depois_de_gostar_da_previa():
    from app import playbook_vendas
    assert playbook_vendas.gostou_da_previa("Gostei!")
    assert playbook_vendas.gostou_da_previa("ficou ótimo")
    assert not playbook_vendas.gostou_da_previa("não gostei")
    assert not playbook_vendas.gostou_da_previa("legal, mas não é meu estilo")
    assert not playbook_vendas.gostou_da_previa("quanto custa?")
