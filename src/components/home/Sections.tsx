import { useState } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  BatteryCharging,
  ClipboardCheck,
  FileText,
  HardHat,
  Headset,
  PlugZap,
  ShieldCheck,
  Sun,
  Wrench,
  Zap,
} from "lucide-react"
import type { SystemType } from "@/lib/types"
import { CAPACITIES, estimatedSavings, panelCount } from "@/lib/catalog"
import { inr } from "@/lib/format"
import { scrollToSection } from "@/lib/scroll"
import { useSession } from "@/data/store"
import { buttonClass } from "@/components/ui/Button"
import { Logo } from "@/components/Logo"

const SectionHead = ({
  eyebrow,
  title,
  body,
  dark,
}: {
  eyebrow: string
  title: string
  body?: string
  dark?: boolean
}) => (
  <div className="max-w-2xl">
    <p
      className={`text-[12px] font-medium tracking-[0.18em] uppercase ${
        dark ? "text-sunshine" : "text-botanical"
      }`}
    >
      {eyebrow}
    </p>
    <h2
      className={`mt-3 text-[34px] leading-[1.05] font-medium tracking-[-0.035em] sm:text-[46px] ${
        dark ? "text-white" : "text-ink"
      }`}
    >
      {title}
    </h2>
    {body && (
      <p
        className={`mt-4 text-[16px] leading-relaxed ${
          dark ? "text-white/72" : "text-muted"
        }`}
      >
        {body}
      </p>
    )}
  </div>
)

const IDEAL: Record<number, string> = {
  1: "Bills up to ₹1,500",
  2: "Bills ₹1,500–2,500",
  3: "Bills ₹2,500–3,500",
  4: "Bills ₹3,500–4,500",
  5: "Bills ₹4,500+ · small offices",
}

