import { Link } from "react-router"

export function Logo({
  className = "",
  to = "/",
  tone = "light",
  onClick,
}: {
  className?: string
  to?: string
  tone?: "light" | "dark"
  onClick?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label="SunFlow 360 home"
      className={`flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sunshine/70 ${className}`}
    >
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <defs>
          <linearGradient id="sf-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F4C542" />
            <stop offset="1" stopColor="#38B878" />
          </linearGradient>
          <radialGradient id="sf-sun" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#FFF0BE" />
            <stop offset="1" stopColor="#F4C542" />
          </radialGradient>
        </defs>
        <circle
          cx="16"
          cy="16"
          r="13"
          fill="none"
          stroke="url(#sf-ring)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeDasharray="70 12"
          transform="rotate(-60 16 16)"
        />
        <circle cx="16" cy="16" r="6.5" fill="url(#sf-sun)" />
      </svg>
      <span
        className={`text-[17px] font-semibold tracking-[-0.02em] ${
          tone === "light" ? "text-white" : "text-ink"
        }`}
      >
        SunFlow
        <span
          className={`ml-1 font-light ${
            tone === "light" ? "text-white/70" : "text-muted"
          }`}
        >
          360
        </span>
      </span>
    </Link>
  )
}
