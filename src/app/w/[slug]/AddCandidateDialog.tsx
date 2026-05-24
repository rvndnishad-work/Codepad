"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, UserPlus } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  workspaceSlug: string;
};

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual entry" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" },
  { value: "ats", label: "ATS sync" },
  { value: "other", label: "Other" },
];

export default function AddCandidateDialog({ open, onClose, workspaceSlug }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("manual");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPhone("");
      setSource("manual");
      setNotes("");
      setTagsInput("");
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      const res = await fetch(`/api/w/${workspaceSlug}/candidates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, phone, source, notes, tags }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      toast.success("Candidate added");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error("Failed to add candidate", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl animate-in zoom-in-95 fade-in duration-150">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg">Add candidate</h3>
              <p className="text-[11px] text-muted mt-0.5">
                Register a candidate without sending an assignment yet.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md text-muted hover:text-fg hover:bg-panel/40 transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Full name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Developer"
              className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 415 555 0100"
                className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Tags <span className="text-muted/60 font-normal normal-case">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="senior, react, remote"
                className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Where you found them, initial impressions, scheduling constraints…"
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-md bg-panel/40 border border-border text-muted hover:text-fg transition-colors text-[12px] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-[12px] font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add candidate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
