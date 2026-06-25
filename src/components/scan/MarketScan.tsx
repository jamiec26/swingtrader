import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import type { Market, ScanProgress } from '../../types'

const MARKETS: Market[] = ['stock', 'etf', 'forex', 'index', 'crypto']
const MARKET_LABELS: Record<Market, string> = {
  stock: 'Stocks',
  etf: 'ETFs',
  forex: 'Forex',
  index: 'Indices',
  crypto: 'Crypto',
}

const RESULT_COLOR = {
  bull: 'var(--green)',
  bear: 'var(--red)',
  none: 'var(--dim)',
  analyzing: 'var(--blue)',
}
const RESULT_LABEL = {
  bull: '↑ reversal',
  bear: '↓ reversal',
  none: 'no signal',
  analyzing: 'analyzing…',
}

export function MarketScan() {
  const { scanConfig, setScanConfig, setScanProgress, scanProgress, setWorkspace, setSignals, setSelectedSignal, signals } =
    useStore()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isRunning = scanProgress?.status === 'running'
  const isDone = scanProgress?.status === 'complete'

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function startScan() {
    setError(null)
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    try {
      const { run_id } = await api.scan.start(scanConfig)
      // Set to running to trigger global polling in App.tsx
      setScanProgress({
        run_id,
        status: 'running',
        pct_complete: 0,
        markets_scanned: 0,
        markets_total: scanConfig.universe.length,
        symbols_analyzed: 0,
        signals_found: 0,
        eta_seconds: 120,
        log_lines: [],
        started_at: new Date().toISOString(),
        ended_at: null,
        error: null,
      })
    } catch {
      setError('Backend not reachable — start the Python server with: cd backend && python main.py')
      // Demo mode: simulate a scan
      simulateScan()
    }
  }

  async function resumeScan() {
    if (!scanProgress) return
    setError(null)
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    try {
      const { run_id } = await api.scan.resume(scanProgress.run_id, scanConfig)
      setScanProgress({
        ...scanProgress,
        status: 'running'
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to resume scan.')
    }
  }

  async function cancelScan() {
    if (!scanProgress) return
    if (scanProgress.run_id === 0) {
      // Simulated scan
      if (pollRef.current) clearInterval(pollRef.current)
      setScanProgress({ ...scanProgress, status: 'cancelled' })
      return
    }
    try {
      await api.scan.cancel(scanProgress.run_id)
      setScanProgress({ ...scanProgress, status: 'cancelled' })
    } catch { /* silent */ }
  }

  function simulateScan() {
    let pct = 0
    let symbolsAnalyzed = 0
    let signalsFound = 0
    const logLines: ScanProgress['log_lines'] = []
    const tickers = ['NVDA','AAPL','MSFT','GOOGL','META','AMZN','TSLA','EUR/USD','GBP/USD','XLE','SPY','QQQ','BTC/USD','GLD','JPY/USD']
    let i = 0
    const activeSignals: any[] = []

    setSignals([])

    const mockProgress: ScanProgress = {
      run_id: 0,
      status: 'running',
      pct_complete: 0,
      markets_scanned: 0,
      markets_total: scanConfig.universe.length,
      symbols_analyzed: 0,
      signals_found: 0,
      eta_seconds: 60,
      log_lines: [],
      started_at: new Date().toISOString(),
      ended_at: null,
      error: null,
    }
    setScanProgress(mockProgress)

    pollRef.current = setInterval(() => {
      pct = Math.min(pct + 6, 100)
      symbolsAnalyzed += Math.floor(Math.random() * 150) + 80
      const hasSignal = Math.random() > 0.55

      if (i < tickers.length) {
        const result = hasSignal
          ? (Math.random() > 0.4 ? 'bull' : 'bear')
          : 'none'
        if (result !== 'none') {
          signalsFound++
          const demoSig = DEMO_SIGNALS.find(s => s.ticker === tickers[i]) || {
            id: Math.random(),
            symbol_id: Math.random(),
            scan_id: 0,
            ticker: tickers[i],
            name: tickers[i] + ' Inc.',
            market: 'stock' as const,
            type: result as 'bull' | 'bear',
            confidence: Math.floor(Math.random() * 30) + 62,
            trend: 0.05,
            rr: 2.5,
            expected_move: 5.5,
            win_rate: 65,
            vol_confirm: true,
            entry: 100.0,
            stop: 95.0,
            t1: 110.0,
            t2: 120.0,
            t3: 130.0,
            signal_age_days: 0,
            pinned: false,
            factors: { trend_strength: 70, volume_confirmation: 80, historical_win_rate: 65, mtf_alignment: 75, breakout_cleanliness: 80 },
            analogue_count: 50,
            invalidation_note: 'Close below stop invalidates',
          }
          activeSignals.push(demoSig)
          setSignals([...activeSignals])
        }
        logLines.unshift({
          ticker: tickers[i],
          market: i < 7 ? 'stocks' : i < 10 ? 'forex' : i < 13 ? 'etf' : 'crypto',
          timeframe: '1d',
          result: result as 'bull' | 'bear' | 'none',
          confidence: result !== 'none' ? Math.floor(Math.random() * 30) + 62 : null,
        })
        if (logLines.length > 8) logLines.pop()
        i++
      }

      const updated: ScanProgress = {
        ...mockProgress,
        pct_complete: pct,
        markets_scanned: Math.min(Math.floor((pct / 100) * scanConfig.universe.length), scanConfig.universe.length),
        symbols_analyzed: symbolsAnalyzed,
        signals_found: signalsFound,
        eta_seconds: Math.max(0, Math.round(((100 - pct) / 100) * 60)),
        log_lines: [...logLines],
        status: pct >= 100 ? 'complete' : 'running',
      }

      setScanProgress(updated)

      if (pct >= 100) {
        clearInterval(pollRef.current!)
        updated.ended_at = new Date().toISOString()
        setScanProgress({ ...updated, status: 'complete' })
        if (activeSignals.length === 0) {
          setSignals(DEMO_SIGNALS)
        }
        setTimeout(() => setWorkspace('board'), 900)
      }
    }, 500)
  }

  function toggleMarket(m: Market) {
    const u = scanConfig.universe
    setScanConfig({
      universe: u.includes(m) ? u.filter((x) => x !== m) : [...u, m],
    })
  }

  const formatScanTime = (isoString?: string | null) => {
    if (!isoString) return '16:00'
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    } catch {
      return '16:00'
    }
  }

  const formatScanSub = (isoString?: string | null) => {
    if (!isoString) return ' ET'
    try {
      const d = new Date(isoString)
      const tz = d.toLocaleDateString('en-US', { timeZoneName: 'short' }).split(', ')[1] || ''
      return ` ${tz}`
    } catch {
      return ' ET'
    }
  }

  const p = scanProgress
  const pct = p?.pct_complete ?? 0
  const circ = 2 * Math.PI * 70
  const dashOffset = circ - (pct / 100) * circ

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1 }}>
      {/* Config sidebar */}
      <div
        style={{
          width: 300,
          borderRight: '1px solid var(--border)',
          padding: '24px 22px',
          background: 'var(--rail)',
          flexShrink: 0,
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.14em',
            color: 'var(--dim)',
            marginBottom: '20px',
          }}
        >
          SCAN CONFIGURATION
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Universe */}
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--dim)',
                marginBottom: '8px',
                letterSpacing: '0.08em',
              }}
            >
              UNIVERSE
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {MARKETS.map((m) => {
                const active = scanConfig.universe.includes(m)
                return (
                  <button
                    key={m}
                    onClick={() => toggleMarket(m)}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: active ? 'var(--blue)' : 'var(--dim)',
                      background: active ? 'rgba(76,154,255,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(76,154,255,0.3)' : 'transparent'}`,
                      borderRadius: '5px',
                      padding: '4px 9px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {MARKET_LABELS[m]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Exchange Filter */}
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--dim)',
                marginBottom: '8px',
                letterSpacing: '0.08em',
              }}
            >
              EXCHANGE (STOCKS)
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['ALL', 'NASDAQ', 'NYSE'] as const).map((ex) => {
                const active = scanConfig.exchange === ex || (!scanConfig.exchange && ex === 'ALL')
                return (
                  <button
                    key={ex}
                    onClick={() => setScanConfig({ exchange: ex })}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: active ? 'var(--blue)' : 'var(--dim)',
                      background: active ? 'rgba(76,154,255,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(76,154,255,0.3)' : 'transparent'}`,
                      borderRadius: '5px',
                      padding: '4px 9px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {ex}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Limit Filter */}
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--dim)',
                marginBottom: '8px',
                letterSpacing: '0.08em',
              }}
            >
              STOCK LIMIT (BY MARKET CAP)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {([20, 50, 100, 200, 500, 1000] as const).map((lim) => {
                const active = scanConfig.limit === lim || (!scanConfig.limit && lim === 50)
                return (
                  <button
                    key={lim}
                    onClick={() => setScanConfig({ limit: lim })}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: active ? 'var(--blue)' : 'var(--dim)',
                      background: active ? 'rgba(76,154,255,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(76,154,255,0.3)' : 'transparent'}`,
                      borderRadius: '5px',
                      padding: '4px 9px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    Top {lim}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sector Filter */}
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--dim)',
                marginBottom: '8px',
                letterSpacing: '0.08em',
              }}
            >
              SECTOR (STOCKS)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(['ALL', 'Technology', 'Financials', 'Healthcare', 'Energy', 'Consumer'] as const).map((sec) => {
                const active = scanConfig.sector === sec || (!scanConfig.sector && sec === 'ALL')
                return (
                  <button
                    key={sec}
                    onClick={() => setScanConfig({ sector: sec })}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: active ? 'var(--blue)' : 'var(--dim)',
                      background: active ? 'rgba(76,154,255,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(76,154,255,0.3)' : 'transparent'}`,
                      borderRadius: '5px',
                      padding: '4px 9px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {sec}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Price Filter */}
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--dim)',
                marginBottom: '8px',
                letterSpacing: '0.08em',
              }}
            >
              PRICE FILTER (STOCKS)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {([
                { value: 'ALL', label: 'ALL' },
                { value: '<50', label: '< $50' },
                { value: '>50', label: '> $50' },
                { value: '>100', label: '> $100' },
              ] as const).map((item) => {
                const active = scanConfig.price_filter === item.value || (!scanConfig.price_filter && item.value === 'ALL')
                return (
                  <button
                    key={item.value}
                    onClick={() => setScanConfig({ price_filter: item.value })}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: active ? 'var(--blue)' : 'var(--dim)',
                      background: active ? 'rgba(76,154,255,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(76,154,255,0.3)' : 'transparent'}`,
                      borderRadius: '5px',
                      padding: '4px 9px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reversal Method Selector */}
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--dim)',
                marginBottom: '8px',
                letterSpacing: '0.08em',
              }}
            >
              REVERSAL METHOD
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {[
                { value: 'pct', label: 'Percentage' },
                { value: 'atr', label: 'ATR' },
                { value: 'fixed', label: 'Traditional' },
              ].map((item) => {
                const active = scanConfig.reversal_type === item.value
                return (
                  <button
                    key={item.value}
                    onClick={() => {
                      const defVal = item.value === 'pct' ? 4 : item.value === 'atr' ? 1.5 : 5
                      setScanConfig({ reversal_type: item.value as any, reversal_value: defVal })
                    }}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: active ? 'var(--blue)' : 'var(--dim)',
                      background: active ? 'rgba(76,154,255,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(76,154,255,0.3)' : 'transparent'}`,
                      borderRadius: '5px',
                      padding: '4px 9px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
            {/* Reversal Value input */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Reversal Value</span>
              <input
                type="number"
                step={scanConfig.reversal_type === 'atr' ? 0.1 : 0.5}
                min={0.1}
                value={scanConfig.reversal_value}
                onChange={(e) => setScanConfig({ reversal_value: parseFloat(e.target.value) || 0.1 })}
                style={{
                  width: '80px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  padding: '4px 8px',
                  borderRadius: '4px',
                  outline: 'none',
                  textAlign: 'right',
                }}
              />
            </div>
          </div>

          {[
            { label: 'Timeframe', value: 'Daily' },
            { label: 'Min confidence', value: String(scanConfig.min_confidence) },
            { label: 'Watchlists', value: 'All (6)' },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderTop: '1px solid var(--border2)',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{label}</span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '13px',
                  color: 'var(--ink)',
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {error && (
          <div
            style={{
              background: 'rgba(242,73,92,0.1)',
              border: '1px solid rgba(242,73,92,0.3)',
              borderRadius: 'var(--radius)',
              padding: '12px 16px',
              color: 'var(--red)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {!isRunning && !isDone ? (
          /* Idle state */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <h2
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: 'var(--ink2)',
                  margin: '0 0 10px',
                  letterSpacing: '-0.03em',
                }}
              >
                Ready to scan
              </h2>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '15px' }}>
                {scanConfig.universe.length} market
                {scanConfig.universe.length !== 1 ? 's' : ''} selected · daily timeframe
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                variant="primary"
                size="lg"
                onClick={startScan}
                style={{ letterSpacing: '0.08em', minWidth: '180px' }}
              >
                SCAN MARKETS
              </Button>
              {p && (p.status === 'cancelled' || p.status === 'error') && (
                <Button
                  variant="confirm"
                  size="lg"
                  onClick={resumeScan}
                  style={{ letterSpacing: '0.08em', minWidth: '180px' }}
                >
                  RESUME SCAN
                </Button>
              )}
            </div>
            {p?.status === 'cancelled' && (
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px',
                  color: 'var(--dim)',
                }}
              >
                Scan cancelled · {p.symbols_analyzed} symbols analyzed
              </span>
            )}
            {p?.status === 'error' && (
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px',
                  color: 'var(--red)',
                }}
              >
                Scan error: {p.error}
              </span>
            )}
          </div>
        ) : (
          /* Running state */
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '32px',
              }}
            >
              <span
                className="animate-pulse"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  boxShadow: '0 0 8px var(--green)',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px',
                  letterSpacing: '0.10em',
                  color: 'var(--green)',
                }}
              >
                {isDone ? 'SCAN COMPLETE' : 'SCANNING MARKETS…'}
              </span>
              {!isDone && p && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: 'var(--dim)',
                  }}
                >
                  EST. {String(Math.floor((p.eta_seconds ?? 0) / 60)).padStart(2, '0')}:
                  {String((p.eta_seconds ?? 0) % 60).padStart(2, '0')} REMAINING
                </span>
              )}
              {!isDone ? (
                <Button variant="ghost" size="sm" onClick={cancelScan}>
                  Cancel
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={startScan} style={{ marginLeft: 'auto' }}>
                  RE-SCAN
                </Button>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                gap: '40px',
                alignItems: 'center',
                marginBottom: '36px',
              }}
            >
              {/* Ring */}
              <div style={{ position: 'relative', width: 172, height: 172, flexShrink: 0 }}>
                <svg width="172" height="172" viewBox="0 0 172 172" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="86" cy="86" r="70"
                    fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10"
                  />
                  <circle
                    cx="86" cy="86" r="70"
                    fill="none" stroke="var(--blue)" strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '36px',
                      fontWeight: 600,
                      color: 'var(--ink2)',
                    }}
                  >
                    {Math.round(pct)}
                    <span style={{ fontSize: '16px', color: 'var(--muted)' }}>%</span>
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '10px',
                      letterSpacing: '0.10em',
                      color: 'var(--dim)',
                      marginTop: '2px',
                    }}
                  >
                    COMPLETE
                  </span>
                </div>
              </div>

              {/* Stat tiles */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { label: 'MARKETS SCANNED', value: `${p?.markets_scanned ?? 0}`, sub: `/ ${p?.markets_total ?? 0}` },
                  { label: 'SYMBOLS ANALYZED', value: (p?.symbols_analyzed ?? 0).toLocaleString() },
                  { label: 'SIGNALS FOUND', value: String(p?.signals_found ?? 0), color: 'var(--green)' },
                  { label: 'DATA AS OF', value: formatScanTime(p?.ended_at || p?.started_at), sub: formatScanSub(p?.ended_at || p?.started_at) },
                ].map((tile) => (
                  <div
                    key={tile.label}
                    style={{
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '16px 18px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '10px',
                        letterSpacing: '0.10em',
                        color: 'var(--dim)',
                        marginBottom: '8px',
                      }}
                    >
                      {tile.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '22px',
                        color: tile.color ?? 'var(--ink)',
                      }}
                    >
                      {tile.value}
                      {tile.sub && (
                        <span style={{ fontSize: '13px', color: 'var(--dim)' }}>
                          {tile.sub}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 6,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 3,
                overflow: 'hidden',
                marginBottom: '28px',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--blue), #6FB0FF)',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>

            {/* Live log */}
            <div
              style={{
                flex: 1,
                background: 'var(--rail)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '14px 16px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                lineHeight: 2,
                overflowY: 'auto',
                minHeight: 160,
              }}
            >
              {(() => {
                const sortedLogLines = [...(p?.log_lines ?? [])].sort((a, b) => {
                  const aSig = a.result === 'bull' || a.result === 'bear'
                  const bSig = b.result === 'bull' || b.result === 'bear'
                  if (aSig && !bSig) return -1
                  if (!aSig && bSig) return 1
                  return 0
                })

                return sortedLogLines.map((line, idx) => {
                  const hasSignal = line.result === 'bull' || line.result === 'bear'
                  
                  const handleRowClick = () => {
                    if (!hasSignal) return
                    const sig = signals.find((s) => s.ticker.toUpperCase() === line.ticker.toUpperCase())
                    if (sig) {
                      setSelectedSignal(sig)
                      setWorkspace('workspace')
                    }
                  }

                  return (
                    <div
                      key={idx}
                      onClick={handleRowClick}
                      className={hasSignal ? 'log-line-clickable' : undefined}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: hasSignal ? 'var(--ink)' : (idx === 0 ? 'var(--muted)' : 'var(--dim)'),
                        cursor: hasSignal ? 'pointer' : 'default',
                        padding: '2px 8px',
                        margin: '2px -8px',
                        borderRadius: '4px',
                        borderLeft: hasSignal 
                          ? `3px solid ${line.result === 'bull' ? 'var(--green)' : 'var(--red)'}`
                          : '3px solid transparent',
                        paddingLeft: hasSignal ? '10px' : '8px',
                      }}
                    >
                      <span>
                        {line.ticker} · {line.market} · {line.timeframe}
                      </span>
                      <span style={{ color: RESULT_COLOR[line.result], fontWeight: hasSignal ? 600 : 'normal' }}>
                        {RESULT_LABEL[line.result]}
                        {line.confidence != null && ` · conf ${line.confidence}`}
                      </span>
                    </div>
                  )
                })
              })()}
              {(p?.log_lines.length ?? 0) === 0 && (
                <span style={{ color: 'var(--subtle)' }}>Initializing pipeline…</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Demo data used in offline / no-backend mode
const DEMO_SIGNALS = [
  {
    id: 1, symbol_id: 1, scan_id: 0,
    ticker: 'AAPL', name: 'Apple Inc.', market: 'stock' as const,
    type: 'bull' as const, confidence: 84, trend: 78, rr: 2.9,
    expected_move: 8.4, win_rate: 68, vol_confirm: true,
    entry: 205.40, stop: 196.40, t1: 218.0, t2: 226.5, t3: 238.0,
    signal_age_days: 1, pinned: true,
    factors: { trend_strength: 78, volume_confirmation: 90, historical_win_rate: 68, mtf_alignment: 85, breakout_cleanliness: 88 },
    analogue_count: 142, invalidation_note: 'Close below $196.40 on volume invalidates the setup',
  },
  {
    id: 2, symbol_id: 2, scan_id: 0,
    ticker: 'NVDA', name: 'NVIDIA Corporation', market: 'stock' as const,
    type: 'bull' as const, confidence: 88, trend: 82, rr: 3.4,
    expected_move: 11.2, win_rate: 72, vol_confirm: true,
    entry: 875.0, stop: 840.0, t1: 940.0, t2: 990.0, t3: 1050.0,
    signal_age_days: 0, pinned: true,
    factors: { trend_strength: 82, volume_confirmation: 95, historical_win_rate: 72, mtf_alignment: 88, breakout_cleanliness: 90 },
    analogue_count: 118, invalidation_note: 'Close below $840 invalidates',
  },
  {
    id: 3, symbol_id: 3, scan_id: 0,
    ticker: 'EUR/USD', name: 'Euro / US Dollar', market: 'forex' as const,
    type: 'bear' as const, confidence: 79, trend: 71, rr: 2.6,
    expected_move: -3.1, win_rate: 64, vol_confirm: false,
    entry: 1.0920, stop: 1.0980, t1: 1.0760, t2: 1.0680, t3: 1.0580,
    signal_age_days: 2, pinned: false,
    factors: { trend_strength: 71, volume_confirmation: 55, historical_win_rate: 64, mtf_alignment: 79, breakout_cleanliness: 82 },
    analogue_count: 97, invalidation_note: 'Close above 1.0980 invalidates',
  },
  {
    id: 4, symbol_id: 4, scan_id: 0,
    ticker: 'SPX', name: 'S&P 500 Index', market: 'index' as const,
    type: 'bull' as const, confidence: 75, trend: 69, rr: 2.2,
    expected_move: 4.0, win_rate: 61, vol_confirm: true,
    entry: 5320, stop: 5180, t1: 5580, t2: 5720, t3: 5900,
    signal_age_days: 3, pinned: false,
    factors: { trend_strength: 69, volume_confirmation: 82, historical_win_rate: 61, mtf_alignment: 72, breakout_cleanliness: 76 },
    analogue_count: 203, invalidation_note: 'Close below 5180 invalidates',
  },
  {
    id: 5, symbol_id: 5, scan_id: 0,
    ticker: 'XLE', name: 'Energy Select Sector SPDR', market: 'etf' as const,
    type: 'bull' as const, confidence: 72, trend: 64, rr: 2.0,
    expected_move: 5.5, win_rate: 59, vol_confirm: true,
    entry: 91.40, stop: 87.20, t1: 99.8, t2: 103.5, t3: 108.0,
    signal_age_days: 1, pinned: false,
    factors: { trend_strength: 64, volume_confirmation: 78, historical_win_rate: 59, mtf_alignment: 68, breakout_cleanliness: 74 },
    analogue_count: 84, invalidation_note: 'Close below $87.20 invalidates',
  },
  {
    id: 6, symbol_id: 6, scan_id: 0,
    ticker: 'MSFT', name: 'Microsoft Corporation', market: 'stock' as const,
    type: 'bull' as const, confidence: 81, trend: 76, rr: 2.7,
    expected_move: 7.2, win_rate: 66, vol_confirm: true,
    entry: 418.0, stop: 402.0, t1: 445.0, t2: 460.0, t3: 480.0,
    signal_age_days: 0, pinned: false,
    factors: { trend_strength: 76, volume_confirmation: 88, historical_win_rate: 66, mtf_alignment: 82, breakout_cleanliness: 85 },
    analogue_count: 156, invalidation_note: 'Close below $402 invalidates',
  },
]
