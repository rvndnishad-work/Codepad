"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowUpRight, Flame, ArrowRight, Briefcase, Users, Activity } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import {
  TemplateCardShell,
  CardTitleRow,
} from "@/components/TemplateCardShell";

type Snippet = {
  id: string;
  slug: string;
  title: string;
  template: string;
  author: { name: string | null; image: string | null } | null;
  updatedAt: string;
};

const RECRUITER_CAMPAIGNS = [
  {
    id: "react-lead",
    title: "Senior React Architect Assessment",
    candidatesCount: 14,
    avgScore: 82,
    lastActive: "2 hours ago",
    template: "react"
  },
  {
    id: "python-grader",
    title: "Python Backend Engineering Campaign",
    candidatesCount: 32,
    avgScore: 71,
    lastActive: "1 day ago",
    template: "python"
  },
  {
    id: "sys-design",
    title: "System Design Collaborative Board",
    candidatesCount: 8,
    avgScore: 89,
    lastActive: "4 mins ago",
    template: "javascript"
  }
];

export default function HomeExplore({ featured }: { featured: Snippet[] }) {
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

  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <RevealOnScroll className="flex items-end justify-between mb-8">
        <div>
          <div className={`inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest mb-2 px-3 py-1 rounded-full ${
            isRecruiter ? "text-indigo-400 bg-indigo-500/10" : "text-accent bg-accent/10"
          }`}>
            {isRecruiter ? <Briefcase className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5 fill-current" />}
            {isRecruiter ? "Hiring Campaigns" : "Discovery"}
          </div>
          <h2 className="text-3xl font-black text-fg tracking-tight">
            {isRecruiter ? "Active Campaigns" : "Explore Trends"}
          </h2>
        </div>
        <Link 
          href={isRecruiter ? "/dashboard" : "/explore"} 
          className="text-sm font-bold text-muted hover:text-fg transition-colors flex items-center gap-2 group"
        >
          {isRecruiter ? "Go to workspace" : "Explore all snippets"}
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </RevealOnScroll>

      {isRecruiter ? (
        <RevealOnScroll
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          stagger={0.06}
        >
          {RECRUITER_CAMPAIGNS.map((c) => (
            <RevealItem key={c.id}>
              <TemplateCardShell href="/dashboard" templateId={c.template}>
                <CardTitleRow>{c.title}</CardTitleRow>
                <div className="flex flex-col gap-2 pt-1 text-[11px] text-muted">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted/70">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{c.candidatesCount} Candidates</span>
                    </span>
                    <span className="flex items-center gap-1 font-extrabold text-fg text-[10px] uppercase">
                      <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                      <span>{c.avgScore}% Avg AI Score</span>
                    </span>
                  </div>
                  <div className="text-[9px] text-muted/50 uppercase font-mono tracking-wider border-t border-border/40 pt-2 mt-1">
                    Last Active: {c.lastActive}
                  </div>
                </div>
              </TemplateCardShell>
            </RevealItem>
          ))}
        </RevealOnScroll>
      ) : (
        <RevealOnScroll
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          stagger={0.06}
        >
          {featured.map((s) => (
            <RevealItem key={s.id}>
              <TemplateCardShell href={`/play/${s.slug}`} templateId={s.template}>
                <CardTitleRow>{s.title}</CardTitleRow>
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                  <div className="flex items-center gap-1.5 truncate">
                    {s.author?.image ? (
                      <img
                        src={s.author.image}
                        alt=""
                        className="w-4 h-4 rounded-full border border-border shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-surface border border-border shrink-0" />
                    )}
                    <span className="truncate">{s.author?.name ?? "anonymous"}</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted/40 uppercase tabular-nums shrink-0">
                    <RelativeTime iso={s.updatedAt} />
                  </span>
                </div>
              </TemplateCardShell>
            </RevealItem>
          ))}
        </RevealOnScroll>
      )}
    </section>
  );
}
