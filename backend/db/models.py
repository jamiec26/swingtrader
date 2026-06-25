import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base

class Symbol(Base):
    __tablename__ = "symbols"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    market = Column(String, index=True, nullable=False) # stock, etf, forex, index, crypto
    sector = Column(String, default="Unknown")
    exchange = Column(String, default="Unknown")

    price_bars = relationship("PriceBar", back_populates="symbol", cascade="all, delete-orphan")
    kagi_turns = relationship("KagiTurn", back_populates="symbol", cascade="all, delete-orphan")
    signals = relationship("Signal", back_populates="symbol", cascade="all, delete-orphan")

class PriceBar(Base):
    __tablename__ = "price_bars"

    id = Column(Integer, primary_key=True, index=True)
    symbol_id = Column(Integer, ForeignKey("symbols.id"), nullable=False)
    ts = Column(String, nullable=False) # ISO timestamp or date
    o = Column(Float, nullable=False)
    h = Column(Float, nullable=False)
    l = Column(Float, nullable=False)
    c = Column(Float, nullable=False)
    volume = Column(Float, default=0.0)
    timeframe = Column(String, nullable=False) # 1d, 1h, etc.

    symbol = relationship("Symbol", back_populates="price_bars")

class KagiTurn(Base):
    __tablename__ = "kagi_turns"

    id = Column(Integer, primary_key=True, index=True)
    symbol_id = Column(Integer, ForeignKey("symbols.id"), nullable=False)
    kind = Column(String, nullable=False) # shoulder, waist
    price = Column(Float, nullable=False)
    line_state = Column(String, nullable=False) # yin, yang
    ts = Column(String, nullable=False)

    symbol = relationship("Symbol", back_populates="kagi_turns")

class ScanRun(Base):
    __tablename__ = "scan_runs"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String, default="idle") # idle, running, complete, cancelled, error
    pct_complete = Column(Float, default=0.0)
    markets_scanned = Column(Integer, default=0)
    markets_total = Column(Integer, default=0)
    symbols_analyzed = Column(Integer, default=0)
    signals_found = Column(Integer, default=0)
    eta_seconds = Column(Integer, default=0)
    log_lines = Column(JSON, default=list) # List of dicts matching LogLine
    started_at = Column(String, nullable=False)
    ended_at = Column(String, nullable=True)
    error = Column(String, nullable=True)

    signals = relationship("Signal", back_populates="scan_run", cascade="all, delete-orphan")

class Signal(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, index=True)
    symbol_id = Column(Integer, ForeignKey("symbols.id"), nullable=False)
    scan_id = Column(Integer, ForeignKey("scan_runs.id"), nullable=False)
    ticker = Column(String, nullable=False)
    name = Column(String, nullable=False)
    market = Column(String, nullable=False)
    type = Column(String, nullable=False) # bull, bear
    confidence = Column(Float, nullable=False)
    trend = Column(Float, nullable=False)
    rr = Column(Float, nullable=False)
    expected_move = Column(Float, nullable=False)
    win_rate = Column(Float, nullable=False)
    vol_confirm = Column(Boolean, default=False)
    entry = Column(Float, nullable=False)
    stop = Column(Float, nullable=False)
    t1 = Column(Float, nullable=False)
    t2 = Column(Float, nullable=False)
    t3 = Column(Float, nullable=False)
    signal_age_days = Column(Integer, default=0)
    pinned = Column(Boolean, default=False)
    analogue_count = Column(Integer, default=0)
    invalidation_note = Column(Text, nullable=True)

    # Individual factor columns (to compose ConfidenceFactors object in schema)
    factor_trend_strength = Column(Float, default=0.0)
    factor_volume_confirmation = Column(Float, default=0.0)
    factor_historical_win_rate = Column(Float, default=0.0)
    factor_mtf_alignment = Column(Float, default=0.0)
    factor_breakout_cleanliness = Column(Float, default=0.0)

    symbol = relationship("Symbol", back_populates="signals")
    scan_run = relationship("ScanRun", back_populates="signals")
    trade_plans = relationship("TradePlan", back_populates="signal", cascade="all, delete-orphan")

class TradePlan(Base):
    __tablename__ = "trade_plans"

    id = Column(Integer, primary_key=True, index=True)
    signal_id = Column(Integer, ForeignKey("signals.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    direction = Column(String, nullable=False) # bull, bear
    ticker = Column(String, nullable=False)
    entry = Column(Float, nullable=False)
    stop = Column(Float, nullable=False)
    t1 = Column(Float, nullable=False)
    t2 = Column(Float, nullable=False)
    t3 = Column(Float, nullable=False)
    units = Column(Float, nullable=False)
    exposure = Column(Float, nullable=False)
    margin_req = Column(Float, nullable=False)
    risk_pct = Column(Float, nullable=False)
    risk_usd = Column(Float, nullable=False)
    rr_t1 = Column(Float, nullable=False)
    rr_t2 = Column(Float, nullable=False)
    rr_t3 = Column(Float, nullable=False)
    notes = Column(Text, default="")
    created_at = Column(String, nullable=False)

    signal = relationship("Signal", back_populates="trade_plans")
    account = relationship("Account", back_populates="trade_plans")
    journal_entries = relationship("JournalEntry", back_populates="trade_plan", cascade="all, delete-orphan")

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("trade_plans.id"), nullable=False)
    ticker = Column(String, nullable=False)
    direction = Column(String, nullable=False)
    entry = Column(Float, nullable=False)
    stop = Column(Float, nullable=False)
    t1 = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    exit_ts = Column(String, nullable=True)
    result_r = Column(Float, nullable=True)
    pnl_usd = Column(Float, nullable=True)
    outcome = Column(String, default="open") # open, win, loss, breakeven
    hold_days = Column(Integer, nullable=True)
    notes = Column(Text, default="")
    screenshot_path = Column(String, nullable=True)
    created_at = Column(String, nullable=False)

    trade_plan = relationship("TradePlan", back_populates="journal_entries")

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    balance = Column(Float, default=248500.0)
    risk_pct = Column(Float, default=1.0)
    max_heat = Column(Float, default=6.0)
    leverage = Column(Integer, default=1)
    cfd_mult = Column(Float, default=1.0)
    base_currency = Column(String, default="USD")

    trade_plans = relationship("TradePlan", back_populates="account")

class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    kind = Column(String, default="manual") # manual, saved
