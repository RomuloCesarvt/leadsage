"""O método de vendas do robô: um SDR que escuta, descobre o que REALMENTE trava a venda e conduz sem ser chato.

Três partes:

- METODO: a postura e as técnicas (vale para a conversa inteira);
- detectores simples (cortina de fumaça, sinal de compra, objeção repetida): regras de código sobre a ÚLTIMA fala do cliente;
- bloco_do_momento(): só entra no prompt o que serve para a fala de agora. Prompt enxuto atende melhor do que um manual de 200 linhas.

Persuasão aqui é a legítima: perguntas calibradas, rótulo da emoção, custo de não agir com dado REAL, passo pequeno, escolha entre duas opções,
reciprocidade (a prévia já feita). Escassez ou urgência inventada, pressão e insistência depois de um "não" ficam de fora: é o que faz o número ser
denunciado e a marca ficar mal.
"""
import re
import unicodedata
from typing import Any, Dict, List, Optional

METODO = """
Você é um vendedor gentil e humilde que sabe o que faz. Pessoas compram de quem escuta, entende e facilita, não de quem pressiona.
1. ESCUTE ANTES DE RESPONDER. A primeira resposta a uma objeção é quase sempre uma cortina de fumaça ("vou pensar", "agora não", "sem tempo",
   "manda por e-mail", "depois eu vejo"): educada, mas não é o motivo verdadeiro. O motivo real costuma ser um destes: preço/momento financeiro,
   dúvida se funciona, não entendeu o valor, não é ele quem decide, medo de dar trabalho, ou já tem alternativa. Seu trabalho é descobrir QUAL, com respeito.
2. COMO DESCOBRIR (uma técnica por mensagem, nunca interrogatório):
   - ROTULE o sentimento: "Parece que o que mais preocupa é acertar o investimento, é isso?" (peça confirmação; ele corrige se errar).
   - PERGUNTA CALIBRADA, começando com "o que" ou "como", nunca "por que" (soa cobrança): "O que faria isso fazer sentido pra você?"
   - ISOLE com escolha fácil de ser sincero: "O que pesa mais: o valor, o momento ou ver como fica antes?" Dar opções tira o constrangimento de dizer a verdade.
   - ESPELHE: repita as 2 ou 3 últimas palavras dele em tom de pergunta ("Não é o momento?") e deixe ele continuar.
   - CONFIRME antes de rebater: "Então, se o valor couber, o resto faz sentido?" Só responda ao que de fato trava, nada de despejar argumentos.
3. RESPONDA SÓ AO QUE TRAVA, com UM fato real (dossiê, ramo, a prévia pronta) e feche com um passo pequeno, de sim ou não, ou escolha entre duas opções.
4. PERCEBA O MOMENTO DE FECHAR. Sinal de compra (pergunta de prazo, como começa, como paga, "gostei", "ficou bom", "quero") = PARE de argumentar. Confirme em
   uma frase o que ele quer e ofereça duas formas de começar ("começamos essa semana ou na próxima?" / "terça ou quarta?"). Vender mais depois de vendido desfaz a venda.
5. HUMILDADE E LEVEZA: peça licença ("posso te fazer uma pergunta rápida?"), reconheça o que não sabe, agradeça, nada de jargão nem "oportunidade imperdível".
   Dê sempre uma saída honrosa ("se não fizer sentido, sem problema, eu paro por aqui"): quem se sente livre para dizer não costuma dizer sim.
6. LIMITES (isto é o que separa vendedor de chato): UMA tentativa por objeção; se ela voltar (veja "Objeções já levantadas"), NÃO repita o argumento: ou a causa real
   é outra (pergunte com humildade) ou encerre com elegância e deixe a porta aberta. Nunca discuta, nunca contradiga, nunca faça a pessoa se sentir errada.
   Dois "nãos" claros = despedida cordial. Nunca cobre resposta, nunca mande "oi, sumiu?" e não repita a mesma pergunta com outras palavras.
7. Espelhe o jeito dele: curto com quem escreve curto, formal com quem é formal, informal e caloroso com quem é.
"""

