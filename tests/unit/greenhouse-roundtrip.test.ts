import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Greenhouse round trip against an in-memory database and a mocked
 * fetch: send_test imports and invites, test_status stays open until a
 * recruiter decides, and the decision PATCHes Greenhouse once.
 */

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  seq: 0,
  dispatched: [] as string[],
  results: new Map<string, { id: string; state: string; score: number | null }[]>(),
}));

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (k === "OR") {
      if (!(v as Row[]).some((w) => matches(row, w))) return false;
      continue;
    }
    if (k === "workspaceId_email") {
      const u = v as Row;
      if (row.workspaceId !== u.workspaceId || row.email !== u.email) return false;
      continue;
    }
    if (k === "workspaceId_name") {
      const u = v as Row;
      if (row.workspaceId !== u.workspaceId || row.name !== u.name) return false;
      continue;
    }
    if (v && typeof v === "object" && !(v instanceof Date)) {
      const op = v as Row;
      if ("in" in op && !(op.in as unknown[]).includes(row[k])) return false;
      if ("not" in op && row[k] === op.not) return false;
      if ("contains" in op && !String(row[k] ?? "").includes(op.contains as string)) return false;
      if ("gte" in op && !((row[k] as Date) >= (op.gte as Date))) return false;
      continue;
    }
    if ((row[k] ?? null) !== v) return false;
  }
  return true;
}

vi.mock("@/lib/prisma", () => {
  const table = (name: string) => {
    const rows = () => (db.tables[name] ??= []);
    const withRelations = (r: Row | undefined) => {
      if (!r) return null;
      if (name === "atsTestRequest") {
        const candidate = db.tables.candidate.find((c) => c.id === r.candidateId);
        const ws = db.tables.workspace.find((w) => w.id === r.workspaceId)!;
        const integ = db.tables.atsIntegration.find((i) => i.workspaceId === r.workspaceId);
        return { ...r, candidate, workspace: { ...ws, atsIntegration: integ ?? null } };
      }
      if (name === "atsIntegration") {
        return { ...r, workspace: db.tables.workspace.find((w) => w.id === r.workspaceId) };
      }
      return { ...r };
    };
    return {
      findUnique: vi.fn(async ({ where }: { where: Row }) => withRelations(rows().find((r) => matches(r, where)))),
      findFirst: vi.fn(async ({ where }: { where?: Row } = {}) => withRelations(rows().find((r) => matches(r, where)))),
      findMany: vi.fn(async ({ where }: { where?: Row } = {}) => rows().filter((r) => matches(r, where)).map((r) => ({ ...r }))),
      count: vi.fn(async ({ where }: { where?: Row } = {}) => rows().filter((r) => matches(r, where)).length),
      create: vi.fn(async ({ data }: { data: Row }) => {
        if (name === "atsTestRequest" && data.externalApplicationId && rows().some((r) => r.workspaceId === data.workspaceId && r.externalApplicationId === data.externalApplicationId && r.mappingId === data.mappingId)) {
          throw Object.assign(new Error("unique"), { code: "P2002" });
        }
        const row = { id: `${name}_${++db.seq}`, createdAt: new Date(), status: "waiting", reportedAt: null, sessionId: null, resolvedAt: null, ...data };
        rows().push(row);
        return { ...row };
      }),
      update: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const r = rows().find((x) => matches(x, where))!;
        Object.assign(r, data);
        return { ...r };
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const hit = rows().filter((x) => matches(x, where));
        hit.forEach((x) => Object.assign(x, data));
        return { count: hit.length };
      }),
    };
  };
  const names = ["workspace", "atsIntegration", "atsJobMapping", "atsTestRequest", "atsSyncEvent", "candidate", "candidateBatch", "aIScreeningBatch", "takeHomeTemplate"];
  return { prisma: Object.fromEntries(names.map((n) => [n, table(n)])) };
});
vi.mock("@prisma/client", () => ({ Prisma: { PrismaClientKnownRequestError: class extends Error {} } }));
vi.mock("@/lib/workspace-audit", () => ({ WORKSPACE_AUDIT_ACTIONS: { CANDIDATE_CREATED: "CANDIDATE_CREATED" }, writeWorkspaceAuditEntry: vi.fn(async () => undefined) }));
vi.mock("@/lib/interview/links", () => ({ appOrigin: async () => "https://codepad.test" }));
vi.mock("@/lib/crm/results-server", () => ({
  loadCandidateResults: async (_ws: string, _slug: string, ids: string[]) => new Map(ids.map((id) => [id, db.results.get(id) ?? []])),
}));
vi.mock("@/lib/ats/dispatch", () => ({
  screeningNoun: (k: string) => (k === "ai" ? "AI screening" : "take home"),
  sendRequestScreening: vi.fn(async (requestId: string) => {
    db.dispatched.push(requestId);
    const r = db.tables.atsTestRequest.find((x) => x.id === requestId)!;
    r.sessionId = `session_for_${requestId}`;
    r.status = "sent";
    return { ok: true, sessionId: r.sessionId, emailed: true };
  }),
}));

