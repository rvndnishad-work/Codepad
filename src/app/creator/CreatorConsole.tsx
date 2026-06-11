"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Store,
  CreditCard,
  CheckCircle2,
  Trash2,
  Wallet,
  ExternalLink,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import {
  startOnboardingAction,
  createSpaceAction,
  updateSpaceAction,
  createTierAction,
  setTierPublishedAction,
  deleteTierAction,
  setSpaceContentAction,
  removeSpaceContentAction,
} from "./actions";

export type SpaceData = {
  id: string;
  handle: string;
  name: string;
  tagline: string | null;
  description: string | null;
  published: boolean;
};
export type TierRow = {
  id: string;
  name: string;
  rank: number;
  priceCents: number;
  currency: string;
  published: boolean;
};
export type ContentItem = {
  contentType: "CHALLENGE" | "SNIPPET" | "BLOG_POST" | "TUTORIAL" | "INTERVIEW_QA";
  contentId: string;
  title: string;
  policy: { spaceContentId: string; accessTierRank: number | null; purchasePriceCents: number | null } | null;
};
export type DocRow = { id: string; title: string; slug: string; published: boolean };

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

const TYPE_LABEL: Record<string, string> = {
  CHALLENGE: "Challenge",
  SNIPPET: "Playground",
  BLOG_POST: "Blog",
  TUTORIAL: "Tutorial",
  INTERVIEW_QA: "Interview Q&A",
};

