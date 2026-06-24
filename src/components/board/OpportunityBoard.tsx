import { useState, useMemo } from 'react'
import { useStore } from '../../store'
import { SignalBadge } from '../ui/SignalBadge'
import { ScoreBar } from '../ui/ScoreBar'
import type { Signal, Market } from '../../types'

type SortKey = 'confidence' | 'trend' | 'rr' | 'expected_move' | 'signal_age_days'

const MARKET_LABEL: Record<Market, string> = {
  stock: 'Stock',
  etf: 'ETF',
  forex: 'Forex',
  index: 'Index',
  crypto: 'Crypto',
}

const COL_W = '30px 88px 70px 100px 1fr 1fr 80px 90px 60px 48px'

function ColHeader({
  label,
  sortKey,
  current,
  align = 'left',
  onSort,
}: {
  label: string
  sortKey?: SortKey
  current?: SortKey
  align?: 'left' | 'right' | 'center'
  onSort?: (k: SortKey) => void
}) {
  const active = sortKey && current === sortKey
  return (
    <span
      onClick={() => sortKey && onSort && onSort(sortKey)}
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        letterSpacing: '0.08em',
        color: active ? 'var(--blue)' : 'var(--dim)',
        textAlign: align,
        cursor: sortKey ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {label} {active ? '▾' : ''}
    </span>
  )
}

export function OpportunityBoard() {
  const { signals, selectedSignal, setSelectedSignal, setWorkspace, togglePinSignal } = useStore()
  const [sortKey, setSortKey] = useState<SortKey>('confidence')
  const [filterMarket, setFilterMarket] = useState<Market | 'all'>('all')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'pinned'>('all')

  const sorted = useMemo(() => {
    let list = [...signals]
    if (activeTab === 'pinned') list = list.filter((s) => s.pinned)
    if (filterMarket !== 'all') list = list.filter((s) => s.market === filterMarket)
    if (search) list = list.filter((s) => s.ticker.toLowerCase().includes(search.toLowerCase()))
    list.sort((a, b) => {
      if (sortKey === 'signal_age_days') return a[sortKey] - b[sortKey]
      return b[sortKey] - a[sortKey]
    })
    return list
  }, [signals, sortKey, filterMarket, search, activeTab])

  function openWorkspace(sig: Signal) {
    setSelectedSignal(sig)
    setWorkspace('workspace')
  }

  const pinnedCount = signals.filter((s) => s.pinned).length

  function fmtMove(m: number) {
    return `${m > 0 ? '+' : ''}${m.toFixed(1)}%`
  }

  const markets: (Market | 'all')[] = ['all', 'stock', 'etf', 'forex', 'index', 'crypto']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          height: '48px',
          padding: '0 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--rail)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: activeTab === 'all' ? 'var(--ink)' : 'var(--muted)',
              background: activeTab === 'all' ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            All · {signals.length}
          </button>
          <button
            onClick={() => setActiveTab('pinned')}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: activeTab === 'pinned' ? 'var(--ink)' : 'var(--muted)',
              background: activeTab === 'pinned' ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            Pinned · {pinnedCount}
          </button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="⌕ Search symbol"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: 'var(--muted)',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '5px 12px',
              outline: 'none',
              width: '160px',
            }}
          />
          <select
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value as Market | 'all')}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: 'var(--muted)',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '5px 12px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {markets.map((m) => (
              <option key={m} value={m}>
                {m === 'all' ? 'All Markets' : MARKET_LABEL[m as Market]}
              </option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: 'var(--muted)',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '5px 12px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="confidence">Sort: Confidence</option>
            <option value="trend">Sort: Trend</option>
            <option value="rr">Sort: R:R</option>
            <option value="expected_move">Sort: Exp. Move</option>
            <option value="signal_age_days">Sort: Age</option>
          </select>
        </div>
      </div>

      {/* Table header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COL_W,
          padding: '0 16px',
          height: '36px',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel)',
          flexShrink: 0,
        }}
      >
        <span />
        <ColHeader label="SYMBOL" />
        <ColHeader label="MARKET" />
        <ColHeader label="SIGNAL" />
        <ColHeader label="CONFIDENCE" sortKey="confidence" current={sortKey} onSort={setSortKey} />
        <ColHeader label="TREND STR." sortKey="trend" current={sortKey} onSort={setSortKey} />
        <ColHeader label="R:R" sortKey="rr" current={sortKey} align="right" onSort={setSortKey} />
        <ColHeader label="EXP MOVE" sortKey="expected_move" current={sortKey} align="right" onSort={setSortKey} />
        <ColHeader label="AGE" sortKey="signal_age_days" current={sortKey} align="right" onSort={setSortKey} />
        <ColHeader label="VOL" align="center" />
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--rail)' }}>
        {sorted.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              gap: '12px',
              color: 'var(--dim)',
            }}
          >
            <span style={{ fontSize: '32px' }}>—</span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
              }}
            >
              {signals.length === 0
                ? 'Run a scan to see opportunities'
                : 'No signals match the current filter'}
            </span>
          </div>
        ) : (
          sorted.map((sig) => {
            const isSelected = selectedSignal?.id === sig.id
            return (
              <div
                key={sig.id}
                onClick={() => openWorkspace(sig)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: COL_W,
                  padding: '0 16px',
                  height: '46px',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border2)',
                  background: isSelected ? 'var(--active)' : 'transparent',
                  borderLeft: isSelected ? '2px solid var(--blue)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected ? 'var(--active)' : 'transparent'
                }}
              >
                <span
                  onClick={(e) => { e.stopPropagation(); togglePinSignal(sig.id) }}
                  style={{
                    color: sig.pinned ? 'var(--blue)' : 'var(--subtle)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                >
                  {sig.pinned ? '★' : '☆'}
                </span>

                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '13px',
                    color: 'var(--ink2)',
                    fontWeight: 600,
                  }}
                >
                  {sig.ticker}
                </span>

                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--muted)',
                  }}
                >
                  {MARKET_LABEL[sig.market]}
                </span>

                <SignalBadge type={sig.type} size="sm" />

                <ScoreBar value={sig.confidence} color="var(--green)" />

                <ScoreBar value={sig.trend} color="var(--blue)" />

                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: 'var(--ink)',
                    textAlign: 'right',
                  }}
                >
                  {sig.rr.toFixed(1)}
                </span>

                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: sig.expected_move > 0 ? 'var(--green)' : 'var(--red)',
                    textAlign: 'right',
                  }}
                >
                  {fmtMove(sig.expected_move)}
                </span>

                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--muted)',
                    textAlign: 'right',
                  }}
                >
                  {sig.signal_age_days}d
                </span>

                <span
                  style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: sig.vol_confirm ? 'var(--green)' : 'var(--amber)',
                  }}
                >
                  {sig.vol_confirm ? '✓' : '~'}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
