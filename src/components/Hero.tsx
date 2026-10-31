import { Link } from "react-router"
import { ArrowRight } from "lucide-react"
import { scrollToSection } from "@/lib/scroll"
import { Navbar } from "./Navbar"
import { FeatureCards } from "./FeatureCards"
import { Leaves } from "./Leaves"

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=2400&q=80"

export function Hero() {
  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="relative isolate min-h-[100svh] overflow-hidden bg-forest text-white"
    >
      {/* Photography — mirrored so the sun sits behind the right-hand column */}
      <div className="absolute inset-0 -z-20">
        <img
          src={HERO_IMAGE}
          alt="Rooftop solar array glowing in golden-hour light above a green tree line"
          className="settle h-full w-full -scale-x-100 object-cover object-[30%_center] sm:object-center"
        />
      </div>

      {/* Atmosphere */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {/* Depth of field across the distant tree line and sky */}
        <div className="absolute inset-x-0 top-0 h-[55%] backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,black_40%,transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(9_34_25/0.82)_0%,rgb(9_34_25/0.5)_42%,rgb(9_34_25/0.12)_78%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(9_34_25/0.45)_0%,transparent_22%,transparent_50%,rgb(7_28_20/0.82)_100%)]" />
        {/* Golden sun bloom and reflection */}
        <div className="absolute inset-0 bg-[radial-gradient(48%_42%_at_90%_14%,rgb(244_197_66/0.38),transparent_70%)] mix-blend-screen" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_30%_at_70%_78%,rgb(231_169_52/0.18),transparent_70%)] mix-blend-screen" />
        {/* Quiet zone behind the supporting copy so it stays legible over reflections */}
        <div className="absolute inset-0 hidden bg-[radial-gradient(42%_38%_at_82%_56%,rgb(9_34_25/0.78),rgb(9_34_25/0.35)_55%,transparent_85%)] lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-[65%] bg-[linear-gradient(180deg,transparent,rgb(9_34_25/0.55)_45%,rgb(9_34_25/0.7))] lg:hidden" />
        <Leaves
          id="leaf-top"
          className="absolute -top-6 -right-10 w-[300px] -scale-x-100 opacity-90 blur-[2px] sm:w-[420px] lg:-right-6"
        />
        <Leaves
          id="leaf-bottom"
          className="absolute -bottom-16 -left-20 hidden w-[460px] -scale-y-100 opacity-80 blur-[5px] md:block"
        />
      </div>

      <Navbar />

      <div className="mx-auto flex min-h-[100svh] max-w-[1320px] flex-col px-5 pt-28 pb-5 sm:px-8 sm:pt-32 sm:pb-6">
        <div className="grid flex-1 content-end gap-8 pb-8 lg:grid-cols-12 lg:items-end lg:gap-10 lg:pb-12">
          <div className="lg:col-span-8">
            <p
              className="glass glass-frosted reveal mb-6 inline-flex items-center gap-2.5 rounded-full py-1.5 pr-4 pl-2 text-[13px] text-white/88 sm:mb-8"
              style={{ animationDelay: "120ms" }}
            >
              <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-sunshine/20">
                <span className="absolute h-2 w-2 animate-ping rounded-full bg-sunshine/60 motion-reduce:hidden" />
                <span className="h-2 w-2 rounded-full bg-sunshine" />
              </span>
              <span className="sm:hidden">AI-powered solar, end to end</span>
              <span className="hidden sm:inline">
                AI-powered solar, from enquiry to lifetime care
              </span>
            </p>
            <h1 id="hero-title" className="display-hero font-medium">
              <span
                className="reveal block bg-[linear-gradient(180deg,#FFFFFF_45%,#FFF3D2_100%)] bg-clip-text pb-[0.04em] text-transparent"
                style={{ animationDelay: "200ms" }}
              >
                Powering
              </span>
              <span
                className="reveal block bg-[linear-gradient(180deg,#FFFFFF_45%,#FFF3D2_100%)] bg-clip-text pb-[0.04em] text-transparent"
                style={{ animationDelay: "300ms" }}
              >
                A Brighter
              </span>
              <span
                className="reveal block bg-[linear-gradient(180deg,#FFFFFF_45%,#FFF3D2_100%)] bg-clip-text pb-[0.04em] text-transparent"
                style={{ animationDelay: "400ms" }}
              >
                Tomorrow<span className="text-sunshine">.</span>
              </span>
            </h1>
          </div>

          <div
            className="reveal max-w-md lg:col-span-4 lg:justify-self-end lg:pb-3"
            style={{ animationDelay: "520ms" }}
          >
            <p className="text-[16px] leading-relaxed text-white/85 [text-shadow:0_1px_12px_rgb(6_28_20/0.45)] sm:text-[17px]">
              From your first solar enquiry to installation and lifetime
              equipment care, experience a smarter way to go solar.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/enquiry"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-emerald py-2 pr-2 pl-6 text-[15px] font-medium text-forest shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_14px_34px_-12px_rgb(56_184_120/0.9)] transition-all duration-300 hover:bg-[#45C484] active:scale-[0.97]"
              >
                Book Your Free Survey
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sunshine transition-transform duration-500 ease-glass group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection("solutions")}
                className="glass glass-frosted glass-sheen inline-flex items-center justify-center rounded-full px-6 py-3.5 text-[15px] text-white transition-all duration-300 hover:bg-white/20 active:scale-[0.97]"
              >
                Explore Solar Solutions
              </button>
            </div>
          </div>
        </div>

        <FeatureCards />

        <button
          type="button"
          onClick={() => scrollToSection("solutions")}
          aria-label="Scroll to solar solutions"
          className="reveal mx-auto mt-5 hidden flex-col items-center gap-2 rounded-full px-3 py-1 text-[11px] tracking-[0.22em] text-white/55 uppercase transition-colors hover:text-white sm:flex"
          style={{ animationDelay: "1000ms" }}
        >
          <span className="flex h-8 w-5 justify-center rounded-full border border-white/35 pt-1.5">
            <span className="scroll-dot h-1.5 w-1 rounded-full bg-sunshine" />
          </span>
          Scroll
        </button>
      </div>
    </section>
  )
}
