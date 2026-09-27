import { NextResponse } from "next/server";
import { handlePartnerCall } from "@/lib/ats/partner-server";

/**
 * Greenhouse Assessment Partner endpoints:
 *   GET  /api/integrations/greenhouse/list_tests
 *   POST /api/integrations/greenhouse/send_test
 *   GET  /api/integrations/greenhouse/test_status?partner_interview_id=...
 *   POST /api/integrations/greenhouse/request_errors
 * Auth is HTTP Basic with the workspace's partner key as the user name.
 */

type Ctx = { params: Promise<{ action: string }> };

async function handle(req: Request, { params }: Ctx) {
  const { action } = await params;
  let body: unknown = null;
  if (req.method === "POST") {
    const raw = await req.text();
    if (raw.length > 100_000) return NextResponse.json({ errors: ["Body too large"] }, { status: 413 });
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json({ errors: ["Body is not valid JSON"] }, { status: 400 });
    }
  }
  try {
    const res = await handlePartnerCall(action, {
      method: req.method,
      authorization: req.headers.get("authorization"),
      query: new URL(req.url).searchParams,
      body,
    });
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (res.status === 401) headers["WWW-Authenticate"] = 'Basic realm="Codepad"';
    return NextResponse.json(res.body, { status: res.status, headers });
  } catch (err) {
    console.error(`[greenhouse] ${action} failed:`, err);
    return NextResponse.json({ errors: ["Something went wrong on our side. Try again."] }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
