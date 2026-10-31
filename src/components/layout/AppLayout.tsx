import { useEffect, useMemo, useRef, useState } from "react"
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router"
import {
  Bell,
  ChevronDown,
  ExternalLink,
  Globe,
  LogOut,
  Menu,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  UserRound,
  Users2,
  X,
} from "lucide-react"
import type { Role } from "@/lib/types"
import { useDb, useSession } from "@/data/store"
import {
  NAV_ITEMS,
  ROLE_LABEL,
  SEGMENT_LABEL,
  canAccess,
  homeFor,
} from "@/app/navigation"
import { defaultPortalCustomer, signInAsRole, signOut } from "@/app/session"
import { setSession } from "@/data/store"
import { stockOf } from "@/lib/rules"
import { relative } from "@/lib/format"
import { markNotificationsRead } from "@/services/admin"
import { isDemoMode } from "@/services/apiClient"
import { Logo } from "@/components/Logo"
import { Avatar, DemoBadge, EmptyState } from "@/components/ui/feedback"
import { DropdownMenu } from "@/components/ui/overlays"
import { ButtonLink } from "@/components/ui/Button"
import { Breadcrumb } from "./PageHeader"

const SIDEBAR_W = "lg:w-[268px]"

function useNavCounts() {
  const db = useDb()
  return useMemo(
    () =>
      ({
        "/app/leads": db.leads.filter((l) => l.status === "New").length,
        "/app/conversations": db.conversations.filter(
          (c) => c.status === "Needs Human",
        ).length,
        "/app/surveys": db.surveys.filter(
          (s) => s.status === "Pending Approval",
        ).length,
        "/app/orders": db.salesOrders.filter((s) =>
          ["Confirmed", "Awaiting Stock"].includes(s.status),
        ).length,
        "/app/inventory": db.products.filter((p) => stockOf(db, p.id).low)
          .length,
        "/app/dispatches": db.dispatches.filter((d) => d.status !== "Delivered")
          .length,
        "/app/service-tickets": db.serviceTickets.filter(
          (t) => t.status !== "Closed",
        ).length,
      }) as Record<string, number>,
    [db],
  )
}

