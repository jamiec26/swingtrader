# Kagi Trading Workstation — Handoff

Design spec: https://claude.ai/design/p/6515ce7d-0237-43c4-acd8-6f722d042b17

Stack: **React 18 + TypeScript + Vite** frontend · **Python 3 + FastAPI** backend · **SQLite** · target: Tauri desktop app.

---

## BUILT ✅

### Project scaffolding
- `package.json` · `vite.config.ts` · `tsconfig.json` · `index.html`
- Dev server proxies `/api/*` → `http://127.0.0.1:8000`

### TypeScript layer
- `src/types/index.ts` — all domain types: `Signal`, `TradePlan`, `JournalEntry`, `Account`, `PortfolioHeat`, `KagiLine`, `ScanProgress`, `RiskCalcResult`, etc.
- `src/store/index.ts` — Zustand store with workspace routing, signal list, scan progress, account state
- `src/api/client.ts` — typed fetch wrapper for every backend endpoint (scan, signals, risk, plans, journal, portfolio, watchlists)
- `src/styles/globals.css` — full design-system tokens (CSS vars for all spec colours, typography, scrollbar, animations)

### UI primitives (`src/components/ui/`)
- `Button.tsx` — 5 variants (primary, secondary, ghost, danger, confirm), 3 sizes
- `SignalBadge.tsx` — `▲ BULL` / `▼ BEAR` coloured badges
- `ScoreBar.tsx` — inline progress bar + numeric value
- `KpiTile.tsx` — stat card with label / value / sub / accent mode
- `RRBar.tsx` — animated reward-risk bar with 1R/2R/3R tick marks

### Layout (`src/components/layout/`)
- `NavRail.tsx` — top app bar: Kagi logo, 5 workspace tabs (⌘1–5), account balance, avatar
- `CommandPalette.tsx` — ⌘K overlay with fuzzy search across workspaces + signals, keyboard navigation (Enter / Esc)

### Workspace 1 — Market Scan (`src/components/scan/MarketScan.tsx`)
- Config sidebar: universe toggles (Stocks / ETFs / Forex / Indices / Crypto), timeframe, reversal amount, min confidence
- **Idle state**: centered "SCAN MARKETS" CTA
- **Running state**: animated ring progress meter, 4 stat tiles (markets/symbols/signals/time), gradient progress bar, live scrolling log
- **Offline/demo mode**: simulates a full scan with realistic log stream, emits 6 demo signals, auto-navigates to Board on completion — app is fully interactive with no backend

### Workspace 2 — Opportunity Board (`src/components/board/OpportunityBoard.tsx`)
- Dense sortable table: symbol · market · signal badge · confidence bar · trend bar · R:R · expected move · age · volume confirm
- Filter by market, search by ticker, sort by any column, pin/unpin star
- Selected row highlights with blue left-border; click opens Analysis Workspace with signal pre-loaded

### Workspace 3 (partial) — Analysis Workspace
- `KagiChart.tsx` — Canvas-rendered Kagi chart: builds synthetic demo line from signal levels, draws yang (thick/green) and yin (thin/red) segments, plots SL / Entry / T1 / T2 / T3 dashed levels with labels, price axis, current-price dot
- `SignalPanel.tsx` — left panel: ticker header, weighted confidence breakdown with factor bars (trend strength 30% / volume 20% / win rate 20% / MTF 15% / breakout clarity 15%), key levels, signal stats, invalidation note

---

## NOT BUILT YET ❌

### Workspace 3 — Analysis Workspace shell (`src/components/workspace/AnalysisWorkspace.tsx`)
The three-panel layout container that arranges KagiChart (centre), SignalPanel (left), and RiskPanel (right) is **not wired up**. Still needed:
- `RiskPanel.tsx` — the risk calculator / trade builder panel (was in progress when session ended; has been architected — see `src/types/index.ts` for `RiskCalcResult`, `RiskCalcInput`)
- `AnalysisWorkspace.tsx` — wrapper that renders the three panels side by side, passes the selected signal from store

### Workspace 4 — Portfolio Risk (`src/components/portfolio/PortfolioRisk.tsx`)
Not started. Spec calls for:
- Aggregate heat gauge (raw and correlation-adjusted), sector-weight pie/bars, correlation warning badges
- Uses `PortfolioHeat` type (already in `src/types/index.ts`)
- Formula: `heat_adj = √(rᵀ · C · r) / balance`

