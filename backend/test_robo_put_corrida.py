import asyncio
from app import robo_store


def test_put_duas_vezes_ao_mesmo_tempo_nao_estoura(monkeypatch):
    """Simula a corrida: a 1ª leitura não vê a linha, mas outro já a criou -> IntegrityError -> atualiza."""
    from sqlalchemy.exc import IntegrityError
    estado = {"commits": 0, "rollbacks": 0, "linha": None}

    class Linha:
        data = {}
        atualizado = ""

    class Res:
        def __init__(self, v): self.v = v
        def scalar_one_or_none(self): return self.v

    class Sessao:
        def __init__(self): self.novo = None
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def execute(self, *_):
            # 1ª tentativa: ninguém viu a linha ainda; 2ª: a outra gravação já criou
            return Res(Linha() if estado["commits"] else None)
        def add(self, o): self.novo = o
        async def commit(self):
            estado["commits"] += 1
            if self.novo is not None and estado["commits"] == 1:
                raise IntegrityError("x", {}, Exception("duplicate key"))
        async def rollback(self): estado["rollbacks"] += 1

    monkeypatch.setattr(robo_store, "AsyncSessionLocal", lambda: Sessao())
    asyncio.run(robo_store._sql_put("k", "u", "conversa", {"a": 1}))
    assert estado["rollbacks"] == 1 and estado["commits"] == 2
