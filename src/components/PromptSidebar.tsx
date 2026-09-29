import React, { useState, useRef, useEffect } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import { Sparkles, X, Send, User, Bot, Loader2, LogIn } from "lucide-react";
import Link from "next/link";
import { PLAYGROUND_ASSIST_DAILY_LIMIT } from "@/lib/playground-assist";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const GREETING =
  "Hi! I can help with the code in this playground only — a few free " +
  "messages a day. What are you stuck on?";

export default function PromptSidebar({
  onClose,
  contextLabel = "",
  signedIn = true,
}: {
  onClose: () => void;
  contextLabel?: string;
  signedIn?: boolean;
}) {
  const { sandpack } = useSandpack();
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(PLAYGROUND_ASSIST_DAILY_LIMIT);
  const [assistDisabled, setAssistDisabled] = useState(false);
  // Blocks the input with a placeholder notice (quota spent or admin-disabled).
  const [blocked, setBlocked] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Public config probe — no quota consumed. Picks up the admin-set daily
  // limit and kill switch so the UI never promises what the server refuses.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/playground/assist", { method: "GET" })
      .then((res) => res.json().catch(() => null))
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.dailyLimit === "number" && data.dailyLimit > 0) {
          setLimit(data.dailyLimit);
        }
        if (data.enabled === false) {
          setAssistDisabled(true);
          setBlocked("AI Assist is currently disabled");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const pushAssistant = (text: string) =>
    setMessages((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, role: "assistant", text }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMsg = input.trim();
    if (!userMsg || loading || blocked || assistDisabled) return;

    const nextMessages: Message[] = [
      ...messages,
      { id: Date.now().toString(), role: "user", text: userMsg },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const activeFile = sandpack.activeFile;
      const fileData = sandpack.files[activeFile];
      const code = typeof fileData === "string" ? fileData : (fileData?.code ?? "");
      const history = nextMessages
        .slice(-7, -1)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch("/api/playground/assist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history,
          fileName: activeFile,
          code,
          contextLabel,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        pushAssistant("Please sign in to use AI Assist.");
        return;
      }
      if (res.status === 403) {
        setAssistDisabled(true);
        setBlocked("AI Assist is currently disabled");
        pushAssistant(
          data?.error ?? "AI Assist is currently disabled. Check back later.",
        );
        return;
      }
      if (res.status === 429) {
        setBlocked("Daily limit reached — back tomorrow");
        setRemaining(0);
        pushAssistant(
          data?.error ??
            `Daily limit reached (${limit} messages/day). Try again tomorrow.`,
        );
        return;
      }
      if (!res.ok || typeof data?.reply !== "string" || !data.reply.trim()) {
        pushAssistant(
          data?.error ?? "AI Assist is temporarily unavailable. Try again in a moment.",
        );
        return;
      }
      if (typeof data?.remaining === "number") setRemaining(data.remaining);
      if (typeof data?.limit === "number" && data.limit > 0) setLimit(data.limit);
      pushAssistant(data.reply.trim());
    } catch {
      pushAssistant("Could not reach AI Assist. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const quotaLine = assistDisabled
    ? "Disabled"
    : remaining !== null
      ? `${remaining} of ${limit} left today`
      : `${limit} messages/day`;

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-secondary" aria-hidden />
          <span className="whitespace-nowrap text-[13px] font-medium text-fg">AI assist</span>
          <span
            className="truncate text-[12px] text-subtle"
            title="Scoped to this playground's code"
          >
            {quotaLine}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI Assistant"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4" ref={scrollRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${
              m.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                m.role === "user"
                  ? "bg-panel text-muted"
                  : "border border-border bg-bg text-secondary"
              }`}
            >
              {m.role === "user" ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
            </div>
            <div
              className={`whitespace-pre-wrap px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === "user"
                  ? "max-w-[85%] rounded-lg rounded-tr-sm bg-panel text-fg"
                  : "max-w-[88%] rounded-lg rounded-tl-sm border border-border bg-bg text-muted"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-bg text-secondary">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center rounded-lg rounded-tl-sm border border-border bg-bg px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-subtle" aria-label="Thinking" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        {!signedIn ? (
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent/90"
          >
            <LogIn className="w-4 h-4" />
            Sign in to use AI Assist
          </Link>
        ) : assistDisabled ? (
          <p className="rounded-md border border-border bg-bg px-4 py-2.5 text-center text-[13px] text-subtle">
            AI Assist is currently disabled
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={blocked ?? "Ask about your code..."}
              disabled={blocked !== null}
              className="w-full resize-none rounded-md border border-border bg-bg py-2.5 pl-3 pr-12 text-[13px] text-fg outline-none placeholder:text-subtle focus:border-accent/70 disabled:opacity-50"
              rows={2}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || blocked !== null}
              aria-label="Send message"
              className="absolute bottom-2.5 right-2 grid h-8 w-8 place-items-center rounded-md bg-accent text-accent-ink transition-colors hover:bg-accent/90 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
