import { useEffect, useRef, useState } from 'react'
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

  for (let i = 0; i < turns.length - 1; i++) {
    const priceA = turns[i].price
    const priceB = turns[i + 1].price
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
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    price: number
    state: 'yin' | 'yang'
  } | null>(null)

  const isBull = signal.type === 'bull'
  const segs = buildDemoKagi(signal.entry, signal.stop, signal.t1, isBull)

  const allPrices = segs.flatMap((s) => [s.y1, s.y2])
  const minP = Math.min(...allPrices) * 0.995
  const maxP = Math.max(...allPrices) * 1.005
  const pRange = maxP - minP

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

    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    function toX(i: number) {
      return PAD.left + (i / (segs.length - 0.5)) * chartW
    }
    function toY(price: number) {
      return PAD.top + ((maxP - price) / pRange) * chartH
    }

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

    segs.forEach((seg, i) => {
      const x = toX(i) + (toX(i + 1) - toX(i)) / 2
      const y1 = toY(seg.y1)
      const y2 = toY(seg.y2)
      const color = seg.state === 'yang' ? '#2FCB7E' : '#F2495C'
      const lw = seg.state === 'yang' ? 3 : 1.5

      ctx.strokeStyle = color
      ctx.lineWidth = lw
      ctx.lineCap = 'square'
      ctx.beginPath()
      ctx.moveTo(x, y1)
      ctx.lineTo(x, y2)
      ctx.stroke()

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

    const lastSeg = segs[segs.length - 1]
    const currentY = toY(lastSeg.y2)
    const markerX = toX(segs.length - 0.5)
    ctx.fillStyle = isBull ? '#2FCB7E' : '#F2495C'
    ctx.beginPath()
    ctx.arc(markerX, currentY, 4, 0, Math.PI * 2)
    ctx.fill()
  }, [signal, segs, pRange, isBull, minP, maxP])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const W = rect.width
    const H = rect.height
    const PAD = { top: 24, bottom: 40, left: 60, right: 20 }
    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    function toX(i: number) {
      return PAD.left + (i / (segs.length - 0.5)) * chartW
    }
    function toY(price: number) {
      return PAD.top + ((maxP - price) / pRange) * chartH
    }

    let minDistance = Infinity
    let closestPrice = 0
    let closestState: 'yin' | 'yang' = 'yin'

    segs.forEach((seg, i) => {
      const segX = toX(i) + (toX(i + 1) - toX(i)) / 2
      const y1 = toY(seg.y1)
      const y2 = toY(seg.y2)

      const minY = Math.min(y1, y2)
      const maxY = Math.max(y1, y2)
      let distV = Infinity
      if (mouseY >= minY && mouseY <= maxY) {
        distV = Math.abs(mouseX - segX)
      } else {
        const distToY1 = Math.hypot(mouseX - segX, mouseY - y1)
        const distToY2 = Math.hypot(mouseX - segX, mouseY - y2)
        distV = Math.min(distToY1, distToY2)
      }

      if (distV < minDistance) {
        minDistance = distV
        const interpPrice = maxP - ((mouseY - PAD.top) / chartH) * pRange
        closestPrice = Math.max(Math.min(seg.y1, seg.y2), Math.min(Math.max(seg.y1, seg.y2), interpPrice))
        closestState = seg.state
      }

      if (i < segs.length - 1) {
        const nextSegX = toX(i + 1) + (toX(i + 2) - toX(i + 1)) / 2
        let distH = Infinity
        if (mouseX >= Math.min(segX, nextSegX) && mouseX <= Math.max(segX, nextSegX)) {
          distH = Math.abs(mouseY - y2)
        } else {
          const distToLeft = Math.hypot(mouseX - segX, mouseY - y2)
          const distToRight = Math.hypot(mouseX - nextSegX, mouseY - y2)
          distH = Math.min(distToLeft, distToRight)
        }

        if (distH < minDistance) {
          minDistance = distH
          closestPrice = seg.y2
          closestState = seg.state
        }
      }
    })

    if (minDistance < 25) {
      setTooltip({
        visible: true,
        x: mouseX,
        y: mouseY,
        price: closestPrice,
        state: closestState
      })
    } else {
      setTooltip(null)
    }
  }

  const handleMouseLeave = () => {
    setTooltip(null)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ width: '100%', height: '100%', display: 'block', cursor: tooltip ? 'crosshair' : 'default' }}
      />
      {tooltip && tooltip.visible && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            pointerEvents: 'none',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 100,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: 'var(--ink)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ color: 'var(--muted)' }}>Price:</span>
            <span style={{ color: 'var(--ink2)', fontWeight: 600 }}>
              ${tooltip.price.toFixed(2)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ color: 'var(--muted)' }}>State:</span>
            <span style={{ color: tooltip.state === 'yang' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {tooltip.state.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
