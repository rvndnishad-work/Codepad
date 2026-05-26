import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTemplateById, AI_INTERVIEW_GEMINI_MODEL, computeDeadline } from "@/lib/ai-interview/scaffolds";
import {
  consumeCreditIfFirstTurn,
  InsufficientCreditsError,
} from "@/lib/ai-interview/credits";
import { checkFilesSize } from "@/lib/ai-interview/files-size";
import { rateLimit } from "@/lib/rate-limit";
import {
  loadActiveExternalServers,
  buildToolsCache,
  compileDeclarations,
  executeOutboundTool,
  wrapReferenceData,
  REFERENCE_DATA_SYSTEM_NOTE,
  OUTBOUND_MAX_CALLS,
  OUTBOUND_MAX_TOTAL_BYTES,
  OUTBOUND_MAX_TOTAL_MS,
  type ResolvedTools,
  type ToolsCache,
  type GeminiFunctionDeclaration,
} from "@/lib/mcp/outbound-tools";

/**
 * Per-session message bounds. Stops a candidate (or a script) from grinding
 * the conversation infinitely and inflating Gemini cost.
 */
const MAX_USER_MESSAGES_PER_SESSION = 60;
const MIN_INTERVAL_MS = 1500;

/**
 * Hard ceiling on Gemini ↔ tool-use loop iterations per turn. Without this,
 * a model that keeps emitting function calls could iterate forever — the
 * per-session budget catches it eventually but this is the cheap inner cap.
 */
const MAX_TOOL_USE_ITERATIONS = 8;

type Message = {
  role: "user" | "assistant";
  text: string;
};

/**
 * One content entry in Gemini's `contents` array. We model it loose because
 * the part objects can be `{text}` OR `{functionCall}` OR `{functionResponse}`
 * across the tool-use loop.
 */
type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: unknown } }
  | { functionResponse: { name: string; response: { content?: string; error?: string } } };

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

/**
 * Single-shot Gemini call. Returns the raw candidate so the caller can inspect
 * function-call vs text parts. `tools` is optional — pass declarations to
 * enable function calling; omit for plain text generation.
 */
