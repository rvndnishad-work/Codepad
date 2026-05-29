import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPortfolioData } from "@/lib/portfolio-badges";
import {
  Trophy,
  Award,
  Shield,
  Globe,
  Zap,
  MessageSquare,
  Cpu,
  Star,
  Sparkles,
  Users,
  CheckCircle2,
  Activity,
  Printer,
  Code2,
  MapPin,
  Mail,
  Link as LinkIcon,
  ExternalLink,
  User as UserIcon,
  Terminal,
  BookOpen,
} from "lucide-react";
import RelativeTime from "@/components/RelativeTime";

// Next.js 15 Route Props type
type Props = {
  params: Promise<{ id: string }>;
};

// Metadata generator for public SEO indexability
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const data = await getPortfolioData(id);

  if (!data || !data.portfolioPublic) {
    return { title: "Portfolio — Interviewpad" };
  }

  return {
    title: `${data.name ?? "Developer"} — Portfolio & Badges`,
    description: `${data.name ?? "A developer"}'s public verified portfolio and achievements on Interviewpad.`,
  };
}

// Icon mapper for SVG badges
const iconMap: Record<string, React.ComponentType<any>> = {
  trophy: Trophy,
  award: Award,
  shield: Shield,
  globe: Globe,
  zap: Zap,
  "message-square": MessageSquare,
  cpu: Cpu,
  star: Star,
  sparkles: Sparkles,
  users: Users,
  "check-circle": CheckCircle2,
  activity: Activity,
};

// Badge Tier Styles mapper
const tierStyles: Record<
  "bronze" | "silver" | "gold" | "platinum",
  { border: string; glow: string; text: string; bg: string; badgeBg: string }
> = {
  bronze: {
    border: "border-amber-700/50",
    glow: "shadow-[0_0_20px_rgba(180,83,9,0.15)] group-hover:shadow-[0_0_30px_rgba(180,83,9,0.3)]",
    text: "text-amber-500",
    bg: "from-amber-900/10 via-amber-950/5 to-surface",
    badgeBg: "bg-amber-950/20 border-amber-900/40",
  },
  silver: {
    border: "border-slate-400/30",
    glow: "shadow-[0_0_20px_rgba(148,163,184,0.15)] group-hover:shadow-[0_0_30px_rgba(148,163,184,0.3)]",
    text: "text-slate-300",
    bg: "from-slate-800/10 via-slate-900/5 to-surface",
    badgeBg: "bg-slate-950/20 border-slate-800/40",
  },
  gold: {
    border: "border-yellow-500/30",
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.2)] group-hover:shadow-[0_0_35px_rgba(234,179,8,0.4)]",
    text: "text-yellow-400",
    bg: "from-yellow-950/10 via-yellow-900/5 to-surface",
    badgeBg: "bg-yellow-950/20 border-yellow-900/40",
  },
  platinum: {
    border: "border-indigo-500/40",
    glow: "shadow-[0_0_25px_rgba(99,102,241,0.25)] group-hover:shadow-[0_0_40px_rgba(99,102,241,0.55)]",
    text: "text-indigo-400 font-extrabold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent",
    bg: "from-indigo-950/10 via-indigo-900/5 to-surface",
    badgeBg: "bg-indigo-950/25 border-indigo-900/45",
  },
};

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  medium: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  hard: "text-rose-400 border-rose-500/20 bg-rose-500/5",
};

