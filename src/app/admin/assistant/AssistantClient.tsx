"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, Check, Loader2, Mic, MicOff, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import type { ConversationDTO, MessageDTO } from "@/lib/admin/assistant/conversations";
import type { Proposal } from "@/lib/admin/assistant/types";
import { splitFollowUps } from "@/lib/admin/assistant/prompt";
import ProposalCard, { btn, btnPrimary, pill } from "./ProposalCard";
import AlertsPanel, { type AlertItem } from "./AlertsPanel";
import { useSpeechInput } from "./useSpeechInput";

export const QUICK_PROMPTS: { label: string; text: string }[] = [
  {
    label: "Daily briefing",
    text: "Give me the daily briefing: workspaces needing attention, failed or late jobs, the moderation queue, switches that are not on, maintenance coming up, and the numbers for the last day.",
  },
  { label: "Trials ending this week", text: "Which trials end in the next 7 days, and who should we talk to first?" },
  { label: "Failed jobs and why", text: "Which scheduled jobs failed or are late in the last 48 hours, and why?" },
  {
    label: "Draft a maintenance notice",
    text: "Draft a maintenance notice for the whole site this coming Saturday at 06:00 UTC for 60 minutes, and prepare it as a maintenance card.",
  },
  { label: "Moderation queue summary", text: "Summarise the moderation queue: what is waiting and for how long." },
];

type Status = { configured: boolean; paused: string | null; model: string };

