import { initLocale, onLocale, phrase } from '../i18n/locale'
import type { Cosmos } from './cosmos'
import { mountOrbit, type LinkEvent } from './orbit'
import { scramble } from './scramble'

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function startSolo() {
  const root = document.documentElement
  const motion = root.classList.contains('motion')
  const fine = matchMedia('(pointer: fine)').matches
  const cleanups: (() => void)[] = []
  const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)

  const cosmosCanvas = q<HTMLCanvasElement>('[data-cosmos]')!
  const orbitCanvas = q<HTMLCanvasElement>('[data-orbit]')!
  const mark = q('.solo__mark')!
  const feed = q('[data-feed]')!
  const seal = q('[data-seal]')!
  const sealSoon = q('[data-seal-soon]')!
  const agentsCount = q('[data-agents]')!
  const clock = q('[data-clock]')!

  /* Pointer ------------------------------------------------------------- */
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false }
  const onPointer = (event: PointerEvent) => {
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.active = true
  }
  const onLeave = () => (pointer.active = false)
  addEventListener('pointermove', onPointer, { passive: true })
  addEventListener('pointerdown', onPointer, { passive: true })
  document.addEventListener('pointerleave', onLeave)
  cleanups.push(() => {
    removeEventListener('pointermove', onPointer)
    removeEventListener('pointerdown', onPointer)
    document.removeEventListener('pointerleave', onLeave)
  })

  /* Cursor -------------------------------------------------------------- */
  const cursor = q('[data-cursor]')!
  const ring = q('[data-cursor-ring]')!
  const dot = q('[data-cursor-dot]')!
  const label = q('[data-cursor-label]')!
  const ringPos = { x: pointer.x, y: pointer.y }
  const customCursor = fine && motion
  if (customCursor) {
    root.classList.add('has-cursor')
    const onOver = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-cursor-text], a, button')
      cursor.classList.toggle('is-hover', Boolean(target))
      label.textContent = target?.dataset.cursorText ?? ''
    }
    document.addEventListener('pointerover', onOver)
    cleanups.push(() => document.removeEventListener('pointerover', onOver))
  }

  /* Cosmos -------------------------------------------------------------- */
  let cosmos: Cosmos | null = null
  import('./cosmos').then(({ canRunCosmos, mountCosmos }) => {
    if (!canRunCosmos()) return
    try {
      cosmos = mountCosmos(cosmosCanvas, { morph: motion ? 4 : 5 })
      root.classList.add('has-cosmos')
    } catch {
      cosmos = null
    }
  })
  const shockAt = (el: Element) => {
    const rect = el.getBoundingClientRect()
    cosmos?.shock(((rect.left + rect.width / 2) / innerWidth) * 2 - 1, -(((rect.top + rect.height / 2) / innerHeight) * 2 - 1))
  }

  /* Feed ---------------------------------------------------------------- */
  const templates: Record<LinkEvent['kind'], number> = { mixed: 0, agents: 0, nodes: 0 }
  const pushFeed = (event: LinkEvent) => {
    const list = phrase().solo.feed[event.kind]
    const template = list[templates[event.kind]++ % list.length]
    const li = document.createElement('li')
    const time = document.createElement('span')
    time.className = 'feed__time'
    time.textContent = stamp()
    const text = document.createElement('span')
    text.className = 'feed__text'
    li.append(time, text)
    feed.prepend(li)
    scramble(text, template.replace('{a}', event.a).replace('{b}', event.b), 900)
    while (feed.children.length > 5) feed.lastElementChild?.remove()
  }

  const orbit = mountOrbit(orbitCanvas, { reduce: !motion, onLink: pushFeed })

  /* Live signals -------------------------------------------------------- */
  let agents = 5
  const tickClock = () => (clock.textContent = stamp())
  tickClock()
  const clockTimer = setInterval(tickClock, 1000)
  const agentsTimer = setInterval(() => {
    agents = Math.min(9, Math.max(5, agents + (Math.random() < 0.5 ? 1 : -1)))
    scramble(agentsCount, pad(agents), 400)
  }, 4200)
  agentsCount.textContent = pad(agents)
  cleanups.push(() => {
    clearInterval(clockTimer)
    clearInterval(agentsTimer)
  })

  const onSeal = () => {
    shockAt(seal)
    seal.classList.remove('is-pulsed')
    void seal.offsetWidth
    seal.classList.add('is-pulsed')
    scramble(sealSoon, phrase().soon, 600)
  }
  seal.addEventListener('click', onSeal)
  cleanups.push(() => seal.removeEventListener('click', onSeal))

  const onPick = (event: PointerEvent) => {
    const el = event.target as HTMLElement | null
    if (el?.closest('a, button, input, textarea, select, .hud, .feed, .footer, .finale__top')) return
    const pick = orbit.hit(event.clientX, event.clientY)
    if (!pick) return
    cosmos?.shock((pick.x / innerWidth) * 2 - 1, -((pick.y / innerHeight) * 2 - 1))
  }
  addEventListener('pointerdown', onPick)
  cleanups.push(() => removeEventListener('pointerdown', onPick))

  onLocale((text) => {
    feed.replaceChildren()
    if (sealSoon.textContent) scramble(sealSoon, text.soon, 400)
  })
  initLocale()

  /* Frame --------------------------------------------------------------- */
  let start = 0
  let last = 0
  let raf = 0
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (!start) start = last = now
    const time = (now - start) / 1000
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now

    if (customCursor) {
      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`
      ringPos.x += (pointer.x - ringPos.x) * Math.min(1, dt * 12)
      ringPos.y += (pointer.y - ringPos.y) * Math.min(1, dt * 12)
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`
      cursor.classList.toggle('is-hidden', !pointer.active)
    }

    const ndc = pointer.active ? { x: (pointer.x / innerWidth) * 2 - 1, y: -((pointer.y / innerHeight) * 2 - 1) } : null
    let center: { x: number; y: number }
    if (cosmos) {
      cosmos.render({
        morph: 5,
        fade: motion ? Math.min(1, time / 2.4) : 1,
        anchor: { x: 0, y: 0 },
        pointer: ndc,
        time: motion ? time : 0,
        dt
      })
      const c = cosmos.center()
      center = { x: ((c.x + 1) / 2) * innerWidth, y: ((1 - c.y) / 2) * innerHeight }
    } else {
      const rect = mark.getBoundingClientRect()
      center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
    orbit.render(time, dt, center, pointer.active ? pointer : null)
  }
  raf = requestAnimationFrame(frame)
  cleanups.push(() => cancelAnimationFrame(raf))

  /* Resize -------------------------------------------------------------- */
  let resizeTimer = 0
  const onResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      cosmos?.resize()
      orbit.resize()
    }, 120)
  }
  addEventListener('resize', onResize)
  cleanups.push(() => removeEventListener('resize', onResize))

  requestAnimationFrame(() => root.classList.add('is-ready'))

  addEventListener(
    'pagehide',
    () => {
      for (const cleanup of cleanups) cleanup()
      cosmos?.destroy()
    },
    { once: true }
  )
}
