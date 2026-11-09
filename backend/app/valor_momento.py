"""O momento de falar de valor: o dono escolhe QUANDO o assunto do preço entra, e a IA monta o texto de acordo.

A abordagem muda conforme o momento. A narrativa é a da dor do valor: muita gente está sem site não por falta de vontade, mas pelo medo
do preço e das surpresas depois; a proposta é acabar com isso. As GARANTIAS ("sem mensalidade", "sem pegadinha"...) só são ditas
se o dono as marcou como verdadeiras: o robô nunca promete o que não foi cadastrado.

Dois momentos marcados = teste A/B: os leads são divididos entre eles (pelo id do lead, sempre do mesmo lado) e o painel compara.
Cada lead guarda o momento com que foi abordado (`momento` na fila, `momento_valor` na conversa).
"""
import hashlib
from typing import Any, Dict, List, Optional

PADRAO = "apos_gostei"

MOMENTOS: Dict[str, Dict[str, str]] = {
    "primeira_com_valor": {"nome": "Na primeira mensagem, com o valor",
                           "texto": "Abre com a dor do valor, apresenta a proposta justa e já cita o valor. Convida a ver o exemplo do site dele."},
    "primeira_sem_numero": {"nome": "Na primeira mensagem, sem o número",
                            "texto": "Mesma abertura (valor justo, sem pegadinha), mas só diz que o preço é fixo e cabe no bolso. O número vem depois."},
    "apos_resposta": {"nome": "Depois que o lead responder",
                      "texto": "A primeira mensagem é leve e curiosa; o assunto do valor entra na primeira resposta."},
    "apos_gostei": {"nome": "Depois da prévia (\"gostei\")",
                    "texto": "O valor só aparece depois que o lead viu o site e reagiu bem. É o jeito mais seguro."},
    "so_se_perguntar": {"nome": "Só se o lead perguntar",
                        "texto": "O robô não puxa o assunto e responde com clareza quando perguntarem."},
}

GARANTIAS: Dict[str, str] = {
    "valor_fixo": "valor fixo, sem taxa escondida",
    "sem_mensalidade": "sem mensalidade",
    "paga_se_gostar": "você só paga se gostar do resultado",
    "hospedagem": "hospedagem inclusa",
    "dominio": "domínio incluso",
    "alteracoes": "alterações incluídas",
}

# O modo empresa (quem presta o serviço, como ar-condicionado) não vende site: o momento e as garantias são outros.
MOMENTOS_EMPRESA: Dict[str, Dict[str, str]] = {
    "primeira_sem_numero": {"nome": "Na primeira mensagem, sem número",
                            "texto": "Abre falando do orçamento claro e sem surpresa. O valor só vem depois, calculado pela sua tabela."},
    "apos_resposta": {"nome": "Depois que o cliente responder",
                      "texto": "A primeira mensagem é leve e curiosa; o assunto do valor entra na primeira resposta."},
    "so_se_perguntar": {"nome": "Só se o cliente perguntar",
                        "texto": "O robô não puxa o assunto e responde com clareza quando perguntarem. É o jeito mais seguro."},
}
PADRAO_EMPRESA = "so_se_perguntar"

GARANTIAS_EMPRESA: Dict[str, str] = {
    "orcamento_sem_compromisso": "orçamento sem compromisso",
    "valor_combinado": "valor combinado antes de começar, sem taxa escondida",
    "visita_gratis": "visita técnica sem custo",
    "garantia_servico": "garantia do serviço",
    "pecas_garantia": "peças com garantia",
    "paga_depois": "pagamento só depois do serviço feito",
    "horario": "atendimento no horário combinado",
}
COM_DETALHE_EMPRESA = ("garantia_servico", "pecas_garantia", "horario")
COM_DETALHE = ("hospedagem", "dominio", "alteracoes") + COM_DETALHE_EMPRESA


def _empresa(cfg: Dict[str, Any]) -> bool:
    """O robô é de quem presta o serviço (sem site nem prévia), não de agência."""
    try:
        from app import ai_oferta
        return bool(ai_oferta.sem_previa(cfg or {}))
    except Exception:
        return False


def normalizar(d: Any) -> Dict[str, Any]:
    d = d if isinstance(d, dict) else {}
    momentos = [m for m in (d.get("momentos") or []) if m in MOMENTOS]
    momentos = list(dict.fromkeys(momentos))[:2] or [PADRAO]
    g = d.get("garantias") if isinstance(d.get("garantias"), dict) else {}
    det = d.get("detalhes") if isinstance(d.get("detalhes"), dict) else {}
    return {
        "momentos": momentos,
        "garantias": {k: bool(g.get(k)) for k in [*GARANTIAS, *GARANTIAS_EMPRESA]},
        "detalhes": {k: str(det.get(k) or "").strip()[:80] for k in COM_DETALHE},
    }


