"""QA do painel de perfil do lead: abre, gera o dossiê (simulado) e fotografa.

Uso: python qa/perfil.py   (servidor de QA na porta 5198)
"""
import asyncio, io, json, os, sys
from playwright.async_api import async_playwright

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
SAIDA = os.path.join(AQUI, "saida")
EDGE = r"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
URL = "http://localhost:5198/"

RAIOX = {
    "place_id": "ChIJqaaaaaaaaaa", "do_cache": False, "gerado_em": "2026-10-06T12:00:00",
    "gmn": {"nome": "Clínica Veterinária 24 horas VETPlus", "categoria": "Veterinário", "nota": 4.8, "avaliacoes": 213, "aberto": True,
            "descricao": "", "resumo_avaliacoes": "Clientes elogiam o atendimento rápido e a equipe atenciosa. Alguns citam demora na recepção à noite.",
            "completude": 60, "link_avaliacoes": "https://g.co/x", "link_fotos": "https://g.co/y", "link_perfil": "https://g.co/z",
            "itens": [{"item": "Site próprio", "ok": False, "detalhe": "sem site no perfil"}, {"item": "Telefone", "ok": True, "detalhe": ""},
                      {"item": "Horário de funcionamento", "ok": True, "detalhe": ""}, {"item": "Descrição do negócio", "ok": False, "detalhe": "o perfil não tem descrição"},
                      {"item": "Fotos", "ok": None, "detalhe": "não dá para verificar daqui — confira no perfil"}]},
    "site": {"url": "", "tipo": "none", "nota": None, "problemas": [], "plataforma": "", "credito_agencia": "", "pixel_meta": False,
             "tag_google_ads": False, "tag_tiktok": False, "google_analytics": False, "pixels_via_tag_manager": False, "ano_rodape": None},
    "instagram": {"disponivel": True, "usuario": "vetplusbtu", "seguidores": 3200, "posts_90_dias": 0, "dias_desde_ultimo_post": 120},
    "quem_cuida": {"veredito": "abandonado", "rotulo": "Presença online abandonada", "confianca": "média",
                   "evidencias": ["o último post no Instagram foi há 120 dias"], "abordagem": "Retomar o que parou, sem criticar quem começou.", "lacunas": []},
    "empresa": {"cnpj": "11222333000181", "razao_social": "Clinica Vetplus Ltda", "situacao": "Ativa", "aberta_em": "10/03/2015",
                "anos_de_atividade": 11, "porte": "Micro empresa", "atividade": "Atividades veterinárias",
                "socios": [{"nome": "Marina Costa", "qualificacao": "Sócio-administrador"}], "fonte": "Receita Federal, via BrasilAPI"},
    "pessoas": [{"nome": "Dra. Marina Costa", "cargo": "fundadora", "fonte": "citado no site do negócio"}],
    "dores": [{"titulo": "Reputação boa sem onde converter", "evidencia": "Nota 4,8 com 213 avaliações e nenhum site próprio.", "peso": "alto"},
              {"titulo": "Quem pesquisa não tem para onde ir", "evidencia": "O perfil do Google não tem site.", "peso": "alto"},
              {"titulo": "Instagram parado", "evidencia": "O último post foi há 120 dias.", "peso": "medio"},
              {"titulo": "Perfil do Google sem: descrição do negócio", "evidencia": "o perfil não tem descrição", "peso": "medio"}],
    "abordagem": {"angulo": "Transformar 213 avaliações em agendamentos com uma página própria que o Google possa apontar.",
                  "abertura": "Olá, Marina! A VETPlus tem nota 4,8 com 213 avaliações no Google, mas quem procura no celular não encontra um site para agendar. Posso te mostrar um esboço pronto, sem compromisso?",
                  "por_que_funciona": "Parte da reputação que ela já conhece e aponta a perda concreta, sem elogio genérico.",
                  "objecao_provavel": "O movimento já está bom.", "resposta_a_objecao": "Justamente: a página captura quem pesquisa à noite, quando a recepção está fechada.",
                  "proximo_passo": "Enviar o esboço e propor 15 minutos.", "evitar": "Falar em preço antes de mostrar o esboço.",
                  "origem": "ia", "canal": "whatsapp"},
}
LEAD = {"id": "ChIJqaaaaaaaaaa", "name": "Clínica Veterinária 24 horas VETPlus", "avatar": "", "role": "Veterinário", "niche": "Veterinário",
        "company": "Clínica Veterinária 24 horas VETPlus", "location": "Botucatu - SP", "city": "Botucatu", "email": "vetplusbtu.adm@gmail.com",
        "phone": "551431750177", "whatsapp": True, "website": "", "socials": {"instagram": "https://instagram.com/vetplusbtu"},
        "quality_score": 80, "verified": True, "outreach_status": "Pendente", "rating": 4.8, "rating_count": 213, "contactability": 75,
        "maps_url": "https://maps.google.com/?cid=1", "site_status": "none",
        "diagnosis": "Clínica Veterinária 24 horas VETPlus tem presença digital montada. A oportunidade está em conversão.",
        "hooks": ["nota 4,8 com 213 avaliações no Google", "nenhum site no perfil do Google"], "best_channel": "whatsapp",
        "reviews_sample": [{"rating": 5, "text": "Atenderam meu cachorro de madrugada, equipe maravilhosa.", "when": "há 2 meses"}],
        "neighborhood": "Centro", "open_now": True, "pipeline_stage": "Novo Lead"}


async def main():
    import medir
    medir.RESPOSTAS["/api/raio-x"] = RAIOX
    larguras = [("desktop", 1440, 900), ("celular", 390, 844)]
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=EDGE, headless=True)
        for nome, w, h in larguras:
            ctx = await nav.new_context(viewport={"width": w, "height": h})
            await ctx.add_init_script("localStorage.setItem('LEADSAGE_LEADS', %s)" % json.dumps(json.dumps([LEAD])))
            async def api(route):
                caminho = route.request.url.split("localhost:5198")[-1].split("?")[0]
                await route.fulfill(status=200, content_type="application/json", body=json.dumps(medir.RESPOSTAS.get(caminho, {})))
            await ctx.route("**/api/**", api)
            pag = await ctx.new_page()
            erros = []
            pag.on("pageerror", lambda e: erros.append(str(e)[:160]))
            await medir.ir_para(pag, "Meus Leads", w)
            await pag.locator("text=VETPlus").first.dispatch_event("click")
            await pag.wait_for_timeout(900)
            painel = pag.locator("div.animate-slide-in-right")
            await painel.screenshot(path=os.path.join(SAIDA, f"perfil_{nome}_antes.png"))
            await pag.locator("button:has-text('Gerar dossiê completo')").dispatch_event("click")
            await pag.wait_for_timeout(1200)
            # rola o painel inteiro e fotografa em pedacos
            area = painel.locator("div.overflow-y-auto").first
            total = await area.evaluate("e => e.scrollHeight")
            await pag.set_viewport_size({"width": w, "height": min(total + 90, 6000)})
            await pag.wait_for_timeout(500)
            await painel.screenshot(path=os.path.join(SAIDA, f"perfil_{nome}_dossie.png"))
            ov = await pag.evaluate("document.documentElement.scrollWidth")
            print(nome, "scrollHeight", total, "largura da pagina", ov, "janela", w, "erros", erros)
            await ctx.close()
        await nav.close()


if __name__ == "__main__":
    asyncio.run(main())
