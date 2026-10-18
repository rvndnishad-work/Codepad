import { NextResponse, type NextRequest } from "next/server";
import { deleteConversation, getConversation, renameConversation } from "@/lib/admin/assistant/conversations";
import { assistantCaller } from "@/lib/admin/assistant/route-auth";

type Params = { params: Promise<{ id: string }> };

/** GET -> { conversation, messages } (latest 100 messages). */
export async function GET(_req: NextRequest, { params }: Params) {
  const caller = await assistantCaller();
  if (caller instanceof NextResponse) return caller;
  const { id } = await params;
  const data = await getConversation(id, caller.userId);
  if (!data) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  return NextResponse.json(data);
}

/** PATCH { title } renames the conversation. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const caller = await assistantCaller();
  if (caller instanceof NextResponse) return caller;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { title?: unknown };
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const ok = await renameConversation(id, caller.userId, body.title);
  return ok ? NextResponse.json({ ok }) : NextResponse.json({ error: "Conversation not found" }, { status: 404 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const caller = await assistantCaller();
  if (caller instanceof NextResponse) return caller;
  const { id } = await params;
  const ok = await deleteConversation(id, caller.userId);
  return ok ? NextResponse.json({ ok }) : NextResponse.json({ error: "Conversation not found" }, { status: 404 });
}
