interface Props {
  value: number
  max?: number
  color?: string
  label?: string
  showValue?: boolean
}

export function ScoreBar({
  value,
  max = 100,
  color = 'var(--green)',
  showValue = true,
}: Props) {
  const pct = Math.min(100, (value / max) * 100)

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
      <span
        style={{
          flex: 1,
          height: '5px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            display: 'block',
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }}
        />
      </span>
      {showValue && (
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12px',
            color: 'var(--ink)',
            minWidth: '24px',
            textAlign: 'right',
          }}
        >
          {value}
        </span>
      )}
    </span>
  )
}
