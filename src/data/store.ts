import { useSyncExternalStore } from "react"
import type { DemoDB, Session } from "@/lib/types"
import { isDemoMode } from "@/services/apiClient"
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
  const keep: keyof DemoDB[] = ["version", "settings", "products", "suppliers"]
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

/* Keep multiple tabs (e.g. staff app + customer portal) in sync. */
if (typeof window !== "undefined") {
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
}