function groupConversations(list: ConversationDTO[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = startOfToday.getTime() - 6 * 86_400_000;
  const groups: { label: string; items: ConversationDTO[] }[] = [
    { label: "Today", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const c of list) {
    const t = new Date(c.updatedAt).getTime();
    groups[t >= startOfToday.getTime() ? 0 : t >= weekAgo ? 1 : 2].items.push(c);
  }
  return groups.filter((g) => g.items.length);
}

function setUrl(id: string | null) {
  try {
    window.history.replaceState(null, "", id ? `/admin/assistant?c=${encodeURIComponent(id)}` : "/admin/assistant");
  } catch {
    /* ignore */
  }
}

function ConversationRow({
  c,
  active,
  onOpen,
  onRenamed,
  onDeleted,
}: {
  c: ConversationDTO;
  active: boolean;
  onOpen: () => void;
  onRenamed: (title: string) => void;
  onDeleted: () => void;
}) {
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [title, setTitle] = useState(c.title);
  const [busy, setBusy] = useState(false);

  async function rename() {
    const t = title.trim();
    if (!t || t === c.title) return setMode("view");
    setBusy(true);
    const res = await fetch(`/api/admin/assistant/conversations/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) onRenamed(t);
    setMode("view");
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/admin/assistant/conversations/${c.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (res?.ok) onDeleted();
    else setMode("view");
  }

  if (mode === "rename") {
    return (
      <form
        className="flex items-center gap-1 px-1"
        onSubmit={(e) => {
          e.preventDefault();
          void rename();
        }}
      >
        <input
          autoFocus
          aria-label="Conversation title"
          className="flex-1 min-w-0 rounded-md border border-border bg-bg px-2 py-1 text-sm text-fg outline-none focus:border-secondary"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setMode("view")}
        />
        <button type="submit" aria-label="Save title" disabled={busy} className="p-1 text-muted hover:text-fg">
          <Check className="w-4 h-4" />
        </button>
      </form>
    );
  }
  if (mode === "delete") {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-panel text-sm">
        <span className="flex-1 text-fg truncate">Delete this conversation?</span>
        <button type="button" disabled={busy} onClick={remove} className="text-danger font-medium">
          Delete
        </button>
        <button type="button" onClick={() => setMode("view")} className="text-muted">
          Keep
        </button>
      </div>
    );
  }
  return (
    <div className={`group flex items-center rounded-md ${active ? "bg-panel" : "hover:bg-panel"}`}>
      <button
        type="button"
        onClick={onOpen}
        className={`flex-1 min-w-0 text-left px-2.5 py-2 text-sm truncate ${active ? "text-fg font-medium" : "text-muted"}`}
        title={c.title}
      >
        {c.title}
      </button>
      <div className="hidden group-hover:flex group-focus-within:flex items-center pr-1">
        <button type="button" aria-label="Rename" onClick={() => setMode("rename")} className="p-1 text-subtle hover:text-fg">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button type="button" aria-label="Delete" onClick={() => setMode("delete")} className="p-1 text-subtle hover:text-danger">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function AssistantMessage({
  m,
  onProposal,
  onFollowUp,
  disabled,
}: {
  m: MessageDTO;
  onProposal: (p: Proposal) => void;
  onFollowUp: (text: string) => void;
  disabled: boolean;
}) {
  const { body, followUps } = useMemo(() => splitFollowUps(m.content), [m.content]);
  const links = m.toolCalls.filter((t) => t.href && t.ok);
  const firstLink = links[links.length - 1];
  return (
    <div className="self-start flex flex-col gap-2 max-w-[720px] w-full">
      {m.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {m.toolCalls.map((t, i) => {
            const cls = `inline-flex items-center h-6 px-2 rounded-full text-xs font-medium ${t.ok ? pill.off : pill.warn}`;
            return t.href ? (
              <Link key={i} href={t.href} className={`${cls} hover:text-fg`} title={t.name}>
                {t.summary}
              </Link>
            ) : (
              <span key={i} className={cls} title={t.name}>
                {t.summary}
              </span>
            );
          })}
        </div>
      )}
      {body && <div className="text-sm leading-relaxed text-fg whitespace-pre-wrap break-words">{body}</div>}
      {m.proposal && <ProposalCard messageId={m.id} proposal={m.proposal} onChange={onProposal} />}
      {(followUps.length > 0 || firstLink) && (
        <div className="flex gap-2 flex-wrap">
          {followUps.map((f) => (
            <button key={f} type="button" className={btn} disabled={disabled} onClick={() => onFollowUp(f)}>
              {f}
            </button>
          ))}
          {firstLink?.href && (
            <Link href={firstLink.href} className={btn}>
              Open in console
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function AssistantClient({
  initialConversations,
  initialConversation,
  initialMessages,
  status,
  alerts,
}: {
  initialConversations: ConversationDTO[];
  initialConversation: string | null;
  initialMessages: MessageDTO[];
  status: Status;
  alerts: AlertItem[];
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversation);
  const [messages, setMessages] = useState<MessageDTO[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const speech = useSpeechInput((text) => setInput((v) => (v.trim() ? `${v.trim()} ${text}` : text)));

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  const groups = useMemo(() => groupConversations(conversations), [conversations]);
  const blocked = !status.configured || !!status.paused;

  const open = useCallback(async (id: string | null) => {
    setError(null);
    setActiveId(id);
    setUrl(id);
    if (!id) {
      setMessages([]);
      inputRef.current?.focus();
      return;
    }
    setLoadingConv(true);
    try {
      const res = await fetch(`/api/admin/assistant/conversations/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not open the conversation");
      setMessages(data.messages as MessageDTO[]);
    } catch (err) {
      setError((err as Error).message);
      setMessages([]);
    } finally {
      setLoadingConv(false);
    }
  }, []);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setPending(message);
    setInput("");
    try {
      const res = await fetch("/api/admin/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `The assistant failed (${res.status})`);
      const conv = data.conversation as ConversationDTO;
      setMessages((prev) => (activeId === conv.id ? [...prev, ...(data.messages as MessageDTO[])] : (data.messages as MessageDTO[])));
      setConversations((list) => [conv, ...list.filter((c) => c.id !== conv.id)]);
      if (activeId !== conv.id) {
        setActiveId(conv.id);
        setUrl(conv.id);
      }
    } catch (err) {
      setError((err as Error).message);
      setInput(message);
    } finally {
      setPending(null);
    }
  }

  function updateProposal(id: string, p: Proposal) {
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, proposal: p } : m)));
  }

  return (
    <div className="-my-2 flex rounded-xl border border-border bg-surface overflow-hidden h-[calc(100vh-64px-4rem)] min-h-[560px]">
      {/* Conversations */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <h1 className="flex-1 text-base font-semibold text-fg">Assistant</h1>
          <button type="button" className={btn} onClick={() => open(null)}>
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-3 flex flex-col gap-0.5" aria-label="Conversations">
          {groups.length === 0 && <p className="px-2.5 py-2 text-sm text-subtle">No conversations yet.</p>}
          {groups.map((g) => (
            <div key={g.label} className="flex flex-col gap-0.5">
              <div className="px-2.5 pt-3 pb-1 text-xs font-semibold text-subtle">{g.label}</div>
              {g.items.map((c) => (
                <ConversationRow
                  key={c.id}
                  c={c}
                  active={c.id === activeId}
                  onOpen={() => open(c.id)}
                  onRenamed={(title) => setConversations((l) => l.map((x) => (x.id === c.id ? { ...x, title } : x)))}
                  onDeleted={() => {
                    setConversations((l) => l.filter((x) => x.id !== c.id));
                    if (c.id === activeId) void open(null);
                  }}
                />
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-border px-4 py-3 flex flex-col gap-0.5">
          <div className="text-xs font-semibold text-subtle">Model</div>
          <div className="text-sm text-fg">{status.model}, tools on</div>
          <div className="text-xs text-muted">Every tool call is in the audit log. Writes need your approval.</div>
        </div>
      </aside>

      {/* Chat */}
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
          <div className="flex-1 min-w-0 text-sm font-medium text-fg truncate">
            {conversations.find((c) => c.id === activeId)?.title ?? "New conversation"}
          </div>
          <button type="button" className="md:hidden inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border text-sm" onClick={() => open(null)}>
            <Plus className="w-3.5 h-3.5" /> New
          </button>
          <button
            type="button"
            className={btn}
            aria-expanded={showAlerts}
            onClick={() => setShowAlerts((v) => !v)}
          >
            <BellRing className="w-3.5 h-3.5" /> Alerts
            {alerts.length > 0 && <span className={`ml-0.5 inline-flex items-center h-5 px-1.5 rounded-full text-xs ${pill.warn}`}>{alerts.length}</span>}
          </button>
        </div>

        {showAlerts && (
          <div className="border-b border-border px-5 py-2 max-h-[45%] overflow-y-auto">
            <div className="flex items-center justify-between pt-1">
              <div className="text-sm font-medium text-fg">Open alerts from the hourly scan</div>
              <button type="button" aria-label="Close alerts" className="p-1 text-muted hover:text-fg" onClick={() => setShowAlerts(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <AlertsPanel initial={alerts} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 md:px-8 py-5 flex flex-col gap-5">
          {status.paused && (
            <div className="rounded-xl border border-border bg-panel px-4 py-3 text-sm text-fg">
              <span className={`mr-2 inline-flex items-center h-6 px-2 rounded-full text-xs font-medium ${pill.warn}`}>Paused</span>
              {status.paused}
            </div>
          )}
          {!status.configured && (
            <div className="rounded-xl border border-border bg-panel px-4 py-3 text-sm text-fg">
              <span className={`mr-2 inline-flex items-center h-6 px-2 rounded-full text-xs font-medium ${pill.bad}`}>Not configured</span>
              Assistant is not configured: set GEMINI_API_KEY.
            </div>
          )}
          {loadingConv && (
            <div className="text-sm text-muted inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Opening…
            </div>
          )}
          {!loadingConv && messages.length === 0 && !pending && (
            <div className="m-auto text-center max-w-md flex flex-col gap-1.5 py-10">
              <div className="text-base font-medium text-fg">Ask about any workspace, person, job or number</div>
              <p className="text-sm text-muted">
                The assistant looks things up through named tools and prepares changes as cards. Nothing changes until you approve a card.
              </p>
            </div>
          )}
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="self-end max-w-[720px] rounded-xl rounded-br-sm bg-panel px-3.5 py-2.5 text-sm text-fg whitespace-pre-wrap break-words">
                {m.content}
              </div>
            ) : (
              <AssistantMessage
                key={m.id}
                m={m}
                disabled={!!pending || blocked}
                onProposal={(p) => updateProposal(m.id, p)}
                onFollowUp={(t) => void send(t)}
              />
            ),
          )}
          {pending && (
            <>
              <div className="self-end max-w-[720px] rounded-xl rounded-br-sm bg-panel px-3.5 py-2.5 text-sm text-fg whitespace-pre-wrap">{pending}</div>
              <div className="self-start inline-flex items-center gap-2 text-sm text-muted">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking…
              </div>
            </>
          )}
          {error && (
            <div role="alert" className="self-start max-w-[720px] rounded-xl border border-border bg-surface px-4 py-3 text-sm">
              <span className={`mr-2 inline-flex items-center h-6 px-2 rounded-full text-xs font-medium ${pill.bad}`}>Error</span>
              <span className="text-fg">{error}</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="px-5 md:px-8 pt-3 pb-4 flex flex-col gap-2 border-t border-border">
          <div className="flex gap-2 flex-wrap">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={!!pending || blocked}
                onClick={() => void send(q.text)}
                className="inline-flex items-center h-7 px-3 rounded-full border border-border bg-panel text-xs font-medium text-muted hover:text-fg transition disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>
          <form
            className="flex items-end gap-2 rounded-xl border border-border bg-bg p-1.5 pl-3.5 focus-within:border-secondary"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <label htmlFor="assistant-input" className="sr-only">
              Ask the assistant
            </label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              rows={1}
              value={input}
              disabled={blocked}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Ask about any workspace, user, job or number, or tell me what to prepare"
              className="flex-1 resize-none bg-transparent py-1.5 text-sm text-fg outline-none placeholder:text-subtle max-h-40"
            />
            {speech.supported && (
              <button
                type="button"
                className={btn}
                aria-label={speech.listening ? "Stop voice input" : "Voice input"}
                aria-pressed={speech.listening}
                disabled={blocked}
                onClick={speech.toggle}
              >
                {speech.listening ? <MicOff className="w-4 h-4 text-danger" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button type="submit" className={btnPrimary} disabled={!input.trim() || !!pending || blocked}>
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
          {speech.error && <p className="text-xs text-warning">{speech.error}</p>}
          <p className="text-xs text-muted">
            Reads anything in the database through named tools, never raw SQL. Writes are prepared as cards and only run when you approve.
          </p>
        </div>
      </section>
    </div>
  );
}
