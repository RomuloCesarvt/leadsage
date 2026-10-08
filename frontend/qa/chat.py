"""QA do chat do WhatsApp (Conector simulado em 127.0.0.1:2790 + API simulada)."""
import asyncio, json, os, sys, threading, time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import unquote, urlparse
from playwright.async_api import async_playwright
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import medir

AGORA = int(time.time())
CHATS = [
    {"id": "5514998003784@c.us", "nome": "Padaria Doce Vida", "grupo": False, "telefone": "5514998003784", "naoLidas": 2, "quando": AGORA - 60, "ultima": {"texto": "Quanto custa o site?", "minha": False}},
    {"id": "5514998003785@c.us", "nome": "Clínica Sorriso", "grupo": False, "telefone": "5514998003785", "naoLidas": 0, "quando": AGORA - 3600, "ultima": {"texto": "Posso te ligar amanhã?", "minha": True}},
    {"id": "5514911112222@c.us", "nome": "Mãe", "grupo": False, "telefone": "5514911112222", "naoLidas": 0, "quando": AGORA - 90000, "ultima": {"texto": "Bença", "minha": False}},
    {"id": "1203630@g.us", "nome": "Família", "grupo": True, "telefone": "", "naoLidas": 5, "quando": AGORA - 200, "ultima": {"texto": "[imagem]", "minha": False}},
]
MENS = {
    "5514998003784@c.us": [
        {"id": "m1", "texto": "Boa tarde! Eu sou o Rômulo. Montei uma prévia do site da Padaria Doce Vida.", "minha": True, "quando": AGORA - 400, "tipo": "text", "midia": False, "status": 3},
        {"id": "m2", "texto": "Oi! Quanto custa o site?", "minha": False, "quando": AGORA - 60, "tipo": "text", "midia": False, "status": 0},
    ],
}
MUITAS = [{"id": f"x{i}", "texto": f"Mensagem número {i} " + ("com texto um pouco mais longo " * (i % 4)), "minha": i % 3 == 0, "quando": AGORA - (400 - i) * 60, "tipo": "text", "midia": False, "status": 3} for i in range(400)]
CHATS.append({"id": "5514955556666@c.us", "nome": "Conversa longa", "grupo": False, "telefone": "5514955556666", "naoLidas": 0, "quando": AGORA - 10, "ultima": {"texto": "fim", "minha": False}})
for _i in range(90):
    CHATS.append({"id": f"55149{_i:08d}@c.us", "nome": f"Contato {_i}", "grupo": False, "telefone": f"55149{_i:08d}", "naoLidas": 0, "quando": AGORA - 5000 - _i * 100, "ultima": {"texto": f"mensagem {_i}", "minha": False}})
ENVIADAS = []


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _cors(self):
        o = self.headers.get("Origin", "")
        if o:
            self.send_header("Access-Control-Allow-Origin", o)
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "content-type")

    def _json(self, d, st=200):
        b = json.dumps(d).encode()
        self.send_response(st); self._cors(); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        u = urlparse(self.path); partes = [p for p in u.path.split("/") if p]
        if u.path == "/estado": return self._json({"fase": "pronto", "qr": "", "mensagem": "ok", "numero": "5514999990000"})
        if partes == ["chats"]: return self._json({"chats": CHATS})
        if len(partes) == 3 and partes[2] == "mensagens":
            from urllib.parse import parse_qs
            lim = int((parse_qs(u.query).get("limite") or ["60"])[0])
            todas = MUITAS if unquote(partes[1]).startswith("5514955556666") else MENS.get(unquote(partes[1]), [])
            return self._json({"mensagens": todas[-lim:]})
        self._json({"erro": "?"}, 404)

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0); corpo = json.loads(self.rfile.read(n) or b"{}")
        partes = [p for p in urlparse(self.path).path.split("/") if p]
        if len(partes) == 3 and partes[2] == "enviar":
            m = {"id": f"n{len(ENVIADAS)}", "texto": corpo["texto"], "minha": True, "quando": int(time.time()), "tipo": "text", "midia": False, "status": 1}
            ENVIADAS.append(m); MENS.setdefault(unquote(partes[1]), []).append(m)
            return self._json({"mensagem": m})
        self._json({"ok": True})


