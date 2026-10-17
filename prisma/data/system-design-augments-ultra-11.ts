/**
 * SYSTEM DESIGN ULTRA — batch 11: Rate limiting and IDs. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `What is the difference between throttling and rate limiting?`,
    difficulty: "medium",
    seoDescription: `Throttling vs rate limiting: reject with 429 and Retry-After, or queue and delay; where each runs, what the client sees, and how vendors use the words.`,
    description: `**Question presented to candidate:**
"People use 'throttling' and 'rate limiting' as if they were the same thing. If you had to tell them apart for your team, what would you say? What happens to a request over the limit in each case, and when would you choose one over the other?"

**What a strong answer should cover:**
- The useful distinction is **what happens to excess traffic**: a **rate limiter rejects** it (HTTP **429 Too Many Requests**, ideally with **Retry-After**), a **throttle delays or slows** it (queue, pace, degrade) so it still completes later
- Both enforce a rate; they differ in who carries the cost: rejection pushes the waiting to the **client** (retries), throttling pushes it onto the **server** (held requests, memory, added latency)
- A throttle still needs a **bound**: an unbounded queue only turns overload into timeouts, so a throttle rejects once its queue is full
- The same algorithm can do either: a token or leaky bucket can drop the excess or schedule it (nginx \`limit_req\` delays excess up to \`burst\` and rejects beyond it)
- The words are used loosely: AWS API Gateway calls its 429 rejections "throttling", so define your terms in the room
- Related ideas: **client-side throttling** (the caller paces itself), **backpressure**, **load shedding**

**Code / implementation expected:** Optional — the example runs the same burst through a rejecting limiter and a delaying throttle and compares what clients see.`,
    answer: `**Target Audience:** Developers preparing for system design or backend interviews. No prior knowledge of rate limiting assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A popular bakery can bake 4 loaves a minute. At opening time 10 people rush in.

- **Bakery A** has a bouncer. He lets 4 people in, and tells the other 6: "Full. Come back in one minute." They leave and return later. Nobody waits inside, but people get turned away and must try again.
- **Bakery B** has a queue with a rope. Everybody gets a ticket and waits in line; the counter serves one person every 15 seconds. Nobody is turned away (until the line is out of the door), but everybody waits, and the shop has to hold all those people inside.

Both bakeries serve exactly 4 loaves a minute. The difference is **what happens to the people over the limit**: rejected and told when to retry, or kept and served later. That is the whole difference between rate limiting and throttling.

📌 **Interview term: rate limiting** — enforcing a maximum number of requests per client (or key) per unit of time and **rejecting** the excess, usually with HTTP **429 Too Many Requests**. The status code is defined in RFC 6585, which says the response MAY include a \`Retry-After\` header saying how long to wait, and that 429 responses must not be stored by a cache (RFC 6585, section 4).

📌 **Interview term: throttling** — controlling the **pace** at which requests are processed by **delaying, queueing or degrading** them instead of rejecting them. The request still completes, just later or with less (lower quality video, smaller page size, slower upload bandwidth).

## 2. The Same Burst, Two Policies

The example sends 10 requests at once (plus 2 more at t = 3 s) to a server that can handle 4 per second, under each policy. First the **rate limiter** (fixed window, 4 per second; the client honours \`Retry-After\`):

~~~text
== rate limiter: 4 per 1 s window, excess gets 429, client retries after Retry-After
  r0  arrives    0  200 at 0
  r1  arrives    0  200 at 0
  r2  arrives    0  200 at 0
  r3  arrives    0  200 at 0
  r4  arrives    0  429 Retry-After 1s -> 200 at 1000
  r5  arrives    0  429 Retry-After 1s -> 200 at 1000
  r6  arrives    0  429 Retry-After 1s -> 200 at 1000
  r7  arrives    0  429 Retry-After 1s -> 200 at 1000
  r8  arrives    0  429 Retry-After 1s -> 429 Retry-After 1s -> 200 at 2000
  r9  arrives    0  429 Retry-After 1s -> 429 Retry-After 1s -> 200 at 2000
  r10 arrives 3000  200 at 3000
  r11 arrives 3000  200 at 3000
  429 responses sent: 8, worst wait seen by a client: 2000 ms
~~~

Then the **throttle** (a queue drained one request every 250 ms, with room for 8 waiting):

~~~text
== throttle: queue drained one request every 250 ms, room for 8 waiting
  r0  arrives    0  held    0 ms, 200 at 0
  r1  arrives    0  held  250 ms, 200 at 250
  r2  arrives    0  held  500 ms, 200 at 500
  r3  arrives    0  held  750 ms, 200 at 750
  r4  arrives    0  held 1000 ms, 200 at 1000
  r5  arrives    0  held 1250 ms, 200 at 1250
  r6  arrives    0  held 1500 ms, 200 at 1500
  r7  arrives    0  held 1750 ms, 200 at 1750
  r8  arrives    0  held 2000 ms, 200 at 2000
  r9  arrives    0  queue full -> 503
  r10 arrives 3000  held    0 ms, 200 at 3000
  r11 arrives 3000  held  250 ms, 200 at 3250
  rejections: 1, worst added latency: 2000 ms, most requests waiting in the queue at once: 8
~~~

What the run shows:

| | Rate limiter | Throttle |
| :--- | :--- | :--- |
| Over the limit | rejected with 429 + \`Retry-After\` | held in a queue and served later |
| Extra responses | 8 rejections, so 8 extra round trips | none (one 503 once the queue was full) |
| Who waits | the **client** (it sleeps and retries) | the **server** (it holds up to 8 open requests) |
| Worst delay in this run | 2000 ms (r8, r9 after two retries) | 2000 ms (r8 held in the queue) |
| Shape of load on the backend | bursts of 4 at each window start (0, 1000, 2000 ms) | a smooth 1 request per 250 ms |
| Depends on the client | yes — a client that ignores \`Retry-After\` keeps hammering | no — pacing is enforced server-side |
| Typical place | public API edge, per API key or IP | in front of a fragile dependency, a job queue, outbound calls |

📌 **Interview term: Retry-After** — an HTTP response header that tells the client when to try again, either as a number of seconds or as an HTTP date (RFC 9110). In the run every rejected client was told \`1s\`, which is exactly the time until the fixed window resets.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="A burst arrives at a rate limiter which passes four and returns 429 for the rest, and at a throttle which queues requests and releases them at a steady pace">
  <defs>
    <marker id="sd11q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="130" height="56" rx="10"/>
  <text class="d-text" x="85" y="55" text-anchor="middle">burst of 10</text>
  <text class="d-sub" x="85" y="75" text-anchor="middle">at t = 0</text>
  <rect class="d-box-accent" x="250" y="30" width="170" height="56" rx="10"/>
  <text class="d-text" x="335" y="55" text-anchor="middle">rate limiter</text>
  <text class="d-sub" x="335" y="75" text-anchor="middle">4 per second</text>
  <rect class="d-box" x="530" y="20" width="170" height="40" rx="8"/>
  <text class="d-text" x="615" y="45" text-anchor="middle">4 served now</text>
  <rect class="d-box-muted" x="530" y="76" width="170" height="40" rx="8"/>
  <text class="d-text" x="615" y="101" text-anchor="middle">6 get 429</text>
  <rect class="d-box-muted" x="20" y="160" width="130" height="56" rx="10"/>
  <text class="d-text" x="85" y="185" text-anchor="middle">burst of 10</text>
  <text class="d-sub" x="85" y="205" text-anchor="middle">at t = 0</text>
  <rect class="d-box-accent" x="250" y="160" width="170" height="56" rx="10"/>
  <text class="d-text" x="335" y="185" text-anchor="middle">throttle queue</text>
  <text class="d-sub" x="335" y="205" text-anchor="middle">room for 8</text>
  <rect class="d-box" x="530" y="168" width="170" height="40" rx="8"/>
  <text class="d-text" x="615" y="193" text-anchor="middle">1 every 250 ms</text>
  <path class="d-edge" d="M 150 58 L 244 58" marker-end="url(#sd11q1-arrow)"/>
  <path class="d-edge" d="M 420 50 L 524 40" marker-end="url(#sd11q1-arrow)"/>
  <path class="d-edge-dashed" d="M 420 66 L 524 96" marker-end="url(#sd11q1-arrow)"/>
  <path class="d-edge" d="M 150 188 L 244 188" marker-end="url(#sd11q1-arrow)"/>
  <path class="d-edge-accent" d="M 420 188 L 524 188" marker-end="url(#sd11q1-arrow)"/>
</svg>

The top path rejects and lets the client carry the wait; the bottom path keeps every request but holds it until a slot opens.

## 3. A Throttle Still Needs a Limit

A queue that can grow forever is not a fix, it is a slower failure: requests wait so long that the client times out, and the server has spent memory and connections on work nobody is waiting for any more. That is why the throttle in the run has room for only 8 waiting requests; r9 arrived to a full queue and got a 503 straight away. Real throttles always pair "delay" with "reject beyond this point".

nginx shows both behaviours in one directive. Its \`limit_req\` module (documented as a leaky bucket) **delays** excess requests until their number passes the \`burst\` size and only then **rejects** them; adding \`nodelay\` serves the burst immediately instead of pacing it, and the rejection status defaults to 503, changeable with \`limit_req_status\` (nginx \`ngx_http_limit_req_module\` documentation).

~~~nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=4r/s;
server {
    location /api/ {
        limit_req zone=api burst=8;      # throttle: queue up to 8, pace at 4 per second
        limit_req_status 429;            # beyond the burst: reject with 429 instead of 503
    }
}
~~~

This configuration is written from the nginx documentation and was not run here (no nginx in the sandbox); the delay-then-reject behaviour it describes is the one the example simulates.

📌 **Interview term: traffic shaping** — smoothing a bursty stream into a steady one by delaying packets or requests. The throttle above shapes the burst of 10 into one request every 250 ms. A **leaky bucket used as a queue** is the classic shaping algorithm; the algorithms themselves are compared in [token bucket vs sliding window vs fixed window](/interview-question/token-bucket-vs-sliding-window-vs-fixed-window-which-rate-limiter-when).

## 4. The Words Are Used Loosely

Vendors do not follow this distinction consistently, so say which meaning you use:

- **AWS API Gateway** calls its limits "throttling", but what it does is reject: it uses a token bucket with a steady-state rate and a burst size, and requests over the limit get **429 Too Many Requests** (AWS API Gateway developer guide, "Throttle requests to your REST APIs"). The same guide describes the limits as targets applied on a best-effort basis rather than exact ceilings.
- **GitHub's REST API** calls it a "rate limit": 5,000 requests per hour for an authenticated user, with \`x-ratelimit-remaining\` and \`x-ratelimit-reset\` headers telling the client how much budget is left (GitHub Docs, "Rate limits for the REST API").
- **Client libraries** often say "throttle" for the caller pacing itself, for example a job that sends at most 10 requests per second to a partner API.

A safe interview phrasing: "I will use rate limiting for reject-over-quota and throttling for slow-down-over-quota; some products, like API Gateway, call both throttling."

📌 **Interview term: client-side throttling** — the caller limits its own rate (a token bucket in the client, or honouring \`Retry-After\` and \`x-ratelimit-remaining\`) so it never hits the server limit. Good API clients do both: pace themselves, and back off with jitter on 429.

## 5. Where Each Fits

| Situation | Better choice | Why |
| :--- | :--- | :--- |
| Public API, abusive or buggy clients | rate limit (429) | holding their requests costs you memory; rejecting is cheap |
| Fair use per customer plan | rate limit with headers | the client can see its budget and plan around it |
| Calls to a fragile downstream (a legacy DB, a partner API with a strict quota) | throttle | the work must still happen, only slower |
| Background jobs, email sends, webhooks | throttle (queue) | nobody is waiting interactively; a queue absorbs the burst |
| Whole system overloaded regardless of client | load shedding | drop the least important work first, see below |

📌 **Interview term: load shedding** — rejecting work based on the **state of the server** (CPU, queue length, concurrency) rather than on who sent it. Stripe describes running several limiters in production, including load shedders that decide from the whole state of the system rather than the user making the request (Stripe engineering blog, "Scaling your API with rate limiters").

📌 **Interview term: backpressure** — a downstream signalling upstream to slow down instead of silently buffering. A 429 with \`Retry-After\` is backpressure over HTTP; a bounded queue that blocks producers is backpressure inside a process. Full treatment in [what is backpressure](/interview-question/what-is-backpressure-and-how-do-you-handle-it).

## 6. Verified: Running the Code

The example **"Same burst, two policies: a rate limiter answers 429 + Retry-After, a throttle queues and delays"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== rate limiter: 4 per 1 s window, excess gets 429, client retries after Retry-After
  r0  arrives    0  200 at 0
  r1  arrives    0  200 at 0
  r2  arrives    0  200 at 0
  r3  arrives    0  200 at 0
  r4  arrives    0  429 Retry-After 1s -> 200 at 1000
  r5  arrives    0  429 Retry-After 1s -> 200 at 1000
  r6  arrives    0  429 Retry-After 1s -> 200 at 1000
  r7  arrives    0  429 Retry-After 1s -> 200 at 1000
  r8  arrives    0  429 Retry-After 1s -> 429 Retry-After 1s -> 200 at 2000
  r9  arrives    0  429 Retry-After 1s -> 429 Retry-After 1s -> 200 at 2000
  r10 arrives 3000  200 at 3000
  r11 arrives 3000  200 at 3000
  429 responses sent: 8, worst wait seen by a client: 2000 ms
== throttle: queue drained one request every 250 ms, room for 8 waiting
  r0  arrives    0  held    0 ms, 200 at 0
  r1  arrives    0  held  250 ms, 200 at 250
  r2  arrives    0  held  500 ms, 200 at 500
  r3  arrives    0  held  750 ms, 200 at 750
  r4  arrives    0  held 1000 ms, 200 at 1000
  r5  arrives    0  held 1250 ms, 200 at 1250
  r6  arrives    0  held 1500 ms, 200 at 1500
  r7  arrives    0  held 1750 ms, 200 at 1750
  r8  arrives    0  held 2000 ms, 200 at 2000
  r9  arrives    0  queue full -> 503
  r10 arrives 3000  held    0 ms, 200 at 3000
  r11 arrives 3000  held  250 ms, 200 at 3250
  rejections: 1, worst added latency: 2000 ms, most requests waiting in the queue at once: 8
~~~

What the simulation stands for and what it leaves out: time is a fake clock in milliseconds, the rate limiter is a fixed-window counter in a map, and the throttle is a single queue with a "next free slot" time. There is no network, no real concurrency, and the clients are perfectly polite — they always wait exactly \`Retry-After\`. Real clients add jitter, and some ignore the header entirely, which is the main weakness of relying on rejection alone.

## Edge Cases Worth Knowing

- **Retry storms**: if every rejected client retries at exactly \`Retry-After\`, they all come back at the same instant (the run shows 4 retries landing at 1000 ms and 2 at 2000 ms). Clients should add random jitter.
- **Throttling with a timeout upstream**: a request held 2000 ms behind a gateway with a 1 s timeout is wasted work; set the queue bound from the caller timeout, not from memory alone.
- **Per-key vs global**: a per-API-key rate limit does not protect you when 10,000 well-behaved keys arrive together; add a global limit or load shedding.
- **Non-HTTP systems**: message brokers, databases and cloud APIs have their own vocabulary (quota exceeded, provisioned throughput exceeded). Map them onto reject vs delay when you discuss them.

## Common Pitfalls

- **Treating the two words as a precise standard** — they are not; AWS calls its 429 rejections throttling. Define them before you use them.
- **An unbounded throttle queue** — it converts overload into timeouts and memory exhaustion. The throttle in the run had room for 8 and rejected the 9th waiting request.
- **Rejecting without guidance** — a bare 429 with no \`Retry-After\` or remaining-budget header invites clients to retry immediately and make things worse.
- **Thinking rejection protects the backend from bursts** — a fixed-window limiter let 4 requests through at each window start; the backend still saw bursts. A throttle smooths them; a token bucket bounds them.
- **Forgetting the client side** — if your service calls a rate-limited API, throttle yourself below its limit instead of discovering the limit through 429s.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Core distinction:</strong> <span style="color:#f0e2c8;">Both enforce a rate. <strong style="color:#ffca28;">Rate limiting</strong> rejects the excess with <strong style="color:#ffca28;">429</strong> and a <strong style="color:#ffca28;">Retry-After</strong>; <strong style="color:#ffca28;">throttling</strong> delays or slows it so it still completes later.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Who pays:</strong> <span style="color:#f0e2c8;">Rejection makes the <strong style="color:#ffca28;">client</strong> wait and retry; throttling makes the <strong style="color:#ffca28;">server</strong> hold requests, which costs memory, connections and latency.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bounds:</strong> <span style="color:#f0e2c8;">A throttle needs a bounded queue and rejects beyond it, otherwise overload just becomes timeouts. nginx <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">limit_req</code> does exactly that: delay up to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">burst</code>, reject after.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When:</strong> <span style="color:#f0e2c8;">Public API edge: rate limit per key with headers. Calls to a fragile downstream or background work: throttle. Whole system hot: <strong style="color:#ffca28;">load shedding</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Vocabulary caveat:</strong> <span style="color:#f0e2c8;">Vendors mix the words — AWS API Gateway calls its 429 behaviour throttling — so I state my definitions first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a token bucket a rate limiter or a throttle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either. The bucket decides whether a token is available; you choose what to do when it is not: reject with 429 (rate limiting) or wait until the next token arrives (throttling). The algorithm is the same, the policy differs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What should a 429 response contain?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Retry-After</code> header, and ideally the remaining budget and reset time, such as GitHub <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x-ratelimit-remaining</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x-ratelimit-reset</code>. RFC 6585 also says caches must not store a 429.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not always throttle, since nobody gets an error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because holding requests is not free: each one keeps a connection and memory, and if the caller times out the work is wasted. Abusive clients would also tie up your capacity. Throttle where the work must happen; reject where the caller can retry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to backpressure?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A 429 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Retry-After</code> is backpressure across HTTP: the server tells the sender to slow down. A bounded queue that blocks producers is backpressure inside a system. Throttling without a bound is the opposite — silent buffering.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when all rejected clients retry at the same time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A retry storm: they return together and get rejected together. In the run 4 clients retried at exactly 1000 ms. Clients should use exponential backoff with jitter, and servers can spread <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Retry-After</code> values.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rate limiting | Reject requests over a quota, usually with HTTP 429 |
| Throttling | Delay, queue or degrade requests over a pace instead of rejecting them |
| Retry-After | Response header saying when the client may retry |
| Traffic shaping | Smoothing a bursty stream into a steady one |
| Client-side throttling | The caller limits its own rate |
| Load shedding | Rejecting work based on server state, not on the client |
| Backpressure | Downstream telling upstream to slow down |

**Conclusion:** Rate limiting and throttling both keep traffic under a rate; the difference is the fate of the excess. A rate limiter rejects it with 429 and \`Retry-After\`, moving the wait to the client — in the run, 8 rejections and the worst client waiting 2000 ms across two retries. A throttle keeps it and paces it, moving the wait onto the server — the same 2000 ms of delay, but held inside a bounded queue that still had to reject once it was full. Choose rejection at the public edge, throttling in front of work that must still happen, and always say which meaning you are using, because products like AWS API Gateway use "throttling" for both. The algorithms behind both are compared in [token bucket vs sliding window vs fixed window](/interview-question/token-bucket-vs-sliding-window-vs-fixed-window-which-rate-limiter-when), and the full distributed design is in [how would you design a rate limiter](/interview-question/how-would-you-design-a-rate-limiter).`,
    examples: [
      {
        label: `Same burst, two policies: a rate limiter answers 429 + Retry-After, a throttle queues and delays`,
        variants: [
          { tech: "node", code: `// Same burst, two policies: a rate limiter REJECTS the excess (429 + Retry-After),
// a throttle DELAYS it (a leaky-bucket queue that drains at a fixed pace).
// Fake clock in ms. Server capacity in both cases: 4 requests per second.
const arrivals = [];
for (let i = 0; i < 10; i++) arrivals.push({ id: "r" + i, t: 0 });
arrivals.push({ id: "r10", t: 3000 }, { id: "r11", t: 3000 });

// --- Policy 1: rate limiter, fixed window of 4 per 1000 ms; client honours Retry-After ---
function rateLimit() {
  console.log("== rate limiter: 4 per 1 s window, excess gets 429, client retries after Retry-After");
  const counts = new Map();
  let rejected = 0, worst = 0;
  for (const a of arrivals) {
    let t = a.t, tries = 0;
    const log = [];
    for (;;) {
      tries++;
      const win = Math.floor(t / 1000);
      const used = counts.get(win) || 0;
      if (used < 4) { counts.set(win, used + 1); log.push("200 at " + t); break; }
      const retryAfter = (win + 1) * 1000 - t; // ms until the window resets
      log.push("429 Retry-After " + retryAfter / 1000 + "s");
      rejected++;
      t += retryAfter;
    }
    worst = Math.max(worst, t - a.t);
    console.log("  " + a.id.padEnd(4) + "arrives " + String(a.t).padStart(4) + "  " + log.join(" -> "));
  }
  console.log("  429 responses sent: " + rejected + ", worst wait seen by a client: " + worst + " ms");
}

// --- Policy 2: throttle, a queue drained every 250 ms, at most 8 waiting ---
function throttle() {
  console.log("== throttle: queue drained one request every 250 ms, room for 8 waiting");
  let nextSlot = 0, rejected = 0, worst = 0, held = 0;
  const starts = [];
  for (const a of arrivals) {
    const start = Math.max(a.t, nextSlot);
    const waiting = starts.filter((s) => s > a.t).length; // still queued when this one arrives
    if (waiting >= 8) {
      rejected++;
      console.log("  " + a.id.padEnd(4) + "arrives " + String(a.t).padStart(4) + "  queue full -> 503");
      continue;
    }
    starts.push(start);
    nextSlot = start + 250;
    worst = Math.max(worst, start - a.t);
    held = Math.max(held, waiting + 1);
    console.log("  " + a.id.padEnd(4) + "arrives " + String(a.t).padStart(4) + "  held " + String(start - a.t).padStart(4) + " ms, 200 at " + start);
  }
  console.log("  rejections: " + rejected + ", worst added latency: " + worst + " ms, most requests waiting in the queue at once: " + held);
}

rateLimit();
throttle();` },
          { tech: "python", code: `# Same burst, two policies: a rate limiter REJECTS the excess (429 + Retry-After),
# a throttle DELAYS it (a leaky-bucket queue that drains at a fixed pace).
# Fake clock in ms. Server capacity in both cases: 4 requests per second.
arrivals = [{"id": f"r{i}", "t": 0} for i in range(10)]
arrivals += [{"id": "r10", "t": 3000}, {"id": "r11", "t": 3000}]


# --- Policy 1: rate limiter, fixed window of 4 per 1000 ms; client honours Retry-After ---
def rate_limit():
    print("== rate limiter: 4 per 1 s window, excess gets 429, client retries after Retry-After")
    counts = {}
    rejected = worst = 0
    for a in arrivals:
        t = a["t"]
        log = []
        while True:
            win = t // 1000
            used = counts.get(win, 0)
            if used < 4:
                counts[win] = used + 1
                log.append(f"200 at {t}")
                break
            retry_after = (win + 1) * 1000 - t  # ms until the window resets
            log.append(f"429 Retry-After {retry_after // 1000}s")
            rejected += 1
            t += retry_after
        worst = max(worst, t - a["t"])
        print(f"  {a['id']:<4}arrives {a['t']:>4}  " + " -> ".join(log))
    print(f"  429 responses sent: {rejected}, worst wait seen by a client: {worst} ms")


# --- Policy 2: throttle, a queue drained every 250 ms, at most 8 waiting ---
def throttle():
    print("== throttle: queue drained one request every 250 ms, room for 8 waiting")
    next_slot = rejected = worst = held = 0
    starts = []
    for a in arrivals:
        start = max(a["t"], next_slot)
        waiting = len([s for s in starts if s > a["t"]])  # still queued when this one arrives
        if waiting >= 8:
            rejected += 1
            print(f"  {a['id']:<4}arrives {a['t']:>4}  queue full -> 503")
            continue
        starts.append(start)
        next_slot = start + 250
        worst = max(worst, start - a["t"])
        held = max(held, waiting + 1)
        print(f"  {a['id']:<4}arrives {a['t']:>4}  held {start - a['t']:>4} ms, 200 at {start}")
    print(f"  rejections: {rejected}, worst added latency: {worst} ms, most requests waiting in the queue at once: {held}")


rate_limit()
throttle()` },
        ],
      },
    ],
  },
  {
    title: `Token bucket vs sliding window vs fixed window — which rate limiter when?`,
    difficulty: "medium",
    seoDescription: `Fixed window, sliding log, sliding window counter and token bucket run on the same traffic: boundary bursts, accuracy, memory per key and when to use each.`,
    description: `**Question presented to candidate:**
"You need to limit each API key to 10 requests per minute. Walk me through fixed window, sliding window and token bucket. What does each one let through in a burst, how much state does it keep per key, and which one would you pick?"

**What a strong answer should cover:**
- **Fixed window counter**: one counter per key per clock-aligned window; tiny state, but a **boundary burst** lets through up to **2x the limit** within a few seconds across a window edge
- **Sliding window log**: store every accepted timestamp, count the last W seconds; **exact**, but memory grows with the limit (one entry per request in the window)
- **Sliding window counter**: weight the previous window count by its overlap; a few numbers of state, close to exact, but an **approximation** that can over- or under-admit when traffic inside a window is uneven
- **Token bucket**: capacity (burst) plus refill rate; allows a controlled burst up to capacity and then the steady rate; two numbers of state; the usual default for APIs. **Leaky bucket** paces output at a constant rate
- Choosing: token bucket for APIs that should tolerate short bursts; sliding log where exactness matters and limits are small; sliding counter at very large scale; fixed window only when the boundary burst is acceptable
- Know the parameters: a token bucket "10/min" with capacity 10 admits more than 10 in the first minute

**Code / implementation expected:** Yes — implementing at least one algorithm; the example runs all four on the same traffic in four languages.`,
    answer: `**Target Audience:** Developers preparing for system design interviews. You know what an HTTP request is; no rate limiting background assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A gym allows each member 10 visits a month. Three gyms enforce it three ways:

- **Gym 1** resets everyone's count on the 1st of each month. A member visits 10 times on the 30th and 31st, then 10 more times on the 1st and 2nd — 20 visits in four days, all legal.
- **Gym 2** keeps a diary of every visit and, at the door, counts the visits in the last 30 days. Perfectly fair, but the diary is long for busy members.
- **Gym 3** gives every member a jar holding at most 10 coins, adds one coin every three days, and takes one coin per visit. Members can save up for a busy week, but never more than 10 coins.

Gym 1 is a **fixed window**, Gym 2 a **sliding window log**, Gym 3 a **token bucket**. The interview question is which gym rules you want for your API, and the answer depends on what you can afford to store and how much burst you can tolerate. This page compares the algorithms; the difference between rejecting and delaying is in [throttling vs rate limiting](/interview-question/what-is-the-difference-between-throttling-and-rate-limiting), and running one across many servers is in [how would you design a rate limiter](/interview-question/how-would-you-design-a-rate-limiter).

📌 **Interview term: rate limiting algorithm** — the rule that decides, for one key (user, API key, IP) and one incoming request, allow or deny, given what it remembers about earlier requests. All four below enforce "10 per 60 seconds" in the example.

## 2. The Four Algorithms in Plain Language

**Fixed window counter.** Cut time into clock-aligned windows (12:00:00-12:00:59, 12:01:00-12:01:59...). Keep one counter per key per window; allow while the counter is below the limit.

~~~js
const w = Math.floor(t / W);
if (w !== this.win) { this.win = w; this.count = 0; }
if (this.count < LIMIT) { this.count++; return true; }
return false;
~~~

📌 **Interview term: fixed window counter** — count requests per key in a window aligned to the clock and reset at each boundary. Smallest state (a window id and a count), and one atomic increment in a shared store.

**Sliding window log.** Remember the timestamp of every accepted request. On each request drop the ones older than W and allow if fewer than the limit remain.

~~~js
while (this.log.length > 0 && this.log[0] <= t - W) this.log.shift();
if (this.log.length < LIMIT) { this.log.push(t); return true; }
return false;
~~~

📌 **Interview term: sliding window log** — exact "at most N in any W-second span", at the cost of storing up to N timestamps per key. Implemented in Redis with a sorted set; see [the Redis + Lua sliding window limiter](/interview-question/how-do-you-build-a-sliding-window-rate-limiter-with-redis-lua).

**Sliding window counter.** Keep only two fixed-window counters (this window and the previous one) and estimate how many requests happened in the last W seconds by assuming the previous window was spread evenly: \`estimate = prev * (W - elapsed) / W + curr\`. Cloudflare described this approach for its own rate limiting, with a worked example of 42 requests in the previous minute and 18 in the current one, 15 seconds in, giving \`42 * 0.75 + 18 = 49.5\` against a limit of 50 (Cloudflare blog, "Counting things, a lot of different things").

~~~js
const e = t - w * W; // ms elapsed in the current window
if (this.prev * (W - e) + this.curr * W < LIMIT * W) { this.curr++; return true; }
~~~

📌 **Interview term: sliding window counter** — an approximation of the sliding log built from two fixed-window counters, weighted by overlap. Constant memory; accuracy depends on how evenly the previous window was used.

**Token bucket.** A bucket holds up to C tokens and gains R tokens per second. Each request takes one token; no token, no entry. The program keeps tokens as integers (1 token = 60,000 units, refill 10 units per ms) so all four languages compute the same thing.

~~~js
this.units = Math.min(LIMIT * W, this.units + (t - this.last) * LIMIT);
this.last = t;
if (this.units >= W) { this.units -= W; return true; }
~~~

📌 **Interview term: token bucket** — two parameters, **capacity** (largest burst) and **refill rate** (long-run average); state is a token count and a last-refill time. AWS API Gateway documents its request limits this way: a steady-state rate (the refill) and a burst (the bucket size) (AWS API Gateway developer guide, "Throttle requests to your REST APIs").

📌 **Interview term: leaky bucket** — the mirror image: requests enter a bucket that drains at a constant rate. Used as a **meter** it behaves like a token bucket; used as a **queue** it delays requests and produces perfectly paced output (traffic shaping). nginx \`limit_req\` is documented as a leaky bucket.

## 3. Same Traffic, Four Answers

In each line \`#\` is an allowed request and \`.\` a denied one, in arrival order.

**A. The boundary burst** — 10 requests just before the minute ends, 10 just after:

~~~text
== A. boundary burst: 10 at 59.0-59.9 s, 10 at 60.0-60.9 s
  fixed window    ####################  allowed 20/20  state 2 numbers
  sliding log     ##########..........  allowed 10/20  state 10 timestamps
  sliding counter ##########.#........  allowed 11/20  state 3 numbers
  token bucket    ##########..........  allowed 10/20  state 2 numbers
~~~

The fixed window let all **20** through in under two seconds — twice the limit — because the counter reset at 60.0 s. The sliding log and token bucket held it to 10. The sliding counter let **11** through: at 60.1 s the previous window counts as 59.9/60 of 10 = 9.98, which is below 10, so one extra request slipped in. That is the approximation at work.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Fixed window boundary burst: ten requests at the end of window one and ten at the start of window two all pass, twenty within two seconds">
  <rect class="d-box" x="40" y="40" width="300" height="60" rx="8"/>
  <text class="d-text" x="190" y="66" text-anchor="middle">window 1</text>
  <text class="d-sub" x="190" y="86" text-anchor="middle">0 to 59.9 s, count 10</text>
  <rect class="d-box" x="380" y="40" width="300" height="60" rx="8"/>
  <text class="d-text" x="530" y="66" text-anchor="middle">window 2</text>
  <text class="d-sub" x="530" y="86" text-anchor="middle">60 to 119.9 s, count 10</text>
  <rect class="d-box-accent" x="250" y="150" width="220" height="56" rx="10"/>
  <text class="d-text" x="360" y="175" text-anchor="middle">20 allowed</text>
  <text class="d-sub" x="360" y="195" text-anchor="middle">59.0 s to 60.9 s</text>
  <path class="d-edge-dashed" d="M 300 100 L 330 144"/>
  <path class="d-edge-dashed" d="M 420 100 L 390 144"/>
</svg>

Both windows are individually within the limit, yet the two-second span that straddles the boundary carries twice the limit.

**B. Steady overload** — one request every 3 s for 3 minutes, 20 per minute against a limit of 10:

~~~text
== B. steady 1 request every 3 s for 3 minutes (20/min against 10/min)
  fixed window    ##########..........##########..........##########..........  allowed 30/60  state 2 numbers
  sliding log     ##########..........##########..........##########..........  allowed 30/60  state 10 timestamps
  sliding counter ##########...........#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#  allowed 30/60  state 3 numbers
  token bucket    ###################.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.  allowed 39/60  state 2 numbers
~~~

The window-based algorithms all admit 30 in 3 minutes (10 per minute). The fixed window and log do it in blocks — 10 yes, then 10 no — while the sliding counter, after the first minute, settles into allowing every other request: a smoother output. The token bucket admitted **39**: its full bucket of 10 plus one token per 6 s over 177 s (29 more). That is not a bug: a token bucket configured as "capacity 10, refill 10 per minute" means "10 per minute **on average**, plus a one-time burst of 10".

**C. A burst after idle** — 15 requests at once:

~~~text
== C. idle, then a burst of 15 at t=200 s
  fixed window    ##########.....  allowed 10/15  state 2 numbers
  sliding log     ##########.....  allowed 10/15  state 10 timestamps
  sliding counter ##########.....  allowed 10/15  state 3 numbers
  token bucket    ##########.....  allowed 10/15  state 2 numbers
~~~

All four agree: 10 allowed. Differences only show around boundaries and in uneven traffic.

**D. Where the sliding counter's assumption breaks.** The counter assumes the previous window's requests were spread evenly. Two runs with an old burst at different points of the previous window, then 10 new requests at t = 90 s (halfway through the second window):

~~~text
== D1. old burst at 0.0-0.9 s, new burst of 10 at 90 s (show only new)
  fixed window    ##########  allowed 10/10  state 2 numbers
  sliding log     ##########  allowed 10/10  state 10 timestamps
  sliding counter ######....  allowed 6/10  state 3 numbers
  token bucket    ##########  allowed 10/10  state 2 numbers
== D2. old burst at 59.0-59.9 s, new burst of 10 at 90 s (show only new)
  fixed window    ##########  allowed 10/10  state 2 numbers
  sliding log     ..........  allowed 0/10  state 10 timestamps
  sliding counter ######....  allowed 6/10  state 3 numbers
  token bucket    #####.....  allowed 5/10  state 2 numbers
~~~

- **D1**: the old burst was at 0-0.9 s, so it had fully expired by 90 s and the exact answer (sliding log) is "allow 10". The counter assumes half of it is still in the window and allows only **6** — it **under-admits**.
- **D2**: the old burst was at 59-59.9 s, still inside the last 60 s, so the exact answer is "allow 0". The counter again estimates half and allows **6** — it **over-admits**.

The token bucket allowed 5 in D2: about 30 s of refill (5 tokens) since the bucket emptied at 59.9 s. It does not count "the last 60 s" at all; it enforces an average rate with a burst allowance, which is a different promise.

## 4. Comparison Table

| | Fixed window | Sliding log | Sliding counter | Token bucket |
| :--- | :--- | :--- | :--- | :--- |
| State per key | window id + count | up to N timestamps | 2 counts + window id | tokens + last refill time |
| Exact "N in any W"? | no — up to 2N at a boundary (20 in run A) | yes | approximately (11 in A, 6 vs 10 in D1, 6 vs 0 in D2) | no — promises an average rate plus a burst |
| Bursts | 2N across a boundary | never above N | about N | up to capacity C, then rate R |
| Work per request | O(1) | O(expired entries) | O(1) | O(1) |
| Shared-store op | \`INCR\` + \`EXPIRE\` | sorted set, needs a script | two \`INCR\` keys + a read | read-modify-write, needs a script |
| Client sees reset | clean: at the boundary | rolling | rolling | continuous refill |
| Good for | coarse quotas (per day), analytics | small limits where exactness matters (login attempts, OTP) | huge key counts at the edge | general API limits, burst-friendly |

Memory measured on Redis 7.0.15 in the [Redis + Lua sibling page](/interview-question/how-do-you-build-a-sliding-window-rate-limiter-with-redis-lua): a sorted set holding 100 timestamps used 3,640 bytes, while a single counter string used 72 bytes and a two-field token bucket hash 104 bytes. For 10 requests per minute the log is cheap; for 1,000 per minute it is not.

## 5. Which One When

- **Default for a public API: token bucket.** It tolerates the short bursts real clients produce (page load fires 6 calls at once), is two numbers per key, and its two knobs map directly to "sustained rate" and "burst". Pick the capacity deliberately; it is extra admission on top of the rate.
- **Exactness for small, sensitive limits: sliding log.** "5 password attempts per 15 minutes" should never allow 10; storing 5 timestamps is nothing.
- **Very many keys, approximate is fine: sliding counter.** Constant memory, no 2x boundary burst, error bounded by how uneven traffic is.
- **Coarse quotas and billing: fixed window.** "10,000 calls per calendar day" is naturally a fixed window, and a clean reset time is easy to explain on an invoice. Do not use it for overload protection at minute granularity.
- **Output must be smooth: leaky bucket as a queue.** When a downstream needs evenly spaced calls, delay instead of reject.

## 6. Verified: Running the Code

The example **"Fixed window vs sliding log vs sliding counter vs token bucket on five traffic patterns"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and \`java Main.java\` (Java 21). All four print exactly this:

~~~text
== A. boundary burst: 10 at 59.0-59.9 s, 10 at 60.0-60.9 s
  fixed window    ####################  allowed 20/20  state 2 numbers
  sliding log     ##########..........  allowed 10/20  state 10 timestamps
  sliding counter ##########.#........  allowed 11/20  state 3 numbers
  token bucket    ##########..........  allowed 10/20  state 2 numbers
== B. steady 1 request every 3 s for 3 minutes (20/min against 10/min)
  fixed window    ##########..........##########..........##########..........  allowed 30/60  state 2 numbers
  sliding log     ##########..........##########..........##########..........  allowed 30/60  state 10 timestamps
  sliding counter ##########...........#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#  allowed 30/60  state 3 numbers
  token bucket    ###################.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.  allowed 39/60  state 2 numbers
== C. idle, then a burst of 15 at t=200 s
  fixed window    ##########.....  allowed 10/15  state 2 numbers
  sliding log     ##########.....  allowed 10/15  state 10 timestamps
  sliding counter ##########.....  allowed 10/15  state 3 numbers
  token bucket    ##########.....  allowed 10/15  state 2 numbers
== D1. old burst at 0.0-0.9 s, new burst of 10 at 90 s (show only new)
  fixed window    ##########  allowed 10/10  state 2 numbers
  sliding log     ##########  allowed 10/10  state 10 timestamps
  sliding counter ######....  allowed 6/10  state 3 numbers
  token bucket    ##########  allowed 10/10  state 2 numbers
== D2. old burst at 59.0-59.9 s, new burst of 10 at 90 s (show only new)
  fixed window    ##########  allowed 10/10  state 2 numbers
  sliding log     ..........  allowed 0/10  state 10 timestamps
  sliding counter ######....  allowed 6/10  state 3 numbers
  token bucket    #####.....  allowed 5/10  state 2 numbers
~~~

What the simulation stands for and what it leaves out: each limiter is an in-memory object for a single key, time is a fake millisecond clock, and all arithmetic is integer (the sliding counter compares \`prev * (W - e) + curr * W\` against \`LIMIT * W\` instead of dividing) so every language makes the same decision at the same instant. There is no shared store, no concurrency and no clock skew; those are the subject of the distributed design page.

## Edge Cases Worth Knowing

- **Strict vs non-strict comparisons**: whether a timestamp exactly W old has expired (\`<= t - W\` here) changes results at the edges; pick one and test it.
- **Denied requests**: none of these algorithms should record a denied request as used, or a client that keeps retrying can lock itself out forever (shown on the Redis page).
- **Cost-weighted requests**: a bulk endpoint can take 10 tokens instead of 1; token buckets handle weights naturally, counters can increment by the weight.
- **Window alignment**: fixed windows aligned to the clock put every client's reset at the same instant, which synchronises retries; per-key offsets spread them.

## Common Pitfalls

- **Using a fixed window for overload protection** — the run let 20 requests through in under two seconds under a "10 per minute" rule.
- **Misreading token bucket parameters** — "10 per minute, capacity 10" admitted 39 in 3 minutes, not 30; size the capacity as the burst you can actually absorb.
- **Calling the sliding counter exact** — it allowed 6 where the exact answer was 0 (D2) and 6 where it was 10 (D1).
- **Storing a sliding log for large limits** — memory per key grows with the limit; at 100 entries Redis used 3,640 bytes per key against 72-104 for counters.
- **Choosing an algorithm before the requirement** — ask whether the limit is a quota (fixed window fine), a fairness rule (token bucket) or a security rule (sliding log).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame:</strong> <span style="color:#f0e2c8;">All of them answer "allow or deny for this key now". They differ in what they remember and in what they promise: a count per window, every timestamp, a weighted estimate, or a refilling bucket.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fixed window:</strong> <span style="color:#f0e2c8;">One counter per clock window — tiny, one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INCR</code> — but it allows up to <strong style="color:#ffca28;">2x the limit</strong> across a boundary; in my run 20 requests passed a 10-per-minute rule in two seconds.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sliding windows:</strong> <span style="color:#f0e2c8;">The <strong style="color:#ffca28;">log</strong> stores timestamps and is exact but costs memory per request; the <strong style="color:#ffca28;">counter</strong> weights the previous window and is constant memory but approximate — it over- or under-admits when traffic is uneven.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Token bucket:</strong> <span style="color:#f0e2c8;">Capacity plus refill rate: a controlled burst, then the steady rate, two numbers of state. It is my default for APIs, and I size the capacity deliberately because it is extra admission on top of the rate.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Pick:</strong> <span style="color:#f0e2c8;">Token bucket for general APIs, sliding log for small security-sensitive limits like login attempts, sliding counter at huge key counts, fixed window for daily quotas and billing.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the fixed window allow twice the limit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because each window is checked on its own. N requests at the end of one window and N at the start of the next are both within their windows, yet they land within seconds of each other. The run shows 20 allowed between 59.0 s and 60.9 s with a limit of 10.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How accurate is the sliding window counter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exact when traffic is spread evenly, off when it is lumpy, because it assumes the previous window was uniform. In the run it allowed 6 instead of the exact 10 when the old burst was early, and 6 instead of 0 when it was late. It is popular anyway because the state is a couple of counters per key; Cloudflare described using it for its own rate limiting.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Token bucket vs leaky bucket?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As meters they are equivalent views of the same rule. The practical difference is the leaky bucket used as a <strong style="color:#ffca28;">queue</strong>: it delays requests and emits them at a constant pace (traffic shaping), whereas a token bucket admits bursts up to its capacity immediately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement the token bucket in Redis?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store tokens and last-refill time in a hash, and do refill, check and decrement in one Lua script so concurrent gateways cannot race. Pass the clock in as an argument or use the Redis <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TIME</code> command, and set an expiry so idle keys disappear.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which would you choose for "5 login attempts per 15 minutes"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sliding log. Exactness matters for security, and 5 timestamps per account is nothing. A fixed window would allow 10 attempts across a boundary.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rate limiting algorithm | The rule that decides allow or deny per key per request |
| Fixed window counter | One count per clock-aligned window, reset at the boundary |
| Sliding window log | Timestamps of accepted requests, counted over the last W |
| Sliding window counter | Previous window weighted by overlap plus the current count |
| Token bucket | Tokens refill at a rate up to a capacity; one per request |
| Leaky bucket | Requests drain at a constant rate; as a queue it shapes traffic |

**Conclusion:** The four algorithms all say "10 per minute", but the run shows they mean different things: the fixed window let 20 through across a boundary, the sliding log never exceeded 10 in any 60 s but stores a timestamp per request, the sliding counter stayed close with three numbers yet missed by 4 to 6 requests when traffic was lumpy, and the token bucket admitted 39 in three minutes because its capacity is a burst allowance on top of the rate. Choose by the promise you need — token bucket for burst-friendly API limits, sliding log for small exact limits, sliding counter for very many keys, fixed window for quotas — and then make it atomic and shared, as in [the Redis + Lua implementation](/interview-question/how-do-you-build-a-sliding-window-rate-limiter-with-redis-lua).`,
    examples: [
      {
        label: `Fixed window vs sliding log vs sliding counter vs token bucket on five traffic patterns`,
        variants: [
          { tech: "node", code: `// Four rate-limiting algorithms, limit = 10 requests per 60 s, on the same traffic.
// Time is a fake clock in milliseconds; all arithmetic is integer.
const LIMIT = 10;
const W = 60000;

class FixedWindow {
  constructor() { this.win = -1; this.count = 0; }
  allow(t) {
    const w = Math.floor(t / W);
    if (w !== this.win) { this.win = w; this.count = 0; }
    if (this.count < LIMIT) { this.count++; return true; }
    return false;
  }
  state() { return "2 numbers"; }
}

class SlidingLog {
  constructor() { this.log = []; this.peak = 0; }
  allow(t) {
    while (this.log.length > 0 && this.log[0] <= t - W) this.log.shift();
    if (this.log.length < LIMIT) {
      this.log.push(t);
      this.peak = Math.max(this.peak, this.log.length);
      return true;
    }
    return false;
  }
  state() { return this.peak + " timestamps"; }
}

class SlidingCounter {
  constructor() { this.win = 0; this.curr = 0; this.prev = 0; }
  allow(t) {
    const w = Math.floor(t / W);
    if (w !== this.win) {
      this.prev = w === this.win + 1 ? this.curr : 0;
      this.curr = 0;
      this.win = w;
    }
    const e = t - w * W; // ms elapsed in the current window
    // estimate = prev * (W - e) / W + curr, compared without division
    if (this.prev * (W - e) + this.curr * W < LIMIT * W) { this.curr++; return true; }
    return false;
  }
  state() { return "3 numbers"; }
}

class TokenBucket {
  // capacity 10 tokens, refill 10 tokens per 60 s; 1 token = W units, refill = LIMIT units per ms
  constructor() { this.units = LIMIT * W; this.last = 0; }
  allow(t) {
    this.units = Math.min(LIMIT * W, this.units + (t - this.last) * LIMIT);
    this.last = t;
    if (this.units >= W) { this.units -= W; return true; }
    return false;
  }
  state() { return "2 numbers"; }
}

const ALGOS = [["fixed window", FixedWindow], ["sliding log", SlidingLog],
  ["sliding counter", SlidingCounter], ["token bucket", TokenBucket]];

function range(start, n, step) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(start + i * step);
  return out;
}

function scenario(name, times, from) {
  console.log("== " + name);
  for (const [label, Cls] of ALGOS) {
    const lim = new Cls();
    let marks = "";
    let ok = 0;
    times.forEach((t, i) => {
      const a = lim.allow(t);
      if (i >= from) { marks += a ? "#" : "."; if (a) ok++; }
    });
    console.log("  " + label.padEnd(16) + marks + "  allowed " + ok + "/" + (times.length - from) + "  state " + lim.state());
  }
}

scenario("A. boundary burst: 10 at 59.0-59.9 s, 10 at 60.0-60.9 s",
  range(59000, 10, 100).concat(range(60000, 10, 100)), 0);
scenario("B. steady 1 request every 3 s for 3 minutes (20/min against 10/min)",
  range(0, 60, 3000), 0);
scenario("C. idle, then a burst of 15 at t=200 s",
  range(200000, 15, 10), 0);
scenario("D1. old burst at 0.0-0.9 s, new burst of 10 at 90 s (show only new)",
  range(0, 10, 100).concat(range(90000, 10, 10)), 10);
scenario("D2. old burst at 59.0-59.9 s, new burst of 10 at 90 s (show only new)",
  range(59000, 10, 100).concat(range(90000, 10, 10)), 10);` },
          { tech: "python", code: `# Four rate-limiting algorithms, limit = 10 requests per 60 s, on the same traffic.
# Time is a fake clock in milliseconds; all arithmetic is integer.
from collections import deque

LIMIT = 10
W = 60000


class FixedWindow:
    def __init__(self):
        self.win = -1
        self.count = 0

    def allow(self, t):
        w = t // W
        if w != self.win:
            self.win = w
            self.count = 0
        if self.count < LIMIT:
            self.count += 1
            return True
        return False

    def state(self):
        return "2 numbers"


class SlidingLog:
    def __init__(self):
        self.log = deque()
        self.peak = 0

    def allow(self, t):
        while self.log and self.log[0] <= t - W:
            self.log.popleft()
        if len(self.log) < LIMIT:
            self.log.append(t)
            self.peak = max(self.peak, len(self.log))
            return True
        return False

    def state(self):
        return f"{self.peak} timestamps"


class SlidingCounter:
    def __init__(self):
        self.win = 0
        self.curr = 0
        self.prev = 0

    def allow(self, t):
        w = t // W
        if w != self.win:
            self.prev = self.curr if w == self.win + 1 else 0
            self.curr = 0
            self.win = w
        e = t - w * W  # ms elapsed in the current window
        # estimate = prev * (W - e) / W + curr, compared without division
        if self.prev * (W - e) + self.curr * W < LIMIT * W:
            self.curr += 1
            return True
        return False

    def state(self):
        return "3 numbers"


class TokenBucket:
    # capacity 10 tokens, refill 10 tokens per 60 s; 1 token = W units, refill = LIMIT units per ms
    def __init__(self):
        self.units = LIMIT * W
        self.last = 0

    def allow(self, t):
        self.units = min(LIMIT * W, self.units + (t - self.last) * LIMIT)
        self.last = t
        if self.units >= W:
            self.units -= W
            return True
        return False

    def state(self):
        return "2 numbers"


ALGOS = [("fixed window", FixedWindow), ("sliding log", SlidingLog),
         ("sliding counter", SlidingCounter), ("token bucket", TokenBucket)]


def rng(start, n, step):
    return [start + i * step for i in range(n)]


def scenario(name, times, frm):
    print("== " + name)
    for label, cls in ALGOS:
        lim = cls()
        marks = ""
        ok = 0
        for i, t in enumerate(times):
            a = lim.allow(t)
            if i >= frm:
                marks += "#" if a else "."
                if a:
                    ok += 1
        print(f"  {label:<16}{marks}  allowed {ok}/{len(times) - frm}  state {lim.state()}")


scenario("A. boundary burst: 10 at 59.0-59.9 s, 10 at 60.0-60.9 s",
         rng(59000, 10, 100) + rng(60000, 10, 100), 0)
scenario("B. steady 1 request every 3 s for 3 minutes (20/min against 10/min)",
         rng(0, 60, 3000), 0)
scenario("C. idle, then a burst of 15 at t=200 s",
         rng(200000, 15, 10), 0)
scenario("D1. old burst at 0.0-0.9 s, new burst of 10 at 90 s (show only new)",
         rng(0, 10, 100) + rng(90000, 10, 10), 10)
scenario("D2. old burst at 59.0-59.9 s, new burst of 10 at 90 s (show only new)",
         rng(59000, 10, 100) + rng(90000, 10, 10), 10)` },
          { tech: "go", code: `// Four rate-limiting algorithms, limit = 10 requests per 60 s, on the same traffic.
// Time is a fake clock in milliseconds; all arithmetic is integer.
package main

import "fmt"

const LIMIT = 10
const W = 60000

type Limiter interface {
	Allow(t int64) bool
	State() string
}

type FixedWindow struct{ win, count int64 }

func (f *FixedWindow) Allow(t int64) bool {
	w := t / W
	if w != f.win {
		f.win = w
		f.count = 0
	}
	if f.count < LIMIT {
		f.count++
		return true
	}
	return false
}
func (f *FixedWindow) State() string { return "2 numbers" }

type SlidingLog struct {
	log  []int64
	peak int
}

func (s *SlidingLog) Allow(t int64) bool {
	for len(s.log) > 0 && s.log[0] <= t-W {
		s.log = s.log[1:]
	}
	if len(s.log) < LIMIT {
		s.log = append(s.log, t)
		if len(s.log) > s.peak {
			s.peak = len(s.log)
		}
		return true
	}
	return false
}
func (s *SlidingLog) State() string { return fmt.Sprintf("%d timestamps", s.peak) }

type SlidingCounter struct{ win, curr, prev int64 }

func (c *SlidingCounter) Allow(t int64) bool {
	w := t / W
	if w != c.win {
		if w == c.win+1 {
			c.prev = c.curr
		} else {
			c.prev = 0
		}
		c.curr = 0
		c.win = w
	}
	e := t - w*W // ms elapsed in the current window
	// estimate = prev * (W - e) / W + curr, compared without division
	if c.prev*(W-e)+c.curr*W < LIMIT*W {
		c.curr++
		return true
	}
	return false
}
func (c *SlidingCounter) State() string { return "3 numbers" }

// capacity 10 tokens, refill 10 tokens per 60 s; 1 token = W units, refill = LIMIT units per ms
type TokenBucket struct{ units, last int64 }

func (b *TokenBucket) Allow(t int64) bool {
	b.units = min(LIMIT*W, b.units+(t-b.last)*LIMIT)
	b.last = t
	if b.units >= W {
		b.units -= W
		return true
	}
	return false
}
func (b *TokenBucket) State() string { return "2 numbers" }

var labels = []string{"fixed window", "sliding log", "sliding counter", "token bucket"}

func make4(i int) Limiter {
	switch i {
	case 0:
		return &FixedWindow{win: -1}
	case 1:
		return &SlidingLog{}
	case 2:
		return &SlidingCounter{}
	}
	return &TokenBucket{units: LIMIT * W}
}

func rng(start int64, n int, step int64) []int64 {
	out := []int64{}
	for i := 0; i < n; i++ {
		out = append(out, start+int64(i)*step)
	}
	return out
}

func scenario(name string, times []int64, from int) {
	fmt.Println("== " + name)
	for k, label := range labels {
		lim := make4(k)
		marks := ""
		ok := 0
		for i, t := range times {
			a := lim.Allow(t)
			if i >= from {
				if a {
					marks += "#"
					ok++
				} else {
					marks += "."
				}
			}
		}
		fmt.Printf("  %-16s%s  allowed %d/%d  state %s\\n", label, marks, ok, len(times)-from, lim.State())
	}
}

func main() {
	scenario("A. boundary burst: 10 at 59.0-59.9 s, 10 at 60.0-60.9 s",
		append(rng(59000, 10, 100), rng(60000, 10, 100)...), 0)
	scenario("B. steady 1 request every 3 s for 3 minutes (20/min against 10/min)",
		rng(0, 60, 3000), 0)
	scenario("C. idle, then a burst of 15 at t=200 s",
		rng(200000, 15, 10), 0)
	scenario("D1. old burst at 0.0-0.9 s, new burst of 10 at 90 s (show only new)",
		append(rng(0, 10, 100), rng(90000, 10, 10)...), 10)
	scenario("D2. old burst at 59.0-59.9 s, new burst of 10 at 90 s (show only new)",
		append(rng(59000, 10, 100), rng(90000, 10, 10)...), 10)
}` },
          { tech: "java", code: `// Four rate-limiting algorithms, limit = 10 requests per 60 s, on the same traffic.
// Time is a fake clock in milliseconds; all arithmetic is integer.
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;

public class Main {
    static final long LIMIT = 10;
    static final long W = 60000;

    interface Limiter { boolean allow(long t); String state(); }

    static class FixedWindow implements Limiter {
        long win = -1, count = 0;
        public boolean allow(long t) {
            long w = t / W;
            if (w != win) { win = w; count = 0; }
            if (count < LIMIT) { count++; return true; }
            return false;
        }
        public String state() { return "2 numbers"; }
    }

    static class SlidingLog implements Limiter {
        ArrayDeque<Long> log = new ArrayDeque<>();
        int peak = 0;
        public boolean allow(long t) {
            while (!log.isEmpty() && log.peekFirst() <= t - W) log.pollFirst();
            if (log.size() < LIMIT) {
                log.addLast(t);
                peak = Math.max(peak, log.size());
                return true;
            }
            return false;
        }
        public String state() { return peak + " timestamps"; }
    }

    static class SlidingCounter implements Limiter {
        long win = 0, curr = 0, prev = 0;
        public boolean allow(long t) {
            long w = t / W;
            if (w != win) {
                prev = (w == win + 1) ? curr : 0;
                curr = 0;
                win = w;
            }
            long e = t - w * W; // ms elapsed in the current window
            // estimate = prev * (W - e) / W + curr, compared without division
            if (prev * (W - e) + curr * W < LIMIT * W) { curr++; return true; }
            return false;
        }
        public String state() { return "3 numbers"; }
    }

    // capacity 10 tokens, refill 10 tokens per 60 s; 1 token = W units, refill = LIMIT units per ms
    static class TokenBucket implements Limiter {
        long units = LIMIT * W, last = 0;
        public boolean allow(long t) {
            units = Math.min(LIMIT * W, units + (t - last) * LIMIT);
            last = t;
            if (units >= W) { units -= W; return true; }
            return false;
        }
        public String state() { return "2 numbers"; }
    }

    static final String[] LABELS = {"fixed window", "sliding log", "sliding counter", "token bucket"};

    static Limiter make(int i) {
        switch (i) {
            case 0: return new FixedWindow();
            case 1: return new SlidingLog();
            case 2: return new SlidingCounter();
            default: return new TokenBucket();
        }
    }

    static List<Long> rng(long start, int n, long step) {
        List<Long> out = new ArrayList<>();
        for (int i = 0; i < n; i++) out.add(start + i * step);
        return out;
    }

    static List<Long> cat(List<Long> a, List<Long> b) {
        List<Long> out = new ArrayList<>(a);
        out.addAll(b);
        return out;
    }

    static void scenario(String name, List<Long> times, int from) {
        System.out.println("== " + name);
        for (int k = 0; k < LABELS.length; k++) {
            Limiter lim = make(k);
            StringBuilder marks = new StringBuilder();
            int ok = 0;
            for (int i = 0; i < times.size(); i++) {
                boolean a = lim.allow(times.get(i));
                if (i >= from) { marks.append(a ? "#" : "."); if (a) ok++; }
            }
            System.out.printf("  %-16s%s  allowed %d/%d  state %s%n", LABELS[k], marks, ok, times.size() - from, lim.state());
        }
    }

    public static void main(String[] args) {
        scenario("A. boundary burst: 10 at 59.0-59.9 s, 10 at 60.0-60.9 s",
            cat(rng(59000, 10, 100), rng(60000, 10, 100)), 0);
        scenario("B. steady 1 request every 3 s for 3 minutes (20/min against 10/min)",
            rng(0, 60, 3000), 0);
        scenario("C. idle, then a burst of 15 at t=200 s",
            rng(200000, 15, 10), 0);
        scenario("D1. old burst at 0.0-0.9 s, new burst of 10 at 90 s (show only new)",
            cat(rng(0, 10, 100), rng(90000, 10, 10)), 10);
        scenario("D2. old burst at 59.0-59.9 s, new burst of 10 at 90 s (show only new)",
            cat(rng(59000, 10, 100), rng(90000, 10, 10)), 10);
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How do you build a sliding-window rate limiter with Redis + Lua?`,
    difficulty: "hard",
    seoDescription: `A sliding-window rate limiter on Redis sorted sets with one atomic Lua script, run on Redis 7: races, unique members, Retry-After, slots, memory.`,
    description: `**Question presented to candidate:**
"Our API gateways run on 20 machines and every API key gets 100 requests per rolling minute. Build the limiter on Redis. Show me the data structure and the script, and explain why it has to be a Lua script rather than a few Redis commands from the gateway."

**What a strong answer should cover:**
- Data structure: one **sorted set** per key, score = request timestamp in ms, member = a **unique** request id; trim with \`ZREMRANGEBYSCORE\`, count with \`ZCARD\`, record with \`ZADD\`, expire with \`PEXPIRE\`
- Why Lua: the check and the write must be **atomic**; as separate commands from many gateways it is check-then-act and over-admits. Redis runs a script without interleaving other commands
- Correctness details: members must be unique (two requests in the same ms would collapse), denied requests must not be recorded, compute \`Retry-After\` from the oldest entry
- Operations: \`SCRIPT LOAD\` + \`EVALSHA\` with a \`NOSCRIPT\` fallback (or Redis Functions), which clock to trust (client time vs \`TIME\`), keys in one **hash slot** in Redis Cluster
- Cost: memory grows with the limit (one entry per allowed request in the window); the **sliding window counter** variant uses two counters when the log is too big
- Failure policy if Redis is slow or down: fail open or fail closed, with a timeout

**Clarifying questions expected:**
- Must the limit be exact, or is an approximation within a few percent acceptable?
- How large are the limits (10 per minute or 10,000 per minute), and how many active keys?
- If Redis is unavailable, should requests be allowed or rejected?

**Code / implementation expected:** Yes — the Lua script and how the gateway calls it; the example simulates the sorted set to show the race, member collisions and lockout, and the script itself was run on Redis 7.0.15.`,
    answer: `**Target Audience:** Backend developers preparing for system design interviews who have used Redis as a cache. No Lua knowledge assumed.
**Difficulty:** Hard
**Verified with:** Redis 7.0.15 (the Lua script, run with \`redis-cli\`), plus the simulation in Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running code: the Lua script on a real Redis server, and the example program for the race conditions. The **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A nightclub allows at most 100 people in per hour, and has 20 doors. Each doorman has a walkie-talkie to a clipboard keeper. A doorman asks "how many in the last hour?", hears "99", and lets his guest in. But at that same moment three other doormen asked the same question, heard the same "99", and each let a guest in too. Now 103 people are in.

The fix is not a faster walkie-talkie. It is to change the question: instead of "how many?" followed later by "add one", each doorman asks "**if fewer than 100, add one and tell me yes; otherwise tell me no**" — and the clipboard keeper answers those questions **one at a time**. That combined question is the Lua script, and the clipboard keeper answering one at a time is Redis.

This page builds the **sliding window log** in Redis. Why you might choose it over other algorithms is in [token bucket vs sliding window vs fixed window](/interview-question/token-bucket-vs-sliding-window-vs-fixed-window-which-rate-limiter-when); where it sits in a full system is in [how would you design a rate limiter](/interview-question/how-would-you-design-a-rate-limiter).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Exact, or within a few percent? | Exact needs the log (memory per request); approximate can use two counters per key |
| How large are the limits? | A 100-entry sorted set is a few KB; a 10,000-entry one is far bigger. Large limits push you to the counter variant |
| How many active keys, and what peak request rate? | Sizes Redis memory and decides whether one Redis is enough or you need a cluster |
| Is Redis a single node or a cluster? | In a cluster every key a script touches must be in the same hash slot |
| What if Redis is down or slow? | Fail open (allow) or fail closed (reject) is a product decision, and you need a timeout either way |
| Should a client see its remaining budget? | Decides whether the script returns remaining count and retry time for response headers |

## 3. The Data Structure

📌 **Interview term: sorted set (ZSET)** — a Redis type holding unique **members**, each with a numeric **score**, kept ordered by score. Range operations by score are cheap, which is exactly what "drop everything older than 60 s" needs.

One sorted set per rate-limit key, for example \`rl:{user42}\`:

| Member | Score |
| :--- | :--- |
| \`1000-req1\` | 1000 |
| \`1100-req2\` | 1100 |
| ... | ... |

- **Score** = the time of an allowed request in milliseconds.
- **Member** = something unique per request (timestamp plus a request id). A sorted set cannot hold the same member twice, which matters in section 6.
- On each request: remove entries with score at or below \`now - window\`, count what is left, add the new one if the count is below the limit, and set an expiry so idle keys vanish.

## 4. The Script

~~~
-- KEYS[1] = rate-limit key, e.g. rl:{user42}
-- ARGV[1] = now in ms, ARGV[2] = window in ms, ARGV[3] = limit, ARGV[4] = unique member
local key    = KEYS[1]
local now    = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit  = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)
if count < limit then
  redis.call('ZADD', key, now, ARGV[4])
  redis.call('PEXPIRE', key, window)
  return {1, limit - count - 1, 0}
end
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
return {0, 0, tonumber(oldest[2]) + window - now}
~~~

Line by line:

1. \`ZREMRANGEBYSCORE key -inf now-window\` deletes every request that has left the window. An entry exactly \`window\` ms old counts as expired.
2. \`ZCARD key\` counts the requests still in the window.
3. If below the limit: \`ZADD\` the new request and refresh the expiry with \`PEXPIRE\` so a key that stops receiving traffic deletes itself after one window. Return \`{1, remaining, 0}\`.
4. Otherwise do **not** add anything. Read the oldest entry with \`ZRANGE key 0 0 WITHSCORES\`; it leaves the window at \`oldest + window\`, so \`oldest + window - now\` is the exact number of milliseconds the client should wait. Return \`{0, 0, retry_ms}\`.

📌 **Interview term: atomic script execution** — Redis runs a Lua script (or a function) as one unit: while it runs, no other client command is executed, so other clients see either none or all of its effects (Redis documentation, "Scripting with Lua"). That is what turns check-then-act into a single indivisible step. The flip side: a slow script blocks the whole server, so keep scripts short and bounded.

The gateway maps the reply to HTTP: allowed means forward the request and set a remaining-budget header; denied means **429** with \`Retry-After\` rounded up to whole seconds.

## 5. Running It on Real Redis

The script was loaded into a local Redis 7.0.15 with \`SCRIPT LOAD\` and called with \`EVALSHA\`, limit 5 per 1000 ms, passing the clock in as \`ARGV[1]\` so the run is repeatable:

~~~text
redis redis_version:7.0.15
SCRIPT LOAD -> 1f9f53647653b24279890ace647e9b6a517e49d7
now=1000  reply [allowed remaining retry_ms] = 1 4 0
now=1100  reply [allowed remaining retry_ms] = 1 3 0
now=1200  reply [allowed remaining retry_ms] = 1 2 0
now=1300  reply [allowed remaining retry_ms] = 1 1 0
now=1400  reply [allowed remaining retry_ms] = 1 0 0
now=1500  reply [allowed remaining retry_ms] = 0 0 500
now=1600  reply [allowed remaining retry_ms] = 0 0 400
now=2001  reply [allowed remaining retry_ms] = 1 0 0
ZCARD rl:{user42} -> 5
PTTL is at most 1000 -> yes
--- member collision: two requests in the same ms, member = timestamp
ZCARD dup -> 1
--- TIME inside a script that also writes (effects replication)
reply -> ok
--- after SCRIPT FLUSH (or a failover to a replica that never loaded it)
EVALSHA -> NOSCRIPT No matching script. Please use EVAL.
~~~

Reading the run: five requests at 1000-1400 ms are allowed with the remaining count falling from 4 to 0. The request at 1500 ms is denied with \`retry_ms = 500\` because the oldest entry (1000) leaves the window at 2000. At 2001 ms the 1000 entry has expired and the request is allowed. The key never holds more than 5 members, and its TTL is at most the window.

📌 **Interview term: EVALSHA** — call a script by the SHA1 digest that \`SCRIPT LOAD\` returned, so the gateway sends 40 characters instead of the whole script on every request. The script cache is not permanent: after \`SCRIPT FLUSH\`, a restart, or a failover to a replica that never loaded it, \`EVALSHA\` returns \`NOSCRIPT\` — as the last line of the run shows. Clients must catch it, \`SCRIPT LOAD\` again and retry (most Redis client libraries do this for you).

📌 **Interview term: Redis Functions** — added in Redis 7.0: a library of named Lua functions loaded once with \`FUNCTION LOAD\` and called with \`FCALL\`. Unlike the script cache, functions are part of the dataset, so they are persisted and replicated. The same script as a function, run on the same server:

~~~text
FUNCTION LOAD -> ratelimit
FCALL now=1000 -> 1 4 0
after SCRIPT FLUSH, FCALL now=1100 -> 1 3 0
~~~

\`FCALL\` still works after \`SCRIPT FLUSH\`, because a function does not live in the script cache. AWS ElastiCache documentation likewise recommends functions for scripts that must survive (Amazon ElastiCache, "Major engine version behavior and compatibility differences").

## 6. Three Bugs the Script Avoids

The example program simulates the sorted set in memory so it can force exact interleavings that are hard to reproduce on a real server. Its first section replays the same calls as the \`redis-cli\` run and gets the same replies, which checks that the simulation matches the real script.

**Bug 1: check-then-act from the gateway.** Four gateways each send \`ZREMRANGEBYSCORE\` + \`ZCARD\`, decide in application code, then send \`ZADD\`. When all four read before any of them writes:

~~~text
== 2. four gateways, three rounds of simultaneous requests
  ZCARD then ZADD as separate commands: admitted 8 of 12 (limit 5)
  one Lua script per request:           admitted 5 of 12 (limit 5)
~~~

Round 1: all four read 0 and add (4). Round 2: all four read 4, which is below 5, and add (8). Eight admitted against a limit of five. \`MULTI\`/\`EXEC\` alone does not fix this, because a transaction cannot branch on a value it reads inside itself; you would need \`WATCH\` and retries. The script makes the read and the write one step.

📌 **Interview term: check-then-act race** — deciding on a value you read earlier, after someone else may have changed it. The classic lost-update shape, the same problem [optimistic vs pessimistic locking](/interview-question/what-is-the-difference-between-optimistic-and-pessimistic-locking) solves for databases.

**Bug 2: using the timestamp as the member.** Four requests arrive in each of three milliseconds. With \`ZADD key now now\`, requests in the same millisecond write the same member, so the set counts them as one:

~~~text
== 3. member = timestamp vs a unique member, 4 requests in each of 3 milliseconds
  member now            admitted 12 of 12, ZCARD 3
  member now-requestId  admitted 5 of 12, ZCARD 5
~~~

All 12 got through and the set holds 3 entries. Real Redis behaves the same: two \`ZADD dup 5000 5000\` calls left \`ZCARD dup\` at 1 in the run above. Use \`now-<request id>\` (or \`now-<gateway id>-<counter>\`) as the member.

**Bug 3: recording denied requests.** If the script adds the request before checking (or adds it even when denying), a client that keeps retrying keeps refilling its own window:

~~~text
== 4. a client sending every 100 ms for 3 s: should denied requests be recorded?
  only allowed recorded     admitted 15 of 30, per second 5 5 5
  denied requests recorded  admitted 5 of 30, per second 5 0 0
~~~

Sending every 100 ms against 5 per second, the correct script allows 5 per second, every second. The "record everything" version allowed 5 in the first second and **nothing after**, because each denied request pushed a fresh entry into the window. Some teams want this as a penalty for abusive clients, but it should be a deliberate choice, not an accident.

## 7. Which Clock?

The script uses \`now\` from \`ARGV\`, which is the gateway clock. With 20 gateways whose clocks differ by a few milliseconds, entries arrive slightly out of order; for a 60 s window that is negligible, but a gateway whose clock is far off would wrongly expire or keep entries. The alternative is to read the time inside the script with \`redis.call('TIME')\`, so one clock (the Redis primary) decides for everyone.

Older Redis versions could not use the result of \`TIME\` in a script that then writes, because scripts were replicated by re-running them on replicas (verbatim replication) and the time would differ there. Redis 7.0 removed verbatim script replication, leaving **effects replication** (replicating the commands the script produced), which had been the default since Redis 5.0 (Redis 7.0-rc1 release notes, PR #9812). On 7.0.15 the run above executed a script that calls \`TIME\` and then \`SET\` without error. Either choice works; using \`TIME\` is simpler when gateway clocks are not well synchronised, while passing \`now\` makes tests deterministic, as here.

## 8. Redis Cluster: Keep a Key in One Slot

Redis Cluster splits keys into 16,384 hash slots spread across shards, and a script may only touch keys in one slot. With one key per limit (the log) that is automatic. The **sliding window counter** variant needs two keys — the current and previous window — so they must share a **hash tag**: only the part inside \`{}\` is hashed. Run against a one-node cluster on 7.0.15:

~~~text
cluster_state:ok
CLUSTER KEYSLOT rl:{user42}:c:5 -> 14710
CLUSTER KEYSLOT rl:{user42}:c:4 -> 14710
CLUSTER KEYSLOT rl:user42:c:5   -> 8791
CLUSTER KEYSLOT rl:user42:c:4   -> 12918
--- counter script, keys without a hash tag
EVAL -> CROSSSLOT Keys in request don't hash to the same slot
--- counter script, keys sharing the tag {user42}: prev=42, curr=18, 15 s into the minute, limit 50
EVAL -> 1   (estimate 42*0.75+18 = 49.5)
EVAL -> 0   (now 42*0.75+19 = 50.5)
~~~

Without the tag the two keys landed in slots 8791 and 12918 and the script was refused with \`CROSSSLOT\`. With \`{user42}\` both landed in slot 14710 and the script ran. The last two lines reproduce the worked example from Cloudflare's write-up of this algorithm: 42 requests in the previous minute, 18 in the current one, 15 s in, gives an estimate of 49.5 against a limit of 50, so one more request is allowed, and the next one is denied (Cloudflare blog, "Counting things, a lot of different things").

📌 **Interview term: hash tag** — the \`{...}\` part of a Redis Cluster key; only it is hashed to choose the slot, so keys sharing a tag live on the same shard and can be used together in one script or multi-key command.

The counter script:

~~~
-- Sliding window COUNTER: two fixed-window counters, previous one weighted by overlap.
-- KEYS[1] = current window key, KEYS[2] = previous window key (same hash tag)
-- ARGV[1] = ms elapsed in the current window, ARGV[2] = window in ms, ARGV[3] = limit
local elapsed = tonumber(ARGV[1])
local window  = tonumber(ARGV[2])
local limit   = tonumber(ARGV[3])
local curr = tonumber(redis.call('GET', KEYS[1]) or '0')
local prev = tonumber(redis.call('GET', KEYS[2]) or '0')
if prev * (window - elapsed) + curr * window >= limit * window then
  return 0
end
redis.call('INCR', KEYS[1])
redis.call('PEXPIRE', KEYS[1], 2 * window)
return 1
~~~

## 9. Memory: When the Log Gets Too Big

Each allowed request inside the window is one sorted set entry, so memory per key grows with the limit. Measured on Redis 7.0.15 with members like \`1760000000001-req1\`:

~~~text
zset-max-listpack-entries = 128
members=100  encoding=listpack  MEMORY USAGE=3640 bytes
members=128  encoding=listpack  MEMORY USAGE=4152 bytes
members=129  encoding=skiplist  MEMORY USAGE=17288 bytes
members=1000  encoding=skiplist  MEMORY USAGE=122592 bytes
one fixed-window counter string: MEMORY USAGE=72 bytes
token bucket hash (tokens, ts): MEMORY USAGE=104 bytes
~~~

Up to 128 members Redis stores a small sorted set in the compact **listpack** encoding (about 36 bytes per entry here); at 129 it converts to a skiplist and the same key jumps to 17,288 bytes. Worked estimate for **1 million active keys**:

| Algorithm | Bytes per key (measured) | 1M keys |
| :--- | :--- | :--- |
| Sliding log, limit 100 | 3,640 | 3.64 GB |
| Sliding log, limit 129+ | 17,288 at 129 entries | 17.3 GB |
| Token bucket hash | 104 | 0.10 GB |
| One fixed-window counter | 72 | 0.07 GB (two keys for the sliding counter) |

So: the log is the right tool for small limits where exactness matters (logins, OTP sends, per-user writes per minute). For 1,000-per-minute limits on millions of keys, use the sliding window counter or a token bucket.

📌 **Interview term: listpack encoding** — Redis stores small sorted sets as one compact array instead of a skiplist plus hash table. The threshold is \`zset-max-listpack-entries\`, 128 by default on this server, as the run printed.

## 10. Verified: Running the Code

The example **"Sliding-window log on a simulated Redis sorted set: atomic script vs check-then-act race, member collisions, counting denials"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and Java 21. All four print exactly this:

~~~text
== 1. the script, one client (same calls as the redis-cli run)
  now=1000  [allowed remaining retry_ms] = 1 4 0
  now=1100  [allowed remaining retry_ms] = 1 3 0
  now=1200  [allowed remaining retry_ms] = 1 2 0
  now=1300  [allowed remaining retry_ms] = 1 1 0
  now=1400  [allowed remaining retry_ms] = 1 0 0
  now=1500  [allowed remaining retry_ms] = 0 0 500
  now=1600  [allowed remaining retry_ms] = 0 0 400
  now=2001  [allowed remaining retry_ms] = 1 0 0
== 2. four gateways, three rounds of simultaneous requests
  ZCARD then ZADD as separate commands: admitted 8 of 12 (limit 5)
  one Lua script per request:           admitted 5 of 12 (limit 5)
== 3. member = timestamp vs a unique member, 4 requests in each of 3 milliseconds
  member now            admitted 12 of 12, ZCARD 3
  member now-requestId  admitted 5 of 12, ZCARD 5
== 4. a client sending every 100 ms for 3 s: should denied requests be recorded?
  only allowed recorded     admitted 15 of 30, per second 5 5 5
  denied requests recorded  admitted 5 of 30, per second 5 0 0
~~~

What the simulation stands for and what it leaves out: \`MiniRedis\` is a map from key to a member-to-score map with the four sorted-set operations the script uses; \`script()\` is the Lua body, and it is "atomic" simply because the simulation is single-threaded. "Simultaneous" gateways are modelled by doing every read before any write. There is no network, no expiry, no replication and no real concurrency; those parts were checked on the real Redis server instead (sections 5, 7, 8 and 9).

## Edge Cases Worth Knowing

- **Redis timeouts**: set a tight client timeout (a few ms) on the limiter call and decide fail-open or fail-closed; a hung limiter must not hang the API.
- **Replica reads**: never run the limiter against a replica; replication lag means stale counts, and replicas reject writes anyway.
- **Failover loses recent writes**: Redis replication is asynchronous, so after a failover a few recent entries may be missing and a client briefly gets a little extra budget. Acceptable for rate limiting; not for billing.
- **Weighted requests**: to charge a bulk call as 10 requests, add 10 members (or switch to a token bucket, where weights are one subtraction).
- **Very hot keys**: one huge customer hitting one key concentrates load on one shard; split it (per-region sub-limits) or use local pre-limiting at each gateway.

## Common Pitfalls

- **Separate commands instead of a script** — the run admitted 8 of 12 against a limit of 5 when gateways read before writing.
- **Timestamp as the member** — 12 of 12 admitted, set size 3; real Redis also kept one member for two identical \`ZADD\`s.
- **Recording denied requests** — a client retrying every 100 ms got 5 requests in 3 s instead of 15.
- **Assuming \`EVALSHA\` always works** — the run returned \`NOSCRIPT\` after \`SCRIPT FLUSH\`; handle it or use \`FUNCTION LOAD\`.
- **Forgetting cluster slots** — a two-key script without a hash tag was refused with \`CROSSSLOT\`.
- **Using the log for big limits** — 129 entries cost 17,288 bytes per key; at millions of keys use counters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Structure:</strong> <span style="color:#f0e2c8;">One <strong style="color:#ffca28;">sorted set</strong> per key: score is the request time in ms, member is a unique request id. Each call trims entries older than the window, counts, and adds if under the limit, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PEXPIRE</code> so idle keys disappear.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Atomicity:</strong> <span style="color:#f0e2c8;">It must be one <strong style="color:#ffca28;">Lua script</strong>, because Redis runs a script without interleaving other commands. As separate commands from 20 gateways it is check-then-act; in my simulation 4 gateways admitted 8 against a limit of 5.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Details:</strong> <span style="color:#f0e2c8;">Members must be unique or same-millisecond requests collapse; denied requests are not recorded or a retrying client locks itself out; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Retry-After</code> comes from the oldest entry plus the window.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Operations:</strong> <span style="color:#f0e2c8;">Load with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SCRIPT LOAD</code>, call with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EVALSHA</code>, handle <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOSCRIPT</code> — or use Redis 7 <strong style="color:#ffca28;">Functions</strong>. In a cluster all keys share one hash slot via a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{tag}</code>. Tight timeout and an explicit fail-open or fail-closed policy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">Memory is one entry per allowed request: about 3.6 KB per key at a limit of 100 on Redis 7.0.15, so for big limits or millions of keys I switch to the two-counter sliding window or a token bucket.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">MULTI</code>/<code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">EXEC</code> instead of Lua?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A transaction queues commands and runs them together, but it cannot make the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZADD</code> conditional on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZCARD</code> result read inside it. You would need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WATCH</code> on the key and retry on conflict, which under contention means many retries. A script reads, decides and writes in one step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Whose clock do you use?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either pass the gateway time as an argument (deterministic, testable, but sensitive to skew between gateways) or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redis.call('TIME')</code> inside the script so the Redis primary is the single clock. That is safe on Redis 7, where scripts replicate their effects rather than being re-run on replicas.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if Redis goes down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The limiter call times out within a few ms and the gateway applies a policy: <strong style="color:#ffca28;">fail open</strong> for most APIs so an outage of the limiter is not an outage of the product, possibly with a coarse local per-node limit, and <strong style="color:#ffca28;">fail closed</strong> for abuse-sensitive endpoints such as login or SMS sending.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make it cheaper for limits of 10,000 per minute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Switch to the sliding window counter: two integer keys per client sharing a hash tag, previous count weighted by overlap. It is an approximation, but Cloudflare described using it for its rate limiting, and memory drops from thousands of bytes to two 72-byte keys per client.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return rate limit headers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Have the script return allowed, remaining and retry time; the gateway sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Retry-After</code> on 429 and a remaining-budget header on every response. The IETF has a draft, "RateLimit header fields for HTTP", that defines standard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RateLimit</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RateLimit-Policy</code> headers, still an Internet-Draft as of its 2026 revision.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Sorted set (ZSET) | Redis type of unique members ordered by a numeric score |
| Atomic script execution | Redis runs a script with no other command interleaved |
| EVALSHA | Call a cached script by its SHA1; fails with NOSCRIPT if not cached |
| Redis Functions | Named Lua functions loaded with FUNCTION LOAD, persisted and replicated |
| Check-then-act race | Acting on a value that changed after you read it |
| Hash tag | The \`{...}\` part of a cluster key that alone picks the slot |
| Listpack encoding | Compact storage for small sorted sets, up to 128 entries by default |

**Conclusion:** A Redis sliding-window limiter is a sorted set per key and one Lua script that trims, counts, conditionally adds and expires in a single atomic step. The real Redis 7.0.15 run showed the script allowing exactly 5, returning precise retry times (500 ms, 400 ms), and the operational edges — \`NOSCRIPT\` after a flush, \`CROSSSLOT\` without a hash tag, \`TIME\` usable inside a writing script. The simulation showed why each detail matters: separate commands admitted 8 of 12 against a limit of 5, timestamp members admitted all 12, and recording denials locked a retrying client out. Use it where exactness matters and limits are small; at 100 entries a key costs 3,640 bytes, so for large limits or millions of keys switch to the two-counter variant or a token bucket, as discussed in [the rate limiter design](/interview-question/how-would-you-design-a-rate-limiter).`,
    examples: [
      {
        label: `Sliding-window log on a simulated Redis sorted set: atomic script vs check-then-act race, member collisions, counting denials`,
        variants: [
          { tech: "node", code: `// A tiny in-process stand-in for a Redis sorted set, used to show why the sliding-window
// limiter must run as ONE atomic Lua script. Limit 5 per 1000 ms; fake clock in ms.
class MiniRedis {
  constructor() { this.z = new Map(); } // key -> Map(member -> score)
  set(key) { if (!this.z.has(key)) this.z.set(key, new Map()); return this.z.get(key); }
  zremrangebyscore(key, max) { const s = this.set(key); for (const [m, sc] of s) if (sc <= max) s.delete(m); }
  zcard(key) { return this.set(key).size; }
  zadd(key, score, member) { this.set(key).set(member, score); }
  oldest(key) { let best = Infinity; for (const sc of this.set(key).values()) best = Math.min(best, sc); return best; }
}

const WINDOW = 1000, LIMIT = 5;

// The body of the Lua script. Redis runs it without interleaving any other command.
function script(r, key, now, member) {
  r.zremrangebyscore(key, now - WINDOW);
  const count = r.zcard(key);
  if (count < LIMIT) { r.zadd(key, now, member); return [1, LIMIT - count - 1, 0]; }
  return [0, 0, r.oldest(key) + WINDOW - now];
}

console.log("== 1. the script, one client (same calls as the redis-cli run)");
let r = new MiniRedis();
let n = 0;
for (const now of [1000, 1100, 1200, 1300, 1400, 1500, 1600, 2001]) {
  n++;
  console.log("  now=" + now + "  [allowed remaining retry_ms] = " + script(r, "rl:{user42}", now, now + "-req" + n).join(" "));
}

console.log("== 2. four gateways, three rounds of simultaneous requests");
function race(atomic) {
  const r = new MiniRedis();
  let admitted = 0, id = 0;
  for (let round = 0; round < 3; round++) {
    const now = round * 10;
    if (atomic) {
      for (let g = 0; g < 4; g++) admitted += script(r, "k", now, "req" + id++)[0];
    } else {
      // check-then-act from the client: every gateway reads before any of them writes
      const seen = [];
      for (let g = 0; g < 4; g++) { r.zremrangebyscore("k", now - WINDOW); seen.push(r.zcard("k")); }
      for (let g = 0; g < 4; g++) if (seen[g] < LIMIT) { r.zadd("k", now, "req" + id++); admitted++; }
    }
  }
  return admitted;
}
console.log("  ZCARD then ZADD as separate commands: admitted " + race(false) + " of 12 (limit 5)");
console.log("  one Lua script per request:           admitted " + race(true) + " of 12 (limit 5)");

console.log("== 3. member = timestamp vs a unique member, 4 requests in each of 3 milliseconds");
for (const unique of [false, true]) {
  const r = new MiniRedis();
  let admitted = 0, id = 0;
  for (let ms = 0; ms < 3; ms++) {
    for (let g = 0; g < 4; g++) admitted += script(r, "k", ms, unique ? ms + "-req" + id++ : String(ms))[0];
  }
  console.log("  member " + (unique ? "now-requestId" : "now          ") + "  admitted " + admitted + " of 12, ZCARD " + r.zcard("k"));
}

console.log("== 4. a client sending every 100 ms for 3 s: should denied requests be recorded?");
for (const recordDenied of [false, true]) {
  const r = new MiniRedis();
  let admitted = 0;
  const perSecond = [0, 0, 0];
  for (let i = 0; i < 30; i++) {
    const now = i * 100;
    let ok;
    if (recordDenied) {
      r.zremrangebyscore("k", now - WINDOW);
      ok = r.zcard("k") < LIMIT ? 1 : 0;
      r.zadd("k", now, "req" + i); // logged even when denied
    } else ok = script(r, "k", now, "req" + i)[0];
    admitted += ok;
    perSecond[Math.floor(now / 1000)] += ok;
  }
  console.log("  " + (recordDenied ? "denied requests recorded" : "only allowed recorded   ") + "  admitted " + admitted + " of 30, per second " + perSecond.join(" "));
}` },
          { tech: "python", code: `# A tiny in-process stand-in for a Redis sorted set, used to show why the sliding-window
# limiter must run as ONE atomic Lua script. Limit 5 per 1000 ms; fake clock in ms.
class MiniRedis:
    def __init__(self):
        self.z = {}  # key -> {member: score}

    def s(self, key):
        return self.z.setdefault(key, {})

    def zremrangebyscore(self, key, mx):
        s = self.s(key)
        for m in [m for m, sc in s.items() if sc <= mx]:
            del s[m]

    def zcard(self, key):
        return len(self.s(key))

    def zadd(self, key, score, member):
        self.s(key)[member] = score

    def oldest(self, key):
        return min(self.s(key).values())


WINDOW, LIMIT = 1000, 5


# The body of the Lua script. Redis runs it without interleaving any other command.
def script(r, key, now, member):
    r.zremrangebyscore(key, now - WINDOW)
    count = r.zcard(key)
    if count < LIMIT:
        r.zadd(key, now, member)
        return [1, LIMIT - count - 1, 0]
    return [0, 0, r.oldest(key) + WINDOW - now]


print("== 1. the script, one client (same calls as the redis-cli run)")
r = MiniRedis()
n = 0
for now in [1000, 1100, 1200, 1300, 1400, 1500, 1600, 2001]:
    n += 1
    reply = script(r, "rl:{user42}", now, f"{now}-req{n}")
    print(f"  now={now}  [allowed remaining retry_ms] = " + " ".join(str(x) for x in reply))

print("== 2. four gateways, three rounds of simultaneous requests")


def race(atomic):
    r = MiniRedis()
    admitted = 0
    rid = 0
    for rnd in range(3):
        now = rnd * 10
        if atomic:
            for g in range(4):
                admitted += script(r, "k", now, f"req{rid}")[0]
                rid += 1
        else:
            # check-then-act from the client: every gateway reads before any of them writes
            seen = []
            for g in range(4):
                r.zremrangebyscore("k", now - WINDOW)
                seen.append(r.zcard("k"))
            for g in range(4):
                if seen[g] < LIMIT:
                    r.zadd("k", now, f"req{rid}")
                    rid += 1
                    admitted += 1
    return admitted


print(f"  ZCARD then ZADD as separate commands: admitted {race(False)} of 12 (limit 5)")
print(f"  one Lua script per request:           admitted {race(True)} of 12 (limit 5)")

print("== 3. member = timestamp vs a unique member, 4 requests in each of 3 milliseconds")
for unique in [False, True]:
    r = MiniRedis()
    admitted = 0
    rid = 0
    for ms in range(3):
        for g in range(4):
            member = f"{ms}-req{rid}" if unique else str(ms)
            rid += 1 if unique else 0
            admitted += script(r, "k", ms, member)[0]
    label = "now-requestId" if unique else "now          "
    print(f"  member {label}  admitted {admitted} of 12, ZCARD {r.zcard('k')}")

print("== 4. a client sending every 100 ms for 3 s: should denied requests be recorded?")
for record_denied in [False, True]:
    r = MiniRedis()
    admitted = 0
    per_second = [0, 0, 0]
    for i in range(30):
        now = i * 100
        if record_denied:
            r.zremrangebyscore("k", now - WINDOW)
            ok = 1 if r.zcard("k") < LIMIT else 0
            r.zadd("k", now, f"req{i}")  # logged even when denied
        else:
            ok = script(r, "k", now, f"req{i}")[0]
        admitted += ok
        per_second[now // 1000] += ok
    label = "denied requests recorded" if record_denied else "only allowed recorded   "
    print(f"  {label}  admitted {admitted} of 30, per second " + " ".join(str(x) for x in per_second))` },
          { tech: "go", code: `// A tiny in-process stand-in for a Redis sorted set, used to show why the sliding-window
// limiter must run as ONE atomic Lua script. Limit 5 per 1000 ms; fake clock in ms.
package main

import (
	"fmt"
	"strconv"
)

type MiniRedis struct{ z map[string]map[string]int64 }

func NewMiniRedis() *MiniRedis { return &MiniRedis{z: map[string]map[string]int64{}} }
func (r *MiniRedis) set(key string) map[string]int64 {
	if _, ok := r.z[key]; !ok {
		r.z[key] = map[string]int64{}
	}
	return r.z[key]
}
func (r *MiniRedis) Zremrangebyscore(key string, max int64) {
	s := r.set(key)
	for m, sc := range s {
		if sc <= max {
			delete(s, m)
		}
	}
}
func (r *MiniRedis) Zcard(key string) int                      { return len(r.set(key)) }
func (r *MiniRedis) Zadd(key string, score int64, member string) { r.set(key)[member] = score }
func (r *MiniRedis) Oldest(key string) int64 {
	best := int64(1 << 62)
	for _, sc := range r.set(key) {
		best = min(best, sc)
	}
	return best
}

const WINDOW, LIMIT = 1000, 5

// The body of the Lua script. Redis runs it without interleaving any other command.
func script(r *MiniRedis, key string, now int64, member string) [3]int64 {
	r.Zremrangebyscore(key, now-WINDOW)
	count := r.Zcard(key)
	if count < LIMIT {
		r.Zadd(key, now, member)
		return [3]int64{1, int64(LIMIT - count - 1), 0}
	}
	return [3]int64{0, 0, r.Oldest(key) + WINDOW - now}
}

func race(atomic bool) int64 {
	r := NewMiniRedis()
	var admitted int64
	id := 0
	for round := 0; round < 3; round++ {
		now := int64(round * 10)
		if atomic {
			for g := 0; g < 4; g++ {
				admitted += script(r, "k", now, "req"+strconv.Itoa(id))[0]
				id++
			}
		} else {
			// check-then-act from the client: every gateway reads before any of them writes
			seen := []int{}
			for g := 0; g < 4; g++ {
				r.Zremrangebyscore("k", now-WINDOW)
				seen = append(seen, r.Zcard("k"))
			}
			for g := 0; g < 4; g++ {
				if seen[g] < LIMIT {
					r.Zadd("k", now, "req"+strconv.Itoa(id))
					id++
					admitted++
				}
			}
		}
	}
	return admitted
}

func main() {
	fmt.Println("== 1. the script, one client (same calls as the redis-cli run)")
	r := NewMiniRedis()
	n := 0
	for _, now := range []int64{1000, 1100, 1200, 1300, 1400, 1500, 1600, 2001} {
		n++
		rep := script(r, "rl:{user42}", now, fmt.Sprintf("%d-req%d", now, n))
		fmt.Printf("  now=%d  [allowed remaining retry_ms] = %d %d %d\\n", now, rep[0], rep[1], rep[2])
	}

	fmt.Println("== 2. four gateways, three rounds of simultaneous requests")
	fmt.Printf("  ZCARD then ZADD as separate commands: admitted %d of 12 (limit 5)\\n", race(false))
	fmt.Printf("  one Lua script per request:           admitted %d of 12 (limit 5)\\n", race(true))

	fmt.Println("== 3. member = timestamp vs a unique member, 4 requests in each of 3 milliseconds")
	for _, unique := range []bool{false, true} {
		r := NewMiniRedis()
		var admitted int64
		id := 0
		for ms := int64(0); ms < 3; ms++ {
			for g := 0; g < 4; g++ {
				member := strconv.FormatInt(ms, 10)
				if unique {
					member = fmt.Sprintf("%d-req%d", ms, id)
					id++
				}
				admitted += script(r, "k", ms, member)[0]
			}
		}
		label := "now          "
		if unique {
			label = "now-requestId"
		}
		fmt.Printf("  member %s  admitted %d of 12, ZCARD %d\\n", label, admitted, r.Zcard("k"))
	}

	fmt.Println("== 4. a client sending every 100 ms for 3 s: should denied requests be recorded?")
	for _, recordDenied := range []bool{false, true} {
		r := NewMiniRedis()
		var admitted int64
		perSecond := []int64{0, 0, 0}
		for i := 0; i < 30; i++ {
			now := int64(i * 100)
			var ok int64
			if recordDenied {
				r.Zremrangebyscore("k", now-WINDOW)
				if r.Zcard("k") < LIMIT {
					ok = 1
				}
				r.Zadd("k", now, "req"+strconv.Itoa(i)) // logged even when denied
			} else {
				ok = script(r, "k", now, "req"+strconv.Itoa(i))[0]
			}
			admitted += ok
			perSecond[now/1000] += ok
		}
		label := "only allowed recorded   "
		if recordDenied {
			label = "denied requests recorded"
		}
		fmt.Printf("  %s  admitted %d of 30, per second %d %d %d\\n", label, admitted, perSecond[0], perSecond[1], perSecond[2])
	}
}` },
          { tech: "java", code: `// A tiny in-process stand-in for a Redis sorted set, used to show why the sliding-window
// limiter must run as ONE atomic Lua script. Limit 5 per 1000 ms; fake clock in ms.
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Main {
    static class MiniRedis {
        Map<String, Map<String, Long>> z = new HashMap<>();
        Map<String, Long> set(String key) { return z.computeIfAbsent(key, k -> new HashMap<>()); }
        void zremrangebyscore(String key, long max) { set(key).values().removeIf(sc -> sc <= max); }
        int zcard(String key) { return set(key).size(); }
        void zadd(String key, long score, String member) { set(key).put(member, score); }
        long oldest(String key) {
            long best = Long.MAX_VALUE;
            for (long sc : set(key).values()) best = Math.min(best, sc);
            return best;
        }
    }

    static final long WINDOW = 1000;
    static final int LIMIT = 5;

    // The body of the Lua script. Redis runs it without interleaving any other command.
    static long[] script(MiniRedis r, String key, long now, String member) {
        r.zremrangebyscore(key, now - WINDOW);
        int count = r.zcard(key);
        if (count < LIMIT) { r.zadd(key, now, member); return new long[]{1, LIMIT - count - 1, 0}; }
        return new long[]{0, 0, r.oldest(key) + WINDOW - now};
    }

    static long race(boolean atomic) {
        MiniRedis r = new MiniRedis();
        long admitted = 0;
        int id = 0;
        for (int round = 0; round < 3; round++) {
            long now = round * 10;
            if (atomic) {
                for (int g = 0; g < 4; g++) admitted += script(r, "k", now, "req" + id++)[0];
            } else {
                // check-then-act from the client: every gateway reads before any of them writes
                List<Integer> seen = new ArrayList<>();
                for (int g = 0; g < 4; g++) { r.zremrangebyscore("k", now - WINDOW); seen.add(r.zcard("k")); }
                for (int g = 0; g < 4; g++) if (seen.get(g) < LIMIT) { r.zadd("k", now, "req" + id++); admitted++; }
            }
        }
        return admitted;
    }

    public static void main(String[] args) {
        System.out.println("== 1. the script, one client (same calls as the redis-cli run)");
        MiniRedis r = new MiniRedis();
        int n = 0;
        for (long now : new long[]{1000, 1100, 1200, 1300, 1400, 1500, 1600, 2001}) {
            n++;
            long[] rep = script(r, "rl:{user42}", now, now + "-req" + n);
            System.out.println("  now=" + now + "  [allowed remaining retry_ms] = " + rep[0] + " " + rep[1] + " " + rep[2]);
        }

        System.out.println("== 2. four gateways, three rounds of simultaneous requests");
        System.out.println("  ZCARD then ZADD as separate commands: admitted " + race(false) + " of 12 (limit 5)");
        System.out.println("  one Lua script per request:           admitted " + race(true) + " of 12 (limit 5)");

        System.out.println("== 3. member = timestamp vs a unique member, 4 requests in each of 3 milliseconds");
        for (boolean unique : new boolean[]{false, true}) {
            MiniRedis m = new MiniRedis();
            long admitted = 0;
            int id = 0;
            for (long ms = 0; ms < 3; ms++) {
                for (int g = 0; g < 4; g++) {
                    String member = unique ? ms + "-req" + id++ : String.valueOf(ms);
                    admitted += script(m, "k", ms, member)[0];
                }
            }
            String label = unique ? "now-requestId" : "now          ";
            System.out.println("  member " + label + "  admitted " + admitted + " of 12, ZCARD " + m.zcard("k"));
        }

        System.out.println("== 4. a client sending every 100 ms for 3 s: should denied requests be recorded?");
        for (boolean recordDenied : new boolean[]{false, true}) {
            MiniRedis m = new MiniRedis();
            long admitted = 0;
            long[] perSecond = {0, 0, 0};
            for (int i = 0; i < 30; i++) {
                long now = i * 100L;
                long ok;
                if (recordDenied) {
                    m.zremrangebyscore("k", now - WINDOW);
                    ok = m.zcard("k") < LIMIT ? 1 : 0;
                    m.zadd("k", now, "req" + i); // logged even when denied
                } else ok = script(m, "k", now, "req" + i)[0];
                admitted += ok;
                perSecond[(int) (now / 1000)] += ok;
            }
            String label = recordDenied ? "denied requests recorded" : "only allowed recorded   ";
            System.out.println("  " + label + "  admitted " + admitted + " of 30, per second " + perSecond[0] + " " + perSecond[1] + " " + perSecond[2]);
        }
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How would you design a rate limiter?`,
    difficulty: "hard",
    seoDescription: `Design a distributed rate limiter: requirements, capacity math, rules, Redis state, local vs central vs leased tokens, fail-open vs fail-closed, 10x scale.`,
    description: `**Question presented to candidate:**
"Design the rate limiter for our public API. Requests arrive at a fleet of gateway servers; customers have plans with different limits per API key, and we also want per-IP limits against abuse. Walk me through where it runs, what state it keeps, how the gateways share that state, and what happens when the limiter itself fails."

**What a strong answer should cover:**
- Requirements first: what is limited (API key, user, IP, endpoint), the rules and their source, accuracy needed, latency budget (a limiter check must cost about a millisecond), availability
- Placement: a middleware in the **API gateway** (or edge), keyed per client and rule, returning **429** with \`Retry-After\` and remaining-budget headers; client-side and per-service limits as extra layers
- Algorithm choice with a reason (usually **token bucket**, sliding log for small exact limits) and a **rules** store pushed to gateways
- Shared state: **local-only** limits are wrong when traffic is uneven across nodes; a **central store** (Redis, sharded by key, atomic Lua) is exact but costs a round trip per request; **local batching / token leases** cut store calls at some accuracy cost
- Failure policy: **fail open** vs **fail closed**, timeouts, a local fallback limit; multi-region choices
- Capacity numbers (requests per second, keys, memory, Redis shards) and what breaks first at 10x

**Clarifying questions expected:**
- Is the limit hard (billing, abuse) or soft (fairness), and how much over-admission is acceptable?
- How many requests per second at peak, how many distinct keys, and how many regions?
- Should a limiter outage allow or reject traffic?

**Code / implementation expected:** Optional — high-level design with numbers; the example simulates gateways sharing a token bucket and the limiter store failing.`,
    answer: `**Target Audience:** Developers preparing for system design interviews. You know what an API and a load balancer are; the algorithms are covered on sibling pages and only summarised here.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). Memory figures were measured on Redis 7.0.15.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example; the **Verified** section quotes the full output. Capacity numbers are worked from stated assumptions.

## 1. Why This Even Matters — A Story First

A theme park sells "10 rides per hour" wristbands. If one gate checks wristbands, the rule is easy. But the park has 20 gates, and a visitor can use any of them. If each gate keeps its own tally, a visitor can ride 10 times per gate. If every gate phones the central office for every ride, the rule is exact but the queue at each gate now depends on the phone line, and when the phone line goes down, the gates must decide: let everybody ride, or let nobody ride.

That is the rate limiter design problem: a simple rule, enforced consistently by many machines, cheaply, and with a sane answer when the shared part fails.

📌 **Interview term: rate limiter** — a component that counts requests per key (API key, user, IP, endpoint) and rejects those over a configured rate, usually with HTTP **429 Too Many Requests**. It protects the service from abuse and overload and enforces fair use between customers. How it differs from delaying requests is covered in [throttling vs rate limiting](/interview-question/what-is-the-difference-between-throttling-and-rate-limiting).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What do we limit by — API key, user, IP, endpoint, tenant? | Decides the key format and how many keys exist |
| Hard limit (billing, security) or soft (fairness)? | Hard limits need central exact counting; soft ones tolerate local approximation |
| Peak requests per second, active keys, regions? | Sizes the store, and decides whether a cross-region limit is even affordable |
| Latency budget for the check? | A Redis round trip is fine; a cross-region call is not |
| If the limiter store fails, allow or reject? | Fail-open vs fail-closed changes the failure mode of the whole API |
| Should clients see remaining budget? | Response headers and an API for usage dashboards |

## 3. Requirements

**Functional**
- Rules per plan and endpoint, for example: free plan 100 requests/minute per API key, paid plan 1,000/minute, \`POST /login\` 5 per 15 minutes per IP, and a global cap per endpoint.
- For each request: allow, or reject with 429, \`Retry-After\`, and remaining-budget headers.
- Change rules without redeploying gateways.

**Non-functional**
- Added latency: under about 1 ms at the median for the check.
- Accuracy: hard limits within a few percent; abuse limits exact.
- Availability: the limiter must never be the reason the API is down (or, for security limits, never silently disappear).
- Scale: assumptions below.

## 4. Capacity Estimate

Assumptions (state them out loud; the numbers are illustrative):

| Input | Value |
| :--- | :--- |
| Peak API traffic | 500,000 requests/s |
| Active keys (API keys plus IPs) | 5 million |
| Rule checks per request | 1 (combine per-key rules into one script call) |
| State per key | token bucket hash: 104 bytes measured on Redis 7.0.15 |
| One Redis shard | plan for about 100,000 script calls/s (an assumption to load-test, not a benchmark) |
| Request plus reply on the wire | about 200 bytes |

Arithmetic:

- Memory: 5,000,000 keys x 104 bytes = **0.52 GB**. A sliding log at a limit of 100 would be 5,000,000 x 3,640 bytes = **18.2 GB** (3,640 bytes measured for a 100-entry sorted set on the [Redis + Lua page](/interview-question/how-do-you-build-a-sliding-window-rate-limiter-with-redis-lua)). Token buckets win on memory by 35x.
- Store throughput: 500,000 / 100,000 = **5 shards**; provision 10 primaries for headroom and hot keys, each with a replica.
- Network to the store: 500,000 x 200 bytes = **100 MB/s** across the cluster.
- Latency: one same-zone round trip per request; keep the gateway-to-Redis timeout at a few milliseconds.

The method is in [back-of-the-envelope capacity estimation](/interview-question/how-do-you-approach-back-of-the-envelope-capacity-estimation).

## 5. API and Rules

The limiter has two interfaces: an internal check called by the gateway, and the HTTP contract clients see.

~~~ts
// internal, called once per request by the gateway middleware
check(keys: { apiKey: string; ip: string; route: string }, cost = 1): {
  allowed: boolean;
  limit: number;        // the rule that was closest to its limit
  remaining: number;
  retryAfterMs: number; // 0 when allowed
}
~~~

~~~http
HTTP/1.1 429 Too Many Requests
Retry-After: 12
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
~~~

\`Retry-After\` is defined by HTTP (RFC 9110) and 429 by RFC 6585. The \`X-RateLimit-*\` names are a common convention rather than a standard (GitHub uses \`x-ratelimit-remaining\` and \`x-ratelimit-reset\`); the IETF draft "RateLimit header fields for HTTP" proposes standard \`RateLimit\` and \`RateLimit-Policy\` headers and was still an Internet-Draft at its May 2026 revision.

Rules live in a small config store and are pushed to every gateway, which caches them in memory:

~~~yaml
rules:
  - id: free-plan
    match: { plan: free }
    key: api_key
    algorithm: token_bucket
    rate_per_sec: 1.67      # 100 per minute
    burst: 20
  - id: login-by-ip
    match: { route: "POST /login" }
    key: ip
    algorithm: sliding_log  # small and exact
    limit: 5
    window_sec: 900
~~~

## 6. Data Model

Rules are low-volume configuration and belong in a database with an audit trail; counters are high-volume, short-lived state and belong in memory.

~~~sql
CREATE TABLE rate_limit_rule (
  id            TEXT PRIMARY KEY,
  match_plan    TEXT,
  match_route   TEXT,
  key_type      TEXT NOT NULL,      -- api_key | user | ip | tenant
  algorithm     TEXT NOT NULL,      -- token_bucket | sliding_log | fixed_window
  rate_per_sec  NUMERIC,
  burst         INTEGER,
  updated_at    TIMESTAMP NOT NULL
);
~~~

Counter state in Redis, one key per (rule, client), with a hash tag so related keys share a cluster slot:

| Key | Type | Fields | TTL |
| :--- | :--- | :--- | :--- |
| \`tb:{free-plan:key_8f2}\` | hash | \`tokens\`, \`ts\` | time to refill fully |
| \`sl:{login-by-ip:203.0.113.7}\` | sorted set | one member per attempt | the window |

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Clients reach a load balancer, then API gateways with a limiter middleware and cached rules; gateways call a sharded Redis cluster for counters and forward allowed requests to services; a rules service pushes rules to gateways">
  <defs>
    <marker id="sd11q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="110" width="110" height="56" rx="10"/>
  <text class="d-text" x="75" y="143" text-anchor="middle">clients</text>
  <rect class="d-box" x="180" y="110" width="120" height="56" rx="10"/>
  <text class="d-text" x="240" y="135" text-anchor="middle">load</text>
  <text class="d-text" x="240" y="155" text-anchor="middle">balancer</text>
  <rect class="d-box-accent" x="350" y="100" width="170" height="76" rx="10"/>
  <text class="d-text" x="435" y="128" text-anchor="middle">API gateways</text>
  <text class="d-sub" x="435" y="148" text-anchor="middle">limiter middleware</text>
  <text class="d-sub" x="435" y="166" text-anchor="middle">rules in memory</text>
  <rect class="d-box" x="580" y="20" width="160" height="56" rx="10"/>
  <text class="d-text" x="660" y="45" text-anchor="middle">Redis cluster</text>
  <text class="d-sub" x="660" y="65" text-anchor="middle">counters, Lua</text>
  <rect class="d-box" x="580" y="110" width="160" height="56" rx="10"/>
  <text class="d-text" x="660" y="143" text-anchor="middle">services</text>
  <rect class="d-box-muted" x="350" y="230" width="170" height="56" rx="10"/>
  <text class="d-text" x="435" y="255" text-anchor="middle">rules service</text>
  <text class="d-sub" x="435" y="275" text-anchor="middle">DB plus push</text>
  <path class="d-edge" d="M 130 138 L 174 138" marker-end="url(#sd11q4-arrow)"/>
  <path class="d-edge" d="M 300 138 L 344 138" marker-end="url(#sd11q4-arrow)"/>
  <path class="d-edge-accent" d="M 520 112 L 576 60" marker-end="url(#sd11q4-arrow)"/>
  <path class="d-edge" d="M 520 138 L 574 138" marker-end="url(#sd11q4-arrow)"/>
  <path class="d-edge-dashed" d="M 435 230 L 435 182" marker-end="url(#sd11q4-arrow)"/>
</svg>

Requests flow left to right; the gateway asks Redis for a decision, forwards allowed requests and answers 429 itself; rules arrive out of band from the rules service and are cached by every gateway.

📌 **Interview term: API gateway** — the entry point that does cross-cutting work (authentication, routing, rate limiting) before requests reach services; see [what is an API gateway](/interview-question/what-is-an-api-gateway). Putting the limiter here means rejected requests never touch your services.

Where else limits live, as layers rather than alternatives:
- **Edge / CDN**: coarse per-IP limits and bot blocking, before traffic reaches your data centre.
- **Gateway**: per-key, per-plan, per-route limits (this design).
- **Inside a service**: protection for an expensive dependency (concurrency limits, a throttle in front of a legacy database).
- **Client SDK**: pacing so well-behaved clients never hit 429.

## 8. Deep Dive 1: Which Algorithm

Token bucket for plan limits (bursts allowed, two fields per key, the parameters map to "rate" and "burst"), sliding log for small exact security limits, fixed window for daily quotas. The trade-offs, with the same traffic run through all four, are in [token bucket vs sliding window vs fixed window](/interview-question/token-bucket-vs-sliding-window-vs-fixed-window-which-rate-limiter-when). Whatever you choose, the read-modify-write must be atomic in the shared store: a Lua script in Redis ([the Redis + Lua page](/interview-question/how-do-you-build-a-sliding-window-rate-limiter-with-redis-lua) shows 4 gateways admitting 8 against a limit of 5 without it).

## 9. Deep Dive 2: Sharing State Across Gateways

The example has 4 gateways and one API key limited to 100 requests per second; 120 requests arrive at once, spread unevenly by the load balancer:

~~~text
== 1. burst of 120 requests at t=0, limit 100
  traffic per node: 60 36 18 6
  local only, 25 per node       admitted  74 of 120   store calls   0
  local only, 100 per node      admitted 120 of 120   store calls   0
  central store, every request  admitted 100 of 120   store calls 120
  central store, leases of 10   admitted  94 of 120   store calls  36   tokens stranded on nodes 0 0 2 4
~~~

📌 **Interview term: local rate limiting** — each gateway enforces its own share of the limit in memory, with no shared store. Zero latency and nothing to fail, but wrong whenever traffic is uneven: dividing the limit (25 per node) admitted only **74** because node 0 had 60 requests and node 3 had 6; not dividing it (100 per node) admitted all **120** and could admit up to 400.

📌 **Interview term: centralized rate limiting** — every gateway asks a shared store (Redis) for each decision. Exactly **100** admitted, at the cost of **120** store calls: one network round trip per request, and a dependency on the store.

📌 **Interview term: token leasing (local batching)** — each gateway takes a batch of tokens (10 here) from the central bucket and spends them locally, going back only when its batch runs out. Store calls fell from 120 to **36**, and admission stayed under the limit (**94**), but **6 tokens** were stranded on nodes 2 and 3 that had leased tokens and received no more traffic. Bigger leases mean fewer calls and more stranding; leases need a short expiry so stranded tokens return. (The 36 calls also include repeated asks after the central bucket was empty; caching "empty until t" on the gateway would cut them further.)

| Approach | Accuracy (run) | Store calls (run) | Latency | Fails when |
| :--- | :--- | :--- | :--- | :--- |
| Local, divided limit | 74 of 100 allowed | 0 | none | traffic is uneven across nodes |
| Local, full limit per node | 120 (up to 4x) | 0 | none | clients spread across nodes |
| Central store per request | exactly 100 | 120 | one round trip | the store is slow or down |
| Central with leases of 10 | 94, never over | 36 | round trip per lease | many nodes hold stranded tokens |

In practice: central (Redis) for hard per-key limits, plus a generous local per-node limit as a first line that also covers store outages.

## 10. Deep Dive 3: When the Limiter Fails

The store goes down for one second while one key sends 250 requests/s against a limit of 100/s (burst 20):

~~~text
== 2. 250 requests/s for 3 s, round-robin; limit 100/s (burst 20); store down 1000-1999 ms
  fail-closed               admitted per second 119   0 119
  fail-open                 admitted per second 119 250 119
  fallback to local 25/node admitted per second 119 116 119
~~~

📌 **Interview term: fail open / fail closed** — when the limiter cannot decide, **fail open** allows the request (the API stays up, limits are not enforced) and **fail closed** rejects it (limits hold, the API is down for that traffic). In the run, fail-closed admitted **0** during the outage, fail-open admitted **250** (2.5x the limit), and a **local fallback** of 25 per node admitted **116**, close to the normal 119.

Choose per rule: plan limits fail open (with the local fallback), security limits such as login attempts or SMS sends fail closed. Either way the store call needs a timeout of a few milliseconds and a [circuit breaker](/interview-question/what-is-the-circuit-breaker-pattern) so a slow Redis does not add its latency to every request.

## 11. Deep Dive 4: Multiple Regions

A global exact limit needs a cross-region round trip per request, which costs tens of milliseconds and couples regions. Common choices:
- **Per-region limits**: split the customer limit across regions (by expected share) and enforce each locally. Cheap; inaccurate when traffic shifts between regions.
- **Local enforcement with asynchronous sync**: each region counts locally and periodically exchanges counts; over-admission bounded by the sync interval.
- **Home region** for the strictest limits (billing-grade quotas), accepting the latency for that small set of calls.

This is the same trade-off as [strong vs eventual consistency](/interview-question/what-is-the-difference-between-strong-and-eventual-consistency), applied to counters.

## 12. What Breaks First at 10x

At 5 million requests/s and 50 million keys:
- **Store throughput**: 50 shards by the same assumption; well before that, **hot keys** (one huge customer) overload single shards. Fix: leases or local pre-limiting for the biggest tenants, and splitting their limit across sub-keys.
- **Memory**: 50 million x 104 bytes = 5.2 GB for token buckets — fine; a sliding log would be 182 GB, which is why the log is reserved for small rules.
- **Network round trips**: per-request central checks become the dominant cost; moving most decisions to leased local tokens takes the store off the hot path.
- **Rule fan-out**: thousands of per-customer rules pushed to thousands of gateways; push deltas and version them.

## 13. Verified: Running the Code

The example **"Distributed limiter: local vs central vs leased tokens, and fail-open vs fail-closed during a store outage"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and Java 21. All four print exactly this:

~~~text
== 1. burst of 120 requests at t=0, limit 100
  traffic per node: 60 36 18 6
  local only, 25 per node       admitted  74 of 120   store calls   0
  local only, 100 per node      admitted 120 of 120   store calls   0
  central store, every request  admitted 100 of 120   store calls 120
  central store, leases of 10   admitted  94 of 120   store calls  36   tokens stranded on nodes 0 0 2 4
== 2. 250 requests/s for 3 s, round-robin; limit 100/s (burst 20); store down 1000-1999 ms
  fail-closed               admitted per second 119   0 119
  fail-open                 admitted per second 119 250 119
  fallback to local 25/node admitted per second 119 116 119
~~~

What the simulation stands for and what it leaves out: each gateway is an index into an array, the "central store" is one in-process token bucket standing for a Redis key updated by an atomic script, and time is a fake millisecond clock with tokens kept as integers (1 token = 1,000 units). There is no network latency, no concurrency, no lease expiry and no replication; the outage is a time range in which the store is treated as unreachable.

## Edge Cases Worth Knowing

- **Multiple rules per request**: check per-IP, per-key and global rules in one script call, and only consume from all of them if all allow; otherwise a request denied by one rule still drains the others.
- **Cost-based limits**: an export endpoint can cost 50 tokens; pass \`cost\` to the check.
- **Rule changes mid-window**: lowering a limit should apply immediately; store the rule version with the state or recompute from the new rule on the next request.
- **Key cardinality attacks**: limiting by a client-supplied header lets an attacker create millions of keys; limit by authenticated identity or IP, and set TTLs on every key.
- **Clock skew**: pass one clock (Redis \`TIME\`) or tolerate a few ms of skew between gateways.

## Common Pitfalls

- **Local counters only** — the run admitted 74 or 120 against a limit of 100 depending on how the limit was divided.
- **No failure policy** — a Redis outage turned into either a full outage (fail-closed admitted 0) or no limiting at all (fail-open admitted 250 against 100).
- **Non-atomic read-modify-write** — gateways race and over-admit; use one script per check.
- **Forgetting the client contract** — no \`Retry-After\` or remaining headers means clients retry blindly.
- **One limiter for everything** — plan fairness, abuse protection and overload protection need different keys, algorithms and failure modes.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope:</strong> <span style="color:#f0e2c8;">I clarify what we key on (API key, IP, route), hard vs soft limits, peak traffic and the failure policy, then propose a limiter <strong style="color:#ffca28;">middleware in the API gateway</strong> returning <strong style="color:#ffca28;">429</strong> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Retry-After</code> and remaining-budget headers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm and rules:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Token bucket</strong> for plan limits, sliding log for small exact security limits. Rules live in a DB and are pushed to gateways, which cache them in memory.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Shared state:</strong> <span style="color:#f0e2c8;">Counters in a sharded <strong style="color:#ffca28;">Redis</strong> cluster updated by one atomic Lua script per check. At 500,000 requests/s and 5 million keys that is about 0.5 GB of token-bucket state and around 5-10 shards.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Accuracy vs cost:</strong> <span style="color:#f0e2c8;">Local-only limits are wrong under uneven load — in my run 74 or 120 admitted against 100. Central is exact but one round trip per request; <strong style="color:#ffca28;">token leasing</strong> cut store calls from 120 to 36 while staying under the limit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Failure:</strong> <span style="color:#f0e2c8;">Tight timeout plus circuit breaker; <strong style="color:#ffca28;">fail open</strong> with a local per-node fallback for plan limits (116 admitted vs 119 normally in the outage), <strong style="color:#ffca28;">fail closed</strong> for login and SMS limits. Per-region limits for multi-region.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just put the limiter inside each service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then every service reimplements it, rejected requests still cost service resources, and limits per customer are spread across services. The gateway sees every request once; services can still keep their own concurrency limits for expensive dependencies.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a customer whose traffic overloads one Redis shard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Split the hot key into sub-keys with a share of the limit each, or give that tenant leased tokens so most decisions are local. Also make sure the key includes the tenant so one customer does not share a shard key with everyone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you limit globally across three regions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually I do not do it exactly: each region gets a share of the limit and enforces it locally, optionally rebalancing shares from observed traffic. Only billing-grade quotas go to a single home region and accept the extra latency.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if a request matches three rules?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Evaluate them together in one script: if any rule denies, deny and consume nothing; if all allow, consume from each. Return the rule closest to its limit for the headers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the limiter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Deterministic tests with a fake clock for each algorithm, a concurrency test with many clients hitting one key against a real Redis to prove no over-admission, and a game day where Redis is blocked to check the fail-open path and its alerting.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rate limiter | Counts requests per key and rejects those over a rate |
| API gateway | Entry point doing auth, routing and limiting before services |
| Local rate limiting | Each node enforces its own share in memory |
| Centralized rate limiting | Every node asks a shared store for each decision |
| Token leasing | Nodes take batches of tokens from the central bucket |
| Fail open / fail closed | Allow or reject when the limiter cannot decide |

**Conclusion:** A good rate limiter design is a small rule enforced consistently by many machines: a gateway middleware keyed by client and rule, a token bucket (or a sliding log for small exact limits) whose state lives in a sharded Redis behind one atomic script, rules pushed from a config service, and a clear contract of 429, \`Retry-After\` and remaining-budget headers. The run made the trade-offs concrete: local-only limits admitted 74 or 120 against 100, a central store was exact at one call per request, leases cut calls to 36 while staying under the limit, and during a store outage the failure policy decided between admitting 0, 250, or a sensible 116. Size it with numbers — 0.52 GB and about 5-10 Redis shards for 500,000 requests/s and 5 million keys under the stated assumptions — and know that hot keys and round trips break first at 10x.`,
    examples: [
      {
        label: `Distributed limiter: local vs central vs leased tokens, and fail-open vs fail-closed during a store outage`,
        variants: [
          { tech: "node", code: `// A distributed rate limiter in miniature: 4 gateway nodes, one API key limited to
// 100 requests/s (token bucket). The "central store" stands for Redis.
// Fake clock in ms; tokens are integers scaled by 1000 so every language agrees.
class Bucket {
  constructor(cap, perSec) { this.cap = cap * 1000; this.rate = perSec; this.units = this.cap; this.last = 0; }
  refill(t) { this.units = Math.min(this.cap, this.units + (t - this.last) * this.rate); this.last = t; }
  take(t, n) { this.refill(t); const got = Math.min(n, Math.floor(this.units / 1000)); this.units -= got * 1000; return got; }
}

const NODES = 4;
// a burst of 120 requests at t=0; the load balancer is uneven: per 20 requests, 10/6/3/1
const PATTERN = [0, 1, 0, 2, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 1];
const burst = [];
for (let i = 0; i < 120; i++) burst.push(PATTERN[i % 20]);

function report(name, admitted, calls, extra) {
  console.log("  " + name.padEnd(30) + "admitted " + String(admitted).padStart(3) + " of 120   store calls " + String(calls).padStart(3) + extra);
}

console.log("== 1. burst of 120 requests at t=0, limit 100");
{
  const per = [0, 0, 0, 0];
  for (const n of burst) per[n]++;
  console.log("  traffic per node: " + per.join(" "));
}
for (const capPerNode of [25, 100]) {
  const local = [];
  for (let i = 0; i < NODES; i++) local.push(new Bucket(capPerNode, capPerNode));
  let ok = 0;
  for (const n of burst) ok += local[n].take(0, 1);
  report("local only, " + capPerNode + " per node", ok, 0, "");
}
{
  const central = new Bucket(100, 100);
  let ok = 0, calls = 0;
  for (const n of burst) { calls++; ok += central.take(0, 1); }
  report("central store, every request", ok, calls, "");
}
{
  const central = new Bucket(100, 100);
  const held = [0, 0, 0, 0];
  let ok = 0, calls = 0;
  for (const n of burst) {
    if (held[n] === 0) { calls++; held[n] += central.take(0, 10); }
    if (held[n] > 0) { held[n]--; ok++; }
  }
  report("central store, leases of 10", ok, calls, "   tokens stranded on nodes " + held.join(" "));
}

console.log("== 2. 250 requests/s for 3 s, round-robin; limit 100/s (burst 20); store down 1000-1999 ms");
for (const policy of ["fail-closed", "fail-open", "fallback to local 25/node"]) {
  const central = new Bucket(20, 100);
  const local = [];
  for (let i = 0; i < NODES; i++) local.push(new Bucket(5, 25));
  const perSec = [0, 0, 0];
  for (let i = 0; i < 750; i++) {
    const t = i * 4, n = i % NODES;
    let ok;
    if (t >= 1000 && t < 2000) {
      ok = policy === "fail-closed" ? 0 : policy === "fail-open" ? 1 : local[n].take(t, 1);
    } else ok = central.take(t, 1);
    perSec[Math.floor(t / 1000)] += ok;
  }
  console.log("  " + policy.padEnd(26) + "admitted per second " + perSec.map((x) => String(x).padStart(3)).join(" "));
}` },
          { tech: "python", code: `# A distributed rate limiter in miniature: 4 gateway nodes, one API key limited to
# 100 requests/s (token bucket). The "central store" stands for Redis.
# Fake clock in ms; tokens are integers scaled by 1000 so every language agrees.
class Bucket:
    def __init__(self, cap, per_sec):
        self.cap = cap * 1000
        self.rate = per_sec
        self.units = self.cap
        self.last = 0

    def refill(self, t):
        self.units = min(self.cap, self.units + (t - self.last) * self.rate)
        self.last = t

    def take(self, t, n):
        self.refill(t)
        got = min(n, self.units // 1000)
        self.units -= got * 1000
        return got


NODES = 4
# a burst of 120 requests at t=0; the load balancer is uneven: per 20 requests, 10/6/3/1
PATTERN = [0, 1, 0, 2, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 1]
burst = [PATTERN[i % 20] for i in range(120)]


def report(name, admitted, calls, extra):
    print(f"  {name:<30}admitted {admitted:>3} of 120   store calls {calls:>3}{extra}")


print("== 1. burst of 120 requests at t=0, limit 100")
per = [0, 0, 0, 0]
for n in burst:
    per[n] += 1
print("  traffic per node: " + " ".join(str(x) for x in per))

for cap_per_node in [25, 100]:
    local = [Bucket(cap_per_node, cap_per_node) for _ in range(NODES)]
    ok = sum(local[n].take(0, 1) for n in burst)
    report(f"local only, {cap_per_node} per node", ok, 0, "")

central = Bucket(100, 100)
ok = calls = 0
for n in burst:
    calls += 1
    ok += central.take(0, 1)
report("central store, every request", ok, calls, "")

central = Bucket(100, 100)
held = [0, 0, 0, 0]
ok = calls = 0
for n in burst:
    if held[n] == 0:
        calls += 1
        held[n] += central.take(0, 10)
    if held[n] > 0:
        held[n] -= 1
        ok += 1
report("central store, leases of 10", ok, calls, "   tokens stranded on nodes " + " ".join(str(x) for x in held))

print("== 2. 250 requests/s for 3 s, round-robin; limit 100/s (burst 20); store down 1000-1999 ms")
for policy in ["fail-closed", "fail-open", "fallback to local 25/node"]:
    central = Bucket(20, 100)
    local = [Bucket(5, 25) for _ in range(NODES)]
    per_sec = [0, 0, 0]
    for i in range(750):
        t, n = i * 4, i % NODES
        if 1000 <= t < 2000:
            ok = 0 if policy == "fail-closed" else 1 if policy == "fail-open" else local[n].take(t, 1)
        else:
            ok = central.take(t, 1)
        per_sec[t // 1000] += ok
    print(f"  {policy:<26}admitted per second " + " ".join(f"{x:>3}" for x in per_sec))` },
          { tech: "go", code: `// A distributed rate limiter in miniature: 4 gateway nodes, one API key limited to
// 100 requests/s (token bucket). The "central store" stands for Redis.
// Fake clock in ms; tokens are integers scaled by 1000 so every language agrees.
package main

import (
	"fmt"
	"strings"
)

type Bucket struct{ cap, rate, units, last int64 }

func NewBucket(cap, perSec int64) *Bucket { return &Bucket{cap * 1000, perSec, cap * 1000, 0} }
func (b *Bucket) refill(t int64) {
	b.units = min(b.cap, b.units+(t-b.last)*b.rate)
	b.last = t
}
func (b *Bucket) Take(t, n int64) int64 {
	b.refill(t)
	got := min(n, b.units/1000)
	b.units -= got * 1000
	return got
}

const NODES = 4

var PATTERN = []int{0, 1, 0, 2, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 1}

func report(name string, admitted, calls int64, extra string) {
	fmt.Printf("  %-30sadmitted %3d of 120   store calls %3d%s\\n", name, admitted, calls, extra)
}

func join(xs []int64, width int) string {
	parts := []string{}
	for _, x := range xs {
		parts = append(parts, fmt.Sprintf("%*d", width, x))
	}
	return strings.Join(parts, " ")
}

func main() {
	// a burst of 120 requests at t=0; the load balancer is uneven: per 20 requests, 10/6/3/1
	burst := []int{}
	for i := 0; i < 120; i++ {
		burst = append(burst, PATTERN[i%20])
	}

	fmt.Println("== 1. burst of 120 requests at t=0, limit 100")
	per := []int64{0, 0, 0, 0}
	for _, n := range burst {
		per[n]++
	}
	fmt.Println("  traffic per node: " + join(per, 0))

	for _, capPerNode := range []int64{25, 100} {
		local := []*Bucket{}
		for i := 0; i < NODES; i++ {
			local = append(local, NewBucket(capPerNode, capPerNode))
		}
		var ok int64
		for _, n := range burst {
			ok += local[n].Take(0, 1)
		}
		report(fmt.Sprintf("local only, %d per node", capPerNode), ok, 0, "")
	}
	{
		central := NewBucket(100, 100)
		var ok, calls int64
		for range burst {
			calls++
			ok += central.Take(0, 1)
		}
		report("central store, every request", ok, calls, "")
	}
	{
		central := NewBucket(100, 100)
		held := []int64{0, 0, 0, 0}
		var ok, calls int64
		for _, n := range burst {
			if held[n] == 0 {
				calls++
				held[n] += central.Take(0, 10)
			}
			if held[n] > 0 {
				held[n]--
				ok++
			}
		}
		report("central store, leases of 10", ok, calls, "   tokens stranded on nodes "+join(held, 0))
	}

	fmt.Println("== 2. 250 requests/s for 3 s, round-robin; limit 100/s (burst 20); store down 1000-1999 ms")
	for _, policy := range []string{"fail-closed", "fail-open", "fallback to local 25/node"} {
		central := NewBucket(20, 100)
		local := []*Bucket{}
		for i := 0; i < NODES; i++ {
			local = append(local, NewBucket(5, 25))
		}
		perSec := []int64{0, 0, 0}
		for i := 0; i < 750; i++ {
			t, n := int64(i*4), i%NODES
			var ok int64
			if t >= 1000 && t < 2000 {
				switch policy {
				case "fail-closed":
					ok = 0
				case "fail-open":
					ok = 1
				default:
					ok = local[n].Take(t, 1)
				}
			} else {
				ok = central.Take(t, 1)
			}
			perSec[t/1000] += ok
		}
		fmt.Printf("  %-26sadmitted per second %s\\n", policy, join(perSec, 3))
	}
}` },
          { tech: "java", code: `// A distributed rate limiter in miniature: 4 gateway nodes, one API key limited to
// 100 requests/s (token bucket). The "central store" stands for Redis.
// Fake clock in ms; tokens are integers scaled by 1000 so every language agrees.
import java.util.ArrayList;
import java.util.List;

public class Main {
    static class Bucket {
        long cap, rate, units, last = 0;
        Bucket(long cap, long perSec) { this.cap = cap * 1000; this.rate = perSec; this.units = this.cap; }
        void refill(long t) { units = Math.min(cap, units + (t - last) * rate); last = t; }
        long take(long t, long n) {
            refill(t);
            long got = Math.min(n, units / 1000);
            units -= got * 1000;
            return got;
        }
    }

    static final int NODES = 4;
    static final int[] PATTERN = {0, 1, 0, 2, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 1};

    static void report(String name, long admitted, long calls, String extra) {
        System.out.println(String.format("  %-30sadmitted %3d of 120   store calls %3d", name, admitted, calls) + extra);
    }

    static String join(long[] xs, int width) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < xs.length; i++) {
            if (i > 0) sb.append(" ");
            sb.append(width == 0 ? String.valueOf(xs[i]) : String.format("%" + width + "d", xs[i]));
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        // a burst of 120 requests at t=0; the load balancer is uneven: per 20 requests, 10/6/3/1
        List<Integer> burst = new ArrayList<>();
        for (int i = 0; i < 120; i++) burst.add(PATTERN[i % 20]);

        System.out.println("== 1. burst of 120 requests at t=0, limit 100");
        long[] per = new long[4];
        for (int n : burst) per[n]++;
        System.out.println("  traffic per node: " + join(per, 0));

        for (long capPerNode : new long[]{25, 100}) {
            Bucket[] local = new Bucket[NODES];
            for (int i = 0; i < NODES; i++) local[i] = new Bucket(capPerNode, capPerNode);
            long ok = 0;
            for (int n : burst) ok += local[n].take(0, 1);
            report("local only, " + capPerNode + " per node", ok, 0, "");
        }
        {
            Bucket central = new Bucket(100, 100);
            long ok = 0, calls = 0;
            for (int n : burst) { calls++; ok += central.take(0, 1); }
            report("central store, every request", ok, calls, "");
        }
        {
            Bucket central = new Bucket(100, 100);
            long[] held = new long[4];
            long ok = 0, calls = 0;
            for (int n : burst) {
                if (held[n] == 0) { calls++; held[n] += central.take(0, 10); }
                if (held[n] > 0) { held[n]--; ok++; }
            }
            report("central store, leases of 10", ok, calls, "   tokens stranded on nodes " + join(held, 0));
        }

        System.out.println("== 2. 250 requests/s for 3 s, round-robin; limit 100/s (burst 20); store down 1000-1999 ms");
        for (String policy : new String[]{"fail-closed", "fail-open", "fallback to local 25/node"}) {
            Bucket central = new Bucket(20, 100);
            Bucket[] local = new Bucket[NODES];
            for (int i = 0; i < NODES; i++) local[i] = new Bucket(5, 25);
            long[] perSec = new long[3];
            for (int i = 0; i < 750; i++) {
                long t = i * 4L;
                int n = i % NODES;
                long ok;
                if (t >= 1000 && t < 2000) {
                    ok = policy.equals("fail-closed") ? 0 : policy.equals("fail-open") ? 1 : local[n].take(t, 1);
                } else ok = central.take(t, 1);
                perSec[(int) (t / 1000)] += ok;
            }
            System.out.println(String.format("  %-26sadmitted per second ", policy) + join(perSec, 3));
        }
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How would you design a unique ID generator at scale?`,
    difficulty: "hard",
    seoDescription: `Design a unique ID generator: UUIDv4, UUIDv7, ticket servers and Snowflake compared, bit layout math, sequence overflow, clock rollback and worker IDs.`,
    description: `**Question presented to candidate:**
"Every tweet, order and message in our system needs an ID. We write about 20,000 rows a second across many database shards, peaks are ten times that, and we want IDs that are unique without a central bottleneck and roughly sortable by creation time. How would you generate them?"

**What a strong answer should cover:**
- Requirements: uniqueness across machines, size (64-bit fits a \`BIGINT\`, 128-bit does not), **time-sortable** (k-sorted) or not, throughput, no single point of failure, whether IDs may leak information (volume, creation time)
- Options and trade-offs: database **auto-increment**, **ticket servers** (Flickr), **range allocation**, **UUIDv4** (random, 128-bit, poor index locality), **UUIDv7** (RFC 9562, time-ordered, 128-bit), **Snowflake** (64-bit: timestamp + machine + sequence)
- Snowflake bit math: 41 bits of milliseconds last about 69 years from a custom epoch, 10 bits give 1,024 workers, 12 bits give 4,096 IDs per ms per worker
- Hard parts: **sequence overflow** within a millisecond (wait for the next ms), **clock moving backwards** (refuse or wait), unique **worker ID assignment** (config, or leases from a coordination service), and IDs only k-sorted across machines
- Practical details: IDs above 2^53 lose precision in JavaScript, so APIs send them as strings

**Clarifying questions expected:**
- Must IDs be 64-bit integers, or is a 128-bit value acceptable?
- Do they need to be sortable by time, and is it acceptable that they reveal creation time?
- How many generating machines, and how is a machine identity assigned?

**Code / implementation expected:** Yes — a Snowflake-style generator; the example runs one on a fake clock through sequence overflow, a clock rollback and a duplicate worker ID.`,
    answer: `**Target Audience:** Developers preparing for system design interviews. You know what a primary key is; no distributed-systems background assumed.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A city has one office that hands out house numbers. Every builder must queue there before putting up a house. It works for a village; for a city it is a bottleneck, and when the office closes for a day, nobody can build.

So the city changes the rule: a house number is the **date and minute it was registered, plus the builder's licence number, plus a counter the builder keeps for that minute**. No queue: every builder makes numbers on their own, they never clash because licence numbers differ, and sorting numbers roughly sorts houses by age. The new problems are subtle ones: two builders given the same licence, a builder whose watch runs backwards, and a builder who registers more houses in one minute than his counter allows.

That is the Snowflake design, and those three problems are what an interviewer will probe.

📌 **Interview term: distributed ID generation** — creating unique identifiers on many machines without asking a central service for each one. The goals usually are uniqueness, a fixed small size, rough time order, and no single point of failure.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| 64-bit integer, or is 128-bit acceptable? | 64-bit rules out UUIDs; it fits a \`BIGINT\` column and is half the index size |
| Must IDs sort by creation time? | Time-ordered IDs make B-tree inserts append-only and let you page by ID |
| What rate, and how many generating machines? | Sizes the sequence and machine bits |
| Is it acceptable that IDs reveal creation time and volume? | Snowflake and UUIDv7 expose time; sequential IDs expose growth to competitors |
| Can we depend on a coordination service (ZooKeeper, etcd) or a database at startup? | Decides how machines get their worker IDs |
| Who consumes the IDs — browsers, mobile apps? | JavaScript cannot hold integers above 2^53 exactly |

## 3. Requirements and Capacity

**Functional**: \`nextId()\` returns a unique ID; IDs can be decoded to a creation time (useful for debugging and time-range queries).

**Non-functional**: unique across all machines forever; 64-bit; roughly time-ordered; generation in microseconds with no network call; survives the loss of any machine.

Worked numbers (assumptions from the question):

| Quantity | Arithmetic | Result |
| :--- | :--- | :--- |
| IDs per day at 20,000/s | 20,000 x 86,400 | 1.728 billion |
| Peak rate | 10 x 20,000 | 200,000 IDs/s |
| One Snowflake worker, 12-bit sequence | 4,096 per ms x 1,000 | 4,096,000 IDs/s |
| Workers needed for the peak | 200,000 / 4,096,000 | 0.05 of one worker — throughput is not the constraint |
| Timestamp range, 41 bits of ms | 2^41 ms / (365.25 x 86,400,000) | 69.7 years |
| Primary key storage, 10 billion rows | 8 bytes vs 16 bytes vs 36-char text | 80 GB vs 160 GB vs 360 GB |

Throughput per machine is enormous, so in practice you run one generator per application server (an embedded library), and the real design work is in uniqueness and clocks. The arithmetic method is in [back-of-the-envelope capacity estimation](/interview-question/how-do-you-approach-back-of-the-envelope-capacity-estimation).

## 4. The Options

📌 **Interview term: auto-increment** — the database assigns 1, 2, 3... Simple and compact, but it is one counter in one database: it does not work across [shards](/interview-question/what-is-database-sharding) without coordination, and it exposes your growth rate.

📌 **Interview term: ticket server** — a dedicated database whose only job is handing out auto-increment values. Flickr described this in 2010: a \`Tickets64\` table, \`REPLACE INTO Tickets64 (stub) VALUES ('a')\` followed by \`SELECT LAST_INSERT_ID()\`, run on dedicated ticket servers (Flickr engineering blog, "Ticket Servers: Distributed Unique Primary Keys on the Cheap"). Secondary write-ups describe two such servers handing out odd and even numbers for availability; I could not confirm that exact configuration in the original post text. Every ID still costs a network round trip.

📌 **Interview term: range allocation (segment allocation)** — each application server reserves a block (say 10,000 IDs) from a central counter and hands them out locally; one round trip per block instead of per ID. Gaps appear when a server restarts with an unused block, and IDs are only ordered within a block.

📌 **Interview term: UUID** — a 128-bit identifier defined by RFC 9562 (published May 2024, replacing RFC 4122). **Version 4** is random: no coordination at all, but random values scatter inserts across a B-tree index. **Version 7** puts a 48-bit Unix timestamp in milliseconds first and fills the rest with random bits (apart from version and variant bits), so new values sort after old ones (RFC 9562).

📌 **Interview term: Snowflake ID** — Twitter's 64-bit format, announced in June 2010: a sign bit left at 0, 41 bits of milliseconds since a custom epoch, 10 bits of machine identity and 12 bits of per-millisecond sequence (Wikipedia, "Snowflake ID"; Twitter developer docs, "Twitter IDs"). The Twitter epoch is 1288834974657 ms, which is 2010-11-04 01:42:54.657 UTC. Discord uses the same idea with an epoch of 1420070400000, the first second of 2015 (Discord developer documentation). Instagram generated a variant inside PostgreSQL with PL/pgSQL: 41 bits of time, 13 bits of logical shard ID and 10 bits of sequence (Instagram Engineering, "Sharding & IDs at Instagram").

| | Auto-increment | Ticket server | Range allocation | UUIDv4 | UUIDv7 | Snowflake |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Size | 64-bit | 64-bit | 64-bit | 128-bit | 128-bit | 64-bit |
| Coordination per ID | the DB | network call | none (per block) | none | none | none |
| Time-ordered | yes (one DB) | yes | roughly | no | yes (ms) | yes (ms, k-sorted) |
| Single point of failure | the DB | ticket servers | counter, rarely | none | none | worker ID assignment, at startup |
| Main risk | sharding, leaks growth | latency, availability | gaps | index locality, size | size | clocks, duplicate worker IDs |

## 5. Snowflake Bit Layout

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Snowflake 64-bit layout: 1 sign bit, 41 bits timestamp in ms, 5 bits datacenter, 5 bits worker, 12 bits sequence">
  <rect class="d-box-muted" x="20" y="40" width="60" height="70" rx="6"/>
  <text class="d-text" x="50" y="72" text-anchor="middle">0</text>
  <text class="d-sub" x="50" y="94" text-anchor="middle">1 bit</text>
  <rect class="d-box-accent" x="100" y="40" width="320" height="70" rx="6"/>
  <text class="d-text" x="260" y="72" text-anchor="middle">timestamp, ms since epoch</text>
  <text class="d-sub" x="260" y="94" text-anchor="middle">41 bits</text>
  <rect class="d-box" x="440" y="40" width="80" height="70" rx="6"/>
  <text class="d-text" x="480" y="72" text-anchor="middle">dc</text>
  <text class="d-sub" x="480" y="94" text-anchor="middle">5 bits</text>
  <rect class="d-box" x="540" y="40" width="80" height="70" rx="6"/>
  <text class="d-text" x="580" y="72" text-anchor="middle">worker</text>
  <text class="d-sub" x="580" y="94" text-anchor="middle">5 bits</text>
  <rect class="d-box" x="640" y="40" width="100" height="70" rx="6"/>
  <text class="d-text" x="690" y="72" text-anchor="middle">sequence</text>
  <text class="d-sub" x="690" y="94" text-anchor="middle">12 bits</text>
</svg>

The timestamp occupies the high bits, so comparing two IDs compares their milliseconds first; machine bits and the sequence only break ties within the same millisecond.

The core of the generator (from the example):

~~~js
let ts = this.clock.now();
if (ts < this.last) { /* clock went backwards: refuse or wait, see section 7 */ }
if (ts === this.last) {
  this.seq = (this.seq + 1n) & MAX_SEQ;
  if (this.seq === 0n) { this.clock.sleepUntil(this.last + 1n); ts = this.last + 1n; } // 4096 used this ms
} else this.seq = 0n;
this.last = ts;
return ((ts - EPOCH) << 22n) | (this.dc << 17n) | (this.worker << 12n) | this.seq;
~~~

