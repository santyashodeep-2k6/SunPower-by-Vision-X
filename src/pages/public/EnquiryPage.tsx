import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  Home,
  MessageSquareText,
  PlugZap,
  Sparkles,
  Wand2,
} from "lucide-react"
import type { PropertyType, SystemType } from "@/lib/types"
import {
  inr,
  isValidEmail,
  isValidIndianMobile,
  isValidPin,
} from "@/lib/format"
import { DEMO_CUSTOMER } from "@/data/seed"
import {
  checkDuplicateEnquiry,
  submitEnquiry,
  type DuplicateMatch,
} from "@/services/crm"
import { signInAsRole, signInCustomer } from "@/app/session"
import { useAction } from "@/lib/useAction"
import { PublicShell } from "@/components/layout/PublicShell"
import { Button, buttonClass } from "@/components/ui/Button"
import { Callout, DemoBadge } from "@/components/ui/feedback"
import {
  Checkbox,
  ChoiceCards,
  FormField,
  FormStepper,
  SelectInput,
  TextArea,
  TextInput,
  ValidationMessage,
} from "@/components/ui/forms"

interface FormState {
  name: string
  phone: string
  email: string
  language: string
  contactMethod: "" | "Phone" | "WhatsApp" | "Email"
  propertyType: "" | PropertyType
  address: string
  city: string
  pin: string
  monthlyBill: string
  roofArea: string
  preferredCapacity: string
  systemType: "" | SystemType
  requirements: string
  consent: boolean
}

const EMPTY: FormState = {
  name: "",
  phone: "",
  email: "",
  language: "English",
  contactMethod: "",
  propertyType: "",
  address: "",
  city: "",
  pin: "",
  monthlyBill: "",
  roofArea: "",
  preferredCapacity: "",
  systemType: "",
  requirements: "",
  consent: false,
}
const STEPS = [
  "Your details",
  "Property",
  "Solar requirements",
  "Review & submit",
]
type Errors = Partial<Record<keyof FormState, string>>

function validate(step: number, f: FormState): Errors {
  const e: Errors = {}
  if (step === 0) {
    if (f.name.trim().length < 2) e.name = "Enter your full name."
    if (!f.phone.trim()) e.phone = "Mobile number is required."
    else if (!isValidIndianMobile(f.phone))
      e.phone = "Enter a valid 10-digit Indian mobile number starting with 6–9."
    if (f.email.trim() && !isValidEmail(f.email))
      e.email = "Enter a valid email address."
    if (!f.contactMethod) e.contactMethod = "Choose how we should contact you."
    if (f.contactMethod === "Email" && !f.email.trim())
      e.email = "Email is required when it is your preferred contact method."
  }
  if (step === 1) {
    if (!f.propertyType) e.propertyType = "Select a property type."
    if (f.address.trim().length < 5) e.address = "Enter the site address."
    if (f.city.trim().length < 2) e.city = "Enter the city."
    if (!isValidPin(f.pin)) e.pin = "Enter a valid 6-digit PIN code."
  }
  if (step === 2) {
    const bill = Number(f.monthlyBill)
    if (!f.monthlyBill || !Number.isFinite(bill) || bill < 100)
      e.monthlyBill = "Enter your average monthly bill (at least ₹100)."
    if (f.roofArea && !(Number(f.roofArea) > 20))
      e.roofArea = "Rooftop area should be more than 20 sq ft."
    if (!f.systemType) e.systemType = "Choose On-Grid or Off-Grid."
  }
  if (step === 3 && !f.consent)
    e.consent = "Please confirm that SunFlow 360 may contact you."
  return e
}

