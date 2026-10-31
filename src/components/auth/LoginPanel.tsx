import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { ArrowRight, KeyRound, Phone, UserRound, Users2 } from "lucide-react"
import type { Role } from "@/lib/types"
import { isValidIndianMobile, normalizePhone } from "@/lib/format"
import { useDb } from "@/data/store"
import { DEMO_CUSTOMER } from "@/data/seed"
import { ROLE_DESCRIPTION, ROLE_LABEL, homeFor } from "@/app/navigation"
import { signInAsRole, signInCustomer } from "@/app/session"
import { Button } from "@/components/ui/Button"
import { FormField, TextInput } from "@/components/ui/forms"
import { Tabs } from "@/components/ui/data"
import { Callout } from "@/components/ui/feedback"

const DEMO_OTP = "123456"
const STAFF_ROLES: Exclude<Role, "customer">[] = [
  "admin",
  "sales",
  "surveyor",
  "inventory",
  "installer",
  "service",
]

export function LoginPanel({
  initialTab = "customer",
  next,
  onDone,
}: {
  initialTab?: "customer" | "team"
  next?: string | null
  onDone?: () => void
}) {
  const db = useDb()
  const navigate = useNavigate()
  const [tab, setTab] = useState<"customer" | "team">(initialTab)
  const [phone, setPhone] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [role, setRole] = useState<Exclude<Role, "customer">>("admin")

  const finish = (to: string) => {
    onDone?.()
    navigate(to)
  }
  const sendOtp = async () => {
    setError(null)
    if (!isValidIndianMobile(phone))
      return setError("Enter a valid 10-digit Indian mobile number.")
    setBusy(true)
    await new Promise((r) => setTimeout(r, 450))
    setBusy(false)
    setOtpSent(true)
  }
  const verify = async () => {
    setError(null)
    if (otp.trim() !== DEMO_OTP)
      return setError("Incorrect code. In demo mode the code is 123456.")
    setBusy(true)
    await new Promise((r) => setTimeout(r, 350))
    const c = signInCustomer(phone)
    setBusy(false)
    if (!c)
      return setError(
        "No SunFlow 360 account is linked to this number yet. Submit an enquiry first.",
      )
    finish(next && next.startsWith("/portal") ? next : "/portal")
  }
  const demoCustomers = [
    db.customers.find((c) => c.phone === DEMO_CUSTOMER.phone),
    db.customers.find((c) => c.name === "Priya Deshmukh"),
    db.customers.find((c) => c.name === "Deepak Shinde"),
  ].filter(Boolean)

  return (
    <div>
      <Tabs
        value={tab}
        onChange={(t) => {
          setTab(t)
          setError(null)
        }}
        tabs={[
          { id: "customer", label: "Customer" },
          { id: "team", label: "SunFlow team" },
        ]}
      />
      {tab === "customer" ? (
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (otpSent) verify()
            else sendOtp()
          }}
        >
          <FormField
            label="Registered mobile number"
            required
            error={!otpSent ? (error ?? undefined) : undefined}
          >
            <TextInput
              prefix="+91"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              disabled={otpSent}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
            />
          </FormField>
          {otpSent && (
            <FormField
              label="One-time password"
              required
              hint="Demo mode: use 123456. A real OTP is sent by the backend."
              error={error ?? undefined}
            >
              <TextInput
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code"
                data-autofocus
              />
            </FormField>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="dark"
              loading={busy}
              className="flex-1"
              icon={
                otpSent ? (
                  <KeyRound className="h-4 w-4" />
                ) : (
                  <Phone className="h-4 w-4" />
                )
              }
            >
              {otpSent ? "Verify & sign in" : "Send OTP"}
            </Button>
            {otpSent && (
              <Button
                variant="ghost"
                onClick={() => (setOtpSent(false), setOtp(""), setError(null))}
              >
                Change number
              </Button>
            )}
          </div>
          {error?.startsWith("No SunFlow") && (
            <Callout
              tone="warning"
              action={
                <Link
                  to="/enquiry"
                  onClick={onDone}
                  className="text-[13px] font-medium underline"
                >
                  Enquire
                </Link>
              }
            >
              No account found for {normalizePhone(phone)}.
            </Callout>
          )}
          {demoCustomers.length > 0 && (
            <div className="rounded-2xl bg-forest/[0.04] p-3">
              <p className="mb-2 text-[12px] font-medium text-muted">
                Demo customers (fills the number)
              </p>
              <div className="flex flex-wrap gap-2">
                {demoCustomers.map((c) => (
                  <button
                    key={c!.id}
                    type="button"
                    onClick={() => (
                      setPhone(c!.phone),
                      setOtpSent(true),
                      setOtp(DEMO_OTP),
                      setError(null)
                    )}
                    className="inline-flex items-center gap-1.5 rounded-full border border-forest/12 bg-white px-3 py-1 text-[12.5px] text-ink hover:border-emerald"
                  >
                    <UserRound className="h-3.5 w-3.5 text-botanical" />{" "}
                    {c!.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="text-[13px] text-muted">
            Choose a demonstration role. Real permissions are enforced by the
            backend once connected.
          </p>
          <div
            role="radiogroup"
            aria-label="Role"
            className="grid gap-2 sm:grid-cols-2"
          >
            {STAFF_ROLES.map((r) => {
              const user = db.users.find((u) => u.role === r && u.active)
              const active = role === r
              return (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRole(r)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    active
                      ? "border-emerald bg-emerald/8 shadow-[0_0_0_1px_var(--color-emerald)]"
                      : "border-forest/12 bg-white hover:border-forest/25"
                  }`}
                >
                  <p className="text-sm font-medium text-ink">
                    {ROLE_LABEL[r]}
                  </p>
                  <p className="text-[12px] text-muted">{user?.name}</p>
                  <p className="mt-1 text-[11.5px] leading-snug text-muted">
                    {ROLE_DESCRIPTION[r]}
                  </p>
                </button>
              )
            })}
          </div>
          <Button
            variant="dark"
            className="w-full"
            icon={<Users2 className="h-4 w-4" />}
            onClick={() => {
              signInAsRole(role)
              finish(next && next.startsWith("/app") ? next : homeFor(role))
            }}
          >
            Continue as{" "}
            {db.users.find((u) => u.role === role && u.active)?.name}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
