"""O aquecimento do numero nao zera ao reconectar, e o robo propoe a reuniao para o proximo dia util."""
from datetime import datetime, timedelta, timezone

from app import ai_sdr, fila_envio
from app import conector_whatsapp as cw
from test_robo import com_robo, rodar  # noqa: F401


def utc(ano, mes, dia, h=12):
    return datetime(ano, mes, dia, h, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------- aquecimento
def test_trocar_a_chave_nao_zera_o_limite_do_dia(rodar):
    agora = utc(2026, 10, 19)
    canal = {"cw_hash": "h", "cw_numero": "5514999019705", "cw_primeiro": (agora - timedelta(days=2)).isoformat()}
    assert cw.limite_frio_do_dia(canal, agora) == 20
    rodar(cw.criar_chave, canal)                                     # reconectar: a chave nova apaga cw_primeiro
    assert "cw_primeiro" not in canal
    canal["cw_numero"] = "5514999019705"                             # o ping informa o mesmo numero
    canal["cw_primeiro"] = agora.isoformat()                         # e a conexao "nasce" agora
    rodar(cw.restaurar_aquecimento, canal)
    assert cw.limite_frio_do_dia(canal, agora) == 20                 # continua em 20, nao volta a 10


def test_desligar_e_conectar_de_novo_tambem_preserva(rodar):
    agora = utc(2026, 10, 19)
    canal = {"cw_hash": "h", "cw_numero": "5514999019705", "cw_primeiro": (agora - timedelta(days=5)).isoformat()}
    rodar(cw.revogar, canal)
    canal.update(cw_numero="5514999019705", cw_primeiro=agora.isoformat())
    rodar(cw.restaurar_aquecimento, canal)
    assert cw.limite_frio_do_dia(canal, agora) == 35


def test_numero_diferente_nao_herda_o_aquecimento(rodar):
    agora = utc(2026, 10, 19)
    canal = {"cw_hash": "h", "cw_numero": "5514999019705", "cw_primeiro": (agora - timedelta(days=5)).isoformat()}
    rodar(cw.revogar, canal)
    canal.update(cw_numero="5511988887777", cw_primeiro=agora.isoformat(), cw_aquec_ok=True)
    rodar(cw.restaurar_aquecimento, canal)
    assert cw.limite_frio_do_dia(canal, agora) == cw.FRIO_INICIAL


def test_quem_ja_perdeu_o_aquecimento_recupera_pelos_envios_antigos(client, com_robo, rodar):
    """O Max: ja enviava ha dias, a reconexao zerou. Os envios da fila provam a data."""
    client.post("/api/robo/conector/gerar")
    agora = datetime.now(timezone.utc)
    antigo = (agora - timedelta(days=4)).isoformat()
    rodar(fila_envio._gravar, "alice", {"id": "f1", "lead_id": "L1", "canal": "whatsapp", "status": "enviado", "enviado_em": antigo,
                                        "contato": {"phone": "14998003784"}, "texto": "oi", "criado": antigo})
    canal = {"uid": "alice", "cw_hash": "h", "cw_numero": "5514999019705", "cw_primeiro": agora.isoformat()}
    rodar(cw.restaurar_aquecimento, canal)
    assert cw.limite_frio_do_dia(canal, agora) == cw.FRIO_INICIAL + 4 * cw.FRIO_POR_DIA
    assert canal["cw_aquec_ok"] is True


# ---------------------------------------------------------------- reuniao no proximo dia util
def test_prazo_e_amanha_em_dia_de_semana():
    texto = ai_sdr.prazo_da_reuniao(utc(2026, 10, 19, 13))           # segunda 10h em Brasilia
    assert "amanhã, terça (20/10)" in texto and "antes das 16h de hoje" in texto


def test_sexta_a_noite_e_fim_de_semana_pulam_para_segunda():
    assert "segunda (26/10)" in ai_sdr.prazo_da_reuniao(utc(2026, 10, 23, 22))
    assert "amanhã" not in ai_sdr.prazo_da_reuniao(utc(2026, 10, 24, 15))


def test_prompt_manda_propor_o_proximo_dia_util_e_nao_dias_depois():
    p = ai_sdr.montar_prompt([{"de": "contato", "texto": "pode ser"}], "whatsapp", {}, {"ativo": True}, {"name": "Clínica"},
                             agora=utc(2026, 10, 19, 13))
    assert "PRÓXIMO DIA ÚTIL" in p and "amanhã, terça (20/10)" in p and "semana que vem" in p
    assert "dois ou três dias úteis" not in p
