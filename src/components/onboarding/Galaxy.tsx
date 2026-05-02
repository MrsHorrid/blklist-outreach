'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number       // depth — parallax factor
  vx: number
  vy: number
  size: number
  baseAlpha: number
  alpha: number
  twinkle: number
  hue: number     // 0–360
}

interface Nebula {
  x: number
  y: number
  r: number
  hue: number
  alpha: number
  vx: number
  vy: number
}

export function Galaxy() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = window.innerWidth
    let h = window.innerHeight

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / w - 0.5) * 2
      mouseRef.current.y = (e.clientY / h - 0.5) * 2
    }
    window.addEventListener('mousemove', handleMouse)

    // Generate stars
    const STAR_COUNT = Math.min(220, Math.floor((w * h) / 8000))
    const stars: Star[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      const z = Math.random() * 0.9 + 0.1 // depth
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z,
        vx: (Math.random() - 0.5) * 0.04 * z,
        vy: (Math.random() - 0.5) * 0.04 * z,
        size: Math.random() * 1.6 * z + 0.3,
        baseAlpha: Math.random() * 0.7 + 0.2,
        alpha: 0,
        twinkle: Math.random() * Math.PI * 2,
        hue: 220 + Math.random() * 80, // blue-violet range
      })
    }

    // Generate nebula blobs
    const nebulae: Nebula[] = [
      { x: w * 0.25, y: h * 0.35, r: 360, hue: 250, alpha: 0.18, vx: 0.04, vy: 0.02 },
      { x: w * 0.75, y: h * 0.65, r: 320, hue: 290, alpha: 0.14, vx: -0.03, vy: -0.025 },
      { x: w * 0.55, y: h * 0.2, r: 280, hue: 220, alpha: 0.1, vx: 0.02, vy: 0.04 },
    ]

    let raf = 0
    let t0 = performance.now()

    const draw = (now: number) => {
      const dt = Math.min(now - t0, 32)
      t0 = now

      // background
      ctx.fillStyle = '#06070b'
      ctx.fillRect(0, 0, w, h)

      // nebulae (soft glowing blobs)
      for (const n of nebulae) {
        n.x += n.vx * dt * 0.05
        n.y += n.vy * dt * 0.05
        if (n.x < -n.r) n.x = w + n.r
        if (n.x > w + n.r) n.x = -n.r
        if (n.y < -n.r) n.y = h + n.r
        if (n.y > h + n.r) n.y = -n.r

        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r)
        grad.addColorStop(0, `hsla(${n.hue}, 80%, 60%, ${n.alpha})`)
        grad.addColorStop(0.5, `hsla(${n.hue}, 80%, 50%, ${n.alpha * 0.4})`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // mouse parallax offset
      const mx = mouseRef.current.x * 18
      const my = mouseRef.current.y * 18

      // stars
      for (const s of stars) {
        s.x += s.vx * dt * 0.06
        s.y += s.vy * dt * 0.06
        s.twinkle += dt * 0.001

        // wrap
        if (s.x < -10) s.x = w + 10
        if (s.x > w + 10) s.x = -10
        if (s.y < -10) s.y = h + 10
        if (s.y > h + 10) s.y = -10

        // twinkle alpha
        s.alpha = s.baseAlpha * (0.55 + 0.45 * Math.sin(s.twinkle))

        const px = s.x + mx * s.z
        const py = s.y + my * s.z

        // glow
        ctx.fillStyle = `hsla(${s.hue}, 90%, 80%, ${s.alpha * 0.35})`
        ctx.beginPath()
        ctx.arc(px, py, s.size * 3, 0, Math.PI * 2)
        ctx.fill()

        // core
        ctx.fillStyle = `hsla(${s.hue}, 80%, 92%, ${s.alpha})`
        ctx.beginPath()
        ctx.arc(px, py, s.size, 0, Math.PI * 2)
        ctx.fill()
      }

      // connect close stars with lines (spider web feel)
      ctx.lineWidth = 0.5
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i]
        const ax = a.x + mx * a.z
        const ay = a.y + my * a.z
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j]
          const bx = b.x + mx * b.z
          const by = b.y + my * b.z
          const dx = ax - bx
          const dy = ay - by
          const d2 = dx * dx + dy * dy
          if (d2 < 14000) {
            const op = (1 - d2 / 14000) * 0.08 * Math.min(a.alpha, b.alpha)
            ctx.strokeStyle = `rgba(180, 170, 255, ${op})`
            ctx.beginPath()
            ctx.moveTo(ax, ay)
            ctx.lineTo(bx, by)
            ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: '#06070b' }}
    />
  )
}
