import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getB2bSettings } from "@/lib/settings";
import { canMember, isPermission } from "@/lib/permissions";

/** Roles assignable to a teammate on invite. OWNER is intentionally excluded —
 *  ownership is granted only via PATCH by an existing OWNER (see guards). */
const ASSIGNABLE_ROLES = ["ADMIN", "RECRUITER", "INTERVIEWER", "VIEWER"] as const;
/** Every workspace role — valid targets for a PATCH role change. */
const PATCHABLE_ROLES = ["OWNER", ...ASSIGNABLE_ROLES] as const;

const memberSchema = z.object({
  email: z.string().email(),
  role: z.enum(ASSIGNABLE_ROLES),
});

const patchSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(PATCHABLE_ROLES).optional(),
  /** Per-member permission delta. `null` clears overrides; an object sets them.
   *  Keys are validated against the concrete Permission union below. */
  permissions: z.record(z.string(), z.boolean()).nullable().optional(),
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
  if (!callerMember || !(await canMember(callerMember, "member:invite"))) {
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
        const stripe = getStripe();
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
    if (!callerMember || !(await canMember(callerMember, "member:remove"))) {
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
        const stripe = getStripe();
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

// PATCH — change a teammate's role and/or set their per-member permission
// overrides. Gated by member:set_role (OWNER by default). Ownership is
// protected: only an OWNER may grant or revoke the OWNER role, and the last
// OWNER can't be demoted.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { memberId, role, permissions } = parsed.data;
    if (role === undefined && permissions === undefined) {
      return NextResponse.json(
        { error: "Nothing to update — provide role and/or permissions." },
        { status: 400 }
      );
    }

    // Reject override keys the code can't enforce (concrete permissions only;
    // wildcards belong to role definitions, not per-member deltas).
    if (permissions) {
      const unknown = Object.keys(permissions).filter((k) => !isPermission(k));
      if (unknown.length) {
        return NextResponse.json(
          { error: `Unknown permission(s): ${unknown.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: { members: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const callerMember = workspace.members.find((m) => m.userId === session.user.id);
    if (!callerMember || !(await canMember(callerMember, "member:set_role"))) {
      return NextResponse.json(
        { error: "Forbidden: you can't change teammate roles." },
        { status: 403 }
      );
    }

    const target = workspace.members.find((m) => m.id === memberId);
    if (!target) {
      return NextResponse.json({ error: "Target teammate not found" }, { status: 404 });
    }

    if (role !== undefined && role !== target.role) {
      const touchesOwnership = role === "OWNER" || target.role === "OWNER";
      // Only an OWNER may grant or revoke the OWNER role.
      if (touchesOwnership && callerMember.role !== "OWNER") {
        return NextResponse.json(
          { error: "Only an owner can transfer or revoke ownership." },
          { status: 403 }
        );
      }
      // Never strip the workspace's only OWNER.
      if (target.role === "OWNER" && role !== "OWNER") {
        const otherOwners = workspace.members.filter(
          (m) => m.role === "OWNER" && m.id !== memberId
        );
        if (otherOwners.length === 0) {
          return NextResponse.json(
            { error: "Cannot demote the only Owner. Assign another Owner first." },
            { status: 400 }
          );
        }
      }
    }

    const member = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(permissions !== undefined
          ? { permissions: permissions === null ? Prisma.DbNull : permissions }
          : {}),
      },
      include: {
        user: { select: { name: true, image: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, member });
  } catch (err) {
    console.error("Failed to update member:", err);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}
