/**
 * SYSTEM DESIGN ULTRA — batch 10: Messaging and delivery. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `Kafka vs SQS — how do you choose for an event-driven system in 2025?`,
    difficulty: "medium",
    seoDescription: `Kafka vs SQS from zero: a replayable partitioned log vs a managed work queue, with a verified simulation, current limits and a decision checklist.`,
    description: `**Question presented to candidate:**
"We are building an event-driven backend: orders, payments, notifications, analytics. Some people want Kafka, some want SQS. How do you decide between them, and would you ever use both?"

**What a strong answer should cover:**
- The core difference in model: Kafka is a **partitioned, replicated log** that consumers read by **offset** and can re-read; SQS is a **managed queue** where each message is handed to one consumer, hidden by a **visibility timeout**, and deleted once processed
- What follows from that: Kafka gives **replay**, many independent **consumer groups** over the same data, and **per-partition ordering**, with parallelism capped by the partition count; SQS gives per-message retries, a **dead-letter queue**, elastic consumers and almost no operations, with ordering only in FIFO queues per **message group**
- Delivery: both are at-least-once in normal use, so consumers must be idempotent; SQS standard can also deliver out of order
- Current limits checked against the docs: SQS keeps messages at most 14 days and accepts payloads up to 1 MiB (raised from 256 KiB in August 2025); FIFO throughput depends on high-throughput mode and region; Kafka 4.0 (March 2025) runs without ZooKeeper, and Kafka 4.2 made share groups (queue-style consumption, KIP-932) production-ready
- A decision based on requirements (replay, fan-out, ordering, throughput, team and cloud), and the common hybrid: Kafka (or a managed Kafka) as the event backbone, SQS for task queues around it

**Clarifying questions expected:**
- Do several teams need to consume the same events independently, and do we ever need to replay history?
- What ordering is required, and at what granularity (per order, per user, global)?
- What is the peak throughput, and are we all-in on AWS with a small platform team?

**Code / implementation expected:** Optional — a small simulation of both consumption models (offsets and consumer groups vs visibility timeout, redelivery and DLQ); the example does exactly that.`,
    answer: `**Target Audience:** Beginners to messaging — you know what a server and a database are; queues, logs, offsets and consumer groups are defined as we go.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Product limits are from the AWS SQS Developer Guide and the Apache Kafka release announcements, checked in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The run in section 5 comes from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

Think of two ways a busy restaurant can pass orders from the waiters to the kitchen.

**The ticket rail.** A waiter clips a paper ticket to a rail. A cook takes it down, cooks it, and throws the ticket in the bin. If the cook drops the pan, the ticket goes back on the rail and someone else picks it up. Once a dish is served, the ticket is gone forever. Add more cooks and the rail empties faster.

**The order book.** Every order is written as a new line in a big bound book that nobody erases. The kitchen keeps a bookmark at the last line it cooked. The bar keeps its own bookmark for drinks, and the accountant keeps another one for the bill. If the accountant finds a mistake in last week's maths, she moves her bookmark back to Monday and adds everything up again; the book still has every line.

SQS is the ticket rail. Kafka is the order book. Neither is better: they make different things easy. Choosing well means knowing which of those things your system actually needs.

📌 **Interview term: event-driven architecture** — services communicate by publishing facts that happened ("order 42 was paid") instead of calling each other directly; other services react to those facts in their own time.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do several consumers need the same events (billing, search, analytics, fraud)? | Many independent readers of one stream is what a log is built for; with SQS you copy each message into one queue per consumer |
| Do we need to replay old events, for a bug fix or a new service? | Kafka keeps data for a retention period you choose and lets consumers rewind; SQS deletes a message once it is processed |
| What ordering is required, and per what key? | Kafka orders within a partition; SQS standard has no ordering guarantee; SQS FIFO orders within a message group |
| Peak messages per second and message size? | Decides partition counts for Kafka and whether SQS FIFO limits matter |
| Is this all on AWS, and who will operate it? | SQS has nothing to run; self-managed Kafka needs a platform team, managed Kafka reduces that |
| Is each message a task to do once (send an email) or a fact many may read (order paid)? | Tasks fit a queue; facts fit a log |

## 3. The Two Models, Plainly

### A queue: hand each message to one worker, then delete it

📌 **Interview term: message queue** — a buffer between producers and consumers where each message is delivered to one consumer and removed after that consumer confirms it. (The basics, and why you would use one at all, are on [what is a message queue](/interview-question/what-is-a-message-queue-and-why-use-one).)

In SQS a consumer calls \`ReceiveMessage\`. The message is not deleted; it becomes invisible to other consumers for a while. If the consumer calls \`DeleteMessage\` in time, it is gone. If not, it reappears and another consumer gets it.

📌 **Interview term: visibility timeout** — how long a received SQS message stays hidden from other consumers. The default is 30 seconds and the maximum is 12 hours (AWS SQS Developer Guide, visibility timeout and message quotas).

📌 **Interview term: dead-letter queue (DLQ)** — a side queue where messages go after failing too many times, so one broken message (a **poison message**) cannot block or burn workers forever. In SQS a **redrive policy** moves a message to the DLQ once its receive count exceeds \`maxReceiveCount\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="SQS model: producer sends to a queue, three workers receive messages, a failed message is retried and finally moved to a dead letter queue">
  <defs>
    <marker id="sd10q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="90" width="130" height="60" rx="10"/>
  <text class="d-text" x="95" y="126" text-anchor="middle">producer</text>
  <line class="d-edge" x1="160" y1="120" x2="236" y2="120" marker-end="url(#sd10q1-arrow)"/>
  <rect class="d-box-accent" x="240" y="80" width="190" height="80" rx="10"/>
  <text class="d-text" x="335" y="114" text-anchor="middle">SQS queue</text>
  <text class="d-sub" x="335" y="138" text-anchor="middle">hidden while in flight</text>
  <line class="d-edge" x1="430" y1="100" x2="546" y2="50" marker-end="url(#sd10q1-arrow)"/>
  <line class="d-edge" x1="430" y1="120" x2="546" y2="120" marker-end="url(#sd10q1-arrow)"/>
  <line class="d-edge" x1="430" y1="140" x2="546" y2="190" marker-end="url(#sd10q1-arrow)"/>
  <rect class="d-box" x="550" y="25" width="150" height="50" rx="10"/>
  <text class="d-text" x="625" y="56" text-anchor="middle">worker 1</text>
  <rect class="d-box" x="550" y="95" width="150" height="50" rx="10"/>
  <text class="d-text" x="625" y="126" text-anchor="middle">worker 2</text>
  <rect class="d-box" x="550" y="165" width="150" height="50" rx="10"/>
  <text class="d-text" x="625" y="196" text-anchor="middle">worker 3</text>
  <line class="d-edge-dashed" x1="335" y1="160" x2="335" y2="196" marker-end="url(#sd10q1-arrow)"/>
  <rect class="d-box-muted" x="260" y="200" width="150" height="44" rx="10"/>
  <text class="d-text" x="335" y="228" text-anchor="middle">DLQ</text>
</svg>

Each message goes to exactly one worker at a time; failures come back after the timeout, and repeat offenders end up in the DLQ.

### A log: append everything, let each reader keep a bookmark

📌 **Interview term: commit log** — an append-only, ordered sequence of records that is kept for a retention period whether or not anyone has read it. Kafka keeps records for 168 hours (7 days) by default (\`log.retention.hours\`, Kafka broker configuration), and you can set much longer or size-based retention.

📌 **Interview term: partition** — Kafka splits a topic into several logs. Records with the same **key** (for example the order id) always go to the same partition, so their order is preserved; records in different partitions have no order relative to each other.

📌 **Interview term: offset** — the position of a record in its partition. A consumer stores the offset it has reached (**commits** it) and can move it backwards to re-read.

📌 **Interview term: consumer group** — a set of consumers that share the work of one subscription: each partition is read by exactly one member of the group. Different groups read the same data independently, each with its own offsets.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Kafka model: a topic with three partitions, a billing group of two consumers and an analytics group of one consumer read the same partitions independently">
  <defs>
    <marker id="sd10q1-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="200" y="20" width="300" height="260" rx="12"/>
  <text class="d-sub" x="350" y="48" text-anchor="middle">topic orders</text>
  <rect class="d-box-accent" x="230" y="70" width="240" height="44" rx="8"/>
  <text class="d-text" x="350" y="98" text-anchor="middle">partition 0</text>
  <rect class="d-box-accent" x="230" y="140" width="240" height="44" rx="8"/>
  <text class="d-text" x="350" y="168" text-anchor="middle">partition 1</text>
  <rect class="d-box-accent" x="230" y="210" width="240" height="44" rx="8"/>
  <text class="d-text" x="350" y="238" text-anchor="middle">partition 2</text>
  <rect class="d-box" x="30" y="125" width="120" height="60" rx="10"/>
  <text class="d-text" x="90" y="161" text-anchor="middle">producer</text>
  <line class="d-edge" x1="150" y1="155" x2="226" y2="162" marker-end="url(#sd10q1-arrow2)"/>
  <rect class="d-box" x="580" y="60" width="160" height="80" rx="10"/>
  <text class="d-text" x="660" y="94" text-anchor="middle">billing group</text>
  <text class="d-sub" x="660" y="118" text-anchor="middle">2 consumers</text>
  <rect class="d-box" x="580" y="180" width="160" height="80" rx="10"/>
  <text class="d-text" x="660" y="214" text-anchor="middle">analytics group</text>
  <text class="d-sub" x="660" y="238" text-anchor="middle">own offsets</text>
  <line class="d-edge-accent" x1="470" y1="120" x2="576" y2="100" marker-end="url(#sd10q1-arrow2)"/>
  <line class="d-edge-accent" x1="470" y1="190" x2="576" y2="220" marker-end="url(#sd10q1-arrow2)"/>
</svg>

Both groups read every record; reading does not remove anything, so a third group added next month can start from the beginning.

## 4. The Comparison That Matters

| Dimension | Kafka (log) | SQS (queue) |
| :--- | :--- | :--- |
| What a consumer does | Reads records by offset; commits its position | Receives a message, then deletes it |
| Replay | Yes, rewind offsets within retention (7 days by default, configurable) | No; a processed message is deleted. Retention for unprocessed messages is 4 days by default, 14 days at most |
| Many independent consumers | Native: one consumer group per use case | One queue per consumer, usually fed by SNS fan-out |
| Ordering | Per partition (per key) | Standard: best-effort only. FIFO: per message group |
| Parallelism | At most one active consumer per partition in a group | Add workers freely; standard queues have nearly unlimited throughput (AWS SQS Developer Guide) |
| Per-message retry | You build it (retry topics, a DLQ topic) | Built in: visibility timeout, receive count, redrive to a DLQ |
| Delivery guarantee | At-least-once by default; exactly-once inside Kafka with transactions | Standard: at-least-once. FIFO: deduplicated sends within 5 minutes |
| Message size | Broker default \`message.max.bytes\` is 1,048,588 bytes (about 1 MiB) since Kafka 2.5, configurable | Up to 1 MiB since 4 August 2025 (AWS What's New), previously 256 KiB |
| Operations | Brokers, disks, partitions, upgrades (or a managed service) | None beyond IAM, queue settings and alarms |

A few current facts behind the table, each checked against the vendor documentation:

- **SQS FIFO throughput.** Without high-throughput mode a FIFO queue supports 300 transactions per second per API action, or 3,000 messages per second with batches of 10. High-throughput mode raises that per region: the SQS message-quotas page lists 70,000 transactions per second in US East (N. Virginia), US West (Oregon) and Europe (Ireland), and less elsewhere. Check your region.
- **SQS in-flight limit.** A standard queue allows roughly 120,000 in-flight (received but not deleted) messages (SQS message quotas).
- **Kafka without ZooKeeper.** Apache Kafka 4.0 (released 18 March 2025) is the first major release that runs entirely in KRaft mode; ZooKeeper support is gone (Apache Kafka 4.0.0 release announcement).
- **Kafka gets queues.** Share groups (KIP-932, "Queues for Kafka") let several consumers share one partition with per-record acknowledgement, which is the SQS-style model inside Kafka. They were early access in 4.0, preview in 4.1, and are production-ready in Kafka 4.2 (Apache Kafka 4.2.0 release announcement). The title says 2025; by late 2026 this is the biggest change to the comparison, because "Kafka cannot do work queues" is no longer true on a current cluster.

## 5. A Worked Run: the Same Work in Both Models

The example **"Log vs queue: Kafka-style partitions, offsets and consumer groups vs SQS-style visibility timeout, redelivery and DLQ"** runs both models in one process.

**Part A, the log.** Four orders each produce three events (created, paid, shipped). The key is the order id, so all events of one order land in one partition. What the run shows:

- Each order stays in order (\`o1:created o1:paid o1:shipped\`) because it lives in one partition.
- The \`billing\` group (2 consumers) and the \`analytics\` group (1 consumer) both read all 12 events. Reading removed nothing: "log still holds 12 events".
- After a bug fix, billing resets its offsets to 0 and replays all 12 events. A queue cannot do this.
- A group of 4 consumers on 3 partitions leaves one consumer **idle**: partitions cap parallelism.
- Partition 1 got 6 events and the others 3: keys hash unevenly, so one consumer does twice the work. That is a **hot partition** in miniature.

**Part B, the queue.** Eight jobs, three workers, a 30-second visibility timeout, \`maxReceiveCount\` of 3:

- Job \`j2\` stalls for 45 s on its first worker. At t=30 its timeout expires, another worker receives it and finishes at t=40; the first worker finishes at t=45 and has done **duplicate work**. Nothing was lost, but the side effect ran twice. That is at-least-once delivery.
- Job \`j6\` always fails. It is received three times, and on the next receive attempt at t=110 it is moved to the DLQ instead of blocking workers.
- Completion order was \`j1 j3 j4 j5 j7 j2 j8\`: not the send order.
- After the run the queue is empty and nothing can be replayed.

📌 **Interview term: at-least-once delivery** — every message is delivered one or more times; duplicates are possible, losses are not. Consumers must be **idempotent** (doing the same message twice has the same effect as once); see [what is idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter).

## 6. A Decision Checklist

Choose **Kafka** (self-managed, Amazon MSK, Confluent or another managed service) when:

- several teams or services consume the **same events** and new ones will appear later;
- you need **replay**: rebuilding a search index, backfilling a new service, re-running after a bug, or [event sourcing](/interview-question/what-are-event-sourcing-and-cqrs);
- you need **ordered processing per key** at high throughput;
- the data is a **stream** (clicks, telemetry, CDC from a database; see [CDC with Debezium](/interview-question/how-does-cdc-with-debezium-keep-search-and-cache-in-sync-with-postgres)).

Choose **SQS** when:

- each message is a **task** to be done once by any worker (send an email, resize an image, call a partner API);
- you want **per-message retries and a DLQ** for free and workers that scale up and down (for example Lambda);
- the team is small and on AWS, and nobody wants to run brokers;
- ordering is not needed, or is needed only per group and fits the FIFO limits.

Use **both** when the system has both shapes, which most do: a Kafka topic \`orders\` is the system of record for events; a small service consumes it and drops one SQS message per email to send, so slow email retries never hold up the stream.

## 7. Capacity Sketch: When SQS FIFO Limits Bite

Assume 20,000 order events per second at peak that must stay ordered per order.

- SQS FIFO without high-throughput mode: 3,000 messages per second per API action with batching. 20,000 / 3,000 is about 6.7, so one queue is not enough.
- SQS FIFO high-throughput mode in US East (N. Virginia): 70,000 transactions per second per API action, so 20,000 fits; outside the three largest regions the quota is lower, so the same design may not fit.
- Kafka: if one consumer handles 2,000 events per second, you need at least 20,000 / 2,000 = 10 partitions, and you would provision more (say 30) for growth, because adding partitions later changes which partition a key maps to and breaks per-key ordering during the move.

The simulation in [how would you design a distributed message queue](/interview-question/how-would-you-design-a-distributed-message-queue-572o) works through broker counts and storage for a log at 1 million messages per second.

## 8. Verified: Running the Code

What the program simulates: partitions are arrays, offsets are integers, and consumer-group assignment is round-robin over partitions. The queue uses a fake clock in 5-second steps; "visible again" is a timestamp. It leaves out networking, brokers, replication, rebalancing protocols and real SQS receipt handles.

The key part of the queue loop (logging and the empty-queue check removed):

~~~js
const m = queue.find((x) => !x.deleted && !x.inDlq && x.visibleAt <= t);
if (m.receives >= MAX_RECEIVES) { m.inDlq = true; dlq.push(m.id); continue; }
m.receives++; m.visibleAt = t + VIS; w.job = m; // hidden, not deleted
~~~

Full output (identical in Node and Python):

~~~text
== A. Kafka-style log: partitions, offsets, consumer groups ==
partition 0: o3:created o3:paid o3:shipped
partition 1: o1:created o1:paid o1:shipped o4:created o4:paid o4:shipped
partition 2: o2:created o2:paid o2:shipped
group billing (2 consumers):
  billing/c1 partitions [0,2] read 6: o3:created o3:paid o3:shipped o2:created o2:paid o2:shipped
  billing/c2 partitions [1] read 6: o1:created o1:paid o1:shipped o4:created o4:paid o4:shipped
group analytics (1 consumer) reads the same log independently:
  analytics/a1 partitions [0,1,2] read 12: o3:created o3:paid o3:shipped o1:created o1:paid o1:shipped o4:created o4:paid o4:shipped o2:created o2:paid o2:shipped
billing read 12, analytics read 12, log still holds 12 events
bug fixed: billing resets offsets to 0 and replays:
  billing/c1 partitions [0,2] read 6: o3:created o3:paid o3:shipped o2:created o2:paid o2:shipped
  billing/c2 partitions [1] read 6: o1:created o1:paid o1:shipped o4:created o4:paid o4:shipped
  replayed 12 events
group of 4 consumers on 3 partitions:
  wide/w1 partitions [0] read 3: o3:created o3:paid o3:shipped
  wide/w2 partitions [1] read 6: o1:created o1:paid o1:shipped o4:created o4:paid o4:shipped
  wide/w3 partitions [2] read 3: o2:created o2:paid o2:shipped
  wide/w4 partitions [] read 0 (idle)

== B. SQS-style queue: visibility timeout, redelivery, DLQ ==
t=10 w1 j1 done, DeleteMessage
t=10 w3 j3 done, DeleteMessage
t=20 w1 j4 done, DeleteMessage
t=20 w3 j5 done, DeleteMessage
t=30 w1 j6 FAILED (poison message), not deleted
t=30 w3 j7 done, DeleteMessage
t=30 w1 receives j2 again (receive #2)
t=40 w1 j2 done, DeleteMessage
t=40 w3 j8 done, DeleteMessage
t=45 w2 j2 finished, but it was already deleted: duplicate work
t=50 w1 receives j6 again (receive #2)
t=60 w1 j6 FAILED (poison message), not deleted
t=80 w1 receives j6 again (receive #3)
t=90 w1 j6 FAILED (poison message), not deleted
t=110 j6 received 3 times, moved to DLQ
completion order: j1 j3 j4 j5 j7 j2 j8
jobs completed: 7 of 8, in DLQ: [j6], queue empty: true, replay possible: false
~~~

## 9. Edge Cases Worth Knowing

- **Visibility timeout shorter than the work.** The job is redelivered while still running, exactly like \`j2\`. Set the timeout above the worst-case processing time, or extend it from the worker with \`ChangeMessageVisibility\` while it works.
- **One slow partition stalls its keys.** In Kafka a consumer processes a partition in order, so one poison record blocks every later record of that partition until you skip it or move it to a retry or DLQ topic.
- **Rebalances.** When a consumer joins or leaves a group, partitions are reassigned; records processed but not yet committed are read again by the new owner. Commit after processing, and keep handlers idempotent.
- **SQS FIFO and many groups.** FIFO preserves order only inside a message group; one hot group id becomes the bottleneck the same way a hot Kafka partition does.
- **Big payloads.** Put large blobs in object storage and send a pointer; the 1 MiB SQS limit and Kafka default limits both punish huge messages.

## Common Pitfalls

- **Choosing by popularity.** "Everyone uses Kafka" is not a reason. If the workload is fire-and-forget tasks on AWS, SQS gives retries and a DLQ with no operations.
- **Expecting replay from SQS.** Once deleted, a message is gone; if you will ever rebuild state, write events to a log (or a database table) as well.
- **Fewer partitions than consumers.** In the run the fourth consumer did nothing. Partition count is the ceiling on parallelism inside one group.
- **Assuming ordering from SQS standard.** It is best-effort; the run completed jobs out of send order. Use FIFO with a message group id, or design so order does not matter.
- **Forgetting duplicates on both sides.** Both systems are at-least-once in normal consumer code; the duplicate \`j2\` in the run is what happens in production. The sibling page on [exactly-once processing](/interview-question/exactly-once-processing-can-kafka-or-sqs-guarantee-it) covers what each can and cannot guarantee.
- **Quoting old limits.** The SQS 256 KiB limit and "Kafka needs ZooKeeper" were true for years and are now out of date.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">Kafka is a <strong style="color:#ffca28;">partitioned, replicated log</strong>: consumers read by offset, nothing is deleted on read, and data stays for a retention period. SQS is a <strong style="color:#ffca28;">managed queue</strong>: each message goes to one consumer, is hidden by a visibility timeout, and is deleted once processed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What follows:</strong> <span style="color:#f0e2c8;">Kafka gives replay, many independent <strong style="color:#ffca28;">consumer groups</strong> on the same events, and per-key ordering, with parallelism capped by partition count. SQS gives per-message retries, a <strong style="color:#ffca28;">DLQ</strong>, elastic workers and no operations; ordering only in FIFO queues, per message group.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Show it:</strong> <span style="color:#f0e2c8;">In my simulation two Kafka groups both read all 12 events and billing replayed them after a fix, while a fourth consumer on 3 partitions sat idle. On the queue side a stalled job was redelivered after the 30 s timeout and processed twice, and a poison job went to the DLQ after 3 receives.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Decide:</strong> <span style="color:#f0e2c8;">Facts many services read, replay, streams and CDC: Kafka. Tasks done once by any worker, small AWS team: SQS. Most systems use both: Kafka as the event backbone, SQS for task queues next to it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Current facts:</strong> <span style="color:#f0e2c8;">SQS payloads went to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 MiB</code> in August 2025 and retention tops out at 14 days. Kafka 4.0 dropped ZooKeeper, and Kafka 4.2 made share groups, queue-style consumption, production-ready, so the gap is narrowing. Either way consumers must be idempotent.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use SNS plus SQS for fan-out instead of Kafka?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That works well for a handful of subscribers that only need new messages. Each subscriber gets its own queue and its own retries. What you lose is replay and a shared ordered history: a new subscriber starts from now, and rebuilding a downstream store means re-publishing from the source. If replay or backfill matters, a log is the right primitive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many partitions would you create?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Enough for peak throughput divided by what one consumer can handle, with room to grow, because adding partitions later remaps keys and breaks per-key ordering during the change. For 20,000 events per second at 2,000 per consumer that is at least 10; I would start around 30 and watch for hot keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can SQS give me ordering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only a FIFO queue, and only within a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MessageGroupId</code>. Different groups are processed in parallel. Throughput limits depend on high-throughput mode and the region, so I would check the quota page for the region before committing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a poison message in Kafka?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Kafka has no built-in DLQ for plain consumers. Catch the failure, publish the record to a retry topic (possibly with a delay) or a DLQ topic, commit the offset and move on, so one bad record does not block its partition. Frameworks such as Kafka Connect and Spring Kafka have this built in.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Kafka 4.2 make SQS unnecessary?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Share groups give Kafka per-record acknowledgement and consumers sharing a partition, which covers many task-queue cases. You still run or pay for a Kafka cluster, so for a small AWS team with simple tasks SQS remains cheaper to operate. It changes the default for teams that already run Kafka.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Event-driven architecture | Services publish facts and others react, instead of calling each other directly |
| Message queue | Buffer where each message goes to one consumer and is removed after confirmation |
| Visibility timeout | How long a received SQS message is hidden; it reappears if not deleted |
| Dead-letter queue (DLQ) | Where messages go after too many failed attempts |
| Commit log | Append-only ordered record sequence kept for a retention period |
| Partition | One of the logs a topic is split into; order holds within it |
| Offset | A record position in a partition; consumers commit and can rewind it |
| Consumer group | Consumers sharing a subscription; each partition goes to one member |
| At-least-once delivery | Messages may arrive more than once but are not lost |

**Conclusion:** Kafka and SQS answer different questions. A log keeps every event in order per key for as long as you choose, so many services can read it independently and replay it; the run showed two groups reading all 12 events and billing replaying after a fix, with a fourth consumer idle because there were only 3 partitions. A queue hands each task to one worker and deletes it, with retries and a DLQ built in; the run showed a stalled job processed twice and a poison job parked after 3 receives. Pick from the requirements (replay, fan-out, ordering, throughput, who operates it), expect duplicates either way, and remember that the limits moved recently: SQS now takes 1 MiB messages and Kafka 4.2 has production-ready queue semantics.`,
    examples: [
      {
        label: `Log vs queue: Kafka-style partitions, offsets and consumer groups vs SQS-style visibility timeout, redelivery and DLQ`,
        variants: [
          { tech: "node", code: `// Log (Kafka-style) vs queue (SQS-style), simulated in-process with a fake clock.
const PARTS = 3;
const part = (key) => { let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 1000003; return h % PARTS; };

console.log("== A. Kafka-style log: partitions, offsets, consumer groups ==");
const log = [[], [], []];
for (const o of ["o1", "o2", "o3", "o4"])
  for (const step of ["created", "paid", "shipped"]) log[part(o)].push(o + ":" + step);
for (let p = 0; p < PARTS; p++) console.log("partition " + p + ": " + log[p].join(" "));

function assign(consumers) { // round-robin partitions over the group members
  const a = {}; consumers.forEach((c) => (a[c] = []));
  for (let p = 0; p < PARTS; p++) a[consumers[p % consumers.length]].push(p);
  return a;
}
function runGroup(name, consumers, offsets) {
  const a = assign(consumers); let read = 0;
  for (const c of consumers) {
    const got = [];
    for (const p of a[c]) { while (offsets[p] < log[p].length) { got.push(log[p][offsets[p]]); offsets[p]++; read++; } }
    console.log("  " + name + "/" + c + " partitions [" + a[c].join(",") + "] read " + got.length + (got.length ? ": " + got.join(" ") : " (idle)"));
  }
  return read;
}
const billing = [0, 0, 0], analytics = [0, 0, 0];
console.log("group billing (2 consumers):");
const b1 = runGroup("billing", ["c1", "c2"], billing);
console.log("group analytics (1 consumer) reads the same log independently:");
const a1 = runGroup("analytics", ["a1"], analytics);
console.log("billing read " + b1 + ", analytics read " + a1 + ", log still holds " + log.flat().length + " events");
billing[0] = 0; billing[1] = 0; billing[2] = 0;
console.log("bug fixed: billing resets offsets to 0 and replays:");
console.log("  replayed " + runGroup("billing", ["c1", "c2"], billing) + " events");
console.log("group of 4 consumers on 3 partitions:");
runGroup("wide", ["w1", "w2", "w3", "w4"], [0, 0, 0]);

console.log("");
console.log("== B. SQS-style queue: visibility timeout, redelivery, DLQ ==");
const VIS = 30, MAX_RECEIVES = 3, WORK = 10;
const queue = [];
for (let i = 1; i <= 8; i++) queue.push({ id: "j" + i, visibleAt: 0, receives: 0, deleted: false });
const dlq = [], doneLog = [], counts = {};
const workers = [{ name: "w1", busyUntil: 0, job: null }, { name: "w2", busyUntil: 0, job: null }, { name: "w3", busyUntil: 0, job: null }];
for (let t = 0; t <= 200; t += 5) {
  for (const w of workers) {
    if (w.job && t >= w.busyUntil) {
      const m = w.job; w.job = null;
      if (m.id === "j6") console.log("t=" + t + " " + w.name + " " + m.id + " FAILED (poison message), not deleted");
      else if (m.deleted) console.log("t=" + t + " " + w.name + " " + m.id + " finished, but it was already deleted: duplicate work");
      else {
        m.deleted = true; counts[m.id] = (counts[m.id] || 0) + 1; doneLog.push(m.id);
        console.log("t=" + t + " " + w.name + " " + m.id + " done, DeleteMessage");
      }
    }
  }
  for (const w of workers) {
    if (w.job) continue;
    const m = queue.find((x) => !x.deleted && !x.inDlq && x.visibleAt <= t);
    if (!m) continue;
    if (m.receives >= MAX_RECEIVES) { m.inDlq = true; dlq.push(m.id); console.log("t=" + t + " " + m.id + " received " + m.receives + " times, moved to DLQ"); continue; }
    m.receives++; m.visibleAt = t + VIS; w.job = m;
    const slow = m.id === "j2" && m.receives === 1; // the first copy of j2 stalls (a 45 s GC pause)
    w.busyUntil = t + (slow ? 45 : WORK);
    if (m.receives > 1) console.log("t=" + t + " " + w.name + " receives " + m.id + " again (receive #" + m.receives + ")");
  }
}
console.log("completion order: " + doneLog.join(" "));
const completed = Object.keys(counts).length;
console.log("jobs completed: " + completed + " of 8, in DLQ: [" + dlq.join(",") + "], queue empty: " + queue.every((m) => m.deleted || m.inDlq) + ", replay possible: false");` },
          { tech: "python", code: `# Log (Kafka-style) vs queue (SQS-style), simulated in-process with a fake clock.
PARTS = 3


def part(key):
    h = 0
    for c in key:
        h = (h * 31 + ord(c)) % 1000003
    return h % PARTS


print("== A. Kafka-style log: partitions, offsets, consumer groups ==")
log = [[], [], []]
for o in ["o1", "o2", "o3", "o4"]:
    for step in ["created", "paid", "shipped"]:
        log[part(o)].append(o + ":" + step)
for p in range(PARTS):
    print("partition " + str(p) + ": " + " ".join(log[p]))


def assign(consumers):  # round-robin partitions over the group members
    a = {c: [] for c in consumers}
    for p in range(PARTS):
        a[consumers[p % len(consumers)]].append(p)
    return a


def run_group(name, consumers, offsets):
    a = assign(consumers)
    read = 0
    for c in consumers:
        got = []
        for p in a[c]:
            while offsets[p] < len(log[p]):
                got.append(log[p][offsets[p]])
                offsets[p] += 1
                read += 1
        tail = (": " + " ".join(got)) if got else " (idle)"
        print("  " + name + "/" + c + " partitions [" + ",".join(str(p) for p in a[c]) + "] read " + str(len(got)) + tail)
    return read


billing, analytics = [0, 0, 0], [0, 0, 0]
print("group billing (2 consumers):")
b1 = run_group("billing", ["c1", "c2"], billing)
print("group analytics (1 consumer) reads the same log independently:")
a1 = run_group("analytics", ["a1"], analytics)
print("billing read " + str(b1) + ", analytics read " + str(a1) + ", log still holds " + str(sum(len(x) for x in log)) + " events")
billing[0] = billing[1] = billing[2] = 0
print("bug fixed: billing resets offsets to 0 and replays:")
print("  replayed " + str(run_group("billing", ["c1", "c2"], billing)) + " events")
print("group of 4 consumers on 3 partitions:")
run_group("wide", ["w1", "w2", "w3", "w4"], [0, 0, 0])

print("")
print("== B. SQS-style queue: visibility timeout, redelivery, DLQ ==")
VIS, MAX_RECEIVES, WORK = 30, 3, 10
queue = [{"id": "j" + str(i), "visibleAt": 0, "receives": 0, "deleted": False, "inDlq": False} for i in range(1, 9)]
dlq, done_log, counts = [], [], {}
workers = [{"name": n, "busyUntil": 0, "job": None} for n in ["w1", "w2", "w3"]]
for t in range(0, 201, 5):
    for w in workers:
        if w["job"] is not None and t >= w["busyUntil"]:
            m = w["job"]
            w["job"] = None
            if m["id"] == "j6":
                print("t=" + str(t) + " " + w["name"] + " " + m["id"] + " FAILED (poison message), not deleted")
            elif m["deleted"]:
                print("t=" + str(t) + " " + w["name"] + " " + m["id"] + " finished, but it was already deleted: duplicate work")
            else:
                m["deleted"] = True
                counts[m["id"]] = counts.get(m["id"], 0) + 1
                done_log.append(m["id"])
                print("t=" + str(t) + " " + w["name"] + " " + m["id"] + " done, DeleteMessage")
    for w in workers:
        if w["job"] is not None:
            continue
        m = next((x for x in queue if not x["deleted"] and not x["inDlq"] and x["visibleAt"] <= t), None)
        if m is None:
            continue
        if m["receives"] >= MAX_RECEIVES:
            m["inDlq"] = True
            dlq.append(m["id"])
            print("t=" + str(t) + " " + m["id"] + " received " + str(m["receives"]) + " times, moved to DLQ")
            continue
        m["receives"] += 1
        m["visibleAt"] = t + VIS
        w["job"] = m
        slow = m["id"] == "j2" and m["receives"] == 1  # the first copy of j2 stalls (a 45 s GC pause)
        w["busyUntil"] = t + (45 if slow else WORK)
        if m["receives"] > 1:
            print("t=" + str(t) + " " + w["name"] + " receives " + m["id"] + " again (receive #" + str(m["receives"]) + ")")
print("completion order: " + " ".join(done_log))
empty = all(m["deleted"] or m["inDlq"] for m in queue)
print("jobs completed: " + str(len(counts)) + " of 8, in DLQ: [" + ",".join(dlq) + "], queue empty: " + str(empty).lower() + ", replay possible: false")` },
        ],
      },
    ],
  },
  {
    title: `Exactly-once processing — can Kafka or SQS guarantee it?`,
    difficulty: "hard",
    seoDescription: `Exactly-once processing explained: why delivery is at-least-once, what Kafka transactions and SQS FIFO dedup guarantee, and how to get effectively-once.`,
    description: `**Question presented to candidate:**
"Our payments consumer reads events from a queue and updates balances. The product team wants each event applied exactly once. Can Kafka or SQS guarantee that for us, and if not, how do you build it?"

**What a strong answer should cover:**
- The three delivery semantics (**at-most-once**, **at-least-once**, **exactly-once**) and why the order of "do the side effect" and "commit the offset or delete the message" decides which one you get when a consumer crashes
- Why exactly-once **delivery** over a network is not achievable in general, while exactly-once **processing** (the effect is applied once) is, through **idempotency** or by committing the effect and the progress **atomically**
- What Kafka actually provides: the **idempotent producer** (producer id plus sequence numbers, on by default since Kafka 3.0) and **transactions** with \`read_committed\` consumers, which give exactly-once for read-process-write **inside Kafka**, not for external side effects such as a database write or an email
- What SQS actually provides: FIFO queues drop duplicate **sends** with the same deduplication id within a **5-minute** interval; receiving and processing are still at-least-once, and standard queues can deliver duplicates
- The practical patterns: idempotent consumers with a dedup key, storing offsets in the same database transaction as the result, the outbox pattern for the producing side, and idempotency keys for external calls

**Clarifying questions expected:**
- Where does the side effect live: another Kafka topic, our own database, or an external system such as a payment provider or email service?
- Does each event carry a stable unique id we can deduplicate on?

**Code / implementation expected:** Optional — a crash simulation comparing commit-first, effect-first, an idempotent sink and a transactional offset store; the example does exactly that.`,
    answer: `**Target Audience:** Engineers who have used a queue or Kafka and heard "exactly-once" promised; everything from offsets to transactions is defined as we go.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Kafka and SQS behaviour is from the Apache Kafka KIPs and documentation and the AWS SQS Developer Guide, checked in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The numbers in sections 3 and 6 come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

You post a cheque to your bank and ask for a receipt. Days pass, no receipt. Did the cheque get lost, or did the receipt get lost on the way back? From your kitchen table the two cases look identical.

- If you **do nothing**, and the cheque was lost, the money never arrives (lost).
- If you **send another cheque**, and the first one did arrive, you have paid twice (duplicate).

No amount of cleverness in the post fixes this, because the uncertainty is in the silence itself. What does fix it is the bank: if every cheque carries a number and the bank refuses to cash the same number twice, you can safely resend as often as you like. The *delivery* happened twice; the *payment* happened once.

That is the whole topic. Messaging systems can make delivery reliable (at least once). They cannot, by themselves, make your side effect happen exactly once. You get that by making the effect safe to repeat, or by recording "done" and the effect in one atomic step.

## 2. The Three Delivery Semantics

📌 **Interview term: at-most-once** — each message is processed zero or one times. You mark it done *before* processing; a crash after the mark loses the message.

📌 **Interview term: at-least-once** — each message is processed one or more times. You mark it done *after* processing; a crash between the effect and the mark makes the message come back, so the effect repeats.

📌 **Interview term: exactly-once processing** — the observable effect of each message happens once, even though the message itself may be delivered more than once. It is also called **effectively-once**, which is the more honest name.

In Kafka "mark it done" means committing the consumer **offset** (the position in the partition). In SQS it means calling \`DeleteMessage\` before the **visibility timeout** expires. The sibling page [Kafka vs SQS](/interview-question/kafka-vs-sqs-how-do-you-choose-for-an-event-driven-system-in-2025) explains both models.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Two orderings of a consumer: commit then process loses the message on a crash, process then commit repeats it on a crash">
  <text class="d-sub" x="30" y="40">at-most-once</text>
  <rect class="d-box" x="190" y="18" width="150" height="40" rx="8"/>
  <text class="d-text" x="265" y="43" text-anchor="middle">commit offset</text>
  <rect class="d-box-accent" x="400" y="18" width="110" height="40" rx="8"/>
  <text class="d-text" x="455" y="43" text-anchor="middle">CRASH</text>
  <rect class="d-box-muted" x="570" y="18" width="160" height="40" rx="8"/>
  <text class="d-text" x="650" y="43" text-anchor="middle">effect skipped</text>
  <line class="d-edge" x1="340" y1="38" x2="396" y2="38"/>
  <line class="d-edge" x1="510" y1="38" x2="566" y2="38"/>
  <text class="d-accent" x="650" y="90" text-anchor="middle">message lost</text>
  <text class="d-sub" x="30" y="170">at-least-once</text>
  <rect class="d-box" x="190" y="148" width="150" height="40" rx="8"/>
  <text class="d-text" x="265" y="173" text-anchor="middle">apply effect</text>
  <rect class="d-box-accent" x="400" y="148" width="110" height="40" rx="8"/>
  <text class="d-text" x="455" y="173" text-anchor="middle">CRASH</text>
  <rect class="d-box-muted" x="570" y="148" width="160" height="40" rx="8"/>
  <text class="d-text" x="650" y="173" text-anchor="middle">re-read, apply again</text>
  <line class="d-edge" x1="340" y1="168" x2="396" y2="168"/>
  <line class="d-edge" x1="510" y1="168" x2="566" y2="168"/>
  <text class="d-accent" x="650" y="220" text-anchor="middle">effect duplicated</text>
</svg>

Every consumer sits on one of these two lines unless the effect and the commit become a single atomic step, or the effect becomes safe to repeat.

## 3. The Crash Experiment

The example **"Delivery semantics under a crash: at-most-once, at-least-once, idempotent sink, transactional offsets, producer dedup and the FIFO window"** feeds ten payment events (10, 20, ..., 100, total 550) to a wallet and crashes the consumer once, at offset 6 (the 70 payment), in the gap between the side effect and the commit.

| Strategy | Final balance | Times an effect was applied | Result |
| :--- | ---: | ---: | :--- |
| Commit offset, then apply (at-most-once) | 480 | 9 | **lost 70** |
| Apply, then commit (at-least-once) | 620 | 11 | **duplicate +70** |
| Apply through an idempotent sink keyed by event id, then commit | 550 | 10 | correct |
| Apply and store the offset in **one database transaction** | 550 | 10 | correct |

The two correct strategies are the two general ways to get exactly-once processing:

📌 **Interview term: idempotent consumer** — a consumer whose effect is keyed by a unique message id (an upsert, or an insert into a table with a unique constraint), so processing the same message again changes nothing. See [what is idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter).

📌 **Interview term: transactional offset store** — the consumer keeps its offset in the *same* database as its results and writes both in one transaction. On restart it reads the offset from that database, not from the broker. A crash before commit discards both; a crash after commit has both. There is no gap.

## 4. What Kafka Guarantees, Precisely

Kafka has two features with "exactly-once" in their marketing, and each has a defined scope.

### The idempotent producer: no duplicates from producer retries

When a producer sends a batch and the acknowledgement is lost, it retries. Without protection the partition now holds the record twice. The idempotent producer gets a **producer id** and numbers each batch with a **sequence number** per partition; the broker drops a batch whose sequence it has already written.

📌 **Interview term: idempotent producer** — a Kafka producer whose retries cannot create duplicates in a partition, because the broker deduplicates by producer id and sequence number. Since Kafka 3.0 the producer defaults to \`enable.idempotence=true\` and \`acks=all\` (KIP-679; the Kafka upgrade notes say a bug kept the idempotence default from applying in 3.0.0 and 3.1.0, fixed in 3.0.1, 3.1.1 and 3.2.0).

The run shows it: a lost ack and a retry give \`log=[a,b,b,c]\` for a plain producer and \`log=[a,b,c]\` for an idempotent one.

### Transactions: atomic read-process-write inside Kafka

A stream processor reads from topic A, computes, and writes to topic B. With transactions it writes the output records **and** the consumer offsets for topic A in one atomic transaction. Either all of it becomes visible or none of it does. Consumers of topic B that set \`isolation.level=read_committed\` never see records from aborted transactions.

📌 **Interview term: Kafka transactions** — atomic writes across several partitions (including the internal offsets topic), coordinated by a transaction coordinator and introduced by KIP-98 in 2017. A **transactional id** lets a restarted producer fence off its old instance so a "zombie" cannot commit stale work.

📌 **Interview term: read_committed** — a consumer isolation level that skips records from aborted transactions and waits at open transactions. The default for a plain consumer is \`read_uncommitted\`.

The run shows why the isolation level matters: transaction T2 aborted, yet a \`read_uncommitted\` consumer saw \`[r1,r2,r3,r4]\`, while a \`read_committed\` consumer saw only \`[r1,r2]\`. Aborted records stay in the log; only the reader decides to skip them.

In Kafka Streams all of this is one setting, \`processing.guarantee=exactly_once_v2\`, which needs brokers on 2.5 or newer (KIP-732).

### The boundary

Kafka exactly-once covers **Kafka to Kafka**. The moment your consumer writes to PostgreSQL, calls Stripe or sends an email, that effect is outside the Kafka transaction. A crash after the email and before the commit sends the email again. For those effects you are back to the two general strategies from section 3.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 240" role="img" aria-label="Kafka exactly once covers a read process write loop between topics, but a database write or an email call sits outside that boundary">
  <defs>
    <marker id="sd10q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="460" height="200" rx="12"/>
  <text class="d-sub" x="250" y="48" text-anchor="middle">one Kafka transaction</text>
  <rect class="d-box" x="50" y="90" width="110" height="56" rx="10"/>
  <text class="d-text" x="105" y="123" text-anchor="middle">topic A</text>
  <rect class="d-box-accent" x="200" y="90" width="110" height="56" rx="10"/>
  <text class="d-text" x="255" y="123" text-anchor="middle">processor</text>
  <rect class="d-box" x="350" y="90" width="110" height="56" rx="10"/>
  <text class="d-text" x="405" y="123" text-anchor="middle">topic B</text>
  <line class="d-edge" x1="160" y1="118" x2="196" y2="118" marker-end="url(#sd10q2-arrow)"/>
  <line class="d-edge" x1="310" y1="118" x2="346" y2="118" marker-end="url(#sd10q2-arrow)"/>
  <text class="d-sub" x="255" y="190" text-anchor="middle">plus offsets for topic A</text>
  <rect class="d-box" x="560" y="50" width="170" height="56" rx="10"/>
  <text class="d-text" x="645" y="83" text-anchor="middle">database write</text>
  <rect class="d-box" x="560" y="140" width="170" height="56" rx="10"/>
  <text class="d-text" x="645" y="173" text-anchor="middle">email or API call</text>
  <line class="d-edge-dashed" x1="310" y1="104" x2="556" y2="78" marker-end="url(#sd10q2-arrow)"/>
  <line class="d-edge-dashed" x1="310" y1="134" x2="556" y2="168" marker-end="url(#sd10q2-arrow)"/>
</svg>

Inside the shaded box Kafka can commit everything atomically; the dashed arrows leave it, so those effects need idempotency or their own transactional bookkeeping.

## 5. What SQS Guarantees, Precisely

- **Standard queues** deliver every message at least once and may deliver duplicates and out of order (AWS SQS Developer Guide, queue types). Consumers must be idempotent.
- **FIFO queues** advertise "exactly-once processing", and the documentation defines it narrowly: if you retry \`SendMessage\` with the same **message deduplication id** within the **5-minute deduplication interval**, SQS does not add a duplicate to the queue. The id is either one you supply (\`MessageDeduplicationId\`) or, with content-based deduplication, a SHA-256 hash of the body (AWS SQS Developer Guide, exactly-once processing).
- Receiving is still at-least-once. If your consumer processes a message and crashes before \`DeleteMessage\`, the visibility timeout expires and the message is delivered again. FIFO does not make your database write and the delete atomic.

📌 **Interview term: deduplication window** — the period during which a system remembers ids it has seen. Outside it, the same id is treated as new.

The run shows the window: sends of \`order-42\` at 60 s and 299 s are accepted but not enqueued; a send at 360 s, past the 5-minute interval, is enqueued again, and the queue holds 2 copies. A producer that retries after a long outage can still duplicate.

## 6. Building Exactly-Once Processing in Practice

**Pattern 1: dedup table in the same transaction as the effect.** The consumer runs one database transaction: insert the event id into a \`processed_events\` table with a unique constraint, then apply the effect. A duplicate fails the insert and the transaction does nothing. Commit the offset or delete the SQS message afterwards; if that commit is lost, the redelivery is harmlessly rejected.

~~~sql
BEGIN;
INSERT INTO processed_events (event_id) VALUES ('pay-107');  -- unique key: a duplicate aborts here
UPDATE wallets SET balance = balance + 70 WHERE id = 'w1';
COMMIT;
~~~

**Pattern 2: store the offset with the result.** The consumer keeps \`(topic, partition, offset)\` in its own database, updated in the same transaction as the result, and on startup seeks to the stored offset. This is the "transactional" row of the experiment.

**Pattern 3: idempotency keys for external calls.** When the effect is a payment provider or email service, send a stable key (for example the event id) so the provider deduplicates. Many payment APIs support this; see [making a payment system reliable against retries](/interview-question/how-do-you-make-a-payment-system-reliable-against-retries).

**The producing side.** "Write to the database and publish an event" is two systems and can fail in between. The [outbox pattern](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure) writes the event to an outbox table in the same transaction and publishes it afterwards, at least once, with the event id that consumers deduplicate on.

How long must the dedup table remember ids? At least as long as a duplicate can arrive: Kafka retention if a consumer can rewind, or the longest redelivery path for SQS. A table of event ids at 1,000 events per second for 7 days is 604.8 million rows, so index it, partition it by day, and drop old partitions.

## 7. Verified: Running the Code

What the program simulates: the topic is an array, the committed offset is an integer, the "database" is an object that survives the crash, and a crash is a flag that skips the rest of one iteration. The Kafka transaction in part 3 is reduced to a status per transaction; the FIFO window is a map from id to first-send time. It leaves out brokers, the transaction coordinator, fencing and real clocks.

The key part, the two orderings:

~~~js
if (mode === "at-most-once") {
  committed = pos + 1;                               // 1. commit offset
  if (crashNow) { crashed = true; continue; }        // crash: effect never happens
  db.balance += e.amount; applies++;                 // 2. side effect
} else if (mode === "at-least-once") {
  db.balance += e.amount; applies++;                 // 1. side effect
  if (crashNow) { crashed = true; continue; }        // crash before commit
  committed = pos + 1;                               // 2. commit offset
}
~~~

Full output (identical in Node and Python):

~~~text
== 1. consumer crash between side effect and offset commit (at offset 6) ==
at-most-once     balance=480 expected=550 applies= 9  LOST 70
at-least-once    balance=620 expected=550 applies=11  DUPLICATE +70
idempotent sink  balance=550 expected=550 applies=10  correct
transactional    balance=550 expected=550 applies=10  correct

== 2. producer retry after a lost ack ==
plain producer      log=[a,b,b,c] retry -> appended
idempotent producer log=[a,b,c] retry -> duplicate ignored

== 3. read-process-write transaction that aborts ==
read_uncommitted consumer sees [r1,r2,r3,r4]
read_committed   consumer sees [r1,r2]

== 4. SQS FIFO deduplication window (5 minutes) ==
t=  0s send order-42 -> enqueued
t= 60s send order-42 -> accepted, not enqueued again
t=299s send order-42 -> accepted, not enqueued again
t=360s send order-42 -> enqueued
queue now holds 2 copies of order-42
~~~

## 8. Edge Cases Worth Knowing

- **Zombie consumers.** A consumer that paused (long garbage collection) may wake up after its partitions were reassigned and write stale results. Kafka transactions fence it by transactional id and epoch; a database-offset design needs its own fencing, for example a generation number checked in the same transaction.
- **Non-deterministic processing.** Replaying an event must produce the same result. If the handler reads the current time or a random number, the "duplicate" may not be identical and dedup by id is the only safe option.
- **Partial batches.** Committing an offset for a batch of 500 after 499 succeeded and one failed either skips the failure or replays 499. Commit per record, or make the whole batch idempotent.
- **Ordering plus dedup.** Dedup by id does not fix reordering; if the effect depends on order (balance cannot go negative), apply events in sequence per key.
- **Transactions cost latency.** \`read_committed\` consumers cannot read past an open transaction, so long transactions delay downstream readers.

## Common Pitfalls

- **Believing the brochure.** "Exactly-once" in Kafka means within Kafka; in SQS FIFO it means deduplicated sends for 5 minutes. Neither covers your database write or email.
- **Committing before processing to "avoid duplicates".** That is at-most-once: the run lost the 70 payment.
- **A dedup check outside the transaction.** "SELECT if processed, then UPDATE" with a crash between them is still at-least-once. The id insert and the effect must commit together.
- **Forgetting \`read_committed\`.** Transactional producers do not help downstream consumers that read uncommitted data; the run showed aborted records \`r3,r4\` being read.
- **A dedup window shorter than replay.** If consumers can rewind seven days, remembering ids for one hour leaves a gap.
- **No stable message id.** Without an id from the producer (an event id, an order id plus version), the consumer has nothing to deduplicate on.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe:</strong> <span style="color:#f0e2c8;">Exactly-once <strong style="color:#ffca28;">delivery</strong> is not achievable over a network: a lost acknowledgement looks like a lost message, so the sender must choose between losing and repeating. What we can build is exactly-once <strong style="color:#ffca28;">processing</strong>, where the effect happens once even if the message arrives twice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The ordering:</strong> <span style="color:#f0e2c8;">Commit before the effect is at-most-once; commit after the effect is at-least-once. In my crash simulation, commit-first lost a 70 payment and effect-first applied it twice, giving 620 instead of 550.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Two fixes:</strong> <span style="color:#f0e2c8;">Make the effect <strong style="color:#ffca28;">idempotent</strong>, keyed by event id with a unique constraint, or store the consumer offset in the same database transaction as the result. Both gave exactly 550 in the run.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Kafka scope:</strong> <span style="color:#f0e2c8;">The <strong style="color:#ffca28;">idempotent producer</strong> (default since 3.0) removes duplicates from producer retries, and <strong style="color:#ffca28;">transactions</strong> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read_committed</code> give atomic read-process-write between Kafka topics, which is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exactly_once_v2</code> in Kafka Streams. Database writes and API calls are outside that boundary.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. SQS scope:</strong> <span style="color:#f0e2c8;">SQS FIFO deduplicates sends with the same deduplication id for 5 minutes; receiving is still at-least-once, and standard queues can duplicate. So with SQS the consumer must be idempotent; the run showed a resend after 6 minutes enqueued again.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If Kafka has transactions, why do I still need an idempotent consumer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the transaction only spans Kafka partitions and the offsets topic. If the consumer writes to PostgreSQL and then crashes before committing the Kafka transaction, the database write already happened and the record is re-read. Either dedup in the database or keep the offset in the database instead of Kafka.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the idempotent producer detect duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The broker assigns a producer id, and the producer numbers its batches per partition with increasing sequence numbers. The broker keeps the last sequence numbers per producer and partition and rejects a batch it has already appended, so a retry after a lost ack does not add a second copy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a transactional id add?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Identity across restarts. When a new instance starts with the same transactional id, the coordinator bumps an epoch and aborts the old instance's open transaction; if the old instance (a zombie after a long pause) tries to commit, it is fenced. Without that, two instances could both commit output for the same input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How long do you keep the processed-ids table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At least as long as a duplicate can still arrive: the longest replay window plus retries. With 7-day Kafka retention and 1,000 events per second that is about 605 million ids, so I would partition the table by day and drop old partitions, or bound replay instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the outbox pattern exactly-once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is at-least-once publishing without loss: the event is committed with the business data, and a relay publishes it, possibly twice if it crashes after publishing. It pairs with idempotent consumers, which dedup on the event id the outbox row carries.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| At-most-once | Mark done first; a crash loses the message |
| At-least-once | Mark done after the effect; a crash repeats it |
| Exactly-once processing | The effect happens once although delivery may repeat; also called effectively-once |
| Idempotent consumer | Effect keyed by message id so a repeat changes nothing |
| Transactional offset store | Offset saved in the same transaction as the result |
| Idempotent producer | Kafka producer whose retries cannot duplicate records, via producer id and sequence numbers |
| Kafka transactions | Atomic writes across partitions and offsets, with zombie fencing |
| read_committed | Consumer isolation level that skips aborted transactional records |
| Deduplication window | How long a system remembers seen ids; SQS FIFO uses 5 minutes |

**Conclusion:** Neither Kafka nor SQS can promise that your side effect happens exactly once, because a lost acknowledgement forces every sender to choose between possibly losing and possibly repeating. What they offer is narrower and useful: Kafka removes producer-retry duplicates and makes read-process-write between topics atomic, and SQS FIFO drops duplicate sends inside a 5-minute window. Exactly-once processing is something you build on top: the crash run lost 70 when it committed first, doubled 70 when it committed last, and got exactly 550 both when the effect was keyed by event id and when the offset was stored in the same transaction as the result. Say that in an interview, name the scope of each product guarantee, and you have answered the question most candidates get wrong.`,
    examples: [
      {
        label: `Delivery semantics under a crash: at-most-once, at-least-once, idempotent sink, transactional offsets, producer dedup and the FIFO window`,
        variants: [
          { tech: "node", code: `// Delivery semantics under a crash, simulated in-process (no real broker).
// The topic is an array; "offset" is the consumer's committed position; the
// sink is a wallet balance. The consumer crashes once, at offset 6.
const events = [];
for (let i = 0; i < 10; i++) events.push({ id: "pay-" + (101 + i), amount: 10 * (i + 1) });
const expected = events.reduce((s, e) => s + e.amount, 0);
const CRASH_AT = 6;

function run(mode) {
  const db = { balance: 0, applied: new Set(), offset: 0 }; // durable state
  let committed = 0, crashed = false, applies = 0;
  while (committed < events.length) {
    const pos = mode === "transactional" ? db.offset : committed; // where we resume
    const e = events[pos];
    const crashNow = !crashed && pos === CRASH_AT;
    if (mode === "at-most-once") {
      committed = pos + 1;                               // 1. commit offset
      if (crashNow) { crashed = true; continue; }        // crash: effect never happens
      db.balance += e.amount; applies++;                 // 2. side effect
    } else if (mode === "at-least-once") {
      db.balance += e.amount; applies++;                 // 1. side effect
      if (crashNow) { crashed = true; continue; }        // crash before commit
      committed = pos + 1;                               // 2. commit offset
    } else if (mode === "idempotent sink") {
      if (!db.applied.has(e.id)) { db.applied.add(e.id); db.balance += e.amount; applies++; } // keyed upsert
      if (crashNow) { crashed = true; continue; }
      committed = pos + 1;
    } else { // transactional: effect and offset in ONE database transaction
      const tx = { balance: db.balance + e.amount, offset: pos + 1 };
      if (crashNow) { crashed = true; continue; }        // crash before COMMIT: tx discarded
      db.balance = tx.balance; db.offset = tx.offset; applies++; committed = db.offset;
    }
  }
  const diff = db.balance - expected;
  console.log(mode.padEnd(16) + " balance=" + String(db.balance).padStart(3) + " expected=" + expected +
    " applies=" + String(applies).padStart(2) + "  " + (diff === 0 ? "correct" : diff > 0 ? "DUPLICATE +" + diff : "LOST " + -diff));
}
console.log("== 1. consumer crash between side effect and offset commit (at offset " + CRASH_AT + ") ==");
for (const m of ["at-most-once", "at-least-once", "idempotent sink", "transactional"]) run(m);

console.log("");
console.log("== 2. producer retry after a lost ack ==");
function produce(idempotent) {
  const log = [], seen = new Map(); // broker-side: producerId -> last sequence number
  const send = (pid, seq, v) => {
    if (idempotent && seen.has(pid) && seen.get(pid) >= seq) return "duplicate ignored";
    seen.set(pid, seq); log.push(v); return "appended";
  };
  const r = [send("P1", 0, "a"), send("P1", 1, "b"), send("P1", 1, "b"), send("P1", 2, "c")]; // ack for seq 1 lost, retried
  console.log((idempotent ? "idempotent producer " : "plain producer      ") + "log=[" + log.join(",") + "] retry -> " + r[2]);
}
produce(false); produce(true);

console.log("");
console.log("== 3. read-process-write transaction that aborts ==");
const out = [{ v: "r1", tx: "T1" }, { v: "r2", tx: "T1" }, { v: "r3", tx: "T2" }, { v: "r4", tx: "T2" }];
const status = { T1: "committed", T2: "aborted" };
const uncommitted = out.map((r) => r.v);
const committedOnly = out.filter((r) => status[r.tx] === "committed").map((r) => r.v);
console.log("read_uncommitted consumer sees [" + uncommitted.join(",") + "]");
console.log("read_committed   consumer sees [" + committedOnly.join(",") + "]");

console.log("");
console.log("== 4. SQS FIFO deduplication window (5 minutes) ==");
const WINDOW = 300, firstSeen = new Map(), fifo = [];
function fifoSend(dedupId, t) {
  if (firstSeen.has(dedupId) && t - firstSeen.get(dedupId) < WINDOW) return "accepted, not enqueued again";
  firstSeen.set(dedupId, t); fifo.push(dedupId); return "enqueued";
}
for (const [id, t] of [["order-42", 0], ["order-42", 60], ["order-42", 299], ["order-42", 360]])
  console.log("t=" + String(t).padStart(3) + "s send " + id + " -> " + fifoSend(id, t));
console.log("queue now holds " + fifo.length + " copies of order-42");` },
          { tech: "python", code: `# Delivery semantics under a crash, simulated in-process (no real broker).
# The topic is a list; "offset" is the consumer's committed position; the
# sink is a wallet balance. The consumer crashes once, at offset 6.
events = [{"id": "pay-" + str(101 + i), "amount": 10 * (i + 1)} for i in range(10)]
expected = sum(e["amount"] for e in events)
CRASH_AT = 6


def run(mode):
    db = {"balance": 0, "applied": set(), "offset": 0}  # durable state
    committed, crashed, applies = 0, False, 0
    while committed < len(events):
        pos = db["offset"] if mode == "transactional" else committed  # where we resume
        e = events[pos]
        crash_now = not crashed and pos == CRASH_AT
        if mode == "at-most-once":
            committed = pos + 1                  # 1. commit offset
            if crash_now:
                crashed = True                   # crash: effect never happens
                continue
            db["balance"] += e["amount"]         # 2. side effect
            applies += 1
        elif mode == "at-least-once":
            db["balance"] += e["amount"]         # 1. side effect
            applies += 1
            if crash_now:
                crashed = True                   # crash before commit
                continue
            committed = pos + 1                  # 2. commit offset
        elif mode == "idempotent sink":
            if e["id"] not in db["applied"]:     # keyed upsert
                db["applied"].add(e["id"])
                db["balance"] += e["amount"]
                applies += 1
            if crash_now:
                crashed = True
                continue
            committed = pos + 1
        else:  # transactional: effect and offset in ONE database transaction
            tx = {"balance": db["balance"] + e["amount"], "offset": pos + 1}
            if crash_now:
                crashed = True                   # crash before COMMIT: tx discarded
                continue
            db["balance"], db["offset"] = tx["balance"], tx["offset"]
            applies += 1
            committed = db["offset"]
    diff = db["balance"] - expected
    verdict = "correct" if diff == 0 else ("DUPLICATE +" + str(diff) if diff > 0 else "LOST " + str(-diff))
    print(mode.ljust(16) + " balance=" + str(db["balance"]).rjust(3) + " expected=" + str(expected)
          + " applies=" + str(applies).rjust(2) + "  " + verdict)


print("== 1. consumer crash between side effect and offset commit (at offset " + str(CRASH_AT) + ") ==")
for m in ["at-most-once", "at-least-once", "idempotent sink", "transactional"]:
    run(m)

print("")
print("== 2. producer retry after a lost ack ==")


def produce(idempotent):
    log, seen = [], {}  # broker-side: producerId -> last sequence number

    def send(pid, seq, v):
        if idempotent and pid in seen and seen[pid] >= seq:
            return "duplicate ignored"
        seen[pid] = seq
        log.append(v)
        return "appended"
    r = [send("P1", 0, "a"), send("P1", 1, "b"), send("P1", 1, "b"), send("P1", 2, "c")]  # ack for seq 1 lost, retried
    print(("idempotent producer " if idempotent else "plain producer      ") + "log=[" + ",".join(log) + "] retry -> " + r[2])


produce(False)
produce(True)

print("")
print("== 3. read-process-write transaction that aborts ==")
out = [{"v": "r1", "tx": "T1"}, {"v": "r2", "tx": "T1"}, {"v": "r3", "tx": "T2"}, {"v": "r4", "tx": "T2"}]
status = {"T1": "committed", "T2": "aborted"}
print("read_uncommitted consumer sees [" + ",".join(r["v"] for r in out) + "]")
print("read_committed   consumer sees [" + ",".join(r["v"] for r in out if status[r["tx"]] == "committed") + "]")

print("")
print("== 4. SQS FIFO deduplication window (5 minutes) ==")
WINDOW = 300
first_seen, fifo = {}, []


def fifo_send(dedup_id, t):
    if dedup_id in first_seen and t - first_seen[dedup_id] < WINDOW:
        return "accepted, not enqueued again"
    first_seen[dedup_id] = t
    fifo.append(dedup_id)
    return "enqueued"


for mid, t in [("order-42", 0), ("order-42", 60), ("order-42", 299), ("order-42", 360)]:
    print("t=" + str(t).rjust(3) + "s send " + mid + " -> " + fifo_send(mid, t))
print("queue now holds " + str(len(fifo)) + " copies of order-42")` },
        ],
      },
    ],
  },
  {
    title: `How would you design a distributed message queue?`,
    difficulty: "hard",
    seoDescription: `Design a distributed message queue: partitioned replicated logs, ISR and acks, offsets, consumer groups, capacity math and a verified failover run.`,
    description: `**Question presented to candidate:**
"Design a distributed message queue, something like Kafka or SQS, that many services in our company can publish to and consume from. It has to survive machine failures without losing acknowledged messages and handle about a million messages a second at peak."

**What a strong answer should cover:**
- Requirements and a worked capacity estimate (throughput, replication traffic, storage for the retention period, broker and partition counts)
- The core data structure: topics split into **partitions**, each an **append-only log** of segment files on disk, with consumers reading by **offset**; keys hash to partitions so per-key order holds
- **Replication** with a leader per partition, followers, the **in-sync replica set (ISR)**, the **high watermark**, and the producer \`acks\` setting; how \`min.insync.replicas\` and **unclean leader election** trade availability for durability
- **Consumer groups**: partition assignment, committed offsets stored durably, rebalancing, and the delivery semantics that follow (at-least-once by default)
- A **metadata/controller** service built on consensus (as Kafka KRaft does) for leader election and partition placement, and the trade-offs at 10x scale (partition count, hot keys, rebalances, tiered storage)

**Clarifying questions expected:**
- Do consumers need replay and many independent subscribers (a log), or per-message acknowledgement and retries (a queue)? Or both?
- What ordering is required, and per what key?
- What durability is required: can we lose acknowledged messages if a whole machine dies?

**Code / implementation expected:** Optional — a simulation of one replicated partition showing how acks, ISR and leader election decide whether acknowledged messages survive; the example does that and also computes the capacity estimate.`,
    answer: `**Target Audience:** Engineers preparing for a senior system design round; you know what a server, a disk and a network are, and everything about logs and replication is defined as we go.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). Kafka configuration defaults quoted are from the Kafka documentation and release notes, checked in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The capacity numbers and the failover runs come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

Picture a town post office that never closes. Thousands of people drop off letters; dozens of delivery vans pick them up. Three rules make it trustworthy:

1. When the counter clerk stamps your receipt, your letter **must not disappear**, even if that clerk's building burns down that night. So the clerk photocopies every letter into two other buildings before stamping.
2. Letters for the same street must be delivered **in the order they were posted**. So each street has one sorting shelf, and letters go onto it in arrival order.
3. If a van breaks down halfway through its round, another van must **pick up exactly where it stopped**. So every van writes its progress in a shared logbook.

A distributed message queue is that post office in software. The photocopies are **replication**, the shelves are **partitions**, and the logbook is **committed offsets**. The interview is about how you build each rule and what you trade when machines fail.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Log semantics (replay, many subscribers) or queue semantics (per-message ack, retries)? | Decides the core data structure; a log can be extended with queue-style consumption later, as Kafka did with share groups |
| Peak messages per second and average size? | Drives broker count, disk and network; 1 KB vs 100 KB changes the design |
| Retention: hours, days, forever? | Storage is throughput times retention times replication factor |
| Ordering scope: none, per key, global? | Global order means one partition and no parallelism; per key scales |
| Durability: may an acknowledged message ever be lost? | Decides \`acks\`, replication factor and whether the system refuses writes when replicas are missing |
| One region or several? | Cross-region replication is usually asynchronous, with its own lag and failover story |

## 3. Requirements

**Functional**

- Producers publish messages to a named **topic**, optionally with a key.
- Consumers subscribe to topics in **consumer groups**; each group receives every message, and within a group each message is handled by one member.
- Consumers can **replay** from an earlier position within the retention period.
- Per-key ordering.

**Non-functional**

- 1,000,000 messages per second at peak, 1 KB average.
- No loss of acknowledged messages when any single broker fails.
- Writes keep working when one broker of a partition fails; p99 publish latency in the tens of milliseconds.
- 7 days of retention.
- Horizontal scale: more brokers means more throughput.

## 4. Capacity Estimate

Assumptions (stated so an interviewer can change them): 1,000,000 messages per second, 1,000 bytes each, replication factor 3, 7-day retention, each broker sustains 200 MB/s of disk writes and runs at 60% of that for headroom, and one consumer handles 10 MB/s per partition. The example program does the arithmetic:

| Quantity | Calculation | Result |
| :--- | :--- | ---: |
| Ingress | 1,000,000 x 1,000 B | 1,000 MB/s |
| Disk writes across the cluster | 1,000 MB/s x 3 replicas | 3,000 MB/s |
| Replication traffic between brokers | 3,000 - 1,000 | 2,000 MB/s |
| Brokers | 3,000 / (200 x 0.6), rounded up | 25 |
| Storage for 7 days | 1,000 MB/s x 86,400 s x 7 x 3 | 1,814,400 GB (about 1.8 PB) |
| Storage per broker | 1,814,400 / 25 | 72,576 GB |
| Partitions (minimum) | 1,000 MB/s / 10 MB/s | 100 |

Two things stand out. Storage, not CPU, is the dominant cost: 72 TB per broker is a lot of local disk, which is why modern designs move old segments to object storage (**tiered storage**). And the partition count is also the maximum number of useful consumers in one group, so you size it for consumer parallelism, not just broker throughput.

## 5. API

~~~http
POST /topics/{topic}/messages        body: [{ key, value, headers }]     -> [{ partition, offset }]
GET  /topics/{topic}/partitions/{p}/messages?offset=1200&max_bytes=1048576 -> records from offset 1200
POST /groups/{group}/offsets         body: [{ topic, partition, offset }]  (commit progress)
POST /groups/{group}/join            body: { member_id, topics }          -> assigned partitions
~~~

Real systems use a binary protocol over long-lived TCP connections rather than HTTP, and batch many records per request, because per-request overhead at a million messages per second would dominate. The shape of the operations is the same.

## 6. Data Model: a Partition Is an Append-Only Log

📌 **Interview term: topic** — a named stream of messages, such as \`orders\`.

📌 **Interview term: partition** — one ordered, append-only log that holds part of a topic. The producer picks the partition by hashing the key, so all messages with key \`order-42\` land in the same partition and stay in order.

📌 **Interview term: offset** — the position of a message in its partition: 0, 1, 2, ... Offsets never change once assigned.

On disk a partition is a directory of **segment** files. New messages are appended to the active segment; when it reaches a size or age limit it is closed and a new one starts. Each segment has a small **index** mapping offsets to byte positions, so "read from offset 1,200" is a lookup plus a sequential read. Retention deletes whole old segments, which is cheap, instead of individual messages.

📌 **Interview term: log segment** — one file of a partition log, plus its offset index. Appends go to the newest segment; retention drops the oldest ones.

Why an append-only log is fast: disks and SSDs are far faster at sequential writes and reads than at random ones, the operating system page cache keeps recent segments in memory for consumers that are caught up, and brokers can send file bytes straight to the network socket without copying them through the application (the Kafka design documentation describes this use of the \`sendfile\` system call, often called zero-copy).

📌 **Interview term: log compaction** — an alternative to time-based retention that keeps only the latest message per key, so the log becomes a durable table of current values (useful for changelogs and configuration).

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 780 380" role="img" aria-label="Producers send to partition leaders on brokers, followers replicate from leaders, a controller quorum manages metadata, consumer groups fetch from leaders">
  <defs>
    <marker id="sd10q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="140" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="172" text-anchor="middle">producers</text>
  <text class="d-sub" x="80" y="194" text-anchor="middle">batch by partition</text>
  <rect class="d-box-muted" x="190" y="90" width="400" height="190" rx="12"/>
  <text class="d-sub" x="390" y="116" text-anchor="middle">brokers</text>
  <rect class="d-box-accent" x="215" y="140" width="110" height="70" rx="10"/>
  <text class="d-text" x="270" y="170" text-anchor="middle">broker 1</text>
  <text class="d-sub" x="270" y="192" text-anchor="middle">P0 leader</text>
  <rect class="d-box" x="335" y="140" width="110" height="70" rx="10"/>
  <text class="d-text" x="390" y="170" text-anchor="middle">broker 2</text>
  <text class="d-sub" x="390" y="192" text-anchor="middle">P0 follower</text>
  <rect class="d-box" x="455" y="140" width="110" height="70" rx="10"/>
  <text class="d-text" x="510" y="170" text-anchor="middle">broker 3</text>
  <text class="d-sub" x="510" y="192" text-anchor="middle">P0 follower</text>
  <text class="d-sub" x="390" y="250" text-anchor="middle">followers fetch from the leader</text>
  <line class="d-edge" x1="140" y1="175" x2="211" y2="175" marker-end="url(#sd10q3-arrow)"/>
  <rect class="d-box" x="275" y="10" width="230" height="56" rx="10"/>
  <text class="d-text" x="390" y="43" text-anchor="middle">controller quorum (Raft)</text>
  <line class="d-edge-dashed" x1="390" y1="66" x2="390" y2="86" marker-end="url(#sd10q3-arrow)"/>
  <rect class="d-box" x="640" y="100" width="125" height="70" rx="10"/>
  <text class="d-text" x="702" y="132" text-anchor="middle">group A</text>
  <text class="d-sub" x="702" y="154" text-anchor="middle">billing</text>
  <rect class="d-box" x="640" y="210" width="125" height="70" rx="10"/>
  <text class="d-text" x="702" y="242" text-anchor="middle">group B</text>
  <text class="d-sub" x="702" y="264" text-anchor="middle">analytics</text>
  <line class="d-edge-accent" x1="590" y1="160" x2="636" y2="140" marker-end="url(#sd10q3-arrow)"/>
  <line class="d-edge-accent" x1="590" y1="220" x2="636" y2="240" marker-end="url(#sd10q3-arrow)"/>
  <rect class="d-box-muted" x="190" y="320" width="400" height="44" rx="10"/>
  <text class="d-text" x="390" y="348" text-anchor="middle">object storage for old segments</text>
</svg>

Producers talk to the leader of each partition; followers copy from the leader; consumers in each group fetch from leaders; the controller quorum decides who leads.

- **Brokers** store partitions. Each partition has one **leader** replica that handles writes and reads and some **followers** on other brokers (ideally in other availability zones).
- **Producers** look up which broker leads each partition (from metadata), batch messages by partition, and send them to that leader.
- **Consumers** fetch from partition leaders at their own pace (**pull**), which gives natural [backpressure](/interview-question/what-is-backpressure-and-how-do-you-handle-it): a slow consumer just falls behind instead of being overwhelmed.
- **Controller quorum**: a small group of nodes running a consensus protocol (Raft in Kafka KRaft mode) that stores cluster metadata (topics, partition placement, leaders, ISR) and elects partition leaders when a broker dies. Kafka 4.0 (March 2025) removed the older ZooKeeper option entirely (Apache Kafka 4.0.0 release announcement). See [leader election](/interview-question/what-is-leader-election-in-distributed-systems) for how such a quorum elects its own leader.
- **Group coordinator**: a broker role that tracks consumer group membership, assigns partitions and stores committed offsets durably (Kafka keeps them in an internal compacted topic).

## 8. Deep Dive 1: Replication, Acks and the ISR

This is where an interview is won or lost. Three ideas:

📌 **Interview term: in-sync replica set (ISR)** — the leader plus the followers that are caught up (they have fetched recently enough). A follower that falls too far behind is removed from the ISR; it rejoins when it catches up.

📌 **Interview term: high watermark** — the highest offset that every ISR member has. Only messages below it are **committed**, and consumers can read only committed messages, so a reader never sees a message that a leader change could take back.

📌 **Interview term: acks** — how many replicas must have a message before the producer is told it succeeded. \`acks=1\`: the leader alone. \`acks=all\`: every member of the current ISR. Since Kafka 3.0 the producer default is \`acks=all\` (KIP-679).

📌 **Interview term: min.insync.replicas** — the minimum ISR size for an \`acks=all\` write to be accepted. If the ISR shrinks below it, the leader rejects writes with \`NotEnoughReplicas\` instead of accepting writes that only one copy holds. The Kafka default is 1; replication factor 3 with \`min.insync.replicas=2\` is the common durable setting.

📌 **Interview term: unclean leader election** — letting a replica that is *not* in the ISR become leader when no ISR member is alive. The partition comes back online, but every committed message the new leader lacks is lost. Kafka disables it by default (\`unclean.leader.election.enable=false\`).

The example **"One replicated partition: acks, ISR, high watermark, min.insync.replicas, unclean election, plus a capacity estimate"** plays out the failure cases on three brokers:

| Scenario | What happened | Acknowledged messages lost |
| :--- | :--- | ---: |
| \`acks=1\`, leader crashes before followers fetch m4, m5 | New leader b2 has m1..m3; the producer was told m4, m5 succeeded | **2** |
| \`acks=all\`, \`min.insync.replicas=2\`, same crash | m4, m5 were never acknowledged; the producer retried them on b2 | 0 |
| b3 falls out of the ISR, b2 crashes, \`min.insync.replicas=2\` | m5 rejected with \`NotEnoughReplicas\`; then b1 crashes and the partition is offline until b1 returns | 0 (unavailable, not lost) |
| Same, \`min.insync.replicas=1\` | m5 accepted with only b1 holding it; b1 crashes, partition offline | 0 while offline, but only b1 holds m5 |
| Same, plus unclean leader election | Stale b3 becomes leader with only m1 | **4** (m2..m5) |

Note also the first run: after m4, m5 the leader log ended at 5 but the high watermark was 3, so consumers could read only 3 messages. With \`acks=1\` the producer was told "success" for messages that no consumer was allowed to read yet, and that the crash then destroyed.

The pattern is a CAP trade-off in miniature (see [the CAP theorem](/interview-question/what-is-the-cap-theorem)): \`min.insync.replicas=2\` refuses writes rather than risk losing them, and unclean election restores availability by giving up acknowledged data. The safe default for important data is replication factor 3, \`acks=all\`, \`min.insync.replicas=2\`, unclean election off, with replicas spread across availability zones.

## 9. Deep Dive 2: Consumer Groups, Offsets and Delivery Semantics

📌 **Interview term: consumer group** — consumers that share one subscription; each partition is assigned to one member, so the group processes the topic in parallel and each partition in order.

📌 **Interview term: rebalance** — reassigning partitions when a member joins, leaves or stops sending heartbeats. During a rebalance the moving partitions are paused, which is why modern protocols reassign incrementally instead of stopping the whole group (Kafka KIP-848, generally available in 4.0).

A consumer processes records and then **commits** the offset of the next record to read. If it crashes after processing and before committing, the next owner re-reads those records: **at-least-once**. Committing first would be at-most-once. Exactly-once needs the effect to be idempotent or committed atomically with the offset; that is covered in depth on [exactly-once processing](/interview-question/exactly-once-processing-can-kafka-or-sqs-guarantee-it).

Queue-style consumption (any worker takes any message, acknowledges each one, failed ones are retried and eventually dead-lettered) can be built on the same log: the broker tracks per-message acknowledgement state for a range of offsets instead of one offset per partition. Kafka share groups (KIP-932, production-ready in Kafka 4.2) do exactly this. For a fully managed queue with those semantics, see [Kafka vs SQS](/interview-question/kafka-vs-sqs-how-do-you-choose-for-an-event-driven-system-in-2025).

## 10. Deep Dive 3: Partitioning and Ordering

- **Key to partition:** \`partition = hash(key) mod N\`. All messages for one key keep their order. No key: spread messages round-robin or in sticky batches for throughput.
- **Changing N remaps keys.** Going from 100 to 150 partitions moves most keys to a different partition, so for a while old messages of a key are in one partition and new ones in another. Pick N with growth in mind; [consistent hashing](/interview-question/what-is-consistent-hashing) is not used here because ordering, not minimal movement, is the goal.
- **Hot keys.** One huge customer can make one partition the bottleneck. Options: split the key (\`customer-7#shard-3\`) when strict per-customer order is not needed, or give that tenant its own topic.
- **Global order** needs a single partition, which caps the whole topic at one consumer and one leader broker. Ask whether the business really needs it; usually per-entity order is enough.

## 11. What Breaks First at 10x

| At 10 million messages per second | Fix |
| :--- | :--- |
| Storage: 18 PB for 7 days at RF 3 | **Tiered storage**: keep recent segments on local disk, move older ones to object storage |
| Partition count in the tens of thousands | Metadata and leader elections get slower; use fewer, bigger partitions, and a controller built for it (KRaft) |
| Rebalances pause large groups | Incremental or cooperative rebalancing; static membership so restarts do not trigger reassignment |
| Cross-zone replication traffic and cost | Rack-aware placement; let consumers fetch from a follower in their own zone |
| Producer fan-in | More partitions per topic, larger batches, compression |

## 12. Verified: Running the Code

What the program simulates: one partition with three replicas held as arrays; a follower "fetch" copies the leader array; the high watermark is the minimum log length across the ISR; a crash removes a broker from the ISR and, if it was the leader, elects the first live ISR member (or any live broker when unclean election is on). It leaves out the network, timing-based ISR shrinking (the program removes b3 explicitly), log truncation on followers and the controller itself.

The core of the durability rule:

~~~js
produce(m, acks) {
  if (this.leader < 0) return m + ": partition OFFLINE";
  if (acks === "all" && this.isr.length < this.minIsr) return m + ": REJECTED NotEnoughReplicas (isr=" + this.isr.length + ")";
  this.logs[this.leader].push(m);
  if (acks === "1") { this.acked.push(m); return m + ": acked by leader only"; }
~~~

Full output (identical in Node, Python, Go and Java):

~~~text
== 1. acks=1: leader acknowledges before followers copy ==
  m4: acked by leader only
  m5: acked by leader only
  leader log end=5 high watermark=3 (consumers can read 3)
  b1 (leader) crashed, clean election -> leader b2 log=[m1,m2,m3]
  acked=5 lost acked=2 [m4,m5] final log=[m1,m2,m3]
== 2. acks=all, min.insync.replicas=2: same crash ==
  m4: waiting for ISR {b1,b2,b3}
  m5: waiting for ISR {b1,b2,b3}
  b1 (leader) crashed, clean election -> leader b2 log=[m1,m2,m3]
  producer retries m4, m5 on the new leader:
  acked=5 lost acked=0 final log=[m1,m2,m3,m4,m5]
== 3. slow follower, then two crashes: min.insync.replicas=2 unclean.leader.election=false ==
  b3 fell behind, isr={b1,b2}, b3 log=[m1]
  b2 crashed, isr={b1}
  m5: REJECTED NotEnoughReplicas (isr=1)
  b1 (leader) crashed, no in-sync replica left: partition offline
  acked=4, none readable: partition unavailable until b1, the last in-sync replica, returns
== 3. slow follower, then two crashes: min.insync.replicas=1 unclean.leader.election=false ==
  b3 fell behind, isr={b1,b2}, b3 log=[m1]
  b2 crashed, isr={b1}
  m5: acked, isr={b1}
  b1 (leader) crashed, no in-sync replica left: partition offline
  acked=5, none readable: partition unavailable until b1, the last in-sync replica, returns
== 3. slow follower, then two crashes: min.insync.replicas=1 unclean.leader.election=true ==
  b3 fell behind, isr={b1,b2}, b3 log=[m1]
  b2 crashed, isr={b1}
  m5: acked, isr={b1}
  b1 (leader) crashed, UNCLEAN election -> leader b3 log=[m1]
  acked=5 lost acked=4 [m2,m3,m4,m5] final log=[m1]
== 4. capacity estimate ==
  ingress 1000 MB/s, disk writes with RF=3: 3000 MB/s, replication traffic 2000 MB/s
  brokers at 60% of 200 MB/s: 25, storage for 7 days: 1814400 GB (72576 GB per broker)
  partitions at 10 MB/s each: at least 100 (also the max useful consumers per group)
~~~

## 13. Edge Cases Worth Knowing

- **A slow follower is not a dead one.** ISR membership is decided by lag over time; too strict and replicas flap in and out, too loose and \`acks=all\` waits on a sluggish disk.
- **Zombie leaders.** An old leader cut off from the controller may still accept writes for a moment. Leader **epochs** let followers and clients reject anything from an outdated leader, the same idea as fencing tokens.
- **Producer retries and ordering.** Retried batches can overtake later ones; the idempotent producer (sequence numbers per partition) keeps order and removes duplicates.
- **Poison messages.** In a log, one record that always fails blocks its partition; route it to a retry or dead-letter topic and move on.
- **Disk full.** Retention by time alone fails if traffic spikes; add size-based retention and alarms per broker.

## Common Pitfalls

- **Acknowledging before replication.** With \`acks=1\` the run lost 2 acknowledged messages on one crash. Durability promises need \`acks=all\` plus \`min.insync.replicas\` of at least 2.
- **Turning on unclean election to "fix" an outage.** It brought the partition back by losing 4 acknowledged messages in the run.
- **Ignoring the high watermark.** Readers must not see messages above it, or they act on data a leader change can erase.
- **Sizing partitions for today.** Partition count caps consumer parallelism and is painful to change for keyed topics.
- **Putting replicas in one zone.** A zone outage then takes out every copy; spread replicas across zones.
- **Forgetting storage math.** 1.8 PB for 7 days at a million 1 KB messages per second surprises people; say the number.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size:</strong> <span style="color:#f0e2c8;">I would ask for log or queue semantics, ordering scope and durability. Then size it: a million 1 KB messages per second is 1,000 MB/s in, 3,000 MB/s of disk writes at replication factor 3, about 25 brokers at 60% of 200 MB/s, 1.8 PB for 7 days, and at least 100 partitions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Core structure:</strong> <span style="color:#f0e2c8;">Topics split into <strong style="color:#ffca28;">partitions</strong>, each an append-only log of segment files read by <strong style="color:#ffca28;">offset</strong>. The key hashes to a partition, so per-key order holds; appends and reads are sequential, which is why the design is fast.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Replication:</strong> <span style="color:#f0e2c8;">Each partition has a leader and followers on other brokers and zones. The leader tracks the <strong style="color:#ffca28;">ISR</strong>; the <strong style="color:#ffca28;">high watermark</strong> is what every ISR member has, and only that is readable. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">acks=all</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min.insync.replicas=2</code>, an acknowledged message is on at least two machines.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Show the trade-off:</strong> <span style="color:#f0e2c8;">In my simulation <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">acks=1</code> lost 2 acknowledged messages when the leader died; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">acks=all</code> lost none. When the ISR shrank to one broker, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min.insync.replicas=2</code> rejected writes, and enabling unclean election brought the partition back by losing 4 acknowledged messages.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Consumers and scale:</strong> <span style="color:#f0e2c8;">Consumer groups get partitions assigned and commit offsets durably, giving at-least-once by default; a controller quorum running Raft elects leaders. At 10x the first problems are storage (tiered storage), partition counts, rebalances and cross-zone traffic.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why pull-based consumers instead of the broker pushing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pull lets each consumer go at its own speed and batch as much as it can handle, so a slow consumer just builds lag instead of being overwhelmed, and the broker does not track per-consumer flow control. The cost is polling when idle, which long-poll fetches with a wait time solve.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you guarantee ordering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only within a partition. Producers hash the key to pick the partition, the leader assigns increasing offsets, and one consumer in a group owns each partition. Retries could reorder batches, so the producer uses sequence numbers (the idempotent producer) to keep order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when a broker dies?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The controller notices missed heartbeats, removes the broker from every ISR, and for each partition it led picks a new leader from the remaining ISR members. Producers and consumers refresh metadata and reconnect. No acknowledged data is lost if writes used <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">acks=all</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min.insync.replicas</code> of 2 or more.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add per-message acknowledgement and a DLQ?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the log, and track state per record for a window of offsets: available, acquired with a lock timeout, acknowledged, or rejected. Records whose delivery count passes a limit are archived or sent to a dead-letter topic. That is the model of Kafka share groups, production-ready in 4.2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep 1.8 PB of retention affordable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Tiered storage: brokers keep only recent segments on local disk and upload closed segments to object storage, fetching them back for the rare consumer that replays old data. Brokers then become small and easy to replace, and retention can grow without adding brokers.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Topic | A named stream of messages |
| Partition | One ordered append-only log holding part of a topic |
| Offset | Position of a message in its partition |
| Log segment | One file of a partition plus its index; retention drops whole segments |
| Log compaction | Keep only the latest message per key |
| In-sync replica set (ISR) | Leader plus followers that are caught up |
| High watermark | Highest offset held by every ISR member; the readable limit |
| acks | How many replicas must have a message before the producer is told it succeeded |
| min.insync.replicas | Minimum ISR size for an acks=all write to be accepted |
| Unclean leader election | Letting an out-of-sync replica lead; restores availability, loses data |
| Consumer group | Consumers sharing a subscription, one member per partition |
| Rebalance | Reassigning partitions when group membership changes |

**Conclusion:** A distributed message queue is a set of partitioned, replicated append-only logs plus two pieces of bookkeeping: who leads each partition, and where each consumer group has reached. The capacity math (1,000 MB/s in, 3,000 MB/s of disk writes, 25 brokers, 1.8 PB for a week) tells you storage is the real cost, and the failover runs tell you what the durability knobs buy: \`acks=1\` lost 2 acknowledged messages, \`acks=all\` with \`min.insync.replicas=2\` lost none and refused writes when it could not keep that promise, and unclean leader election traded 4 acknowledged messages for getting the partition back. Present the structure, show those trade-offs, and say what breaks at 10x.`,
    examples: [
      {
        label: `One replicated partition: acks, ISR, high watermark, min.insync.replicas, unclean election, plus a capacity estimate`,
        variants: [
          { tech: "node", code: `// One replicated partition (3 brokers), simulated in-process: acks, ISR,
// high watermark, min.insync.replicas and unclean leader election.
const NAMES = ["b1", "b2", "b3"];
class Partition {
  constructor(minIsr, unclean) {
    this.logs = [[], [], []]; this.alive = [true, true, true]; this.isr = [0, 1, 2];
    this.leader = 0; this.minIsr = minIsr; this.unclean = unclean; this.pending = []; this.acked = [];
  }
  hw() { // high watermark: highest offset every ISR member has
    if (this.leader < 0) return 0;
    let h = this.logs[this.leader].length;
    for (const b of this.isr) h = Math.min(h, this.logs[b].length);
    return h;
  }
  produce(m, acks) {
    if (this.leader < 0) return m + ": partition OFFLINE";
    if (acks === "all" && this.isr.length < this.minIsr) return m + ": REJECTED NotEnoughReplicas (isr=" + this.isr.length + ")";
    this.logs[this.leader].push(m);
    if (acks === "1") { this.acked.push(m); return m + ": acked by leader only"; }
    this.pending.push(m); this.advance();
    return this.acked.indexOf(m) >= 0 ? m + ": acked, isr=" + this.isrNames() : m + ": waiting for ISR " + this.isrNames();
  }
  fetch(f) { // follower f copies the leader log
    if (this.alive[f] && this.leader >= 0) { this.logs[f] = this.logs[this.leader].slice(); this.advance(); }
  }
  advance() {
    const h = this.hw(), keep = [];
    for (const m of this.pending) { if (this.logs[this.leader].indexOf(m) < h) this.acked.push(m); else keep.push(m); }
    this.pending = keep;
  }
  shrink(b) { this.isr = this.isr.filter((x) => x !== b); }
  crash(b) {
    this.alive[b] = false; this.shrink(b);
    if (b !== this.leader) return NAMES[b] + " crashed, isr=" + this.isrNames();
    let cand = this.isr.filter((x) => this.alive[x]), how = "clean";
    if (cand.length === 0 && this.unclean) { cand = [0, 1, 2].filter((x) => this.alive[x]); how = "UNCLEAN"; }
    this.pending = []; // in-flight requests time out; the producer must retry
    if (cand.length === 0) { this.leader = -1; return NAMES[b] + " (leader) crashed, no in-sync replica left: partition offline"; }
    this.leader = cand[0];
    if (this.isr.indexOf(this.leader) < 0) this.isr = [this.leader];
    return NAMES[b] + " (leader) crashed, " + how + " election -> leader " + NAMES[this.leader] + " log=[" + this.logs[this.leader].join(",") + "]";
  }
  isrNames() { return "{" + this.isr.map((b) => NAMES[b]).join(",") + "}"; }
  report() {
    if (this.leader < 0) { console.log("  acked=" + this.acked.length + ", none readable: partition unavailable until b1, the last in-sync replica, returns"); return; }
    const log = this.logs[this.leader];
    const lost = this.acked.filter((m) => log.indexOf(m) < 0);
    console.log("  acked=" + this.acked.length + " lost acked=" + lost.length + (lost.length ? " [" + lost.join(",") + "]" : "") + " final log=[" + log.join(",") + "]");
  }
}

console.log("== 1. acks=1: leader acknowledges before followers copy ==");
let p = new Partition(1, false);
for (const m of ["m1", "m2", "m3"]) p.produce(m, "1");
p.fetch(1); p.fetch(2);
console.log("  " + p.produce("m4", "1")); console.log("  " + p.produce("m5", "1"));
console.log("  leader log end=" + p.logs[0].length + " high watermark=" + p.hw() + " (consumers can read 3)");
console.log("  " + p.crash(0)); p.report();

console.log("== 2. acks=all, min.insync.replicas=2: same crash ==");
p = new Partition(2, false);
for (const m of ["m1", "m2", "m3"]) p.produce(m, "all");
p.fetch(1); p.fetch(2);
console.log("  " + p.produce("m4", "all")); console.log("  " + p.produce("m5", "all"));
console.log("  " + p.crash(0));
console.log("  producer retries m4, m5 on the new leader:");
p.produce("m4", "all"); p.produce("m5", "all"); p.fetch(2); p.report();

for (const [minIsr, unclean] of [[2, false], [1, false], [1, true]]) {
  console.log("== 3. slow follower, then two crashes: min.insync.replicas=" + minIsr + " unclean.leader.election=" + unclean + " ==");
  p = new Partition(minIsr, unclean);
  p.produce("m1", "all"); p.fetch(1); p.fetch(2);
  p.shrink(2); // b3 stops fetching (slow disk) and drops out of the ISR
  for (const m of ["m2", "m3", "m4"]) { p.produce(m, "all"); p.fetch(1); }
  console.log("  b3 fell behind, isr=" + p.isrNames() + ", b3 log=[" + p.logs[2].join(",") + "]");
  console.log("  " + p.crash(1));
  console.log("  " + p.produce("m5", "all"));
  console.log("  " + p.crash(0)); p.report();
}

console.log("== 4. capacity estimate ==");
const msgs = 1000000, bytes = 1000, rf = 3, days = 7, brokerMBs = 200, partMBs = 10;
const ingress = (msgs * bytes) / 1000000, disk = ingress * rf;
const brokers = Math.ceil((disk * 10) / (brokerMBs * 6)); // keep each broker at 60% of its write budget
const storageGB = (ingress * 86400 * days * rf) / 1000;
console.log("  ingress " + ingress + " MB/s, disk writes with RF=" + rf + ": " + disk + " MB/s, replication traffic " + (disk - ingress) + " MB/s");
console.log("  brokers at 60% of " + brokerMBs + " MB/s: " + brokers + ", storage for " + days + " days: " + storageGB + " GB (" + Math.floor(storageGB / brokers) + " GB per broker)");
console.log("  partitions at " + partMBs + " MB/s each: at least " + Math.ceil(ingress / partMBs) + " (also the max useful consumers per group)");` },
          { tech: "python", code: `# One replicated partition (3 brokers), simulated in-process: acks, ISR,
# high watermark, min.insync.replicas and unclean leader election.
import math

NAMES = ["b1", "b2", "b3"]


class Partition:
    def __init__(self, min_isr, unclean):
        self.logs = [[], [], []]
        self.alive = [True, True, True]
        self.isr = [0, 1, 2]
        self.leader = 0
        self.min_isr = min_isr
        self.unclean = unclean
        self.pending = []
        self.acked = []

    def hw(self):  # high watermark: highest offset every ISR member has
        if self.leader < 0:
            return 0
        h = len(self.logs[self.leader])
        for b in self.isr:
            h = min(h, len(self.logs[b]))
        return h

    def produce(self, m, acks):
        if self.leader < 0:
            return m + ": partition OFFLINE"
        if acks == "all" and len(self.isr) < self.min_isr:
            return m + ": REJECTED NotEnoughReplicas (isr=" + str(len(self.isr)) + ")"
        self.logs[self.leader].append(m)
        if acks == "1":
            self.acked.append(m)
            return m + ": acked by leader only"
        self.pending.append(m)
        self.advance()
        return m + ": acked, isr=" + self.isr_names() if m in self.acked else m + ": waiting for ISR " + self.isr_names()

    def fetch(self, f):  # follower f copies the leader log
        if self.alive[f] and self.leader >= 0:
            self.logs[f] = list(self.logs[self.leader])
            self.advance()

    def advance(self):
        h, keep = self.hw(), []
        for m in self.pending:
            if self.logs[self.leader].index(m) < h:
                self.acked.append(m)
            else:
                keep.append(m)
        self.pending = keep

    def shrink(self, b):
        self.isr = [x for x in self.isr if x != b]

    def crash(self, b):
        self.alive[b] = False
        self.shrink(b)
        if b != self.leader:
            return NAMES[b] + " crashed, isr=" + self.isr_names()
        cand, how = [x for x in self.isr if self.alive[x]], "clean"
        if not cand and self.unclean:
            cand, how = [x for x in range(3) if self.alive[x]], "UNCLEAN"
        self.pending = []  # in-flight requests time out; the producer must retry
        if not cand:
            self.leader = -1
            return NAMES[b] + " (leader) crashed, no in-sync replica left: partition offline"
        self.leader = cand[0]
        if self.leader not in self.isr:
            self.isr = [self.leader]
        return NAMES[b] + " (leader) crashed, " + how + " election -> leader " + NAMES[self.leader] + " log=[" + ",".join(self.logs[self.leader]) + "]"

    def isr_names(self):
        return "{" + ",".join(NAMES[b] for b in self.isr) + "}"

    def report(self):
        if self.leader < 0:
            print("  acked=" + str(len(self.acked)) + ", none readable: partition unavailable until b1, the last in-sync replica, returns")
            return
        log = self.logs[self.leader]
        lost = [m for m in self.acked if m not in log]
        tail = (" [" + ",".join(lost) + "]") if lost else ""
        print("  acked=" + str(len(self.acked)) + " lost acked=" + str(len(lost)) + tail + " final log=[" + ",".join(log) + "]")


print("== 1. acks=1: leader acknowledges before followers copy ==")
p = Partition(1, False)
for m in ["m1", "m2", "m3"]:
    p.produce(m, "1")
p.fetch(1)
p.fetch(2)
print("  " + p.produce("m4", "1"))
print("  " + p.produce("m5", "1"))
print("  leader log end=" + str(len(p.logs[0])) + " high watermark=" + str(p.hw()) + " (consumers can read 3)")
print("  " + p.crash(0))
p.report()

print("== 2. acks=all, min.insync.replicas=2: same crash ==")
p = Partition(2, False)
for m in ["m1", "m2", "m3"]:
    p.produce(m, "all")
p.fetch(1)
p.fetch(2)
print("  " + p.produce("m4", "all"))
print("  " + p.produce("m5", "all"))
print("  " + p.crash(0))
print("  producer retries m4, m5 on the new leader:")
p.produce("m4", "all")
p.produce("m5", "all")
p.fetch(2)
p.report()

for min_isr, unclean in [(2, False), (1, False), (1, True)]:
    print("== 3. slow follower, then two crashes: min.insync.replicas=" + str(min_isr) + " unclean.leader.election=" + str(unclean).lower() + " ==")
    p = Partition(min_isr, unclean)
    p.produce("m1", "all")
    p.fetch(1)
    p.fetch(2)
    p.shrink(2)  # b3 stops fetching (slow disk) and drops out of the ISR
    for m in ["m2", "m3", "m4"]:
        p.produce(m, "all")
        p.fetch(1)
    print("  b3 fell behind, isr=" + p.isr_names() + ", b3 log=[" + ",".join(p.logs[2]) + "]")
    print("  " + p.crash(1))
    print("  " + p.produce("m5", "all"))
    print("  " + p.crash(0))
    p.report()

print("== 4. capacity estimate ==")
msgs, nbytes, rf, days, broker_mbs, part_mbs = 1000000, 1000, 3, 7, 200, 10
ingress = msgs * nbytes // 1000000
disk = ingress * rf
brokers = math.ceil(disk * 10 / (broker_mbs * 6))  # keep each broker at 60% of its write budget
storage_gb = ingress * 86400 * days * rf // 1000
print("  ingress " + str(ingress) + " MB/s, disk writes with RF=" + str(rf) + ": " + str(disk) + " MB/s, replication traffic " + str(disk - ingress) + " MB/s")
print("  brokers at 60% of " + str(broker_mbs) + " MB/s: " + str(brokers) + ", storage for " + str(days) + " days: " + str(storage_gb) + " GB (" + str(storage_gb // brokers) + " GB per broker)")
print("  partitions at " + str(part_mbs) + " MB/s each: at least " + str(math.ceil(ingress / part_mbs)) + " (also the max useful consumers per group)")` },
          { tech: "go", code: `// One replicated partition (3 brokers), simulated in-process: acks, ISR,
// high watermark, min.insync.replicas and unclean leader election.
package main

import (
	"fmt"
	"strings"
)

var NAMES = []string{"b1", "b2", "b3"}

type Partition struct {
	logs           [][]string
	alive          []bool
	isr            []int
	leader, minIsr int
	unclean        bool
	pending, acked []string
}

func NewPartition(minIsr int, unclean bool) *Partition {
	return &Partition{logs: [][]string{{}, {}, {}}, alive: []bool{true, true, true}, isr: []int{0, 1, 2}, minIsr: minIsr, unclean: unclean}
}

func indexOf(xs []string, m string) int {
	for i, x := range xs {
		if x == m {
			return i
		}
	}
	return -1
}

func (p *Partition) hw() int { // high watermark: highest offset every ISR member has
	if p.leader < 0 {
		return 0
	}
	h := len(p.logs[p.leader])
	for _, b := range p.isr {
		h = min(h, len(p.logs[b]))
	}
	return h
}

func (p *Partition) produce(m, acks string) string {
	if p.leader < 0 {
		return m + ": partition OFFLINE"
	}
	if acks == "all" && len(p.isr) < p.minIsr {
		return fmt.Sprintf("%s: REJECTED NotEnoughReplicas (isr=%d)", m, len(p.isr))
	}
	p.logs[p.leader] = append(p.logs[p.leader], m)
	if acks == "1" {
		p.acked = append(p.acked, m)
		return m + ": acked by leader only"
	}
	p.pending = append(p.pending, m)
	p.advance()
	if indexOf(p.acked, m) >= 0 {
		return m + ": acked, isr=" + p.isrNames()
	}
	return m + ": waiting for ISR " + p.isrNames()
}

func (p *Partition) fetch(f int) { // follower f copies the leader log
	if p.alive[f] && p.leader >= 0 {
		p.logs[f] = append([]string{}, p.logs[p.leader]...)
		p.advance()
	}
}

func (p *Partition) advance() {
	h, keep := p.hw(), []string{}
	for _, m := range p.pending {
		if indexOf(p.logs[p.leader], m) < h {
			p.acked = append(p.acked, m)
		} else {
			keep = append(keep, m)
		}
	}
	p.pending = keep
}

func (p *Partition) shrink(b int) {
	keep := []int{}
	for _, x := range p.isr {
		if x != b {
			keep = append(keep, x)
		}
	}
	p.isr = keep
}

func (p *Partition) crash(b int) string {
	p.alive[b] = false
	p.shrink(b)
	if b != p.leader {
		return NAMES[b] + " crashed, isr=" + p.isrNames()
	}
	cand, how := []int{}, "clean"
	for _, x := range p.isr {
		if p.alive[x] {
			cand = append(cand, x)
		}
	}
	if len(cand) == 0 && p.unclean {
		how = "UNCLEAN"
		for x := 0; x < 3; x++ {
			if p.alive[x] {
				cand = append(cand, x)
			}
		}
	}
	p.pending = nil // in-flight requests time out; the producer must retry
	if len(cand) == 0 {
		p.leader = -1
		return NAMES[b] + " (leader) crashed, no in-sync replica left: partition offline"
	}
	p.leader = cand[0]
	inIsr := false
	for _, x := range p.isr {
		inIsr = inIsr || x == p.leader
	}
	if !inIsr {
		p.isr = []int{p.leader}
	}
	return NAMES[b] + " (leader) crashed, " + how + " election -> leader " + NAMES[p.leader] + " log=[" + strings.Join(p.logs[p.leader], ",") + "]"
}

func (p *Partition) isrNames() string {
	n := []string{}
	for _, b := range p.isr {
		n = append(n, NAMES[b])
	}
	return "{" + strings.Join(n, ",") + "}"
}

func (p *Partition) report() {
	if p.leader < 0 {
		fmt.Printf("  acked=%d, none readable: partition unavailable until b1, the last in-sync replica, returns\\n", len(p.acked))
		return
	}
	log := p.logs[p.leader]
	lost := []string{}
	for _, m := range p.acked {
		if indexOf(log, m) < 0 {
			lost = append(lost, m)
		}
	}
	tail := ""
	if len(lost) > 0 {
		tail = " [" + strings.Join(lost, ",") + "]"
	}
	fmt.Printf("  acked=%d lost acked=%d%s final log=[%s]\\n", len(p.acked), len(lost), tail, strings.Join(log, ","))
}

func main() {
	fmt.Println("== 1. acks=1: leader acknowledges before followers copy ==")
	p := NewPartition(1, false)
	for _, m := range []string{"m1", "m2", "m3"} {
		p.produce(m, "1")
	}
	p.fetch(1)
	p.fetch(2)
	fmt.Println("  " + p.produce("m4", "1"))
	fmt.Println("  " + p.produce("m5", "1"))
	fmt.Printf("  leader log end=%d high watermark=%d (consumers can read 3)\\n", len(p.logs[0]), p.hw())
	fmt.Println("  " + p.crash(0))
	p.report()

	fmt.Println("== 2. acks=all, min.insync.replicas=2: same crash ==")
	p = NewPartition(2, false)
	for _, m := range []string{"m1", "m2", "m3"} {
		p.produce(m, "all")
	}
	p.fetch(1)
	p.fetch(2)
	fmt.Println("  " + p.produce("m4", "all"))
	fmt.Println("  " + p.produce("m5", "all"))
	fmt.Println("  " + p.crash(0))
	fmt.Println("  producer retries m4, m5 on the new leader:")
	p.produce("m4", "all")
	p.produce("m5", "all")
	p.fetch(2)
	p.report()

	cases := []struct {
		minIsr  int
		unclean bool
	}{{2, false}, {1, false}, {1, true}}
	for _, c := range cases {
		fmt.Printf("== 3. slow follower, then two crashes: min.insync.replicas=%d unclean.leader.election=%t ==\\n", c.minIsr, c.unclean)
		p = NewPartition(c.minIsr, c.unclean)
		p.produce("m1", "all")
		p.fetch(1)
		p.fetch(2)
		p.shrink(2) // b3 stops fetching (slow disk) and drops out of the ISR
		for _, m := range []string{"m2", "m3", "m4"} {
			p.produce(m, "all")
			p.fetch(1)
		}
		fmt.Println("  b3 fell behind, isr=" + p.isrNames() + ", b3 log=[" + strings.Join(p.logs[2], ",") + "]")
		fmt.Println("  " + p.crash(1))
		fmt.Println("  " + p.produce("m5", "all"))
		fmt.Println("  " + p.crash(0))
		p.report()
	}

	fmt.Println("== 4. capacity estimate ==")
	var msgs, nbytes, rf, days, brokerMBs, partMBs int64 = 1000000, 1000, 3, 7, 200, 10
	ingress := msgs * nbytes / 1000000
	disk := ingress * rf
	brokers := (disk*10 + brokerMBs*6 - 1) / (brokerMBs * 6) // keep each broker at 60% of its write budget
	storageGB := ingress * 86400 * days * rf / 1000
	fmt.Printf("  ingress %d MB/s, disk writes with RF=%d: %d MB/s, replication traffic %d MB/s\\n", ingress, rf, disk, disk-ingress)
	fmt.Printf("  brokers at 60%% of %d MB/s: %d, storage for %d days: %d GB (%d GB per broker)\\n", brokerMBs, brokers, days, storageGB, storageGB/brokers)
	fmt.Printf("  partitions at %d MB/s each: at least %d (also the max useful consumers per group)\\n", partMBs, (ingress+partMBs-1)/partMBs)
}` },
          { tech: "java", code: `// One replicated partition (3 brokers), simulated in-process: acks, ISR,
// high watermark, min.insync.replicas and unclean leader election.
import java.util.ArrayList;
import java.util.List;

public class Main {
    static final String[] NAMES = {"b1", "b2", "b3"};

    static class Partition {
        List<List<String>> logs = new ArrayList<>();
        boolean[] alive = {true, true, true};
        List<Integer> isr = new ArrayList<>(List.of(0, 1, 2));
        int leader = 0, minIsr;
        boolean unclean;
        List<String> pending = new ArrayList<>(), acked = new ArrayList<>();

        Partition(int minIsr, boolean unclean) {
            this.minIsr = minIsr;
            this.unclean = unclean;
            for (int i = 0; i < 3; i++) logs.add(new ArrayList<>());
        }

        int hw() { // high watermark: highest offset every ISR member has
            if (leader < 0) return 0;
            int h = logs.get(leader).size();
            for (int b : isr) h = Math.min(h, logs.get(b).size());
            return h;
        }

        String produce(String m, String acks) {
            if (leader < 0) return m + ": partition OFFLINE";
            if (acks.equals("all") && isr.size() < minIsr) return m + ": REJECTED NotEnoughReplicas (isr=" + isr.size() + ")";
            logs.get(leader).add(m);
            if (acks.equals("1")) { acked.add(m); return m + ": acked by leader only"; }
            pending.add(m);
            advance();
            return acked.contains(m) ? m + ": acked, isr=" + isrNames() : m + ": waiting for ISR " + isrNames();
        }

        void fetch(int f) { // follower f copies the leader log
            if (alive[f] && leader >= 0) { logs.set(f, new ArrayList<>(logs.get(leader))); advance(); }
        }

        void advance() {
            int h = hw();
            List<String> keep = new ArrayList<>();
            for (String m : pending) { if (logs.get(leader).indexOf(m) < h) acked.add(m); else keep.add(m); }
            pending = keep;
        }

        void shrink(int b) { isr.remove(Integer.valueOf(b)); }

        String crash(int b) {
            alive[b] = false;
            shrink(b);
            if (b != leader) return NAMES[b] + " crashed, isr=" + isrNames();
            List<Integer> cand = new ArrayList<>();
            String how = "clean";
            for (int x : isr) if (alive[x]) cand.add(x);
            if (cand.isEmpty() && unclean) { how = "UNCLEAN"; for (int x = 0; x < 3; x++) if (alive[x]) cand.add(x); }
            pending = new ArrayList<>(); // in-flight requests time out; the producer must retry
            if (cand.isEmpty()) { leader = -1; return NAMES[b] + " (leader) crashed, no in-sync replica left: partition offline"; }
            leader = cand.get(0);
            if (!isr.contains(leader)) isr = new ArrayList<>(List.of(leader));
            return NAMES[b] + " (leader) crashed, " + how + " election -> leader " + NAMES[leader] + " log=[" + String.join(",", logs.get(leader)) + "]";
        }

        String isrNames() {
            List<String> n = new ArrayList<>();
            for (int b : isr) n.add(NAMES[b]);
            return "{" + String.join(",", n) + "}";
        }

        void report() {
            if (leader < 0) { System.out.println("  acked=" + acked.size() + ", none readable: partition unavailable until b1, the last in-sync replica, returns"); return; }
            List<String> log = logs.get(leader), lost = new ArrayList<>();
            for (String m : acked) if (!log.contains(m)) lost.add(m);
            String tail = lost.isEmpty() ? "" : " [" + String.join(",", lost) + "]";
            System.out.println("  acked=" + acked.size() + " lost acked=" + lost.size() + tail + " final log=[" + String.join(",", log) + "]");
        }
    }

    public static void main(String[] args) {
        System.out.println("== 1. acks=1: leader acknowledges before followers copy ==");
        Partition p = new Partition(1, false);
        for (String m : List.of("m1", "m2", "m3")) p.produce(m, "1");
        p.fetch(1); p.fetch(2);
        System.out.println("  " + p.produce("m4", "1"));
        System.out.println("  " + p.produce("m5", "1"));
        System.out.println("  leader log end=" + p.logs.get(0).size() + " high watermark=" + p.hw() + " (consumers can read 3)");
        System.out.println("  " + p.crash(0));
        p.report();

        System.out.println("== 2. acks=all, min.insync.replicas=2: same crash ==");
        p = new Partition(2, false);
        for (String m : List.of("m1", "m2", "m3")) p.produce(m, "all");
        p.fetch(1); p.fetch(2);
        System.out.println("  " + p.produce("m4", "all"));
        System.out.println("  " + p.produce("m5", "all"));
        System.out.println("  " + p.crash(0));
        System.out.println("  producer retries m4, m5 on the new leader:");
        p.produce("m4", "all"); p.produce("m5", "all"); p.fetch(2);
        p.report();

        int[] minIsrs = {2, 1, 1};
        boolean[] uncleans = {false, false, true};
        for (int c = 0; c < 3; c++) {
            System.out.println("== 3. slow follower, then two crashes: min.insync.replicas=" + minIsrs[c] + " unclean.leader.election=" + uncleans[c] + " ==");
            p = new Partition(minIsrs[c], uncleans[c]);
            p.produce("m1", "all"); p.fetch(1); p.fetch(2);
            p.shrink(2); // b3 stops fetching (slow disk) and drops out of the ISR
            for (String m : List.of("m2", "m3", "m4")) { p.produce(m, "all"); p.fetch(1); }
            System.out.println("  b3 fell behind, isr=" + p.isrNames() + ", b3 log=[" + String.join(",", p.logs.get(2)) + "]");
            System.out.println("  " + p.crash(1));
            System.out.println("  " + p.produce("m5", "all"));
            System.out.println("  " + p.crash(0));
            p.report();
        }

        System.out.println("== 4. capacity estimate ==");
        long msgs = 1000000, nbytes = 1000, rf = 3, days = 7, brokerMBs = 200, partMBs = 10;
        long ingress = msgs * nbytes / 1000000, disk = ingress * rf;
        long brokers = (disk * 10 + brokerMBs * 6 - 1) / (brokerMBs * 6); // keep each broker at 60% of its write budget
        long storageGB = ingress * 86400 * days * rf / 1000;
        System.out.println("  ingress " + ingress + " MB/s, disk writes with RF=" + rf + ": " + disk + " MB/s, replication traffic " + (disk - ingress) + " MB/s");
        System.out.println("  brokers at 60% of " + brokerMBs + " MB/s: " + brokers + ", storage for " + days + " days: " + storageGB + " GB (" + (storageGB / brokers) + " GB per broker)");
        System.out.println("  partitions at " + partMBs + " MB/s each: at least " + ((ingress + partMBs - 1) / partMBs) + " (also the max useful consumers per group)");
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How do you design for high availability?`,
    difficulty: "medium",
    seoDescription: `High availability from zero: nines and downtime budgets, serial vs redundant components, failover time, zone failures and N+1 capacity, with verified math.`,
    description: `**Question presented to candidate:**
"Our checkout service needs to be highly available. Walk me through how you would design it, how you would measure availability, and where the downtime actually comes from."

**What a strong answer should cover:**
- A measurable target: availability as a fraction of successful requests or time, the **nines** and the downtime **error budget** each one allows (99.9% is about 8.8 hours a year, 99.99% about 53 minutes)
- The arithmetic: components in **series** multiply (the chain is worse than its weakest part); **redundant** copies in parallel raise availability only if their failures are **independent**
- Removing **single points of failure** across every tier, spreading copies across **failure domains** (availability zones, regions), and sizing **N+1** capacity so the survivors are not overloaded
- **Failover** is part of the design: detection time (health check interval times threshold), DNS TTL and promotion time are downtime on every failure
- Keeping failures small: timeouts, retries with backoff, circuit breakers, load shedding, graceful degradation, and safe deployments, which cause a large share of real outages

**Clarifying questions expected:**
- What availability target, measured how (successful requests, or minutes the service was up), and what does one minute of downtime cost?
- Which parts must stay up (take payment) and which can degrade (recommendations)?
- One region or several, and what data consistency does checkout need during a failover?

**Code / implementation expected:** Optional — availability arithmetic for a real topology; the example computes serial and parallel availability, failover cost, correlated zone failure and N+1 sizing.`,
    answer: `**Target Audience:** Beginners to reliability engineering — you know what a server, a load balancer and a database are; every reliability term is defined as we go.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). All component availabilities in the run are stated assumptions, not vendor SLAs; AWS health-check defaults are from the Amazon Route 53 Developer Guide, checked in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All numbers in the tables come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A wedding has one photographer, one caterer, one DJ and one venue. Each is very reliable: say each turns up 999 times out of 1,000. The wedding needs all four. The chance that everything works is 0.999 x 0.999 x 0.999 x 0.999, which is about 0.996: roughly four weddings in a thousand have something go wrong, four times worse than any single supplier.

Now hire two photographers who travel separately. The photos fail only if *both* fail to turn up: 1 in a million. But if both come in the same car and the car breaks down, you are back to one photographer. Redundancy only helps when the copies fail independently.

That is high availability in two paragraphs: chains multiply failures, independent copies cancel them, and shared fate (the same car, the same data centre, the same bad deploy) quietly undoes the copies.

📌 **Interview term: availability** — the fraction of time, or of requests, for which the service works correctly. Request-based availability (successful requests divided by total requests) is usually what users feel; time-based is easier to reason about. Pick one and say which.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the target, and how is it measured? | 99.9% and 99.99% lead to very different designs; request-based vs time-based changes what counts as down |
| What does a minute of downtime cost? | Justifies (or not) the cost of a second region |
| Which features must work and which can degrade? | Lets you protect checkout while shedding recommendations |
| One region or several? Who are the users? | Decides whether a region outage is in scope |
| What consistency does the data need during failover? | Asynchronous replicas fail over fast but can lose recent writes |
| How often do we deploy? | Changes are a leading cause of outages, so deploy safety is part of HA |

## 3. Nines and Error Budgets

📌 **Interview term: the nines** — shorthand for availability targets: "three nines" is 99.9%, "four nines" 99.99%.

📌 **Interview term: SLO and error budget** — a **service level objective** is the target you commit to internally (for example 99.95% of checkout requests succeed over 30 days). The **error budget** is what the target allows to fail; while budget remains you can ship faster, and when it is spent you slow down and fix reliability. An **SLA** is the contractual promise to customers, usually looser than the SLO.

From the run (a year is 365 days, a month 30 days):

| Target | Downtime per year | Per 30 days |
| :--- | ---: | ---: |
| 99% | 5,256.0 min (about 3.65 days) | 432.0 min |
| 99.9% | 525.6 min (about 8.8 hours) | 43.2 min |
| 99.95% | 262.8 min | 21.6 min |
| 99.99% | 52.6 min | 4.3 min |
| 99.999% | 5.3 min | 0.4 min |

Look at the last two rows. At 99.99% you have 4.3 minutes a month: a single failover that takes 5 minutes blows the budget. At five nines, no human can even be paged in time; everything must be automatic. The companion page on [latency numbers and availability targets](/interview-question/what-latency-numbers-and-availability-targets-should-every-engineer-know) has more reference numbers.

## 4. Serial Chains: Why Every Hop Costs You

A request to checkout passes through DNS, a load balancer, an app server, a cache and a database. If any one is down, the request fails, so their availabilities **multiply**.

📌 **Interview term: serial dependency** — a component the request cannot succeed without. The availability of a chain is the product of its parts.

📌 **Interview term: single point of failure (SPOF)** — a component with no redundant copy, whose failure alone takes the service down.

Assume one copy each: DNS 99.99%, load balancer 99.99%, app 99.9%, database 99.95%, cache 99.9%. The run gives:

- the chain: **99.730251%**, or **1,417.8 minutes** (about 23.6 hours) of downtime a year;
- the weakest part alone (the app, 99.9%) would be 525.6 minutes.

The chain is worse than every one of its parts. Every hard dependency you add (a new microservice called synchronously, a feature-flag service, an auth service) multiplies in. That is the first lever of HA: **fewer hard dependencies**, and making the rest soft (cache the answer, use a default, skip the feature).

## 5. Redundancy: Independent Copies in Parallel

📌 **Interview term: redundancy** — running more than one copy of a component so that the service survives one of them failing. For independent copies with availability \`a\`, the probability all \`n\` are down is \`(1 - a)^n\`.

From the run, with the app at 99.9% per copy:

| App copies | Availability | Downtime per year |
| :--- | ---: | ---: |
| 1 | 99.900000% | 525.6 min |
| 2 | 99.999900% | 31.54 s |
| 3 | 100.000000% (rounded) | 0.03 s |

These numbers are only true if copies fail **independently**, which they almost never fully do. That is the next section.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="High availability layout: a load balancer spreads traffic over app copies in three availability zones, with a database primary and a synchronous standby in different zones">
  <defs>
    <marker id="sd10q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="290" y="15" width="180" height="50" rx="10"/>
  <text class="d-text" x="380" y="46" text-anchor="middle">load balancer</text>
  <rect class="d-box-muted" x="20" y="105" width="220" height="180" rx="12"/>
  <text class="d-sub" x="36" y="130">zone A</text>
  <rect class="d-box-muted" x="270" y="105" width="220" height="180" rx="12"/>
  <text class="d-sub" x="474" y="130" text-anchor="end">zone B</text>
  <rect class="d-box-muted" x="520" y="105" width="220" height="180" rx="12"/>
  <text class="d-sub" x="724" y="130" text-anchor="end">zone C</text>
  <rect class="d-box" x="55" y="150" width="150" height="44" rx="8"/>
  <text class="d-text" x="130" y="177" text-anchor="middle">app x2</text>
  <rect class="d-box" x="305" y="150" width="150" height="44" rx="8"/>
  <text class="d-text" x="380" y="177" text-anchor="middle">app x2</text>
  <rect class="d-box" x="555" y="150" width="150" height="44" rx="8"/>
  <text class="d-text" x="630" y="177" text-anchor="middle">app x2</text>
  <rect class="d-box-accent" x="55" y="225" width="150" height="44" rx="8"/>
  <text class="d-text" x="130" y="252" text-anchor="middle">db primary</text>
  <rect class="d-box" x="305" y="225" width="150" height="44" rx="8"/>
  <text class="d-text" x="380" y="252" text-anchor="middle">db standby</text>
  <line class="d-edge" x1="330" y1="65" x2="140" y2="146" marker-end="url(#sd10q4-arrow)"/>
  <line class="d-edge" x1="380" y1="65" x2="380" y2="146" marker-end="url(#sd10q4-arrow)"/>
  <line class="d-edge" x1="430" y1="65" x2="620" y2="146" marker-end="url(#sd10q4-arrow)"/>
  <line class="d-edge-dashed" x1="205" y1="247" x2="301" y2="247" marker-end="url(#sd10q4-arrow)"/>
</svg>

Six app instances across three zones survive the loss of any one zone at peak; the database standby in a second zone takes over when the primary fails.

## 6. Correlated Failure: Failure Domains

📌 **Interview term: failure domain** — a set of components that fail together because they share something: a rack, a power feed, an **availability zone** (an isolated data centre or group of them in a cloud region), a region, a software version, a configuration file, a dependency.

📌 **Interview term: correlated failure** — several "redundant" copies failing at once because they share a failure domain.

The run puts the three app copies in one zone with zone availability 99.95% (an assumption):

| Placement | Availability | Downtime per year |
| :--- | ---: | ---: |
| 3 copies, 1 zone | 99.950000% | 262.8 min |
| 3 copies, 3 zones | 100.000000% (rounded) | 0.11 s |

The copies did nothing against a zone outage: the result equals the zone. Spreading them across zones brings back the benefit. The same logic applies to every shared thing: a bad deploy rolled out everywhere at once is a correlated failure across all zones, which is why [blue-green and canary deployments](/interview-question/what-are-blue-green-and-canary-deployments) are an availability technique, not just a release technique.

## 7. Failover Time Is Downtime

A standby only helps once traffic reaches it. Each failure costs **detection + redirection + promotion**.

📌 **Interview term: failover** — moving work from a failed component to a standby. **Automatic failover** removes the human from the loop; **RTO** (recovery time objective) is how long recovery may take, and **RPO** (recovery point objective) is how much recent data you may lose.

Detection is a health check repeated until a threshold is reached. Amazon Route 53 checks every 30 seconds by default (10 seconds with fast checks) and marks an endpoint unhealthy after 3 consecutive failures by default (Amazon Route 53 Developer Guide, how health checks determine health). So detection alone is up to 90 s, or 30 s with fast checks. The run assumes 4 primary-database failures a year, a 60 s DNS TTL and 30 s to promote the standby:

| Recovery | Seconds per failure | Seconds per year | Database availability |
| :--- | ---: | ---: | ---: |
| Manual restore (1 hour) | 3,600 | 14,400 | 99.954338% |
| Automatic, 30 s checks x 3 | 180 | 720 | 99.997717% |
| Automatic, 10 s checks x 3 | 120 | 480 | 99.998478% |

Faster detection is not free: AWS notes that lower thresholds can fail over when a server is only briefly overloaded. How systems decide a node is dead, and the trade-off between fast and false detection, is the subject of [how distributed systems detect node failures](/interview-question/how-do-distributed-systems-detect-node-failures).

**RPO matters too.** With asynchronous [database replication](/interview-question/what-is-database-replication) the standby may be a few seconds behind, so a failover can lose recent writes. Checkout usually wants a synchronous standby (RPO zero) in another zone, accepting a little extra write latency.

## 8. N+1: Capacity Is Part of Availability

If the survivors cannot carry the load, a failure becomes an overload, and an overloaded fleet often fails completely (timeouts, retries, more load).

📌 **Interview term: N+1 (and N+2)** — provisioning enough capacity that the service still meets peak load after losing one (or two) units, where a unit can be an instance or an entire zone.

From the run, with a peak of 1,200 requests per second and 400 per instance:

- 3 instances carry the peak; 4 survive the loss of one instance.
- To survive a whole zone of 3, the other two zones must carry the peak: 2 per zone, **6 instances**, 50% busy at peak, 75% busy after a zone loss.
- With only 4 instances spread 2/1/1, losing the zone with 2 leaves the other 2 at **150%** of capacity: an outage by overload.

Around capacity sit the protective patterns: timeouts and retries with backoff and jitter, the [circuit breaker](/interview-question/what-is-the-circuit-breaker-pattern) to stop calling a failing dependency, load shedding and [backpressure](/interview-question/what-is-backpressure-and-how-do-you-handle-it) to reject excess work early, and **graceful degradation** so checkout still works when recommendations are down.

📌 **Interview term: graceful degradation** — serving a reduced but useful experience when a dependency fails (hide recommendations, show cached prices) instead of failing the whole request.

## 9. Putting It Together

The redesigned system: app in 3 zones, a database standby with 10 s health checks, two cache nodes, and the same single DNS and load balancer services. The run gives **99.978379%**, about **113.6 minutes a year**. Of that, about 105 minutes come from the DNS and load-balancer assumptions (52.6 minutes each at 99.99%). After you make your own tiers redundant, the remaining downtime sits in shared infrastructure and in changes: deploys, configuration pushes and dependencies. The next steps are therefore:

1. **Safer changes**: canary releases, automated rollback, feature flags.
2. **Stateless app servers** so any instance can serve any request (see [stateless services and sessions](/interview-question/why-prefer-stateless-services-and-how-do-you-handle-sessions)).
3. **Multi-region** only if the target and the cost of an outage justify it: active-passive (a warm standby region) or active-active (both serve traffic, with harder data consistency, see [the CAP theorem](/interview-question/what-is-the-cap-theorem)).
4. **Practise failure**: game days and fault injection, so failover paths are tested before they are needed.

## 10. Verified: Running the Code

What the program computes: products for serial chains, \`1 - (1 - a)^n\` for independent copies, failover seconds converted to availability, a zone factor multiplied in for correlated placement, and ceiling divisions for capacity. Every input is an assumption written at the top of its section; change them and rerun.

The key formulas:

~~~js
const serial = (xs) => xs.reduce((p, x) => p * x, 1);
const parallel = (a, n) => 1 - Math.pow(1 - a, n);
const oneZone = zone * parallel(parts.app, 3), threeZones = parallel(zone * parts.app, 3);
~~~

Full output (identical in Node and Python):

~~~text
== 1. what each target allows ==
99%       5256.0 min/yr   432.0 min per 30 days
99.9%      525.6 min/yr    43.2 min per 30 days
99.95%     262.8 min/yr    21.6 min per 30 days
99.99%      52.6 min/yr     4.3 min per 30 days
99.999%      5.3 min/yr     0.4 min per 30 days

== 2. one copy of everything (serial chain) ==
dns x lb x app x db x cache = 99.730251% -> 1417.8 min/yr
weakest part alone: app 99.900000%; the chain is worse than every part

== 3. redundancy: independent copies in parallel ==
app x1 = 99.900000% -> 525.6 min/yr
app x2 = 99.999900% -> 31.54 s/yr
app x3 = 100.000000% -> 0.03 s/yr

== 4. a standby does not help until failover finishes ==
manual restore       3600 s per failover x 4 = 14400 s/yr -> db 99.954338%
health check 30s x3   180 s per failover x 4 =   720 s/yr -> db 99.997717%
health check 10s x3   120 s per failover x 4 =   480 s/yr -> db 99.998478%

== 5. correlated failure: three app copies in one zone vs three zones ==
3 copies, 1 zone  = 99.950000% -> 262.8 min/yr
3 copies, 3 zones = 100.000000% -> 0.11 s/yr

== 6. N+1 capacity: surviving a loss without overload ==
peak 1200 rps, 400 rps per instance: 3 needed, 4 to survive one instance
survive a whole zone: 2 per zone x 3 zones = 6 instances, 50% busy at peak
same 6 instances if one zone dies: 75% busy; with only 4 instances spread 2/1/1, losing the 2-instance zone puts the other 2 at 150% of capacity

== 7. the redesigned system ==
dns x lb x app(3 zones) x db(10s checks) x cache x2 = 99.978379% -> 113.6 min/yr
~~~

## 11. Edge Cases Worth Knowing

- **Partial failures.** A server that is up but slow can hurt more than one that is down, because the load balancer keeps sending it traffic. Health checks should test real work, and timeouts must be shorter than the client's patience.
- **Retry storms.** When a dependency recovers, every client retrying at once can knock it down again; use exponential backoff with jitter and retry budgets.
- **Shared configuration.** A single bad config push reaches every zone; roll configuration out in stages like code.
- **Failover that is never tested** tends not to work when needed (expired credentials, a full disk on the standby, missing capacity).
- **Dependencies with lower availability than your target.** You cannot be 99.99% on top of a hard dependency that is 99.9%; make it soft or get it fixed.

## Common Pitfalls

- **Quoting nines without a measurement.** Say what counts as down: failed requests, latency above a threshold, or an unreachable endpoint.
- **Adding copies in one zone.** The run showed three copies in one zone are exactly as available as the zone: 99.95%.
- **Forgetting failover time.** A standby with manual restore still cost 4 hours a year in the run; automatic failover cut that to 12 minutes with 30 s checks and 8 with 10 s checks.
- **No headroom.** 4 instances spread 2/1/1 met N+1 on paper and ran at 150% after a zone loss.
- **Multiplying in dependencies.** Each synchronous call is another factor in the chain; the 5-part chain fell to 99.73%.
- **Ignoring deploys.** Changes cause many outages; release safety belongs in an HA answer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Target first:</strong> <span style="color:#f0e2c8;">I would agree a measurable target, say 99.95% of checkout requests succeeding over 30 days, which allows 21.6 minutes a month. At 99.99% it is 4.3 minutes, so any manual step in recovery is already too slow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The arithmetic:</strong> <span style="color:#f0e2c8;">Hard dependencies in series multiply: five single components at 99.9 to 99.99% gave 99.73%, worse than any one of them. Independent copies in parallel fail only together, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 - (1 - a)^n</code>, so two app copies at 99.9% give 99.9999%.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Independence:</strong> <span style="color:#f0e2c8;">Copies only help if they fail independently, so I spread them across <strong style="color:#ffca28;">failure domains</strong>: three app copies in one 99.95% zone were exactly 99.95% in my run. Same for deploys and config, which I roll out in stages.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Failover and capacity:</strong> <span style="color:#f0e2c8;">Every failure costs detection plus DNS plus promotion: with 30 s health checks and 3 failures to trip, about 180 s per failover. And survivors must carry the load: for 1,200 rps at 400 per instance I need 6 instances over 3 zones, not 4.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Contain failures:</strong> <span style="color:#f0e2c8;">Timeouts, retries with backoff and jitter, circuit breakers, load shedding and graceful degradation keep a failing dependency from taking checkout down. Then test it with game days, because untested failover is usually broken failover.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is 100% availability a sensible goal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Users' own networks and devices fail far more than that, each extra nine costs much more than the last, and a 100% target leaves no error budget for change. I would pick the target from the cost of downtime and spend the budget on shipping.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Active-active or active-passive across regions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Active-passive is simpler: one region serves, the other is warm and takes over, with some data loss if replication is asynchronous. Active-active serves from both, gives instant failover and lower latency, but needs conflict handling or partitioned ownership of data. For checkout I would start active-passive unless the target requires more.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you choose health-check thresholds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It trades detection time against false failovers. Route 53 defaults to 30 s checks and 3 failures, up to 90 s to detect; 10 s checks cut it to 30 s but can flip during a brief overload. I would check a real dependency path, keep thresholds of 2 to 3, and make failover idempotent and reversible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the remaining downtime come from after redundancy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mostly from shared things: the DNS and load balancer layer, configuration and deploys, and dependencies. In my model about 105 of the remaining 113.6 minutes a year came from DNS and the load balancer assumptions, so the next gains are safer changes and removing hard dependencies.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you measure availability in production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As an SLI from real traffic: successful requests divided by valid requests at the load balancer, plus synthetic probes from outside to catch cases where no requests arrive at all. Then alert on error-budget burn rate rather than on every blip.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Availability | Fraction of time or requests the service works correctly |
| The nines | Availability targets written as 99.9%, 99.99% and so on |
| SLO and error budget | Internal target, and the failures it allows |
| Serial dependency | Component a request needs; chain availability is the product |
| Single point of failure | Component with no redundant copy |
| Redundancy | More than one copy so one failure is survivable |
| Failure domain | Things that fail together: rack, zone, region, version, config |
| Correlated failure | Redundant copies failing together through a shared domain |
| Failover, RTO, RPO | Moving to a standby; allowed recovery time; allowed data loss |
| N+1 | Enough capacity to carry peak after losing one unit |
| Graceful degradation | Serving a reduced experience instead of failing |

**Conclusion:** High availability is arithmetic plus discipline. The arithmetic says chains multiply (five single parts gave 99.73%, about 23.6 hours a year), independent copies cancel failures, shared failure domains cancel the copies (three copies in one zone were just 99.95%), every failover costs detection and promotion time, and survivors need headroom (6 instances over 3 zones, not 4). The discipline is everything around it: fewer hard dependencies, staged deploys and config, automatic and tested failover, and graceful degradation. Start from a measured target, show where the downtime comes from, and design to remove the biggest piece first.`,
    examples: [
      {
        label: `Availability arithmetic: serial chains, redundancy, failover time, correlated zone failure and N+1 capacity`,
        variants: [
          { tech: "node", code: `// Availability arithmetic for a web service: nines, serial chains, redundancy,
// failover time, correlated (same-zone) failures and N+1 capacity.
// All component numbers are assumptions for the example, not vendor SLAs.
const YEAR_MIN = 365 * 24 * 60, MONTH_MIN = 30 * 24 * 60;
const pct = (a) => (a * 100).toFixed(6) + "%";
const down = (a) => { const m = YEAR_MIN * (1 - a); return m >= 1 ? m.toFixed(1) + " min/yr" : (m * 60).toFixed(2) + " s/yr"; };
const serial = (xs) => xs.reduce((p, x) => p * x, 1);
const parallel = (a, n) => 1 - Math.pow(1 - a, n);

console.log("== 1. what each target allows ==");
for (const [label, a] of [["99%", 0.99], ["99.9%", 0.999], ["99.95%", 0.9995], ["99.99%", 0.9999], ["99.999%", 0.99999]])
  console.log(label.padEnd(8) + " " + (YEAR_MIN * (1 - a)).toFixed(1).padStart(7) + " min/yr  " + (MONTH_MIN * (1 - a)).toFixed(1).padStart(6) + " min per 30 days");

console.log("");
console.log("== 2. one copy of everything (serial chain) ==");
const parts = { dns: 0.9999, lb: 0.9999, app: 0.999, db: 0.9995, cache: 0.999 };
const chain = serial(Object.values(parts));
console.log("dns x lb x app x db x cache = " + pct(chain) + " -> " + down(chain));
console.log("weakest part alone: app " + pct(parts.app) + "; the chain is worse than every part");

console.log("");
console.log("== 3. redundancy: independent copies in parallel ==");
for (const n of [1, 2, 3]) console.log("app x" + n + " = " + pct(parallel(parts.app, n)) + " -> " + down(parallel(parts.app, n)));

console.log("");
console.log("== 4. a standby does not help until failover finishes ==");
const FAILS = 4; // primary database failures per year (assumption)
for (const [name, detect, ttl, promote] of [["manual restore", 0, 0, 3600], ["health check 30s x3", 90, 60, 30], ["health check 10s x3", 30, 60, 30]]) {
  const sec = FAILS * (detect + ttl + promote), a = 1 - sec / (YEAR_MIN * 60);
  console.log(name.padEnd(20) + " " + String(detect + ttl + promote).padStart(4) + " s per failover x " + FAILS + " = " + String(sec).padStart(5) + " s/yr -> db " + pct(a));
}

console.log("");
console.log("== 5. correlated failure: three app copies in one zone vs three zones ==");
const zone = 0.9995;
const oneZone = zone * parallel(parts.app, 3), threeZones = parallel(zone * parts.app, 3);
console.log("3 copies, 1 zone  = " + pct(oneZone) + " -> " + down(oneZone));
console.log("3 copies, 3 zones = " + pct(threeZones) + " -> " + down(threeZones));

console.log("");
console.log("== 6. N+1 capacity: surviving a loss without overload ==");
const PEAK = 1200, PER = 400, ZONES = 3;
const base = Math.ceil(PEAK / PER);
console.log("peak " + PEAK + " rps, " + PER + " rps per instance: " + base + " needed, " + (base + 1) + " to survive one instance");
const perZone = Math.ceil(PEAK / (PER * (ZONES - 1)));
console.log("survive a whole zone: " + perZone + " per zone x " + ZONES + " zones = " + perZone * ZONES + " instances, " + Math.round((100 * PEAK) / (perZone * ZONES * PER)) + "% busy at peak");
console.log("same 6 instances if one zone dies: " + Math.round((100 * PEAK) / (perZone * (ZONES - 1) * PER)) + "% busy; with only " + (base + 1) + " instances spread 2/1/1, losing the 2-instance zone puts the other 2 at " + Math.round((100 * PEAK) / ((base - 1) * PER)) + "% of capacity");

console.log("");
console.log("== 7. the redesigned system ==");
const dbHA = 1 - (FAILS * 120) / (YEAR_MIN * 60);
const total = serial([parts.dns, parts.lb, threeZones, dbHA, parallel(parts.cache, 2)]);
console.log("dns x lb x app(3 zones) x db(10s checks) x cache x2 = " + pct(total) + " -> " + down(total));` },
          { tech: "python", code: `# Availability arithmetic for a web service: nines, serial chains, redundancy,
# failover time, correlated (same-zone) failures and N+1 capacity.
# All component numbers are assumptions for the example, not vendor SLAs.
import math

YEAR_MIN, MONTH_MIN = 365 * 24 * 60, 30 * 24 * 60


def pct(a):
    return f"{a * 100:.6f}%"


def down(a):
    m = YEAR_MIN * (1 - a)
    return f"{m:.1f} min/yr" if m >= 1 else f"{m * 60:.2f} s/yr"


def serial(xs):
    p = 1
    for x in xs:
        p *= x
    return p


def parallel(a, n):
    return 1 - math.pow(1 - a, n)


print("== 1. what each target allows ==")
for label, a in [("99%", 0.99), ("99.9%", 0.999), ("99.95%", 0.9995), ("99.99%", 0.9999), ("99.999%", 0.99999)]:
    print(label.ljust(8) + " " + f"{YEAR_MIN * (1 - a):.1f}".rjust(7) + " min/yr  " + f"{MONTH_MIN * (1 - a):.1f}".rjust(6) + " min per 30 days")

print("")
print("== 2. one copy of everything (serial chain) ==")
parts = {"dns": 0.9999, "lb": 0.9999, "app": 0.999, "db": 0.9995, "cache": 0.999}
chain = serial(parts.values())
print("dns x lb x app x db x cache = " + pct(chain) + " -> " + down(chain))
print("weakest part alone: app " + pct(parts["app"]) + "; the chain is worse than every part")

print("")
print("== 3. redundancy: independent copies in parallel ==")
for n in [1, 2, 3]:
    print("app x" + str(n) + " = " + pct(parallel(parts["app"], n)) + " -> " + down(parallel(parts["app"], n)))

print("")
print("== 4. a standby does not help until failover finishes ==")
FAILS = 4  # primary database failures per year (assumption)
for name, detect, ttl, promote in [("manual restore", 0, 0, 3600), ("health check 30s x3", 90, 60, 30), ("health check 10s x3", 30, 60, 30)]:
    sec = FAILS * (detect + ttl + promote)
    a = 1 - sec / (YEAR_MIN * 60)
    print(name.ljust(20) + " " + str(detect + ttl + promote).rjust(4) + " s per failover x " + str(FAILS) + " = " + str(sec).rjust(5) + " s/yr -> db " + pct(a))

print("")
print("== 5. correlated failure: three app copies in one zone vs three zones ==")
zone = 0.9995
one_zone = zone * parallel(parts["app"], 3)
three_zones = parallel(zone * parts["app"], 3)
print("3 copies, 1 zone  = " + pct(one_zone) + " -> " + down(one_zone))
print("3 copies, 3 zones = " + pct(three_zones) + " -> " + down(three_zones))

print("")
print("== 6. N+1 capacity: surviving a loss without overload ==")
PEAK, PER, ZONES = 1200, 400, 3
base = math.ceil(PEAK / PER)
print("peak " + str(PEAK) + " rps, " + str(PER) + " rps per instance: " + str(base) + " needed, " + str(base + 1) + " to survive one instance")
per_zone = math.ceil(PEAK / (PER * (ZONES - 1)))
print("survive a whole zone: " + str(per_zone) + " per zone x " + str(ZONES) + " zones = " + str(per_zone * ZONES) + " instances, " + str(round(100 * PEAK / (per_zone * ZONES * PER))) + "% busy at peak")
print("same 6 instances if one zone dies: " + str(round(100 * PEAK / (per_zone * (ZONES - 1) * PER))) + "% busy; with only " + str(base + 1) + " instances spread 2/1/1, losing the 2-instance zone puts the other 2 at " + str(round(100 * PEAK / ((base - 1) * PER))) + "% of capacity")

print("")
print("== 7. the redesigned system ==")
db_ha = 1 - (FAILS * 120) / (YEAR_MIN * 60)
total = serial([parts["dns"], parts["lb"], three_zones, db_ha, parallel(parts["cache"], 2)])
print("dns x lb x app(3 zones) x db(10s checks) x cache x2 = " + pct(total) + " -> " + down(total))` },
        ],
      },
    ],
  },
  {
    title: `What are blue-green and canary deployments?`,
    difficulty: "medium",
    seoDescription: `Blue-green vs canary vs rolling deployments explained, with a verified simulation of blast radius, rollback speed and why canary gates need statistics.`,
    description: `**Question presented to candidate:**
"What are blue-green and canary deployments? How do they differ from a normal rolling update, and when would you pick each one?"

**What a strong answer should cover:**
- **Blue-green**: two full environments; deploy and test the idle one, switch all traffic at once, switch back to roll back. Fast, all-or-nothing, needs double capacity during the switch
- **Canary**: send a small, growing share of real traffic to the new version, compare its metrics with the old version (the **control**), and promote or roll back automatically. Small **blast radius**, slower rollout
- **Rolling update** as the baseline (replace instances a few at a time, as a Kubernetes Deployment does by default) and why its rollback is slow and its mixed fleet still hits everyone
- What makes canaries work: **sticky** assignment of users, enough traffic for a statistically meaningful comparison, automated analysis gates, and metrics that capture the user experience (errors, latency, business KPIs)
- The parts that break both: database schema changes (expand and contract), long-lived connections and sessions, background jobs and queues, and why feature flags complement deployments

**Code / implementation expected:** Optional — a simulation of a bad release under blue-green, rolling and canary, counting failed requests before rollback; the example does that, and shows a naive canary gate blocking a good release.`,
    answer: `**Target Audience:** Beginners to release engineering — you know what a server, a load balancer and a deploy are; every term is defined as we go.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Kubernetes defaults are from the Kubernetes Deployment API reference; the canary definition is from the Google SRE Workbook, chapter 16, checked in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The numbers in section 5 come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A restaurant changes its menu. There are three ways to do it.

1. **Swap the whole menu at Friday dinner.** If the new curry is terrible, every table that night gets it, and the chef has to switch the kitchen back mid-service.
2. **Build a second kitchen.** Set up the new menu in a kitchen next door, cook a few test dishes, then send all waiters there at once. If something is wrong, send them back to the old kitchen in one instruction. It works, but you pay for two kitchens.
3. **Offer the new curry to one table in a hundred.** Watch whether those diners send food back more often than everyone else. If they do, stop serving it; only a handful of people had a bad meal. If they do not, offer it to five tables in a hundred, then a quarter of the room, then everyone.

Option 2 is **blue-green**. Option 3 is a **canary**. Option 1 is what happens without either, and it is how a small bug becomes a big outage.

📌 **Interview term: blast radius** — how many users or requests a failure affects before it is contained. Deployment strategies are mostly ways to shrink it.

## 2. Blue-Green Deployments

📌 **Interview term: blue-green deployment** — keep two production environments, "blue" (live) and "green" (idle). Deploy the new version to green, test it there, then switch the router or load balancer so all traffic goes to green. Blue stays running for a while, so rolling back is switching back.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="Blue green: the router sends all traffic to the blue environment, the green environment holds the new version and receives traffic only after the switch">
  <defs>
    <marker id="sd10q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="100" width="140" height="60" rx="10"/>
  <text class="d-text" x="100" y="136" text-anchor="middle">users</text>
  <rect class="d-box-accent" x="250" y="100" width="150" height="60" rx="10"/>
  <text class="d-text" x="325" y="136" text-anchor="middle">router</text>
  <line class="d-edge" x1="170" y1="130" x2="246" y2="130" marker-end="url(#sd10q5-arrow)"/>
  <rect class="d-box" x="500" y="30" width="220" height="70" rx="10"/>
  <text class="d-text" x="610" y="60" text-anchor="middle">blue: v1</text>
  <text class="d-sub" x="610" y="84" text-anchor="middle">100% of traffic</text>
  <rect class="d-box-muted" x="500" y="160" width="220" height="70" rx="10"/>
  <text class="d-text" x="610" y="190" text-anchor="middle">green: v2</text>
  <text class="d-sub" x="610" y="214" text-anchor="middle">tested, idle</text>
  <line class="d-edge-accent" x1="400" y1="118" x2="496" y2="70" marker-end="url(#sd10q5-arrow)"/>
  <line class="d-edge-dashed" x1="400" y1="142" x2="496" y2="190" marker-end="url(#sd10q5-arrow)"/>
</svg>

The switch moves the solid arrow to green in one step; the dashed arrow is the path traffic takes after it.

**Strengths:** the switch and the rollback are near-instant; green can be tested in production conditions before users see it; there is never a mixed fleet of versions serving traffic at the same time.

**Weaknesses:** double capacity during the switch; **all** users move at once, so a bug that only shows under real traffic hits everyone until someone notices; and the database is usually shared, so a schema change has to work for both versions (section 6).

How the switch is done: change the load balancer target group, swap a Kubernetes Service selector, or change DNS (slowest, because clients cache records for the TTL).

## 3. Canary Deployments

📌 **Interview term: canary deployment** — release the new version to a small share of real traffic, compare it with the old version, and either increase the share step by step or roll back. The Google SRE Workbook (chapter 16, "Canarying Releases") defines canarying as a partial and time-limited deployment of a change in a service, and its evaluation, which decides whether the rollout continues. The name comes from canaries that miners carried to detect gas before it harmed people.

📌 **Interview term: control group** — the traffic still on the old version during the canary. You compare canary against control over the *same* minutes, so time-of-day effects and unrelated incidents affect both equally.

📌 **Interview term: sticky assignment** — choosing canary users by a hash of a stable id (user id, session id) so the same user always sees the same version. Without it a user flips between versions on every request, which breaks sessions and makes per-user metrics meaningless.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="Canary: the router sends 95 percent of traffic to v1 and 5 percent to v2, and an analysis step compares their metrics">
  <defs>
    <marker id="sd10q5-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="100" width="150" height="60" rx="10"/>
  <text class="d-text" x="105" y="136" text-anchor="middle">router</text>
  <rect class="d-box" x="280" y="30" width="190" height="64" rx="10"/>
  <text class="d-text" x="375" y="58" text-anchor="middle">v1 control</text>
  <text class="d-sub" x="375" y="80" text-anchor="middle">95% of users</text>
  <rect class="d-box-accent" x="280" y="166" width="190" height="64" rx="10"/>
  <text class="d-text" x="375" y="194" text-anchor="middle">v2 canary</text>
  <text class="d-sub" x="375" y="216" text-anchor="middle">5% of users</text>
  <line class="d-edge" x1="180" y1="118" x2="276" y2="64" marker-end="url(#sd10q5-arrow2)"/>
  <line class="d-edge-accent" x1="180" y1="142" x2="276" y2="196" marker-end="url(#sd10q5-arrow2)"/>
  <rect class="d-box-muted" x="560" y="98" width="170" height="64" rx="10"/>
  <text class="d-text" x="645" y="126" text-anchor="middle">analysis</text>
  <text class="d-sub" x="645" y="148" text-anchor="middle">promote or roll back</text>
  <line class="d-edge-dashed" x1="470" y1="62" x2="556" y2="118" marker-end="url(#sd10q5-arrow2)"/>
  <line class="d-edge-dashed" x1="470" y1="198" x2="556" y2="142" marker-end="url(#sd10q5-arrow2)"/>
</svg>

The analysis step reads metrics from both groups and decides whether the next step (say 25%) happens.

A typical plan: 1% for 10 minutes, then 5%, 25%, 50%, 100%, with an automated check at every step. Tools such as Argo Rollouts, Flagger and the progressive-delivery features of cloud deploy services automate the traffic steps and the analysis.

## 4. The Baseline: Rolling Updates

📌 **Interview term: rolling update** — replace instances of the old version with the new one a few at a time until all are new. A Kubernetes Deployment does this by default, with \`maxSurge\` and \`maxUnavailable\` both defaulting to 25% (Kubernetes Deployment API reference: the surge count rounds up and the unavailable count rounds down).

A rolling update needs no extra environment and keeps capacity steady, but it has two weaknesses: traffic is split by **instance**, not by user, so every user hits both versions during the rollout; and rolling back is another rolling update, as slow as the first one.

## 5. A Worked Run: the Same Bad Release Three Ways

The example **"Blue-green vs rolling vs canary: blast radius of a bad release and the cost of a noisy canary gate"** sends 10,000 requests a minute from 5,000 users. Every version fails 0.2% of requests; the bad v2 fails 3% more.

- **Blue-green** switches everything at minute 1. An alert fires when the overall error rate stays above 1% for 3 minutes in a row; then traffic switches back.
- **Rolling** replaces one of 10 instances per minute, with the same alert; rollback replaces them back one per minute.
- **Canary** uses sticky user buckets and steps 1%, 5%, 25%, 50%, 100% every 10 minutes. Its gate rolls back when the canary error rate is at least 1 percentage point above the control, once it has at least 500 canary requests.

| Strategy | Detected in minute | Failed requests caused by v2 | Users hit (of 5,000) |
| :--- | ---: | ---: | ---: |
| Blue-green | 3 | 941 | 864 |
| Rolling | 7 | 1,054 | 946 |
| Canary (1% step) | 5 | 21 | 17 |

The canary was slower to decide than blue-green (minute 5 vs minute 3) because 1% of traffic needs five minutes to reach 500 requests. It still hurt 45 times fewer requests, because it decided on 1% of traffic. Rolling was worst on both counts: the alert waits for enough of the fleet to be bad, and undoing it takes as long as doing it.

The good release shows the other side:

| Strategy | Minutes until 100% on v2 |
| :--- | ---: |
| Blue-green | 0 |
| Rolling | 10 |
| Canary, margin gate | 40 |
| Canary, naive "twice the control rate" gate | never: false alarm in minute 2 |

The canary costs time on every good release. And its gate has to be statistically sensible: with a 0.2% base error rate, 100 canary requests produce 0, 1 or 2 errors by chance, and "twice the control" fires on noise. The naive gate rolled back a perfectly good release.

📌 **Interview term: canary analysis** — the automated comparison of canary and control metrics that decides promote or roll back. It needs a minimum sample size, a meaningful threshold (an absolute margin or a statistical test, not a raw ratio of tiny numbers), and metrics that reflect users: error rate, latency percentiles, and business signals such as checkout completion.

## 6. What Breaks Both Strategies

**Database schema changes.** During blue-green both versions share a database and the rollback path needs the old schema; during a canary both versions run at once. So schema changes use **expand and contract**:

1. *Expand*: add the new column or table, nullable, without removing anything. Both versions work.
2. Deploy code that writes both old and new, and reads new with a fallback.
3. Backfill old rows.
4. *Contract*: once no running version reads the old column, remove it in a later release.

📌 **Interview term: expand and contract (parallel change)** — making a breaking change in backward-compatible steps so that old and new code can run against the same data at the same time.

**Sessions and long-lived connections.** Switching traffic does not move a WebSocket that is already open, or a session held in memory. Keep sessions in a shared store ([stateless services](/interview-question/why-prefer-stateless-services-and-how-do-you-handle-sessions)), drain connections before shutting old instances down, and expect clients to reconnect.

**Background workers and queues.** A canary on the web tier does not cover the queue consumers. If v2 changes a message format, old consumers must still read new messages and the other way round; version your messages.

**Configuration and dependencies.** A change to a shared config file or feature flag reaches everyone at once, bypassing the canary. Roll config out in stages too.

## 7. Feature Flags: Separating Deploy From Release

📌 **Interview term: feature flag** — a runtime switch that turns code paths on for chosen users without a deploy. It lets you deploy code dark and release it gradually, per user or per tenant, and turn it off in seconds.

Flags and canaries work together: the canary protects against a bad *build* (crash, memory leak, a broken dependency), the flag protects against a bad *feature*. See [designing a feature flag system](/interview-question/how-would-you-design-a-feature-flag-system-launchdarkly-style-at-scale) and [targeting and gradual rollout](/interview-question/advanced-feature-flags-targeting-gradual-rollout-and-edge-evaluation).

A real case of what goes wrong with partial deploys and no fast rollback: the SEC's 2013 order on Knight Capital describes a 1 August 2012 release where new trading code reached seven of eight servers and the eighth ran old code reactivated by a reused flag; Knight lost more than $460 million in about 45 minutes (SEC administrative proceeding against Knight Capital Americas, 2013). Consistent fleets, automated verification and a fast kill switch are the lesson.

## 8. Choosing

| | Blue-green | Canary | Rolling |
| :--- | :--- | :--- | :--- |
| Traffic shift | All at once | Small share, then steps | Instance by instance |
| Blast radius of a bad release | Everyone until rollback | The canary share | Grows with the rollout |
| Rollback | Seconds (switch back) | Seconds (route canary share back) | As slow as the rollout |
| Extra capacity | 2x during the switch | Small | Small (the surge) |
| Mixed versions at once | No | Yes | Yes |
| Good for | Fast, clean cutovers; low-traffic services; big infrastructure changes | High-traffic user-facing services where small bad releases are costly | Default for stateless services with good tests |

They combine: many teams run a blue-green style switch per region and canary the switch across regions, or canary first and then flip the rest.

## 9. Verified: Running the Code

What the program simulates: a deterministic 32-bit hash decides each request's user, its sticky canary bucket and whether it fails, so every run is the same. Each minute it counts errors per version and applies the alert or the canary gate. It leaves out latency, real routers and real statistics (the margin gate is a simple rule, not a significance test).

The two canary gates:

~~~js
const naive = cReq >= 100 && cErr * ctlReq > 2 * ctlErr * cReq;                           // "twice the control rate"
const margin = cReq >= 500 && cErr * ctlReq * 100 > ctlErr * cReq * 100 + cReq * ctlReq; // 1 point above control, 500+ samples
~~~

Full output (identical in Node and Python):

~~~text
== bad release: v2 fails 3% of requests ==
blue-green  detected in minute  3, failed requests caused by v2:  941, users hit:  864 of 5000
rolling     detected in minute  7, failed requests caused by v2: 1054, users hit:  946 of 5000
canary      detected in minute  5, failed requests caused by v2:   21, users hit:   17 of 5000

== good release: time until 100% of traffic is on v2 ==
blue-green              0 minutes, false alarms: none
rolling                10 minutes, false alarms: none
canary (margin gate)   40 minutes, false alarms: none
canary (naive gate)    never, false alarms: minute 2
~~~

## 10. Edge Cases Worth Knowing

- **Low-traffic services.** At 10 requests a minute a 1% canary sees nothing; use a larger share, a longer step, or synthetic traffic, or prefer blue-green with strong pre-switch tests.
- **Bugs that only some users trigger.** A canary picked by user hash may not include the affected segment; canary by region, tenant or platform when that matters.
- **Slow-burning problems.** Memory leaks and disk growth show up after hours; keep the final steps long enough, or keep blue around after a blue-green switch.
- **Metrics that lag.** Business metrics may take longer than error rates; gate early steps on technical metrics, later steps on business ones.
- **Rollback that is not safe.** If v2 wrote data in a new format, switching back to v1 can break; that is why expand and contract comes first.

## Common Pitfalls

- **Treating blue-green as risk-free.** It moves everyone at once; the run hit 864 users before rollback.
- **Canary without automated analysis.** A human watching a dashboard is slow and inconsistent; automate promote and rollback.
- **Gates on tiny samples.** The naive "twice the control" gate fired on noise in minute 2 and blocked a good release.
- **Non-sticky canaries.** Users bouncing between versions break sessions and blur metrics.
- **Breaking schema changes in the same release.** Neither strategy can roll back a dropped column; use expand and contract.
- **Forgetting config, workers and partial fleets.** Knight Capital is the cautionary example of a fleet left half-updated.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Blue-green:</strong> <span style="color:#f0e2c8;">Two identical environments. I deploy to the idle one, test it, and switch all traffic at once; rollback is switching back. It is fast and clean, costs double capacity during the switch, and exposes everyone at once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Canary:</strong> <span style="color:#f0e2c8;">Send a small, sticky share of real users to the new version, compare it against the <strong style="color:#ffca28;">control</strong> over the same minutes, and step up (1%, 5%, 25%, 50%, 100%) or roll back automatically. It limits the <strong style="color:#ffca28;">blast radius</strong> at the cost of a slower rollout.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Show it:</strong> <span style="color:#f0e2c8;">In my simulation of a release with a 3% bug at 10,000 requests a minute, blue-green failed 941 requests before rollback, a rolling update 1,054, and a canary at 1% only 21, though it took until minute 5 to gather 500 samples.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Gates need statistics:</strong> <span style="color:#f0e2c8;">The canary gate needs a minimum sample and a real threshold. A naive "twice the control error rate" gate fired on noise in minute 2 and blocked a good release; a 1-point margin with 500 samples promoted it in 40 minutes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What breaks both:</strong> <span style="color:#f0e2c8;">Schema changes (I use <strong style="color:#ffca28;">expand and contract</strong> so old and new code share the database), sessions and long-lived connections, queue consumers and shared config. Feature flags complement both by separating deploy from release.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is a canary different from an A/B test?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mechanically similar, different purpose. A canary asks whether the new build is safe, for minutes or hours, on technical metrics, and the answer is promote or roll back. An A/B test asks whether a feature is better, runs for days on product metrics, and needs proper experiment design.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which metrics would you gate a canary on?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Error rate and latency percentiles of the canary vs the control, saturation (CPU, memory) to catch leaks, and one or two business metrics such as checkout completion for later steps. Each with a minimum sample size and a margin, not a raw ratio.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you do blue-green with a database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually both colours share one database, so every schema change must be backward compatible: expand first, deploy, backfill, and only contract after the old version is gone. A separate green database needs replication and a cutover, which is a much bigger operation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose blue-green over canary?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For low-traffic services where a canary would never collect enough data, for infrastructure changes such as a new runtime or cluster that you want to switch cleanly, and when mixed versions are not safe to run at the same time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does Kubernetes give you out of the box?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A rolling update in the Deployment controller, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxSurge</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxUnavailable</code> defaulting to 25%. Blue-green and canary need either two Deployments with a Service or ingress switch, or a progressive-delivery controller such as Argo Rollouts or Flagger that shifts traffic and runs the analysis.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Blast radius | How many users or requests a failure affects before containment |
| Blue-green deployment | Two environments; switch all traffic to the new one, switch back to roll back |
| Canary deployment | A small, growing share of traffic on the new version, evaluated against the old |
| Control group | Traffic on the old version, compared over the same time window |
| Sticky assignment | Choosing canary users by a hash of a stable id |
| Rolling update | Replace instances a few at a time |
| Canary analysis | Automated metric comparison that decides promote or roll back |
| Expand and contract | Breaking changes made in backward-compatible steps |
| Feature flag | Runtime switch to turn code paths on for chosen users |

**Conclusion:** Blue-green and canary deployments are two answers to "how do I ship without breaking everyone". Blue-green gives an instant, clean switch and an instant rollback, but everyone moves at once: 941 failed requests in the run before the alert fired. Canary trades speed for a small blast radius: 21 failed requests, at the price of 40 minutes for every good release and a gate that must be statistically sound, since the naive gate blocked a good release on noise. Rolling updates are the cheap default with the slowest rollback. Pick by traffic volume, the cost of a bad release and whether mixed versions are safe, and make schema changes backward compatible so that any of them can roll back.`,
    examples: [
      {
        label: `Blue-green vs rolling vs canary: blast radius of a bad release and the cost of a noisy canary gate`,
        variants: [
          { tech: "node", code: `// Blue-green vs rolling vs canary for a bad release and a good release.
// Simulated traffic: 10,000 requests per minute from 5,000 users. Every
// version fails 0.2% of requests; the bad v2 also fails 3% more.
const RPM = 10000, USERS = 5000, INSTANCES = 10;
function mix(x) { // 32-bit integer hash (murmur3 finalizer): deterministic pseudo-randomness
  x = x >>> 0; x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16;
  return x >>> 0;
}
const bucket = (u) => mix(u + 7777) % 100;      // sticky canary bucket 0..99 per user
const roll = (i) => mix(i) % 10000;              // per-request dice, 0..9999
const baseFail = (i) => roll(i) < 20;            // 0.2% in every version
const bugFail = (i) => roll(i) >= 20 && roll(i) < 320; // 3% more in the bad v2

function simulate(strategy, buggy, rule) {
  let i = 0, bad = 0, minute = 0, alertRun = 0;
  const hit = new Set();
  let stage = 0, stageMin = 0, rolled = 0, rollingBack = false, detected = -1;
  const STAGES = [1, 5, 25, 50, 100], STAGE_LEN = 10;
  let cReq = 0, cErr = 0, ctlReq = 0, ctlErr = 0; // canary analysis window
  while (minute < 120) {
    minute++;
    let err = 0;
    for (let k = 0; k < RPM; k++, i++) {
      const u = mix(2 * i + 1) % USERS;
      let v2;
      if (strategy === "blue-green") v2 = detected < 0;
      else if (strategy === "rolling") v2 = i % INSTANCES < rolled;
      else v2 = detected < 0 && bucket(u) < STAGES[stage];
      const failed = baseFail(i) || (v2 && buggy && bugFail(i));
      if (v2 && buggy && bugFail(i)) { bad++; hit.add(u); }
      if (failed) err++;
      if (v2) { if (failed) cErr++; cReq++; } else { ctlReq++; if (failed) ctlErr++; }
    }
    if (strategy === "canary") {
      const naive = cReq >= 100 && cErr * ctlReq > 2 * ctlErr * cReq;                           // "twice the control rate"
      const margin = cReq >= 500 && cErr * ctlReq * 100 > ctlErr * cReq * 100 + cReq * ctlReq; // 1 point above control, 500+ samples
      if (detected < 0 && (rule === "naive" ? naive : margin)) { detected = minute; break; }
      if (++stageMin === STAGE_LEN && STAGES[stage] < 100) { stage++; stageMin = 0; cReq = cErr = ctlReq = ctlErr = 0; }
      if (STAGES[stage] === 100 && stageMin >= 1) return { bad, users: hit.size, detected, full: minute - 1 };
      continue;
    }
    alertRun = err * 100 > RPM ? alertRun + 1 : 0; // alert: error rate above 1% for 3 minutes in a row
    if (alertRun >= 3 && detected < 0) { detected = minute; rollingBack = true; if (strategy === "blue-green") break; }
    if (strategy === "rolling") {
      if (rollingBack) { rolled--; if (rolled === 0) break; }
      else if (rolled < INSTANCES) rolled++;
      else if (!buggy) return { bad, users: hit.size, detected, full: minute - 1 };
    } else if (!buggy) return { bad, users: hit.size, detected, full: 0 };
  }
  return { bad, users: hit.size, detected, full: -1 };
}

console.log("== bad release: v2 fails 3% of requests ==");
for (const [s, rule] of [["blue-green"], ["rolling"], ["canary", "margin"]]) {
  const r = simulate(s, true, rule);
  console.log(s.padEnd(11) + " detected in minute " + String(r.detected).padStart(2) + ", failed requests caused by v2: " + String(r.bad).padStart(4) + ", users hit: " + String(r.users).padStart(4) + " of " + USERS);
}
console.log("");
console.log("== good release: time until 100% of traffic is on v2 ==");
for (const [s, rule] of [["blue-green"], ["rolling"], ["canary", "margin"], ["canary", "naive"]]) {
  const r = simulate(s, false, rule);
  console.log((s + (rule ? " (" + rule + " gate)" : "")).padEnd(22) + " " + (r.full < 0 ? "never" : String(r.full).padStart(2) + " minutes") + ", false alarms: " + (r.detected < 0 ? "none" : "minute " + r.detected));
}` },
          { tech: "python", code: `# Blue-green vs rolling vs canary for a bad release and a good release.
# Simulated traffic: 10,000 requests per minute from 5,000 users. Every
# version fails 0.2% of requests; the bad v2 also fails 3% more.
RPM, USERS, INSTANCES = 10000, 5000, 10
M = 0xFFFFFFFF


def mix(x):  # 32-bit integer hash (murmur3 finalizer): deterministic pseudo-randomness
    x &= M
    x ^= x >> 16
    x = (x * 0x85EBCA6B) & M
    x ^= x >> 13
    x = (x * 0xC2B2AE35) & M
    x ^= x >> 16
    return x


def bucket(u):  # sticky canary bucket 0..99 per user
    return mix(u + 7777) % 100


def roll(i):  # per-request dice, 0..9999
    return mix(i) % 10000


def base_fail(i):  # 0.2% in every version
    return roll(i) < 20


def bug_fail(i):  # 3% more in the bad v2
    return 20 <= roll(i) < 320


def simulate(strategy, buggy, rule=None):
    i = bad = minute = alert_run = 0
    hit = set()
    stage = stage_min = rolled = 0
    rolling_back, detected = False, -1
    STAGES, STAGE_LEN = [1, 5, 25, 50, 100], 10
    c_req = c_err = ctl_req = ctl_err = 0  # canary analysis window
    while minute < 120:
        minute += 1
        err = 0
        for _ in range(RPM):
            u = mix(2 * i + 1) % USERS
            if strategy == "blue-green":
                v2 = detected < 0
            elif strategy == "rolling":
                v2 = i % INSTANCES < rolled
            else:
                v2 = detected < 0 and bucket(u) < STAGES[stage]
            failed = base_fail(i) or (v2 and buggy and bug_fail(i))
            if v2 and buggy and bug_fail(i):
                bad += 1
                hit.add(u)
            if failed:
                err += 1
            if v2:
                c_req += 1
                c_err += 1 if failed else 0
            else:
                ctl_req += 1
                ctl_err += 1 if failed else 0
            i += 1
        if strategy == "canary":
            naive = c_req >= 100 and c_err * ctl_req > 2 * ctl_err * c_req  # "twice the control rate"
            margin = c_req >= 500 and c_err * ctl_req * 100 > ctl_err * c_req * 100 + c_req * ctl_req  # 1 point above control, 500+ samples
            if detected < 0 and (naive if rule == "naive" else margin):
                detected = minute
                break
            stage_min += 1
            if stage_min == STAGE_LEN and STAGES[stage] < 100:
                stage += 1
                stage_min = 0
                c_req = c_err = ctl_req = ctl_err = 0
            if STAGES[stage] == 100 and stage_min >= 1:
                return {"bad": bad, "users": len(hit), "detected": detected, "full": minute - 1}
            continue
        alert_run = alert_run + 1 if err * 100 > RPM else 0  # alert: error rate above 1% for 3 minutes in a row
        if alert_run >= 3 and detected < 0:
            detected = minute
            rolling_back = True
            if strategy == "blue-green":
                break
        if strategy == "rolling":
            if rolling_back:
                rolled -= 1
                if rolled == 0:
                    break
            elif rolled < INSTANCES:
                rolled += 1
            elif not buggy:
                return {"bad": bad, "users": len(hit), "detected": detected, "full": minute - 1}
        elif not buggy:
            return {"bad": bad, "users": len(hit), "detected": detected, "full": 0}
    return {"bad": bad, "users": len(hit), "detected": detected, "full": -1}


print("== bad release: v2 fails 3% of requests ==")
for s, rule in [("blue-green", None), ("rolling", None), ("canary", "margin")]:
    r = simulate(s, True, rule)
    print(s.ljust(11) + " detected in minute " + str(r["detected"]).rjust(2) + ", failed requests caused by v2: " + str(r["bad"]).rjust(4) + ", users hit: " + str(r["users"]).rjust(4) + " of " + str(USERS))
print("")
print("== good release: time until 100% of traffic is on v2 ==")
for s, rule in [("blue-green", None), ("rolling", None), ("canary", "margin"), ("canary", "naive")]:
    r = simulate(s, False, rule)
    name = s + (" (" + rule + " gate)" if rule else "")
    full = "never" if r["full"] < 0 else str(r["full"]).rjust(2) + " minutes"
    print(name.ljust(22) + " " + full + ", false alarms: " + ("none" if r["detected"] < 0 else "minute " + str(r["detected"])))` },
        ],
      },
    ],
  },
];

export default augments;
