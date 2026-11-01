import { useSyncExternalStore } from "react"
import type { DemoDB, Session } from "@/lib/types"
import { isDemoMode } from "@/services/apiClient"
import { summarizeLead } from "@/lib/rules"
import { DB_VERSION, buildSeed } from "./seed"

/*
  Client-side record cache shared by every screen. In demo mode it is the
  mock backend's data and persists to localStorage; with a live backend it
  is hydrated from API responses (see services/core.ts).
*/

const DB_KEY = "sunflow360.demo-db"
const SESSION_KEY = "sunflow360.session"

function emptyDb(): DemoDB {
  const seed = buildSeed()
  const keep: (keyof DemoDB)[] = [
    "version",
    "settings",
    "products",
    "suppliers",
    "users",
  ]
  return Object.fromEntries(
    Object.entries(seed).map(([k, v]) => [
      k,
      keep.includes(k as keyof DemoDB)
        ? v
        : Array.isArray(v)
          ? []
          : k === "counters"
            ? {}
            : v,
    ]),
  ) as unknown as DemoDB
}

function loadDb(): DemoDB {
  if (!isDemoMode) return emptyDb()
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(DB_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as DemoDB
        if (parsed.version === DB_VERSION) return parsed
      }
    }
  } catch {
    /* corrupted cache — fall back to a fresh seed */
  }
  return buildSeed()
}

let db: DemoDB = loadDb()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
let storageWarned = false

function persist() {
  if (!isDemoMode) return
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DB_KEY, JSON.stringify(db))
    }
  } catch {
    if (!storageWarned && typeof window !== "undefined") {
      storageWarned = true
      window.dispatchEvent(new CustomEvent("sunflow:storage-full"))
    }
  }
}
persist()

export const getDb = () => db
export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Applies a change atomically. If `fn` throws, nothing is committed. */
export function mutate<T>(fn: (draft: DemoDB) => T): T {
  const draft = structuredClone(db)
  const result = fn(draft)
  db = draft
  persist()
  emit()
  return result
}

export function replaceDb(next: DemoDB) {
  db = next
  persist()
  emit()
}

export function resetDemoData() {
  replaceDb(buildSeed())
}

export const useDb = () => useSyncExternalStore(subscribe, getDb)

/* ---------- Session (demo role selector) ---------- */

let session: Session | null = (() => {
  try {
    if (typeof localStorage !== "undefined") {
      return JSON.parse(
        localStorage.getItem(SESSION_KEY) ?? "null",
      ) as Session | null
    }
    return null
  } catch {
    return null
  }
})()
const sessionListeners = new Set<() => void>()

export const getSession = () => session
export function setSession(next: Session | null) {
  session = next
  if (typeof localStorage !== "undefined") {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else localStorage.removeItem(SESSION_KEY)
  }
  sessionListeners.forEach((l) => l())
}
export const useSession = () =>
  useSyncExternalStore((l) => {
    sessionListeners.add(l)
    return () => {
      sessionListeners.delete(l)
    }
  }, getSession)

/* Keep multiple tabs, windows, and mobile app instances in sync. */
const processedSyncIds = new Set<string>()

