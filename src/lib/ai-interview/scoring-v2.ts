/**
 * Senior fix: deterministic, effort-aware scoring to replace the old
 * regex-only fallback that gave 35% for a single line (baseline 10 + 25
 * for `.{200}` matching any 200 chars, even phantom boilerplate).
 *
 * Principles:
 *  - 0 meaningful lines => 5 (no code written)
 *  - 1-2 lines => max 10 (trivial)
 *  - 3-4 lines => max 16 (low effort)
 *  - 5-9 lines => 18-30 (partial)
 *  - 10+ lines + signals => can reach 60+ (real work)
 *  Score only from candidate-authored meaningful lines, never boilerplate.
 */

import type { FileDiff } from "./diff";

export type V2ScoreInput = {
  meaningfulLines: number;
  addedLines: number;
  filesChanged: number;
  addedCode: string;
  templateId: string;
  chatHistory: { role: "user" | "assistant"; text: string }[];
};

export type V2ScoreOutput = {
  score: number;
  codeQuality: number;
  problemSolving: number;
  communication: number;
  aiSummary: string;
};

// Keep isMeaningfulLine in sync with grade.ts / diff.ts
function isMeaningfulLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 3) return false;
  if (/^[\{\}\[\]\(\)<>;:,]+$/.test(t)) return false;
  return /[A-Za-z0-9]/.test(t);
}

export function meaningfulCountFromDiffs(diffs: FileDiff[]): number {
  let n = 0;
  for (const d of diffs) for (const l of d.added) if (isMeaningfulLine(l)) n++;
  return n;
}

// Template rules with relaxed minLines gate — a single line shouldn't unlock
// pagination/stack/memo signals worth 20-35 points.
type Rule = {
  label: string;
  pattern: RegExp;
  score: number;
  codeQuality?: number;
  problemSolving?: number;
  minMeaningfulLines: number;
};

