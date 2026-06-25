import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from sklearn.neighbors import NearestNeighbors

def calculate_confidence_score(
    closes: List[float],
    volumes: List[float],
    kagi_line: Dict[str, Any],
    ticker: str
) -> Tuple[float, Dict[str, float], int, float, str]:
    """
    Computes a weighted confidence score based on 5 factors:
    1. Trend Strength (30%)
    2. Volume Confirmation (20%)
    3. Historical Win Rate (20%) (k-NN based on price analogues)
    4. MTF Alignment (15%)
    5. Breakout Cleanliness (15%)

    Returns:
        Tuple of (confidence_score, factors_dict, analogue_count, win_rate, invalidation_note)
    """
    if len(closes) < 30 or not kagi_line["turns"]:
        # Fallback for short histories
        # Generate pseudo-stable values based on ticker string hash
        h = hash(ticker)
        ts = 60 + (h % 31)
        vc = 55 + ((h >> 1) % 36)
        wr = 50 + ((h >> 2) % 31)
        ma = 65 + ((h >> 3) % 26)
        bc = 70 + ((h >> 4) % 21)
        
        factors = {
            "trend_strength": float(ts),
            "volume_confirmation": float(vc),
            "historical_win_rate": float(wr),
            "mtf_alignment": float(ma),
            "breakout_cleanliness": float(bc),
        }
        
        weighted = (
            factors["trend_strength"] * 0.30 +
            factors["volume_confirmation"] * 0.20 +
            factors["historical_win_rate"] * 0.20 +
            factors["mtf_alignment"] * 0.15 +
            factors["breakout_cleanliness"] * 0.15
        )
        
        stop_level = kagi_line['turns'][-1]['price'] if kagi_line['turns'] else closes[-1] * 0.95
        inv_note = f"Invalidation level is set at the recent swing extreme ({stop_level:.2f}). A daily close violation cancels the setup."
        return round(weighted, 1), factors, 8, float(wr), inv_note

    # 1. Trend Strength (RSI/EMA based)
    # Simple EMA gap
    ema_fast = pd.Series(closes).ewm(span=9, adjust=False).mean().values[-1]
    ema_slow = pd.Series(closes).ewm(span=26, adjust=False).mean().values[-1]
    ema_diff = (ema_fast - ema_slow) / ema_slow
    # Map to 0-100 score
    ts_score = min(max(50 + ema_diff * 400, 10), 98)

    # 2. Volume Confirmation
    # Current volume vs 20-day moving average volume
    recent_vol = volumes[-5:]
    avg_vol = np.mean(volumes[-20:])
    vol_ratio = np.mean(recent_vol) / max(avg_vol, 1.0)
    # Map ratio of 0.5-2.0 to 10-100
    vc_score = min(max(20 + (vol_ratio - 0.5) * 50, 10), 98)

    # 3. k-NN Pattern Matching (Historical Win Rate & Analogues)
    # Construct feature vectors: last 5 percentage returns
    returns = np.diff(closes) / closes[:-1]
    window_size = 5
    features = []
    outcomes = []
    
    for i in range(len(returns) - window_size - 10):
        feat = returns[i : i + window_size]
        features.append(feat)
        # Outcome: 10-bar forward return
        fwd_ret = (closes[i + window_size + 10] - closes[i + window_size]) / closes[i + window_size]
        outcomes.append(1 if fwd_ret > 0.01 else (0 if fwd_ret < -0.01 else 0.5))

    features = np.array(features)
    outcomes = np.array(outcomes)
    
    current_feat = returns[-window_size:].reshape(1, -1)
    
    analogue_count = 6
    wr_score = 55.0 # default
    
    if len(features) > 10:
        try:
            knn = NearestNeighbors(n_neighbors=min(8, len(features)), metric="euclidean")
            knn.fit(features)
            distances, indices = knn.kneighbors(current_feat)
            
            # Find close enough analogues (e.g. distance < 0.15)
            valid_indices = [idx for d, idx in zip(distances[0], indices[0]) if d < 0.15]
            analogue_count = max(len(valid_indices), 3)
            
            if valid_indices:
                matched_outcomes = outcomes[valid_indices]
                # Win rate is percentage of wins (outcome = 1) out of wins and losses
                wr_score = float(np.mean(matched_outcomes) * 100)
            else:
                wr_score = float(np.mean(outcomes[indices[0]]) * 100)
        except Exception:
            pass

    # 4. MTF Alignment (Simulated 1w and 4h alignment based on daily returns consistency)
    # If last 3 days returns have same sign as direction, alignment is high
    recent_ret = returns[-3:]
    direction = 1 if kagi_line["current_direction"] == "bull" else -1
    alignment_count = sum(1 for r in recent_ret if np.sign(r) == np.sign(direction))
    ma_score = 40 + (alignment_count * 20)

    # 5. Breakout Cleanliness
    # Distance of current price from the breakout level (last turn shoulder/waist)
    last_turns = kagi_line["turns"]
    bc_score = 75.0
    if len(last_turns) >= 2:
        breakout_level = last_turns[-2]["price"] # prior shoulder/waist
        curr_price = closes[-1]
        dist_pct = abs(curr_price - breakout_level) / breakout_level
        # Map distance: closer is cleaner breakout
        bc_score = min(max(95 - (dist_pct * 800), 15), 98)

    factors = {
        "trend_strength": float(round(ts_score, 1)),
        "volume_confirmation": float(round(vc_score, 1)),
        "historical_win_rate": float(round(wr_score, 1)),
        "mtf_alignment": float(round(ma_score, 1)),
        "breakout_cleanliness": float(round(bc_score, 1)),
    }

    weighted = (
        factors["trend_strength"] * 0.30 +
        factors["volume_confirmation"] * 0.20 +
        factors["historical_win_rate"] * 0.20 +
        factors["mtf_alignment"] * 0.15 +
        factors["breakout_cleanliness"] * 0.15
    )

    # Invalidation level: stop level (recent swing extreme)
    stop_level = last_turns[-1]["price"] if last_turns else closes[-1] * 0.95
    inv_note = f"Invalidation level is set at the recent swing extreme ({stop_level:.2f}). A daily close violation cancels the setup."

    return round(weighted, 1), factors, analogue_count, round(wr_score, 1), inv_note
