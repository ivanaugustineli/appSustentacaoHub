from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import init_db, get_db
from app.models import Atendimento, AtendimentoCreate, AtendimentoUpdate, AtendimentoResponse

app = FastAPI(title="Gerenciador de Atendimentos")

@app.on_event("startup")
async def on_startup():
    await init_db()

@app.get("/atendimentos", response_model=List[AtendimentoResponse])
async def list_atendimentos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Atendimento).order_by(Atendimento.id.desc()))
    return result.scalars().all()

@app.post("/atendimentos", response_model=AtendimentoResponse)
async def create_atendimento(atendimento: AtendimentoCreate, db: AsyncSession = Depends(get_db)):
    db_atendimento = Atendimento(**atendimento.model_dump())
    db.add(db_atendimento)
    await db.commit()
    await db.refresh(db_atendimento)
    return db_atendimento

@app.get("/atendimentos/{atendimento_id}", response_model=AtendimentoResponse)
async def get_atendimento(atendimento_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Atendimento).where(Atendimento.id == atendimento_id))
    db_atendimento = result.scalar_one_or_none()
    if db_atendimento is None:
        raise HTTPException(status_code=404, detail="Atendimento não encontrado")
    return db_atendimento

@app.put("/atendimentos/{atendimento_id}", response_model=AtendimentoResponse)
async def update_atendimento(atendimento_id: int, atendimento: AtendimentoUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Atendimento).where(Atendimento.id == atendimento_id))
    db_atendimento = result.scalar_one_or_none()
    if db_atendimento is None:
        raise HTTPException(status_code=404, detail="Atendimento não encontrado")
    
    update_data = atendimento.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_atendimento, key, value)
        
    await db.commit()
    await db.refresh(db_atendimento)
    return db_atendimento
