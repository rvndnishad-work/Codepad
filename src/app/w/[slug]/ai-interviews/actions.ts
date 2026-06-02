"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  workspacePlanAllowsAiScreening,
  getAiCreditPack,
} from "@/lib/ai-interview/credits";
import { sendInviteEmail } from "@/lib/ai-interview/invite-email";
import { validateStarterFilesJson } from "@/lib/ai-interview/template-resolver";
import type { RoundSpecInput } from "@/lib/ai-interview/rounds";
import { getStripe } from "@/lib/stripe";

type Member = { userId: string; role: string };

/**
 * Resolve the caller's workspace membership and enforce:
 *   1. logged in
 *   2. member of this workspace
 *   3. workspace plan allows AI Screening
 *   4. role has write privileges (OWNER / ADMIN / INTERVIEWER)
 *
 * Returns the workspace row on success. Throws on any failure — the calling
 * server action should let the error bubble; the client handles the toast.
 */
async function assertWorkspaceWriter(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!workspace) throw new Error("Workspace not found");

  const member = workspace.members.find((m: Member) => m.userId === session.user.id);
  if (!member) throw new Error("Not a member of this workspace");

  if (!workspacePlanAllowsAiScreening(workspace.planName)) {
    throw new Error("This workspace plan does not include AI Screening");
  }

  if (
    member.role !== "OWNER" &&
    member.role !== "ADMIN" &&
    member.role !== "INTERVIEWER"
  ) {
    throw new Error("You do not have permission to manage AI screenings");
  }

  return { workspace, member, userId: session.user.id };
}

export async function createAIInterviewSessionAction(
  slug: string,
  data: {
    candidateName: string;
    candidateEmail: string;
    positionTitle: string;
    templateId: string;
  }
) {
  const { workspace } = await assertWorkspaceWriter(slug);

  if (
    !data.candidateName.trim() ||
    !data.candidateEmail.trim() ||
    !data.positionTitle.trim() ||
    !data.templateId.trim()
  ) {
    throw new Error("Missing required invite fields");
  }

  // IP-34: seed the CRM Candidate row so this person shows up in the
  // workspace pipeline. Idempotent — re-inviting an existing candidate
  // keeps their current stage (auto-forward is IP-69).
  const { upsertCandidateForWorkflow } = await import("@/lib/crm/auto-create");
  const candidate = await upsertCandidateForWorkflow({
    workspaceId: workspace.id,
    name: data.candidateName.trim(),
    email: data.candidateEmail.trim().toLowerCase(),
    source: "ai-interview-create",
    initialStage: "SCREENED",
  });

  // No credit is consumed here — invites are free. The charge happens on the
  // candidate's first message to /api/ai-interview/message.
  const session = await prisma.aIInterviewSession.create({
    data: {
      workspaceId: workspace.id,
      candidateId: candidate.candidateId,
      candidateName: data.candidateName.trim(),
      candidateEmail: data.candidateEmail.trim().toLowerCase(),
      positionTitle: data.positionTitle.trim(),
      templateId: data.templateId,
      status: "PENDING",
      chatHistory: "[]",
      filesJson: "{}",
    },
  });

  // Email the candidate the screening link. Fire-and-forget — if the transport
  // fails, the recruiter can still copy the link from the console.
  const origin = await resolveOrigin();
  const inviteUrl = `${origin}/ai-interview/${session.inviteToken}`;
  void sendInviteEmail({
    candidateName: session.candidateName,
    candidateEmail: session.candidateEmail,
    positionTitle: session.positionTitle,
    workspaceName: workspace.name,
    inviteUrl,
    workspaceId: workspace.id,
  }).then((res) => {
    if (!res.sent) {
      console.warn(`[ai-invite-email] failed for ${session.candidateEmail}: ${res.reason}`);
    }
  });

  revalidatePath(`/w/${slug}/ai-interviews`);
  return {
    success: true,
    session: {
      id: session.id,
      inviteToken: session.inviteToken,
      candidateName: session.candidateName,
      candidateEmail: session.candidateEmail,
      positionTitle: session.positionTitle,
      status: session.status,
      templateId: session.templateId,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
  };
}

/**
 * Quick-add a single candidate to the CRM from inside the screening wizard,
 * returning the persisted row so the client can drop it straight into the
 * selected set. This is the "Single invite" / "invite someone new" path under
 * the unified batch flow — the typed person becomes a real Candidate row (so
 * they show up in the pipeline) and is then screened as a batch of one.
 * Idempotent: re-adding an existing email keeps their current stage.
 */
export async function quickAddCandidateAction(
  slug: string,
  data: { name: string; email: string }
) {
  const { workspace } = await assertWorkspaceWriter(slug);

  const name = data.name?.trim();
  const email = data.email?.trim().toLowerCase();
  if (!name) throw new Error("Candidate name is required.");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("A valid candidate email is required.");
  }

  const { upsertCandidateForWorkflow } = await import("@/lib/crm/auto-create");
  const { candidateId } = await upsertCandidateForWorkflow({
    workspaceId: workspace.id,
    name,
    email,
    source: "ai-interview-create",
    initialStage: "SCREENED",
  });

  const row = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { id: true, name: true, email: true, stage: true },
  });

  revalidatePath(`/w/${slug}/ai-interviews`);
  return {
    success: true,
    candidate: {
      id: row?.id ?? candidateId,
      name: row?.name ?? name,
      email: row?.email ?? email,
      stage: row?.stage ?? "SCREENED",
    },
  };
}

