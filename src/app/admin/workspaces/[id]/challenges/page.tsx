import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Edit3, Target, ExternalLink } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Workspace challenges — Interviewpad Admin",
};

const DIFFICULTY_BADGES: Record<string, string> = {
  EASY: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.06] border-emerald-500/20",
  MEDIUM: "text-amber-600 dark:text-amber-400 bg-amber-500/[0.06] border-amber-500/20",
  HARD: "text-rose-600 dark:text-rose-400 bg-rose-500/[0.06] border-rose-500/20",
};

export default async function WorkspaceChallengesPage({ params }: Props) {
  const { id } = await params;

  const ws = await prisma.workspace.findUnique({ where: { id }, select: { id: true } });
  if (!ws) notFound();

  const challenges = await prisma.challenge.findMany({
    where: { workspaceId: id },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      category: true,
      published: true,
      estimatedMinutes: true,
      updatedAt: true,
      _count: { select: { attempts: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-fg">Private challenges</h3>
          <p className="text-xs text-muted mt-0.5">
            {challenges.length} {challenges.length === 1 ? "challenge" : "challenges"} authored by this workspace
          </p>
        </div>
        <Link
          href={`/admin/challenges/new?workspaceId=${id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-bg text-[11px] font-semibold uppercase tracking-wider hover:bg-accent-soft transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New challenge
        </Link>
      </div>

      {challenges.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mx-auto mb-3">
            <Target className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-fg">No challenges yet</p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            This workspace hasn&apos;t authored any private challenges. Create one to make it available to candidates in this workspace only.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-elevated/60 border-b border-border text-muted uppercase text-[10px] tracking-[0.14em]">
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Difficulty</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold text-right tabular-nums">Attempts</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {challenges.map((c) => (
                <tr key={c.id} className="hover:bg-panel/30 transition-colors">
                  <td className="px-4 py-3 align-middle">
                    <Link
                      href={`/admin/challenges/${c.id}/edit`}
                      className="font-semibold text-fg hover:text-accent transition-colors"
                    >
                      {c.title}
                    </Link>
                    <div className="text-[11px] text-muted/70 font-mono mt-0.5">/{c.slug}</div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${
                        DIFFICULTY_BADGES[c.difficulty] || ""
                      }`}
                    >
                      {c.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle text-xs text-muted">{c.category || "—"}</td>
                  <td className="px-4 py-3 align-middle text-right tabular-nums text-xs font-semibold text-fg">
                    {c._count.attempts}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {c.published ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Published
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted/60 italic">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Link
                        href={`/admin/challenges/${c.id}/edit`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-panel/40 border border-border hover:border-accent/40 text-[10px] font-semibold uppercase tracking-wider text-muted hover:text-fg transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </Link>
                      {c.published && (
                        <Link
                          href={`/play/${c.slug}`}
                          target="_blank"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-panel/40 border border-border hover:border-accent/40 text-muted hover:text-fg transition-colors"
                          title="Open public page"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
