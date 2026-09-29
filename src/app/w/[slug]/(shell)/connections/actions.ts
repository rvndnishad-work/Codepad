"use server";

/**
 * Connections: the ATS (Greenhouse) setup, job mapping, sync log actions.
 * Each returns a result object instead of throwing, so the page can show the
 * real reason. Changing settings needs `integration:manage` and a Growth-level
 * plan; sending a waiting invite needs permission to send screenings.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { canMember } from "@/lib/permissions";
import { encryptAtRest, decryptAtRest } from "@/lib/crypto/at-rest";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { GREENHOUSE, generatePartnerKey, hashPartnerKey } from "@/lib/ats/greenhouse";
import { cleanScreeningKind, cleanSendMode, parseAtsSettings, type AtsSettings } from "@/lib/ats/settings";
import { previewAtsImport, providerName } from "@/lib/ats/import";
import { sendRequestScreening, screeningNoun } from "@/lib/ats/dispatch";
import { reportIfReady, syncOpenRequests } from "@/lib/ats/writeback";
import { logSyncEvent } from "@/lib/ats/sync-log";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

class ActionError extends Error {}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message };
  console.error("[connections action]", err);
  return { ok: false, error: "Something went wrong. Try again." };
}

async function actor(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new ActionError("Sign in again to continue.");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) throw new ActionError("Workspace not found.");
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) throw new ActionError("You are not a member of this workspace.");
  if (!growthToolsEnabled(workspace)) throw new ActionError("This workspace plan does not include ATS connections.");
  return { workspace, member, userId: session.user.id, email: session.user.email ?? null };
}

async function assertAdmin(slug: string) {
  const a = await actor(slug);
  if (!(await canMember(a.member, "integration:manage"))) throw new ActionError("Only workspace admins can change connections.");
  return a;
}

type Actor = Awaited<ReturnType<typeof actor>>;

function audit(a: Actor, action: string, meta: Record<string, unknown>, target: { type: string; id: string | null } = { type: "atsIntegration", id: a.workspace.id }) {
  void writeWorkspaceAuditEntry({
    workspaceId: a.workspace.id,
    actorUserId: a.userId,
    actorEmail: a.email,
    action,
    targetType: target.type,
    targetId: target.id,
    meta,
  });
}

function refresh(slug: string) {
  revalidatePath(`/w/${slug}/connections`, "layout");
}

async function integrationOf(workspaceId: string) {
  return prisma.atsIntegration.findUnique({ where: { workspaceId } });
}

async function saveSettings(workspaceId: string, patch: Partial<AtsSettings>) {
  const row = await integrationOf(workspaceId);
  if (!row) throw new ActionError("Connect Greenhouse first.");
  const next = { ...parseAtsSettings(row.settings), ...patch };
  await prisma.atsIntegration.update({ where: { workspaceId }, data: { settings: JSON.stringify(next) } });
  return next;
}

/* ── Connect, key, disconnect ─────────────────────────────────────────── */

/** Creates the Greenhouse connection and returns its key, shown once here. */
export async function connectGreenhouseAction(slug: string): Promise<Result<{ key: string }>> {
  try {
    const a = await assertAdmin(slug);
    const existing = await integrationOf(a.workspace.id);
    if (existing && existing.provider !== GREENHOUSE) {
      throw new ActionError(`This workspace is connected to ${providerName(existing.provider)}. One ATS per workspace: disconnect it first.`);
    }
    if (existing) throw new ActionError("Greenhouse is already connected. Replace the key in Settings if you need a new one.");
    const key = generatePartnerKey();
    await prisma.atsIntegration.create({
      data: {
        workspaceId: a.workspace.id,
        provider: GREENHOUSE,
        apiKey: encryptAtRest(key),
        partnerKeyHash: hashPartnerKey(key),
        connectedById: a.userId,
        settings: JSON.stringify(parseAtsSettings("{}")),
      },
    });
    audit(a, WORKSPACE_AUDIT_ACTIONS.ATS_INTEGRATION_CONNECTED, { provider: GREENHOUSE, via: "partner-api" });
    refresh(slug);
    return { ok: true, key };
  } catch (err) {
    return fail(err);
  }
}

