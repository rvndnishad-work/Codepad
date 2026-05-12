"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";

export default function PortfolioSettings({
  userId,
  initial,
}: {
  userId: string;
  initial: { bio: string; hireMeUrl: string; portfolioPublic: boolean };
}) {
  const [bio, setBio] = useState(initial.bio);
  const [hireMeUrl, setHireMeUrl] = useState(initial.hireMeUrl);
  const [portfolioPublic, setPortfolioPublic] = useState(initial.portfolioPublic);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/me/portfolio", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim(),
          hireMeUrl: hireMeUrl.trim(),
          portfolioPublic,
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      toast.success("Portfolio updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Dashboard
      </Link>

      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center">
          <Briefcase className="w-5 h-5 text-accent" />
        </div>
        <div>
          <div className="text-xs font-black tracking-[0.2em] text-muted uppercase mb-0.5">
            Portfolio
          </div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Hire Me page</h1>
        </div>
      </div>
      <p className="text-muted text-sm mb-8 max-w-xl leading-relaxed">
        Customise the bio and contact link shown on your public portfolio. Solved challenges
        and public snippets surface automatically.
      </p>

      <div className="space-y-6">
        <Field label="Bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Senior frontend engineer. Love React, TypeScript, and well-tested code."
            rows={4}
            maxLength={600}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border focus:border-accent/40 focus:bg-elevated text-sm text-fg outline-none transition resize-none"
          />
          <div className="text-[10px] text-muted/60 mt-1 tabular-nums">{bio.length} / 600</div>
        </Field>

        <Field label="Hire me link">
          <input
            type="text"
            value={hireMeUrl}
            onChange={(e) => setHireMeUrl(e.target.value)}
            placeholder="https://yoursite.com  or  mailto:you@example.com"
            maxLength={300}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border focus:border-accent/40 focus:bg-elevated text-sm text-fg outline-none transition font-mono"
          />
          <div className="text-[10px] text-muted/60 mt-1">
            Must start with <code className="text-accent">https://</code>,{" "}
            <code className="text-accent">http://</code>, or <code className="text-accent">mailto:</code>.
          </div>
        </Field>

        <Field label="Visibility">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={portfolioPublic}
              onChange={(e) => setPortfolioPublic(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-fg">My portfolio is public</span>
          </label>
          <div className="text-[10px] text-muted/60 mt-1 ml-7">
            When off, your <code className="text-accent">/u/{userId}</code> page returns 404.
          </div>
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold text-sm transition disabled:opacity-50 shadow-[0_0_16px_rgba(var(--accent-rgb),0.2)]"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save"}
          </button>
          <Link
            href={`/u/${userId}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-elevated text-sm font-bold text-muted hover:text-fg transition"
          >
            View public page
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
