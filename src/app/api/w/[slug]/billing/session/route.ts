import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { canMember } from "@/lib/permissions";
import { checkoutSeatChargeCents } from "@/lib/billing/plans";
import { VIDEO_ADDON_KIND, videoAddonCents } from "@/lib/video/addon";
import { getEffectivePricing } from "@/lib/billing/pricing-copy-store";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
    if (!callerMember || !(await canMember(callerMember, "billing:manage"))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const body = await req.json().catch(() => ({}));
    const plan = (body.plan || "GROWTH") as "STARTER" | "GROWTH";
    const cadence = (body.cadence || "monthly") as "monthly" | "annual";

    // Lazy-init resolves here (after the auth + plan checks). Throws a clear
    // 500 if STRIPE_SECRET_KEY is missing — caught by the outer try/catch.
    const stripe = getStripe();

    // 1. If already subscribed, redirect to Stripe Billing Customer Portal
    if (workspace.stripeCustomerId && workspace.stripeSubscriptionId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: workspace.stripeCustomerId,
        return_url: `${origin}/w/${slug}/billing`,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    // 2. Resolve Stripe Customer ID
    let stripeCustomerId = workspace.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: workspace.name,
        metadata: {
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
        },
      });
      stripeCustomerId = customer.id;
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { stripeCustomerId },
      });
    }

    // 3. Create Checkout Session for Subscription Upgrade
    const seatCount = workspace.members.length;

    const isStarter = plan === "STARTER";
    // Seat price comes from the effective pricing (plan config with any admin
    // override), the same source the pricing and billing pages show, so the
    // page and Stripe agree. Annual plans bill once a year, so the amount is
    // twelve discounted months.
    const pricing = await getEffectivePricing();
    const priceAmount = checkoutSeatChargeCents(isStarter ? "STARTER" : "GROWTH", cadence, pricing.growth);

    const productName = isStarter
      ? "Interviewpad Starter Workspace Seats"
      : "Interviewpad Growth Workspace Seats";

    const productDescription = isStarter
      ? "Per-seat premium team workspace licenses (Starter Tier)."
      : "Per-seat premium team workspace licenses (Growth Tier).";

    const interval = cadence === "monthly" ? "month" : "year";

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: priceAmount,
            recurring: {
              interval: interval,
            },
          },
          quantity: seatCount,
        },
        // Built-in video switched on during the trial carries over as its own
        // line. The webhook tags this item so seat changes never touch it.
        ...(workspace.videoEnabled && !isStarter
          ? [
              {
                price_data: {
                  currency: "usd",
                  product_data: { name: "Built-in video", metadata: { kind: VIDEO_ADDON_KIND } },
                  unit_amount: videoAddonCents(interval, pricing.videoAddon),
                  recurring: { interval },
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      success_url: `${origin}/w/${slug}/billing?billing_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/w/${slug}/billing?billing_cancel=true`,
      subscription_data: {
        metadata: {
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
          planName: plan,
        },
      },
      metadata: {
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
        planName: plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Billing session creation failed:", err);
    return NextResponse.json({ error: "Failed to build billing session" }, { status: 500 });
  }
}
