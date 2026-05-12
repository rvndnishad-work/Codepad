import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Code2,
  Mail,
  Target,
  Trophy,
  User as UserIcon,
} from "lucide-react";
import RelativeTime from "@/components/RelativeTime";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, portfolioPublic: true },
  });
  if (!user || !user.portfolioPublic) return { title: "Portfolio — Interviewpad" };
  return {
    title: `${user.name ?? "Developer"} — Portfolio`,
    description: `${user.name ?? "A developer"}'s public portfolio on Interviewpad.`,
  };
}

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

const difficultyBg: Record<string, string> = {
  easy: "bg-emerald-500/10 border-emerald-500/30",
  medium: "bg-amber-500/10 border-amber-500/30",
  hard: "bg-rose-500/10 border-rose-500/30",
};

export default async function PortfolioPage({ params }: Props) {
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.portfolioPublic) notFound();

  // Solved challenges (one row per challenge — best status)
  const passedAttempts = await prisma.challengeAttempt.findMany({
    where: { userId: id, status: "passed" },
    orderBy: { finishedAt: "desc" },
    select: {
      challengeId: true,
      durationSec: true,
      finishedAt: true,
      challenge: {
        select: {
          slug: true,
          title: true,
          difficulty: true,
          category: true,
          tags: true,
        },
      },
    },
  });
  // De-dupe by challengeId (keep most recent)
  const seen = new Set<string>();
  const solvedChallenges = passedAttempts.filter((a) => {
    if (seen.has(a.challengeId)) return false;
    seen.add(a.challengeId);
    return true;
  });

  const publicSnippets = await prisma.snippet.findMany({
    where: { userId: id, visibility: "public" },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 8,
    select: {
      id: true,
      slug: true,
      title: true,
      template: true,
      updatedAt: true,
      tags: true,
    },
  });

  // Stats
  const totalSolved = solvedChallenges.length;
  const easyCount = solvedChallenges.filter((s) => s.challenge.difficulty === "easy").length;
  const mediumCount = solvedChallenges.filter((s) => s.challenge.difficulty === "medium").length;
  const hardCount = solvedChallenges.filter((s) => s.challenge.difficulty === "hard").length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/5 via-surface to-bg p-8 sm:p-10 mb-10">
        <div className="absolute -right-12 -top-12 w-60 h-60 bg-accent/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="shrink-0">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? ""}
                width={96}
                height={96}
                className="rounded-2xl border-2 border-accent/30 shadow-[0_0_24px_rgba(var(--accent-rgb),0.2)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-2 border-accent/30 bg-surface grid place-items-center">
                <UserIcon className="w-10 h-10 text-muted" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black tracking-[0.2em] uppercase text-accent mb-2">
              Developer Portfolio
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-fg mb-2">
              {user.name ?? "Developer"}
            </h1>
            {user.bio && (
              <p className="text-sm text-muted leading-relaxed max-w-2xl mb-4">{user.bio}</p>
            )}
            {user.hireMeUrl && (
              <a
                href={user.hireMeUrl}
                target={user.hireMeUrl.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold text-sm transition shadow-[0_0_20px_rgba(var(--accent-rgb),0.25)]"
              >
                {user.hireMeUrl.startsWith("mailto:") ? (
                  <Mail className="w-4 h-4" />
                ) : (
                  <Briefcase className="w-4 h-4" />
                )}
                Hire me
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <StatCard
          icon={<Trophy className="w-4 h-4 text-accent" />}
          label="Solved"
          value={totalSolved}
        />
        <StatCard
          icon={<Target className="w-4 h-4 text-emerald-500" />}
          label="Easy"
          value={easyCount}
        />
        <StatCard
          icon={<Target className="w-4 h-4 text-amber-500" />}
          label="Medium"
          value={mediumCount}
        />
        <StatCard
          icon={<Target className="w-4 h-4 text-rose-500" />}
          label="Hard"
          value={hardCount}
        />
      </div>

      {/* Solved challenges */}
      {solvedChallenges.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-4 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-accent" />
            Completed challenges
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {solvedChallenges.map((s) => (
              <li key={s.challengeId}>
                <Link
                  href={`/challenges/${s.challenge.slug}`}
                  className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-surface hover:bg-elevated hover:border-border-strong transition"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-fg/90 group-hover:text-fg truncate">
                      {s.challenge.title}
                    </div>
                    {s.challenge.category && (
                      <div className="text-[10px] uppercase tracking-wider font-bold text-muted/60 mt-0.5">
                        {s.challenge.category}
                      </div>
                    )}
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${difficultyBg[s.challenge.difficulty]} ${difficultyColor[s.challenge.difficulty]} shrink-0`}
                  >
                    {s.challenge.difficulty}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Public snippets */}
      {publicSnippets.length > 0 && (
        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-4 flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-accent" />
            Public snippets
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicSnippets.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/play/${s.slug}`}
                  className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-surface hover:bg-elevated hover:border-border-strong transition"
                >
                  <Code2 className="w-4 h-4 text-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-fg/90 group-hover:text-fg truncate">
                      {s.title}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted/60 mt-0.5">
                      {s.template} ·{" "}
                      <RelativeTime iso={s.updatedAt.toISOString()} fullDateTitle={false} />
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted/40 group-hover:text-fg transition shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Empty state */}
      {solvedChallenges.length === 0 && publicSnippets.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center mb-5">
            <Trophy className="w-6 h-6 text-accent" />
          </div>
          <h2 className="font-black text-fg text-lg">No public work yet</h2>
          <p className="text-muted text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            This developer hasn't solved any public challenges or published any snippets yet.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-surface/50">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black text-fg tabular-nums">{value}</div>
    </div>
  );
}
