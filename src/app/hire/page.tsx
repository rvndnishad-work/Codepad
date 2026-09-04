import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import "@/components/wow/wow.css";
import "@/components/home-wow/home-wow.css";
import HireWowHero from "@/components/hire-wow/HireWowHero";
import HireWowPipeline from "@/components/hire-wow/HireWowPipeline";
import HireWowRoom from "@/components/hire-wow/HireWowRoom";
import HireWowRadar from "@/components/hire-wow/HireWowRadar";
import HireWowFeatures from "@/components/hire-wow/HireWowFeatures";
import HireWowDuel from "@/components/hire-wow/HireWowDuel";
import HireWowRecord from "@/components/hire-wow/HireWowRecord";
import HireWowTrust from "@/components/hire-wow/HireWowTrust";
import PricingTeaser from "./PricingTeaser";
import HireWowFinal from "@/components/hire-wow/HireWowFinal";
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
  const ctaHref = session?.user ? "/dashboard" : "/login?next=/dashboard";

  return (
    <div className="min-h-screen bg-[var(--wow-bg)] transition-colors">
      <ScrollProgressBar />

      <HireWowHero
        stats={{ workspaces: workspaceCount, sessions: sessionCount, challenges: challengeCount }}
        ctaHref={ctaHref}
        signedIn={!!session?.user}
      />

      <HireWowPipeline />

      <HireWowRoom roomStats={roomStats} />

      <HireWowRadar />

      {/* Six live feature demos, reskinned in boss mode — same behaviors. */}
      <section className="bg-[var(--wow-bg)] px-4 py-24 transition-colors md:py-32">
        <div className="mx-auto max-w-6xl">
          <HireWowFeatures />
        </div>
      </section>

      <HireWowDuel />

      <HireWowRecord />

      <HireWowTrust />

      <PricingTeaser />

      <HireWowFinal ctaHref={ctaHref} signedIn={!!session?.user} />
    </div>
  );
}

/**
 * Live platform metrics for the room section. DB-backed rows first (gated on
 * minimums so a fresh install never shows "3 sessions"), then capability
 * constants to always fill the strip of three.
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
