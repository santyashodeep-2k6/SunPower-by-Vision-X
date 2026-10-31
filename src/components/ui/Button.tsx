import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { Link } from "react-router"
import { Loader2 } from "lucide-react"
import { Tooltip } from "./overlays"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "gold" | "danger" | "glass"
export type ButtonSize = "sm" | "md" | "lg"

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald text-forest shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_8px_20px_-10px_rgb(56_184_120/0.9)] hover:bg-[#45C484]",
  secondary:
    "bg-white text-ink border border-forest/12 shadow-[0_1px_2px_rgb(16_61_45/0.05)] hover:border-forest/25 hover:bg-[#FAFCF9]",
  ghost: "text-ink/80 hover:bg-forest/6 hover:text-ink",
  dark: "bg-forest text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-[#164b38]",
  gold: "bg-sunshine text-forest shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_8px_20px_-10px_rgb(244_197_66/0.9)] hover:bg-[#F7D163]",
  danger:
    "bg-white text-[#A93A26] border border-[#A93A26]/25 hover:bg-[#A93A26]/6",
  glass: "glass glass-frosted text-white hover:bg-white/20",
}

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2.5",
}

export const buttonClass = (
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  extra = "",
) =>
  `inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium transition-all duration-200 ease-glass active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald/25 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** When set, the button is disabled and the reason is shown in a tooltip. */
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  disabledReason?: string | false | null
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      loading,
      icon,
      disabledReason,
      className = "",
      children,
      disabled,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading || !!disabledReason
    const btn = (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={buttonClass(variant, size, className)}
        {...rest}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    )
    if (disabledReason) {
      return (
        <Tooltip content={disabledReason}>
          <span
            tabIndex={0}
            className="inline-flex cursor-not-allowed rounded-full outline-none focus-visible:ring-4 focus-visible:ring-sunshine/30"
            aria-label={`${
              typeof children === "string" ? children : "Action"
            } unavailable: ${disabledReason}`}
          >
            {btn}
          </span>
        </Tooltip>
      )
    }
    return btn
  },
)

export function ButtonLink({
  to,
  variant = "secondary",
  size = "md",
  icon,
  className = "",
  children,
}: {
  to: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  )
}

export function IconButton({
  label,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-forest/6 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald/25 disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
