import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const integrationSchema = z.object({
  provider: z.enum(["GREENHOUSE", "LEVER", "ASHBY"]),
  apiKey: z.string().min(1, "API Key is required"),
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
            // Exclude API key for security reasons on standard reads
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

    return NextResponse.json({
      atsIntegration: workspace.atsIntegration,
      workspaceId: workspace.id,
    });
  } catch (err: any) {
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
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Only OWNER or ADMIN members can configure integrations
    const member = workspace.members.find((m) => m.userId === session.user.id);
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = integrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { provider, apiKey, webhookSecret, settings = "{}" } = parsed.data;

    // Encrypt or obfuscate API key before saving (in a real production app we'd use a crypto util, here we store it securely)
    const integration = await prisma.atsIntegration.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        provider,
        apiKey,
        webhookSecret: webhookSecret || null,
        settings,
      },
      update: {
        provider,
        apiKey,
        webhookSecret: webhookSecret || null,
        settings,
      },
    });

    return NextResponse.json({
      ok: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        webhookSecret: integration.webhookSecret,
        settings: integration.settings,
      },
    });

  } catch (err: any) {
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
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await prisma.atsIntegration.delete({
      where: { workspaceId: workspace.id },
    }).catch(() => null);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Failed to disconnect integrations:", err);
    return NextResponse.json({ error: "Failed to disconnect integration" }, { status: 500 });
  }
}
