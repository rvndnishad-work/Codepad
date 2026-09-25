import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectivePlanAllowsAiScreening } from "@/lib/billing/trial";

/**
 * Plays back one recorded theory answer. Workspace members only, the same
 * people who can open the report; candidates never get a link to it.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string; sessionId: string; clipId: string }> }) {
  const { slug, sessionId, clipId } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, planName: true, trialEndsAt: true, stripeSubscriptionId: true, members: { where: { userId: session.user.id }, select: { userId: true } } },
  });
  if (!workspace || !workspace.members.length || !effectivePlanAllowsAiScreening(workspace)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const clip = await prisma.aIInterviewAudio.findFirst({
    where: { id: clipId, sessionId, session: { workspaceId: workspace.id } },
    select: { bytes: true, mime: true },
  });
  if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = new Uint8Array(clip.bytes);
  const headers = {
    "Content-Type": clip.mime.split(";")[0] || "audio/webm",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  // Seeking asks for byte ranges.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = bytes.length;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(bytes.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(bytes, { status: 200, headers: { ...headers, "Content-Length": String(bytes.length) } });
}
