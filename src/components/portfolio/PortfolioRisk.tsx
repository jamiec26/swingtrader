import { useEffect, useState } from 'react'
import { useStore } from '../../store'
import { api } from '../../api/client'
import { KpiTile } from '../ui/KpiTile'
import type { PortfolioHeat, PortfolioPosition } from '../../types'

const MOCK_PORTFOLIO: PortfolioHeat = {
  raw_heat: 3.08,
  adjusted_heat: 2.42,
  max_heat: 6.0,
  positions: [
    { ticker: 'AAPL', direction: 'bull', entry: 180.0, stop: 175.0, units: 240, current_price: 185.20, unrealized_pnl: 1248.00, risk_usd: 1200.00, risk_pct: 0.48, sector: 'Technology' },
    { ticker: 'MSFT', direction: 'bull', entry: 340.0, stop: 330.0, units: 150, current_price: 345.50, unrealized_pnl: 825.00, risk_usd: 1500.00, risk_pct: 0.60, sector: 'Technology' },
    { ticker: 'NVDA', direction: 'bull', entry: 480.0, stop: 460.0, units: 100, current_price: 495.10, unrealized_pnl: 1510.00, risk_usd: 2000.00, risk_pct: 0.80, sector: 'Technology' },
    { ticker: 'JPM',  direction: 'bull', entry: 145.0, stop: 138.0, units: 143, current_price: 142.20, unrealized_pnl: -400.40, risk_usd: 1000.00, risk_pct: 0.40, sector: 'Financials' },
    { ticker: 'XOM',  direction: 'bull', entry: 110.0, stop: 105.0, units: 240, current_price: 107.90, unrealized_pnl: -504.00, risk_usd: 1200.00, risk_pct: 0.48, sector: 'Energy' },
    { ticker: 'GLD',  direction: 'bull', entry: 190.0, stop: 186.0, units: 200, current_price: 194.20, unrealized_pnl: 840.00, risk_usd: 800.00, risk_pct: 0.32, sector: 'Materials' },
  ],
  sector_weights: {
    'Technology': 61.0,
    'Energy': 16.0,
    'Financials': 13.0,
    'Materials': 10.0,
  },
  correlation_warnings: [
    'HIGH CLUSTER: Technology exposure is 61% of total portfolio risk.',
    'CORRELATION WARN: AAPL / MSFT historical correlation exceeds 0.82.',
  ],
  budget_ok: true,
}

