import { NextResponse, type NextRequest } from "next/server";
import { approveProposal } from "@/lib/admin/assistant/execute";
import { assistantCaller, errorResponse } from "@/lib/admin/assistant/route-auth";

/** POST { messageId, edits? } runs the stored proposal, with the admin's edits to its fields. */
export async function POST(req: NextRequest) {
  const caller = await assistantCaller();
  if (caller instanceof NextResponse) return caller;
  const body = (await req.json().catch(() => ({}))) as { messageId?: unknown; edits?: unknown };
  if (typeof body.messageId !== "string" || !body.messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }
  try {
    const proposal = await approveProposal({ messageId: body.messageId, userId: caller.userId, actor: caller.actor, edits: body.edits });
    return NextResponse.json({ proposal });
  } catch (err) {
    return errorResponse(err);
  }
}
