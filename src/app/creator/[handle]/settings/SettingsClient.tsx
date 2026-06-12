"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Settings, Globe, ExternalLink } from "lucide-react";
import { updateSpaceAction } from "../../actions";

export type SpaceData = {
  id: string;
  handle: string;
  name: string;
  tagline: string | null;
  description: string | null;
  published: boolean;
};

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm transition-colors placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export default function SettingsClient({ space }: { space: SpaceData }) {
  const router = useRouter();
  const [name, setName] = useState(space.name);
  const [tagline, setTagline] = useState(space.tagline ?? "");
  const [description, setDescription] = useState(space.description ?? "");
  const [busy, setBusy] = useState(false);

  async function save(extra?: { published?: boolean }) {
    setBusy(true);
    try {
      await updateSpaceAction(space.id, { name, tagline, description, ...extra });
      toast.success("Space settings saved.");
      router.refresh();
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Space Settings</h1>
          <p className="text-xs text-muted mt-0.5">Your space&apos;s name, story, and publish status.</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-surface shadow-tile">
        <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-fg leading-tight">Space details</h2>
              <p className="text-[11px] text-muted mt-0.5">Public page at /c/{space.handle}</p>
            </div>
          </div>
          <button
            onClick={() => save({ published: !space.published })}
            disabled={busy}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors disabled:opacity-50 ${
              space.published
                ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
                : "text-fg border-accent/40 bg-accent-glow hover:border-accent/60"
            }`}
          >
            {space.published ? "Published" : "Draft (Publish)"}
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Handle (permanent)">
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg border border-border bg-panel/40 text-muted text-sm font-mono">
                /c/{space.handle}
              </code>
              {space.published && (
                <Link
                  href={`/c/${space.handle}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted hover:text-fg hover:border-accent/40 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Visit
                </Link>
              )}
            </div>
          </Field>
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Space name" className={inputCls} />
          </Field>
          <Field label="Tagline">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="One line about your space"
              className={inputCls}
            />
          </Field>
          <Field label="About (markdown)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell visitors what you publish and why it's worth joining…"
              rows={6}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <div className="flex justify-end">
            <button
              onClick={() => save()}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
