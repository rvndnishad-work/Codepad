import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPricingConfig } from "@/lib/pricing-plans";
import "@/components/wow/wow.css";
import "@/components/home-wow/home-wow.css";
import HireWowHero, { type HeroStat } from "@/components/hire-wow/HireWowHero";
import HireWowFlood from "@/components/hire-wow/HireWowFlood";
import HireWowPipeline from "@/components/hire-wow/HireWowPipeline";
import HireWowRoom from "@/components/hire-wow/HireWowRoom";
import HireWowFeatures from "@/components/hire-wow/HireWowFeatures";
import HireWowEvidence from "@/components/hire-wow/HireWowEvidence";
import HireWowTrust from "@/components/hire-wow/HireWowTrust";
import HireWowFinal from "@/components/hire-wow/HireWowFinal";
import ScrollProgressBar from "./ScrollProgressBar";
import SpotlightScope from "@/components/wow/SpotlightScope";

export const metadata: Metadata = {
  title: "Screen 1,000 Applicants Without Reading 1,000 Resumes — Interviewpad for Hiring Teams",
  description:
    "One opening brings hundreds of applications. Send them all the same take-home or AI screening interview, let our servers grade every attempt with anti-cheat signals attached, and get a shortlist ranked by evidence instead of arrival order.",
  alternates: { canonical: "/hire" },
  openGraph: {
    title: "Rank every applicant, not just the first forty",
    description:
      "Server-graded take-homes, AI screening interviews and built-in anti-cheat turn an unreadable applicant pile into a ranked shortlist.",
  },
};

export default async function HirePage() {
  const session = await auth().catch(() => null);
  const [challengeCount, sessionCount, workspaceCount, pricing] = await Promise.all([
    prisma.challenge.count({ where: { published: true } }).catch(() => 0),
    prisma.interviewSession.count().catch(() => 0),
    prisma.workspace.count().catch(() => 0),
    getPricingConfig(),
  ]);

  const heroStats = buildStats({ sessionCount, challengeCount, workspaceCount });
  const ctaHref = session?.user ? "/dashboard" : "/login?next=/dashboard";

  return (
    <div className="wow-scope min-h-screen bg-bg transition-colors">
      <SpotlightScope />
      <ScrollProgressBar />

      <HireWowHero
        stats={heroStats}
        ctaHref={ctaHref}
        signedIn={!!session?.user}
      />

      <HireWowFlood />

      <HireWowPipeline />

      <HireWowRoom />

      <section className="bg-bg px-4 py-24 transition-colors md:py-32">
        <div className="mx-auto max-w-6xl">
          <HireWowFeatures />
        </div>
      </section>

      <HireWowEvidence />

      <HireWowTrust plans={pricing.business} />

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
}): HeroStat[] {
  const stats: HeroStat[] = [];
  if (counts.sessionCount >= 50)
    stats.push({ value: formatCount(counts.sessionCount), label: "Interview sessions run", live: true });
  if (counts.challengeCount >= 10)
    stats.push({ value: formatCount(counts.challengeCount), label: "Challenges ready to assign", live: true });
  if (counts.workspaceCount >= 25)
    stats.push({ value: formatCount(counts.workspaceCount), label: "Hiring workspaces", live: true });

  const capabilities = [
    { value: "8", label: "Languages, server-graded", live: false },
    { value: "3", label: "ATS integrations", live: false },
    { value: "100%", label: "Attempts kept as a replay", live: false },
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
