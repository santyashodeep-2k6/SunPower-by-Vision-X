import { Link } from "react-router"
import {
  ArrowRight,
  BadgeCheck,
  Cpu,
  FileCheck2,
  MapPin,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Wrench,
} from "lucide-react"
import { Drawer } from "@/components/ui/overlays"
import { buttonClass } from "@/components/ui/Button"

export type FeatureKey = "smart" | "care" | "journey"

const CONTENT: Record<FeatureKey, {
  title: string
  lead: string
  points: { icon: typeof Cpu; title: string; body: string }[]
  cta: { label: string; to: string }
}> = {
  smart: {
    title: "Smart Solar",
    lead: "Intelligent installation management — every project is sized, quoted and executed from one connected record.",
    points: [
      {
        icon: Cpu,
        title: "Right-sized recommendations",
        body: "Your bill and rooftop area drive a recommended 1–5 kW On-Grid or Off-Grid package.",
      },
      {
        icon: FileCheck2,
        title: "Survey-approved quotations",
        body: "Quotations are generated only after a technical site survey is approved, with a complete bill of materials.",
      },
      {
        icon: ScanLine,
        title: "Serial-tracked equipment",
        body: "Panels, inverters and batteries are scanned at dispatch and verified again on your roof.",
      },
    ],
    cta: { label: "Book your free survey", to: "/enquiry" },
  },
  care: {
    title: "Complete Care",
    lead: "Warranty and long-term service, tied to the exact equipment installed at your site.",
    points: [
      {
        icon: ShieldCheck,
        title: "Warranty on every serial",
        body: "Panel performance (25 years), inverter (5 years) and workmanship (5 years) warranties are recorded per component.",
      },
      {
        icon: Wrench,
        title: "Fast service tickets",
        body: "Raise a complaint against a specific component; we verify coverage before any work begins.",
      },
      {
        icon: BadgeCheck,
        title: "Transparent charges",
        body: "Covered repairs are free. Out-of-warranty work always needs your approval of the estimate first.",
      },
    ],
    cta: { label: "Explore our services", to: "/#services" },
  },
  journey: {
    title: "Transparent Journey",
    lead: "Track every stage of your installation — from enquiry to handover — in your customer portal.",
    points: [
      {
        icon: MapPin,
        title: "Live progress",
        body: "See survey, quotation, payment, dispatch, installation and subsidy status as they happen.",
      },
      {
        icon: Smartphone,
        title: "Documents in one place",
        body: "Quotations, invoices, handover reports and warranty certificates are always available.",
      },
      {
        icon: QrCode,
        title: "Solar Asset Passport",
        body: "A QR-coded passport links your system to its serials, warranties and service history.",
      },
    ],
    cta: {
      label: "Open customer portal",
      to: "/login?tab=customer&next=/portal",
    },
  },
}

export function FeatureDetailDrawer({
  feature,
  onClose,
}: {
  feature: FeatureKey | null
  onClose: () => void
}) {
  const c = feature ? CONTENT[feature] : null
  return (
    <Drawer
      open={!!c}
      onClose={onClose}
      tone="ai"
      title={c?.title ?? ""}
      description={c?.lead}
    >
      {c && (
        <div className="flex flex-1 flex-col">
          <ul className="space-y-3">
            {c.points.map((p) => (
              <li
                key={p.title}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunshine/90 text-forest">
                  <p.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-white">{p.title}</p>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-white/72">
                    {p.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            <Link
              to={c.cta.to}
              onClick={onClose}
              className={buttonClass("primary", "lg", "w-full")}
            >
              {c.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </Drawer>
  )
}
