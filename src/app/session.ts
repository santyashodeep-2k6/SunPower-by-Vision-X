import type { Role } from "@/lib/types"
import { getDb, setSession } from "@/data/store"
import { normalizePhone } from "@/lib/format"
import { DEMO_CUSTOMER } from "@/data/seed"

/** Demo-only role selector. Real permissions must be enforced by the backend. */
export function signInAsRole(role: Exclude<Role, "customer">, userId?: string) {
  const db = getDb()
  const user =
    db.users.find((u) => u.id === userId) ??
    db.users.find((u) => u.role === role && u.active)
  setSession({ role, userId: user?.id })
  return user
}

export function signInCustomer(phone: string) {
  const db = getDb()
  const c = db.customers.find(
    (x) => normalizePhone(x.phone) === normalizePhone(phone),
  )
  if (!c) return null
  setSession({ role: "customer", customerId: c.id })
  return c
}

/** Picks the most useful customer for a portal preview (journey customer first). */
export function defaultPortalCustomer() {
  const db = getDb()
  return (
    db.customers.find((c) => c.phone === DEMO_CUSTOMER.phone) ??
    db.customers.find((c) => c.name === "Priya Deshmukh") ??
    db.customers[0]
  )
}

export const signOut = () => setSession(null)