export async function revealPartnerKeyAction(slug: string): Promise<Result<{ key: string }>> {
  try {
    const a = await assertAdmin(slug);
    const row = await integrationOf(a.workspace.id);
    if (!row || row.provider !== GREENHOUSE || !row.partnerKeyHash) throw new ActionError("Greenhouse is not connected.");
    const key = decryptAtRest(row.apiKey);
    if (!key) throw new ActionError("The key could not be read. Replace it to get a new one.");
    audit(a, WORKSPACE_AUDIT_ACTIONS.ATS_PARTNER_KEY_REVEALED, { provider: GREENHOUSE });
    return { ok: true, key };
  } catch (err) {
    return fail(err);
  }
}

export async function rotatePartnerKeyAction(slug: string): Promise<Result<{ key: string }>> {
  try {
    const a = await assertAdmin(slug);
    const row = await integrationOf(a.workspace.id);
    if (!row || row.provider !== GREENHOUSE) throw new ActionError("Greenhouse is not connected.");
    const key = generatePartnerKey();
    await prisma.atsIntegration.update({
      where: { workspaceId: a.workspace.id },
      data: { apiKey: encryptAtRest(key), partnerKeyHash: hashPartnerKey(key) },
    });
    audit(a, WORKSPACE_AUDIT_ACTIONS.ATS_PARTNER_KEY_ROTATED, { provider: GREENHOUSE });
    refresh(slug);
    return { ok: true, key };
  } catch (err) {
    return fail(err);
  }
}

