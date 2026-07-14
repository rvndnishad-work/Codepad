"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { saveInterviewExperienceAction, setSpaceContentAction } from "../../actions";
import RichEditor from "@/components/rich-editor/RichEditor";
import ImageDropField from "@/app/creator/[handle]/layout/ImageDropField";
import PublishPanel, { type AccessState } from "../../editor/PublishPanel";
import type { EditorContext } from "../../editor/data";

type Outcome = "" | "offer" | "rejected" | "pending" | "withdrew";
type Difficulty = "" | "easy" | "medium" | "hard";

type Initial = {
  id: string;
  title: string;
  company: string;
  role: string;
  outcome: Outcome;
  difficulty: Difficulty;
  summary: string;
  body: string;
  bodyJson: unknown | null;
  coverImage: string;
  published: boolean;
  slug: string;
} | null;

export default function ExperienceEditor({ initial, ctx }: { initial: Initial; ctx: EditorContext }) {
  const router = useRouter();
  const [id, setId] = useState(initial?.id ?? null);
  const [slug, setSlug] = useState(initial?.slug ?? null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [outcome, setOutcome] = useState<Outcome>(initial?.outcome ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [bodyJson, setBodyJson] = useState<unknown | null>(initial?.bodyJson ?? null);
  const [published, setPublished] = useState(initial?.published ?? false);
  const [access, setAccess] = useState<AccessState>({
    rank: ctx.policy?.accessTierRank != null ? String(ctx.policy.accessTierRank) : "",
    price: ctx.policy?.purchasePriceCents != null ? (ctx.policy.purchasePriceCents / 100).toFixed(2) : "",
  });
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function persist(publish?: boolean) {
    if (!title.trim()) {
      toast.error("Give your experience a title.");
      return;
    }
    setBusy(true);
    try {
      const res = await saveInterviewExperienceAction({
        id: id ?? undefined,
        spaceId: ctx.space.id,
        title,
        company: company || undefined,
        role: role || undefined,
        outcome: outcome || undefined,
        difficulty: difficulty || undefined,
        summary: summary || undefined,
        body: initial?.body || undefined,
        bodyJson: bodyJson ?? undefined,
        coverImage: coverImage || null,
        published: publish,
      });
      if (!id) {
        setId(res.id);
        window.history.replaceState(null, "", `/creator/experience/${res.id}`);
      }
      if (res.slug) setSlug(res.slug);
      await setSpaceContentAction(ctx.space.id, {
        contentType: "INTERVIEW_EXPERIENCE",
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
  }, [title, company, role, outcome, difficulty, summary, coverImage, bodyJson]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-5 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-500">
            <Briefcase className="w-3.5 h-3.5" /> Interview Experience
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "My Stripe Frontend Engineer loop"'
            className="w-full px-0 py-1 bg-transparent border-0 border-b border-border text-fg text-2xl md:text-3xl font-black tracking-tight placeholder:text-muted/30 focus:outline-none focus:border-accent/40"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
              className="px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
            />
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role"
              className="px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
            />
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as Outcome)}
              className="px-2.5 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none"
              title="Outcome"
            >
              <option value="">outcome…</option>
              <option value="offer">offer</option>
              <option value="rejected">rejected</option>
              <option value="pending">pending</option>
              <option value="withdrew">withdrew</option>
            </select>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="px-2.5 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none"
              title="Difficulty"
            >
              <option value="">difficulty…</option>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One-line summary shown on cards (optional)"
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
          />
          <ImageDropField label="Cover image" hint="Shown on your space page" value={coverImage} onChange={setCoverImage} />

          <RichEditor
            initialJson={initial?.bodyJson}
            initialMarkdown={initial?.body || null}
            placeholder="Tell the story round by round — what they asked, how it went, what you'd do differently…"
            minHeightClass="min-h-[380px]"
            embeds={ctx.embeds}
            onChange={setBodyJson}
          />
        </div>

        <aside className="lg:col-span-4 lg:sticky lg:top-6">
          <PublishPanel
            backHref={`/creator/${ctx.space.handle}/content`}
            published={published}
            busy={busy}
            savedAt={savedAt}
            publicHref={slug ? `/c/${ctx.space.handle}/experience/${slug}` : null}
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
