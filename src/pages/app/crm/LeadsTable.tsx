import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Download, Plus } from "lucide-react"
import type { LeadSource, LeadStatus, PropertyType } from "@/lib/types"
import {
  downloadFile,
  fmtDate,
  inr,
  isValidIndianMobile,
  relative,
  toCsv,
} from "@/lib/format"
import { missingLeadFields } from "@/lib/rules"
import { useDb } from "@/data/store"
import { submitEnquiry } from "@/services/crm"
import { useAction } from "@/lib/useAction"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/feedback"
import { DataTable, SearchFilterBar, type Column } from "@/components/ui/data"
import {
  DatePicker,
  FormField,
  SelectInput,
  TextInput,
} from "@/components/ui/forms"
import { Modal } from "@/components/ui/overlays"

export const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Survey Scheduled",
  "Survey Completed",
  "Quotation Sent",
  "Won",
  "Lost",
]
export const LEAD_SOURCES: LeadSource[] = [
  "Website",
  "WhatsApp",
  "Phone",
  "Referral",
  "AI Assistant",
  "Walk-in",
]
/** Pseudo statuses used by dashboard KPI links. */
const STATUS_GROUPS: Record<string, { label: string; match: LeadStatus[] }> = {
  review: { label: "Awaiting review", match: ["New", "Contacted"] },
  open: {
    label: "Open pipeline",
    match: [
      "New",
      "Contacted",
      "Qualified",
      "Survey Scheduled",
      "Survey Completed",
      "Quotation Sent",
    ],
  },
}

interface Row {
  id: string
  name: string
  phone: string
  city: string
  property: PropertyType
  status: LeadStatus
  source: LeadSource
  assignedTo?: string
  assignedName: string
  bill?: number
  createdAt: string
  missing: number
  score?: number
}

export function NewLeadModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { run, pending } = useAction()
  const [f, setF] = useState({
    name: "",
    phone: "",
    city: "",
    propertyType: "Residential" as PropertyType,
    source: "Phone" as LeadSource,
    monthlyBill: "",
  })
  const [tried, setTried] = useState(false)
  const errors = {
    name: f.name.trim().length < 2 ? "Enter the customer name." : undefined,
    phone: !isValidIndianMobile(f.phone)
      ? "Enter a valid Indian mobile number."
      : undefined,
    city: f.city.trim().length < 2 ? "Enter the city." : undefined,
  }
  const save = async () => {
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
    const r = await run(
      "new-lead",
      () =>
        submitEnquiry({
          name: f.name.trim(),
          phone: f.phone,
          language: "English",
          contactMethod: "Phone",
          propertyType: f.propertyType,
          address: "",
          city: f.city.trim(),
          pin: "",
          monthlyBill: f.monthlyBill ? Number(f.monthlyBill) : undefined,
          source: f.source,
        }),
      (x) => `Lead ${x.leadId} created`,
    ).catch(() => null)
    if (r) {
      onClose()
      navigate(`/app/leads/${r.leadId}`)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log a new lead"
      description="For phone calls, walk-ins and referrals. Existing customers are matched by phone number."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending === "new-lead"}
            onClick={save}
          >
            Create lead
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Customer name"
          required
          error={tried ? errors.name : undefined}
        >
          <TextInput
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </FormField>
        <FormField
          label="Mobile number"
          required
          error={tried ? errors.phone : undefined}
        >
          <TextInput
            prefix="+91"
            inputMode="tel"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
          />
        </FormField>
        <FormField
          label="City"
          required
          error={tried ? errors.city : undefined}
        >
          <TextInput
            value={f.city}
            onChange={(e) => setF({ ...f, city: e.target.value })}
          />
        </FormField>
        <FormField label="Property type" required>
          <SelectInput
            value={f.propertyType}
            onChange={(e) =>
              setF({ ...f, propertyType: e.target.value as PropertyType })
            }
            options={["Residential", "Commercial", "Industrial"]}
          />
        </FormField>
        <FormField label="Source" required>
          <SelectInput
            value={f.source}
            onChange={(e) =>
              setF({ ...f, source: e.target.value as LeadSource })
            }
            options={LEAD_SOURCES}
          />
        </FormField>
        <FormField label="Monthly bill (₹)" optional>
          <TextInput
            inputMode="numeric"
            value={f.monthlyBill}
            onChange={(e) =>
              setF({ ...f, monthlyBill: e.target.value.replace(/\D/g, "") })
            }
          />
        </FormField>
      </div>
    </Modal>
  )
}