import { handlePartnerCall } from "@/lib/ats/partner-server";
import { onAtsWorkspaceEvent } from "@/lib/ats/writeback";
import { hashPartnerKey } from "@/lib/ats/greenhouse";

const KEY = "cpgh_test_key";
const auth = `Basic ${Buffer.from(`${KEY}:`).toString("base64")}`;
const CALLBACK = "https://api.greenhouse.io/v1/partner/completed/abc";
const fetchMock = vi.fn();

function seed() {
  db.seq = 0;
  db.dispatched = [];
  db.results = new Map();
  db.tables = {
    workspace: [{ id: "ws1", slug: "acme", planName: "GROWTH", trialEndsAt: null, stripeSubscriptionId: "sub_1" }],
    atsIntegration: [{ id: "int1", workspaceId: "ws1", provider: "greenhouse", partnerKeyHash: hashPartnerKey(KEY), settings: JSON.stringify({ sendScore: true, setupComplete: true }) }],
    atsJobMapping: [
      { id: "map_fe", workspaceId: "ws1", provider: "greenhouse", jobName: "Senior Frontend Engineer", screeningKind: "ai", screeningId: "batch_1", sendMode: "auto" },
      { id: "map_be", workspaceId: "ws1", provider: "greenhouse", jobName: "Backend Engineer", screeningKind: "takehome", screeningId: "tpl_1", sendMode: "review" },
      { id: "map_ae", workspaceId: "ws1", provider: "greenhouse", jobName: "Account Executive", screeningKind: "none", screeningId: null, sendMode: "auto" },
    ],
    aIScreeningBatch: [{ id: "batch_1", workspaceId: "ws1", positionTitle: "Senior frontend" }],
    takeHomeTemplate: [{ id: "tpl_1", workspaceId: "ws1", name: "Payments API" }],
    atsTestRequest: [],
    atsSyncEvent: [],
    candidate: [],
    candidateBatch: [],
  };
}

const sendTest = (over: Row = {}) =>
  handlePartnerCall("send_test", {
    method: "POST",
    authorization: auth,
    query: new URLSearchParams(),
    body: {
      partner_test_id: "map_fe",
      candidate: { first_name: "Ana", last_name: "Lima", email: "ana@example.com", id: 4417, greenhouse_profile_url: "https://app.greenhouse.io/people/4417" },
      application: { id: 9001 },
      url: CALLBACK,
      ...over,
    },
  });
const status = (id: string) => handlePartnerCall("test_status", { method: "GET", authorization: auth, query: new URLSearchParams({ partner_interview_id: id }), body: null });

beforeEach(() => {
  seed();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

describe("Greenhouse partner endpoints", () => {
  it("refuses a wrong key and a wrong method", async () => {
    const bad = await handlePartnerCall("list_tests", { method: "GET", authorization: `Basic ${Buffer.from("nope:").toString("base64")}`, query: new URLSearchParams(), body: null });
    expect(bad.status).toBe(401);
    const wrong = await handlePartnerCall("list_tests", { method: "POST", authorization: auth, query: new URLSearchParams(), body: null });
    expect(wrong.status).toBe(405);
  });

  it("lists only jobs mapped to a screening", async () => {
    const res = await handlePartnerCall("list_tests", { method: "GET", authorization: auth, query: new URLSearchParams(), body: null });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { partner_test_id: "map_fe", partner_test_name: "Senior Frontend Engineer: AI screening, Senior frontend" },
      { partner_test_id: "map_be", partner_test_name: "Backend Engineer: Take home, Payments API" },
    ]);
  });

  it("imports a new candidate into the job batch and sends the screening once", async () => {
    const res = await sendTest();
    expect(res.status).toBe(200);
    const id = (res.body as { partner_interview_id: string }).partner_interview_id;
    expect(db.tables.candidate).toHaveLength(1);
    expect(db.tables.candidate[0]).toMatchObject({ email: "ana@example.com", source: "greenhouse", atsRef: "greenhouse:4417", stage: "NEW" });
    expect(db.tables.candidateBatch[0]).toMatchObject({ name: "Senior Frontend Engineer" });
    expect(db.tables.candidate[0].batchId).toBe(db.tables.candidateBatch[0].id);
    expect(db.dispatched).toEqual([id]);
    expect(db.tables.atsSyncEvent.at(-1)).toMatchObject({ direction: "in", status: "imported", summary: "Ana Lima added to Senior Frontend Engineer, AI screening sent" });

    // Greenhouse re-sends the same request: same id, no second invite.
    const again = await sendTest();
    expect((again.body as { partner_interview_id: string }).partner_interview_id).toBe(id);
    expect(db.dispatched).toHaveLength(1);
    expect(db.tables.candidate).toHaveLength(1);
  });

  it("links an existing candidate by email instead of duplicating", async () => {
    db.tables.candidate.push({ id: "c_old", workspaceId: "ws1", name: "Ana L.", email: "ana@example.com", stage: "SCREENING", batchId: null, atsRef: null, atsProfileUrl: null });
    await sendTest();
    expect(db.tables.candidate).toHaveLength(1);
    expect(db.tables.candidate[0]).toMatchObject({ id: "c_old", name: "Ana L.", atsRef: "greenhouse:4417" });
    expect(db.tables.atsSyncEvent.at(-1)?.status).toBe("linked");
  });

  it("waits for a recruiter when the job is set to After I review", async () => {
    const res = await sendTest({ partner_test_id: "map_be" });
    const id = (res.body as { partner_interview_id: string }).partner_interview_id;
    expect(db.dispatched).toEqual([]);
    expect(db.tables.atsSyncEvent.at(-1)).toMatchObject({ status: "waiting", summary: "Ana Lima added to Backend Engineer. Waiting for you to send the take home." });
    expect((await status(id)).body).toEqual({ partner_status: "waiting_for_recruiter" });
  });

  it("refuses a test that is not mapped", async () => {
    const res = await sendTest({ partner_test_id: "map_ae" });
    expect(res.status).toBe(404);
    expect(db.tables.candidate).toHaveLength(0);
    expect(db.tables.atsSyncEvent.at(-1)?.status).toBe("failed");
  });
});

