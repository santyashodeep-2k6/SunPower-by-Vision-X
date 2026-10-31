import type { DemoDB, Product } from "@/lib/types"

/** Sequential, human-readable IDs shared by every module (e.g. LD-0042). */
export function nextId(db: DemoDB, prefix: string, pad = 4) {
  db.counters[prefix] = (db.counters[prefix] ?? 0) + 1
  return `${prefix}-${String(db.counters[prefix]).padStart(pad, "0")}`
}

/** Installation / asset passport reference, e.g. SOL-2026-0001. */
export function nextInstallationRef(db: DemoDB, at: string) {
  const year = new Date(at).getFullYear()
  return nextId(db, `SOL-${year}`)
}

export function nextSerial(db: DemoDB, product: Product) {
  const key = `SER-${product.serialPrefix}`
  db.counters[key] = (db.counters[key] ?? 100000) + 1
  return `${product.serialPrefix}-${db.counters[key]}`
}
