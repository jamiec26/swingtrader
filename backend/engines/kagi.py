import numpy as np
from typing import List, Dict, Any, Tuple

def compute_atr(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> float:
    if len(closes) < 2:
        return 0.0
    tr_list = []
    for i in range(1, len(closes)):
        h = highs[i]
        l = lows[i]
        pc = closes[i-1]
        tr = max(h - l, abs(h - pc), abs(l - pc))
        tr_list.append(tr)
    
    if not tr_list:
        return 0.0
    return float(np.mean(tr_list[-period:]))

def construct_kagi(
    closes: List[float],
    timestamps: List[str],
    reversal_type: str = "pct",
    reversal_value: float = 4.0,
    highs: List[float] = None,
    lows: List[float] = None
) -> Dict[str, Any]:
    """
    Constructs Kagi line turns and segments, and returns the Kagi dataset.
    """
    if not closes:
        return {"turns": [], "current_price": 0.0, "current_state": "yin", "current_direction": "bull", "segments": []}

    # Determine reversal amount function
    fixed_reversal = None
    if reversal_type == "fixed":
        fixed_reversal = reversal_value
    elif reversal_type == "atr":
        if highs is not None and lows is not None:
            atr = compute_atr(highs, lows, closes)
            fixed_reversal = max(reversal_value * atr, 0.0001)
        else:
            # Fallback to 1% if highs/lows not provided
            fixed_reversal = closes[-1] * 0.01

    def get_reversal(price: float) -> float:
        if fixed_reversal is not None:
            return fixed_reversal
        # Default is percentage
        return price * (reversal_value / 100.0)

    turns: List[Dict[str, Any]] = []
    
    # 1. Calculate turns (shoulders & waists)
    # Find initial direction
    ext = closes[0]
    direction = 0 # 1 = bull, -1 = bear
    start_idx = 1
    
    for i in range(1, len(closes)):
        px = closes[i]
        rev = get_reversal(closes[0])
        if px - closes[0] >= rev:
            direction = 1
            ext = px
            start_idx = i + 1
            break
        elif closes[0] - px >= rev:
            direction = -1
            ext = px
            start_idx = i + 1
            break

    if direction == 0:
        # No reversal threshold reached, return flat base
        return {
            "turns": [],
            "current_price": closes[-1],
            "current_state": "yin",
            "current_direction": "bull" if closes[-1] >= closes[0] else "bear",
            "segments": []
        }

    # Main reversal loop
    for i in range(start_idx, len(closes)):
        px = closes[i]
        rev = get_reversal(ext)
        if direction == 1:
            if px > ext:
                ext = px
            elif ext - px >= rev:
                # Reversal down: record shoulder at extreme
                turns.append({
                    "kind": "shoulder",
                    "price": ext,
                    "ts": timestamps[i-1]
                })
                direction = -1
                ext = px
        else: # direction == -1
            if px < ext:
                ext = px
            elif px - ext >= rev:
                # Reversal up: record waist at extreme
                turns.append({
                    "kind": "waist",
                    "price": ext,
                    "ts": timestamps[i-1]
                })
                direction = 1
                ext = px

    # Add the current pending leg extreme to turns to close out the chart visualization
    last_turn_kind = "waist" if direction == 1 else "shoulder"
    turns.append({
        "kind": last_turn_kind,
        "price": ext,
        "ts": timestamps[-1]
    })

    # 2. Determine Yin/Yang segments
    # Yin / Yang transition rules:
    # - If BEAR (down leg) and goes below prior waist -> turns YIN (thin)
    # - If BULL (up leg) and goes above prior shoulder -> turns YANG (thick)
    segments: List[Dict[str, Any]] = []
    current_state = "yin"
    
    # Track the previous shoulder and waist
    prev_shoulder = None
    prev_waist = None

    for idx in range(len(turns) - 1):
        turn_from = turns[idx]
        turn_to = turns[idx + 1]
        
        from_price = turn_from["price"]
        to_price = turn_to["price"]
        from_ts = turn_from["ts"]
        to_ts = turn_to["ts"]
        
        is_bull_leg = to_price > from_price
        
        # We can split the current leg if it crosses a transition level
        if is_bull_leg:
            # We are moving up: check if we cross prev_shoulder to turn YANG
            if current_state == "yin" and prev_shoulder is not None and to_price > prev_shoulder:
                # Split leg into:
                # 1. yin segment from from_price to prev_shoulder
                # 2. yang segment from prev_shoulder to to_price
                if prev_shoulder > from_price:
                    segments.append({
                        "from_price": from_price,
                        "to_price": prev_shoulder,
                        "state": "yin",
                        "from_ts": from_ts,
                        "to_ts": to_ts
                    })
                    segments.append({
                        "from_price": prev_shoulder,
                        "to_price": to_price,
                        "state": "yang",
                        "from_ts": from_ts,
                        "to_ts": to_ts
                    })
                else:
                    # Already past it or started above it
                    segments.append({
                        "from_price": from_price,
                        "to_price": to_price,
                        "state": "yang",
                        "from_ts": from_ts,
                        "to_ts": to_ts
                    })
                current_state = "yang"
            else:
                # No change in state
                segments.append({
                    "from_price": from_price,
                    "to_price": to_price,
                    "state": current_state,
                    "from_ts": from_ts,
                    "to_ts": to_ts
                })
        else: # is bear leg (moving down)
            # We are moving down: check if we cross prev_waist to turn YIN
            if current_state == "yang" and prev_waist is not None and to_price < prev_waist:
                # Split leg into:
                # 1. yang segment from from_price to prev_waist
                # 2. yin segment from prev_waist to to_price
                if prev_waist < from_price:
                    segments.append({
                        "from_price": from_price,
                        "to_price": prev_waist,
                        "state": "yang",
                        "from_ts": from_ts,
                        "to_ts": to_ts
                    })
                    segments.append({
                        "from_price": prev_waist,
                        "to_price": to_price,
                        "state": "yin",
                        "from_ts": from_ts,
                        "to_ts": to_ts
                    })
                else:
                    # Already below it
                    segments.append({
                        "from_price": from_price,
                        "to_price": to_price,
                        "state": "yin",
                        "from_ts": from_ts,
                        "to_ts": to_ts
                    })
                current_state = "yin"
            else:
                # No change in state
                segments.append({
                    "from_price": from_price,
                    "to_price": to_price,
                    "state": current_state,
                    "from_ts": from_ts,
                    "to_ts": to_ts
                })

        # Update previous levels for next iterations
        if turn_from["kind"] == "shoulder":
            prev_shoulder = turn_from["price"]
        elif turn_from["kind"] == "waist":
            prev_waist = turn_from["price"]

    # Inject line state information to turns
    annotated_turns = []
    # State tracking same as segments
    state = "yin"
    p_shoulder = None
    p_waist = None
    for idx, turn in enumerate(turns):
        price = turn["price"]
        kind = turn["kind"]
        if idx > 0:
            # Check if this turn price crossed the threshold relative to prior level
            if kind == "waist" and p_shoulder is not None and price > p_shoulder:
                state = "yang"
            elif kind == "shoulder" and p_waist is not None and price < p_waist:
                state = "yin"
        
        annotated_turns.append({
            "kind": kind,
            "price": price,
            "line_state": state,
            "ts": turn["ts"]
        })
        
        if kind == "shoulder":
            p_shoulder = price
        else:
            p_waist = price

    return {
        "turns": annotated_turns,
        "current_price": closes[-1],
        "current_state": current_state,
        "current_direction": "bull" if direction == 1 else "bear",
        "segments": segments
    }