def momentos_do(cfg: Dict[str, Any]) -> List[str]:
    ms = normalizar((cfg or {}).get("valor"))["momentos"]
    if _empresa(cfg):
        # no modo empresa não existe prévia nem preço único: o que sobrou da agência vira o equivalente seguro
        ms = list(dict.fromkeys({"primeira_com_valor": "primeira_sem_numero"}.get(m, m) for m in ms if m in MOMENTOS_EMPRESA or m == "primeira_com_valor"))
        ms = ms or [PADRAO_EMPRESA]
    return ms


def escolher(cfg: Dict[str, Any], lead_id: str) -> str:
    """O momento deste lead: com um só marcado, ele; com dois (A/B), a metade pelo id do lead (sempre o mesmo para o mesmo lead)."""
    ms = momentos_do(cfg)
    if len(ms) == 1:
        return ms[0]
    h = int(hashlib.sha256(str(lead_id or "").encode()).hexdigest(), 16)
    return ms[h % len(ms)]


def _preco(cfg: Dict[str, Any]) -> str:
    p = (cfg or {}).get("promocao") if isinstance((cfg or {}).get("promocao"), dict) else {}
    try:
        v = float(str(p.get("preco") or "0").replace(".", "").replace(",", "."))
    except ValueError:
        v = 0.0
    if not p.get("ativa") or v <= 0:
        return ""
    return f"R$ {int(v):,}".replace(",", ".") if v == int(v) else f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def garantias_marcadas(cfg: Dict[str, Any]) -> List[str]:
    v = normalizar((cfg or {}).get("valor"))
    saida = []
    for k, rotulo in (GARANTIAS_EMPRESA if _empresa(cfg) else GARANTIAS).items():
        if v["garantias"].get(k):
            extra = v["detalhes"].get(k, "") if k in COM_DETALHE else ""
            saida.append(f"{rotulo} ({extra})" if extra else rotulo)
    return saida


_NARRATIVA = (
    "NARRATIVA DO VALOR: muitos negócios estão sem site NÃO por falta de vontade, e sim pelo medo do preço e das surpresas depois "
    "(mensalidades, taxas, aditivos). Muitos fechamentos deixam de acontecer pelo valor. A proposta é acabar com essa dor: ter um site "
    "por um valor justo, que cabe no bolso. Diga isso de forma humana, curta e sem tom de propaganda; é conversa, não panfleto."
)


_NARRATIVA_EMPRESA = (
    "NARRATIVA DO VALOR: muita gente adia a instalação ou a manutenção do ar-condicionado por medo do preço e de um orçamento que vira surpresa "
    "depois. A proposta é o oposto: valor claro e combinado ANTES de começar, sem susto. Diga isso de forma humana, curta e sem tom de propaganda; "
    "é conversa, não panfleto. Não cite número: o valor sai da tabela de preços do dono, calculado quando o cliente pedir orçamento."
)


def bloco(momento: str, cfg: Dict[str, Any], fase: str) -> str:
    """A instrução para a IA: em que momento o valor entra e o que pode ser dito. `fase`: "abordagem" (1ª mensagem) ou "robo" (respostas)."""
    if _empresa(cfg):
        return _bloco_empresa(momento if momento in MOMENTOS_EMPRESA else PADRAO_EMPRESA, cfg, fase)
    if momento not in MOMENTOS:
        momento = PADRAO
    preco = _preco(cfg)
    garantias = garantias_marcadas(cfg)
    g_txt = ("GARANTIAS que você PODE citar (e só estas; o dono confirmou que são verdadeiras): " + "; ".join(garantias) + ".") if garantias else \
        "O dono NÃO marcou nenhuma garantia: não prometa 'sem mensalidade', 'sem pegadinha' nem 'só paga se gostar'."
    cab = f"== MOMENTO DE FALAR DE VALOR (escolha do dono): {MOMENTOS[momento]['nome']} =="

    if fase == "abordagem":
        if momento == "primeira_com_valor":
            num = (f"Cite o valor exatamente assim: {preco}. Não invente outro número, desconto nem prazo." if preco
                   else "O dono não cadastrou valor: fale só em 'valor justo e fixo', sem número.")
            regra = f"Nesta PRIMEIRA mensagem, abra com a dor do valor e apresente a proposta. {num}\n{_NARRATIVA}\nTermine com UMA pergunta leve (por exemplo, se pode mostrar como ficaria o site da empresa dele)."
        elif momento == "primeira_sem_numero":
            regra = ("Nesta PRIMEIRA mensagem, abra com a dor do valor e apresente a proposta, mas NÃO cite número nem faixa de preço: "
                     "diga apenas que o valor é justo, fixo e cabe no bolso.\n" + _NARRATIVA + "\nTermine com UMA pergunta leve.")
        elif momento == "apos_resposta":
            regra = "Nesta PRIMEIRA mensagem NÃO fale de preço nem de valor. Seja leve e curioso; o assunto do valor entra só depois que ele responder."
        elif momento == "so_se_perguntar":
            regra = "NÃO fale de preço nem de valor em nenhum ponto da mensagem. Só se ele perguntar (depois) o robô responde."
        else:  # apos_gostei
            regra = "NÃO fale de preço nem de valor: o valor só entra depois que a pessoa vir a prévia e gostar."
        return f"{cab}\n{regra}\n{g_txt if momento in ('primeira_com_valor', 'primeira_sem_numero') else ''}".strip()

    # fase "robo": respostas ao lead
    if momento == "primeira_com_valor":
        regra = ("O valor JÁ foi apresentado na primeira mensagem. Não o repita à toa; se perguntarem, confirme com clareza e sem rodeios"
                 + (f" ({preco})." if preco else "."))
    elif momento == "primeira_sem_numero":
        regra = ("A primeira mensagem falou de valor justo e fixo, sem número. Se ele perguntar quanto é, passe o valor"
                 + (f" ({preco})" if preco else "") + " com a mesma clareza e sem pegadinha.")
    elif momento == "apos_resposta":
        regra = ("Na SUA PRIMEIRA RESPOSTA a ele, traga o assunto do valor: a dor do preço, a proposta justa" + (f" e o valor ({preco})" if preco else "") + ".\n" + _NARRATIVA)
    elif momento == "so_se_perguntar":
        regra = "NÃO puxe o assunto de valor. Só responda sobre preço quando ele perguntar, de forma clara."
    else:
        regra = "Fale de valor só depois que ele tiver visto a prévia e reagido bem (o aviso da promoção sai automático nesse momento)."
    return f"{cab}\n{regra}\n{g_txt}".strip()


