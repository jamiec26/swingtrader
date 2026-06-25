import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/plans", tags=["plans"])

class TradePlanCreateSchema(BaseModel):
    signal_id: int
    account_id: int
    direction: str
    ticker: str
    entry: float
    stop: float
    t1: float
    t2: float
    t3: float
    units: float
    exposure: float
    margin_req: float
    risk_pct: float
    risk_usd: float
    rr_t1: float
    rr_t2: float
    rr_t3: float
    notes: Optional[str] = ""

class TradePlanSchema(BaseModel):
    id: int
    signal_id: int
    account_id: int
    direction: str
    ticker: str
    entry: float
    stop: float
    t1: float
    t2: float
    t3: float
    units: float
    exposure: float
    margin_req: float
    risk_pct: float
    risk_usd: float
    rr_t1: float
    rr_t2: float
    rr_t3: float
    notes: str
    created_at: str

    class Config:
        orm_mode = True
        from_attributes = True

@router.post("", response_model=TradePlanSchema)
def create_plan(data: TradePlanCreateSchema, db: Session = Depends(get_db)):
    # Verify signal exists
    signal = db.query(models.Signal).filter(models.Signal.id == data.signal_id).first()
    if not signal:
        # If signal does not exist in DB (e.g. running in simple/mock way), we will create it or ignore FK check
        pass

    now_str = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    
    plan = models.TradePlan(
        signal_id=data.signal_id,
        account_id=data.account_id,
        direction=data.direction,
        ticker=data.ticker,
        entry=data.entry,
        stop=data.stop,
        t1=data.t1,
        t2=data.t2,
        t3=data.t3,
        units=data.units,
        exposure=data.exposure,
        margin_req=data.margin_req,
        risk_pct=data.risk_pct,
        risk_usd=data.risk_usd,
        rr_t1=data.rr_t1,
        rr_t2=data.rr_t2,
        rr_t3=data.rr_t3,
        notes=data.notes,
        created_at=now_str
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    # Automatically spawn a corresponding JournalEntry
    journal = models.JournalEntry(
        plan_id=plan.id,
        ticker=plan.ticker,
        direction=plan.direction,
        entry=plan.entry,
        stop=plan.stop,
        t1=plan.t1,
        exit_price=None,
        exit_ts=None,
        result_r=None,
        pnl_usd=None,
        outcome="open",
        hold_days=None,
        notes=plan.notes or f"Opened from Trade Plan #{plan.id}",
        created_at=now_str
    )
    db.add(journal)
    db.commit()

    return plan

@router.get("", response_model=List[TradePlanSchema])
def list_plans(db: Session = Depends(get_db)):
    return db.query(models.TradePlan).order_by(models.TradePlan.id.desc()).all()

@router.get("/{id}", response_model=TradePlanSchema)
def get_plan(id: int, db: Session = Depends(get_db)):
    plan = db.query(models.TradePlan).filter(models.TradePlan.id == id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Trade plan not found")
    return plan

@router.get("/{id}/export")
def export_plan_markdown(id: int, db: Session = Depends(get_db)):
    plan = db.query(models.TradePlan).filter(models.TradePlan.id == id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Trade plan not found")
        
    markdown_content = f"""# Kagi Workstation Trade Plan: {plan.ticker} ({plan.direction.upper()})
Created: {plan.created_at}

## Position Parameters
- **Direction**: {plan.direction.upper()}
- **Entry Trigger**: {plan.entry:.4f}
- **Stop Loss**: {plan.stop:.4f}
- **Planned Targets**:
  - Target 1: {plan.t1:.4f} ({plan.rr_t1:.2f}R)
  - Target 2: {plan.t2:.4f} ({plan.rr_t2:.2f}R)
  - Target 3: {plan.t3:.4f} ({plan.rr_t3:.2f}R)

## Sizing & Risk Allocation
- **Units**: {plan.units:.4f}
- **Notional Exposure**: ${plan.exposure:,.2f}
- **Margin Required**: ${plan.margin_req:,.2f}
- **Risk Budget**: {plan.risk_pct:.2f}% (${plan.risk_usd:,.2f})

## Catalyst Notes
{plan.notes or "No notes added."}
"""
    return {"markdown": markdown_content}
