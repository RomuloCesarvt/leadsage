"""O card da promoção: uma arte 1080x1350 (PNG) com o preço que o dono cadastrou, feita na hora para o ramo do lead.

O robô manda este card junto com o aviso da promoção (no lugar da prévia do site, ou além dela). O card mostra um site de exemplo
já com o NOME DA EMPRESA do lead, o preço, quatro benefícios do ramo e o convite para chamar no WhatsApp.

Desenhado com Pillow (sem navegador), para rodar na própria função do servidor. As fontes ficam em `fontes/`.
O endereço da imagem é assinado (HMAC): só o sistema consegue montar um link válido, ninguém usa isto para gerar imagens à vontade.
"""
import hashlib
import hmac
import io
import os
import re
import unicodedata
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from app.config import settings

PASTA = os.path.join(os.path.dirname(__file__), "fontes")
L, A = 1080, 1350
S = 2  # desenha em dobro e reduz: bordas lisas

# ---------------------------------------------------------------- ramos

RAMOS: Dict[str, Dict] = {
    "dentista": dict(rotulo="dentistas", pill="SITE PARA DENTISTAS", cor="#7fb2ff", cor2="#2f6bff", claro=True,
                     manchete=["Cuide do seu sorriso", "sem medo"], botao="Agendar horário",
                     itens=["Agendamento direto pelo WhatsApp", "Tratamentos e equipe em destaque", "Avaliações do Google no site", "Perfeito no celular"],
                     palavras=("dentist", "odonto", "ortodont", "implante")),
    "estetica": dict(rotulo="clínicas de estética", pill="SITE PARA CLÍNICAS DE ESTÉTICA", cor="#f0b8d0", cor2="#c9609a", claro=False,
                     manchete=["Realce o que você", "tem de melhor"], botao="Falar no WhatsApp",
                     itens=["Procedimentos com visual de alto padrão", "Agenda pelo WhatsApp", "Galeria de resultados", "Perfeito no celular"],
                     palavras=("estetic", "harmoniz", "spa", "depila", "beleza", "skin")),
    "advocacia": dict(rotulo="advogados", pill="SITE PARA ADVOGADOS", cor="#f1d38a", cor2="#c9a24a", claro=True,
                      manchete=["Orientação jurídica clara,", "com respeito ao seu caso"], botao="Falar com a gente",
                      itens=["Áreas de atuação com clareza", "Visual que passa credibilidade", "Contato direto pelo WhatsApp", "Perfeito no celular"],
                      palavras=("advoga", "juridic", "escritorio de advocacia", "law")),
    "oficina": dict(rotulo="oficinas mecânicas", pill="SITE PARA OFICINAS MECÂNICAS", cor="#ffd84d", cor2="#f59e0b", claro=False,
                    manchete=["Conserto honesto,", "orçamento claro"], botao="Pedir orçamento",
                    itens=["Orçamento pelo WhatsApp", "Serviços e localização no Google Maps", "Avaliações dos clientes", "Perfeito no celular"],
                    palavras=("oficina", "mecanic", "auto center", "autocenter", "funilaria", "auto pecas", "car_repair")),
    "pet": dict(rotulo="pet shops", pill="SITE PARA PET SHOPS E VETERINÁRIAS", cor="#9fe3b5", cor2="#2fb86b", claro=True,
                manchete=["O cantinho preferido", "do seu pet"], botao="Agendar horário",
                itens=["Banho, tosa e consultas com agendamento", "Botão de WhatsApp em todas as telas", "Fotos e serviços do seu pet shop", "Perfeito no celular"],
                palavras=("pet", "veterin", "banho e tosa")),
    "barbearia": dict(rotulo="barbearias", pill="SITE PARA BARBEARIAS", cor="#e6c28a", cor2="#b8863b", claro=False,
                      manchete=["Estilo e navalha", "no ponto"], botao="Agendar horário",
                      itens=["Agendamento pelo WhatsApp", "Cortes e preços à mostra", "Fotos do seu trabalho", "Perfeito no celular"],
                      palavras=("barbear", "barber")),
    "academia": dict(rotulo="academias", pill="SITE PARA ACADEMIAS", cor="#8ef0ff", cor2="#2bb5d6", claro=False,
                     manchete=["Treine com", "quem entende"], botao="Aula experimental",
                     itens=["Planos e horários claros", "Aula experimental pelo WhatsApp", "Modalidades e professores", "Perfeito no celular"],
                     palavras=("academia", "crossfit", "pilates", "fitness", "gym")),
    "restaurante": dict(rotulo="restaurantes", pill="SITE PARA RESTAURANTES", cor="#ffb27a", cor2="#e8590c", claro=False,
                        manchete=["Sabor que", "você vê e deseja"], botao="Fazer pedido",
                        itens=["Cardápio bonito e atualizado", "Pedido e reserva pelo WhatsApp", "Localização no Google Maps", "Perfeito no celular"],
                        palavras=("restaurante", "pizzaria", "lanchonete", "hamburguer", "padaria", "cafeteria", "bar ", "churrasc")),
    "padrao": dict(rotulo="o seu negócio", pill="SITE PROFISSIONAL PARA O SEU NEGÓCIO", cor="#b9c7ff", cor2="#5b6cff", claro=True,
                   manchete=["O seu negócio,", "mais profissional"], botao="Falar no WhatsApp",
                   itens=["Contato direto pelo WhatsApp", "Seus serviços em destaque", "Avaliações e localização no Google", "Perfeito no celular"],
                   palavras=()),
}


