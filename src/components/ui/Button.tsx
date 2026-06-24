import { type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'confirm'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
}

const styles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--blue)',
    color: '#fff',
    border: 'none',
    fontWeight: 700,
  },
  secondary: {
    background: 'var(--panel)',
    color: 'var(--ink)',
    border: '1px solid var(--border)',
    fontWeight: 500,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--muted)',
    border: '1px solid var(--border)',
    fontWeight: 500,
  },
  danger: {
    background: 'rgba(242,73,92,0.15)',
    color: 'var(--red)',
    border: '1px solid rgba(242,73,92,0.3)',
    fontWeight: 600,
  },
  confirm: {
    background: 'rgba(47,203,126,0.15)',
    color: 'var(--green)',
    border: '1px solid rgba(47,203,126,0.3)',
    fontWeight: 600,
  },
}

const sizes: Record<'sm' | 'md' | 'lg', React.CSSProperties> = {
  sm: { fontSize: '11px', padding: '5px 12px', height: '28px' },
  md: { fontSize: '13px', padding: '7px 16px', height: '34px' },
  lg: { fontSize: '14px', padding: '10px 22px', height: '42px' },
}

export function Button({
  variant = 'secondary',
  size = 'md',
  style,
  children,
  ...rest
}: Props) {
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        letterSpacing: '0.01em',
        transition: 'opacity 0.15s, filter 0.15s',
        fontFamily: "'IBM Plex Mono', monospace",
        ...styles[variant],
        ...sizes[size],
        ...style,
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.filter = 'none')
      }
      {...rest}
    >
      {children}
    </button>
  )
}
