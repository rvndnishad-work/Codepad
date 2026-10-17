/**
 * AI ENGINEERING ULTRA — batch 10: reliability, latency and cost (resilient
 * calls with rate limits, retries and fallbacks; latency per request stage;
 * estimating and controlling LLM cost; keeping the bill predictable;
 * semantic caching and when it is safe).
 * Every example was run by scripts/verify-variant-examples.ts (node, python);
 * quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `How do you build resilient LLM calls with rate limits, retries and fallbacks?`,
    difficulty: "medium",
    seoDescription: `Make LLM calls survive 429s, 529s and outages: classify errors, jittered backoff, Retry-After, token buckets, circuit breakers and tested fallbacks.`,
    description: `**Question presented to candidate:**
"Our product makes a few hundred thousand model calls a day, and every week or so the provider throws 429s or 529s, or one region just times out, and our users see a spinner and then an error. Walk me through how you would wrap our LLM calls so that rate limits, transient failures and a full provider outage do not become user-facing outages."

**What a strong answer should cover:**
- Classify failures first: retry only transient ones (429, 408, 409, 5xx and overloaded, timeouts, dropped connections); never retry a 400, 401, 403 or a spend-cap 429, and fail those fast
- Exponential backoff with jitter (full jitter spreads retries; no jitter makes every client retry in the same instant), honour \`retry-after\` when the server sends it, cap the attempts and keep one overall deadline per user request
- Stay under the limit instead of bouncing off it: a client-side token bucket or queue sized to your RPM and tokens-per-minute limits, priority for interactive traffic, batch or defer the rest
- A circuit breaker per provider or region (closed, open, half-open) so a dead tier is skipped instantly instead of costing every request its full retry budget
- A fallback chain ordered by how similar the behaviour is (same model in another region, then a sibling model, then another provider) with every fallback in the eval suite, plus an explicit degraded mode in the product
- Idempotency and streaming details: do not blindly retry calls that triggered side effects (tool calls), and treat a stalled or mid-stream error as a failure to handle, not a success

**Clarifying questions expected:**
- What is the latency budget for a user request, and is the traffic interactive, background, or both?
- Are we on one provider and one region today, and are fallback models already evaluated for this feature?
- Do any of these calls trigger side effects (tool calls, writes) that must not run twice?

**Code / implementation expected:** Optional — a retry wrapper with error classification, jittered backoff, \`retry-after\` handling and a fallback list is enough; a circuit breaker is a strong extra.`,
    answer: `**Target Audience:** Engineers putting an LLM feature in front of real users who have seen their first 429 or 529 in production and want a resilience layer that is more than "wrap it in a try/catch and try again".
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (both examples below run on a fake clock with stub providers, so the timing logic is real but no API is called). Provider behaviour (status codes, headers, SDK defaults, rate-limit algorithms) is quoted from the Anthropic and OpenAI documentation, checked October 2026, and cited inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You phone a busy restaurant to book a table. It is engaged. What do you do?

A sensible person waits a little and tries again, and if it is still engaged, waits a bit longer. If the recorded message says "please call back in two minutes", they wait two minutes, not ten seconds. If the restaurant says "we do not take bookings by phone", they stop calling, because calling again will never work. And if the restaurant has burned down, they do not keep dialling all evening: after a few tries they ring the place next door, which serves something similar.

Now picture a thousand people who all got the engaged tone at 7:00 pm and all redial at exactly 7:01. The line is engaged again, for everyone, because they all came back at once.

An LLM API is that restaurant. It is shared, it has a per-customer quota, it sometimes gets overloaded for everybody, and once in a while a region goes down. A resilient call is just the sensible caller written as code: wait and retry the right errors, listen to "call back in N seconds", give up on errors that will never succeed, spread the retries out, stop dialling a dead number, and have a next-door restaurant ready.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the latency budget for one user request? | It sets the overall deadline, so how many retries and fallbacks fit before you must show a degraded answer. |
| Is this traffic interactive, background, or both? | Background work can wait, queue, or move to a batch API; interactive work needs fast fallback instead of long waits. |
| One provider and region today, or several? | Decides which fallback tiers exist (another region, a sibling model, another provider) and how different their behaviour is. |
| Are the fallback models evaluated on this feature? | An untested fallback can turn an outage into silently wrong answers. |
| Do these calls trigger side effects, such as tool calls that write data? | Retrying a call that already caused a write can do it twice; it needs idempotency keys. |
| What are our rate limits (requests and tokens per minute) and current peak? | Tells you whether you have a burst problem (smooth it) or a capacity problem (raise limits, cache, or shed). |

## 3. Not All Failures Are Equal: Classify Before You Retry

The first decision is not *how* to retry but *whether* to. Retrying an error that cannot succeed wastes time and money; not retrying an error that would have succeeded on the second try turns a blip into a user-facing failure.

📌 **Interview term: transient error** — a failure caused by a temporary condition (overload, a brief rate limit, a dropped connection, a timeout) that may succeed if the same request is sent again later.

📌 **Interview term: permanent (non-retryable) error** — a failure that will repeat no matter how often you resend the same request: invalid input, bad credentials, a forbidden model, a request that is too large.

What the providers document (checked October 2026):

- **Anthropic** lists 429 \`rate_limit_error\` (you hit your organisation limit) and 529 \`overloaded_error\` ("the API is temporarily overloaded", which can happen when traffic is high across all users). Its rate-limits page says a limit violation returns 429 with a \`retry-after\` header giving the seconds to wait. Its errors page also notes that a 429 caused by a **spend cap** carries no \`retry-after\` and that retrying it, including the SDK automatic retries, fails until access resumes (Claude API errors and rate-limits docs).
- **OpenAI** documents the \`x-ratelimit-limit-*\`, \`x-ratelimit-remaining-*\` and \`x-ratelimit-reset-*\` headers for requests and tokens, and says \`Retry-After\` may be present on 429s caused by a temporary rate limit, but that quota or billing errors are not fixed by retrying (OpenAI rate-limits guide).
- **SDK defaults:** both official Python SDKs document that connection errors, 408, 409, 429 and 5xx responses are retried automatically, 2 times by default with exponential backoff, configurable with \`max_retries\` (Anthropic Python SDK docs; OpenAI SDK docs). The Anthropic Python SDK also documents a 10-minute default request timeout.

That last point matters in practice: if you add your own retry loop **on top of** the SDK default, three of your attempts times three SDK attempts is nine real requests per call. Pick one layer to own retries (usually yours, with \`max_retries=0\` on the SDK, or the SDK, with yours only doing fallback).

| Signal | Retry? | Why |
| :--- | :--- | :--- |
| 429 with \`retry-after\` | Yes, after exactly that wait | The server told you when capacity returns |
| 429 for a spend cap or exhausted quota | No | It will not clear until a human or the month changes it |
| 529 / 503 / 500 / 502 / 504 | Yes, with backoff | Provider-side and usually brief |
| 408, timeouts, connection reset | Yes, with backoff | The network or the provider dropped it |
| 400, 401, 403, 404, 413 | No | The same request fails everywhere; fix it or surface it |
| Stream that stalls or errors after a 200 | Treat as a failure | A 200 status line does not mean the answer arrived |

## 4. Backoff and Jitter: Spread the Retries Out

📌 **Interview term: exponential backoff** — waiting longer after each failed attempt, typically doubling (0.5 s, 1 s, 2 s, ...), up to a cap, so a struggling server gets breathing room.

Backoff alone has a flaw: clients that failed at the same moment also *retry* at the same moment. That is the thousand diners redialling at 7:01.

📌 **Interview term: thundering herd** — many clients hitting a recovering service in the same instant, knocking it over again.

📌 **Interview term: jitter** — randomness added to each wait. **Full jitter** picks the wait uniformly between 0 and the backoff cap; **equal jitter** keeps half the cap and randomises the other half. Both come from Marc Brooker's AWS Architecture Blog post *Exponential Backoff And Jitter*, which found Full and Equal jitter cut the total work substantially compared with no jitter.

The second example, **"Why jitter matters, and a client-side token bucket"**, has 1000 clients fail at t=0 and retry twice. It counts how many retries land in the busiest 100 ms window:

~~~text
part 1: 1000 clients fail at t=0, retry twice (waits capped at 1s, then 2s)
  no jitter     peak 1000 retries in one 100ms window, spread over 2 windows
  equal jitter  peak  227 retries in one 100ms window, spread over 20 windows
  full jitter   peak  146 retries in one 100ms window, spread over 30 windows
~~~

Without jitter, all 1000 retries arrive in the same 100 ms, twice. Full jitter spreads them over 30 windows, so the peak is about seven times lower. Same number of retries, very different load on the server.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Retries over time. Without jitter all clients retry in one spike at 1 second and another at 3 seconds. With full jitter the same retries are spread evenly across the window">
  <text class="d-text" x="190" y="30" text-anchor="middle">no jitter</text>
  <rect class="d-box-muted" x="40" y="60" width="300" height="140" rx="8"/>
  <rect class="d-box-accent" x="110" y="80" width="24" height="120"/>
  <rect class="d-box-accent" x="250" y="80" width="24" height="120"/>
  <text class="d-sub" x="122" y="225" text-anchor="middle">1s</text>
  <text class="d-sub" x="262" y="225" text-anchor="middle">3s</text>
  <text class="d-text" x="570" y="30" text-anchor="middle">full jitter</text>
  <rect class="d-box-muted" x="420" y="60" width="300" height="140" rx="8"/>
  <rect class="d-box" x="440" y="170" width="20" height="30"/>
  <rect class="d-box" x="470" y="165" width="20" height="35"/>
  <rect class="d-box" x="500" y="172" width="20" height="28"/>
  <rect class="d-box" x="530" y="160" width="20" height="40"/>
  <rect class="d-box" x="560" y="168" width="20" height="32"/>
  <rect class="d-box" x="590" y="174" width="20" height="26"/>
  <rect class="d-box" x="620" y="166" width="20" height="34"/>
  <rect class="d-box" x="650" y="171" width="20" height="29"/>
  <rect class="d-box" x="680" y="169" width="20" height="31"/>
  <text class="d-sub" x="450" y="225" text-anchor="middle">0s</text>
  <text class="d-sub" x="690" y="225" text-anchor="middle">3s</text>
</svg>

Each bar is the number of retries landing in a short window: the same total on both sides, but on the left it arrives as two spikes and on the right as a low, even trickle the server can absorb.

When the server *does* tell you when to come back, use that instead of your own guess.

📌 **Interview term: Retry-After** — an HTTP response header with the number of seconds (or a date) after which a retry may succeed. Retrying earlier just earns another 429.

## 5. Stay Under the Limit Instead of Bouncing Off It

Retries handle the 429 after it happens. Better still is not to cause it. Provider limits are expressed as requests per minute and tokens per minute.

📌 **Interview term: RPM / TPM (ITPM, OTPM)** — requests per minute and tokens per minute. Anthropic splits tokens into input tokens per minute and output tokens per minute and documents that, for most current models, cached input tokens do not count toward the input limit, which makes [prompt caching](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency) a throughput lever as well as a cost one (Claude rate-limits docs, October 2026).

📌 **Interview term: token bucket** — a rate limiter that holds up to N tokens, refills continuously at a fixed rate, and lets a request through only if it can pay its cost from the bucket. Anthropic documents that its API uses the token bucket algorithm, so capacity is replenished continuously rather than reset at fixed intervals.

If the provider meters you with a bucket, the cleanest client is one that keeps a mirror of that bucket and waits *before* sending. Part 2 of the same example sends 30 requests of 3,000 tokens at once against a 60,000 tokens-per-minute limit:

~~~text
part 2: 30 requests of 3000 tokens arrive at once; limit 60000 tokens/minute
  a) no client limiter: 20 accepted, 10 rejected with 429 (each one now retries)
  b) client token bucket: 30 accepted, 0 rejected
     first 20 sent at t=0s, then one every 3s, last at t=30s
~~~

Same throughput either way, because the limit is the limit. The difference is that (a) produces ten errors, ten retries and ten backoff waits, while (b) produces a predictable queue. In a real fleet the local bucket is shared (a Redis counter, or a gateway in front of all workers); the in-process version here leaves out that coordination. For background work that does not need an answer now, a [batch API](/interview-question/when-should-you-use-batch-apis-instead-of-real-time-llm-calls) usually has its own, larger limits and takes the load off the interactive path entirely.

## 6. Circuit Breakers and Fallback Chains

Retries help when a failure is brief. During a real outage they make things worse: every request spends its whole retry budget, seconds each, before giving up.

📌 **Interview term: circuit breaker** — a guard around a dependency that counts failures. **Closed**: calls pass through. After N consecutive failures it goes **open**: calls are refused instantly without touching the dependency. After a cooldown it goes **half-open**: one trial call is let through; success closes it, failure opens it again. The pattern was popularised by Michael Nygard in *Release It!* and is described in Martin Fowler's CircuitBreaker article.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Circuit breaker states: closed goes to open after repeated failures, open goes to half-open after a cooldown, half-open goes back to closed on success or to open on failure">
  <defs>
    <marker id="ai10q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="80" width="150" height="70" rx="10"/>
  <text class="d-text" x="105" y="112" text-anchor="middle">closed</text>
  <text class="d-sub" x="105" y="134" text-anchor="middle">calls pass</text>
  <rect class="d-box-accent" x="310" y="80" width="150" height="70" rx="10"/>
  <text class="d-text" x="385" y="112" text-anchor="middle">open</text>
  <text class="d-sub" x="385" y="134" text-anchor="middle">fail fast</text>
  <rect class="d-box-muted" x="590" y="80" width="150" height="70" rx="10"/>
  <text class="d-text" x="665" y="112" text-anchor="middle">half-open</text>
  <text class="d-sub" x="665" y="134" text-anchor="middle">one probe</text>
  <path class="d-edge" d="M 184 105 L 304 105" marker-end="url(#ai10q1-arrow)"/>
  <text class="d-sub" x="244" y="90" text-anchor="middle">N failures</text>
  <path class="d-edge" d="M 464 105 L 584 105" marker-end="url(#ai10q1-arrow)"/>
  <text class="d-sub" x="524" y="90" text-anchor="middle">cooldown</text>
  <path class="d-edge-dashed" d="M 600 154 C 520 200 470 200 420 156" marker-end="url(#ai10q1-arrow)"/>
  <text class="d-sub" x="510" y="212" text-anchor="middle">probe fails</text>
  <path class="d-edge-accent" d="M 665 76 C 600 20 170 20 105 76" marker-end="url(#ai10q1-arrow)"/>
  <text class="d-sub" x="385" y="40" text-anchor="middle">probe succeeds</text>
</svg>

The breaker turns "every request waits through three failed attempts" into "one request in a while checks whether the provider is back".

When a tier is open or exhausted, the call moves down a list of alternatives.

📌 **Interview term: fallback chain** — an ordered list of ways to answer: usually the same model in another region or deployment (identical behaviour), then a smaller or older sibling model (close behaviour), then a different provider (different behaviour, different prompt quirks), and finally a product-level degraded mode.

📌 **Interview term: degraded mode** — what the product does when every tier fails: a cached or canned answer marked as such, a simpler non-LLM flow, or "we have queued your request and will notify you". Showing an honest degraded state beats an endless spinner.

The rule that separates a senior answer from a junior one: **a fallback is a different product unless you have tested it.** A smaller model or another provider may ignore a formatting instruction, refuse differently or call tools differently. Put every fallback tier in your regression evals (see [How do you catch regressions when changing a prompt or upgrading a model?](/interview-question/how-do-you-catch-regressions-when-changing-a-prompt-or-upgrading-a-model)) and keep prompts portable enough to run on each.

## 7. Watching It Work

The first example, **"Retries, Retry-After, a circuit breaker and a fallback chain"**, runs eight requests through three stub tiers (\`primary\`, \`region-b\`, \`small-model\`) on a fake clock. Each call takes 300 ms; the policy is 3 attempts per tier, full jitter on a 500 ms base, a 20 s overall deadline, and a breaker that opens after 5 consecutive transient failures with a 30 s cooldown. The key part:

~~~js
const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504, 529]);
// ...
if (!RETRYABLE.has(r.status)) return { ok: false, retryable: false, status: r.status };
if (r.retryAfter !== undefined) wait = r.retryAfter * 1000;           // the server knows best
else wait = Math.floor(rand() * Math.min(CAP, BASE * 2 ** attempt));  // full jitter
if (now + wait - start > DEADLINE) break;                              // fall back instead
~~~

Highlights from the run:

~~~text
== 1) 429 with retry-after: 2 ==
  t=0.300s primary attempt 1 -> 429
  t=0.300s wait 2.000s (retry-after header)
  t=2.600s primary attempt 2 -> 200
  result: ok from primary, took 2.600s
~~~

~~~text
== 4) retry-after: 30 is longer than the 20s budget ==
  t=4.696s primary attempt 1 -> 429
  t=4.696s wait 30.000s would pass the deadline, give up
  t=4.996s region-b attempt 1 -> 200
  result: ok from region-b, took 0.600s
~~~

Request 4 is the one people forget: honouring \`retry-after\` does not mean *waiting* for it. If the wait does not fit the user deadline, go to the next tier now. Request 3 (a 400) is returned straight to the caller without retries or fallbacks, and the breaker deliberately does not count it, because a client error says nothing about provider health. Requests 5 to 8 show the outage path: three failed attempts cost request 5 about 2.3 s; by request 6 the breaker opens; request 7 skips the primary instantly; 30 s later one half-open probe succeeds and the breaker closes.

## 8. Verified: Running the Code

Both examples are self-contained: the "providers" are stub objects that return scripted status codes, time is a counter, and randomness is a seeded Park-Miller generator implemented identically in both languages, so every run prints the same thing. What the stubs leave out: real network latency variance, streaming, and the shared state you need across many workers (breaker and limiter state usually live in a gateway or Redis).

**"Retries, Retry-After, a circuit breaker and a fallback chain"** — \`node a.js\` and \`python3.12 a.py\` both print exactly:

~~~text
== 1) 429 with retry-after: 2 ==
  t=0.300s primary attempt 1 -> 429
  t=0.300s wait 2.000s (retry-after header)
  t=2.600s primary attempt 2 -> 200
  result: ok from primary, took 2.600s
== 2) two 503s, then success ==
  t=2.900s primary attempt 1 -> 503
  t=2.900s wait 0.045s (full jitter, cap 1000ms)
  t=3.245s primary attempt 2 -> 503
  t=3.245s wait 0.551s (full jitter, cap 2000ms)
  t=4.096s primary attempt 3 -> 200
  result: ok from primary, took 1.496s
== 3) 400 invalid request ==
  t=4.396s primary attempt 1 -> 400
  result: error 400 returned to caller (a bad request fails on every tier), took 0.300s
== 4) retry-after: 30 is longer than the 20s budget ==
  t=4.696s primary attempt 1 -> 429
  t=4.696s wait 30.000s would pass the deadline, give up
  t=4.996s region-b attempt 1 -> 200
  result: ok from region-b, took 0.600s
== 5) primary outage begins ==
  t=5.296s primary attempt 1 -> 503
  t=5.296s wait 0.340s (full jitter, cap 1000ms)
  t=5.936s primary attempt 2 -> 503
  t=5.936s wait 0.808s (full jitter, cap 2000ms)
  t=7.044s primary attempt 3 -> 503
  t=7.344s region-b attempt 1 -> 200
  result: ok from region-b, took 2.348s
== 6) outage continues ==
  t=7.644s primary attempt 1 -> 503 (breaker opens)
  t=7.944s region-b attempt 1 -> 200
  result: ok from region-b, took 0.600s
== 7) breaker is open ==
  t=7.944s primary breaker open, skipped
  t=8.244s region-b attempt 1 -> 200
  result: ok from region-b, took 0.300s
== 8) 30s later: half-open probe ==
  t=38.544s primary attempt 1 -> 200 (half-open probe)
  result: ok from primary, took 0.300s
primary breaker: closed
~~~

**"Why jitter matters, and a client-side token bucket"** — \`node b.js\` and \`python3.12 b.py\` both print exactly:

~~~text
part 1: 1000 clients fail at t=0, retry twice (waits capped at 1s, then 2s)
  no jitter     peak 1000 retries in one 100ms window, spread over 2 windows
  equal jitter  peak  227 retries in one 100ms window, spread over 20 windows
  full jitter   peak  146 retries in one 100ms window, spread over 30 windows
part 2: 30 requests of 3000 tokens arrive at once; limit 60000 tokens/minute
  a) no client limiter: 20 accepted, 10 rejected with 429 (each one now retries)
  b) client token bucket: 30 accepted, 0 rejected
     first 20 sent at t=0s, then one every 3s, last at t=30s
~~~

What the runs show:

- \`retry-after\` was honoured exactly when it fit (2 s) and skipped in favour of a fallback when it did not (30 s against a 20 s budget).
- A 400 was neither retried nor counted against the breaker.
- Once the breaker opened, a request cost 0.3 s on the fallback instead of seconds of doomed retries; a single half-open probe restored the primary.
- Jitter cut the peak retry load from 1000 to 146 per 100 ms window; a client-side bucket turned 10 rejections into a queue with zero rejections.

## 9. Streaming, Tools and Idempotency

- **Streams fail in the middle.** A streamed response can start with 200 and then stall or emit an error event. Put a "no token for N seconds" stall timer on the stream; if it fires before any text reached the user, retry or fall back as usual; if the user has already seen half an answer, you need a product decision (restart with a notice, or continue on a fallback). The mechanics are in [Streaming LLM responses to the UI: SSE, chunking, abort and resume](/interview-question/streaming-llm-responses-to-the-ui-sse-chunking-abort-and-resume).
- **Retrying a model call is safe; retrying its side effects is not.** Generating text twice costs tokens. Executing a "refund order 123" tool call twice costs money. Give tool executions an idempotency key derived from the conversation and step, and check it before acting. Agent-specific handling is in [How should an agent handle tool errors, timeouts and retries?](/interview-question/how-should-an-agent-handle-tool-errors-timeouts-and-retries)
- **Timeouts need a budget, not just a number.** A per-attempt timeout plus an overall deadline per user request; the SDK default (10 minutes in the Anthropic Python SDK docs) is far longer than any interactive user will wait.

## 10. Policy Matrix

| Failure | First response | If it continues |
| :--- | :--- | :--- |
| 429 rate limit with \`retry-after\` | Wait exactly that long, if it fits the deadline | Fall back; fix the cause with a client limiter, caching or a higher tier |
| 429 spend cap / quota | Do not retry | Alert a human; degrade |
| 529 overloaded, 5xx, timeouts | Retry with jittered backoff, 2 to 3 attempts | Breaker opens; next tier in the chain |
| 400 / 401 / 403 / 413 | Return the error, log it | Fix the request; never fall back (it fails everywhere) |
| Full region or provider outage | Breaker skips it in milliseconds | Cross-provider fallback or degraded mode |
| Stream stalls | Abort after N silent seconds | Retry or fall back if nothing was shown yet |

## Common Pitfalls

- **Retrying everything.** Retrying a 400 or a spend-cap 429 burns the latency budget for a guaranteed failure and hides a real bug.
- **Stacking retry layers.** Your loop times the SDK default retries times a gateway retry policy multiplies traffic exactly when the provider is struggling. Own retries in one place.
- **Backoff without jitter.** A fleet that retries on the same schedule recreates the spike it is backing off from.
- **No overall deadline.** Three attempts on three tiers with backoff can take a minute; the user left after five seconds. Budget the whole request, not each call.
- **Untested fallbacks.** A fallback model that breaks your JSON schema or tool format is a second outage that looks like success. Evaluate every tier.
- **Treating 429 as a provider problem.** A steady stream of 429s means you are over your own limit; the fix is a limiter, caching, batching or a higher tier, not more retries.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Classify first:</strong> <span style="color:#f0e2c8;">Before retrying anything I sort the failure. Transient errors, meaning 429 rate limits, 529 or 5xx overloads, timeouts and dropped connections, get retried. A 400, an auth error or a spend-cap 429 never will succeed, so I fail those fast and surface them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Back off with jitter, obey Retry-After:</strong> <span style="color:#f0e2c8;">Retries use exponential backoff with <strong style="color:#ffca28;">full jitter</strong>, so a fleet that failed together does not retry together. In my demo jitter cut the peak from 1000 retries in one 100 ms window to 146. If the server sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">retry-after</code> I wait exactly that, but only if it fits the request deadline; otherwise I fall back right away.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Stay under the limit:</strong> <span style="color:#f0e2c8;">Most 429s are self-inflicted. A client-side token bucket sized to our requests and tokens per minute queues the burst instead of bouncing off the limit, interactive traffic gets priority, and background work goes to a batch API. Prompt caching also helps, since cached input usually does not count toward the input-token limit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Breaker and fallback chain:</strong> <span style="color:#f0e2c8;">Each provider or region sits behind a <strong style="color:#ffca28;">circuit breaker</strong>: after a few consecutive failures it opens and calls skip that tier in milliseconds, with a half-open probe after a cooldown. Behind it is a chain ordered by similarity: same model in another region, then a sibling model, then another provider, then an honest degraded mode.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The senior details:</strong> <span style="color:#f0e2c8;">One layer owns retries, because SDKs already retry twice by default and layers multiply. Every fallback model is in the eval suite, since an untested fallback is a silent quality outage. Tool calls with side effects carry idempotency keys, and streams get a stall timer because a 200 is not a finished answer.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is jitter so important if we already back off exponentially?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Backoff spaces out one client's attempts; it does nothing about many clients that failed at the same moment. Without jitter they all wait 1 s, then 2 s, and hit the server in synchronised waves. Full jitter picks each wait uniformly between 0 and the cap, which spreads the same number of retries across the window.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should a 429 trip the circuit breaker?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends what the breaker protects. A 429 says we are over <em style="color:#d8d8d8;">our</em> quota, not that the provider is unhealthy, so many teams feed 429s to the rate limiter and only 5xx, 529 and timeouts to the breaker. Either way a 4xx client error such as 400 should not count, because it fails on every tier.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The SDK already retries. Why write your own?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The official SDKs retry connection errors, 408, 409, 429 and 5xx twice by default, which is fine for a script. A product also needs a request deadline, fallbacks across tiers, breaker state shared across workers and metrics per attempt. I either set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_retries</code> to 0 and own it, or keep the SDK retries and only add fallback on top, never both silently.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pick the fallback models?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By how close their behaviour is. The same model in another region is identical. A smaller sibling is close but cheaper and weaker. Another provider is a different product with different prompt quirks. Each one runs our regression evals, and we log which tier served every response so quality issues can be traced to fallback traffic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to a streamed answer that fails halfway?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A stall timer aborts when no token arrives for N seconds. If nothing was shown yet, it is an ordinary retry or fallback. If the user already saw half an answer, I either restart with a short notice or continue on a fallback by sending the partial text back, and that is a product decision we make up front, not in the incident.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Transient error | A failure that may succeed if retried later (overload, brief rate limit, timeout) |
| Permanent (non-retryable) error | A failure that repeats on every retry (bad input, auth, spend cap) |
| Exponential backoff | Waits that grow after each failure, usually doubling, up to a cap |
| Thundering herd | Many clients retrying a recovering service at the same instant |
| Jitter | Randomness added to retry waits; full jitter picks uniformly from 0 to the cap |
| Retry-After | Response header saying how long to wait before retrying |
| RPM / TPM (ITPM, OTPM) | Requests and tokens per minute limits; tokens may be split into input and output |
| Token bucket | Limiter that refills continuously and admits a request only if the bucket can pay for it |
| Circuit breaker | Guard that stops calling a failing dependency (closed, open, half-open) |
| Fallback chain | Ordered alternatives: other region, sibling model, other provider |
| Degraded mode | The honest product behaviour when every tier fails |

**Conclusion:** A resilient LLM call is a small amount of disciplined code around the model: classify the error before reacting, retry only transient failures with jittered exponential backoff, obey \`retry-after\` when it fits the deadline and fall back when it does not, and keep one owner for retries so they do not multiply. Stay under your RPM and TPM limits with a client-side bucket or queue rather than bouncing off them, put a circuit breaker in front of each tier so an outage costs milliseconds instead of seconds, and order fallbacks by how similar their behaviour is, with every one of them in the eval suite. The runs above showed each piece doing its job on a fake clock: a 2 s \`retry-after\` honoured, a 30 s one skipped, a 400 failed fast, an outage absorbed by the breaker, and a retry spike flattened from 1000 to 146 by jitter.`,
    examples: [
      {
        label: `Retries, Retry-After, a circuit breaker and a fallback chain`,
        variants: [
          { tech: "node", code: `// A resilient LLM call: retry only transient errors, honour Retry-After,
// back off with full jitter, stop at a deadline, trip a circuit breaker,
// then fall back down a chain. The providers are stubs on a fake clock.
let now = 0; // fake clock in ms
let seed = 2026; // Park-Miller generator, identical in every language
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
const s = (ms) => (ms / 1000).toFixed(3) + "s";

class StubProvider {
  constructor(name) { this.name = name; this.queue = []; this.fallback = { ok: true }; }
  call() { now += 300; return this.queue.length ? this.queue.shift() : this.fallback; }
}

class Breaker {
  constructor(threshold, cooldownMs) { this.threshold = threshold; this.cooldown = cooldownMs; this.fails = 0; this.state = "closed"; this.openedAt = 0; }
  allow() {
    if (this.state === "open" && now - this.openedAt >= this.cooldown) this.state = "half-open";
    return this.state !== "open";
  }
  record(ok) {
    if (ok) { this.fails = 0; this.state = "closed"; return; }
    this.fails += 1;
    if (this.state === "half-open" || this.fails >= this.threshold) { this.state = "open"; this.openedAt = now; }
  }
}

const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504, 529]);
const MAX_ATTEMPTS = 3, BASE = 500, CAP = 8000, DEADLINE = 20000;

function callWithRetries(p, breaker, start, log) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (!breaker.allow()) { log.push(\`  t=\${s(now)} \${p.name} breaker open, skipped\`); return { ok: false, retryable: true }; }
    const probe = breaker.state === "half-open" ? " (half-open probe)" : "";
    const r = p.call();
    // a 4xx client error says nothing about provider health: do not count it
    if (r.ok || RETRYABLE.has(r.status)) breaker.record(!!r.ok);
    if (r.ok) { log.push(\`  t=\${s(now)} \${p.name} attempt \${attempt} -> 200\${probe}\`); return { ok: true }; }
    log.push(\`  t=\${s(now)} \${p.name} attempt \${attempt} -> \${r.status}\${breaker.state === "open" ? " (breaker opens)" : ""}\`);
    if (!RETRYABLE.has(r.status)) return { ok: false, retryable: false, status: r.status };
    if (attempt === MAX_ATTEMPTS || breaker.state === "open") break;
    let wait, why;
    if (r.retryAfter !== undefined) { wait = r.retryAfter * 1000; why = "retry-after header"; }
    else { wait = Math.floor(rand() * Math.min(CAP, BASE * 2 ** attempt)); why = \`full jitter, cap \${BASE * 2 ** attempt}ms\`; }
    if (now + wait - start > DEADLINE) { log.push(\`  t=\${s(now)} wait \${s(wait)} would pass the deadline, give up\`); break; }
    log.push(\`  t=\${s(now)} wait \${s(wait)} (\${why})\`);
    now += wait;
  }
  return { ok: false, retryable: true };
}

const chain = [new StubProvider("primary"), new StubProvider("region-b"), new StubProvider("small-model")];
const breakers = new Map(chain.map((p) => [p.name, new Breaker(5, 30000)]));

function resilientCall(title) {
  const start = now, log = [];
  console.log(\`== \${title} ==\`);
  let result = "all tiers failed: show the degraded mode";
  for (const p of chain) {
    const r = callWithRetries(p, breakers.get(p.name), start, log);
    if (r.ok) { result = \`ok from \${p.name}\`; break; }
    if (!r.retryable) { result = \`error \${r.status} returned to caller (a bad request fails on every tier)\`; break; }
  }
  for (const line of log) console.log(line);
  console.log(\`  result: \${result}, took \${s(now - start)}\`);
}

const [primary] = chain;
primary.queue = [{ status: 429, retryAfter: 2 }];
resilientCall("1) 429 with retry-after: 2");
primary.queue = [{ status: 503 }, { status: 503 }];
resilientCall("2) two 503s, then success");
primary.queue = [{ status: 400 }];
resilientCall("3) 400 invalid request");
primary.queue = [{ status: 429, retryAfter: 30 }];
resilientCall("4) retry-after: 30 is longer than the 20s budget");
primary.fallback = { status: 503 };
resilientCall("5) primary outage begins");
resilientCall("6) outage continues");
resilientCall("7) breaker is open");
now += 30000;
primary.fallback = { ok: true };
resilientCall("8) 30s later: half-open probe");
console.log(\`primary breaker: \${breakers.get("primary").state}\`);` },
          { tech: "python", code: `# A resilient LLM call: retry only transient errors, honour Retry-After,
# back off with full jitter, stop at a deadline, trip a circuit breaker,
# then fall back down a chain. The providers are stubs on a fake clock.
import math

now = 0  # fake clock in ms
seed = 2026  # Park-Miller generator, identical in every language


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


def s(ms):
    return f"{ms / 1000:.3f}s"


class StubProvider:
    def __init__(self, name):
        self.name, self.queue, self.fallback = name, [], {"ok": True}

    def call(self):
        global now
        now += 300
        return self.queue.pop(0) if self.queue else self.fallback


class Breaker:
    def __init__(self, threshold, cooldown_ms):
        self.threshold, self.cooldown = threshold, cooldown_ms
        self.fails, self.state, self.opened_at = 0, "closed", 0

    def allow(self):
        if self.state == "open" and now - self.opened_at >= self.cooldown:
            self.state = "half-open"
        return self.state != "open"

    def record(self, ok):
        if ok:
            self.fails, self.state = 0, "closed"
            return
        self.fails += 1
        if self.state == "half-open" or self.fails >= self.threshold:
            self.state, self.opened_at = "open", now


RETRYABLE = {408, 409, 429, 500, 502, 503, 504, 529}
MAX_ATTEMPTS, BASE, CAP, DEADLINE = 3, 500, 8000, 20000


def call_with_retries(p, breaker, start, log):
    global now
    for attempt in range(1, MAX_ATTEMPTS + 1):
        if not breaker.allow():
            log.append(f"  t={s(now)} {p.name} breaker open, skipped")
            return {"ok": False, "retryable": True}
        probe = " (half-open probe)" if breaker.state == "half-open" else ""
        r = p.call()
        # a 4xx client error says nothing about provider health: do not count it
        if r.get("ok") or r.get("status") in RETRYABLE:
            breaker.record(bool(r.get("ok")))
        if r.get("ok"):
            log.append(f"  t={s(now)} {p.name} attempt {attempt} -> 200{probe}")
            return {"ok": True}
        opens = " (breaker opens)" if breaker.state == "open" else ""
        log.append(f"  t={s(now)} {p.name} attempt {attempt} -> {r['status']}{opens}")
        if r["status"] not in RETRYABLE:
            return {"ok": False, "retryable": False, "status": r["status"]}
        if attempt == MAX_ATTEMPTS or breaker.state == "open":
            break
        if "retry_after" in r:
            wait, why = r["retry_after"] * 1000, "retry-after header"
        else:
            wait = math.floor(rand() * min(CAP, BASE * 2 ** attempt))
            why = f"full jitter, cap {BASE * 2 ** attempt}ms"
        if now + wait - start > DEADLINE:
            log.append(f"  t={s(now)} wait {s(wait)} would pass the deadline, give up")
            break
        log.append(f"  t={s(now)} wait {s(wait)} ({why})")
        now += wait
    return {"ok": False, "retryable": True}


chain = [StubProvider("primary"), StubProvider("region-b"), StubProvider("small-model")]
breakers = {p.name: Breaker(5, 30000) for p in chain}


def resilient_call(title):
    start, log = now, []
    print(f"== {title} ==")
    result = "all tiers failed: show the degraded mode"
    for p in chain:
        r = call_with_retries(p, breakers[p.name], start, log)
        if r["ok"]:
            result = f"ok from {p.name}"
            break
        if not r["retryable"]:
            result = f"error {r['status']} returned to caller (a bad request fails on every tier)"
            break
    for line in log:
        print(line)
    print(f"  result: {result}, took {s(now - start)}")


primary = chain[0]
primary.queue = [{"status": 429, "retry_after": 2}]
resilient_call("1) 429 with retry-after: 2")
primary.queue = [{"status": 503}, {"status": 503}]
resilient_call("2) two 503s, then success")
primary.queue = [{"status": 400}]
resilient_call("3) 400 invalid request")
primary.queue = [{"status": 429, "retry_after": 30}]
resilient_call("4) retry-after: 30 is longer than the 20s budget")
primary.fallback = {"status": 503}
resilient_call("5) primary outage begins")
resilient_call("6) outage continues")
resilient_call("7) breaker is open")
now += 30000
primary.fallback = {"ok": True}
resilient_call("8) 30s later: half-open probe")
print(f"primary breaker: {breakers['primary'].state}")` },
        ],
      },
      {
        label: `Why jitter matters, and a client-side token bucket`,
        variants: [
          { tech: "node", code: `// Part 1: 1000 clients fail at the same moment. How bunched are their retries?
// Part 2: a client-side token bucket keeps a burst under a tokens-per-minute limit.
let seed = 7; // Park-Miller generator, identical in every language
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }

const CLIENTS = 1000, BASE = 1000, BUCKET_MS = 100;
const strategies = {
  "no jitter": (cap) => cap,
  "equal jitter": (cap) => cap / 2 + Math.floor(rand() * (cap / 2)),
  "full jitter": (cap) => Math.floor(rand() * cap),
};
console.log("part 1: 1000 clients fail at t=0, retry twice (waits capped at 1s, then 2s)");
for (const [name, waitFor] of Object.entries(strategies)) {
  const hits = new Map(); // 100 ms window -> retries that land in it
  for (let c = 0; c < CLIENTS; c++) {
    let t = 0;
    for (let attempt = 1; attempt <= 2; attempt++) {
      t += waitFor(BASE * 2 ** (attempt - 1));
      const w = Math.floor(t / BUCKET_MS);
      hits.set(w, (hits.get(w) || 0) + 1);
    }
  }
  const peak = Math.max(...hits.values());
  console.log(\`  \${name.padEnd(13)} peak \${String(peak).padStart(4)} retries in one 100ms window, spread over \${hits.size} windows\`);
}

console.log("part 2: 30 requests of 3000 tokens arrive at once; limit 60000 tokens/minute");
const LIMIT = 60000, RATE = 1; // the bucket refills 1 token per ms (60000 per minute)
function makeBucket() { return { tokens: LIMIT, t: 0 }; }
function refill(b, now) { b.tokens = Math.min(LIMIT, b.tokens + (now - b.t) * RATE); b.t = now; }

// a) fire everything: the provider bucket answers 429 when it runs dry
const server = makeBucket();
let ok = 0, rejected = 0;
for (let i = 0; i < 30; i++) {
  refill(server, 0);
  if (server.tokens >= 3000) { server.tokens -= 3000; ok++; } else rejected++;
}
console.log(\`  a) no client limiter: \${ok} accepted, \${rejected} rejected with 429 (each one now retries)\`);

// b) mirror the bucket on the client and wait for tokens before sending
const local = makeBucket(), server2 = makeBucket();
let now = 0, rejected2 = 0;
const sendTimes = [];
for (let i = 0; i < 30; i++) {
  refill(local, now);
  if (local.tokens < 3000) { now += Math.ceil((3000 - local.tokens) / RATE); refill(local, now); }
  local.tokens -= 3000;
  refill(server2, now);
  if (server2.tokens >= 3000) server2.tokens -= 3000; else rejected2++;
  sendTimes.push(now);
}
console.log(\`  b) client token bucket: \${30 - rejected2} accepted, \${rejected2} rejected\`);
console.log(\`     first 20 sent at t=0s, then one every \${(sendTimes[21] - sendTimes[20]) / 1000}s, last at t=\${sendTimes[29] / 1000}s\`);` },
          { tech: "python", code: `# Part 1: 1000 clients fail at the same moment. How bunched are their retries?
# Part 2: a client-side token bucket keeps a burst under a tokens-per-minute limit.
import math

seed = 7  # Park-Miller generator, identical in every language


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


CLIENTS, BASE, BUCKET_MS = 1000, 1000, 100
strategies = {
    "no jitter": lambda cap: cap,
    "equal jitter": lambda cap: cap // 2 + math.floor(rand() * (cap // 2)),
    "full jitter": lambda cap: math.floor(rand() * cap),
}
print("part 1: 1000 clients fail at t=0, retry twice (waits capped at 1s, then 2s)")
for name, wait_for in strategies.items():
    hits = {}  # 100 ms window -> retries that land in it
    for c in range(CLIENTS):
        t = 0
        for attempt in range(1, 3):
            t += wait_for(BASE * 2 ** (attempt - 1))
            w = t // BUCKET_MS
            hits[w] = hits.get(w, 0) + 1
    peak = max(hits.values())
    print(f"  {name:<13} peak {peak:>4} retries in one 100ms window, spread over {len(hits)} windows")

print("part 2: 30 requests of 3000 tokens arrive at once; limit 60000 tokens/minute")
LIMIT, RATE = 60000, 1  # the bucket refills 1 token per ms (60000 per minute)


def make_bucket():
    return {"tokens": LIMIT, "t": 0}


def refill(b, now):
    b["tokens"] = min(LIMIT, b["tokens"] + (now - b["t"]) * RATE)
    b["t"] = now


# a) fire everything: the provider bucket answers 429 when it runs dry
server = make_bucket()
ok = rejected = 0
for i in range(30):
    refill(server, 0)
    if server["tokens"] >= 3000:
        server["tokens"] -= 3000
        ok += 1
    else:
        rejected += 1
print(f"  a) no client limiter: {ok} accepted, {rejected} rejected with 429 (each one now retries)")

# b) mirror the bucket on the client and wait for tokens before sending
local, server2 = make_bucket(), make_bucket()
now = rejected2 = 0
send_times = []
for i in range(30):
    refill(local, now)
    if local["tokens"] < 3000:
        now += math.ceil((3000 - local["tokens"]) / RATE)
        refill(local, now)
    local["tokens"] -= 3000
    refill(server2, now)
    if server2["tokens"] >= 3000:
        server2["tokens"] -= 3000
    else:
        rejected2 += 1
    send_times.append(now)
print(f"  b) client token bucket: {30 - rejected2} accepted, {rejected2} rejected")
gap = (send_times[21] - send_times[20]) / 1000
last = send_times[29] / 1000
print(f"     first 20 sent at t=0s, then one every {gap:g}s, last at t={last:g}s")` },
        ],
      },
    ],
  },
  {
    title: `What techniques reduce LLM latency at each stage of a request?`,
    difficulty: "hard",
    seoDescription: `Cut LLM latency per stage: measure TTFT and decode, stream, prompt-cache, parallelise tools, shorten output, use faster models, speculative decoding.`,
    description: `**Question presented to candidate:**
"Users say our AI assistant feels slow: about fifteen seconds before anything happens. It does intent routing, retrieval, a few tool calls and then generates an answer. How would you find where the time goes, and what would you change at each stage to make it faster?"

**What a strong answer should cover:**
- Decompose before optimising: network and gateway, pre-model work (routing, retrieval, tools), queueing, prefill (time to first token grows with uncached prompt length) and decode (output tokens times time per output token)
- Perceived versus total latency: streaming moves the first visible word to roughly TTFT without changing total time; measure both, at p95 and p99 rather than the mean
- Prefill levers: prompt caching of a stable prefix, shorter and better-ranked context, fewer sequential model calls
- Decode levers: fewer output tokens (concise formats, structured output, sensible \`max_tokens\`), a smaller or faster model where quality allows, speculative decoding or predicted outputs for mostly-known text
- Application levers: run independent tools and retrievals in parallel, replace LLM steps with cheap code or a small model (routing, classification), precompute or cache, place compute near users
- Trade-offs: every lever costs something (quality for smaller models, cache-hit discipline, complexity of parallelism), so each change is checked against an eval set, not only a stopwatch

**Clarifying questions expected:**
- Is the problem time to first visible output, total time, or both, and at what percentile?
- Which steps are sequential model calls, and which of them are required for every request?
- Are we calling a hosted API or running our own inference stack?

**Code / implementation expected:** Optional — a latency budget broken down by stage, or a trace showing where the time goes, is more valuable than code.`,
    answer: `**Target Audience:** Engineers whose LLM feature works but feels slow, and who want a method for finding and removing latency rather than a list of tricks.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (a latency-budget model and a speculative-decoding simulation). The per-stage numbers in the budget are **stated assumptions** used for the arithmetic, not measurements of any provider; vendor claims (prompt caching latency, predicted outputs, speculative decoding speedups) are quoted from their sources with dates, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You order a pizza for delivery and it takes an hour. Who do you blame? Maybe the phone line was busy. Maybe the kitchen had twenty orders ahead of yours. Maybe the oven is slow. Maybe the driver went to three other houses first. A manager who just says "make pizzas faster" will buy a faster oven and discover the hour was mostly the driver.

An LLM request is a delivery with many stops: the network, an intent classifier, a search, some tool calls, a wait in the provider queue, the model reading your prompt, and then the model writing its answer one word at a time. Each stop has its own fix, and the fixes do not transfer: a cache that removes reading time does nothing for writing time, and a faster model does nothing for a slow tool. The skill is to time each stop first, and then fix the biggest one.

There is a second twist. A customer who is told "your pizza is in the oven, here is a slice now" feels the wait differently from one who hears nothing for an hour. With LLMs, **streaming** is that first slice: the user starts reading long before the answer is finished.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the complaint time to first visible output, total time, or both? | Streaming fixes the first; only fewer or faster tokens fix the second. |
| At which percentile, and for which requests? | LLM latency has a long tail; the mean hides the requests users remember. |
| Which steps are sequential model calls? | Each extra serial call adds a full round trip, queue wait and prefill. |
| Hosted API or our own inference servers? | Self-hosting opens batching, quantization and speculative decoding knobs that an API hides. |
| What quality bar must hold? | Smaller models and shorter answers are the biggest levers and the biggest quality risks. |

## 3. Anatomy of One Request

📌 **Interview term: prefill** — the phase in which the model reads the whole prompt and builds its internal state (the KV cache) for it. All prompt tokens are processed in parallel, so it is fast per token, but its cost grows with prompt length.

📌 **Interview term: decode** — the phase in which the model writes the answer one token at a time; each new token needs another forward pass over the model. This is why output length usually dominates total time.

📌 **Interview term: TTFT (time to first token)** — from sending the request to receiving the first output token: network, queueing and prefill.

📌 **Interview term: TPOT / inter-token latency** — the average time between output tokens during decode, the inverse of output tokens per second. **Total latency ≈ TTFT + output tokens × TPOT.**

<svg class="iq-diagram" width="100%" viewBox="0 0 820 220" role="img" aria-label="Request timeline: network, routing, retrieval, tools, queue and prefill make up the time before the first token; decode makes up the rest and is usually the longest part">
  <rect class="d-box-muted" x="20" y="70" width="70" height="60" rx="6"/>
  <text class="d-sub" x="55" y="105" text-anchor="middle">net</text>
  <rect class="d-box" x="100" y="70" width="90" height="60" rx="6"/>
  <text class="d-sub" x="145" y="105" text-anchor="middle">route</text>
  <rect class="d-box" x="200" y="70" width="80" height="60" rx="6"/>
  <text class="d-sub" x="240" y="105" text-anchor="middle">RAG</text>
  <rect class="d-box" x="290" y="70" width="90" height="60" rx="6"/>
  <text class="d-sub" x="335" y="105" text-anchor="middle">tools</text>
  <rect class="d-box-muted" x="390" y="70" width="70" height="60" rx="6"/>
  <text class="d-sub" x="425" y="105" text-anchor="middle">queue</text>
  <rect class="d-box" x="470" y="70" width="80" height="60" rx="6"/>
  <text class="d-sub" x="510" y="105" text-anchor="middle">prefill</text>
  <rect class="d-box-accent" x="560" y="70" width="240" height="60" rx="6"/>
  <text class="d-sub" x="680" y="105" text-anchor="middle">decode, token by token</text>
  <path class="d-edge-dashed" d="M 555 40 L 555 160"/>
  <text class="d-text" x="555" y="28" text-anchor="middle">first token</text>
  <text class="d-sub" x="280" y="190" text-anchor="middle">time to first token</text>
  <text class="d-sub" x="680" y="190" text-anchor="middle">output tokens x time per token</text>
</svg>

Everything left of the dashed line decides when the user sees anything (if you stream); the accent box decides when the answer is finished.

## 4. Measure First: a Latency Budget

📌 **Interview term: latency budget** — a per-stage breakdown of where a request spends its time, used to pick the fix with the biggest payoff and to set per-stage targets.

The first example, **"Latency budget: where the milliseconds go and what each lever removes"**, models one RAG-plus-tools request. Every number is an assumption, chosen to be plausible, and written at the top of the program so you can replace it with your own trace data: a 900 ms intent-routing call on a big model, three independent tools taking 400, 250 and 300 ms, a 12,000-token prompt of which 10,000 tokens are a stable prefix, prefill at 20,000 tokens per second, and decode at 20 ms per token for a 600-token answer.

~~~text
where the time goes (baseline):
  network            80 ms
  intent router     900 ms
  retrieval         190 ms
  tools             950 ms
  queue             150 ms
  prefill           600 ms
  decode          12000 ms  (600 tokens x 20 ms)
~~~

Decode is 12 of the 14.9 seconds. That single fact decides the strategy: no amount of retrieval tuning will fix total time. But the 2.9 s before decode is all the user stares at once you stream, so it matters too.

## 5. The Levers, Stage by Stage

The program applies levers one after another, printing the first visible token time (with streaming) and the total time:

~~~text
lever (cumulative)              first visible   total
  baseline (no streaming)          14870 ms   14870 ms
  + stream the answer               2890 ms   14870 ms
  + prompt cache the prefix         2390 ms   14370 ms
  + run tools in parallel           1840 ms   13820 ms
  + small model routes              1190 ms   13170 ms
  + concise output format           1190 ms    6170 ms
  + faster model for answer         1178 ms    3170 ms
~~~

### Perceived latency: stream

📌 **Interview term: streaming** — sending tokens to the client as they are generated (usually over server-sent events) instead of after the last one. It changes nothing about total time and everything about how long the user waits to see progress: 14.9 s to 2.9 s here. How to wire it is covered in [How does streaming work in LLM APIs and why does it matter for UX?](/interview-question/how-does-streaming-work-in-llm-apis-and-why-does-it-matter-for-ux)

### Prefill: cache and shrink the prompt

📌 **Interview term: prompt caching** — the provider keeps the processed state of a prompt prefix it has seen recently, so a later request starting with the identical prefix skips that part of prefill. Anthropic announced it with a claim of "up to 85%" lower latency for long prompts, and gives an example of a 100,000-token book chat going from 11.5 s to 2.4 s with the content cached (Anthropic, prompt caching announcement). That is the vendor own benchmark; your gain depends on how long and how stable your prefix is. Details in [What is prompt caching and how does it reduce cost and latency?](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency)

The other prefill lever is simply fewer tokens: retrieve 5 well-ranked chunks instead of 30, trim conversation history, drop unused tool definitions. In this budget prefill is small, so the cache saved 500 ms; with a 100k-token prompt it would be the biggest single win.

### Pre-model work: parallelise and demote

- **Parallel tools.** Three independent tools in sequence cost 950 ms; run concurrently they cost the slowest one, 400 ms. Many models can request several tool calls in one turn; execute them with \`Promise.all\` or \`asyncio.gather\`, not a \`for\` loop.
- **Demote steps to a smaller model or to code.** An intent classifier rarely needs the frontier model: 900 ms to 250 ms here. Often a keyword rule or an embedding classifier needs no model call at all.
- **Remove serial model calls.** Every extra "plan, then answer" round trip adds network, queue and prefill. Merge steps where quality allows, or run them speculatively in parallel.

### Decode: fewer and faster tokens

- **Fewer output tokens** is the biggest total-time lever because decode is linear in tokens: 600 to 250 tokens cut 7 seconds here. Ask for a concise format, use structured output instead of prose where the consumer is code, and set \`max_tokens\` per endpoint. Reasoning models add hidden thinking tokens that are decoded too; see [What are reasoning models and when should you use them?](/interview-question/what-are-reasoning-models-and-when-should-you-use-them)
- **A faster model.** Smaller models emit tokens faster; moving from 20 ms to 8 ms per token took the total from 6.2 s to 3.2 s. It is a quality trade, decided with evals; see [How do you choose the right model for a task?](/interview-question/how-do-you-choose-the-right-model-for-a-task) Some providers also sell faster output modes for the same model (Anthropic documents a "fast mode" with its own rate limits, October 2026).
- **Speculative decoding** (next section) and **predicted outputs**: OpenAI documents a \`prediction\` parameter on Chat Completions that speeds up responses when much of the output is known in advance, such as editing code; prediction tokens that do not end up in the answer are still billed as output and reported as \`rejected_prediction_tokens\` (OpenAI Predicted Outputs guide).

### Infrastructure

Queue time is the provider deciding when your request gets a GPU. On a hosted API you influence it with region choice, priority or provisioned capacity offerings, and by not sending traffic in bursts. On your own servers it is batching policy and capacity, and [quantization](/interview-question/what-is-quantization-and-when-would-you-use-a-quantized-model) trades a little quality for faster decode on the same hardware.

## 6. Speculative Decoding, Simulated

📌 **Interview term: speculative decoding** — a small, fast **draft model** guesses the next k tokens; the big **target model** checks all k in one forward pass, keeps the longest prefix it agrees with and adds one token of its own. When the draft is usually right, the big model runs far fewer passes. Leviathan, Kalman and Matias (*Fast Inference from Transformers via Speculative Decoding*, ICML 2023) report 2X-3X acceleration on T5-XXL with identical outputs.

The second example, **"Speculative decoding: fewer big-model passes for the same tokens"**, implements the greedy version on a 26-token sentence. The "models" are lookups (the target always knows the right next word; the draft is wrong at fixed positions), and the costs of 30 ms per big pass and 3 ms per draft pass are assumptions:

~~~text
26 tokens to generate; assume 30 ms per big pass, 3 ms per draft pass
  plain decoding               big passes 26  draft passes  0  est.  780 ms  output identical
  draft wrong 1 in 8, k=4      big passes  7  draft passes 26  est.  288 ms  output identical
  draft wrong 1 in 8, k=8      big passes  4  draft passes 26  est.  198 ms  output identical
  draft wrong 1 in 3, k=4      big passes  9  draft passes 34  est.  372 ms  output identical
  draft always wrong, k=4      big passes 26  draft passes 98  est. 1074 ms  output identical
~~~

Three lessons are visible. The output is identical in every row, which is the defining property (for greedy decoding; the paper also gives a sampling version that preserves the output distribution). The speedup depends entirely on how often the draft agrees. And a bad draft makes things *slower*: the last row pays for 98 useless draft passes. On a hosted API you do not run this yourself; it is something the provider may do inside, or exposes in a form such as predicted outputs.

## 7. Verified: Running the Code

Both programs are plain arithmetic and simulation; they call no model and measure no real system. The budget stands in for a trace from your observability stack; the speculative decoder stands in for a real draft and target model pair and leaves out GPU batching, KV-cache memory and sampling.

**"Latency budget: where the milliseconds go and what each lever removes"** — \`node a.js\` and \`python3.12 a.py\` both print exactly:

~~~text
where the time goes (baseline):
  network            80 ms
  intent router     900 ms
  retrieval         190 ms
  tools             950 ms
  queue             150 ms
  prefill           600 ms
  decode          12000 ms  (600 tokens x 20 ms)

lever (cumulative)              first visible   total
  baseline (no streaming)          14870 ms   14870 ms
  + stream the answer               2890 ms   14870 ms
  + prompt cache the prefix         2390 ms   14370 ms
  + run tools in parallel           1840 ms   13820 ms
  + small model routes              1190 ms   13170 ms
  + concise output format           1190 ms    6170 ms
  + faster model for answer         1178 ms    3170 ms

20 requests: mean 3075 ms, p50 2050 ms, p95 9800 ms, max 14500 ms
~~~

**"Speculative decoding: fewer big-model passes for the same tokens"** — \`node b.js\` and \`python3.12 b.py\` both print exactly:

~~~text
26 tokens to generate; assume 30 ms per big pass, 3 ms per draft pass
  plain decoding               big passes 26  draft passes  0  est.  780 ms  output identical
  draft wrong 1 in 8, k=4      big passes  7  draft passes 26  est.  288 ms  output identical
  draft wrong 1 in 8, k=8      big passes  4  draft passes 26  est.  198 ms  output identical
  draft wrong 1 in 3, k=4      big passes  9  draft passes 34  est.  372 ms  output identical
  draft always wrong, k=4      big passes 26  draft passes 98  est. 1074 ms  output identical
~~~

What the runs show:

- Under these assumptions decode was 81% of total time, so output length and decode speed were the levers that moved total latency (14.9 s to 3.2 s), while streaming, caching, parallel tools and a smaller router moved first-visible time (14.9 s to 1.2 s).
- The mean of the 20-sample day (3,075 ms) sits far from both the typical request (p50 2,050 ms) and the bad ones (p95 9,800 ms); two slow requests out of twenty dragged the mean up by about 1 s.
- Speculative decoding cut big-model passes from 26 to 4 to 9 depending on draft quality, never changed the output, and made things worse with a useless draft.

## 8. Measuring It Properly

📌 **Interview term: tail latency (p95, p99)** — the latency below which 95% or 99% of requests finish. The slowest requests are the ones users remember, and LLM latency has a heavy tail (long answers, retries, cold caches, queueing spikes), so the mean is misleading.

- Trace every request with spans per stage (routing, retrieval, each tool, each model call) and record TTFT, output tokens and total time on each model span; see [What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application)
- Set separate targets for TTFT and total, per endpoint.
- Watch cache hit rates: a prompt-caching win silently disappears when someone edits the start of the system prompt.
- Re-run evals after every latency change; a 2-second win that drops answer quality is not a win.

## Edge Cases Worth Knowing

- **Streaming plus post-processing.** If you must validate or filter the full answer before showing it (JSON parsing, guardrails), streaming the raw tokens to the user is not possible as-is; stream into a buffer, or stream a safe subset.
- **Tool calls interrupt streaming.** An agent turn that ends in a tool call shows nothing until the tool returns and the next model call starts; show progress events for tool steps.
- **Cache misses at deploy time.** A new system prompt version starts cold; the first requests after a deploy are slower until the prefix is cached again.
- **Hedged requests.** Sending the same request to two tiers and taking the first answer cuts tail latency but doubles cost for those requests; use it only for a small, latency-critical slice.
- **Reasoning effort.** Hidden reasoning tokens count as decode time; a "thinking" budget can turn a 2 s answer into a 30 s one.

## Common Pitfalls

- **Optimising the wrong stage.** Tuning retrieval from 190 ms to 100 ms while 12 s of decode sits untouched. Build the budget first.
- **Reporting the mean.** A 3 s mean can hide a 10 s p95; set targets on percentiles.
- **Sequential awaits.** Independent tool calls and retrievals awaited one after another are the most common free win left on the table.
- **Unbounded output.** No \`max_tokens\`, no length guidance, and a model that writes 1,500 tokens where 200 would do.
- **Breaking the cache.** A timestamp or user name at the start of the system prompt makes every prefix unique and disables prompt caching.
- **Shipping a faster model without evals.** Latency improved, answers got worse, and nobody measured the second part.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Decompose first:</strong> <span style="color:#f0e2c8;">I split a request into stages: network, pre-model work like routing, retrieval and tools, queueing, <strong style="color:#ffca28;">prefill</strong> where the model reads the prompt, and <strong style="color:#ffca28;">decode</strong> where it writes one token per pass. Total is roughly TTFT plus output tokens times time per token, and I get those numbers from traces before changing anything.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Perceived latency:</strong> <span style="color:#f0e2c8;">Streaming moves the first visible word to about TTFT without changing total time. In my modelled request that took first output from 14.9 s to 2.9 s. Then I attack what sits before the first token: prompt caching for the stable prefix, a shorter, better-ranked context, and fewer serial model calls.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pre-model work:</strong> <span style="color:#f0e2c8;">Independent tools and retrievals run in parallel, so I pay for the slowest, not the sum: 950 ms became 400 ms. Side jobs like intent routing go to a small model or plain code. Every extra serial LLM call adds a round trip, a queue wait and a prefill, so I merge or remove them where quality allows.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Decode:</strong> <span style="color:#f0e2c8;">Decode is usually the biggest chunk, 12 of 14.9 s in my budget, and it is linear in output tokens. So: concise formats, structured output, a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code>, and a faster model where evals allow. For mostly-known output there is speculative decoding or a predicted-output feature, which verify several tokens per big-model pass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Measure properly:</strong> <span style="color:#f0e2c8;">I track TTFT and total separately at <strong style="color:#ffca28;">p95 and p99</strong>, because the mean hides the slow tail users remember. I watch cache hit rate, since one edit at the top of the prompt can kill it, and I rerun evals after every speed change, because a faster wrong answer is a regression.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is decode slow when prefill is fast per token?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefill processes all prompt tokens in parallel in a few big forward passes. Decode is sequential: token n+1 depends on token n, so each output token needs its own pass over the model weights. That is why output length dominates total time and why tokens per second is a separate metric from TTFT.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does streaming make the request faster?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Total time is the same and so is cost. It changes when the user sees progress, which is what they perceive as speed. It also has costs: you cannot validate the full answer before showing it, so JSON parsing or output guardrails need buffering or a safe partial view.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does speculative decoding keep the output identical?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The big model still decides every token. The draft only proposes; the big model scores all proposed positions in one pass and accepts the longest prefix that matches what it would have produced, plus one token of its own. In the sampling version an acceptance rule keeps the output distribution the same. A bad draft wastes work, so the gain depends on agreement rate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does prompt caching not help latency?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the prefix changes every request, for example a timestamp or user name near the top, when the prompt is short so prefill was cheap anyway, when traffic is too sparse to keep the cache warm, or when decode dominates. It only removes prefill time for the reused prefix.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you do for tail latency specifically?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find out what the slow requests have in common: long outputs, retries, cold caches, a slow tool, or queueing at peak. Then cap output, put timeouts and fallbacks on tools, keep caches warm, and for a small latency-critical slice consider hedging, which sends a second request after a delay and takes the first answer, at extra cost.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Prefill | The model reading the whole prompt; cost grows with uncached prompt length |
| Decode | The model writing output one token per forward pass |
| TTFT | Time to first token: network, queue and prefill |
| TPOT / inter-token latency | Average time between output tokens |
| Latency budget | Per-stage breakdown of where a request spends its time |
| Streaming | Sending tokens to the client as they are generated |
| Prompt caching | Reusing the processed state of an identical prompt prefix |
| Speculative decoding | A draft model guesses tokens; the big model verifies several in one pass |
| Tail latency (p95, p99) | Latency that 95% or 99% of requests stay under |

**Conclusion:** LLM latency is a sum of stages, and each stage has its own lever. Measure first: total time is roughly TTFT plus output tokens times time per token, and in the modelled request decode was 12 of 14.9 seconds. Streaming fixes perceived latency without touching total; prompt caching and a shorter prompt shrink prefill; parallel tools and smaller models for side jobs shrink the pre-model work; fewer output tokens, faster models and speculative or predicted decoding shrink decode. Track TTFT and total separately at p95, keep the cache prefix stable, and check every speed-up against an eval set, because the fastest answer is worthless if it is the wrong one.`,
    examples: [
      {
        label: `Latency budget: where the milliseconds go and what each lever removes`,
        variants: [
          { tech: "node", code: `// A latency budget for one RAG + tools request, and what each lever removes.
// Every rate below is an ASSUMPTION for the arithmetic, not a measurement.
const A = {
  network: 80, // client <-> API round trip
  routerCall: 900, // a big model used to classify intent
  smallRouter: 250, // the same job on a small model
  embed: 40, search: 30, rerank: 120,
  tools: [400, 250, 300], // three independent tool calls
  queue: 150, // waiting for a GPU slot at the provider
  prefillTokPerSec: 20000, // prompt processing speed
  promptTokens: 12000, cachedTokens: 10000, // stable prefix: system + tools + docs
  msPerOutputToken: 20, // decode speed (50 tokens/s)
  fastMsPerOutputToken: 8, // a smaller model (125 tokens/s)
  outputTokens: 600, conciseTokens: 250,
};

function run(cfg) {
  const stages = [];
  stages.push(["network", A.network]);
  stages.push(["intent router", cfg.smallRouter ? A.smallRouter : A.routerCall]);
  stages.push(["retrieval", A.embed + A.search + A.rerank]);
  const tools = cfg.parallelTools ? Math.max(...A.tools) : A.tools.reduce((a, b) => a + b, 0);
  stages.push(["tools", tools]);
  stages.push(["queue", A.queue]);
  const uncached = cfg.promptCache ? A.promptTokens - A.cachedTokens : A.promptTokens;
  stages.push(["prefill", Math.round((uncached / A.prefillTokPerSec) * 1000)]);
  const per = cfg.fastModel ? A.fastMsPerOutputToken : A.msPerOutputToken;
  const out = cfg.concise ? A.conciseTokens : A.outputTokens;
  const beforeDecode = stages.reduce((a, [, ms]) => a + ms, 0);
  const total = beforeDecode + out * per;
  // without streaming the user sees nothing until the last token
  const firstVisible = cfg.stream ? beforeDecode + per : total;
  return { stages, total, firstVisible, decode: out * per };
}

const levers = [
  ["baseline (no streaming)", {}],
  ["+ stream the answer", { stream: true }],
  ["+ prompt cache the prefix", { promptCache: true }],
  ["+ run tools in parallel", { parallelTools: true }],
  ["+ small model routes", { smallRouter: true }],
  ["+ concise output format", { concise: true }],
  ["+ faster model for answer", { fastModel: true }],
];
const base = run({});
console.log("where the time goes (baseline):");
for (const [name, ms] of base.stages) console.log(\`  \${name.padEnd(14)} \${String(ms).padStart(6)} ms\`);
console.log(\`  \${"decode".padEnd(14)} \${String(base.decode).padStart(6)} ms  (\${A.outputTokens} tokens x \${A.msPerOutputToken} ms)\`);
console.log("");
console.log("lever (cumulative)              first visible   total");
let cfg = {};
for (const [name, add] of levers) {
  cfg = { ...cfg, ...add };
  const r = run(cfg);
  console.log(\`  \${name.padEnd(30)} \${String(r.firstVisible).padStart(7)} ms  \${String(r.total).padStart(6)} ms\`);
}

// why you track p95, not the mean: 20 total latencies (ms) from a fake day
const sample = [1900, 2100, 2000, 2300, 1800, 2200, 2050, 1950, 2400, 2150,
  2250, 1850, 2000, 2100, 9800, 2050, 2200, 1900, 14500, 2000];
const sorted = [...sample].sort((a, b) => a - b);
const pct = (p) => sorted[Math.ceil((p / 100) * sorted.length) - 1]; // nearest-rank
const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
console.log("");
console.log(\`20 requests: mean \${mean.toFixed(0)} ms, p50 \${pct(50)} ms, p95 \${pct(95)} ms, max \${sorted[sorted.length - 1]} ms\`);` },
          { tech: "python", code: `# A latency budget for one RAG + tools request, and what each lever removes.
# Every rate below is an ASSUMPTION for the arithmetic, not a measurement.
import math

A = {
    "network": 80,  # client <-> API round trip
    "router_call": 900,  # a big model used to classify intent
    "small_router": 250,  # the same job on a small model
    "embed": 40, "search": 30, "rerank": 120,
    "tools": [400, 250, 300],  # three independent tool calls
    "queue": 150,  # waiting for a GPU slot at the provider
    "prefill_tok_per_sec": 20000,  # prompt processing speed
    "prompt_tokens": 12000, "cached_tokens": 10000,  # stable prefix: system + tools + docs
    "ms_per_output_token": 20,  # decode speed (50 tokens/s)
    "fast_ms_per_output_token": 8,  # a smaller model (125 tokens/s)
    "output_tokens": 600, "concise_tokens": 250,
}


def run(cfg):
    stages = [("network", A["network"])]
    stages.append(("intent router", A["small_router"] if cfg.get("small_router") else A["router_call"]))
    stages.append(("retrieval", A["embed"] + A["search"] + A["rerank"]))
    tools = max(A["tools"]) if cfg.get("parallel_tools") else sum(A["tools"])
    stages.append(("tools", tools))
    stages.append(("queue", A["queue"]))
    uncached = A["prompt_tokens"] - A["cached_tokens"] if cfg.get("prompt_cache") else A["prompt_tokens"]
    stages.append(("prefill", round(uncached / A["prefill_tok_per_sec"] * 1000)))
    per = A["fast_ms_per_output_token"] if cfg.get("fast_model") else A["ms_per_output_token"]
    out = A["concise_tokens"] if cfg.get("concise") else A["output_tokens"]
    before_decode = sum(ms for _, ms in stages)
    total = before_decode + out * per
    # without streaming the user sees nothing until the last token
    first_visible = before_decode + per if cfg.get("stream") else total
    return {"stages": stages, "total": total, "first_visible": first_visible, "decode": out * per}


levers = [
    ("baseline (no streaming)", {}),
    ("+ stream the answer", {"stream": True}),
    ("+ prompt cache the prefix", {"prompt_cache": True}),
    ("+ run tools in parallel", {"parallel_tools": True}),
    ("+ small model routes", {"small_router": True}),
    ("+ concise output format", {"concise": True}),
    ("+ faster model for answer", {"fast_model": True}),
]
base = run({})
print("where the time goes (baseline):")
for name, ms in base["stages"]:
    print(f"  {name:<14} {ms:>6} ms")
print(f"  {'decode':<14} {base['decode']:>6} ms  ({A['output_tokens']} tokens x {A['ms_per_output_token']} ms)")
print("")
print("lever (cumulative)              first visible   total")
cfg = {}
for name, add in levers:
    cfg = {**cfg, **add}
    r = run(cfg)
    print(f"  {name:<30} {r['first_visible']:>7} ms  {r['total']:>6} ms")

# why you track p95, not the mean: 20 total latencies (ms) from a fake day
sample = [1900, 2100, 2000, 2300, 1800, 2200, 2050, 1950, 2400, 2150,
          2250, 1850, 2000, 2100, 9800, 2050, 2200, 1900, 14500, 2000]
srt = sorted(sample)


def pct(p):
    return srt[math.ceil(p / 100 * len(srt)) - 1]  # nearest-rank


mean = sum(sample) / len(sample)
print("")
print(f"20 requests: mean {mean:.0f} ms, p50 {pct(50)} ms, p95 {pct(95)} ms, max {srt[-1]} ms")` },
        ],
      },
      {
        label: `Speculative decoding: fewer big-model passes for the same tokens`,
        variants: [
          { tech: "node", code: `// Speculative decoding (greedy version): a small draft model guesses k tokens,
// the big model checks all k in ONE forward pass, keeps the agreeing prefix
// and adds its own next token. The output is exactly what the big model alone
// would have written; only the number of big-model passes changes.
const target = ("the refund window is thirty days from delivery and store credit is offered " +
  "after that window closes so customers should contact support with the order number").split(" ");

// the big model: greedy next token for a given prefix
const bigModel = (prefix) => target[prefix.length];
// a draft model that agrees with the big one except at some positions
function makeDraft(wrongEvery) {
  return (prefix) => {
    const i = prefix.length;
    return i % wrongEvery === wrongEvery - 1 ? "uh" : target[i];
  };
}

function plainDecode() {
  const out = [];
  let bigPasses = 0;
  while (out.length < target.length) { out.push(bigModel(out)); bigPasses++; }
  return { out, bigPasses, draftPasses: 0 };
}

function speculative(draft, k) {
  const out = [];
  let bigPasses = 0, draftPasses = 0;
  while (out.length < target.length) {
    const guess = [];
    for (let j = 0; j < k && out.length + guess.length < target.length; j++) {
      guess.push(draft([...out, ...guess])); draftPasses++;
    }
    bigPasses++; // one pass scores every guessed position at once
    let accepted = 0;
    while (accepted < guess.length && guess[accepted] === bigModel([...out, ...guess.slice(0, accepted)])) accepted++;
    out.push(...guess.slice(0, accepted));
    if (out.length < target.length) out.push(bigModel(out)); // the big model's own token, free from the same pass
  }
  return { out, bigPasses, draftPasses };
}

const BIG_MS = 30, DRAFT_MS = 3; // assumed cost of one forward pass
const report = (name, r) => {
  const ms = r.bigPasses * BIG_MS + r.draftPasses * DRAFT_MS;
  const same = r.out.join(" ") === target.join(" ") ? "identical" : "DIFFERENT";
  console.log(\`  \${name.padEnd(28)} big passes \${String(r.bigPasses).padStart(2)}  draft passes \${String(r.draftPasses).padStart(2)}  est. \${String(ms).padStart(4)} ms  output \${same}\`);
};
console.log(\`\${target.length} tokens to generate; assume \${BIG_MS} ms per big pass, \${DRAFT_MS} ms per draft pass\`);
report("plain decoding", plainDecode());
report("draft wrong 1 in 8, k=4", speculative(makeDraft(8), 4));
report("draft wrong 1 in 8, k=8", speculative(makeDraft(8), 8));
report("draft wrong 1 in 3, k=4", speculative(makeDraft(3), 4));
report("draft always wrong, k=4", speculative(makeDraft(1), 4));` },
          { tech: "python", code: `# Speculative decoding (greedy version): a small draft model guesses k tokens,
# the big model checks all k in ONE forward pass, keeps the agreeing prefix
# and adds its own next token. The output is exactly what the big model alone
# would have written; only the number of big-model passes changes.
target = ("the refund window is thirty days from delivery and store credit is offered "
          "after that window closes so customers should contact support with the order number").split(" ")


def big_model(prefix):  # the big model: greedy next token for a given prefix
    return target[len(prefix)]


def make_draft(wrong_every):  # agrees with the big model except at some positions
    def draft(prefix):
        i = len(prefix)
        return "uh" if i % wrong_every == wrong_every - 1 else target[i]
    return draft


def plain_decode():
    out, big_passes = [], 0
    while len(out) < len(target):
        out.append(big_model(out))
        big_passes += 1
    return {"out": out, "big": big_passes, "draft": 0}


def speculative(draft, k):
    out, big_passes, draft_passes = [], 0, 0
    while len(out) < len(target):
        guess = []
        while len(guess) < k and len(out) + len(guess) < len(target):
            guess.append(draft(out + guess))
            draft_passes += 1
        big_passes += 1  # one pass scores every guessed position at once
        accepted = 0
        while accepted < len(guess) and guess[accepted] == big_model(out + guess[:accepted]):
            accepted += 1
        out.extend(guess[:accepted])
        if len(out) < len(target):
            out.append(big_model(out))  # the big model's own token, free from the same pass
    return {"out": out, "big": big_passes, "draft": draft_passes}


BIG_MS, DRAFT_MS = 30, 3  # assumed cost of one forward pass


def report(name, r):
    ms = r["big"] * BIG_MS + r["draft"] * DRAFT_MS
    same = "identical" if " ".join(r["out"]) == " ".join(target) else "DIFFERENT"
    print(f"  {name:<28} big passes {r['big']:>2}  draft passes {r['draft']:>2}  est. {ms:>4} ms  output {same}")


print(f"{len(target)} tokens to generate; assume {BIG_MS} ms per big pass, {DRAFT_MS} ms per draft pass")
report("plain decoding", plain_decode())
report("draft wrong 1 in 8, k=4", speculative(make_draft(8), 4))
report("draft wrong 1 in 8, k=8", speculative(make_draft(8), 8))
report("draft wrong 1 in 3, k=4", speculative(make_draft(3), 4))
report("draft always wrong, k=4", speculative(make_draft(1), 4))` },
        ],
      },
    ],
  },
  {
    title: `How do you estimate and control LLM costs in production?`,
    difficulty: "medium",
    seoDescription: `Estimate LLM cost from token profiles and traffic, avoid the agent re-send trap, then cut it with routing, prompt caching, batching and metering.`,
    description: `**Question presented to candidate:**
"We are about to launch three LLM features: a support chat, ticket tagging, and an agent that resolves simple tickets on its own. Finance wants a monthly cost estimate before launch, and a plan for bringing it down if it is too high. How do you estimate it, and which levers would you pull?"

**What a strong answer should cover:**
- The cost equation per call: input tokens times input price plus output tokens times output price (output is usually priced several times higher), with cache reads, cache writes and batch discounts as multipliers; summed over calls per feature per day
- Estimating from token profiles, not from the demo: system prompt and tools, retrieved context, history, expected output, requests per day, and the agent trap where each step re-sends the growing transcript so input grows roughly quadratically with steps
- Levers, ranked by impact for the workload: model routing (small model for easy tasks), prompt caching of stable prefixes, batch APIs for anything without a waiting user, trimming context and history, capping and shortening output
- Metering: log usage from every response with feature, tenant, model and purpose (answer, retry, repair) so cost is attributed, and report cost per outcome (per resolved ticket), not just per token
- Prices and discounts change by model and vendor: read them from the current pricing page and keep them in config, never hard-coded

**Clarifying questions expected:**
- Expected traffic per feature, and how long are prompts and answers in realistic samples?
- Which work is interactive and which could run asynchronously?
- What quality bar must each feature hold if we move it to a cheaper model?

**Code / implementation expected:** Optional — a back-of-envelope estimate with stated assumptions is expected; a small cost calculator or metering sketch is a plus.`,
    answer: `**Target Audience:** Engineers asked "what will this cost per month?" before an LLM launch, and anyone whose first invoice was a surprise.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (a cost estimator and a metering ledger). All prices in the examples are a **hypothetical price card** with round numbers so the arithmetic is easy to follow; they are not any vendor's current prices. Discount mechanics (cache read and write multipliers, batch discounts) are quoted from the Anthropic and OpenAI docs, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A taxi meter does not charge for the trip you planned; it charges for the trip you took. If the driver goes the long way round, waits in traffic, or you ask to stop twice, the meter keeps going.

LLM APIs are metered taxis. You are not billed per question; you are billed per **token** read and per token written, on every call, including the calls you did not know you were making: the retry after a timeout, the second attempt to fix broken JSON, the agent re-reading its whole conversation at every step. Teams estimate the trip from a demo ("one question, one answer, a fraction of a cent") and then get the bill for the route production actually took.

Estimating cost well means writing down the real route, call by call, with honest token counts. Controlling it means finding which parts of that route you can shorten, take in a cheaper car, or not take at all.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Requests per day per feature, and the growth expected? | Cost is linear in traffic; the estimate is per feature times volume. |
| Realistic prompt and answer lengths, from real samples? | Demo prompts are short; production prompts carry system text, tools, retrieved chunks and history. |
| Which work is interactive and which can wait? | Anything without a waiting user can use a batch API at a discount. |
| How many model calls does one user action trigger? | Agents and pipelines make several calls per action, each billed. |
| What quality must each feature keep? | Decides whether a cheaper model is an option at all. |

## 3. The Cost Equation

📌 **Interview term: token** — the unit models read and write, a word piece of a few characters. Prices are quoted per million tokens, separately for input and output. More in [What are tokens and why do they matter for cost and limits?](/interview-question/what-are-tokens-and-why-do-they-matter-for-cost-and-limits)

For one call:

~~~text
cost = (uncached input x input price
        + cache writes x input price x write multiplier
        + cache reads  x input price x read multiplier
        + output x output price) / 1,000,000
       x batch multiplier (if sent through a batch API)
~~~

and the monthly bill is that, summed over every call of every feature. Three facts make the equation interesting:

- **Output costs more than input.** On the Anthropic and OpenAI price lists (checked October 2026) output tokens cost several times more than input tokens for the same model; the hypothetical card here uses 5x. A chatty answer can cost as much as a long prompt.
- **Cache multipliers.** Anthropic documents a 5-minute cache write at 1.25x the base input price, a 1-hour write at 2x, and cache hits at 0.1x for most models, with some newer models priced lower still (Claude prompt caching and pricing docs, October 2026). OpenAI caches long prefixes automatically and reports \`cached_tokens\` in the usage object, with the discount set per model on its pricing page.
- **Batch discount.** Both Anthropic (Message Batches) and OpenAI (Batch API) document a 50% discount on input and output for asynchronous jobs, and Anthropic documents that caching and batch discounts stack.

📌 **Interview term: blended cost per request** — the average cost of one request of a feature once its real mix of prompt sizes, cache hits, models and output lengths is applied. It is the number you multiply by traffic.

## 4. A Worked Estimate

The first example, **"Monthly cost estimate and the levers that change it"**, estimates four features from written-down assumptions (30 days, the hypothetical card of $3 / $15 per million tokens for the large model and $0.80 / $4 for the small one):

| Feature | Requests per day | Stable prefix | Variable input | Output |
| :--- | ---: | ---: | ---: | ---: |
| Support chat | 40,000 | 2,500 | 3,500 | 350 |
| Ticket tagging | 100,000 | 600 | 200 | 10 |
| Nightly summaries | 5,000 | 500 | 7,500 | 500 |
| Agent (10 steps per task) | 2,000 tasks | 4,000 | +1,700 per step | 200 per step |

Checking one line by hand: a chat call is 6,000 input tokens × $3 + 350 output tokens × $15, per million, which is $0.018 + $0.00525 = $0.02325. Times 40,000 a day times 30 days is $27,900 a month. Note that output is only 6% of the tokens but 23% of the cost.

~~~text
baseline monthly bill by feature:
  chat       $  27900
  tagging    $   7650
  summaries  $   4725
  agent      $  22770
  total      $  63045
~~~

### The agent trap

The agent serves 20 times fewer tasks than tagging serves requests, yet costs three times as much. The reason is that an agent re-sends its whole transcript at every step: system prompt and tools, then every previous tool result and model turn.

📌 **Interview term: context re-send (quadratic agent cost)** — in a multi-step agent each call includes all previous steps, so input per step grows linearly and total input over a task grows roughly with the square of the number of steps.

~~~text
agent task, input tokens per step (the transcript is re-sent):
  4000 5700 7400 9100 10800 12500 14200 15900 17600 19300
  total 116500 tokens vs naive 10 x 4000 = 40000 (2.91x)
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Bar chart of agent input tokens per step growing from 4000 at step 1 to 19300 at step 10">
  <path class="d-edge" d="M 60 210 L 660 210"/>
  <rect class="d-box" x="80" y="179" width="34" height="31"/>
  <rect class="d-box" x="137" y="166" width="34" height="44"/>
  <rect class="d-box" x="194" y="152" width="34" height="58"/>
  <rect class="d-box" x="251" y="139" width="34" height="71"/>
  <rect class="d-box" x="308" y="126" width="34" height="84"/>
  <rect class="d-box" x="365" y="113" width="34" height="97"/>
  <rect class="d-box" x="422" y="100" width="34" height="110"/>
  <rect class="d-box" x="479" y="86" width="34" height="124"/>
  <rect class="d-box" x="536" y="73" width="34" height="137"/>
  <rect class="d-box-accent" x="593" y="60" width="34" height="150"/>
  <text class="d-sub" x="97" y="168" text-anchor="middle">4000</text>
  <text class="d-sub" x="610" y="48" text-anchor="middle">19300</text>
  <text class="d-sub" x="97" y="234" text-anchor="middle">step 1</text>
  <text class="d-sub" x="610" y="234" text-anchor="middle">step 10</text>
</svg>

Every bar is one model call of the same task. The tenth call reads almost five times as much as the first, and you pay for all ten.

This is also the multi-call lesson in general: for each user action, list every model call it triggers (router, retrieval rewriting, the answer, a judge, a JSON repair, retries) and price each one.

## 5. The Levers, Measured

The program then applies levers one after another and reports the saving each one adds:

~~~text
levers applied one after another:        monthly   saved
  route tagging to the small model         $  57435   8.9%
  prompt-cache stable prefixes             $  32376  43.6%
  batch API for nightly summaries          $  30112   7.0%
  concise chat answers (350 -> 250)        $  28312   6.0%
  compact agent tool results (1500 -> 400) $  25372  10.4%
  overall: 59.8% lower than baseline
~~~

📌 **Interview term: model routing** — sending each request to the cheapest model that handles it well: a small model for classification, extraction and easy questions, the large model only where it earns its price. Choosing models is covered in [How do you choose the right model for a task?](/interview-question/how-do-you-choose-the-right-model-for-a-task)

📌 **Interview term: prompt caching** — the provider stores the processed form of a prompt prefix so repeated prefixes are billed at a fraction of the input price. Here it was the largest lever (43.6%), mainly because it also caches the agent growing transcript: each step reads the previous steps from cache at 0.1x and only writes its newest turn. How to structure prompts for it is in [Prompt caching in 2025: how do you cut cost with Anthropic and OpenAI caches?](/interview-question/prompt-caching-in-2025-how-do-you-cut-cost-with-anthropic-openai-caches)

📌 **Interview term: batch API** — an asynchronous endpoint that accepts a file of requests and returns results within a window (OpenAI documents 24 hours) at a discount. It fits nightly summaries, evals and back-fills; see [When should you use batch APIs instead of real-time LLM calls?](/interview-question/when-should-you-use-batch-apis-instead-of-real-time-llm-calls)

Two things to notice in the table. The ranking is a property of *this* workload: on a different traffic mix, routing could easily be the largest lever (it saved 8.9% here only because tagging used short prompts). And levers interact: after caching, input is cheap, so output trimming and agent compaction carry more weight than they would have alone. Always re-run the whole estimate rather than adding up percentages.

Other levers the example does not model: [semantic caching](/interview-question/what-is-semantic-caching-and-when-is-it-safe-to-use) of whole answers for repeated questions, better retrieval so fewer chunks are sent, summarising long conversation history, and smaller embedding dimensions for the retrieval side.

## 6. Metering: Know Where the Money Goes

An estimate is a forecast; metering is the measurement. Every API response carries a usage object with input, output and cached token counts. Log it with your own tags.

📌 **Interview term: cost attribution** — tagging every model call with feature, tenant, model and purpose so spend can be summed by any of them, instead of reading one total off the invoice.

📌 **Interview term: cost per outcome** — total spend for a business result divided by the number of results: cost per resolved ticket, per generated report. It is the number a product owner can compare with the value of the outcome.

The second example, **"Metering: attribute spend to features, tenants and outcomes"**, prices eleven usage records and groups them:

~~~text
calls that were repairs or retries: $0.0435 (26.0% of spend)
tickets: 5, resolved: 3
  cost per ticket touched $0.0332, cost per resolved ticket $0.0554
~~~

A quarter of this spend went to repair and retry calls, which never show up in an estimate that counts "one call per request". And cost per *resolved* ticket is 67% higher than cost per ticket touched, because unresolved tickets still cost money. That ratio is what tells you whether a cheaper model that resolves fewer tickets actually saves anything.

In production the ledger is your tracing or logging pipeline (OpenTelemetry has generative-AI semantic conventions for token usage attributes); see [What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application) Keeping spend inside a budget once you can see it, with caps, alerts and forecasts, is the topic of [Cost optimization for LLM apps: how do you keep the bill predictable?](/interview-question/cost-optimization-for-llm-apps-how-do-you-keep-the-bill-predictable)

## 7. Verified: Running the Code

Both programs are pure arithmetic over stated assumptions; they call no API. The price card is invented for round numbers, and the 98% cache-hit rate is an assumption you would replace with your measured hit rate.

**"Monthly cost estimate and the levers that change it"** — \`node a.js\` and \`python3.12 a.py\` both print exactly:

~~~text
agent task, input tokens per step (the transcript is re-sent):
  4000 5700 7400 9100 10800 12500 14200 15900 17600 19300
  total 116500 tokens vs naive 10 x 4000 = 40000 (2.91x)

baseline monthly bill by feature:
  chat       $  27900
  tagging    $   7650
  summaries  $   4725
  agent      $  22770
  total      $  63045

levers applied one after another:        monthly   saved
  route tagging to the small model         $  57435   8.9%
  prompt-cache stable prefixes             $  32376  43.6%
  batch API for nightly summaries          $  30112   7.0%
  concise chat answers (350 -> 250)        $  28312   6.0%
  compact agent tool results (1500 -> 400) $  25372  10.4%
  overall: 59.8% lower than baseline
~~~

**"Metering: attribute spend to features, tenants and outcomes"** — \`node b.js\` and \`python3.12 b.py\` both print exactly:

~~~text
11 calls, total $0.1674
by feature:
  support  $0.1295   77.3%
  agent    $0.0368   22.0%
  tagging  $0.0012    0.7%
by tenant:
  globex   $0.0720   43.0%
  initech  $0.0581   34.7%
  acme     $0.0373   22.3%
calls that were repairs or retries: $0.0435 (26.0% of spend)
tickets: 5, resolved: 3
  cost per ticket touched $0.0332, cost per resolved ticket $0.0554
share of input tokens read from cache: 58.1%
~~~

What the runs show:

- A 10-step agent reads 2.91 times the tokens a naive "10 × the first call" estimate predicts.
- Under these assumptions, prompt caching was the largest single lever and the five levers together cut the bill by 59.8%.
- Repair and retry calls were 26% of the metered spend, and cost per resolved ticket was 67% above cost per ticket touched.

## 8. Estimation Gotchas

| Surprise | Cause | Fix |
| :--- | :--- | :--- |
| Agent feature costs several times the estimate | Transcript re-sent every step | Price every step; cache the transcript; compact tool results; cap steps |
| Output-heavy endpoints cost more than expected | Output priced several times input | Concise formats, structured output, \`max_tokens\` |
| Token count higher than character count suggests | JSON, code, non-English text tokenise into more tokens | Count with the provider tokenizer on real samples |
| Bill higher than traffic times blended cost | Retries, repairs, judges, background jobs | Meter every call with a purpose tag |
| Cache savings smaller than planned | Prefix not byte-identical, traffic too sparse, TTL expiry | Track cached-token share per feature |
| Costs jump after a model upgrade | New price, different tokenizer, longer answers | Re-run the estimate and evals before switching |

## Common Pitfalls

- **Estimating from the demo prompt.** Production prompts carry system text, tool schemas, retrieved chunks and history; sample real requests.
- **Pricing one call per user action.** Count the router, the answer, the judge, the repair and the retries.
- **Ignoring output pricing.** A 6% share of tokens was a 23% share of cost in the worked chat example.
- **Hard-coding prices.** Prices and discounts change by model and date; load them from config and re-check the pricing page.
- **Optimising cost per token instead of cost per outcome.** A cheaper model that resolves fewer tickets can cost more per resolved ticket.
- **Adding up lever percentages.** Levers interact; re-run the full estimate after each change.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The equation:</strong> <span style="color:#f0e2c8;">Per call, cost is input tokens times input price plus output tokens times output price, with multipliers for cache writes, cache reads and batch. Output is priced several times higher than input, so a chatty answer can cost as much as a long prompt. The monthly bill is that summed over every call of every feature.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Estimate from the real route:</strong> <span style="color:#f0e2c8;">For each feature I list every call one user action triggers, then the tokens of each: stable prefix, variable context, output, from real samples, times traffic. A support chat at 6,000 in and 350 out on a $3 and $15 card is about 2.3 cents a call, $27,900 a month at 40,000 calls a day.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The agent trap:</strong> <span style="color:#f0e2c8;">Agents re-send the whole transcript each step, so input grows with the square of the steps. My 10-step agent read 116,500 tokens per task, 2.91 times a naive estimate, and with few tasks it was still more than a third of the bill.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Levers, measured not assumed:</strong> <span style="color:#f0e2c8;">Then I rank levers on our workload: <strong style="color:#ffca28;">model routing</strong> for easy tasks, <strong style="color:#ffca28;">prompt caching</strong> of stable prefixes and agent transcripts, <strong style="color:#ffca28;">batch APIs</strong> for anything without a waiting user, trimmed context, concise output. In my estimate caching alone saved 43.6% and all five together 59.8%, and I rerun the whole estimate after each change because levers interact.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Meter by outcome:</strong> <span style="color:#f0e2c8;">Every response has a usage object; I log it tagged with feature, tenant, model and purpose, such as answer, retry or JSON repair. That shows hidden spend, a quarter of it repairs and retries in my sample, and gives <strong style="color:#ffca28;">cost per resolved ticket</strong>, which is the number to compare when someone proposes a cheaper model.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does agent cost grow quadratically?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because each step is a new call that includes the system prompt, tools and every previous step. Step i reads roughly prefix plus i times the per-step growth, so summing over n steps gives a term in n squared. Caching the transcript prefix, compacting tool results and capping steps are the fixes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which lever do you pull first?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Whichever the estimate says is biggest for this workload. With long stable prefixes or agents it is usually prompt caching; with high-volume simple tasks on a big model it is routing; with async work it is batch. I check quality with evals before routing anything to a smaller model, because that lever can cost outcomes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle price changes and new models?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prices live in config keyed by model, not in code, and the estimator is rerun when a price or model changes. A model upgrade can change the price, the tokenizer and the answer length at once, so I compare cost per outcome on the eval set before switching.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How accurate can a pre-launch estimate be?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Within a factor that depends on how real the samples are. I state assumptions, use real prompts and the provider tokenizer, add a margin for retries and repairs, and give a range for traffic. After launch the metering replaces the estimate within days, and that is when I tune the levers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does prompt caching ever cost more?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A cache write costs more than a normal input token, 1.25 times on Anthropic for the 5-minute cache, so a prefix written and never read again loses money. Its docs say the 5-minute cache pays off after one read. It pays when the prefix is long, byte-identical and reused within the cache lifetime, which I verify by tracking cached-token share.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Token | Unit of text models read and write; priced per million, input and output separately |
| Blended cost per request | Average cost of one request after its real mix of sizes, caching and models |
| Context re-send (quadratic agent cost) | Each agent step re-sends all previous steps, so total input grows with steps squared |
| Model routing | Sending each request to the cheapest model that handles it well |
| Prompt caching | Billing a repeated prompt prefix at a fraction of the input price |
| Batch API | Asynchronous, discounted endpoint for work without a waiting user |
| Cost attribution | Tagging every call with feature, tenant, model and purpose |
| Cost per outcome | Spend divided by business results, such as resolved tickets |

**Conclusion:** Estimating LLM cost is writing the real route down: for each feature, the calls one action triggers, the tokens each call reads and writes (with the stable prefix, the variable part and the output separated), the traffic, and the current price card with its cache and batch multipliers. The worked estimate came to $63,045 a month, with an agent that served few tasks costing more than a third of it because it re-sends its transcript at every step. Controlling cost is then a ranked set of levers measured on your own workload: here prompt caching, routing, batching, shorter output and compacted agent context together cut 59.8%. Meter every call with feature, tenant and purpose tags so the estimate becomes a measurement, and judge changes by cost per outcome, not cost per token.`,
    examples: [
      {
        label: `Monthly cost estimate and the levers that change it`,
        variants: [
          { tech: "node", code: `// Estimate a monthly LLM bill from traffic assumptions, then apply levers.
// Prices are a HYPOTHETICAL card in $ per million tokens; use your provider's page.
const PRICE = { large: { in: 3.0, out: 15.0 }, small: { in: 0.8, out: 4.0 } };
const CACHE_WRITE = 1.25, CACHE_READ = 0.1, BATCH = 0.5; // multipliers on input price
const DAYS = 30, HIT = 0.98; // assume 98% of prefix lookups hit a warm cache

// one-call features: stable prefix + variable part + output, per request
const features = {
  chat: { perDay: 40000, prefix: 2500, variable: 3500, out: 350, model: "large" },
  tagging: { perDay: 100000, prefix: 600, variable: 200, out: 10, model: "large" },
  summaries: { perDay: 5000, prefix: 500, variable: 7500, out: 500, model: "large" },
};
const agent = { perDay: 2000, steps: 10, prefix: 4000, toolResult: 1500, out: 200 };

function callCost(model, uncached, written, read, out, batch) {
  const p = PRICE[model];
  const input = (uncached + written * CACHE_WRITE + read * CACHE_READ) * p.in;
  return ((input + out * p.out) / 1e6) * (batch ? BATCH : 1);
}

function monthly(cfg) {
  const rows = {};
  for (const [name, f] of Object.entries(features)) {
    const model = name === "tagging" && cfg.route ? "small" : f.model;
    const out = name === "chat" && cfg.concise ? 250 : f.out;
    const batch = name === "summaries" && cfg.batch;
    let c;
    if (cfg.cache) {
      const hit = callCost(model, f.variable, 0, f.prefix, out, batch);
      const miss = callCost(model, f.variable, f.prefix, 0, out, batch);
      c = HIT * hit + (1 - HIT) * miss;
    } else c = callCost(model, f.prefix + f.variable, 0, 0, out, batch);
    rows[name] = c * f.perDay * DAYS;
  }
  // the agent re-sends the whole transcript every step
  const grow = (cfg.compact ? 400 : agent.toolResult) + agent.out;
  let task = 0;
  for (let i = 1; i <= agent.steps; i++) {
    const history = (i - 1) * grow;
    if (!cfg.cache) task += callCost("large", agent.prefix + history, 0, 0, agent.out, false);
    else {
      // prefix and older turns are read from cache; the newest turn is written
      const newest = i === 1 ? 0 : grow;
      task += callCost("large", 0, newest, agent.prefix + history - newest, agent.out, false);
    }
  }
  rows.agent = task * agent.perDay * DAYS;
  return rows;
}

const total = (r) => Object.values(r).reduce((a, b) => a + b, 0);
const usd = (x) => "$" + x.toFixed(0).padStart(7);

console.log("agent task, input tokens per step (the transcript is re-sent):");
let sum = 0;
const steps = [];
for (let i = 1; i <= agent.steps; i++) {
  const t = agent.prefix + (i - 1) * (agent.toolResult + agent.out);
  sum += t; steps.push(t);
}
console.log(\`  \${steps.join(" ")}\`);
console.log(\`  total \${sum} tokens vs naive 10 x \${agent.prefix} = \${10 * agent.prefix} (\${(sum / (10 * agent.prefix)).toFixed(2)}x)\`);
console.log("");
const base = monthly({});
console.log("baseline monthly bill by feature:");
for (const [k, v] of Object.entries(base)) console.log(\`  \${k.padEnd(10)} \${usd(v)}\`);
console.log(\`  \${"total".padEnd(10)} \${usd(total(base))}\`);
console.log("");
console.log("levers applied one after another:        monthly   saved");
const levers = [
  ["route tagging to the small model", { route: true }],
  ["prompt-cache stable prefixes", { cache: true }],
  ["batch API for nightly summaries", { batch: true }],
  ["concise chat answers (350 -> 250)", { concise: true }],
  ["compact agent tool results (1500 -> 400)", { compact: true }],
];
let cfg = {}, prev = total(base);
for (const [name, add] of levers) {
  cfg = { ...cfg, ...add };
  const t = total(monthly(cfg));
  console.log(\`  \${name.padEnd(40)} \${usd(t)}  \${((1 - t / prev) * 100).toFixed(1).padStart(4)}%\`);
  prev = t;
}
console.log(\`  overall: \${((1 - prev / total(base)) * 100).toFixed(1)}% lower than baseline\`);` },
          { tech: "python", code: `# Estimate a monthly LLM bill from traffic assumptions, then apply levers.
# Prices are a HYPOTHETICAL card in $ per million tokens; use your provider's page.
PRICE = {"large": {"in": 3.0, "out": 15.0}, "small": {"in": 0.8, "out": 4.0}}
CACHE_WRITE, CACHE_READ, BATCH = 1.25, 0.1, 0.5  # multipliers on input price
DAYS, HIT = 30, 0.98  # assume 98% of prefix lookups hit a warm cache

# one-call features: stable prefix + variable part + output, per request
features = {
    "chat": {"per_day": 40000, "prefix": 2500, "variable": 3500, "out": 350, "model": "large"},
    "tagging": {"per_day": 100000, "prefix": 600, "variable": 200, "out": 10, "model": "large"},
    "summaries": {"per_day": 5000, "prefix": 500, "variable": 7500, "out": 500, "model": "large"},
}
agent = {"per_day": 2000, "steps": 10, "prefix": 4000, "tool_result": 1500, "out": 200}


def call_cost(model, uncached, written, read, out, batch):
    p = PRICE[model]
    inp = (uncached + written * CACHE_WRITE + read * CACHE_READ) * p["in"]
    return ((inp + out * p["out"]) / 1e6) * (BATCH if batch else 1)


def monthly(cfg):
    rows = {}
    for name, f in features.items():
        model = "small" if name == "tagging" and cfg.get("route") else f["model"]
        out = 250 if name == "chat" and cfg.get("concise") else f["out"]
        batch = name == "summaries" and cfg.get("batch", False)
        if cfg.get("cache"):
            hit = call_cost(model, f["variable"], 0, f["prefix"], out, batch)
            miss = call_cost(model, f["variable"], f["prefix"], 0, out, batch)
            c = HIT * hit + (1 - HIT) * miss
        else:
            c = call_cost(model, f["prefix"] + f["variable"], 0, 0, out, batch)
        rows[name] = c * f["per_day"] * DAYS
    # the agent re-sends the whole transcript every step
    grow = (400 if cfg.get("compact") else agent["tool_result"]) + agent["out"]
    task = 0
    for i in range(1, agent["steps"] + 1):
        history = (i - 1) * grow
        if not cfg.get("cache"):
            task += call_cost("large", agent["prefix"] + history, 0, 0, agent["out"], False)
        else:
            # prefix and older turns are read from cache; the newest turn is written
            newest = 0 if i == 1 else grow
            task += call_cost("large", 0, newest, agent["prefix"] + history - newest, agent["out"], False)
    rows["agent"] = task * agent["per_day"] * DAYS
    return rows


def total(r):
    t = 0
    for v in r.values():
        t += v
    return t


def usd(x):
    return "$" + f"{x:.0f}".rjust(7)


print("agent task, input tokens per step (the transcript is re-sent):")
s, steps = 0, []
for i in range(1, agent["steps"] + 1):
    t = agent["prefix"] + (i - 1) * (agent["tool_result"] + agent["out"])
    s += t
    steps.append(t)
print("  " + " ".join(str(t) for t in steps))
print(f"  total {s} tokens vs naive 10 x {agent['prefix']} = {10 * agent['prefix']} ({s / (10 * agent['prefix']):.2f}x)")
print("")
base = monthly({})
print("baseline monthly bill by feature:")
for k, v in base.items():
    print(f"  {k:<10} {usd(v)}")
print(f"  {'total':<10} {usd(total(base))}")
print("")
print("levers applied one after another:        monthly   saved")
levers = [
    ("route tagging to the small model", {"route": True}),
    ("prompt-cache stable prefixes", {"cache": True}),
    ("batch API for nightly summaries", {"batch": True}),
    ("concise chat answers (350 -> 250)", {"concise": True}),
    ("compact agent tool results (1500 -> 400)", {"compact": True}),
]
cfg, prev = {}, total(base)
for name, add in levers:
    cfg = {**cfg, **add}
    t = total(monthly(cfg))
    print(f"  {name:<40} {usd(t)}  {f'{(1 - t / prev) * 100:.1f}':>4}%")
    prev = t
print(f"  overall: {(1 - prev / total(base)) * 100:.1f}% lower than baseline")` },
        ],
      },
      {
        label: `Metering: attribute spend to features, tenants and outcomes`,
        variants: [
          { tech: "node", code: `// Metering: price every call from its usage record, then attribute the cost
// to features, tenants and outcomes. Hypothetical prices, $ per million tokens.
const PRICE = { large: { in: 3.0, out: 15.0, read: 0.3 }, small: { in: 0.8, out: 4.0, read: 0.08 } };
// usage records as an API returns them, tagged by our gateway
// [feature, tenant, model, input, cachedRead, output, purpose, ticketId, resolved]
const log = [
  ["support", "acme", "large", 6200, 2500, 340, "answer", "T1", true],
  ["support", "acme", "large", 6900, 2500, 410, "answer", "T1", true],
  ["support", "globex", "large", 5800, 0, 300, "answer", "T2", false],
  ["support", "globex", "large", 6100, 2500, 900, "answer", "T3", true],
  ["support", "globex", "large", 6100, 2500, 880, "json-repair", "T3", true],
  ["support", "initech", "large", 7400, 2500, 350, "answer", "T4", false],
  ["tagging", "acme", "small", 800, 600, 8, "answer", null, false],
  ["tagging", "globex", "small", 820, 600, 9, "answer", null, false],
  ["tagging", "initech", "small", 790, 0, 7, "answer", null, false],
  ["agent", "initech", "large", 19300, 15900, 200, "answer", "T5", true],
  ["agent", "initech", "large", 21000, 17600, 220, "retry-after-timeout", "T5", true],
];

function cost([, , model, input, read, output]) {
  const p = PRICE[model];
  return ((input - read) * p.in + read * p.read + output * p.out) / 1e6;
}
function groupBy(idx) {
  const m = new Map();
  for (const r of log) m.set(r[idx], (m.get(r[idx]) || 0) + cost(r));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
const fmt = (x) => "$" + x.toFixed(4);
const all = log.reduce((a, r) => a + cost(r), 0);
console.log(\`\${log.length} calls, total \${fmt(all)}\`);
console.log("by feature:");
for (const [k, v] of groupBy(0)) console.log(\`  \${k.padEnd(8)} \${fmt(v)}  \${((v / all) * 100).toFixed(1).padStart(5)}%\`);
console.log("by tenant:");
for (const [k, v] of groupBy(1)) console.log(\`  \${k.padEnd(8)} \${fmt(v)}  \${((v / all) * 100).toFixed(1).padStart(5)}%\`);

const overhead = log.filter((r) => r[6] !== "answer").reduce((a, r) => a + cost(r), 0);
console.log(\`calls that were repairs or retries: \${fmt(overhead)} (\${((overhead / all) * 100).toFixed(1)}% of spend)\`);

// cost per outcome: all spend on a ticket, divided over resolved tickets
const tickets = new Map();
for (const r of log) if (r[7]) {
  const t = tickets.get(r[7]) || { cost: 0, resolved: r[8] };
  t.cost += cost(r); tickets.set(r[7], t);
}
let ticketSpend = 0, resolved = 0;
for (const t of tickets.values()) { ticketSpend += t.cost; if (t.resolved) resolved++; }
console.log(\`tickets: \${tickets.size}, resolved: \${resolved}\`);
console.log(\`  cost per ticket touched \${fmt(ticketSpend / tickets.size)}, cost per resolved ticket \${fmt(ticketSpend / resolved)}\`);
const cacheShare = log.reduce((a, r) => a + r[4], 0) / log.reduce((a, r) => a + r[3], 0);
console.log(\`share of input tokens read from cache: \${(cacheShare * 100).toFixed(1)}%\`);` },
          { tech: "python", code: `# Metering: price every call from its usage record, then attribute the cost
# to features, tenants and outcomes. Hypothetical prices, $ per million tokens.
PRICE = {"large": {"in": 3.0, "out": 15.0, "read": 0.3}, "small": {"in": 0.8, "out": 4.0, "read": 0.08}}
# usage records as an API returns them, tagged by our gateway
# [feature, tenant, model, input, cached_read, output, purpose, ticket_id, resolved]
log = [
    ["support", "acme", "large", 6200, 2500, 340, "answer", "T1", True],
    ["support", "acme", "large", 6900, 2500, 410, "answer", "T1", True],
    ["support", "globex", "large", 5800, 0, 300, "answer", "T2", False],
    ["support", "globex", "large", 6100, 2500, 900, "answer", "T3", True],
    ["support", "globex", "large", 6100, 2500, 880, "json-repair", "T3", True],
    ["support", "initech", "large", 7400, 2500, 350, "answer", "T4", False],
    ["tagging", "acme", "small", 800, 600, 8, "answer", None, False],
    ["tagging", "globex", "small", 820, 600, 9, "answer", None, False],
    ["tagging", "initech", "small", 790, 0, 7, "answer", None, False],
    ["agent", "initech", "large", 19300, 15900, 200, "answer", "T5", True],
    ["agent", "initech", "large", 21000, 17600, 220, "retry-after-timeout", "T5", True],
]


def cost(r):
    _, _, model, inp, read, output = r[:6]
    p = PRICE[model]
    return ((inp - read) * p["in"] + read * p["read"] + output * p["out"]) / 1e6


def group_by(idx):
    m = {}
    for r in log:
        m[r[idx]] = m.get(r[idx], 0) + cost(r)
    return sorted(m.items(), key=lambda kv: -kv[1])


def fmt(x):
    return f"\${x:.4f}"


def total(rows):
    t = 0
    for r in rows:
        t += cost(r)
    return t


all_ = total(log)
print(f"{len(log)} calls, total {fmt(all_)}")
print("by feature:")
for k, v in group_by(0):
    print(f"  {k:<8} {fmt(v)}  {f'{v / all_ * 100:.1f}':>5}%")
print("by tenant:")
for k, v in group_by(1):
    print(f"  {k:<8} {fmt(v)}  {f'{v / all_ * 100:.1f}':>5}%")

overhead = total([r for r in log if r[6] != "answer"])
print(f"calls that were repairs or retries: {fmt(overhead)} ({overhead / all_ * 100:.1f}% of spend)")

# cost per outcome: all spend on a ticket, divided over resolved tickets
tickets = {}
for r in log:
    if r[7]:
        t = tickets.setdefault(r[7], {"cost": 0, "resolved": r[8]})
        t["cost"] += cost(r)
ticket_spend, resolved = 0, 0
for t in tickets.values():
    ticket_spend += t["cost"]
    if t["resolved"]:
        resolved += 1
print(f"tickets: {len(tickets)}, resolved: {resolved}")
print(f"  cost per ticket touched {fmt(ticket_spend / len(tickets))}, cost per resolved ticket {fmt(ticket_spend / resolved)}")
cache_share = sum(r[4] for r in log) / sum(r[3] for r in log)
print(f"share of input tokens read from cache: {cache_share * 100:.1f}%")` },
        ],
      },
    ],
  },
  {
    title: `Cost optimization for LLM apps: how do you keep the bill predictable?`,
    difficulty: "medium",
    seoDescription: `Keep an LLM bill predictable: per-request cost bounds, tenant quotas, provider spend limits, anomaly and burn-rate alerts, and a degradation ladder.`,
    description: `**Question presented to candidate:**
"Our LLM bill swings wildly: one month it was 40% over plan because a customer's integration got stuck in a loop, and another month a prompt change quietly doubled our token usage. Finance wants a number they can rely on. How do you make LLM spend predictable without killing the product?"

**What a strong answer should cover:**
- Why the bill is volatile: cost per request has a long tail (output length, agent steps, retries), and spend is driven by a few tenants and a few prompts, so averages hide the risk
- Bound every unit: per-request limits (\`max_tokens\`, input size caps, agent step and tool-call caps) give a worst-case cost per request you can multiply by traffic
- Budgets in layers: per-tenant and per-feature quotas enforced in your own gateway, plus provider-side spend limits as the last backstop, with the trade-off that a hard cap is an outage for that scope
- Detection before the invoice: daily spend and cost-per-request anomaly alerts, a burn-rate forecast against the monthly budget, and attribution so the alert names the tenant, feature or prompt version
- A degradation ladder instead of a cliff: cheaper model, shorter answers, queue or batch non-urgent work, then hard limits, decided in advance with product
- Commercial levers for predictability: reserved or provisioned capacity (a fixed bill that is cheaper only above a break-even utilisation) and pricing your own plans so heavy users pay for heavy use

**Clarifying questions expected:**
- Is the goal a lower bill, a predictable bill, or both, and how much over-budget risk is acceptable?
- Is usage per tenant visible today, and do customer plans include usage limits?
- Which features can degrade (cheaper model, slower answer) and which must always run at full quality?

**Code / implementation expected:** Optional — sketching a per-tenant budget check in the gateway and a burn-rate alert is enough.`,
    answer: `**Target Audience:** Engineers and tech leads who already know roughly what their LLM features cost, but whose monthly bill keeps surprising finance, and who need it to land within a known range.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (a 30-day spend simulation with and without controls, and a worst-case and reserved-capacity calculator). All prices and traffic in the examples are **hypothetical**; provider budget and capacity features are quoted from the Anthropic, OpenAI and AWS documentation, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A family on a prepaid phone plan never gets a shocking bill. A family on an unlimited-usage, pay-per-minute plan with a teenager who discovers international calls does. The difference is not how much they usually spend; it is whether anything stops the bad month.

Most LLM bills are the second kind of plan. Usually spend tracks traffic. Then one customer's integration retries in a loop for four days, or someone adds 3,000 tokens of examples to a system prompt, or an agent starts taking 40 steps instead of 8, and the month lands 40% over plan. Nobody notices until the invoice, because nothing was watching and nothing was capped.

A predictable bill is not mainly about spending less. It is about **bounding** each request, **budgeting** each tenant and feature, **noticing** a spike in hours rather than weeks, and having a **planned way to slow down** before a hard stop.

How to estimate the bill and which levers make it smaller is the sibling question [How do you estimate and control LLM costs in production?](/interview-question/how-do-you-estimate-and-control-llm-costs-in-production) This page is about the variance.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the goal a lower bill, a predictable bill, or both? | Predictability can cost money (reserved capacity, safety margins); savings can add variance. |
| How much over-budget risk is acceptable, and what happens at the limit? | Decides between alerts only, soft degradation and hard caps. |
| Can we see spend per tenant and per feature today? | Without attribution an alert says "spend is up" but not who or why. |
| Do customer plans include usage limits? | If customers pay a flat fee for unlimited AI use, the heaviest user sets your cost. |
| Which features may degrade, and which must not? | The degradation ladder needs product sign-off before the incident. |

## 3. Where the Variance Comes From

📌 **Interview term: long-tail cost distribution** — most requests cost about the same, a few cost many times more (very long outputs, many agent steps, retries, huge pasted documents). The tail decides both the average and the worst month.

The second example, **"Worst-case cost per request and reserved capacity"**, draws 1,000 requests where 3% produce a runaway answer of 3,000 to 12,000 tokens:

~~~text
part 1: cost per request over 1000 requests
  max_tokens 16000: mean $0.0195  p50 $0.0168  p99 $0.1376  max $0.1878  bound $0.2580
  max_tokens  1000: mean $0.0168  p50 $0.0168  p99 $0.0279  max $0.0322  bound $0.0330
~~~

With a generous limit the p99 request costs eight times the median and 3% of requests lift the mean by 16%. With a 1,000-token cap the median is unchanged, the p99 drops by 80%, and, most importantly, there is now a **bound**.

📌 **Interview term: worst-case cost per request** — the maximum a single call can cost: maximum input tokens times input price plus \`max_tokens\` times output price. Once every request has one, a traffic forecast becomes a spend ceiling: "1M requests can never exceed $33,000" is something finance can plan with.

~~~text
  bound = max input x input price + max_tokens x output price
  1M requests/month at the 1000-token bound can never exceed $33000
~~~

The cap has a cost: those 3% of answers are now truncated. Size \`max_tokens\` per endpoint from the real distribution of good answers, and detect truncation (Anthropic reports \`stop_reason: "max_tokens"\`, OpenAI Chat Completions reports \`finish_reason: "length"\`) so it shows up as a quality signal rather than silently.

Other per-request bounds of the same kind: a maximum input size (reject or summarise oversized pastes), a maximum number of agent steps and tool calls per task, a maximum number of retries and repair attempts. Agent-specific caps are covered in [Guardrails for AI agents: rate limits, budget caps and HITL](/interview-question/guardrails-for-ai-agents-rate-limits-budget-caps-and-hitl).

## 4. Budgets in Layers

📌 **Interview term: quota** — a limit on usage (requests, tokens or dollars) for one scope over one period: per tenant per day, per feature per month. It is enforced *before* the call, in your gateway.

📌 **Interview term: spend limit (spend cap)** — a provider-side ceiling on what an organisation, workspace or project can spend. Hitting it stops calls for that whole scope.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 280" role="img" aria-label="Four nested budget layers: per-request bound inside a per-tenant quota inside a per-feature budget inside the provider spend limit">
  <rect class="d-box-muted" x="20" y="20" width="720" height="240" rx="12"/>
  <text class="d-text" x="380" y="48" text-anchor="middle">provider spend limit: last backstop</text>
  <rect class="d-box" x="70" y="70" width="620" height="170" rx="12"/>
  <text class="d-text" x="380" y="98" text-anchor="middle">feature budget: per month</text>
  <rect class="d-box" x="130" y="120" width="500" height="100" rx="12"/>
  <text class="d-text" x="380" y="148" text-anchor="middle">tenant quota: per day</text>
  <rect class="d-box-accent" x="250" y="165" width="260" height="40" rx="8"/>
  <text class="d-sub" x="380" y="190" text-anchor="middle">per-request bound</text>
</svg>

The inner layers are precise and cheap to hit (one tenant, one request); the outer layers are blunt and catch only what the inner ones missed.

What the providers offer as the outer layer (checked October 2026):

- **Anthropic** documents a monthly spend limit per organisation tied to its usage tier, a lower limit you can set yourself, and separate spend limits per workspace (capped by the organisation limit). When the cap is reached, API usage pauses until the next month unless the limit is raised, and its errors page notes that a spend-cap 429 carries no \`retry-after\` (Claude rate-limits and errors docs).
- **OpenAI** documents spend alerts (a notification at a threshold, traffic continues) and hard spend limits per project or organisation that make affected requests return 429, and notes that enforcement is not instantaneous, so recorded spend can slightly exceed the configured amount (OpenAI spend-limits guide).

These are backstops, not a budgeting system. A provider cap stops *everything* in that scope, which means your best customer goes down because of your worst one. The per-tenant layer lives in your own gateway, where you know who the tenant is.

## 5. Detect It Before the Invoice

The first example, **"30 days of spend with and without controls"**, replays the two incidents from the question: tenant \`initech\` ships a retry-loop bug on day 12 that multiplies its traffic by 10 for five days, and a prompt change on day 20 adds 3,000 tokens to every request.

~~~text
no controls:
  no caps, no alerts: the invoice is the first signal
  month total $34481 (budget $25000), worst day $2293
~~~

38% over budget, and the worst day was more than three times a normal one. With four controls in place:

~~~text
with controls:
  day 12: initech hit its daily cap, extra calls get 429 (other tenants unaffected)
  day 20: cost per request $0.0255 vs 7-day avg $0.0165: alert, prompt rolled back
  day 20: forecast month end $25062 > budget $25000: alert sent
  day 28: 90% of budget used, non-premium traffic moves to the small model
  month total $23053 (budget $25000), worst day $1210
~~~

📌 **Interview term: cost-per-request anomaly alert** — compare today's cost per request with a trailing average; a jump means something changed in *what* each request costs (a prompt, a model, a retry storm), independent of traffic. It caught the prompt bloat on the same day.

📌 **Interview term: burn-rate forecast** — spend so far divided by days elapsed, times days in the month, compared with the budget. It turns "we have spent about $16,700 by day 20" into "we will end at $25,062", which is actionable while the month is still running.

Each alert must name its scope (tenant, feature, prompt version, model), which is only possible if every call is metered with those tags; see [What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application)

## 6. A Degradation Ladder, Not a Cliff

📌 **Interview term: degradation ladder** — a pre-agreed sequence of cheaper behaviours applied as a budget fills up, so the product gets gradually cheaper instead of hitting a hard stop.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="Degradation ladder from normal service to alert, then cheaper model, then queue non-urgent work, then hard cap, as budget use rises">
  <defs>
    <marker id="ai10q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="120" height="80" rx="10"/>
  <text class="d-text" x="80" y="95" text-anchor="middle">normal</text>
  <text class="d-sub" x="80" y="118" text-anchor="middle">under 70%</text>
  <rect class="d-box" x="170" y="60" width="120" height="80" rx="10"/>
  <text class="d-text" x="230" y="95" text-anchor="middle">alert</text>
  <text class="d-sub" x="230" y="118" text-anchor="middle">forecast over</text>
  <rect class="d-box" x="320" y="60" width="120" height="80" rx="10"/>
  <text class="d-text" x="380" y="95" text-anchor="middle">cheaper</text>
  <text class="d-sub" x="380" y="118" text-anchor="middle">small model</text>
  <rect class="d-box" x="470" y="60" width="120" height="80" rx="10"/>
  <text class="d-text" x="530" y="95" text-anchor="middle">defer</text>
  <text class="d-sub" x="530" y="118" text-anchor="middle">queue, batch</text>
  <rect class="d-box-accent" x="620" y="60" width="120" height="80" rx="10"/>
  <text class="d-text" x="680" y="95" text-anchor="middle">hard cap</text>
  <text class="d-sub" x="680" y="118" text-anchor="middle">at 100%</text>
  <path class="d-edge" d="M 142 100 L 166 100" marker-end="url(#ai10q4-arrow)"/>
  <path class="d-edge" d="M 292 100 L 316 100" marker-end="url(#ai10q4-arrow)"/>
  <path class="d-edge" d="M 442 100 L 466 100" marker-end="url(#ai10q4-arrow)"/>
  <path class="d-edge-accent" d="M 592 100 L 616 100" marker-end="url(#ai10q4-arrow)"/>
</svg>

Each step to the right costs a little quality or speed and buys back budget; the hard cap at the end should almost never be reached.

Typical rungs: a smaller model for non-premium plans or low-stakes features, shorter answers, moving background work to a [batch API](/interview-question/when-should-you-use-batch-apis-instead-of-real-time-llm-calls), serving more from caches, and only then a hard cap with a clear message. The thresholds and which features may drop to which rung are product decisions, made in advance. Every cheaper rung must have passed the feature evals.

## 7. Commercial Levers: Buying Predictability

📌 **Interview term: provisioned (reserved) throughput** — paying a fixed price per hour for dedicated model capacity instead of paying per token. AWS documents Bedrock Provisioned Throughput bought in model units, billed hourly, with no-commitment, 1-month and 6-month terms where longer terms lower the rate (Amazon Bedrock user guide). Azure OpenAI has a comparable provisioned offering (PTUs); that is described here from secondary sources, so check Microsoft's pricing page for its terms.

A fixed bill is perfectly predictable and wasteful when idle. Part 2 of the second example compares a hypothetical $40/hour reservation with pay-per-token at the capped blended cost:

~~~text
part 2: reserved capacity at $40/hour vs pay per token
  0.5M requests/month: per token $  8382  reserved $28800  cheaper: pay per token
    1M requests/month: per token $ 16763  reserved $28800  cheaper: pay per token
    2M requests/month: per token $ 33527  reserved $28800  cheaper: reserved
    4M requests/month: per token $ 67054  reserved $28800  cheaper: reserved
  break-even at 1.72M requests/month (if the reserved units can carry that load)
~~~

Below break-even you pay for predictability; above it you also save, provided the reserved capacity can actually serve that throughput (check its tokens per minute, not just its price). A common pattern is reserved capacity for the steady baseline and pay-per-token for peaks.

The other commercial lever is your own pricing: if customers pay a flat fee for unlimited AI usage, your heaviest user sets your cost. Plans with included usage, credits or fair-use limits move the variance to where it is caused.

## 8. Verified: Running the Code

Both programs are simulations over invented prices and traffic, with a seeded random generator implemented identically in both languages; they call no API. The spend simulation stands in for a metering pipeline plus a gateway; it leaves out the delay between a provider reporting usage and your dashboards seeing it, which in real systems is minutes to hours.

**"30 days of spend with and without controls"** — \`node a.js\` and \`python3.12 a.py\` both print exactly:

~~~text
no controls:
  no caps, no alerts: the invoice is the first signal
  month total $34481 (budget $25000), worst day $2293
with controls:
  day 12: initech hit its daily cap, extra calls get 429 (other tenants unaffected)
  day 20: cost per request $0.0255 vs 7-day avg $0.0165: alert, prompt rolled back
  day 20: forecast month end $25062 > budget $25000: alert sent
  day 28: 90% of budget used, non-premium traffic moves to the small model
  month total $23053 (budget $25000), worst day $1210
~~~

**"Worst-case cost per request and reserved capacity"** — \`node b.js\` and \`python3.12 b.py\` both print exactly:

~~~text
part 1: cost per request over 1000 requests
  max_tokens 16000: mean $0.0195  p50 $0.0168  p99 $0.1376  max $0.1878  bound $0.2580
  max_tokens  1000: mean $0.0168  p50 $0.0168  p99 $0.0279  max $0.0322  bound $0.0330
  bound = max input x input price + max_tokens x output price
  1M requests/month at the 1000-token bound can never exceed $33000
part 2: reserved capacity at $40/hour vs pay per token
  0.5M requests/month: per token $  8382  reserved $28800  cheaper: pay per token
    1M requests/month: per token $ 16763  reserved $28800  cheaper: pay per token
    2M requests/month: per token $ 33527  reserved $28800  cheaper: reserved
    4M requests/month: per token $ 67054  reserved $28800  cheaper: reserved
  break-even at 1.72M requests/month (if the reserved units can carry that load)
~~~

What the runs show:

- Without controls, two ordinary incidents put the month 38% over budget; with a tenant cap, a cost-per-request alert, a forecast alert and one degradation step, it finished 8% under, and the worst day dropped from $2,293 to $1,210.
- The tenant cap contained the retry loop to one tenant; nobody else was affected.
- A \`max_tokens\` cap turned an unbounded tail into a hard per-request bound, at the price of truncating 3% of answers.
- Under these numbers reserved capacity only beats pay-per-token above 1.72M requests a month.

## Edge Cases Worth Knowing

- **Metering lag.** Usage reports and provider dashboards can lag; count tokens yourself from each response so the gateway can enforce quotas in real time.
- **Streaming and cancelled requests.** A user who cancels mid-stream may still be billed for tokens already generated; meter from what the API reports, not from what was displayed.
- **Retry storms bypass quotas** if quotas count user requests rather than model calls. Count every call.
- **Price changes mid-contract.** A model deprecation or new version can change price and token counts at once; re-run the forecast when the model list changes.
- **Hard caps during incidents.** A cap hit by a bug in the middle of the night is an outage for that tenant; pair every cap with an alert and a runbook for raising it.

## Common Pitfalls

- **Relying on the invoice.** Monthly totals arrive weeks after the damage; alert daily on spend and on cost per request.
- **Only an org-wide cap.** One misbehaving tenant takes everyone down; put quotas per tenant in your gateway.
- **No per-request bound.** Without \`max_tokens\`, input caps and step caps there is no worst case to plan against.
- **Degrading without evals.** Falling back to a cheaper model that has never been evaluated trades a budget problem for a quality incident.
- **Averages in forecasts.** Plan with the tail; a forecast on mean cost per request is wrong in exactly the months that matter.
- **Flat-fee unlimited plans.** If revenue does not scale with usage, cost variance is pure margin risk.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the real problem:</strong> <span style="color:#f0e2c8;">An unpredictable bill is a variance problem, not an average one. Cost per request has a long tail from runaway outputs, agent steps and retries, and spend is driven by a few tenants and prompts. So I bound requests, budget scopes, detect spikes early and plan how to slow down.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Bound every request:</strong> <span style="color:#f0e2c8;">Every endpoint gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code>, an input size cap, and for agents a step and tool-call cap. That gives a <strong style="color:#ffca28;">worst-case cost per request</strong>, and a traffic forecast becomes a ceiling. In my demo a 1,000-token cap cut the p99 request cost by 80% and made 1M requests provably under $33,000.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Budgets in layers:</strong> <span style="color:#f0e2c8;">Per-tenant daily quotas and per-feature monthly budgets live in our gateway, where we know who is calling, so a bug in one customer's integration gets that customer 429s and nobody else. The provider spend limit, which Anthropic and OpenAI both offer, sits behind as the last backstop, because hitting it stops everything.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Detect in hours:</strong> <span style="color:#f0e2c8;">Two alerts matter most: <strong style="color:#ffca28;">cost per request</strong> against a 7-day average, which catches prompt bloat or retry storms regardless of traffic, and a <strong style="color:#ffca28;">burn-rate forecast</strong> of month-end spend against budget. In my simulation the same two incidents ended 38% over budget with no controls and 8% under with them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Degrade, then cap:</strong> <span style="color:#f0e2c8;">A pre-agreed <strong style="color:#ffca28;">degradation ladder</strong>: cheaper model for non-premium traffic, shorter answers, defer background work to batch, and only then a hard cap. Every rung has passed evals. For the steady baseline, reserved capacity buys a fixed bill, which only pays above break-even, 1.72M requests a month in my numbers.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just set the provider spend limit and be done?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is a single blunt cap for the whole organisation, workspace or project. When one tenant's bug burns through it, every customer goes down, and OpenAI notes enforcement is not instantaneous anyway. It is the backstop; the precise limits belong in our gateway per tenant and feature.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you choose the per-tenant quota?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From their plan and their history: a multiple of their normal daily usage, with headroom for growth, and higher for plans that pay for it. Hitting it triggers an alert to us and a clear error to them. Quotas count model calls and tokens, not user requests, so retry storms are counted too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does capping <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">max_tokens</code> hurt quality?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can, by truncating legitimate long answers. I size the cap per endpoint from the distribution of good answers, detect truncation from the stop or finish reason, and track the truncation rate as a quality metric. If it climbs, the cap or the prompt is wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does reserved or provisioned capacity make sense?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When there is a steady, high baseline. It is a fixed hourly price, so it is cheaper only above a break-even utilisation and wasteful when idle. The usual design is reserved capacity for the baseline and pay-per-token for peaks, after checking the reserved units can carry the throughput, not just that the price works.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you catch a prompt change that doubles tokens?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Meter every call with prompt version and feature, and alert when cost per request or input tokens per request jumps against a trailing average. In my simulation that alert fired the same day. Better still, the prompt rollout pipeline reports token counts on the eval set before the change ships.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Long-tail cost distribution | Most requests cost about the same; a few cost many times more |
| Worst-case cost per request | Max input × input price + \`max_tokens\` × output price |
| Quota | A usage limit for one scope and period, enforced in your gateway |
| Spend limit (spend cap) | A provider-side ceiling on spend for an organisation, workspace or project |
| Cost-per-request anomaly alert | Alert when cost per request jumps relative to a trailing average |
| Burn-rate forecast | Spend so far scaled to the full month and compared with the budget |
| Degradation ladder | Pre-agreed cheaper behaviours applied as budget fills up |
| Provisioned (reserved) throughput | Fixed hourly price for dedicated capacity instead of per-token billing |

**Conclusion:** An LLM bill becomes predictable when every request has a worst-case cost (\`max_tokens\`, input caps, agent step caps), every tenant and feature has a quota enforced in your own gateway, the provider spend limit sits behind them as a last backstop, and alerts on cost per request and on the month-end forecast fire within a day instead of at invoice time. A pre-agreed degradation ladder lets the product get cheaper gradually instead of hitting a cliff, and reserved capacity or usage-based plans move the remaining variance to where it belongs. In the simulation, the same two incidents produced a month 38% over budget with no controls and 8% under with them, without any other tenant noticing.`,
    examples: [
      {
        label: `30 days of spend with and without controls`,
        variants: [
          { tech: "node", code: `// 30 days of spend, with and without budget controls. One tenant ships a
// retry-loop bug on day 12; a prompt change bloats every request on day 20.
// Hypothetical prices ($ per million tokens) and traffic; seeded noise.
const IN = 3.0, OUT = 15.0, SMALL_FACTOR = 0.27; // small model costs 27% as much
const BUDGET = 25000; // monthly budget in $
const tenants = { acme: 20000, globex: 15000, initech: 10000 }; // requests per day
const TENANT_DAILY_CAP = { acme: 700, globex: 550, initech: 400 }; // $ per day

function simulate(controls) {
  let seed = 11; // Park-Miller, same noise in both runs and both languages
  const rand = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  let spent = 0, maxDay = 0, degraded = false, bloatFixed = false;
  const events = [], history = [];
  for (let day = 1; day <= 30; day++) {
    const bloat = day >= 20 && !bloatFixed ? 3000 : 0;
    let perReq = ((4000 + bloat) * IN + 300 * OUT) / 1e6;
    if (degraded) perReq *= SMALL_FACTOR;
    let today = 0, requests = 0;
    for (const [name, base] of Object.entries(tenants)) {
      let n = Math.round(base * (0.9 + 0.2 * rand()));
      if (name === "initech" && day >= 12 && day <= 16) n *= 10; // the retry loop
      let c = n * perReq;
      if (controls && c > TENANT_DAILY_CAP[name]) {
        if (day === 12) events.push(\`day \${day}: \${name} hit its daily cap, extra calls get 429 (other tenants unaffected)\`);
        c = TENANT_DAILY_CAP[name]; n = Math.floor(c / perReq);
      }
      today += c; requests += n;
    }
    spent += today; maxDay = Math.max(maxDay, today);
    const cpr = today / requests;
    if (controls && history.length >= 7) {
      const avg = history.slice(-7).reduce((a, b) => a + b, 0) / 7;
      if (cpr > 1.3 * avg && !bloatFixed) {
        events.push(\`day \${day}: cost per request $\${cpr.toFixed(4)} vs 7-day avg $\${avg.toFixed(4)}: alert, prompt rolled back\`);
        bloatFixed = true;
      }
    }
    history.push(cpr);
    const projected = (spent / day) * 30;
    if (controls && day >= 3 && projected > BUDGET && !events.some((e) => e.includes("forecast"))) {
      events.push(\`day \${day}: forecast month end $\${projected.toFixed(0)} > budget $\${BUDGET}: alert sent\`);
    }
    if (controls && !degraded && spent > 0.9 * BUDGET) {
      degraded = true;
      events.push(\`day \${day}: 90% of budget used, non-premium traffic moves to the small model\`);
    }
  }
  return { spent, maxDay, events };
}

for (const controls of [false, true]) {
  const r = simulate(controls);
  console.log(controls ? "with controls:" : "no controls:");
  if (!r.events.length) console.log("  no caps, no alerts: the invoice is the first signal");
  for (const e of r.events) console.log(\`  \${e}\`);
  console.log(\`  month total $\${r.spent.toFixed(0)} (budget $\${BUDGET}), worst day $\${r.maxDay.toFixed(0)}\`);
}` },
          { tech: "python", code: `# 30 days of spend, with and without budget controls. One tenant ships a
# retry-loop bug on day 12; a prompt change bloats every request on day 20.
# Hypothetical prices ($ per million tokens) and traffic; seeded noise.
IN, OUT, SMALL_FACTOR = 3.0, 15.0, 0.27  # small model costs 27% as much
BUDGET = 25000  # monthly budget in $
tenants = {"acme": 20000, "globex": 15000, "initech": 10000}  # requests per day
TENANT_DAILY_CAP = {"acme": 700, "globex": 550, "initech": 400}  # $ per day


def js_round(x):  # Math.round: halves go up
    import math
    return math.floor(x + 0.5)


def simulate(controls):
    seed = 11  # Park-Miller, same noise in both runs and both languages

    def rand():
        nonlocal seed
        seed = (seed * 48271) % 2147483647
        return seed / 2147483647

    spent, max_day, degraded, bloat_fixed = 0, 0, False, False
    events, history = [], []
    for day in range(1, 31):
        bloat = 3000 if day >= 20 and not bloat_fixed else 0
        per_req = ((4000 + bloat) * IN + 300 * OUT) / 1e6
        if degraded:
            per_req *= SMALL_FACTOR
        today, requests = 0, 0
        for name, base in tenants.items():
            n = js_round(base * (0.9 + 0.2 * rand()))
            if name == "initech" and 12 <= day <= 16:
                n *= 10  # the retry loop
            c = n * per_req
            if controls and c > TENANT_DAILY_CAP[name]:
                if day == 12:
                    events.append(f"day {day}: {name} hit its daily cap, extra calls get 429 (other tenants unaffected)")
                c = TENANT_DAILY_CAP[name]
                n = int(c // per_req)
            today += c
            requests += n
        spent += today
        max_day = max(max_day, today)
        cpr = today / requests
        if controls and len(history) >= 7:
            avg = 0
            for h in history[-7:]:
                avg += h
            avg /= 7
            if cpr > 1.3 * avg and not bloat_fixed:
                events.append(f"day {day}: cost per request \${cpr:.4f} vs 7-day avg \${avg:.4f}: alert, prompt rolled back")
                bloat_fixed = True
        history.append(cpr)
        projected = (spent / day) * 30
        if controls and day >= 3 and projected > BUDGET and not any("forecast" in e for e in events):
            events.append(f"day {day}: forecast month end \${projected:.0f} > budget \${BUDGET}: alert sent")
        if controls and not degraded and spent > 0.9 * BUDGET:
            degraded = True
            events.append(f"day {day}: 90% of budget used, non-premium traffic moves to the small model")
    return spent, max_day, events


for controls in (False, True):
    spent, max_day, events = simulate(controls)
    print("with controls:" if controls else "no controls:")
    if not events:
        print("  no caps, no alerts: the invoice is the first signal")
    for e in events:
        print(f"  {e}")
    print(f"  month total \${spent:.0f} (budget \${BUDGET}), worst day \${max_day:.0f}")` },
        ],
      },
      {
        label: `Worst-case cost per request and reserved capacity`,
        variants: [
          { tech: "node", code: `// Part 1: a per-request cost bound. Output length has a long tail; a cap
// turns "unknown" into a number you can multiply by traffic.
// Part 2: pay-per-token vs reserved capacity: when is a fixed bill cheaper?
// All prices are HYPOTHETICAL ($ per million tokens, $ per hour).
const IN = 3.0, OUT = 15.0;
let seed = 5;
const rand = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };

// 1000 requests: input 2000-6000 tokens; output usually short, sometimes runaway
const reqs = [];
for (let i = 0; i < 1000; i++) {
  const input = 2000 + Math.floor(rand() * 4000);
  const r = rand();
  const output = r < 0.97 ? 100 + Math.floor(rand() * 400) : 3000 + Math.floor(rand() * 9000);
  reqs.push([input, output]);
}
const cost = (i, o) => (i * IN + o * OUT) / 1e6;
function stats(cap) {
  const cs = reqs.map(([i, o]) => cost(i, Math.min(o, cap))).sort((a, b) => a - b);
  const at = (p) => cs[Math.ceil((p / 100) * cs.length) - 1];
  const mean = cs.reduce((a, b) => a + b, 0) / cs.length;
  return { mean, p50: at(50), p99: at(99), max: cs[cs.length - 1] };
}
console.log("part 1: cost per request over 1000 requests");
for (const cap of [16000, 1000]) {
  const s = stats(cap);
  const bound = cost(6000, cap);
  console.log(\`  max_tokens \${String(cap).padStart(5)}: mean $\${s.mean.toFixed(4)}  p50 $\${s.p50.toFixed(4)}  p99 $\${s.p99.toFixed(4)}  max $\${s.max.toFixed(4)}  bound $\${bound.toFixed(4)}\`);
}
console.log("  bound = max input x input price + max_tokens x output price");
console.log(\`  1M requests/month at the 1000-token bound can never exceed $\${(cost(6000, 1000) * 1e6).toFixed(0)}\`);

console.log("part 2: reserved capacity at $40/hour vs pay per token");
const RESERVED_PER_MONTH = 40 * 24 * 30; // $28800, billed whether used or not
const perReq = stats(1000).mean;
for (const millions of [0.5, 1, 2, 4]) {
  const onDemand = millions * 1e6 * perReq;
  const cheaper = onDemand < RESERVED_PER_MONTH ? "pay per token" : "reserved";
  console.log(\`  \${String(millions).padStart(3)}M requests/month: per token $\${onDemand.toFixed(0).padStart(6)}  reserved $\${RESERVED_PER_MONTH}  cheaper: \${cheaper}\`);
}
console.log(\`  break-even at \${(RESERVED_PER_MONTH / perReq / 1e6).toFixed(2)}M requests/month (if the reserved units can carry that load)\`);` },
          { tech: "python", code: `# Part 1: a per-request cost bound. Output length has a long tail; a cap
# turns "unknown" into a number you can multiply by traffic.
# Part 2: pay-per-token vs reserved capacity: when is a fixed bill cheaper?
# All prices are HYPOTHETICAL ($ per million tokens, $ per hour).
import math

IN, OUT = 3.0, 15.0
seed = 5


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


# 1000 requests: input 2000-6000 tokens; output usually short, sometimes runaway
reqs = []
for i in range(1000):
    inp = 2000 + math.floor(rand() * 4000)
    r = rand()
    output = 100 + math.floor(rand() * 400) if r < 0.97 else 3000 + math.floor(rand() * 9000)
    reqs.append((inp, output))


def cost(i, o):
    return (i * IN + o * OUT) / 1e6


def stats(cap):
    cs = sorted(cost(i, min(o, cap)) for i, o in reqs)

    def at(p):
        return cs[math.ceil(p / 100 * len(cs)) - 1]
    total = 0
    for c in cs:
        total += c
    return {"mean": total / len(cs), "p50": at(50), "p99": at(99), "max": cs[-1]}


print("part 1: cost per request over 1000 requests")
for cap in (16000, 1000):
    s = stats(cap)
    bound = cost(6000, cap)
    print(f"  max_tokens {cap:>5}: mean \${s['mean']:.4f}  p50 \${s['p50']:.4f}  p99 \${s['p99']:.4f}  max \${s['max']:.4f}  bound \${bound:.4f}")
print("  bound = max input x input price + max_tokens x output price")
print(f"  1M requests/month at the 1000-token bound can never exceed \${cost(6000, 1000) * 1e6:.0f}")

print("part 2: reserved capacity at $40/hour vs pay per token")
RESERVED_PER_MONTH = 40 * 24 * 30  # $28800, billed whether used or not
per_req = stats(1000)["mean"]
for millions in (0.5, 1, 2, 4):
    on_demand = millions * 1e6 * per_req
    cheaper = "pay per token" if on_demand < RESERVED_PER_MONTH else "reserved"
    print(f"  {str(millions):>3}M requests/month: per token \${f'{on_demand:.0f}':>6}  reserved \${RESERVED_PER_MONTH}  cheaper: {cheaper}")
print(f"  break-even at {RESERVED_PER_MONTH / per_req / 1e6:.2f}M requests/month (if the reserved units can carry that load)")` },
        ],
      },
    ],
  },
  {
    title: `What is semantic caching and when is it safe to use?`,
    difficulty: "hard",
    seoDescription: `Semantic caching returns a stored LLM answer for similar queries. Learn why similar is not the same, and the scope, TTL and guard rails that make it safe.`,
    description: `**Question presented to candidate:**
"Half the questions our support bot gets are the same twenty questions in different words. Someone proposed a semantic cache: if a new question is close enough to one we have answered, return the stored answer and skip the model. What is a semantic cache, how does it work, and when would it be dangerous to turn on?"

**What a strong answer should cover:**
- Mechanism: embed the incoming query, nearest-neighbour search over embeddings of past queries, return the stored answer if similarity clears a threshold, otherwise call the model and store the result; layered after an exact-match cache
- How it differs from provider prompt caching: prompt caching reuses the processed prompt prefix and still generates a fresh answer; a semantic cache skips the model and returns an old answer, so it can be wrong
- The core risk: embeddings measure topic, not intent or exact values, so "cancel my order" versus "can I cancel an order?" or "convert 100 USD" versus "convert 250 USD" can score as near-identical and get the wrong answer; no single threshold separates every bad pair from every good one
- Safety rails: scope keys (tenant, user or personalisation, prompt version, model, locale), TTLs tied to how fast the content changes, bypass for transactional, personalised or tool-using requests, entity or value checks, and invalidation when source documents change
- Choosing the threshold from labelled pairs (served, wrong, missed) and monitoring the wrong-hit rate in production, not only the hit rate
- When it fits: high-volume, repetitive, informational, non-personalised traffic; when it does not: anything with account state, actions, numbers, fast-changing facts or per-user context

**Clarifying questions expected:**
- Are answers the same for every user, or do they depend on account, plan, locale or permissions?
- How often does the underlying content (policies, prices, docs) change?
- What does a wrong cached answer cost compared with a model call?

**Code / implementation expected:** Optional — the lookup flow (embed, search within scope, threshold, guards, store) in pseudocode, and how the threshold is chosen, is enough.`,
    answer: `**Target Audience:** Engineers with repetitive LLM traffic (support bots, FAQ assistants, internal help desks) who have been told a semantic cache will halve the bill, and want to know when that is true and when it serves wrong answers.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (a semantic cache with safety rails, and a threshold sweep on labelled pairs). The embedding in both examples is a **toy stand-in** (words mapped to concepts) so the similarity numbers are explainable; real embedding models give different numbers but fail in the same ways. Library and paper details are cited inline, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A new receptionist at a clinic gets the same questions all day. After a week she stops looking things up: "What are your opening hours?", "When do you open?", "Are you open in the morning?" all get "8 to 6, Monday to Friday". That is a huge time saver, and it is exactly what a good cache does.

Then someone asks "When do you open on Sunday?" and she says "8 to 6" without thinking. Someone says "Cancel my appointment" and she replies with the cancellation *policy* instead of cancelling it. Someone asks "How much is the 250 test?" and she quotes the price of the 100 test, because the question *sounded* the same.

A semantic cache is that receptionist. It answers new questions with old answers when they sound alike. The whole engineering problem is that "sounds alike" and "has the same answer" are different things, and the cases where they differ are the ones users notice.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the answer the same for every user? | Anything that depends on account, plan, permissions or history cannot be shared across users. |
| How often does the source content change? | Sets the TTL and whether you need invalidation when a document changes. |
| What does a wrong cached answer cost? | A wrong store-hours answer is mild; a wrong refund amount or medical answer is not. |
| What share of traffic is repetitive, and how repetitive? | Decides whether the hit rate can pay for the embedding call and the risk. |
| Do requests trigger tools or actions? | Actions must never be answered from a cache. |

## 3. How a Semantic Cache Works

📌 **Interview term: exact-match cache** — a cache keyed by the exact request text (or a hash of the full prompt). It only hits on byte-identical requests, so it is safe but rarely hits for natural language.

📌 **Interview term: semantic cache** — a cache keyed by *meaning*: the incoming query is turned into an embedding, the nearest stored query embedding is found, and if the similarity clears a threshold the stored answer is returned without calling the model. On a miss, the model is called and the new query, embedding and answer are stored.

📌 **Interview term: similarity threshold** — the minimum similarity (or maximum distance) for a stored entry to count as a hit. Libraries often express it as a *distance*: RedisVL documents a \`distance_threshold\` defaulting to 0.1 in cosine-distance units on a 0 to 2 scale, where lower is stricter (RedisVL SemanticCache API docs). A cosine distance of 0.1 is a cosine similarity of 0.9.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 300" role="img" aria-label="Semantic cache flow: a query is embedded, searched within its scope, compared to the threshold, then either returns the stored answer or calls the model and stores the new answer">
  <defs>
    <marker id="ai10q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="110" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="142" text-anchor="middle">query</text>
  <text class="d-sub" x="80" y="164" text-anchor="middle">plus scope</text>
  <rect class="d-box" x="190" y="110" width="130" height="70" rx="10"/>
  <text class="d-text" x="255" y="142" text-anchor="middle">embed</text>
  <text class="d-sub" x="255" y="164" text-anchor="middle">one vector</text>
  <rect class="d-box" x="370" y="110" width="150" height="70" rx="10"/>
  <text class="d-text" x="445" y="142" text-anchor="middle">nearest entry</text>
  <text class="d-sub" x="445" y="164" text-anchor="middle">same scope only</text>
  <rect class="d-box-accent" x="600" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="700" y="62" text-anchor="middle">hit</text>
  <text class="d-sub" x="700" y="84" text-anchor="middle">return stored answer</text>
  <rect class="d-box" x="600" y="190" width="200" height="70" rx="10"/>
  <text class="d-text" x="700" y="222" text-anchor="middle">miss</text>
  <text class="d-sub" x="700" y="244" text-anchor="middle">call model, store</text>
  <path class="d-edge" d="M 144 145 L 184 145" marker-end="url(#ai10q5-arrow)"/>
  <path class="d-edge" d="M 324 145 L 364 145" marker-end="url(#ai10q5-arrow)"/>
  <path class="d-edge-accent" d="M 524 130 L 594 75" marker-end="url(#ai10q5-arrow)"/>
  <path class="d-edge" d="M 524 160 L 594 215" marker-end="url(#ai10q5-arrow)"/>
  <text class="d-sub" x="540" y="88" text-anchor="middle">above</text>
  <text class="d-sub" x="540" y="214" text-anchor="middle">below</text>
</svg>

The order of checks matters: scope first (only entries that are allowed to answer this user), then similarity, then guards; anything uncertain falls through to the model.

Off-the-shelf implementations exist: Zilliz's open-source GPTCache library embeds queries, searches a vector store and applies a pluggable similarity evaluation; RedisVL ships a \`SemanticCache\` with \`distance_threshold\`, \`ttl\` and \`filterable_fields\` for scoping (GPTCache repository; RedisVL docs). Under the hood they are the flow above plus a [vector store](/interview-question/what-is-a-vector-database-and-when-do-you-actually-need-one) and an [embedding model](/interview-question/what-are-embeddings-and-what-are-they-used-for).

## 4. Not the Same Thing as Prompt Caching

This is the follow-up interviewers ask most often.

| | Provider prompt caching | Semantic cache |
| :--- | :--- | :--- |
| What is reused | The processed state of an identical prompt **prefix** | A previous **answer** |
| Match rule | Exact prefix, byte for byte | Similar meaning, above a threshold |
| Does the model still run? | Yes, it generates a fresh answer | No, the model is skipped |
| Can it return a wrong answer? | No, the output is computed for this request | Yes, if the old answer does not fit the new question |
| Saves | Input cost and prefill latency | The whole call: input, output and latency |
| Who runs it | The provider | You |

Prompt caching is a pure optimisation; a semantic cache is a **product decision**, because it changes what users are told. See [What is prompt caching and how does it reduce cost and latency?](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency)

## 5. Why It Goes Wrong: Similar Is Not the Same

An embedding is built to capture what a text is *about*. That is why paraphrases match. It is also why two requests about the same topic with different intent, different values or different conditions can land almost on top of each other.

📌 **Interview term: false hit (false positive)** — a cache hit where the stored answer is wrong for the new query. It is silent: the user gets a fluent, confident, wrong answer and the logs show a successful hit.

📌 **Interview term: missed hit (false negative)** — a query that should have been served from cache but scored below the threshold. It only costs money and latency, never correctness.

The second example, **"Threshold sweep on labelled query pairs"**, scores twelve pairs that a human labelled as "same answer" or "different answer":

~~~text
similarity per labelled pair:
  0.919  same  "password reset steps"
  0.947  same  "forgot password how to reset"
  0.978  same  "reset my password"
  1.000  same  "refund policy"
  0.894  same  "Convert 100 USD to EUR please"
  1.000  same  "can I cancel my order"
  0.799  same  "what time does the store open"
  0.978  DIFF  "cancel my order"
  1.000  DIFF  "Convert 250 USD to EUR"
  0.822  DIFF  "When does the store open on Sunday?"
  0.816  DIFF  "refund policy for electronics"
  0.000  DIFF  "delete my account"
~~~

Read the two 1.000 lines and the 0.978 lines together. "Convert 250 USD to EUR" scores a perfect 1.000 against "Convert 100 USD to EUR" because the toy embedding, like real ones, treats numbers as "some number". "cancel my order" (an action) scores 0.978 against "Can I cancel an order?" (a policy question), higher than the genuine paraphrase "password reset steps" at 0.919. Practitioner write-ups report the same pattern with real embedding models, for example currency conversions with different amounts scoring around 0.99; that is a secondary-source observation, not something this run checked.

📌 **Interview term: intent mismatch** — two queries about the same topic that want different things (do it versus explain it, my account versus the policy). Embeddings are weak at this distinction.

The consequence is the most important sentence on this page: **when a wrong pair scores higher than a right pair, no threshold can separate them.** Raising the threshold only trades missed hits for fewer false hits; it does not remove the false hits that score 1.000.

## 6. Picking a Threshold from Data

The same example sweeps the threshold, naive (similarity only) and guarded (with the rails from section 7):

~~~text
threshold  mode     served  correct  WRONG  missed-good
  0.80     naive      10       6      4       1
  0.80     guarded     7       5      2       2
  0.85     naive       8       6      2       1
  0.85     guarded     5       5      0       2
  0.90     naive       7       5      2       2
  0.90     guarded     4       4      0       3
  0.95     naive       5       3      2       4
  0.95     guarded     2       2      0       5
  0.99     naive       3       2      1       5
  0.99     guarded     1       1      0       6
~~~

Naive, there is no threshold with zero wrong answers: even at 0.99 the USD pair still gets through. With guards, 0.85 serves 5 of the 7 good pairs and none of the bad ones. On real data the numbers differ but the method is the same: collect pairs from your own traffic (each new query with its nearest cached query), label whether the cached answer is correct, then pick the threshold whose **wrong-hit rate** you can live with, per feature. Academic work does the same; the MeanCache paper (arXiv 2403.02694) picks its cosine threshold by F-score on validation data and notes that a low threshold produces false hits while a high one misses valid matches.

📌 **Interview term: wrong-hit rate** — false hits divided by all hits served. It is the metric that decides whether the cache is safe, and it must be monitored in production by sampling hits and grading them, because false hits do not raise errors.

## 7. The Rails That Make It Safe

The first example, **"Semantic cache with scope keys, TTL and guards"**, runs seven lookups through a naive cache and a guarded one (threshold 0.90). The guarded version adds four rails:

📌 **Interview term: scope key (cache partition)** — the fields an entry must match exactly before similarity is even computed: tenant, user or personalisation level, prompt version, model, locale. It stops one customer's answer reaching another, and stops answers from an old prompt or model surviving a deploy. In a vector store this is a metadata filter; see [How do you scope retrieval with metadata filtering and multi-tenancy?](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy)

~~~text
"password reset steps"  [globex prompt-v3]
  naive   HIT    sim 0.919 to "How do I reset my password?" -> "Settings > Security > Reset password."
  guarded MISS   no entry in this scope
~~~

📌 **Interview term: TTL (time to live)** — how long an entry may be served. Set it from how fast the underlying content changes, and also invalidate entries when a source document changes, instead of waiting for expiry.

📌 **Interview term: bypass rule** — requests that must always go to the model: actions and tool calls, anything personalised or account-specific, anything that depends on live data. In the example a simple rule (an action verb plus "my", or an imperative) stands in for what would be an intent classifier in production.

~~~text
"cancel my order"  [acme prompt-v3]
  naive   HIT    sim 0.978 to "Can I cancel an order?" -> "Orders can be cancelled within 1 hour."
  guarded BYPASS transactional, always call the model
~~~

📌 **Interview term: entity (exact-value) guard** — after a similarity hit, compare the details embeddings blur: numbers, amounts, dates, product names, plan names. If they differ, treat it as a miss.

~~~text
"Convert 250 USD to EUR"  [acme prompt-v3]
  naive   HIT    sim 1.000 to "Convert 100 USD to EUR" -> "100 USD is about 92 EUR."
  guarded MISS   sim 1.000 but numbers differ
~~~

Further rails that the example does not model: store answers only from responses that passed your output checks; never cache answers that were built from per-user retrieved context; log every hit with the matched entry and similarity so a bad answer can be traced and the entry deleted; and give users a way to ask again without the cache (a "regenerate" button that bypasses it).

## 8. Verified: Running the Code

Both programs run in memory with no model or embedding API. The toy \`embed()\` maps words to concept dimensions with weights (for example "reset" and "forgot" share a dimension, any number maps to one "NUM" dimension), which reproduces the two properties that matter, topic matching and blurred exact values, while staying readable. A real system would use an embedding model and a vector index; what the toy leaves out is the much richer, less predictable geometry of real embeddings.

**"Semantic cache with scope keys, TTL and guards"** — \`node a.js\` and \`python3.12 a.py\` both print exactly:

~~~text
"password reset steps"  [acme prompt-v3]
  naive   HIT    sim 0.919 to "How do I reset my password?" -> "Settings > Security > Reset password."
  guarded HIT    sim 0.919 to "How do I reset my password?" -> "Settings > Security > Reset password."
"password reset steps"  [globex prompt-v3]
  naive   HIT    sim 0.919 to "How do I reset my password?" -> "Settings > Security > Reset password."
  guarded MISS   no entry in this scope
"password reset steps"  [acme prompt-v4]
  naive   HIT    sim 0.919 to "How do I reset my password?" -> "Settings > Security > Reset password."
  guarded MISS   no entry in this scope
"cancel my order"  [acme prompt-v3]
  naive   HIT    sim 0.978 to "Can I cancel an order?" -> "Orders can be cancelled within 1 hour."
  guarded BYPASS transactional, always call the model
"Convert 250 USD to EUR"  [acme prompt-v3]
  naive   HIT    sim 1.000 to "Convert 100 USD to EUR" -> "100 USD is about 92 EUR."
  guarded MISS   sim 1.000 but numbers differ
"When does the store open on Sunday?"  [acme prompt-v3]
  naive   MISS   best 0.822 < 0.9
  guarded MISS   best 0.822 < 0.9
"What is your refund policy?"  [acme prompt-v3, 25h later]
  naive   HIT    sim 1.000 to "What is your refund policy?" -> "Refunds within 30 days."
  guarded MISS   entries in scope are past the 24h TTL
~~~

**"Threshold sweep on labelled query pairs"** — \`node b.js\` and \`python3.12 b.py\` both print exactly:

~~~text
similarity per labelled pair:
  0.919  same  "password reset steps"
  0.947  same  "forgot password how to reset"
  0.978  same  "reset my password"
  1.000  same  "refund policy"
  0.894  same  "Convert 100 USD to EUR please"
  1.000  same  "can I cancel my order"
  0.799  same  "what time does the store open"
  0.978  DIFF  "cancel my order"
  1.000  DIFF  "Convert 250 USD to EUR"
  0.822  DIFF  "When does the store open on Sunday?"
  0.816  DIFF  "refund policy for electronics"
  0.000  DIFF  "delete my account"

threshold  mode     served  correct  WRONG  missed-good
  0.80     naive      10       6      4       1
  0.80     guarded     7       5      2       2
  0.85     naive       8       6      2       1
  0.85     guarded     5       5      0       2
  0.90     naive       7       5      2       2
  0.90     guarded     4       4      0       3
  0.95     naive       5       3      2       4
  0.95     guarded     2       2      0       5
  0.99     naive       3       2      1       5
  0.99     guarded     1       1      0       6
~~~

What the runs show:

- A true paraphrase ("password reset steps", 0.919) was served correctly by both caches inside its scope.
- The naive cache served another tenant, an outdated prompt version, an expired entry, an action request and a different amount; the guarded cache served none of them.
- A wrong pair (0.978) outscored a right pair (0.919), so the threshold alone could not separate them; guards plus a 0.85 threshold served 5 of 7 good pairs with no wrong answers on this labelled set.

## 9. When to Use It, and When Not

| Good fit | Poor fit |
| :--- | :--- |
| FAQ-style, informational questions | Account-specific or personalised answers |
| Same answer for every user in a scope | Actions, tool calls, writes |
| Content that changes slowly | Prices, stock, schedules, anything live |
| High repetition in real traffic | Long, unique, multi-turn conversations |
| A wrong answer is cheap and recoverable | Medical, legal, financial or safety answers |

Two practical notes on the economics. A semantic cache adds an embedding call and a vector search to *every* request, hits and misses alike, so it only pays when the hit rate is meaningful. And in multi-turn chat the "query" is really the whole conversation; caching on the last message alone ignores context, which is why semantic caches work best on single-turn entry points. Cost context for where this lever sits among the others is in [How do you estimate and control LLM costs in production?](/interview-question/how-do-you-estimate-and-control-llm-costs-in-production)

## Common Pitfalls

- **Confusing it with prompt caching.** One reuses computation and still answers fresh; the other reuses an answer and can be wrong.
- **Tuning only for hit rate.** A higher hit rate from a lower threshold is usually more false hits; track the wrong-hit rate by sampling and grading hits.
- **One global cache.** Without scope keys, one tenant's or user's answer leaks to another, and answers from an old prompt or model outlive the deploy.
- **Caching actions.** "Cancel my order" answered with the cancellation policy is a correctness bug, not a cache hit.
- **Trusting similarity on values.** Numbers, dates and product names are exactly what embeddings blur; check them explicitly.
- **No invalidation.** A policy change with a 24-hour TTL means a day of confidently wrong answers; invalidate entries when their source changes.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A semantic cache embeds each incoming query, finds the nearest stored query, and if the similarity clears a threshold returns that stored answer without calling the model. On a miss it calls the model and stores the result. It sits after an exact-match cache, which is free and safe.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Not prompt caching:</strong> <span style="color:#f0e2c8;">Provider prompt caching reuses the processed prompt prefix and still generates a fresh answer, so it cannot be wrong. A semantic cache skips the model and returns an <strong style="color:#ffca28;">old answer</strong>, so it saves the whole call but can serve an answer meant for a different question. That makes it a product decision.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The core risk:</strong> <span style="color:#f0e2c8;">Embeddings capture topic, not intent or exact values. In my demo "cancel my order" scored 0.978 against the policy question "Can I cancel an order?", higher than a real paraphrase at 0.919, and "convert 250 USD" scored 1.000 against "convert 100 USD". When a wrong pair outscores a right one, <strong style="color:#ffca28;">no threshold</strong> can separate them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The rails:</strong> <span style="color:#f0e2c8;">So it runs behind rails: <strong style="color:#ffca28;">scope keys</strong> for tenant, personalisation, prompt version, model and locale; <strong style="color:#ffca28;">TTLs</strong> plus invalidation when source content changes; <strong style="color:#ffca28;">bypass</strong> for actions, tools and account-specific questions; and an <strong style="color:#ffca28;">exact-value guard</strong> on numbers, dates and product names. On my labelled set, guards plus a 0.85 threshold served 5 of 7 good pairs and no wrong ones.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How I would ship it:</strong> <span style="color:#f0e2c8;">Only on repetitive, informational, same-for-everyone traffic. Threshold chosen from labelled pairs out of our own logs, per feature. In production I track the <strong style="color:#ffca28;">wrong-hit rate</strong> by sampling and grading hits, not just the hit rate, log the matched entry for every hit, and give users a regenerate path that bypasses the cache.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pick the similarity threshold?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From data. Take real queries with their nearest cached query, label whether the cached answer is correct, then sweep thresholds and count served, wrong and missed. Pick the one whose wrong-hit rate is acceptable for that feature. Library defaults, such as RedisVL with a cosine distance of 0.1, which is similarity 0.9, are starting points, not answers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just raise the threshold to 0.99?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because some wrong pairs score 1.000: numbers and intent are what embeddings blur. In my sweep the naive cache still served a wrong currency answer at 0.99 while missing five good pairs. Higher thresholds cut hit rate faster than they cut wrong hits; guards on values and intent do the real work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use a semantic cache in multi-turn chat?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Carefully. The real query is the whole conversation, not the last message, so caching on the last message ignores context. It works best on single-turn entry points like the first question in a help widget, or with the scope key including a hash of the relevant context.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What belongs in the cache key scope?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Everything that can change the correct answer: tenant, user or personalisation level, permissions, prompt version, model, locale, and the version of the source documents. Entries must match those exactly before similarity is computed, which in a vector store is a metadata filter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep cached answers fresh?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A TTL tied to how fast the content changes, plus event-based invalidation: when a policy page or price list changes, delete the entries built from it, which means storing source document IDs with each entry. A prompt or model version bump is a new scope, so old answers stop matching automatically.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Exact-match cache | Cache keyed by the exact request text; safe but rarely hits |
| Semantic cache | Cache keyed by embedding similarity that returns a stored answer and skips the model |
| Similarity threshold | Minimum similarity (or maximum distance) for an entry to count as a hit |
| False hit (false positive) | A hit whose stored answer is wrong for the new query |
| Missed hit (false negative) | A query that could have been served from cache but was not |
| Intent mismatch | Same topic, different goal (do it versus explain it) |
| Wrong-hit rate | False hits divided by all hits served |
| Scope key (cache partition) | Fields that must match exactly before similarity is computed |
| TTL (time to live) | How long an entry may be served |
| Bypass rule | Requests that always go to the model |
| Entity (exact-value) guard | Rejecting a hit when numbers, dates or names differ |

**Conclusion:** A semantic cache embeds each query, finds the nearest stored query and returns its answer when the similarity clears a threshold, skipping the model entirely. That makes it far more powerful than provider prompt caching and far more dangerous, because it can return an answer computed for a different question. Embeddings match topic, not intent or exact values, so a wrong pair can score higher than a right one and no threshold can fix that alone. It is safe when the traffic is repetitive, informational and the same for everyone in a scope, and when it runs behind scope keys, TTLs and invalidation, bypass rules for actions and personal data, and value guards, with a threshold chosen from labelled pairs and a wrong-hit rate monitored in production. In the run, the naive cache served five wrong or leaked answers out of seven lookups; the guarded one served none.`,
    examples: [
      {
        label: `Semantic cache with scope keys, TTL and guards`,
        variants: [
          { tech: "node", code: `// A semantic cache with the rails that make it safe: scope keys, TTL,
// a bypass for transactional requests and an exact-value guard.
// embed() is a toy stand-in for an embedding model: it maps words to
// concepts, so it captures what a text is about and blurs exact values.
const LEX = {
  password: ["password", 1], reset: ["reset", 1], forgot: ["reset", 1], steps: ["procedure", 1],
  how: ["procedure", 0.3], can: ["ability", 0.3], cancel: ["cancel", 1], order: ["order", 1],
  refund: ["refund", 1], policy: ["policy", 1], convert: ["convert", 1], usd: ["usd", 1],
  eur: ["eur", 1], store: ["store", 1], open: ["open", 1], when: ["time", 0.3],
};
const STOP = new Set(["do", "i", "my", "to", "is", "your", "the", "a", "an", "what", "does", "on"]);
const words = (q) => q.toLowerCase().replace(/[?.!,]/g, "").split(" ").filter(Boolean);
function embed(q) {
  const v = {};
  for (const w of words(q)) {
    if (STOP.has(w)) continue;
    const [dim, wt] = /^\\d+$/.test(w) ? ["NUM", 1] : LEX[w] || ["w:" + w, 1];
    v[dim] = (v[dim] || 0) + wt;
  }
  return v;
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const k of Object.keys(a).sort()) { na += a[k] * a[k]; if (k in b) dot += a[k] * b[k]; }
  for (const k of Object.keys(b).sort()) nb += b[k] * b[k];
  return dot / Math.sqrt(na * nb);
}
const numbers = (q) => words(q).filter((w) => /^\\d+$/.test(w)).join(",");
const ACTIONS = new Set(["cancel", "delete", "change"]);
const isTransactional = (q) => { const ws = words(q); return ws.some((w) => ACTIONS.has(w)) && (ws.includes("my") || ACTIONS.has(ws[0])); };

const THRESHOLD = 0.9, TTL = 24 * 3600; // seconds
const cache = [];
function put(query, answer, scope, t) { cache.push({ query, vec: embed(query), answer, scope, t }); }
function lookup(query, scope, t, guarded) {
  if (guarded && isTransactional(query)) return { kind: "BYPASS", why: "transactional, always call the model" };
  const v = embed(query);
  let best = null, bestSim = -1, expired = false;
  for (const e of cache) {
    if (guarded && e.scope !== scope) continue;
    if (guarded && t - e.t > TTL) { expired = true; continue; }
    const sim = cosine(v, e.vec);
    if (sim > bestSim) { best = e; bestSim = sim; }
  }
  if (!best || bestSim < THRESHOLD) return { kind: "MISS", why: best ? \`best \${bestSim.toFixed(3)} < \${THRESHOLD}\` : expired ? "entries in scope are past the 24h TTL" : "no entry in this scope" };
  if (guarded && numbers(query) !== numbers(best.query)) return { kind: "MISS", why: \`sim \${bestSim.toFixed(3)} but numbers differ\` };
  return { kind: "HIT", why: \`sim \${bestSim.toFixed(3)} to "\${best.query}"\`, answer: best.answer };
}

const S = "acme|prompt-v3|model-a"; // scope: tenant | prompt version | model
put("How do I reset my password?", "Settings > Security > Reset password.", S, 0);
put("Can I cancel an order?", "Orders can be cancelled within 1 hour.", S, 0);
put("Convert 100 USD to EUR", "100 USD is about 92 EUR.", S, 0);
put("What is your refund policy?", "Refunds within 30 days.", S, 0);
put("When does the store open?", "9am every day.", S, 0);

const probes = [
  ["password reset steps", S, 60],
  ["password reset steps", "globex|prompt-v3|model-a", 60],
  ["password reset steps", "acme|prompt-v4|model-a", 60],
  ["cancel my order", S, 60],
  ["Convert 250 USD to EUR", S, 60],
  ["When does the store open on Sunday?", S, 60],
  ["What is your refund policy?", S, 25 * 3600],
];
for (const [q, scope, t] of probes) {
  console.log(\`"\${q}"  [\${scope.split("|").slice(0, 2).join(" ")}\${t > TTL ? ", 25h later" : ""}]\`);
  for (const guarded of [false, true]) {
    const r = lookup(q, scope, t, guarded);
    const ans = r.answer ? \` -> "\${r.answer}"\` : "";
    console.log(\`  \${guarded ? "guarded" : "naive  "} \${r.kind.padEnd(6)} \${r.why}\${ans}\`);
  }
}` },
          { tech: "python", code: `# A semantic cache with the rails that make it safe: scope keys, TTL,
# a bypass for transactional requests and an exact-value guard.
# embed() is a toy stand-in for an embedding model: it maps words to
# concepts, so it captures what a text is about and blurs exact values.
import math
import re

LEX = {
    "password": ("password", 1), "reset": ("reset", 1), "forgot": ("reset", 1), "steps": ("procedure", 1),
    "how": ("procedure", 0.3), "can": ("ability", 0.3), "cancel": ("cancel", 1), "order": ("order", 1),
    "refund": ("refund", 1), "policy": ("policy", 1), "convert": ("convert", 1), "usd": ("usd", 1),
    "eur": ("eur", 1), "store": ("store", 1), "open": ("open", 1), "when": ("time", 0.3),
}
STOP = {"do", "i", "my", "to", "is", "your", "the", "a", "an", "what", "does", "on"}


def words(q):
    return [w for w in re.sub(r"[?.!,]", "", q.lower()).split(" ") if w]


def embed(q):
    v = {}
    for w in words(q):
        if w in STOP:
            continue
        dim, wt = ("NUM", 1) if w.isdigit() else LEX.get(w, ("w:" + w, 1))
        v[dim] = v.get(dim, 0) + wt
    return v


def cosine(a, b):
    dot = na = nb = 0
    for k in sorted(a):
        na += a[k] * a[k]
        if k in b:
            dot += a[k] * b[k]
    for k in sorted(b):
        nb += b[k] * b[k]
    return dot / math.sqrt(na * nb)


def numbers(q):
    return ",".join(w for w in words(q) if w.isdigit())


ACTIONS = {"cancel", "delete", "change"}


def is_transactional(q):
    ws = words(q)
    return any(w in ACTIONS for w in ws) and ("my" in ws or ws[0] in ACTIONS)


THRESHOLD, TTL = 0.9, 24 * 3600  # seconds
cache = []


def put(query, answer, scope, t):
    cache.append({"query": query, "vec": embed(query), "answer": answer, "scope": scope, "t": t})


def lookup(query, scope, t, guarded):
    if guarded and is_transactional(query):
        return {"kind": "BYPASS", "why": "transactional, always call the model"}
    v = embed(query)
    best, best_sim, expired = None, -1, False
    for e in cache:
        if guarded and e["scope"] != scope:
            continue
        if guarded and t - e["t"] > TTL:
            expired = True
            continue
        sim = cosine(v, e["vec"])
        if sim > best_sim:
            best, best_sim = e, sim
    if not best or best_sim < THRESHOLD:
        if best:
            why = f"best {best_sim:.3f} < {THRESHOLD}"
        else:
            why = "entries in scope are past the 24h TTL" if expired else "no entry in this scope"
        return {"kind": "MISS", "why": why}
    if guarded and numbers(query) != numbers(best["query"]):
        return {"kind": "MISS", "why": f"sim {best_sim:.3f} but numbers differ"}
    return {"kind": "HIT", "why": f'sim {best_sim:.3f} to "{best["query"]}"', "answer": best["answer"]}


S = "acme|prompt-v3|model-a"  # scope: tenant | prompt version | model
put("How do I reset my password?", "Settings > Security > Reset password.", S, 0)
put("Can I cancel an order?", "Orders can be cancelled within 1 hour.", S, 0)
put("Convert 100 USD to EUR", "100 USD is about 92 EUR.", S, 0)
put("What is your refund policy?", "Refunds within 30 days.", S, 0)
put("When does the store open?", "9am every day.", S, 0)

probes = [
    ("password reset steps", S, 60),
    ("password reset steps", "globex|prompt-v3|model-a", 60),
    ("password reset steps", "acme|prompt-v4|model-a", 60),
    ("cancel my order", S, 60),
    ("Convert 250 USD to EUR", S, 60),
    ("When does the store open on Sunday?", S, 60),
    ("What is your refund policy?", S, 25 * 3600),
]
for q, scope, t in probes:
    later = ", 25h later" if t > TTL else ""
    print(f'"{q}"  [{" ".join(scope.split("|")[:2])}{later}]')
    for guarded in (False, True):
        r = lookup(q, scope, t, guarded)
        ans = f' -> "{r["answer"]}"' if r.get("answer") else ""
        label = "guarded" if guarded else "naive  "
        print(f"  {label} {r['kind']:<6} {r['why']}{ans}")` },
        ],
      },
      {
        label: `Threshold sweep on labelled query pairs`,
        variants: [
          { tech: "node", code: `// Pick the threshold from labelled data, not from a blog post.
// Each pair: a new query, the cached query it is nearest to, and whether the
// cached answer is actually correct for the new query (labelled by a human).
const LEX = {
  password: ["password", 1], reset: ["reset", 1], forgot: ["reset", 1], steps: ["procedure", 1],
  how: ["procedure", 0.3], can: ["ability", 0.3], cancel: ["cancel", 1], order: ["order", 1],
  refund: ["refund", 1], policy: ["policy", 1], convert: ["convert", 1], usd: ["usd", 1],
  eur: ["eur", 1], store: ["store", 1], open: ["open", 1], when: ["time", 0.3],
};
const STOP = new Set(["do", "i", "my", "to", "is", "your", "the", "a", "an", "what", "does", "on", "for"]);
const words = (q) => q.toLowerCase().replace(/[?.!,]/g, "").split(" ").filter(Boolean);
function embed(q) {
  const v = {};
  for (const w of words(q)) {
    if (STOP.has(w)) continue;
    const [dim, wt] = /^\\d+$/.test(w) ? ["NUM", 1] : LEX[w] || ["w:" + w, 1];
    v[dim] = (v[dim] || 0) + wt;
  }
  return v;
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const k of Object.keys(a).sort()) { na += a[k] * a[k]; if (k in b) dot += a[k] * b[k]; }
  for (const k of Object.keys(b).sort()) nb += b[k] * b[k];
  return dot / Math.sqrt(na * nb);
}
const numbers = (q) => words(q).filter((w) => /^\\d+$/.test(w)).join(",");
const ACTIONS = new Set(["cancel", "delete", "change"]);
const isTransactional = (q) => { const ws = words(q); return ws.some((w) => ACTIONS.has(w)) && (ws.includes("my") || ACTIONS.has(ws[0])); };

const pairs = [
  ["password reset steps", "How do I reset my password?", true],
  ["forgot password how to reset", "How do I reset my password?", true],
  ["reset my password", "How do I reset my password?", true],
  ["refund policy", "What is your refund policy?", true],
  ["Convert 100 USD to EUR please", "Convert 100 USD to EUR", true],
  ["can I cancel my order", "Can I cancel an order?", true],
  ["what time does the store open", "When does the store open?", true],
  ["cancel my order", "Can I cancel an order?", false],
  ["Convert 250 USD to EUR", "Convert 100 USD to EUR", false],
  ["When does the store open on Sunday?", "When does the store open?", false],
  ["refund policy for electronics", "What is your refund policy?", false],
  ["delete my account", "How do I reset my password?", false],
];
console.log("similarity per labelled pair:");
for (const [q, c, ok] of pairs) console.log(\`  \${cosine(embed(q), embed(c)).toFixed(3)}  \${ok ? "same " : "DIFF "} "\${q}"\`);
console.log("");
console.log("threshold  mode     served  correct  WRONG  missed-good");
for (const th of [0.8, 0.85, 0.9, 0.95, 0.99]) {
  for (const guarded of [false, true]) {
    let served = 0, correct = 0, wrong = 0, missed = 0;
    for (const [q, c, ok] of pairs) {
      let hit = cosine(embed(q), embed(c)) >= th;
      if (guarded && (isTransactional(q) || numbers(q) !== numbers(c))) hit = false;
      if (hit) { served++; if (ok) correct++; else wrong++; } else if (ok) missed++;
    }
    console.log(\`  \${th.toFixed(2)}     \${(guarded ? "guarded" : "naive").padEnd(8)} \${String(served).padStart(4)}  \${String(correct).padStart(6)}  \${String(wrong).padStart(5)}  \${String(missed).padStart(6)}\`);
  }
}` },
          { tech: "python", code: `# Pick the threshold from labelled data, not from a blog post.
# Each pair: a new query, the cached query it is nearest to, and whether the
# cached answer is actually correct for the new query (labelled by a human).
import math
import re

LEX = {
    "password": ("password", 1), "reset": ("reset", 1), "forgot": ("reset", 1), "steps": ("procedure", 1),
    "how": ("procedure", 0.3), "can": ("ability", 0.3), "cancel": ("cancel", 1), "order": ("order", 1),
    "refund": ("refund", 1), "policy": ("policy", 1), "convert": ("convert", 1), "usd": ("usd", 1),
    "eur": ("eur", 1), "store": ("store", 1), "open": ("open", 1), "when": ("time", 0.3),
}
STOP = {"do", "i", "my", "to", "is", "your", "the", "a", "an", "what", "does", "on", "for"}


def words(q):
    return [w for w in re.sub(r"[?.!,]", "", q.lower()).split(" ") if w]


def embed(q):
    v = {}
    for w in words(q):
        if w in STOP:
            continue
        dim, wt = ("NUM", 1) if w.isdigit() else LEX.get(w, ("w:" + w, 1))
        v[dim] = v.get(dim, 0) + wt
    return v


def cosine(a, b):
    dot = na = nb = 0
    for k in sorted(a):
        na += a[k] * a[k]
        if k in b:
            dot += a[k] * b[k]
    for k in sorted(b):
        nb += b[k] * b[k]
    return dot / math.sqrt(na * nb)


def numbers(q):
    return ",".join(w for w in words(q) if w.isdigit())


ACTIONS = {"cancel", "delete", "change"}


def is_transactional(q):
    ws = words(q)
    return any(w in ACTIONS for w in ws) and ("my" in ws or ws[0] in ACTIONS)


pairs = [
    ("password reset steps", "How do I reset my password?", True),
    ("forgot password how to reset", "How do I reset my password?", True),
    ("reset my password", "How do I reset my password?", True),
    ("refund policy", "What is your refund policy?", True),
    ("Convert 100 USD to EUR please", "Convert 100 USD to EUR", True),
    ("can I cancel my order", "Can I cancel an order?", True),
    ("what time does the store open", "When does the store open?", True),
    ("cancel my order", "Can I cancel an order?", False),
    ("Convert 250 USD to EUR", "Convert 100 USD to EUR", False),
    ("When does the store open on Sunday?", "When does the store open?", False),
    ("refund policy for electronics", "What is your refund policy?", False),
    ("delete my account", "How do I reset my password?", False),
]
print("similarity per labelled pair:")
for q, c, ok in pairs:
    print(f'  {cosine(embed(q), embed(c)):.3f}  {"same " if ok else "DIFF "} "{q}"')
print("")
print("threshold  mode     served  correct  WRONG  missed-good")
for th in (0.8, 0.85, 0.9, 0.95, 0.99):
    for guarded in (False, True):
        served = correct = wrong = missed = 0
        for q, c, ok in pairs:
            hit = cosine(embed(q), embed(c)) >= th
            if guarded and (is_transactional(q) or numbers(q) != numbers(c)):
                hit = False
            if hit:
                served += 1
                if ok:
                    correct += 1
                else:
                    wrong += 1
            elif ok:
                missed += 1
        mode = "guarded" if guarded else "naive"
        print(f"  {th:.2f}     {mode:<8} {served:>4}  {correct:>6}  {wrong:>5}  {missed:>6}")` },
        ],
      },
    ],
  },
];

export default augments;
