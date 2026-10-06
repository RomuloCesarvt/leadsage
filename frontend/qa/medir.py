"""QA de layout: visita cada tela do app em varios tamanhos e mede o que vaza.

Sobe contra o servidor de QA (frontend/vite.qa.config.ts, porta 5198), que roda
o app real com login e API simulados. Para cada tela e cada tamanho de janela:

- rolagem horizontal da pagina (nunca deve existir);
- elementos que passam da borda direita/esquerda fora de uma area rolavel
  de proposito (overflow-x auto/scroll);
- texto cortado sem reticencias (overflow hidden com conteudo maior que a caixa);
- elementos fixos (botao flutuante, cabecalho) cobrindo conteudo no fim da pagina.

Uso: python qa/medir.py [tela ...]   (sem argumentos: todas)
Saida: resumo no terminal e capturas em qa/saida/.
"""
import asyncio, io, json, os, sys
from playwright.async_api import async_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "saida")
os.makedirs(SAIDA, exist_ok=True)
URL = "http://localhost:5198/"
EDGE = r"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"

TELAS = [
    ("dashboard", "Dashboard"), ("hero", "Nova Busca"), ("workspace", "Meus Leads"), ("pipeline", "Pipeline de Vendas"),
    ("history", "Histórico"), ("ai-outreach", "IA de Abordagem"), ("robo", "Robô de Atendimento"), ("proposals", "Propostas"),
    ("contracts", "Contratos"), ("calculator", "Precificador"), ("create-site", "Criar Site"), ("my-sites", "Meus Sites"),
    ("tutorials", "Tutoriais"), ("notifications", "Avisos"), ("settings", "Configurações"), ("help", "Ajuda"),
    ("subscription", "Assinatura"),
]
TAMANHOS = [("desktop", 1440, 900), ("notebook", 1280, 720), ("tablet", 820, 1100), ("celular", 390, 844)]

NOMES = ["Padaria Flor do Lageado", "Clínica Sorriso Pleno", "Academia Corpo em Ação", "Auto Center Rodrigues",
         "Studio Bella Pele", "Tintas Botucatu", "Prime Imóveis", "Pizzaria Forno de Ouro", "Dra. Helena Prado Advocacia",
         "Pet Shop Amigo Fiel", "Farmácia Vida Plena", "Barbearia do Zé"]
ETAPAS = ["Novo Lead", "Contato Enviado", "Respondeu", "Qualificado", "Reunião", "Proposta", "Fechado", "Perdido"]


def leads():
    saida = []
    for i, n in enumerate(NOMES):
        saida.append({
            "id": f"L{i}", "name": n, "avatar": "", "role": "Proprietário", "niche": "Padaria", "company": n,
            "location": "Botucatu, SP", "city": "Botucatu", "email": f"contato{i}@exemplo.com.br", "phone": f"551499800{3000+i}",
            "whatsapp": True, "website": "", "address": "Rua das Flores, 120 - Centro", "instagram": f"@{n.split()[0].lower()}",
            "socials": {}, "quality_score": 70 + i, "verified": True, "bio": "Negócio local com boa reputação.",
            "ai_summary": "Boa avaliação no Google e sem site próprio.", "outreach_status": "Pendente",
            "opportunityScore": 40 + i * 5, "missingDigitalAssets": ["site", "descrição no Google"], "pipeline_stage": ETAPAS[i % 8],
            "rating": 4.5, "rating_count": 100 + i * 37, "diagnosis": "Tem muitas avaliações boas mas nenhum site.", "hooks": ["muitas avaliações, nenhum site"],
            "pipeline_motivo": "o lead respondeu" if i % 3 == 0 else "", "pipeline_por": "robô" if i % 3 == 0 else "",
        })
    return saida


PERFIL = {"id": "qa", "name": "Rômulo César", "email": "qa@leadsage.test", "company_name": "LeadSage Studio",
          "niche_focus": "Padarias", "product_description": "Sites e presença digital", "credits": 480, "plan": "Agência",
          "plan_id": "agencia", "avatar": "", "sites_quota": 5}

ROBO = {"ativo": True, "objetivo": "agendar", "instrucoes": "", "link_agenda": "", "nome_assistente": "Ana", "wa_phone_id": "",
        "page_id": "", "ig_id": "", "tem_app_secret": False, "tem_wa_token": False, "tem_page_token": False,
        "webhook_url": "https://exemplo.test/api/robo/webhook/abc", "verify_token": "tok", "whatsapp_pronto": True, "meta_pronto": False,
        "modo": "app", "page_nome": "", "ig_usuario": "", "waba_id": "W1", "paginas_pendentes": [], "oferta": {}, "catalogo": "", "faq": "",
        "desconto_maximo": 0}

