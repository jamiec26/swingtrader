import datetime
import logging
import yfinance as yf
import numpy as np
from typing import List, Dict, Any

logger = logging.getLogger("yfinance_adapter")

def map_ticker(ticker: str) -> str:
    t = ticker.upper().strip()
    if t == "EURUSD":
        return "EURUSD=X"
    if t == "GBPUSD":
        return "GBPUSD=X"
    if t == "BTCUSD":
        return "BTC-USD"
    if t == "ETHUSD":
        return "ETH-USD"
    return t

def generate_synthetic_history(ticker: str, days: int = 500) -> List[Dict[str, Any]]:
    """
    Generates highly realistic daily PriceBar dictionaries when yfinance is rate-limited or offline.
    """
    logger.info(f"Generating synthetic history for {ticker}")
    np.random.seed(abs(hash(ticker)) % 1000000)
    
    # Choose base price and volatility based on asset class
    ticker_upper = ticker.upper()
    if "BTC" in ticker_upper or "ETH" in ticker_upper:
        base_price = 60000.0 if "BTC" in ticker_upper else 3200.0
        vol = 0.04
        drift = 0.0005
    elif "EUR" in ticker_upper or "GBP" in ticker_upper or "=X" in ticker_upper:
        base_price = 1.0850 if "EUR" in ticker_upper else 1.2700
        vol = 0.005
        drift = 0.00002
    else:
        # Stock defaults
        bases = {"AAPL": 175.0, "MSFT": 340.0, "NVDA": 480.0, "TSLA": 220.0, "AMD": 110.0, "JPM": 145.0, "XOM": 110.0, "GLD": 190.0}
        base_price = bases.get(ticker_upper, 100.0)
        vol = 0.02
        drift = 0.0002

    prices = []
    curr_close = base_price
    start_date = datetime.datetime.now() - datetime.timedelta(days=days)
    
    for i in range(days):
        date_str = (start_date + datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        # Check if weekend (for stocks/forex, skip, crypto trade 24/7)
        is_crypto = "BTC" in ticker_upper or "ETH" in ticker_upper
        is_weekend = (start_date + datetime.timedelta(days=i)).weekday() >= 5
        if not is_crypto and is_weekend:
            continue
            
        change_pct = np.random.normal(drift, vol)
        o = curr_close * (1 + np.random.normal(0, vol * 0.1))
        c = curr_close * (1 + change_pct)
        h = max(o, c) * (1 + abs(np.random.normal(0, vol * 0.3)))
        l = min(o, c) * (1 - abs(np.random.normal(0, vol * 0.3)))
        vol_val = float(np.random.exponential(1000000) if not is_crypto else np.random.exponential(10000000))
        
        prices.append({
            "ts": f"{date_str}T00:00:00Z",
            "o": float(round(o, 4 if base_price < 10 else 2)),
            "h": float(round(h, 4 if base_price < 10 else 2)),
            "l": float(round(l, 4 if base_price < 10 else 2)),
            "c": float(round(c, 4 if base_price < 10 else 2)),
            "volume": float(round(vol_val, 2)),
            "timeframe": "1d"
        })
        curr_close = c
        
    return prices

def fetch_history(ticker: str, period: str = "2y") -> List[Dict[str, Any]]:
    """
    Fetches daily price bars using yfinance, falling back to synthetic data if error.
    """
    mapped = map_ticker(ticker)
    try:
        logger.info(f"Downloading history for {mapped} via yfinance...")
        df = yf.download(mapped, period=period, interval="1d", progress=False)
        if df.empty:
            raise ValueError(f"No data returned for ticker {mapped}")
            
        prices = []
        for index, row in df.iterrows():
            # Handle multi-index columns if any, or standard series
            try:
                o = float(row['Open'])
                h = float(row['High'])
                l = float(row['Low'])
                c = float(row['Close'])
                vol = float(row['Volume'])
            except Exception:
                # Multi-index or alternate structure
                o = float(row['Open'].iloc[0])
                h = float(row['High'].iloc[0])
                l = float(row['Low'].iloc[0])
                c = float(row['Close'].iloc[0])
                vol = float(row['Volume'].iloc[0])

            date_str = index.strftime("%Y-%m-%d")
            prices.append({
                "ts": f"{date_str}T00:00:00Z",
                "o": o,
                "h": h,
                "l": l,
                "c": c,
                "volume": vol,
                "timeframe": "1d"
            })
            
        if not prices:
            raise ValueError(f"No price bars constructed for {mapped}")
        logger.info(f"Downloaded {len(prices)} bars for {mapped}")
        return prices
    except Exception as e:
        logger.error(f"yfinance download failed for {mapped}: {e}. Falling back to simulated history.")
        return generate_synthetic_history(ticker)
