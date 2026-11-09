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
    "terapeuta": dict(rotulo="terapeutas e psicólogos", pill="SITE PARA TERAPEUTAS E PSICÓLOGOS", cor="#cfe3c6", cor2="#6f9a6b", claro=True,
                      manchete=["Um espaço seguro", "para cuidar de você"], botao="Agendar consulta",
                      itens=["Agendamento de consultas pelo WhatsApp", "Um ambiente acolhedor, também online", "Sua abordagem em destaque", "Perfeito no celular"],
                      palavras=("terapeut", "psicolog", "psicanal", "psiquiat", "terapia")),
    "arquitetura": dict(rotulo="arquitetos e engenheiros", pill="SITE PARA ARQUITETOS E ENGENHEIROS", cor="#ffb27a", cor2="#e8590c", claro=False,
                        manchete=["Projetos que", "falam por você"], botao="Pedir orçamento",
                        itens=["Portfólio de projetos em destaque", "Pedido de orçamento pelo WhatsApp", "Obras e projetos com fotos", "Perfeito no celular"],
                        palavras=("arquitet", "engenh", "construtora", "reforma", "paisag", "interiores")),
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


def _assinar(ramo: str, preco: str, empresa: str, arte: int = 1) -> str:
    return hmac.new(_chave(), f"{ramo}|{preco}|{empresa}|{arte}".encode(), hashlib.sha256).hexdigest()[:24]


def assinatura_valida(ramo: str, preco: str, empresa: str, sig: str, arte: int = 1) -> bool:
    return hmac.compare_digest(_assinar(ramo, preco, empresa, arte), sig or "")


def url_do_card(ramo: str, preco: str, empresa: str = "", arte: int = 1) -> str:
    """O endereço público do PNG deste card (o WhatsApp e a Meta buscam a imagem por ele)."""
    empresa = (empresa or "").strip()[:40]
    preco = str(preco).strip()[:12]
    return (f"{settings.APP_URL.rstrip('/')}/api/card-promocao.png?ramo={quote(ramo)}&preco={quote(preco)}"
            f"&empresa={quote(empresa)}&arte={int(arte)}&sig={_assinar(ramo, preco, empresa, arte)}")


def midia_do_card(ramo: str, preco: str, empresa: str = "", arte: int = 1) -> Dict[str, str]:
    return {"url": url_do_card(ramo, preco, empresa, arte), "mime": "image/png", "nome": "promocao.png"}


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


def _gerar_desenhado(ramo: str, preco: str, empresa: str = "") -> bytes:
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


# ---------------------------------------------------------------- artes sobre foto (placas)
# Cada ramo pode ter uma PLACA: a foto de fundo (cenário do ramo, notebook e celular com o site, espaço livre no alto), feita uma vez
# com IA de imagem e guardada em `placas/<ramo>.jpg`. O sistema escreve por cima o texto e o valor, com 3 estilos de arte para escolher.
def _tx(d: ImageDraw.ImageDraw, xy, txt: str, font=None, fill=(255, 255, 255, 255), anchor: str = "la") -> None:
    """Texto sobre a foto: leve contorno escuro nos textos claros, para ler sobre qualquer ponto da imagem."""
    claro = sum(fill[:3]) > 330
    d.text(xy, txt, font=font, fill=fill, anchor=anchor, stroke_width=(S if claro else 0), stroke_fill=(0, 0, 0, 110))


PASTA_PLACAS = os.path.join(os.path.dirname(__file__), "placas")
ARTES = (1, 2, 3)


def tem_placa(ramo: str) -> bool:
    return os.path.exists(os.path.join(PASTA_PLACAS, f"{ramo}.jpg"))


def artes_disponiveis(ramo: str) -> int:
    return len(ARTES) if tem_placa(ramo) else 1


DESCE_FOTO = {"restaurante": 0, "academia": 100}      # quanto a foto desce na arte (padrão 150): o notebook não pode ficar sob o botão
FOCO_X = {"barbearia": 0.5, "restaurante": 0.6, "academia": 0.52, "terapeuta": 0.62, "arquitetura": 0.55}   # onde ficam o notebook e o celular na foto


