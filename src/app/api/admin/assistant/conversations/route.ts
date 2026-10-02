import { NextResponse } from "next/server";
import { listConversations } from "@/lib/admin/assistant/conversations";
import { assistantCaller } from "@/lib/admin/assistant/route-auth";

/** GET -> the caller's 50 latest conversations, newest first. */
export async function GET() {
  const caller = await assistantCaller();
  if (caller instanceof NextResponse) return caller;
  return NextResponse.json({ conversations: await listConversations(caller.userId) });
}
