import React, { useState, useRef, useEffect } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import { Sparkles, X, Send, User, Bot, Loader2 } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export default function PromptSidebar({ onClose }: { onClose: () => void }) {
  const { sandpack } = useSandpack();
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", text: "Hi! How can I help you with your code today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", text: userMsg },
    ]);
    setLoading(true);

    // Mock API call
    setTimeout(() => {
      const activeFile = sandpack.activeFile;
      const fileData = sandpack.files[activeFile];
      const code = typeof fileData === "string" ? fileData : fileData?.code;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: `I'm a mock AI. You asked about ${activeFile}. Your code currently has ${
            code?.length ?? 0
          } characters. Integrate a real AI backend to get real answers!`,
        },
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex h-full w-full flex-col border-r border-white/10 bg-[#0d0f16]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-[#8b93ff] to-[#ff2fb3]">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">AI Assistant</span>
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> live
          </span>
        </div>
        <button
          onClick={onClose}
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
                  ? "bg-gradient-to-br from-[#8b93ff] to-[#ff2fb3] text-white"
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
            placeholder="Ask about your code..."
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 py-2.5 pl-4 pr-12 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#8b93ff]/60"
            rows={2}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute bottom-2.5 right-2 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#8b93ff] to-[#ff2fb3] text-white shadow-[0_4px_16px_-4px_rgba(255,47,179,0.7)] transition hover:scale-105 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
