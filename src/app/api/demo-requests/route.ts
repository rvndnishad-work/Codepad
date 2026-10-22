import { NextResponse } from "next/server";
import { featureBlockedResponse } from "@/lib/admin/switches";
import { clientKey, rateLimitDistributed } from "@/lib/rate-limit";
import { demoRequestSchema } from "@/lib/demo-requests/model";
import { createDemoRequest } from "@/lib/demo-requests/server";

/**
 * Public "Book a demo" form. Anyone can send it; we keep the request, email
 * the person a receipt and tell the sales inbox. An admin follows up and may
 * set up a pilot workspace from the request.
 */
export async function POST(req: Request) {
  const paused = await featureBlockedResponse("demo-requests");
  if (paused) return paused;

  // 5 requests per 10 minutes per address.
  const rl = await rateLimitDistributed("demo-request:" + clientKey(req), 5, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests from this address. Try again in a few minutes." },
      { status: 429, headers: { "retry-after": String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = demoRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    const errors: Record<string, string> = {};
    for (const [k, v] of Object.entries(fieldErrors)) if (v?.[0]) errors[k] = v[0];
    return NextResponse.json({ error: "Check the highlighted fields.", errors }, { status: 400 });
  }

  // Honeypot filled: answer as if it worked, keep nothing.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  try {
    await createDemoRequest(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[demo-requests] create failed:", err);
    return NextResponse.json({ error: "We could not send your request. Try again, or email us." }, { status: 500 });
  }
}
