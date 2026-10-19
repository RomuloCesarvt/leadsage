"""O banco de imagens entende o ramo: foto de assunto errado (kiwi com óleo para psicologia) nunca entra."""
import asyncio

from app import banco_imagens
from app.curadoria_imagens import escolher, pontuar


def _foto(titulo, tags, largura=5000, n=0):
    return {"url": f"https://x.test/{titulo.replace(' ', '-')}-{n}.jpg", "titulo": titulo, "tags": tags, "largura": largura, "fonte": "StockSnap"}


KIWI = _foto("Aromatherapy Spa", ["aromatherapy", "cosmeticoil", "essentialoil", "glassbottle", "kiwi", "fruit"])
COSMETICO = _foto("Wellness Cosmetics", ["beauty", "cosmetic", "complexion", "health", "lifestyle"])
SALA = _foto("Cozy Room", ["cozy", "calm", "interior", "plant", "home"])
PLANTA = _foto("House Plant", ["plant", "indoor", "interior", "decor", "home"])
DIARIO = _foto("Journal Desk", ["journal", "diary", "notebook", "tea"])
CHA = _foto("Tea Cup", ["tea", "cup", "cozy", "book"])
SAPATO = _foto("Converse Shoes", ["shoes", "sneakers", "fashion"])


def test_psicologia_usa_termos_de_ambiente_calmo_e_nao_de_spa():
    termos = banco_imagens.termos_para("Psicólogos")
    assert "cozy room" in termos and "wellness" not in termos
    assert banco_imagens.perfil_para("Psicologia clínica")["exigir"] is True
    assert "kiwi" in banco_imagens.perfil_para("Psicologia")["ruins"]


def test_kiwi_com_oleo_e_cosmetico_nunca_entram_para_psicologia():
    perfil = banco_imagens.perfil_para("Psicologia")
    fotos = [KIWI, COSMETICO, SAPATO, SALA, PLANTA, DIARIO, CHA]
    escolhidas = escolher(fotos, perfil["bons"], perfil["ruins"], 8, perfil["exigir"])
    titulos = {f["titulo"] for f in escolhidas}
    assert titulos == {"Cozy Room", "House Plant", "Journal Desk", "Tea Cup"}


def test_foto_de_assunto_errado_pontua_negativo_e_a_do_ramo_vem_primeiro():
    perfil = banco_imagens.perfil_para("Psicologia")
    assert pontuar(KIWI, perfil["bons"], perfil["ruins"]) < 0
    assert pontuar(SALA, perfil["bons"], perfil["ruins"]) > pontuar(_foto("Qualquer", ["car"]), perfil["bons"], perfil["ruins"])


def test_mesma_foto_nao_repete_mais_de_duas_vezes():
    repetidas = [_foto("Wellness", ["cozy", "calm"], n=i) for i in range(6)] + [SALA, PLANTA]
    perfil = banco_imagens.perfil_para("Psicologia")
    saida = escolher(repetidas, perfil["bons"], perfil["ruins"], 8, False)
    assert sum(1 for f in saida if f["titulo"] == "Wellness") == 2


def test_ramo_sem_curadoria_continua_como_antes_so_sem_lixo_geral():
    p = banco_imagens.perfil_para("Pizzarias")
    assert p["termos"][0] == "pizza" and p["bons"] == set() and "shoes" in p["ruins"]
    assert banco_imagens.termos_para("Dentistas")[0] == "dentist" and banco_imagens.perfil_para("Dentistas")["exigir"] is True
    # clínica odontológica continua sendo dentista, não clínica médica
    assert banco_imagens.termos_para("Clínicas Odontológicas")[0] == "dentist"


def test_buscar_usa_o_filtro_de_ponta_a_ponta(monkeypatch):
    async def falso(termo, quantidade):
        return [KIWI, COSMETICO, SALA, PLANTA, DIARIO, CHA]

    monkeypatch.setattr(banco_imagens, "_openverse", falso)
    monkeypatch.setattr(banco_imagens.settings, "PEXELS_API_KEY", "")
    banco_imagens._cache.clear()
    r = asyncio.new_event_loop().run_until_complete(banco_imagens.buscar(nicho="Psicólogos", quantidade=6))
    titulos = {f["titulo"] for f in r["imagens"]}
    assert "Aromatherapy Spa" not in titulos and "Wellness Cosmetics" not in titulos
    assert {"Cozy Room", "House Plant"} <= titulos


def test_especialidade_medica_busca_consultorio_e_nunca_remedio_nem_bicho():
    """Uma clínica de gastroenterologia saiu com embalagens de remédio veterinário na capa."""
    from app.banco_imagens import perfil_para
    from app.curadoria_imagens import escolher

    for ramo in ("Gastroenterologistas", "Ginecologistas", "Neurologistas", "Clínicas", "Consultório médico"):
        p = perfil_para(ramo)
        assert "doctor" in " ".join(p["termos"]) and p["exigir"] is True, ramo
    p = perfil_para("Gastroenterologistas")
    fotos = [
        {"url": "https://x/1", "titulo": "veterinary medicine pills syringes", "tags": ["medicine", "pills", "veterinary"]},
        {"url": "https://x/2", "titulo": "doctor consulting patient in clinic", "tags": ["doctor", "patient", "clinic"]},
        {"url": "https://x/3", "titulo": "medication bottle on table", "tags": ["bottle", "medication"]},
        {"url": "https://x/4", "titulo": "stethoscope on desk", "tags": ["stethoscope", "doctor"]},
    ]
    escolhidas = [f["url"] for f in escolher(fotos, p["bons"], p["ruins"], 4, p["exigir"])]
    assert "https://x/1" not in escolhidas and "https://x/3" not in escolhidas
    assert escolhidas[0] == "https://x/2"
    assert perfil_para("Clínica veterinária")["termos"][0] == "dog"           # veterinaria continua sendo pet
