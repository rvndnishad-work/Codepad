"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, FileText } from "lucide-react";

type Props = {
  workspaceSlug: string;
  candidateId: string;
  initialNotes: string;
};

export default function CandidateNotesEditor({ workspaceSlug, candidateId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const dirty = notes !== initialNotes;

  // Save with Ctrl/Cmd + S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && !saving) save();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dirty, saving, notes]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/w/${workspaceSlug}/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      toast.success("Notes saved");
      setSavedAt(new Date());
    } catch (err) {
      toast.error("Failed to save notes", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-indigo-500" />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Notes</h3>
        </div>
        {savedAt && !dirty && (
          <span className="text-[10px] text-muted/70">
            Saved {savedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes about this candidate — sourcing context, screening feedback, scheduling preferences…"
        rows={10}
        className="w-full px-4 py-3 bg-bg text-fg text-sm focus:outline-none resize-none border-b border-border"
      />

      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <span className="text-[10px] text-muted/70">
          {dirty ? "Unsaved changes · Ctrl+S to save" : "Up to date"}
        </span>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-3 h-3" />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
