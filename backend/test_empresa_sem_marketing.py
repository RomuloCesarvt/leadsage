"""Modo empresa vende serviço (ar-condicionado): nenhuma fala de Google, nota, avaliação ou marketing."""
import re

from app import abordagem_mestra, ai_sdr
from app.ai_generator import _dossie
from app.models import LeadItem

CFG_AR = {"oferta": {"servico": "ar"}}
PROIBIDO = re.compile(r"google|avalia|nota|estrela|reputa|marketing", re.I)


def _lead():
    return LeadItem(id="1", name="Clínica Sorriso", avatar="", role="Dentista", niche="Dentista", company="Clínica Sorriso", location="Bauru", email="",
                    phone="", whatsapp=True, socials={}, quality_score=70, verified=True, outreach_status="Pendente",
                    city="Bauru", neighborhood="Centro", rating=4.8, rating_count=120,
                    google_description="Clínica odontológica", review_highlight="Atendimento excelente",
                    reviews_sample=[{"text": "Ótimo, mas muito calor na sala", "rating": 5}])


def test_dossie_da_abordagem_local_nao_traz_avaliacao_nem_nota():
    texto = _dossie(_lead(), local=True)
    assert "Clínica Sorriso" in texto and "Bauru" in texto
    assert not PROIBIDO.search(texto)


def test_estilos_e_ramo_locais_sem_marketing():
    assert "pesquisando no Google" not in abordagem_mestra.estrutura("Ana", previa="nenhuma", lead_id="1", nicho="Dentista").split("NÃO fale")[0]
    assert not PROIBIDO.search(abordagem_mestra.bloco_do_ambiente("Dentista").split("Você vende")[0])
    for n in range(len(abordagem_mestra.ESTILOS_LOCAL)):
        assert not PROIBIDO.search(abordagem_mestra.estilo_da_mensagem("x", n, local=True))


def test_revisao_barra_mensagem_local_com_google_ou_nota():
    assert abordagem_mestra.revisar_roteiro("Oi! Vi sua nota 4,8 no Google. Quer um orçamento?", False, "nenhuma")
    assert not abordagem_mestra.revisar_roteiro("Oi! Trabalho com limpeza de ar-condicionado. Quer um orçamento?", False, "nenhuma")


def test_resposta_do_robo_no_modo_empresa_barra_marketing():
    erros = ai_sdr.problemas_da_resposta(["Vi suas avaliações no Google, quer um orçamento?"], CFG_AR, [], {})
    assert any("SERVIÇO" in e for e in erros)
    assert not any("SERVIÇO" in e for e in ai_sdr.problemas_da_resposta(["Posso passar um orçamento de limpeza?"], CFG_AR, [], {}))


def test_prompt_do_robo_empresa_sem_dossie_de_marketing():
    lead = {"id": "1", "company": "Clínica Sorriso", "niche": "Dentista", "city": "Bauru", "rating": 4.8, "rating_count": 120,
            "missingDigitalAssets": ["website"], "diagnosis": "sem site"}
    prompt = ai_sdr.montar_prompt([{"de": "contato", "texto": "oi"}], "whatsapp", {"name": "Ana"}, dict(CFG_AR), lead, raio={"gmn": {"resumo_avaliacoes": "bom"}})
    assert "Clínica Sorriso" in prompt
    assert "nota 4.8" not in prompt and "O que falta no digital" not in prompt and "Diagnóstico da busca" not in prompt
    assert "resumo do Google" not in prompt


def test_apresentacao_e_roteiro_da_abordagem_local_trazem_o_servico_e_a_oferta():
    est = abordagem_mestra.estrutura("Ana", previa="nenhuma", lead_id="1", nicho="Dentista")
    assert "ar-condicionado" in est.split("2.")[0] and "presença digital" not in est and "Google e WhatsApp" not in est
    assert "ENCONTREI SUA EMPRESA" in est and "A OFERTA" in est


def test_promocao_ativa_entra_nos_fatos_do_servico():
    from app import ai_oferta
    cfg = {"oferta": {"servico": "ar", "nome": "Limpeza"}, "promocao": {"ativa": True, "preco": "347", "inclui": "Limpeza completa", "servico": "Limpeza de split"}}
    assert "PROMOÇÃO ATIVA: Limpeza de split por R$ 347" in ai_oferta.bloco_do_servico(cfg, None)
    cfg["promocao"]["ativa"] = False
    assert "PROMOÇÃO ATIVA" not in ai_oferta.bloco_do_servico(cfg, None)