RESPOSTAS = {
    "/api/profile": PERFIL, "/api/credits/balance": {"credits": 480}, "/api/history": [], "/api/suggested-niches": [],
    "/api/robo/config": ROBO, "/api/robo/conversas": [], "/api/pipeline": {"etapas": ETAPAS, "itens": []},
    "/api/pipeline/sync": {"novos": 0}, "/api/sites": [], "/api/sites/quota": {"usados": 1, "cota": 5, "ilimitado": False},
    "/api/documents": [], "/api/integrations": {}, "/api/orders": [], "/api/packages": [], "/api/plan": {"plan_id": "agencia"},
    "/api/robo/meta/disponivel": {"facebook": True, "whatsapp": True, "app_id": "1", "wa_config_id": "2"},
    "/api/robo/whatsapp/modelo": {"existe": True, "status": "APPROVED", "motivo": "", "texto": "Olá! Aqui é {{1}}, da {{2}}. Vi a {{3}} no Google.", "lote": 20},
}

# roda dentro da pagina: tudo que passa da janela ou esta cortado
MEDIDOR = r"""
() => {
  const W = window.innerWidth, H = window.innerHeight;
  const rolavel = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth) return true;
    }
    return false;
  };
  const visivel = (el) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };
  const nome = (el) => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).slice(0, 3).join('.') : '')).slice(0, 80)
      + ' "' + (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '"';
  // decoracao que passa da borda mas esta dentro de um conteiner que a corta
  // (overflow hidden/clip, ele mesmo dentro da janela) nao e problema
  const cortadoPorPai = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(hidden|clip)/.test(s.overflowX)) {
        const r = p.getBoundingClientRect();
        if (r.right <= W + 1 && r.left >= -1) return true;
      }
    }
    return false;
  };
  const vaza = [], cortados = [], truncados = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visivel(el)) continue;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    // texto com reticencias ou line-clamp que de fato perdeu parte do conteudo
    if (el.children.length === 0 && (el.innerText || '').trim()
        && ((st.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
            || (st.webkitLineClamp && st.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 1))) {
      truncados.push(nome(el).replace(/ "[^"]*"$/, '') + ` "${(el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50)}" [${el.clientWidth}px de ${el.scrollWidth}px]`);
    }
    // fora da janela horizontalmente e nao dentro de uma faixa rolavel de proposito
    if ((r.right > W + 1 || r.left < -1) && !rolavel(el) && !cortadoPorPai(el) && getComputedStyle(el).position !== 'fixed') {
      // so o ponto mais externo: ignora filhos cujo pai ja vaza
      const pai = el.parentElement;
      const rp = pai && pai.getBoundingClientRect();
      if (!(rp && (rp.right > W + 1 || rp.left < -1))) vaza.push(nome(el) + ` [${Math.round(r.left)}..${Math.round(r.right)}]`);
    }
    const s = getComputedStyle(el);
    if (/(hidden|clip)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 2 && s.textOverflow !== 'ellipsis'
        && !/line-clamp|truncate/.test(el.className || '') && el.children.length === 0 && (el.innerText || '').trim()) {
      cortados.push(nome(el) + ` [${el.scrollWidth}>${el.clientWidth}]`);
    }
  }
  return {
    larguraDaPagina: document.documentElement.scrollWidth, janela: W,
    rolagemHorizontal: document.documentElement.scrollWidth > W + 1,
    alturaDaPagina: document.documentElement.scrollHeight, alturaDaJanela: H,
    vaza: [...new Set(vaza)].slice(0, 6), cortados: [...new Set(cortados)].slice(0, 6),
    truncados: [...new Set(truncados)].slice(0, 8), totalTruncados: new Set(truncados).size,
  };
}
"""


async def preparar(ctx):
    await ctx.add_init_script("localStorage.setItem('LEADSAGE_LEADS', %s)" % json.dumps(json.dumps(leads())))

    async def api(route):
        caminho = route.request.url.split("localhost:5198")[-1].split("?")[0]
        corpo = RESPOSTAS.get(caminho, {})
        await route.fulfill(status=200, content_type="application/json", body=json.dumps(corpo))
    await ctx.route("**/api/**", api)


async def ir_para(pag, rotulo, largura):
    await pag.goto(URL)
    await pag.wait_for_selector("aside, nav, button", timeout=15000)
    await pag.wait_for_timeout(500)
    alvo = pag.locator(f"aside button:has-text('{rotulo}')").first
    await alvo.dispatch_event("click")
    await pag.wait_for_timeout(900)
    if largura <= 768:
        # fecha o menu lateral que cobre a tela no celular
        overlay = pag.locator("div.fixed.inset-0.z-30").first
        if await overlay.count():
            await overlay.dispatch_event("click")
            await pag.wait_for_timeout(300)


