import { Check, Lock } from "lucide-react"
import type { ChecklistKey, Installation } from "@/lib/types"
import { CHECKLIST_ITEMS } from "@/lib/types"
import { AUTO_CHECKLIST } from "@/lib/rules"

export function TechnicianChecklist({
  inst,
  onToggle,
  disabled,
  pendingKey,
}: {
  inst: Installation
  onToggle: (k: ChecklistKey, v: boolean) => void
  disabled?: boolean
  pendingKey?: string | null
}) {
  return (
    <ul className="divide-y divide-forest/7">
      {CHECKLIST_ITEMS.map((item, i) => {
        const auto = (AUTO_CHECKLIST as readonly string[]).includes(item.key)
        const checked = inst.checklist[item.key]
        const busy = pendingKey === `chk-${item.key}`
        return (
          <li key={item.key}>
            <button
              type="button"
              disabled={disabled || auto || busy}
              onClick={() => onToggle(item.key, !checked)}
              aria-pressed={checked}
              className="flex w-full items-center gap-3 py-3 text-left disabled:cursor-default"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-300 ${
                  checked
                    ? "bg-emerald text-forest"
                    : "border border-forest/18 bg-white text-muted"
                }`}
              >
                {busy ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : checked ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`flex-1 text-[14px] ${
                  checked ? "text-ink" : "text-ink/80"
                }`}
              >
                {item.label}
              </span>
              {auto && (
                <span className="inline-flex items-center gap-1 rounded-full bg-forest/5 px-2 py-0.5 text-[11px] text-muted">
                  <Lock className="h-3 w-3" /> Auto from evidence
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
