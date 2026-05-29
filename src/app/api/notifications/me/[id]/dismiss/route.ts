import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dismiss } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await dismiss(session.user.id, id);
  return NextResponse.json({ ok: true });
}
