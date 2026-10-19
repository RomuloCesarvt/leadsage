"""Site criado e link "Site não encontrado": o site ia para um banco e o link procurava no outro."""
import asyncio

import pytest

from app import sites_store as ss

HTML = "<!DOCTYPE html><html><body><h1>Confeitaria Ana</h1></body></html>"


class _Doc:
    def __init__(self, base, chave):
        self.base, self.chave = base, chave

    def set(self, dados, merge=False):
        if self.base.falhar:
            raise RuntimeError("429 Quota exceeded")
        self.base.docs[self.chave] = {**(self.base.docs.get(self.chave) or {}), **dados} if merge else dict(dados)

    def get(self):
        d = self.base.docs.get(self.chave)
        return type("D", (), {"exists": d is not None, "to_dict": lambda s: dict(d or {})})()

    def delete(self):
        self.base.docs.pop(self.chave, None)

    def collection(self, nome):
        return _Col(self.base, f"{self.chave}/{nome}")


class _Col:
    def __init__(self, base, caminho):
        self.base, self.caminho = base, caminho

    def document(self, nome):
        return _Doc(self.base, f"{self.caminho}/{nome}")

    def stream(self):
        pref = self.caminho + "/"
        return [type("D", (), {"to_dict": lambda s, v=v: dict(v)})() for k, v in self.base.docs.items() if k.startswith(pref) and "/" not in k[len(pref):]]


class FirestoreFalso:
    def __init__(self):
        self.docs, self.falhar = {}, False

    def collection(self, nome):
        return _Col(self, nome)


def _rodar(c):
    return asyncio.new_event_loop().run_until_complete(c)


@pytest.fixture
def fs(client, monkeypatch):
    f = FirestoreFalso()
    monkeypatch.setattr(ss, "firestore_db", f)
    return f


def test_site_criado_com_firestore_sem_cota_abre_pelo_link_depois_que_a_cota_volta(fs):
    fs.falhar = True                                                      # Firestore sem cota na hora de criar
    site = _rodar(ss.create_site("u1", "Confeitaria Ana", HTML, "Forno", "L1"))
    fs.falhar = False                                                     # a cota voltou: o índice do apelido não existe lá
    assert _rodar(ss.html_publico(site["slug"])) == HTML                 # antes: "Site não encontrado"


def test_site_gravado_sem_o_indice_do_apelido_ainda_abre(fs, monkeypatch):
    monkeypatch.setattr(ss, "_registrar_apelido", lambda *a: None)       # a segunda gravação (índice) falhou
    site = _rodar(ss.create_site("u1", "Confeitaria Ana", HTML))
    assert _rodar(ss.html_publico(site["slug"])) == HTML


def test_site_antigo_que_so_existe_no_firestore_abre_e_passa_para_o_sql(fs):
    fs.docs["users/u9/sites/site_antigo"] = {"id": "site_antigo", "company": "Padaria Velha", "html": HTML, "slug": "padaria-velha-1234", "created_at": "2026-01-01"}
    fs.docs["sites_publicos/padaria-velha-1234"] = {"uid": "u9", "site_id": "site_antigo"}
    assert _rodar(ss.html_publico("padaria-velha-1234")) == HTML
    fs.docs.clear()                                                       # mesmo sem o Firestore, agora o SQL tem
    assert _rodar(ss.html_publico("padaria-velha-1234")) == HTML
    assert [s["id"] for s in _rodar(ss.list_sites("u9"))] == ["site_antigo"]


def test_atualizar_mantem_o_link_e_a_lista_junta_os_dois_bancos(fs):
    site = _rodar(ss.create_site("u1", "Confeitaria Ana", HTML))
    novo = _rodar(ss.update_site("u1", site["id"], "Confeitaria Ana", HTML.replace("Ana", "Ana Doces"), marcar_edicao=False))
    assert novo["slug"] == site["slug"] and "Ana Doces" in _rodar(ss.html_publico(site["slug"]))
    fs.docs["users/u1/sites/site_fs"] = {"id": "site_fs", "company": "Só no Firestore", "created_at": "2025-01-01"}
    assert {s["id"] for s in _rodar(ss.list_sites("u1"))} == {site["id"], "site_fs"}
    assert _rodar(ss.contar_sites("u1")) == 2


def test_apagar_tira_dos_dois_e_o_link_morre(fs):
    site = _rodar(ss.create_site("u1", "Confeitaria Ana", HTML))
    assert _rodar(ss.delete_site("u1", site["id"])) is True
    assert _rodar(ss.html_publico(site["slug"])) is None
    assert _rodar(ss.delete_site("outro", site["id"])) is False


def test_site_antigo_sem_indice_abre_depois_que_o_dono_lista_os_sites(fs):
    """Site gravado só no Firestore e sem o índice do apelido: ao listar (Meus sites, Disparo) ele passa para o SQL e o link abre."""
    fs.docs["users/u7/sites/site_x"] = {"id": "site_x", "company": "Confeitaria Ana", "html": HTML, "slug": "confeitaria-ana-ab12", "created_at": "2026-10-19"}
    assert _rodar(ss.html_publico("confeitaria-ana-ab12")) is None
    _rodar(ss.list_sites("u7"))
    assert _rodar(ss.html_publico("confeitaria-ana-ab12")) == HTML


def test_fila_ve_a_previa_criada_mesmo_quando_ela_foi_gravada_so_no_sql(fs):
    """A fila mostrava "sem prévia": a lista de sites vinha só do Firestore, e o site recém-criado estava no SQL."""
    from app import main
    fs.falhar = True
    _rodar(ss.create_site("u1", "Confeitaria Ana", HTML, "Forno", "lead_ana"))
    fs.falhar = False
    assert _rodar(main._previa_do_lead("u1", "lead_ana")) == "criada"
    assert _rodar(main._previa_do_lead("u1", "outro_lead")) == "oferecer"
