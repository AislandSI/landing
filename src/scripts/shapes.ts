import { LOGO_PATHS, LOGO_VIEWBOX } from '../brand/logo'

export type Shape = Float32Array

function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(rand: () => number) {
  const u = Math.max(rand(), 1e-6)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * rand())
}

function set(out: Shape, i: number, x: number, y: number, z: number) {
  out[i * 3] = x
  out[i * 3 + 1] = y
  out[i * 3 + 2] = z
}

/** Spiral disk in the XZ plane with an empty core where the logo tile floats. */
export function galaxy(count: number): Shape {
  const rand = random(11)
  const out = new Float32Array(count * 3)
  const arms = 3
  for (let i = 0; i < count; i++) {
    if (rand() < 0.14) {
      const r = 6 + rand() * 9
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      set(out, i, r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.6, r * Math.sin(phi) * Math.sin(theta))
      continue
    }
    const r = 1.85 + Math.pow(rand(), 0.85) * 5.6
    const arm = Math.floor(rand() * arms)
    const spread = gauss(rand) * (0.18 + r * 0.06)
    const theta = (arm / arms) * Math.PI * 2 + r * 0.82 + spread
    const y = gauss(rand) * (0.05 + 0.12 * Math.exp(-(r - 1.85)))
    set(out, i, Math.cos(theta) * r, y, Math.sin(theta) * r)
  }
  return out
}

/** A mind: fibonacci shell with noisy bands and an inner nucleus. */
export function mind(count: number): Shape {
  const rand = random(23)
  const out = new Float32Array(count * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const kind = rand()
    if (kind < 0.18) {
      const r = Math.pow(rand(), 0.6) * 0.9
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      set(out, i, r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
      continue
    }
    const y = 1 - (i / (count - 1)) * 2
    const radius = Math.sqrt(1 - y * y)
    const theta = golden * i
    const band = 1 + 0.08 * Math.sin(y * 9 + Math.cos(theta * 3) * 1.5) + gauss(rand) * 0.02
    const r = 2.5 * band * (kind < 0.3 ? 1.18 + rand() * 0.25 : 1)
    set(out, i, Math.cos(theta) * radius * r, y * r, Math.sin(theta) * radius * r)
  }
  return out
}

/** Islands with topographic rings, joined by raised arcs. */
export function archipelago(count: number): Shape {
  const rand = random(37)
  const out = new Float32Array(count * 3)
  const islands = [
    [0, 0, 1.15],
    [-2.4, -1.1, 0.8],
    [2.5, -0.6, 0.9],
    [-1.3, 2.1, 0.7],
    [1.6, 2.2, 0.6],
    [-3.4, 1.3, 0.45],
    [3.6, 1.6, 0.4],
    [0.4, -2.6, 0.55]
  ]
  const links = [
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 6], [0, 7], [3, 4]
  ]
  for (let i = 0; i < count; i++) {
    if (rand() < 0.16) {
      const [a, b] = links[Math.floor(rand() * links.length)]
      const t = rand()
      const [ax, az] = islands[a]
      const [bx, bz] = islands[b]
      const x = ax + (bx - ax) * t
      const z = az + (bz - az) * t
      const lift = Math.sin(t * Math.PI) * 0.7
      set(out, i, x + gauss(rand) * 0.015, 0.25 + lift, z + gauss(rand) * 0.015)
      continue
    }
    const island = islands[Math.floor(Math.pow(rand(), 1.4) * islands.length)]
    const [cx, cz, size] = island
    const ring = Math.floor(rand() * 6)
    const rr = (ring / 6 + rand() * 0.04) * size * 1.15
    const theta = rand() * Math.PI * 2
    const wobble = 1 + 0.12 * Math.sin(theta * 3 + cx * 2) + 0.06 * Math.cos(theta * 5 + cz)
    const height = Math.exp(-((rr / size) ** 2) * 2.2) * size * 0.9
    set(out, i, cx + Math.cos(theta) * rr * wobble, height - 0.2, cz + Math.sin(theta) * rr * wobble)
  }
  return out
}

