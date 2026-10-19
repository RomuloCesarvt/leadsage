"""Varios bancos SQL gratuitos com troca automatica: se um cai (ou estoura a cota), o sistema segue no proximo.

Configuracao (Vercel, Environment Variables), em ordem de preferencia:
    DATABASE_URL      o principal (por exemplo Supabase)
    DATABASE_URL_2    o reserva 1 (por exemplo Neon)
    DATABASE_URL_3    o reserva 2 ...
    ou DATABASE_URLS  varias conexoes separadas por virgula ou espaco

O primeiro que responde e o usado. Falhou (conexao recusada, cota, fora do ar)? Fica fora por 60 segundos e o proximo assume;
passado esse tempo, o principal volta a ser tentado. Sem nenhuma conexao, usa SQLite (so serve de reserva em desenvolvimento).

Cada banco recebe as mesmas tabelas. Os dados gravados enquanto o principal esteve fora ficam no reserva; `scripts/sincronizar_bancos.py`
copia de um para o outro quando quiser juntar.
"""
import asyncio
import os
import re
import time
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import event
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

FORA_S = 60.0  # quanto tempo um banco que falhou fica de lado
FORA_POR_COTA_S = 1800.0  # cota esgotada ("exceeded the quota") nao volta em um minuto: nao fica tentando e derrubando requisicoes
TEMPO_DE_CONEXAO_S = 8  # nao esperar 60 s por um banco que nao responde


def _normalizar(url: str) -> str:
    url = (url or "").strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    return url


def urls_dos_bancos(env=None) -> List[str]:
    """Todas as conexoes configuradas, na ordem de preferencia, sem repetir."""
    env = os.environ if env is None else env
    brutas: List[str] = [env.get("DATABASE_URL") or ""]
    for i in range(2, 9):
        brutas.append(env.get(f"DATABASE_URL_{i}") or "")
    for item in (env.get("DATABASE_URLS") or "").replace(",", " ").split():
        brutas.append(item)
    # bancos ligados pela aba Storage da Vercel (Neon, Supabase...) chegam com estes nomes
    brutas.append(env.get("POSTGRES_URL") or "")
    brutas.append(env.get("POSTGRES_PRISMA_URL") or "")
    # com prefixo (NEON_DATABASE_URL, SUPA_POSTGRES_URL...): quando ha mais de um banco ligado pela Vercel
    for chave in sorted(env):
        if re.fullmatch(r"[A-Z][A-Z0-9]*_(DATABASE|POSTGRES)_URL", chave):
            brutas.append(env.get(chave) or "")
    vistas: List[str] = []
    for u in (_normalizar(x) for x in brutas):
        if u and u not in vistas:
            vistas.append(u)
    if vistas:
        return vistas
    if env.get("VERCEL") == "1":
        return ["sqlite+aiosqlite:////tmp/leadsage.db"]
    return ["sqlite+aiosqlite:///./leadsage.db"]


def _criar_engine(url: str):
    if not url.startswith("postgresql"):
        return create_async_engine(url, echo=False)
    u = make_url(url)
    # asyncpg nao aceita ?sslmode=...; o SSL vai por connect_args
    u = u.set(query={k: v for k, v in u.query.items() if k not in ("sslmode", "pgbouncer", "supa", "channel_binding")})
    local = (u.host or "") in ("localhost", "127.0.0.1", "::1")
    return create_async_engine(
        u,
        echo=False,
        # funcao serverless: uma conexao por chamada, sem pool guardado entre invocacoes
        poolclass=NullPool,
        connect_args={
            **({} if local else {"ssl": "require"}),
            "timeout": TEMPO_DE_CONEXAO_S,
            # o pooler do Supabase (pgbouncer, modo transacao) nao guarda comandos preparados
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4().hex}__",
        },
    )


