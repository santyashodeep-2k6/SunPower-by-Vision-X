import type { DemoDB, Installation } from "@/lib/types"
import { fmtDate } from "@/lib/format"
import { byId } from "@/lib/rules"
import {
  ProgressTimeline,
  type StepState,
  type TimelineStep,
} from "@/components/ui/data"

export function installationSteps(
  db: DemoDB,
  inst: Installation,
): TimelineStep[] {
  const so = byId(db.salesOrders, inst.salesOrderId)
  const d = db.dispatches.find((x) => x.installationId === inst.id)
  const reserved =
    so &&
    [
      "Stock Reserved",
      "Dispatched",
      "Delivered",
      "Installed",
      "Closed",
    ].includes(so.status)
  const flags = [
    { label: "Order confirmed", done: !!so, date: so?.createdAt },
    {
      label: "Materials reserved",
      done: !!reserved,
      blocked: so?.status === "Awaiting Stock",
      description:
        so?.status === "Awaiting Stock" ? "Awaiting stock" : undefined,
    },
    {
      label: "Dispatched",
      done: d?.status === "Dispatched" || d?.status === "Delivered",
      date: d?.dispatchedAt,
    },
    {
      label: "Delivered",
      done: d?.status === "Delivered",
      date: d?.deliveredAt,
    },
    {
      label: "Scheduled",
      done: !!inst.scheduledAt && inst.crew.length > 0,
      date: inst.scheduledAt,
    },
    {
      label: "Installation",
      done: inst.status === "Completed",
      current: inst.status === "In Progress" || inst.status === "Paused",
      description: inst.status === "Paused" ? "Paused" : undefined,
    },
    {
      label: "Handover & warranty",
      done: inst.status === "Completed",
      date: inst.completedAt,
    },
  ]
  let currentAssigned = false
  return flags.map((f) => {
    let state: StepState = f.done ? "done" : "upcoming"
    if (!f.done && !currentAssigned) {
      state = f.blocked ? "blocked" : "current"
      currentAssigned = true
    }
    return {
      label: f.label,
      state,
      date: f.date ? fmtDate(f.date) : undefined,
      description: f.description,
    }
  })
}

export function InstallationProgressTracker({
  db,
  inst,
  orientation,
}: {
  db: DemoDB
  inst: Installation
  orientation?: "responsive" | "vertical"
}) {
  return (
    <ProgressTimeline
      steps={installationSteps(db, inst)}
      orientation={orientation}
    />
  )
}
