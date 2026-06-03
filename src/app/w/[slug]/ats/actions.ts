"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { workspacePlanAllowsAiScreening } from "@/lib/ai-interview/credits";
import { validateOutboundUrl } from "@/lib/mcp/outbound";
import { encryptAtRest, decryptAtRest } from "@/lib/crypto/at-rest";
import {
  writeWorkspaceAuditEntry,
  WORKSPACE_AUDIT_ACTIONS,
} from "@/lib/workspace-audit";

/**
 * Per-workspace ATS integration (IP-32). Each workspace owns its own
 * Greenhouse/Lever/Ashby account, so this lives at /w/[slug]/ats — not at
 * /admin/settings. There is no platform-global tier.
 *
 * Schema reuse: we use the existing `AtsIntegration` row (workspaceId @unique
 * → exactly one integration per workspace) and store the webhook URL inside
 * the `settings` JSON blob to avoid a migration. apiKey and webhookSecret are
 * AES-GCM-encrypted at rest (same helper as External MCP / IP-2).
 */

const VALID_PROVIDERS = new Set(["lever", "greenhouse", "ashby"] as const);
export type AtsProvider = "lever" | "greenhouse" | "ashby";

type Member = { userId: string; role: string };

async function assertWorkspaceAdmin(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Not authenticated");

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      planName: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!workspace) throw new Error("Workspace not found");

  const member = workspace.members.find((m: Member) => m.userId === session.user.id);
  if (!member) throw new Error("Not a member of this workspace");

  if (!workspacePlanAllowsAiScreening(workspace.planName)) {
    // Same plan gate as External MCP — ATS sync is a paid-tier feature
    // (see pricing page).
    throw new Error("This workspace plan does not include ATS integrations.");
  }
  if (member.role !== "OWNER" && member.role !== "ADMIN") {
    throw new Error("Only workspace owners/admins can manage ATS integrations.");
  }

  return {
    workspace,
    userId: session.user.id,
    actorEmail: session.user.email ?? null,
  };
}

type StoredSettings = { webhookUrl?: string };

function parseSettings(raw: string): StoredSettings {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export type AtsIntegrationView = {
  provider: AtsProvider;
  webhookUrl: string;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  createdAt: string;
} | null;

/**
 * Returns a read-only view of the current ATS integration for a workspace.
 * Never returns plaintext credentials — just URLs and `has*` booleans so the
 * form can tell which fields are pre-populated without echoing secrets back
 * through the DOM.
 *
 * Anyone in the workspace can view (so empty-state can render for non-admins
 * too), but mutations are gated to OWNER/ADMIN.
 */
export async function getAtsIntegrationView(slug: string): Promise<AtsIntegrationView> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      members: { select: { userId: true } },
      atsIntegration: true,
    },
  });
  if (!workspace) return null;
  const isMember = workspace.members.some((m) => m.userId === session.user.id);
  if (!isMember) return null;
  if (!workspace.atsIntegration) return null;

  const row = workspace.atsIntegration;
  const settings = parseSettings(row.settings);
  return {
    provider: row.provider as AtsProvider,
    webhookUrl: settings.webhookUrl ?? "",
    hasApiKey: !!row.apiKey,
    hasWebhookSecret: !!row.webhookSecret,
    createdAt: row.createdAt.toISOString(),
  };
}

export type SaveAtsInput = {
  provider: AtsProvider;
  webhookUrl: string;
  /** undefined = keep existing, "" = clear (only valid for webhookSecret), string = replace */
  apiKey?: string;
  webhookSecret?: string;
};

export async function saveAtsIntegrationAction(slug: string, input: SaveAtsInput) {
  const { workspace, userId, actorEmail } = await assertWorkspaceAdmin(slug);

  if (!VALID_PROVIDERS.has(input.provider)) {
    throw new Error("Unknown provider.");
  }
  const webhookUrl = (input.webhookUrl ?? "").trim();
  if (!webhookUrl) throw new Error("Webhook URL is required.");

  // SSRF gate — same logic as External MCP. We reject private/internal hosts
  // at write time so the test event can't be coerced into hitting a metadata
  // service later.
  const ssrf = await validateOutboundUrl(webhookUrl);
  if (!ssrf.ok) throw new Error(`Invalid URL: ${ssrf.reason}`);

  const existing = await prisma.atsIntegration.findUnique({
    where: { workspaceId: workspace.id },
  });

  // apiKey: on create it's required (no existing row); on update it's optional
  // (undefined = keep).
  let apiKeyToStore: string | undefined;
  if (input.apiKey !== undefined) {
    const trimmed = input.apiKey.trim();
    if (!trimmed) throw new Error("API key cannot be empty.");
    apiKeyToStore = encryptAtRest(trimmed);
  } else if (!existing) {
    throw new Error("API key is required when connecting an ATS for the first time.");
  }

  // webhookSecret: optional and clearable.
  //   undefined → keep existing
  //   ""        → clear
  //   string    → replace (encrypted)
  let webhookSecretToStore: string | null | undefined;
  if (input.webhookSecret === undefined) webhookSecretToStore = undefined; // keep
  else if (input.webhookSecret === "") webhookSecretToStore = null;
  else webhookSecretToStore = encryptAtRest(input.webhookSecret);

  const settingsJson = JSON.stringify({ webhookUrl });

  if (existing) {
    await prisma.atsIntegration.update({
      where: { workspaceId: workspace.id },
      data: {
        provider: input.provider,
        ...(apiKeyToStore !== undefined ? { apiKey: apiKeyToStore } : {}),
        ...(webhookSecretToStore !== undefined ? { webhookSecret: webhookSecretToStore } : {}),
        settings: settingsJson,
      },
    });
  } else {
    await prisma.atsIntegration.create({
      data: {
        workspaceId: workspace.id,
        provider: input.provider,
        apiKey: apiKeyToStore!, // required on create — checked above
        webhookSecret:
          webhookSecretToStore === undefined ? null : webhookSecretToStore,
        settings: settingsJson,
      },
    });
  }

  // IP-37: workspace audit row. Connecting and "updating an existing" are
  // both logged as CONNECTED — meta carries the provider + whether a key was
  // rotated so the trail distinguishes setup vs maintenance.
  void writeWorkspaceAuditEntry({
    workspaceId: workspace.id,
    actorUserId: userId,
    actorEmail,
    action: WORKSPACE_AUDIT_ACTIONS.ATS_INTEGRATION_CONNECTED,
    targetType: "atsIntegration",
    targetId: workspace.id,
    meta: {
      provider: input.provider,
      wasExisting: !!existing,
      apiKeyRotated: input.apiKey !== undefined,
      webhookSecretRotated: input.webhookSecret !== undefined,
    },
  });

  revalidatePath(`/w/${slug}/ats`);
  return { success: true };
}

