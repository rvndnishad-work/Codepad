"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, FileText, Users } from "lucide-react";

export type CompanyCard = {
  name: string;
  slug: string;
  logo: string | null;
  industry: string | null;
  roles: string[];
  total: number;
  easy: number;
  medium: number;
  hard: number;
  experiences: number;
};

/** Client-side instant company filter (name/industry/role) + responsive grid. */
export default function CompanyGrid({ companies }: { companies: CompanyCard[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.industry ?? "").toLowerCase().includes(needle) ||
        c.roles.some((r) => r.toLowerCase().includes(needle)),
    );
  }, [q, companies]);

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter companies…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-surface/50 text-sm focus:outline-none focus:border-accent/50"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No companies match “{q}”.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Link
              key={c.slug}
              href={`/interview-questions/company/${c.slug}`}
              className="group p-5 rounded-2xl border border-border bg-surface/40 hover:border-accent/40 hover:bg-surface/70 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-bg border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {c.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo} alt={c.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-lg font-black text-accent">{c.name[0]}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold truncate group-hover:text-accent transition-colors">{c.name}</div>
                  {c.industry && <div className="text-[11px] text-muted truncate">{c.industry}</div>}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {c.total} questions
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {c.experiences} experiences
                </span>
              </div>

              {/* Difficulty distribution bar */}
              {c.total > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-border">
                    <div className="bg-emerald-500" style={{ width: `${(c.easy / c.total) * 100}%` }} />
                    <div className="bg-amber-500" style={{ width: `${(c.medium / c.total) * 100}%` }} />
                    <div className="bg-rose-500" style={{ width: `${(c.hard / c.total) * 100}%` }} />
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[10px] text-muted">
                    <span className="text-emerald-500">{c.easy} easy</span>
                    <span className="text-amber-500">{c.medium} med</span>
                    <span className="text-rose-500">{c.hard} hard</span>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
