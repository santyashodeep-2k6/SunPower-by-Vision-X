import { useState } from "react"
import { Bot, MessageSquare, Phone, ShieldCheck } from "lucide-react"
import { PublicShell } from "@/components/layout/PublicShell"
import {
  ChatView,
  CollectedSummary,
  useAssistant,
} from "@/components/special/AIChatPanel"
import { ElevenLabsVoiceCall } from "@/components/special/ElevenLabsVoiceCall"

type Tab = "chat" | "call"

function SidePanel({ a }: { a: ReturnType<typeof useAssistant> }) {
  return (
    <div className="glass-light p-5">
      <p className="text-sm font-semibold text-ink">Information collected</p>
      <p className="mb-4 text-[12.5px] text-muted">
        {a.progress} of {a.total} details · updates as you chat
      </p>
      <CollectedSummary collected={a.conv.collected} />
    </div>
  )
}

export default function AssistantPage() {
  const a = useAssistant()
  const [tab, setTab] = useState<Tab>("chat")

  return (
    <PublicShell
      eyebrow="Solar assistant"
      title="Plan your system in a quick conversation."
      description="Answer a few questions in English, Hindi or Marathi. If your number is already registered, the assistant adds missing details to your existing enquiry."
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="glass glass-ai flex h-[min(78svh,760px)] flex-col rounded-[28px] p-4 text-white sm:p-6 lg:col-span-8">
          {/* Header with tab switcher */}
          <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sunshine text-forest">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">SunFlow solar assistant</p>
                <p className="text-[12px] text-white/60">
                  {tab === "chat"
                    ? "Scripted demo · conversation history is kept for this browser session"
                    : "Voice call · powered by ElevenLabs AI"}
                </p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="inline-flex self-start rounded-full border border-white/12 bg-white/6 p-0.5 sm:self-auto">
              <button
                type="button"
                onClick={() => setTab("chat")}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-300 ${
                  tab === "chat"
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/55 hover:text-white/80"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </button>
              <button
                type="button"
                onClick={() => setTab("call")}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-300 ${
                  tab === "call"
                    ? "bg-emerald/20 text-emerald shadow-sm"
                    : "text-white/55 hover:text-white/80"
                }`}
              >
                <Phone className="h-3.5 w-3.5" />
                Voice Call
              </button>
            </div>
          </div>

          {/* Content based on tab */}
          {tab === "chat" ? (
            <ChatView a={a} tone="dark" />
          ) : (
            <ElevenLabsVoiceCall />
          )}
        </div>
        <aside className="space-y-4 lg:col-span-4">
          <SidePanel a={a} />
          <div className="glass-light p-5 text-[13px] text-muted">
            <p className="mb-1 flex items-center gap-2 font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-botanical" /> Honest by
              design
            </p>
            {tab === "chat"
              ? "This prototype uses a clearly labelled scripted assistant behind a service interface. A real AI model and WhatsApp channel can be connected by the backend team without changing this screen."
              : "The voice call connects to an ElevenLabs AI voice agent. Microphone access is required. Your conversation may be processed by ElevenLabs for the voice interaction."}
          </div>
          {tab === "call" && (
            <div className="glass-light p-5">
              <p className="mb-2 text-sm font-semibold text-ink">
                Voice call features
              </p>
              <ul className="space-y-2 text-[13px] text-muted">
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald/15 text-botanical">
                    ✓
                  </span>
                  Real-time voice conversation
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald/15 text-botanical">
                    ✓
                  </span>
                  Automatic transcript
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald/15 text-botanical">
                    ✓
                  </span>
                  Ask about solar packages
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald/15 text-botanical">
                    ✓
                  </span>
                  Book surveys &amp; get quotes
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald/15 text-botanical">
                    ✓
                  </span>
                  Multi-language support
                </li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </PublicShell>
  )
}
