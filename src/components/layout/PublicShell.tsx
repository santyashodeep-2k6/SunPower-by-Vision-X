import type { ReactNode } from "react"
import { Navbar } from "@/components/Navbar"
import { SiteFooter } from "@/components/home/Sections"

const BG =
  "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=2000&q=70"

/** Public page frame: golden-hour band with floating glass navigation, content on soft canvas. */
export function PublicShell({
  eyebrow,
  title,
  description,
  children,
  footer = true,
  bandExtra,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: boolean
  bandExtra?: ReactNode
}) {
  return (
    <div className="app-canvas min-h-svh">
      <div className="relative isolate overflow-hidden bg-forest pb-36 text-white">
        <img
          src={BG}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full -scale-x-100 object-cover object-top blur-[2px]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(9_34_25/0.78),rgb(9_34_25/0.88)),radial-gradient(50%_60%_at_90%_10%,rgb(244_197_66/0.35),transparent_70%)]"
        />
        <Navbar />
        <div className="mx-auto max-w-[1320px] px-5 pt-32 sm:px-8 sm:pt-36">
          {eyebrow && (
            <p className="reveal text-[12px] font-medium tracking-[0.18em] text-sunshine uppercase">
              {eyebrow}
            </p>
          )}
          <h1
            className="reveal mt-3 max-w-3xl text-[38px] leading-[1.02] font-medium tracking-[-0.04em] sm:text-[56px]"
            style={{ animationDelay: "100ms" }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="reveal mt-4 max-w-2xl text-[16px] leading-relaxed text-white/75"
              style={{ animationDelay: "180ms" }}
            >
              {description}
            </p>
          )}
          {bandExtra}
        </div>
      </div>
      <div className="relative z-10 mx-auto -mt-24 max-w-[1320px] px-4 pb-20 sm:px-8">
        {children}
      </div>
      {footer && <SiteFooter />}
    </div>
  )
}
