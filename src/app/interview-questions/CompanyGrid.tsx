"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, ArrowUpRight } from "lucide-react";
import { plural } from "@/lib/interview-questions/topic-catalog";
import { DifficultyBar } from "./_components/Difficulty";

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

/** "Browse by company": instant filter (name, industry, role) and one card per company. */
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
    <div className="flex flex-col gap-4 md:gap-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-fg md:text-[30px] md:leading-[1.15]">
            Browse by company
          </h2>
          <p className="text-sm text-subtle md:text-[15px]">
            Questions and first-hand interview experiences, grouped by the company that asked them.
          </p>
        </div>
        <label className="flex h-11 w-full shrink-0 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgb(var(--c-accent)/0.18)] motion-reduce:transition-none lg:h-[42px] lg:w-[320px]">
          <Search className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
          <span className="sr-only">Search companies</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search companies"
            className="h-full w-full min-w-0 bg-transparent text-sm text-fg placeholder:text-subtle focus:outline-none"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-subtle">No companies match “{q}”.</p>
      ) : (
        <motion.div layout={!reduceMotion} className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((c, i) => {
              const counts = `${c.total ? plural(c.total, "question") : "No questions yet"} · ${plural(c.experiences, "experience")}`;
              return (
                <motion.div
                  key={c.slug}
                  layout={!reduceMotion}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: (i % 4) * 0.06, ease: "easeOut" }}
                >
                  <Link
                    href={`/interview-questions/company/${c.slug}`}
                    className="iq-card flex h-[72px] items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 hover:border-border-strong hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-[132px] sm:flex-col sm:items-stretch sm:gap-0 sm:p-5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none sm:gap-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-panel text-lg font-bold text-fg sm:h-11 sm:w-11">
                        {c.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.logo} alt="" className="h-full w-full object-contain" loading="lazy" />
                        ) : (
                          c.name[0]
                        )}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <h3 className="iq-name truncate text-[15px] font-semibold text-fg sm:text-base">{c.name}</h3>
                        <p className="truncate text-xs text-subtle sm:hidden">{counts}</p>
                        {c.industry && <p className="hidden truncate text-[13px] text-subtle sm:block">{c.industry}</p>}
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-subtle sm:hidden" aria-hidden />
                      <ArrowUpRight className="iq-go hidden h-[18px] w-[18px] shrink-0 text-muted sm:block" aria-hidden />
                    </div>
                    <div className="mt-auto hidden flex-col gap-2.5 sm:flex">
                      <span className="text-[13px] text-muted">{counts}</span>
                      <DifficultyBar easy={c.easy} medium={c.medium} hard={c.hard} delay={0.1 + (i % 4) * 0.06} />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
