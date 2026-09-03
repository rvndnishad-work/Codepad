"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Layers, Sparkles, Target, Briefcase } from "lucide-react";
import HomeChallengesFlow from "./HomeChallengesFlow";
import RevealOnScroll from "@/components/scroll/RevealOnScroll";
import CountUp from "@/components/scroll/CountUp";
import SectionHeading from "@/components/home/SectionHeading";
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

  const stat = (
    tone: "emerald" | "amber" | "accent" | "rose",
    icon: React.ReactNode,
    value: React.ReactNode,
    label: string
  ) => <StatCard tone={tone} icon={icon} value={value} label={label} />;

  return (
    <section className="relative border-b border-border py-20 md:py-28">
      <div className="relative mx-auto max-w-6xl px-4">
        <SectionHeading
          index="07"
          eyebrow={isRecruiter ? "Assess · Evaluate · Hire" : "Practice · Interview · Offer"}
          eyebrowIcon={
            isRecruiter ? <Briefcase className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />
          }
          tone={isRecruiter ? "secondary" : "accent"}
          title={isRecruiter ? "Evaluate developers," : "Practice, prepare,"}
          highlight={isRecruiter ? "automate the review." : "perform."}
          lede={
            isRecruiter
              ? "Production-grade test cases that auto-grade on submission, keystroke timelines with integrity alerts, and a decision you can defend."
              : "Interviewpad isn't a sandbox with a landing page. It's an interview engine — curated challenges, live mock sessions, and a record of everything you solved."
          }
        />

        {/* The three-step flow */}
        <HomeChallengesFlow />

        {/* Live readouts. Same ruled-sheet construction as the flow above —
            `[&>*]:border-0` lets the shared StatCard keep its own border when
            it is used standalone on /challenges while the sheet supplies the
            rules here. */}
        <RevealOnScroll className="ip-frame mt-5 grid grid-cols-2 gap-px bg-border [&>*]:border-0 md:grid-cols-4">
          {isRecruiter ? (
            <>
              {stat("emerald", <Target className="h-4 w-4" />, "Auto", "Server-side grading on submit")}
              {stat("amber", <Clock className="h-4 w-4" />, "Replay", "Full keystroke timelines")}
              {stat("rose", <Sparkles className="h-4 w-4" />, "Signals", "Integrity & proctoring alerts")}
              {stat(
                "accent",
                <Layers className="h-4 w-4" />,
                <CountUp value={roundedNumber(interviewsRun)} suffix="+" />,
                "Screenings completed"
              )}
            </>
          ) : (
            <>
              {stat(
                "emerald",
                <Target className="h-4 w-4" />,
                <CountUp value={totalChallenges} suffix="+" />,
                "Curated challenges"
              )}
              <DifficultyCard easy={easy} medium={medium} hard={hard} total={diffTotal} />
              {stat(
                "amber",
                <Clock className="h-4 w-4" />,
                <CountUp value={totalHours} suffix="h+" />,
                "Hours of practice content"
              )}
              {stat(
                "accent",
                <Layers className="h-4 w-4" />,
                <CountUp value={roundedNumber(interviewsRun)} suffix="+" />,
                "Interview sessions run"
              )}
            </>
          )}
        </RevealOnScroll>

        <RevealOnScroll className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link
            href={isRecruiter ? "/dashboard" : "/challenges"}
            className={`ip-btn ip-btn-primary group ${isRecruiter ? "ip-btn-armed-secondary" : ""}`}
          >
            {isRecruiter ? "Go to workspaces" : "Browse all challenges"}
            <ArrowRight className="ip-arrow h-4 w-4" />
          </Link>
          <Link
            href={isRecruiter ? "/dashboard" : "/interview/new"}
            className="ip-btn ip-btn-ghost"
          >
            {isRecruiter ? "Manage campaigns" : "Build your first interview"}
          </Link>
        </RevealOnScroll>
      </div>
    </section>
  );
}
