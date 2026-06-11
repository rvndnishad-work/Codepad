"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { saveTutorialAction } from "../../actions";

type Section = { title: string; body: string };
type Initial = {
  id: string;
  title: string;
  summary: string;
  published: boolean;
  sections: Section[];
} | null;

export default function TutorialEditor({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [sections, setSections] = useState<Section[]>(initial?.sections ?? [{ title: "", body: "" }]);
  const [busy, setBusy] = useState(false);

  function setSection(i: number, patch: Partial<Section>) {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function save(published?: boolean) {
    if (!title.trim()) {
      toast.error("Give your tutorial a title.");
      return;
    }
    setBusy(true);
    try {
      await saveTutorialAction({
        id: initial?.id,
        title,
        summary: summary || undefined,
        published,
        sections: sections.filter((s) => s.body.trim()).map((s) => ({ title: s.title || undefined, body: s.body })),
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
      <h1 className="text-xl font-bold text-fg">{initial ? "Edit tutorial" : "New tutorial"}</h1>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tutorial title" className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-lg font-semibold focus:outline-none focus:border-accent/40" />
      <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short summary (optional)" className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40" />

      <div className="space-y-3">
        {sections.map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Section {i + 1}</span>
              {sections.length > 1 && (
                <button onClick={() => setSections((p) => p.filter((_, idx) => idx !== i))} className="ml-auto w-6 h-6 rounded text-muted hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
              )}
            </div>
            <input value={s.title} onChange={(e) => setSection(i, { title: e.target.value })} placeholder="Section title (optional)" className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40" />
            <textarea value={s.body} onChange={(e) => setSection(i, { body: e.target.value })} placeholder="Markdown content…" rows={6} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-sm font-mono focus:outline-none focus:border-accent/40" />
          </div>
        ))}
        <button onClick={() => setSections((p) => [...p, { title: "", body: "" }])} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-border text-xs font-semibold text-muted hover:text-fg"><Plus className="w-3.5 h-3.5" /> Add section</button>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => save(false)} disabled={busy} className="px-4 py-2 rounded-md border border-border text-sm font-bold text-fg hover:bg-panel disabled:opacity-50">Save draft</button>
        <button onClick={() => save(true)} disabled={busy} className="px-4 py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-sm font-bold disabled:opacity-50">{busy ? "Saving…" : "Save & publish"}</button>
      </div>
    </div>
  );
}
