import type { ReactNode } from "react"
import { Link } from "react-router"
import { ArrowLeft } from "lucide-react"

export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
  badges,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  eyebrow?: ReactNode
  badges?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            to={back.to}
            className="mb-2 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {back.label}
          </Link>
        )}
        {eyebrow && (
          <div className="mb-1.5 text-[12px] font-medium tracking-[0.12em] text-botanical uppercase">
            {eyebrow}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.03em] text-ink sm:text-[30px]">
            {title}
          </h1>
          {badges}
        </div>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  )
}

export function Breadcrumb({
  items,
}: {
  items: { label: string; to?: string }[]
}) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
        {items.map((i, idx) => (
          <li
            key={`${i.label}-${idx}`}
            className="flex min-w-0 items-center gap-1.5"
          >
            {idx > 0 && <span className="text-ink/25">/</span>}
            {i.to && idx < items.length - 1 ? (
              <Link to={i.to} className="truncate text-muted hover:text-ink">
                {i.label}
              </Link>
            ) : (
              <span
                aria-current={idx === items.length - 1 ? "page" : undefined}
                className="truncate font-medium text-ink"
              >
                {i.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