function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const counts = useNavCounts()
  const items = NAV_ITEMS.filter((n) => n.roles.includes(role))
  const groups = [...new Set(items.map((i) => i.group))]
  return (
    <div className="glass-sidebar flex h-full flex-col text-white">
      <div className="flex h-16 items-center px-5">
        <Logo to="/" onClick={onNavigate} />
      </div>
      <nav
        aria-label="Workspace"
        className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4"
      >
        {groups.map((g) => (
          <div key={g} className="mt-4 first:mt-1">
            <p className="px-3 pb-1.5 text-[11px] font-medium tracking-[0.14em] text-white/40 uppercase">
              {g}
            </p>
            <ul className="space-y-0.5">
              {items
                .filter((i) => i.group === g)
                .map((i) => (
                  <li key={i.to}>
                    <NavLink
                      to={i.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition-all duration-200 ${
                          isActive
                            ? "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]"
                            : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sunshine transition-all duration-300 ${
                              isActive ? "opacity-100" : "opacity-0"
                            }`}
                            aria-hidden="true"
                          />
                          <i.icon
                            className={`h-[18px] w-[18px] shrink-0 ${
                              isActive
                                ? "text-sunshine"
                                : "text-white/60 group-hover:text-white/90"
                            }`}
                            strokeWidth={1.8}
                          />
                          <span className="flex-1 truncate">{i.label}</span>
                          {!!counts[i.to] && (
                            <span
                              className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                                isActive
                                  ? "bg-sunshine text-forest"
                                  : "bg-white/12 text-white/85"
                              }`}
                            >
                              {counts[i.to]}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        {isDemoMode && (
          <div className="mb-2 rounded-2xl bg-white/[0.06] p-3 text-[12px] leading-snug text-white/70">
            <p className="mb-0.5 font-medium text-sunshine">Demo mode</p>
            Mock services and sample data. Connect{" "}
            <code className="text-white/90">VITE_SUNFLOW_API_URL</code> for the
            live backend.
          </div>
        )}
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          <Globe className="h-4 w-4" />
          Public website
        </Link>
      </div>
    </div>
  )
}

function useBreadcrumb() {
  const { pathname } = useLocation()
  const parts = pathname.split("/").filter(Boolean)
  return parts
    .slice(1)
    .map((p, i) => ({
      label: SEGMENT_LABEL[p] ?? decodeURIComponent(p),
      to: "/" + parts.slice(0, i + 2).join("/"),
    }))
}

function GlobalSearch({ role }: { role: Role }) {
  const db = useDb()
  const navigate = useNavigate()
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    const onDown = (e: MouseEvent) =>
      !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onDown)
    }
  }, [])
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    const out: { label: string; sub: string; to: string; kind: string }[] = []
    for (const l of db.leads) {
      const c = db.customers.find((x) => x.id === l.customerId)
      if (`${l.id} ${c?.name} ${c?.phone}`.toLowerCase().includes(s))
        out.push({
          kind: "Lead",
          label: c?.name ?? l.id,
          sub: `${l.id} · ${l.status}`,
          to: `/app/leads/${l.id}`,
        })
    }
    for (const i of db.installations) {
      const c = db.customers.find((x) => x.id === i.customerId)
      if (`${i.reference} ${i.id} ${c?.name}`.toLowerCase().includes(s))
        out.push({
          kind: "Installation",
          label: i.reference,
          sub: `${c?.name} · ${i.capacity} kW ${i.systemType}`,
          to: `/app/installations/${i.id}`,
        })
    }
    for (const u of db.units)
      if (u.serial.toLowerCase().includes(s))
        out.push({
          kind: "Serial",
          label: u.serial,
          sub: `${db.products.find((p) => p.id === u.productId)?.name} · ${u.status}`,
          to: u.installationId
            ? `/app/installations/${u.installationId}`
            : `/app/inventory?tab=serials&q=${u.serial}`,
        })
    for (const t of db.serviceTickets)
      if (`${t.id} ${t.issue}`.toLowerCase().includes(s))
        out.push({
          kind: "Ticket",
          label: t.id,
          sub: t.issue,
          to: `/app/service-tickets/${t.id}`,
        })
    for (const qt of db.quotations)
      if (qt.id.toLowerCase().includes(s))
        out.push({
          kind: "Quotation",
          label: qt.id,
          sub: `${qt.capacity} kW ${qt.systemType} · ${qt.status}`,
          to: `/app/quotations/${qt.id}`,
        })
    for (const so of db.salesOrders)
      if (so.id.toLowerCase().includes(s))
        out.push({
          kind: "Order",
          label: so.id,
          sub: so.status,
          to: `/app/orders/${so.id}`,
        })
    return out.filter((r) => canAccess(role, r.to.split("?")[0])).slice(0, 8)
  }, [q, db, role])
  return (
    <div ref={ref} className="relative hidden w-full max-w-xs md:block">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search customers, serials, references…"
        aria-label="Global search"
        className="h-10 w-full rounded-full border border-forest/10 bg-white/80 pr-10 pl-10 text-[13px] text-ink placeholder:text-muted focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/15 focus:outline-none"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-forest/12 px-1.5 text-[11px] text-muted">
        /
      </kbd>
      {open && q.trim().length >= 2 && (
        <div className="glass glass-modal anim-pop absolute top-[calc(100%+8px)] right-0 left-0 z-[60] overflow-hidden rounded-2xl p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">
              No results for “{q}”.
            </p>
          ) : (
            results.map((r) => (
              <button
                key={`${r.kind}-${r.to}-${r.label}`}
                type="button"
                onClick={() => {
                  navigate(r.to)
                  setOpen(false)
                  setQ("")
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-forest/6"
              >
                <span className="w-20 shrink-0 text-[11px] font-medium tracking-wide text-muted uppercase">
                  {r.kind}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {r.label}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    {r.sub}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function NotificationPanel({ role }: { role: Role }) {
  const db = useDb()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const items = db.notifications
    .filter((n) => n.roles.includes(role))
    .slice(0, 20)
  const unread = items.filter((n) => !n.read)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) =>
      !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Notifications, ${unread.length} unread`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink/75 transition-colors hover:bg-forest/6 hover:text-ink"
      >
        <Bell className="h-[19px] w-[19px]" />
        {unread.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sunshine px-1 text-[10px] font-bold text-forest ring-2 ring-white">
            {unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="glass glass-modal anim-pop absolute top-[calc(100%+8px)] right-0 z-[60] w-[min(92vw,380px)] overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-forest/8 px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <button
              type="button"
              disabled={!unread.length}
              onClick={() => markNotificationsRead(unread.map((n) => n.id))}
              className="text-[12px] font-medium text-botanical hover:underline disabled:text-muted disabled:no-underline"
            >
              Mark all as read
            </button>
          </div>
          <ul className="scrollbar-thin max-h-[60vh] overflow-y-auto p-1.5">
            {items.length === 0 && (
              <EmptyState compact title="You're all caught up" />
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    markNotificationsRead([n.id])
                    setOpen(false)
                    navigate(n.link)
                  }}
                  className="flex w-full gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-forest/5"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.read
                        ? "bg-transparent"
                        : "bg-sunshine shadow-[0_0_6px_rgb(244_197_66/0.8)]"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">
                      {n.title}
                    </span>
                    <span className="block text-[12.5px] text-muted">
                      {n.body}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted/80">
                      {relative(n.at)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function ProfileMenu() {
  const db = useDb()
  const session = useSession()
  const navigate = useNavigate()
  if (!session) return null
  const user = db.users.find((u) => u.id === session.userId)
  const customer = db.customers.find((c) => c.id === session.customerId)
  const name = user?.name ?? customer?.name ?? "Guest"
  const switchTo = (role: Role) => {
    if (role === "customer") {
      const c = defaultPortalCustomer()
      setSession({ role: "customer", customerId: c.id })
    } else signInAsRole(role)
    navigate(homeFor(role))
  }
  const roles: Role[] = [
    "admin",
    "sales",
    "surveyor",
    "inventory",
    "installer",
    "service",
    "customer",
  ]
  return (
    <DropdownMenu
      width="w-72"
      header={
        <div className="mb-1 border-b border-forest/8 px-3 pt-2 pb-3">
          <p className="text-sm font-semibold text-ink">{name}</p>
          <p className="text-[12px] text-muted">
            {user?.title ?? "Customer"} · {ROLE_LABEL[session.role]}
          </p>
          <p className="mt-2 text-[11px] font-medium tracking-[0.12em] text-muted uppercase">
            Switch demo role
          </p>
        </div>
      }
      items={[
        ...roles.map((r) => ({
          label: `${ROLE_LABEL[r]}${r === session.role ? " (current)" : ""}`,
          icon:
            r === "customer" ? (
              <UserRound className="h-4 w-4" />
            ) : (
              <Users2 className="h-4 w-4" />
            ),
          onSelect: () => switchTo(r),
          disabled: r === session.role,
        })),
        ...(session.role !== "customer"
          ? [
              {
                label: "Settings",
                icon: <SettingsIcon className="h-4 w-4" />,
                onSelect: () => navigate("/app/settings"),
              },
            ]
          : []),
        {
          label: "Public website",
          icon: <ExternalLink className="h-4 w-4" />,
          onSelect: () => navigate("/"),
        },
        {
          label: "Sign out",
          icon: <LogOut className="h-4 w-4" />,
          danger: true,
          onSelect: () => (signOut(), navigate("/")),
        },
      ]}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-forest/6"
        >
          <Avatar
            name={name}
            size="sm"
            tone={session.role === "customer" ? "gold" : "forest"}
          />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-[13px] font-medium text-ink">
              {name}
            </span>
            <span className="block text-[11px] text-muted">
              {ROLE_LABEL[session.role]}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted" />
        </button>
      )}
    />
  )
}

function NoAccess({ role }: { role: Role }) {
  return (
    <div className="surface mx-auto mt-10 max-w-lg p-8">
      <EmptyState
        icon={<ShieldAlert className="h-5 w-5" />}
        title="This module isn't available for your role"
        description={`The ${ROLE_LABEL[role]} role does not include this screen. Switch role from the profile menu, or go to your home screen. (Final permissions are enforced by the backend.)`}
        action={
          <ButtonLink to={homeFor(role)} variant="dark" size="sm">
            Go to my workspace
          </ButtonLink>
        }
      />
    </div>
  )
}

export function AppLayout() {
  const session = useSession()
  const location = useLocation()
  const crumbs = useBreadcrumb()
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => setMobileOpen(false), [location.pathname])
  if (!session)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  if (session.role === "customer") return <Navigate to="/portal" replace />
  const allowed = canAccess(session.role, location.pathname)
  return (
    <div className="app-canvas min-h-svh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden ${SIDEBAR_W} lg:block`}
      >
        <Sidebar role={session.role} />
      </aside>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[70] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div
            className="anim-overlay absolute inset-0 bg-[#0B2A1F]/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="anim-drawer-left absolute inset-y-0 left-0 w-[84%] max-w-[300px] shadow-2xl">
            <Sidebar
              role={session.role}
              onNavigate={() => setMobileOpen(false)}
            />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute top-3.5 right-3 flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/65 backdrop-blur-[22px] backdrop-saturate-150">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-forest/6 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <Breadcrumb items={crumbs} />
            </div>
            <GlobalSearch role={session.role} />
            <DemoBadge className="hidden sm:inline-flex" />
            <NotificationPanel role={session.role} />
            <ProfileMenu />
          </div>
        </header>
        <main
          id="main"
          className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {allowed ? <Outlet /> : <NoAccess role={session.role} />}
        </main>
      </div>
    </div>
  )
}
