"""Disparo da primeira mensagem pelo WhatsApp do proprio cliente.

O que a Meta permite, e o que este modulo respeita:

- A primeira mensagem para quem nunca escreveu so pode ser um modelo
  aprovado. Por isso o LeadSage cria o modelo na conta do cliente e so
  dispara depois da aprovacao.
- Exige consentimento. O cliente declara, a cada lote, que tem base para
  contatar aquelas pessoas; sem isso o disparo nem comeca.
- Quem pediu para sair, ou ja foi contatado, nunca recebe de novo.
- O modelo termina com a frase de saida. Quem responde abre a janela de
  24h e o robo passa a conversar como SDR.

Instagram e Messenger nao tem primeira mensagem na API: so respondem.
LinkedIn nao tem API de mensagens.
"""
import re
from typing import Any, Dict, List, Optional

from app import meta_canais, meta_oauth, pipeline_store, robo_store
from app.credit_system import BancoDeCreditosIndisponivel, add_credits, check_and_deduct_credits, is_admin

TAMANHO_LOTE = 20
CUSTO_DISPARO = 1

NOME_MODELO = "leadsage_abertura"
IDIOMA = "pt_BR"
# {{1}} quem fala, {{2}} a empresa dele, {{3}} o negocio do lead.
# Nao pode comecar nem terminar com variavel (regra da Meta).
CORPO_PADRAO = (
    "Olá! Aqui é {{1}}, da {{2}}. Vi a {{3}} no Google e tive uma ideia para "
    "melhorar a presença digital de vocês. Posso te contar em um minuto? "
    "Se preferir não receber mensagens, é só responder SAIR."
)
EXEMPLO = ["Ana", "LeadSage", "Padaria Favorita"]


def _auth(cfg: Dict[str, Any]) -> Dict[str, str]:
    return {"Authorization": f"Bearer {cfg.get('wa_token', '')}"}