async def main():
    srv = HTTPServer(("127.0.0.1", 2791), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    problemas = []
    medir.RESPOSTAS["/api/robo/conversas"] = [{"id": "whatsapp_5514998003784", "canal": "whatsapp", "contato": "5514998003784", "nome": "Padaria Doce Vida", "lead_id": "", "robo_ativo": True,
        "optout": False, "precisa_humano": False, "motivo": "", "atualizado": "2026-10-07T21:00:00", "ultima": None, "total": 2, "origem": "robo", "aguardando": False}]
    medir.RESPOSTAS["/api/robo/conversas/whatsapp_5514998003784/robo"] = {"ok": True}
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=medir.EDGE, headless=True)
        for nome, w, h in [("desktop", 1280, 800), ("celular", 390, 844)]:
            ctx = await nav.new_context(viewport={"width": w, "height": h})
            chamadas = []
            await ctx.add_init_script("localStorage.setItem('LEADSAGE_CONECTOR_URL', 'http://127.0.0.1:2791')")
            async def api(route):
                caminho = route.request.url.split("localhost:5198")[-1].split("?")[0]
                chamadas.append((route.request.method, caminho))
                await route.fulfill(status=200, content_type="application/json", body=json.dumps(medir.RESPOSTAS.get(caminho, {})))
            await ctx.route("**/api/**", api)
            pag = await ctx.new_page()
            erros = []
            pag.on("pageerror", lambda e: erros.append(str(e)[:160]))
            await medir.ir_para(pag, "Conversas", w)
            await pag.wait_for_timeout(900)
            n = await pag.locator("button:has(p.truncate)").count()
            if n != 94: problemas.append(f"{nome}: esperava 94 conversas de pessoas (sem o grupo), vieram {n}")
            await pag.get_by_role("tab", name="Não lidas").click(); await pag.wait_for_timeout(200)
            if await pag.locator("button:has(p.truncate)").count() != 1: problemas.append(f"{nome}: filtro nao lidas")
            await pag.get_by_role("tab", name="Com o robô").click(); await pag.wait_for_timeout(200)
            if await pag.locator("button:has(p.truncate)").count() != 1: problemas.append(f"{nome}: filtro com o robo")
            await pag.get_by_role("tab", name="Grupos").click(); await pag.wait_for_timeout(200)
            if await pag.locator("button:has-text('Família')").count() != 1: problemas.append(f"{nome}: grupos")
            await pag.get_by_role("tab", name="Todas").click()
            await pag.locator("button:has-text('Padaria Doce Vida')").first.click(); await pag.wait_for_timeout(900)
            if not await pag.locator("text=Quanto custa o site?").count(): problemas.append(f"{nome}: mensagens nao abriram")
            if not await pag.locator("button:has-text('Robô respondendo')").count(): problemas.append(f"{nome}: faltou o botao do robo")
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"chat_{nome}.png"))
            # responder pelo chat: envia pelo conector e pausa o robo
            await pag.get_by_label("Mensagem").fill("Custa a partir de R$ 997. Posso te mostrar?")
            await pag.get_by_label("Mensagem").press("Enter"); await pag.wait_for_timeout(900)
            if not ENVIADAS: problemas.append(f"{nome}: nao enviou pelo conector")
            if not any(m == "POST" and c.endswith("/robo") for m, c in chamadas): problemas.append(f"{nome}: nao pausou o robo ao assumir")
            if not await pag.locator("text=Você assumiu esta conversa").count(): problemas.append(f"{nome}: faltou o aviso de que assumiu")
            # a lista de contatos rola com a roda do mouse
            if w > 800:
                lista_el = pag.locator("button:has(p.truncate)").first
                box = await lista_el.bounding_box()
                antes = await pag.evaluate("() => { const b = document.querySelector('button p.truncate').closest('div.overflow-y-auto'); return b.scrollTop; }")
                await pag.mouse.move(box["x"] + 100, box["y"] + 20)
                await pag.mouse.wheel(0, 900); await pag.wait_for_timeout(400)
                depois = await pag.evaluate("() => { const b = document.querySelector('button p.truncate').closest('div.overflow-y-auto'); return { st: b.scrollTop, sh: b.scrollHeight, ch: b.clientHeight }; }")
                if depois["st"] <= antes: problemas.append(f"{nome}: a lista de contatos nao rolou {depois}")
                await pag.mouse.wheel(0, -2000); await pag.wait_for_timeout(200)
            # conversa longa: o campo de digitar tem de ficar a vista e so a lista de mensagens rola
            if w > 800:
                await pag.get_by_label("Buscar conversa").fill("longa"); await pag.wait_for_timeout(300)
                await pag.locator("button:has-text('Conversa longa')").first.click(); await pag.wait_for_timeout(1200)
                caixa = await pag.get_by_label("Mensagem").bounding_box()
                if not caixa or caixa["y"] + caixa["height"] > h + 1: problemas.append(f"{nome}: o campo de digitar saiu da tela ({caixa})")
                info = await pag.evaluate("""() => { const p = document.querySelector('[data-painel=mensagens]'); return { sh: p.scrollHeight, ch: p.clientHeight, st: p.scrollTop, pagina: document.documentElement.scrollHeight - innerHeight, balaos: p.querySelectorAll('.rounded-xl').length }; }""")
                if info["sh"] <= info["ch"] * 2: problemas.append(f"{nome}: a lista de mensagens nao rola por dentro {info}")
                if info["sh"] - info["st"] - info["ch"] > 5: problemas.append(f"{nome}: nao abriu no fim da conversa {info}")
                if info["pagina"] > 40: problemas.append(f"{nome}: a pagina inteira rola ({info['pagina']}px)")
                await pag.screenshot(path=os.path.join(medir.SAIDA, f"chat_{nome}_longa.png"))
                await pag.locator("button:has-text('Ver mensagens anteriores')").click(); await pag.wait_for_timeout(1500)
                info2 = await pag.evaluate("() => { const p = document.querySelector('[data-painel=mensagens]'); return { balaos: p.querySelectorAll('.rounded-xl').length }; }")
                if info2["balaos"] <= info["balaos"]: problemas.append(f"{nome}: 'ver anteriores' nao trouxe mais mensagens")
            rol = await pag.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if rol > 0: problemas.append(f"{nome}: rolagem horizontal {rol}px")
            await pag.screenshot(path=os.path.join(medir.SAIDA, f"chat_{nome}_enviado.png"))
            print(nome, "erros js:", erros)
            ENVIADAS.clear()
            await ctx.close()
        await nav.close()
    srv.shutdown()
    print("PROBLEMAS:", problemas or "nenhum")
asyncio.run(main())
