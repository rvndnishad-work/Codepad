import { MapPin, Calendar, Briefcase } from "lucide-react";
import { resultClasses, difficultyClasses } from "@/lib/interview-questions/shared";

export type ExperienceCardData = {
  companyName: string | null;
  role: string | null;
  experienceLevel: string | null;
  location: string | null;
  year: number | null;
  result: string | null;
  difficulty: string | null;
  process: string | null;
  rounds: string | null;
  tips: string | null;
};

/** Interview experience writeup card. */
export default function ExperienceCard({ e, showCompany = false }: { e: ExperienceCardData; showCompany?: boolean }) {
  return (
    <div className="p-5 rounded-2xl border border-border bg-surface/40 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-extrabold text-sm">
            {showCompany && e.companyName ? `${e.companyName} · ` : ""}
            {e.role || "Candidate experience"}
          </div>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted">
            {e.experienceLevel && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{e.experienceLevel}</span>}
            {e.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</span>}
            {e.year && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{e.year}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {e.result && (
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${resultClasses(e.result)}`}>
              {e.result}
            </span>
          )}
          {e.difficulty && (
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${difficultyClasses(e.difficulty)}`}>
              {e.difficulty}
            </span>
          )}
        </div>
      </div>

      {e.process && (
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Process</div>
          <p className="text-xs text-fg/80 leading-relaxed">{e.process}</p>
        </div>
      )}
      {e.rounds && (
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Rounds</div>
          <p className="text-xs text-fg/80 leading-relaxed">{e.rounds}</p>
        </div>
      )}
      {e.tips && (
        <div className="p-3 rounded-lg border border-accent/20 bg-accent/5">
          <div className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">Tips</div>
          <p className="text-xs text-fg/80 leading-relaxed">{e.tips}</p>
        </div>
      )}
    </div>
  );
}
