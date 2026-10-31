import {
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react"
import {
  AlertCircle,
  Check,
  ChevronDown,
  ImagePlus,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import type { Photo } from "@/lib/types"
import { uid } from "@/lib/format"

/* =============================== Primitives =============================== */

export function ValidationMessage({
  id,
  children,
}: {
  id?: string
  children?: ReactNode
}) {
  if (!children) return null
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[#A93A26]"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  )
}

/** Label + control + hint/error. Injects id/aria props into a single child control. */
export function FormField({
  label,
  required,
  hint,
  error,
  children,
  className = "",
  optional,
}: {
  label: ReactNode
  required?: boolean
  optional?: boolean
  hint?: ReactNode
  error?: string
  children: ReactNode
  className?: string
}) {
  const id = useId()
  const errId = `${id}-err`
  const hintId = `${id}-hint`
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby":
          [error ? errId : "", hint ? hintId : ""].filter(Boolean).join(" ") ||
          undefined,
        "aria-required": required || undefined,
      })
    : children
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-ink"
      >
        {label}
        {required && (
          <span className="text-[#A93A26]" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-[12.5px] text-muted">
          {hint}
        </p>
      )}
      <ValidationMessage id={errId}>{error}</ValidationMessage>
    </div>
  )
}

export const TextInput =
  forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & {
    prefix?: string
  }>(function TextInput({ className = "", prefix, ...rest }, ref) {
    if (prefix)
      return (
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-muted">
            {prefix}
          </span>
          <input ref={ref} className={`field pl-9 ${className}`} {...rest} />
        </div>
      )
    return <input ref={ref} className={`field ${className}`} {...rest} />
  })

export const TextArea =
  forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
    function TextArea({ className = "", rows = 3, ...rest }, ref) {
      return (
        <textarea
          ref={ref}
          rows={rows}
          className={`field ${className}`}
          {...rest}
        />
      )
    },
  )

export interface Option {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export const SelectInput =
  forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & {
    options: (Option | string)[]
    placeholder?: string
  }>(function SelectInput(
    { options, placeholder, className = "", ...rest },
    ref,
  ) {
    return (
      <select ref={ref} className={`field ${className}`} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o
          return (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          )
        })}
      </select>
    )
  })

