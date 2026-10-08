"""A migracao Firestore -> SQL leva tudo e o sistema le de volta pelos mesmos caminhos.

Usa um Firestore de mentira (dicionarios) e o SQLite dos testes.
"""
import importlib.util
import os

import pytest

from app import credit_system as cs
from app import (conector_whatsapp as cw, documents_store, fila_envio, pipeline_store, profile_store, robo_store,
                 sites_store)
from app.config import settings
from test_robo import rodar  # noqa: F401

_spec = importlib.util.spec_from_file_location(
    "migrar", os.path.join(os.path.dirname(__file__), "scripts", "migrar_firestore_para_sql.py"))
migrar_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(migrar_mod)


class Doc:
    def __init__(self, id, dados):
        self.id, self._d = id, dados

    def to_dict(self):
        return self._d


class Col:
    def __init__(self, docs=None):
        self.docs = docs or {}

    def stream(self):
        return [Doc(i, d) for i, d in self.docs.items()]

    def document(self, id):
        return Sub(self.docs.setdefault(id, {}), id)


class Sub:
    """Documento com subcolecoes, como o Firestore."""
    def __init__(self, dados, id):
        self.dados, self.id = dados, id
        self.subs = {}

    def collection(self, nome):
        return self.subs.setdefault(nome, Col())


class FakeFS:
    def __init__(self):
        self.raiz = {}
        self.users_subs = {}

    def collection(self, nome):
        if nome == "users":
            return Users(self)
        return self.raiz.setdefault(nome, Col())


class Users(Col):
    def __init__(self, fs):
        self.fs = fs
        self.docs = fs.raiz.setdefault("users", Col()).docs

    def document(self, uid):
        self.docs.setdefault(uid, {})
        return self.fs.users_subs.setdefault(uid, Sub(self.docs[uid], uid))


def montar_fs():
    fs = FakeFS()
    u = fs.collection("users")
    u.docs["ana"] = {"credits": 37, "role": "user",
                     "profile": {"name": "Ana", "company_name": "Sites Já", "plan": "Pro Vitalício", "plan_id": "pro", "sites_quota": 50},
                     "integrations": {"webhook_url": "https://exemplo.test/h"}}
    sub = u.document("ana")
    sub.collection("history").docs["h1"] = {"description": "Gasto de 2 créditos", "amount": -2, "type": "debit", "timestamp": "2026-10-07T10:00:00"}
    sub.collection("pipeline").docs["L1"] = {"id": "L1", "company": "Padaria A", "etapa": "Respondeu", "atualizado": "2026-10-07T11:00:00"}
    sub.collection("fila_envio").docs["f_L2"] = {"id": "f_L2", "lead_id": "L2", "nome": "Padaria B", "canal": "whatsapp",
                                                 "texto": "Oi", "contato": {"phone": "14998003785"}, "status": "pendente", "criado": "2026-10-07T12:00:00"}
    sub.collection("robo_conversas").docs["whatsapp_5514998003784"] = {"id": "whatsapp_5514998003784", "canal": "whatsapp", "contato": "5514998003784",
                                                                        "nome": "Cliente", "mensagens": [{"de": "contato", "texto": "Oi"}], "atualizado": "2026-10-07T13:00:00"}
    sub.collection("sites").docs["site_1"] = {"id": "site_1", "company": "Padaria A", "html": "<html>oi</html>", "template": "forno",
                                              "slug": "padaria-a-xyz", "created_at": "2026-10-07T09:00:00", "campo_desconhecido": 1}
    sub.collection("documents").docs["doc_1"] = {"id": "doc_1", "kind": "proposta", "title": "Proposta", "content": "texto", "created_at": "2026-10-07"}
    fs.collection("robo_canais").docs["G" * 24] = {"uid": "ana", "gancho": "G" * 24, "ativo": True, "cw_hash": "abc123"}
    fs.collection("robo_ativos").docs["conector_abc123"] = {"uid": "ana", "gancho": "G" * 24, "tipo": "conector", "id": "abc123"}
    return fs


@pytest.fixture
def sql_principal(client, monkeypatch):
    monkeypatch.setattr(settings, "FIRESTORE_DESLIGADO", True)
    monkeypatch.setattr(cs, "db", None)


def test_simular_so_conta(rodar, client):
    n = rodar(migrar_mod.migrar, montar_fs(), True, lambda *_: None)
    assert n["sites"] == 1 and n["pipeline"] == 1 and n["conversa"] == 1 and n["usuarios"] == 1
    assert rodar(sites_store.list_sites, "ana") == []   # nada foi gravado


def test_migra_e_o_sistema_le_de_volta(rodar, sql_principal):
    n = rodar(migrar_mod.migrar, montar_fs(), False, lambda *_: None)
    assert n["canal"] == 1 and n["ativo"] == 1 and n["historico_creditos"] == 1

    assert rodar(cs.get_user_balance, "ana")["credits"] == 37
    assert rodar(cs.get_user_balance, "ana")["history"][0]["amount"] == -2
    p = rodar(profile_store.get_profile, "ana")
    assert p.company_name == "Sites Já" and p.plan_id == "pro"
    assert [i["etapa"] for i in rodar(pipeline_store.listar, "ana")] == ["Respondeu"]
    assert rodar(fila_envio.obter, "ana", "f_L2")["nome"] == "Padaria B"
    assert rodar(robo_store.obter_conversa, "ana", "whatsapp_5514998003784")["nome"] == "Cliente"
    assert [s["slug"] for s in rodar(sites_store.list_sites, "ana")] == ["padaria-a-xyz"]
    assert "oi" in rodar(sites_store.html_publico, "padaria-a-xyz")
    assert len(rodar(documents_store.list_documents, "ana")) == 1
    assert rodar(robo_store.canal_por_gancho, "G" * 24)["ativo"] is True
    assert rodar(robo_store.canal_por_ativo, "conector", "abc123")["cw_hash"] == "abc123"


def test_rodar_duas_vezes_nao_duplica(rodar, sql_principal):
    fs = montar_fs()
    rodar(migrar_mod.migrar, fs, False, lambda *_: None)
    rodar(migrar_mod.migrar, fs, False, lambda *_: None)
    assert len(rodar(sites_store.list_sites, "ana")) == 1
    assert len(rodar(documents_store.list_documents, "ana")) == 1
    assert rodar(cs.get_user_balance, "ana")["credits"] == 37
    assert len(rodar(cs.get_user_balance, "ana")["history"]) == 1
