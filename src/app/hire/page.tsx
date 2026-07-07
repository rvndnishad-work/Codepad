import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HomeHero from "../HomeHero";
import HomeInfographic from "../HomeInfographic";
import HomeRecruiterFeatures from "../HomeRecruiterFeatures";
import HomeFinalCTA from "../HomeFinalCTA";
import { RecruiterDemoCard } from "../HomeBento";
import TrustBand from "./TrustBand";
import PricingTeaser from "./PricingTeaser";
import HirePipeline from "./HirePipeline";

export const metadata: Metadata = {
  title: "Interviewpad for Hiring Teams — Technical Interviews, Take-Homes & AI Screening",
  description:
    "Run live coding interviews with replay, send server-graded take-home assignments, and screen candidates at scale with AI — with integrity signals on every attempt.",
  alternates: { canonical: "/hire" },
  openGraph: {
    title: "Interviewpad for Hiring Teams",
    description:
      "Live coding interviews, server-graded take-homes, and AI screening at batch scale — in one workspace.",
  },
};

/**
 * Recruiter-facing homepage. The developer homepage lives at `/`; the hero
 * toggle links between the two. Server-rendered end to end so the page is
 * fully crawlable and ad-targetable.
 */
export default async function HirePage() {
  const session = await auth().catch(() => null);

  // Real platform numbers for the proof strip — no invented stats.
  const [challengeCount, sessionCount, workspaceCount] = await Promise.all([
    prisma.challenge.count({ where: { published: true } }).catch(() => 0),
    prisma.interviewSession.count().catch(() => 0),
    prisma.workspace.count().catch(() => 0),
  ]);

  return (
    <div className="bg-bg min-h-screen">
      <HomeHero persona="recruiter" sessionName={session?.user?.name ?? null} />

      {/* Funnel-stage map: which feature earns its keep at which stage */}
      <HirePipeline />

      {/* Product glimpse: the live interview room mock + real platform numbers */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black text-fg tracking-tight">
            The interview room, <span className="text-indigo-400">as candidates see it.</span>
          </h2>
          <p className="text-muted text-base md:text-lg max-w-2xl mx-auto mt-3">
            Collaborative editor, live execution, and proctoring signals — all in the browser, nothing to install on either side.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <RecruiterDemoCard />
          <div className="md:col-span-4 grid grid-cols-1 gap-4">
            {buildStats({ sessionCount, challengeCount, workspaceCount }).map((s) => (
              <StatCard key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
        </div>
      </section>

      {/* Hiring lifecycle walkthrough (stage cards + live simulators) */}
      <HomeInfographic persona="recruiter" />

      {/* Deep feature sections with animated demos */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <HomeRecruiterFeatures />
        </div>
      </section>

      <TrustBand />

      <PricingTeaser />

      <HomeFinalCTA persona="recruiter" />
    </div>
  );
}

/**
 * Real usage numbers when they're worth bragging about; factual platform
 * capabilities otherwise. A young deployment must never render "0 sessions".
 */
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
  // Top up to exactly three cards.
  for (const c of capabilities) {
    if (stats.length >= 3) break;
    stats.push(c);
  }
  return stats.slice(0, 3);
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-border bg-panel p-6 flex flex-col justify-center">
      <div className="text-3xl font-black text-indigo-400 tabular-nums">{value}</div>
      <div className="text-xs text-muted font-bold uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) / 10}k+`;
  return `${n}`;
}
