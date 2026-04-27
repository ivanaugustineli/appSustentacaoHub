from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import csv
import io
import re
import json
import os
from datetime import datetime

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

@app.delete("/atendimentos/{atendimento_id}")
async def delete_atendimento(atendimento_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Atendimento).where(Atendimento.id == atendimento_id))
    db_atendimento = result.scalar_one_or_none()
    if db_atendimento is None:
        raise HTTPException(status_code=404, detail="Atendimento não encontrado")
    
    await db.delete(db_atendimento)
    await db.commit()
    return {"detail": "Atendimento excluído com sucesso"}

# AJ12: Gerenciamento de Configuração Global (.SHconfig)
CONFIG_FILE = "data/.SHconfig"

@app.get("/config")
async def get_config():
    if not os.path.exists(CONFIG_FILE):
        return {}
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Erro ao ler config: {e}")
        return {}

@app.post("/config")
async def save_config(config: dict):
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=4, ensure_ascii=False)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar config: {e}")

def parse_date(date_str):
    if not date_str or date_str.strip() == "":
        return None
    # Limpar possíveis aspas ou espaços extras
    date_str = date_str.strip().replace('"', '')
    formats = ["%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y %H:%M:%S", "%m/%d/%Y %I:%M:%S %p"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None

def extract_priority(priority_str):
    if not priority_str:
        return None
    priority_str = str(priority_str).strip()
    if priority_str and priority_str[0].isdigit():
        return int(priority_str[0])
    return None

@app.post("/importar")
async def importar_atendimentos(
    layout: str = Form(...),
    file: UploadFile = File(...),
    ignorar_finalizados: bool = Form(False),
    db: AsyncSession = Depends(get_db)
):
    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded = content.decode("iso-8859-1")
        except UnicodeDecodeError:
            decoded = content.decode("utf-8", errors="ignore")
            
    reader = csv.DictReader(io.StringIO(decoded), delimiter=';')
    
    # Se o delimitador não for ponto e vírgula, tenta vírgula
    if len(reader.fieldnames) <= 1:
        reader = csv.DictReader(io.StringIO(decoded), delimiter=',')

    stats = {"inseridos": 0, "atualizados": 0, "ignorados": 0, "erros": 0, "detalhes_erros": []}
    
    if layout not in ["INC", "PRB", "RITM", "Geral"]:
        return {"detail": "Layout inválido", "erros": 1, "detalhes_erros": [f"O layout '{layout}' não é suportado."]}
    
    for i, row in enumerate(reader, start=1):
        try:
            # AJ14: Limpa espaços em branco dos nomes das colunas
            row = {k.strip(): v for k, v in row.items() if k is not None}
            
            data = {}
            # ... (mapping logic remains the same)
            # Para economizar espaço, vou assumir que o bloco de layout está correto e focar no try/except
            if layout == "INC":
                # ... 
                num = row.get("number")
                data["atenNumeroPrimario"] = num
                data["atenNumeroSecundario"] = ""
                data["atenTitulo"] = row.get("short_description")
                data["atenDataAbertura"] = parse_date(row.get("opened_at"))
                data["atenSituacaoAtual"] = row.get("state")
                data["atenAnalistaCliente"] = row.get("assigned_to")
                data["atenDescricao"] = row.get("cmdb_ci")
                data["atenPrioridade"] = extract_priority(row.get("priority"))
                data["atenTipo"] = "INC"
                
            elif layout == "PRB":
                num = row.get("number")
                data["atenNumeroPrimario"] = num
                data["atenNumeroSecundario"] = ""
                data["atenTitulo"] = row.get("short_description")
                data["atenDataAbertura"] = parse_date(row.get("opened_at"))
                data["atenSituacaoAtual"] = row.get("state")
                data["atenAnalistaCliente"] = row.get("assigned_to")
                data["atenDescricao"] = row.get("cmdb_ci")
                data["atenPrioridade"] = extract_priority(row.get("priority"))
                data["atenTipo"] = "PRB"
                
            elif layout == "RITM":
                num = row.get("number")
                data["atenNumeroPrimario"] = row.get("parent")
                data["atenNumeroSecundario"] = num
                data["atenTitulo"] = row.get("short_description")
                data["atenDataAbertura"] = parse_date(row.get("opened_at"))
                data["atenSituacaoAtual"] = row.get("state")
                data["atenAnalistaCliente"] = row.get("assigned_to")
                data["atenDescricao"] = row.get("cmdb_ci")
                data["atenPrioridade"] = extract_priority(row.get("priority"))
                data["atenTipo"] = "RITM" if "RITM" in (num or "") else "SCTASK"
                
            elif layout == "Geral":
                title = row.get("Title", "")
                nums = re.findall(r'(INC\d+|PRB\d+|RITM\d+|SCTASK\d+)', title)
                primary = ""
                secondary = ""
                for n in nums:
                    if n.startswith(("INC", "PRB", "RITM")):
                        primary = n
                    elif n.startswith("SCTASK"):
                        secondary = n
                
                data["atenNumeroPrimario"] = primary
                data["atenNumeroSecundario"] = secondary
                clean_title = title
                for n in nums:
                    clean_title = clean_title.replace(f"{n} - ", "").replace(n, "")
                data["atenTitulo"] = clean_title.strip()
                data_abertura = parse_date(row.get("Data de Abertura"))
                #data["atenDataAbertura"] = data_abertura // Mantem a data de abertura dos arquivos do ServiceNow.
                data["atenDataRecepcao"] = data_abertura
                
                # RA11: Pegar apenas a informação a partir da esquerda antes de " <"
                assigned_to = row.get("Assigned To", "")
                data["atenAnalistaInterno"] = assigned_to.split(" <")[0].strip() if assigned_to else None
                data["atenSituacaoAtual"] = row.get("State")
                data["atenVertical"] = row.get("Vertical")
                data["atenSistema"] = row.get("Sistema")
                data["atenTipoOcorrencia"] = row.get("Tipo de Ocorrência")
                data["atenTipo"] = row.get("Tipo de Atendimento")
                data["atenTipoSolucao"] = row.get("Tipo de Solução")
                data["atenDataLimite"] = parse_date(row.get("Data Limite"))

            # RA13: Ignorar Atendimentos Finalizados se checkbox marcado (Apenas layout Geral)
            if layout == "Geral" and ignorar_finalizados and data.get("atenSituacaoAtual") == "Finalizado":
                stats["ignorados"] += 1
                continue

            p = data.get("atenNumeroPrimario", "")
            s = data.get("atenNumeroSecundario", "")
            
            # Validação básica de campos obrigatórios se necessário
            if not p:
                 stats["detalhes_erros"].append(f"Linha {i}: Número Primário ausente.")
                 stats["erros"] += 1
                 continue

            result = await db.execute(
                select(Atendimento).where(Atendimento.atenNumeroPrimario == p, Atendimento.atenNumeroSecundario == s)
            )
            existing = result.scalar_one_or_none()
            
            if not existing:
                new_atendimento = Atendimento(**data)
                db.add(new_atendimento)
                stats["inseridos"] += 1
            else:
                has_diff = False
                for key, val in data.items():
                    current_val = getattr(existing, key)
                    if isinstance(val, datetime) and isinstance(current_val, datetime):
                        if val.replace(microsecond=0) != current_val.replace(microsecond=0):
                            has_diff = True
                            setattr(existing, key, val)
                    elif str(val) != str(current_val) and val is not None:
                        has_diff = True
                        setattr(existing, key, val)
                
                if has_diff:
                    stats["atualizados"] += 1
                else:
                    stats["ignorados"] += 1
                    
        except Exception as e:
            stats["detalhes_erros"].append(f"Linha {i}: {str(e)}")
            stats["erros"] += 1

    await db.commit()
    return stats
