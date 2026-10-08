from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, String, Integer, Boolean, JSON, Float, Text

import os
import uuid

from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool


def url_do_banco(env=None) -> str:
    """O banco do sistema.

    `DATABASE_URL` (Postgres, por exemplo o Supabase) e o banco de verdade. Sem ela, SQLite:
    em arquivo no computador de quem desenvolve e em /tmp na Vercel, onde some a cada
    reinicio, o que so serve de reserva.
    """
    env = os.environ if env is None else env
    url = (env.get("DATABASE_URL") or "").strip()
    if url:
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        if url.startswith("postgresql://"):
            url = "postgresql+asyncpg://" + url[len("postgresql://"):]
        return url
    if env.get("VERCEL") == "1":
        return "sqlite+aiosqlite:////tmp/leadsage.db"
    return "sqlite+aiosqlite:///./leadsage.db"


def _criar_engine(url: str):
    if not url.startswith("postgresql"):
        return create_async_engine(url, echo=False)
    u = make_url(url)
    # asyncpg nao aceita ?sslmode=...; o SSL vai por connect_args
    u = u.set(query={k: v for k, v in u.query.items() if k not in ("sslmode", "pgbouncer", "supa")})
    local = (u.host or "") in ("localhost", "127.0.0.1", "::1")
    return create_async_engine(
        u,
        echo=False,
        # funcao serverless: uma conexao por chamada, sem pool guardado entre invocacoes
        poolclass=NullPool,
        connect_args={
            **({} if local else {"ssl": "require"}),
            # o pooler do Supabase (pgbouncer, modo transacao) nao guarda comandos preparados
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4().hex}__",
        },
    )


DATABASE_URL = url_do_banco()
EH_POSTGRES = DATABASE_URL.startswith("postgresql")
engine = _criar_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

def chave_do_lead(uid: str, lead_id: str) -> str:
    """Chave de armazenamento do lead. O id publico e o do Google (place id),
    igual para todo mundo que achar o mesmo negocio; sem o prefixo do dono,
    a busca de um usuario sobrescrevia o registro de outro."""
    return f"{uid}::{lead_id}"


def chaves_do_lead(uid: str, lead_id: str) -> list:
    """A chave nova e a antiga (sem prefixo), para ler registros ja gravados."""
    return [chave_do_lead(uid, lead_id), lead_id]


def id_publico(chave: str) -> str:
    return (chave or "").split("::", 1)[-1]


class DBLead(Base):
    __tablename__ = "leads"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    avatar = Column(String)
    role = Column(String)
    niche = Column(String)
    company = Column(String)
    location = Column(String)
    city = Column(String)
    email = Column(String)
    phone = Column(String)
    whatsapp = Column(Boolean, nullable=True)
    website = Column(String, nullable=True)
    address = Column(String, nullable=True)
    socials = Column(JSON, nullable=True)
    quality_score = Column(Integer)
    verified = Column(Boolean, default=True)
    bio = Column(String, nullable=True)
    ai_summary = Column(String, nullable=True)
    match_intent = Column(String, nullable=True)
    match_location = Column(String, nullable=True)
    match_business = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    opportunityScore = Column(Integer, nullable=True)
    missingDigitalAssets = Column(JSON, nullable=True)
    outreach_status = Column(String, default="Pendente")
    last_contacted_at = Column(String, nullable=True)
    last_message = Column(String, nullable=True)
    match_category = Column(String, nullable=True)
    pipeline_stage = Column(String, default="Novos")
    # Dados reais do Google Maps
    rating = Column(Float, nullable=True)
    rating_count = Column(Integer, nullable=True)
    maps_url = Column(String, nullable=True)
    business_status = Column(String, nullable=True)
    opening_hours = Column(String, nullable=True)
    all_emails = Column(JSON, nullable=True)
    phones_extra = Column(JSON, nullable=True)
    contactability = Column(Integer, nullable=True)
    # Camada rica do Google. Nula quando a conta nao libera os campos.
    opening_hours_week = Column(JSON, nullable=True)
    open_now = Column(Boolean, nullable=True)
    neighborhood = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    street = Column(String, nullable=True)
    short_address = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    place_types = Column(JSON, nullable=True)
    google_description = Column(String, nullable=True)
    price_level = Column(String, nullable=True)
    price_tier = Column(Integer, nullable=True)
    reviews_sample = Column(JSON, nullable=True)
    review_highlight = Column(String, nullable=True)
    praise_count = Column(Integer, nullable=True)
    complaint_count = Column(Integer, nullable=True)
    # Diagnostico do site atual do lead
    site_status = Column(String, nullable=True)
    site_quality = Column(Integer, nullable=True)
    site_issues = Column(JSON, nullable=True)
    site_platform = Column(String, nullable=True)
    site_responsive = Column(Boolean, nullable=True)
    site_https = Column(Boolean, nullable=True)
    site_load_ms = Column(Integer, nullable=True)
    site_has_booking = Column(Boolean, nullable=True)
    site_has_form = Column(Boolean, nullable=True)
    site_title = Column(String, nullable=True)
    # Leitura comercial pronta para a IA e para a tela
    hooks = Column(JSON, nullable=True)
    diagnosis = Column(String, nullable=True)
    best_channel = Column(String, nullable=True)
    owner_uid = Column(String, index=True, nullable=True)
    search_id = Column(String, index=True, nullable=True)

