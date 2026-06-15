"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { saveCompany, deleteCompany } from "../actions";

export type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  website: string;
  industry: string;
  hiringRoles: string;
  questionCount: number;
  experienceCount: number;
};

const field = "w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:border-accent/50";
const label = "text-[10px] font-black uppercase tracking-widest text-muted mb-1.5 block";

const blank: CompanyRow = {
  id: "", name: "", slug: "", logo: "", description: "", website: "", industry: "", hiringRoles: "",
  questionCount: 0, experienceCount: 0,
};

export default function CompanyManager({ companies }: { companies: CompanyRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CompanyRow | null>(null);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    const row = editing;
    start(async () => {
      await saveCompany({
        id: row.id || undefined,
        name: row.name,
        logo: row.logo,
        description: row.description,
        website: row.website,
        industry: row.industry,
        hiringRoles: row.hiringRoles.split(",").map((r) => r.trim()).filter(Boolean),
      });
      setEditing(null);
      router.refresh();
    });
  }

  const setE = (k: keyof CompanyRow) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEditing((p) => (p ? { ...p, [k]: e.target.value } : p));

  return (
    <div className="space-y-5">
      <button
        onClick={() => setEditing({ ...blank })}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft"
      >
        <Plus className="w-4 h-4" /> Add company
      </button>

      {editing && (
        <form onSubmit={save} className="p-5 rounded-2xl border border-accent/30 bg-surface/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">{editing.id ? "Edit company" : "New company"}</h3>
            <button type="button" onClick={() => setEditing(null)} className="text-muted hover:text-fg"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label}>Name *</label><input value={editing.name} onChange={setE("name")} className={field} /></div>
            <div><label className={label}>Industry</label><input value={editing.industry} onChange={setE("industry")} className={field} /></div>
            <div><label className={label}>Website</label><input value={editing.website} onChange={setE("website")} className={field} placeholder="https://…" /></div>
            <div><label className={label}>Logo URL</label><input value={editing.logo} onChange={setE("logo")} className={field} /></div>
          </div>
          <div><label className={label}>Description</label><textarea value={editing.description} onChange={setE("description")} rows={2} className={field} /></div>
          <div><label className={label}>Frequently asked roles (comma separated)</label><input value={editing.hiringRoles} onChange={setE("hiringRoles")} className={field} placeholder="SDE, Frontend Engineer" /></div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-border text-sm font-bold text-muted">Cancel</button>
            <button disabled={pending} className="px-4 py-2 rounded-lg bg-accent text-bg text-sm font-black uppercase tracking-wider disabled:opacity-60">{pending ? "Saving…" : "Save"}</button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg/50 text-[10px] font-black uppercase tracking-wider text-muted">
            <tr>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3 hidden sm:table-cell">Questions</th>
              <th className="text-left p-3 hidden sm:table-cell">Experiences</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {companies.map((c) => (
              <tr key={c.id} className="hover:bg-bg/30">
                <td className="p-3">
                  <div className="font-bold">{c.name}</div>
                  <div className="text-[11px] text-muted">/{c.slug}</div>
                </td>
                <td className="p-3 hidden sm:table-cell text-muted">{c.questionCount}</td>
                <td className="p-3 hidden sm:table-cell text-muted">{c.experienceCount}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => setEditing(c)} className="p-1.5 rounded-md hover:bg-bg text-muted hover:text-accent" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={() => {
                        if (!confirm(`Delete ${c.name}? Its questions/experiences will be unlinked.`)) return;
                        start(async () => { await deleteCompany(c.id); router.refresh(); });
                      }}
                      className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted hover:text-rose-500" title="Delete"
                    ><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted">No companies yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
