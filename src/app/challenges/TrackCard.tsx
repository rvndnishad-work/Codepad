import Link from "next/link";
import { Clock, Layers, Sparkles, Star, User } from "lucide-react";

export type TrackCardData = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  coverImage: string | null;
  tech: string;
  difficulty: string;
  featured: boolean;
  itemCount: number;
  totalMinutes: number;
  authorName: string | null;
  /** Logged-in user's progress, if they're enrolled. */
  progress?: { passed: number; status: string } | null;
};

const TECH_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  react: "React",
  vue: "Vue",
  node: "Node",
  algorithms: "Algorithms",
  general: "General",
};

const DIFF_TONE: Record<string, string> = {
  easy: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  hard: "text-rose-500 bg-rose-500/10 border-rose-500/30",
  mixed: "text-muted bg-muted/10 border-border",
};

export default function TrackCard({ track }: { track: TrackCardData }) {
  const pct =
    track.progress && track.itemCount > 0
      ? Math.round((track.progress.passed / track.itemCount) * 100)
      : null;

  return (
    <Link
      href={`/tracks/${track.slug}`}
      className="group relative flex flex-col rounded-2xl border border-border bg-panel p-5 hover:border-border-strong hover:bg-elevated transition-colors h-full"
    >
      {track.featured && (
        <span
          className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-[9px] font-black uppercase tracking-wider text-accent"
          aria-label="Staff pick"
        >
          <Star className="w-2.5 h-2.5 fill-current" />
          Staff pick
        </span>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-border text-[10px] font-bold uppercase tracking-wider text-muted">
          <Sparkles className="w-3 h-3" />
          {TECH_LABELS[track.tech] ?? track.tech}
        </span>
        <span
          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
            DIFF_TONE[track.difficulty] ?? DIFF_TONE.mixed
          }`}
        >
          {track.difficulty}
        </span>
      </div>

      <h3 className="text-fg font-black text-lg leading-snug mb-1.5 line-clamp-2">
        {track.title}
      </h3>
      {track.tagline && (
        <p className="text-muted text-xs leading-relaxed line-clamp-2 mb-4">
          {track.tagline}
        </p>
      )}

      <div className="mt-auto flex items-center gap-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Layers className="w-3 h-3" />
          {track.itemCount}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {track.totalMinutes}m
        </span>
        <span className="inline-flex items-center gap-1.5 truncate">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate">{track.authorName ?? "Interviewpad"}</span>
        </span>
      </div>

      {pct !== null && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-[10px] text-muted mb-1.5">
            <span className="uppercase tracking-wider font-bold">Your progress</span>
            <span className="font-mono tabular-nums">
              {track.progress!.passed} / {track.itemCount} · {pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-border">
            <div
              className="h-full bg-accent"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}
