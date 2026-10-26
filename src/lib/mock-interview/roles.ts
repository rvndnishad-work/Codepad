/**
 * Developer mock interviews: who runs the interview, the roles a developer
 * can practise for, and the question picks that make up a session. Pure, so
 * the setup page, the API route and tests share it.
 */

/** "ai": the AI interviewer asks the picked questions. "peer": two developers, one interviews the other. */
export type MockMode = "ai" | "peer";

/** In peer mode, the seat the person setting it up takes. */
export type PeerSeat = "candidate" | "interviewer";

export type MockLevel = "junior" | "mid" | "senior";

/**
 * Where a question comes from in the public library:
 * - "question": a talk-through question from the interview questions bank,
 * - "design": a system design question from the same bank,
 * - "coding": a coding problem from the public challenges.
 */
export type PickKind = "question" | "design" | "coding";

export type MockPick = {
  kind: PickKind;
  /** PrepQuestion id for question and design picks, Challenge id for coding picks. */
  id: string;
  title: string;
  /** Topic or category label, for display only. */
  topic: string | null;
  difficulty: string;
  /** Rough minutes this pick takes in the interview. */
  minutes: number;
};

export type MockRole = {
  id: string;
  label: string;
  blurb: string;
  /** Question bank technologies for this role, most relevant first. */
  techs: string[];
  /** Challenge categories for this role's coding problems. */
  coding: string[];
  /** Whether system design belongs in a suggested set. */
  design: boolean;
  /** Suggested mix: talk-through questions, design questions, coding problems. */
  mix: { question: number; design: number; coding: number };
};

export const MOCK_ROLES: MockRole[] = [
  {
    id: "frontend",
    label: "Frontend engineer",
    blurb: "React, JavaScript, the browser and UI coding.",
    techs: ["reactjs", "javascript", "typescript", "machine-coding", "nextjs", "vuejs", "angular"],
    coding: ["Frontend UI", "Frontend"],
    design: false,
    mix: { question: 4, design: 0, coding: 1 },
  },
  {
    id: "backend",
    label: "Backend engineer",
    blurb: "Node.js, Python, databases and APIs.",
    techs: ["nodejs", "python", "sql", "typescript"],
    coding: ["DSA"],
    design: true,
    mix: { question: 3, design: 1, coding: 1 },
  },
  {
    id: "fullstack",
    label: "Full stack engineer",
    blurb: "A bit of everything, front to back.",
    techs: ["reactjs", "nodejs", "javascript", "nextjs", "sql", "typescript"],
    coding: ["Frontend", "DSA"],
    design: true,
    mix: { question: 3, design: 1, coding: 1 },
  },
  {
    id: "dsa",
    label: "Algorithms round",
    blurb: "Data structures, complexity and problem solving.",
    techs: ["dsa"],
    coding: ["DSA"],
    design: false,
    mix: { question: 2, design: 0, coding: 2 },
  },
  {
    id: "system-design",
    label: "System design round",
    blurb: "Scaling, storage, trade-offs and architecture.",
    techs: ["system-design"],
    coding: [],
    design: true,
    mix: { question: 0, design: 3, coding: 0 },
  },
  {
    id: "ai",
    label: "AI engineer",
    blurb: "LLMs, retrieval, evaluation and Python.",
    techs: ["ai-engineering", "python"],
    coding: ["DSA"],
    design: false,
    mix: { question: 4, design: 0, coding: 1 },
  },
];

export const MOCK_LEVELS: { id: MockLevel; label: string; hint: string }[] = [
  { id: "junior", label: "Junior", hint: "0 to 2 years" },
  { id: "mid", label: "Mid level", hint: "2 to 5 years" },
  { id: "senior", label: "Senior", hint: "5 years or more" },
];

export function roleById(id: string | null | undefined): MockRole {
  return MOCK_ROLES.find((r) => r.id === id) ?? MOCK_ROLES[0];
}

/** Difficulties a suggested set draws from, easiest first. */
export function levelDifficulties(level: MockLevel): string[] {
  if (level === "junior") return ["easy", "medium"];
  if (level === "senior") return ["hard", "medium"];
  return ["medium", "easy", "hard"];
}

/** Most picks one session holds: enough for a long interview, few enough to finish. */
export const MAX_PICKS = 12;
/** Most coding problems in one session. */
export const MAX_CODING = 4;

/** Minutes a talk-through question takes, follow-ups included. */
export const QUESTION_MINUTES = 4;
/** Minutes a system design question takes. */
export const DESIGN_MINUTES = 15;

export function pickMinutes(kind: PickKind, challengeMinutes?: number | null): number {
  if (kind === "coding") return Math.min(90, Math.max(10, challengeMinutes || 30));
  return kind === "design" ? DESIGN_MINUTES : QUESTION_MINUTES;
}

export function totalMinutes(picks: Pick<MockPick, "minutes">[]): number {
  return picks.reduce((n, p) => n + p.minutes, 0);
}

export const pickKey = (p: Pick<MockPick, "kind" | "id">) => `${p.kind === "coding" ? "c" : "q"}:${p.id}`;

/**
 * Groups the running order into interview rounds: consecutive talk-through
 * and design picks become one spoken round, each coding pick its own round.
 * The AI interviewer runs the rounds in this order.
 */
export function groupRounds<T extends Pick<MockPick, "kind">>(picks: T[]): ({ kind: "talk"; picks: T[] } | { kind: "coding"; pick: T })[] {
  const out: ({ kind: "talk"; picks: T[] } | { kind: "coding"; pick: T })[] = [];
  for (const p of picks) {
    if (p.kind === "coding") {
      out.push({ kind: "coding", pick: p });
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.kind === "talk") last.picks.push(p);
    else out.push({ kind: "talk", picks: [p] });
  }
  return out;
}

/** AI interviewer settings a developer can change. */
export type AiSettings = {
  answerMode: "voice" | "typing";
  followUps: 0 | 1 | 2;
  secondsPerQuestion: 60 | 120 | 180 | 300;
};

export const DEFAULT_AI_SETTINGS: AiSettings = { answerMode: "voice", followUps: 1, secondsPerQuestion: 180 };

export function sanitizeAiSettings(raw: unknown): AiSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const secs = Number(o.secondsPerQuestion);
  const fu = Number(o.followUps);
  return {
    answerMode: o.answerMode === "typing" ? "typing" : "voice",
    followUps: fu === 0 || fu === 2 ? fu : 1,
    secondsPerQuestion: secs === 60 || secs === 120 || secs === 300 ? secs : 180,
  };
}

/** Peer interview lengths offered, in minutes. */
export const PEER_LENGTHS = [30, 45, 60, 90] as const;

/** A sensible peer length for the picked questions, rounded up to an offered length. */
export function suggestedPeerLength(picks: Pick<MockPick, "minutes">[]): number {
  const need = totalMinutes(picks) + 5;
  return PEER_LENGTHS.find((m) => m >= need) ?? PEER_LENGTHS[PEER_LENGTHS.length - 1];
}

/** Title shown in history and in the room. */
export function sessionTitle(mode: MockMode, role: MockRole, level: MockLevel): string {
  const lvl = MOCK_LEVELS.find((l) => l.id === level)?.label ?? "";
  return `${lvl} ${role.label.toLowerCase()} mock${mode === "ai" ? " with AI" : ""}`.trim();
}