def _corte_do_cenario(im: Image.Image) -> int:
    """Alguns fundos vêm com uma faixa vazia no alto, emendada por uma linha dura: devolve a linha onde o cenário de verdade começa."""
    cinza = im.convert("L").resize((im.width // 4, im.height // 4))
    px = list(cinza.getdata())
    w, h = cinza.size
    melhor, y_melhor = 0.0, 0
    for y in range(8, int(h * 0.55)):
        dif = sum(abs(px[y * w + x] - px[(y - 1) * w + x]) for x in range(w)) / w
        if dif > melhor:
            melhor, y_melhor = dif, y
    return y_melhor * 4 if melhor > 20 else int(im.height * 0.2)


def _placa(ramo: str) -> Image.Image:
    """A foto no pé da arte, grande (o notebook e o celular em destaque), e o alto da arte fundido com a cor da própria foto: sem faixa vazia."""
    foto = Image.open(os.path.join(PASTA_PLACAS, f"{ramo}.jpg")).convert("RGB")
    foto = foto.crop((0, _corte_do_cenario(foto), foto.width, foto.height))
    # largura da foto na arte: um pouco maior que a arte, para o aparelho ficar grande; recorte centrado no notebook
    esc = max(1.22 * L / foto.width, 880 / foto.height)
    foto = foto.resize((int(foto.width * esc), int(foto.height * esc)), Image.LANCZOS)
    cx = int(foto.width * FOCO_X.get(ramo, 0.5))
    x0 = max(0, min(foto.width - L, cx - L // 2))
    foto = foto.crop((x0, 0, x0 + L, foto.height)).convert("RGBA")
    y_foto = A - foto.height + DESCE_FOTO.get(ramo, 150)          # desce a foto: o notebook fica abaixo da fileira de benefícios
    tela = Image.new("RGBA", (L, A), (10, 12, 18, 255))
    if y_foto > 0:
        # o alto da arte é a continuação desfocada da própria cena (espelhada e borrada), com a mesma luz: não há faixa chapada
        faixa = foto.crop((0, 0, L, 40)).resize((L, y_foto + 340), Image.BILINEAR)
        tela.paste(faixa.filter(ImageFilter.GaussianBlur(40)), (0, 0))
    mascara = Image.new("L", foto.size, 255)
    dm = ImageDraw.Draw(mascara)
    for y in range(min(300, foto.height)):
        dm.line([(0, y), (L, y)], fill=int(255 * (y / 300) ** 1.2))
    tela.paste(foto, (0, y_foto), mascara)
    return tela


def _vinheta(img: Image.Image, topo: int, base: int, forca_topo: int = 200, forca_base: int = 190) -> None:
    sombra = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(sombra)
    for y in range(topo):
        d.line([(0, y), (L, y)], fill=(6, 8, 14, int(forca_topo * (1 - y / topo) ** 1.4)))
    for y in range(base):
        d.line([(0, A - 1 - y), (L, A - 1 - y)], fill=(6, 8, 14, int(forca_base * (1 - y / base) ** 1.4)))
    img.alpha_composite(sombra)


def _centro(d: ImageDraw.ImageDraw, y: int, txt: str, fonte, cor, ancora: str = "ms") -> int:
    _tx(d, (L * S // 2, y), txt, font=fonte, fill=cor, anchor=ancora)
    return int(d.textlength(txt, font=fonte))


OURO_CLARO, OURO_ESCURO = (250, 232, 170), (196, 146, 52)


def _ouro(img: Image.Image, xy, txt: str, fonte, anchor: str = "ls", brilho: bool = True) -> int:
    """Texto com degradê de ouro (claro em cima, escuro embaixo) e um brilho suave atrás. Devolve a largura."""
    caixa = ImageDraw.Draw(Image.new("L", (1, 1))).textbbox(xy, txt, font=fonte, anchor=anchor)
    pad = 40 * S
    x0, y0, x1, y1 = caixa[0] - pad, caixa[1] - pad, caixa[2] + pad, caixa[3] + pad
    w, h = x1 - x0, y1 - y0
    mascara = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mascara).text((xy[0] - x0, xy[1] - y0), txt, font=fonte, fill=255, anchor=anchor)
    if brilho:
        halo = Image.new("RGBA", (w, h), OURO_ESCURO + (0,))
        halo.putalpha(mascara.filter(ImageFilter.GaussianBlur(10 * S)).point(lambda v: int(v * 0.55)))
        img.alpha_composite(halo, (x0, y0))
    grad = Image.new("RGBA", (w, h))
    gd = ImageDraw.Draw(grad)
    topo, base = caixa[1] - y0, caixa[3] - y0
    for yy in range(h):
        t = min(1, max(0, (yy - topo) / max(1, base - topo)))
        cor = tuple(int(OURO_CLARO[k] + (OURO_ESCURO[k] - OURO_CLARO[k]) * t) for k in range(3))
        gd.line([(0, yy), (w, yy)], fill=cor + (255,))
    img.paste(grad, (x0, y0), mascara)
    return caixa[2] - caixa[0]


def _vidro(img: Image.Image, caixa, raio: int, borda=(236, 196, 104), alfa: int = 70) -> None:
    """Painel de vidro fosco: desfoca o que está atrás, clareia de leve e põe um fio dourado na borda."""
    x0, y0, x1, y1 = [int(v) for v in caixa]
    fundo = img.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(16 * S))
    escuro = Image.new("RGBA", fundo.size, (8, 12, 26, 150))
    fundo.alpha_composite(escuro)
    fundo.alpha_composite(Image.new("RGBA", fundo.size, (255, 255, 255, int(alfa * 0.25))))
    m = Image.new("L", fundo.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, fundo.size[0] - 1, fundo.size[1] - 1], radius=raio, fill=255)
    img.paste(fundo, (x0, y0), m)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([x0, y0, x1, y1], radius=raio, outline=borda + (255,), width=2 * S)


def _icone(d: ImageDraw.ImageDraw, tipo: int, cx: int, cy: int, r: int, cor) -> None:
    """Quatro ícones de traço: conversa, estrela, escudo com visto e celular."""
    w = max(2, int(r * 0.1))
    if tipo == 0:
        d.ellipse([cx - r, cy - r, cx + r, cy + r * 0.9], outline=cor, width=w)
        d.polygon([(cx - r * 0.85, cy + r * 0.55), (cx - r * 1.1, cy + r * 1.15), (cx - r * 0.35, cy + r * 0.8)], fill=cor)
        d.arc([cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.35], 200, 340, fill=cor, width=w)
    elif tipo == 1:
        pts = []
        import math
        for k in range(10):
            ang = -math.pi / 2 + k * math.pi / 5
            rad = r * (1.0 if k % 2 == 0 else 0.42)
            pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
        d.polygon(pts, outline=cor, width=w)
    elif tipo == 2:
        d.polygon([(cx, cy - r), (cx + r * 0.85, cy - r * 0.55), (cx + r * 0.75, cy + r * 0.35), (cx, cy + r), (cx - r * 0.75, cy + r * 0.35), (cx - r * 0.85, cy - r * 0.55)], outline=cor, width=w)
        d.line([(cx - r * 0.35, cy), (cx - r * 0.05, cy + r * 0.3), (cx + r * 0.4, cy - r * 0.25)], fill=cor, width=w, joint="curve")
    else:
        d.rounded_rectangle([cx - r * 0.55, cy - r, cx + r * 0.55, cy + r], radius=int(r * 0.22), outline=cor, width=w)
        d.line([(cx - r * 0.15, cy + r * 0.72), (cx + r * 0.15, cy + r * 0.72)], fill=cor, width=w)


def _beneficios(img: Image.Image, itens: List[str], cor, y: int) -> None:
    """Os quatro benefícios numa fileira: ícone de traço dourado e uma frase de duas linhas embaixo (conversa, estrela, escudo, celular)."""
    sombra = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rectangle([0, (y - 20) * S, L * S, (y + 196) * S], fill=(6, 10, 22, 150))
    img.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(34 * S)))
    d = ImageDraw.Draw(img)
    f = _g("Inter-700.ttf", 27 * S)
    larg_col = (L - 2 * 40) // 4
    for k, item in enumerate(itens[:4]):
        cx = (40 + larg_col * k + larg_col // 2) * S
        _icone(d, k, cx, (y + 36) * S, 36 * S, OURO_CLARO + (255,))
        for i, linha in enumerate(_quebra(d, item, f, (larg_col - 6) * S)[:3]):
            _tx(d, (cx, (y + 100 + i * 33) * S), linha, font=f, fill=(255, 255, 255, 255), anchor="mm")


def _botao_whats(img: Image.Image, cor, cor2, y: int, texto: str = "Nos envie uma mensagem") -> None:
    """O botão de chamada: degradê da cor do ramo, brilho embaixo, ícone de conversa e seta."""
    d = ImageDraw.Draw(img)
    f = _g("Inter-800.ttf", 40 * S)
    larg = int(d.textlength(texto, font=f)) + 230 * S
    x0 = (L * S - larg) // 2
    alt = 112 * S
    luz = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(luz).rounded_rectangle([x0, y * S + 18 * S, x0 + larg, y * S + alt + 18 * S], radius=alt // 2, fill=cor2 + (150,))
    img.alpha_composite(luz.filter(ImageFilter.GaussianBlur(20 * S)))
    grad = _gradiente(larg, alt, tuple(int(c * 0.78) for c in cor2) + (255,), tuple(int(c * 0.55) for c in cor2) + (255,))
    img.alpha_composite(_arredonda(grad, alt // 2), (x0, y * S))
    d = ImageDraw.Draw(img)
    escuro = (255, 255, 255, 255)
    cy = y * S + alt // 2
    _icone(d, 0, x0 + 78 * S, cy - 3 * S, 27 * S, escuro)
    d.text((x0 + 128 * S, cy), texto, font=f, fill=escuro, anchor="lm")
    xs = x0 + larg - 64 * S
    d.line([(xs - 18 * S, cy), (xs + 12 * S, cy)], fill=escuro, width=4 * S)
    d.line([(xs, cy - 12 * S), (xs + 12 * S, cy), (xs, cy + 12 * S)], fill=escuro, width=4 * S, joint="curve")


def _gerar_sobre_placa(ramo: str, preco: str, empresa: str, arte: int) -> bytes:
    r = RAMOS.get(ramo) or RAMOS["padrao"]
    cor, cor2 = _hex(r["cor"])[:3], _hex(r["cor2"])[:3]
    img = _placa(ramo).resize((L * S, A * S), Image.LANCZOS)
    inteiro, cent = _preco_partes(preco)
    _vinheta_s(img, 470, 260)
    d = ImageDraw.Draw(img)
    branco = (255, 255, 255, 255)
    serif, serif_i = "PlayfairDisplay-SemiBold.ttf", "PlayfairDisplay-SemiBoldItalic.ttf"

    if arte == 1:
        # o padrão: título grande, faixa azul-marinho com borda dourada e o valor em ouro, ícones dourados, aparelhos e botão
        _tx(d, (L * S // 2, 178 * S), "Site para", font=_g("PlayfairDisplay-ExtraBold.ttf", 152 * S), fill=branco, anchor="ms")
        claro = tuple(int(c * 0.4 + 255 * 0.6) for c in cor) + (255,)
        tam = 80 if len(r["rotulo"]) > 22 else (96 if len(r["rotulo"]) > 16 else 128)
        _tx(d, (L * S // 2, (300 if tam > 100 else 280) * S), r["rotulo"], font=_g(serif_i, tam * S), fill=claro, anchor="ms")
        f_v, f_rs, f_c = _g("PlayfairDisplay-ExtraBold.ttf", 122 * S), _g("PlayfairDisplay-ExtraBold.ttf", 60 * S), _g("PlayfairDisplay-ExtraBold.ttf", 58 * S)
        w = int(d.textlength("R$ ", font=f_rs) + d.textlength(inteiro, font=f_v) + d.textlength("," + cent, font=f_c))
        larg_faixa = max(w, int(d.textlength("só se você gostar do resultado", font=_g("Inter-600.ttf", 36 * S)))) + 130 * S
        x0 = (L * S - larg_faixa) // 2
        y0, y1 = 352 * S, 590 * S
        halo = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(halo).rounded_rectangle([x0 - 4 * S, y0 - 4 * S, x0 + larg_faixa + 4 * S, y1 + 4 * S], radius=30 * S, outline=OURO_ESCURO + (255,), width=10 * S)
        img.alpha_composite(halo.filter(ImageFilter.GaussianBlur(14 * S)))
        faixa = _gradiente(larg_faixa, y1 - y0, (10, 22, 62, 246), (8, 18, 52, 246))
        img.alpha_composite(_arredonda(faixa, 28 * S), (x0, y0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([x0, y0, x0 + larg_faixa, y1], radius=28 * S, outline=OURO_ESCURO + (255,), width=4 * S)
        d.rounded_rectangle([x0 + 9 * S, y0 + 9 * S, x0 + larg_faixa - 9 * S, y1 - 9 * S], radius=22 * S, outline=OURO_CLARO + (150,), width=2 * S)
        x = (L * S - w) // 2
        x += _ouro(img, (x, 476 * S), "R$ ", f_rs)
        x += _ouro(img, (x, 476 * S), inteiro, f_v)
        _ouro(img, (x, 476 * S), "," + cent, f_c)
        d = ImageDraw.Draw(img)
        _centro(d, 552 * S, "só se você gostar do resultado", _g("Inter-600.ttf", 36 * S), branco)
        _beneficios(img, r["itens"], cor, 628)
        _botao_whats(img, cor, cor2, 1214)

    elif arte == 2:
        # valor em destaque, ouro gigante; benefícios logo abaixo
        f_pill = _g("Inter-700.ttf", 25 * S)
        larg_pill = int(sum(d.textlength(c, font=f_pill) + 4.5 * S for c in r["pill"])) + 64 * S
        x0 = (L * S - larg_pill) // 2
        d.rounded_rectangle([x0, 64 * S, x0 + larg_pill, 126 * S], radius=31 * S, outline=OURO_ESCURO + (255,), width=3 * S, fill=(8, 10, 18, 150))
        _texto(d, (x0 + 32 * S, 95 * S), r["pill"], f_pill, OURO_CLARO + (255,), espaco=4.5 * S, ancora="lm")
        f_v, f_rs = _g(serif, 250 * S), _g(serif, 78 * S)
        w = int(d.textlength("R$ ", font=f_rs) + d.textlength(inteiro, font=f_v))
        x = (L * S - w) // 2
        x += _ouro(img, (x, 336 * S), "R$ ", f_rs)
        _ouro(img, (x, 392 * S), inteiro, f_v)
        d = ImageDraw.Draw(img)
        _centro(d, 462 * S, "valor fixo, sem pegadinha", _g("Inter-800.ttf", 42 * S), branco)
        _centro(d, 514 * S, "só paga se gostar do resultado", _g("Inter-600.ttf", 34 * S), (226, 231, 244, 255))
        _beneficios(img, r["itens"], cor, 572)
        _botao_whats(img, cor, cor2, 1214, "Quero ver o meu site")

    else:
        # selo dourado ao lado do título, benefícios em fileira
        _tx(d, (64 * S, 168 * S), "Seu site", font=_g(serif, 100 * S), fill=branco, anchor="ls")
        _tx(d, (64 * S, 278 * S), "profissional", font=_g(serif_i, 100 * S), fill=tuple(int(c * 0.35 + 255 * 0.65) for c in cor) + (255,), anchor="ls")
        _tx(d, (64 * S, 330 * S), r["pill"].replace("SITE PARA ", "para ").lower(), font=_g("Inter-700.ttf", 31 * S), fill=(240, 243, 250, 255), anchor="ls")
        cx, cy, rr = 852 * S, 252 * S, 152 * S
        luz = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(luz).ellipse([cx - rr, cy - rr + 16 * S, cx + rr, cy + rr + 16 * S], fill=(0, 0, 0, 150))
        img.alpha_composite(luz.filter(ImageFilter.GaussianBlur(18 * S)))
        selo = _gradiente(rr * 2, rr * 2, OURO_CLARO + (255,), OURO_ESCURO + (255,))
        m = Image.new("L", selo.size, 0)
        ImageDraw.Draw(m).ellipse([0, 0, rr * 2 - 1, rr * 2 - 1], fill=255)
        img.paste(selo, (cx - rr, cy - rr), m)
        d = ImageDraw.Draw(img)
        d.ellipse([cx - rr + 13 * S, cy - rr + 13 * S, cx + rr - 13 * S, cy + rr - 13 * S], outline=(110, 74, 16, 255), width=3 * S)
        tinta = (58, 38, 6, 255)
        d.text((cx, cy - 88 * S), "POR APENAS", font=_g("Inter-800.ttf", 24 * S), fill=tinta, anchor="mm")
        d.text((cx, cy - 10 * S), "R$" + inteiro, font=_g(serif, (80 if len(inteiro) <= 3 else 62) * S), fill=tinta, anchor="mm")
        d.text((cx, cy + 66 * S), "só se gostar", font=_g("Inter-800.ttf", 27 * S), fill=tinta, anchor="mm")
        d.text((cx, cy + 98 * S), "do resultado", font=_g("Inter-800.ttf", 27 * S), fill=tinta, anchor="mm")
        _beneficios(img, r["itens"], cor, 480)
        _botao_whats(img, cor, cor2, 1214)

    saida = img.convert("RGB").resize((L, A), Image.LANCZOS)
    buf = io.BytesIO()
    saida.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def _vinheta_s(img: Image.Image, topo: int, base: int) -> None:
    """Escurece o alto e o pé da foto (na escala S) para o texto ficar legível."""
    sombra = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(sombra)
    for y in range(topo * S):
        d.line([(0, y), (img.width, y)], fill=(6, 8, 14, int(150 * (1 - y / (topo * S)) ** 1.2)))
    for y in range(base * S):
        d.line([(0, img.height - 1 - y), (img.width, img.height - 1 - y)], fill=(6, 8, 14, int(170 * (1 - y / (base * S)) ** 1.3)))
    img.alpha_composite(sombra)


def gerar(ramo: str, preco: str, empresa: str = "", arte: int = 1) -> bytes:
    """O card: sobre a foto do ramo (3 estilos de arte) quando há placa; senão o card desenhado pelo sistema."""
    if tem_placa(ramo):
        return _gerar_sobre_placa(ramo, preco, empresa, arte if arte in ARTES else 1)
    return _gerar_desenhado(ramo, preco, empresa)
