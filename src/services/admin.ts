import type { Settings, User } from "@/lib/types"
import { normalizePhone } from "@/lib/format"
import { byId } from "@/lib/rules"
import { command, notFound, rule } from "./core"

export function createUser(input: Omit<User, "id" | "active">) {
  return command({ method: "POST", path: "/users", body: input }, (db) => {
    if (!input.name.trim()) rule("NAME_REQUIRED", "Name is required.")
    if (
      db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())
    )
      rule("DUPLICATE_EMAIL", "A user with this email already exists.")
    const id = `U-${String(db.users.length + 1).padStart(2, "0")}`
    db.users.push({
      ...input,
      phone: normalizePhone(input.phone),
      id,
      active: true,
    })
    return id
  })
}

export function updateUser(
  id: string,
  patch: Partial<Pick<User, "role" | "title" | "active" | "phone">>,
) {
  return command(
    { method: "PATCH", path: `/users/${id}`, body: patch },
    (db) => {
      const u = byId(db.users, id) ?? notFound("User")
      if (
        patch.active === false &&
        u.role === "admin" &&
        db.users.filter((x) => x.role === "admin" && x.active).length === 1
      )
        rule("LAST_ADMIN", "At least one active admin is required.")
      Object.assign(u, patch)
    },
  )
}

export function updateSettings(patch: Partial<Settings>) {
  return command({ method: "PATCH", path: "/settings", body: patch }, (db) => {
    for (const [k, v] of Object.entries(patch))
      if (typeof v === "number" && (v < 0 || !Number.isFinite(v)))
        rule("INVALID_VALUE", `${k} must be a positive number.`)
    Object.assign(db.settings, patch)
  })
}

export function markNotificationsRead(ids: string[]) {
  return command(
    { method: "POST", path: "/notifications/read", body: { ids } },
    (db) => {
      db.notifications.forEach((n) => {
        if (ids.includes(n.id)) n.read = true
      })
    },
  )
}
