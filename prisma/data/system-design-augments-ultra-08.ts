/**
 * SYSTEM DESIGN ULTRA — batch 08: Distributed transactions and data sync. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `What is two-phase commit and its drawbacks?`,
    difficulty: "medium",
    seoDescription: `Two-phase commit explained: prepare and commit phases, the coordinator log, in-doubt participants, blocking, heuristic outcomes, 3PC and alternatives.`,
    description: `**Question presented to candidate:**
"An order has to be written to the orders database, the payments database and the inventory database, and either all three changes happen or none do. Explain how two-phase commit achieves that, walk me through what happens when a participant or the coordinator fails, and tell me why many teams avoid it between microservices."

**What a strong answer should cover:**
- The goal is **atomic commit** across separate databases (participants), driven by a **coordinator**
- **Phase 1 (prepare / vote):** each participant makes its changes durable, keeps its locks and votes YES or NO; a YES is a promise it can no longer break on its own
- **Phase 2 (commit / abort):** the coordinator forces its decision to its own log first, then tells everyone; any NO or timeout before the decision means abort
- The core drawback is **blocking**: a participant that voted YES and lost the coordinator is **in doubt** and holds its locks until the coordinator recovers
- Cost: two round trips to the **slowest** participant, extra forced log writes, locks held across the network; **heuristic** decisions by operators break atomicity
- Alternatives and fixes: replicate the coordinator with consensus (Spanner style), **3PC** (not safe under partitions), or avoid distributed transactions with a [saga](/interview-question/what-is-the-saga-pattern-for-distributed-transactions) or an outbox

**Clarifying questions expected:**
- Are all participants databases we control that support a prepare step (XA, \`PREPARE TRANSACTION\`), or are some of them third-party APIs?
- How long can the affected rows stay locked, and is temporary unavailability acceptable in exchange for atomicity?

**Code / implementation expected:** Optional — a clear walk-through of both phases and the failure cases; the example simulates the protocol on a fake clock.`,
    answer: `**Target Audience:** Developers who know what a database transaction is and now meet data spread over several databases or services. No distributed-systems background assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All timings and counts come from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

Three friends agree to rent a holiday house together, but only if all three can get the same week off work. The organiser phones each one: "Can you take the week of 4 August? Do not book anything yet — just ask your boss, put a hold on it, and tell me yes or no." Every friend gets a provisional hold and says yes. Only then does the organiser call back: "It is on, confirm your holiday."

- If anyone says no, the organiser calls the others: "Cancelled, release your hold."
- If the organiser loses their phone right after hearing three yeses, the friends are stuck. Each has a hold they promised to keep, none of them knows whether the trip is on, and they cannot release the hold without risking that the others confirmed.

That second bullet is the whole interview. Two-phase commit is the organiser protocol, and its famous drawback is the friends sitting by the phone.

📌 **Interview term: atomic commit** — a group of changes on several machines either all become permanent or none do. On one database the transaction gives you this for free; across several databases you need a protocol.

📌 **Interview term: two-phase commit (2PC)** — the classic atomic commit protocol: a **prepare** phase where every participant votes, then a **commit** phase where one decision is sent to all.

## 2. The Cast: Coordinator and Participants

📌 **Interview term: participant** (also resource manager) — a database or service that holds part of the transaction: here the orders, payments and inventory databases.

📌 **Interview term: coordinator** (also transaction manager) — the process that runs the protocol, collects votes and decides. It can be a library inside the application server, a separate transaction manager, or one of the participants.

Each participant does its normal local work first (insert the order, reserve the funds, decrement the stock) inside an open local transaction, taking the usual row locks. Then the protocol starts.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Two-phase commit: coordinator sends prepare to three participants, collects yes votes, logs commit, then sends commit">
  <defs>
    <marker id="sd08q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="115" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="145" text-anchor="middle">coordinator</text>
  <text class="d-sub" x="105" y="168" text-anchor="middle">forces decision</text>
  <rect class="d-box" x="500" y="20" width="200" height="56" rx="10"/>
  <text class="d-text" x="600" y="45" text-anchor="middle">orders DB</text>
  <text class="d-sub" x="600" y="65" text-anchor="middle">rtt 2 ms</text>
  <rect class="d-box" x="500" y="122" width="200" height="56" rx="10"/>
  <text class="d-text" x="600" y="147" text-anchor="middle">payments DB</text>
  <text class="d-sub" x="600" y="167" text-anchor="middle">rtt 4 ms</text>
  <rect class="d-box" x="500" y="224" width="200" height="56" rx="10"/>
  <text class="d-text" x="600" y="249" text-anchor="middle">inventory DB</text>
  <text class="d-sub" x="600" y="269" text-anchor="middle">rtt 60 ms, other region</text>
  <path class="d-edge-accent" d="M 190 135 L 494 48" marker-end="url(#sd08q1-arrow)"/>
  <path class="d-edge-accent" d="M 190 150 L 494 150" marker-end="url(#sd08q1-arrow)"/>
  <path class="d-edge-accent" d="M 190 165 L 494 252" marker-end="url(#sd08q1-arrow)"/>
  <text class="d-sub" x="330" y="85" text-anchor="middle">1. PREPARE</text>
  <text class="d-sub" x="330" y="140" text-anchor="middle">2. vote YES</text>
  <text class="d-sub" x="330" y="230" text-anchor="middle">3. COMMIT</text>
</svg>

The same three arrows are used three times: PREPARE goes out, votes come back, then the decision goes out. That is four messages per participant once the acknowledgements are counted.

## 3. Phase 1 and Phase 2, Step by Step

**Phase 1 — prepare (voting).**
1. The coordinator sends \`PREPARE\` to every participant.
2. Each participant checks it can commit (constraints pass, funds exist, no deadlock), writes a **prepared** record to its own [write-ahead log](/interview-question/what-is-a-write-ahead-log-wal) and flushes it to disk, keeps every lock, and answers **YES**. Otherwise it rolls back and answers **NO**.

**Phase 2 — commit (decision).**
3. If every vote is YES, the coordinator writes **COMMIT** to its own log and flushes it. That flush is the instant the transaction is committed. If any vote is NO, or a participant does not answer in time, the decision is **ABORT**.
4. The coordinator sends the decision to every participant; each one commits or rolls back locally, releases its locks and acknowledges. When all acknowledgements are in, the coordinator can forget the transaction.

📌 **Interview term: prepared state** — a participant has made its changes durable and promised to commit if told to. After a YES it may not change its mind on its own, even after a crash and restart: the prepared record in its log brings it back still prepared, still holding its locks.

📌 **Interview term: commit point** — the moment the coordinator decision becomes durable in its log. Before it, the outcome can still be abort; after it, the outcome is commit, even if every message after it is lost.

The happy path from the run, with the three databases at 2, 4 and 60 ms round trip:

~~~text
== 1. Happy path: all three vote YES
  orders    rtt  2 ms  vote YES -> COMMITTED locks held 63 ms
  payments  rtt  4 ms  vote YES -> COMMITTED locks held 63 ms
  inventory rtt 60 ms  vote YES -> COMMITTED locks held 63 ms
  votes in at t=61 ms, COMMIT forced at t=62 ms, client told OK at t=62 ms
  messages 12, forced log writes 7 (a single-database commit: 1 write, 1 ms)
~~~

Two numbers to take away. First, the client waits for the **slowest** participant: 62 ms, against 1 ms for a commit on a single database. Second, the orders database is 2 ms away but still holds its locks for 63 ms, because nobody may release anything until the 60 ms inventory vote is in and the decision has come back. Every participant pays the latency of the worst one.

A NO vote is the cheap case:

~~~text
== 2. One NO vote: payments cannot reserve funds
  orders    rtt  2 ms  vote YES -> ABORTED   locks held 7 ms
  payments  rtt  4 ms  vote NO  -> ABORTED   locks held 1 ms
  inventory rtt 60 ms  vote YES -> ABORTED   locks held 7 ms
  NO arrives at t=5 ms, ABORT forced at t=6 ms without waiting for inventory
~~~

The coordinator does not wait for the slow inventory vote: one NO is enough to decide ABORT at t=6 ms, and the NO voter released its locks after 1 ms.

## 4. The Big Drawback: Blocking

What if the coordinator dies after the votes but before the decision is durable?

~~~text
== 3. Coordinator crashes after collecting YES votes, before deciding
  orders    rtt  2 ms  vote YES -> PREPARED  still locked
  payments  rtt  4 ms  vote YES -> PREPARED  still locked
  inventory rtt 60 ms  vote YES -> PREPARED  still locked
  every participant is IN DOUBT: it voted YES, so it may not abort on its own
  termination protocol: ask peers -> orders=prepared, payments=prepared, inventory=prepared -> nobody knows the outcome
  coordinator down 30 s; 50 req/s need the locked stock row -> 1500 requests blocked
  recovery at t=30061 ms: no decision in the coordinator log -> presumed ABORT
  orders    rtt  2 ms  vote YES -> ABORTED   locks held 30062 ms
  payments  rtt  4 ms  vote YES -> ABORTED   locks held 30062 ms
  inventory rtt 60 ms  vote YES -> ABORTED   locks held 30062 ms
~~~

📌 **Interview term: in-doubt (uncertain) participant** — a participant that voted YES and has not heard the decision. It cannot commit (the coordinator might have decided ABORT because of a timeout) and it cannot abort (the coordinator might have logged COMMIT and told someone else). It must wait, with its locks held.

📌 **Interview term: blocking protocol** — a protocol where the failure of one node (here the coordinator) can stop the others from finishing. 2PC is blocking. In the run, a 30-second coordinator outage left every participant holding locks for 30062 ms, and the 50 requests per second that needed the locked stock row added up to 1500 blocked requests — they time out or queue, which can cascade into an outage of their own.

📌 **Interview term: cooperative termination protocol** — an in-doubt participant asks its peers. If any peer already received the decision, or voted NO, or never voted, the answer is known. If all of them are prepared too, as in the run, nobody knows, and they must keep waiting.

📌 **Interview term: presumed abort** — a common optimisation: if the coordinator recovers and finds no decision record, it answers ABORT. So the coordinator does not have to force-log anything for aborts, and the run recovers by aborting at t=30061 ms.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Participant states: working, prepared, then committed or aborted; the prepared state is the in doubt window">
  <defs>
    <marker id="sd08q1-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="85" width="140" height="56" rx="10"/>
  <text class="d-text" x="90" y="118" text-anchor="middle">working</text>
  <rect class="d-box-accent" x="250" y="75" width="190" height="76" rx="10"/>
  <text class="d-text" x="345" y="105" text-anchor="middle">prepared</text>
  <text class="d-sub" x="345" y="130" text-anchor="middle">in doubt, locks held</text>
  <rect class="d-box" x="540" y="20" width="160" height="56" rx="10"/>
  <text class="d-text" x="620" y="53" text-anchor="middle">committed</text>
  <rect class="d-box" x="540" y="154" width="160" height="56" rx="10"/>
  <text class="d-text" x="620" y="187" text-anchor="middle">aborted</text>
  <path class="d-edge" d="M 160 113 L 244 113" marker-end="url(#sd08q1-arrow2)"/>
  <path class="d-edge" d="M 440 95 L 534 50" marker-end="url(#sd08q1-arrow2)"/>
  <path class="d-edge" d="M 440 130 L 534 180" marker-end="url(#sd08q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 90 141 L 90 182 L 534 182" marker-end="url(#sd08q1-arrow2)"/>
</svg>

Only the coordinator decision moves a participant out of the prepared box. The dashed path is the free exit: before voting, a participant may abort on its own at any time.

## 5. Heuristic Decisions: When Humans Break the Rules

In real systems an operator, or a database timeout setting, sometimes gives up on an in-doubt transaction to free the locks. That is called a **heuristic** decision, and it can contradict the real outcome:

~~~text
== 4. COMMIT forced, coordinator crashes before sending it; payments gives up after 5 s
  orders    rtt  2 ms  vote YES -> COMMITTED locks held 30063 ms
  payments  rtt  4 ms  vote YES -> ABORTED   locks held 5000 ms
  inventory rtt 60 ms  vote YES -> COMMITTED locks held 30063 ms
  outcomes: committed + aborted -> atomicity broken (heuristic hazard)
~~~

📌 **Interview term: heuristic outcome / heuristic hazard** — a participant resolved an in-doubt transaction by itself (heuristic commit or heuristic rollback). If it guessed wrong, as payments did here, the transaction is no longer atomic: the order exists and the stock is gone, but the money was released. XA transaction managers report this as a heuristic-mixed exception, and someone has to repair it by hand.

On PostgreSQL the participant side is \`PREPARE TRANSACTION 'gid'\`, later \`COMMIT PREPARED 'gid'\` or \`ROLLBACK PREPARED 'gid'\` from any session; pending ones are listed in \`pg_prepared_xacts\`. The feature is off by default — \`max_prepared_transactions\` defaults to 0 — and the PostgreSQL manual advises leaving it off unless an external transaction manager resolves prepared transactions promptly, because a forgotten one keeps its locks and holds back VACUUM, even across restarts (PostgreSQL \`PREPARE TRANSACTION\` reference page). MySQL offers the same through \`XA START\`, \`XA PREPARE\`, \`XA COMMIT\`.

## 6. Why Teams Avoid 2PC Between Services

| Drawback | What it means in practice | Seen in the run |
| :--- | :--- | :--- |
| Blocking on coordinator failure | In-doubt participants keep locks until it recovers | 30 s outage, 1500 blocked requests |
| Latency of the slowest participant | Two round trips plus forced log writes on the commit path | 62 ms vs 1 ms locally |
| Locks held across the network | Contention and deadlocks grow with the slowest link | the 2 ms database held locks 63 ms |
| Every participant must support prepare | A Stripe charge or an email cannot be "prepared" | — |
| Coupled availability | The transaction needs every participant up at once | one slow region delays all |
| Heuristic outcomes | Manual overrides silently break atomicity | committed + aborted |

The availability point compounds: if each of three participants is up 99.9% of the time, a transaction needing all three at once is available about 99.7% of the time (0.999 cubed is 0.997). See [high availability](/interview-question/how-do-you-design-for-high-availability) for how such numbers add up, and [microservices vs a monolith](/interview-question/what-are-the-trade-offs-of-microservices-vs-a-monolith) for why "each service owns its database" makes 2PC hard in the first place.

## 7. Fixes and Alternatives

- **Make the coordinator highly available.** The blocking problem comes from a single coordinator. Google Spanner runs 2PC where each participant and the coordinator are themselves Paxos-replicated groups: the prepare record and the decision are logged through Paxos, so losing one machine does not lose the decision (Corbett et al., "Spanner", OSDI 2012, as summarised in MIT 6.824 and Princeton COS 418 lecture notes). Distributed SQL databases inside one system use the same idea; consensus is covered in [leader election](/interview-question/what-is-leader-election-in-distributed-systems).
- **Three-phase commit (3PC)** adds a pre-commit phase so participants can finish without the coordinator, but only if network delays are bounded. Under a network partition two sides can decide differently, so it is rarely used in practice (Dale Skeen; see the Wikipedia article on three-phase commit and its discussion of E3PC).
- **Avoid the distributed transaction.** Between services, the usual answer is a [saga](/interview-question/what-is-the-saga-pattern-for-distributed-transactions): a sequence of local transactions with compensating actions, accepting temporary inconsistency. When the problem is "write to my database and publish an event", the [transactional outbox](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure) gives atomicity with one local transaction.
- **Redraw the boundaries.** If two pieces of data must always change together, they often belong in the same database or service.

2PC is still the right tool inside a single distributed database (one vendor controls the coordinator and its recovery), and for XA between a database and a message broker in some enterprise stacks. It rarely fits across independently owned services. How 2PC relates to "exactly-once" message processing is discussed in [exactly-once processing with Kafka or SQS](/interview-question/exactly-once-processing-can-kafka-or-sqs-guarantee-it).

## 8. Verified: Running the Code

The example **"Two-phase commit on a fake clock: happy path, a NO vote, a coordinator crash and a heuristic abort"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Happy path: all three vote YES
  orders    rtt  2 ms  vote YES -> COMMITTED locks held 63 ms
  payments  rtt  4 ms  vote YES -> COMMITTED locks held 63 ms
  inventory rtt 60 ms  vote YES -> COMMITTED locks held 63 ms
  votes in at t=61 ms, COMMIT forced at t=62 ms, client told OK at t=62 ms
  messages 12, forced log writes 7 (a single-database commit: 1 write, 1 ms)

== 2. One NO vote: payments cannot reserve funds
  orders    rtt  2 ms  vote YES -> ABORTED   locks held 7 ms
  payments  rtt  4 ms  vote NO  -> ABORTED   locks held 1 ms
  inventory rtt 60 ms  vote YES -> ABORTED   locks held 7 ms
  NO arrives at t=5 ms, ABORT forced at t=6 ms without waiting for inventory

== 3. Coordinator crashes after collecting YES votes, before deciding
  orders    rtt  2 ms  vote YES -> PREPARED  still locked
  payments  rtt  4 ms  vote YES -> PREPARED  still locked
  inventory rtt 60 ms  vote YES -> PREPARED  still locked
  every participant is IN DOUBT: it voted YES, so it may not abort on its own
  termination protocol: ask peers -> orders=prepared, payments=prepared, inventory=prepared -> nobody knows the outcome
  coordinator down 30 s; 50 req/s need the locked stock row -> 1500 requests blocked
  recovery at t=30061 ms: no decision in the coordinator log -> presumed ABORT
  orders    rtt  2 ms  vote YES -> ABORTED   locks held 30062 ms
  payments  rtt  4 ms  vote YES -> ABORTED   locks held 30062 ms
  inventory rtt 60 ms  vote YES -> ABORTED   locks held 30062 ms

== 4. COMMIT forced, coordinator crashes before sending it; payments gives up after 5 s
  orders    rtt  2 ms  vote YES -> COMMITTED locks held 30063 ms
  payments  rtt  4 ms  vote YES -> ABORTED   locks held 5000 ms
  inventory rtt 60 ms  vote YES -> COMMITTED locks held 30063 ms
  outcomes: committed + aborted -> atomicity broken (heuristic hazard)
~~~

What the simulation stands for and what it leaves out: each participant is an object with a round-trip time and a vote; message delivery is half a round trip, and a forced log write costs 1 ms. Lock hold time is counted from the moment PREPARE arrives (real systems hold locks from the first write in the transaction, so the real hold is longer). There is no real network, disk, timeout tuning or acknowledgement handling, and the outage length and request rate are assumptions chosen for the example.

## Edge Cases Worth Knowing

- **Read-only participants** can vote "read-only" in phase 1 and skip phase 2 entirely — a standard optimisation.
- **Participant crash after voting YES**: on restart it finds the prepared record in its log, re-acquires the locks, and asks the coordinator for the decision.
- **Coordinator crash after the commit point**: on restart it reads COMMIT from its log and re-sends it; participants must treat a repeated COMMIT as harmless.
- **Timeouts before voting are safe**: a participant that has not voted, or a coordinator still collecting votes, may abort freely. Only the window after a YES is dangerous.

## Common Pitfalls

- **Calling 2PC "safe because it is atomic"** without mentioning blocking — the run shows every participant locked for 30 seconds by one crashed process.
- **Thinking the slow participant only slows itself** — the 2 ms orders database held its locks for 63 ms because of the 60 ms inventory database.
- **Letting a participant time out and abort after voting YES** — that is a heuristic decision and produced committed + aborted in the run.
- **Enabling \`max_prepared_transactions\` without a transaction manager that cleans up** — orphaned prepared transactions hold locks and block VACUUM indefinitely.
- **Proposing 2PC across third-party APIs** — a card charge or a sent email has no prepare step; use a saga with compensations instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Goal:</strong> <span style="color:#f0e2c8;">Two-phase commit gives <strong style="color:#ffca28;">atomic commit</strong> across several databases: all commit or all abort. A <strong style="color:#ffca28;">coordinator</strong> runs it; the databases are <strong style="color:#ffca28;">participants</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Phase 1:</strong> <span style="color:#f0e2c8;">The coordinator sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PREPARE</code>. Each participant makes its changes durable, keeps its locks, and votes YES or NO. A YES is a promise it cannot take back on its own.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Phase 2:</strong> <span style="color:#f0e2c8;">If all vote YES, the coordinator forces COMMIT to its log — the <strong style="color:#ffca28;">commit point</strong> — and tells everyone; any NO or timeout means ABORT. Participants apply it and release locks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Drawback:</strong> <span style="color:#f0e2c8;">It is <strong style="color:#ffca28;">blocking</strong>: if the coordinator dies after the votes, participants are <strong style="color:#ffca28;">in doubt</strong> and hold locks until it returns. It also costs two round trips to the <strong style="color:#ffca28;">slowest</strong> participant and ties the availability of every participant together.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What I would do:</strong> <span style="color:#f0e2c8;">Inside one distributed database, 2PC with a consensus-replicated coordinator is fine. Between services I would use a <strong style="color:#ffca28;">saga</strong> or the <strong style="color:#ffca28;">transactional outbox</strong> and design for eventual consistency.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a prepared participant not just abort after a timeout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the coordinator may already have logged COMMIT and told another participant, who committed. Aborting alone would leave a mixed outcome — in the example, orders and inventory committed while payments aborted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the coordinator recover after a crash?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It reads its log. A COMMIT or ABORT record is re-sent to every participant. With <strong style="color:#ffca28;">presumed abort</strong>, a transaction with no decision record is answered ABORT, so aborts need no forced log write.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does three-phase commit solve blocking?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only under the assumption of bounded network delay. It adds a pre-commit phase so participants can finish without the coordinator, but a network partition can make two groups decide differently, so it is rarely used. Replicating the coordinator with Paxos or Raft is the practical fix.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How much slower is 2PC than a local commit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At least two round trips to the slowest participant plus forced log writes on each side. In the example, 62 ms against 1 ms for a single-database commit, with every participant holding locks for 63 ms.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you still choose 2PC?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the participants are shards of one database whose vendor runs the coordinator and its recovery, or when strong atomicity matters more than availability and every participant supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PREPARE</code>. Across independently owned services, almost never.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Atomic commit | Changes on several machines all commit or all abort |
| Two-phase commit (2PC) | Prepare-and-vote, then a single commit or abort decision |
| Participant | A database holding part of the transaction |
| Coordinator | The process that collects votes and decides |
| Prepared state | Changes durable, locks held, promised to obey the decision |
| Commit point | When the coordinator decision is durable in its log |
| In-doubt participant | Voted YES, has not heard the decision |
| Blocking protocol | One node failure can stop the others from finishing |
| Cooperative termination protocol | In-doubt participants ask each other for the outcome |
| Presumed abort | No decision record on recovery means abort |
| Heuristic outcome | A participant decided alone and may contradict the real outcome |

**Conclusion:** Two-phase commit turns several local transactions into one atomic commit by first collecting durable YES votes and then broadcasting a single logged decision. The price is in the failure cases: participants that voted YES must wait for the coordinator, so one crashed process held every lock for 30 seconds in the run, and the protocol always pays the latency of the slowest participant — 62 ms against 1 ms locally. Use it where one system owns a replicated coordinator; between services, prefer sagas or the outbox and design for eventual consistency.`,
    examples: [
      {
        label: `Two-phase commit on a fake clock: happy path, a NO vote, a coordinator crash and a heuristic abort`,
        variants: [
          { tech: "node", code: `// Two-phase commit on a fake clock: one coordinator, three participants.
// Each participant is a separate database; "rtt" is the round trip to it in ms.
// A forced log write (fsync) costs 1 ms. No real network or disk is used.
const FSYNC = 1;

function makeParts(votes) {
  return [
    { name: "orders", rtt: 2, vote: votes[0], state: "init" },
    { name: "payments", rtt: 4, vote: votes[1], state: "init" },
    { name: "inventory", rtt: 60, vote: votes[2], state: "init" },
  ];
}

// Phase 1: send PREPARE, each participant forces a PREPARED (or ABORT) record and votes.
function phase1(parts) {
  let votesAt = 0;
  for (const p of parts) {
    p.lockedAt = p.rtt / 2; // PREPARE arrives; rows stay locked from here on
    p.state = p.vote === "YES" ? "prepared" : "aborted";
    if (p.vote === "NO") p.releasedAt = p.lockedAt + FSYNC; // a NO voter rolls back at once
    votesAt = Math.max(votesAt, p.rtt + FSYNC);
  }
  return votesAt;
}

// Phase 2: coordinator forces the decision, then tells everyone.
function phase2(parts, decision, decidedAt) {
  for (const p of parts) {
    if (p.releasedAt !== undefined) continue;
    if (p.state === "prepared") p.state = decision === "COMMIT" ? "committed" : "aborted";
    p.releasedAt = decidedAt + p.rtt / 2 + FSYNC;
  }
}

function show(parts) {
  for (const p of parts) {
    const held = p.releasedAt === undefined ? "still locked" : \`locks held \${p.releasedAt - p.lockedAt} ms\`;
    console.log(\`  \${p.name.padEnd(9)} rtt \${String(p.rtt).padStart(2)} ms  vote \${p.vote.padEnd(3)} -> \${p.state.toUpperCase().padEnd(9)} \${held}\`);
  }
}

console.log("== 1. Happy path: all three vote YES");
let parts = makeParts(["YES", "YES", "YES"]);
let votesAt = phase1(parts);
let decidedAt = votesAt + FSYNC;
phase2(parts, "COMMIT", decidedAt);
show(parts);
console.log(\`  votes in at t=\${votesAt} ms, COMMIT forced at t=\${decidedAt} ms, client told OK at t=\${decidedAt} ms\`);
console.log(\`  messages \${parts.length * 4}, forced log writes \${parts.length * 2 + 1} (a single-database commit: 1 write, \${FSYNC} ms)\`);

console.log("\\n== 2. One NO vote: payments cannot reserve funds");
parts = makeParts(["YES", "NO", "YES"]);
phase1(parts);
const noAt = parts[1].rtt + FSYNC; // the first NO is enough to decide
decidedAt = noAt + FSYNC;
phase2(parts, "ABORT", decidedAt);
show(parts);
console.log(\`  NO arrives at t=\${noAt} ms, ABORT forced at t=\${decidedAt} ms without waiting for inventory\`);

console.log("\\n== 3. Coordinator crashes after collecting YES votes, before deciding");
parts = makeParts(["YES", "YES", "YES"]);
votesAt = phase1(parts);
show(parts);
const outageMs = 30000;
const hotRowRps = 50;
console.log(\`  every participant is IN DOUBT: it voted YES, so it may not abort on its own\`);
const asked = parts.map((p) => \`\${p.name}=\${p.state}\`).join(", ");
console.log(\`  termination protocol: ask peers -> \${asked} -> nobody knows the outcome\`);
console.log(\`  coordinator down \${outageMs / 1000} s; \${hotRowRps} req/s need the locked stock row -> \${(outageMs / 1000) * hotRowRps} requests blocked\`);
const recoveredAt = votesAt + outageMs;
phase2(parts, "ABORT", recoveredAt); // log has no decision record -> presumed abort
console.log(\`  recovery at t=\${recoveredAt} ms: no decision in the coordinator log -> presumed ABORT\`);
show(parts);

console.log("\\n== 4. COMMIT forced, coordinator crashes before sending it; payments gives up after 5 s");
parts = makeParts(["YES", "YES", "YES"]);
votesAt = phase1(parts);
decidedAt = votesAt + FSYNC;
parts[1].state = "aborted"; // heuristic decision: an operator or timeout rolled it back
parts[1].releasedAt = parts[1].lockedAt + 5000;
const restartAt = decidedAt + outageMs;
for (const p of parts) {
  if (p.state === "prepared") { p.state = "committed"; p.releasedAt = restartAt + p.rtt / 2 + FSYNC; }
}
show(parts);
const outcomes = new Set(parts.map((p) => p.state));
console.log(\`  outcomes: \${[...outcomes].join(" + ")} -> atomicity broken (heuristic hazard)\`);` },
          { tech: "python", code: `# Two-phase commit on a fake clock: one coordinator, three participants.
# Each participant is a separate database; "rtt" is the round trip to it in ms.
# A forced log write (fsync) costs 1 ms. No real network or disk is used.
FSYNC = 1


def make_parts(votes):
    return [
        {"name": "orders", "rtt": 2, "vote": votes[0], "state": "init"},
        {"name": "payments", "rtt": 4, "vote": votes[1], "state": "init"},
        {"name": "inventory", "rtt": 60, "vote": votes[2], "state": "init"},
    ]


# Phase 1: send PREPARE, each participant forces a PREPARED (or ABORT) record and votes.
def phase1(parts):
    votes_at = 0
    for p in parts:
        p["locked_at"] = p["rtt"] // 2  # PREPARE arrives; rows stay locked from here on
        p["state"] = "prepared" if p["vote"] == "YES" else "aborted"
        if p["vote"] == "NO":
            p["released_at"] = p["locked_at"] + FSYNC  # a NO voter rolls back at once
        votes_at = max(votes_at, p["rtt"] + FSYNC)
    return votes_at


# Phase 2: coordinator forces the decision, then tells everyone.
def phase2(parts, decision, decided_at):
    for p in parts:
        if "released_at" in p:
            continue
        if p["state"] == "prepared":
            p["state"] = "committed" if decision == "COMMIT" else "aborted"
        p["released_at"] = decided_at + p["rtt"] // 2 + FSYNC


def show(parts):
    for p in parts:
        held = f"locks held {p['released_at'] - p['locked_at']} ms" if "released_at" in p else "still locked"
        print(f"  {p['name']:<9} rtt {p['rtt']:>2} ms  vote {p['vote']:<3} -> {p['state'].upper():<9} {held}")


print("== 1. Happy path: all three vote YES")
parts = make_parts(["YES", "YES", "YES"])
votes_at = phase1(parts)
decided_at = votes_at + FSYNC
phase2(parts, "COMMIT", decided_at)
show(parts)
print(f"  votes in at t={votes_at} ms, COMMIT forced at t={decided_at} ms, client told OK at t={decided_at} ms")
print(f"  messages {len(parts) * 4}, forced log writes {len(parts) * 2 + 1} (a single-database commit: 1 write, {FSYNC} ms)")

print("\\n== 2. One NO vote: payments cannot reserve funds")
parts = make_parts(["YES", "NO", "YES"])
phase1(parts)
no_at = parts[1]["rtt"] + FSYNC  # the first NO is enough to decide
decided_at = no_at + FSYNC
phase2(parts, "ABORT", decided_at)
show(parts)
print(f"  NO arrives at t={no_at} ms, ABORT forced at t={decided_at} ms without waiting for inventory")

print("\\n== 3. Coordinator crashes after collecting YES votes, before deciding")
parts = make_parts(["YES", "YES", "YES"])
votes_at = phase1(parts)
show(parts)
outage_ms = 30000
hot_row_rps = 50
print("  every participant is IN DOUBT: it voted YES, so it may not abort on its own")
asked = ", ".join(f"{p['name']}={p['state']}" for p in parts)
print(f"  termination protocol: ask peers -> {asked} -> nobody knows the outcome")
print(f"  coordinator down {outage_ms // 1000} s; {hot_row_rps} req/s need the locked stock row -> {(outage_ms // 1000) * hot_row_rps} requests blocked")
recovered_at = votes_at + outage_ms
phase2(parts, "ABORT", recovered_at)  # log has no decision record -> presumed abort
print(f"  recovery at t={recovered_at} ms: no decision in the coordinator log -> presumed ABORT")
show(parts)

print("\\n== 4. COMMIT forced, coordinator crashes before sending it; payments gives up after 5 s")
parts = make_parts(["YES", "YES", "YES"])
votes_at = phase1(parts)
decided_at = votes_at + FSYNC
parts[1]["state"] = "aborted"  # heuristic decision: an operator or timeout rolled it back
parts[1]["released_at"] = parts[1]["locked_at"] + 5000
restart_at = decided_at + outage_ms
for p in parts:
    if p["state"] == "prepared":
        p["state"] = "committed"
        p["released_at"] = restart_at + p["rtt"] // 2 + FSYNC
show(parts)
outcomes = list(dict.fromkeys(p["state"] for p in parts))
print(f"  outcomes: {' + '.join(outcomes)} -> atomicity broken (heuristic hazard)")` },
        ],
      },
    ],
  },
  {
    title: `What is the saga pattern for distributed transactions?`,
    difficulty: "medium",
    seoDescription: `The saga pattern explained: local transactions with compensations, orchestration vs choreography, idempotent retries, the isolation gap and fixes.`,
    description: `**Question presented to candidate:**
"Placing an order touches three services, each with its own database: inventory, payments and shipping. We cannot use one database transaction across them. Explain the saga pattern, how it undoes work when a later step fails, and what guarantees you lose compared with a normal ACID transaction."

**What a strong answer should cover:**
- A saga is a sequence of **local transactions**, one per service, each with a **compensating transaction** that semantically undoes it; on failure, the compensations of the completed steps run in **reverse order**
- **Orchestration** (a central coordinator tells each service what to do and keeps a saga log) vs **choreography** (services react to each other events) and when each fits
- Steps and compensations must be **idempotent** and retryable, because messages are delivered at least once and the coordinator can crash; a compensation must eventually succeed
- Sagas give atomicity in the end (all steps or all compensations) and durability, but **no isolation**: other requests see intermediate states — dirty reads and lost updates are possible
- Countermeasures: **semantic locks** (a PENDING status), commutative updates, putting the riskiest or irreversible step last (**pivot transaction**), rereading values
- Each step should publish its event reliably, usually via the transactional outbox

**Clarifying questions expected:**
- Which steps cannot be undone (an email sent, goods shipped), so they can be placed last?
- Is a few seconds of visible intermediate state acceptable to the business, for example stock that looks reserved and later reappears?

**Code / implementation expected:** Optional — a clear explanation of steps and compensations; the example runs an orchestrated saga through failures, retries and a crash.`,
    answer: `**Target Audience:** Developers who build or interview for microservice back ends. You know what a database transaction is; no distributed-systems background assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

You plan a trip: book a flight, then a hotel, then a rental car. Each booking is its own website with its own confirmation. No travel agent can make the three websites commit "all or nothing" together. So you do the sensible thing: book them one at a time, and if the car is unavailable, you **cancel the hotel and then the flight** — in reverse order — accepting a cancellation fee as the price of not being stuck with half a trip.

That is a saga. The cancellations are compensations. And while you were halfway through, the hotel room really was taken: someone else searching that evening saw it as unavailable, even though you later cancelled. That last detail is the main thing sagas give up.

📌 **Interview term: saga** — a long business transaction split into a sequence of local transactions T1, T2, ... Tn, each committed in one service, where each Ti has a compensating transaction Ci. Either all of T1..Tn complete, or the completed ones are undone by running their compensations in reverse. The idea comes from Hector Garcia-Molina and Kenneth Salem, "Sagas", ACM SIGMOD 1987, written for long-lived transactions inside one database.

📌 **Interview term: compensating transaction** — an action that **semantically** undoes a committed step: a refund for a charge, a release for a reservation. It does not restore the old bytes; the charge and the refund both stay in the payment history.

## 2. Why Not Just Use One Transaction?

Each service owns its database, so there is no single transaction to open. [Two-phase commit](/interview-question/what-is-two-phase-commit-and-its-drawbacks) could span them, but it locks rows across the network, blocks when the coordinator fails, needs every participant to support a prepare step (a card network does not), and couples the availability of every service. Sagas trade isolation for availability and loose coupling: each step commits on its own and releases its locks immediately.

## 3. A Saga, Step by Step

The order saga in the example:

| Step | Local transaction (service) | Compensation |
| :--- | :--- | :--- |
| T0 | create order as \`PENDING\` (orders) | mark order \`REJECTED\` |
| T1 | reserve 1 lamp (inventory) | release the reservation |
| T2 | charge the card 40 (payments) | refund the charge |
| T3 | schedule shipping (shipping) | cancel the shipment |
| end | mark order \`APPROVED\` | — |

Happy path from the run:

~~~text
== 1. Happy path
  T1 reserveStock ok
  T2 chargeCard ok
  T3 scheduleShipping ok
  result APPROVED
  -> order o1 APPROVED; lamp stock 0; money held 40; charges 1; shipments 1
~~~

Now shipping fails, and the refund API happens to be down:

~~~text
== 2. Step 3 fails, and the refund API is down twice
  T1 reserveStock ok
  T2 chargeCard ok
  T3 scheduleShipping FAILED: no courier for this address -> compensate in reverse
  C2 undo chargeCard error: payments API 503, retry in 100 ms
  C2 undo chargeCard error: payments API 503, retry in 200 ms
  C2 undo chargeCard ok (attempt 3)
  C1 undo reserveStock ok (attempt 1)
  result REJECTED
  -> order o2 REJECTED; lamp stock 1; money held 0; charges 0; shipments 0
~~~

📌 **Interview term: backward recovery** — on failure, run the compensations of the completed steps in reverse (C2, then C1). The alternative, **forward recovery**, retries the failed step until it succeeds; it fits steps that can only fail transiently.

A compensation is not allowed to give up: the run retried the refund with backoff (100 ms, 200 ms) until the third attempt worked. If a compensation can fail permanently, the saga cannot restore consistency and a human must step in, so design compensations that can always succeed eventually (a refund can be retried; "un-sending" an email cannot).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Saga with failure: T1 and T2 succeed, T3 fails, then C2 and C1 run in reverse order">
  <defs>
    <marker id="sd08q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="170" height="56" rx="10"/>
  <text class="d-text" x="105" y="55" text-anchor="middle">T1 reserve</text>
  <text class="d-sub" x="105" y="75" text-anchor="middle">inventory</text>
  <rect class="d-box" x="275" y="30" width="170" height="56" rx="10"/>
  <text class="d-text" x="360" y="55" text-anchor="middle">T2 charge</text>
  <text class="d-sub" x="360" y="75" text-anchor="middle">payments</text>
  <rect class="d-box-muted" x="530" y="30" width="170" height="56" rx="10"/>
  <text class="d-text" x="615" y="55" text-anchor="middle">T3 ship</text>
  <text class="d-sub" x="615" y="75" text-anchor="middle">fails</text>
  <rect class="d-box-accent" x="275" y="140" width="170" height="56" rx="10"/>
  <text class="d-text" x="360" y="165" text-anchor="middle">C2 refund</text>
  <text class="d-sub" x="360" y="185" text-anchor="middle">retried until ok</text>
  <rect class="d-box-accent" x="20" y="140" width="170" height="56" rx="10"/>
  <text class="d-text" x="105" y="165" text-anchor="middle">C1 release</text>
  <text class="d-sub" x="105" y="185" text-anchor="middle">inventory</text>
  <path class="d-edge" d="M 190 58 L 269 58" marker-end="url(#sd08q2-arrow)"/>
  <path class="d-edge" d="M 445 58 L 524 58" marker-end="url(#sd08q2-arrow)"/>
  <path class="d-edge-dashed" d="M 615 86 L 615 168 L 451 168" marker-end="url(#sd08q2-arrow)"/>
  <path class="d-edge-dashed" d="M 275 168 L 196 168" marker-end="url(#sd08q2-arrow)"/>
</svg>

Forward arrows are the steps; dashed arrows are the compensation path, which visits completed steps in reverse.

## 4. Orchestration vs Choreography

📌 **Interview term: orchestration** — a central **saga orchestrator** (a service or a workflow engine) tells each participant what to do next and records progress in a **saga log**. The flow lives in one place, which makes it easy to read, test and monitor. The example is orchestrated.

📌 **Interview term: choreography** — no coordinator: each service listens for events and reacts. Inventory hears \`OrderCreated\` and emits \`StockReserved\`; payments hears that and emits \`PaymentCharged\` or \`PaymentFailed\`; inventory hears \`PaymentFailed\` and releases. Built on [publish-subscribe](/interview-question/what-is-the-publish-subscribe-pattern) messaging.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 210" role="img" aria-label="Orchestration: one orchestrator sends commands to three services and receives replies">
  <defs>
    <marker id="sd08q2-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="60" rx="10"/>
  <text class="d-text" x="360" y="47" text-anchor="middle">orchestrator</text>
  <text class="d-sub" x="360" y="68" text-anchor="middle">saga log</text>
  <rect class="d-box" x="20" y="140" width="170" height="50" rx="10"/>
  <text class="d-text" x="105" y="170" text-anchor="middle">inventory</text>
  <rect class="d-box" x="275" y="140" width="170" height="50" rx="10"/>
  <text class="d-text" x="360" y="170" text-anchor="middle">payments</text>
  <rect class="d-box" x="530" y="140" width="170" height="50" rx="10"/>
  <text class="d-text" x="615" y="170" text-anchor="middle">shipping</text>
  <path class="d-edge" d="M 280 80 L 130 134" marker-end="url(#sd08q2-arrow2)"/>
  <path class="d-edge" d="M 360 80 L 360 134" marker-end="url(#sd08q2-arrow2)"/>
  <path class="d-edge" d="M 440 80 L 590 134" marker-end="url(#sd08q2-arrow2)"/>
</svg>

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="Choreography: services react to each other events through a broker with no central coordinator">
  <defs>
    <marker id="sd08q2-arrow3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="45" width="130" height="56" rx="10"/>
  <text class="d-text" x="85" y="78" text-anchor="middle">orders</text>
  <rect class="d-box" x="200" y="45" width="130" height="56" rx="10"/>
  <text class="d-text" x="265" y="78" text-anchor="middle">inventory</text>
  <rect class="d-box" x="380" y="45" width="130" height="56" rx="10"/>
  <text class="d-text" x="445" y="78" text-anchor="middle">payments</text>
  <rect class="d-box" x="560" y="45" width="130" height="56" rx="10"/>
  <text class="d-text" x="625" y="78" text-anchor="middle">shipping</text>
  <path class="d-edge-dashed" d="M 150 73 L 194 73" marker-end="url(#sd08q2-arrow3)"/>
  <path class="d-edge-dashed" d="M 330 73 L 374 73" marker-end="url(#sd08q2-arrow3)"/>
  <path class="d-edge-dashed" d="M 510 73 L 554 73" marker-end="url(#sd08q2-arrow3)"/>
</svg>

In choreography each dashed arrow is an event on a broker, and the failure path runs the same way backwards with events such as \`PaymentFailed\`. No single service knows the whole flow.

| | Orchestration | Choreography |
| :--- | :--- | :--- |
| Where the flow lives | one orchestrator | spread across services |
| Adding a step | change the orchestrator | add a listener, hope no cycle appears |
| Visibility | one saga log shows each order state | reconstruct from events and traces |
| Coupling | services depend on the orchestrator commands | services depend on each other events |
| Good for | 4+ steps, branching, timeouts, compensations | 2-3 simple steps, very loose coupling |

Workflow engines provide orchestration as a product: AWS Prescriptive Guidance documents a serverless saga built on AWS Step Functions, where a state machine calls each action and routes failures to compensating actions, and Temporal workflows register a compensation after each completed activity (AWS Prescriptive Guidance "Implement the serverless saga pattern by using AWS Step Functions"; Temporal community forum).

## 5. Crashes, Retries and Idempotency

The orchestrator itself can crash between "step done" and "step written to the saga log". On restart it can only trust the log, so it **runs that step again**:

~~~text
== 3. Orchestrator crashes after chargeCard, restarts, replays the last step
  T1 reserveStock ok
  T2 chargeCard ok
  !! orchestrator crashes before logging it; saga log has done=[reserveStock]
  restart: resume from the saga log at chargeCard
  T2 chargeCard ok
  T3 scheduleShipping ok
  result APPROVED
  -> order o3 APPROVED; lamp stock 0; money held 40; charges 1; shipments 1
  chargeCard was called 2 times; the idempotency key kept it to one charge of 40
~~~

The replay was safe only because the payments service deduplicates by an **idempotency key** derived from the order id (\`charge-o3\`): two calls, one charge. Without it the customer would be charged 80. Every step and every compensation in a saga must be idempotent, and compensations must tolerate "nothing to undo" (C1 in the example returns quietly if there is no reservation). Details in [idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter) and the applied case in [making payments reliable against retries](/interview-question/how-do-you-make-a-payment-system-reliable-against-retries).

Each step also has to update its database **and** emit its reply or event. Doing those as two separate writes is the dual-write problem; the standard fix is the [transactional outbox](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure).

## 6. The Isolation Gap

ACID has four letters; a saga keeps A (eventually all or nothing), C (if each step preserves the invariants) and D, but drops **I**:

~~~text
== 4. No isolation: a second shopper reads stock while saga o4 is in flight
  shopper B sees lamp stock 0 and order o4 PENDING -> told "sold out"
  T2 chargeCard ok
  T3 scheduleShipping FAILED: no courier for this address -> compensate in reverse
  C2 undo chargeCard ok (attempt 1)
  C1 undo reserveStock ok (attempt 1)
  result REJECTED
  after compensation lamp stock is 1: B lost a sale that was never final
~~~

Shopper B read stock that saga o4 had reserved but later released. B was told "sold out" for a lamp that was in fact available — a **dirty read** of an intermediate state.

📌 **Interview term: lack of isolation** — other transactions can see and act on the intermediate states of a running saga. Typical anomalies: **dirty reads** (reading a change that will be compensated), **lost updates** (a saga overwrites a change another saga made in between), and **fuzzy reads** (two reads in one saga see different values).

Countermeasures, as catalogued by Chris Richardson in his saga pattern material on microservices.io:

📌 **Interview term: semantic lock** — an application-level flag such as status \`PENDING\` that tells other requests the record is in flux. They can wait, fail, or treat it carefully (the UI shows "reserved, may become available").

📌 **Interview term: pivot transaction** — the go/no-go step after which the saga will only move forward. Put risky checks and compensatable steps before it, and irreversible steps (send the parcel, send the email) after it, where they are only ever retried, never undone.

- **Commutative updates**: design steps so order does not matter (debit and credit amounts rather than "set balance to X").
- **Pessimistic view**: reorder steps so the ones most harmful to read early happen last.
- **Reread value**: before updating, re-read and check the record has not changed (optimistic concurrency, as in [optimistic vs pessimistic locking](/interview-question/what-is-the-difference-between-optimistic-and-pessimistic-locking)).

## 7. Verified: Running the Code

The example **"Orchestrated order saga: compensations in reverse, retried refunds, idempotent replay and the isolation gap"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Happy path
  T1 reserveStock ok
  T2 chargeCard ok
  T3 scheduleShipping ok
  result APPROVED
  -> order o1 APPROVED; lamp stock 0; money held 40; charges 1; shipments 1

== 2. Step 3 fails, and the refund API is down twice
  T1 reserveStock ok
  T2 chargeCard ok
  T3 scheduleShipping FAILED: no courier for this address -> compensate in reverse
  C2 undo chargeCard error: payments API 503, retry in 100 ms
  C2 undo chargeCard error: payments API 503, retry in 200 ms
  C2 undo chargeCard ok (attempt 3)
  C1 undo reserveStock ok (attempt 1)
  result REJECTED
  -> order o2 REJECTED; lamp stock 1; money held 0; charges 0; shipments 0

== 3. Orchestrator crashes after chargeCard, restarts, replays the last step
  T1 reserveStock ok
  T2 chargeCard ok
  !! orchestrator crashes before logging it; saga log has done=[reserveStock]
  restart: resume from the saga log at chargeCard
  T2 chargeCard ok
  T3 scheduleShipping ok
  result APPROVED
  -> order o3 APPROVED; lamp stock 0; money held 40; charges 1; shipments 1
  chargeCard was called 2 times; the idempotency key kept it to one charge of 40

== 4. No isolation: a second shopper reads stock while saga o4 is in flight
  shopper B sees lamp stock 0 and order o4 PENDING -> told "sold out"
  T2 chargeCard ok
  T3 scheduleShipping FAILED: no courier for this address -> compensate in reverse
  C2 undo chargeCard ok (attempt 1)
  C1 undo reserveStock ok (attempt 1)
  result REJECTED
  after compensation lamp stock is 1: B lost a sale that was never final
~~~

What the simulation stands for and what it leaves out: each service database is a Map (a dict in Python), each step is a function that changes it atomically, and the saga log is an in-memory array. The "refund API down twice" is a counter, the backoff delays are printed but not slept, and the crash is a return before the log write. There is no real network, broker, timeout, or concurrent execution; the isolation anomaly is shown by reading state between two steps.

## Edge Cases Worth Knowing

- **Timeouts are ambiguous**: a step that timed out may have succeeded. Retry it with the same idempotency key, or query its status, before compensating.
- **Compensation for a step that never ran**: a reply can be lost after the step committed, so the orchestrator may compensate something it believes failed. Compensations must handle "never happened" and "happened".
- **Concurrent sagas on the same entity**: two sagas reserving the last unit both pass their checks unless the reservation itself is atomic in the inventory database.
- **Long-running sagas** (hours, days) need persistent timers and a clear user-visible status, which workflow engines provide.

## Common Pitfalls

- **Assuming a saga is a distributed ACID transaction** — it has no isolation; the run shows a shopper turned away by a reservation that was later released.
- **Non-idempotent steps** — the orchestrator replay after a crash called \`chargeCard\` twice; only the idempotency key kept it to one charge.
- **Compensations that can fail for good** — the refund had to be retried three times; design every compensation to succeed eventually, or escalate to a human queue.
- **Placing irreversible steps early** — shipping or emailing before the payment succeeds leaves nothing to compensate with; put them after the pivot.
- **Updating the database and publishing the event as two writes** — use an outbox, or the saga loses steps when a service crashes in between.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A saga splits a business transaction across services into <strong style="color:#ffca28;">local transactions</strong>, each with a <strong style="color:#ffca28;">compensating transaction</strong> that semantically undoes it. If a step fails, the completed steps are compensated in reverse order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Coordination:</strong> <span style="color:#f0e2c8;">With <strong style="color:#ffca28;">orchestration</strong>, a coordinator drives the steps and keeps a saga log; with <strong style="color:#ffca28;">choreography</strong>, services react to each other events. I prefer orchestration beyond two or three steps because the flow is visible in one place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reliability:</strong> <span style="color:#f0e2c8;">Messages arrive at least once and the orchestrator can crash and replay, so every step and compensation is <strong style="color:#ffca28;">idempotent</strong>, keyed by the saga id, and compensations are retried until they succeed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Isolation:</strong> <span style="color:#f0e2c8;">Sagas give eventual atomicity but <strong style="color:#ffca28;">no isolation</strong>: others can see intermediate states. I use a <strong style="color:#ffca28;">semantic lock</strong> such as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PENDING</code> status, commutative updates, and put irreversible steps after the <strong style="color:#ffca28;">pivot</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Plumbing:</strong> <span style="color:#f0e2c8;">Each step updates its database and emits its event through a <strong style="color:#ffca28;">transactional outbox</strong>, so a crash cannot lose or invent a step.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not two-phase commit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">2PC holds locks across the network, blocks when the coordinator dies, needs every participant to support prepare, and makes the whole transaction only as available as its least available participant. Third-party APIs such as card networks cannot take part at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a compensation fails?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is retried with backoff because it must eventually succeed; in the example the refund worked on the third attempt. If it can fail permanently, the saga parks in a failed state and alerts a human — which is why compensations are designed to be always possible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a step that timed out?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A timeout does not mean it failed. Retry with the same idempotency key, or ask the service for the status, and only compensate once you know. Compensations must also accept the case where the step never happened.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Choreography or orchestration for a 6-step checkout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Orchestration. With six steps and branching compensations, choreography spreads the flow across services and makes cycles and missing handlers hard to see; an orchestrator or a workflow engine such as Step Functions or Temporal gives one log per order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop a user from seeing stock that will reappear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <strong style="color:#ffca28;">semantic lock</strong>: mark the reservation <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PENDING</code> and let the UI and other sagas treat it as tentative. Shorten the window by doing quick, likely-to-fail checks first and the slow or irreversible steps last.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Saga | Sequence of local transactions with compensations |
| Compensating transaction | Semantically undoes a committed step |
| Backward recovery | Compensate completed steps in reverse |
| Orchestration | A coordinator drives the saga and logs progress |
| Choreography | Services react to each other events |
| Lack of isolation | Others can see intermediate saga states |
| Semantic lock | An application flag such as PENDING marking data in flux |
| Pivot transaction | The step after which the saga only moves forward |

**Conclusion:** A saga replaces one impossible cross-service transaction with a chain of local transactions and their compensations, so each service commits independently and the whole either completes or is undone in reverse. The run showed the parts that make it work in practice: compensations retried until they succeed, an orchestrator replay made safe by an idempotency key (two calls, one charge), and the price you pay — no isolation, so a shopper was turned away by a reservation that was later released. Orchestrate anything non-trivial, make every step idempotent, publish through an outbox, and put irreversible steps last.`,
    examples: [
      {
        label: `Orchestrated order saga: compensations in reverse, retried refunds, idempotent replay and the isolation gap`,
        variants: [
          { tech: "node", code: `// An orchestrated saga for "place order": three services, each with its own local
// database (a Map). Each step is a local transaction; each has a compensation.
// The saga log is an array the orchestrator persists after every step.
function makeWorld() {
  return {
    orders: new Map(),
    stock: new Map([["lamp", 1]]),
    reservations: new Map(),
    payments: new Map(), // idempotency key -> charge
    balance: 0,
    shipments: new Map(),
    refundOutages: 0,
    chargeCalls: 0,
  };
}

const steps = [
  { name: "reserveStock", act: (w, o) => {
      const left = w.stock.get(o.item);
      if (left < 1) throw new Error("out of stock");
      w.stock.set(o.item, left - 1); w.reservations.set(o.id, o.item);
    }, undo: (w, o) => {
      if (!w.reservations.has(o.id)) return; // idempotent: nothing to release
      w.reservations.delete(o.id); w.stock.set(o.item, w.stock.get(o.item) + 1);
    } },
  { name: "chargeCard", act: (w, o) => {
      w.chargeCalls++;
      const key = \`charge-\${o.id}\`; // idempotency key: a retry cannot charge twice
      if (!w.payments.has(key)) { w.payments.set(key, o.amount); w.balance += o.amount; }
    }, undo: (w, o) => {
      if (w.refundOutages > 0) { w.refundOutages--; throw new Error("payments API 503"); }
      const key = \`charge-\${o.id}\`;
      if (w.payments.has(key)) { w.balance -= w.payments.get(key); w.payments.delete(key); }
    } },
  { name: "scheduleShipping", act: (w, o) => {
      if (o.noCourier) throw new Error("no courier for this address");
      w.shipments.set(o.id, "scheduled");
    }, undo: (w, o) => { w.shipments.delete(o.id); } },
];

function runSaga(w, o, log, crashAfter) {
  w.orders.set(o.id, "PENDING"); // semantic lock: others see the order is not final
  for (let i = log.done.length; i < steps.length; i++) {
    try {
      steps[i].act(w, o);
      console.log(\`  T\${i + 1} \${steps[i].name} ok\`);
      if (crashAfter === steps[i].name) { console.log(\`  !! orchestrator crashes before logging it; saga log has done=[\${log.done.join(",")}]\`); return "CRASHED"; }
      log.done.push(steps[i].name);
    } catch (e) {
      console.log(\`  T\${i + 1} \${steps[i].name} FAILED: \${e.message} -> compensate in reverse\`);
      for (let j = log.done.length - 1; j >= 0; j--) {
        for (let attempt = 1; ; attempt++) { // a compensation must eventually succeed
          try { steps[j].undo(w, o); console.log(\`  C\${j + 1} undo \${steps[j].name} ok (attempt \${attempt})\`); break; }
          catch (err) { console.log(\`  C\${j + 1} undo \${steps[j].name} error: \${err.message}, retry in \${100 * 2 ** (attempt - 1)} ms\`); }
        }
      }
      w.orders.set(o.id, "REJECTED");
      return "REJECTED";
    }
  }
  w.orders.set(o.id, "APPROVED");
  return "APPROVED";
}

function summary(w, o) {
  console.log(\`  -> order \${o.id} \${w.orders.get(o.id)}; lamp stock \${w.stock.get("lamp")}; money held \${w.balance}; charges \${w.payments.size}; shipments \${w.shipments.size}\`);
}

console.log("== 1. Happy path");
let w = makeWorld();
let o = { id: "o1", item: "lamp", amount: 40 };
console.log("  result " + runSaga(w, o, { done: [] }));
summary(w, o);

console.log("\\n== 2. Step 3 fails, and the refund API is down twice");
w = makeWorld(); w.refundOutages = 2;
o = { id: "o2", item: "lamp", amount: 40, noCourier: true };
let log = { done: [] };
const sagaResult = runSaga(w, o, log);
console.log("  result " + sagaResult);
summary(w, o);

console.log("\\n== 3. Orchestrator crashes after chargeCard, restarts, replays the last step");
w = makeWorld();
o = { id: "o3", item: "lamp", amount: 40 };
log = { done: [] };
runSaga(w, o, log, "chargeCard");
console.log("  restart: resume from the saga log at " + steps[log.done.length].name);
console.log("  result " + runSaga(w, o, log));
summary(w, o);
console.log(\`  chargeCard was called \${w.chargeCalls} times; the idempotency key kept it to one charge of \${w.balance}\`);

console.log("\\n== 4. No isolation: a second shopper reads stock while saga o4 is in flight");
w = makeWorld();
o = { id: "o4", item: "lamp", amount: 40, noCourier: true };
w.orders.set(o.id, "PENDING");
steps[0].act(w, o); // T1 of o4 committed locally, stock is now 0
console.log(\`  shopper B sees lamp stock \${w.stock.get("lamp")} and order o4 \${w.orders.get("o4")} -> told "sold out"\`);
log = { done: ["reserveStock"] };
console.log("  result " + runSaga(w, o, log));
console.log(\`  after compensation lamp stock is \${w.stock.get("lamp")}: B lost a sale that was never final\`);` },
          { tech: "python", code: `# An orchestrated saga for "place order": three services, each with its own local
# database (a dict). Each step is a local transaction; each has a compensation.
# The saga log is a list the orchestrator persists after every step.


def make_world():
    return {
        "orders": {},
        "stock": {"lamp": 1},
        "reservations": {},
        "payments": {},  # idempotency key -> charge
        "balance": 0,
        "shipments": {},
        "refund_outages": 0,
        "charge_calls": 0,
    }


def reserve(w, o):
    left = w["stock"][o["item"]]
    if left < 1:
        raise RuntimeError("out of stock")
    w["stock"][o["item"]] = left - 1
    w["reservations"][o["id"]] = o["item"]


def release(w, o):
    if o["id"] not in w["reservations"]:
        return  # idempotent: nothing to release
    del w["reservations"][o["id"]]
    w["stock"][o["item"]] += 1


def charge(w, o):
    w["charge_calls"] += 1
    key = f"charge-{o['id']}"  # idempotency key: a retry cannot charge twice
    if key not in w["payments"]:
        w["payments"][key] = o["amount"]
        w["balance"] += o["amount"]


def refund(w, o):
    if w["refund_outages"] > 0:
        w["refund_outages"] -= 1
        raise RuntimeError("payments API 503")
    key = f"charge-{o['id']}"
    if key in w["payments"]:
        w["balance"] -= w["payments"].pop(key)


def ship(w, o):
    if o.get("no_courier"):
        raise RuntimeError("no courier for this address")
    w["shipments"][o["id"]] = "scheduled"


def unship(w, o):
    w["shipments"].pop(o["id"], None)


steps = [("reserveStock", reserve, release), ("chargeCard", charge, refund), ("scheduleShipping", ship, unship)]


def run_saga(w, o, log, crash_after=None):
    w["orders"][o["id"]] = "PENDING"  # semantic lock: others see the order is not final
    for i in range(len(log["done"]), len(steps)):
        name, act, _ = steps[i]
        try:
            act(w, o)
            print(f"  T{i + 1} {name} ok")
            if crash_after == name:
                print(f"  !! orchestrator crashes before logging it; saga log has done=[{','.join(log['done'])}]")
                return "CRASHED"
            log["done"].append(name)
        except RuntimeError as e:
            print(f"  T{i + 1} {name} FAILED: {e} -> compensate in reverse")
            for j in range(len(log["done"]) - 1, -1, -1):
                attempt = 1
                while True:  # a compensation must eventually succeed
                    try:
                        steps[j][2](w, o)
                        print(f"  C{j + 1} undo {steps[j][0]} ok (attempt {attempt})")
                        break
                    except RuntimeError as err:
                        print(f"  C{j + 1} undo {steps[j][0]} error: {err}, retry in {100 * 2 ** (attempt - 1)} ms")
                        attempt += 1
            w["orders"][o["id"]] = "REJECTED"
            return "REJECTED"
    w["orders"][o["id"]] = "APPROVED"
    return "APPROVED"


def summary(w, o):
    print(f"  -> order {o['id']} {w['orders'][o['id']]}; lamp stock {w['stock']['lamp']}; money held {w['balance']}; "
          f"charges {len(w['payments'])}; shipments {len(w['shipments'])}")


print("== 1. Happy path")
w = make_world()
o = {"id": "o1", "item": "lamp", "amount": 40}
print("  result " + run_saga(w, o, {"done": []}))
summary(w, o)

print("\\n== 2. Step 3 fails, and the refund API is down twice")
w = make_world()
w["refund_outages"] = 2
o = {"id": "o2", "item": "lamp", "amount": 40, "no_courier": True}
log = {"done": []}
saga_result = run_saga(w, o, log)
print("  result " + saga_result)
summary(w, o)

print("\\n== 3. Orchestrator crashes after chargeCard, restarts, replays the last step")
w = make_world()
o = {"id": "o3", "item": "lamp", "amount": 40}
log = {"done": []}
run_saga(w, o, log, "chargeCard")
print("  restart: resume from the saga log at " + steps[len(log["done"])][0])
print("  result " + run_saga(w, o, log))
summary(w, o)
print(f"  chargeCard was called {w['charge_calls']} times; the idempotency key kept it to one charge of {w['balance']}")

print("\\n== 4. No isolation: a second shopper reads stock while saga o4 is in flight")
w = make_world()
o = {"id": "o4", "item": "lamp", "amount": 40, "no_courier": True}
w["orders"][o["id"]] = "PENDING"
reserve(w, o)  # T1 of o4 committed locally, stock is now 0
print(f"  shopper B sees lamp stock {w['stock']['lamp']} and order o4 {w['orders']['o4']} -> told \\"sold out\\"")
log = {"done": ["reserveStock"]}
print("  result " + run_saga(w, o, log))
print(f"  after compensation lamp stock is {w['stock']['lamp']}: B lost a sale that was never final")` },
        ],
      },
    ],
  },
  {
    title: `Outbox pattern vs polling for CDC — how do you avoid dual-write failure?`,
    difficulty: "hard",
    seoDescription: `Dual writes lose or invent events. How the transactional outbox fixes it, polling relay vs log-based CDC, why updated_at polling misses changes, dedupe.`,
    description: `**Question presented to candidate:**
"When an order is saved, our order service also publishes an OrderPlaced event to Kafka for billing and email. Sometimes an order exists with no event, and once we sent an email for an order that was never saved. What is going on, how would you fix it with the outbox pattern, and how would you get rows out of the outbox: by polling, or with change data capture? Could we skip the outbox and just poll the orders table?"

**What a strong answer should cover:**
- The **dual-write problem**: a database write and a broker publish are two separate systems with no shared transaction, so a crash or error between them loses an event (commit first) or invents one (publish first)
- The **transactional outbox**: write the business row and an event row to an \`outbox\` table in **one local transaction**; a separate **relay** publishes outbox rows afterwards
- The relay gives **at-least-once** delivery: a crash after publishing but before marking a row republishes it, so consumers **deduplicate by event id** (an inbox table or idempotent handlers)
- Two ways to drain the outbox: a **polling publisher** (\`SELECT ... WHERE published = false\`, simple, adds query load and latency) or **log-based CDC** tailing the WAL (Debezium outbox event router; low latency, more infrastructure)
- Why **query-based polling of business tables** (\`updated_at > watermark\`) is not a substitute: it misses deletes, collapses intermediate updates, and skips rows from transactions that commit late
- Operational details: ordering per aggregate (partition by aggregate id), outbox cleanup, multiple relays (\`FOR UPDATE SKIP LOCKED\`), monitoring relay lag

**Clarifying questions expected:**
- What end-to-end delay from commit to event is acceptable: seconds, or tens of milliseconds?
- Do consumers need every intermediate change and deletes, or only the latest state?
- Is running Kafka Connect and Debezium acceptable operationally, or should this stay inside the application?

**Code / implementation expected:** Yes — sketch the outbox table, the single transaction and the relay loop; the example measures lost, phantom, duplicate and missed events for each approach.`,
    answer: `**Target Audience:** Back-end developers who publish events from services that also own a database. You know what a database transaction and a message broker are; no prior knowledge of CDC assumed.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All counts come from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A shop keeps two books: the sales ledger, and a notebook of "things to tell the warehouse". Each sale, the clerk writes in the ledger, then walks to the warehouse to tell them. One day the clerk writes a sale, then faints before reaching the warehouse: the customer paid, nothing ships. Another day, the clerk tells the warehouse first, then the customer cancels before the ledger is written: a parcel ships for a sale that does not exist.

The fix the shop lands on: the clerk writes **both the sale and the warehouse note on the same ledger page**, in one stroke. A runner checks the ledger every few seconds and carries new notes to the warehouse. If the runner trips and delivers a note twice, the warehouse checks the note number and ignores the repeat.

That is the outbox pattern: one atomic write, a relay that may repeat, and consumers that deduplicate.

📌 **Interview term: dual write** — updating two systems (a database and a broker, a database and a search index, two databases) from application code, one after the other, with no transaction covering both. Any crash or error between the two writes leaves them inconsistent.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What delay from commit to event is acceptable? | A polling relay adds about half its interval on average; log-based CDC is usually sub-second |
| Do consumers need deletes and every intermediate change? | Rules out \`updated_at\` polling, which sees neither |
| What write rate, and how many event types? | Sizes the outbox table, cleanup and partitions |
| Must events for one order arrive in order? | Partition by aggregate id; a single relay or per-key ordering |
| Can we run Kafka Connect and Debezium? | Decides polling publisher vs log tailing |
| Which database, and do we have replication-slot access? | Log-based CDC needs logical decoding (PostgreSQL) or binlog access (MySQL) |

## 3. The Dual-Write Problem, Measured

The order service handles 1000 orders. In the first version it commits, then publishes. One process is killed between the two (a deploy), and one publish fails after the commit (broker unavailable, error only logged):

~~~text
== 1. Dual write: commit to DB, then publish to the broker
  orders in DB 1000, OrderPlaced events 998, lost events 2
~~~

Two orders will never be billed or emailed. Retrying the publish in a loop does not help when the process itself dies. Reversing the order is not better:

~~~text
== 2. Dual write the other way: publish first, then commit
  orders in DB 997, events 1000, events for orders that do not exist 3
~~~

Three commits failed after their events were already out (a deadlock victim, a constraint violation, a failover): billing and email now act on orders that do not exist.

📌 **Interview term: phantom event** — an event announcing a change that never committed. Lost events and phantom events are the two faces of the dual-write problem; no ordering of the two calls avoids both. Distributed transactions between the database and the broker ([two-phase commit](/interview-question/what-is-two-phase-commit-and-its-drawbacks)) could, but they bring back blocking and lock-holding costs. Kafka only recently gained a way to join an externally coordinated two-phase commit: KIP-939 ("Support Participation in 2PC", marked accepted on the Apache Kafka wiki) adds a prepare step to the transactional producer. It is new, needs a coordinator that drives both sides, and most teams still use the outbox.

## 4. The Transactional Outbox

📌 **Interview term: transactional outbox** — an \`outbox\` table in the **same database** as the business data. The service writes the business change and the event row in **one local transaction**, so both commit or neither does. A separate process, the **message relay**, reads committed outbox rows and publishes them.

~~~sql
CREATE TABLE outbox (
  id            BIGSERIAL PRIMARY KEY,   -- also the event id consumers dedupe on
  aggregatetype TEXT        NOT NULL,    -- e.g. 'order'  -> topic
  aggregateid   TEXT        NOT NULL,    -- e.g. order id -> message key (ordering)
  type          TEXT        NOT NULL,    -- e.g. 'OrderPlaced'
  payload       JSONB       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ               -- NULL until the polling relay sends it
);

BEGIN;
INSERT INTO orders (id, customer_id, total) VALUES ('o-417', 'c-9', 40);
INSERT INTO outbox (aggregatetype, aggregateid, type, payload)
VALUES ('order', 'o-417', 'OrderPlaced', '{"orderId":"o-417","total":40}');
COMMIT;
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Outbox: the service writes the order row and the outbox row in one transaction; a relay reads the outbox and publishes to the broker">
  <defs>
    <marker id="sd08q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="85" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="112" text-anchor="middle">order</text>
  <text class="d-sub" x="90" y="132" text-anchor="middle">service</text>
  <rect class="d-box-accent" x="230" y="30" width="220" height="170" rx="12"/>
  <text class="d-text" x="340" y="58" text-anchor="middle">one transaction</text>
  <rect class="d-box" x="255" y="78" width="170" height="44" rx="8"/>
  <text class="d-text" x="340" y="105" text-anchor="middle">orders row</text>
  <rect class="d-box" x="255" y="138" width="170" height="44" rx="8"/>
  <text class="d-text" x="340" y="165" text-anchor="middle">outbox row</text>
  <rect class="d-box" x="530" y="20" width="170" height="56" rx="10"/>
  <text class="d-text" x="615" y="45" text-anchor="middle">relay</text>
  <text class="d-sub" x="615" y="65" text-anchor="middle">poll or tail WAL</text>
  <rect class="d-box" x="530" y="150" width="170" height="56" rx="10"/>
  <text class="d-text" x="615" y="175" text-anchor="middle">broker</text>
  <text class="d-sub" x="615" y="195" text-anchor="middle">Kafka topic</text>
  <path class="d-edge" d="M 160 115 L 224 115" marker-end="url(#sd08q3-arrow)"/>
  <path class="d-edge-dashed" d="M 425 155 L 524 55" marker-end="url(#sd08q3-arrow)"/>
  <path class="d-edge-accent" d="M 615 76 L 615 144" marker-end="url(#sd08q3-arrow)"/>
</svg>

The service never talks to the broker. Publishing is moved out of the request path into the relay, which can retry as long as it likes because the event is already safe in the database.

Same 1000 orders with an outbox. One request crashes inside its transaction (so neither row exists, and the client sees an error and retries), and the relay crashes once after sending a batch but before marking it:

~~~text
== 3. Transactional outbox + relay (batch 100), relay crashes once
  relay crashed after sending ids 301-400, before marking them
  orders 999, outbox rows 999, broker messages 1099
  consumer applied 999, duplicates skipped by event id 100, lost 0
~~~

Every committed order has exactly one event applied: 999 orders, 999 applied, 0 lost. The price is 100 duplicates on the broker, which the consumer dropped by event id.

📌 **Interview term: at-least-once delivery** — every event is delivered one or more times; never zero. It is what the relay can promise, because "publish" and "mark as published" are again two writes in two systems. The fix is on the consumer side.

📌 **Interview term: idempotent consumer / inbox** — the consumer records processed event ids (an \`inbox\` or \`processed_events\` table, written in the same transaction as its own side effects) and skips ids it has seen. Combined with an at-least-once relay, this gives "effectively once" processing. Kafka-specific options are in [exactly-once processing with Kafka or SQS](/interview-question/exactly-once-processing-can-kafka-or-sqs-guarantee-it), and the general principle in [idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter).

## 5. Draining the Outbox: Polling Relay vs Log-Based CDC

There are two ways to build the relay. Both read the outbox, which is the important part; they differ in how they notice new rows.

📌 **Interview term: polling publisher** — the relay runs a query every N ms:

~~~sql
SELECT id, aggregatetype, aggregateid, type, payload
FROM outbox
WHERE published_at IS NULL
ORDER BY id
LIMIT 100
FOR UPDATE SKIP LOCKED;     -- lets several relay instances share the work
-- publish each row, wait for the broker acknowledgement, then:
UPDATE outbox SET published_at = now() WHERE id = ANY(:ids);
~~~

Simple, runs inside your service, works on any SQL database. Costs: one query per interval even when idle, extra writes (the \`UPDATE\` and later the cleanup \`DELETE\`), and latency of up to one interval.

📌 **Interview term: log-based change data capture (CDC)** — instead of querying, read the database own change log (the PostgreSQL WAL through logical decoding, the MySQL binlog), which records every committed change in commit order. Debezium does this, and ships an **outbox event router** transformation: it reads inserts into the outbox table and routes each to a topic chosen from the \`aggregatetype\` column (by default \`outbox.event.<aggregatetype>\`), uses \`aggregateid\` as the message key and the \`id\` column as the event id for deduplication (Debezium "Outbox Event Router" documentation). Because the WAL already holds the row, the outbox can be deleted right after insert (or in the same transaction) and the event still flows. How the connector itself works is the subject of [CDC with Debezium](/interview-question/how-does-cdc-with-debezium-keep-search-and-cache-in-sync-with-postgres).

A subtle bug in hand-written pollers: if the relay remembers "last id sent" and queries \`WHERE id > :last_id\`, it can skip rows forever. Sequence values are handed out at insert time, but transactions commit in a different order, so id 501 can become visible after 502 was already sent. Query by \`published_at IS NULL\` (as above), or use log-based CDC, which reads in commit order.

## 6. Why Not Just Poll the Business Table?

"Polling for CDC" sometimes means skipping the outbox and querying the business table for changed rows: \`SELECT * FROM orders WHERE updated_at > :watermark\`. This is **query-based CDC**. The run commits 7 changes and polls four times:

~~~text
== 4. Query-based polling: SELECT * FROM orders WHERE updated_at > :watermark
  poll t=75: got [o2:NEW] watermark=50
  poll t=200: got [o1:SHIPPED] watermark=180
  poll t=400: got [o4:NEW] watermark=300
  poll t=600: got [] watermark=300
  committed changes 7, delivered 3, missed 4: o1:NEW, o1:PAID, o2:DELETED, o3:NEW
  a log-based reader of the same commits (WAL order) delivers 7 of 7
~~~

📌 **Interview term: query-based CDC** — detecting changes by repeatedly querying tables for rows with a newer timestamp or version column. It needs no special database access, but it only ever sees the **current** state of each row:

- **Intermediate states are lost**: o1 went NEW, PAID, SHIPPED between two polls; only SHIPPED was delivered. A consumer that charges on PAID never fires.
- **Deletes are invisible**: o2 was deleted, so there is no row left to find (soft deletes, a \`deleted_at\` column, are the workaround).
- **Late commits are skipped**: o3 was written by a long transaction with \`updated_at = 290\` but committed at t=420, after the watermark had already passed 300 because of o4. It is never delivered.
- **Load and latency**: every poll scans an index on \`updated_at\`; the interval sets both the delay and the query load.

Query-based polling is fine for nightly batch syncs of slowly changing data. It is not a way to publish domain events. Note also that it does not solve the dual-write problem by itself for events with business meaning: the "event" is inferred from a row diff, not stated by the code that made the change. The outbox lets the service say *what happened* (\`OrderPlaced\`, \`OrderCancelled\`), in its own words and schema, decoupled from the table layout.

## 7. A Worked Capacity Estimate

Assumptions: 500 orders/s on average, 2000/s at peak, 1 KB per outbox row, polling relay every 100 ms.

- Outbox growth: 500 x 86,400 = 43,200,000 rows/day, about 43.2 GB/day. Keeping published rows for 7 days would hold about 302 GB — so delete published rows quickly, or partition the outbox by day and drop old partitions (cheaper than \`DELETE\` plus VACUUM).
- Polling cost: 10 queries/s per relay, 864,000 a day, whether or not there is traffic.
- Batch size: at peak 2000/s x 0.1 s = 200 new rows per poll, so a \`LIMIT 100\` relay would fall behind; raise the batch, poll faster, or run several relays with \`SKIP LOCKED\` (ordering per aggregate then needs care).
- Added latency: on average half the interval, about 50 ms, up to 100 ms plus publish time. Log-based CDC removes the polling delay but adds a connector and its operational care.

## 8. Comparison

| | Dual write | Outbox + polling relay | Outbox + log-based CDC | Query-based polling of tables |
| :--- | :--- | :--- | :--- | :--- |
| Lost events on crash | yes (2 in the run) | no | no | yes (late commits) |
| Phantom events | yes if publish first (3) | no | no | no |
| Duplicates | possible on retry | yes, at-least-once (100) | yes, on connector restart | possible |
| Deletes and intermediate states | yes | yes (events are explicit) | yes | no |
| Latency | immediate | about half the poll interval | usually sub-second | the poll interval |
| Extra load on the database | none | polling queries and updates | WAL reading, a replication slot | indexed scans per poll |
| Infrastructure | none | a background worker | Kafka Connect and Debezium, or similar | a cron or worker |
| Event schema | explicit | explicit domain events | explicit domain events | table rows |

The usual answer: the **outbox** is the fix for dual writes; **how** you drain it is a latency and operations choice. Start with a polling relay if you have no CDC platform; move to log-based CDC when latency or polling load matters, or when you already run Kafka Connect.

## 9. Verified: Running the Code

The example **"Dual write vs transactional outbox vs updated_at polling: lost, phantom, duplicate and missed events"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Dual write: commit to DB, then publish to the broker
  orders in DB 1000, OrderPlaced events 998, lost events 2

== 2. Dual write the other way: publish first, then commit
  orders in DB 997, events 1000, events for orders that do not exist 3

== 3. Transactional outbox + relay (batch 100), relay crashes once
  relay crashed after sending ids 301-400, before marking them
  orders 999, outbox rows 999, broker messages 1099
  consumer applied 999, duplicates skipped by event id 100, lost 0

== 4. Query-based polling: SELECT * FROM orders WHERE updated_at > :watermark
  poll t=75: got [o2:NEW] watermark=50
  poll t=200: got [o1:SHIPPED] watermark=180
  poll t=400: got [o4:NEW] watermark=300
  poll t=600: got [] watermark=300
  committed changes 7, delivered 3, missed 4: o1:NEW, o1:PAID, o2:DELETED, o3:NEW
  a log-based reader of the same commits (WAL order) delivers 7 of 7
~~~

What the simulation stands for and what it leaves out: the database is arrays updated atomically (an order and its outbox row are pushed together or not at all), the broker is an append-only array, and the failure points are fixed order numbers instead of random crashes. The relay batch query is a filter over the array. The polling scenario uses explicit commit times to show the late-commit gap. There is no real Kafka, PostgreSQL, network or concurrency.

## Edge Cases Worth Knowing

- **Ordering**: use the aggregate id as the message key so all events of one order land in one partition in order. Several relays polling in parallel can reorder events of one aggregate unless work is split by key.
- **Large payloads**: keep the event small (ids and changed fields); consumers that need more can fetch it, or store large blobs elsewhere.
- **Schema evolution**: the outbox payload is a public contract. Version event types (\`OrderPlaced.v2\`) instead of changing them in place.
- **Relay lag monitoring**: alert on the age of the oldest unpublished row (polling) or on replication slot lag (CDC).

## Common Pitfalls

- **Publishing inside the database transaction** ("before COMMIT") — the commit can still fail, giving a phantom event, and a slow broker now holds database locks.
- **Treating the relay as exactly-once** — the run produced 100 duplicates from one relay crash; consumers must dedupe by event id.
- **Polling by \`id > last_id\`** — commit order is not id order, so a long transaction can be skipped forever.
- **Using \`updated_at\` polling to publish business events** — the run missed 4 of 7 changes: an intermediate state, a delete and a late commit.
- **Never cleaning the outbox** — at 500 events/s it grows by about 43 GB a day; delete or drop partitions after publishing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">Saving the order and publishing to Kafka are a <strong style="color:#ffca28;">dual write</strong>: two systems, no shared transaction. Commit-then-publish loses events on a crash; publish-then-commit invents <strong style="color:#ffca28;">phantom events</strong> when the commit fails.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The fix:</strong> <span style="color:#f0e2c8;">The <strong style="color:#ffca28;">transactional outbox</strong>: in the same local transaction as the order, insert an event row into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code> table. Both commit or neither does. The request path never touches the broker.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The relay:</strong> <span style="color:#f0e2c8;">A relay publishes committed outbox rows, either a <strong style="color:#ffca28;">polling publisher</strong> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE published_at IS NULL ... FOR UPDATE SKIP LOCKED</code>) or <strong style="color:#ffca28;">log-based CDC</strong> such as the Debezium outbox event router reading the WAL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Delivery:</strong> <span style="color:#f0e2c8;">The relay is <strong style="color:#ffca28;">at-least-once</strong>: a crash between publish and mark resends. Consumers dedupe by event id in an <strong style="color:#ffca28;">inbox</strong> table, and the message key is the aggregate id so events per order stay ordered.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Not polling tables:</strong> <span style="color:#f0e2c8;">Polling business tables by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updated_at</code> misses deletes, collapses intermediate states and skips late commits, so it is fine for batch sync, not for domain events.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just retry the publish until it succeeds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Retries do not survive the process dying between commit and publish — the event existed only in memory. The outbox puts the intent to publish in the same durable transaction as the change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Polling relay or Debezium?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Polling is simple and needs no new infrastructure, but adds a query every interval and up to one interval of delay. Debezium tails the WAL in commit order with sub-second latency, at the cost of running Kafka Connect, replication slots and their monitoring. I start with polling and move when latency or load requires it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do multiple relay instances avoid sending the same row?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT ... FOR UPDATE SKIP LOCKED</code> lets each instance claim different rows. That can reorder events of the same aggregate, so either shard relays by aggregate id or accept per-key ordering only within one relay.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How big does the outbox get?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At 500 events/s and 1 KB each, about 43 GB a day. Delete rows once published, or partition by day and drop partitions; with log-based CDC you can delete right after insert because the WAL already carries the row.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the outbox give exactly-once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, at-least-once. Effectively-once comes from the consumer: record processed event ids in the same transaction as its side effects and skip repeats. In the example, 1099 messages produced 999 applied events.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Dual write | Writing two systems in sequence without a shared transaction |
| Phantom event | An event for a change that never committed |
| Transactional outbox | Event rows written in the same transaction as the business change |
| At-least-once delivery | Delivered one or more times, never zero |
| Idempotent consumer / inbox | Consumer that records processed event ids and skips repeats |
| Polling publisher | Relay that queries the outbox for unpublished rows |
| Log-based CDC | Reading committed changes from the database log |
| Query-based CDC | Detecting changes by querying for newer timestamps |

**Conclusion:** Dual writes fail in both directions — the run lost 2 events with commit-then-publish and invented 3 with publish-then-commit — and no ordering of the two calls fixes it. The transactional outbox does, by making the event part of the same local transaction as the change; the relay then delivers at least once (100 duplicates after one crash, all dropped by event id). Drain the outbox with a polling relay for simplicity or with log-based CDC for latency, and do not mistake \`updated_at\` polling of business tables for either: it missed 4 of 7 changes in the run.`,
    examples: [
      {
        label: `Dual write vs transactional outbox vs updated_at polling: lost, phantom, duplicate and missed events`,
        variants: [
          { tech: "node", code: `// Dual write vs transactional outbox vs updated_at polling, simulated in-process.
// "db" is a database with atomic transactions, "broker" is an append-only array (Kafka-like).
const N = 1000;

console.log("== 1. Dual write: commit to DB, then publish to the broker");
{
  const db = [], broker = [];
  const crashBetween = new Set([417]); // process killed after COMMIT, before publish
  const brokerDown = new Set([733]); // publish failed after the commit; error only logged
  for (let id = 1; id <= N; id++) {
    db.push(id);
    if (crashBetween.has(id) || brokerDown.has(id)) continue;
    broker.push({ eventId: id, orderId: id });
  }
  console.log(\`  orders in DB \${db.length}, OrderPlaced events \${broker.length}, lost events \${db.length - broker.length}\`);
}

console.log("\\n== 2. Dual write the other way: publish first, then commit");
{
  const db = [], broker = [];
  const commitFails = new Set([120, 555, 901]); // deadlock victim, unique violation, failover
  for (let id = 1; id <= N; id++) {
    broker.push({ eventId: id, orderId: id });
    if (!commitFails.has(id)) db.push(id);
  }
  const inDb = new Set(db);
  const phantom = broker.filter((e) => !inDb.has(e.orderId)).length;
  console.log(\`  orders in DB \${db.length}, events \${broker.length}, events for orders that do not exist \${phantom}\`);
}

console.log("\\n== 3. Transactional outbox + relay (batch 100), relay crashes once");
{
  const orders = [], outbox = [], broker = [];
  for (let id = 1; id <= N; id++) {
    if (id === 417) continue; // crash inside the transaction: neither row is written
    orders.push(id); // same transaction:
    outbox.push({ id, type: "OrderPlaced", orderId: id, published: false });
  }
  let crashed = false;
  for (;;) {
    const batch = outbox.filter((r) => !r.published).slice(0, 100); // SELECT ... ORDER BY id LIMIT 100
    if (batch.length === 0) break;
    for (const r of batch) broker.push({ eventId: r.id, orderId: r.orderId });
    if (!crashed && batch[0].id > 300) { crashed = true; console.log(\`  relay crashed after sending ids \${batch[0].id}-\${batch[batch.length - 1].id}, before marking them\`); continue; }
    for (const r of batch) r.published = true; // UPDATE outbox SET published = true
  }
  const seen = new Set();
  let applied = 0, skipped = 0;
  for (const e of broker) { if (seen.has(e.eventId)) { skipped++; continue; } seen.add(e.eventId); applied++; }
  console.log(\`  orders \${orders.length}, outbox rows \${outbox.length}, broker messages \${broker.length}\`);
  console.log(\`  consumer applied \${applied}, duplicates skipped by event id \${skipped}, lost \${orders.length - applied}\`);
}

console.log("\\n== 4. Query-based polling: SELECT * FROM orders WHERE updated_at > :watermark");
{
  const table = new Map(); // id -> {status, updatedAt}
  const changes = [ // [commitTime, id, status or null for delete, updatedAt written by the app]
    [50, "o2", "NEW", 50], [100, "o1", "NEW", 100], [150, "o1", "PAID", 150], [180, "o1", "SHIPPED", 180],
    [250, "o2", null, 250], [310, "o4", "NEW", 300], [420, "o3", "NEW", 290], // o3: long transaction, commits late
  ];
  const polls = [75, 200, 400, 600];
  let watermark = -1, ci = 0;
  const delivered = [];
  for (const p of polls) {
    while (ci < changes.length && changes[ci][0] <= p) {
      const [, id, status, at] = changes[ci++];
      if (status === null) table.delete(id); else table.set(id, { status, updatedAt: at });
    }
    const rows = [...table.entries()].filter(([, r]) => r.updatedAt > watermark).sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    for (const [id, r] of rows) { delivered.push(\`\${id}:\${r.status}\`); watermark = Math.max(watermark, r.updatedAt); }
    console.log(\`  poll t=\${p}: got [\${rows.map(([id, r]) => \`\${id}:\${r.status}\`).join(", ")}] watermark=\${watermark}\`);
  }
  const all = changes.map(([, id, s]) => \`\${id}:\${s ?? "DELETED"}\`);
  const missed = all.filter((c) => !delivered.includes(c));
  console.log(\`  committed changes \${all.length}, delivered \${delivered.length}, missed \${missed.length}: \${missed.join(", ")}\`);
  console.log(\`  a log-based reader of the same commits (WAL order) delivers \${changes.length} of \${changes.length}\`);
}` },
          { tech: "python", code: `# Dual write vs transactional outbox vs updated_at polling, simulated in-process.
# "db" is a database with atomic transactions, "broker" is an append-only list (Kafka-like).
N = 1000

print("== 1. Dual write: commit to DB, then publish to the broker")
db, broker = [], []
crash_between = {417}  # process killed after COMMIT, before publish
broker_down = {733}  # publish failed after the commit; error only logged
for i in range(1, N + 1):
    db.append(i)
    if i in crash_between or i in broker_down:
        continue
    broker.append({"event_id": i, "order_id": i})
print(f"  orders in DB {len(db)}, OrderPlaced events {len(broker)}, lost events {len(db) - len(broker)}")

print("\\n== 2. Dual write the other way: publish first, then commit")
db, broker = [], []
commit_fails = {120, 555, 901}  # deadlock victim, unique violation, failover
for i in range(1, N + 1):
    broker.append({"event_id": i, "order_id": i})
    if i not in commit_fails:
        db.append(i)
in_db = set(db)
phantom = sum(1 for e in broker if e["order_id"] not in in_db)
print(f"  orders in DB {len(db)}, events {len(broker)}, events for orders that do not exist {phantom}")

print("\\n== 3. Transactional outbox + relay (batch 100), relay crashes once")
orders, outbox, broker = [], [], []
for i in range(1, N + 1):
    if i == 417:
        continue  # crash inside the transaction: neither row is written
    orders.append(i)  # same transaction:
    outbox.append({"id": i, "type": "OrderPlaced", "order_id": i, "published": False})
crashed = False
while True:
    batch = [r for r in outbox if not r["published"]][:100]  # SELECT ... ORDER BY id LIMIT 100
    if not batch:
        break
    for r in batch:
        broker.append({"event_id": r["id"], "order_id": r["order_id"]})
    if not crashed and batch[0]["id"] > 300:
        crashed = True
        print(f"  relay crashed after sending ids {batch[0]['id']}-{batch[-1]['id']}, before marking them")
        continue
    for r in batch:
        r["published"] = True  # UPDATE outbox SET published = true
seen = set()
applied = skipped = 0
for e in broker:
    if e["event_id"] in seen:
        skipped += 1
        continue
    seen.add(e["event_id"])
    applied += 1
print(f"  orders {len(orders)}, outbox rows {len(outbox)}, broker messages {len(broker)}")
print(f"  consumer applied {applied}, duplicates skipped by event id {skipped}, lost {len(orders) - applied}")

print("\\n== 4. Query-based polling: SELECT * FROM orders WHERE updated_at > :watermark")
table = {}  # id -> {status, updated_at}
changes = [  # (commit_time, id, status or None for delete, updated_at written by the app)
    (50, "o2", "NEW", 50), (100, "o1", "NEW", 100), (150, "o1", "PAID", 150), (180, "o1", "SHIPPED", 180),
    (250, "o2", None, 250), (310, "o4", "NEW", 300), (420, "o3", "NEW", 290),  # o3: long transaction, commits late
]
polls = [75, 200, 400, 600]
watermark, ci = -1, 0
delivered = []
for p in polls:
    while ci < len(changes) and changes[ci][0] <= p:
        _, rid, status, at = changes[ci]
        ci += 1
        if status is None:
            table.pop(rid, None)
        else:
            table[rid] = {"status": status, "updated_at": at}
    rows = sorted(((rid, r) for rid, r in table.items() if r["updated_at"] > watermark), key=lambda x: x[1]["updated_at"])
    for rid, r in rows:
        delivered.append(f"{rid}:{r['status']}")
        watermark = max(watermark, r["updated_at"])
    got = ", ".join(f"{rid}:{r['status']}" for rid, r in rows)
    print(f"  poll t={p}: got [{got}] watermark={watermark}")
all_changes = [f"{rid}:{s if s is not None else 'DELETED'}" for _, rid, s, _ in changes]
missed = [c for c in all_changes if c not in delivered]
print(f"  committed changes {len(all_changes)}, delivered {len(delivered)}, missed {len(missed)}: {', '.join(missed)}")
print(f"  a log-based reader of the same commits (WAL order) delivers {len(changes)} of {len(changes)}")` },
        ],
      },
    ],
  },
  {
    title: `How does CDC with Debezium keep search and cache in sync with Postgres?`,
    difficulty: "hard",
    seoDescription: `How Debezium streams Postgres WAL changes via Kafka to Elasticsearch and Redis: slots, snapshots, event envelope, idempotency, WAL retention.`,
    description: `**Question presented to candidate:**
"Our product catalogue lives in Postgres. Search runs on Elasticsearch and product pages read from Redis. Today the API writes to all three and they drift apart. How would you use change data capture with Debezium to keep search and the cache in sync? Walk me through how Debezium reads changes from Postgres, what happens on the first start and after a crash, and what can still go wrong."

**What a strong answer should cover:**
- **Log-based CDC**: Postgres writes every committed change to the **WAL**; with \`wal_level=logical\`, a **logical replication slot** and a **publication**, Debezium (via the \`pgoutput\` plugin) streams row changes in commit order into Kafka topics
- First start: a consistent **initial snapshot** (events with \`op=r\`) then streaming from the recorded LSN; incremental snapshots for backfills later
- The **change event envelope**: \`before\`, \`after\`, \`op\` (c, u, d, r), \`source\` with the LSN and transaction id; **tombstones** after deletes for compacted topics; \`REPLICA IDENTITY FULL\` for full before-images
- Delivery is **at-least-once**: after a crash the connector resumes from its last committed offset, so sinks must be **idempotent** — upsert by primary key with the LSN as an external version, delete on \`op=d\`
- Ordering per row by keying messages on the primary key; the **cache race** (a reader re-filling a stale value after an invalidation) and how a versioned write or short TTL fixes it
- Operations: a stalled slot makes the primary **retain WAL** until the disk fills; heartbeats, \`max_slot_wal_keep_size\`, slot failover, schema changes and monitoring lag

**Clarifying questions expected:**
- How fresh must search and cache be: sub-second, or are a few seconds fine?
- What is the write rate on the catalogue tables, and do deletes and updates both need to propagate?
- Do we already run Kafka and Kafka Connect, and can we get replication privileges on the Postgres primary?

**Code / implementation expected:** Optional — connector configuration and a consumer sketch; the example simulates snapshot, streaming, a connector replay, an LSN-versioned index and the cache race.`,
    answer: `**Target Audience:** Back-end and platform engineers who keep derived stores (search indexes, caches, analytics) in sync with a primary database. You know what Postgres, Kafka and a cache are; CDC is explained from zero.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Debezium and Postgres behaviour is from their documentation, cited inline; it was not run here.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The pipeline behaviour shown comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A library keeps its master catalogue in a big ledger. It also has a card index for searching and a "popular books" board at the door. For years, every librarian who changed the ledger was supposed to update the card index and the board too. They forgot sometimes, or got interrupted halfway, and the three slowly disagreed.

Then the library noticed something: the ledger already has a page-numbered **change journal** at the back, where every edit is written in order before it is made, so the ledger can be rebuilt after a fire. So they hired one assistant whose only job is to read that journal from where they last stopped, and update the card index and the board. Librarians now only touch the ledger. If the assistant goes home sick, they come back and continue from the page number in their bookmark.

The journal is the Postgres write-ahead log, the assistant is Debezium, and the bookmark is the replication slot.

📌 **Interview term: change data capture (CDC)** — turning every committed insert, update and delete in a database into a stream of change events that other systems consume.

📌 **Interview term: derived data** — data that can be recomputed from a source of truth: a search index, a cache, a materialised view. CDC keeps derived data in sync with the source without the application writing to both, which is the [dual-write problem](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How fresh must search and cache be? | CDC lag is usually sub-second; if reads must see their own writes, the cache path needs extra care |
| Write rate on the catalogue tables? | Sizes Kafka throughput, partitions and the indexer bulk size |
| Do deletes need to propagate? | Requires handling \`op=d\` and tombstones, and a key-only or full before-image |
| Kafka and Kafka Connect already in place? | Debezium usually runs as a Kafka Connect source connector; Debezium Server is an alternative |
| Replication privileges and a logical \`wal_level\` on the primary? | Required for a logical replication slot; managed databases expose this as a setting |
| How are schema changes rolled out? | Column changes flow into events and can break consumers |

## 3. The Pipeline

<svg class="iq-diagram" width="100%" viewBox="0 0 800 300" role="img" aria-label="Postgres WAL feeds a replication slot read by Debezium, which writes to Kafka; an indexer updates Elasticsearch and an invalidator updates Redis">
  <defs>
    <marker id="sd08q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="115" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="145" text-anchor="middle">Postgres</text>
  <text class="d-sub" x="95" y="167" text-anchor="middle">WAL + slot</text>
  <rect class="d-box-accent" x="225" y="115" width="150" height="70" rx="10"/>
  <text class="d-text" x="300" y="145" text-anchor="middle">Debezium</text>
  <text class="d-sub" x="300" y="167" text-anchor="middle">Kafka Connect</text>
  <rect class="d-box" x="430" y="115" width="130" height="70" rx="10"/>
  <text class="d-text" x="495" y="145" text-anchor="middle">Kafka</text>
  <text class="d-sub" x="495" y="167" text-anchor="middle">key = id</text>
  <rect class="d-box" x="630" y="20" width="150" height="64" rx="10"/>
  <text class="d-text" x="705" y="47" text-anchor="middle">indexer</text>
  <text class="d-sub" x="705" y="68" text-anchor="middle">Elasticsearch</text>
  <rect class="d-box" x="630" y="216" width="150" height="64" rx="10"/>
  <text class="d-text" x="705" y="243" text-anchor="middle">cache sync</text>
  <text class="d-sub" x="705" y="264" text-anchor="middle">Redis</text>
  <path class="d-edge" d="M 170 150 L 219 150" marker-end="url(#sd08q4-arrow)"/>
  <path class="d-edge" d="M 375 150 L 424 150" marker-end="url(#sd08q4-arrow)"/>
  <path class="d-edge-accent" d="M 560 130 L 624 60" marker-end="url(#sd08q4-arrow)"/>
  <path class="d-edge-accent" d="M 560 170 L 624 240" marker-end="url(#sd08q4-arrow)"/>
</svg>

The API writes only to Postgres. Everything to the right of Postgres is asynchronous and can be rebuilt from the topics or from a fresh snapshot.

**On the Postgres side** (Debezium PostgreSQL connector documentation):

- \`wal_level = logical\`, so the WAL carries enough information to decode row changes.
- A **publication** lists the tables to capture; Debezium creates one called \`dbz_publication\` if it is missing (which needs elevated rights, so DBAs usually create it ahead of time).
- A **logical replication slot** remembers how far this consumer has read. It persists across connector restarts so streaming resumes where it stopped.
- The \`pgoutput\` logical decoding plugin, built into Postgres, turns WAL records into row changes.

📌 **Interview term: logical replication slot** — a named, durable cursor on the WAL kept by Postgres for one consumer. Postgres will not delete WAL the slot still needs. That guarantees no change is missed, and it is also the main operational risk (Section 7).

📌 **Interview term: logical decoding** — Postgres turning physical WAL records into a stream of row-level inserts, updates and deletes per committed transaction, in commit order. Background on the log itself: [write-ahead log](/interview-question/what-is-a-write-ahead-log-wal).

~~~json
{
  "name": "catalog-cdc",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "plugin.name": "pgoutput",
    "database.hostname": "pg-primary",
    "database.dbname": "catalog",
    "slot.name": "catalog_cdc",
    "publication.name": "dbz_publication",
    "table.include.list": "public.products",
    "topic.prefix": "catalog",
    "snapshot.mode": "initial",
    "heartbeat.interval.ms": "10000"
  }
}
~~~

Credentials and converter settings are left out. Option names are from the Debezium PostgreSQL connector reference; check the page for your Debezium version (the 3.x series is current; the Debezium blog announced 3.6 in mid-2026).

## 4. First Start: Snapshot, Then Stream

The WAL does not hold the whole history of the table — old segments are recycled — so a brand-new connector first copies the existing rows. With the default \`snapshot.mode = initial\`, Debezium takes a consistent snapshot, emits every row as a read event, then streams from the WAL position recorded when the snapshot began, so nothing between the two is missed (Debezium PostgreSQL connector documentation). If the connector stops in the middle of that snapshot, it starts the snapshot over on restart.

📌 **Interview term: initial snapshot** — the one-time copy of existing rows, emitted as events with \`op = r\` (read). Afterwards the connector streams \`c\` (create), \`u\` (update) and \`d\` (delete).

📌 **Interview term: incremental snapshot** — a later re-read of a table (for a new index, or a backfill) triggered by writing an \`execute-snapshot\` signal to a signalling table. Debezium reads the table in primary-key chunks while streaming continues, inserting low and high watermarks into the log around each chunk and resolving conflicts with live changes, and it can resume from the last finished chunk (Debezium blog "Incremental Snapshots", 2021).

The example runs the same sequence: three products snapshotted at LSN 100, then five changes, and the connector crashes once:

~~~text
== 1. Snapshot (op=r) then streaming (op=c/u/d)
  connector crashed after sending LSN 104; last committed offset LSN 102; restart replays from there
  topic: r:p1@100 r:p2@100 r:p3@100 u:p1@101 c:p4@102 u:p2@103 d:p3@104 tombstone:p3@104 u:p2@103 d:p3@104 tombstone:p3@104 u:p1@105
~~~

## 5. The Change Event

Each message on \`catalog.public.products\` (key = the primary key) carries an envelope like this, trimmed:

~~~json
{
  "before": { "id": "p2", "name": "desk", "price": 120 },
  "after":  { "id": "p2", "name": "desk", "price": 110 },
  "op": "u",
  "ts_ms": 1760000000000,
  "source": { "db": "catalog", "table": "products", "lsn": 24023128, "txId": 771 }
}
~~~

📌 **Interview term: change event envelope** — \`before\` (row before the change; \`null\` for inserts), \`after\` (row after; \`null\` for deletes), \`op\`, and \`source\` metadata including the LSN and the transaction id.

📌 **Interview term: replica identity** — what Postgres writes into the WAL about the old row. With the default, update and delete events carry only the primary key in \`before\`; \`ALTER TABLE products REPLICA IDENTITY FULL\` makes them carry every old column, at the cost of more WAL and CPU (Debezium and Materialize documentation). The search indexer needs only the key and \`after\`, so the default is usually enough.

📌 **Interview term: tombstone** — after a delete event, Debezium by default sends a second message with the same key and an empty value, so Kafka log compaction can eventually drop every message for that key. Consumers should skip tombstones.

## 6. Making the Consumers Correct

**Duplicates are normal.** Debezium documents **at-least-once** delivery: no changes are missed, but after a crash or restart it resumes from its last flushed offset, so the last few events are sent again (Debezium documentation and blog "Towards exactly-once delivery", 2023). Kafka Connect exactly-once support for source connectors (KIP-618, Kafka 3.3) can narrow this, but Debezium itself says it does not deduplicate, so sinks should not rely on it. In the run, LSN 103 and 104 arrived twice:

~~~text
== 2. Consumers: search index (versioned by LSN) and a naive counter
  messages 12, applied 8, skipped as already applied 2
  index [p1=lamp:30, p2=desk:110, p4=shelf:60]
  db    [p1=lamp:30, p2=desk:110, p4=shelf:60] -> match true
  naive "price changed" counter: 4 (truth 3)
~~~

📌 **Interview term: idempotent sink with external versioning** — the consumer applies an event only if its LSN is newer than the version stored with the document; replays and reorderings are skipped. In Elasticsearch this maps to indexing with \`version_type=external\` and the LSN as the version, so an older event is rejected. Deletes keep a versioned marker (or use the delete with a version) so a replayed older upsert cannot resurrect the row.

The naive counter shows why full-state upserts are the right shape: it counted "price changes" by event and reported 4 where the truth is 3. Anything incremental (counters, balances, "send an email per change") must deduplicate by \`(lsn, primary key)\` or equivalent.

**Ordering.** Debezium keys each message by the primary key, so all changes to one product go to one Kafka partition, in commit order. Different products may be processed in any order, which is fine for a search index. Do not repartition by another field without re-establishing per-key order.

**The cache.** Two common choices: delete the key on every change (the next read refills it from Postgres) or write the new value into the cache. Deleting has a race:

~~~text
== 3. Cache race: reader fills the cache with a value read before the update
  CDC deletes the key:          cache p1 price 30 (db 25) -> stale until TTL
  CDC writes value + LSN guard: cache p1 price 25 (db 25)
~~~

A reader missed the cache, read price 30 from Postgres at version 105, and stalled. Meanwhile an update to 25 committed (LSN 106) and its CDC event deleted the key. Then the slow reader wrote 30 into the cache. Postgres says 25, the cache says 30, and nothing will fix it until the TTL expires. Writing the value with its LSN, and letting readers fill the cache only if it holds nothing newer (a compare-and-set, for example a small Redis Lua script), closes the gap. A short TTL as a backstop is still wise. More on cache strategies in [how caching improves performance](/interview-question/how-does-caching-improve-system-performance).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Cache race timeline: reader reads old value, update commits, CDC deletes the key, reader writes the old value back">
  <rect class="d-box-muted" x="20" y="60" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="90" text-anchor="middle">t1 reader</text>
  <text class="d-sub" x="85" y="112" text-anchor="middle">reads 30</text>
  <rect class="d-box" x="200" y="60" width="130" height="70" rx="10"/>
  <text class="d-text" x="265" y="90" text-anchor="middle">t2 commit</text>
  <text class="d-sub" x="265" y="112" text-anchor="middle">price 25</text>
  <rect class="d-box" x="380" y="60" width="130" height="70" rx="10"/>
  <text class="d-text" x="445" y="90" text-anchor="middle">t3 CDC</text>
  <text class="d-sub" x="445" y="112" text-anchor="middle">deletes key</text>
  <rect class="d-box-accent" x="560" y="60" width="130" height="70" rx="10"/>
  <text class="d-text" x="625" y="90" text-anchor="middle">t4 reader</text>
  <text class="d-sub" x="625" y="112" text-anchor="middle">sets 30, stale</text>
</svg>

The four boxes are one timeline left to right. The fix makes step t4 conditional on the version already in the cache.

## 7. Operations: The Slot Is a Promise to Keep WAL

A replication slot stops Postgres from recycling WAL the consumer has not confirmed. If Debezium is down, stuck, or only captures a quiet table on a busy database, the slot does not advance and WAL piles up on the **primary**:

~~~text
== 4. Replication slot retention when the slot stops advancing
  stalled  1 h at 50 MB/min of WAL -> 3.0 GB kept on the primary disk
  stalled  6 h at 50 MB/min of WAL -> 18.0 GB kept on the primary disk
  stalled 24 h at 50 MB/min of WAL -> 72.0 GB kept on the primary disk
~~~

At an assumed 50 MB of WAL per minute, one stalled day is 72 GB on the primary disk — enough to fill it and take the database down with it.

- **Heartbeats.** If the captured tables are quiet while others are busy, Debezium may have nothing to confirm. \`heartbeat.interval.ms\` makes it emit periodic heartbeat messages so it can advance the slot, and \`heartbeat.action.query\` can write to a small table in the publication to produce a real change when the database is idle (Gunnar Morling, "Mastering Postgres Replication Slots").
- **A ceiling.** \`max_slot_wal_keep_size\` caps how much WAL a slot may hold back; the default is -1 (unlimited). Past the cap Postgres invalidates the slot to protect itself, and the connector must start over with a new slot and a fresh snapshot (Postgres mailing-list discussions; Artie troubleshooting guide).
- **Monitoring.** Alert on retained WAL: compare \`pg_current_wal_lsn()\` with \`confirmed_flush_lsn\` in \`pg_replication_slots\`, and on consumer lag in Kafka.
- **Failover.** Before PostgreSQL 17, logical slots lived only on the primary, so after a failover the connector had no slot on the new primary. PostgreSQL 17 can synchronise failover-enabled logical slots to a standby (\`sync_replication_slots\`), so CDC continues after promotion (Gunnar Morling, "Failover Replication Slots with Postgres 17"; AWS RDS documentation). How failover works in general: [database replication](/interview-question/what-is-database-replication).
- **Schema changes.** Adding a nullable column is usually safe; renaming or dropping columns changes the events consumers parse. Use a schema registry with compatibility rules, or publish a stable outbox event instead of raw table rows.

## 8. A Worked Capacity Estimate

Assumptions: 3000 row changes per second at peak on the captured tables, about 1.5 KB per JSON change event, Kafka retention 7 days with replication factor 3, Elasticsearch bulk requests of 500 documents.

- Kafka ingress: 3000 x 1.5 KB = 4.5 MB/s, about 389 GB per day.
- Kafka storage: 7 days is about 2.7 TB, times 3 replicas is about 8.2 TB. A compacted topic for the catalogue keeps only the latest event per product and stays far smaller; use it if consumers need "current state" replays.
- Indexer: 3000 / 500 = 6 bulk requests per second, easily handled by one consumer group with a few partitions.
- A single Debezium task reads one slot sequentially; one connector per database is typical, so very high change rates are split by database or table set.

## 9. Raw Table CDC or the Outbox?

Debezium can stream the \`products\` table itself (good for search and cache, whose job is to mirror rows) or an **outbox** table where the service writes explicit domain events (good when other services consume business events and should not depend on your table layout). Both use the same connector; the outbox variant adds the outbox event router. The trade-off, and the polling alternatives, are covered in [outbox pattern vs polling for CDC](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure). Building read models from events is taken further in [event sourcing and CQRS](/interview-question/what-are-event-sourcing-and-cqrs).

| Approach | Missed changes | Deletes | Latency | Load on primary | Extra infrastructure |
| :--- | :--- | :--- | :--- | :--- | :--- |
| API writes DB, index and cache | on any crash between writes | if coded | immediate | none | none |
| Polling by \`updated_at\` | late commits, intermediate states | no | poll interval | indexed scans | a worker |
| Debezium on the table | none (at-least-once) | yes | usually sub-second | WAL reading, a slot | Kafka Connect, Kafka |
| Debezium on an outbox | none (at-least-once) | as explicit events | usually sub-second | same, plus outbox writes | same plus the router |

## 10. Verified: Running the Code

The example **"Log-based CDC in miniature: snapshot, WAL streaming, connector replay, LSN-versioned index and cache race"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Snapshot (op=r) then streaming (op=c/u/d)
  connector crashed after sending LSN 104; last committed offset LSN 102; restart replays from there
  topic: r:p1@100 r:p2@100 r:p3@100 u:p1@101 c:p4@102 u:p2@103 d:p3@104 tombstone:p3@104 u:p2@103 d:p3@104 tombstone:p3@104 u:p1@105

== 2. Consumers: search index (versioned by LSN) and a naive counter
  messages 12, applied 8, skipped as already applied 2
  index [p1=lamp:30, p2=desk:110, p4=shelf:60]
  db    [p1=lamp:30, p2=desk:110, p4=shelf:60] -> match true
  naive "price changed" counter: 4 (truth 3)

== 3. Cache race: reader fills the cache with a value read before the update
  CDC deletes the key:          cache p1 price 30 (db 25) -> stale until TTL
  CDC writes value + LSN guard: cache p1 price 25 (db 25)

== 4. Replication slot retention when the slot stops advancing
  stalled  1 h at 50 MB/min of WAL -> 3.0 GB kept on the primary disk
  stalled  6 h at 50 MB/min of WAL -> 18.0 GB kept on the primary disk
  stalled 24 h at 50 MB/min of WAL -> 72.0 GB kept on the primary disk
~~~

What the simulation stands for and what it leaves out: the WAL is an array of committed changes with increasing LSNs, the connector is a loop that commits its offset every two events and crashes once before a flush, the Kafka topic is an array, the search index and cache are Maps. The cache race uses a hypothetical later update (LSN 106) to show the interleaving. There is no real Postgres, Debezium, Kafka, Elasticsearch or Redis; the WAL growth figures are arithmetic on an assumed rate.

## Edge Cases Worth Knowing

- **Large transactions** arrive only after they commit; a bulk update of a million rows becomes a burst of a million events.
- **TOAST columns**: large unchanged values may be missing from update events (Debezium sends a placeholder) unless replica identity is full — and a Debezium issue (DBZ-7193) reports a case with toasted arrays even then. Indexers should treat the placeholder as "unchanged".
- **Truncate** is a separate event type and may need explicit handling or be skipped by configuration.
- **Rebuilding the index**: create a new index from an incremental snapshot plus the stream, then switch an alias; never patch a corrupt index in place.

## Common Pitfalls

- **Assuming exactly-once** — the run replayed LSN 103 and 104 after one crash; a per-event counter went to 4 instead of 3.
- **Applying events without a version check** — use the LSN as an external version so replays and reorders are skipped (2 skipped in the run).
- **Deleting cache keys and trusting cache-aside readers** — a slow reader re-filled the cache with 30 while Postgres said 25.
- **Leaving an abandoned slot behind** — at 50 MB/min of WAL a stalled slot keeps 72 GB in a day on the primary; monitor it and set heartbeats.
- **Forgetting failover** — before Postgres 17 a logical slot does not survive promotion; plan for re-snapshot or use failover slots.
- **Streaming raw tables to other teams** — your column names become their contract; use an outbox for cross-service events.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Instead of the API writing to Postgres, Elasticsearch and Redis, it writes only to Postgres. <strong style="color:#ffca28;">Debezium</strong> reads committed changes from the <strong style="color:#ffca28;">WAL</strong> through a <strong style="color:#ffca28;">logical replication slot</strong> and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pgoutput</code> plugin, and publishes them to Kafka keyed by primary key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Bootstrapping:</strong> <span style="color:#f0e2c8;">On first start it takes a consistent <strong style="color:#ffca28;">initial snapshot</strong> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">op=r</code>) and then streams from the recorded LSN, so nothing is missed; later backfills use <strong style="color:#ffca28;">incremental snapshots</strong> triggered by a signal.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Consumers:</strong> <span style="color:#f0e2c8;">Delivery is <strong style="color:#ffca28;">at-least-once</strong>, so the indexer upserts by id with the <strong style="color:#ffca28;">LSN as an external version</strong> and handles <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">op=d</code> and tombstones; per-key partitioning keeps each product changes in order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cache:</strong> <span style="color:#f0e2c8;">Deleting keys on change can lose a race with a slow cache-aside reader, so I write the new value with its LSN and only let readers fill a key that holds nothing newer, plus a TTL as a backstop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Operations:</strong> <span style="color:#f0e2c8;">The slot makes the primary keep WAL until Debezium confirms it, so I monitor retained WAL, enable <strong style="color:#ffca28;">heartbeats</strong>, set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_slot_wal_keep_size</code>, and plan for failover — Postgres 17 can sync logical slots to standbys.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when the connector crashes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It restarts from its last committed offset and replays everything after it. In the example LSN 103 and 104 were delivered twice; the LSN-versioned indexer skipped both, and the index still matched Postgres.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just poll with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">updated_at</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Polling misses deletes, collapses several updates into one, and skips rows from transactions that commit after the watermark moved on. The WAL has every committed change in commit order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add search for a table that already has 200 million rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Trigger an incremental snapshot for that table: Debezium reads it in primary-key chunks while streaming continues and reconciles chunks with live changes using watermarks. Build into a new index and switch an alias when it has caught up.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the biggest operational risk?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">WAL retention. If the connector stops confirming, Postgres keeps WAL for the slot — at 50 MB/min that is 72 GB a day on the primary disk. Alert on slot lag and cap it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_slot_wal_keep_size</code>, accepting a re-snapshot if the cap is hit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">REPLICA IDENTITY FULL</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for an indexer that upserts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">after</code> and deletes by key — the default gives the key in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">before</code>. Use FULL when consumers need old values, for example to remove an item from a category index when its category changes, and accept the extra WAL.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Change data capture (CDC) | Turning committed changes into a stream of events |
| Derived data | Data recomputable from the source of truth |
| Logical replication slot | Durable WAL cursor for one consumer; WAL is kept until it advances |
| Logical decoding | Turning WAL into row-level changes in commit order |
| Initial snapshot | One-time copy of existing rows as op=r events |
| Incremental snapshot | Chunked re-read of a table while streaming continues |
| Change event envelope | before, after, op and source metadata |
| Replica identity | How much of the old row Postgres logs for updates and deletes |
| Tombstone | Empty message after a delete, for log compaction |
| Idempotent sink with external versioning | Apply only events with a newer LSN than stored |

**Conclusion:** Debezium keeps search and cache in sync by reading the one place that already records every committed change in order — the Postgres WAL — through a replication slot, after a consistent initial snapshot. That removes dual writes from the API, but it moves the hard parts to the edges: delivery is at-least-once (LSN 103 and 104 arrived twice in the run, and only the LSN version check kept the index correct), cache invalidation can race with readers (30 cached while Postgres said 25), and a stalled slot can quietly fill the primary disk (72 GB a day at 50 MB/min). Version every write by LSN, write cache values instead of blind deletes, and watch the slot.`,
    examples: [
      {
        label: `Log-based CDC in miniature: snapshot, WAL streaming, connector replay, LSN-versioned index and cache race`,
        variants: [
          { tech: "node", code: `// Log-based CDC in miniature: a Postgres-like WAL with LSNs, a Debezium-like connector
// (snapshot, then stream, offsets committed every 2 events), a Kafka-like topic (array),
// a search indexer and a cache. All in-process; no real Postgres, Kafka or Elasticsearch.
const db = new Map([["p1", { name: "lamp", price: 40 }], ["p2", { name: "desk", price: 120 }], ["p3", { name: "chair", price: 80 }]]);
const wal = []; // committed changes in commit order
let lsn = 100; // snapshot is consistent as of LSN 100 (the slot is created here)
function write(op, id, row) {
  lsn++;
  const before = db.has(id) ? { ...db.get(id) } : null;
  if (op === "d") db.delete(id); else db.set(id, { ...(db.get(id) ?? {}), ...row });
  wal.push({ lsn, op, id, before, after: op === "d" ? null : { ...db.get(id) } });
}

const topic = [];
console.log("== 1. Snapshot (op=r) then streaming (op=c/u/d)");
for (const [id, row] of db) topic.push({ op: "r", id, after: { ...row }, lsn: 100 });
write("u", "p1", { price: 35 });
write("c", "p4", { name: "shelf", price: 60 });
write("u", "p2", { price: 110 });
write("d", "p3");
write("u", "p1", { price: 30 });

// Connector: emits from the slot, commits its offset every 2 events, crashes once.
let committed = 100, sinceCommit = 0, crashed = false;
for (let i = 0; i < wal.length; i++) {
  const e = wal[i];
  if (e.lsn <= committed) continue;
  topic.push({ op: e.op, id: e.id, before: e.before, after: e.after, lsn: e.lsn });
  if (e.op === "d") topic.push({ op: "tombstone", id: e.id, lsn: e.lsn });
  if (!crashed && e.lsn === 104) { // crash after sending, before the offset flush
    crashed = true; sinceCommit = 0;
    console.log(\`  connector crashed after sending LSN 104; last committed offset LSN \${committed}; restart replays from there\`);
    i = wal.findIndex((x) => x.lsn > committed) - 1;
    continue;
  }
  if (++sinceCommit === 2) { committed = e.lsn; sinceCommit = 0; }
}
console.log("  topic: " + topic.map((m) => \`\${m.op}:\${m.id}@\${m.lsn}\`).join(" "));

console.log("\\n== 2. Consumers: search index (versioned by LSN) and a naive counter");
const index = new Map(); // id -> {doc, version}
let applied = 0, stale = 0, naivePriceChanges = 0;
for (const m of topic) {
  if (m.op === "tombstone") continue; // used by Kafka log compaction, not by the indexer
  if (m.op === "u" && m.before.price !== m.after.price) naivePriceChanges++;
  const cur = index.get(m.id);
  if (cur && cur.version >= m.lsn) { stale++; continue; } // replayed or out-of-order event
  if (m.op === "d") index.set(m.id, { doc: null, version: m.lsn }); // keep a deleted marker with its version
  else index.set(m.id, { doc: m.after, version: m.lsn });
  applied++;
}
const live = [...index.entries()].filter(([, v]) => v.doc).map(([id, v]) => \`\${id}=\${v.doc.name}:\${v.doc.price}\`);
const dbView = [...db.entries()].map(([id, r]) => \`\${id}=\${r.name}:\${r.price}\`);
console.log(\`  messages \${topic.length}, applied \${applied}, skipped as already applied \${stale}\`);
console.log(\`  index [\${live.join(", ")}]\`);
console.log(\`  db    [\${dbView.join(", ")}] -> match \${live.join() === dbView.join()}\`);
console.log(\`  naive "price changed" counter: \${naivePriceChanges} (truth \${wal.filter((e) => e.op === "u").length})\`);

console.log("\\n== 3. Cache race: reader fills the cache with a value read before the update");
function race(versioned) {
  const cache = new Map();
  const readerSaw = { value: 30, version: 105 }; // t1: cache miss, reader reads the DB row
  const change = { value: 25, version: 106 }; // t2: price update commits; t3: CDC event arrives
  if (versioned) cache.set("p1", change); else cache.delete("p1");
  const cur = cache.get("p1"); // t4: slow reader writes what it read at t1
  if (!versioned || !cur || cur.version < readerSaw.version) cache.set("p1", readerSaw);
  return cache.get("p1").value;
}
console.log(\`  CDC deletes the key:          cache p1 price \${race(false)} (db 25) -> stale until TTL\`);
console.log(\`  CDC writes value + LSN guard: cache p1 price \${race(true)} (db 25)\`);

console.log("\\n== 4. Replication slot retention when the slot stops advancing");
const walMbPerMin = 50;
for (const hours of [1, 6, 24]) console.log(\`  stalled \${String(hours).padStart(2)} h at \${walMbPerMin} MB/min of WAL -> \${(walMbPerMin * 60 * hours / 1000).toFixed(1)} GB kept on the primary disk\`);` },
          { tech: "python", code: `# Log-based CDC in miniature: a Postgres-like WAL with LSNs, a Debezium-like connector
# (snapshot, then stream, offsets committed every 2 events), a Kafka-like topic (list),
# a search indexer and a cache. All in-process; no real Postgres, Kafka or Elasticsearch.
db = {"p1": {"name": "lamp", "price": 40}, "p2": {"name": "desk", "price": 120}, "p3": {"name": "chair", "price": 80}}
wal = []  # committed changes in commit order
lsn = 100  # snapshot is consistent as of LSN 100 (the slot is created here)


def write(op, rid, row=None):
    global lsn
    lsn += 1
    before = dict(db[rid]) if rid in db else None
    if op == "d":
        del db[rid]
    else:
        db[rid] = {**db.get(rid, {}), **row}
    wal.append({"lsn": lsn, "op": op, "id": rid, "before": before, "after": None if op == "d" else dict(db[rid])})


topic = []
print("== 1. Snapshot (op=r) then streaming (op=c/u/d)")
for rid, row in db.items():
    topic.append({"op": "r", "id": rid, "after": dict(row), "lsn": 100})
write("u", "p1", {"price": 35})
write("c", "p4", {"name": "shelf", "price": 60})
write("u", "p2", {"price": 110})
write("d", "p3")
write("u", "p1", {"price": 30})

# Connector: emits from the slot, commits its offset every 2 events, crashes once.
committed, since_commit, crashed = 100, 0, False
i = 0
while i < len(wal):
    e = wal[i]
    i += 1
    if e["lsn"] <= committed:
        continue
    topic.append({"op": e["op"], "id": e["id"], "before": e["before"], "after": e["after"], "lsn": e["lsn"]})
    if e["op"] == "d":
        topic.append({"op": "tombstone", "id": e["id"], "lsn": e["lsn"]})
    if not crashed and e["lsn"] == 104:  # crash after sending, before the offset flush
        crashed, since_commit = True, 0
        print(f"  connector crashed after sending LSN 104; last committed offset LSN {committed}; restart replays from there")
        i = next(k for k, x in enumerate(wal) if x["lsn"] > committed)
        continue
    since_commit += 1
    if since_commit == 2:
        committed, since_commit = e["lsn"], 0
print("  topic: " + " ".join(f"{m['op']}:{m['id']}@{m['lsn']}" for m in topic))

print("\\n== 2. Consumers: search index (versioned by LSN) and a naive counter")
index = {}  # id -> {doc, version}
applied = stale = naive_price_changes = 0
for m in topic:
    if m["op"] == "tombstone":
        continue  # used by Kafka log compaction, not by the indexer
    if m["op"] == "u" and m["before"]["price"] != m["after"]["price"]:
        naive_price_changes += 1
    cur = index.get(m["id"])
    if cur and cur["version"] >= m["lsn"]:
        stale += 1  # replayed or out-of-order event
        continue
    index[m["id"]] = {"doc": None if m["op"] == "d" else m["after"], "version": m["lsn"]}
    applied += 1
live = [f"{rid}={v['doc']['name']}:{v['doc']['price']}" for rid, v in index.items() if v["doc"]]
db_view = [f"{rid}={r['name']}:{r['price']}" for rid, r in db.items()]
print(f"  messages {len(topic)}, applied {applied}, skipped as already applied {stale}")
print(f"  index [{', '.join(live)}]")
print(f"  db    [{', '.join(db_view)}] -> match {'true' if live == db_view else 'false'}")
print(f"  naive \\"price changed\\" counter: {naive_price_changes} (truth {sum(1 for e in wal if e['op'] == 'u')})")

print("\\n== 3. Cache race: reader fills the cache with a value read before the update")


def race(versioned):
    cache = {}
    reader_saw = {"value": 30, "version": 105}  # t1: cache miss, reader reads the DB row
    change = {"value": 25, "version": 106}  # t2: price update commits; t3: CDC event arrives
    if versioned:
        cache["p1"] = change
    else:
        cache.pop("p1", None)
    cur = cache.get("p1")  # t4: slow reader writes what it read at t1
    if not versioned or not cur or cur["version"] < reader_saw["version"]:
        cache["p1"] = reader_saw
    return cache["p1"]["value"]


print(f"  CDC deletes the key:          cache p1 price {race(False)} (db 25) -> stale until TTL")
print(f"  CDC writes value + LSN guard: cache p1 price {race(True)} (db 25)")

print("\\n== 4. Replication slot retention when the slot stops advancing")
wal_mb_per_min = 50
for hours in (1, 6, 24):
    print(f"  stalled {hours:>2} h at {wal_mb_per_min} MB/min of WAL -> {wal_mb_per_min * 60 * hours / 1000:.1f} GB kept on the primary disk")` },
        ],
      },
    ],
  },
  {
    title: `What are event sourcing and CQRS?`,
    difficulty: "hard",
    seoDescription: `Event sourcing and CQRS explained: event streams, optimistic concurrency, projections, eventual consistency, snapshots and when not to use them.`,
    description: `**Question presented to candidate:**
"Explain event sourcing and CQRS. Are they the same thing? How does an event-sourced service load its current state, how do two concurrent commands avoid corrupting it, how are queries served, and when would you advise a team not to use either?"

**What a strong answer should cover:**
- **Event sourcing**: the source of truth is an append-only sequence of domain events per entity (a **stream**); current state is a **fold** (replay) of those events; nothing is updated in place
- **Optimistic concurrency** on append: a command loads the stream at version N and appends with "expected version N"; a concurrent writer gets a conflict and retries
- **CQRS**: separate the write model (commands, invariants) from one or more read models (**projections**) shaped for queries; they can use different stores
- Projections are updated asynchronously from the event log, so reads are **eventually consistent**; projections can be rebuilt or added later by replaying history
- Practicalities: **snapshots** to bound replay time, **event versioning / upcasting**, publishing events reliably, GDPR-style deletion in an immutable log
- They are independent: CQRS works without event sourcing, and both add real complexity — use them for audit-heavy, collaborative or temporal domains, not for plain CRUD

**Code / implementation expected:** Optional — an event store with expected-version appends and a projection; the example shows a write conflict, projection lag, time travel and snapshots.`,
    answer: `**Target Audience:** Back-end developers who have built CRUD services and keep hearing these two terms together. No prior knowledge of either assumed.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

Your bank does not store "your balance is 530" and overwrite it each time. It stores the statement: opened, deposited 100, withdrew 70, deposited 500. The balance is just the sum of the lines. Because of that, the bank can answer questions nobody planned for — "what was the balance on 3 March?", "show every deposit over 100 this year" — and it can prove how every number came to be.

Now imagine the bank also prints a big screen in the lobby with today's balances for its business customers. Nobody computes that screen by summing statements on every glance; a clerk keeps it updated from the statements as they come in, a little behind. If the screen is ever wrong, it can be wiped and rebuilt from the statements.

The statement is **event sourcing**. Keeping the lobby screen as a separate, query-shaped copy is **CQRS**.

## 2. Event Sourcing

📌 **Interview term: event** — an immutable fact that happened in the domain, named in the past tense: \`Deposited { amount: 100 }\`, \`OrderShipped\`. Not "set balance to 130".

📌 **Interview term: event sourcing** — storing the state of each entity as the ordered list of events that changed it, instead of only its latest value. The events are the source of truth; current state is derived.

📌 **Interview term: event stream and event store** — all events of one entity (an aggregate, such as account \`acct-1\`) form a **stream** with versions 1, 2, 3... An **event store** is a database optimised for appending to streams and reading them back, often also offering a global ordered log for subscribers. It can be a dedicated product or a table in Postgres with \`(stream_id, version)\` as primary key.

Loading an entity means replaying its stream:

~~~js
function evolve(state, e) {
  if (e.type === "Opened") return { balance: 0, open: true };
  if (e.type === "Deposited") return { ...state, balance: state.balance + e.data.amount };
  if (e.type === "Withdrawn") return { ...state, balance: state.balance - e.data.amount };
  return state;
}
const state = events.reduce(evolve, null);   // current state = fold over the events
~~~

📌 **Interview term: fold (rehydration)** — rebuilding current state by applying each event in order to an initial state. The \`evolve\` function must be pure and must never reject an event: the event already happened. Validation happens before an event is written, in the command handler.

~~~text
== 1. Commands append events; state is rebuilt by replaying them
  stream acct-1: v1 Opened, v2 Deposited 100
  load -> balance 100 at v2
~~~

## 3. Commands and Optimistic Concurrency

A **command** is a request that may be refused: \`Withdraw 70\`. The handler loads the stream, checks the business rule (no overdraft) against the folded state, and if it passes, appends new events. Two handlers can load the same version at the same time, so the append carries the version it was based on:

~~~text
== 2. Two withdrawals of 70 race, both loaded at v2
  A: ok, balance now 30
  B: conflict: expected v2, stream is at v3 -> reload and retry
  B retry: rejected: balance 30 < 70
  without the version check both would succeed: balance -40
~~~

📌 **Interview term: optimistic concurrency (expected version)** — an append says "I read this stream at version 2; append only if it is still at version 2". The second writer gets a conflict, reloads (now version 3, balance 30) and re-checks the rule, which now rejects the withdrawal. Without the check both withdrawals pass and the balance goes to -40. Dedicated event stores expose exactly this; the KurrentDB client documentation, for example, lets an append specify any, no-stream, stream-exists or an exact expected revision and fails the append on mismatch. With a SQL table, the unique key on \`(stream_id, version)\` gives the same guarantee. Background: [optimistic vs pessimistic locking](/interview-question/what-is-the-difference-between-optimistic-and-pessimistic-locking).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Write side: a command is validated against state folded from the stream, then new events are appended with an expected version">
  <defs>
    <marker id="sd08q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="107" text-anchor="middle">command</text>
  <text class="d-sub" x="90" y="127" text-anchor="middle">Withdraw 70</text>
  <rect class="d-box-accent" x="250" y="70" width="190" height="80" rx="10"/>
  <text class="d-text" x="345" y="102" text-anchor="middle">command handler</text>
  <text class="d-sub" x="345" y="126" text-anchor="middle">fold, check rule</text>
  <rect class="d-box" x="530" y="20" width="170" height="56" rx="10"/>
  <text class="d-text" x="615" y="45" text-anchor="middle">event stream</text>
  <text class="d-sub" x="615" y="65" text-anchor="middle">read at v2</text>
  <rect class="d-box" x="530" y="144" width="170" height="56" rx="10"/>
  <text class="d-text" x="615" y="169" text-anchor="middle">append</text>
  <text class="d-sub" x="615" y="189" text-anchor="middle">expected v2</text>
  <path class="d-edge" d="M 160 110 L 244 110" marker-end="url(#sd08q5-arrow)"/>
  <path class="d-edge-dashed" d="M 530 50 L 446 90" marker-end="url(#sd08q5-arrow)"/>
  <path class="d-edge-accent" d="M 440 130 L 524 170" marker-end="url(#sd08q5-arrow)"/>
</svg>

The dashed arrow is the read; the accent arrow is the conditional append that fails if anyone else appended in between.

## 4. CQRS

📌 **Interview term: CQRS (Command Query Responsibility Segregation)** — use one model to change data (commands, business rules) and a different model, or several, to read it (queries). The name comes from Greg Young (around 2010), who lifted Bertrand Meyer's command-query separation principle for methods, from *Object-Oriented Software Construction* (1988), to the level of whole models (Wikipedia "Command–query separation"; Microsoft patterns & practices CQRS Journey).

Why split? An event stream is great for enforcing rules on one account and terrible for "top 20 accounts by balance" or a full-text search. CQRS lets each read be served from a store shaped for it: a SQL table, a search index, a cache, a graph.

📌 **Interview term: projection (read model)** — a query-optimised view built by processing events in order and remembering a **checkpoint** (the position of the last event applied). It can be dropped and rebuilt from the log at any time.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="CQRS: commands go to the write model and event store; projectors build two read models that serve queries">
  <defs>
    <marker id="sd08q5-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="90" width="170" height="64" rx="10"/>
  <text class="d-text" x="105" y="118" text-anchor="middle">write model</text>
  <text class="d-sub" x="105" y="140" text-anchor="middle">commands</text>
  <rect class="d-box" x="270" y="90" width="170" height="64" rx="10"/>
  <text class="d-text" x="355" y="118" text-anchor="middle">event log</text>
  <text class="d-sub" x="355" y="140" text-anchor="middle">append only</text>
  <rect class="d-box" x="520" y="20" width="180" height="64" rx="10"/>
  <text class="d-text" x="610" y="47" text-anchor="middle">balances table</text>
  <text class="d-sub" x="610" y="68" text-anchor="middle">queries by id</text>
  <rect class="d-box" x="520" y="160" width="180" height="64" rx="10"/>
  <text class="d-text" x="610" y="187" text-anchor="middle">search index</text>
  <text class="d-sub" x="610" y="208" text-anchor="middle">queries by text</text>
  <path class="d-edge" d="M 190 122 L 264 122" marker-end="url(#sd08q5-arrow2)"/>
  <path class="d-edge-dashed" d="M 440 110 L 514 60" marker-end="url(#sd08q5-arrow2)"/>
  <path class="d-edge-dashed" d="M 440 135 L 514 185" marker-end="url(#sd08q5-arrow2)"/>
</svg>

Dashed arrows are asynchronous projectors. Each read model has its own checkpoint and can lag, fail or be rebuilt on its own.

The price is **eventual consistency** between the two sides:

~~~text
== 3. CQRS read model is eventually consistent
  write side balance 530; read model says 30 (checkpoint 3 of 4)
  after the projector catches up: read model 530 (checkpoint 4 of 4)
~~~

📌 **Interview term: projection lag** — the gap between an event being appended and a read model reflecting it. Right after the deposit the write side said 530 and the read model said 30. Usual fixes: return the new state or version from the command so the UI shows it directly; let the client wait until the read model checkpoint passes the version it wrote (read-your-writes); or read from the write model for that one screen. The same trade-off as in [strong vs eventual consistency](/interview-question/what-is-the-difference-between-strong-and-eventual-consistency).

**CQRS does not require event sourcing.** A classic CRUD service can write to normalised Postgres tables and feed a search index or denormalised read tables from them, for example through [CDC with Debezium](/interview-question/how-does-cdc-with-debezium-keep-search-and-cache-in-sync-with-postgres). Event sourcing does not strictly require CQRS either, but querying across streams without projections is impractical, so they usually travel together.

## 5. What You Get From Keeping Every Event

~~~text
== 4. Time travel and a projection added later
  balance as of v3: 30
  new "large deposits" view rebuilt from history: [acct-1 100 @pos2, acct-1 500 @pos4]
~~~

- **Time travel**: state as of any version or timestamp, by folding only part of the stream (balance as of v3 was 30).
- **New views without migration**: a "large deposits" view that nobody planned for was built from history, including the 100 deposited before the view existed.
- **Audit**: every change is recorded with what happened, not just the final value. This is why ledgers, payments, trading, logistics tracking and collaborative tools use it.
- **Debugging and replay**: reproduce a bug by replaying the exact events into a fixed version of the code.
- **Integration**: the same events can feed other services through a broker, as in [publish-subscribe](/interview-question/what-is-the-publish-subscribe-pattern). Publish them reliably — if the store is a SQL table, use the [transactional outbox](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure) or CDC rather than a second write.

## 6. The Costs

**Replay time grows.** A stream with 1000 events takes 1000 steps to load. Snapshots bound it:

~~~text
== 5. Snapshots bound replay cost
  full replay: 1000 events -> balance 999
  snapshot at v950 + 50 events -> balance 999
  events in the store: 1004; nothing was ever updated in place
~~~

📌 **Interview term: snapshot** — a stored copy of the folded state at a version (here v950), so loading means "read the snapshot, then apply only later events" (50 instead of 1000). Snapshots are a cache: they can be deleted and recomputed. Long streams are often also a modelling smell; a "closing the books" event that starts a new stream per period is a common alternative.

📌 **Interview term: event versioning / upcasting** — events are stored forever, but code changes. Old events must stay readable: add fields with defaults, introduce \`DepositedV2\`, or **upcast** old events into the new shape when they are read. Never edit stored events in place.

Other real costs:

- **Deleting personal data** from an immutable log needs a plan, such as storing personal fields encrypted with a per-person key and deleting the key ("crypto-shredding"), or keeping personal data outside the events.
- **Eventual consistency** in every read path, and the UI work that comes with it.
- **Cross-entity rules** (a username must be unique across all accounts) do not fit one stream; they need a separate uniqueness table or a reservation process.
- **Learning curve and tooling**: projections, replays, versioning and monitoring are all new moving parts. For a CRUD admin screen this is pure overhead.

| | CRUD (state only) | CQRS without event sourcing | Event sourcing + CQRS |
| :--- | :--- | :--- | :--- |
| Source of truth | current rows | current rows | events |
| History and audit | only if added separately | only if added separately | built in |
| Read models | the same tables | separate, fed from changes | separate, fed from events |
| Read consistency | immediate | eventual for read models | eventual for read models |
| New views later | migration or backfill | backfill from current state | replay full history |
| Complexity | low | medium | high |
| Good for | most services | heavy or varied read loads | audit, temporal queries, collaborative domains |

## 7. Verified: Running the Code

The example **"Event store with optimistic concurrency, a lagging CQRS projection, time travel and snapshots"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Commands append events; state is rebuilt by replaying them
  stream acct-1: v1 Opened, v2 Deposited 100
  load -> balance 100 at v2

== 2. Two withdrawals of 70 race, both loaded at v2
  A: ok, balance now 30
  B: conflict: expected v2, stream is at v3 -> reload and retry
  B retry: rejected: balance 30 < 70
  without the version check both would succeed: balance -40

== 3. CQRS read model is eventually consistent
  write side balance 530; read model says 30 (checkpoint 3 of 4)
  after the projector catches up: read model 530 (checkpoint 4 of 4)

== 4. Time travel and a projection added later
  balance as of v3: 30
  new "large deposits" view rebuilt from history: [acct-1 100 @pos2, acct-1 500 @pos4]

== 5. Snapshots bound replay cost
  full replay: 1000 events -> balance 999
  snapshot at v950 + 50 events -> balance 999
  events in the store: 1004; nothing was ever updated in place
~~~

What the simulation stands for and what it leaves out: the event store is one in-memory array with a global position and per-stream versions; the expected-version check stands for a conditional append (a unique key on \`(stream_id, version)\` in SQL). The projector is a function called explicitly to show lag, where a real one runs continuously and persists its checkpoint. The snapshot is computed in memory rather than stored. There is no real event store, broker, persistence or concurrency.

## Edge Cases Worth Knowing

- **Projections must be idempotent** or store their checkpoint in the same transaction as the view update, otherwise a crash replays events into the view twice.
- **Global ordering**: projections that combine streams need a global position; a per-stream version is not enough.
- **Retries after conflicts** should reload and re-run the whole command, not re-append the old event.
- **Rebuilding a big projection** can take hours; build it beside the old one and switch when it has caught up.

## Common Pitfalls

- **Treating events as "row changed" notifications** (\`AccountUpdated { balance: 130 }\`) — you lose the meaning that made the history useful; record what happened (\`Deposited 100\`).
- **Skipping the expected-version check** — the run shows two concurrent withdrawals taking the balance to -40.
- **Reading your own write from a projection immediately** — the read model said 30 right after a deposit to 530; return the new state from the command or wait for the checkpoint.
- **Using event sourcing everywhere** — apply it to the few bounded contexts that need history; plain CRUD elsewhere.
- **Changing stored events in place** — version or upcast them instead; the log is a permanent contract.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Event sourcing:</strong> <span style="color:#f0e2c8;">Store each entity as an append-only <strong style="color:#ffca28;">stream of events</strong> — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deposited 100</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Withdrawn 70</code> — instead of its current row. Current state is a <strong style="color:#ffca28;">fold</strong> over the events; nothing is updated in place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Writes:</strong> <span style="color:#f0e2c8;">A command loads the stream at version N, checks business rules on the folded state, and appends with <strong style="color:#ffca28;">expected version N</strong>. A concurrent writer gets a conflict and retries, so two withdrawals cannot both pass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. CQRS:</strong> <span style="color:#f0e2c8;">Separate the write model from <strong style="color:#ffca28;">read models</strong>. <strong style="color:#ffca28;">Projections</strong> consume the event log, keep a checkpoint, and build query-shaped stores — SQL tables, a search index — that can be rebuilt by replaying history.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Trade-offs:</strong> <span style="color:#f0e2c8;">Reads are <strong style="color:#ffca28;">eventually consistent</strong>, streams need <strong style="color:#ffca28;">snapshots</strong> to load fast, events need <strong style="color:#ffca28;">versioning or upcasting</strong>, and deleting personal data needs a plan such as crypto-shredding.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When:</strong> <span style="color:#f0e2c8;">They are independent: CQRS without event sourcing is common. I use event sourcing for audit-heavy or temporal domains like ledgers and order tracking, and plain CRUD for most services.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are event sourcing and CQRS the same thing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Event sourcing is about how the write side stores state — as events. CQRS is about separating reads from writes. CQRS works on top of normal tables; event sourcing almost always needs CQRS for queries across entities.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a user who reads right after writing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return the new state or version from the command and render it directly, or make the read wait until the projection checkpoint passes that version. In the example the read model showed 30 until the projector caught up to 530.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you change the shape of an event that is already stored?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Never edit it. Add optional fields with defaults, introduce a new event version, or upcast old events into the new shape at read time, so every historical event stays readable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Replay is getting slow. What do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store snapshots every N events and replay only the tail — 50 events instead of 1000 in the example. If streams grow without bound, model periods, such as a yearly closing event that starts a new stream.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you enforce a unique email across accounts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A single stream cannot see other streams, so use a separate uniqueness store — a table with a unique constraint written before or within the command — or a reservation step, and accept that it sits outside the event-sourced model.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Event | Immutable past-tense fact in the domain |
| Event sourcing | Storing state as the list of events that produced it |
| Event stream and event store | One entity events in version order; the database that holds streams |
| Fold (rehydration) | Rebuilding state by applying events in order |
| Optimistic concurrency (expected version) | Append only if the stream is still at the version read |
| CQRS | Separate models for commands and for queries |
| Projection (read model) | Query-shaped view built from events with a checkpoint |
| Projection lag | Delay before a read model reflects a new event |
| Snapshot | Stored folded state at a version to shorten replay |
| Event versioning / upcasting | Keeping old events readable as their shape changes |

**Conclusion:** Event sourcing makes the history the source of truth — state is a fold over an append-only stream, guarded by an expected-version check that turned a would-be -40 balance into a clean conflict in the run — and CQRS serves reads from separate projections built from that history. Together they give audit, time travel and new views for free (a "large deposits" view rebuilt from events written before it existed), at the cost of eventual consistency (the read model said 30 while the account held 530), snapshots, event versioning and real operational complexity. Use them where history is the product; keep plain CRUD everywhere else.`,
    examples: [
      {
        label: `Event store with optimistic concurrency, a lagging CQRS projection, time travel and snapshots`,
        variants: [
          { tech: "node", code: `// Event sourcing + CQRS in miniature. The event store is an append-only array with
// per-stream versions and optimistic concurrency; the read side is a projection that
// catches up from a checkpoint. In-process only: no real event store or database.
const log = []; // global, ordered: {pos, stream, version, type, data}
function readStream(stream) { return log.filter((e) => e.stream === stream); }
function append(stream, expectedVersion, events) {
  const current = readStream(stream).length;
  if (current !== expectedVersion) throw new Error(\`conflict: expected v\${expectedVersion}, stream is at v\${current}\`);
  events.forEach((ev, i) => log.push({ pos: log.length + 1, stream, version: current + i + 1, ...ev }));
}

// Write side: state is a fold over the events.
function evolve(s, e) {
  if (e.type === "Opened") return { balance: 0, open: true };
  if (e.type === "Deposited") return { ...s, balance: s.balance + e.data.amount };
  if (e.type === "Withdrawn") return { ...s, balance: s.balance - e.data.amount };
  return s;
}
function load(stream, upTo = Infinity) {
  const evs = readStream(stream).filter((e) => e.version <= upTo);
  return { state: evs.reduce(evolve, null), version: evs.length, applied: evs.length };
}
function withdraw(stream, amount, loaded) {
  const { state, version } = loaded ?? load(stream);
  if (state.balance < amount) return \`rejected: balance \${state.balance} < \${amount}\`;
  append(stream, version, [{ type: "Withdrawn", data: { amount } }]);
  return \`ok, balance now \${state.balance - amount}\`;
}

// Read side: a projection with its own table and checkpoint.
const balances = new Map();
let checkpoint = 0;
function project() {
  for (const e of log.filter((x) => x.pos > checkpoint)) {
    if (e.type === "Opened") balances.set(e.stream, 0);
    if (e.type === "Deposited") balances.set(e.stream, balances.get(e.stream) + e.data.amount);
    if (e.type === "Withdrawn") balances.set(e.stream, balances.get(e.stream) - e.data.amount);
    checkpoint = e.pos;
  }
}

console.log("== 1. Commands append events; state is rebuilt by replaying them");
append("acct-1", 0, [{ type: "Opened", data: {} }, { type: "Deposited", data: { amount: 100 } }]);
console.log("  stream acct-1: " + readStream("acct-1").map((e) => \`v\${e.version} \${e.type}\${e.data.amount ? " " + e.data.amount : ""}\`).join(", "));
console.log(\`  load -> balance \${load("acct-1").state.balance} at v\${load("acct-1").version}\`);

console.log("\\n== 2. Two withdrawals of 70 race, both loaded at v2");
const a = load("acct-1"), b = load("acct-1");
console.log("  A: " + withdraw("acct-1", 70, a));
try { withdraw("acct-1", 70, b); } catch (e) { console.log("  B: " + e.message + " -> reload and retry"); }
console.log("  B retry: " + withdraw("acct-1", 70));
console.log(\`  without the version check both would succeed: balance \${100 - 70 - 70}\`);

console.log("\\n== 3. CQRS read model is eventually consistent");
project();
append("acct-1", load("acct-1").version, [{ type: "Deposited", data: { amount: 500 } }]);
console.log(\`  write side balance \${load("acct-1").state.balance}; read model says \${balances.get("acct-1")} (checkpoint \${checkpoint} of \${log.length})\`);
project();
console.log(\`  after the projector catches up: read model \${balances.get("acct-1")} (checkpoint \${checkpoint} of \${log.length})\`);

console.log("\\n== 4. Time travel and a projection added later");
console.log(\`  balance as of v3: \${load("acct-1", 3).state.balance}\`);
const bigDeposits = log.filter((e) => e.type === "Deposited" && e.data.amount >= 100).map((e) => \`\${e.stream} \${e.data.amount} @pos\${e.pos}\`);
console.log(\`  new "large deposits" view rebuilt from history: [\${bigDeposits.join(", ")}]\`);

console.log("\\n== 5. Snapshots bound replay cost");
append("acct-2", 0, [{ type: "Opened", data: {} }]);
for (let i = 1; i < 1000; i++) append("acct-2", i, [{ type: "Deposited", data: { amount: 1 } }]);
const full = load("acct-2");
const snap = { state: load("acct-2", 950).state, version: 950 }; // stored every 50 events
const tail = readStream("acct-2").filter((e) => e.version > snap.version);
const fromSnap = tail.reduce(evolve, snap.state);
console.log(\`  full replay: \${full.applied} events -> balance \${full.state.balance}\`);
console.log(\`  snapshot at v\${snap.version} + \${tail.length} events -> balance \${fromSnap.balance}\`);
console.log(\`  events in the store: \${log.length}; nothing was ever updated in place\`);` },
          { tech: "python", code: `# Event sourcing + CQRS in miniature. The event store is an append-only list with
# per-stream versions and optimistic concurrency; the read side is a projection that
# catches up from a checkpoint. In-process only: no real event store or database.
import math

log = []  # global, ordered: {pos, stream, version, type, data}


def read_stream(stream):
    return [e for e in log if e["stream"] == stream]


def append(stream, expected_version, events):
    current = len(read_stream(stream))
    if current != expected_version:
        raise RuntimeError(f"conflict: expected v{expected_version}, stream is at v{current}")
    for i, ev in enumerate(events):
        log.append({"pos": len(log) + 1, "stream": stream, "version": current + i + 1, **ev})


# Write side: state is a fold over the events.
def evolve(s, e):
    if e["type"] == "Opened":
        return {"balance": 0, "open": True}
    if e["type"] == "Deposited":
        return {**s, "balance": s["balance"] + e["data"]["amount"]}
    if e["type"] == "Withdrawn":
        return {**s, "balance": s["balance"] - e["data"]["amount"]}
    return s


def fold(events, state):
    for e in events:
        state = evolve(state, e)
    return state


def load(stream, up_to=math.inf):
    evs = [e for e in read_stream(stream) if e["version"] <= up_to]
    return {"state": fold(evs, None), "version": len(evs), "applied": len(evs)}


def withdraw(stream, amount, loaded=None):
    loaded = loaded or load(stream)
    state, version = loaded["state"], loaded["version"]
    if state["balance"] < amount:
        return f"rejected: balance {state['balance']} < {amount}"
    append(stream, version, [{"type": "Withdrawn", "data": {"amount": amount}}])
    return f"ok, balance now {state['balance'] - amount}"


# Read side: a projection with its own table and checkpoint.
balances = {}
checkpoint = 0


def project():
    global checkpoint
    for e in [x for x in log if x["pos"] > checkpoint]:
        if e["type"] == "Opened":
            balances[e["stream"]] = 0
        if e["type"] == "Deposited":
            balances[e["stream"]] += e["data"]["amount"]
        if e["type"] == "Withdrawn":
            balances[e["stream"]] -= e["data"]["amount"]
        checkpoint = e["pos"]


def label(e):
    amt = e["data"].get("amount")
    return f"v{e['version']} {e['type']}" + (f" {amt}" if amt else "")


print("== 1. Commands append events; state is rebuilt by replaying them")
append("acct-1", 0, [{"type": "Opened", "data": {}}, {"type": "Deposited", "data": {"amount": 100}}])
print("  stream acct-1: " + ", ".join(label(e) for e in read_stream("acct-1")))
print(f"  load -> balance {load('acct-1')['state']['balance']} at v{load('acct-1')['version']}")

print("\\n== 2. Two withdrawals of 70 race, both loaded at v2")
a, b = load("acct-1"), load("acct-1")
print("  A: " + withdraw("acct-1", 70, a))
try:
    withdraw("acct-1", 70, b)
except RuntimeError as e:
    print(f"  B: {e} -> reload and retry")
print("  B retry: " + withdraw("acct-1", 70))
print(f"  without the version check both would succeed: balance {100 - 70 - 70}")

print("\\n== 3. CQRS read model is eventually consistent")
project()
append("acct-1", load("acct-1")["version"], [{"type": "Deposited", "data": {"amount": 500}}])
print(f"  write side balance {load('acct-1')['state']['balance']}; read model says {balances['acct-1']} (checkpoint {checkpoint} of {len(log)})")
project()
print(f"  after the projector catches up: read model {balances['acct-1']} (checkpoint {checkpoint} of {len(log)})")

print("\\n== 4. Time travel and a projection added later")
print(f"  balance as of v3: {load('acct-1', 3)['state']['balance']}")
big = [f"{e['stream']} {e['data']['amount']} @pos{e['pos']}" for e in log if e["type"] == "Deposited" and e["data"]["amount"] >= 100]
print(f"  new \\"large deposits\\" view rebuilt from history: [{', '.join(big)}]")

print("\\n== 5. Snapshots bound replay cost")
append("acct-2", 0, [{"type": "Opened", "data": {}}])
for i in range(1, 1000):
    append("acct-2", i, [{"type": "Deposited", "data": {"amount": 1}}])
full = load("acct-2")
snap = {"state": load("acct-2", 950)["state"], "version": 950}  # stored every 50 events
tail = [e for e in read_stream("acct-2") if e["version"] > snap["version"]]
from_snap = fold(tail, snap["state"])
print(f"  full replay: {full['applied']} events -> balance {full['state']['balance']}")
print(f"  snapshot at v{snap['version']} + {len(tail)} events -> balance {from_snap['balance']}")
print(f"  events in the store: {len(log)}; nothing was ever updated in place")` },
        ],
      },
    ],
  },
];

export default augments;
