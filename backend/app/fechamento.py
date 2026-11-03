"""O fechamento: quando o lead diz "quero fechar", o robo entrega o checklist do que falta para comecar.

Antes, o robo reconhecia o sinal de compra e perguntava de novo ("terca ou quarta?"): o lead dizia que queria fechar e nao recebia nada.
Agora a mensagem sai de CODIGO, montada so com o que o dono cadastrou (preco, prazo, forma de pagamento, Pix, sinal, o que pede do cliente):
nada de valor, chave ou prazo inventado. O que o dono nao cadastrou vira "te passo ja ja" e uma pessoa assume.
"""
import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

from app import ai_oferta

# intencao de FECHAR (mais forte que "gostei"/"como funciona"): so estas frases disparam o checklist
_FECHAR = (
    r"quero fechar", r"vamos fechar", r"pode fechar", r"podemos fechar", r"vamos (la|nessa|sim)\b.*\b(fechar|contratar|comecar)",
    r"quero (contratar|comecar|o servico|o site|esse site|assinar|seguir com|fazer o site|iniciar)", r"pode (comecar|iniciar|fazer|seguir)\b",
    r"\bfechado\b", r"\bfechou\b", r"to dentro", r"estou dentro", r"vou querer", r"vamos (comecar|contratar|seguir|iniciar)",
    r"como (faco|fazemos|eu faco) (pra|para) (fechar|contratar|comecar|pagar)", r"onde (eu )?pago", r"manda (o )?(pix|a chave|os dados)", r"qual (o )?pix",
    r"(aceito|aprovado|aprovei)\b", r"\bbora (fechar|comecar|contratar)", r"vamos que vamos", r"pode mandar (o )?(contrato|pix|dados)",
)
_FECHAR_RE = re.compile("|".join(f"(?:{p})" for p in _FECHAR))
# "nao quero fechar", "ainda nao vou fechar": a negacao nao e fechamento
_NEGA_RE = re.compile(r"\b(nao|nunca|jamais|ainda nao|talvez|quem sabe|se eu)\b[^.!?]{0,20}\b(fechar|contratar|comecar|querer|quero|vou|fechado)")


