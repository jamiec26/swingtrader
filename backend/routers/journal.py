from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/journal", tags=["journal"])

class JournalEntrySchema(BaseModel):
    id: int
    plan_id: int
    ticker: string = "" # we will map below
    direction: str
    entry: float
    stop: float
    t1: float
    exit_price: Optional[float] = None
    exit_ts: Optional[str] = None
    result_r: Optional[float] = None
    pnl_usd: Optional[float] = None
    outcome: str
    hold_days: Optional[int] = None
    notes: str
    screenshot_path: Optional[str] = None
    created_at: str

    class Config:
        orm_mode = True
        from_attributes = True

# Overwrite types import string issue
from pydantic import Field

class JournalEntrySchema(BaseModel):
    id: int
    plan_id: int
    ticker: str
    direction: str
    entry: float
    stop: float
    t1: float
    exit_price: Optional[float] = None
    exit_ts: Optional[str] = None
    result_r: Optional[float] = None
    pnl_usd: Optional[float] = None
    outcome: str
    hold_days: Optional[int] = None
    notes: str
    screenshot_path: Optional[str] = None
    created_at: str

    class Config:
        orm_mode = True
        from_attributes = True

class JournalEntryUpdateSchema(BaseModel):
    exit_price: Optional[float] = None
    exit_ts: Optional[str] = None
    result_r: Optional[float] = None
    pnl_usd: Optional[float] = None
    outcome: Optional[str] = None
    hold_days: Optional[int] = None
    notes: Optional[str] = None
    screenshot_path: Optional[str] = None

@router.get("", response_model=List[JournalEntrySchema])
def list_journal(db: Session = Depends(get_db)):
    return db.query(models.JournalEntry).order_by(models.JournalEntry.id.desc()).all()

@router.put("/{id}", response_model=JournalEntrySchema)
def update_journal_entry(id: int, data: JournalEntryUpdateSchema, db: Session = Depends(get_db)):
    entry = db.query(models.JournalEntry).filter(models.JournalEntry.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    update_data = data.dict(exclude_unset=True)
    
    # Recalculate R and PnL if exit_price is provided and not already manually set
    if "exit_price" in update_data and update_data["exit_price"] is not None:
        exit_px = update_data["exit_price"]
        stop_dist = abs(entry.entry - entry.stop)
        
        if stop_dist > 0:
            dir_mult = 1.0 if entry.direction == "bull" else -1.0
            r_mult = ((exit_px - entry.entry) * dir_mult) / stop_dist
            
            if "result_r" not in update_data or update_data["result_r"] is None:
                update_data["result_r"] = float(round(r_mult, 2))
                
            if "pnl_usd" not in update_data or update_data["pnl_usd"] is None:
                # Retrieve risk_usd from the linked TradePlan if it exists
                risk_usd = 1000.0 # fallback default risk
                plan = db.query(models.TradePlan).filter(models.TradePlan.id == entry.plan_id).first()
                if plan:
                    risk_usd = plan.risk_usd
                update_data["pnl_usd"] = float(round(r_mult * risk_usd, 2))
                
        # Set exit timestamp if not provided
        if "exit_ts" not in update_data or update_data["exit_ts"] is None:
            import datetime
            update_data["exit_ts"] = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")

    for key, value in update_data.items():
        setattr(entry, key, value)
        
    db.commit()
    db.refresh(entry)
    return entry
