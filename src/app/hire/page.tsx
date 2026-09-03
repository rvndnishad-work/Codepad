import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HomeHero from "../HomeHero";
import HomeInfographic from "../HomeInfographic";
import HomeRecruiterFeatures from "../HomeRecruiterFeatures";
import HomeFinalCTA from "../HomeFinalCTA";
import { RecruiterDemoCard } from "../RecruiterDemoCard";
import TrustBand from "./TrustBand";
import PricingTeaser from "./PricingTeaser";
import HirePipeline from "./HirePipeline";
import SectionHeading from "@/components/home/SectionHeading";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import { Video, ShieldCheck, Users, Bot, Award } from "lucide-react";
import ScrollProgressBar from "./ScrollProgressBar";

export const metadata: Metadata = {
  title: "Interviewpad for Hiring Teams — Technical Interviews, Take-Homes & AI Screening",
  description:
    "Run live coding interviews with replay, send server-graded take-homes, and screen candidates at scale with AI — with integrity signals on every attempt.",
  alternates: { canonical: "/hire" },
  openGraph: {
    title: "Interviewpad for Hiring Teams",
    description:
      "Live coding interviews, server-graded take-homes, and AI screening at batch scale — in one workspace.",
  },
};

export default async function HirePage() {
  const session = await auth().catch(() => null);
  const [challengeCount, sessionCount, workspaceCount] = await Promise.all([
    prisma.challenge.count({ where: { published: true } }).catch(() => 0),
    prisma.interviewSession.count().catch(() => 0),
    prisma.workspace.count().catch(() => 0),
  ]);

  const roomStats = buildStats({ sessionCount, challengeCount, workspaceCount });

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg">
      <ScrollProgressBar />

      <HomeHero persona="recruiter" sessionName={session?.user?.name ?? null} />

      {/* ── Status bar ──
             The platform's own readouts, set as metadata on one baseline and
             left-aligned against a hairline. It belongs to the hero above it,
             which is why it is not a centred row of badges. */}
      <section className="border-b border-border bg-panel/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3.5">
          <span className="ip-label ip-label-fg flex items-center gap-2">
            <span className="ip-live h-[5px] w-[5px] bg-emerald-500" aria-hidden />
            {workspaceCount}+ workspaces live
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
          <span className="ip-label">SOC 2 ready · AES-256</span>
          <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
          <span className="ip-label">8 languages · ~12 ms execution</span>
          <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
          <span className="ip-label">Capgemini · SakSoft · and more</span>
        </div>
      </section>

      <HirePipeline />

      {/* ── The live room ── */}
      <section className="border-b border-border py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading
            index="03"
            tone="secondary"
            eyebrow="Live interview room"
            eyebrowIcon={<Video className="h-3 w-3" />}
            title="The interview room,"
            highlight="as candidates see it."
            lede="Collaborative editor, live execution and integrity signals — in the browser, with nothing to install on either side. Your team watches, replays and scores."
          />

          <RevealOnScroll className="ip-frame grid grid-cols-1 gap-px bg-border md:grid-cols-12">
            <div className="bg-surface md:col-span-8">
              <RecruiterDemoCard />
            </div>
            <div className="grid grid-cols-1 gap-px bg-border md:col-span-4">
              {roomStats.map((s) => (
                <div key={s.label} className="flex flex-col justify-center gap-2.5 bg-surface p-6">
                  <span className="ip-label ip-label-secondary flex items-center gap-2">
                    <span className="h-[5px] w-[5px] bg-secondary" aria-hidden />
                    Live metric
                  </span>
                  <span className="ip-nums text-3xl font-bold leading-none text-fg">
                    {s.value}
                  </span>
                  <span className="text-[12px] leading-snug text-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </RevealOnScroll>

          {/* Capability strip — same ruled construction, tighter rhythm. */}
          <RevealOnScroll className="ip-frame mt-5 grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
            {[
              { icon: Users, label: "Live cursors", desc: "See who types what, and when" },
              { icon: Bot, label: "AI co-pilot", desc: "Suggests follow-ups mid-session" },
              { icon: ShieldCheck, label: "Replay + signals", desc: "Paste, blur, keystroke timeline" },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3 bg-surface p-5">
                <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
                <div>
                  <div className="ip-label ip-label-fg">{f.label}</div>
                  <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{f.desc}</div>
                </div>
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* ── The hiring lifecycle ── */}
      <div className="border-b border-border bg-panel/30">
        <HomeInfographic persona="recruiter" />
      </div>

      {/* ── Why teams switch ──
             One clause, not two. This used to open with its own heading and
             then hand straight to HomeRecruiterFeatures' 05.1 sub-heading with
             nothing in between, so the page showed two stacked titles and a
             gap. The feature run carries the whole section now. */}
      <section className="border-b border-border py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <HomeRecruiterFeatures />
          </div>
        </div>
      </section>

      <TrustBand />

      {/* ── The record ──
             This slot used to hold a testimonial that was invented: a quote,
             a "Series B SaaS" engineering manager, and a stock face fetched
             live from pravatar.cc, presented as a real customer. On a page
             whose entire argument is "decide on evidence", fabricated proof
             is the one thing that cannot be here. It is replaced with what
             the product genuinely leaves behind after an attempt — every line
             below maps to a shipped mechanism. When there IS a real customer
             quote, this is the slot for it. */}
      <section className="border-b border-border py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading
            index="07"
            tone="secondary"
            eyebrow="The record"
            eyebrowIcon={<Award className="h-3 w-3" />}
            title="What you are left with,"
            highlight="per candidate."
            lede="A hiring decision is easy to make and hard to defend three months later. Every attempt closes into one record your team can reopen — and hand to the person who asks why."
          />

          <RevealOnScroll className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
            <RevealItem className="lg:col-span-7">
              <div className="ip-frame">
                {RECORD.map((row, i) => (
                  <div
                    key={row.label}
                    className={`flex flex-col gap-1.5 px-6 py-5 sm:flex-row sm:items-baseline sm:gap-6 ${
                      i > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <span className="ip-label ip-label-secondary shrink-0 sm:w-40">
                      {row.label}
                    </span>
                    <span className="text-[13.5px] leading-relaxed text-muted">{row.body}</span>
                  </div>
                ))}
              </div>
            </RevealItem>

            <RevealItem className="flex flex-col justify-between gap-6 lg:col-span-5">
              <blockquote className="border-l-2 border-secondary pl-6">
                <p className="ip-display ip-display-md text-fg">
                  The candidate keeps the work. You keep the reasoning.
                </p>
              </blockquote>
              <p className="pl-6 text-[13px] leading-relaxed text-subtle">
                Records stay in the workspace under its retention policy, are written to an
                append-only audit log, and travel to Greenhouse, Lever or Ashby with the verdict
                attached.
              </p>
            </RevealItem>
          </RevealOnScroll>
        </div>
      </section>

      <PricingTeaser />

      <HomeFinalCTA persona="recruiter" />
    </div>
  );
}

/**
 * What a finished attempt actually leaves behind. Every row maps to a shipped
 * mechanism — keep it that way, the same rule TrustBand is held to.
 */
const RECORD: { label: string; body: string }[] = [
  {
    label: "The attempt",
    body: "Every keystroke, run and submission on a timeline you can scrub — not a final diff with no history behind it.",
  },
  {
    label: "The result",
    body: "Hidden tests executed on our servers in the candidate's language, with the pass/fail matrix that produced the score.",
  },
  {
    label: "The signals",
    body: "Tab switches, clipboard events and timing anomalies, disclosed to the candidate and presented for a human to read.",
  },
  {
    label: "The judgement",
    body: "Rubric scores per dimension from whoever sat in, side by side, so a panel disagreement is visible instead of averaged away.",
  },
];

function buildStats(counts: {
  sessionCount: number;
  challengeCount: number;
  workspaceCount: number;
}): { value: string; label: string }[] {
  const stats: { value: string; label: string }[] = [];
  if (counts.sessionCount >= 50)
    stats.push({ value: formatCount(counts.sessionCount), label: "Interview sessions run" });
  if (counts.challengeCount >= 10)
    stats.push({ value: formatCount(counts.challengeCount), label: "Curated challenges ready to assign" });
  if (counts.workspaceCount >= 25)
    stats.push({ value: formatCount(counts.workspaceCount), label: "Hiring workspaces" });

  const capabilities = [
    { value: "8", label: "Execution languages, server-graded" },
    { value: "3", label: "ATS integrations: Greenhouse, Lever, Ashby" },
    { value: "100%", label: "Attempts captured with replay + integrity signals" },
  ];
  for (const c of capabilities) {
    if (stats.length >= 3) break;
    stats.push(c);
  }
  return stats.slice(0, 3);
}

function formatCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) / 10}k+`;
  return `${n}`;
}