describe("write-back", () => {
  async function importedAndScored() {
    const res = await sendTest();
    const id = (res.body as { partner_interview_id: string }).partner_interview_id;
    const cand = db.tables.candidate[0];
    db.results.set(cand.id as string, [{ id: `session_for_${id}`, state: "scored", score: 81 }]);
    return { id, cand };
  }

  it("stays open on a score alone and sends nothing", async () => {
    const { id, cand } = await importedAndScored();
    await onAtsWorkspaceEvent("ws1", "screening.completed", { candidate: { id: cand.id as string }, screening: { id: `session_for_${id}` } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await status(id)).body).toEqual({ partner_status: "completed_awaiting_decision" });
    expect(db.tables.atsSyncEvent.at(-1)).toMatchObject({ direction: "out", status: "info", summary: "Ana Lima: AI screening completed, waiting for a decision" });
  });

  it("PATCHes Greenhouse once after the recruiter decides", async () => {
    const { id, cand } = await importedAndScored();
    await new Promise((r) => setTimeout(r, 5));
    Object.assign(cand, { stage: "PASSED", stageChangedAt: new Date() });

    await onAtsWorkspaceEvent("ws1", "candidate.decided", { candidate: { id: cand.id as string } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(CALLBACK);
    expect(init.method).toBe("PATCH");
    expect(db.tables.atsSyncEvent.at(-1)).toMatchObject({ direction: "out", status: "sent", summary: "Ana Lima: Passed, score 81, profile link" });

    expect((await status(id)).body).toEqual({
      partner_status: "complete",
      partner_profile_url: `https://codepad.test/w/acme/candidates/${cand.id}`,
      partner_score: 81,
      metadata: { Decision: "Passed", Screening: "AI screening for Senior Frontend Engineer" },
    });

    // A second event does not send it again.
    await onAtsWorkspaceEvent("ws1", "candidate.decided", { candidate: { id: cand.id as string } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("logs a refused PATCH with its status so it can be retried", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    const { cand } = await importedAndScored();
    await new Promise((r) => setTimeout(r, 5));
    Object.assign(cand, { stage: "REJECTED", stageChangedAt: new Date() });
    await onAtsWorkspaceEvent("ws1", "candidate.decided", { candidate: { id: cand.id as string } });
    const last = db.tables.atsSyncEvent.at(-1)!;
    expect(last).toMatchObject({ direction: "out", status: "failed", httpStatus: 403 });
    expect(String(last.detail)).toMatch(/refused/);
    expect(db.tables.atsTestRequest[0].reportedAt).toBeNull();
  });

  it("never calls a callback outside Greenhouse", async () => {
    const res = await sendTest({ url: "https://evil.example.com/steal" });
    const id = (res.body as { partner_interview_id: string }).partner_interview_id;
    const cand = db.tables.candidate[0];
    db.results.set(cand.id as string, [{ id: `session_for_${id}`, state: "scored", score: 50 }]);
    await new Promise((r) => setTimeout(r, 5));
    Object.assign(cand, { stage: "REJECTED", stageChangedAt: new Date() });
    await onAtsWorkspaceEvent("ws1", "candidate.decided", { candidate: { id: cand.id as string } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.tables.atsSyncEvent.at(-1)).toMatchObject({ status: "failed" });
  });
});
