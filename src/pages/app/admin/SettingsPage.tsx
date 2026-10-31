import { useState } from "react"
import { useNavigate } from "react-router"
import { Database, RotateCcw, Server } from "lucide-react"
import type { Role, Settings } from "@/lib/types"
import { useDb, useSession, resetDemoData, setSession } from "@/data/store"
import { updateSettings } from "@/services/admin"
import { API_BASE_URL, isDemoMode } from "@/services/apiClient"
import { COLLECTION_ENDPOINTS } from "@/services/core"
import { ROLE_DESCRIPTION, ROLE_LABEL, homeFor } from "@/app/navigation"
import { defaultPortalCustomer, signInAsRole } from "@/app/session"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { Callout, StatusBadge } from "@/components/ui/feedback"
import { Panel } from "@/components/ui/data"
import { FormField, TextInput } from "@/components/ui/forms"
import { ConfirmationDialog, useToast } from "@/components/ui/overlays"
import { JourneyGuide } from "@/components/special/JourneyGuide"

const FIELDS: [keyof Settings, string][] = [
  ["labourPerKw", "Installation labour per kW (₹)"],
  ["netMeteringFee", "Net-metering & documentation (₹)"],
  ["transportFee", "Transport (₹)"],
  ["equipmentTaxPct", "GST on equipment (%)"],
  ["serviceTaxPct", "GST on services (%)"],
  ["advancePct", "Advance (%)"],
  ["quoteValidityDays", "Quotation validity (days)"],
  ["technicianHourlyCost", "Technician cost per hour (₹)"],
]

export default function SettingsPage() {
  const db = useDb()
  const session = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const { run, pending } = useAction()
  const [form, setForm] = useState(
    () =>
      Object.fromEntries(
        FIELDS.map(([k]) => [k, String(db.settings[k])]),
      ) as Record<keyof Settings, string>,
  )
  const [reset, setReset] = useState(false)
  const isAdmin = session?.role === "admin"
  const switchRole = (r: Role) => {
    if (r === "customer")
      setSession({ role: "customer", customerId: defaultPortalCustomer().id })
    else signInAsRole(r)
    navigate(homeFor(r))
  }
  return (
    <>
      <PageHeader
        eyebrow="Management"
        title="Settings"
        description="Demo controls, sample commercial rates and backend integration status."
      />
      <div className="space-y-6">
        <JourneyGuide db={db} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="Backend connection"
            actions={
              <StatusBadge tone={isDemoMode ? "gold" : "success"}>
                {isDemoMode ? "Demo mode" : "Connected"}
              </StatusBadge>
            }
          >
            {isDemoMode ? (
              <Callout tone="warning" title="Mock services active">
                No backend URL is configured, so every service runs against
                labelled demo data stored in this browser. Set{" "}
                <code>VITE_SUNFLOW_API_URL</code> to route the same service
                calls to the backend.
              </Callout>
            ) : (
              <Callout tone="success" title="Live backend">
                Requests go to <code>{API_BASE_URL}</code>.
              </Callout>
            )}
            <p className="mt-4 mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <Server className="h-4 w-4" /> Collections loaded on sign-in
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[12px] text-muted">
              {Object.entries(COLLECTION_ENDPOINTS).map(([k, v]) => (
                <li key={k}>GET {v}</li>
              ))}
            </ul>
          </Panel>
          <Panel
            title="Demo role"
            description="Switch the demonstration role. Real permissions are enforced by the backend."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                "admin",
                "sales",
                "surveyor",
                "inventory",
                "installer",
                "service",
                "customer",
              ] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => switchRole(r)}
                  aria-pressed={session?.role === r}
                  className={`rounded-2xl border p-3 text-left transition ${
                    session?.role === r
                      ? "border-emerald bg-emerald/8"
                      : "border-forest/12 hover:border-forest/25"
                  }`}
                >
                  <p className="text-sm font-medium text-ink">
                    {ROLE_LABEL[r]}
                  </p>
                  <p className="text-[12px] text-muted">
                    {ROLE_DESCRIPTION[r]}
                  </p>
                </button>
              ))}
            </div>
          </Panel>
          <Panel
            title="Sample commercial rates"
            description="Used for labelled demo calculations. The finance backend supplies official values."
            actions={
              isAdmin && (
                <Button
                  size="sm"
                  variant="dark"
                  loading={pending === "save"}
                  onClick={() =>
                    run(
                      "save",
                      () =>
                        updateSettings(
                          Object.fromEntries(
                            Object.entries(form).map(([k, v]) => [
                              k,
                              Number(v),
                            ]),
                          ),
                        ),
                      "Settings saved",
                    ).catch(() => undefined)
                  }
                >
                  Save
                </Button>
              )
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(([k, label]) => (
                <FormField key={k} label={label}>
                  <TextInput
                    inputMode="decimal"
                    disabled={!isAdmin}
                    value={form[k]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [k]: e.target.value.replace(/[^\d.]/g, ""),
                      })
                    }
                  />
                </FormField>
              ))}
            </div>
            {!isAdmin && (
              <p className="mt-3 text-[12px] text-muted">
                Only admins can change rates.
              </p>
            )}
          </Panel>
          <Panel
            title="Demo data"
            description="Changes persist in this browser so you can continue the journey later."
          >
            <p className="mb-4 flex items-center gap-2 text-sm text-ink">
              <Database className="h-4 w-4 text-botanical" />{" "}
              {db.customers.length} customers · {db.leads.length} leads ·{" "}
              {db.installations.length} installations · {db.units.length}{" "}
              serials
            </p>
            <Button
              variant="danger"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => setReset(true)}
              disabledReason={
                !isDemoMode && "Not available with a live backend"
              }
            >
              Reset demo data
            </Button>
          </Panel>
        </div>
      </div>
      <ConfirmationDialog
        open={reset}
        onClose={() => setReset(false)}
        tone="danger"
        title="Reset all demo data?"
        description="Every change made in this browser is discarded and the original sample data is restored."
        confirmLabel="Reset"
        onConfirm={() => {
          resetDemoData()
          sessionStorage.removeItem("sunflow360.assistant")
          toast({ tone: "success", title: "Demo data restored" })
        }}
      />
    </>
  )
}
