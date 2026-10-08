"""A caixa de entrada junta as conversas do robo e as abordagens enviadas sem resposta."""
import pytest

from app import caixa_de_entrada as cx
from app import fila_envio, meta_canais, robo_service
from test_robo import com_robo, ia, rodar  # noqa: F401


def item(id, canal="whatsapp", status="enviado", nome="Padaria A", **contato):
    base = {"email": "", "phone": "", "instagram": "", "linkedin": ""}
    base.update(contato)
    return {"id": id, "lead_id": id, "nome": nome, "canal": canal, "assunto": "Sobre a padaria" if canal == "email" else "",
            "texto": "Boa tarde! Montei uma prévia.", "contato": base, "status": status,
            "criado": "2026-10-07T10:00:00", "enviado_em": "2026-10-07T10:05:00"}


def test_so_o_enviado_entra_e_canal_ganha_nome_de_tela():
    lista = cx.juntar([], [
        item("a", "whatsapp", phone="14998003784"),
        item("b", "instagram_direct", instagram="padaria_a"),
        item("c", "email", email="a@padaria.com"),
        item("d", "linkedin_msg", linkedin="https://linkedin.com/in/x"),
        item("e", "whatsapp", status="pendente", phone="14998003785"),   # ainda nao saiu
        item("f", "email", status="falhou", email="x@y.com"),
    ])
    assert sorted(c["canal"] for c in lista) == ["email", "instagram", "linkedin", "whatsapp"]
    assert all(c["origem"] == "envio" and c["aguardando"] for c in lista)
    email = next(c for c in lista if c["canal"] == "email")
    assert email["contato"] == "a@padaria.com" and email["ultima"]["texto"].startswith("Assunto: Sobre a padaria")


def test_quando_o_lead_responde_a_conversa_do_robo_substitui_o_envio():
    conversas = [{"id": "whatsapp_5514998003784", "canal": "whatsapp", "contato": "5514998003784", "nome": "Ana", "atualizado": "2026-10-07T11:00:00"}]
    lista = cx.juntar(conversas, [item("a", "whatsapp", phone="(14) 99800-3784"), item("z", "whatsapp", phone="14911112222")])
    assert [c["id"] for c in lista] == ["whatsapp_5514998003784", "envio:z"]
    assert lista[0]["origem"] == "robo" and not lista[0]["aguardando"]


def test_ordena_pela_mais_recente():
    a, b = item("a", phone="14998003784"), item("b", phone="14998003785")
    b["enviado_em"] = "2026-10-07T12:00:00"
    assert [c["id"] for c in cx.juntar([], [a, b])] == ["envio:b", "envio:a"]


def test_rota_lista_e_abre_o_envio(client, com_robo, rodar):
    rodar(fila_envio._gravar, "alice", item("L1", phone="14998003784"))
    lista = client.get("/api/robo/conversas").json()
    assert [c["id"] for c in lista] == ["envio:L1"]
    conversa = client.get("/api/robo/conversas/envio:L1").json()
    assert conversa["somente_leitura"] and conversa["mensagens"][0]["de"] == "voce"
    assert client.get("/api/robo/conversas/envio:nao-existe").status_code == 404
    # nao da para "responder" quem ainda nao respondeu
    r = client.post("/api/robo/conversas/envio:L1/responder", json={"texto": "oi"})
    assert r.status_code == 409 and "ainda não respondeu" in r.json()["detail"]


def test_rota_mistura_conversa_do_robo_e_envio(client, com_robo, rodar):
    from app import robo_store
    cfg = {"uid": "alice", "email": "alice@example.com", "gancho": "g", "ativo": True, "objetivo": "agendar"}
    msg = meta_canais.Recebida(canal="whatsapp", contato="5514911112222", nome="Bia", texto="Oi", meta_id="m1", momento=1)

    class Envio:
        async def __call__(self, canal, contato, texto, cfg):
            return "x"

    rodar(robo_service.processar, cfg, msg, gerar=ia(), enviar=Envio())
    rodar(fila_envio._gravar, "alice", item("L9", "email", email="a@b.com"))
    lista = client.get("/api/robo/conversas").json()
    assert {c["canal"] for c in lista} == {"whatsapp", "email"}
    assert {c["origem"] for c in lista} == {"robo", "envio"}
