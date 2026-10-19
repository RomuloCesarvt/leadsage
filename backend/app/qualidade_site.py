"""Avaliação de uma prévia de site ANTES de ela ser publicada ou enviada.

Uma prévia ruim custa a venda: o dono do negócio abre o link, vê um site genérico, com nome estranho ou com assunto de outro
ramo, e a conversa acaba. Por isso nada sai sem passar por aqui. A avaliação é de regras (não gasta IA, não demora, não falha):

  bloqueia  -> o site NÃO é publicado nem enviado (o robô chama o dono em vez de mandar um link ruim)
  avisa     -> o site sai, mas o problema fica registrado

O que bloqueia:
  * texto de molde que sobrou ("[Seu Nome]", "Lorem", "undefined", "{{...}}", marcador de link);
  * página quase vazia, ou sem nenhum jeito de chamar o negócio (WhatsApp/telefone);
  * assunto de OUTRO ramo no texto (sorriso/dentista num site de padaria, oficina num site de clínica...);
  * lead sem dados reais: só o nome que a pessoa usa no WhatsApp, sem endereço, nota, descrição do Google nem texto escrito
    pela IA. O motor monta então uma página de molde, igual para todos, e foi isso que gerou o "mesmo site" para vários leads.
"""
import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple


def _sem_acento(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn").lower()


# Assuntos que só fazem sentido em UM ramo. Só entram palavras inequívocas: um falso alarme impede um site bom de sair.
GRUPOS: Dict[str, Dict[str, Any]] = {
    "saude_bucal": {
        "ramo": r"dent|odont|ortodont|sorriso|implante",
        "marcas": r"\b(?:dentista|dentistas|odontolog\w*|ortodont\w*|clareamento dental|implantes? dentari\w*|canal dent\w*|sorriso novo)\b",
    },
    "gastronomia": {
        "ramo": r"padaria|confeit|pizz|hamburg|lanchon|restaurant|cafe|cafeteria|doceria|bolo|churrasc|sorvet|marmit|gastro|bar\b",
        "marcas": r"\b(?:cardapio|fornada\w*|encomenda de bolos?|paes? (?:quentes?|frescos?)|salgados|bolos e (?:tortas|doces|salgados)|padaria|confeitaria|hamburguer\w*|pizzaria)\b",
    },
    "oficina": {
        "ramo": r"oficina|mecanic|auto ?center|funilaria|borracharia|auto ?pecas",
        "marcas": r"\b(?:oficina mecanica|troca de oleo|freios?|suspensao|alinhamento e balanceamento|revisao do carro|funilaria)\b",
    },
    "pet": {
        "ramo": r"\bpet\b|veterin|banho e tosa|petshop",
        "marcas": r"\b(?:banho e tosa|veterinari\w*|petshop|seu pet|seu cachorro|seu gato)\b",
    },
    "beleza": {
        "ramo": r"salao|cabeleir|manicure|barbear|estetic|beleza|sobrancelha",
        "marcas": r"\b(?:manicure|cabeleireir\w*|escova progressiva|barbearia|design de sobrancelhas?|depilacao)\b",
    },
    "academia": {
        "ramo": r"academia|crossfit|pilates|musculacao|personal",
        "marcas": r"\b(?:musculacao|crossfit|treino personalizado|personal trainer|aulas de pilates)\b",
    },
    "advocacia": {
        "ramo": r"advog|juridic|escritorio de advocacia",
        "marcas": r"\b(?:advogad\w*|causas trabalhistas|direito (?:civil|penal|trabalhista|de familia)|oab)\b",
    },
}

MOLDE = re.compile(
    r"\[(?:seu|sua|nome|link|cidade|empresa|telefone)[^\]]{0,30}\]|lorem ipsum|\bundefined\b|\bnull\b|\bnan\b|\{\{|\}\}|\[object ",
    re.I,
)


def texto_visivel(html: str) -> str:
    h = re.sub(r"(?is)<(script|style|noscript|template)\b.*?</\1>", " ", html or "")
    h = re.sub(r"(?s)<!--.*?-->", " ", h)
    h = re.sub(r"<[^>]+>", " ", h)
    h = (h.replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", '"').replace("&#39;", "'"))
    return re.sub(r"\s+", " ", h).strip()


def grupo_do_lead(lead: Dict[str, Any]) -> str:
    """O ramo do lead entre os que a avaliação conhece ('' se nenhum: a checagem de assunto não roda)."""
    base = _sem_acento(" ".join(str(lead.get(k) or "") for k in ("niche", "role", "company", "name", "google_description")))
    for nome, g in GRUPOS.items():
        if re.search(g["ramo"], base):
            return nome
    return ""


def _tem_dados_reais(lead: Dict[str, Any], copia_ia: Optional[Dict[str, Any]]) -> bool:
    if copia_ia:
        return True
    for k in ("address", "location", "google_description", "review_highlight", "rating", "rating_count",
              "opening_hours", "opening_hours_week", "instagram", "socials", "email"):
        if lead.get(k) not in (None, "", [], {}):
            return True
    return False


def _nome_ruim(nome: str) -> bool:
    n = _sem_acento(nome).strip()
    if len(n) < 3:
        return True
    return n in {"prévia", "previa", "teste", "site", "undefined", "null", "empresa", "meu negocio", "sem nome"}


def avaliar(html: str, lead: Optional[Dict[str, Any]] = None, copia_ia: Optional[Dict[str, Any]] = None,
            completo: bool = True) -> Tuple[List[str], List[str]]:
    """Devolve (bloqueios, avisos). `completo=False` avalia só o HTML (quando não se conhece o lead, como no site salvo pelo navegador)."""
    lead = lead or {}
    bloqueios: List[str] = []
    avisos: List[str] = []
    texto = texto_visivel(html)
    plano = _sem_acento(texto)

    if len(texto) < 600:
        bloqueios.append(f"a página tem pouco conteúdo ({len(texto)} letras)")
    m = MOLDE.search(texto)
    if m:
        bloqueios.append(f"sobrou texto de molde na página: «{m.group(0)[:30]}»")
    if not re.search(r"wa\.me/|api\.whatsapp\.com|tel:|whatsapp", html or "", re.I):
        bloqueios.append("a página não tem WhatsApp nem telefone para chamar o negócio")

    if completo:
        nome = str(lead.get("company") or lead.get("name") or "")
        if _nome_ruim(nome):
            bloqueios.append("o lead não tem um nome de negócio válido")
        if str(lead.get("id") or "").startswith("in_") and not _tem_dados_reais(lead, copia_ia):
            bloqueios.append("o lead só tem o nome do WhatsApp (sem endereço, nota, descrição ou texto próprio): o site sairia genérico")
        elif not _tem_dados_reais(lead, copia_ia):
            avisos.append("sem dados do Google nem texto da IA: o site usa o texto padrão do ramo")

        proprio = grupo_do_lead(lead)
        if proprio:
            for nome_g, g in GRUPOS.items():
                if nome_g == proprio:
                    continue
                achou = re.search(g["marcas"], plano)
                if achou:
                    bloqueios.append(f"assunto de outro ramo ({nome_g.replace('_', ' ')}): «{achou.group(0)}» num site de {proprio.replace('_', ' ')}")
                    break
    return bloqueios, avisos


def resumo(bloqueios: List[str]) -> str:
    return "; ".join(bloqueios)[:300]
