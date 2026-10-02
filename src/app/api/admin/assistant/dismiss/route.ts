import { NextResponse, type NextRequest } from "next/server";
import { dismissProposal } from "@/lib/admin/assistant/execute";
import { assistantCaller, errorResponse } from "@/lib/admin/assistant/route-auth";

/** POST { messageId } marks the proposal dismissed. Nothing runs. */
export async function POST(req: NextRequest) {
  const caller = await assistantCaller();
  if (caller instanceof NextResponse) return caller;
  const body = (await req.json().catch(() => ({}))) as { messageId?: unknown };
  if (typeof body.messageId !== "string" || !body.messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }
  try {
    const proposal = await dismissProposal({ messageId: body.messageId, userId: caller.userId, actor: caller.actor });
    return NextResponse.json({ proposal });
  } catch (err) {
    return errorResponse(err);
  }
}