// ─── Screening batch (revamp: multi-candidate, multi-round) ──────────────────

function sanitizeRoundSpec(r: RoundSpecInput, idx: number): RoundSpecInput {
  const paradigm = r.paradigm;
  if (!["frontend", "backend", "dsa"].includes(paradigm)) {
    throw new Error(`Round ${idx + 1}: invalid paradigm "${paradigm}".`);
  }
  const sourceKind = r.sourceKind;
  if (!["challenge", "playground", "scaffold"].includes(sourceKind)) {
    throw new Error(`Round ${idx + 1}: invalid source kind "${sourceKind}".`);
  }
  if (sourceKind === "scaffold") {
    if (!r.templateId?.trim()) throw new Error(`Round ${idx + 1}: scaffold round needs a templateId.`);
  } else if (!r.sourceId?.trim()) {
    throw new Error(`Round ${idx + 1}: ${sourceKind} round needs a sourceId.`);
  }
  const minutes = Number(r.estimatedMinutes ?? 30);
  return {
    paradigm,
    language: r.language?.trim() || undefined,
    frameworkLabel: r.frameworkLabel?.trim() || undefined,
    sourceKind,
    sourceId: r.sourceId?.trim() || undefined,
    templateId: r.templateId?.trim() || undefined,
    estimatedMinutes: Number.isFinite(minutes) ? Math.min(180, Math.max(5, minutes)) : 30,
  };
}

/**
 * Create a screening batch: one AIScreeningBatch + its shared round specs, then
 * one AIInterviewSession per selected (CRM) candidate with its rounds
 * materialized from the shared set (or a per-candidate override). Invite emails
 * fire after the transaction commits. No credit is consumed here — the charge
 * still happens on each candidate's first message.
 */
