"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2, Layers, Monitor, Server, Binary, Sparkles } from "lucide-react";
import {
  FRONTEND_FRAMEWORKS,
  BACKEND_LANGUAGES,
  DSA_LANGUAGES,
  DSA_LANGUAGE_LABELS,
  BACKEND_FRAMEWORK_LABELS,
  curateRounds,
  describeStack,
  isStackEmpty,
  type TechStack,
  type CuratableChallenge,
} from "@/lib/interview/stack";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Session type to create. Candidate prep defaults to a solo mock. */
  type?: "mock" | "live";
  creatorRole?: "candidate" | "interviewer";
};

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

/**
 * Guided tech-stack selector. Pick frontend framework(s), backend language(s)
 * (+ optional framework labels), and/or DSA language(s) — full-stack just means
 * choosing more than one side. Curates matching seeded rounds and creates a
 * ready-to-run interview session. Reused by the candidate cockpit and the
 * builder's "Quick start" entry.
 */
export default function StackWizard({ open, onClose, type = "mock", creatorRole = "candidate" }: Props) {
  const router = useRouter();
  const [frontend, setFrontend] = useState<string[]>([]);
  const [backendLangs, setBackendLangs] = useState<string[]>([]);
  const [backendFw, setBackendFw] = useState<string[]>([]);
  const [dsaLangs, setDsaLangs] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [minutes, setMinutes] = useState(45);
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  const stack: TechStack = {};
  if (frontend.length) stack.frontend = { frameworks: frontend };
  if (backendLangs.length) stack.backend = { languages: backendLangs, frameworkLabels: backendFw };
  if (dsaLangs.length) stack.dsa = { languages: dsaLangs };
  const empty = isStackEmpty(stack);

  // Backend framework labels available for the currently-selected languages.
  const availableBackendFw = [...new Set(backendLangs.flatMap((l) => BACKEND_FRAMEWORK_LABELS[l] ?? []))];

  async function handleCreate() {
    if (empty) {
      toast.error("Pick at least one technology to practice.");
      return;
    }
    setCreating(true);
    try {
      // Fetch the curatable challenge pool (DSA + any backend/frontend challenges).
      const poolRes = await fetch("/api/interview/stack-pool", { cache: "no-store" });
      if (!poolRes.ok) throw new Error("Couldn't load the challenge bank.");
      const { challenges } = (await poolRes.json()) as { challenges: (CuratableChallenge & { difficulty: string })[] };
      const pool = difficulty === "all" ? challenges : challenges.filter((c) => c.difficulty === difficulty);

      const { challengeIds, playgroundIds } = curateRounds(stack, { challenges: pool, templates: [] });
      if (challengeIds.length === 0 && playgroundIds.length === 0) {
        toast.error("No matching rounds for that stack yet.", {
          description: "Try a different language/framework or add content first.",
        });
        setCreating(false);
        return;
      }

      const types = new Set<string>();
      if (challengeIds.length) types.add("challenge");
      if (playgroundIds.length) types.add("playground");
      const sourceType = types.size === 1 ? [...types][0] : "combined";

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          title: `${describeStack(stack)} Prep`,
          type,
          creatorRole,
          sourceType,
          challengeIds,
          playgroundIds,
          promptScenarioIds: [],
          totalSec: minutes * 60,
          stackJson: JSON.stringify(stack),
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data = await res.json();
      router.push(`/interview/${data.id}`);
    } catch (err) {
      toast.error("Couldn't build the session", {
        description: err instanceof Error ? err.message : String(err),
      });
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between bg-panel/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-fg">Build a prep session by tech stack</h2>
              <p className="text-[11px] text-muted">Pick what you want to practice — we assemble the rounds.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-panel text-muted hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Frontend */}
          <Section icon={<Monitor className="w-3.5 h-3.5" />} title="Frontend frameworks" tone="sky">
            <Chips
              options={FRONTEND_FRAMEWORKS.map((f) => ({ id: f.id, label: f.label }))}
              selected={frontend}
              onToggle={(v) => setFrontend((p) => toggle(p, v))}
              tone="sky"
            />
          </Section>

          {/* Backend */}
          <Section icon={<Server className="w-3.5 h-3.5" />} title="Backend languages" tone="emerald">
            <Chips
              options={BACKEND_LANGUAGES.map((b) => ({ id: b.id, label: b.label }))}
              selected={backendLangs}
              onToggle={(v) => setBackendLangs((p) => toggle(p, v))}
              tone="emerald"
            />
            {availableBackendFw.length > 0 && (
              <div className="mt-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted/70 mb-1.5">
                  Framework focus <span className="font-normal normal-case">(guides AI questions — not executed)</span>
                </p>
                <Chips
                  options={availableBackendFw.map((f) => ({ id: f, label: f }))}
                  selected={backendFw}
                  onToggle={(v) => setBackendFw((p) => toggle(p, v))}
                  tone="emerald"
                  small
                />
              </div>
            )}
          </Section>

          {/* DSA */}
          <Section icon={<Binary className="w-3.5 h-3.5" />} title="DSA languages" tone="violet">
            <Chips
              options={DSA_LANGUAGES.map((l) => ({ id: l, label: DSA_LANGUAGE_LABELS[l] ?? l }))}
              selected={dsaLangs}
              onToggle={(v) => setDsaLangs((p) => toggle(p, v))}
              tone="violet"
            />
          </Section>

          {/* Difficulty + length */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                className="w-full px-3 py-2 rounded-lg bg-panel border border-border text-xs text-fg focus:outline-none focus:border-accent"
              >
                <option value="all">Any</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Length: {minutes} min</label>
              <input
                type="range"
                min={15}
                max={120}
                step={15}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>
          </div>
        </div>

        <footer className="px-5 py-4 border-t border-border bg-panel/30 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted min-w-0 truncate">
            {empty ? "Select at least one technology." : <span className="text-fg/80 font-medium">{describeStack(stack)}</span>}
          </p>
          <button
            onClick={handleCreate}
            disabled={empty || creating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {creating ? "Building…" : "Build session"}
          </button>
        </footer>
      </div>
    </div>
  );
}

const TONE: Record<string, { on: string; icon: string }> = {
  sky: { on: "bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400", icon: "text-sky-600 dark:text-sky-400" },
  emerald: { on: "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400", icon: "text-emerald-600 dark:text-emerald-400" },
  violet: { on: "bg-violet-500/15 border-violet-500/40 text-violet-600 dark:text-violet-400", icon: "text-violet-600 dark:text-violet-400" },
};

function Section({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className={`flex items-center gap-1.5 text-xs font-bold ${TONE[tone].icon}`}>
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Chips({
  options,
  selected,
  onToggle,
  tone,
  small,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  tone: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={`rounded-full border font-bold transition-all ${small ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-[11px]"} ${
              on ? TONE[tone].on : "bg-transparent border-border text-muted hover:border-border-strong hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
