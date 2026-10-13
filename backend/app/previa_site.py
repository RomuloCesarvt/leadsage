"""A prévia do site de um lead, criada na hora pelo robô.

Quando o lead aceita ver a prévia e ela ainda não existe, o robô não pode prometer e sumir: ele cria o site e manda o
link na mesma conversa. Este módulo monta uma página completa e bonita a partir do que o LeadSage já sabe do negócio
(nome, ramo, cidade, nota do Google, telefone e endereço), sem chamar IA: sai em milissegundos, nunca falha por
instabilidade de modelo e não custa crédito. O site completo, com as fotos e o conteúdo do cliente, é o passo seguinte.

Nada é inventado: serviços, preços e depoimentos não aparecem. Só o que o negócio realmente tem.
"""
import html
import re
from typing import Any, Dict, Optional, Tuple
from urllib.parse import quote

from app.config import settings
from app.credit_system import is_admin

# (cor da marca, cor de destaque) por tipo de negócio
PALETAS = [
    (("clinic", "estetic", "odonto", "dentis", "medic", "saude", "fisio", "nutri", "psicolog", "harmoniz", "spa"), ("#0f766e", "#f5b301")),
    (("padaria", "restaurante", "pizza", "lanch", "cafe", "confeit", "hamburg", "bar ", "doceria"), ("#b91c1c", "#f59e0b")),
    (("barbear", "salao", "cabelei", "beleza", "manicure", "tatuag", "moda", "boutique"), ("#1f1b2e", "#d4af37")),
    (("advoca", "juridic", "contab", "imobili", "corretor", "consult", "seguro", "arquitet"), ("#1e3a8a", "#c8a24a")),
    (("mecan", "oficina", "auto", "constru", "eletric", "encanad", "pintor", "material"), ("#111827", "#ef4444")),
    (("pet", "veterin", "academia", "fitness", "pilates", "escola", "curso"), ("#0369a1", "#f59e0b")),
]


def _normal(texto: str) -> str:
    return re.sub(r"[^a-z ]+", " ", (texto or "").lower().encode("ascii", "ignore").decode())


def paleta(nicho: str) -> Tuple[str, str]:
    alvo = _normal(nicho)
    for palavras, cores in PALETAS:
        if any(p in alvo for p in palavras):
            return cores
    return ("#2563eb", "#f59e0b")


def _esc(v: Any) -> str:
    return html.escape(str(v or "").strip(), quote=True)


def _digitos(v: Any) -> str:
    d = re.sub(r"\D", "", str(v or ""))
    return ("55" + d) if len(d) in (10, 11) else d


