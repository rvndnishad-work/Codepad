import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { roleById, type MockLevel } from "@/lib/mock-interview/roles";
import { suggestPicks } from "@/lib/mock-interview/server";

/** GET: a balanced starting set of questions for a role and level. */
export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in again to continue." }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const lvl = sp.get("level");
  const level: MockLevel = lvl === "junior" || lvl === "senior" ? lvl : "mid";
  const picks = await suggestPicks(roleById(sp.get("role")), level);
  return NextResponse.json({ picks });
}