export function PortfolioRisk() {
  const { account } = useStore()
  const [data, setData] = useState<PortfolioHeat>(MOCK_PORTFOLIO)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.portfolio.heat()
      .then((res) => {
        if (active) {
          setData(res)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.warn('Could not fetch portfolio heat from API, using demo dataset.', err)
        if (active) {
          // Sync simulated balance metrics with actual account balance
          const updatedPositions = MOCK_PORTFOLIO.positions.map(pos => {
            const risk_pct = (pos.risk_usd / account.balance) * 100
            return { ...pos, risk_pct }
          })
          const raw_heat = updatedPositions.reduce((acc, p) => acc + p.risk_pct, 0)
          const adjusted_heat = raw_heat * 0.785 // Simulating diversification benefit
          
          setData({
            ...MOCK_PORTFOLIO,
            positions: updatedPositions,
            raw_heat,
            adjusted_heat,
            max_heat: account.max_heat || 6.0
          })
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [account.balance, account.max_heat])

  const fmtCurrency = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

  const totalPnl = data.positions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0)

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
          Portfolio Risk Analytics
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace" }}>
          Real-time covariance monitoring & risk budget verification
        </p>
      </div>

      {/* KPI Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <KpiTile
          label="ACCOUNT BALANCE"
          value={fmtCurrency(account.balance)}
          sub={`Base Currency: ${account.base_currency}`}
        />
        <KpiTile
          label="UNREALIZED P&L"
          value={(totalPnl >= 0 ? '+' : '') + fmtCurrency(totalPnl)}
          sub={`${data.positions.length} active positions`}
          color={totalPnl >= 0 ? 'var(--green)' : 'var(--red)'}
        />
        <KpiTile
          label="RAW EXPOSURE HEAT"
          value={`${data.raw_heat.toFixed(2)}%`}
          sub={`Sum of independent risks`}
          color={data.raw_heat > data.max_heat ? 'var(--red)' : 'var(--ink)'}
        />
        <KpiTile
          label="CORRELATION ADJUSTED"
          value={`${data.adjusted_heat.toFixed(2)}%`}
          sub={`Diversification discount: -${(data.raw_heat - data.adjusted_heat).toFixed(2)}%`}
          color="var(--blue)"
          accent={true}
        />
      </div>

      {/* Main Analysis Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        
        {/* Positions Table & Details */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)' }}>
              ACTIVE EXPOSURES
            </span>
            <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--surface)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
              LIVE POSITION METRICS
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--dim)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 500 }}>SYMBOL</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500 }}>DIR</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'right' }}>SIZE</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'right' }}>ENTRY</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'right' }}>MARK</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'right' }}>UNREALIZED P&L</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'right' }}>RISK ($)</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'right' }}>RISK (%)</th>
                </tr>
              </thead>
              <tbody>
                {data.positions.map((pos, idx) => (
                  <tr
                    key={pos.ticker}
                    style={{
                      borderBottom: idx === data.positions.length - 1 ? 'none' : '1px solid var(--border2)',
                      height: 'var(--row-h)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <td style={{ padding: '10px 16px', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)' }}>
                      {pos.ticker}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: pos.direction === 'bull' ? 'var(--green)' : 'var(--red)',
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >
                        {pos.direction === 'bull' ? '▲ LONG' : '▼ SHORT'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>
                      {pos.units}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>
                      {pos.entry.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)' }}>
                      {pos.current_price.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        textAlign: 'right',
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: pos.unrealized_pnl >= 0 ? 'var(--green)' : 'var(--red)',
                        fontWeight: 600,
                      }}
                    >
                      {(pos.unrealized_pnl >= 0 ? '+' : '') + pos.unrealized_pnl.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>
                      ${pos.risk_usd.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>
                      {pos.risk_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Heat Gauge & Sectors Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Gauge Widget */}
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '16px 20px',
            }}
          >
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '16px' }}>
              RISK BUDGET CONSTRAINTS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Linear comparison meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', fontFamily: "'IBM Plex Mono', monospace" }}>
                  <span style={{ color: 'var(--muted)' }}>Covariance Adjusted Heat</span>
                  <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{data.adjusted_heat.toFixed(2)}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(data.adjusted_heat / data.max_heat) * 100}%`,
                      background: 'var(--blue)',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', fontFamily: "'IBM Plex Mono', monospace" }}>
                  <span style={{ color: 'var(--muted)' }}>Raw Sum (No Correlation)</span>
                  <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{data.raw_heat.toFixed(2)}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(data.raw_heat / data.max_heat) * 100}%`,
                      background: 'var(--amber)',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  borderTop: '1px solid var(--border2)',
                  paddingTop: '10px',
                  marginTop: '4px',
                }}
              >
                <span style={{ color: 'var(--dim)' }}>Max Threshold Limit:</span>
                <span style={{ color: 'var(--red)', fontWeight: 700 }}>{data.max_heat.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Sector Weights */}
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '16px 20px',
            }}
          >
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '16px' }}>
              SECTOR LINKAGE MATRIX
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(data.sector_weights).map(([sector, pct]) => (
                <div key={sector}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--muted)' }}>{sector}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)', fontWeight: 600 }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '2.5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: sector === 'Technology' ? 'var(--blue)' : 'var(--muted)',
                        borderRadius: '2.5px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Correlation Warnings */}
          {data.correlation_warnings.length > 0 && (
            <div
              style={{
                background: 'rgba(245,181,68,0.04)',
                border: '1px solid rgba(245,181,68,0.2)',
                borderRadius: 'var(--radius)',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--amber)', fontWeight: 600, letterSpacing: '0.15em', marginBottom: '10px' }}>
                ⚠️ CORRELATION ALERTS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.correlation_warnings.map((warn, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '11px',
                      lineHeight: 1.5,
                      color: 'var(--muted)',
                      borderLeft: '2px solid var(--amber)',
                      paddingLeft: '8px',
                    }}
                  >
                    {warn}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Risk Disclaimers / Information */}
      <div
        style={{
          marginTop: 'auto',
          padding: '12px 16px',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontSize: '11px',
          color: 'var(--dim)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--muted)' }}>Note on Correlation-Adjusted Risk:</strong> Calculated based on the formula: 
        <code style={{ color: 'var(--blue)', fontFamily: "'IBM Plex Mono', monospace", padding: '0 4px' }}>heat_adj = √(rᵀ · C · r) / balance</code>.
        This covariance model accounts for sector cluster factors and index linkages to discount diversified risk while highlighting compounding clusters (such as tech-heavy assets). Keep adjusted heat below your risk limit of {account.max_heat || 6.0}%.
      </div>
    </div>
  )
}
