import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getB2bSettings } from "@/lib/settings";


const memberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "INTERVIEWER", "VIEWER"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const activeUserId = session.user.id;

  // Verify the active caller is an OWNER or ADMIN in this workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      members: true,
    },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const callerMember = workspace.members.find((m) => m.userId === activeUserId);
  if (!callerMember || (callerMember.role !== "OWNER" && callerMember.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Forbidden: Only Owners or Admins can enroll teammates." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, role } = parsed.data;
  const targetEmail = email.toLowerCase().trim();

  // Find or create User placeholder for this email
  let targetUser = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!targetUser) {
    targetUser = await prisma.user.create({
      data: {
        email: targetEmail,
        name: targetEmail.split("@")[0],
        portfolioPublic: false,
      },
    });
  }

  // Check if already a member
  const alreadyMember = workspace.members.some((m) => m.userId === targetUser.id);
  if (alreadyMember) {
    return NextResponse.json(
      { error: "User is already enrolled in this workspace" },
      { status: 400 }
    );
  }

  // Enforce seat limits for Free plan
  const b2bSettings = await getB2bSettings();
  if (workspace.planName === "FREE" && workspace.members.length >= b2bSettings.freeSeatLimit) {
    return NextResponse.json(
      { error: `Teammate limit reached. Free plans are limited to ${b2bSettings.freeSeatLimit} seats. Please upgrade to the Growth tier in the Billing tab.` },
      { status: 403 }
    );
  }


  try {
    // If on active metered subscription, scale up Stripe seats
    if (workspace.planName === "GROWTH" && workspace.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(workspace.stripeSubscriptionId);
        const subItemId = subscription.items.data[0]?.id;
        if (subItemId) {
          const newQuantity = workspace.members.length + 1;
          await stripe.subscriptionItems.update(subItemId, {
            quantity: newQuantity,
          });
          console.log(`Stripe subscription seats scaled up to ${newQuantity} for workspace ${workspace.id}`);
        }
      } catch (stripeErr) {
        console.error("Failed to update Stripe seats count during member invite:", stripeErr);
      }
    }

    // Add member
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: targetUser.id,
        role,
      },
      include: {
        user: {
          select: { name: true, image: true, email: true },
        },
      },
    });

    return NextResponse.json({ ok: true, member });
  } catch (err) {
    console.error("Failed to enroll member:", err);
    return NextResponse.json({ error: "Failed to enroll member" }, { status: 500 });
  }
}

// DELETE — Remove a teammate from the workspace and scale down Stripe seats
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const memberId = body?.memberId;
    if (!memberId) {
      return NextResponse.json({ error: "Missing memberId parameter" }, { status: 400 });
    }

    // Verify workspace membership and roles (OWNER / ADMIN)
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: {
        members: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const callerMember = workspace.members.find((m) => m.userId === session.user.id);
    if (!callerMember || (callerMember.role !== "OWNER" && callerMember.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden: Only Owners or Admins can remove teammates." },
        { status: 403 }
      );
    }

    // Locate the target member to delete
    const targetMember = workspace.members.find((m) => m.id === memberId);
    if (!targetMember) {
      return NextResponse.json({ error: "Target teammate not found" }, { status: 404 });
    }

    // Prevent deleting the owner if they are the only OWNER
    if (targetMember.role === "OWNER") {
      const otherOwners = workspace.members.filter((m) => m.role === "OWNER" && m.id !== memberId);
      if (otherOwners.length === 0) {
        return NextResponse.json(
          { error: "Conflict: Cannot remove the only Owner. Invite or assign another Owner first." },
          { status: 400 }
        );
      }
    }

    // Perform deletion
    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    // Scale down Stripe seats count
    if (workspace.planName === "GROWTH" && workspace.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(workspace.stripeSubscriptionId);
        const subItemId = subscription.items.data[0]?.id;
        if (subItemId) {
          const newQuantity = Math.max(1, workspace.members.length - 1);
          await stripe.subscriptionItems.update(subItemId, {
            quantity: newQuantity,
          });
          console.log(`Stripe subscription seats scaled down to ${newQuantity} for workspace ${workspace.id}`);
        }
      } catch (stripeErr) {
        console.error("Failed to update Stripe seats count during member removal:", stripeErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to remove member:", err);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
