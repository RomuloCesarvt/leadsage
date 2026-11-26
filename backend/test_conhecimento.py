"""Base de conhecimento (RAG): corte em trechos, busca, limites e isolamento entre espaços. Banco e Gemini simulados."""
import asyncio
import math
import pytest
from app import conhecimento as c


class Banco:
    """Faz as vezes de robo_store._sql_*: um dicionário em memória."""
    def __init__(self): self.d = {}
    async def put(self, chave, uid, tipo, data): self.d[chave] = (uid, tipo, dict(data))
    async def listar(self, uid, tipo): return [dict(v[2]) for v in self.d.values() if v[0] == uid and v[1] == tipo]
    async def apagar(self, chave): self.d.pop(chave, None)


@pytest.fixture
def banco(monkeypatch):
    b = Banco()
    monkeypatch.setattr(c.robo_store, "_sql_put", b.put)
    monkeypatch.setattr(c.robo_store, "_sql_listar", b.listar)
    monkeypatch.setattr(c.robo_store, "_sql_apagar", b.apagar)
    return b


def rodar(x): return asyncio.run(x)


def sem_embeddings(monkeypatch):
    async def nada(textos, tarefa): return None
    monkeypatch.setattr(c, "_embeddings", nada)


def vetor_por_palavra(monkeypatch, mapa):
    """Embeddings falsos: cada texto vira um vetor one-hot pelo tema que ele cita."""
    temas = list(mapa)
    async def falso(textos, tarefa):
        out = []
        for t in textos:
            v = [0.0] * c.DIMENSOES
            for i, tema in enumerate(temas):
                if any(p in t.lower() for p in mapa[tema]): v[i] = 1.0
            if not any(v): v[len(temas)] = 1.0
            out.append(c._normalizar(v))
        return out
    monkeypatch.setattr(c, "_embeddings", falso)


def test_dividir_curto_e_longo():
    assert c.dividir("Olá, tudo bem?") == ["Olá, tudo bem?"]
    assert c.dividir("   ") == []
    longo = " ".join(f"Frase número {i} sobre o serviço de limpeza." for i in range(80))
    partes = c.dividir(longo)
    assert len(partes) > 3 and all(len(p) <= c.TRECHO_CARACTERES + 5 for p in partes)
    # nada se perde: toda frase aparece em algum trecho
    assert all(any(f"Frase número {i} " in p for p in partes) for i in range(80))


def test_busca_por_palavras_sem_embeddings(banco, monkeypatch):
    sem_embeddings(monkeypatch)
    r = rodar(c.adicionar("u1", "Garantia", "Todos os serviços têm garantia de 90 dias contra defeitos de instalação."))
    assert r["vetorial"] is False
    rodar(c.adicionar("u1", "Horário", "Atendemos de segunda a sexta, das 8h às 18h, e aos sábados até meio-dia."))
    achou = rodar(c.buscar("u1", "qual a garantia do serviço?"))
    assert achou and achou[0]["titulo"] == "Garantia"
    assert rodar(c.buscar("u1", "vocês entregam pizza?")) == []           # nada a ver: não inventa contexto


def test_busca_ignora_acento_e_caixa(banco, monkeypatch):
    sem_embeddings(monkeypatch)
    rodar(c.adicionar("u1", "Pagamento", "Aceitamos cartão de crédito em até 10x e Pix com 5% de desconto."))
    assert rodar(c.buscar("u1", "ACEITAM CARTAO?"))


def test_busca_vetorial_acha_pelo_sentido(banco, monkeypatch):
    vetor_por_palavra(monkeypatch, {"preco": ["preço", "valor", "custa"], "prazo": ["prazo", "dias", "entrega"]})
    rodar(c.adicionar("u1", "Preços", "A limpeza residencial custa R$ 250 por visita, com valor fixo."))
    rodar(c.adicionar("u1", "Prazos", "O prazo de entrega do serviço é de 3 dias úteis."))
    achou = rodar(c.buscar("u1", "quanto custa?"))
    assert achou and achou[0]["titulo"] == "Preços"


def test_espacos_nao_se_misturam(banco, monkeypatch):
    sem_embeddings(monkeypatch)
    rodar(c.adicionar("u1", "Agência", "Fazemos sites e gestão de tráfego pago para clínicas."))
    rodar(c.adicionar("u1~empresa", "Empresa", "Vendemos ar-condicionado split com instalação em 24 horas."))
    assert rodar(c.buscar("u1", "vocês instalam ar-condicionado?")) == []
    assert rodar(c.buscar("u1~empresa", "vocês instalam ar-condicionado?"))
    assert [d["titulo"] for d in rodar(c.listar("u1"))["documentos"]] == ["Agência"]


def test_apagar_documento(banco, monkeypatch):
    sem_embeddings(monkeypatch)
    r = rodar(c.adicionar("u1", "Garantia", "Todos os serviços têm garantia de 90 dias contra defeitos."))
    assert rodar(c.apagar("u1", r["id"])) == r["trechos"]
    assert rodar(c.listar("u1"))["trechos"] == 0
    assert rodar(c.buscar("u1", "garantia")) == []


def test_limites(banco, monkeypatch):
    sem_embeddings(monkeypatch)
    with pytest.raises(c.LimiteExcedido): rodar(c.adicionar("u1", "x", "curto"))
    with pytest.raises(c.LimiteExcedido): rodar(c.adicionar("u1", "x", "a" * (c.MAX_TEXTO + 1)))
    monkeypatch.setattr(c, "MAX_DOCUMENTOS", 2)
    rodar(c.adicionar("u1", "a", "Primeiro documento com texto suficiente."))
    rodar(c.adicionar("u1", "b", "Segundo documento com texto suficiente."))
    with pytest.raises(c.LimiteExcedido): rodar(c.adicionar("u1", "c", "Terceiro documento com texto suficiente."))


def test_bloco_do_prompt_e_consulta_do_robo(banco, monkeypatch):
    sem_embeddings(monkeypatch)
    rodar(c.adicionar("u1", "Garantia", "Todos os serviços têm garantia de 90 dias contra defeitos de instalação."))
    msgs = [{"de": "robo", "texto": "Olá!"}, {"de": "contato", "texto": "Qual é a garantia de vocês?"}]
    bloco = rodar(c.consultar_para_o_robo("u1", msgs))
    assert "BASE DE CONHECIMENTO" in bloco and "90 dias" in bloco and "não invente" in bloco
    assert rodar(c.consultar_para_o_robo("u1", [{"de": "robo", "texto": "Oi"}])) == ""    # lead ainda não falou
    assert rodar(c.consultar_para_o_robo("outro", msgs)) == ""


def test_consulta_nunca_derruba_o_robo(monkeypatch):
    async def quebra(*a, **k): raise RuntimeError("banco fora")
    monkeypatch.setattr(c, "buscar", quebra)
    assert rodar(c.consultar_para_o_robo("u1", [{"de": "contato", "texto": "oi, tem garantia?"}])) == ""


def test_prompt_do_robo_inclui_o_bloco():
    from app import ai_sdr
    cfg = {"_conhecimento": "== CONSULTA NA BASE DE CONHECIMENTO DA EMPRESA ==\n[Garantia] 90 dias\n", "objetivo": "vender"}
    p = ai_sdr.montar_prompt([{"de": "contato", "texto": "tem garantia?"}], "whatsapp", {"company_name": "Acme"}, cfg, None)
    assert "[Garantia] 90 dias" in p
    assert "BASE DE CONHECIMENTO" not in ai_sdr.montar_prompt([{"de": "contato", "texto": "oi"}], "whatsapp", {"company_name": "Acme"}, {}, None)
