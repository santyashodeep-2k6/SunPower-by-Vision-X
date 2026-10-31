import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Boxes,
  CircleDollarSign,
  HandCoins,
  PackageCheck,
  Receipt,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react"
import { DAY, compactInr, fmtDate, inr, toInputDate } from "@/lib/format"
import { inventoryValue, paidForOrder, projectFinancials } from "@/lib/rules"
import { useDb } from "@/data/store"
import { PageHeader } from "@/components/layout/PageHeader"
import { DemoBadge } from "@/components/ui/feedback"
import {
  ChartCard,
  DataTable,
  Panel,
  StatCard,
  Tabs,
  type Column,
} from "@/components/ui/data"
import { DatePicker } from "@/components/ui/forms"
import { Drawer } from "@/components/ui/overlays"
import { PROFIT_REVIEW_KEY } from "@/components/special/JourneyGuide"
import { CHART_COLORS } from "../crm/DashboardPage"

type Period = "today" | "week" | "month" | "custom"
const tip = {
  contentStyle: { borderRadius: 12, border: "1px solid #E3EAE2", fontSize: 12 },
}

export default function ReportsPage() {
  const db = useDb()
  const [period, setPeriod] = useState<Period>("month")
  const [from, setFrom] = useState(
    toInputDate(new Date(Date.now() - 180 * DAY).toISOString()),
  )
  const [to, setTo] = useState(toInputDate(new Date().toISOString()))
  const [openInst, setOpenInst] = useState<string | null>(null)
  useEffect(() => {
    if (location.hash === "#profitability")
      setTimeout(
        () =>
          document
            .getElementById("profitability")
            ?.scrollIntoView({ behavior: "smooth" }),
        100,
      )
  }, [])
  const [start, end] = useMemo(() => {
    const now = new Date()
    const s = new Date(now)
    s.setHours(0, 0, 0, 0)
    if (period === "week") s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
    if (period === "month") s.setDate(1)
    if (period === "custom")
      return [new Date(from).getTime(), new Date(to).getTime() + DAY - 1]
    return [s.getTime(), now.getTime() + 1]
  }, [period, from, to])
  const inRange = (iso?: string) =>
    !!iso && new Date(iso).getTime() >= start && new Date(iso).getTime() <= end

  const m = useMemo(() => {
    const orders = db.salesOrders.filter((s) => inRange(s.createdAt))
    const invoiced = orders.reduce((s, o) => s + o.total, 0)
    const collected = db.payments
      .filter((p) => inRange(p.at))
      .reduce((s, p) => s + p.amount, 0)
    const outstanding = db.salesOrders.reduce(
      (s, o) => s + Math.max(0, o.total - paidForOrder(db, o.id)),
      0,
    )
    const completed = db.installations.filter(
      (i) => i.status === "Completed" && inRange(i.completedAt),
    )
    const fins = completed.map((i) => projectFinancials(db, i.id))
    const costs = fins.reduce((s, f) => s + f.totalCost, 0)
    const contribution = fins.reduce((s, f) => s + f.contribution, 0)
    return {
      invoiced,
      collected,
      outstanding,
      costs,
      contribution,
      completed: completed.length,
      pending: db.installations.filter((i) => i.status !== "Completed").length,
      tickets: db.serviceTickets.filter((t) => t.status !== "Closed").length,
      inventory: inventoryValue(db),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, start, end])

  const months = useMemo(() => {
    const out: {
      key: string
      label: string
      sales: number
      revenue: number
      costs: number
      installs: number
      enquiries: number
    }[] = []
    const d = new Date()
    d.setDate(1)
    for (let i = 5; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
      out.push({
        key: `${x.getFullYear()}-${x.getMonth()}`,
        label: x.toLocaleDateString("en-IN", { month: "short" }),
        sales: 0,
        revenue: 0,
        costs: 0,
        installs: 0,
        enquiries: 0,
      })
    }
    const k = (iso: string) =>
      `${new Date(iso).getFullYear()}-${new Date(iso).getMonth()}`
    db.salesOrders.forEach((s) => {
      const r = out.find((o) => o.key === k(s.createdAt))
      if (r) r.sales += s.total
    })
    db.leads.forEach((l) => {
      const r = out.find((o) => o.key === k(l.createdAt))
      if (r) r.enquiries++
    })
    db.installations
      .filter((i) => i.completedAt)
      .forEach((i) => {
        const r = out.find((o) => o.key === k(i.completedAt!))
        if (r) {
          const f = projectFinancials(db, i.id)
          r.installs++
          r.revenue += f.invoiced
          r.costs += f.totalCost
        }
      })
    return out
  }, [db])
  const sources = Object.entries(
    db.leads.reduce<Record<string, number>>(
      (a, l) => ((a[l.source] = (a[l.source] ?? 0) + 1), a),
      {},
    ),
  ).map(([name, value]) => ({ name, value }))
  const funnel = [
    { stage: "Enquiries", value: db.leads.length },
    {
      stage: "Surveyed",
      value: new Set(
        db.surveys.filter((s) => s.status !== "Scheduled").map((s) => s.leadId),
      ).size,
    },
    {
      stage: "Quoted",
      value: new Set(
        db.quotations.filter((q) => q.status !== "Draft").map((q) => q.leadId),
      ).size,
    },
    { stage: "Won", value: db.leads.filter((l) => l.status === "Won").length },
  ]
  const workload = db.users
    .filter((u) => u.role === "installer")
    .map((u) => ({
      name: u.name.split(" ")[0],
      active: db.installations.filter(
        (i) =>
          i.status !== "Completed" &&
          i.crew.some((c) => c.technicianId === u.id),
      ).length,
      hours: Math.round(
        db.installations
          .flatMap((i) => i.timesheets)
          .filter(
            (t) =>
              t.technicianId === u.id &&
              t.end &&
              Date.now() - new Date(t.start).getTime() < 90 * DAY,
          )
          .reduce(
            (s, t) =>
              s +
              (new Date(t.end!).getTime() - new Date(t.start).getTime()) /
                3600000,
            0,
          ),
      ),
    }))
  const profit = useMemo(
    () =>
      db.installations
        .filter((i) => i.status === "Completed")
        .map((i) => ({
          i,
          f: projectFinancials(db, i.id),
          c: db.customers.find((c) => c.id === i.customerId),
        })),
    [db],
  )
  type PRow = typeof profit[number]
  const pCols: Column<PRow>[] = [
    {
      key: "ref",
      header: "Installation",
      sortValue: (r) => r.i.reference,
      render: (r) => (
        <div>
          <p className="font-mono text-[13px]">{r.i.reference}</p>
          <p className="text-[12px] text-muted">
            {r.c?.name} · {r.i.capacity} kW
          </p>
        </div>
      ),
    },
    {
      key: "done",
      header: "Completed",
      sortValue: (r) => r.i.completedAt ?? "",
      render: (r) => fmtDate(r.i.completedAt),
    },
    {
      key: "inv",
      header: "Invoiced",
      align: "right",
      sortValue: (r) => r.f.invoiced,
      render: (r) => inr(r.f.invoiced),
    },
    {
      key: "col",
      header: "Collected",
      align: "right",
      sortValue: (r) => r.f.collected,
      render: (r) => inr(r.f.collected),
    },
    {
      key: "out",
      header: "Outstanding",
      align: "right",
      sortValue: (r) => r.f.outstanding,
      render: (r) => (
        <span className={r.f.outstanding ? "text-[#835400]" : "text-muted"}>
          {inr(r.f.outstanding)}
        </span>
      ),
    },
    {
      key: "cost",
      header: "Recorded costs",
      align: "right",
      sortValue: (r) => r.f.totalCost,
      render: (r) => inr(r.f.totalCost),
    },
    {
      key: "con",
      header: "Job contribution",
      align: "right",
      sortValue: (r) => r.f.contribution,
      render: (r) => (
        <span className="font-semibold">{inr(r.f.contribution)}</span>
      ),
    },
    {
      key: "m",
      header: "Margin",
      align: "right",
      sortValue: (r) => r.f.marginPct,
      render: (r) => `${r.f.marginPct}%`,
    },
  ]
  const sel = profit.find((p) => p.i.id === openInst)
  const openProfit = (id: string) => {
    setOpenInst(id)
    try {
      localStorage.setItem(PROFIT_REVIEW_KEY, id)
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Management"
        title="Director dashboard"
        description="Invoiced revenue, collections, recorded job costs and operational load."
        badges={<DemoBadge />}
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs
          value={period}
          onChange={setPeriod}
          tabs={[
            { id: "today", label: "Today" },
            { id: "week", label: "This week" },
            { id: "month", label: "This month" },
            { id: "custom", label: "Custom range" },
          ]}
        />
        {period === "custom" && (
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <DatePicker
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-auto"
              aria-label="From date"
            />{" "}
            to{" "}
            <DatePicker
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-auto"
              aria-label="To date"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Revenue (invoiced)"
          value={compactInr(m.invoiced)}
          sub={`Collected in period ${compactInr(m.collected)}`}
          icon={<Receipt className="h-4 w-4" />}
          to="/app/orders"
        />
        <StatCard
          label="Recorded costs"
          value={compactInr(m.costs)}
          sub="Completed jobs in period"
          icon={<Wallet className="h-4 w-4" />}
          accent="amber"
          to="/app/reports#profitability"
        />
        <StatCard
          label="Project contribution"
          value={compactInr(m.contribution)}
          sub="Job-level, not net company profit"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="emerald"
          to="/app/reports#profitability"
        />
        <StatCard
          label="Completed installations"
          value={m.completed}
          sub="In period"
          icon={<PackageCheck className="h-4 w-4" />}
          accent="emerald"
          to="/app/installations?status=Completed"
        />
        <StatCard
          label="Pending installations"
          value={m.pending}
          sub="All open jobs"
          icon={<PackageCheck className="h-4 w-4" />}
          accent="gold"
          to="/app/installations?status=Scheduled"
        />
        <StatCard
          label="Open service tickets"
          value={m.tickets}
          icon={<Wrench className="h-4 w-4" />}
          accent="amber"
          to="/app/service-tickets"
        />
        <StatCard
          label="Outstanding payments"
          value={compactInr(m.outstanding)}
          sub="Invoiced, not yet collected"
          icon={<HandCoins className="h-4 w-4" />}
          accent="danger"
          to="/app/orders"
        />
        <StatCard
          label="Inventory value"
          value={compactInr(m.inventory)}
          sub="At unit cost"
          icon={<Boxes className="h-4 w-4" />}
          to="/app/inventory"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Monthly sales"
          description="Sales order value by month (last 6 months)"
        >
          <ResponsiveContainer>
            <BarChart data={months} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#E3EAE2" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#708078" }} />
              <YAxis
                tickFormatter={(v) => compactInr(v)}
                tick={{ fontSize: 11, fill: "#708078" }}
                width={64}
              />
              <Tooltip formatter={(v) => inr(Number(v))} {...tip} />
              <Bar
                dataKey="sales"
                name="Sales"
                fill="#217A50"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Revenue versus recorded costs"
          description="Completed installations by month"
        >
          <ResponsiveContainer>
            <LineChart data={months} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#E3EAE2" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#708078" }} />
              <YAxis
                tickFormatter={(v) => compactInr(v)}
                tick={{ fontSize: 11, fill: "#708078" }}
                width={64}
              />
              <Tooltip formatter={(v) => inr(Number(v))} {...tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                dataKey="revenue"
                name="Invoiced revenue"
                stroke="#38B878"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                dataKey="costs"
                name="Recorded costs"
                stroke="#E7A934"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Installation trends"
          description="Completed installations and new enquiries"
        >
          <ResponsiveContainer>
            <LineChart data={months} margin={{ left: -16, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#E3EAE2" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#708078" }} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#708078" }}
              />
              <Tooltip {...tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                dataKey="installs"
                name="Installations"
                stroke="#103D2D"
                strokeWidth={2.5}
              />
              <Line
                dataKey="enquiries"
                name="Enquiries"
                stroke="#F4C542"
                strokeWidth={2.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="grid gap-6 md:grid-cols-2">
          <ChartCard title="Enquiry sources" height={230}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={sources}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {sources.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Lead conversion" height={230}>
            <ResponsiveContainer>
              <BarChart
                data={funnel}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "#708078" }}
                  width={70}
                />
                <Tooltip {...tip} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {funnel.map((_, i) => (
                    <Cell
                      key={i}
                      fill={["#C9D9CF", "#9DB8A8", "#217A50", "#38B878"][i]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard
          title="Technician workload"
          description="Active jobs and hours logged (last 90 days)"
          className="xl:col-span-2"
        >
          <ResponsiveContainer>
            <BarChart data={workload} margin={{ left: -16, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#E3EAE2" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#708078" }} />
              <YAxis
                yAxisId="a"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#708078" }}
              />
              <YAxis
                yAxisId="h"
                orientation="right"
                tick={{ fontSize: 11, fill: "#708078" }}
              />
              <Tooltip {...tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                yAxisId="a"
                dataKey="active"
                name="Active jobs"
                fill="#F4C542"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                yAxisId="h"
                dataKey="hours"
                name="Hours logged"
                fill="#217A50"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Panel
        id="profitability"
        title="Project profitability"
        description="Job contribution = invoiced + service revenue − recorded equipment, labour, logistics and service costs. Overheads are not allocated, so this is not net company profit."
        className="mt-6 scroll-mt-24"
        bodyClass="p-0"
      >
        <DataTable
          rows={profit}
          columns={pCols}
          rowKey={(r) => r.i.id}
          rowLabel={(r) => `profitability ${r.i.reference}`}
          onRowClick={(r) => openProfit(r.i.id)}
          initialSort={{ key: "done", dir: "desc" }}
        />
      </Panel>
      <Drawer
        open={!!sel}
        onClose={() => setOpenInst(null)}
        title={sel ? `Job costs — ${sel.i.reference}` : ""}
        description={
          sel ? `${sel.c?.name} · ${sel.i.capacity} kW ${sel.i.systemType}` : ""
        }
      >
        {sel && (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Invoiced", sel.f.invoiced],
                ["Collected", sel.f.collected],
                ["Outstanding", sel.f.outstanding],
              ].map(([k, v]) => (
                <div
                  key={k as string}
                  className="rounded-xl bg-forest/[0.04] p-2"
                >
                  <p className="text-[11px] text-muted uppercase">{k}</p>
                  <p className="font-semibold tabular-nums">
                    {inr(v as number)}
                  </p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 font-semibold text-ink">
                Equipment (at unit cost)
              </p>
              <ul className="divide-y divide-forest/7">
                {sel.f.equipmentLines.map((l) => (
                  <li
                    key={l.label}
                    className="flex justify-between gap-2 py-1.5"
                  >
                    <span>
                      {l.label} × {l.qty}
                    </span>
                    <span className="tabular-nums">{inr(l.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="space-y-1.5">
              {[
                ["Equipment cost", sel.f.equipmentCost],
                [
                  `Labour (${sel.f.labourHours} h × ${inr(db.settings.technicianHourlyCost)})`,
                  sel.f.labourCost,
                ],
                ["Logistics", sel.f.logistics],
                ["Service visits (parts + labour)", sel.f.serviceCost],
                ["Total recorded costs", sel.f.totalCost],
                ["Service revenue", sel.f.serviceRevenue],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="tabular-nums">{inr(v as number)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-2 border-t border-forest/10 pt-2 text-base font-semibold">
                <dt>Job contribution</dt>
                <dd className="tabular-nums">
                  {inr(sel.f.contribution)} ({sel.f.marginPct}%)
                </dd>
              </div>
            </dl>
            <p className="text-[12px] text-muted">
              <CircleDollarSign className="mr-1 inline h-3.5 w-3.5" />
              Collected payments are shown separately from invoiced revenue.
              Sample cost rates in demo mode.
            </p>
          </div>
        )}
      </Drawer>
    </>
  )
}
