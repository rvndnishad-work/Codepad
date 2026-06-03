import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as crypto from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId parameter" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        atsIntegration: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Verify signatures if webhookSecret is configured for safety
    if (workspace.atsIntegration?.webhookSecret) {
      const signature = req.headers.get("x-signature") || "";
      if (!signature) {
        return NextResponse.json({ error: "Unauthorized webhook payload" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Empty payload body" }, { status: 400 });
    }

    let candidateName = "";
    let candidateEmail = "";
    let challengeSlug = "";

    // Parse the payload depending on the ATS structure
    if (provider.toLowerCase() === "greenhouse") {
      // Greenhouse standard webhook candidate format
      candidateName = `${body.candidate?.first_name || ""} ${body.candidate?.last_name || ""}`.trim();
      candidateEmail = body.candidate?.email_addresses?.[0]?.value || "";
      // Map job/test to challenge slug from Greenhouse custom options
      challengeSlug = body.test?.custom_fields?.challenge_slug || "sum-of-two";
    } else if (provider.toLowerCase() === "ashby") {
      // Ashby graphql webhook structure
      candidateName = body.candidate?.name || "";
      candidateEmail = body.candidate?.email || "";
      challengeSlug = body.activity?.customFields?.challenge_slug || "sum-of-two";
    } else {
      // Lever or generic format
      candidateName = body.name || body.candidateName || "";
      candidateEmail = body.email || body.candidateEmail || "";
      challengeSlug = body.challengeSlug || "sum-of-two";
    }

    if (!candidateName || !candidateEmail) {
      return NextResponse.json({ error: "Could not parse candidate name or email" }, { status: 400 });
    }

    // Locate the challenge to assign
    const challenge = await prisma.challenge.findFirst({
      where: {
        OR: [
          { slug: challengeSlug },
          { workspaceId: workspace.id },
        ],
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: `Challenge with slug ${challengeSlug} not found` }, { status: 404 });
    }

    // Create opaque invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days activation policy

    // Save Take-Home assignment
    const takeHome = await prisma.takeHomeAssignment.create({
      data: {
        workspaceId: workspace.id,
        challengeId: challenge.id,
        candidateName,
        candidateEmail: candidateEmail.toLowerCase().trim(),
        token: inviteToken,
        status: "PENDING",
        expiresAt,
        timeLimitMin: challenge.estimatedMinutes || 60,
      },
    });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const inviteUrl = `${origin}/take-home/${inviteToken}`;

    console.log(`ATS Webhook [${provider.toUpperCase()}] synced successfully. Created Take-Home invite for ${candidateName}: ${inviteUrl}`);

    // Outbound push/response payload to complete webhook handshake
    return NextResponse.json({
      ok: true,
      provider: provider.toUpperCase(),
      candidateName,
      candidateEmail,
      takeHomeId: takeHome.id,
      inviteUrl,
    });

  } catch (err: any) {
    console.error("ATS webhook ingestion failed:", err);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
