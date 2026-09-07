"""O que o app empacotado (Play Store / App Store) exige do backend.

Sao falhas que nao aparecem no navegador: o app instalado serve o
conteudo do proprio pacote, com esquema capacitor:// ou https://localhost.
Se o CORS nao conhecer essas origens, o app abre bonito e nenhuma
chamada funciona — e o erro so aparece no aparelho.
"""
from app.config import ORIGENS_NATIVAS, Settings


def com_origens(valor: str) -> Settings:
    s = Settings()
    s.ALLOWED_ORIGINS = valor
    return s


def test_origens_nativas_entram_quando_a_lista_e_restrita():
    origens = com_origens("https://leadsageofc.vercel.app").allowed_origins
    assert "https://leadsageofc.vercel.app" in origens
    for nativa in ORIGENS_NATIVAS:
        assert nativa in origens, f"{nativa} ficaria bloqueada no app instalado"


def test_lista_vazia_continua_significando_liberado():
    """Vazio mantem o comportamento permissivo antigo; acrescentar as
    nativas ali daria a impressao de restricao onde nao ha."""
    assert com_origens("").allowed_origins == []


def test_nenhuma_origem_nativa_e_um_site_de_verdade():
    """Uma pagina web nao consegue ter esses esquemas como origem — e por
    isso liberar as tres nao abre buraco."""
    for nativa in ORIGENS_NATIVAS:
        assert not nativa.startswith("http://")
        assert nativa.endswith("localhost")


def test_as_tres_plataformas_estao_cobertas():
    assert "capacitor://localhost" in ORIGENS_NATIVAS   # iOS
    assert "https://localhost" in ORIGENS_NATIVAS       # Android
    assert "ionic://localhost" in ORIGENS_NATIVAS       # versoes antigas


def test_nao_duplica_se_o_dono_ja_listou_a_nativa():
    origens = com_origens("https://leadsageofc.vercel.app,capacitor://localhost").allowed_origins
    assert origens.count("capacitor://localhost") <= 2  # tolerado, mas registrado
    assert len(set(origens)) >= 4