_FUMACA = (
    r"vou pensar", r"deixa eu (ver|pensar|analisar|conversar)", r"depois (eu )?(vejo|te falo|te chamo|falo|a gente)", r"(mais )?tarde (eu )?(vejo|te falo|te chamo)",
    r"outro dia", r"semana que vem", r"mes que vem", r"qualquer coisa (eu )?(te )?(aviso|chamo|falo)", r"te aviso", r"te chamo (depois|qualquer)", r"ligo depois",
    r"sem tempo", r"nao tenho tempo", r"to (muito )?corrido", r"estou (muito )?corrido", r"correria", r"agora nao (da|posso|consigo)", r"agora nao", r"no momento nao",
    r"manda (por )?(e ?mail|email|mais informac\w*|material|informac\w*)", r"me manda (por )?(e ?mail|email|mais|material|informac\w*)", r"envia (por )?(e ?mail|email|informac\w*)",
    r"vou ver (com|isso)", r"vou conversar (com|aqui)", r"qualquer coisa", r"talvez", r"quem sabe",
)
_SINAL_DE_COMPRA = (
    r"como (funciona|faco|fazemos|comeca|comecamos|e o processo|e que funciona|fica)", r"quanto tempo (leva|demora|fica pronto)", r"(qual|quais) (o |a )?(prazo|forma de pagamento|formas de pagamento)",
    r"(aceita|aceitam|tem) (pix|cartao|boleto|parcel\w*)", r"posso parcelar", r"parcela", r"como (eu )?pago", r"o que (eu )?preciso (mandar|enviar|fazer|ter)", r"quando (comeca|podemos comecar|pode comecar|fica pronto)",
    r"gostei", r"curti", r"ficou (muito )?(bom|bonito|lindo|legal|otimo|show|top)", r"achei (muito )?(bom|bonito|lindo|legal|otimo|interessante)", r"muito bom", r"adorei", r"amei",
    r"\bquero\b", r"vamos (sim|nessa|fechar|fazer|la)", r"pode (fazer|mandar|enviar|comecar|fechar|seguir)", r"fechado", r"bora", r"to dentro", r"estou dentro", r"tenho interesse", r"me interessa",
    r"(manda|mande|mandar|envia|envie|enviar|passa|passe|passar) (me )?(o |a |os |as )?(contrato|proposta|orcamento|pix|dados)", r"qual (o )?(pix|cnpj|valor final)",
)

_FUMACA_RE = re.compile("|".join(f"(?:{p})" for p in _FUMACA))
_COMPRA_RE = re.compile("|".join(f"(?:{p})" for p in _SINAL_DE_COMPRA))


