import { Navigate, NavLink, Outlet, useLocation } from "react-router"
import { useDb, useSession } from "@/data/store"
import { Logo } from "@/components/Logo"
import { DemoBadge } from "@/components/ui/feedback"
import { ProfileMenu } from "./AppLayout"

const BG =
  "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=2000&q=70"
const TABS = [
  { to: "/portal", label: "Overview", end: true },
  { to: "/portal/installations", label: "Installation" },
  { to: "/portal/documents", label: "Documents & payments" },
  { to: "/portal/assets", label: "Assets & warranty" },
  { to: "/portal/service", label: "Service" },
]

/** Customer-only shell. Staff dashboards are never reachable from here. */
export function PortalLayout() {
  const session = useSession()
  const db = useDb()
  const location = useLocation()
  if (!session || session.role !== "customer" || !session.customerId)
    return (
      <Navigate
        to={`/login?tab=customer&next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    )
  const c = db.customers.find((x) => x.id === session.customerId)
  if (!c) return <Navigate to="/login?tab=customer" replace />
  return (
    <div className="app-canvas min-h-svh">
      <div className="relative isolate overflow-hidden bg-forest pb-28 text-white">
        <img
          src={BG}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full -scale-x-100 object-cover blur-[2px]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(9_34_25/0.8),rgb(9_34_25/0.9)),radial-gradient(50%_60%_at_90%_0%,rgb(244_197_66/0.3),transparent_70%)]"
        />
        <div className="mx-auto max-w-[1200px] px-4 pt-4 sm:px-6">
          <div className="glass glass-nav flex h-16 items-center justify-between gap-3 rounded-full pr-2 pl-5">
            <Logo />
            <div className="flex items-center gap-2">
              <DemoBadge className="hidden sm:inline-flex" />
              <div className="rounded-full bg-white/90">
                <ProfileMenu />
              </div>
            </div>
          </div>
          <div className="mt-10">
            <p className="text-[12px] font-medium tracking-[0.16em] text-sunshine uppercase">
              Customer portal
            </p>
            <h1 className="mt-2 text-[32px] font-medium tracking-[-0.03em] sm:text-[42px]">
              Hello, {c.name.split(" ")[0]}
            </h1>
          </div>
          <nav
            aria-label="Portal"
            className="scrollbar-thin -mx-1 mt-6 flex gap-1 overflow-x-auto px-1 pb-1"
          >
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-white text-forest shadow"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <main className="relative z-10 mx-auto -mt-20 max-w-[1200px] px-4 pb-16 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}

export function usePortalCustomer() {
  const session = useSession()
  const db = useDb()
  const customer = db.customers.find((c) => c.id === session?.customerId)!
  return { db, customer }
}
