"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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

/** Client-side instant company filter (name/industry/role) + responsive grid.
 *  Filtering animates with layout transitions; cards rise in on scroll. */
export default function CompanyGrid({ companies }: { companies: CompanyCard[] }) {
  const [q, setQ] = useState("");
  const reduceMotion = useReducedMotion();

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
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter companies…"
          className="w-full pl-10 pr-3 py-2.5 rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-card)] text-sm text-[var(--wow-fg)] backdrop-blur-sm focus:outline-none focus:border-[#8b93ff]/60 focus:shadow-[0_0_30px_-10px_rgba(139,147,255,0.5)] transition placeholder:text-muted"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No companies match “{q}”.</p>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
          {filtered.map((c, i) => (
            <motion.div
              key={c.slug}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.45, delay: reduceMotion ? 0 : (i % 3) * 0.07, ease: "easeOut" }}
            >
            <Link
              href={`/interview-questions/company/${c.slug}`}
              className="group flex h-full flex-col p-5 rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] backdrop-blur-sm hover:border-[#8b93ff]/50 hover:shadow-[0_18px_50px_-20px_rgba(139,147,255,0.45)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-xl bg-bg border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {c.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo} alt={c.name} className="w-full h-full object-contain" loading="lazy" />
                  ) : (
                    <span className="text-lg font-black wow-gradient-text">{c.name[0]}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold truncate text-[var(--wow-fg)] group-hover:text-[#8b93ff] transition-colors">{c.name}</div>
                  {c.industry && <div className="text-[11px] text-muted truncate">{c.industry}</div>}
                </div>
                <span className="font-mono text-[10px] text-muted/50 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
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
                  <div className="flex gap-3 mt-1.5 text-[11px] text-muted">
                    <span className="text-emerald-800 dark:text-emerald-400">{c.easy} easy</span>
                    <span className="text-amber-800 dark:text-amber-400">{c.medium} med</span>
                    <span className="text-rose-700 dark:text-rose-400">{c.hard} hard</span>
                  </div>
                </div>
              )}
            </Link>
            </motion.div>
          ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
