import { useRef, useState } from "react"
import { CheckCircle2, ScanLine, Wand2, XCircle } from "lucide-react"
import { errorMessage } from "@/services/apiClient"

/**
 * Serial capture. USB/Bluetooth scanners in keyboard mode type into the field
 * and press Enter. Without hardware, "Simulate scan" picks a valid demo serial.
 */
export function BarcodeScanPanel({
  onScan,
  suggest,
  label = "Scan or enter serial number",
  disabled,
  compact,
}: {
  onScan: (serial: string) => Promise<string | void> | void
  suggest?: () => string | undefined
  label?: string
  disabled?: boolean
  compact?: boolean
}) {
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null,
  )
  const input = useRef<HTMLInputElement>(null)
  const submit = async (serial: string) => {
    if (!serial.trim()) return
    setBusy(true)
    try {
      const r = await onScan(serial.trim().toUpperCase())
      setResult({
        ok: true,
        text: `${serial.trim().toUpperCase()} accepted${r ? ` — ${r}` : ""}`,
      })
      setValue("")
    } catch (e) {
      setResult({ ok: false, text: errorMessage(e) })
    } finally {
      setBusy(false)
      input.current?.focus()
    }
  }
  return (
    <div
      className={`rounded-2xl border border-forest/10 bg-[#F8FBF7] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      {!compact && (
        <div className="relative mb-3 flex h-24 items-center justify-center overflow-hidden rounded-xl bg-forest text-white/70">
          <div className="absolute inset-3 rounded-lg border border-dashed border-white/25" />
          <div className="scan-line absolute inset-x-6 h-0.5 rounded-full bg-sunshine shadow-[0_0_12px_rgb(244_197_66/0.9)]" />
          <span className="relative flex items-center gap-2 text-[12px]">
            <ScanLine className="h-4 w-4 text-sunshine" /> Scanner ready ·
            keyboard-wedge or manual entry
          </span>
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit(value)
        }}
      >
        <label className="sr-only" htmlFor={`scan-${label}`}>
          {label}
        </label>
        <input
          id={`scan-${label}`}
          ref={input}
          value={value}
          disabled={disabled || busy}
          onChange={(e) => setValue(e.target.value)}
          placeholder={label}
          autoComplete="off"
          spellCheck={false}
          className="field h-10 min-w-0 flex-1 font-mono text-[13px] uppercase"
        />
        <button
          type="submit"
          disabled={disabled || busy || !value.trim()}
          className="h-10 shrink-0 rounded-full bg-forest px-4 text-[13px] font-medium text-white transition hover:bg-[#164b38] active:scale-95 disabled:opacity-40"
        >
          {busy ? "Checking…" : "Validate"}
        </button>
        {suggest && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              const s = suggest()
              if (s) submit(s)
              else
                setResult({
                  ok: false,
                  text: "No unallocated serial available to simulate.",
                })
            }}
            title="Simulate a scanner read with the next valid serial (demo)"
            className="hidden h-10 shrink-0 items-center gap-1.5 rounded-full border border-sunshine/50 bg-sunshine/20 px-3 text-[12px] font-medium text-[#6E4E00] hover:bg-sunshine/30 disabled:opacity-40 sm:inline-flex"
          >
            <Wand2 className="h-3.5 w-3.5" /> Simulate scan
          </button>
        )}
      </form>
      {result && (
        <p
          role={result.ok ? "status" : "alert"}
          className={`mt-2 flex items-start gap-1.5 text-[12.5px] ${
            result.ok ? "text-[#17673F]" : "text-[#A93A26]"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          {result.text}
        </p>
      )}
    </div>
  )
}
