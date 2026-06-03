"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  Sparkles, 
  Brain, 
  Workflow, 
  FileText, 
  Calendar, 
  Building2, 
  Shield, 
  Play, 
  ArrowRight, 
  Code, 
  Users, 
  CheckCircle, 
  Zap, 
  Award,
  Lock,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState<"assess" | "integrity" | "workspace" | "integrate">("assess");

  const tabContent = {
    assess: {
      title: "Visual Test Case Builder & Auto-Scoring Grader",
      desc: "Build comprehensive assessment suites visually without writing testing framework boilerplate.",
      bullets: [
        "Visual weighted test builder supporting standard, hidden, and stress cases",
        "Sub-second client-side execution via dynamic Sandpack Jest compilation",
        "Server-secure auto-scoring engine compiling precise percentages",
        "Instant visual results and step-by-step scoring logs for candidates",
      ],
      color: "from-purple-500/20 to-indigo-500/20 border-purple-500/30",
      accent: "text-purple-400",
      bgOrb: "bg-purple-500/10",
      icon: Workflow,
    },
    integrity: {
      title: "AI Proctoring Telemetry & Monaco Session Replay",
      desc: "Observe how candidates write code and monitor academic integrity with absolute transparency.",
      bullets: [
        "Keystroke rhythm analysis catching suspicious automated speed bursts",
        "Instant block paste interception recording snippets and time offsets",
        "Continuous window focus/blur tracking detailing tab leaves",
        "Timeline scrubbing player reproducing absolute file-system deltas",
      ],
      color: "from-rose-500/20 to-orange-500/20 border-rose-500/30",
      accent: "text-rose-400",
      bgOrb: "bg-rose-500/10",
      icon: Brain,
    },
    workspace: {
      title: "Multi-Tenant Workspaces & Metered Roles",
      desc: "Secure collaborative workspace instances to coordinate hiring pipelines seamlessly.",
      bullets: [
        "Granular permission hierarchy (Owner, Admin, Interviewer, Viewer)",
        "Stripe-integrated per-seat automatic licensing and seat limits",
        "Centralized repository of custom company challenges and team rubrics",
        "Workspace isolations safeguarding all candidate attempts & logs",
      ],
      color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
      accent: "text-cyan-400",
      bgOrb: "bg-cyan-500/10",
      icon: Building2,
    },
    integrate: {
      title: "ATS Webhooks & Calendar Sync",
      desc: "Frictionless integrations syncing assessments straight into core workflows.",
      bullets: [
        "Inbound Greenhouse, Lever, and Ashby stage change webhook generators",
        "Outbound applicant update scorecards pushing PDF dossiers dynamically",
        "Google & Microsoft iCal appointment sync generating dynamic room entries",
        "OAuth-secured integration credentials saved securely per tenant instance",
      ],
      color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30",
      accent: "text-amber-400",
      bgOrb: "bg-amber-500/10",
      icon: Calendar,
    },
  };

  return (
    <div className="bg-bg min-h-screen relative overflow-hidden">
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -mt-40" />
        <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] -mr-40" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 md:py-32">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-1.5 text-xs font-black text-accent mb-6 uppercase tracking-widest"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recruitment Suite Capabilities</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black tracking-tight text-fg mb-6 leading-tight"
          >
            A high-fidelity pipeline for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent-soft">developer evaluation.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted text-base md:text-lg leading-relaxed font-medium"
          >
            Interviewpad combines professional-grade coding sandboxes with enterprise-ready 
            telemetry, standard rubrics, and automated grading pipelines to empower modern talent acquisition.
          </motion.p>
        </div>

        {/* Tab Switcher Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-24">
          <div className="lg:col-span-4 flex flex-col gap-3 justify-center">
            {(Object.keys(tabContent) as Array<keyof typeof tabContent>).map((key) => {
              const item = tabContent[key];
              const Icon = item.icon;
              const isActive = activeTab === key;

              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-4 text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                    isActive 
                      ? "border-accent/40 bg-surface shadow-[0_4px_30px_rgba(var(--accent-rgb),0.1)] scale-[1.02]" 
                      : "border-border bg-panel/30 hover:border-border-strong hover:bg-panel/60"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? "bg-accent text-bg" : "bg-surface border border-border text-muted"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-black transition-colors ${isActive ? "text-fg" : "text-muted"}`}>
                      {key === "assess" ? "Grading & Auto-Score" : key === "integrity" ? "Proctoring & Replay" : key === "workspace" ? "Team Workspace" : "ATS & Scheduling"}
                    </h3>
                    <p className="text-[11px] text-muted/70 line-clamp-1 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                  {isActive && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-accent" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Interactive Feature Stage */}
          <div className="lg:col-span-8">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className={`rounded-3xl border bg-gradient-to-br ${tabContent[activeTab].color} p-8 md:p-10 relative overflow-hidden min-h-[460px] flex flex-col justify-between`}
            >
              {/* Background Orb */}
              <div className={`absolute -right-16 -top-16 w-60 h-60 rounded-full blur-[80px] opacity-60 ${tabContent[activeTab].bgOrb}`} />

              <div className="relative z-10">
                <div className={`inline-flex items-center gap-2 mb-6 ${tabContent[activeTab].accent} font-bold text-xs uppercase tracking-wider`}>
                  {activeTab === "assess" && <Workflow className="w-4 h-4" />}
                  {activeTab === "integrity" && <Brain className="w-4 h-4" />}
                  {activeTab === "workspace" && <Building2 className="w-4 h-4" />}
                  {activeTab === "integrate" && <Calendar className="w-4 h-4" />}
                  <span>{activeTab} feature spotlight</span>
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-fg mb-4 leading-tight">
                  {tabContent[activeTab].title}
                </h2>
                
                <p className="text-muted text-sm md:text-base leading-relaxed mb-8 font-medium">
                  {tabContent[activeTab].desc}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tabContent[activeTab].bullets.map((bullet, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${tabContent[activeTab].accent}`} />
                      <span className="text-xs md:text-sm text-fg/80 leading-relaxed font-semibold">
                        {bullet}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Showcase Footer Graphic */}
              <div className="relative mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
                <div className="text-xs text-muted/80 font-mono">
                  Module: <span className="text-fg font-bold">@interviewpad/recruiter-{activeTab}</span>
                </div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-accent hover:text-accent-soft transition-colors group"
                >
                  Get Recruiter License
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Detailed Features Grid */}
        <div className="border-t border-border pt-20 mb-20">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-black text-fg tracking-tight mb-4">
              Designed for Rigor. Engineered for Speed.
            </h2>
            <p className="text-muted text-sm md:text-base max-w-xl mx-auto font-medium">
              We built every aspect of the evaluation sandbox with robust safeguards and sub-second runtimes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* VM Sandbox */}
            <div className="rounded-2xl border border-border bg-panel/30 p-6 hover:bg-elevated/40 hover:border-border-strong transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center mb-6 text-accent">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-fg font-black text-lg mb-2">Isolated Shell Sandboxes</h3>
              <p className="text-muted text-xs md:text-sm leading-relaxed font-medium">
                Our backend runtimes execute Python, Go, and Java inside warm-standby Docker virtual machines 
                isolated with memory boundaries and 5-second process timeout gates.
              </p>
            </div>

            {/* Rubrics & PDF */}
            <div className="rounded-2xl border border-border bg-panel/30 p-6 hover:bg-elevated/40 hover:border-border-strong transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center mb-6 text-purple-400">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-fg font-black text-lg mb-2">Granular Scorecards & PDFs</h3>
              <p className="text-muted text-xs md:text-sm leading-relaxed font-medium">
                Equip panels to rate communication, algorithm mastery, and code structure. Auto-generate 
                executive candidate PDF dossiers designed for clean printing.
              </p>
            </div>

            {/* Expiring Links */}
            <div className="rounded-2xl border border-border bg-panel/30 p-6 hover:bg-elevated/40 hover:border-border-strong transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center mb-6 text-rose-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-fg font-black text-lg mb-2">Take-Home Lobbies</h3>
              <p className="text-muted text-xs md:text-sm leading-relaxed font-medium">
                Invite asynchronous candidates via opaque URLs. Control strict time limit countdowns, welcome policies, 
                and hardware-enforced automatic submit-on-timeout blocks.
              </p>
            </div>
          </div>
        </div>

        {/* Final CTA Block */}
        <div className="rounded-3xl border border-accent/20 bg-accent/5 p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-4xl font-black text-fg mb-4">
              Scale your hiring with our corporate recruiter tools.
            </h2>
            <p className="text-muted text-xs md:text-sm mb-8 leading-relaxed font-medium">
              Start evaluating candidate code quality and integrity today. 
              Deploy expiring take-home assignments or standard live panels inside seat-based team workspaces.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                View Per-Seat Pricing
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/w/create"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-surface hover:bg-elevated text-fg border border-border transition-all font-semibold"
              >
                Create Workspace
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
