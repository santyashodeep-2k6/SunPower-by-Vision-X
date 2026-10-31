import type { AppNotification, DemoDB, Role } from "@/lib/types"
import { uid } from "@/lib/format"
import { getDb, getSession, mutate, replaceDb } from "@/data/store"
import { ApiError, apiRequest, isDemoMode, type HttpMethod } from "./apiClient"

export interface Endpoint {
  method: HttpMethod
  path: string
  body?: unknown
}

const demoLatency = (ms = 320) => new Promise((r) => setTimeout(r, ms))

/**
 * Runs a write operation. Demo mode: validates business rules and mutates the
 * demo store (atomic — a thrown ApiError leaves data untouched). Live mode:
 * calls the backend endpoint and refreshes the record cache from the server.
 */
export async function command<T>(
  endpoint: Endpoint,
  mock: (db: DemoDB) => T,
): Promise<T> {
  if (isDemoMode) {
    await demoLatency()
    return mutate(mock)
  }
  const result = await apiRequest<T>(
    endpoint.method,
    endpoint.path,
    endpoint.body,
  )
  await hydrate()
  return result
}

/** Read-only lookup that the backend should own when available. */
export async function query<T>(
  endpoint: Endpoint,
  mock: (db: DemoDB) => T,
): Promise<T> {
  if (isDemoMode) {
    await demoLatency(220)
    return mock(getDb())
  }
  return apiRequest<T>(endpoint.method, endpoint.path, endpoint.body)
}

export function rule(code: string, message: string): never {
  throw new ApiError(422, code, message)
}

export function notFound(what: string): never {
  throw new ApiError(404, "NOT_FOUND", `${what} could not be found.`)
}

/** Collections fetched to populate the client cache when a backend is connected. */
export const COLLECTION_ENDPOINTS: Partial<Record<keyof DemoDB, string>> = {
  users: "/users",
  customers: "/customers",
  sites: "/sites",
  leads: "/leads",
  conversations: "/conversations",
  surveys: "/surveys",
  quotations: "/quotations",
  salesOrders: "/sales-orders",
  payments: "/payments",
  products: "/products",
  units: "/inventory/units",
  reservations: "/inventory/reservations",
  movements: "/inventory/movements",
  suppliers: "/suppliers",
  purchaseOrders: "/purchase-orders",
  dispatches: "/dispatches",
  installations: "/installations",
  warranties: "/warranties",
  serviceTickets: "/service-tickets",
  replacements: "/replacements",
  subsidies: "/subsidies",
  activities: "/activities",
  notifications: "/notifications",
}

export async function hydrate() {
  if (isDemoMode) return
  const entries = await Promise.all(
    Object.entries(COLLECTION_ENDPOINTS).map(
      async ([key, path]) => {
        try {
          const res = await apiRequest<any>("GET", path!)
          const list = Array.isArray(res)
            ? res
            : res?.content && Array.isArray(res.content)
            ? res.content
            : []
          return [key, list] as const
        } catch (err) {
          console.warn(`[Hydrate] Could not hydrate collection ${key} from ${path}`, err)
          return [key, (getDb() as any)[key] ?? []] as const
        }
      },
    ),
  )
  replaceDb({ ...getDb(), ...Object.fromEntries(entries) })
}

export function actorName(db: DemoDB) {
  const s = getSession()
  if (s?.role === "customer")
    return db.customers.find((c) => c.id === s.customerId)?.name ?? "Customer"
  return db.users.find((u) => u.id === s?.userId)?.name ?? "System"
}

export function logActivity(
  db: DemoDB,
  entityType: DemoDB["activities"][number]["entityType"],
  entityId: string,
  customerId: string | undefined,
  text: string,
) {
  db.activities.unshift({
    id: uid(),
    entityType,
    entityId,
    customerId,
    text,
    actor: actorName(db),
    at: new Date().toISOString(),
  })
}

export function notify(
  db: DemoDB,
  n: { title: string; body: string; link: string; roles: Role[] },
) {
  const item: AppNotification = {
    id: uid(),
    at: new Date().toISOString(),
    read: false,
    ...n,
  }
  db.notifications.unshift(item)
}

export const nowIso = () => new Date().toISOString()
