"""O especialista do nicho: ao puxar um ramo, o LeadSage passa a saber como aquele mercado funciona.

Os guias escritos à mão cobrem os ramos mais comuns, mas o Google traz centenas ("Gastroenterologistas", "Clínicas de
vacinação", "Serralherias"). Sem guia, o robô ficava perdido: o site de uma clínica de gastro falava de "sorriso novo".

Aqui a IA escreve, UMA vez por ramo, uma ficha de especialista: o que o negócio faz, serviços típicos, como o cliente
decide, o que um site desse ramo precisa mostrar, a ação principal, a palavra certa para o cliente (paciente, tutor,
aluno...), os títulos de seção e a ética do setor. A ficha fica guardada no banco SQL (vale para todos os usuários e
para sempre) e entra no texto do site, na abordagem de WhatsApp e na conversa do robô.

Se a IA não responder, nada quebra: os guias escritos à mão continuam valendo.
"""
import asyncio
import re
import time
import unicodedata
from typing import Any, Dict, List, Optional

from app.config import settings

VERSAO = 1
SEGMENTOS_DO_MOTOR = (
    "pet", "doces", "comida", "barbearia", "estetica", "odonto", "mente", "saude", "juridico", "imoveis", "arquitetura", "oficina",
    "fitness", "educacao", "moda", "natureza", "tecnologia", "turismo", "eventos", "veiculos", "financeiro", "limpeza", "mercado", "generico",
)

_MEMORIA: Dict[str, Dict[str, Any]] = {}
_FALHOU: Dict[str, float] = {}       # ramo cuja ficha falhou agora: nao tenta de novo por alguns minutos
_ESPERA_APOS_FALHA_S = 300


def chave(nicho: Optional[str]) -> str:
    t = unicodedata.normalize("NFD", (nicho or "").lower())
    t = re.sub(r"[^a-z0-9 ]+", " ", "".join(c for c in t if unicodedata.category(c) != "Mn"))
    palavras = [p[:-1] if len(p) > 4 and p.endswith("s") else p for p in t.split()]   # "gastroenterologistas" = "gastroenterologista"
    return "-".join(palavras)[:80]


def _texto(v: Any, n: int) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()[:n]


def _lista(v: Any, n: int, tam: int) -> List[str]:
    return [_texto(x, tam) for x in (v if isinstance(v, list) else []) if _texto(x, tam)][:n]


def limpar(bruto: Dict[str, Any], nicho: str) -> Optional[Dict[str, Any]]:
    """Só o que tem forma de ficha entra; o resto é descartado (a IA às vezes devolve campo vazio ou de outro tipo)."""
    if not isinstance(bruto, dict):
        return None
    servicos = _lista(bruto.get("servicos_tipicos"), 8, 60)
    especialidade = _texto(bruto.get("especialidade"), 60)
    if not especialidade or len(servicos) < 3:
        return None
    titulos = bruto.get("titulos_de_secao") if isinstance(bruto.get("titulos_de_secao"), dict) else {}
    segmento = _texto(bruto.get("segmento"), 20).lower()
    return {
        "versao": VERSAO,
        "nicho": _texto(nicho, 80),
        "especialidade": especialidade,
        "segmento": segmento if segmento in SEGMENTOS_DO_MOTOR else "generico",
        "o_que_faz": _texto(bruto.get("o_que_faz"), 240),
        "publico": _texto(bruto.get("publico"), 30) or "cliente",
        "servicos_tipicos": servicos,
        "como_o_cliente_decide": _texto(bruto.get("como_o_cliente_decide"), 300),
        "dores": _lista(bruto.get("dores"), 5, 140),
        "objecoes": _lista(bruto.get("objecoes"), 4, 140),
        "o_que_o_site_precisa": _lista(bruto.get("o_que_o_site_precisa"), 6, 160),
        "acao_principal": _texto(bruto.get("acao_principal"), 30) or "Falar no WhatsApp",
        "titulos_de_secao": {k: _texto(titulos.get(k), 60) for k in ("servicos", "depoimentos", "chamada_final", "chamada_final_texto") if _texto(titulos.get(k), 60)},
        "tom": _texto(bruto.get("tom"), 160),
        "etica": _texto(bruto.get("etica"), 300),
        "nunca_dizer": _lista(bruto.get("nunca_dizer"), 6, 80),
        "melhor_horario_de_contato": _texto(bruto.get("melhor_horario_de_contato"), 120),
    }


