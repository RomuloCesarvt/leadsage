import asyncio, httpx
from app import rede_segura as r

def test_bloqueia_rede_interna():
    for u in ("http://127.0.0.1/", "http://localhost:8000/", "http://169.254.169.254/latest/meta-data/",
              "http://10.0.0.5/", "http://[::1]/", "file:///etc/passwd", "ftp://x.com/"):
        assert not r.destino_publico(u), u

def test_cliente_recusa_interno_e_nao_levanta_para_quem_captura():
    async def go():
        async with httpx.AsyncClient(event_hooks=r.ganchos()) as c:
            try:
                await c.get("http://127.0.0.1:9/")
            except httpx.RequestError as e:
                return "bloqueado" in str(e)
        return False
    assert asyncio.run(go())
