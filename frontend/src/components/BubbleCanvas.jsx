import { useEffect, useRef } from 'react'

const BLOB_DEFS = [
  { fx: 0.14, fy: 0.28, r: 300, rgb: '82,183,136',  op: 0.65, phX: 0.0, phY: 0.0 },
  { fx: 0.82, fy: 0.68, r: 340, rgb: '45,106,79',   op: 0.60, phX: 2.1, phY: 1.4 },
  { fx: 0.48, fy: 0.10, r: 260, rgb: '149,213,178', op: 0.50, phX: 4.3, phY: 3.8 },
  { fx: 0.16, fy: 0.82, r: 320, rgb: '27,83,57',    op: 0.58, phX: 1.6, phY: 5.1 },
  { fx: 0.88, fy: 0.24, r: 280, rgb: '82,183,136',  op: 0.45, phX: 3.4, phY: 2.9 },
]

const N_SEGS = 32
const DRIFT  = 0.00022
// REACH must exceed the largest blob radius (340) so the cursor
// anywhere inside a blob can still reach every surface point.
const REACH  = 420
const PUSH   = 250
const SPRING = 0.20
const DAMP   = 0.70

export default function BubbleCanvas() {
  const canvasRef = useRef(null)
  const mouseRef  = useRef({ x: -9999, y: -9999 })
  const blobsRef  = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      blobsRef.current = BLOB_DEFS.map(d => ({
        ...d,
        x:  d.fx * canvas.width,
        y:  d.fy * canvas.height,
        vx: 0, vy: 0,
        off: new Float32Array(N_SEGS),  // radial offset per surface pt
        vel: new Float32Array(N_SEGS),  // radial velocity per surface pt
      }))
    }
    resize()
    window.addEventListener('resize', resize)

    const onMove  = e => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    const onLeave = ()  => { mouseRef.current = { x: -9999, y: -9999 } }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)

    let animId
    let frame = 0

    function drawSmooth(pts) {
      const n = pts.length
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n]
        const p1 = pts[i]
        const p2 = pts[(i + 1) % n]
        const p3 = pts[(i + 2) % n]
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        if (i === 0) ctx.moveTo(p1.x, p1.y)
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
      }
      ctx.closePath()
    }

    function tick() {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const { x: mx, y: my } = mouseRef.current
      const blobs = blobsRef.current
      const W = canvas.width, H = canvas.height

      ctx.filter = 'blur(40px)'

      for (const b of blobs) {
        // ── Autonomous drift ────────────────────────────────────────
        const homeX = b.fx * W + Math.sin(frame * DRIFT + b.phX) * W * 0.09
        const homeY = b.fy * H + Math.cos(frame * DRIFT * 0.65 + b.phY) * H * 0.09
        b.vx += (homeX - b.x) * 0.0028
        b.vy += (homeY - b.y) * 0.0028
        b.vx *= 0.91; b.vy *= 0.91
        b.x  += b.vx;  b.y  += b.vy

        // Cursor → blob centre distance
        const ccx    = mx - b.x
        const ccy    = my - b.y
        const ccdist = Math.sqrt(ccx * ccx + ccy * ccy) || 0.001

        // ── Inner pressure ──────────────────────────────────────────
        // When cursor is INSIDE the blob it exerts outward pressure on
        // every surface point, strongest at the centre (full PUSH×0.75)
        // and fading to zero at the edge.
        // This makes the centre case highly visible: the blob swells.
        const innerP = ccdist < b.r
          ? (1 - ccdist / b.r) * PUSH * 0.75
          : 0

        // ── Per-segment deformation ─────────────────────────────────
        const pts = []
        for (let i = 0; i < N_SEGS; i++) {
          const angle = (i / N_SEGS) * Math.PI * 2
          const pox = Math.cos(angle)   // outward unit normal
          const poy = Math.sin(angle)

          // Nominal surface point position
          const nx = b.x + pox * b.r
          const ny = b.y + poy * b.r

          // Vector from cursor to this surface point
          const dx = nx - mx
          const dy = ny - my
          const d  = Math.sqrt(dx * dx + dy * dy) || 1

          // Directional push:
          //   dot > 0 → cursor is "behind" this surface pt (inside, or on far side)
          //             → push outward (blob avoids cursor by bulging away)
          //   dot < 0 → cursor is "in front" (approaching from outside)
          //             → push inward (surface retracts away from cursor)
          // Both are correct avoidance: the blob never wants the cursor near it.
          let dirP = 0
          if (d < REACH) {
            const ratio = 1 - d / REACH
            const dot   = (pox * dx + poy * dy) / d  // −1…+1
            dirP = dot * ratio * ratio * PUSH
          }

          // Clamp to prevent the path from folding through the centre
          const targetOff = Math.max(-b.r * 0.75, innerP + dirP)

          // Spring-damper — viscous slime snap-back
          b.vel[i] += (targetOff - b.off[i]) * SPRING
          b.vel[i] *= DAMP
          b.off[i] += b.vel[i]

          pts.push({
            x: nx + pox * b.off[i],
            y: ny + poy * b.off[i],
          })
        }

        // ── Draw deformed blob ──────────────────────────────────────
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 1.3)
        g.addColorStop(0,    `rgba(${b.rgb},${b.op})`)
        g.addColorStop(0.35, `rgba(${b.rgb},${(b.op * 0.72).toFixed(2)})`)
        g.addColorStop(0.7,  `rgba(${b.rgb},${(b.op * 0.32).toFixed(2)})`)
        g.addColorStop(1,    `rgba(${b.rgb},0)`)

        drawSmooth(pts)
        ctx.fillStyle = g
        ctx.fill()
      }

      ctx.filter = 'none'
      animId = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}