def _prompt(nicho: str) -> str:
    return f"""Você é um consultor de marketing que já fez sites e campanhas para centenas de negócios do ramo "{nicho}" no Brasil.
Escreva a FICHA DE ESPECIALISTA desse ramo: o que alguém precisa saber para criar o site e abordar o dono como especialista.
Seja específico do ramo (nada que serviria para outro). Não invente estatística, preço nem lei.

RETORNO: JSON puro com as chaves:
- "especialidade": o nome do ramo no singular, como o cliente fala (ex.: "Gastroenterologia", "Padaria", "Pet shop")
- "segmento": UM destes ids: {", ".join(SEGMENTOS_DO_MOTOR)}. Médicos de qualquer especialidade e clínicas = saude; dentista = odonto;
  psicologia e terapias = mente; estética e salão = estetica; advocacia, contabilidade e consultoria = juridico
- "o_que_faz": uma frase sobre o que esse negócio resolve para o cliente
- "publico": como chamar quem compra (paciente, cliente, tutor, aluno, hóspede...)
- "servicos_tipicos": 6 a 8 serviços que esse ramo REALMENTE oferece, com o nome que o cliente procura no Google (ex. gastro: endoscopia, colonoscopia, refluxo e azia...)
- "como_o_cliente_decide": o que pesa na escolha (confiança, convênio, preço, urgência, indicação...)
- "dores": 3 a 5 dores do DONO do negócio que um site resolve
- "objecoes": 3 objeções típicas do dono quando recebe uma proposta de site
- "o_que_o_site_precisa": 4 a 6 itens que um site desse ramo precisa mostrar para converter
- "acao_principal": o texto do botão principal (ex.: "Agendar consulta", "Fazer pedido", "Pedir orçamento")
- "titulos_de_secao": objeto com "servicos" (título da seção de serviços), "depoimentos", "chamada_final" (pergunta curta) e "chamada_final_texto"
- "tom": o tom de voz que combina (ex.: sereno e técnico, caloroso, direto)
- "etica": regras do conselho ou do setor que o site e a mensagem precisam respeitar (ex. CFM: sem promessa de cura nem antes e depois)
- "nunca_dizer": 3 a 6 palavras ou ideias que soam erradas nesse ramo (ex. clínica médica: "sorriso", "barato", "garantido")
- "melhor_horario_de_contato": quando o dono costuma responder mensagens
"""


async def _ler_banco(k: str) -> Optional[Dict[str, Any]]:
    try:
        from sqlalchemy import select

        from app.database import AsyncSessionLocal, DBRobo

        async with AsyncSessionLocal() as s:
            row = (await s.execute(select(DBRobo).where(DBRobo.chave == f"nicho:{k}"))).scalar_one_or_none()
            return dict(row.data or {}) if row else None
    except Exception as exc:
        print(f"Especialista: não leu a ficha de {k}: {type(exc).__name__}")
        return None


async def _gravar_banco(k: str, ficha: Dict[str, Any]) -> None:
    try:
        from sqlalchemy import select

        from app.database import AsyncSessionLocal, DBRobo

        async with AsyncSessionLocal() as s:
            row = (await s.execute(select(DBRobo).where(DBRobo.chave == f"nicho:{k}"))).scalar_one_or_none()
            if row:
                row.data = ficha
                row.atualizado = str(int(time.time()))
            else:
                s.add(DBRobo(chave=f"nicho:{k}", uid="_global", tipo="nicho", data=ficha, atualizado=str(int(time.time()))))
            await s.commit()
    except Exception as exc:
        print(f"Especialista: não gravou a ficha de {k}: {type(exc).__name__}")


