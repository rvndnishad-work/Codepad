"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Store, Sparkles, AlertCircle } from "lucide-react";
import { createSpaceAction } from "./actions";

export default function CreatorOnboarding() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) {
      toast.error("Please enter a name for your space.");
      return;
    }
    if (!handle.trim()) {
      toast.error("Please pick a unique handle.");
      return;
    }
    setBusy(true);
    try {
      const space = await createSpaceAction({ handle, name });
      toast.success("Space created successfully!");
      router.push(`/creator/${space.handle}`);
    } catch (err) {
      toast.error("Couldn't create space", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-surface/60 border border-border backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl relative transition-all duration-300 hover:border-accent/20">
          <div className="text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-accent-glow border border-accent/25 grid place-items-center text-accent mx-auto mb-5 shadow-lg">
              <Store className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-fg">Create your creator page</h1>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Your public storefront and interactive hub. Choose a handle and name to publish tutorials, blogs, and challenges.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-1.5">
                Handle (Vanity URL)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-muted pointer-events-none">
                  interviewpad.dev/c/
                </span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="jane-dev"
                  className="w-full pl-[135px] pr-4 py-3 rounded-xl border border-border bg-bg/50 text-fg text-sm placeholder:text-muted/40 focus:outline-none focus:border-accent/40 transition-colors font-mono"
                />
              </div>
              <p className="text-[10px] text-muted/60 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-accent" /> Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-1.5">
                Space Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane's Dev Lab"
                className="w-full px-4 py-3 rounded-xl border border-border bg-bg/50 text-fg text-sm placeholder:text-muted/40 focus:outline-none focus:border-accent/40 transition-colors"
              />
            </div>

            <button
              onClick={create}
              disabled={busy}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold shadow-soft transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {busy ? "Creating Space..." : "Create Space"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
