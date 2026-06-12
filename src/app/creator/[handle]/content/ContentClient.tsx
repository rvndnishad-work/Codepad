"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  LayoutGrid,
  BookOpen,
  HelpCircle,
  Briefcase,
  Sparkles,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { setSpaceContentAction, removeSpaceContentAction } from "../../actions";

export type TierRow = {
  id: string;
  name: string;
  rank: number;
  priceCents: number;
  currency: string;
  published: boolean;
};

export type ContentItem = {
  contentType: "CHALLENGE" | "SNIPPET" | "BLOG_POST" | "TUTORIAL" | "INTERVIEW_QA" | "INTERVIEW_EXPERIENCE";
  contentId: string;
  title: string;
  policy: { spaceContentId: string; accessTierRank: number | null; purchasePriceCents: number | null } | null;
};

const TYPE_LABEL: Record<string, string> = {
  CHALLENGE: "Challenge",
  SNIPPET: "Playground",
  BLOG_POST: "Blog",
  TUTORIAL: "Tutorial",
  INTERVIEW_QA: "Interview Q&A",
  INTERVIEW_EXPERIENCE: "Experience",
};

const TYPE_STYLE: Record<string, string> = {
  CHALLENGE: "text-amber-500 bg-amber-500/10 border-amber-500/25",
  SNIPPET: "text-sky-500 bg-sky-500/10 border-sky-500/25",
  BLOG_POST: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25",
  TUTORIAL: "text-violet-500 bg-violet-500/10 border-violet-500/25",
  INTERVIEW_QA: "text-rose-500 bg-rose-500/10 border-rose-500/25",
  INTERVIEW_EXPERIENCE: "text-blue-500 bg-blue-500/10 border-blue-500/25",
};

export default function ContentClient({
  spaceId,
  content,
  tiers,
  chargesEnabled,
}: {
  spaceId: string;
  content: ContentItem[];
  tiers: TierRow[];
  chargesEnabled: boolean;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-fg">Content & Access</h1>
            <p className="text-xs text-muted mt-0.5">Control who can access each piece of content in this space.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/creator/tutorials/new?spaceId=${spaceId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/30 bg-accent-glow text-xs font-bold text-fg hover:border-accent/50 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-accent" /> New Tutorial
          </Link>
          <Link
            href={`/creator/interview/new?spaceId=${spaceId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/30 bg-accent-glow text-xs font-bold text-fg hover:border-accent/50 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-accent" /> New Q&amp;A
          </Link>
          <Link
            href={`/creator/experience/new?spaceId=${spaceId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/30 bg-accent-glow text-xs font-bold text-fg hover:border-accent/50 transition-colors"
          >
            <Briefcase className="w-3.5 h-3.5 text-accent" /> New Experience
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-tile">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-bold text-fg">Gated Content Rows</h2>
        </div>

        {content.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 px-6 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-panel border border-border grid place-items-center mx-auto text-muted mb-3.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-fg">No content yet</p>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Create a new Tutorial or Q&amp;A above, or author coding challenges elsewhere to list them in your space.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {content.map((item) => (
              <ContentRow
                key={`${item.contentType}:${item.contentId}`}
                spaceId={spaceId}
                item={item}
                tiers={tiers}
                chargesEnabled={chargesEnabled}
                onChanged={() => router.refresh()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContentRow({
  spaceId,
  item,
  tiers,
  chargesEnabled,
  onChanged,
}: {
  spaceId: string;
  item: ContentItem;
  tiers: TierRow[];
  chargesEnabled: boolean;
  onChanged: () => void;
}) {
  const [rank, setRank] = useState<string>(item.policy?.accessTierRank != null ? String(item.policy.accessTierRank) : "");
  const [price, setPrice] = useState<string>(
    item.policy?.purchasePriceCents != null ? (item.policy.purchasePriceCents / 100).toFixed(2) : ""
  );
  const [busy, setBusy] = useState(false);

  const editorHref =
    item.contentType === "TUTORIAL"
      ? `/creator/tutorials/${item.contentId}`
      : item.contentType === "INTERVIEW_QA"
        ? `/creator/interview/${item.contentId}`
        : item.contentType === "INTERVIEW_EXPERIENCE"
          ? `/creator/experience/${item.contentId}`
          : null;

  async function save() {
    setBusy(true);
    try {
      await setSpaceContentAction(spaceId, {
        contentType: item.contentType,
        contentId: item.contentId,
        accessTierRank: rank === "" ? null : parseInt(rank, 10),
        purchasePriceCents: price.trim() === "" ? null : Math.round(parseFloat(price) * 100),
      });
      toast.success("Access settings saved.");
      onChanged();
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item.policy) return;
    try {
      await removeSpaceContentAction(spaceId, item.policy.spaceContentId);
      toast.success("Removed from space.");
      onChanged();
    } catch (err) {
      toast.error("Failed to remove content", { description: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div className="rounded-xl border border-border bg-bg/50 px-3.5 py-3.5 flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-accent/25">
      <div className="flex items-center gap-3.5 min-w-0">
        <span
          className={`text-[9px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-0.5 shrink-0 ${TYPE_STYLE[item.contentType]}`}
        >
          {TYPE_LABEL[item.contentType]}
        </span>
        {editorHref ? (
          <Link href={editorHref} className="text-sm font-semibold text-fg hover:text-accent truncate transition-colors">
            {item.title}
          </Link>
        ) : (
          <span className="text-sm font-semibold text-fg truncate">{item.title}</span>
        )}
      </div>

      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Access:</span>
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/50"
            title="Access"
          >
            <option value="">Free</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.rank}>
                Tier ≥ {t.name} (rank {t.rank})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Price:</span>
          <div className="relative" title="One-time price (optional)">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">$</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="—"
              disabled={!chargesEnabled}
              className="w-16 pl-5 pr-1.5 py-1.5 rounded-lg border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/50 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent-soft text-bg text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <CheckCircle className="w-3 h-3" /> Save
          </button>
          {item.policy && (
            <button
              onClick={remove}
              className="w-8 h-8 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 grid place-items-center transition-colors"
              title="Remove from space"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