Three IDs from datacenter 1, worker 3:

~~~text
== 1. three IDs from datacenter 1, worker 3
  1976209350456389632  ms=1760000000000 dc=1 worker=3 seq=0
  1976209350456389633  ms=1760000000000 dc=1 worker=3 seq=1
  1976209350460583936  ms=1760000000001 dc=1 worker=3 seq=0
~~~

Two IDs in the same millisecond differ by 1 (the sequence); the next millisecond adds 4,194,304 = 2^22, because the timestamp starts at bit 22.

## 6. Deep Dive 1: More Than 4,096 IDs in One Millisecond

📌 **Interview term: sequence overflow** — the 12-bit sequence allows 4,096 IDs per millisecond per worker. Request number 4,097 must not wrap around to 0 in the same millisecond, or it would repeat an ID. The generator waits for the next millisecond:

~~~text
== 2. 5000 IDs requested while the clock is frozen
  ms 1760000000100: 4096 IDs
  ms 1760000000101: 904 IDs
  generator waited 1 ms, strictly increasing: true
~~~

5,000 requests with the clock frozen: 4,096 got the first millisecond, the generator waited 1 ms, and the remaining 904 got the next. All 5,000 were strictly increasing. Waiting at most 1 ms is acceptable; if a workload really needs more, give the sequence more bits and the machine field fewer.