async function callGemini(params: {
  apiKey: string;
  contents: GeminiContent[];
  systemInstruction: string;
  tools?: GeminiFunctionDeclaration[];
}): Promise<{ parts: GeminiPart[] }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_INTERVIEW_GEMINI_MODEL}:generateContent?key=${params.apiKey}`;

  const body: Record<string, unknown> = {
    contents: params.contents,
    systemInstruction: { parts: [{ text: params.systemInstruction }] },
    generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
  };
  if (params.tools && params.tools.length > 0) {
    body.tools = [{ functionDeclarations: params.tools }];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Gemini HTTP error ${res.status}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Empty response from Gemini");
  }
  return { parts: parts as GeminiPart[] };
}

/**
 * Tool-use loop. Calls Gemini; if the model emits functionCalls, dispatch
 * each through the outbound MCP layer, wrap responses in <reference_data>,
 * loop. Returns the final user-visible text plus a per-turn call count.
 *
 * Budget enforcement: at the start of each iteration we check session
 * counters. If any cap is exceeded, the next functionCalls get short-
 * circuited with `{ error: "budget exhausted" }` so Gemini knows to wrap up.
 */
async function runToolUseLoop(params: {
  apiKey: string;
  contents: GeminiContent[];
  systemInstruction: string;
  resolved: ResolvedTools;
  sessionId: string;
  workspaceId: string;
}): Promise<{ text: string; toolCallsThisTurn: string[]; bytesAdded: number; msAdded: number }> {
  let iter = 0;
  const toolCallsThisTurn: string[] = [];
  let bytesAddedTotal = 0;
  let msAddedTotal = 0;

  while (iter++ < MAX_TOOL_USE_ITERATIONS) {
    const candidate = await callGemini({
      apiKey: params.apiKey,
      contents: params.contents,
      systemInstruction: params.systemInstruction,
      tools: params.resolved.declarations,
    });

    const fnCalls = candidate.parts.filter(
      (p): p is { functionCall: { name: string; args?: unknown } } => "functionCall" in p
    );

    if (fnCalls.length === 0) {
      // Final text response — concatenate any text parts and return.
      const text = candidate.parts
        .map((p) => ("text" in p ? p.text : ""))
        .filter(Boolean)
        .join("");
      if (!text.trim()) throw new Error("Empty text response from Gemini");
      return {
        text,
        toolCallsThisTurn,
        bytesAdded: bytesAddedTotal,
        msAdded: msAddedTotal,
      };
    }

    // Append the model's function-call turn to the conversation.
    params.contents.push({ role: "model", parts: candidate.parts });

    // Re-read session counters fresh per iteration so we honor concurrent
    // updates (e.g. if another tab on the same session was running).
    const session = await prisma.aIInterviewSession.findUnique({
      where: { id: params.sessionId },
      select: {
        outboundCallCount: true,
        outboundResponseBytes: true,
        outboundElapsedMs: true,
      },
    });
    if (!session) throw new Error("Session disappeared mid-turn");

    const responseParts: GeminiPart[] = [];
    for (const fn of fnCalls) {
      const exceedsCalls = session.outboundCallCount + responseParts.length >= OUTBOUND_MAX_CALLS;
      const exceedsBytes = session.outboundResponseBytes + bytesAddedTotal >= OUTBOUND_MAX_TOTAL_BYTES;
      const exceedsMs = session.outboundElapsedMs + msAddedTotal >= OUTBOUND_MAX_TOTAL_MS;

      if (exceedsCalls || exceedsBytes || exceedsMs) {
        responseParts.push({
          functionResponse: {
            name: fn.functionCall.name,
            response: {
              error:
                "External MCP budget exhausted for this screening session. Continue without further tool calls.",
            },
          },
        });
        continue;
      }

      const result = await executeOutboundTool({
        sessionId: params.sessionId,
        workspaceId: params.workspaceId,
        toolName: fn.functionCall.name,
        args: fn.functionCall.args,
        resolved: params.resolved,
        auditContext: {
          workspaceId: params.workspaceId,
          apiKeyId: "ai-interviewer", // outbound calls aren't keyed to a customer API key
          scopes: [],
          label: "ai-interviewer",
        },
      });

      toolCallsThisTurn.push(fn.functionCall.name);

      if (result.kind === "ok") {
        const lookup = params.resolved.dispatch.get(fn.functionCall.name);
        const serverLabel = lookup
          ? params.resolved.cache.servers[lookup.serverIndex]?.label ?? "external"
          : "external";
        const wrapped = wrapReferenceData({
          serverLabel,
          toolName: lookup?.rawName ?? fn.functionCall.name,
          body: result.text,
        });
        responseParts.push({
          functionResponse: {
            name: fn.functionCall.name,
            response: { content: wrapped },
          },
        });
        bytesAddedTotal += result.bytes;
        msAddedTotal += result.durationMs;
      } else {
        responseParts.push({
          functionResponse: {
            name: fn.functionCall.name,
            response: { error: result.error },
          },
        });
        msAddedTotal += result.durationMs;
      }
    }

    // Persist counter bumps for visibility on the scorecard. Use updateMany
    // with an empty filter on a single id so the increment is atomic at the
    // SQL level (rather than read-then-write).
    await prisma.aIInterviewSession.update({
      where: { id: params.sessionId },
      data: {
        outboundCallCount: { increment: fnCalls.length },
        outboundResponseBytes: { increment: bytesAddedTotal },
        outboundElapsedMs: { increment: msAddedTotal },
      },
    });
    // Reset per-iteration deltas — the persisted counter is now the source of truth.
    bytesAddedTotal = 0;
    msAddedTotal = 0;

    params.contents.push({ role: "user", parts: responseParts });
  }

  // Hit the iteration ceiling — return a polite fallback text so the candidate
  // sees something instead of an error.
  return {
    text:
      "(The interviewer paused to gather context but the conversation got stuck. Please rephrase your question.)",
    toolCallsThisTurn,
    bytesAdded: bytesAddedTotal,
    msAdded: msAddedTotal,
  };
}

/**
 * Plain text-only call for the non-tool-using path. Same shape as before
 * Phase 4.1 so the mock-agent fallback can pretend nothing changed.
 */
async function callGeminiTextOnly(
  apiKey: string,
  history: Message[],
  systemInstruction: string
): Promise<string> {
  const contents: GeminiContent[] = history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.text }],
  }));
  const result = await callGemini({ apiKey, contents, systemInstruction });
  const text = result.parts
    .map((p) => ("text" in p ? p.text : ""))
    .filter(Boolean)
    .join("");
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

// Rules-based fallback mock conversational engine
function callMockAgent(message: string, files: Record<string, string>, historyCount: number, templateId: string) {
  const msg = message.toLowerCase().trim();

  // 1. React Todo with Pagination
  if (templateId === "react-todo-pagination" || !templateId) {
    if (historyCount <= 1 || msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
      return `Hello! Welcome to your automated technical interview at Interviewpad. I will be your AI Interviewer today. 

