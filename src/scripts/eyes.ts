import { onLocale, phrase } from '../i18n/locale'

type Shape = 'circle' | 'squircle' | 'drop' | 'capsule'
type EyeStyle = 'pill' | 'dot' | 'oval'

interface Bot {
  x: number
  y: number
  r: number
  shape: Shape
  skin: number
  eyes: EyeStyle
  blush: boolean
  phase: number
  lx: number
  ly: number
  tilt: number
  wakeAt: number
  blinkAt: number
  blinkStart: number
  open: number
  joy: number
  joyUntil: number
  squishAt: number
  speed: number
}

export interface EyesWall {
  render(time: number, dt: number): void
  resize(): void
  destroy(): void
}

const SKINS: [string, string, string][] = [
  ['#dcc4ff', '#a065ee', '#4b2fb8'],
  ['#ffd0f8', '#dc5ee5', '#7a2fc9'],
  ['#b4f8fb', '#16b5c5', '#16568c'],
  ['#b0aaff', '#5b50e2', '#231b7a'],
  ['#ffffff', '#ebe4fb', '#9d90c8']
]
const SHAPES: Shape[] = ['circle', 'squircle', 'drop', 'capsule']
const STYLES: EyeStyle[] = ['pill', 'dot', 'oval']
const BLINK = 0.16
const IDLE = 2.2
const FOUND_CYCLE = 5.5
const SPRITE = 256
const SPAN = 1.2

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

function tracePath(ctx: CanvasRenderingContext2D, shape: Shape) {
  ctx.beginPath()
  if (shape === 'circle') {
    ctx.arc(0, 0, 1, 0, Math.PI * 2)
  } else if (shape === 'squircle') {
    ctx.roundRect(-0.94, -0.9, 1.88, 1.8, 0.62)
  } else if (shape === 'capsule') {
    ctx.roundRect(-1, -0.74, 2, 1.48, 0.74)
  } else {
    const top = { x: 0, y: -1.02 }
    const right = { x: 1.04, y: 0.82 }
    const left = { x: -1.04, y: 0.82 }
    ctx.moveTo((left.x + top.x) / 2, (left.y + top.y) / 2)
    ctx.arcTo(top.x, top.y, right.x, right.y, 0.52)
    ctx.arcTo(right.x, right.y, left.x, left.y, 0.46)
    ctx.arcTo(left.x, left.y, top.x, top.y, 0.46)
    ctx.closePath()
  }
}

function makeBody(shape: Shape, [light, base, deep]: [string, string, string]) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SPRITE
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const unit = SPRITE / (SPAN * 2)
  ctx.translate(SPRITE / 2, SPRITE / 2)
  ctx.scale(unit, unit)

  tracePath(ctx, shape)
  const fill = ctx.createRadialGradient(-0.4, -0.5, 0.05, -0.1, -0.1, 1.75)
  fill.addColorStop(0, light)
  fill.addColorStop(0.45, base)
  fill.addColorStop(1, deep)
  ctx.fillStyle = fill
  ctx.fill()

  ctx.save()
  tracePath(ctx, shape)
  ctx.clip()
  const under = ctx.createRadialGradient(0.35, 1.05, 0.1, 0.35, 1.05, 1.1)
  under.addColorStop(0, 'rgba(10, 4, 30, 0.45)')
  under.addColorStop(1, 'rgba(10, 4, 30, 0)')
  ctx.fillStyle = under
  ctx.fillRect(-SPAN, -SPAN, SPAN * 2, SPAN * 2)
  ctx.filter = `blur(${unit * 0.06}px)`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.beginPath()
  ctx.ellipse(-0.4, -0.52, 0.34, 0.17, -0.55, 0, Math.PI * 2)
  ctx.fill()
  ctx.filter = 'none'
  ctx.restore()

  tracePath(ctx, shape)
  ctx.lineWidth = 0.03
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.stroke()
  return canvas
}

