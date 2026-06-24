import { SignalBadge } from '../ui/SignalBadge'
import { ScoreBar } from '../ui/ScoreBar'
import type { Signal } from '../../types'

const FACTOR_LABELS: Record<string, string> = {
  trend_strength: 'Trend strength',
  volume_confirmation: 'Volume confirm',
  historical_win_rate: 'Win rate (hist.)',
  mtf_alignment: 'MTF alignment',
  breakout_cleanliness: 'Breakout clarity',
}

const FACTOR_WEIGHTS: Record<string, number> = {
  trend_strength: 0.30,
  volume_confirmation: 0.20,
  historical_win_rate: 0.20,
  mtf_alignment: 0.15,
  breakout_cleanliness: 0.15,
}

interface Props {
  signal: Signal
}

function fmt(n: number) {
  return n < 10 ? n.toFixed(4) : n.toFixed(2)
}

export function SignalPanel({ signal }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        overflowY: 'auto',
        height: '100%',
      }}
    >
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--ink2)',
            }}
          >
            {signal.ticker}
          </span>
          <SignalBadge type={signal.type} />
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: 'var(--dim)',
          }}
        >
          {signal.name} · {signal.market.toUpperCase()}
        </div>
      </div>

      {/* Confidence score */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.12em',
            color: 'var(--dim)',
            marginBottom: '14px',
          }}
        >
          CONFIDENCE BREAKDOWN
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '40px',
              fontWeight: 700,
              color: 'var(--ink2)',
              lineHeight: 1,
            }}
          >
            {signal.confidence}
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              color: 'var(--dim)',
            }}
          >
            / 100
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(signal.factors).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '10px',
                  color: 'var(--muted)',
                  width: '120px',
                  flexShrink: 0,
                }}
              >
                {FACTOR_LABELS[key] ?? key}
              </div>
              <ScoreBar value={val as number} color="var(--blue)" />
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '10px',
                  color: 'var(--dim)',
                  width: '30px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {Math.round((FACTOR_WEIGHTS[key] ?? 0) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Key levels */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.12em',
            color: 'var(--dim)',
            marginBottom: '12px',
          }}
        >
          KEY LEVELS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { label: 'Entry', value: signal.entry, color: 'var(--blue)' },
            { label: 'Stop loss', value: signal.stop, color: 'var(--red)' },
            { label: 'Target 1', value: signal.t1, color: 'var(--green)' },
            { label: 'Target 2', value: signal.t2, color: 'var(--green)' },
            { label: 'Target 3', value: signal.t3, color: 'var(--green)' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{label}</span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '13px',
                  color,
                  fontWeight: 600,
                }}
              >
                {fmt(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.12em',
            color: 'var(--dim)',
            marginBottom: '12px',
          }}
        >
          SIGNAL STATS
        </div>
        {[
          { label: 'Expected move', value: `${signal.expected_move > 0 ? '+' : ''}${signal.expected_move.toFixed(1)}%`, color: signal.expected_move > 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Win rate (hist.)', value: `${signal.win_rate}%`, color: 'var(--ink)' },
          { label: 'Analogues (k-NN)', value: `n=${signal.analogue_count}`, color: 'var(--muted)' },
          { label: 'R:R ratio', value: `${signal.rr.toFixed(1)}`, color: 'var(--ink)' },
          { label: 'Signal age', value: `${signal.signal_age_days}d`, color: 'var(--muted)' },
          { label: 'Volume confirm', value: signal.vol_confirm ? 'Yes' : 'Weak', color: signal.vol_confirm ? 'var(--green)' : 'var(--amber)' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid var(--border2)',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{label}</span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color,
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Invalidation */}
      <div style={{ padding: '16px 20px' }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.12em',
            color: 'var(--dim)',
            marginBottom: '8px',
          }}
        >
          INVALIDATION
        </div>
        <p
          style={{
            fontSize: '12px',
            lineHeight: 1.6,
            color: 'var(--muted)',
            margin: 0,
            padding: '10px 12px',
            background: 'rgba(242,73,92,0.06)',
            border: '1px solid rgba(242,73,92,0.15)',
            borderRadius: '6px',
          }}
        >
          {signal.invalidation_note}
        </p>
      </div>
    </div>
  )
}
