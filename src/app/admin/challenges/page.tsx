import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit3 } from "lucide-react";
import AdminChallengeRow from "./AdminChallengeRow";

export default async function AdminChallengesPage() {
  const rows = await prisma.challenge.findMany({
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Challenges</h2>
          <p className="text-sm text-muted mt-1">
            {rows.length} {rows.length === 1 ? "challenge" : "challenges"} total
          </p>
        </div>
        <Link
          href="/admin/challenges/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition"
        >
          <Plus className="w-3.5 h-3.5" />
          New Challenge
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <p className="text-muted text-sm">No challenges yet.</p>
          <Link
            href="/admin/challenges/new"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Create the first one
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elevated/50 text-[10px] uppercase tracking-[0.15em] text-muted">
              <tr>
                <th className="text-left px-4 py-3 font-bold">Title</th>
                <th className="text-left px-4 py-3 font-bold">Difficulty</th>
                <th className="text-left px-4 py-3 font-bold">Category</th>
                <th className="text-left px-4 py-3 font-bold">Attempts</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
                <th className="text-right px-4 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <AdminChallengeRow
                  key={c.id}
                  challenge={{
                    id: c.id,
                    slug: c.slug,
                    title: c.title,
                    difficulty: c.difficulty,
                    category: c.category,
                    published: c.published,
                    attempts: c._count.attempts,
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
