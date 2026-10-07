"""QA da aba Fila de envio do robo (API simulada)."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import medir

ITENS = [
 {"id": "f_a", "lead_id": "L0", "nome": "Padaria Flor do Lageado", "canal": "whatsapp", "assunto": "", "link": "https://wa.me/5514998003000?text=Oi",
  "texto": "Olá! Vi que a Padaria Flor do Lageado tem nota 4,4 com 1.411 avaliações no Google, mas quem procura no celular não encontra um site para encomendar. Posso te mostrar um esboço pronto?",
  "status": "pendente", "criado": "2026-10-07T10:00:00", "seguimentos": [{"quando": "em 2 dias", "texto": "Passando para saber se viu o esboço."}]},
 {"id": "f_b", "lead_id": "L1", "nome": "Clínica Sorriso Pleno", "canal": "instagram_direct", "assunto": "", "link": "https://ig.me/m/clinica",
  "texto": "Oi! Vi o perfil da Clínica Sorriso Pleno: o último post foi há 120 dias. Tenho uma ideia para trazer mais pacientes.", "status": "pendente", "criado": "2026-10-07T10:00:00"},
 {"id": "f_c", "lead_id": "L2", "nome": "Academia Corpo em Ação", "canal": "email", "assunto": "Ideia para a Academia", "link": "",
  "texto": "Olá!\n\nVi a Academia Corpo em Ação...\n\n—\nSe preferir não receber mais mensagens, é só responder SAIR.", "status": "aguardando_limite",
  "motivo": "limite de 40 e-mails por dia atingido; envie amanhã", "criado": "2026-10-07T10:00:00"},
 {"id": "f_d", "lead_id": "L3", "nome": "Auto Center Rodrigues", "canal": "email", "assunto": "x", "link": "", "texto": "x", "status": "enviado",
  "enviado_por": "robô", "enviado_em": "2026-10-07T10:00:00", "criado": "2026-10-07T10:00:00"},
]
RES = {"pendentes": 2, "aguardando_limite": 1, "enviados": 1, "email_hoje": 40, "limite_email_dia": 40, "email_restante": 0}

async def main():
    medir.RESPOSTAS["/api/robo/fila"] = {"itens": ITENS, "resumo": RES}
    medir.RESPOSTAS["/api/robo/fila/preparar"] = {"resultados": [
        {"lead_id": "L0", "nome": "Padaria Flor", "canal": "email", "resultado": "enviado", "motivo": ""},
        {"lead_id": "L4", "nome": "Studio Bella Pele", "canal": "whatsapp", "resultado": "na fila", "motivo": ""}], "resumo": RES}
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=medir.EDGE, headless=True)
        for nome, w, h in [("desktop", 1440, 900), ("celular", 390, 844)]:
            ctx = await nav.new_context(viewport={"width": w, "height": h})
            await medir.preparar(ctx)
            pag = await ctx.new_page()
            erros = []
            pag.on("pageerror", lambda e: erros.append(str(e)[:160]))
            await medir.ir_para(pag, "Robô de Atendimento", w)
            await pag.locator("button:has-text('Fila de envio')").first.dispatch_event("click")
            await pag.wait_for_timeout(1200)
            lis = pag.locator("label input[type=checkbox]")
            for i in range(min(await lis.count(), 3)):
                await lis.nth(i).dispatch_event("click")
            await pag.wait_for_timeout(300)
            await pag.locator("button:has-text('Preparar')").first.dispatch_event("click")
            await pag.wait_for_timeout(1500)
            m = await pag.evaluate(medir.MEDIDOR)
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"fila_{nome}.png"), full_page=True)
            print(nome, "rolagem horizontal:", m["rolagemHorizontal"], "vaza:", m["vaza"], "erros:", erros)
            await ctx.close()
        await nav.close()
asyncio.run(main())
