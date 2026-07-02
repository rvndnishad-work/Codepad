/**
 * Node Phase N3 — Batch 8 (Error handling & reliability).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle errors in Node.js applications?",
    answer: `**TL;DR.** Match the handler to the async style: <code>try/catch</code> for <code>async/await</code>, <code>.catch()</code> for promises, the **error-first callback** arg for callbacks, and the <code>'error'</code> **event** for streams/emitters. Centralize HTTP errors in **error-handling middleware**, distinguish **operational** vs **programmer** errors, and treat the global handlers as last-resort safety nets.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Different error channels per async pattern funnel to a central handler'>
  <rect class='d-box' x='20' y='25' width='140' height='28' rx='6'/><text class='d-sub' x='90' y='44' text-anchor='middle'>try/catch (await)</text>
  <rect class='d-box' x='20' y='59' width='140' height='28' rx='6'/><text class='d-sub' x='90' y='78' text-anchor='middle'>.catch (promise)</text>
  <rect class='d-box' x='20' y='93' width='140' height='28' rx='6'/><text class='d-sub' x='90' y='112' text-anchor='middle'>(err, …) callback</text>
  <rect class='d-box' x='20' y='127' width='140' height='26' rx='6'/><text class='d-sub' x='90' y='145' text-anchor='middle'>'error' event</text>
  <path class='d-edge-accent' d='M162 90 H240' marker-end='url(#h1)'/>
  <rect class='d-box-accent' x='242' y='62' width='200' height='52' rx='10'/><text class='d-text' x='342' y='84' text-anchor='middle'>central error handler</text><text class='d-sub' x='342' y='102' text-anchor='middle'>log + respond + decide</text>
  <defs><marker id='h1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** **Operational errors** (bad input, network blip, 404) are expected — handle them and return a clean response. **Programmer errors** (a thrown <code>TypeError</code>, undefined access) are bugs — log them and, if the process is in an unknown state, **restart**. In Express, throwing/forwarding to <code>next(err)</code> routes to a single error middleware that logs and shapes the JSON response. Always <code>await</code> or <code>.catch()</code> promises (an unhandled rejection can crash), and attach <code>'error'</code> listeners to every stream/emitter.

### Error channels
| Pattern | Catch with |
| --- | --- |
| async/await | <code>try/catch</code> |
| promise | <code>.catch()</code> |
| callback | first <code>err</code> arg |
| stream/emitter | <code>'error'</code> event |

> **Interview tip:** Draw the **operational vs programmer error** line: recover from operational ones, **crash-and-restart** on programmer ones. Mention centralized middleware and never swallowing rejections.`,
    examples: [
      {
        label: "Async route + central error middleware",
        tech: "javascript",
        runnable: false,
        code: `app.get('/user/:id', async (req, res, next) => {
  try {
    const user = await db.user(req.params.id);
    if (!user) throw new HttpError(404, 'Not found');  // operational
    res.json(user);
  } catch (err) { next(err); }                          // forward
});

// One place to log + shape the response:
app.use((err, req, res, next) => {
  log.error(err);
  res.status(err.status ?? 500).json({ error: err.publicMessage ?? 'Error' });
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle uncaught exceptions and unhandled promise rejections in Node.js?",
    answer: `**TL;DR.** Listen on <code>process.on('uncaughtException', …)</code> and <code>process.on('unhandledRejection', …)</code> as **last-resort** handlers: **log**, then **gracefully shut down and let a supervisor restart** — because after an uncaught error the process is in an **undefined state**. Don't use them to "keep running" as if nothing happened.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='uncaught error logged then process restarted by supervisor'>
  <rect class='d-box-muted' x='20' y='55' width='130' height='46' rx='8'/><text class='d-sub' x='85' y='75' text-anchor='middle'>uncaughtException</text><text class='d-sub' x='85' y='92' text-anchor='middle'>/ unhandledRejection</text>
  <path class='d-edge-accent' d='M152 78 H200' marker-end='url(#h2)'/>
  <rect class='d-box' x='202' y='55' width='100' height='46' rx='8'/><text class='d-sub' x='252' y='75' text-anchor='middle'>log error</text><text class='d-sub' x='252' y='92' text-anchor='middle'>+ cleanup</text>
  <path class='d-edge-accent' d='M304 78 H352' marker-end='url(#h2)'/>
  <rect class='d-box-accent' x='354' y='55' width='96' height='46' rx='8'/><text class='d-text' x='402' y='75' text-anchor='middle'>exit(1)</text><text class='d-sub' x='402' y='92' text-anchor='middle'>supervisor restarts</text>
  <defs><marker id='h2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** An <code>uncaughtException</code> means an error escaped all <code>try/catch</code>; an <code>unhandledRejection</code> means a rejected Promise had no <code>.catch</code> (modern Node **terminates** the process for these by default). After such an event, internal state (open transactions, half-written buffers) may be corrupt, so the safe move is to **log with full context, run minimal cleanup, and exit non-zero**, letting PM2/Kubernetes restart a fresh process. These handlers are a **safety net and observability hook**, not a substitute for handling errors where they occur.

### Global handlers — do/don't
| Do | Don't |
| --- | --- |
| log with context | swallow + continue |
| flush logs / close resources | resume serving traffic |
| <code>process.exit(1)</code> | assume state is fine |
| rely on a supervisor restart | use as normal control flow |

> **Interview tip:** The senior answer: after an uncaught error the process is in an **undefined state**, so **log → exit → restart**. Note modern Node already crashes on unhandled rejections by default.`,
    examples: [
      {
        label: "Last-resort handlers",
        tech: "javascript",
        runnable: false,
        code: `process.on('unhandledRejection', (reason) => {
  log.error({ reason }, 'unhandledRejection');
  throw reason;                       // promote to uncaughtException
});

process.on('uncaughtException', (err) => {
  log.fatal(err, 'uncaughtException — restarting');
  server.close(() => process.exit(1)); // drain, then let supervisor restart
  setTimeout(() => process.exit(1), 5000).unref();
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you implement a circuit breaker for unreliable downstream services?",
    answer: `**TL;DR.** A **circuit breaker** tracks downstream failures and, once they exceed a threshold, **"opens"** to **fail fast** for a cooldown instead of hammering a dead dependency. After the cooldown it goes **"half-open"** to test recovery with a trial request. This prevents resource exhaustion and **cascading failures**.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Closed, open, and half-open circuit breaker states'>
  <rect class='d-box-accent' x='20' y='60' width='110' height='46' rx='8'/><text class='d-text' x='75' y='82' text-anchor='middle'>CLOSED</text><text class='d-sub' x='75' y='98' text-anchor='middle'>calls pass</text>
  <path class='d-edge-accent' d='M132 75 H180' marker-end='url(#h3)'/>
  <text class='d-sub' x='156' y='66' text-anchor='middle'>fails &gt; N</text>
  <rect class='d-box-muted' x='182' y='60' width='100' height='46' rx='8'/><text class='d-text' x='232' y='82' text-anchor='middle'>OPEN</text><text class='d-sub' x='232' y='98' text-anchor='middle'>fail fast</text>
  <path class='d-edge-accent' d='M284 75 H332' marker-end='url(#h3)'/>
  <text class='d-sub' x='308' y='66' text-anchor='middle'>cooldown</text>
  <rect class='d-box' x='334' y='60' width='110' height='46' rx='8'/><text class='d-text' x='389' y='82' text-anchor='middle'>HALF-OPEN</text><text class='d-sub' x='389' y='98' text-anchor='middle'>trial call</text>
  <path class='d-edge-dashed' d='M389 60 C389 20 75 20 75 58' marker-end='url(#h3)'/>
  <text class='d-sub' x='232' y='28' text-anchor='middle'>success → CLOSED</text>
  <defs><marker id='h3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** In **CLOSED** state calls go through and failures are counted. Cross the failure threshold (or error rate) and the breaker trips to **OPEN**, immediately rejecting calls (returning a fallback/cached value) so threads and sockets aren't tied up waiting on timeouts. After a cooldown it becomes **HALF-OPEN**, allowing a probe request: success closes it, failure re-opens it. This shields your service from a slow dependency dragging it down and gives the dependency room to recover. Libraries like <code>opossum</code> implement it; pair with **timeouts** so calls don't hang before the breaker even counts them.

### Breaker states
| State | Behavior |
| --- | --- |
| CLOSED | calls pass, count failures |
| OPEN | reject fast / fallback |
| HALF-OPEN | one trial call |
| transitions | threshold trips, success heals |

> **Interview tip:** Name the **three states** and the goal — **fail fast to stop cascading failures**. Mention pairing it with **timeouts** and returning a **fallback** while open (e.g. cached data).`,
    examples: [
      {
        label: "Wrapping a call with opossum",
        tech: "javascript",
        runnable: false,
        code: `import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(callPaymentApi, {
  timeout: 3000,                 // a call over 3s counts as a failure
  errorThresholdPercentage: 50,  // open at 50% errors
  resetTimeout: 10_000,          // cooldown before half-open
});
breaker.fallback(() => ({ status: 'queued' }));   // while OPEN

const result = await breaker.fire(order);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you implement retries with exponential backoff and jitter?",
    answer: `**TL;DR.** Retry **transient** failures with **increasing delays** (<code>base * 2^attempt</code>) up to a cap, plus **random jitter** so many clients don't retry in lockstep and re-overload the recovering service. Only retry **idempotent/safe** operations, bound the attempt count, and respect <code>Retry-After</code> headers.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Retry delays grow exponentially with jitter'>
  <rect class='d-box' x='20' y='90' width='50' height='24' rx='4'/><text class='d-sub' x='45' y='107' text-anchor='middle'>~1s</text>
  <path class='d-edge-accent' d='M72 102 H100' marker-end='url(#h4)'/>
  <rect class='d-box' x='102' y='76' width='60' height='38' rx='4'/><text class='d-sub' x='132' y='99' text-anchor='middle'>~2s</text>
  <path class='d-edge-accent' d='M164 95 H192' marker-end='url(#h4)'/>
  <rect class='d-box-accent' x='194' y='56' width='70' height='58' rx='4'/><text class='d-sub' x='229' y='89' text-anchor='middle'>~4s±</text>
  <path class='d-edge-accent' d='M266 85 H294' marker-end='url(#h4)'/>
  <rect class='d-box-accent' x='296' y='36' width='80' height='78' rx='4'/><text class='d-sub' x='336' y='79' text-anchor='middle'>~8s±jitter</text>
  <text class='d-sub' x='418' y='80'>… cap</text>
  <defs><marker id='h4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Naive immediate retries amplify load on a struggling service. **Exponential backoff** spaces attempts out (1s, 2s, 4s, 8s…) up to a maximum; **jitter** randomizes each delay so a fleet of clients doesn't synchronize their retries (the "thundering herd"). Only retry errors that are **safe to repeat** — network timeouts, 503s, deadlocks — never a non-idempotent <code>POST</code> that may have partially succeeded (use an **idempotency key** if you must). Cap total attempts/time, and prefer the server's <code>Retry-After</code> when provided. Combine with a circuit breaker for sustained outages.

### Backoff design
| Element | Purpose |
| --- | --- |
| exponential delay | reduce load on failures |
| jitter | de-sync client retries |
| max attempts/cap | bound total wait |
| idempotency check | safe to repeat |

> **Interview tip:** Stress **jitter** (prevents thundering herd) and the **only-retry-idempotent** rule. Mention honoring <code>Retry-After</code> and combining backoff with a circuit breaker.`,
    examples: [
      {
        label: "Retry with capped backoff + jitter",
        tech: "javascript",
        runnable: false,
        code: `async function withRetry(fn, { tries = 5, base = 200, cap = 5000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await fn(); }
    catch (err) {
      if (attempt >= tries - 1 || !isTransient(err)) throw err;
      const backoff = Math.min(cap, base * 2 ** attempt);
      const delay = Math.random() * backoff;        // full jitter
      await new Promise(r => setTimeout(r, delay));
    }
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you guarantee idempotency in a queue consumer?",
    answer: `**TL;DR.** Message queues usually deliver **at-least-once**, so the same job can arrive **twice**. Make consumers **idempotent**: derive a stable **idempotency key**, **dedupe** processed ids, and use **upserts / conditional writes** so reprocessing produces **no extra side effects**.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Duplicate delivery deduplicated by a processed-id check'>
  <rect class='d-box' x='20' y='40' width='120' height='30' rx='6'/><text class='d-sub' x='80' y='60' text-anchor='middle'>job #42</text>
  <rect class='d-box' x='20' y='90' width='120' height='30' rx='6'/><text class='d-sub' x='80' y='110' text-anchor='middle'>job #42 (dup)</text>
  <path class='d-edge-accent' d='M142 55 L200 70' marker-end='url(#h5)'/>
  <path class='d-edge-dashed' d='M142 105 L200 90' marker-end='url(#h5)'/>
  <rect class='d-box-accent' x='202' y='58' width='120' height='44' rx='8'/><text class='d-text' x='262' y='80' text-anchor='middle'>seen #42?</text><text class='d-sub' x='262' y='96' text-anchor='middle'>dedupe store</text>
  <path class='d-edge-accent' d='M324 80 H382' marker-end='url(#h5)'/>
  <rect class='d-box' x='384' y='58' width='66' height='44' rx='8'/><text class='d-sub' x='417' y='84' text-anchor='middle'>apply once</text>
  <defs><marker id='h5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Failures and visibility-timeout redeliveries mean exactly-once is impractical end-to-end, so you push the guarantee into the **handler**. Give each message a stable id (or hash of its content). On receipt, record/check that id in a **dedupe store** (a unique DB constraint, or Redis <code>SET key NX</code>) **inside the same transaction** as the work, so a duplicate hits the unique violation and is skipped. Where possible, make operations **naturally idempotent**: upsert instead of insert, set absolute state instead of incrementing, conditional updates keyed on a version. Acknowledge the message only **after** the work commits.

### Idempotency tools
| Technique | Effect |
| --- | --- |
| idempotency key + unique index | dedupe duplicates |
| upsert / conditional write | repeat = no-op |
| set absolute state | avoids double increment |
| ack after commit | no lost work |

> **Interview tip:** Start from **at-least-once delivery → consumers must be idempotent**, then list **idempotency keys**, **upserts**, and **dedupe stores**, and ack only after a successful commit.`,
    examples: [
      {
        label: "Dedupe with a unique key",
        tech: "javascript",
        runnable: false,
        code: `async function handle(job) {
  try {
    await db.tx(async (t) => {
      await t.insert('processed_jobs', { id: job.id });  // unique PK
      await applyEffect(t, job);                          // same tx
    });
  } catch (e) {
    if (e.code === 'UNIQUE_VIOLATION') return;  // already handled → skip
    throw e;
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is a background job queue (BullMQ/Redis) and when do you need one?",
    answer: `**TL;DR.** A **job queue** stores units of work that **separate worker processes** consume asynchronously, with **retries, scheduling, and concurrency control**. Reach for one (e.g. **BullMQ** on Redis) to move **slow or unreliable** work — emails, image processing, webhooks, reports — **out of the request path**, so responses stay fast.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Producer enqueues jobs, workers consume them asynchronously'>
  <rect class='d-box-accent' x='20' y='55' width='110' height='44' rx='8'/><text class='d-text' x='75' y='75' text-anchor='middle'>API (producer)</text><text class='d-sub' x='75' y='91' text-anchor='middle'>add(job)</text>
  <path class='d-edge-accent' d='M132 77 H180' marker-end='url(#h6)'/>
  <rect class='d-box-muted' x='182' y='50' width='110' height='54' rx='8'/><text class='d-text' x='237' y='73' text-anchor='middle'>queue</text><text class='d-sub' x='237' y='91' text-anchor='middle'>Redis</text>
  <path class='d-edge-accent' d='M294 70 L342 55' marker-end='url(#h6)'/>
  <path class='d-edge-accent' d='M294 84 L342 99' marker-end='url(#h6)'/>
  <rect class='d-box' x='344' y='40' width='100' height='30' rx='6'/><text class='d-sub' x='394' y='60' text-anchor='middle'>worker 1</text>
  <rect class='d-box' x='344' y='84' width='100' height='30' rx='6'/><text class='d-sub' x='394' y='104' text-anchor='middle'>worker 2</text>
  <defs><marker id='h6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The request handler **enqueues** a job and returns immediately; dedicated **worker** processes pull jobs and run them, decoupling user-facing latency from slow tasks. The queue adds durability and operational features: **automatic retries** with backoff, **delayed/scheduled/recurring** jobs (cron), **concurrency** and **rate** limits, **priorities**, and **dead-letter** handling for poison messages. Workers scale independently of the API. Because delivery is **at-least-once**, make handlers **idempotent**. Use it whenever work is slow, bursty, must survive restarts, or should run on a schedule.

### What a queue gives you
| Feature | Benefit |
| --- | --- |
| async workers | fast responses |
| retries + backoff | resilience |
| scheduled/recurring | cron-like jobs |
| concurrency/rate limits | controlled load |

> **Interview tip:** Frame the core value as **decoupling slow work from the request path** plus **retries/scheduling**. Add that at-least-once delivery means handlers must be **idempotent** (links to dedupe).`,
    examples: [
      {
        label: "Enqueue + process with BullMQ",
        tech: "javascript",
        runnable: false,
        code: `import { Queue, Worker } from 'bullmq';
const connection = { host: 'localhost', port: 6379 };

const emails = new Queue('emails', { connection });
// In the request: return fast, do work later
await emails.add('welcome', { to: user.email }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });

// Separate worker process:
new Worker('emails', async (job) => sendEmail(job.data), { connection, concurrency: 5 });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you implement microservices communication in Node.js?",
    answer: `**TL;DR.** Services talk **synchronously** (request/response: REST, gRPC) or **asynchronously** (events/messages: Kafka, RabbitMQ, NATS). Sync is simple but **couples** caller to callee availability; async **decouples** and buffers load but is eventually consistent. Most systems use **both**: sync for queries, async for events.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Synchronous REST/gRPC versus asynchronous message broker'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>synchronous</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>REST / gRPC</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>request → response</text>
  <text class='d-sub' x='120' y='118' text-anchor='middle'>simple, tightly coupled</text>
  <rect class='d-box-muted' x='240' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>asynchronous</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>Kafka / RabbitMQ</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>publish → subscribe</text>
  <text class='d-sub' x='340' y='118' text-anchor='middle'>decoupled, resilient</text>
</svg>

**How it works.** **REST/HTTP** is universal and easy to debug; **gRPC** uses HTTP/2 + protobuf for fast, strongly-typed, streaming RPC between services. Both are synchronous, so a downstream outage propagates — protect with **timeouts, retries, and circuit breakers**. **Message brokers** invert this: a producer publishes an event and moves on; consumers process at their own pace, giving load-leveling, retries, and **temporal decoupling**, at the cost of eventual consistency and at-least-once duplicates (so consumers must be **idempotent**). Add **service discovery**, **correlation/trace ids** for observability, and choreography vs orchestration as the coordination style.

### Sync vs async
| | Sync (REST/gRPC) | Async (broker) |
| --- | --- | --- |
| Coupling | tight (callee must be up) | loose |
| Consistency | immediate | eventual |
| Load handling | backpressure to caller | buffered in queue |
| Failure | propagates | retried by consumer |

> **Interview tip:** Don't pick one — say **"sync for queries, async for events,"** and surround sync calls with **timeouts + retries + circuit breakers**, and make async consumers **idempotent** with trace ids for observability.`,
    examples: [
      {
        label: "Event publish (async) alongside a REST call (sync)",
        tech: "javascript",
        runnable: false,
        code: `// Synchronous query to another service (guard it!)
const res = await fetch('http://inventory/stock/' + sku, {
  signal: AbortSignal.timeout(2000),
});

// Asynchronous event — fire and forget, consumers react independently
await broker.publish('order.placed', { orderId, sku, qty });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How would you implement caching in a Node.js application?",
    answer: `**TL;DR.** Cache to avoid recomputing or refetching expensive results. Choose a tier: **in-process** (a Map/LRU — fastest, per-instance) or **shared** (Redis — consistent across instances). Apply a strategy (**cache-aside** is most common), set **TTLs**, and have an **invalidation** plan. The hard parts are **staleness** and **invalidation**, not storage.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Cache-aside: check cache, miss hits DB and populates cache'>
  <rect class='d-box-accent' x='20' y='55' width='100' height='44' rx='8'/><text class='d-text' x='70' y='81' text-anchor='middle'>request</text>
  <path class='d-edge-accent' d='M122 77 H170' marker-end='url(#h7)'/>
  <rect class='d-box' x='172' y='55' width='100' height='44' rx='8'/><text class='d-text' x='222' y='75' text-anchor='middle'>cache?</text><text class='d-sub' x='222' y='91' text-anchor='middle'>hit → return</text>
  <path class='d-edge-dashed' d='M274 77 H322' marker-end='url(#h7)'/>
  <text class='d-sub' x='298' y='68' text-anchor='middle'>miss</text>
  <rect class='d-box-muted' x='324' y='55' width='110' height='44' rx='8'/><text class='d-text' x='379' y='75' text-anchor='middle'>DB</text><text class='d-sub' x='379' y='91' text-anchor='middle'>then populate</text>
  <path class='d-edge-dashed' d='M379 99 V125 H222 V101' marker-end='url(#h7)'/>
  <defs><marker id='h7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** In **cache-aside (lazy)**, the app checks the cache; on a **miss** it loads from the source, stores the result with a TTL, and returns it — simple and resilient. Alternatives: **write-through** (write cache+DB together, fresher reads), **read-through** (cache library loads on miss). Pick **in-process LRU** for hot, small, instance-local data (beware staleness across replicas) and **Redis** when multiple instances must share/evict consistently. Set TTLs to bound staleness, and invalidate on writes (delete the key). Watch for the **thundering herd** on popular-key expiry — mitigate with a short lock or stale-while-revalidate.

### Strategies
| Strategy | Reads | Writes |
| --- | --- | --- |
| cache-aside | load on miss, populate | invalidate key |
| write-through | always fresh | write both |
| read-through | lib loads on miss | — |
| TTL only | expire by time | passive |

> **Interview tip:** Say **"the hard part is invalidation and staleness, not storage."** Mention **cache-aside + TTL**, choosing **in-process vs Redis** by sharing needs, and guarding against the **thundering herd**.`,
    examples: [
      {
        label: "Cache-aside with Redis",
        tech: "javascript",
        runnable: false,
        code: `async function getProduct(id) {
  const key = 'product:' + id;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);          // hit

  const product = await db.product(id);           // miss → load
  await redis.set(key, JSON.stringify(product), 'EX', 300); // TTL 5m
  return product;
}
// On update: await redis.del('product:' + id);   // invalidate`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle database connection pooling in a Node.js application?",
    answer: `**TL;DR.** A **connection pool** keeps a set of **reusable** DB connections so requests **borrow and return** them instead of paying the cost of opening a new connection each time. You configure a **max size**, acquire timeout, and idle timeout, and **always release** connections (use a <code>finally</code>) to avoid pool exhaustion.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Requests borrow connections from a fixed pool to the database'>
  <rect class='d-box' x='20' y='35' width='90' height='28' rx='6'/><text class='d-sub' x='65' y='54' text-anchor='middle'>req A</text>
  <rect class='d-box' x='20' y='71' width='90' height='28' rx='6'/><text class='d-sub' x='65' y='90' text-anchor='middle'>req B</text>
  <rect class='d-box' x='20' y='107' width='90' height='28' rx='6'/><text class='d-sub' x='65' y='126' text-anchor='middle'>req C</text>
  <path class='d-edge-accent' d='M112 49 L170 70' marker-end='url(#h8)'/>
  <path class='d-edge-accent' d='M112 85 H170' marker-end='url(#h8)'/>
  <path class='d-edge-accent' d='M112 121 L170 100' marker-end='url(#h8)'/>
  <rect class='d-box-accent' x='172' y='50' width='120' height='66' rx='10'/><text class='d-text' x='232' y='78' text-anchor='middle'>pool (max 10)</text><text class='d-sub' x='232' y='96' text-anchor='middle'>borrow/return</text>
  <path class='d-edge-accent' d='M294 83 H352' marker-end='url(#h8)'/>
  <rect class='d-box-muted' x='354' y='55' width='90' height='56' rx='8'/><text class='d-text' x='399' y='87' text-anchor='middle'>Postgres</text>
  <defs><marker id='h8' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Opening a DB connection (TCP + auth) is expensive, and databases cap concurrent connections. A pool pre-opens/limits connections; a query **acquires** one, runs, and **releases** it back. Size the pool to the DB's limit divided across your instances — too large and you exhaust the DB (especially with **cluster** or many replicas); too small and requests queue. The classic bug is a **leaked** connection (an error path that never releases), which drains the pool until everything times out — guard with <code>try/finally</code> or the driver's managed query API. For serverless, use an external pooler (PgBouncer) since each invocation is short-lived.

### Pool tuning
| Setting | Guidance |
| --- | --- |
| max size | DB limit ÷ instances |
| acquire timeout | fail fast when starved |
| idle timeout | reclaim unused conns |
| release | always (<code>finally</code>) |

> **Interview tip:** Two points land: **always release** (leaks exhaust the pool) and **size to the DB limit across all instances** (cluster/replicas multiply connections). Mention PgBouncer for serverless.`,
    examples: [
      {
        label: "Borrow + always release",
        tech: "javascript",
        runnable: false,
        code: `import { Pool } from 'pg';
const pool = new Pool({ max: 10, idleTimeoutMillis: 30_000 });

async function getUser(id) {
  const client = await pool.connect();    // borrow
  try {
    const { rows } = await client.query('SELECT * FROM users WHERE id=$1', [id]);
    return rows[0];
  } finally {
    client.release();                      // ALWAYS return it
  }
}`,
      },
    ],
  },
];

export default augments;
