import { useMemo, useState } from "react"
import { Link } from "react-router"
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  HardHat,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  Zap,
} from "lucide-react"
import type {
  Customer,
  DemoDB,
  Installation,
  Lead,
  Survey,
  TechnicianAssignment,
  User as AppUser,
} from "@/lib/types"
import {
  addDays,
  fmtDate,
  fmtDateTime,
  inr,
  relative,
  toInputDateTime,
} from "@/lib/format"
import { scheduleInstallation } from "@/services/operations"
import { useAction } from "@/lib/useAction"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/overlays"

export type CustomerPhaseType =
  | "installation_active"
  | "already_installed"
  | "order_quotation"
  | "survey_evaluation"
  | "first_time_enquiry"

export type PriorityLevel = "Highest" | "Median" | "Medium-Low" | "Least"

export interface CustomerPhaseInfo {
  customer: Customer
  phase: CustomerPhaseType
  phaseLabel: string
  phaseDescription: string
  priority: PriorityLevel
  priorityWeight: number
  priorityColor: string
  priorityBadgeClass: string
  // Linked entity references
  lead?: Lead
  survey?: Survey
  installation?: Installation
  activeReference: string
  capacityKw?: number
  city: string
  assignedCrew: AppUser[]
  leadTechnician?: AppUser
  needsTechnicianAssignment: boolean
  lastActivityAt: string
}

export function resolveCustomerPhase(
  customer: Customer,
  db: DemoDB,
): CustomerPhaseInfo {
  const site = db.sites.find((s) => s.customerId === customer.id)
  const city = site?.city || "Pune"

  // 1. Check for Active Installation (Highest Priority)
  const activeInstall = db.installations.find(
    (i) =>
      i.customerId === customer.id &&
      ["Awaiting Materials", "Ready to Schedule", "Scheduled", "In Progress", "Paused"].includes(
        i.status,
      ),
  )

  if (activeInstall) {
    const crewUsers = activeInstall.crew
      .map((c) => db.users.find((u) => u.id === c.technicianId))
      .filter((u): u is AppUser => Boolean(u))
    const leadTechId = activeInstall.crew.find((c) => c.role === "Lead")?.technicianId
    const leadTech = db.users.find((u) => u.id === leadTechId)
    const needsTech = activeInstall.crew.length === 0 || activeInstall.status === "Ready to Schedule"

    return {
      customer,
      phase: "installation_active",
      phaseLabel: "Installation Phase Started",
      phaseDescription: `Installation ${activeInstall.reference} (${activeInstall.status})`,
      priority: "Highest",
      priorityWeight: 100,
      priorityColor: "#DC2626", // Red / Critical
      priorityBadgeClass: "bg-red-500/15 text-red-700 border-red-500/30",
      installation: activeInstall,
      activeReference: activeInstall.reference,
      capacityKw: activeInstall.capacity,
      city,
      assignedCrew: crewUsers,
      leadTechnician: leadTech,
      needsTechnicianAssignment: needsTech,
      lastActivityAt: activeInstall.scheduledAt || activeInstall.createdAt,
    }
  }

  // 2. Check for Completed Installation (Median Priority)
  const completedInstall = db.installations.find(
    (i) => i.customerId === customer.id && i.status === "Completed",
  )

  if (completedInstall) {
    const warranties = db.warranties.filter((w) => w.customerId === customer.id)
    return {
      customer,
      phase: "already_installed",
      phaseLabel: "Already Installed & Commissioned",
      phaseDescription: `Asset ${completedInstall.reference} (${warranties.length} warranties active)`,
      priority: "Median",
      priorityWeight: 60,
      priorityColor: "#16A34A", // Emerald / Median
      priorityBadgeClass: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30",
      installation: completedInstall,
      activeReference: completedInstall.reference,
      capacityKw: completedInstall.capacity,
      city,
      assignedCrew: [],
      needsTechnicianAssignment: false,
      lastActivityAt: completedInstall.completedAt || completedInstall.createdAt,
    }
  }

  // 3. Check for Committed Sales Order / Quotation
  const salesOrder = db.salesOrders.find((so) => so.customerId === customer.id)
  const quotation = db.quotations.find(
    (q) => q.customerId === customer.id && ["Sent", "Awaiting Response", "Accepted"].includes(q.status),
  )

  if (salesOrder || quotation) {
    return {
      customer,
      phase: "order_quotation",
      phaseLabel: "Quotation & Procurement",
      phaseDescription: salesOrder
        ? `Sales Order ${salesOrder.id} (${salesOrder.status})`
        : `Quotation ${quotation?.id} (${quotation?.status})`,
      priority: "Median",
      priorityWeight: 45,
      priorityColor: "#D97706", // Amber
      priorityBadgeClass: "bg-amber-500/15 text-amber-800 border-amber-500/30",
      activeReference: salesOrder?.id || quotation?.id || "ORDER",
      capacityKw: quotation?.capacity,
      city,
      assignedCrew: [],
      needsTechnicianAssignment: false,
      lastActivityAt: salesOrder?.createdAt || quotation?.createdAt || customer.createdAt,
    }
  }

  // 4. Check for Site Survey Scheduled / Evaluation
  const survey = db.surveys.find((s) => s.customerId === customer.id)
  if (survey) {
    const surveyor = db.users.find((u) => u.id === survey.surveyorId)
    return {
      customer,
      phase: "survey_evaluation",
      phaseLabel: "Site Survey & Assessment",
      phaseDescription: `Survey ${survey.id} (${survey.status}) · ${surveyor?.name || "Unassigned"}`,
      priority: "Medium-Low",
      priorityWeight: 30,
      priorityColor: "#2563EB", // Blue
      priorityBadgeClass: "bg-blue-500/15 text-blue-800 border-blue-500/30",
      survey,
      activeReference: survey.id,
      city,
      assignedCrew: surveyor ? [surveyor] : [],
      needsTechnicianAssignment: false,
      lastActivityAt: survey.scheduledAt || survey.createdAt,
    }
  }

  // 5. First Time Enquiry / Logged In (Least Priority)
  const lead = db.leads.find((l) => l.customerId === customer.id)
  return {
    customer,
    phase: "first_time_enquiry",
    phaseLabel: "First-Time Logged In / Enquiry",
    phaseDescription: lead ? `Lead ${lead.id} (${lead.status} · ${lead.source})` : "Initial Registration",
    priority: "Least",
    priorityWeight: 10,
    priorityColor: "#64748B", // Slate
    priorityBadgeClass: "bg-slate-500/15 text-slate-700 border-slate-500/30",
    lead,
    activeReference: lead?.id || customer.id,
    capacityKw: lead?.preferredCapacity,
    city,
    assignedCrew: [],
    needsTechnicianAssignment: false,
    lastActivityAt: lead?.updatedAt || lead?.createdAt || customer.createdAt,
  }
}

