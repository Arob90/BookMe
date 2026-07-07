import { randomBytes } from 'crypto'

/** Unambiguous alphabet (no 0/O/1/I) for human-readable reference codes. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Generate a reference like "IDEA-7Q2F9K". `len` chars after the prefix. */
export function generateRef(prefix: string, len = 6): string {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return `${prefix}-${out}`
}

/**
 * Generate a reference guaranteed unique against `exists`, retrying on collision.
 * `exists(ref)` should resolve true when the ref is already taken.
 */
export async function generateUniqueRef(
  prefix: string,
  exists: (ref: string) => Promise<boolean>,
  len = 6
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const ref = generateRef(prefix, len)
    if (!(await exists(ref))) return ref
  }
  // Extremely unlikely; widen the space as a fallback.
  return generateRef(prefix, len + 3)
}