export async function createScreeningBatchAction(
  slug: string,
  data: {
    positionTitle: string;
    candidateIds: string[];
    sharedRounds: RoundSpecInput[];
    /** candidateId -> full replacement round list. Absent = use sharedRounds. */
    overrides?: Record<string, RoundSpecInput[]>;
  }
) {
  const { workspace, userId } = await assertWorkspaceWriter(slug);

  const positionTitle = data.positionTitle?.trim();
  if (!positionTitle) throw new Error("Position title is required.");

  const candidateIds = [...new Set((data.candidateIds ?? []).filter(Boolean))];
  if (candidateIds.length === 0) throw new Error("Select at least one candidate.");

  const sharedRounds = (data.sharedRounds ?? []).map(sanitizeRoundSpec);
  if (sharedRounds.length === 0) throw new Error("Add at least one round to the question set.");

  // Resolve candidates and enforce they belong to THIS workspace + have email.
  const candidates = await prisma.candidate.findMany({
    where: { id: { in: candidateIds }, workspaceId: workspace.id },
    select: { id: true, name: true, email: true },
  });
  if (candidates.length !== candidateIds.length) {
    throw new Error("One or more selected candidates were not found in this workspace.");
  }
  const missingEmail = candidates.filter((c) => !c.email?.trim());
  if (missingEmail.length > 0) {
    throw new Error(
      `These candidates have no email and can't be invited: ${missingEmail.map((c) => c.name).join(", ")}.`
    );
  }

  // Sanitize any per-candidate overrides up front so a bad override fails the
  // whole request before we write anything.
  const overrides: Record<string, RoundSpecInput[]> = {};
  for (const [cid, rounds] of Object.entries(data.overrides ?? {})) {
    if (!candidateIds.includes(cid)) continue; // ignore stale ids
    const sane = (rounds ?? []).map(sanitizeRoundSpec);
    if (sane.length > 0) overrides[cid] = sane;
  }

  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.aIScreeningBatch.create({
      data: {
        workspaceId: workspace.id,
        positionTitle,
        createdByUserId: userId,
        status: "ACTIVE",
        roundSpecs: {
          create: sharedRounds.map((r, order) => ({
            order,
            paradigm: r.paradigm,
            language: r.language,
            frameworkLabel: r.frameworkLabel,
            sourceKind: r.sourceKind,
            sourceId: r.sourceId,
            templateId: r.templateId,
            estimatedMinutes: r.estimatedMinutes ?? 30,
          })),
        },
      },
    });

    const created: { id: string; inviteToken: string; candidateName: string; candidateEmail: string }[] = [];
    for (const c of candidates) {
      const rounds = overrides[c.id] ?? sharedRounds;
      // Legacy `templateId` column is non-null; point it at the first round's
      // identifier so any code still reading it has something sensible.
      const legacyTemplateId = rounds[0].templateId ?? rounds[0].sourceId ?? "batch";
      const session = await tx.aIInterviewSession.create({
        data: {
          workspaceId: workspace.id,
          batchId: batch.id,
          candidateId: c.id,
          candidateName: c.name,
          candidateEmail: c.email!.trim().toLowerCase(),
          positionTitle,
          templateId: legacyTemplateId,
          status: "PENDING",
          chatHistory: "[]",
          filesJson: "{}",
          rounds: {
            create: rounds.map((r, order) => ({
              order,
              paradigm: r.paradigm,
              language: r.language,
              frameworkLabel: r.frameworkLabel,
              sourceKind: r.sourceKind,
              sourceId: r.sourceId,
              templateId: r.templateId,
              estimatedMinutes: r.estimatedMinutes ?? 30,
              filesJson: "{}",
              status: "PENDING",
            })),
          },
        },
        select: { id: true, inviteToken: true, candidateName: true, candidateEmail: true },
      });
      created.push(session);
    }
    return { batchId: batch.id, sessions: created };
  });

  // Fire invite emails after commit — best effort, never blocks the response.
  const origin = await resolveOrigin();
  for (const s of result.sessions) {
    const inviteUrl = `${origin}/ai-interview/${s.inviteToken}`;
    void sendInviteEmail({
      candidateName: s.candidateName,
      candidateEmail: s.candidateEmail,
      positionTitle,
      workspaceName: workspace.name,
      inviteUrl,
      workspaceId: workspace.id,
    }).then((res) => {
      if (!res.sent) {
        console.warn(`[ai-batch-invite] failed for ${s.candidateEmail}: ${res.reason}`);
      }
    });
  }

  revalidatePath(`/w/${slug}/ai-interviews`);
  return {
    success: true,
    batchId: result.batchId,
    sessions: result.sessions.map((s) => ({
      id: s.id,
      inviteToken: s.inviteToken,
      candidateName: s.candidateName,
    })),
  };
}

/**
 * Create a Stripe Checkout session for a one-time credit-pack purchase.
 * Returns the redirect URL — the client navigates there. Webhook handler
 * credits the workspace on `checkout.session.completed`.
 *
 * Buying credits requires OWNER or ADMIN — INTERVIEWER can generate invites
 * but not spend the workspace's money.
 */
