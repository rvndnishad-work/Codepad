"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, ExternalLink, Save, Copy, Code, Check } from "lucide-react";
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

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);

  const portfolioUrl = typeof window !== "undefined"
    ? `${window.location.origin}/u/${userId}/portfolio`
    : `/u/${userId}/portfolio`;

  const embedCode = `<iframe src="${portfolioUrl}?embed=true" width="100%" height="450" frameborder="0" style="border:1px solid #e2e8f0;border-radius:24px;max-width:700px;background:#0d0e12;" allow="clipboard-write"></iframe>`;

  const copyToClipboard = async (text: string, isLink: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isLink) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        toast.success("Public portfolio link copied!");
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
        toast.success("Iframe embed code copied!");
      }
    } catch {
      toast.error("Failed to copy code to clipboard");
    }
  };

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
    <div className="mx-auto max-w-2xl px-6 py-10 relative">
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

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold text-sm transition disabled:opacity-50 shadow-[0_0_16px_rgba(var(--accent-rgb),0.2)]"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save"}
          </button>
          
          <Link
            href={`/u/${userId}/portfolio`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-elevated text-sm font-bold text-muted hover:text-fg transition"
          >
            View page
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {portfolioPublic && (
            <>
              <button
                onClick={() => copyToClipboard(portfolioUrl, true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-elevated text-sm font-bold text-muted hover:text-fg transition"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? "Copied!" : "Copy Link"}
              </button>

              <button
                onClick={() => setShowEmbedDialog(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-elevated text-sm font-bold text-muted hover:text-fg transition"
              >
                <Code className="w-3.5 h-3.5 text-accent" />
                Embed Card
              </button>
            </>
          )}
        </div>
      </div>

      {/* Premium Embed Dialog Modal */}
      {showEmbedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-[2rem] p-6 max-w-lg w-full space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-xl font-black text-fg tracking-tight flex items-center gap-2">
                <Code className="w-5 h-5 text-accent" />
                Embed public portfolio
              </h2>
              <p className="text-muted text-xs leading-relaxed mt-1">
                Copy this HTML code block to embed your verified Codepad developer card in your personal blog, Notion page, or Medium article.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted">
                HTML Iframe Code
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  value={embedCode}
                  rows={4}
                  className="w-full bg-panel border border-border rounded-xl px-4 py-3 text-xs font-mono text-muted/90 outline-none resize-none focus:border-accent/40"
                />
                <button
                  onClick={() => copyToClipboard(embedCode, false)}
                  className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-soft text-bg font-bold text-[10px] uppercase tracking-wider transition"
                >
                  {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedCode ? "Copied" : "Copy Code"}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-muted font-mono">oEmbed compliant endpoint active</span>
              <button
                onClick={() => setShowEmbedDialog(false)}
                className="px-5 py-2.5 bg-surface hover:bg-elevated border border-border rounded-xl font-bold text-xs text-fg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
