import { featureBlockedResponse } from "@/lib/admin/switches";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { grantTrialCredits } from "@/lib/billing/included-credits-server";
import { newPlansEnabled, syncAccountWorkspaces } from "@/lib/billing/account-plan-server";
import { placeNewWorkspace, type Placement } from "@/lib/billing/account-plan";
import { getEffectiveCatalog } from "@/lib/billing/pricing-copy-store";

/** Where a new workspace for this person would go, under the new plans. */
async function placementFor(userId: string): Promise<Placement> {
  const [owned, catalog] = await Promise.all([
    prisma.billingAccount.findMany({
      where: { ownerUserId: userId, planKey: { not: null } },
      select: { id: true, planKey: true, planCadence: true, paidThrough: true, _count: { select: { workspaces: true } } },
    }),
    getEffectiveCatalog(),
  ]);
  return placeNewWorkspace(
    owned.map((a) => ({ ...a, workspaces: a._count.workspaces })),
    catalog.plans,
  );
}

/**
 * GET /api/w/create: what creating a workspace will do for the signed-in
 * person, for the create page's wording. Trial while the new plans are off;
 * otherwise join their plan, start without a plan, or blocked at the limit.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await newPlansEnabled())) return NextResponse.json({ mode: "trial" });
  const place = await placementFor(session.user.id);
  if (place.kind === "join") {
    const catalog = await getEffectiveCatalog();
    return NextResponse.json({ mode: "join", plan: catalog.plans.find((p) => p.key === place.planKey)?.name ?? place.planKey });
  }
  return NextResponse.json(place.kind === "full" ? { mode: "full", reason: place.reason } : { mode: "own" });
}

const createSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and dashes.",
  }),
});

export async function POST(req: Request) {
  // Feature switch "recruiter-signup" (admin > Feature switches): 503 while paused.
  const featurePaused = await featureBlockedResponse("recruiter-signup");
  if (featurePaused) return featurePaused;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // With the new plans on sale there is no trial: a new workspace joins the
  // owner's plan if it has room, or starts without a plan until one is bought.
  const plansOn = await newPlansEnabled();
  const place: Placement = plansOn ? await placementFor(session.user.id) : { kind: "own" };
  if (place.kind === "full") return NextResponse.json({ error: place.reason }, { status: 409 });

  const { name } = parsed.data;
  let { slug } = parsed.data;

  // Ensure slug uniqueness
  // Old addresses of renamed workspaces still redirect, so they count as taken.
  const [existing, redirected] = await Promise.all([
    prisma.workspace.findUnique({ where: { slug }, select: { id: true } }),
    prisma.workspaceSlugRedirect.findUnique({ where: { oldSlug: slug }, select: { id: true } }),
  ]);

  if (existing || redirected) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    slug = `${slug}-${randomSuffix}`;
  }

  try {
    // Create the workspace and add the creator as OWNER. While the new plans
    // are off, new workspaces get the 14-day trial (IP-91): Growth-level
    // access and 5 seats, which is what /w/create promises.
    const trialEndsAt = plansOn ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        trialEndsAt,
        billingAccount:
          place.kind === "join" ? { connect: { id: place.accountId } } : { create: { name, ownerUserId: session.user.id } },
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    if (place.kind === "join") {
      // Takes the plan, seats and paid-until date of the account it joined.
      await syncAccountWorkspaces(place.accountId);
    } else if (!plansOn) {
      // Trial credits so the trial can run a real AI screening. Never fail
      // the create over them.
      try {
        await grantTrialCredits(workspace.id, session.user.id);
      } catch (err) {
        console.error("Trial credit grant failed:", err);
      }
    }

    return NextResponse.json({ ok: true, slug: workspace.slug, placement: place.kind });
  } catch (err) {
    console.error("Workspace creation failed:", err);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
