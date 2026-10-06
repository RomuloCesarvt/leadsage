"""Dossiê do lead: CNPJ, pessoas, dores e abordagem personalizada."""
from datetime import date

from app import dossie
from app.config import settings


def test_cnpj_valido_confere_os_digitos():
    assert dossie.cnpj_valido("11222333000181")
    assert not dossie.cnpj_valido("11222333000182")
    assert not dossie.cnpj_valido("00000000000000")
    assert not dossie.cnpj_valido("123")


def test_acha_cnpj_no_rodape_e_ignora_telefone():
    texto = "Fale conosco (14) 3456-7890 · CEP 18600-000 · CNPJ 11.222.333/0001-81 · Todos os direitos"
    assert dossie.achar_cnpjs(texto) == ["11222333000181"]
    assert dossie.achar_cnpjs("telefone 14 3456 7890 e CEP 18600000") == []


def test_resume_cnpj_da_receita():
    r = dossie.resumir_cnpj({
        "cnpj": "11222333000181", "razao_social": "CLINICA VETPLUS LTDA", "nome_fantasia": "VETPLUS",
        "descricao_situacao_cadastral": "ATIVA", "data_inicio_atividade": "2015-03-10", "porte": "MICRO EMPRESA",
        "cnae_fiscal_descricao": "ATIVIDADES VETERINARIAS", "municipio": "BOTUCATU", "uf": "SP",
        "qsa": [{"nome_socio": "MARIA DA SILVA", "qualificacao_socio": "Sócio-Administrador"}],
    })
    assert r["razao_social"] == "Clinica Vetplus Ltda"
    assert r["situacao"] == "Ativa"
    assert r["aberta_em"] == "10/03/2015"
    assert r["socios"] == [{"nome": "Maria Da Silva", "qualificacao": "Sócio-administrador"}]
    assert r["fonte"].startswith("Receita Federal")


def test_anos_de_atividade_considera_o_aniversario():
    assert dossie._anos_desde("2015-03-10", date(2025, 3, 9)) == 9
    assert dossie._anos_desde("2015-03-10", date(2025, 3, 10)) == 10
    assert dossie._anos_desde("lixo") is None


def test_pessoas_com_cargo_vem_primeiro_e_ruido_some():
    texto = ("Quem somos. Fundadora: Marina Costa. Atendimento com Dr. Paulo Almeida e equipe. "
             "Nossa clínica é referência. Fale conosco.")
    p = dossie.achar_pessoas(texto)
    assert p[0]["nome"] == "Marina Costa" and p[0]["cargo"] == "fundadora"
    assert any(x["nome"].startswith("Dr. Paulo") for x in p)
    assert all(x["fonte"] == "citado no site do negócio" for x in p)
    assert not any(x["nome"].startswith(("Fale", "Nossa", "Quem")) for x in p)


def test_cargo_depois_do_nome():
    p = dossie.achar_pessoas("Equipe: Carlos Eduardo Souza, proprietário")
    assert p and p[0]["nome"].startswith("Carlos Eduardo") and p[0]["cargo"] == "proprietário"


RAIO = {
    "gmn": {"nota": 4.8, "avaliacoes": 213, "itens": [
        {"item": "Site próprio", "ok": False, "detalhe": "sem site no perfil"},
        {"item": "Descrição do negócio", "ok": False, "detalhe": "o perfil não tem descrição"},
        {"item": "Fotos", "ok": None, "detalhe": "não dá para verificar"}]},
    "site": {"tipo": "none", "problemas": []},
    "instagram": {"disponivel": True, "dias_desde_ultimo_post": 120, "posts_90_dias": 0},
    "quem_cuida": {"veredito": "abandonado", "rotulo": "Abandonado", "evidencias": ["o último post foi há 120 dias"]},
}
LEAD = {"id": "abc123", "company": "Clínica VetPlus", "niche": "Veterinário", "city": "Botucatu", "whatsapp": True, "phone": "5514999990000"}


