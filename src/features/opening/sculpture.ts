import { ease } from './timeline'

/** Projected, depth-sorted ribbon surfaces, ported from OpeningSculpture.swift. */
interface Vector {
  x: number
  y: number
  z: number
}

export interface Face {
  points: [number, number][]
  depth: number
  light: number
}

const add = (a: Vector, b: Vector): Vector => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const sub = (a: Vector, b: Vector): Vector => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const scale = (a: Vector, s: number): Vector => ({ x: a.x * s, y: a.y * s, z: a.z * s })
const dot = (a: Vector, b: Vector) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: Vector, b: Vector): Vector => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const normalized = (a: Vector) => scale(a, 1 / Math.max(0.0001, Math.sqrt(dot(a, a))))

export function ribbonFaces(progress: number, width: number, height: number): Face[] {
  const gather = ease(progress, 0.12, 0.68)
  const camera = ease(progress, 0, 0.75)
  const wide = width > height * 1.2
  const size = Math.min(width / (wide ? 820 : 390), height / (wide ? 450 : 760))
  const yaw = -0.55 + camera * 0.8
  const roll = -0.28 + camera * 0.12
  const center = { x: width * (wide ? 0.27 : 0.5), y: height * (wide ? 0.42 : 0.37) }
  const slices = 64
  const lightDirection = normalized({ x: -0.35, y: -0.45, z: 1 })

  const centerline = (u: number, band: number): Vector => {
    const lane = band - 2.5
    const phase = u * 2.5 + progress * 2.2
    const flowing = { x: u * 370 + lane * 13, y: Math.sin(phase + lane * 0.17) * 120 + lane * 37, z: Math.cos(phase + lane * 0.3) * 80 }
    const rising = {
      x: lane * 35 + Math.sin(u * Math.PI + lane * 0.24) * 29,
      y: u * (125 + band * 7) - lane * 16,
      z: Math.cos(u * Math.PI + lane * 0.16) * 65,
    }
    return add(scale(flowing, 1 - gather), scale(rising, gather))
  }

  const surface = (u: number, side: number, band: number): Vector => {
    const point = centerline(u, band)
    const tangent = normalized(sub(centerline(u + 0.002, band), centerline(u - 0.002, band)))
    const normal = normalized({ x: -tangent.y, y: tangent.x, z: 0 })
    const binormal = normalized(cross(tangent, normal))
    const twist = u * 1.25 + band * 0.18 + progress * 0.8
    const taper = 0.38 + 0.62 * Math.pow(Math.max(0, 1 - u * u), 0.28)
    const ribbonWidth = (15 - band * 0.4) * taper
    return add(point, scale(add(scale(normal, Math.cos(twist)), scale(binormal, Math.sin(twist))), side * ribbonWidth))
  }

  const rotate = (p: Vector): Vector => {
    const x = p.x * Math.cos(yaw) + p.z * Math.sin(yaw)
    const z = -p.x * Math.sin(yaw) + p.z * Math.cos(yaw)
    return { x: x * Math.cos(roll) - p.y * Math.sin(roll), y: x * Math.sin(roll) + p.y * Math.cos(roll), z }
  }

  const project = (p: Vector): [number, number] => {
    const perspective = 650 / (650 - p.z)
    return [center.x + p.x * perspective * size, center.y + p.y * perspective * size]
  }

  const faces: Face[] = []
  for (let band = 0; band < 6; band++) {
    for (let slice = 0; slice < slices; slice++) {
      const u = -1 + (slice * 2) / slices
      const a = rotate(surface(u, -1, band))
      const b = rotate(surface(u, 1, band))
      // Slight overlap prevents antialiasing gaps without drawing cross-slice seams.
      const next = Math.min(1, -1 + ((slice + 1) * 2) / slices + 0.001)
      const c = rotate(surface(next, 1, band))
      const d = rotate(surface(next, -1, band))
      const normal = normalized(cross(sub(b, a), sub(d, a)))
      const diffuse = Math.abs(dot(normal, lightDirection))
      const reflection = Math.pow(Math.abs(normal.z), 12)
      const travelingLight = Math.exp(-Math.pow((u - (progress * 3 - 1.5)) * 3, 2)) * 0.18
      faces.push({
        points: [project(a), project(b), project(c), project(d)],
        depth: (a.z + b.z + c.z + d.z) / 4,
        light: Math.min(0.96, 0.12 + diffuse * 0.38 + reflection * 0.35 + travelingLight),
      })
    }
  }
  return faces.sort((lhs, rhs) => lhs.depth - rhs.depth)
}
