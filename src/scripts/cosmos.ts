import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer
} from 'three'
import { archipelago, galaxy, glyph, helix, mind, orbits } from './shapes'

export interface CosmosFrame {
  /** 0 galaxy · 1 mind · 2 archipelago · 3 helix · 4 orbits · 5 glyph */
  morph: number
  fade: number
  /** Screen position (NDC) the galaxy should orbit around. */
  anchor: { x: number; y: number }
  /** Pointer in NDC, or null when it left the window. */
  pointer: { x: number; y: number } | null
  time: number
  dt: number
}

export interface Cosmos {
  render(frame: CosmosFrame): void
  shock(ndcX: number, ndcY: number): void
  resize(): void
  destroy(): void
}

const SHAPES = 6
const TILT = [1.16, 0.28, 0.9, 0.14, 0.42, 0]
const OFFSET_X = [0, 2.5, 2.5, 2.7, 3.1, 0]
const OFFSET_Y = [0, 0, -0.15, 0, 0, -0.5]
const SCALE = [1, 1, 0.88, 0.92, 0.8, 0.72]
const CAMERA_Z = [10, 10.6, 10, 10.6, 10.8, 9.4]

const vertex = /* glsl */ `
attribute vec3 p1;
attribute vec3 p2;
attribute vec3 p3;
attribute vec3 p4;
attribute vec3 p5;
attribute float aSeed;
attribute float aKind;

uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uBurst;
uniform float uFade;
uniform float uShockTime;
uniform float uMouseStrength;
uniform vec3 uWa;
uniform vec3 uWb;
uniform vec3 uMouse;
uniform vec3 uShockOrigin;

varying vec3 vColor;
varying float vAlpha;

vec3 rotY(vec3 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

void main() {
  float roam = aKind * uTime * 0.3;
  float r = length(position.xz);
  vec3 disk = rotY(position, uTime * (0.05 + 0.012 / (0.5 + r * 0.3)) + roam) * uWa.x;
  vec3 forms = rotY(p1 * uWa.y + p2 * uWa.z + p3 * uWb.x + p4 * uWb.y, uTime * 0.06 + roam);
  vec3 p = disk + forms + p5 * uWb.z;

  float s = aSeed * 6.2831;
  float drift = 0.03 + 0.05 * uBurst;
  p += vec3(
    sin(uTime * 0.6 + s + p.y * 1.4),
    cos(uTime * 0.5 + s * 1.3 + p.x * 1.2),
    sin(uTime * 0.45 + s * 2.1 + p.z)
  ) * drift;

  vec3 dir = normalize(vec3(sin(s * 3.1), cos(s * 1.7), sin(s * 2.3)) + 1e-4);
  p += dir * uBurst * (0.5 + aSeed * 1.4);

  vec4 world = modelMatrix * vec4(p, 1.0);

  vec2 d = world.xy - uMouse.xy;
  float fall = smoothstep(1.6, 0.0, length(d)) * uMouseStrength;
  world.xy += normalize(d + 1e-4) * fall * fall * 0.85;
  world.z += fall * 0.5;

  float sd = distance(world.xy, uShockOrigin.xy);
  float wave = exp(-pow((sd - uShockTime * 7.0) * 1.5, 2.0)) * exp(-uShockTime * 1.3);
  world.xy += normalize(world.xy - uShockOrigin.xy + 1e-4) * wave * 0.8;
  world.z += wave * 0.6;

  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;

  float twinkle = 0.75 + 0.25 * sin(uTime * (1.2 + aSeed * 3.0) + s * 4.0);
  float grain = fract(aSeed * 91.7);
  float size = uSize * (0.6 + grain * grain * 1.6) * (1.0 + aKind * 1.6) * twinkle;
  size *= 1.0 + fall * 1.6 + wave * 2.5;
  gl_PointSize = size * uPixelRatio * (10.0 / -mv.z);

  vec3 violet = vec3(0.63, 0.40, 0.93);
  vec3 pink = vec3(0.86, 0.37, 0.90);
  vec3 indigo = vec3(0.28, 0.25, 0.80);
  vec3 cyan = vec3(0.12, 0.86, 0.93);
  vec3 c = mix(indigo, violet, smoothstep(0.0, 0.55, aSeed));
  c = mix(c, pink, smoothstep(0.66, 1.0, aSeed));

  float diag = p5.x * 0.45 + p5.y * 0.55;
  vec3 tile = mix(mix(indigo, violet, smoothstep(-2.4, 0.0, diag)), pink, smoothstep(0.2, 2.2, diag));
  tile = mix(tile, cyan, smoothstep(0.4, 2.0, p5.x - p5.y * 0.9) * 0.85);
  tile = mix(tile, vec3(1.0), 0.18);
  c = mix(c, tile, uWb.z);
  c = mix(c, cyan, aKind);
  c += vec3(0.85, 0.9, 1.0) * (fall * 0.45 + wave * 0.7);

  vColor = c * 1.35;
  vAlpha = uFade * twinkle * smoothstep(34.0, 4.0, -mv.z);
}
`

const fragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float a = pow(1.0 - d * 2.0, 1.4);
  float core = smoothstep(0.2, 0.0, d);
  gl_FragColor = vec4(vColor * (a * 0.8 + core), vAlpha * (a * 0.8 + core * 0.6));
}
`

const ease = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function canRunCosmos() {
  try {
    const probe = document.createElement('canvas')
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'))
  } catch {
    return false
  }
}

export function mountCosmos(canvas: HTMLCanvasElement): Cosmos {
  const narrow = () => window.innerWidth / window.innerHeight < 0.9
  const count = window.innerWidth < 760 ? 6500 : 15000

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  const scene = new Scene()
  const camera = new PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0, 10)

  const shapes = [galaxy(count), mind(count), archipelago(count), helix(count), orbits(count), glyph(count)]
  const seeds = new Float32Array(count)
  const kinds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    seeds[i] = Math.random()
    kinds[i] = Math.random() < 0.012 ? 1 : 0
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(shapes[0], 3))
  for (let i = 1; i < SHAPES; i++) geometry.setAttribute(`p${i}`, new BufferAttribute(shapes[i], 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geometry.setAttribute('aKind', new BufferAttribute(kinds, 1))

  const uniforms = {
    uTime: { value: 0 },
    uSize: { value: 5.2 },
    uPixelRatio: { value: 1 },
    uBurst: { value: 0 },
    uFade: { value: 0 },
    uShockTime: { value: 99 },
    uMouseStrength: { value: 0 },
    uWa: { value: new Vector3(1, 0, 0) },
    uWb: { value: new Vector3(0, 0, 0) },
    uMouse: { value: new Vector3(99, 99, 0) },
    uShockOrigin: { value: new Vector3() }
  }

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending
  })

  const points = new Points(geometry, material)
  points.frustumCulled = false
  const group = new Group()
  group.add(points)
  scene.add(group)

  const weights = new Array<number>(SHAPES).fill(0)
  const tmp = new Vector3()
  const dir = new Vector3()
  const mouseWorld = new Vector3(99, 99, 0)
  let morph = 0
  let fade = 0
  let mouseStrength = 0
  let shockStart = -99
  let lastTime = 0
  let camX = 0
  let camY = 0

  const toWorld = (ndcX: number, ndcY: number, out: Vector3) => {
    tmp.set(ndcX, ndcY, 0.5).unproject(camera)
    dir.copy(tmp).sub(camera.position).normalize()
    const t = -camera.position.z / dir.z
    return out.copy(camera.position).addScaledVector(dir, t)
  }

  const resize = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    renderer.setPixelRatio(ratio)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    uniforms.uPixelRatio.value = ratio
  }
  resize()

  const anchor = new Vector3()

  return {
    render(frame) {
      morph = lerp(morph, frame.morph, Math.min(1, frame.dt * 4))
      fade = lerp(fade, frame.fade, Math.min(1, frame.dt * 3))
      if (fade < 0.01 && frame.fade < 0.01) return

      const clamped = Math.min(Math.max(morph, 0), SHAPES - 1)
      const index = Math.min(Math.floor(clamped), SHAPES - 2)
      const local = clamped - index
      const eased = ease(local)
      weights.fill(0)
      weights[index] = 1 - eased
      weights[index + 1] = eased

      const isNarrow = narrow()
      const aspect = camera.aspect
      const fit = isNarrow ? Math.max(0.5, Math.min(1, aspect * 0.95)) : 1

      let tilt = 0
      let offX = 0
      let offY = 0
      let scale = 0
      let camZ = 0
      for (let i = 0; i < SHAPES; i++) {
        const w = weights[i]
        if (!w) continue
        tilt += TILT[i] * w
        offX += (isNarrow ? 0 : OFFSET_X[i]) * w
        offY += (isNarrow && i > 0 && i < 5 ? 1.25 : OFFSET_Y[i]) * w
        scale += SCALE[i] * (i === 0 ? 1 : fit) * w
        camZ += CAMERA_Z[i] * w
      }

      const pointer = frame.pointer
      const px = pointer?.x ?? 0
      const py = pointer?.y ?? 0
      camX = lerp(camX, px * 0.45, Math.min(1, frame.dt * 2))
      camY = lerp(camY, py * 0.3, Math.min(1, frame.dt * 2))
      camera.position.set(camX, camY, camZ)
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld()

      toWorld(frame.anchor.x, frame.anchor.y, anchor)
      const galaxyWeight = weights[0]
      group.position.set(
        offX + anchor.x * galaxyWeight,
        offY + anchor.y * galaxyWeight,
        0
      )
      const free = 1 - weights[5]
      group.rotation.x = tilt + Math.sin(frame.time * 0.21) * 0.06 * free - py * 0.12 * free
      group.rotation.y = (Math.sin(frame.time * 0.13) * 0.35 + px * 0.25) * free * (1 - galaxyWeight * 0.7)
      group.scale.setScalar(scale)

      if (pointer) {
        toWorld(pointer.x, pointer.y, tmp)
        mouseWorld.lerp(tmp, Math.min(1, frame.dt * 8))
        mouseStrength = lerp(mouseStrength, 1, Math.min(1, frame.dt * 3))
      } else {
        mouseStrength = lerp(mouseStrength, 0, Math.min(1, frame.dt * 3))
      }

      uniforms.uTime.value = frame.time
      uniforms.uFade.value = fade
      uniforms.uBurst.value = Math.sin(Math.PI * local) * (index === 0 ? 0.55 : 0.8)
      uniforms.uWa.value.set(weights[0], weights[1], weights[2])
      uniforms.uWb.value.set(weights[3], weights[4], weights[5])
      uniforms.uMouse.value.copy(mouseWorld)
      uniforms.uMouseStrength.value = mouseStrength
      uniforms.uShockTime.value = frame.time - shockStart

      renderer.render(scene, camera)
      lastTime = frame.time
    },
    shock(ndcX, ndcY) {
      toWorld(ndcX, ndcY, uniforms.uShockOrigin.value)
      shockStart = lastTime
    },
    resize,
    destroy() {
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    }
  }
}
