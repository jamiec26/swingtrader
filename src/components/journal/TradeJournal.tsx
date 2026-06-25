import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import type { JournalEntry, Outcome } from '../../types'

const MOCK_JOURNAL: JournalEntry[] = [
  {
    id: 1,
    plan_id: 101,
    ticker: 'TSLA',
    direction: 'bull',
    entry: 220.0,
    stop: 210.0,
    t1: 245.0,
    exit_price: 245.0,
    exit_ts: '2026-06-18T16:00:00Z',
    result_r: 2.5,
    pnl_usd: 2500.0,
    outcome: 'win',
    hold_days: 8,
    notes: 'Kagi yang breakout confirmed on heavy volume. Target 1 hit perfectly at shoulder high.',
    screenshot_path: null,
    created_at: '2026-06-10T09:30:00Z',
  },
  {
    id: 2,
    plan_id: 102,
    ticker: 'AMD',
    direction: 'bull',
    entry: 110.0,
    stop: 105.0,
    t1: 125.0,
    exit_price: 105.0,
    exit_ts: '2026-06-15T10:15:00Z',
    result_r: -1.0,
    pnl_usd: -1000.0,
    outcome: 'loss',
    hold_days: 3,
    notes: 'Waist support failed under macro tech selloff. Stopped out cleanly. Reversal was too aggressive.',
    screenshot_path: null,
    created_at: '2026-06-12T14:00:00Z',
  },
  {
    id: 3,
    plan_id: 103,
    ticker: 'COIN',
    direction: 'bear',
    entry: 150.0,
    stop: 156.25,
    t1: 130.0,
    exit_price: 130.0,
    exit_ts: '2026-06-20T21:00:00Z',
    result_r: 3.2,
    pnl_usd: 3200.0,
    outcome: 'win',
    hold_days: 5,
    notes: 'Yin line breakdown after rejection at psychological resistance. Cover level hit at waist base.',
    screenshot_path: null,
    created_at: '2026-06-15T11:00:00Z',
  },
  {
    id: 4,
    plan_id: 104,
    ticker: 'EURUSD',
    direction: 'bull',
    entry: 1.0850,
    stop: 1.0800,
    t1: 1.1000,
    exit_price: 1.0852,
    exit_ts: '2026-06-22T08:00:00Z',
    result_r: 0.04,
    pnl_usd: 40.0,
    outcome: 'breakeven',
    hold_days: 2,
    notes: 'Stalled at entry region for 48 hours. Moved stop to break-even to release margin.',
    screenshot_path: null,
    created_at: '2026-06-20T08:00:00Z',
  },
  {
    id: 5,
    plan_id: 105,
    ticker: 'BTCUSD',
    direction: 'bull',
    entry: 62000.0,
    stop: 60000.0,
    t1: 68000.0,
    exit_price: null,
    exit_ts: null,
    result_r: null,
    pnl_usd: null,
    outcome: 'open',
    hold_days: null,
    notes: 'Still active. Watching the daily candle for Kagi line continuity. Trend remains yang.',
    screenshot_path: null,
    created_at: '2026-06-24T00:00:00Z',
  },
]

