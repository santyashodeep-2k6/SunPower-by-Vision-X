import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Plus } from "lucide-react"
import { fmtDate, inr } from "@/lib/format"
import { PACKAGES } from "@/lib/catalog"
import { useDb } from "@/data/store"
import { createQuotation, effectiveQuoteStatus } from "@/services/crm"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/feedback"
import {
  DataTable,
  SearchFilterBar,
  Tabs,
  type Column,
} from "@/components/ui/data"
import { FormField, SelectInput } from "@/components/ui/forms"
import { Modal } from "@/components/ui/overlays"

const GROUPS: Record<string, string[]> = {
  pending: ["Draft", "Sent", "Awaiting Response"],
  Draft: ["Draft"],
  sent: ["Sent", "Awaiting Response"],
  Accepted: ["Accepted"],
  closed: ["Rejected", "Expired"],
}

export default function QuotationsPage() {
  const db = useDb()
  const navigate = useNavigate()
  const { run, pending } = useAction()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const [surveyId, setSurveyId] = useState("")
  const [pkg, setPkg] = useState("")
  const status = params.get("status") ?? ""
  const rows = useMemo(
    () =>
      db.quotations
        .map((x) => ({
          x,
          st: effectiveQuoteStatus(x),
          c: db.customers.find((c) => c.id === x.customerId),
        }))
        .filter(
          ({ x, st, c }) =>
            (!status || GROUPS[status]?.includes(st)) &&
            (!q ||
              `${x.id} ${c?.name}`.toLowerCase().includes(q.toLowerCase())),
        ),
    [db, status, q],
  )
  type Row = typeof rows[number]
  const columns: Column<Row>[] = [
    {
      key: "id",
      header: "Quotation",
      sortValue: (r) => r.x.id,
      render: (r) => <span className="font-mono text-[13px]">{r.x.id}</span>,
    },
    {
      key: "c",
      header: "Customer",
      sortValue: (r) => r.c?.name ?? "",
      render: (r) => r.c?.name,
    },
    {
      key: "pkg",
      header: "Package",
      render: (r) => `${r.x.capacity} kW ${r.x.systemType}`,
    },
    {
      key: "total",
      header: "Final amount",
      align: "right",
      sortValue: (r) => r.x.totals.total,
      render: (r) => inr(r.x.totals.total),
    },
    {
      key: "valid",
      header: "Valid until",
      sortValue: (r) => r.x.validUntil,
      render: (r) => fmtDate(r.x.validUntil),
    },
    {
      key: "created",
      header: "Created",
      sortValue: (r) => r.x.createdAt,
      render: (r) => fmtDate(r.x.createdAt),
    },
    {
      key: "st",
      header: "Status",
      render: (r) => <StatusBadge status={r.st} />,
    },
  ]
  const surveys = db.surveys.map((s) => ({
    value: s.id,
    label: `${s.id} — ${db.customers.find((c) => c.id === s.customerId)?.name} (${s.status})`,
    disabled: s.status !== "Approved",
  }))
  const count = (k: string) =>
    db.quotations.filter((x) => GROUPS[k].includes(effectiveQuoteStatus(x)))
      .length
  return (
    <>
      <PageHeader
        eyebrow="Sales & CRM"
        title="Quotations"
        description="Survey-backed quotations generated from the configured bill of materials."
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setOpen(true)}
          >
            New quotation
          </Button>
        }
      />
      <Tabs
        className="mb-4"
        value={status}
        onChange={(v) => setParams(v ? { status: v } : {})}
        tabs={[
          { id: "", label: "All", count: db.quotations.length },
          { id: "pending", label: "Pending", count: count("pending") },
          { id: "Draft", label: "Draft", count: count("Draft") },
          { id: "sent", label: "Sent / awaiting", count: count("sent") },
          { id: "Accepted", label: "Accepted", count: count("Accepted") },
          { id: "closed", label: "Rejected / expired", count: count("closed") },
        ]}
      />
      <div className="surface overflow-hidden">
        <div className="border-b border-forest/7 p-4">
          <SearchFilterBar
            search={q}
            onSearch={setQ}
            placeholder="Search quotation or customer…"
          />
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.x.id}
          rowLabel={(r) => `quotation ${r.x.id}`}
          onRowClick={(r) => navigate(`/app/quotations/${r.x.id}`)}
          initialSort={{ key: "created", dir: "desc" }}
        />
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New quotation"
        description="Only surveys that are approved can be quoted. Pending surveys are listed but disabled."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!surveyId}
              loading={pending === "create"}
              onClick={() =>
                run(
                  "create",
                  () => createQuotation(surveyId, pkg || undefined),
                  (id) => `Draft ${id} created`,
                )
                  .then((id) => navigate(`/app/quotations/${id}`))
                  .catch(() => undefined)
              }
            >
              Create draft
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField
            label="Approved survey"
            required
            hint="Survey status must be Approved."
          >
            <SelectInput
              value={surveyId}
              onChange={(e) => setSurveyId(e.target.value)}
              placeholder="Select a survey…"
              options={surveys}
            />
          </FormField>
          <FormField
            label="Package"
            hint="Defaults to the surveyor’s recommendation."
          >
            <SelectInput
              value={pkg}
              onChange={(e) => setPkg(e.target.value)}
              placeholder="Use survey recommendation"
              options={PACKAGES.map((p) => ({ value: p.id, label: p.label }))}
            />
          </FormField>
        </div>
      </Modal>
    </>
  )
}
