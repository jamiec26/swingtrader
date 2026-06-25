from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from engines.risk import calculate_risk

router = APIRouter(prefix="/risk", tags=["risk"])

class RiskCalcInputSchema(BaseModel):
    balance: float
    risk_pct: float
    entry: float
    stop: float
    t1: float
    t2: float
    t3: float
    leverage: int = 1
    multiplier: float = 1.0

class RiskCalcResultSchema(BaseModel):
    units: float
    exposure: float
    margin_req: float
    risk_usd: float
    dollar_risk: float
    stop_distance: float
    rr_t1: float
    rr_t2: float
    rr_t3: float
    reward_t1: float
    reward_t2: float
    reward_t3: float

@router.post("/calculate", response_model=RiskCalcResultSchema)
def run_calculate_risk(data: RiskCalcInputSchema):
    return calculate_risk(
        balance=data.balance,
        risk_pct=data.risk_pct,
        entry=data.entry,
        stop=data.stop,
        t1=data.t1,
        t2=data.t2,
        t3=data.t3,
        leverage=data.leverage,
        multiplier=data.multiplier
    )
