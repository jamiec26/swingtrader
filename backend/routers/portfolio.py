from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from pydantic import BaseModel
from typing import List, Dict, Any
from engines.risk import calculate_portfolio_heat
from adapters.yfinance_adapter import fetch_history
from routers.account import get_or_create_default_account

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

class PortfolioPositionSchema(BaseModel):
    ticker: str
    direction: str
    entry: float
    stop: float
    units: float
    current_price: float
    unrealized_pnl: float
    risk_usd: float
    risk_pct: float
    sector: str

class PortfolioHeatSchema(BaseModel):
    raw_heat: float
    adjusted_heat: float
    max_heat: float
    positions: List[PortfolioPositionSchema]
    sector_weights: Dict[str, float]
    correlation_warnings: List[str]
    budget_ok: bool

def get_sector_for_ticker(db: Session, ticker: str) -> str:
    sym = db.query(models.Symbol).filter(models.Symbol.ticker == ticker.upper()).first()
    if sym and sym.sector:
        return sym.sector
    
    tech = ["AAPL", "MSFT", "NVDA", "AMD", "TSLA", "COIN"]
    financials = ["JPM", "GS", "BAC", "MS"]
    energy = ["XOM", "CVX", "COP"]
    metals = ["GLD", "SLV", "GDX"]
    crypto = ["BTCUSD", "ETHUSD", "BTC-USD", "ETH-USD"]
    
    t = ticker.upper().strip()
    if t in tech:
        return "Technology"
    if t in financials:
        return "Financials"
    if t in energy:
        return "Energy"
    if t in metals:
        return "Materials"
    if t in crypto:
        return "Crypto"
    return "Technology"

@router.get("/heat", response_model=PortfolioHeatSchema)
def get_portfolio_heat_endpoint(db: Session = Depends(get_db)):
    account = get_or_create_default_account(db)
    
    # Query all open journal entries representing active trades
    open_entries = db.query(models.JournalEntry).filter(models.JournalEntry.outcome == "open").all()
    
    positions = []
    for entry in open_entries:
        # Load linked trade plan details
        plan = db.query(models.TradePlan).filter(models.TradePlan.id == entry.plan_id).first()
        if not plan:
            continue
            
        # Fetch current price (get last bar close)
        history = fetch_history(entry.ticker)
        current_price = entry.entry # default
        if history:
            current_price = history[-1]["c"]
            
        # PnL calculation
        dir_mult = 1.0 if entry.direction == "bull" else -1.0
        unrealized_pnl = (current_price - entry.entry) * plan.units * dir_mult
        
        sector = get_sector_for_ticker(db, entry.ticker)
        
        positions.append({
            "ticker": entry.ticker,
            "direction": entry.direction,
            "entry": entry.entry,
            "stop": entry.stop,
            "units": plan.units,
            "current_price": current_price,
            "unrealized_pnl": round(unrealized_pnl, 2),
            "risk_usd": plan.risk_usd,
            "risk_pct": plan.risk_pct,
            "sector": sector
        })
        
    return calculate_portfolio_heat(
        balance=account.balance,
        positions=positions,
        max_heat=account.max_heat
    )
