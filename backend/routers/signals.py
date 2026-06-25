from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np
from engines.kagi import construct_kagi
from adapters.yfinance_adapter import fetch_history

router = APIRouter(prefix="/signals", tags=["signals"])

class ConfidenceFactorsSchema(BaseModel):
    trend_strength: float
    volume_confirmation: float
    historical_win_rate: float
    mtf_alignment: float
    breakout_cleanliness: float

class SignalSchema(BaseModel):
    id: int
    symbol_id: int
    scan_id: int
    ticker: str
    name: str
    market: str
    type: str
    confidence: float
    trend: float
    rr: float
    expected_move: float
    win_rate: float
    vol_confirm: bool
    entry: float
    stop: float
    t1: float
    t2: float
    t3: float
    signal_age_days: int
    pinned: bool
    analogue_count: int
    invalidation_note: str
    factors: ConfidenceFactorsSchema

    @classmethod
    def from_orm(cls, signal):
        factors = ConfidenceFactorsSchema(
            trend_strength=signal.factor_trend_strength,
            volume_confirmation=signal.factor_volume_confirmation,
            historical_win_rate=signal.factor_historical_win_rate,
            mtf_alignment=signal.factor_mtf_alignment,
            breakout_cleanliness=signal.factor_breakout_cleanliness
        )
        return cls(
            id=signal.id,
            symbol_id=signal.symbol_id,
            scan_id=signal.scan_id,
            ticker=signal.ticker,
            name=signal.name,
            market=signal.market,
            type=signal.type,
            confidence=signal.confidence,
            trend=signal.trend,
            rr=signal.rr,
            expected_move=signal.expected_move,
            win_rate=signal.win_rate,
            vol_confirm=signal.vol_confirm,
            entry=signal.entry,
            stop=signal.stop,
            t1=signal.t1,
            t2=signal.t2,
            t3=signal.t3,
            signal_age_days=signal.signal_age_days,
            pinned=signal.pinned,
            analogue_count=signal.analogue_count,
            invalidation_note=signal.invalidation_note or "",
            factors=factors
        )

class PinSignalRequest(BaseModel):
    pinned: bool

# Kagi structures
class KagiTurnSchema(BaseModel):
    kind: str
    price: float
    line_state: str
    ts: str

class KagiSegmentSchema(BaseModel):
    from_price: float
    to_price: float
    state: str
    from_ts: str
    to_ts: str

class KagiLineSchema(BaseModel):
    turns: List[KagiTurnSchema]
    current_price: float
    current_state: str
    current_direction: str
    segments: List[KagiSegmentSchema]

@router.get("", response_model=List[SignalSchema])
def list_signals(scan_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Signal)
    if scan_id is not None:
        query = query.filter(models.Signal.scan_id == scan_id)
    signals = query.order_by(models.Signal.confidence.desc()).all()
    return [SignalSchema.from_orm(s) for s in signals]

