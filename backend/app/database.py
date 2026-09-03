from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, String, Integer, Boolean, JSON, Float

import os

if os.getenv("VERCEL") == "1":
    DATABASE_URL = "sqlite+aiosqlite:////tmp/leadsage.db"
else:
    DATABASE_URL = "sqlite+aiosqlite:///./leadsage.db"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

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
    contactability = Column(Integer, nullable=True)
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
    for table in (DBLead.__tablename__, DBSearchHistory.__tablename__):
        rows = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
        if not rows:
            continue
        existing = {r[1] for r in rows}
        for column in Base.metadata.tables[table].columns:
            if column.name in existing:
                continue
            ddl = column.type.compile(conn.dialect)
            conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column.name} {ddl}")


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
