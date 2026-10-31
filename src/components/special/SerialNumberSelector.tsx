import { X } from "lucide-react"
import { SearchableDropdown } from "@/components/ui/forms"

export function SerialNumberSelector({
  allocated,
  required,
  available,
  onAdd,
  onRemove,
  disabled,
}: {
  allocated: string[]
  required: number
  available: string[]
  onAdd: (s: string) => void
  onRemove: (s: string) => void
  disabled?: boolean
}) {
  const full = allocated.length >= required
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px]">
        <span className="text-muted">
          Allocated{" "}
          <span
            className={`font-semibold tabular-nums ${
              full ? "text-botanical" : "text-ink"
            }`}
          >
            {allocated.length}
          </span>{" "}
          / {required}
        </span>
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-forest/8">
          <span
            className="block h-full rounded-full bg-emerald transition-all"
            style={{
              width: `${Math.min(100, (allocated.length / required) * 100)}%`,
            }}
          />
        </span>
      </div>
      {allocated.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {allocated.map((s) => (
            <li
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-emerald/12 py-0.5 pr-1 pl-2.5 font-mono text-[12px] text-[#17673F]"
            >
              {s}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(s)}
                  aria-label={`Remove ${s}`}
                  className="rounded-full p-0.5 hover:bg-emerald/20"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && !full && (
        <SearchableDropdown
          placeholder="Pick from available serials…"
          options={available.map((s) => ({ value: s, label: s }))}
          onChange={onAdd}
          emptyText="No unallocated serials in stock"
        />
      )}
    </div>
  )
}
