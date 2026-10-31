export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(n))

export const num = (n: number) => new Intl.NumberFormat("en-IN").format(n)

export const compactInr = (n: number) => {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`
  return inr(n)
}

export const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—"

export const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

export const fmtTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

export function relative(iso?: string) {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const abs = Math.abs(diff)
  const future = diff < 0
  const m = Math.round(abs / 60000)
  let s: string
  if (m < 1) return "just now"
  if (m < 60) s = `${m} min`
  else if (m < 1440) s = `${Math.round(m / 60)} h`
  else if (m < 43200) s = `${Math.round(m / 1440)} d`
  else s = `${Math.round(m / 43200)} mo`
  return future ? `in ${s}` : `${s} ago`
}

export const DAY = 86400000
export const addDays = (iso: string | Date, days: number) =>
  new Date(new Date(iso).getTime() + days * DAY).toISOString()
export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY)

/** Value for <input type="date"> / "datetime-local". */
export const toInputDate = (iso?: string) => (iso ? iso.slice(0, 10) : "")
export const toInputDateTime = (iso?: string) => {
  if (!iso) return ""
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

export const uid = () => Math.random().toString(36).slice(2, 10)

export const isValidIndianMobile = (v: string) =>
  /^(?:\+?91[-\s]?)?[6-9]\d{9}$/.test(v.replace(/\s+/g, ""))
export const normalizePhone = (v: string) => v.replace(/\D/g, "").slice(-10)
export const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
export const isValidPin = (v: string) => /^[1-9]\d{5}$/.test(v.trim())

export function downloadFile(
  filename: string,
  content: string,
  type = "text/plain",
) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function toCsv(rows: Record<string, string | number | undefined>[]) {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  return [
    headers.map(esc).join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n")
}
