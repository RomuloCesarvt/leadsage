"""QA da caixa de entrada: filtro por canal e situacao, busca, conversa do robo e abordagem aguardando (API simulada)."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import medir


def resumo(id, canal, nome, contato, de, texto, **extra):
    base = {"id": id, "canal": canal, "contato": contato, "nome": nome, "lead_id": "", "robo_ativo": True, "optout": False,
            "precisa_humano": False, "motivo": "", "atualizado": "2026-10-07T21:00:00", "ultima": {"de": de, "texto": texto, "em": "2026-10-07T21:00:00"},
            "total": 2, "origem": "robo", "aguardando": False}
    base.update(extra)
    return base


LISTA = [
    resumo("whatsapp_1", "whatsapp", "Padaria Doce Vida", "5514998003784", "contato", "Quanto custa o site?"),
    resumo("whatsapp_2", "whatsapp", "Clínica Sorriso", "5514998003785", "robo", "Posso te ligar amanhã?", precisa_humano=True, motivo="pediu desconto"),
    resumo("instagram_1", "instagram", "studio.bela", "17841400", "contato", "Oi, vi o link"),
    resumo("envio:L1", "email", "Pet Shop Amigo Fiel", "contato@petamigo.com", "voce", "Assunto: Sobre a loja", id_extra=1, aguardando=True, origem="envio", total=1, robo_ativo=False),
    resumo("envio:L2", "whatsapp", "Auto Center Silva", "5514911112222", "voce", "Boa tarde! Montei uma prévia.", aguardando=True, origem="envio", total=1, robo_ativo=False),
    resumo("telegram_1", "telegram", "Carlos", "555", "contato", "Olá", optout=True, robo_ativo=False),
]


def conversa(r):
    c = {k: v for k, v in r.items() if k not in ("ultima", "total")}
    c["mensagens"] = [r["ultima"]]
    if r["origem"] == "envio":
        c["somente_leitura"] = True
    return c


async def main():
    problemas = []
    medir.RESPOSTAS["/api/robo/conversas"] = LISTA
    for r in LISTA:
        medir.RESPOSTAS[f"/api/robo/conversas/{r['id']}"] = conversa(r)
        medir.RESPOSTAS[f"/api/robo/conversas/{r['id'].replace(':', '%3A')}"] = conversa(r)
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=medir.EDGE, headless=True)
        for nome, w, h in [("desktop", 1280, 800), ("celular", 390, 844)]:
            ctx = await nav.new_context(viewport={"width": w, "height": h})
            async def api(route):
                caminho = route.request.url.split("localhost:5198")[-1].split("?")[0]
                await route.fulfill(status=200, content_type="application/json", body=json.dumps(medir.RESPOSTAS.get(caminho, {})))
            await ctx.route("**/api/**", api)
            pag = await ctx.new_page()
            erros = []
            pag.on("pageerror", lambda e: erros.append(str(e)[:160]))
            await medir.ir_para(pag, "Conversas", w)
            await pag.wait_for_timeout(500)

            async def itens():
                return await pag.locator("button:has(p.truncate)").count()

            n = await itens()
            if n != 6: problemas.append(f"{nome}: esperava 6 conversas, vieram {n}")

            await pag.get_by_role("tab", name="WhatsApp").click(); await pag.wait_for_timeout(200)
            if await itens() != 3: problemas.append(f"{nome}: filtro WhatsApp deveria mostrar 3, mostrou {await itens()}")
            await pag.get_by_role("tab", name="E-mail").click(); await pag.wait_for_timeout(200)
            if await itens() != 1: problemas.append(f"{nome}: filtro E-mail deveria mostrar 1")
            await pag.get_by_role("tab", name="Todas").click()
            await pag.get_by_label("Filtrar por situação").select_option("aguardando"); await pag.wait_for_timeout(200)
            if await itens() != 2: problemas.append(f"{nome}: 'aguardando resposta' deveria ter 2, tem {await itens()}")
            await pag.get_by_label("Filtrar por situação").select_option("precisa"); await pag.wait_for_timeout(200)
            if await itens() != 1: problemas.append(f"{nome}: 'precisa de voce' deveria ter 1")
            await pag.get_by_label("Filtrar por situação").select_option("todas")
            await pag.get_by_label("Buscar conversa").fill("silva"); await pag.wait_for_timeout(200)
            if await itens() != 1: problemas.append(f"{nome}: busca por 'silva' deveria achar 1")
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"conversas_{nome}_busca.png"))

            # abre a abordagem aguardando: somente leitura
            await pag.locator("button:has-text('Auto Center Silva')").first.click(); await pag.wait_for_timeout(500)
            if await pag.locator("textarea").count(): problemas.append(f"{nome}: abordagem aguardando nao deveria ter caixa de resposta")
            if not await pag.locator("text=Quando Auto Center Silva responder").count(): problemas.append(f"{nome}: faltou o aviso de aguardando")
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"conversas_{nome}_aguardando.png"))

            rol = await pag.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if rol > 0: problemas.append(f"{nome}: rolagem horizontal {rol}px")
            print(nome, "erros js:", erros)
            await ctx.close()
        await nav.close()
    print("PROBLEMAS:", problemas or "nenhum")
asyncio.run(main())
