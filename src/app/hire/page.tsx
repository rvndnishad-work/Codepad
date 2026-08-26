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
import { Video, Sparkles, ShieldCheck, Zap, Users, BarChart3, Bot, Clock, Award } from "lucide-react";
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

  return (
    <div className="bg-bg min-h-screen overflow-x-hidden">
      {/* Scroll progress bar */}
      <ScrollProgressBar />
      
      {/* Hero - enhanced */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.04] via-transparent to-transparent pointer-events-none" />
        <HomeHero persona="recruiter" sessionName={session?.user?.name ?? null} />
      </div>

      {/* Social proof bar - animated */}
      <section className="relative border-y border-border/40 bg-surface/30 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/[0.03] to-transparent" />
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-wrap items-center justify-center gap-6 md:gap-10 text-xs">
          <span className="flex items-center gap-2 font-mono text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {workspaceCount}+ workspaces live
          </span>
          <span className="hidden sm:block w-px h-4 bg-border/60" />
          <span className="flex items-center gap-1.5 text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> SOC 2 ready • AES-256
          </span>
          <span className="hidden sm:block w-px h-4 bg-border/60" />
          <span className="flex items-center gap-1.5 text-muted">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> 8 languages • ~12ms execution
          </span>
          <span className="hidden sm:block w-px h-4 bg-border/60" />
          <span className="text-muted">Loved by hiring teams at <span className="font-bold text-fg">Capgemini</span>, <span className="font-bold text-fg">SakSoft</span> & more</span>
        </div>
      </section>

      {/* Pipeline */}
      <div className="relative">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
        <HirePipeline />
      </div>

      {/* Live interview room - enhanced with browser mock */}
      <section className="mx-auto max-w-6xl px-4 py-24 md:py-32 relative">
        <div className="absolute top-10 right-10 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
        <SectionHeading
          eyebrow="Live interview room"
          eyebrowIcon={<Video className="w-3.5 h-3.5" />}
          title="The interview room,"
          highlight="as candidates see it."
          lede="Collaborative editor, live execution, and proctoring signals — all in the browser, nothing to install on either side. Your team watches, replays, and scores."
        />
        <RevealOnScroll stagger={0.1} amount={0.15} className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-8">
          <RevealItem className="md:col-span-8">
            <div className="group relative rounded-3xl border border-border bg-panel overflow-hidden shadow-tile hover:shadow-tile-hover transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <RecruiterDemoCard />
            </div>
          </RevealItem>
          <RevealItem className="md:col-span-4">
            <div className="grid grid-cols-1 gap-4 h-full">
              {buildStats({ sessionCount, challengeCount, workspaceCount }).map((s, i) => (
                <div key={s.label} className="group rounded-3xl border border-border bg-panel p-6 flex flex-col justify-center h-full hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all duration-300 hover:-translate-y-0.5" style={{ transitionDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      {i === 0 ? <BarChart3 className="w-4 h-4 text-indigo-400" /> : i === 1 ? <Users className="w-4 h-4 text-indigo-400" /> : <Clock className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Live metric</span>
                  </div>
                  <div className="text-3xl font-black text-fg tabular-nums tracking-tight">{s.value}</div>
                  <div className="text-xs text-muted font-bold uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </RevealItem>
        </RevealOnScroll>
        
        {/* Mini feature strip below demo */}
        <RevealOnScroll delay={0.3} className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Users, label: "Live cursors", desc: "See who types what, when" },
            { icon: Bot, label: "AI co-pilot", desc: "Suggests follow-ups live" },
            { icon: ShieldCheck, label: "Replay + signals", desc: "Paste, blur, keystroke timeline" },
          ].map((f) => (
            <RevealItem key={f.label}>
              <div className="rounded-2xl border border-border/60 bg-surface/50 p-4 flex items-center gap-3 hover:bg-surface transition-colors">
                <div className="w-10 h-10 rounded-xl bg-panel border border-border flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-muted" />
                </div>
                <div>
                  <div className="text-sm font-bold text-fg">{f.label}</div>
                  <div className="text-xs text-muted">{f.desc}</div>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealOnScroll>
      </section>

      {/* Infographic - hiring lifecycle */}
      <div className="relative bg-surface/20 border-y border-border/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.06),transparent_60%)] pointer-events-none" />
        <HomeInfographic persona="recruiter" />
      </div>

      {/* Feature deep dive */}
      <section className="mx-auto max-w-6xl px-4 py-24 md:py-32">
        <RevealOnScroll className="text-center mb-12">
          <RevealItem>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> Why teams switch
            </div>
          </RevealItem>
          <RevealItem>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-fg mt-4">
              Everything for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500">signal, not noise.</span>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="text-muted mt-3 max-w-2xl mx-auto">Stop toggling between Zoom, HackerRank, and spreadsheets. One workspace for every signal you actually hire on.</p>
          </RevealItem>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <HomeRecruiterFeatures />
        </div>
      </section>

      <TrustBand />

      {/* Testimonial / ROI */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <RevealOnScroll className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent p-8 md:p-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
          <RevealItem>
            <div className="flex flex-col md:flex-row gap-8 items-center relative">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider mb-3">
                  <Award className="w-3 h-3" /> Customer story
                </div>
                <blockquote className="text-lg md:text-xl font-bold leading-relaxed text-fg">
                  “We cut screening time by <span className="text-indigo-500">60%</span> and finally trust our take-homes — server grading killed the copy-paste hires.”
                </blockquote>
                <div className="mt-4 flex items-center gap-3">
                  <img src="https://i.pravatar.cc/100?img=32" alt="" className="w-9 h-9 rounded-full border border-border" />
                  <div>
                    <div className="text-sm font-bold text-fg">Engineering Manager, Series B SaaS</div>
                    <div className="text-xs text-muted">Hired 12 engineers in 6 weeks</div>
                  </div>
                </div>
              </div>
              <div className="shrink-0 grid grid-cols-3 gap-3 text-center">
                {[
                  { k: "60%", v: "less screening time" },
                  { k: "3×", v: "more qualified onsites" },
                  { k: "100%", v: "replayable evidence" },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl bg-surface border border-border p-4">
                    <div className="text-xl font-black text-indigo-500">{s.k}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </RevealItem>
        </RevealOnScroll>
      </section>

      <PricingTeaser />

      <HomeFinalCTA persona="recruiter" />
    </div>
  );
}

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
