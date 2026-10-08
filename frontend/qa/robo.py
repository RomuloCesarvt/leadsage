"""QA da tela do robo reorganizada: Canais, Comportamento, Testar (API simulada)."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import medir


async def main():
    problemas = []
    base = dict(medir.RESPOSTAS["/api/robo/config"])
    base.update({"conector_criado": False, "conector_online": False, "conector_prefixo": "", "conector_numero": "", "conector_frio_hoje": 0, "conector_frio_limite": 5})
    medir.RESPOSTAS["/api/robo/config"] = base
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=medir.EDGE, headless=True)
        for nome, w, h in [("desktop", 1280, 900), ("celular", 390, 844)]:
            ctx = await nav.new_context(viewport={"width": w, "height": h})
            async def api(route):
                caminho = route.request.url.split("localhost:5198")[-1].split("?")[0]
                await route.fulfill(status=200, content_type="application/json", body=json.dumps(medir.RESPOSTAS.get(caminho, {})))
            await ctx.route("**/api/**", api)
            pag = await ctx.new_page()
            erros = []
            pag.on("pageerror", lambda e: erros.append(str(e)[:160]))
            await medir.ir_para(pag, "Robô de Atendimento", w)
            await pag.wait_for_timeout(800)
            tabs = await pag.locator("button:has-text('Canais'), button:has-text('Comportamento'), button:has-text('Testar')").count()
            if tabs < 3: problemas.append(f"{nome}: abas")
            if await pag.locator("button:has-text('Disparo WhatsApp')").count(): problemas.append(f"{nome}: sobrou a aba Disparo")
            if not await pag.locator("text=pelo computador").count(): problemas.append(f"{nome}: sem o cartao do WhatsApp")
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"robo_canais_{nome}.png"), full_page=True)
            await pag.locator("button:has-text('Comportamento')").first.click(); await pag.wait_for_timeout(600)
            if not await pag.get_by_label("Ligar o robô").count(): problemas.append(f"{nome}: sem o interruptor do robo")
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"robo_comportamento_{nome}.png"), full_page=True)
            await pag.locator("button:has-text('Testar')").first.click(); await pag.wait_for_timeout(400)
            rol = await pag.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if rol > 0: problemas.append(f"{nome}: rolagem horizontal {rol}px")
            print(nome, "erros js:", erros)
            await ctx.close()
        await nav.close()
    print("PROBLEMAS:", problemas or "nenhum")
asyncio.run(main())
