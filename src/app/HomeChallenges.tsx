"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Layers, Sparkles, Target, Briefcase } from "lucide-react";
import HomeChallengesFlow from "./HomeChallengesFlow";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import { SpotlightGroup, SpotlightCard } from "@/components/scroll/SpotlightGroup";
import CountUp from "@/components/scroll/CountUp";
import { StatCard, DifficultyCard } from "@/components/stats/StatBlocks";

type Stats = {
  totalChallenges: number;
  easy: number;
  medium: number;
  hard: number;
  totalMinutes: number;
  interviewsRun: number;
};

// Round down to a nice number so we don't leak exact platform usage. Returns
// the numeric value only — the "+" suffix is appended at the rendering layer
// so the CountUp ticker animates a clean integer.
function roundedNumber(n: number) {
  if (n < 10) return n;
  const order = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.floor(n / order) * order;
}

export default function HomeChallenges({ stats }: { stats: Stats }) {
  const [persona, setPersona] = useState<"candidate" | "recruiter" | null>(null);

  useEffect(() => {
    // Initial load
    const saved = localStorage.getItem("ipad.persona");
    if (saved === "candidate" || saved === "recruiter") {
      setPersona(saved as "candidate" | "recruiter");
    }

    // Event listener for changes
    const handlePersonaChange = (e: Event) => {
      setPersona((e as CustomEvent).detail);
    };
    window.addEventListener("ipad-persona-change", handlePersonaChange);
    return () => window.removeEventListener("ipad-persona-change", handlePersonaChange);
  }, []);

  const isRecruiter = persona === "recruiter";

  // Calculate stats values (falling back to stubs if DB is empty)
  const totalChallenges = stats.totalChallenges > 0 ? stats.totalChallenges : 40;
  const totalMinutes = stats.totalMinutes > 0 ? stats.totalMinutes : 720;
  const interviewsRun = stats.interviewsRun > 0 ? stats.interviewsRun : 1200;
  const easy = stats.easy > 0 ? stats.easy : Math.round(totalChallenges * 0.45);
  const medium = stats.medium > 0 ? stats.medium : Math.round(totalChallenges * 0.4);
  const hard = stats.hard > 0 ? stats.hard : Math.max(1, totalChallenges - easy - medium);
  const diffTotal = Math.max(1, easy + medium + hard);
  const totalHours = Math.max(1, Math.round(totalMinutes / 60));

  return (
    <section className="bg-bg py-20 md:py-28 relative overflow-hidden">
      {/* Soft accent halo behind the headline */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[820px] h-[420px] bg-accent/5 rounded-full blur-[140px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 relative">
        {/* Headline — staggered reveal so eyebrow → title → subtext rise in sequence */}
        <RevealOnScroll className="text-center mb-12 md:mb-16" stagger={0.1}>
          <RevealItem>
            <div className={`inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] mb-4 px-3 py-1.5 rounded-full ${
              isRecruiter ? "text-indigo-400 bg-indigo-500/10" : "text-accent bg-accent/10"
            }`}>
              {isRecruiter ? <Briefcase className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isRecruiter ? "Assess · Evaluate · Hire" : "Practice · Interview · Hire"}
            </div>
          </RevealItem>
          <RevealItem>
            <h2 className="text-3xl md:text-5xl font-black text-fg tracking-tight leading-[1.05] max-w-3xl mx-auto">
              {isRecruiter ? (
                <>
                  Evaluate developers, <span className="text-indigo-400">automate reviews.</span>
                </>
              ) : (
                <>
                  Practice, prepare, <span className="text-accent">perform.</span>
                </>
              )}
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="text-muted text-base md:text-lg leading-relaxed mt-5 max-w-2xl mx-auto font-medium">
              {isRecruiter ? (
                "Deploy production-grade test cases that auto-grade on submission, review timelines of candidate keystrokes with proctoring alerts, and make hiring decisions instantly."
              ) : (
                "Interviewpad isn't just a sandbox. It's a complete interview engine — from curated coding challenges to live mock sessions you can run with anyone, anywhere."
              )}
            </p>
          </RevealItem>
        </RevealOnScroll>

        {/* Animated 3-step infographic */}
        <HomeChallengesFlow />

        {/* Live stats strip — spotlight glows track the cursor across all
            four cards as one light source. */}
        <SpotlightGroup className="mt-8">
          <RevealOnScroll
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            stagger={0.08}
          >
            {isRecruiter ? (
              <>
                <RevealItem>
                  <SpotlightCard className="rounded-2xl h-full">
                    <StatCard
                      tone="emerald"
                      icon={<Target className="w-5 h-5" />}
                      value="99.8%"
                      label="AI grading accuracy"
                    />
                  </SpotlightCard>
                </RevealItem>
                <RevealItem>
                  <SpotlightCard className="rounded-2xl h-full">
                    <StatCard
                      tone="amber"
                      icon={<Clock className="w-5 h-5" />}
                      value="4.2s"
                      label="Average time-to-grade"
                    />
                  </SpotlightCard>
                </RevealItem>
                <RevealItem>
                  <SpotlightCard className="rounded-2xl h-full">
                    <StatCard
                      tone="rose"
                      icon={<Sparkles className="w-5 h-5" />}
                      value="120h+"
                      label="Engineering hours saved"
                    />
                  </SpotlightCard>
                </RevealItem>
                <RevealItem>
                  <SpotlightCard className="rounded-2xl h-full">
                    <StatCard
                      tone="accent"
                      icon={<Layers className="w-5 h-5" />}
                      value={<CountUp value={roundedNumber(interviewsRun)} suffix="+" />}
                      label="Screenings completed"
                    />
                  </SpotlightCard>
                </RevealItem>
              </>
            ) : (
              <>
                <RevealItem>
                  <SpotlightCard className="rounded-2xl h-full">
                    <StatCard
                      tone="emerald"
                      icon={<Target className="w-5 h-5" />}
                      value={<CountUp value={totalChallenges} suffix="+" />}
                      label="Curated challenges"
                    />
                  </SpotlightCard>
                </RevealItem>
                <RevealItem>
                  <SpotlightCard className="rounded-2xl h-full">
                    <DifficultyCard easy={easy} medium={medium} hard={hard} total={diffTotal} />
                  </SpotlightCard>
                </RevealItem>
                <RevealItem>
                  <SpotlightCard className="rounded-2xl h-full">
                    <StatCard
                      tone="amber"
                      icon={<Clock className="w-5 h-5" />}
                      value={<CountUp value={totalHours} suffix="h+" />}
                      label="Of practice content"
                    />
                  </SpotlightCard>
                </RevealItem>
                <RevealItem>
                  <SpotlightCard className="rounded-2xl h-full">
                    <StatCard
                      tone="accent"
                      icon={<Layers className="w-5 h-5" />}
                      value={<CountUp value={roundedNumber(interviewsRun)} suffix="+" />}
                      label="Interview sessions run"
                    />
                  </SpotlightCard>
                </RevealItem>
              </>
            )}
          </RevealOnScroll>
        </SpotlightGroup>

        {/* Dual CTAs */}
        <RevealOnScroll
          className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center mt-10"
          stagger={0.08}
        >
          <RevealItem>
            <Link
              href={isRecruiter ? "/dashboard" : "/challenges"}
              className={`group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-bg transition-colors shadow-sm ${
                isRecruiter ? "bg-indigo-500 hover:bg-indigo-600" : "bg-accent hover:bg-accent-soft"
              }`}
            >
              {isRecruiter ? "Go to workspaces" : "Browse all challenges"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </RevealItem>
          <RevealItem>
            <Link
              href={isRecruiter ? "/dashboard" : "/interview/new"}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-panel hover:bg-elevated hover:border-border-strong text-fg font-black text-sm transition-colors"
            >
              {isRecruiter ? "Manage campaigns" : "Build your first interview"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </RevealItem>
        </RevealOnScroll>
      </div>
    </section>
  );
}
