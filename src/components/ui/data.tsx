import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Lock,
  Search,
  X,
} from "lucide-react"
import { fmtDateTime, relative } from "@/lib/format"
import { EmptyState } from "./feedback"

/* ================================= Panel ================================== */

export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
  bodyClass = "p-5",
  variant = "solid",
  id,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClass?: string
  variant?: "solid" | "glass"
  id?: string
}) {
  return (
    <section
      id={id}
      className={`${
        variant === "glass" ? "glass-light" : "surface"
      } overflow-hidden ${className}`}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-forest/7 px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-[13px] text-muted">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  )
}

export function KeyValueGrid({
  items,
  columns = 2,
}: {
  items: { label: string; value?: ReactNode; missing?: boolean; mono?: boolean }[]
  columns?: 2 | 3 | 4
}) {
  const cols =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2"
  return (
    <dl className={`grid gap-x-6 gap-y-4 ${cols}`}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-[12px] font-medium tracking-wide text-muted uppercase">
            {i.label}
          </dt>
          <dd
            className={`mt-1 text-sm text-ink ${
              i.mono ? "font-mono text-[13px]" : ""
            }`}
          >
            {i.missing || i.value === undefined || i.value === "" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber/14 px-1.5 py-0.5 text-[12px] font-medium text-[#835400]">
                Missing
              </span>
            ) : (
              i.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/* ================================ StatCard ================================ */

export function StatCard({
  label,
  value,
  sub,
  icon,
  to,
  onClick,
  accent = "forest",
  active,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  to?: string
  onClick?: () => void
  accent?: "forest" | "gold" | "emerald" | "amber" | "danger"
  active?: boolean
}) {
  const chip = {
    forest: "bg-forest/7 text-forest",
    gold: "bg-sunshine/30 text-[#6E4E00]",
    emerald: "bg-emerald/15 text-botanical",
    amber: "bg-amber/18 text-[#835400]",
    danger: "bg-[#C2412D]/10 text-[#A93A26]",
  }[accent]
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {icon && (
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${chip}`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
        {value}
      </div>
      {sub && <div className="mt-2 text-[12.5px] text-muted">{sub}</div>}
    </>
  )
  const cls = `glass-light block w-full p-4 text-left transition-all duration-300 ease-glass ${
    to || onClick
      ? "hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_#fff,0_18px_40px_-20px_rgb(16_61_45/0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald/25 active:translate-y-0"
      : ""
  } ${active ? "ring-2 ring-emerald/60" : ""}`
  if (to)
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cls}
      >
        {body}
      </button>
    )
  return <div className={cls}>{body}</div>
}

export function ChartCard({
  title,
  description,
  actions,
  children,
  className = "",
  height = 260,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  height?: number
}) {
  return (
    <Panel
      title={title}
      description={description}
      actions={actions}
      className={className}
      bodyClass="px-3 pt-4 pb-3"
    >
      <div style={{ height }}>{children}</div>
    </Panel>
  )
}

/* ================================== Tabs ================================== */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className = "",
}: {
  tabs: { id: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={`scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1 ${className}`}
    >
      {tabs.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`relative shrink-0 rounded-full px-3.5 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald/25 ${
              active
                ? "bg-forest text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]"
                : "text-ink/70 hover:bg-forest/6 hover:text-ink"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`ml-1.5 rounded-full px-1.5 text-[11px] tabular-nums ${
                  active ? "bg-sunshine text-forest" : "bg-forest/8 text-ink/70"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ============================ Search & filters ============================ */

export interface FilterDef {
  id: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}

export function SearchFilterBar({
  search,
  onSearch,
  placeholder = "Search…",
  filters = [],
  actions,
  onReset,
  children,
}: {
  search: string
  onSearch: (v: string) => void
  placeholder?: string
  filters?: FilterDef[]
  actions?: ReactNode
  onReset?: () => void
  children?: ReactNode
}) {
  const active = !!search || filters.some((f) => f.value)
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1 lg:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="field h-10 pl-10"
        />
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {filters.map((f) => (
          <label key={f.id} className="relative">
            <span className="sr-only">{f.label}</span>
            <select
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              className={`field h-10 w-auto min-w-[8.5rem] text-[13px] ${
                f.value ? "border-emerald/60 bg-emerald/6" : ""
              }`}
            >
              <option value="">{f.label}: All</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {children}
        {active && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-[13px] text-ink/70 hover:bg-forest/6"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

/* =============================== Pagination =============================== */

export function Pagination({
  page,
  pageCount,
  onPage,
  total,
  pageSize,
}: {
  page: number
  pageCount: number
  onPage: (p: number) => void
  total: number
  pageSize: number
}) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  )
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-forest/7 px-4 py-3 text-[13px] text-muted"
    >
      <span>
        Showing{" "}
        <span className="font-medium text-ink tabular-nums">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium text-ink tabular-nums">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-forest/6 disabled:opacity-35"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) => (
          <span key={p} className="flex items-center">
            {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1">…</span>}
            <button
              type="button"
              onClick={() => onPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={`h-8 min-w-8 rounded-full px-2 tabular-nums ${
                p === page
                  ? "bg-forest text-white"
                  : "text-ink hover:bg-forest/6"
              }`}
            >
              {p}
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-forest/6 disabled:opacity-35"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  )
}

/* ================================ DataTable =============================== */

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  align?: "left" | "right"
  className?: string
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  pageSize = 10,
  empty,
  initialSort,
  rowLabel,
  dense,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (r: T) => string
  onRowClick?: (r: T) => void
  pageSize?: number
  empty?: ReactNode
  initialSort?: { key: string; dir: "asc" | "desc" }
  rowLabel?: (r: T) => string
  dense?: boolean
}) {
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(1)
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key)
    if (!col?.sortValue) return rows
    const dir = sort!.dir === "asc" ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a)
      const vb = col.sortValue!(b)
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir
    })
  }, [rows, columns, sort])
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  useEffect(() => {
    if (page > pageCount) setPage(1)
  }, [page, pageCount])
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize)
  const toggle = (key: string) =>
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    )
  return (
    <div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-forest/8 bg-[#F8FBF7] text-left">
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      active
                        ? sort!.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={`px-4 py-2.5 text-[12px] font-medium tracking-wide whitespace-nowrap text-muted uppercase ${
                      c.align === "right" ? "text-right" : ""
                    } ${c.className ?? ""}`}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggle(c.key)}
                        className={`inline-flex items-center gap-1 uppercase hover:text-ink ${
                          active ? "text-ink" : ""
                        }`}
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        (e.preventDefault(), onRowClick(r))
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={
                  onRowClick && rowLabel ? `Open ${rowLabel(r)}` : undefined
                }
                className={`border-b border-forest/6 last:border-0 ${
                  onRowClick
                    ? "cursor-pointer transition-colors hover:bg-[#F6FAF5] focus-visible:bg-[#F1F7EF] focus-visible:outline-none"
                    : ""
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 ${
                      dense ? "py-2" : "py-3"
                    } align-middle text-ink ${
                      c.align === "right" ? "text-right tabular-nums" : ""
                    } ${c.className ?? ""}`}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 &&
        (empty ?? (
          <EmptyState
            compact
            title="No records match"
            description="Try clearing filters or changing the search."
          />
        ))}
      <Pagination
        page={page}
        pageCount={pageCount}
        onPage={setPage}
        total={rows.length}
        pageSize={pageSize}
      />
    </div>
  )
}

/* ============================ Progress timeline =========================== */

export type StepState = "done" | "current" | "upcoming" | "blocked"
export interface TimelineStep {
  label: string
  state: StepState
  date?: string
  description?: string
}

export function ProgressTimeline({
  steps,
  orientation = "responsive",
}: {
  steps: TimelineStep[]
  orientation?: "responsive" | "vertical"
}) {
  const icon = (s: StepState) =>
    s === "done" ? (
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    ) : s === "blocked" ? (
      <Lock className="h-3 w-3" />
    ) : s === "current" ? (
      <span className="h-2 w-2 rounded-full bg-sunshine" />
    ) : (
      <Circle className="h-2 w-2 fill-current opacity-40" />
    )
  const dot = (s: StepState) =>
    s === "done"
      ? "bg-emerald text-forest"
      : s === "current"
        ? "bg-forest text-sunshine shadow-[0_0_0_4px_rgb(244_197_66/0.25)]"
        : s === "blocked"
          ? "bg-amber/20 text-[#835400]"
          : "bg-white text-muted border border-forest/15"
  const horizontal = orientation === "responsive"
  return (
    <ol className={horizontal ? "grid gap-4 md:flex md:gap-0" : "grid gap-4"}>
      {steps.map((s, i) => (
        <li
          key={s.label}
          className={`relative flex gap-3 ${
            horizontal ? "md:flex-1 md:flex-col md:items-start md:gap-2" : ""
          }`}
        >
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={`absolute top-8 left-[13px] h-[calc(100%-8px)] w-px ${
                horizontal
                  ? "md:top-[13px] md:left-8 md:h-px md:w-[calc(100%-36px)]"
                  : ""
              } ${s.state === "done" ? "bg-emerald" : "bg-forest/12"}`}
            />
          )}
          <span
            className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${dot(s.state)}`}
          >
            {icon(s.state)}
          </span>
          <div className={`min-w-0 ${horizontal ? "md:pr-3" : ""}`}>
            <p
              className={`text-[13px] font-medium ${
                s.state === "upcoming" ? "text-muted" : "text-ink"
              }`}
            >
              {s.label}
            </p>
            {s.date && <p className="text-[12px] text-muted">{s.date}</p>}
            {s.description && (
              <p className="mt-0.5 text-[12px] text-muted">{s.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

/* ============================ Activity timeline =========================== */

export function ActivityTimeline({
  items,
  empty = "No activity yet.",
}: {
  items: { id: string; text: string; actor?: string; at: string }[]
  empty?: string
}) {
  if (!items.length)
    return <p className="py-6 text-center text-sm text-muted">{empty}</p>
  return (
    <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-forest/10">
      {items.map((a) => (
        <li key={a.id} className="relative pl-6">
          <span className="absolute top-1.5 left-0 h-[11px] w-[11px] rounded-full border-2 border-white bg-botanical shadow-[0_0_0_1px_rgb(33_122_80/0.3)]" />
          <p className="text-sm text-ink">{a.text}</p>
          <p className="text-[12px] text-muted">
            {a.actor && <span>{a.actor} · </span>}
            <time dateTime={a.at} title={fmtDateTime(a.at)}>
              {relative(a.at)}
            </time>
          </p>
        </li>
      ))}
    </ol>
  )
}
