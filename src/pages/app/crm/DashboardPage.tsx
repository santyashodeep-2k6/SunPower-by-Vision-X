import { useMemo } from "react"
import { Link } from "react-router"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  CalendarClock,
  ClipboardCheck,
  FileText,
  Inbox,
  Percent,
  Users,
} from "lucide-react"
import { useDb, useSession } from "@/data/store"
import { relative } from "@/lib/format"
import { effectiveQuoteStatus } from "@/services/crm"
import { PageHeader } from "@/components/layout/PageHeader"
import {
  ActivityTimeline,
  ChartCard,
  Panel,
  StatCard,
} from "@/components/ui/data"
import { DemoBadge } from "@/components/ui/feedback"
import { JourneyGuide } from "@/components/special/JourneyGuide"
import { LEAD_STATUSES, LeadsTable } from "./LeadsTable"

export const CHART_COLORS = [
  "#103D2D",
  "#217A50",
  "#38B878",
  "#F4C542",
  "#E7A934",
  "#9DB8A8",
  "#C9D9CF",
]

export default function DashboardPage() {
  const db = useDb()
  const session = useSession()
  const user = db.users.find((u) => u.id === session?.userId)
  const k = useMemo(() => {
    const won = db.leads.filter((l) => l.status === "Won").length
    const lost = db.leads.filter((l) => l.status === "Lost").length
    return {
      total: db.leads.length,
      fresh: db.leads.filter((l) => l.status === "New").length,
      review: db.leads.filter((l) => ["New", "Contacted"].includes(l.status))
        .length,
      surveys: db.surveys.filter((s) => s.status === "Scheduled").length,
      quotes: db.quotations.filter((q) =>
        ["Draft", "Sent", "Awaiting Response"].includes(
          effectiveQuoteStatus(q),
        ),
      ).length,
      conversion: won + lost ? Math.round((won / (won + lost)) * 100) : 0,
      won,
      lost,
    }
  }, [db])
  const byStatus = LEAD_STATUSES.map((s) => ({
    status: s,
    count: db.leads.filter((l) => l.status === s).length,
  }))
  const bySource = Object.entries(
    db.leads.reduce<Record<string, number>>(
      (a, l) => ((a[l.source] = (a[l.source] ?? 0) + 1), a),
      {},
    ),
  ).map(([name, value]) => ({ name, value }))
  const followUps = db.leads
    .filter((l) => l.followUpAt && !["Won", "Lost"].includes(l.status))
    .sort((a, b) => a.followUpAt!.localeCompare(b.followUpAt!))
    .slice(0, 5)

  return (
    <>
      <PageHeader
        eyebrow="Sales & CRM"
        title={`Good day, ${user?.name.split(" ")[0] ?? "there"}`}
        description="Enquiries from the website, WhatsApp, phone and the AI assistant — in one place."
        badges={<DemoBadge />}
      />
      <div className="space-y-6">
        <JourneyGuide db={db} defaultOpen={false} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Total leads"
            value={k.total}
            icon={<Users className="h-4 w-4" />}
            to="/app/leads"
            sub="All sources"
          />
          <StatCard
            label="New enquiries"
            value={k.fresh}
            icon={<Inbox className="h-4 w-4" />}
            accent="gold"
            to="/app/leads?status=New"
            sub="Not yet contacted"
          />
          <StatCard
            label="Awaiting review"
            value={k.review}
            icon={<ClipboardCheck className="h-4 w-4" />}
            accent="amber"
            to="/app/leads?status=review"
            sub="New + contacted"
          />
          <StatCard
            label="Surveys scheduled"
            value={k.surveys}
            icon={<CalendarClock className="h-4 w-4" />}
            accent="emerald"
            to="/app/surveys?status=Scheduled"
            sub="Upcoming visits"
          />
          <StatCard
            label="Quotations pending"
            value={k.quotes}
            icon={<FileText className="h-4 w-4" />}
            to="/app/quotations?status=pending"
            sub="Draft, sent or awaiting"
          />
          <StatCard
            label="Conversion rate"
            value={`${k.conversion}%`}
            icon={<Percent className="h-4 w-4" />}
            accent="emerald"
            to="/app/leads?status=Won"
            sub={`${k.won} won · ${k.lost} lost`}
          />
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <ChartCard
            title="Pipeline by status"
            description="Click a KPI or filter the table below to drill in."
            className="xl:col-span-2"
          >
            <ResponsiveContainer>
              <BarChart data={byStatus} margin={{ left: -18, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#E3EAE2" />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 11, fill: "#708078" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#708078" }}
                />
                <Tooltip
                  cursor={{ fill: "rgb(16 61 45 / 0.04)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E3EAE2",
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {byStatus.map((s) => (
                    <Cell
                      key={s.status}
                      fill={
                        s.status === "Won"
                          ? "#38B878"
                          : s.status === "Lost"
                            ? "#C9D9CF"
                            : s.status === "New"
                              ? "#F4C542"
                              : "#217A50"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Enquiry sources">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={bySource}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {bySource.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E3EAE2",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="-mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 text-[11.5px] text-muted">
              {bySource.map((s, i) => (
                <li key={s.name} className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                  <Link
                    to={`/app/leads?source=${encodeURIComponent(s.name)}`}
                    className="hover:text-ink"
                  >
                    {s.name} ({s.value})
                  </Link>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
        <LeadsTable pageSize={8} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Follow-ups due">
            {followUps.length === 0 ? (
              <p className="text-sm text-muted">
                No follow-ups scheduled. Use “Request follow-up” on a lead.
              </p>
            ) : (
              <ul className="divide-y divide-forest/7">
                {followUps.map((l) => (
                  <li key={l.id}>
                    <Link
                      to={`/app/leads/${l.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-botanical"
                    >
                      <span>
                        {db.customers.find((c) => c.id === l.customerId)?.name}
                      </span>
                      <span
                        className={`text-[12.5px] ${
                          new Date(l.followUpAt!) < new Date()
                            ? "text-[#A93A26]"
                            : "text-muted"
                        }`}
                      >
                        {relative(l.followUpAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Recent activity">
            <ActivityTimeline items={db.activities.slice(0, 7)} />
          </Panel>
        </div>
      </div>
    </>
  )
}
