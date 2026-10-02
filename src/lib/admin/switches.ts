/**
 * Feature switches: one per product function, three states.
 *
 *   on         — normal.
 *   read_only  — pages open, running work finishes, nothing new starts or saves.
 *   off        — the function is replaced by the switch message.
 *
 * Code asks `await featureState("ai-screening")` (or `isFeatureOn`) at the
 * point the function starts. Rows are created lazily; a missing row is "on".
 * Values are cached per instance for 10 s and fail open on a DB error.
 */
import { prisma } from "@/lib/prisma";

export type SwitchState = "on" | "read_only" | "off";
export type SwitchSide = "hiring" | "developer" | "shared";

export type SwitchDef = {
  key: string;
  label: string;
  side: SwitchSide;
  /** Who it applies to, shown in the table. */
  appliesTo: string;
  /** What it stops. */
  description: string;
  /** Other functions that stop with it. */
  alsoAffects?: string[];
  /** Default message when none is written. */
  defaultMessage: string;
};

export const SWITCHES: SwitchDef[] = [
  // Hiring side
  { key: "recruiter-signup", label: "Recruiter sign-up", side: "hiring", appliesTo: "New workspaces", description: "Creating a new workspace", defaultMessage: "New workspaces are paused for a short while. Please try again later." },
  { key: "ai-screening", label: "AI screening", side: "hiring", appliesTo: "All plans", description: "Sending invites, starting and grading AI screenings", defaultMessage: "AI screenings are paused for maintenance. Screenings already started will finish." },
  { key: "take-home", label: "Take home", side: "hiring", appliesTo: "All plans", description: "Sending and starting take-home assignments", defaultMessage: "Take-home assignments are paused for maintenance." },
  { key: "live-interviews", label: "Live interviews", side: "hiring", appliesTo: "All plans", description: "Joining the interview lobby and room", defaultMessage: "Interview rooms are paused for maintenance. Use your meeting link for now." },
  { key: "video-addon", label: "Video add-on", side: "hiring", appliesTo: "Growth, Enterprise, trial", description: "Built-in video calls in the room", alsoAffects: ["Recordings"], defaultMessage: "Built-in video is paused. Use your meeting link for this interview; code pad, whiteboard and notes work as usual." },
  { key: "recordings", label: "Recordings", side: "hiring", appliesTo: "Video add-on only", description: "Starting new recordings", defaultMessage: "Recording is paused for maintenance." },
  { key: "credit-checkout", label: "Credit purchases", side: "hiring", appliesTo: "All plans", description: "Buying AI credit packs", defaultMessage: "Buying credits is paused for a short while. Please try again later." },
  { key: "ats-greenhouse", label: "Greenhouse sync", side: "hiring", appliesTo: "Growth, Enterprise", description: "Importing and sending back candidates", defaultMessage: "Greenhouse sync is paused." },
  { key: "chat-notifications", label: "Slack and Teams", side: "hiring", appliesTo: "Growth, Enterprise", description: "Posting to Slack and Microsoft Teams", defaultMessage: "Slack and Teams messages are paused." },
  { key: "calendar", label: "Calendar", side: "hiring", appliesTo: "All plans", description: "Creating calendar events for interviews", defaultMessage: "Calendar sync is paused." },
  { key: "candidate-pages", label: "Candidate pages", side: "hiring", appliesTo: "Everyone with a link", description: "Take-home, screening and lobby links for candidates", defaultMessage: "This page is paused for maintenance. Your link still works; please come back later." },
  // Developer side
  { key: "developer-signup", label: "Developer sign-up", side: "developer", appliesTo: "New accounts", description: "Creating a developer account", defaultMessage: "Sign-ups are paused for a short while. Please try again later." },
  { key: "playground-run", label: "Playground runs", side: "developer", appliesTo: "Everyone", description: "Running code in the playground", alsoAffects: ["Challenge judge", "Take-home judge"], defaultMessage: "Running code is paused for maintenance. Your snippets are safe." },
  { key: "playground-assist", label: "Playground AI assist", side: "developer", appliesTo: "Signed in", description: "The AI helper in the playground", defaultMessage: "The playground AI helper is paused." },
  { key: "challenges", label: "Coding challenges", side: "developer", appliesTo: "Everyone", description: "Starting and submitting challenge attempts", defaultMessage: "Challenges are paused for maintenance." },
  { key: "interview-questions", label: "Interview questions", side: "developer", appliesTo: "Everyone", description: "Comments and AI hints on the question bank", defaultMessage: "Comments and hints are paused." },
  { key: "blogs", label: "Blogs", side: "developer", appliesTo: "Everyone", description: "Writing posts and comments", defaultMessage: "Writing and commenting are paused." },
  { key: "prompt-arena", label: "Prompt arena", side: "developer", appliesTo: "Everyone", description: "Running prompt challenges", defaultMessage: "The prompt arena is paused." },
  { key: "ai-code-review", label: "Review the AI code", side: "developer", appliesTo: "Everyone", description: "Submitting AI code reviews", defaultMessage: "Review the AI code is paused." },
  { key: "journeys", label: "Prep journeys", side: "developer", appliesTo: "Signed in", description: "Starting and updating journeys", defaultMessage: "Prep journeys are paused." },
  { key: "creator-checkout", label: "Creator marketplace", side: "developer", appliesTo: "Everyone", description: "Buying creator memberships", defaultMessage: "Creator checkout is paused for a short while." },
  { key: "mock-interviews", label: "Mock interviews", side: "developer", appliesTo: "Developers and recruiters", description: "Practice interviews in the arena", defaultMessage: "Mock interviews are paused." },
  // Shared
  { key: "email-send", label: "Outgoing email", side: "shared", appliesTo: "Everything but sign-in codes", description: "Sending product email", defaultMessage: "" },
  { key: "admin-assistant", label: "Admin assistant", side: "shared", appliesTo: "Platform admins", description: "The admin assistant", defaultMessage: "The assistant is paused." },
];

