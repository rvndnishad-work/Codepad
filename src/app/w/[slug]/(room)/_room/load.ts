import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadRoom } from "@/lib/interview/room-server";

/** Loads the room for this request, or says why it cannot be opened. */
export async function roomForRequest(slug: string, id: string) {
  const [session, hdrs] = await Promise.all([auth().catch(() => null), headers()]);
  const user = session?.user?.id ? { id: session.user.id, name: session.user.name, email: session.user.email } : null;
  const res = await loadRoom(slug, id, { user, cookieHeader: hdrs.get("cookie") });
  if (!res.ok && res.reason === "missing") notFound();
  return { res, signedIn: !!user };
}
