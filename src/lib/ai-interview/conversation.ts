/**
 * Conversation rounds: chat-only rounds with no code, for any role. Pure
 * helpers shared by grading and the recruiter report.
 */

export type ChatEntry = { role: "user" | "assistant"; text: string; roundId?: string };

/**
 * The part of a session's shared chat that belongs to one round. Messages are
 * tagged with the round they were sent in; chats from before tagging carry no
 * tags, so a single-round session falls back to the whole log.
 */
export function transcriptForRound(history: ChatEntry[], roundId: string, onlyRound: boolean): ChatEntry[] {
  const tagged = history.some((m) => m.roundId);
  if (!tagged) return onlyRound ? history : [];
  return history.filter((m) => m.roundId === roundId);
}

/** Candidate answers long enough to judge (at least five words). */
export function substantiveTurns(msgs: ChatEntry[]): number {
  return msgs.filter((m) => m.role === "user" && m.text.trim().split(/\s+/).filter(Boolean).length >= 5).length;
}

export function renderTranscript(msgs: ChatEntry[]): string {
  return msgs.map((m) => `${m.role === "assistant" ? "Interviewer" : "Candidate"}: ${m.text}`).join("\n");
}

export type ConversationGrade = {
  score: number;
  codeQuality: number;
  problemSolving: number;
  communication: number;
  aiSummary: string;
};

/**
 * Hard floor: a candidate who barely answered cannot score above 9, whatever
 * the model says.
 */
export function clampConversation(g: ConversationGrade, turns: number): ConversationGrade {
  if (turns >= 2) return g;
  return { ...g, score: Math.min(g.score, 9), codeQuality: Math.min(g.codeQuality, 1), problemSolving: Math.min(g.problemSolving, 1), communication: Math.min(g.communication, 2) };
}

/**
 * Used when no model is available. It measures participation only, so it
 * stays low and says so; a recruiter should read the transcript.
 */
export function conversationFallback(msgs: ChatEntry[]): ConversationGrade {
  const turns = substantiveTurns(msgs);
  const score = turns === 0 ? 0 : Math.min(40, 10 + turns * 5);
  const rating = turns >= 4 ? 2 : 1;
  return clampConversation(
    {
      score,
      codeQuality: rating,
      problemSolving: rating,
      communication: rating,
      aiSummary: `- Not scored by the AI. This score only reflects that the candidate gave ${turns} substantive ${turns === 1 ? "answer" : "answers"}; read the transcript to judge them.`,
    },
    turns,
  );
}

/** Grading prompt for one conversation round. */
export function conversationGraderPrompt(p: { positionTitle: string; brief: string; questionList: string; transcript: string }): string {
  return `You are the Interviewpad AI Grading Agent.
Evaluate a candidate's screening conversation for the position of "${p.positionTitle}". There is no code in this round.

Round brief: ${p.brief || "(none)"}

Questions the interviewer was asked to cover:
${p.questionList || "(not listed)"}

Transcript:
${p.transcript || "(empty)"}

Score with this weighted rubric (0-100 composite):
1. ANSWER QUALITY (40%): relevant, specific answers backed by real examples, numbers and the candidate's own actions.
2. JUDGEMENT (35%): sound reasoning in scenarios, sensible priorities, awareness of trade-offs and risks.
3. COMMUNICATION (25%): clear, structured, concise and honest.
Only judge what the candidate said. If they answered fewer than two questions in substance, the score must be below 10.

Output strictly a JSON object:
{
  "score": number (0-100),
  "codeQuality": number (1-5, answer quality),
  "problemSolving": number (1-5, judgement),
  "communication": number (1-5),
  "aiSummary": string (lines starting "+ " for strengths and "- " for gaps)
}`;
}
