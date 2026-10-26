import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchLibrary } from "@/lib/mock-interview/server";
import type { PickKind } from "@/lib/mock-interview/roles";

/** GET: one page of the public library for the mock interview question picker. */
export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in again to continue." }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const raw = sp.get("source");
  const source: PickKind = raw === "coding" || raw === "design" ? raw : "question";
  const res = await searchLibrary({
    source,
    topic: sp.get("topic"),
    difficulty: sp.get("difficulty"),
    q: sp.get("q"),
    page: Number(sp.get("page") ?? 1) || 1,
  });
  return NextResponse.json(res);
}