export function LeadsTable({
  pageSize = 10,
  showCreate = true,
}: {
  pageSize?: number
  showCreate?: boolean
}) {
  const db = useDb()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const get = (k: string) => params.get(k) ?? ""
  const setParam = (k: string, v: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (v) n.set(k, v)
        else n.delete(k)
        return n
      },
      { replace: true },
    )
  const rows = useMemo<Row[]>(
    () =>
      db.leads.map((l) => {
        const c = db.customers.find((x) => x.id === l.customerId)
        const s = db.sites.find((x) => x.id === l.siteId)
        return {
          id: l.id,
          name: c?.name ?? "—",
          phone: c?.phone ?? "",
          city: s?.city ?? "",
          property: s?.propertyType ?? "Residential",
          status: l.status,
          source: l.source,
          assignedTo: l.assignedTo,
          assignedName:
            db.users.find((u) => u.id === l.assignedTo)?.name ?? "Unassigned",
          bill: l.monthlyBill,
          createdAt: l.createdAt,
          missing: missingLeadFields(l, c, s).length,
          score: l.aiSummary?.score,
        }
      }),
    [db],
  )
  const cities = useMemo(
    () => [...new Set(rows.map((r) => r.city).filter(Boolean))].sort(),
    [rows],
  )
  const sales = db.users.filter((u) => u.role === "sales" || u.role === "admin")
  const filtered = useMemo(() => {
    const q = get("q").toLowerCase()
    const status = get("status")
    const from = get("from")
    const to = get("to")
    return rows.filter((r) => {
      if (
        q &&
        !`${r.id} ${r.name} ${r.phone} ${r.city}`.toLowerCase().includes(q)
      )
        return false
      if (
        status &&
        (STATUS_GROUPS[status]
          ? !STATUS_GROUPS[status].match.includes(r.status)
          : r.status !== status)
      )
        return false
      if (get("source") && r.source !== get("source")) return false
      if (get("property") && r.property !== get("property")) return false
      if (get("city") && r.city !== get("city")) return false
      if (
        get("assigned") &&
        (get("assigned") === "none"
          ? r.assignedTo
          : r.assignedTo !== get("assigned"))
      )
        return false
      if (from && r.createdAt.slice(0, 10) < from) return false
      if (to && r.createdAt.slice(0, 10) > to) return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, params])

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Customer",
      sortValue: (r) => r.name,
      render: (r) => (
        <div>
          <p className="font-medium text-ink">{r.name}</p>
          <p className="font-mono text-[12px] text-muted">
            {r.id} · {r.phone}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => LEAD_STATUSES.indexOf(r.status),
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "city",
      header: "Location",
      sortValue: (r) => r.city,
      render: (r) => (
        <div>
          <p>{r.city || "—"}</p>
          <p className="text-[12px] text-muted">{r.property}</p>
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      sortValue: (r) => r.source,
      render: (r) => r.source,
    },
    {
      key: "assigned",
      header: "Salesperson",
      sortValue: (r) => r.assignedName,
      render: (r) => (
        <span className={r.assignedTo ? "" : "text-muted italic"}>
          {r.assignedName}
        </span>
      ),
    },
    {
      key: "bill",
      header: "Bill / mo",
      align: "right",
      sortValue: (r) => r.bill ?? 0,
      render: (r) =>
        r.bill ? (
          inr(r.bill)
        ) : (
          <span className="text-[12px] text-[#835400]">Missing</span>
        ),
    },
    {
      key: "missing",
      header: "Profile",
      sortValue: (r) => r.missing,
      render: (r) =>
        r.missing ? (
          <span className="text-[12px] text-[#835400]">
            {r.missing} missing
          </span>
        ) : (
          <span className="text-[12px] text-[#17673F]">Complete</span>
        ),
    },
    {
      key: "created",
      header: "Received",
      sortValue: (r) => r.createdAt,
      render: (r) => (
        <span title={fmtDate(r.createdAt)} className="text-muted">
          {relative(r.createdAt)}
        </span>
      ),
    },
  ]

  const exportCsv = () =>
    downloadFile(
      `sunflow360-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        filtered.map((r) => ({
          Lead: r.id,
          Customer: r.name,
          Phone: r.phone,
          City: r.city,
          Property: r.property,
          Status: r.status,
          Source: r.source,
          Salesperson: r.assignedName,
          "Monthly bill": r.bill ?? "",
          Received: fmtDate(r.createdAt),
        })),
      ),
      "text/csv",
    )

  return (
    <div className="surface overflow-hidden">
      <div className="border-b border-forest/7 p-4">
        <SearchFilterBar
          search={get("q")}
          onSearch={(v) => setParam("q", v)}
          placeholder="Search name, phone, lead ID…"
          onReset={() => setParams(new URLSearchParams(), { replace: true })}
          filters={[
            {
              id: "status",
              label: "Status",
              value: get("status"),
              onChange: (v) => setParam("status", v),
              options: [
                ...Object.entries(STATUS_GROUPS).map(([value, g]) => ({
                  value,
                  label: g.label,
                })),
                ...LEAD_STATUSES.map((s) => ({ value: s, label: s })),
              ],
            },
            {
              id: "source",
              label: "Source",
              value: get("source"),
              onChange: (v) => setParam("source", v),
              options: LEAD_SOURCES.map((s) => ({ value: s, label: s })),
            },
            {
              id: "property",
              label: "Property",
              value: get("property"),
              onChange: (v) => setParam("property", v),
              options: ["Residential", "Commercial", "Industrial"].map((s) => ({
                value: s,
                label: s,
              })),
            },
            {
              id: "city",
              label: "City",
              value: get("city"),
              onChange: (v) => setParam("city", v),
              options: cities.map((s) => ({ value: s, label: s })),
            },
            {
              id: "assigned",
              label: "Salesperson",
              value: get("assigned"),
              onChange: (v) => setParam("assigned", v),
              options: [
                { value: "none", label: "Unassigned" },
                ...sales.map((u) => ({ value: u.id, label: u.name })),
              ],
            },
          ]}
          actions={
            <>
              <Button
                size="sm"
                variant="secondary"
                icon={<Download className="h-4 w-4" />}
                onClick={exportCsv}
                disabled={!filtered.length}
              >
                Export CSV
              </Button>
              {showCreate && (
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => setCreating(true)}
                >
                  New lead
                </Button>
              )}
            </>
          }
        >
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            From
            <DatePicker
              value={get("from")}
              onChange={(e) => setParam("from", e.target.value)}
              className="h-10 w-auto text-[13px]"
              aria-label="Received from date"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            To
            <DatePicker
              value={get("to")}
              onChange={(e) => setParam("to", e.target.value)}
              className="h-10 w-auto text-[13px]"
              aria-label="Received to date"
            />
          </label>
        </SearchFilterBar>
      </div>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        rowLabel={(r) => `lead ${r.name}`}
        onRowClick={(r) => navigate(`/app/leads/${r.id}`)}
        pageSize={pageSize}
        initialSort={{ key: "created", dir: "desc" }}
      />
      <NewLeadModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
