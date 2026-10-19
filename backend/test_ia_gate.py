"""O portão da IA gratuita: orçamento por minuto, pausa depois de recusa, aprendizado pelos cabeçalhos e carga de vários usuários."""
import threading
import time

import pytest

from app import ai_client, ia_gate
from app.ai_client import AIIndisponivel


def alvo(chave="groq:m", tipo="groq", tpm=None, rpm=None):
    return ia_gate.Alvo(chave, tipo, lambda _: "ok", tpm=tpm, rpm=rpm)


def test_orcamento_por_minuto_espera_a_janela_em_vez_de_estourar():
    a = alvo(tpm=6000)
    agora = time.time()
    assert ia_gate.espera_do_alvo(a, 2800, agora) == 0
    ia_gate._estado(a.chave)["uso"].append((agora, 2800))
    ia_gate._estado(a.chave)["uso"].append((agora + 1, 2800))
    espera = ia_gate.espera_do_alvo(a, 2800, agora + 2)       # 5600 + 2800 > 6000: espera o primeiro sair da janela
    assert 55 <= espera <= 60
    assert ia_gate.espera_do_alvo(a, 2800, agora + 61) == 0   # a janela andou


def test_pedido_maior_que_o_orcamento_nunca_cabe():
    assert ia_gate.espera_do_alvo(alvo(tpm=1000), 3000) >= 1e8


def test_escolher_reserva_e_passa_para_o_proximo_quando_o_primeiro_enche():
    a, b = alvo("groq:a", tpm=6000), alvo("groq:b", tpm=6000)
    escolhidos = [ia_gate.escolher([a, b], 2800)[0].chave for _ in range(4)]
    assert escolhidos == ["groq:a", "groq:a", "groq:b", "groq:b"]          # 2 por modelo por minuto: nada de rajada
    nenhum, espera = ia_gate.escolher([a, b], 2800)
    assert nenhum is None and espera > 0


def test_recusa_usa_o_tempo_que_o_provedor_mandou_e_o_limite_diario_pausa_por_mais():
    a = alvo("gemini:x", "gemini")
    assert ia_gate.atraso_do_erro("429 ... Please retry in 23.5s", None)[0] == 23.5
    assert ia_gate.atraso_do_erro("... 'retryDelay': '41s' ...", None)[0] == 41
    assert ia_gate.atraso_do_erro("x", "7")[0] == 7
    espera = ia_gate.recusa(a, "RESOURCE_EXHAUSTED quota: GenerateRequestsPerDayPerProjectPerModel retry in 10s")
    assert espera == ia_gate.PAUSA_DIARIO_S
    assert ia_gate.espera_do_alvo(a, 100) > 1000
    b = alvo("gemini:y", "gemini")
    assert ia_gate.recusa(b, "429 retry in 12s") == 12
    assert 10 < ia_gate.espera_do_alvo(b, 100) <= 12


def test_cabecalhos_do_groq_corrigem_o_orcamento_e_seguram_quando_acaba():
    a = alvo("groq:m", tpm=6500)
    ia_gate.aprender_cabecalhos(a, 200, 1.5, 8000)                  # sobraram 200 tokens; volta em 1,5 s
    e = ia_gate._estado(a.chave)
    assert e["tpm"] == 6800 and 1 < ia_gate.espera_do_alvo(a, 100) <= 2


def test_modelo_inexistente_sai_do_rodizio_por_um_tempo():
    a = alvo("groq:velho")
    ia_gate.quebrou(a, "404 model not found")
    assert ia_gate.espera_do_alvo(a, 100) > 500


def test_carga_de_muitos_usuarios_nao_gera_rajada_de_chamadas_recusadas(monkeypatch):
    """40 pedidos de uma vez em 3 motores com limite: ninguém é chamado além do orçamento e os que cabem terminam."""
    chamadas = {"a": [], "b": [], "c": []}
    trava = threading.Lock()

    def fabrica(nome):
        def f(_):
            with trava:
                chamadas[nome].append(time.time())
                # o motor de verdade recusaria acima do limite: aqui isso é falha do teste
                recentes = [t for t in chamadas[nome] if time.time() - t < 60]
                assert len(recentes) <= 3, f"{nome} recebeu {len(recentes)} chamadas em 60 s"
            return f"de {nome}"
        return f

    alvos = [ia_gate.Alvo(n, "groq", fabrica(n), tpm=9000) for n in "abc"]     # cada um aguenta 3 pedidos de ~2.8k por minuto
    monkeypatch.setattr(ai_client, "_alvos", lambda *a, **k: alvos)
    resultados = []

    def pedido():
        try:
            resultados.append(ai_client.generate_hedged(None, "y" * 6000, time.monotonic() + 3, max_tokens=800))
        except AIIndisponivel as e:
            resultados.append(("fila", e.espera_s))

    fios = [threading.Thread(target=pedido) for _ in range(40)]
    [f.start() for f in fios]
    [f.join() for f in fios]
    atendidos = [r for r in resultados if isinstance(r, str)]
    recusados = [r for r in resultados if isinstance(r, tuple)]
    assert len(atendidos) == 9                                      # 3 motores x 3 pedidos: exatamente o que cabe no minuto
    assert all(r[0] == "fila" and r[1] >= 1 for r in recusados) and len(recusados) == 31
    assert {len(v) for v in chamadas.values()} == {3}               # nenhum motor foi chamado além do orçamento


def test_estado_e_compartilhado_entre_instancias_pelo_banco(client):
    """Duas instâncias do servidor (a Vercel abre várias) enxergam a pausa e o consumo uma da outra."""
    import asyncio
    import threading

    laco = asyncio.new_event_loop()
    fio = threading.Thread(target=laco.run_forever, daemon=True)
    fio.start()
    ia_gate.LOOP = laco
    try:
        a = alvo("gemini:compartilhado", "gemini")
        ia_gate.recusa(a, "429 retry in 40s")                          # a instância 1 levou 429 e publicou
        time.sleep(0.6)
        ia_gate._ESTADO.clear(); ia_gate._ULTIMA_LEITURA.clear()       # a instância 2 começa sem saber de nada
        ia_gate._sincronizar([a], time.time())
        assert 30 < ia_gate.espera_do_alvo(a, 100) <= 41               # ...e aprende a pausa pelo banco
        b = alvo("groq:compartilhado", "groq", tpm=6000)
        ia_gate.escolher([b], 2800); time.sleep(0.6)
        ia_gate._ESTADO.clear(); ia_gate._ULTIMA_LEITURA.clear()
        ia_gate._sincronizar([b], time.time())
        assert len(ia_gate._estado(b.chave)["uso"]) == 1               # o consumo da outra instância conta no orçamento
    finally:
        ia_gate.LOOP = None
        laco.call_soon_threadsafe(laco.stop)


def test_codigo_sincrono_dentro_do_laco_nao_trava_o_servidor():
    import asyncio

    async def dentro():
        ia_gate.LOOP = asyncio.get_running_loop()
        t = time.time()
        ia_gate._sincronizar([alvo("groq:x")], time.time())              # chamado direto do laço: não pode esperar por ele mesmo
        return time.time() - t

    try:
        assert asyncio.new_event_loop().run_until_complete(dentro()) < 0.5
    finally:
        ia_gate.LOOP = None
