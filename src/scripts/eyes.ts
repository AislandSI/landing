import { phrase } from '../i18n/locale'

interface Eye {
  x: number
  y: number
  r: number
  lx: number
  ly: number
  sx: number
  sy: number
  nextSaccade: number
  wakeAt: number
  blinkAt: number
  blinkStart: number
  open: number
  dilation: number
  sprite: number
  speed: number
}

export interface EyesWall {
  render(time: number, dt: number): void
  resize(): void
  destroy(): void
}

const IRIS_PALETTES: [string, string, string][] = [
  ['#ffd2fb', '#dc5ee5', '#3a0f52'],
  ['#c8fbff', '#12b8c8', '#0c2650'],
  ['#e6d6ff', '#a065ee', '#1e1460'],
  ['#ffe0f4', '#8a5cf0', '#09363f']
]
const BLINK = 0.17
const IDLE = 2.2
const FOUND_CYCLE = 5.5

function sprite(size: number, paint: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) paint(ctx, size)
  return canvas
}

function makeSclera() {
  return sprite(160, (ctx, s) => {
    const c = s / 2
    const g = ctx.createRadialGradient(c, c * 1.1, s * 0.05, c, c, c)
    g.addColorStop(0, '#fbf9ff')
    g.addColorStop(0.62, '#e9e4f4')
    g.addColorStop(1, '#8e86a6')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    const lid = ctx.createLinearGradient(0, 0, 0, s * 0.45)
    lid.addColorStop(0, 'rgba(20,10,40,0.55)')
    lid.addColorStop(1, 'rgba(20,10,40,0)')
    ctx.fillStyle = lid
    ctx.fillRect(0, 0, s, s)
  })
}

function makeIris([inner, mid, outer]: [string, string, string], seed: number) {
  return sprite(160, (ctx, s) => {
    const c = s / 2
    const g = ctx.createRadialGradient(c, c, s * 0.08, c, c, c)
    g.addColorStop(0, inner)
    g.addColorStop(0.45, mid)
    g.addColorStop(0.86, outer)
    g.addColorStop(1, '#05030a')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(c, c, c, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'overlay'
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2 + Math.sin(i * 12.9898 + seed) * 0.05
      const len = 0.55 + ((Math.sin(i * 78.233 + seed) + 1) / 2) * 0.35
      ctx.strokeStyle = i % 3 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.35)'
      ctx.lineWidth = s * 0.008
      ctx.beginPath()
      ctx.moveTo(c + Math.cos(a) * c * 0.2, c + Math.sin(a) * c * 0.2)
      ctx.lineTo(c + Math.cos(a) * c * len, c + Math.sin(a) * c * len)
      ctx.stroke()
    }
  })
}