def _sem_acento(t: str) -> str:
    return unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()


def ramo_do_lead(niche: str = "", company: str = "", place_types: Optional[List[str]] = None) -> str:
    base = _sem_acento(" ".join([niche or "", company or "", " ".join(place_types or [])]))
    for rid, r in RAMOS.items():
        if any(p in base for p in r["palavras"]):
            return rid
    return "padrao"


# ---------------------------------------------------------------- assinatura do endereço

def _chave() -> bytes:
    return hashlib.sha256(("card-promocao|" + (settings.WORKER_SECRET or settings.PAYMENT_WEBHOOK_SECRET or settings.META_APP_SECRET or "leadsage")).encode()).digest()


def _assinar(ramo: str, preco: str, empresa: str) -> str:
    return hmac.new(_chave(), f"{ramo}|{preco}|{empresa}".encode(), hashlib.sha256).hexdigest()[:24]


def assinatura_valida(ramo: str, preco: str, empresa: str, sig: str) -> bool:
    return hmac.compare_digest(_assinar(ramo, preco, empresa), sig or "")


def url_do_card(ramo: str, preco: str, empresa: str = "") -> str:
    """O endereço público do PNG deste card (o WhatsApp e a Meta buscam a imagem por ele)."""
    empresa = (empresa or "").strip()[:40]
    preco = str(preco).strip()[:12]
    return (f"{settings.APP_URL.rstrip('/')}/api/card-promocao.png?ramo={quote(ramo)}&preco={quote(preco)}"
            f"&empresa={quote(empresa)}&sig={_assinar(ramo, preco, empresa)}")


def midia_do_card(ramo: str, preco: str, empresa: str = "") -> Dict[str, str]:
    return {"url": url_do_card(ramo, preco, empresa), "mime": "image/png", "nome": "promocao.png"}


# ---------------------------------------------------------------- desenho

