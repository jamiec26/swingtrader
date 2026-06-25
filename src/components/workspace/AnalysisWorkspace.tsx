import { useState } from 'react'
import { useStore } from '../../store'
import { api } from '../../api/client'
import { SignalPanel } from './SignalPanel'
import { KagiChart } from './KagiChart'
import { RiskPanel } from './RiskPanel'

export function AnalysisWorkspace() {
  const { selectedSignal, setSelectedSignal, scanConfig } = useStore()
  const [searchVal, setSearchVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const query = searchVal.trim()
    if (!query) return
    setLoading(true)
    setError(null)
    try {
      const sig = await api.signals.analyze(
        query,
        scanConfig.reversal_type,
        scanConfig.reversal_value
      )
      setSelectedSignal(sig)
      setSearchVal('') // clear search box on success
    } catch (err: any) {
      setError(err?.message || `Failed to analyze ticker "${query}". Ensure it is a valid symbol.`)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedSignal) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 52px)',
          background: 'var(--canvas)',
          color: 'var(--dim)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          gap: '12px',
          textAlign: 'center',
          padding: '40px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: 'var(--blue)',
            marginBottom: '8px',
          }}
        >
          🔍
        </div>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Analyze Any Stock Symbol</div>
        <p style={{ margin: 0, maxWidth: '380px', lineHeight: 1.6, color: 'var(--muted)', marginBottom: '8px' }}>
          Enter any ticker symbol (e.g. AAPL, BTCUSD, EURUSD) to build a Kagi chart and calculate confidence metrics on-the-fly.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '340px' }}>
          <input
            type="text"
            placeholder="Enter symbol..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '8px 12px',
              color: 'var(--ink)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--blue)',
              color: '#0A0C10',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '13px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'ANALYZING...' : 'ANALYZE'}
          </button>
        </form>

        {error && (
          <div style={{ color: 'var(--red)', marginTop: '8px', fontSize: '12px', maxWidth: '340px' }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 52px)',
        overflow: 'hidden',
        background: 'var(--canvas)',
      }}
    >
      {/* Chart Header Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
              {selectedSignal.ticker}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
              Daily Kagi Chart · Reversal: {scanConfig.reversal_type === 'pct' ? `${scanConfig.reversal_value}%` : scanConfig.reversal_type === 'atr' ? `${scanConfig.reversal_value} ATR` : `${scanConfig.reversal_value} Traditional`}
            </span>
          </div>

          {/* Quick lookup input */}
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="text"
              placeholder="Lookup symbol..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '4px 8px',
                color: 'var(--ink)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
                width: '120px',
                outline: 'none',
                transition: 'width 0.15s ease',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--blue)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {loading ? '...' : 'GO'}
            </button>
          </form>
        </div>

        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: selectedSignal.type === 'bull' ? 'var(--green)' : 'var(--red)',
            background: selectedSignal.type === 'bull' ? 'rgba(47,203,126,0.1)' : 'rgba(242,73,92,0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 600,
          }}
        >
          {selectedSignal.type === 'bull' ? 'YANG BREAKOUT (BULL)' : 'YIN BREAKDOWN (BEAR)'}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(242,73,92,0.1)', color: 'var(--red)', fontSize: '11px', padding: '6px 20px', borderBottom: '1px solid rgba(242,73,92,0.2)', flexShrink: 0 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main content grid */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Left panel: Signal factors & levels */}
        <div
          style={{
            width: '320px',
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--panel)',
            height: '100%',
          }}
        >
          <SignalPanel signal={selectedSignal} />
        </div>

        {/* Centre panel: Kagi Chart */}
        <div
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#0B0E13',
          }}
        >
          {/* Canvas container */}
          <div style={{ flex: 1, position: 'relative' }}>
            <KagiChart signal={selectedSignal} />
          </div>
        </div>

        {/* Right panel: Risk calculator & Builder */}
        <div
          style={{
            width: '340px',
            flexShrink: 0,
            borderLeft: '1px solid var(--border)',
            background: 'var(--panel)',
            height: '100%',
          }}
        >
          <RiskPanel />
        </div>
      </div>
    </div>
  )
}
