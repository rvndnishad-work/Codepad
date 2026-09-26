/**
 * Live room toolbox: the tools an interviewer can switch on mid interview
 * (whiteboard, code pad, notes, question card, ranking board, timer), which
 * one is presented, and who may change what. Pure, shared by the relay
 * route and the room UI.
 */
import { parsePanel } from "./wizard";

/**
 * Adding a tool: add its id here and its entry in TOOL_DEFS below, then
 * register its UI in src/app/interview/[id]/tools/registry.tsx. TypeScript
 * fails the build until every id has both. The full checklist is in
 * docs/interview-room-tools.md.
 */
export const TOOL_IDS = ["whiteboard", "code", "notes", "question", "ranking", "timer"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

/** Interview formats a tool is switched on for by default. "legacy" covers
 * interviews set up before formats existed. */
type DefaultFor = "coding" | "discussion" | "mixed" | "behavioural" | "intro" | "legacy";

export type ToolDef = {
  id: ToolId;
  label: string;
  blurb: string;
  goodFor: string[];
  /** Opens on the big shared stage. False for dock-only tools like the timer. */
  stage: boolean;
  defaultFor: DefaultFor[];
};

const TOOL_DEFS: { [K in ToolId]: Omit<ToolDef, "id"> } = {
  whiteboard: {
    label: "Whiteboard",
    blurb: "Draw boxes and arrows together to talk through an idea.",
    goodFor: ["System design", "Product", "Managerial"],
    stage: true,
    defaultFor: ["coding", "discussion", "mixed", "legacy"],
  },
  code: {
    label: "Code pad",
    blurb: "A light shared editor for a snippet, a query or pseudo code.",
    goodFor: ["Technical"],
    stage: true,
    defaultFor: ["mixed", "legacy"],
  },
  notes: {
    label: "Shared notes",
    blurb: "A shared page for a written answer, a plan or a draft email.",
    goodFor: ["Any round"],
    stage: true,
    defaultFor: ["discussion", "behavioural", "intro"],
  },
  question: {
    label: "Question card",
    blurb: "Show the candidate one question or scenario, big and clear.",
    goodFor: ["Behavioural", "Managerial", "Any round"],
    stage: true,
    defaultFor: ["behavioural", "intro"],
  },
  ranking: {
    label: "Ranking board",
    blurb: "Give a list to put in order: priorities, trade-offs, a backlog.",
    goodFor: ["Managerial", "Product"],
    stage: true,
    defaultFor: [],
  },
  timer: {
    label: "Timer",
    blurb: "A countdown both sides can see, for timed exercises.",
    goodFor: ["Any round"],
    stage: false,
    defaultFor: ["coding", "discussion", "mixed", "behavioural"],
  },
};

/** Tools in dock order. */
export const TOOLS: ToolDef[] = TOOL_IDS.map((id) => ({ id, ...TOOL_DEFS[id] }));

export const TOOL_BY_ID: Record<ToolId, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<ToolId, ToolDef>;

export const CODE_LANGS = ["javascript", "typescript", "python", "sql", "html", "css", "text"] as const;
export type CodeLang = (typeof CODE_LANGS)[number];

export type TimerState = {
  durationSec: number;
  /** Epoch ms when it hits zero; null while paused or not started. */
  endsAt: number | null;
  /** Seconds left while paused. */
  remainingSec: number;
};

export type ToolsState = {
  enabled: ToolId[];
  presented: ToolId | null;
  question: { text: string; at: number } | null;
  timer: TimerState | null;
  rev: number;
};

export type ToolsAction =
  | { type: "enable"; tool: ToolId; on: boolean }
  | { type: "present"; tool: ToolId | null }
  | { type: "question"; text: string | null }
  | { type: "timer"; op: "set"; seconds: number }
  | { type: "timer"; op: "start" | "pause" | "reset" | "clear" };

export const MAX_QUESTION = 2000;
/** Window event the interviewer guide fires to put a question on the card. */
export const ASK_EVENT = "interview-tools:ask";
export const MAX_TIMER_SEC = 3 * 60 * 60;

/** Tools switched on when an interview of this format opens. */
export function defaultTools(format: string | null | undefined): ToolId[] {
  const key: DefaultFor = format === "coding" || format === "discussion" || format === "mixed" || format === "behavioural" || format === "intro" ? format : "legacy";
  return TOOL_IDS.filter((id) => TOOL_DEFS[id].defaultFor.includes(key));
}

export function isToolId(v: unknown): v is ToolId {
  return typeof v === "string" && (TOOL_IDS as readonly string[]).includes(v);
}

function sortTools(ids: ToolId[]): ToolId[] {
  return TOOL_IDS.filter((t) => ids.includes(t));
}

export function initialTools(enabled: ToolId[]): ToolsState {
  return { enabled: sortTools(enabled), presented: null, question: null, timer: null, rev: 0 };
}

export function parseTools(raw: string | null | undefined, format: string | null | undefined): ToolsState {
  const fallback = initialTools(defaultTools(format));
  if (!raw) return fallback;
  try {
    const j = JSON.parse(raw) as Partial<ToolsState>;
    const enabled = Array.isArray(j.enabled) ? sortTools(j.enabled.filter(isToolId)) : fallback.enabled;
    const presented = isToolId(j.presented) && enabled.includes(j.presented) && TOOL_BY_ID[j.presented].stage ? j.presented : null;
    const q = j.question && typeof j.question.text === "string" ? { text: j.question.text.slice(0, MAX_QUESTION), at: Number(j.question.at) || 0 } : null;
    const t = j.timer;
    const timer =
      t && Number.isFinite(t.durationSec)
        ? {
            durationSec: clampTimer(t.durationSec),
            endsAt: typeof t.endsAt === "number" && Number.isFinite(t.endsAt) ? t.endsAt : null,
            remainingSec: clampTimer(Number(t.remainingSec) || 0),
          }
        : null;
    return { enabled, presented, question: q, timer, rev: Number(j.rev) || 0 };
  } catch {
    return fallback;
  }
}

function clampTimer(n: number): number {
  return Math.max(0, Math.min(MAX_TIMER_SEC, Math.round(n)));
}

export function timerRemaining(timer: TimerState | null, now: number): number {
  if (!timer) return 0;
  if (timer.endsAt == null) return timer.remainingSec;
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

/** Applies one interviewer action. Returns null when it changes nothing. */
export function applyToolsAction(s: ToolsState, a: ToolsAction, now: number): ToolsState | null {
  const next = (p: Partial<ToolsState>): ToolsState => ({ ...s, ...p, rev: s.rev + 1 });
  switch (a.type) {
    case "enable": {
      if (!isToolId(a.tool)) return null;
      const has = s.enabled.includes(a.tool);
      if (has === a.on) return null;
      const enabled = sortTools(a.on ? [...s.enabled, a.tool] : s.enabled.filter((t) => t !== a.tool));
      return next({
        enabled,
        presented: !a.on && s.presented === a.tool ? null : s.presented,
        timer: !a.on && a.tool === "timer" ? null : s.timer,
      });
    }
    case "present": {
      if (a.tool === null) return s.presented === null ? null : next({ presented: null });
      if (!isToolId(a.tool) || !TOOL_BY_ID[a.tool].stage) return null;
      if (s.presented === a.tool && s.enabled.includes(a.tool)) return null;
      return next({ presented: a.tool, enabled: sortTools([...new Set([...s.enabled, a.tool])]) });
    }
    case "question": {
      if (a.text === null) return s.question ? next({ question: null }) : null;
      const text = a.text.trim().slice(0, MAX_QUESTION);
      if (!text) return null;
      return next({
        question: { text, at: now },
        presented: "question",
        enabled: sortTools([...new Set<ToolId>([...s.enabled, "question"])]),
      });
    }
    case "timer": {
      const t = s.timer;
      const withTimer = (timer: TimerState | null) => next({ timer, enabled: timer ? sortTools([...new Set<ToolId>([...s.enabled, "timer"])]) : s.enabled });
      if (a.op === "set") {
        const d = clampTimer(a.seconds);
        if (d <= 0) return null;
        return withTimer({ durationSec: d, endsAt: null, remainingSec: d });
      }
      if (a.op === "clear") return t ? withTimer(null) : null;
      if (!t) return null;
      if (a.op === "start") {
        if (t.endsAt != null) return null;
        const left = t.remainingSec > 0 ? t.remainingSec : t.durationSec;
        return withTimer({ ...t, endsAt: now + left * 1000, remainingSec: left });
      }
      if (a.op === "pause") {
        if (t.endsAt == null) return null;
        return withTimer({ ...t, endsAt: null, remainingSec: timerRemaining(t, now) });
      }
      return withTimer({ ...t, endsAt: null, remainingSec: t.durationSec });
    }
  }
  return null;
}

/**
 * Who is this person in the room, following the same rules as the room page:
 * when the creator is the interviewer, the host and panel interview and the
 * share-token holder is the candidate; the old reverse mode flips that.
 */
export function toolRole(
  s: { userId: string; panelJson: string | null; creatorRole: string; shareToken: string },
  userId: string | null | undefined,
  token: string | null | undefined,
): "interviewer" | "candidate" | null {
  const isOwner = !!userId && (s.userId === userId || parsePanel(s.panelJson).includes(userId));
  const hasToken = !!token && token === s.shareToken;
  if (s.creatorRole === "interviewer") {
    if (isOwner) return "interviewer";
    if (hasToken) return "candidate";
    return null;
  }
  if (hasToken) return "interviewer";
  if (isOwner) return "candidate";
  return null;
}
