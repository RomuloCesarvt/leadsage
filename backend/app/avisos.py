"""Central de avisos: o que o dono precisa saber agora, montado do que o sistema já registra.

Nada é gravado aqui. Os avisos nascem de duas fontes que já existem:

- **prévias abertas** (`previa_abertura`): o lead abriu o site que mandamos, ou voltou a ver. É o melhor momento para chamar;
- **conversas do robô**: o lead pediu uma pessoa, ou respondeu.

Quem pediu para sair e conversa de robô/propaganda nunca viram aviso.
"""
from typing import Any, Dict, List

LIMITE = 50


def _aviso(id_: str, tipo: str, titulo: str, texto: str, quando: str, **extra: Any) -> Dict[str, Any]:
    return {"id": id_, "tipo": tipo, "titulo": titulo, "texto": texto, "quando": quando, **extra}


def _da_previa(a: Dict[str, Any]) -> Dict[str, Any] | None:
    quando = str(a.get("ultima") or "")
    if not quando:
        return None
    nome = (a.get("empresa") or "").strip() or "Um lead"
    visitas = int(a.get("visitas") or 1)
    if visitas > 1:
        titulo = f"{nome} voltou a ver a prévia"
        texto = f"É a {visitas}ª visita ao site que você mandou: interesse de verdade. Bom momento para chamar."
    else:
        titulo = f"{nome} abriu a prévia do site"
        texto = "Acabou de ver o site que você mandou. Se ainda não respondeu, uma mensagem curta agora costuma funcionar."
    return _aviso(f"previa:{a.get('slug', '')}:{quando}", "previa", titulo, texto, quando, lead_id=str(a.get("lead_id") or ""))


def _da_conversa(c: Dict[str, Any]) -> Dict[str, Any] | None:
    if c.get("optout") or c.get("contato_robo"):
        return None
    quando = str(c.get("atualizado") or "")
    if not quando:
        return None
    nome = (c.get("nome") or "").strip() or str(c.get("contato") or "") or "Um lead"
    base = {"conversa_id": str(c.get("id") or ""), "lead_id": str(c.get("lead_id") or "")}
    if c.get("precisa_humano"):
        return _aviso(f"humano:{c.get('id', '')}:{quando}", "humano", f"{nome} precisa de você",
                      str(c.get("motivo") or "O robô passou a conversa para uma pessoa."), quando, **base)
    ultima = c.get("ultima") or ((c.get("mensagens") or [None])[-1])
    if ultima and ultima.get("de") == "contato":
        trecho = " ".join(str(ultima.get("texto") or "").split())[:140]
        return _aviso(f"resposta:{c.get('id', '')}:{ultima.get('em') or quando}", "resposta", f"{nome} respondeu",
                      trecho or "Mandou uma mensagem.", str(ultima.get("em") or quando), **base)
    return None


def montar(aberturas: List[Dict[str, Any]], conversas: List[Dict[str, Any]], limite: int = LIMITE, reunioes_marcadas: List[Dict[str, Any]] | None = None) -> List[Dict[str, Any]]:
    """Os avisos, do mais recente para o mais antigo."""
    from app import reunioes
    das_reunioes = [a for item in (reunioes_marcadas or []) for a in reunioes.avisos_da_reuniao(item)]
    avisos = [x for x in [*(_da_previa(a) for a in aberturas), *(_da_conversa(c) for c in conversas), *das_reunioes] if x]
    avisos.sort(key=lambda a: a["quando"], reverse=True)
    return avisos[:limite]


def nao_lidos(avisos: List[Dict[str, Any]], visto_ate: str) -> int:
    """Quantos são mais novos que a última vez que o dono abriu a central."""
    return sum(1 for a in avisos if a["quando"] > (visto_ate or ""))
