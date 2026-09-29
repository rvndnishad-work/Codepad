/**
 * Live interview recording rules: when the host may start one, what it
 * costs, and how a LiveKit egress maps onto a recording row. Pure: no
 * database, no env. Safe to import from client components.
 */
import { VIDEO_JOIN_STATUSES } from "@/lib/video/room-video";
import { RECORDING_RETENTION_DAYS } from "./retention";

export type RecordingStatus = "recording" | "processing" | "ready" | "failed" | "deleted";

/** AI credits per started hour of recorded video. */
export const RECORDING_CREDITS_PER_HOUR = 1;

/**
 * Credits a finished recording costs: 1 per started hour, so 1 second to 60
 * minutes is 1, and 61 minutes is 2. Nothing for an empty recording.
 * The one place the price lives; change it here.
 */
export function recordingCredits(seconds: number | null | undefined): number {
  const s = Math.max(0, Math.floor(seconds ?? 0));
  if (s === 0) return 0;
  return Math.ceil(s / 3600) * RECORDING_CREDITS_PER_HOUR;
}

export type RecordingRefusalCode =
  | "not_set_up"
  | "no_builtin_video"
  | "not_enabled"
  | "closed"
  | "no_consent"
  | "no_credits"
  | "already";

/** A few words for the top bar, next to the Record button. */
export const REFUSAL_SHORT: Record<RecordingRefusalCode, string> = {
  not_set_up: "Not set up",
  no_builtin_video: "Built-in video only",
  not_enabled: "Recording is off",
  closed: "Interview ended",
  no_consent: "Candidate has not agreed",
  no_credits: "No credits",
  already: "Recording",
};

/** Why recording cannot start, in words the host can act on, or null when it may. */
export function recordingRefusal(a: {
  /** Recordings bucket and LiveKit are both set up on the server. */
  configured: boolean;
  /** The workspace has built-in video on and this interview uses it. */
  builtinVideo: boolean;
  /** The interview was set up to be recorded. */
  recordVideo: boolean;
  status: string;
  candidateConsented: boolean;
  credits: number;
  active: boolean;
}): { code: RecordingRefusalCode; message: string } | null {
  if (a.active) return { code: "already", message: "The call is already being recorded." };
  if (!a.configured) return { code: "not_set_up", message: "Recording is not set up yet. Ask whoever runs Interviewpad for your team to finish the setup." };
  if (!a.builtinVideo) return { code: "no_builtin_video", message: "Recording works only with built-in video." };
  if (!a.recordVideo) return { code: "not_enabled", message: "Recording is off for this interview. It can be switched on in the lobby before the interview starts." };
  if (!(VIDEO_JOIN_STATUSES as readonly string[]).includes(a.status)) return { code: "closed", message: "This interview has ended, so the call cannot be recorded." };
  if (!a.candidateConsented) return { code: "no_consent", message: "The candidate has not agreed to be recorded yet. They agree in the lobby before joining." };
  if (a.credits < RECORDING_CREDITS_PER_HOUR) return { code: "no_credits", message: "No AI credits left. Each recorded hour uses 1 AI credit." };
  return null;
}

/**
 * What the host's Record button does right now.
 *
 * - recording: the call is recorded; the button stops it.
 * - start: the candidate agreed; Record starts after a confirm.
 * - ask: the interview was not set up to be recorded; Record asks the
 *   candidate in the room first, and recording starts when they agree.
 * - waiting: the candidate was asked and has not answered.
 * - declined: the candidate said no. They are not asked again in this interview.
 * - blocked: recording cannot work here (setup, credits, interview over);
 *   the button stays visible and says why when pressed.
 */
export type RecordControl = "recording" | "start" | "ask" | "waiting" | "declined" | "blocked";

export function recordControl(a: {
  configured: boolean;
  builtinVideo: boolean;
  recordVideo: boolean;
  status: string;
  candidateConsented: boolean;
  credits: number;
  active: boolean;
  /** The candidate turned down a recording request in this interview. */
  declined: boolean;
}): { control: RecordControl; code: RecordingRefusalCode | null; message: string | null } {
  if (a.active) return { control: "recording", code: null, message: null };
  // Setup, video, interview status and credits: asking would be pointless.
  const hard = recordingRefusal({ ...a, recordVideo: true, candidateConsented: true });
  if (hard) return { control: "blocked", code: hard.code, message: hard.message };
  if (a.recordVideo && a.candidateConsented) return { control: "start", code: null, message: null };
  if (a.recordVideo) return { control: "waiting", code: "no_consent", message: "The candidate has been asked to agree to the recording. It starts once they say yes." };
  if (a.declined) return { control: "declined", code: "no_consent", message: "The candidate chose not to be recorded, so this call is not recorded." };
  return { control: "ask", code: null, message: null };
}

/**
 * The candidate is asked in the room: recording is wanted for this call and
 * they have not agreed yet. Also true when an interview set up to be
 * recorded reaches the room without the lobby agreement.
 */
export function consentAskOpen(a: { recordVideo: boolean; builtinVideo: boolean; status: string; candidateConsented: boolean }): boolean {
  return a.recordVideo && a.builtinVideo && (VIDEO_JOIN_STATUSES as readonly string[]).includes(a.status) && !a.candidateConsented;
}

/** "Tomasz" from "Tomasz Nowak"; "The candidate" when there is no name. */
export function candidateFirstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] || "The candidate";
}

/** Plain words for the host after a no. */
export function declinedLabel(candidateName: string | null | undefined): string {
  return `${candidateFirstName(candidateName)} chose not to be recorded`;
}

