/**
 * Greenhouse Assessment Partner API: the pure parts. Safe to import anywhere.
 *
 * Greenhouse calls four endpoints on our side (spec:
 * https://developers.greenhouse.io/assessment.html), each with HTTP Basic auth
 * where the user name is the API key we issue and the password is empty:
 *
 *   GET  list_tests      -> [{ partner_test_id, partner_test_name }]
 *   POST send_test       -> { partner_interview_id }
 *   GET  test_status     -> { partner_status, partner_profile_url, partner_score, metadata }
 *   POST request_errors  -> 200
 *
 * Greenhouse keeps polling test_status until partner_status is "complete".
 * We can also PATCH the `url` it sent with send_test to say a result is ready.
 */
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const GREENHOUSE = "greenhouse";

/** Greenhouse caps partner keys below 171 characters. */
const KEY_PREFIX = "cpgh_";

export function generatePartnerKey(): string {
  return KEY_PREFIX + randomBytes(24).toString("base64url");
}

export function hashPartnerKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/** "cpgh_Ab3x...9Qz" style hint for a key without showing it. */
export function maskPartnerKey(key: string): string {
  if (key.length <= 12) return "••••";
  return `${key.slice(0, 9)}…${key.slice(-4)}`;
}

/**
 * The key from an `Authorization: Basic base64(key:)` header, or null.
 * A non-empty password is tolerated; Greenhouse sends none.
 */
export function partnerKeyFromAuthHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Basic\s+([A-Za-z0-9+/=_-]+)\s*$/i.exec(header.trim());
  if (!m) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(m[1], "base64").toString("utf8");
  } catch {
    return null;
  }
  const idx = decoded.indexOf(":");
  const user = (idx === -1 ? decoded : decoded.slice(0, idx)).trim();
  return user.length > 0 && user.length < 171 ? user : null;
}

/** Constant-time comparison of two hex hashes. */
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ── send_test ──────────────────────────────────────────────────────────── */

export type SendTestRequest = {
  partnerTestId: string;
  candidate: {
    firstName: string;
    lastName: string;
    preferredName: string | null;
    email: string;
    phone: string | null;
    profileUrl: string | null;
    id: string | null;
  };
  applicationId: string | null;
  sentBy: string | null;
  callbackUrl: string | null;
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const text = (v: unknown): string | null => {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Validates a send_test body. Returns the parsed request or a list of problems. */
export function parseSendTest(body: unknown): { ok: true; value: SendTestRequest } | { ok: false; errors: string[] } {
  const b = obj(body);
  const c = obj(b.candidate);
  const errors: string[] = [];
  const partnerTestId = text(b.partner_test_id);
  if (!partnerTestId) errors.push("partner_test_id is required");
  const email = text(c.email)?.toLowerCase() ?? null;
  if (!email || !EMAIL_RE.test(email)) errors.push("candidate.email must be a valid email address");
  const firstName = text(c.first_name) ?? "";
  const lastName = text(c.last_name) ?? "";
  if (!firstName && !lastName && !text(c.preferred_name)) errors.push("candidate.first_name or candidate.last_name is required");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      partnerTestId: partnerTestId!,
      candidate: {
        firstName,
        lastName,
        preferredName: text(c.preferred_name),
        email: email!,
        phone: text(c.phone_number),
        profileUrl: httpsUrl(text(c.greenhouse_profile_url)),
        id: text(c.id),
      },
      applicationId: text(obj(b.application).id),
      sentBy: text(b.sent_by),
      callbackUrl: httpsUrl(text(b.url)),
    },
  };
}

function httpsUrl(v: string | null): string | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** "Ana Lima", preferring the preferred first name when Greenhouse has one. */
export function candidateDisplayName(c: SendTestRequest["candidate"]): string {
  const first = c.preferredName || c.firstName;
  const full = `${first} ${c.lastName}`.trim();
  return full || c.email.split("@")[0];
}

/**
 * Hosts we are willing to PATCH. Greenhouse sends the callback URL in the
 * request body, so without this check a caller holding a key could make us
 * send requests anywhere. Override with GREENHOUSE_CALLBACK_HOSTS (comma
 * separated, a leading dot allows subdomains).
 */
