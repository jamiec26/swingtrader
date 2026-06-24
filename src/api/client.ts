import type {
  ScanConfig,
  ScanProgress,
  Signal,
  RiskCalcInput,
  RiskCalcResult,
  TradePlan,
  JournalEntry,
  Account,
  PortfolioHeat,
  Watchlist,
  KagiLine,
} from '../types'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`)
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`)
  return r.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(`POST ${path} → ${r.status}`)
  return r.json()
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(`PUT ${path} → ${r.status}`)
  return r.json()
}

export const api = {
  scan: {
    start: (config: ScanConfig) => post<{ run_id: number }>('/scan/start', config),
    cancel: (runId: number) => post<void>(`/scan/${runId}/cancel`),
    progress: (runId: number) => get<ScanProgress>(`/scan/${runId}/progress`),
    latest: () => get<ScanProgress | null>('/scan/latest'),
  },

  signals: {
    list: (scanId?: number) =>
      get<Signal[]>(scanId ? `/signals?scan_id=${scanId}` : '/signals'),
    get: (id: number) => get<Signal>(`/signals/${id}`),
    pin: (id: number, pinned: boolean) =>
      post<void>(`/signals/${id}/pin`, { pinned }),
    kagi: (symbolId: number, timeframe: string) =>
      get<KagiLine>(`/signals/${symbolId}/kagi?timeframe=${timeframe}`),
  },

  risk: {
    calculate: (input: RiskCalcInput) =>
      post<RiskCalcResult>('/risk/calculate', input),
  },

  plans: {
    create: (plan: Omit<TradePlan, 'id' | 'created_at'>) =>
      post<TradePlan>('/plans', plan),
    list: () => get<TradePlan[]>('/plans'),
    get: (id: number) => get<TradePlan>(`/plans/${id}`),
    export: (id: number) => get<{ markdown: string }>(`/plans/${id}/export`),
  },

  journal: {
    list: () => get<JournalEntry[]>('/journal'),
    update: (
      id: number,
      data: Partial<JournalEntry>
    ) => put<JournalEntry>(`/journal/${id}`, data),
  },

  account: {
    get: () => get<Account>('/account'),
    update: (data: Partial<Account>) => put<Account>('/account', data),
  },

  portfolio: {
    heat: () => get<PortfolioHeat>('/portfolio/heat'),
  },

  watchlists: {
    list: () => get<Watchlist[]>('/watchlists'),
  },
}
