/**
 * SYSTEM DESIGN ULTRA — batch 13: Architecture choices. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `How would you design a feature flag system (LaunchDarkly-style) at scale?`,
    difficulty: "medium",
    seoDescription: `Design a LaunchDarkly-style feature flag system: local evaluation in SDKs, streaming updates, versioning, outage defaults and capacity, verified.`,
    description: `**Question presented to candidate:**
"We want to turn features on and off for millions of users without redeploying, and use it as a kill switch during incidents. Design a feature flag service like LaunchDarkly that thousands of services and apps can rely on."

**What a strong answer should cover:**
- Splitting a **control plane** (dashboard, API, flag store, audit log) from a **data plane** (SDKs that hold the rules in memory and evaluate locally, with no network call per evaluation)
- Delivery of changes: a **streaming** connection (server-sent events) that pushes deltas in well under a second, with polling as a fallback, and a full re-sync after a reconnect
- **Per-flag versions** so that late or duplicated updates never roll a flag back, and an append-only audit log of who changed what
- Failure behaviour: the flag service is never on the request path; a running SDK keeps its last known values, a cold start falls back to code defaults or a persistent cache or relay
- Scale numbers: evaluations per second versus connections and change fan-out, the bootstrap storm when a whole fleet restarts, and client-side SDKs that receive evaluated values instead of rules

**Clarifying questions expected:**
- Server-side services only, or browsers and mobile apps too (which cannot be trusted with the rules)?
- How fast must a kill switch take effect, and what should happen if the flag service is down?
- Do we need experiments and analytics on flag evaluations, or only on/off and rollouts?

**Code / implementation expected:** Optional — the example models capacity, streaming versus polling lag, versioned updates and outage fallbacks.`,
    answer: `**Target Audience:** Beginners to system design — you know what a web service and a database are; every flag-system term is defined as it appears.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). The fleet, flag counts and latencies are stated assumptions; LaunchDarkly behaviour quoted below is from LaunchDarkly documentation (architecture overview and SDK contributor guide), checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All numbers come from the example program; the **Verified** section quotes its full output. Targeting rules and percentage rollouts have their own page, [advanced feature flags](/interview-question/advanced-feature-flags-targeting-gradual-rollout-and-edge-evaluation); this page is about the system that stores and delivers flags.

## 1. Why This Even Matters — A Story First

A theatre has hundreds of lights. The lighting operator does not rewire the building to change a scene; there is a control desk with a switch for every light, and each switch works instantly. If something catches fire, one big red switch turns off the dangerous rig without stopping the play.

A feature flag system is that control desk for software. Engineers ship code with the new feature hidden behind a switch, then turn it on for 1% of users, then everyone, without a redeploy. When the new checkout breaks at 2 a.m., the on-call engineer flips one switch instead of rolling back a release.

The catch: every request in every service asks the desk "is this light on?", millions of times a second. If asking requires a phone call to the desk, the desk becomes the most loaded and most critical system you own. The whole design is about making the question free and the desk optional.

📌 **Interview term: feature flag (feature toggle)** — a named switch, checked in code (\`if (flags.bool("new-checkout", user, false))\`), whose value is changed at runtime from a central service instead of by deploying code.

📌 **Interview term: kill switch** — a flag kept specifically to turn a feature off fast during an incident. Its speed of propagation is the most important number in the system.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which clients: backend services, browsers, mobile apps? | Backends can hold the full rules; browsers and phones must only get their own evaluated values |
| How quickly must a change take effect everywhere? | Seconds means streaming; minutes allows plain polling |
| How many services, instances and flags? | Sizes the connection layer and the cost of a full re-sync |
| What happens when the flag service is down? | Decides defaults, persistent caches and whether a relay is needed |
| Do we need audit, approvals, experiments? | Adds an audit log, change workflows and an evaluation-event pipeline |
| Several environments (dev, staging, prod)? | Each environment has its own flag values and its own SDK key |

## 3. Requirements

**Functional**
- Create flags with variations (boolean, string, number, JSON), per environment.
- Target users by attribute, individual lists, segments, and percentage rollouts (rules covered on the [advanced feature flags page](/interview-question/advanced-feature-flags-targeting-gradual-rollout-and-edge-evaluation)).
- Change a flag and see it take effect across the fleet; kill switch in seconds.
- Audit log of every change, with who, when, before and after; optional approvals.
- SDKs for server languages, browsers and mobile.

**Non-functional**
- Evaluation adds microseconds, not milliseconds, and never fails the caller's request.
- Propagation under about one second for connected SDKs.
- The service being down must not take customers down: last known values keep working.
- Changes are ordered: an old update can never overwrite a newer one.

## 4. Capacity Estimate

Assumptions (all in the program): 2,000 service instances, 500 requests per second each, 5 flag checks per request; 1,500 flags of about 2 KB of rules each; 300 flag changes a day; polling every 30 s as the alternative.

From the run:

| Quantity | Value |
| :--- | ---: |
| Flag evaluations | 5,000,000 per second |
| Rules held per SDK | 3 MB |
| Streaming connections | 2,000 |
| Data downloaded if the whole fleet restarts at once | 6.0 GB |
| Change messages (300 changes x 2,000 streams) | 600,000 per day |
| Polling every 30 s instead | 66.7 requests per second, 5,760,000 per day, mostly "no change" |

The first row decides the architecture. Five million remote calls per second, on the critical path of every request, is a large and fragile service. Five million **local** evaluations cost nothing on the network: the hard numbers become 2,000 long-lived connections and 600,000 small messages a day, which is easy.

📌 **Interview term: local evaluation** — the SDK downloads the flag rules once, keeps them in memory, and evaluates each flag in-process. LaunchDarkly's server-side SDKs work this way: the SDK contributor guide describes an in-memory store of flag rules and says evaluation needs no per-evaluation request to LaunchDarkly.

## 5. The Core Split: Control Plane and Data Plane

📌 **Interview term: control plane vs data plane** — the **control plane** is where configuration is written and stored (dashboard, REST API, database, audit). The **data plane** is what serves live traffic (the SDKs inside your services). A good design lets the data plane keep working when the control plane is down.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Feature flag architecture: dashboard and API write to a flag database and audit log; a change publisher pushes updates to a streaming tier; SDKs inside services hold rules in memory">
  <defs>
    <marker id="sd13q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="15" y="15" width="730" height="120" rx="12"/>
  <text class="d-sub" x="30" y="38">control plane</text>
  <rect class="d-box" x="40" y="60" width="150" height="50" rx="8"/>
  <text class="d-text" x="115" y="90" text-anchor="middle">dashboard, API</text>
  <rect class="d-box-accent" x="260" y="60" width="180" height="50" rx="8"/>
  <text class="d-text" x="350" y="90" text-anchor="middle">flag DB + audit</text>
  <rect class="d-box" x="520" y="60" width="190" height="50" rx="8"/>
  <text class="d-text" x="615" y="90" text-anchor="middle">change publisher</text>
  <rect class="d-box-muted" x="15" y="175" width="730" height="140" rx="12"/>
  <text class="d-sub" x="30" y="198">data plane</text>
  <rect class="d-box-accent" x="520" y="210" width="190" height="50" rx="8"/>
  <text class="d-text" x="615" y="240" text-anchor="middle">streaming tier</text>
  <rect class="d-box" x="40" y="215" width="150" height="70" rx="8"/>
  <text class="d-text" x="115" y="245" text-anchor="middle">service + SDK</text>
  <text class="d-sub" x="115" y="268" text-anchor="middle">rules in memory</text>
  <rect class="d-box" x="260" y="215" width="180" height="70" rx="8"/>
  <text class="d-text" x="350" y="245" text-anchor="middle">service + SDK</text>
  <text class="d-sub" x="350" y="268" text-anchor="middle">rules in memory</text>
  <line class="d-edge" x1="190" y1="85" x2="256" y2="85" marker-end="url(#sd13q1-arrow)"/>
  <line class="d-edge" x1="440" y1="85" x2="516" y2="85" marker-end="url(#sd13q1-arrow)"/>
  <line class="d-edge-accent" x1="615" y1="110" x2="615" y2="206" marker-end="url(#sd13q1-arrow)"/>
  <line class="d-edge-accent" x1="520" y1="245" x2="444" y2="250" marker-end="url(#sd13q1-arrow)"/>
  <path class="d-edge-dashed" d="M560,262 C520,305 260,305 192,262" fill="none" marker-end="url(#sd13q1-arrow)"/>
</svg>

Writes go through the control plane; every service keeps a full copy of the rules and the streaming tier only pushes changes. If the top half disappears, the bottom half keeps evaluating with the rules it has.

The pieces:

- **Flag store**: a relational database (flags, environments, segments, versions) is plenty; the write rate is a few hundred changes a day. Every change writes a new flag version and an audit record in the same transaction.
- **Change publisher**: after commit, publishes "flag X is now version N" onto an internal [publish-subscribe](/interview-question/what-is-the-publish-subscribe-pattern) bus. The [outbox pattern](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure) keeps the database write and the publish from diverging.
- **Streaming tier**: stateless nodes holding long-lived connections from SDKs, keyed by environment. On a change they push the new flag JSON down every connection for that environment.
- **CDN-cached snapshot endpoint**: \`GET /sdk/latest-all\` returns all flags for an environment with an ETag, so a fleet restart or a reconnect does not hammer the database.
- **SDKs**: hold the rules, evaluate locally, buffer evaluation events for analytics.

## 6. API and Data Model

~~~text
Control plane (humans, CI)
  POST  /api/projects/{p}/flags                       create a flag
  PATCH /api/projects/{p}/flags/{key}?env=production  semantic patch: turn on, add rule, change rollout
  GET   /api/projects/{p}/flags/{key}/audit           change history

Data plane (SDKs, authenticated by an environment SDK key)
  GET   /sdk/latest-all            full snapshot, ETag, cached at the CDN
  GET   /sdk/stream                server-sent events: put (full state), patch (one flag), delete
  POST  /events/bulk               batched evaluation and custom events
~~~

~~~json
{
  "key": "new-checkout", "env": "production", "version": 8,
  "on": true, "offVariation": 1,
  "variations": [true, false],
  "targets": [{ "variation": 0, "values": ["user-42"] }],
  "rules": [{ "clauses": [{ "attr": "country", "op": "in", "values": ["NZ"] }], "variation": 0 }],
  "fallthrough": { "rollout": [{ "variation": 0, "weight": 10000 }, { "variation": 1, "weight": 90000 }] },
  "salt": "a1b2"
}
~~~

📌 **Interview term: flag version** — a counter incremented on every change to one flag in one environment. SDKs apply an update only if its version is higher than what they hold.

## 7. Deep Dive 1: Getting a Change Everywhere Fast

📌 **Interview term: server-sent events (SSE)** — a long-lived HTTP response over which the server keeps pushing text events to the client. One direction only, which is all a flag SDK needs. LaunchDarkly documents that its SDKs keep an SSE connection and receive flag changes over it. The trade-offs against WebSockets and polling are on [WebSockets vs polling vs SSE](/interview-question/when-would-you-use-websockets-vs-polling-vs-sse).

The run flips a kill switch at t = 10,000 ms and measures when each SDK serves the new value:

| SDK | Lag |
| :--- | ---: |
| stream-a | 40 ms |
| stream-b | 180 ms |
| stream-c (stream was down until t = 18,500) | 8,590 ms |
| poll-a (polls every 30 s from t = 3,000) | 23,000 ms |
| poll-b | 11,000 ms |
| poll-c | 29,900 ms |

Healthy streams converge in the time of one push (180 ms worst). Polling converges in up to one full interval (29,900 ms), and costs 5,760,000 requests a day to learn mostly nothing. The reconnecting stream is the important row: while disconnected, the SDK kept serving its old value, and on reconnect it must ask for a full snapshot (the server cannot know which patches it missed). So the protocol has two message types: \`put\` (everything, sent on connect) and \`patch\` (one flag).

To make reconnects cheap and safe:

- Reconnect with exponential backoff and jitter, so a streaming-tier deploy does not cause 2,000 simultaneous reconnects.
- Serve the \`put\` from the CDN-cached snapshot; the run shows a full fleet re-sync is 6.0 GB, which you do not want coming from the database.
- Fall back to polling if streaming keeps failing (corporate proxies sometimes cut long connections).

## 8. Deep Dive 2: Ordering and Correctness

Updates can arrive out of order: a patch is retried, two streaming nodes race, a snapshot fetched before a change lands after it. The run applies a v8 kill switch and then a delayed v7:

| Store | Result |
| :--- | :--- |
| Without version check | v7 overwrites v8: serving **value=true**, the kill switch is undone |
| With version check | v7 ignored: serving v8 **value=false** |

The rule is simple and per flag: \`if incoming.version <= current.version: ignore\`. Because versions are per flag, you never need global ordering, and deletes become a tombstone with a version too (so a late patch cannot resurrect a deleted flag).

📌 **Interview term: idempotent, monotonic update** — applying the same update twice, or an older one late, leaves the state unchanged; the state only moves forward. See [idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter).

## 9. Deep Dive 3: When the Flag Service Is Down

The flag system must never be a hard dependency of checkout. The run's three cases, with the last stored value \`true\` and the code default \`false\`:

| Situation | Serves |
| :--- | :--- |
| Warm SDK, stream drops | true (last known value) |
| Cold start, no persistent store | false (code default) |
| Cold start with a Redis cache or relay | true (last known value) |

The middle row is the dangerous one: a service that autoscales during an outage starts new instances that disagree with the old ones. Two fixes:

- **Pick safe defaults in code.** The default passed at the call site should be the behaviour you want when nothing is known, usually "off".
- **A persistent store or relay.** LaunchDarkly documents a Relay Proxy that receives the stream once and keeps a persistent store (such as Redis) current, which SDKs can read at startup without reaching LaunchDarkly. The same idea in your own design: a relay inside each region or cluster, so 2,000 instances share a handful of upstream connections.

📌 **Interview term: relay proxy** — a component inside your network that holds the upstream stream and re-serves flags to local SDKs, cutting upstream connections and surviving upstream outages.

Also initialise with a bounded wait: block startup for up to, say, a second for the first \`put\`, then start with defaults or cache rather than refusing to serve.

## 10. Client-Side SDKs, Events and Flag Hygiene

**Browsers and phones** cannot hold the rules: the rules contain user lists and customer names, and the device would then be able to evaluate anybody. LaunchDarkly's contributor guide says client-side SDKs read pre-evaluated values. So the server evaluates all flags for this one user and sends a small map of values; the [advanced page](/interview-question/advanced-feature-flags-targeting-gradual-rollout-and-edge-evaluation) measures the size difference and adds evaluation at the edge.

**Evaluation events**: to show "which variation did users get" and to run experiments, SDKs buffer counts per flag and variation and flush them every few seconds in one batch, never one event per evaluation (that would be 5,000,000 events per second). Summaries per flag per interval, plus sampled full events, keep this pipeline small; it is the same shape as [an analytics pipeline](/interview-question/how-would-you-design-an-analytics-metrics-pipeline).

**Flag debt**: every flag is an \`if\` in the code. Track last evaluation time and creation date, alert on flags that have served one value to everyone for weeks, and remove them.

**Standard API**: OpenFeature is a vendor-neutral flag evaluation API that became a CNCF incubating project in December 2023 (CNCF blog). Coding against it lets you swap providers.

## 11. What Breaks First at 10x

| Growth | What breaks | Fix |
| :--- | :--- | :--- |
| 20,000 instances | 20,000 streams, 60 GB per fleet re-sync | relays per cluster; CDN snapshots; jittered reconnect |
| 15,000 flags | 30 MB of rules per SDK, slow startup | per-service flag scoping (SDK gets only flags tagged for it) |
| Frequent changes (bulk edits) | streaming bursts | coalesce patches per flag per 100 ms |
| Mobile clients in the millions | one connection per device | polling for mobile, streaming only in foreground, CDN-cached evaluations |

## 12. Verified: Running the Code

The example is an in-process simulation. A Map stands for the SDK store, a list of SDKs with fixed latencies and poll offsets stands for the fleet, and a fake clock in milliseconds replaces real time; there is no network, no real SSE, and no database. It shows the arithmetic and the rules, not the production code.

The key part, the version check:

~~~js
function apply(store, update, checkVersion) {
  const cur = store.get(update.key);
  if (checkVersion && cur && cur.version >= update.version) return "ignored";
  store.set(update.key, update);
  return "applied";
}
~~~

Full output (identical in Node and Python):

~~~text
== 1. capacity ==
  flag evaluations: 5,000,000/s -> remote evaluation = that many network calls/s
  local evaluation: 2000 long-lived streams, 3 MB of rules per SDK, 0 calls per evaluation
  full restart of the fleet downloads 6.0 GB of rules
  change fan-out: 300 changes/day x 2000 streams = 600,000 messages/day
  polling every 30 s instead: 66.7 requests/s, 5,760,000/day, mostly unchanged
== 2. time until each SDK serves the new value ==
  stream-a      40 ms
  stream-b     180 ms
  stream-c    8590 ms  (stream was down; old value served meanwhile)
  poll-a     23000 ms
  poll-b     11000 ms
  poll-c     29900 ms
  worst healthy stream: 180 ms   reconnecting stream: 8590 ms   worst poll: 29900 ms
== 3. updates arriving out of order (v8 kill switch, then a delayed v7) ==
  without version check v8:applied v7:applied -> serving v7 value=true
  with version check    v8:applied v7:ignored -> serving v8 value=false
== 4. flag service down ==
  warm SDK, stream drops             serves true  (last known value)
  cold start, no persistent store    serves false (code default)
  cold start, Redis or relay cache   serves true  (last known value)
~~~

## 13. Edge Cases Worth Knowing

- **Flag dependencies (prerequisites)**: flag B only on if flag A is on. Evaluate with cycle detection, and remember a kill switch on A also turns off B.
- **Environment keys leak**: a server SDK key in a mobile app exposes all rules. Server keys and client IDs must be different credentials.
- **Partial snapshot**: a stream \`put\` interrupted mid-way must not replace the store; apply only complete snapshots.
- **Clock-free ordering**: never order updates by timestamp; clocks differ between machines. Use the per-flag version.
- **Long-running jobs**: a batch job that reads a flag once at start will not see the kill switch; check at loop boundaries.

## Common Pitfalls

- **Evaluating remotely on every request.** The run puts that at 5,000,000 calls per second on the critical path; local evaluation makes it zero.
- **No version check.** A delayed v7 undid the v8 kill switch in the run.
- **Bad code defaults.** A cold start during an outage served \`false\` while warm instances served \`true\`; choose the default you want when nothing is known.
- **Shipping rules to browsers.** It leaks targeted users and customer names; send evaluated values.
- **Polling for kill switches.** The worst poll took 29,900 ms; a stream took 180 ms.
- **Never deleting flags.** Old flags become hidden configuration nobody understands.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Split the planes:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">control plane</strong> (dashboard, API, a relational flag DB with an audit log) and a <strong style="color:#ffca28;">data plane</strong>: SDKs inside every service that hold all the rules in memory and evaluate locally, so a flag check is a function call, not a network call.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why local:</strong> <span style="color:#f0e2c8;">With 2,000 instances at 500 rps and 5 flags per request that is 5,000,000 evaluations per second. Remote evaluation would put that on the critical path; local evaluation turns it into 2,000 long-lived connections and about 600,000 small messages a day.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Delivery:</strong> <span style="color:#f0e2c8;">Changes go DB, outbox, pub/sub, a stateless <strong style="color:#ffca28;">streaming tier</strong> using server-sent events: a full <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code> on connect and per-flag <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patch</code> after. Healthy streams converged in 180 ms in my model; polling every 30 s took up to 29.9 s.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Correctness:</strong> <span style="color:#f0e2c8;">Every flag has a <strong style="color:#ffca28;">version</strong> and SDKs ignore anything not newer, so a delayed v7 can never undo a v8 kill switch. Reconnects re-sync the full snapshot from a CDN-cached endpoint, with jittered backoff.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Failure and clients:</strong> <span style="color:#f0e2c8;">The service is never a hard dependency: running SDKs keep last known values, cold starts use safe code defaults or a relay with a persistent cache. Browsers and phones get only their <strong style="color:#ffca28;">evaluated values</strong>, never the rules.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make the kill switch faster than one second?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It already is for connected SDKs: one push. The slow cases are disconnected or polling clients, so I would add relays per cluster to keep connections short and local, alert on SDKs that have not received a heartbeat, and for truly critical switches also check a value pushed through the deploy pipeline as a backstop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the streaming tier has to be deployed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Drain gradually: nodes stop accepting, close connections a few at a time, and SDKs reconnect with exponential backoff plus jitter to other nodes. Reconnect fetches the snapshot from the CDN, not the database, so 2,000 reconnects cost a cached 3 MB each, about 6 GB in total spread over time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do client-side SDKs work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They identify the user to an evaluation endpoint, which runs all the rules server-side and returns a small map of flag values for that user, then streams or polls changes to that map. The rules, user lists and segment contents never reach the device.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you store flags and audit history?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A relational database: flags per environment with a version column, and an append-only audit table written in the same transaction (who, when, before, after, comment). Writes are a few hundred a day, so this is not the scaling problem; the read path never touches it directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you collect evaluation analytics without overwhelming the system?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SDKs aggregate locally: counts per flag, variation and interval, flushed in batches every few seconds, plus sampled full events for debugging. That turns millions of evaluations per second into a few requests per instance per minute.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Feature flag | Runtime switch checked in code, changed without a deploy |
| Kill switch | Flag used to turn a feature off quickly in an incident |
| Local evaluation | SDK evaluates rules held in memory, no network call |
| Control plane vs data plane | Where config is written vs what serves live traffic |
| Flag version | Per-flag counter; only newer updates are applied |
| Server-sent events | One-way stream of events over a long-lived HTTP response |
| Idempotent, monotonic update | Replays and stale updates leave the state unchanged |
| Relay proxy | In-network component that re-serves flags to local SDKs |

**Conclusion:** A flag system at scale is a small, careful control plane and a data plane that does not need it. Evaluate locally in the SDK (5,000,000 evaluations per second become zero network calls), push changes over a stream with full snapshots on connect and per-flag patches after (180 ms versus 29.9 s for polling in the model), guard every update with a per-flag version so a kill switch cannot be undone by a late message, and design the outage path deliberately: last known values, safe code defaults, and a relay with a persistent cache. Give browsers evaluated values only, collect analytics as local summaries, and delete flags once they have done their job.`,
    examples: [
      {
        label: `Flag delivery at scale: local vs remote evaluation, streaming vs polling lag, versioned updates and outage fallbacks`,
        variants: [
          { tech: "node", code: `// Feature flag delivery at scale: remote vs local evaluation, streaming vs polling,
// out-of-order updates, and what an SDK serves when the flag service is down.

// ---- 1. Capacity: why SDKs evaluate locally (all inputs are assumptions) ----
const instances = 2000, rpsPerInstance = 500, flagsPerRequest = 5;
const flags = 1500, bytesPerFlag = 2000, changesPerDay = 300, pollSeconds = 30;
const evalsPerSec = instances * rpsPerInstance * flagsPerRequest;
const configMB = (flags * bytesPerFlag) / 1e6;
console.log("== 1. capacity ==");
console.log(\`  flag evaluations: \${evalsPerSec.toLocaleString("en-US")}/s -> remote evaluation = that many network calls/s\`);
console.log(\`  local evaluation: \${instances} long-lived streams, \${configMB} MB of rules per SDK, 0 calls per evaluation\`);
console.log(\`  full restart of the fleet downloads \${(instances * configMB / 1000).toFixed(1)} GB of rules\`);
console.log(\`  change fan-out: \${changesPerDay} changes/day x \${instances} streams = \${(changesPerDay * instances).toLocaleString("en-US")} messages/day\`);
console.log(\`  polling every \${pollSeconds} s instead: \${(instances / pollSeconds).toFixed(1)} requests/s, \${((86400 / pollSeconds) * instances).toLocaleString("en-US")}/day, mostly unchanged\`);

// ---- 2. Propagation of one change (fake clock, milliseconds) ----
// The flag "checkout-v2" is flipped to false (kill switch) at t = 10,000 ms.
const changeAt = 10000;
const sdks = [
  { name: "stream-a", mode: "stream", latency: 40 },
  { name: "stream-b", mode: "stream", latency: 180 },
  { name: "stream-c", mode: "stream", latency: 90, disconnectedUntil: 18500 }, // reconnects, then re-syncs
  { name: "poll-a", mode: "poll", offset: 3000 },
  { name: "poll-b", mode: "poll", offset: 21000 },
  { name: "poll-c", mode: "poll", offset: 9900 },
];
function receivedAt(s) {
  if (s.mode === "stream") return Math.max(changeAt + s.latency, s.disconnectedUntil ? s.disconnectedUntil + s.latency : 0);
  let t = s.offset; // polls at offset, offset + 30 s, ...
  while (t < changeAt) t += pollSeconds * 1000;
  return t;
}
console.log("== 2. time until each SDK serves the new value ==");
let worst = { stream: 0, poll: 0, reconnect: 0 };
for (const s of sdks) {
  const lag = receivedAt(s) - changeAt;
  const k = s.disconnectedUntil ? "reconnect" : s.mode;
  worst[k] = Math.max(worst[k], lag);
  console.log(\`  \${s.name.padEnd(9)} \${String(lag).padStart(6)} ms\${s.disconnectedUntil ? "  (stream was down; old value served meanwhile)" : ""}\`);
}
console.log(\`  worst healthy stream: \${worst.stream} ms   reconnecting stream: \${worst.reconnect} ms   worst poll: \${worst.poll} ms\`);

// ---- 3. Out-of-order updates: apply only if version is newer ----
function apply(store, update, checkVersion) {
  const cur = store.get(update.key);
  if (checkVersion && cur && cur.version >= update.version) return "ignored";
  store.set(update.key, update);
  return "applied";
}
const arrivals = [
  { key: "checkout-v2", version: 8, value: false }, // the kill switch
  { key: "checkout-v2", version: 7, value: true },  // older patch delayed in a retry
];
console.log("== 3. updates arriving out of order (v8 kill switch, then a delayed v7) ==");
for (const check of [false, true]) {
  const store = new Map([["checkout-v2", { key: "checkout-v2", version: 6, value: true }]]);
  const res = arrivals.map((u) => \`v\${u.version}:\${apply(store, u, check)}\`).join(" ");
  const f = store.get("checkout-v2");
  console.log(\`  \${check ? "with version check   " : "without version check"} \${res} -> serving v\${f.version} value=\${f.value}\`);
}

// ---- 4. Flag service outage: what does each SDK serve? ----
// Last value in the service: checkout-v2 = true. Code default: false.
const codeDefault = false;
const cases = [
  { name: "warm SDK, stream drops", store: { "checkout-v2": true } },
  { name: "cold start, no persistent store", store: null },
  { name: "cold start, Redis or relay cache", store: { "checkout-v2": true } },
];
console.log("== 4. flag service down ==");
for (const c of cases) {
  const v = c.store ? c.store["checkout-v2"] : codeDefault;
  const why = c.store ? "last known value" : "code default";
  console.log(\`  \${c.name.padEnd(34)} serves \${String(v).padEnd(5)} (\${why})\`);
}` },
          { tech: "python", code: `# Feature flag delivery at scale: remote vs local evaluation, streaming vs polling,
# out-of-order updates, and what an SDK serves when the flag service is down.

# ---- 1. Capacity: why SDKs evaluate locally (all inputs are assumptions) ----
instances, rps_per_instance, flags_per_request = 2000, 500, 5
flags, bytes_per_flag, changes_per_day, poll_seconds = 1500, 2000, 300, 30
evals_per_sec = instances * rps_per_instance * flags_per_request
config_mb = flags * bytes_per_flag // 1000000
print("== 1. capacity ==")
print(f"  flag evaluations: {evals_per_sec:,}/s -> remote evaluation = that many network calls/s")
print(f"  local evaluation: {instances} long-lived streams, {config_mb} MB of rules per SDK, 0 calls per evaluation")
print(f"  full restart of the fleet downloads {instances * config_mb / 1000:.1f} GB of rules")
print(f"  change fan-out: {changes_per_day} changes/day x {instances} streams = {changes_per_day * instances:,} messages/day")
print(f"  polling every {poll_seconds} s instead: {instances / poll_seconds:.1f} requests/s, "
      f"{86400 // poll_seconds * instances:,}/day, mostly unchanged")

# ---- 2. Propagation of one change (fake clock, milliseconds) ----
# The flag "checkout-v2" is flipped to false (kill switch) at t = 10,000 ms.
change_at = 10000
sdks = [
    {"name": "stream-a", "mode": "stream", "latency": 40},
    {"name": "stream-b", "mode": "stream", "latency": 180},
    {"name": "stream-c", "mode": "stream", "latency": 90, "disconnected_until": 18500},  # reconnects, then re-syncs
    {"name": "poll-a", "mode": "poll", "offset": 3000},
    {"name": "poll-b", "mode": "poll", "offset": 21000},
    {"name": "poll-c", "mode": "poll", "offset": 9900},
]


def received_at(s):
    if s["mode"] == "stream":
        down = s.get("disconnected_until")
        return max(change_at + s["latency"], down + s["latency"] if down else 0)
    t = s["offset"]  # polls at offset, offset + 30 s, ...
    while t < change_at:
        t += poll_seconds * 1000
    return t


print("== 2. time until each SDK serves the new value ==")
worst = {"stream": 0, "poll": 0, "reconnect": 0}
for s in sdks:
    lag = received_at(s) - change_at
    k = "reconnect" if s.get("disconnected_until") else s["mode"]
    worst[k] = max(worst[k], lag)
    note = "  (stream was down; old value served meanwhile)" if s.get("disconnected_until") else ""
    print(f"  {s['name'].ljust(9)} {str(lag).rjust(6)} ms{note}")
print(f"  worst healthy stream: {worst['stream']} ms   reconnecting stream: {worst['reconnect']} ms   worst poll: {worst['poll']} ms")


# ---- 3. Out-of-order updates: apply only if version is newer ----
def apply(store, update, check_version):
    cur = store.get(update["key"])
    if check_version and cur and cur["version"] >= update["version"]:
        return "ignored"
    store[update["key"]] = update
    return "applied"


arrivals = [
    {"key": "checkout-v2", "version": 8, "value": False},  # the kill switch
    {"key": "checkout-v2", "version": 7, "value": True},   # older patch delayed in a retry
]
print("== 3. updates arriving out of order (v8 kill switch, then a delayed v7) ==")
for check in [False, True]:
    store = {"checkout-v2": {"key": "checkout-v2", "version": 6, "value": True}}
    res = " ".join(f"v{u['version']}:{apply(store, u, check)}" for u in arrivals)
    f = store["checkout-v2"]
    label = "with version check   " if check else "without version check"
    print(f"  {label} {res} -> serving v{f['version']} value={'true' if f['value'] else 'false'}")

# ---- 4. Flag service outage: what does each SDK serve? ----
# Last value in the service: checkout-v2 = true. Code default: false.
code_default = False
cases = [
    ("warm SDK, stream drops", {"checkout-v2": True}),
    ("cold start, no persistent store", None),
    ("cold start, Redis or relay cache", {"checkout-v2": True}),
]
print("== 4. flag service down ==")
for name, store in cases:
    v = store["checkout-v2"] if store else code_default
    why = "last known value" if store else "code default"
    print(f"  {name.ljust(34)} serves {('true' if v else 'false').ljust(5)} ({why})")` },
        ],
      },
    ],
  },
  {
    title: `Advanced feature flags — targeting, gradual rollout, and edge evaluation?`,
    difficulty: "hard",
    seoDescription: `Feature flag internals: rule order, segments, sticky hash bucketing, monotonic ramps, per-flag salts, and edge evaluation consistency, verified by code.`,
    description: `**Question presented to candidate:**
"Say our flag system already delivers rules to every SDK. How does a flag actually decide what one user gets? Walk me through targeting rules, how a 10% rollout stays stable as we ramp to 100%, and what changes if we evaluate flags at the CDN edge instead of in our servers."

**What a strong answer should cover:**
- A fixed **evaluation order**: off switch, prerequisites, individual targets, rules top to bottom (first match wins), then the fallthrough rollout, with the matched reason returned for debugging
- **Deterministic bucketing**: hash of flag key, a per-flag salt and the bucketing key into a fixed range (LaunchDarkly documents 100,000 buckets), so the same user always gets the same answer without storing assignments
- Why ramps are **monotonic** (raising 10% to 25% only adds users) and why a different salt per flag keeps rollouts of different flags independent; bucketing by organisation or device instead of user when consistency matters at that level
- Gradual rollout as a controlled process: stages, guardrail metrics, automatic rollback, and stable assignment for experiments
- **Edge evaluation**: lower latency and privacy (browsers get evaluated values, not rules), but eventually consistent config per location, so users can flip between versions unless you pin a version; and flag-dependent responses must not be cached as one shared page

**Clarifying questions expected:**
- Who is the unit of rollout: a user, an organisation, a device, a request?
- Is this a release (just ramp safely) or an experiment (needs stable assignment and statistics)?
- Which edge platform, and how fast does its config storage propagate?

**Code / implementation expected:** Optional — the examples implement rule evaluation and hash bucketing in four languages, and simulate edge propagation with version pinning.`,
    answer: `**Target Audience:** Intermediate engineers who know what a feature flag is (see the [feature flag system design](/interview-question/how-would-you-design-a-feature-flag-system-launchdarkly-style-at-scale)) and want the evaluation internals; every term is still defined.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 for the bucketing example (identical output); Node and Python for the edge example. LaunchDarkly bucketing facts are from the LaunchDarkly percentage-rollouts documentation and Cloudflare KV propagation from the Cloudflare storage overview, both checked October 2026.

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts with the exact vocabulary. Every count below comes from the example programs; the **Verified** section quotes their full output. The hashing scheme in the code is our own; it follows the documented idea (hash into 100,000 buckets) but is not a copy of any vendor's algorithm.

## 1. Why This Even Matters — A Story First

A bakery wants to try a new croissant recipe on one customer in ten. The baker could flip a coin each time a customer walks in, but then a regular gets the new croissant on Monday and the old one on Tuesday, and complains that the recipe keeps changing. Better: look at the last digit of their loyalty card number. Card ending in 0 gets the new recipe, every time, without the baker writing anything down. Next month, to widen the trial to three in ten, cards ending 0, 1 and 2 get it; everybody who already had it keeps it.

But if the bakery runs a second trial (a new coffee) also on cards ending in 0, the same customers get both, and nobody can tell which change they liked. So the second trial uses a different digit.

That is percentage rollout: a deterministic hash instead of a coin, ranges that only grow, and a different "digit" per flag.

## 2. The Evaluation Order

Every SDK evaluates a flag in the same fixed order and stops at the first step that decides:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="Flag evaluation order: off switch, individual targets, rules in order with first match winning, then fallthrough percentage rollout">
  <defs>
    <marker id="sd13q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="15" y="40" width="130" height="60" rx="8"/>
  <text class="d-text" x="80" y="68" text-anchor="middle">flag on?</text>
  <text class="d-sub" x="80" y="88" text-anchor="middle">else off value</text>
  <rect class="d-box" x="205" y="40" width="140" height="60" rx="8"/>
  <text class="d-text" x="275" y="68" text-anchor="middle">targets</text>
  <text class="d-sub" x="275" y="88" text-anchor="middle">listed keys</text>
  <rect class="d-box-accent" x="405" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="480" y="68" text-anchor="middle">rules 0, 1, 2</text>
  <text class="d-sub" x="480" y="88" text-anchor="middle">first match wins</text>
  <rect class="d-box" x="615" y="40" width="130" height="60" rx="8"/>
  <text class="d-text" x="680" y="68" text-anchor="middle">fallthrough</text>
  <text class="d-sub" x="680" y="88" text-anchor="middle">rollout by hash</text>
  <line class="d-edge" x1="145" y1="70" x2="201" y2="70" marker-end="url(#sd13q2-arrow)"/>
  <line class="d-edge" x1="345" y1="70" x2="401" y2="70" marker-end="url(#sd13q2-arrow)"/>
  <line class="d-edge" x1="555" y1="70" x2="611" y2="70" marker-end="url(#sd13q2-arrow)"/>
  <rect class="d-box-muted" x="230" y="145" width="300" height="50" rx="8"/>
  <text class="d-text" x="380" y="175" text-anchor="middle">value + reason</text>
  <line class="d-edge-dashed" x1="275" y1="100" x2="300" y2="141" marker-end="url(#sd13q2-arrow)"/>
  <line class="d-edge-dashed" x1="480" y1="100" x2="440" y2="141" marker-end="url(#sd13q2-arrow)"/>
  <line class="d-edge-dashed" x1="680" y1="100" x2="520" y2="150" marker-end="url(#sd13q2-arrow)"/>
</svg>

Each step either decides (dashed arrows) or passes to the next; the result always carries the reason, which is what makes "why did this user see the new checkout?" answerable.

📌 **Interview term: targeting rule** — a list of clauses over attributes (\`country in [NZ]\`, \`plan is enterprise\`, \`email endsWith @bigcustomer.com\`) and the variation to serve when all clauses match. Rules are ordered; the first match wins.

📌 **Interview term: segment** — a reusable, named group of users (a list or a rule set, such as "beta-testers") that many flags can target. Very large segments (millions of keys) are stored outside the flag JSON and looked up, so the rules stay small.

📌 **Interview term: fallthrough** — what a flag serves when no target or rule matched; usually a single variation or a percentage rollout.

The example has one flag, \`new-checkout\`, with two individual targets, three rules (NZ on, beta-testers on, enterprise off) and a 10% fallthrough rollout, evaluated over 100,000 synthetic users:

| Reason | Value | Users |
| :--- | :--- | ---: |
| TARGET | true | 2 |
| RULE 0 (country in [NZ]) | true | 5,000 |
| RULE 1 (segment beta-testers) | true | 100 |
| RULE 2 (plan is enterprise) | false | 13,554 |
| FALLTHROUGH | true | 8,163 |
| FALLTHROUGH | false | 73,181 |

Order matters: \`user-7007\` is both a beta tester and an enterprise customer and gets **true** because rule 1 comes before rule 2. Move the enterprise rule up and that user flips. Showing the reason (\`RULE 1 (segment beta-testers)\`) in debugging tools is how teams catch this.

Only 8,163 of the 81,344 fallthrough users (10.0%) got the new checkout: the 10% applies to whoever reaches the fallthrough, not to the whole population.

## 3. Percentage Rollouts: Hash, Do Not Store

📌 **Interview term: deterministic bucketing** — computing a user's bucket from a hash of stable inputs, so every SDK, in every language, on every server, gets the same answer with no shared state. LaunchDarkly's documentation describes hashing each context into 100,000 buckets and assigning bucket ranges to variations.

Our version:

~~~js
function bucket(flagKey, salt, key) {
  const hex = crypto.createHash("sha1").update(flagKey + "." + salt + "." + key).digest("hex");
  const v = parseInt(hex.slice(0, 8), 16);       // first 32 bits
  return Math.floor((v * 100000) / 4294967296);  // 0 .. 99999
}
// 10% on means bucket < 10000
~~~

The hash is not for security; it is for spreading keys evenly and identically in every runtime. That is why the same program runs in four languages with identical counts.

### Ramping: sticky versus re-rolled

The run raises the rollout from 1% to 100%. "Lost" counts users who had the feature at the previous step and lost it at this one:

| Step | Users on | Lost (sticky hash) | Lost (hash re-rolled per percentage) |
| ---: | ---: | ---: | ---: |
| 1% | 1,009 | 0 | 0 |
| 5% | 5,091 | 0 | 942 |
| 10% | 10,117 | 0 | 4,564 |
| 25% | 25,021 | 0 | 7,592 |
| 50% | 49,970 | 0 | 12,386 |
| 100% | 100,000 | 0 | 0 |

With a fixed salt, the bucket never changes and raising the threshold only adds buckets, so nobody loses the feature. LaunchDarkly's docs describe the same property: raising the percentage adds buckets and contexts already assigned keep their variation. If the hash input changes with the percentage (a common home-made bug), 12,386 users lose the feature going from 25% to 50%: their UI changes back and forth, and any experiment is ruined.

📌 **Interview term: sticky (consistent) assignment** — a user keeps the same variation across requests, devices and ramps, as long as the flag key, salt and bucketing key are unchanged.

### Independent flags

| Two 10% flags | Users in both |
| :--- | ---: |
| Same flag key and salt (copied flag) | 10,117 |
| Different key and salt | 996 |

With the same hash input, the same 10% get both features: two experiments that always run on the same users cannot be told apart. With a different key and salt per flag the overlap is 996, about 10% of 10%, which is what independent assignment should give.

📌 **Interview term: salt** — an extra value mixed into the hash per flag. Changing it reshuffles everyone (useful to restart an experiment), keeping it keeps assignments.

### Bucketing by organisation

For a B2B product, half of one company seeing the new billing page is a support nightmare. The run puts 25 users in each of 4,000 orgs at a 50% rollout:

| Bucket by | Orgs with mixed values |
| :--- | ---: |
| user key | 4,000 |
| org key | 0 |

Every org was split when bucketing by user. Hashing the org key instead gives each organisation one answer.

📌 **Interview term: bucketing key (context kind)** — the attribute fed to the hash: user, organisation, device, or request. Pick the unit that must see one consistent experience.

## 4. Gradual Rollout as a Process

A percentage is just a number; a safe rollout is a procedure:

1. **Stages** with a soak time: 1%, 5%, 25%, 50%, 100%, matching the ramp in the run. Start with internal users (an individual-target rule) before any percentage.
2. **Guardrail metrics** per variation: error rate, latency, conversion. Because evaluation events record the variation served, you can compare the 10% against the 90% directly.
3. **Automatic rollback**: if a guardrail breaches, set the rollout to 0% (or flip the kill switch) without waiting for a human.
4. **Cleanup**: at 100% for long enough, remove the flag and the old code path.

This is a [canary release](/interview-question/what-are-blue-green-and-canary-deployments) done in the application instead of the load balancer: finer grained (per user, per org) and reversible in one write.

For **experiments**, add two things: assignment must be sticky (the run shows why), and check the ratio of users per variation against the configured split; a mismatch (sample ratio mismatch) means something upstream is filtering users and the results are not valid.

## 5. Evaluating at the Edge

📌 **Interview term: edge evaluation** — evaluating flags in code that runs at CDN locations close to the user (for example a Cloudflare Worker), using flag config replicated to those locations, instead of in the origin servers.

Why bother? From the run, with assumed round trips of 20 ms user-to-edge and 120 ms edge-to-origin, a page that needs its flags before rendering knows them in **20.05 ms** at the edge versus **140.05 ms** at the origin. The edge can also pick which cached variant of a page to serve, rewrite HTML, or route a percentage of users to a new backend. The platform side is covered in [designing an edge-native app on Cloudflare Workers](/interview-question/how-would-you-design-an-edge-native-app-on-cloudflare-workers-r2).

**Privacy and size.** The run builds 200 flags with 50 targeted users each:

| Sent to the browser | Bytes |
| :--- | ---: |
| Full rules | 175,371 (exposes 10,000 targeted user keys and customer domains) |
| Evaluated values for this user | 3,224 |

Evaluated values are 54.4 times smaller and leak nothing. Edge evaluation makes this natural: the rules stay at the edge, the browser gets values.

### The consistency problem

Edge config stores are usually eventually consistent: Cloudflare's storage overview says Workers KV updates take up to 60 seconds to be reflected everywhere. The run publishes a kill switch (v2, \`new-checkout\` off) at t = 0, with assumed arrival times of 5 s in SYD, 22 s in SIN and 58 s in LAX, while one user's requests rotate between the three locations every 4 s (a phone switching networks can do this):

| | Value changes the user saw | Requests sent to origin |
| :--- | ---: | ---: |
| Without pinning | 7 | 0 |
| With version pinning | 1 | 4 |

Without pinning the user saw the feature switch off, on, off, on: seven changes in one minute. The fix is a monotonic read per user: the response sets a cookie with the highest config version the user has seen, and a location holding an older version forwards that request to the origin (or a strongly consistent store) instead of answering. One clean change, at the cost of 4 origin requests during the propagation window.

📌 **Interview term: monotonic reads** — a guarantee that once a client has seen version N, it never sees an older version afterwards. See [strong vs eventual consistency](/interview-question/what-is-the-difference-between-strong-and-eventual-consistency).

### Caching flag-dependent pages

If the HTML differs by variation, a shared CDN cache must key on the variation, never on the raw user. Evaluate at the edge first, then use \`new-checkout=on\` as part of the cache key: two cached copies instead of one per user. Caching per user destroys the hit rate; ignoring the variation serves one user's variant to everyone. The [edge caching page](/interview-question/edge-caching-on-cloudflare-how-do-you-get-95-hit-rate-without-stale-data) covers cache keys in depth.

## 6. Verified: Running the Code

Both programs are deterministic simulations. The bucketing program uses 100,000 synthetic users whose attributes come from their index; the edge program stands in for edge locations with a list and a fixed arrival time per location, and for a cookie with a variable. No network, no CDN.

**Example 1 — rules and bucketing** (identical in Node, Python, Go and Java):

~~~text
== A. who gets what (100000 users, 10% fallthrough rollout) ==
  FALLTHROUGH -> false                             73181
  FALLTHROUGH -> true                               8163
  RULE 0 (country in [NZ]) -> true                  5000
  RULE 1 (segment beta-testers) -> true              100
  RULE 2 (plan is enterprise) -> false             13554
  TARGET -> true                                       2
== B. sample evaluations ==
  user-42    true  TARGET
  user-40    true  RULE 0 (country in [NZ])
  user-1007  true  RULE 1 (segment beta-testers)
  user-7007  true  RULE 1 (segment beta-testers)
  user-14    false RULE 2 (plan is enterprise)
  user-1     false FALLTHROUGH bucket 87380
  user-2     false FALLTHROUGH bucket 23973
== C. ramping the rollout: sticky hash vs re-rolled hash ==
    1%  on=  1009  sticky lost=    0  re-rolled lost=    0
    5%  on=  5091  sticky lost=    0  re-rolled lost=  942
   10%  on= 10117  sticky lost=    0  re-rolled lost= 4564
   25%  on= 25021  sticky lost=    0  re-rolled lost= 7592
   50%  on= 49970  sticky lost=    0  re-rolled lost=12386
  100%  on=100000  sticky lost=    0  re-rolled lost=    0
== D. two 10% flags: same hash input vs different flag keys ==
  same key+salt: both on=10117  different key+salt: both on=996
== E. 50% rollout, 25 users per org: bucket by user vs by org ==
  bucketBy=key  orgs=4000  orgs with mixed values=4000
  bucketBy=org  orgs=4000  orgs with mixed values=0
~~~

**Example 2 — edge propagation, pinning and payload** (identical in Node and Python):

~~~text
== without version pinning ==
  t=-8s SYD:v1:on  t=-4s SIN:v1:on  t=0s LAX:v1:on  t=4s SYD:v1:on
  t=8s SIN:v1:on  t=12s LAX:v1:on  t=16s SYD:v2:off  t=20s SIN:v1:on
  t=24s LAX:v1:on  t=28s SYD:v2:off  t=32s SIN:v2:off  t=36s LAX:v1:on
  t=40s SYD:v2:off  t=44s SIN:v2:off  t=48s LAX:v1:on  t=52s SYD:v2:off
  t=56s SIN:v2:off  t=60s LAX:v2:off  t=64s SYD:v2:off
  value changes seen by the user: 7   requests sent to origin: 0
== with version pinning (a cookie carries the highest config version seen) ==
  t=-8s SYD:v1:on  t=-4s SIN:v1:on  t=0s LAX:v1:on  t=4s SYD:v1:on
  t=8s SIN:v1:on  t=12s LAX:v1:on  t=16s SYD:v2:off  t=20s origin:v2:off
  t=24s origin:v2:off  t=28s SYD:v2:off  t=32s SIN:v2:off  t=36s origin:v2:off
  t=40s SYD:v2:off  t=44s SIN:v2:off  t=48s origin:v2:off  t=52s SYD:v2:off
  t=56s SIN:v2:off  t=60s LAX:v2:off  t=64s SYD:v2:off
  value changes seen by the user: 1   requests sent to origin: 4
== client payload for 200 flags ==
  full rules: 175371 bytes (exposes 10000 targeted user keys and customer domains)
  evaluated values: 3224 bytes (54.4x smaller, nothing to leak)
== time to know the flags for one page ==
  evaluate at origin: 140.05 ms   evaluate at edge: 20.05 ms
~~~

## 7. Edge Cases Worth Knowing

- **Missing bucketing attribute**: a user without an org key cannot be bucketed by org; decide explicitly (serve the off variation, or fall back to user key) rather than hashing an empty string, which puts every such user in the same bucket.
- **Anonymous users who log in**: a device-key bucket and a user-key bucket differ, so the experience can change at login. Alias the identities or bucket by device for pre-login flows.
- **Rule edits during an experiment**: adding a rule above the rollout removes users from the experiment population mid-test.
- **Large segments at the edge**: millions of keys do not fit in a flag payload; use a separate lookup (a KV entry per key or a Bloom filter, see [Bloom filters](/interview-question/what-is-a-bloom-filter-and-when-is-it-useful)).
- **Multivariate rollouts**: weights must sum to 100,000; keep the order of variations stable or users move between them.

## Common Pitfalls

- **Assuming 10% of the population.** Only users reaching the fallthrough are rolled out; in the run, 8,163 of 100,000 got the feature through the rollout.
- **Rule order bugs.** \`user-7007\` got true because the beta rule sits above the enterprise rule.
- **Re-rolling the hash on ramp.** 12,386 users lost the feature at the 25% to 50% step in the run.
- **Reusing salt across flags.** Two copied 10% flags overlapped on 10,117 users instead of about 1,000.
- **Bucketing by user in a B2B product.** All 4,000 orgs were split at 50%.
- **Trusting edge config to be consistent.** One user saw 7 changes in a minute without version pinning.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Evaluation order:</strong> <span style="color:#f0e2c8;">Off switch, prerequisites, individual targets, then rules in order where the <strong style="color:#ffca28;">first match wins</strong>, then the fallthrough. I always return the reason, because rule order surprises people: a user in both the beta segment and the enterprise rule gets whichever rule is higher.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Bucketing:</strong> <span style="color:#f0e2c8;">For percentages I hash flag key, a per-flag salt and the bucketing key into a fixed range, 100,000 buckets as LaunchDarkly documents. No assignment is stored, yet every SDK in every language agrees; my four implementations print identical counts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Ramps and independence:</strong> <span style="color:#f0e2c8;">Because the bucket never changes, raising 10% to 25% only adds users: zero lost in my run, versus 12,386 lost at one step when the hash was re-rolled. A different salt per flag keeps experiments independent: 996 users in both 10% flags instead of all 10,117.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The unit of rollout:</strong> <span style="color:#f0e2c8;">I choose the <strong style="color:#ffca28;">bucketing key</strong> deliberately: user for consumer features, organisation for B2B so a company sees one experience (0 split orgs instead of 4,000), device for anonymous traffic. Then I run the ramp as a process with guardrail metrics and automatic rollback.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Edge:</strong> <span style="color:#f0e2c8;">Evaluating at the edge saves the origin round trip (about 20 ms versus 140 ms in my model) and keeps rules off the browser (3 KB of values instead of 175 KB of rules). The price is eventual consistency, so I pin each user to the highest config version seen: 1 change instead of 7 during propagation.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not store each user assignment in a database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It puts a lookup on every evaluation, has to be replicated to every region and every SDK, and grows with users times flags. A hash gives the same stability for free; storage is only needed when you must freeze assignments across a salt or rule change, and then as an override list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you restart an experiment with fresh assignments?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the salt. Every user gets a new uniform bucket, so the new run is independent of the old one. Keep the old salt in the audit log so past analysis can be reproduced.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you evaluate a segment with ten million members at the edge?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not inside the flag JSON. Store membership as a separate key-value lookup per user, or ship a Bloom filter that answers "definitely not a member" locally and confirm positives with a lookup; cache the result per user for the session.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the same user get different values from server and browser SDKs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if they bucket on different keys or see different config versions. Use the same context (same key and kind) on both, and have the server bootstrap the browser with the values it evaluated, so the first render matches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong if you cache flag-dependent HTML at the CDN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without the variation in the cache key, one user's variant is served to everyone; with the user in the key the hit rate collapses. Evaluate at the edge first, then cache by variation, a few copies per page.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Targeting rule | Ordered clauses over attributes with a variation to serve; first match wins |
| Segment | Named reusable group of users targeted by many flags |
| Fallthrough | What a flag serves when no target or rule matched |
| Deterministic bucketing | Bucket computed from a hash of stable inputs, no stored state |
| Sticky assignment | A user keeps the same variation across requests and ramps |
| Salt | Per-flag value mixed into the hash; changing it reshuffles users |
| Bucketing key | The attribute hashed: user, org, device or request |
| Edge evaluation | Evaluating flags at CDN locations near the user |
| Monotonic reads | Once version N is seen, nothing older is shown again |

**Conclusion:** A flag decides in a fixed order (off, targets, ordered rules, fallthrough) and reports why. Percentages come from a hash of flag key, salt and a chosen bucketing key into 100,000 buckets, which makes assignment stable without storage, ramps monotonic (zero users lost), flags independent (996 overlaps instead of 10,117), and B2B rollouts consistent per organisation. Run the ramp as a guarded process with automatic rollback. Moving evaluation to the edge saves a round trip and keeps rules off devices, but edge config is eventually consistent, so pin users to the highest version they have seen and cache pages by variation, never by user.`,
    examples: [
      {
        label: `Targeting rules and sticky percentage rollouts: rule order, SHA-1 buckets, monotonic ramps, per-flag independence, bucketing by org`,
        variants: [
          { tech: "node", code: `// Targeting rules + sticky percentage rollouts, evaluated locally like a server-side SDK.
const crypto = require("crypto");

// bucket in [0, 99999]: first 32 bits of SHA-1("flag.salt.key") scaled to 100,000 buckets
function bucket(flagKey, salt, key) {
  const hex = crypto.createHash("sha1").update(flagKey + "." + salt + "." + key).digest("hex");
  const v = parseInt(hex.slice(0, 8), 16);
  return Math.floor((v * 100000) / 4294967296);
}

const N = 100000;
const users = [];
for (let i = 0; i < N; i++) {
  users.push({
    key: "user-" + i,
    org: "org-" + Math.floor(i / 25),
    country: i % 20 === 0 ? "NZ" : "US",
    plan: i % 7 === 0 ? "enterprise" : "free",
  });
}
const betaTesters = new Set();
for (let i = 7; i < N; i += 1000) betaTesters.add("user-" + i);

const flag = {
  key: "new-checkout", salt: "a1b2", on: true, offValue: false,
  targets: new Set(["user-42", "user-4242"]),
  rules: [
    { name: "country in [NZ]", match: (u) => u.country === "NZ", serve: true },
    { name: "segment beta-testers", match: (u) => betaTesters.has(u.key), serve: true },
    { name: "plan is enterprise", match: (u) => u.plan === "enterprise", serve: false },
  ],
  rolloutPct: 10, bucketBy: "key",
};

function evaluate(f, u) {
  if (!f.on) return { value: f.offValue, reason: "OFF" };
  if (f.targets.has(u.key)) return { value: true, reason: "TARGET" };
  for (let r = 0; r < f.rules.length; r++) {
    if (f.rules[r].match(u)) return { value: f.rules[r].serve, reason: "RULE " + r + " (" + f.rules[r].name + ")" };
  }
  const b = bucket(f.key, f.salt, u[f.bucketBy]);
  return { value: b < f.rolloutPct * 1000, reason: "FALLTHROUGH bucket " + b };
}

console.log("== A. who gets what (" + N + " users, 10% fallthrough rollout) ==");
const counts = new Map();
for (const u of users) {
  const r = evaluate(flag, u);
  const label = (r.reason.startsWith("FALLTHROUGH") ? "FALLTHROUGH" : r.reason) + " -> " + r.value;
  counts.set(label, (counts.get(label) || 0) + 1);
}
for (const k of [...counts.keys()].sort()) console.log("  " + k.padEnd(48) + String(counts.get(k)).padStart(6));

console.log("== B. sample evaluations ==");
for (const k of ["user-42", "user-40", "user-1007", "user-7007", "user-14", "user-1", "user-2"]) {
  const u = users[Number(k.slice(5))];
  const r = evaluate(flag, u);
  console.log("  " + k.padEnd(10) + " " + String(r.value).padEnd(6) + r.reason);
}

console.log("== C. ramping the rollout: sticky hash vs re-rolled hash ==");
const steps = [1, 5, 10, 25, 50, 100];
let prevSticky = null, prevNaive = null;
for (const p of steps) {
  const sticky = users.map((u) => bucket("new-checkout", "a1b2", u.key) < p * 1000);
  const naive = users.map((u) => bucket("new-checkout", "pct" + p, u.key) < p * 1000);
  const on = sticky.filter(Boolean).length;
  const lostS = prevSticky ? sticky.filter((v, i) => prevSticky[i] && !v).length : 0;
  const lostN = prevNaive ? naive.filter((v, i) => prevNaive[i] && !v).length : 0;
  console.log("  " + String(p).padStart(3) + "%  on=" + String(on).padStart(6) +
    "  sticky lost=" + String(lostS).padStart(5) + "  re-rolled lost=" + String(lostN).padStart(5));
  prevSticky = sticky; prevNaive = naive;
}

console.log("== D. two 10% flags: same hash input vs different flag keys ==");
const inA = users.map((u) => bucket("new-checkout", "a1b2", u.key) < 10000);
const inCopy = users.map((u) => bucket("new-checkout", "a1b2", u.key) < 10000);
const inB = users.map((u) => bucket("dark-mode", "c3d4", u.key) < 10000);
const both = (x, y) => x.filter((v, i) => v && y[i]).length;
console.log("  same key+salt: both on=" + both(inA, inCopy) + "  different key+salt: both on=" + both(inA, inB));

console.log("== E. 50% rollout, 25 users per org: bucket by user vs by org ==");
for (const by of ["key", "org"]) {
  const perOrg = new Map();
  for (const u of users) {
    const v = bucket("new-checkout", "a1b2", u[by]) < 50000;
    const s = perOrg.get(u.org) || { on: 0, off: 0 };
    v ? s.on++ : s.off++;
    perOrg.set(u.org, s);
  }
  let mixed = 0;
  for (const s of perOrg.values()) if (s.on > 0 && s.off > 0) mixed++;
  console.log("  bucketBy=" + by.padEnd(4) + " orgs=" + perOrg.size + "  orgs with mixed values=" + mixed);
}` },
          { tech: "python", code: `# Targeting rules + sticky percentage rollouts, evaluated locally like a server-side SDK.
import hashlib


def bucket(flag_key, salt, key):
    """bucket in [0, 99999]: first 32 bits of SHA-1("flag.salt.key") scaled to 100,000 buckets"""
    h = hashlib.sha1(f"{flag_key}.{salt}.{key}".encode()).hexdigest()
    return int(h[:8], 16) * 100000 // 4294967296


N = 100000
users = [{"key": f"user-{i}", "org": f"org-{i // 25}",
          "country": "NZ" if i % 20 == 0 else "US",
          "plan": "enterprise" if i % 7 == 0 else "free"} for i in range(N)]
beta_testers = {f"user-{i}" for i in range(7, N, 1000)}

flag = {
    "key": "new-checkout", "salt": "a1b2", "on": True, "off_value": False,
    "targets": {"user-42", "user-4242"},
    "rules": [
        ("country in [NZ]", lambda u: u["country"] == "NZ", True),
        ("segment beta-testers", lambda u: u["key"] in beta_testers, True),
        ("plan is enterprise", lambda u: u["plan"] == "enterprise", False),
    ],
    "rollout_pct": 10, "bucket_by": "key",
}


def evaluate(f, u):
    if not f["on"]:
        return f["off_value"], "OFF"
    if u["key"] in f["targets"]:
        return True, "TARGET"
    for r, (name, match, serve) in enumerate(f["rules"]):
        if match(u):
            return serve, f"RULE {r} ({name})"
    b = bucket(f["key"], f["salt"], u[f["bucket_by"]])
    return b < f["rollout_pct"] * 1000, f"FALLTHROUGH bucket {b}"


js = lambda v: "true" if v else "false"

print(f"== A. who gets what ({N} users, 10% fallthrough rollout) ==")
counts = {}
for u in users:
    value, reason = evaluate(flag, u)
    label = ("FALLTHROUGH" if reason.startswith("FALLTHROUGH") else reason) + " -> " + js(value)
    counts[label] = counts.get(label, 0) + 1
for k in sorted(counts):
    print("  " + k.ljust(48) + str(counts[k]).rjust(6))

print("== B. sample evaluations ==")
for k in ["user-42", "user-40", "user-1007", "user-7007", "user-14", "user-1", "user-2"]:
    value, reason = evaluate(flag, users[int(k[5:])])
    print("  " + k.ljust(10) + " " + js(value).ljust(6) + reason)

print("== C. ramping the rollout: sticky hash vs re-rolled hash ==")
prev_s = prev_n = None
for p in [1, 5, 10, 25, 50, 100]:
    sticky = [bucket("new-checkout", "a1b2", u["key"]) < p * 1000 for u in users]
    naive = [bucket("new-checkout", f"pct{p}", u["key"]) < p * 1000 for u in users]
    on = sum(sticky)
    lost_s = sum(1 for a, b in zip(prev_s, sticky) if a and not b) if prev_s else 0
    lost_n = sum(1 for a, b in zip(prev_n, naive) if a and not b) if prev_n else 0
    print("  " + str(p).rjust(3) + "%  on=" + str(on).rjust(6) +
          "  sticky lost=" + str(lost_s).rjust(5) + "  re-rolled lost=" + str(lost_n).rjust(5))
    prev_s, prev_n = sticky, naive

print("== D. two 10% flags: same hash input vs different flag keys ==")
in_a = [bucket("new-checkout", "a1b2", u["key"]) < 10000 for u in users]
in_copy = [bucket("new-checkout", "a1b2", u["key"]) < 10000 for u in users]
in_b = [bucket("dark-mode", "c3d4", u["key"]) < 10000 for u in users]
both = lambda x, y: sum(1 for a, b in zip(x, y) if a and b)
print(f"  same key+salt: both on={both(in_a, in_copy)}  different key+salt: both on={both(in_a, in_b)}")

print("== E. 50% rollout, 25 users per org: bucket by user vs by org ==")
for by in ["key", "org"]:
    per_org = {}
    for u in users:
        v = bucket("new-checkout", "a1b2", u[by]) < 50000
        s = per_org.setdefault(u["org"], [0, 0])
        s[0 if v else 1] += 1
    mixed = sum(1 for on, off in per_org.values() if on > 0 and off > 0)
    print("  bucketBy=" + by.ljust(4) + f" orgs={len(per_org)}  orgs with mixed values={mixed}")` },
          { tech: "go", code: `// Targeting rules + sticky percentage rollouts, evaluated locally like a server-side SDK.
package main

import (
	"crypto/sha1"
	"encoding/binary"
	"fmt"
	"sort"
	"strings"
)

// bucket in [0, 99999]: first 32 bits of SHA-1("flag.salt.key") scaled to 100,000 buckets
func bucket(flagKey, salt, key string) int {
	sum := sha1.Sum([]byte(flagKey + "." + salt + "." + key))
	v := uint64(binary.BigEndian.Uint32(sum[:4]))
	return int(v * 100000 / 4294967296)
}

type User struct{ key, org, country, plan string }

func (u User) attr(name string) string {
	if name == "org" {
		return u.org
	}
	return u.key
}

type Rule struct {
	name  string
	match func(User) bool
	serve bool
}

const N = 100000

var users []User
var beta = map[string]bool{}
var targets = map[string]bool{"user-42": true, "user-4242": true}
var rules []Rule

func evaluate(u User) (bool, string) {
	if targets[u.key] {
		return true, "TARGET"
	}
	for r, rule := range rules {
		if rule.match(u) {
			return rule.serve, fmt.Sprintf("RULE %d (%s)", r, rule.name)
		}
	}
	b := bucket("new-checkout", "a1b2", u.key)
	return b < 10*1000, fmt.Sprintf("FALLTHROUGH bucket %d", b)
}

func pad(s string, n int) string  { return s + strings.Repeat(" ", max(0, n-len(s))) }
func lpad(s string, n int) string { return strings.Repeat(" ", max(0, n-len(s))) + s }

func main() {
	for i := 0; i < N; i++ {
		u := User{fmt.Sprintf("user-%d", i), fmt.Sprintf("org-%d", i/25), "US", "free"}
		if i%20 == 0 {
			u.country = "NZ"
		}
		if i%7 == 0 {
			u.plan = "enterprise"
		}
		users = append(users, u)
	}
	for i := 7; i < N; i += 1000 {
		beta[fmt.Sprintf("user-%d", i)] = true
	}
	rules = []Rule{
		{"country in [NZ]", func(u User) bool { return u.country == "NZ" }, true},
		{"segment beta-testers", func(u User) bool { return beta[u.key] }, true},
		{"plan is enterprise", func(u User) bool { return u.plan == "enterprise" }, false},
	}

	fmt.Printf("== A. who gets what (%d users, 10%% fallthrough rollout) ==\\n", N)
	counts := map[string]int{}
	for _, u := range users {
		v, reason := evaluate(u)
		if strings.HasPrefix(reason, "FALLTHROUGH") {
			reason = "FALLTHROUGH"
		}
		counts[fmt.Sprintf("%s -> %t", reason, v)]++
	}
	keys := make([]string, 0, len(counts))
	for k := range counts {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Println("  " + pad(k, 48) + lpad(fmt.Sprint(counts[k]), 6))
	}

	fmt.Println("== B. sample evaluations ==")
	for _, k := range []string{"user-42", "user-40", "user-1007", "user-7007", "user-14", "user-1", "user-2"} {
		var idx int
		fmt.Sscanf(k[5:], "%d", &idx)
		v, reason := evaluate(users[idx])
		fmt.Println("  " + pad(k, 10) + " " + pad(fmt.Sprint(v), 6) + reason)
	}

	fmt.Println("== C. ramping the rollout: sticky hash vs re-rolled hash ==")
	var prevS, prevN []bool
	for _, p := range []int{1, 5, 10, 25, 50, 100} {
		sticky := make([]bool, N)
		naive := make([]bool, N)
		on, lostS, lostN := 0, 0, 0
		for i, u := range users {
			sticky[i] = bucket("new-checkout", "a1b2", u.key) < p*1000
			naive[i] = bucket("new-checkout", fmt.Sprintf("pct%d", p), u.key) < p*1000
			if sticky[i] {
				on++
			}
			if prevS != nil && prevS[i] && !sticky[i] {
				lostS++
			}
			if prevN != nil && prevN[i] && !naive[i] {
				lostN++
			}
		}
		fmt.Println("  " + lpad(fmt.Sprint(p), 3) + "%  on=" + lpad(fmt.Sprint(on), 6) +
			"  sticky lost=" + lpad(fmt.Sprint(lostS), 5) + "  re-rolled lost=" + lpad(fmt.Sprint(lostN), 5))
		prevS, prevN = sticky, naive
	}

	fmt.Println("== D. two 10% flags: same hash input vs different flag keys ==")
	same, diff := 0, 0
	for _, u := range users {
		a := bucket("new-checkout", "a1b2", u.key) < 10000
		c := bucket("new-checkout", "a1b2", u.key) < 10000
		b := bucket("dark-mode", "c3d4", u.key) < 10000
		if a && c {
			same++
		}
		if a && b {
			diff++
		}
	}
	fmt.Printf("  same key+salt: both on=%d  different key+salt: both on=%d\\n", same, diff)

	fmt.Println("== E. 50% rollout, 25 users per org: bucket by user vs by org ==")
	for _, by := range []string{"key", "org"} {
		perOrg := map[string][2]int{}
		for _, u := range users {
			s := perOrg[u.org]
			if bucket("new-checkout", "a1b2", u.attr(by)) < 50000 {
				s[0]++
			} else {
				s[1]++
			}
			perOrg[u.org] = s
		}
		mixed := 0
		for _, s := range perOrg {
			if s[0] > 0 && s[1] > 0 {
				mixed++
			}
		}
		fmt.Printf("  bucketBy=%s orgs=%d  orgs with mixed values=%d\\n", pad(by, 4), len(perOrg), mixed)
	}
}` },
          { tech: "java", code: `// Targeting rules + sticky percentage rollouts, evaluated locally like a server-side SDK.
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Predicate;

public class Main {
    static MessageDigest md;

    // bucket in [0, 99999]: first 32 bits of SHA-1("flag.salt.key") scaled to 100,000 buckets
    static int bucket(String flagKey, String salt, String key) {
        byte[] d = md.digest((flagKey + "." + salt + "." + key).getBytes(StandardCharsets.UTF_8));
        long v = ((d[0] & 0xFFL) << 24) | ((d[1] & 0xFFL) << 16) | ((d[2] & 0xFFL) << 8) | (d[3] & 0xFFL);
        return (int) (v * 100000L / 4294967296L);
    }

    record User(String key, String org, String country, String plan) {
        String attr(String name) { return name.equals("org") ? org : key; }
    }
    record Rule(String name, Predicate<User> match, boolean serve) {}

    static final int N = 100000;
    static List<User> users = new ArrayList<>();
    static Set<String> beta = new HashSet<>();
    static Set<String> targets = Set.of("user-42", "user-4242");
    static List<Rule> rules;

    static Object[] evaluate(User u) {
        if (targets.contains(u.key())) return new Object[]{true, "TARGET"};
        for (int r = 0; r < rules.size(); r++) {
            Rule rule = rules.get(r);
            if (rule.match().test(u)) return new Object[]{rule.serve(), "RULE " + r + " (" + rule.name() + ")"};
        }
        int b = bucket("new-checkout", "a1b2", u.key());
        return new Object[]{b < 10 * 1000, "FALLTHROUGH bucket " + b};
    }

    static String pad(String s, int n) { return String.format("%-" + n + "s", s); }
    static String lpad(Object s, int n) { return String.format("%" + n + "s", s); }

    public static void main(String[] args) throws Exception {
        md = MessageDigest.getInstance("SHA-1");
        for (int i = 0; i < N; i++)
            users.add(new User("user-" + i, "org-" + (i / 25), i % 20 == 0 ? "NZ" : "US", i % 7 == 0 ? "enterprise" : "free"));
        for (int i = 7; i < N; i += 1000) beta.add("user-" + i);
        rules = List.of(
            new Rule("country in [NZ]", u -> u.country().equals("NZ"), true),
            new Rule("segment beta-testers", u -> beta.contains(u.key()), true),
            new Rule("plan is enterprise", u -> u.plan().equals("enterprise"), false));

        System.out.println("== A. who gets what (" + N + " users, 10% fallthrough rollout) ==");
        TreeMap<String, Integer> counts = new TreeMap<>();
        for (User u : users) {
            Object[] r = evaluate(u);
            String reason = (String) r[1];
            String label = (reason.startsWith("FALLTHROUGH") ? "FALLTHROUGH" : reason) + " -> " + r[0];
            counts.merge(label, 1, Integer::sum);
        }
        for (var e : counts.entrySet()) System.out.println("  " + pad(e.getKey(), 48) + lpad(e.getValue(), 6));

        System.out.println("== B. sample evaluations ==");
        for (String k : List.of("user-42", "user-40", "user-1007", "user-7007", "user-14", "user-1", "user-2")) {
            Object[] r = evaluate(users.get(Integer.parseInt(k.substring(5))));
            System.out.println("  " + pad(k, 10) + " " + pad(String.valueOf(r[0]), 6) + r[1]);
        }

        System.out.println("== C. ramping the rollout: sticky hash vs re-rolled hash ==");
        boolean[] prevS = null, prevN = null;
        for (int p : new int[]{1, 5, 10, 25, 50, 100}) {
            boolean[] sticky = new boolean[N], naive = new boolean[N];
            int on = 0, lostS = 0, lostN = 0;
            for (int i = 0; i < N; i++) {
                String key = users.get(i).key();
                sticky[i] = bucket("new-checkout", "a1b2", key) < p * 1000;
                naive[i] = bucket("new-checkout", "pct" + p, key) < p * 1000;
                if (sticky[i]) on++;
                if (prevS != null && prevS[i] && !sticky[i]) lostS++;
                if (prevN != null && prevN[i] && !naive[i]) lostN++;
            }
            System.out.println("  " + lpad(p, 3) + "%  on=" + lpad(on, 6) + "  sticky lost=" + lpad(lostS, 5) + "  re-rolled lost=" + lpad(lostN, 5));
            prevS = sticky; prevN = naive;
        }

        System.out.println("== D. two 10% flags: same hash input vs different flag keys ==");
        int same = 0, diff = 0;
        for (User u : users) {
            boolean a = bucket("new-checkout", "a1b2", u.key()) < 10000;
            boolean c = bucket("new-checkout", "a1b2", u.key()) < 10000;
            boolean b = bucket("dark-mode", "c3d4", u.key()) < 10000;
            if (a && c) same++;
            if (a && b) diff++;
        }
        System.out.println("  same key+salt: both on=" + same + "  different key+salt: both on=" + diff);

        System.out.println("== E. 50% rollout, 25 users per org: bucket by user vs by org ==");
        for (String by : List.of("key", "org")) {
            Map<String, int[]> perOrg = new HashMap<>();
            for (User u : users) {
                int[] s = perOrg.computeIfAbsent(u.org(), x -> new int[2]);
                s[bucket("new-checkout", "a1b2", u.attr(by)) < 50000 ? 0 : 1]++;
            }
            int mixed = 0;
            for (int[] s : perOrg.values()) if (s[0] > 0 && s[1] > 0) mixed++;
            System.out.println("  bucketBy=" + pad(by, 4) + " orgs=" + perOrg.size() + "  orgs with mixed values=" + mixed);
        }
    }
}` },
        ],
      },
      {
        label: `Edge evaluation: eventually consistent config per PoP, flip-flops and version pinning, rules vs evaluated values for browsers`,
        variants: [
          { tech: "node", code: `// Edge flag evaluation: eventually consistent config at each PoP, a user hopping between PoPs,
// version pinning to stop flip-flops, and what a browser should (not) be sent.

// Config versions. v2 is the kill switch: new-checkout off for everyone.
const configs = { 1: { "new-checkout": true }, 2: { "new-checkout": false } };
// Assumed propagation delay of v2 to each PoP after publish at t=0 (KV-style store: up to about 60 s).
const pops = [
  { name: "SYD", delay: 5 },
  { name: "SIN", delay: 22 },
  { name: "LAX", delay: 58 },
];
const versionAt = (pop, t) => (t >= pop.delay ? 2 : 1);

// The user moves between PoPs (mobile network, anycast route change): one request every 4 s.
function simulate(pinning) {
  let seen = 0, flips = 0, last = null, originCalls = 0;
  const trace = [];
  for (let t = -8, i = 0; t <= 64; t += 4, i++) {
    const pop = pops[i % pops.length];
    let v = versionAt(pop, t), where = pop.name;
    if (pinning && v < seen) { v = seen; where = "origin"; originCalls++; } // edge is older than the client: ask origin
    const value = configs[v]["new-checkout"];
    if (last !== null && value !== last) flips++;
    last = value; seen = Math.max(seen, v);
    trace.push(\`t=\${t}s \${where}:v\${v}:\${value ? "on" : "off"}\`);
  }
  return { trace, flips, originCalls };
}

for (const pinning of [false, true]) {
  const r = simulate(pinning);
  console.log(pinning ? "== with version pinning (a cookie carries the highest config version seen) ==" : "== without version pinning ==");
  for (let i = 0; i < r.trace.length; i += 4) console.log("  " + r.trace.slice(i, i + 4).join("  "));
  console.log(\`  value changes seen by the user: \${r.flips}   requests sent to origin: \${r.originCalls}\`);
}

// What to ship to a browser: the rules, or only the evaluated values for this user?
const flagsCount = 200;
const rulesConfig = {};
const evaluated = {};
for (let f = 0; f < flagsCount; f++) {
  const targets = [];
  for (let u = 0; u < 50; u++) targets.push("user-" + (f * 1000 + u));
  rulesConfig["flag-" + f] = {
    on: true, salt: "s" + f, targets,
    rules: [{ attr: "email", op: "endsWith", values: ["@bigcustomer.com"], serve: 0 }],
    rollout: [{ variation: 0, weight: 10000 }, { variation: 1, weight: 90000 }],
  };
  evaluated["flag-" + f] = f % 3 === 0;
}
const rulesBytes = JSON.stringify(rulesConfig).length;
const valuesBytes = JSON.stringify(evaluated).length;
console.log("== client payload for 200 flags ==");
console.log(\`  full rules: \${rulesBytes} bytes (exposes 10000 targeted user keys and customer domains)\`);
console.log(\`  evaluated values: \${valuesBytes} bytes (\${(rulesBytes / valuesBytes).toFixed(1)}x smaller, nothing to leak)\`);

// Latency for a page that needs its flags before rendering (assumed round-trip times).
const userToPop = 20, popToOrigin = 120, evalMs = 0.05;
console.log("== time to know the flags for one page ==");
console.log(\`  evaluate at origin: \${userToPop + popToOrigin + evalMs} ms   evaluate at edge: \${userToPop + evalMs} ms\`);` },
          { tech: "python", code: `# Edge flag evaluation: eventually consistent config at each PoP, a user hopping between PoPs,
# version pinning to stop flip-flops, and what a browser should (not) be sent.
import json

# Config versions. v2 is the kill switch: new-checkout off for everyone.
configs = {1: {"new-checkout": True}, 2: {"new-checkout": False}}
# Assumed propagation delay of v2 to each PoP after publish at t=0 (KV-style store: up to about 60 s).
pops = [{"name": "SYD", "delay": 5}, {"name": "SIN", "delay": 22}, {"name": "LAX", "delay": 58}]


def version_at(pop, t):
    return 2 if t >= pop["delay"] else 1


# The user moves between PoPs (mobile network, anycast route change): one request every 4 s.
def simulate(pinning):
    seen, flips, last, origin_calls, trace = 0, 0, None, 0, []
    for i, t in enumerate(range(-8, 65, 4)):
        pop = pops[i % len(pops)]
        v, where = version_at(pop, t), pop["name"]
        if pinning and v < seen:  # edge is older than the client: ask origin
            v, where = seen, "origin"
            origin_calls += 1
        value = configs[v]["new-checkout"]
        if last is not None and value != last:
            flips += 1
        last, seen = value, max(seen, v)
        trace.append(f"t={t}s {where}:v{v}:{'on' if value else 'off'}")
    return trace, flips, origin_calls


for pinning in [False, True]:
    trace, flips, origin_calls = simulate(pinning)
    print("== with version pinning (a cookie carries the highest config version seen) ==" if pinning else "== without version pinning ==")
    for i in range(0, len(trace), 4):
        print("  " + "  ".join(trace[i:i + 4]))
    print(f"  value changes seen by the user: {flips}   requests sent to origin: {origin_calls}")

# What to ship to a browser: the rules, or only the evaluated values for this user?
flags_count = 200
rules_config, evaluated = {}, {}
for f in range(flags_count):
    rules_config[f"flag-{f}"] = {
        "on": True, "salt": f"s{f}", "targets": [f"user-{f * 1000 + u}" for u in range(50)],
        "rules": [{"attr": "email", "op": "endsWith", "values": ["@bigcustomer.com"], "serve": 0}],
        "rollout": [{"variation": 0, "weight": 10000}, {"variation": 1, "weight": 90000}],
    }
    evaluated[f"flag-{f}"] = f % 3 == 0
rules_bytes = len(json.dumps(rules_config, separators=(",", ":")))
values_bytes = len(json.dumps(evaluated, separators=(",", ":")))
print("== client payload for 200 flags ==")
print(f"  full rules: {rules_bytes} bytes (exposes 10000 targeted user keys and customer domains)")
print(f"  evaluated values: {values_bytes} bytes ({rules_bytes / values_bytes:.1f}x smaller, nothing to leak)")

# Latency for a page that needs its flags before rendering (assumed round-trip times).
user_to_pop, pop_to_origin, eval_ms = 20, 120, 0.05
print("== time to know the flags for one page ==")
print(f"  evaluate at origin: {user_to_pop + pop_to_origin + eval_ms} ms   evaluate at edge: {user_to_pop + eval_ms} ms")` },
        ],
      },
    ],
  },
  {
    title: `How would you design an edge-native app on Cloudflare Workers + R2?`,
    difficulty: "medium",
    seoDescription: `Design an edge-native photo app on Cloudflare Workers and R2: where state lives (Cache API, KV, Durable Objects, D1), limits, uploads and a priced bill.`,
    description: `**Question presented to candidate:**
"We want to build a photo-sharing app with no servers of our own: code runs on Cloudflare Workers and images live in R2. Design it. Where does each kind of data live, what does a request look like, and what will it cost?"

**What a strong answer should cover:**
- The model: a Worker runs in every Cloudflare location, is stateless between requests, and has limits (128 MB memory per isolate, CPU time limits per request); all state lives in bound storage services
- Picking the right store per data type: **R2** for objects (S3-compatible, no egress fees), the **Cache API** for hot reads (per location, not replicated), **KV** for read-mostly config (eventually consistent, up to about 60 s), **Durable Objects** for anything needing coordination or exact counts, **D1** for relational metadata
- The read path: cache first, R2 on a miss, and why per-location caches make the hit rate depend on the number of locations and the catalogue size
- The write path: uploads streamed or presigned straight to R2, metadata in D1, counters and rate limits in Durable Objects, slow work pushed to a queue
- A priced estimate from the published Workers and R2 prices, and what breaks first as traffic grows

**Clarifying questions expected:**
- Read to write ratio, object sizes, and how much of the catalogue is hot?
- Which data needs strong consistency (counts, purchases, uniqueness) and which can be a minute stale?
- Where are users, and are there data residency requirements?

**Code / implementation expected:** Optional — the example simulates per-location caching, a counter in KV versus a Durable Object, and computes the monthly bill.`,
    answer: `**Target Audience:** Beginners to edge and serverless design — you know HTTP, caching and a database; every Cloudflare product used is explained when it first appears.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Cloudflare limits and prices are from the Cloudflare developer docs (Workers limits, Workers pricing, R2 pricing, storage overview, Cache API, Durable Objects concepts, D1 overview), checked October 2026; they change, so recheck before quoting a bill. The traffic numbers are assumptions.

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts with the vocabulary an interviewer expects. All counts and dollar figures come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A pizza chain can bake every pizza in one central kitchen and drive it across the city, or open small counters in every neighbourhood. The counters are fast: the pizza is two streets away. But a counter has no big storeroom, a small oven, and no idea what the other counters sold today. Anything that must be shared, like the stock of a limited special, has to be checked with one place that owns it.

An edge-native app is the neighbourhood-counter model. Your code runs in hundreds of locations near users, which makes it fast and removes the servers you would otherwise run. But each run is small and short-lived, and anything shared lives in a storage service with its own consistency rules. The design is mostly about putting each piece of data in the right store.

📌 **Interview term: edge computing** — running application code in many locations close to users (the CDN network) rather than in one or a few regions.

📌 **Interview term: Cloudflare Worker** — a JavaScript (or WebAssembly) function that Cloudflare runs in a lightweight isolate in its locations, on each request. It keeps no state between requests that you can rely on. The Workers limits page lists 128 MB of memory per isolate, and a CPU time limit of 10 ms per request on the Free plan and 30 s by default on the Paid plan (configurable up to 5 minutes).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many reads and uploads, and how big are images? | Sizes R2 storage, operations and bandwidth |
| How much of the catalogue is hot? | A small hot set caches well; a long tail goes to R2 |
| What must be exact: likes, view counts, usernames? | Exact or unique data needs a Durable Object or D1, not KV |
| How fresh must config and listings be? | KV can lag by up to about 60 s |
| Do users need image resizing? | Heavy CPU work may not fit Worker limits; push to a queue or a dedicated service |
| Data residency? | Decides where objects and Durable Objects may be placed |

## 3. Requirements

**Functional**: upload a photo; view a photo by URL; per-user gallery; view counts and likes; simple config (feature flags, banned words).

**Non-functional**: reads fast worldwide; uploads up to tens of MB; view counts exact; config changes visible within a minute; no servers to operate; a predictable bill.

**Assumptions for the estimate** (in the program): 100M requests a month, which is about 38.6 requests per second on average and about 193 at a 5x peak; 2 ms of CPU per request; 1M uploads a month at about 500 KB, so 500 GB stored after the first month; 15M reads reaching R2; responses averaging 150 KB.

## 4. The Building Blocks and Where Each Piece of Data Lives

| Data | Store | Why |
| :--- | :--- | :--- |
| Image bytes | **R2** | Object storage, S3-compatible, no egress fees |
| Hot image responses | **Cache API** in each location | Fast, free reads; not replicated between locations |
| Config, flags, banned-word list | **Workers KV** | Read everywhere, written rarely; up to 60 s to propagate |
| View counts, likes, rate limits, upload sessions | **Durable Objects** | One instance per key, single-threaded, strongly consistent storage |
| Users, photos, galleries (queryable) | **D1** | Managed SQL with SQLite semantics, accessible from Workers |
| Thumbnails, notifications | a queue and a consumer Worker | Keeps slow work off the request path |

📌 **Interview term: R2** — Cloudflare object storage. It can be used from a Worker through a binding or through an S3-compatible API with presigned URLs. Its pricing page lists Standard storage at $0.015 per GB-month, Class A operations (writes, lists) at $4.50 per million, Class B operations (reads) at $0.36 per million, a free tier of 10 GB-month, 1 million Class A and 10 million Class B per month, and no charge for egress bandwidth.

📌 **Interview term: Cache API** — a cache a Worker can read and write explicitly (\`caches.default.match\`, \`cache.put\`). Cloudflare documents that its contents do not replicate outside the data centre where they were written, and entries can be evicted.

📌 **Interview term: Workers KV** — a global key-value store optimised for reads. The Cloudflare storage overview describes it as eventually consistent: updates can take up to 60 seconds to be visible everywhere.

📌 **Interview term: Durable Object** — a named object with its own storage that exists in exactly one place at a time. Every request for the same name, from anywhere, reaches the same instance, which handles requests one at a time. Cloudflare documents that it is created near where it is first requested. That makes it the edge answer to "I need one owner for this piece of state".

📌 **Interview term: D1** — Cloudflare managed SQL database with SQLite semantics, reachable from Workers, documented with read replication and time-travel backups.

📌 **Interview term: binding** — the configured handle a Worker gets to a storage service (\`env.PHOTOS\` for an R2 bucket, \`env.COUNTER\` for a Durable Object namespace). No credentials in code, no network setup.

## 5. Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 360" role="img" aria-label="Edge-native photo app: a Worker in each Cloudflare location checks the local Cache API, then reads R2 on a miss; it calls a Durable Object for counts, reads KV for config and D1 for metadata, and sends slow work to a queue">
  <defs>
    <marker id="sd13q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="70" text-anchor="middle">browser</text>
  <rect class="d-box-muted" x="200" y="15" width="300" height="130" rx="12"/>
  <text class="d-sub" x="215" y="38">one Cloudflare location</text>
  <rect class="d-box-accent" x="225" y="55" width="120" height="60" rx="8"/>
  <text class="d-text" x="285" y="90" text-anchor="middle">Worker</text>
  <rect class="d-box" x="370" y="55" width="110" height="60" rx="8"/>
  <text class="d-text" x="425" y="90" text-anchor="middle">Cache API</text>
  <rect class="d-box-accent" x="560" y="40" width="180" height="50" rx="8"/>
  <text class="d-text" x="650" y="70" text-anchor="middle">R2 bucket</text>
  <rect class="d-box" x="20" y="240" width="160" height="60" rx="8"/>
  <text class="d-text" x="100" y="267" text-anchor="middle">Durable Object</text>
  <text class="d-sub" x="100" y="287" text-anchor="middle">counts, limits</text>
  <rect class="d-box" x="220" y="240" width="140" height="60" rx="8"/>
  <text class="d-text" x="290" y="267" text-anchor="middle">Workers KV</text>
  <text class="d-sub" x="290" y="287" text-anchor="middle">config</text>
  <rect class="d-box" x="400" y="240" width="140" height="60" rx="8"/>
  <text class="d-text" x="470" y="267" text-anchor="middle">D1</text>
  <text class="d-sub" x="470" y="287" text-anchor="middle">metadata SQL</text>
  <rect class="d-box" x="580" y="240" width="160" height="60" rx="8"/>
  <text class="d-text" x="660" y="267" text-anchor="middle">queue</text>
  <text class="d-sub" x="660" y="287" text-anchor="middle">thumbnails</text>
  <line class="d-edge" x1="140" y1="70" x2="221" y2="80" marker-end="url(#sd13q3-arrow)"/>
  <line class="d-edge" x1="345" y1="85" x2="366" y2="85" marker-end="url(#sd13q3-arrow)"/>
  <path class="d-edge-accent" d="M480,70 C520,60 530,62 556,64" fill="none" marker-end="url(#sd13q3-arrow)"/>
  <line class="d-edge-dashed" x1="260" y1="115" x2="110" y2="236" marker-end="url(#sd13q3-arrow)"/>
  <line class="d-edge-dashed" x1="285" y1="115" x2="290" y2="236" marker-end="url(#sd13q3-arrow)"/>
  <line class="d-edge-dashed" x1="310" y1="115" x2="460" y2="236" marker-end="url(#sd13q3-arrow)"/>
  <line class="d-edge-dashed" x1="335" y1="115" x2="640" y2="236" marker-end="url(#sd13q3-arrow)"/>
</svg>

The Worker and its Cache API exist in every location; R2, the Durable Objects, KV, D1 and the queue are shared services the Worker reaches through bindings.

**Read path** (\`GET /p/{photoId}\`):

~~~js
export default {
  async fetch(req, env, ctx) {
    const cache = caches.default;
    let res = await cache.match(req);
    if (!res) {
      const obj = await env.PHOTOS.get(photoKey(req));          // R2 read (Class B)
      if (!obj) return new Response("not found", { status: 404 });
      res = new Response(obj.body, { headers: { "cache-control": "public, max-age=86400", etag: obj.httpEtag } });
      ctx.waitUntil(cache.put(req, res.clone()));                 // fill this location only
    }
    ctx.waitUntil(env.COUNTER.get(env.COUNTER.idFromName(photoId(req))).fetch("https://do/hit"));
    return res;
  },
};
~~~

This sketch was not executed (it needs the Workers runtime); the behaviour it relies on is what the example simulates.

**Write path** (\`POST /upload\`): the Worker authenticates the user, checks a per-user rate limit in a Durable Object, then either streams the request body into R2 (\`env.PHOTOS.put(key, req.body)\`) or returns a presigned S3-API URL so the browser uploads straight to R2. Very large files use multipart upload (see [S3 multipart upload](/interview-question/how-does-s3-multipart-upload-make-5tb-uploads-resumable-and-fast) and [presigned browser uploads](/interview-question/resumable-browser-uploads-to-s3-presigned-multipart-with-checksums)). After the object is stored, the Worker writes the metadata row to D1 and enqueues a thumbnail job.

## 6. Deep Dive 1: Caching Is Per Location

The run sends 200,000 requests with Zipf popularity (a few photos very popular, a long tail) to a per-location cache with no eviction:

| Objects | Locations | Hit rate | R2 reads |
| ---: | ---: | ---: | ---: |
| 1,000 | 4 | 98.0% | 4,000 |
| 1,000 | 40 | 85.0% | 30,017 |
| 100,000 | 4 | 70.0% | 60,003 |
| 100,000 | 40 | 51.0% | 97,930 |

Two lessons. First, every location misses each object once before it can hit: 1,000 objects in 4 locations cost exactly 4,000 misses. Going from 4 to 40 locations dropped the hit rate from 98.0% to 85.0% with the same traffic. Second, a long tail does not cache: with 100,000 photos and 40 locations, half the requests went to R2.

What helps: long \`max-age\` with immutable, content-addressed URLs (a new upload gets a new key, so nothing needs purging), an upper caching tier so locations ask a regional cache before R2, and pre-generated thumbnails so the cached objects are small. Hit-rate tuning has its own page: [edge caching on Cloudflare](/interview-question/edge-caching-on-cloudflare-how-do-you-get-95-hit-rate-without-stale-data). With R2, a miss costs a Class B read and some latency, not egress, which is why misses are survivable here.

## 7. Deep Dive 2: Shared State Needs One Owner

The tempting way to count views is KV: read the count, add one, write it back. The run has 4 locations sharing 1,000 views over 120 s, where a KV read at each location is 0, 2, 5 or 10 s old (well inside KV's documented 60 s):

| Counter | Final value after 1,000 views |
| :--- | ---: |
| KV read-modify-write | 12 (988 updates lost) |
| Durable Object | 1,000 |

Read-modify-write on a stale value with last-write-wins does not lose a few updates; it collapses, because a location reading an old value writes a lower count over a higher one. A Durable Object per photo has one instance, handling one request at a time, so \`count += 1\` is exact.

The general rule for edge apps:

- **Read-mostly, can be a minute stale** (config, flags, allow lists): KV.
- **Must be exact, unique or ordered** (counters, likes, rate limits, usernames, inventory): one Durable Object per key, or a D1 transaction.
- **Hot single key** (a viral photo): one Durable Object is one thread in one place; shard the counter into N objects (\`photoId#0..7\`) and sum them on read, or count locally per location and flush deltas.

## 8. Deep Dive 3: Fitting the Platform Limits

- **CPU and memory**: 128 MB per isolate and per-request CPU limits. Resizing a 20 MB photo in a Worker is risky; generate thumbnails in a queue consumer or a dedicated image service, and keep Workers for routing, auth and streaming.
- **Stream, do not buffer**: pass \`obj.body\` and \`req.body\` through as streams; reading a large object into memory can exceed the limit.
- **Subrequests**: the limits page lists 50 subrequests per request on Free and 10,000 on Paid; a gallery page that fetches 200 objects one by one should instead read one listing from D1.
- **Latency to a single owner**: a Durable Object lives in one place, near its first request. A user in Sydney liking a photo whose object lives in Frankfurt pays that round trip; keep it off the critical path (\`ctx.waitUntil\`) where you can.

## 9. The Monthly Bill

From the run, with the Workers Standard pricing (the docs worked example: $5 monthly minimum, 10M requests and 30M CPU-milliseconds included, $0.30 per extra million requests, $0.02 per extra million CPU-milliseconds) and the R2 prices above:

| Line | Cost |
| :--- | ---: |
| Workers: base + 90M extra requests + 170M extra CPU ms | $35.40 |
| R2 storage, 490 GB above the free 10 GB | $7.35 |
| R2 Class A, 1M uploads (inside the free tier) | $0.00 |
| R2 Class B, 5M reads above the free 10M | $1.80 |
| Egress, 15.0 TB served | $0.00 |
| **Total** | **$44.55 per month** |

The striking line is the last data row: 15.0 TB of image bandwidth with no egress fee. On a platform that bills egress, bandwidth would usually be the largest line for a photo app; check your provider's current egress price before comparing. D1, KV and Durable Object usage add to this and are not in the model.

## 10. What Breaks First at 10x

| Growth | What breaks | Fix |
| :--- | :--- | :--- |
| 10x photos (long tail) | hit rate falls, R2 Class B grows | upper cache tier, smaller thumbnails, longer TTLs |
| A viral photo | one Durable Object counter is one thread | shard the counter, or aggregate per location and flush |
| 10x writes to D1 | one database is the write bottleneck | split by user (a database or Durable Object per tenant) |
| Heavy image work | CPU and memory limits | move to a queue consumer or a dedicated service |

## 11. Verified: Running the Code

The program is an in-process simulation: a Set per location stands for the Cache API, a list of timestamped writes with a per-location read lag stands for KV, a plain counter stands for a Durable Object, and the bill uses the published prices. It does not run the Workers runtime, R2 or the network; latency and eviction are not modelled.

The key part, the KV read-modify-write:

~~~js
const visible = (t, lag) => { let v = 0; for (const [wt, wv] of writes) { if (wt <= t - lag) v = wv; else break; } return v; };
writes.push([t, visible(t, lags[pop]) + 1]); // KV: get, add one, put (last write wins)
doCount++;                                   // Durable Object: one instance applies requests one at a time
~~~

Full output (identical in Node and Python):

~~~text
== 1. Cache API in front of R2 (200000 requests, Zipf popularity, no eviction) ==
  objects  PoPs  hit rate  R2 reads (Class B)
     1000     4     98.0%       4000
     1000    40     85.0%      30017
   100000     4     70.0%      60003
   100000    40     51.0%      97930
== 2. view counter after 1000 views from 4 PoPs ==
  KV read-modify-write: 12  (lost 988 updates)
  Durable Object:       1000
== 3. monthly bill: 100M requests, 2 ms CPU each, 500 GB stored, 1M uploads, 15M R2 reads ==
  Workers (base + requests + CPU): $35.40
  R2 storage $7.35  Class A $0.00  Class B $1.80
  egress: 15.0 TB served, R2 egress fee $0.00
  total: $44.55 per month
~~~

## 12. Edge Cases Worth Knowing

- **Read-your-own-write after upload**: the uploader expects to see the photo at once. Serve the first view from R2 (or redirect with a cache-busting key); never rely on KV for the existence of a new upload.
- **Deletes and takedowns**: content-addressed URLs never go stale, but a takedown must purge the cache in every location; keep a deny list checked before the cache.
- **Cache poisoning by query strings**: normalise the cache key (strip unknown query parameters) or attackers can bypass the cache.
- **Durable Object placement**: an object created by a first request from one continent stays near there; for per-user state, that is usually where the user is.
- **Vendor lock-in**: R2 speaks the S3 API, which keeps object storage portable; Durable Objects and KV have no direct equivalent elsewhere, so keep that logic behind a small interface.

## Common Pitfalls

- **Counting with KV.** The run lost 988 of 1,000 views with read lags of at most 10 s.
- **Expecting a global cache.** The Cache API is per location; 40 locations dropped the hit rate from 98.0% to 85.0% for the same 1,000 photos.
- **Buffering whole images in the Worker.** Stream bodies; memory per isolate is 128 MB.
- **One Durable Object for everything.** It is single-threaded; use one per key and shard hot keys.
- **Doing heavy CPU work at the edge.** Move resizing and encoding to a queue consumer.
- **Quoting prices from memory.** The bill depends on current published prices; recheck them.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The model:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">Worker</strong> runs in every Cloudflare location, per request, stateless, with limits like 128 MB of memory per isolate and per-request CPU time. So the design is mostly about where each kind of state lives and what consistency it gets.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Data placement:</strong> <span style="color:#f0e2c8;">Image bytes in <strong style="color:#ffca28;">R2</strong> (S3-compatible, no egress fees), hot responses in the <strong style="color:#ffca28;">Cache API</strong> of each location, config in <strong style="color:#ffca28;">KV</strong> (eventually consistent, up to about 60 s), exact counters, likes and rate limits in <strong style="color:#ffca28;">Durable Objects</strong> (one owner per key), and queryable metadata in <strong style="color:#ffca28;">D1</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Read and write paths:</strong> <span style="color:#f0e2c8;">Reads check the local cache, then R2, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache.put</code> in that location. Uploads are streamed or presigned straight to R2, then metadata goes to D1 and a thumbnail job to a queue, keeping the request path short.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The numbers:</strong> <span style="color:#f0e2c8;">Caches are per location: 1,000 hot photos went from 98.0% to 85.0% hit rate when spread over 40 locations instead of 4. And KV is wrong for counters: read-modify-write with stale reads kept 12 of 1,000 views, a Durable Object kept all 1,000.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost and growth:</strong> <span style="color:#f0e2c8;">At 100M requests, 500 GB and 15 TB served, the published prices give about $44.55 a month, with $0 egress. At 10x, the long tail and hot Durable Objects break first, so I would add an upper cache tier, shard hot counters, and split D1 by tenant.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not keep everything in KV?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">KV is built for reads that may be a minute stale. Anything read-modify-write, unique or ordered loses updates or allows duplicates under concurrency. Use KV for config and large read-mostly data, Durable Objects or D1 for anything that must be exact.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a photo that suddenly gets a million views a minute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The bytes are fine: they are cached in every location after one miss each. The counter is the problem, since one Durable Object is one thread. Shard it across N objects and sum on read, or count in memory per location and flush deltas every few seconds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do uploads of 500 MB videos work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not through the Worker in one piece. Use R2 multipart upload through the S3 API with presigned part URLs so the browser uploads parts in parallel and can resume, and have the Worker only authorise and complete the upload.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you need strong consistency across regions for, say, usernames?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Route every claim for a username to one owner: a Durable Object named after the username, or a unique index in D1. Both serialise conflicting writes in one place, at the cost of a round trip to that place.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is edge-native the wrong choice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Long CPU-heavy work, large in-memory working sets, heavy relational workloads with many cross-table transactions, or tight dependence on services in one cloud region. Then a regional backend with the edge as a cache and router is simpler.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Edge computing | Running code in many locations close to users |
| Cloudflare Worker | Per-request function in an isolate, stateless, with CPU and memory limits |
| R2 | Cloudflare object storage, S3-compatible, no egress fees |
| Cache API | Explicit cache per data centre, not replicated |
| Workers KV | Global read-optimised key-value store, eventually consistent |
| Durable Object | Named single-owner object with strongly consistent storage |
| D1 | Managed SQL database with SQLite semantics |
| Binding | Configured handle from a Worker to a storage service |

**Conclusion:** An edge-native app on Workers and R2 is stateless code everywhere plus a careful choice of store for each kind of data: bytes in R2, hot responses in the per-location Cache API, read-mostly config in KV, anything exact in a Durable Object, relational metadata in D1, slow work on a queue. The simulation shows the two rules that matter most: caching is per location (hit rate falls as locations and the long tail grow), and shared counters need one owner (KV kept 12 of 1,000 views, a Durable Object all 1,000). At the assumed traffic the published prices give about $44.55 a month with no egress fee. Know the limits, stream instead of buffering, and shard hot keys before they melt.`,
    examples: [
      {
        label: `Workers + R2 photo app: per-PoP Cache API hit rates, a KV counter vs a Durable Object, and the monthly bill`,
        variants: [
          { tech: "node", code: `// Edge-native photo app on Workers + R2, simulated in one process:
// per-location Cache API in front of R2, a view counter in KV vs a Durable Object, and the monthly bill.

let seed = 12345; // 32-bit LCG so every language draws the same numbers
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

// ---- 1. Cache API is per location: each PoP misses each object once before it can hit ----
function zipfTable(n) { const c = []; let s = 0; for (let k = 1; k <= n; k++) { s += 1 / k; c.push(s); } return c; }
function pick(cum) {
  const x = rand() * cum[cum.length - 1];
  let lo = 0, hi = cum.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < x) lo = mid + 1; else hi = mid; }
  return lo;
}
console.log("== 1. Cache API in front of R2 (200000 requests, Zipf popularity, no eviction) ==");
console.log("  objects  PoPs  hit rate  R2 reads (Class B)");
for (const [objects, popsN] of [[1000, 4], [1000, 40], [100000, 4], [100000, 40]]) {
  seed = 12345;
  const cum = zipfTable(objects);
  const cached = new Set();
  let misses = 0;
  const requests = 200000;
  for (let i = 0; i < requests; i++) {
    const pop = Math.floor(rand() * popsN), obj = pick(cum);
    const key = pop + "/" + obj;
    if (!cached.has(key)) { misses++; cached.add(key); } // miss: Worker reads R2, then cache.put()
  }
  console.log(\`  \${String(objects).padStart(7)}  \${String(popsN).padStart(4)}  \${((1 - misses / requests) * 100).toFixed(1).padStart(7)}%  \${String(misses).padStart(9)}\`);
}

// ---- 2. A global view counter: KV read-modify-write vs one Durable Object ----
// 4 PoPs share 1000 increments over 120 s. A KV read at a PoP is "lag" seconds old (assumed 0, 2, 5, 10 s; KV allows up to 60 s).
const lags = [0, 2, 5, 10];
const writes = []; // [time, value], appended in time order
const visible = (t, lag) => { let v = 0; for (const [wt, wv] of writes) { if (wt <= t - lag) v = wv; else break; } return v; };
let doCount = 0;
for (let i = 0; i < 1000; i++) {
  const t = i * 0.12, pop = i % 4;
  writes.push([t, visible(t, lags[pop]) + 1]); // KV: get, add one, put (last write wins)
  doCount++;                                   // Durable Object: one instance applies requests one at a time
}
console.log("== 2. view counter after 1000 views from 4 PoPs ==");
console.log(\`  KV read-modify-write: \${writes[writes.length - 1][1]}  (lost \${1000 - writes[writes.length - 1][1]} updates)\`);
console.log(\`  Durable Object:       \${doCount}\`);

// ---- 3. Monthly bill (prices from the Cloudflare Workers and R2 pricing pages) ----
const req = 100e6, cpuMsPerReq = 2, storageGB = 500, uploads = 1e6, r2Reads = 15e6, avgKB = 150;
const workers = 5 + Math.max(0, req - 10e6) / 1e6 * 0.30 + Math.max(0, req * cpuMsPerReq - 30e6) / 1e6 * 0.02;
const r2Storage = Math.max(0, storageGB - 10) * 0.015;
const r2A = Math.max(0, uploads - 1e6) / 1e6 * 4.50;
const r2B = Math.max(0, r2Reads - 10e6) / 1e6 * 0.36;
const egressTB = req * avgKB / 1e9;
console.log("== 3. monthly bill: 100M requests, 2 ms CPU each, 500 GB stored, 1M uploads, 15M R2 reads ==");
console.log(\`  Workers (base + requests + CPU): $\${workers.toFixed(2)}\`);
console.log(\`  R2 storage $\${r2Storage.toFixed(2)}  Class A $\${r2A.toFixed(2)}  Class B $\${r2B.toFixed(2)}\`);
console.log(\`  egress: \${egressTB.toFixed(1)} TB served, R2 egress fee $0.00\`);
console.log(\`  total: $\${(workers + r2Storage + r2A + r2B).toFixed(2)} per month\`);` },
          { tech: "python", code: `# Edge-native photo app on Workers + R2, simulated in one process:
# per-location Cache API in front of R2, a view counter in KV vs a Durable Object, and the monthly bill.

seed = 12345  # 32-bit LCG so every language draws the same numbers


def rand():
    global seed
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296


# ---- 1. Cache API is per location: each PoP misses each object once before it can hit ----
def zipf_table(n):
    c, s = [], 0.0
    for k in range(1, n + 1):
        s += 1 / k
        c.append(s)
    return c


def pick(cum):
    x = rand() * cum[-1]
    lo, hi = 0, len(cum) - 1
    while lo < hi:
        mid = (lo + hi) >> 1
        if cum[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo


print("== 1. Cache API in front of R2 (200000 requests, Zipf popularity, no eviction) ==")
print("  objects  PoPs  hit rate  R2 reads (Class B)")
for objects, pops_n in [(1000, 4), (1000, 40), (100000, 4), (100000, 40)]:
    seed = 12345
    cum = zipf_table(objects)
    cached, misses, requests = set(), 0, 200000
    for _ in range(requests):
        pop = int(rand() * pops_n)
        obj = pick(cum)
        key = (pop, obj)
        if key not in cached:  # miss: Worker reads R2, then cache.put()
            misses += 1
            cached.add(key)
    print(f"  {objects:>7}  {pops_n:>4}  {(1 - misses / requests) * 100:>7.1f}%  {misses:>9}")

# ---- 2. A global view counter: KV read-modify-write vs one Durable Object ----
# 4 PoPs share 1000 increments over 120 s. A KV read at a PoP is "lag" seconds old (assumed 0, 2, 5, 10 s; KV allows up to 60 s).
lags = [0, 2, 5, 10]
writes = []  # (time, value), appended in time order


def visible(t, lag):
    v = 0
    for wt, wv in writes:
        if wt <= t - lag:
            v = wv
        else:
            break
    return v


do_count = 0
for i in range(1000):
    t, pop = i * 0.12, i % 4
    writes.append((t, visible(t, lags[pop]) + 1))  # KV: get, add one, put (last write wins)
    do_count += 1                                  # Durable Object: one instance applies requests one at a time
final = writes[-1][1]
print("== 2. view counter after 1000 views from 4 PoPs ==")
print(f"  KV read-modify-write: {final}  (lost {1000 - final} updates)")
print(f"  Durable Object:       {do_count}")

# ---- 3. Monthly bill (prices from the Cloudflare Workers and R2 pricing pages) ----
req, cpu_ms_per_req, storage_gb, uploads, r2_reads, avg_kb = 100e6, 2, 500, 1e6, 15e6, 150
workers = 5 + max(0, req - 10e6) / 1e6 * 0.30 + max(0, req * cpu_ms_per_req - 30e6) / 1e6 * 0.02
r2_storage = max(0, storage_gb - 10) * 0.015
r2_a = max(0, uploads - 1e6) / 1e6 * 4.50
r2_b = max(0, r2_reads - 10e6) / 1e6 * 0.36
egress_tb = req * avg_kb / 1e9
print("== 3. monthly bill: 100M requests, 2 ms CPU each, 500 GB stored, 1M uploads, 15M R2 reads ==")
print(f"  Workers (base + requests + CPU): \${workers:.2f}")
print(f"  R2 storage \${r2_storage:.2f}  Class A \${r2_a:.2f}  Class B \${r2_b:.2f}")
print(f"  egress: {egress_tb:.1f} TB served, R2 egress fee $0.00")
print(f"  total: \${workers + r2_storage + r2_a + r2_b:.2f} per month")` },
        ],
      },
    ],
  },
  {
    title: `What are the trade-offs of microservices vs a monolith?`,
    difficulty: "medium",
    seoDescription: `Microservices vs monolith in numbers: network hops and tail latency, availability chains, transactions vs sagas, scaling, team size and case studies.`,
    description: `**Question presented to candidate:**
"We are a growing company with one big application. Some engineers want to split it into microservices. What are the real trade-offs, and how would you decide?"

**What a strong answer should cover:**
- Clear definitions: a **monolith** is one deployable unit (ideally a **modular monolith** with enforced boundaries); **microservices** are independently deployable services, each owning its data, talking over the network
- What the network costs: latency per hop, **tail latency amplification** with fan-out, availability that multiplies across synchronous dependencies, partial failure, versioned APIs
- Data: one ACID transaction in a monolith versus **sagas** with compensations and visible intermediate states across services; no cross-service joins
- What microservices buy: independent deploys and scaling, fault and team isolation, technology choice per service; the price in operations (observability, CI/CD per service, service discovery, on-call)
- A decision rule driven by team size and real pain points, migration with the **strangler fig** pattern, and real case studies in both directions (Segment, Prime Video)

**Clarifying questions expected:**
- How many engineers and teams, and where is the pain today: deploy conflicts, scaling, reliability, or slow builds?
- Do parts of the system have very different load, latency or compliance needs?

**Code / implementation expected:** Optional — the example quantifies hop latency, fan-out tails, availability chains, rollback versus saga, scaling memory and team communication paths.`,
    answer: `**Target Audience:** Beginners to architecture — you have built a web application; every term is defined the first time it is used.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Hop latencies, availabilities and memory sizes are stated assumptions. The case studies are cited to their published coverage (InfoQ, July 2018, on Segment; DevClass, May 2023, on Prime Video), checked October 2026.

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts with the exact words an interviewer expects. Numbers come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A small restaurant has one kitchen. The chef shouts "two burgers!", the grill cook hears it, the fries cook hears it, and the plates come together. It is fast and simple. When the restaurant becomes a food hall with 50 cooks, one kitchen is chaos: everybody is in everybody's way, and a fire at the grill closes the whole place.

So the food hall splits into stalls: burgers, noodles, drinks, each with its own staff, fridge and opening hours. Now one stall can close without the others, and each can hire as it grows. But a combo meal now needs a runner between stalls, orders get lost between them, and if the drinks stall is out of cups the burger stall has already cooked a burger nobody can pay for.

A monolith is the one kitchen; microservices are the stalls. Neither is better. The question is when the coordination cost of one kitchen becomes bigger than the runners, lost orders and duplicated fridges of the stalls.

## 2. Definitions

📌 **Interview term: monolith** — an application built and deployed as one unit: one codebase, one process type (often many copies behind a load balancer), usually one database. Calls between parts are function calls.

📌 **Interview term: modular monolith** — a monolith split internally into modules with enforced boundaries (each module owns its tables and exposes an interface; others may not reach in). It keeps the simplicity of one deploy while preparing clean seams.

📌 **Interview term: microservices** — an architecture of small services, each independently deployable, owning its own data, and communicating over the network (HTTP, gRPC, or messages). A team owns each service end to end.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 230" role="img" aria-label="Modular monolith: one deployable process with orders, users and payments modules over one database">
  <rect class="d-box-accent" x="40" y="20" width="540" height="120" rx="12"/>
  <text class="d-text" x="310" y="45" text-anchor="middle">one deployable process</text>
  <rect class="d-box" x="70" y="65" width="140" height="50" rx="8"/>
  <text class="d-text" x="140" y="95" text-anchor="middle">orders</text>
  <rect class="d-box" x="240" y="65" width="140" height="50" rx="8"/>
  <text class="d-text" x="310" y="95" text-anchor="middle">users</text>
  <rect class="d-box" x="410" y="65" width="140" height="50" rx="8"/>
  <text class="d-text" x="480" y="95" text-anchor="middle">payments</text>
  <rect class="d-box-muted" x="210" y="170" width="200" height="45" rx="8"/>
  <text class="d-text" x="310" y="198" text-anchor="middle">one database</text>
  <line class="d-edge" x1="310" y1="140" x2="310" y2="170"/>
</svg>

Modules call each other in-process and share one database, so a transaction can span all of them.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 260" role="img" aria-label="Microservices: an API gateway routes to orders, users and payments services, each with its own database">
  <defs>
    <marker id="sd13q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="230" y="15" width="160" height="45" rx="8"/>
  <text class="d-text" x="310" y="43" text-anchor="middle">API gateway</text>
  <rect class="d-box" x="40" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="115" y="140" text-anchor="middle">orders svc</text>
  <rect class="d-box" x="235" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="310" y="140" text-anchor="middle">users svc</text>
  <rect class="d-box" x="430" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="505" y="140" text-anchor="middle">payments svc</text>
  <rect class="d-box-muted" x="60" y="200" width="110" height="40" rx="8"/>
  <text class="d-sub" x="115" y="225" text-anchor="middle">orders DB</text>
  <rect class="d-box-muted" x="255" y="200" width="110" height="40" rx="8"/>
  <text class="d-sub" x="310" y="225" text-anchor="middle">users DB</text>
  <rect class="d-box-muted" x="450" y="200" width="110" height="40" rx="8"/>
  <text class="d-sub" x="505" y="225" text-anchor="middle">payments DB</text>
  <line class="d-edge" x1="270" y1="60" x2="130" y2="106" marker-end="url(#sd13q4-arrow)"/>
  <line class="d-edge" x1="310" y1="60" x2="310" y2="106" marker-end="url(#sd13q4-arrow)"/>
  <line class="d-edge" x1="350" y1="60" x2="490" y2="106" marker-end="url(#sd13q4-arrow)"/>
  <line class="d-edge-dashed" x1="190" y1="135" x2="231" y2="135" marker-end="url(#sd13q4-arrow)"/>
  <line class="d-edge" x1="115" y1="160" x2="115" y2="200"/>
  <line class="d-edge" x1="310" y1="160" x2="310" y2="200"/>
  <line class="d-edge" x1="505" y1="160" x2="505" y2="200"/>
</svg>

Each service owns its database; the dashed arrow is a network call (orders asking users), which can be slow or fail. The [API gateway](/interview-question/what-is-an-api-gateway) is the single entry point.

## 3. The Trade-offs at a Glance

| Dimension | Monolith | Microservices |
| :--- | :--- | :--- |
| Calls between parts | function call, microseconds | network call, milliseconds, can fail |
| Transactions | one ACID transaction | sagas, eventual consistency |
| Deploy | one unit; one bad change blocks everyone | per service; independent release cadence |
| Scaling | scale the whole app | scale each service to its own load |
| Fault isolation | a memory leak takes down everything | a failing service can be contained (with timeouts, breakers) |
| Team autonomy | shared codebase, merge and release coordination | team owns its service, API is the contract |
| Technology | one stack | per service (and the cost of many stacks) |
| Debugging | one stack trace, one log | distributed tracing, correlation IDs |
| Operations | one pipeline, one on-call | N pipelines, service discovery, mesh, dashboards per service |
| Refactoring across boundaries | IDE rename | coordinated API versioning |

## 4. What a Network Hop Costs

The run assumes a network call takes 2 ms, except 1% of the time it takes 50 ms (a garbage-collection pause, a retry, a slow neighbour), and an in-process call takes 0.001 ms. Over 100,000 simulated requests needing 5 components:

| Shape | p50 | p99 |
| :--- | ---: | ---: |
| Monolith, 5 in-process calls | 0.005 ms | 0.005 ms |
| 5 services called one after another | 10 ms | 58 ms |
| 5 services called in parallel | 2 ms | 50 ms |

📌 **Interview term: tail latency amplification** — when a request waits for many calls, it is as slow as the slowest one, so rare slow calls become common slow requests. The probability that at least one of \`n\` calls is slow is \`1 - (1 - p)^n\`.

| Parallel fan-out | Slow requests (simulated) | Formula |
| ---: | ---: | ---: |
| 5 calls | 4.92% | 4.90% |
| 50 calls | 39.66% | 39.50% |

A 1% problem per call becomes a 39.66% problem for a page that fans out to 50 services. This is why microservice systems need timeouts, hedged requests, caching and fewer synchronous calls; and why "just split it up" can make a fast monolith slow.

📌 **Interview term: partial failure** — some calls succeed and others fail or time out inside one request. In a monolith a call either happens or the process is dead; over a network you must handle "maybe it happened" (retries need [idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter)).

## 5. Availability Multiplies

Every synchronous dependency multiplies into the request availability. With each service at 99.9%:

| Hard dependencies in the chain | Availability | Downtime per year |
| ---: | ---: | ---: |
| 1 | 99.90% | 526 min |
| 5 | 99.50% | 2,623 min |
| 10 | 99.00% | 5,232 min |

Ten synchronous hops at three nines each give two nines. Fixes are architectural: make dependencies asynchronous (events over a [message queue](/interview-question/what-is-a-message-queue-and-why-use-one)), cache answers, degrade gracefully, and use the [circuit breaker](/interview-question/what-is-the-circuit-breaker-pattern). The arithmetic is worked in depth on [designing for high availability](/interview-question/how-do-you-design-for-high-availability).

## 6. Data and Transactions

Placing an order touches inventory, orders and payment. The run declines the payment in both architectures:

**Monolith**: \`BEGIN\`, stock -1 and order +1 (not yet visible), payment declined, \`ROLLBACK\`. Other users only ever saw stock = 10. One ACID transaction made the failure invisible.

**Microservices (saga)**: inventory reserves (committed), orders creates a PENDING order (committed), payment declines, then compensations cancel the order and release the stock. The final state is the same (stock = 10, no order), but for a while other users could see stock = 9.

📌 **Interview term: database per service** — each service owns its tables and nobody else reads them directly; others go through its API or events. It is what makes services independently deployable, and what removes cross-service joins and transactions.

📌 **Interview term: saga** — a sequence of local transactions in different services, each with a compensating action that undoes it if a later step fails. See [the saga pattern](/interview-question/what-is-the-saga-pattern-for-distributed-transactions); the alternative, [two-phase commit](/interview-question/what-is-two-phase-commit-and-its-drawbacks), blocks on failures and is rarely used between services. Publishing events reliably from each step needs the [outbox pattern](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure).

Reporting changes too: a query joining orders, users and payments becomes a data pipeline or a read model built from events (see [event sourcing and CQRS](/interview-question/what-are-event-sourcing-and-cqrs)).

## 7. Scaling and Deploying Independently

Suppose image resizing needs 10 replicas at peak while everything else needs 2. A monolith replica includes everything (assumed 4 GB); split services are sized separately (image service 1 GB, the rest 3 GB):

| | Memory to run 10 copies of the hot path |
| :--- | ---: |
| Monolith: 10 replicas x 4 GB | 40 GB |
| Services: 10 x 1 GB image + 2 x 3 GB rest | 16 GB |

That is the honest win of splitting: a component with a very different resource profile (CPU-bound image work, a GPU model, a memory-hungry search index) scales on its own. Note that a monolith can often get most of this by running the same code in two deployment roles (web nodes and worker nodes) without a network API between them.

Independent deploys are the other win: a team ships its service without a release train. They only hold if APIs are versioned and backwards compatible; otherwise you have built a **distributed monolith**.

📌 **Interview term: distributed monolith** — services that must be deployed together because they share a database, a library with business logic, or tightly coupled APIs. It has the costs of microservices and the coupling of a monolith: the worst of both.

## 8. People: Why Team Size Decides

The number of pairs who might need to coordinate grows as \`n(n-1)/2\`. For 48 engineers:

| Organisation | Communication paths |
| :--- | ---: |
| One shared codebase, everyone coordinates | 1,128 |
| 6 teams of 8, each owning services | 168 inside teams + 15 team-to-team interfaces = 183 |

📌 **Interview term: Conway's law** — systems end up shaped like the communication structure of the organisation that builds them. Microservices are mostly an organisational tool: they let teams work behind APIs instead of coordinating every change. With 8 engineers there are only 28 paths, and the overhead of services (pipelines, on-call per service, tracing) is pure cost.

## 9. Case Studies in Both Directions

- **Segment** described moving its event-delivery destinations from a monolith to many microservices and then back to a single service, because the operational overhead of hundreds of services became too much; after consolidating, they reported faster improvement of shared libraries and easier scaling (InfoQ coverage of Alexandra Noonan's article, July 2018).
- **Prime Video**: the audio and video monitoring team reported cutting infrastructure cost by more than 90% by moving one service from distributed components (AWS Step Functions plus S3 for intermediate frames) into a single process (DevClass, May 2023). Commentators noted it was one service, not Prime Video as a whole; the lesson is that fine-grained distribution has a cost per hop and per transition.
- The common pattern in the other direction (large organisations splitting monoliths to let hundreds of teams ship independently) is widely reported; the driver is nearly always team scale, not request scale.

## 10. How to Decide

1. **Start with a modular monolith** unless you already have many teams. Enforce module boundaries (each module owns its tables) so a later split is a mechanical extraction.
2. **Split for a concrete reason**: a team blocked by others' releases, a component with a very different scaling or reliability profile, a security or compliance boundary, or a different technology need.
3. **Extract incrementally** with the strangler fig pattern.
4. **Pay the platform cost first**: CI/CD per service, centralised logs and [distributed tracing](/interview-question/how-would-you-design-opentelemetry-tracing-for-200-microservices), service discovery, standard timeouts and retries.

📌 **Interview term: strangler fig pattern** — migrating by putting a router in front of the monolith and moving one capability at a time to a new service, routing its traffic there, until the old code can be deleted. No big-bang rewrite.

## 11. Verified: Running the Code

The program is a deterministic simulation: a seeded random generator draws hop latencies, availabilities are multiplied, the saga and the transaction are modelled with plain variables, and the memory and team sizes are arithmetic on assumptions. It does not run real services or a network.

The key part, the tail-latency fan-out:

~~~js
const hop = () => (rand() < 0.01 ? 50 : 2);
let m = 0; for (let k = 0; k < 5; k++) m = Math.max(m, hop()); fanout5.push(m); if (m === 50) slow5++;
~~~

Full output (identical in Node and Python):

~~~text
== 1. latency (ms), 100000 simulated requests ==
  monolith, 5 in-process calls:       p50=0.005  p99=0.005
  5 services called one after another: p50=10  p99=58  p99.9=58
  5 services called in parallel:       p50=2  p99=50  slow requests=4.92% (formula 4.90%)
  50 services called in parallel:      p50=2  p99=50  slow requests=39.66% (formula 39.50%)
== 2. availability, each service 99.9% ==
   1 in the chain: 99.90%  downtime 526 min/year
   5 in the chain: 99.50%  downtime 2623 min/year
  10 in the chain: 99.00%  downtime 5232 min/year
== 3. payment declined ==
  monolith:
    BEGIN
    stock -1, order +1 (not yet visible)
    payment: declined -> ROLLBACK
    others ever saw stock=10
    final stock=10 orders=0
  saga:
    inventory: reserved (committed)
    orders: created PENDING (committed)
    payment: declined
    orders: compensate -> CANCELLED
    inventory: compensate -> released
    others could see stock=9 in between
    final stock=10 orders=0
== 4. memory to run 10 copies of the hot path ==
  monolith: 10 replicas x 4 GB = 40 GB
  services: 10 x 1 GB image service + 2 x 3 GB rest = 16 GB
== 5. 48 engineers ==
  one shared codebase, everyone coordinates: 1128 paths
  6 teams of 8 with owned services: 168 inside teams + 15 team-to-team interfaces = 183
~~~

## 12. Edge Cases Worth Knowing

- **Shared libraries with business logic** recouple services: upgrading the library forces coordinated deploys. Share only infrastructure code.
- **Chatty services**: a page that needs 30 calls is a sign of wrong boundaries; boundaries should follow business capabilities, so most requests touch one or two services.
- **Data duplication is normal**: services keep local copies of the data they need (updated by events), and you must accept that those copies lag.
- **Testing**: end-to-end tests across 40 services are slow and flaky; use contract tests between services instead.
- **Too small services ("nanoservices")**: each one costs a pipeline, an on-call rotation and a network hop; size services to a team, not to a function.

## Common Pitfalls

- **Splitting for performance.** The run shows the opposite: 5 in-process calls took 0.005 ms, 5 network calls 10 ms at p50 and 58 ms at p99.
- **Ignoring fan-out tails.** A 1% slow call became 39.66% slow requests at 50 calls.
- **Synchronous chains.** Ten 99.9% services in series gave 99.00%, 5,232 minutes a year.
- **Expecting transactions.** The saga left stock = 9 visible to others until compensation ran.
- **Shared database across services.** It creates a distributed monolith: no independent deploys and no isolation.
- **Splitting a small team.** With 8 engineers there are 28 paths; the operational overhead dominates.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define both:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">monolith</strong> is one deployable unit with in-process calls and one database; I would usually mean a <strong style="color:#ffca28;">modular monolith</strong> with enforced boundaries. <strong style="color:#ffca28;">Microservices</strong> are independently deployable services that each own their data and talk over the network.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What the network costs:</strong> <span style="color:#f0e2c8;">Every hop adds latency and failure. With 2 ms calls that are 50 ms 1% of the time, 5 sequential calls gave p99 of 58 ms, and fanning out to 50 services made 39.66% of requests slow. Ten 99.9% services in series give 99.00%.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What data costs:</strong> <span style="color:#f0e2c8;">In a monolith, a declined payment is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLBACK</code> and nobody sees anything. Across services it is a <strong style="color:#ffca28;">saga</strong> with compensations, and others briefly saw stock = 9. Cross-service joins become events and read models.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What you buy:</strong> <span style="color:#f0e2c8;">Independent deploys, independent scaling (16 GB instead of 40 GB for a hot component in my example), fault and team isolation. The real driver is people: 48 engineers in one codebase have 1,128 coordination paths, in 6 owning teams about 183.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How I decide:</strong> <span style="color:#f0e2c8;">Start with a modular monolith; split for a concrete reason (team contention, very different scaling or compliance needs), extract with the <strong style="color:#ffca28;">strangler fig</strong> pattern, and build the platform first: per-service CI/CD, tracing, timeouts. Segment and Prime Video show that going back is sometimes right.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a distributed monolith and how do you avoid it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Services that must deploy together because they share a database, business-logic libraries or tightly coupled APIs. Avoid it with a database per service, backwards-compatible versioned APIs, contract tests, and asynchronous events instead of long synchronous chains.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you draw service boundaries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Around business capabilities that change together and own their data (ordering, payments, catalogue), not around technical layers. A good boundary means most requests and most changes touch one service; a page needing 30 calls means the boundaries are wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a query that used to join three tables now in three services?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build a read model: the owning services publish events, and a reporting or query service keeps a denormalised copy it can join locally. Accept that it lags by seconds; for strict reads, call the owner.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you go back from microservices to a monolith?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the services are always changed and deployed together, the team is small relative to the number of services, or the per-hop cost dominates, as in the Prime Video monitoring case where per-transition orchestration and intermediate storage drove the cost. Merge them behind the same API and keep module boundaries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What platform do you need before splitting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Automated CI/CD per service, centralised logs, metrics and distributed tracing with correlation IDs, service discovery and a gateway, standard client libraries with timeouts, retries and circuit breakers, and clear ownership and on-call per service.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Monolith | One deployable unit, in-process calls, usually one database |
| Modular monolith | Monolith with enforced internal module boundaries |
| Microservices | Independently deployable services owning their data, over the network |
| Tail latency amplification | Fan-out makes rare slow calls common slow requests |
| Partial failure | Some calls in one request fail or time out while others succeed |
| Database per service | Each service owns its tables; others use its API or events |
| Saga | Local transactions with compensations across services |
| Distributed monolith | Services that must deploy together; costs of both, benefits of neither |
| Conway's law | Systems mirror the communication structure of their organisation |
| Strangler fig pattern | Incremental migration by routing one capability at a time to new code |

**Conclusion:** Microservices trade in-process calls and ACID transactions for independent deploys, scaling and team ownership. The costs are measurable: network hops (p99 of 58 ms for 5 sequential calls versus microseconds in-process), tail amplification (39.66% slow at a fan-out of 50), multiplied availability (99.00% for ten 99.9% services), and sagas whose intermediate states are visible. The benefits are mostly organisational (1,128 coordination paths versus 183 with owning teams) plus scaling components with very different profiles. Start with a modular monolith, split for a concrete reason with the strangler fig pattern, build the platform first, and be willing to merge services back when the split costs more than it returns.`,
    examples: [
      {
        label: `Monolith vs microservices in numbers: hop latency and fan-out tails, availability chains, transaction vs saga, scaling and team paths`,
        variants: [
          { tech: "node", code: `// Monolith vs microservices in numbers: what a network hop costs, how fan-out amplifies the tail,
// how availability multiplies, a local transaction vs a saga, and scaling one hot component.

let seed = 7; // 32-bit LCG so every language draws the same numbers
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
// One network call: 2 ms usually, 50 ms 1% of the time (GC pause, retry, noisy neighbour). Assumed.
const hop = () => (rand() < 0.01 ? 50 : 2);
const inProcess = 0.001; // an in-process function call, in ms (assumed)
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.ceil((p / 100) * s.length) - 1]; };

// ---- 1. latency of one checkout request that needs 5 components ----
const N = 100000;
const serial = [], fanout5 = [], fanout50 = [];
let slow5 = 0, slow50 = 0;
for (let i = 0; i < N; i++) {
  let s = 0; for (let k = 0; k < 5; k++) s += hop(); serial.push(s);
  let m = 0; for (let k = 0; k < 5; k++) m = Math.max(m, hop()); fanout5.push(m); if (m === 50) slow5++;
  let m2 = 0; for (let k = 0; k < 50; k++) m2 = Math.max(m2, hop()); fanout50.push(m2); if (m2 === 50) slow50++;
}
console.log("== 1. latency (ms), 100000 simulated requests ==");
console.log(\`  monolith, 5 in-process calls:       p50=\${(5 * inProcess).toFixed(3)}  p99=\${(5 * inProcess).toFixed(3)}\`);
console.log(\`  5 services called one after another: p50=\${pct(serial, 50)}  p99=\${pct(serial, 99)}  p99.9=\${pct(serial, 99.9)}\`);
console.log(\`  5 services called in parallel:       p50=\${pct(fanout5, 50)}  p99=\${pct(fanout5, 99)}  slow requests=\${(slow5 / N * 100).toFixed(2)}% (formula \${((1 - 0.99 ** 5) * 100).toFixed(2)}%)\`);
console.log(\`  50 services called in parallel:      p50=\${pct(fanout50, 50)}  p99=\${pct(fanout50, 99)}  slow requests=\${(slow50 / N * 100).toFixed(2)}% (formula \${((1 - 0.99 ** 50) * 100).toFixed(2)}%)\`);

// ---- 2. availability: every synchronous dependency multiplies in ----
const a = 0.999;
console.log("== 2. availability, each service 99.9% ==");
for (const n of [1, 5, 10]) {
  const av = a ** n;
  console.log(\`  \${String(n).padStart(2)} in the chain: \${(av * 100).toFixed(2)}%  downtime \${((1 - av) * 525600).toFixed(0)} min/year\`);
}

// ---- 3. place an order: one local transaction vs a saga across services ----
function placeOrder(style, paymentFails) {
  const log = [];
  let stock = 10, orders = 0;
  if (style === "monolith") {
    const snapshot = { stock, orders }; log.push("BEGIN");
    stock -= 1; orders += 1; log.push("stock -1, order +1 (not yet visible)");
    if (paymentFails) { ({ stock, orders } = snapshot); log.push("payment: declined -> ROLLBACK"); } else log.push("COMMIT");
    log.push(\`others ever saw stock=\${paymentFails ? 10 : 9}\`);
  } else {
    stock -= 1; log.push("inventory: reserved (committed)");
    orders += 1; log.push("orders: created PENDING (committed)");
    const seenByOthers = stock;
    if (paymentFails) {
      log.push("payment: declined");
      orders -= 1; log.push("orders: compensate -> CANCELLED");
      stock += 1; log.push("inventory: compensate -> released");
    } else log.push("payment: charged");
    log.push(\`others could see stock=\${seenByOthers} in between\`);
  }
  log.push(\`final stock=\${stock} orders=\${orders}\`);
  return log;
}
console.log("== 3. payment declined ==");
for (const style of ["monolith", "saga"]) {
  console.log(\`  \${style}:\`);
  for (const line of placeOrder(style, true)) console.log("    " + line);
}

// ---- 4. scaling one hot component (image resizing needs 10 replicas, the rest needs 2) ----
const monolithGB = 4, imageSvcGB = 1, restGB = 3;
console.log("== 4. memory to run 10 copies of the hot path ==");
console.log(\`  monolith: 10 replicas x \${monolithGB} GB = \${10 * monolithGB} GB\`);
console.log(\`  services: 10 x \${imageSvcGB} GB image service + 2 x \${restGB} GB rest = \${10 * imageSvcGB + 2 * restGB} GB\`);

// ---- 5. people: communication paths n(n-1)/2 ----
const paths = (n) => (n * (n - 1)) / 2;
console.log("== 5. 48 engineers ==");
console.log(\`  one shared codebase, everyone coordinates: \${paths(48)} paths\`);
console.log(\`  6 teams of 8 with owned services: \${6 * paths(8)} inside teams + \${paths(6)} team-to-team interfaces = \${6 * paths(8) + paths(6)}\`);` },
          { tech: "python", code: `# Monolith vs microservices in numbers: what a network hop costs, how fan-out amplifies the tail,
# how availability multiplies, a local transaction vs a saga, and scaling one hot component.
import math

seed = 7  # 32-bit LCG so every language draws the same numbers


def rand():
    global seed
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296


# One network call: 2 ms usually, 50 ms 1% of the time (GC pause, retry, noisy neighbour). Assumed.
def hop():
    return 50 if rand() < 0.01 else 2


in_process = 0.001  # an in-process function call, in ms (assumed)


def pct(xs, p):
    s = sorted(xs)
    return s[math.ceil((p / 100) * len(s)) - 1]


# ---- 1. latency of one checkout request that needs 5 components ----
N = 100000
serial, fanout5, fanout50 = [], [], []
slow5 = slow50 = 0
for _ in range(N):
    s = 0
    for _ in range(5):
        s += hop()
    serial.append(s)
    m = 0
    for _ in range(5):
        m = max(m, hop())
    fanout5.append(m)
    slow5 += m == 50
    m2 = 0
    for _ in range(50):
        m2 = max(m2, hop())
    fanout50.append(m2)
    slow50 += m2 == 50
print("== 1. latency (ms), 100000 simulated requests ==")
print(f"  monolith, 5 in-process calls:       p50={5 * in_process:.3f}  p99={5 * in_process:.3f}")
print(f"  5 services called one after another: p50={pct(serial, 50)}  p99={pct(serial, 99)}  p99.9={pct(serial, 99.9)}")
print(f"  5 services called in parallel:       p50={pct(fanout5, 50)}  p99={pct(fanout5, 99)}  slow requests={slow5 / N * 100:.2f}% (formula {(1 - 0.99 ** 5) * 100:.2f}%)")
print(f"  50 services called in parallel:      p50={pct(fanout50, 50)}  p99={pct(fanout50, 99)}  slow requests={slow50 / N * 100:.2f}% (formula {(1 - 0.99 ** 50) * 100:.2f}%)")

# ---- 2. availability: every synchronous dependency multiplies in ----
a = 0.999
print("== 2. availability, each service 99.9% ==")
for n in [1, 5, 10]:
    av = a ** n
    print(f"  {n:>2} in the chain: {av * 100:.2f}%  downtime {(1 - av) * 525600:.0f} min/year")


# ---- 3. place an order: one local transaction vs a saga across services ----
def place_order(style, payment_fails):
    log, stock, orders = [], 10, 0
    if style == "monolith":
        snapshot = (stock, orders)
        log.append("BEGIN")
        stock -= 1
        orders += 1
        log.append("stock -1, order +1 (not yet visible)")
        if payment_fails:
            stock, orders = snapshot
            log.append("payment: declined -> ROLLBACK")
        else:
            log.append("COMMIT")
        log.append(f"others ever saw stock={10 if payment_fails else 9}")
    else:
        stock -= 1
        log.append("inventory: reserved (committed)")
        orders += 1
        log.append("orders: created PENDING (committed)")
        seen_by_others = stock
        if payment_fails:
            log.append("payment: declined")
            orders -= 1
            log.append("orders: compensate -> CANCELLED")
            stock += 1
            log.append("inventory: compensate -> released")
        else:
            log.append("payment: charged")
        log.append(f"others could see stock={seen_by_others} in between")
    log.append(f"final stock={stock} orders={orders}")
    return log


print("== 3. payment declined ==")
for style in ["monolith", "saga"]:
    print(f"  {style}:")
    for line in place_order(style, True):
        print("    " + line)

# ---- 4. scaling one hot component (image resizing needs 10 replicas, the rest needs 2) ----
monolith_gb, image_svc_gb, rest_gb = 4, 1, 3
print("== 4. memory to run 10 copies of the hot path ==")
print(f"  monolith: 10 replicas x {monolith_gb} GB = {10 * monolith_gb} GB")
print(f"  services: 10 x {image_svc_gb} GB image service + 2 x {rest_gb} GB rest = {10 * image_svc_gb + 2 * rest_gb} GB")


# ---- 5. people: communication paths n(n-1)/2 ----
def paths(n):
    return n * (n - 1) // 2


print("== 5. 48 engineers ==")
print(f"  one shared codebase, everyone coordinates: {paths(48)} paths")
print(f"  6 teams of 8 with owned services: {6 * paths(8)} inside teams + {paths(6)} team-to-team interfaces = {6 * paths(8) + paths(6)}")` },
        ],
      },
    ],
  },
  {
    title: `How would you design ad click event aggregation?`,
    difficulty: "hard",
    seoDescription: `Design ad click aggregation: event-time windows, watermarks, late events, dedup, hot ads, top-N per minute and batch reconciliation, with verified numbers.`,
    description: `**Question presented to candidate:**
"Advertisers pay per click, so we need click counts per ad per minute, and the top 100 most-clicked ads in the last minute, for about a billion clicks a day. The numbers feed billing. Design the aggregation system."

**What a strong answer should cover:**
- Capacity: about 11,600 clicks per second on average and several times that at peak, around 200 GB a day of raw events, and the size of the aggregated tables
- A pipeline of an append-only **click log** (partitioned by ad), a **stream aggregator** with **event-time tumbling windows**, an OLAP store for aggregates, and a query service; the raw log kept in cheap storage
- Correctness under real-world disorder: **watermarks**, **allowed lateness** with corrections, a side path for events that are too late, and why processing-time windows put clicks in the wrong minute
- **Deduplication** by click ID and an end-to-end exactly-once effect (idempotent upserts or transactional writes), because billing cannot double count
- **Reconciliation**: a batch job recomputes from the raw log and corrects the streaming numbers; hot ads handled with split keys and two-stage aggregation; top-N computed per partition and merged

**Clarifying questions expected:**
- How fresh must the numbers be, and how exact: is a dashboard estimate acceptable while billing waits for the reconciled number?
- How late can a click arrive (mobile clients offline), and must late clicks still be billed?
- Which filters must queries support (country, device, campaign)?

**Code / implementation expected:** Optional — the example implements event-time windows with a watermark, allowed lateness, dedup, top-3 per minute and a batch reconciliation, in four languages.`,
    answer: `**Target Audience:** Intermediate engineers preparing for system design rounds — you know what a queue and a database are; every streaming term is defined when it first appears.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). Traffic figures are stated assumptions. Apache Flink windowing behaviour (allowed lateness, late-data side outputs) is from the Flink windows documentation, checked October 2026.

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts with the vocabulary interviewers use for stream processing. All counts come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A city counts cars crossing a bridge each minute, to bill a toll per crossing. Cameras at both ends write each crossing on a slip with the time, and couriers carry the slips to the counting office. Most slips arrive within seconds. Some couriers get stuck in traffic and arrive twenty minutes later. Some slips are photocopied by mistake and arrive twice.

If the office counts slips by when they *arrive*, the 8:00 minute is undercounted and 8:20 overcounted. If it waits forever for stragglers, it never publishes a number. If it counts photocopies, drivers are billed twice.

So the office counts by the time *written on the slip*, waits a little before closing each minute, fixes the total if a straggler arrives soon after, sends very late slips to an end-of-day recount, and checks each slip number against those already counted. That is an ad click aggregation system.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Clicks per day, peak factor, number of ads? | Sizes ingestion, partitions and aggregate storage |
| How fresh: seconds, a minute, an hour? | Decides streaming versus batch and the watermark delay |
| How exact, and is it used for billing? | Billing needs dedup, exactly-once effect and reconciliation |
| How late can clicks arrive? | Sets allowed lateness and the batch correction window |
| Which queries: per ad, top N, filters? | Shapes the aggregate tables and pre-computed rollups |
| Retention of raw clicks and aggregates? | Raw log for audits and recomputation; rollups for history |

## 3. Requirements

**Functional**
- Count clicks per ad per minute; query any range for an ad.
- Return the top N most-clicked ads in the last minute (optionally filtered by country or device).
- Billing uses counts that are exact, deduplicated and corrected for late events.

**Non-functional**
- Dashboard numbers within about a minute; billing numbers final within hours.
- No double counting; no lost clicks (every click in the raw log is eventually counted).
- Survive a hot ad (a viral campaign) and node failures without stopping.

## 4. Capacity Estimate

Assumptions (in the program): 1 billion clicks a day, a 5x peak, 200 bytes per click event, 2 million ads of which 10% get a click in any given minute.

| Quantity | From the run |
| :--- | ---: |
| Average click rate | 11,574 per second |
| Peak click rate | 57,870 per second |
| Raw click log | 200 GB per day before replication |
| Aggregate rows (ad x minute) | 288M per day |

The raw rate is modest for a partitioned log, so ingestion is not the hard part. The hard parts are correctness (late, duplicate and out-of-order events) and the 288M aggregate rows a day, which is why the aggregate store rolls minutes up into hours and days after a retention period.

## 5. API and Data Model

~~~text
GET /v1/ads/{adId}/clicks?from=2026-10-17T08:00Z&to=2026-10-17T09:00Z&granularity=minute
GET /v1/ads/top?window=1m&n=100&country=NZ
~~~

**Raw click event** (in the log and in object storage):

| Field | Example | Note |
| :--- | :--- | :--- |
| \`click_id\` | \`c-7f3a...\` | unique per click, set at the edge; the dedup key |
| \`ad_id\` | \`ad-1\` | partition key |
| \`event_time\` | \`08:00:12.345\` | when the user clicked, from the client or edge |
| \`user_id\`, \`ip\`, \`country\`, \`device\` | | filters and fraud checks |

**Aggregates** (OLAP column store): \`(ad_id, window_start, country, device) -> clicks\`, and \`(window_start) -> top 100 [(ad_id, clicks)]\`.

## 6. Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Ad click aggregation: click service writes to a partitioned log; a stream aggregator computes event time windows into an OLAP store read by the query service; the raw log is archived and a batch job reconciles the aggregates">
  <defs>
    <marker id="sd13q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="15" y="40" width="130" height="60" rx="8"/>
  <text class="d-text" x="80" y="67" text-anchor="middle">click service</text>
  <text class="d-sub" x="80" y="87" text-anchor="middle">assign click_id</text>
  <rect class="d-box-accent" x="200" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="275" y="67" text-anchor="middle">click log</text>
  <text class="d-sub" x="275" y="87" text-anchor="middle">partitioned by ad</text>
  <rect class="d-box-accent" x="405" y="40" width="160" height="60" rx="8"/>
  <text class="d-text" x="485" y="67" text-anchor="middle">stream aggregator</text>
  <text class="d-sub" x="485" y="87" text-anchor="middle">event time windows</text>
  <rect class="d-box" x="620" y="40" width="125" height="60" rx="8"/>
  <text class="d-text" x="682" y="67" text-anchor="middle">OLAP store</text>
  <text class="d-sub" x="682" y="87" text-anchor="middle">aggregates</text>
  <rect class="d-box-muted" x="200" y="210" width="150" height="60" rx="8"/>
  <text class="d-text" x="275" y="237" text-anchor="middle">object storage</text>
  <text class="d-sub" x="275" y="257" text-anchor="middle">raw clicks</text>
  <rect class="d-box-muted" x="405" y="210" width="160" height="60" rx="8"/>
  <text class="d-text" x="485" y="237" text-anchor="middle">batch recount</text>
  <text class="d-sub" x="485" y="257" text-anchor="middle">hourly, daily</text>
  <rect class="d-box" x="620" y="210" width="125" height="60" rx="8"/>
  <text class="d-text" x="682" y="245" text-anchor="middle">query API</text>
  <line class="d-edge" x1="145" y1="70" x2="196" y2="70" marker-end="url(#sd13q5-arrow)"/>
  <line class="d-edge" x1="350" y1="70" x2="401" y2="70" marker-end="url(#sd13q5-arrow)"/>
  <line class="d-edge" x1="565" y1="70" x2="616" y2="70" marker-end="url(#sd13q5-arrow)"/>
  <line class="d-edge-dashed" x1="275" y1="100" x2="275" y2="206" marker-end="url(#sd13q5-arrow)"/>
  <line class="d-edge-dashed" x1="350" y1="240" x2="401" y2="240" marker-end="url(#sd13q5-arrow)"/>
  <line class="d-edge-dashed" x1="565" y1="225" x2="640" y2="104" marker-end="url(#sd13q5-arrow)"/>
  <line class="d-edge" x1="682" y1="100" x2="682" y2="206" marker-end="url(#sd13q5-arrow)"/>
  <line class="d-edge-dashed" x1="485" y1="100" x2="485" y2="206" marker-end="url(#sd13q5-arrow)"/>
</svg>

The solid path is the fast stream (seconds to a minute); the dashed path is the slow, exact path: the raw log archived to object storage, recounted in batch, and written back over the streaming aggregates. The dashed arrow from the aggregator to the batch recount carries the too-late events.

- **Click service**: a redirect endpoint (\`/c/{adId}?...\` then a 302 to the advertiser) that stamps \`click_id\` and \`event_time\` and appends to the log. Validation and basic fraud filters (bot user agents, click floods from one IP) happen here or in a separate stream job.
- **Click log**: a partitioned, replicated append-only log keyed by \`ad_id\`, so all clicks of one ad land in one partition, in order per partition. Choosing between a log and a queue is on [Kafka vs SQS](/interview-question/kafka-vs-sqs-how-do-you-choose-for-an-event-driven-system-in-2025).
- **Stream aggregator**: reads partitions, deduplicates, windows by event time, emits per-minute counts and corrections.
- **OLAP store**: a column-oriented store that is fast at "sum by ad and minute with filters".
- **Batch recount**: periodically recomputes from the raw log and overwrites the streaming numbers; billing reads only reconciled numbers.

## 7. Deep Dive 1: Event Time, Watermarks and Late Clicks

📌 **Interview term: event time vs processing time** — event time is when the click happened (stamped at the source); processing time is when the aggregator sees it. Billing is about event time.

📌 **Interview term: tumbling window** — fixed, non-overlapping intervals (08:00 to 08:01, 08:01 to 08:02, ...); each event belongs to exactly one.

📌 **Interview term: watermark** — the aggregator's running estimate of "event time up to which I have seen everything". A simple one is \`max event time seen - 10 s\` (bounded out-of-orderness). When the watermark passes a window's end, the window fires.

📌 **Interview term: allowed lateness** — how long after firing a window still accepts events and emits a corrected result. Flink documents this: a window is kept until its end plus the allowed lateness, late elements inside that period update it, and elements later than that are dropped unless sent to a **side output**.

The run has 6,000 clicks over 3 minutes; 94% arrive within 5 s, 4% arrive 20 to 59 s late, 2% arrive 100 to 199 s late, and 2% of clicks are sent twice by a client retry. Watermark = max event time - 10 s, allowed lateness 30 s:

| Outcome | Count |
| :--- | ---: |
| Events received | 6,109 |
| Duplicates dropped | 109 |
| Counted on time | 5,834 |
| Late, counted as a correction | 76 |
| Too late, sent to the side output | 90 |

First results and final numbers per window:

| Window | First emitted | First total | Streaming final | Batch truth | By arrival minute |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [0 s, 60 s) | t = 70 s | 1,912 | 1,957 | 2,000 | 1,806 |
| [60 s, 120 s) | t = 130 s | 1,922 | 1,953 | 2,000 | 1,990 |
| [120 s, 180 s) | end of input | 2,000 | 2,000 | 2,000 | 1,978 |

Reading the table:

- The first window fired at t = 70 s (window end 60 s plus the 10 s watermark delay) with 1,912 clicks; 45 later corrections brought it to 1,957. The last window fired only when the input ended, so it saw everything; in a running system it would behave like the others.
- **Processing-time windows are wrong for billing**: counting by arrival minute gives 1,806 for the first minute and invents three extra minutes (164, 33 and 29 clicks) after the campaign stopped.
- The streaming totals plus the 90 too-late events equal the batch truth exactly (5,910 + 90 = 6,000). Nothing is lost, as long as the too-late events reach the batch path.

The knobs trade freshness for completeness: a longer watermark delay fires later with fewer corrections; a longer allowed lateness keeps more window state in memory. Downstream consumers must accept **updates** to a window (upsert by \`ad_id, window_start\`), not just appends.

## 8. Deep Dive 2: Dedup and Exactly-Once Effect

Clicks are duplicated by client retries, by the log producer retrying, and by the aggregator replaying from a checkpoint after a crash. The run dropped 109 duplicates by \`click_id\`.

- **Dedup state**: a set of recent \`click_id\`s per partition, kept for as long as duplicates can arrive (for example one hour), expired after that. At 57,870 clicks per second, an hour of IDs is about 208 million entries spread over the partitions, so it lives in the stream processor's state store on disk, not in a heap map; a [Bloom filter](/interview-question/what-is-a-bloom-filter-and-when-is-it-useful) in front can skip most lookups.
- **Exactly-once effect into the store**: either commit output and input offsets in one transaction, or make the sink idempotent: write \`(ad_id, window_start) -> count\` as an upsert carrying the window version, so a replay overwrites with the same value instead of adding. Both are discussed on [exactly-once processing](/interview-question/exactly-once-processing-can-kafka-or-sqs-guarantee-it).

📌 **Interview term: idempotent sink** — a destination where writing the same result twice leaves the same state, typically an upsert keyed by the aggregate's identity.

## 9. Deep Dive 3: Hot Ads and Top N

Partitioning by \`ad_id\` keeps each ad's counting on one worker, which is what makes per-ad counts and top-N simple. A viral ad can exceed one worker:

📌 **Interview term: hot key and key splitting** — when one key gets a large share of traffic, append a small suffix (\`ad-1#0\` to \`ad-1#7\`) to spread it over 8 partitions, count partial sums there, then a second stage sums the 8 partials per window. This is **two-stage aggregation**.

**Top N per minute**: with partitioning by ad, every partition has complete counts for its own ads, so each worker computes its local top N and one merger takes the top N of the union; the result is exact. (After key splitting, merge the partial sums before ranking.) The run prints top 3 per window, for example \`ad-1=756 ad-2=490 ad-3=300\` for the first window at first emission.

## 10. Deep Dive 4: Reconciliation, Lambda and Kappa

📌 **Interview term: reconciliation** — recomputing aggregates from the raw, immutable log on a schedule and correcting the published numbers. The run shows why: streaming finals were 43 and 47 short in the first two windows, exactly the too-late events.

📌 **Interview term: lambda vs kappa architecture** — **lambda** runs a streaming path for fresh approximate numbers and a separate batch path for exact ones; **kappa** uses one streaming code path and recomputes by replaying the log. For billing, a hybrid is common: one aggregation logic, run as a stream for dashboards and re-run as a batch over the archived raw log for invoices.

Also reconcile against the source of truth for money: the click service can count accepted clicks per ad per hour independently; a mismatch with the aggregates raises an alert before invoices go out.

## 11. What Breaks First at 10x

| Growth | What breaks | Fix |
| :--- | :--- | :--- |
| 10x clicks (about 580,000 per second at peak) | partitions and aggregator parallelism | more partitions; scale workers with partitions |
| Viral campaigns | one partition hot | key splitting and two-stage aggregation |
| More filter dimensions | aggregate rows explode (ad x minute x country x device) | pre-aggregate only common combinations; query raw data for rare ones |
| Longer lateness (offline mobile) | window state grows | short allowed lateness plus batch corrections |
| Retention of 288M rows a day | storage and query cost | roll minutes up to hours after 7 days, to days after 90 |

## 12. Verified: Running the Code

The program is an in-process simulation: an array of events sorted by arrival time stands for the partitioned log, a Set stands for the dedup state, a Map of windows stands for the stream processor's window state, and a second pass over the same array stands for the batch job over object storage. A seeded generator makes the events identical in every language. It leaves out partitions, checkpoints and crashes.

The key part, per event in arrival order:

~~~js
if (seen.has(e.id)) { dups++; continue; }
seen.add(e.id);
const start = Math.floor(e.et / W) * W;
if (!windows.has(start)) windows.set(start, { counts: new Map(), fired: false });
const w = windows.get(start);
if (w.fired && watermark >= start + W + LATENESS) { tooLate++; continue; } // side output -> batch path
w.counts.set(e.ad, (w.counts.get(e.ad) || 0) + 1);
if (w.fired) corrections++; else onTime++;
watermark = Math.max(watermark, e.et - OUT_OF_ORDER);
fire(watermark, e.at);
~~~

Full output (identical in Node, Python, Go and Java):

~~~text
== 0. capacity ==
  average 11574 clicks/s, peak 57870 clicks/s
  raw log 200 GB/day before replication
  aggregate rows per day (ad x minute, 10% of 2M ads active each minute): 288M
== 1. streaming job (event time, 60 s windows, watermark = max event time - 10 s, lateness 30 s) ==
  received 6109  duplicates dropped 109  on time 5834  late but corrected 76  too late 90
  [0s,60s) emitted at t=70: total=1912  top3: ad-1=756 ad-2=490 ad-3=300
  [60s,120s) emitted at t=130: total=1922  top3: ad-1=779 ad-2=482 ad-3=281
  [120s,180s) emitted at t=end: total=2000  top3: ad-1=791 ad-2=490 ad-3=309
== 2. per window: streaming final vs batch truth vs processing-time windows ==
  [0s,60s)  streaming=1957  batch=2000  missing=43  by-arrival-minute=1806
  [60s,120s)  streaming=1953  batch=2000  missing=47  by-arrival-minute=1990
  [120s,180s)  streaming=2000  batch=2000  missing=0  by-arrival-minute=1978
  [180s,240s)  streaming=0  batch=0  missing=0  by-arrival-minute=164
  [240s,300s)  streaming=0  batch=0  missing=0  by-arrival-minute=33
  [300s,360s)  streaming=0  batch=0  missing=0  by-arrival-minute=29
  totals: streaming 5910 + too late 90 = 6000, batch 6000
~~~

## 13. Edge Cases Worth Knowing

- **Client clocks are wrong**: a phone set to last year produces absurd event times. Clamp event time to a range around server receive time, or use the edge receive time as event time.
- **Idle partitions stall the watermark**: if one partition gets no clicks, a global watermark (the minimum over partitions) stops advancing and windows never fire; mark idle partitions so they do not hold it back.
- **Click fraud**: invalid clicks must be removed before billing; often a separate job flags them later, which is one more reason billing reads reconciled numbers.
- **Time zones and billing periods**: store UTC windows; build per-advertiser day boundaries in the query layer.
- **Replays after a bug fix**: the raw log must be retained long enough to recompute a billing period.

## Common Pitfalls

- **Windowing by processing time.** The run put 1,806 clicks in the first minute instead of 2,000 and invented three extra minutes.
- **No dedup.** 109 retried clicks would have been billed twice.
- **Dropping too-late events silently.** 90 clicks would have been lost; send them to a side output and the batch path.
- **Append-only sinks.** Corrections (76 in the run) need upserts by \`(ad_id, window_start)\`.
- **One partition per hot ad.** Split hot keys and aggregate in two stages.
- **Billing from the stream alone.** Streaming finals were 90 short of the truth; invoice from reconciled numbers.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope and size:</strong> <span style="color:#f0e2c8;">A billion clicks a day is about 11,574 per second, 57,870 at a 5x peak, and 200 GB a day raw. Counting per ad per minute gives about 288M aggregate rows a day. Ingestion is easy; correctness is the hard part because it is billing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pipeline:</strong> <span style="color:#f0e2c8;">A click service stamps a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">click_id</code> and event time and appends to a log <strong style="color:#ffca28;">partitioned by ad</strong>; a stream aggregator dedups and counts in <strong style="color:#ffca28;">event-time tumbling windows</strong>; results are upserted into an OLAP store; the raw log is archived to object storage for recounts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Late and out of order:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">watermark</strong> of max event time minus 10 s fires each minute; <strong style="color:#ffca28;">allowed lateness</strong> of 30 s emits corrections; anything later goes to a side output. In my run that was 5,834 on time, 76 corrections and 90 too late, and processing-time windows would have shown 1,806 instead of 2,000 for the first minute.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Exactly-once effect:</strong> <span style="color:#f0e2c8;">Dedup by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">click_id</code> with state kept as long as duplicates can arrive (109 dropped in the run), plus an <strong style="color:#ffca28;">idempotent sink</strong>: upsert by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(ad_id, window_start)</code> or transactional offsets, so replays after a crash do not double count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Reconcile and scale:</strong> <span style="color:#f0e2c8;">A batch recount from the raw log corrects the stream: 5,910 streamed plus 90 too late equals the 6,000 true clicks. Billing reads only reconciled numbers. Hot ads get <strong style="color:#ffca28;">key splitting</strong> with two-stage aggregation; top N is a local top N per partition merged once.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just increment a counter in Redis per ad per minute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works for a dashboard, but it counts by arrival unless you compute the window from event time, it has no dedup, a retry double counts, and there is no record to recompute from. Keep the raw log and treat counters as a derived, replaceable view.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you choose the watermark delay?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the measured lateness distribution: pick the delay that covers, say, 99% of events, so most windows are final on first emission. Then set allowed lateness for the next slice and leave the long tail to batch. Shorter means fresher dashboards with more corrections.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is top 100 computed exactly across partitions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because each ad lives in exactly one partition, each partition has the full count for its ads. Each computes its local top 100 per window, and a single merger takes the top 100 of those lists. If hot ads are split, merge their partial sums first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when the aggregator crashes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It restarts from its last checkpoint: window state, dedup state and input offsets restored together, then replays the log from those offsets. With an idempotent upsert sink the replayed windows overwrite with the same values, so nothing is counted twice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support filtering by country and device?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Include the common dimensions in the aggregation key so the OLAP store can sum over them, and accept that rows multiply by each dimension. Rare combinations are answered from raw events in the column store instead of pre-aggregated.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Event time vs processing time | When the click happened vs when the system saw it |
| Tumbling window | Fixed, non-overlapping time interval; each event in exactly one |
| Watermark | Estimate of event time up to which input is complete; fires windows |
| Allowed lateness | How long a fired window still accepts events and emits corrections |
| Idempotent sink | Writing the same result twice leaves the same state |
| Hot key and key splitting | Spreading one busy key over several partitions, then summing |
| Reconciliation | Recomputing from the raw log and correcting published numbers |
| Lambda vs kappa architecture | Separate batch and stream paths vs one stream path with replay |

**Conclusion:** Ad click aggregation is a small ingestion problem and a large correctness problem. Partition the click log by ad, deduplicate by click ID, count in event-time tumbling windows fired by a watermark, accept corrections within an allowed lateness, and route anything later to a batch path. The run shows each piece earning its place: 109 duplicates dropped, 76 corrections applied, 90 too-late clicks recovered by the recount (5,910 + 90 = 6,000), and processing-time windows wrong by 194 clicks in the first minute. Write with idempotent upserts, split hot ads, compute top N per partition and merge, and bill only from reconciled numbers.`,
    examples: [
      {
        label: `Ad click aggregation: event-time windows, watermark, allowed lateness, dedup, top ads per minute and batch reconciliation`,
        variants: [
          { tech: "node", code: `// Ad click aggregation: event-time tumbling windows with a watermark, allowed lateness,
// dedup by click ID, top ads per minute, and a batch reconciliation of the raw log.

// ---- 0. capacity estimate (assumptions) ----
const clicksPerDay = 1e9, peakFactor = 5, bytesPerClick = 200, activeAds = 2e6, activeShare = 0.1;
const avg = Math.round(clicksPerDay / 86400);
console.log("== 0. capacity ==");
console.log(\`  average \${avg} clicks/s, peak \${avg * peakFactor} clicks/s\`);
console.log(\`  raw log \${(clicksPerDay * bytesPerClick) / 1e9} GB/day before replication\`);
console.log(\`  aggregate rows per day (ad x minute, \${activeShare * 100}% of \${activeAds / 1e6}M ads active each minute): \${activeAds * activeShare * 1440 / 1e6}M\`);

let seed = 2026; // 32-bit LCG so every language draws the same events
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
function pickAd() {
  const r = rand();
  if (r < 0.4) return "ad-1"; if (r < 0.65) return "ad-2"; if (r < 0.8) return "ad-3";
  if (r < 0.9) return "ad-4"; if (r < 0.96) return "ad-5"; return "ad-6";
}
// 6000 clicks over 3 minutes of event time; most arrive within 5 s, some 20-59 s late, a few 100-199 s late;
// 2% are re-sent by a client retry (same click ID).
const events = [];
for (let i = 0; i < 6000; i++) {
  const et = Math.floor((i * 180) / 6000), ad = pickAd();
  const r = rand();
  let delay;
  if (r < 0.94) delay = Math.floor(rand() * 6);
  else if (r < 0.98) delay = 20 + Math.floor(rand() * 40);
  else delay = 100 + Math.floor(rand() * 100);
  events.push({ id: "c" + i, ad, et, at: et + delay, seq: 2 * i });
  if (rand() < 0.02) events.push({ id: "c" + i, ad, et, at: et + delay + 1 + Math.floor(rand() * 10), seq: 2 * i + 1 });
}
events.sort((a, b) => a.at - b.at || a.seq - b.seq); // arrival order

const W = 60, OUT_OF_ORDER = 10, LATENESS = 30;
const windows = new Map(); // start -> { counts: Map, fired, firedAt }
const seen = new Set();
let watermark = -Infinity, dups = 0, onTime = 0, corrections = 0, tooLate = 0;
const top = (counts, n) => [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n).map(([k, v]) => k + "=" + v).join(" ");
const total = (counts) => [...counts.values()].reduce((s, v) => s + v, 0);
const firstResults = [];
function fire(upTo, at) {
  for (const start of [...windows.keys()].sort((a, b) => a - b)) {
    const w = windows.get(start);
    if (!w.fired && start + W <= upTo) { w.fired = true; firstResults.push(\`  [\${start}s,\${start + W}s) emitted at t=\${at}: total=\${total(w.counts)}  top3: \${top(w.counts, 3)}\`); }
  }
}
for (const e of events) {
  if (seen.has(e.id)) { dups++; continue; }
  seen.add(e.id);
  const start = Math.floor(e.et / W) * W;
  if (!windows.has(start)) windows.set(start, { counts: new Map(), fired: false });
  const w = windows.get(start);
  if (w.fired && watermark >= start + W + LATENESS) { tooLate++; continue; } // side output -> batch path
  w.counts.set(e.ad, (w.counts.get(e.ad) || 0) + 1);
  if (w.fired) corrections++; else onTime++;
  watermark = Math.max(watermark, e.et - OUT_OF_ORDER);
  fire(watermark, e.at);
}
fire(Infinity, "end");

console.log("== 1. streaming job (event time, 60 s windows, watermark = max event time - 10 s, lateness 30 s) ==");
console.log(\`  received \${events.length}  duplicates dropped \${dups}  on time \${onTime}  late but corrected \${corrections}  too late \${tooLate}\`);
for (const line of firstResults) console.log(line);

// ---- 2. ground truth from the raw log (what the batch job computes) ----
const truth = new Map(), byArrival = new Map(), once = new Set();
for (const e of events) {
  if (once.has(e.id)) continue; once.add(e.id);
  const s = Math.floor(e.et / W) * W, a = Math.floor(e.at / W) * W;
  truth.set(s, (truth.get(s) || 0) + 1);
  byArrival.set(a, (byArrival.get(a) || 0) + 1);
}
console.log("== 2. per window: streaming final vs batch truth vs processing-time windows ==");
const starts = [...new Set([...truth.keys(), ...byArrival.keys()])].sort((a, b) => a - b);
for (const s of starts) {
  const stream = windows.has(s) ? total(windows.get(s).counts) : 0;
  console.log(\`  [\${s}s,\${s + W}s)  streaming=\${stream}  batch=\${truth.get(s) || 0}  missing=\${(truth.get(s) || 0) - stream}  by-arrival-minute=\${byArrival.get(s) || 0}\`);
}
const sumTruth = [...truth.values()].reduce((x, y) => x + y, 0);
const sumStream = [...windows.values()].reduce((x, w) => x + total(w.counts), 0);
console.log(\`  totals: streaming \${sumStream} + too late \${tooLate} = \${sumStream + tooLate}, batch \${sumTruth}\`);` },
          { tech: "python", code: `# Ad click aggregation: event-time tumbling windows with a watermark, allowed lateness,
# dedup by click ID, top ads per minute, and a batch reconciliation of the raw log.

# ---- 0. capacity estimate (assumptions) ----
clicks_per_day, peak_factor, bytes_per_click, active_ads, active_pct = 1_000_000_000, 5, 200, 2_000_000, 10
avg = round(clicks_per_day / 86400)
print("== 0. capacity ==")
print(f"  average {avg} clicks/s, peak {avg * peak_factor} clicks/s")
print(f"  raw log {clicks_per_day * bytes_per_click // 10**9} GB/day before replication")
print(f"  aggregate rows per day (ad x minute, {active_pct}% of {active_ads // 10**6}M ads active each minute): "
      f"{active_ads * active_pct // 100 * 1440 // 10**6}M")

seed = 2026  # 32-bit LCG so every language draws the same events


def rand():
    global seed
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296


def pick_ad():
    r = rand()
    for limit, ad in [(0.4, "ad-1"), (0.65, "ad-2"), (0.8, "ad-3"), (0.9, "ad-4"), (0.96, "ad-5")]:
        if r < limit:
            return ad
    return "ad-6"


# 6000 clicks over 3 minutes of event time; most arrive within 5 s, some 20-59 s late, a few 100-199 s late;
# 2% are re-sent by a client retry (same click ID).
events = []
for i in range(6000):
    et = i * 180 // 6000
    ad = pick_ad()
    r = rand()
    if r < 0.94:
        delay = int(rand() * 6)
    elif r < 0.98:
        delay = 20 + int(rand() * 40)
    else:
        delay = 100 + int(rand() * 100)
    events.append({"id": f"c{i}", "ad": ad, "et": et, "at": et + delay, "seq": 2 * i})
    if rand() < 0.02:
        events.append({"id": f"c{i}", "ad": ad, "et": et, "at": et + delay + 1 + int(rand() * 10), "seq": 2 * i + 1})
events.sort(key=lambda e: (e["at"], e["seq"]))  # arrival order

W, OUT_OF_ORDER, LATENESS = 60, 10, 30
windows = {}  # start -> {"counts": dict, "fired": bool}
seen = set()
watermark = float("-inf")
dups = on_time = corrections = too_late = 0
first_results = []


def top(counts, n):
    items = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:n]
    return " ".join(f"{k}={v}" for k, v in items)


def total(counts):
    return sum(counts.values())


def fire(up_to, at):
    for start in sorted(windows):
        w = windows[start]
        if not w["fired"] and start + W <= up_to:
            w["fired"] = True
            first_results.append(f"  [{start}s,{start + W}s) emitted at t={at}: total={total(w['counts'])}  top3: {top(w['counts'], 3)}")


for e in events:
    if e["id"] in seen:
        dups += 1
        continue
    seen.add(e["id"])
    start = e["et"] // W * W
    w = windows.setdefault(start, {"counts": {}, "fired": False})
    if w["fired"] and watermark >= start + W + LATENESS:  # side output -> batch path
        too_late += 1
        continue
    w["counts"][e["ad"]] = w["counts"].get(e["ad"], 0) + 1
    if w["fired"]:
        corrections += 1
    else:
        on_time += 1
    watermark = max(watermark, e["et"] - OUT_OF_ORDER)
    fire(watermark, e["at"])
fire(float("inf"), "end")

print("== 1. streaming job (event time, 60 s windows, watermark = max event time - 10 s, lateness 30 s) ==")
print(f"  received {len(events)}  duplicates dropped {dups}  on time {on_time}  late but corrected {corrections}  too late {too_late}")
for line in first_results:
    print(line)

# ---- 2. ground truth from the raw log (what the batch job computes) ----
truth, by_arrival, once = {}, {}, set()
for e in events:
    if e["id"] in once:
        continue
    once.add(e["id"])
    s, a = e["et"] // W * W, e["at"] // W * W
    truth[s] = truth.get(s, 0) + 1
    by_arrival[a] = by_arrival.get(a, 0) + 1
print("== 2. per window: streaming final vs batch truth vs processing-time windows ==")
for s in sorted(set(truth) | set(by_arrival)):
    stream = total(windows[s]["counts"]) if s in windows else 0
    t = truth.get(s, 0)
    print(f"  [{s}s,{s + W}s)  streaming={stream}  batch={t}  missing={t - stream}  by-arrival-minute={by_arrival.get(s, 0)}")
sum_truth = sum(truth.values())
sum_stream = sum(total(w["counts"]) for w in windows.values())
print(f"  totals: streaming {sum_stream} + too late {too_late} = {sum_stream + too_late}, batch {sum_truth}")` },
          { tech: "go", code: `// Ad click aggregation: event-time tumbling windows with a watermark, allowed lateness,
// dedup by click ID, top ads per minute, and a batch reconciliation of the raw log.
package main

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

var seed uint64 = 2026 // 32-bit LCG so every language draws the same events

func rand() float64 {
	seed = (seed*1664525 + 1013904223) % 4294967296
	return float64(seed) / 4294967296
}

func pickAd() string {
	r := rand()
	limits := []float64{0.4, 0.65, 0.8, 0.9, 0.96}
	for i, l := range limits {
		if r < l {
			return fmt.Sprintf("ad-%d", i+1)
		}
	}
	return "ad-6"
}

type Event struct {
	id, ad      string
	et, at, seq int
}
type Window struct {
	counts map[string]int
	fired  bool
}

const W, OutOfOrder, Lateness = 60, 10, 30

var windows = map[int]*Window{}
var firstResults []string

func total(c map[string]int) int {
	s := 0
	for _, v := range c {
		s += v
	}
	return s
}

func top(c map[string]int, n int) string {
	keys := make([]string, 0, len(c))
	for k := range c {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		if c[keys[i]] != c[keys[j]] {
			return c[keys[i]] > c[keys[j]]
		}
		return keys[i] < keys[j]
	})
	if len(keys) > n {
		keys = keys[:n]
	}
	parts := []string{}
	for _, k := range keys {
		parts = append(parts, fmt.Sprintf("%s=%d", k, c[k]))
	}
	return strings.Join(parts, " ")
}

func sortedKeys(m map[int]bool) []int {
	ks := []int{}
	for k := range m {
		ks = append(ks, k)
	}
	sort.Ints(ks)
	return ks
}

func fire(upTo int, at string) {
	starts := map[int]bool{}
	for s := range windows {
		starts[s] = true
	}
	for _, start := range sortedKeys(starts) {
		w := windows[start]
		if !w.fired && start+W <= upTo {
			w.fired = true
			firstResults = append(firstResults, fmt.Sprintf("  [%ds,%ds) emitted at t=%s: total=%d  top3: %s", start, start+W, at, total(w.counts), top(w.counts, 3)))
		}
	}
}

func main() {
	clicksPerDay, peakFactor, bytesPerClick, activeAds, activePct := 1000000000, 5, 200, 2000000, 10
	avg := int(math.Round(float64(clicksPerDay) / 86400))
	fmt.Println("== 0. capacity ==")
	fmt.Printf("  average %d clicks/s, peak %d clicks/s\\n", avg, avg*peakFactor)
	fmt.Printf("  raw log %d GB/day before replication\\n", clicksPerDay*bytesPerClick/1000000000)
	fmt.Printf("  aggregate rows per day (ad x minute, %d%% of %dM ads active each minute): %dM\\n",
		activePct, activeAds/1000000, activeAds*activePct/100*1440/1000000)

	events := []Event{}
	for i := 0; i < 6000; i++ {
		et := i * 180 / 6000
		ad := pickAd()
		r := rand()
		var delay int
		if r < 0.94 {
			delay = int(rand() * 6)
		} else if r < 0.98 {
			delay = 20 + int(rand()*40)
		} else {
			delay = 100 + int(rand()*100)
		}
		id := fmt.Sprintf("c%d", i)
		events = append(events, Event{id, ad, et, et + delay, 2 * i})
		if rand() < 0.02 {
			events = append(events, Event{id, ad, et, et + delay + 1 + int(rand()*10), 2*i + 1})
		}
	}
	sort.Slice(events, func(i, j int) bool {
		if events[i].at != events[j].at {
			return events[i].at < events[j].at
		}
		return events[i].seq < events[j].seq
	})

	seen := map[string]bool{}
	watermark := math.MinInt64 / 2
	dups, onTime, corrections, tooLate := 0, 0, 0, 0
	for _, e := range events {
		if seen[e.id] {
			dups++
			continue
		}
		seen[e.id] = true
		start := e.et / W * W
		w, ok := windows[start]
		if !ok {
			w = &Window{map[string]int{}, false}
			windows[start] = w
		}
		if w.fired && watermark >= start+W+Lateness { // side output -> batch path
			tooLate++
			continue
		}
		w.counts[e.ad]++
		if w.fired {
			corrections++
		} else {
			onTime++
		}
		watermark = max(watermark, e.et-OutOfOrder)
		fire(watermark, fmt.Sprint(e.at))
	}
	fire(math.MaxInt64/2, "end")

	fmt.Println("== 1. streaming job (event time, 60 s windows, watermark = max event time - 10 s, lateness 30 s) ==")
	fmt.Printf("  received %d  duplicates dropped %d  on time %d  late but corrected %d  too late %d\\n", len(events), dups, onTime, corrections, tooLate)
	for _, l := range firstResults {
		fmt.Println(l)
	}

	truth, byArrival, once := map[int]int{}, map[int]int{}, map[string]bool{}
	all := map[int]bool{}
	for _, e := range events {
		if once[e.id] {
			continue
		}
		once[e.id] = true
		s, a := e.et/W*W, e.at/W*W
		truth[s]++
		byArrival[a]++
		all[s], all[a] = true, true
	}
	fmt.Println("== 2. per window: streaming final vs batch truth vs processing-time windows ==")
	sumTruth, sumStream := 0, 0
	for _, s := range sortedKeys(all) {
		stream := 0
		if w, ok := windows[s]; ok {
			stream = total(w.counts)
		}
		fmt.Printf("  [%ds,%ds)  streaming=%d  batch=%d  missing=%d  by-arrival-minute=%d\\n", s, s+W, stream, truth[s], truth[s]-stream, byArrival[s])
		sumTruth += truth[s]
	}
	for _, w := range windows {
		sumStream += total(w.counts)
	}
	fmt.Printf("  totals: streaming %d + too late %d = %d, batch %d\\n", sumStream, tooLate, sumStream+tooLate, sumTruth)
}` },
          { tech: "java", code: `// Ad click aggregation: event-time tumbling windows with a watermark, allowed lateness,
// dedup by click ID, top ads per minute, and a batch reconciliation of the raw log.
import java.util.*;
import java.util.stream.Collectors;

public class Main {
    static long seed = 2026; // 32-bit LCG so every language draws the same events

    static double rand() {
        seed = (seed * 1664525L + 1013904223L) % 4294967296L;
        return seed / 4294967296.0;
    }

    static String pickAd() {
        double r = rand();
        double[] limits = {0.4, 0.65, 0.8, 0.9, 0.96};
        for (int i = 0; i < limits.length; i++) if (r < limits[i]) return "ad-" + (i + 1);
        return "ad-6";
    }

    record Event(String id, String ad, int et, int at, int seq) {}
    static class Window { Map<String, Integer> counts = new HashMap<>(); boolean fired; }

    static final int W = 60, OUT_OF_ORDER = 10, LATENESS = 30;
    static TreeMap<Integer, Window> windows = new TreeMap<>();
    static List<String> firstResults = new ArrayList<>();

    static int total(Map<String, Integer> c) { return c.values().stream().mapToInt(Integer::intValue).sum(); }

    static String top(Map<String, Integer> c, int n) {
        return c.entrySet().stream()
            .sorted((a, b) -> !a.getValue().equals(b.getValue()) ? b.getValue() - a.getValue() : a.getKey().compareTo(b.getKey()))
            .limit(n).map(e -> e.getKey() + "=" + e.getValue()).collect(Collectors.joining(" "));
    }

    static void fire(long upTo, String at) {
        for (var en : windows.entrySet()) {
            int start = en.getKey();
            Window w = en.getValue();
            if (!w.fired && start + W <= upTo) {
                w.fired = true;
                firstResults.add("  [" + start + "s," + (start + W) + "s) emitted at t=" + at + ": total=" + total(w.counts) + "  top3: " + top(w.counts, 3));
            }
        }
    }

    public static void main(String[] args) {
        long clicksPerDay = 1_000_000_000L, peakFactor = 5, bytesPerClick = 200, activeAds = 2_000_000, activePct = 10;
        long avg = Math.round(clicksPerDay / 86400.0);
        System.out.println("== 0. capacity ==");
        System.out.println("  average " + avg + " clicks/s, peak " + avg * peakFactor + " clicks/s");
        System.out.println("  raw log " + clicksPerDay * bytesPerClick / 1_000_000_000L + " GB/day before replication");
        System.out.println("  aggregate rows per day (ad x minute, " + activePct + "% of " + activeAds / 1_000_000 + "M ads active each minute): "
            + activeAds * activePct / 100 * 1440 / 1_000_000 + "M");

        List<Event> events = new ArrayList<>();
        for (int i = 0; i < 6000; i++) {
            int et = i * 180 / 6000;
            String ad = pickAd();
            double r = rand();
            int delay;
            if (r < 0.94) delay = (int) (rand() * 6);
            else if (r < 0.98) delay = 20 + (int) (rand() * 40);
            else delay = 100 + (int) (rand() * 100);
            events.add(new Event("c" + i, ad, et, et + delay, 2 * i));
            if (rand() < 0.02) events.add(new Event("c" + i, ad, et, et + delay + 1 + (int) (rand() * 10), 2 * i + 1));
        }
        events.sort(Comparator.comparingInt(Event::at).thenComparingInt(Event::seq));

        Set<String> seen = new HashSet<>();
        long watermark = Long.MIN_VALUE / 2;
        int dups = 0, onTime = 0, corrections = 0, tooLate = 0;
        for (Event e : events) {
            if (!seen.add(e.id())) { dups++; continue; }
            int start = e.et() / W * W;
            Window w = windows.computeIfAbsent(start, k -> new Window());
            if (w.fired && watermark >= start + W + LATENESS) { tooLate++; continue; } // side output -> batch path
            w.counts.merge(e.ad(), 1, Integer::sum);
            if (w.fired) corrections++; else onTime++;
            watermark = Math.max(watermark, e.et() - OUT_OF_ORDER);
            fire(watermark, String.valueOf(e.at()));
        }
        fire(Long.MAX_VALUE / 2, "end");

        System.out.println("== 1. streaming job (event time, 60 s windows, watermark = max event time - 10 s, lateness 30 s) ==");
        System.out.println("  received " + events.size() + "  duplicates dropped " + dups + "  on time " + onTime + "  late but corrected " + corrections + "  too late " + tooLate);
        firstResults.forEach(System.out::println);

        Map<Integer, Integer> truth = new HashMap<>(), byArrival = new HashMap<>();
        Set<String> once = new HashSet<>();
        TreeSet<Integer> all = new TreeSet<>();
        for (Event e : events) {
            if (!once.add(e.id())) continue;
            int s = e.et() / W * W, a = e.at() / W * W;
            truth.merge(s, 1, Integer::sum);
            byArrival.merge(a, 1, Integer::sum);
            all.add(s); all.add(a);
        }
        System.out.println("== 2. per window: streaming final vs batch truth vs processing-time windows ==");
        int sumTruth = 0, sumStream = 0;
        for (int s : all) {
            int stream = windows.containsKey(s) ? total(windows.get(s).counts) : 0;
            int t = truth.getOrDefault(s, 0);
            System.out.println("  [" + s + "s," + (s + W) + "s)  streaming=" + stream + "  batch=" + t + "  missing=" + (t - stream) + "  by-arrival-minute=" + byArrival.getOrDefault(s, 0));
            sumTruth += t;
        }
        for (Window w : windows.values()) sumStream += total(w.counts);
        System.out.println("  totals: streaming " + sumStream + " + too late " + tooLate + " = " + (sumStream + tooLate) + ", batch " + sumTruth);
    }
}` },
        ],
      },
    ],
  },
];

export default augments;
