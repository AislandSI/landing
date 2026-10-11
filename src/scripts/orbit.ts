import { phrase } from '../i18n/locale'
import { drawBot, EYES, pick, SHAPES, SKINS, type BotEyes, type BotShape } from './bot-art'

export type NodeType = 'project' | 'area' | 'team' | 'component' | 'goal' | 'report' | 'product'
export type LinkKind = 'agents' | 'nodes' | 'mixed'

export interface LinkEvent {
  kind: LinkKind
  a: string
  b: string
}

export interface OrbitPick {
  kind: 'agent' | 'node' | 'logo'
  x: number
  y: number
}

export interface Orbit {
  render(time: number, dt: number, center: { x: number; y: number }, pointer: { x: number; y: number } | null): void
  /** Element under the point, preferring whatever sits in front. A hit on an agent also plays its bounce. */
  hit(x: number, y: number): OrbitPick | null
  resize(): void
}

interface Entity {
  kind: 'agent' | 'node'
  ring: number
  angle: number
  speed: number
  radius: number
  phase: number
  code: string
  x: number
  y: number
  depth: number
  scale: number
  alpha: number
  busyUntil: number
  pingAt: number
  joyUntil: number
  squishAt: number
  hitR: number
  hw: number
  hh: number
  partner: Entity | null
  type?: NodeType
  look?: {
    shape: BotShape
    skin: number
    eyes: BotEyes
    blush: boolean
    lx: number
    ly: number
    open: number
    joy: number
    blinkAt: number
    blinkStart: number
  }
}

interface Link {
  kind: LinkKind
  a: Entity
  b: Entity
  start: number
  arrived: boolean
  replied: boolean
}

const RINGS = [
  { rx: 1, ry: 0.3, rotation: -0.07, speed: 0.05 },
  { rx: 0.72, ry: 0.25, rotation: 0.09, speed: -0.065 }
]
const NODE_TYPES: NodeType[] = ['project', 'area', 'team', 'component', 'goal', 'report', 'product']
const NODE_COLORS: Record<NodeType, string> = {
  project: '#b48cff',
  area: '#dc5ee5',
  team: '#2ad4e2',
  component: '#8d86ff',
  goal: '#ff9bd8',
  report: '#7fe8ee',
  product: '#e7defa'
}
const LINK_COLORS: Record<LinkKind, [string, string]> = {
  agents: ['#2ad4e2', '#2ad4e2'],
  nodes: ['#a065ee', '#dc5ee5'],
  mixed: ['#2ad4e2', '#a065ee']
}
const LINK_LIFE = 3.4
const MAX_LINKS = 3
const BLINK = 0.16

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function quad(a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}

function drawIcon(ctx: CanvasRenderingContext2D, type: NodeType, s: number, color: string) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(1, s * 0.16)
  ctx.beginPath()
  switch (type) {
    case 'project':
      ctx.roundRect(-s, -s, s * 2, s * 2, s * 0.45)
      ctx.stroke()
      break
    case 'area':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        ctx.lineTo(Math.cos(a) * s * 1.1, Math.sin(a) * s * 1.1)
      }
      ctx.closePath()
      ctx.stroke()
      break
    case 'team':
      for (const [x, y] of [[-0.7, 0.45], [0.7, 0.45], [0, -0.6]]) {
        ctx.moveTo(x * s + s * 0.42, y * s)
        ctx.arc(x * s, y * s, s * 0.42, 0, Math.PI * 2)
      }
      ctx.fill()
      break
    case 'component':
      ctx.moveTo(0, -s * 1.15)
      ctx.lineTo(s * 1.15, 0)
      ctx.lineTo(0, s * 1.15)
      ctx.lineTo(-s * 1.15, 0)
      ctx.closePath()
      ctx.stroke()
      break
    case 'goal':
      ctx.arc(0, 0, s * 1.05, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'report':
      ctx.roundRect(-s, -s * 0.1, s * 0.5, s * 1.1, s * 0.12)
      ctx.roundRect(-s * 0.25, -s * 0.6, s * 0.5, s * 1.6, s * 0.12)
      ctx.roundRect(s * 0.5, -s * 1, s * 0.5, s * 2, s * 0.12)
      ctx.fill()
      break
    case 'product':
      ctx.moveTo(0, -s * 1.1)
      ctx.lineTo(s * 1.05, -s * 0.5)
      ctx.lineTo(s * 1.05, s * 0.65)
      ctx.lineTo(0, s * 1.2)
      ctx.lineTo(-s * 1.05, s * 0.65)
      ctx.lineTo(-s * 1.05, -s * 0.5)
      ctx.closePath()
      ctx.moveTo(-s * 1.05, -s * 0.5)
      ctx.lineTo(0, s * 0.05)
      ctx.lineTo(s * 1.05, -s * 0.5)
      ctx.moveTo(0, s * 0.05)
      ctx.lineTo(0, s * 1.2)
      ctx.stroke()
      break
  }
}

