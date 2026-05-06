/**
 * Shared helpers for mock data layer.
 *
 * Conventions:
 *   - All mock IDs are uuid-v4 strings produced by crypto.randomUUID(), cast to
 *     the appropriate branded type at the call site.
 *   - Timestamps are ISO-8601 UTC strings.
 *   - Money is DECIMAL(12,4) — represented as a string with 4 fractional digits.
 *   - sha256 is a deterministic placeholder for prototype use only; we do not
 *     run real hashing in mocks. The "hash" preserves the input shape so audit
 *     payload_hash and charge config_hash can demonstrate stability without a
 *     crypto dependency.
 */

import type {
  DecimalString,
  IsoDate,
  IsoTimestamp,
  Sha256Hex,
} from '@/types/primitives'

// ──────────────────────────────────────────────────────────────────────────────
// IDs
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Generate a uuid-v4 string. Returns a raw `string` so callers can cast to any
 * specific branded ID type at the call site, e.g. `id() as PersonId`.
 */
export function id(): string {
  return crypto.randomUUID()
}

// ──────────────────────────────────────────────────────────────────────────────
// Timestamps
// ──────────────────────────────────────────────────────────────────────────────

/** Anchor "now" for deterministic seeding. Today per CLAUDE.md is 2026-05-06. */
export const NOW = new Date('2026-05-06T15:00:00.000Z')

export function isoNow(): IsoTimestamp {
  return NOW.toISOString() as IsoTimestamp
}

export function daysAgo(days: number, hours = 0, minutes = 0): IsoTimestamp {
  const d = new Date(NOW)
  d.setUTCDate(d.getUTCDate() - days)
  d.setUTCHours(d.getUTCHours() - hours)
  d.setUTCMinutes(d.getUTCMinutes() - minutes)
  return d.toISOString() as IsoTimestamp
}

export function daysFromNow(days: number, hours = 0): IsoTimestamp {
  const d = new Date(NOW)
  d.setUTCDate(d.getUTCDate() + days)
  d.setUTCHours(d.getUTCHours() + hours)
  return d.toISOString() as IsoTimestamp
}

export function isoDate(year: number, month: number, day: number): IsoDate {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}` as IsoDate
}

// ──────────────────────────────────────────────────────────────────────────────
// Money
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Format a number as a DECIMAL(12,4) string. Always 4 fractional digits.
 * Use negative values for discounts, credits, subsidies.
 */
export function decimal(amount: number): DecimalString {
  return amount.toFixed(4) as DecimalString
}

/** Sum a list of DecimalString amounts. Returns a DecimalString. */
export function sumDecimals(values: DecimalString[]): DecimalString {
  const sum = values.reduce((acc, v) => acc + Number(v), 0)
  return decimal(sum)
}

// ──────────────────────────────────────────────────────────────────────────────
// Hashes (placeholder — prototype only)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic placeholder hash. Stable for the same input, distinct across
 * inputs. Not cryptographically meaningful — for prototype affordance only.
 */
export function fakeSha256(input: string): Sha256Hex {
  let h1 = 0x811c9dc5
  let h2 = 0xc6a4a793
  for (let i = 0; i < input.length; i++) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 0x01000193)
    h2 = Math.imul(h2 ^ input.charCodeAt(i), 0x85ebca6b)
  }
  const part = (n: number) => (n >>> 0).toString(16).padStart(8, '0')
  // 64 hex chars to match a real sha256 length.
  return (
    part(h1) +
    part(h2) +
    part(h1 ^ h2) +
    part(Math.imul(h1, 0x9e3779b1)) +
    part(Math.imul(h2, 0xc2b2ae35)) +
    part(h1 + h2) +
    part(h1 ^ 0xdeadbeef) +
    part(h2 ^ 0xfeedface)
  ) as Sha256Hex
}

// ──────────────────────────────────────────────────────────────────────────────
// Misc
// ──────────────────────────────────────────────────────────────────────────────

/** Pick a deterministic element from a list using a hash of `key`. */
export function pickStable<T>(key: string, items: readonly T[]): T {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return items[Math.abs(h) % items.length]
}
