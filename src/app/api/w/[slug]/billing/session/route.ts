import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
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
    if (!callerMember || (callerMember.role !== "OWNER" && callerMember.role !== "ADMIN")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // 1. If already subscribed, redirect to Stripe Billing Customer Portal
    if (workspace.stripeCustomerId && workspace.stripeSubscriptionId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: workspace.stripeCustomerId,
        return_url: `${origin}/w/${slug}`,
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

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Codepad Growth Workspace Seats",
              description: "Per-seat premium team workspace licenses.",
            },
            unit_amount: 4900, // $49.00 per seat/month
            recurring: {
              interval: "month",
            },
          },
          quantity: seatCount,
        },
      ],
      success_url: `${origin}/w/${slug}?billing_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/w/${slug}?billing_cancel=true`,
      metadata: {
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Billing session creation failed:", err);
    return NextResponse.json({ error: "Failed to build billing session" }, { status: 500 });
  }
}
