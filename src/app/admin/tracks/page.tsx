import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  Plus,
  Star,
} from "lucide-react";

export default async function AdminTracksPage() {
  const tracks = await prisma.challengeTrack.findMany({
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    include: {
      _count: { select: { items: true, enrollments: true } },
      author: { select: { id: true, name: true, email: true } },
    },
  });

  const counts = {
    total: tracks.length,
    published: tracks.filter((t) => t.published).length,
    featured: tracks.filter((t) => t.featured).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Tracks</h2>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Curate ordered groups of challenges (e.g.{" "}
            <strong className="text-fg">JavaScript Series</strong>,{" "}
            <strong className="text-fg">React Hooks Kata</strong>). Tracks layer
            on top of existing challenges and surface in{" "}
            <strong className="text-fg">/challenges</strong> once published.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-bold">
              <Layers className="w-3 h-3" />
              {counts.total} total
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
              <CheckCircle2 className="w-3 h-3" />
              {counts.published} published
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
              <Star className="w-3 h-3" />
              {counts.featured} featured
            </span>
          </div>
        </div>

        <Link
          href="/admin/tracks/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-bg text-sm font-black hover:bg-accent-soft transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          New track
        </Link>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4 text-muted">
            <Layers className="w-6 h-6" />
          </div>
          <p className="text-muted text-sm font-medium mb-4">
            No tracks yet. Create your first curated series.
          </p>
          <Link
            href="/admin/tracks/new"
            className="text-xs font-bold text-accent hover:underline"
          >
            Create a track →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <ul className="divide-y divide-border/50">
            {tracks.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/tracks/${t.id}/edit`}
                  className="group flex items-center gap-4 px-5 py-4 hover:bg-elevated/30 transition"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                      t.published
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                        : "bg-muted/10 border-border text-muted"
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-fg truncate">{t.title}</span>
                      {t.featured && (
                        <Star className="w-3.5 h-3.5 text-accent fill-accent shrink-0" />
                      )}
                      <TechChip tech={t.tech} />
                      <DifficultyChip difficulty={t.difficulty} />
                    </div>
                    <div className="text-xs text-muted truncate font-mono mt-0.5">
                      /{t.slug}
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end text-[10px] text-muted shrink-0 tabular-nums">
                    <span>
                      {t._count.items}{" "}
                      {t._count.items === 1 ? "challenge" : "challenges"}
                    </span>
                    <span>
                      {t._count.enrollments}{" "}
                      {t._count.enrollments === 1 ? "learner" : "learners"}
                    </span>
                  </div>
                  <div className="flex items-center shrink-0">
                    {t.published ? (
                      <Eye className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted" />
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted/40 group-hover:text-fg shrink-0 transition" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3 items-start">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-muted leading-relaxed">
          Phase A: admins author tracks here. User-authored tracks come in Phase
          B — same data model, just a new permission and a moderation step.
        </div>
      </div>
    </div>
  );
}

function TechChip({ tech }: { tech: string }) {
  const label = TECH_LABELS[tech] ?? tech;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-border text-[10px] font-bold uppercase tracking-wider text-muted">
      {label}
    </span>
  );
}

function DifficultyChip({ difficulty }: { difficulty: string }) {
  const tone =
    difficulty === "easy"
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      : difficulty === "medium"
      ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
      : difficulty === "hard"
      ? "text-rose-500 bg-rose-500/10 border-rose-500/30"
      : "text-muted bg-muted/10 border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${tone}`}
    >
      {difficulty}
    </span>
  );
}

export const TECH_LABELS: Record<string, string> = {
  javascript: "JS",
  typescript: "TS",
  react: "React",
  vue: "Vue",
  node: "Node",
  algorithms: "Algo",
  general: "General",
};
