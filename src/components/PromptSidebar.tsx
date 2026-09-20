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
    <div className="flex h-full w-full flex-col border-r border-white/10 bg-[#0d0f16]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-[#8b93ff] to-[#ff2fb3]">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">AI Assistant</span>
          <span
            className="font-mono text-[10px] uppercase tracking-widest text-white/30"
            title="Scoped to this playground's code"
          >
            {quotaLine}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI Assistant"
          className="grid h-7 w-7 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
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
                  ? "bg-gradient-to-br from-[#8b93ff] to-[#6d5ef0] text-white"
                  : "border border-white/10 bg-white/5 text-[#8b93ff]"
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
                  ? "max-w-[85%] rounded-2xl rounded-tr-md bg-gradient-to-br from-[#8b93ff] to-[#6d5ef0] text-white"
                  : "max-w-[88%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] text-white/85"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[#8b93ff]">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-[#8b93ff]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-white/[0.02] p-3">
        {!signedIn ? (
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#8b93ff] to-[#ff2fb3] px-4 py-2.5 text-sm font-bold text-white transition hover:scale-[1.01]"
          >
            <LogIn className="w-4 h-4" />
            Sign in to use AI Assist
          </Link>
        ) : assistDisabled ? (
          <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-center text-[13px] text-white/40">
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
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 py-2.5 pl-4 pr-12 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#8b93ff]/60 disabled:opacity-50"
              rows={2}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || blocked !== null}
              aria-label="Send message"
              className="absolute bottom-2.5 right-2 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#8b93ff] to-[#ff2fb3] text-white shadow-[0_4px_16px_-4px_rgba(255,47,179,0.7)] transition hover:scale-105 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
