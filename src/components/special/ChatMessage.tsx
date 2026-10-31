import { useState } from "react"
import type { ChatMessage as Msg } from "@/lib/types"
import { fmtTime } from "@/lib/format"
import { Check, Copy, Headset, Sparkles, Sun, Volume2, VolumeX } from "lucide-react"
import { SolarEstimateCard } from "./SolarEstimateCard"

// Simple markdown formatter for clean bullet points, bold text and highlights
function FormattedText({ text, isDark }: { text: string; isDark: boolean }) {
  const lines = text.split("\n")

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="h-1.5" />

        // Bullet point
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
          const content = trimmed.replace(/^[-*•]\s+/, "")
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald" />
              <span>{formatInline(content, isDark)}</span>
            </div>
          )
        }

        // Numbered list (e.g. 1. 2.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className={`shrink-0 text-[12px] font-bold ${isDark ? "text-sunshine" : "text-emerald"}`}>
                {numMatch[1]}.
              </span>
              <span>{formatInline(numMatch[2], isDark)}</span>
            </div>
          )
        }

        return <p key={idx}>{formatInline(line, isDark)}</p>
      })}
    </div>
  )
}

function formatInline(str: string, isDark: boolean) {
  // Parse **bold** and `code/chips`
  const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className={`font-semibold ${isDark ? "text-sunshine" : "text-emerald-700"}`}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <span
          key={i}
          className={`mx-0.5 rounded px-1.5 py-0.5 font-mono text-[12.5px] ${
            isDark ? "bg-white/15 text-sunshine" : "bg-forest/8 text-forest"
          }`}
        >
          {part.slice(1, -1)}
        </span>
      )
    }
    return part
  })
}

export function ChatMessage({
  message,
  tone = "light",
  onAction,
}: {
  message: Msg
  tone?: "light" | "dark"
  onAction?: (actionText: string) => void
}) {
  const mine = message.from === "customer"
  const agent = message.from === "agent"
  const isDark = tone === "dark"
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return

    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(message.text)
    utterance.rate = 1.05
    utterance.pitch = 1.0
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div
      className={`group flex items-end gap-2.5 ${
        mine ? "justify-end" : "justify-start"
      }`}
    >
      {!mine && (
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
            agent
              ? "bg-sunshine text-forest"
              : "bg-gradient-to-br from-emerald to-botanical text-white"
          }`}
          aria-hidden="true"
        >
          {agent ? (
            <Headset className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4 text-sunshine" />
          )}
        </span>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[78%] ${
          mine ? "items-end" : "items-start"
        } flex flex-col`}
      >
        <div
          className={`relative rounded-[22px] px-4.5 py-3 text-[13.5px] leading-relaxed transition-all ${
            mine
              ? "rounded-br-sm bg-gradient-to-r from-forest to-[#174A37] text-white shadow-sm"
              : isDark
                ? "rounded-bl-sm border border-white/14 bg-white/10 text-white shadow-sm backdrop-blur-md"
                : "rounded-bl-sm border border-forest/8 bg-white text-ink shadow-[0_2px_8px_rgb(16_61_45/0.06)]"
          }`}
        >
          <FormattedText text={message.text} isDark={isDark || mine} />

          {/* Render Solar Estimate Card if attached */}
          {message.estimate && (
            <SolarEstimateCard
              estimate={message.estimate}
              tone={tone}
              onSelectAction={onAction}
            />
          )}

          {/* Quick message tool actions (Copy & Text-to-Speech) on hover */}
          {!mine && (
            <div className="mt-2.5 flex items-center justify-end gap-2 border-t border-white/10 pt-1.5 opacity-80 transition group-hover:opacity-100">
              <button
                type="button"
                onClick={handleSpeech}
                title={speaking ? "Stop listening" : "Listen to answer"}
                aria-label={speaking ? "Stop speech" : "Read message aloud"}
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition ${
                  isDark
                    ? "hover:bg-white/12 text-white/70 hover:text-white"
                    : "hover:bg-forest/6 text-muted hover:text-ink"
                }`}
              >
                {speaking ? (
                  <>
                    <VolumeX className="h-3 w-3 text-amber animate-pulse" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3 w-3" />
                    <span>Listen</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                title="Copy text"
                aria-label="Copy message text"
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition ${
                  isDark
                    ? "hover:bg-white/12 text-white/70 hover:text-white"
                    : "hover:bg-forest/6 text-muted hover:text-ink"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald" />
                    <span className="text-emerald">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <span
          className={`mt-1 px-1.5 text-[11px] ${
            isDark ? "text-white/50" : "text-muted"
          }`}
        >
          {agent
            ? `${message.authorName ?? "Advisor"} · `
            : message.from === "assistant"
              ? "SunFlow AI Advisor · "
              : ""}
          {fmtTime(message.at)}
        </span>
      </div>
    </div>
  )
}

export function TypingIndicator({
  tone = "light",
}: {
  tone?: "light" | "dark"
}) {
  const isDark = tone === "dark"
  return (
    <div
      className="flex items-end gap-2.5"
      role="status"
      aria-label="Assistant is typing"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald to-botanical text-white shadow-sm">
        <Sun className="h-4 w-4 text-sunshine animate-spin" style={{ animationDuration: "10s" }} />
      </span>
      <div
        className={`flex items-center gap-1.5 rounded-[22px] rounded-bl-sm px-4.5 py-3 ${
          isDark
            ? "border border-white/12 bg-white/10"
            : "border border-forest/8 bg-white shadow-sm"
        }`}
      >
        <span className="text-[12px] font-medium mr-1.5 text-muted">Thinking</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full animate-bounce ${
              isDark ? "bg-sunshine" : "bg-emerald"
            }`}
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  )
}
