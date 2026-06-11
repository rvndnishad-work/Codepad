"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Store, CreditCard, CheckCircle2, Trash2, Tag } from "lucide-react";
import {
  startOnboardingAction,
  createProductAction,
  setProductPublishedAction,
  deleteProductAction,
} from "./actions";

export type ContentItem = {
  contentType: "CHALLENGE" | "BLOG_POST" | "SNIPPET";
  contentId: string;
  title: string;
};
export type ProductRow = {
  id: string;
  contentType: string;
  contentId: string;
  kind: string;
  priceCents: number;
  currency: string;
  published: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  CHALLENGE: "Challenge",
  BLOG_POST: "Blog post",
  SNIPPET: "Snippet",
};

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );

export default function CreatorConsole({
  chargesEnabled,
  hasAccount,
  content,
  products,
}: {
  chargesEnabled: boolean;
  hasAccount: boolean;
  content: ContentItem[];
  products: ProductRow[];
}) {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState(false);

  async function onboard() {
    setOnboarding(true);
    try {
      const url = await startOnboardingAction();
      window.location.href = url;
    } catch (err) {
      toast.error("Couldn't start onboarding", {
        description: err instanceof Error ? err.message : String(err),
      });
      setOnboarding(false);
    }
  }

  const productsByContent = (item: ContentItem) =>
    products.filter(
      (p) => p.contentType === item.contentType && p.contentId === item.contentId,
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <Store className="w-5 h-5 text-accent" />
        <div>
          <h1 className="text-xl font-bold text-fg">Creator Studio</h1>
          <p className="text-xs text-muted mt-0.5">
            Sell your challenges, posts, and snippets. Payments run through Stripe
            with a platform fee; the rest is paid out to you.
          </p>
        </div>
      </div>

      {/* Onboarding status */}
      <div className="rounded-xl border border-border bg-surface p-4">
        {chargesEnabled ? (
          <div className="flex items-center gap-2 text-sm text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-semibold">Payouts enabled</span>
            <span className="text-muted font-normal">— you can publish products below.</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-fg">
              <div className="font-semibold flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-accent" /> Set up payouts
              </div>
              <p className="text-xs text-muted mt-0.5">
                {hasAccount
                  ? "Finish your Stripe onboarding to start selling."
                  : "Connect a Stripe account to receive payments."}
              </p>
            </div>
            <button
              onClick={onboard}
              disabled={onboarding}
              className="px-4 py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {onboarding ? "Redirecting…" : hasAccount ? "Continue onboarding" : "Start onboarding"}
            </button>
          </div>
        )}
      </div>

      {/* Owned content */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-fg">Your content ({content.length})</h2>
        {content.length === 0 && (
          <p className="text-xs text-muted">
            You haven&apos;t authored any content yet. Create a challenge, post, or
            snippet first, then sell it here.
          </p>
        )}
        {content.map((item) => (
          <ContentRow
            key={`${item.contentType}:${item.contentId}`}
            item={item}
            products={productsByContent(item)}
            chargesEnabled={chargesEnabled}
            onChanged={() => router.refresh()}
          />
        ))}
      </div>
    </div>
  );
}

function ContentRow({
  item,
  products,
  chargesEnabled,
  onChanged,
}: {
  item: ContentItem;
  products: ProductRow[];
  chargesEnabled: boolean;
  onChanged: () => void;
}) {
  const [kind, setKind] = useState<"ONE_TIME" | "SUBSCRIPTION">("ONE_TIME");
  const [price, setPrice] = useState("9.00");
  const [busy, setBusy] = useState(false);

  async function create() {
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 50) {
      toast.error("Enter a price of at least $0.50.");
      return;
    }
    setBusy(true);
    try {
      await createProductAction({
        contentType: item.contentType,
        contentId: item.contentId,
        kind,
        priceCents,
      });
      toast.success("Product created (unpublished).");
      onChanged();
    } catch (err) {
      toast.error("Couldn't create product", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(p: ProductRow) {
    try {
      await setProductPublishedAction(p.id, !p.published);
      toast.success(p.published ? "Unpublished." : "Published.");
      onChanged();
    } catch (err) {
      toast.error("Failed", { description: err instanceof Error ? err.message : String(err) });
    }
  }

  async function remove(p: ProductRow) {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteProductAction(p.id);
      toast.success("Deleted.");
      onChanged();
    } catch (err) {
      toast.error("Failed", { description: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted border border-border rounded px-1.5 py-0.5">
          {TYPE_LABEL[item.contentType]}
        </span>
        <span className="text-sm font-semibold text-fg truncate">{item.title}</span>
      </div>

      {products.map((p) => (
        <div key={p.id} className="flex items-center gap-2 text-xs">
          <Tag className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="font-semibold text-fg">{money(p.priceCents, p.currency)}</span>
          <span className="text-muted">
            {p.kind === "SUBSCRIPTION" ? "/ month subscription" : "one-time"}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
              p.published
                ? "text-emerald-500 bg-emerald-500/10"
                : "text-muted bg-panel/60"
            }`}
          >
            {p.published ? "Published" : "Draft"}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => togglePublish(p)}
              className="px-2 py-1 rounded border border-border text-[10px] font-bold uppercase tracking-wider text-muted hover:text-fg hover:bg-panel transition-colors"
            >
              {p.published ? "Unpublish" : "Publish"}
            </button>
            <button
              onClick={() => remove(p)}
              className="w-6 h-6 rounded text-muted hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center"
              title="Delete product"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}

      {/* New product form */}
      <div className="flex items-center gap-2 pt-1">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "ONE_TIME" | "SUBSCRIPTION")}
          disabled={!chargesEnabled || busy}
          className="px-2 py-1.5 rounded-md border border-border bg-bg text-fg text-[11px] focus:outline-none focus:border-accent/40 disabled:opacity-50"
        >
          <option value="ONE_TIME">One-time</option>
          <option value="SUBSCRIPTION">Subscription</option>
        </select>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">$</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={!chargesEnabled || busy}
            className="w-24 pl-5 pr-2 py-1.5 rounded-md border border-border bg-bg text-fg text-[11px] focus:outline-none focus:border-accent/40 disabled:opacity-50"
          />
        </div>
        <button
          onClick={create}
          disabled={!chargesEnabled || busy}
          className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          title={chargesEnabled ? "" : "Finish onboarding first"}
        >
          {busy ? "…" : "Sell"}
        </button>
      </div>
    </div>
  );
}