export function mountEyes(section: HTMLElement, reduce: boolean): EyesWall {
  const canvas = section.querySelector<HTMLCanvasElement>('[data-eyes-canvas]')!
  const ctx = canvas.getContext('2d')!
  const finder = section.querySelector<HTMLElement>('[data-eyes-find]')!
  const kicker = section.querySelector<HTMLElement>('[data-eyes-kicker]')!
  const states = section.querySelectorAll<HTMLElement>('[data-eyes-state]')

  const sclera = makeSclera()
  const irises = IRIS_PALETTES.map((palette, index) => makeIris(palette, index * 3.7))

  let eyes: Eye[] = []
  let width = 0
  let height = 0
  let visible = false
  let woke = false
  let now = 0
  let pointer: { x: number; y: number } | null = null
  let lastMove = -10
  let mode: 'watch' | 'found' = 'watch'
  let foundAt = 0
  const find = { x: 0, y: 0 }

  const pack = () => {
    const maxR = Math.max(26, Math.min(80, Math.min(width, height) * 0.085))
    const minR = Math.max(9, maxR * 0.26)
    const gap = Math.max(4, maxR * 0.1)
    const radii: number[] = []
    for (let i = 0; i < 900; i++) radii.push(minR + (maxR - minR) * Math.pow(Math.random(), 2.4))
    radii.sort((a, b) => b - a)
    const placed: Eye[] = []
    const cx = width / 2
    const cy = height / 2
    for (const r of radii) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const x = r + Math.random() * (width - r * 2)
        const y = r + Math.random() * (height - r * 2)
        const ex = (x - cx) / (width * 0.3)
        const ey = (y - cy) / (height * 0.2)
        if (ex * ex + ey * ey < 1) continue
        let ok = true
        for (const other of placed) {
          const dx = other.x - x
          const dy = other.y - y
          const min = other.r * 1.12 + r * 1.12 + gap
          if (dx * dx + dy * dy < min * min) {
            ok = false
            break
          }
        }
        if (!ok) continue
        placed.push({
          x, y, r,
          lx: 0, ly: 0, sx: 0, sy: 0,
          nextSaccade: Math.random() * 2,
          wakeAt: woke ? 0 : Infinity,
          blinkAt: 1 + Math.random() * 6,
          blinkStart: -1,
          open: woke || reduce ? 1 : 0,
          dilation: 0.3,
          sprite: Math.floor(Math.random() * irises.length),
          speed: 4 + Math.random() * 5
        })
        break
      }
      if (placed.length > 190) break
    }
    eyes = placed
  }

  const resize = () => {
    const rect = section.getBoundingClientRect()
    width = rect.width
    height = rect.height
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    pack()
  }

  const wake = () => {
    woke = true
    lastMove = now
    const origin = pointer ?? { x: width / 2, y: height / 2 }
    for (const eye of eyes) {
      eye.wakeAt = reduce ? 0 : now + Math.hypot(eye.x - origin.x, eye.y - origin.y) / 1300 + Math.random() * 0.25
    }
  }

  const setMode = (next: 'watch' | 'found') => {
    if (mode === next) return
    mode = next
    for (const state of states) state.classList.toggle('is-active', state.dataset.eyesState === next)
    kicker.textContent = next === 'found' ? phrase().eyesFound : phrase().eyesIdle
    finder.classList.toggle('is-visible', next === 'found')
    section.classList.toggle('is-found', next === 'found')
  }

  const propose = () => {
    for (let i = 0; i < 40; i++) {
      const x = 80 + Math.random() * (width - 160)
      const y = 90 + Math.random() * (height - 180)
      const inText = Math.abs(x - width / 2) < width * 0.28 && Math.abs(y - height / 2) < height * 0.2
      if (!inText) {
        find.x = x
        find.y = y
        break
      }
    }
    finder.style.transform = `translate3d(${find.x}px, ${find.y}px, 0)`
    finder.classList.remove('is-visible')
    void finder.offsetWidth
    finder.classList.add('is-visible')
    foundAt = now
  }

  let client: { x: number; y: number } | null = null

  const local = (event: PointerEvent) => {
    const rect = section.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const onMove = (event: PointerEvent) => {
    client = { x: event.clientX, y: event.clientY }
    pointer = local(event)
    lastMove = now
    if (mode === 'found') setMode('watch')
  }
  const onLeave = () => {
    client = null
    pointer = null
  }
  const onDown = (event: PointerEvent) => {
    const p = local(event)
    for (const eye of eyes) {
      if (Math.hypot(eye.x - p.x, eye.y - p.y) < eye.r * 1.1) {
        eye.blinkStart = now
        eye.dilation = 1
      }
    }
  }

  section.addEventListener('pointermove', onMove, { passive: true })
  section.addEventListener('pointerleave', onLeave)
  section.addEventListener('pointerdown', onDown)

  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      if (visible && !woke) wake()
    },
    { threshold: 0.25 }
  )
  observer.observe(section)

  const drawEye = (eye: Eye) => {
    const { x, y, r } = eye
    ctx.beginPath()
    ctx.arc(x, y, r * 1.12, 0, Math.PI * 2)
    ctx.fillStyle = '#08070f'
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(160, 101, 238, 0.18)'
    ctx.stroke()

    if (eye.open < 0.03) {
      ctx.beginPath()
      ctx.moveTo(x - r * 0.8, y)
      ctx.quadraticCurveTo(x, y + r * 0.18, x + r * 0.8, y)
      ctx.strokeStyle = 'rgba(220, 210, 255, 0.35)'
      ctx.lineWidth = Math.max(1, r * 0.06)
      ctx.stroke()
      return
    }

    ctx.save()
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * eye.open, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(sclera, x - r, y - r, r * 2, r * 2)
    const ix = x + (eye.lx + eye.sx) * r * 0.42
    const iy = y + (eye.ly + eye.sy) * r * 0.42
    const ri = r * 0.56
    ctx.drawImage(irises[eye.sprite], ix - ri, iy - ri, ri * 2, ri * 2)
    ctx.beginPath()
    ctx.arc(ix, iy, ri * (0.34 + eye.dilation * 0.26), 0, Math.PI * 2)
    ctx.fillStyle = '#040208'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ix - ri * 0.34, iy - ri * 0.36, ri * 0.15, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ix + ri * 0.28, iy + ri * 0.3, ri * 0.06, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fill()
    ctx.lineWidth = r * 0.16
    ctx.strokeStyle = 'rgba(6, 4, 14, 0.55)'
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * eye.open, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  resize()

  return {
    render(time, dt) {
      now = time
      if (!visible) return
      if (client) {
        const rect = section.getBoundingClientRect()
        pointer = { x: client.x - rect.left, y: client.y - rect.top }
      }

      const idleFor = time - lastMove
      if (woke && mode === 'watch' && idleFor > IDLE) {
        setMode('found')
        propose()
      } else if (mode === 'found' && time - foundAt > FOUND_CYCLE) {
        propose()
      }

      ctx.clearRect(0, 0, width, height)
      const k = Math.min(1, dt * 60)

      for (const eye of eyes) {
        let target: { x: number; y: number } | null = pointer
        if (mode === 'found') {
          const delay = Math.hypot(eye.x - find.x, eye.y - find.y) / 1500
          if (time - foundAt > delay) target = find
        }

        let tx = 0
        let ty = 0
        let near = 0
        if (target) {
          const dx = target.x - eye.x
          const dy = target.y - eye.y
          const len = Math.hypot(dx, dy) || 1
          const mag = Math.min(1, len / (eye.r * 3 + 50))
          tx = (dx / len) * mag
          ty = (dy / len) * mag
          near = target === pointer ? Math.max(0, 1 - len / (eye.r * 2.2)) : 0
        }
        const follow = Math.min(1, dt * eye.speed)
        eye.lx += (tx - eye.lx) * follow
        eye.ly += (ty - eye.ly) * follow

        if (!reduce && time > eye.nextSaccade) {
          eye.sx = (Math.random() - 0.5) * 0.14
          eye.sy = (Math.random() - 0.5) * 0.1
          eye.nextSaccade = time + 0.4 + Math.random() * 2.2
        }

        const dilationTarget = mode === 'found' ? 0.85 : 0.25 + near * 0.6
        eye.dilation += (dilationTarget - eye.dilation) * Math.min(1, dt * 3)

        let open = 1
        if (time < eye.wakeAt) open = 0
        else if (time < eye.wakeAt + 0.45) open = Math.sin(((time - eye.wakeAt) / 0.45) * Math.PI * 0.5)
        if (!reduce && time > eye.blinkAt) {
          eye.blinkStart = time
          eye.blinkAt = time + 2 + Math.random() * 7
        }
        if (eye.blinkStart >= 0) {
          const t = (time - eye.blinkStart) / BLINK
          if (t >= 1) eye.blinkStart = -1
          else open *= 1 - Math.sin(t * Math.PI)
        }
        if (near > 0.55) open *= 0.35
        eye.open += (open - eye.open) * Math.min(1, k * 0.6)

        drawEye(eye)
      }
    },
    resize,
    destroy() {
      observer.disconnect()
      section.removeEventListener('pointermove', onMove)
      section.removeEventListener('pointerleave', onLeave)
      section.removeEventListener('pointerdown', onDown)
    }
  }
}