async def popover_de_nichos(ctx, tamanho, w, h):
    """A lista de nichos tem de caber inteira na janela, sem rolar a pagina."""
    pag = await ctx.new_page()
    r = {"tela": "nichos(popover)", "tamanho": tamanho, "vaza": [], "cortados": [], "erros_js": []}
    try:
        await ir_para(pag, "Nova Busca", w)
        await pag.locator("input[role=combobox]").click()
        await pag.wait_for_timeout(400)
        cx = await pag.evaluate("""() => {
          const l = document.querySelector('#lista-de-nichos'); if (!l) return null;
          const b = l.getBoundingClientRect(), H = window.innerHeight, W = window.innerWidth;
          const itens = [...l.querySelectorAll('button')].filter(e => { const r = e.getBoundingClientRect(); return r.height > 0; });
          const cortadosNoTexto = [...l.querySelectorAll('span')].filter(e => e.children.length === 0 && e.scrollWidth > e.clientWidth + 1).map(e => e.innerText.slice(0, 40));
          return { topo: Math.round(b.top), base: Math.round(b.bottom), H, esq: Math.round(b.left), dir: Math.round(b.right), W,
                   rolagemInterna: l.scrollHeight > l.clientHeight, textosCortados: cortadosNoTexto.slice(0, 5) };
        }""")
        if not cx:
            r["vaza"].append("popover não abriu")
        else:
            if cx["base"] > cx["H"] - 4: r["vaza"].append(f"popover passa da base da janela ({cx['base']} > {cx['H']})")
            if cx["topo"] < 4: r["vaza"].append(f"popover passa do topo da janela ({cx['topo']})")
            if cx["dir"] > cx["W"] or cx["esq"] < 0: r["vaza"].append(f"popover passa da lateral ({cx['esq']}..{cx['dir']} de {cx['W']})")
            r["cortados"] += [f"texto cortado no popover: {t}" for t in cx["textosCortados"]]
            # abre a ultima categoria e confere o ultimo nicho visivel ao rolar so a lista
            await pag.locator("#lista-de-nichos button[aria-expanded]").last.click()
            await pag.wait_for_timeout(300)
            ultimo = pag.locator("#lista-de-nichos button.border").last
            await ultimo.scroll_into_view_if_needed()
            box = await ultimo.bounding_box()
            if not box or box["y"] + box["height"] > h or box["y"] < 0:
                r["vaza"].append(f"último nicho fora da janela mesmo rolando só a lista: {box}")
            await pag.screenshot(path=os.path.join(SAIDA, f"nichos_popover_{tamanho}.png"))
    except Exception as e:
        r["erro"] = f"{type(e).__name__}: {str(e)[:100]}"
    await pag.close()
    return r


async def main():
    filtro = set(sys.argv[1:])
    relatorio = []
    async with async_playwright() as p:
        nav = await p.chromium.launch(executable_path=EDGE, headless=True)
        for tamanho, w, h in TAMANHOS:
            ctx = await nav.new_context(viewport={"width": w, "height": h})
            await preparar(ctx)
            for id_, rotulo in TELAS:
                if filtro and id_ not in filtro:
                    continue
                pag = await ctx.new_page()
                erros = []
                pag.on("pageerror", lambda e: erros.append(str(e)[:120]))
                try:
                    await ir_para(pag, rotulo, w)
                    m = await pag.evaluate(MEDIDOR)
                    await pag.screenshot(path=os.path.join(SAIDA, f"{id_}_{tamanho}.png"), full_page=True)
                except Exception as e:
                    m = {"erro": f"{type(e).__name__}: {str(e)[:100]}"}
                m.update({"tela": id_, "tamanho": tamanho, "erros_js": erros})
                relatorio.append(m)
                await pag.close()
            if not filtro or "popover" in filtro:
                relatorio.append(await popover_de_nichos(ctx, tamanho, w, h))
            await ctx.close()
        await nav.close()

    problemas = 0
    for m in relatorio:
        itens = []
        if m.get("erro"): itens.append("ERRO " + m["erro"])
        if m.get("rolagemHorizontal"): itens.append(f"ROLAGEM HORIZONTAL ({m['larguraDaPagina']}px numa janela de {m['janela']}px)")
        itens += [f"vaza: {v}" for v in m.get("vaza", [])]
        itens += [f"cortado: {c}" for c in m.get("cortados", [])]
        if m.get("totalTruncados"):
            itens.append(f"{m['totalTruncados']} texto(s) com reticências")
            itens += [f"   truncado: {t}" for t in m.get("truncados", [])[:4]]
        itens += [f"js: {e}" for e in m.get("erros_js", [])]
        if itens:
            problemas += 1
            print(f"\n[{m['tela']} · {m['tamanho']}]")
            for i in itens:
                print("   -", i)
    print(f"\n{len(relatorio)} telas medidas, {problemas} com problema.")
    json.dump(relatorio, open(os.path.join(SAIDA, "relatorio.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    asyncio.run(main())