class DBSearchHistory(Base):
    __tablename__ = "search_history"
    
    id = Column(String, primary_key=True, index=True)
    niche = Column(String)
    location = Column(String)
    total_leads = Column(Integer)
    timestamp = Column(String)
    leads_preview = Column(JSON, nullable=True)
    owner_uid = Column(String, index=True, nullable=True)

def _migrate(conn):
    """Acrescenta colunas novas em bancos que ja existem.

    create_all() cria tabelas ausentes mas nunca altera as existentes,
    entao um leadsage.db antigo quebraria ao gravar os campos novos.
    """
    if conn.dialect.name != "sqlite":
        return  # banco novo ja nasce com todas as colunas (create_all)
    for table in (DBLead.__tablename__, DBSearchHistory.__tablename__, DBSite.__tablename__):
        rows = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
        if not rows:
            continue
        existing = {r[1] for r in rows}
        for column in Base.metadata.tables[table].columns:
            if column.name in existing:
                continue
            ddl = column.type.compile(conn.dialect)
            conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column.name} {ddl}")


class DBUserProfile(Base):
    """Perfil por usuario para o dev local.

    Em producao o perfil vai para o Firestore; aqui fica o fallback,
    no lugar da variavel global que todos os usuarios compartilhavam.
    """
    __tablename__ = "user_profiles"

    uid = Column(String, primary_key=True, index=True)
    data = Column(JSON, nullable=True)


class DBSite(Base):
    """Sites gerados pelo usuario.

    Antes o HTML gerado so existia no useState da tela: ao sair, sumia,
    e "Meus Sites" era um estado vazio permanente.
    """
    __tablename__ = "sites"

    id = Column(String, primary_key=True, index=True)
    owner_uid = Column(String, index=True)
    company = Column(String)
    template = Column(String, nullable=True)
    lead_id = Column(String, nullable=True)
    html = Column(Text, nullable=True)
    # Os campos do construtor, para reabrir o site e editar. O HTML
    # sozinho nao da: ele e o resultado, nao a fonte.
    builder_data = Column(Text, nullable=True)
    # Endereco publico do site. Leva um sufixo aleatorio: da para
    # mandar o link para o prospect, mas nao para adivinhar o do
    # concorrente.
    slug = Column(String, index=True, nullable=True)
    created_at = Column(String)
    updated_at = Column(String, nullable=True)


class DBIntegration(Base):
    """Credenciais de envio por usuario (SMTP, webhook).

    Antes o modal de Integracoes so exibia "Configuracoes salvas com
    sucesso!" e fechava, sem gravar nada: o SMTP do usuario nunca chegava
    ao backend e todo e-mail caia no modo simulado.
    """
    __tablename__ = "integrations"

    uid = Column(String, primary_key=True, index=True)
    data = Column(JSON, nullable=True)


class DBDocument(Base):
    """Documentos do usuario criados a partir dos modelos.

    Antes as telas de Propostas e Contratos so exibiam texto com um botao
    de copiar: nao dava para preencher, salvar nem voltar depois.
    """
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    owner_uid = Column(String, index=True)
    kind = Column(String, index=True)        # proposta | contrato
    template_id = Column(String, nullable=True)
    title = Column(String)
    content = Column(Text)
    fields = Column(JSON, nullable=True)     # valores preenchidos nos [CAMPOS]
    lead_id = Column(String, nullable=True)
    created_at = Column(String)
    updated_at = Column(String)


class DBRobo(Base):
    """Robo de atendimento: conexao com a Meta e conversas.

    Um registro por documento, como no Firestore. `tipo` separa os dois:
    'canal' (chave = gancho da URL do webhook) e 'conversa' (chave =
    uid:conversa). Tabela unica porque no dev local isto so precisa
    espelhar o Firestore, nao ser consultado de forma relacional.
    """
    __tablename__ = "robo"

    chave = Column(String, primary_key=True, index=True)
    uid = Column(String, index=True)
    tipo = Column(String, index=True)
    data = Column(JSON)
    atualizado = Column(String, index=True)


class DBOrder(Base):
    """Pedido de compra de creditos.

    Existe para que o credito NUNCA seja concedido pelo frontend. O
    pedido nasce pendente, o provedor confirma por webhook assinado, e so
    entao o saldo muda.

    `provider_event` guarda o id do evento do provedor: webhook e
    reenviado quando falha, e sem isso a mesma compra creditaria duas
    vezes.
    """
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True)
    owner_uid = Column(String, index=True)
    package_id = Column(String)
    tipo = Column(String, default="recarga")   # plano | recarga
    credits = Column(Integer)
    sites = Column(Integer, default=0)
    amount_cents = Column(Integer)
    currency = Column(String, default="BRL")
    status = Column(String, default="pending", index=True)   # pending|paid|failed|expired
    provider = Column(String, nullable=True)
    provider_ref = Column(String, index=True, nullable=True)  # id da cobranca
    provider_event = Column(String, index=True, nullable=True)
    created_at = Column(String)
    paid_at = Column(String, nullable=True)


class DBCredito(Base):
    """Saldo de creditos por usuario (quando o banco do sistema e SQL e nao o Firestore)."""
    __tablename__ = "creditos"

    uid = Column(String, primary_key=True, index=True)
    credits = Column(Integer, default=0)
    role = Column(String, default="user")
    created_at = Column(String)


class DBCreditoHistorico(Base):
    __tablename__ = "creditos_historico"

    id = Column(String, primary_key=True)
    uid = Column(String, index=True)
    description = Column(String)
    amount = Column(Integer)
    type = Column(String)
    timestamp = Column(String, index=True)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
