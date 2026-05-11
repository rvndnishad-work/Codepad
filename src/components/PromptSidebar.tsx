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
    <div className="w-80 md:w-96 h-full bg-surface border-l border-border flex flex-col z-10 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-panel/50">
        <div className="flex items-center gap-2 text-fg font-medium text-sm">
          <Sparkles className="w-4 h-4 text-accent" />
          AI Assistant
        </div>
        <button
          onClick={onClose}
          className="p-1 text-muted hover:text-fg hover:bg-elevated rounded transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${
              m.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                m.role === "user"
                  ? "bg-accent/20 text-accent"
                  : "bg-accent/10 text-accent"
              }`}
            >
              {m.role === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div
              className={`text-sm px-3 py-2 rounded-lg max-w-[85%] whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-accent text-bg rounded-tr-none"
                  : "bg-panel text-fg rounded-tl-none border border-border"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-accent/10 text-accent">
              <Bot className="w-4 h-4" />
            </div>
            <div className="text-sm px-4 py-2 rounded-lg bg-panel text-fg rounded-tl-none border border-border flex items-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-panel/30">
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
            className="w-full bg-panel border border-border rounded-lg pl-3 pr-10 py-2.5 text-sm text-fg outline-none focus:border-accent/50 resize-none shadow-inner"
            rows={2}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 bottom-2.5 p-1.5 text-bg bg-accent hover:bg-accent-soft rounded-md disabled:opacity-50 transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