## 7. Deep Dive 2: The Clock Goes Backwards

Servers correct their clocks with NTP, and a correction can step the clock **backwards**. If the generator then reuses a millisecond it already used, with a sequence that restarts at 0, it produces duplicates. Two safe policies:

~~~text
== 3. the clock steps back 5 ms (an NTP correction)
  refuse error: clock moved back 5 ms, refusing
  wait   next ID 1976209351295250433 > previous 1976209351295250432: true, waited 5 ms
~~~

📌 **Interview term: clock rollback** — the wall clock moving backwards. **Refuse** (throw, and let the caller retry or fail over to another worker) is the safest for long jumps; **wait** until the clock passes the last used millisecond is fine for small steps — here it waited 5 ms and still produced an ID greater than the previous one. A common combination: wait if the step is a few milliseconds, refuse and alert beyond that. Persisting the last timestamp on shutdown protects against a machine restarting with a clock that is behind.

## 8. Deep Dive 3: Assigning Worker IDs

Everything rests on **no two running generators sharing the same datacenter and worker bits**. If they do:

~~~text
== 5. two processes misconfigured with the same worker ID
  2000 IDs generated, duplicates: 1000
~~~

Two processes both configured as worker 7 produced 1,000 duplicates out of 2,000 IDs — every ID one process made, the other made too. Ways to assign worker IDs:

