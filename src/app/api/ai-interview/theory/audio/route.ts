import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { authorizeTheoryRound } from "@/lib/ai-interview/theory-server";
import { isTranscriptionConfigured, transcribeAudio } from "@/lib/ai-interview/transcribe";
import { aiClipKey, recordingExpiresAt } from "@/lib/recording/retention";
import { putObject, r2Config } from "@/lib/storage/r2";
import { CLIP_MIME, MAX_CLIP_BYTES, currentSlot, parseAnswers, theoryView, transcriptionPrompt } from "@/lib/ai-interview/theory";

/** Most clips kept for one round, so a looping client cannot fill the database. */
const MAX_CLIPS_PER_ROUND = 240;

/**
 * One recorded clip of the answer on screen, sent as multipart form data:
 *   inviteToken, roundId, seq, seconds, audio (the clip),
 *   keep ("1" when the candidate agreed to be recorded), transcribe ("1" to get text back),
 *   test ("1" for the mic check: transcribed, never kept)
 *
 * The clip is kept when the recruiter turned on replay for the round and the
 * candidate agreed, and transcribed when the browser asks (it cannot
 * transcribe speech itself).
 * The server decides which question the clip belongs to, so a clip can
 * never be filed under another answer.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected form data" }, { status: 400 });
  const inviteToken = String(form.get("inviteToken") ?? "").trim();
  const roundId = String(form.get("roundId") ?? "");
  const audio = form.get("audio");
  if (!inviteToken || !roundId || !(audio instanceof Blob)) return NextResponse.json({ error: "Missing inviteToken, roundId or audio" }, { status: 400 });
  if (audio.size === 0) return NextResponse.json({ text: "" });
  if (audio.size > MAX_CLIP_BYTES) return NextResponse.json({ error: "That recording is too long. Pause the mic now and then." }, { status: 413 });
  const mime = (audio.type || "audio/webm").slice(0, 80);
  if (!CLIP_MIME.test(mime)) return NextResponse.json({ error: "Unsupported audio format" }, { status: 415 });

  const access = await authorizeTheoryRound(inviteToken, roundId);
  if (!access.ok) return NextResponse.json(access.body, { status: access.status });
  const { session, round, data } = access;
  if (data.settings.answerMode === "typing") return NextResponse.json({ error: "This round is answered by typing." }, { status: 409 });

  const wantText = form.get("transcribe") === "1";
  const keep = data.settings.recordAudio && form.get("keep") === "1" && form.get("test") !== "1";
  if (!wantText && !keep) return NextResponse.json({ error: "Recording is off for this round." }, { status: 409 });

  const cadence = rateLimit(`ai-theory-audio:${session.id}`, 6, 10_000);
  if (!cadence.ok) return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });

  const state = parseAnswers(round.answersJson);
  const slot = currentSlot(data, state);
  if (!slot) return NextResponse.json({ error: "This round is finished." }, { status: 409 });

  if (keep) {
    const kept = await prisma.aIInterviewAudio.count({ where: { roundId: round.id } });
    if (kept < MAX_CLIPS_PER_ROUND) {
      const seq = Math.max(0, Math.min(999, Math.floor(Number(form.get("seq")) || 0)));
      const seconds = Math.max(0, Math.min(3600, Math.round(Number(form.get("seconds")) || 0)));
      await keepClip(
        { sessionId: session.id, workspaceId: session.workspaceId, roundId: round.id, question: slot.question, followUp: slot.followUp, seq, seconds, mime },
        new Uint8Array(await audio.arrayBuffer()),
      );
    }
  }

  if (!wantText) return NextResponse.json({ saved: true });
  if (!isTranscriptionConfigured()) return NextResponse.json({ error: "Spoken answers are not available right now. Please type your answer." }, { status: 503 });
  const v = theoryView(data, state);
  const out = await transcribeAudio(audio, { prompt: transcriptionPrompt(v.question?.text ?? "", v.followUp), language: data.settings.language });
  if (!out) return NextResponse.json({ error: "Could not turn that into text. Try again, or type your answer." }, { status: 502 });
  return NextResponse.json({ text: out.text.slice(0, 6000), saved: keep });
}

type ClipMeta = { sessionId: string; workspaceId: string | null; roundId: string; question: number; followUp: number; seq: number; seconds: number; mime: string };

/**
 * Saves a kept clip. With the recordings bucket set up it goes there and the
 * row keeps only the key; otherwise (or if the upload fails) the bytes stay in
 * the database, so an answer is never lost. Either way it is deleted after
 * RECORDING_RETENTION_DAYS.
 */
async function keepClip(meta: ClipMeta, bytes: Uint8Array): Promise<void> {
  const { workspaceId, ...fields } = meta;
  const expiresAt = recordingExpiresAt();
  const cfg = r2Config();
  if (cfg) {
    const row = await prisma.aIInterviewAudio.create({ data: { ...fields, expiresAt }, select: { id: true } });
    const key = aiClipKey(workspaceId, meta.sessionId, row.id, meta.mime);
    try {
      await putObject(cfg, key, bytes, meta.mime.split(";")[0] || "audio/webm");
      await prisma.aIInterviewAudio.update({ where: { id: row.id }, data: { storageKey: key } });
      return;
    } catch (err) {
      console.error("[ai-interview] clip upload to R2 failed, keeping it in the database", err);
      await prisma.aIInterviewAudio.update({ where: { id: row.id }, data: { bytes: Buffer.from(bytes) } });
      return;
    }
  }
  await prisma.aIInterviewAudio.create({ data: { ...fields, expiresAt, bytes: Buffer.from(bytes) } });
}
