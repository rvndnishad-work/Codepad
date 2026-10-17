/**
 * SYSTEM DESIGN ULTRA — batch 19: Infrastructure for jobs and AI. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `How would you design a distributed job scheduler?`,
    difficulty: "hard",
    seoDescription: `Design a distributed job scheduler: durable job table, partitioned due-time scans, leases with fencing tokens, idempotent runs, misfire policy and jitter.`,
    description: `**Question presented to candidate:**
"Design a distributed job scheduler, something like a cron service for the whole company. Teams register jobs that run once at a given time or on a cron schedule, millions of them. Every job must run on time, a run must not be lost if a machine dies, and a run must not happen twice by accident. How would you build it?"

**What a strong answer should cover:**
- Separating **definitions** (the job and its schedule) from **runs** (one row per scheduled firing, with a unique run id such as job id plus scheduled time), stored durably in a database
- How due jobs are found at scale: an index on next fire time, scanned by scheduler instances that each own a **partition**, with leader election or row claiming so one firing creates exactly one run row
- Execution with **leases** (visibility timeouts), heartbeats and retries, and a **fencing token** so a worker that stalled and lost its lease cannot commit afterwards; delivery is at-least-once, so job handlers are **idempotent** keyed by run id
- Policies a real scheduler needs: **misfire handling** after downtime (fire all, fire once, skip, or a deadline), **overlap policy** for long runs, retry with backoff and a dead-letter state
- Capacity and hot spots: runs per second, the top-of-the-hour herd, and **jitter** to spread it; what breaks first at 10x

**Clarifying questions expected:**
- How precise must start times be: within a second, or within a minute?
- What does a job do: call an HTTP endpoint, put a message on a queue, or run a container? Who owns retries?
- Is exactly-once required, or is at-least-once with idempotent handlers acceptable?

**Code / implementation expected:** Optional — the example simulates unique run rows, leases with fencing tokens, a stalled worker being fenced off, misfire policies after an outage and jitter on a top-of-hour herd.`,
    answer: `**Target Audience:** Engineers preparing for a system design round. You know what a database, a queue and a server are; leases, fencing and misfire policies are explained from zero.
**Difficulty:** Hard
**Verified with:** Node 22 and Python 3.12 (identical output). Kubernetes CronJob and PostgreSQL facts are cited inline, checked in October 2026.

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts with the vocabulary an interviewer expects. Every number in the deep dives comes from the example program, quoted in full in the **Verified** section. Queues themselves are covered in [the distributed message queue design](/interview-question/how-would-you-design-a-distributed-message-queue-572o); a single-service job queue is covered in [the Node.js job queue design](/interview-question/how-would-you-design-a-job-queue-background-task-processor-in-node-js). This page is about **time**: making millions of things happen at the right moment, once.

## 1. Why This Even Matters — A Story First

Imagine a hotel wake-up call desk. Guests leave notes: "call room 412 at 6:30", "call room 108 every weekday at 7:00". A clerk keeps the notes in a box sorted by time and, when the clock reaches a note, rings the room.

With one clerk, two things go wrong. If the clerk falls asleep, nobody gets called, and when they wake up they have to decide: call everyone they missed at once, call only the latest, or skip them? And if the hotel hires a second clerk to be safe, both clerks might ring room 412 at 6:30.

The fix the hotel lands on is the design on this page. Every call to make is written as its own card with a unique number ("room 412, 6:30, Tuesday"), so a second clerk trying to write the same card notices it already exists. A clerk who picks up a card puts their name and a "back by 6:35" time on it; if they are not back, another clerk may take the card, and the first clerk's late attempt is ignored because the card now carries a newer ticket number. And the hotel writes down, per guest, what to do about missed calls.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many jobs, and how often do they run? | Gives runs per second and the size of the due-time index |
| How precise must the start time be? | One second precision needs a tight scan loop; one minute allows batch scans |
| What does a job do when it fires? | Calling an HTTP endpoint or enqueueing a message keeps the scheduler small; running containers makes it a cluster manager |
| Exactly-once or at-least-once? | Exactly-once execution is not achievable end to end; the real answer is at-least-once plus idempotency |
| What should happen to runs missed during an outage? | Decides the misfire policy, per job |
| Can a run take longer than its interval? | Decides the overlap policy (allow, forbid, replace) |

## 3. Requirements

**Functional**
- Register, update, pause and delete jobs: one-shot (\`run_at\`) or recurring (cron expression with a time zone).
- At the due time, trigger the job's action: an HTTP call, a message on a queue, or a task for a worker pool.
- Retries with backoff, a maximum number of attempts, then a failed or dead-letter state.
- History: every run with its status, attempts, timings and output reference.

**Non-functional**
- **Durable**: an accepted job is never forgotten; a run is never lost because a machine died.
- **No accidental duplicates**: one firing creates one run; duplicate *execution* is limited and harmless.
- **Timely**: runs start within about a second of their due time under normal load.
- **Highly available**: losing any one scheduler or worker machine does not stop scheduling.
- Scales horizontally to millions of jobs.

## 4. Capacity Estimate

Assumptions: 5 million recurring jobs, each running hourly on average; about 300 bytes per run row.

~~~text
== 1. Capacity (assumptions: 5M recurring jobs, each runs hourly) ==
runs/day 120,000,000; average 1,389 runs/s
if every job fires at minute 0: 5,000,000 runs in one second
run rows/day at 300 bytes each: 36 GB
~~~

| What the numbers say | Consequence |
| :--- | :--- |
| 1,389 runs per second on average | A modest write rate for a sharded database; the scheduler itself is not the bottleneck |
| 5,000,000 runs in one second if everyone writes \`0 * * * *\` | The real problem is **burstiness**, not average load; spreading it is a design requirement |
| 36 GB of run history a day | Keep recent runs hot, move old runs to cheaper storage or delete them after N days |

## 5. API

~~~http
POST   /v1/jobs   { name, schedule: "0 * * * *" | run_at, timezone, action: { type: "http", url } ,
                    retry: { max_attempts, backoff }, misfire: "fire_once", overlap: "forbid",
                    jitter_seconds: 60 }                       -> { job_id }
PATCH  /v1/jobs/{job_id}   { paused: true }
DELETE /v1/jobs/{job_id}
POST   /v1/jobs/{job_id}/trigger                              -> { run_id }   (run now, manually)
GET    /v1/jobs/{job_id}/runs?cursor=...                      -> [{ run_id, scheduled_at, state, attempt }]
~~~

## 6. Data Model

Two tables, and the split between them is the most important decision in the design.

| Table | Key | Columns | Purpose |
| :--- | :--- | :--- | :--- |
| \`jobs\` | \`job_id\`, partitioned by \`hash(job_id)\` | schedule, time zone, action, policies, \`next_fire_at\`, \`version\` | What should happen and when next |
| \`runs\` | \`run_id = job_id + "@" + scheduled_at\` (unique) | state, attempt, \`lease_owner\`, \`lease_until\`, \`fence\`, timings | One row per firing; the unit of execution |

Index \`jobs(partition, next_fire_at)\` so a scheduler can ask "which of my jobs are due before now plus 5 seconds" cheaply, and \`runs(state, lease_until)\` so workers can find claimable runs.

📌 **Interview term: job definition vs run** — the definition is the recurring rule; a run is one concrete firing of it at one scheduled time. Retries are attempts *of a run*, not new runs. Keeping them separate makes history, retries and deduplication simple.

📌 **Interview term: deterministic run id** — the run id is computed from the job and the scheduled time (\`report@60\`), not generated randomly. Two scheduler instances that both decide \`report\` is due at 60 compute the same id, and the database unique constraint lets only one insert win.

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 860 330" role="img" aria-label="Clients register jobs through an API into a partitioned jobs store. Scheduler instances each own partitions, scan for due jobs and insert run rows. Workers claim runs with a lease and execute the action.">
  <defs>
    <marker id="sd19q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="72" text-anchor="middle">teams</text>
  <text class="d-sub" x="85" y="94" text-anchor="middle">register jobs</text>
  <rect class="d-box" x="220" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="290" y="72" text-anchor="middle">job API</text>
  <text class="d-sub" x="290" y="94" text-anchor="middle">validate cron</text>
  <rect class="d-box-accent" x="430" y="40" width="170" height="70" rx="10"/>
  <text class="d-text" x="515" y="72" text-anchor="middle">jobs table</text>
  <text class="d-sub" x="515" y="94" text-anchor="middle">next_fire_at index</text>
  <rect class="d-box" x="430" y="210" width="170" height="70" rx="10"/>
  <text class="d-text" x="515" y="242" text-anchor="middle">schedulers</text>
  <text class="d-sub" x="515" y="264" text-anchor="middle">one per partition</text>
  <rect class="d-box-accent" x="670" y="210" width="170" height="70" rx="10"/>
  <text class="d-text" x="755" y="242" text-anchor="middle">runs table</text>
  <text class="d-sub" x="755" y="264" text-anchor="middle">unique run_id</text>
  <rect class="d-box" x="670" y="40" width="170" height="70" rx="10"/>
  <text class="d-text" x="755" y="72" text-anchor="middle">workers</text>
  <text class="d-sub" x="755" y="94" text-anchor="middle">lease and execute</text>
  <rect class="d-box-muted" x="220" y="210" width="140" height="70" rx="10"/>
  <text class="d-text" x="290" y="242" text-anchor="middle">coordinator</text>
  <text class="d-sub" x="290" y="264" text-anchor="middle">partition leases</text>
  <line class="d-edge" x1="150" y1="75" x2="216" y2="75" marker-end="url(#sd19q1-arrow)"/>
  <line class="d-edge" x1="360" y1="75" x2="426" y2="75" marker-end="url(#sd19q1-arrow)"/>
  <line class="d-edge" x1="515" y1="110" x2="515" y2="206" marker-end="url(#sd19q1-arrow)"/>
  <line class="d-edge-accent" x1="600" y1="245" x2="666" y2="245" marker-end="url(#sd19q1-arrow)"/>
  <line class="d-edge-accent" x1="755" y1="210" x2="755" y2="114" marker-end="url(#sd19q1-arrow)"/>
  <line class="d-edge-dashed" x1="360" y1="245" x2="426" y2="245" marker-end="url(#sd19q1-arrow)"/>
</svg>

Teams register jobs through the API into the jobs table. Each scheduler instance holds a lease on some partitions of that table, scans them for due jobs and inserts one run row per firing; workers claim run rows with a lease, execute the action and record the result.

The flow of one firing:

1. The scheduler owning partition 17 runs \`SELECT ... WHERE partition = 17 AND next_fire_at <= now() + 5s\`.
2. For each due job it inserts the run row (\`INSERT ... ON CONFLICT (run_id) DO NOTHING\`) and advances \`next_fire_at\` to the next cron time, in one transaction.
3. A worker claims a pending run, sets \`lease_until = now + 30s\` and increments the fence, executes, heartbeats while running, and marks it done.

Splitting "decide that something is due" (schedulers) from "do it" (workers) means slow jobs never delay the clock, and each side scales on its own: schedulers by partitions, workers by queue depth.

## 8. Deep Dive 1: One Firing Creates One Run

Two scheduler instances can believe they own the same partition for a moment: a failover where the old leader is slow rather than dead, or a deploy. Leader election ([covered here](/interview-question/what-is-leader-election-in-distributed-systems)) gives each partition one owner most of the time, but "most of the time" is not good enough. The database must make the duplicate harmless.

~~~text
== 3. Two scheduler instances fire the same tick ==
scheduler-A: INSERT report@60 -> created
scheduler-B: INSERT report@60 -> already exists, ignored
~~~

Because the run id is deterministic, the unique constraint turns a split-brain moment into a no-op. Without that, the only defence is perfect leader election, which no real system has.

Two ways to find due work, both used in practice:

| Approach | How | Good for | Watch out for |
| :--- | :--- | :--- | :--- |
| Partition ownership | Each scheduler leases a set of partitions and scans only those | Millions of jobs, predictable load | Rebalancing partitions when instances join or leave |
| Row claiming | Any instance runs \`SELECT ... FOR UPDATE SKIP LOCKED LIMIT 100\` on due rows | Simple; tens of thousands of jobs on one PostgreSQL | One database becomes the ceiling |

\`SKIP LOCKED\` arrived in PostgreSQL 9.5 and was designed for exactly this queue-style claiming: other transactions skip rows that are already locked instead of waiting for them (2ndQuadrant, "What is SKIP LOCKED for in PostgreSQL 9.5?").

📌 **Interview term: partitioned scanning** — dividing the job table into many partitions by hash of job id and giving each partition to exactly one scheduler instance at a time, so the work of finding due jobs scales out and no two instances scan the same rows.

For long-range future runs (a one-shot job next March), keeping them in the indexed table and scanning a short window ahead is enough. Some designs add a **timing wheel** in memory for the next few minutes of each partition to get sub-second precision without hammering the index; the database stays the source of truth, and the wheel is rebuilt from it after a restart.

## 9. Deep Dive 2: Leases, Heartbeats and Fencing Tokens

A worker claims a run and then dies, or worse, pauses. The run must not be lost, so the claim is a **lease** with an expiry; if the worker does not heartbeat, the lease runs out and another worker may take the run. The danger is the paused worker coming back and finishing as well.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 280" role="img" aria-label="Timeline: W1 claims with fence 1 at t 60, heartbeats at t 70, stalls. Lease expires at t 100. W2 claims with fence 2 at t 101 and commits at t 105. W1 wakes at t 110 and its commit with fence 1 is rejected.">
  <defs>
    <marker id="sd19q1-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <line class="d-edge" x1="60" y1="225" x2="780" y2="225" marker-end="url(#sd19q1-arrow2)"/>
  <text class="d-sub" x="80" y="260" text-anchor="middle">t 60</text>
  <text class="d-sub" x="200" y="260" text-anchor="middle">t 70</text>
  <text class="d-sub" x="420" y="260" text-anchor="middle">t 100</text>
  <text class="d-sub" x="560" y="260" text-anchor="middle">t 105</text>
  <text class="d-sub" x="700" y="260" text-anchor="middle">t 110</text>
  <rect class="d-box" x="40" y="40" width="200" height="60" rx="10"/>
  <text class="d-text" x="140" y="66" text-anchor="middle">W1 claims, fence 1</text>
  <text class="d-sub" x="140" y="86" text-anchor="middle">heartbeat at t 70</text>
  <rect class="d-box-muted" x="300" y="40" width="200" height="60" rx="10"/>
  <text class="d-text" x="400" y="66" text-anchor="middle">W1 stalls</text>
  <text class="d-sub" x="400" y="86" text-anchor="middle">lease ends at t 100</text>
  <rect class="d-box-accent" x="440" y="120" width="200" height="60" rx="10"/>
  <text class="d-text" x="540" y="146" text-anchor="middle">W2 fence 2 commits</text>
  <text class="d-sub" x="540" y="166" text-anchor="middle">claimed at t 101</text>
  <rect class="d-box" x="580" y="40" width="210" height="60" rx="10"/>
  <text class="d-text" x="685" y="66" text-anchor="middle">W1 commit, fence 1</text>
  <text class="d-sub" x="685" y="86" text-anchor="middle">rejected</text>
</svg>

The worker that stalled still holds fence 1, but the run row now says fence 2, so the database refuses its commit. The program plays this out:

~~~text
== 4. Lease, heartbeat, crash-like pause, fencing token ==
t=60 W1 claims report@60 attempt 1 fence 1 lease until 90
t=70 W1 heartbeat -> lease until 100
t=71 W1 stalls (long GC pause / network partition), no more heartbeats
t=85 W2 finds nothing to claim
t=101 W2 claims report@60 attempt 2 fence 2 lease until 131
t=105 W2 commit fence 2 accepted -> report@60 DONE
t=110 W1 commit fence 1 REJECTED (current fence 2)
side effects applied for report@60: 1
~~~

At t=85 the lease is still valid (the heartbeat moved it to 100), so W2 correctly finds nothing. Only after expiry does W2 take over with a higher fence.

📌 **Interview term: lease (visibility timeout)** — a claim on a run that is valid only until a deadline. The holder extends it with heartbeats; if it stops, the run becomes claimable again. SQS calls the same idea a visibility timeout.

📌 **Interview term: fencing token** — a number that increases every time the run is claimed. Every write the worker makes carries its token, and the store rejects writes with an old token. It protects against a worker that *thinks* it still holds the lease.

📌 **Interview term: at-least-once execution with idempotent handlers** — the fence protects the scheduler state, but the stalled worker may already have sent an email or called an API before it paused. No scheduler can prevent that, so the action receives the run id as an **idempotency key** and the downstream system ignores a repeat. The example keys its side effect by run id, so the count stays 1. See [idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter) and [exactly-once processing](/interview-question/exactly-once-processing-can-kafka-or-sqs-guarantee-it).

Choosing the lease length is a trade-off: short leases recover crashed runs quickly but risk false takeovers during a GC pause; long leases are safer but delay recovery. 30 seconds with a heartbeat every 10 is a common starting point, with the heartbeat interval well under the lease.

## 10. Deep Dive 3: Time Is Messy — Misfires, Overlap and the Herd

**Misfires.** The scheduler for a partition was down from t=130 to t=370 (a bad deploy). A job that runs every 60 seconds missed several firings. What should happen depends on the job, so it is a per-job policy:

~~~text
== 5. Misfire policies: job every 60s, scheduler down from t=130 to t=370 ==
missed fire times: 180,240,300,360
fire-all      -> runs 180,240,300,360; next fire 420
fire-once     -> runs 360; next fire 420
skip          -> runs none; next fire 420
deadline-30s  -> runs 360; next fire 420
~~~

| Policy | Right for | Wrong for |
| :--- | :--- | :--- |
| fire-all (catch up) | Billing per period, one report per day that must exist | Anything where a burst of catch-up runs overloads a downstream service |
| fire-once (coalesce) | Cache refresh, sync jobs: only the latest state matters | Per-period accounting |
| skip | Health pings, notifications that are useless late | Anything that must happen eventually |
| deadline | "Run if at most N seconds late": the 360 firing was 10 s late, so it ran | Jobs where lateness does not matter |

Kubernetes CronJob exposes the deadline variant as \`startingDeadlineSeconds\`: a run that cannot start within that many seconds of its scheduled time is skipped, and if it is unset there is no deadline (Kubernetes documentation, "CronJob").

📌 **Interview term: misfire policy** — the rule that decides what to do with firings whose time passed while the scheduler could not act: catch up all, run once, skip, or run only if within a deadline.

**Overlap.** A job scheduled every 5 minutes that sometimes takes 7 minutes. Kubernetes names the three choices well: \`concurrencyPolicy\` is \`Allow\` (default, runs may overlap), \`Forbid\` (skip the new run while the old one runs) or \`Replace\` (stop the old run and start the new one) (Kubernetes documentation, "CronJob"). The scheduler enforces Forbid by checking for a running run of the same job before inserting, inside the same transaction.

📌 **Interview term: overlap (concurrency) policy** — what to do when a new firing arrives while the previous run of the same job is still running.

**The top-of-the-hour herd.** Humans write \`0 * * * *\`. If 100,000 jobs all fire at second 0, the workers and every downstream system they call get hit at once. Most jobs do not care about the exact second, so the scheduler adds a stable per-job offset:

~~~text
== 2. Top-of-hour herd: 100,000 jobs, with and without jitter ==
no jitter: second 0 gets 100,000, seconds 1-59 get 0
jitter = hash(job_id) % 60: min 1,599/s, max 1,730/s
~~~

📌 **Interview term: jitter** — a deliberate offset added to a scheduled time to spread load. Using \`hash(job_id)\` rather than a random number makes the offset *stable*: the job still runs at the same second every hour, which users can rely on, and the spread stays even (1,599 to 1,730 per second here instead of 100,000 in one second).

**Time zones and daylight saving.** Store the cron expression with an IANA time zone (\`Europe/Berlin\`) and compute \`next_fire_at\` in UTC. On the spring-forward day, 02:30 local does not exist; on the fall-back day it exists twice. Decide and document the rule (common choice: run once at the first occurrence, skip a non-existent time or run it at the next valid minute), and test it.

## 11. Retries, Failures and Dead Letters

- A failed attempt moves the run back to pending with \`not_before = now + backoff(attempt)\` (exponential with jitter), so a failing endpoint is not hammered.
- After \`max_attempts\`, the run goes to \`failed\` (the dead-letter state) and alerts the job owner; it is never silently dropped.
- Retries are attempts of the *same* run id, so the idempotency key stays the same across them.
- A paused or deleted job: the scheduler checks the job \`version\` when inserting a run, so an edit made a second before a firing is respected.

When the action is "put a message on a queue", the run row insert and the message publish are a dual write; use the [outbox pattern](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure) so both happen or neither does.

## 12. What Breaks First at 10x

| At 50M jobs (about 13,900 runs per second on average) | Fix |
| :--- | :--- |
| One database for jobs and runs | Shard both by \`hash(job_id)\`; partitions map onto shards |
| Run history growth (360 GB a day at 10x) | Time-partition the runs table, drop old partitions, archive to object storage |
| Herd at popular times | Make jitter the default for new jobs; per-tenant rate limits on dispatch ([rate limiter](/interview-question/how-would-you-design-a-rate-limiter)) |
| Slow jobs holding workers | Workers only dispatch (HTTP call or enqueue) and record; heavy work runs in the team service |
| Downstream outages causing retry storms | Backoff with jitter, a circuit breaker per target, and [backpressure](/interview-question/what-is-backpressure-and-how-do-you-handle-it) from the worker pool |

## 13. Verified: Running the Code

The example **"Distributed job scheduler: capacity, unique run rows, leases with fencing tokens, misfire policies and jitter"** simulates the design in one process. A JavaScript \`Map\` (a Python \`dict\`) stands for the runs table with a unique \`run_id\`; a fake clock replaces real time; "stalls" are scripted events. What it leaves out: a real database transaction, cron parsing, time zones, the network and real worker processes.

The fencing check at the heart of it:

~~~js
function complete(t, worker, c) {
  const r = runs.get(c.id);
  if (r.fence !== c.fence) { console.log(\`t=\${t} \${worker} commit fence \${c.fence} REJECTED (current fence \${r.fence})\`); return; }
  if (!effects.has(r.id)) effects.add(r.id); // side effect keyed by run_id: idempotent
  r.state = "DONE";
}
~~~

Full output (identical in Node and Python):

~~~text
== 1. Capacity (assumptions: 5M recurring jobs, each runs hourly) ==
runs/day 120,000,000; average 1,389 runs/s
if every job fires at minute 0: 5,000,000 runs in one second
run rows/day at 300 bytes each: 36 GB

== 2. Top-of-hour herd: 100,000 jobs, with and without jitter ==
no jitter: second 0 gets 100,000, seconds 1-59 get 0
jitter = hash(job_id) % 60: min 1,599/s, max 1,730/s

== 3. Two scheduler instances fire the same tick ==
scheduler-A: INSERT report@60 -> created
scheduler-B: INSERT report@60 -> already exists, ignored

== 4. Lease, heartbeat, crash-like pause, fencing token ==
t=60 W1 claims report@60 attempt 1 fence 1 lease until 90
t=70 W1 heartbeat -> lease until 100
t=71 W1 stalls (long GC pause / network partition), no more heartbeats
t=85 W2 finds nothing to claim
t=101 W2 claims report@60 attempt 2 fence 2 lease until 131
t=105 W2 commit fence 2 accepted -> report@60 DONE
t=110 W1 commit fence 1 REJECTED (current fence 2)
side effects applied for report@60: 1

== 5. Misfire policies: job every 60s, scheduler down from t=130 to t=370 ==
missed fire times: 180,240,300,360
fire-all      -> runs 180,240,300,360; next fire 420
fire-once     -> runs 360; next fire 420
skip          -> runs none; next fire 420
deadline-30s  -> runs 360; next fire 420
~~~

## 14. Edge Cases Worth Knowing

- **Clock skew between scheduler machines**: use the database clock (\`now()\` in the query) for due checks and lease expiry, not each machine local clock.
- **A job edited between scan and insert**: compare the job version in the insert transaction; otherwise a paused job fires once more.
- **Very long one-shot delays** (a reminder in a year): keep them in the table; never hold them in memory or in a queue with a maximum delay.
- **Runs that never finish**: a lease without heartbeats expires, but a worker that heartbeats forever on a stuck run needs a maximum run time too.
- **Manual trigger while a scheduled run is running**: the overlap policy applies to manual runs as well.

## Common Pitfalls

- **Generating random run ids.** Two schedulers then create two runs for one firing; a deterministic id plus a unique constraint makes the duplicate impossible, as in the run where scheduler-B was ignored.
- **Trusting leader election alone.** A paused leader still acts; use fencing tokens on every write so an old holder is rejected (fence 1 was refused once fence 2 existed).
- **Promising exactly-once execution.** Side effects can happen before a crash; the honest design is at-least-once plus an idempotency key per run id.
- **One global misfire behaviour.** Catching up 4 missed billing runs is right; catching up 4 cache refreshes is waste. Make it per job.
- **Ignoring the top-of-the-hour herd.** The average is 1,389 runs per second but \`0 * * * *\` makes it 5,000,000 in one second; stable jitter spreads it.
- **Doing the work inside the scheduler process.** A slow job then delays every other firing; separate deciding from doing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size:</strong> <span style="color:#f0e2c8;">I ask about precision, what a job does, and duplicate tolerance. With 5M hourly jobs that is 1,389 runs per second on average, but 5M in one second if everyone uses the top of the hour, so burstiness is the real problem.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Data model:</strong> <span style="color:#f0e2c8;">Two tables: <strong style="color:#ffca28;">job definitions</strong> with an indexed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next_fire_at</code>, and <strong style="color:#ffca28;">runs</strong>, one row per firing with a deterministic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">run_id</code> of job id plus scheduled time under a unique constraint. Retries are attempts of a run.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Scheduling:</strong> <span style="color:#f0e2c8;">Scheduler instances each lease partitions of the jobs table, scan for due jobs a few seconds ahead, and in one transaction insert the run with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT DO NOTHING</code> and advance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next_fire_at</code>. A duplicate scheduler is harmless because the insert is a no-op.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Execution:</strong> <span style="color:#f0e2c8;">Workers claim runs with a <strong style="color:#ffca28;">lease</strong>, heartbeat, and write with a <strong style="color:#ffca28;">fencing token</strong>, so a stalled worker that lost its lease cannot commit. Delivery is at-least-once, so the action gets the run id as an idempotency key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Policies and scale:</strong> <span style="color:#f0e2c8;">Per-job <strong style="color:#ffca28;">misfire</strong> policy (fire all, once, skip, deadline), <strong style="color:#ffca28;">overlap</strong> policy (allow, forbid, replace), retries with backoff into a failed state, and stable <strong style="color:#ffca28;">jitter</strong> from a hash of the job id. At 10x I shard by job id and time-partition run history.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you guarantee a job runs exactly once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">I do not promise that, because a worker can perform a side effect and then crash before recording it. I guarantee exactly one <strong style="color:#ffca28;">run row</strong> per firing with a deterministic id and a unique constraint, at-least-once execution with leases and fencing, and pass the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">run_id</code> as an idempotency key so the effect happens once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the scheduler is down for five minutes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When it comes back, it finds jobs whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next_fire_at</code> is in the past and applies each job misfire policy. In the run, a job every 60 s missed 180, 240, 300 and 360: fire-all creates four runs, fire-once and a 30 s deadline create one, skip creates none, and all of them move the next fire to 420.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need a fencing token if you already have a lease?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A lease only tells the holder when it should stop; a holder in a long GC pause does not know time passed. The fence is checked by the store on every write, so when W1 came back at t=110 with fence 1 after W2 had claimed with fence 2, its commit was rejected.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get sub-second precision?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each partition owner loads the next few minutes of due jobs into an in-memory <strong style="color:#ffca28;">timing wheel</strong> and fires from it, while the database remains the source of truth and is rescanned regularly. The run row insert stays the deduplication point, so a wheel rebuilt after a crash cannot double-fire.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just put delayed messages on a queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Queues often cap the delay, cannot easily update or cancel a pending message, and do not give history or misfire control. A queue is a good way to dispatch the run once it is due, which is how I use it here.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Job definition vs run | The recurring rule vs one concrete firing of it |
| Deterministic run id | Run id computed from job id and scheduled time so duplicates collide |
| Partitioned scanning | Each scheduler owns some partitions of the jobs table and scans only those |
| Lease (visibility timeout) | A time-limited claim on a run, extended by heartbeats |
| Fencing token | A number increased on every claim; writes with an old number are rejected |
| At-least-once with idempotent handlers | Runs may execute twice, so actions dedupe by run id |
| Misfire policy | What to do with firings missed during downtime |
| Overlap (concurrency) policy | What to do when a run is still going at the next firing |
| Jitter | A stable per-job offset that spreads simultaneous firings |

**Conclusion:** A distributed job scheduler is a durable table of job definitions, a partitioned scan that turns due jobs into run rows with deterministic ids, and a pool of workers that claim runs with leases and fencing tokens. The unique run id makes duplicate schedulers harmless, the fence makes stalled workers harmless, and the idempotency key makes the unavoidable duplicate execution harmless downstream. On top sit the policies that real users need: misfire handling after outages, overlap rules, retries into a failed state, and jitter that turns 5,000,000 firings in one second into fewer than 1,800 per second.`,
    examples: [
      {
        label: `Distributed job scheduler: capacity, unique run rows, leases with fencing tokens, misfire policies and jitter`,
        variants: [
          { tech: "node", code: `// Distributed job scheduler, simulated in one process with a fake clock.
// The Map "runs" stands for a database table with a UNIQUE run_id column.
const fmt = (n) => Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");

console.log("== 1. Capacity (assumptions: 5M recurring jobs, each runs hourly) ==");
const jobs = 5_000_000, runsPerDay = jobs * 24;
console.log(\`runs/day \${fmt(runsPerDay)}; average \${fmt(runsPerDay / 86400)} runs/s\`);
console.log(\`if every job fires at minute 0: \${fmt(jobs)} runs in one second\`);
console.log(\`run rows/day at 300 bytes each: \${fmt(runsPerDay * 300 / 1e9)} GB\`);

console.log("\\n== 2. Top-of-hour herd: 100,000 jobs, with and without jitter ==");
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
const perSec = new Array(60).fill(0);
for (let i = 0; i < 100000; i++) perSec[fnv1a("job-" + i) % 60]++;
console.log("no jitter: second 0 gets 100,000, seconds 1-59 get 0");
console.log(\`jitter = hash(job_id) % 60: min \${fmt(Math.min(...perSec))}/s, max \${fmt(Math.max(...perSec))}/s\`);

console.log("\\n== 3. Two scheduler instances fire the same tick ==");
const runs = new Map();
function createRun(who, job, at) {
  const id = \`\${job}@\${at}\`;
  if (runs.has(id)) { console.log(\`\${who}: INSERT \${id} -> already exists, ignored\`); return; }
  runs.set(id, { id, state: "PENDING", owner: null, leaseUntil: 0, fence: 0, attempt: 0 });
  console.log(\`\${who}: INSERT \${id} -> created\`);
}
createRun("scheduler-A", "report", 60);
createRun("scheduler-B", "report", 60);

console.log("\\n== 4. Lease, heartbeat, crash-like pause, fencing token ==");
const LEASE = 30;
const effects = new Set();
function claim(t, worker) {
  for (const r of runs.values()) {
    const free = r.state === "PENDING" || (r.state === "RUNNING" && r.leaseUntil <= t);
    if (!free) continue;
    r.state = "RUNNING"; r.owner = worker; r.leaseUntil = t + LEASE; r.fence++; r.attempt++;
    console.log(\`t=\${t} \${worker} claims \${r.id} attempt \${r.attempt} fence \${r.fence} lease until \${r.leaseUntil}\`);
    return { id: r.id, fence: r.fence };
  }
  console.log(\`t=\${t} \${worker} finds nothing to claim\`);
  return null;
}
function heartbeat(t, worker, c) {
  const r = runs.get(c.id);
  if (r.fence !== c.fence) { console.log(\`t=\${t} \${worker} heartbeat rejected (fence \${c.fence} != \${r.fence})\`); return; }
  r.leaseUntil = t + LEASE;
  console.log(\`t=\${t} \${worker} heartbeat -> lease until \${r.leaseUntil}\`);
}
function complete(t, worker, c) {
  const r = runs.get(c.id);
  if (r.fence !== c.fence) { console.log(\`t=\${t} \${worker} commit fence \${c.fence} REJECTED (current fence \${r.fence})\`); return; }
  if (!effects.has(r.id)) effects.add(r.id); // side effect keyed by run_id: idempotent
  r.state = "DONE";
  console.log(\`t=\${t} \${worker} commit fence \${c.fence} accepted -> \${r.id} DONE\`);
}
const c1 = claim(60, "W1");
heartbeat(70, "W1", c1);
console.log("t=71 W1 stalls (long GC pause / network partition), no more heartbeats");
claim(85, "W2");
const c2 = claim(101, "W2");
complete(105, "W2", c2);
complete(110, "W1", c1);
console.log(\`side effects applied for report@60: \${[...effects].filter((e) => e === "report@60").length}\`);

console.log("\\n== 5. Misfire policies: job every 60s, scheduler down from t=130 to t=370 ==");
const lastFired = 120, every = 60, now = 370;
const missed = [];
for (let t = lastFired + every; t <= now; t += every) missed.push(t);
console.log(\`missed fire times: \${missed.join(",")}\`);
const policies = {
  "fire-all": missed,
  "fire-once": missed.slice(-1),
  "skip": [],
  "deadline-30s": missed.filter((t) => now - t <= 30),
};
for (const [name, list] of Object.entries(policies))
  console.log(\`\${name.padEnd(13)} -> runs \${list.length ? list.join(",") : "none"}; next fire \${missed[missed.length - 1] + every}\`);` },
          { tech: "python", code: `# Distributed job scheduler, simulated in one process with a fake clock.
# The dict "runs" stands for a database table with a UNIQUE run_id column.


def fmt(n):
    return f"{round(n):,}"


print("== 1. Capacity (assumptions: 5M recurring jobs, each runs hourly) ==")
jobs = 5_000_000
runs_per_day = jobs * 24
print(f"runs/day {fmt(runs_per_day)}; average {fmt(runs_per_day / 86400)} runs/s")
print(f"if every job fires at minute 0: {fmt(jobs)} runs in one second")
print(f"run rows/day at 300 bytes each: {fmt(runs_per_day * 300 / 1e9)} GB")

print("\\n== 2. Top-of-hour herd: 100,000 jobs, with and without jitter ==")


def fnv1a(s):
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


per_sec = [0] * 60
for i in range(100000):
    per_sec[fnv1a("job-" + str(i)) % 60] += 1
print("no jitter: second 0 gets 100,000, seconds 1-59 get 0")
print(f"jitter = hash(job_id) % 60: min {fmt(min(per_sec))}/s, max {fmt(max(per_sec))}/s")

print("\\n== 3. Two scheduler instances fire the same tick ==")
runs = {}


def create_run(who, job, at):
    rid = f"{job}@{at}"
    if rid in runs:
        print(f"{who}: INSERT {rid} -> already exists, ignored")
        return
    runs[rid] = {"id": rid, "state": "PENDING", "owner": None, "lease_until": 0, "fence": 0, "attempt": 0}
    print(f"{who}: INSERT {rid} -> created")


create_run("scheduler-A", "report", 60)
create_run("scheduler-B", "report", 60)

print("\\n== 4. Lease, heartbeat, crash-like pause, fencing token ==")
LEASE = 30
effects = set()


def claim(t, worker):
    for r in runs.values():
        free = r["state"] == "PENDING" or (r["state"] == "RUNNING" and r["lease_until"] <= t)
        if not free:
            continue
        r["state"] = "RUNNING"; r["owner"] = worker; r["lease_until"] = t + LEASE
        r["fence"] += 1; r["attempt"] += 1
        print(f"t={t} {worker} claims {r['id']} attempt {r['attempt']} fence {r['fence']} lease until {r['lease_until']}")
        return {"id": r["id"], "fence": r["fence"]}
    print(f"t={t} {worker} finds nothing to claim")
    return None


def heartbeat(t, worker, c):
    r = runs[c["id"]]
    if r["fence"] != c["fence"]:
        print(f"t={t} {worker} heartbeat rejected (fence {c['fence']} != {r['fence']})")
        return
    r["lease_until"] = t + LEASE
    print(f"t={t} {worker} heartbeat -> lease until {r['lease_until']}")


def complete(t, worker, c):
    r = runs[c["id"]]
    if r["fence"] != c["fence"]:
        print(f"t={t} {worker} commit fence {c['fence']} REJECTED (current fence {r['fence']})")
        return
    effects.add(r["id"])  # side effect keyed by run_id: idempotent
    r["state"] = "DONE"
    print(f"t={t} {worker} commit fence {c['fence']} accepted -> {r['id']} DONE")


c1 = claim(60, "W1")
heartbeat(70, "W1", c1)
print("t=71 W1 stalls (long GC pause / network partition), no more heartbeats")
claim(85, "W2")
c2 = claim(101, "W2")
complete(105, "W2", c2)
complete(110, "W1", c1)
print(f"side effects applied for report@60: {len([e for e in effects if e == 'report@60'])}")

print("\\n== 5. Misfire policies: job every 60s, scheduler down from t=130 to t=370 ==")
last_fired, every, now = 120, 60, 370
missed = list(range(last_fired + every, now + 1, every))
print(f"missed fire times: {','.join(map(str, missed))}")
policies = {
    "fire-all": missed,
    "fire-once": missed[-1:],
    "skip": [],
    "deadline-30s": [t for t in missed if now - t <= 30],
}
for name, lst in policies.items():
    shown = ",".join(map(str, lst)) if lst else "none"
    print(f"{name:<13} -> runs {shown}; next fire {missed[-1] + every}")` },
        ],
      },
    ],
  },
  {
    title: `How would you design AI inference infra with GPU queue and KV-cache?`,
    difficulty: "hard",
    seoDescription: `Design LLM inference infra: GPU capacity math, token-aware queueing, continuous batching, paged KV-cache admission, prefix-aware routing and autoscaling.`,
    description: `**Question presented to candidate:**
"We are launching a chat and API product on top of a 70-billion-parameter open model that we host ourselves on GPUs. Expect around 20 million requests a day, with long system prompts and streamed answers. Design the serving infrastructure: how requests are queued, how GPUs are used efficiently, how the KV-cache fits in, and how it scales."

**What a strong answer should cover:**
- GPU capacity math: weights size, **KV-cache bytes per token**, how many tokens fit beside the weights, and why decode is memory-bandwidth bound
- The latency metrics that matter: **time to first token** (prefill) and **time per output token** (decode), and the throughput versus latency trade-off of batch size
- A **token-aware queue** in front of the GPUs: admission by estimated tokens, priority classes, per-tenant fairness, deadlines and load shedding instead of unbounded queues
- **Continuous batching** inside each replica and **paged KV-cache** allocation, versus static batching and reserving maximum context per request
- **Prefix-aware routing** so requests sharing a system prompt land where its KV-cache already is, balanced against load; autoscaling on queue depth and KV usage with slow cold starts

**Clarifying questions expected:**
- Which model and context length, and is quantization acceptable?
- What latency targets: time to first token and tokens per second per user? Interactive only, or also offline batch traffic?
- How much of each prompt is shared (system prompts, documents, multi-turn history)?

**Code / implementation expected:** Optional — the example works the GPU capacity numbers, simulates static versus continuous batching, compares KV reservation with paged allocation, and compares three routing policies for prefix-cache hits.`,
    answer: `**Target Audience:** Engineers preparing for a system design round who may never have served a model. GPUs, tokens, prefill, decode and the KV-cache are explained from zero.
**Difficulty:** Hard
**Verified with:** Node 22 and Python 3.12 (identical output). Paper and product facts (Orca, vLLM, model shapes, GPU memory) are cited inline, checked in October 2026; throughput per node is an **assumption**, stated as such.

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts with the words an interviewer expects. All numbers come from the example program and are quoted in full in the **Verified** section. The KV-cache itself (what it stores, why it is valid, how prefix caching hashes blocks) has its own page: [what the KV-cache is and how prefix caching works](/interview-question/what-is-kv-cache-and-how-does-prefix-caching-speed-up-llm-inference). This page is about the **fleet** around it.

## 1. Why This Even Matters — A Story First

Picture a very expensive espresso machine with eight group heads, in a café with a queue out of the door. The machine costs more than the building, so the owner cares about one thing: are all eight heads always pulling shots?

Three habits waste it. Making a whole round of eight drinks and refusing to start the next until the slowest one is done (a big latte holds up seven espressos). Reserving a giant cup for every customer "in case they want a large", so the counter fills with empty cups. And sending the regular who always orders the same complicated drink to a barista who has never made it, when the one next to them already has the syrups out.

LLM serving is that café. GPUs are the machine, **continuous batching** fixes the first habit, **paged KV-cache** the second, and **prefix-aware routing** the third. The queue in front decides who waits and who is turned away politely.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which model, which context length, which precision? | Sets weights size and KV bytes per token, hence GPUs per replica |
| Latency targets for first token and per token? | Bounds the batch size; big batches raise throughput but slow each user |
| Request volume, prompt and output lengths, peak factor? | Gives tokens per second, the real unit of load |
| How much prompt is shared across requests? | Decides how much prefix caching and cache-aware routing can save |
| Interactive only, or also offline batch jobs? | Offline work can fill idle GPU time at low priority |
| Multi-tenant with paid tiers? | Needs priority classes, fairness and per-tenant token limits |

## 3. Requirements

**Functional**: an OpenAI-style chat completion API with streaming; system prompts and multi-turn history; per-tenant API keys, quotas and usage metering; cancellation when the client disconnects.

**Non-functional**: time to first token under about a second at p95 for interactive traffic; steady streaming speed; no request waits forever (bounded queue, clear 429 or 503); high GPU utilisation, because GPUs dominate cost; graceful behaviour under overload.

## 4. Capacity Estimate

Assumptions: a 70B model in BF16 (2 bytes per parameter) with the Llama 3 70B shape: 80 layers, 8 key-value heads, head dimension 128 (from the published model config, mirrored on Hugging Face). One serving node is 8 GPUs of 80 GB (the H100 SXM has 80 GB of HBM3 at about 3.35 TB/s according to vendor spec listings; I could not open NVIDIA own datasheet, so treat the bandwidth as approximate). Traffic: 20M requests a day, 1,500 prompt tokens and 300 output tokens each, peak 3x average.

~~~text
== 1. Capacity (assumed: 70B model in BF16, 80 layers, 8 KV heads, head dim 128) ==
weights 140 GB; KV cache 327,680 bytes per token
8 x 80 GB node, 90% usable: 436 GB left for KV = 1,330,566 tokens
decode floor: read all weights once per step = 5.22 ms per step
demand at 3x peak: 208,333 output tok/s, 1,041,667 prompt tok/s
assumed node rate 5,120 output tok/s -> 41 nodes for decode
prompt tokens to compute with a 60% prefix-cache hit rate: 416,667 tok/s
~~~

| What the numbers say | Consequence |
| :--- | :--- |
| 140 GB of weights on 640 GB of GPU memory | The model must be split across GPUs (tensor parallelism); a replica is a whole node |
| 320 KiB of KV-cache per token, 1.33M tokens of room | KV memory, not compute, limits how many conversations run at once |
| 5.22 ms minimum per decode step | Each step reads every weight once; batching many sequences into one step is how throughput is bought |
| 41 nodes at an assumed 5,120 tok/s each | The fleet size; 328 GPUs, so every percent of utilisation is real money |
| 1.04M prompt tokens/s, 417k after prefix hits | Prefix caching directly removes prefill work |

The 5,120 tokens per second per node is an assumption (a batch of 128 sequences at 25 ms per step), not a measurement. In a real design you benchmark the engine on your hardware with your prompt lengths, and size from that number.

📌 **Interview term: prefill vs decode** — **prefill** processes the whole prompt in one parallel pass and produces the first token; it is compute-bound and decides **time to first token (TTFT)**. **Decode** then produces one token per step for each sequence; it is memory-bandwidth-bound and decides **time per output token (TPOT)**, also called inter-token latency.

📌 **Interview term: KV-cache** — the keys and values the attention layers computed for every earlier token, kept in GPU memory so each new token does not recompute them. Size per token = 2 x layers x KV heads x head dimension x bytes. Mechanism details are on [the KV-cache page](/interview-question/what-is-kv-cache-and-how-does-prefix-caching-speed-up-llm-inference).

## 5. API

~~~http
POST /v1/chat/completions
  { model, messages: [...], max_tokens: 300, stream: true, priority: "interactive" | "batch" }
  -> text/event-stream: data: { delta: "..." } ... data: [DONE]
     429 { retry_after_ms }   tenant over its token budget
     503 { retry_after_ms }   fleet overloaded, request shed before it used a GPU
GET  /v1/usage?tenant=...    -> { prompt_tokens, cached_prompt_tokens, output_tokens }
~~~

Streaming is server-sent events; see [streaming LLM responses](/interview-question/how-does-streaming-work-in-llm-apis-and-why-does-it-matter-for-ux). A disconnect must cancel the sequence in the engine so its KV blocks are freed.

## 6. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 880 340" role="img" aria-label="Clients call a gateway for auth and token rate limits, then a token-aware queue and router, which sends work to model replicas. Each replica runs an engine with continuous batching and a paged KV cache. An autoscaler watches queue depth and KV usage.">
  <defs>
    <marker id="sd19q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="50" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="82" text-anchor="middle">clients</text>
  <text class="d-sub" x="80" y="104" text-anchor="middle">SSE stream</text>
  <rect class="d-box" x="200" y="50" width="150" height="70" rx="10"/>
  <text class="d-text" x="275" y="82" text-anchor="middle">gateway</text>
  <text class="d-sub" x="275" y="104" text-anchor="middle">auth, token limits</text>
  <rect class="d-box-accent" x="410" y="50" width="170" height="70" rx="10"/>
  <text class="d-text" x="495" y="82" text-anchor="middle">queue and router</text>
  <text class="d-sub" x="495" y="104" text-anchor="middle">priority, prefix aware</text>
  <rect class="d-box" x="650" y="20" width="210" height="60" rx="10"/>
  <text class="d-text" x="755" y="46" text-anchor="middle">replica 1</text>
  <text class="d-sub" x="755" y="66" text-anchor="middle">8 GPUs, batching</text>
  <rect class="d-box" x="650" y="110" width="210" height="60" rx="10"/>
  <text class="d-text" x="755" y="136" text-anchor="middle">replica 2</text>
  <text class="d-sub" x="755" y="156" text-anchor="middle">paged KV cache</text>
  <rect class="d-box-muted" x="410" y="230" width="170" height="70" rx="10"/>
  <text class="d-text" x="495" y="262" text-anchor="middle">autoscaler</text>
  <text class="d-sub" x="495" y="284" text-anchor="middle">queue depth, KV use</text>
  <rect class="d-box-muted" x="650" y="230" width="210" height="70" rx="10"/>
  <text class="d-text" x="755" y="262" text-anchor="middle">weights store</text>
  <text class="d-sub" x="755" y="284" text-anchor="middle">loaded at start</text>
  <line class="d-edge" x1="140" y1="85" x2="196" y2="85" marker-end="url(#sd19q2-arrow)"/>
  <line class="d-edge" x1="350" y1="85" x2="406" y2="85" marker-end="url(#sd19q2-arrow)"/>
  <line class="d-edge-accent" x1="580" y1="75" x2="646" y2="52" marker-end="url(#sd19q2-arrow)"/>
  <line class="d-edge-accent" x1="580" y1="95" x2="646" y2="138" marker-end="url(#sd19q2-arrow)"/>
  <line class="d-edge-dashed" x1="495" y1="226" x2="495" y2="124" marker-end="url(#sd19q2-arrow)"/>
  <line class="d-edge-dashed" x1="755" y1="226" x2="755" y2="174" marker-end="url(#sd19q2-arrow)"/>
</svg>

The gateway authenticates and enforces per-tenant token budgets; the queue and router decide which request goes next and to which replica; each replica is a whole GPU node running an inference engine; the autoscaler adds replicas, which load weights from storage before taking traffic.

- **Gateway**: API keys, per-tenant limits counted in **tokens**, not requests (one request can be 100 or 100,000 tokens). Builds on [rate limiter design](/interview-question/how-would-you-design-a-rate-limiter).
- **Queue and router**: a central component (or a few, sharded by tenant) that holds requests until a replica can admit them. It knows each replica state: running sequences, free KV blocks, which prefixes are cached.
- **Replica**: one engine process (for example vLLM or SGLang) over tensor-parallel GPUs; it runs continuous batching and manages KV memory in blocks.
- **Autoscaler**: scales on queue wait time and KV utilisation, not CPU.

## 7. Deep Dive 1: The Queue in Front of the GPUs

A GPU replica can only admit a request when it has KV memory for it. When it does not, the request waits somewhere, and the question is where and for how long.

- **Hold requests in the router, not inside replicas.** If each replica had its own deep queue, a request could sit behind a slow replica while another is idle. A central queue lets the next free replica take the next request.
- **Admit by tokens.** The cost of a request is roughly its prompt length (prefill) plus expected output (decode and KV growth). The router admits a request to a replica only if \`prompt_tokens + max_tokens\` worth of KV blocks is likely available, or the engine is allowed to preempt.
- **Priority classes.** Interactive traffic first; offline batch jobs (evaluations, document summarisation) fill the gaps and are preempted first. This keeps GPUs busy at night without hurting daytime latency; see [batch APIs](/interview-question/when-should-you-use-batch-apis-instead-of-real-time-llm-calls).
- **Fairness.** One tenant sending 10,000 requests must not starve everyone: per-tenant sub-queues served round-robin or by weighted fair queueing on tokens.
- **Deadlines and shedding.** A request that has already waited longer than its TTFT target is unlikely to be useful; reject it early with a 503 and \`retry_after\`, before it uses a GPU. An unbounded queue just converts overload into timeouts for everyone; see [backpressure](/interview-question/what-is-backpressure-and-how-do-you-handle-it).

📌 **Interview term: token-aware admission control** — deciding whether to start a request based on its token cost and the free KV memory of a replica, rather than on a fixed count of concurrent requests.

📌 **Interview term: goodput** — throughput counted only for requests that met their latency targets. Packing GPUs so full that TTFT blows past the target raises raw throughput and lowers goodput.

## 8. Deep Dive 2: Batching and KV Memory Inside a Replica

**Static vs continuous batching.** Eight requests with output lengths 5, 40, 8, 12, 30, 6, 20 and 10 tokens, and room for four at a time:

~~~text
== 2. Static vs continuous batching (8 requests, 4 slots) ==
static     finish steps 5,40,8,12,70,46,60,50
           total 70 steps, mean latency 36.38 steps, slot use 46.8%
continuous finish steps 5,40,8,12,35,14,32,24
           total 40 steps, mean latency 21.25 steps, slot use 81.9%
~~~

With static batching the second group cannot start until the 40-token request finishes, so the 6-token request completes at step 46. With continuous batching a free slot is refilled at the very next step, the whole set finishes in 40 steps instead of 70 and the mean latency drops from 36.38 to 21.25 steps.

📌 **Interview term: continuous batching (iteration-level scheduling)** — the engine re-forms the batch at every decode step: finished sequences leave and waiting ones join immediately. It was introduced as iteration-level scheduling in the Orca paper (Yu et al., OSDI 2022), which reported large throughput gains over request-level batching on GPT-3 175B; engines such as vLLM call it continuous batching.

**Reserving vs paging KV memory.** If each request reserved KV room for the maximum context, most of it would sit empty:

~~~text
== 3. KV admission: reserve max context vs paged blocks of 16 tokens ==
reserve 8192 tokens each: 162 concurrent sequences
paged, 113 blocks for 1800 tokens: 735 concurrent sequences
~~~

📌 **Interview term: paged KV-cache (PagedAttention)** — KV memory is split into fixed-size blocks (16 tokens in this example) handed out as a sequence grows, like pages of virtual memory, so a request uses only what it actually needs. The vLLM paper (Kwon et al., SOSP 2023, "Efficient Memory Management for Large Language Model Serving with PagedAttention") describes near-zero KV waste and 2-4x throughput over earlier systems at the same latency. In this example the same memory holds 735 sequences instead of 162.

Paging lets the engine over-commit: it admits more sequences than would fit if all reached \`max_tokens\`. When memory runs out mid-generation, it **preempts** a sequence (frees its blocks and later recomputes or swaps them back). The router should watch preemption rate: if it climbs, admit less.

**Batch size is a dial, not a constant.** Decode reads all weights once per step (5.22 ms minimum here), regardless of how many sequences are in the batch, so a bigger batch gives more tokens per second per GPU. But each step also reads every active sequence KV-cache, and long prompts in prefill take compute, so very large batches slow every user down. Pick the batch limit from your TPOT target, measured.

📌 **Interview term: chunked prefill** — splitting a long prompt prefill into chunks interleaved with decode steps, so a 100,000-token prompt does not freeze token streaming for everyone else in the batch. Some deployments go further and run prefill and decode on separate GPU pools (**disaggregated prefill**), at the cost of moving KV-cache between them.

## 9. Deep Dive 3: Prefix-Aware Routing and Autoscaling

Prefix caching only helps if a request reaches a replica that already holds its prefix. Twelve requests, tenant A hot (8 of 12), each with a 2,000-token system prompt and a 100-token user message, across three replicas:

~~~text
== 4. Routing 12 requests to 3 replicas (system prompt 2,000 tokens, user part 100) ==
round-robin        prefill tokens 15,200 of 25,200 (saved 39.7%), load 4/4/4
prefix-hash        prefill tokens 7,200 of 25,200 (saved 71.4%), load 2/8/2
prefix+load-aware  prefill tokens 9,200 of 25,200 (saved 63.5%), load 5/4/3
~~~

- **Round-robin** spreads load perfectly but copies every system prompt to every replica: only 39.7% of prompt tokens are saved.
- **Pure prefix hashing** (route by a hash of the prefix, like [consistent hashing](/interview-question/what-is-consistent-hashing)) saves the most, 71.4%, but the hot tenant puts 8 of 12 requests on one replica.
- **Prefix-aware with a load cap** prefers a replica with the prefix unless it is 2 requests ahead of the least-loaded one; it pays one extra prefill (63.5% saved) and keeps load at 5/4/3.

📌 **Interview term: prefix-aware (cache-aware) routing** — choosing a replica by where the request prefix KV-cache already lives, balanced against replica load, because a cache hit removes prefill work and cuts time to first token.

**Autoscaling.** Signals that work: queue wait time against the TTFT target, KV-cache utilisation, and preemption rate. CPU or request count does not work. The hard part is the cold start: a new replica must get GPUs, start the engine and load 140 GB of weights before it serves anything. As an illustration, at an assumed 2 GB/s from storage that is 70 seconds of loading alone; measure your own. So keep headroom, scale on leading signals (queue growth), keep weights cached on local disk of warm nodes, and shed or downgrade (smaller model, shorter \`max_tokens\`) during the minutes it takes.

**Failure handling.** A replica crash loses the KV-cache of its running sequences. Streams that already sent tokens either fail with a clear error or are retried from the start on another replica with the partial output dropped; idempotent retries at the client are covered in [resilient LLM calls](/interview-question/how-do-you-build-resilient-llm-calls-with-rate-limits-retries-and-fallbacks). Health checks must test a real tiny generation, not just that the process is up.

## 10. What Breaks First at 10x

| At 200M requests a day | Fix |
| :--- | :--- |
| GPU count (about 407 nodes at the same assumptions) | Quantize weights and KV (FP8 halves KV bytes per token), speculative decoding, smaller models for easy requests |
| Central queue and router | Shard routers by tenant or by prefix hash; each holds a view of replica state |
| Cold starts during spikes | Pre-warmed pool, weights on local NVMe, batch traffic as a buffer that can be dropped |
| Long-context requests hogging KV | Separate pool for long context, chunked prefill, per-tenant KV quotas |
| Prefix cache thrash | Cache-aware routing, larger KV pool, offload cold prefix blocks to CPU memory |

## 11. Verified: Running the Code

The example **"LLM serving fleet: GPU capacity math, static vs continuous batching, paged KV admission and prefix-aware routing"** is a simulation: one "step" is one decode iteration of an imaginary GPU, a replica cache is a set of tenant names, and the node throughput is the stated assumption. What it leaves out: real kernels, prefill time, preemption, network and timing.

The heart of continuous batching is refilling slots every step:

~~~js
while (next < lens.length || slots.length) {
  while (slots.length < 4 && next < lens.length) { slots.push({ i: next, left: lens[next] }); next++; }
  t++;
  for (const s of slots) s.left--;
  ...
}
~~~

Full output (identical in Node and Python):

~~~text
== 1. Capacity (assumed: 70B model in BF16, 80 layers, 8 KV heads, head dim 128) ==
weights 140 GB; KV cache 327,680 bytes per token
8 x 80 GB node, 90% usable: 436 GB left for KV = 1,330,566 tokens
decode floor: read all weights once per step = 5.22 ms per step
demand at 3x peak: 208,333 output tok/s, 1,041,667 prompt tok/s
assumed node rate 5,120 output tok/s -> 41 nodes for decode
prompt tokens to compute with a 60% prefix-cache hit rate: 416,667 tok/s

== 2. Static vs continuous batching (8 requests, 4 slots) ==
static     finish steps 5,40,8,12,70,46,60,50
           total 70 steps, mean latency 36.38 steps, slot use 46.8%
continuous finish steps 5,40,8,12,35,14,32,24
           total 40 steps, mean latency 21.25 steps, slot use 81.9%

== 3. KV admission: reserve max context vs paged blocks of 16 tokens ==
reserve 8192 tokens each: 162 concurrent sequences
paged, 113 blocks for 1800 tokens: 735 concurrent sequences

== 4. Routing 12 requests to 3 replicas (system prompt 2,000 tokens, user part 100) ==
round-robin        prefill tokens 15,200 of 25,200 (saved 39.7%), load 4/4/4
prefix-hash        prefill tokens 7,200 of 25,200 (saved 71.4%), load 2/8/2
prefix+load-aware  prefill tokens 9,200 of 25,200 (saved 63.5%), load 5/4/3
~~~

## 12. Edge Cases Worth Knowing

- **Client disconnects mid-stream**: cancel the sequence in the engine, or its KV blocks stay busy until \`max_tokens\`.
- **\`max_tokens\` far above real output**: admission by \`max_tokens\` is pessimistic; track actual output length per tenant and admit by an estimate, relying on preemption as the safety net.
- **One huge prompt**: a 128k-token prompt is 40 GiB of KV at 320 KiB per token; give long context its own limits or pool.
- **Model version rollout**: a new model version cannot reuse the old KV-cache; roll out replica by replica and route a tenant consistently to one version.
- **Tenant isolation**: prefix caches are shared memory; key cached blocks so one tenant never gets another tenant prefix hit, and treat cache-timing side channels seriously.

## Common Pitfalls

- **Sizing by requests per second.** Load is tokens: prompt tokens drive prefill, output tokens drive decode and KV growth.
- **Static batching.** In the run it took 70 steps instead of 40 and left the slot use at 46.8%.
- **Reserving maximum context per request.** 162 sequences instead of 735 in the same memory.
- **Round-robin routing with long shared prompts.** It saved only 39.7% of prompt tokens against 71.4% with prefix routing.
- **Pure cache affinity without a load cap.** The hot tenant put 8 of 12 requests on one replica.
- **Unbounded queues and CPU-based autoscaling.** Shed early with \`retry_after\`, and scale on queue wait, KV use and preemption.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size in tokens:</strong> <span style="color:#f0e2c8;">Model, context length and latency targets first. A 70B BF16 model is 140 GB of weights, and with 80 layers and 8 KV heads each token costs 320 KiB of <strong style="color:#ffca28;">KV-cache</strong>, so an 8 x 80 GB node holds about 1.33M tokens of KV. At 20M requests a day the peak is about 208k output tokens per second.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two phases, two metrics:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Prefill</strong> processes the prompt and sets time to first token; <strong style="color:#ffca28;">decode</strong> emits one token per step, is memory-bandwidth bound, and sets time per token. Every design choice trades between them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Queue and admission:</strong> <span style="color:#f0e2c8;">A central, token-aware queue holds requests and admits one to a replica only when it has KV room. Priority classes, per-tenant fairness, deadlines and early shedding with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">retry_after</code> instead of an unbounded queue.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Inside the replica:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Continuous batching</strong> refills slots every step (40 steps instead of 70 in my simulation) and <strong style="color:#ffca28;">paged KV-cache</strong> allocates 16-token blocks as sequences grow (735 sequences instead of 162). Chunked prefill keeps long prompts from stalling streams.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Routing and scaling:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Prefix-aware routing</strong> with a load cap sends requests to the replica holding their system prompt, saving 63.5% of prompt tokens with balanced load. Autoscale on queue wait, KV use and preemption, keep warm headroom because loading 140 GB of weights is slow.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is decode memory-bandwidth bound?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each decode step produces one token per sequence but must read every weight from GPU memory once: 140 GB across 8 GPUs at about 3.35 TB/s each is at least 5.22 ms per step. Arithmetic per byte read is tiny, so batching more sequences into the same step is how you get more tokens per second.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you decide how many requests a replica can run at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By KV memory, not a fixed number. Free KV blocks divided by the expected tokens per sequence, with over-commit because most requests stop well before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code>, and preemption as the safety valve. I watch preemption rate and TPOT and lower admission if either degrades.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if one tenant sends a burst of long prompts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Token-based rate limits at the gateway first. In the queue, per-tenant sub-queues served fairly so the burst only delays that tenant. Long prompts can go to a long-context pool and use chunked prefill so they do not freeze other streams.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a traffic spike bigger than the fleet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">New replicas take minutes because of GPU allocation and weight loading, so the first response is shedding: reject the lowest priority with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">retry_after</code>, pause batch traffic, and optionally cap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code> or route easy requests to a smaller model. Then scale on the queue growth signal and pre-warm a pool for known peaks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does prefix caching change how you bill?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It changes cost, so many providers discount cached prompt tokens; Anthropic for example bills cache reads at 0.1x the base input price and 5-minute cache writes at 1.25x (Anthropic docs, prompt caching). Internally, meter <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cached_prompt_tokens</code> separately so tenants see the benefit and capacity planning uses the computed tokens.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Prefill vs decode | Parallel pass over the prompt vs one token per step; TTFT vs TPOT |
| KV-cache | Stored attention keys and values of earlier tokens |
| Token-aware admission control | Admitting by token cost and free KV memory |
| Goodput | Throughput of requests that met their latency targets |
| Continuous batching | Re-forming the batch at every decode step |
| Paged KV-cache (PagedAttention) | KV memory handed out in fixed-size blocks as sequences grow |
| Chunked prefill | Splitting a long prefill into chunks interleaved with decode |
| Prefix-aware routing | Routing to the replica that already caches the prompt prefix, balanced by load |

**Conclusion:** LLM serving infrastructure is a memory-management problem wearing a queueing problem as a coat. Measure load in tokens; know that a 70B model leaves room for about 1.33M tokens of KV-cache per node and that decode is bound by reading 140 GB of weights per step. Put a token-aware, fair, bounded queue in front; run continuous batching over a paged KV-cache inside each replica; route by prefix with a load cap so shared prompts are computed once; and autoscale on queue wait and KV pressure with enough warm headroom to survive slow cold starts.`,
    examples: [
      {
        label: `LLM serving fleet: GPU capacity math, static vs continuous batching, paged KV admission and prefix-aware routing`,
        variants: [
          { tech: "node", code: `// LLM inference fleet: capacity math, static vs continuous batching, paged KV admission,
// and prefix-aware routing. GPUs are simulated: one "step" = one decode iteration.
const fmt = (n) => Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");

console.log("== 1. Capacity (assumed: 70B model in BF16, 80 layers, 8 KV heads, head dim 128) ==");
const weights = 70e9 * 2;
const kvPerToken = 2 * 80 * 8 * 128 * 2; // K and V, layers, kv heads, head dim, 2 bytes
const node = 8 * 80e9, usable = node * 0.9;
const kvBytes = usable - weights;
const kvTokens = Math.floor(kvBytes / kvPerToken);
console.log(\`weights \${fmt(weights / 1e9)} GB; KV cache \${fmt(kvPerToken)} bytes per token\`);
console.log(\`8 x 80 GB node, 90% usable: \${fmt(kvBytes / 1e9)} GB left for KV = \${fmt(kvTokens)} tokens\`);
const stepFloorMs = weights / (8 * 3.35e12) * 1000;
console.log(\`decode floor: read all weights once per step = \${stepFloorMs.toFixed(2)} ms per step\`);
const reqDay = 20e6, inTok = 1500, outTok = 300, peak = 3;
const outPeak = reqDay * outTok / 86400 * peak, inPeak = reqDay * inTok / 86400 * peak;
const perNode = 128 / 0.025; // assumed: batch 128 at 25 ms per step
console.log(\`demand at 3x peak: \${fmt(outPeak)} output tok/s, \${fmt(inPeak)} prompt tok/s\`);
console.log(\`assumed node rate \${fmt(perNode)} output tok/s -> \${Math.ceil(outPeak / perNode)} nodes for decode\`);
console.log(\`prompt tokens to compute with a 60% prefix-cache hit rate: \${fmt(inPeak * 0.4)} tok/s\`);

console.log("\\n== 2. Static vs continuous batching (8 requests, 4 slots) ==");
const lens = [5, 40, 8, 12, 30, 6, 20, 10];
function staticBatching() {
  const done = []; let t = 0;
  for (let i = 0; i < lens.length; i += 4) {
    const batch = lens.slice(i, i + 4);
    for (const l of batch) done.push(t + l);
    t += Math.max(...batch); // the batch holds its slots until the longest finishes
  }
  return { done, steps: t };
}
function continuousBatching() {
  const done = new Array(lens.length).fill(0); const slots = []; let next = 0, t = 0;
  while (next < lens.length || slots.length) {
    while (slots.length < 4 && next < lens.length) { slots.push({ i: next, left: lens[next] }); next++; }
    t++;
    for (const s of slots) s.left--;
    for (const s of slots) if (s.left === 0) done[s.i] = t;
    for (let k = slots.length - 1; k >= 0; k--) if (slots[k].left === 0) slots.splice(k, 1);
  }
  return { done, steps: t };
}
const work = lens.reduce((a, b) => a + b, 0);
for (const [name, r] of [["static", staticBatching()], ["continuous", continuousBatching()]]) {
  const avg = r.done.reduce((a, b) => a + b, 0) / r.done.length;
  console.log(\`\${name.padEnd(10)} finish steps \${r.done.join(",")}\`);
  console.log(\`\${"".padEnd(10)} total \${r.steps} steps, mean latency \${avg.toFixed(2)} steps, slot use \${(100 * work / (r.steps * 4)).toFixed(1)}%\`);
}

console.log("\\n== 3. KV admission: reserve max context vs paged blocks of 16 tokens ==");
const maxCtx = 8192, avgUsed = 1800;
console.log(\`reserve \${maxCtx} tokens each: \${Math.floor(kvTokens / maxCtx)} concurrent sequences\`);
console.log(\`paged, \${Math.ceil(avgUsed / 16)} blocks for \${avgUsed} tokens: \${Math.floor(kvTokens / (Math.ceil(avgUsed / 16) * 16))} concurrent sequences\`);

console.log("\\n== 4. Routing 12 requests to 3 replicas (system prompt 2,000 tokens, user part 100) ==");
const tenants = "AABAAACAABAC".split("");
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
function route(policy) {
  const cached = [new Set(), new Set(), new Set()], load = [0, 0, 0];
  let computed = 0;
  tenants.forEach((tn, i) => {
    let r;
    if (policy === "round-robin") r = i % 3;
    else if (policy === "prefix-hash") r = fnv1a("system-prompt-" + tn) % 3;
    else { // prefix-aware with a load cap: prefer a replica that has the prefix unless it is 2 ahead
      const min = Math.min(...load);
      const hit = [0, 1, 2].find((k) => cached[k].has(tn) && load[k] - min < 2);
      r = hit !== undefined ? hit : load.indexOf(min);
    }
    computed += (cached[r].has(tn) ? 0 : 2000) + 100;
    cached[r].add(tn); load[r]++;
  });
  const hitRate = 1 - computed / (tenants.length * 2100);
  console.log(\`\${policy.padEnd(18)} prefill tokens \${fmt(computed)} of \${fmt(tenants.length * 2100)} (saved \${(100 * hitRate).toFixed(1)}%), load \${load.join("/")}\`);
}
route("round-robin");
route("prefix-hash");
route("prefix+load-aware");` },
          { tech: "python", code: `# LLM inference fleet: capacity math, static vs continuous batching, paged KV admission,
# and prefix-aware routing. GPUs are simulated: one "step" = one decode iteration.
import math


def fmt(n):
    return f"{math.floor(n + 0.5):,}"


print("== 1. Capacity (assumed: 70B model in BF16, 80 layers, 8 KV heads, head dim 128) ==")
weights = 70e9 * 2
kv_per_token = 2 * 80 * 8 * 128 * 2  # K and V, layers, kv heads, head dim, 2 bytes
node = 8 * 80e9
usable = node * 0.9
kv_bytes = usable - weights
kv_tokens = math.floor(kv_bytes / kv_per_token)
print(f"weights {fmt(weights / 1e9)} GB; KV cache {fmt(kv_per_token)} bytes per token")
print(f"8 x 80 GB node, 90% usable: {fmt(kv_bytes / 1e9)} GB left for KV = {fmt(kv_tokens)} tokens")
step_floor_ms = weights / (8 * 3.35e12) * 1000
print(f"decode floor: read all weights once per step = {step_floor_ms:.2f} ms per step")
req_day, in_tok, out_tok, peak = 20e6, 1500, 300, 3
out_peak = req_day * out_tok / 86400 * peak
in_peak = req_day * in_tok / 86400 * peak
per_node = 128 / 0.025  # assumed: batch 128 at 25 ms per step
print(f"demand at 3x peak: {fmt(out_peak)} output tok/s, {fmt(in_peak)} prompt tok/s")
print(f"assumed node rate {fmt(per_node)} output tok/s -> {math.ceil(out_peak / per_node)} nodes for decode")
print(f"prompt tokens to compute with a 60% prefix-cache hit rate: {fmt(in_peak * 0.4)} tok/s")

print("\\n== 2. Static vs continuous batching (8 requests, 4 slots) ==")
lens = [5, 40, 8, 12, 30, 6, 20, 10]


def static_batching():
    done, t = [], 0
    for i in range(0, len(lens), 4):
        batch = lens[i:i + 4]
        done += [t + l for l in batch]
        t += max(batch)  # the batch holds its slots until the longest finishes
    return done, t


def continuous_batching():
    done = [0] * len(lens)
    slots, nxt, t = [], 0, 0
    while nxt < len(lens) or slots:
        while len(slots) < 4 and nxt < len(lens):
            slots.append([nxt, lens[nxt]])
            nxt += 1
        t += 1
        for s in slots:
            s[1] -= 1
        for s in slots:
            if s[1] == 0:
                done[s[0]] = t
        slots = [s for s in slots if s[1] > 0]
    return done, t


work = sum(lens)
for name, (done, steps) in [("static", static_batching()), ("continuous", continuous_batching())]:
    avg = sum(done) / len(done)
    print(f"{name:<10} finish steps {','.join(map(str, done))}")
    print(f"{'':<10} total {steps} steps, mean latency {avg:.2f} steps, slot use {100 * work / (steps * 4):.1f}%")

print("\\n== 3. KV admission: reserve max context vs paged blocks of 16 tokens ==")
max_ctx, avg_used = 8192, 1800
blocks = math.ceil(avg_used / 16)
print(f"reserve {max_ctx} tokens each: {kv_tokens // max_ctx} concurrent sequences")
print(f"paged, {blocks} blocks for {avg_used} tokens: {kv_tokens // (blocks * 16)} concurrent sequences")

print("\\n== 4. Routing 12 requests to 3 replicas (system prompt 2,000 tokens, user part 100) ==")
tenants = list("AABAAACAABAC")


def fnv1a(s):
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def route(policy):
    cached = [set(), set(), set()]
    load = [0, 0, 0]
    computed = 0
    for i, tn in enumerate(tenants):
        if policy == "round-robin":
            r = i % 3
        elif policy == "prefix-hash":
            r = fnv1a("system-prompt-" + tn) % 3
        else:  # prefix-aware with a load cap: prefer a replica that has the prefix unless it is 2 ahead
            mn = min(load)
            hits = [k for k in range(3) if tn in cached[k] and load[k] - mn < 2]
            r = hits[0] if hits else load.index(mn)
        computed += (0 if tn in cached[r] else 2000) + 100
        cached[r].add(tn)
        load[r] += 1
    hit_rate = 1 - computed / (len(tenants) * 2100)
    print(f"{policy:<18} prefill tokens {fmt(computed)} of {fmt(len(tenants) * 2100)} "
          f"(saved {100 * hit_rate:.1f}%), load {'/'.join(map(str, load))}")


route("round-robin")
route("prefix-hash")
route("prefix+load-aware")` },
        ],
      },
    ],
  },
  {
    title: `What is KV-cache and how does prefix caching speed up LLM inference?`,
    difficulty: "hard",
    seoDescription: `KV-cache explained from zero: what keys and values are, why caching them is exact, its memory cost, and how block-hash prefix caching skips prefill.`,
    description: `**Question presented to candidate:**
"When a large language model generates text, people say it uses a KV-cache. What exactly is being cached, why is it allowed, and what does it cost? And what is prefix caching on top of that: how does it make a request faster, and when does it not help?"

**What a strong answer should cover:**
- Attention computes a **query, key and value** per token; the KV-cache stores the keys and values of all earlier tokens so each new token computes only its own, turning generation from re-processing the whole sequence every step into one new position per step
- Why it is exact: in a **causal (decoder-only)** model a token never attends to later tokens, so earlier keys and values never change as text is appended
- The cost: GPU memory of 2 x layers x KV heads x head dim x bytes per token (128 KiB for Llama 3 8B, 320 KiB for Llama 3 70B in 16-bit), and how **grouped-query attention** shrinks it
- **Prefix caching**: keep KV blocks after a request ends, identify them by a hash of all tokens up to and including the block, and reuse them when a new prompt starts with the same tokens; this skips **prefill** and cuts time to first token
- Limits: only an exact prefix match counts (one changed token early invalidates everything after it), it does not speed up decode, and cached blocks compete for memory under **LRU eviction**

**Code / implementation expected:** Optional — the examples run a toy two-layer transformer with and without a KV-cache (same tokens, 18 versus 78 K/V computations) and a block-hash prefix cache with LRU eviction across seven requests.`,
    answer: `**Target Audience:** Engineers preparing for interviews who know roughly what an LLM is but have never looked inside one. Attention, keys, values and prefill are explained from zero.
**Difficulty:** Hard
**Verified with:** Node 22 and Python 3.12 for the transformer example; Node 22, Python 3.12, Go 1.24 and Java 21 for the prefix cache (identical output in each). Model shapes and engine facts (vLLM, SGLang) are cited inline, checked in October 2026.

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts with the words an interviewer expects. Every number comes from the two example programs, quoted in full in the **Verified** section. How a whole GPU fleet is built around this (queues, batching, routing) is on [the AI inference infrastructure page](/interview-question/how-would-you-design-ai-inference-infra-with-gpu-queue-and-kv-cache); what API providers charge for cached prompts is on [prompt caching in practice](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency).

## 1. Why This Even Matters — A Story First

Imagine a translator reading a long letter aloud, one word at a time, who must reread the entire letter from the top before saying each new word. By word 2,000 they are rereading 2,000 words for every word they add. That is an LLM without a KV-cache.

Now give the translator a notebook. Each time they read a word, they jot down the two things they will later need about it: what it is "about" (so they can tell whether it is relevant) and what it "says" (so they can use it). For the next word they glance at the notebook instead of rereading. That notebook is the **KV-cache**.

Prefix caching is the next trick. Every letter the office receives starts with the same three-paragraph legal header. Instead of throwing the notebook away after each letter, the translator keeps the pages for the header and starts the next letter on page four.

## 2. Thirty Seconds of Attention

A model turns text into **tokens** (word pieces; see [tokens](/interview-question/what-are-tokens-and-why-do-they-matter-for-cost-and-limits)) and processes them through many layers. In each layer, every token produces three vectors:

- a **query** (Q): "what am I looking for?"
- a **key** (K): "what do I contain?" — matched against other tokens queries
- a **value** (V): "what do I pass on if you pick me?"

A token new output is a weighted mix of the values of the tokens it attends to, weighted by how well its query matches their keys. The full mechanism is on [how attention works](/interview-question/how-does-the-transformer-architecture-and-attention-work).

📌 **Interview term: causal (masked) self-attention** — in a decoder-only LLM each token may attend only to itself and earlier tokens, never later ones. This is what makes left-to-right generation possible, and it is the reason the KV-cache is allowed.

## 3. The KV-Cache: What Is Stored and Why It Is Exact

Generating one token needs the new token query and the keys and values of **every earlier token, in every layer**. Without a cache, each step recomputes all of them. With a cache, each step computes Q, K and V only for the newest token, appends K and V to the cache, and attends over the cache.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 250" role="img" aria-label="One decode step: the cache holds K and V for tokens 1 to 4. The new token 5 computes its own Q, K and V, appends K and V to the cache and attends over all five.">
  <defs>
    <marker id="sd19q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="40" width="90" height="60" rx="8"/>
  <text class="d-text" x="85" y="68" text-anchor="middle">K,V 1</text>
  <text class="d-sub" x="85" y="88" text-anchor="middle">cached</text>
  <rect class="d-box-muted" x="150" y="40" width="90" height="60" rx="8"/>
  <text class="d-text" x="195" y="68" text-anchor="middle">K,V 2</text>
  <text class="d-sub" x="195" y="88" text-anchor="middle">cached</text>
  <rect class="d-box-muted" x="260" y="40" width="90" height="60" rx="8"/>
  <text class="d-text" x="305" y="68" text-anchor="middle">K,V 3</text>
  <text class="d-sub" x="305" y="88" text-anchor="middle">cached</text>
  <rect class="d-box-muted" x="370" y="40" width="90" height="60" rx="8"/>
  <text class="d-text" x="415" y="68" text-anchor="middle">K,V 4</text>
  <text class="d-sub" x="415" y="88" text-anchor="middle">cached</text>
  <rect class="d-box-accent" x="480" y="40" width="90" height="60" rx="8"/>
  <text class="d-text" x="525" y="68" text-anchor="middle">K,V 5</text>
  <text class="d-sub" x="525" y="88" text-anchor="middle">appended</text>
  <rect class="d-box-accent" x="640" y="150" width="150" height="70" rx="10"/>
  <text class="d-text" x="715" y="180" text-anchor="middle">new token 5</text>
  <text class="d-sub" x="715" y="202" text-anchor="middle">computes Q, K, V</text>
  <rect class="d-box" x="250" y="150" width="200" height="70" rx="10"/>
  <text class="d-text" x="350" y="180" text-anchor="middle">attention</text>
  <text class="d-sub" x="350" y="202" text-anchor="middle">Q 5 against K,V 1 to 5</text>
  <line class="d-edge-accent" x1="680" y1="146" x2="560" y2="104" marker-end="url(#sd19q3-arrow)"/>
  <line class="d-edge" x1="636" y1="185" x2="454" y2="185" marker-end="url(#sd19q3-arrow)"/>
  <line class="d-edge-dashed" x1="300" y1="104" x2="320" y2="146" marker-end="url(#sd19q3-arrow)"/>
</svg>

Only the newest token does new projection work; the four earlier tokens are read from the cache. This happens in every layer.

The toy model in the first example (two layers, vectors of length 4) generates six tokens after a four-token prompt, both ways:

~~~text
== 2. Generate 6 tokens after a 4-token prompt ==
no cache : tokens 3 1 4 1 1 6 6 2 7 7  K/V rows computed 78
KV cache : tokens 3 1 4 1 1 6 6 2 7 7  K/V rows computed 18
max difference in hidden states: 0
~~~

Same tokens, hidden states identical to the last bit, and 18 K/V computations instead of 78. The cache is not an approximation.

**Why it is exact.** Because of the causal mask, the key of token 1 in layer 2 depends only on tokens 0 and 1. Appending more tokens cannot change it. The example checks this directly, and also shows what happens without the mask:

~~~text
== 3. Why caching is allowed: old K/V never change in a causal model ==
causal mask   layer-2 K of position 1, context 3 vs 10 tokens: max change 0.0000
no mask       layer-2 K of position 1, context 3 vs 10 tokens: max change 0.0816
~~~

In a bidirectional model (like BERT-style encoders) every token sees the future, so earlier keys change when text is added and there is nothing stable to cache.

At real scale the savings are large. A 2,000-token prompt followed by 300 generated tokens:

~~~text
== 4. Same counting at real scale: 2,000-token prompt, 300 new tokens, 80 layers ==
token-positions processed: no cache 644,850, with cache 2,299 (280x), x 80 layers each
~~~

📌 **Interview term: KV-cache** — per sequence, per layer, the stored key and value vectors of every token processed so far, kept in GPU memory so that each new token computes only its own and attends over the stored ones.

The cache removes recomputation but not all per-step cost: each decode step still *reads* the whole cache (and all the weights) from GPU memory. That is why decode is memory-bandwidth bound and why long contexts slow generation even with a cache.

## 4. Prefill and Decode

📌 **Interview term: prefill** — the first phase of a request: all prompt tokens are processed in one parallel pass, which fills the KV-cache and produces the first output token. It is compute-heavy and determines **time to first token (TTFT)**.

📌 **Interview term: decode** — the second phase: one new token per step per sequence, each reading the KV-cache. It determines **time per output token**.

Keep these apart: the KV-cache is what makes decode cheap, and prefix caching (section 6) is what makes prefill cheap.

## 5. What the KV-Cache Costs: Memory

Size per token = 2 (K and V) x layers x KV heads x head dimension x bytes per number. Using the published configs of Llama 3 (8B: 32 layers, 8 KV heads; 70B: 80 layers, 8 KV heads; head dimension 128; values in 16-bit):

~~~text
== 1. KV cache size per token = 2 (K,V) x layers x kv_heads x head_dim x bytes ==
Llama 3 8B (GQA, 8 KV heads)    128 KiB/token, 8,192-token context 1.00 GiB
same, if all 32 heads kept K/V  512 KiB/token, 8,192-token context 4.00 GiB
Llama 3 70B (GQA, 8 KV heads)   320 KiB/token, 8,192-token context 2.50 GiB
~~~

One 8k-token conversation on the 70B model holds 2.5 GiB of GPU memory just for its cache, so KV memory, not compute, usually limits how many users a GPU serves at once.

📌 **Interview term: grouped-query attention (GQA)** — several query heads share one key/value head. Llama 3 8B has 32 query heads but only 8 KV heads, so its cache is 4x smaller than if every head kept its own K and V (128 KiB versus 512 KiB per token). Other levers: storing the cache in 8-bit (half the bytes), sliding-window attention, and paging (below).

📌 **Interview term: paged KV-cache (PagedAttention)** — storing each sequence cache in fixed-size blocks allocated on demand, like pages of virtual memory, instead of one contiguous region sized for the maximum context. Introduced by vLLM (Kwon et al., SOSP 2023), it made sharing blocks between sequences possible, which is exactly what prefix caching needs.

## 6. Prefix Caching: Reusing KV Across Requests

The plain KV-cache lives only as long as one request. But many requests start with identical tokens: the same system prompt, the same few-shot examples, the same uploaded document, or the whole earlier conversation in a multi-turn chat. Their KV for that shared beginning is identical (it depends only on those tokens, by the causal argument above). **Prefix caching** keeps it and reuses it.

How engines find a match: the cache is split into blocks of a fixed number of tokens, and each full block gets a hash computed from its **parent block hash plus its own tokens**. So a block hash identifies the *entire prefix* up to that block, not just its own tokens. vLLM automatic prefix caching documents exactly this hash-per-block design (vLLM docs, "Automatic Prefix Caching"); SGLang RadixAttention instead indexes cached prefixes in a radix tree and evicts least recently used leaves first (Zheng et al., "SGLang: Efficient Execution of Structured Language Model Programs").

<svg class="iq-diagram" width="100%" viewBox="0 0 860 260" role="img" aria-label="Two requests share three blocks of the system prompt. Each block hash chains from the previous one. The requests diverge at block four, which has different hashes.">
  <defs>
    <marker id="sd19q3-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="95" width="130" height="70" rx="10"/>
  <text class="d-text" x="95" y="125" text-anchor="middle">block 1</text>
  <text class="d-sub" x="95" y="147" text-anchor="middle">system prompt</text>
  <rect class="d-box-accent" x="220" y="95" width="130" height="70" rx="10"/>
  <text class="d-text" x="285" y="125" text-anchor="middle">block 2</text>
  <text class="d-sub" x="285" y="147" text-anchor="middle">hash of 1 + 2</text>
  <rect class="d-box-accent" x="410" y="95" width="130" height="70" rx="10"/>
  <text class="d-text" x="475" y="125" text-anchor="middle">block 3</text>
  <text class="d-sub" x="475" y="147" text-anchor="middle">shared</text>
  <rect class="d-box" x="620" y="20" width="210" height="70" rx="10"/>
  <text class="d-text" x="725" y="50" text-anchor="middle">block 4 of r1</text>
  <text class="d-sub" x="725" y="72" text-anchor="middle">reset my password</text>
  <rect class="d-box" x="620" y="170" width="210" height="70" rx="10"/>
  <text class="d-text" x="725" y="200" text-anchor="middle">block 4 of r2</text>
  <text class="d-sub" x="725" y="222" text-anchor="middle">where is my order</text>
  <line class="d-edge" x1="160" y1="130" x2="216" y2="130" marker-end="url(#sd19q3-arrow2)"/>
  <line class="d-edge" x1="350" y1="130" x2="406" y2="130" marker-end="url(#sd19q3-arrow2)"/>
  <line class="d-edge" x1="540" y1="115" x2="616" y2="60" marker-end="url(#sd19q3-arrow2)"/>
  <line class="d-edge" x1="540" y1="145" x2="616" y2="200" marker-end="url(#sd19q3-arrow2)"/>
</svg>

The three system prompt blocks form one shared chain; the requests split at block 4, whose hashes differ because their tokens differ.

When a request arrives, the engine hashes its prompt blocks in order and walks the cache until the first miss. Every hit block is attached to the new sequence as-is; only the tokens after the last hit are prefilled. The second example simulates this with blocks of 4 tokens and room for 8 blocks:

~~~text
system prompt = 12 tokens = 3 blocks of 4
r1 first user  : 19 tokens, 4 full blocks, hit 0 blocks (0 tokens), prefill 19, cached 4/8
r1 block hashes 8202 -> 682a -> 9677 -> 6b32
r2 other user  : 17 tokens, 4 full blocks, hit 3 blocks (12 tokens), prefill 5, cached 5/8
r3 r1 retried  : 19 tokens, 4 full blocks, hit 4 blocks (16 tokens), prefill 3, cached 5/8
~~~

- **r2** shares the 12-token system prompt with r1, so 3 blocks hit and it prefills only 5 tokens.
- **r3** is r1 again: all 4 full blocks hit; the last 3 tokens did not fill a block, so they are prefilled again. Only full blocks are cached.

The next three lines show the limits:

~~~text
r4 one word off: 17 tokens, 4 full blocks, hit 0 blocks (0 tokens), prefill 17, evicted f170, cached 8/8
r5 r1 turn two : 33 tokens, 8 full blocks, hit 4 blocks (16 tokens), prefill 17, evicted 379a,624c,490e,a9af, cached 8/8
r6 new topic   : 12 tokens, 3 full blocks, hit 0 blocks (0 tokens), prefill 12, evicted cd86,b1f5,08d8, cached 8/8
~~~

- **r4** changes one word ("support" to "sales") in the first block. Every later block hash chains from it, so **nothing** hits, even though 16 of its 17 tokens match r2. Prefix caching is all-or-nothing from the first difference onward.
- **r5** is the second turn of r1 conversation: r1 whole prompt is its prefix, so 4 blocks hit. This is why multi-turn chat benefits so much.
- When the cache is full, the least recently used blocks go. The r4 blocks, used once and never again, were the first to go when r5 needed room.

📌 **Interview term: prefix caching (automatic prefix caching)** — keeping KV blocks after a request finishes and reusing them for any later request whose prompt begins with exactly the same tokens, identified by a chained hash per block. It removes prefill work for the shared part and so cuts time to first token and GPU compute.

📌 **Interview term: chained block hash** — a block hash computed from the parent hash and the block tokens, so equal hashes mean equal entire prefixes. Two blocks with identical text at different positions, or after different prefixes, have different hashes, which is required because their K and V differ.

**Eviction order matters.** A child block is useless without its parent, so evicting a parent first strands its children. The example releases a finished request blocks tail first, so the first block is the most recently used and the tail is evicted first. That is why, after r6 pushed out three of r5 tail blocks, the system prompt survived and r7 still hit:

~~~text
r7 back to sys : 18 tokens, 4 full blocks, hit 3 blocks (12 tokens), prefill 6, evicted 7497, cached 8/8
total: 135 prompt tokens, 79 computed, 56 served from cache (41.5%)
~~~

📌 **Interview term: LRU eviction of cached blocks** — when KV memory is needed, free cached blocks that no running request uses are evicted least recently used first, preferring the ends of chains so shared prefixes stay. SGLang states the same rule in tree terms: evict least recently used leaves.

## 7. What Prefix Caching Does and Does Not Speed Up

| | Helps? | Why |
| :--- | :--- | :--- |
| Time to first token | Yes, a lot for long shared prefixes | Prefill work for the hit part is skipped |
| GPU compute and cost | Yes | Fewer prompt tokens computed (79 of 135 here) |
| Time per output token | No | Decode still reads the full cache every step |
| Memory | Mixed | Shared blocks are stored once for many sequences, but idle cached blocks occupy memory until evicted |
| Prompts with a unique start | No | First block misses, so everything misses |

**Prompt design follows directly.** Put stable content first (system prompt, tool definitions, documents, few-shot examples) and variable content last (the user question, today date, request ids). A timestamp at the top of a system prompt silently turns every request into a miss, as r4 showed. Across a fleet, requests must also reach the replica that holds the prefix; that is the routing deep dive on [the inference infrastructure page](/interview-question/how-would-you-design-ai-inference-infra-with-gpu-queue-and-kv-cache).

**At the API level**, hosted providers expose the same idea as prompt caching with pricing attached; Anthropic for example bills cache reads at 0.1x the base input token price and 5-minute cache writes at 1.25x (Anthropic documentation, "Prompt caching"). Details and other providers are on [prompt caching for cost](/interview-question/prompt-caching-in-2025-how-do-you-cut-cost-with-anthropic-openai-caches).

## 8. Verified: Running the Code

**"KV-cache from first principles: a toy causal transformer generating the same tokens with and without a cache"** is a tiny two-layer, single-head transformer with fixed weights from \`sin\` and \`cos\`; there is no training, no real vocabulary and no GPU. It shows exactness, the work counts and the causal argument, nothing about speed. Its core is the decode step that computes one position and attends over the cache:

~~~js
for (let l = 0; l < LAYERS; l++) {
  cacheK[l].push(matvec(x, W[l][1])); cacheV[l].push(matvec(x, W[l][2])); rowsCached++;
  const a = attend(matvec(x, W[l][0]), cacheK[l], cacheV[l]);
  x = x.map((xi, j) => xi + a[j]);
}
~~~

Full output (identical in Node and Python):

~~~text
== 1. KV cache size per token = 2 (K,V) x layers x kv_heads x head_dim x bytes ==
Llama 3 8B (GQA, 8 KV heads)    128 KiB/token, 8,192-token context 1.00 GiB
same, if all 32 heads kept K/V  512 KiB/token, 8,192-token context 4.00 GiB
Llama 3 70B (GQA, 8 KV heads)   320 KiB/token, 8,192-token context 2.50 GiB

== 2. Generate 6 tokens after a 4-token prompt ==
no cache : tokens 3 1 4 1 1 6 6 2 7 7  K/V rows computed 78
KV cache : tokens 3 1 4 1 1 6 6 2 7 7  K/V rows computed 18
max difference in hidden states: 0

== 3. Why caching is allowed: old K/V never change in a causal model ==
causal mask   layer-2 K of position 1, context 3 vs 10 tokens: max change 0.0000
no mask       layer-2 K of position 1, context 3 vs 10 tokens: max change 0.0816

== 4. Same counting at real scale: 2,000-token prompt, 300 new tokens, 80 layers ==
token-positions processed: no cache 644,850, with cache 2,299 (280x), x 80 layers each
~~~

**"Block-hash prefix cache with chained hashes and LRU eviction across seven requests"** uses words as tokens, FNV-1a as the block hash, 4-token blocks and an 8-block capacity; a set of hashes stands for GPU-resident KV blocks. Real engines use 16-token blocks or similar, a stronger hash, reference counts for blocks in use by running sequences, and per-tenant isolation; none of that is modelled.

~~~js
for (let i = 0; i + BLOCK <= tokens.length; i += BLOCK) {
  parent = fnv1a(parent + "|" + tokens.slice(i, i + BLOCK).join(" "));
  out.push(parent); // a block hash covers ALL tokens before it, not just its own 4
}
~~~

Full output (identical in Node, Python, Go and Java):

~~~text
system prompt = 12 tokens = 3 blocks of 4
r1 first user  : 19 tokens, 4 full blocks, hit 0 blocks (0 tokens), prefill 19, cached 4/8
r1 block hashes 8202 -> 682a -> 9677 -> 6b32
r2 other user  : 17 tokens, 4 full blocks, hit 3 blocks (12 tokens), prefill 5, cached 5/8
r3 r1 retried  : 19 tokens, 4 full blocks, hit 4 blocks (16 tokens), prefill 3, cached 5/8
r4 one word off: 17 tokens, 4 full blocks, hit 0 blocks (0 tokens), prefill 17, evicted f170, cached 8/8
r5 r1 turn two : 33 tokens, 8 full blocks, hit 4 blocks (16 tokens), prefill 17, evicted 379a,624c,490e,a9af, cached 8/8
r6 new topic   : 12 tokens, 3 full blocks, hit 0 blocks (0 tokens), prefill 12, evicted cd86,b1f5,08d8, cached 8/8
r7 back to sys : 18 tokens, 4 full blocks, hit 3 blocks (12 tokens), prefill 6, evicted 7497, cached 8/8
total: 135 prompt tokens, 79 computed, 56 served from cache (41.5%)
~~~

## 9. Edge Cases Worth Knowing

- **Partial last block**: only full blocks are shared; the tail is always recomputed (r3 prefilled 3 tokens).
- **Full hit**: an engine still needs to compute at least the last prompt position to get logits for the first output token.
- **Same text, different tokenization**: a trailing space or different chat template produces different token ids and so no hit.
- **Model or adapter change**: KV depends on weights; a cache from one model version or LoRA adapter must never be reused for another, so the model id belongs in the hash.
- **Multi-tenant leakage**: shared prefix blocks across tenants can leak through timing (a hit is faster); isolate caches per tenant or salt hashes with a tenant id where that matters.

## Common Pitfalls

- **Calling the KV-cache an approximation.** It is exact for causal models; the run showed a maximum difference of 0.
- **Thinking the cache makes long contexts free.** It removes recomputation, but every decode step still reads the whole cache, and each 70B token costs 320 KiB.
- **Expecting partial matches to hit.** One changed word in the first block made r4 miss everything.
- **Putting variable data at the top of the prompt.** Dates, user names or request ids before the shared part destroy the prefix.
- **Confusing prefix caching with semantic caching.** Prefix caching reuses KV for identical leading tokens and still runs the model; [semantic caching](/interview-question/what-is-semantic-caching-and-when-is-it-safe-to-use) returns a stored answer for a similar question and skips the model.
- **Ignoring routing.** A prefix cached on one replica does nothing for a request sent to another.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What attention needs:</strong> <span style="color:#f0e2c8;">Every token produces a query, a key and a value per layer. To generate the next token the model needs the new query and the <strong style="color:#ffca28;">keys and values of all earlier tokens</strong> in every layer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The KV-cache:</strong> <span style="color:#f0e2c8;">Instead of recomputing those each step, the engine stores them in GPU memory and computes Q, K and V only for the new token. In a toy model that was 18 K/V computations instead of 78 for the same tokens, with identical output. It is exact because with <strong style="color:#ffca28;">causal attention</strong> earlier tokens never see later ones, so their K and V never change.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">Memory: 2 x layers x KV heads x head dim x bytes per token, 128 KiB for Llama 3 8B and 320 KiB for 70B in 16-bit, about 2.5 GiB for one 8k context. <strong style="color:#ffca28;">GQA</strong>, 8-bit KV and <strong style="color:#ffca28;">paged</strong> allocation keep it manageable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Prefix caching:</strong> <span style="color:#f0e2c8;">Keep KV blocks after a request, key each block by a <strong style="color:#ffca28;">chained hash</strong> of all tokens up to it, and reuse matching blocks for new prompts with the same beginning. That skips prefill for the shared part and cuts time to first token; in my simulation 41.5% of prompt tokens came from cache.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits and practice:</strong> <span style="color:#f0e2c8;">Only an exact prefix counts, one changed early token misses everything, decode speed is unchanged, and blocks are evicted LRU from the chain ends. So put stable content first and variable content last, and route requests to the replica that holds their prefix.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can encoder models like BERT not use a KV-cache the same way?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They use bidirectional attention: every token attends to tokens after it too, so appending text changes the keys and values of earlier tokens. In the run, removing the causal mask changed an earlier key by 0.0816; with the mask the change was 0. There is nothing stable to cache.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you estimate how many concurrent users a GPU can hold?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Free memory after weights divided by KV bytes per token gives total tokens; divide by the typical context per user. On an 8 x 80 GB node with a 70B BF16 model that is about 1.33M tokens, so a few hundred 4k-token conversations, more with paging since most requests stop well before their maximum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why hash blocks with the parent hash instead of hashing each block text alone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A block K and V depend on every earlier token, not just its own. The same four words after a different system prompt produce different K and V, so the key must identify the whole prefix. Chaining the parent hash does that in constant work per block.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you turn prefix caching off?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When prompts have no shared beginnings, the cached blocks only compete with running sequences for memory; and in multi-tenant setups where cross-tenant timing leaks are a concern, I would at least partition the cache per tenant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between prefix caching and prompt caching in an API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same mechanism seen from different sides. Prefix caching is the engine feature that reuses KV blocks; API prompt caching is the provider exposing it, sometimes with explicit cache breakpoints and a price, for example Anthropic cache reads at 0.1x the base input price.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Causal (masked) self-attention | Each token attends only to itself and earlier tokens |
| KV-cache | Stored keys and values of earlier tokens, per layer |
| Prefill | Parallel pass over the prompt that fills the cache; sets time to first token |
| Decode | One token per step reading the cache; sets time per output token |
| Grouped-query attention (GQA) | Several query heads share one KV head, shrinking the cache |
| Paged KV-cache (PagedAttention) | Cache stored in fixed-size blocks allocated on demand |
| Prefix caching | Reusing KV blocks across requests with the same leading tokens |
| Chained block hash | Block id from parent hash plus block tokens, identifying the whole prefix |
| LRU eviction of cached blocks | Freeing least recently used idle blocks, chain ends first |

**Conclusion:** The KV-cache stores the keys and values every earlier token produced in every layer, so generating a token computes only that token and attends over the stored ones; it is exact because causal attention never lets old tokens see new ones, and its price is GPU memory, 128 to 320 KiB per token for Llama 3. Prefix caching extends the same idea across requests: KV blocks keyed by chained hashes are kept and reused whenever a new prompt starts with exactly the same tokens, which removes prefill work and cuts time to first token, as long as stable content comes first, requests reach the replica holding the prefix and LRU eviction keeps shared parents alive.`,
    examples: [
      {
        label: `KV-cache from first principles: a toy causal transformer generating the same tokens with and without a cache`,
        variants: [
          { tech: "node", code: `// KV cache from first principles: a toy 2-layer causal transformer (d=4, vocab 10).
// Generates the same tokens with and without a KV cache and counts the K/V work.
const D = 4, VOCAB = 10, LAYERS = 2;
const fmt = (n) => Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");

console.log("== 1. KV cache size per token = 2 (K,V) x layers x kv_heads x head_dim x bytes ==");
for (const [name, layers, kvHeads] of [["Llama 3 8B (GQA, 8 KV heads)", 32, 8], ["same, if all 32 heads kept K/V", 32, 32], ["Llama 3 70B (GQA, 8 KV heads)", 80, 8]]) {
  const per = 2 * layers * kvHeads * 128 * 2;
  console.log(\`\${name.padEnd(31)} \${fmt(per / 1024)} KiB/token, 8,192-token context \${(per * 8192 / 2 ** 30).toFixed(2)} GiB\`);
}

const E = [...Array(VOCAB)].map((_, t) => [...Array(D)].map((_, j) => Math.sin(t * 1.3 + j * 0.7)));
const W = [...Array(LAYERS)].map((_, l) => [0, 1, 2].map((m) =>
  [...Array(D)].map((_, i) => [...Array(D)].map((_, j) => Math.cos((l + 1) * (i * D + j) * 0.37 + m) * 0.5))));
const matvec = (x, M) => M[0].map((_, j) => x.reduce((s, xi, i) => s + xi * M[i][j], 0));
const dot = (a, b) => a.reduce((s, ai, i) => s + ai * b[i], 0);

function attend(q, keys, vals) {
  const sc = keys.map((k) => dot(q, k) / Math.sqrt(D));
  const mx = Math.max(...sc), ex = sc.map((s) => Math.exp(s - mx)), z = ex.reduce((a, b) => a + b, 0);
  return vals[0].map((_, j) => vals.reduce((s, v, i) => s + (ex[i] / z) * v[j], 0));
}
// Full forward over every position (no cache). causal=false lets a position see the future.
function forward(tokens, causal = true, counter = null) {
  let xs = tokens.map((t) => E[t].slice());
  const kByLayer = [];
  for (let l = 0; l < LAYERS; l++) {
    const q = xs.map((x) => matvec(x, W[l][0])), k = xs.map((x) => matvec(x, W[l][1])), v = xs.map((x) => matvec(x, W[l][2]));
    if (counter) counter.rows += xs.length;
    kByLayer.push(k);
    xs = xs.map((x, i) => {
      const n = causal ? i + 1 : xs.length;
      const a = attend(q[i], k.slice(0, n), v.slice(0, n));
      return x.map((xi, j) => xi + a[j]);
    });
  }
  return { last: xs[xs.length - 1], kByLayer };
}
const argmax = (h) => { let best = 0; for (let t = 1; t < VOCAB; t++) if (dot(h, E[t]) > dot(h, E[best])) best = t; return best; };

console.log("\\n== 2. Generate 6 tokens after a 4-token prompt ==");
const prompt = [3, 1, 4, 1];
const noCache = { rows: 0 }, seqA = prompt.slice(), lastA = [];
for (let s = 0; s < 6; s++) { const r = forward(seqA, true, noCache); lastA.push(r.last); seqA.push(argmax(r.last)); }

const cacheK = [...Array(LAYERS)].map(() => []), cacheV = [...Array(LAYERS)].map(() => []);
let rowsCached = 0;
function step(token) { // process ONE new position, reuse cached K/V of all earlier ones
  let x = E[token].slice();
  for (let l = 0; l < LAYERS; l++) {
    cacheK[l].push(matvec(x, W[l][1])); cacheV[l].push(matvec(x, W[l][2])); rowsCached++;
    const a = attend(matvec(x, W[l][0]), cacheK[l], cacheV[l]);
    x = x.map((xi, j) => xi + a[j]);
  }
  return x;
}
const seqB = prompt.slice(), lastB = [];
let h; for (const t of prompt) h = step(t); // prefill fills the cache
for (let s = 0; s < 6; s++) { lastB.push(h); const nt = argmax(h); seqB.push(nt); if (s < 5) h = step(nt); }
let maxDiff = 0;
lastA.forEach((v, s) => v.forEach((x, j) => { maxDiff = Math.max(maxDiff, Math.abs(x - lastB[s][j])); }));
console.log(\`no cache : tokens \${seqA.join(" ")}  K/V rows computed \${noCache.rows}\`);
console.log(\`KV cache : tokens \${seqB.join(" ")}  K/V rows computed \${rowsCached}\`);
console.log(\`max difference in hidden states: \${maxDiff}\`);

console.log("\\n== 3. Why caching is allowed: old K/V never change in a causal model ==");
for (const causal of [true, false]) {
  const short = forward(seqA.slice(0, 3), causal).kByLayer[1][1], long = forward(seqA, causal).kByLayer[1][1];
  const d = Math.max(...short.map((x, j) => Math.abs(x - long[j])));
  console.log(\`\${causal ? "causal mask  " : "no mask      "} layer-2 K of position 1, context 3 vs 10 tokens: max change \${d.toFixed(4)}\`);
}

console.log("\\n== 4. Same counting at real scale: 2,000-token prompt, 300 new tokens, 80 layers ==");
let without = 0; for (let k = 1; k <= 300; k++) without += 2000 + k - 1;
const withc = 2000 + 299;
console.log(\`token-positions processed: no cache \${fmt(without)}, with cache \${fmt(withc)} (\${(without / withc).toFixed(0)}x), x 80 layers each\`);` },
          { tech: "python", code: `# KV cache from first principles: a toy 2-layer causal transformer (d=4, vocab 10).
# Generates the same tokens with and without a KV cache and counts the K/V work.
import math

D, VOCAB, LAYERS = 4, 10, 2


def fmt(n):
    return f"{math.floor(n + 0.5):,}"


print("== 1. KV cache size per token = 2 (K,V) x layers x kv_heads x head_dim x bytes ==")
for name, layers, kv_heads in [("Llama 3 8B (GQA, 8 KV heads)", 32, 8), ("same, if all 32 heads kept K/V", 32, 32),
                               ("Llama 3 70B (GQA, 8 KV heads)", 80, 8)]:
    per = 2 * layers * kv_heads * 128 * 2
    print(f"{name:<31} {fmt(per / 1024)} KiB/token, 8,192-token context {per * 8192 / 2 ** 30:.2f} GiB")

E = [[math.sin(t * 1.3 + j * 0.7) for j in range(D)] for t in range(VOCAB)]
W = [[[[math.cos((l + 1) * (i * D + j) * 0.37 + m) * 0.5 for j in range(D)] for i in range(D)] for m in range(3)]
     for l in range(LAYERS)]


def matvec(x, M):
    out = []
    for j in range(len(M[0])):
        s = 0
        for i in range(len(x)):
            s += x[i] * M[i][j]
        out.append(s)
    return out


def dot(a, b):
    s = 0
    for i in range(len(a)):
        s += a[i] * b[i]
    return s


def attend(q, keys, vals):
    sc = [dot(q, k) / math.sqrt(D) for k in keys]
    mx = max(sc)
    ex = [math.exp(s - mx) for s in sc]
    z = 0
    for e in ex:
        z += e
    out = []
    for j in range(len(vals[0])):
        s = 0
        for i in range(len(vals)):
            s += (ex[i] / z) * vals[i][j]
        out.append(s)
    return out


def forward(tokens, causal=True, counter=None):
    """Full forward over every position (no cache). causal=False lets a position see the future."""
    xs = [E[t][:] for t in tokens]
    k_by_layer = []
    for l in range(LAYERS):
        q = [matvec(x, W[l][0]) for x in xs]
        k = [matvec(x, W[l][1]) for x in xs]
        v = [matvec(x, W[l][2]) for x in xs]
        if counter is not None:
            counter["rows"] += len(xs)
        k_by_layer.append(k)
        new = []
        for i, x in enumerate(xs):
            n = i + 1 if causal else len(xs)
            a = attend(q[i], k[:n], v[:n])
            new.append([x[j] + a[j] for j in range(D)])
        xs = new
    return xs[-1], k_by_layer


def argmax(h):
    best = 0
    for t in range(1, VOCAB):
        if dot(h, E[t]) > dot(h, E[best]):
            best = t
    return best


print("\\n== 2. Generate 6 tokens after a 4-token prompt ==")
prompt = [3, 1, 4, 1]
no_cache = {"rows": 0}
seq_a, last_a = prompt[:], []
for s in range(6):
    last, _ = forward(seq_a, True, no_cache)
    last_a.append(last)
    seq_a.append(argmax(last))

cache_k = [[] for _ in range(LAYERS)]
cache_v = [[] for _ in range(LAYERS)]
rows_cached = 0


def step(token):
    """Process ONE new position, reuse cached K/V of all earlier ones."""
    global rows_cached
    x = E[token][:]
    for l in range(LAYERS):
        cache_k[l].append(matvec(x, W[l][1]))
        cache_v[l].append(matvec(x, W[l][2]))
        rows_cached += 1
        a = attend(matvec(x, W[l][0]), cache_k[l], cache_v[l])
        x = [x[j] + a[j] for j in range(D)]
    return x


seq_b, last_b = prompt[:], []
for t in prompt:
    h = step(t)  # prefill fills the cache
for s in range(6):
    last_b.append(h)
    nt = argmax(h)
    seq_b.append(nt)
    if s < 5:
        h = step(nt)
max_diff = 0
for s, v in enumerate(last_a):
    for j, x in enumerate(v):
        d = abs(x - last_b[s][j])
        if d > max_diff:
            max_diff = d
print(f"no cache : tokens {' '.join(map(str, seq_a))}  K/V rows computed {no_cache['rows']}")
print(f"KV cache : tokens {' '.join(map(str, seq_b))}  K/V rows computed {rows_cached}")
print(f"max difference in hidden states: {max_diff}")

print("\\n== 3. Why caching is allowed: old K/V never change in a causal model ==")
for causal in (True, False):
    short = forward(seq_a[:3], causal)[1][1][1]
    long = forward(seq_a, causal)[1][1][1]
    d = max(abs(x - long[j]) for j, x in enumerate(short))
    label = "causal mask  " if causal else "no mask      "
    print(f"{label} layer-2 K of position 1, context 3 vs 10 tokens: max change {d:.4f}")

print("\\n== 4. Same counting at real scale: 2,000-token prompt, 300 new tokens, 80 layers ==")
without = sum(2000 + k - 1 for k in range(1, 301))
withc = 2000 + 299
print(f"token-positions processed: no cache {fmt(without)}, with cache {fmt(withc)} ({without / withc:.0f}x), x 80 layers each")` },
        ],
      },
      {
        label: `Block-hash prefix cache with chained hashes and LRU eviction across seven requests`,
        variants: [
          { tech: "node", code: `// Block-hash prefix cache (the idea behind automatic prefix caching), LRU eviction.
// Block size 4 tokens for readability; capacity 8 blocks. Words stand for token ids.
const BLOCK = 4, CAP = 8;

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

const cache = new Set(); // block hashes whose K/V tensors are resident
let order = [];          // LRU order: front = evict first
let totalTokens = 0, totalComputed = 0;

function blockHashes(tokens) {
  const out = []; let parent = "root";
  for (let i = 0; i + BLOCK <= tokens.length; i += BLOCK) {
    parent = fnv1a(parent + "|" + tokens.slice(i, i + BLOCK).join(" "));
    out.push(parent); // a block hash covers ALL tokens before it, not just its own 4
  }
  return out;
}

function serve(name, text) {
  const tokens = text.split(" ");
  const hashes = blockHashes(tokens);
  let hit = 0;
  while (hit < hashes.length && cache.has(hashes[hit])) hit++; // stop at the first miss
  const evicted = [];
  for (let b = hit; b < hashes.length; b++) {
    if (cache.has(hashes[b])) continue;
    while (cache.size >= CAP) {
      const victim = order.find((h) => !hashes.includes(h));
      order = order.filter((h) => h !== victim); cache.delete(victim); evicted.push(victim.slice(0, 4));
    }
    cache.add(hashes[b]);
  }
  // touch tail first so the first block ends up most recent: parents outlive children
  for (let b = hashes.length - 1; b >= 0; b--) { order = order.filter((h) => h !== hashes[b]); order.push(hashes[b]); }
  const computed = tokens.length - hit * BLOCK;
  totalTokens += tokens.length; totalComputed += computed;
  console.log(\`\${name}: \${tokens.length} tokens, \${hashes.length} full blocks, hit \${hit} blocks (\${hit * BLOCK} tokens), prefill \${computed}\` +
    (evicted.length ? \`, evicted \${evicted.join(",")}\` : "") + \`, cached \${cache.size}/\${CAP}\`);
  return hashes;
}

const SYS = "you are the support bot for acme corp . be brief .";
console.log(\`system prompt = \${SYS.split(" ").length} tokens = 3 blocks of \${BLOCK}\`);
const h1 = serve("r1 first user  ", SYS + " how do i reset my password ?");
console.log(\`r1 block hashes \${h1.map((h) => h.slice(0, 4)).join(" -> ")}\`);
serve("r2 other user  ", SYS + " where is my order ?");
serve("r3 r1 retried  ", SYS + " how do i reset my password ?");
serve("r4 one word off", SYS.replace("support", "sales") + " where is my order ?");
serve("r5 r1 turn two ", SYS + " how do i reset my password ? click forgot password on the login page . thanks , and my email ?");
serve("r6 new topic   ", "translate to french : the cat sleeps on the warm mat today");
serve("r7 back to sys ", SYS + " can i change my plan ?");
console.log(\`total: \${totalTokens} prompt tokens, \${totalComputed} computed, \${totalTokens - totalComputed} served from cache (\${(100 * (totalTokens - totalComputed) / totalTokens).toFixed(1)}%)\`);` },
          { tech: "python", code: `# Block-hash prefix cache (the idea behind automatic prefix caching), LRU eviction.
# Block size 4 tokens for readability; capacity 8 blocks. Words stand for token ids.
BLOCK, CAP = 4, 8


def fnv1a(s):
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


cache = set()  # block hashes whose K/V tensors are resident
order = []     # LRU order: front = evict first
totals = {"tokens": 0, "computed": 0}


def block_hashes(tokens):
    out, parent = [], "root"
    for i in range(0, len(tokens) - BLOCK + 1, BLOCK):
        parent = fnv1a(parent + "|" + " ".join(tokens[i:i + BLOCK]))
        out.append(parent)  # a block hash covers ALL tokens before it, not just its own 4
    return out


def serve(name, text):
    global order
    tokens = text.split(" ")
    hashes = block_hashes(tokens)
    hit = 0
    while hit < len(hashes) and hashes[hit] in cache:
        hit += 1  # stop at the first miss
    evicted = []
    for b in range(hit, len(hashes)):
        if hashes[b] in cache:
            continue
        while len(cache) >= CAP:
            victim = next(h for h in order if h not in hashes)
            order = [h for h in order if h != victim]
            cache.discard(victim)
            evicted.append(victim[:4])
        cache.add(hashes[b])
    # touch tail first so the first block ends up most recent: parents outlive children
    for b in range(len(hashes) - 1, -1, -1):
        order = [h for h in order if h != hashes[b]]
        order.append(hashes[b])
    computed = len(tokens) - hit * BLOCK
    totals["tokens"] += len(tokens)
    totals["computed"] += computed
    ev = f", evicted {','.join(evicted)}" if evicted else ""
    print(f"{name}: {len(tokens)} tokens, {len(hashes)} full blocks, hit {hit} blocks ({hit * BLOCK} tokens), "
          f"prefill {computed}{ev}, cached {len(cache)}/{CAP}")
    return hashes


SYS = "you are the support bot for acme corp . be brief ."
print(f"system prompt = {len(SYS.split(' '))} tokens = 3 blocks of {BLOCK}")
h1 = serve("r1 first user  ", SYS + " how do i reset my password ?")
print(f"r1 block hashes {' -> '.join(h[:4] for h in h1)}")
serve("r2 other user  ", SYS + " where is my order ?")
serve("r3 r1 retried  ", SYS + " how do i reset my password ?")
serve("r4 one word off", SYS.replace("support", "sales") + " where is my order ?")
serve("r5 r1 turn two ", SYS + " how do i reset my password ? click forgot password on the login page . thanks , and my email ?")
serve("r6 new topic   ", "translate to french : the cat sleeps on the warm mat today")
serve("r7 back to sys ", SYS + " can i change my plan ?")
t, c = totals["tokens"], totals["computed"]
print(f"total: {t} prompt tokens, {c} computed, {t - c} served from cache ({100 * (t - c) / t:.1f}%)")` },
          { tech: "go", code: `// Block-hash prefix cache (the idea behind automatic prefix caching), LRU eviction.
// Block size 4 tokens for readability; capacity 8 blocks. Words stand for token ids.
package main

import (
	"fmt"
	"strings"
)

const BLOCK, CAP = 4, 8

func fnv1a(s string) string {
	h := uint32(0x811c9dc5)
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 0x01000193
	}
	return fmt.Sprintf("%08x", h)
}

var cache = map[string]bool{} // block hashes whose K/V tensors are resident
var order []string            // LRU order: front = evict first
var totalTokens, totalComputed int

func blockHashes(tokens []string) []string {
	out := []string{}
	parent := "root"
	for i := 0; i+BLOCK <= len(tokens); i += BLOCK {
		parent = fnv1a(parent + "|" + strings.Join(tokens[i:i+BLOCK], " "))
		out = append(out, parent) // a block hash covers ALL tokens before it, not just its own 4
	}
	return out
}

func contains(list []string, x string) bool {
	for _, v := range list {
		if v == x {
			return true
		}
	}
	return false
}

func without(list []string, x string) []string {
	out := []string{}
	for _, v := range list {
		if v != x {
			out = append(out, v)
		}
	}
	return out
}

func serve(name, text string) []string {
	tokens := strings.Split(text, " ")
	hashes := blockHashes(tokens)
	hit := 0
	for hit < len(hashes) && cache[hashes[hit]] {
		hit++ // stop at the first miss
	}
	evicted := []string{}
	for b := hit; b < len(hashes); b++ {
		if cache[hashes[b]] {
			continue
		}
		for len(cache) >= CAP {
			victim := ""
			for _, h := range order {
				if !contains(hashes, h) {
					victim = h
					break
				}
			}
			order = without(order, victim)
			delete(cache, victim)
			evicted = append(evicted, victim[:4])
		}
		cache[hashes[b]] = true
	}
	// touch tail first so the first block ends up most recent: parents outlive children
	for b := len(hashes) - 1; b >= 0; b-- {
		order = append(without(order, hashes[b]), hashes[b])
	}
	computed := len(tokens) - hit*BLOCK
	totalTokens += len(tokens)
	totalComputed += computed
	ev := ""
	if len(evicted) > 0 {
		ev = ", evicted " + strings.Join(evicted, ",")
	}
	fmt.Printf("%s: %d tokens, %d full blocks, hit %d blocks (%d tokens), prefill %d%s, cached %d/%d\\n",
		name, len(tokens), len(hashes), hit, hit*BLOCK, computed, ev, len(cache), CAP)
	return hashes
}

func main() {
	SYS := "you are the support bot for acme corp . be brief ."
	fmt.Printf("system prompt = %d tokens = 3 blocks of %d\\n", len(strings.Split(SYS, " ")), BLOCK)
	h1 := serve("r1 first user  ", SYS+" how do i reset my password ?")
	short := []string{}
	for _, h := range h1 {
		short = append(short, h[:4])
	}
	fmt.Printf("r1 block hashes %s\\n", strings.Join(short, " -> "))
	serve("r2 other user  ", SYS+" where is my order ?")
	serve("r3 r1 retried  ", SYS+" how do i reset my password ?")
	serve("r4 one word off", strings.Replace(SYS, "support", "sales", 1)+" where is my order ?")
	serve("r5 r1 turn two ", SYS+" how do i reset my password ? click forgot password on the login page . thanks , and my email ?")
	serve("r6 new topic   ", "translate to french : the cat sleeps on the warm mat today")
	serve("r7 back to sys ", SYS+" can i change my plan ?")
	saved := totalTokens - totalComputed
	fmt.Printf("total: %d prompt tokens, %d computed, %d served from cache (%.1f%%)\\n",
		totalTokens, totalComputed, saved, 100*float64(saved)/float64(totalTokens))
}` },
          { tech: "java", code: `// Block-hash prefix cache (the idea behind automatic prefix caching), LRU eviction.
// Block size 4 tokens for readability; capacity 8 blocks. Words stand for token ids.
import java.util.*;

public class Main {
    static final int BLOCK = 4, CAP = 8;
    static Set<String> cache = new HashSet<>(); // block hashes whose K/V tensors are resident
    static List<String> order = new ArrayList<>(); // LRU order: front = evict first
    static int totalTokens = 0, totalComputed = 0;

    static String fnv1a(String s) {
        int h = 0x811c9dc5;
        for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h *= 0x01000193; }
        return String.format("%08x", h);
    }

    static List<String> blockHashes(String[] tokens) {
        List<String> out = new ArrayList<>();
        String parent = "root";
        for (int i = 0; i + BLOCK <= tokens.length; i += BLOCK) {
            parent = fnv1a(parent + "|" + String.join(" ", Arrays.copyOfRange(tokens, i, i + BLOCK)));
            out.add(parent); // a block hash covers ALL tokens before it, not just its own 4
        }
        return out;
    }

    static List<String> serve(String name, String text) {
        String[] tokens = text.split(" ");
        List<String> hashes = blockHashes(tokens);
        int hit = 0;
        while (hit < hashes.size() && cache.contains(hashes.get(hit))) hit++; // stop at the first miss
        List<String> evicted = new ArrayList<>();
        for (int b = hit; b < hashes.size(); b++) {
            if (cache.contains(hashes.get(b))) continue;
            while (cache.size() >= CAP) {
                String victim = null;
                for (String h : order) if (!hashes.contains(h)) { victim = h; break; }
                order.remove(victim);
                cache.remove(victim);
                evicted.add(victim.substring(0, 4));
            }
            cache.add(hashes.get(b));
        }
        // touch tail first so the first block ends up most recent: parents outlive children
        for (int b = hashes.size() - 1; b >= 0; b--) { order.remove(hashes.get(b)); order.add(hashes.get(b)); }
        int computed = tokens.length - hit * BLOCK;
        totalTokens += tokens.length;
        totalComputed += computed;
        String ev = evicted.isEmpty() ? "" : ", evicted " + String.join(",", evicted);
        System.out.printf("%s: %d tokens, %d full blocks, hit %d blocks (%d tokens), prefill %d%s, cached %d/%d%n",
            name, tokens.length, hashes.size(), hit, hit * BLOCK, computed, ev, cache.size(), CAP);
        return hashes;
    }

    public static void main(String[] args) {
        String SYS = "you are the support bot for acme corp . be brief .";
        System.out.printf("system prompt = %d tokens = 3 blocks of %d%n", SYS.split(" ").length, BLOCK);
        List<String> h1 = serve("r1 first user  ", SYS + " how do i reset my password ?");
        List<String> shortH = new ArrayList<>();
        for (String h : h1) shortH.add(h.substring(0, 4));
        System.out.printf("r1 block hashes %s%n", String.join(" -> ", shortH));
        serve("r2 other user  ", SYS + " where is my order ?");
        serve("r3 r1 retried  ", SYS + " how do i reset my password ?");
        serve("r4 one word off", SYS.replace("support", "sales") + " where is my order ?");
        serve("r5 r1 turn two ", SYS + " how do i reset my password ? click forgot password on the login page . thanks , and my email ?");
        serve("r6 new topic   ", "translate to french : the cat sleeps on the warm mat today");
        serve("r7 back to sys ", SYS + " can i change my plan ?");
        int saved = totalTokens - totalComputed;
        System.out.printf("total: %d prompt tokens, %d computed, %d served from cache (%.1f%%)%n",
            totalTokens, totalComputed, saved, 100.0 * saved / totalTokens);
    }
}` },
        ],
      },
    ],
  },
];

export default augments;