export function SolutionsSection() {
  const [type, setType] = useState<SystemType>("On-Grid")
  return (
    <section
      id="solutions"
      className="app-canvas relative scroll-mt-4 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHead
            eyebrow="Solar solutions"
            title="Right-sized systems from 1 to 5 kW."
            body="Residential and small-commercial packages, engineered after a free site survey. Choose net-metered On-Grid savings or Off-Grid independence with battery backup."
          />
          <div
            role="tablist"
            aria-label="System type"
            className="glass-light inline-flex self-start rounded-full p-1 md:self-auto"
          >
            {(["On-Grid", "Off-Grid"] as SystemType[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={type === t}
                type="button"
                onClick={() => setType(t)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                  type === t
                    ? "bg-forest text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]"
                    : "text-ink/70 hover:text-ink"
                }`}
              >
                {t === "On-Grid" ? (
                  <PlugZap className="h-4 w-4" />
                ) : (
                  <BatteryCharging className="h-4 w-4" />
                )}
                {t}
              </button>
            ))}
          </div>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CAPACITIES.map((kw) => (
            <li
              key={kw}
              className={`glass-light group flex flex-col p-5 transition-all duration-500 ease-glass hover:-translate-y-1 hover:shadow-[inset_0_1px_0_#fff,0_24px_50px_-24px_rgb(16_61_45/0.45)] ${
                kw === 3 ? "ring-2 ring-sunshine/70" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-sunshine">
                  <Sun className="h-5 w-5" />
                </span>
                {kw === 3 && (
                  <span className="rounded-full bg-sunshine px-2 py-0.5 text-[11px] font-semibold text-forest">
                    Most chosen
                  </span>
                )}
              </div>
              <p className="mt-5 text-[40px] leading-none font-medium tracking-[-0.04em] text-ink">
                {kw}
                <span className="ml-1 text-lg text-muted">kW</span>
              </p>
              <p className="mt-1 text-[13px] text-muted">{type}</p>
              <ul className="mt-5 space-y-1.5 text-[13px] text-ink/80">
                <li>{panelCount(kw)} × 540 Wp panels</li>
                <li>
                  {type === "On-Grid"
                    ? `${kw} kW string inverter`
                    : `${kw} kW hybrid PCU + ${kw * 2} batteries`}
                </li>
                <li>{IDEAL[kw]}</li>
              </ul>
              <p className="mt-5 border-t border-forest/8 pt-4 text-[13px] text-muted">
                Est. savings{" "}
                <span className="font-semibold text-ink">
                  {inr(estimatedSavings(kw))}/mo
                </span>
                <span className="block text-[11px]">
                  Sample estimate · confirmed after survey
                </span>
              </p>
              <Link
                to={`/enquiry?capacity=${kw}&type=${type}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-botanical transition-colors group-hover:text-forest"
              >
                Get this package{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const STEPS = [
  {
    icon: Headset,
    title: "Enquire",
    body: "Website, phone, WhatsApp or our AI assistant — every enquiry lands in one place.",
  },
  {
    icon: ClipboardCheck,
    title: "Free site survey",
    body: "A certified surveyor assesses roof, shading and electrical setup.",
  },
  {
    icon: FileText,
    title: "Survey-backed quotation",
    body: "Generated only after survey approval, with a complete bill of materials.",
  },
  {
    icon: HardHat,
    title: "Installation",
    body: "Serial-verified equipment, a 10-point checklist, tests and photographs.",
  },
  {
    icon: ShieldCheck,
    title: "Handover & warranty",
    body: "Warranties activate per component; your Solar Asset Passport goes live.",
  },
  {
    icon: Wrench,
    title: "Lifetime care",
    body: "Raise service requests against any component and track every visit.",
  },
]

export function HowItWorksSection() {
  const session = useSession()
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-4 overflow-hidden bg-forest py-24 text-white sm:py-32"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(50%_60%_at_100%_0%,rgb(244_197_66/0.18),transparent_60%),radial-gradient(40%_50%_at_0%_100%,rgb(56_184_120/0.18),transparent_60%)]"
      />
      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
        <SectionHead
          dark
          eyebrow="How it works"
          title="One connected journey, from first hello to lifetime care."
          body="The same installation reference follows your project through survey, quotation, dispatch, installation, warranty and service."
        />
        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="glass glass-botanical glass-sheen rounded-[26px] p-6"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-sunshine">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-[13px] text-white/45">
                  0{i + 1}
                </span>
              </div>
              <p className="mt-6 text-[19px] font-medium tracking-[-0.02em]">
                {s.title}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-white/70">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/enquiry" className={buttonClass("gold", "lg")}>
            Start with a free survey <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={
              session?.role === "customer"
                ? "/portal"
                : "/login?tab=customer&next=/portal"
            }
            className={buttonClass("glass", "lg")}
          >
            Track my installation
          </Link>
        </div>
      </div>
    </section>
  )
}

const SERVICES = [
  {
    icon: Zap,
    title: "Rooftop installation",
    body: "On-Grid and Off-Grid systems from 1–5 kW for homes, shops and small offices.",
  },
  {
    icon: ShieldCheck,
    title: "Warranty management",
    body: "Component-level warranty records with expiry reminders and verified claims.",
  },
  {
    icon: Wrench,
    title: "Repairs & replacements",
    body: "Diagnosis, covered repairs, transparent estimates and full replacement history.",
  },
  {
    icon: ClipboardCheck,
    title: "Subsidy assistance",
    body: "Help with applicable scheme documentation and status tracking in your portal.",
  },
]

export function ServicesSection() {
  const session = useSession()
  const serviceLink =
    session?.role === "customer"
      ? "/portal/service"
      : "/login?tab=customer&next=/portal/service"
  return (
    <section id="services" className="app-canvas scroll-mt-4 py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <SectionHead
            eyebrow="Services"
            title="Care that lasts as long as your panels."
            body="Our 15 certified technicians handle installation, maintenance and repairs across Maharashtra — with every visit recorded against your system."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={serviceLink} className={buttonClass("dark", "lg")}>
              Raise a service request
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection("about")}
              className={buttonClass("secondary", "lg")}
            >
              About SunFlow 360
            </button>
          </div>
        </div>
        <div className="relative lg:col-span-7">
          <img
            src="https://images.unsplash.com/photo-1694327672187-74aa0605314d?auto=format&fit=crop&w=1400&q=75"
            alt="Close-up of solar modules in warm evening light"
            className="h-[420px] w-full rounded-[32px] object-cover"
            loading="lazy"
          />
          <ul className="relative -mt-24 grid gap-3 px-3 sm:grid-cols-2 sm:px-6">
            {SERVICES.map((s) => (
              <li key={s.title} className="glass-light p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald/15 text-botanical">
                  <s.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-medium text-ink">{s.title}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">
                  {s.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

const STATS = [
  { value: "40+", label: "Projects every month" },
  { value: "15", label: "Certified technicians" },
  { value: "1–5 kW", label: "Residential & commercial" },
  { value: "25 yr", label: "Panel performance warranty" },
]

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative scroll-mt-4 overflow-hidden bg-[#0E3628] py-24 text-white sm:py-32"
    >
      <img
        src="https://images.unsplash.com/photo-1655300283247-6b1924b1d152?auto=format&fit=crop&w=2000&q=70"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-25"
        loading="lazy"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,#0E3628_25%,rgb(14_54_40/0.6))]"
      />
      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
        <SectionHead
          dark
          eyebrow="About SunFlow 360"
          title="A growing rooftop solar company, built on clean records."
          body="Founded in Pune, SunFlow 360 designs and installs rooftop solar for homes and small businesses across Maharashtra. Our platform connects every enquiry, survey, serial number, installation photograph and warranty — so nothing is lost on paper or in phone galleries."
        />
        <dl className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="glass glass-frosted rounded-[24px] p-6"
            >
              <dt className="text-[13px] text-white/65">{s.label}</dt>
              <dd className="mt-2 text-[34px] font-medium tracking-[-0.03em]">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export function SiteFooter() {
  const link = "text-white/65 transition-colors hover:text-white"
  return (
    <footer className="bg-[#0A291E] text-white">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-white/60">
            AI-powered solar installation and operations, from enquiry to
            lifetime care.
          </p>
        </div>
        <nav aria-label="Explore" className="text-sm">
          <p className="mb-3 font-medium">Explore</p>
          <ul className="space-y-2">
            <li>
              <Link to="/#solutions" className={link}>
                Solutions
              </Link>
            </li>
            <li>
              <Link to="/#how-it-works" className={link}>
                How it works
              </Link>
            </li>
            <li>
              <Link to="/#services" className={link}>
                Services
              </Link>
            </li>
            <li>
              <Link to="/#about" className={link}>
                About
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Get started" className="text-sm">
          <p className="mb-3 font-medium">Get started</p>
          <ul className="space-y-2">
            <li>
              <Link to="/enquiry" className={link}>
                Book a free survey
              </Link>
            </li>
            <li>
              <Link to="/assistant" className={link}>
                Chat with the solar assistant
              </Link>
            </li>
            <li>
              <Link to="/passport" className={link}>
                Look up an asset passport
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Accounts" className="text-sm">
          <p className="mb-3 font-medium">Accounts</p>
          <ul className="space-y-2">
            <li>
              <Link to="/login?tab=customer" className={link}>
                Customer login
              </Link>
            </li>
            <li>
              <Link to="/login?tab=team" className={link}>
                Team sign-in
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-[12px] text-white/45">
        © {new Date().getFullYear()} SunFlow 360 · Demo application with sample
        data
      </div>
    </footer>
  )
}
