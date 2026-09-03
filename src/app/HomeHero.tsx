"use client";

import { useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
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
      <span className="ip-label ip-label-xs text-slate-500">Loading sandbox…</span>
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

          {/* Persona switch — two ruled destinations, not a pill toggle. The
              active one is marked by a rule that meets the bar's border. */}
          <nav aria-label="Choose your view" className="flex items-stretch">
            <PersonaLink href="/" label="Developers" active={!isRecruiter} tone="accent" />
            <PersonaLink href="/hire" label="Hiring teams" active={isRecruiter} tone="secondary" />
          </nav>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* ══ Editorial column ══ */}
          <div className="relative z-10 pb-4 pt-14 md:pt-20 lg:col-span-6 lg:pb-28 lg:pr-12">
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
                      className="absolute -bottom-1 left-0 h-[3px] w-full bg-secondary"
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
                      className="absolute -bottom-1 left-0 h-[3px] w-full bg-accent"
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
                : "Hand-written question banks across 14 technologies, runnable challenges in eight languages, and an AI-readiness track — then a portfolio that shows the work, not a claim about it."}
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
          <div className="relative pb-16 lg:col-span-6 lg:-ml-16 lg:mt-24 lg:pb-24 xl:-ml-24">
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
      className={`group relative flex items-center px-4 py-3 transition-colors ${
        active ? "text-fg" : "text-subtle hover:text-fg"
      }`}
    >
      <span className="ip-label" style={active ? { color: "inherit" } : undefined}>
        {label}
      </span>
      <span
        aria-hidden
        className={`absolute inset-x-3 -bottom-px h-px origin-left transition-transform duration-200 ${
          tone === "secondary" ? "bg-secondary" : "bg-accent"
        } ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
      />
    </Link>
  );
}

/**
 * The hiring-side product surface: a workspace pipeline board rendered with
 * the site's own structural vocabulary. It replaces the previous abstract 3D
 * funnel because a funnel of floating rings is decoration — this shows the
 * thing recruiters actually look at, with real stage names and real signals.
 */
function PipelineBoard() {
  const COLUMNS: {
    stage: string;
    count: number;
    rows: { name: string; meta: string; state?: "pass" | "flag" | "run" }[];
  }[] = [
    {
      stage: "Screened",
      count: 24,
      rows: [
        { name: "A. Okafor", meta: "AI screen · 8.4", state: "pass" },
        { name: "M. Iyer", meta: "AI screen · 7.9", state: "pass" },
        { name: "J. Park", meta: "AI screen · 6.1" },
      ],
    },
    {
      stage: "Challenge",
      count: 9,
      rows: [
        { name: "R. Novak", meta: "12/12 tests · 41m", state: "pass" },
        { name: "S. Haddad", meta: "running · 04:12", state: "run" },
        { name: "T. Lund", meta: "paste burst ×3", state: "flag" },
      ],
    },
    {
      stage: "Interview",
      count: 4,
      rows: [
        { name: "C. Mbeki", meta: "replay · 58m", state: "pass" },
        { name: "D. Rossi", meta: "scheduled · Thu" },
      ],
    },
  ];

  return (
    <div className="ip-frame ip-ticks ip-ticks-secondary">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <span className="ip-label ip-label-xs">acme · engineering</span>
        <span className="ip-rule-soft h-px flex-1" aria-hidden />
        <span className="ip-label ip-label-xs flex items-center gap-1.5">
          <span className="ip-live h-[5px] w-[5px] bg-emerald-500" aria-hidden />
          37 active
        </span>
      </div>

      <div className="grid grid-cols-3">
        {COLUMNS.map((col, ci) => (
          <div key={col.stage} className={ci > 0 ? "border-l border-border" : ""}>
            <div className="flex items-baseline justify-between gap-1 border-b border-border px-3 py-2.5">
              <span className="ip-label ip-label-xs">{col.stage}</span>
              <span className="ip-nums font-mono text-[11px] text-fg">{col.count}</span>
            </div>
            <div className="flex flex-col">
              {col.rows.map((row) => (
                <div key={row.name} className="border-b border-border px-3 py-2.5 last:border-b-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className={`h-[5px] w-[5px] shrink-0 ${
                        row.state === "pass"
                          ? "bg-emerald-500"
                          : row.state === "flag"
                            ? "bg-accent"
                            : row.state === "run"
                              ? "ip-live bg-amber-500"
                              : "border border-border-strong"
                      }`}
                    />
                    <span className="truncate text-[12px] font-semibold text-fg">{row.name}</span>
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-subtle">{row.meta}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className="ip-label ip-label-xs">Integrity signals on</span>
        <span className="ip-label ip-label-xs ip-label-secondary">Evidence, not vibes</span>
      </div>
    </div>
  );
}
