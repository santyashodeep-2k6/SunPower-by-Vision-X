import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { ArrowRight, LayoutDashboard, Menu, UserRound, X } from "lucide-react"
import { useSession } from "@/data/store"
import { homeFor } from "@/app/navigation"
import { scrollToSection } from "@/lib/scroll"
import { Modal } from "@/components/ui/overlays"
import { LoginPanel } from "@/components/auth/LoginPanel"
import { Logo } from "./Logo"

const LINKS = ["Home", "Solutions", "How It Works", "Services", "About"]
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-")
const IDS = LINKS.map(slug)

export function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const session = useSession()
  const onHome = pathname === "/"
  const [active, setActive] = useState(onHome ? 0 : -1)
  const [hover, setHover] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false })
  const refs = useRef<(HTMLAnchorElement | null)[]>([])
  const target = hover ?? active

  const measure = useCallback(() => {
    const el = target >= 0 ? refs.current[target] : null
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true })
    else setPill((p) => ({ ...p, ready: false }))
  }, [target])

  useLayoutEffect(measure, [measure])

  useEffect(() => {
    window.addEventListener("resize", measure)
    document.fonts?.ready.then(measure)
    return () => window.removeEventListener("resize", measure)
  }, [measure])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // Scroll spy: highlight the section currently in view on the homepage.
  useEffect(() => {
    if (!onHome) return setActive(-1)
    const els = IDS.map((id) => document.getElementById(id)).filter(
      Boolean,
    ) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(IDS.indexOf(visible.target.id))
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [onHome])

  const go = (i: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    if (onHome) {
      scrollToSection(IDS[i])
      setActive(i)
    } else navigate(i === 0 ? "/" : `/#${IDS[i]}`)
  }

  const portalLink = session
    ? session.role === "customer"
      ? { to: "/portal", label: "My Portal" }
      : { to: homeFor(session.role), label: "Workspace" }
    : null

  return (
    <header className="reveal absolute inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5">
      <nav
        aria-label="Primary"
        className="glass glass-nav relative mx-auto flex h-16 max-w-[1320px] items-center justify-between rounded-full pr-2 pl-5"
      >
        <Logo onClick={() => onHome && scrollToSection("home")} />

        <ul
          className="absolute left-1/2 hidden -translate-x-1/2 items-center lg:flex"
          onMouseLeave={() => setHover(null)}
        >
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-10 -translate-y-1/2 rounded-full bg-white/14 shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-all duration-500 ease-glass"
            style={{
              left: pill.left,
              width: pill.width,
              opacity: pill.ready ? 1 : 0,
            }}
          />
          {LINKS.map((label, i) => (
            <li key={label} className="relative">
              <a
                ref={(el) => {
                  refs.current[i] = el
                }}
                href={i === 0 ? "/" : `/#${slug(label)}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={go(i)}
                aria-current={active === i ? "page" : undefined}
                className={`relative block rounded-full px-4 py-2.5 text-[14px] transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-sunshine/70 ${
                  active === i ? "text-white" : "text-white/72 hover:text-white"
                }`}
              >
                {label}
                <span
                  aria-hidden="true"
                  className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sunshine shadow-[0_0_8px_rgb(244_197_66/0.8)] transition-all duration-500 ${
                    active === i ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  }`}
                />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          {portalLink ? (
            <Link
              to={portalLink.to}
              className="hidden items-center gap-2 rounded-full px-4 py-2.5 text-[14px] text-white/85 transition-colors duration-300 hover:bg-white/10 hover:text-white md:flex"
            >
              <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />
              {portalLink.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              aria-haspopup="dialog"
              className="hidden items-center gap-2 rounded-full px-4 py-2.5 text-[14px] text-white/85 transition-colors duration-300 hover:bg-white/10 hover:text-white md:flex"
            >
              <UserRound className="h-4 w-4" strokeWidth={1.75} />
              Customer Login
            </button>
          )}
          <Link
            to="/enquiry"
            className="group hidden items-center gap-2 rounded-full bg-sunshine py-2.5 pr-3 pl-4.5 text-[14px] font-medium text-forest shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_8px_24px_-8px_rgb(244_197_66/0.7)] transition-all duration-300 hover:bg-[#F7D163] active:scale-[0.97] sm:flex"
          >
            Get a Free Survey
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors hover:bg-white/12 active:scale-95 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          id="mobile-menu"
          className={`glass glass-modal absolute inset-x-0 top-[calc(100%+10px)] origin-top rounded-[28px] p-3 transition-all duration-400 ease-glass lg:hidden ${
            open
              ? "visible translate-y-0 scale-100 opacity-100"
              : "invisible -translate-y-2 scale-[0.98] opacity-0"
          }`}
        >
          <ul className="flex flex-col">
            {LINKS.map((label, i) => (
              <li key={label}>
                <a
                  href={i === 0 ? "/" : `/#${slug(label)}`}
                  onClick={go(i)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-[17px] tracking-[-0.01em] transition-colors ${
                    active === i
                      ? "bg-forest/6 text-ink"
                      : "text-ink/75 hover:bg-forest/5"
                  }`}
                >
                  {label}
                  {active === i && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                  )}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid gap-2 border-t border-forest/8 pt-3 sm:grid-cols-2">
            {portalLink ? (
              <Link
                to={portalLink.to}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full border border-forest/12 bg-white px-4 py-3 text-[15px] text-ink"
              >
                <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />
                {portalLink.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setLoginOpen(true)
                }}
                className="flex items-center justify-center gap-2 rounded-full border border-forest/12 bg-white px-4 py-3 text-[15px] text-ink"
              >
                <UserRound className="h-4 w-4" strokeWidth={1.75} />
                Customer Login
              </button>
            )}
            <Link
              to="/enquiry"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full bg-sunshine px-4 py-3 text-[15px] font-medium text-forest"
            >
              Get a Free Survey
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>
      <Modal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        size="sm"
        title="Sign in to SunFlow 360"
        description="Customers sign in with their mobile number. Team members choose a demo role."
      >
        <LoginPanel onDone={() => setLoginOpen(false)} />
      </Modal>
    </header>
  )
}
