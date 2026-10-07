"""QA do editor de envio (modal): abre pelo Perfil do Lead, gera, troca tom e canal (API simulada)."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import medir

PITCH = {"lead_id": "R0", "subject": "Padaria Doce Vida no Google", "body": "Boa tarde, Ana! Tudo bem?\n\nEu sou da Sites Já e ajudo negócios locais a serem encontrados no Google.\n\nVi que a Padaria Doce Vida tem nota 4,8 com 212 avaliações, mas não tem site no perfil. Posso te mostrar como ficaria?",
         "tone": "Consultivo", "placeholders": {}, "channel": "email", "hook": "nota 4,8 e sem site", "reasoning": "encomenda que vai para quem aparece no Google",
         "follow_ups": [{"quando": "3 dias depois", "objetivo": "dar valor", "texto": "Passando para deixar uma ideia: o cardápio no celular."}], "warnings": []}


async def main():
    medir.RESPOSTAS["/api/generate-pitch"] = PITCH
    problemas = []
    lead = {"id": "R0", "name": "Ana Souza", "avatar": "", "role": "Dona", "niche": "Padaria", "company": "Padaria Doce Vida", "location": "Botucatu, SP", "city": "Botucatu",
            "email": "ana@doce.com", "phone": "551499800400", "whatsapp": True, "socials": {"instagram": "docevida"}, "quality_score": 70, "verified": True,
            "outreach_status": "Pendente", "opportunityScore": 60, "rating": 4.8, "rating_count": 212, "best_channel": "email", "salvo": True}
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=medir.EDGE, headless=True)
        for nome, w, h in [("desktop", 1280, 800), ("celular", 390, 844)]:
            ctx = await nav.new_context(viewport={"width": w, "height": h})
            await ctx.add_init_script("localStorage.setItem('LEADSAGE_LEADS', %s)" % json.dumps(json.dumps([lead])))
            async def api(route):
                caminho = route.request.url.split("localhost:5198")[-1].split("?")[0]
                await route.fulfill(status=200, content_type="application/json", body=json.dumps(medir.RESPOSTAS.get(caminho, {})))
            await ctx.route("**/api/**", api)
            pag = await ctx.new_page()
            erros = []
            pag.on("pageerror", lambda e: erros.append(str(e)[:160]))
            await medir.ir_para(pag, "Meus Leads", w)
            await pag.locator("tbody tr").first.click()
            await pag.wait_for_timeout(600)
            btn = pag.locator("button:has-text('Disparar')").first
            await btn.click()
            await pag.wait_for_timeout(800)
            dlg = pag.get_by_role("dialog")
            if not await dlg.count(): problemas.append(f"{nome}: modal nao abriu"); continue
            txt = await pag.get_by_label("Texto da mensagem").input_value()
            if "Padaria Doce Vida" not in txt: problemas.append(f"{nome}: mensagem nao carregou")
            if not await dlg.locator("text=ana@doce.com").count(): problemas.append(f"{nome}: destinatario nao aparece")
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"envio_{nome}.png"))
            await dlg.locator("button:has-text('Gerar outra versão')").click(); await pag.wait_for_timeout(500)
            await dlg.locator("button:has-text('Direto')").click(); await pag.wait_for_timeout(500)
            await dlg.locator("button:has-text('WhatsApp')").first.click(); await pag.wait_for_timeout(300)
            if not await dlg.locator("button:has-text('Abrir WhatsApp')").count(): problemas.append(f"{nome}: botao do canal nao mudou")
            await dlg.locator("button:has-text('Pedir um ajuste')").click(); await pag.wait_for_timeout(200)
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"envio_{nome}_ajuste.png"))
            rolagem = await pag.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if rolagem > 0: problemas.append(f"{nome}: rolagem horizontal {rolagem}px")
            print(nome, "erros js:", erros)
            await ctx.close()
        await nav.close()
    print("PROBLEMAS:", problemas or "nenhum")
asyncio.run(main())