@router.get("/analyze", response_model=SignalSchema)
def analyze_ticker(ticker: str, reversal_type: str = "pct", reversal_value: float = 4.0, db: Session = Depends(get_db)):
    ticker = ticker.upper().strip()
    
    # 1. Fetch or create Symbol record
    symbol = db.query(models.Symbol).filter(models.Symbol.ticker == ticker).first()
    if not symbol:
        from routers.scan import TICKER_UNIVERSE
        found = False
        for market, list_info in TICKER_UNIVERSE.items():
            for item in list_info:
                if item[0].upper() == ticker:
                    symbol = models.Symbol(
                        ticker=ticker,
                        name=item[1],
                        market=market,
                        sector=item[2],
                        exchange=item[3] if len(item) > 3 else "NYSE"
                    )
                    db.add(symbol)
                    db.commit()
                    db.refresh(symbol)
                    found = True
                    break
            if found:
                break
        
        if not found:
            symbol = models.Symbol(
                ticker=ticker,
                name=f"{ticker} Corp.",
                market="stock",
                sector="Technology",
                exchange="NYSE"
            )
            db.add(symbol)
            db.commit()
            db.refresh(symbol)
            
    # 2. Fetch history
    prices = fetch_history(ticker)
    if not prices or len(prices) < 15:
        raise HTTPException(status_code=400, detail=f"Insufficient price history for ticker {ticker}")
        
    closes = [p["c"] for p in prices]
    timestamps = [p["ts"] for p in prices]
    highs = [p["h"] for p in prices]
    lows = [p["l"] for p in prices]
    
    # 3. Construct Kagi
    kagi_result = construct_kagi(
        closes=closes,
        timestamps=timestamps,
        reversal_type=reversal_type,
        reversal_value=reversal_value,
        highs=highs,
        lows=lows
    )
    
    direction = "bull"
    if kagi_result.get("segments"):
        direction = "bull" if kagi_result["segments"][-1]["state"] == "yang" else "bear"
        
    # 4. Calculate confidence score
    from engines.signal import calculate_confidence_score
    
    conf, factors, analogue_count, win_rate, inv_note = calculate_confidence_score(
        closes, [p["volume"] for p in prices], kagi_result, ticker
    )
    
    entry_px = closes[-1]
    turns = kagi_result.get("turns", [])
    if turns:
        stop_px = turns[-1]["price"]
    else:
        stop_px = entry_px * (0.95 if direction == "bull" else 1.05)
        
    if direction == "bull" and stop_px >= entry_px:
        stop_px = entry_px * 0.96
    elif direction == "bear" and stop_px <= entry_px:
        stop_px = entry_px * 1.04
        
    stop_dist = abs(entry_px - stop_px)
    
    if direction == "bull":
        t1_px = entry_px + stop_dist * 1.5
        t2_px = entry_px + stop_dist * 2.5
        t3_px = entry_px + stop_dist * 3.5
        expected_move_pct = ((t1_px - entry_px) / entry_px) * 100.0
    else:
        t1_px = entry_px - stop_dist * 1.5
        t2_px = entry_px - stop_dist * 2.5
        t3_px = entry_px - stop_dist * 3.5
        expected_move_pct = ((entry_px - t1_px) / entry_px) * 100.0
        
    signal_model = db.query(models.Signal).filter(models.Signal.ticker == ticker, models.Signal.scan_id == 0).first()
    if not signal_model:
        signal_model = models.Signal(ticker=ticker, scan_id=0)
        db.add(signal_model)
        
    signal_model.symbol_id = symbol.id
    signal_model.name = symbol.name
    signal_model.market = symbol.market
    signal_model.type = direction
    signal_model.confidence = conf
    signal_model.trend = float(round(np.mean(np.diff(closes[-10:])), 4))
    signal_model.rr = float(round(abs(t1_px - entry_px) / stop_dist, 2))
    signal_model.expected_move = float(round(expected_move_pct, 2))
    signal_model.win_rate = win_rate
    signal_model.vol_confirm = (factors["volume_confirmation"] > 60)
    signal_model.entry = entry_px
    signal_model.stop = stop_px
    signal_model.t1 = t1_px
    signal_model.t2 = t2_px
    signal_model.t3 = t3_px
    signal_model.signal_age_days = 0
    signal_model.pinned = False
    signal_model.analogue_count = analogue_count
    signal_model.invalidation_note = inv_note
    signal_model.factor_trend_strength = factors["trend_strength"]
    signal_model.factor_volume_confirmation = factors["volume_confirmation"]
    signal_model.factor_historical_win_rate = factors["historical_win_rate"]
    signal_model.factor_mtf_alignment = factors["mtf_alignment"]
    signal_model.factor_breakout_cleanliness = factors["breakout_cleanliness"]
    
    db.commit()
    db.refresh(signal_model)
    
    db.query(models.PriceBar).filter(models.PriceBar.symbol_id == symbol.id).delete()
    for p in prices[-100:]:
        bar = models.PriceBar(
            symbol_id=symbol.id,
            ts=p["ts"],
            o=p["o"],
            h=p["h"],
            l=p["l"],
            c=p["c"],
            volume=p["volume"],
            timeframe="1d"
        )
        db.add(bar)
    db.commit()
    
    return SignalSchema.from_orm(signal_model)

@router.get("/{id}", response_model=SignalSchema)
def get_signal(id: int, db: Session = Depends(get_db)):
    signal = db.query(models.Signal).filter(models.Signal.id == id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    return SignalSchema.from_orm(signal)

@router.post("/{id}/pin")
def pin_signal(id: int, data: PinSignalRequest, db: Session = Depends(get_db)):
    signal = db.query(models.Signal).filter(models.Signal.id == id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    signal.pinned = data.pinned
    db.commit()
    return {"status": "success"}

@router.get("/{symbol_id}/kagi", response_model=KagiLineSchema)
def get_kagi_line(symbol_id: int, timeframe: str = "1d", db: Session = Depends(get_db)):
    symbol = db.query(models.Symbol).filter(models.Symbol.id == symbol_id).first()
    if not symbol:
        raise HTTPException(status_code=404, detail="Symbol not found")
        
    # Fetch price history from yfinance adapter
    prices = fetch_history(symbol.ticker)
    if not prices:
        raise HTTPException(status_code=500, detail=f"Could not load prices for {symbol.ticker}")
        
    closes = [p["c"] for p in prices]
    timestamps = [p["ts"] for p in prices]
    highs = [p["h"] for p in prices]
    lows = [p["l"] for p in prices]
    
    # Run Kagi construction
    # Reversal default is 4.0%
    kagi_result = construct_kagi(
        closes=closes,
        timestamps=timestamps,
        reversal_type="pct",
        reversal_value=4.0,
        highs=highs,
        lows=lows
    )
    return kagi_result
