"use client";

import { useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import PipelineBoard from "@/components/home/PipelineBoard";
import SignalStrip, {
  CANDIDATE_STAGES,
  RECRUITER_STAGES,
} from "@/components/home/SignalStrip";

// The runnable editor pulls CodeMirror — keep it out of the critical path so
// the hero copy + CTAs paint first.
const HeroRunner = dynamic(() => import("@/components/home/HeroRunner"), {
  ssr: false,
  loading: () => (
    <div className="ip-on-dark ip-frame flex h-[420px] items-center justify-center border-white/10 bg-[#0b0d12]">
      <span className="ip-label text-subtle">Loading sandbox…</span>
    </div>
  ),
});

export type HeroPersona = "candidate" | "recruiter";

/**
 * THE HERO.
 *
 * Explicitly not the two-column "headline left / illustration right" shape.
 * The composition is a spec sheet:
 *
 *   ── a full-width METADATA BAR pinned to the top of the page, carrying the
 *      persona switch as plain ruled text rather than a pill toggle;
 *   ── an EDITORIAL COLUMN occupying six of twelve columns, set tight, with
 *      hand-placed line breaks and exactly one word carrying colour;
 *   ── the PRODUCT ITSELF pulled left so it crosses under the headline's
 *      column, and dropped lower than the copy, so the two blocks interlock
 *      instead of sitting side by side;
 *   ── the SIGNAL STRIP closing the column: the stages this product moves a
 *      person through, which is the same motif used everywhere else.
 *
 * Background is a faint column register — the page's own grid made visible —
 * not a glow, blob or gradient wash. No parallax, no tilt, no glare: the one
 * thing that moves is the caret and the live markers, because those mean
 * something.
 *
 * Persona is URL-driven: `/` renders the developer hero, `/hire` the recruiter
 * hero. The toggle is plain links — both pages are crawlable and linkable.
 */
export default function HomeHero({
  persona,
  sessionName,
  recentSnippet,
}: {
  persona: HeroPersona;
  sessionName?: string | null;
  snippetCount?: number;
  recentSnippet?: { slug: string; title: string; template: string } | null;
}) {
  const isRecruiter = persona === "recruiter";

  // Remember the visitor's last-used side so the header/login flows can
  // deep-link sensibly. Purely an enhancement — nothing renders off it.
  useEffect(() => {
    try {
      localStorage.setItem("ipad.persona", persona);
    } catch {
      /* private mode */
    }
  }, [persona]);

  return (
    <section className="relative overflow-hidden border-b border-border bg-bg">
      {/* ── Background register: eight vertical column rules, nothing else.
             It should read as ruled paper, not as decoration. ── */}
      <div
        aria-hidden
        className="ip-columns pointer-events-none absolute inset-0 hidden lg:block"
      />

      {/* ── Metadata bar ── */}
      <div className="relative border-b border-border">
        <div className="mx-auto flex max-w-7xl items-stretch justify-between px-4">
          <div className="hidden items-center gap-3 py-3 md:flex">
            <span className="ip-label">Interviewpad</span>
            <span className="h-[5px] w-[5px] bg-accent" aria-hidden />
            <span className="ip-label">
              {isRecruiter ? "Hiring runtime" : "Interview runtime"}
            </span>
          </div>

          {/* Persona switch — segmented frame so it reads as a control, not
              metadata. Square, hairline, on-token — the active segment is
              filled with the persona colour (accent for devs, secondary for
              hiring). */}
          <nav aria-label="Choose your view" className="ml-auto flex items-center py-2 md:ml-0">
            <div className="flex border border-border bg-surface p-0.5">
              <PersonaLink href="/" label="Developers" active={!isRecruiter} tone="accent" />
              <PersonaLink href="/hire" label="Hiring teams" active={isRecruiter} tone="secondary" />
            </div>
          </nav>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* ══ Editorial column ══ */}
          <div className="relative z-10 pb-4 pt-14 md:pt-20 lg:col-span-6 lg:pb-20 lg:pr-16 xl:pr-24">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="ip-index">{isRecruiter ? "01 / HIRE" : "01 / PREP"}</span>
              <span className="ip-rule hidden w-10 sm:block" aria-hidden />
              <span className="ip-label">
                {isRecruiter ? "Evaluate at scale" : "Real sandbox, right here"}
              </span>
            </div>

            {/* Line breaks are set by hand. The headline is a composition, not
                a paragraph that happens to be large. */}
            <h1 className="ip-display ip-display-xl mt-7 text-fg">
              {isRecruiter ? (
                <>
                  See how candidates
                  <br />
                  actually{" "}
                  <span className="relative whitespace-nowrap text-secondary">
                    think
                    <span
                      aria-hidden
                      className="absolute bottom-[0.12em] left-0 h-[0.055em] w-full bg-secondary"
                    />
                  </span>
                  ,
                  <br />
                  not just what
                  <br />
                  they shipped.
                </>
              ) : (
                <>
                  Practice on the
                  <br />
                  same{" "}
                  <span className="relative whitespace-nowrap text-accent">
                    runtime
                    <span
                      aria-hidden
                      className="absolute bottom-[0.12em] left-0 h-[0.055em] w-full bg-accent"
                    />
                  </span>
                  <br />
                  you&apos;ll be
                  <br />
                  interviewed on.
                </>
              )}
            </h1>

            <p className="mt-7 max-w-[46ch] text-[15px] leading-relaxed text-muted md:text-base">
              {isRecruiter
                ? "Live coding interviews with replay, async take-homes graded on our servers, AI screening at batch scale, and integrity signals on every attempt — in one workspace."
                : "Hand-written question banks across 14 technologies, challenges that really execute in 8 languages, and an AI-readiness track. Everything you solve becomes a portfolio someone can open and run."}
            </p>

            {/* Two different shapes, so the hierarchy is legible before the
                labels are read: an ink block and a ruled box. */}
            <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              {isRecruiter ? (
                <>
                  <Link
                    href={sessionName ? "/dashboard" : "/login?next=/dashboard"}
                    className="ip-btn ip-btn-primary ip-btn-armed-secondary group"
                  >
                    {sessionName ? "Open your workspace" : "Create a workspace"}
                    <ArrowRight className="ip-arrow h-4 w-4" />
                  </Link>
                  <Link href="/pricing" className="ip-btn ip-btn-ghost">
                    See pricing
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/challenges" className="ip-btn ip-btn-primary group">
                    Start a challenge
                    <ArrowRight className="ip-arrow h-4 w-4" />
                  </Link>
                  <Link
                    href={recentSnippet ? `/play/${recentSnippet.slug}` : "/playgrounds"}
                    className="ip-btn ip-btn-ghost"
                  >
                    {recentSnippet ? "Resume sandbox" : "Open a playground"}
                  </Link>
                </>
              )}
            </div>

            {/* ── The motif: where this product takes you ── */}
            <div className="mt-12 hidden max-w-md lg:block">
              <div className="ip-rule mb-5" aria-hidden />
              <SignalStrip
                stages={isRecruiter ? RECRUITER_STAGES : CANDIDATE_STAGES}
                tone={isRecruiter ? "secondary" : "accent"}
              />
            </div>
          </div>

          {/* ══ Product column ══
               Pulled left so it crosses under the editorial column's measure,
               and pushed down so the two blocks interlock rather than sit
               side by side. The overlap is what makes the composition
               asymmetric; the panel's right edge stays inside the container
               because its Run control lives there and must not be cropped. */}
          <div className="relative pb-16 lg:col-span-6 lg:-ml-4 lg:mt-20 lg:pb-20 xl:-ml-8">
            {isRecruiter ? <PipelineBoard /> : <HeroRunner />}

            {/* One annotation, positioned like a callout on a spec drawing. */}
            <div className="mt-4 flex items-center gap-3">
              <span className="ip-rule w-8" aria-hidden />
              <span className="ip-label">
                {isRecruiter
                  ? "Live pipeline — a real workspace board"
                  : "Live sandbox — this actually executes"}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile placement of the motif, where the two columns stack. */}
        <div className="pb-12 lg:hidden">
          <div className="ip-rule mb-5" aria-hidden />
          <SignalStrip
            stages={isRecruiter ? RECRUITER_STAGES : CANDIDATE_STAGES}
            tone={isRecruiter ? "secondary" : "accent"}
          />
        </div>
      </div>
    </section>
  );
}

function PersonaLink({
  href,
  label,
  active,
  tone,
}: {
  href: string;
  label: string;
  active: boolean;
  tone: "accent" | "secondary";
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-1.5 px-4 py-1.5 transition-colors ${
        active
          ? tone === "secondary"
            ? "bg-secondary text-secondary-ink"
            : "bg-accent text-accent-ink"
          : "text-subtle hover:bg-panel hover:text-fg"
      }`}
    >
      {active && <span aria-hidden className="h-[5px] w-[5px] shrink-0 bg-current" />}
      <span className="ip-label" style={active ? { color: "inherit" } : undefined}>
        {label}
      </span>
    </Link>
  );
}