/** Memory: a double helix with rungs, continuity rising through time. */
export function helix(count: number): Shape {
  const rand = random(53)
  const out = new Float32Array(count * 3)
  const height = 7.4
  const turns = 3.2
  const radius = 1.25
  for (let i = 0; i < count; i++) {
    const t = rand()
    const y = (t - 0.5) * height
    const angle = t * turns * Math.PI * 2
    const kind = rand()
    if (kind < 0.22) {
      const step = Math.round(t * 46) / 46
      const yy = (step - 0.5) * height
      const a = step * turns * Math.PI * 2
      const s = rand() * 2 - 1
      set(out, i, Math.cos(a) * radius * s, yy, Math.sin(a) * radius * s)
      continue
    }
    const offset = kind < 0.61 ? 0 : Math.PI
    const jitter = gauss(rand) * 0.06
    set(out, i, Math.cos(angle + offset) * (radius + jitter), y + gauss(rand) * 0.03, Math.sin(angle + offset) * (radius + jitter))
  }
  return out
}

/** Orbits: inclined rings, each one a discipline, around a shared core. */
export function orbits(count: number): Shape {
  const rand = random(71)
  const out = new Float32Array(count * 3)
  const rings = [
    { r: 1.35, tilt: 0.3, yaw: 0.2 },
    { r: 2.0, tilt: -0.55, yaw: 1.1 },
    { r: 2.65, tilt: 0.9, yaw: 2.3 },
    { r: 3.3, tilt: -0.2, yaw: 0.7 },
    { r: 3.95, tilt: 0.45, yaw: 2.9 }
  ]
  for (let i = 0; i < count; i++) {
    const kind = rand()
    if (kind < 0.1) {
      const r = Math.pow(rand(), 0.5) * 0.55
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      set(out, i, r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
      continue
    }
    const ring = rings[Math.floor(rand() * rings.length)]
    let theta = rand() * Math.PI * 2
    let rr = ring.r + gauss(rand) * 0.025
    let lift = gauss(rand) * 0.02
    if (kind < 0.28) {
      theta = Math.floor(theta / (Math.PI / 2)) * (Math.PI / 2) + 0.4
      const blob = 0.16
      rr += gauss(rand) * blob
      lift += gauss(rand) * blob
      theta += gauss(rand) * blob / ring.r
    }
    const x0 = Math.cos(theta) * rr
    const z0 = Math.sin(theta) * rr
    const y1 = lift * Math.cos(ring.tilt) - z0 * Math.sin(ring.tilt)
    const z1 = lift * Math.sin(ring.tilt) + z0 * Math.cos(ring.tilt)
    const x2 = x0 * Math.cos(ring.yaw) - z1 * Math.sin(ring.yaw)
    const z2 = x0 * Math.sin(ring.yaw) + z1 * Math.cos(ring.yaw)
    set(out, i, x2, y1, z2)
  }
  return out
}

/** The brand glyph, sampled from the original paths. */
export function glyph(count: number): Shape {
  const rand = random(97)
  const out = new Float32Array(count * 3)
  const scale = 5
  const w = Math.round(LOGO_VIEWBOX.width * scale)
  const h = Math.round(LOGO_VIEWBOX.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return out
  ctx.scale(scale, scale)
  ctx.fillStyle = '#fff'
  for (const d of LOGO_PATHS) ctx.fill(new Path2D(d))
  const data = ctx.getImageData(0, 0, w, h).data
  const inside: number[] = []
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3] > 128) inside.push(x, y)
    }
  }
  const size = 4.6
  const unit = size / w
  for (let i = 0; i < count; i++) {
    if (rand() < 0.08) {
      const r = 3.2 + rand() * 4
      const theta = rand() * Math.PI * 2
      set(out, i, Math.cos(theta) * r, Math.sin(theta) * r * 0.62, (rand() - 0.5) * 2)
      continue
    }
    const k = Math.floor(rand() * (inside.length / 2)) * 2
    const x = (inside[k] + rand() - w / 2) * unit
    const y = -(inside[k + 1] + rand() - h / 2) * unit
    set(out, i, x, y, gauss(rand) * 0.05)
  }
  return out
}