def renderizar(lead: Dict[str, Any]) -> str:
    """O HTML completo da prévia. Autocontido e sem JavaScript (o site é servido em sandbox)."""
    nome = _esc(lead.get("company") or lead.get("name") or "Seu negócio")
    nicho = (lead.get("niche") or lead.get("role") or "").strip()
    cidade = _esc(lead.get("city") or "")
    c1, c2 = paleta(nicho)
    fone = _digitos(lead.get("whatsapp") if lead.get("whatsapp") not in (None, True, False) else lead.get("phone")) or _digitos(lead.get("phone"))
    zap = f"https://wa.me/{fone}?text={quote('Olá! Vi a prévia do site e gostaria de conversar.')}" if fone else ""
    nota = lead.get("rating")
    try:
        nota_f = float(nota) if nota else 0.0
    except (TypeError, ValueError):
        nota_f = 0.0
    avaliacoes = int(lead.get("rating_count") or 0)
    endereco = _esc(lead.get("address") or lead.get("location") or "")
    mapa = f"https://www.google.com/maps/search/?api=1&query={quote((lead.get('company') or lead.get('name') or '') + ' ' + (lead.get('address') or lead.get('city') or ''))}"
    categoria = _esc(nicho)
    subtitulo = " · ".join(x for x in (categoria, cidade) if x)

    selo = ""
    if nota_f >= 3.5:
        selo = (f'<div class="nota vidro"><span class="estrelas">★★★★★</span><b>{nota_f:.1f}'.replace(".", ",") +
                f'</b><span>{f"{avaliacoes:,}".replace(",", ".")} avaliações no Google</span></div>' if avaliacoes
                else f'<div class="nota vidro"><span class="estrelas">★★★★★</span><b>{nota_f:.1f}'.replace(".", ",") + '</b><span>no Google</span></div>')

    cartoes = [
        ("Encontrado no Google", "Quem procura pelo seu ramo na cidade chega direto ao seu endereço, com informações claras."),
        ("Contato em um toque", "Botão de WhatsApp sempre à vista, no celular e no computador."),
        ("Tudo no mesmo lugar", "Endereço, horário, contatos e mapa organizados para o cliente decidir sem dúvida."),
    ]
    cartoes_html = "".join(f'<article class="cartao vidro"><span class="n">0{i + 1}</span><h3>{_esc(t)}</h3><p>{_esc(p)}</p></article>' for i, (t, p) in enumerate(cartoes))
    botao = f'<a class="btn" href="{zap}" target="_blank" rel="noopener">Falar no WhatsApp</a>' if zap else ""
    contato = "".join([
        f'<p><b>Endereço</b><span>{endereco}</span></p>' if endereco else "",
        f'<p><b>Telefone</b><span>{_esc(lead.get("phone"))}</span></p>' if lead.get("phone") else "",
    ])
    return f"""<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{nome}{f' — {subtitulo}' if subtitulo else ''}</title>
<meta name="description" content="Prévia do site de {nome}.">
<style>
:root{{--c1:{c1};--c2:{c2};--bg:#07080c;--ease:cubic-bezier(.2,.7,.2,1)}}
*{{box-sizing:border-box}}html{{scroll-behavior:smooth}}
body{{margin:0;background:#07080c;background:color-mix(in srgb,var(--c1) 9%,#05060a);color:#f4f5f7;font:17px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}}
a{{color:inherit;text-decoration:none}}
.wrap{{width:min(1120px,90vw);margin:0 auto}}
.vidro{{background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.035));-webkit-backdrop-filter:blur(20px) saturate(170%);backdrop-filter:blur(20px) saturate(170%);border:1px solid rgba(255,255,255,.16);border-radius:24px;box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 30px 60px -30px rgba(0,0,0,.7)}}
.fita{{position:fixed;z-index:20;top:14px;left:50%;transform:translateX(-50%);padding:9px 20px;border-radius:999px;font-size:13px;letter-spacing:.06em;display:flex;gap:10px;align-items:center;white-space:nowrap}}
.fita i{{width:7px;height:7px;border-radius:50%;background:var(--c2);box-shadow:0 0 12px var(--c2)}}
.hero{{position:relative;min-height:100svh;display:grid;align-content:center;padding:130px 0 80px;overflow:hidden;isolation:isolate;
  background:radial-gradient(60% 80% at 15% 10%,color-mix(in srgb,var(--c1) 75%,transparent),transparent 62%),radial-gradient(55% 70% at 92% 90%,color-mix(in srgb,var(--c2) 50%,transparent),transparent 62%),linear-gradient(160deg,#0c0f17,#05060a)}}
.pre{{display:inline-block;padding:8px 18px;border-radius:999px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin-bottom:22px}}
h1{{font:italic 400 clamp(48px,9vw,130px)/.95 Georgia,"Times New Roman",serif;letter-spacing:-.03em;margin:0 0 24px;max-width:15ch;animation:entra 1.1s var(--ease) both}}
.sub{{max-width:50ch;color:rgba(255,255,255,.78);font-size:clamp(17px,1.6vw,21px);margin:0 0 34px;animation:entra 1.1s var(--ease) .25s both}}
.btn{{display:inline-flex;align-items:center;padding:17px 32px;border-radius:999px;font-weight:700;color:#0b0c10;background:linear-gradient(135deg,color-mix(in srgb,var(--c1) 58%,#fff),var(--c2));box-shadow:0 20px 40px -16px var(--c2);transition:transform .3s var(--ease);animation:entra 1.1s var(--ease) .45s both}}
.btn:hover{{transform:translateY(-3px)}}
.nota{{display:inline-flex;gap:12px;align-items:center;padding:12px 20px;border-radius:999px;margin-top:34px;font-size:14px;animation:entra 1.1s var(--ease) .6s both}}
.nota b{{font-size:20px;color:#fff}}.estrelas{{color:#f5b301;letter-spacing:2px}}
@keyframes entra{{from{{opacity:0;transform:translateY(24px);filter:blur(8px)}}to{{opacity:1;transform:none;filter:none}}}}
.sec{{padding:clamp(64px,9vw,120px) 0}}
h2{{font:italic 400 clamp(34px,5vw,64px)/1 Georgia,serif;margin:0 0 36px}}
.grade{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}}
.cartao{{padding:32px 28px;transition:transform .5s var(--ease),border-color .3s}}.cartao:hover{{transform:translateY(-6px);border-color:var(--c2)}}
.cartao .n{{font:italic 40px Georgia,serif;color:var(--c2)}}.cartao h3{{margin:22px 0 8px;font:italic 400 26px/1.1 Georgia,serif}}.cartao p{{margin:0;color:rgba(255,255,255,.64);font-size:15.5px}}
@supports (animation-timeline:view()){{.cartao{{animation:entra linear both;animation-timeline:view();animation-range:entry 4% entry 50%}}}}
.fim{{padding:clamp(56px,8vw,110px) 0}}
.fim-in{{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center;padding:clamp(30px,5vw,64px)}}
.fim p{{display:flex;flex-direction:column;margin:0 0 14px}}.fim p b{{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--c2)}}
footer{{padding:34px 0;border-top:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.5);font-size:13px}}
@media(max-width:800px){{.fim-in{{grid-template-columns:1fr}}.fita{{font-size:11px;padding:8px 14px}}}}
@media(prefers-reduced-motion:reduce){{*{{animation:none!important}}}}
</style></head>
<body>
<div class="fita vidro"><i></i>Prévia do site de {nome}</div>
<section class="hero"><div class="wrap">
  <span class="pre vidro">{subtitulo or 'Seu negócio na internet'}</span>
  <h1>{nome}</h1>
  <p class="sub">Uma presença profissional para quem procura {categoria.lower() if categoria else 'o seu serviço'}{f' em {cidade}' if cidade else ''}: informações claras e contato direto, em um só lugar.</p>
  {botao}
  {selo}
</div></section>
<section class="sec"><div class="wrap"><h2>Como o seu site trabalha por você</h2><div class="grade">{cartoes_html}</div></div></section>
<section class="fim"><div class="wrap"><div class="fim-in vidro"><div><h2>Vamos conversar?</h2>{botao}</div><div>{contato}<p><b>Mapa</b><a href="{html.escape(mapa, quote=True)}" target="_blank" rel="noopener">Ver no Google Maps</a></p></div></div></div></section>
<footer><div class="wrap">Esboço inicial preparado para {nome}. O site completo recebe as suas fotos, serviços e textos.</div></footer>
</body></html>"""


async def criar(uid: str, email: str, lead: Dict[str, Any]) -> Tuple[str, str]:
    """Cria e publica a prévia deste lead. Devolve (link, motivo_da_falha): o link vem vazio quando não deu para criar."""
    from app.profile_store import get_profile
    from app.sites_store import contar_sites, create_site

    lead_id = str(lead.get("id") or "")
    if not lead_id:
        return "", "o lead não tem identificador"
    try:
        if not is_admin(email):
            cota = (await get_profile(uid)).sites_quota or 0
            if await contar_sites(uid) >= cota:
                return "", "o plano não tem mais vagas de site"
        empresa = str(lead.get("company") or lead.get("name") or "Prévia")
        site = await create_site(uid, empresa, renderizar(lead), "Prévia rápida", lead_id)
        return f"{settings.APP_URL}/s/{site['slug']}", ""
    except Exception as exc:  # o robô cai para "finalizando" e chama o dono; não derruba a conversa
        return "", f"{type(exc).__name__}: {str(exc)[:80]}"
