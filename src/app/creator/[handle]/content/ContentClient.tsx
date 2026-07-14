"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  LayoutGrid,
  BookOpen,
  HelpCircle,
  Briefcase,
  Search,
  Trash2,
  Eye,
  Plus,
  ChevronDown,
  Lock,
  CheckCircle,
  Share2,
  Check,
} from "lucide-react";
import { setSpaceContentAction, removeSpaceContentAction, setContentPublishedAction } from "../../actions";

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
  published: boolean;
  updatedAt: string;
  views: number;
  policy: { spaceContentId: string; accessTierRank: number | null; purchasePriceCents: number | null } | null;
  /** Public URL path — used by the share button (UTM-tagged copy). */
  publicHref: string;
};

const TYPE_LABEL: Record<ContentItem["contentType"], string> = {
  CHALLENGE: "Challenge",
  SNIPPET: "Playground",
  BLOG_POST: "Blog",
  TUTORIAL: "Tutorial",
  INTERVIEW_QA: "Interview Q&A",
  INTERVIEW_EXPERIENCE: "Experience",
};

const TYPE_STYLE: Record<ContentItem["contentType"], string> = {
  CHALLENGE: "text-amber-500 bg-amber-500/10 border-amber-500/25",
  SNIPPET: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25",
  BLOG_POST: "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/25",
  TUTORIAL: "text-violet-500 bg-violet-500/10 border-violet-500/25",
  INTERVIEW_QA: "text-rose-500 bg-rose-500/10 border-rose-500/25",
  INTERVIEW_EXPERIENCE: "text-sky-500 bg-sky-500/10 border-sky-500/25",
};

/** Types authored inside the studio — publish toggles + editors live here. */
const NATIVE_TYPES = new Set(["TUTORIAL", "INTERVIEW_QA", "INTERVIEW_EXPERIENCE"]);

const FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "TUTORIAL", label: "Tutorials" },
  { key: "INTERVIEW_QA", label: "Q&A" },
  { key: "INTERVIEW_EXPERIENCE", label: "Experiences" },
  { key: "CHALLENGE", label: "Challenges" },
  { key: "SNIPPET", label: "Playgrounds" },
  { key: "BLOG_POST", label: "Blogs" },
];

