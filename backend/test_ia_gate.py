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


def test_escolher_reserva_e_passa_para_o_proximo_quando_o_primeiro_enche(monkeypatch):
    monkeypatch.setattr(ia_gate, "RESERVA_PARA_CONVERSA", 0.0)
    a, b = alvo("groq:a", tpm=6000), alvo("groq:b", tpm=6000)
    escolhidos = [ia_gate.escolher([a, b], 2800)[0].chave for _ in range(4)]
    assert escolhidos == ["groq:a", "groq:b", "groq:a", "groq:b"]          # os pedidos se espalham: 2 por modelo por minuto, nada de rajada
    nenhum, espera = ia_gate.escolher([a, b], 2800)
    assert nenhum is None and espera > 0


def test_os_dois_motores_trabalham_juntos_em_vez_de_um_so_na_frente(monkeypatch):
    monkeypatch.setattr(ia_gate, "RESERVA_PARA_CONVERSA", 0.0)
    groq, gemini = alvo("groq:a", tpm=6500), alvo("gemini:x", "gemini")
    escolhidos = [ia_gate.escolher([groq, gemini], 1500)[0].chave for _ in range(6)]
    assert escolhidos.count("groq:a") >= 2 and escolhidos.count("gemini:x") >= 2     # antes: todos no primeiro até ele encher
    assert escolhidos[:2] == ["groq:a", "gemini:x"]                                  # o segundo pedido já vai ao outro motor


def test_motor_mais_cheio_recebe_menos(monkeypatch):
    monkeypatch.setattr(ia_gate, "RESERVA_PARA_CONVERSA", 0.0)
    cheio, folgado = alvo("groq:a", tpm=6500), alvo("gemini:x", "gemini")
    ia_gate.escolher([cheio], 5000)                                         # o primeiro já gastou quase tudo
    assert ia_gate.escolher([cheio, folgado], 1000)[0].chave == "gemini:x"


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
    monkeypatch.setattr(ia_gate, "RESERVA_PARA_CONVERSA", 0.0)
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


def test_limites_do_gemini_sobem_pelo_ambiente_quando_a_conta_e_paga(monkeypatch):
    assert ia_gate.Alvo("gemini:x", "gemini", None).rpm == ia_gate.RPM_PADRAO["gemini"]
    monkeypatch.setenv("IA_RPM_GEMINI", "300")
    monkeypatch.setenv("IA_TPM_GEMINI", "2000000")
    a = ia_gate.Alvo("gemini:x", "gemini", None)
    assert a.rpm == 300 and a.tpm == 2000000


# ---------------------------------------------------- erros REAIS da biblioteca do Google (o bug que derrubou todos os disparos)
def _cliente_que_recusa(erro):
    class Modelos:
        def generate_content(self, model, contents, config=None):
            raise erro

    class Cliente:
        models = Modelos()
    return Cliente()


def test_recusa_real_do_gemini_429_nao_derruba_o_pedido_e_pausa_o_modelo():
    """`status` do ClientError é TEXTO ("RESOURCE_EXHAUSTED"): converter em int() quebrava todo pedido com ValueError."""
    from google.genai import errors

    erro = errors.ClientError(429, {"error": {"code": 429, "message": "Quota exceeded. Please retry in 23.5s.", "status": "RESOURCE_EXHAUSTED"}})
    assert ai_client._status_http(erro) == 429
    with pytest.raises(AIIndisponivel) as e:                           # falha limpa, nunca ValueError
        ai_client.generate_hedged(_cliente_que_recusa(erro), "oi", time.monotonic() + 6, max_tokens=100)
    assert e.value.espera_s >= 1
    assert all(ia_gate.espera_do_alvo(ia_gate.Alvo(f"gemini:{m}", "gemini", None), 100) > 5 for m in ai_client.MODEL_CHAIN)


@pytest.mark.parametrize("classe,codigo,status", [("ClientError", 429, "RESOURCE_EXHAUSTED"), ("ServerError", 503, "UNAVAILABLE"),
                                                   ("ClientError", 404, "NOT_FOUND"), ("ClientError", 400, "INVALID_ARGUMENT"),
                                                   ("ClientError", 403, "PERMISSION_DENIED"), ("ServerError", 500, "INTERNAL")])
def test_qualquer_erro_real_do_google_vira_falha_limpa(classe, codigo, status):
    from google.genai import errors

    erro = getattr(errors, classe)(codigo, {"error": {"code": codigo, "message": "x retry in 5s", "status": status}})
    try:
        ai_client.generate_hedged(_cliente_que_recusa(erro), "oi", time.monotonic() + 4, max_tokens=100)
    except AIIndisponivel:
        pass                                                           # o único tipo de erro que pode sair daqui


