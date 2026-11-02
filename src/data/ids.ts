import type { SyncedTable } from './types'

/*
 * Stable ids (UUIDv5, RFC 9562) for records that exist once per account or once per day: the
 * profile, the training plan, a day's body weight, weight reward and sleep score, and the XP receipt
 * of a workout. Two devices create the same id for the same day, so the server merges them into one
 * row. The cloud key is (user_id, id), which keeps equal ids of different accounts apart.
 *
 * SHA-1 is computed synchronously because Dexie upgrade transactions cannot await crypto.subtle.
 */

const namespace = '6f1c8f7e-4b5d-4c39-9a2e-6d6f74696f6e'

export type StableKind = Extract<SyncedTable, 'profiles' | 'training_plans' | 'body_weights' | 'weight_rewards' | 'sleep_scores' | 'workout_awards'>

/** profiles and training_plans exist once; the others need their day or workout id as key. */
export function stableID(kind: StableKind, key = 'singleton'): string {
  return uuidV5(namespace, `${kind}/${key}`)
}

export function uuidV5(namespaceID: string, name: string): string {
  const space = namespaceID.replace(/-/g, '').match(/../g)!.map((byte) => parseInt(byte, 16))
  const hash = sha1([...space, ...new TextEncoder().encode(name)]).slice(0, 16)
  hash[6] = (hash[6]! & 0x0f) | 0x50
  hash[8] = (hash[8]! & 0x3f) | 0x80
  const hex = hash.map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function sha1(message: number[]): number[] {
  const bytes = [...message, 0x80]
  while (bytes.length % 64 !== 56) bytes.push(0)
  const bits = message.length * 8
  for (let shift = 56; shift >= 0; shift -= 8) bytes.push(shift >= 32 ? Math.floor(bits / 2 ** shift) & 0xff : (bits >>> shift) & 0xff)
  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]
  const w = new Array<number>(80)
  const rotate = (value: number, count: number) => (value << count) | (value >>> (32 - count))
  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) w[i] = (bytes[chunk + i * 4]! << 24) | (bytes[chunk + i * 4 + 1]! << 16) | (bytes[chunk + i * 4 + 2]! << 8) | bytes[chunk + i * 4 + 3]!
    for (let i = 16; i < 80; i++) w[i] = rotate(w[i - 3]! ^ w[i - 8]! ^ w[i - 14]! ^ w[i - 16]!, 1)
    let [a, b, c, d, e] = h as [number, number, number, number, number]
    for (let i = 0; i < 80; i++) {
      const [f, k] =
        i < 20 ? [(b & c) | (~b & d), 0x5a827999] : i < 40 ? [b ^ c ^ d, 0x6ed9eba1] : i < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc] : [b ^ c ^ d, 0xca62c1d6]
      const next = (rotate(a, 5) + f + e + k + w[i]!) | 0
      e = d
      d = c
      c = rotate(b, 30)
      b = a
      a = next
    }
    h[0] = (h[0]! + a) | 0
    h[1] = (h[1]! + b) | 0
    h[2] = (h[2]! + c) | 0
    h[3] = (h[3]! + d) | 0
    h[4] = (h[4]! + e) | 0
  }
  return h.flatMap((word) => [(word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff])
}
