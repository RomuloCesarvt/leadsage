"""Com o Postgres no ar o SQL é a única fonte: a coleção antiga é copiada do Firestore UMA vez e nunca mais lida nem gravada lá.
Rodar: cd backend && python -m pytest -q test_firestore_para_sql.py"""
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

import app.database as database
from app import pipeline_store, robo_store


class Doc:
    def __init__(self, dados, lixo): self._d, self._lixo = dados, lixo
    def to_dict(self): return self._d
    def delete(self): self._lixo.append(self._d["id"])


class Colecao:
    def __init__(self, fs): self.fs = fs
    def document(self, did=None): return self
    def collection(self, _): return self
    def stream(self):
        self.fs.leituras += 1
        if self.fs.falha: raise RuntimeError("429 quota exceeded")
        return [Doc(d, self.fs.apagados) for d in self.fs.docs]
    def set(self, *a, **k): self.fs.escritas += 1
    def delete(self): self.fs.apagados.append("x")
    def get(self): raise RuntimeError("não deveria ler")


class FsFalso:
    def __init__(self, docs): self.docs, self.leituras, self.escritas, self.apagados, self.falha = docs, 0, 0, [], False
    def collection(self, _): return Colecao(self)


def _ambiente(tmp_path, monkeypatch, docs):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'p.db'}")
    sessao = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    fs = FsFalso(docs)
    for mod in (robo_store, pipeline_store):
        monkeypatch.setattr(mod, "AsyncSessionLocal", sessao)
    monkeypatch.setattr(robo_store, "_sql_primeiro", lambda: True)
    monkeypatch.setattr(pipeline_store, "firestore_db", fs)
    import app.firebase_config as fc
    monkeypatch.setattr(fc, "db", fs)
    robo_store._IMPORTADOS.clear(); robo_store._IMPORTAR_DEPOIS.clear(); robo_store._FALHA[0] = 0.0
    pipeline_store._LISTA.clear()
    return engine, fs


def _item(i, quando="2026-01-01T00:00:00+00:00", etapa="Novo Lead"):
    return {"id": i, "etapa": etapa, "atualizado": quando, "lead": {"company": f"Empresa {i}"}}


def test_copia_uma_vez_e_depois_so_le_o_sql(tmp_path, monkeypatch):
    async def roda():
        engine, fs = _ambiente(tmp_path, monkeypatch, [_item("a"), _item("b")])
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        primeira = await pipeline_store.listar("u1")
        pipeline_store._LISTA.clear()
        segunda = await pipeline_store.listar("u1")
        await engine.dispose()
        return primeira, segunda, fs
    primeira, segunda, fs = asyncio.run(roda())
    assert {i["id"] for i in primeira} == {"a", "b"} and {i["id"] for i in segunda} == {"a", "b"}
    assert fs.leituras == 1                      # o Firestore foi lido uma única vez


def test_o_que_o_sql_tem_de_mais_novo_nao_e_sobrescrito(tmp_path, monkeypatch):
    async def roda():
        engine, fs = _ambiente(tmp_path, monkeypatch, [_item("a", "2026-01-01T00:00:00+00:00", "Novo Lead")])
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        # enquanto o Firestore estava sem cota, o lead já andou no SQL
        await robo_store._sql_put("pipeline:u1:a", "u1", "pipeline", _item("a", "2026-06-01T00:00:00+00:00", "Proposta"))
        itens = await pipeline_store.listar("u1")
        await engine.dispose()
        return itens
    itens = asyncio.run(roda())
    assert [i["etapa"] for i in itens] == ["Proposta"]


def test_firestore_sem_cota_nao_marca_como_copiado_e_tenta_depois(tmp_path, monkeypatch):
    async def roda():
        engine, fs = _ambiente(tmp_path, monkeypatch, [_item("a")])
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        fs.falha = True
        await robo_store._sql_put("pipeline:u1:z", "u1", "pipeline", _item("z"))
        sem_cota = await pipeline_store.listar("u1")                      # serve o que o SQL tem
        marcou = await robo_store.ja_importado("u1", "pipeline")
        pipeline_store._LISTA.clear()
        await pipeline_store.listar("u1")                                  # dentro do prazo: nem tenta de novo
        leituras_no_prazo = fs.leituras
        fs.falha = False
        robo_store._IMPORTAR_DEPOIS.clear(); robo_store._FALHA[0] = 0.0     # passou o prazo
        pipeline_store._LISTA.clear()
        depois = await pipeline_store.listar("u1")
        await engine.dispose()
        return sem_cota, marcou, leituras_no_prazo, depois
    sem_cota, marcou, leituras_no_prazo, depois = asyncio.run(roda())
    assert [i["id"] for i in sem_cota] == ["z"] and marcou is False
    assert leituras_no_prazo == 1
    assert {i["id"] for i in depois} == {"a", "z"}                          # a cópia aconteceu quando o Firestore voltou