export function mountOrbit(
  canvas: HTMLCanvasElement,
  options: { reduce: boolean; onLink?: (event: LinkEvent) => void }
): Orbit {
  const ctx = canvas.getContext('2d')!
  const { reduce } = options
  let width = 0
  let height = 0
  let unit = 1
  let now = 0
  let origin = { x: 0, y: 0 }
  let nextLinkAt = 2.4
  const links: Link[] = []

  const entities: Entity[] = []
  const base = (kind: Entity['kind'], ring: number, angle: number, code: string): Entity => ({
    kind,
    ring,
    angle,
    speed: RINGS[ring].speed * (kind === 'agent' ? 1.3 : 1),
    radius: kind === 'agent' ? (Math.random() < 0.5 ? 0.9 : 1.08) : 1,
    phase: Math.random() * Math.PI * 2,
    code,
    x: 0,
    y: 0,
    depth: 0,
    scale: 1,
    alpha: 0,
    busyUntil: 0,
    pingAt: -10,
    joyUntil: 0,
    squishAt: -10,
    hitR: 0,
    hw: 0,
    hh: 0,
    partner: null
  })

  NODE_TYPES.forEach((type, index) => {
    const ring = index % 2
    const slot = Math.floor(index / 2)
    const count = ring === 0 ? 4 : 3
    const node = base('node', ring, (slot / count) * Math.PI * 2 + ring * 0.6, String(10 + index * 7).padStart(2, '0'))
    node.type = type
    entities.push(node)
  })
  for (let i = 0; i < 5; i++) {
    const agent = base('agent', i % 2, (i / 5) * Math.PI * 2 + 0.35, String(3 + i * 4).padStart(2, '0'))
    agent.look = {
      shape: SHAPES[i % SHAPES.length],
      skin: [0, 2, 1, 3, 4][i] % SKINS.length,
      eyes: pick(EYES),
      blush: i % 2 === 0,
      lx: 0,
      ly: 0,
      open: 1,
      joy: 0,
      blinkAt: 1 + Math.random() * 4,
      blinkStart: -1
    }
    entities.push(agent)
  }

  const label = (entity: Entity) => {
    const text = phrase().solo
    if (entity.kind === 'agent') return `${text.agent}·${entity.code}`
    return `${text.nodes[entity.type!].toLowerCase()}·${entity.code}`
  }

  const resize = () => {
    width = window.innerWidth
    height = window.innerHeight
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    unit = Math.min(1.15, Math.max(0.62, width / 1440))
  }
  resize()

  const place = (center: { x: number; y: number }, time: number) => {
    const span = Math.min(width * (width < 700 ? 0.6 : 0.46), height * 1.05, 820)
    for (const e of entities) {
      const ring = RINGS[e.ring]
      const wobble = reduce ? 0 : Math.sin(time * 0.4 + e.phase) * 0.025
      const rx = span * ring.rx * (e.radius + wobble)
      const ry = span * ring.ry * (e.radius + wobble)
      const lx = Math.cos(e.angle) * rx
      const ly = Math.sin(e.angle) * ry
      const cos = Math.cos(ring.rotation)
      const sin = Math.sin(ring.rotation)
      e.x = center.x + lx * cos - ly * sin
      e.y = center.y + lx * sin + ly * cos
      e.depth = Math.sin(e.angle)
      const near = (e.depth + 1) / 2
      e.scale = (0.4 + 0.9 * Math.pow(near, 1.4)) * unit
      e.alpha = smooth(-0.78, 0.08, e.depth)
    }
  }

  const free = (e: Entity, time: number) => e.alpha > 0.62 && e.busyUntil < time

  const spawn = (time: number) => {
    if (links.length >= MAX_LINKS) return false
    const roll = Math.random()
    const kind: LinkKind = roll < 0.45 ? 'mixed' : roll < 0.72 ? 'nodes' : 'agents'
    const pool = entities.filter((e) => free(e, time))
    const agents = pool.filter((e) => e.kind === 'agent')
    const nodes = pool.filter((e) => e.kind === 'node')
    let first: Entity[] = []
    let second: Entity[] = []
    if (kind === 'mixed') [first, second] = [agents, nodes]
    else if (kind === 'agents') [first, second] = [agents, agents]
    else [first, second] = [nodes, nodes]
    const maxDistance = Math.min(width, 1400) * 0.62
    const pairs: [Entity, Entity][] = []
    for (const a of first) {
      for (const b of second) {
        if (a === b) continue
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d > 60 * unit && d < maxDistance) pairs.push([a, b])
      }
    }
    if (!pairs.length) return false
    const [a, b] = pick(pairs)
    const busy = time + LINK_LIFE
    a.busyUntil = busy
    b.busyUntil = busy
    a.partner = b
    b.partner = a
    links.push({ kind, a, b, start: time, arrived: false, replied: false })
    options.onLink?.({ kind, a: label(a), b: label(b) })
    return true
  }

  const drawNode = (e: Entity, time: number) => {
    const type = e.type!
    const color = NODE_COLORS[type]
    const s = e.scale
    const fontSize = 10.5 * s
    ctx.font = `500 ${fontSize}px "Geist Mono", ui-monospace, monospace`
    const text = phrase().solo.nodes[type].toUpperCase()
    const tw = ctx.measureText(text).width + text.length * fontSize * 0.14
    const h = 26 * s
    const icon = 5 * s
    const padX = 10 * s
    const w = padX * 2 + icon * 2 + 8 * s + tw
    const x = e.x - w / 2
    const y = e.y - h / 2
    e.hw = w / 2
    e.hh = h / 2
    const active = e.busyUntil > time && e.joyUntil > time

    ctx.save()
    ctx.globalAlpha = e.alpha
    if (active) {
      ctx.shadowColor = 'rgba(42, 212, 226, 0.7)'
      ctx.shadowBlur = 18 * s
    }
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, h / 2)
    ctx.fillStyle = 'rgba(12, 10, 26, 0.86)'
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.lineWidth = 1
    ctx.strokeStyle = active ? 'rgba(42, 212, 226, 0.9)' : 'rgba(243, 240, 251, 0.16)'
    ctx.stroke()

    ctx.translate(x + padX + icon, e.y)
    drawIcon(ctx, type, icon, color)
    ctx.translate(icon + 8 * s, 0)
    ctx.fillStyle = active ? '#f3f0fb' : 'rgba(243, 240, 251, 0.72)'
    ctx.textBaseline = 'middle'
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${fontSize * 0.14}px`
    ctx.fillText(text, 0, 0.5)
    ctx.restore()

    const ping = time - e.pingAt
    if (ping < 0.9) {
      ctx.save()
      ctx.globalAlpha = e.alpha * (1 - ping / 0.9)
      ctx.beginPath()
      ctx.roundRect(x - ping * 14 * s, y - ping * 14 * s, w + ping * 28 * s, h + ping * 28 * s, h)
      ctx.strokeStyle = '#2ad4e2'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }
  }

  const drawAgent = (e: Entity, time: number, dt: number, center: { x: number; y: number }, pointer: { x: number; y: number } | null) => {
    const look = e.look!
    let target = center
    if (e.partner && e.busyUntil > time) target = e.partner
    else if (pointer && Math.hypot(pointer.x - e.x, pointer.y - e.y) < 240 * unit) target = pointer
    const dx = target.x - e.x
    const dy = target.y - e.y
    const len = Math.hypot(dx, dy) || 1
    const mag = Math.min(1, len / 120)
    const follow = Math.min(1, dt * 5)
    look.lx += ((dx / len) * mag - look.lx) * follow
    look.ly += ((dy / len) * mag - look.ly) * follow
    look.joy += ((e.joyUntil > time ? 1 : 0) - look.joy) * Math.min(1, dt * 10)

    let open = 1
    if (!reduce && time > look.blinkAt) {
      look.blinkStart = time
      look.blinkAt = time + 2.5 + Math.random() * 5
    }
    if (look.blinkStart >= 0) {
      const t = (time - look.blinkStart) / BLINK
      if (t >= 1) look.blinkStart = -1
      else open = 1 - Math.sin(t * Math.PI)
    }
    look.open = open

    const r = 24 * e.scale
    e.hitR = r * 1.25
    const bob = reduce ? 0 : Math.sin(time * 1.5 + e.phase) * r * 0.08
    const squishT = time - e.squishAt
    const squish = squishT >= 0 && squishT < 0.6 ? Math.sin(squishT * 18) * Math.exp(-squishT * 6) * 0.22 : 0
    ctx.save()
    ctx.globalAlpha = e.alpha
    ctx.translate(e.x, e.y + bob)
    ctx.rotate(look.lx * 0.12)
    ctx.scale(1 + squish, 1 - squish)
    drawBot(ctx, { r, ...look, mouth: 'none' })
    ctx.restore()
  }

  const drawLink = (link: Link, time: number, center: { x: number; y: number }) => {
    const t = (time - link.start) / LINK_LIFE
    const { a, b } = link
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const out = { x: mid.x - center.x, y: mid.y - center.y }
    const outLen = Math.hypot(out.x, out.y) || 1
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    const control = { x: mid.x + (out.x / outLen) * dist * 0.22, y: mid.y + (out.y / outLen) * dist * 0.22 }

    const grow = smooth(0, 0.22, t)
    const fade = 1 - smooth(0.8, 1, t)
    const alpha = Math.min(a.alpha, b.alpha) * fade
    if (alpha <= 0.01) return

    const [c1, c2] = LINK_COLORS[link.kind]
    const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
    gradient.addColorStop(0, c1)
    gradient.addColorStop(1, c2)

    ctx.save()
    ctx.globalAlpha = alpha * 0.55
    ctx.strokeStyle = gradient
    ctx.lineWidth = 1.1
    if (link.kind === 'nodes') ctx.setLineDash([3, 5])
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    const steps = 28
    for (let i = 1; i <= steps * grow; i++) {
      const p = quad(a, control, b, i / steps)
      ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    const pulse = (from: number, to: number, reverse: boolean) => {
      if (t < from || t > to) return
      const k = (t - from) / (to - from)
      const p = quad(a, control, b, reverse ? 1 - k : k)
      ctx.globalAlpha = alpha
      ctx.shadowColor = c1
      ctx.shadowBlur = 12
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }
    if (!reduce) {
      pulse(0.16, 0.5, false)
      if (link.kind !== 'nodes') pulse(0.52, 0.82, true)
    }
    ctx.restore()

    if (!link.arrived && t > 0.5) {
      link.arrived = true
      b.pingAt = time
      b.joyUntil = time + 1.4
    }
    if (!link.replied && t > 0.82) {
      link.replied = true
      a.pingAt = time
      a.joyUntil = time + 1.1
    }
  }

  return {
    render(time, dt, center, pointer) {
      now = time
      origin = center
      if (!reduce) for (const e of entities) e.angle += e.speed * dt
      place(center, time)

      if (time > nextLinkAt) {
        nextLinkAt = time + (spawn(time) ? 1.2 + Math.random() * 1.4 : 0.4)
      }
      for (let i = links.length - 1; i >= 0; i--) {
        if (time - links[i].start > LINK_LIFE) {
          const { a, b } = links[i]
          if (a.partner === b) a.partner = null
          if (b.partner === a) b.partner = null
          links.splice(i, 1)
        }
      }

      ctx.clearRect(0, 0, width, height)
      const intro = smooth(0.4, 2.6, time)
      const order = [...entities].sort((p, q) => p.depth - q.depth)
      for (const link of links) drawLink(link, time, center)
      for (const e of order) {
        const alpha = e.alpha
        e.alpha *= intro
        if (e.alpha > 0.01) {
          if (e.kind === 'agent') drawAgent(e, time, dt, center, pointer)
          else drawNode(e, time)
        }
        e.alpha = alpha
      }
    },
    hit(x, y) {
      let best: Entity | null = null
      for (const e of entities) {
        if (e.alpha < 0.45) continue
        const dx = x - e.x
        const dy = y - e.y
        const inside = e.kind === 'agent' ? Math.hypot(dx, dy) < e.hitR : Math.abs(dx) <= e.hw && Math.abs(dy) <= e.hh
        if (inside && (!best || e.depth > best.depth)) best = e
      }
      if (best) {
        if (best.kind === 'agent') {
          best.squishAt = now
          best.joyUntil = now + 1.1
        }
        return { kind: best.kind, x: best.x, y: best.y }
      }
      const logoR = Math.min(width, height) * 0.16
      if (Math.hypot(x - origin.x, y - origin.y) < logoR) return { kind: 'logo', x: origin.x, y: origin.y }
      return null
    },
    resize
  }
}