export async function disconnectAtsAction(slug: string): Promise<Result> {
  try {
    const a = await assertAdmin(slug);
    const row = await integrationOf(a.workspace.id);
    if (!row) throw new ActionError("Nothing is connected.");
    // Mappings, requests and the sync log stay, so reconnecting picks up
    // where it left off. Without the key Greenhouse can no longer call us.
    await prisma.atsIntegration.delete({ where: { workspaceId: a.workspace.id } });
    audit(a, WORKSPACE_AUDIT_ACTIONS.ATS_INTEGRATION_DISCONNECTED, { provider: row.provider });
    refresh(slug);
    revalidatePath(`/w/${slug}/ats`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/* ── Settings ─────────────────────────────────────────────────────────── */

export async function saveTriggerStageAction(slug: string, stage: string): Promise<Result> {
  try {
    const a = await assertAdmin(slug);
    const clean = stage.trim().slice(0, 120);
    if (!clean) throw new ActionError("Name the Greenhouse stage, for example Technical screen.");
    await saveSettings(a.workspace.id, { triggerStage: clean });
    audit(a, WORKSPACE_AUDIT_ACTIONS.ATS_SETTINGS_SAVED, { triggerStage: clean });
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function saveWritebackAction(slug: string, input: { sendScore: boolean }): Promise<Result> {
  try {
    const a = await assertAdmin(slug);
    await saveSettings(a.workspace.id, { sendScore: !!input.sendScore });
    audit(a, WORKSPACE_AUDIT_ACTIONS.ATS_SETTINGS_SAVED, { sendScore: !!input.sendScore });
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function finishSetupAction(slug: string): Promise<Result> {
  try {
    const a = await assertAdmin(slug);
    const s = await saveSettings(a.workspace.id, { setupComplete: true });
    audit(a, WORKSPACE_AUDIT_ACTIONS.ATS_SETTINGS_SAVED, { setupComplete: true, triggerStage: s.triggerStage });
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/* ── Job mapping ──────────────────────────────────────────────────────── */

export type MappingInput = {
  id?: string;
  jobName: string;
  jobDetail?: string;
  screeningKind: string;
  screeningId?: string | null;
  sendMode: string;
};

const MAX_MAPPINGS = 200;

/** Saves the whole mapping table: updates, adds, and removes rows left out. */
export async function saveJobMappingsAction(slug: string, rows: MappingInput[]): Promise<Result<{ saved: number; ids: Record<string, string> }>> {
  try {
    const a = await assertAdmin(slug);
    const integration = await integrationOf(a.workspace.id);
    if (!integration) throw new ActionError("Connect Greenhouse first.");
    const provider = integration.provider;
    if (!Array.isArray(rows) || rows.length > MAX_MAPPINGS) throw new ActionError(`Map at most ${MAX_MAPPINGS} jobs.`);

    const clean = rows.map((r, i) => {
      const jobName = (r.jobName ?? "").trim().slice(0, 120);
      if (!jobName) throw new ActionError(`Row ${i + 1} needs the job name as it reads in ${providerName(provider)}.`);
      const kind = cleanScreeningKind(r.screeningKind);
      const screeningId = kind === "none" ? null : (r.screeningId ?? "").trim() || null;
      if (kind !== "none" && !screeningId) throw new ActionError(`Pick a screening for ${jobName}, or set it to Do nothing.`);
      return {
        id: r.id,
        jobName,
        jobDetail: (r.jobDetail ?? "").trim().slice(0, 120) || null,
        screeningKind: kind,
        screeningId,
        sendMode: cleanSendMode(r.sendMode),
      };
    });
    const names = new Set<string>();
    for (const r of clean) {
      const k = r.jobName.toLowerCase();
      if (names.has(k)) throw new ActionError(`${r.jobName} is listed twice.`);
      names.add(k);
    }

    // Every picked screening must belong to this workspace.
    const aiIds = clean.filter((r) => r.screeningKind === "ai").map((r) => r.screeningId!);
    const thIds = clean.filter((r) => r.screeningKind === "takehome").map((r) => r.screeningId!);
    const [ai, th] = await Promise.all([
      aiIds.length ? prisma.aIScreeningBatch.count({ where: { id: { in: [...new Set(aiIds)] }, workspaceId: a.workspace.id } }) : 0,
      thIds.length ? prisma.takeHomeTemplate.count({ where: { id: { in: [...new Set(thIds)] }, workspaceId: a.workspace.id } }) : 0,
    ]);
    if (ai !== new Set(aiIds).size || th !== new Set(thIds).size) throw new ActionError("A picked screening no longer exists. Reload and try again.");

    const existing = await prisma.atsJobMapping.findMany({ where: { workspaceId: a.workspace.id, provider }, select: { id: true } });
    const keep = new Set(clean.map((r) => r.id).filter(Boolean));
    await prisma.$transaction(async (tx) => {
      const removed = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
      if (removed.length) await tx.atsJobMapping.deleteMany({ where: { id: { in: removed }, workspaceId: a.workspace.id } });
      for (const r of clean) {
        const data = { jobName: r.jobName, jobDetail: r.jobDetail, screeningKind: r.screeningKind, screeningId: r.screeningId, sendMode: r.sendMode };
        if (r.id && existing.some((e) => e.id === r.id)) {
          await tx.atsJobMapping.update({ where: { id: r.id }, data });
        } else {
          await tx.atsJobMapping.create({ data: { ...data, workspaceId: a.workspace.id, provider } });
        }
      }
    });
    audit(a, WORKSPACE_AUDIT_ACTIONS.ATS_JOB_MAPPING_SAVED, {
      provider,
      jobs: clean.length,
      mapped: clean.filter((r) => r.screeningKind !== "none").length,
    });
    refresh(slug);
    // Row ids are the test ids Greenhouse stores, so the editor keeps them.
    const saved = await prisma.atsJobMapping.findMany({ where: { workspaceId: a.workspace.id, provider }, select: { id: true, jobName: true } });
    return { ok: true, saved: clean.length, ids: Object.fromEntries(saved.map((m) => [m.jobName.toLowerCase(), m.id])) };
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002") {
      return { ok: false, error: "Two rows have the same job name." };
    }
    return fail(err);
  }
}

/* ── Test step ────────────────────────────────────────────────────────── */

export async function testImportAction(
  slug: string,
  input: { mappingId: string; name: string; email: string },
): Promise<Result<{ lines: string[] }>> {
  try {
    const a = await assertAdmin(slug);
    const email = (input.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ActionError("Enter a valid email address.");
    const mapping = await prisma.atsJobMapping.findFirst({ where: { id: input.mappingId, workspaceId: a.workspace.id } });
    if (!mapping) throw new ActionError("Pick a job to test with.");
    const lines = await previewAtsImport({
      workspaceId: a.workspace.id,
      provider: mapping.provider,
      mapping,
      person: { name: (input.name ?? "").trim(), email },
    });
    return { ok: true, lines };
  } catch (err) {
    return fail(err);
  }
}

/* ── Sync log ─────────────────────────────────────────────────────────── */

export async function syncNowAction(slug: string): Promise<Result<{ checked: number; sent: number; failed: number }>> {
  try {
    const a = await assertAdmin(slug);
    const res = await syncOpenRequests(a.workspace.id);
    audit(a, WORKSPACE_AUDIT_ACTIONS.ATS_SYNC_RUN, res);
    refresh(slug);
    return { ok: true, ...res };
  } catch (err) {
    return fail(err);
  }
}

export async function retryWritebackAction(slug: string, eventId: string): Promise<Result<{ outcome: string }>> {
  try {
    const a = await assertAdmin(slug);
    const ev = await prisma.atsSyncEvent.findFirst({ where: { id: eventId, workspaceId: a.workspace.id } });
    if (!ev || ev.direction !== "out" || ev.status !== "failed" || !ev.requestId) throw new ActionError("Only a failed send to the ATS can be retried.");
    const outcome = await reportIfReady(ev.requestId, { force: true });
    if (outcome === "not_ready") throw new ActionError("There is no decision to send for this candidate right now.");
    await prisma.atsSyncEvent.update({ where: { id: ev.id }, data: { resolvedAt: new Date() } });
    audit(a, WORKSPACE_AUDIT_ACTIONS.ATS_WRITEBACK_RETRIED, { requestId: ev.requestId, outcome });
    refresh(slug);
    return { ok: true, outcome };
  } catch (err) {
    return fail(err);
  }
}

/** Sends the screening for an import that was waiting for a recruiter. */
export async function sendWaitingInviteAction(slug: string, requestId: string): Promise<Result> {
  try {
    const a = await actor(slug);
    const req = await prisma.atsTestRequest.findFirst({
      where: { id: requestId, workspaceId: a.workspace.id },
      include: { candidate: { select: { name: true } } },
    });
    if (!req) throw new ActionError("That request no longer exists.");
    const perm = req.screeningKind === "ai" ? "interview:conduct" : "takehome:create";
    if (!(await canMember(a.member, perm))) throw new ActionError(`You do not have permission to send a ${screeningNoun(req.screeningKind)}.`);
    if (req.sessionId) throw new ActionError("This screening was already sent.");
    const res = await sendRequestScreening(req.id, { actorUserId: a.userId, actorEmail: a.email });
    const noun = screeningNoun(req.screeningKind);
    await logSyncEvent({
      workspaceId: a.workspace.id,
      provider: req.provider,
      direction: "in",
      status: res.ok ? "imported" : "failed",
      summary: res.ok ? `${req.candidate.name}: ${noun} sent after review` : `${req.candidate.name}: the ${noun} was not sent`,
      detail: res.ok ? null : res.error,
      candidateId: req.candidateId,
      requestId: req.id,
    });
    if (res.ok) {
      await prisma.atsSyncEvent.updateMany({
        where: { requestId: req.id, status: { in: ["waiting", "failed"] }, resolvedAt: null },
        data: { resolvedAt: new Date() },
      });
    }
    audit(a, WORKSPACE_AUDIT_ACTIONS.ATS_IMPORT_SENT, { requestId: req.id, ok: res.ok }, { type: "candidate", id: req.candidateId });
    refresh(slug);
    revalidatePath(`/w/${slug}/candidates/${req.candidateId}`);
    if (!res.ok) throw new ActionError(res.error);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
