# -*- coding: utf-8 -*-
"""Gera os icones do app a partir da marca do LeadSage.

Loja e navegador pedem PNG em varios tamanhos, e o icone "maskable" do
Android e recortado em circulo, losango ou squircle conforme o aparelho —
desenho que encosta na borda perde pedaco. Por isso o maskable sai menor,
dentro da zona segura, sobre fundo solido.

O desenho e o mesmo de src/components/Logo.tsx: pino de mapa com barras
crescendo dentro. Se a marca mudar la, rode este script de novo:

    cd frontend && python scripts/gerar-icones.py
"""
import os
from PIL import Image, ImageDraw

AZUL = (37, 99, 235, 255)      # #2563eb
AMBAR = (245, 158, 11, 255)    # #f59e0b
BRANCO = (255, 255, 255, 255)

ESCALA = 8  # desenha grande e reduz: bordas suaves sem antialias proprio


def desenhar_marca(lado: int, fundo=None, ocupacao: float = 1.0) -> Image.Image:
    """A marca num quadrado de `lado` px.

    `ocupacao` encolhe o desenho dentro do quadrado — 0.6 deixa a folga
    que o recorte do Android exige.
    """
    tela = Image.new("RGBA", (lado * ESCALA, lado * ESCALA), fundo or (0, 0, 0, 0))
    d = ImageDraw.Draw(tela)

    # O SVG original vive num viewBox 48x48.
    u = lado * ESCALA * ocupacao / 48.0
    margem = (lado * ESCALA - 48 * u) / 2

    def p(x, y):
        return (margem + x * u, margem + y * u)

    # Corpo do pino: circulo (centro 24,20 raio 17) + a ponta.
    d.ellipse([p(7, 3), p(41, 37)], fill=AZUL)
    # A ponta encosta no circulo nos pontos de tangencia calculados a
    # partir do apice (24, 44.6); ligar direto ao centro deixaria um
    # degrau visivel na juncao.
    d.polygon([p(11.72, 31.75), p(24, 44.6), p(36.28, 31.75)], fill=AZUL)

    # As tres barras. A mais alta em ambar, como no rodape das propostas.
    vazado = fundo if fundo else BRANCO
    barras = [
        (15.4, 23.0, 7.0, vazado),
        (21.6, 18.6, 11.4, vazado),
        (27.8, 13.6, 16.4, AMBAR),
    ]
    for x, y, altura, cor in barras:
        d.rounded_rectangle(
            [p(x, y), p(x + 4.8, y + altura)],
            radius=1.3 * u,
            fill=cor,
        )

    return tela.resize((lado, lado), Image.LANCZOS)


def main() -> None:
    destino = "public"
    os.makedirs(destino, exist_ok=True)

    saidas = [
        # navegador e instalacao padrao: fundo transparente
        ("icon-192.png", 192, None, 1.0),
        ("icon-512.png", 512, None, 1.0),
        # Android recorta a seu gosto: fundo solido e desenho recuado
        ("icon-maskable-512.png", 512, BRANCO, 0.6),
        # iOS nao respeita transparencia: sempre fundo solido
        ("apple-touch-icon.png", 180, BRANCO, 0.78),
    ]

    for nome, lado, fundo, ocupacao in saidas:
        img = desenhar_marca(lado, fundo, ocupacao)
        caminho = os.path.join(destino, nome)
        img.save(caminho, "PNG", optimize=True)
        print(f"  {caminho}  {lado}x{lado}  {os.path.getsize(caminho) // 1024} KB")


if __name__ == "__main__":
    main()
