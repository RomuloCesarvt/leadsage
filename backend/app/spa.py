"""Serve o app (o frontend já compilado) pelo próprio servidor.

Na Vercel o app era estático e a API era uma função. Numa hospedagem comum (Render) um serviço só entrega os dois: este módulo responde
tudo o que NÃO é da API com o arquivo compilado, e cai no index.html para as rotas da tela (o app troca de tela sem recarregar).
Só liga quando existe a pasta compilada (LEADSAGE_DIST); sem ela (dev, testes) nada muda.
"""
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse

# o que a Vercel reescrevia em vercel.json
PAGINAS = {
    "privacidade": "privacidade.html",
    "lp": "lp.html",
    "inicio": "lp.html",
    "termos": "termos.html",
    "exclusao-de-dados": "exclusao-de-dados.html",
}
# o que NÃO pode ficar em cache: o navegador precisa ver a versão nova a cada deploy
SEM_CACHE = {"index.html", "sw.js", "manifest.webmanifest"}


def pasta_do_app(pasta: Optional[str] = None) -> Optional[Path]:
    caminho = (pasta or os.getenv("LEADSAGE_DIST") or "").strip()
    if not caminho:
        return None
    raiz = Path(caminho).resolve()
    return raiz if (raiz / "index.html").is_file() else None


def arquivo_da_rota(raiz: Path, caminho: str) -> Path:
    """Qual arquivo responde esta rota: a página fixa, o arquivo que existe ou o index.html (nunca sai da pasta do app)."""
    limpo = caminho.strip("/")
    if limpo in PAGINAS:
        return raiz / PAGINAS[limpo]
    if limpo:
        alvo = (raiz / limpo).resolve()
        if alvo.is_file() and raiz in alvo.parents:
            return alvo
    return raiz / "index.html"


def montar(app: FastAPI, pasta: Optional[str] = None) -> bool:
    """Registra a rota que entrega o app. Chamar DEPOIS de todas as rotas da API (o que vem antes tem prioridade)."""
    raiz = pasta_do_app(pasta)
    if raiz is None:
        return False

    @app.api_route("/{caminho:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def entregar_app(caminho: str):
        topo = caminho.strip("/").split("/", 1)[0]
        if topo in ("api", "s"):          # rota da API ou do site publicado que não existe: erro de verdade, não a tela do app
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        arquivo = arquivo_da_rota(raiz, caminho)
        resposta = FileResponse(arquivo)
        if arquivo.name in SEM_CACHE or arquivo.suffix == ".html":
            resposta.headers["Cache-Control"] = "no-cache"
        elif "assets" in arquivo.parts:    # arquivos com hash no nome: nunca mudam
            resposta.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return resposta

    return True
