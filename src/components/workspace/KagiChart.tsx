import { useEffect, useRef } from 'react'
import type { Signal } from '../../types'

interface KagiSegment {
  x: number
  y1: number
  y2: number
  state: 'yin' | 'yang'
}

function buildDemoKagi(entry: number, stop: number, t1: number, isBull: boolean): KagiSegment[] {
  const segs: KagiSegment[] = []
  const range = Math.abs(entry - stop) * 8
  const base = isBull ? stop - range * 0.3 : t1 + range * 0.3

  // Build synthetic Kagi from left to right
  const turns = isBull
    ? [
        { price: base, dir: -1 },
        { price: base + range * 0.35, dir: 1 },
        { price: base + range * 0.10, dir: -1 },
        { price: base + range * 0.55, dir: 1 },
        { price: base + range * 0.28, dir: -1 },
        { price: base + range * 0.75, dir: 1 },  // yang breakout
        { price: entry, dir: -1 },
        { price: t1, dir: 1 },
      ]
    : [
        { price: base, dir: 1 },
        { price: base - range * 0.35, dir: -1 },
        { price: base - range * 0.10, dir: 1 },
        { price: base - range * 0.55, dir: -1 },
        { price: base - range * 0.28, dir: 1 },
        { price: base - range * 0.75, dir: -1 },
        { price: entry, dir: 1 },
        { price: t1, dir: -1 },
      ]

  // Compute yang/yin state (yang after crossing prior shoulder)
  for (let i = 0; i < turns.length - 1; i++) {
    const priceA = turns[i].price
    const priceB = turns[i + 1].price
    // Simple heuristic: last 2 segments are yang for bull
    const isYang = isBull ? i >= turns.length - 3 : i < 3 || i >= turns.length - 3
    segs.push({
      x: i,
      y1: priceA,
      y2: priceB,
      state: isYang ? 'yang' : 'yin',
    })
  }

  return segs
}

interface Props {
  signal: Signal
}

export function KagiChart({ signal }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const W = rect.width
    const H = rect.height
    const PAD = { top: 24, bottom: 40, left: 60, right: 20 }

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0B0E13'
    ctx.fillRect(0, 0, W, H)

    const isBull = signal.type === 'bull'
    const segs = buildDemoKagi(signal.entry, signal.stop, signal.t1, isBull)

    const allPrices = segs.flatMap((s) => [s.y1, s.y2])
    const minP = Math.min(...allPrices) * 0.995
    const maxP = Math.max(...allPrices) * 1.005
    const pRange = maxP - minP
    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    function toX(i: number) {
      return PAD.left + (i / (segs.length - 0.5)) * chartW
    }
    function toY(price: number) {
      return PAD.top + ((maxP - price) / pRange) * chartH
    }

    // Grid lines at key levels
    const keyLevels = [
      { price: signal.stop, label: 'SL', color: '#F2495C' },
      { price: signal.entry, label: 'ENTRY', color: '#4C9AFF' },
      { price: signal.t1, label: 'T1', color: '#2FCB7E' },
      { price: signal.t2, label: 'T2', color: '#2FCB7E' },
      { price: signal.t3, label: 'T3', color: '#2FCB7E' },
    ]

    keyLevels.forEach(({ price, label, color }) => {
      const y = toY(price)
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = color + '55'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(PAD.left, y)
      ctx.lineTo(W - PAD.right, y)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.font = "10px 'IBM Plex Mono', monospace"
      ctx.fillStyle = color
      ctx.textAlign = 'left'
      ctx.fillText(label, 4, y + 4)

      ctx.fillStyle = color + 'BB'
      ctx.textAlign = 'right'
      ctx.fillText(
        price < 10 ? price.toFixed(4) : price.toFixed(2),
        W - 2,
        y + 4
      )
    })

    // Draw Kagi segments
    segs.forEach((seg, i) => {
      const x = toX(i) + (toX(i + 1) - toX(i)) / 2
      const xNext = toX(i + 1)
      const y1 = toY(seg.y1)
      const y2 = toY(seg.y2)
      const color = seg.state === 'yang' ? '#2FCB7E' : '#F2495C'
      const lw = seg.state === 'yang' ? 3 : 1.5

      // Vertical line
      ctx.strokeStyle = color
      ctx.lineWidth = lw
      ctx.lineCap = 'square'
      ctx.beginPath()
      ctx.moveTo(x, y1)
      ctx.lineTo(x, y2)
      ctx.stroke()

      // Horizontal connector to next
      if (i < segs.length - 1) {
        const xN = toX(i + 1) + (toX(i + 2) - toX(i + 1)) / 2
        ctx.strokeStyle = color
        ctx.lineWidth = lw
        ctx.beginPath()
        ctx.moveTo(x, y2)
        ctx.lineTo(xN, y2)
        ctx.stroke()
      }
    })

    // Axis labels (left side prices)
    const nLabels = 5
    for (let i = 0; i <= nLabels; i++) {
      const price = minP + (pRange * i) / nLabels
      const y = toY(price)
      ctx.font = "10px 'IBM Plex Mono', monospace"
      ctx.fillStyle = '#626A78'
      ctx.textAlign = 'right'
      ctx.fillText(
        price < 10 ? price.toFixed(4) : price.toFixed(2),
        PAD.left - 4,
        y + 4
      )
    }

    // Current price marker
    const lastSeg = segs[segs.length - 1]
    const currentY = toY(lastSeg.y2)
    const markerX = toX(segs.length - 0.5)
    ctx.fillStyle = isBull ? '#2FCB7E' : '#F2495C'
    ctx.beginPath()
    ctx.arc(markerX, currentY, 4, 0, Math.PI * 2)
    ctx.fill()
  }, [signal])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}
