import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Sparkles, BookOpen, HelpCircle, Briefcase, Store, ArrowRight, type LucideIcon } from "lucide-react";

/**
 * "From creators you follow" — latest published content across the spaces the
 * user follows (free follows AND paid memberships). Self-hides when the user
 * follows nothing, so the dashboard stays clean for everyone else.
 */

type FeedEntry = {
  key: string;
  kind: "TUTORIAL" | "INTERVIEW_QA" | "INTERVIEW_EXPERIENCE";
  title: string;
  summary: string | null;
  href: string;
  updatedAt: Date;
  spaceName: string;
  spaceHandle: string;
  spaceAvatar: string | null;
};

const KIND_META: Record<FeedEntry["kind"], { label: string; Icon: LucideIcon; tone: string }> = {
  TUTORIAL: { label: "Tutorial", Icon: BookOpen, tone: "text-violet-500 bg-violet-500/10 border-violet-500/25" },
  INTERVIEW_QA: { label: "Interview Q&A", Icon: HelpCircle, tone: "text-rose-500 bg-rose-500/10 border-rose-500/25" },
  INTERVIEW_EXPERIENCE: { label: "Experience", Icon: Briefcase, tone: "text-sky-500 bg-sky-500/10 border-sky-500/25" },
};

function relDate(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function DashboardCreatorFeed({ userId }: { userId: string }) {
  const [follows, memberships] = await Promise.all([
    prisma.spaceFollow.findMany({ where: { userId }, select: { spaceId: true } }),
    prisma.spaceMembership.findMany({
      where: { subscriberId: userId, status: "active" },
      select: { spaceId: true },
    }),
  ]);
  const spaceIds = [...new Set([...follows.map((f) => f.spaceId), ...memberships.map((m) => m.spaceId)])];
  if (spaceIds.length === 0) return null;

  const [spaces, tutorials, qas, experiences] = await Promise.all([
    prisma.creatorSpace.findMany({
      where: { id: { in: spaceIds }, published: true },
      select: { id: true, name: true, handle: true, avatarUrl: true },
    }),
    prisma.tutorial.findMany({
      where: { spaceId: { in: spaceIds }, published: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, spaceId: true, slug: true, title: true, summary: true, updatedAt: true },
    }),
    prisma.interviewQA.findMany({
      where: { spaceId: { in: spaceIds }, published: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, spaceId: true, slug: true, title: true, summary: true, updatedAt: true },
    }),
    prisma.interviewExperience.findMany({
      where: { spaceId: { in: spaceIds }, published: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, spaceId: true, slug: true, title: true, summary: true, updatedAt: true },
    }),
  ]);

  const spaceById = new Map(spaces.map((s) => [s.id, s]));
  const toEntry = (
    kind: FeedEntry["kind"],
    row: { id: string; spaceId: string; slug: string; title: string; summary: string | null; updatedAt: Date },
    path: string,
  ): FeedEntry | null => {
    const space = spaceById.get(row.spaceId);
    if (!space) return null;
    return {
      key: `${kind}:${row.id}`,
      kind,
      title: row.title,
      summary: row.summary,
      href: `/c/${space.handle}/${path}/${row.slug}`,
      updatedAt: row.updatedAt,
      spaceName: space.name,
      spaceHandle: space.handle,
      spaceAvatar: space.avatarUrl,
    };
  };

  const entries = [
    ...tutorials.map((t) => toEntry("TUTORIAL", t, "tutorials")),
    ...qas.map((q) => toEntry("INTERVIEW_QA", q, "interview")),
    ...experiences.map((e) => toEntry("INTERVIEW_EXPERIENCE", e, "experience")),
  ]
    .filter((e): e is FeedEntry => e !== null)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 6);

  if (entries.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-bold text-fg flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" /> From creators you follow
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map((e) => {
          const meta = KIND_META[e.kind];
          return (
            <Link
              key={e.key}
              href={e.href}
              className="group rounded-2xl border border-border bg-surface p-4 shadow-tile hover:border-accent/30 transition-colors flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${meta.tone}`}
                >
                  <meta.Icon className="w-2.5 h-2.5" /> {meta.label}
                </span>
                <span className="text-[10px] text-muted">{relDate(e.updatedAt)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-fg group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                  {e.title}
                </div>
                {e.summary && <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">{e.summary}</p>}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                {e.spaceAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.spaceAvatar} alt="" className="w-5 h-5 rounded-md border border-border object-cover shrink-0" />
                ) : (
                  <span className="w-5 h-5 rounded-md bg-accent/10 border border-accent/20 grid place-items-center text-accent shrink-0">
                    <Store className="w-3 h-3" />
                  </span>
                )}
                <span className="text-[11px] font-semibold text-muted truncate">{e.spaceName}</span>
                <ArrowRight className="w-3 h-3 text-muted/50 ml-auto shrink-0 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
