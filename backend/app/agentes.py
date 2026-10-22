"""Quem atende cada lead: o jeito do robô, ou você.

No pipeline, cada cartão pode ter um "agente" escolhido pelo dono. É o que a tela "Gerenciar agente" grava:
  * robo         o robô padrão (o comportamento configurado em Robô → Comportamento);
  * consultivo   o robô com ritmo calmo, que pergunta antes de propor;
  * direto       o robô objetivo, de mensagens curtas, que leva ao próximo passo;
  * humano       o robô NÃO responde esse lead: quem atende é o dono.
"""
from typing import Dict, Optional

PADRAO = "robo"

AGENTES: Dict[str, Dict[str, str]] = {
    "robo": {"rotulo": "Robô padrão", "descricao": "Atende como está configurado em Robô → Comportamento.", "instrucao": ""},
    "consultivo": {
        "rotulo": "Robô consultivo",
        "descricao": "Pergunta antes de propor e conduz com calma. Bom para quem decide devagar.",
        "instrucao": "Conduza de forma CONSULTIVA: faça uma pergunta de cada vez para entender o cenário antes de propor qualquer coisa, "
                     "reconheça o que a pessoa disse e não apresse o próximo passo.",
    },
    "direto": {
        "rotulo": "Robô direto",
        "descricao": "Mensagens curtas e foco no próximo passo. Bom para quem tem pouco tempo.",
        "instrucao": "Seja DIRETO: mensagens curtas (uma ou duas frases), sem rodeio, e termine sempre propondo o próximo passo concreto "
                     "(ver a prévia, marcar um horário). Não repita o que a pessoa já sabe.",
    },
    "humano": {
        "rotulo": "Eu atendo",
        "descricao": "O robô não responde este lead. Você conversa pelo WhatsApp.",
        "instrucao": "",
    },
}


def valido(agente: Optional[str]) -> str:
    """O id do agente, ou "" quando não existe."""
    a = (agente or "").strip().lower()
    return a if a in AGENTES else ""


def instrucao(agente: Optional[str]) -> str:
    return AGENTES.get(valido(agente), {}).get("instrucao", "")


def rotulo(agente: Optional[str]) -> str:
    return AGENTES[valido(agente) or PADRAO]["rotulo"]


def atende_o_robo(agente: Optional[str]) -> bool:
    """False só para "humano": os outros perfis são jeitos do robô conversar."""
    return valido(agente) != "humano"