/** What the candidate reads when asked in the room. */
export function consentAskText(askedBy: string | null | undefined): string {
  const who = askedBy?.trim() || "Your interviewer";
  return `${who} would like to record this call. The recording is kept for ${RECORDING_RETENTION_DAYS} days, then deleted.`;
}

/** LiveKit EgressStatus values (livekit_egress.proto). */
export const EGRESS = { STARTING: 0, ACTIVE: 1, ENDING: 2, COMPLETE: 3, FAILED: 4, ABORTED: 5, LIMIT_REACHED: 6 } as const;

export type EgressLike = {
  status: number;
  error?: string;
  /** Nanosecond timestamps. */
  startedAt?: bigint | number;
  endedAt?: bigint | number;
  fileResults?: { size?: bigint | number; duration?: bigint | number }[];
};

export type EgressOutcome = {
  status: "recording" | "processing" | "ready" | "failed";
  sizeBytes: bigint | null;
  seconds: number | null;
  error: string | null;
};

const NS = BigInt(1_000_000_000);

function toBig(v: bigint | number | undefined): bigint {
  if (typeof v === "bigint") return v;
  return typeof v === "number" && Number.isFinite(v) ? BigInt(Math.trunc(v)) : BigInt(0);
}

/** Short, human error text for the row. Egress errors can be long and technical. */
export function shortError(raw: string | null | undefined, fallback = "The recording did not finish."): string {
  const t = (raw ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, 200) : fallback;
}

/**
 * Where a recording stands, from its egress. File duration is in
 * nanoseconds; when it is missing, the egress start and end times stand in.
 */
export function egressOutcome(e: EgressLike): EgressOutcome {
  const file = e.fileResults?.[0];
  const size = toBig(file?.size);
  let ns = toBig(file?.duration);
  if (ns <= BigInt(0)) {
    const span = toBig(e.endedAt) - toBig(e.startedAt);
    if (toBig(e.startedAt) > BigInt(0) && span > BigInt(0)) ns = span;
  }
  const seconds = ns > BigInt(0) ? Number((ns + NS / BigInt(2)) / NS) : null;
  const sizeBytes = size > BigInt(0) ? size : null;

  switch (e.status) {
    case EGRESS.STARTING:
    case EGRESS.ACTIVE:
      return { status: "recording", sizeBytes: null, seconds: null, error: null };
    case EGRESS.ENDING:
      return { status: "processing", sizeBytes: null, seconds: null, error: null };
    case EGRESS.COMPLETE:
      return { status: "ready", sizeBytes, seconds, error: null };
    case EGRESS.LIMIT_REACHED:
      // LiveKit still saves what it recorded up to the limit.
      return sizeBytes ? { status: "ready", sizeBytes, seconds, error: null } : { status: "failed", sizeBytes: null, seconds: null, error: "The recording hit its time limit before anything was saved." };
    case EGRESS.ABORTED:
      return { status: "failed", sizeBytes: null, seconds: null, error: shortError(e.error, "The recording stopped before anything was saved.") };
    default:
      return { status: "failed", sizeBytes: null, seconds: null, error: shortError(e.error) };
  }
}

/** Recording rows still waiting on LiveKit. */
export function recordingPending(status: string): boolean {
  return status === "recording" || status === "processing";
}

/** "42 min", "1 h 5 min", "under a minute". */
export function recordingDurationLabel(seconds: number | null | undefined): string | null {
  if (seconds == null) return null;
  if (seconds < 60) return "Under a minute";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** A file name for the Download button: "Priya Shah interview 2026-09-28.mp4". */
export function recordingDownloadName(candidateName: string | null | undefined, startedAt: Date): string {
  const who = (candidateName ?? "").replace(/[^\p{L}\p{N} .'-]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return `${who ? `${who} ` : ""}interview ${startedAt.toISOString().slice(0, 10)}.mp4`;
}

/** What the room shows about recording. */
export type RoomRecording = {
  /** The call is being recorded right now. */
  recording: boolean;
  startedAt: string | null;
  /** Interviewers only: whether Record would work, and why not. */
  canStart?: boolean;
  reason?: string | null;
  code?: RecordingRefusalCode | null;
  /** Interviewers only: what the Record button does now. */
  control?: RecordControl;
  /** Interviewers only: for "Tomasz chose not to be recorded". */
  candidateName?: string | null;
  /** Candidates only: someone asked to record and waits for an answer. */
  ask?: { by: string | null } | null;
};

/** One recording on the interview report. Links are signed per page load. */
export type ReportRecording = {
  id: string;
  state: "recording" | "processing" | "ready" | "failed" | "deleted" | "not_set_up";
  startedAt: string;
  duration: string | null;
  /** "Deletes in 5 days". */
  expiry: string | null;
  playUrl: string | null;
  downloadUrl: string | null;
  error: string | null;
};

export type ReportRecordings = {
  /** The bucket is set up on this server. */
  configured: boolean;
  /** The interview was set up to record the call. */
  recordVideo: boolean;
  items: ReportRecording[];
};

/** How a recording row shows on the report, before links are added. */
export function reportRecordingState(
  r: { status: string; expiresAt: Date; deletedAt: Date | null },
  configured: boolean,
  now: Date = new Date(),
): ReportRecording["state"] {
  if (r.status === "deleted" || r.deletedAt || r.expiresAt.getTime() <= now.getTime()) return "deleted";
  if (r.status === "ready") return configured ? "ready" : "not_set_up";
  if (r.status === "recording" || r.status === "processing" || r.status === "failed") return r.status;
  return "failed";
}
