import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeTheoryRound } from "@/lib/ai-interview/theory-server";
import { consumeCreditIfFirstTurn, InsufficientCreditsError } from "@/lib/ai-interview/credits";
import { callGemini, extractText, geminiApiKey } from "@/lib/ai-interview/gemini";
import { rateLimit } from "@/lib/rate-limit";
import {
  canFollowUp,
  cleanAnswerInput,
  cleanFollowUp,
  fallbackFollowUp,
  followUpPrompt,
  parseAnswers,
  recordAnswer,
  theoryView,
} from "@/lib/ai-interview/theory";

/**
 * Candidate side of a theory round, authorised by the invite token like the
 * message route. The server hands out one question at a time, so the page
 * never holds questions the candidate has not reached, and never a reference
 * answer.
 *
 *   { action: "state" }            → the question on screen (starts the round)
 *   { action: "answer", answer }   → saves it, returns a follow-up or the next question
 */
export async function POST(req: NextRequest) {
  let body: { inviteToken?: string; roundId?: string; action?: string; answer?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const inviteToken = (body.inviteToken ?? "").trim();
  if (!inviteToken || !body.roundId) return NextResponse.json({ error: "Missing inviteToken or roundId" }, { status: 400 });
  const action = body.action === "answer" ? "answer" : "state";

  const access = await authorizeTheoryRound(inviteToken, body.roundId);
  if (!access.ok) return NextResponse.json(access.body, { status: access.status });
  const { session, round, data } = access;

  const cadence = rateLimit(`ai-theory:${session.id}`, 1, 800);
  if (!cadence.ok) return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });

  // The first question starts the screening, like the first chat message does.
  try {
    await consumeCreditIfFirstTurn(session.id);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "Workspace is out of AI interview credits. Please contact your recruiter." }, { status: 402 });
    }
    throw err;
  }

  let state = parseAnswers(round.answersJson);
  if (action === "answer") {
    if (theoryView(data, state).done) return NextResponse.json({ view: theoryView(data, state) });
    state = recordAnswer(state, data, cleanAnswerInput(body.answer));
    if (canFollowUp(state, data.settings)) {
      const last = state.items[state.items.length - 1];
      state = { ...state, pendingFollowUp: await decideFollowUp(session.positionTitle, last.q, last.followUps.length ? last.followUps[last.followUps.length - 1].a : last.a, last.followUps) };
    }
  }

  const view = theoryView(data, state);
  await prisma.$transaction([
    prisma.aIInterviewSession.update({ where: { id: session.id }, data: { status: "ACTIVE" } }),
    prisma.aIInterviewRound.update({
      where: { id: round.id },
      data: {
        answersJson: JSON.stringify(state),
        status: view.done ? "COMPLETED" : "ACTIVE",
        startedAt: round.startedAt ?? new Date(),
        ...(view.done && !round.finishedAt ? { finishedAt: new Date() } : {}),
      },
    }),
  ]);
  return NextResponse.json({ view });
}

/** One short follow-up, or null. Model failures fall back to a neutral probe of thin answers. */
async function decideFollowUp(
  positionTitle: string,
  question: string,
  answer: string,
  earlier: { q: string; a: string; mode: "voice" | "typed" }[],
): Promise<string | null> {
  const apiKey = geminiApiKey();
  if (!apiKey) return fallbackFollowUp(answer);
  try {
    const res = await callGemini({
      apiKey,
      systemInstruction: "You are a careful technical interviewer. Output valid JSON only.",
      contents: [{ role: "user", parts: [{ text: followUpPrompt({ positionTitle, question, answer, earlier }) }] }],
      temperature: 0.3,
      maxOutputTokens: 200,
    });
    const text = extractText(res.parts).trim();
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    return cleanFollowUp((JSON.parse(json) as { followUp?: unknown }).followUp);
  } catch (err) {
    console.warn("[ai-theory] follow-up decision failed, using fallback:", err instanceof Error ? err.message : err);
    return fallbackFollowUp(answer);
  }
}
