import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { CheckCheck, MessagesSquare, Send } from "lucide-react"
import { useDb } from "@/data/store"
import { relative } from "@/lib/format"
import { resolveConversation, sendAgentMessage } from "@/services/crm"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button, ButtonLink } from "@/components/ui/Button"
import { Callout, EmptyState, StatusBadge } from "@/components/ui/feedback"
import { Tabs } from "@/components/ui/data"
import { ChatMessage } from "@/components/special/ChatMessage"
import { CollectedSummary } from "@/components/special/AIChatPanel"

export default function ConversationsPage() {
  const db = useDb()
  const { run, fire, pending } = useAction()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] =
    useState<"all" | "Needs Human" | "Active" | "Completed">("all")
  const [text, setText] = useState("")
  const list = useMemo(
    () =>
      db.conversations
        .filter((c) => filter === "all" || c.status === filter)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [db, filter],
  )
  const selectedId = params.get("id") ?? list[0]?.id
  const conv = db.conversations.find((c) => c.id === selectedId)
  const name = (c: typeof db.conversations[number]) =>
    db.customers.find((x) => x.id === c.customerId)?.name ??
    c.collected.name ??
    "Website visitor"

  return (
    <>
      <PageHeader
        eyebrow="Sales & CRM"
        title="Conversations"
        description="Website assistant and WhatsApp transcripts linked to customers and leads."
      />
      <Callout tone="info" className="mb-5">
        WhatsApp is not connected in this prototype — WhatsApp threads are
        sample transcripts. Website assistant chats appear here live.
      </Callout>
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="surface overflow-hidden">
          <div className="border-b border-forest/7 p-3">
            <Tabs
              value={filter}
              onChange={setFilter}
              tabs={[
                { id: "all", label: "All", count: db.conversations.length },
                {
                  id: "Needs Human",
                  label: "Needs human",
                  count: db.conversations.filter(
                    (c) => c.status === "Needs Human",
                  ).length,
                },
                { id: "Active", label: "Active" },
                { id: "Completed", label: "Done" },
              ]}
            />
          </div>
          <ul className="scrollbar-thin max-h-[62vh] divide-y divide-forest/6 overflow-y-auto">
            {list.length === 0 && (
              <EmptyState compact title="No conversations" />
            )}
            {list.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setParams({ id: c.id })}
                  aria-current={c.id === selectedId}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                    c.id === selectedId ? "bg-emerald/8" : "hover:bg-[#F6FAF5]"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {name(c)}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">
                      {relative(c.updatedAt)}
                    </span>
                  </span>
                  <span className="truncate text-[12.5px] text-muted">
                    {c.messages.at(-1)?.text}
                  </span>
                  <span className="flex gap-1.5">
                    <StatusBadge status={c.status} />
                    <StatusBadge tone="neutral">{c.channel}</StatusBadge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {conv ? (
          <div className="surface flex min-h-[60vh] flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest/7 px-5 py-4">
              <div>
                <p className="font-semibold text-ink">{name(conv)}</p>
                <p className="text-[12.5px] text-muted">
                  {conv.id} · {conv.channel} · {conv.language}
                </p>
              </div>
              <div className="flex gap-2">
                {conv.leadId && (
                  <ButtonLink size="sm" to={`/app/leads/${conv.leadId}`}>
                    Open lead {conv.leadId}
                  </ButtonLink>
                )}
                <Button
                  size="sm"
                  icon={<CheckCheck className="h-4 w-4" />}
                  disabled={conv.status === "Completed"}
                  loading={pending === "resolve"}
                  onClick={() =>
                    fire(
                      "resolve",
                      () => resolveConversation(conv.id),
                      "Conversation resolved",
                    )
                  }
                >
                  Resolve
                </Button>
              </div>
            </div>
            <div className="grid flex-1 lg:grid-cols-[1fr_260px]">
              <div className="flex flex-col">
                <div className="scrollbar-thin max-h-[52vh] flex-1 space-y-4 overflow-y-auto bg-[#F8FBF7] p-5">
                  {conv.messages.map((m) => (
                    <ChatMessage key={m.id} message={m} />
                  ))}
                </div>
                <form
                  className="flex gap-2 border-t border-forest/7 p-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    run("send", () => sendAgentMessage(conv.id, text))
                      .then(() => setText(""))
                      .catch(() => undefined)
                  }}
                >
                  <label htmlFor="agent-reply" className="sr-only">
                    Reply
                  </label>
                  <input
                    id="agent-reply"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Reply as advisor…"
                    className="field h-11 flex-1 rounded-full"
                  />
                  <Button
                    type="submit"
                    variant="dark"
                    icon={<Send className="h-4 w-4" />}
                    disabled={!text.trim()}
                    loading={pending === "send"}
                  >
                    Send
                  </Button>
                </form>
              </div>
              <aside className="border-t border-forest/7 p-5 lg:border-t-0 lg:border-l">
                <p className="mb-3 text-[13px] font-semibold text-ink">
                  Collected details
                </p>
                <CollectedSummary collected={conv.collected} />
                {!conv.leadId && (
                  <p className="mt-4 text-[12px] text-muted">
                    Not yet linked to a lead — the assistant links it on
                    submission.
                  </p>
                )}
                {conv.customerId && (
                  <Link
                    to={`/app/leads?q=${encodeURIComponent(name(conv))}`}
                    className="mt-4 block text-[13px] font-medium text-botanical hover:underline"
                  >
                    Find customer’s leads
                  </Link>
                )}
              </aside>
            </div>
          </div>
        ) : (
          <div className="surface">
            <EmptyState
              icon={<MessagesSquare className="h-5 w-5" />}
              title="Select a conversation"
            />
          </div>
        )}
      </div>
    </>
  )
}
