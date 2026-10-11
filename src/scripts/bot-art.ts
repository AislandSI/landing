export type BotShape = 'circle' | 'squircle' | 'drop' | 'capsule'
export type BotEyes = 'pill' | 'dot' | 'oval'
export type BotMouth = 'none' | 'o' | 'smile'

export interface BotLook {
  r: number
  shape: BotShape
  skin: number
  eyes: BotEyes
  blush: boolean
  /** Gaze, -1..1 on each axis. */
  lx: number
  ly: number
  open: number
  joy: number
  mouth: BotMouth
}

export const SKINS: [string, string, string][] = [
  ['#dcc4ff', '#a065ee', '#4b2fb8'],
  ['#ffd0f8', '#dc5ee5', '#7a2fc9'],
  ['#b4f8fb', '#16b5c5', '#16568c'],
  ['#b0aaff', '#5b50e2', '#231b7a'],
  ['#ffffff', '#ebe4fb', '#9d90c8']
]
export const SHAPES: BotShape[] = ['circle', 'squircle', 'drop', 'capsule']
export const EYES: BotEyes[] = ['pill', 'dot', 'oval']
export const SPAN = 1.2

const SPRITE = 256
const INK = '#150d2a'

export const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

function tracePath(ctx: CanvasRenderingContext2D, shape: BotShape) {
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

function makeBody(shape: BotShape, [light, base, deep]: [string, string, string]) {
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

const bodies = new Map<string, HTMLCanvasElement>()

function body(shape: BotShape, skin: number) {
  const key = `${shape}:${skin}`
  let sprite = bodies.get(key)
  if (!sprite) {
    sprite = makeBody(shape, SKINS[skin])
    bodies.set(key, sprite)
  }
  return sprite
}

function drawEye(ctx: CanvasRenderingContext2D, look: BotLook, ex: number, ey: number, side: number) {
  const { r } = look
  if (look.joy > 0.5) {
    ctx.beginPath()
    ctx.arc(ex, ey + r * 0.06, r * 0.11, Math.PI * 1.1, Math.PI * 1.9)
    ctx.lineWidth = r * 0.075
    ctx.lineCap = 'round'
    ctx.strokeStyle = INK
    ctx.stroke()
    return
  }
  const open = Math.max(0.08, look.open)
  ctx.fillStyle = INK
  ctx.beginPath()
  if (look.eyes === 'pill') {
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
  const rx = look.eyes === 'dot' ? r * 0.12 : r * 0.13
  const ry = (look.eyes === 'dot' ? r * 0.12 : r * 0.2) * open
  ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  if (open > 0.5) {
    ctx.beginPath()
    ctx.arc(ex - rx * 0.32, ey - ry * 0.38, rx * 0.34, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fill()
  }
}

/** Draws body and face centred on the current origin. */
export function drawBot(ctx: CanvasRenderingContext2D, look: BotLook) {
  const { r } = look
  const size = r * SPAN * 2
  ctx.drawImage(body(look.shape, look.skin), -size / 2, -size / 2, size, size)

  const fx = look.lx * r * 0.3
  const fy = look.ly * r * 0.22 + (look.shape === 'drop' ? r * 0.18 : 0)
  const spread = look.shape === 'drop' ? r * 0.26 : r * 0.31

  if (look.blush) {
    ctx.fillStyle = look.skin === 1 ? 'rgba(255, 140, 200, 0.55)' : 'rgba(255, 120, 190, 0.38)'
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(fx + side * spread * 1.45, fy + r * 0.24, r * 0.13, r * 0.07, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawEye(ctx, look, fx - spread, fy - r * 0.06, -1)
  drawEye(ctx, look, fx + spread, fy - r * 0.06, 1)

  const mouth = look.joy > 0.5 ? 'smile' : look.mouth
  if (mouth === 'o') {
    ctx.beginPath()
    ctx.ellipse(fx, fy + r * 0.3, r * 0.07, r * 0.09, 0, 0, Math.PI * 2)
    ctx.fillStyle = INK
    ctx.fill()
  } else if (mouth === 'smile') {
    ctx.beginPath()
    ctx.arc(fx, fy + r * 0.2, r * 0.12, Math.PI * 0.15, Math.PI * 0.85)
    ctx.lineWidth = r * 0.06
    ctx.lineCap = 'round'
    ctx.strokeStyle = INK
    ctx.stroke()
  }
}
