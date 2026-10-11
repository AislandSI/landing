import { onLocale, phrase } from '../i18n/locale'
import { drawBot as paintBot, EYES, pick, SHAPES, SKINS, type BotEyes, type BotShape } from './bot-art'

type Shape = BotShape
type EyeStyle = BotEyes

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

const STYLES = EYES
const BLINK = 0.16
const IDLE = 2.2
const FOUND_CYCLE = 5.5

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
    paintBot(ctx, {
      r,
      shape: bot.shape,
      skin: bot.skin,
      eyes: bot.eyes,
      blush: bot.blush,
      lx: bot.lx,
      ly: bot.ly,
      open: bot.open,
      joy: bot.joy,
      mouth: mode === 'found' ? 'o' : 'none'
    })

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
