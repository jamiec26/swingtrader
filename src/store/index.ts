import { create } from 'zustand'
import type {
  Workspace,
  Signal,
  ScanConfig,
  ScanProgress,
  Account,
  TradePlan,
  Watchlist,
} from '../types'

const DEFAULT_SCAN_CONFIG: ScanConfig = {
  universe: ['stock', 'etf', 'forex', 'index'],
  timeframe: '1d',
  reversal_type: 'pct',
  reversal_value: 4,
  min_confidence: 60,
  watchlist_ids: [],
}

const DEFAULT_ACCOUNT: Account = {
  id: 1,
  balance: 248500,
  risk_pct: 1.0,
  max_heat: 6.0,
  leverage: 1,
  cfd_mult: 1,
  base_currency: 'USD',
}

interface AppState {
  workspace: Workspace
  selectedSignal: Signal | null
  signals: Signal[]
  scanProgress: ScanProgress | null
  scanConfig: ScanConfig
  account: Account
  watchlists: Watchlist[]
  commandPaletteOpen: boolean
  currentPlan: TradePlan | null

  setWorkspace: (w: Workspace) => void
  setSelectedSignal: (s: Signal | null) => void
  setSignals: (signals: Signal[]) => void
  setScanProgress: (p: ScanProgress | null) => void
  setScanConfig: (c: Partial<ScanConfig>) => void
  setAccount: (a: Partial<Account>) => void
  setWatchlists: (wl: Watchlist[]) => void
  setCommandPaletteOpen: (open: boolean) => void
  setCurrentPlan: (plan: TradePlan | null) => void
  togglePinSignal: (id: number) => void
}

export const useStore = create<AppState>((set) => ({
  workspace: 'scan',
  selectedSignal: null,
  signals: [],
  scanProgress: null,
  scanConfig: DEFAULT_SCAN_CONFIG,
  account: DEFAULT_ACCOUNT,
  watchlists: [],
  commandPaletteOpen: false,
  currentPlan: null,

  setWorkspace: (workspace) => set({ workspace }),
  setSelectedSignal: (selectedSignal) => set({ selectedSignal }),
  setSignals: (signals) => set({ signals }),
  setScanProgress: (scanProgress) => set({ scanProgress }),
  setScanConfig: (c) =>
    set((s) => ({ scanConfig: { ...s.scanConfig, ...c } })),
  setAccount: (a) =>
    set((s) => ({ account: { ...s.account, ...a } })),
  setWatchlists: (watchlists) => set({ watchlists }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setCurrentPlan: (currentPlan) => set({ currentPlan }),
  togglePinSignal: (id) =>
    set((s) => ({
      signals: s.signals.map((sig) =>
        sig.id === id ? { ...sig, pinned: !sig.pinned } : sig
      ),
    })),
}))
