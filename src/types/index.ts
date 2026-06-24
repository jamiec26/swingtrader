export type Market = 'stock' | 'etf' | 'forex' | 'index' | 'crypto'
export type Direction = 'bull' | 'bear'
export type LineState = 'yin' | 'yang'
export type TurnKind = 'shoulder' | 'waist'
export type Timeframe = '1d' | '1w' | '1m' | '4h' | '1h'
export type Outcome = 'win' | 'loss' | 'breakeven' | 'open'
export type Workspace = 'scan' | 'board' | 'workspace' | 'portfolio' | 'journal'

export interface Symbol {
  id: number
  ticker: string
  name: string
  market: Market
  sector: string
  exchange: string
}

export interface PriceBar {
  ts: string
  o: number
  h: number
  l: number
  c: number
  volume: number
  timeframe: Timeframe
}

export interface KagiTurn {
  kind: TurnKind
  price: number
  line_state: LineState
  ts: string
}

export interface KagiSegment {
  from_price: number
  to_price: number
  state: LineState
  from_ts: string
  to_ts: string
}

export interface KagiLine {
  turns: KagiTurn[]
  current_price: number
  current_state: LineState
  current_direction: Direction
  segments: KagiSegment[]
}

export interface ConfidenceFactors {
  trend_strength: number
  volume_confirmation: number
  historical_win_rate: number
  mtf_alignment: number
  breakout_cleanliness: number
}

export interface Signal {
  id: number
  symbol_id: number
  scan_id: number
  ticker: string
  name: string
  market: Market
  type: Direction
  confidence: number
  trend: number
  rr: number
  expected_move: number
  win_rate: number
  vol_confirm: boolean
  entry: number
  stop: number
  t1: number
  t2: number
  t3: number
  signal_age_days: number
  pinned: boolean
  factors: ConfidenceFactors
  analogue_count: number
  invalidation_note: string
}

export interface ScanConfig {
  universe: Market[]
  timeframe: Timeframe
  reversal_type: 'pct' | 'atr' | 'fixed'
  reversal_value: number
  min_confidence: number
  watchlist_ids: number[]
}

export interface LogLine {
  ticker: string
  market: string
  timeframe: string
  result: 'bull' | 'bear' | 'none' | 'analyzing'
  confidence: number | null
}

export interface ScanProgress {
  run_id: number
  status: 'idle' | 'running' | 'complete' | 'cancelled' | 'error'
  pct_complete: number
  markets_scanned: number
  markets_total: number
  symbols_analyzed: number
  signals_found: number
  eta_seconds: number
  log_lines: LogLine[]
  started_at: string
  ended_at: string | null
  error: string | null
}

export interface RiskCalcInput {
  balance: number
  risk_pct: number
  entry: number
  stop: number
  t1: number
  t2: number
  t3: number
  leverage: number
  multiplier: number
}

export interface RiskCalcResult {
  units: number
  exposure: number
  margin_req: number
  risk_usd: number
  dollar_risk: number
  stop_distance: number
  rr_t1: number
  rr_t2: number
  rr_t3: number
  reward_t1: number
  reward_t2: number
  reward_t3: number
}

export interface TradePlan {
  id: number
  signal_id: number
  account_id: number
  direction: Direction
  ticker: string
  entry: number
  stop: number
  t1: number
  t2: number
  t3: number
  units: number
  exposure: number
  margin_req: number
  risk_pct: number
  risk_usd: number
  rr_t1: number
  rr_t2: number
  rr_t3: number
  created_at: string
  notes: string
}

export interface JournalEntry {
  id: number
  plan_id: number
  ticker: string
  direction: Direction
  entry: number
  stop: number
  t1: number
  exit_price: number | null
  exit_ts: string | null
  result_r: number | null
  pnl_usd: number | null
  outcome: Outcome
  hold_days: number | null
  notes: string
  screenshot_path: string | null
  created_at: string
}

export interface Account {
  id: number
  balance: number
  risk_pct: number
  max_heat: number
  leverage: number
  cfd_mult: number
  base_currency: string
}

export interface PortfolioPosition {
  ticker: string
  direction: Direction
  entry: number
  stop: number
  units: number
  current_price: number
  unrealized_pnl: number
  risk_usd: number
  risk_pct: number
  sector: string
}

export interface PortfolioHeat {
  raw_heat: number
  adjusted_heat: number
  max_heat: number
  positions: PortfolioPosition[]
  sector_weights: Record<string, number>
  correlation_warnings: string[]
  budget_ok: boolean
}

export interface Watchlist {
  id: number
  name: string
  kind: 'manual' | 'saved'
}