export const SWITCH_KEYS = SWITCHES.map((s) => s.key);
export function switchDef(key: string): SwitchDef | undefined {
  return SWITCHES.find((s) => s.key === key);
}

export type SwitchValue = {
  key: string;
  state: SwitchState;
  message: string;
  resumeAt: Date | null;
  updatedById: string | null;
  updatedNote: string | null;
  updatedAt: Date | null;
};

const TTL_MS = 10_000;
let cache: { at: number; map: Map<string, SwitchValue> } | null = null;

function normalise(state: string): SwitchState {
  return state === "off" || state === "read_only" ? state : "on";
}

async function loadAll(): Promise<Map<string, SwitchValue>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  try {
    const rows = await prisma.featureSwitch.findMany();
    const now = Date.now();
    const map = new Map<string, SwitchValue>();
    for (const r of rows) {
      const expired = r.resumeAt && r.resumeAt.getTime() <= now;
      map.set(r.key, {
        key: r.key,
        state: expired ? "on" : normalise(r.state),
        message: r.message || switchDef(r.key)?.defaultMessage || "",
        resumeAt: expired ? null : r.resumeAt,
        updatedById: r.updatedById,
        updatedNote: r.updatedNote,
        updatedAt: r.updatedAt,
      });
    }
    cache = { at: now, map };
    return map;
  } catch {
    return cache?.map ?? new Map(); // fail open
  }
}

export function clearSwitchCache() {
  cache = null;
}

function defaultValue(key: string): SwitchValue {
  return {
    key,
    state: "on",
    message: switchDef(key)?.defaultMessage ?? "",
    resumeAt: null,
    updatedById: null,
    updatedNote: null,
    updatedAt: null,
  };
}

export async function getSwitch(key: string): Promise<SwitchValue> {
  return (await loadAll()).get(key) ?? defaultValue(key);
}

export async function getAllSwitches(): Promise<SwitchValue[]> {
  const map = await loadAll();
  return SWITCHES.map((d) => map.get(d.key) ?? defaultValue(d.key));
}

export async function featureState(key: string): Promise<SwitchState> {
  return (await getSwitch(key)).state;
}

/** True only when fully on. Use before starting new work. */
export async function isFeatureOn(key: string): Promise<boolean> {
  return (await featureState(key)) === "on";
}

/** True unless off. Use for reading/continuing existing work. */
export async function isFeatureReadable(key: string): Promise<boolean> {
  return (await featureState(key)) !== "off";
}

/**
 * Guard for API routes: returns a 503 JSON response when the function may not
 * start new work, or null to continue.
 */
export async function featureBlockedResponse(key: string, mode: "start" | "read" = "start") {
  const sw = await getSwitch(key);
  const blocked = mode === "start" ? sw.state !== "on" : sw.state === "off";
  if (!blocked) return null;
  const { NextResponse } = await import("next/server");
  return NextResponse.json(
    { error: sw.message || "This feature is paused for maintenance.", feature: key, state: sw.state },
    { status: 503, headers: { "Retry-After": "600" } },
  );
}

export class FeaturePausedError extends Error {
  constructor(public key: string, message: string) {
    super(message);
  }
}

/** Throw from server actions when the function may not start new work. */
export async function assertFeatureOn(key: string): Promise<void> {
  const sw = await getSwitch(key);
  if (sw.state !== "on") throw new FeaturePausedError(key, sw.message || "This feature is paused for maintenance.");
}
