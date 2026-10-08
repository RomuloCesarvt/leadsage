"""QA do cartao WhatsApp pelo computador (API simulada)."""
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
    medir.RESPOSTAS["/api/robo/conector/gerar"] = {**base, "conector_criado": True, "conector_prefixo": "lsc_AbCd", "chave": "lsc_" + "A" * 43}
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
            await pag.locator("button:has-text('Configurar')").first.click()
            await pag.wait_for_timeout(600)
            card = pag.locator("text=WhatsApp pelo computador").first
            if not await card.count(): problemas.append(f"{nome}: cartao nao apareceu"); continue
            await card.scroll_into_view_if_needed()
            btn = pag.locator("button:has-text('Gerar chave do Conector')")
            if await btn.is_enabled(): problemas.append(f"{nome}: botao deveria estar bloqueado sem o aceite")
            await pag.locator("text=Li o aviso").click()
            if not await btn.is_enabled(): problemas.append(f"{nome}: botao nao liberou depois do aceite")
            await btn.click()
            await pag.wait_for_timeout(500)
            if not await pag.locator("button:has-text('Baixar Conectar-WhatsApp.bat')").count(): problemas.append(f"{nome}: botao de download ausente")
            rol = await pag.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if rol > 0: problemas.append(f"{nome}: rolagem horizontal {rol}px")
            await card.scroll_into_view_if_needed()
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"conector_{nome}.png"))
            print(nome, "erros js:", erros)
            await ctx.close()
        await nav.close()
    print("PROBLEMAS:", problemas or "nenhum")
asyncio.run(main())
