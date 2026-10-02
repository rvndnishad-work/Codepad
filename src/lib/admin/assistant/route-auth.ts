/** Shared guard for /api/admin/assistant/* routes: platform:admin only. */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import type { AdminActor } from "@/lib/admin/audit";

export type AssistantCaller = { userId: string; actor: AdminActor };

export async function assistantCaller(): Promise<AssistantCaller | NextResponse> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await staffCan(session, "platform:admin"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return { userId, actor: { id: userId, email: session.user?.email ?? null } };
}

export function errorResponse(err: unknown): NextResponse {
  const e = err as { message?: string; status?: number; name?: string };
  const known = e?.name === "AssistantError" || typeof e?.status === "number";
  if (!known) console.error("[assistant] route error", err);
  return NextResponse.json(
    { error: known && e.message ? e.message : "Something went wrong on the server." },
    { status: known && e.status ? e.status : 500 },
  );
}