class Fonte:
    def __init__(self, url: str, numero: int):
        self.url = url
        self.numero = numero
        self.engine = _criar_engine(url)
        self.fora_ate = 0.0
        self.ultimo_erro = ""
        # falha ao conectar ou conexao derrubada: este banco sai de cena por um tempo
        event.listen(self.engine.sync_engine, "handle_error", self._ao_falhar)

    def _ao_falhar(self, ctx) -> None:
        conectando = getattr(ctx, "connection", None) is None
        if conectando or getattr(ctx, "is_disconnect", False) or _erro_de_cota_ou_rede(ctx.original_exception):
            self.marcar_fora(str(ctx.original_exception))

    def marcar_fora(self, motivo: str = "") -> None:
        cota = any(t in (motivo or "").lower() for t in ("exceeded the quota", "upgrade your plan", "quota exceeded", "too many connections"))
        self.fora_ate = time.monotonic() + (FORA_POR_COTA_S if cota else FORA_S)
        self.ultimo_erro = (motivo or "")[:160]

    @property
    def disponivel(self) -> bool:
        return time.monotonic() >= self.fora_ate

    @property
    def tipo(self) -> str:
        return "postgres" if self.url.startswith("postgresql") else "sqlite"


def _erro_de_cota_ou_rede(exc: Optional[BaseException]) -> bool:
    texto = f"{type(exc).__name__} {exc}".lower()
    return any(p in texto for p in (
        "quota", "too many connections", "connection refused", "timeout", "timed out", "could not connect", "connectiondoesnotexist",
        "cannot connect", "name or service not known", "ssl", "terminating connection", "no pg_hba", "password authentication",
        "database is full", "disk full", "read-only",
    ))


class _SyncSession(Session):
    """A sessao pergunta aqui, a cada operacao, qual banco usar: o primeiro disponivel."""

    def get_bind(self, mapper=None, clause=None, bind=None, **kw):
        return CONJUNTO.escolher().engine.sync_engine

    def _connection_for_bind(self, engine, *args, **kwargs):
        """Abrir a conexao e o ponto em que um banco fora do ar aparece: ele sai de cena e o proximo assume, na mesma chamada."""
        try:
            return super()._connection_for_bind(engine, *args, **kwargs)
        except Exception as exc:
            atual = CONJUNTO.por_engine(engine)
            if atual is None or len(CONJUNTO.fontes) < 2:
                raise
            atual.marcar_fora(f"{type(exc).__name__}: {exc}")
            ultimo: BaseException = exc
            for outra in CONJUNTO.fontes:
                if outra is atual or not outra.disponivel:
                    continue
                try:
                    return super()._connection_for_bind(outra.engine.sync_engine, *args, **kwargs)
                except Exception as exc2:
                    outra.marcar_fora(f"{type(exc2).__name__}: {exc2}")
                    ultimo = exc2
            raise ultimo


class Conjunto:
    def __init__(self, urls: List[str]):
        self.fontes = [Fonte(u, i + 1) for i, u in enumerate(urls)]

    def escolher(self) -> Fonte:
        for f in self.fontes:
            if f.disponivel:
                return f
        # todos fora: tenta de novo o que ficou fora ha mais tempo, em vez de parar tudo
        return min(self.fontes, key=lambda f: f.fora_ate)

    def tem_postgres(self) -> bool:
        return any(f.tipo == "postgres" and f.disponivel for f in self.fontes)

    def por_engine(self, sync_engine) -> Optional[Fonte]:
        for f in self.fontes:
            if f.engine.sync_engine is sync_engine:
                return f
        return None

    @property
    def principal(self) -> Fonte:
        return self.fontes[0]

    async def preparar(self, criar) -> List[Dict[str, Any]]:
        """Cria as tabelas em cada banco que responde. `criar(engine)` e uma corrotina. Devolve o estado de cada um."""
        estado = []
        for f in self.fontes:
            try:
                await asyncio.wait_for(criar(f.engine), timeout=TEMPO_DE_CONEXAO_S + 12)
                f.fora_ate = 0.0
                f.ultimo_erro = ""
            except Exception as exc:  # um banco fora nao impede os outros de subir
                f.marcar_fora(f"{type(exc).__name__}: {exc}")
            estado.append(f.estado())
        return estado

    def estado(self) -> List[Dict[str, Any]]:
        ativo = self.escolher()
        return [f.estado(ativo is f) for f in self.fontes]


def _estado(self: Fonte, ativo: bool = False) -> Dict[str, Any]:
    return {"numero": self.numero, "tipo": self.tipo, "ok": self.disponivel, "ativo": ativo, "erro": self.ultimo_erro if not self.disponivel else ""}


Fonte.estado = _estado  # type: ignore[attr-defined]

CONJUNTO = Conjunto(urls_dos_bancos())


def criar_fabrica_de_sessoes():
    return sessionmaker(class_=AsyncSession, sync_session_class=_SyncSession, expire_on_commit=False)
