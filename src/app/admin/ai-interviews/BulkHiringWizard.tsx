"use client";

import { useState, useTransition } from "react";
import { Upload, Users, X, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type WorkspaceRow = { id: string; name: string; slug: string };

export default function BulkHiringWizard({ workspaces }: { workspaces: WorkspaceRow[] }) {
  const [open, setOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [csv, setCsv] = useState("Ada Lovelace, ada@example.com, Frontend Engineer\nLin Fan, lin@example.com, Backend Engineer");
  const [isPending, startTransition] = useTransition();

  const rows = csv
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, email, title] = l.split(",").map((s) => s.trim());
      return { name, email, title };
    });

  const valid = rows.filter((r) => r.name && r.email && r.email.includes("@"));
  const invalid = rows.length - valid.length;

  const submit = () => {
    if (valid.length === 0) {
      toast.error("Add at least one valid candidate (name, email).");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/ai-interviews/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, candidates: valid, positionTitle: "Bulk Screening" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Bulk create failed");
        toast.success(`Created batch with ${valid.length} candidates`);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-bg text-xs font-black hover:bg-accent-soft">
        <Upload className="w-3.5 h-3.5" /> Bulk Hiring Wizard
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-[1.5rem] border border-border bg-surface p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" /> Bulk Screening Batch
              </h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-panel">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted">Paste CSV: name, email, title per line. Creates AIScreeningBatch with shared RoundSpecs + proctor tokens per session.</p>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Workspace</label>
              <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm">
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.slug})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Candidates CSV</label>
              <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs font-mono" placeholder="name, email, title" />
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="w-3 h-3" /> {valid.length} valid
                </span>
                {invalid > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-3 h-3" /> {invalid} invalid
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted hover:text-fg">
                Cancel
              </button>
              <button onClick={submit} disabled={isPending || valid.length === 0} className="px-5 py-2 rounded-xl bg-accent text-bg text-xs font-black hover:bg-accent-soft disabled:opacity-50">
                {isPending ? "Creating..." : `Create Batch (${valid.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
