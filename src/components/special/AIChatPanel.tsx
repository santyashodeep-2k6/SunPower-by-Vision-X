import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import {
  ArrowUp,
  CheckCircle2,
  Download,
  Headset,
  Key,
  Languages,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react"
import type { AssistantFields, Conversation, SolarEstimate } from "@/lib/types"
import { inr } from "@/lib/format"
import { getDb, useDb } from "@/data/store"
import {
  LANGUAGES,
  SLOT_ORDER,
  assistantService,
  languageName,
  newMessage,
  type Slot,
} from "@/services/assistant"
import {
  newConversationId,
  requestHuman,
  saveConversation,
  submitAssistantEnquiry,
} from "@/services/crm"
import {
  getGeminiApiKey,
  hasGeminiApiKey,
  setGeminiApiKey,
} from "@/services/gemini"
import { errorMessage } from "@/services/apiClient"
import { useToast } from "@/components/ui/overlays"
import { ChatMessage, TypingIndicator } from "./ChatMessage"

const STORE_KEY = "sunflow360.assistant"

const FIELD_LABELS: Record<keyof AssistantFields, string> = {
  language: "Preferred language",
  name: "Customer name",
  phone: "Mobile number",
  propertyType: "Property type",
  city: "Location",
  monthlyBill: "Monthly bill",
  roofArea: "Rooftop area",
  capacity: "System capacity",
  systemType: "On-Grid / Off-Grid",
}

const ORDER: (keyof AssistantFields)[] = [
  "language",
  "name",
  "phone",
  "propertyType",
  "city",
  "monthlyBill",
  "roofArea",
  "capacity",
  "systemType",
]

export function formatField(k: keyof AssistantFields, v: unknown) {
  if (v === null) return "Not known"
  if (v === undefined || v === "") return undefined
  if (k === "monthlyBill") return inr(Number(v))
  if (k === "roofArea") return `${v} sq ft`
  if (k === "capacity") return `${v} kW`
  return String(v)
}

interface Persisted {
  id: string
  slot: Slot
  quickReplies: string[]
  result?: { leadId: string; updated: boolean }
}

function freshConversation(): Conversation {
  const g = assistantService.greet()
  const now = new Date().toISOString()
  return {
    id: newConversationId(),
    channel: "Web Assistant",
    language: "English",
    status: "Active",
    collected: {},
    messages: [{ ...newMessage("assistant", g.text) }],
    startedAt: now,
    updatedAt: now,
  }
}

export function useAssistant() {
  const db = useDb()
  const toast = useToast()
  const [meta, setMeta] = useState<Persisted>(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(STORE_KEY) ?? "null",
      ) as Persisted | null
      if (saved && getDb().conversations.some((c) => c.id === saved.id))
        return saved
    } catch {
      /* ignore */
    }
    const c = freshConversation()
    return {
      id: c.id,
      slot: "chat",
      quickReplies: [
        "💰 Estimate My Solar Savings",
        "🏛️ PM Surya Ghar Subsidy",
        "📦 View Products & Prices",
        "🔍 Track My Project / Order",
      ],
    }
  })

  const [draft, setDraft] = useState<Conversation>(
    () =>
      getDb().conversations.find((c) => c.id === meta.id) ??
      freshConversation(),
  )
  const [typing, setTyping] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const stored = db.conversations.find((c) => c.id === draft.id)
  // Agents can reply from the CRM Conversations module; reflect their messages live here.
  const conv =
    stored && stored.messages.length >= draft.messages.length ? stored : draft

  useEffect(() => {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ ...meta, id: conv.id }))
  }, [meta, conv.id])

  const persist = async (next: Conversation) => {
    setDraft(next)
    try {
      await saveConversation(next)
    } catch (e) {
      toast({
        tone: "error",
        title: "Conversation not saved",
        description: errorMessage(e),
      })
    }
  }

  const send = async (text: string) => {
    const t = text.trim()
    if (!t || typing) return

    const withUser: Conversation = {
      ...conv,
      messages: [...conv.messages, newMessage("customer", t)],
      updatedAt: new Date().toISOString(),
    }
    await persist(withUser)
    setTyping(true)

    try {
      const turn = await assistantService.reply(withUser, meta.slot, t)
      const next: Conversation = {
        ...withUser,
        collected: turn.collected,
        language: turn.collected.language ?? withUser.language,
        messages: [
          ...withUser.messages,
          newMessage("assistant", turn.text, turn.estimate),
        ],
        updatedAt: new Date().toISOString(),
      }
      await persist(next)
      setMeta((m) => ({
        ...m,
        slot: turn.nextSlot,
        quickReplies: turn.quickReplies,
      }))

      // If booking is complete and required fields are met, save lead to CRM
      if (
        turn.nextSlot === "done" &&
        turn.collected.name &&
        turn.collected.phone &&
        turn.collected.city
      ) {
        setSubmitting(true)
        try {
          const r = await submitAssistantEnquiry(next.id)
          setMeta((m) => ({
            ...m,
            result: r,
            slot: "chat",
            quickReplies: [
              "View My Solar Estimate",
              "What happens next?",
              "Talk to an Advisor",
            ],
          }))
          toast({
            tone: "success",
            title: r.updated
              ? "Existing enquiry updated"
              : "Site survey & enquiry confirmed!",
            description: `Reference ${r.leadId} — our technical advisor will call you shortly.`,
          })
        } catch (e) {
          toast({
            tone: "error",
            title: "Enquiry not saved to CRM",
            description: errorMessage(e),
          })
        } finally {
          setSubmitting(false)
        }
      }
    } catch (e) {
      toast({
        tone: "error",
        title: "Assistant unavailable",
        description: errorMessage(e),
      })
    } finally {
      setTyping(false)
    }
  }

  const human = async () => {
    try {
      if (!stored) await saveConversation(conv)
      await requestHuman(conv.id)
      await persist({
        ...getDb().conversations.find((c) => c.id === conv.id)!,
        messages: [
          ...conv.messages,
          newMessage(
            "assistant",
            "I have notified a SunFlow 360 solar advisor. They can see this conversation in the CRM and will join to assist you directly.",
          ),
        ],
      })
      toast({
        tone: "success",
        title: "An advisor has been notified",
        description: "Our team will reply right here in this chat window.",
      })
    } catch (e) {
      toast({
        tone: "error",
        title: "Could not reach an advisor",
        description: errorMessage(e),
      })
    }
  }

  const restart = () => {
    const c = freshConversation()
    setDraft(c)
    setMeta({
      id: c.id,
      slot: "chat",
      quickReplies: [
        "💰 Estimate My Solar Savings",
        "🏛️ PM Surya Ghar Subsidy",
        "📦 View Products & Prices",
        "🔍 Track My Project / Order",
      ],
      result: undefined,
    })
    toast({
      tone: "info",
      title: "Chat restarted",
      description: "Started a fresh conversation session.",
    })
  }

  const setLanguage = (lang: string) => {
    const name = languageName(lang)
    setDraft({
      ...conv,
      language: name,
      collected: { ...conv.collected, language: name },
    })
    send(`Switch language to ${name}`)
  }

  const downloadTranscript = () => {
    const summary = `===========================================
SUNFLOW 360 - AI SOLAR ADVISOR CHAT
===========================================
Conversation ID: ${conv.id}
Channel:         ${conv.channel}
Language:        ${conv.language}
Date:            ${new Date(conv.startedAt).toLocaleString("en-IN")}
Status:          ${conv.status}

CAPTURED REQUIREMENTS:
-------------------------------------------
${ORDER.map(
  (k) =>
    `${FIELD_LABELS[k].padEnd(20)}: ${formatField(k, conv.collected[k]) ?? "—"}`,
).join("\n")}

CONVERSATION TRANSCRIPT:
-------------------------------------------
${conv.messages
  .map(
    (m) =>
      `[${new Date(m.at).toLocaleTimeString()}] ${
        m.from === "customer"
          ? "Customer"
          : m.from === "agent"
            ? m.authorName || "Advisor"
            : "SunFlow AI"
      }:
${m.text}
${
  m.estimate
    ? `\n>>> [ESTIMATE] ${m.estimate.capacityKw} kW System | Turnkey: ${inr(m.estimate.grossCost)} | Subsidy: ${inr(m.estimate.subsidy)} | Net Outlay: ${inr(m.estimate.netCost)} | Monthly Savings: ${inr(m.estimate.monthlySavings)} | Payback: ${m.estimate.paybackYears} Yrs <<<\n`
    : ""
}`,
  )
  .join("\n")}
===========================================
`
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `SunFlow-Solar-Chat-${conv.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const progress = ORDER.filter((k) => conv.collected[k] !== undefined).length

  return {
    conv,
    meta,
    typing,
    submitting,
    send,
    human,
    restart,
    setLanguage,
    downloadTranscript,
    progress,
    total: ORDER.length,
  }
}

export function CollectedSummary({
  collected,
  tone = "light",
}: {
  collected: Partial<AssistantFields>
  tone?: "light" | "dark"
}) {
  return (
    <ul className="space-y-2">
      {ORDER.map((k) => {
        const v = formatField(k, collected[k])
        return (
          <li
            key={k}
            className="flex items-center justify-between gap-3 text-[13px]"
          >
            <span
              className={`flex items-center gap-2 ${
                tone === "dark" ? "text-white/70" : "text-muted"
              }`}
            >
              <CheckCircle2
                className={`h-4 w-4 ${
                  v
                    ? "text-emerald"
                    : tone === "dark"
                      ? "text-white/25"
                      : "text-forest/20"
                }`}
              />
              {FIELD_LABELS[k]}
            </span>
            <span
              className={`truncate text-right font-medium ${
                tone === "dark" ? "text-white" : "text-ink"
              }`}
            >
              {v ?? "—"}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function AIChatPanel(props: {
  tone?: "light" | "dark"
  compact?: boolean
}) {
  const a = useAssistant()
  return <ChatView a={a} {...props} />
}

export function ChatView({
  a,
  tone = "light",
  compact = false,
}: {
  a: ReturnType<typeof useAssistant>
  tone?: "light" | "dark"
  compact?: boolean
}) {
  const toast = useToast()
  const [text, setText] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [showReqDrawer, setShowReqDrawer] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [geminiKeyInput, setGeminiKeyInput] = useState(
    () => getGeminiApiKey() ?? "",
  )
  const [hasKey, setHasKey] = useState(() => hasGeminiApiKey())
  const endRef = useRef<HTMLDivElement>(null)

  // Critical React 19 fix: Always use function block returning undefined
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [a.conv.messages.length, a.typing])

  const dark = tone === "dark"
  const pct = Math.round((a.progress / a.total) * 100)

  // Save or clear Gemini API key
  const handleSaveApiKey = () => {
    setGeminiApiKey(geminiKeyInput)
    const active = hasGeminiApiKey()
    setHasKey(active)
    setShowKeyModal(false)
    if (active) {
      toast({
        tone: "success",
        title: "Gemini API Connected! ✨",
        description: "The chatbot is now powered by Google Gemini generative AI.",
      })
    } else {
      toast({
        tone: "info",
        title: "Using Built-in Solar AI",
        description: "Reset to high-precision built-in Solar Knowledge Engine.",
      })
    }
  }

  // Voice speech-to-text
  const toggleListening = () => {
    if (typeof window === "undefined") return

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any })
        .webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert(
        "Voice speech input is not supported in this browser. Please type your message.",
      )
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false

      const l = a.conv.language
      recognition.lang =
        l === "Hindi"
          ? "hi-IN"
          : l === "Marathi"
            ? "mr-IN"
            : l === "Telugu"
              ? "te-IN"
              : "en-IN"

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      recognition.onerror = () => setIsListening(false)
      recognition.onresult = (e: any) => {
        const spoken = e.results?.[0]?.[0]?.transcript
        if (spoken) {
          setText((prev) => (prev ? `${prev} ${spoken}` : spoken))
        }
      }
      recognition.start()
    } catch {
      setIsListening(false)
    }
  }

  const placeholder = useMemo(() => {
    if (isListening) return "Listening to your voice..."
    if (a.conv.status === "Needs Human") return "Type a message to your advisor..."
    return "Ask anything about solar, costs, subsidy, or type your bill..."
  }, [isListening, a.conv.status])

  return (
    <div className="flex min-h-0 flex-1 flex-col relative">
      {/* Top Controls Header */}
      <div
        className={`mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 text-[12px] ${
          dark ? "border-white/10 text-white/70" : "border-forest/8 text-muted"
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <label
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition ${
              dark
                ? "bg-white/10 text-white hover:bg-white/15"
                : "bg-forest/5 text-ink hover:bg-forest/8"
            }`}
          >
            <Languages className="h-3.5 w-3.5 text-emerald" />
            <select
              value={a.conv.collected.language ?? a.conv.language ?? "English"}
              onChange={(e) => a.setLanguage(e.target.value)}
              className={`cursor-pointer bg-transparent text-[12px] font-medium outline-none ${
                dark ? "text-white [&>option]:text-ink" : "text-ink"
              }`}
            >
              <option value="English">English</option>
              <option value="Hindi">हिन्दी</option>
              <option value="Marathi">मराठी</option>
              <option value="Telugu">తెలుగు</option>
            </select>
          </label>

          {/* AI Model Indicator / Key Config Button */}
          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            title={
              hasKey
                ? "Google Gemini AI Active - Click to configure key"
                : "Using Built-in Solar AI - Click to connect Gemini API key"
            }
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition ${
              hasKey
                ? "bg-emerald/20 text-emerald border border-emerald/30 hover:bg-emerald/30"
                : dark
                  ? "bg-white/10 text-white/80 hover:bg-white/16"
                  : "bg-forest/5 text-ink hover:bg-forest/8"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-sunshine" />
            <span>{hasKey ? "Gemini AI" : "Solar AI"}</span>
          </button>

          {/* Progress Tracker Pill (Clickable) */}
          <button
            type="button"
            onClick={() => setShowReqDrawer(!showReqDrawer)}
            title="View captured solar requirements"
            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11.5px] transition ${
              dark
                ? "bg-white/8 text-white hover:bg-white/14"
                : "bg-forest/5 text-ink hover:bg-forest/8"
            }`}
          >
            <span
              className={`h-1.5 w-12 overflow-hidden rounded-full ${
                dark ? "bg-white/15" : "bg-forest/12"
              }`}
            >
              <span
                className="block h-full rounded-full bg-gradient-to-r from-emerald to-sunshine transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="tabular-nums font-semibold">
              {a.progress}/{a.total} details
            </span>
          </button>
        </div>

        {/* Action Tools: Download & Restart */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={a.downloadTranscript}
            title="Download conversation transcript"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition ${
              dark
                ? "hover:bg-white/12 text-white/80 hover:text-white"
                : "hover:bg-forest/6 text-muted hover:text-ink"
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save Chat</span>
          </button>

          <button
            type="button"
            onClick={a.restart}
            title="Restart conversation"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition ${
              dark
                ? "hover:bg-white/12 text-white/80 hover:text-white"
                : "hover:bg-forest/6 text-muted hover:text-ink"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Restart</span>
          </button>
        </div>
      </div>

      {/* Gemini API Key Configuration Dialog */}
      {showKeyModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm rounded-2xl">
          <div
            className={`w-full max-w-sm rounded-2xl p-5 shadow-2xl ${
              dark ? "bg-[#103D2D] text-white border border-white/15" : "bg-white text-ink border border-forest/10"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 font-bold text-[14px]">
                <Key className="h-4 w-4 text-sunshine" />
                Google Gemini API Setup
              </span>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="rounded-full p-1 hover:opacity-70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[12px] text-muted mb-3 leading-relaxed">
              Enter your Gemini API key to power the chat with live Gemini generative intelligence. If omitted, the assistant operates on the built-in Solar Knowledge & Subsidy Engine.
            </p>

            <div className="space-y-3">
              <input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className={`w-full h-10 px-3 rounded-xl text-[13px] font-mono outline-none border transition ${
                  dark
                    ? "bg-white/10 border-white/20 text-white focus:border-sunshine"
                    : "bg-forest/5 border-forest/12 text-ink focus:border-emerald"
                }`}
              />

              <div className="flex items-center justify-between text-[11.5px]">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald underline underline-offset-2 hover:opacity-80"
                >
                  Get free Gemini API key ↗
                </a>

                {hasKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiKeyInput("")
                      setGeminiApiKey("")
                      setHasKey(false)
                      setShowKeyModal(false)
                      toast({ tone: "info", title: "Gemini Key Removed" })
                    }}
                    className="text-red-400 hover:underline"
                  >
                    Remove Key
                  </button>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className={`flex-1 h-9 rounded-xl text-[12.5px] font-medium transition ${
                    dark ? "bg-white/10 hover:bg-white/15" : "bg-forest/5 hover:bg-forest/10"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="flex-1 h-9 rounded-xl text-[12.5px] font-bold bg-emerald text-forest hover:brightness-105 transition"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Captured Requirements Accordion (if toggled) */}
      {showReqDrawer && (
        <div
          className={`mb-3 rounded-2xl p-4 transition-all ${
            dark ? "border border-white/12 bg-white/8" : "surface shadow-sm"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-emerald">
              Collected Information
            </span>
            <span className="text-[11px] text-muted">
              Auto-saved to SunFlow CRM
            </span>
          </div>
          <CollectedSummary collected={a.conv.collected} tone={tone} />
        </div>
      )}

      {/* Message Stream */}
      <div
        className={`scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1.5 ${
          compact ? "max-h-[52vh]" : ""
        }`}
        aria-live="polite"
      >
        {a.conv.messages.map((m) => (
          <ChatMessage
            key={m.id}
            message={m}
            tone={tone}
            onAction={(actionText) => a.send(actionText)}
          />
        ))}

        {/* Lead Submission Success Card */}
        {a.meta.result && (
          <div
            className={`ml-10 rounded-2xl p-4 text-[13px] shadow-sm transition-all ${
              dark
                ? "border border-emerald/30 bg-emerald/20 text-white"
                : "border border-emerald/20 bg-emerald/10 text-[#145A37]"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald" />
              <p className="font-semibold text-[14px]">
                {a.meta.result.updated
                  ? "Existing Enquiry Record Updated"
                  : "Free Site Survey & Enquiry Confirmed!"}
              </p>
            </div>
            <p className="mt-1 leading-relaxed">
              CRM Lead Reference:{" "}
              <span className="font-mono font-bold bg-white/15 px-1.5 py-0.5 rounded">
                {a.meta.result.leadId}
              </span>
              . Our solar team has scheduled your request. You can continue
              chatting with any questions!
            </p>
          </div>
        )}

        {(a.typing || a.submitting) && <TypingIndicator tone={tone} />}
        <div ref={endRef} />
      </div>

      {/* Contextual Quick Reply Action Chips */}
      {a.meta.quickReplies.length > 0 && !a.typing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {a.meta.quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => a.send(q)}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-all active:scale-95 ${
                dark
                  ? "border border-white/20 bg-white/8 text-white hover:border-sunshine/50 hover:bg-white/15"
                  : "border border-forest/12 bg-white text-ink shadow-sm hover:border-emerald hover:bg-emerald/6"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Form with Speech Recognition */}
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim() || a.typing) return
          a.send(text)
          setText("")
        }}
      >
        <div className="relative flex-1">
          <label className="sr-only" htmlFor="assistant-input">
            Message
          </label>
          <input
            id="assistant-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            className={`h-12 w-full rounded-full pl-5 pr-12 text-[14px] outline-none transition ${
              dark
                ? "border border-white/16 bg-white/10 text-white placeholder:text-white/45 focus:border-sunshine/70 focus:bg-white/14"
                : "field h-12 rounded-full pl-5 pr-12 focus:border-emerald"
            }`}
          />

          {/* Voice Speech-to-Text Button */}
          <button
            type="button"
            onClick={toggleListening}
            title={
              isListening ? "Stop listening" : "Click to speak your message"
            }
            aria-label={
              isListening ? "Stop listening" : "Speak message into input"
            }
            className={`absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full transition ${
              isListening
                ? "bg-red-500 text-white animate-pulse shadow-md"
                : dark
                  ? "text-white/60 hover:text-white hover:bg-white/10"
                  : "text-muted hover:text-ink hover:bg-forest/5"
            }`}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!text.trim() || a.typing}
          aria-label="Send message"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-sunshine to-amber text-forest font-bold shadow-[0_8px_20px_-8px_rgb(244_197_66/0.8)] transition hover:brightness-105 active:scale-95 disabled:opacity-40"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>

      {/* Footer Info & Human Handoff */}
      <div
        className={`mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px] ${
          dark ? "text-white/60" : "text-muted"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-sunshine" />
          <span>
            {hasKey ? "Powered by Google Gemini AI" : "Powered by SunFlow AI Solar Advisor"} · Real-time Estimates
          </span>
        </span>

        <span className="flex items-center gap-3">
          {compact && (
            <Link
              to="/assistant"
              className={`font-medium underline-offset-2 hover:underline ${
                dark ? "text-sunshine" : "text-botanical"
              }`}
            >
              Open full assistant
            </Link>
          )}

          <button
            type="button"
            onClick={a.human}
            disabled={a.conv.status === "Needs Human"}
            className={`inline-flex items-center gap-1 font-medium transition ${
              a.conv.status === "Needs Human"
                ? "text-amber font-semibold"
                : dark
                  ? "text-white hover:text-sunshine"
                  : "text-ink hover:text-botanical"
            }`}
          >
            <Headset className="h-3.5 w-3.5" />
            {a.conv.status === "Needs Human"
              ? "Advisor notified"
              : "Talk to human advisor"}
          </button>
        </span>
      </div>
    </div>
  )
}
