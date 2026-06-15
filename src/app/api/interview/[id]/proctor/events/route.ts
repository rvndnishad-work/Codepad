import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSessionEnded, verifySignature, safeEqual } from "@/lib/proctoring/agent";

/**
 * Native proctor agent report ingest. NOT session-cookie authenticated: the
 * agent runs on the candidate's machine and authenticates with its per-session
 * bearer token + an HMAC-SHA256 signature over the raw body. See
 * `src/lib/proctoring/agent.ts` and the wire contract in `agent/README.md`.
 *
 * Status codes are meaningful to the agent: 401/403/410 make it stop and
 * self-uninstall; anything else it treats as transient and retries.
 */

const signalSchema = z.object({
  kind: z.string(),
  severity: z.string(),
  window_handle: z.number(),
  window_title: z.string(),
  process_name: z.string(),
  detail: z.string(),
  weight: z.number(),
});

const reportSchema = z.object({
  session_id: z.string().min(1),
  seq: z.number().int().min(0),
  sent_at_ms: z.number().int().min(0),
  agent_version: z.string(),
  scan: z.object({
    signals: z.array(signalSchema).max(200),
    suspicion: z.number().int().min(0).max(100),
    scanned_windows: z.number().int().min(0),
    timestamp_ms: z.number().int().min(0),
  }),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Read the RAW body once — the HMAC must be computed over the exact bytes.
  const rawBody = await req.text();

  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const signature = req.headers.get("x-proctor-signature") || "";
  if (!bearer || !signature) {
    return NextResponse.json({ error: "missing credentials" }, { status: 401 });
  }

  const interview = await prisma.interviewSession.findUnique({
    where: { id },
    select: {
      id: true,
      proctorToken: true,
      proctorSecret: true,
      status: true,
      finishedAt: true,
      aiSuspicionScore: true,
    },
  });

  // Unknown / deleted session -> Gone, so the agent stops and self-uninstalls.
  if (!interview) {
    return NextResponse.json({ error: "gone" }, { status: 410 });
  }
  // Not provisioned or credentials cleared (revoked).
  if (!interview.proctorToken || !interview.proctorSecret) {
    return NextResponse.json({ error: "revoked" }, { status: 403 });
  }
  if (!safeEqual(bearer, interview.proctorToken)) {
    return NextResponse.json({ error: "bad token" }, { status: 401 });
  }
  if (!verifySignature(interview.proctorSecret, rawBody, signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  // Authenticated. Now parse + validate the body.
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const report = parsed.data;
  if (report.session_id !== id) {
    return NextResponse.json({ error: "session mismatch" }, { status: 400 });
  }

  const ended = isSessionEnded(interview);

  const existing = await prisma.proctorAgentReport.findUnique({
    where: { sessionId: id },
    select: { lastSeq: true, peakSuspicion: true },
  });

  // Drop replays / out-of-order deliveries: only seq strictly greater than the
  // last accepted one mutates state. Still return the control flow so a stale
  // retry learns the session has ended.
  if (existing && report.seq <= existing.lastSeq) {
    return NextResponse.json({ ok: true, recorded: false, session_ended: ended });
  }

  const native = report.scan.suspicion;
  const peak = Math.max(existing?.peakSuspicion ?? 0, native);

  await prisma.proctorAgentReport.upsert({
    where: { sessionId: id },
    update: {
      lastSeq: report.seq,
      suspicionScore: native,
      peakSuspicion: peak,
      scannedWindows: report.scan.scanned_windows,
      signalsData: JSON.stringify(report.scan.signals),
      agentVersion: report.agent_version,
      agentConnected: true,
      reportCount: { increment: 1 },
      lastSeenAt: new Date(),
    },
    create: {
      sessionId: id,
      lastSeq: report.seq,
      suspicionScore: native,
      peakSuspicion: peak,
      scannedWindows: report.scan.scanned_windows,
      signalsData: JSON.stringify(report.scan.signals),
      agentVersion: report.agent_version,
      reportCount: 1,
    },
  });

  // Roll up into the session's headline score. Browser telemetry also writes
  // aiSuspicionScore (see the challenge telemetry route); take the max so the
  // native overlay signal — which the browser can't see — never gets clobbered
  // downward by a low browser score.
  const rolled = Math.max(interview.aiSuspicionScore ?? 0, native);
  if (rolled !== interview.aiSuspicionScore) {
    await prisma.interviewSession.update({
      where: { id },
      data: { aiSuspicionScore: rolled },
    });
  }

  return NextResponse.json({ ok: true, recorded: true, session_ended: ended });
}
