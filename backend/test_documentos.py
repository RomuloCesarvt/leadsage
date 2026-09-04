"""Testes dos documentos criados a partir dos modelos.

As telas de Propostas e Contratos so mostravam o texto do modelo com um
botao de copiar: nao dava para preencher, salvar nem voltar depois.

Fixtures (`client`, `as_user`) vem de conftest.py.

Rodar:  cd backend && python -m pytest test_documentos.py -v
"""
import pytest

CONTEUDO = "PROPOSTA\n\nPara: [NOME DO CLIENTE]\nValor: R$ [VALOR]"


def criar(client, **extra):
    corpo = {
        "kind": "proposta",
        "title": "Proposta Padaria X",
        "content": CONTEUDO,
        "fields": {"NOME DO CLIENTE": "Padaria X"},
        "template_id": "minimalista",
    }
    corpo.update(extra)
    return client.post("/api/documents", json=corpo)


def test_documento_salva_conteudo_e_campos(client, com_plano):
    com_plano()
    resp = criar(client)
    assert resp.status_code == 200, resp.text
    doc = resp.json()
    assert doc["title"] == "Proposta Padaria X"
    assert doc["fields"]["NOME DO CLIENTE"] == "Padaria X"

    salvo = client.get(f"/api/documents/{doc['id']}").json()
    assert salvo["content"] == CONTEUDO
    assert salvo["template_id"] == "minimalista"


def test_documento_pode_ser_reeditado(client, com_plano):
    com_plano()
    doc_id = criar(client).json()["id"]

    resp = client.put(f"/api/documents/{doc_id}", json={
        "title": "Proposta revisada",
        "content": CONTEUDO + "\nPrazo: 30 dias",
        "fields": {"NOME DO CLIENTE": "Padaria X", "VALOR": "3.000"},
    })
    assert resp.status_code == 200
    atualizado = resp.json()
    assert atualizado["title"] == "Proposta revisada"
    assert "Prazo: 30 dias" in atualizado["content"]
    assert atualizado["fields"]["VALOR"] == "3.000"
    # o update tem que persistir, nao so voltar na resposta
    assert client.get(f"/api/documents/{doc_id}").json()["title"] == "Proposta revisada"


def test_listagem_nao_carrega_o_texto_inteiro(client, com_plano):
    com_plano()
    criar(client)
    lista = client.get("/api/documents").json()
    assert len(lista) == 1
    assert not lista[0].get("content")


def test_listagem_filtra_por_tipo(client, com_plano):
    com_plano()
    criar(client, kind="proposta", title="Uma proposta")
    criar(client, kind="contrato", title="Um contrato")

    assert len(client.get("/api/documents").json()) == 2
    propostas = client.get("/api/documents", params={"kind": "proposta"}).json()
    assert len(propostas) == 1 and propostas[0]["title"] == "Uma proposta"


@pytest.mark.parametrize("invalido,motivo", [
    ({"kind": "receita"}, "tipo desconhecido"),
    ({"title": "   "}, "sem titulo"),
    ({"content": "  "}, "sem conteudo"),
])
def test_documento_invalido_e_recusado(client, com_plano, invalido, motivo):
    com_plano()
    assert criar(client, **invalido).status_code == 400, motivo


def test_documentos_sao_isolados_por_usuario(client, as_user, com_plano):
    com_plano('agencia', 'alice')
    com_plano('agencia', 'bob')
    doc_id = criar(client).json()["id"]

    as_user("bob")
    assert client.get("/api/documents").json() == []
    assert client.get(f"/api/documents/{doc_id}").status_code == 404
    assert client.delete(f"/api/documents/{doc_id}").status_code == 404
    assert client.put(f"/api/documents/{doc_id}", json={
        "title": "invadido", "content": "x",
    }).status_code == 404

    as_user("alice")
    assert client.get(f"/api/documents/{doc_id}").json()["title"] == "Proposta Padaria X"
    assert client.delete(f"/api/documents/{doc_id}").status_code == 200
    assert client.get("/api/documents").json() == []
