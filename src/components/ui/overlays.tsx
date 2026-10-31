import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react"

/* ================================ Tooltip ================================= */

export function Tooltip({
  content,
  children,
  side = "top",
  className = "",
}: {
  content: ReactNode
  children: ReactNode
  side?: "top" | "bottom"
  className?: string
}) {
  const id = useId()
  return (
    <span
      className={`group/tt relative inline-flex ${className}`}
      aria-describedby={id}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-[70] w-max max-w-[260px] -translate-x-1/2 rounded-xl bg-forest px-3 py-2 text-left text-[12px] leading-snug font-normal text-white opacity-0 shadow-[0_12px_30px_-10px_rgb(6_28_20/0.6)] transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100 ${
          side === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
        }`}
      >
        {content}
      </span>
    </span>
  )
}

/* ============================ Modal & Drawer ============================== */

function useOverlay(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], input:not([type=hidden]):not([disabled]), textarea, select, button:not([data-close])",
      )
      ;(el ?? panelRef.current)?.focus()
    })
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [open, onClose])
  return panelRef
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: "sm" | "md" | "lg" | "xl"
}

const MODAL_SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const panelRef = useOverlay(open, onClose)
  const titleId = useId()
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="anim-overlay absolute inset-0 bg-[#0B2A1F]/35 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`glass glass-modal anim-panel relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[28px] outline-none sm:rounded-[28px] ${MODAL_SIZES[size]}`}
      >
        <div className="flex items-start gap-4 border-b border-forest/8 px-6 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-[-0.01em] text-ink"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-muted">{description}</p>
            )}
          </div>
          <button
            data-close
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-ink/60 hover:bg-forest/6 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-forest/8 bg-white/60 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "max-w-xl",
  tone = "light",
}: ModalProps & { width?: string; tone?: "light" | "ai" }) {
  const panelRef = useOverlay(open, onClose)
  const titleId = useId()
  if (!open) return null
  const dark = tone === "ai"
  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div
        className="anim-overlay absolute inset-0 bg-[#0B2A1F]/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`glass anim-drawer relative flex h-full w-full flex-col outline-none sm:m-3 sm:h-[calc(100%-1.5rem)] sm:rounded-[28px] ${width} ${
          dark ? "glass-ai text-white" : "glass-modal"
        }`}
      >
        <div
          className={`flex items-start gap-4 border-b px-6 pt-5 pb-4 ${
            dark ? "border-white/10" : "border-forest/8"
          }`}
        >
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className={`text-lg font-semibold tracking-[-0.01em] ${
                dark ? "text-white" : "text-ink"
              }`}
            >
              {title}
            </h2>
            {description && (
              <div
                className={`mt-1 text-sm ${
                  dark ? "text-white/70" : "text-muted"
                }`}
              >
                {description}
              </div>
            )}
          </div>
          <button
            data-close
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className={`-mr-2 flex h-9 w-9 items-center justify-center rounded-full ${
              dark
                ? "text-white/70 hover:bg-white/10"
                : "text-ink/60 hover:bg-forest/6"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer && (
          <div
            className={`flex flex-wrap items-center justify-end gap-2 border-t px-6 py-4 ${
              dark ? "border-white/10" : "border-forest/8 bg-white/60"
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/* ========================== Confirmation dialog =========================== */

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "primary",
  reasonLabel,
  reasonRequired,
  children,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<unknown> | void
  title: string
  description?: ReactNode
  confirmLabel?: string
  tone?: "primary" | "danger" | "dark"
  reasonLabel?: string
  reasonRequired?: boolean
  children?: ReactNode
}) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (open) {
      setReason("")
      setTouched(false)
    }
  }, [open])
  const invalid = reasonRequired && !reason.trim()
  const run = async () => {
    setTouched(true)
    if (invalid) return
    setBusy(true)
    try {
      await onConfirm(reason)
      onClose()
    } catch {
      /* error surfaced by caller toast */
    } finally {
      setBusy(false)
    }
  }
  const btn =
    tone === "danger"
      ? "bg-[#A93A26] text-white hover:bg-[#93311f]"
      : tone === "dark"
        ? "bg-forest text-white hover:bg-[#164b38]"
        : "bg-emerald text-forest hover:bg-[#45C484]"
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-full px-4 text-sm font-medium text-ink/75 hover:bg-forest/6"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition active:scale-[0.97] disabled:opacity-50 ${btn}`}
          >
            {busy && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
      {reasonLabel && (
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">
            {reasonLabel}
            {reasonRequired && <span className="text-[#A93A26]"> *</span>}
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={touched && invalid}
            className="field"
            data-autofocus
          />
          {touched && invalid && (
            <span className="mt-1 block text-[12px] text-[#A93A26]">
              This field is required.
            </span>
          )}
        </label>
      )}
    </Modal>
  )
}

/* ============================== Dropdown menu ============================= */

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  disabled?: boolean
  hint?: string
  danger?: boolean
}

export function DropdownMenu({
  trigger,
  items,
  align = "right",
  header,
  width = "w-56",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  items: MenuItem[]
  align?: "left" | "right"
  header?: ReactNode
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])
  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          role="menu"
          className={`glass glass-modal anim-pop absolute top-[calc(100%+8px)] z-[60] overflow-hidden rounded-2xl p-1.5 ${width} ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {header}
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              title={item.disabled ? item.hint : undefined}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                item.danger
                  ? "text-[#A93A26] hover:bg-[#A93A26]/6"
                  : "text-ink hover:bg-forest/6"
              }`}
            >
              {item.icon && <span className="text-muted">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================================= Toasts ================================= */

type ToastTone = "success" | "error" | "info" | "warning"
interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

const ToastCtx = createContext<(t: Omit<ToastItem, "id">) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

const TOAST_ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald" />,
  error: <XCircle className="h-5 w-5 text-[#C2412D]" />,
  info: <Info className="h-5 w-5 text-botanical" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const dismiss = useCallback(
    (id: number) => setItems((l) => l.filter((t) => t.id !== id)),
    [],
  )
  const push = useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.random()
      setItems((l) => [...l.slice(-3), { ...t, id }])
      setTimeout(() => dismiss(id), t.tone === "error" ? 7000 : 4500)
    },
    [dismiss],
  )
  useEffect(() => {
    const onFull = () =>
      push({
        tone: "warning",
        title: "Browser storage is full",
        description:
          "Recent demo changes may not persist after reload. Remove some photos or reset demo data in Settings.",
      })
    window.addEventListener("sunflow:storage-full", onFull)
    return () => window.removeEventListener("sunflow:storage-full", onFull)
  }, [push])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 left-4 z-[100] flex flex-col items-end gap-2 sm:left-auto"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="glass glass-notice anim-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3"
          >
            <span className="mt-0.5 shrink-0">{TOAST_ICON[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-[13px] leading-snug text-ink/70">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="-mr-1 rounded-full p-1 text-ink/50 hover:bg-forest/6 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