def _normal(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode().lower()
    return " ".join(re.sub(r"[^a-z0-9? ]+", " ", t).split())


def cortina_de_fumaca(texto: str) -> bool:
    """Desculpa educada ("vou pensar", "manda por e-mail", "agora não"): não é o motivo verdadeiro, é preciso descobrir qual é."""
    t = _normal(texto)
    return bool(t) and len(t.split()) <= 40 and bool(_FUMACA_RE.search(t))


def sinal_de_compra(texto: str) -> bool:
    """Prazo, forma de pagamento, "gostei", "quero": a hora de parar de argumentar e facilitar o sim."""
    t = _normal(texto)
    t = re.sub(r"\bnao (quero|tenho interesse|me interessa|gostei|curti|achei|amei|adorei|vou|pode|fechado)\b", " ", t)   # a negação não é sinal de compra
    return bool(t) and bool(_COMPRA_RE.search(t))


def _ja_levantadas(sdr: Optional[Dict[str, Any]]) -> List[str]:
    return [str(o).lower() for o in ((sdr or {}).get("objecoes") or [])]


def bloco_do_momento(texto: str, sdr: Optional[Dict[str, Any]], vender: bool, quem: str) -> str:
    """Instruções para a fala de AGORA. Vazio quando nada de especial acontece (o método geral basta)."""
    if not texto:
        return ""
    ja = _ja_levantadas(sdr)
    # a objeção da fala atual ainda não está em "objecoes" (entra depois da resposta): se já houve uma desculpa evasiva antes, esta é a segunda
    fumaca_antes = any(re.search(r"fuma|pensar|tempo|depois|agora|momento|e-?mail|informa|talvez", o) for o in ja)
    repetiu = len(ja) != len(set(ja)) or (fumaca_antes and cortina_de_fumaca(texto))
    if sinal_de_compra(texto) and not cortina_de_fumaca(texto):
        passo = ("confirme escopo, preço do catálogo e forma de pagamento em uma frase e peça o ok para começar; aceitou, passe para o humano formalizar"
                 if vender else "confirme o que ele quer em uma frase, ofereça DOIS horários concretos (ou o link de agenda) e, confirmado, passe para o humano")
        return f"""== AGORA: SINAL DE COMPRA ==
Ele demonstrou prontidão. NÃO faça mais perguntas de descoberta, NÃO acrescente argumentos e NÃO repita benefícios. Responda o que ele perguntou em uma frase,
confirme o que entendeu ("então é isso que você quer: …") e facilite o sim com duas opções ("terça às 10h ou quarta às 15h?"). {passo}.
Tom: animado e calmo, sem pressa, sem comemorar demais.
"""
    if cortina_de_fumaca(texto):
        if repetiu:
            return f"""== AGORA: A DESCULPA VOLTOU ==
Ele já usou uma resposta evasiva antes. NÃO repita a pergunta de motivo nem o argumento: seria insistência. Faça UMA destas, a que combinar com a conversa:
(a) respeite e combine um único retorno leve, com permissão: "Sem problema! Posso te chamar na quinta só pra saber como ficou? Se não fizer sentido é só dizer.";
(b) com humildade, ofereça a saída: "Percebi que talvez não seja o momento, tudo bem! Prefere que eu pare por aqui ou que te chame mais pra frente?".
Se ele recusar de novo, despeça-se com cordialidade ("etapa": "perdido") e não volte a abordar.
"""
        return f"""== AGORA: DESCULPA EDUCADA (provável cortina de fumaça) ==
O que ele disse raramente é o motivo verdadeiro. Não aceite passivamente ("fico no aguardo") e não pressione. Em 2 mensagens curtas:
1) Acolha com leveza e sem pressa ("Claro, sem pressa nenhuma!").
2) Faça UMA pergunta calibrada, com opções que facilitam a sinceridade: "Só pra eu não te tomar tempo à toa: o que pesa mais pra você, o valor, o momento, ou ainda não
   ficou claro se funciona pro seu negócio?" (adapte ao que ele disse). Termine com a saída honrosa: "Se não for agora, tranquilo, é só me dizer."
Se ele pediu "manda por e-mail/informação": mande o essencial em 2 linhas e o link da prévia (se existir), e pergunte "o que você gostaria de ver nisso pra decidir?".
Quando ele responder o motivo real, trate SÓ ele: rotule ("então é mais o valor, certo?"), responda com um fato real e dê um passo pequeno.
Registre em "objecao" o tipo (ex.: "fumaça: vou pensar"). Quando ele disser o motivo e for algo que só {quem} resolve (negociar valor, condição), passe para o humano.
"""
    if repetiu:
        return """== AGORA: OBJEÇÃO REPETIDA ==
Esta objeção já apareceu. Repetir o mesmo argumento é insistência. Reconheça com humildade ("entendi, não vou insistir"), pergunte UMA vez se existe outra coisa que pesa
("tem algo que eu não estou enxergando?") ou ofereça a saída honrosa. Se ele reafirmar, despeça-se com cordialidade e marque "etapa": "perdido".
"""
    return ""
