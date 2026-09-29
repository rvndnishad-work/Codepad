"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { compactNumber } from "@/lib/interview-questions/shared";
import { difficultyKey } from "@/lib/interview-questions/topic-catalog";
import type { Heading } from "@/lib/interview-questions/reading";
import { TopicLogo } from "@/app/interview-questions/_components/TopicLogo";
import { DIFFICULTY_BG, DifficultyLabel } from "@/app/interview-questions/_components/Difficulty";
import { scrollToSection, useActiveSection } from "./useActiveSection";
import { STICKY_OFFSET, type SuggestionItem, type TrackPosition } from "./types";

const card = "rounded-2xl border border-border bg-surface p-5";
const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/** Topic, where this question sits in it, and a way back to the list. */
export function TopicCard({
  tech,
  techName,
  color,
  track,
}: {
  tech: string;
  techName: string;
  color: string;
  track: TrackPosition | null;
}) {
  const reduce = useReducedMotion();
  const pct = track && track.total > 0 ? ((track.index + 1) / track.total) * 100 : 0;
  return (
    <Link
      href={`/interview-questions/${tech}`}
      className={`${card} qa-row group block hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      <div className="flex items-center gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: tint(color, 14) }}>
          <TopicLogo slug={tech} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-fg">{techName}</p>
          {track && (
            <p className="text-[13px] text-subtle">
              Question <span className="tabular-nums">{track.index + 1}</span> of <span className="tabular-nums">{track.total}</span>
            </p>
          )}
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-subtle transition-colors group-hover:text-fg" aria-hidden />
      </div>
      {track && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-panel" aria-hidden>
          <motion.div
            className="h-full rounded-full"
            style={{ background: color, originX: 0 }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: pct / 100 }}
            viewport={{ once: true }}
            transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
          />
        </div>
      )}
    </Link>
  );
}

/** Difficulty, round, company, years asked and views as a short definition list. */
export function DetailsCard({
  difficulty,
  round,
  company,
  years,
  views,
}: {
  difficulty: string;
  round: string | null;
  company: { name: string; slug: string } | null;
  years: number[];
  views: number;
}) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Difficulty", value: <DifficultyLabel difficulty={difficulty} /> },
    ...(round ? [{ label: "Round", value: round }] : []),
    ...(company
      ? [
          {
            label: "Asked at",
            value: (
              <Link href={`/interview-questions/company/${company.slug}`} className="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg">
                {company.name}
              </Link>
            ),
          },
        ]
      : []),
    ...(years.length ? [{ label: "Years", value: years.slice(0, 4).join(", ") }] : []),
    { label: "Views", value: <span className="tabular-nums">{compactNumber(views)}</span> },
  ];
  return (
    <div className={card}>
      <h2 className="text-sm font-semibold text-fg">Details</h2>
      <dl className="mt-3 divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 py-2.5 text-sm first:pt-1 last:pb-0">
            <dt className="text-subtle">{r.label}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-muted">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A short list of other questions, each with its difficulty. */
export function RelatedCard({ title, items, more }: { title: string; items: SuggestionItem[]; more?: { href: string; label: string } }) {
  return (
    <div className={`${card} px-2.5 pb-2.5`}>
      <h2 className="px-2.5 text-sm font-semibold text-fg">{title}</h2>
      <ul className="mt-2">
        {items.map((it) => (
          <li key={it.slug}>
            <Link
              href={`/interview-question/${it.slug}`}
              className="qa-row flex items-start gap-3 rounded-xl px-2.5 py-2.5 hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
            >
              <span
                className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${DIFFICULTY_BG[difficultyKey(it.difficulty)]}`}
                title={it.difficulty}
                aria-hidden
              />
              <span className="qa-title line-clamp-2 min-w-0 flex-1 text-sm leading-snug text-muted">{it.title}</span>
              <ArrowRight className="qa-go mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {more && (
        <Link
          href={more.href}
          className="mx-2.5 mt-1 flex h-9 items-center gap-1.5 text-[13px] font-medium text-subtle transition-colors hover:text-fg"
        >
          {more.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/** "On this page": the answer's sections, following along as you read. */
export function Contents({ headings }: { headings: Heading[] }) {
  const active = useActiveSection(
    headings.map((h) => h.id),
    STICKY_OFFSET + 24,
  );
  return (
    <nav aria-label="Solution contents" className="qa-toc">
      <h2 className="text-sm font-semibold text-fg">On this page</h2>
      <ol className="mt-3 max-h-[calc(100vh-280px)] space-y-px overflow-y-auto border-l border-border [scrollbar-width:thin]">
        {headings.map((h) => {
          const on = active === h.id;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                aria-current={on ? "location" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(h.id, STICKY_OFFSET);
                }}
                className={`-ml-px block border-l-2 py-1.5 pl-3.5 pr-1 text-[13px] leading-snug ${
                  on ? "border-accent font-medium text-fg" : "border-transparent text-subtle hover:border-border-strong hover:text-muted"
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
