import { useState } from "react"
import { MessageSquare, PhoneCall, Sparkles } from "lucide-react"
import { Drawer } from "@/components/ui/overlays"
import { AIChatPanel } from "@/components/special/AIChatPanel"
import { ElevenLabsVoiceCall } from "@/components/special/ElevenLabsVoiceCall"

type Tab = "call" | "chat"

export function FloatingAssistant() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("call")

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="glass glass-ai glass-sheen fixed right-4 bottom-4 z-40 inline-flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-2 text-[14px] font-medium text-white transition-transform duration-300 ease-glass hover:-translate-y-0.5 active:scale-95 sm:right-6 sm:bottom-6"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunshine text-forest shadow-[0_0_18px_rgb(244_197_66/0.6)]">
          <Sparkles className="h-4 w-4" />
        </span>
        <span>Ask SunFlow AI</span>
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald/25 px-2 py-0.5 text-[11px] font-semibold text-emerald">
          <PhoneCall className="h-3 w-3" /> Voice
        </span>
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        tone="ai"
        width="max-w-lg"
        title="SunFlow Solar Assistant"
        description={
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-white/60">
              Talk directly with our AI Receptionist or chat about your solar
              requirements.
            </span>
            {/* Mode Switcher Tabs */}
            <div className="mt-1 inline-flex self-start rounded-full border border-white/12 bg-white/6 p-1">
              <button
                type="button"
                onClick={() => setTab("call")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ${
                  tab === "call"
                    ? "bg-gradient-to-r from-emerald to-[#217A50] text-white shadow-md"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <PhoneCall className="h-3.5 w-3.5" />
                Voice Receptionist
              </button>
              <button
                type="button"
                onClick={() => setTab("chat")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ${
                  tab === "chat"
                    ? "bg-white/18 text-white shadow-md"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Text Chat
              </button>
            </div>
          </div>
        }
      >
        {tab === "call" ? (
          <ElevenLabsVoiceCall onClose={() => setOpen(false)} />
        ) : (
          <AIChatPanel tone="dark" compact />
        )}
      </Drawer>
    </>
  )
}