async def painel(uid: str) -> List[Dict[str, Any]]:
    """Compara os momentos: por momento, quantos receberam a abordagem e o que aconteceu depois. Só conta leads abordados pelo sistema."""
    from app import fila_envio, playbook_vendas, robo_store

    linhas = {m: {"momento": m, "nome": d["nome"], "enviados": 0, "responderam": 0, "gostaram": 0, "pararam": 0, "pediram_fechar": 0} for m, d in MOMENTOS.items()}
    for i in await fila_envio.listar(uid):
        m = i.get("momento")
        if m in linhas and i.get("status") == "enviado" and i.get("tipo") != "seguimento" and i.get("canal") == "whatsapp":
            linhas[m]["enviados"] += 1
    for c in await robo_store.listar_conversas(uid, com_mensagens=True):
        sdr = c.get("sdr") or {}
        m = sdr.get("momento_valor")
        if m not in linhas or not sdr.get("momento_da_abordagem"):
            continue
        dele = [x.get("texto", "") for x in (c.get("mensagens") or []) if x.get("de") == "contato"]
        if dele:
            linhas[m]["responderam"] += 1
            if (sdr.get("previa_enviada") or any("http" in (x.get("texto") or "") for x in c.get("mensagens") or [] if x.get("de") in ("robo", "voce"))) \
                    and any(playbook_vendas.gostou_da_previa(t) for t in dele):
                linhas[m]["gostaram"] += 1
        if c.get("optout"):
            linhas[m]["pararam"] += 1
        if sdr.get("fechamento_enviado"):
            linhas[m]["pediram_fechar"] += 1
    return [l for l in linhas.values() if l["enviados"] or l["responderam"]]


def _bloco_empresa(momento: str, cfg: Dict[str, Any], fase: str) -> str:
    garantias = garantias_marcadas(cfg)
    g_txt = ("GARANTIAS que você PODE citar (e só estas; o dono confirmou que são verdadeiras): " + "; ".join(garantias) + ".") if garantias else \
        "O dono NÃO marcou nenhuma garantia: não prometa garantia, visita sem custo nem orçamento sem compromisso."
    cab = f"== MOMENTO DE FALAR DE VALOR (escolha do dono): {MOMENTOS_EMPRESA[momento]['nome']} =="
    if fase == "abordagem":
        if momento == "primeira_sem_numero":
            regra = ("Nesta PRIMEIRA mensagem, abra com a dor do orçamento surpresa e apresente a proposta de valor claro, combinado antes. NÃO cite número "
                     "nem faixa de preço.\n" + _NARRATIVA_EMPRESA + "\nTermine com UMA pergunta leve (por exemplo, se quer um orçamento).")
        elif momento == "apos_resposta":
            regra = "Nesta PRIMEIRA mensagem NÃO fale de preço nem de valor. Seja leve e curioso; o assunto do valor entra só depois que ele responder."
        else:
            regra = "NÃO fale de preço nem de valor em nenhum ponto da mensagem. Só se ele perguntar (depois) o robô responde."
        return f"{cab}\n{regra}\n{g_txt if momento == 'primeira_sem_numero' else ''}".strip()
    if momento == "primeira_sem_numero":
        regra = "A primeira mensagem falou de valor claro e combinado antes, sem número. Se ele pedir o valor, calcule pela tabela de preços do dono, sem pegadinha."
    elif momento == "apos_resposta":
        regra = "Na SUA PRIMEIRA RESPOSTA a ele, traga o assunto do valor: a dor do orçamento surpresa e a proposta de valor claro, combinado antes.\n" + _NARRATIVA_EMPRESA
    else:
        regra = "NÃO puxe o assunto de valor. Só responda sobre preço quando ele perguntar, de forma clara e pela tabela de preços do dono."
    return f"{cab}\n{regra}\n{g_txt}".strip()