export default function EnquiryPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { run, pending } = useAction()
  const [f, setF] = useState<FormState>(() => ({
    ...EMPTY,
    preferredCapacity: params.get("capacity") ?? "",
    systemType: params.get("type") as SystemType ?? "",
  }))
  const [step, setStep] = useState(0)
  const [done, setDone] = useState<number[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [duplicate, setDuplicate] = useState<DuplicateMatch | null>(null)
  const [result, setResult] = useState<{
    leadId: string
    customerId: string
  } | null>(null)
  const errors = useMemo(
    () => (showErrors ? validate(step, f) : {}),
    [showErrors, step, f],
  )
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((s) => ({ ...s, [k]: v }))

  const next = async () => {
    const e = validate(step, f)
    if (Object.keys(e).length) {
      setShowErrors(true)
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      )
      return
    }
    if (step === 0) {
      const dup = await run("dup", () =>
        checkDuplicateEnquiry(f.phone, f.email || undefined),
      ).catch(() => null)
      setDuplicate(dup ?? null)
    }
    setShowErrors(false)
    setDone((d) => [...new Set([...d, step])])
    setStep((s) => s + 1)
    window.scrollTo({ top: 200, behavior: "smooth" })
  }

  const submit = async () => {
    const e = validate(3, f)
    if (Object.keys(e).length) return setShowErrors(true)
    const r = await run(
      "submit",
      () =>
        submitEnquiry({
          name: f.name.trim(),
          phone: f.phone,
          email: f.email.trim() || undefined,
          language: f.language,
          contactMethod: f.contactMethod as "Phone",
          propertyType: f.propertyType as PropertyType,
          address: f.address.trim(),
          city: f.city.trim(),
          pin: f.pin.trim(),
          monthlyBill: Number(f.monthlyBill),
          roofArea: f.roofArea ? Number(f.roofArea) : undefined,
          preferredCapacity: f.preferredCapacity
            ? Number(f.preferredCapacity)
            : undefined,
          systemType: f.systemType as SystemType,
          requirements: f.requirements.trim() || undefined,
          source: "Website",
        }),
      "Enquiry submitted",
    ).catch(() => null)
    if (r) {
      setResult(r)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const fillDemo = () => {
    setF({
      ...EMPTY,
      name: DEMO_CUSTOMER.name,
      phone: DEMO_CUSTOMER.phone,
      email: DEMO_CUSTOMER.email,
      language: DEMO_CUSTOMER.language,
      contactMethod: DEMO_CUSTOMER.contactMethod,
      propertyType: DEMO_CUSTOMER.propertyType,
      address: DEMO_CUSTOMER.address,
      city: DEMO_CUSTOMER.city,
      pin: DEMO_CUSTOMER.pin,
      monthlyBill: String(DEMO_CUSTOMER.monthlyBill),
      preferredCapacity: String(DEMO_CUSTOMER.capacity),
      systemType: DEMO_CUSTOMER.systemType,
      consent: true,
    })
    setShowErrors(false)
  }

  if (result)
    return (
      <PublicShell
        eyebrow="Enquiry received"
        title="Thank you — your solar journey has started."
        description="Our team will call you within one working day to schedule your free site survey."
      >
        <div className="surface mx-auto max-w-2xl p-6 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald/15 text-botanical">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <p className="mt-5 text-sm text-muted">Your enquiry reference</p>
          <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-ink">
            {result.leadId}
          </p>
          <div className="mt-2 flex justify-center">
            <DemoBadge label="Demo reference" />
          </div>
          <ol className="mx-auto mt-8 max-w-md space-y-3 text-left text-sm">
            {[
              "A sales advisor reviews your details",
              "We schedule a free technical site survey",
              "You receive a survey-backed quotation",
            ].map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-[12px] font-semibold text-sunshine">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="dark"
              onClick={() => (signInCustomer(f.phone), navigate("/portal"))}
            >
              Track in customer portal
            </Button>
            <Link to="/assistant" className={buttonClass("secondary")}>
              <MessageSquareText className="h-4 w-4" /> Add details with the
              assistant
            </Link>
            <Button
              variant="ghost"
              onClick={() => (
                signInAsRole("sales"), navigate(`/app/leads/${result.leadId}`)
              )}
            >
              View lead in CRM (staff demo)
            </Button>
          </div>
        </div>
      </PublicShell>
    )

  return (
    <PublicShell
      eyebrow="Free site survey"
      title="Tell us about your rooftop."
      description="Four short steps. We’ll use these details to plan a free technical survey and a quotation that fits your home or business."
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="surface p-5 sm:p-8 lg:col-span-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <FormStepper
              steps={STEPS}
              current={step}
              completed={done}
              onStepClick={(i) => (setShowErrors(false), setStep(i))}
            />
          </div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-forest/7 pb-4">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
              Step {step + 1} of 4 · {STEPS[step]}
            </h2>
            <button
              type="button"
              onClick={fillDemo}
              className="inline-flex items-center gap-1.5 rounded-full bg-sunshine/20 px-3 py-1 text-[12px] font-medium text-[#6E4E00] hover:bg-sunshine/30"
            >
              <Wand2 className="h-3.5 w-3.5" /> Fill Rahul Sharma demo data
            </button>
          </div>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              if (step < 3) next()
              else submit()
            }}
          >
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Full name"
                  required
                  error={errors.name}
                  className="sm:col-span-2"
                >
                  <TextInput
                    autoComplete="name"
                    value={f.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                  />
                </FormField>
                <FormField
                  label="Mobile number"
                  required
                  error={errors.phone}
                  hint="We’ll never share your number."
                >
                  <TextInput
                    prefix="+91"
                    inputMode="tel"
                    autoComplete="tel"
                    value={f.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="98765 43210"
                  />
                </FormField>
                <FormField label="Email address" optional error={errors.email}>
                  <TextInput
                    type="email"
                    autoComplete="email"
                    value={f.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@example.in"
                  />
                </FormField>
                <FormField label="Preferred language" required>
                  <SelectInput
                    value={f.language}
                    onChange={(e) => set("language", e.target.value)}
                    options={["English", "Hindi", "Marathi"]}
                  />
                </FormField>
                <FormField
                  label="Preferred contact method"
                  required
                  error={errors.contactMethod}
                >
                  <SelectInput
                    value={f.contactMethod}
                    onChange={(e) =>
                      set(
                        "contactMethod",
                        e.target.value as FormState["contactMethod"],
                      )
                    }
                    placeholder="Select…"
                    options={["Phone", "WhatsApp", "Email"]}
                  />
                </FormField>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="mb-2 text-[13px] font-medium text-ink">
                    Property type <span className="text-[#A93A26]">*</span>
                  </p>
                  <ChoiceCards
                    name="Property type"
                    value={f.propertyType || undefined}
                    invalid={!!errors.propertyType}
                    onChange={(v) => set("propertyType", v)}
                    options={[
                      {
                        value: "Residential",
                        label: "Residential",
                        description: "Homes, villas, housing societies",
                        icon: <Home className="h-5 w-5" />,
                      },
                      {
                        value: "Commercial",
                        label: "Commercial",
                        description: "Shops, clinics, offices",
                        icon: <Building2 className="h-5 w-5" />,
                      },
                      {
                        value: "Industrial",
                        label: "Industrial",
                        description: "Workshops, small units",
                        icon: <Factory className="h-5 w-5" />,
                      },
                    ]}
                  />
                  <ValidationMessage>{errors.propertyType}</ValidationMessage>
                </div>
                <FormField
                  label="Site address"
                  required
                  error={errors.address}
                  className="sm:col-span-2"
                >
                  <TextArea
                    rows={2}
                    autoComplete="street-address"
                    value={f.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="House / building, street, area"
                  />
                </FormField>
                <FormField label="City" required error={errors.city}>
                  <TextInput
                    autoComplete="address-level2"
                    value={f.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Pune"
                  />
                </FormField>
                <FormField label="PIN code" required error={errors.pin}>
                  <TextInput
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={6}
                    value={f.pin}
                    onChange={(e) =>
                      set("pin", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="411045"
                  />
                </FormField>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Average monthly electricity bill"
                  required
                  error={errors.monthlyBill}
                >
                  <TextInput
                    prefix="₹"
                    inputMode="numeric"
                    value={f.monthlyBill}
                    onChange={(e) =>
                      set("monthlyBill", e.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="3200"
                  />
                </FormField>
                <FormField
                  label="Rooftop area (sq ft)"
                  optional
                  error={errors.roofArea}
                  hint="An estimate is fine — our surveyor will measure."
                >
                  <TextInput
                    inputMode="numeric"
                    value={f.roofArea}
                    onChange={(e) =>
                      set("roofArea", e.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="400"
                  />
                </FormField>
                <FormField label="Preferred system capacity" optional>
                  <SelectInput
                    value={f.preferredCapacity}
                    onChange={(e) => set("preferredCapacity", e.target.value)}
                    placeholder="Not sure — recommend one"
                    options={["1", "2", "3", "4", "5"].map((k) => ({
                      value: k,
                      label: `${k} kW`,
                    }))}
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <p className="mb-2 text-[13px] font-medium text-ink">
                    System type <span className="text-[#A93A26]">*</span>
                  </p>
                  <ChoiceCards
                    name="System type"
                    columns={2}
                    value={f.systemType || undefined}
                    invalid={!!errors.systemType}
                    onChange={(v) => set("systemType", v)}
                    options={[
                      {
                        value: "On-Grid",
                        label: "On-Grid",
                        description:
                          "Net metering, lowest cost, subsidy eligible for homes",
                        icon: <PlugZap className="h-5 w-5" />,
                      },
                      {
                        value: "Off-Grid",
                        label: "Off-Grid",
                        description:
                          "Battery backup for power cuts and remote sites",
                        icon: <BatteryCharging className="h-5 w-5" />,
                      },
                    ]}
                  />
                  <ValidationMessage>{errors.systemType}</ValidationMessage>
                </div>
                <FormField
                  label="Additional requirements"
                  optional
                  className="sm:col-span-2"
                >
                  <TextArea
                    value={f.requirements}
                    onChange={(e) => set("requirements", e.target.value)}
                    placeholder="e.g. water heater load, preferred installation month, society approvals…"
                  />
                </FormField>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                {duplicate && (
                  <Callout
                    tone="warning"
                    title="We already have a record for this customer"
                  >
                    {duplicate.name} matched on {duplicate.matchedOn}
                    {duplicate.openLeadId
                      ? ` with an open enquiry ${duplicate.openLeadId} (${duplicate.openLeadStatus}).`
                      : "."}{" "}
                    Submitting adds this enquiry to the same customer record
                    instead of creating a duplicate.
                  </Callout>
                )}
                {[
                  {
                    title: "Your details",
                    step: 0,
                    rows: [
                      ["Name", f.name],
                      ["Mobile", f.phone],
                      ["Email", f.email || "—"],
                      ["Language", f.language],
                      ["Contact via", f.contactMethod],
                    ],
                  },
                  {
                    title: "Property",
                    step: 1,
                    rows: [
                      ["Type", f.propertyType],
                      ["Address", f.address],
                      ["City", f.city],
                      ["PIN", f.pin],
                    ],
                  },
                  {
                    title: "Requirements",
                    step: 2,
                    rows: [
                      [
                        "Monthly bill",
                        f.monthlyBill ? inr(Number(f.monthlyBill)) : "—",
                      ],
                      [
                        "Rooftop area",
                        f.roofArea ? `${f.roofArea} sq ft` : "Not known",
                      ],
                      [
                        "Capacity",
                        f.preferredCapacity
                          ? `${f.preferredCapacity} kW`
                          : "Recommend for me",
                      ],
                      ["System", f.systemType],
                      ["Notes", f.requirements || "—"],
                    ],
                  },
                ].map((g) => (
                  <div
                    key={g.title}
                    className="rounded-2xl border border-forest/8 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">
                        {g.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(g.step)}
                        className="text-[13px] font-medium text-botanical hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                      {g.rows.map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="w-28 shrink-0 text-muted">{k}</dt>
                          <dd className="min-w-0 break-words text-ink">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
                <div>
                  <Checkbox
                    checked={f.consent}
                    onChange={(v) => set("consent", v)}
                    label="I agree that SunFlow 360 may contact me about this enquiry."
                    description="Your details are used only to plan your survey and quotation."
                  />
                  <ValidationMessage>{errors.consent}</ValidationMessage>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-forest/7 pt-5">
              <Button
                variant="ghost"
                icon={<ArrowLeft className="h-4 w-4" />}
                disabled={step === 0}
                onClick={() => (setShowErrors(false), setStep((s) => s - 1))}
              >
                Previous
              </Button>
              {step < 3 ? (
                <Button
                  type="submit"
                  variant="dark"
                  loading={pending === "dup"}
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={pending === "submit"}
                >
                  Submit enquiry
                </Button>
              )}
            </div>
          </form>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <div className="glass-light p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ClipboardCheck className="h-4 w-4 text-botanical" /> What happens
              next
            </p>
            <ol className="mt-4 space-y-3 text-[13px] text-ink/80">
              <li>1. An advisor reviews your enquiry and calls you.</li>
              <li>2. A surveyor visits to check roof, shading and wiring.</li>
              <li>
                3. Once the survey is approved you get a detailed quotation.
              </li>
            </ol>
          </div>
          <Link
            to="/assistant"
            className="glass glass-ai glass-sheen block rounded-[1.25rem] p-5 text-white transition-transform hover:-translate-y-0.5"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-sunshine" /> Prefer to chat?
            </p>
            <p className="mt-1.5 text-[13px] text-white/72">
              Our solar assistant collects the same details in English, Hindi or
              Marathi.
            </p>
          </Link>
        </aside>
      </div>
    </PublicShell>
  )
}
