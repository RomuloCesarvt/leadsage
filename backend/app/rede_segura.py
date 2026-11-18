"""Trava contra SSRF para quem abre sites de terceiros (leads).

O servidor baixa paginas cujo endereco vem do lead/cliente. Sem checagem,
um endereco como http://169.254.169.254/ ou http://localhost:xxxx/ faria o
backend ler a rede interna. A checagem roda em CADA requisicao, inclusive
nos redirecionamentos (um 302 para 127.0.0.1 driblaria uma checagem so na
URL inicial).
"""
import asyncio
import ipaddress
import socket
from urllib.parse import urlparse

import httpx


def destino_publico(url: str) -> bool:
    try:
        p = urlparse(url)
        host = (p.hostname or "").lower()
        if p.scheme not in ("http", "https") or not host:
            return False
        if host == "localhost" or host.endswith(".internal") or host.endswith(".local"):
            return False
        for info in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(info[4][0])
            if (ip.is_private or ip.is_loopback or ip.is_link_local
                    or ip.is_reserved or ip.is_multicast or ip.is_unspecified):
                return False
        return True
    except Exception:
        return False


async def _conferir(request: httpx.Request) -> None:
    if not await asyncio.to_thread(destino_publico, str(request.url)):
        raise httpx.RequestError("Destino interno bloqueado.", request=request)


def ganchos() -> dict:
    """Para `httpx.AsyncClient(event_hooks=ganchos())`."""
    return {"request": [_conferir]}
