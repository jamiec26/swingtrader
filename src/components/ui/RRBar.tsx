interface Props {
  rr: number
  maxRR?: number
}

export function RRBar({ rr, maxRR = 5 }: Props) {
  const targets = [1, 2, 3, Math.max(rr, 3.1)]
  const clampedRR = Math.min(rr, maxRR)
  const pct = (clampedRR / maxRR) * 100

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          position: 'relative',
          height: '20px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, rgba(76,154,255,0.3), rgba(47,203,126,0.5))',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
        {targets.slice(0, 3).map((t) => {
          const tp = (t / maxRR) * 100
          return (
            <div
              key={t}
              style={{
                position: 'absolute',
                left: `${tp}%`,
                top: 0,
                height: '100%',
                width: '1px',
                background: 'rgba(255,255,255,0.15)',
              }}
            />
          )
        })}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
        }}
      >
        {[1, 2, 3].map((t) => (
          <span
            key={t}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: rr >= t ? 'var(--muted)' : 'var(--subtle)',
            }}
          >
            {t}R
          </span>
        ))}
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            color: 'var(--blue)',
            fontWeight: 600,
          }}
        >
          {rr.toFixed(1)}R
        </span>
      </div>
    </div>
  )
}
