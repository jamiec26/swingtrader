import numpy as np
from typing import List, Dict, Any

def calculate_risk(
    balance: float,
    risk_pct: float,
    entry: float,
    stop: float,
    t1: float,
    t2: float,
    t3: float,
    leverage: int = 1,
    multiplier: float = 1.0
) -> Dict[str, Any]:
    """
    Computes position sizes, exposure, margin required, and reward levels.
    """
    stop_distance = abs(entry - stop)
    if stop_distance == 0 or balance <= 0 or risk_pct <= 0:
        return {
            "units": 0.0,
            "exposure": 0.0,
            "margin_req": 0.0,
            "risk_usd": 0.0,
            "dollar_risk": 0.0,
            "stop_distance": 0.0,
            "rr_t1": 0.0, "rr_t2": 0.0, "rr_t3": 0.0,
            "reward_t1": 0.0, "reward_t2": 0.0, "reward_t3": 0.0
        }
    
    risk_usd = balance * (risk_pct / 100.0)
    # units * stop_distance * multiplier = risk_usd
    units = (risk_usd / stop_distance) / multiplier
    exposure = units * entry * multiplier
    margin_req = exposure / max(leverage, 1)

    rr_t1 = abs(t1 - entry) / stop_distance
    rr_t2 = abs(t2 - entry) / stop_distance
    rr_t3 = abs(t3 - entry) / stop_distance

    return {
        "units": float(units),
        "exposure": float(exposure),
        "margin_req": float(margin_req),
        "risk_usd": float(risk_usd),
        "dollar_risk": float(risk_usd),
        "stop_distance": float(stop_distance),
        "rr_t1": float(rr_t1),
        "rr_t2": float(rr_t2),
        "rr_t3": float(rr_t3),
        "reward_t1": float(units * abs(t1 - entry) * multiplier),
        "reward_t2": float(units * abs(t2 - entry) * multiplier),
        "reward_t3": float(units * abs(t3 - entry) * multiplier),
    }

def calculate_portfolio_heat(
    balance: float,
    positions: List[Dict[str, Any]],
    max_heat: float = 6.0
) -> Dict[str, Any]:
    """
    Calculates portfolio heat:
    - Raw Heat: Sum of individual risk percentages
    - Adjusted Heat: Correlation-adjusted using sector Linkage Matrix (√(rᵀ·C·r) / balance)
    - Sector Weights percentage distribution
    - Correlation warnings
    """
    if not positions:
        return {
            "raw_heat": 0.0,
            "adjusted_heat": 0.0,
            "max_heat": max_heat,
            "positions": [],
            "sector_weights": {},
            "correlation_warnings": [],
            "budget_ok": True
        }

    N = len(positions)
    risk_usd_vector = np.array([p["risk_usd"] for p in positions])
    
    # Construct correlation matrix C based on sectors
    #科技股内部相关系数0.78, 其它内部0.5, 跨行业相关系数0.15
    C = np.eye(N)
    for i in range(N):
        for j in range(i + 1, N):
            sec_i = positions[i]["sector"]
            sec_j = positions[j]["sector"]
            if sec_i == sec_j:
                corr = 0.78 if sec_i.lower() in ["technology", "tech"] else 0.50
            else:
                corr = 0.15
            C[i, j] = corr
            C[j, i] = corr

    # Compute correlation adjusted heat: √(rᵀ · C · r) / balance
    # matrix multiplication
    r_dot_C = np.dot(risk_usd_vector, C)
    r_C_r = np.dot(r_dot_C, risk_usd_vector)
    adjusted_heat_usd = np.sqrt(max(r_C_r, 0.0))
    adjusted_heat_pct = (adjusted_heat_usd / balance) * 100.0 if balance > 0 else 0.0
    
    raw_heat_pct = sum(p["risk_pct"] for p in positions)

    # Sector weights
    sector_risks = {}
    for p in positions:
        sec = p["sector"]
        sector_risks[sec] = sector_risks.get(sec, 0.0) + p["risk_usd"]
    
    total_risk_usd = sum(risk_usd_vector)
    sector_weights = {}
    if total_risk_usd > 0:
        for sec, r_usd in sector_risks.items():
            sector_weights[sec] = float(round((r_usd / total_risk_usd) * 100.0, 1))

    # Correlation warnings
    warnings = []
    # If any sector exceeds 50% of portfolio risk
    for sec, wt in sector_weights.items():
        if wt > 50.0:
            warnings.append(f"HIGH CLUSTER: {sec} exposure represents {wt:.1f}% of total portfolio risk.")

    # Specific warnings for high sector counts
    tech_count = sum(1 for p in positions if p["sector"].lower() in ["technology", "tech"])
    if tech_count >= 3:
        warnings.append(f"CORRELATION WARN: Multiple Technology positions ({tech_count}) detected. Historical covariance exceeds 0.78.")

    budget_ok = adjusted_heat_pct <= max_heat

    return {
        "raw_heat": float(round(raw_heat_pct, 2)),
        "adjusted_heat": float(round(adjusted_heat_pct, 2)),
        "max_heat": max_heat,
        "positions": positions,
        "sector_weights": sector_weights,
        "correlation_warnings": warnings,
        "budget_ok": bool(budget_ok)
    }