### Workspace 5 — Trade Journal (`src/components/journal/TradeJournal.tsx`)
Not started. Spec calls for:
- Table of all `JournalEntry` records (ticker, direction, entry, exit, R-multiple, P&L, outcome badge, hold days)
- Click row to expand notes + edit outcome/exit fields
- Summary stats row: total trades, win rate, avg R, total P&L

### App entry point (`src/main.tsx` + `src/App.tsx`)
The root component that:
- Renders `NavRail` + `CommandPalette` + the active workspace
- Wires up `⌘K` / `⌘1–5` global keyboard shortcuts
- Loads account from backend on mount

**This is the file that glues everything together — without it the app won't run.**

### Python backend (`backend/`)
Nothing built yet. Full spec:

```
backend/
  main.py               # FastAPI app, CORS, mounts all routers
  requirements.txt      # fastapi uvicorn sqlalchemy alembic numpy pandas yfinance scikit-learn aiohttp
  db/
    database.py         # SQLAlchemy engine, SessionLocal, Base
    models.py           # ORM models: Symbol, PriceBar, KagiEvent, Signal, ScanRun,
                        #             TradePlan, JournalEntry, Account, Watchlist
  engines/
    kagi.py             # Kagi construction algorithm (pure Python + numpy)
                        # reversal_amount r, extend/reverse loop, shoulder/waist events
                        # yin/yang state from prior shoulder/waist crossings
    signal.py           # Confidence score: weighted blend of 5 factors
                        # k-NN pattern matching over historical analogues (sklearn)
    risk.py             # Pure functions: dollar_risk, units, exposure, margin, R multiples
                        # Portfolio heat: raw Σ and correlation-adjusted √(rᵀ·C·r)
  adapters/
    yfinance_adapter.py # Pull OHLCV via yfinance, map to PriceBar, cache in SQLite
  routers/
    scan.py             # POST /scan/start, GET /scan/{id}/progress, POST /scan/{id}/cancel
    signals.py          # GET /signals, GET /signals/{id}, POST /signals/{id}/pin, GET /signals/{symbol_id}/kagi
    risk.py             # POST /risk/calculate
    plans.py            # POST /plans, GET /plans, GET /plans/{id}/export
    portfolio.py        # GET /portfolio/heat
    journal.py          # GET /journal, PUT /journal/{id}
    account.py          # GET /account, PUT /account
```

Key algorithms to implement in `engines/kagi.py`:
```python
# reversal_amount r (callable returning amount for given price), close series c
dir, ext = +1, c[0]
for px in c[1:]:
    if dir == +1 and px > ext: ext = px
    elif dir == -1 and px < ext: ext = px
    elif abs(px - ext) >= r(ext):
        record_turn(ext, dir)   # shoulder (dir=+1) or waist (dir=-1)
        dir, ext = -dir, px

# Signal detection: yang=line above prior shoulder, yin=line below prior waist
if line.crosses_above(prev_shoulder): emit(BULLISH, level=prev_shoulder)
elif line.crosses_below(prev_waist):  emit(BEARISH, level=prev_waist)
```

### Tauri shell (`src-tauri/`)
Not scaffolded. Once `cargo` + `tauri-cli` are available:
```
src-tauri/
  Cargo.toml
  tauri.conf.json   # bundle identifier, window size (1440×900 min), sidecar config for Python process
  src/main.rs       # Tauri setup, sidecar spawn, IPC bridge
```

---

## HOW TO RUN (current state)

```bash
# Frontend only (demo mode — no backend needed)
npm install
npm run dev        # opens http://localhost:1420

# With backend
cd backend
pip install -r requirements.txt
python main.py     # FastAPI on :8000
# then in another terminal:
npm run dev
```

---

## DESIGN TOKENS (from spec)

| Token | Value |
|-------|-------|
| Canvas | `#0A0C10` |
| Surface | `#13171E` |
| Panel | `#0E1218` |
| Accent/Blue | `#4C9AFF` |
| Bullish | `#2FCB7E` |
| Bearish | `#F2495C` |
| Caution | `#F5B544` |
| Ink | `#E7EAF0` |
| Muted | `#8B93A0` |
| Dim | `#626A78` |
| UI font | Inter (400/500/600/700/800) |
| Data font | IBM Plex Mono (400/500/600) |
| Table row height | 34px |
| Base unit | 4px |
| Radius sm/md/lg | 6/10/12px |
