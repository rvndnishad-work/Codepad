"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { saveInterviewQAAction } from "../../actions";

type QA = { question: string; answer: string; difficulty: "easy" | "medium" | "hard" | "" };
type Initial = {
  id: string;
  title: string;
  summary: string;
  category: string;
  published: boolean;
  questions: QA[];
} | null;

export default function InterviewEditor({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [questions, setQuestions] = useState<QA[]>(initial?.questions ?? [{ question: "", answer: "", difficulty: "" }]);
  const [busy, setBusy] = useState(false);

  function setQ(i: number, patch: Partial<QA>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  async function save(published?: boolean) {
    if (!title.trim()) {
      toast.error("Give your page a title.");
      return;
    }
    setBusy(true);
    try {
      await saveInterviewQAAction({
        id: initial?.id,
        title,
        summary: summary || undefined,
        category: category || undefined,
        published,
        questions: questions
          .filter((q) => q.question.trim() && q.answer.trim())
          .map((q) => ({ question: q.question, answer: q.answer, difficulty: q.difficulty || undefined })),
      });
      toast.success("Saved.");
      router.push("/creator");
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : String(err) });
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <Link href="/creator" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg">
        <ArrowLeft className="w-3.5 h-3.5" /> Creator Studio
      </Link>
      <h1 className="text-xl font-bold text-fg">{initial ? "Edit interview Q&A" : "New interview Q&A"}</h1>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title (e.g. Top React Interview Questions)" className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-lg font-semibold focus:outline-none focus:border-accent/40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary (optional)" className="px-3 py-2 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (e.g. React)" className="px-3 py-2 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40" />
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Q{i + 1}</span>
              <select value={q.difficulty} onChange={(e) => setQ(i, { difficulty: e.target.value as QA["difficulty"] })} className="ml-auto px-2 py-0.5 rounded border border-border bg-bg text-fg text-[11px] focus:outline-none">
                <option value="">—</option>
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
              {questions.length > 1 && (
                <button onClick={() => setQuestions((p) => p.filter((_, idx) => idx !== i))} className="w-6 h-6 rounded text-muted hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
              )}
            </div>
            <textarea value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} placeholder="Question" rows={2} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40" />
            <textarea value={q.answer} onChange={(e) => setQ(i, { answer: e.target.value })} placeholder="Answer (markdown)" rows={4} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-sm font-mono focus:outline-none focus:border-accent/40" />
          </div>
        ))}
        <button onClick={() => setQuestions((p) => [...p, { question: "", answer: "", difficulty: "" }])} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-border text-xs font-semibold text-muted hover:text-fg"><Plus className="w-3.5 h-3.5" /> Add question</button>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => save(false)} disabled={busy} className="px-4 py-2 rounded-md border border-border text-sm font-bold text-fg hover:bg-panel disabled:opacity-50">Save draft</button>
        <button onClick={() => save(true)} disabled={busy} className="px-4 py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-sm font-bold disabled:opacity-50">{busy ? "Saving…" : "Save & publish"}</button>
      </div>
    </div>
  );
}