function applyMobileSyncItem(draft: DemoDB, payload: any): boolean {
  if (!payload) return false
  const now = new Date().toISOString()
  const phone = String(payload.customerPhone || "9876543210")
    .replace(/\D/g, "")
    .slice(-10)
  const name = payload.customerName || "Mobile App Customer"

  // 1. Customer
  let customer = draft.customers.find(
    (c) => c.phone.replace(/\D/g, "").slice(-10) === phone,
  )
  if (!customer) {
    if (!draft.counters) draft.counters = {}
    const custCount = (draft.counters.CUS || 0) + 1
    draft.counters.CUS = custCount
    customer = {
      id: `CUS-${String(custCount).padStart(3, "0")}`,
      name,
      phone,
      email: payload.customerEmail || undefined,
      language: payload.language || "English",
      contactMethod: "Phone",
      createdAt: now,
    }
    draft.customers.push(customer)
  }

  // 2. Site
  let site = draft.sites.find((s) => s.customerId === customer!.id)
  if (!site) {
    if (!draft.counters) draft.counters = {}
    const siteCount = (draft.counters.SITE || 0) + 1
    draft.counters.SITE = siteCount
    site = {
      id: `SITE-${String(siteCount).padStart(3, "0")}`,
      customerId: customer.id,
      propertyType: payload.propertyType || "Residential",
      address: "",
      city: payload.city || "Pune",
      state: "Maharashtra",
      pin: "",
    }
    draft.sites.push(site)
  }

  // 3. Lead
  let lead = draft.leads.find(
    (l) => l.customerId === customer!.id && !["Won", "Lost"].includes(l.status),
  )
  let updated = false
  if (lead) {
    updated = true
    if (payload.monthlyBill && !lead.monthlyBill)
      lead.monthlyBill = payload.monthlyBill
    if (payload.capacity && !lead.preferredCapacity)
      lead.preferredCapacity = payload.capacity
    if (payload.roofArea && !lead.roofArea) lead.roofArea = payload.roofArea
    if (payload.systemType && !lead.systemType)
      lead.systemType = payload.systemType
    lead.updatedAt = now
  } else {
    if (!draft.counters) draft.counters = {}
    const leadCount = (draft.counters.LD || 0) + 1
    draft.counters.LD = leadCount
    lead = {
      id: `LD-${String(leadCount).padStart(3, "0")}`,
      customerId: customer.id,
      siteId: site.id,
      source: "AI Assistant",
      status: "New",
      monthlyBill: payload.monthlyBill,
      roofArea: payload.roofArea,
      preferredCapacity: payload.capacity || payload.capacityKw,
      systemType: payload.systemType || "On-Grid",
      createdAt: now,
      updatedAt: now,
      notes: [],
    }
    draft.leads.unshift(lead)
  }

  const durationSecs = payload.callDurationSeconds || 0
  const mins = Math.floor(durationSecs / 60)
  const secs = durationSecs % 60
  const aiSum = summarizeLead(lead, customer, site)
  aiSum.summary =
    payload.summary ||
    `📱 Mobile AI Consultation (${mins}m ${secs}s) in ${payload.language || "English"}. Customer ${customer.name} from ${site.city}${lead.preferredCapacity ? `, interested in ${lead.preferredCapacity}kW ${lead.systemType || "On-Grid"}` : ""}${lead.monthlyBill ? `. Monthly bill: ₹${lead.monthlyBill.toLocaleString("en-IN")}` : ""}.`
  lead.aiSummary = aiSum

  // 4. Conversation
  const convId =
    payload.conversationId ||
    `CONV-MOB-${Date.now().toString(36).toUpperCase()}`
  const existingConv = draft.conversations.find((c) => c.id === convId)
  const convMessages = (payload.messages || []).map((m: any, idx: number) => ({
    id: m.id || `${convId}-m${idx}`,
    from: m.role === "agent" ? ("assistant" as const) : ("customer" as const),
    text: m.text || "",
    at: m.time || now,
    authorName: m.role === "agent" ? "SunFlow AI (Mobile)" : customer!.name,
  }))

  if (existingConv) {
    if (convMessages.length) existingConv.messages = convMessages
    existingConv.status = payload.status || "Completed"
    existingConv.updatedAt = now
  } else if (convMessages.length > 0 || payload.conversationId) {
    draft.conversations.unshift({
      id: convId,
      channel: "Phone",
      customerId: customer.id,
      leadId: lead.id,
      language: payload.language || "English",
      status: payload.status || "Completed",
      collected: {
        name: customer.name,
        phone: customer.phone,
        city: payload.city || "Pune",
        propertyType: payload.propertyType || "Residential",
        monthlyBill: payload.monthlyBill,
        roofArea: payload.roofArea,
        capacity: payload.capacity,
        systemType: payload.systemType || "On-Grid",
      },
      messages: convMessages,
      startedAt: now,
      updatedAt: now,
    })
  }

  // 5. Activity
  draft.activities.unshift({
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    entityType: "lead",
    entityId: lead.id,
    customerId: customer.id,
    text: updated
      ? `Mobile AI conversation updated lead details`
      : `New lead generated via Mobile AI Assistant (${customer.name})`,
    actor: "Mobile AI Assistant",
    at: now,
  })

  // 6. Notification
  draft.notifications.unshift({
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: updated ? "📱 Lead updated from Mobile AI" : "📱 New Lead from Mobile AI",
    body: `${customer.name} · ${payload.city || "Pune"}${payload.capacity ? ` · ${payload.capacity}kW` : ""}`,
    link: `/app/leads/${lead.id}`,
    roles: ["admin", "sales"],
    at: now,
    read: false,
  })

  return true
}

export function ingestMobileSync(payload: any) {
  mutate((draft) => {
    applyMobileSyncItem(draft, payload)
  })
}

if (typeof window !== "undefined") {
  // 1. Same-origin cross-window sync
  window.addEventListener("storage", (e) => {
    if (e.key === DB_KEY && e.newValue) {
      try {
        db = JSON.parse(e.newValue)
        emit()
      } catch {
        /* ignore */
      }
    }
  })

  // 2. BroadcastChannel cross-tab and cross-context sync
  try {
    const channel = new BroadcastChannel("sunflow_channel")
    channel.onmessage = (event) => {
      if (event.data?.type === "DB_UPDATE" && event.data?.db) {
        db = event.data.db
        persist()
        emit()
      } else if (event.data?.type === "MOBILE_PAYLOAD" && event.data?.payload) {
        ingestMobileSync(event.data.payload)
      } else if (event.data?.type === "RELOAD_DB") {
        db = loadDb()
        emit()
      }
    }
  } catch {
    /* BroadcastChannel not supported in all environments */
  }

  // 3. Periodic server sync for cross-port / mobile phone ingestion
  const pollServerSync = async () => {
    try {
      const res = await fetch("/api/mobile/sync")
      if (res.ok) {
        const items = await res.json()
        if (Array.isArray(items) && items.length > 0) {
          let hasChanges = false
          mutate((draft) => {
            for (const item of items) {
              if (item.id && !processedSyncIds.has(item.id)) {
                processedSyncIds.add(item.id)
                const changed = applyMobileSyncItem(draft, item.payload)
                if (changed) hasChanges = true
              }
            }
          })
        }
      }
    } catch {
      /* ignore offline */
    }
  }

  // Initial poll and recurring poll
  pollServerSync()
  setInterval(pollServerSync, 2500)
}

