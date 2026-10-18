import { NextResponse, type NextRequest } from "next/server";
import { chat } from "@/lib/admin/assistant/conversations";
import { assistantCaller, errorResponse } from "@/lib/admin/assistant/route-auth";

export const maxDuration = 120;

/** POST { conversationId?, message } -> { conversation, message, messages: [user, assistant, ...extra cards] } */
export async function POST(req: NextRequest) {
  const caller = await assistantCaller();
  if (caller instanceof NextResponse) return caller;
  const body = (await req.json().catch(() => ({}))) as { conversationId?: unknown; message?: unknown };
  try {
    const result = await chat({
      userId: caller.userId,
      actor: caller.actor,
      conversationId: typeof body.conversationId === "string" && body.conversationId ? body.conversationId : null,
      message: typeof body.message === "string" ? body.message : "",
    });
    const assistant = result.messages.find((m) => m.role === "assistant") ?? null;
    return NextResponse.json({ ...result, message: assistant });
  } catch (err) {
    return errorResponse(err);
  }
}
