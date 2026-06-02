"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2, Bot, Monitor, Server, Binary, ArrowRight } from "lucide-react";

type PracticeTemplate = {
  id: string;
  title: string;
  kind: "frontend" | "backend" | "dsa";
  language: string | null;
  frameworkLabel: string | null;
  estimatedMinutes: number;
};

const KIND_META: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  frontend: { label: "Frontend", icon: <Monitor className="w-3.5 h-3.5" />, tone: "text-sky-600 dark:text-sky-400" },
  backend: { label: "Backend", icon: <Server className="w-3.5 h-3.5" />, tone: "text-emerald-600 dark:text-emerald-400" },
  dsa: { label: "DSA", icon: <Binary className="w-3.5 h-3.5" />, tone: "text-violet-600 dark:text-violet-400" },
};

/**
 * Candidate self-serve AI mock interview launcher. Lists builtin practice
 * templates (frontend / backend / DSA) and starts a credit-free AI screening.
 */
export default function AIPracticeLauncher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<PracticeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/ai-interview/practice", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn't load practice tasks."))))
      .then((d) => setTemplates(Array.isArray(d.templates) ? d.templates : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  async function start(id: string) {
    setStartingId(id);
    try {
      const res = await fetch("/api/ai-interview/practice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      router.push(`/ai-interview/${data.inviteToken}`);
    } catch (err) {
      toast.error("Couldn't start the AI mock", { description: err instanceof Error ? err.message : String(err) });
      setStartingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between bg-panel/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-fg">AI Mock Interview</h2>
              <p className="text-[11px] text-muted">Free practice screening with the AI interviewer — pick a task.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-panel text-muted hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-16 text-center text-muted text-xs inline-flex items-center justify-center w-full gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading tasks…
            </div>
          ) : templates.length === 0 ? (
            <p className="py-16 text-center text-xs text-muted">No practice tasks available.</p>
          ) : (
            templates.map((t) => {
              const meta = KIND_META[t.kind] ?? KIND_META.frontend;
              return (
                <button
                  key={t.id}
                  onClick={() => start(t.id)}
                  disabled={!!startingId}
                  className="w-full text-left p-4 rounded-xl border border-border bg-surface/50 hover:bg-surface hover:border-border-strong transition flex items-center justify-between gap-4 group disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1 ${meta.tone}`}>
                      {meta.icon}
                      {meta.label}
                      {t.language && <span className="text-muted/70 font-mono normal-case">· {t.language}</span>}
                      {t.frameworkLabel && <span className="text-muted/70 normal-case">· {t.frameworkLabel}</span>}
                    </div>
                    <h3 className="text-sm font-bold text-fg truncate">{t.title}</h3>
                    <p className="text-[11px] text-muted">{t.estimatedMinutes} min</p>
                  </div>
                  {startingId === t.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent shrink-0 transition" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