export function callbackHostAllowed(url: string, env: string | undefined = process.env.GREENHOUSE_CALLBACK_HOSTS): boolean {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    host = u.hostname.toLowerCase();
  } catch {
    return false;
  }
  const rules = (env?.trim() ? env : ".greenhouse.io")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return rules.some((r) => (r.startsWith(".") ? host === r.slice(1) || host.endsWith(r) : host === r));
}

/* ── list_tests ─────────────────────────────────────────────────────────── */

export function testName(jobName: string, screeningTitle: string): string {
  return `${jobName}: ${screeningTitle}`.slice(0, 250);
}

/* ── test_status ────────────────────────────────────────────────────────── */

/** What we know about one request when Greenhouse asks for its status. */
export type StatusInput = {
  requestStatus: "waiting" | "sent" | "failed" | "reported" | string;
  requestCreatedAt: Date;
  /** The screening's state, from loadCandidateResults. Null when nothing was sent. */
  result: { state: "invited" | "in_progress" | "submitted" | "scored" | "expired"; score: number | null } | null;
  candidateStage: string;
  stageChangedAt: Date | null;
  profileUrl: string;
  includeScore: boolean;
  screeningLabel: string;
  /** Every interview round in one line (see atsRoundsText), when the candidate follows a plan. */
  rounds?: string | null;
};

export type TestStatus = {
  partner_status: string;
  partner_profile_url?: string;
  partner_score?: number;
  metadata?: Record<string, string>;
};

export type Decision = "passed" | "not_passed";

/**
 * A recruiter decision that counts for this request: Passed or Not passed,
 * made after Greenhouse asked. An older decision (from an earlier round with
 * this person) never answers a new request.
 */
export function decisionFor(stage: string, stageChangedAt: Date | null, requestCreatedAt: Date): Decision | null {
  if (stage !== "PASSED" && stage !== "REJECTED") return null;
  if (!stageChangedAt || stageChangedAt < requestCreatedAt) return null;
  return stage === "PASSED" ? "passed" : "not_passed";
}

/** The screening can no longer change: finished, expired, or never sent. */
export function screeningClosed(input: Pick<StatusInput, "result" | "requestStatus">): boolean {
  if (!input.result) return input.requestStatus === "waiting" || input.requestStatus === "failed";
  return input.result.state === "scored" || input.result.state === "submitted" || input.result.state === "expired";
}

/**
 * The test_status answer. "complete" only once a recruiter has decided AND
 * the screening is closed; a score alone never completes anything.
 */
export function buildTestStatus(input: StatusInput): TestStatus {
  const decision = decisionFor(input.candidateStage, input.stageChangedAt, input.requestCreatedAt);
  const closed = screeningClosed(input);
  if (decision && closed) {
    const metadata: Record<string, string> = {
      Decision: decision === "passed" ? "Passed" : "Not passed",
      Screening: input.screeningLabel,
    };
    if (input.result?.state === "expired") metadata.Note = "The candidate did not finish before the invite expired.";
    if (input.rounds) metadata.Rounds = input.rounds;
    const out: TestStatus = { partner_status: "complete", partner_profile_url: input.profileUrl, metadata };
    if (input.includeScore && input.result?.score != null) out.partner_score = input.result.score;
    return out;
  }
  let status: string;
  if (input.requestStatus === "failed") status = "invite_failed";
  else if (!input.result) status = "waiting_for_recruiter";
  else if (closed) status = "completed_awaiting_decision";
  else status = input.result.state === "in_progress" ? "in_progress" : "invited";
  return { partner_status: status };
}

/** Plain words for a test_status value, used in the sync log and the profile card. */
export function describeStatus(status: string): string {
  switch (status) {
    case "complete":
      return "Result sent";
    case "completed_awaiting_decision":
      return "Screening completed, waiting for a decision";
    case "in_progress":
      return "In progress";
    case "invited":
      return "Invite sent";
    case "waiting_for_recruiter":
      return "Waiting for you to send the screening";
    case "invite_failed":
      return "The invite could not be sent";
    default:
      return status;
  }
}