def test_gravar_e_apagar_nao_tocam_no_firestore_depois_da_copia(tmp_path, monkeypatch):
    async def roda():
        engine, fs = _ambiente(tmp_path, monkeypatch, [_item("a")])
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        await pipeline_store.listar("u1")                                   # copia
        await pipeline_store._gravar("u1", _item("n"))
        await pipeline_store.apagar("u1", "a")
        restantes = await pipeline_store.listar("u1")
        await engine.dispose()
        return fs, restantes
    fs, restantes = asyncio.run(roda())
    assert fs.escritas == 0 and fs.apagados == []
    assert {i["id"] for i in restantes} == {"n"}


def test_apagar_antes_da_copia_apaga_tambem_no_firestore(tmp_path, monkeypatch):
    """Senão o lead apagado voltaria na primeira cópia."""
    async def roda():
        engine, fs = _ambiente(tmp_path, monkeypatch, [_item("a")])
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        await pipeline_store.apagar("u1", "a")
        await engine.dispose()
        return fs
    fs = asyncio.run(roda())
    assert fs.apagados == ["x"]


# ------------------------------------------------------------------ perfil
import time as _t

from app import profile_store


class DocPerfil:
    def __init__(self, perfil): self._p = perfil; self.exists = perfil is not None
    def to_dict(self): return {"profile": self._p} if self._p is not None else {}


class FsPerfil:
    def __init__(self, perfil): self.perfil, self.leituras, self.escritas, self.falha = perfil, 0, 0, False
    def collection(self, _): return self
    def document(self, _): return self
    def get(self):
        self.leituras += 1
        if self.falha: raise RuntimeError("429 quota exceeded")
        return DocPerfil(self.perfil)
    def set(self, *a, **k): self.escritas += 1


def _ambiente_perfil(tmp_path, monkeypatch, perfil):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'perfil.db'}")
    sessao = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    fs = FsPerfil(perfil)
    for mod in (robo_store, profile_store):
        monkeypatch.setattr(mod, "AsyncSessionLocal", sessao)
    monkeypatch.setattr(robo_store, "_sql_primeiro", lambda: True)
    monkeypatch.setattr(profile_store, "firestore_db", fs)
    import app.firebase_config as fc
    monkeypatch.setattr(fc, "db", fs)
    robo_store._IMPORTADOS.clear(); robo_store._IMPORTAR_DEPOIS.clear(); robo_store._FALHA[0] = 0.0
    profile_store._PERFIS.clear()
    return engine, fs


def test_perfil_antigo_do_firestore_vai_para_o_sql_uma_vez_e_o_plano_pago_nao_se_perde(tmp_path, monkeypatch):
    async def roda():
        engine, fs = _ambiente_perfil(tmp_path, monkeypatch, {"name": "Carlos", "plan_id": "pro", "sites_quota": 50, "company_name": "Frio Total"})
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        p1 = await profile_store.get_profile("u1")
        profile_store._PERFIS.clear()
        p2 = await profile_store.get_profile("u1")
        await engine.dispose()
        return p1, p2, fs
    p1, p2, fs = asyncio.run(roda())
    assert p1.plan_id == "pro" and p1.sites_quota == 50 and p1.name == "Carlos"       # quem já pagou continua com o plano
    assert p2.plan_id == "pro" and fs.leituras == 1                                    # e o Firestore foi lido uma vez só


def test_perfil_gravado_no_sql_enquanto_o_firestore_estava_sem_cota_vence_na_copia(tmp_path, monkeypatch):
    async def roda():
        engine, fs = _ambiente_perfil(tmp_path, monkeypatch, {"name": "Antigo", "company_name": "Frio Total"})
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        await profile_store._save_sqlite("u1", {"name": "Novo"})
        p = await profile_store.get_profile("u1")
        await engine.dispose()
        return p
    p = asyncio.run(roda())
    assert p.name == "Novo" and p.company_name == "Frio Total"                         # o mais novo vence; o resto vem do Firestore


