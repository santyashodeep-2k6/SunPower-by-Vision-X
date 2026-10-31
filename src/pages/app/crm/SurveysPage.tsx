import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import type { SurveyStatus } from "@/lib/types"
import { fmtDateTime } from "@/lib/format"
import { useDb, useSession } from "@/data/store"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusBadge } from "@/components/ui/feedback"
import {
  DataTable,
  SearchFilterBar,
  Tabs,
  type Column,
} from "@/components/ui/data"

const STATUSES: SurveyStatus[] = [
  "Scheduled",
  "Pending Approval",
  "Approved",
  "Revisit Requested",
  "Rejected",
]

export default function SurveysPage() {
  const db = useDb()
  const session = useSession()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState("")
  const [surveyor, setSurveyor] = useState(
    session?.role === "surveyor" ? (session.userId ?? "") : "",
  )
  const status = (params.get("status") ?? "") as SurveyStatus | ""
  const rows = useMemo(
    () =>
      db.surveys
        .map((s) => ({
          s,
          c: db.customers.find((c) => c.id === s.customerId),
          site: db.sites.find((x) => x.id === s.siteId),
          who:
            db.users.find((u) => u.id === s.surveyorId)?.name ?? "Unassigned",
        }))
        .filter(
          ({ s, c, site }) =>
            (!status || s.status === status) &&
            (!surveyor || s.surveyorId === surveyor) &&
            (!q ||
              `${s.id} ${c?.name} ${site?.city}`
                .toLowerCase()
                .includes(q.toLowerCase())),
        ),
    [db, status, surveyor, q],
  )
  type Row = typeof rows[number]
  const columns: Column<Row>[] = [
    {
      key: "id",
      header: "Survey",
      sortValue: (r) => r.s.id,
      render: (r) => <span className="font-mono text-[13px]">{r.s.id}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      sortValue: (r) => r.c?.name ?? "",
      render: (r) => (
        <div>
          <p className="font-medium">{r.c?.name}</p>
          <p className="text-[12px] text-muted">
            {r.site?.city} · {r.site?.propertyType}
          </p>
        </div>
      ),
    },
    {
      key: "when",
      header: "Scheduled",
      sortValue: (r) => r.s.scheduledAt,
      render: (r) => fmtDateTime(r.s.scheduledAt),
    },
    {
      key: "who",
      header: "Surveyor",
      sortValue: (r) => r.who,
      render: (r) => r.who,
    },
    {
      key: "rec",
      header: "Recommendation",
      render: (r) =>
        r.s.assessment ? (
          `${r.s.assessment.recommendedCapacity} kW ${r.s.assessment.recommendedType}`
        ) : (
          <span className="text-muted">Pending assessment</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => STATUSES.indexOf(r.s.status),
      render: (r) => <StatusBadge status={r.s.status} />,
    },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Sales & CRM"
        title={session?.role === "surveyor" ? "My surveys" : "Site surveys"}
        description="Technical assessments that unlock final quotations once approved."
      />
      <Tabs
        className="mb-4"
        value={status}
        onChange={(v) => setParams(v ? { status: v } : {})}
        tabs={[
          { id: "", label: "All", count: db.surveys.length },
          ...STATUSES.map((s) => ({
            id: s,
            label: s,
            count: db.surveys.filter((x) => x.status === s).length,
          })),
        ]}
      />
      <div className="surface overflow-hidden">
        <div className="border-b border-forest/7 p-4">
          <SearchFilterBar
            search={q}
            onSearch={setQ}
            placeholder="Search survey, customer, city…"
            onReset={() => (setQ(""), setSurveyor(""))}
            filters={[
              {
                id: "surveyor",
                label: "Surveyor",
                value: surveyor,
                onChange: setSurveyor,
                options: db.users
                  .filter((u) => u.role === "surveyor")
                  .map((u) => ({ value: u.id, label: u.name })),
              },
            ]}
          />
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.s.id}
          rowLabel={(r) => `survey ${r.s.id}`}
          onRowClick={(r) => navigate(`/app/surveys/${r.s.id}`)}
          initialSort={{ key: "when", dir: "desc" }}
        />
      </div>
    </>
  )
}
