"use client";

/**
 * The floating assistant button on every admin page. It talks to the same
 * backend as /admin/assistant (POST /api/admin/assistant/chat): it opens the
 * latest conversation, shows the text of each answer, and sends approval
 * cards to the full page. The badge counts open alerts from the hourly scan.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Loader2, Mic, MicOff, Plus, Send, X } from "lucide-react";
import GemmaMark from "./copilot/GemmaMark";
import { useSpeechInput } from "./assistant/useSpeechInput";
import { splitFollowUps } from "@/lib/admin/assistant/prompt";
import type { MessageDTO } from "@/lib/admin/assistant/conversations";

const iconBtn = "inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-fg hover:bg-panel transition";

export default function FloatingJarvisAgent() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const speech = useSpeechInput((text) => setInput((v) => (v.trim() ? `${v.trim()} ${text}` : text)));

  // Badge: unresolved alerts, polled every 60 s.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/admin/assistant/alerts-count", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (typeof data?.count === "number") setAlertCount(data.count);
      } catch {
        /* try again next tick */
      }
    }
    void poll();
    const t = setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // First open: load the latest conversation.
  const loadLatest = useCallback(async () => {
    setLoaded(true);
    try {
      const list = await fetch("/api/admin/assistant/conversations").then((r) => (r.ok ? r.json() : null));
      const latest = list?.conversations?.[0];
      if (!latest) return;
      const data = await fetch(`/api/admin/assistant/conversations/${latest.id}`).then((r) => (r.ok ? r.json() : null));
      if (!data) return;
      setConversationId(latest.id);
      setMessages((data.messages as MessageDTO[]).slice(-20));
    } catch {
      /* start empty */
    }
  }, []);

  useEffect(() => {
    if (open && !loaded) void loadLatest();
  }, [open, loaded, loadLatest]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending, open]);

  async function send() {
    const message = input.trim();
    if (!message || pending) return;
    setPending(true);
    setError(null);
    setInput("");
    try {
      const res = await fetch("/api/admin/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `The assistant failed (${res.status})`);
      setConversationId(data.conversation.id);
      setMessages((prev) => (conversationId === data.conversation.id ? [...prev, ...data.messages] : data.messages));
    } catch (err) {
      setError((err as Error).message);
      setInput(message);
    } finally {
      setPending(false);
    }
  }

  // The full page has its own chat.
  if (pathname?.startsWith("/admin/assistant")) return null;

  const fullHref = conversationId ? `/admin/assistant?c=${encodeURIComponent(conversationId)}` : "/admin/assistant";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full border border-border bg-surface shadow-md flex items-center justify-center hover:bg-panel transition"
      >
        <GemmaMark size={26} />
        {alertCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-warning text-bg text-xs font-semibold flex items-center justify-center"
            title={`${alertCount} open alerts`}
          >
            {alertCount > 99 ? "99+" : alertCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Assistant"
          className="fixed bottom-20 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-7rem)] rounded-xl border border-border bg-surface shadow-xl flex flex-col"
        >
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
            <div className="flex-1 text-sm font-medium text-fg pl-1">Assistant</div>
            <button
              type="button"
              className={iconBtn}
              aria-label="New conversation"
              onClick={() => {
                setConversationId(null);
                setMessages([]);
                setError(null);
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
            <Link href={fullHref} className={iconBtn} aria-label="Open the full assistant" onClick={() => setOpen(false)}>
              <ExternalLink className="w-4 h-4" />
            </Link>
            <button type="button" className={iconBtn} aria-label="Close" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
            {messages.length === 0 && !pending && (
              <p className="text-sm text-muted m-auto text-center px-4">
                Ask about any workspace, person, job or number.
                {alertCount > 0 && (
                  <>
                    {" "}
                    There {alertCount === 1 ? "is 1 open alert" : `are ${alertCount} open alerts`};{" "}
                    <Link href="/admin/assistant" className="text-secondary-soft underline" onClick={() => setOpen(false)}>
                      review them
                    </Link>
                    .
                  </>
                )}
              </p>
            )}
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="self-end max-w-[90%] rounded-xl rounded-br-sm bg-panel px-3 py-2 text-sm text-fg whitespace-pre-wrap break-words">
                  {m.content}
                </div>
              ) : (
                <div key={m.id} className="self-start max-w-[95%] flex flex-col gap-1.5">
                  {m.toolCalls.length > 0 && (
                    <div className="text-xs text-subtle">Checked: {m.toolCalls.map((t) => t.summary).join(" · ")}</div>
                  )}
                  {m.content && <div className="text-sm text-fg whitespace-pre-wrap break-words">{splitFollowUps(m.content).body}</div>}
                  {m.proposal && (
                    <Link
                      href={fullHref}
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-secondary/40 px-3 py-2 text-sm text-fg hover:bg-panel"
                    >
                      <span className="block font-medium">{m.proposal.summary}</span>
                      <span className="block text-xs text-muted">
                        {m.proposal.status === "pending" ? "Needs your approval. Review it in the assistant." : `Card ${m.proposal.status}.`}
                      </span>
                    </Link>
                  )}
                </div>
              ),
            )}
            {pending && (
              <div className="self-start inline-flex items-center gap-2 text-sm text-muted">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking…
              </div>
            )}
            {error && (
              <div role="alert" className="text-sm text-danger">
                {error}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-center gap-1.5 border-t border-border p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label htmlFor="floating-assistant-input" className="sr-only">
              Ask the assistant
            </label>
            <input
              id="floating-assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the assistant"
              className="flex-1 min-w-0 h-9 rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none focus:border-secondary placeholder:text-subtle"
            />
            {speech.supported && (
              <button type="button" className={iconBtn} aria-label={speech.listening ? "Stop voice input" : "Voice input"} aria-pressed={speech.listening} onClick={speech.toggle}>
                {speech.listening ? <MicOff className="w-4 h-4 text-danger" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim() || pending}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-secondary text-bg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
