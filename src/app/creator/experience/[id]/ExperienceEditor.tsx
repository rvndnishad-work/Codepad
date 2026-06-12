"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Briefcase } from "lucide-react";
import { saveInterviewExperienceAction } from "../../actions";

type Outcome = "offer" | "rejected" | "pending" | "withdrew" | "";
type Difficulty = "easy" | "medium" | "hard" | "";

type Initial = {
  id: string;
  title: string;
  company: string;
  role: string;
  outcome: Outcome;
  difficulty: Difficulty;
  summary: string;
  body: string;
  published: boolean;
} | null;

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm transition-colors placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export default function ExperienceEditor({ initial, spaceId }: { initial: Initial; spaceId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [outcome, setOutcome] = useState<Outcome>(initial?.outcome ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [busy, setBusy] = useState(false);

  async function save(published?: boolean) {
    if (!title.trim()) {
      toast.error("Give your experience a title.");
      return;
    }
    if (!body.trim()) {
      toast.error("Write the experience body.");
      return;
    }
    setBusy(true);
    try {
      await saveInterviewExperienceAction({
        id: initial?.id,
        spaceId,
        title,
        company: company || undefined,
        role: role || undefined,
        outcome: outcome || undefined,
        difficulty: difficulty || undefined,
        summary: summary || undefined,
        body,
        published,
      });
      toast.success("Saved.");
      router.push("/creator");
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : String(err) });
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <Link href="/creator" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg">
        <ArrowLeft className="w-3.5 h-3.5" /> Creator Studio
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent">
          <Briefcase className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-fg">
          {initial ? "Edit interview experience" : "New interview experience"}
        </h1>
      </div>

      <section className="rounded-2xl border border-border bg-surface shadow-tile p-5 space-y-4">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. My onsite loop at Stripe"
            className={`${inputCls} text-base font-semibold`}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Company">
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Stripe" className={inputCls} />
          </Field>
          <Field label="Role">
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Senior Frontend Engineer" className={inputCls} />
          </Field>
          <Field label="Outcome">
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)} className={inputCls}>
              <option value="">—</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
              <option value="withdrew">Withdrew</option>
            </select>
          </Field>
          <Field label="Difficulty">
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className={inputCls}>
              <option value="">—</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
        </div>
        <Field label="Summary (optional)">
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One line shown in previews and the paywall"
            className={inputCls}
          />
        </Field>
        <Field label="Experience (markdown)">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"Walk through the rounds, questions, timeline, what went well, and tips…"}
            rows={16}
            className={`${inputCls} font-mono leading-relaxed resize-y`}
          />
        </Field>
      </section>

      <div className="flex items-center gap-2">
        <button
          onClick={() => save(false)}
          disabled={busy}
          className="px-4 py-2 rounded-lg border border-border text-sm font-bold text-fg hover:bg-panel disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          onClick={() => save(true)}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-sm font-bold shadow-soft disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save & publish"}
        </button>
      </div>
    </div>
  );
}
