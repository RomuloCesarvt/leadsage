"""Quem fala nas mensagens: o NOME de quem usa o sistema, o cargo e a empresa DELE.

O LeadSage é usado por várias pessoas, cada uma com o seu negócio (uma agência, um estúdio, um consultor...). A mensagem tem de sair
como "Rômulo, consultor estratégico da Seometria Marketing Digital", e não com o nome do sistema. A pessoa define isso em
Robô → Como ele conversa (campos "Seu nome", "Seu cargo" e "Sua empresa"); se deixar vazio, vale o cadastro do perfil.
"""
from typing import Any, Dict, Optional


def _t(v: Any, limite: int = 80) -> str:
    return str(v or "").strip()[:limite]


def da_conta(cfg: Optional[Dict[str, Any]], perfil: Optional[Any]) -> Dict[str, Any]:
    """{nome, cargo, empresa, apresentacao, configurada}. `perfil` pode ser dict ou o objeto do perfil.

    `apresentacao` é a frase para se apresentar ("Rômulo, consultor estratégico da Seometria Marketing Digital"); vazia se não há
    nada para dizer (os textos usam então o jeito neutro de sempre, nunca o nome do sistema)."""
    cfg = cfg or {}

    def do_perfil(campo: str) -> str:
        if isinstance(perfil, dict):
            return _t(perfil.get(campo))
        return _t(getattr(perfil, campo, ""))

    nome = _t(cfg.get("meu_nome")) or do_perfil("name")
    cargo = _t(cfg.get("meu_cargo"))
    empresa = _t(cfg.get("minha_empresa")) or do_perfil("company_name")
    configurada = bool(_t(cfg.get("meu_nome")) or _t(cfg.get("meu_cargo")) or _t(cfg.get("minha_empresa")))

    ligacao = "" if not empresa else (" " if empresa.lower().startswith(("da ", "do ", "de ", "na ", "no ")) else " da ")
    if nome and cargo and empresa:
        apresentacao = f"{nome}, {cargo}{ligacao}{empresa}"
    elif nome and cargo:
        apresentacao = f"{nome}, {cargo}"
    elif nome and empresa:
        apresentacao = f"{nome} {'da ' if ligacao == ' da ' else ''}{empresa}"
    elif empresa:
        apresentacao = f"a equipe{ligacao}{empresa}"
    else:
        apresentacao = nome
    return {"nome": nome, "cargo": cargo, "empresa": empresa, "apresentacao": apresentacao.strip(), "configurada": configurada}