async def _gerar(nicho: str) -> Optional[Dict[str, Any]]:
    if not settings.GEMINI_API_KEY:
        return None
    from app.ai_client import TIMEOUT_LONGO_MS, build_client, gerar_json

    cliente = build_client(settings.GEMINI_API_KEY, TIMEOUT_LONGO_MS)
    bruto = await asyncio.to_thread(gerar_json, cliente, _prompt(nicho), ["especialidade", "servicos_tipicos"], 2, time.monotonic() + 25, True, 1500)
    return limpar(bruto, nicho)


async def garantir(nicho: Optional[str]) -> Optional[Dict[str, Any]]:
    """A ficha do ramo: da memória, do banco ou escrita agora pela IA (e guardada). Nunca levanta erro."""
    k = chave(nicho)
    if not k:
        return None
    if k in _MEMORIA:
        return _MEMORIA[k]
    ficha = await _ler_banco(k)
    if ficha and ficha.get("versao") == VERSAO:
        _MEMORIA[k] = ficha
        return ficha
    if time.monotonic() - _FALHOU.get(k, -1e9) < _ESPERA_APOS_FALHA_S:
        return None
    try:
        ficha = await _gerar(str(nicho))
    except Exception as exc:
        print(f"Especialista: a IA não escreveu a ficha de {nicho}: {type(exc).__name__}: {str(exc)[:80]}")
        ficha = None
    if not ficha:
        _FALHOU[k] = time.monotonic()
        return None
    _MEMORIA[k] = ficha
    await _gravar_banco(k, ficha)
    return ficha


def da_memoria(nicho: Optional[str]) -> Optional[Dict[str, Any]]:
    """Sem rede e sem esperar: a ficha que já foi carregada neste processo (quem é síncrono usa esta)."""
    return _MEMORIA.get(chave(nicho))


def bloco(ficha: Optional[Dict[str, Any]]) -> str:
    """A ficha em texto, para entrar nos pedidos à IA (site, abordagem e conversa)."""
    if not ficha:
        return ""
    t = ficha.get("titulos_de_secao") or {}
    linhas = [
        f"ESPECIALISTA NESTE RAMO: {ficha['especialidade']} (fale com o dono como quem entende do negócio dele)",
        f"- O que o negócio resolve: {ficha.get('o_que_faz', '')}",
        f"- Quem compra é chamado de: {ficha.get('publico', 'cliente')}",
        f"- Serviços típicos (use os nomes que o cliente procura; nunca serviços de outro ramo): {', '.join(ficha['servicos_tipicos'])}",
        f"- Como o {ficha.get('publico', 'cliente')} decide: {ficha.get('como_o_cliente_decide', '')}",
    ]
    if ficha.get("dores"):
        linhas.append(f"- Dores do dono que um site resolve (confirme, não afirme): {'; '.join(ficha['dores'])}")
    if ficha.get("objecoes"):
        linhas.append(f"- Objeções típicas do dono: {'; '.join(ficha['objecoes'])}")
    if ficha.get("o_que_o_site_precisa"):
        linhas.append(f"- Um site deste ramo precisa mostrar: {'; '.join(ficha['o_que_o_site_precisa'])}")
    linhas.append(f"- Ação principal do site: {ficha.get('acao_principal', '')}")
    if t:
        linhas.append("- Títulos de seção que funcionam: " + "; ".join(f"{k}: {v}" for k, v in t.items()))
    if ficha.get("tom"):
        linhas.append(f"- Tom de voz: {ficha['tom']}")
    if ficha.get("etica"):
        linhas.append(f"- Ética do setor (obrigatória): {ficha['etica']}")
    if ficha.get("nunca_dizer"):
        linhas.append(f"- NUNCA use neste ramo: {', '.join(ficha['nunca_dizer'])}")
    return "\n".join(linhas)
