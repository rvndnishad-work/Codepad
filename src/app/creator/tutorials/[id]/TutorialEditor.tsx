"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { saveTutorialAction, setSpaceContentAction } from "../../actions";
import RichEditor from "@/components/rich-editor/RichEditor";
import ImageDropField from "@/app/creator/[handle]/layout/ImageDropField";
import PublishPanel, { type AccessState } from "../../editor/PublishPanel";
import type { EditorContext } from "../../editor/data";

type Section = { uid: string; title: string; body: string; bodyJson: unknown | null };
type Initial = {
  id: string;
  title: string;
  summary: string;
  coverImage: string;
  published: boolean;
  slug: string;
  sections: { title: string; body: string; bodyJson: unknown | null }[];
} | null;

let uidCounter = 0;
const uid = () => `s${++uidCounter}-${Date.now().toString(36)}`;

export default function TutorialEditor({ initial, ctx }: { initial: Initial; ctx: EditorContext }) {
  const router = useRouter();
  const [id, setId] = useState(initial?.id ?? null);
  const [slug, setSlug] = useState(initial?.slug ?? null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [sections, setSections] = useState<Section[]>(
    initial?.sections.map((s) => ({ ...s, uid: uid() })) ?? [{ uid: uid(), title: "", body: "", bodyJson: null }],
  );
  const [access, setAccess] = useState<AccessState>({
    rank: ctx.policy?.accessTierRank != null ? String(ctx.policy.accessTierRank) : "",
    price: ctx.policy?.purchasePriceCents != null ? (ctx.policy.purchasePriceCents / 100).toFixed(2) : "",
  });
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const backHref = `/creator/${ctx.space.handle}/content`;
  const publicHref = slug ? `/c/${ctx.space.handle}/tutorials/${slug}` : null;

  function setSection(i: number, patch: Partial<Section>) {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function persist(publish?: boolean) {
    if (!title.trim()) {
      toast.error("Give your tutorial a title.");
      return;
    }
    setBusy(true);
    try {
      const res = await saveTutorialAction({
        id: id ?? undefined,
        spaceId: ctx.space.id,
        title,
        summary: summary || undefined,
        coverImage: coverImage || null,
        published: publish,
        sections: sections
          .filter((s) => (s.body ?? "").trim() || s.bodyJson)
          .map((s) => ({ title: s.title || undefined, body: s.body || undefined, bodyJson: s.bodyJson ?? undefined })),
      });
      const contentId = res.id;
      if (!id) {
        setId(contentId);
        window.history.replaceState(null, "", `/creator/tutorials/${contentId}`);
      }
      if (res.slug) setSlug(res.slug);
      // Attach to the space + persist the access policy in the same action.
      await setSpaceContentAction(ctx.space.id, {
        contentType: "TUTORIAL",
        contentId,
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

  // Autosave drafts (never published content) 3s after the last change.
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
  }, [title, summary, coverImage, sections]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-5 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-500">
            <BookOpen className="w-3.5 h-3.5" /> Tutorial
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tutorial title"
            className="w-full px-0 py-1 bg-transparent border-0 border-b border-border text-fg text-2xl md:text-3xl font-black tracking-tight placeholder:text-muted/30 focus:outline-none focus:border-accent/40"
          />
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One-line summary shown on cards and share previews (optional)"
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
          />
          <ImageDropField label="Cover image" hint="Shown on your space page and share cards" value={coverImage} onChange={setCoverImage} />

          <div className="space-y-4">
            {sections.map((s, i) => (
              <div key={s.uid} className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-accent/70 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <input
                    value={s.title}
                    onChange={(e) => setSection(i, { title: e.target.value })}
                    placeholder="Section title (optional)"
                    className="flex-1 px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-sm font-semibold focus:outline-none focus:border-accent/40"
                  />
                  {sections.length > 1 && (
                    <button
                      onClick={() => setSections((p) => p.filter((_, idx) => idx !== i))}
                      className="w-7 h-7 rounded-md text-muted hover:text-rose-500 hover:bg-rose-500/10 grid place-items-center transition-colors"
                      title="Remove section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <RichEditor
                  initialJson={s.bodyJson}
                  initialMarkdown={s.body || null}
                  placeholder="Write this section — add images, code blocks, and embed your playgrounds…"
                  embeds={ctx.embeds}
                  onChange={(json) => setSection(i, { bodyJson: json })}
                />
              </div>
            ))}
            <button
              onClick={() => setSections((p) => [...p, { uid: uid(), title: "", body: "", bodyJson: null }])}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-border text-xs font-bold text-muted hover:text-fg hover:border-accent/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add section
            </button>
          </div>
        </div>

        <aside className="lg:col-span-4 lg:sticky lg:top-6">
          <PublishPanel
            backHref={backHref}
            published={published}
            busy={busy}
            savedAt={savedAt}
            publicHref={publicHref}
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
