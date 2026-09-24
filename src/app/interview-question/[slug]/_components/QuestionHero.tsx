"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { Building2, Calendar, Check, ChevronRight, Clock, Eye, Keyboard, Layers, Link2 } from "lucide-react";
import { compactNumber } from "@/lib/interview-questions/shared";
import { titleParts } from "@/lib/interview-questions/reading";
import { difficultyKey } from "@/lib/interview-questions/topic-catalog";
import { DIFFICULTY_BG, DIFFICULTY_LABEL, DIFFICULTY_TEXT } from "@/app/interview-questions/_components/Difficulty";
import QuestionEngagement from "../QuestionEngagement";
import SaveButton from "../SaveButton";
import type { TrackPosition } from "./types";

const TechLogo3D = dynamic(() => import("@/app/interview-questions/[tech]/_wow/TechLogo3D"), { ssr: false });

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

const chip =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.05] px-3 text-[13px] font-medium text-white/75 backdrop-blur-md";

/**
 * The dark hero for one question: breadcrumb, the facts that matter before
 * reading (difficulty, round, company, when it was asked, reading time), the
 * title with its inline code, and the actions. The topic logo turns in 3D on
 * the right from lg.
 */
export default function QuestionHero({
  question,
  techName,
  color,
  years,
  minutes,
  track,
  saved,
  solved,
  onToggleSaved,
  onToggleSolved,
  onShowKeys,
}: {
  question: {
    slug: string;
    title: string;
    difficulty: string;
    technology: string | null;
    round: string | null;
    views: number;
    likes: number;
    company: { name: string; slug: string } | null;
  };
  techName: string | null;
  color: string;
  years: number[];
  minutes: number;
  track: TrackPosition | null;
  saved: boolean;
  solved: boolean;
  onToggleSaved: () => void;
  onToggleSolved: () => void;
  onShowKeys: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const d = difficultyKey(question.difficulty);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "expo.out" } })
        .from(".qh-line", { yPercent: 110, duration: 1, stagger: 0.08 })
        .from(".qh-fade", { y: 18, opacity: 0, duration: 0.7, stagger: 0.06 }, "-=0.7")
        .from(".qh-logo", { opacity: 0, scale: 0.9, duration: 1.1 }, "-=0.8");
    }, root);
    return () => ctx.revert();
  }, []);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href.split("#")[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  const ghost =
    "inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.06] px-4 text-sm font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/[0.1] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none";

  return (
    <header ref={root} data-dark-hero className="wow-noise relative -mt-16 overflow-hidden bg-[#08080f] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[8%] h-[440px] w-[520px] rounded-full blur-[130px]" style={{ background: tint(color, 16) }} />
        <div className="absolute -bottom-40 -left-24 h-[360px] w-[420px] rounded-full bg-accent-2/10 blur-[120px]" />
        <div className="wow-grid-bg absolute inset-0 [mask-image:linear-gradient(to_bottom,black_50%,transparent_96%)]" />
      </div>
      {/* Fades into the page so no edge shows where the hero ends. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-bg" />

      <div className="relative z-10 mx-auto max-w-[1180px] px-4 pb-12 pt-28 md:px-6 md:pb-14 md:pt-32">
        {question.technology && (
          <div aria-hidden className="qh-logo pointer-events-none absolute right-2 top-1/2 hidden h-[320px] w-[320px] -translate-y-[42%] lg:block xl:right-0">
            <TechLogo3D tech={question.technology} />
          </div>
        )}

        <nav aria-label="Breadcrumb" className="qh-fade flex min-w-0 items-center gap-1.5 text-[13px] text-white/55">
          <Link href="/interview-questions" className="shrink-0 transition-colors hover:text-white">
            Interview questions
          </Link>
          {question.technology && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden />
              <Link href={`/interview-questions/${question.technology}`} className="shrink-0 transition-colors hover:text-white">
                {techName}
              </Link>
            </>
          )}
          {track && (
            <>
              <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-white/30 sm:block" aria-hidden />
              <span className="hidden text-white/40 sm:inline">
                Question {track.index + 1} of {track.total}
              </span>
            </>
          )}
        </nav>

        <div className="qh-fade mt-6 flex flex-wrap items-center gap-2 lg:max-w-[calc(100%-340px)]">
          <span className={chip}>
            <span className={`h-1.5 w-1.5 rounded-full ${DIFFICULTY_BG[d]}`} aria-hidden />
            <span className={DIFFICULTY_TEXT[d]}>{DIFFICULTY_LABEL[d]}</span>
          </span>
          {question.round && (
            <span className={chip}>
              <Layers className="h-3.5 w-3.5 text-white/45" aria-hidden />
              {question.round}
            </span>
          )}
          {question.company && (
            <Link
              href={`/interview-questions/company/${question.company.slug}`}
              className={`${chip} transition-colors hover:border-white/30 hover:text-white`}
            >
              <Building2 className="h-3.5 w-3.5 text-white/45" aria-hidden />
              {question.company.name}
            </Link>
          )}
          {years.length > 0 && (
            <span className={chip}>
              <Calendar className="h-3.5 w-3.5 text-white/45" aria-hidden />
              Asked in {years.slice(0, 3).join(", ")}
            </span>
          )}
          <span className={chip}>
            <Clock className="h-3.5 w-3.5 text-white/45" aria-hidden />
            {minutes} min read
          </span>
        </div>

        <h1 className="mt-5 text-[30px] font-semibold leading-[1.15] tracking-[-0.025em] text-white [text-wrap:balance] sm:text-[38px] lg:max-w-[calc(100%-340px)] lg:text-[44px] lg:leading-[1.1]">
          <span className="block overflow-hidden pb-1">
            <span className="qh-line block">
              {titleParts(question.title).map((p, i) =>
                p.code ? (
                  <code
                    key={i}
                    className="mx-[0.06em] rounded-lg border border-white/[0.12] bg-white/[0.07] px-[0.28em] py-[0.02em] font-mono text-[0.82em] font-medium tracking-normal"
                  >
                    {p.text}
                  </code>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </span>
          </span>
        </h1>

        <p className="qh-fade mt-4 flex items-center gap-1.5 text-sm text-white/55">
          <Eye className="h-4 w-4 text-white/40" aria-hidden />
          {compactNumber(question.views)} views
          {solved && (
            <>
              <span aria-hidden className="mx-1.5 text-white/25">·</span>
              <span className="inline-flex items-center gap-1 font-medium text-success">
                <Check className="h-4 w-4" aria-hidden /> You solved this
              </span>
            </>
          )}
        </p>

        <div className="qh-fade mt-7 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleSolved}
            aria-pressed={solved}
            title="Shortcut: M"
            className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-[background-color,box-shadow,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
              solved
                ? "border border-success/40 bg-success/15 text-success hover:bg-success/20"
                : "bg-white text-[#0b0d12] hover:-translate-y-px hover:shadow-[0_12px_30px_-12px_rgba(255,255,255,0.45)] motion-reduce:hover:translate-y-0"
            }`}
          >
            <Check className="h-4 w-4" aria-hidden />
            {solved ? "Solved" : "Mark as solved"}
          </button>
          <SaveButton
            question={{
              slug: question.slug,
              title: question.title,
              difficulty: question.difficulty,
              technology: question.technology,
              company: question.company?.name ?? null,
            }}
            saved={saved}
            onClick={onToggleSaved}
            tone="dark"
          />
          <QuestionEngagement slug={question.slug} initialLikes={question.likes} tone="dark" />
          <button type="button" onClick={share} className={ghost}>
            {copied ? <Check className="h-4 w-4 text-success" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
            {copied ? "Link copied" : "Share"}
          </button>
          <button type="button" onClick={onShowKeys} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" className={`${ghost} hidden w-11 justify-center px-0 md:inline-flex`}>
            <Keyboard className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