def test_escritas_do_perfil_nao_tocam_no_firestore_com_o_postgres_no_ar(tmp_path, monkeypatch):
    async def roda():
        engine, fs = _ambiente_perfil(tmp_path, monkeypatch, None)
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        await profile_store.save_profile("u1", {"name": "Ana", "modo": "empresa"})
        await profile_store.conceder_plano("u1", "Pro", 50, "pro")
        await profile_store.liberar_modos("u1", ["agencia", "empresa"])
        p = await profile_store.get_profile("u1")
        await engine.dispose()
        return p, fs
    p, fs = asyncio.run(roda())
    assert fs.escritas == 0
    assert p.name == "Ana" and p.modo == "empresa" and p.plan_id == "pro" and p.modos == ["agencia", "empresa"]


def test_perfil_com_firestore_sem_cota_serve_o_sql_e_tenta_depois(tmp_path, monkeypatch):
    async def roda():
        engine, fs = _ambiente_perfil(tmp_path, monkeypatch, {"name": "Antigo", "plan_id": "pro"})
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        fs.falha = True
        p_sem = await profile_store.get_profile("u1")                  # Firestore recusa: perfil vazio por enquanto, nada marcado
        marcou = await robo_store.ja_importado("u1", "perfil")
        profile_store._PERFIS.clear()
        fs.falha = False
        robo_store._IMPORTAR_DEPOIS.clear(); robo_store._FALHA[0] = 0.0
        p_depois = await profile_store.get_profile("u1")
        await engine.dispose()
        return p_sem, marcou, p_depois
    p_sem, marcou, p_depois = asyncio.run(roda())
    assert marcou is False and p_depois.plan_id == "pro"


# --------------------------------------------------- documentos, integrações, sites e raio-x
from app import documents_store, integrations_store, raio_x, sites_store


class DocSimples:
    def __init__(self, d): self._d = d; self.exists = d is not None
    def to_dict(self): return self._d
    def delete(self): pass


class FsGeral:
    """Um Firestore falso: coleções por nome; conta leituras e escritas."""
    def __init__(self, colecoes=None, doc_usuario=None):
        self.colecoes, self.doc_usuario = colecoes or {}, doc_usuario
        self.leituras = self.escritas = 0
        self.falha = False
        self._nome = None; self._id = None
    def _novo(self, **k):
        n = FsGeral(self.colecoes, self.doc_usuario); n.__dict__.update({"_pai": self}); n._nome = k.get("nome", self._nome); n._id = k.get("id", self._id)
        return n
    def collection(self, nome): return self._novo(nome=nome)
    def document(self, did): return self._novo(id=did)
    def _contar(self, campo):
        raiz = self
        while hasattr(raiz, "_pai"): raiz = raiz._pai
        setattr(raiz, campo, getattr(raiz, campo) + 1); return raiz
    def stream(self):
        raiz = self._contar("leituras")
        if raiz.falha: raise RuntimeError("429 quota exceeded")
        return [DocSimples(d) for d in (raiz.colecoes.get(self._nome) or [])]
    def get(self):
        raiz = self._contar("leituras")
        if raiz.falha: raise RuntimeError("429 quota exceeded")
        if self._nome == "users":                 # o documento do próprio usuário (perfil, integrações)
            return DocSimples(raiz.doc_usuario)
        achados = [d for d in (raiz.colecoes.get(self._nome) or []) if d.get("id") == self._id or d.get("place_id") == self._id]
        return DocSimples(achados[0] if achados else None)
    def set(self, *a, **k): self._contar("escritas")


def _amb(tmp_path, monkeypatch, fs, modulos):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'g.db'}")
    sessao = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    for mod in [robo_store, *modulos]:
        monkeypatch.setattr(mod, "AsyncSessionLocal", sessao, raising=False)
    monkeypatch.setattr(robo_store, "_sql_primeiro", lambda: True)
    for mod in modulos:
        monkeypatch.setattr(mod, "firestore_db", fs, raising=False)
    import app.firebase_config as fc
    monkeypatch.setattr(fc, "db", fs)
    robo_store._IMPORTADOS.clear(); robo_store._IMPORTAR_DEPOIS.clear(); robo_store._FALHA[0] = 0.0
    return engine