export async function createCreditPackCheckoutAction(
  slug: string,
  packId: string
) {
  const { workspace, member } = await assertWorkspaceWriter(slug);
  if (member.role !== "OWNER" && member.role !== "ADMIN") {
    throw new Error("Only workspace owners/admins can purchase credits.");
  }

  const pack = getAiCreditPack(packId);
  if (!pack) throw new Error("Unknown credit pack.");

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe is not configured for this environment. Ask an admin to set STRIPE_SECRET_KEY."
    );
  }

  // Lazy module-level init (see src/lib/stripe.ts) lets us import freely now.
  const stripe = getStripe();

  const origin = await resolveOrigin();
  const returnUrl = `${origin}/w/${slug}/ai-interviews`;

  // Ensure the workspace has a Stripe customer (reuses the one created during
  // subscription billing if present, mints a fresh one otherwise).
  let stripeCustomerId = await ensureStripeCustomer(workspace.id, workspace.name, stripe);

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Interviewpad AI Credits — ${pack.label}`,
            description: `${pack.credits} AI screening credits for "${workspace.name}".`,
          },
          unit_amount: pack.priceCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${returnUrl}?credits_purchase=success`,
    cancel_url: `${returnUrl}?credits_purchase=cancel`,
    metadata: {
      kind: "AI_CREDIT_PACK",
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      packId: pack.id,
      credits: String(pack.credits),
    },
    payment_intent_data: {
      // Mirror metadata onto the PaymentIntent so the webhook can reconcile
      // even if it arrives via `payment_intent.succeeded` first.
      metadata: {
        kind: "AI_CREDIT_PACK",
        workspaceId: workspace.id,
        packId: pack.id,
        credits: String(pack.credits),
      },
    },
  });

  if (!checkout.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }
  return { url: checkout.url };
}

async function ensureStripeCustomer(
  workspaceId: string,
  workspaceName: string,
  stripe: import("stripe").Stripe
): Promise<string> {
  const row = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { stripeCustomerId: true },
  });
  if (row?.stripeCustomerId) return row.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: workspaceName,
    metadata: { workspaceId },
  });
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

// ─── Custom workspace templates ─────────────────────────────────────────────

export type CustomTemplateInput = {
  title: string;
  description: string;
  starterFilesJson: string;
  testsCode: string;
  estimatedMinutes: number;
  /** Coding surface: "frontend" (Sandpack) | "backend" | "dsa" (Monaco+Piston). */
  kind?: string;
  /** Execution language for backend/dsa (e.g. "node", "python"). */
  language?: string;
  /** Non-executable framework label (steers AI questions only). */
  frameworkLabel?: string;
};

export async function createCustomTemplateAction(
  slug: string,
  input: CustomTemplateInput
) {
  const { workspace } = await assertWorkspaceWriter(slug);

  const data = sanitizeTemplateInput(input);

  const row = await prisma.aIInterviewTemplate.create({
    data: {
      workspaceId: workspace.id,
      title: data.title,
      description: data.description,
      starterFiles: data.starterFiles,
      testsCode: data.testsCode,
      estimatedMinutes: data.estimatedMinutes,
      kind: data.kind,
      language: data.language,
      frameworkLabel: data.frameworkLabel,
    },
  });

  revalidatePath(`/w/${slug}/ai-interviews`);
  return { success: true, id: row.id };
}

// ─── External MCP bindings (Phase 4.1) ──────────────────────────────────────

/**
 * Bind an enabled ExternalMcpServer to a custom template. Both must live in
 * this workspace. Idempotent — re-binding the same pair returns success
 * without creating a duplicate row.
 *
 * The AI interviewer only surfaces a server's tools to Gemini if THIS row
 * exists AND the server is `enabled=true` AND the workspace has
 * `allowExternalMcp=true`. Three gates, all required.
 */