def _f(nome: str, tam: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(os.path.join(PASTA, nome), tam * S)
    except Exception:
        return ImageFont.load_default()


def _hex(c: str, a: int = 255) -> Tuple[int, int, int, int]:
    c = c.lstrip("#")
    return int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a


def _gradiente(w: int, h: int, c1, c2, horizontal: bool = False) -> Image.Image:
    g = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(g)
    n = w if horizontal else h
    for i in range(n):
        t = i / max(1, n - 1)
        cor = tuple(int(c1[k] + (c2[k] - c1[k]) * t) for k in range(4))
        d.line([(i, 0), (i, h)] if horizontal else [(0, i), (w, i)], fill=cor)
    return g


def _brilho(img: Image.Image, cx: int, cy: int, raio: int, cor, forca: int = 120) -> None:
    luz = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(luz)
    d.ellipse([cx - raio, cy - raio, cx + raio, cy + raio], fill=(cor[0], cor[1], cor[2], forca))
    luz = luz.filter(ImageFilter.GaussianBlur(raio // 2))
    img.alpha_composite(luz)


def _texto(d: ImageDraw.ImageDraw, xy, txt: str, fonte, cor, espaco: float = 0.0, ancora: str = "la") -> int:
    """Texto com espaçamento entre letras (em px já na escala S). Devolve a largura."""
    x, y = xy
    if not espaco:
        d.text((x, y), txt, font=fonte, fill=cor, anchor=ancora)
        return int(d.textlength(txt, font=fonte))
    total = 0
    for ch in txt:
        d.text((x + total, y), ch, font=fonte, fill=cor, anchor=ancora)
        total += d.textlength(ch, font=fonte) + espaco
    return int(total)


def _quebra(d: ImageDraw.ImageDraw, txt: str, fonte, larg: int) -> List[str]:
    linhas, atual = [], ""
    for palavra in txt.split():
        prova = (atual + " " + palavra).strip()
        if d.textlength(prova, font=fonte) <= larg or not atual:
            atual = prova
        else:
            linhas.append(atual)
            atual = palavra
    if atual:
        linhas.append(atual)
    return linhas


def _preco_partes(preco: str) -> Tuple[str, str]:
    """"347" -> ("347", "00"); "1.249,90" -> ("1.249", "90")."""
    p = re.sub(r"[^\d.,]", "", str(preco or "")) or "0"
    if "," in p:
        inteiro, cent = p.rsplit(",", 1)
    elif re.search(r"\.\d{2}$", p) and p.count(".") == 1:
        inteiro, cent = p.rsplit(".", 1)
    else:
        inteiro, cent = p, "00"
    inteiro = re.sub(r"\D", "", inteiro) or "0"
    n = int(inteiro)
    return f"{n:,}".replace(",", "."), (re.sub(r"\D", "", cent) + "00")[:2]


def _iniciais(nome: str) -> str:
    ps = [p for p in re.split(r"\s+", (nome or "").strip()) if p and p[0].isalpha()]
    return ("".join(p[0] for p in ps[:2]) or "LS").upper()


def _g(nome: str, px: float) -> ImageFont.FreeTypeFont:
    """Fonte com tamanho exato em pixels (já na escala do desenho)."""
    try:
        return ImageFont.truetype(os.path.join(PASTA, nome), max(6, int(px)))
    except Exception:
        return ImageFont.load_default()


def _site_de_exemplo(r: Dict, empresa: str, larg: int, alt: int, celular: bool = False) -> Image.Image:
    """Um site de exemplo (tela de notebook ou de celular) com o nome da empresa do lead."""
    claro = r["claro"]
    fundo = (246, 241, 232, 255) if claro else (11, 13, 20, 255)
    barra = (255, 255, 255, 255) if claro else (22, 24, 33, 255)
    tinta = (34, 30, 24, 255) if claro else (245, 245, 247, 255)
    suave = (120, 112, 100) if claro else (150, 156, 170)
    cor, cor2 = _hex(r["cor"]), _hex(r["cor2"])
    im = Image.new("RGBA", (larg, alt), fundo)
    if not claro:
        _brilho(im, int(larg * 0.78), int(alt * 0.35), int(alt * 0.38), cor2, 90)
    d = ImageDraw.Draw(im)
    u = larg / (190 if celular else 460)          # 1 "unidade" do site de exemplo, em pixels
    topo = int(30 * u)
    d.rectangle([0, 0, larg, topo], fill=barra)
    d.ellipse([int(10 * u), int(7 * u), int(26 * u), int(23 * u)], fill=cor2)
    d.text((int(32 * u), int(15 * u)), (empresa or "Sua Empresa")[:24], font=_g("Inter-700.ttf", 9 * u), fill=tinta, anchor="lm")
    if not celular:
        bw = int(64 * u)
        d.rounded_rectangle([larg - bw - int(12 * u), int(7 * u), larg - int(12 * u), int(23 * u)], radius=int(8 * u), fill=cor2)
    else:
        for k in range(3):
            d.line([(larg - int(26 * u), int((10 + k * 4) * u)), (larg - int(12 * u), int((10 + k * 4) * u))], fill=suave + (255,), width=max(2, int(1.2 * u)))
    x0 = int(14 * u)
    y = int((64 if not celular else 56) * u)
    tam = (22 if not celular else 15.5) * u
    fonte = _g("PlayfairDisplay-ExtraBold.ttf", tam)
    linhas = r["manchete"] if not celular else [r["manchete"][0], r["manchete"][1]]
    for linha in linhas:
        # em celular a linha longa quebra por largura
        for sub in _quebra(d, linha, fonte, larg - 2 * x0):
            d.text((x0, y), sub, font=fonte, fill=tinta, anchor="la")
            y += int(tam * 1.18)
    y += int(6 * u)
    d.rounded_rectangle([x0, y, x0 + int(130 * u), y + int(5 * u)], radius=int(2.5 * u), fill=suave + (110,))
    d.rounded_rectangle([x0, y + int(11 * u), x0 + int(96 * u), y + int(16 * u)], radius=int(2.5 * u), fill=suave + (80,))
    y += int(28 * u)
    bw, bh = int((84 if not celular else 76) * u), int(19 * u)
    d.rounded_rectangle([x0, y, x0 + bw, y + bh], radius=bh // 2, fill=cor2)
    d.text((x0 + bw // 2, y + bh // 2), r["botao"], font=_g("Inter-700.ttf", 7 * u), fill=(255, 255, 255, 255), anchor="mm")
    if not celular:
        d.rounded_rectangle([x0 + bw + int(8 * u), y, x0 + bw + int(8 * u) + int(70 * u), y + bh], radius=bh // 2, outline=cor2, width=max(2, int(1.1 * u)))
    if not celular:
        ax0, ax1 = int(larg * 0.64), int(larg * 0.94)
        ay0, ay1 = int(alt * 0.22), int(alt * 0.97)
    else:
        ax0, ax1 = int(larg * 0.2), int(larg * 0.8)
        ay0, ay1 = y + bh + int(14 * u), alt + int(60 * u)
    arco = _gradiente(ax1 - ax0, max(10, ay1 - ay0), cor, cor2)
    mascara = Image.new("L", arco.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle([0, 0, arco.size[0], arco.size[1] * 2], radius=arco.size[0] // 2, fill=255)
    im.paste(arco, (ax0, ay0), mascara)
    if not celular:
        cx, cy = ax0 - int(26 * u), int(alt * 0.78)
        d.rounded_rectangle([cx, cy, cx + int(84 * u), cy + int(34 * u)], radius=int(8 * u), fill=(255, 255, 255, 240) if claro else (28, 30, 40, 240))
        d.text((cx + int(8 * u), cy + int(11 * u)), "★★★★★", font=_g("DejaVuSans.ttf" if False else "Inter-700.ttf", 7 * u), fill=(245, 166, 20, 255), anchor="lm")
        d.text((cx + int(8 * u), cy + int(24 * u)), "4,9 no Google", font=_g("Inter-700.ttf", 8 * u), fill=tinta, anchor="lm")
    return im


def _arredonda(img: Image.Image, raio: int) -> Image.Image:
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.size[0], img.size[1]], radius=raio, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), m)
    return out


def gerar(ramo: str, preco: str, empresa: str = "") -> bytes:
    r = RAMOS.get(ramo) or RAMOS["padrao"]
    cor, cor2 = _hex(r["cor"]), _hex(r["cor2"])
    W, H = L * S, A * S
    img = _gradiente(W, H, (11, 13, 18, 255), (20, 22, 29, 255))
    _brilho(img, int(W * 0.88), int(H * 0.06), 520 * S, cor2, 130)
    _brilho(img, int(W * 0.02), int(H * 0.98), 460 * S, cor2, 80)
    d = ImageDraw.Draw(img)

    # selo do ramo
    f_pill = _f("Inter-700.ttf", 22)
    larg_pill = int(sum(d.textlength(c, font=f_pill) + 4.4 * S for c in r["pill"])) + 52 * S
    d.rounded_rectangle([64 * S, 64 * S, 64 * S + larg_pill, 122 * S], radius=14 * S, outline=cor, width=2 * S)
    _texto(d, (90 * S, 93 * S), r["pill"], f_pill, cor, espaco=4.4 * S, ancora="lm")

    # título
    d.text((64 * S, 146 * S), "Site para", font=_f("PlayfairDisplay-ExtraBold.ttf", 116), fill=(255, 255, 255, 255), anchor="la")
    tam_ramo = 84 if len(r["rotulo"]) > 14 else 116
    d.text((64 * S, 258 * S), r["rotulo"], font=_f("PlayfairDisplay-ExtraBoldItalic.ttf", tam_ramo), fill=cor, anchor="la")

    # faixa do preço
    inteiro, cent = _preco_partes(preco)
    f_rs, f_v, f_c = _f("PlayfairDisplay-ExtraBold.ttf", 46), _f("PlayfairDisplay-ExtraBold.ttf", 104), _f("PlayfairDisplay-ExtraBold.ttf", 44)
    f_t1, f_t2 = _f("Inter-800.ttf", 35), _f("Inter-700.ttf", 35)
    w_v = int(d.textlength(inteiro, font=f_v)) + int(d.textlength("," + cent, font=f_c))
    y0, y1 = 424 * S, 560 * S
    larg_faixa = 34 * S + int(d.textlength("R$", font=f_rs)) + 22 * S + w_v + 30 * S + 2 * S + 30 * S + int(max(d.textlength("só se você", font=f_t1), d.textlength("gostar do resultado", font=f_t2))) + 34 * S
    faixa = _gradiente(larg_faixa, y1 - y0, (58, 15, 26, 235), (92, 20, 36, 235), horizontal=False)
    img.alpha_composite(_arredonda(faixa, 18 * S), (64 * S, y0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([64 * S, y0, 64 * S + larg_faixa, y1], radius=18 * S, outline=cor2, width=2 * S)
    x = 64 * S + 34 * S
    d.text((x, y0 + 96 * S), "R$", font=f_rs, fill=(255, 255, 255, 255), anchor="ls")
    x += int(d.textlength("R$", font=f_rs)) + 22 * S
    d.text((x, y0 + 104 * S), inteiro, font=f_v, fill=(255, 255, 255, 255), anchor="ls")
    x += int(d.textlength(inteiro, font=f_v))
    d.text((x, y0 + 104 * S), "," + cent, font=f_c, fill=(255, 255, 255, 255), anchor="ls")
    x += int(d.textlength("," + cent, font=f_c)) + 30 * S
    d.line([(x, y0 + 24 * S), (x, y1 - 24 * S)], fill=(255, 255, 255, 70), width=2 * S)
    x += 30 * S
    d.text((x, y0 + 62 * S), "só se você", font=f_t1, fill=(255, 255, 255, 255), anchor="ls")
    d.text((x, y0 + 104 * S), "gostar do resultado", font=f_t2, fill=(255, 255, 255, 255), anchor="ls")

    # benefícios
    f_i = _f("Inter-700.ttf", 25)
    col_x = [64 * S, 548 * S]
    y_i = 596 * S
    for k, item in enumerate(r["itens"]):
        cx, cy = col_x[k % 2], y_i + (k // 2) * 78 * S
        d.ellipse([cx, cy + 4 * S, cx + 34 * S, cy + 38 * S], fill=cor)
        d.line([(cx + 9 * S, cy + 22 * S), (cx + 15 * S, cy + 28 * S), (cx + 26 * S, cy + 15 * S)], fill=(17, 17, 17, 255), width=4 * S, joint="curve")
        for i, linha in enumerate(_quebra(d, item, f_i, 410 * S)[:2]):
            d.text((cx + 50 * S, cy + 8 * S + i * 30 * S), linha, font=f_i, fill=(233, 236, 243, 255), anchor="la")

    # notebook + celular com o site de exemplo
    tx, ty, tw, th = 76 * S, 776 * S, 626 * S, 358 * S
    _brilho(img, tx + tw // 2, ty + th // 2, 300 * S, cor2, 70)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([tx - 12 * S, ty - 12 * S, tx + tw + 12 * S, ty + th + 16 * S], radius=18 * S, fill=(27, 29, 36, 255), outline=(58, 61, 72, 255), width=2 * S)
    tela = _arredonda(_site_de_exemplo(r, empresa, tw, th), 6 * S)
    img.alpha_composite(tela, (tx, ty))
    d = ImageDraw.Draw(img)
    base_y = ty + th + 16 * S
    d.rounded_rectangle([tx - 70 * S, base_y, tx + tw + 70 * S, base_y + 22 * S], radius=12 * S, fill=(176, 181, 192, 255))
    d.rounded_rectangle([tx + tw // 2 - 60 * S, base_y, tx + tw // 2 + 60 * S, base_y + 7 * S], radius=4 * S, fill=(120, 124, 134, 255))

    cx0, cy0, cw, ch = 706 * S, 746 * S, 236 * S, 420 * S
    d.rounded_rectangle([cx0 - 10 * S, cy0 - 10 * S, cx0 + cw + 10 * S, cy0 + ch + 10 * S], radius=40 * S, fill=(21, 23, 29, 255), outline=(58, 61, 72, 255), width=2 * S)
    cel = _arredonda(_site_de_exemplo(r, empresa, cw, ch, celular=True), 32 * S)
    img.alpha_composite(cel, (cx0, cy0))
    d = ImageDraw.Draw(img)

    # chamada para o WhatsApp
    cy_a, cy_b = 1216 * S, 1316 * S
    d.rounded_rectangle([64 * S, cy_a, (L - 64) * S, cy_b], radius=50 * S, fill=(11, 13, 18, 235), outline=cor, width=3 * S)
    f_c1 = _f("Inter-800.ttf", 36)
    t1, t2 = "Nos envie ", "uma mensagem"
    larg_cta = int(d.textlength(t1, font=f_c1) + d.textlength(t2, font=f_c1)) + 60 * S + 60 * S
    x = (W - larg_cta) // 2
    # ícone de conversa
    d.ellipse([x, cy_a + 22 * S, x + 56 * S, cy_a + 78 * S], fill=cor)
    d.polygon([(x + 6 * S, cy_a + 76 * S), (x + 10 * S, cy_a + 58 * S), (x + 22 * S, cy_a + 70 * S)], fill=cor)
    d.arc([x + 15 * S, cy_a + 32 * S, x + 41 * S, cy_a + 58 * S], 200, 340, fill=(17, 17, 17, 255), width=4 * S)
    x += 78 * S
    d.text((x, cy_a + 50 * S), t1, font=f_c1, fill=(255, 255, 255, 255), anchor="lm")
    x += int(d.textlength(t1, font=f_c1))
    d.text((x, cy_a + 50 * S), t2, font=f_c1, fill=cor, anchor="lm")
    x += int(d.textlength(t2, font=f_c1)) + 22 * S
    d.line([(x, cy_a + 50 * S), (x + 34 * S, cy_a + 50 * S)], fill=(255, 255, 255, 255), width=4 * S)
    d.line([(x + 22 * S, cy_a + 38 * S), (x + 34 * S, cy_a + 50 * S), (x + 22 * S, cy_a + 62 * S)], fill=(255, 255, 255, 255), width=4 * S, joint="curve")

    saida = img.convert("RGB").resize((L, A), Image.LANCZOS)
    buf = io.BytesIO()
    saida.save(buf, "PNG", optimize=True)
    return buf.getvalue()
