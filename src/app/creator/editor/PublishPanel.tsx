"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, Rocket, Save, Undo2, Lock } from "lucide-react";

export type AccessState = { rank: string; price: string };

/**
 * Shared publish sidebar for the studio editors: status, access policy
 * (free / tier-gated / one-time price) and the save / publish actions.
 * The access policy is written via setSpaceContentAction by the parent —
 * this component is purely controlled.
 */
export default function PublishPanel({
  backHref,
  published,
  busy,
  savedAt,
  publicHref,
  tiers,
  chargesEnabled,
  access,
  onAccessChange,
  onSave,
}: {
  backHref: string;
  published: boolean;
  busy: boolean;
  savedAt: Date | null;
  publicHref: string | null;
  tiers: { id: string; name: string; rank: number }[];
  chargesEnabled: boolean;
  access: AccessState;
  onAccessChange: (a: AccessState) => void;
  /** publish: true → publish, false → unpublish, undefined → keep state. */
  onSave: (publish?: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to studio
      </Link>

      <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Status</span>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${
              published
                ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                : "text-amber-500 border-amber-500/30 bg-amber-500/10"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${published ? "bg-emerald-500" : "bg-amber-500"}`} />
            {published ? "Published" : "Draft"}
          </span>
        </div>

        {/* Access policy */}
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Who can access
          </div>
          <select
            value={access.rank}
            onChange={(e) => onAccessChange({ ...access, rank: e.target.value })}
            className="w-full px-2.5 py-2 rounded-lg border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/50"
            title="Access level"
          >
            <option value="">Free — everyone</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.rank}>
                Members: {t.name} and above
              </option>
            ))}
          </select>
          <div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">$</span>
              <input
                value={access.price}
                onChange={(e) => onAccessChange({ ...access, price: e.target.value })}
                placeholder="One-time price (optional)"
                disabled={!chargesEnabled}
                className="w-full pl-6 pr-2.5 py-2 rounded-lg border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/50 disabled:opacity-50"
              />
            </div>
            {!chargesEnabled && (
              <p className="text-[10px] text-muted mt-1">Connect Stripe (Payment page) to sell individually.</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-3 border-t border-border">
          <button
            onClick={() => onSave(undefined)}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold text-fg hover:bg-panel/60 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {published ? "Save changes" : "Save draft"}
          </button>
          {published ? (
            <button
              onClick={() => onSave(false)}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/40 text-xs font-bold text-amber-500 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
            >
              <Undo2 className="w-3.5 h-3.5" /> Unpublish
            </button>
          ) : (
            <button
              onClick={() => onSave(true)}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Rocket className="w-3.5 h-3.5" /> Publish
            </button>
          )}
          {published && publicHref && (
            <Link
              href={publicHref}
              target="_blank"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-fg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View public page
            </Link>
          )}
          {savedAt && (
            <p className="text-[10px] text-muted text-center">
              Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {!published && (
            <p className="text-[10px] text-muted leading-relaxed text-center">
              Publishing notifies your followers and members.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
