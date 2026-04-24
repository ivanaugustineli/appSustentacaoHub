from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Atendimento(Base):
    __tablename__ = "atendimentos"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Grupo 1: Dados Principais
    atenNumeroPrimario = Column(String, nullable=True)
    atenNumeroSecundario = Column(String, nullable=True)
    atenTitulo = Column(String, nullable=True)
    atenDataAbertura = Column(DateTime, nullable=True)
    atenDataRecepcao = Column(DateTime, nullable=True)
    atenAnalistaCliente = Column(String, nullable=True)
    atenAnalistaInterno = Column(String, nullable=True)
    atenSituacaoAtual = Column(String, nullable=True)

    # Grupo 2: Dados Complementares
    atenDescricao = Column(String, nullable=True)
    atenCausa = Column(String, nullable=True)
    atenSolucao = Column(String, nullable=True)
    atenObservacao = Column(String, nullable=True)

    # Grupo 3: Dados da Solução
    atenTipo = Column(String, nullable=True)
    atenVertical = Column(String, nullable=True)
    atenSistema = Column(String, nullable=True)
    atenTipoOcorrencia = Column(String, nullable=True)
    atenTipoSolucao = Column(String, nullable=True)
    atenDataLimite = Column(DateTime, nullable=True)

# Pydantic Schemas

class AtendimentoBase(BaseModel):
    atenNumeroPrimario: Optional[str] = None
    atenNumeroSecundario: Optional[str] = None
    atenTitulo: Optional[str] = None
    atenDataAbertura: Optional[datetime] = None
    atenDataRecepcao: Optional[datetime] = None
    atenAnalistaCliente: Optional[str] = None
    atenAnalistaInterno: Optional[str] = None
    atenSituacaoAtual: Optional[str] = None
    
    atenDescricao: Optional[str] = None
    atenCausa: Optional[str] = None
    atenSolucao: Optional[str] = None
    atenObservacao: Optional[str] = None

    atenTipo: Optional[str] = None
    atenVertical: Optional[str] = None
    atenSistema: Optional[str] = None
    atenTipoOcorrencia: Optional[str] = None
    atenTipoSolucao: Optional[str] = None
    atenDataLimite: Optional[datetime] = None

class AtendimentoCreate(AtendimentoBase):
    pass

class AtendimentoUpdate(AtendimentoBase):
    pass

class AtendimentoResponse(AtendimentoBase):
    id: int

    class Config:
        from_attributes = True