export const DatePicker =
  forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    withTime?: boolean
  }>(function DatePicker({ withTime, className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        type={withTime ? "datetime-local" : "date"}
        className={`field ${className}`}
        {...rest}
      />
    )
  })

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  id?: string
}) {
  const auto = useId()
  const cid = id ?? auto
  return (
    <label
      htmlFor={cid}
      className={`flex items-start gap-3 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <span className="relative mt-0.5 inline-flex">
        <input
          id={cid}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-emerald/25 ${
            checked
              ? "border-emerald bg-emerald text-forest"
              : "border-forest/25 bg-white"
          }`}
        >
          {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        {description && (
          <span className="block text-[12.5px] text-muted">{description}</span>
        )}
      </span>
    </label>
  )
}

/** Large selectable cards — used for property type and system type choices. */
export function ChoiceCards<T extends string>({
  value,
  onChange,
  options,
  columns = 3,
  name,
  invalid,
}: {
  value?: T
  onChange: (v: T) => void
  options: { value: T; label: string; description?: string; icon?: ReactNode }[]
  columns?: 2 | 3
  name: string
  invalid?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      aria-invalid={invalid || undefined}
      className={`grid gap-2.5 ${
        columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
      }`}
    >
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald/25 ${
              active
                ? "border-emerald bg-emerald/8 shadow-[0_0_0_1px_var(--color-emerald)]"
                : invalid
                  ? "border-[#C2412D]/40 bg-white"
                  : "border-forest/12 bg-white hover:border-forest/25"
            }`}
          >
            {o.icon && (
              <span
                className={`mt-0.5 ${active ? "text-botanical" : "text-muted"}`}
              >
                {o.icon}
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">
                {o.label}
              </span>
              {o.description && (
                <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">
                  {o.description}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ============================ Searchable dropdown ========================= */

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyText = "No matches",
  id,
  disabled,
  ...aria
}: {
  options: Option[]
  value?: string
  onChange: (v: string) => void
  placeholder?: string
  emptyText?: string
  id?: string
  disabled?: boolean
  "aria-invalid"?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [hi, setHi] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (
      s
        ? options.filter((o) =>
            `${o.label} ${o.description ?? ""}`.toLowerCase().includes(s),
          )
        : options
    ).slice(0, 50)
  }, [q, options])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])
  useEffect(() => setHi(0), [q])
  const pick = (o: Option) => {
    if (o.disabled) return
    onChange(o.value)
    setOpen(false)
    setQ("")
  }
  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={aria["aria-invalid"]}
          disabled={disabled}
          className="field pr-9 pl-10"
          placeholder={selected ? selected.label : placeholder}
          value={open ? q : (selected?.label ?? "")}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
              setHi((h) => Math.min(filtered.length - 1, h + 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setHi((h) => Math.max(0, h - 1))
            } else if (e.key === "Enter" && open && filtered[hi]) {
              e.preventDefault()
              pick(filtered[hi])
            } else if (e.key === "Escape") setOpen(false)
          }}
        />
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="glass glass-modal anim-pop scrollbar-thin absolute z-[90] mt-2 max-h-64 w-full overflow-y-auto rounded-2xl p-1.5"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted">{emptyText}</li>
          )}
          {filtered.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(o)
              }}
              className={`cursor-pointer rounded-xl px-3 py-2 text-sm ${
                o.disabled ? "cursor-not-allowed opacity-45" : ""
              } ${i === hi ? "bg-forest/6" : ""}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink">{o.label}</span>
                {o.value === value && (
                  <Check className="h-4 w-4 text-botanical" />
                )}
              </span>
              {o.description && (
                <span className="block text-[12px] text-muted">
                  {o.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ================================ Stepper ================================= */

export function FormStepper({
  steps,
  current,
  onStepClick,
  completed,
}: {
  steps: string[]
  current: number
  completed: number[]
  onStepClick?: (i: number) => void
}) {
  return (
    <ol className="flex items-center gap-2" aria-label="Form progress">
      {steps.map((s, i) => {
        const done = completed.includes(i) && i !== current
        const active = i === current
        const clickable = !!onStepClick && (done || i < current)
        return (
          <li key={s} className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              aria-current={active ? "step" : undefined}
              className="group flex min-w-0 items-center gap-2.5 disabled:cursor-default"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-all duration-300 ${
                  active
                    ? "bg-forest text-sunshine shadow-[0_0_0_4px_rgb(244_197_66/0.25)]"
                    : done
                      ? "bg-emerald text-forest"
                      : "border border-forest/15 bg-white text-muted"
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`hidden truncate text-[13px] md:block ${
                  active ? "font-medium text-ink" : "text-muted"
                }`}
              >
                {s}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span
                className={`h-px flex-1 transition-colors duration-500 ${
                  done ? "bg-emerald" : "bg-forest/12"
                }`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ============================== File uploader ============================= */

export async function fileToPhoto(
  file: File,
  caption?: string,
): Promise<Photo> {
  if (!file.type.startsWith("image/"))
    throw new Error(`${file.name} is not an image.`)
  if (file.size > 15 * 1024 * 1024)
    throw new Error(`${file.name} is larger than 15 MB.`)
  const src = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error(`Could not read ${file.name}.`))
      i.src = src
    })
    const scale = Math.min(1, 720 / Math.max(img.width, img.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return {
      id: uid(),
      url: canvas.toDataURL("image/jpeg", 0.72),
      caption: caption ?? file.name.replace(/\.[^.]+$/, ""),
      at: new Date().toISOString(),
    }
  } finally {
    URL.revokeObjectURL(src)
  }
}

export function FileUploader({
  photos,
  onAdd,
  onRemove,
  disabled,
  samplePhotos,
  label = "Upload photographs",
  hint = "JPG or PNG, up to 15 MB. Images are compressed in the browser.",
  onError,
  /** Demo helper: sample image URLs when no camera/files are at hand. */
}: {
  photos: Photo[]
  onAdd: (p: Photo) => Promise<unknown> | void
  onRemove?: (id: string) => Promise<unknown> | void
  disabled?: boolean
  samplePhotos?: { url: string; caption: string }[]
  label?: string
  hint?: string
  onError?: (msg: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const handle = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    for (const f of Array.from(files)) {
      try {
        await onAdd(await fileToPhoto(f))
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "Upload failed")
      }
    }
    setBusy(false)
    if (input.current) input.current.value = ""
  }
  const nextSample = samplePhotos?.find(
    (s) => !photos.some((p) => p.url === s.url),
  )
  return (
    <div>
      {!disabled && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            handle(e.dataTransfer.files)
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors ${
            drag ? "border-emerald bg-emerald/8" : "border-forest/20 bg-white"
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest/5 text-botanical">
            {busy ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-botanical border-t-transparent" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </span>
          <div className="text-sm text-ink">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="font-medium text-botanical underline-offset-2 hover:underline"
            >
              {label}
            </button>{" "}
            <span className="text-muted">or drag & drop</span>
          </div>
          <p className="text-[12px] text-muted">{hint}</p>
          <input
            ref={input}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(e) => handle(e.target.files)}
            aria-label={label}
          />
          {nextSample && (
            <button
              type="button"
              onClick={() =>
                onAdd({
                  id: uid(),
                  url: nextSample.url,
                  caption: nextSample.caption,
                  at: new Date().toISOString(),
                })
              }
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-sunshine/20 px-3 py-1 text-[12px] font-medium text-[#6E4E00] hover:bg-sunshine/30"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Add sample photo (demo)
            </button>
          )}
        </div>
      )}
      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <li
              key={p.id}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-forest/5"
            >
              <img
                src={p.url}
                alt={p.caption}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 pt-4 pb-1 text-[11px] text-white">
                {p.caption}
              </span>
              {onRemove && !disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  aria-label={`Remove ${p.caption}`}
                  className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#A93A26] opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
