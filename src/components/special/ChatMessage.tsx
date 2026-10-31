import type { ChatMessage as Msg } from "@/lib/types"
import { fmtTime } from "@/lib/format"
import { Headset, Sun } from "lucide-react"

export function ChatMessage({
  message,
  tone = "light",
}: {
  message: Msg
  tone?: "light" | "dark"
}) {
  const mine = message.from === "customer"
  const agent = message.from === "agent"
  return (
    <div
      className={`flex items-end gap-2 ${
        mine ? "justify-end" : "justify-start"
      }`}
    >
      {!mine && (
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            agent
              ? "bg-sunshine text-forest"
              : "bg-gradient-to-br from-botanical to-forest text-sunshine"
          }`}
          aria-hidden="true"
        >
          {agent ? (
            <Headset className="h-3.5 w-3.5" />
          ) : (
            <Sun className="h-3.5 w-3.5" />
          )}
        </span>
      )}
      <div
        className={`max-w-[80%] ${
          mine ? "items-end" : "items-start"
        } flex flex-col`}
      >
        <div
          className={`rounded-[20px] px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-line ${
            mine
              ? "rounded-br-md bg-forest text-white"
              : tone === "dark"
                ? "rounded-bl-md border border-white/12 bg-white/10 text-white"
                : "rounded-bl-md border border-forest/8 bg-white text-ink shadow-[0_1px_2px_rgb(16_61_45/0.05)]"
          }`}
        >
          {message.text}
        </div>
        <span
          className={`mt-1 px-1 text-[11px] ${
            tone === "dark" ? "text-white/50" : "text-muted"
          }`}
        >
          {agent
            ? `${message.authorName ?? "Advisor"} · `
            : message.from === "assistant"
              ? "Assistant (demo) · "
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
  return (
    <div
      className="flex items-end gap-2"
      role="status"
      aria-label="Assistant is typing"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-botanical to-forest text-sunshine">
        <Sun className="h-3.5 w-3.5" />
      </span>
      <div
        className={`flex gap-1 rounded-[20px] rounded-bl-md px-4 py-3.5 ${
          tone === "dark" ? "bg-white/10" : "border border-forest/8 bg-white"
        }`}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`typing-dot h-1.5 w-1.5 rounded-full ${
              tone === "dark" ? "bg-white" : "bg-botanical"
            }`}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