export default function ContentClient({
  spaceId,
  handle,
  content,
  tiers,
  chargesEnabled,
}: {
  spaceId: string;
  handle: string;
  content: ContentItem[];
  tiers: TierRow[];
  chargesEnabled: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(
    () =>
      content.filter(
        (c) =>
          (filter === "ALL" || c.contentType === filter) &&
          (!query.trim() || c.title.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [content, query, filter],
  );

  const publishedCount = content.filter((c) => c.published).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-fg">Content Library</h1>
            <p className="text-xs text-muted mt-0.5">
              {content.length} item{content.length === 1 ? "" : "s"} · {publishedCount} live · drafts, access and
              pricing in one place.
            </p>
          </div>
        </div>

        {/* New content menu */}
        <div className="relative">
          <button
            onClick={() => setNewOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold shadow-soft transition-colors"
          >
            <Plus className="w-4 h-4" /> New content <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {newOpen && (
            <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-border bg-surface shadow-tile p-1.5">
              <NewItem href={`/creator/tutorials/new?spaceId=${spaceId}`} Icon={BookOpen} label="Tutorial" sub="Multi-section deep dive" />
              <NewItem href={`/creator/interview/new?spaceId=${spaceId}`} Icon={HelpCircle} label="Interview Q&A" sub="Question & answer guide" />
              <NewItem href={`/creator/experience/new?spaceId=${spaceId}`} Icon={Briefcase} label="Interview Experience" sub="A real loop, round by round" />
            </div>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your content…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                filter === f.key ? "bg-accent/15 text-accent" : "text-muted hover:text-fg hover:bg-panel/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 px-6 text-center">
          <LayoutGrid className="w-7 h-7 text-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-fg">{content.length === 0 ? "Nothing here yet" : "No matches"}</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {content.length === 0
              ? "Create your first tutorial, Q&A guide or experience with the New content button."
              : "Try a different search or filter."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface shadow-tile divide-y divide-border/60 overflow-hidden">
          {filtered.map((item) => (
            <ContentRow
              key={`${item.contentType}:${item.contentId}`}
              spaceId={spaceId}
              handle={handle}
              item={item}
              tiers={tiers}
              chargesEnabled={chargesEnabled}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NewItem({ href, Icon, label, sub }: { href: string; Icon: typeof BookOpen; label: string; sub: string }) {
  return (
    <Link href={href} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-panel/50 transition-colors">
      <Icon className="w-4 h-4 text-accent mt-0.5 shrink-0" />
      <span>
        <span className="block text-xs font-bold text-fg">{label}</span>
        <span className="block text-[10px] text-muted mt-0.5">{sub}</span>
      </span>
    </Link>
  );
}

function ContentRow({
  spaceId,
  handle,
  item,
  tiers,
  chargesEnabled,
  onChanged,
}: {
  spaceId: string;
  handle: string;
  item: ContentItem;
  tiers: TierRow[];
  chargesEnabled: boolean;
  onChanged: () => void;
}) {
  const [rank, setRank] = useState<string>(item.policy?.accessTierRank != null ? String(item.policy.accessTierRank) : "");
  const [price, setPrice] = useState<string>(
    item.policy?.purchasePriceCents != null ? (item.policy.purchasePriceCents / 100).toFixed(2) : "",
  );
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);
  const isNative = NATIVE_TYPES.has(item.contentType);

  // UTM-tagged share link so creators can see which posts drive traffic.
  function share() {
    const url = `${window.location.origin}${item.publicHref}?utm_source=creator_share&utm_medium=social&utm_campaign=${handle}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setShared(true);
        toast.success("Share link copied", { description: "UTM-tagged so you can track clicks." });
        setTimeout(() => setShared(false), 1500);
      })
      .catch(() => toast.error("Couldn't copy the link."));
  }

  const editorHref =
    item.contentType === "TUTORIAL"
      ? `/creator/tutorials/${item.contentId}`
      : item.contentType === "INTERVIEW_QA"
        ? `/creator/interview/${item.contentId}`
        : item.contentType === "INTERVIEW_EXPERIENCE"
          ? `/creator/experience/${item.contentId}`
          : null;

  const dirty =
    rank !== (item.policy?.accessTierRank != null ? String(item.policy.accessTierRank) : "") ||
    price !== (item.policy?.purchasePriceCents != null ? (item.policy.purchasePriceCents / 100).toFixed(2) : "");

  async function savePolicy() {
    setBusy(true);
    try {
      await setSpaceContentAction(spaceId, {
        contentType: item.contentType,
        contentId: item.contentId,
        accessTierRank: rank === "" ? null : parseInt(rank, 10),
        purchasePriceCents: price.trim() === "" ? null : Math.round(parseFloat(price) * 100),
      });
      toast.success("Access updated.");
      onChanged();
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished() {
    if (!isNative) return;
    setBusy(true);
    try {
      await setContentPublishedAction(
        spaceId,
        item.contentType as "TUTORIAL" | "INTERVIEW_QA" | "INTERVIEW_EXPERIENCE",
        item.contentId,
        !item.published,
      );
      toast.success(item.published ? "Unpublished." : "Published — followers notified.");
      onChanged();
    } catch (err) {
      toast.error("Failed", { description: err instanceof Error ? err.message : String(err) });
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
      toast.error("Failed to remove", { description: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div className="px-4 py-3.5 flex flex-wrap items-center gap-3 hover:bg-panel/20 transition-colors">
      {/* Identity */}
      <div className="flex items-center gap-3 min-w-0 flex-1 basis-64">
        <span
          className={`text-[9px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 shrink-0 ${TYPE_STYLE[item.contentType]}`}
        >
          {TYPE_LABEL[item.contentType]}
        </span>
        <div className="min-w-0">
          {editorHref ? (
            <Link href={editorHref} className="text-sm font-bold text-fg hover:text-accent truncate block transition-colors">
              {item.title}
            </Link>
          ) : (
            <span className="text-sm font-bold text-fg truncate block">{item.title}</span>
          )}
          <div className="flex items-center gap-2.5 mt-0.5 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3 h-3" /> {item.views}
            </span>
            <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      {isNative ? (
        <button
          onClick={togglePublished}
          disabled={busy}
          title={item.published ? "Unpublish" : "Publish"}
          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border transition-colors disabled:opacity-50 ${
            item.published
              ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
              : "text-amber-500 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${item.published ? "bg-emerald-500" : "bg-amber-500"}`} />
          {item.published ? "Live" : "Draft"}
        </button>
      ) : (
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border ${
            item.published
              ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
              : "text-muted border-border bg-panel/40"
          }`}
        >
          {item.published ? "Public" : "Private"}
        </span>
      )}

      {/* Access policy */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none" />
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="pl-6 pr-2 py-1.5 rounded-lg border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/50"
            title="Access"
          >
            <option value="">Free</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.rank}>
                {t.name}+
              </option>
            ))}
          </select>
        </div>
        <div className="relative" title={chargesEnabled ? "One-time price (optional)" : "Connect Stripe to sell"}>
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">$</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="—"
            disabled={!chargesEnabled}
            className="w-16 pl-5 pr-1.5 py-1.5 rounded-lg border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/50 disabled:opacity-40"
          />
        </div>
        {dirty && (
          <button
            onClick={savePolicy}
            disabled={busy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent hover:bg-accent-soft text-bg text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-3 h-3" /> Save
          </button>
        )}
        {item.published && (
          <button
            onClick={share}
            className="w-7 h-7 rounded-lg text-muted hover:text-accent hover:bg-accent/10 grid place-items-center transition-colors"
            title="Copy share link (UTM-tagged)"
          >
            {shared ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
        )}
        {item.policy && !isNative && (
          <button
            onClick={remove}
            className="w-7 h-7 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 grid place-items-center transition-colors"
            title="Remove from space"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