def test_documentos_antigos_sao_copiados_uma_vez_e_novos_nao_vao_ao_firestore(tmp_path, monkeypatch):
    antigos = [{"id": "doc_1", "kind": "proposta", "template_id": "", "title": "Proposta antiga", "content": "texto", "fields": {"a": "1"},
                "lead_id": "", "created_at": "2026-01-01T00:00:00", "updated_at": "2026-01-01T00:00:00"}]
    async def roda():
        fs = FsGeral({"documents": antigos})
        engine = _amb(tmp_path, monkeypatch, fs, [documents_store])
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        lista1 = await documents_store.list_documents("u1")
        lista2 = await documents_store.list_documents("u1")
        novo = await documents_store.create_document("u1", "proposta", "Nova", "conteúdo")
        completo = await documents_store.get_document("u1", "doc_1")
        await engine.dispose()
        return lista1, lista2, novo, completo, fs
    lista1, lista2, novo, completo, fs = asyncio.run(roda())
    assert [d["title"] for d in lista1] == ["Proposta antiga"] and len(lista2) == 1
    assert fs.leituras == 1 and fs.escritas == 0                  # uma leitura só; nada escrito lá
    assert novo["title"] == "Nova" and completo["content"] == "texto"


def test_integracoes_antigas_sao_copiadas_e_o_sql_mais_novo_vence(tmp_path, monkeypatch):
    async def roda():
        fs = FsGeral(doc_usuario={"integrations": {"smtp_host": "smtp.antigo.com", "smtp_user": "a@x.com"}})
        engine = _amb(tmp_path, monkeypatch, fs, [integrations_store])
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        await integrations_store._save_sqlite("u1", {"smtp_user": "novo@x.com"})
        r1 = await integrations_store.get_integrations("u1")
        r2 = await integrations_store.get_integrations("u1")
        await integrations_store.save_integrations("u1", {"smtp_host": "smtp.novo.com"})
        r3 = await integrations_store.get_integrations("u1")
        await engine.dispose()
        return r1, r2, r3, fs
    r1, r2, r3, fs = asyncio.run(roda())
    assert r1["smtp_host"] == "smtp.antigo.com" and r1["smtp_user"] == "novo@x.com" and r2 == r1
    assert r3["smtp_host"] == "smtp.novo.com"
    assert fs.leituras == 1 and fs.escritas == 0


def test_sites_antigos_sao_copiados_uma_vez_e_depois_o_firestore_nao_e_lido(tmp_path, monkeypatch):
    site = {"id": "s1", "company": "Padaria", "html": "<html>ok</html>", "slug": "padaria", "created_at": "2026-01-01", "updated_at": "2026-01-01"}
    async def roda():
        fs = FsGeral({"sites": [site]})
        engine = _amb(tmp_path, monkeypatch, fs, [sites_store])
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        a = await sites_store.list_sites("u1")
        b = await sites_store.list_sites("u1")
        pub = await sites_store.html_publico("padaria")
        novo = await sites_store.create_site("u1", "Outra", "<html>x</html>")
        await engine.dispose()
        return a, b, pub, novo, fs
    a, b, pub, novo, fs = asyncio.run(roda())
    assert [s["id"] for s in a] == ["s1"] and len(b) == 1
    assert fs.leituras == 1                      # o Firestore foi lido uma vez só
    assert pub == "<html>ok</html>" and novo["company"] == "Outra"
    assert fs.escritas == 0                      # nem a cópia de segurança vai mais para o Firestore


def test_raio_x_vem_do_sql_e_so_olha_o_firestore_quando_nao_tem(tmp_path, monkeypatch):
    import time as _time
    rx = {"id": "p1", "place_id": "p1", "gerado_em_ts": _time.time()}
    async def roda():
        fs = FsGeral({"raio_x": [rx]})
        engine = _amb(tmp_path, monkeypatch, fs, [])
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        primeiro = await raio_x.ler_cache("u1", "p1")           # só no Firestore: lê e copia
        leituras_1 = fs.leituras
        segundo = await raio_x.ler_cache("u1", "p1")            # agora no SQL: não lê o Firestore
        await raio_x.gravar_cache("u1", "p2", {"place_id": "p2", "gerado_em_ts": _time.time()})
        terceiro = await raio_x.ler_cache("u1", "p2")
        await engine.dispose()
        return primeiro, segundo, terceiro, leituras_1, fs
    primeiro, segundo, terceiro, leituras_1, fs = asyncio.run(roda())
    assert primeiro and segundo and terceiro
    assert leituras_1 == 1 and fs.leituras == 1 and fs.escritas == 0