export async function bindExternalMcpToTemplateAction(
  slug: string,
  templateId: string,
  externalMcpServerId: string
) {
  const { workspace } = await assertWorkspaceWriter(slug);

  // Cross-check both ends belong to this workspace before writing the join.
  const [tpl, server] = await Promise.all([
    prisma.aIInterviewTemplate.findFirst({
      where: { id: templateId, workspaceId: workspace.id },
      select: { id: true },
    }),
    prisma.externalMcpServer.findFirst({
      where: { id: externalMcpServerId, workspaceId: workspace.id, enabled: true },
      select: { id: true },
    }),
  ]);
  if (!tpl) throw new Error("Template not found in this workspace.");
  if (!server) {
    throw new Error(
      "External MCP server not found, or not enabled. Enable it on the External MCP page first."
    );
  }

  // `upsert` on the unique pair avoids the race where two recruiters click
  // the same checkbox simultaneously and one would hit a unique-constraint
  // violation otherwise.
  await prisma.templateExternalMcp.upsert({
    where: {
      templateId_externalMcpServerId: {
        templateId: tpl.id,
        externalMcpServerId: server.id,
      },
    },
    create: {
      templateId: tpl.id,
      externalMcpServerId: server.id,
    },
    update: {}, // no-op — already bound
  });

  revalidatePath(`/w/${slug}/ai-interviews`);
  return { success: true };
}

export async function unbindExternalMcpFromTemplateAction(
  slug: string,
  templateId: string,
  externalMcpServerId: string
) {
  const { workspace } = await assertWorkspaceWriter(slug);

  // deleteMany scoped to the workspace's templates prevents cross-tenant
  // probing — a stale id from another workspace silently no-ops rather
  // than telling the caller it was rejected.
  await prisma.templateExternalMcp.deleteMany({
    where: {
      templateId,
      externalMcpServerId,
      template: { workspaceId: workspace.id },
    },
  });

  revalidatePath(`/w/${slug}/ai-interviews`);
  return { success: true };
}

export async function deleteCustomTemplateAction(slug: string, id: string) {
  const { workspace } = await assertWorkspaceWriter(slug);

  // Tenant-scoped delete via deleteMany so cross-tenant ids silently no-op
  // rather than crashing or — worse — leaking another workspace's data.
  const res = await prisma.aIInterviewTemplate.deleteMany({
    where: { id, workspaceId: workspace.id },
  });
  if (res.count === 0) {
    throw new Error("Template not found in this workspace.");
  }
  revalidatePath(`/w/${slug}/ai-interviews`);
  return { success: true };
}

function sanitizeTemplateInput(input: CustomTemplateInput) {
  const title = input.title?.trim() ?? "";
  if (!title) throw new Error("Title is required.");
  if (title.length > 80) throw new Error("Title must be 80 characters or fewer.");

  const description = input.description?.trim() ?? "";
  if (!description) throw new Error("Description is required.");

  const testsCode = (input.testsCode ?? "").trim();

  const estimatedMinutes = Number(input.estimatedMinutes);
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 5 || estimatedMinutes > 180) {
    throw new Error("Estimated minutes must be between 5 and 180.");
  }

  // Throws with a helpful message if the JSON is wrong shape.
  const starterFiles = validateStarterFilesJson(input.starterFilesJson);

  // Stack metadata. Default to frontend; backend/dsa require a language.
  const kindRaw = (input.kind ?? "frontend").trim().toLowerCase();
  const kind = (["frontend", "backend", "dsa"].includes(kindRaw) ? kindRaw : "frontend") as
    | "frontend"
    | "backend"
    | "dsa";
  const language = input.language?.trim() || undefined;
  const frameworkLabel = input.frameworkLabel?.trim() || undefined;
  if ((kind === "backend" || kind === "dsa") && !language) {
    throw new Error("Backend/DSA templates require an execution language (e.g. node, python).");
  }

  return { title, description, starterFiles, testsCode, estimatedMinutes, kind, language, frameworkLabel };
}

/**
 * Resolve the public origin for building absolute URLs in emails. Prefer the
 * incoming request headers (works in any environment) and fall back to the
 * NEXTAUTH_URL env var.
 */
async function resolveOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() may not be available in some action contexts
  }
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function deleteAIInterviewSessionAction(slug: string, id: string) {
  const { workspace } = await assertWorkspaceWriter(slug);

  // Tenant-scoped delete: deleteMany with workspaceId guard prevents cross-tenant
  // deletes if a stale id is passed.
  const result = await prisma.aIInterviewSession.deleteMany({
    where: { id, workspaceId: workspace.id },
  });
  if (result.count === 0) {
    throw new Error("Session not found in this workspace");
  }

  revalidatePath(`/w/${slug}/ai-interviews`);
  return { success: true };
}