export function TradeJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>(MOCK_JOURNAL)
  const [search, setSearch] = useState('')
  const [filterOutcome, setFilterOutcome] = useState<Outcome | 'all'>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Form states for the expanded/editing entry
  const [editExitPrice, setEditExitPrice] = useState<string>('')
  const [editOutcome, setEditOutcome] = useState<Outcome>('open')
  const [editNotes, setEditNotes] = useState<string>('')
  const [editHoldDays, setEditHoldDays] = useState<string>('')
  const [savingId, setSavingId] = useState<number | null>(null)

  const fetchJournal = async () => {
    try {
      const data = await api.journal.list()
      if (data && data.length > 0) {
        setEntries(data)
      } else {
        setEntries(MOCK_JOURNAL)
      }
    } catch (err) {
      console.warn('API connection failed, falling back to mock journal.', err)
      setEntries(MOCK_JOURNAL)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJournal()
  }, [])

  const handleExpand = (entry: JournalEntry) => {
    if (expandedId === entry.id) {
      setExpandedId(null)
    } else {
      setExpandedId(entry.id)
      setEditExitPrice(entry.exit_price ? entry.exit_price.toString() : '')
      setEditOutcome(entry.outcome)
      setEditNotes(entry.notes)
      setEditHoldDays(entry.hold_days ? entry.hold_days.toString() : '')
    }
  }

  const handleSave = async (id: number) => {
    setSavingId(id)
    const exitPriceVal = editExitPrice === '' ? null : parseFloat(editExitPrice)
    const holdDaysVal = editHoldDays === '' ? null : parseInt(editHoldDays)

    // Calculate simulated R-multiple and P&L if exit price is filled
    const targetEntry = entries.find((e) => e.id === id)
    let pnl = targetEntry?.pnl_usd || null
    let rMult = targetEntry?.result_r || null

    if (targetEntry && exitPriceVal !== null) {
      const directionMult = targetEntry.direction === 'bull' ? 1 : -1
      const stopDistance = Math.abs(targetEntry.entry - targetEntry.stop)
      if (stopDistance > 0) {
        rMult = ((exitPriceVal - targetEntry.entry) * directionMult) / stopDistance
        // Assume nominal $1,000 risk per R-multiple unit for simulation if not tracked
        pnl = rMult * 1000
      }
    } else if (editOutcome === 'open') {
      pnl = null
      rMult = null
    }

    const updatedData: Partial<JournalEntry> = {
      exit_price: exitPriceVal,
      outcome: editOutcome,
      notes: editNotes,
      hold_days: holdDaysVal,
      pnl_usd: pnl,
      result_r: rMult,
    }

    try {
      await api.journal.update(id, updatedData)
      await fetchJournal()
      setExpandedId(null)
    } catch (err) {
      console.error('Failed to update journal via API, updating locally...', err)
      // Fallback local update
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updatedData } : e))
      )
      setExpandedId(null)
    } finally {
      setSavingId(null)
    }
  }

  // Filter entries
  const filtered = entries.filter((e) => {
    const matchesSearch = e.ticker.toLowerCase().includes(search.toLowerCase())
    const matchesOutcome = filterOutcome === 'all' || e.outcome === filterOutcome
    return matchesSearch && matchesOutcome
  })

  // Summary Metrics calculations
  const closedEntries = entries.filter((e) => e.outcome !== 'open')
  const winEntries = entries.filter((e) => e.outcome === 'win')
  const totalClosed = closedEntries.length
  const winRate = totalClosed > 0 ? (winEntries.length / totalClosed) * 100 : 0
  const avgR =
    closedEntries.length > 0
      ? closedEntries.reduce((sum, e) => sum + (e.result_r || 0), 0) / closedEntries.length
      : 0
  const totalPnl = entries.reduce((sum, e) => sum + (e.pnl_usd || 0), 0)

  const fmtCurrency = (n: number) =>
    n.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })

  const getOutcomeBadgeStyle = (outcome: Outcome): React.CSSProperties => {
    switch (outcome) {
      case 'win':
        return { color: 'var(--green)', background: 'rgba(47,203,126,0.1)', border: '1px solid rgba(47,203,126,0.2)' }
      case 'loss':
        return { color: 'var(--red)', background: 'rgba(242,73,92,0.1)', border: '1px solid rgba(242,73,92,0.2)' }
      case 'breakeven':
        return { color: 'var(--amber)', background: 'rgba(245,181,68,0.1)', border: '1px solid rgba(245,181,68,0.2)' }
      default:
        return { color: 'var(--blue)', background: 'rgba(76,154,255,0.1)', border: '1px solid rgba(76,154,255,0.2)' }
    }
  }

  return (
    <div
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        height: 'calc(100vh - 52px)',
        overflowY: 'auto',
        background: 'var(--canvas)',
      }}
      className="animate-in"
    >
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--ink)' }}>
          Trade Journal
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace" }}>
          Historical trade logs, outcomes, and post-trade performance analytics
        </p>
      </div>

      {/* Summary KPI Block */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
          <div style={{ fontSize: '10px', color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', marginBottom: '6px' }}>TOTAL TRADES</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>
            {entries.length} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)' }}>({entries.filter(e => e.outcome === 'open').length} active)</span>
          </div>
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
          <div style={{ fontSize: '10px', color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', marginBottom: '6px' }}>WIN RATE</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--green)', fontFamily: "'IBM Plex Mono', monospace" }}>
            {winRate.toFixed(1)}% <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)' }}>({winEntries.length} / {totalClosed} closed)</span>
          </div>
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
          <div style={{ fontSize: '10px', color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', marginBottom: '6px' }}>AVERAGE R-MULTIPLE</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: avgR >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: "'IBM Plex Mono', monospace" }}>
            {(avgR >= 0 ? '+' : '') + avgR.toFixed(2)}R
          </div>
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
          <div style={{ fontSize: '10px', color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', marginBottom: '6px' }}>CUMULATIVE P&L</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: "'IBM Plex Mono', monospace" }}>
            {(totalPnl >= 0 ? '+' : '') + fmtCurrency(totalPnl)}
          </div>
        </div>
      </div>

      {/* Filters & Control bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search by symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '220px',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            color: 'var(--ink)',
            fontSize: '13px',
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: '4px' }}>
          {(['all', 'open', 'win', 'loss', 'breakeven'] as const).map((o) => (
            <button
              key={o}
              onClick={() => setFilterOutcome(o)}
              style={{
                background: filterOutcome === o ? 'var(--blue)' : 'var(--panel)',
                color: filterOutcome === o ? 'var(--canvas)' : 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: "'IBM Plex Mono', monospace",
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Main Logs Table */}
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--dim)', background: 'rgba(255,255,255,0.01)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 500 }}>SYMBOL</th>
              <th style={{ padding: '12px 16px', fontWeight: 500 }}>DIRECTION</th>
              <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>ENTRY</th>
              <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>EXIT</th>
              <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>R-MULTIPLE</th>
              <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>NET P&L</th>
              <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'center' }}>OUTCOME</th>
              <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>HOLD DAYS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--dim)',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  No trade logs match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((entry) => {
                const isExpanded = expandedId === entry.id
                return (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(76,154,255,0.02)' : 'none',
                    }}
                    onClick={() => handleExpand(entry)}
                    className="hover-row"
                  >
                    <td colSpan={8} style={{ padding: 0 }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr 1fr 1.2fr 1fr',
                          width: '100%',
                          alignItems: 'center',
                          padding: '10px 16px',
                        }}
                      >
                        {/* Cell 1: Ticker */}
                        <div style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)' }}>
                          {entry.ticker}
                        </div>
                        {/* Cell 2: Direction */}
                        <div style={{ color: entry.direction === 'bull' ? 'var(--green)' : 'var(--red)', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: '11px' }}>
                          {entry.direction === 'bull' ? '▲ BULL' : '▼ BEAR'}
                        </div>
                        {/* Cell 3: Entry */}
                        <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>
                          {entry.entry.toFixed(2)}
                        </div>
                        {/* Cell 4: Exit */}
                        <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: entry.exit_price ? 'var(--ink)' : 'var(--dim)' }}>
                          {entry.exit_price ? entry.exit_price.toFixed(2) : 'Active'}
                        </div>
                        {/* Cell 5: R-Multiple */}
                        <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: entry.result_r !== null ? (entry.result_r >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--dim)', fontWeight: 600 }}>
                          {entry.result_r !== null ? `${entry.result_r >= 0 ? '+' : ''}${entry.result_r.toFixed(1)}R` : '—'}
                        </div>
                        {/* Cell 6: PNL */}
                        <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: entry.pnl_usd !== null ? (entry.pnl_usd >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--dim)', fontWeight: 600 }}>
                          {entry.pnl_usd !== null ? `${entry.pnl_usd >= 0 ? '+' : ''}$${Math.abs(entry.pnl_usd).toFixed(0)}` : '—'}
                        </div>
                        {/* Cell 7: Outcome */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              fontFamily: "'IBM Plex Mono', monospace",
                              padding: '2px 8px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              width: '90px',
                              textAlign: 'center',
                              ...getOutcomeBadgeStyle(entry.outcome),
                            }}
                          >
                            {entry.outcome}
                          </span>
                        </div>
                        {/* Cell 8: Hold Days */}
                        <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>
                          {entry.hold_days !== null ? `${entry.hold_days}d` : '—'}
                        </div>
                      </div>

                      {/* Expanded View */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: '16px 20px',
                            background: 'var(--surface)',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            cursor: 'default',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                            {/* Exit price edit */}
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>Exit Price ($)</label>
                              <input
                                type="number"
                                step="any"
                                value={editExitPrice}
                                onChange={(e) => setEditExitPrice(e.target.value)}
                                placeholder="Not exited yet"
                                style={{
                                  width: '100%',
                                  background: 'var(--panel)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '8px 10px',
                                  color: 'var(--ink)',
                                  fontSize: '13px',
                                  fontFamily: "'IBM Plex Mono', monospace",
                                }}
                              />
                            </div>

                            {/* Outcome dropdown */}
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>Trade Outcome</label>
                              <select
                                value={editOutcome}
                                onChange={(e) => setEditOutcome(e.target.value as Outcome)}
                                style={{
                                  width: '100%',
                                  background: 'var(--panel)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '8px 10px',
                                  color: 'var(--ink)',
                                  fontSize: '13px',
                                  outline: 'none',
                                }}
                              >
                                <option value="open">Active (Open)</option>
                                <option value="win">Win (Target Hit)</option>
                                <option value="loss">Loss (Stopped Out)</option>
                                <option value="breakeven">Breakeven</option>
                              </select>
                            </div>

                            {/* Hold days */}
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>Hold Duration (Days)</label>
                              <input
                                type="number"
                                value={editHoldDays}
                                onChange={(e) => setEditHoldDays(e.target.value)}
                                placeholder="Days in trade"
                                style={{
                                  width: '100%',
                                  background: 'var(--panel)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '8px 10px',
                                  color: 'var(--ink)',
                                  fontSize: '13px',
                                  fontFamily: "'IBM Plex Mono', monospace",
                                }}
                              />
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>Trade Notes & Review</label>
                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Review what went right/wrong, Kagi transitions, or emotional state during execution..."
                              style={{
                                width: '100%',
                                height: '80px',
                                background: 'var(--panel)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px 12px',
                                color: 'var(--ink)',
                                fontSize: '13px',
                                fontFamily: 'inherit',
                                resize: 'none',
                                outline: 'none',
                              }}
                            />
                          </div>

                          {/* Save button */}
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button size="sm" variant="ghost" onClick={() => setExpandedId(null)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleSave(entry.id)}
                              disabled={savingId === entry.id}
                            >
                              {savingId === entry.id ? 'Saving...' : 'Save Log Entry'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
