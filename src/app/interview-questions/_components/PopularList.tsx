import Link from "next/link";
import { Eye } from "lucide-react";
import { compactNumber, parseJsonArray } from "@/lib/interview-questions/shared";
import { topicName } from "@/lib/interview-questions/topic-catalog";
import { TopicLogo } from "./TopicLogo";
import { DifficultyLabel } from "./Difficulty";

export type PopularQuestion = {
  title: string;
  slug: string;
  difficulty: string;
  technology: string | null;
  round: string | null;
  views: number;
  yearsAsked: string;
  company?: { name: string; slug: string } | null;
};

/** Ranked list of the most viewed questions; two columns read top to bottom on wide screens. */
export default function PopularList({ questions }: { questions: PopularQuestion[] }) {
  const half = Math.ceil(questions.length / 2);
  return (
    <ol
      className="grid grid-cols-1 gap-x-2 rounded-2xl border border-border bg-surface p-1 sm:p-2 lg:grid-flow-col lg:grid-cols-2"
      style={{ gridTemplateRows: `repeat(${half}, auto)` }}
    >
      {questions.map((q, i) => {
        const tech = q.technology ? topicName(q.technology) : null;
        const round = q.round && q.round.toLowerCase() !== tech?.toLowerCase() ? q.round : null;
        const years = parseJsonArray<number>(q.yearsAsked).sort((a, b) => b - a).slice(0, 3);
        const short = [tech, q.company?.name].filter(Boolean).join(" · ");
        const extra = [round, years.length ? `asked ${years.join(", ")}` : null].filter(Boolean).join(" · ");
        return (
          <li key={q.slug} className="contents">
            <Link
              href={`/interview-question/${q.slug}`}
              className="iq-row flex min-h-[84px] items-center gap-3 rounded-xl px-3.5 py-3 hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:gap-[18px] sm:px-[22px]"
            >
              <span
                className={`w-[26px] shrink-0 font-mono text-[15px] font-medium tabular-nums sm:w-[34px] sm:text-xl ${
                  i === 0 ? "text-accent" : "text-subtle"
                }`}
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <h3 className="iq-name line-clamp-2 text-[15px] font-semibold leading-snug text-fg sm:line-clamp-1 sm:text-base">
                  {q.title}
                </h3>
                <p className="flex min-w-0 items-center gap-[7px] text-[13px] text-subtle">
                  <TopicLogo slug={q.technology} size={14} />
                  <span className="truncate">
                    {short}
                    {extra && <span className="hidden sm:inline"> · {extra}</span>}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <DifficultyLabel difficulty={q.difficulty} className="text-xs sm:text-[13px]" />
                <span className="flex items-center gap-1 text-xs text-subtle">
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">Views:</span>
                  {compactNumber(q.views)}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
