"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveQuestion } from "./actions";
import { DIFFICULTIES, ROUNDS, EXPERIENCE_LEVELS, TECHNOLOGIES } from "@/lib/interview-questions/shared";

export type QuestionInitial = {
  id?: string;
  title: string;
  description: string;
  answer: string;
  companyId: string;
  technology: string;
  role: string;
  difficulty: string;
  round: string;
  experienceLevel: string;
  tags: string;
  yearsAsked: string;
  status: string;
  seoTitle: string;
  seoDescription: string;
};

const EMPTY: QuestionInitial = {
  title: "", description: "", answer: "", companyId: "", technology: "", role: "",
  difficulty: "medium", round: "", experienceLevel: "", tags: "", yearsAsked: "",
  status: "draft", seoTitle: "", seoDescription: "",
};

const field = "w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:border-accent/50";
const label = "text-[10px] font-black uppercase tracking-widest text-muted mb-1.5 block";

export default function QuestionForm({
  companies,
  initial,
}: {
  companies: { id: string; name: string }[];
  initial?: QuestionInitial;
}) {
  const router = useRouter();
  const [f, setF] = useState<QuestionInitial>(initial ?? EMPTY);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof QuestionInitial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return setError("Title is required.");
    setError(null);
    start(async () => {
      try {
        await saveQuestion({
          id: f.id,
          title: f.title,
          description: f.description,
          answer: f.answer,
          companyId: f.companyId || undefined,
          technology: f.technology || undefined,
          role: f.role || undefined,
          difficulty: f.difficulty,
          round: f.round || undefined,
          experienceLevel: f.experienceLevel || undefined,
          tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
          yearsAsked: f.yearsAsked.split(",").map((y) => parseInt(y.trim(), 10)).filter((n) => !isNaN(n)),
          status: f.status,
          seoTitle: f.seoTitle || undefined,
          seoDescription: f.seoDescription || undefined,
        });
        router.push("/admin/interview-questions");
        router.refresh();
      } catch (err) {
        setError((err as Error).message || "Failed to save.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5 max-w-3xl">
      {error && <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 text-sm">{error}</div>}

      <div>
        <label className={label}>Question title *</label>
        <input value={f.title} onChange={set("title")} className={field} placeholder="Explain the virtual DOM…" />
      </div>

      <div>
        <label className={label}>Question description (markdown)</label>
        <textarea value={f.description} onChange={set("description")} rows={3} className={field} />
      </div>

      <div>
        <label className={label}>Answer (markdown)</label>
        <textarea value={f.answer} onChange={set("answer")} rows={6} className={field} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={label}>Company</label>
          <select value={f.companyId} onChange={set("companyId")} className={field}>
            <option value="">— None —</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Technology</label>
          <select value={f.technology} onChange={set("technology")} className={field}>
            <option value="">— None —</option>
            {TECHNOLOGIES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Difficulty</label>
          <select value={f.difficulty} onChange={set("difficulty")} className={field}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={label}>Round</label>
          <select value={f.round} onChange={set("round")} className={field}>
            <option value="">— None —</option>
            {ROUNDS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Experience level</label>
          <select value={f.experienceLevel} onChange={set("experienceLevel")} className={field}>
            <option value="">— Any —</option>
            {EXPERIENCE_LEVELS.map((e) => <option key={e.slug} value={e.slug}>{e.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Role</label>
          <input value={f.role} onChange={set("role")} className={field} placeholder="Frontend Engineer" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Tags (comma separated)</label>
          <input value={f.tags} onChange={set("tags")} className={field} placeholder="react, hooks, performance" />
        </div>
        <div>
          <label className={label}>Years asked (comma separated)</label>
          <input value={f.yearsAsked} onChange={set("yearsAsked")} className={field} placeholder="2023, 2024" />
        </div>
      </div>

      <details className="rounded-lg border border-border p-4">
        <summary className="text-xs font-bold cursor-pointer text-muted">SEO overrides (optional)</summary>
        <div className="space-y-4 mt-4">
          <div>
            <label className={label}>SEO title</label>
            <input value={f.seoTitle} onChange={set("seoTitle")} className={field} />
          </div>
          <div>
            <label className={label}>SEO description</label>
            <input value={f.seoDescription} onChange={set("seoDescription")} className={field} />
          </div>
        </div>
      </details>

      <div className="flex items-center gap-3 pt-2">
        <label className={label + " mb-0"}>Status</label>
        <select value={f.status} onChange={set("status")} className={field + " max-w-[160px]"}>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
        <div className="flex-1" />
        <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-lg border border-border text-sm font-bold text-muted hover:text-fg">Cancel</button>
        <button disabled={pending} className="px-5 py-2 rounded-lg bg-accent text-bg text-sm font-black uppercase tracking-wider hover:bg-accent-soft disabled:opacity-60">
          {pending ? "Saving…" : f.id ? "Save changes" : "Create question"}
        </button>
      </div>
    </form>
  );
}
