"use client";

import { useState } from "react";
import { X, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  attemptId: string;
  scenarioTitle: string;
  defaultTitle?: string;
  onClose: () => void;
  onShared: (updated: { shared: true; shareTitle: string | null; shareNote: string | null }) => void;
}

/**
 * Share-an-attempt modal. Lets the user attach an optional headline + note
 * explaining their approach before publishing the prompt to the community
 * list. POSTs to /api/prompt-attempts/[id]/share.
 */
export default function ShareModal({ attemptId, scenarioTitle, defaultTitle, onClose, onShared }: Props) {
  const [shareTitle, setShareTitle] = useState(defaultTitle ?? "");
  const [shareNote, setShareNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/prompt-attempts/${attemptId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          shared: true,
          shareTitle: shareTitle.trim() || null,
          shareNote: shareNote.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      toast.success("Prompt shared with the community");
      onShared({
        shared: true,
        shareTitle: shareTitle.trim() || null,
        shareNote: shareNote.trim() || null,
      });
      onClose();
    } catch (err) {
      toast.error("Failed to share", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between bg-panel/30">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-fg">Share your prompt</h2>
              <p className="text-[11px] text-muted">
                Visible on the {scenarioTitle} community list. You can unshare anytime.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-panel text-muted hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Headline <span className="font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              maxLength={80}
              placeholder={`e.g. "Token-efficient approach using role + spec table"`}
              value={shareTitle}
              onChange={(e) => setShareTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-muted/70">Shown in the community list instead of the scenario title.</p>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Note <span className="font-normal normal-case">(optional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={400}
              placeholder="Why this approach works, what trade-offs you made, what would improve it."
              value={shareNote}
              onChange={(e) => setShareNote(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg text-xs text-fg focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-border bg-bg text-xs font-semibold text-muted hover:text-fg hover:bg-panel transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              {submitting ? "Sharing…" : "Share"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
