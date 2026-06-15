import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueAgentCredentials } from "@/lib/proctoring/agent";

/**
 * Issue (or rotate) the native proctor agent credentials for a session.
 * Interviewer/owner only. Returns the token + secret and the launcher env the
 * one-time agent download is parameterized with. Rotating revokes any prior
 * agent instance (its next report 401s -> it self-uninstalls).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const interview = await prisma.interviewSession.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!interview) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (interview.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { token, secret } = issueAgentCredentials();
  await prisma.interviewSession.update({
    where: { id },
    data: { proctorToken: token, proctorSecret: secret },
  });

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const backendUrl = `${origin}/api/interview/${id}/proctor`;

  return NextResponse.json({
    ok: true,
    sessionId: id,
    token,
    hmacSecret: secret,
    eventsUrl: `${backendUrl}/events`,
    // Env the launcher injects before exec'ing the agent. PROCTOR_CONSENT_GRANTED
    // is set by the agent's own consent screen, never here.
    launchEnv: {
      PROCTOR_SESSION_ID: id,
      PROCTOR_BACKEND_URL: backendUrl,
      PROCTOR_TOKEN: token,
      PROCTOR_HMAC_SECRET: secret,
    },
  });
}