export function mountEyes(section: HTMLElement, reduce: boolean): EyesWall {
  const canvas = section.querySelector<HTMLCanvasElement>('[data-eyes-canvas]')!
  const ctx = canvas.getContext('2d')!
  const finder = section.querySelector<HTMLElement>('[data-eyes-find]')!
  const ring = section.querySelector<HTMLElement>('[data-eyes-ring]')!
  const briefKind = section.querySelector<HTMLElement>('[data-brief-kind]')!
  const briefCode = section.querySelector<HTMLElement>('[data-brief-code]')!
  const briefTitle = section.querySelector<HTMLElement>('[data-brief-title]')!
  const briefRows = section.querySelector<HTMLElement>('[data-brief-rows]')!
  const briefMeter = section.querySelector<HTMLElement>('[data-brief-meter]')!
  const briefState = section.querySelector<HTMLElement>('[data-brief-state]')!
  const kicker = section.querySelector<HTMLElement>('[data-eyes-kicker]')!
  const states = section.querySelectorAll<HTMLElement>('[data-eyes-state]')

  const bodies = new Map<string, HTMLCanvasElement>()
  const body = (shape: Shape, skin: number) => {
    const key = `${shape}:${skin}`
    let sprite = bodies.get(key)
    if (!sprite) {
      sprite = makeBody(shape, SKINS[skin])
      bodies.set(key, sprite)
    }
    return sprite
  }

  let bots: Bot[] = []
  let width = 0
  let height = 0
  let visible = false
  let woke = false
  let now = 0
  let pointer: { x: number; y: number } | null = null
  let lastMove = -10
  let mode: 'watch' | 'found' = 'watch'
  let foundAt = 0
  let briefIndex = -1
  const find = { x: 0, y: 0 }

  const fillBrief = () => {
    const brief = phrase().briefs[briefIndex]
    if (!brief) return
    briefKind.textContent = brief.kind
    briefCode.textContent = brief.code
    briefTitle.textContent = brief.title
    briefState.textContent = brief.state
    briefMeter.style.transform = `scaleX(${brief.meter / 100})`
    briefRows.replaceChildren(
      ...brief.rows.map(([key, value]) => {
        const li = document.createElement('li')
        const k = document.createElement('span')
        k.textContent = key
        const v = document.createElement('span')
        v.textContent = value
        li.append(k, v)
        return li
      })
    )
  }

  const pack = () => {
    const maxR = Math.max(30, Math.min(92, Math.min(width, height) * 0.1))
    const minR = Math.max(16, maxR * 0.42)
    const gap = Math.max(10, maxR * 0.28)
    const radii: number[] = []
    for (let i = 0; i < 500; i++) radii.push(minR + (maxR - minR) * Math.pow(Math.random(), 1.8))
    radii.sort((a, b) => b - a)
    const placed: Bot[] = []
    const cx = width / 2
    const cy = height / 2
    for (const r of radii) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const x = r * 1.2 + Math.random() * (width - r * 2.4)
        const y = r * 1.2 + Math.random() * (height - r * 2.4)
        const ex = (x - cx) / (width * 0.32)
        const ey = (y - cy) / (height * 0.22)
        if (ex * ex + ey * ey < 1) continue
        let ok = true
        for (const other of placed) {
          const min = other.r * 1.2 + r * 1.2 + gap
          if ((other.x - x) ** 2 + (other.y - y) ** 2 < min * min) {
            ok = false
            break
          }
        }
        if (!ok) continue
        placed.push({
          x, y, r,
          shape: pick(SHAPES),
          skin: Math.floor(Math.random() * SKINS.length),
          eyes: pick(STYLES),
          blush: Math.random() < 0.45,
          phase: Math.random() * Math.PI * 2,
          lx: 0, ly: 0, tilt: 0,
          wakeAt: woke ? 0 : Infinity,
          blinkAt: 1 + Math.random() * 6,
          blinkStart: -1,
          open: 1,
          joy: 0,
          joyUntil: 0,
          squishAt: -10,
          speed: 3 + Math.random() * 4
        })
        break
      }
      if (placed.length >= 70) break
    }
    bots = placed
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
    for (const bot of bots) {
      bot.wakeAt = reduce ? 0 : now + Math.hypot(bot.x - origin.x, bot.y - origin.y) / 1400 + Math.random() * 0.2
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
    finder.classList.toggle('is-flip', find.x > width * 0.58)
    finder.classList.toggle('is-high', find.y > height * 0.62)
    finder.classList.add('is-visible')
    finder.removeAttribute('aria-hidden')
    briefIndex = (briefIndex + 1) % phrase().briefs.length
    fillBrief()
    ring.classList.remove('is-born')
    void ring.offsetWidth
    ring.classList.add('is-born')
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
  }
  const onLeave = () => {
    client = null
    pointer = null
  }
  const onDown = (event: PointerEvent) => {
    const p = local(event)
    for (const bot of bots) {
      if (Math.hypot(bot.x - p.x, bot.y - p.y) < bot.r * 1.15) {
        bot.squishAt = now
        bot.joyUntil = now + 1.1
      }
    }
  }

  section.addEventListener('pointermove', onMove, { passive: true })
  section.addEventListener('pointerleave', onLeave)
  section.addEventListener('pointerdown', onDown)
  const stopLocale = onLocale(() => {
    if (briefIndex >= 0) fillBrief()
  })

  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      if (visible && !woke) wake()
    },
    { threshold: 0.25 }
  )
  observer.observe(section)

  const drawEye = (bot: Bot, ex: number, ey: number, side: number) => {
    const { r } = bot
    const ink = '#150d2a'
    if (bot.joy > 0.5) {
      ctx.beginPath()
      ctx.arc(ex, ey + r * 0.06, r * 0.11, Math.PI * 1.1, Math.PI * 1.9)
      ctx.lineWidth = r * 0.075
      ctx.lineCap = 'round'
      ctx.strokeStyle = ink
      ctx.stroke()
      return
    }
    const open = Math.max(0.08, bot.open)
    ctx.fillStyle = ink
    ctx.beginPath()
    if (bot.eyes === 'pill') {
      const w = r * 0.15
      const h = r * 0.36 * open
      ctx.save()
      ctx.translate(ex, ey)
      ctx.rotate(0.32 + side * 0.04)
      ctx.roundRect(-w / 2, -h / 2, w, h, w / 2)
      ctx.restore()
      ctx.fill()
      return
    }
    const rx = bot.eyes === 'dot' ? r * 0.12 : r * 0.13
    const ry = (bot.eyes === 'dot' ? r * 0.12 : r * 0.2) * open
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    if (open > 0.5) {
      ctx.beginPath()
      ctx.arc(ex - rx * 0.32, ey - ry * 0.38, rx * 0.34, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fill()
    }
  }

  const drawBot = (bot: Bot, time: number) => {
    const age = time - bot.wakeAt
    if (age < 0) return
    const pop = age >= 0.55 ? 1 : 1 - Math.pow(1 - age / 0.55, 3) * Math.cos((age / 0.55) * Math.PI * 1.6)
    const squishT = time - bot.squishAt
    const squish = squishT < 0.6 ? Math.sin(squishT * 18) * Math.exp(-squishT * 6) * 0.22 : 0
    const bob = reduce ? 0 : Math.sin(time * 1.4 + bot.phase) * bot.r * 0.06
    const { r } = bot

    ctx.save()
    ctx.translate(bot.x + bot.lx * r * 0.06, bot.y + bob)

    ctx.beginPath()
    ctx.ellipse(0, r * 1.18 - bob, r * 0.72 * pop, r * 0.14 * pop, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fill()

    ctx.rotate(bot.tilt)
    ctx.scale(pop * (1 + squish), pop * (1 - squish))
    const size = r * SPAN * 2
    ctx.drawImage(body(bot.shape, bot.skin), -size / 2, -size / 2, size, size)

    const fx = bot.lx * r * 0.3
    const fy = bot.ly * r * 0.22 + (bot.shape === 'drop' ? r * 0.18 : 0)
    const spread = bot.shape === 'drop' ? r * 0.26 : r * 0.31

    if (bot.blush) {
      ctx.fillStyle = bot.skin === 1 ? 'rgba(255, 140, 200, 0.55)' : 'rgba(255, 120, 190, 0.38)'
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(fx + side * spread * 1.45, fy + r * 0.24, r * 0.13, r * 0.07, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    drawEye(bot, fx - spread, fy - r * 0.06, -1)
    drawEye(bot, fx + spread, fy - r * 0.06, 1)

    if (mode === 'found' && bot.joy < 0.5) {
      ctx.beginPath()
      ctx.ellipse(fx, fy + r * 0.3, r * 0.07, r * 0.09, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#150d2a'
      ctx.fill()
    } else if (bot.joy > 0.5) {
      ctx.beginPath()
      ctx.arc(fx, fy + r * 0.2, r * 0.12, Math.PI * 0.15, Math.PI * 0.85)
      ctx.lineWidth = r * 0.06
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#150d2a'
      ctx.stroke()
    }

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

      for (const bot of bots) {
        const idle = time - lastMove > 0.7
        let target: { x: number; y: number } | null = pointer
        if (mode === 'found' && (idle || !pointer)) {
          const delay = Math.hypot(bot.x - find.x, bot.y - find.y) / 1500
          if (time - foundAt > delay) target = find
        }

        let tx = 0
        let ty = 0
        let near = 0
        if (target) {
          const dx = target.x - bot.x
          const dy = target.y - bot.y
          const len = Math.hypot(dx, dy) || 1
          const mag = Math.min(1, len / (bot.r * 3 + 60))
          tx = (dx / len) * mag
          ty = (dy / len) * mag
          near = target === pointer ? Math.max(0, 1 - len / (bot.r * 2.6)) : 0
        }
        const follow = Math.min(1, dt * bot.speed)
        bot.lx += (tx - bot.lx) * follow
        bot.ly += (ty - bot.ly) * follow
        bot.tilt += (bot.lx * 0.14 - bot.tilt) * follow

        const joyTarget = near > 0.35 || time < bot.joyUntil ? 1 : 0
        bot.joy += (joyTarget - bot.joy) * Math.min(1, dt * 10)

        let open = 1
        if (!reduce && time > bot.blinkAt) {
          bot.blinkStart = time
          bot.blinkAt = time + 2.5 + Math.random() * 6
        }
        if (bot.blinkStart >= 0) {
          const t = (time - bot.blinkStart) / BLINK
          if (t >= 1) bot.blinkStart = -1
          else open = 1 - Math.sin(t * Math.PI)
        }
        bot.open = open

        drawBot(bot, time)
      }
    },
    resize,
    destroy() {
      observer.disconnect()
      section.removeEventListener('pointermove', onMove)
      section.removeEventListener('pointerleave', onLeave)
      section.removeEventListener('pointerdown', onDown)
      stopLocale()
    }
  }
}