- **Static configuration** per host: simple, but easy to break when an autoscaling group clones a machine.
- **Lease from a coordination service** (ZooKeeper, etcd): at startup a process claims a free worker number with a lease that it renews; if it cannot renew, it must stop generating before the lease expires. The same building block as [leader election](/interview-question/what-is-leader-election-in-distributed-systems).
- **Derive from something unique** such as a database shard number (Instagram used the logical shard ID) or a slice of the host IP, checking for collisions.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 210" role="img" aria-label="Application servers each claim a worker ID lease from a coordination service at startup, then generate IDs locally without network calls">
  <defs>
    <marker id="sd11q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="60" rx="10"/>
  <text class="d-text" x="360" y="47" text-anchor="middle">coordination service</text>
  <text class="d-sub" x="360" y="67" text-anchor="middle">worker ID leases</text>
  <rect class="d-box" x="20" y="140" width="190" height="56" rx="10"/>
  <text class="d-text" x="115" y="165" text-anchor="middle">app server A</text>
  <text class="d-sub" x="115" y="185" text-anchor="middle">worker 1</text>
  <rect class="d-box" x="265" y="140" width="190" height="56" rx="10"/>
  <text class="d-text" x="360" y="165" text-anchor="middle">app server B</text>
  <text class="d-sub" x="360" y="185" text-anchor="middle">worker 2</text>
  <rect class="d-box" x="510" y="140" width="190" height="56" rx="10"/>
  <text class="d-text" x="605" y="165" text-anchor="middle">app server C</text>
  <text class="d-sub" x="605" y="185" text-anchor="middle">worker 3</text>
  <path class="d-edge-dashed" d="M 115 140 L 290 86" marker-end="url(#sd11q5-arrow)"/>
  <path class="d-edge-dashed" d="M 360 140 L 360 86" marker-end="url(#sd11q5-arrow)"/>
  <path class="d-edge-dashed" d="M 605 140 L 430 86" marker-end="url(#sd11q5-arrow)"/>
