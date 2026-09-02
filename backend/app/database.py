from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, String, Integer, Boolean, JSON

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

class DBSearchHistory(Base):
    __tablename__ = "search_history"
    
    id = Column(String, primary_key=True, index=True)
    niche = Column(String)
    location = Column(String)
    total_leads = Column(Integer)
    timestamp = Column(String)
    leads_preview = Column(JSON, nullable=True)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
