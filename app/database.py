import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///data/atendimentos.db")

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with async_session() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            from sqlalchemy import text
            result = await conn.execute(text("PRAGMA table_info(atendimentos)"))
            columns = [row[1] for row in result.fetchall()]
            if "atenSituacaoAtual" not in columns:
                await conn.execute(text('ALTER TABLE atendimentos ADD COLUMN atenSituacaoAtual VARCHAR'))
        except Exception as e:
            print(f"Nota: migracao de coluna pode ja existir: {e}")