def _normal(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode().lower()
    return " ".join(re.sub(r"[^a-z0-9? ]+", " ", t).split())


def quer_fechar(texto: str) -> bool:
    t = _normal(texto)
    if not t or len(t.split()) > 40:
        return False
    if _NEGA_RE.search(t):
        return False
    return bool(_FECHAR_RE.search(t))


def _brl(v: float) -> str:
    return ai_oferta._brl(v)


def _itens_do_cliente(oferta: Dict[str, Any]) -> List[str]:
    """O que o cliente precisa mandar. O dono pode cadastrar a lista; sem ela, a padrao do servico."""
    if oferta.get("itens_do_cliente"):
        return [i.strip(" -*\u2022") for i in re.split(r"[\n;]|(?<=\.)\s", oferta["itens_do_cliente"]) if i.strip(" -*\u2022")][:10]
    padrao = {
        "site": ["Logo (ou as cores da marca)", "Fotos do seu negócio, da equipe e do que vende", "Os serviços/produtos que quer destacar, com os preços se quiser mostrar",
                 "Endereço, horário de funcionamento e WhatsApp para o botão", "Link do Instagram e do perfil do Google", "Domínio (.com.br), se já tiver um"],
        "gmn": ["Acesso (como proprietário/gerente) ao perfil do Google", "Fotos recentes do local e dos serviços", "Horários e serviços atualizados"],
        "social": ["Acesso ao perfil (ou convite como parceiro)", "Logo e identidade visual", "O que não pode faltar nas postagens", "Fotos e vídeos que já tenha"],
        "trafego": ["Acesso à conta de anúncios (ou a criamos juntos)", "Verba mensal de mídia que quer investir", "Ofertas e público que quer atingir"],
    }
    return padrao.get(oferta.get("servico"), ["O material e as informações do seu negócio"])


def montar_conversa(cfg: Dict[str, Any], lead: Optional[Dict[str, Any]], nome: str = "") -> Tuple[List[str], List[str]]:
    """Fechamento em forma de CONVERSA: deixa claro que o que ele viu e uma previa e convida para mostrar como pode ficar melhor.

    Sem Pix, sem lista de documentos: pagamento e contrato se acertam depois, na conversa, com uma pessoa."""
    oferta = ai_oferta.normalizar(cfg.get("oferta") or {})
    primeiro = (nome or (lead or {}).get("name") or "").strip().split(" ")[0]
    m1 = (f"Que bom, {primeiro}! 🙌 " if primeiro else "Que bom! 🙌 ") + (
        "Só deixando claro: o que você viu é uma *prévia*, uma primeira ideia feita com fotos e textos de exemplo. "
        "No site de verdade entram as *suas fotos*, os seus textos e informações reais, e o *layout, as cores e as seções podem mudar* "
        "do jeito que combinar mais com o seu negócio.")
    if ai_oferta.promocao_ativa(cfg):
        promo = ai_oferta.normalizar_promocao(cfg.get("promocao"))
        itens = ai_oferta._itens(promo["inclui"])
        m1 += f"\n\nE a condição que te passei continua: *{ai_oferta._brl(promo['preco'])}*" + (f", com {'; '.join(i[0].lower() + i[1:] for i in itens)}." if itens else ".")
    pergunta = "Que tal uma conversa rápida (uns 15 minutinhos) para eu te mostrar como ele pode ficar ainda melhor e acertar os detalhes com você?"
    agenda = (cfg.get("link_agenda") or "").strip()
    m2 = pergunta + (f" Pode escolher o melhor horário por aqui: {agenda}" if agenda else " Qual dia e horário ficam bons para você?")
    return [m1, m2], []


def montar(cfg: Dict[str, Any], lead: Optional[Dict[str, Any]], nome: str = "") -> Tuple[List[str], List[str]]:
    """(mensagens, pendencias_do_dono). Pendencias: o que o dono ainda nao cadastrou e uma pessoa precisa passar."""
    oferta = ai_oferta.normalizar(cfg.get("oferta") or {})
    if oferta["fechamento"] != "checklist":
        return montar_conversa(cfg, lead, nome)
    if ai_oferta.promocao_ativa(cfg):
        # fecha-se pelo preco e pelos itens que foram anunciados na promocao
        promo = ai_oferta.normalizar_promocao(cfg.get("promocao"))
        oferta["preco"] = promo["preco"]
        if promo["inclui"]:
            oferta["inclui"] = "; ".join(ai_oferta._itens(promo["inclui"]))
    nome_servico = oferta["nome"] or ai_oferta.PLAYBOOKS[oferta["servico"]]["nome"]
    primeiro = (nome or (lead or {}).get("name") or "").strip().split(" ")[0]
    pend: List[str] = []

    resumo = [f"• Serviço: {nome_servico}"]
    if oferta["inclui"]:
        resumo.append(f"• Inclui: {oferta['inclui'].rstrip('.')}")
    if oferta["preco"]:
        resumo.append(f"• Valor: {_brl(oferta['preco'])}")
    else:
        pend.append("valor do serviço")
        resumo.append("• Valor: já te confirmo por aqui, com o que combinamos")
    if oferta["prazo_dias"]:
        resumo.append(f"• Prazo: {oferta['prazo_dias']} dias depois que eu receber o material")
    else:
        pend.append("prazo de entrega")
    if oferta["revisoes"]:
        resumo.append(f"• Ajustes: {oferta['revisoes'].rstrip('.')}")
    if oferta["garantia"]:
        resumo.append(f"• Garantia: {oferta['garantia'].rstrip('.')}")

    pagamento: List[str] = []
    if oferta["pagamento"]:
        pagamento.append(f"• Condição: {oferta['pagamento'].rstrip('.')}")
    if oferta["preco"] and oferta["sinal_percentual"]:
        sinal = round(oferta["preco"] * oferta["sinal_percentual"] / 100, 2)
        pagamento.append(f"• Para começar: sinal de {oferta['sinal_percentual']}% ({_brl(sinal)}); o restante {_brl(oferta['preco'] - sinal)} na entrega")
    if oferta["pix_chave"]:
        titular = f" (em nome de {oferta['pix_titular']}" + (f", {oferta['pix_banco']})" if oferta["pix_banco"] else ")") if oferta["pix_titular"] else ""
        pagamento.append(f"• Pix: {oferta['pix_chave']}{titular}")
    else:
        pend.append("chave Pix")
        pagamento.append("• Pix: já te passo a chave por aqui")
    if not oferta["pagamento"] and not oferta["sinal_percentual"]:
        pend.append("condição de pagamento (sinal/parcelas)")

    lista = [f"☐ Comprovante do pagamento{' do sinal' if oferta['sinal_percentual'] else ''}"]
    dados = oferta["dados_do_contrato"] or "Nome completo (ou razão social), CPF/CNPJ e e-mail, para o contrato e a nota"
    lista.append(f"☐ {dados.rstrip('.')}")
    lista += [f"☐ {i}" for i in _itens_do_cliente(oferta)]

    abertura = (f"Que bom, {primeiro}! 🙌 Vamos fechar então. " if primeiro else "Que bom! 🙌 Vamos fechar então. ")
    m1 = abertura + "Resumo do que combinamos:\n" + "\n".join(resumo) + "\n\nPagamento:\n" + "\n".join(pagamento)
    m2 = "Para eu começar, preciso de:\n" + "\n".join(lista) + "\n\nPode ir mandando por aqui, aos poucos, que eu vou conferindo. Tudo certo com o resumo?"
    return [m1, m2], pend


def motivo_para_o_dono(pendencias: List[str], cfg: Optional[Dict[str, Any]] = None) -> str:
    if cfg is not None and ai_oferta.normalizar((cfg or {}).get("oferta") or {})["fechamento"] != "checklist":
        return "quer fechar — o robô deixou claro que é uma prévia e propôs uma conversa para mostrar como melhorar. Combine o horário e acerte pagamento e contrato nela"
    base = "quer fechar — o robô enviou o checklist (valor, Pix, contrato e material)"
    if pendencias:
        return f"{base}. Falta você cadastrar/passar: {', '.join(pendencias)}"
    return f"{base}. Confirme o comprovante do pagamento e formalize o contrato"
