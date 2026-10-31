import { useMemo, useState } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  Bot,
  CalendarPlus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Headset,
  HelpCircle,
  IndianRupee,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Zap,
} from "lucide-react"
import type { Conversation, DemoDB, Lead } from "@/lib/types"
import { fmtDateTime, inr, relative } from "@/lib/format"
import { calculateSolarEstimate } from "@/services/assistant"
import { StatusBadge } from "@/components/ui/feedback"

interface Props {
  db: DemoDB
  className?: string
}

export function AIAssistantInsightsCard({ db, className = "" }: Props) {
  const [filter, setFilter] = useState<"all" | "needs-human" | "high-intent">("all")

  // Synthesize AI prospect insights across live conversations and AI-originated leads
  const insights = useMemo(() => {
    // 1. Gather all conversations
    const convItems = db.conversations.map((conv) => {
      const cust = db.customers.find(
        (c) => c.id === conv.customerId || (conv.collected.phone && c.phone === conv.collected.phone),
      )
      const lead = db.leads.find(
        (l) => l.id === conv.leadId || (cust && l.customerId === cust.id),
      )
      const site = cust ? db.sites.find((s) => s.customerId === cust.id) : undefined

      const bill = conv.collected.monthlyBill || lead?.monthlyBill
      const kw = conv.collected.capacity || lead?.preferredCapacity
      const systemType = conv.collected.systemType || lead?.systemType || "On-Grid"
      const estimate =
        bill || kw
          ? calculateSolarEstimate({
              monthlyBill: bill,
              preferredCapacity: kw,
              systemType,
              roofArea: conv.collected.roofArea || lead?.roofArea,
            })
          : undefined

      const customerName = cust?.name || conv.collected.name || "Website Visitor"
      const phone = cust?.phone || conv.collected.phone
      const city = conv.collected.city || site?.city || "Pune"
      const propertyType = conv.collected.propertyType || site?.propertyType || "Residential"

      // AI Intent Score calculation
      let score = 50
      if (phone) score += 20
      if (bill) score += 15
      if (conv.collected.capacity || conv.collected.roofArea) score += 10
      if (conv.status === "Needs Human") score += 5

      // Key AI-extracted discussion points
      const keyPoints: string[] = []
      if (bill) {
        keyPoints.push(`Monthly electricity bill: ${inr(bill)} (${estimate?.monthlyUnits ?? 400} units/mo)`)
      }
      if (estimate) {
        keyPoints.push(`Recommended: ${estimate.capacityKw} kW ${systemType}`)
        if (estimate.subsidy > 0) {
          keyPoints.push(`Eligible for ${inr(estimate.subsidy)} PM Surya Ghar DBT cash subsidy`)
          keyPoints.push(`Estimated turnkey cost: ${inr(estimate.grossCost)} (Net: ${inr(estimate.netCost)})`)
        }
      }
      if (conv.collected.roofArea) {
        keyPoints.push(`Available rooftop space: ~${conv.collected.roofArea} sq ft`)
      }

      // Check last customer messages for high-intent keywords
      const lastUserMsg = [...conv.messages].reverse().find((m) => m.from === "customer")?.text || ""
      const lower = lastUserMsg.toLowerCase()
      if (lower.includes("subsidy") || lower.includes("subsid")) {
        keyPoints.push("Inquired specifically about government PM Surya Ghar subsidy payout & timeline")
      }
      if (lower.includes("price") || lower.includes("cost") || lower.includes("rate")) {
        keyPoints.push("Requested turnkey equipment & net metering pricing breakdown")
      }
      if (lower.includes("ac") || lower.includes("air conditioner")) {
        keyPoints.push("Wants solar to power daytime air-conditioning load")
      }
      if (lower.includes("survey") || lower.includes("visit") || lower.includes("inspection")) {
        keyPoints.push("Ready for free on-site shadow mapping & engineering survey")
      }

      return {
        id: conv.id,
        leadId: lead?.id,
        customerId: cust?.id,
        type: "conversation" as const,
        name: customerName,
        phone,
        city,
        propertyType,
        channel: conv.channel,
        language: conv.language || "English",
        status: conv.status,
        score,
        bill,
        estimate,
        keyPoints,
        lastMessage: lastUserMsg,
        updatedAt: conv.updatedAt,
      }
    })

    // 2. Also incorporate AI Assistant leads with rich summaries
    const aiLeadItems = db.leads
      .filter((l) => l.source === "AI Assistant" && !convItems.some((c) => c.leadId === l.id))
      .map((lead) => {
        const cust = db.customers.find((c) => c.id === lead.customerId)
        const site = db.sites.find((s) => s.id === lead.siteId)
        const estimate = calculateSolarEstimate({
          monthlyBill: lead.monthlyBill,
          preferredCapacity: lead.preferredCapacity,
          systemType: lead.systemType,
          roofArea: lead.roofArea,
        })

        const keyPoints: string[] = []
        if (lead.monthlyBill) keyPoints.push(`Monthly electricity bill: ${inr(lead.monthlyBill)}`)
        if (estimate) {
          keyPoints.push(`Recommended: ${estimate.capacityKw} kW ${lead.systemType || "On-Grid"}`)
          if (estimate.subsidy > 0) keyPoints.push(`Eligible for ${inr(estimate.subsidy)} PM Surya Ghar subsidy`)
        }
        if (lead.aiSummary?.summary) {
          keyPoints.push(lead.aiSummary.summary)
        }

        return {
          id: lead.id,
          leadId: lead.id,
          customerId: cust?.id,
          type: "lead" as const,
          name: cust?.name || "AI Inquired Prospect",
          phone: cust?.phone,
          city: site?.city || "Pune",
          propertyType: site?.propertyType || "Residential",
          channel: "AI Assistant" as const,
          language: cust?.language || "English",
          status: lead.status as any,
          score: lead.aiSummary?.score || 80,
          bill: lead.monthlyBill,
          estimate,
          keyPoints,
          lastMessage: lead.requirements || "Submitted solar assessment via SunFlow AI Assistant",
          updatedAt: lead.updatedAt || lead.createdAt,
        }
      })

    const combined = [...convItems, ...aiLeadItems].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )

    return combined
  }, [db])

  // Top metric counters
  const totalSubsidiesUnlocked = useMemo(() => {
    return insights.reduce((sum, item) => sum + (item.estimate?.subsidy || 0), 0)
  }, [insights])

  const needsHumanCount = useMemo(() => {
    return insights.filter((i) => i.status === "Needs Human").length
  }, [insights])

  const highIntentCount = useMemo(() => {
    return insights.filter((i) => i.score >= 70).length
  }, [insights])

  const filtered = useMemo(() => {
    if (filter === "needs-human") {
      return insights.filter((i) => i.status === "Needs Human")
    }
    if (filter === "high-intent") {
      return insights.filter((i) => i.score >= 70)
    }
    return insights
  }, [insights, filter])

  return (
    <div className={`surface overflow-hidden border border-emerald/20 shadow-sm ${className}`}>
      {/* Header with AI gradient & intent filter tabs */}
      <div className="flex flex-col gap-3 border-b border-forest/10 bg-gradient-to-r from-emerald/10 via-sunshine/10 to-transparent p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-sunshine shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-ink">
                AI Prospect Intelligence & Live Chat Insights
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald/20 px-2 py-0.5 text-[11px] font-semibold text-botanical">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
                Live Sync
              </span>
            </div>
            <p className="text-[12.5px] text-muted">
              Live customer specifications, sizing, and buying intent synthesized automatically by the AI Assistant.
            </p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
              filter === "all"
                ? "bg-forest text-white"
                : "bg-forest/5 text-ink hover:bg-forest/10"
            }`}
          >
            All Insights ({insights.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("needs-human")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium transition ${
              filter === "needs-human"
                ? "bg-amber text-white font-semibold"
                : "bg-amber/15 text-[#835400] hover:bg-amber/25"
            }`}
          >
            <Headset className="h-3.5 w-3.5" />
            Needs Advisor ({needsHumanCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("high-intent")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium transition ${
              filter === "high-intent"
                ? "bg-botanical text-white font-semibold"
                : "bg-emerald/15 text-botanical hover:bg-emerald/25"
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber" />
            High Intent ({highIntentCount})
          </button>
        </div>
      </div>

      {/* AI Key Insights Summary Bar */}
      <div className="grid grid-cols-2 divide-x divide-forest/8 border-b border-forest/8 bg-[#FBFDFB] text-center md:grid-cols-4">
        <div className="p-3">
          <p className="text-[11px] font-medium text-muted uppercase">Live Captured Prospects</p>
          <p className="text-[20px] font-bold text-ink">{insights.length}</p>
        </div>
        <div className="p-3">
          <p className="text-[11px] font-medium text-muted uppercase">Subsidy Unlocked</p>
          <p className="text-[20px] font-bold text-botanical">{inr(totalSubsidiesUnlocked)}</p>
        </div>
        <div className="p-3">
          <p className="text-[11px] font-medium text-muted uppercase">High-Intent Leads</p>
          <p className="text-[20px] font-bold text-ink">
            {highIntentCount} <span className="text-[12px] font-normal text-muted">({Math.round((highIntentCount / Math.max(1, insights.length)) * 100)}%)</span>
          </p>
        </div>
        <div className="p-3">
          <p className="text-[11px] font-medium text-muted uppercase">Advisor Intervention</p>
          <p className={`text-[20px] font-bold ${needsHumanCount > 0 ? "text-[#C2412D]" : "text-muted"}`}>
            {needsHumanCount}
          </p>
        </div>
      </div>

      {/* Prospect cards list */}
      <div className="divide-y divide-forest/7">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <Bot className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm font-medium">No prospects match this filter.</p>
          </div>
        ) : (
          filtered.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className={`p-4 transition hover:bg-[#F8FAF7] ${
                item.status === "Needs Human" ? "bg-amber/[0.04]" : ""
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                {/* Left: User profile & details */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-ink">{item.name}</span>

                    {/* AI Intent score pill */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                        item.score >= 80
                          ? "bg-emerald/15 text-botanical"
                          : item.score >= 60
                            ? "bg-sunshine/25 text-[#735100]"
                            : "bg-forest/8 text-muted"
                      }`}
                    >
                      {item.score >= 80 ? (
                        <Flame className="h-3 w-3 text-amber fill-amber" />
                      ) : (
                        <Zap className="h-3 w-3 text-emerald" />
                      )}
                      Score: {item.score}/100
                    </span>

                    {item.status === "Needs Human" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#C2412D]/12 px-2 py-0.5 text-[11px] font-bold text-[#A93A26]">
                        <Headset className="h-3 w-3" />
                        Advisor Requested
                      </span>
                    )}

                    <span className="text-[11.5px] text-muted">· {relative(item.updatedAt)}</span>
                  </div>

                  {/* Contact & Location coordinates */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
                    {item.phone && (
                      <a
                        href={`tel:${item.phone}`}
                        className="inline-flex items-center gap-1 font-medium text-ink hover:text-botanical hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 text-botanical" />
                        +91 {item.phone}
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted" />
                      {item.city} ({item.propertyType})
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-forest/6 px-1.5 py-0.5 text-[11.5px]">
                      Language: {item.language}
                    </span>
                  </div>
                </div>

                {/* Right: Quick Sales Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {item.leadId ? (
                    <Link
                      to={`/app/leads/${item.leadId}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-forest px-3 py-1.5 text-[12px] font-medium text-white shadow-xs transition hover:bg-forest/90"
                    >
                      <User className="h-3.5 w-3.5" />
                      Open Lead Profile
                    </Link>
                  ) : (
                    <Link
                      to={`/app/conversations?id=${item.id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-botanical px-3 py-1.5 text-[12px] font-medium text-white shadow-xs transition hover:bg-botanical/90"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Open Transcript
                    </Link>
                  )}

                  {item.phone && (
                    <a
                      href={`tel:${item.phone}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-forest/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink shadow-xs transition hover:bg-[#F2F7F2]"
                    >
                      <Phone className="h-3.5 w-3.5 text-botanical" />
                      Call
                    </a>
                  )}
                </div>
              </div>

              {/* Middle: What the user specified & AI Calculations */}
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-forest/8 bg-white p-2.5 shadow-2xs">
                  <span className="block text-[11px] font-medium text-muted">Electricity Bill</span>
                  <span className="text-sm font-semibold text-ink">
                    {item.bill ? inr(item.bill) + " / mo" : "Not specified"}
                  </span>
                </div>

                <div className="rounded-xl border border-forest/8 bg-white p-2.5 shadow-2xs">
                  <span className="block text-[11px] font-medium text-muted">Recommended Sizing</span>
                  <span className="text-sm font-semibold text-ink">
                    {item.estimate ? `${item.estimate.capacityKw} kW System` : "Sizing pending"}
                  </span>
                </div>

                <div className="rounded-xl border border-forest/8 bg-white p-2.5 shadow-2xs">
                  <span className="block text-[11px] font-medium text-muted">PM Surya Ghar Subsidy</span>
                  <span className="text-sm font-semibold text-botanical">
                    {item.estimate && item.estimate.subsidy > 0
                      ? inr(item.estimate.subsidy) + " Direct DBT"
                      : "Commercial / No Subsidy"}
                  </span>
                </div>

                <div className="rounded-xl border border-forest/8 bg-white p-2.5 shadow-2xs">
                  <span className="block text-[11px] font-medium text-muted">Estimated Net Outlay</span>
                  <span className="text-sm font-semibold text-ink">
                    {item.estimate
                      ? `${inr(item.estimate.netCost)} (~${item.estimate.paybackYears}Y payback)`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Bottom: AI Extracted Conversation Insights */}
              {item.keyPoints.length > 0 && (
                <div className="mt-2.5 rounded-xl border border-forest/8 bg-forest/[0.02] p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-botanical uppercase tracking-wider">
                    <Sparkles className="h-3 w-3 text-amber" />
                    AI Synthesized Sales Notes
                  </div>
                  <ul className="space-y-1 text-[12px] text-ink/80">
                    {item.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald font-bold">›</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Customer's quote */}
                  {item.lastMessage && (
                    <div className="mt-2 border-t border-forest/6 pt-1.5 text-[11.5px] text-muted italic">
                      " {item.lastMessage} "
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer link to all conversations */}
      <div className="flex items-center justify-between border-t border-forest/8 bg-[#FAFDF9] px-4 py-2.5 text-xs text-muted">
        <span>Showing top live AI visitor insights</span>
        <Link
          to="/app/conversations"
          className="inline-flex items-center gap-1 font-medium text-botanical hover:underline"
        >
          View all assistant conversations & transcripts
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

