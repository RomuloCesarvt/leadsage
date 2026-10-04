"""Conexao com um clique: o que acontece entre o login e a primeira mensagem.

Separado de `meta_oauth` (que so fala com a Meta) para que as decisoes —
qual pagina fica, o que desligar ao trocar, para quem rotear uma mensagem
— possam ser testadas sem rede.
"""
from typing import Any, Dict, List, Tuple

from app import meta_oauth, robo_store


async def _canal(uid: str, email: str = "") -> Dict[str, Any]:
    """O canal do usuario, criado se ainda nao existir (gera o gancho)."""
    canal = await robo_store.canal_do_usuario(uid)
    if not canal:
        canal = await robo_store.salvar_canal(uid, email, {"ativo": False})
    return canal


async def lembrar_quem_autorizou(uid: str, meta_user_id: str) -> None:
    if not meta_user_id:
        return
    canal = await _canal(uid)
    canal["meta_user_id"] = meta_user_id
    await robo_store.substituir_canal(uid, canal)
    await robo_store.registrar_ativo("usuario_meta", meta_user_id, uid, canal["gancho"])


async def excluir_por_pedido_da_meta(meta_user_id: str) -> int:
    """A pessoa removeu o LeadSage da conta do Facebook: apaga o que veio dela.

    Sai tudo que a Meta nos deu — tokens, pagina, Instagram, WhatsApp — e
    as conversas recebidas por esses canais. Fica o que o usuario criou
    dentro do LeadSage (leads da busca, sites, propostas), que nao veio da
    Meta. Devolve quantas conversas foram apagadas.
    """
    canal = await robo_store.canal_por_ativo("usuario_meta", meta_user_id)
    if not canal:
        return 0
    uid = canal["uid"]
    await desconectar(uid, "facebook")
    await desconectar(uid, "whatsapp")
    apagadas = await robo_store.apagar_conversas(uid)
    canal = await _canal(uid)
    canal.pop("meta_user_id", None)
    await robo_store.substituir_canal(uid, canal)
    await robo_store.esquecer_ativo("usuario_meta", meta_user_id)
    return apagadas


async def guardar_paginas(uid: str, paginas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Depois do login: guarda as paginas autorizadas.

    Com uma pagina so, ja escolhe — perguntar "qual pagina?" com uma opcao
    e um passo a toa. Com varias, a tela pergunta.
    """
    canal = await _canal(uid)
    if len(paginas) == 1:
        canal["paginas_pendentes"] = paginas
        await robo_store.substituir_canal(uid, canal)
        return await escolher_pagina(uid, paginas[0]["id"])
    canal["paginas_pendentes"] = paginas
    return await robo_store.substituir_canal(uid, canal)


async def escolher_pagina(uid: str, page_id: str) -> Dict[str, Any]:
    canal = await _canal(uid)
    pagina = next((p for p in canal.get("paginas_pendentes") or [] if p.get("id") == page_id), None)
    if not pagina:
        raise LookupError("Essa página não está entre as autorizadas. Conecte de novo.")

    # Troca de pagina: a anterior para de mandar mensagens para nos.
    anterior = canal.get("page_id")
    if anterior and anterior != page_id:
        await meta_oauth.desassinar_pagina(anterior, canal.get("page_token", ""))
        await robo_store.esquecer_ativo("pagina", anterior)
        await robo_store.esquecer_ativo("instagram", canal.get("ig_id", ""))

    await meta_oauth.assinar_pagina(pagina["id"], pagina["token"])

    canal.update({
        "modo": "app",
        "page_id": pagina["id"],
        "page_token": pagina["token"],
        "page_nome": pagina.get("nome", ""),
        "ig_id": pagina.get("ig_id", ""),
        "ig_usuario": pagina.get("ig_usuario", ""),
    })
    # os tokens das outras paginas nao tem motivo para ficar guardados
    canal["paginas_pendentes"] = []
    await robo_store.substituir_canal(uid, canal)

    await robo_store.registrar_ativo("pagina", pagina["id"], uid, canal["gancho"])
    if pagina.get("ig_id"):
        await robo_store.registrar_ativo("instagram", pagina["ig_id"], uid, canal["gancho"])
    return canal


async def conectar_whatsapp(uid: str, email: str, dados: Dict[str, str]) -> Dict[str, Any]:
    canal = await _canal(uid, email)
    anterior = canal.get("wa_phone_id")
    if anterior and anterior != dados["wa_phone_id"]:
        await robo_store.esquecer_ativo("whatsapp", anterior)
    canal.update(dados)
    canal["modo"] = "app"
    await robo_store.substituir_canal(uid, canal)
    await robo_store.registrar_ativo("whatsapp", dados["wa_phone_id"], uid, canal["gancho"])
    return canal


async def desconectar(uid: str, alvo: str) -> Dict[str, Any]:
    canal = await _canal(uid)
    if alvo == "facebook":
        if canal.get("page_id"):
            await meta_oauth.desassinar_pagina(canal["page_id"], canal.get("page_token", ""))
            await robo_store.esquecer_ativo("pagina", canal["page_id"])
        await robo_store.esquecer_ativo("instagram", canal.get("ig_id", ""))
        for campo in ("page_id", "page_token", "page_nome", "ig_id", "ig_usuario", "paginas_pendentes"):
            canal.pop(campo, None)
    elif alvo == "whatsapp":
        await robo_store.esquecer_ativo("whatsapp", canal.get("wa_phone_id", ""))
        for campo in ("wa_token", "wa_phone_id", "waba_id", "wa_pin"):
            canal.pop(campo, None)
    else:
        raise ValueError("Escolha facebook ou whatsapp.")
    return await robo_store.substituir_canal(uid, canal)


# ------------------------------------------------------------ roteamento

def dividir_por_ativo(corpo: Dict[str, Any]) -> List[Tuple[str, str, Dict[str, Any]]]:
    """Separa o webhook do app em pedacos, um por pagina/conta/numero.

    Uma unica chamada da Meta pode trazer mensagens de varios clientes do
    LeadSage ao mesmo tempo. Cada pedaco mantem o formato original, para
    o mesmo leitor de eventos do modo manual servir aqui.
    """
    objeto = corpo.get("object")
    pedacos: List[Tuple[str, str, Dict[str, Any]]] = []

    for entrada in corpo.get("entry") or []:
        if objeto == "whatsapp_business_account":
            for mudanca in entrada.get("changes") or []:
                numero = ((mudanca.get("value") or {}).get("metadata") or {}).get("phone_number_id", "")
                if numero:
                    pedacos.append(("whatsapp", numero, {
                        "object": objeto, "entry": [{**entrada, "changes": [mudanca]}],
                    }))
        elif objeto in ("page", "instagram"):
            tipo = "pagina" if objeto == "page" else "instagram"
            if entrada.get("id"):
                pedacos.append((tipo, entrada["id"], {"object": objeto, "entry": [entrada]}))
    return pedacos