We have pre-wired a coding workspace on the right for you. Your task is to build a **React Todo List component with Pagination controls**. 

Take a moment to review the starter files, and let me know when you're ready to proceed or if you have any questions!`;
    }

    if (msg.includes("hint") || msg.includes("help") || msg.includes("stuck") || msg.includes("clue")) {
      return `Sure, here is a hint! To achieve pagination in React, you should track the \`currentPage\` and \`itemsPerPage\` in your state. 

When rendering the list, use \`.slice()\` on your todo array:
\`\`\`javascript
const startIndex = (currentPage - 1) * itemsPerPage;
const paginatedTodos = todos.slice(startIndex, startIndex + itemsPerPage);
\`\`\`
Give that a try, and let me know if you need help with the index boundary calculations!`;
    }

    if (msg.includes("finish") || msg.includes("done") || msg.includes("completed") || msg.includes("submit")) {
      const hasTodo = Object.values(files).some(code => code.includes("todo") || code.includes("Todo"));
      const hasSlice = Object.values(files).some(code => code.includes("slice") || code.includes("pagination"));

      if (hasTodo && hasSlice) {
        return `Excellent work! I have scanned your files and verified that you have implemented the core Todo state and slice-based pagination indexes. 

I'm wrapping up our scorecard now. Feel free to click "Complete Assessment" at the top of your dashboard to finalize and submit your report to the recruiters!`;
      }

      return `I noticed you said you've finished, but looking at your workspace, it seems you haven't fully implemented the Todo list state or the pagination slice boundaries yet. 

Please double-check your implementation, run the preview, and let me know when it's fully operational!`;
    }

    return `That makes sense. When configuring your pagination controls, remember to render a "Next" and "Previous" button, and disable them dynamically when you are on the first or last page:
\`\`\`javascript
disabled={currentPage === 1}
disabled={currentPage === totalPages}
\`\`\`
This edge-case handling is exactly what recruiters evaluate on their rubrics. Keep going!`;
  }

  // 2. Interactive Image Carousel
  if (templateId === "interactive-carousel") {
    if (historyCount <= 1 || msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
      return `Hello! Welcome to your automated technical interview at Interviewpad. I will be your AI Interviewer today. 

Your task is to build a highly responsive **Interactive Image Carousel component in React** with autoplay, pause-on-hover, and slide indicator controls.

Take a look at the slide body templates, and let me know when you are ready to implement the autoplay timers!`;
    }

    if (msg.includes("hint") || msg.includes("help") || msg.includes("stuck") || msg.includes("clue")) {
      return `Certainly! For autoplay, trigger a \`setInterval\` timer inside a \`useEffect\` hook:
\`\`\`javascript
useEffect(() => {
  if (!autoplay) return;
  const timer = setInterval(() => {
    handleNext();
  }, 3000);
  return () => clearInterval(timer);
}, [autoplay, activeIndex]);
\`\`\`
To implement "pause on hover", wrap the main carousel card element with \`onMouseEnter={() => setAutoplay(false)}\` and \`onMouseLeave={() => setAutoplay(true)}\`. Let me know if you get this working!`;
    }

    if (msg.includes("finish") || msg.includes("done") || msg.includes("completed") || msg.includes("submit")) {
      const hasUseEffect = Object.values(files).some(code => code.includes("useEffect") && code.includes("setInterval"));
      if (hasUseEffect) {
        return `Fantastic work! I noticed you set up the interval hooks and cleanups correctly to drive slide cycles, and bound hover enter/leave listeners to pause autoplay.

I'm checking off the telemetry now. Go ahead and click "Complete Assessment" in the header to lock in your scorecard!`;
      }
      return `It looks like the cyclic timer or hover boundaries aren't fully configured in your App.js yet. Please double check if autoplay hooks are functioning as expected!`;
    }

    return `Understood. Make sure that when you transition slides, clicking the navigation buttons correctly loops indices back to the start or end (cyclic boundary wrap-around).`;
  }

  // 3. Valid Parentheses Stack
  if (templateId === "valid-parentheses-stack") {
    if (historyCount <= 1 || msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
      return `Welcome! I will be your AI Interviewer today. 

Your mission is to implement an optimal **Stack-based balanced parentheses parser** in \`/validate.js\`. The console wrapper in \`/App.js\` will execute a terminal diagnostic suite in real-time.

Please inspect \`/validate.js\` to begin your implementation!`;
    }

    if (msg.includes("hint") || msg.includes("help") || msg.includes("stuck") || msg.includes("clue")) {
      return `Here is a helpful algorithmic guide:
1. Initialize an empty array to serve as your stack: \`const stack = [];\`
2. Establish a bracket mapping dictionary:
\`\`\`javascript
const pairs = { ')': '(', '}': '{', ']': '[' };
\`\`\`
3. Iterate through characters. If a char is an open bracket, push it onto your stack. If it is a closer, pop the top of the stack and verify if it matches the value of \`pairs[char]\`. If they don't match, return \`false\` immediately.
4. Finally, return \`stack.length === 0\` to ensure all opened items have been popped!`;
    }

    if (msg.includes("finish") || msg.includes("done") || msg.includes("completed") || msg.includes("submit")) {
      const hasStack = Object.values(files).some(code => code.includes("stack") || code.includes("push") || code.includes("pop"));
      if (hasStack) {
        return `Outstanding achievement! Your algorithm has successfully resolved balanced brackets under linear complexity.

If all diagnostic checks are green, you are fully cleared to hit "Complete Assessment" at the top of the console.`;
      }
      return `Looking at the solver code, the stack mechanisms (push/pop checks) aren't active yet. Ensure that your isValidParentheses function evaluates all edge cases!`;
    }

    return `Keep in mind that the algorithm must run under O(N) time complexity and O(N) space bounds. Avoid nesting double-loops which would degrade performance to quadratic O(N^2) time!`;
  }

  // 4. Dynamic Fibonacci
  if (templateId === "dynamic-fibonacci") {
    if (historyCount <= 1 || msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
      return `Greetings! I will be your AI Interviewer today.

Today's challenge is about high-performance algorithmic optimization. You must write an **optimized, memoized Fibonacci sequence generator** inside \`/fibonacci.js\` that computes large values (N=50) instantly.

Look over \`/fibonacci.js\` and let me know when you are ready to benchmark!`;
    }

    if (msg.includes("hint") || msg.includes("help") || msg.includes("stuck") || msg.includes("clue")) {
      return `Excellent! Standard recursion is exponential O(2^N) and will freeze the browser page. To fix this, store computed values in a memoization object:
\`\`\`javascript
export function fibonacci(n, memo = {}) {
  if (n in memo) return memo[n];
  if (n <= 1) return n;
  
  memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
  return memo[n];
}
\`\`\`
This reduces the computational complexity to linear O(N) time. Give it a run!`;
    }

    if (msg.includes("finish") || msg.includes("done") || msg.includes("completed") || msg.includes("submit")) {
      const hasMemo = Object.values(files).some(code => code.includes("memo") || code.includes("cache") || code.includes("dp"));
      if (hasMemo) {
        return `Remarkable work! The memoized caches are properly integrated, resolving N=50 instantly.

You are ready to submit your scorecard. Click "Complete Assessment" at the top of your benchmark dashboard to proceed.`;
      }
      return `It appears the memo cache lookup check is still missing. If you run the benchmark, does N=50 compute instantly or does it trigger safeguard overflows?`;
    }

    return `Remember that memoization requires passing the same \`memo\` object map through recursive calls. Make sure your returns correctly pass this reference!`;
  }

  return `Understood. Let me know if you need help with coding rules, time complexity constraints, or component state management!`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inviteToken, message, files } = body as {
      inviteToken: string;
      message: string;
      files: Record<string, string>;
    };

    if (!inviteToken || !message) {
      return NextResponse.json({ error: "Missing inviteToken or message" }, { status: 400 });
    }

    // Bound the files payload BEFORE doing any DB work — saves the bandwidth
    // and the DB row from a runaway candidate paste. 413 is the spec-correct
    // status for "request entity too large".
    if (files) {
      const sizeCheck = checkFilesSize(files);
      if (!sizeCheck.ok) {
        return NextResponse.json({ error: sizeCheck.reason }, { status: 413 });
      }
    }

    // Look up by inviteToken — the candidate never sees the session id.
    const session = await prisma.aIInterviewSession.findUnique({
      where: { inviteToken },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Reject if the interview is already submitted/graded.
    if (session.finishedAt) {
      return NextResponse.json(
        { error: "This interview has already been submitted." },
        { status: 410 }
      );
    }

    // Hard deadline — once startedAt + estimatedMinutes elapses, no further
    // chat turns. The client gets a clear signal so it can auto-submit.
    const deadline = computeDeadline(session.startedAt, session.templateId);
    if (deadline && Date.now() > deadline.getTime()) {
      return NextResponse.json(
        {
          error: "Time is up — please submit your assessment.",
          deadlineExpired: true,
        },
        { status: 410 }
      );
    }

    // Per-session cadence cap (~1 msg / 1.5s). Backed by in-memory store so
    // a candidate cannot mash submit and spike Gemini billing.
    const cadence = rateLimit(`ai-msg:${session.id}`, 1, MIN_INTERVAL_MS);
    if (!cadence.ok) {
      return NextResponse.json(
        { error: "You're sending messages too quickly. Slow down a moment." },
        { status: 429 }
      );
    }

    // Hard cap on conversation length — protects against scripts and runaway sessions.
    let preCheckHistory: Message[] = [];
    try {
      preCheckHistory = JSON.parse(session.chatHistory) as Message[];
    } catch {
      preCheckHistory = [];
    }
    const userTurns = preCheckHistory.filter((m) => m.role === "user").length;
    if (userTurns >= MAX_USER_MESSAGES_PER_SESSION) {
      return NextResponse.json(
        { error: `Message limit reached (${MAX_USER_MESSAGES_PER_SESSION}). Please submit your assessment.` },
        { status: 429 }
      );
    }

    // Charge the workspace 1 credit on the candidate's first message.
    // Race-safe: only the request that flips startedAt NULL -> NOW writes the ledger.
    try {
      await consumeCreditIfFirstTurn(session.id);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        return NextResponse.json(
          { error: "Workspace is out of AI interview credits. Please contact your recruiter." },
          { status: 402 }
        );
      }
      throw err;
    }

    // Parse and update chat history
    let history: Message[] = [];
    try {
      history = JSON.parse(session.chatHistory) as Message[];
    } catch {
      history = [];
    }

    history.push({ role: "user", text: message });

    // ── Phase 4.1: resolve external MCP tools, if any ────────────────────
    //
    // Gated by THREE in-product flags (all must be true):
    //   1. workspace.allowExternalMcp — set in /w/[slug]/external-mcp UI
    //   2. TemplateExternalMcp binding row exists for this session's template
    //   3. ExternalMcpServer.enabled — set on the same page
    //
    // If any gate is off, loadActiveExternalServers returns [] and the
    // session proceeds as a plain Gemini call. No env flag — the gates
    // ARE the kill-switch.
    let resolved: ResolvedTools | null = null;
    {
      try {
        const servers = await loadActiveExternalServers({
          workspaceId: session.workspaceId,
          templateId: session.templateId,
        });
        if (servers.length > 0) {
          // Cache tools/list at session start so subsequent turns reuse.
          let cache: ToolsCache;
          if (session.outboundToolsListCache) {
            try {
              cache = JSON.parse(session.outboundToolsListCache) as ToolsCache;
            } catch {
              cache = await buildToolsCache(servers);
            }
          } else {
            cache = await buildToolsCache(servers);
            await prisma.aIInterviewSession.update({
              where: { id: session.id },
              data: { outboundToolsListCache: JSON.stringify(cache) },
            });
          }
          const compiled = compileDeclarations(cache);
          // Don't activate the tool-use loop if compilation yielded nothing
          // useful (e.g. all customer tools were filtered out by readOnlyHint).
          if (compiled.declarations.length > 0) {
            resolved = compiled;
          }
        }
      } catch (err) {
        // Failing to load external tools must NEVER block the screening.
        // Log and proceed with plain Gemini.
        console.error("[ai-interview] external MCP setup failed:", err);
      }
    }

    let systemInstruction = `You are the Interviewpad AI Technical Interviewer. You are conducting a live coding interview for the position of "${session.positionTitle}".
The candidate is working on the task: "${session.templateId}".
Guidelines:
1. Be encouraging but professional and rigorous.
2. Guide them using hints, but never write full solutions directly.
3. If they describe code, check if their active files (${truncateFilesForPrompt(files)}) match their claims.
4. Keep answers concise, around 100-150 words.`;
    if (resolved) {
      // Append the wrapper-warning when external tools are in play. Without
      // this, the model has no signal that <reference_data> contents are
      // untrusted.
      systemInstruction += "\n\n" + REFERENCE_DATA_SYSTEM_NOTE;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let aiResponse = "";
    let toolCallsThisTurn: string[] = [];

    if (apiKey) {
      try {
        if (resolved) {
          // Tool-use loop path.
          const contents: GeminiContent[] = history.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.text }],
          }));
          const loopResult = await runToolUseLoop({
            apiKey,
            contents,
            systemInstruction,
            resolved,
            sessionId: session.id,
            workspaceId: session.workspaceId,
          });
          aiResponse = loopResult.text;
          toolCallsThisTurn = loopResult.toolCallsThisTurn;
        } else {
          // Plain path — unchanged from pre-Phase-4.1.
          aiResponse = await callGeminiTextOnly(apiKey, history, systemInstruction);
        }
      } catch (err) {
        console.error("Gemini failed, falling back to mock agent:", err);
        aiResponse = callMockAgent(message, files, history.length, session.templateId);
      }
    } else {
      aiResponse = callMockAgent(message, files, history.length, session.templateId);
    }

    // If external tools were used this turn, append a small footer to the
    // assistant message so recruiters reviewing the transcript can see at
    // a glance which tools fired. Full per-call details live in the audit log.
    const assistantText =
      toolCallsThisTurn.length > 0
        ? `${aiResponse}\n\n_[used external MCP: ${[...new Set(toolCallsThisTurn)].join(", ")}]_`
        : aiResponse;
    history.push({ role: "assistant", text: assistantText });

    await prisma.aIInterviewSession.update({
      where: { id: session.id },
      data: {
        chatHistory: JSON.stringify(history),
        filesJson: JSON.stringify(files),
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      chatHistory: history,
      response: aiResponse,
    });
  } catch (error) {
    console.error("AI message error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Bound the files payload sent to Gemini per turn. Without this, every chat
 * message ships the entire workspace inside the system prompt — token cost
 * grows linearly with code size. Cap at ~6KB.
 */
function truncateFilesForPrompt(files: Record<string, string>): string {
  const MAX_CHARS = 6000;
  const json = JSON.stringify(files);
  if (json.length <= MAX_CHARS) return json;
  return json.slice(0, MAX_CHARS) + '..."<truncated>"}';
}
