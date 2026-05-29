// Shared types for the Prompt Lab client surface. Server-fetched in page.tsx
// and threaded through the client components without each one re-declaring.

export interface Scenario {
  id: string;
  slug: string;
  title: string;
  description: string;
  objective: string;
  difficulty: string;
  category: string;
  estimatedMinutes: number;
}

export interface Exemplar {
  id: string;
  scenarioId: string;
  title: string;
  summary: string;
  promptText: string;
  rubricScores: string | null; // JSON
  source: string;
}

export interface Attempt {
  id: string;
  promptText: string;
  charCount: number;
  tokenEstimate: number;
  score: number | null;
  rubricScores: string | null; // JSON
  feedback: string | null;
  graderType: string | null;
  durationSec: number | null;
  createdAt: string;
  scenarioId?: string;
  scenarioTitle: string;
  scenarioCategory: string;
  scenarioDifficulty: string;
  shared?: boolean;
  shareTitle?: string | null;
  shareNote?: string | null;
  shareUpvotes?: number;
}

export interface RubricScores {
  clarity: number;
  specificity: number;
  efficiency: number;
  context: number;
  constraints: number;
  edgeCases: number;
}

export const RUBRIC_LABELS: { key: keyof RubricScores; label: string }[] = [
  { key: "clarity", label: "Clarity & Structure" },
  { key: "specificity", label: "Technical Specificity" },
  { key: "efficiency", label: "Token Efficiency" },
  { key: "context", label: "Persona & Context" },
  { key: "constraints", label: "Constraints" },
  { key: "edgeCases", label: "Edge Cases" },
];

export function parseRubric(json: string | null | undefined): RubricScores {
  if (!json) return { clarity: 0, specificity: 0, efficiency: 0, context: 0, constraints: 0, edgeCases: 0 };
  try {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    return {
      clarity: Number(parsed.clarity || 0),
      specificity: Number(parsed.specificity || 0),
      efficiency: Number(parsed.efficiency || 0),
      context: Number(parsed.context || 0),
      constraints: Number(parsed.constraints || 0),
      edgeCases: Number(parsed.edgeCases || 0),
    };
  } catch {
    return { clarity: 0, specificity: 0, efficiency: 0, context: 0, constraints: 0, edgeCases: 0 };
  }
}

export const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  intermediate: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  advanced: "text-rose-500 bg-rose-500/10 border-rose-500/20",
};
