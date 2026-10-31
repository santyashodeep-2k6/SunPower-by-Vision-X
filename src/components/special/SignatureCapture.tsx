import { useEffect, useRef, useState } from "react"
import { Eraser } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { FormField, TextInput } from "@/components/ui/forms"

export function SignatureCapture({
  defaultName = "",
  existing,
  onSave,
  disabled,
  saving,
}: {
  defaultName?: string
  existing?: { name: string; dataUrl: string; at: string }
  onSave: (name: string, dataUrl: string) => void
  disabled?: boolean
  saving?: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)
  const [name, setName] = useState(defaultName)
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ratio = window.devicePixelRatio || 1
    c.width = c.offsetWidth * ratio
    c.height = c.offsetHeight * ratio
    const ctx = c.getContext("2d")!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.4
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#18352A"
  }, [existing])
  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  if (existing)
    return (
      <div className="rounded-2xl border border-emerald/30 bg-emerald/[0.05] p-4">
        <img
          src={existing.dataUrl}
          alt={`Signature of ${existing.name}`}
          className="h-24 w-full rounded-xl bg-white object-contain"
        />
        <p className="mt-2 text-[13px] text-ink">
          Signed by <span className="font-medium">{existing.name}</span> ·{" "}
          {new Date(existing.at).toLocaleString("en-IN")}
        </p>
      </div>
    )
  return (
    <div className="space-y-3">
      <FormField label="Customer name" required>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />
      </FormField>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[13px] font-medium text-ink">Signature</span>
          <button
            type="button"
            onClick={() => {
              const c = canvas.current!
              c.getContext("2d")!.clearRect(0, 0, c.width, c.height)
              setHasInk(false)
            }}
            className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink"
          >
            <Eraser className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
        <canvas
          ref={canvas}
          aria-label="Signature pad — draw with finger, stylus or mouse"
          role="img"
          className={`h-36 w-full touch-none rounded-2xl border border-dashed bg-white ${
            disabled ? "opacity-50" : "cursor-crosshair border-forest/25"
          }`}
          onPointerDown={(e) => {
            if (disabled) return
            drawing.current = true
            const ctx = canvas.current!.getContext("2d")!
            const p = pos(e)
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            canvas.current!.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return
            const ctx = canvas.current!.getContext("2d")!
            const p = pos(e)
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
            setHasInk(true)
          }}
          onPointerUp={() => (drawing.current = false)}
        />
      </div>
      <Button
        variant="dark"
        disabled={disabled || !hasInk || !name.trim()}
        loading={saving}
        onClick={() => onSave(name, canvas.current!.toDataURL("image/png"))}
      >
        Capture customer acceptance
      </Button>
    </div>
  )
}
