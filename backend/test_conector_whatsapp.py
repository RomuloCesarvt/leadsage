"""WhatsApp pelo computador do usuario (Conector + OpenWA).

Trava o que importa para o numero do cliente e para os dados dele:

- so quem tem a chave fala com as rotas do Conector; a chave nunca volta para a tela;
- trocar ou revogar a chave derruba o Conector antigo;
- abordagem fria tem limite por dia (aquecimento) e intervalo entre uma e outra;
- uma tarefa entregue nao e entregue de novo ate o prazo, para nao enviar em dobro;
- a resposta do robo no WhatsApp sai pelo Conector quando nao ha API oficial.

Nada aqui chama o WhatsApp nem a IA.
"""
import json
from datetime import datetime, timedelta, timezone

import pytest

from app import conector_whatsapp as cw
from app import fila_envio, meta_canais, pipeline_store, robo_service, robo_store
from test_robo import com_robo, ia, rodar  # noqa: F401


def cabecalho(chave):
    return {"x-conector-key": chave}


@pytest.fixture
def chave(client, com_robo):
    r = client.post("/api/robo/conector/gerar")
    assert r.status_code == 200, r.text
    return r.json()["chave"]


def test_gerar_chave_nao_expoe_o_hash(client, com_robo):
    r = client.post("/api/robo/conector/gerar").json()
    assert r["chave"].startswith("lsc_") and r["conector_criado"] and r["conector_prefixo"] == r["chave"][:8]
    assert "cw_hash" not in r
    assert not r["conector_online"]
    # reabrir a tela nunca devolve a chave
    visao = client.get("/api/robo/config").json()
    assert "chave" not in visao and visao["conector_criado"]


def test_plano_sem_robo_nao_gera_chave(client, com_plano):
    com_plano("start")
    assert client.post("/api/robo/conector/gerar").status_code == 402


def test_rotas_do_conector_exigem_a_chave(client, chave):
    assert client.get("/api/conector/tarefas").status_code == 401
    assert client.get("/api/conector/tarefas", headers=cabecalho("lsc_" + "x" * 40)).status_code == 401
    assert client.get("/api/conector/tarefas", headers=cabecalho("lixo")).status_code == 401
    assert client.get("/api/conector/tarefas", headers=cabecalho(chave)).status_code == 200


def test_nova_chave_derruba_a_antiga(client, chave):
    nova = client.post("/api/robo/conector/gerar").json()["chave"]
    assert nova != chave
    assert client.get("/api/conector/tarefas", headers=cabecalho(chave)).status_code == 401
    assert client.get("/api/conector/tarefas", headers=cabecalho(nova)).status_code == 200


def test_revogar_derruba_o_conector(client, chave):
    r = client.post("/api/robo/conector/revogar").json()
    assert not r["conector_criado"]
    assert client.get("/api/conector/tarefas", headers=cabecalho(chave)).status_code == 401


def test_ping_marca_online_e_guarda_o_numero(client, chave):
    r = client.post("/api/conector/ping", headers=cabecalho(chave),
                    json={"numero": "+55 (14) 99800-3784", "status": "ready", "versao": "1.0"})
    assert r.status_code == 200 and r.json()["limite_frio"] == cw.FRIO_INICIAL
    v = client.get("/api/robo/config").json()
    assert v["conector_online"] and v["conector_numero"] == "5514998003784" and v["conector_status"] == "ready"


def test_online_expira():
    agora = datetime.now(timezone.utc)
    assert cw.online({"cw_visto": agora.isoformat()})
    assert not cw.online({"cw_visto": (agora - timedelta(seconds=400)).isoformat()})
    assert not cw.online({})


def test_aquecimento_cresce_com_os_dias_e_tem_teto():
    agora = datetime.now(timezone.utc)
    assert cw.limite_frio_do_dia({}, agora) == cw.FRIO_INICIAL
    assert cw.limite_frio_do_dia({"cw_primeiro": agora.isoformat()}, agora) == cw.FRIO_INICIAL
    tres = {"cw_primeiro": (agora - timedelta(days=3)).isoformat()}
    assert cw.limite_frio_do_dia(tres, agora) == cw.FRIO_INICIAL + 3 * cw.FRIO_POR_DIA
    velho = {"cw_primeiro": (agora - timedelta(days=400)).isoformat()}
    assert cw.limite_frio_do_dia(velho, agora) == cw.FRIO_MAXIMO


def test_telefone_brasileiro_ganha_o_55():
    assert cw.telefone_whatsapp("(14) 99800-3784") == "5514998003784"
    assert cw.telefone_whatsapp("+55 14 99800-3784") == "5514998003784"
    assert cw.telefone_whatsapp("1433334444") == "551433334444"


