"""Capturas dos sites gerados (qa/saida/sites/*.html), rolando como uma pessoa rola.

As animacoes de rolagem dependem do scroll de verdade; por isso a captura e feita por telas, rolando devagar,
e depois montada numa folha de contato (varias telas lado a lado) para conferir o conjunto de uma vez.

Uso: python qa/sites.py [id ...] [celular]
"""
import asyncio, io, os, sys
from PIL import Image
from playwright.async_api import async_playwright

AQUI = os.path.dirname(os.path.abspath(__file__))
PASTA = os.path.join(AQUI, "saida", "sites")
EDGE = r"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"


async def main(ids, larg, alt, sufixo):
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=EDGE, headless=True)
        ctx = await nav.new_context(viewport={"width": larg, "height": alt})
        for arq in sorted(os.listdir(PASTA)):
            if not arq.endswith(".html"):
                continue
            id_ = arq[:-5]
            if ids and id_ not in ids:
                continue
            pag = await ctx.new_page()
            erros = []
            pag.on("pageerror", lambda e: erros.append(str(e)[:120]))
            await pag.goto("file:///" + os.path.join(PASTA, arq).replace("\\", "/"), wait_until="load")
            await pag.wait_for_timeout(3200)  # carregamento e titulo palavra por palavra
            h = await pag.evaluate("document.documentElement.scrollHeight")
            telas, y = [], 0
            while y < h:
                await pag.evaluate(f"window.scrollTo(0,{y})")
                await pag.wait_for_timeout(1100)  # deixa a revelacao terminar
                telas.append(Image.open(io.BytesIO(await pag.screenshot())).convert("RGB"))
                y += int(alt * 0.92)
            sobra = await pag.evaluate("document.documentElement.scrollWidth - innerWidth")
            # folha de contato: ate 4 telas por faixa, cada faixa num arquivo
            esc = 560 / larg if larg > 600 else 0.62
            tw, th = int(larg * esc), int(alt * esc)
            por_folha = 4 if larg > 600 else 6
            for n, ini in enumerate(range(0, len(telas), por_folha)):
                grupo = telas[ini:ini + por_folha]
                folha = Image.new("RGB", (tw * len(grupo) + 6 * (len(grupo) - 1), th), (30, 30, 30))
                for i, im in enumerate(grupo):
                    folha.paste(im.resize((tw, th)), (i * (tw + 6), 0))
                folha.save(os.path.join(PASTA, f"{id_}_{sufixo}_{n + 1}.png"))
            print(id_, sufixo, "altura", h, "telas", len(telas), "rolagem horizontal:", sobra, "erros:", erros)
            await pag.close()
        await nav.close()


ids = [a for a in sys.argv[1:] if a != "celular"]
if "celular" in sys.argv:
    asyncio.run(main(ids, 390, 844, "cel"))
else:
    asyncio.run(main(ids, 1440, 900, "desk"))
