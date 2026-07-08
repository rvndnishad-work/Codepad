import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bot,
  Building2,
  ClipboardList,
  FileCode2,
  MonitorPlay,
  Plug,
  Plus,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Your Workspaces",
  description:
    "Pick a recruiting workspace to manage candidates, interviews, take-homes, and your hiring team.",
};

const PLAN_BADGES: Record<string, string> = {
  FREE: "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]",
  GROWTH: "text-indigo-600 dark:text-indigo-300 border-indigo-500/25 bg-indigo-500/[0.08]",
  ENTERPRISE: "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]",
  LOCKED: "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]",
};

const ROLE_BADGES: Record<string, string> = {
  OWNER: "text-accent border-accent/25 bg-accent/[0.08]",
  ADMIN: "text-violet-600 dark:text-violet-400 border-violet-500/25 bg-violet-500/[0.08]",
  RECRUITER: "text-sky-600 dark:text-sky-400 border-sky-500/25 bg-sky-500/[0.08]",
  INTERVIEWER: "text-teal-600 dark:text-teal-400 border-teal-500/25 bg-teal-500/[0.08]",
  VIEWER: "text-muted border-border bg-surface/60",
};

/* What a workspace actually ships with — each tile maps to a real sidebar
 * surface inside /w/[slug] (candidates, take-homes, ai-interviews, attempts,
 * audit, ats/api-keys/emails). */
const FEATURES = [
  {
    icon: ClipboardList,
    tint: "text-indigo-500 dark:text-indigo-400 border-indigo-500/20 bg-indigo-500/10",
    title: "Take-Home Assessments",
    desc: "Author custom coding tests and send asynchronous take-homes with deadlines and auto-graded test suites.",
  },
  {
    icon: Bot,
    tint: "text-rose-500 dark:text-rose-400 border-rose-500/20 bg-rose-500/10",
    title: "AI Screening",
    desc: "An AI agent runs structured first-round interviews and files a report with scores per candidate.",
  },
  {
    icon: MonitorPlay,
    tint: "text-cyan-600 dark:text-cyan-400 border-cyan-500/20 bg-cyan-500/10",
    title: "Live Interview Rooms",
    desc: "Collaborative coding panels with multi-cursor editing — every session is recorded for team replay.",
  },
  {
    icon: Users,
    tint: "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    title: "Candidate CRM",
    desc: "Track every candidate's stage, attempts, scores, and integrity signals in one shared pipeline.",
  },
  {
    icon: ShieldCheck,
    tint: "text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10",
    title: "Team Roles & Audit",
    desc: "Invite owners, recruiters, interviewers, and viewers with scoped permissions and a full audit log.",
  },
  {
    icon: Plug,
    tint: "text-violet-600 dark:text-violet-400 border-violet-500/20 bg-violet-500/10",
    title: "ATS & Integrations",
    desc: "Sync candidates with your ATS, mint scoped API keys, and wire up email templates and MCP tools.",
  },
];

const PIPELINE_STEPS = [
  {
    icon: UserPlus,
    accent: "#818CF8",
    title: "Invite",
    desc: "Add candidates one-by-one or bulk-import your whole pipeline.",
  },
  {
    icon: FileCode2,
    accent: "#F472B6",
    title: "Assess",
    desc: "Send take-homes, run AI screenings, or host live coding panels.",
  },
  {
    icon: Sparkles,
    accent: "#22D3EE",
    title: "Review",
    desc: "Replay sessions, compare rubric scores, and check integrity reports together.",
  },
  {
    icon: ShieldCheck,
    accent: "#34D399",
    title: "Hire",
    desc: "Rank the leaderboard, align the team, and extend the offer with confidence.",
  },
];

/* Decorative, theme-aware mock of a workspace dashboard. Pure SVG + SMIL so
 * the page stays a server component — no client JS needed for the motion. */
