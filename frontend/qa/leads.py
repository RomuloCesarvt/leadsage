"""QA do fluxo Resultados -> Meus Leads, filtros e limpar historico (API simulada)."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import medir

NICHOS = ["Padaria", "Padaria", "Pet shop", "Pet shop", "Academia", "Academia", "Dentista", "Dentista"]
CIDADES = ["Botucatu", "Botucatu", "Botucatu", "Bauru", "Bauru", "Botucatu", "Bauru", "Botucatu"]


def lista():
    out = []
    for i in range(8):
        out.append({"id": f"R{i}", "name": f"Negócio {i}", "avatar": "", "role": "", "niche": NICHOS[i], "company": f"Empresa {NICHOS[i]} {i}",
                    "location": f"{CIDADES[i]}, SP", "city": CIDADES[i], "email": "", "phone": f"551499800{4000+i}", "whatsapp": i % 2 == 0,
                    "socials": {}, "quality_score": 70, "verified": True, "outreach_status": "Pendente", "opportunityScore": 40 + i * 8,
                    "missingDigitalAssets": ["website"] if i % 2 else [], "salvo": False})
    out.append({"id": "S1", "name": "Salvo Um", "avatar": "", "role": "", "niche": "Padaria", "company": "Padaria Salva", "location": "Botucatu, SP", "city": "Botucatu",
                "email": "", "phone": "5514998005000", "whatsapp": True, "socials": {}, "quality_score": 80, "verified": True, "outreach_status": "Pendente", "salvo": True, "pipeline_stage": "Novo Lead"})
    return out


async def main():
    medir.RESPOSTAS["/api/history"] = [{"id": "h1", "niche": "Padaria", "location": "Botucatu", "resultsFound": 8, "timestamp": "2026-10-07T10:00:00"}]
    medir.RESPOSTAS["/api/pipeline/sync"] = {"novos": 3}
    medir.RESPOSTAS["/api/robo/fila"] = {"itens": [], "resumo": {"pendentes": 0, "aguardando_limite": 0, "enviados": 0, "email_hoje": 0, "limite_email_dia": 40, "email_restante": 40}}
    problemas = []
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=medir.EDGE, headless=True)
        ctx = await nav.new_context(viewport={"width": 1440, "height": 900})
        await ctx.add_init_script("localStorage.setItem('LEADSAGE_LEADS', %s)" % json.dumps(json.dumps(lista())))
        async def api(route):
            caminho = route.request.url.split("localhost:5198")[-1].split("?")[0]
            await route.fulfill(status=200, content_type="application/json", body=json.dumps(medir.RESPOSTAS.get(caminho, {})))
        await ctx.route("**/api/**", api)
        pag = await ctx.new_page()
        erros = []
        pag.on("pageerror", lambda e: erros.append(str(e)[:160]))
        pag.on("dialog", lambda d: asyncio.ensure_future(d.accept()))

        async def contar():
            return await pag.locator("tbody tr").count()

        # 1) Resultados mostram so os nao escolhidos
        await medir.ir_para(pag, "Resultados", 1440)
        n = await contar()
        if n != 8: problemas.append(f"resultados deveriam ser 8, vieram {n}")

        # 2) selecionar duas linhas e adicionar pela barra
        caixas = pag.locator("tbody input[type=checkbox]")
        await caixas.nth(0).check(); await caixas.nth(1).check()
        await pag.wait_for_timeout(300)
        texto = await pag.locator("text=2 selecionados").count()
        if not texto: problemas.append("barra de selecionados nao apareceu")
        await pag.screenshot(path=os.path.join(medir.SAIDA, "leads_resultados.png"))
        await pag.locator("button:has-text('Adicionar a Meus Leads')").first.click()
        await pag.wait_for_timeout(500)
        n = await contar()
        if n != 6: problemas.append(f"depois de adicionar 2, restam 6 resultados, vieram {n}")

        # 3) estrela adiciona um
        await pag.locator("button[title='Adicionar a Meus Leads']").first.click()
        await pag.wait_for_timeout(400)
        if await contar() != 5: problemas.append("estrela nao adicionou o lead")

        # 4) filtro de empresa e de nicho nos resultados
        await pag.get_by_label("Buscar empresa").fill("pet")
        await pag.wait_for_timeout(200)
        n = await contar()
        if not 0 < n < 5: problemas.append(f"filtro de empresa nao filtrou ({n})")
        await pag.get_by_label("Buscar empresa").fill("")
        await pag.get_by_label("Filtrar por nicho").select_option("Academia")
        await pag.wait_for_timeout(200)
        n = await contar()
        if n < 1: problemas.append("filtro de nicho nao mostrou nada")
        await pag.get_by_label("Filtrar por nicho").select_option("")

        # 5) selecionar todos
        await pag.get_by_label("Selecionar todos").check()
        await pag.wait_for_timeout(200)
        marcados = await pag.locator("tbody input[type=checkbox]:checked").count()
        if marcados != await contar(): problemas.append("selecionar todos nao marcou tudo")
        await pag.get_by_label("Selecionar todos").uncheck()

        # 6) Meus Leads: 1 salvo + 3 adicionados = 4; filtro de nicho; favorito
        await pag.locator("aside button:has-text('Meus Leads')").first.dispatch_event("click")
        await pag.wait_for_timeout(700)
        n = await contar()
        if n != 4: problemas.append(f"Meus Leads deveria ter 4, tem {n}")
        await pag.get_by_label("Filtrar por nicho").select_option("Padaria")
        await pag.wait_for_timeout(200)
        n = await contar()
        if n < 1: problemas.append("filtro de nicho em Meus Leads nao funcionou")
        await pag.get_by_label("Filtrar por nicho").select_option("")
        await pag.locator("button[title='Favoritar']").first.click()
        await pag.wait_for_timeout(200)
        await pag.locator("button:has-text('Favoritos')").first.click()
        await pag.wait_for_timeout(200)
        if await contar() != 1: problemas.append("favorito nao filtrou")
        await pag.locator("button:has-text('Favoritos')").first.click()
        await pag.locator("tbody input[type=checkbox]").first.check()
        await pag.wait_for_timeout(200)
        await pag.screenshot(path=os.path.join(medir.SAIDA, "leads_meus.png"))
        if not await pag.locator("button:has-text('Enviar para contato')").count(): problemas.append("sem botao Enviar para contato")

        # 7) enviar para contato abre o robo na fila
        await pag.locator("button:has-text('Enviar para contato')").first.click()
        await pag.wait_for_timeout(800)
        if not await pag.locator("text=O robô prepara a abordagem").count(): problemas.append("robo nao abriu na Fila de envio")

        # 8) historico: limpar
        await pag.locator("aside button:has-text('Histórico')").first.dispatch_event("click")
        await pag.wait_for_timeout(500)
        pag.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
        if not await pag.locator("button:has-text('Limpar histórico')").count(): problemas.append("sem botao Limpar historico")
        else:
            medir.RESPOSTAS["/api/history"] = []
            await pag.locator("button:has-text('Limpar histórico')").click()
            await pag.wait_for_timeout(600)
            if await pag.locator("text=Nenhuma busca realizada").count() == 0: problemas.append("historico nao limpou na tela")
        await pag.screenshot(path=os.path.join(medir.SAIDA, "leads_historico.png"))
        print("erros js:", erros)
        await nav.close()
    print("PROBLEMAS:", problemas or "nenhum")
asyncio.run(main())
