import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

type Rec = Record<string, unknown> & { id: string; status: string; creditsCharged: number };

const db = vi.hoisted(() => ({
  session: null as Record<string, unknown> | null,
  recordings: [] as Rec[],
  ledger: [] as { workspaceId: string; kind: string; amount: number; note?: string }[],
  balance: 10,
  includedLeft: 0,
  audits: [] as { action: string; meta: Record<string, unknown>; targetId?: string; actorUserId?: string | null }[],
  workspaceUpdates: [] as unknown[],
}));

function matches(r: Rec, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === "interviewSessionId") return r.interviewSessionId === v;
    return r[k] === v;
  });
}

vi.mock("@/lib/prisma", () => {
  const prisma = {
    interviewSession: {
      findUnique: vi.fn(async () => (db.session ? { ...db.session } : null)),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const s = db.session;
        if (!s || !Object.entries(where).every(([k, v]) => (k === "candidateConsentAt" ? (s[k] ?? null) === v : s[k] === v))) return { count: 0 };
        Object.assign(s, data);
        return { count: 1 };
      }),
    },
    workspaceAuditLog: {
      findMany: vi.fn(async ({ where }: { where: { targetId: string; action: { in: string[] } } }) =>
        db.audits
          .filter((a) => a.targetId === where.targetId && where.action.in.includes(a.action))
          .reverse()
          .map((a) => ({ action: a.action, actorUserId: a.actorUserId ?? null, actorEmail: null, meta: JSON.stringify(a.meta ?? {}) })),
      ),
    },
    interviewRecording: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => db.recordings.find((r) => matches(r, where)) ?? null),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => db.recordings.filter((r) => matches(r, where))),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const r = db.recordings.find((x) => x.id === where.id);
        return r ? { ...r, interviewSession: { candidateName: "Priya Shah" } } : null;
      }),
      create: vi.fn(async ({ data }: { data: Rec }) => {
        const r = { egressId: null, startedAt: new Date(), endedAt: null, error: null, seconds: null, ...data, creditsCharged: data.creditsCharged ?? 0 } as Rec;
        db.recordings.push(r);
        return r;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const r = db.recordings.find((x) => x.id === where.id)!;
        Object.assign(r, data);
        return r;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const rows = db.recordings.filter((r) => matches(r, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      }),
    },
    aIInterviewCreditLedger: {
      aggregate: vi.fn(async () => ({ _sum: { amount: db.balance } })),
      create: vi.fn(async ({ data }: { data: { workspaceId: string; kind: string; amount: number; note?: string } }) => {
        db.ledger.push(data);
        db.balance += data.amount;
        return data;
      }),
    },
    workspace: {
      findUnique: vi.fn(async () => ({ includedCreditsLeft: db.includedLeft })),
      updateMany: vi.fn(async (a: unknown) => {
        db.workspaceUpdates.push(a);
        return { count: 1 };
      }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  return { prisma };
});

vi.mock("@/lib/workspace-audit", () => ({
  WORKSPACE_AUDIT_ACTIONS: {
    RECORDING_STARTED: "RECORDING_STARTED",
    RECORDING_STOPPED: "RECORDING_STOPPED",
    RECORDING_CONSENT_REQUESTED: "RECORDING_CONSENT_REQUESTED",
    RECORDING_CONSENT_GIVEN: "RECORDING_CONSENT_GIVEN",
    RECORDING_CONSENT_DECLINED: "RECORDING_CONSENT_DECLINED",
  },
  writeWorkspaceAuditEntry: vi.fn(async (e: { action: string; meta: Record<string, unknown>; targetId?: string; actorUserId?: string | null }) => {
    db.audits.push({ action: e.action, meta: e.meta, targetId: e.targetId, actorUserId: e.actorUserId });
  }),
}));
vi.mock("@/lib/notifications/triggers", () => ({ notifyAiCreditsLowIfNeeded: vi.fn(async () => undefined) }));
vi.mock("@/lib/billing/credit-alerts", () => ({ checkLowCredits: vi.fn(async () => "none") }));

const egress = vi.hoisted(() => ({
  startRoomCompositeEgress: vi.fn(),
  stopEgress: vi.fn(),
  listEgress: vi.fn(),
  hosts: [] as string[],
}));
vi.mock("livekit-server-sdk", async (orig) => {
  const real = await orig<typeof import("livekit-server-sdk")>();
  class EgressClient {
    constructor(host: string) {
      egress.hosts.push(host);
    }
    startRoomCompositeEgress = egress.startRoomCompositeEgress;
    stopEgress = egress.stopEgress;
    listEgress = egress.listEgress;
  }
  return { ...real, EgressClient };
});

import { answerRecordingConsent, askRecordingConsent, pendingRoomAsk, chargeRecordingCredits, roomRecordingState, startLiveRecording, stopLiveRecording, stopRoomRecordings, syncLiveRecording } from "@/lib/recording/live-server";
import { EGRESS } from "@/lib/recording/live";

const growth = { planName: "GROWTH", trialEndsAt: null, stripeSubscriptionId: "sub_1", videoEnabled: true };
const session = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  type: "live",
  status: "in_progress",
  workspaceId: "ws1",
  builtinVideo: true,
  recordVideo: true,
  candidateConsentAt: new Date(),
  candidateName: "Priya Shah",
  workspace: growth,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.session = session();
  db.recordings = [];
  db.ledger = [];
  db.balance = 10;
  db.includedLeft = 0;
  db.audits = [];
  db.workspaceUpdates = [];
  egress.hosts = [];
  Object.assign(process.env, {
    R2_ACCOUNT_ID: "acc",
    R2_ACCESS_KEY_ID: "key",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_BUCKET: "recordings",
    LIVEKIT_URL: "wss://lk.example.com",
    LIVEKIT_API_KEY: "lk_key",
    LIVEKIT_API_SECRET: "lk_secret",
  });
  egress.startRoomCompositeEgress.mockResolvedValue({ egressId: "EG_1" });
  egress.stopEgress.mockResolvedValue({});
  egress.listEgress.mockResolvedValue([]);
});

