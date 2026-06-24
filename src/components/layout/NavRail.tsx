import { useStore } from '../../store'
import type { Workspace } from '../../types'

const KagiIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 16 L3 9 L8 9 L8 14 L13 14 L13 5 L18 5 L18 11 L21 11"
      stroke="var(--blue)"
      strokeWidth="2.2"
      strokeLinecap="square"
      strokeLinejoin="miter"
    />
  </svg>
)

const WORKSPACES: { id: Workspace; label: string; key: string }[] = [
  { id: 'scan',      label: 'Scan',      key: '1' },
  { id: 'board',     label: 'Board',     key: '2' },
  { id: 'workspace', label: 'Workspace', key: '3' },
  { id: 'portfolio', label: 'Portfolio', key: '4' },
  { id: 'journal',   label: 'Journal',   key: '5' },
]

export function NavRail() {
  const { workspace, setWorkspace, account } = useStore()

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '52px',
        padding: '0 16px',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        gap: '4px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', gap: '7px', marginRight: '18px' }}>
        {['#FF5F57','#FEBC2E','#28C840'].map((c) => (
          <span
            key={c}
            style={{
              width: 11, height: 11,
              borderRadius: '50%',
              background: c,
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      <KagiIcon />
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--ink)',
          marginRight: '20px',
          marginLeft: '8px',
          letterSpacing: '0.04em',
        }}
      >
        KTW
      </span>

      {WORKSPACES.map((ws) => {
        const active = workspace === ws.id
        return (
          <button
            key={ws.id}
            onClick={() => setWorkspace(ws.id)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              fontWeight: active ? 700 : 400,
              color: active ? 'var(--canvas)' : 'var(--muted)',
              background: active ? 'var(--blue)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title={`⌘${ws.key}`}
          >
            {ws.label}
          </button>
        )
      })}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12px',
            color: 'var(--muted)',
          }}
        >
          ⌘K
        </span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12px',
            color: 'var(--ink)',
          }}
        >
          {fmt(account.balance)}
        </span>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '7px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            color: 'var(--muted)',
          }}
        >
          JC
        </div>
      </div>
    </div>
  )
}
