import { useState } from "react"
import { ArrowUpRight, Route, ShieldCheck, SunMedium } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  FeatureDetailDrawer,
  type FeatureKey,
} from "./home/FeatureDetailDrawer"

type Card = {
  key: FeatureKey
  title: string
  body: string
  icon: LucideIcon
  surface: string
  chip: string
}

const CARDS: Card[] = [
  {
    key: "smart",
    title: "Smart Solar",
    body: "Intelligent installation management.",
    icon: SunMedium,
    surface: "glass-sunlit",
    chip: "bg-sunshine text-forest shadow-[0_6px_18px_-6px_rgb(244_197_66/0.8)]",
  },
  {
    key: "care",
    title: "Complete Care",
    body: "Warranty and long-term service.",
    icon: ShieldCheck,
    surface: "glass-frosted",
    chip: "bg-white/90 text-botanical",
  },
  {
    key: "journey",
    title: "Transparent Journey",
    body: "Track every stage of your installation.",
    icon: Route,
    surface: "glass-botanical",
    chip: "bg-emerald text-forest shadow-[0_6px_18px_-6px_rgb(56_184_120/0.8)]",
  },
]

export function FeatureCards() {
  const [open, setOpen] = useState<FeatureKey | null>(null)
  return (
    <>
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {CARDS.map(({ key, title, body, icon: Icon, surface, chip }, i) => (
          <button
            type="button"
            key={title}
            onClick={() => setOpen(key)}
            aria-haspopup="dialog"
            className={`glass glass-sheen ${surface} reveal group flex min-w-[78%] snap-start items-start gap-4 text-left rounded-[26px] p-5 outline-none transition-[transform,box-shadow] duration-500 ease-glass hover:-translate-y-1.5 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_28px_60px_-20px_rgb(6_28_20/0.55)] focus-visible:ring-2 focus-visible:ring-sunshine/70 active:translate-y-0 sm:min-w-0 lg:p-6`}
            style={{ animationDelay: `${650 + i * 110}ms` }}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${chip}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
              <span className="flex items-center justify-between gap-3">
                <span className="text-[17px] font-medium tracking-[-0.015em] text-white">
                  {title}
                </span>
                <ArrowUpRight
                  className="h-4.5 w-4.5 shrink-0 text-white/50 transition-all duration-500 ease-glass group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-sunshine"
                  strokeWidth={1.75}
                />
              </span>
              <span className="text-[14px] leading-snug text-white/72">
                {body}
              </span>
            </span>
          </button>
        ))}
      </div>
      <FeatureDetailDrawer feature={open} onClose={() => setOpen(null)} />
    </>
  )
}
