import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { BadgeCheck, Lock, QrCode, SearchX } from "lucide-react"
import { useDb, useSession } from "@/data/store"
import { fmtDate } from "@/lib/format"
import { PublicShell } from "@/components/layout/PublicShell"
import { Button, buttonClass } from "@/components/ui/Button"
import { FormField, TextInput } from "@/components/ui/forms"
import { PassportQR } from "@/components/special/SolarAssetPassport"

/** Public QR landing: confirms authenticity only — no personal or commercial data. */
export default function PassportPublicPage() {
  const { reference } = useParams()
  const db = useDb()
  const session = useSession()
  const navigate = useNavigate()
  const [q, setQ] = useState(reference ?? "")
  const inst = db.installations.find(
    (i) => i.reference.toUpperCase() === (reference ?? "").toUpperCase(),
  )
  const site = inst && db.sites.find((s) => s.id === inst.siteId)
  const ownsIt =
    inst &&
    session?.role === "customer" &&
    session.customerId === inst.customerId
  const staff = session && session.role !== "customer"

  return (
    <PublicShell
      eyebrow="Solar Asset Passport"
      title={
        reference
          ? `Passport ${reference.toUpperCase()}`
          : "Look up a Solar Asset Passport"
      }
      description="Scan the QR label on the inverter or meter box, or enter the reference printed beneath it."
    >
      <div className="surface mx-auto max-w-2xl p-6 sm:p-8">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (q.trim()) navigate(`/passport/${q.trim().toUpperCase()}`)
          }}
        >
          <FormField label="Passport reference" className="flex-1">
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="SOL-2026-0001"
              className="font-mono uppercase"
            />
          </FormField>
          <Button
            type="submit"
            variant="dark"
            icon={<QrCode className="h-4 w-4" />}
          >
            Look up
          </Button>
        </form>
        {reference && !inst && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#C2412D]/6 p-4 text-sm text-[#7D2A1B]">
            <SearchX className="h-5 w-5" /> No SunFlow 360 installation matches
            this reference.
          </div>
        )}
        {inst && (
          <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <PassportQR reference={inst.reference} size={112} />
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-[#17673F]">
                <BadgeCheck className="h-5 w-5" /> Genuine SunFlow 360
                installation
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">System</dt>
                  <dd className="font-medium text-ink">
                    {inst.capacity} kW {inst.systemType}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Region</dt>
                  <dd className="font-medium text-ink">
                    {site?.city}, Maharashtra
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Status</dt>
                  <dd className="font-medium text-ink">
                    {inst.status === "Completed"
                      ? `Commissioned ${fmtDate(inst.completedAt).slice(3)}`
                      : "Installation in progress"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Service line</dt>
                  <dd className="font-medium text-ink">
                    1800-000-360 (sample)
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
        {inst && (
          <div className="mt-6 rounded-2xl bg-forest/[0.04] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <Lock className="h-4 w-4 text-botanical" /> Owner details, serial
              numbers, warranties and service history require sign-in.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ownsIt ? (
                <Link to="/portal/assets" className={buttonClass("dark", "sm")}>
                  Open my full passport
                </Link>
              ) : staff ? (
                <Link
                  to={`/app/passport/${inst.reference}`}
                  className={buttonClass("dark", "sm")}
                >
                  Open employee view
                </Link>
              ) : (
                <>
                  <Link
                    to="/login?tab=customer&next=/portal/assets"
                    className={buttonClass("dark", "sm")}
                  >
                    Customer sign-in
                  </Link>
                  <Link
                    to={`/login?tab=team&next=/app/passport/${inst.reference}`}
                    className={buttonClass("secondary", "sm")}
                  >
                    Employee sign-in
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  )
}