def test_resposta_do_robo_sai_pelo_conector(client, chave, rodar):
    cfg = rodar(robo_store.canal_do_usuario, "alice")
    assert cfg["cw_hash"]
    cfg = {**cfg, "ativo": True, "objetivo": "agendar"}
    msg = meta_canais.Recebida(canal="whatsapp", contato="5514998003784", nome="Ana",
                               texto="Oi, vi sua mensagem", meta_id="ow1", momento=1)
    conversa = rodar(robo_service.processar, cfg, msg, gerar=ia("Que bom! Posso te ligar amanhã às 10h?"))
    assert [m["de"] for m in conversa["mensagens"]] == ["contato", "robo"]

    t = client.get("/api/conector/tarefas", headers=cabecalho(chave)).json()
    assert len(t["tarefas"]) == 1
    tarefa = t["tarefas"][0]
    assert tarefa["tipo"] == "resposta" and tarefa["contato"] == "5514998003784" and "10h" in tarefa["texto"]
    assert 1200 <= tarefa["digitando_ms"] <= 9000
    assert t["proxima_em"] == 4

    # entregue e sem resultado: nao volta antes do prazo (evita enviar em dobro)
    assert client.get("/api/conector/tarefas", headers=cabecalho(chave)).json()["tarefas"] == []
    r = client.post(f"/api/conector/tarefas/{tarefa['id']}/resultado", headers=cabecalho(chave), json={"ok": True})
    assert r.status_code == 200
    assert client.get("/api/conector/tarefas", headers=cabecalho(chave)).json()["tarefas"] == []


def test_tarefa_sem_resultado_volta_depois_do_prazo(client, chave, rodar):
    cfg = rodar(robo_store.canal_do_usuario, "alice")
    rodar(cw.enfileirar_resposta, cfg, "5514998003784", "Oi!")
    agora = datetime.now(timezone.utc)
    assert len(rodar(cw.tarefas, dict(cfg), agora)["tarefas"]) == 1
    assert rodar(cw.tarefas, dict(cfg), agora + timedelta(seconds=30))["tarefas"] == []
    assert len(rodar(cw.tarefas, dict(cfg), agora + timedelta(seconds=cw.REENTREGA_S + 5))["tarefas"]) == 1


def test_mensagem_recebida_vai_para_o_robo(client, chave, monkeypatch):
    recebidas = []

    async def captura(cfg, msg, **kw):
        recebidas.append(msg)
        return {"precisa_humano": False}

    monkeypatch.setattr(robo_service, "processar", captura)
    r = client.post("/api/conector/mensagem", headers=cabecalho(chave), json={
        "id": "3EB0A", "contato": "5514998003784", "nome": "Ana", "texto": "Quanto custa?", "momento": 1760000000})
    assert r.status_code == 200 and r.json()["ok"]
    m = recebidas[0]
    assert (m.canal, m.contato, m.texto, m.meta_id, m.nome) == ("whatsapp", "5514998003784", "Quanto custa?", "3EB0A", "Ana")
    # numero que nao e telefone nao entra; sem chave nao entra
    assert client.post("/api/conector/mensagem", headers=cabecalho(chave),
                       json={"id": "x", "contato": "123456789012345678", "texto": "oi"}).status_code == 422
    assert client.post("/api/conector/mensagem",
                       json={"id": "x", "contato": "5514998003784", "texto": "oi"}).status_code == 401


def fila_item(lead_id="L1", phone="14998003784", nome="Padaria A", status="pendente"):
    return {"id": f"f_{lead_id}", "lead_id": lead_id, "nome": nome, "canal": "whatsapp", "assunto": "",
            "texto": "Boa tarde! Eu sou o Rômulo. Posso te mostrar uma prévia?", "link": "", "gancho": "",
            "seguimentos": [], "contato": {"email": "", "phone": phone, "instagram": "", "linkedin": ""},
            "status": status, "criado": "2026-10-07T10:00:00"}