const ENV_KEYS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
afterAll(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("startLiveRecording", () => {
  it("records the room into R2 and stores the egress id", async () => {
    const res = await startLiveRecording({ sessionId: "s1", actorUserId: "u1" });
    expect(res.ok).toBe(true);
    expect(db.recordings).toHaveLength(1);
    const rec = db.recordings[0];
    expect(rec).toMatchObject({ status: "recording", egressId: "EG_1", workspaceId: "ws1", interviewSessionId: "s1", startedById: "u1" });
    expect(rec.storageKey).toBe(`live/ws1/s1/${rec.id}.mp4`);
    // Deleted 7 days after it is made.
    const days = ((rec.expiresAt as Date).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThanOrEqual(7);

    expect(egress.hosts[0]).toBe("https://lk.example.com");
    const [room, output, opts] = egress.startRoomCompositeEgress.mock.calls[0];
    expect(room).toBe("interview-s1");
    expect(opts).toEqual({ layout: "speaker" });
    expect(output.filepath).toBe(rec.storageKey);
    expect(output.output.case).toBe("s3");
    expect(output.output.value).toMatchObject({
      accessKey: "key",
      secret: "secret",
      bucket: "recordings",
      endpoint: "https://acc.r2.cloudflarestorage.com",
      region: "auto",
      forcePathStyle: true,
    });
    expect(db.audits).toEqual([{ action: "RECORDING_STARTED", meta: { candidateName: "Priya Shah", recordingId: rec.id }, targetId: "s1", actorUserId: "u1" }]);
  });

  it("refuses without the candidate's agreement, credits, or setup, and records nothing", async () => {
    db.session = session({ candidateConsentAt: null });
    expect(await startLiveRecording({ sessionId: "s1", actorUserId: "u1" })).toMatchObject({ ok: false, code: "no_consent" });
    db.session = session();
    db.balance = 0;
    expect(await startLiveRecording({ sessionId: "s1", actorUserId: "u1" })).toMatchObject({ ok: false, code: "no_credits" });
    db.balance = 10;
    delete process.env.R2_BUCKET;
    expect(await startLiveRecording({ sessionId: "s1", actorUserId: "u1" })).toMatchObject({ ok: false, code: "not_set_up" });
    process.env.R2_BUCKET = "recordings";
    db.session = session({ recordVideo: false });
    expect(await startLiveRecording({ sessionId: "s1", actorUserId: "u1" })).toMatchObject({ ok: false, code: "not_enabled" });
    db.session = session({ workspace: { ...growth, videoEnabled: false } });
    expect(await startLiveRecording({ sessionId: "s1", actorUserId: "u1" })).toMatchObject({ ok: false, code: "no_builtin_video" });
    expect(db.recordings).toHaveLength(0);
    expect(egress.startRoomCompositeEgress).not.toHaveBeenCalled();
  });

  it("refuses a second recording while one runs", async () => {
    await startLiveRecording({ sessionId: "s1", actorUserId: "u1" });
    expect(await startLiveRecording({ sessionId: "s1", actorUserId: "u1" })).toMatchObject({ ok: false, code: "already" });
    expect(db.recordings).toHaveLength(1);
  });

  it("marks the row failed with a plain error when LiveKit refuses", async () => {
    egress.startRoomCompositeEgress.mockRejectedValueOnce(new Error("requested room does not exist"));
    const res = await startLiveRecording({ sessionId: "s1", actorUserId: "u1" });
    expect(res).toMatchObject({ ok: false, code: "egress_failed" });
    expect(db.recordings[0]).toMatchObject({ status: "failed", error: "The recording did not start." });
    expect(db.audits).toHaveLength(0);
  });
});

describe("stopping", () => {
  it("stops the egress and waits in processing", async () => {
    await startLiveRecording({ sessionId: "s1", actorUserId: "u1" });
    const res = await stopLiveRecording({ sessionId: "s1", actorUserId: "u1" });
    expect(res).toEqual({ stopped: 1 });
    expect(egress.stopEgress).toHaveBeenCalledWith("EG_1");
    expect(db.recordings[0].status).toBe("processing");
    expect(db.recordings[0].endedAt).toBeInstanceOf(Date);
    expect(db.audits.map((a) => a.action)).toEqual(["RECORDING_STARTED", "RECORDING_STOPPED"]);
  });

  it("when the interview closes, also stops egress LiveKit still runs for the room (the row may be gone)", async () => {
    egress.listEgress.mockResolvedValue([{ egressId: "EG_orphan" }]);
    await stopRoomRecordings("s1");
    expect(egress.listEgress).toHaveBeenCalledWith({ roomName: "interview-s1", active: true });
    expect(egress.stopEgress).toHaveBeenCalledWith("EG_orphan");
  });
});

describe("syncLiveRecording and charging", () => {
  const processing = (over: Record<string, unknown> = {}): Rec => ({
    id: "r1",
    workspaceId: "ws1",
    interviewSessionId: "s1",
    egressId: "EG_1",
    storageKey: "live/ws1/s1/r1.mp4",
    status: "processing",
    mime: "video/mp4",
    startedAt: new Date(Date.now() - 3 * 3600_000),
    endedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
    creditsCharged: 0,
    seconds: null,
    ...over,
  });

  it("moves a finished egress to ready and charges once, 1 credit per started hour", async () => {
    db.recordings = [processing()];
    egress.listEgress.mockResolvedValue([{ status: EGRESS.COMPLETE, fileResults: [{ size: BigInt(5_000_000), duration: BigInt(3700) * BigInt(1_000_000_000) }] }]);
    const out = await syncLiveRecording(db.recordings[0] as never);
    expect(egress.listEgress).toHaveBeenCalledWith({ egressId: "EG_1" });
    expect(out).toMatchObject({ status: "ready", seconds: 3700, sizeBytes: BigInt(5_000_000), creditsCharged: 2 });
    expect(db.ledger).toEqual([{ workspaceId: "ws1", kind: "CONSUMPTION", amount: -2, note: "Interview recording with Priya Shah, 2 hours" }]);

    // A second sync, or a second charge, never charges again.
    await syncLiveRecording(db.recordings[0] as never);
    expect(await chargeRecordingCredits("r1")).toEqual({ charged: 0 });
    expect(db.ledger).toHaveLength(1);
  });

  it("uses included credits first", async () => {
    db.includedLeft = 1;
    db.recordings = [processing({ status: "ready", seconds: 7200 })];
    expect(await chargeRecordingCredits("r1")).toEqual({ charged: 2 });
    expect(db.workspaceUpdates).toEqual([{ where: { id: "ws1", includedCreditsLeft: { gte: 1 } }, data: { includedCreditsLeft: { decrement: 1 } } }]);
  });

  it("marks a failed egress failed and charges nothing", async () => {
    db.recordings = [processing()];
    egress.listEgress.mockResolvedValue([{ status: EGRESS.FAILED, error: "upload failed" }]);
    const out = await syncLiveRecording(db.recordings[0] as never);
    expect(out).toMatchObject({ status: "failed", error: "upload failed" });
    expect(db.ledger).toHaveLength(0);
  });

  it("leaves a still-running egress alone", async () => {
    db.recordings = [processing({ status: "recording", endedAt: null })];
    egress.listEgress.mockResolvedValue([{ status: EGRESS.ACTIVE }]);
    const out = await syncLiveRecording(db.recordings[0] as never);
    expect(out.status).toBe("recording");
  });

  it("never throws when LiveKit is down", async () => {
    db.recordings = [processing()];
    egress.listEgress.mockRejectedValue(new Error("network"));
    const out = await syncLiveRecording(db.recordings[0] as never);
    expect(out.status).toBe("processing");
  });
});

describe("roomRecordingState", () => {
  it("tells everyone whether the call is recorded, and only interviewers why they cannot start", async () => {
    db.session = session({ candidateConsentAt: null, recordVideo: false });
    expect(await roomRecordingState("s1", false)).toEqual({ recording: false, startedAt: null });
    db.session = session({ candidateConsentAt: null, recordVideo: false, workspace: { ...growth, videoEnabled: false } });
    const host = await roomRecordingState("s1", true);
    expect(host).toMatchObject({ recording: false, canStart: false, control: "blocked", code: "no_builtin_video" });
    expect(host.reason).toMatch(/built-in video/);
    expect(host.ask).toBeUndefined();
  });

  it("offers Record to the host even when the interview was not set up to be recorded", async () => {
    db.session = session({ candidateConsentAt: null, recordVideo: false });
    expect(await roomRecordingState("s1", true)).toMatchObject({ canStart: false, control: "ask", reason: null, candidateName: "Priya Shah" });
    db.session = session();
    expect(await roomRecordingState("s1", true)).toMatchObject({ canStart: true, control: "start" });
  });

  it("reports an active recording", async () => {
    await startLiveRecording({ sessionId: "s1", actorUserId: "u1" });
    egress.listEgress.mockResolvedValue([{ status: EGRESS.ACTIVE }]);
    const s = await roomRecordingState("s1", true);
    expect(s).toMatchObject({ recording: true, canStart: false, reason: null });
  });
});

describe("asking the candidate in the room", () => {
  const earlier = new Date("2026-09-28T09:00:00Z");

  it("asks, the candidate agrees, and the server starts the recording", async () => {
    db.session = session({ recordVideo: false, candidateConsentAt: earlier, user: { name: "Alex Morgan" } });
    expect(await askRecordingConsent({ sessionId: "s1", actorUserId: "u1", askedBy: "Alex Morgan" })).toEqual({ ok: true });
    expect(db.session).toMatchObject({ recordVideo: true, candidateConsentAt: null });
    expect(db.audits.at(-1)).toMatchObject({ action: "RECORDING_CONSENT_REQUESTED", meta: { askedBy: "Alex Morgan", prevConsentAt: earlier.toISOString() } });

    // Both sides see the open question.
    expect(await roomRecordingState("s1", false)).toMatchObject({ recording: false, ask: { by: "Alex Morgan" } });
    expect(await roomRecordingState("s1", true)).toMatchObject({ control: "waiting", canStart: false });
    // Asking twice does nothing new.
    await askRecordingConsent({ sessionId: "s1", actorUserId: "u1", askedBy: "Alex Morgan" });
    expect(db.audits.filter((a) => a.action === "RECORDING_CONSENT_REQUESTED")).toHaveLength(1);

    expect(await answerRecordingConsent({ sessionId: "s1", allow: true })).toEqual({ ok: true, started: true });
    expect(db.session!.candidateConsentAt).toBeInstanceOf(Date);
    expect(egress.startRoomCompositeEgress).toHaveBeenCalledTimes(1);
    expect(db.recordings[0]).toMatchObject({ status: "recording", startedById: "u1", egressId: "EG_1" });
    expect(db.audits.map((a) => a.action)).toEqual(["RECORDING_CONSENT_REQUESTED", "RECORDING_CONSENT_GIVEN", "RECORDING_STARTED"]);
    expect(db.audits[1].meta).toMatchObject({ source: "candidate", candidateName: "Priya Shah" });
    // A second answer is a no-op.
    expect(await answerRecordingConsent({ sessionId: "s1", allow: true })).toEqual({ ok: true });
    expect(egress.startRoomCompositeEgress).toHaveBeenCalledTimes(1);
  });

  it("a no switches recording back off, gives back the earlier agreement, and blocks asking again", async () => {
    db.session = session({ recordVideo: false, candidateConsentAt: earlier });
    await askRecordingConsent({ sessionId: "s1", actorUserId: "u1", askedBy: "Alex Morgan" });
    expect(await answerRecordingConsent({ sessionId: "s1", allow: false })).toEqual({ ok: true });
    expect(db.session).toMatchObject({ recordVideo: false, candidateConsentAt: earlier });
    expect(egress.startRoomCompositeEgress).not.toHaveBeenCalled();
    expect(db.audits.at(-1)?.action).toBe("RECORDING_CONSENT_DECLINED");

    expect(await roomRecordingState("s1", true)).toMatchObject({ control: "declined", canStart: false, candidateName: "Priya Shah" });
    expect(await roomRecordingState("s1", false)).toEqual({ recording: false, startedAt: null });
    const again = await askRecordingConsent({ sessionId: "s1", actorUserId: "u1", askedBy: "Alex Morgan" });
    expect(again).toMatchObject({ ok: false, code: "declined" });
    expect(!again.ok && again.error).toMatch(/Priya chose not to be recorded/);
    expect(db.session!.recordVideo).toBe(false);
  });

  it("knows when a request made in the room is still open, so a reload does not send the candidate to the lobby", async () => {
    db.session = session({ recordVideo: false, candidateConsentAt: earlier });
    expect(await pendingRoomAsk(db.session as never)).toBeNull();
    await askRecordingConsent({ sessionId: "s1", actorUserId: "u1", askedBy: "Alex Morgan" });
    expect(await pendingRoomAsk(db.session as never)).toEqual({ prevConsentAt: earlier });
    await answerRecordingConsent({ sessionId: "s1", allow: true });
    expect(await pendingRoomAsk(db.session as never)).toBeNull();
    // Set up to be recorded before the interview: the lobby asks as before.
    db.audits = [];
    db.session = session({ candidateConsentAt: null });
    expect(await pendingRoomAsk(db.session as never)).toBeNull();
  });

  it("does not ask when recording could not work anyway, and does not start on an agreement nobody asked for in the room", async () => {
    db.session = session({ recordVideo: false, candidateConsentAt: null });
    db.balance = 0;
    expect(await askRecordingConsent({ sessionId: "s1", actorUserId: "u1", askedBy: "Alex" })).toMatchObject({ ok: false, code: "no_credits" });
    expect(db.session!.recordVideo).toBe(false);

    db.balance = 10;
    db.session = session({ candidateConsentAt: null });
    expect(await answerRecordingConsent({ sessionId: "s1", allow: true })).toEqual({ ok: true, started: false });
    expect(egress.startRoomCompositeEgress).not.toHaveBeenCalled();
  });
});
