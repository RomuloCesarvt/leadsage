"""O espaço de trabalho de cada modo da conta.

Uma conta pode ter os dois modos (agência e empresa) e as informações não podem se misturar: leads, pipeline, buscas, conversas, robô,
fila e visitas de um modo nunca aparecem no outro. Cada modo é um espaço dentro da mesma conta:

  - agência  -> a chave de sempre ("<uid>"): o que já existe continua exatamente onde está, nada é movido;
  - empresa  -> "<uid>~empresa".

O que é da CONTA (perfil, plano, créditos, cotas) continua com o uid verdadeiro: as funções de crédito e de perfil chamam `conta()`
na entrada, então até um código que receba a chave do espaço cobra e consulta a conta certa.
"""
SEPARADOR = "~"
MODOS_COM_ESPACO_PROPRIO = ("empresa",)


def conta(uid: str) -> str:
    """O uid da conta, sem o sufixo do espaço."""
    return str(uid or "").split(SEPARADOR, 1)[0]


def do_modo(uid: str, modo: str) -> str:
    """A chave de armazenamento do espaço: agência = uid puro; empresa = uid~empresa."""
    base = conta(uid)
    return f"{base}{SEPARADOR}{modo}" if modo in MODOS_COM_ESPACO_PROPRIO and base else base


def modo_do_espaco(chave: str) -> str:
    resto = str(chave or "").split(SEPARADOR, 1)
    return resto[1] if len(resto) == 2 and resto[1] in MODOS_COM_ESPACO_PROPRIO else "agencia"
