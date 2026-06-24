interface Props {
  label: string
  value: string | number
  sub?: string
  color?: string
  accent?: boolean
}

export function KpiTile({ label, value, sub, color, accent }: Props) {
  return (
    <div
      style={{
        background: accent ? 'rgba(76,154,255,0.08)' : 'var(--panel)',
        border: `1px solid ${accent ? 'rgba(76,154,255,0.25)' : 'var(--border)'}`,
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
        {label}
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '22px',
          fontWeight: 600,
          color: color ?? 'var(--ink)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: 'var(--dim)',
            marginTop: '4px',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
