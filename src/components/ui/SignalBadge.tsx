import type { Direction } from '../../types'

interface Props {
  type: Direction
  size?: 'sm' | 'md'
}

export function SignalBadge({ type, size = 'md' }: Props) {
  const isBull = type === 'bull'
  const color = isBull ? 'var(--green)' : 'var(--red)'
  const bg = isBull ? 'rgba(47,203,126,0.12)' : 'rgba(242,73,92,0.12)'
  const label = isBull ? '▲ BULL' : '▼ BEAR'
  const fs = size === 'sm' ? '10px' : '11px'
  const pad = size === 'sm' ? '2px 6px' : '3px 8px'

  return (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: fs,
        color,
        background: bg,
        padding: pad,
        borderRadius: '5px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
