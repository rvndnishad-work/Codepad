/**
 * POST /api/w/[slug]/billing/razorpay/seats/order  { seats, cadence: "monthly" | "annual" }
 * Prepaid Growth: create a Razorpay order for seats x the Growth seat price
 * for one month or one year. Owners and admins with billing access only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { razorpayConfigured, razorpayErrorStatus, razorpayKeyId } from "@/lib/razorpay";
import { RazorpayCheckoutError } from "@/lib/billing/razorpay-credit-checkout";
import { createRazorpaySeatOrder } from "@/lib/billing/razorpay-seat-checkout";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: "You are signed out. Sign in and try again." }, { status: 401 });
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        planName: true,
        stripeSubscriptionId: true,
        members: { where: { userId: session.user.id }, select: { role: true, permissions: true } },
      },
    });
    if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    const me = workspace.members[0];
    if (!me || !(await canMember(me, "billing:manage"))) {
      return NextResponse.json({ error: "Only owners and admins with billing access can choose a plan." }, { status: 403 });
    }
    if (!razorpayConfigured()) return NextResponse.json({ error: "Online payments are not set up on this server yet." }, { status: 503 });

    const body = (await req.json().catch(() => ({}))) as { seats?: unknown; cadence?: unknown };
    const order = await createRazorpaySeatOrder({ workspace, seats: body.seats, cadence: body.cadence, keyId: razorpayKeyId() });
    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof RazorpayCheckoutError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (razorpayErrorStatus(err) === 401) {
      console.error("[billing] Razorpay rejected the API keys:", err);
      return NextResponse.json({ error: "The payment provider rejected this server's keys. Contact support." }, { status: 401 });
    }
    console.error("[billing] Razorpay seat order failed:", err);
    return NextResponse.json({ error: "Could not start the payment. Try again in a moment." }, { status: 500 });
  }
}