def test_defeito_no_portao_nao_derruba_quem_pediu_o_texto(monkeypatch):
    monkeypatch.setattr(ia_gate, "escolher", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("bug no portão")))
    monkeypatch.setattr(ai_client, "_alvos", lambda *a, **k: [ia_gate.Alvo("x", "gemini", lambda _: "texto ok")])
    assert ai_client.generate_hedged(None, "oi", time.monotonic() + 5) == "texto ok"
    monkeypatch.setattr(ai_client, "_ensinar_falha", lambda *a, **k: (_ for _ in ()).throw(ValueError("bug")))
    ai_client._falha_do_alvo(ia_gate.Alvo("x", "gemini", None), RuntimeError("429"))      # não levanta


def test_pedido_grande_demais_ensina_o_limite_do_modelo_sem_pausar_os_outros():
    a = alvo("groq:qwen", "groq")
    ia_gate.recusa(a, 'Request too large for model `qwen` ... tokens per minute (TPM): Limit 6000, Requested 7100, please reduce')
    assert ia_gate._estado(a.chave)["tpm"] == 5100
    assert ia_gate.espera_do_alvo(a, 4000) == 0 and ia_gate.espera_do_alvo(a, 6000) >= 1e8     # o pedido pequeno ainda cabe; o grande não


def test_marcador_de_preenchimento_nunca_chega_ao_lead():
    from app.ai_generator import limpar_marcadores

    t, av = limpar_marcadores("Boa tarde! Sou o [Seu Nome], da LeadSage.", "Júlia Silva")
    assert t == "Boa tarde! Sou o Júlia Silva, da LeadSage." and av == []
    t, av = limpar_marcadores("Oi! Sou [Seu Nome] e vi o [Link da prévia] aqui.", "Prospecção LeadSage")
    assert "[" not in t and av and "campo para preencher" in av[0]
    assert limpar_marcadores("Mensagem normal.", "X") == ("Mensagem normal.", [])


def test_lote_deixa_uma_reserva_para_a_resposta_do_robo():
    """Gerar 15 mensagens nunca pode deixar a conversa de um lead sem resposta: o lote só usa 70% do orçamento."""
    a = alvo("groq:m", tpm=10000, rpm=100)
    ia_gate.PRIORIDADE.set("normal")
    pedidos = 0
    while ia_gate.escolher([a], 2000)[0] is not None:
        pedidos += 1
    assert pedidos == 3                                              # 3 x 2.000 = 6.000; o quarto passaria de 7.000 (70%)
    ia_gate.PRIORIDADE.set("alta")
    try:
        assert ia_gate.escolher([a], 2000)[0] is not None            # a conversa ainda cabe
        assert ia_gate.escolher([a], 2000)[0] is not None
        assert ia_gate.escolher([a], 2000)[0] is None                # e o orçamento inteiro é o teto
    finally:
        ia_gate.PRIORIDADE.set("normal")


# ---------------------------------------------------------------- os dois motores, um apoiando o outro
def _dois_motores(monkeypatch, groq_falha=False):
    usos = {"groq": 0, "gemini": 0}
    lock = threading.Lock()

    def fazer(nome, falha=False):
        def chamar(limite_s):
            with lock:
                usos[nome] += 1
            if falha:
                raise RuntimeError("429 RESOURCE_EXHAUSTED retry in 30s")
            time.sleep(0.05)
            return f'{{"de": "{nome}"}}'
        return chamar

    alvos = [ia_gate.Alvo("groq:m", "groq", fazer("groq", groq_falha), tpm=6500, rpm=25),
             ia_gate.Alvo("gemini:m", "gemini", fazer("gemini"), tpm=120000, rpm=8)]
    monkeypatch.setattr(ai_client, "_alvos", lambda *a, **k: alvos)
    return usos


def test_pedidos_simultaneos_usam_os_dois_motores(monkeypatch):
    usos = _dois_motores(monkeypatch)
    respostas = []
    fios = [threading.Thread(target=lambda: respostas.append(ai_client.generate_hedged(None, "p", time.monotonic() + 20, max_tokens=500)))
            for _ in range(6)]
    [f.start() for f in fios]
    [f.join() for f in fios]
    assert len(respostas) == 6
    assert usos["groq"] >= 2 and usos["gemini"] >= 2, usos          # os dois trabalharam: nenhum ficou como reserva parada


def test_quando_um_motor_falha_o_outro_assume_sem_o_usuario_perceber(monkeypatch):
    usos = _dois_motores(monkeypatch, groq_falha=True)
    respostas = [ai_client.generate_hedged(None, "p", time.monotonic() + 20, max_tokens=500) for _ in range(4)]
    assert all('"gemini"' in r for r in respostas)                  # o Groq recusou; o Gemini respondeu tudo
    assert usos["groq"] == 1                                         # e o Groq descansa pelo tempo que mandou, sem martelar de novo
