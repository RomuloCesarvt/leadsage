from app import thread_whatsapp as tw


def _g(de, texto, em, meta_id=""):
    return {"de": de, "texto": texto, "em": em, "meta_id": meta_id}


def _w(i, texto, minha, quando):
    return {"id": f"w{i}", "texto": texto, "minha": minha, "quando": quando}


def test_junta_sem_repetir_e_traz_o_que_o_robo_perdeu():
    guardadas = [_g("contato", "Boa tarde", "2026-11-03T16:36:10+00:00", "w2"), _g("robo", "Como posso ajudar?", "2026-11-03T16:37:00+00:00", "s_1")]
    base = 1_793_723_000
    wa = [_w(0, "Posso te mostrar uma prévia do site?", True, base - 120), _w(2, "Boa tarde", False, base), _w(3, "Pode", False, base + 5),
          _w(4, "Como posso ajudar?", True, base + 50), _w(5, "Oi, aqui é o Rômulo!", True, base + 120)]
    r = tw.juntar([_g("contato", "Boa tarde", tw._iso(base), "w2"), _g("robo", "Como posso ajudar?", tw._iso(base + 52), "s_1")], wa)
    assert [(m["de"], m["texto"]) for m in r] == [
        ("voce", "Posso te mostrar uma prévia do site?"), ("contato", "Boa tarde"), ("contato", "Pode"),
        ("robo", "Como posso ajudar?"), ("voce", "Oi, aqui é o Rômulo!")]
    assert guardadas  # (a lista original não é alterada)
    assert len(guardadas) == 2


def test_voce_duplicado_vira_um_so_e_robo_vence_voce():
    base = 1_793_723_000
    guardadas = [_g("voce", "Já te respondo!", tw._iso(base), "s_9"), _g("voce", "Já te respondo!", tw._iso(base + 4), "w7")]
    r = tw.juntar(guardadas, [_w(7, "Já te respondo!", True, base + 3)])
    assert [m["texto"] for m in r] == ["Já te respondo!"]
    r2 = tw.juntar([_g("robo", "Oi!", tw._iso(base)), _g("voce", "Oi!", tw._iso(base + 2))], [])
    assert len(r2) == 1 and r2[0]["de"] == "robo"


def test_mesmo_texto_em_horas_diferentes_nao_se_funde():
    base = 1_793_723_000
    r = tw.juntar([], [_w(1, "Ok", False, base), _w(2, "Ok", False, base + 3600)])
    assert len(r) == 2                                   # duas respostas "Ok" de verdade, uma hora depois
    assert len(tw.juntar([_g("contato", "Ok", tw._iso(base), "x")], [_w(1, "Ok", False, base)])) == 1


def test_sem_whatsapp_a_conversa_fica_como_estava():
    g = [_g("contato", "oi", "2026-11-03T16:36:10+00:00"), _g("robo", "olá", "2026-11-03T16:37:00+00:00")]
    assert [m["texto"] for m in tw.juntar(g, [])] == ["oi", "olá"]
    assert tw.juntar([], []) == []


# ---------------------------------------------------------------- a rota abre a conversa inteira
import time

from test_robo_em_toda_conversa import _rodar, com_robo  # noqa: E402,F401
from test_robo_em_toda_conversa import _no_loop_do_app  # noqa: E402,F401


def test_rota_abre_a_conversa_com_o_chat_do_whatsapp(client, com_robo):
    from app import espelho_whatsapp, robo_store
    numero = "5514998000222"
    agora = int(time.time())
    cid = robo_store.id_da_conversa("whatsapp", numero)
    _rodar(robo_store.salvar_conversa("alice", {
        "id": cid, "canal": "whatsapp", "contato": numero, "nome": "João", "lead_id": "", "robo_ativo": False, "optout": False,
        "precisa_humano": False, "motivo": "", "criado": robo_store.agora(),
        "mensagens": [{"de": "contato", "texto": "Boa tarde", "em": tw._iso(agora - 100), "meta_id": "w2"},
                      {"de": "robo", "texto": "Como posso ajudar?", "em": tw._iso(agora - 50), "meta_id": "s_1"}]}))
    _rodar(espelho_whatsapp.salvar_mensagens("alice", f"{numero}@c.us", [
        {"id": "w0", "texto": "Posso te mostrar uma prévia do site?", "minha": True, "quando": agora - 300},
        {"id": "w2", "texto": "Boa tarde", "minha": False, "quando": agora - 100},
        {"id": "w3", "texto": "Pode", "minha": False, "quando": agora - 90},
        {"id": "w4", "texto": "Como posso ajudar?", "minha": True, "quando": agora - 49},
        {"id": "w5", "texto": "Oi, aqui é o Rômulo", "minha": True, "quando": agora - 10}]))
    r = client.get(f"/api/robo/conversas/{cid}")
    assert r.status_code == 200
    falas = [(m["de"], m["texto"]) for m in r.json()["mensagens"]]
    assert falas == [("voce", "Posso te mostrar uma prévia do site?"), ("contato", "Boa tarde"), ("contato", "Pode"),
                     ("robo", "Como posso ajudar?"), ("voce", "Oi, aqui é o Rômulo")]
