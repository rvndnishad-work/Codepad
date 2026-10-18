/**
 * AI ENGINEERING ULTRA — batch 09: streaming and SDKs (how LLM streaming works,
 * streaming to the UI with SSE, abort and resume, AI SDK 5 streamText vs
 * generateText vs generateObject, streaming chat to React with useChat, and
 * when to use batch APIs).
 * Every example was run by scripts/verify-variant-examples.ts (node, python);
 * quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `How does streaming work in LLM APIs and why does it matter for UX?`,
    difficulty: "medium",
    seoDescription: `What stream: true changes on the wire: SSE events, time to first token, partial tool JSON, usage, abort and proxy buffering, with a verified simulation.`,
    description: `**Question presented to candidate:**
"Most LLM APIs let you set \`stream: true\`. Explain what actually happens on the wire when you do, why product teams almost always want it for chat, and what it costs you in engineering effort."

**What a strong answer should cover:**
- The model generates one token at a time anyway; streaming forwards each token (or small group) as it is produced over a long-lived HTTP response using server-sent events, instead of holding everything until the end
- The UX win is perceived latency: time to first token (TTFT) replaces total generation time as the wait the user feels, while total time, token count and cost stay the same
- The provider event vocabulary: typed events such as Anthropic \`message_start\` / \`content_block_delta\` / \`message_delta\` / \`message_stop\`, or OpenAI Responses \`response.output_text.delta\` / \`response.completed\`, plus tool-call arguments arriving as partial JSON that only parses at the end
- The engineering cost: mid-stream errors after a 200 status, usage that arrives last (and may be missing if the stream is cut), cancellation that must reach the provider, and proxies or CDNs that buffer and silently turn a stream back into a blocking response
- When not to stream: output consumed by code rather than people, batch jobs, very short answers, and cases where every word must pass a safety check before anyone sees it

**Code / implementation expected:** Optional — reading a stream with an SDK, or parsing the SSE events and assembling text and tool input by hand.`,
    answer: `**Target Audience:** Engineers building a chat or assistant feature who want to know what \`stream: true\` really changes, and what it breaks.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (both examples below, identical output). Provider event names were checked in October 2026 against the Anthropic streaming docs (platform.claude.com, "Streaming messages") and the type definitions of the official \`openai\` npm package (v7.36.0).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You ask a friend a question by text message. Version one: they think for ten seconds, typing the whole reply, and you stare at "typing..." until a long paragraph lands at once. Version two: the first sentence arrives after under a second, the next one a moment later, and by the time they finish you have already read most of it.

Both replies took your friend the same ten seconds to write. Version two *feels* five times faster, because you stopped waiting the moment the first words appeared and started reading.

A large language model always writes like version two internally: it produces its answer one small piece at a time. **Streaming** is simply the decision to send you each piece as it is written instead of hiding them until the end. That one flag changes how fast your product feels more than almost any model or prompt change, and it also changes how your server, your proxies and your error handling have to work.

## 2. What Streaming Actually Is

An LLM generates text one **token** (a word piece, roughly four characters of English) at a time; each new token depends on all the previous ones (see [how an LLM generates text](/interview-question/what-is-a-large-language-model-and-how-does-it-generate-text)). Before the first token there is a fixed delay: the request waits in a queue, then the model reads your whole prompt in one pass. After that, tokens come out at a roughly steady rate.

Without streaming, the API server keeps every token until the last one exists, then sends one JSON response. With streaming, it keeps the HTTP response open and writes each token (or a few) as a small event as soon as it is produced.

📌 **Interview term: time to first token (TTFT)** — the time from sending the request to receiving the first output token. It covers network, queueing and **prefill** (the model reading the prompt). With streaming, it is the wait the user actually feels.

📌 **Interview term: inter-token latency** — the gap between consecutive output tokens during **decode** (the token-by-token generation phase). Its inverse is output speed in tokens per second; total time is roughly TTFT + (tokens − 1) × inter-token latency.

📌 **Interview term: server-sent events (SSE)** — a simple web standard for a server to push a stream of text events over one ordinary HTTP response with \`Content-Type: text/event-stream\`. Each event is a few \`field: value\` lines (\`event:\`, \`data:\`, \`id:\`) followed by a blank line. Every major LLM API uses it for streaming.

<svg class="iq-diagram" width="100%" viewBox="0 0 880 250" role="img" aria-label="Two timelines of the same request. Blocking shows nothing until the end. Streaming shows the first words after the time to first token and the rest arrive steadily.">
  <text class="d-text" x="20" y="70">blocking</text>
  <rect class="d-box-muted" x="140" y="45" width="560" height="44" rx="8"/>
  <text class="d-sub" x="420" y="72" text-anchor="middle">spinner while all tokens are generated</text>
  <rect class="d-box-accent" x="730" y="45" width="130" height="44" rx="8"/>
  <text class="d-text" x="795" y="72" text-anchor="middle">all text</text>
  <text class="d-text" x="20" y="170">streaming</text>
  <rect class="d-box-muted" x="140" y="145" width="110" height="44" rx="8"/>
  <text class="d-sub" x="195" y="172" text-anchor="middle">TTFT</text>
  <rect class="d-box-accent" x="280" y="145" width="580" height="44" rx="8"/>
  <text class="d-sub" x="570" y="172" text-anchor="middle">tokens appear and the user reads along</text>
  <path class="d-edge-dashed" d="M 860 105 L 860 135"/>
</svg>

Both rows end at the same moment. The only difference is when the first words become visible: at the end of the top row, versus after a short TTFT in the bottom row.

## 3. What Goes Over the Wire

Each provider defines its own event vocabulary on top of SSE. Two current ones:

**Anthropic Messages API** (\`"stream": true\`). Per the Anthropic streaming docs (October 2026), each stream is: one \`message_start\` (a message with empty content), then for every content block a \`content_block_start\`, one or more \`content_block_delta\`, and a \`content_block_stop\`; then one or more \`message_delta\` events (stop reason, usage); then \`message_stop\`. \`ping\` events can appear anywhere, and an \`error\` event (for example \`overloaded_error\`) can arrive mid-stream.

<svg class="iq-diagram" width="100%" viewBox="0 0 900 200" role="img" aria-label="Anthropic stream order: message start, then per block a start, deltas and stop, then message delta, then message stop">
  <defs>
    <marker id="ai09q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="92" text-anchor="middle">message_start</text>
  <text class="d-sub" x="95" y="114" text-anchor="middle">empty content</text>
  <rect class="d-box-accent" x="230" y="40" width="240" height="110" rx="10"/>
  <text class="d-text" x="350" y="74" text-anchor="middle">per content block</text>
  <text class="d-sub" x="350" y="100" text-anchor="middle">block start, many deltas</text>
  <text class="d-sub" x="350" y="124" text-anchor="middle">block stop</text>
  <rect class="d-box" x="530" y="60" width="160" height="70" rx="10"/>
  <text class="d-text" x="610" y="92" text-anchor="middle">message_delta</text>
  <text class="d-sub" x="610" y="114" text-anchor="middle">stop reason, usage</text>
  <rect class="d-box-muted" x="750" y="60" width="130" height="70" rx="10"/>
  <text class="d-text" x="815" y="100" text-anchor="middle">message_stop</text>
  <path class="d-edge" d="M 174 95 L 226 95" marker-end="url(#ai09q1-arrow)"/>
  <path class="d-edge" d="M 474 95 L 526 95" marker-end="url(#ai09q1-arrow)"/>
  <path class="d-edge" d="M 694 95 L 746 95" marker-end="url(#ai09q1-arrow)"/>
</svg>

A content block is a piece of the answer: a text block streams \`text_delta\` events; a tool-use block streams \`input_json_delta\` events whose \`partial_json\` strings only form valid JSON once the block stops (the docs say so explicitly, and example 2 below shows it). The docs also warn that the \`usage\` counts in \`message_delta\` are **cumulative**, so you replace the running total rather than add to it.

**OpenAI.** The Responses API streams typed semantic events; the \`openai\` npm package (v7.36.0) types include \`response.created\`, \`response.output_text.delta\` (with \`delta\`, \`item_id\`, \`output_index\`, \`content_index\` and a \`sequence_number\`), \`response.completed\`, \`response.failed\`, \`response.incomplete\` and \`error\`. The older Chat Completions API streams chunks whose text sits in \`choices[0].delta.content\`; its usage only arrives if you ask for it with \`stream_options: {"include_usage": true}\`, and the SDK type docs warn that if the stream is interrupted or cancelled you may never receive that final usage chunk.

| | Anthropic Messages | OpenAI Responses | OpenAI Chat Completions |
| :--- | :--- | :--- | :--- |
| Text arrives in | \`content_block_delta\` / \`text_delta\` | \`response.output_text.delta\` | \`choices[0].delta.content\` |
| Tool arguments | \`input_json_delta\` partial JSON | \`response.function_call_arguments.delta\` | \`delta.tool_calls[].function.arguments\` fragments |
| End of answer | \`message_delta\` (stop reason) then \`message_stop\` | \`response.completed\` | a chunk with \`finish_reason\`, then \`data: [DONE]\` (the SDK treats it as the end sentinel) |
| Usage | cumulative in \`message_delta\` | on the completed response | last chunk, only with \`include_usage\` |
| Errors mid-stream | \`error\` event | \`error\` / \`response.failed\` events | an error payload in the stream; the SDK throws \`APIError\` mid-iteration |

You rarely parse these by hand in production: the SDKs and frameworks such as the [Vercel AI SDK](/interview-question/ai-sdk-5-when-to-use-streamtext-vs-generatetext-vs-generateobject) do it. But you should know the shape, because every streaming bug lives in it.

## 4. Why It Matters for UX: the Numbers

Example 1 ("Blocking vs streaming on a fake clock") models a 300-token answer with a 700 ms TTFT and 30 ms per token. The core of it is one formula:

~~~js
const tokenAt = (i) => TTFT_MS + i * MS_PER_TOKEN;   // when output token i leaves the model
const lastTokenAt = tokenAt(ANSWER_TOKENS - 1);       // when a blocking response can be sent
~~~

Its output (quoted in full in the Verified section):

~~~text
delivery                            first text  complete    note
blocking (stream: false)            9670 ms     9670 ms     spinner the whole time
streaming, direct                   700 ms      9670 ms     first token shown at once
streaming via 4 KB buffering proxy  2590 ms     9670 ms     first flush carries 64 tokens
streaming via full-buffer proxy     9670 ms     9670 ms     same as blocking
~~~

Three things to say out loud in an interview:

1. **Streaming does not make generation faster.** Every row finishes at 9670 ms. It moves the first visible text from 9.7 s to 0.7 s, so only 7.2% of the wait is spent looking at nothing.
2. **The user reads while the model writes.** People read slower than a model generates, so for long answers the reader is never waiting after the first line.
3. **One middle box can undo it.** A proxy that buffers 4 KB before forwarding (nginx-style response buffering, some CDNs, compression middleware) delays the first text to 2.6 s and then delivers it in lumps; a proxy that buffers the whole response turns streaming back into blocking. This is the classic first-deploy surprise: it works on localhost and not behind the load balancer.

📌 **Interview term: perceived latency** — how long the product *feels* slow to the user, as opposed to measured total time. For streamed text it is dominated by TTFT and by smoothness (no long stalls between tokens).

Streaming also lets users **stop early**. In the same run, a user who presses Stop at 3 s has seen 77 tokens. If the abort reaches the provider, about 77 output tokens are generated and billed (a few more may already be in flight); if your server ignores the disconnect and keeps reading, all 300 are, so 74.3% of that answer is paid for and thrown away.

## 5. What Streaming Costs You in Engineering

**Mid-stream errors after a 200.** With a blocking call, a failure is an HTTP error status. With a stream, the 200 status and headers are already sent before the first token, so a later failure shows up as an \`error\` event or a connection that just ends. Your client needs a visible "the answer was cut off" state and a retry policy (see [resilient LLM calls](/interview-question/how-do-you-build-resilient-llm-calls-with-rate-limits-retries-and-fallbacks)).

**Partial structure.** Markdown arrives with unclosed code fences and half tables; tool arguments arrive as JSON fragments. Example 2 ("Reassembling a streamed answer from SSE events") feeds a canned Anthropic-shaped stream through a small parser. The key lines:

~~~js
} else {
  b.json += e.delta.partial_json;                          // accumulate the fragment
  const ok = parseJsonOrNull(b.json) !== null;             // only true at the very end
}
// at content_block_stop:
if (b.type === "tool_use") b.input = JSON.parse(b.json);   // parse once, then run the tool
~~~

~~~text
input_json_delta     #1 buffer "{\\"city\\": \\"Par" -> not valid JSON yet
input_json_delta     #1 buffer "{\\"city\\": \\"Paris\\", \\"unit\\"" -> not valid JSON yet
input_json_delta     #1 buffer "{\\"city\\": \\"Paris\\", \\"unit\\": \\"celsius\\"}" parses
content_block_stop   #1 tool input = {"city":"Paris","unit":"celsius"}
~~~

Never execute a tool on a fragment. Accumulate, parse at block stop, validate, then act (see [how function calling works](/interview-question/how-does-function-calling-tool-use-work-under-the-hood)). If you want a live preview of a half-built object, use a partial-JSON parser for display only.

**Usage and cost accounting.** Token counts arrive at the end. Anthropic sends cumulative counts in \`message_delta\` (the run replaces 1 with 42 rather than adding); OpenAI Chat Completions sends usage in a last chunk that you may never get if the stream is cut. Log what you received and mark the record as incomplete when the terminal event never came.

**Cancellation.** When the user stops or leaves, the abort has to travel browser → your server → provider. If your server keeps reading the provider stream after the browser is gone, you pay for the whole answer.

**Infrastructure.** Disable response buffering on every hop that supports it, avoid compression middleware that waits for full blocks, watch idle timeouts on load balancers (the provider \`ping\` events and your own heartbeats help), and on serverless platforms use a runtime mode that supports streamed responses. The UI side of all this (SSE parsing across chunk boundaries, abort and resume) is its own topic: see [streaming LLM responses to the UI](/interview-question/streaming-llm-responses-to-the-ui-sse-chunking-abort-and-resume).

## 6. What the SDK Calls Look Like

Not run here (they need an API key); shapes checked against the Anthropic streaming docs and the \`openai\` v7.36.0 type definitions in October 2026.

~~~ts
// Anthropic TypeScript SDK: helper that emits text as it arrives
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
await client.messages
  .stream({ model: "MODEL_ID", max_tokens: 1024, messages: [{ role: "user", content: "Hello" }] })
  .on("text", (text) => process.stdout.write(text));
~~~

~~~ts
// OpenAI Responses API: iterate the typed events yourself
import OpenAI from "openai";
const client = new OpenAI();
const stream = await client.responses.create({ model: "MODEL_ID", input: "Hello", stream: true });
for await (const event of stream) {
  if (event.type === "response.output_text.delta") process.stdout.write(event.delta);
  if (event.type === "response.completed") console.log("\\nusage:", event.response.usage);
}
~~~

## 7. Verified: Running the Code

Both examples ran under \`node a.js\` / \`python3.12 a.py\` (and \`b.js\` / \`b.py\`) with byte-identical output. The model is simulated: example 1 uses a fake clock with stated assumptions (700 ms TTFT, 30 ms per token, 4 characters per token, about 60 bytes of SSE framing per event); example 2 feeds a canned event stream whose event names and fields follow the Anthropic docs. Neither measures a real provider; they show the mechanism.

**Example 1: Blocking vs streaming on a fake clock**

~~~text
Answer: 300 tokens, TTFT 700 ms, 30 ms/token

delivery                            first text  complete    note
blocking (stream: false)            9670 ms     9670 ms     spinner the whole time
streaming, direct                   700 ms      9670 ms     first token shown at once
streaming via 4 KB buffering proxy  2590 ms     9670 ms     first flush carries 64 tokens
streaming via full-buffer proxy     9670 ms     9670 ms     same as blocking

Same total time in every row: streaming changes when text appears, not when it ends.
Share of the wait spent before first text (direct streaming): 7.2%

User presses Stop at 3000 ms:
  abort propagated to the provider -> 77 output tokens generated
  abort ignored (server keeps reading) -> 300 output tokens generated
  wasted by ignoring it: 223 tokens (74.3% of the answer)
~~~

**Example 2: Reassembling a streamed answer from SSE events**

~~~text
message_start        id=msg_demo
content_block_start  #0 text
ping                 (keep-alive, ignored)
text_delta           #0 screen now shows: "Checking"
text_delta           #0 screen now shows: "Checking the weather"
text_delta           #0 screen now shows: "Checking the weather for Paris."
content_block_stop   #0
content_block_start  #1 tool_use
input_json_delta     #1 buffer "" -> not valid JSON yet
input_json_delta     #1 buffer "{\\"city\\":" -> not valid JSON yet
input_json_delta     #1 buffer "{\\"city\\": \\"Par" -> not valid JSON yet
input_json_delta     #1 buffer "{\\"city\\": \\"Paris\\", \\"unit\\"" -> not valid JSON yet
input_json_delta     #1 buffer "{\\"city\\": \\"Paris\\", \\"unit\\": \\"celsius\\"}" parses
content_block_stop   #1 tool input = {"city":"Paris","unit":"celsius"}
message_delta        stop_reason=tool_use
message_stop

final text:   Checking the weather for Paris.
tool call:    get_weather {"city":"Paris","unit":"celsius"}
stop_reason:  tool_use  -> run the tool, then send its result back
usage:        input 25, output 42
~~~

Note the \`ping\` handled as a no-op, the text growing delta by delta, the tool input that is invalid JSON until the last fragment, and the output token count replaced (1 → 42) rather than summed.

## 8. When Not to Stream

| Situation | Stream? | Why |
| :--- | :--- | :--- |
| Chat, copilots, long explanations read by a person | Yes | TTFT is the felt latency |
| Output parsed by code (extraction, classification) | Usually no | Code needs the whole object anyway; see [reliable structured output](/interview-question/how-do-you-get-reliable-structured-json-output-from-an-llm) |
| Offline jobs, evals, backfills | No | Nobody is watching; consider [batch APIs](/interview-question/when-should-you-use-batch-apis-instead-of-real-time-llm-calls) |
| Very short answers (a label, a yes/no) | No | TTFT is most of the total; streaming adds plumbing for nothing |
| Every word must pass a safety check before display | Stream with care | Either buffer sentence by sentence through the check, or accept that text is shown before the full output is screened (see [guardrails](/interview-question/what-are-guardrails-and-how-do-you-implement-them-around-a-model)) |
| Agent steps with tools between them | Stream progress | Stream text and tool status so the user sees work happening, but execute tools only on complete input |

## Edge Cases Worth Knowing

- **Reasoning models** can spend a long time thinking before the first visible text. TTFT for the *answer* can be many seconds even with streaming; stream a "thinking" indicator or the provider-supplied thinking summary where available (Anthropic streams \`thinking_delta\` events for thinking blocks, per its docs).
- **Tool-argument pauses.** Anthropic notes that current models emit tool input one complete key and value at a time, so there can be pauses between tool-input events. Do not treat a pause as a dead connection too eagerly.
- **Server-side recovery.** If a stream breaks halfway, the Anthropic docs describe a continuation strategy (send the partial answer back and ask the model to continue; the exact method differs for Claude 4.6 and later models). OpenAI Responses run with \`background: true\` can be re-streamed from a \`starting_after\` sequence number. Both are provider features with their own limits; read the current docs before relying on them.
- **Side channels.** Token-sized events can leak information about content through packet sizes. The \`openai\` SDK types describe "stream obfuscation", random padding added to delta events by default, which you can turn off with \`include_obfuscation: false\` when you trust the network path.
- **Moderation lag.** Output filters that run on the full answer will catch problems only after the user has read them. Decide per product whether that is acceptable.

## Common Pitfalls

- **Testing only on localhost.** Buffering in nginx, a CDN, compression middleware or a serverless adapter turns your stream into a blocking response in production; the 4 KB proxy in the run delays first text from 700 ms to 2590 ms.
- **Not propagating abort.** The browser stops listening but your server keeps reading the provider stream; in the run that is 223 wasted output tokens per stopped answer.
- **Running a tool on partial arguments.** \`partial_json\` fragments are not JSON until the block stops; parse once, validate, then execute.
- **Adding cumulative usage.** Anthropic \`message_delta\` usage is a running total; summing deltas double-counts. And when the stream is cut, the final usage may never arrive at all.
- **No UI state for a truncated answer.** A stream that dies at token 150 looks like a finished short answer unless you check for the terminal event (\`message_stop\`, \`response.completed\`, a \`finish_reason\`).
- **Re-rendering the whole markdown tree on every token.** It janks the page on long answers; batch updates (see [the AI SDK React guide](/interview-question/vercel-ai-sdk-5-streamtext-how-do-you-stream-llm-chat-to-react)) and render incomplete markdown tolerantly.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Start with the mechanism:</strong> <span style="color:#f0e2c8;">The model generates one token at a time anyway. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stream: true</code> the API keeps the HTTP response open and pushes each token as a <strong style="color:#ffca28;">server-sent event</strong> instead of holding them all until the end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the UX metric:</strong> <span style="color:#f0e2c8;">The felt wait becomes <strong style="color:#ffca28;">time to first token</strong>, not total time. In my simulation a 300-token answer goes from 9.7 s of spinner to text after 0.7 s, while finishing at exactly the same moment and costing exactly the same.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Show you know the events:</strong> <span style="color:#f0e2c8;">Anthropic sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">message_start</code>, then per block <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">content_block_start</code>, deltas and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">content_block_stop</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">message_delta</code> with the stop reason and cumulative usage, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">message_stop</code>. OpenAI Responses sends typed events like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">response.output_text.delta</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">response.completed</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. List the engineering cost:</strong> <span style="color:#f0e2c8;">Errors can arrive after the 200, tool arguments are partial JSON until the block ends, usage comes last and can be missing if the stream is cut, aborts must reach the provider, and any buffering proxy silently turns the stream back into a blocking response.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Say when not to stream:</strong> <span style="color:#f0e2c8;">If code consumes the output, if it is a batch job, or if the answer is a single label, I do not stream. If every word must pass a safety check first, I stream sentence by sentence through the check.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does streaming reduce latency or cost?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Neither total latency nor cost. Same tokens, same end time. It reduces <strong style="color:#ffca28;">perceived</strong> latency, and it can reduce cost indirectly because users can stop early: in my run a Stop at 3 s saves 223 of 300 output tokens, but only if the abort propagates to the provider.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my stream work locally but arrive all at once in production?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Something between you and the browser is buffering: nginx response buffering, a CDN, compression middleware, or a serverless adapter that waits for the full body. A 4 KB buffer in my simulation pushed first text from 700 ms to 2.6 s. Turn buffering off per route (for nginx, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X-Accel-Buffering: no</code> response header, which the AI SDK sets) and test behind the real proxy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a tool call in a stream?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accumulate the argument fragments (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input_json_delta</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function_call_arguments.delta</code>) per call id, parse once when the block or item is done, validate against the tool schema, then execute. Never act on a fragment; a partial-JSON parser is fine for a live preview only.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get token usage when streaming?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the terminal events: Anthropic puts cumulative counts in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">message_delta</code>, OpenAI Responses on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">response.completed</code>, Chat Completions in a last chunk only with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stream_options.include_usage</code>. If the stream is cut you may not get it, so log the record as incomplete and estimate from the text you received.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes with reasoning models?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TTFT for the visible answer can be many seconds because the model thinks first. Stream a progress indicator or the thinking summary if the provider offers one, set user expectations, and keep timeouts long enough that a quiet thinking phase is not mistaken for a dead connection.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Streaming | Sending output tokens to the client as they are generated instead of after the last one |
| Time to first token (TTFT) | Delay from request to first output token: network, queueing and prefill |
| Prefill / decode | Reading the whole prompt in one pass / generating output one token at a time |
| Inter-token latency | Gap between consecutive output tokens; its inverse is tokens per second |
| Server-sent events (SSE) | Standard text format for pushing events over one HTTP response (\`event:\`, \`data:\`, \`id:\`, blank line) |
| Perceived latency | How slow the product feels, dominated by TTFT and smoothness for streamed text |

**Conclusion:** Streaming does not make a model faster; it changes when the user starts reading. The model produces tokens one at a time anyway, and SSE lets the server forward each one, so the felt wait drops from the full generation time to the time to first token (9.7 s to 0.7 s in the simulated run). The price is engineering: typed events to assemble, tool arguments that are invalid JSON until their block ends, usage that arrives last, errors that arrive after a 200, cancellation that must reach the provider, and proxies that buffer. Say both halves, the UX win and the plumbing it requires, and name the cases where you would not stream at all.`,
    examples: [
      {
        label: `Blocking vs streaming on a fake clock`,
        variants: [
          { tech: "node", code: `// Blocking vs streaming on a fake clock: when does the user first see text,
// what does a buffering proxy do to that, and what does cancellation save?
// All times are simulated milliseconds; nothing here calls a real model.

const TTFT_MS = 700;        // queueing + prefill before the first output token
const MS_PER_TOKEN = 30;    // decode speed: about 33 tokens per second
const ANSWER_TOKENS = 300;  // length of the full answer
const CHARS_PER_TOKEN = 4;  // rough English average
const SSE_OVERHEAD = 60;    // bytes of "data: {...}" framing around each delta

// Time at which output token i (0-based) leaves the model.
const tokenAt = (i) => TTFT_MS + i * MS_PER_TOKEN;
const lastTokenAt = tokenAt(ANSWER_TOKENS - 1);

// A proxy that holds bytes until its buffer is full (or the response ends).
function firstFlushThroughBuffer(bufferBytes) {
  let held = 0;
  for (let i = 0; i < ANSWER_TOKENS; i++) {
    held += CHARS_PER_TOKEN + SSE_OVERHEAD;
    if (held >= bufferBytes) return { at: tokenAt(i), tokens: i + 1 };
  }
  return { at: lastTokenAt, tokens: ANSWER_TOKENS };
}

const pad = (s, n) => String(s).padEnd(n);
const row = (name, first, full, note) =>
  console.log(pad(name, 36) + pad(first + " ms", 12) + pad(full + " ms", 12) + note);

console.log("Answer: " + ANSWER_TOKENS + " tokens, TTFT " + TTFT_MS + " ms, " + MS_PER_TOKEN + " ms/token");
console.log("");
console.log(pad("delivery", 36) + pad("first text", 12) + pad("complete", 12) + "note");
row("blocking (stream: false)", lastTokenAt, lastTokenAt, "spinner the whole time");
row("streaming, direct", tokenAt(0), lastTokenAt, "first token shown at once");
const f4 = firstFlushThroughBuffer(4096);
row("streaming via 4 KB buffering proxy", f4.at, lastTokenAt, "first flush carries " + f4.tokens + " tokens");
row("streaming via full-buffer proxy", lastTokenAt, lastTokenAt, "same as blocking");

console.log("");
console.log("Same total time in every row: streaming changes when text appears, not when it ends.");
console.log("Share of the wait spent before first text (direct streaming): " +
  (100 * tokenAt(0) / lastTokenAt).toFixed(1) + "%");

// The user reads the first part and presses Stop at t = 3000 ms.
const STOP_AT = 3000;
const generatedByStop = Math.floor((STOP_AT - TTFT_MS) / MS_PER_TOKEN) + 1;
console.log("");
console.log("User presses Stop at " + STOP_AT + " ms:");
console.log("  abort propagated to the provider -> " + generatedByStop + " output tokens generated");
console.log("  abort ignored (server keeps reading) -> " + ANSWER_TOKENS + " output tokens generated");
console.log("  wasted by ignoring it: " + (ANSWER_TOKENS - generatedByStop) + " tokens (" +
  (100 * (ANSWER_TOKENS - generatedByStop) / ANSWER_TOKENS).toFixed(1) + "% of the answer)");` },
          { tech: "python", code: `# Blocking vs streaming on a fake clock: when does the user first see text,
# what does a buffering proxy do to that, and what does cancellation save?
# All times are simulated milliseconds; nothing here calls a real model.

TTFT_MS = 700        # queueing + prefill before the first output token
MS_PER_TOKEN = 30    # decode speed: about 33 tokens per second
ANSWER_TOKENS = 300  # length of the full answer
CHARS_PER_TOKEN = 4  # rough English average
SSE_OVERHEAD = 60    # bytes of "data: {...}" framing around each delta


def token_at(i):
    """Time at which output token i (0-based) leaves the model."""
    return TTFT_MS + i * MS_PER_TOKEN


last_token_at = token_at(ANSWER_TOKENS - 1)


def first_flush_through_buffer(buffer_bytes):
    """A proxy that holds bytes until its buffer is full (or the response ends)."""
    held = 0
    for i in range(ANSWER_TOKENS):
        held += CHARS_PER_TOKEN + SSE_OVERHEAD
        if held >= buffer_bytes:
            return {"at": token_at(i), "tokens": i + 1}
    return {"at": last_token_at, "tokens": ANSWER_TOKENS}


def pad(s, n):
    return str(s).ljust(n)


def row(name, first, full, note):
    print(pad(name, 36) + pad(f"{first} ms", 12) + pad(f"{full} ms", 12) + note)


print(f"Answer: {ANSWER_TOKENS} tokens, TTFT {TTFT_MS} ms, {MS_PER_TOKEN} ms/token")
print("")
print(pad("delivery", 36) + pad("first text", 12) + pad("complete", 12) + "note")
row("blocking (stream: false)", last_token_at, last_token_at, "spinner the whole time")
row("streaming, direct", token_at(0), last_token_at, "first token shown at once")
f4 = first_flush_through_buffer(4096)
row("streaming via 4 KB buffering proxy", f4["at"], last_token_at, f"first flush carries {f4['tokens']} tokens")
row("streaming via full-buffer proxy", last_token_at, last_token_at, "same as blocking")

print("")
print("Same total time in every row: streaming changes when text appears, not when it ends.")
print(f"Share of the wait spent before first text (direct streaming): {100 * token_at(0) / last_token_at:.1f}%")

# The user reads the first part and presses Stop at t = 3000 ms.
STOP_AT = 3000
generated_by_stop = (STOP_AT - TTFT_MS) // MS_PER_TOKEN + 1
print("")
print(f"User presses Stop at {STOP_AT} ms:")
print(f"  abort propagated to the provider -> {generated_by_stop} output tokens generated")
print(f"  abort ignored (server keeps reading) -> {ANSWER_TOKENS} output tokens generated")
wasted = ANSWER_TOKENS - generated_by_stop
print(f"  wasted by ignoring it: {wasted} tokens ({100 * wasted / ANSWER_TOKENS:.1f}% of the answer)")` },
        ],
      },
      {
        label: `Reassembling a streamed answer from SSE events`,
        variants: [
          { tech: "node", code: `// Reassemble a streamed answer from server-sent events shaped like the
// Anthropic Messages API stream (event names and fields follow its docs).
// The stream is a canned string: no network, no API key.

const ev = (name, obj) => "event: " + name + "\\ndata: " + JSON.stringify(obj) + "\\n\\n";
const RAW =
  ev("message_start", { type: "message_start", message: { id: "msg_demo", role: "assistant", content: [], stop_reason: null, usage: { input_tokens: 25, output_tokens: 1 } } }) +
  ev("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }) +
  ev("ping", { type: "ping" }) +
  ev("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Checking" } }) +
  ev("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: " the weather" } }) +
  ev("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: " for Paris." } }) +
  ev("content_block_stop", { type: "content_block_stop", index: 0 }) +
  ev("content_block_start", { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "toolu_demo", name: "get_weather", input: {} } }) +
  ev("content_block_delta", { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: "" } }) +
  ev("content_block_delta", { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: "{\\"city\\":" } }) +
  ev("content_block_delta", { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: " \\"Par" } }) +
  ev("content_block_delta", { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: "is\\", \\"unit\\"" } }) +
  ev("content_block_delta", { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: ": \\"celsius\\"}" } }) +
  ev("content_block_stop", { type: "content_block_stop", index: 1 }) +
  ev("message_delta", { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 42 } }) +
  ev("message_stop", { type: "message_stop" });

function parseJsonOrNull(s) {
  try { return JSON.parse(s); } catch { return null; }
}

const blocks = [];   // index -> { type, text | json, input }
let stopReason = null;
let usage = {};

for (const frame of RAW.split("\\n\\n")) {
  if (!frame) continue;
  const data = frame.split("\\n").find((l) => l.startsWith("data: ")).slice(6);
  const e = JSON.parse(data);
  if (e.type === "ping") { console.log("ping                 (keep-alive, ignored)"); continue; }
  if (e.type === "message_start") { usage = { ...e.message.usage }; console.log("message_start        id=" + e.message.id); }
  if (e.type === "content_block_start") {
    const b = e.content_block;
    blocks[e.index] = b.type === "text" ? { type: "text", text: "" } : { type: "tool_use", name: b.name, json: "" };
    console.log("content_block_start  #" + e.index + " " + b.type);
  }
  if (e.type === "content_block_delta") {
    const b = blocks[e.index];
    if (e.delta.type === "text_delta") {
      b.text += e.delta.text;
      console.log("text_delta           #" + e.index + " screen now shows: " + JSON.stringify(b.text));
    } else {
      b.json += e.delta.partial_json;
      const ok = parseJsonOrNull(b.json) !== null;
      console.log("input_json_delta     #" + e.index + " buffer " + JSON.stringify(b.json) + (ok ? " parses" : " -> not valid JSON yet"));
    }
  }
  if (e.type === "content_block_stop") {
    const b = blocks[e.index];
    if (b.type === "tool_use") b.input = JSON.parse(b.json);
    console.log("content_block_stop   #" + e.index + (b.type === "tool_use" ? " tool input = " + JSON.stringify(b.input) : ""));
  }
  if (e.type === "message_delta") {
    stopReason = e.delta.stop_reason;
    usage.output_tokens = e.usage.output_tokens; // cumulative count, so replace, do not add
    console.log("message_delta        stop_reason=" + stopReason);
  }
  if (e.type === "message_stop") console.log("message_stop");
}

console.log("");
console.log("final text:   " + blocks[0].text);
console.log("tool call:    " + blocks[1].name + " " + JSON.stringify(blocks[1].input));
console.log("stop_reason:  " + stopReason + "  -> run the tool, then send its result back");
console.log("usage:        input " + usage.input_tokens + ", output " + usage.output_tokens);` },
          { tech: "python", code: `# Reassemble a streamed answer from server-sent events shaped like the
# Anthropic Messages API stream (event names and fields follow its docs).
# The stream is a canned string: no network, no API key.
import json


def dumps(obj):
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)


def ev(name, obj):
    return "event: " + name + "\\ndata: " + dumps(obj) + "\\n\\n"


RAW = (
    ev("message_start", {"type": "message_start", "message": {"id": "msg_demo", "role": "assistant", "content": [], "stop_reason": None, "usage": {"input_tokens": 25, "output_tokens": 1}}})
    + ev("content_block_start", {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}})
    + ev("ping", {"type": "ping"})
    + ev("content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Checking"}})
    + ev("content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": " the weather"}})
    + ev("content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": " for Paris."}})
    + ev("content_block_stop", {"type": "content_block_stop", "index": 0})
    + ev("content_block_start", {"type": "content_block_start", "index": 1, "content_block": {"type": "tool_use", "id": "toolu_demo", "name": "get_weather", "input": {}}})
    + ev("content_block_delta", {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": ""}})
    + ev("content_block_delta", {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": "{\\"city\\":"}})
    + ev("content_block_delta", {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": " \\"Par"}})
    + ev("content_block_delta", {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": "is\\", \\"unit\\""}})
    + ev("content_block_delta", {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": ": \\"celsius\\"}"}})
    + ev("content_block_stop", {"type": "content_block_stop", "index": 1})
    + ev("message_delta", {"type": "message_delta", "delta": {"stop_reason": "tool_use", "stop_sequence": None}, "usage": {"output_tokens": 42}})
    + ev("message_stop", {"type": "message_stop"})
)


def parse_json_or_none(s):
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        return None


blocks = {}  # index -> {type, text | json, input}
stop_reason = None
usage = {}

for frame in RAW.split("\\n\\n"):
    if not frame:
        continue
    data = next(l for l in frame.split("\\n") if l.startswith("data: "))[6:]
    e = json.loads(data)
    t = e["type"]
    if t == "ping":
        print("ping                 (keep-alive, ignored)")
        continue
    if t == "message_start":
        usage = dict(e["message"]["usage"])
        print("message_start        id=" + e["message"]["id"])
    if t == "content_block_start":
        b = e["content_block"]
        blocks[e["index"]] = {"type": "text", "text": ""} if b["type"] == "text" else {"type": "tool_use", "name": b["name"], "json": ""}
        print(f"content_block_start  #{e['index']} {b['type']}")
    if t == "content_block_delta":
        b = blocks[e["index"]]
        if e["delta"]["type"] == "text_delta":
            b["text"] += e["delta"]["text"]
            print(f"text_delta           #{e['index']} screen now shows: {dumps(b['text'])}")
        else:
            b["json"] += e["delta"]["partial_json"]
            ok = parse_json_or_none(b["json"]) is not None
            print(f"input_json_delta     #{e['index']} buffer {dumps(b['json'])}" + (" parses" if ok else " -> not valid JSON yet"))
    if t == "content_block_stop":
        b = blocks[e["index"]]
        if b["type"] == "tool_use":
            b["input"] = json.loads(b["json"])
        print(f"content_block_stop   #{e['index']}" + (" tool input = " + dumps(b["input"]) if b["type"] == "tool_use" else ""))
    if t == "message_delta":
        stop_reason = e["delta"]["stop_reason"]
        usage["output_tokens"] = e["usage"]["output_tokens"]  # cumulative count, so replace, do not add
        print("message_delta        stop_reason=" + stop_reason)
    if t == "message_stop":
        print("message_stop")

print("")
print("final text:   " + blocks[0]["text"])
print("tool call:    " + blocks[1]["name"] + " " + dumps(blocks[1]["input"]))
print("stop_reason:  " + stop_reason + "  -> run the tool, then send its result back")
print(f"usage:        input {usage['input_tokens']}, output {usage['output_tokens']}")` },
        ],
      },
    ],
  },
  {
    title: `Streaming LLM responses to the UI: SSE, chunking, abort, and resume?`,
    difficulty: "medium",
    seoDescription: `Getting streamed LLM tokens onto the screen: SSE over fetch, parsing split chunks and UTF-8, propagating abort, and resumable streams, verified by running.`,
    description: `**Question presented to candidate:**
"You own the chat UI for our assistant. Walk me through how the model's tokens get from the provider to the user's screen: the transport you would use, how you parse it safely, what happens when the user hits Stop, and what happens when their connection drops halfway through an answer."

**What a strong answer should cover:**
- The path is browser → your server → provider (keys never reach the browser); your server re-streams rather than accumulating, usually as SSE over a \`fetch\` POST read with a stream reader, since the browser \`EventSource\` API only does GET with no custom headers or body
- Three different "chunks": network reads, SSE events and tokens; a correct client keeps a carry-over buffer, dispatches events on the blank line, and decodes UTF-8 with a streaming decoder so a character split across reads is not corrupted
- Abort as a chain: \`AbortController\` in the browser, the request signal on the server, and the provider SDK's abort or signal option, so a Stop actually stops generation and billing
- Resume needs two things: event ids the client can echo back (\`Last-Event-ID\` or a sequence number) and generation decoupled from the request, writing to a store such as Redis that a reconnecting client can replay; client-side dedupe by id
- The tension between abort and resume: once generation outlives the connection, a client abort is just a disconnect, so Stop needs its own server endpoint; plus rendering concerns (batching updates, tolerant markdown) and persisting partial answers

**Clarifying questions expected:**
- Must an answer survive a page reload or a phone switching networks, or is "show an error and let them retry" acceptable?
- Where does this run: a long-lived Node server, serverless functions with time limits, behind which proxies or CDN?
- Are answers long (minutes of agent work) or short chat turns, and do we pay for abandoned generations?

**Code / implementation expected:** Yes — an SSE parser that handles split chunks, plus an abort path; a sketch of the resume endpoint is a plus.`,
    answer: `**Target Audience:** Frontend and full-stack engineers wiring a streamed LLM answer into a real UI that has to survive slow networks, Stop buttons and dropped connections.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (both examples below, identical output). AI SDK details were read from the published \`ai@5.0.277\` and \`@ai-sdk/react@2.0.280\` packages and the docs shipped inside \`ai@7.0.143\`; OpenAI SDK details from \`openai@7.36.0\` type definitions; all checked in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Imagine a friend dictating a long recipe to you over a bad phone line. Three things go wrong in real life. The line crackles and you hear half a word ("...bake at three hundred and fif—"), so you wait for the rest before writing it down. You decide halfway that you have heard enough and say "stop, thanks", and you expect them to actually stop talking, not keep going to an empty line. And the call drops after step five: when you call back, you want to say "I have everything up to step five, carry on from six", not hear the whole recipe again.

Streaming an LLM answer to a browser has exactly these three problems. **Chunking**: the network delivers bytes in arbitrary pieces, not neat words. **Abort**: Stop must travel all the way back to the model, or you keep paying for words nobody hears. **Resume**: after a drop, the client needs a way to say where it got to, and the server needs something to resume from. The sibling question [how streaming works in LLM APIs](/interview-question/how-does-streaming-work-in-llm-apis-and-why-does-it-matter-for-ux) covers why we stream at all; this one is about getting it to the screen correctly.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must an answer survive a page reload or a network switch? | Decides whether you need resumable generation (a store plus a job) or just "show an error, offer retry" |
| Where does the server run: long-lived Node, serverless, edge? | Serverless time limits and buffering adapters decide whether generation can outlive the request |
| What sits in front: nginx, a CDN, a corporate proxy? | Any buffering hop turns the stream into one late lump |
| How long are answers: chat turns or minutes-long agent runs? | Long runs make resume and progress events essential |
| Do abandoned generations cost real money at our volume? | Decides how hard you push abort through to the provider |
| One tab or many tabs per conversation? | Several viewers of one stream need a shared, replayable log |

## 3. The Path: Browser → Your Server → Provider

The browser never calls the model provider directly: that would expose your API key and skip your auth, rate limits, logging and guardrails. So there are two streaming hops, and your server is a relay that must **re-stream**, forwarding each event as it arrives, not collect the answer and send it at the end.

<svg class="iq-diagram" width="100%" viewBox="0 0 900 210" role="img" aria-label="Browser sends a POST to your server, which calls the provider with streaming on. Tokens flow back as events. Abort flows in the opposite direction from browser to server to provider.">
  <defs>
    <marker id="ai09q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="70" width="180" height="90" rx="10"/>
  <text class="d-text" x="110" y="108" text-anchor="middle">browser</text>
  <text class="d-sub" x="110" y="132" text-anchor="middle">fetch plus reader</text>
  <rect class="d-box-accent" x="360" y="70" width="180" height="90" rx="10"/>
  <text class="d-text" x="450" y="108" text-anchor="middle">your server</text>
  <text class="d-sub" x="450" y="132" text-anchor="middle">auth, relay, log</text>
  <rect class="d-box-muted" x="700" y="70" width="180" height="90" rx="10"/>
  <text class="d-text" x="790" y="108" text-anchor="middle">provider</text>
  <text class="d-sub" x="790" y="132" text-anchor="middle">stream true</text>
  <path class="d-edge-accent" d="M 696 95 L 544 95" marker-end="url(#ai09q2-arrow)"/>
  <path class="d-edge-accent" d="M 356 95 L 204 95" marker-end="url(#ai09q2-arrow)"/>
  <text class="d-sub" x="620" y="80" text-anchor="middle">events</text>
  <text class="d-sub" x="280" y="80" text-anchor="middle">SSE</text>
  <path class="d-edge-dashed" d="M 204 140 L 356 140" marker-end="url(#ai09q2-arrow)"/>
  <path class="d-edge-dashed" d="M 544 140 L 696 140" marker-end="url(#ai09q2-arrow)"/>
  <text class="d-sub" x="280" y="172" text-anchor="middle">abort</text>
  <text class="d-sub" x="620" y="172" text-anchor="middle">abort</text>
</svg>

Solid arrows carry tokens from right to left; dashed arrows carry the abort from left to right. Both hops have to work, or the feature is broken in a way that is invisible in a demo.

### Choosing the transport

📌 **Interview term: SSE (server-sent events)** — a standard text format, \`Content-Type: text/event-stream\`, where each event is \`field: value\` lines (\`id:\`, \`event:\`, \`data:\`) ended by a blank line; lines starting with \`:\` are comments, often used as heartbeats.

| Transport | Request shape | Abort | Resume support | Typical use |
| :--- | :--- | :--- | :--- | :--- |
| \`EventSource\` (browser API) | GET only; the constructor takes a URL and a \`withCredentials\` flag, so no body and no custom headers | \`close()\` | Built in: auto-reconnect sends the last \`id:\` back as the \`Last-Event-ID\` header; the server must replay | Simple notification feeds |
| \`fetch\` POST + \`response.body\` reader, SSE format | Any method, JSON body, auth headers | \`AbortController\` | You implement it (event ids, a reconnect request) | LLM chat: what the AI SDK \`useChat\` default transport does |
| WebSocket | Long-lived two-way socket | Close or send a message | You implement it | Voice, collaborative editing, many messages both ways |

For chat, \`fetch\` + SSE framing is the common choice: the request needs a body (the conversation) and an auth header, which \`EventSource\` cannot send. The AI SDK v5 default transport does exactly this, POSTing to \`/api/chat\` and, for resume, issuing a GET to \`/api/chat/{chatId}/stream\` (both read from the \`ai@5.0.277\` source). For the server side in Node and Next.js, see [SSE in Node.js](/interview-question/how-do-you-implement-server-sent-events-sse-in-node-js) and [streaming from a Next.js route handler](/interview-question/how-do-you-stream-responses-and-server-sent-events-from-a-route-handler).

## 4. Chunking: Three Different Things Called a Chunk

📌 **Interview term: framing** — how a byte stream is cut into messages. In SSE, a message ends at a blank line (\`\\n\\n\`), and nothing else.

There are three layers, and they never line up:

1. **Network reads** — whatever bytes TCP, TLS and proxies happen to hand you: 7 bytes, 40 bytes, 16 KB. A read can end mid-line, mid-JSON, or in the middle of a multi-byte character.
2. **SSE events** — complete \`data: ...\` messages, ended by a blank line.
3. **Tokens or deltas** — the text inside each event, as the model produced it.

Example 1 ("SSE parsing across arbitrary network reads") encodes six delta events containing \`é\`, \`€\`, \`☕\` and \`🙂\`, delivers them in 40-byte reads, and parses them two ways. The naive parser decodes each read on its own and parses whatever lines it sees; the correct one keeps one streaming decoder and a carry-over buffer:

~~~js
for (const c of chunks) {
  buf += dec.decode(c, { stream: true });   // keeps half a character for the next read
  let at;
  while ((at = buf.indexOf("\\n\\n")) !== -1) {  // dispatch only complete events
    dispatch(buf.slice(0, at));
    buf = buf.slice(at + 2);
  }
}
~~~

~~~text
naive per-chunk parser
  events parsed:   3 of 6 (2 fragments failed JSON.parse)
  text:            "Caf ☕ enjoy 🙂"

buffered parser with streaming UTF-8 decoder
  events parsed:   6 of 6
  text:            "Café au lait costs €4 ☕ enjoy 🙂"
~~~

The naive parser silently dropped half the answer, with no error a user would see. The run also zooms in on one emoji split two bytes plus two bytes across reads: decoding each half separately produces \`U+FFFD U+FFFD U+FFFD\` (three replacement characters, the "�" you see in broken UIs), while the streaming decoder produces the single correct \`U+1F642\`. In Python the equivalent is \`codecs.getincrementaldecoder("utf-8")\`; in the browser, \`TextDecoder\` with \`{ stream: true }\` or a \`TextDecoderStream\`.

Two more chunking concerns sit on top:

- **Render chunking.** Applying every delta to React state re-renders the message on every token. Batch updates (requestAnimationFrame or a throttle; the AI SDK \`useChat\` hook has an \`experimental_throttle\` option in v5) and render markdown with a parser that tolerates unclosed fences and tables.
- **Visual smoothness.** Providers sometimes send bursts. The AI SDK has a server-side \`smoothStream\` transform (v5 options: \`delayInMs\`, default 10 ms, and \`chunking\` of \`"word"\`, \`"line"\` or a custom pattern) that re-chunks text so it appears at a steady pace.

## 5. Abort: Making Stop Actually Stop

📌 **Interview term: cancellation propagation** — passing a cancel signal through every hop (browser → server → provider) so the work, and the billing, stops at the source.

Each hop has its own tool:

~~~ts
// Browser — not run here
const controller = new AbortController();
const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ messages }), signal: controller.signal });
stopButton.onclick = () => controller.abort();   // also call it on unmount and on a new prompt
~~~

~~~ts
// app/api/chat/route.ts (Next.js route handler) — not run here
import OpenAI from "openai";
const client = new OpenAI();

export async function POST(req: Request) {
  const { input } = await req.json();
  // Pass the incoming request signal to the provider call (openai SDK RequestOptions.signal).
  const upstream = await client.responses.create({ model: "MODEL_ID", input, stream: true }, { signal: req.signal });
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      let id = 0;
      for await (const ev of upstream) {
        if (ev.type === "response.output_text.delta")
          controller.enqueue(enc.encode("id: " + ++id + "\\ndata: " + JSON.stringify({ delta: ev.delta }) + "\\n\\n"));
      }
      controller.enqueue(enc.encode("data: [DONE]\\n\\n"));
      controller.close();
    },
    cancel() { upstream.controller.abort(); },     // the client went away: stop reading upstream
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" } });
}
~~~

Whether \`req.signal\` fires on a client disconnect depends on your runtime and hosting platform, so test it: log in the \`cancel()\` callback and on the upstream abort, close the tab mid-answer, and confirm generation stops. With the AI SDK, the equivalent is \`streamText({ ..., abortSignal: req.signal })\` and the client's \`stop()\` from \`useChat\`.

What happens to the partial answer? Save it, marked as stopped, so the conversation history matches what the user saw. The AI SDK \`toUIMessageStreamResponse({ onFinish })\` callback receives an \`isAborted\` flag in v5 for exactly this.

## 6. Resume: Surviving a Dropped Connection

There are two separate ingredients, and you need both.

**Ingredient 1: ids the client can echo.** Give every event an increasing id. After a drop, the client says "I have up to N": \`EventSource\` does this automatically with the \`Last-Event-ID\` header; with fetch you send it yourself (a header or query parameter). The client also drops any event whose id it already has, so a replay that overlaps is harmless.

📌 **Interview term: Last-Event-ID** — the request header an SSE client sends on reconnect, carrying the \`id:\` of the last event it received, so the server can replay only what was missed.

**Ingredient 2: something to replay from.** If generation lives inside the HTTP request ("tied"), a dropped connection kills it and there is nothing to resume. To resume, generation must run independently of the connection and append events to a store (a Redis list or stream, a database table) that any later request can read: replay what is stored, then follow the live tail.

📌 **Interview term: resumable stream** — a stream whose producer runs independently of any one client connection and writes to a durable, replayable log, so clients can disconnect and reconnect without losing or duplicating output.

<svg class="iq-diagram" width="100%" viewBox="0 0 900 260" role="img" aria-label="Resumable design. A generation job writes events to a log store. The first connection reads events one to five and drops. The reconnect replays from the log and then follows the live tail.">
  <defs>
    <marker id="ai09q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="90" width="170" height="80" rx="10"/>
  <text class="d-text" x="105" y="124" text-anchor="middle">generation job</text>
  <text class="d-sub" x="105" y="148" text-anchor="middle">calls the model</text>
  <rect class="d-box-accent" x="290" y="90" width="200" height="80" rx="10"/>
  <text class="d-text" x="390" y="124" text-anchor="middle">event log</text>
  <text class="d-sub" x="390" y="148" text-anchor="middle">Redis, ids 1 to N</text>
  <rect class="d-box" x="640" y="20" width="240" height="80" rx="10"/>
  <text class="d-text" x="760" y="54" text-anchor="middle">first connection</text>
  <text class="d-sub" x="760" y="78" text-anchor="middle">got ids 1 to 5, dropped</text>
  <rect class="d-box" x="640" y="160" width="240" height="80" rx="10"/>
  <text class="d-text" x="760" y="194" text-anchor="middle">reconnect</text>
  <text class="d-sub" x="760" y="218" text-anchor="middle">replay, then live tail</text>
  <path class="d-edge" d="M 194 130 L 286 130" marker-end="url(#ai09q2-arrow2)"/>
  <path class="d-edge-dashed" d="M 494 115 L 636 65" marker-end="url(#ai09q2-arrow2)"/>
  <path class="d-edge" d="M 494 145 L 636 195" marker-end="url(#ai09q2-arrow2)"/>
</svg>

The job keeps writing while nobody is connected. That is the whole trick, and it creates the next problem.

**The abort-versus-resume tension.** Once generation outlives the connection, a closed connection no longer means "stop": it might be a phone entering a tunnel. So a client abort becomes just a disconnect, and the Stop button needs its own explicit server call (for example \`POST /api/chat/{id}/stop\`) that cancels the job. The AI SDK docs (v7 docs, "Chatbot resume streams") say this directly: in a resumable setup, \`useChat\`'s \`stop()\` is a disconnect signal, not a request to stop generation, and the model request can continue unless you add a stop endpoint.

Example 2 ("Abort and resume with a replayable event log") runs both designs on a fake clock, one token per tick, for a 12-token answer:

~~~text
Case 1: network drops after tick 5, client is back at tick 8
  tied, user re-sends the prompt            billed 17  shown 12/12 dupes 0
  resumable, replay + live tail             billed 12  shown 12/12 dupes 5

Case 2: user presses Stop after tick 4
  tied, abort propagated                    billed 4   shown 4/12  dupes 0
  resumable, client abort only              billed 12  shown 4/12  dupes 0
  resumable, plus a stop endpoint           billed 4   shown 4/12  dupes 0
~~~

Read it as a trade-off. The tied design handles Stop for free but pays twice (17 tokens) and shows a *different* answer after a drop, because a re-sent prompt is a new sample. The resumable design survives the drop at the original cost, with 5 duplicate events harmlessly dropped by id, but without a stop endpoint it wastes 8 of 12 tokens on every Stop.

### How the AI SDK implements resume (v5)

Read from the \`ai@5.0.277\` and \`@ai-sdk/react@2.0.280\` sources and the AI SDK resume guide:

- On the client, \`useChat({ resume: true })\` calls the transport's \`reconnectToStream\`, which by default sends \`GET {api}/{chatId}/stream\`; a \`204 No Content\` reply means there is nothing to resume.
- On the server, \`toUIMessageStreamResponse({ consumeSseStream })\` hands you a copy of the outgoing SSE stream (the SDK \`tee()\`s it), which you pass to the \`resumable-stream\` package to store in Redis under a stream id saved on the chat (\`activeStreamId\` in the guide).
- The GET handler looks up \`activeStreamId\` and returns \`resumeExistingStream(id)\`, or 204 if it is null; the finish callback clears it.

### Provider-level resume

Separately from your own log, some providers can continue an interrupted generation. The Anthropic streaming docs describe recovering by sending the partial response back and asking the model to continue (the exact method differs for Claude 4.6 and later models). OpenAI Responses created with \`background: true\` can be retrieved with \`stream: true\` and \`starting_after\` a sequence number (\`openai@7.36.0\` types). Your own log is still simpler for UI resume, because it replays exactly what was already shown.

## 7. Verified: Running the Code

Both examples ran under \`node\` and \`python3.12\` with byte-identical output. Example 1 uses fixed 40-byte reads to stand for an unpredictable network; example 2 uses an in-process array as the event log and a fake clock, standing in for Redis and real time. They leave out real sockets, proxies, Redis failure modes and concurrency between several jobs.

**Example 1: SSE parsing across arbitrary network reads**

~~~text
body: 209 bytes, 6 delta events, delivered in 6 chunks of 40 bytes

naive per-chunk parser
  events parsed:   3 of 6 (2 fragments failed JSON.parse)
  text:            "Caf ☕ enjoy 🙂"
  correct:         false

buffered parser with streaming UTF-8 decoder
  events parsed:   6 of 6
  text:            "Café au lait costs €4 ☕ enjoy 🙂"
  correct:         true
  last event id:   6 (send as Last-Event-ID to resume)
  saw [DONE]:      true, bytes left in buffer: 0

one emoji split across two reads
  decoded per chunk:    U+FFFD U+FFFD U+FFFD
  streaming decoder:    U+1F642
~~~

**Example 2: Abort and resume with a replayable event log**

~~~text
Answer is 12 tokens. Columns: output tokens billed, tokens on screen, duplicates dropped.

Case 1: network drops after tick 5, client is back at tick 8
  tied, user re-sends the prompt            billed 17  shown 12/12 dupes 0
  client reconnects with Last-Event-ID: 5; log holds 8 events
  resumable, replay + live tail             billed 12  shown 12/12 dupes 5
  text: Streams need ids so a client can resume after a network drop.

Case 2: user presses Stop after tick 4
  tied, abort propagated                    billed 4   shown 4/12  dupes 0
  resumable, client abort only              billed 12  shown 4/12  dupes 0
  resumable, plus a stop endpoint           billed 4   shown 4/12  dupes 0
~~~

## Edge Cases Worth Knowing

- **The user message must be idempotent too.** If the POST is retried after a drop, give the user message a client-generated id so the server does not append it twice.
- **Persist on finish, even if the client left.** By default the AI SDK \`streamText\` applies backpressure (it only generates as the stream is read), so if the client disconnects the generation stops; the AI SDK persistence guide recommends calling \`result.consumeStream()\` (no await) so the answer finishes and \`onFinish\` can save it. Choose deliberately: that is the opposite of saving cost on abandonment.
- **Heartbeats.** Idle timeouts on load balancers can close a quiet connection during a long tool call or thinking phase. Send SSE comment lines (\`: keep-alive\`) or ping events periodically.
- **Serverless limits.** A resumable job must run somewhere that outlives the request: a queue worker, a background function, or a platform feature for work after the response (the AI SDK guide uses Next.js \`after\` as \`waitUntil\`).
- **Multiple tabs.** With a shared log, two tabs can follow one generation; without one, the second tab sees nothing until the answer is saved.
- **Error text.** By default the AI SDK replaces server error details sent to the client with "An error occurred." (\`onError\` default in \`toUIMessageStream\`, read from \`ai@5.0.277\`), which avoids leaking internals; log the real error server-side.

## Common Pitfalls

- **Parsing each network read on its own.** In the run that loses 3 of 6 events and turns an emoji into three replacement characters. Buffer until the blank line and use a streaming UTF-8 decoder.
- **Using \`EventSource\` for chat.** It cannot send the conversation body or an auth header; use fetch with a stream reader and SSE framing.
- **Stopping only in the browser.** The server keeps reading the provider stream and you pay for the full answer; wire \`req.signal\` (or the stream \`cancel()\` callback) to the provider call.
- **Adding resume without a stop endpoint.** Every Stop becomes a disconnect and generation runs on; 8 of 12 tokens wasted per Stop in the run.
- **Event ids without a replayable store.** \`Last-Event-ID\` arrives, but the generation died with the old connection, so there is nothing to replay from.
- **Retrying by re-sending the prompt and calling it resume.** It costs a second generation and shows a different answer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Draw the path:</strong> <span style="color:#f0e2c8;">Browser to my server to the provider, never browser to provider, because of keys, auth and logging. My server <strong style="color:#ffca28;">re-streams</strong> each event as it arrives, as SSE framing over a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> POST, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EventSource</code> cannot send a body or an auth header.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Handle chunking:</strong> <span style="color:#f0e2c8;">Network reads are not events. I keep a carry-over buffer, dispatch only on the blank line, and decode with a <strong style="color:#ffca28;">streaming UTF-8 decoder</strong>. In my run a naive per-read parser lost 3 of 6 events and turned an emoji into three replacement characters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Propagate abort:</strong> <span style="color:#f0e2c8;">Stop is a chain: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> in the browser, the request signal or stream <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cancel()</code> on the server, the SDK <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code> on the provider call. Otherwise the user stops reading and I still pay for every token.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Design resume:</strong> <span style="color:#f0e2c8;">Resume needs event ids the client echoes back, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Last-Event-ID</code>, and a generation <strong style="color:#ffca28;">decoupled from the request</strong> that writes to a replayable log such as Redis. The client dedupes by id, so an overlapping replay is harmless.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the trade-off:</strong> <span style="color:#f0e2c8;">Once generation outlives the connection, a client abort is only a disconnect, so Stop needs its own endpoint. In my simulation resume saved a 17-token re-generation, but without a stop endpoint it wasted 8 of 12 tokens per Stop.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use EventSource?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is GET only and its constructor takes a URL plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withCredentials</code>, so I cannot send the conversation as a body or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Authorization</code> header. It does give free reconnect with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Last-Event-ID</code>, which is why I keep SSE framing and event ids even when I read the stream with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is re-sending the prompt after a drop good enough?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Often yes for short chat turns, and it is much simpler. But it costs a second generation (17 tokens instead of 12 in my run), it shows a <em style="color:#d8d8d8;">different</em> answer because it is a new sample, and it loses any tool side effects already performed. For long agent runs I would build real resume.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the AI SDK do resume?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In v5, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useChat({ resume: true })</code> reconnects with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GET /api/chat/{chatId}/stream</code>; a 204 means nothing to resume. On the server, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toUIMessageStreamResponse({ consumeSseStream })</code> hands me a copy of the SSE stream, which I store with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resumable-stream</code> package in Redis, saving an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">activeStreamId</code> on the chat.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you save when the user presses Stop?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The partial answer, flagged as stopped, so history matches what the user saw and the next turn has the right context. The AI SDK <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onFinish</code> callback gets an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isAborted</code> flag for this. I also log the partial usage.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep rendering smooth?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Batch state updates instead of re-rendering per token, with a throttle or an animation-frame queue (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimental_throttle</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useChat</code>), render markdown with a parser that tolerates unclosed blocks, and optionally re-chunk on the server with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">smoothStream</code> so bursts appear at a steady pace.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| SSE (server-sent events) | Text event format over one HTTP response: \`id:\`, \`event:\`, \`data:\` lines, blank line ends an event |
| Framing | How a byte stream is cut into messages; for SSE, at the blank line |
| Streaming decoder | A UTF-8 decoder that keeps an incomplete multi-byte character until the next read |
| Cancellation propagation | Passing an abort through browser, server and provider so work and billing stop |
| Last-Event-ID | Header an SSE client sends on reconnect with the last event id it received |
| Resumable stream | Producer decoupled from the connection, writing to a replayable log clients can rejoin |

**Conclusion:** Getting a streamed answer onto the screen correctly is three problems. Chunking: network reads are not events, so buffer until the blank line and decode UTF-8 with a streaming decoder, or you silently lose text (3 of 6 events in the run). Abort: Stop has to travel from an \`AbortController\` in the browser through the request signal to the provider, or you pay for answers nobody reads. Resume: you need event ids the client can echo and a generation that writes to a replayable log instead of living inside the request, and once you have that, Stop needs its own endpoint. Say which design you would pick for the product's requirements, and why.`,
    examples: [
      {
        label: `SSE parsing across arbitrary network reads`,
        variants: [
          { tech: "node", code: `// SSE over a real network arrives in arbitrary byte chunks: a chunk can end in
// the middle of a line, a JSON object, or a multi-byte UTF-8 character.
// Compare a naive per-chunk parser with a buffered, streaming-decoder parser.

const deltas = ["Caf", "é au lait ", "costs ", "€4", " ☕ ", "enjoy 🙂"];
let body = "";
deltas.forEach((d, i) => { body += "id: " + (i + 1) + "\\ndata: " + JSON.stringify({ delta: d }) + "\\n\\n"; });
body += "data: [DONE]\\n\\n";
const bytes = new TextEncoder().encode(body);

// Simulated network: fixed 40-byte reads (real reads vary; any split must work).
const CHUNK = 40;
const chunks = [];
for (let i = 0; i < bytes.length; i += CHUNK) chunks.push(bytes.slice(i, i + CHUNK));
console.log("body: " + bytes.length + " bytes, " + deltas.length + " delta events, delivered in " + chunks.length + " chunks of " + CHUNK + " bytes");

// 1) Naive: decode each chunk on its own and parse whatever lines it contains.
function naive() {
  let text = "", parsed = 0, broken = 0;
  for (const c of chunks) {
    const s = new TextDecoder().decode(c);            // no stream: true
    for (const line of s.split("\\n")) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try { text += JSON.parse(line.slice(6)).delta; parsed++; } catch { broken++; }
    }
  }
  return { text, parsed, broken };
}

// 2) Correct: one streaming decoder, a carry-over buffer, dispatch on blank line.
function buffered() {
  const dec = new TextDecoder();
  let buf = "", text = "", parsed = 0, lastId = null, done = false;
  const dispatch = (frame) => {
    let data = "";
    for (const line of frame.split("\\n")) {
      if (line.startsWith("id: ")) lastId = line.slice(4);
      if (line.startsWith("data: ")) data += line.slice(6);
    }
    if (data === "[DONE]") { done = true; return; }
    if (data) { text += JSON.parse(data).delta; parsed++; }
  };
  for (const c of chunks) {
    buf += dec.decode(c, { stream: true });           // keeps half a character for later
    let at;
    while ((at = buf.indexOf("\\n\\n")) !== -1) { dispatch(buf.slice(0, at)); buf = buf.slice(at + 2); }
  }
  buf += dec.decode();
  return { text, parsed, lastId, done, leftover: buf.length };
}

const expected = deltas.join("");
const a = naive();
console.log("");
console.log("naive per-chunk parser");
console.log("  events parsed:   " + a.parsed + " of " + deltas.length + " (" + a.broken + " fragments failed JSON.parse)");
console.log("  text:            " + JSON.stringify(a.text));
console.log("  correct:         " + (a.text === expected));

const b = buffered();
console.log("");
console.log("buffered parser with streaming UTF-8 decoder");
console.log("  events parsed:   " + b.parsed + " of " + deltas.length);
console.log("  text:            " + JSON.stringify(b.text));
console.log("  correct:         " + (b.text === expected));
console.log("  last event id:   " + b.lastId + " (send as Last-Event-ID to resume)");
console.log("  saw [DONE]:      " + b.done + ", bytes left in buffer: " + b.leftover);

// Zoom in on one character: the 4-byte emoji split 2 + 2 across two reads.
const emoji = new TextEncoder().encode("🙂");
const halves = [emoji.slice(0, 2), emoji.slice(2)];
const hex = (s) => [...s].map((ch) => "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" ");
const perChunk = halves.map((h) => new TextDecoder().decode(h)).join("");
const sd = new TextDecoder();
const streamed = halves.map((h) => sd.decode(h, { stream: true })).join("") + sd.decode();
console.log("");
console.log("one emoji split across two reads");
console.log("  decoded per chunk:    " + hex(perChunk));
console.log("  streaming decoder:    " + hex(streamed));` },
          { tech: "python", code: `# SSE over a real network arrives in arbitrary byte chunks: a chunk can end in
# the middle of a line, a JSON object, or a multi-byte UTF-8 character.
# Compare a naive per-chunk parser with a buffered, streaming-decoder parser.
import codecs
import json


def dumps(obj):
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)


deltas = ["Caf", "é au lait ", "costs ", "€4", " ☕ ", "enjoy 🙂"]
body = ""
for i, d in enumerate(deltas):
    body += f"id: {i + 1}\\ndata: {dumps({'delta': d})}\\n\\n"
body += "data: [DONE]\\n\\n"
data_bytes = body.encode("utf-8")

# Simulated network: fixed 40-byte reads (real reads vary; any split must work).
CHUNK = 40
chunks = [data_bytes[i:i + CHUNK] for i in range(0, len(data_bytes), CHUNK)]
print(f"body: {len(data_bytes)} bytes, {len(deltas)} delta events, delivered in {len(chunks)} chunks of {CHUNK} bytes")


def naive():
    """Decode each chunk on its own and parse whatever lines it contains."""
    text, parsed, broken = "", 0, 0
    for c in chunks:
        s = c.decode("utf-8", errors="replace")  # no incremental state
        for line in s.split("\\n"):
            if not line.startswith("data: ") or line == "data: [DONE]":
                continue
            try:
                text += json.loads(line[6:])["delta"]
                parsed += 1
            except json.JSONDecodeError:
                broken += 1
    return {"text": text, "parsed": parsed, "broken": broken}


def buffered():
    """One streaming decoder, a carry-over buffer, dispatch on blank line."""
    dec = codecs.getincrementaldecoder("utf-8")()
    state = {"buf": "", "text": "", "parsed": 0, "last_id": None, "done": False}

    def dispatch(frame):
        data = ""
        for line in frame.split("\\n"):
            if line.startswith("id: "):
                state["last_id"] = line[4:]
            if line.startswith("data: "):
                data += line[6:]
        if data == "[DONE]":
            state["done"] = True
            return
        if data:
            state["text"] += json.loads(data)["delta"]
            state["parsed"] += 1

    for c in chunks:
        state["buf"] += dec.decode(c)  # keeps half a character for later
        while (at := state["buf"].find("\\n\\n")) != -1:
            dispatch(state["buf"][:at])
            state["buf"] = state["buf"][at + 2:]
    state["buf"] += dec.decode(b"", final=True)
    return state


expected = "".join(deltas)
a = naive()
print("")
print("naive per-chunk parser")
print(f"  events parsed:   {a['parsed']} of {len(deltas)} ({a['broken']} fragments failed JSON.parse)")
print(f"  text:            {dumps(a['text'])}")
print(f"  correct:         {str(a['text'] == expected).lower()}")

b = buffered()
print("")
print("buffered parser with streaming UTF-8 decoder")
print(f"  events parsed:   {b['parsed']} of {len(deltas)}")
print(f"  text:            {dumps(b['text'])}")
print(f"  correct:         {str(b['text'] == expected).lower()}")
print(f"  last event id:   {b['last_id']} (send as Last-Event-ID to resume)")
print(f"  saw [DONE]:      {str(b['done']).lower()}, bytes left in buffer: {len(b['buf'])}")

# Zoom in on one character: the 4-byte emoji split 2 + 2 across two reads.
emoji = "🙂".encode("utf-8")
halves = [emoji[:2], emoji[2:]]


def hexcp(s):
    return " ".join(f"U+{ord(ch):04X}" for ch in s)


per_chunk = "".join(h.decode("utf-8", errors="replace") for h in halves)
sd = codecs.getincrementaldecoder("utf-8")()
streamed = "".join(sd.decode(h) for h in halves) + sd.decode(b"", final=True)
print("")
print("one emoji split across two reads")
print(f"  decoded per chunk:    {hexcp(per_chunk)}")
print(f"  streaming decoder:    {hexcp(streamed)}")` },
        ],
      },
      {
        label: `Abort and resume with a replayable event log`,
        variants: [
          { tech: "node", code: `// Disconnects, Stop buttons and resume, on a fake clock (one token per tick).
// "Tied" = generation lives inside the HTTP request (request abort aborts it).
// "Resumable" = generation runs as a job that appends events to a log (in
// production: Redis via a package such as resumable-stream); clients read it.

const ANSWER = "Streams need ids so a client can resume after a network drop.".split(" ");
const N = ANSWER.length;

function makeJob() {
  return { log: [], tokens: 0, cancelled: false,
    step() { if (this.cancelled || this.log.length === N) return;
      this.tokens++; this.log.push({ id: this.log.length + 1, delta: ANSWER[this.log.length] }); } };
}

function makeClient() {
  return { lastId: 0, text: [], dupes: 0,
    receive(ev) { if (ev.id <= this.lastId) { this.dupes++; return; } // idempotent by id
      this.lastId = ev.id; this.text.push(ev.delta); } };
}

function report(name, job, client, extraTokens = 0) {
  const billed = job.tokens + extraTokens;
  console.log(name.padEnd(44) + ("billed " + billed).padEnd(11) +
    ("shown " + client.text.length + "/" + N).padEnd(12) + "dupes " + client.dupes);
}

console.log("Answer is " + N + " tokens. Columns: output tokens billed, tokens on screen, duplicates dropped.");
console.log("");
console.log("Case 1: network drops after tick 5, client is back at tick 8");

{ // Tied: the drop aborts generation; the only recovery is to ask again.
  const first = makeJob(), c = makeClient();
  for (let t = 1; t <= 5; t++) { first.step(); c.receive(first.log[first.log.length - 1]); }
  const retry = makeJob(), c2 = makeClient();
  while (retry.log.length < N) { retry.step(); c2.receive(retry.log[retry.log.length - 1]); }
  report("  tied, user re-sends the prompt", retry, c2, first.tokens);
}
{ // Resumable: the job keeps writing while the client is away.
  const job = makeJob(), c = makeClient();
  for (let t = 1; t <= 8; t++) { job.step(); if (t <= 5) c.receive(job.log[job.log.length - 1]); }
  console.log("  client reconnects with Last-Event-ID: " + c.lastId + "; log holds " + job.log.length + " events");
  for (const ev of job.log) c.receive(ev);          // store replays from the start
  while (job.log.length < N) { job.step(); c.receive(job.log[job.log.length - 1]); }
  report("  resumable, replay + live tail", job, c);
  console.log("  text: " + c.text.join(" "));
}

console.log("");
console.log("Case 2: user presses Stop after tick 4");
{
  const job = makeJob(), c = makeClient();
  for (let t = 1; t <= 4; t++) { job.step(); c.receive(job.log[job.log.length - 1]); }
  job.cancelled = true;                             // request abort reaches the provider
  for (let t = 5; t <= N; t++) job.step();
  report("  tied, abort propagated", job, c);
}
{
  const job = makeJob(), c = makeClient();
  for (let t = 1; t <= 4; t++) { job.step(); c.receive(job.log[job.log.length - 1]); }
  for (let t = 5; t <= N; t++) job.step();          // client abort = just a disconnect
  report("  resumable, client abort only", job, c);
}
{
  const job = makeJob(), c = makeClient();
  for (let t = 1; t <= 4; t++) { job.step(); c.receive(job.log[job.log.length - 1]); }
  job.cancelled = true;                             // explicit POST /stop cancels the job
  for (let t = 5; t <= N; t++) job.step();
  report("  resumable, plus a stop endpoint", job, c);
}` },
          { tech: "python", code: `# Disconnects, Stop buttons and resume, on a fake clock (one token per tick).
# "Tied" = generation lives inside the HTTP request (request abort aborts it).
# "Resumable" = generation runs as a job that appends events to a log (in
# production: Redis via a package such as resumable-stream); clients read it.

ANSWER = "Streams need ids so a client can resume after a network drop.".split(" ")
N = len(ANSWER)


class Job:
    def __init__(self):
        self.log, self.tokens, self.cancelled = [], 0, False

    def step(self):
        if self.cancelled or len(self.log) == N:
            return
        self.tokens += 1
        self.log.append({"id": len(self.log) + 1, "delta": ANSWER[len(self.log)]})


class Client:
    def __init__(self):
        self.last_id, self.text, self.dupes = 0, [], 0

    def receive(self, ev):
        if ev["id"] <= self.last_id:  # idempotent by id
            self.dupes += 1
            return
        self.last_id = ev["id"]
        self.text.append(ev["delta"])


def report(name, job, client, extra_tokens=0):
    billed = job.tokens + extra_tokens
    print(name.ljust(44) + f"billed {billed}".ljust(11) + f"shown {len(client.text)}/{N}".ljust(12) + f"dupes {client.dupes}")


print(f"Answer is {N} tokens. Columns: output tokens billed, tokens on screen, duplicates dropped.")
print("")
print("Case 1: network drops after tick 5, client is back at tick 8")

# Tied: the drop aborts generation; the only recovery is to ask again.
first, c = Job(), Client()
for t in range(1, 6):
    first.step()
    c.receive(first.log[-1])
retry, c2 = Job(), Client()
while len(retry.log) < N:
    retry.step()
    c2.receive(retry.log[-1])
report("  tied, user re-sends the prompt", retry, c2, first.tokens)

# Resumable: the job keeps writing while the client is away.
job, c = Job(), Client()
for t in range(1, 9):
    job.step()
    if t <= 5:
        c.receive(job.log[-1])
print(f"  client reconnects with Last-Event-ID: {c.last_id}; log holds {len(job.log)} events")
for ev in list(job.log):  # store replays from the start
    c.receive(ev)
while len(job.log) < N:
    job.step()
    c.receive(job.log[-1])
report("  resumable, replay + live tail", job, c)
print("  text: " + " ".join(c.text))

print("")
print("Case 2: user presses Stop after tick 4")


def run_stop(name, cancel):
    job, c = Job(), Client()
    for t in range(1, 5):
        job.step()
        c.receive(job.log[-1])
    if cancel:
        job.cancelled = True
    for t in range(5, N + 1):
        job.step()
    report(name, job, c)


run_stop("  tied, abort propagated", True)               # request abort reaches the provider
run_stop("  resumable, client abort only", False)        # client abort = just a disconnect
run_stop("  resumable, plus a stop endpoint", True)      # explicit POST /stop cancels the job` },
        ],
      },
    ],
  },
  {
    title: `AI SDK 5: when to use streamText vs generateText vs generateObject?`,
    difficulty: "easy",
    seoDescription: `AI SDK 5 generateText, streamText and generateObject compared: what each returns, when to use it, the stepCountIs(1) trap, and what v6 and v7 changed.`,
    description: `**Question presented to candidate:**
"In the Vercel AI SDK 5 you have \`generateText\`, \`streamText\` and \`generateObject\`. For each one, tell me what it returns, when you would reach for it, and one mistake people make with it."

**What a strong answer should cover:**
- \`generateText\` awaits the whole result (\`text\`, \`toolCalls\`, \`finishReason\`, \`usage\`, \`steps\`): right for server jobs, evals, agents and anything no person watches token by token
- \`streamText\` returns immediately with streams (\`textStream\`, \`fullStream\`) and promises that resolve at the end, plus helpers such as \`toUIMessageStreamResponse()\` for \`useChat\`; errors become part of the stream instead of being thrown, so you add \`onError\`
- \`generateObject\` takes a schema (Zod or JSON Schema) and returns a validated \`object\`, throwing \`NoObjectGeneratedError\` (with the raw text) when the output does not fit; \`streamObject\` streams partial objects
- Shared behaviour: the same \`model\` / \`prompt\` / \`messages\` options across providers, \`abortSignal\`, and multi-step tool use controlled by \`stopWhen\` (default \`stepCountIs(1)\` in v5, so a tool call ends the run unless you raise it)
- Version awareness: AI SDK 6 deprecated \`generateObject\` / \`streamObject\` in favour of \`generateText\` / \`streamText\` with \`output: Output.object(...)\`, and AI SDK 7 is the current major release (October 2026)

**Code / implementation expected:** Optional — one call of each, or a short decision rule with the return shapes.`,
    answer: `**Target Audience:** TypeScript developers starting with the Vercel AI SDK who want a clear rule for which core function to call.
**Difficulty:** Easy
**Verified with:** Node 22.22.0 and Python 3.12.3 for the simulation below (identical output). AI SDK facts were read in October 2026 from the published packages on npm: \`ai@5.0.277\` (latest 5.x) type definitions and source, and the migration guides shipped inside \`ai@7.0.143\`; release dates are from the npm registry.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You can ask a colleague for help in three ways. You can **send an email** and wait for the complete reply: fine when you are not sitting there watching. You can **call them** and listen as they think out loud: best when you are waiting and want to start understanding straight away. Or you can **hand them a form** with labelled boxes: the answer comes back in exactly the shape your filing system needs, or the form is returned as "could not fill this in".

The AI SDK's three core functions are those three ways. \`generateText\` is the email, \`streamText\` is the phone call, \`generateObject\` is the form. Picking the wrong one is a common, cheap-to-avoid mistake: streaming into a background job that nobody watches, or blocking a chat UI on a ten-second answer, or regex-parsing JSON out of free text when a schema-checked function exists.

📌 **Interview term: AI SDK** — Vercel's open-source TypeScript toolkit for calling language models through one API across providers. The core package is \`ai\`; providers come as separate packages such as \`@ai-sdk/openai\` and \`@ai-sdk/anthropic\`; UI hooks such as \`useChat\` live in \`@ai-sdk/react\`.

**Which version?** According to the npm registry, \`ai@5.0.0\` was published on 31 July 2025, \`6.0.0\` on 22 December 2025 and \`7.0.0\` on 25 June 2026; in October 2026 \`latest\` is 7.0.143 and 5.x is still maintained under the \`ai-v5\` tag. This page answers for v5, as the question asks, and Section 6 says what changed since.

## 2. The Three Functions

All three take the same core options: \`model\`, \`system\`, then \`prompt\` or \`messages\`, plus \`maxRetries\`, \`abortSignal\`, \`headers\` and \`providerOptions\` (from the \`ai@5.0.277\` signatures). \`generateText\` and \`streamText\` also take \`tools\` and \`stopWhen\`.

📌 **Interview term: generateText** — awaits the complete generation. The result has \`text\`, \`toolCalls\`, \`toolResults\`, \`finishReason\`, \`usage\` (last step), \`totalUsage\` (all steps), \`steps\` and \`response\`.

📌 **Interview term: streamText** — returns *immediately* (it is not awaited) with \`textStream\` (text deltas), \`fullStream\` (every typed part: text, reasoning, tool input, tool calls, step boundaries, errors), promises such as \`text\` and \`usage\` that resolve at the end, and response helpers such as \`toUIMessageStreamResponse()\` for \`useChat\`.

📌 **Interview term: generateObject** — takes a \`schema\` (Zod, Valibot-style standard schema or JSON Schema) and returns a validated, typed \`object\`. If the model output cannot be parsed or fails the schema, it throws \`NoObjectGeneratedError\`, which carries the raw \`text\`, \`usage\` and \`finishReason\`. Its streaming sibling \`streamObject\` exposes \`partialObjectStream\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 900 230" role="img" aria-label="Decision: is a person watching the output appear? Yes leads to streamText. No leads to a second question: must code consume a fixed shape? Yes leads to generateObject, no leads to generateText.">
  <defs>
    <marker id="ai09q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="110" text-anchor="middle">person watching</text>
  <text class="d-sub" x="120" y="132" text-anchor="middle">as it appears?</text>
  <rect class="d-box-accent" x="320" y="10" width="190" height="60" rx="10"/>
  <text class="d-text" x="415" y="46" text-anchor="middle">streamText</text>
  <rect class="d-box-muted" x="320" y="150" width="200" height="70" rx="10"/>
  <text class="d-text" x="420" y="180" text-anchor="middle">code needs a</text>
  <text class="d-sub" x="420" y="202" text-anchor="middle">fixed shape?</text>
  <rect class="d-box-accent" x="640" y="100" width="220" height="50" rx="10"/>
  <text class="d-text" x="750" y="131" text-anchor="middle">generateObject</text>
  <rect class="d-box" x="640" y="175" width="220" height="50" rx="10"/>
  <text class="d-text" x="750" y="206" text-anchor="middle">generateText</text>
  <path class="d-edge" d="M 224 100 L 316 45" marker-end="url(#ai09q3-arrow)"/>
  <path class="d-edge" d="M 224 130 L 316 180" marker-end="url(#ai09q3-arrow)"/>
  <path class="d-edge" d="M 524 175 L 636 128" marker-end="url(#ai09q3-arrow)"/>
  <path class="d-edge" d="M 524 195 L 636 200" marker-end="url(#ai09q3-arrow)"/>
  <text class="d-sub" x="255" y="62" text-anchor="middle">yes</text>
  <text class="d-sub" x="255" y="172" text-anchor="middle">no</text>
  <text class="d-sub" x="580" y="140" text-anchor="middle">yes</text>
  <text class="d-sub" x="580" y="215" text-anchor="middle">no</text>
</svg>

Two questions settle almost every case: is a person watching the output appear, and does code need a fixed shape? Streaming structured output for a person (a form filling in live) is the fourth corner: \`streamObject\`.

| | \`generateText\` | \`streamText\` | \`generateObject\` |
| :--- | :--- | :--- | :--- |
| Returns | Promise of the full result | Result object at once; streams and end-of-run promises on it | Promise of \`{ object, usage, finishReason, ... }\` |
| Output | Free text (+ tool calls) | Free text deltas (+ tool parts) | One object, array or enum value matching the schema |
| Tools and multi-step | Yes, \`tools\` + \`stopWhen\` | Yes, \`tools\` + \`stopWhen\` | No tools |
| Errors | Thrown | Put into the stream; \`onError\` (default: \`console.error\`) | Thrown, including \`NoObjectGeneratedError\` |
| Typical use | Server jobs, evals, agents, summaries stored for later | Chat UIs, copilots, anything a person reads live | Extraction, classification, routing decisions |
| Streaming sibling | — | — | \`streamObject\` (\`partialObjectStream\`) |

## 3. What the Calls Look Like

Not run here (they need provider keys); signatures checked against the \`ai@5.0.277\` type definitions.

~~~ts
import { generateText, streamText, generateObject, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// 1. Whole answer, awaited: a nightly summary job
const { text, usage } = await generateText({
  model: openai("MODEL_ID"),
  system: "Summarise support tickets in two sentences.",
  prompt: ticketThread,
});

// 2. Streamed: the chat route handler (see the useChat page for the client)
const result = streamText({ model: openai("MODEL_ID"), messages, abortSignal: req.signal });
return result.toUIMessageStreamResponse();

// 3. Typed object: route a ticket
const { object } = await generateObject({
  model: openai("MODEL_ID"),
  schema: z.object({ category: z.enum(["billing", "bug", "other"]), priority: z.enum(["low", "high"]) }),
  prompt: "Classify: " + ticketText,
});

// Tools: raise the step limit, or the run stops right after the first tool call
const answer = await generateText({
  model: openai("MODEL_ID"),
  tools: { lookupOrder: tool({ description: "Find an order by id", inputSchema: z.object({ id: z.string() }), execute: async ({ id }) => db.order(id) }) },
  stopWhen: stepCountIs(5),
  prompt: "Where is order 42?",
});
~~~

The full React wiring for option 2 is its own topic: [streaming chat to React with streamText and useChat](/interview-question/vercel-ai-sdk-5-streamtext-how-do-you-stream-llm-chat-to-react).

## 4. Behaviour Worth Knowing, Shown by a Simulation

The example "The three call shapes on a fake clock" re-enacts the three return shapes around a stub model (500 ms to first token, 25 ms per token). It is not the real \`ai\` package, which needs a provider; it shows the behaviour the shapes imply, using what the v5 types and source say.

**Same answer, different first-text time.** \`generateText\` resolves at 700 ms with all 9 tokens; \`streamText\` shows "Refunds" at 500 ms and finishes at the same 700 ms. Streaming changes when text appears, not when it ends (see [how streaming works](/interview-question/how-does-streaming-work-in-llm-apis-and-why-does-it-matter-for-ux)).

**generateObject either returns a valid object or throws.** The stub's second reply uses a priority outside the enum:

~~~text
3) generateObject: a validated object, or an error you must handle
   ticket_ok: object = {"category":"billing","priority":"high"}
   ticket_bad: NoObjectGeneratedError (priority must be one of low|high, got "urgent!!")
     raw text kept for logging: {"category":"billing","priority":"urgent!!"}
~~~

In the real SDK, catch it with \`NoObjectGeneratedError.isInstance(error)\` and log \`error.text\`; \`experimental_repairText\` lets you attempt a fix before giving up. For how providers constrain output to a schema in the first place, see [reliable structured JSON output](/interview-question/how-do-you-get-reliable-structured-json-output-from-an-llm) and [validating and repairing output](/interview-question/how-do-you-validate-and-repair-structured-llm-output-at-runtime).

**The v5 default stops after one step.** In \`ai@5.0.277\`, both \`generateText\` and \`streamText\` default to \`stopWhen = stepCountIs(1)\` (read from the source). A step is one model call; if the model calls a tool in step 1, the run ends there, with the tool result but no final text:

~~~text
4) tools with generateText or streamText
   stopWhen: stepCountIs(1) -> steps 1, finishReason tool-calls, text ""
   stopWhen: stepCountIs(5) -> steps 2, finishReason stop, text "Order 42 shipped on Monday."
~~~

📌 **Interview term: step** — one model call inside a multi-step run. \`stopWhen\` is checked after a step that produced tool results; \`stepCountIs(n)\` caps the number of steps, and \`hasToolCall(name)\` stops when a particular tool is called. See [the agent loop](/interview-question/what-is-an-ai-agent-and-how-does-the-agent-loop-work).

## 5. Verified: Running the Code

\`node a.js\` and \`python3.12 a.py\` printed byte-identical output. The simulation stands in for the SDK and the model: canned replies, a fake clock, and a ten-line enum check in place of Zod. It leaves out real providers, retries, token-level streaming of tool input and the SDK's actual error classes.

~~~text
1) generateText: nothing until the whole answer exists
   resolved at 700 ms with 9 tokens: Refunds are allowed within 30 days with a receipt.

2) streamText: same answer, consumed as it is produced
   t=500 ms screen: Refunds
   t=600 ms screen: Refunds are allowed within 30
   first text at 500 ms, finished at 700 ms

3) generateObject: a validated object, or an error you must handle
   ticket_ok: object = {"category":"billing","priority":"high"}
   ticket_bad: NoObjectGeneratedError (priority must be one of low|high, got "urgent!!")
     raw text kept for logging: {"category":"billing","priority":"urgent!!"}

4) tools with generateText or streamText
   stopWhen: stepCountIs(1) -> steps 1, finishReason tool-calls, text ""
   stopWhen: stepCountIs(5) -> steps 2, finishReason stop, text "Order 42 shipped on Monday."
~~~

## 6. What Changed After v5

From the migration guides shipped in \`ai@7.0.143\` (read October 2026):

- **AI SDK 6 deprecated \`generateObject\` and \`streamObject\`.** The replacement is \`generateText\` / \`streamText\` with an \`output\` setting, for example \`output: Output.object({ schema })\`, reading \`result.output\` (or \`partialOutputStream\` when streaming). They still exist in v7 marked \`@deprecated\`. Even in v5 you can already combine tools and structured output with \`generateText({ experimental_output: Output.object(...) })\`.
- **AI SDK 6** also made \`convertToModelMessages\` async and switched OpenAI strict JSON Schema mode on by default.
- **AI SDK 7** renamed \`fullStream\` to \`stream\` (old name kept as a deprecated alias), renamed \`stepCountIs\` to \`isStepCount\` (the old name is still exported as an alias), removed \`experimental_output\` in favour of \`output\`, deprecated the response helpers on the \`streamText\` result in favour of standalone \`toUIMessageStream\` / \`createUIMessageStreamResponse\`, renamed \`system\` to \`instructions\`, and became ESM-only with Node.js 22 or later.

So in an interview in late 2026, the strong answer is: "In v5 it is these three; since v6 the recommended shape for objects is \`generateText\` or \`streamText\` with \`output\`, and the decision rule (watching person? fixed shape?) stays the same."

## Common Pitfalls

- **Awaiting \`streamText\`.** It returns a result object synchronously; \`await streamText(...)\` hides the mistake but you then forget to consume or return the stream. Consume \`textStream\` or return a response helper.
- **Expecting \`streamText\` to throw.** Errors go into the stream and the default \`onError\` only logs to the console; pass your own \`onError\` and handle the \`error\` part on the client.
- **Forgetting \`stopWhen\` with tools.** With the v5 default \`stepCountIs(1)\`, a tool call ends the run with empty text, as the simulation shows.
- **Using \`generateText\` plus \`JSON.parse\` for structured data.** Use \`generateObject\` (or \`output\` in v6+) so the provider can constrain decoding and the SDK validates the result; catch \`NoObjectGeneratedError\` and keep its \`text\` for debugging.
- **Streaming in background jobs.** Nobody is watching; \`generateText\` is simpler, and for large offline volumes a [batch API](/interview-question/when-should-you-use-batch-apis-instead-of-real-time-llm-calls) is cheaper.
- **Copying v4 or v7 snippets into a v5 project.** \`maxSteps\`, \`parameters\` and \`toDataStreamResponse\` are v4 names; \`isStepCount\`, \`stream\` and \`instructions\` are v7 names. Check which major version your lockfile has.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the rule:</strong> <span style="color:#f0e2c8;">Two questions: is a person watching the output appear, and does code need a fixed shape? Watching means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">streamText</code>; fixed shape means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateObject</code>; neither means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateText</code>. A live-filling form is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">streamObject</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Describe generateText:</strong> <span style="color:#f0e2c8;">It awaits the whole run and gives me <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toolCalls</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finishReason</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">usage</code> for the last step and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">totalUsage</code> across steps. I use it for background jobs, evals and agents on the server.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Describe streamText:</strong> <span style="color:#f0e2c8;">It returns immediately, not a promise, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">textStream</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fullStream</code> and end-of-run promises, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toUIMessageStreamResponse()</code> feeds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useChat</code>. Errors go into the stream rather than being thrown, so I always pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Describe generateObject:</strong> <span style="color:#f0e2c8;">It takes a Zod or JSON schema and returns a validated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code>, or throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoObjectGeneratedError</code> with the raw text, usage and finish reason, which I catch and log. It has no tools.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show version awareness:</strong> <span style="color:#f0e2c8;">In v5 the tool loop defaults to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stepCountIs(1)</code>, so I raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stopWhen</code> when using tools. AI SDK 6 deprecated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateObject</code> in favour of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateText</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output: Output.object(...)</code>, and v7 is current, so I check the lockfile before copying snippets.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my tool-using generateText return empty text?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the v5 default is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stopWhen: stepCountIs(1)</code>: the model calls the tool in step one, the SDK runs it, and the run stops before a second model call can turn the result into prose. Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stopWhen: stepCountIs(5)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hasToolCall('finalAnswer')</code>. My simulation shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finishReason tool-calls</code> with empty text at 1 and a full answer at 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I get structured output and tools in one call?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateObject</code>, which has no tools. In v5 use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateText</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tools</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimental_output: Output.object({ schema })</code>; from v6 the option is simply <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output</code>, and that is the recommended path for objects in general.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do errors differ between them?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateText</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateObject</code> throw, so try/catch works; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateObject</code> adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoObjectGeneratedError</code> for unparseable or schema-failing output. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">streamText</code> starts streaming immediately and puts errors into the stream, calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onError</code> (default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">console.error</code>), so the server does not crash and the client sees an error part.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you ever use streamText on the server without a UI?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, when I want to forward or process output incrementally, for example relaying to another stream, cutting off early once I have what I need, or showing progress in a CLI. If I just need the final text, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateText</code> is simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is streamObject for?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Streaming a structured result to a person: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partialObjectStream</code> yields growing partial objects, so a form or table fills in live. The final object is still validated. Since v6 the same is done with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">streamText</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partialOutputStream</code>.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| AI SDK | Vercel's TypeScript toolkit for calling models across providers (\`ai\`, \`@ai-sdk/*\` packages) |
| generateText | Awaits the full result: text, tool calls, usage, steps |
| streamText | Returns at once with text and full-part streams plus end-of-run promises and response helpers |
| generateObject | Returns a schema-validated object or throws \`NoObjectGeneratedError\` |
| Step | One model call inside a multi-step tool run, bounded by \`stopWhen\` |

**Conclusion:** The three functions answer two questions. If a person is watching the output appear, use \`streamText\` and return its UI stream; if code needs a fixed shape, use \`generateObject\` with a schema and handle \`NoObjectGeneratedError\`; otherwise use \`generateText\` and await the result. Know the two traps that catch people in v5, \`streamText\` errors living in the stream and the \`stepCountIs(1)\` default that stops after the first tool call, and know that since AI SDK 6 the object case has moved to \`generateText\` / \`streamText\` with \`output\`.`,
    examples: [
      {
        label: `The three call shapes on a fake clock`,
        variants: [
          { tech: "node", code: `// The three AI SDK 5 call shapes, re-enacted with a stub model on a fake clock.
// This is NOT the real "ai" package: it mimics what generateText, streamText
// and generateObject hand back, so the behaviour around the model can run offline.

const TTFT = 500, PER_TOKEN = 25; // simulated ms

// Stub model: canned replies keyed by prompt; tokens are words for readability.
const REPLIES = {
  summary: "Refunds are allowed within 30 days with a receipt.",
  ticket_ok: '{"category":"billing","priority":"high"}',
  ticket_bad: '{"category":"billing","priority":"urgent!!"}',
};
const tokensOf = (key) => REPLIES[key].split(" ");
const doneAt = (n) => TTFT + (n - 1) * PER_TOKEN;

function generateText({ prompt }) {               // one awaited result
  const t = tokensOf(prompt);
  return { text: t.join(" "), finishReason: "stop", usage: { outputTokens: t.length }, resolvedAt: doneAt(t.length) };
}

function* streamText({ prompt }) {                // deltas as they are produced
  const t = tokensOf(prompt);
  for (let i = 0; i < t.length; i++) yield { at: TTFT + i * PER_TOKEN, delta: (i ? " " : "") + t[i] };
}

// Tiny schema check standing in for Zod: required keys, types, enums.
const ticketSchema = { category: { enum: ["billing", "bug", "other"] }, priority: { enum: ["low", "high"] } };
function validate(obj, schema) {
  for (const [k, rule] of Object.entries(schema)) {
    if (!(k in obj)) return "missing " + k;
    if (!rule.enum.includes(obj[k])) return k + " must be one of " + rule.enum.join("|") + ", got " + JSON.stringify(obj[k]);
  }
  return null;
}
function generateObject({ prompt, schema }) {     // typed object or a thrown error
  const r = generateText({ prompt });
  let obj;
  try { obj = JSON.parse(r.text); } catch { throw { name: "NoObjectGeneratedError", cause: "not JSON", text: r.text }; }
  const err = validate(obj, schema);
  if (err) throw { name: "NoObjectGeneratedError", cause: err, text: r.text };
  return { object: obj, resolvedAt: r.resolvedAt };
}

console.log("1) generateText: nothing until the whole answer exists");
const g = generateText({ prompt: "summary" });
console.log("   resolved at " + g.resolvedAt + " ms with " + g.usage.outputTokens + " tokens: " + g.text);

console.log("");
console.log("2) streamText: same answer, consumed as it is produced");
let shown = "", first = null, last = 0;
for (const part of streamText({ prompt: "summary" })) {
  if (first === null) first = part.at;
  last = part.at; shown += part.delta;
  if (part.at === TTFT || part.at === TTFT + 4 * PER_TOKEN) console.log("   t=" + part.at + " ms screen: " + shown);
}
console.log("   first text at " + first + " ms, finished at " + last + " ms");

console.log("");
console.log("3) generateObject: a validated object, or an error you must handle");
for (const prompt of ["ticket_ok", "ticket_bad"]) {
  try {
    const o = generateObject({ prompt, schema: ticketSchema });
    console.log("   " + prompt + ": object = " + JSON.stringify(o.object));
  } catch (e) {
    console.log("   " + prompt + ": " + e.name + " (" + e.cause + ")");
    console.log("     raw text kept for logging: " + e.text);
  }
}

// Multi-step tools: the v5 default stop condition is stepCountIs(1).
function toolLoop(maxSteps) {
  const steps = [{ toolCall: "lookupOrder", text: "" }, { toolCall: null, text: "Order 42 shipped on Monday." }];
  const done = [];
  for (const s of steps) { done.push(s); if (done.length >= maxSteps || !s.toolCall) break; }
  const lastStep = done[done.length - 1];
  return { steps: done.length, text: lastStep.text, finishReason: lastStep.toolCall ? "tool-calls" : "stop" };
}
console.log("");
console.log("4) tools with generateText or streamText");
for (const n of [1, 5]) {
  const r = toolLoop(n);
  console.log("   stopWhen: stepCountIs(" + n + ") -> steps " + r.steps + ", finishReason " + r.finishReason + ", text " + JSON.stringify(r.text));
}` },
          { tech: "python", code: `# The three AI SDK 5 call shapes, re-enacted with a stub model on a fake clock.
# This is NOT the real "ai" package: it mimics what generateText, streamText
# and generateObject hand back, so the behaviour around the model can run offline.
import json

TTFT, PER_TOKEN = 500, 25  # simulated ms

# Stub model: canned replies keyed by prompt; tokens are words for readability.
REPLIES = {
    "summary": "Refunds are allowed within 30 days with a receipt.",
    "ticket_ok": '{"category":"billing","priority":"high"}',
    "ticket_bad": '{"category":"billing","priority":"urgent!!"}',
}


def dumps(obj):
    return json.dumps(obj, separators=(",", ":"))


def tokens_of(key):
    return REPLIES[key].split(" ")


def done_at(n):
    return TTFT + (n - 1) * PER_TOKEN


def generate_text(prompt):  # one awaited result
    t = tokens_of(prompt)
    return {"text": " ".join(t), "finishReason": "stop", "outputTokens": len(t), "resolvedAt": done_at(len(t))}


def stream_text(prompt):  # deltas as they are produced
    t = tokens_of(prompt)
    for i, tok in enumerate(t):
        yield {"at": TTFT + i * PER_TOKEN, "delta": (" " if i else "") + tok}


# Tiny schema check standing in for Pydantic/Zod: required keys, types, enums.
ticket_schema = {"category": {"enum": ["billing", "bug", "other"]}, "priority": {"enum": ["low", "high"]}}


def validate(obj, schema):
    for k, rule in schema.items():
        if k not in obj:
            return "missing " + k
        if obj[k] not in rule["enum"]:
            return f"{k} must be one of {'|'.join(rule['enum'])}, got {json.dumps(obj[k])}"
    return None


class NoObjectGeneratedError(Exception):
    def __init__(self, cause, text):
        self.cause, self.text = cause, text


def generate_object(prompt, schema):  # typed object or a raised error
    r = generate_text(prompt)
    try:
        obj = json.loads(r["text"])
    except json.JSONDecodeError:
        raise NoObjectGeneratedError("not JSON", r["text"])
    err = validate(obj, schema)
    if err:
        raise NoObjectGeneratedError(err, r["text"])
    return {"object": obj, "resolvedAt": r["resolvedAt"]}


print("1) generateText: nothing until the whole answer exists")
g = generate_text("summary")
print(f"   resolved at {g['resolvedAt']} ms with {g['outputTokens']} tokens: {g['text']}")

print("")
print("2) streamText: same answer, consumed as it is produced")
shown, first, last = "", None, 0
for part in stream_text("summary"):
    if first is None:
        first = part["at"]
    last = part["at"]
    shown += part["delta"]
    if part["at"] in (TTFT, TTFT + 4 * PER_TOKEN):
        print(f"   t={part['at']} ms screen: {shown}")
print(f"   first text at {first} ms, finished at {last} ms")

print("")
print("3) generateObject: a validated object, or an error you must handle")
for prompt in ["ticket_ok", "ticket_bad"]:
    try:
        o = generate_object(prompt, ticket_schema)
        print(f"   {prompt}: object = {dumps(o['object'])}")
    except NoObjectGeneratedError as e:
        print(f"   {prompt}: NoObjectGeneratedError ({e.cause})")
        print(f"     raw text kept for logging: {e.text}")


def tool_loop(max_steps):
    """Multi-step tools: the v5 default stop condition is stepCountIs(1)."""
    steps = [{"toolCall": "lookupOrder", "text": ""}, {"toolCall": None, "text": "Order 42 shipped on Monday."}]
    done = []
    for s in steps:
        done.append(s)
        if len(done) >= max_steps or not s["toolCall"]:
            break
    last_step = done[-1]
    return {"steps": len(done), "text": last_step["text"], "finishReason": "tool-calls" if last_step["toolCall"] else "stop"}


print("")
print("4) tools with generateText or streamText")
for n in [1, 5]:
    r = tool_loop(n)
    print(f"   stopWhen: stepCountIs({n}) -> steps {r['steps']}, finishReason {r['finishReason']}, text {json.dumps(r['text'])}")` },
        ],
      },
    ],
  },
  {
    title: `Vercel AI SDK 5 streamText: how do you stream LLM chat to React?`,
    difficulty: "medium",
    seoDescription: `AI SDK 5 chat end to end: a streamText route, the UI message stream protocol, useChat and message parts, tools, stop, errors and saving,, verified.`,
    description: `**Question presented to candidate:**
"We are building a chat page in Next.js with the Vercel AI SDK 5. Walk me through the server route and the React side: how the tokens get from \`streamText\` into the component, what the messages look like, and how you handle tools, stopping, errors and saving the conversation."

**What a strong answer should cover:**
- Server: a route handler that receives \`UIMessage[]\`, converts them with \`convertToModelMessages\`, calls \`streamText({ model, system, messages, tools, stopWhen, abortSignal })\` and returns \`result.toUIMessageStreamResponse()\`
- The wire format: the UI message stream protocol, SSE \`data:\` frames of typed chunks (\`start\`, \`text-start\`, \`text-delta\`, \`tool-input-available\`, \`tool-output-available\`, \`finish\`, ...) ending in \`data: [DONE]\`, with a \`x-vercel-ai-ui-message-stream: v1\` header
- Client: \`useChat\` from \`@ai-sdk/react\` (default transport POSTs to \`/api/chat\`) returning \`messages\`, \`sendMessage\`, \`status\` (\`submitted\`, \`streaming\`, \`ready\`, \`error\`), \`stop\`, \`regenerate\`, \`error\`; rendering \`message.parts\` by type, including typed tool parts with states
- Production concerns: persisting with \`originalMessages\` + \`onFinish\`, stable chat and message ids, propagating abort, error masking (the default sends only "An error occurred."), throttling re-renders, and not trusting client-sent history blindly
- Version awareness: v5 introduced this \`UIMessage\` / transport design; v6 made \`convertToModelMessages\` async; v7 deprecates the result helpers in favour of \`createUIMessageStreamResponse\` + \`toUIMessageStream\`

**Clarifying questions expected:**
- Do conversations need to be saved and reloaded, and do answers need to survive a page refresh mid-stream?
- Do tools run on the server, or do some need the browser or a human confirmation?
- Which AI SDK major version and Next.js router is the app on?

**Code / implementation expected:** Yes — a route handler and a client component, or the protocol and message-parts reducer they rely on.`,
    answer: `**Target Audience:** React and Next.js developers building a chat page with the Vercel AI SDK 5 who want to understand what flows between \`streamText\` and \`useChat\`, not just copy the starter.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 for the protocol simulation below (identical output). AI SDK facts were read in October 2026 from the published npm packages \`ai@5.0.277\` and \`@ai-sdk/react@2.0.280\` (type definitions and source) and the migration guides shipped in \`ai@7.0.143\`. The React and route code is not run here.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Think of live TV subtitles. Someone in a booth hears the speaker and types; each line goes over a wire to your TV in small packets; your TV assembles them into neat caption boxes on screen. If the packets were raw keystrokes in some private format, every TV maker would have to reverse-engineer it. Instead there is an agreed caption format: "new caption starts", "add these words", "caption done", "speaker changed".

A streamed chat page has the same three parts. The **booth** is your server route calling the model with \`streamText\`. The **wire** is an HTTP response carrying small typed events. The **TV** is the React hook \`useChat\`, which assembles them into messages your component renders. The AI SDK 5 value is that the wire format and both ends are standard, so you write about thirty lines and get text, tool calls, stop, errors and multi-step runs handled consistently across model providers.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must chats be saved and reloaded? | Decides \`id\`, \`originalMessages\` and \`onFinish\` persistence on the server |
| Should an answer survive a page refresh mid-stream? | Needs resumable streams (a Redis-backed store), covered in [SSE, abort and resume](/interview-question/streaming-llm-responses-to-the-ui-sse-chunking-abort-and-resume) |
| Do tools run on the server, in the browser, or after a human approves? | Server tools use \`execute\`; browser tools use \`onToolCall\` and \`addToolResult\` |
| Which AI SDK major version is in the lockfile? | v5, v6 and v7 rename several of the functions below |

## 3. The Moving Parts

<svg class="iq-diagram" width="100%" viewBox="0 0 900 260" role="img" aria-label="useChat posts UI messages to the route. The route converts them to model messages and calls streamText. streamText output becomes a UI message stream sent as server sent events. useChat folds the chunks into message parts and React renders them.">
  <defs>
    <marker id="ai09q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="200" height="80" rx="10"/>
  <text class="d-text" x="120" y="74" text-anchor="middle">useChat</text>
  <text class="d-sub" x="120" y="98" text-anchor="middle">messages, status</text>
  <rect class="d-box-accent" x="350" y="40" width="200" height="80" rx="10"/>
  <text class="d-text" x="450" y="74" text-anchor="middle">POST /api/chat</text>
  <text class="d-sub" x="450" y="98" text-anchor="middle">convert, streamText</text>
  <rect class="d-box-muted" x="680" y="40" width="200" height="80" rx="10"/>
  <text class="d-text" x="780" y="74" text-anchor="middle">model provider</text>
  <text class="d-sub" x="780" y="98" text-anchor="middle">any supported</text>
  <rect class="d-box-accent" x="350" y="170" width="200" height="70" rx="10"/>
  <text class="d-text" x="450" y="200" text-anchor="middle">UI message stream</text>
  <text class="d-sub" x="450" y="222" text-anchor="middle">SSE chunks</text>
  <rect class="d-box" x="20" y="170" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="200" text-anchor="middle">message.parts</text>
  <text class="d-sub" x="120" y="222" text-anchor="middle">rendered by type</text>
  <path class="d-edge" d="M 224 80 L 346 80" marker-end="url(#ai09q4-arrow)"/>
  <path class="d-edge" d="M 554 80 L 676 80" marker-end="url(#ai09q4-arrow)"/>
  <path class="d-edge-accent" d="M 450 124 L 450 166" marker-end="url(#ai09q4-arrow)"/>
  <path class="d-edge-accent" d="M 346 205 L 224 205" marker-end="url(#ai09q4-arrow)"/>
</svg>

The request carries the conversation as UI messages; the response is a stream of typed chunks that the hook folds into the last assistant message, which React re-renders as it grows.

📌 **Interview term: UIMessage** — the client-side message shape in AI SDK 5: \`{ id, role, metadata?, parts }\`. \`parts\` is an array of typed pieces: \`text\`, \`reasoning\`, tool parts named \`tool-<toolName>\`, \`file\`, \`source-url\`, \`data-<name>\` and \`step-start\`. You render parts, not a single \`content\` string.

📌 **Interview term: ModelMessage** — the provider-facing message shape (\`role\` + \`content\`) that \`streamText\` takes. \`convertToModelMessages(uiMessages)\` turns one into the other on the server, dropping UI-only details.

📌 **Interview term: UI message stream protocol** — the SDK wire format between server and \`useChat\`: SSE frames, each \`data: <JSON chunk>\`, ending with \`data: [DONE]\`. In \`ai@5.0.277\` the response headers are \`content-type: text/event-stream\`, \`cache-control: no-cache\`, \`connection: keep-alive\`, \`x-vercel-ai-ui-message-stream: v1\` and \`x-accel-buffering: no\` (the source comments it as "disable nginx buffering").

## 4. The Server Route

Not run here (needs a provider key); every name checked against the \`ai@5.0.277\` type definitions.

~~~ts
// app/api/chat/route.ts
import { streamText, convertToModelMessages, stepCountIs, tool, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("MODEL_ID"),
    system: "You are a concise weather assistant.",
    messages: convertToModelMessages(messages),          // v5: sync; v6+: await it
    tools: {
      getWeather: tool({
        description: "Current temperature for a city",
        inputSchema: z.object({ city: z.string() }),
        execute: async ({ city }) => ({ tempC: await lookupTemp(city) }),
      }),
    },
    stopWhen: stepCountIs(5),                            // default is 1: stop after the tool call
    abortSignal: req.signal,                             // stop generating when the client goes away
    onError: ({ error }) => log.error(error),            // default only console.error
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,                          // so ids and history line up for saving
    onFinish: async ({ messages, isAborted }) => saveChat(chatIdFrom(req), messages, { isAborted }),
  });
}
~~~

What each line buys you:

- **\`convertToModelMessages\`** strips UI-only parts and maps tool parts back to tool calls and results the provider understands.
- **\`stopWhen\`** decides whether the model gets a second step to turn a tool result into an answer; with the v5 default \`stepCountIs(1)\` the reply ends right after the tool runs (the [generateText vs streamText page](/interview-question/ai-sdk-5-when-to-use-streamtext-vs-generatetext-vs-generateobject) shows this in a run).
- **\`toUIMessageStreamResponse\`** converts the model stream into UI chunks, frames them as SSE and sets the headers above. Its \`onError\` option (different from \`streamText\`'s) decides the error text the *client* sees; the default is \`() => "An error occurred."\`, so server details are not leaked.
- **\`onFinish\`** receives the full updated \`messages\` and an \`isAborted\` flag, the natural place to persist.

Do not trust the client blindly: it sends the whole history, so a user can edit earlier messages or inject tool results. For anything sensitive, load the history from your database by chat id and append only the new user message (the \`useChat\` transport has \`prepareSendMessagesRequest\` to send only the last message).

## 5. The React Side

Not run here; names from \`@ai-sdk/react@2.0.280\` and \`ai@5.0.277\`.

~~~ts
// app/page.tsx
"use client";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";

export default function Chat() {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({ experimental_throttle: 50 });
  const [input, setInput] = useState("");

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <b>{m.role}:</b>
          {m.parts.map((part, i) => {
            if (part.type === "text") return <span key={i}>{part.text}</span>;
            if (part.type === "tool-getWeather")
              return <em key={i}>{part.state === "output-available" ? "Looked up " + part.input.city : "Checking weather..."}</em>;
            return null;
          })}
        </div>
      ))}
      {error && <button onClick={() => regenerate()}>Something went wrong. Retry</button>}
      <form onSubmit={(e) => { e.preventDefault(); sendMessage({ text: input }); setInput(""); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={status !== "ready"} />
        {status === "submitted" || status === "streaming" ? <button type="button" onClick={stop}>Stop</button> : <button>Send</button>}
      </form>
    </div>
  );
}
~~~

📌 **Interview term: chat status** — \`useChat\` exposes \`status\` as \`'submitted' | 'streaming' | 'ready' | 'error'\` (the v5 \`ChatStatus\` type): submitted after \`sendMessage\`, streaming once the first chunk is written into the message, ready when done, error on failure. Use it for spinners, disabling input and showing Stop.

Key points about the hook in v5:

- The default transport is \`DefaultChatTransport\`, which POSTs \`{ id, messages, ... }\` to \`/api/chat\`; pass \`transport: new DefaultChatTransport({ api, headers, body, prepareSendMessagesRequest })\` to change it. There is no built-in \`input\` state any more (that moved out in v5); you keep your own with \`useState\`.
- \`stop()\` aborts the fetch for the current response; on the server, \`abortSignal: req.signal\` carries that through to the provider.
- Tool parts are typed: \`tool-getWeather\` moves through \`input-streaming\` → \`input-available\` → \`output-available\` (or \`output-error\`). Tools without \`execute\` on the server are for the browser: handle them in \`onToolCall\`, report with \`addToolResult\`, and use \`sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls\` to continue the run.
- \`experimental_throttle\` (milliseconds) throttles how often the hook pushes message updates into React.

## 6. What Actually Flows: the Simulation

The example "UI message stream: server chunks to message parts" re-creates the protocol without the SDK: a stub model run with one server tool call, the chunks \`toUIMessageStreamResponse\` would emit (shapes copied from the v5 \`uiMessageChunkSchema\`), SSE framing, and a reducer that builds \`message.parts\` the way \`useChat\` does. The heart of the reducer:

~~~js
switch (c.type) {
  case "start-step": msg.parts.push({ type: "step-start" }); break;
  case "tool-input-start": msg.parts.push({ type: "tool-" + c.toolName, toolCallId: c.toolCallId, state: "input-streaming" }); break;
  case "tool-input-available": Object.assign(toolPart(c.toolCallId), { state: "input-available", input: c.input }); break;
  case "tool-output-available": Object.assign(toolPart(c.toolCallId), { state: "output-available", output: c.output }); break;
  case "text-start": msg.parts.push({ type: "text", text: "", state: "streaming" }); break;
  case "text-delta": textPart().text += c.delta; break;   // note: UI chunks use "delta"
  case "text-end": textPart().state = "done"; break;
}
~~~

The result:

~~~text
status: submitted -> streaming -> ready
message.id: msg_1
parts[0] {"type":"step-start"}
parts[1] {"type":"tool-getWeather","toolCallId":"call_1","state":"output-available","input":{"city":"Paris"},"output":{"tempC":18}}
parts[2] {"type":"step-start"}
parts[3] {"type":"text","text":"It is 18 degrees in Paris right now, mild enough for a light jacket.","state":"done"}
~~~

Two steps (tool call, then the answer that uses its result), so two \`step-start\` parts; the tool part carries both input and output; the text part ends \`done\`. One subtle detail from the v5 source: in the server-side \`fullStream\` a text delta has a \`text\` field, but the UI chunk sent to the browser calls it \`delta\`. If you ever write your own client or a custom transport, use the UI chunk names.

**Render cost.** The 27 chunks arrive 10 ms apart. Re-rendering on every chunk is 27 React renders for one short answer; a 50 ms leading-and-trailing throttle (in the spirit of \`experimental_throttle: 50\`) drops that to 7, with the final state still rendered. On long answers with markdown rendering, that is the difference between smooth and janky.

## 7. Verified: Running the Code

\`node a.js\` and \`python3.12 a.py\` printed byte-identical output. The simulation stands in for \`streamText\`, \`toUIMessageStreamResponse\` and \`useChat\`: no network, no React, a fake clock, a hand-written throttle. It does not reproduce the SDK's exact throttle library timing, partial tool-input parsing, or error and abort chunks.

~~~text
server sent 27 chunks as 1542 characters of SSE
first frame:  data: {"type":"start","messageId":"msg_1"}
a text frame: data: {"type":"text-delta","id":"txt_1","delta":" is"}

status: submitted -> streaming -> ready
message.id: msg_1
parts[0] {"type":"step-start"}
parts[1] {"type":"tool-getWeather","toolCallId":"call_1","state":"output-available","input":{"city":"Paris"},"output":{"tempC":18}}
parts[2] {"type":"step-start"}
parts[3] {"type":"text","text":"It is 18 degrees in Paris right now, mild enough for a light jacket.","state":"done"}

re-renders, one per chunk:      27
re-renders, 50 ms throttle:     7
~~~

## 8. Production Concerns

- **Persistence.** Give each chat an id (\`useChat({ id })\`, sent with each request), pass \`originalMessages\` so the response message id and history line up, and save in \`onFinish\`. Load saved messages into \`useChat({ messages })\` on page load.
- **Finish even if the user leaves.** \`streamText\` applies backpressure, so a closed tab can stop generation before \`onFinish\`; the AI SDK persistence guide suggests \`result.consumeStream()\` (not awaited) when the answer must be saved regardless. This trades cost for completeness.
- **Custom data.** \`createUIMessageStream({ execute: ({ writer }) => ... })\` lets you write your own \`data-<name>\` parts (progress, citations) alongside the model output, and merge a \`streamText\` result into it.
- **Infrastructure.** The SDK sets \`x-accel-buffering: no\`, but other proxies and CDNs can still buffer; test behind the real stack (see [how streaming works](/interview-question/how-does-streaming-work-in-llm-apis-and-why-does-it-matter-for-ux)). For route handler streaming in general, see [Next.js route handler streaming](/interview-question/how-do-you-stream-responses-and-server-sent-events-from-a-route-handler).
- **Testing.** \`ai/test\` in v5 ships \`MockLanguageModelV2\`, and \`ai\` exports \`simulateReadableStream\`, so the route can be tested without a provider.

## 9. What Changed After v5

From the migration guides in \`ai@7.0.143\`: AI SDK 6 made \`convertToModelMessages\` async (\`await\` it). AI SDK 7 deprecates \`result.toUIMessageStreamResponse()\` and the other helpers on the \`streamText\` result in favour of standalone functions: \`createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream, originalMessages, onFinish }) })\`; it renames \`fullStream\` to \`stream\`, \`stepCountIs\` to \`isStepCount\` (both old names kept as aliases), and \`system\` to \`instructions\`, and requires ESM and Node.js 22+. The architecture (UI messages in, UI message stream out, \`useChat\` folding parts) is the same.

## Common Pitfalls

- **Rendering \`message.content\`.** v5 messages have \`parts\`; render by part type or tool output and reasoning silently disappear.
- **Leaving \`stopWhen\` at the default with tools.** The reply ends right after the tool call with no text.
- **Not wiring \`abortSignal: req.signal\`.** \`stop()\` ends the client fetch but the server can keep generating and billing.
- **Expecting server error details in the UI.** The default client error text is "An error occurred."; map known errors to safe messages in \`toUIMessageStreamResponse({ onError })\` and log the real one.
- **Trusting client-sent history.** Reload history by chat id on the server for anything that matters.
- **Setting state per token yourself.** If you build a custom renderer, batch updates; the run shows 27 renders cut to 7 with a 50 ms throttle.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Sketch the route:</strong> <span style="color:#f0e2c8;">A POST handler receives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UIMessage[]</code>, runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">convertToModelMessages</code>, calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">streamText</code> with the model, system prompt, tools, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stopWhen</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abortSignal: req.signal</code>, and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result.toUIMessageStreamResponse()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain the wire:</strong> <span style="color:#f0e2c8;">That response is the <strong style="color:#ffca28;">UI message stream protocol</strong>: SSE <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data:</code> frames of typed chunks such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text-delta</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tool-input-available</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tool-output-available</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finish</code>, ending in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data: [DONE]</code>, with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x-vercel-ai-ui-message-stream: v1</code> header and nginx buffering turned off.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain the hook:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useChat</code> POSTs to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/api/chat</code> and folds chunks into the assistant message <strong style="color:#ffca28;">parts</strong>: text, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step-start</code>, typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tool-getWeather</code> parts moving from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input-streaming</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output-available</code>. It exposes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sendMessage</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stop</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">regenerate</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">error</code>, and I render parts by type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cover production:</strong> <span style="color:#f0e2c8;">Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">originalMessages</code> and save in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onFinish</code>, which also tells me <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isAborted</code>; give chats stable ids; reload history server-side instead of trusting the client; map errors to safe text, since the default is just "An error occurred."; throttle renders with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimental_throttle</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show version awareness:</strong> <span style="color:#f0e2c8;">The default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stopWhen</code> in v5 is one step, so I raise it for tools. v6 made <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">convertToModelMessages</code> async, and v7 moved the response helpers to standalone <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toUIMessageStream</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createUIMessageStreamResponse</code>; the architecture is unchanged.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a tool that must run in the browser?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Define it on the server without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">execute</code>. The client gets the tool part in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input-available</code>; I handle it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onToolCall</code> (or render a confirm button), report with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addToolResult</code>, and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls</code> so the hook sends the result back and the run continues.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you persist conversations?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each chat has an id passed to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useChat({ id })</code>. On the server I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">originalMessages</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toUIMessageStreamResponse</code> and save the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">messages</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onFinish</code>. On load I pass saved messages to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useChat({ messages })</code>. For safety I send only the last message with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prepareSendMessagesRequest</code> and load the rest from the database.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when the user presses Stop?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stop()</code> aborts the client fetch. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abortSignal: req.signal</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">streamText</code>, the provider request is aborted too, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onFinish</code> runs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isAborted: true</code> so I can save the partial answer. If I added resumable streams, a client abort becomes a disconnect and I need a separate stop endpoint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do my server errors show up as "An error occurred."?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onError</code> of the UI message stream, to avoid leaking stack traces or provider details to the browser. I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onError</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toUIMessageStreamResponse</code> that maps known errors (rate limit, context too long) to friendly text, and log the real error on the server with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">streamText</code>'s own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you stream extra data like citations or progress?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createUIMessageStream({ execute: ({ writer }) =&gt; ... })</code>: write custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-&lt;name&gt;</code> parts (for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-sources</code>) and merge the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">streamText</code> UI stream into the same writer. On the client they arrive as typed parts in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">message.parts</code>, or through the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onData</code> callback for transient data.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| UIMessage | Client message shape \`{ id, role, metadata?, parts }\`; rendered part by part |
| ModelMessage | Provider-facing message shape that \`streamText\` consumes; made by \`convertToModelMessages\` |
| UI message stream protocol | SSE frames of typed chunks (\`text-delta\`, \`tool-output-available\`, ...) ending in \`data: [DONE]\` |
| Message parts | Typed pieces of a message: text, reasoning, \`tool-<name>\`, file, source, data, step-start |
| Chat status | \`submitted\`, \`streaming\`, \`ready\` or \`error\` from \`useChat\` |

**Conclusion:** In AI SDK 5 a streamed chat is three standard pieces. The route turns \`UIMessage[]\` into model messages, calls \`streamText\` with tools, a real \`stopWhen\` and the request's abort signal, and returns \`toUIMessageStreamResponse\` with \`originalMessages\` and \`onFinish\` for saving. The wire is the UI message stream protocol: SSE frames of typed chunks ending in \`[DONE]\`. \`useChat\` folds those chunks into \`message.parts\` and exposes \`status\`, \`stop\` and \`error\`, and your component renders parts by type. Know the protocol well enough to debug it (the simulation rebuilds it in about a hundred lines), and know the v6 and v7 renames so you can read any project's code.`,
    examples: [
      {
        label: `UI message stream: server chunks to message parts`,
        variants: [
          { tech: "node", code: `// The AI SDK 5 chat pipeline in miniature: model parts -> UI message chunks
// (the shapes toUIMessageStreamResponse sends, as SSE) -> a useChat-style
// reducer that builds message.parts. Stub model, fake clock, no "ai" package.

const words = "It is 18 degrees in Paris right now, mild enough for a light jacket.".split(" ");

// 1) Server: what a streamText result would turn into, one UI chunk per event.
const chunks = [
  { type: "start", messageId: "msg_1" },
  { type: "start-step" },
  { type: "tool-input-start", toolCallId: "call_1", toolName: "getWeather" },
  { type: "tool-input-delta", toolCallId: "call_1", inputTextDelta: '{"city":' },
  { type: "tool-input-delta", toolCallId: "call_1", inputTextDelta: '"Paris"}' },
  { type: "tool-input-available", toolCallId: "call_1", toolName: "getWeather", input: { city: "Paris" } },
  { type: "tool-output-available", toolCallId: "call_1", output: { tempC: 18 } },
  { type: "finish-step" },
  { type: "start-step" },
  { type: "text-start", id: "txt_1" },
  ...words.map((w, i) => ({ type: "text-delta", id: "txt_1", delta: (i ? " " : "") + w })),
  { type: "text-end", id: "txt_1" },
  { type: "finish-step" },
  { type: "finish" },
];
const sse = chunks.map((c) => "data: " + JSON.stringify(c) + "\\n\\n").join("") + "data: [DONE]\\n\\n";
console.log("server sent " + chunks.length + " chunks as " + sse.length + " characters of SSE");
console.log("first frame:  " + sse.split("\\n\\n")[0]);
console.log("a text frame: " + sse.split("\\n\\n")[11]);

// 2) Client: parse frames and fold them into one assistant UIMessage.
const msg = { id: null, role: "assistant", parts: [] };
const statusLog = ["submitted"];
let status = "submitted";
const setStatus = (s) => { if (s !== status) { status = s; statusLog.push(s); } };
const toolPart = (id) => msg.parts.find((p) => p.toolCallId === id);
const textPart = () => msg.parts[msg.parts.length - 1];

function apply(c) {
  switch (c.type) {
    case "start": msg.id = c.messageId; break;
    case "start-step": msg.parts.push({ type: "step-start" }); break;
    case "tool-input-start": msg.parts.push({ type: "tool-" + c.toolName, toolCallId: c.toolCallId, state: "input-streaming" }); break;
    case "tool-input-delta": break; // a real client may parse partial JSON for a live preview
    case "tool-input-available": Object.assign(toolPart(c.toolCallId), { state: "input-available", input: c.input }); break;
    case "tool-output-available": Object.assign(toolPart(c.toolCallId), { state: "output-available", output: c.output }); break;
    case "text-start": msg.parts.push({ type: "text", text: "", state: "streaming" }); break;
    case "text-delta": textPart().text += c.delta; break;
    case "text-end": textPart().state = "done"; break;
    case "finish": setStatus("ready"); break;
  }
}

// Chunks arrive 10 ms apart starting at t = 400 ms. Count React re-renders
// with no throttle, and with a 50 ms throttle (leading + trailing).
const frames = sse.split("\\n\\n").filter(Boolean).map((f) => f.slice(6));
let renders = 0, throttled = 0, lastRender = -Infinity, pending = null;
frames.forEach((data, i) => {
  const now = 400 + i * 10;
  if (data === "[DONE]") return;
  if (pending !== null && pending <= now) { throttled++; lastRender = pending; pending = null; }
  apply(JSON.parse(data));
  if (status === "submitted") setStatus("streaming");
  renders++;
  if (now - lastRender >= 50) { throttled++; lastRender = now; } else if (pending === null) pending = lastRender + 50;
});
if (pending !== null) throttled++;

console.log("");
console.log("status: " + statusLog.join(" -> "));
console.log("message.id: " + msg.id);
msg.parts.forEach((p, i) => console.log("parts[" + i + "] " + JSON.stringify(p)));
console.log("");
console.log("re-renders, one per chunk:      " + renders);
console.log("re-renders, 50 ms throttle:     " + throttled);` },
          { tech: "python", code: `# The AI SDK 5 chat pipeline in miniature: model parts -> UI message chunks
# (the shapes toUIMessageStreamResponse sends, as SSE) -> a useChat-style
# reducer that builds message.parts. Stub model, fake clock, no "ai" package.
import json


def dumps(obj):
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)


words = "It is 18 degrees in Paris right now, mild enough for a light jacket.".split(" ")

# 1) Server: what a streamText result would turn into, one UI chunk per event.
chunks = [
    {"type": "start", "messageId": "msg_1"},
    {"type": "start-step"},
    {"type": "tool-input-start", "toolCallId": "call_1", "toolName": "getWeather"},
    {"type": "tool-input-delta", "toolCallId": "call_1", "inputTextDelta": '{"city":'},
    {"type": "tool-input-delta", "toolCallId": "call_1", "inputTextDelta": '"Paris"}'},
    {"type": "tool-input-available", "toolCallId": "call_1", "toolName": "getWeather", "input": {"city": "Paris"}},
    {"type": "tool-output-available", "toolCallId": "call_1", "output": {"tempC": 18}},
    {"type": "finish-step"},
    {"type": "start-step"},
    {"type": "text-start", "id": "txt_1"},
    *[{"type": "text-delta", "id": "txt_1", "delta": (" " if i else "") + w} for i, w in enumerate(words)],
    {"type": "text-end", "id": "txt_1"},
    {"type": "finish-step"},
    {"type": "finish"},
]
sse = "".join("data: " + dumps(c) + "\\n\\n" for c in chunks) + "data: [DONE]\\n\\n"
print(f"server sent {len(chunks)} chunks as {len(sse)} characters of SSE")
print("first frame:  " + sse.split("\\n\\n")[0])
print("a text frame: " + sse.split("\\n\\n")[11])

# 2) Client: parse frames and fold them into one assistant UIMessage.
msg = {"id": None, "role": "assistant", "parts": []}
status_log = ["submitted"]
state = {"status": "submitted"}


def set_status(s):
    if s != state["status"]:
        state["status"] = s
        status_log.append(s)


def tool_part(call_id):
    return next(p for p in msg["parts"] if p.get("toolCallId") == call_id)


def apply(c):
    t = c["type"]
    if t == "start":
        msg["id"] = c["messageId"]
    elif t == "start-step":
        msg["parts"].append({"type": "step-start"})
    elif t == "tool-input-start":
        msg["parts"].append({"type": "tool-" + c["toolName"], "toolCallId": c["toolCallId"], "state": "input-streaming"})
    elif t == "tool-input-delta":
        pass  # a real client may parse partial JSON for a live preview
    elif t == "tool-input-available":
        tool_part(c["toolCallId"]).update({"state": "input-available", "input": c["input"]})
    elif t == "tool-output-available":
        tool_part(c["toolCallId"]).update({"state": "output-available", "output": c["output"]})
    elif t == "text-start":
        msg["parts"].append({"type": "text", "text": "", "state": "streaming"})
    elif t == "text-delta":
        msg["parts"][-1]["text"] += c["delta"]
    elif t == "text-end":
        msg["parts"][-1]["state"] = "done"
    elif t == "finish":
        set_status("ready")


# Chunks arrive 10 ms apart starting at t = 400 ms. Count React re-renders
# with no throttle, and with a 50 ms throttle (leading + trailing).
frames = [f[6:] for f in sse.split("\\n\\n") if f]
renders, throttled, last_render, pending = 0, 0, float("-inf"), None
for i, data in enumerate(frames):
    now = 400 + i * 10
    if data == "[DONE]":
        continue
    if pending is not None and pending <= now:
        throttled += 1
        last_render, pending = pending, None
    apply(json.loads(data))
    if state["status"] == "submitted":
        set_status("streaming")
    renders += 1
    if now - last_render >= 50:
        throttled += 1
        last_render = now
    elif pending is None:
        pending = last_render + 50
if pending is not None:
    throttled += 1

print("")
print("status: " + " -> ".join(status_log))
print("message.id: " + msg["id"])
for i, p in enumerate(msg["parts"]):
    print(f"parts[{i}] {dumps(p)}")
print("")
print(f"re-renders, one per chunk:      {renders}")
print(f"re-renders, 50 ms throttle:     {throttled}")` },
        ],
      },
    ],
  },
  {
    title: `When should you use batch APIs instead of real-time LLM calls?`,
    difficulty: "easy",
    seoDescription: `When to use LLM batch APIs: the no-one-is-waiting rule, how batches work, provider limits, joining on custom_id, retrying failures and worked cost numbers.`,
    description: `**Question presented to candidate:**
"We need to re-classify two million support tickets with an LLM after a taxonomy change, and we also run a nightly eval suite. Someone suggested the provider batch API instead of normal calls. When is that the right choice, how does it work, and what would you watch out for?"

**What a strong answer should cover:**
- The rule: use a batch API when no person is waiting and a result within hours (up to a 24-hour window) is acceptable: backfills, enrichment, eval runs, offline generation; keep real-time calls for anything interactive
- How it works: a file or list of independent requests, each with a \`custom_id\`; the provider processes them asynchronously; you poll for status and download results, which can come back in any order and with per-request failures
- Why it is cheaper: providers price batch work at about half the normal rate (50% off in Anthropic's docs, and in OpenAI's and Google's batch guides as quoted in search results, October 2026) and run it on a separate, larger quota, so it does not eat the rate limits your live traffic needs
- Operational design: join results on \`custom_id\`, never by position; idempotent requests; retry only failed or expired items in a follow-up batch; split work under per-batch limits; plan for jobs that expire unfinished
- Related trade-offs: prompt caching can stack with batch discounts on some providers; flex or low-priority synchronous tiers are a middle option; real-time can still be right for small urgent jobs

**Clarifying questions expected:**
- How fresh must the results be: minutes, by tomorrow morning, or by the end of the week?
- How many requests and tokens, and are they independent of each other, or does one depend on another's output?
- Which provider, and do we already use prompt caching for a shared prefix?

**Code / implementation expected:** Optional — building the request file with ids, joining results back, and the cost arithmetic.`,
    answer: `**Target Audience:** Engineers who run LLM work that nobody watches live (backfills, enrichment, evals) and want to cut its cost and stop it competing with user traffic.
**Difficulty:** Easy
**Verified with:** Node 22.22.0 and Python 3.12.3 for the simulation below (identical output). Provider facts were checked in October 2026: Anthropic's "Batch processing" docs (platform.claude.com, fetched directly), the \`openai@7.36.0\` npm package type definitions, and, where only search results were reachable, OpenAI's and Google's batch guides as quoted in those results (marked as such below).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A laundry shop offers two services. **Express**: hand over one shirt, wait at the counter, have it back in ten minutes, pay full price. **Standard**: drop off a big bag, get a ticket, collect it tomorrow, pay half. The shop can offer standard at half price because it fills the machines during quiet hours; the work is the same, only the waiting is different.

LLM providers sell the same two services. A normal API call is express: you wait while the model answers, at full price, using your share of the provider's live capacity. A **batch API** is standard: you hand over thousands of requests at once, get a batch id, and collect the results later, at about half the price and from a separate pool of capacity.

The interview point is a one-line rule with real money behind it: **if no person is waiting, it probably belongs in a batch.** For a two-million-ticket backfill, that is the difference between $7,200 and $3,600 in the worked example below, and between hogging your live rate limit for days and not touching it at all.

## 2. What a Batch API Is

📌 **Interview term: batch API** — an asynchronous endpoint that accepts many independent model requests in one job, processes them in the background within a stated window, and lets you download all the results when the job ends. Each request is an ordinary request (same models, same parameters); only the delivery is deferred.

📌 **Interview term: custom_id** — the id you attach to every request in a batch. Results come back keyed by it, in no guaranteed order, so it is the only reliable way to match an answer to its input. Make it meaningful (a ticket id), and it doubles as an idempotency key.

📌 **Interview term: completion window** — the time the provider promises to finish within (24 hours at Anthropic, OpenAI and Google). Requests not processed in time are reported as expired rather than answered.

<svg class="iq-diagram" width="100%" viewBox="0 0 900 230" role="img" aria-label="Batch lifecycle: build requests with ids, submit the batch, poll status until ended, download results in any order, join on custom id, retry failed items in a new batch">
  <defs>
    <marker id="ai09q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="180" height="70" rx="10"/>
  <text class="d-text" x="110" y="62" text-anchor="middle">build requests</text>
  <text class="d-sub" x="110" y="84" text-anchor="middle">one custom_id each</text>
  <rect class="d-box-accent" x="250" y="30" width="180" height="70" rx="10"/>
  <text class="d-text" x="340" y="62" text-anchor="middle">submit batch</text>
  <text class="d-sub" x="340" y="84" text-anchor="middle">get a batch id</text>
  <rect class="d-box-muted" x="480" y="30" width="180" height="70" rx="10"/>
  <text class="d-text" x="570" y="62" text-anchor="middle">poll status</text>
  <text class="d-sub" x="570" y="84" text-anchor="middle">minutes to hours</text>
  <rect class="d-box" x="710" y="30" width="170" height="70" rx="10"/>
  <text class="d-text" x="795" y="62" text-anchor="middle">download</text>
  <text class="d-sub" x="795" y="84" text-anchor="middle">any order</text>
  <rect class="d-box-accent" x="560" y="150" width="200" height="70" rx="10"/>
  <text class="d-text" x="660" y="182" text-anchor="middle">join on custom_id</text>
  <text class="d-sub" x="660" y="204" text-anchor="middle">store results</text>
  <rect class="d-box-muted" x="250" y="150" width="200" height="70" rx="10"/>
  <text class="d-text" x="350" y="182" text-anchor="middle">retry failures</text>
  <text class="d-sub" x="350" y="204" text-anchor="middle">small new batch</text>
  <path class="d-edge" d="M 204 65 L 246 65" marker-end="url(#ai09q5-arrow)"/>
  <path class="d-edge" d="M 434 65 L 476 65" marker-end="url(#ai09q5-arrow)"/>
  <path class="d-edge" d="M 664 65 L 706 65" marker-end="url(#ai09q5-arrow)"/>
  <path class="d-edge" d="M 795 104 L 720 146" marker-end="url(#ai09q5-arrow)"/>
  <path class="d-edge" d="M 556 185 L 454 185" marker-end="url(#ai09q5-arrow)"/>
  <path class="d-edge-dashed" d="M 350 146 L 340 104" marker-end="url(#ai09q5-arrow)"/>
</svg>

The dashed arrow is the loop that production code needs and demos skip: failed and expired items go back in as a new, much smaller batch.

## 3. What the Providers Document (October 2026)

| | Anthropic Message Batches | OpenAI Batch API | Google Gemini Batch Mode |
| :--- | :--- | :--- | :--- |
| Price | 50% of standard prices on all usage (docs) | 50% lower cost (OpenAI batch guide, as quoted in search results) | 50% of standard cost (Gemini docs, as quoted in search results) |
| Window | Most batches finish in under 1 hour; batches expire if not done in 24 hours (docs) | \`completion_window: "24h"\`, the only value in the SDK type | 24-hour target, most jobs sooner (as quoted) |
| Size limit | 100,000 requests or 256 MB per batch (docs) | Up to 50,000 requests and 200 MB per input file (SDK type docs) | Inline under 20 MB, larger as a JSONL file (as quoted) |
| Input | \`requests: [{ custom_id, params }]\` in the API call | JSONL file uploaded with purpose \`batch\`, each line \`{ custom_id, method, url, body }\` | Inline list or JSONL file |
| Endpoints | Messages | \`/v1/responses\`, \`/v1/chat/completions\`, \`/v1/embeddings\`, \`/v1/completions\`, \`/v1/moderations\`, image and video endpoints (SDK type docs) | Not checked here |
| Result order | Any order; match on \`custom_id\` (docs) | Match on \`custom_id\` | Not checked here |
| Per-item outcomes | \`succeeded\`, \`errored\`, \`canceled\`, \`expired\`; no charge for the last three (docs) | Batch statuses \`validating\`, \`in_progress\`, \`finalizing\`, \`completed\`, \`expired\`, \`cancelling\`, \`cancelled\`, \`failed\`; per-line failures in a separate error file | Not checked here |
| Rate limits | Separate limits on batch requests waiting to be processed (docs) | Separate pool of higher limits (guide, as quoted) | Higher limits than synchronous calls (Google launch post, July 2025) |
| Results kept | 29 days after creation (docs) | An output file in your Files storage | Not checked here |

Treat the numbers as a snapshot with a date: limits and supported endpoints change. The mechanism (ids, a window, per-item outcomes, half price, separate quota) has been stable across all three since launch.

## 4. When to Use It: the Decision

The question that decides it is not "how many requests" but **"who is waiting, and how long can they wait?"**

| Workload | Who waits | Path |
| :--- | :--- | :--- |
| Chat, copilot, agent the user is watching | A person, seconds | Real-time, [streamed](/interview-question/how-does-streaming-work-in-llm-apis-and-why-does-it-matter-for-ux) |
| Re-classify 2M tickets after a taxonomy change | Nobody; done by next week | Batch |
| Nightly or pre-release [eval suite](/interview-question/what-are-evals-and-why-does-every-llm-feature-need-them) | A developer, tomorrow morning | Batch (unless it gates a deploy in minutes) |
| Enrich a product catalogue, generate SEO descriptions | Nobody | Batch |
| Embeddings for a new corpus | An indexing job | Batch (OpenAI lists \`/v1/embeddings\`) or the embedding endpoint |
| One urgent document the CEO needs now | A person, minutes | Real-time |
| Multi-step agent where step 2 needs step 1 output | The pipeline | Real-time per step, or one batch per step |
| Low-priority work that should still answer in one call | A background worker | A flex or low-priority synchronous tier, if offered |

📌 **Interview term: asynchronous inference** — model work submitted now and collected later, decoupled from any waiting user. Batch APIs are the provider-managed form; your own queue plus off-peak workers is the self-managed form.

Two reasons beyond price:

- **It protects live traffic.** A backfill sent through the real-time API at 500 requests per minute takes 66.7 hours (worked below) and shares the rate limit your users depend on. In a batch it uses a separate quota.
- **It removes client-side machinery.** No concurrency limiter, no retry loop with backoff for every 429, no long-running worker holding connections (compare [resilient real-time calls](/interview-question/how-do-you-build-resilient-llm-calls-with-rate-limits-retries-and-fallbacks)). You still handle per-item failures, but once per batch.

## 5. A Batch Job End to End, Simulated

The example "Batch job with out-of-order results, retries and cost" plays the provider in-process: it builds JSONL lines in the OpenAI request shape, returns results in its own order with one \`errored\` and one \`expired\` item, then joins, retries and prices them.

**Join on the id, never by position.** Results arrive in the order \`106, 103, 108, 101, 104, 107, 102, 105\`. Zipping them with the inputs by position puts a label on the right ticket only 1 time out of 6; joining on \`custom_id\` gets 6 of 6. A positional join does not crash; it silently writes wrong labels into your database.

~~~js
const byId = new Map(out.map((o) => [o.custom_id, o]));        // the only correct join
const failed = [...byId.values()].filter((o) => o.result !== "succeeded");
const retryLines = lines.filter((l) => failed.some((f) => l.includes('"' + f.custom_id + '"')));
for (const o of runBatch(retryLines, {})) byId.set(o.custom_id, o);   // same ids, so retries overwrite
~~~

**Retry only what failed.** The two failures go into a follow-up batch of 2 and all 8 succeed. In real systems, look at *why* an item failed first: Anthropic's docs distinguish an \`invalid_request_error\` (fix the request before re-sending) from server errors (retry as is), and expired items are usually safe to resubmit.

**The money and the time.** Assumptions, all stated in the code: 2,000,000 requests a month, 1,200 input and 150 output tokens each, placeholder prices of $2.00 per million input tokens and $8.00 per million output tokens (substitute your model's real prices), batch at 50% off.

~~~text
monthly: 2000000 requests x (1200 in + 150 out) tokens
  real-time:              $7,200.00
  batch (50% off):        $3,600.00
  batch + prompt cache:   $2,520.00  (60% hits on a 1000-token prefix)
  real-time at 500 RPM:    66.7 hours of sending, sharing limits with live users
~~~

The last price line assumes the requests share a 1,000-token prefix (instructions and examples), that 60% of requests read it from cache, and that a cached read costs 10% of the normal input price. Anthropic's docs say batch and prompt-caching discounts **stack**, with cache hits "best-effort" and typical hit rates of 30% to 98%, and suggest the 1-hour cache duration because batches can take longer than the default 5-minute cache life. The simulation ignores cache-write premiums, so treat $2,520 as a rough lower bound, and check your provider's cache prices (see [prompt caching](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency)).

## 6. What the Real Calls Look Like

Not run here (they need API keys); shapes from the Anthropic batch docs and the \`openai@7.36.0\` types.

~~~ts
// Anthropic: requests go inline; poll; stream results
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
const batch = await client.messages.batches.create({
  requests: tickets.map((t) => ({
    custom_id: "ticket-" + t.id,
    params: { model: "MODEL_ID", max_tokens: 20, messages: [{ role: "user", content: "Label: " + t.text }] },
  })),
});
// later, from a scheduled job: wait until processing_status === "ended"
const status = await client.messages.batches.retrieve(batch.id);
if (status.processing_status === "ended") {
  for await (const r of await client.messages.batches.results(batch.id)) {
    if (r.result.type === "succeeded") save(r.custom_id, r.result.message);
    else queueForRetry(r.custom_id, r.result.type);
  }
}
~~~

~~~ts
// OpenAI: upload a JSONL file, then create the batch
import OpenAI from "openai";
import fs from "node:fs";
const client = new OpenAI();
const file = await client.files.create({ file: fs.createReadStream("input.jsonl"), purpose: "batch" });
const job = await client.batches.create({ input_file_id: file.id, endpoint: "/v1/chat/completions", completion_window: "24h" });
// later: client.batches.retrieve(job.id) until status is "completed", then download job.output_file_id
~~~

Frameworks are catching up: the \`ai@7.0.143\` package exports experimental batch functions (\`experimental_startBatch\`, \`experimental_getBatchStatus\`, \`experimental_getBatchResults\`), which wrap provider batch APIs behind the AI SDK interface; they are marked experimental.

## 7. Verified: Running the Code

\`node a.js\` and \`python3.12 a.py\` printed byte-identical output. The provider is simulated in-process: a fixed result order, two forced failures and a keyword "model". It stands in for the real upload, polling and download, and leaves out partial completion, quota errors, file storage and real latency. Prices are placeholders.

~~~text
input.jsonl: 8 lines, first line:
  {"custom_id":"ticket-101","method":"POST","url":"/v1/chat/completions","body":{"model":"MODEL","max_tokens":5,"messages":[{"role":"user","content":"Label: refund not received"}]}}

output order: 106, 103, 108, 101, 104, 107, 102, 105
positional join, labels on the right ticket: 1 of 6
custom_id join,  labels on the right ticket: 6 of 6
failed: ticket-104 (errored), ticket-107 (expired)
after retry sub-batch of 2: 8 of 8 succeeded

monthly: 2000000 requests x (1200 in + 150 out) tokens
  real-time:              $7,200.00
  batch (50% off):        $3,600.00
  batch + prompt cache:   $2,520.00  (60% hits on a 1000-token prefix)
  real-time at 500 RPM:    66.7 hours of sending, sharing limits with live users
  batch:                  results within the 24 h window, separate batch quota
~~~

## Edge Cases Worth Knowing

- **Jobs that expire half done.** Under heavy demand some requests can expire at 24 hours (Anthropic's docs say processing may slow with demand and more requests may expire). Always reconcile: every input id must end as succeeded or be queued again.
- **Large jobs.** Split millions of requests into several batches under the per-batch limits, and track them in your own table (batch id, ids inside, status), not just in the provider console.
- **Spend overshoot.** Anthropic notes batches may go slightly over a workspace spend limit because of concurrent processing; set budgets with margin.
- **Same quality, same models.** A batch request is an ordinary request; the answers are not worse. What changes is latency and price, so evals run on batch are valid evals.
- **Data retention.** Results stay downloadable for a limited time (29 days at Anthropic); copy them to your store as soon as the batch ends.
- **Flex tiers.** OpenAI's flex processing (\`service_tier: "flex"\`, in beta) is priced at Batch API rates but answers synchronously, more slowly, and can return a 429 with no charge when capacity is short (per OpenAI's flex guide as quoted in search results); Google documents a similar Flex tier. Useful when a worker wants one call and one answer but can tolerate slowness.

## Common Pitfalls

- **Joining results by position.** Output order is not input order; the run gets 1 of 6 right by position and 6 of 6 by \`custom_id\`.
- **Hard-coding synchronous calls in offline pipelines.** If the LLM step is behind a queue with a "mode" flag, switching a workload to batch is a config change, not a rewrite.
- **Not reconciling failures.** \`errored\` and \`expired\` items are not billed but also not done; without a retry sub-batch your backfill quietly has holes.
- **Retrying invalid requests unchanged.** A validation error will fail again; fix the request first.
- **Using batch for something a person is waiting on.** Most batches may finish within an hour, but the promise is 24 hours; never put it on an interactive path.
- **Forgetting the cache.** A shared instruction prefix across thousands of requests is the ideal prompt-caching case, and on some providers the discounts stack.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the rule:</strong> <span style="color:#f0e2c8;">If no person is waiting and results within hours are fine, I use the <strong style="color:#ffca28;">batch API</strong>: backfills, enrichment, eval suites, offline generation. Anything interactive stays real-time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain the mechanism:</strong> <span style="color:#f0e2c8;">I submit many independent requests, each with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">custom_id</code>; the provider processes them asynchronously within a 24-hour <strong style="color:#ffca28;">completion window</strong>; I poll, then download results that come back in any order with per-item outcomes like succeeded, errored or expired.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the economics:</strong> <span style="color:#f0e2c8;">Providers price batch at about half (Anthropic documents 50% of standard prices) on a separate quota. In my worked example 2 million tickets drop from $7,200 to $3,600, and to about $2,520 with prompt caching on a shared prefix, which Anthropic says stacks with the batch discount.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Protect live traffic:</strong> <span style="color:#f0e2c8;">The same backfill through the real-time API at 500 requests per minute is 66.7 hours of sending that shares the rate limit my users need. Batch uses its own pool, and I skip the client-side concurrency and backoff machinery.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the operational habits:</strong> <span style="color:#f0e2c8;">Join on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">custom_id</code>, never by position: in my run a positional join got 1 of 6 labels right. Reconcile every id, retry failed and expired items in a small follow-up batch, fix invalid requests before resending, and split big jobs under the per-batch limits.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is batch cheaper if it is the same model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the provider can schedule it: work that may take up to 24 hours fills idle capacity instead of needing capacity reserved for peaks. The output quality is the same; you trade latency for price. That is also why batch has its own rate limits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are the size limits?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They differ and change, so I check the docs at design time. As of October 2026, Anthropic documents 100,000 requests or 256 MB per batch with results kept for 29 days; the OpenAI SDK documents up to 50,000 requests and 200 MB per input file. Bigger jobs become several batches tracked in my own table.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you run evals on the batch API?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, for nightly or pre-release suites: they are large, independent and nobody needs them in seconds, so half price matters. If an eval gates a deploy in a CI pipeline that must finish in minutes, I run that small gating subset real-time and the full suite in batch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if one step depends on the previous step?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Batch requests are independent, so a dependent pipeline becomes one batch per stage: stage one finishes, I build stage two from its results, and submit again. If the total latency of several 24-hour windows is too long, those stages run real-time or on a flex tier.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a middle ground between batch and real-time?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: low-priority synchronous tiers. OpenAI flex processing (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">service_tier: "flex"</code>, beta) is priced at batch rates but answers in one call, more slowly, and may return a 429 with no charge when capacity is short; Google documents a similar Flex tier. Good for workers that want one request, one answer.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Batch API | Asynchronous endpoint that takes many independent requests and returns results within a window, at a discount |
| custom_id | Your id on each batch request; the only correct join key, also an idempotency key |
| Completion window | Time the provider promises to finish in (24 hours); unfinished items are reported as expired |
| Asynchronous inference | Model work submitted now and collected later, decoupled from any waiting user |

**Conclusion:** Choose a batch API when no person is waiting and results within hours are fine: backfills, enrichment, eval suites, offline generation. Providers document about half the price and a separate quota for it, so a two-million-request job costs roughly half as much and does not compete with live users, and caching a shared prefix can cut it further. The engineering is small but strict: an id on every request, results joined on that id because order is not guaranteed, every failed or expired item reconciled through a follow-up batch, and work split under per-batch limits. Name the rule, the discount and those three operational habits, and you have answered it.`,
    examples: [
      {
        label: `Batch job with out-of-order results, retries and cost`,
        variants: [
          { tech: "node", code: `// A batch job end to end with a simulated provider: build JSONL with custom_id,
// get results back out of order with failures, join by id, retry the failures,
// then compare the monthly bill and wall-clock time against real-time calls.

const tickets = ["refund not received", "app crashes on login", "change my plan", "invoice is wrong",
  "password reset loop", "cancel subscription", "dark mode request", "charged twice"];
const LABEL = { refund: "billing", invoice: "billing", charged: "billing", plan: "account", cancel: "account",
  crashes: "bug", password: "bug", dark: "feature" };
const label = (t) => LABEL[Object.keys(LABEL).find((k) => t.includes(k))];

// 1) One JSONL line per request; custom_id is the join key and the dedupe key.
const lines = tickets.map((t, i) => JSON.stringify({
  custom_id: "ticket-" + (101 + i), method: "POST", url: "/v1/chat/completions",
  body: { model: "MODEL", max_tokens: 5, messages: [{ role: "user", content: "Label: " + t }] },
}));
console.log("input.jsonl: " + lines.length + " lines, first line:");
console.log("  " + lines[0]);

// 2) Simulated provider: results in its own order; one bad request, one expired.
const ORDER = [5, 2, 7, 0, 3, 6, 1, 4];
function runBatch(reqLines, failIds) {
  return ORDER.filter((i) => i < reqLines.length).map((i) => {
    const r = JSON.parse(reqLines[i]);
    const t = r.body.messages[0].content.slice(7);
    if (failIds[r.custom_id]) return { custom_id: r.custom_id, result: failIds[r.custom_id] };
    return { custom_id: r.custom_id, result: "succeeded", label: label(t) };
  });
}
const out = runBatch(lines, { "ticket-104": "errored", "ticket-107": "expired" });
console.log("");
console.log("output order: " + out.map((o) => o.custom_id.slice(7)).join(", "));

// Wrong: zip results with inputs by position. Right: join on custom_id.
const truth = tickets.map(label);
const byPosition = out.filter((o, i) => o.result === "succeeded" && o.label === truth[i]).length;
const byId = new Map(out.map((o) => [o.custom_id, o]));
const ok = [...byId.values()].filter((o) => o.result === "succeeded");
console.log("positional join, labels on the right ticket: " + byPosition + " of " + ok.length);
console.log("custom_id join,  labels on the right ticket: " +
  ok.filter((o) => o.label === truth[Number(o.custom_id.slice(7)) - 101]).length + " of " + ok.length);

// 3) Retry only what failed, as a small follow-up batch (same custom_ids).
const failed = [...byId.values()].filter((o) => o.result !== "succeeded");
console.log("failed: " + failed.map((o) => o.custom_id + " (" + o.result + ")").join(", "));
const retryLines = lines.filter((l) => failed.some((f) => l.includes('"' + f.custom_id + '"')));
for (const o of runBatch(retryLines, {})) byId.set(o.custom_id, o);
const done = [...byId.values()].filter((o) => o.result === "succeeded").length;
console.log("after retry sub-batch of " + retryLines.length + ": " + done + " of " + tickets.length + " succeeded");

// 4) Monthly cost and time. Prices are placeholders: put in your model's price.
const REQS = 2000000, IN_TOK = 1200, OUT_TOK = 150;          // per request
const IN_PRICE = 200, OUT_PRICE = 800;                       // cents per million tokens
const BATCH = 0.5;                                           // providers quote 50% off
const PREFIX = 1000, CACHE_READ = 0.1, HIT = 0.6;            // shared prefix, cached-read price, hit rate
const cents = (inTok, outTok) => (inTok * IN_PRICE + outTok * OUT_PRICE) / 1e6;
const realtime = REQS * cents(IN_TOK, OUT_TOK);
const batch = realtime * BATCH;
const cachedIn = REQS * (HIT * (PREFIX * CACHE_READ + (IN_TOK - PREFIX)) + (1 - HIT) * IN_TOK);
const batchCache = BATCH * (cachedIn * IN_PRICE + REQS * OUT_TOK * OUT_PRICE) / 1e6;
const usd = (c) => "$" + (c / 100).toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
console.log("");
console.log("monthly: " + REQS + " requests x (" + IN_TOK + " in + " + OUT_TOK + " out) tokens");
console.log("  real-time:              " + usd(realtime));
console.log("  batch (50% off):        " + usd(batch));
console.log("  batch + prompt cache:   " + usd(batchCache) + "  (" + (100 * HIT) + "% hits on a " + PREFIX + "-token prefix)");
const RPM = 500;
console.log("  real-time at " + RPM + " RPM:    " + (REQS / RPM / 60).toFixed(1) + " hours of sending, sharing limits with live users");
console.log("  batch:                  results within the 24 h window, separate batch quota");` },
          { tech: "python", code: `# A batch job end to end with a simulated provider: build JSONL with custom_id,
# get results back out of order with failures, join by id, retry the failures,
# then compare the monthly bill and wall-clock time against real-time calls.
import json

tickets = ["refund not received", "app crashes on login", "change my plan", "invoice is wrong",
           "password reset loop", "cancel subscription", "dark mode request", "charged twice"]
LABEL = {"refund": "billing", "invoice": "billing", "charged": "billing", "plan": "account", "cancel": "account",
         "crashes": "bug", "password": "bug", "dark": "feature"}


def label(t):
    return LABEL[next(k for k in LABEL if k in t)]


def dumps(obj):
    return json.dumps(obj, separators=(",", ":"))


# 1) One JSONL line per request; custom_id is the join key and the dedupe key.
lines = [dumps({
    "custom_id": f"ticket-{101 + i}", "method": "POST", "url": "/v1/chat/completions",
    "body": {"model": "MODEL", "max_tokens": 5, "messages": [{"role": "user", "content": "Label: " + t}]},
}) for i, t in enumerate(tickets)]
print(f"input.jsonl: {len(lines)} lines, first line:")
print("  " + lines[0])

# 2) Simulated provider: results in its own order; one bad request, one expired.
ORDER = [5, 2, 7, 0, 3, 6, 1, 4]


def run_batch(req_lines, fail_ids):
    out = []
    for i in ORDER:
        if i >= len(req_lines):
            continue
        r = json.loads(req_lines[i])
        t = r["body"]["messages"][0]["content"][7:]
        if r["custom_id"] in fail_ids:
            out.append({"custom_id": r["custom_id"], "result": fail_ids[r["custom_id"]]})
        else:
            out.append({"custom_id": r["custom_id"], "result": "succeeded", "label": label(t)})
    return out


out = run_batch(lines, {"ticket-104": "errored", "ticket-107": "expired"})
print("")
print("output order: " + ", ".join(o["custom_id"][7:] for o in out))

# Wrong: zip results with inputs by position. Right: join on custom_id.
truth = [label(t) for t in tickets]
by_position = sum(1 for i, o in enumerate(out) if o["result"] == "succeeded" and o["label"] == truth[i])
by_id = {o["custom_id"]: o for o in out}
ok = [o for o in by_id.values() if o["result"] == "succeeded"]
print(f"positional join, labels on the right ticket: {by_position} of {len(ok)}")
right = sum(1 for o in ok if o["label"] == truth[int(o["custom_id"][7:]) - 101])
print(f"custom_id join,  labels on the right ticket: {right} of {len(ok)}")

# 3) Retry only what failed, as a small follow-up batch (same custom_ids).
failed = [o for o in by_id.values() if o["result"] != "succeeded"]
print("failed: " + ", ".join(f"{o['custom_id']} ({o['result']})" for o in failed))
retry_lines = [l for l in lines if any('"' + f["custom_id"] + '"' in l for f in failed)]
for o in run_batch(retry_lines, {}):
    by_id[o["custom_id"]] = o
done = sum(1 for o in by_id.values() if o["result"] == "succeeded")
print(f"after retry sub-batch of {len(retry_lines)}: {done} of {len(tickets)} succeeded")

# 4) Monthly cost and time. Prices are placeholders: put in your model's price.
REQS, IN_TOK, OUT_TOK = 2000000, 1200, 150  # per request
IN_PRICE, OUT_PRICE = 200, 800              # cents per million tokens
BATCH = 0.5                                 # providers quote 50% off
PREFIX, CACHE_READ, HIT = 1000, 0.1, 0.6    # shared prefix, cached-read price, hit rate


def cents(in_tok, out_tok):
    return (in_tok * IN_PRICE + out_tok * OUT_PRICE) / 1e6


realtime = REQS * cents(IN_TOK, OUT_TOK)
batch = realtime * BATCH
cached_in = REQS * (HIT * (PREFIX * CACHE_READ + (IN_TOK - PREFIX)) + (1 - HIT) * IN_TOK)
batch_cache = BATCH * (cached_in * IN_PRICE + REQS * OUT_TOK * OUT_PRICE) / 1e6


def usd(c):
    return f"\${c / 100:,.2f}"


print("")
print(f"monthly: {REQS} requests x ({IN_TOK} in + {OUT_TOK} out) tokens")
print(f"  real-time:              {usd(realtime)}")
print(f"  batch (50% off):        {usd(batch)}")
print(f"  batch + prompt cache:   {usd(batch_cache)}  ({100 * HIT:.0f}% hits on a {PREFIX}-token prefix)")
RPM = 500
print(f"  real-time at {RPM} RPM:    {REQS / RPM / 60:.1f} hours of sending, sharing limits with live users")
print("  batch:                  results within the 24 h window, separate batch quota")` },
        ],
      },
    ],
  },
];

export default augments;