export default function CreatorConsole(props: {
  chargesEnabled: boolean;
  hasAccount: boolean;
  space: SpaceData | null;
  tiers: TierRow[];
  content: ContentItem[];
  tutorials: DocRow[];
  interviews: DocRow[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Store className="w-5 h-5 text-accent" />
          <h1 className="text-xl font-bold text-fg">Creator Studio</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/creator/earnings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg">
            <Wallet className="w-3.5 h-3.5" /> Earnings
          </Link>
          {props.space?.published && (
            <Link href={`/c/${props.space.handle}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg">
              <ExternalLink className="w-3.5 h-3.5" /> Public page
            </Link>
          )}
        </div>
      </div>

      <OnboardingCard chargesEnabled={props.chargesEnabled} hasAccount={props.hasAccount} />

      {props.space ? (
        <>
          <SpaceCard space={props.space} onChanged={refresh} />
          <TiersCard tiers={props.tiers} onChanged={refresh} />
          <ContentCard
            content={props.content}
            tiers={props.tiers}
            chargesEnabled={props.chargesEnabled}
            onChanged={refresh}
          />
        </>
      ) : (
        <CreateSpaceCard onChanged={refresh} />
      )}
    </div>
  );
}

function OnboardingCard({ chargesEnabled, hasAccount }: { chargesEnabled: boolean; hasAccount: boolean }) {
  const [busy, setBusy] = useState(false);
  async function onboard() {
    setBusy(true);
    try {
      const url = await startOnboardingAction();
      window.location.assign(url);
    } catch (err) {
      toast.error("Couldn't start onboarding", { description: err instanceof Error ? err.message : String(err) });
      setBusy(false);
    }
  }
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      {chargesEnabled ? (
        <div className="flex items-center gap-2 text-sm text-emerald-500">
          <CheckCircle2 className="w-4 h-4" />
          <span className="font-semibold">Payouts enabled</span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-fg">
            <div className="font-semibold flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-accent" /> Set up payouts
            </div>
            <p className="text-xs text-muted mt-0.5">
              {hasAccount ? "Finish Stripe onboarding to start selling." : "Connect Stripe to receive payments."}
            </p>
          </div>
          <button onClick={onboard} disabled={busy} className="px-4 py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-bold uppercase tracking-wider disabled:opacity-50">
            {busy ? "Redirecting…" : hasAccount ? "Continue onboarding" : "Start onboarding"}
          </button>
        </div>
      )}
    </div>
  );
}

function CreateSpaceCard({ onChanged }: { onChanged: () => void }) {
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try {
      await createSpaceAction({ handle, name });
      toast.success("Space created.");
      onChanged();
    } catch (err) {
      toast.error("Couldn't create space", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-5 space-y-3">
      <h2 className="text-sm font-bold text-fg">Create your space</h2>
      <p className="text-xs text-muted">Your public hub at <code>/c/handle</code>.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="handle (e.g. jane-dev)" className="px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-xs font-mono focus:outline-none focus:border-accent/40" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Space name" className="px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40" />
      </div>
      <button onClick={create} disabled={busy} className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[10px] font-bold uppercase tracking-wider disabled:opacity-50">
        {busy ? "Creating…" : "Create space"}
      </button>
    </div>
  );
}

function SpaceCard({ space, onChanged }: { space: SpaceData; onChanged: () => void }) {
  const [name, setName] = useState(space.name);
  const [tagline, setTagline] = useState(space.tagline ?? "");
  const [description, setDescription] = useState(space.description ?? "");
  const [busy, setBusy] = useState(false);
  async function save(extra?: { published?: boolean }) {
    setBusy(true);
    try {
      await updateSpaceAction({ name, tagline, description, ...extra });
      toast.success("Saved.");
      onChanged();
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-fg">Space · <code className="text-muted font-mono">/c/{space.handle}</code></h2>
        <button onClick={() => save({ published: !space.published })} disabled={busy} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${space.published ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" : "text-muted border-border"}`}>
          {space.published ? "Published" : "Draft — publish"}
        </button>
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40" />
      <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Tagline" className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="About (markdown)" rows={3} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40" />
      <button onClick={() => save()} disabled={busy} className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[10px] font-bold uppercase tracking-wider disabled:opacity-50">Save</button>
    </div>
  );
}

function TiersCard({ tiers, onChanged }: { tiers: TierRow[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [rank, setRank] = useState("1");
  const [price, setPrice] = useState("9.00");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      await createTierAction({ name, rank: parseInt(rank, 10), priceCents: Math.round(parseFloat(price) * 100) });
      toast.success("Tier created.");
      setName("");
      onChanged();
    } catch (err) {
      toast.error("Couldn't create tier", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }
  async function act(fn: () => Promise<void>) {
    try { await fn(); onChanged(); } catch (err) { toast.error("Failed", { description: err instanceof Error ? err.message : String(err) }); }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <h2 className="text-sm font-bold text-fg">Membership tiers</h2>
      {tiers.map((t) => (
        <div key={t.id} className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-fg">{t.name}</span>
          <span className="text-muted">rank {t.rank} · {money(t.priceCents, t.currency)}/mo</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${t.published ? "text-emerald-500 bg-emerald-500/10" : "text-muted bg-panel/60"}`}>{t.published ? "Published" : "Draft"}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => act(() => setTierPublishedAction(t.id, !t.published))} className="px-2 py-1 rounded border border-border text-[10px] font-bold uppercase text-muted hover:text-fg">{t.published ? "Unpublish" : "Publish"}</button>
            <button onClick={() => act(() => deleteTierAction(t.id))} className="w-6 h-6 rounded text-muted hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tier name" className="flex-1 px-2 py-1.5 rounded-md border border-border bg-bg text-fg text-[11px] focus:outline-none focus:border-accent/40" />
        <input value={rank} onChange={(e) => setRank(e.target.value)} title="rank" className="w-14 px-2 py-1.5 rounded-md border border-border bg-bg text-fg text-[11px] focus:outline-none focus:border-accent/40" />
        <input value={price} onChange={(e) => setPrice(e.target.value)} className="w-20 px-2 py-1.5 rounded-md border border-border bg-bg text-fg text-[11px] focus:outline-none focus:border-accent/40" />
        <button onClick={create} disabled={busy} className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[10px] font-bold uppercase disabled:opacity-50">Add</button>
      </div>
    </div>
  );
}

function ContentCard({ content, tiers, chargesEnabled, onChanged }: { content: ContentItem[]; tiers: TierRow[]; chargesEnabled: boolean; onChanged: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-fg">Content & access</h2>
        <div className="flex items-center gap-2">
          <Link href="/creator/tutorials/new" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-[10px] font-bold uppercase tracking-wider text-muted hover:text-fg"><BookOpen className="w-3 h-3" /> New tutorial</Link>
          <Link href="/creator/interview/new" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-[10px] font-bold uppercase tracking-wider text-muted hover:text-fg"><HelpCircle className="w-3 h-3" /> New Q&amp;A</Link>
        </div>
      </div>
      {content.length === 0 && <p className="text-xs text-muted">No content yet. Author a tutorial or Q&amp;A, or create challenges/snippets/blogs elsewhere — they&apos;ll appear here to add to your space.</p>}
      {content.map((item) => (
        <ContentRow key={`${item.contentType}:${item.contentId}`} item={item} tiers={tiers} chargesEnabled={chargesEnabled} onChanged={onChanged} />
      ))}
    </div>
  );
}

function ContentRow({ item, tiers, chargesEnabled, onChanged }: { item: ContentItem; tiers: TierRow[]; chargesEnabled: boolean; onChanged: () => void }) {
  // accessTierRank state: "" = free (null), else string rank.
  const [rank, setRank] = useState<string>(item.policy?.accessTierRank != null ? String(item.policy.accessTierRank) : "");
  const [price, setPrice] = useState<string>(item.policy?.purchasePriceCents != null ? (item.policy.purchasePriceCents / 100).toFixed(2) : "");
  const [busy, setBusy] = useState(false);

  const editorHref = item.contentType === "TUTORIAL" ? `/creator/tutorials/${item.contentId}` : item.contentType === "INTERVIEW_QA" ? `/creator/interview/${item.contentId}` : null;

  async function save() {
    setBusy(true);
    try {
      await setSpaceContentAction({
        contentType: item.contentType,
        contentId: item.contentId,
        accessTierRank: rank === "" ? null : parseInt(rank, 10),
        purchasePriceCents: price.trim() === "" ? null : Math.round(parseFloat(price) * 100),
      });
      toast.success("Access saved.");
      onChanged();
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!item.policy) return;
    try { await removeSpaceContentAction(item.policy.spaceContentId); toast.success("Removed from space."); onChanged(); }
    catch (err) { toast.error("Failed", { description: err instanceof Error ? err.message : String(err) }); }
  }

  return (
    <div className="rounded-lg border border-border bg-bg/40 p-2.5 flex flex-wrap items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted border border-border rounded px-1.5 py-0.5">{TYPE_LABEL[item.contentType]}</span>
      {editorHref ? <Link href={editorHref} className="text-sm font-semibold text-fg hover:text-accent truncate">{item.title}</Link> : <span className="text-sm font-semibold text-fg truncate">{item.title}</span>}
      <div className="ml-auto flex items-center gap-2">
        <select value={rank} onChange={(e) => setRank(e.target.value)} className="px-2 py-1 rounded-md border border-border bg-bg text-fg text-[11px] focus:outline-none focus:border-accent/40" title="Access">
          <option value="">Free</option>
          {tiers.map((t) => <option key={t.id} value={t.rank}>Tier ≥ {t.name} (rank {t.rank})</option>)}
        </select>
        <div className="relative" title="One-time price (optional)">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">$</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="—" disabled={!chargesEnabled} className="w-16 pl-5 pr-1.5 py-1 rounded-md border border-border bg-bg text-fg text-[11px] focus:outline-none focus:border-accent/40 disabled:opacity-50" />
        </div>
        <button onClick={save} disabled={busy} className="px-2.5 py-1 rounded-md bg-accent hover:bg-accent-soft text-bg text-[10px] font-bold uppercase disabled:opacity-50">Save</button>
        {item.policy && <button onClick={remove} className="w-6 h-6 rounded text-muted hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center" title="Remove from space"><Trash2 className="w-3 h-3" /></button>}
      </div>
    </div>
  );
}