function WorkspaceIllustration() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-label="Illustration of a recruiting workspace dashboard"
      className="w-full h-auto drop-shadow-2xl"
    >
      {/* Window frame */}
      <rect x="8" y="8" width="464" height="304" rx="20" fill="var(--panel)" stroke="var(--border)" />
      {/* Titlebar dots */}
      <circle cx="32" cy="30" r="4.5" fill="#F87171" opacity="0.8" />
      <circle cx="48" cy="30" r="4.5" fill="#FBBF24" opacity="0.8" />
      <circle cx="64" cy="30" r="4.5" fill="#34D399" opacity="0.8" />
      <text x="88" y="34" fontSize="11" fontWeight="700" fill="var(--muted)" fontFamily="monospace">
        /w/your-team
      </text>

      {/* Sidebar */}
      <rect x="20" y="48" width="108" height="252" rx="12" fill="var(--surface)" stroke="var(--border)" />
      <rect x="32" y="62" width="26" height="26" rx="8" fill="rgba(var(--accent-rgb),0.15)" stroke="var(--accent)" strokeOpacity="0.4" />
      <rect x="66" y="66" width="48" height="7" rx="3.5" fill="var(--muted)" opacity="0.5" />
      <rect x="66" y="78" width="32" height="5" rx="2.5" fill="var(--muted)" opacity="0.25" />
      {[104, 128, 152, 176, 200].map((y, i) => (
        <g key={y}>
          <rect
            x="32"
            y={y}
            width="84"
            height="14"
            rx="7"
            fill={i === 1 ? "rgba(var(--accent-rgb),0.12)" : "var(--elevated)"}
            opacity={i === 1 ? 1 : 0.55}
          />
          <circle cx="42" cy={y + 7} r="3" fill={i === 1 ? "var(--accent)" : "var(--muted)"} opacity={i === 1 ? 0.9 : 0.4} />
        </g>
      ))}

      {/* Stat cards */}
      {[
        { x: 140, label: "CANDIDATES", value: "128", color: "#818CF8" },
        { x: 248, label: "IN REVIEW", value: "23", color: "#FBBF24" },
        { x: 356, label: "HIRED", value: "7", color: "#34D399" },
      ].map((card) => (
        <g key={card.x}>
          <rect x={card.x} y="48" width="104" height="62" rx="12" fill="var(--surface)" stroke="var(--border)" />
          <rect x={card.x + 12} y="60" width="52" height="6" rx="3" fill="var(--muted)" opacity="0.4" />
          <text x={card.x + 12} y="96" fontSize="22" fontWeight="900" fill={card.color}>
            {card.value}
          </text>
          <circle cx={card.x + 90} cy="66" r="4" fill={card.color} opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      {/* Candidate table */}
      <rect x="140" y="122" width="320" height="178" rx="12" fill="var(--surface)" stroke="var(--border)" />
      <rect x="154" y="136" width="96" height="7" rx="3.5" fill="var(--muted)" opacity="0.5" />
      <rect x="392" y="132" width="54" height="16" rx="8" fill="rgba(var(--accent-rgb),0.14)" stroke="var(--accent)" strokeOpacity="0.35" />
      {[
        { y: 160, w: 88, score: 92, color: "#34D399", pill: "PASS" },
        { y: 194, w: 72, score: 74, color: "#FBBF24", pill: "REVIEW" },
        { y: 228, w: 96, score: 88, color: "#34D399", pill: "PASS" },
        { y: 262, w: 64, score: 41, color: "#F87171", pill: "FLAG" },
      ].map((row, i) => (
        <g key={row.y}>
          <circle cx="166" cy={row.y + 8} r="9" fill="var(--elevated)" stroke="var(--border)" />
          <rect x="184" y={row.y + 2} width={row.w} height="7" rx="3.5" fill="var(--muted)" opacity="0.55" />
          <rect x="184" y={row.y + 13} width={row.w - 24} height="5" rx="2.5" fill="var(--muted)" opacity="0.25" />
          {/* score bar */}
          <rect x="300" y={row.y + 5} width="72" height="6" rx="3" fill="var(--elevated)" />
          <rect x="300" y={row.y + 5} width={(72 * row.score) / 100} height="6" rx="3" fill={row.color} opacity="0.85">
            <animate
              attributeName="width"
              from="0"
              to={(72 * row.score) / 100}
              dur="1.1s"
              begin={`${0.25 * i}s`}
              fill="freeze"
            />
          </rect>
          <rect x="392" y={row.y - 1} width="54" height="18" rx="9" fill={`${row.color}22`} stroke={row.color} strokeOpacity="0.45" />
          <text x="419" y={row.y + 12} fontSize="8.5" fontWeight="800" fill={row.color} textAnchor="middle" letterSpacing="0.5">
            {row.pill}
          </text>
        </g>
      ))}

      {/* Floating live badge */}
      <g>
        <rect x="336" y="14" width="112" height="24" rx="12" fill="var(--bg)" stroke="#34D399" strokeOpacity="0.45" />
        <circle cx="352" cy="26" r="4" fill="#34D399">
          <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <text x="362" y="30" fontSize="9.5" fontWeight="800" fill="#34D399" letterSpacing="0.8">
          LIVE INTERVIEW
        </text>
      </g>
    </svg>
  );
}

/* Animated connector for the pipeline strip — a dashed line that "flows"
 * left → right (SMIL, no client JS). Hidden on mobile where steps stack. */
function PipelineConnector() {
  return (
    <svg
      viewBox="0 0 900 8"
      preserveAspectRatio="none"
      aria-hidden
      className="hidden lg:block absolute top-[44px] left-[12%] w-[76%] h-2 pointer-events-none"
    >
      <line
        x1="0"
        y1="4"
        x2="900"
        y2="4"
        stroke="var(--accent)"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeDasharray="10 8"
      >
        <animate attributeName="stroke-dashoffset" from="36" to="0" dur="1.4s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

export default async function WorkspaceHubPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/w")}`);
  }

  const allMemberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    orderBy: { workspace: { name: "asc" } },
    select: {
      role: true,
      workspace: {
        select: {
          name: true,
          slug: true,
          planName: true,
          createdAt: true,
          _count: {
            select: { members: true, candidates: true, takeHomes: true },
          },
        },
      },
    },
  });

  // System workspaces (double-underscore slugs, e.g. __ai-practice__) are
  // internal tenants — never surface them as pickable recruiting hubs.
  // Filtered in JS: Prisma's startsWith doesn't escape `_` (a LIKE wildcard),
  // so a DB-side `NOT startsWith "__"` filter would exclude everything.
  const memberships = allMemberships.filter(
    (m) => !m.workspace.slug.startsWith("__"),
  );
  const hasWorkspaces = memberships.length > 0;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-bg text-fg relative overflow-hidden font-sans">
      {/* Ambient glow orbs */}
      <div className="absolute top-[-120px] left-[-120px] w-96 h-96 bg-accent/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-160px] w-[28rem] h-[28rem] bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-[-120px] left-[20%] w-96 h-96 bg-rose-500/[0.07] rounded-full blur-[128px] pointer-events-none" />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:py-16 relative z-10 space-y-16 md:space-y-20">
        {/* ── Hero ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 rounded-full px-3 py-1">
              <Building2 className="w-3 h-3" />
              Recruiting Hubs
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.08]">
              {hasWorkspaces ? (
                <>
                  Welcome back.
                  <br />
                  <span className="text-accent">Pick a workspace.</span>
                </>
              ) : (
                <>
                  Your team&apos;s private
                  <br />
                  <span className="text-accent">hiring command center.</span>
                </>
              )}
            </h1>
            <p className="text-sm md:text-base text-muted leading-relaxed max-w-lg">
              {hasWorkspaces
                ? `You belong to ${memberships.length} ${
                    memberships.length === 1 ? "workspace" : "workspaces"
                  }. Jump back into your pipeline — candidates, take-homes, AI screenings, and replays are exactly where you left them.`
                : "A workspace is an isolated tenant for your company — author custom coding tests, send take-homes, run AI-led first rounds, and review every candidate together with scoped team roles."}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/w/create"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition-all shadow-soft hover:-translate-y-0.5 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3px]" />
                {hasWorkspaces ? "New Workspace" : "Create Your Workspace"}
              </Link>
              <Link
                href="/hire"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border hover:border-accent/40 text-muted hover:text-fg text-xs font-black uppercase tracking-wider transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                See how it works
              </Link>
            </div>
            {!hasWorkspaces && (
              <p className="text-[11px] text-muted/70">
                Invited by a teammate? Ask them to add you as a member and this
                page will list their workspace.
              </p>
            )}
          </div>

          <div className="relative">
            {/* Glow behind the illustration */}
            <div className="absolute inset-8 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="relative">
              <WorkspaceIllustration />
            </div>
          </div>
        </section>

        {/* ── Workspace picker ── */}
        {hasWorkspaces && (
          <section className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">
                  Your Workspaces
                </h2>
                <p className="text-sm text-muted mt-1">
                  Select a hub to open its dashboard.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {memberships.map(({ role, workspace: ws }) => (
                <Link
                  key={ws.slug}
                  href={`/w/${ws.slug}`}
                  className="group rounded-3xl border border-border bg-panel p-6 space-y-5 transition-all duration-300 hover:border-accent/30 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/[0.06] rounded-full blur-2xl pointer-events-none group-hover:bg-accent/10 transition-colors" />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 font-black text-base shrink-0 uppercase">
                        {ws.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-black tracking-tight truncate group-hover:text-accent transition-colors">
                          {ws.name}
                        </h3>
                        <p className="text-[11px] text-muted/70 font-mono truncate">
                          /w/{ws.slug}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border shrink-0 ${
                        PLAN_BADGES[ws.planName] || PLAN_BADGES.FREE
                      }`}
                    >
                      {ws.planName}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-muted font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-muted/60" />
                      {ws._count.members}{" "}
                      {ws._count.members === 1 ? "member" : "members"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-muted/60" />
                      {ws._count.candidates}{" "}
                      {ws._count.candidates === 1 ? "candidate" : "candidates"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${
                        ROLE_BADGES[role] || ROLE_BADGES.VIEWER
                      }`}
                    >
                      {role}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-muted group-hover:text-accent transition-colors">
                      Open
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}

              <Link
                href="/w/create"
                className="rounded-3xl border border-dashed border-border hover:border-accent/50 bg-surface/30 hover:bg-surface/60 p-6 flex flex-col items-center justify-center gap-3 text-muted/70 hover:text-accent transition-all duration-300 min-h-[180px] group"
              >
                <div className="w-11 h-11 rounded-2xl border border-dashed border-border group-hover:border-accent/50 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider">
                  Create another workspace
                </span>
              </Link>
            </div>
          </section>
        )}

        {/* ── Feature bento ── */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Inside every <span className="text-accent">workspace</span>
            </h2>
            <p className="text-sm md:text-base text-muted leading-relaxed">
              Six purpose-built surfaces, one shared pipeline. Everything your
              hiring team touches lives behind your workspace&apos;s door.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-3xl border border-border bg-panel p-6 space-y-3.5 transition-all duration-300 hover:border-border-strong hover:-translate-y-0.5 relative overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-accent/[0.04] blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${f.tint}`}
                >
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black tracking-tight">{f.title}</h3>
                <p className="text-[13px] text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pipeline strip ── */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              From invite to hire, <span className="text-accent">one flow</span>
            </h2>
            <p className="text-sm md:text-base text-muted leading-relaxed">
              Your whole funnel runs inside the workspace — no spreadsheet
              hand-offs, no lost candidates.
            </p>
          </div>

          <div className="relative">
            <PipelineConnector />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
              {PIPELINE_STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className="rounded-3xl border border-border bg-panel p-6 text-center space-y-3 relative"
                >
                  <div
                    className="w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center relative z-10"
                    style={{
                      color: step.accent,
                      borderColor: `${step.accent}40`,
                      background: `${step.accent}14`,
                    }}
                  >
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: step.accent }}
                  >
                    Step {i + 1}
                  </div>
                  <h3 className="text-base font-black tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] via-transparent to-indigo-500/[0.06] p-8 md:p-12 text-center space-y-5 relative overflow-hidden">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
          <h2 className="text-2xl md:text-3xl font-black tracking-tight relative">
            {hasWorkspaces
              ? "Growing the team?"
              : "Spin up your workspace in under a minute."}
          </h2>
          <p className="text-sm md:text-base text-muted max-w-xl mx-auto leading-relaxed relative">
            {hasWorkspaces
              ? "Separate hiring pipelines per department or client — each workspace is fully isolated with its own plan, members, and candidates."
              : "Start on the free plan, invite up to 5 teammates, and run your first take-home today. No credit card required."}
          </p>
          <div className="relative">
            <Link
              href="/w/create"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition-all shadow-soft hover:-translate-y-0.5 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              {hasWorkspaces ? "Create Another Workspace" : "Create Workspace"}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
