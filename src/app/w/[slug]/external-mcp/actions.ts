"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { workspacePlanAllowsAiScreening } from "@/lib/ai-interview/credits";
import {
  testRemoteMcpConnection,
  validateOutboundUrl,
} from "@/lib/mcp/outbound";
import { encryptAtRest, decryptAtRest } from "@/lib/crypto/at-rest";
import { canMember } from "@/lib/permissions";

type Member = { userId: string; role: string; permissions?: unknown };

/**
 * Same role gate as MCP API keys: only OWNER/ADMIN can manage outbound MCP
 * config. INTERVIEWER can use the workspace but can't wire it to external
 * services on the workspace's behalf.
 */
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
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) throw new Error("Workspace not found");

  const member = workspace.members.find((m: Member) => m.userId === session.user.id);
  if (!member) throw new Error("Not a member of this workspace");

  if (!workspacePlanAllowsAiScreening(workspace.planName)) {
    throw new Error("This workspace plan does not include external MCP.");
  }
  if (!(await canMember(member, "integration:manage"))) {
    throw new Error("Only workspace owners/admins can manage external MCP servers.");
  }

  return { workspace, userId: session.user.id };
}

export type ExternalMcpInput = {
  name: string;
  url: string;
  authToken?: string;
};

function sanitizeInput(input: ExternalMcpInput) {
  const name = input.name?.trim() ?? "";
  if (!name) throw new Error("Name is required.");
  if (name.length > 60) throw new Error("Name must be 60 characters or fewer.");

  const url = input.url?.trim() ?? "";
  if (!url) throw new Error("URL is required.");

  // Trim auth token but treat empty string as "no token". Spaces are not
  // legal in a bearer token anyway.
  const authToken = input.authToken?.trim();
  return {
    name,
    url,
    authToken: authToken && authToken.length > 0 ? authToken : null,
  };
}

export async function createExternalMcpAction(
  slug: string,
  input: ExternalMcpInput
) {
  const { workspace, userId } = await assertWorkspaceAdmin(slug);
  const data = sanitizeInput(input);

  // Reject SSRF-y URLs at create time, not just test time, so we don't
  // accidentally let a Phase 4.1 wiring code call into a private address.
  const ssrf = await validateOutboundUrl(data.url);
  if (!ssrf.ok) throw new Error(`Invalid URL: ${ssrf.reason}`);

  const row = await prisma.externalMcpServer.create({
    data: {
      workspaceId: workspace.id,
      name: data.name,
      url: data.url,
      // Encrypt-at-rest so even a DB backup leak doesn't expose customer
      // credentials. Stored format is `v1:iv:tag:ciphertext`; legacy rows
      // (none today) without the prefix are read transparently.
      authToken: data.authToken ? encryptAtRest(data.authToken) : null,
      enabled: false, // safe default — admin must explicitly enable after testing
      createdByUserId: userId,
    },
    select: { id: true },
  });

  revalidatePath(`/w/${slug}/external-mcp`);
  return { success: true, id: row.id };
}

export async function updateExternalMcpAction(
  slug: string,
  id: string,
  input: ExternalMcpInput & { enabled?: boolean; clearAuthToken?: boolean }
) {
  const { workspace } = await assertWorkspaceAdmin(slug);
  const data = sanitizeInput(input);

  const existing = await prisma.externalMcpServer.findFirst({
    where: { id, workspaceId: workspace.id },
    select: { id: true, authToken: true },
  });
  if (!existing) throw new Error("Server not found in this workspace.");

  // Re-validate URL whenever it changes.
  const ssrf = await validateOutboundUrl(data.url);
  if (!ssrf.ok) throw new Error(`Invalid URL: ${ssrf.reason}`);

  // Auth token handling:
  //  - clearAuthToken=true → null it out
  //  - new authToken provided → encrypt + use it
  //  - neither → keep the existing (encrypted) one
  let newAuthToken: string | null | undefined;
  if (input.clearAuthToken) newAuthToken = null;
  else if (data.authToken) newAuthToken = encryptAtRest(data.authToken);
  else newAuthToken = undefined; // omit from update

  await prisma.externalMcpServer.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      url: data.url,
      ...(newAuthToken !== undefined ? { authToken: newAuthToken } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    },
  });

  revalidatePath(`/w/${slug}/external-mcp`);
  return { success: true };
}

export async function deleteExternalMcpAction(slug: string, id: string) {
  const { workspace } = await assertWorkspaceAdmin(slug);
  const res = await prisma.externalMcpServer.deleteMany({
    where: { id, workspaceId: workspace.id },
  });
  if (res.count === 0) throw new Error("Server not found in this workspace.");
  revalidatePath(`/w/${slug}/external-mcp`);
  return { success: true };
}

/**
 * Workspace-level kill-switch for the entire outbound MCP wire. Off by
 * default; only OWNER/ADMIN can flip. Bindings stay configured when off —
 * the switch just blocks the AI interviewer from actually calling out.
 */
export async function setWorkspaceAllowExternalMcpAction(
  slug: string,
  allow: boolean
) {
  const { workspace } = await assertWorkspaceAdmin(slug);
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { allowExternalMcp: !!allow },
  });
  revalidatePath(`/w/${slug}/external-mcp`);
  revalidatePath(`/w/${slug}/ai-interviews`);
  return { success: true, allow: !!allow };
}

export async function testExternalMcpAction(slug: string, id: string) {
  const { workspace } = await assertWorkspaceAdmin(slug);
  const row = await prisma.externalMcpServer.findFirst({
    where: { id, workspaceId: workspace.id },
    select: { id: true, url: true, authToken: true },
  });
  if (!row) throw new Error("Server not found in this workspace.");

  // Decrypt for outbound use. Legacy plaintext rows pass through unchanged.
  const plaintextToken = row.authToken ? decryptAtRest(row.authToken) : null;
  const result = await testRemoteMcpConnection({
    url: row.url,
    authToken: plaintextToken,
  });

  await prisma.externalMcpServer.update({
    where: { id: row.id },
    data: {
      lastTestedAt: new Date(),
      lastTestStatus: result.ok ? "ok" : "error",
      lastTestSummary: result.ok ? result.summary : result.reason,
    },
  });

  revalidatePath(`/w/${slug}/external-mcp`);

  if (result.ok) {
    return {
      success: true,
      ok: true,
      summary: result.summary,
      serverName: result.serverName,
      toolNames: result.toolNames,
    };
  }
  return { success: true, ok: false, summary: result.reason };
}