</svg>

Dashed arrows are the startup claim and periodic renewal; generating an ID afterwards involves no network call at all.

## 9. Deep Dive 4: Ordering Is Only Roughly Right

📌 **Interview term: k-sorted** — "roughly sorted": IDs sort by time to the millisecond, but within the same millisecond they sort by machine bits, not by real arrival order, and across machines only as well as their clocks agree.

~~~text
== 4. two workers, interleaved over 3 ms, then sorted by ID
  w1@300 w2@300 w1@301 w2@301 w1@302 w2@302
~~~

In every millisecond worker 2 generated first, yet after sorting worker 1 comes first, because its machine bits are smaller. That is fine for paging and index locality; it is not a substitute for a real sequence when strict order matters (a ledger, a chat message order inside one conversation — use a per-conversation sequence there).

## 10. Practical Details

**JavaScript precision.** Snowflake IDs are larger than 2^53, the largest integer a JavaScript number holds exactly. Parsing one from JSON as a number silently changes it (run with Node 22.22):

~~~text
JSON.parse -> 1976209350456389600
as BigInt  -> 1976209350456389633
2^53 - 1   -> 9007199254740991
~~~

The last two digits changed from 33 to 00. Twitter added an \`id_str\` field for this reason and tells clients to use it (Twitter developer docs, "Twitter IDs"); Mastodon returns its IDs as strings for the same reason. Serialise 64-bit IDs as strings in public APIs.

**Information leakage.** A time-ordered ID reveals when a record was created, and sequential IDs reveal how many exist. If that matters (invoice numbers, user IDs in URLs), keep the Snowflake as the internal key and expose a random public ID.

**Limits of the layout** (from the run):

~~~text
== 6. limits of this layout
  41-bit timestamp lasts 69 years, until Unix ms 3487858230208
  per worker: 4096000 IDs/s; workers: 1024
  largest ID 9223372036854775807 fits a signed 64-bit integer: true
~~~

With the Twitter epoch the 41-bit timestamp runs out at Unix ms 3487858230208, which is 2080-07-10 UTC. A new system should pick its own recent epoch to get the full 69 years.

## 11. What Breaks First at 10x

At 200,000 IDs/s, then 2,000,000 IDs/s, the generator is still nowhere near 4,096,000 per worker. What breaks is operational: more machines means more worker IDs (1,024 is the ceiling with 10 bits, so autoscaling fleets need leases and reuse), more clock incidents, and more consumers that mishandle 64-bit integers. If the fleet grows beyond 1,024 generators, either take bits from the sequence or move generation to a smaller set of ID service nodes.

## 12. Verified: Running the Code

The example **"Snowflake IDs on a fake clock: layout, sequence overflow, clock going backwards, ordering, duplicate worker IDs"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and Java 21. All four print exactly this:

~~~text
== 1. three IDs from datacenter 1, worker 3
  1976209350456389632  ms=1760000000000 dc=1 worker=3 seq=0
  1976209350456389633  ms=1760000000000 dc=1 worker=3 seq=1
  1976209350460583936  ms=1760000000001 dc=1 worker=3 seq=0
== 2. 5000 IDs requested while the clock is frozen
  ms 1760000000100: 4096 IDs
  ms 1760000000101: 904 IDs
  generator waited 1 ms, strictly increasing: true
== 3. the clock steps back 5 ms (an NTP correction)
  refuse error: clock moved back 5 ms, refusing
  wait   next ID 1976209351295250433 > previous 1976209351295250432: true, waited 5 ms
== 4. two workers, interleaved over 3 ms, then sorted by ID
  w1@300 w2@300 w1@301 w2@301 w1@302 w2@302
== 5. two processes misconfigured with the same worker ID
  2000 IDs generated, duplicates: 1000
== 6. limits of this layout
  41-bit timestamp lasts 69 years, until Unix ms 3487858230208
  per worker: 4096000 IDs/s; workers: 1024
  largest ID 9223372036854775807 fits a signed 64-bit integer: true
~~~

What the simulation stands for and what it leaves out: the clock is a fake millisecond counter, and "waiting" advances it instead of sleeping, so runs are instant and repeatable. Worker IDs are passed in directly; there is no coordination service, no persistence of the last timestamp and no threads (a real generator needs a lock or an atomic compare-and-swap around \`last\` and \`seq\`). Node uses \`BigInt\` because the IDs exceed 2^53.

## Edge Cases Worth Knowing

- **Thread safety**: two threads calling \`next()\` at once can read the same \`seq\`; guard it with a mutex or an atomic.
- **Leap seconds and VM pauses**: a paused VM resumes with a clock jump forward (harmless) or a correction backwards (section 7).
- **Low traffic**: if most milliseconds have one ID, the sequence is almost always 0, so the low 12 bits are zero and \`id % 4096\` is nearly always 0 — harmless as an ID, but a bad shard key or hash input without mixing.
- **Shard key**: do not shard by raw Snowflake ranges; recent IDs all land on the newest range. Hash the ID or shard by another key.

## Common Pitfalls

- **Duplicate worker IDs** — the run produced 1,000 duplicates out of 2,000 IDs from two processes configured as worker 7.
- **Ignoring clock rollback** — without the check, a 5 ms step back reuses milliseconds and repeats IDs.
- **Wrapping the sequence** — the 4,097th ID in a millisecond must wait, not restart at 0.
- **Sending IDs as JSON numbers** — \`JSON.parse\` turned 1976209350456389633 into 1976209350456389600.
- **Choosing UUIDv4 for a hot B-tree primary key without thinking** — random keys scatter inserts; UUIDv7 or Snowflake keeps them append-mostly.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Requirements:</strong> <span style="color:#f0e2c8;">I confirm size (64-bit or 128), time order, rate and whether IDs may reveal creation time, then rule out a central counter because it is a bottleneck and a single point of failure.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Options:</strong> <span style="color:#f0e2c8;">Auto-increment and <strong style="color:#ffca28;">ticket servers</strong> need a network call per ID; <strong style="color:#ffca28;">UUIDv4</strong> needs nothing but is 128-bit and random; <strong style="color:#ffca28;">UUIDv7</strong> is time-ordered but still 128-bit. For a 64-bit sortable ID I pick <strong style="color:#ffca28;">Snowflake</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Layout:</strong> <span style="color:#f0e2c8;">41 bits of milliseconds from a custom epoch (about 69 years), 10 bits of machine ID (1,024 generators), 12 bits of sequence (4,096 per ms, about 4 million per second per machine). It runs as a library, no network call per ID.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Hard parts:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Sequence overflow</strong>: wait for the next millisecond. <strong style="color:#ffca28;">Clock rollback</strong>: wait for small steps, refuse beyond a threshold. <strong style="color:#ffca28;">Worker IDs</strong>: leased from etcd or ZooKeeper so two processes never share one — in my run a shared worker ID gave 1,000 duplicates out of 2,000.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;">IDs are <strong style="color:#ffca28;">k-sorted</strong>, not strictly ordered across machines; send them as strings because JavaScript loses precision above 2^53; expose a random public ID if creation time is sensitive.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use UUIDv4?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is 128 bits, which doubles key and index size (160 GB vs 80 GB of primary key for 10 billion rows), and it is random, so inserts land all over the [B-tree index](/interview-question/database-indexing-btrees) instead of at the end. If 128 bits are acceptable, UUIDv7 fixes the ordering problem; if the column must be a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BIGINT</code>, Snowflake.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when NTP moves the clock back by 2 seconds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The generator sees <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">now &lt; last</code>. Waiting 2 seconds would stall every request, so beyond a small threshold it refuses, the caller retries on another instance, and an alert fires. For a few milliseconds it simply waits, as the run did for 5 ms.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you assign worker IDs in an autoscaling group?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each instance claims a free number from a coordination service with a lease and renews it; if renewal fails it stops generating before the lease expires, so a number is never held by two live processes. Numbers are recycled after a lease expires plus a safety margin.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can two IDs from different machines be out of order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Within a millisecond they sort by machine bits, not arrival time, and machines with skewed clocks can disagree by milliseconds. The run shows worker 2 generating first in each millisecond but sorting after worker 1. Where strict order matters, use a per-entity sequence.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is a ticket server different from range allocation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A ticket server is called for every ID, so its latency and availability are on every write. Range allocation fetches a block of thousands at a time and hands them out locally, so the central counter is touched rarely, at the price of gaps and only per-block ordering.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Distributed ID generation | Creating unique IDs on many machines without a central call per ID |
| Auto-increment | The database counter 1, 2, 3 |
| Ticket server | A database dedicated to handing out auto-increment values |
| Range allocation | Reserving blocks of IDs from a central counter |
| UUID | 128-bit identifier from RFC 9562; v4 random, v7 time-ordered |
| Snowflake ID | 64-bit ID: timestamp, machine bits, sequence |
| Sequence overflow | More IDs in one millisecond than the sequence allows |
| Clock rollback | The wall clock stepping backwards |
| K-sorted | Sorted by time only to the resolution and accuracy of the clocks |

**Conclusion:** A unique ID generator at scale is usually a Snowflake-style library on every server: 41 bits of milliseconds, 10 bits of worker identity and 12 bits of sequence, giving 4,096,000 IDs per second per worker and about 69 years from a custom epoch — far more throughput than the 200,000 per second peak in the question. The design work is in the failure cases the run demonstrated: waiting 1 ms when 4,096 IDs are used up, waiting out or refusing a backwards clock step, and never letting two processes share a worker ID (which produced 1,000 duplicates). Add the practical details — k-sorted rather than strictly ordered, strings in JSON because 2^53 is too small, a random public ID where creation time is sensitive — and compare honestly with UUIDv7 when 128 bits are acceptable. The ID scheme also feeds designs such as the [URL shortener](/interview-question/how-would-you-design-a-url-shortener-like-tinyurl), where a unique number is encoded into a short code.`,
    examples: [
      {
        label: `Snowflake IDs on a fake clock: layout, sequence overflow, clock going backwards, ordering, duplicate worker IDs`,
        variants: [
          { tech: "node", code: `// A Snowflake-style 64-bit ID generator on a fake clock.
// Layout: 1 unused sign bit | 41 bits ms since a custom epoch | 5 datacenter | 5 worker | 12 sequence
const EPOCH = 1288834974657n; // the Twitter epoch, Unix ms
const SEQ_BITS = 12n, WORKER_BITS = 5n, DC_BITS = 5n;
const MAX_SEQ = (1n << SEQ_BITS) - 1n;

class FakeClock {
  constructor(ms) { this.ms = ms; this.waits = 0n; }
  now() { return this.ms; }
  sleepUntil(ms) { this.waits += ms - this.ms; this.ms = ms; }
}

class Snowflake {
  constructor(dc, worker, clock, onBackwards) {
    this.dc = BigInt(dc); this.worker = BigInt(worker); this.clock = clock;
    this.onBackwards = onBackwards; this.last = -1n; this.seq = 0n;
  }
  next() {
    let ts = this.clock.now();
    if (ts < this.last) {
      if (this.onBackwards === "refuse") throw new Error("clock moved back " + (this.last - ts) + " ms, refusing");
      this.clock.sleepUntil(this.last); // wait for the clock to catch up
      ts = this.last;
    }
    if (ts === this.last) {
      this.seq = (this.seq + 1n) & MAX_SEQ;
      if (this.seq === 0n) { this.clock.sleepUntil(this.last + 1n); ts = this.last + 1n; } // 4096 used this ms
    } else this.seq = 0n;
    this.last = ts;
    return ((ts - EPOCH) << 22n) | (this.dc << 17n) | (this.worker << 12n) | this.seq;
  }
}

function decode(id) {
  return { ms: (id >> 22n) + EPOCH, dc: (id >> 17n) & 31n, worker: (id >> 12n) & 31n, seq: id & MAX_SEQ };
}

console.log("== 1. three IDs from datacenter 1, worker 3");
const clock = new FakeClock(1760000000000n);
const gen = new Snowflake(1, 3, clock, "wait");
for (const step of [0n, 0n, 1n]) {
  clock.ms += step;
  const id = gen.next();
  const d = decode(id);
  console.log("  " + id + "  ms=" + d.ms + " dc=" + d.dc + " worker=" + d.worker + " seq=" + d.seq);
}

console.log("== 2. 5000 IDs requested while the clock is frozen");
{
  const c = new FakeClock(1760000000100n);
  const g = new Snowflake(1, 3, c, "wait");
  const perMs = new Map();
  let prev = -1n, increasing = true;
  for (let i = 0; i < 5000; i++) {
    const id = g.next();
    if (id <= prev) increasing = false;
    prev = id;
    const ms = decode(id).ms;
    perMs.set(ms, (perMs.get(ms) || 0) + 1);
  }
  for (const [ms, n] of perMs) console.log("  ms " + ms + ": " + n + " IDs");
  console.log("  generator waited " + c.waits + " ms, strictly increasing: " + increasing);
}

console.log("== 3. the clock steps back 5 ms (an NTP correction)");
for (const policy of ["refuse", "wait"]) {
  const c = new FakeClock(1760000000200n);
  const g = new Snowflake(1, 3, c, policy);
  const a = g.next();
  c.ms -= 5n;
  try {
    const b = g.next();
    console.log("  " + policy.padEnd(7) + "next ID " + b + " > previous " + a + ": " + (b > a) + ", waited " + c.waits + " ms");
  } catch (e) {
    console.log("  " + policy.padEnd(7) + "error: " + e.message);
  }
}

console.log("== 4. two workers, interleaved over 3 ms, then sorted by ID");
{
  const c = new FakeClock(1760000000300n);
  const w1 = new Snowflake(1, 1, c, "wait"), w2 = new Snowflake(1, 2, c, "wait");
  const ids = [];
  for (let ms = 0; ms < 3; ms++) {
    ids.push(["w2", w2.next()], ["w1", w1.next()]);
    c.ms += 1n;
  }
  ids.sort((x, y) => (x[1] < y[1] ? -1 : 1));
  console.log("  " + ids.map(([w, id]) => w + "@" + (decode(id).ms - 1760000000000n)).join(" "));
}

console.log("== 5. two processes misconfigured with the same worker ID");
{
  const c = new FakeClock(1760000000400n);
  const p1 = new Snowflake(1, 7, c, "wait"), p2 = new Snowflake(1, 7, c, "wait");
  const seen = new Set();
  let dupes = 0;
  for (let i = 0; i < 1000; i++) {
    for (const p of [p1, p2]) { const id = p.next(); if (seen.has(id)) dupes++; seen.add(id); }
    if (i % 100 === 99) c.ms += 1n;
  }
  console.log("  2000 IDs generated, duplicates: " + dupes);
}

console.log("== 6. limits of this layout");
const maxMs = (1n << 41n) - 1n;
console.log("  41-bit timestamp lasts " + maxMs / 31557600000n + " years, until Unix ms " + (EPOCH + maxMs));
console.log("  per worker: " + (MAX_SEQ + 1n) * 1000n + " IDs/s; workers: " + (1n << (DC_BITS + WORKER_BITS)));
console.log("  largest ID " + ((maxMs << 22n) | (1n << 22n) - 1n) + " fits a signed 64-bit integer: " + (((maxMs << 22n) | (1n << 22n) - 1n) <= 9223372036854775807n));` },
          { tech: "python", code: `# A Snowflake-style 64-bit ID generator on a fake clock.
# Layout: 1 unused sign bit | 41 bits ms since a custom epoch | 5 datacenter | 5 worker | 12 sequence
EPOCH = 1288834974657  # the Twitter epoch, Unix ms
SEQ_BITS, WORKER_BITS, DC_BITS = 12, 5, 5
MAX_SEQ = (1 << SEQ_BITS) - 1


class FakeClock:
    def __init__(self, ms):
        self.ms = ms
        self.waits = 0

    def now(self):
        return self.ms

    def sleep_until(self, ms):
        self.waits += ms - self.ms
        self.ms = ms


class Snowflake:
    def __init__(self, dc, worker, clock, on_backwards):
        self.dc, self.worker, self.clock = dc, worker, clock
        self.on_backwards = on_backwards
        self.last = -1
        self.seq = 0

    def next(self):
        ts = self.clock.now()
        if ts < self.last:
            if self.on_backwards == "refuse":
                raise RuntimeError(f"clock moved back {self.last - ts} ms, refusing")
            self.clock.sleep_until(self.last)  # wait for the clock to catch up
            ts = self.last
        if ts == self.last:
            self.seq = (self.seq + 1) & MAX_SEQ
            if self.seq == 0:  # 4096 used this ms
                self.clock.sleep_until(self.last + 1)
                ts = self.last + 1
        else:
            self.seq = 0
        self.last = ts
        return ((ts - EPOCH) << 22) | (self.dc << 17) | (self.worker << 12) | self.seq


def decode(i):
    return {"ms": (i >> 22) + EPOCH, "dc": (i >> 17) & 31, "worker": (i >> 12) & 31, "seq": i & MAX_SEQ}


def b(x):
    return "true" if x else "false"


print("== 1. three IDs from datacenter 1, worker 3")
clock = FakeClock(1760000000000)
gen = Snowflake(1, 3, clock, "wait")
for step in [0, 0, 1]:
    clock.ms += step
    i = gen.next()
    d = decode(i)
    print(f"  {i}  ms={d['ms']} dc={d['dc']} worker={d['worker']} seq={d['seq']}")

print("== 2. 5000 IDs requested while the clock is frozen")
c = FakeClock(1760000000100)
g = Snowflake(1, 3, c, "wait")
per_ms = {}
prev, increasing = -1, True
for _ in range(5000):
    i = g.next()
    if i <= prev:
        increasing = False
    prev = i
    ms = decode(i)["ms"]
    per_ms[ms] = per_ms.get(ms, 0) + 1
for ms, n in per_ms.items():
    print(f"  ms {ms}: {n} IDs")
print(f"  generator waited {c.waits} ms, strictly increasing: {b(increasing)}")

print("== 3. the clock steps back 5 ms (an NTP correction)")
for policy in ["refuse", "wait"]:
    c = FakeClock(1760000000200)
    g = Snowflake(1, 3, c, policy)
    a = g.next()
    c.ms -= 5
    try:
        nb = g.next()
        print(f"  {policy:<7}next ID {nb} > previous {a}: {b(nb > a)}, waited {c.waits} ms")
    except RuntimeError as e:
        print(f"  {policy:<7}error: {e}")

print("== 4. two workers, interleaved over 3 ms, then sorted by ID")
c = FakeClock(1760000000300)
w1, w2 = Snowflake(1, 1, c, "wait"), Snowflake(1, 2, c, "wait")
ids = []
for ms in range(3):
    ids += [("w2", w2.next()), ("w1", w1.next())]
    c.ms += 1
ids.sort(key=lambda x: x[1])
print("  " + " ".join(f"{w}@{decode(i)['ms'] - 1760000000000}" for w, i in ids))

print("== 5. two processes misconfigured with the same worker ID")
c = FakeClock(1760000000400)
p1, p2 = Snowflake(1, 7, c, "wait"), Snowflake(1, 7, c, "wait")
seen = set()
dupes = 0
for i in range(1000):
    for p in [p1, p2]:
        x = p.next()
        if x in seen:
            dupes += 1
        seen.add(x)
    if i % 100 == 99:
        c.ms += 1
print(f"  2000 IDs generated, duplicates: {dupes}")

print("== 6. limits of this layout")
max_ms = (1 << 41) - 1
largest = (max_ms << 22) | ((1 << 22) - 1)
print(f"  41-bit timestamp lasts {max_ms // 31557600000} years, until Unix ms {EPOCH + max_ms}")
print(f"  per worker: {(MAX_SEQ + 1) * 1000} IDs/s; workers: {1 << (DC_BITS + WORKER_BITS)}")
print(f"  largest ID {largest} fits a signed 64-bit integer: {b(largest <= 9223372036854775807)}")` },
          { tech: "go", code: `// A Snowflake-style 64-bit ID generator on a fake clock.
// Layout: 1 unused sign bit | 41 bits ms since a custom epoch | 5 datacenter | 5 worker | 12 sequence
package main

import (
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
)

const EPOCH int64 = 1288834974657 // the Twitter epoch, Unix ms
const SEQ_BITS, WORKER_BITS, DC_BITS = 12, 5, 5
const MAX_SEQ int64 = (1 << SEQ_BITS) - 1

type FakeClock struct{ ms, waits int64 }

func (c *FakeClock) Now() int64 { return c.ms }
func (c *FakeClock) SleepUntil(ms int64) {
	c.waits += ms - c.ms
	c.ms = ms
}

type Snowflake struct {
	dc, worker  int64
	clock       *FakeClock
	onBackwards string
	last, seq   int64
}

func NewSnowflake(dc, worker int64, clock *FakeClock, onBackwards string) *Snowflake {
	return &Snowflake{dc, worker, clock, onBackwards, -1, 0}
}

func (s *Snowflake) Next() (int64, error) {
	ts := s.clock.Now()
	if ts < s.last {
		if s.onBackwards == "refuse" {
			return 0, errors.New(fmt.Sprintf("clock moved back %d ms, refusing", s.last-ts))
		}
		s.clock.SleepUntil(s.last) // wait for the clock to catch up
		ts = s.last
	}
	if ts == s.last {
		s.seq = (s.seq + 1) & MAX_SEQ
		if s.seq == 0 { // 4096 used this ms
			s.clock.SleepUntil(s.last + 1)
			ts = s.last + 1
		}
	} else {
		s.seq = 0
	}
	s.last = ts
	return ((ts - EPOCH) << 22) | (s.dc << 17) | (s.worker << 12) | s.seq, nil
}

func must(id int64, err error) int64 {
	if err != nil {
		panic(err)
	}
	return id
}

type Decoded struct{ ms, dc, worker, seq int64 }

func decode(id int64) Decoded {
	return Decoded{(id >> 22) + EPOCH, (id >> 17) & 31, (id >> 12) & 31, id & MAX_SEQ}
}

func main() {
	fmt.Println("== 1. three IDs from datacenter 1, worker 3")
	clock := &FakeClock{ms: 1760000000000}
	gen := NewSnowflake(1, 3, clock, "wait")
	for _, step := range []int64{0, 0, 1} {
		clock.ms += step
		id := must(gen.Next())
		d := decode(id)
		fmt.Printf("  %d  ms=%d dc=%d worker=%d seq=%d\\n", id, d.ms, d.dc, d.worker, d.seq)
	}

	fmt.Println("== 2. 5000 IDs requested while the clock is frozen")
	{
		c := &FakeClock{ms: 1760000000100}
		g := NewSnowflake(1, 3, c, "wait")
		order := []int64{}
		perMs := map[int64]int{}
		prev, increasing := int64(-1), true
		for i := 0; i < 5000; i++ {
			id := must(g.Next())
			if id <= prev {
				increasing = false
			}
			prev = id
			ms := decode(id).ms
			if _, ok := perMs[ms]; !ok {
				order = append(order, ms)
			}
			perMs[ms]++
		}
		for _, ms := range order {
			fmt.Printf("  ms %d: %d IDs\\n", ms, perMs[ms])
		}
		fmt.Printf("  generator waited %d ms, strictly increasing: %t\\n", c.waits, increasing)
	}

	fmt.Println("== 3. the clock steps back 5 ms (an NTP correction)")
	for _, policy := range []string{"refuse", "wait"} {
		c := &FakeClock{ms: 1760000000200}
		g := NewSnowflake(1, 3, c, policy)
		a := must(g.Next())
		c.ms -= 5
		b, err := g.Next()
		if err != nil {
			fmt.Printf("  %-7serror: %s\\n", policy, err.Error())
		} else {
			fmt.Printf("  %-7snext ID %d > previous %d: %t, waited %d ms\\n", policy, b, a, b > a, c.waits)
		}
	}

	fmt.Println("== 4. two workers, interleaved over 3 ms, then sorted by ID")
	{
		c := &FakeClock{ms: 1760000000300}
		w1, w2 := NewSnowflake(1, 1, c, "wait"), NewSnowflake(1, 2, c, "wait")
		type pair struct {
			w  string
			id int64
		}
		ids := []pair{}
		for ms := 0; ms < 3; ms++ {
			ids = append(ids, pair{"w2", must(w2.Next())}, pair{"w1", must(w1.Next())})
			c.ms++
		}
		sort.Slice(ids, func(i, j int) bool { return ids[i].id < ids[j].id })
		parts := []string{}
		for _, p := range ids {
			parts = append(parts, fmt.Sprintf("%s@%d", p.w, decode(p.id).ms-1760000000000))
		}
		fmt.Println("  " + strings.Join(parts, " "))
	}

	fmt.Println("== 5. two processes misconfigured with the same worker ID")
	{
		c := &FakeClock{ms: 1760000000400}
		p1, p2 := NewSnowflake(1, 7, c, "wait"), NewSnowflake(1, 7, c, "wait")
		seen := map[int64]bool{}
		dupes := 0
		for i := 0; i < 1000; i++ {
			for _, p := range []*Snowflake{p1, p2} {
				id := must(p.Next())
				if seen[id] {
					dupes++
				}
				seen[id] = true
			}
			if i%100 == 99 {
				c.ms++
			}
		}
		fmt.Printf("  2000 IDs generated, duplicates: %d\\n", dupes)
	}

	fmt.Println("== 6. limits of this layout")
	maxMs := int64(1<<41) - 1
	largest := (maxMs << 22) | ((1 << 22) - 1)
	fmt.Printf("  41-bit timestamp lasts %d years, until Unix ms %d\\n", maxMs/31557600000, EPOCH+maxMs)
	fmt.Printf("  per worker: %d IDs/s; workers: %d\\n", (MAX_SEQ+1)*1000, 1<<(DC_BITS+WORKER_BITS))
	fmt.Printf("  largest ID %d fits a signed 64-bit integer: %t\\n", largest, largest <= math.MaxInt64)
}` },
          { tech: "java", code: `// A Snowflake-style 64-bit ID generator on a fake clock.
// Layout: 1 unused sign bit | 41 bits ms since a custom epoch | 5 datacenter | 5 worker | 12 sequence
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class Main {
    static final long EPOCH = 1288834974657L; // the Twitter epoch, Unix ms
    static final int SEQ_BITS = 12, WORKER_BITS = 5, DC_BITS = 5;
    static final long MAX_SEQ = (1L << SEQ_BITS) - 1;

    static class FakeClock {
        long ms, waits = 0;
        FakeClock(long ms) { this.ms = ms; }
        long now() { return ms; }
        void sleepUntil(long t) { waits += t - ms; ms = t; }
    }

    static class Snowflake {
        final long dc, worker;
        final FakeClock clock;
        final String onBackwards;
        long last = -1, seq = 0;
        Snowflake(long dc, long worker, FakeClock clock, String onBackwards) {
            this.dc = dc; this.worker = worker; this.clock = clock; this.onBackwards = onBackwards;
        }
        long next() {
            long ts = clock.now();
            if (ts < last) {
                if (onBackwards.equals("refuse")) throw new IllegalStateException("clock moved back " + (last - ts) + " ms, refusing");
                clock.sleepUntil(last); // wait for the clock to catch up
                ts = last;
            }
            if (ts == last) {
                seq = (seq + 1) & MAX_SEQ;
                if (seq == 0) { clock.sleepUntil(last + 1); ts = last + 1; } // 4096 used this ms
            } else seq = 0;
            last = ts;
            return ((ts - EPOCH) << 22) | (dc << 17) | (worker << 12) | seq;
        }
    }

    static long[] decode(long id) {
        return new long[]{(id >> 22) + EPOCH, (id >> 17) & 31, (id >> 12) & 31, id & MAX_SEQ};
    }

    public static void main(String[] args) {
        System.out.println("== 1. three IDs from datacenter 1, worker 3");
        FakeClock clock = new FakeClock(1760000000000L);
        Snowflake gen = new Snowflake(1, 3, clock, "wait");
        for (long step : new long[]{0, 0, 1}) {
            clock.ms += step;
            long id = gen.next();
            long[] d = decode(id);
            System.out.println("  " + id + "  ms=" + d[0] + " dc=" + d[1] + " worker=" + d[2] + " seq=" + d[3]);
        }

        System.out.println("== 2. 5000 IDs requested while the clock is frozen");
        {
            FakeClock c = new FakeClock(1760000000100L);
            Snowflake g = new Snowflake(1, 3, c, "wait");
            Map<Long, Integer> perMs = new LinkedHashMap<>();
            long prev = -1;
            boolean increasing = true;
            for (int i = 0; i < 5000; i++) {
                long id = g.next();
                if (id <= prev) increasing = false;
                prev = id;
                perMs.merge(decode(id)[0], 1, Integer::sum);
            }
            for (Map.Entry<Long, Integer> e : perMs.entrySet()) System.out.println("  ms " + e.getKey() + ": " + e.getValue() + " IDs");
            System.out.println("  generator waited " + c.waits + " ms, strictly increasing: " + increasing);
        }

        System.out.println("== 3. the clock steps back 5 ms (an NTP correction)");
        for (String policy : new String[]{"refuse", "wait"}) {
            FakeClock c = new FakeClock(1760000000200L);
            Snowflake g = new Snowflake(1, 3, c, policy);
            long a = g.next();
            c.ms -= 5;
            try {
                long b = g.next();
                System.out.println(String.format("  %-7s", policy) + "next ID " + b + " > previous " + a + ": " + (b > a) + ", waited " + c.waits + " ms");
            } catch (IllegalStateException e) {
                System.out.println(String.format("  %-7s", policy) + "error: " + e.getMessage());
            }
        }

        System.out.println("== 4. two workers, interleaved over 3 ms, then sorted by ID");
        {
            FakeClock c = new FakeClock(1760000000300L);
            Snowflake w1 = new Snowflake(1, 1, c, "wait"), w2 = new Snowflake(1, 2, c, "wait");
            List<Object[]> ids = new ArrayList<>();
            for (int ms = 0; ms < 3; ms++) {
                ids.add(new Object[]{"w2", w2.next()});
                ids.add(new Object[]{"w1", w1.next()});
                c.ms += 1;
            }
            ids.sort((x, y) -> Long.compare((Long) x[1], (Long) y[1]));
            StringBuilder sb = new StringBuilder();
            for (Object[] p : ids) {
                if (sb.length() > 0) sb.append(" ");
                sb.append(p[0]).append("@").append(decode((Long) p[1])[0] - 1760000000000L);
            }
            System.out.println("  " + sb);
        }

        System.out.println("== 5. two processes misconfigured with the same worker ID");
        {
            FakeClock c = new FakeClock(1760000000400L);
            Snowflake p1 = new Snowflake(1, 7, c, "wait"), p2 = new Snowflake(1, 7, c, "wait");
            Set<Long> seen = new HashSet<>();
            int dupes = 0;
            for (int i = 0; i < 1000; i++) {
                for (Snowflake p : new Snowflake[]{p1, p2}) { long id = p.next(); if (!seen.add(id)) dupes++; }
                if (i % 100 == 99) c.ms += 1;
            }
            System.out.println("  2000 IDs generated, duplicates: " + dupes);
        }

        System.out.println("== 6. limits of this layout");
        long maxMs = (1L << 41) - 1;
        long largest = (maxMs << 22) | ((1L << 22) - 1);
        System.out.println("  41-bit timestamp lasts " + maxMs / 31557600000L + " years, until Unix ms " + (EPOCH + maxMs));
        System.out.println("  per worker: " + (MAX_SEQ + 1) * 1000 + " IDs/s; workers: " + (1 << (DC_BITS + WORKER_BITS)));
        System.out.println("  largest ID " + largest + " fits a signed 64-bit integer: " + (largest <= Long.MAX_VALUE));
    }
}` },
        ],
      },
    ],
  },
];

export default augments;
