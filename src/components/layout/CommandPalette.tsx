import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store'
import type { Workspace } from '../../types'

interface CmdItem {
  label: string
  hint: string
  action: () => void
}

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setWorkspace, signals, setSelectedSignal } =
    useStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [commandPaletteOpen])

  const workspaceItems: CmdItem[] = [
    { label: 'Market Scan', hint: '⌘1', action: () => nav('scan') },
    { label: 'Opportunity Board', hint: '⌘2', action: () => nav('board') },
    { label: 'Analysis Workspace', hint: '⌘3', action: () => nav('workspace') },
    { label: 'Portfolio Risk', hint: '⌘4', action: () => nav('portfolio') },
    { label: 'Trade Journal', hint: '⌘5', action: () => nav('journal') },
  ]

  const signalItems: CmdItem[] = signals.map((s) => ({
    label: `${s.ticker} — ${s.type === 'bull' ? '▲' : '▼'} conf ${s.confidence}`,
    hint: s.market,
    action: () => {
      setSelectedSignal(s)
      nav('workspace')
    },
  }))

  function nav(ws: Workspace) {
    setWorkspace(ws)
    setCommandPaletteOpen(false)
  }

  const all = [...workspaceItems, ...signalItems]
  const filtered = query
    ? all.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : all

  if (!commandPaletteOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        style={{
          width: 580,
          background: 'var(--surface)',
          border: '1px solid rgba(76,154,255,0.3)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-in"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ color: 'var(--dim)', fontSize: '16px' }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to workspace or symbol…"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--ink)',
              fontSize: '15px',
              fontFamily: 'inherit',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setCommandPaletteOpen(false)
              if (e.key === 'Enter' && filtered[0]) {
                filtered[0].action()
              }
            }}
          />
          <kbd
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: 'var(--dim)',
              background: 'var(--panel)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
            }}
          >
            ESC
          </kbd>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--dim)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
              }}
            >
              No results for "{query}"
            </div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 18px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'none')
                }
              >
                <span>{item.label}</span>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--dim)',
                  }}
                >
                  {item.hint}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