def test_dores_tem_evidencia_e_nao_inventam():
    dores = dossie.montar_dores(RAIO, LEAD)
    titulos = [d["titulo"] for d in dores]
    assert "Quem pesquisa não tem para onde ir" in titulos
    assert any("213 avaliações" in d["evidencia"] for d in dores)
    assert not any("Fotos" in t for t in titulos)  # desconhecido não é falta
    assert all(d["evidencia"] and d["peso"] in ("alto", "medio", "baixo") for d in dores)
    assert dores[0]["peso"] == "alto"
    assert len(dores) <= 6


def test_estilo_e_estavel_por_lead_e_varia_entre_leads():
    assert dossie.estilo_do_lead("a") == dossie.estilo_do_lead("a")
    usados = {dossie.estilo_do_lead(f"lead{i}")[0] for i in range(60)}
    assert len(usados) >= 4


def test_verificador_exige_algo_especifico_do_negocio():
    fatos = ["Nota 4,8 com 213 avaliações"]
    generica = "Olá! Tudo bem? Vi que vocês são uma referência na região e queria conversar sobre como podemos ajudar vocês a crescer mais."
    boa = "Olá! A Clínica VetPlus tem 213 avaliações no Google e nenhum site para onde mandar quem procura. Posso te mostrar uma ideia simples?"
    assert not dossie.verificar_abertura(generica, "Clínica VetPlus", fatos, None)
    assert dossie.verificar_abertura(boa, "Clínica VetPlus", fatos, None)
    assert not dossie.verificar_abertura("Oi VetPlus", "Clínica VetPlus", fatos, None)  # curta demais


def test_abertura_de_reserva_cita_fato_e_usa_o_nome_so_se_conhecido():
    dores = dossie.montar_dores(RAIO, LEAD)
    pessoa = {"nome": "Dra. Marina Costa", "cargo": "fundadora", "fonte": "citado no site do negócio"}
    com = dossie.abertura_pelos_fatos("Clínica VetPlus", dores, pessoa, "pergunta", "um site")
    sem = dossie.abertura_pelos_fatos("Clínica VetPlus", dores, None, "pergunta", "um site")
    assert "Marina" in com and "Dra" not in com.split("!")[0]
    assert sem.startswith("Olá!") and "Marina" not in sem
    assert dossie.verificar_abertura(sem, "Clínica VetPlus", [d["evidencia"] for d in dores], None)


def test_sem_chave_da_ia_devolve_abordagem_por_fatos(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    dores = dossie.montar_dores(RAIO, LEAD)
    r = dossie.gerar_abordagem(LEAD, RAIO, dores, {}, [], {})
    assert r["origem"] == "fatos"
    assert r["abertura"] and r["canal"] == "whatsapp"
    assert {"angulo", "por_que_funciona", "objecao_provavel", "resposta_a_objecao", "proximo_passo", "evitar"} <= set(r)


def test_ia_generica_cai_na_reserva(monkeypatch):
    import app.ai_client as ac
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "x")
    monkeypatch.setattr(ac, "build_client", lambda *a, **k: object())
    monkeypatch.setattr(ac, "gerar_json", lambda *a, **k: {
        "angulo": "tese", "abertura": "Olá! Tudo bem? Vi que vocês são uma referência na região e queria conversar sobre como ajudar vocês a crescer mais."})
    dores = dossie.montar_dores(RAIO, LEAD)
    r = dossie.gerar_abordagem(LEAD, RAIO, dores, {}, [], {})
    assert r["origem"] == "fatos" and "referência na região" not in r["abertura"]


def test_ia_especifica_e_aceita(monkeypatch):
    import app.ai_client as ac
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "x")
    monkeypatch.setattr(ac, "build_client", lambda *a, **k: object())
    boa = "Olá! A Clínica VetPlus tem 213 avaliações no Google e nenhum site para onde mandar quem procura. Posso te mostrar uma ideia simples?"
    monkeypatch.setattr(ac, "gerar_json", lambda *a, **k: {"angulo": "tese", "abertura": boa})
    dores = dossie.montar_dores(RAIO, LEAD)
    r = dossie.gerar_abordagem(LEAD, RAIO, dores, {}, [], {})
    assert r["origem"] == "ia" and r["abertura"] == boa
