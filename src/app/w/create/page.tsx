"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Building2, Globe, Sparkles } from "lucide-react";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-generate slug from name unless manually modified by the user
  useEffect(() => {
    if (!isManualSlug) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(generated);
    }
  }, [name, isManualSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a workspace name.");
      return;
    }
    if (!slug.trim()) {
      toast.error("Please enter a unique URL slug.");
      return;
    }

    setLoading(false);
    setLoading(true);

    try {
      const res = await fetch("/api/w/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP error ${res.status}`);
      }

      toast.success("Workspace created successfully!", {
        description: `Welcome to ${name}. Redirecting...`,
      });

      // Redirect directly to the new multi-tenant workspace dashboard
      router.push(`/w/${data.slug}`);
    } catch (err) {
      toast.error("Failed to create workspace", {
        description: err instanceof Error ? err.message : String(err),
      });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F3F4F6] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Radiant Background Glow Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-accent/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Back Link */}
        <Link
          href="/w"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-fg transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Workspaces
        </Link>

        {/* Form Card */}
        <div className="bg-[#161B2E]/60 border border-border backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl relative transition-all duration-300 hover:border-accent/20">
          <div className="space-y-2 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shadow-lg mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#F3F4F6]">
              Create a Corporate Workspace
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Form a collaborative recruiting hub. Author customized tests, configure asynchronous take-homes, and review candidates together with your engineering team.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Workspace Name Input */}
            <div className="space-y-2">
              <label htmlFor="w-name" className="text-xs font-black uppercase tracking-wider text-muted/95">
                Workspace Name
              </label>
              <input
                id="w-name"
                type="text"
                required
                placeholder="e.g., Vercel Engineering"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface/50 text-fg text-sm placeholder:text-muted/40 focus:outline-none focus:border-accent/40 transition-colors"
              />
            </div>

            {/* Custom Slug Input */}
            <div className="space-y-2">
              <label htmlFor="w-slug" className="text-xs font-black uppercase tracking-wider text-muted/95 flex justify-between">
                <span>Custom Workspace Slug</span>
                <span className="text-[10px] lowercase text-muted/50 font-normal">Only lowercases, numbers, dashes</span>
              </label>
              <div className="relative flex items-center">
                <Globe className="absolute left-4 w-4 h-4 text-muted/50" />
                <input
                  id="w-slug"
                  type="text"
                  required
                  placeholder="e.g., vercel-engineering"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    setIsManualSlug(true);
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-surface/50 text-fg text-sm placeholder:text-muted/40 focus:outline-none focus:border-accent/40 transition-colors font-mono"
                />
              </div>
              {/* URL Preview */}
              {slug && (
                <div className="text-[11px] text-muted/60 pl-1 font-mono">
                  Preview: <span className="text-accent">interviewpad.dev/w/{slug}</span>
                </div>
              )}
            </div>

            {/* Premium feature badge */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-start gap-3.5">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">Seat-Based Plan: Free Trial</h4>
                <p className="text-[11px] text-muted/80 leading-relaxed">
                  Start with a 14-day free trial. Invite up to 5 teammates and conduct unlimited automated developer take-home assessments.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden group/btn px-5 py-3.5 rounded-xl bg-accent hover:bg-accent-soft text-bg transition-all duration-300 shadow-[0_0_24px_rgba(var(--accent-rgb),0.15)] hover:shadow-[0_0_32px_rgba(var(--accent-rgb),0.35)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wider text-center"
            >
              {loading ? "Initializing Workspace Hub..." : "Create Workspace"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
