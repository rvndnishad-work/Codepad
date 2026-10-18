/**
 * Node.js gap batch 34 — Reliability: retries, queues, health checks,
 * logging. Brings five thin answers up to the full treatment.
 *
 * Verified in this batch, executed on this machine (Node v22.22.0):
 *   - Retries/timeouts: a plain fetch() to a server that never answers was
 *     still pending after 2000ms; with AbortSignal.timeout(300) it rejected
 *     with a TimeoutError. A retry wrapper (per-attempt timeout combined with
 *     an overall deadline via AbortSignal.any, retryable-status set,
 *     Retry-After, full-jitter backoff) was run against a scripted server:
 *     hang->503->ok succeeded on attempt 3; a 429 with Retry-After 0.3 waited
 *     ~300ms; a 400 was sent exactly once; an always-hanging downstream was
 *     cut off by the 700ms deadline at attempt 4 of 10. Retry amplification:
 *     3 retrying layers produced 27 calls to a failing database vs 3 when only
 *     one layer retried.
 *   - Job queue: a durable queue on node:sqlite (experimental; ran unflagged
 *     here with an ExperimentalWarning). Process 1 claimed a job and exited
 *     without acking; process 2 reclaimed it after its 300ms lease expired
 *     (attempt 2), retried a flaky job with 100/200ms backoff to success, and
 *     dead-lettered a poison job after 3 attempts. Both workers ran in one
 *     process — cross-process claiming was NOT separately tested.
 *   - Health checks: a service probed from a separate process showed
 *     readyz 503 while warming up, 200 when warm, both probes timing out
 *     during a 600ms event-loop stall, and readyz 503 "draining" after
 *     SIGTERM while livez stayed 200; the process exited with code 0.
 *   - Express errors: Express 4.22.3 vs 5.3.0 side by side. Sync throws
 *     reached the error middleware on both; an async throw left the request
 *     hanging on Express 4 (and crashed the process with no
 *     unhandledRejection listener) but returned a 500 on Express 5; a throw
 *     inside setTimeout crashed Express 5 too; a 3-parameter error handler was
 *     skipped on both. Layer source excerpts copied from the installed
 *     packages (express 4 lib/router/layer.js, router 2.2.0 lib/layer.js).
 *   - Logging: a built-ins-only JSON logger with AsyncLocalStorage request
 *     ids kept two concurrent requests correctly correlated, redacted bearer
 *     tokens, serialized an Error (JSON.stringify(new Error) is "{}"), and
 *     dropped debug lines at info level. pino 10.4.0 reproduced it; a pino
 *     mixin returning the shared ALS store was found to have fields merged
 *     into it, leaking them onto later lines — fixed by returning a copy.
 *
 * Version / product facts checked via web search, not asserted from memory:
 *   - AbortSignal.timeout added in v17.3.0 / v16.14.0 (Node globals docs).
 *   - Node 15 changed the default unhandled-rejection mode to throw.
 *   - Express v5 announced 2024-10-15; Express 5 forwards rejected handler
 *     promises to next(). node:sqlite first appeared in v22.5.0.
 *   - Kubernetes probe semantics (readiness removes from Service endpoints,
 *     liveness restarts, startup probe gates both).
 *   - SQS visibility timeout and maxReceiveCount -> DLQ (AWS docs).
 *   - pino transports run in a worker thread (pino docs).
 *   - The version that added AbortSignal.any could not be confirmed, so the
 *     answer does not state one.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle retries and timeouts when a Node.js service calls another downstream service?",
    seoDescription:
      "Bound every downstream call with a per-attempt timeout and an overall deadline, retry only transient errors with jittered backoff, and avoid retry storms.",
    description: `**Question presented to candidate:**
"Your Node.js order service calls an inventory service over HTTP. Sometimes inventory is slow, sometimes it returns a 503, and once it simply never answered and your request handlers piled up. How do you put timeouts and retries around that call so one sick dependency cannot take your service down with it?"

**What a strong answer should cover:**
- Every outbound call needs a **timeout**: with no timeout, a downstream that accepts the connection and never answers leaves the request pending indefinitely (\`fetch\` has no short default). In Node that means \`AbortSignal.timeout(ms)\` or an \`AbortController\` passed as \`signal\`.
- Two different limits: a **per-attempt timeout** and an **overall deadline** for the whole operation, combined with \`AbortSignal.any([...])\` so retries can never run past what the caller is willing to wait.
- **Retry only what is safe and likely to succeed**: timeouts, connection resets, 502/503/504, 429 (honouring \`Retry-After\`) — never a 400/401/404, and only retry non-idempotent writes (POST) with an **idempotency key**.
- **Exponential backoff with jitter** between attempts, a small attempt cap, and awareness of **retry amplification** (3 retrying layers of 3 tries = 27 calls to the bottom service — retry at one layer).
- Retries are not the whole story: a **circuit breaker** stops calling a dependency that is clearly down, and a concurrency limit (bulkhead) stops slow calls from using every socket.

**Clarifying questions expected:**
- "Is the downstream call idempotent — a read, or a write that could double-charge or double-reserve if repeated?"
- "What is the caller's own latency budget (the SLA of the endpoint that makes this call)?"
- "Are there several layers of services in the chain that might each already retry?"

**Code / implementation expected:** Yes — a small \`fetch\` wrapper with a per-attempt timeout, an overall deadline, a retryable-error check, and jittered backoff, run against a deliberately flaky local server.`,
    answer: `**Target Audience:** Backend engineers preparing for Node.js reliability and microservices interviews.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every output block below was produced by **actually running** the code with Node 22 against a local HTTP server scripted to hang, return 503, return 429, or return 400 on demand. Timings include random jitter, so your milliseconds will differ slightly; the order of events will not.

## 1. Why This Even Matters — A Story First

You phone a supplier to check stock. If nobody picks up, you do not stand there holding the phone all afternoon — you hang up after a minute and try again. If they say "we are swamped, call back in five minutes", you wait five minutes, not five seconds. If they say "that product code does not exist", calling back will not change the answer. And you have a rule: whatever happens, the customer in front of you gets an answer within ten minutes.

That is the whole topic. Hanging up is a **timeout**. Calling back is a **retry**. Waiting longer each time is **backoff**. "Product code does not exist" is a **non-retryable error**. The ten-minute promise to the customer is a **deadline**. A Node service that calls other services needs all five, written down in code.

## 2. Why "no timeout" is the most dangerous default

A downstream service failing fast is easy to live with — you get an error and move on. The dangerous case is a downstream that accepts the TCP connection and then never answers. Every request that touches it waits, holding a socket, memory, and often a database connection, until the event loop is juggling thousands of stuck requests.

📌 **Interview term: timeout** — an upper bound on how long you will wait for one operation before abandoning it. In modern Node the standard tool is an \`AbortSignal\` passed to \`fetch\` (or any API that accepts \`signal\`): \`AbortSignal.timeout(ms)\` creates one that aborts itself after \`ms\` milliseconds. Node's docs list \`AbortSignal.timeout\` as added in v17.3.0 and v16.14.0 ([Node.js globals docs](https://nodejs.org/api/globals.html)).

Verified against a server whose handler never calls \`res.end()\`:

~~~
no timeout   : still pending after 2000ms
timeout 300ms: rejected: TimeoutError (The operation was aborted due to timeout)
~~~

Without a signal, the \`fetch\` was still pending after two seconds and would have kept waiting. With \`AbortSignal.timeout(300)\`, it rejected with an error whose \`name\` is \`"TimeoutError"\` — which is how retry code tells "we gave up waiting" apart from other failures. (For more on cancellation itself, see [AbortSignal.timeout and cancelling async work](/interview-question/what-is-abortsignal-timeout-and-how-do-you-cancel-async-work-cleanly).)

## 3. Two Limits, Not One

A single timeout is not enough once you add retries. You need two:

- 📌 **Interview term: per-attempt timeout** — how long one try may take. It stops one hung connection from eating the whole budget.
- 📌 **Interview term: deadline (time budget)** — how long the *whole operation*, including every retry and every backoff sleep, may take. It protects your caller. A useful rule: the deadline should be shorter than the timeout of whoever is calling *you*, or your retries finish after the caller has already given up.

In Node you combine them with \`AbortSignal.any([...])\`, which returns a signal that aborts as soon as *any* of its inputs aborts:

~~~js
const deadline = AbortSignal.timeout(deadlineMs);          // created once, for the whole call
for (let attempt = 1; ; attempt++) {
  const signal = AbortSignal.any([AbortSignal.timeout(perAttemptMs), deadline]);
  const res = await fetch(url, { signal });                 // aborts on whichever fires first
  // ...
}
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="One overall deadline of one thousand milliseconds contains three bounded attempts separated by backoff sleeps: the first attempt is cut by its two hundred millisecond timeout, the second gets a 503, the third succeeds">
  <defs>
    <marker id="rt-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">One deadline, several bounded attempts</text>
  <rect class="d-box" x="24" y="40" width="592" height="40" rx="8"/>
  <text class="d-sub" x="320" y="65" text-anchor="middle">overall deadline: 1000 ms for the whole call</text>
  <rect class="d-box-muted" x="24" y="110" width="140" height="56" rx="10"/>
  <text class="d-text" x="94" y="133" text-anchor="middle">attempt 1</text>
  <text class="d-sub" x="94" y="153" text-anchor="middle">cut at 200 ms</text>
  <rect class="d-box-muted" x="214" y="110" width="140" height="56" rx="10"/>
  <text class="d-text" x="284" y="133" text-anchor="middle">attempt 2</text>
  <text class="d-sub" x="284" y="153" text-anchor="middle">503, retryable</text>
  <rect class="d-box-accent" x="404" y="110" width="140" height="56" rx="10"/>
  <text class="d-text d-accent" x="474" y="133" text-anchor="middle">attempt 3</text>
  <text class="d-sub" x="474" y="153" text-anchor="middle">200 OK</text>
  <path class="d-edge" d="M 166 138 L 210 138" marker-end="url(#rt-arrow)"/>
  <path class="d-edge" d="M 356 138 L 400 138" marker-end="url(#rt-arrow)"/>
</svg>

The arrows between attempts are the backoff sleeps. They also live inside the deadline, which is why the sleep itself must be cancellable by the deadline signal.

## 4. What to Retry — and What Never to Retry

📌 **Interview term: transient vs. permanent failure** — a transient failure might succeed if you try again (an overloaded server, a dropped connection); a permanent one will fail the same way every time (bad input, missing auth, unknown resource). Only transient failures are worth a retry.

| Outcome | Retry? | Why |
| :--- | :--- | :--- |
| Per-attempt timeout (\`TimeoutError\`) | Yes | The server may just be slow right now |
| \`ECONNRESET\`, \`ECONNREFUSED\` during a deploy | Yes, briefly | Instances restart; another one may answer |
| 502 / 503 / 504 | Yes | Gateway or overload errors, usually temporary |
| 429 Too Many Requests | Yes, after \`Retry-After\` | The server told you exactly when to come back |
| 400 / 401 / 403 / 404 / 422 | **No** | Same request, same answer — retrying just adds load |
| Overall deadline exceeded | **No** | The caller has stopped waiting; stop working for them |

📌 **Interview term: idempotent** — an operation that has the same effect whether it runs once or five times. GET, PUT and DELETE are idempotent by HTTP semantics; a POST that creates an order is not. This matters because a timeout does **not** tell you whether the server did the work — maybe it did, and only the response was lost. Retrying a non-idempotent call can charge a card twice. The standard fix is an **idempotency key** sent with every attempt so the server can recognise repeats; see [API idempotency and idempotent endpoints](/interview-question/what-is-api-idempotency-and-how-would-you-design-idempotent-endpoints-in-a-node-).

## 5. Verified: the Wrapper Against a Flaky Server

The full program is the first example below. It starts a local server whose behaviour per request is scripted (\`hang\`, \`503\`, \`429\`, \`400\`, \`ok\`) and calls it through \`callWithRetry\` with \`attempts = 4\`, \`perAttemptMs = 200\`, \`deadlineMs = 1000\` and a 50 ms backoff base. The core of the loop:

~~~js
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
// ...
if (res.ok) return body;
if (!RETRYABLE_STATUS.has(res.status)) throw new Error(\`HTTP \${res.status}\`);  // 4xx: stop now
retryAfterMs = Number(res.headers.get("retry-after") ?? 0) * 1000;
// ...
const backoff = Math.random() * baseMs * 2 ** (attempt - 1);   // full jitter
await sleep(Math.max(backoff, retryAfterMs), deadline);         // sleep is cancelled by the deadline
~~~

Actual output of \`node retry.js\`:

~~~
A. hang then 503 then ok  (server script: hang, 503, ok)
  [ 206ms] attempt 1: TimeoutError after 200ms -> retryable
  [ 234ms] attempt 2: 503 -> retryable
  [ 245ms] attempt 3: 200 ok
  => success, downstream saw 3 request(s)
B. 429 with Retry-After: 0.3  (server script: 429, ok)
  [   3ms] attempt 1: 429 -> retryable
  [ 306ms] attempt 2: 200 ok
  => success, downstream saw 2 request(s)
C. 400 is the caller fault  (server script: 400, ok)
  [   2ms] attempt 1: 400 -> not retryable, giving up
  => failed: HTTP 400, downstream saw 1 request(s)
D. downstream hangs forever  (server script: hang, hang, hang, hang, hang)
  [ 201ms] attempt 1: TimeoutError after 200ms -> retryable
  [ 404ms] attempt 2: TimeoutError after 200ms -> retryable
  [ 650ms] attempt 3: TimeoutError after 200ms -> retryable
  [ 701ms] attempt 4: overall deadline hit -> stop
  => failed: deadline exceeded, downstream saw 4 request(s)
~~~

What each scenario proves:

- **A** — the per-attempt timeout turned a hang into a quick, retryable failure; the call still succeeded at about 245 ms, well inside its budget.
- **B** — the server asked for 0.3 s, so the wrapper waited about 300 ms instead of its own small backoff. Honouring \`Retry-After\` is what a polite client does.
- **C** — a 400 was not retried even though the script would have returned \`ok\` on the next request. The downstream saw exactly one request.
- **D** — scenario D allowed 10 attempts but set a 700 ms deadline. The deadline won: the fourth attempt was aborted at about 701 ms and the loop stopped. Without the deadline, 10 hung attempts would have taken over two seconds.

📌 **Interview term: exponential backoff with full jitter** — wait a random time between 0 and \`base × 2^(attempt − 1)\` before each retry. The exponential part gives an overloaded service more breathing room each round; the random part stops a thousand clients that failed at the same moment from retrying at the same moment. The formula and the measured spread are covered in depth in [retries with exponential backoff and jitter](/interview-question/how-do-you-implement-retries-with-exponential-backoff-and-jitter).

## 6. Verified: Retry Amplification

Retries feel free inside one service. Across a chain of services they multiply.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 140" role="img" aria-label="A gateway calls service B which calls service C which calls a database; with three attempts at each layer the database receives twenty seven calls for one user request">
  <defs>
    <marker id="amp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Three retrying layers multiply load</text>
  <rect class="d-box-muted" x="20" y="50" width="110" height="56" rx="10"/>
  <text class="d-text" x="75" y="73" text-anchor="middle">gateway</text>
  <text class="d-sub" x="75" y="93" text-anchor="middle">3 tries</text>
  <rect class="d-box-muted" x="180" y="50" width="110" height="56" rx="10"/>
  <text class="d-text" x="235" y="73" text-anchor="middle">service B</text>
  <text class="d-sub" x="235" y="93" text-anchor="middle">9 tries</text>
  <rect class="d-box-muted" x="340" y="50" width="110" height="56" rx="10"/>
  <text class="d-text" x="395" y="73" text-anchor="middle">service C</text>
  <text class="d-sub" x="395" y="93" text-anchor="middle">27 tries</text>
  <rect class="d-box-accent" x="500" y="50" width="120" height="56" rx="10"/>
  <text class="d-text d-accent" x="560" y="73" text-anchor="middle">database</text>
  <text class="d-sub" x="560" y="93" text-anchor="middle">27 calls</text>
  <path class="d-edge" d="M 132 78 L 176 78" marker-end="url(#amp-arrow)"/>
  <path class="d-edge" d="M 292 78 L 336 78" marker-end="url(#amp-arrow)"/>
  <path class="d-edge-accent" d="M 452 78 L 496 78" marker-end="url(#amp-arrow)"/>
</svg>

Actual output of \`node amplify.js\` (second example), where the database always throws:

~~~
retry at every layer (3,3,3): 1 user request -> 27 calls to the failing database
retry at one layer only (1,1,3): 1 user request -> 3 calls to the failing database
~~~

📌 **Interview term: retry amplification (retry storm)** — when every layer retries, attempts multiply (3 × 3 × 3 = 27), so a struggling dependency gets nine times more traffic exactly when it can least handle it. The fix is to retry at **one** layer, have upper layers fail fast, and pass the remaining deadline down the chain (often as a request header) so lower layers stop when the caller would have stopped anyway.

## 7. Retries Are Not Enough on Their Own

Retries handle blips. They make real outages worse: each request still pays the full timeout, several times. Production services add:

- **Circuit breaker** — after enough failures, stop calling the dependency for a cool-down period and fail instantly. Covered with a verified state-machine demo in [implementing a circuit breaker](/interview-question/how-do-you-implement-a-circuit-breaker-for-unreliable-downstream-services).
- **Bulkhead / concurrency limit** — cap how many calls to one dependency can be in flight, so a slow dependency cannot consume every socket or every pending promise. See [limiting async concurrency](/interview-question/how-do-you-limit-the-concurrency-of-many-async-operations-p-limit-promise-pool).
- **Retry budget** — allow retries only up to a fraction (say 10%) of normal traffic, so a widespread outage does not double your outbound load.
- **Fallbacks** — a cached value or a degraded response when the dependency is unavailable and the feature can live without it.

## 8. Common Pitfalls

- **No timeout at all.** Verified above: a plain \`fetch\` to a server that never answers was still pending after two seconds. Every outbound call — HTTP, database, Redis, gRPC — needs a bound.
- **A per-attempt timeout but no overall deadline.** \`attempts × timeout + backoff\` can exceed what your own caller allows, so you keep working for a client that already gave up (scenario D shows the deadline cutting this off).
- **Retrying 4xx errors.** A 400 or 404 will fail identically every time; retrying only adds load and latency. Scenario C sent exactly one request.
- **Retrying non-idempotent writes without an idempotency key.** A timeout does not mean the work was not done; a blind retry can create duplicates.
- **Fixed delays or no jitter.** Many clients that failed together retry together, producing synchronized waves of load against a recovering service.
- **Forgetting that the backoff sleep must also respect the deadline.** A \`setTimeout\` that ignores the signal can sleep past the deadline; the demo passes \`deadline\` into \`sleep\` so the wait is cancelled too.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Timeouts first:</strong> <span style="color:#f0e2c8;">Every outbound call gets a timeout. With none, a server that never answers keeps the request pending — I watched a plain <code style="background:#332310;color:#ffca28;">fetch</code> still pending after 2 seconds.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two limits, not one:</strong> <span style="color:#f0e2c8;">A per-attempt timeout plus one overall deadline, combined with <code style="background:#332310;color:#ffca28;">AbortSignal.any</code>, so retries can never outlive what the caller will wait.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Retry only transient failures:</strong> <span style="color:#f0e2c8;">Timeouts, resets, 502/503/504 and 429 with <code style="background:#332310;color:#ffca28;">Retry-After</code>. Never a 400 — the same bad input fails the same way.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Back off with jitter, cap attempts:</strong> <span style="color:#f0e2c8;">Exponential backoff with full jitter so clients do not retry in lockstep, three or four attempts at most, and only one layer of the call chain retries.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Know the limits of retries:</strong> <span style="color:#f0e2c8;">Retries fix blips, not outages. A circuit breaker stops calling a dependency that is down, and writes need an idempotency key before they are retried.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need both a per-attempt timeout and an overall deadline?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They protect different things. The per-attempt timeout stops one hung connection from eating the whole budget — in the demo the first attempt hung and was cut at about 200 ms, leaving time for a second try that got a 503 and a third that succeeded. The overall deadline protects the caller: in scenario D every attempt hung, and the 700 ms deadline stopped the loop at attempt 4 even though 10 attempts were allowed. Without the deadline, 10 attempts at 200 ms plus backoff could run for over two seconds while the user who triggered it has long gone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it safe to retry a POST that creates an order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by itself. A timeout does not tell you whether the server did the work — the request may have been processed and only the response lost. Retrying then creates a second order. The fix is an idempotency key: the client generates one id per logical operation, sends it on every attempt (for example an <code style="background:#332310;color:#ffca28;">Idempotency-Key</code> header), and the server stores the result under that key and returns the stored result for repeats. GET, PUT and DELETE are idempotent by HTTP semantics, so they are safe to retry as long as the server implements them that way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where in a chain of services should the retries live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually at one layer — normally the one closest to the failing dependency, or the edge, but not both. The amplification demo shows why: gateway, service B and service C each retrying 3 times turned one user request into 27 calls to a database that was already down, while retrying only at the bottom layer made 3. Upper layers should fail fast and pass a deadline down (for example a header with the remaining budget) so the lower layer knows when to stop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you respect a 429 or a 503 with Retry-After?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Read the header and wait at least that long — in the demo the server sent <code style="background:#332310;color:#ffca28;">Retry-After: 0.3</code> and the second attempt went out at about 306 ms instead of after the 50 ms backoff. <code style="background:#332310;color:#ffca28;">Retry-After</code> can be seconds or an HTTP date, so a real parser handles both, and if the requested wait is longer than the remaining deadline, give up at once rather than sleep past the deadline.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is a circuit breaker different from a retry policy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A retry policy decides what to do with one failed call. A circuit breaker watches many calls and, once the failure rate is high, stops making calls at all for a cool-down period, failing immediately. Retries alone keep paying the full timeout on every request during a real outage; the breaker turns that into instant failures and gives the dependency room to recover. They are used together: retries inside, breaker around them.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Timeout** | The longest you will wait for one operation before abandoning it |
| **Per-attempt timeout** | The bound on a single try, so one hung connection cannot eat the whole budget |
| **Deadline / time budget** | The bound on the whole operation, retries and sleeps included |
| **\`AbortSignal.timeout(ms)\`** | A signal that aborts itself after \`ms\`; \`fetch\` then rejects with a \`TimeoutError\` |
| **\`AbortSignal.any([...])\`** | A signal that aborts when any of the given signals aborts |
| **Transient failure** | A failure that may succeed on retry (timeout, 503, reset) |
| **Idempotent** | Safe to run more than once with the same effect |
| **Exponential backoff with jitter** | Random waits that grow exponentially between retries |
| **Retry amplification** | Retries at several layers multiplying load on the bottom service |
| **Circuit breaker** | Stops calling a failing dependency for a while and fails fast instead |

---
**Conclusion:** a downstream call in Node is safe only when it is bounded twice — a per-attempt timeout (\`AbortSignal.timeout\`) so one hung connection cannot stall you, and an overall deadline combined in with \`AbortSignal.any\` so retries cannot outlive the caller. Inside that budget, retry only transient failures (timeouts, resets, 502/503/504, 429 after \`Retry-After\`), never 4xx errors, and never a non-idempotent write without an idempotency key, with jittered exponential backoff and a small attempt cap. The runs above show each rule doing its job: a hang turned into a fast retry, a 429 respected, a 400 sent once, a dead dependency cut off by the deadline, and the 27-versus-3 call count that explains why only one layer of a call chain should retry. Retries handle blips; circuit breakers and concurrency limits handle outages.`,
    examples: [
      {
        label: "fetch wrapper: per-attempt timeout, overall deadline (AbortSignal.any), retryable-status check, Retry-After and jittered backoff, against a scripted flaky server",
        tech: "javascript",
        runnable: false,
        code: `// Per-attempt timeout + overall deadline + retry only what is safe to retry.
const http = require("node:http");

// A flaky downstream: behaviour per request is scripted by the test.
let script = [];
let hits = 0;
const server = http.createServer((req, res) => {
  hits++;
  const step = script.shift() ?? "ok";
  if (step === "hang") return; // never answers: only a timeout saves us
  if (step === "503") { res.statusCode = 503; return res.end("busy"); }
  if (step === "429") { res.statusCode = 429; res.setHeader("retry-after", "0.3"); return res.end("slow down"); }
  if (step === "400") { res.statusCode = 400; return res.end("bad input"); }
  res.end("ok");
});

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); reject(signal.reason); }, { once: true });
});

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

async function callWithRetry(url, { attempts = 4, perAttemptMs = 200, deadlineMs = 1000, baseMs = 50 } = {}) {
  const deadline = AbortSignal.timeout(deadlineMs);      // total budget for the whole call
  const t0 = Date.now();
  const log = (msg) => console.log(\`  [\${String(Date.now() - t0).padStart(4)}ms] \${msg}\`);
  for (let attempt = 1; ; attempt++) {
    // each attempt aborts on EITHER its own timeout OR the overall deadline
    const signal = AbortSignal.any([AbortSignal.timeout(perAttemptMs), deadline]);
    let retryAfterMs = 0;
    try {
      const res = await fetch(url, { signal });
      const body = await res.text();
      if (res.ok) { log(\`attempt \${attempt}: \${res.status} \${body}\`); return body; }
      if (!RETRYABLE_STATUS.has(res.status)) {
        log(\`attempt \${attempt}: \${res.status} -> not retryable, giving up\`);
        throw new Error(\`HTTP \${res.status}\`);
      }
      retryAfterMs = Number(res.headers.get("retry-after") ?? 0) * 1000;
      log(\`attempt \${attempt}: \${res.status} -> retryable\`);
    } catch (err) {
      if (err.message.startsWith("HTTP 4")) throw err;
      if (deadline.aborted) { log(\`attempt \${attempt}: overall deadline hit -> stop\`); throw new Error("deadline exceeded"); }
      if (err.name !== "TimeoutError") throw err;
      log(\`attempt \${attempt}: \${err.name} after \${perAttemptMs}ms -> retryable\`);
    }
    if (attempt === attempts) { log("out of attempts"); throw new Error("retries exhausted"); }
    // full jitter, but never less than what the server asked for
    const backoff = Math.random() * baseMs * 2 ** (attempt - 1);
    const wait = Math.max(backoff, retryAfterMs);
    await sleep(wait, deadline).catch(() => {});
    if (deadline.aborted) { log("overall deadline hit while backing off -> stop"); throw new Error("deadline exceeded"); }
  }
}

server.listen(0, async () => {
  const url = \`http://localhost:\${server.address().port}/\`;
  const run = async (name, steps, opts) => {
    script = steps; hits = 0;
    console.log(\`\${name}  (server script: \${steps.join(", ") || "ok"})\`);
    try { await callWithRetry(url, opts); console.log(\`  => success, downstream saw \${hits} request(s)\`); }
    catch (e) { console.log(\`  => failed: \${e.message}, downstream saw \${hits} request(s)\`); }
  };
  await run("A. hang then 503 then ok", ["hang", "503", "ok"]);
  await run("B. 429 with Retry-After: 0.3", ["429", "ok"]);
  await run("C. 400 is the caller fault", ["400", "ok"]);
  await run("D. downstream hangs forever", ["hang", "hang", "hang", "hang", "hang"], { attempts: 10, deadlineMs: 700 });
  server.close(); server.closeAllConnections();
});`,
      },
      {
        label: "Retry amplification: three layers that each retry 3 times turn one user request into 27 calls",
        tech: "javascript",
        runnable: false,
        code: `// Retry amplification: every layer retries 3 times, the bottom one is down.
let dbCalls = 0;
const db = async () => { dbCalls++; throw new Error("db down"); };
const withRetries = (fn, attempts) => async () => {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) { if (i === attempts) throw e; }
  }
};
async function main() {
  for (const [label, a, b, c] of [["retry at every layer (3,3,3)", 3, 3, 3], ["retry at one layer only (1,1,3)", 1, 1, 3]]) {
    dbCalls = 0;
    const serviceC = withRetries(db, c);
    const serviceB = withRetries(serviceC, b);
    const gateway = withRetries(serviceB, a);
    await gateway().catch(() => {});
    console.log(\`\${label}: 1 user request -> \${dbCalls} calls to the failing database\`);
  }
}
main();`,
      },
      {
        label: "No timeout vs AbortSignal.timeout against a server that never answers",
        tech: "javascript",
        runnable: false,
        code: `// What happens with no timeout at all: the call just waits.
const http = require("node:http");
const server = http.createServer(() => { /* never responds */ });
server.listen(0, async () => {
  const url = \`http://localhost:\${server.address().port}/\`;
  const p = fetch(url).then(() => "settled", (e) => "rejected: " + e.name);
  const timer = new Promise((r) => setTimeout(() => r("still pending after 2000ms"), 2000));
  console.log("no timeout   :", await Promise.race([p, timer]));
  const q = await fetch(url, { signal: AbortSignal.timeout(300) }).then(() => "settled", (e) => \`rejected: \${e.name} (\${e.message})\`);
  console.log("timeout 300ms:", q);
  server.closeAllConnections(); server.close(); process.exit(0);
});`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How would you design a job queue / background task processor in Node.js?",
    seoDescription:
      "Design a Node.js job queue: durable store, atomic lease-based claims, bounded concurrency, backoff retries, a dead-letter queue and idempotent jobs.",
    description: `**Question presented to candidate:**
"Our Node.js API does slow work inside the request — sending emails, generating PDF invoices, calling a payment provider's webhook. Requests are slow and, when a pod restarts, some of that work is simply lost. Design a background job processor for us: what are the pieces, how does a job move through it, and what happens when a worker crashes halfway through a job?"

**What a strong answer should cover:**
- The pieces: **producers** enqueue a small job record into a **durable store** (Redis via BullMQ, Postgres, SQS…) and return immediately; **workers** in separate processes claim jobs, run them with a **bounded concurrency**, and **acknowledge** on success.
- **Claiming must be atomic** and protected by a **lease / visibility timeout**: a crashed worker never acks, the lease expires, and another worker picks the job up. This makes delivery **at-least-once**, so handlers must be **idempotent**.
- **Retries with exponential backoff**, a **max-attempts** limit, and a **dead-letter queue** for jobs that keep failing (poison messages) — with alerting on it.
- Operational concerns: **graceful shutdown** (stop claiming, finish in-flight work), **scheduling/delays and priorities**, keeping CPU-heavy jobs off the event loop (worker threads or separate processes), and **observability** (queue depth, age of oldest job, failure rate).
- A rough **capacity estimate**: jobs per second at peak × average job duration = jobs in flight → number of worker processes.

**Clarifying questions expected:**
- "What volume and latency do we need — thousands per day or thousands per second, and must a job start within seconds or is minutes fine?"
- "Can a job safely run twice, and does ordering matter (per user, per account)?"
- "What infrastructure already exists — Redis, Postgres, a cloud queue?"

**Code / implementation expected:** Yes — a sketch of the job lifecycle; a small durable queue with an atomic lease-based claim, backoff retries and a dead state, shown recovering a job after a simulated crash, makes the at-least-once point concrete.`,
    answer: `**Target Audience:** Backend engineers preparing for Node.js system design interviews.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The queue in section 7 is a real, durable implementation on Node's built-in \`node:sqlite\` module; its output was produced by **actually running** it in two separate processes, the first of which crashes on purpose. For the shorter "what is a job queue and when do I need one" version of this topic, see [background job queues with BullMQ/Redis](/interview-question/what-is-a-background-job-queue-bullmq-redis-and-when-do-you-need-one).

## 1. Why This Even Matters — A Story First

A busy restaurant does not make the waiter stand at the stove until your steak is cooked. The waiter writes a ticket, pins it on the rail, and goes back to the tables. Cooks take tickets off the rail, one cook per ticket, and when a dish is done they ring the bell. If a cook walks out mid-order, the ticket is still on the rail, so another cook picks it up. If an order is impossible ("we are out of that fish"), it goes to the manager instead of being cooked again and again.

A job queue is that rail. The API is the waiter, the **job** is the ticket, the **workers** are the cooks, ringing the bell is the **acknowledgement**, and the manager is the **dead-letter queue**. The design question is really: how do you make sure no ticket is lost, no ticket is cooked by two cooks at once by accident, and impossible tickets do not block the kitchen?

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What volume — jobs per day, and the peak per second? | Decides whether Postgres is enough or you need Redis or a managed queue, and how many workers |
| How fast must a job start after it is enqueued? | Seconds allows polling; sub-second needs a push-based store or short poll intervals |
| Can a job safely run twice? | Leases make delivery at-least-once; non-idempotent jobs need deduplication |
| Does order matter — globally, or per user/account? | Strict ordering limits parallelism; per-key ordering needs partitioning |
| Are jobs I/O-bound (email, HTTP) or CPU-bound (PDF, images)? | CPU-bound jobs must not run on the worker event loop |
| What infrastructure exists already? | Running one more system (Redis, a broker) has a real operational cost |

## 3. The Pieces

<svg class="iq-diagram" width="100%" viewBox="0 0 640 150" role="img" aria-label="The API enqueues a job into a durable store and responds immediately; a pool of worker processes claims jobs from the store, runs them, and acknowledges them">
  <defs>
    <marker id="jq-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Producers and workers never talk directly</text>
  <rect class="d-box-muted" x="24" y="50" width="160" height="60" rx="10"/>
  <text class="d-text" x="104" y="74" text-anchor="middle">API (producer)</text>
  <text class="d-sub" x="104" y="94" text-anchor="middle">enqueue, reply 202</text>
  <rect class="d-box-accent" x="240" y="50" width="160" height="60" rx="10"/>
  <text class="d-text d-accent" x="320" y="74" text-anchor="middle">durable store</text>
  <text class="d-sub" x="320" y="94" text-anchor="middle">Redis, Postgres, SQS</text>
  <rect class="d-box-muted" x="456" y="50" width="160" height="60" rx="10"/>
  <text class="d-text" x="536" y="74" text-anchor="middle">worker processes</text>
  <text class="d-sub" x="536" y="94" text-anchor="middle">claim, run, ack</text>
  <path class="d-edge" d="M 186 80 L 236 80" marker-end="url(#jq-arrow)"/>
  <path class="d-edge-accent" d="M 452 80 L 404 80" marker-end="url(#jq-arrow)"/>
</svg>

- 📌 **Interview term: producer** — code that creates a job. It writes a *small* record (\`{ type: "send-invoice", payload: { orderId: 42 } }\`, not the whole PDF) and returns, typically with \`202 Accepted\` and a job id the client can poll.
- 📌 **Interview term: durable store** — where jobs live until they are done. Durable means the job survives a process restart. An in-memory array is not a queue for this purpose: it dies with the pod, which is exactly the "work is lost on restart" bug in the prompt.
- 📌 **Interview term: worker** — a separate process (or several) that loops: claim a job, run its handler, acknowledge. Each worker runs several jobs at once up to a **concurrency limit**, because I/O-bound jobs spend most of their time waiting.
- 📌 **Interview term: acknowledgement (ack)** — the worker telling the store "this job is finished, delete or mark it done". Until the ack, the job is not considered done.

## 4. The Job Lifecycle

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="A job moves from queued to running when a worker claims it; from running it is acked to done, sent back to queued with a backoff delay on failure, or moved to dead after its maximum attempts">
  <defs>
    <marker id="lc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Four states, three ways out of running</text>
  <rect class="d-box-muted" x="24" y="90" width="140" height="56" rx="10"/>
  <text class="d-text" x="94" y="113" text-anchor="middle">queued</text>
  <text class="d-sub" x="94" y="133" text-anchor="middle">waiting until due</text>
  <rect class="d-box-accent" x="250" y="90" width="140" height="56" rx="10"/>
  <text class="d-text d-accent" x="320" y="113" text-anchor="middle">running</text>
  <text class="d-sub" x="320" y="133" text-anchor="middle">lease held</text>
  <rect class="d-box" x="476" y="40" width="140" height="56" rx="10"/>
  <text class="d-text" x="546" y="63" text-anchor="middle">done</text>
  <text class="d-sub" x="546" y="83" text-anchor="middle">acked</text>
  <rect class="d-box-muted" x="476" y="150" width="140" height="56" rx="10"/>
  <text class="d-text" x="546" y="173" text-anchor="middle">dead</text>
  <text class="d-sub" x="546" y="193" text-anchor="middle">max attempts used</text>
  <path class="d-edge-accent" d="M 166 106 L 246 106" marker-end="url(#lc-arrow)"/>
  <text class="d-sub" x="206" y="96" text-anchor="middle">claim</text>
  <path class="d-edge" d="M 246 132 L 168 132" marker-end="url(#lc-arrow)"/>
  <text class="d-sub" x="206" y="164" text-anchor="middle">fail, backoff</text>
  <path class="d-edge" d="M 392 104 L 472 74" marker-end="url(#lc-arrow)"/>
  <path class="d-edge" d="M 392 134 L 472 172" marker-end="url(#lc-arrow)"/>
</svg>

There is one more, invisible transition: a job stuck in \`running\` whose lease has expired is treated as claimable again. That single rule is what makes crashes recoverable.

## 5. The Hard Part: Claiming, Leases and At-Least-Once

📌 **Interview term: lease (visibility timeout)** — when a worker claims a job it also gets a deadline, say "this job is yours until 12:00:30". If the worker acks before then, fine. If it crashes, it never acks, the lease runs out, and the job becomes claimable by someone else. Amazon SQS calls this the visibility timeout: a received message is hidden from other consumers until it is deleted or the timeout passes, and after \`maxReceiveCount\` receives it moves to a dead-letter queue ([AWS SQS dead-letter queue docs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)).

📌 **Interview term: atomic claim** — selecting a job and marking it as taken must be one indivisible step. If worker A reads "job 7 is free" and worker B reads the same thing before A writes "taken", both run job 7. Ways to do it atomically:

- **Postgres:** \`SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1\` in a transaction, so concurrent workers skip rows another worker has locked.
- **Redis / BullMQ:** atomic Redis operations and Lua scripts handle the move from "waiting" to "active".
- **SQLite (the demo below):** a single \`UPDATE ... WHERE id = (SELECT ...) RETURNING ...\` statement.

📌 **Interview term: at-least-once delivery** — leases guarantee a job is not lost, but they cannot guarantee it runs exactly once. A worker can send the email and then crash before the ack; the lease expires and the email is sent again. So every handler must be **idempotent** — safe to run twice — usually with an idempotency key or a unique database constraint on the side effect. That technique has its own verified walkthrough: [idempotency in a queue consumer](/interview-question/how-do-you-guarantee-idempotency-in-a-queue-consumer).

## 6. Failure Handling: Retries, Backoff, Dead Letters

- **Retry with exponential backoff.** A failing job is put back as \`queued\` with \`run_at = now + base × 2^(attempt − 1)\` so a struggling dependency gets breathing room (see [exponential backoff and jitter](/interview-question/how-do-you-implement-retries-with-exponential-backoff-and-jitter)).
- **Cap attempts.** After \`max_attempts\` the job is not retried again.
- 📌 **Interview term: dead-letter queue (DLQ)** — where jobs go after they have used up their attempts. A **poison message** (a payload that can never succeed, or a bug) would otherwise be retried forever. The DLQ keeps the payload and the last error so a human can fix the cause and replay it. Alert when it grows.

## 7. Verified: a Durable Queue That Survives a Crash

The example below is under 80 lines on \`node:sqlite\` (an experimental built-in module that first appeared in Node v22.5.0; it ran here on Node 22.22.0 without a flag, printing an \`ExperimentalWarning\` that \`--no-warnings\` hides). The claim is one atomic statement:

~~~sql
UPDATE jobs SET status='running', attempts=attempts+1, lease_until=?
WHERE id = (SELECT id FROM jobs
            WHERE (status='queued' AND run_at <= ?) OR (status='running' AND lease_until < ?)
            ORDER BY id LIMIT 1)
RETURNING id, type, payload, attempts, max_attempts
~~~

Process 1 enqueues four jobs (two emails, a \`flaky\` job that fails twice and then succeeds, and a \`poison\` job that always fails), claims job #1, and calls \`process.exit(1)\` **without acking** — a simulated crash. Process 2 then starts two concurrent workers on the same database file. Lease = 300 ms, \`max_attempts\` = 3, backoff = 100 ms × 2^(attempt − 1).

Actual output:

~~~
$ node --no-warnings queue.js produce-and-crash
[   7ms] producer enqueued 4 jobs; claimed #1 and now crashes before acking it
exit code 1

$ node --no-warnings queue.js work
[   2ms] w1 claimed #2 flaky (attempt 1/3)
[  14ms] w2 claimed #3 poison (attempt 1/3)
[  16ms] w1 failed  #2: upstream 503 -> retry in 100ms
[  17ms] w1 claimed #4 email (attempt 1/3)
[  20ms] w2 failed  #3: payload can never be processed -> retry in 100ms
[ 100ms] w1 done    #4: sent to b@example.com
[ 125ms] w2 claimed #2 flaky (attempt 2/3)
[ 128ms] w2 failed  #2: upstream 503 -> retry in 200ms
[ 130ms] w2 claimed #3 poison (attempt 2/3)
[ 132ms] w2 failed  #3: payload can never be processed -> retry in 200ms
[ 203ms] w1 claimed #1 email (attempt 2/3)
[ 286ms] w1 done    #1: sent to a@example.com
[ 338ms] w1 claimed #2 flaky (attempt 3/3)
[ 339ms] w1 done    #2: ok on a later try
[ 340ms] w1 claimed #3 poison (attempt 3/3)
[ 341ms] w1 failed  #3: payload can never be processed -> dead-lettered
  #1 email  done  attempts=2 
  #2 flaky  done  attempts=3 
  #3 poison dead  attempts=3 last_error=payload can never be processed
  #4 email  done  attempts=1
~~~

What this shows:

- **Crash recovery.** Job #1 was held by the dead process. Nobody touched it until its lease expired; at about 203 ms worker w1 reclaimed it as **attempt 2** and finished it. Nothing was lost, and the attempt counter honestly records that it was started twice — the at-least-once property in one line.
- **Backoff.** \`flaky\` was retried after 100 ms, then 200 ms, and succeeded on attempt 3.
- **Dead letter.** \`poison\` used all three attempts and ended as \`dead\` with its last error stored, instead of looping forever.
- **Concurrency.** Two workers interleaved: while w2 handled the failing jobs, w1 finished email #4.

What was **not** verified here: both workers ran in one process. Across separate processes the same statement relies on SQLite's single-writer locking; for real multi-host workers you would use Postgres (\`SKIP LOCKED\`), Redis/BullMQ or a managed queue, as in the table below.

## 8. A Worked Capacity Estimate

📌 **Interview term: Little's law** — average items in the system = arrival rate × average time each spends. For workers: jobs in flight = jobs per second × seconds per job.

- 2,000,000 jobs/day ÷ 86,400 s ≈ **23 jobs/s** on average.
- Assume a peak of 5× average: ≈ **116 jobs/s**.
- Average job (an email API call) takes 300 ms: 116 × 0.3 ≈ **35 jobs in flight** at peak.
- With a per-process concurrency of 10: 35 ÷ 10 → **4 worker processes**, plus one for headroom and rolling deploys = **5**.

The same arithmetic tells you when the queue will back up: if peak arrival exceeds what the workers can finish, the queue grows by the difference every second, which is why **queue depth** and **age of the oldest waiting job** are the two metrics to alert on.

## 9. Choosing the Store

| | Postgres table | Redis + BullMQ | Managed queue (SQS, Pub/Sub) |
| :--- | :--- | :--- | :--- |
| Extra infrastructure | None if you have Postgres | A Redis instance | A cloud service |
| Atomic claim | \`FOR UPDATE SKIP LOCKED\` | Built in | Built in (visibility timeout) |
| Enqueue in the same transaction as your data | **Yes** — no lost or phantom jobs | No | No |
| Delays, priorities, repeatable jobs | Build them yourself | Built in | Partly (delays; priorities vary) |
| Throughput | Fine for moderate volume | High | High, scales without you |
| Good fit | Small team, moderate volume, strong consistency | Most Node apps that already run Redis | Very high volume, cross-language consumers |

Enqueueing in the same database transaction as the business write (the **transactional outbox** idea) is the quiet advantage of a Postgres queue: the order row and its "send invoice" job either both commit or neither does.

## 10. Running Workers Well in Node

- **Graceful shutdown.** On \`SIGTERM\`, stop claiming, let in-flight jobs finish up to a limit, then exit. Unfinished jobs are not lost — their leases expire. See [graceful shutdown](/interview-question/how-do-you-handle-graceful-shutdown-in-a-node-js-application).
- **Keep CPU work off the event loop.** One synchronous PDF render blocks every other job in that worker. Use [worker threads](/interview-question/what-are-worker-threads-in-node-js-and-when-would-you-use-them) or a [thread pool such as Piscina](/interview-question/how-do-you-build-a-worker-thread-pool-e-g-piscina-for-cpu-bound-work).
- **Long jobs need a heartbeat** that extends the lease, or the lease expires mid-job and a second worker starts it.
- **Small payloads.** Store ids, not blobs; the handler loads fresh data when it runs.
- **Observability.** Log the job id on every line, and track depth, oldest-job age, failure rate and DLQ size.

## 11. Common Pitfalls

- **An in-memory array or \`setTimeout\` as "the queue".** It disappears on every restart or deploy — the exact data loss in the prompt.
- **Claiming with a read followed by a separate write.** Two workers can claim the same job. The claim must be one atomic operation.
- **No lease, or a lease shorter than the job.** No lease means a crashed worker's job is stuck forever; too short a lease means a healthy job is started a second time while still running.
- **Assuming exactly-once.** Verified above: the crashed job ran as attempt 2. Handlers must be idempotent.
- **Unlimited retries with no dead-letter state.** A poison job loops forever and eats capacity; the demo dead-lettered it after three attempts.
- **Running CPU-heavy jobs on the worker event loop**, which stalls every other job that worker holds.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it as decoupling:</strong> <span style="color:#f0e2c8;">The request only writes a small job record to a durable store and returns; separate worker processes do the slow work later, so a slow email provider no longer slows the API.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the moving parts:</strong> <span style="color:#f0e2c8;">Producer, durable store, workers with bounded concurrency, ack on success, retry with backoff, and a dead-letter queue for jobs that keep failing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain the crash case:</strong> <span style="color:#f0e2c8;">Claiming takes a lease. A worker that crashes never acks, the lease expires and another worker takes the job — I ran that and the crashed job finished on attempt 2.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say at-least-once out loud:</strong> <span style="color:#f0e2c8;">Because of leases, a job can run twice, so handlers must be idempotent — an idempotency key or a unique constraint on the side effect.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close with operations:</strong> <span style="color:#f0e2c8;">Graceful shutdown, CPU work off the event loop, and alerts on queue depth, oldest-job age and the dead-letter count. Then pick BullMQ, Postgres or SQS based on what the team already runs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop two workers from claiming the same job?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the claim a single atomic operation that both selects and marks the job. In the demo it is one SQLite <code style="background:#332310;color:#ffca28;">UPDATE ... WHERE id = (SELECT ...) RETURNING</code>, so the select and the update cannot be split by another writer. In Postgres the usual pattern is <code style="background:#332310;color:#ffca28;">SELECT ... FOR UPDATE SKIP LOCKED</code> inside a transaction, which lets many workers each grab a different unlocked row without waiting on each other. Redis-based libraries like BullMQ do the equivalent with atomic Redis scripts. What you must avoid is read-then-write in two separate steps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How long should the lease or visibility timeout be?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Longer than a normal job takes, with margin, but short enough that a crashed job is retried reasonably soon. If a job can legitimately run longer than the lease, the worker must extend the lease periodically (a heartbeat) — otherwise the lease expires while the first worker is still running and a second worker starts the same job, which is exactly the duplicate you were trying to avoid. In the demo the lease was 300 ms, which is why the crashed job became claimable about 200 ms into the second process.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes in the dead-letter queue and what do you do with it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Jobs that failed <code style="background:#332310;color:#ffca28;">max_attempts</code> times — usually bad payloads or bugs, not outages. In the demo the poison job failed three times and was moved to <code style="background:#332310;color:#ffca28;">dead</code> with its last error saved. You alert when the dead-letter count grows, fix the cause, and then replay the dead jobs. Without a dead-letter state a poison job is retried forever and wastes worker capacity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should a background job run in the same process as the API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For small apps it can, but separate worker processes are the safer default: a burst of jobs cannot slow API latency, workers scale independently, and a crash in job code does not take down the API. CPU-heavy jobs such as PDF rendering or image resizing should not run on a worker event loop either — hand them to worker threads or a pool so one job does not block the others.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you shut a worker down during a deploy without losing jobs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On SIGTERM: stop claiming new jobs, let in-flight jobs finish up to a time limit, ack them, then exit. Any job that does not finish in time is not lost — it was never acked, so its lease expires and another worker retries it. That is the same at-least-once property that handles crashes; graceful shutdown just makes the retry rare instead of routine.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Producer** | Code that enqueues a job and returns immediately |
| **Worker** | A process that claims jobs, runs them and acks them |
| **Ack** | The worker marking a job finished |
| **Lease / visibility timeout** | A time-limited claim; if it expires without an ack the job is claimable again |
| **Atomic claim** | Selecting and marking a job in one indivisible step |
| **At-least-once delivery** | Every job runs, but some may run more than once |
| **Idempotent handler** | A handler that is safe to run twice |
| **Dead-letter queue** | Where jobs go after using up their attempts |
| **Poison message** | A job that can never succeed and would loop forever without a DLQ |
| **Little's law** | In flight = arrival rate × time per item |

---
**Conclusion:** a background job processor moves slow work out of the request: the API writes a small job to a durable store and replies, and separate worker processes claim jobs atomically, run them with bounded concurrency, and ack on success. The lease is the piece that makes it reliable — a crashed worker never acks, the lease expires, and another worker finishes the job, exactly as the crashed job #1 did on attempt 2 in the run above. That same mechanism makes delivery at-least-once, so handlers must be idempotent. Add exponential-backoff retries, a dead-letter state for poison jobs, graceful shutdown, CPU work kept off the event loop, and alerts on queue depth and oldest-job age, then choose Postgres, BullMQ or a managed queue based on volume and what the team already operates.`,
    examples: [
      {
        label: "Durable job queue on node:sqlite: atomic lease-based claim, backoff retries, dead-letter state, concurrency 2, and recovery after a simulated crash (run produce-and-crash, then work)",
        tech: "javascript",
        runnable: false,
        code: `// A durable job queue on node:sqlite: leases, retries with backoff,
// a dead-letter state, bounded concurrency, and crash recovery.
// Run:  node queue.js produce-and-crash   then   node queue.js work
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync(__dirname + "/jobs.db");
db.exec(\`CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY, type TEXT, payload TEXT,
  status TEXT DEFAULT 'queued',            -- queued | running | done | dead
  attempts INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 3,
  run_at INTEGER, lease_until INTEGER, last_error TEXT)\`);

const LEASE_MS = 300;
const now = () => Date.now();
const enqueue = (type, payload) =>
  db.prepare("INSERT INTO jobs (type, payload, run_at) VALUES (?, ?, ?)").run(type, JSON.stringify(payload), now());

// One atomic statement: pick a runnable job (queued and due, or running with
// an expired lease) and lease it. Two workers can never claim the same row.
const claimStmt = db.prepare(\`UPDATE jobs SET status='running', attempts=attempts+1, lease_until=?
  WHERE id = (SELECT id FROM jobs
              WHERE (status='queued' AND run_at <= ?) OR (status='running' AND lease_until < ?)
              ORDER BY id LIMIT 1)
  RETURNING id, type, payload, attempts, max_attempts\`);
const claim = () => claimStmt.get(now() + LEASE_MS, now(), now());
const ack = (id) => db.prepare("UPDATE jobs SET status='done', lease_until=NULL WHERE id=?").run(id);
const fail = (job, err) => {
  if (job.attempts >= job.max_attempts) {
    db.prepare("UPDATE jobs SET status='dead', last_error=? WHERE id=?").run(err.message, job.id);
    return "dead-lettered";
  }
  const delay = 100 * 2 ** (job.attempts - 1);          // 100ms, 200ms, ...
  db.prepare("UPDATE jobs SET status='queued', run_at=?, last_error=? WHERE id=?").run(now() + delay, err.message, job.id);
  return \`retry in \${delay}ms\`;
};

const t0 = now();
const log = (m) => console.log(\`[\${String(now() - t0).padStart(4)}ms] \${m}\`);
const flakyFails = { left: 2 };
const handlers = {
  email: async (p) => { await new Promise((r) => setTimeout(r, 80)); return \`sent to \${p.to}\`; },
  flaky: async () => { if (flakyFails.left-- > 0) throw new Error("upstream 503"); return "ok on a later try"; },
  poison: async () => { throw new Error("payload can never be processed"); },
};

async function worker(name, stop) {
  while (!stop.done) {
    const job = claim();
    if (!job) { await new Promise((r) => setTimeout(r, 50)); continue; }
    log(\`\${name} claimed #\${job.id} \${job.type} (attempt \${job.attempts}/\${job.max_attempts})\`);
    try { const out = await handlers[job.type](JSON.parse(job.payload)); ack(job.id); log(\`\${name} done    #\${job.id}: \${out}\`); }
    catch (e) { log(\`\${name} failed  #\${job.id}: \${e.message} -> \${fail(job, e)}\`); }
  }
}

const mode = process.argv[2];
if (mode === "produce-and-crash") {
  db.exec("DELETE FROM jobs");
  enqueue("email", { to: "a@example.com" });
  enqueue("flaky", {});
  enqueue("poison", {});
  enqueue("email", { to: "b@example.com" });
  const job = claim();
  log(\`producer enqueued 4 jobs; claimed #\${job.id} and now crashes before acking it\`);
  process.exit(1);  // simulated crash: lease is held, no ack
} else {
  (async () => {
    const stop = { done: false };
    const workers = [worker("w1", stop), worker("w2", stop)];   // concurrency = 2
    const until = setInterval(() => {
      const left = db.prepare("SELECT COUNT(*) n FROM jobs WHERE status IN ('queued','running')").get().n;
      if (left === 0) { stop.done = true; clearInterval(until); }
    }, 50);
    await Promise.all(workers);
    for (const r of db.prepare("SELECT id, type, status, attempts, last_error FROM jobs ORDER BY id").all())
      console.log(\`  #\${r.id} \${r.type.padEnd(6)} \${r.status.padEnd(5)} attempts=\${r.attempts} \${r.status === "dead" ? "last_error=" + r.last_error : ""}\`);
  })();
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the purpose of health check and readiness/liveness endpoints in a Node.js service?",
    seoDescription:
      "Liveness says the process can respond and failing it restarts the container; readiness says send traffic here, flipped off during warm-up and shutdown.",
    description: `**Question presented to candidate:**
"Our Node.js service runs in Kubernetes behind a load balancer. The platform team asks us to expose health endpoints. What are they for, what is the difference between a liveness check and a readiness check, and what should each one actually check?"

**What a strong answer should cover:**
- Health endpoints let **automation** (an orchestrator, a load balancer) decide what to do with an instance without a human looking at it.
- **Liveness** answers "is this process able to respond at all, or is it stuck?" Failing it gets the container **restarted**. It should be cheap and check **no external dependencies**.
- **Readiness** answers "should traffic be sent here right now?" Failing it takes the instance **out of the load balancer** without restarting it — used during warm-up, during shutdown (draining), and when it cannot serve.
- A **startup** probe (Kubernetes) covers slow boots so liveness does not kill the app while it is still starting.
- On \`SIGTERM\`, flip readiness to failing first, keep serving in-flight requests, then close — so the load balancer stops sending traffic before the process goes away.

**Clarifying questions expected:**
- "What will consume these endpoints — Kubernetes probes, a cloud load balancer, or an uptime monitor?"
- "How long does the service take to become ready after it starts (cache warm-up, migrations, connection pools)?"

**Code / implementation expected:** Optional — a small \`http\` server with \`/livez\` and \`/readyz\` that change through warm-up, an event-loop stall and SIGTERM, probed from a separate process, shows the difference clearly.`,
    answer: `**Target Audience:** Engineers preparing for Node.js backend and DevOps-flavoured interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The probe results in section 5 come from **actually running** a small Node service and a separate prober process that plays the role of Kubernetes. For the deeper design question — what happens when a dependency like the database goes down — see [designing liveness and readiness endpoints](/interview-question/how-do-you-design-liveness-and-readiness-health-check-endpoints).

## 1. Why This Even Matters — A Story First

A hospital ward has two very different questions about each nurse. "Is this nurse conscious?" — if not, someone needs to step in right away. And "Can this nurse take a new patient right now?" — maybe not, because they just started their shift and are still reading the notes, or they are about to go home and are finishing with their last patient. A nurse who cannot take a new patient is not unconscious, and you would never call an ambulance for them.

A Node service in a cluster gets asked the same two questions, many times a minute, by machines. The first one is **liveness**. The second one is **readiness**. Mixing them up is how teams end up with a platform that restarts healthy pods, or sends traffic to pods that are still starting.

## 2. The Core Idea

A **health check endpoint** is a URL that automation calls to decide what to do with an instance. The caller is not a user; it is an orchestrator (Kubernetes), a cloud load balancer, or an uptime monitor.

- 📌 **Interview term: liveness probe** — "is this process alive enough to respond?" If it keeps failing, the platform **restarts** the container. It should check nothing external.
- 📌 **Interview term: readiness probe** — "should traffic be sent to this instance right now?" If it fails, the instance is **removed from the load balancer** but **not restarted**. It goes back in when the check passes again.
- 📌 **Interview term: startup probe** — "has this app finished starting?" Used for slow boots; while it has not succeeded, the other probes are not run.

These behaviours are from the Kubernetes documentation: a failing readiness check removes a pod from Service load balancers, repeated liveness failures make the kubelet restart the container, and a configured startup probe disables liveness and readiness checks until it succeeds ([Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="A failing liveness probe leads to a container restart; a failing readiness probe leads to the pod being removed from the load balancer without a restart">
  <defs>
    <marker id="hc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Same failure signal, different reaction</text>
  <rect class="d-box-muted" x="24" y="44" width="220" height="50" rx="10"/>
  <text class="d-text" x="134" y="66" text-anchor="middle">liveness fails</text>
  <text class="d-sub" x="134" y="84" text-anchor="middle">GET /livez times out</text>
  <rect class="d-box-accent" x="396" y="44" width="220" height="50" rx="10"/>
  <text class="d-text d-accent" x="506" y="66" text-anchor="middle">container restarted</text>
  <text class="d-sub" x="506" y="84" text-anchor="middle">new process</text>
  <rect class="d-box-muted" x="24" y="114" width="220" height="50" rx="10"/>
  <text class="d-text" x="134" y="136" text-anchor="middle">readiness fails</text>
  <text class="d-sub" x="134" y="154" text-anchor="middle">GET /readyz returns 503</text>
  <rect class="d-box" x="396" y="114" width="220" height="50" rx="10"/>
  <text class="d-text" x="506" y="136" text-anchor="middle">out of load balancer</text>
  <text class="d-sub" x="506" y="154" text-anchor="middle">process keeps running</text>
  <path class="d-edge-accent" d="M 246 69 L 392 69" marker-end="url(#hc-arrow)"/>
  <path class="d-edge" d="M 246 139 L 392 139" marker-end="url(#hc-arrow)"/>
</svg>

## 3. What Each Endpoint Should Check

| | Liveness (\`/livez\`) | Readiness (\`/readyz\`) |
| :--- | :--- | :--- |
| Question | Can the process respond at all? | Should it get traffic now? |
| On failure | Restart the container | Stop routing traffic to it |
| Checks | Nothing external — just answer | Own state: warmed up, not draining, can serve |
| Fails when | Event loop is stuck, process is wedged | Starting up, shutting down, overloaded, missing a critical dependency |
| Must be | Very cheap and fast | Cheap; any dependency check should be cached or bounded |

The most important rule: **liveness must not depend on the database or other services.** If it did, a database outage would make every pod fail liveness and the platform would restart them all — which cannot fix a database, and the restarts pile on load when it recovers.

## 4. The Implementation

The service is a plain \`node:http\` server (first example). The two endpoints are a few lines each:

~~~js
const state = { warm: false, draining: false };
// ...
if (req.url === "/livez") return res.end("alive");     // no dependency checks here
if (req.url === "/readyz") {
  const ready = state.warm && !state.draining;
  res.statusCode = ready ? 200 : 503;
  return res.end(ready ? "ready" : state.draining ? "draining" : "warming up");
}
~~~

📌 **Interview term: draining** — the period after a shutdown signal when an instance stops accepting *new* traffic but finishes the requests it already has. The shutdown handler flips readiness first, waits briefly so the load balancer notices, then closes:

~~~js
process.on("SIGTERM", () => {
  state.draining = true;                       // 1. stop being "ready"
  setTimeout(() => {                           // 2. give the LB time to notice
    server.close(() => process.exit(0));       // 3. finish in-flight, then exit
    server.closeIdleConnections();
  }, 300);
});
~~~

The full shutdown sequence (in-flight requests, keep-alive sockets, a forced-exit safety net) is covered in [graceful shutdown](/interview-question/how-do-you-handle-graceful-shutdown-in-a-node-js-application).

## 5. Verified: Probing Through a Whole Lifecycle

The second example forks the service as a **separate process** and probes both endpoints with a 250 ms timeout — like an orchestrator would — at each stage: just started, warm, during a 600 ms synchronous CPU stall (triggered via a \`/block\` route), after the stall, and after \`SIGTERM\`.

Actual output of \`node health-probe.js\`:

~~~
[ 110ms] started, warming up        livez=200 alive          readyz=503 warming up
[ 463ms] warm-up done               livez=200 alive          readyz=200 ready
[ 769ms] event loop stalled         livez=FAIL TimeoutError  readyz=FAIL TimeoutError
[1474ms] stall over                 livez=200 alive          readyz=200 ready
[1528ms] SIGTERM received           livez=200 alive          readyz=503 draining
[1780ms] process exited with code 0
~~~

Reading it line by line:

1. **Warming up** — the process is alive (\`livez\` 200) but not ready (\`readyz\` 503). An orchestrator would leave it running and send it no traffic. This is exactly the case readiness exists for.
2. **Warm** — both pass; the instance joins the load balancer.
3. **Event-loop stall** — *both* probes timed out. In Node, every HTTP response is produced on the event loop, so while synchronous code runs, nothing answers — not even a handler that does no work. This is what liveness really detects in Node: a process whose event loop is not turning. One stall like this should not trigger a restart, which is why real probes use a failure threshold (several consecutive failures), but a permanently stuck loop would.
4. **Stall over** — both recover without any restart.
5. **SIGTERM** — liveness still 200 (the process is fine), readiness 503 \`draining\`, so new traffic stops while the process finishes up. It exited with code 0 about 250 ms later.

## 6. Common Pitfalls

- **Checking the database (or any dependency) in liveness.** A shared outage then restarts every pod at once and fixes nothing.
- **One endpoint for both probes.** You lose the ability to say "alive but do not send me traffic", which is needed for both warm-up and draining.
- **Not failing readiness on shutdown.** Closing the server straight away means requests already routed to the pod hit a closed port.
- **Expensive health checks.** Probes run often on every pod; a check that queries several services on every call becomes load of its own. Cache dependency results for a few seconds.
- **No startup probe for a slow-starting app.** A liveness probe with a short timeout can kill the container before it finishes booting, over and over.
- **Leaking details.** Health bodies should not contain stack traces, connection strings or versions of every dependency; keep detail on a protected diagnostics route.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Say who reads them:</strong> <span style="color:#f0e2c8;">Health endpoints are for automation — the orchestrator and the load balancer — so they can act on an instance without a human.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Liveness = can it respond:</strong> <span style="color:#f0e2c8;">Cheap, no dependency checks. If it fails the platform restarts the container, so it should only fail when a restart would actually help.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Readiness = send traffic here?:</strong> <span style="color:#f0e2c8;">Fails during warm-up, during shutdown, or when the instance cannot serve. Failing it removes the pod from the load balancer but does not restart it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Show the lifecycle:</strong> <span style="color:#f0e2c8;">In my run, readiness was 503 while warming up, 200 when warm, and 503 draining after SIGTERM, while liveness stayed 200 the whole time except during a CPU stall.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Mention startup and shutdown:</strong> <span style="color:#f0e2c8;">A startup probe protects slow boots, and on SIGTERM you flip readiness first, keep serving in-flight requests, then close the server.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should the liveness endpoint check the database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. If the database goes down and liveness fails, the platform restarts every pod at once, which fixes nothing because the problem is the database, and the restart storm adds load when it comes back. Liveness should only fail when the process itself is broken — deadlocked, stuck, or out of memory. If you want the database in a health signal at all, readiness is the place, and even there with care so a shared outage does not empty the whole load balancer; the DB-outage case is covered in its own question on liveness and readiness design.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does liveness actually detect in a Node process if it does no checks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It detects that the event loop can still answer. In the demo a 600 ms synchronous loop made both <code style="background:#332310;color:#ffca28;">/livez</code> and <code style="background:#332310;color:#ffca28;">/readyz</code> time out at the prober, because nothing on the event loop runs while it is blocked. A Node process that is permanently stuck — an infinite loop, a hung synchronous call — fails liveness and gets restarted. A brief stall like the demo should not, which is why probes use a failure threshold of several consecutive failures.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why flip readiness on SIGTERM instead of just closing the server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Load balancers learn about endpoint changes with some delay. If you close immediately, requests already routed to this pod hit a closed port. Flipping readiness to 503 first tells the load balancer to stop sending new traffic; the server keeps serving for a short grace period, then <code style="background:#332310;color:#ffca28;">server.close()</code> lets in-flight requests finish. In the demo readiness went to 503 draining at once after SIGTERM, and the process exited cleanly with code 0 about 250 ms later.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a startup probe for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Some apps take a long time to start — loading a large cache, running migrations, warming a JIT-heavy path. Without a startup probe, a liveness probe with a short timeout could kill the container before it ever finishes starting, in a loop. Per the Kubernetes docs, when a startup probe is configured it disables liveness and readiness checks until it succeeds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What should a health response contain?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For the probes, the status code is what matters: 200 for healthy, 503 for not ready. Keep the body small and never put secrets, connection strings or stack traces in it — health endpoints are often reachable by more people than you expect. A separate, protected diagnostics endpoint can return detailed component status, version and uptime for humans.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Health check endpoint** | A URL automation calls to decide what to do with an instance |
| **Liveness probe** | "Can the process respond?" — failure means restart |
| **Readiness probe** | "Send traffic here?" — failure means removed from the load balancer |
| **Startup probe** | "Finished booting?" — holds off the other probes until it passes |
| **Draining** | Finishing in-flight work while refusing new traffic before shutdown |
| **Failure threshold** | How many consecutive probe failures count as failed |

---
**Conclusion:** health endpoints exist so machines can manage instances: liveness tells the platform whether to restart a process, readiness tells the load balancer whether to send it traffic, and a startup probe protects slow boots. In a Node service, liveness should just answer — it proves the event loop is turning, as the stalled run above showed when both probes timed out — and it must never depend on the database. Readiness carries the lifecycle: 503 while warming up, 200 while serving, and 503 again the moment \`SIGTERM\` arrives, so traffic drains away before \`server.close()\` lets the process exit cleanly.`,
    examples: [
      {
        label: "health-server.js: /livez and /readyz through warm-up, a CPU stall and SIGTERM draining",
        tech: "javascript",
        runnable: false,
        code: `// health-server.js — the service. Liveness answers "is this process able to
// respond at all?"; readiness answers "should traffic be sent here right now?"
const http = require("node:http");
const state = { warm: false, draining: false };

const server = http.createServer((req, res) => {
  if (req.url === "/livez") return res.end("alive");     // no dependency checks here
  if (req.url === "/readyz") {
    const ready = state.warm && !state.draining;
    res.statusCode = ready ? 200 : 503;
    return res.end(ready ? "ready" : state.draining ? "draining" : "warming up");
  }
  if (req.url === "/block") {                              // simulate a CPU stall
    res.end("blocking");
    setImmediate(() => { const end = Date.now() + 600; while (Date.now() < end) {} });
    return;
  }
  res.end("hello");
});

server.listen(Number(process.env.PORT), () => {
  process.send("listening");
  setTimeout(() => { state.warm = true; }, 300);           // e.g. DB pool + cache warm-up
});

process.on("SIGTERM", () => {
  state.draining = true;                                   // 1. stop being "ready"
  setTimeout(() => {                                       // 2. give the LB time to notice
    server.close(() => process.exit(0));                   // 3. finish in-flight, then exit
    server.closeIdleConnections();
  }, 300);
});`,
      },
      {
        label: "health-probe.js: plays the orchestrator, probing the service from a separate process with a 250 ms timeout",
        tech: "javascript",
        runnable: false,
        code: `// health-probe.js — plays the orchestrator: probes from a separate process.
const { fork } = require("node:child_process");
const PORT = 38123;
const child = fork(__dirname + "/health-server.js", { env: { ...process.env, PORT } });
const t0 = Date.now();
const stamp = () => \`[\${String(Date.now() - t0).padStart(4)}ms]\`;
const probe = async (path) => {
  try {
    const r = await fetch(\`http://localhost:\${PORT}\${path}\`, { signal: AbortSignal.timeout(250) });
    return \`\${r.status} \${await r.text()}\`;
  } catch (e) { return \`FAIL \${e.name}\`; }
};
const both = async (label) => {
  const [l, r] = await Promise.all([probe("/livez"), probe("/readyz")]);
  console.log(\`\${stamp()} \${label.padEnd(26)} livez=\${l.padEnd(18)} readyz=\${r}\`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

child.once("message", async () => {
  await both("started, warming up");
  await wait(350);
  await both("warm-up done");
  await probe("/block"); await wait(50);
  await both("event loop stalled");
  await wait(700);
  await both("stall over");
  child.kill("SIGTERM"); await wait(50);
  await both("SIGTERM received");
  child.once("exit", (code) => console.log(\`\${stamp()} process exited with code \${code}\`));
});`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between synchronous and asynchronous middleware error handling in Express.js?",
    seoDescription:
      "Express catches sync throws, but Express 4 ignores rejected promises from async handlers, so requests hang or crash; Express 5 forwards them to next(err).",
    description: `**Question presented to candidate:**
"In our Express app, when a route handler throws, the client gets a clean 500 from our error middleware. But after we converted a handler to \`async/await\`, the same kind of error made the request hang — and in production the whole process crashed. Why does Express treat these differently, and how do you handle errors correctly in async middleware?"

**What a strong answer should cover:**
- Express calls each handler inside a \`try/catch\`, so a **synchronous throw** is caught and passed to the error-handling middleware automatically.
- An \`async\` function never throws synchronously — it **returns a rejected promise**. **Express 4 ignores the returned promise**, so the rejection is unhandled: the request hangs, and since Node 15 an unhandled rejection crashes the process by default.
- **Express 5** inspects the returned promise and calls \`next(err)\` on rejection, so async errors reach the error middleware just like sync ones.
- Errors thrown inside **callbacks** (\`setTimeout\`, an old-style library callback) escape both versions — they must be caught and passed with \`next(err)\`.
- The fixes for Express 4: \`try/catch\` + \`next(err)\`, or a small \`asyncHandler\` wrapper; and error middleware must declare **four parameters** \`(err, req, res, next)\`.

**Clarifying questions expected:**
- "Which Express major version are we on — 4 or 5?"
- "Are the errors coming from awaited promises, or from callback-style APIs inside the handler?"

**Code / implementation expected:** Yes — the same routes run under Express 4 and Express 5, showing which errors reach the error middleware, which leave a hanging request, and which crash the process.`,
    answer: `**Target Audience:** Engineers preparing for Node.js / Express backend interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every result below was produced by **actually running** the same routes against Express 4.22.3 and Express 5.3.0 (installed side by side), and the source excerpts are copied from those installed packages. If middleware itself is new to you, start with [middleware in Express](/interview-question/explain-the-concept-of-middleware-in-express-js).

## 1. Why This Even Matters — A Story First

A theatre has a safety net under the trapeze. If an acrobat slips *during the act*, the net catches them. Now imagine an acrobat who says "I will do my jump in a minute", walks off stage, and falls later in the car park. The net is still under the trapeze, doing nothing. Nobody catches them, and nobody in the theatre even knows.

Express's built-in error handling is that net. A synchronous \`throw\` falls into it. An \`async\` handler that fails after an \`await\` is the acrobat who fell later, somewhere else — and whether anyone catches them depends on which Express version you run.

## 2. The Core Idea: What Express Actually Does

Express runs every handler through a small function in its router called a **Layer**. Here is the Express 4.22.3 version, from \`lib/router/layer.js\`:

~~~js
Layer.prototype.handle_request = function handle(req, res, next) {
  var fn = this.handle;
  if (fn.length > 3) {
    // not a standard request handler
    return next();
  }
  try {
    fn(req, res, next);
  } catch (err) {
    next(err);
  }
};
~~~

📌 **Interview term: synchronous error** — an exception thrown while the handler is still running on the current call stack. It lands in that \`try/catch\`, and \`next(err)\` sends it to your error middleware. Nothing extra needed.

📌 **Interview term: asynchronous error** — an error that happens *after* the handler has returned: after an \`await\`, in a \`.then\`, or in a callback. An \`async\` function never throws to its caller; it **returns a promise that later rejects**. Express 4 calls \`fn(...)\` and throws the return value away, so the \`try/catch\` sees nothing and the rejection is never handed to \`next\`.

Express 5 uses the \`router\` package (version 2.2.0 under Express 5.3.0), whose \`lib/layer.js\` keeps the returned value and watches it:

~~~js
try {
  // invoke function
  const ret = fn(req, res, next)
  // wait for returned promise
  if (isPromise(ret)) {
    // ...
    ret.then(null, function (error) {
      next(error || new Error('Rejected promise'))
    })
  }
} catch (err) {
  next(err)
}
~~~

That \`ret.then(null, ...)\` is the entire difference. Express 5 was announced on October 15, 2024 ([Express blog: Introducing Express v5](https://expressjs.com/2024/10/15/v5-release.html)), and its error-handling guide states that handlers returning a promise call \`next(value)\` automatically when they reject ([Express error handling guide](https://expressjs.com/en/guide/error-handling.html)).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="A synchronous throw is caught by the try catch in the Express layer in both versions; an async rejection is forwarded to next by Express 5 and ignored by Express 4">
  <defs>
    <marker id="ex-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Where each kind of error goes</text>
  <rect class="d-box-muted" x="24" y="44" width="180" height="50" rx="10"/>
  <text class="d-text" x="114" y="66" text-anchor="middle">sync throw</text>
  <text class="d-sub" x="114" y="84" text-anchor="middle">Express 4 and 5</text>
  <rect class="d-box-accent" x="420" y="44" width="196" height="50" rx="10"/>
  <text class="d-text d-accent" x="518" y="66" text-anchor="middle">error middleware</text>
  <text class="d-sub" x="518" y="84" text-anchor="middle">clean 500</text>
  <rect class="d-box-muted" x="24" y="134" width="180" height="50" rx="10"/>
  <text class="d-text" x="114" y="156" text-anchor="middle">async rejection</text>
  <text class="d-sub" x="114" y="174" text-anchor="middle">Express 5</text>
  <rect class="d-box-muted" x="24" y="224" width="180" height="50" rx="10"/>
  <text class="d-text" x="114" y="246" text-anchor="middle">async rejection</text>
  <text class="d-sub" x="114" y="264" text-anchor="middle">Express 4</text>
  <rect class="d-box" x="420" y="224" width="196" height="50" rx="10"/>
  <text class="d-text" x="518" y="246" text-anchor="middle">unhandled rejection</text>
  <text class="d-sub" x="518" y="264" text-anchor="middle">hang or crash</text>
  <path class="d-edge-accent" d="M 206 69 L 416 69" marker-end="url(#ex-arrow)"/>
  <path class="d-edge-accent" d="M 206 159 L 416 86" marker-end="url(#ex-arrow)"/>
  <path class="d-edge" d="M 206 249 L 416 249" marker-end="url(#ex-arrow)"/>
</svg>

## 3. Verified: the Same Routes on Express 4 and Express 5

The first example registers four routes and one four-parameter error handler, then calls each route with a 500 ms client timeout:

~~~js
app.get("/sync", (req, res) => { throw new Error("sync boom"); });
app.get("/async", async (req, res) => { await null; throw new Error("async boom"); });
app.get("/async-next", async (req, res, next) => {
  try { await null; throw new Error("async boom, forwarded"); } catch (e) { next(e); }
});
app.get("/callback", (req, res) => { setTimeout(() => { throw new Error("callback boom"); }, 0); });
app.use((err, req, res, next) => { res.status(500).json({ caughtBy: "error middleware", message: err.message }); });
process.on("unhandledRejection", (e) => console.log(\`  !! unhandledRejection: \${e.message} (request left hanging)\`));
~~~

Actual output:

~~~
Express 4.22.3
  GET /sync       -> 500 {"caughtBy":"error middleware","message":"sync boom"}
  !! unhandledRejection: async boom (request left hanging)
  GET /async      -> no response (TimeoutError)
  GET /async-next -> 500 {"caughtBy":"error middleware","message":"async boom, forwarded"}
Express 5.3.0
  GET /sync       -> 500 {"caughtBy":"error middleware","message":"sync boom"}
  GET /async      -> 500 {"caughtBy":"error middleware","message":"async boom"}
  GET /async-next -> 500 {"caughtBy":"error middleware","message":"async boom, forwarded"}
~~~

- **\`/sync\`** — caught by both versions.
- **\`/async\` on Express 4** — the error middleware never ran. The rejection reached the process-level \`unhandledRejection\` listener, which has no \`res\`, so the client got **no response at all** and gave up after 500 ms.
- **\`/async\` on Express 5** — the returned promise was watched; a clean 500.
- **\`/async-next\`** — catching the error yourself and calling \`next(e)\` works in both versions.

## 4. Verified: Without a Listener, Express 4 Crashes the Process

📌 **Interview term: unhandled rejection** — a promise that rejects with no handler attached. Since Node 15 the default \`--unhandled-rejections\` mode is \`throw\`: with no \`unhandledRejection\` hook, the rejection is raised as an uncaught exception and the process exits ([Node.js v15.0.0 release notes](https://nodejs.org/en/blog/release/v15.0.0)).

The second example is Express 4 with **no** listener. It fires a request at \`/async\`, and 100 ms later a request at a perfectly healthy \`/ok\` route. Actual output (stack frames trimmed):

~~~
/.../express4-crash.js:4
app.get("/async", async () => { await null; throw new Error("async boom"); });
                                                  ^

Error: async boom

Node.js v22.22.0
exit code: 1
~~~

The \`/ok\` request never got an answer: one bad async route killed the server for **every** user, including requests that had nothing to do with it.

## 5. Verified: Callback Errors Escape Even Express 5

Express 5 only sees errors that reject the promise the handler *returns*. A \`throw\` inside a \`setTimeout\` (or inside an old callback-style library) runs on a later tick, outside the Layer's \`try/catch\` and outside any promise. Running the \`/callback\` route on Express 5.3.0:

~~~
$ node express-errors.js express5 callback
Express 5.3.0
/.../express-errors.js:12
app.get("/callback", (req, res) => { setTimeout(() => { throw new Error("callback boom"); }, 0); });
                                                        ^

Error: callback boom

Node.js v22.22.0
exit code: 1
~~~

An uncaught exception, so the process exited. The fix is to catch inside the callback and call \`next(err)\`, or better, to promisify the callback API and \`await\` it so the error becomes a rejection Express 5 can see. For the general rule behind this, see [how try/catch behaves with asynchronous code](/interview-question/how-do-try-catch-blocks-behave-with-asynchronous-code-in-node-js).

## 6. The Fixes

| Situation | Fix |
| :--- | :--- |
| Express 5, \`async\` handler | Nothing — rejections go to \`next(err)\` automatically |
| Express 4, a few \`async\` handlers | \`try { ... } catch (e) { next(e) }\` in each |
| Express 4, many \`async\` handlers | An \`asyncHandler\` wrapper (below), applied to every route |
| Any version, error in a callback | Catch inside the callback and call \`next(err)\`, or promisify and \`await\` |
| Any version | Error middleware with exactly **four** parameters, registered **after** routes |

📌 **Interview term: async wrapper** — a higher-order function that calls your handler and attaches \`.catch(next)\` to whatever it returns. It is the same idea Express 5 builds in:

~~~js
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
app.get("/async", asyncHandler(async () => { await null; throw new Error("async boom"); }));
~~~

Actual output of the third example on Express 4.22.3:

~~~
500 {"handled":"async boom"}
~~~

📌 **Interview term: error-handling middleware** — middleware with the signature \`(err, req, res, next)\`. Express recognises it by the declared parameter count (the \`fn.length\` checks in the Layer code above). Verified with a three-parameter "error handler" registered before a four-parameter one:

~~~
express4 500 4-arg handler ran
express5 500 4-arg handler ran
~~~

On both versions the three-parameter function was skipped. Dropping the unused \`next\` from the signature silently turns your error handler into ordinary middleware.

## 7. Common Pitfalls

- **Upgrading code to \`async/await\` on Express 4 without a wrapper.** Errors that used to be caught now become unhandled rejections: hanging requests, or a crashed process (both verified above).
- **Relying on a global \`unhandledRejection\` handler.** It keeps the process alive but cannot answer the failed request; the client still hangs.
- **Assuming Express 5 catches everything.** A throw inside a \`setTimeout\` or library callback crashed Express 5 too.
- **Error handler with three parameters.** It is treated as normal middleware and skipped on errors.
- **Registering the error middleware before the routes.** Errors only flow forward through the stack; put it last.
- **Calling \`next(err)\` and then also writing a response**, or calling \`next()\` twice — "headers already sent" errors and confusing double handling.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Explain the mechanism:</strong> <span style="color:#f0e2c8;">Express calls handlers inside a try/catch. A sync throw lands in that catch and goes to the error middleware. An async function does not throw — it returns a rejected promise.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Express 4 behaviour:</strong> <span style="color:#f0e2c8;">Express 4 ignores the returned promise, so the rejection is unhandled. In my run the request hung until the client timed out, and with no listener the whole process exited.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Express 5 behaviour:</strong> <span style="color:#f0e2c8;">Express 5 checks the returned promise and calls <code style="background:#332310;color:#ffca28;">next(err)</code> when it rejects, so the same async route returned a clean 500 from the error middleware.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The gap neither covers:</strong> <span style="color:#f0e2c8;">A throw inside a <code style="background:#332310;color:#ffca28;">setTimeout</code> or library callback runs on a later tick, outside any try/catch or promise — it crashed the process even on Express 5. Catch it there and call <code style="background:#332310;color:#ffca28;">next(err)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The fixes:</strong> <span style="color:#f0e2c8;">Upgrade to Express 5, or wrap async handlers with a tiny <code style="background:#332310;color:#ffca28;">asyncHandler</code> that does <code style="background:#332310;color:#ffca28;">.catch(next)</code>, and make sure the error middleware has four parameters.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the error middleware need exactly four parameters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Express tells error middleware apart from normal middleware by the function's declared parameter count (<code style="background:#332310;color:#ffca28;">fn.length</code>). A function with three parameters is treated as normal middleware and skipped when an error is being passed along. I checked both versions: with a three-parameter handler registered first and a four-parameter one after it, both Express 4 and Express 5 answered with the four-parameter handler. That is also why you keep <code style="background:#332310;color:#ffca28;">next</code> in the signature even if you never call it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did the Express 4 async route hang instead of returning an error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because nothing ever wrote a response. The handler threw after <code style="background:#332310;color:#ffca28;">await</code>, which rejected the promise it returned; Express 4 does not look at that promise, so its error middleware was never called and <code style="background:#332310;color:#ffca28;">res</code> was never ended. The client waits until its own timeout — 500 ms in the demo — and the server keeps the socket open. With an <code style="background:#332310;color:#ffca28;">unhandledRejection</code> listener the process survives but the request still hangs; with none, the process crashes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it ever OK to keep a global unhandledRejection handler and move on?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As a last-resort logger, yes; as the error-handling strategy, no. It cannot send a response for the request that failed, because it has no <code style="background:#332310;color:#ffca28;">res</code>, so the user still gets a hanging request. And after an unexpected rejection the process state may be inconsistent. The usual guidance is to log it and exit so the orchestrator restarts a clean process; correct per-request handling belongs in the route via <code style="background:#332310;color:#ffca28;">next(err)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Express 5 make try/catch in routes unnecessary?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For errors you just want to turn into a 500, mostly yes — a rejection goes to the error middleware automatically. You still want <code style="background:#332310;color:#ffca28;">try/catch</code> when you need to handle a specific error differently (map a not-found error to 404, retry, clean up a resource) and in any callback-based code, because Express 5 only sees errors that reject the promise the handler returns.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the error happens after the response was already sent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then you cannot send a second response. Express documentation recommends that a custom error handler check <code style="background:#332310;color:#ffca28;">res.headersSent</code> and, if true, delegate to <code style="background:#332310;color:#ffca28;">next(err)</code> so the default handler closes the connection. In practice this happens with streaming responses that fail midway; log it and let the connection end.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Synchronous error** | Thrown while the handler is still on the call stack — caught by Express |
| **Asynchronous error** | Happens after the handler returned (after \`await\`, in a callback) |
| **Rejected promise** | How an \`async\` function reports an error to its caller |
| **Unhandled rejection** | A rejection nobody handles; crashes the process by default since Node 15 |
| **Error-handling middleware** | \`(err, req, res, next)\` — four parameters, registered last |
| **Async wrapper** | \`fn => (req, res, next) => Promise.resolve(fn(...)).catch(next)\` |
| **Layer** | The Express router object that invokes each handler |

---
**Conclusion:** Express invokes every handler inside a \`try/catch\`, so a synchronous throw always reaches the error middleware. An \`async\` handler does not throw — it returns a promise that rejects later — and the difference between versions is whether Express looks at that promise. Express 4 throws it away, so the error middleware never runs: in the runs above the request hung, and with no listener the whole process exited. Express 5 attaches \`.then(null, err => next(err))\` and returns a clean 500. Neither version can see an error thrown inside a later callback, which crashed even Express 5. Handle it with Express 5 or an \`asyncHandler\` wrapper on Express 4, \`next(err)\` inside callbacks, and a four-parameter error handler registered after the routes. For error handling beyond Express, see [handling errors in Node.js applications](/interview-question/how-do-you-handle-errors-in-node-js-applications).`,
    examples: [
      {
        label: "The same sync, async and try/catch+next routes under Express 4 and Express 5 (node express-errors.js express4|express5 [callback])",
        tech: "javascript",
        runnable: false,
        code: `// Sync throw vs async throw in Express 4 and Express 5.
// Usage: node express-errors.js express4|express5
const express = require(process.argv[2]);
const version = require(process.argv[2] + "/package.json").version;

const app = express();
app.get("/sync", (req, res) => { throw new Error("sync boom"); });
app.get("/async", async (req, res) => { await null; throw new Error("async boom"); });
app.get("/async-next", async (req, res, next) => {
  try { await null; throw new Error("async boom, forwarded"); } catch (e) { next(e); }
});
app.get("/callback", (req, res) => { setTimeout(() => { throw new Error("callback boom"); }, 0); });
app.use((err, req, res, next) => { res.status(500).json({ caughtBy: "error middleware", message: err.message }); });

process.on("unhandledRejection", (e) => console.log(\`  !! unhandledRejection: \${e.message} (request left hanging)\`));

const server = app.listen(0, async () => {
  const base = \`http://localhost:\${server.address().port}\`;
  console.log(\`Express \${version}\`);
  const routes = process.argv[3] === "callback" ? ["/callback"] : ["/sync", "/async", "/async-next"];
  for (const path of routes) {
    try {
      const r = await fetch(base + path, { signal: AbortSignal.timeout(500) });
      console.log(\`  GET \${path.padEnd(11)} -> \${r.status} \${await r.text()}\`);
    } catch (e) { console.log(\`  GET \${path.padEnd(11)} -> no response (\${e.name})\`); }
  }
  server.closeAllConnections(); server.close();
});`,
      },
      {
        label: "Express 4 with no unhandledRejection listener: one async throw takes the whole process down",
        tech: "javascript",
        runnable: false,
        code: `// Express 4, async handler throws, and NO unhandledRejection listener.
const express = require("express4");
const app = express();
app.get("/async", async () => { await null; throw new Error("async boom"); });
app.get("/ok", (req, res) => res.send("still up"));
app.use((err, req, res, next) => res.status(500).send("handled: " + err.message));
const server = app.listen(0, async () => {
  const base = \`http://localhost:\${server.address().port}\`;
  fetch(base + "/async").catch((e) => console.log("client saw:", e.cause?.code ?? e.name));
  setTimeout(() => fetch(base + "/ok").then((r) => r.text()).then(console.log), 100);
});`,
      },
      {
        label: "The Express 4 fix: an asyncHandler wrapper that forwards rejections to next()",
        tech: "javascript",
        runnable: false,
        code: `// The Express 4 fix: a tiny wrapper that forwards rejections to next().
const express = require("express4");
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const app = express();
app.get("/async", asyncHandler(async () => { await null; throw new Error("async boom"); }));
app.use((err, req, res, next) => res.status(500).json({ handled: err.message }));
const server = app.listen(0, async () => {
  const r = await fetch(\`http://localhost:\${server.address().port}/async\`);
  console.log(r.status, await r.text());
  server.close();
});`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you implement structured logging in a production Node.js application?",
    seoDescription:
      "Structured logging in Node.js: JSON lines with consistent fields, request ids via AsyncLocalStorage, levels, redaction and error serialization to stdout.",
    description: `**Question presented to candidate:**
"An order failed in production last night. The on-call engineer had to grep through millions of interleaved \`console.log\` lines from 40 pods and still could not tell which lines belonged to that customer's request. How would you set up logging in a production Node.js service so that question takes seconds to answer?"

**What a strong answer should cover:**
- **Structured logging:** each log entry is one machine-parseable record (usually one JSON object per line) with consistent fields — \`level\`, \`time\`, \`msg\`, \`service\`, plus event-specific fields — instead of free text.
- **Correlation:** a \`requestId\` (or trace id) on **every** line of a request, propagated automatically with \`AsyncLocalStorage\` rather than passing \`req\` through every function; **child loggers** add fixed context like \`component\`.
- **Levels** (\`debug\`/\`info\`/\`warn\`/\`error\`) filtered cheaply, configured per environment via an env var.
- **Safety and correctness:** **redact** secrets (authorization headers, passwords, tokens) and **serialize errors** properly — \`JSON.stringify(new Error("x"))\` is \`"{}"\`.
- **Shipping:** write to **stdout**, let the platform's collector ship logs to a store you can query; use a fast library such as **pino** rather than hand-rolled \`console.log\`.

**Clarifying questions expected:**
- "Where do logs end up — a hosted log platform, ELK/OpenSearch, a cloud logging service?"
- "Do we already use distributed tracing, so the log field should be the trace id?"

**Code / implementation expected:** Yes — a small logger (or pino configuration) that emits JSON lines with a request id from \`AsyncLocalStorage\`, redaction and error serialization, and a query that pulls one request's lines out of interleaved output.`,
    answer: `**Target Audience:** Backend engineers preparing for Node.js production-readiness and observability interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. All log output below was produced by **actually running** the examples: a logger built only on Node built-ins, and the same setup in pino 10.4.0. This doc focuses on *what* a production logging setup needs and why; the library comparison and \`console.log\` trade-offs are covered in [structured logging with pino or winston](/interview-question/how-do-you-implement-structured-logging-with-pino-or-winston-and-why-avoid-conso).

## 1. Why This Even Matters — A Story First

Picture a shipping warehouse where every worker keeps a diary in their own handwriting: "moved some boxes", "the blue one was heavy", "customer complained?". When a parcel goes missing, a manager has to read forty diaries and guess which entries were about that parcel.

Now picture a warehouse where every action is a printed label stuck on a form with the same boxes every time: time, worker, parcel number, action, result. Finding everything that happened to parcel 8812 is a single search.

Free-text \`console.log\` lines are the diaries. **Structured logs** are the forms. The parcel number — the field that ties every step of one job together — is the **request id**.

## 2. The Core Idea

📌 **Interview term: structured logging** — writing each log entry as a machine-parseable record with named fields, almost always **one JSON object per line** (often called JSON Lines or NDJSON), instead of a sentence of text. A log platform can then index each field, so "all \`error\` lines for \`requestId=req-B\` in service \`orders-api\`" is a query, not a regex.

A good line has two kinds of fields:

- **Standard fields on every line:** \`level\`, \`time\` (ISO 8601, UTC), \`msg\`, \`service\`, and the correlation id.
- **Event fields** specific to what happened: \`orderId\`, \`status\`, \`durationMs\`, \`err\`.

📌 **Interview term: correlation id (request id)** — an id generated (or taken from an incoming \`x-request-id\` header) at the start of a request and attached to every line that request produces, in every service it touches. With distributed tracing, this is usually the trace id.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 150" role="img" aria-label="The Node process writes JSON lines to stdout; the platform collector ships them to a log store where they are queried by field">
  <defs>
    <marker id="lg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">The app only writes lines; the platform moves them</text>
  <rect class="d-box-accent" x="24" y="50" width="160" height="60" rx="10"/>
  <text class="d-text d-accent" x="104" y="74" text-anchor="middle">Node process</text>
  <text class="d-sub" x="104" y="94" text-anchor="middle">JSON line to stdout</text>
  <rect class="d-box-muted" x="240" y="50" width="160" height="60" rx="10"/>
  <text class="d-text" x="320" y="74" text-anchor="middle">collector</text>
  <text class="d-sub" x="320" y="94" text-anchor="middle">agent on the node</text>
  <rect class="d-box-muted" x="456" y="50" width="160" height="60" rx="10"/>
  <text class="d-text" x="536" y="74" text-anchor="middle">log store</text>
  <text class="d-sub" x="536" y="94" text-anchor="middle">index, query, alert</text>
  <path class="d-edge-accent" d="M 186 80 L 236 80" marker-end="url(#lg-arrow)"/>
  <path class="d-edge" d="M 402 80 L 452 80" marker-end="url(#lg-arrow)"/>
</svg>

Writing to stdout and letting the platform ship logs is the [12-factor](/interview-question/what-is-the-12-factor-app-methodology-as-applied-to-node-js-services) approach: the app does not manage files, rotation or network connections to a log vendor.

## 3. The Building Blocks

- 📌 **Interview term: log levels** — \`debug\` < \`info\` < \`warn\` < \`error\` (pino adds \`trace\` and \`fatal\`). Each logger has a minimum level, set from an environment variable such as \`LOG_LEVEL\`, and anything below it is dropped *before* any work is done.
- 📌 **Interview term: child logger** — a logger that carries extra fixed fields: \`log.child({ component: "payments" })\`. Every line it writes includes them, without repeating them at each call.
- 📌 **Interview term: \`AsyncLocalStorage\`** — a Node API (\`node:async_hooks\`) that holds a value for the duration of an async call chain. Call \`context.run({ requestId }, handler)\` and every function the handler reaches, across \`await\`s and timers, can read \`context.getStore()\`. That is how the request id gets onto lines written deep inside the code without passing \`req\` around. It has its own deep-dive: [what AsyncLocalStorage solves](/interview-question/what-is-asynclocalstorage-and-what-problem-does-it-solve).
- 📌 **Interview term: redaction** — replacing sensitive values (an \`authorization\` header, a password, a token) with a placeholder before the line is written. Logs are copied to many systems and kept for a long time; secrets must never reach them.
- 📌 **Interview term: error serialization** — turning an \`Error\` into fields explicitly, because \`message\` and \`stack\` are **not enumerable** and \`JSON.stringify\` skips them.

## 4. Verified: a Structured Logger on Built-ins Only

The first example is a roughly 30-line logger plus a tiny HTTP service. Its core:

~~~js
const write = (level, msg, fields = {}) => {
  if (LEVELS[level] < LEVELS[minLevel]) return;               // filtered before any work
  const line = { level, time: new Date().toISOString(), msg, ...bindings, ...context.getStore(), ...fields };
  process.stdout.write(serialize(line) + "\\n");
};
// serialize() uses a JSON.stringify replacer that redacts keys like "authorization"
// and turns any Error into { type, message, code, stack }.
~~~

The server wraps each request in \`context.run({ requestId }, ...)\`. \`chargeCard()\` is a deep function that never sees \`req\` — it just calls \`log.child({ component: "payments" })\`. Two requests, \`req-A\` (succeeds) and \`req-B\` (card declined), are sent **concurrently**, both with a bearer token. Actual stdout:

~~~
{"level":"info","time":"2026-10-17T13:37:47.451Z","msg":"request received","service":"orders-api","requestId":"req-A","method":"GET","url":"/o-1","headers":{"authorization":"[REDACTED]"}}
{"level":"info","time":"2026-10-17T13:37:47.452Z","msg":"request received","service":"orders-api","requestId":"req-B","method":"GET","url":"/o-2","headers":{"authorization":"[REDACTED]"}}
{"level":"info","time":"2026-10-17T13:37:47.462Z","msg":"charged","service":"orders-api","component":"payments","requestId":"req-A","orderId":"o-1","amountCents":1999}
{"level":"info","time":"2026-10-17T13:37:47.463Z","msg":"request completed","service":"orders-api","requestId":"req-A","status":200,"durationMs":12}
{"level":"error","time":"2026-10-17T13:37:47.464Z","msg":"charge failed","service":"orders-api","requestId":"req-B","err":{"type":"Error","message":"card declined","code":"CARD_DECLINED","stack":"Error: card declined at chargeCard (logger.js:40:17)"}}
{"level":"info","time":"2026-10-17T13:37:47.465Z","msg":"request completed","service":"orders-api","requestId":"req-B","status":402,"durationMs":13}
~~~

Checking each property:

- **Interleaving with correct correlation.** The two requests' lines are mixed together in time, yet every line, including \`charged\` written inside \`chargeCard\`, carries the right \`requestId\`.
- **Redaction.** Both bearer tokens became \`[REDACTED]\`.
- **Error serialization.** The \`err\` field kept \`message\`, \`code\` and the first stack frame. For contrast, the same program also printed what a plain stringify does: \`JSON.stringify(new Error('x')) -> {}\`.
- **Levels.** The \`debug("about to charge")\` call produced nothing at the default \`info\` level. With \`LOG_LEVEL=debug\` the same run added:

~~~
{"level":"debug","time":"2026-10-17T13:37:47.610Z","msg":"about to charge","service":"orders-api","component":"payments","requestId":"req-A","orderId":"o-1"}
{"level":"debug","time":"2026-10-17T13:37:47.610Z","msg":"about to charge","service":"orders-api","component":"payments","requestId":"req-B","orderId":"o-2"}
~~~

And the on-call question from the prompt — "show me everything for that request" — becomes one filter over the file:

~~~
$ node -e '...filter(l => l.requestId === "req-B")...'
info request received
error charge failed
info request completed
~~~

## 5. Verified: the Same Setup in pino

In production you would not hand-roll this; pino provides all of it. The second example (pino 10.4.0):

~~~js
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "orders-api" },              // replaces pid/hostname defaults
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: { paths: ["req.headers.authorization", "*.password"], censor: "[REDACTED]" },
  mixin: () => ({ ...als.getStore() }),         // a FRESH object each call (see below)
});
~~~

Actual output (stack shortened for display):

~~~
{"level":30,"time":"2026-10-17T13:38:08.742Z","service":"orders-api","component":"payments","requestId":"req-C","req":{"headers":{"authorization":"[REDACTED]"}},"user":{"id":7,"password":"[REDACTED]"},"msg":"login"}
{"level":50,"time":"2026-10-17T13:38:08.743Z","service":"orders-api","component":"payments","requestId":"req-C","err":{"type":"Error","message":"card declined","stack":"Error: card declined ...","code":"CARD_DECLINED"},"msg":"charge failed"}
~~~

pino writes numeric levels (30 = info, 50 = error), its built-in \`err\` serializer produced \`type\`, \`message\`, \`stack\` and \`code\`, and the \`debug\` call was dropped.

**A real bug found while writing this.** The first version used \`mixin: () => als.getStore()\`, returning the shared store object itself. The output then showed the first call's \`req\` and \`user\` fields **leaking onto the second, unrelated \`charge failed\` line**. A minimal check confirmed why — pino merged the call's fields into the object the mixin returned:

~~~
store after first log: {"requestId":"r","a":1}
~~~

Returning a fresh copy (\`({ ...als.getStore() })\`) fixed it. The lesson generalizes: anything that hands a logger a shared mutable object as "context" should hand it a copy.

pino transports — which format or forward logs — run in a separate worker thread, off the main event loop ([pino transports docs](https://cdn.jsdelivr.net/npm/pino@10.4.0/docs/transports.md)).

## 6. What to Log, and What Not To

| Log | Do not log |
| :--- | :--- |
| Request start/end with \`method\`, route, \`status\`, \`durationMs\` | Full request/response bodies by default |
| Business events with ids (\`orderId\`, \`userId\`) | Passwords, tokens, API keys, \`authorization\` headers |
| Errors with \`err\` (message, code, stack, \`cause\`) | Card numbers, personal data your policy forbids |
| Retries, timeouts, circuit-breaker state changes | A line inside every loop iteration |
| Startup config summary (without secrets) and shutdown | Duplicate lines for the same error at every layer |

The last row matters: log an error **once**, where it is handled, not at every layer it passes through, or one failure looks like five.

## 7. Common Pitfalls

- **Free-text messages with values baked in** (\`"user 42 paid 19.99"\`). The values cannot be filtered; put them in fields and keep \`msg\` constant.
- **No request id, or one passed by hand.** Lines from concurrent requests become impossible to separate; use \`AsyncLocalStorage\` so every line gets it.
- **Logging \`Error\` objects through plain \`JSON.stringify\`.** Verified above: the result is \`{}\`.
- **Forgetting redaction.** Logs live in more places and for longer than your database, and are read by more people.
- **Sharing a mutable context object with the logger.** Verified above with pino's \`mixin\`: fields from one call leaked into the next line.
- **Writing log files inside containers or calling a log vendor from the request path.** Write to stdout and let the platform ship logs.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">Structured logging means every entry is a machine-parseable record — one JSON object per line with consistent fields like level, time, msg, service — so logs can be filtered and queried, not grepped.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Correlation is the point:</strong> <span style="color:#f0e2c8;">Put a requestId on every line. I use <code style="background:#332310;color:#ffca28;">AsyncLocalStorage</code> so deep functions get it without passing <code style="background:#332310;color:#ffca28;">req</code> around; in my run two concurrent requests interleaved, and one filter pulled out exactly one request.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Levels and context:</strong> <span style="color:#f0e2c8;">Levels set by an env var, so debug lines cost almost nothing in production, and child loggers for fixed fields like component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Safety:</strong> <span style="color:#f0e2c8;">Redact authorization headers, passwords and tokens, and serialize errors explicitly — <code style="background:#332310;color:#ffca28;">JSON.stringify</code> of an Error is an empty object, so you would lose the message and stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Production setup:</strong> <span style="color:#f0e2c8;">Use pino rather than <code style="background:#332310;color:#ffca28;">console.log</code>, write to stdout and let the platform collector ship it, and alert on error-level rates.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just pass the request id as an argument everywhere?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works for two layers and breaks down at ten: every function signature grows a <code style="background:#332310;color:#ffca28;">logger</code> or <code style="background:#332310;color:#ffca28;">reqId</code> parameter, and any library callback in between drops it. <code style="background:#332310;color:#ffca28;">AsyncLocalStorage</code> keeps a store per async context, so <code style="background:#332310;color:#ffca28;">context.run({ requestId }, handler)</code> makes the id available to every function that handler calls, across <code style="background:#332310;color:#ffca28;">await</code>s and timers. In the demo <code style="background:#332310;color:#ffca28;">chargeCard</code> never received <code style="background:#332310;color:#ffca28;">req</code>, yet its lines carried <code style="background:#332310;color:#ffca28;">req-A</code> or <code style="background:#332310;color:#ffca28;">req-B</code> correctly even though the two requests ran concurrently.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does logging an Error object need special handling?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Error's <code style="background:#332310;color:#ffca28;">message</code> and <code style="background:#332310;color:#ffca28;">stack</code> are not enumerable own properties, so <code style="background:#332310;color:#ffca28;">JSON.stringify(new Error('x'))</code> returns <code style="background:#332310;color:#ffca28;">{}</code> — verified in the run. A naive JSON logger would write <code style="background:#332310;color:#ffca28;">"err":{}</code> and you would lose exactly the information you needed. The fix is a serializer that copies <code style="background:#332310;color:#ffca28;">name</code>, <code style="background:#332310;color:#ffca28;">message</code>, <code style="background:#332310;color:#ffca28;">stack</code> and any <code style="background:#332310;color:#ffca28;">code</code> or <code style="background:#332310;color:#ffca28;">cause</code>; pino ships one for the <code style="background:#332310;color:#ffca28;">err</code> key, which is why the pino output showed <code style="background:#332310;color:#ffca28;">type</code>, <code style="background:#332310;color:#ffca28;">message</code>, <code style="background:#332310;color:#ffca28;">stack</code> and <code style="background:#332310;color:#ffca28;">code</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is logging to stdout really enough? Should the app not write to files or send to the log service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For containerized services stdout is the standard: the platform already captures it, rotates it and ships it, and the app stays simple. Writing files inside a container fills a disk nobody watches, and sending directly to a log vendor over the network puts a slow dependency in your request path. If you need routing or formatting, pino transports run in a worker thread so the main event loop is not doing it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What went wrong when you first wired AsyncLocalStorage into pino?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">My first version used <code style="background:#332310;color:#ffca28;">mixin: () =&gt; als.getStore()</code>. pino merged each call's fields into the object the mixin returned, and since that was the shared store object, the <code style="background:#332310;color:#ffca28;">req</code> and <code style="background:#332310;color:#ffca28;">user</code> fields from the first log call reappeared on the next, unrelated line. I confirmed it with a tiny test: after one <code style="background:#332310;color:#ffca28;">logger.info({ a: 1 })</code>, the store contained <code style="background:#332310;color:#ffca28;">a: 1</code>. Returning a fresh copy, <code style="background:#332310;color:#ffca28;">mixin: () =&gt; ({ ...als.getStore() })</code>, fixed it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep logging from hurting performance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pick a fast logger (pino is designed for low overhead), filter by level before building the line — in my logger the level check runs first, so a <code style="background:#332310;color:#ffca28;">debug</code> call at <code style="background:#332310;color:#ffca28;">info</code> level does no serialization — avoid logging huge objects, sample very high-volume info lines if needed, and never log synchronously to a slow destination from the request path.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Structured logging** | Each entry is a parseable record with named fields, usually one JSON object per line |
| **Correlation / request id** | An id on every line of one request, across services |
| **Log level** | Severity; lines below the configured minimum are dropped |
| **Child logger** | A logger that adds fixed fields to every line it writes |
| **\`AsyncLocalStorage\`** | Holds per-request context across \`await\`s without passing it around |
| **Redaction** | Replacing secrets with a placeholder before writing |
| **Error serialization** | Copying \`message\`, \`stack\`, \`code\` into fields, since \`JSON.stringify\` skips them |
| **pino mixin** | A function whose returned fields are merged into every line |

---
**Conclusion:** structured logging turns logs from diaries into queryable data: one JSON object per line with consistent fields, levels controlled by an environment variable, child loggers for fixed context, and a request id on every line. In Node the request id comes from \`AsyncLocalStorage\`, which is why, in the run above, two concurrent requests' lines interleaved and one filter still pulled out exactly one of them. Redact secrets, serialize errors explicitly (a plain \`JSON.stringify\` of an Error gives \`{}\`), write to stdout for the platform to ship, and use pino rather than hand-rolled \`console.log\` — taking care to give its \`mixin\` a fresh object, since sharing the store leaked fields between lines in the first version of this demo.`,
    examples: [
      {
        label: "A structured logger on built-ins only: JSON lines, levels, child bindings, request id via AsyncLocalStorage, redaction and Error serialization",
        tech: "javascript",
        runnable: false,
        code: `// A minimal structured logger on built-ins only: one JSON object per line,
// levels, child bindings, request context via AsyncLocalStorage, redaction,
// and proper Error serialization.
const { AsyncLocalStorage } = require("node:async_hooks");
const http = require("node:http");

const LEVELS = { debug: 20, info: 30, warn: 40, error: 50 };
const REDACT = new Set(["password", "authorization", "token"]);
const context = new AsyncLocalStorage();

function serialize(value) {
  return JSON.stringify(value, (key, v) => {
    if (REDACT.has(key.toLowerCase())) return "[REDACTED]";
    if (v instanceof Error) return { type: v.name, message: v.message, code: v.code, stack: v.stack.split("\\n").slice(0, 2).map((s) => s.trim().replace(/\\(.*\\//, "(")).join(" ") };
    return v;
  });
}

function createLogger(bindings = {}, minLevel = process.env.LOG_LEVEL || "info") {
  const write = (level, msg, fields = {}) => {
    if (LEVELS[level] < LEVELS[minLevel]) return;               // filtered before any work
    const line = { level, time: new Date().toISOString(), msg, ...bindings, ...context.getStore(), ...fields };
    process.stdout.write(serialize(line) + "\\n");               // stdout; the platform ships it
  };
  return {
    debug: (m, f) => write("debug", m, f), info: (m, f) => write("info", m, f),
    warn: (m, f) => write("warn", m, f), error: (m, f) => write("error", m, f),
    child: (more) => createLogger({ ...bindings, ...more }, minLevel),
  };
}

const log = createLogger({ service: "orders-api" });

// Deep inside the app: no req object passed in, still gets requestId.
async function chargeCard(orderId) {
  const dbLog = log.child({ component: "payments" });
  dbLog.debug("about to charge", { orderId });                  // dropped at level=info
  await new Promise((r) => setTimeout(r, 10));
  if (orderId === "o-2") {
    const err = new Error("card declined"); err.code = "CARD_DECLINED";
    throw err;
  }
  dbLog.info("charged", { orderId, amountCents: 1999 });
}

const server = http.createServer((req, res) => {
  const requestId = req.headers["x-request-id"] || "generated-id";
  context.run({ requestId }, async () => {
    const started = Date.now();
    log.info("request received", { method: req.method, url: req.url, headers: { authorization: req.headers.authorization } });
    try {
      await chargeCard(req.url.slice(1));
      res.end("ok");
    } catch (err) {
      log.error("charge failed", { err });
      res.statusCode = 402; res.end("declined");
    }
    log.info("request completed", { status: res.statusCode, durationMs: Date.now() - started });
  });
});

server.listen(0, async () => {
  const base = \`http://localhost:\${server.address().port}\`;
  // two concurrent requests: their lines interleave but each carries its own id
  await Promise.all([
    fetch(base + "/o-1", { headers: { "x-request-id": "req-A", authorization: "Bearer secret123" } }),
    fetch(base + "/o-2", { headers: { "x-request-id": "req-B", authorization: "Bearer secret456" } }),
  ]);
  console.error("\\nJSON.stringify(new Error('x')) ->", JSON.stringify(new Error("x")));
  server.close();
});`,
      },
      {
        label: "The same ideas with pino: redact paths, err serializer, child logger, and a mixin that returns a fresh object",
        tech: "javascript",
        runnable: false,
        code: `// The same ideas with pino: redact paths, err serializer, child loggers,
// and a mixin that pulls requestId from AsyncLocalStorage.
const pino = require("pino");
const { AsyncLocalStorage } = require("node:async_hooks");
const als = new AsyncLocalStorage();

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "orders-api" },              // replaces pid/hostname defaults
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: { paths: ["req.headers.authorization", "*.password"], censor: "[REDACTED]" },
  mixin: () => ({ ...als.getStore() }),        // a FRESH object each call (see below)
});

als.run({ requestId: "req-C" }, () => {
  const payments = logger.child({ component: "payments" });
  payments.info({ req: { headers: { authorization: "Bearer abc" } }, user: { id: 7, password: "hunter2" } }, "login");
  const err = Object.assign(new Error("card declined"), { code: "CARD_DECLINED" });
  payments.error({ err }, "charge failed");
  payments.debug("dropped at info level");
});`,
      },
    ],
  },
];

export default augments;
