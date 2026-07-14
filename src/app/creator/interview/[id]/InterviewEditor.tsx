"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { saveInterviewQAAction, setSpaceContentAction } from "../../actions";
import RichEditor from "@/components/rich-editor/RichEditor";
import ImageDropField from "@/app/creator/[handle]/layout/ImageDropField";
import PublishPanel, { type AccessState } from "../../editor/PublishPanel";
import type { EditorContext } from "../../editor/data";

type QuestionRow = {
  uid: string;
  question: string;
  answer: string;
  answerJson: unknown | null;
  difficulty: "" | "easy" | "medium" | "hard";
};

type Initial = {
  id: string;
  title: string;
  summary: string;
  category: string;
  coverImage: string;
  published: boolean;
  slug: string;
  questions: { question: string; answer: string; answerJson: unknown | null; difficulty: string | null }[];
} | null;

let uidCounter = 0;
const uid = () => `q${++uidCounter}-${Date.now().toString(36)}`;

export default function InterviewEditor({ initial, ctx }: { initial: Initial; ctx: EditorContext }) {
  const router = useRouter();
  const [id, setId] = useState(initial?.id ?? null);
  const [slug, setSlug] = useState(initial?.slug ?? null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [questions, setQuestions] = useState<QuestionRow[]>(
    initial?.questions.map((q) => ({
      uid: uid(),
      question: q.question,
      answer: q.answer,
      answerJson: q.answerJson,
      difficulty: (q.difficulty as QuestionRow["difficulty"]) ?? "",
    })) ?? [{ uid: uid(), question: "", answer: "", answerJson: null, difficulty: "" }],
  );
  const [access, setAccess] = useState<AccessState>({
    rank: ctx.policy?.accessTierRank != null ? String(ctx.policy.accessTierRank) : "",
    price: ctx.policy?.purchasePriceCents != null ? (ctx.policy.purchasePriceCents / 100).toFixed(2) : "",
  });
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function setQ(i: number, patch: Partial<QuestionRow>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  async function persist(publish?: boolean) {
    if (!title.trim()) {
      toast.error("Give your Q&A page a title.");
      return;
    }
    setBusy(true);
    try {
      const res = await saveInterviewQAAction({
        id: id ?? undefined,
        spaceId: ctx.space.id,
        title,
        summary: summary || undefined,
        category: category || undefined,
        coverImage: coverImage || null,
        published: publish,
        questions: questions
          .filter((q) => q.question.trim())
          .map((q) => ({
            question: q.question,
            answer: q.answer || undefined,
            answerJson: q.answerJson ?? undefined,
            difficulty: q.difficulty || undefined,
          })),
      });
      if (!id) {
        setId(res.id);
        window.history.replaceState(null, "", `/creator/interview/${res.id}`);
      }
      if (res.slug) setSlug(res.slug);
      await setSpaceContentAction(ctx.space.id, {
        contentType: "INTERVIEW_QA",
        contentId: res.id,
        accessTierRank: access.rank === "" ? null : parseInt(access.rank, 10),
        purchasePriceCents: access.price.trim() === "" ? null : Math.round(parseFloat(access.price) * 100),
      });
      if (publish !== undefined) setPublished(publish);
      setSavedAt(new Date());
      toast.success(publish === true ? "Published — followers notified." : "Saved.");
      router.refresh();
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });
  const dirtyRef = useRef(0);
  useEffect(() => {
    if (!id || published || busy) return;
    dirtyRef.current += 1;
    const token = dirtyRef.current;
    const t = setTimeout(() => {
      if (token === dirtyRef.current) void persistRef.current(undefined);
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, summary, category, coverImage, questions]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-5 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-500">
            <HelpCircle className="w-3.5 h-3.5" /> Interview Q&amp;A
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Q&A page title"
            className="w-full px-0 py-1 bg-transparent border-0 border-b border-border text-fg text-2xl md:text-3xl font-black tracking-tight placeholder:text-muted/30 focus:outline-none focus:border-accent/40"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One-line summary (optional)"
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category e.g. React"
              className="px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
            />
          </div>
          <ImageDropField label="Cover image" hint="Shown on your space page" value={coverImage} onChange={setCoverImage} />

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.uid} className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-accent/70 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <input
                    value={q.question}
                    onChange={(e) => setQ(i, { question: e.target.value })}
                    placeholder="The question"
                    className="flex-1 px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-sm font-semibold focus:outline-none focus:border-accent/40"
                  />
                  <select
                    value={q.difficulty}
                    onChange={(e) => setQ(i, { difficulty: e.target.value as QuestionRow["difficulty"] })}
                    className="px-2 py-1.5 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none"
                    title="Difficulty"
                  >
                    <option value="">difficulty</option>
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </select>
                  {questions.length > 1 && (
                    <button
                      onClick={() => setQuestions((p) => p.filter((_, idx) => idx !== i))}
                      className="w-7 h-7 rounded-md text-muted hover:text-rose-500 hover:bg-rose-500/10 grid place-items-center transition-colors"
                      title="Remove question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <RichEditor
                  initialJson={q.answerJson}
                  initialMarkdown={q.answer || null}
                  placeholder="Write the answer — structure it the way you'd explain it in an interview…"
                  minHeightClass="min-h-[140px]"
                  embeds={ctx.embeds}
                  onChange={(json) => setQ(i, { answerJson: json })}
                />
              </div>
            ))}
            <button
              onClick={() =>
                setQuestions((p) => [...p, { uid: uid(), question: "", answer: "", answerJson: null, difficulty: "" }])
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-border text-xs font-bold text-muted hover:text-fg hover:border-accent/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add question
            </button>
          </div>
        </div>

        <aside className="lg:col-span-4 lg:sticky lg:top-6">
          <PublishPanel
            backHref={`/creator/${ctx.space.handle}/content`}
            published={published}
            busy={busy}
            savedAt={savedAt}
            publicHref={slug ? `/c/${ctx.space.handle}/interview/${slug}` : null}
            tiers={ctx.tiers}
            chargesEnabled={ctx.chargesEnabled}
            access={access}
            onAccessChange={setAccess}
            onSave={(p) => void persist(p)}
          />
        </aside>
      </div>
    </div>
  );
}