def test_abordagem_fria_com_aviso_de_sair_intervalo_e_funil(client, chave, rodar):
    rodar(pipeline_store.registrar, "alice", {"id": "L1", "company": "Padaria A", "phone": "14998003784"})
    rodar(fila_envio._gravar, "alice", fila_item("L1"))
    rodar(fila_envio._gravar, "alice", fila_item("L2", "14998003785", "Padaria B"))

    t = client.get("/api/conector/tarefas", headers=cabecalho(chave)).json()
    [tarefa] = t["tarefas"]
    assert tarefa["tipo"] == "abordagem" and tarefa["id"] == "fila:f_L1" and tarefa["contato"] == "5514998003784"
    assert "responder SAIR" in tarefa["texto"]

    # a segunda espera o intervalo
    t2 = client.get("/api/conector/tarefas", headers=cabecalho(chave)).json()
    assert t2["tarefas"] == [] and "intervalo" in t2["motivo_sem_frio"]

    # resultado ok: o lead anda no funil e o item vira enviado pelo conector
    r = client.post("/api/conector/tarefas/fila:f_L1/resultado", headers=cabecalho(chave), json={"ok": True})
    assert r.status_code == 200
    item = rodar(fila_envio.obter, "alice", "f_L1")
    assert item["status"] == "enviado" and item["enviado_por"] == "conector"
    assert rodar(pipeline_store.obter, "alice", "L1")["etapa"] == "Contato Enviado"


def test_limite_diario_de_abordagens_frias(client, chave, rodar):
    cfg = rodar(robo_store.canal_do_usuario, "alice")
    agora = datetime.now(timezone.utc)
    cfg.update({"cw_frio_dia": agora.strftime("%Y-%m-%d"), "cw_frio_n": cw.FRIO_INICIAL, "cw_primeiro": agora.isoformat()})
    rodar(fila_envio._gravar, "alice", fila_item("L1"))
    t = rodar(cw.tarefas, cfg)
    assert t["tarefas"] == [] and "limite de hoje" in t["motivo_sem_frio"]


def test_falha_do_envio_marca_o_item(client, chave, rodar):
    rodar(fila_envio._gravar, "alice", fila_item("L1"))
    client.get("/api/conector/tarefas", headers=cabecalho(chave))
    r = client.post("/api/conector/tarefas/fila:f_L1/resultado", headers=cabecalho(chave),
                    json={"ok": False, "erro": "numero fora do WhatsApp"})
    assert r.status_code == 200
    item = rodar(fila_envio.obter, "alice", "f_L1")
    assert item["status"] == "falhou" and "fora do WhatsApp" in item["motivo"]


def test_tarefa_inexistente_da_404(client, chave):
    r = client.post("/api/conector/tarefas/fila:f_naoexiste/resultado", headers=cabecalho(chave), json={"ok": True})
    assert r.status_code == 404


def test_responder_sem_guardar_nao_cria_conversa(client, chave, rodar, monkeypatch):
    def gerador(prompt):
        return {"mensagens": ["Claro! Posso te mostrar a prévia hoje?"], "etapa": "descoberta", "temperatura": "morno"}

    monkeypatch.setattr(robo_service, "_gerador_padrao", lambda: gerador)
    r = client.post("/api/conector/responder", headers=cabecalho(chave), json={
        "telefone": "(14) 99800-3784",
        "mensagens": [{"de": "voce", "texto": "Boa tarde! Montei uma prévia do site."}, {"de": "contato", "texto": "Opa, como assim?"}]})
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["mensagens"] and "prévia" in corpo["mensagens"][0]
    # nada foi guardado
    assert rodar(robo_store.listar_conversas, "alice") == []


def test_responder_exige_chave_e_ultima_do_contato(client, chave):
    corpo = {"mensagens": [{"de": "contato", "texto": "oi"}]}
    assert client.post("/api/conector/responder", json=corpo).status_code == 401
    r = client.post("/api/conector/responder", headers=cabecalho(chave),
                    json={"mensagens": [{"de": "voce", "texto": "Oi, tudo bem?"}]})
    assert r.status_code == 200 and r.json()["mensagens"] == []
    assert client.post("/api/conector/responder", headers=cabecalho(chave),
                       json={"mensagens": [{"de": "alguem", "texto": "oi"}]}).status_code == 422


def test_banco_indisponivel_nao_vira_chave_revogada(client, chave, monkeypatch):
    """Cota do Firestore estourada: o Conector precisa receber 503 (tenta de novo), nao 401 (desiste)."""
    from app import main as principal
    principal._CACHE_CONECTOR.clear()

    async def nada(_chave):
        return None

    monkeypatch.setattr(cw, "canal_da_chave", nada)
    monkeypatch.setattr(robo_store, "firestore_falhou_agora", lambda janela_s=15.0: True)
    r = client.get("/api/conector/tarefas", headers=cabecalho(chave))
    assert r.status_code == 503 and "banco de dados" in r.json()["detail"]
    monkeypatch.setattr(robo_store, "firestore_falhou_agora", lambda janela_s=15.0: False)
    assert client.get("/api/conector/tarefas", headers=cabecalho(chave)).status_code == 401
