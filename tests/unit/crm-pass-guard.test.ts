/**
 * Passing is a person's call. These tests pin the rule on every path that can
 * write a candidate's stage: a recruiter may pass anyone, but a pass over
 * results below the bar (or with nothing scored) must be confirmed as a manual
 * override, and no automated path (assessment events, imports, API creates,
 * MCP tools) may pass anyone at all.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeScore, type CandidateResult } from "@/lib/crm/results";

const db = vi.hoisted(() => ({
  candidate: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  candidateNote: { create: vi.fn() },
  candidateBatch: { findFirst: vi.fn() },
  workspaceMember: { findFirst: vi.fn() },
}));
const audit = vi.hoisted(() => vi.fn());
const loadResults = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ canMember: vi.fn(async () => true) }));
vi.mock("@/lib/workspace-audit", () => ({
  writeWorkspaceAuditEntry: audit,
  WORKSPACE_AUDIT_ACTIONS: new Proxy({}, { get: (_t, k) => k }),
}));
vi.mock("@/lib/crm/results-server", () => ({ loadCandidateResults: loadResults }));
// MCP server dependencies that are not under test.
vi.mock("@/lib/ai-interview/credits", () => ({ getWorkspaceCredits: vi.fn(), refundCredit: vi.fn() }));
vi.mock("@/lib/ai-interview/template-resolver", () => ({ resolveTemplate: vi.fn() }));
vi.mock("@/lib/ai-interview/invite-email", () => ({ sendInviteEmail: vi.fn() }));
vi.mock("@/lib/mcp/audit", () => ({
  withAudit: async (_meta: unknown, handler: () => Promise<{ result: unknown }>) => (await handler()).result,
  writeAuditEntry: vi.fn(async () => {}),
}));

import {
  CandidateError,
  createCandidate,
  moveCandidatesStage,
  runBulkAction,
  updateCandidate,
  type CandidateActor,
} from "@/lib/crm/candidates-server";
import { advanceCandidateStage } from "@/lib/crm/advance";

const actor: CandidateActor = {
  workspaceId: "ws1",
  workspaceSlug: "acme",
  actorUserId: "u1",
  actorEmail: "recruiter@acme.test",
  role: "OWNER",
  isManager: true,
  member: { userId: "u1", role: "OWNER", permissions: null },
};

function scored(kind: CandidateResult["kind"], score: number, candidateId = "c1"): CandidateResult {
  return {
    id: `${kind}-${score}`,
    candidateId,
    kind,
    title: "Lead Frontend Engineer",
    state: "scored",
    score,
    rating: null,
    ...describeScore(kind, score),
    sentAt: "2026-08-20T10:00:00Z",
    startedAt: null,
    finishedAt: "2026-08-21T10:00:00Z",
    deadlineAt: null,
    scheduledAt: null,
    minutesTaken: null,
    minutesAllowed: null,
    href: null,
  };
}

const candidate = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  name: "Asha Rao",
  stage: "SCREENING",
  status: "active",
  tags: "[]",
  batchId: null,
  ownerId: null,
  email: "asha@example.com",
  phone: null,
  source: null,
  notes: null,
  updatedAt: new Date("2026-09-24T10:00:00Z"),
  ...over,
});

const resultsFor = (map: Record<string, CandidateResult[]>) =>
  loadResults.mockResolvedValue(new Map(Object.entries(map)));

const lastAuditMeta = () => audit.mock.calls.at(-1)?.[0]?.meta as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  db.candidate.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...candidate(), ...data }));
  db.candidate.create.mockResolvedValue({ id: "new1" });
  db.candidate.findUnique.mockResolvedValue(null);
});

describe("moving a candidate to Passed", () => {
  it("refuses a pass over a Not a fit screening unless it is confirmed", async () => {
    db.candidate.findMany.mockResolvedValue([candidate()]);
    resultsFor({ c1: [scored("ai_screening", 5)] });

    const err = await moveCandidatesStage(actor, ["c1"], "PASSED").catch((e) => e);
    expect(err).toBeInstanceOf(CandidateError);
    expect(err.status).toBe(409);
    expect(err.message).toBe("Asha Rao: AI screening 5, Not a fit. Confirm the pass as a manual override.");
    expect(err.extra).toEqual({ needsOverride: ["c1"] });
    expect(db.candidate.update).not.toHaveBeenCalled();
  });

  it("passes it as a manual override once confirmed, and records why", async () => {
    db.candidate.findMany.mockResolvedValue([candidate()]);
    resultsFor({ c1: [scored("ai_screening", 5)] });

    await expect(moveCandidatesStage(actor, ["c1"], "PASSED", { override: true })).resolves.toEqual({ moved: 1 });
    expect(db.candidate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stage: "PASSED", status: "passed" }) }),
    );
    expect(lastAuditMeta()).toMatchObject({ toStage: "PASSED", manualOverride: "AI screening 5, Not a fit" });
  });

  it("passes a candidate whose results clear the bar without asking", async () => {
    db.candidate.findMany.mockResolvedValue([candidate()]);
    resultsFor({ c1: [scored("ai_screening", 82), scored("take_home", 71)] });

    await expect(moveCandidatesStage(actor, ["c1"], "PASSED")).resolves.toEqual({ moved: 1 });
    expect(lastAuditMeta()).not.toHaveProperty("manualOverride");
  });

  it("treats a pass with nothing scored as a manual override", async () => {
    db.candidate.findMany.mockResolvedValue([candidate({ stage: "NEW" })]);
    resultsFor({});

    const err = await moveCandidatesStage(actor, ["c1"], "PASSED").catch((e) => e);
    expect(err.status).toBe(409);
    expect(err.message).toContain("No scored results yet");
  });

  it("checks every candidate in a bulk pass and names how many need confirming", async () => {
    db.candidate.findMany.mockResolvedValue([
      candidate(),
      candidate({ id: "c2", name: "Ben Ito" }),
      candidate({ id: "c3", name: "Cleo Park" }),
    ]);
    resultsFor({
      c1: [scored("ai_screening", 5)],
      c2: [scored("take_home", 40, "c2")],
      c3: [scored("take_home", 90, "c3")],
    });

    const err = await runBulkAction(actor, ["c1", "c2", "c3"], { action: "stage", stage: "PASSED" }).catch((e) => e);
    expect(err.status).toBe(409);
    expect(err.message).toMatch(/^2 candidates have results below the bar/);
    expect(err.extra.needsOverride).toEqual(["c1", "c2"]);
    expect(db.candidate.update).not.toHaveBeenCalled();

    await expect(
      runBulkAction(actor, ["c1", "c2", "c3"], { action: "stage", stage: "PASSED", override: true }),
    ).resolves.toEqual({ changed: 3 });
    const metas = audit.mock.calls.map((c) => c[0].meta);
    expect(metas.find((m) => m.candidateName === "Cleo Park")).not.toHaveProperty("manualOverride");
    expect(metas.find((m) => m.candidateName === "Ben Ito")).toMatchObject({ manualOverride: "Take-home 40, Below the mark" });
  });

  it("does not re-check someone already Passed", async () => {
    db.candidate.findMany.mockResolvedValue([candidate({ stage: "PASSED", status: "passed" })]);
    resultsFor({});
    await expect(moveCandidatesStage(actor, ["c1"], "PASSED")).resolves.toEqual({ moved: 0 });
  });

  it("needs no override to mark a failing candidate as not passed", async () => {
    db.candidate.findMany.mockResolvedValue([candidate()]);
    await expect(moveCandidatesStage(actor, ["c1"], "REJECTED", { rejectReason: "SKILL_GAP" })).resolves.toEqual({ moved: 1 });
    expect(loadResults).not.toHaveBeenCalled();
  });
});

describe("setting status to passed", () => {
  it("applies the same rule to the status field, including the old name hired", async () => {
    db.candidate.findFirst.mockResolvedValue(candidate());
    resultsFor({ c1: [scored("ai_screening", 5)] });

    for (const status of ["passed", "hired"] as const) {
      const err = await updateCandidate(actor, "c1", { status }).catch((e) => e);
      expect(err).toBeInstanceOf(CandidateError);
      expect(err.status).toBe(409);
    }
    expect(db.candidate.update).not.toHaveBeenCalled();

    await updateCandidate(actor, "c1", { status: "passed", override: true });
    expect(db.candidate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stage: "PASSED", status: "passed" }) }),
    );
    expect(lastAuditMeta()).toMatchObject({ toStage: "PASSED", manualOverride: "AI screening 5, Not a fit" });
  });
});

describe("adding candidates", () => {
  it("never lets a new candidate start as Passed or Not passed (API, CSV and bulk imports)", async () => {
    for (const stage of ["PASSED", "HIRED", "OFFER", "REJECTED"]) {
      const err = await createCandidate(actor, { name: "Dev Shah", email: `dev-${stage}@example.com`, stage }).catch((e) => e);
      expect(err).toBeInstanceOf(CandidateError);
      expect(err.status).toBe(400);
    }
    expect(db.candidate.create).not.toHaveBeenCalled();
  });

  it("starts people at New or Screening", async () => {
    await createCandidate(actor, { name: "Dev Shah", email: "dev@example.com", stage: "SCREENING" });
    expect(db.candidate.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stage: "SCREENING", status: "active" }) }),
    );
  });
});

describe("automatic stage changes from assessment events", () => {
  it("moves a new candidate into Screening", async () => {
    db.candidate.findFirst.mockResolvedValue(candidate({ stage: "NEW" }));
    await expect(
      advanceCandidateStage({ workspaceId: "ws1", candidateId: "c1", toStage: "SCREENING", source: "auto:ai-screening-completed" }),
    ).resolves.toEqual({ advanced: true });
  });

  it("refuses to make a decision, even when a caller forces the type", async () => {
    db.candidate.findFirst.mockResolvedValue(candidate());
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const toStage of ["PASSED", "REJECTED"]) {
      await expect(
        advanceCandidateStage({ workspaceId: "ws1", candidateId: "c1", toStage: toStage as "SCREENING", source: "auto:test" }),
      ).resolves.toEqual({ advanced: false });
    }
    err.mockRestore();
    expect(db.candidate.update).not.toHaveBeenCalled();
  });

  it("never moves a decided candidate", async () => {
    for (const stage of ["PASSED", "REJECTED"]) {
      db.candidate.findFirst.mockResolvedValue(candidate({ stage }));
      await expect(
        advanceCandidateStage({ workspaceId: "ws1", candidateId: "c1", toStage: "SCREENING", source: "auto:take-home-submitted" }),
      ).resolves.toEqual({ advanced: false });
    }
    expect(db.candidate.update).not.toHaveBeenCalled();
  });
});

describe("MCP update_candidate_status", () => {
  async function callTool(args: Record<string, unknown>) {
    const { buildMcpServer } = await import("@/lib/mcp/server");
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
    const server = buildMcpServer({
      apiKeyId: "k1",
      workspaceId: "ws1",
      workspaceSlug: "acme",
      workspaceName: "Acme",
      workspacePlanName: "Pro",
      growthTools: true,
      scopes: ["read", "write"],
      label: "Claude",
    });
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "1.0.0" });
    await Promise.all([server.connect(a), client.connect(b)]);
    const out = await client.callTool({ name: "update_candidate_status", arguments: args });
    await client.close();
    return out as { isError?: boolean; content: { type: string; text: string }[] };
  }

  it("refuses to pass anyone, under either name", async () => {
    db.candidate.findFirst.mockResolvedValue(candidate());
    for (const status of ["passed", "hired"]) {
      const out = await callTool({ candidate_id: "c1", status });
      expect(out.isError).toBe(true);
      expect(out.content[0].text).toContain("Passing a candidate is a recruiter decision");
    }
    expect(db.candidate.update).not.toHaveBeenCalled();
  });

  it("keeps the stage in step when it marks someone rejected", async () => {
    db.candidate.findFirst.mockResolvedValue(candidate());
    const out = await callTool({ candidate_id: "c1", status: "rejected" });
    expect(out.isError).toBeFalsy();
    expect(db.candidate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "rejected", stage: "REJECTED", rejectReason: "OTHER" }) }),
    );
  });
});