export async function disconnectAtsIntegrationAction(slug: string) {
  const { workspace, userId, actorEmail } = await assertWorkspaceAdmin(slug);
  // Read provider first so the audit row records which one was removed.
  const existing = await prisma.atsIntegration.findUnique({
    where: { workspaceId: workspace.id },
    select: { provider: true },
  });
  await prisma.atsIntegration.deleteMany({ where: { workspaceId: workspace.id } });

  void writeWorkspaceAuditEntry({
    workspaceId: workspace.id,
    actorUserId: userId,
    actorEmail,
    action: WORKSPACE_AUDIT_ACTIONS.ATS_INTEGRATION_DISCONNECTED,
    targetType: "atsIntegration",
    targetId: workspace.id,
    meta: { provider: existing?.provider ?? "unknown" },
  });

  revalidatePath(`/w/${slug}/ats`);
  return { success: true };
}

export type AtsTestResult =
  | { ok: true; httpStatus: number; durationMs: number; body: string }
  | { ok: false; error: string; durationMs?: number };

const TEST_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 4096;

function samplePayload(provider: AtsProvider) {
  return {
    event: "interviewpad.test_event",
    provider,
    deliveredAt: new Date().toISOString(),
    candidate: {
      id: "cand_TEST_1234",
      name: "Test Candidate",
      email: "test+atsprobe@interviewpad.in",
    },
    interview: {
      id: "iv_TEST_5678",
      title: "Front-end Screen — Sample",
      verdict: "success",
      score: 0.82,
      durationSec: 2700,
      finishedAt: new Date().toISOString(),
    },
    note: "Synthetic test event from the Interviewpad workspace ATS console.",
  };
}

export async function sendAtsTestEventAction(slug: string): Promise<AtsTestResult> {
  const { workspace, userId, actorEmail } = await assertWorkspaceAdmin(slug);

  const row = await prisma.atsIntegration.findUnique({
    where: { workspaceId: workspace.id },
  });
  if (!row) return { ok: false, error: "No ATS integration configured." };

  const settings = parseSettings(row.settings);
  const webhookUrl = settings.webhookUrl ?? "";
  if (!webhookUrl) return { ok: false, error: "Webhook URL missing — save the integration first." };

  // Re-check SSRF at probe time — settings could pre-date a tightening of the
  // SSRF rules.
  const ssrf = await validateOutboundUrl(webhookUrl);
  if (!ssrf.ok) return { ok: false, error: `Refused: ${ssrf.reason}` };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain;q=0.9, */*;q=0.5",
    "User-Agent": "Interviewpad-ATS-Probe/1.0",
    "X-Interviewpad-Event": "test",
  };
  if (row.apiKey) {
    const plaintext = decryptAtRest(row.apiKey);
    if (plaintext) headers.Authorization = `Bearer ${plaintext}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(samplePayload(row.provider as AtsProvider)),
      signal: controller.signal,
    });
    const durationMs = Date.now() - startedAt;
    const rawText = await upstream.text();
    const truncated = rawText.length > MAX_BODY_BYTES;
    const body = truncated ? rawText.slice(0, MAX_BODY_BYTES) + "\n…(truncated)" : rawText;
    // IP-37: audit the test attempt with outcome.
    void writeWorkspaceAuditEntry({
      workspaceId: workspace.id,
      actorUserId: userId,
      actorEmail,
      action: WORKSPACE_AUDIT_ACTIONS.ATS_INTEGRATION_TEST_SENT,
      targetType: "atsIntegration",
      targetId: workspace.id,
      meta: {
        provider: row.provider,
        httpStatus: upstream.status,
        durationMs,
      },
    });
    return { ok: true, httpStatus: upstream.status, durationMs, body };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const aborted = (err as Error)?.name === "AbortError";
    void writeWorkspaceAuditEntry({
      workspaceId: workspace.id,
      actorUserId: userId,
      actorEmail,
      action: WORKSPACE_AUDIT_ACTIONS.ATS_INTEGRATION_TEST_SENT,
      targetType: "atsIntegration",
      targetId: workspace.id,
      meta: {
        provider: row.provider,
        durationMs,
        outcome: aborted ? "timeout" : "network_error",
      },
    });
    return {
      ok: false,
      error: aborted
        ? `Timed out after ${TEST_TIMEOUT_MS}ms`
        : `Network error: ${(err as Error)?.message ?? "unknown"}`,
      durationMs,
    };
  } finally {
    clearTimeout(timer);
  }
}
