import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import {
  ArrowUp,
  CheckCircle2,
  Headset,
  Languages,
  RotateCcw,
} from "lucide-react"
import type { AssistantFields, Conversation } from "@/lib/types"
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
const ORDER: keyof AssistantFields[] = [
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
    return { id: c.id, slot: "language", quickReplies: [...LANGUAGES] }
  })
  const [draft, setDraft] = useState<Conversation>(
    () =>
      getDb().conversations.find((c) => c.id === meta.id) ??
      freshConversation(),
  )
  const [typing, setTyping] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const stored = db.conversations.find((c) => c.id === draft.id)
  // Agents can reply from the Conversations module; reflect their messages here.
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
    if (!t || typing || meta.slot === "done") return
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
        messages: [...withUser.messages, newMessage("assistant", turn.text)],
        updatedAt: new Date().toISOString(),
      }
      await persist(next)
      setMeta((m) => ({
        ...m,
        slot: turn.nextSlot,
        quickReplies: turn.quickReplies,
      }))
      if (turn.nextSlot === "done") {
        setSubmitting(true)
        try {
          const r = await submitAssistantEnquiry(next.id)
          setMeta((m) => ({ ...m, result: r, quickReplies: [] }))
          toast({
            tone: "success",
            title: r.updated ? "Existing enquiry updated" : "Enquiry submitted",
            description: `Reference ${r.leadId}`,
          })
        } catch (e) {
          toast({
            tone: "error",
            title: "Enquiry not submitted",
            description: errorMessage(e),
          })
          setMeta((m) => ({
            ...m,
            slot: "confirm",
            quickReplies: ["Yes, submit"],
          }))
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
            "I have notified a SunFlow 360 advisor. They will join this conversation shortly (demo: visible in the Conversations module).",
          ),
        ],
      })
      toast({ tone: "success", title: "An advisor has been notified" })
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
    setMeta({ id: c.id, slot: "language", quickReplies: [...LANGUAGES] })
  }

  const setLanguage = (lang: string) => {
    if (meta.slot === "language") send(lang)
    else
      setDraft({
        ...conv,
        language: languageName(lang),
        collected: { ...conv.collected, language: languageName(lang) },
      })
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
  const [text, setText] = useState("")
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(
    () => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    [a.conv.messages.length, a.typing],
  )
  const dark = tone === "dark"
  const pct = Math.round((a.progress / a.total) * 100)
  const showSummary = a.meta.slot === "confirm" || a.meta.slot === "done"
  const placeholder = useMemo(
    () =>
      a.meta.slot === "phone"
        ? "e.g. 98765 43210"
        : a.meta.slot === "done"
          ? "Enquiry submitted"
          : "Type your answer…",
    [a.meta.slot],
  )
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`mb-3 flex flex-wrap items-center gap-2 text-[12px] ${
          dark ? "text-white/70" : "text-muted"
        }`}
      >
        <label
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
            dark ? "bg-white/10" : "bg-forest/5"
          }`}
        >
          <Languages className="h-3.5 w-3.5" />
          <span className="sr-only">Language</span>
          <select
            value={a.conv.collected.language ?? "English"}
            onChange={(e) => a.setLanguage(e.target.value)}
            className={`bg-transparent text-[12px] font-medium outline-none ${
              dark ? "text-white [&>option]:text-ink" : "text-ink"
            }`}
          >
            <option value="English">English</option>
            <option value="Hindi">हिन्दी</option>
            <option value="Marathi">मराठी</option>
            <option value="Telugu">తెలుగు</option>
          </select>
        </label>
        <span className="flex flex-1 items-center gap-2">
          <span
            className={`h-1.5 flex-1 overflow-hidden rounded-full ${
              dark ? "bg-white/12" : "bg-forest/8"
            }`}
          >
            <span
              className="block h-full rounded-full bg-gradient-to-r from-emerald to-sunshine transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="tabular-nums">
            {a.progress}/{a.total} details
          </span>
        </span>
        <button
          type="button"
          onClick={a.restart}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
            dark ? "hover:bg-white/10" : "hover:bg-forest/6"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restart
        </button>
      </div>

      <div
        className={`scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 ${
          compact ? "max-h-[52vh]" : ""
        }`}
        aria-live="polite"
      >
        {a.conv.messages.map((m) => (
          <ChatMessage key={m.id} message={m} tone={tone} />
        ))}
        {showSummary && (
          <div
            className={`ml-9 rounded-2xl p-4 ${
              dark ? "border border-white/12 bg-white/8" : "surface"
            }`}
          >
            <p
              className={`mb-3 text-[13px] font-semibold ${
                dark ? "text-white" : "text-ink"
              }`}
            >
              Confirmation summary
            </p>
            <CollectedSummary collected={a.conv.collected} tone={tone} />
          </div>
        )}
        {a.meta.result && (
          <div
            className={`ml-9 rounded-2xl p-4 text-[13px] ${
              dark ? "bg-emerald/20 text-white" : "bg-emerald/10 text-[#145A37]"
            }`}
          >
            <p className="font-semibold">
              {a.meta.result.updated
                ? "We found your existing enquiry and added the missing details."
                : "Enquiry created."}
            </p>
            <p className="mt-0.5">
              Reference{" "}
              <span className="font-mono">{a.meta.result.leadId}</span> — our
              sales team can see it now.
            </p>
          </div>
        )}
        {(a.typing || a.submitting) && <TypingIndicator tone={tone} />}
        <div ref={endRef} />
      </div>

      {a.meta.quickReplies.length > 0 && !a.typing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {a.meta.quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => a.send(q)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-all active:scale-95 ${
                dark
                  ? "border border-white/20 bg-white/8 text-white hover:bg-white/16"
                  : "border border-forest/12 bg-white text-ink hover:border-emerald hover:bg-emerald/6"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          a.send(text)
          setText("")
        }}
      >
        <label className="sr-only" htmlFor="assistant-input">
          Message
        </label>
        <input
          id="assistant-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={a.meta.slot === "done"}
          placeholder={placeholder}
          autoComplete="off"
          className={`h-12 min-w-0 flex-1 rounded-full px-5 text-[14px] outline-none transition ${
            dark
              ? "border border-white/15 bg-white/10 text-white placeholder:text-white/45 focus:border-sunshine/60"
              : "field h-12 rounded-full px-5"
          }`}
        />
        <button
          type="submit"
          disabled={!text.trim() || a.typing || a.meta.slot === "done"}
          aria-label="Send message"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sunshine text-forest shadow-[0_8px_20px_-8px_rgb(244_197_66/0.8)] transition active:scale-95 disabled:opacity-40"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
      <div
        className={`mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px] ${
          dark ? "text-white/55" : "text-muted"
        }`}
      >
        <span>
          Scripted demo assistant — not connected to an AI model or WhatsApp.
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
            className={`inline-flex items-center gap-1 font-medium disabled:opacity-50 ${
              dark
                ? "text-white hover:text-sunshine"
                : "text-ink hover:text-botanical"
            }`}
          >
            <Headset className="h-3.5 w-3.5" />
            {a.conv.status === "Needs Human"
              ? "Advisor notified"
              : "Talk to a human"}
          </button>
        </span>
      </div>
    </div>
  )
}

export { SLOT_ORDER }
