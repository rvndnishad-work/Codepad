/**
 * "Preview as candidate": the recruiter sees the real candidate screen, but
 * nothing reaches the screening APIs. Every call the candidate screen makes
 * to /api/ai-interview/* is answered here in the browser, so a preview never
 * starts a session, spends a credit, sends a message to the AI, records
 * time or submits anything. Running code (/api/execute) still goes through,
 * because it has no side effects on the screening.
 *
 * The preview page also passes a placeholder invite token, so even a call
 * that slipped past this guard would find no session. Client only.
 */

export const PREVIEW_TOKEN = "preview";

type Msg = { role: "user" | "assistant"; text: string; roundId?: string };
export type PreviewState = { chat: Msg[]; engagementLevel: string };
export type PreviewReply = { status: number; body: unknown } | null;

const GREETING =
  "Hi, I am the AI interviewer. This is a preview, so I will not reply here. In the real screening I greet the candidate, explain the task, answer their questions and ask follow-ups while they work.";
const ECHO = "Preview only: in the real screening the AI interviewer replies to this message.";

function pathOf(url: string): string {
  try {
    return new URL(url, "http://preview.local").pathname;
  } catch {
    return url;
  }
}

function bodyOf(init?: { body?: unknown }): Record<string, unknown> {
  if (typeof init?.body !== "string") return {};
  try {
    const v = JSON.parse(init.body);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * The canned answer for a request made from the preview, or null to let it
 * through. Mutates `state.chat` for message calls, like the server would.
 */
export function previewReply(url: string, init: { method?: string; body?: unknown } | undefined, state: PreviewState): PreviewReply {
  const path = pathOf(url);
  if (!path.startsWith("/api/ai-interview/")) return null;
  const route = path.slice("/api/ai-interview/".length).replace(/\/+$/, "");
  switch (route) {
    case "status":
      return {
        status: 200,
        body: {
          ai: { configured: true, model: "preview" },
          credits: null,
          deadline: null,
          expired: false,
          finished: false,
          engagementLevel: state.engagementLevel,
          extensions: { remaining: 0, minutesEach: 5 },
        },
      };
    case "message": {
      const b = bodyOf(init);
      const text = typeof b.message === "string" ? b.message : "";
      const roundId = typeof b.roundId === "string" ? b.roundId : undefined;
      if (state.chat.length === 0) {
        state.chat.push({ role: "assistant", text: GREETING, roundId });
      } else {
        if (text) state.chat.push({ role: "user", text, roundId });
        state.chat.push({ role: "assistant", text: ECHO, roundId });
      }
      return { status: 200, body: { chatHistory: [...state.chat], response: state.chat[state.chat.length - 1].text, aiProvider: "mock", degraded: false } };
    }
    case "observe":
      return { status: 200, body: { comment: null } };
    case "heartbeat":
      return { status: 200, body: { ok: true, timeSpentSec: 0 } };
    case "extend":
      return { status: 409, body: { success: false, error: "Extra time is not available in a preview." } };
    case "submit":
      return { status: 409, body: { error: "This is a preview, so nothing is submitted or graded." } };
    case "theory":
    case "theory/audio":
      return { status: 409, body: { error: "Theory questions are drawn for each candidate when they start, so a preview shows the round introduction only." } };
    case "tts":
      // No cloud voice in a preview; the screen falls back to the browser voice.
      return { status: 404, body: { error: "Not available in a preview." } };
    default:
      return { status: 404, body: { error: "Not available in a preview." } };
  }
}

/**
 * Replaces window.fetch while the preview is on screen. Returns a function
 * that puts the original back.
 */
export function installPreviewFetch(state: PreviewState): () => void {
  if (typeof window === "undefined") return () => {};
  const w = window as Window & { __previewFetchOriginal?: typeof fetch };
  const original = w.__previewFetchOriginal ?? window.fetch.bind(window);
  w.__previewFetchOriginal = original;
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const reply = previewReply(url, init as { method?: string; body?: unknown } | undefined, state);
    if (!reply) return original(input, init);
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return () => {
    window.fetch = original;
    delete w.__previewFetchOriginal;
  };
}