export function CustomerPhasePriorityCard({
  db,
  className = "",
}: {
  db: DemoDB
  className?: string
}) {
  const [filter, setFilter] = useState<"all" | "highest" | "median" | "least">("all")
  const [search, setSearch] = useState("")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc") // high-to-low by default
  const [assigningInst, setAssigningInst] = useState<Installation | null>(null)

  // Resolve phases for all customers
  const allPhases = useMemo(() => {
    return db.customers.map((c) => resolveCustomerPhase(c, db))
  }, [db])

  // Top metric counters
  const highestPriorityCount = useMemo(() => {
    return allPhases.filter((p) => p.priority === "Highest").length
  }, [allPhases])

  const medianPriorityCount = useMemo(() => {
    return allPhases.filter((p) => p.priority === "Median").length
  }, [allPhases])

  const leastPriorityCount = useMemo(() => {
    return allPhases.filter((p) => p.priority === "Least").length
  }, [allPhases])

  const unassignedCrewCount = useMemo(() => {
    return allPhases.filter((p) => p.phase === "installation_active" && p.needsTechnicianAssignment).length
  }, [allPhases])

  // Filtered & Sorted items
  const filtered = useMemo(() => {
    return allPhases
      .filter((p) => {
        if (filter === "highest") return p.priority === "Highest"
        if (filter === "median") return p.priority === "Median"
        if (filter === "least") return p.priority === "Least"
        return true
      })
      .filter((p) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
          p.customer.name.toLowerCase().includes(q) ||
          p.customer.phone.includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.activeReference.toLowerCase().includes(q) ||
          p.phaseLabel.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (sortOrder === "desc") {
          return b.priorityWeight - a.priorityWeight || b.lastActivityAt.localeCompare(a.lastActivityAt)
        }
        return a.priorityWeight - b.priorityWeight || a.lastActivityAt.localeCompare(b.lastActivityAt)
      })
  }, [allPhases, filter, search, sortOrder])

  return (
    <div className={`surface overflow-hidden border border-forest/15 shadow-sm ${className}`}>
      {/* Header with Title & Priority Control Explanation */}
      <div className="flex flex-col gap-3 border-b border-forest/10 bg-gradient-to-r from-forest/5 via-sunshine/5 to-transparent p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-sunshine shadow-xs">
            <HardHat className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-ink">
                Admin Customer Phase & Priority Dispatch Center
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-bold text-forest">
                Real-Time Sorter
              </span>
            </div>
            <p className="text-[12px] text-muted">
              Dynamically prioritizes customers by active milestone: <strong>Installation Phase (Highest)</strong> → <strong>Already Installed (Median)</strong> → <strong>First-Time Logged In (Least)</strong>.
            </p>
          </div>
        </div>

        {/* Sort Order Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            className="inline-flex items-center gap-1.5 rounded-xl border border-forest/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink shadow-2xs hover:bg-[#F2F7F2]"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-botanical" />
            Sort: {sortOrder === "desc" ? "Priority High → Low" : "Priority Low → High"}
          </button>
        </div>
      </div>

      {/* KPI Priority Counters Bar */}
      <div className="grid grid-cols-2 divide-x divide-forest/8 border-b border-forest/8 bg-[#FBFDFB] text-center md:grid-cols-4">
        <div
          onClick={() => setFilter("highest")}
          className={`cursor-pointer p-3 transition hover:bg-forest/5 ${
            filter === "highest" ? "bg-red-500/10 font-bold" : ""
          }`}
        >
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-red-600 uppercase">
            <Flame className="h-3.5 w-3.5" />
            Highest Priority
          </div>
          <p className="text-[20px] font-bold text-red-600">{highestPriorityCount}</p>
          <span className="text-[11px] text-muted">Installation Started</span>
        </div>

        <div
          onClick={() => setFilter("median")}
          className={`cursor-pointer p-3 transition hover:bg-forest/5 ${
            filter === "median" ? "bg-emerald-500/10 font-bold" : ""
          }`}
        >
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-700 uppercase">
            <ShieldCheck className="h-3.5 w-3.5" />
            Median Priority
          </div>
          <p className="text-[20px] font-bold text-botanical">{medianPriorityCount}</p>
          <span className="text-[11px] text-muted">Already Installed</span>
        </div>

        <div
          onClick={() => setFilter("least")}
          className={`cursor-pointer p-3 transition hover:bg-forest/5 ${
            filter === "least" ? "bg-slate-500/10 font-bold" : ""
          }`}
        >
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 uppercase">
            <Clock className="h-3.5 w-3.5" />
            Least Priority
          </div>
          <p className="text-[20px] font-bold text-slate-700">{leastPriorityCount}</p>
          <span className="text-[11px] text-muted">First-time Enquiries</span>
        </div>

        <div className="p-3">
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-700 uppercase">
            <AlertTriangle className="h-3.5 w-3.5" />
            Needs Technician
          </div>
          <p className={`text-[20px] font-bold ${unassignedCrewCount > 0 ? "text-amber-600" : "text-muted"}`}>
            {unassignedCrewCount}
          </p>
          <span className="text-[11px] text-muted">Ready for Assignment</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-2.5 border-b border-forest/10 p-3 sm:flex-row sm:items-center sm:justify-between bg-white">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
              filter === "all"
                ? "bg-forest text-white"
                : "bg-forest/5 text-ink hover:bg-forest/10"
            }`}
          >
            All Customers ({allPhases.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("highest")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium transition ${
              filter === "highest"
                ? "bg-red-600 text-white font-semibold"
                : "bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            Highest: Installation ({highestPriorityCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("median")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium transition ${
              filter === "median"
                ? "bg-botanical text-white font-semibold"
                : "bg-emerald-50 text-botanical hover:bg-emerald-100"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Median: Installed ({medianPriorityCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("least")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium transition ${
              filter === "least"
                ? "bg-slate-700 text-white font-semibold"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Least: Enquiries ({leastPriorityCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search customer, phone, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-forest/15 bg-[#F9FAF8] py-1.5 pl-8 pr-3 text-[12.5px] text-ink placeholder:text-muted focus:border-forest focus:outline-hidden"
          />
        </div>
      </div>

      {/* Customer Priority List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-forest/8 bg-[#F8FAF7] text-[11.5px] font-semibold uppercase text-muted">
            <tr>
              <th className="py-2.5 pl-4 pr-3">Priority Level</th>
              <th className="py-2.5 px-3">Customer Details</th>
              <th className="py-2.5 px-3">Current Phase & Ref</th>
              <th className="py-2.5 px-3">Technician Assignment</th>
              <th className="py-2.5 pr-4 pl-3 text-right">Admin Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest/7">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  No customers found matching this filter.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 8).map((item) => (
                <tr
                  key={item.customer.id}
                  className={`transition hover:bg-[#F9FCF8] ${
                    item.priority === "Highest"
                      ? "bg-red-500/[0.03]"
                      : item.priority === "Median"
                        ? "bg-emerald-500/[0.02]"
                        : ""
                  }`}
                >
                  {/* Priority Badge */}
                  <td className="py-3 pl-4 pr-3 align-top whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${item.priorityBadgeClass}`}
                      >
                        {item.priority === "Highest" ? (
                          <Flame className="h-3 w-3 fill-red-500 text-red-500" />
                        ) : item.priority === "Median" ? (
                          <CheckCircle2 className="h-3 w-3 text-botanical" />
                        ) : (
                          <Clock className="h-3 w-3 text-muted" />
                        )}
                        {item.priority} Priority
                      </span>
                      <span className="text-[10.5px] text-muted">Rank score: {item.priorityWeight}/100</span>
                    </div>
                  </td>

                  {/* Customer Information */}
                  <td className="py-3 px-3 align-top">
                    <div>
                      <span className="font-semibold text-ink">{item.customer.name}</span>
                      <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                        <a
                          href={`tel:${item.customer.phone}`}
                          className="hover:text-botanical hover:underline"
                        >
                          +91 {item.customer.phone}
                        </a>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {item.city}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Current Lifecycle Phase & Active Reference */}
                  <td className="py-3 px-3 align-top">
                    <div>
                      <span className="inline-block text-[12.5px] font-semibold text-ink">
                        {item.phaseLabel}
                      </span>
                      <p className="text-[11.5px] text-muted">{item.phaseDescription}</p>
                      {item.capacityKw && (
                        <span className="mt-0.5 inline-block rounded-md bg-forest/6 px-1.5 py-0.2 text-[11px] font-medium text-forest">
                          {item.capacityKw} kW System
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Assigned Technician or Crew Status */}
                  <td className="py-3 px-3 align-top">
                    {item.phase === "installation_active" ? (
                      item.leadTechnician ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-[11px] font-bold text-white">
                            {item.leadTechnician.name[0]}
                          </div>
                          <div>
                            <span className="block text-[12px] font-medium text-ink">
                              {item.leadTechnician.name}
                            </span>
                            <span className="text-[11px] text-muted">Lead Installer ({item.assignedCrew.length} crew)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-[12px] font-semibold">Unassigned Crew</span>
                        </div>
                      )
                    ) : item.phase === "already_installed" ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-botanical font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Commissioned & Verified
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted">Pre-installation stage</span>
                    )}
                  </td>

                  {/* Quick Admin Actions */}
                  <td className="py-3 pr-4 pl-3 align-top text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* If Active Installation: 1-Click Assign/Reschedule Technician */}
                      {item.installation && item.phase === "installation_active" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAssigningInst(item.installation!)}
                            className="inline-flex items-center gap-1 rounded-xl bg-forest px-2.5 py-1 text-[11.5px] font-medium text-white shadow-2xs transition hover:bg-forest/90"
                          >
                            <UserCheck className="h-3 w-3" />
                            {item.needsTechnicianAssignment ? "Assign Crew" : "Reassign Crew"}
                          </button>
                          <Link
                            to={`/app/installations/${item.installation.id}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-forest/15 bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink shadow-2xs hover:bg-[#F2F7F2]"
                          >
                            Worksheet
                          </Link>
                        </>
                      )}

                      {/* If Already Installed: Open Passport / Handover */}
                      {item.installation && item.phase === "already_installed" && (
                        <Link
                          to={`/app/passport/${item.installation.reference}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-botanical/15 px-2.5 py-1 text-[11.5px] font-semibold text-botanical transition hover:bg-botanical/25"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Asset Passport
                        </Link>
                      )}

                      {/* If Lead / First-time: Open Lead */}
                      {item.lead && item.phase === "first_time_enquiry" && (
                        <Link
                          to={`/app/leads/${item.lead.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-forest/15 bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink shadow-2xs hover:bg-[#F2F7F2]"
                        >
                          Open Lead
                        </Link>
                      )}

                      {/* If Survey */}
                      {item.survey && item.phase === "survey_evaluation" && (
                        <Link
                          to={`/app/surveys/${item.survey.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-forest/15 bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink shadow-2xs hover:bg-[#F2F7F2]"
                        >
                          Survey Details
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-between border-t border-forest/8 bg-[#FAFDF9] px-4 py-2.5 text-xs text-muted">
        <span>
          Showing {Math.min(8, filtered.length)} of {filtered.length} prioritized customers
        </span>
        <div className="flex items-center gap-3">
          <Link
            to="/app/installations"
            className="inline-flex items-center gap-1 font-medium text-botanical hover:underline"
          >
            Manage all active installations
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Inline Quick Technician Assignment Modal */}
      {assigningInst && (
        <QuickTechnicianAssignModal
          db={db}
          inst={assigningInst}
          onClose={() => setAssigningInst(null)}
        />
      )}
    </div>
  )
}

function QuickTechnicianAssignModal({
  db,
  inst,
  onClose,
}: {
  db: DemoDB
  inst: Installation
  onClose: () => void
}) {
  const { run, pending } = useAction()
  const techUsers = db.users.filter((u) => u.role === "installer" && u.active)
  const cust = db.customers.find((c) => c.id === inst.customerId)

  const [leadTech, setLeadTech] = useState(
    inst.crew.find((c) => c.role === "Lead")?.technicianId || (techUsers[0]?.id ?? "U-07"),
  )
  const [crewMembers, setCrewMembers] = useState<string[]>(
    inst.crew
      .filter((c) => c.role === "Crew")
      .map((c) => c.technicianId)
      .concat(inst.crew.length ? [] : [techUsers[1]?.id ?? "U-08"]),
  )
  const [scheduledAt, setScheduledAt] = useState(
    toInputDateTime(inst.scheduledAt || addDays(new Date(), 1).replace(/T.*/, "T03:30:00.000Z")),
  )
  const [expectedCompletion, setExpectedCompletion] = useState(
    toInputDateTime(inst.expectedCompletion || addDays(new Date(), 2).replace(/T.*/, "T12:30:00.000Z")),
  )

  const toggleCrew = (techId: string) => {
    if (crewMembers.includes(techId)) {
      setCrewMembers(crewMembers.filter((id) => id !== techId))
    } else {
      setCrewMembers([...crewMembers, techId])
    }
  }

  const handleSave = () => {
    const assignment: TechnicianAssignment[] = [
      { technicianId: leadTech, role: "Lead" },
      ...crewMembers
        .filter((c) => c !== leadTech)
        .map((c) => ({ technicianId: c, role: "Crew" as const })),
    ]

    return run(
      "assign-tech",
      () =>
        scheduleInstallation(inst.id, {
          scheduledAt: new Date(scheduledAt).toISOString(),
          expectedCompletion: new Date(expectedCompletion).toISOString(),
          crew: assignment,
        }),
      `Technicians assigned to ${inst.reference}`,
    )
      .then(onClose)
      .catch(() => undefined)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Assign Technicians: ${inst.reference}`}
      description={`Customer: ${cust?.name} · System: ${inst.capacity} kW ${inst.systemType}`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={pending === "assign-tech"}>
            Cancel
          </Button>
          <Button
            variant="dark"
            onClick={handleSave}
            loading={pending === "assign-tech"}
            icon={<UserCheck className="h-4 w-4" />}
          >
            Confirm Technician Assignment
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Lead Technician Select */}
        <div>
          <label className="block text-xs font-semibold text-ink uppercase mb-1">
            Lead Installation Technician (Required)
          </label>
          <select
            value={leadTech}
            onChange={(e) => setLeadTech(e.target.value)}
            className="w-full rounded-xl border border-forest/20 bg-white p-2.5 text-sm font-medium text-ink focus:border-forest focus:outline-hidden"
          >
            {techUsers.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name} ({tech.title}) - Phone: {tech.phone}
              </option>
            ))}
          </select>
        </div>

        {/* Crew Members Selection */}
        <div>
          <label className="block text-xs font-semibold text-ink uppercase mb-1">
            Additional Crew Members (Tick to assign)
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-forest/10 rounded-xl bg-forest/[0.02]">
            {techUsers
              .filter((t) => t.id !== leadTech)
              .map((tech) => {
                const checked = crewMembers.includes(tech.id)
                return (
                  <label
                    key={tech.id}
                    className={`flex items-center gap-2 rounded-lg p-2 text-xs cursor-pointer border transition ${
                      checked
                        ? "border-botanical/40 bg-emerald/10 font-semibold text-botanical"
                        : "border-transparent hover:bg-forest/5 text-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCrew(tech.id)}
                      className="rounded text-botanical focus:ring-forest"
                    />
                    <span>{tech.name}</span>
                  </label>
                )
              })}
          </div>
        </div>

        {/* Date / Time Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-xl border border-forest/20 bg-white p-2 text-sm text-ink focus:border-forest"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">
              Expected Completion
            </label>
            <input
              type="datetime-local"
              value={expectedCompletion}
              onChange={(e) => setExpectedCompletion(e.target.value)}
              className="w-full rounded-xl border border-forest/20 bg-white p-2 text-sm text-ink focus:border-forest"
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