export default async function PublicPortfolioPage({ params }: Props) {
  const { id } = await params;
  const data = await getPortfolioData(id);

  // If candidate portfolio is private or doesn't exist, return 404
  if (!data || !data.portfolioPublic) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg text-fg px-4 sm:px-6 md:px-8 py-10 print:bg-white print:text-black">
      {/* Dynamic Printing Style overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            background-color: white !important;
            border: 1px solid #e2e8f0 !important;
            color: black !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
          .print-text {
            color: #1e293b !important;
          }
          .print-muted {
            color: #64748b !important;
          }
        }
      `}} />

      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Print & Back Top Row (no-print) */}
        <div className="flex justify-between items-center no-print">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-muted hover:text-fg transition flex items-center gap-1"
          >
            ← Back to Dashboard
          </Link>
          
          <a
            href="javascript:window.print()"
            className="no-print inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border hover:bg-elevated hover:border-border-strong text-xs font-bold text-fg transition cursor-pointer shadow-md"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Portfolio (PDF)
          </a>
        </div>

        {/* Client-Print trigger workaround */}
        <PrintTrigger />

        {/* 1. Header Card */}
        <div className="print-card relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-accent/5 via-surface to-bg p-8 md:p-10 shadow-xl">
          <div className="absolute -right-10 -top-10 w-60 h-60 bg-accent/10 blur-[120px] rounded-full pointer-events-none print:hidden" />
          
          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="shrink-0">
              {data.image ? (
                <Image
                  src={data.image}
                  alt={data.name ?? "Developer"}
                  width={112}
                  height={112}
                  className="rounded-3xl border-2 border-accent/40 shadow-[0_0_25px_rgba(var(--accent-rgb),0.2)] print:border-slate-300 print:shadow-none"
                />
              ) : (
                <div className="w-28 h-28 rounded-3xl border-2 border-accent/30 bg-surface grid place-items-center print:border-slate-300">
                  <UserIcon className="w-12 h-12 text-muted" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left space-y-4 min-w-0">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2 print:border-slate-300 print:text-slate-700">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Developer
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-fg print:text-black">
                  {data.name ?? "Independent Developer"}
                </h1>
                <p className="text-xs text-muted/60 mt-1 font-mono">
                  Member since <RelativeTime iso={data.createdAt.toISOString()} fullDateTitle={false} />
                </p>
              </div>

              {data.bio ? (
                <p className="text-sm sm:text-base text-muted leading-relaxed max-w-3xl print:text-slate-800">
                  {data.bio}
                </p>
              ) : (
                <p className="text-sm text-muted italic print:text-slate-800">
                  No public bio configured. This developer's coding milestones are verified below.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                <div className="flex items-center gap-1 text-xs text-muted font-medium print:text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-accent/70 print:text-slate-500" />
                  Remote / Global
                </div>
                
                {data.hireMeUrl && (
                  <a
                    href={data.hireMeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold text-xs transition shadow-md print:hidden"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Contact Developer
                  </a>
                )}

                <a
                  href={`mailto:support@codepad.dev?subject=Verify candidate ${data.name || id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-surface hover:bg-elevated text-xs font-bold text-muted hover:text-fg transition print:hidden"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  Verify Credentials
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Achievements and Badges Grid */}
        {data.badges.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-muted flex items-center gap-2 print:text-black">
              <Award className="w-4 h-4 text-accent print:text-slate-700" />
              Verified Badges ({data.badges.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data.badges.map((badge) => {
                const styles = tierStyles[badge.tier];
                const Icon = iconMap[badge.iconName] || Trophy;

                return (
                  <div
                    key={badge.id}
                    className={`print-card group relative overflow-hidden rounded-2xl border ${styles.border} bg-gradient-to-br ${styles.bg} p-5 ${styles.glow} transition-all duration-300`}
                  >
                    <div className="flex gap-4">
                      <div className={`w-12 h-12 rounded-xl grid place-items-center shrink-0 ${styles.badgeBg}`}>
                        <Icon className={`w-6 h-6 ${styles.text}`} />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-fg tracking-tight print:text-black">
                            {badge.title}
                          </h3>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-surface/80 border ${styles.border} print:bg-slate-100 print:text-slate-800`}>
                            {badge.tier}
                          </span>
                        </div>
                        <p className="text-xs text-muted/70 leading-relaxed print:text-slate-800 group-hover:text-fg transition">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Detailed Stats Grid */}
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.25em] text-muted flex items-center gap-2 print:text-black">
            <Activity className="w-4 h-4 text-accent print:text-slate-700" />
            Performance & Coding Metrics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Challenges metrics card */}
            <div className="print-card p-6 rounded-2xl border border-border bg-surface/50 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted">
                  Challenges Solved
                </div>
                <Trophy className="w-4 h-4 text-accent/80" />
              </div>
              
              <div className="space-y-2">
                <div className="text-4xl font-black text-fg tracking-tight tabular-nums print:text-black">
                  {data.stats.challengesSolved}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Verified coding challenges passed through Sandbox automation.
                </p>
              </div>

              {/* Progress bars by difficulty */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <ProgressBar label="Easy" count={data.stats.easyCount} color="bg-emerald-500" total={data.stats.challengesSolved} />
                <ProgressBar label="Medium" count={data.stats.mediumCount} color="bg-amber-500" total={data.stats.challengesSolved} />
                <ProgressBar label="Hard" count={data.stats.hardCount} color="bg-rose-500" total={data.stats.challengesSolved} />
              </div>
            </div>

            {/* Prompt Engineering card */}
            <div className="print-card p-6 rounded-2xl border border-border bg-surface/50 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted">
                  Prompt Engineering
                </div>
                <Cpu className="w-4 h-4 text-accent/80" />
              </div>

              <div className="space-y-2">
                <div className="text-4xl font-black text-fg tracking-tight tabular-nums print:text-black">
                  {data.stats.averagePromptScore !== null ? `${data.stats.averagePromptScore}%` : "—"}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Average structural instruction grade assessed by Gemini LLM-rubrics.
                </p>
              </div>

              <div className="pt-2 border-t border-border/50 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted">Total Scenarios:</span>
                  <span className="font-bold text-fg print:text-black">{data.stats.promptsAttempted}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted">Global Ranking:</span>
                  <span className="font-bold text-fg print:text-black">
                    {data.stats.promptPercentile !== null ? `Top ${data.stats.promptPercentile}%` : "No percentile yet"}
                  </span>
                </div>
              </div>
            </div>

            {/* Languages & Environments */}
            <div className="print-card p-6 rounded-2xl border border-border bg-surface/50 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted">
                  Environments
                </div>
                <Globe className="w-4 h-4 text-accent/80" />
              </div>

              <div className="space-y-2">
                <div className="text-4xl font-black text-fg tracking-tight tabular-nums print:text-black">
                  {data.stats.languagesUsed.length}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Unique runtime languages verified across problem environments.
                </p>
              </div>

              <div className="pt-2 border-t border-border/50">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted mb-2">
                  Active Languages
                </div>
                {data.stats.languagesUsed.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {data.stats.languagesUsed.map((lang) => (
                      <span
                        key={lang}
                        className="px-2 py-1 rounded bg-surface border border-border/70 text-[10px] font-bold text-fg print:bg-slate-100 print:text-slate-800"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted italic">No active languages tracked yet.</div>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* 4. Solved Challenges List */}
        {data.solvedChallenges.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-muted flex items-center gap-2 print:text-black">
              <Trophy className="w-4 h-4 text-accent print:text-slate-700" />
              Completed Problem Bank
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.solvedChallenges.map((challenge) => (
                <div
                  key={challenge.challengeId}
                  className="print-card flex items-center justify-between p-4 rounded-xl border border-border bg-surface hover:bg-elevated transition duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-fg truncate print:text-black">
                        {challenge.title}
                      </div>
                      <div className="text-[9px] uppercase font-black text-muted/60 mt-0.5">
                        {challenge.category || "General"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${difficultyColor[challenge.difficulty]}`}>
                      {challenge.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. Playgrounds & Pinned Snippets */}
        {data.pinnedPlaygrounds.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-muted flex items-center gap-2 print:text-black">
              <Code2 className="w-4 h-4 text-accent print:text-slate-700" />
              Featured Sandboxes & Playgrounds
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data.pinnedPlaygrounds.map((s) => (
                <Link
                  key={s.id}
                  href={`/play/${s.slug}`}
                  target="_blank"
                  className="print-card group flex flex-col justify-between p-5 rounded-2xl border border-border bg-surface/50 hover:bg-elevated transition duration-200 shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/25 grid place-items-center text-accent">
                        <Terminal className="w-4 h-4" />
                      </div>
                      {s.pinned && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-accent bg-accent/15 border border-accent/30 px-1.5 py-0.5 rounded">
                          Pinned
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-extrabold text-sm text-fg group-hover:text-accent transition truncate print:text-black">
                        {s.title}
                      </h3>
                      <p className="text-[10px] text-muted uppercase font-mono tracking-tighter">
                        Template: {s.template}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/50 text-[10px] text-muted/60">
                    <span>
                      Updated <RelativeTime iso={s.updatedAt.toISOString()} fullDateTitle={false} />
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition duration-200" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 6. Recent Mock Timeline */}
        {data.recentMocks.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-muted flex items-center gap-2 print:text-black">
              <BookOpen className="w-4 h-4 text-accent print:text-slate-700" />
              Verified Interview Timeline
            </h2>

            <div className="relative border-l border-border/70 ml-3.5 pl-6 space-y-6">
              {data.recentMocks.map((mock) => (
                <div key={mock.id} className="relative">
                  {/* Indicator Dot */}
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border border-border bg-bg grid place-items-center">
                    <span className={`w-2 h-2 rounded-full ${mock.verdict === "success" ? "bg-emerald-500" : "bg-muted"}`} />
                  </span>

                  <div className="print-card p-4 rounded-xl border border-border bg-surface/40 max-w-2xl space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <h3 className="font-bold text-sm text-fg print:text-black">
                        {mock.title}
                      </h3>
                      
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-[9px] font-bold text-muted uppercase tracking-wider">
                          {mock.sourceType} session
                        </span>
                        
                        {mock.verdict === "success" && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                            Passed
                          </span>
                        )}
                      </div>
                    </div>

                    {mock.finishedAt && (
                      <p className="text-[10px] text-muted/60 font-mono">
                        Completed <RelativeTime iso={mock.finishedAt.toISOString()} fullDateTitle={false} />
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

// Sub-component for Progress bar calculations
function ProgressBar({
  label,
  count,
  color,
  total,
}: {
  label: string;
  count: number;
  color: string;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] font-bold">
        <span className="text-muted">{label}:</span>
        <span className="text-fg tabular-nums print:text-black">
          {count} ({percentage}%)
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-border/40 overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

// Client Side Print Trigger Helper to execute window.print() correctly
function PrintTrigger() {
  return (
    <div
      style={{ display: "none" }}
      className="no-print"
      dangerouslySetInnerHTML={{
        __html: `
          <script>
            // Register a window helper so that inline custom actions trigger nicely
            window.triggerPortfolioPrint = function() {
              window.print();
            };
          </script>
        `,
      }}
    />
  );
}
