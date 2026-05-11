"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Play,
  Trophy,
  GripVertical,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export type ChallengeOption = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  category: string | null;
};

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

const difficultyBg: Record<string, string> = {
  easy: "bg-emerald-500/10 border-emerald-500/30",
  medium: "bg-amber-500/10 border-amber-500/30",
  hard: "bg-rose-500/10 border-rose-500/30",
};

export default function InterviewBuilder({ challenges }: { challenges: ChallengeOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("Interview Session");
  const [selected, setSelected] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(30);
  const [creating, setCreating] = useState(false);

  const selectedChallenges = useMemo(
    () => selected.map((id) => challenges.find((c) => c.id === id)!).filter(Boolean),
    [selected, challenges]
  );

  const totalEstimate = selectedChallenges.reduce((sum, c) => sum + c.estimatedMinutes, 0);
  const available = challenges.filter((c) => !selected.includes(c.id));

  function add(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }
  function remove(id: string) {
    setSelected((prev) => prev.filter((x) => x !== id));
  }
  function moveUp(id: string) {
    setSelected((prev) => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const out = [...prev];
      [out[idx - 1], out[idx]] = [out[idx], out[idx - 1]];
      return out;
    });
  }
  function moveDown(id: string) {
    setSelected((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const out = [...prev];
      [out[idx], out[idx + 1]] = [out[idx + 1], out[idx]];
      return out;
    });
  }

  async function handleStart() {
    if (selected.length === 0) {
      toast.error("Pick at least one challenge.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Interview Session",
          challengeIds: selected,
          totalSec: minutes * 60,
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data = await res.json();
      router.push(`/interview/${data.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to create session", { description: msg });
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/challenges"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center">
          <Trophy className="w-5 h-5 text-accent" />
        </div>
        <div>
          <div className="text-xs font-black tracking-[0.2em] text-muted uppercase mb-0.5">
            New Session
          </div>
          <h1 className="text-3xl font-black tracking-tight text-fg">Interview Session</h1>
        </div>
      </div>

      <p className="text-muted text-sm mb-8 max-w-2xl leading-relaxed">
        Compose a multi-challenge interview with a hard time limit. Once started, you can
        share a read-only link with an interviewer.
      </p>

      {/* Title + time limit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
            Session title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Frontend phone screen"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border focus:border-accent/40 focus:bg-elevated text-sm text-fg outline-none transition"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
            Time limit (minutes)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={240}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(5, Math.min(240, Number(e.target.value) || 30)))}
              className="w-32 px-3.5 py-2.5 rounded-xl bg-surface border border-border focus:border-accent/40 focus:bg-elevated text-sm text-fg outline-none transition tabular-nums"
            />
            <span className="text-xs text-muted">
              Recommended:{" "}
              <span className="text-fg font-bold tabular-nums">
                {Math.max(totalEstimate, 5)}m
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available challenges */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-3">
            Available challenges ({available.length})
          </h2>
          {available.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
              All challenges added.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {available.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => add(c.id)}
                    className="group w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-surface/50 hover:bg-elevated hover:border-border-strong transition text-left"
                  >
                    <div
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${difficultyBg[c.difficulty]} ${difficultyColor[c.difficulty]} shrink-0`}
                    >
                      {c.difficulty[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-fg/90 group-hover:text-fg truncate">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-muted/60 truncate">
                        {c.category ?? "Challenge"} · {c.estimatedMinutes}m
                      </div>
                    </div>
                    <span className="text-[11px] text-muted group-hover:text-accent transition shrink-0">
                      + Add
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected (ordered) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted">
              Your queue ({selected.length})
            </h2>
            {selectedChallenges.length > 0 && (
              <span className="text-[10px] font-bold text-muted/60 tabular-nums">
                ~{totalEstimate}m total
              </span>
            )}
          </div>
          {selectedChallenges.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface/40 p-8 text-center">
              <div className="text-sm text-muted mb-1">No challenges yet</div>
              <div className="text-[11px] text-muted/60">Add from the left to build your session.</div>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedChallenges.map((c, idx) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-accent/30 bg-accent/5"
                >
                  <span className="text-[11px] font-mono text-muted tabular-nums w-5 text-right">
                    {idx + 1}.
                  </span>
                  <div
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${difficultyBg[c.difficulty]} ${difficultyColor[c.difficulty]} shrink-0`}
                  >
                    {c.difficulty[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-fg truncate">{c.title}</div>
                    <div className="text-[10px] text-muted/60">{c.estimatedMinutes}m</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveUp(c.id)}
                      disabled={idx === 0}
                      className="p-1 text-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDown(c.id)}
                      disabled={idx === selectedChallenges.length - 1}
                      className="p-1 text-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="p-1 text-muted hover:text-rose-500 transition"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-10 flex items-center justify-between pt-6 border-t border-border">
        <div className="text-xs text-muted">
          <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
          Hard limit: <span className="text-fg font-bold tabular-nums">{minutes}m</span>
          {totalEstimate > minutes && (
            <span className="text-rose-500 ml-2">⚠ tight for {totalEstimate}m of work</span>
          )}
        </div>
        <button
          onClick={handleStart}
          disabled={selected.length === 0 || creating}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(var(--accent-rgb),0.25)]"
        >
          <Play className="w-4 h-4 fill-current" />
          {creating ? "Creating…" : "Start session"}
        </button>
      </div>
    </div>
  );
}
