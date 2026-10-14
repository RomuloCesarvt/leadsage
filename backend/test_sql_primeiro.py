"""Com um Postgres no ar, o SQL e a fonte principal do robo e da nuvem: o Firestore so entrega dados antigos (uma vez)."""
import asyncio

import pytest

from app import bancos, conector_whatsapp, espelho_whatsapp, fila_envio, nuvem_auth, robo_store


class _Doc:
    def __init__(self, fs, caminho):
        self.fs, self.caminho = fs, caminho
        self.reference = self

    @property
    def exists(self):
        return self.caminho in self.fs.dados

    def to_dict(self):
        return dict(self.fs.dados.get(self.caminho, {}))

    def get(self):
        self.fs.leituras += 1
        if self.fs.quebrado:
            raise RuntimeError("429 Quota exceeded")
        return self

    def set(self, dados, merge=False):
        self.fs.escritas += 1
        if self.fs.quebrado_escrita:
            raise RuntimeError("429 Quota exceeded (escrita)")
        base = dict(self.fs.dados.get(self.caminho, {})) if merge else {}
        base.update(dados)
        self.fs.dados[self.caminho] = base

    def update(self, dados):
        self.set(dados, merge=True)

    def delete(self):
        self.fs.dados.pop(self.caminho, None)

    def collection(self, nome):
        return _Col(self.fs, f"{self.caminho}/{nome}")


class _Col:
    def __init__(self, fs, caminho):
        self.fs, self.caminho = fs, caminho

    def document(self, nome):
        return _Doc(self.fs, f"{self.caminho}/{nome}")

    def stream(self):
        self.fs.leituras += 1
        if self.fs.quebrado:
            raise RuntimeError("429 Quota exceeded")
        return [_Doc(self.fs, k) for k in sorted(self.fs.dados) if k.startswith(self.caminho + "/") and "/" not in k[len(self.caminho) + 1:]]

    def where(self, *a, **k):
        return self


class FirestoreFalso:
    def __init__(self, dados=None):
        self.dados = dados or {}
        self.leituras = 0
        self.escritas = 0
        self.quebrado = False
        self.quebrado_escrita = False

    def collection(self, nome):
        return _Col(self, nome)


@pytest.fixture
def sql_principal(client, monkeypatch):
    """Postgres 'no ar' (o teste usa SQLite por baixo) e um Firestore falso que conta cada leitura."""
    fs = FirestoreFalso()
    for modulo in (robo_store, espelho_whatsapp, nuvem_auth, conector_whatsapp, fila_envio):
        monkeypatch.setattr(modulo, "firestore_db", fs)
    monkeypatch.setattr(bancos.CONJUNTO, "tem_postgres", lambda: True)
    robo_store._FALHA[0] = 0.0
    robo_store._CANAIS.clear()
    yield fs
    robo_store._FALHA[0] = 0.0
    robo_store._CANAIS.clear()


