import gsap from 'gsap'
import Lenis from 'lenis'
import { initLocale, onLocale, phrase } from '../i18n/locale'
import type { Cosmos } from './cosmos'
import { mountEyes, type EyesWall } from './eyes'

type Point = { x: number; y: number }

const GLYPHS = '▚▞▖▗▘▝░▒▓01/<>'

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const pad = (n: number) => String(n).padStart(2, '0')

const scrambleTokens = new WeakMap<HTMLElement, number>()

function scramble(el: HTMLElement, text: string, duration = 700) {
  const token = (scrambleTokens.get(el) ?? 0) + 1
  scrambleTokens.set(el, token)
  const start = performance.now()
  const step = (now: number) => {
    if (scrambleTokens.get(el) !== token) return
    const progress = clamp((now - start) / duration)
    const revealed = Math.floor(progress * text.length)
    let out = text.slice(0, revealed)
    for (let i = revealed; i < text.length; i++) {
      out += text[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    }
    el.textContent = out
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export function start() {
  const root = document.documentElement
  const motion = root.classList.contains('motion')
  const fine = matchMedia('(pointer: fine)').matches
  const cleanups: (() => void)[] = []
  const q = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => el.querySelector<T>(s)
  const qa = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => [...el.querySelectorAll<T>(s)]

  const hero = q('[data-hero]')!
  const tileWrap = q('[data-tile-wrap]')!
  const tile = q('[data-tile]')!
  const orbitsSvg = q<SVGSVGElement>('[data-orbits]')!
  const stage = q('[data-stage]')!
  const letters = qa('.hero__letter')
  const manifesto = q('[data-manifesto]')!
  const chapters = qa('[data-chapter]')
  const indexItems = qa('[data-chapter-index]')
  const manifestoBar = q('[data-manifesto-bar]')!
  const shapeName = q('[data-shape-name]')!
  const coords = q('[data-coords]')!
  const eyesSection = q('[data-eyes]')!
  const finale = q('[data-finale]')!
  const marqueeRows = qa('[data-marquee-row]')
  const agentsCount = q('[data-agents]')!
  const clock = q('[data-clock]')!
  const rotator = q('[data-rotator]')!
  const feed = q('[data-feed]')!
  const seal = q('[data-seal]')!
  const sealSoon = q('[data-seal-soon]')!
  const cosmosCanvas = q<HTMLCanvasElement>('[data-cosmos]')!

  /* Pointer ------------------------------------------------------------- */
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false, last: -10 }
  let time = 0
  const onPointer = (event: PointerEvent) => {
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.active = true
    pointer.last = time
  }
  const onLeaveWindow = () => {
    pointer.active = false
  }
  addEventListener('pointermove', onPointer, { passive: true })
  addEventListener('pointerdown', onPointer, { passive: true })
  document.addEventListener('pointerleave', onLeaveWindow)
  cleanups.push(() => {
    removeEventListener('pointermove', onPointer)
    removeEventListener('pointerdown', onPointer)
    document.removeEventListener('pointerleave', onLeaveWindow)
  })
  const ndc = (): Point | null =>
    pointer.active ? { x: (pointer.x / innerWidth) * 2 - 1, y: -((pointer.y / innerHeight) * 2 - 1) } : null

  /* Smooth scroll ------------------------------------------------------- */
  let lenis: Lenis | null = null
  if (motion) {
    history.scrollRestoration = 'manual'
    scrollTo(0, 0)
    lenis = new Lenis({ autoRaf: false, lerp: 0.09, wheelMultiplier: 0.9 })
    lenis.stop()
    for (const link of qa<HTMLAnchorElement>('a[href^="#"]')) {
      const onClick = (event: MouseEvent) => {
        const target = q(link.getAttribute('href')!)
        if (!target) return
        event.preventDefault()
        lenis?.scrollTo(target, { duration: 1.6 })
      }
      link.addEventListener('click', onClick)
      cleanups.push(() => link.removeEventListener('click', onClick))
    }
  }

  /* Layout metrics ------------------------------------------------------ */
  const metrics = { vh: innerHeight, mTop: 0, mH: 1, eTop: 0, fTop: 0 }
  const top = (el: HTMLElement) => el.getBoundingClientRect().top + scrollY
  const measure = () => {
    metrics.vh = innerHeight
    metrics.mTop = top(manifesto)
    metrics.mH = manifesto.offsetHeight
    metrics.eTop = top(eyesSection)
    metrics.fTop = top(finale)
  }
  measure()

  /* Cosmos -------------------------------------------------------------- */
  let cosmos: Cosmos | null = null
  let introFade = motion ? 0 : 1
  import('./cosmos').then(({ canRunCosmos, mountCosmos }) => {
    if (!canRunCosmos()) return
    try {
      cosmos = mountCosmos(cosmosCanvas)
      root.classList.add('has-cosmos')
    } catch {
      cosmos = null
    }
  })

  /* Eyes ---------------------------------------------------------------- */
  const eyes: EyesWall = mountEyes(eyesSection, !motion)
  cleanups.push(() => eyes.destroy())

  /* Cursor -------------------------------------------------------------- */
  const cursor = q('[data-cursor]')!
  const ring = q('[data-cursor-ring]')!
  const dot = q('[data-cursor-dot]')!
  const label = q('[data-cursor-label]')!
  const ringPos = { x: pointer.x, y: pointer.y }
  if (fine && motion) {
    root.classList.add('has-cursor')
    const onOver = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-cursor-text], a, button')
      cursor.classList.toggle('is-hover', Boolean(target))
      label.textContent = target?.dataset.cursorText ?? ''
    }
    document.addEventListener('pointerover', onOver)
    cleanups.push(() => document.removeEventListener('pointerover', onOver))
  }

  /* Bots ---------------------------------------------------------------- */
  const ORBITS = [
    { rx: 220, ry: 58 },
    { rx: 300, ry: 96 },
    { rx: 420, ry: 150 }
  ]
  const bots = qa<HTMLButtonElement>('[data-bot]').map((el, index) => {
    const bot = {
      el,
      body: q('.bot__body', el)!,
      orbit: ORBITS[[1, 0, 2, 1, 2, 0][index] ?? 1],
      angle: (index / 6) * Math.PI * 2 + index * 0.7,
      speed: (0.16 + (index % 3) * 0.05) * (index % 2 ? -1 : 1),
      hover: false,
      blinkAt: 1 + Math.random() * 4,
      lx: 0,
      ly: 0
    }
    const enter = () => (bot.hover = true)
    const leave = () => (bot.hover = false)
    const poke = () => {
      gsap.fromTo(bot.body, { y: 0, scaleY: 0.7, scaleX: 1.2 }, { y: -26, scaleY: 1, scaleX: 1, duration: 0.35, ease: 'power2.out', yoyo: true, repeat: 1 })
      el.classList.remove('is-saying')
      void el.offsetWidth
      el.classList.add('is-saying')
      const rect = el.getBoundingClientRect()
      cosmos?.shock(((rect.left + rect.width / 2) / innerWidth) * 2 - 1, -(((rect.top + rect.height / 2) / innerHeight) * 2 - 1))
      agents = Math.min(99, agents + 1)
      scramble(agentsCount, pad(agents), 400)
    }
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('click', poke)
    cleanups.push(() => {
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('click', poke)
    })
    return bot
  })

  /* Small live signals -------------------------------------------------- */
  let agents = 7
  const tickClock = () => {
    const d = new Date()
    clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  tickClock()
  const clockTimer = setInterval(tickClock, 1000)
  const agentsTimer = setInterval(() => {
    agents = clamp(agents + (Math.random() < 0.55 ? 1 : -1), 5, 14)
    scramble(agentsCount, pad(agents), 400)
  }, 3800)
  let word = 0
  const wordTimer = setInterval(() => {
    const words = phrase().words
    word = (word + 1) % words.length
    scramble(rotator, words[word], 650)
  }, 2600)
  cleanups.push(() => {
    clearInterval(clockTimer)
    clearInterval(agentsTimer)
    clearInterval(wordTimer)
  })

  let feedIndex = 0
  let feedTimer = 0
  const pushFeed = () => {
    const d = new Date()
    const li = document.createElement('li')
    const stamp = document.createElement('span')
    stamp.className = 'feed__time'
    stamp.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    const text = document.createElement('span')
    text.className = 'feed__text'
    li.append(stamp, text)
    feed.prepend(li)
    scramble(text, phrase().feed[feedIndex % phrase().feed.length], 900)
    feedIndex++
    while (feed.children.length > 6) feed.lastElementChild?.remove()
  }
  const scheduleFeed = () => {
    pushFeed()
    feedTimer = window.setTimeout(scheduleFeed, 1800 + Math.random() * 1800)
  }
  const feedObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !feedTimer) {
      pushFeed()
      pushFeed()
      scheduleFeed()
    } else if (!entry.isIntersecting && feedTimer) {
      clearTimeout(feedTimer)
      feedTimer = 0
    }
  })
  feedObserver.observe(finale)
  cleanups.push(() => {
    feedObserver.disconnect()
    clearTimeout(feedTimer)
  })

  const onSeal = () => {
    const rect = seal.getBoundingClientRect()
    cosmos?.shock(((rect.left + rect.width / 2) / innerWidth) * 2 - 1, -(((rect.top + rect.height / 2) / innerHeight) * 2 - 1))
    seal.classList.remove('is-pulsed')
    void seal.offsetWidth
    seal.classList.add('is-pulsed')
    scramble(sealSoon, phrase().soon, 600)
  }
  seal.addEventListener('click', onSeal)
  cleanups.push(() => seal.removeEventListener('click', onSeal))

  /* Marquee ------------------------------------------------------------- */
  const marquee = marqueeRows.map((row) => ({
    track: q('.marquee__track', row)!,
    set: q('.marquee__set', row)!,
    dir: Number(row.dataset.marqueeRow),
    x: 0
  }))

  /* Frame --------------------------------------------------------------- */
  let lastScroll = scrollY
  let tiltX = 0
  let tiltY = 0
  let activeChapter = -1
  let shapeIndex = -1

  onLocale((text) => {
    word = 0
    scramble(rotator, text.words[0], 500)
    feed.replaceChildren()
    feedIndex = 0
    if (sealSoon.textContent) scramble(sealSoon, text.soon, 400)
    if (shapeIndex >= 0) scramble(shapeName, text.shapes[shapeIndex] ?? '', 500)
  })
  initLocale()

  const frame = (seconds: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 0.05)
    time = seconds
    lenis?.raf(seconds * 1000)

    const vh = metrics.vh
    const y = scrollY
    const velocity = lenis ? lenis.velocity : y - lastScroll
    lastScroll = y

    if (fine && motion) {
      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`
      ringPos.x += (pointer.x - ringPos.x) * Math.min(1, dt * 12)
      ringPos.y += (pointer.y - ringPos.y) * Math.min(1, dt * 12)
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`
      cursor.classList.toggle('is-hidden', !pointer.active)
    }

    /* Hero */
    const h = clamp(y / vh)
    hero.style.setProperty('--h', h.toFixed(4))
    let anchor: Point = { x: 0, y: 0.1 }
    if (h < 1) {
      const rect = tile.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      anchor = { x: (cx / innerWidth) * 2 - 1, y: -((cy / innerHeight) * 2 - 1) }
      const idle = !pointer.active || time - pointer.last > 3
      const tx = idle ? Math.sin(time * 0.5) * 0.25 : clamp((pointer.x - cx) / (innerWidth / 2), -1, 1)
      const ty = idle ? Math.cos(time * 0.4) * 0.2 : clamp((pointer.y - cy) / (innerHeight / 2), -1, 1)
      tiltX += (ty - tiltX) * Math.min(1, dt * 5)
      tiltY += (tx - tiltY) * Math.min(1, dt * 5)
      tile.style.setProperty('--rx', `${(-tiltX * 16).toFixed(2)}deg`)
      tile.style.setProperty('--ry', `${(tiltY * 20).toFixed(2)}deg`)
      tile.style.setProperty('--gx', `${(50 + tiltY * 45).toFixed(1)}%`)
      tile.style.setProperty('--gy', `${(50 + tiltX * 45).toFixed(1)}%`)

      const svgRect = orbitsSvg.getBoundingClientRect()
      const stageRect = stage.getBoundingClientRect()
      const scale = svgRect.width / 1000
      const ocx = svgRect.left + svgRect.width / 2
      const ocy = svgRect.top + svgRect.height / 2
      for (const bot of bots) {
        if (motion) bot.angle += bot.speed * dt * (bot.hover ? 0.12 : 1)
        const sin = Math.sin(bot.angle)
        const bx = ocx + Math.cos(bot.angle) * bot.orbit.rx * scale
        const by = ocy + sin * bot.orbit.ry * scale
        const depth = (sin + 1) / 2
        const s = 0.72 + depth * 0.42
        bot.el.style.transform = `translate3d(${(bx - stageRect.left).toFixed(1)}px, ${(by - stageRect.top).toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)})`
        bot.el.style.zIndex = sin > 0 ? '6' : '1'
        bot.el.style.setProperty('--depth', depth.toFixed(3))

        const target = idle ? { x: cx, y: cy } : pointer
        const dx = target.x - bx
        const dy = target.y - by
        const len = Math.hypot(dx, dy) || 1
        const mag = Math.min(1, len / 120)
        bot.lx += ((dx / len) * mag - bot.lx) * Math.min(1, dt * 10)
        bot.ly += ((dy / len) * mag - bot.ly) * Math.min(1, dt * 10)
        bot.el.style.setProperty('--lx', bot.lx.toFixed(3))
        bot.el.style.setProperty('--ly', bot.ly.toFixed(3))
        if (motion && time > bot.blinkAt) {
          bot.blinkAt = time + 2 + Math.random() * 5
          bot.el.classList.add('is-blink')
          setTimeout(() => bot.el.classList.remove('is-blink'), 150)
        }
      }

      for (const letter of letters) {
        const r = letter.getBoundingClientRect()
        const d = Math.hypot(pointer.x - (r.left + r.width / 2), pointer.y - (r.top + r.height / 2))
        const p = pointer.active ? clamp(1 - d / Math.max(220, r.width * 1.6)) : 0
        const current = Number(letter.style.getPropertyValue('--p') || 0)
        letter.style.setProperty('--p', (current + (p - current) * Math.min(1, dt * 8)).toFixed(3))
      }
    }

    /* Marquee */
    for (const row of marquee) {
      const width = row.set.offsetWidth || 1
      if (motion) row.x -= (60 + Math.abs(velocity) * 14) * dt * row.dir
      if (row.x <= -width) row.x += width
      if (row.x > 0) row.x -= width
      const skew = motion ? clamp(velocity * 0.5, -12, 12) : 0
      row.track.style.transform = `translate3d(${row.x.toFixed(1)}px, 0, 0) skewX(${(-skew).toFixed(2)}deg)`
    }

    /* Manifesto */
    const n = chapters.length
    const raw = (y - metrics.mTop) / vh
    const progress = clamp((y - metrics.mTop) / (metrics.mH - vh))
    manifestoBar.style.setProperty('--progress', progress.toFixed(4))
    let best = 0
    let bestValue = -1
    chapters.forEach((chapter, i) => {
      const enter = i === 0 ? clamp((raw + 0.6) / 0.5) : clamp((raw - i + 0.08) / 0.32)
      const exit = i === n - 1 ? 0 : clamp((raw - i - 0.62) / 0.28)
      chapter.style.setProperty('--in', enter.toFixed(4))
      chapter.style.setProperty('--out', exit.toFixed(4))
      chapter.classList.toggle('is-live', enter > 0 && exit < 1)
      if (enter - exit > bestValue) {
        bestValue = enter - exit
        best = i
      }
    })
    if (best !== activeChapter) {
      activeChapter = best
      indexItems.forEach((item, i) => item.classList.toggle('is-active', i === best))
    }

    let morph = clamp((y - (metrics.mTop - vh)) / vh)
    for (let k = 0; k < n - 1; k++) morph += smooth(k + 0.6, k + 1.1, raw)
    morph += clamp((y - (metrics.fTop - vh)) / (vh * 0.8))
    const shape = Math.round(morph)
    if (shape !== shapeIndex) {
      shapeIndex = shape
      scramble(shapeName, phrase().shapes[shape] ?? '', 500)
    }
    const np = ndc()
    if (np) coords.textContent = `${np.x.toFixed(3)} · ${np.y.toFixed(3)}`

    /* Cosmos */
    const eyesCover = clamp((y - (metrics.eTop - vh * 0.5)) / (vh * 0.5))
    const finaleIn = clamp((y - (metrics.fTop - vh * 0.7)) / (vh * 0.5))
    const fade = clamp(1 - eyesCover + finaleIn) * introFade
    cosmos?.render({
      morph,
      fade,
      anchor,
      pointer: np,
      time: motion ? seconds : 0,
      dt
    })

    eyes.render(seconds, dt)
  }

  gsap.ticker.add(frame)
  gsap.ticker.lagSmoothing(0)
  cleanups.push(() => gsap.ticker.remove(frame))

  /* Resize -------------------------------------------------------------- */
  let resizeTimer = 0
  const onResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      measure()
      cosmos?.resize()
      eyes.resize()
    }, 120)
  }
  addEventListener('resize', onResize)
  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(document.body)
  cleanups.push(() => {
    removeEventListener('resize', onResize)
    resizeObserver.disconnect()
  })

  /* Intro --------------------------------------------------------------- */
  const preloader = q('[data-preloader]')
  if (!motion || !preloader) {
    preloader?.remove()
    root.classList.add('is-ready')
  } else {
    const count = q('[data-preloader-count]', preloader)!
    const bar = q('[data-preloader-bar]', preloader)!
    const counter = { v: 0 }
    const tl = gsap.timeline()
    tl.to(counter, {
      v: 100,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        count.textContent = String(Math.round(counter.v)).padStart(3, '0')
        bar.style.transform = `scaleX(${counter.v / 100})`
      }
    })
      .to('.preloader__core', { opacity: 0, y: -20, duration: 0.4, ease: 'power2.in' })
      .addLabel('open')
      .to('.preloader__shutter--top', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, 'open')
      .to('.preloader__shutter--bottom', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, 'open')
      .add(() => root.classList.add('is-ready'), 'open+=0.3')
      .fromTo(tileWrap, { scale: 0.3, rotate: -18, opacity: 0, filter: 'blur(24px)' }, { scale: 1, rotate: 0, opacity: 1, filter: 'blur(0px)', duration: 1.6, ease: 'expo.out', clearProps: 'filter' }, 'open+=0.35')
      .fromTo(orbitsSvg, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.8, ease: 'expo.out' }, 'open+=0.5')
      .fromTo('.hero__letter > span', { yPercent: 115 }, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.06 }, 'open+=0.55')
      .fromTo('.bot__body', { scale: 0 }, { scale: 1, duration: 0.8, ease: 'back.out(2.4)', stagger: 0.09 }, 'open+=0.9')
      .fromTo(['.hud', '.hero__row', '.corner'], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }, 'open+=1')
      .to({ v: 0 }, { v: 1, duration: 2.2, ease: 'power2.out', onUpdate() { introFade = this.targets()[0].v } }, 'open+=0.2')
      .add(() => {
        preloader.remove()
        lenis?.start()
      }, 'open+=1.2')
  }

  /* Teardown ------------------------------------------------------------ */
  const stop = () => {
    for (const cleanup of cleanups) cleanup()
    lenis?.destroy()
    cosmos?.destroy()
  }
  addEventListener('pagehide', stop, { once: true })
}
