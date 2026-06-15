"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Globe, Trash2 } from "lucide-react";
import { setExperienceStatus, deleteExperience } from "../actions";
import { resultClasses } from "@/lib/interview-questions/shared";

type Exp = {
  id: string;
  companyName: string | null;
  role: string | null;
  experienceLevel: string | null;
  location: string | null;
  year: number | null;
  result: string | null;
  process: string | null;
  rounds: string | null;
  tips: string | null;
  status: string;
};

export default function ExperienceModerationRow({ exp }: { exp: Exp }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  if (gone) return null;

  const act = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  return (
    <div className={`p-5 rounded-2xl border border-border bg-surface/40 space-y-3 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-extrabold text-sm">
            {exp.companyName ? `${exp.companyName} · ` : ""}{exp.role || "Candidate experience"}
          </div>
          <div className="text-[11px] text-muted mt-1">
            {[exp.experienceLevel, exp.location, exp.year].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {exp.result && <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${resultClasses(exp.result)}`}>{exp.result}</span>}
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-border text-muted">{exp.status}</span>
        </div>
      </div>

      {exp.process && <p className="text-xs text-fg/80 leading-relaxed"><span className="text-muted font-bold">Process: </span>{exp.process}</p>}
      {exp.rounds && <p className="text-xs text-fg/80 leading-relaxed"><span className="text-muted font-bold">Rounds: </span>{exp.rounds}</p>}
      {exp.tips && <p className="text-xs text-fg/80 leading-relaxed"><span className="text-muted font-bold">Tips: </span>{exp.tips}</p>}

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {exp.status !== "published" && (
          <button onClick={() => act(() => setExperienceStatus(exp.id, "published"))} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold hover:bg-emerald-500/20">
            <Globe className="w-3.5 h-3.5" /> Publish
          </button>
        )}
        {exp.status === "pending" && (
          <button onClick={() => act(() => setExperienceStatus(exp.id, "approved"))} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-muted hover:text-fg">
            <Check className="w-3.5 h-3.5" /> Approve
          </button>
        )}
        {exp.status !== "rejected" && (
          <button onClick={() => act(() => setExperienceStatus(exp.id, "rejected"))} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-muted hover:text-rose-500">
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => { if (confirm("Delete this experience permanently?")) act(async () => { await deleteExperience(exp.id); setGone(true); }); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-rose-500"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}
