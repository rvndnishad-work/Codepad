import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUnreadCount,
  listForUser,
  markAllRead,
} from "@/lib/notifications";

/**
 * Notifications API (IP-40).
 *
 *   GET    /api/notifications/me              → { unread, items[] }
 *   POST   /api/notifications/me              → mark-all-read (no body)
 *   POST   /api/notifications/me/:id/read     → handled by ./[id]/read/route.ts
 *   POST   /api/notifications/me/:id/dismiss  → handled by ./[id]/dismiss/route.ts
 *
 * Keeping mutating routes co-located with the resource (per-id segments) so
 * the auth check stays trivial — `userId` always comes from `auth()`, never
 * from the URL or body.
 */

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [unread, items] = await Promise.all([
    getUnreadCount(session.user.id),
    listForUser(session.user.id),
  ]);
  return NextResponse.json(
    { unread, items },
    // The bell polls this every ~30s — short cache prevents thundering-herd
    // on warm fetches but is short enough that "Mark all read" updates show
    // up fast for the same user (poll cadence dominates).
    { headers: { "Cache-Control": "private, max-age=5" } },
  );
}

export async function POST(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await markAllRead(session.user.id);
  return NextResponse.json({ ok: true });
}