const TEMPLATE_RULES_V2: Record<string, Rule[]> = {
  "react-todo-pagination": [
    { label: "uses React state hooks", pattern: /useState/, score: 12, codeQuality: 1, minMeaningfulLines: 3 },
    { label: "establishes todo items + mutations", pattern: /todo|Todo/, score: 14, problemSolving: 1, minMeaningfulLines: 5 },
    { label: "implements pagination slicing", pattern: /slice|pagination|itemsPerPage/, score: 16, problemSolving: 2, minMeaningfulLines: 6 },
    { label: "handles prev/next disabled boundaries", pattern: /disabled/, score: 12, codeQuality: 1, minMeaningfulLines: 5 },
  ],
  "interactive-carousel": [
    { label: "uses React state hooks", pattern: /useState/, score: 8, codeQuality: 1, minMeaningfulLines: 3 },
    { label: "drives autoplay with setInterval inside useEffect", pattern: /useEffect[\s\S]{0,200}setInterval/, score: 18, problemSolving: 2, minMeaningfulLines: 7 },
    { label: "clears interval to avoid leaks", pattern: /clearInterval/, score: 10, codeQuality: 1, minMeaningfulLines: 5 },
    { label: "pauses on hover (onMouseEnter/Leave)", pattern: /onMouseEnter[\s\S]{0,200}onMouseLeave/, score: 14, problemSolving: 1, minMeaningfulLines: 5 },
  ],
  "valid-parentheses-stack": [
    { label: "uses an explicit stack structure", pattern: /push|pop|stack/, score: 18, problemSolving: 2, minMeaningfulLines: 5 },
    { label: "maps closing brackets to openers", pattern: /pairs|map/, score: 12, problemSolving: 1, minMeaningfulLines: 5 },
    { label: "checks empty-stack at end", pattern: /length\s*===\s*0|isEmpty|!stack\.length/, score: 12, codeQuality: 1, minMeaningfulLines: 4 },
  ],
  "dynamic-fibonacci": [
    { label: "uses a memoization cache", pattern: /memo|cache|dp/, score: 20, problemSolving: 2, minMeaningfulLines: 5 },
    { label: "checks memo before recurring", pattern: /memo\[|cache\[/, score: 14, codeQuality: 1, minMeaningfulLines: 5 },
    { label: "linear-time recursive structure", pattern: /fibonacci\s*\(\s*n\s*-\s*1/, score: 10, codeQuality: 1, minMeaningfulLines: 4 },
  ],
};

// Generic fallback — the old one gave 25 points for any 200 chars, letting
// a single long line reach 35%. V2 requires real effort.
const GENERIC_RULES_V2: Rule[] = [
  { label: "wrote a meaningful amount of code (10+ lines)", pattern: /[\s\S]{300,}/, score: 18, problemSolving: 1, minMeaningfulLines: 10 },
  { label: "uses React hooks", pattern: /\buse[A-Z]\w+/, score: 10, codeQuality: 1, minMeaningfulLines: 4 },
  { label: "exports a component or function", pattern: /export\s+(default\s+)?(function|const|class)/, score: 10, codeQuality: 1, minMeaningfulLines: 3 },
  { label: "implements control flow / logic", pattern: /if\s*\(|for\s*\(|while\s*\(|\.map\(|\.filter\(|switch/, score: 8, problemSolving: 1, minMeaningfulLines: 5 },
];

function rulesFor(templateId: string): Rule[] {
  return TEMPLATE_RULES_V2[templateId] ?? GENERIC_RULES_V2;
}

function effortBaseScore(meaningfulLines: number): number {
  if (meaningfulLines === 0) return 0;
  if (meaningfulLines === 1) return 4;
  if (meaningfulLines === 2) return 7;
  if (meaningfulLines <= 4) return 10;
  if (meaningfulLines <= 9) return 14;
  if (meaningfulLines <= 15) return 20;
  if (meaningfulLines <= 25) return 26;
  return 32;
}

export function computeV2Score(input: V2ScoreInput): V2ScoreOutput {
  const { meaningfulLines, addedCode, templateId, chatHistory } = input;

  // Zero / trivial effort — deterministic low score, no signal credit
  if (meaningfulLines === 0) {
    return {
      score: 5,
      codeQuality: 1,
      problemSolving: 1,
      communication: chatHistory.filter((c) => c.role === "user").length >= 4 ? 2 : 1,
      aiSummary: "- [Flaw] No meaningful code authored — starter untouched or only whitespace.",
    };
  }
  if (meaningfulLines <= 2) {
    const comm = chatHistory.filter((c) => c.role === "user").length >= 4 ? 2 : 1;
    return {
      score: meaningfulLines === 1 ? 7 : 9,
      codeQuality: 1,
      problemSolving: 1,
      communication: comm,
      aiSummary: `- [Flaw] Only ${meaningfulLines} meaningful line(s) authored — trivial change, not a solution.\n- [Flaw] Missing signal: substantial logic required.`,
    };
  }

  let score = effortBaseScore(meaningfulLines);
  let codeQuality = 1;
  let problemSolving = 1;
  const strengths: string[] = [];
  const flaws: string[] = [];

  const rules = rulesFor(templateId);
  for (const r of rules) {
    if (meaningfulLines < r.minMeaningfulLines) {
      flaws.push(`Missing signal: code does not ${r.label} (needs ≥${r.minMeaningfulLines} lines).`);
      continue;
    }
    if (r.pattern.test(addedCode)) {
      score += r.score;
      codeQuality += r.codeQuality ?? 0;
      problemSolving += r.problemSolving ?? 0;
      strengths.push(`Code ${r.label}.`);
    } else {
      flaws.push(`Missing signal: code does not ${r.label}.`);
    }
  }

  // Communication — capped by effort (single line + chatty ≠ good score)
  const userTurns = chatHistory.filter((c) => c.role === "user").length;
  let communication = 2;
  if (userTurns >= 8) communication = 4;
  else if (userTurns >= 4) communication = 3;
  else flaws.push("Minimal communication with the interviewer.");
  if (meaningfulLines <= 4) communication = Math.min(communication, 2);
  if (meaningfulLines <= 9) communication = Math.min(communication, 3);

  if (strengths.length === 0 && meaningfulLines < 10) {
    flaws.unshift("No substantial logic detected in diff.");
  }

  const bullets = [...strengths.map((s) => `+ [Strength] ${s}`), ...flaws.map((f) => `- [Flaw] ${f}`)];

  // Hard caps by effort — even if many regexes somehow match short code
  let cappedScore = Math.min(100, score);
  if (meaningfulLines <= 4) cappedScore = Math.min(cappedScore, 16);
  else if (meaningfulLines <= 9) cappedScore = Math.min(cappedScore, 34);
  else if (meaningfulLines <= 15) cappedScore = Math.min(cappedScore, 58);

  return {
    score: Math.round(cappedScore),
    codeQuality: Math.min(5, Math.max(1, codeQuality)),
    problemSolving: Math.min(5, Math.max(1, problemSolving)),
    communication: Math.min(5, Math.max(1, communication)),
    aiSummary: bullets.join("\n"),
  };
}

// Post-Gemini clamp — ensures even LLM hallucination can't give 35% for 1 line
export function clampV2ScoreForEffort(score: number, meaningfulLines: number): number {
  if (meaningfulLines === 0) return Math.min(score, 6);
  if (meaningfulLines === 1) return Math.min(score, 10);
  if (meaningfulLines === 2) return Math.min(score, 12);
  if (meaningfulLines <= 4) return Math.min(score, 16);
  if (meaningfulLines <= 9) return Math.min(score, 34);
  return score;
}
