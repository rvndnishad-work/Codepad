"use client";

import { useRouter } from "next/navigation";
import { DIFFICULTIES } from "@/lib/interview-questions/shared";

/** URL-driven filters for a technology page (difficulty chips + company/round selects). */
export default function TechFilters({
  tech,
  companies,
  rounds,
  current,
}: {
  tech: string;
  companies: { name: string; slug: string }[];
  rounds: string[];
  current: { difficulty: string; company: string; round: string };
}) {
  const router = useRouter();

  function navigate(next: Partial<typeof current>) {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    if (merged.difficulty) params.set("difficulty", merged.difficulty);
    if (merged.company) params.set("company", merged.company);
    if (merged.round) params.set("round", merged.round);
    const qs = params.toString();
    router.push(`/interview-questions/${tech}${qs ? `?${qs}` : ""}`);
  }

  const hasFilters = current.difficulty || current.company || current.round;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Difficulty chips */}
      <div className="flex items-center gap-1.5">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => navigate({ difficulty: current.difficulty === d ? "" : d })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition capitalize ${
              current.difficulty === d
                ? "border-accent text-accent bg-accent/10"
                : "border-border text-muted hover:text-fg"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {companies.length > 0 && (
        <select
          value={current.company}
          onChange={(e) => navigate({ company: e.target.value })}
          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border bg-surface text-fg focus:outline-none focus:border-accent/50"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      )}

      {rounds.length > 0 && (
        <select
          value={current.round}
          onChange={(e) => navigate({ round: e.target.value })}
          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border bg-surface text-fg focus:outline-none focus:border-accent/50"
        >
          <option value="">All rounds</option>
          {rounds.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      )}

      {hasFilters && (
        <button
          onClick={() => navigate({ difficulty: "", company: "", round: "" })}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-rose-500 transition"
        >
          Clear
        </button>
      )}
    </div>
  );
}
