"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { EXPERIENCE_LEVELS, DIFFICULTIES } from "@/lib/interview-questions/shared";

const field = "w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:border-accent/50";
const label = "text-[10px] font-black uppercase tracking-widest text-muted mb-1.5 block";

export default function ShareForm() {
  const [f, setF] = useState({
    company: "", role: "", experienceLevel: "", location: "", year: "",
    process: "", rounds: "", result: "", difficulty: "", tips: "",
  });
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.company.trim()) {
      setError("Company is required.");
      setFieldErrors({ company: ["Company name is required"] });
      return;
    }
    setError(null);
    setFieldErrors({});
    setState("saving");
    try {
      const res = await fetch("/api/interview-questions/experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: f.company,
          role: f.role || null,
          experienceLevel: f.experienceLevel || null,
          location: f.location || null,
          year: f.year ? parseInt(f.year, 10) : null,
          process: f.process || null,
          rounds: f.rounds || null,
          result: f.result || null,
          difficulty: f.difficulty || null,
          tips: f.tips || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.error && data.error.fieldErrors) {
          setFieldErrors(data.error.fieldErrors);
          throw new Error("Please correct the validation errors highlighted below.");
        }
        throw new Error("Submission failed. Please check your inputs.");
      }
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
        <h2 className="text-lg font-extrabold mt-3">Thanks for sharing!</h2>
        <p className="text-sm text-muted mt-1.5 max-w-md mx-auto">
          Your experience has been submitted for review. Once approved it&apos;ll appear on the company page to help other candidates.
        </p>
        <Link href="/interview-questions" className="inline-block mt-5 text-sm font-bold text-accent hover:underline">
          Back to Interview Questions →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 max-w-2xl">
      {error && <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Company *</label>
          <input value={f.company} onChange={set("company")} className={field} placeholder="Google" />
          {fieldErrors.company && (
            <p className="text-[11px] text-rose-500 mt-1 font-bold">{fieldErrors.company.join(", ")}</p>
          )}
        </div>
        <div>
          <label className={label}>Role</label>
          <input value={f.role} onChange={set("role")} className={field} placeholder="Software Engineer" />
          {fieldErrors.role && (
            <p className="text-[11px] text-rose-500 mt-1 font-bold">{fieldErrors.role.join(", ")}</p>
          )}
        </div>
        <div>
          <label className={label}>Experience level</label>
          <select value={f.experienceLevel} onChange={set("experienceLevel")} className={field}>
            <option value="">— Select —</option>
            {EXPERIENCE_LEVELS.map((e) => <option key={e.slug} value={e.slug}>{e.label}</option>)}
          </select>
          {fieldErrors.experienceLevel && (
            <p className="text-[11px] text-rose-500 mt-1 font-bold">{fieldErrors.experienceLevel.join(", ")}</p>
          )}
        </div>
        <div>
          <label className={label}>Location</label>
          <input value={f.location} onChange={set("location")} className={field} placeholder="Bangalore / Remote" />
          {fieldErrors.location && (
            <p className="text-[11px] text-rose-500 mt-1 font-bold">{fieldErrors.location.join(", ")}</p>
          )}
        </div>
        <div>
          <label className={label}>Year</label>
          <input value={f.year} onChange={set("year")} className={field} placeholder="2024" inputMode="numeric" />
          {fieldErrors.year && (
            <p className="text-[11px] text-rose-500 mt-1 font-bold">{fieldErrors.year.join(", ")}</p>
          )}
        </div>
        <div>
          <label className={label}>Outcome</label>
          <select value={f.result} onChange={set("result")} className={field}>
            <option value="">— Select —</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Pending</option>
          </select>
          {fieldErrors.result && (
            <p className="text-[11px] text-rose-500 mt-1 font-bold">{fieldErrors.result.join(", ")}</p>
          )}
        </div>
      </div>

      <div>
        <label className={label}>Difficulty</label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => setF((p) => ({ ...p, difficulty: p.difficulty === d ? "" : d }))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border capitalize transition ${
                f.difficulty === d ? "border-accent text-accent bg-accent/10" : "border-border text-muted hover:text-fg"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        {fieldErrors.difficulty && (
          <p className="text-[11px] text-rose-500 mt-1 font-bold">{fieldErrors.difficulty.join(", ")}</p>
        )}
      </div>

      <div>
        <label className={label}>Interview process</label>
        <textarea value={f.process} onChange={set("process")} rows={3} className={field} placeholder="Recruiter screen → online assessment → 4 onsite rounds…" />
        {fieldErrors.process && (
          <p className="text-[11px] text-rose-500 mt-1 font-bold">{fieldErrors.process.join(", ")}</p>
        )}
      </div>
      <div>
        <label className={label}>Rounds & questions asked</label>
        <textarea value={f.rounds} onChange={set("rounds")} rows={3} className={field} placeholder="DSA: two-pointers, graphs. System design: rate limiter…" />
        {fieldErrors.rounds && (
          <p className="text-[11px] text-rose-500 mt-1 font-bold">{fieldErrors.rounds.join(", ")}</p>
        )}
      </div>
      <div>
        <label className={label}>Tips for future candidates</label>
        <textarea value={f.tips} onChange={set("tips")} rows={2} className={field} placeholder="Think out loud, clarify constraints…" />
        {fieldErrors.tips && (
          <p className="text-[11px] text-rose-500 mt-1 font-bold">{fieldErrors.tips.join(", ")}</p>
        )}
      </div>

      <button disabled={state === "saving"} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-bg text-sm font-black uppercase tracking-wider hover:bg-accent-soft disabled:opacity-60">
        {state === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {state === "saving" ? "Submitting…" : "Submit experience"}
      </button>
      <p className="text-[11px] text-muted">Submissions are reviewed before publishing. You can submit anonymously.</p>
    </form>
  );
}
