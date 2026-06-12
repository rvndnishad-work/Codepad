import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptAtRest } from "@/lib/crypto/at-rest";
import { canMember } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";

const integrationSchema = z.object({
  provider: z.enum(["GREENHOUSE", "LEVER", "ASHBY"]),
  // Optional on update — omitted/empty means "keep the existing key".
  // Required when connecting for the first time (checked in the handler).
  apiKey: z.string().optional().nullable(),
  webhookSecret: z.string().nullable().optional(),
  settings: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth().catch(() => null);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: {
        atsIntegration: {
          select: {
            id: true,
            provider: true,
            webhookSecret: true,
            settings: true,
            createdAt: true,
            // apiKey deliberately excluded — secrets are write-only.
          },
        },
        members: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const member = workspace.members.find((m) => m.userId === session.user.id);
    if (!member) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Secrets are write-only: expose presence booleans, never the values.
    const row = workspace.atsIntegration;
    return NextResponse.json({
      atsIntegration: row
        ? {
            id: row.id,
            provider: row.provider,
            settings: row.settings,
            createdAt: row.createdAt,
            hasWebhookSecret: !!row.webhookSecret,
          }
        : null,
      workspaceId: workspace.id,
    });
  } catch (err) {
    console.error("Failed to read integration configuration:", err);
    return NextResponse.json({ error: "Failed to read integrations" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth().catch(() => null);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: {
        members: true,
        atsIntegration: { select: { id: true } },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Only members who can manage integrations may configure them.
    const member = workspace.members.find((m) => m.userId === session.user.id);
    if (!member || !(await canMember(member, "integration:manage"))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = integrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { provider, apiKey, webhookSecret, settings = "{}" } = parsed.data;

    // Secrets are AES-GCM-encrypted at rest (same helper as External MCP /
    // TOTP). On update an omitted key keeps the stored one.
    const trimmedKey = apiKey?.trim() ?? "";
    if (!workspace.atsIntegration && !trimmedKey) {
      return NextResponse.json(
        { error: "API key is required when connecting an ATS for the first time." },
        { status: 400 }
      );
    }
    const encryptedKey = trimmedKey ? encryptAtRest(trimmedKey) : undefined;
    const encryptedWebhookSecret =
      webhookSecret === undefined
        ? undefined // keep existing
        : webhookSecret
          ? encryptAtRest(webhookSecret)
          : null; // explicit clear

    const integration = await prisma.atsIntegration.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        provider,
        apiKey: encryptedKey!, // present on create — checked above
        webhookSecret: encryptedWebhookSecret ?? null,
        settings,
      },
      update: {
        provider,
        ...(encryptedKey !== undefined ? { apiKey: encryptedKey } : {}),
        ...(encryptedWebhookSecret !== undefined
          ? { webhookSecret: encryptedWebhookSecret }
          : {}),
        settings,
      },
    });

    return NextResponse.json({
      ok: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        settings: integration.settings,
        hasWebhookSecret: !!integration.webhookSecret,
      },
    });

  } catch (err) {
    console.error("Failed to upsert integrations:", err);
    return NextResponse.json({ error: "Failed to save integration details" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth().catch(() => null);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: {
        members: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const member = workspace.members.find((m) => m.userId === session.user.id);
    if (!member || !(await canMember(member, "integration:manage"))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await prisma.atsIntegration.delete({
      where: { workspaceId: workspace.id },
    }).catch(() => null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to disconnect integrations:", err);
    return NextResponse.json({ error: "Failed to disconnect integration" }, { status: 500 });
  }
}
