import Link from "next/link";
import { Eye, Heart } from "lucide-react";
import { difficultyClasses, techLabel, parseJsonArray, compactNumber } from "@/lib/interview-questions/shared";

export type QuestionCardData = {
  title: string;
  slug: string;
  difficulty: string;
  technology: string | null;
  round: string | null;
  views: number;
  likes: number;
  yearsAsked: string;
  company?: { name: string; slug: string } | null;
};

/** Compact question row used in company / technology listings. */
export default function QuestionCard({ q, showCompany = true }: { q: QuestionCardData; showCompany?: boolean }) {
  const years = parseJsonArray<number>(q.yearsAsked).sort((a, b) => b - a);
  return (
    <Link
      href={`/interview-question/${q.slug}`}
      className="block p-4 rounded-xl border border-border bg-surface/40 hover:border-accent/40 hover:bg-surface/70 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-sm leading-snug hover:text-accent transition-colors">{q.title}</h3>
        <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${difficultyClasses(q.difficulty)}`}>
          {q.difficulty}
        </span>
      </div>
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2.5 text-[11px] text-muted">
        {q.technology && (
          <span className="font-bold text-fg/70">{techLabel(q.technology)}</span>
        )}
        {q.round && <span>· {q.round}</span>}
        {showCompany && q.company && <span>· {q.company.name}</span>}
        {years.length > 0 && <span>· Asked {years.slice(0, 3).join(", ")}</span>}
        <span className="flex items-center gap-1 ml-auto">
          <Eye className="w-3 h-3" />
          {compactNumber(q.views)}
        </span>
        <span className="flex items-center gap-1">
          <Heart className="w-3 h-3" />
          {compactNumber(q.likes)}
        </span>
      </div>
    </Link>
  );
}
