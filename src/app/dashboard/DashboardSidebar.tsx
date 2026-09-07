"use client";

import { useLayoutEffect, useRef, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Newspaper, Keyboard, MessageSquare, Building2, Plus,
  ArrowRight, Clock, Satellite, Radio, ExternalLink,
} from "lucide-react";
import JoinInterviewBox from "../interview/JoinInterviewBox";

gsap.registerPlugin(ScrollTrigger);

const NEWS = [
  { title: "Monaco Editor Intelligence Boost", date: "May 2", href: "#" },
  { title: "New Cobalt2 Theme Support", date: "Apr 28", href: "#" },
  { title: "Better JSX highlighting for React", date: "Apr 25", href: "#" },
];

const SHORTCUTS = [
  { keys: ["Ctrl", "S"], label: "Save snippet" },
  { keys: ["Ctrl", "Enter"], label: "Run code" },
  { keys: ["Ctrl", "P"], label: "Search files" },
];

type WorkspaceItem = {
  name: string;
  slug: string;
  plan: string;
};

function RailTitle({ icon: Icon, children, accent = "#8b93ff" }: { icon: ComponentType<{ className?: string }>; children: ReactNode; accent?: string }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[rgba(238,240,255,0.75)]">
      <span className="grid h-7 w-7 place-items-center rounded-xl border border-white/10" style={{ background: `${accent}1f`, color: accent }}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </h3>
  );
}

/**
 * Deep-space relay rail: same routes and data as before (assessments,
 * workspaces, news, shortcuts, help) dressed as station modules with a
 * staggered GSAP ascent on scroll.
 */
export default function DashboardSidebar({
  workspaces = [],
  takeHomes = [],
}: {
  workspaces?: WorkspaceItem[];
  takeHomes?: any[];
}) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-gx-module]", {
        y: 28,
        opacity: 0,
        duration: 0.65,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="gx space-y-5">
      <div data-gx-module>
        <JoinInterviewBox />
      </div>

      {takeHomes.length > 0 && (
        <div data-gx-module className="gx-panel relative overflow-hidden rounded-3xl p-6">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,209,102,0.3),transparent_65%)] blur-xl" />
          <RailTitle icon={Clock} accent="#ffd166">Inbound Missions</RailTitle>
          <div className="space-y-3">
            {takeHomes.map((th) => {
              const statusColor =
                th.status === "SUBMITTED" ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10"
                : th.status === "ACTIVE" ? "text-[#8b93ff] border-[#8b93ff]/30 bg-[#8b93ff]/10"
                : th.status === "EXPIRED" ? "text-rose-300 border-rose-400/30 bg-rose-400/10"
                : "text-amber-300 border-amber-400/30 bg-amber-400/10";
              const expired = th.expiresAt && new Date(th.expiresAt).getTime() < Date.now();
              const href = th.status === "SUBMITTED" ? "#" : expired ? "#" : `/take-home/${th.token}`;
              return (
                <div key={th.id} className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3.5 transition-colors hover:border-[rgba(255,209,102,0.4)]">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={href} className="line-clamp-1 text-xs font-bold text-white hover:text-[#ffd166]">
                      {th.challenge.title}
                    </Link>
                    <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${statusColor}`}>
                      {th.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-[10px] text-[rgba(238,240,255,0.5)]">
                      From <span className="font-semibold text-white/80">{th.workspace?.name ?? "—"}</span>
                    </div>
                    {th.status !== "SUBMITTED" && !expired && (
                      <Link href={href} className="group inline-flex items-center gap-1 text-[10px] font-bold text-[#ffd166]">
                        Start <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div data-gx-module className="gx-panel relative overflow-hidden rounded-3xl p-6">
        <div aria-hidden className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(139,147,255,0.35),transparent_65%)] blur-xl" />
        <h3 className="mb-4 flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[rgba(238,240,255,0.75)]">
          <span className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-xl border border-white/10 bg-[#8b93ff]/15 text-[#8b93ff]">
              <Building2 className="h-3.5 w-3.5" />
            </span>
            Space Stations
          </span>
          <span className="rounded border border-[#8b93ff]/25 bg-[#8b93ff]/10 px-1.5 py-0.5 text-[9px] font-black uppercase">
            B2B SaaS
          </span>
        </h3>
        {workspaces.length === 0 ? (
          <div className="space-y-3.5">
            <p className="text-xs leading-relaxed text-[rgba(238,240,255,0.6)]">
              Dock a recruitment hub for async screening, automated test builders and candidate review panels.
            </p>
            <Link
              href="/w/create"
              className="gx-btn-star flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ff2fb3] py-2.5 text-[10px] font-black uppercase tracking-wider text-[#14092b]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
              <span>Found a Station</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="gx-scroll max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {workspaces.map((ws) => (
                <Link
                  key={ws.slug}
                  href={`/w/${ws.slug}`}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 p-2.5 text-xs font-bold text-[rgba(238,240,255,0.65)] transition-all hover:border-[#8b93ff]/40 hover:text-white"
                >
                  <span className="truncate">{ws.name}</span>
                  <span className="shrink-0 rounded border border-[#8b93ff]/25 bg-[#8b93ff]/10 px-1 text-[8px] font-black uppercase text-[#8b93ff]">
                    {ws.plan}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/w/create"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2 text-[10px] font-black uppercase tracking-wider text-[rgba(238,240,255,0.5)] transition-colors hover:border-[#ffd166]/60 hover:text-[#ffd166]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Dock Station</span>
            </Link>
          </div>
        )}
      </div>

      <div data-gx-module className="gx-panel rounded-3xl p-6">
        <RailTitle icon={Satellite} accent="#22d3ee">Deep-Space Signals</RailTitle>
        <div className="space-y-4">
          {NEWS.map((item, i) => (
            <a key={i} href={item.href} className="group block">
              <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ffd166]">{item.date}</div>
              <div className="flex items-center justify-between text-sm text-[rgba(238,240,255,0.7)] transition-colors group-hover:text-white">
                {item.title}
                <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </a>
          ))}
        </div>
      </div>

      <div data-gx-module className="gx-panel rounded-3xl p-6">
        <RailTitle icon={Keyboard} accent="#ff2fb3">Flight Controls</RailTitle>
        <div className="space-y-3">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-[rgba(238,240,255,0.6)]">{s.label}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="rounded border border-white/15 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] text-[rgba(238,240,255,0.7)]">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div data-gx-module className="gx-panel relative overflow-hidden rounded-3xl p-6">
        <div aria-hidden className="pointer-events-none absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.3),transparent_65%)] blur-xl" />
        <RailTitle icon={Radio} accent="#22d3ee">Hail Control</RailTitle>
        <p className="mb-4 text-xs leading-relaxed text-[rgba(238,240,255,0.6)]">
          Join our Discord crew or check the star charts for pro tips.
        </p>
        <button className="gx-btn-star flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(34,211,238,0.4)] bg-[rgba(34,211,238,0.1)] py-2 text-xs font-bold text-white">
          <MessageSquare className="h-3.5 w-3.5" />
          Join Community
        </button>
      </div>
    </div>
  );
}