def rodar(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def test_uso_normal_nunca_le_nem_grava_no_firestore(sql_principal):
    fs = sql_principal

    async def fluxo():
        canal = await robo_store.salvar_canal("u1", "u1@x.com", {"ativo": True})
        canal["nuvem_chave"] = "chave-1"
        canal = await robo_store.substituir_canal("u1", canal)
        await robo_store.registrar_ativo("conector", "hash1", "u1", canal["gancho"])
        await robo_store.registrar_nuvem("u1", canal["gancho"])
        await robo_store.marcar_nuvem_sair("u2")
        await espelho_whatsapp.salvar_estado("u1", "qr", qr="data:image/png;base64,AAAA")
        await nuvem_auth.gravar("u1", "segredo-cifrado")
        await robo_store.salvar_conversa("u1", {"id": "whatsapp_5511", "mensagens": [{"de": "contato", "texto": "oi"}], "atualizado": "2026-10-14T10:00:00"})
        saida = {
            "canal": await robo_store.canal_do_usuario("u1"),
            "por_gancho": await robo_store.canal_por_gancho(canal["gancho"]),
            "por_ativo": await robo_store.canal_por_ativo("conector", "hash1"),
            "nuvem": await robo_store.listar_nuvem(),
            "sair": await robo_store.listar_nuvem_sair(),
            "estado": await espelho_whatsapp.ler_estado("u1"),
            "sessao": await nuvem_auth.ler("u1"),
            "conversa": await robo_store.obter_conversa("u1", "whatsapp_5511"),
        }
        return canal, saida

    canal, saida = rodar(fluxo())
    assert saida["canal"]["nuvem_chave"] == "chave-1" and saida["por_gancho"]["nuvem_chave"] == "chave-1"
    assert saida["por_ativo"]["gancho"] == canal["gancho"]
    assert saida["nuvem"] == {"u1": canal["gancho"]} and saida["sair"] == ["u2"]
    assert saida["estado"]["fase"] == "qr" and saida["sessao"] == "segredo-cifrado"
    assert saida["conversa"]["mensagens"][0]["texto"] == "oi"
    # o ponto: depois da primeira copia, o Firestore nao e mais lido nem gravado
    leituras_antes = fs.leituras
    rodar(fluxo())
    assert fs.escritas == 0
    assert fs.leituras - leituras_antes <= 2  # no maximo a unica copia de lista ainda nao "quente" (nuvem/conversas)


def test_firestore_fora_do_ar_nao_derruba_a_nuvem_no_modo_sql(sql_principal):
    fs = sql_principal
    fs.quebrado = True
    fs.quebrado_escrita = True

    async def fluxo():
        canal = await robo_store.salvar_canal("u1", "u1@x.com", {"ativo": True})
        canal["nuvem_chave"] = "chave-1"
        await robo_store.substituir_canal("u1", canal)
        await robo_store.registrar_ativo("conector", "hash1", "u1", canal["gancho"])
        await robo_store.registrar_nuvem("u1", canal["gancho"])
        await nuvem_auth.gravar("u1", "creds")
        return (await robo_store.canal_por_ativo("conector", "hash1"), await robo_store.listar_nuvem(), await nuvem_auth.ler("u1"))

    por_ativo, nuvem, sessao = rodar(fluxo())
    assert por_ativo["nuvem_chave"] == "chave-1" and len(nuvem) == 1 and sessao == "creds"
    assert fs.escritas == 0


def test_dados_antigos_do_firestore_sao_copiados_uma_vez(sql_principal):
    fs = sql_principal
    gancho = "g" * 24
    fs.dados.update({
        f"robo_canais/{gancho}": {"gancho": gancho, "uid": "u9", "nuvem_chave": "velha", "atualizado": "2026-10-01T00:00:00"},
        "robo_ativos/conector_hashvelho": {"uid": "u9", "gancho": gancho, "tipo": "conector", "id": "hashvelho"},
        "sistema/nuvem": {"u9": gancho},
        "nuvem_auth/u9": {"blob": "creds-antigas"},
        "users/u9/robo_conversas/whatsapp_5514": {"id": "whatsapp_5514", "mensagens": [{"de": "contato", "texto": "antiga"}], "atualizado": "2026-10-02T00:00:00"},
    })

    async def fluxo():
        a = await robo_store.canal_por_ativo("conector", "hashvelho")
        b = await robo_store.listar_nuvem()
        c = await nuvem_auth.ler("u9")
        d = await robo_store.listar_conversas("u9")
        return a, b, c, d

    a, b, c, d = rodar(fluxo())
    assert a["nuvem_chave"] == "velha" and b == {"u9": gancho} and c == "creds-antigas" and d[0]["id"] == "whatsapp_5514"
    # depois da copia, nada disso volta ao Firestore
    leituras = fs.leituras
    a2, b2, c2, d2 = rodar(fluxo())
    assert (a2["nuvem_chave"], b2, c2, d2[0]["id"]) == ("velha", {"u9": gancho}, "creds-antigas", "whatsapp_5514")
    assert fs.leituras == leituras, "segunda rodada leu o Firestore de novo"


def test_sessao_do_whatsapp_nunca_vira_sem_sessao_quando_o_banco_nao_responde(sql_principal):
    fs = sql_principal
    fs.quebrado = True
    # nada no SQL e o Firestore fora: "nao sei" (None), nunca "" (que faria o servico pedir um QR novo e apagar a sessao)
    assert rodar(nuvem_auth.ler("u1")) is None


def test_fila_de_envio_antiga_e_copiada_e_depois_so_sql(sql_principal):
    fs = sql_principal
    fs.dados["users/u1/fila_envio/i1"] = {"id": "i1", "canal": "whatsapp", "status": "pendente", "criado": "2026-10-01"}
    itens = rodar(fila_envio.listar("u1"))
    assert [i["id"] for i in itens] == ["i1"]
    leituras = fs.leituras
    assert [i["id"] for i in rodar(fila_envio.listar("u1"))] == ["i1"]
    assert fs.leituras == leituras


def test_sem_postgres_tudo_continua_como_antes(client, monkeypatch):
    fs = FirestoreFalso()
    monkeypatch.setattr(robo_store, "firestore_db", fs)
    monkeypatch.setattr(bancos.CONJUNTO, "tem_postgres", lambda: False)
    robo_store._FALHA[0] = 0.0

    async def fluxo():
        await robo_store.registrar_nuvem("u1", "g" * 24)
        return await robo_store.listar_nuvem()

    assert rodar(fluxo()) == {"u1": "g" * 24}
    assert fs.escritas >= 1  # modo antigo: o Firestore recebe a gravacao
    robo_store._FALHA[0] = 0.0


def test_usuario_novo_com_firestore_fora_consegue_o_qr_e_quem_tem_sessao_antiga_nao_perde_a_dela(sql_principal):
    fs = sql_principal
    fs.quebrado = True
    assert rodar(nuvem_auth.ler("novo")) is None                    # sem marca: nao se sabe (pode haver sessao antiga)
    rodar(nuvem_auth.marcar_novo("novo"))
    assert rodar(nuvem_auth.ler("novo")) == ""                      # pediu conexao nova: o QR sai na hora
    rodar(nuvem_auth.gravar("novo", "creds-novas"))
    assert rodar(nuvem_auth.ler("novo")) == "creds-novas"           # conectou: a sessao nova vale


def test_desligar_de_proposito_nao_volta_com_a_copia_antiga_do_firestore(sql_principal):
    fs = sql_principal
    gancho = "g" * 24
    fs.dados.update({"sistema/nuvem": {"u9": gancho}, "nuvem_auth/u9": {"blob": "creds-antigas"}})
    rodar(robo_store.esquecer_nuvem("u9"))
    rodar(nuvem_auth.apagar("u9"))
    assert rodar(robo_store.listar_nuvem()) == {}                   # a primeira copia do Firestore nao traz de volta
    assert rodar(nuvem_auth.ler("u9")) == ""                        # e a sessao apagada nao reaparece
    # voltar a ligar depois funciona
    rodar(robo_store.registrar_nuvem("u9", gancho))
    assert rodar(robo_store.listar_nuvem()) == {"u9": gancho}


def test_desligar_e_conectar_de_novo_com_firestore_fora_do_ar_chega_ao_qr(sql_principal, client, monkeypatch):
    """O que a pessoa faz na tela quando a nuvem travou: Desligar, Conectar pela nuvem. Sem depender do Firestore."""
    from app import main
    from app.config import settings

    fs = sql_principal
    fs.quebrado = True
    fs.quebrado_escrita = True
    segredo = "segredo-da-nuvem-1234567890"
    monkeypatch.setattr(settings, "WORKER_SECRET", segredo)

    async def libera(*a, **k):
        return None

    monkeypatch.setattr(main, "exigir_recurso", libera)
    main._SESSOES_NUVEM.clear()
    main._CACHE_CONECTOR.clear()
    assert client.post("/api/robo/nuvem/desligar").status_code == 200
    assert client.post("/api/robo/nuvem/ligar").status_code == 200
    lista = client.get("/api/worker/sessoes", headers={"x-worker-secret": segredo}).json()
    assert [s["uid"] for s in lista["sessoes"]] == ["alice"] and lista["desligar"] == []
    # o servico pede a sessao guardada: "nao ha" (o QR sai), nunca "banco indisponivel"
    r = client.get("/api/worker/auth/alice", headers={"x-worker-secret": segredo})
    assert r.status_code == 200 and r.json()["blob"] == ""
    chave = lista["sessoes"][0]["chave"]
    ping = client.post("/api/conector/ping", headers={"x-conector-key": chave}, json={"fase": "qr", "qr": "data:image/png;base64,AAAA", "status": "qr"})
    assert ping.status_code == 200
    estado = client.get("/api/robo/whats/estado").json()
    assert estado["fase"] == "qr" and estado["qr"].startswith("data:image/png")