def exige_whatsapp(cfg: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not cfg or not (cfg.get("wa_token") and cfg.get("wa_phone_id") and cfg.get("waba_id")):
        raise ValueError("Conecte o WhatsApp primeiro, na tela do Robô.")
    return cfg


async def status_modelo(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Estado do modelo na Meta: inexistente, PENDING, APPROVED ou REJECTED."""
    cfg = exige_whatsapp(cfg)
    dados = await meta_oauth.graph(
        "GET", f"{cfg['waba_id']}/message_templates", headers=_auth(cfg),
        params={"name": NOME_MODELO, "fields": "name,status,language,rejected_reason"},
    )
    for m in dados.get("data", []):
        if m.get("name") == NOME_MODELO:
            return {"existe": True, "status": m.get("status", ""), "motivo": m.get("rejected_reason") or ""}
    return {"existe": False, "status": "", "motivo": ""}


async def criar_modelo(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Cadastra o modelo de abertura na conta do cliente e manda para analise."""
    cfg = exige_whatsapp(cfg)
    atual = await status_modelo(cfg)
    if atual["existe"] and atual["status"] != "REJECTED":
        return atual
    try:
        await meta_oauth.graph(
            "POST", f"{cfg['waba_id']}/message_templates", headers=_auth(cfg),
            json={
                "name": NOME_MODELO, "language": IDIOMA, "category": "MARKETING",
                "components": [{"type": "BODY", "text": CORPO_PADRAO, "example": {"body_text": [EXEMPLO]}}],
            },
        )
    except meta_oauth.MetaRecusou as exc:
        raise ValueError(
            f"A Meta não aceitou criar o modelo: {exc}. Se a mensagem fala em permissão, "
            "reconecte o WhatsApp para liberar o gerenciamento de modelos."
        )
    return await status_modelo(cfg)


def texto_do_modelo(variaveis: List[str]) -> str:
    texto = CORPO_PADRAO
    for i, v in enumerate(variaveis, 1):
        texto = texto.replace("{{%d}}" % i, v)
    return texto


def normalizar_telefone(bruto: str) -> str:
    """Digitos com o codigo do pais. Lead brasileiro vem sem o 55 com frequencia."""
    d = re.sub(r"\D", "", bruto or "")
    if len(d) in (10, 11):
        d = "55" + d
    return d if 12 <= len(d) <= 15 else ""


async def disparar(
    uid: str, email: str, cfg: Dict[str, Any], perfil: Dict[str, Any], lead_ids: List[str],
    consentimento: bool,
) -> Dict[str, Any]:
    if not consentimento:
        raise ValueError("Confirme que as pessoas deste lote aceitaram receber contato antes de disparar.")
    cfg = exige_whatsapp(cfg)
    if not lead_ids:
        raise ValueError("Escolha ao menos um lead.")
    if len(lead_ids) > TAMANHO_LOTE:
        raise ValueError(f"Envie no máximo {TAMANHO_LOTE} por vez. A Meta libera mais conforme o número ganha reputação.")

    modelo = await status_modelo(cfg)
    if modelo["status"] != "APPROVED":
        raise ValueError(
            "O modelo de mensagem ainda não foi aprovado pela Meta."
            if modelo["existe"] else "Crie o modelo de mensagem antes de disparar."
        )

    quem = (cfg.get("nome_assistente") or perfil.get("name") or "a equipe").strip()
    empresa = (perfil.get("company_name") or "nossa equipe").strip()

    enviados: List[Dict[str, str]] = []
    ignorados: List[Dict[str, str]] = []
    falhas: List[Dict[str, str]] = []

    for lead_id in lead_ids:
        item = await pipeline_store.obter(uid, lead_id)
        if not item:
            ignorados.append({"id": lead_id, "motivo": "lead não encontrado no pipeline"})
            continue
        lead = item.get("lead") or {}
        nome = lead.get("company") or lead.get("name") or "Lead"
        contato = normalizar_telefone(lead.get("phone", ""))
        if not contato:
            ignorados.append({"id": lead_id, "nome": nome, "motivo": "sem telefone válido"})
            continue

        cid = robo_store.id_da_conversa("whatsapp", contato)
        antiga = await robo_store.obter_conversa(uid, cid)
        if antiga and antiga.get("optout"):
            ignorados.append({"id": lead_id, "nome": nome, "motivo": "pediu para não receber mensagens"})
            continue
        if antiga and antiga.get("mensagens"):
            ignorados.append({"id": lead_id, "nome": nome, "motivo": "já houve conversa com este número"})
            continue

        try:
            saldo = await check_and_deduct_credits(uid, CUSTO_DISPARO, email)
        except BancoDeCreditosIndisponivel:
            saldo = None
        if saldo is None:
            falhas.append({"id": lead_id, "nome": nome, "motivo": "sem créditos"})
            break

        variaveis = [quem, empresa, nome]
        try:
            meta_id = await meta_canais.enviar_modelo(cfg, contato, NOME_MODELO, IDIOMA, variaveis)
        except meta_canais.EnvioFalhou as exc:
            # nao cobra o que nao saiu
            if not is_admin(email):
                try:
                    await add_credits(uid, CUSTO_DISPARO, "Estorno: mensagem não entregue")
                except Exception:
                    pass
            falhas.append({"id": lead_id, "nome": nome, "motivo": str(exc)})
            # token invalido ou limite: insistir so piora
            if "token" in str(exc).lower() or "limite" in str(exc).lower():
                break
            continue

        agora = robo_store.agora()
        await robo_store.salvar_conversa(uid, {
            "id": cid, "canal": "whatsapp", "contato": contato, "nome": nome, "lead_id": lead_id,
            "robo_ativo": True, "optout": False, "precisa_humano": False, "motivo": "",
            "origem": "disparo", "criado": agora, "atualizado": agora,
            "sdr": {"etapa": "abertura", "temperatura": "frio"},
            "mensagens": [{"de": "robo", "texto": texto_do_modelo(variaveis), "em": agora, "meta_id": meta_id}],
        })
        await pipeline_store.mover(uid, lead_id, "Contato Enviado", motivo="primeira mensagem enviada pelo robô", por="robô")
        enviados.append({"id": lead_id, "nome": nome})

    return {"enviados": enviados, "ignorados": ignorados, "falhas": falhas}
