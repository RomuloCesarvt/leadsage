"""QA da aba Disparos (fila de envio com revisao). API simulada."""
import asyncio, os, sys
from playwright.async_api import async_playwright
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import medir

def item(i, nome, canal, status, texto, **kw):
    return {"id": f"f_{i}", "lead_id": f"L{i}", "nome": nome, "canal": canal, "assunto": kw.pop("assunto", ""), "link": "", "texto": texto,
            "status": status, "criado": "2026-10-07T10:00:00", **kw}

ITENS = [
 item("a", "Padaria Flor do Lageado", "whatsapp", "rascunho", "Olá! Vi que a Padaria Flor do Lageado tem nota 4,4 com 1.411 avaliações no Google, mas quem procura no celular não encontra um site para encomendar. Posso te mostrar um esboço pronto?"),
 item("b", "Clínica Sorriso Pleno", "email", "rascunho", "Olá!\n\nVi o perfil da Clínica Sorriso Pleno: o último post foi há 120 dias.\n\n—\nSe preferir não receber mais mensagens, é só responder SAIR.", assunto="Ideia para a Clínica"),
 item("c", "Academia Corpo em Ação", "whatsapp", "rascunho", "Oi! Tenho uma ideia para trazer mais alunos pela internet. Posso mostrar?"),
 item("d", "Auto Center Rodrigues", "whatsapp", "pendente", "Olá, tudo bem? Vi o Auto Center Rodrigues no Google."),
 item("e", "Studio Bella Pele", "whatsapp", "falhou", "Oi! Posso mostrar uma ideia?", motivo="Esse número não está no WhatsApp."),
]
RES = {"rascunhos": 3, "pendentes": 1, "aguardando_limite": 0, "enviados": 0, "email_hoje": 0, "limite_email_dia": 40, "email_restante": 40}

async def main():
    medir.RESPOSTAS["/api/robo/fila"] = {"itens": ITENS, "resumo": RES}
    medir.RESPOSTAS["/api/robo/fila/f_a"] = {**ITENS[0], "texto": "Texto corrigido por mim", "editado": True}
    medir.RESPOSTAS["/api/robo/fila/aprovar"] = {"resultados": [], "resumo": RES}
    medir.RESPOSTAS["/api/robo/fila/descartar"] = {"descartadas": 1, "resumo": RES}
    medir.RESPOSTAS["/api/robo/conector/fila"] = {"conectado": True, "online": True, "pendentes": 1, "enviando": 0, "enviadas_hoje": 3, "limite_hoje": 10,
                                                   "espera_s": 0, "motivo": "A próxima sai em instantes."}
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=medir.EDGE, headless=True)
        for nome, w, h in [("desktop", 1440, 900), ("celular", 390, 844)]:
            ctx = await nav.new_context(viewport={"width": w, "height": h})
            await medir.preparar(ctx)
            pag = await ctx.new_page()
            erros = []
            pag.on("pageerror", lambda e: erros.append(str(e)[:160]))
            await medir.ir_para(pag, "Fila de envio", w)
            await pag.wait_for_timeout(1500)
            texto = await pag.inner_text("body")
            ok = {k: (k in texto) for k in ["Disparos", "Para revisar (3)", "3 marcada(s)", "Editar mensagem", "Descartar", "Hoje: 3 de 10"]}
            # desmarcar a segunda e conferir a contagem
            caixas = pag.locator("article input[type=checkbox]")
            await caixas.nth(1).dispatch_event("click")
            await pag.wait_for_timeout(300)
            ok["2 marcada(s) depois de desmarcar"] = "2 marcada(s)" in await pag.inner_text("body")
            # editar a primeira: o campo nao pode perder o foco a cada tecla
            await pag.locator("button:has-text('Editar mensagem')").first.dispatch_event("click")
            area = pag.locator("article textarea").first
            await area.click()
            await area.press("Control+End")
            await pag.keyboard.type(" XYZ", delay=20)
            ok["campo mantem o foco e o texto"] = (await area.input_value()).endswith(" XYZ")
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"disparos_edicao_{nome}.png"), full_page=True)
            await pag.locator("button:has-text('Salvar')").first.dispatch_event("click")
            await pag.wait_for_timeout(500)
            ok["salvou"] = "Texto corrigido por mim" in await pag.inner_text("body")
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"disparos_{nome}.png"), full_page=True)
            m = await pag.evaluate(medir.MEDIDOR)
            print(nome, {k: v for k, v in ok.items() if not v} or "tudo certo", "| rolagem horizontal:", m["rolagemHorizontal"], "vaza:", m["vaza"], "erros:", erros)
            if m["rolagemHorizontal"]:
                culpados = await pag.evaluate("""() => [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0; }).slice(0, 8).map(e => e.tagName + '.' + String(e.className).slice(0, 60) + ' ' + Math.round(e.getBoundingClientRect().right))""")
                print("  passam da borda:", culpados)
            await ctx.close()
        await nav.close()
asyncio.run(main())
