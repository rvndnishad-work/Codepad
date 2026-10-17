/**
 * SYSTEM DESIGN ULTRA — batch 07: Consistency and coordination. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `What is the CAP theorem?`,
    difficulty: "medium",
    seoDescription: `The CAP theorem explained from zero: why partitions force a choice between consistency and availability, CP vs AP with a worked run, and PACELC.`,
    description: `**Question presented to candidate:**
"What is the CAP theorem? Tell me what C, A and P actually mean, why people say you can only have two, and how it changes the way you design a real replicated database or service."

**What a strong answer should cover:**
- The precise statement (Brewer's conjecture in 2000, proved by Gilbert and Lynch in 2002): when the network **partitions**, a replicated system cannot be both **linearizable (C)** and **available to every request (A)**
- Why "pick 2 of 3" is misleading: partitions are not optional in a distributed system, so the real choice is **CP or AP during a partition**; with no partition you can have both
- What each choice looks like: CP rejects or blocks requests on the minority side; AP answers everywhere and must reconcile divergent data later (last-writer-wins loses updates, mergeable types such as CRDTs do not)
- **PACELC**: even with no partition there is a trade-off between latency and consistency, which shapes everyday design far more often than partitions do
- The choice is made **per operation or per data type**, not per company: inventory decrements CP, like counters and shopping carts AP
- Concrete systems with care: etcd and ZooKeeper behave CP; Dynamo-style stores lean AP but are tunable; DynamoDB lets each read choose strong or eventual

**Clarifying questions expected:**
- What is the data, and what does a stale or conflicting value cost the business?
- Is the system in one region or several (how likely and how long are partitions, and how far apart are replicas)?

**Code / implementation expected:** Optional — a small simulation of a partition showing CP rejecting requests and AP overselling; the example does exactly that.`,
    answer: `**Target Audience:** Beginners to distributed systems — you know a database stores data and that servers talk over a network; everything else is defined as we go.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The numbers in the worked run come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A small bank has two branches in two towns. Each branch keeps a copy of every customer balance, and the branches phone each other after every deposit or withdrawal so the copies stay identical.

One morning a digger cuts the phone line. A customer walks into the north branch and asks to withdraw 500 from an account holding 600. The north clerk cannot know whether, five minutes ago, the same customer (or their partner) withdrew money at the south branch. The clerk has exactly two options:

1. **Refuse** ("our systems are down, come back later"). No balance can ever go wrong, but a customer was turned away.
2. **Pay out** based on the local copy. The customer is served, but if the south branch also paid out, the account is now overdrawn, and the two ledgers disagree until someone reconciles them.

There is no third option where the clerk both serves the customer and is certain the answer is correct. That is the CAP theorem. The cut phone line is a **partition**, option 1 is **consistency**, option 2 is **availability**.

📌 **Interview term: CAP theorem** — in a system that keeps copies of data on several machines, when the network between them partitions, every request can either get a guaranteed up-to-date answer or get an answer, but not always both. Eric Brewer presented it as a conjecture in his invited talk at PODC 2000; Seth Gilbert and Nancy Lynch proved it in "Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services" (ACM SIGACT News, 2002).

## 2. What C, A and P Actually Mean

The letters are used loosely in blog posts. In the theorem they have precise meanings, and interviewers notice when you use them precisely.

📌 **Interview term: consistency (the C in CAP)** — **linearizability**: the system behaves as if there is a single copy of the data, and every read returns the value of the most recent completed write (or an error). This is a much stronger, narrower idea than the "C" in ACID, which is about keeping database rules such as "balance never below zero" true.

📌 **Interview term: availability (the A in CAP)** — every request received by a node that has not crashed gets a non-error response. Not "99.9% uptime": a CAP-available system answers on **every** working node, even one cut off from all the others.

📌 **Interview term: network partition (the P)** — the network loses or delays messages between groups of nodes, so each group cannot reach the other. In practice it is a broken link, a misconfigured firewall, a switch failure, or a pause so long (a garbage-collection stall, an overloaded host) that it is indistinguishable from a broken link.

📌 **Interview term: partition tolerance** — the system keeps running (in some defined way) when a partition happens, instead of having undefined behaviour.

## 3. Why "Pick Two of Three" Is the Wrong Way to Say It

The popular slogan is "consistency, availability, partition tolerance: pick two." It suggests three equal menu items. They are not equal.

- A system that keeps data on more than one machine **will** see partitions; you do not get to opt out of the network failing. So P is not a choice, it is the weather.
- "CA" therefore only describes a system with no partitions at all: a single-node database, or several nodes on a network you assume never fails. The moment that assumption breaks, a "CA" system has to do something, and that something is either C or A.
- When there is **no** partition, nothing in CAP stops you from having both linearizability and availability.

So the accurate version is: **when a partition happens, choose between C and A for the requests that cannot reach the other side.** Brewer made this point himself in "CAP Twelve Years Later: How the Rules Have Changed" (IEEE Computer, 2012, republished on InfoQ), arguing that designers should handle partitions explicitly rather than treat CAP as pick-two.

📌 **Interview term: CP system** — during a partition, nodes that cannot reach a majority (or the leader) refuse or block requests, so nobody ever reads a stale value or makes a conflicting write.

📌 **Interview term: AP system** — during a partition, every node keeps answering from its local copy, accepting that reads may be stale and that writes on both sides may conflict and need reconciling later.

Here is what CP looks like with three replicas split into {A} and {B, C}:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="CP during a partition: replica A alone rejects the request, replicas B and C form a majority and keep serving">
  <defs>
    <marker id="sd07q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="230" height="220" rx="12"/>
  <text class="d-sub" x="145" y="68" text-anchor="middle">minority side</text>
  <rect class="d-box" x="80" y="110" width="130" height="60" rx="10"/>
  <text class="d-text" x="145" y="146" text-anchor="middle">replica A</text>
  <text class="d-accent" x="145" y="215" text-anchor="middle">error: no quorum</text>
  <line class="d-edge-dashed" x1="300" y1="40" x2="300" y2="260"/>
  <text class="d-sub" x="300" y="285" text-anchor="middle">partition</text>
  <rect class="d-box-muted" x="340" y="40" width="390" height="220" rx="12"/>
  <text class="d-sub" x="535" y="68" text-anchor="middle">majority side, 2 of 3</text>
  <rect class="d-box-accent" x="380" y="110" width="130" height="60" rx="10"/>
  <text class="d-text" x="445" y="146" text-anchor="middle">replica B</text>
  <rect class="d-box-accent" x="570" y="110" width="130" height="60" rx="10"/>
  <text class="d-text" x="635" y="146" text-anchor="middle">replica C</text>
  <line class="d-edge-accent" x1="510" y1="140" x2="566" y2="140" marker-end="url(#sd07q1-arrow)"/>
  <text class="d-accent" x="540" y="215" text-anchor="middle">reads and writes succeed</text>
</svg>

The minority side gives up availability so that no one can act on a stale balance; the majority side keeps a single, linearizable copy.

And AP with the same split:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="AP during a partition: replica A and replicas B and C all keep serving from their own copies, and the copies drift apart">
  <rect class="d-box-muted" x="30" y="40" width="230" height="220" rx="12"/>
  <text class="d-sub" x="145" y="68" text-anchor="middle">side 1</text>
  <rect class="d-box-accent" x="80" y="110" width="130" height="60" rx="10"/>
  <text class="d-text" x="145" y="146" text-anchor="middle">replica A</text>
  <text class="d-accent" x="145" y="215" text-anchor="middle">serves local copy</text>
  <line class="d-edge-dashed" x1="300" y1="40" x2="300" y2="260"/>
  <text class="d-sub" x="300" y="285" text-anchor="middle">partition</text>
  <rect class="d-box-muted" x="340" y="40" width="390" height="220" rx="12"/>
  <text class="d-sub" x="535" y="68" text-anchor="middle">side 2</text>
  <rect class="d-box-accent" x="380" y="110" width="130" height="60" rx="10"/>
  <text class="d-text" x="445" y="146" text-anchor="middle">replica B</text>
  <rect class="d-box-accent" x="570" y="110" width="130" height="60" rx="10"/>
  <text class="d-text" x="635" y="146" text-anchor="middle">replica C</text>
  <text class="d-accent" x="540" y="215" text-anchor="middle">serves its own copy</text>
</svg>

Everyone gets an answer, but the two sides now hold different data and must be merged when the partition heals.

## 4. A Worked Run: Selling the Last Three Seats

The example **"CAP during a partition: CP refuses, AP oversells, mergeable data survives, PACELC latency"** simulates three replicas of a concert's seat inventory. Three seats are left. One seat is sold while the network is healthy; then the network splits {A} | {B, C} and buyers keep arriving at all three replicas.

| Step | CP (needs 2 of 3 replicas) | AP (any replica answers alone) |
| :--- | :--- | :--- |
| buy at B, before split | sold, 2 left | sold, 2 left |
| buy at A | **error: no quorum** | sold, A thinks 1 left |
| buy at B | sold, 1 left | sold, B and C think 1 left |
| buy at A | **error: no quorum** | sold, A thinks 0 left |
| buy at C | sold, 0 left | sold, B and C think 0 left |
| read at A | **error: no quorum** | 0 seats left |
| heal and merge | 3 sales for 3 seats | **5 sales for 3 seats: oversold by 2** |
| requests answered | 5 of 8 | 8 of 8 |

Both behaviours are "correct" designs; they fail differently. CP turned away three requests. AP turned away none, and sold two tickets for seats that do not exist, which someone now has to refund. Neither can be avoided by better code: that is the theorem.

## 5. AP Is Fine When the Data Can Be Merged

Overselling happened because "seats left" is a value where two independent decisions cannot both be honoured. Plenty of data is not like that. In the same run, a like counter starts at 10 and receives 9 more likes during the partition (4 at A, 3 at B, 2 at C):

| Merge strategy after the partition heals | Result | Correct total |
| :--- | ---: | ---: |
| Last-writer-wins (keep the copy with the newest timestamp) | 15, **4 likes lost** | 19 |
| G-counter (each replica counts its own likes; merge takes the max per replica, then sums) | **19** | 19 |

📌 **Interview term: last-writer-wins (LWW)** — resolve conflicting copies by keeping the one with the latest timestamp. Simple, and it silently throws away every other concurrent write.

📌 **Interview term: CRDT (conflict-free replicated data type)** — a data type designed so that copies updated independently can always be merged into the same correct result, in any order. The G-counter (grow-only counter) is the simplest one; sets, maps and text-editing CRDTs exist too.

This is why AP designs work well for carts, likes, view counts, presence and feeds: the data can be merged, or a slightly stale answer costs almost nothing. It is also why money movements and the last seat usually go CP.

## 6. PACELC: The Trade-off You Pay Every Day

Partitions are rare. Latency is constant. Daniel Abadi's PACELC formulation ("Consistency Tradeoffs in Modern Distributed Database System Design: CAP is Only Part of the Story", IEEE Computer, February 2012) extends CAP:

- **if P**artition: choose **A**vailability or **C**onsistency;
- **E**lse (normal operation): choose **L**atency or **C**onsistency.

A strongly consistent write or read has to wait for other replicas; a fast one answers from the nearest copy and may be stale. In the run, a client sits next to replica A, with round trips of 1 ms to A, 12 ms to B and 80 ms to C:

| Wait for | Latency | Consistency |
| :--- | ---: | :--- |
| 1 replica (EL) | 1 ms | may read stale data |
| a majority, 2 of 3 (EC) | 12 ms | linearizable with a majority protocol |
| all 3 replicas | 80 ms | strongest, and one slow replica stalls every request |

📌 **Interview term: PACELC** — "if Partition, then Availability or Consistency; Else, Latency or Consistency". It names the everyday cost of consistency: waiting for replicas that are far away.

## 7. Where Real Systems Sit (It Depends on Configuration)

Labels such as "Cassandra is AP" are shorthand; most databases let you choose per request. Say what the default does and what the knobs are:

| System | During a partition | Knob |
| :--- | :--- | :--- |
| etcd, ZooKeeper (consensus stores) | Minority side cannot elect a leader or commit writes: **CP** | Some reads can be served locally if you accept staleness |
| Cassandra, Dynamo-style stores | Any replica can accept writes and reconcile later: AP-leaning | Per-request consistency level; QUORUM reads and writes behave much more like CP — see [read/write quorums](/interview-question/what-is-a-read-write-quorum) |
| Amazon DynamoDB | Reads are eventually consistent by default | \`ConsistentRead=true\` per request asks for a strongly consistent read, which costs a full read unit instead of half (AWS DynamoDB documentation on read consistency and capacity units) |
| MongoDB replica sets | A primary that loses its majority steps down; writes need a primary | Since MongoDB 5.0 the implicit default write concern is \`w: "majority"\` (MongoDB manual, Default MongoDB Read Concerns/Write Concerns), with an exception for some replica sets with arbiters |

These are product behaviours from each vendor documentation; check the version you run, because defaults change.

## 8. Choosing Per Operation, Not Per Company

One application rarely needs a single answer. A ticketing site might use:

- **CP** for "reserve seat" and "charge card": a stale answer means double-selling or double-charging.
- **AP** for "how many people are viewing this event": a stale number costs nothing.
- **Read-your-writes** for "show my order": weaker than linearizable, strong enough that users see their own changes. The sibling page on [strong vs eventual consistency](/interview-question/what-is-the-difference-between-strong-and-eventual-consistency) covers these intermediate guarantees.

Under the hood, CP behaviour usually comes from a majority-based protocol with a single leader, which is why [leader election](/interview-question/what-is-leader-election-in-distributed-systems) and quorums show up wherever CP is promised.

## 9. Verified: Running the Code

The program models each replica as the set of sales it knows about. In CP mode an operation first checks that a majority of replicas is reachable; in AP mode it acts on the local set and copies the sale only to replicas on the same side. "Heal" takes the union of all sets. The like-counter part runs both merge strategies over the same nine likes, and the PACELC part sorts the three round-trip times to find the 1st, 2nd and 3rd acknowledgement.

The key part:

~~~js
const peers = reachable(at);
if (mode === "CP" && peers.length * 2 <= NODES.length) { res = "ERROR no quorum (" + peers.length + " of 3 reachable)"; errors++; }
else if (left(at) === 0) { res = "sold out"; ok++; }
else { for (const p of peers) sales[p].add(id); /* replicate to every replica this side can reach */ }
~~~

What the simulation stands for: a real system would send replication messages over a network and detect the partition with timeouts; here the partition is a flag and replication is instant within a side. It leaves out message delays, retries and failure detection.

Full output (identical in Node and Python):

~~~text
-- CP --
   buy at B: sold, 2 left on ABC
   partition: A | B C
   buy at A: ERROR no quorum (1 of 3 reachable)
   buy at B: sold, 1 left on BC
   buy at A: ERROR no quorum (1 of 3 reachable)
   buy at C: sold, 0 left on BC
   read at A: ERROR no quorum (1 of 3 reachable)
   read at B: 0 seats left
   heal: replicas merge, 3 sales recorded for 3 seats
   read at A: 0 seats left
   answered 5 of 8 requests, 3 errors
-- AP --
   buy at B: sold, 2 left on ABC
   partition: A | B C
   buy at A: sold, 1 left on A
   buy at B: sold, 1 left on BC
   buy at A: sold, 0 left on A
   buy at C: sold, 0 left on BC
   read at A: 0 seats left
   read at B: 0 seats left
   heal: replicas merge, 5 sales recorded for 3 seats -> OVERSOLD by 2
   read at A: oversold: 2 tickets have no seat
   answered 8 of 8 requests, 0 errors
-- AP with data that merges: a like counter, partition A | B C --
   side A alone saw 14, side B C saw 15
   true total 19, last-writer-wins keeps 15 (lost 4), G-counter merge gives 19
-- No partition: the else-branch of PACELC (client next to A) --
   ack from 1 replica (EL, may read stale): 1 ms
   ack from a majority, 2 of 3 (EC):        12 ms
   ack from all 3 replicas:                 80 ms
~~~

## 10. Edge Cases Worth Knowing

- **You cannot see a partition directly.** A node only sees missing replies. A slow peer and a dead peer look the same, so "partition" decisions are really timeout decisions; see [how systems detect node failures](/interview-question/how-do-distributed-systems-detect-node-failures).
- **Latency is a partial partition.** If a replica answers in 5 seconds, a CP system that waits for it is effectively unavailable. Timeouts turn slowness into the C-or-A choice.
- **CAP availability is not an SLA.** A CP system can still reach 99.99% uptime because partitions are rare and short; designing for [high availability](/interview-question/how-do-you-design-for-high-availability) is a different question.
- **Clients sit on one side too.** A CP system is available to clients that can reach the majority side; clients stuck with the minority get errors.
- **Read-only degraded mode.** Some systems let the minority side keep serving reads marked as possibly stale, while refusing writes: a deliberate mix of C for writes and A for reads.

## Common Pitfalls

- **Saying "we chose CA".** For anything on more than one machine, partitions happen; CA only describes a single node.
- **Treating C in CAP as C in ACID.** CAP consistency is linearizability across replicas; ACID consistency is about database invariants inside transactions.
- **Labelling a whole product AP or CP.** Most stores are tunable per request; say which operations run with which setting.
- **Forgetting the merge.** AP is only half a design until you say how divergent copies are reconciled: last-writer-wins lost 4 of 9 likes in the run, a G-counter lost none.
- **Ignoring PACELC.** The everyday cost of consistency is waiting for far replicas (12 ms vs 1 ms in the run, 80 ms if you wait for all), not partitions.
- **Assuming CP means no errors.** CP means the minority side returns errors: 3 of 8 requests in the run.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The statement:</strong> <span style="color:#f0e2c8;">When a replicated system suffers a <strong style="color:#ffca28;">network partition</strong>, it must choose for the cut-off requests between <strong style="color:#ffca28;">consistency</strong> (linearizable: every read sees the latest write, or gets an error) and <strong style="color:#ffca28;">availability</strong> (every working node answers). Brewer conjectured it in 2000; Gilbert and Lynch proved it in 2002.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Not pick two:</strong> <span style="color:#f0e2c8;">Partitions are not optional once data lives on more than one machine, so "CA" only describes a single node. The real choice is <strong style="color:#ffca28;">CP or AP during the partition</strong>; with no partition you can have both.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What each looks like:</strong> <span style="color:#f0e2c8;">CP refuses requests on the minority side; AP serves everyone and reconciles later. In my simulation of the last three seats, CP answered 5 of 8 requests and sold exactly 3; AP answered all 8 and sold 5, overselling by 2.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. AP needs a merge:</strong> <span style="color:#f0e2c8;">AP is safe when the data merges: a like counter as a <strong style="color:#ffca28;">CRDT</strong> (G-counter) kept all 19 likes, while <strong style="color:#ffca28;">last-writer-wins</strong> kept 15 and lost 4. So carts, likes and presence go AP; money and the last seat go CP.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. PACELC:</strong> <span style="color:#f0e2c8;">Day to day the trade-off is latency vs consistency: answering from the nearest replica took 1 ms, waiting for a majority 12 ms, waiting for all 80 ms. I choose per operation, and most stores let me, for example DynamoDB with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConsistentRead</code> or Cassandra consistency levels.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is MongoDB (or Cassandra) CP or AP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on configuration, and I would say so. A MongoDB primary that loses its majority steps down and writes stop, and since 5.0 the default write concern is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w: majority</code>, which behaves CP. Cassandra accepts writes on any replica by default, which leans AP, but QUORUM reads and writes make overlapping majorities and behave much more like CP.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a CP system still be highly available?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, in the uptime sense. CAP availability means every working node answers during a partition; uptime SLAs measure the fraction of time the service works for most clients. Partitions are rare and usually short, so a majority-based CP system can still reach very high uptime; only clients cut off with the minority see errors.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does an AP system resolve conflicts after the partition heals?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Options are <strong style="color:#ffca28;">last-writer-wins</strong> by timestamp (simple, loses concurrent writes), keeping all versions as siblings and letting the application merge (like a shopping cart union), or using <strong style="color:#ffca28;">CRDTs</strong> that merge automatically. Anti-entropy or read repair then copies the merged value to every replica.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the system know there is a partition?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It does not, directly. It sees requests time out. Choosing the timeout is choosing how long you wait before giving up consistency (AP) or giving up the request (CP), which is why PACELC treats latency and partitions as the same family of trade-off.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a single-node PostgreSQL violate CAP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. CAP is about replicated data. A single node is trivially consistent and, while it is up, available; if it is unreachable it is simply down. CAP starts to bite when you add replicas, for example asynchronous read replicas that can serve stale reads.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| CAP theorem | During a partition, a replicated system cannot be both linearizable and available on every node |
| Consistency (C) | Linearizability: behaves like one copy; reads see the latest completed write |
| Availability (A) | Every request to a non-crashed node gets a non-error response |
| Network partition (P) | Messages between groups of nodes are lost or delayed |
| Partition tolerance | Defined behaviour when a partition happens |
| CP system | Minority side refuses or blocks requests during a partition |
| AP system | Every side keeps answering; data is reconciled later |
| Last-writer-wins | Keep the copy with the newest timestamp; drops concurrent writes |
| CRDT | Data type whose independently updated copies always merge correctly |
| PACELC | If partition: A or C; else: latency or consistency |

**Conclusion:** The CAP theorem is narrower and more useful than the "pick two" slogan: once data lives on several machines, a partition forces each cut-off request to choose between a guaranteed up-to-date answer and an answer at all. The run makes the cost concrete: CP refused 3 of 8 requests and never oversold; AP answered all 8 and sold 5 tickets for 3 seats, yet handled a like counter perfectly once it used a CRDT instead of last-writer-wins. Add PACELC, where waiting for a majority cost 12 ms against 1 ms locally, and the design question becomes clear: for each operation, what does a stale or conflicting answer cost, and is that worse than an error or a slower reply?`,
    examples: [
      {
        label: `CAP during a partition: CP refuses, AP oversells, mergeable data survives, PACELC latency`,
        variants: [
          { tech: "node", code: `// CAP in one run: a 3-seat inventory replicated on A, B, C, then a partition {A} | {B, C}.
// CP: an operation needs a majority (2 of 3 replicas) reachable, or it fails.
// AP: any replica answers from what it knows and syncs with the others later.
const NODES = ["A", "B", "C"], SEATS = 3;
const script = [["buy", "B"], ["partition"], ["buy", "A"], ["buy", "B"], ["buy", "A"], ["buy", "C"],
  ["read", "A"], ["read", "B"], ["heal"], ["read", "A"]];

function simulate(mode) {
  const sales = { A: new Set(), B: new Set(), C: new Set() }; // sale ids each replica knows about
  let side = { A: 0, B: 0, C: 0 }, ok = 0, errors = 0, n = 0;
  const reachable = (x) => NODES.filter((y) => side[y] === side[x]);
  const left = (x) => SEATS - sales[x].size;
  console.log("-- " + mode + " --");
  for (const [op, at] of script) {
    if (op === "partition") { side = { A: 1, B: 0, C: 0 }; console.log("   partition: A | B C"); continue; }
    if (op === "heal") {
      const all = new Set([...sales.A, ...sales.B, ...sales.C]);
      for (const x of NODES) sales[x] = new Set(all);
      side = { A: 0, B: 0, C: 0 };
      console.log("   heal: replicas merge, " + all.size + " sales recorded for " + SEATS + " seats" + (all.size > SEATS ? " -> OVERSOLD by " + (all.size - SEATS) : ""));
      continue;
    }
    const peers = reachable(at);
    let res;
    if (mode === "CP" && peers.length * 2 <= NODES.length) { res = "ERROR no quorum (" + peers.length + " of 3 reachable)"; errors++; }
    else if (op === "read") { res = left(at) < 0 ? "oversold: " + -left(at) + " tickets have no seat" : left(at) + " seats left"; ok++; }
    else if (left(at) === 0) { res = "sold out"; ok++; }
    else {
      const id = "sale" + ++n;
      for (const p of peers) sales[p].add(id); // replicate to every replica this side can reach
      res = "sold, " + left(at) + " left on " + peers.join("");
      ok++;
    }
    console.log("   " + op + " at " + at + ": " + res);
  }
  console.log("   answered " + ok + " of " + (ok + errors) + " requests, " + errors + " errors");
}
simulate("CP");
simulate("AP");

console.log("-- AP with data that merges: a like counter, partition A | B C --");
// 10 likes before the split; then 9 likes arrive, each at one replica, and spread only within its side.
const likes = ["A", "B", "A", "C", "A", "B", "A", "C", "B"], side2 = { A: 1, B: 0, C: 0 };
const lww = {}, gc = {}; // lww: [value, timestamp]; gc: one count per replica (G-counter)
for (const x of NODES) { lww[x] = [10, 0]; gc[x] = { A: 10, B: 0, C: 0 }; }
likes.forEach((x, i) => {
  const ts = i + 1, val = lww[x][0] + 1, mine = gc[x][x] + 1;
  for (const y of NODES) if (side2[y] === side2[x]) { lww[y] = [val, ts]; gc[y][x] = mine; }
});
let newest = lww.A; // heal: last-writer-wins keeps the value with the newest timestamp
for (const x of NODES) if (lww[x][1] > newest[1]) newest = lww[x];
const merged = {}; // heal: G-counter takes the max of each replica slot, then sums
for (const k of NODES) merged[k] = Math.max(gc.A[k], gc.B[k], gc.C[k]);
const truth = 10 + likes.length, gTotal = merged.A + merged.B + merged.C;
console.log("   side A alone saw " + lww.A[0] + ", side B C saw " + lww.B[0]);
console.log("   true total " + truth + ", last-writer-wins keeps " + newest[0] + " (lost " + (truth - newest[0]) + "), G-counter merge gives " + gTotal);

console.log("-- No partition: the else-branch of PACELC (client next to A) --");
const rtt = { A: 1, B: 12, C: 80 }; // ms round trip from the client region to each replica
const sorted = NODES.map((x) => rtt[x]).sort((a, b) => a - b);
console.log("   ack from 1 replica (EL, may read stale): " + sorted[0] + " ms");
console.log("   ack from a majority, 2 of 3 (EC):        " + sorted[1] + " ms");
console.log("   ack from all 3 replicas:                 " + sorted[2] + " ms");` },
          { tech: "python", code: `# CAP in one run: a 3-seat inventory replicated on A, B, C, then a partition {A} | {B, C}.
# CP: an operation needs a majority (2 of 3 replicas) reachable, or it fails.
# AP: any replica answers from what it knows and syncs with the others later.
NODES, SEATS = ["A", "B", "C"], 3
script = [("buy", "B"), ("partition", None), ("buy", "A"), ("buy", "B"), ("buy", "A"), ("buy", "C"),
          ("read", "A"), ("read", "B"), ("heal", None), ("read", "A")]


def simulate(mode):
    sales = {x: set() for x in NODES}  # sale ids each replica knows about
    side = {"A": 0, "B": 0, "C": 0}
    ok = errors = n = 0
    print("-- " + mode + " --")
    for op, at in script:
        if op == "partition":
            side = {"A": 1, "B": 0, "C": 0}
            print("   partition: A | B C")
            continue
        if op == "heal":
            allsales = sales["A"] | sales["B"] | sales["C"]
            for x in NODES:
                sales[x] = set(allsales)
            side = {"A": 0, "B": 0, "C": 0}
            extra = " -> OVERSOLD by " + str(len(allsales) - SEATS) if len(allsales) > SEATS else ""
            print("   heal: replicas merge, " + str(len(allsales)) + " sales recorded for " + str(SEATS) + " seats" + extra)
            continue
        peers = [y for y in NODES if side[y] == side[at]]
        left = SEATS - len(sales[at])
        if mode == "CP" and len(peers) * 2 <= len(NODES):
            res = "ERROR no quorum (" + str(len(peers)) + " of 3 reachable)"
            errors += 1
        elif op == "read":
            res = "oversold: " + str(-left) + " tickets have no seat" if left < 0 else str(left) + " seats left"
            ok += 1
        elif left == 0:
            res = "sold out"
            ok += 1
        else:
            n += 1
            for p in peers:  # replicate to every replica this side can reach
                sales[p].add("sale" + str(n))
            res = "sold, " + str(SEATS - len(sales[at])) + " left on " + "".join(peers)
            ok += 1
        print("   " + op + " at " + at + ": " + res)
    print("   answered " + str(ok) + " of " + str(ok + errors) + " requests, " + str(errors) + " errors")


simulate("CP")
simulate("AP")

print("-- AP with data that merges: a like counter, partition A | B C --")
# 10 likes before the split; then 9 likes arrive, each at one replica, and spread only within its side.
likes, side2 = ["A", "B", "A", "C", "A", "B", "A", "C", "B"], {"A": 1, "B": 0, "C": 0}
lww = {x: (10, 0) for x in NODES}  # (value, timestamp)
gc = {x: {"A": 10, "B": 0, "C": 0} for x in NODES}  # one count per replica (G-counter)
for i, x in enumerate(likes):
    ts, val, mine = i + 1, lww[x][0] + 1, gc[x][x] + 1
    for y in NODES:
        if side2[y] == side2[x]:
            lww[y] = (val, ts)
            gc[y][x] = mine
newest = lww["A"]  # heal: last-writer-wins keeps the value with the newest timestamp
for x in NODES:
    if lww[x][1] > newest[1]:
        newest = lww[x]
merged = {k: max(gc["A"][k], gc["B"][k], gc["C"][k]) for k in NODES}  # max per slot, then sum
truth, g_total = 10 + len(likes), sum(merged.values())
print("   side A alone saw " + str(lww["A"][0]) + ", side B C saw " + str(lww["B"][0]))
print("   true total " + str(truth) + ", last-writer-wins keeps " + str(newest[0]) + " (lost " + str(truth - newest[0]) + "), G-counter merge gives " + str(g_total))

print("-- No partition: the else-branch of PACELC (client next to A) --")
rtt = {"A": 1, "B": 12, "C": 80}  # ms round trip from the client region to each replica
srt = sorted(rtt[x] for x in NODES)
print("   ack from 1 replica (EL, may read stale): " + str(srt[0]) + " ms")
print("   ack from a majority, 2 of 3 (EC):        " + str(srt[1]) + " ms")
print("   ack from all 3 replicas:                 " + str(srt[2]) + " ms")` },
        ],
      },
    ],
  },
  {
    title: `What is the difference between strong and eventual consistency?`,
    difficulty: "medium",
    seoDescription: `Strong vs eventual consistency with measured stale-read rates: how each is built, the session guarantees in between, and when to choose which.`,
    description: `**Question presented to candidate:**
"What is the difference between strong consistency and eventual consistency? How does each one actually get implemented, what does the user notice, and how would you decide which one a feature needs?"

**What a strong answer should cover:**
- **Strong (linearizable)**: once a write completes, every later read anywhere returns it; the system behaves like one copy
- **Eventual**: if writes stop, all replicas converge to the same value; until then a read may return any older value, with no bound on how old
- How each is built: a leader with synchronous replication, consensus or majority quorums for strong; asynchronous replication, read-any-replica and anti-entropy for eventual
- The visible anomalies of eventual consistency: **stale reads**, not seeing your own write, values going **backwards in time** between reads
- The middle ground: **read-your-writes, monotonic reads, causal, bounded staleness**, and how a session token or sticky routing provides them cheaply
- The cost side: strong consistency adds latency (waiting for replicas) and loses availability during partitions; eventual is fast and available but pushes complexity to the application

**Clarifying questions expected:**
- Which reads must reflect the latest write (money, inventory, permissions) and which can be a little old (feeds, counters)?
- Are replicas in one region or spread across regions (what does a synchronous round trip cost)?

**Code / implementation expected:** Optional — a model of a leader and lagging followers that measures stale reads and shows read-your-writes and monotonic-reads fixes; the example does that.`,
    answer: `**Target Audience:** Beginners to distributed systems — you know what a database and a replica copy are; everything else is defined as we go.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Stale-read rates and timings come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A company pins its daily menu on a noticeboard at head office. Two branch offices have their own noticeboards, and a courier carries each new menu to them: one branch is 30 minutes away, the other 2 hours.

At 12:05 the chef at head office changes "pasta" to "curry". Someone at head office sees curry. Someone at the near branch still sees pasta until 12:35; someone at the far branch until 14:05. If you walk from the near branch to the far one at 12:40, you see curry and then pasta again: the menu went back in time. Nobody did anything wrong. Each noticeboard is simply a copy that is updated later.

If the company wanted everybody to see the same menu at the same moment, it would have to do something expensive: phone both branches and wait until both confirm the new menu is pinned before announcing it, or make everybody read the menu at head office. That is **strong consistency**. The courier system, where every board shows the new menu soon, but not at once, is **eventual consistency**.

## 2. The Two Definitions, Precisely

📌 **Interview term: strong consistency (linearizability)** — the system behaves as if there were a single copy of the data. Once a write has completed, every read that starts afterwards, on any node, returns that write or a newer one. Reads never go backwards.

📌 **Interview term: eventual consistency** — if no new writes arrive, all replicas eventually return the same value. That is the whole promise. It says nothing about how long "eventually" is, and nothing about what a read returns in the meantime: an old value, and a different old value on each replica.

📌 **Interview term: replication lag** — the time between a write committing on the node that accepted it and that write becoming visible on another replica. Eventual consistency is safe to reason about only when you know roughly how large this is.

📌 **Interview term: stale read** — a read that returns a value older than the latest committed write.

The difference is not "correct vs incorrect"; it is **what the system promises about time**. Strong consistency promises that time moves forward for everyone together. Eventual consistency only promises that everyone ends up in the same place.

## 3. How Each One Is Built

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="Strong consistency: the leader waits for follower acknowledgements before confirming the write">
  <defs>
    <marker id="sd07q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="115" width="130" height="60" rx="10"/>
  <text class="d-text" x="95" y="151" text-anchor="middle">client</text>
  <rect class="d-box-accent" x="300" y="115" width="150" height="60" rx="10"/>
  <text class="d-text" x="375" y="151" text-anchor="middle">leader</text>
  <rect class="d-box" x="590" y="30" width="140" height="60" rx="10"/>
  <text class="d-text" x="660" y="66" text-anchor="middle">follower 1</text>
  <rect class="d-box" x="590" y="200" width="140" height="60" rx="10"/>
  <text class="d-text" x="660" y="236" text-anchor="middle">follower 2</text>
  <line class="d-edge-accent" x1="160" y1="135" x2="296" y2="135" marker-end="url(#sd07q2-arrow)"/>
  <text class="d-sub" x="228" y="120" text-anchor="middle">1 write</text>
  <line class="d-edge" x1="450" y1="130" x2="586" y2="70" marker-end="url(#sd07q2-arrow)"/>
  <line class="d-edge" x1="450" y1="160" x2="586" y2="220" marker-end="url(#sd07q2-arrow)"/>
  <text class="d-sub" x="500" y="80" text-anchor="middle">2 copy</text>
  <text class="d-sub" x="500" y="225" text-anchor="middle">2 copy</text>
  <line class="d-edge-dashed" x1="296" y1="160" x2="164" y2="160" marker-end="url(#sd07q2-arrow)"/>
  <text class="d-sub" x="228" y="190" text-anchor="middle">3 ok after acks</text>
</svg>

For strong consistency the leader confirms the write only after enough replicas have it (all of them, or a majority under a consensus protocol), and reads go to the leader or to a majority. The price is a network round trip on every write and the leader as a bottleneck.

**Strong consistency, typical recipes:**
- One leader per piece of data, with **synchronous replication** or a **consensus protocol** (Raft, Paxos) that commits a write once a majority has it; see [leader election](/interview-question/what-is-leader-election-in-distributed-systems).
- Reads from the leader, and the leader must make sure it is still the leader (a lease or a quick round with a majority), or else a deposed leader can serve stale data.
- Or majority quorums on both writes and reads, so every read set overlaps every write set; the sibling page [what is a read/write quorum](/interview-question/what-is-a-read-write-quorum) works through the R + W > N rule.

**Eventual consistency, typical recipes:**
- **Asynchronous replication**: the leader confirms immediately and ships the change to followers in the background; see [database replication](/interview-question/what-is-database-replication).
- Reads from any replica, which spreads load and survives partitions.
- Repair mechanisms that make convergence actually happen: **anti-entropy** (replicas periodically compare and exchange missing data) and **read repair** (a read that sees different versions writes back the newest).
- A conflict rule when several replicas accept writes (last-writer-wins, version vectors, CRDTs), covered in the [CAP theorem](/interview-question/what-is-the-cap-theorem) page.

## 4. What Users Actually See: Measured

The example **"Strong vs eventual reads: stale-read rates, read-your-writes, monotonic reads, convergence"** models one leader and two asynchronous followers on a fake clock. Follower F1 applies each write 30 ms after the leader; F2 applies it 120 ms after. The leader receives a new version every 100 ms (10 writes), and a reader issues 143 reads, one every 7 ms.

| Read policy | Stale reads | Worst lag seen | Leader load |
| :--- | ---: | ---: | ---: |
| Strong: leader only | 0 of 143 (0.0%) | 0 ms | 100.0% |
| Eventual: F1 only (lag 30 ms) | 43 of 143 (30.1%) | 29 ms | 0.0% |
| Eventual: F2 only (lag 120 ms) | 143 of 143 (100.0%) | 119 ms | 0.0% |
| Eventual: round robin F1/F2 | 93 of 143 (65.0%) | 119 ms | 0.0% |

Two lessons hide in those numbers:

- **The stale fraction is roughly lag divided by the time between writes.** F1 lags 30 ms behind writes that arrive every 100 ms, and 30.1% of its reads were stale.
- **If the lag exceeds the write interval, a replica is never current.** F2 lags 120 ms behind writes every 100 ms, so it served a stale value on every single read while writes kept coming. "Eventually" only arrives once writes pause.

Strong reads were never stale, but every one landed on the leader. That is the scaling cost: you cannot add followers to absorb strongly consistent reads unless they coordinate with the leader.

## 5. The Middle Ground: Session Guarantees

Most user complaints about eventual consistency come from two anomalies, and both can be fixed without paying for full strong consistency. Douglas Terry and colleagues at Xerox PARC named these guarantees in "Session Guarantees for Weakly Consistent Replicated Data" (PDIS 1994, from the Bayou project).

📌 **Interview term: read-your-writes** — after a client writes, its own later reads see that write (other clients may not yet). Fix: the client keeps the version (log position) of its last write as a **session token**; a replica serves the read only if it has applied at least that version, otherwise the read goes to the leader or waits.

In the run, the writer read its own data 40 ms after each of its 10 writes, alternating between F1 and F2:

| | Missed its own write | Sent to leader |
| :--- | ---: | ---: |
| Plain follower reads | 5 of 10 | 0 |
| With a session token | **0 of 10** | 5 |

Only the reads that hit the lagging F2 had to go to the leader; F1 had already caught up and served the other five.

📌 **Interview term: monotonic reads** — once a client has seen a version, it never sees an older one. Fix: route a client to the same replica (sticky routing), or reject replicas older than the last version the client saw.

In the run, one client read every 20 ms. With round-robin routing across F1 and F2 it **went back in time 15 times** (for example, version 2 then version 1 at t=180 ms). Sticky to F1, it went back **0 times**.

📌 **Interview term: causal consistency** — if one write could have influenced another (a reply to a comment), every reader sees them in that order. Unrelated writes may appear in different orders on different replicas.

📌 **Interview term: bounded staleness** — reads may be stale, but never by more than a stated number of versions or amount of time.

Azure Cosmos DB exposes this spectrum directly as five levels, from strongest to weakest: strong, bounded staleness, session, consistent prefix and eventual (Microsoft Learn, Azure Cosmos DB consistency levels).

## 6. Convergence: What "Eventually" Means in Numbers

After the last write at t=900 ms the run printed each replica's version every 30 ms. F1 caught up by t=930 ms; F2 only at t=1020 ms, exactly the largest lag (120 ms) after the last write. In a healthy system "eventually" is the replication lag, usually milliseconds to seconds. In an unhealthy one (a replica that is down, a full network link, a stalled replication worker) it can be hours, so production systems **monitor replication lag** and stop sending reads to replicas that fall too far behind.

## 7. Side by Side

| | Strong consistency | Eventual consistency |
| :--- | :--- | :--- |
| Promise | Reads see the latest completed write, everywhere | Replicas converge once writes stop |
| Write latency | Includes a round trip to other replicas | Local commit only |
| Read scaling | Leader or quorum; followers need coordination | Any replica |
| During a partition | Minority side must refuse (CP) | Every side keeps serving (AP) |
| What the app must handle | Errors and timeouts | Stale reads, reordering, conflicts |
| Good for | Balances, inventory, permissions, unique usernames, locks | Feeds, counters, recommendations, caches, DNS, search indexes |

Real systems mix both. Amazon S3 switched to strong read-after-write consistency for all GET, PUT and LIST operations in December 2020, at no extra cost (AWS What's New, December 2020); before that, overwrites could be read stale for a while. Amazon DynamoDB reads are eventually consistent by default, and a request can set \`ConsistentRead\` to get a strongly consistent read at twice the read-capacity cost (AWS DynamoDB documentation). Google Spanner goes further and offers **external consistency** across data centres by using TrueTime, whose clock uncertainty its OSDI 2012 paper reports as generally under 10 ms, and waiting out that uncertainty before a commit becomes visible.

## 8. How to Choose, Feature by Feature

Ask one question per read: **what goes wrong if this read is a little old?**

- Someone loses money, a seat is sold twice, a revoked permission still works → **strong**.
- A user does not see their own edit and files a bug → **read-your-writes** is enough.
- A list flickers between old and new → **monotonic reads** (sticky routing) is enough.
- Nobody notices → **eventual**, and enjoy the cheaper, faster, more available reads; a cache is the extreme case, see [caching and performance](/interview-question/how-does-caching-improve-system-performance).

## 9. Verified: Running the Code

The program computes, for each replica and each moment, the newest version that replica has applied (\`writeTime + lag <= now\`), then compares it with the leader's version. The session-token variant forwards a read to the leader when the replica's version is below the client's last write; the monotonic-reads part counts every time a client sees a lower version than the one before.

The key part:

~~~js
function applied(r, t) { // newest version replica r has applied at time t
  let v = 0;
  for (let k = 1; k <= writes.length; k++) if (writes[k - 1] + LAG[r] <= t) v = k;
  return v;
}
if (session && seen < k) { forwarded++; seen = applied("L", t); } // replica is behind the session token
~~~

What the simulation stands for: a real follower applies a stream of log records, and the lag varies with load; here each follower has a fixed lag and the clock is simulated, so the numbers are exact and repeatable. It leaves out failures, varying lag and the cost of forwarding.

Full output (identical in Node and Python):

~~~text
== 1. 143 reads, one every 7 ms from t=0 to t=994 ==
strong: leader only          stale   0 of 143 (0.0%), worst   0 ms behind, leader serves 100.0%
eventual: F1 only            stale  43 of 143 (30.1%), worst  29 ms behind, leader serves 0.0%
eventual: F2 only            stale 143 of 143 (100.0%), worst 119 ms behind, leader serves 0.0%
eventual: round robin F1/F2  stale  93 of 143 (65.0%), worst 119 ms behind, leader serves 0.0%

== 2. Read-your-writes: the writer reads 40 ms after each of its 10 writes ==
plain follower reads             : 5 of 10 missed the write just made, 0 sent to leader
with session token (min version) : 0 of 10 missed the write just made, 5 sent to leader

== 3. Monotonic reads: one client reads every 20 ms ==
round robin F1/F2 : went back in time 15 times (t=60 v1->v0, t=100 v1->v0, t=180 v2->v1)
sticky to F1      : went back in time 0 times

== 4. Convergence after the last write (t=900) ==
t=900ms L=v10 F1=v9 F2=v8
t=930ms L=v10 F1=v10 F2=v9
t=960ms L=v10 F1=v10 F2=v9
t=990ms L=v10 F1=v10 F2=v9
t=1020ms L=v10 F1=v10 F2=v10  converged
~~~

## 10. Edge Cases Worth Knowing

- **"Strong" reads from a deposed leader.** A leader cut off from the others may not know it has been replaced; if it serves reads from memory, they can be stale. Linearizable reads need a lease or a check with a majority.
- **Read-your-writes across devices.** A session token in one browser does not help the same user on their phone; carry the token in the user record or route that user to the leader for a while after a write.
- **Caches break every guarantee above.** A cache in front of a strongly consistent database is eventually consistent unless you invalidate on write.
- **Replica promotion.** If an asynchronous follower is promoted after the leader dies, writes it never received are gone; "eventual" can mean "never" for those.
- **Time-based tricks need synchronised clocks.** "Read from a replica that is less than 1 s behind" needs a reliable lag measurement, usually from log positions rather than wall clocks.

## Common Pitfalls

- **Saying eventual consistency means "consistent within a few milliseconds".** It promises no bound; F2 in the run was stale on 100% of reads while writes continued.
- **Thinking strong consistency is just "fast replication".** It is a guarantee that requires coordination (a leader, a majority) on the read or write path, not a fast pipe.
- **Load-balancing reads round robin across replicas.** It produced 15 backwards jumps in the run; use sticky routing or version checks.
- **Forgetting the user's own writes.** 5 of 10 reads missed the user's own change without a session token, 0 with one.
- **Using one level for the whole product.** Pick per operation: strong for money, session guarantees for profiles, eventual for counters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definitions:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Strong consistency</strong> (linearizability) means the system acts like one copy: after a write completes, every later read anywhere sees it. <strong style="color:#ffca28;">Eventual consistency</strong> only promises that replicas converge once writes stop; in between, a read can return any older value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How they are built:</strong> <span style="color:#f0e2c8;">Strong needs coordination: a leader with synchronous replication or consensus, reads from the leader or a majority quorum. Eventual uses asynchronous replication, reads from any replica, and anti-entropy or read repair so copies really converge.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What users see:</strong> <span style="color:#f0e2c8;">In my model with followers lagging 30 ms and 120 ms behind a write every 100 ms, 30.1% of reads from the fast follower were stale and 100% from the slow one, because its lag exceeded the write interval. Leader-only reads were never stale but put all load on the leader.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The middle ground:</strong> <span style="color:#f0e2c8;">Most complaints are fixed by <strong style="color:#ffca28;">session guarantees</strong>: a session token gives <strong style="color:#ffca28;">read-your-writes</strong> (0 of 10 missed instead of 5), and sticky routing gives <strong style="color:#ffca28;">monotonic reads</strong> (0 backwards jumps instead of 15). Causal and bounded staleness sit in between too.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing:</strong> <span style="color:#f0e2c8;">Per operation, ask what a slightly old read costs. Balances, inventory and permissions get strong; profiles get read-your-writes; feeds and counters get eventual. Real services mix them: DynamoDB lets each read set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConsistentRead</code>, and S3 has given strong read-after-write since December 2020.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is eventual consistency the same as being AP in CAP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Related but not the same. CAP is about what happens during a partition; eventual consistency is a guarantee that holds all the time. An AP system usually provides eventual consistency, but a system can be eventually consistent purely for speed (PACELC's latency side) even with no partition.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you give read-your-writes on top of async replicas?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return the write's log position (an LSN or version) to the client; on each read, the client sends it, and a replica that has not applied that position either waits briefly or forwards to the leader. Alternatives are reading from the leader for a few seconds after a write, or pinning the user to one replica.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make a read linearizable in a leader-based system?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Read on the leader, and make sure it is still the leader: either a time-based lease that the cluster promises not to override, or confirming leadership with a majority before answering (Raft calls this a read index). Otherwise a deposed leader in a partition can return stale data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is strong consistency possible across continents?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, at a latency price: every write waits for a majority round trip, which across continents is tens to hundreds of milliseconds. Spanner does it with TrueTime and commit wait; most systems instead keep strong consistency within a region and replicate asynchronously between regions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you monitor eventual consistency in production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track replication lag per replica (in log positions and seconds), alert when it grows, and take lagging replicas out of the read pool. Some teams also run probes that write a marker and measure how long until it appears on each replica.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Strong consistency (linearizability) | Behaves like one copy; reads see the latest completed write |
| Eventual consistency | Replicas converge once writes stop; no bound on staleness until then |
| Replication lag | Delay before a write is visible on another replica |
| Stale read | A read that returns an older value than the latest write |
| Read-your-writes | A client always sees its own earlier writes |
| Monotonic reads | A client never sees an older version after a newer one |
| Causal consistency | Writes that depend on each other are seen in order by everyone |
| Bounded staleness | Reads are at most a stated number of versions or seconds old |

**Conclusion:** Strong and eventual consistency differ in one promise: whether time moves forward for every reader together, or only converges in the end. Strong consistency costs coordination, with leader-only reads and synchronous round trips, and the run showed it delivered zero stale reads by sending every read to the leader. Eventual consistency is cheap and available, but a follower lagging 30 ms behind a write every 100 ms was stale 30.1% of the time, and one lagging 120 ms was never current while writes continued. Between them sit session guarantees: a session token removed every missed own-write, and sticky routing removed every backwards jump. A strong answer chooses per operation and names the guarantee each one actually needs.`,
    examples: [
      {
        label: `Strong vs eventual reads: stale-read rates, read-your-writes, monotonic reads, convergence`,
        variants: [
          { tech: "node", code: `// Strong vs eventual consistency on a fake clock. One leader takes every write;
// follower F1 applies each write 30 ms later, F2 applies it 120 ms later (asynchronous replication).
const LAG = { L: 0, F1: 30, F2: 120 };
const writes = []; // version k (k = 1..10) is committed on the leader at t = 100 * (k - 1) ms
for (let k = 1; k <= 10; k++) writes.push(100 * (k - 1));

function applied(r, t) { // newest version replica r has applied at time t
  let v = 0;
  for (let k = 1; k <= writes.length; k++) if (writes[k - 1] + LAG[r] <= t) v = k;
  return v;
}
const latest = (t) => applied("L", t);
const pct = (a, b) => { const x = Math.floor((a * 1000 + Math.floor(b / 2)) / b); return Math.floor(x / 10) + "." + (x % 10) + "%"; };

console.log("== 1. 143 reads, one every 7 ms from t=0 to t=994 ==");
const policies = [["strong: leader only", () => "L"], ["eventual: F1 only", () => "F1"], ["eventual: F2 only", () => "F2"],
  ["eventual: round robin F1/F2", (i) => (i % 2 ? "F2" : "F1")]];
for (const [name, pick] of policies) {
  let stale = 0, total = 0, worst = 0, leaderReads = 0;
  for (let i = 0, t = 0; t < 1000; i++, t += 7) {
    const r = pick(i), seen = applied(r, t), want = latest(t);
    total++;
    if (r === "L") leaderReads++;
    if (seen < want) { stale++; worst = Math.max(worst, t - writes[seen]); } // ms since the first write it misses
  }
  console.log(name.padEnd(28) + " stale " + String(stale).padStart(3) + " of " + total + " (" + pct(stale, total) + "), worst " +
    String(worst).padStart(3) + " ms behind, leader serves " + pct(leaderReads, total));
}

console.log("\\n== 2. Read-your-writes: the writer reads 40 ms after each of its 10 writes ==");
for (const session of [false, true]) {
  let stale = 0, forwarded = 0;
  for (let k = 1; k <= 10; k++) {
    const t = writes[k - 1] + 40, r = k % 2 ? "F1" : "F2";
    let seen = applied(r, t);
    if (session && seen < k) { forwarded++; seen = applied("L", t); } // replica is behind the session token
    if (seen < k) stale++;
  }
  console.log((session ? "with session token (min version)" : "plain follower reads").padEnd(33) + ": " + stale + " of 10 missed the write just made, " + forwarded + " sent to leader");
}

console.log("\\n== 3. Monotonic reads: one client reads every 20 ms ==");
for (const sticky of [false, true]) {
  let back = 0, last = 0;
  const trail = [];
  for (let i = 0, t = 0; t < 1000; i++, t += 20) {
    const r = sticky || i % 2 === 0 ? "F1" : "F2", seen = applied(r, t);
    if (seen < last) { back++; if (trail.length < 3) trail.push("t=" + t + " v" + last + "->v" + seen); }
    last = seen;
  }
  console.log((sticky ? "sticky to F1" : "round robin F1/F2").padEnd(18) + ": went back in time " + back + " times" + (trail.length ? " (" + trail.join(", ") + ")" : ""));
}

console.log("\\n== 4. Convergence after the last write (t=900) ==");
for (let t = 900; t <= 1020; t += 30) {
  const vs = ["L", "F1", "F2"].map((r) => r + "=v" + applied(r, t));
  const same = new Set(["L", "F1", "F2"].map((r) => applied(r, t))).size === 1;
  console.log("t=" + t + "ms " + vs.join(" ") + (same ? "  converged" : ""));
}` },
          { tech: "python", code: `# Strong vs eventual consistency on a fake clock. One leader takes every write;
# follower F1 applies each write 30 ms later, F2 applies it 120 ms later (asynchronous replication).
LAG = {"L": 0, "F1": 30, "F2": 120}
writes = [100 * (k - 1) for k in range(1, 11)]  # version k is committed on the leader at t = 100 * (k - 1) ms


def applied(r, t):  # newest version replica r has applied at time t
    v = 0
    for k in range(1, len(writes) + 1):
        if writes[k - 1] + LAG[r] <= t:
            v = k
    return v


def latest(t):
    return applied("L", t)


def pct(a, b):
    x = (a * 1000 + b // 2) // b
    return str(x // 10) + "." + str(x % 10) + "%"


print("== 1. 143 reads, one every 7 ms from t=0 to t=994 ==")
policies = [("strong: leader only", lambda i: "L"), ("eventual: F1 only", lambda i: "F1"), ("eventual: F2 only", lambda i: "F2"),
            ("eventual: round robin F1/F2", lambda i: "F2" if i % 2 else "F1")]
for name, pick in policies:
    stale = total = worst = leader_reads = 0
    for i, t in enumerate(range(0, 1000, 7)):
        r = pick(i)
        seen, want = applied(r, t), latest(t)
        total += 1
        if r == "L":
            leader_reads += 1
        if seen < want:
            stale += 1
            worst = max(worst, t - writes[seen])  # ms since the first write it misses
    print(name.ljust(28) + " stale " + str(stale).rjust(3) + " of " + str(total) + " (" + pct(stale, total) + "), worst " +
          str(worst).rjust(3) + " ms behind, leader serves " + pct(leader_reads, total))

print("\\n== 2. Read-your-writes: the writer reads 40 ms after each of its 10 writes ==")
for session in (False, True):
    stale = forwarded = 0
    for k in range(1, 11):
        t, r = writes[k - 1] + 40, "F1" if k % 2 else "F2"
        seen = applied(r, t)
        if session and seen < k:  # replica is behind the session token
            forwarded += 1
            seen = applied("L", t)
        if seen < k:
            stale += 1
    label = "with session token (min version)" if session else "plain follower reads"
    print(label.ljust(33) + ": " + str(stale) + " of 10 missed the write just made, " + str(forwarded) + " sent to leader")

print("\\n== 3. Monotonic reads: one client reads every 20 ms ==")
for sticky in (False, True):
    back, last, trail = 0, 0, []
    for i, t in enumerate(range(0, 1000, 20)):
        r = "F1" if sticky or i % 2 == 0 else "F2"
        seen = applied(r, t)
        if seen < last:
            back += 1
            if len(trail) < 3:
                trail.append("t=" + str(t) + " v" + str(last) + "->v" + str(seen))
        last = seen
    label = "sticky to F1" if sticky else "round robin F1/F2"
    print(label.ljust(18) + ": went back in time " + str(back) + " times" + (" (" + ", ".join(trail) + ")" if trail else ""))

print("\\n== 4. Convergence after the last write (t=900) ==")
for t in range(900, 1021, 30):
    vs = [r + "=v" + str(applied(r, t)) for r in ("L", "F1", "F2")]
    same = len({applied(r, t) for r in ("L", "F1", "F2")}) == 1
    print("t=" + str(t) + "ms " + " ".join(vs) + ("  converged" if same else ""))` },
        ],
      },
    ],
  },
  {
    title: `What is the difference between optimistic and pessimistic locking?`,
    difficulty: "medium",
    seoDescription: `Optimistic vs pessimistic locking with measured results: lost updates, SELECT FOR UPDATE, version columns, retries under contention, and when to use each.`,
    description: `**Question presented to candidate:**
"Two requests try to update the same row at the same time. What is the difference between optimistic and pessimistic locking for handling that, how would you implement each, and when would you pick one over the other?"

**What a strong answer should cover:**
- The problem both solve: the **lost update** (read, modify, write by two transactions; one write silently overwrites the other)
- **Pessimistic**: take a lock before reading (\`SELECT ... FOR UPDATE\`); others wait until commit; risks are waiting, **deadlocks** and locks held by slow clients
- **Optimistic**: read a **version** (or ETag), write with \`WHERE version = :v\`; if zero rows changed, someone else won, so re-read and retry; risks are wasted work and retry storms under contention
- The deciding factor is **contention**: rare conflicts favour optimistic (no waiting, no lock held during think time); hot rows favour pessimistic (no wasted retries)
- Neighbours worth naming: a single atomic \`UPDATE ... SET n = n - 1 WHERE n > 0\` that needs neither, \`NOWAIT\` / \`SKIP LOCKED\`, HTTP \`If-Match\` returning 412, serializable isolation that aborts and must be retried

**Clarifying questions expected:**
- How often do two writers touch the same row, and how long is the gap between reading and writing (milliseconds of code, or minutes of a human editing a form)?
- Is the lock inside one database, or across services (which needs a distributed lock with fencing)?

**Code / implementation expected:** Optional — the SQL for both patterns, or a simulation comparing them under low and high contention; the example does the simulation.`,
    answer: `**Target Audience:** Beginners to databases and concurrency — you know what a row, a transaction and an \`UPDATE\` are; locking is built up from there.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). PostgreSQL defaults quoted below were read with \`SHOW\` on a local PostgreSQL 16.15 server; the SQL patterns are shown for illustration and were not executed in this run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Latencies, retry counts and lost updates come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A shop has one shared spreadsheet with the stock count for its best-selling mug: 100. Two assistants, Ana and Ben, each sell a mug at the same moment. Both open the sheet and read 100. Both subtract one and type 99. Both save. The sheet says 99, but two mugs left the shelf. Nobody saw an error. One sale simply vanished.

There are two classic ways to stop this:

- **The pessimist's way:** before reading, you take the only key to the spreadsheet. Ben has to wait until Ana is done. Nothing is ever lost, but Ben waits, and if Ana goes to lunch with the key, everybody waits.
- **The optimist's way:** anyone can read at any time, but the sheet records a version number. When you save, you say "save only if the version is still 17". Ana saves first and the version becomes 18; Ben's save is refused, he re-reads (now 99), subtracts one, and saves 98. Nobody waits, but Ben did his work twice.

📌 **Interview term: lost update** — two transactions read the same value, both modify it and both write back, so the second write overwrites the first without either noticing. It is the anomaly both locking styles exist to prevent.

📌 **Interview term: read-modify-write** — the pattern "read a value into the application, compute a new value, write it back". Every lost update comes from an unprotected read-modify-write.

## 2. Pessimistic Locking

You assume a conflict is likely, so you lock first and only then read.

~~~sql
BEGIN;
SELECT stock FROM products WHERE id = 42 FOR UPDATE;  -- row lock: other FOR UPDATE / UPDATE on this row now wait
-- application computes new value
UPDATE products SET stock = 99 WHERE id = 42;
COMMIT;                                               -- lock released, the next waiter proceeds
~~~

📌 **Interview term: pessimistic locking** — acquiring an exclusive lock on the data before reading it and holding it until the transaction ends, so no one else can change it in between.

📌 **Interview term: row-level lock** — a lock on individual rows rather than the whole table. In PostgreSQL, \`SELECT ... FOR UPDATE\` takes one; plain \`SELECT\` statements are not blocked by it, because PostgreSQL readers see a snapshot instead of waiting.

Useful variants:

- **\`FOR UPDATE NOWAIT\`** — fail immediately instead of waiting if the row is locked.
- **\`FOR UPDATE SKIP LOCKED\`** — skip rows that are locked and take the next ones; added in PostgreSQL 9.5 (2ndQuadrant and Michael Paquier write-ups of the 9.5 feature), and the standard way to build a job queue on a table where many workers each grab a different job.
- **\`lock_timeout\`** — a cap on how long a statement may wait for a lock. On the local PostgreSQL 16.15 server, \`SHOW lock_timeout\` returned \`0\`, which means wait forever, and \`SHOW deadlock_timeout\` returned \`1s\`: how long PostgreSQL waits before checking whether a wait is a deadlock.

📌 **Interview term: deadlock** — two transactions each hold a lock the other needs (A locks row 1 then wants row 2; B locks row 2 then wants row 1), so both wait forever. Databases detect this and abort one of them; the usual prevention is to always lock rows in the same order (for example by ascending id).

## 3. Optimistic Locking

You assume a conflict is unlikely, so you take no lock and instead **detect** a conflict at write time.

~~~sql
SELECT stock, version FROM products WHERE id = 42;     -- e.g. stock 100, version 17
-- application computes new value
UPDATE products
   SET stock = 99, version = version + 1
 WHERE id = 42 AND version = 17;                       -- compare-and-set
-- 1 row updated: success.  0 rows updated: someone else changed it -> re-read and retry
~~~

📌 **Interview term: optimistic locking (optimistic concurrency control)** — read without locking, remember a version, and make the write conditional on the version being unchanged; if it changed, the write affects nothing and the application retries from the read.

📌 **Interview term: compare-and-set (CAS)** — an atomic "write the new value only if the current value is still what I expect". The \`WHERE version = 17\` clause turns an \`UPDATE\` into a CAS.

📌 **Interview term: version column** — an integer that every successful write increments. ORMs automate it (JPA and Hibernate \`@Version\`, Rails \`lock_version\`).

The same idea appears outside databases:

- **HTTP:** the server sends an \`ETag\` with a resource; the client sends \`If-Match: <etag>\` with its update, and the server answers **412 Precondition Failed** if the resource has changed since (HTTP Semantics, RFC 9110). That is optimistic locking for REST APIs.
- **Key-value stores:** DynamoDB condition expressions, etcd transactions comparing a key's revision, and Redis \`WATCH\` with \`MULTI\`/\`EXEC\` are all compare-and-set.
- **Serializable isolation:** PostgreSQL at \`REPEATABLE READ\` or \`SERIALIZABLE\` aborts conflicting transactions with SQLSTATE \`40001\` (serialization_failure), and its documentation says applications must be prepared to retry them (PostgreSQL manual, Serialization Failure Handling). That is optimistic concurrency done by the database for you.

## 4. The Two Timelines

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Pessimistic: transaction B waits for the lock until A commits, then reads 99 and writes 98">
  <rect class="d-box" x="30" y="40" width="120" height="50" rx="8"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">A locks</text>
  <rect class="d-box" x="200" y="40" width="150" height="50" rx="8"/>
  <text class="d-text" x="275" y="70" text-anchor="middle">A reads 100</text>
  <rect class="d-box-accent" x="400" y="40" width="160" height="50" rx="8"/>
  <text class="d-text" x="480" y="70" text-anchor="middle">A writes 99</text>
  <rect class="d-box-muted" x="30" y="160" width="530" height="50" rx="8"/>
  <text class="d-sub" x="295" y="190" text-anchor="middle">B waits for the lock</text>
  <rect class="d-box-accent" x="600" y="160" width="140" height="50" rx="8"/>
  <text class="d-text" x="670" y="190" text-anchor="middle">B: 99 to 98</text>
  <line class="d-edge-dashed" x1="560" y1="90" x2="640" y2="156"/>
</svg>

Pessimistic: B cannot even read the row until A commits, so its read already sees 99. Nothing is wasted, but B spends A's whole transaction waiting.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Optimistic: A and B both read version 17; A writes first; B write finds version 18, updates zero rows and retries">
  <rect class="d-box" x="30" y="40" width="190" height="50" rx="8"/>
  <text class="d-text" x="125" y="70" text-anchor="middle">A reads v17</text>
  <rect class="d-box-accent" x="280" y="40" width="210" height="50" rx="8"/>
  <text class="d-text" x="385" y="70" text-anchor="middle">A writes, now v18</text>
  <rect class="d-box" x="30" y="160" width="190" height="50" rx="8"/>
  <text class="d-text" x="125" y="190" text-anchor="middle">B reads v17</text>
  <rect class="d-box-muted" x="280" y="160" width="210" height="50" rx="8"/>
  <text class="d-sub" x="385" y="190" text-anchor="middle">B write: 0 rows</text>
  <rect class="d-box-accent" x="550" y="160" width="190" height="50" rx="8"/>
  <text class="d-text" x="645" y="190" text-anchor="middle">B retries on v18</text>
  <line class="d-edge-dashed" x1="490" y1="185" x2="546" y2="185"/>
</svg>

Optimistic: both read at once and nobody waits, but B's first attempt is thrown away when it finds the version has moved.

## 5. Measured: Who Wins, and When

The example **"Lost updates, SELECT FOR UPDATE and version-checked writes under low and high contention"** runs buyers against one stock row (100). Each transaction reads (1 ms), thinks (5 ms unless stated), and writes (1 ms), on a simulated clock. "None" is a blind read-modify-write; "pessimistic" queues for a row lock before reading; "optimistic" retries whenever its version check fails.

| Scenario | Strategy | Lost updates | Failed attempts | Avg latency | Slowest |
| :--- | :--- | ---: | ---: | ---: | ---: |
| 1. Low contention (10 buyers, 20 ms apart) | none | 0 | 0 | 7.0 ms | 7 ms |
| | pessimistic | 0 | 0 | 7.0 ms | 7 ms |
| | optimistic | 0 | 0 | 7.0 ms | 7 ms |
| 2. Hot row (10 buyers at once) | none | **9** | 0 | 7.0 ms | 7 ms |
| | pessimistic | 0 | 0 | 38.5 ms | 70 ms |
| | optimistic | 0 | **45** | 38.5 ms | 70 ms |
| 3. Hotter row (50 buyers at once) | none | **49** | 0 | 7.0 ms | 7 ms |
| | pessimistic | 0 | 0 | 178.5 ms | 350 ms |
| | optimistic | 0 | **1225** | 178.5 ms | 350 ms |

Reading the table:

- **Without any control, concurrency silently loses data.** Ten simultaneous buyers left the stock at 99 instead of 90.
- **With low contention, both strategies cost nothing.** No one ever overlapped, so there was no waiting and no retry.
- **On a hot row, the latency is the same, the work is not.** Only one transaction can win at a time either way, so both took 70 ms to finish everyone. But optimistic did it with 45 failed attempts for 10 buyers and **1225 for 50**: every round, all but one retry, which grows with the square of the number of contenders (n(n-1)/2). Each failed attempt is a real read, real application work and a real write sent to the database.

Now the case optimistic locking was invented for: **a slow holder**. Buyer 1 reads the row and then stalls for 30 s (a user filling in a form, a paused process); nine other buyers arrive every 20 ms.

| Scenario 4: buyer 1 stalls 30 s | Lost updates | Buyer 1 finished after | Slowest other buyer |
| :--- | ---: | ---: | ---: |
| none | **9** | 30,002 ms | 7 ms |
| pessimistic | 0 | 30,002 ms | **29,999 ms** |
| optimistic | 0 | 60,004 ms | **7 ms** |

With a lock, one slow client blocked everyone for half a minute. With versions, the other nine finished in 7 ms each, and only the slow client paid: its write failed once, and in the simulation it re-did its 30 s of thinking. A real form would instead show "this item changed, please review" and let the user resubmit quickly.

## 6. Side by Side

| | Pessimistic | Optimistic |
| :--- | :--- | :--- |
| Assumes | Conflicts are likely | Conflicts are rare |
| Mechanism | Lock before read, hold until commit | Version or ETag check at write time |
| On conflict | Wait (or fail fast with NOWAIT) | Write affects 0 rows; re-read and retry |
| Cost under low contention | A lock acquisition per transaction | Essentially nothing |
| Cost under high contention | Queueing, but no wasted work | Retries grow fast (1225 for 50 contenders in the run) |
| Slow or crashed holder | Blocks everyone until timeout | Blocks no one |
| Spans user think time or HTTP requests | No (you cannot hold a DB lock across requests) | Yes (carry the version or ETag to the client) |
| Failure modes | Deadlocks, lock waits, exhausted connection pools | Retry storms, starvation of a slow writer |

## 7. Often You Need Neither

If the new value can be computed **inside the database**, a single atomic statement avoids the read-modify-write altogether:

~~~sql
UPDATE products SET stock = stock - 1 WHERE id = 42 AND stock > 0;
-- 1 row: sold.  0 rows: sold out.  No lost update, no explicit lock, no retry loop.
~~~

The database still locks the row for the instant of the update, but nobody holds it across application code. Reach for explicit locking only when the decision genuinely needs application logic between the read and the write (pricing rules, calls to other services, a human). The [ticket booking](/interview-question/how-would-you-design-a-ticket-booking-system-like-ticketmaster) and [hotel reservation](/interview-question/how-would-you-design-a-hotel-reservation-system-572u) designs use exactly this choice for seats and rooms.

## 8. Across Machines: Distributed Locks

When the thing being protected is not a single database row (a file in object storage, a job that must run once), teams reach for a distributed lock in Redis, ZooKeeper or etcd. That is pessimistic locking with an extra danger: the lock is a **lease** that can expire while its holder is paused, so two holders can believe they own it. Martin Kleppmann's post "How to do distributed locking" (February 2016) argues that a lock used for correctness needs a **fencing token**, a number that increases with each grant and that the storage checks, which is optimistic checking added to a pessimistic lock. The [leader election](/interview-question/what-is-leader-election-in-distributed-systems) page shows a fencing token rejecting a stale leader in a run.

## 9. Verified: Running the Code

Pessimistic mode is a FIFO queue on the row lock: each buyer is granted the lock at \`max(arrival, previous commit)\`. Optimistic and "none" modes are an event simulation: each read records \`(stock, version)\`, and each write either commits (version unchanged) or is counted as a failed attempt and scheduled to re-read 1 ms later. Ties at the same millisecond are ordered by event type and buyer number, so the run is deterministic.

The key part:

~~~js
if (e.kind === 1) { seen[e.i] = [stock, version]; ev.push({ t: e.t + think[e.i] + 1, kind: 0, i: e.i }); continue; }
if (!check || seen[e.i][1] === version) { stock = seen[e.i][0] - 1; version++; done[e.i] = e.t; }
else { retries++; ev.push({ t: e.t + 1, kind: 1, i: e.i }); } // version moved: re-read, think again, retry
~~~

What the simulation stands for: the row and its version live in memory instead of PostgreSQL, the lock queue is FIFO, and lock acquisition and retries are free apart from the work they repeat. A real database adds lock-manager overhead, network round trips and possibly deadlock detection; none of that is modelled.

Full output (identical in Node and Python):

~~~text
== 1. Low contention: 10 buyers, one every 20 ms, think 5 ms ==
  none        stock  90, lost updates  0, failed attempts    0, avg latency 7.0 ms, slowest 7 ms
  pessimistic stock  90, lost updates  0, failed attempts    0, avg latency 7.0 ms, slowest 7 ms
  optimistic  stock  90, lost updates  0, failed attempts    0, avg latency 7.0 ms, slowest 7 ms
== 2. Hot row: 10 buyers at t=0, think 5 ms ==
  none        stock  99, lost updates  9, failed attempts    0, avg latency 7.0 ms, slowest 7 ms
  pessimistic stock  90, lost updates  0, failed attempts    0, avg latency 38.5 ms, slowest 70 ms
  optimistic  stock  90, lost updates  0, failed attempts   45, avg latency 38.5 ms, slowest 70 ms
== 3. Hotter row: 50 buyers at t=0, think 5 ms ==
  none        stock  99, lost updates 49, failed attempts    0, avg latency 7.0 ms, slowest 7 ms
  pessimistic stock  50, lost updates  0, failed attempts    0, avg latency 178.5 ms, slowest 350 ms
  optimistic  stock  50, lost updates  0, failed attempts 1225, avg latency 178.5 ms, slowest 350 ms
== 4. Buyer 1 stalls 30 s holding its read; 9 others every 20 ms from t=10 ==
  none        stock  99, lost updates  9, failed attempts    0, buyer 1 done after 30002 ms, slowest other buyer 7 ms
  pessimistic stock  90, lost updates  0, failed attempts    0, buyer 1 done after 30002 ms, slowest other buyer 29999 ms
  optimistic  stock  90, lost updates  0, failed attempts    1, buyer 1 done after 60004 ms, slowest other buyer 7 ms
~~~

## 10. Edge Cases Worth Knowing

- **Retry storms.** Under contention, optimistic retries all collide again; add a retry limit and exponential backoff with jitter, or switch the hot path to a lock or an atomic update.
- **Starvation.** A long optimistic transaction can lose to short ones forever, as buyer 1 did once in the run; cap retries and fall back to a lock.
- **Timestamps as versions.** Using \`updated_at\` as the version breaks when two writes land in the same clock tick or clocks move backwards; use an integer that only increments.
- **Locks and connection pools.** A pessimistic lock pins a database connection for the whole transaction; slow lock holders can exhaust the pool and take down unrelated requests. See [connection pooling](/interview-question/what-is-database-connection-pooling).
- **Check the affected-row count.** An optimistic \`UPDATE\` that matches zero rows is not an error to the database; if the code ignores the count, the conflict is silently ignored too.
- **Lock order.** Pessimistic code that locks several rows must lock them in a consistent order to avoid deadlocks.

## Common Pitfalls

- **Doing a read-modify-write with no protection "because it is fast".** Ten simultaneous buyers lost 9 of 10 updates in the run.
- **Holding a database lock across a user's think time.** One 30 s stall made every other buyer wait 29,999 ms; use a version check for anything that spans HTTP requests.
- **Using optimistic locking on a hot row.** 50 contenders produced 1225 failed attempts; use a lock, a queue, or an atomic \`UPDATE ... SET n = n - 1\`.
- **Forgetting to retry the whole transaction.** After a version conflict or a \`40001\` error, you must re-read and recompute, not just resend the same write.
- **Assuming \`SELECT ... FOR UPDATE\` blocks plain readers.** In PostgreSQL it does not; ordinary \`SELECT\`s keep reading their snapshot.
- **Using a distributed lock without a fencing token** when correctness depends on it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">Both solve the <strong style="color:#ffca28;">lost update</strong>: two transactions read 100, both write 99, and one sale disappears. In my simulation, ten simultaneous buyers with no protection left the stock at 99 instead of 90.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pessimistic:</strong> <span style="color:#f0e2c8;">Lock first, then read: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT ... FOR UPDATE</code>, and others wait until commit. No wasted work, but waiting, possible <strong style="color:#ffca28;">deadlocks</strong>, and a slow holder blocks everyone: one client stalling 30 s made the other buyers wait 29,999 ms.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Optimistic:</strong> <span style="color:#f0e2c8;">Read a <strong style="color:#ffca28;">version</strong>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... WHERE id = ? AND version = ?</code>; zero rows updated means someone else won, so re-read and retry. Nobody waits, which is why it suits HTTP flows (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ETag</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">If-Match</code>, 412 on conflict) and long think times: in the stall case the others finished in 7 ms.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The deciding factor:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Contention.</strong> With rare conflicts both cost nothing and optimistic holds no locks. On a hot row the latency was the same either way, but optimistic burned 45 failed attempts for 10 buyers and 1225 for 50, growing as n squared.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Often neither:</strong> <span style="color:#f0e2c8;">If the database can compute the new value, use one atomic statement: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... SET stock = stock - 1 WHERE stock &gt; 0</code>. And across services, a distributed lock needs a <strong style="color:#ffca28;">fencing token</strong> so a paused holder cannot write after its lease expired.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you implement optimistic locking without a version column?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare on the values you read: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE id = 42 AND stock = 100</code>. It works but can suffer the ABA problem (the value changed and changed back) and gets clumsy with many columns, so an integer version incremented on every write is the usual choice; ORMs like Hibernate with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Version</code> do it automatically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if two pessimistic transactions deadlock?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The database detects the cycle (PostgreSQL checks after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deadlock_timeout</code>, 1 s by default) and aborts one transaction with an error; the application must retry it. Prevent most deadlocks by locking rows in a consistent order, keeping transactions short, and setting a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lock_timeout</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use SKIP LOCKED?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For work queues in a table: each worker runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1</code> and gets a different unlocked job instead of everyone queueing on the first row. It was added in PostgreSQL 9.5; it deliberately gives an inconsistent view, so it is for queues, not for general reads.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is SERIALIZABLE isolation optimistic or pessimistic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL it is optimistic: Serializable Snapshot Isolation lets transactions run without blocking, tracks dangerous read-write dependencies, and aborts one with SQLSTATE <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">40001</code> at conflict. So the application needs the same retry loop as with version columns. Some other databases implement serializable with two-phase locking, which is pessimistic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this work in a REST API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">GET returns the resource with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ETag</code> (a version or hash). The client sends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PUT</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">If-Match: "&lt;etag&gt;"</code>; if the resource changed in between, the server returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">412 Precondition Failed</code> and the client re-fetches and merges. Servers can require the header and answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">428 Precondition Required</code> when it is missing.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Lost update | Two read-modify-writes overlap; one write silently overwrites the other |
| Read-modify-write | Read into the app, compute, write back |
| Pessimistic locking | Lock before reading, hold until commit |
| Row-level lock | A lock on individual rows, such as \`SELECT ... FOR UPDATE\` |
| Deadlock | Two transactions each wait for a lock the other holds |
| Optimistic locking | No lock; the write succeeds only if the version is unchanged |
| Compare-and-set (CAS) | Atomic write conditional on the current value or version |
| Version column | Integer incremented by every write, used for the CAS check |

**Conclusion:** Optimistic and pessimistic locking prevent the same bug, the lost update that erased 9 of 10 sales in the run, with opposite bets. Pessimistic locking bets on conflict: lock first, never waste work, but make others wait, which turned one 30 s stall into a 29,999 ms wait for everyone else. Optimistic locking bets on peace: nobody waits and nothing is held across think time, but every conflict is thrown-away work, 1225 failed attempts once 50 buyers hit the same row. Choose by contention and by how long the gap between read and write is, and remember the third option: when the database can compute the new value itself, a single atomic \`UPDATE\` needs no explicit lock at all.`,
    examples: [
      {
        label: `Lost updates, SELECT FOR UPDATE and version-checked writes under low and high contention`,
        variants: [
          { tech: "node", code: `// Many buyers decrement one stock row (stock = 100). Each transaction reads the row (1 ms),
// thinks for T ms, then writes stock - 1 (1 ms). Fake clock in ms, deterministic.
//  none        : read, then blind UPDATE stock = <value read> - 1          (lost updates)
//  pessimistic : SELECT ... FOR UPDATE first; others queue until COMMIT    (waiting)
//  optimistic  : UPDATE ... SET stock = s - 1, version = v + 1 WHERE version = v; 0 rows -> re-read and retry
function pessimistic(arr, think) {
  const order = arr.map((a, i) => i).sort((x, y) => arr[x] - arr[y] || x - y);
  let free = 0, stock = 100;
  const done = [];
  for (const i of order) {
    const granted = Math.max(arr[i], free); // lock granted when the previous holder commits
    free = granted + 1 + think[i] + 1;
    done[i] = free; stock--;
  }
  return { stock, retries: 0, done };
}
function optimistic(arr, think, check) {
  let stock = 100, version = 0, retries = 0;
  const ev = arr.map((a, i) => ({ t: a + 1, kind: 1, i })); // kind 0 = write attempt, 1 = read finishes
  const seen = [], done = [];
  while (ev.length) {
    let b = 0;
    for (let j = 1; j < ev.length; j++) {
      const x = ev[j], y = ev[b];
      if (x.t < y.t || (x.t === y.t && (x.kind < y.kind || (x.kind === y.kind && x.i < y.i)))) b = j;
    }
    const e = ev.splice(b, 1)[0];
    if (e.kind === 1) { seen[e.i] = [stock, version]; ev.push({ t: e.t + think[e.i] + 1, kind: 0, i: e.i }); continue; }
    if (!check || seen[e.i][1] === version) { stock = seen[e.i][0] - 1; version++; done[e.i] = e.t; }
    else { retries++; ev.push({ t: e.t + 1, kind: 1, i: e.i }); } // version moved: re-read, think again, retry
  }
  return { stock, retries, done };
}
function report(name, arr, think, stall) {
  console.log("== " + name + " ==");
  const runs = [["none", optimistic(arr, think, false)], ["pessimistic", pessimistic(arr, think)], ["optimistic", optimistic(arr, think, true)]];
  for (const [label, r] of runs) {
    const lat = r.done.map((d, i) => d - arr[i]);
    const lost = r.stock - (100 - arr.length);
    let tail;
    if (stall) tail = "buyer 1 done after " + lat[0] + " ms, slowest other buyer " + Math.max(...lat.slice(1)) + " ms";
    else {
      const sum = lat.reduce((x, y) => x + y, 0), avg10 = Math.floor((sum * 10 + Math.floor(lat.length / 2)) / lat.length);
      tail = "avg latency " + Math.floor(avg10 / 10) + "." + (avg10 % 10) + " ms, slowest " + Math.max(...lat) + " ms";
    }
    console.log("  " + label.padEnd(12) + "stock " + String(r.stock).padStart(3) + ", lost updates " + String(lost).padStart(2) +
      ", failed attempts " + String(r.retries).padStart(4) + ", " + tail);
  }
}
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i));
report("1. Low contention: 10 buyers, one every 20 ms, think 5 ms", range(10, (i) => i * 20), range(10, () => 5));
report("2. Hot row: 10 buyers at t=0, think 5 ms", range(10, () => 0), range(10, () => 5));
report("3. Hotter row: 50 buyers at t=0, think 5 ms", range(50, () => 0), range(50, () => 5));
report("4. Buyer 1 stalls 30 s holding its read; 9 others every 20 ms from t=10", range(10, (i) => (i === 0 ? 0 : 10 + (i - 1) * 20)), range(10, (i) => (i === 0 ? 30000 : 5)), true);` },
          { tech: "python", code: `# Many buyers decrement one stock row (stock = 100). Each transaction reads the row (1 ms),
# thinks for T ms, then writes stock - 1 (1 ms). Fake clock in ms, deterministic.
#  none        : read, then blind UPDATE stock = <value read> - 1          (lost updates)
#  pessimistic : SELECT ... FOR UPDATE first; others queue until COMMIT    (waiting)
#  optimistic  : UPDATE ... SET stock = s - 1, version = v + 1 WHERE version = v; 0 rows -> re-read and retry


def pessimistic(arr, think):
    order = sorted(range(len(arr)), key=lambda i: (arr[i], i))
    free, stock, done = 0, 100, [0] * len(arr)
    for i in order:
        granted = max(arr[i], free)  # lock granted when the previous holder commits
        free = granted + 1 + think[i] + 1
        done[i] = free
        stock -= 1
    return stock, 0, done


def optimistic(arr, think, check):
    stock, version, retries = 100, 0, 0
    ev = [(a + 1, 1, i) for i, a in enumerate(arr)]  # (time, kind, buyer): kind 0 = write attempt, 1 = read finishes
    seen, done = [None] * len(arr), [0] * len(arr)
    while ev:
        e = min(ev)
        ev.remove(e)
        t, kind, i = e
        if kind == 1:
            seen[i] = (stock, version)
            ev.append((t + think[i] + 1, 0, i))
            continue
        if not check or seen[i][1] == version:
            stock, version, done[i] = seen[i][0] - 1, version + 1, t
        else:
            retries += 1
            ev.append((t + 1, 1, i))  # version moved: re-read, think again, retry
    return stock, retries, done


def report(name, arr, think, stall=False):
    print("== " + name + " ==")
    runs = [("none", optimistic(arr, think, False)), ("pessimistic", pessimistic(arr, think)), ("optimistic", optimistic(arr, think, True))]
    for label, (stock, retries, done) in runs:
        lat = [d - a for d, a in zip(done, arr)]
        lost = stock - (100 - len(arr))
        if stall:
            tail = "buyer 1 done after " + str(lat[0]) + " ms, slowest other buyer " + str(max(lat[1:])) + " ms"
        else:
            avg10 = (sum(lat) * 10 + len(lat) // 2) // len(lat)
            tail = "avg latency " + str(avg10 // 10) + "." + str(avg10 % 10) + " ms, slowest " + str(max(lat)) + " ms"
        print("  " + label.ljust(12) + "stock " + str(stock).rjust(3) + ", lost updates " + str(lost).rjust(2) +
              ", failed attempts " + str(retries).rjust(4) + ", " + tail)


report("1. Low contention: 10 buyers, one every 20 ms, think 5 ms", [i * 20 for i in range(10)], [5] * 10)
report("2. Hot row: 10 buyers at t=0, think 5 ms", [0] * 10, [5] * 10)
report("3. Hotter row: 50 buyers at t=0, think 5 ms", [0] * 50, [5] * 50)
report("4. Buyer 1 stalls 30 s holding its read; 9 others every 20 ms from t=10",
       [0 if i == 0 else 10 + (i - 1) * 20 for i in range(10)], [30000 if i == 0 else 5 for i in range(10)], True)` },
        ],
      },
    ],
  },
  {
    title: `What is a write-ahead log (WAL)?`,
    difficulty: "medium",
    seoDescription: `The write-ahead log from zero: log before data, LSNs, fsync and commit, crash recovery by redo, torn writes, checkpoints, group commit, and its other uses.`,
    description: `**Question presented to candidate:**
"What is a write-ahead log? Explain why databases write to a log before changing their data files, what happens during crash recovery, and where else you see the same idea in system design."

**What a strong answer should cover:**
- The rule: a change is recorded in an append-only log, and the log is **flushed to disk (fsync) before** the transaction is reported committed and before the changed data pages may be written
- Why it works: a crash can lose memory and half-written pages, but **recovery replays the log** (redo committed changes, discard or undo uncommitted ones) to reach a consistent state
- Why it is fast: commits become **sequential appends** instead of random page writes; pages are written lazily; **group commit** shares one fsync across many transactions
- Details that show depth: **LSNs** and page LSNs make redo idempotent, **checksums** detect a torn last record, **checkpoints** bound recovery time and let old log be recycled
- The same log powers **replication**, point-in-time recovery and **change data capture**; the idea reappears in LSM-tree commit logs, Raft logs and Kafka
- Knobs and trade-offs: PostgreSQL \`synchronous_commit\`, \`full_page_writes\`, checkpoint frequency vs recovery time

**Code / implementation expected:** Optional — a small log with checksummed records and a redo recovery; the example builds one and crashes it.`,
    answer: `**Target Audience:** Beginners to database internals — you know a database stores data on disk and that a server can crash; everything else is defined as we go.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). PostgreSQL settings were read with \`SHOW\` on a local PostgreSQL 16.15 server; SQLite behaviour was checked with SQLite 3.45.1 from Python.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Byte counts and recovery steps come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A small bank keeps a big ledger: one page per customer, each showing the balance. Moving 100 from Alice to Bob means changing two pages: Alice's (minus 100) and Bob's (plus 100).

The clerk changes Alice's page. Before reaching Bob's page, the lights go out. When they come back, the ledger says Alice has 900 and Bob has 1000. One hundred has vanished, and nothing in the ledger tells anyone what was in progress.

So the bank adds a rule. Before touching any ledger page, the clerk writes a line in a small daybook: "transfer 1: Alice 900, Bob 1100", and then "transfer 1: done". Only then may the ledger pages be changed, whenever convenient. After a blackout, the clerk reads the daybook: every transfer marked "done" is re-applied to the ledger; anything without "done" is ignored. The ledger always ends up correct.

The daybook is a **write-ahead log**. It is small, written strictly in order, and it is the source of truth about what has been committed.

📌 **Interview term: write-ahead log (WAL)** — an append-only file of change records that a storage engine writes and flushes to durable storage **before** it reports a transaction committed and before it writes the changed data pages. After a crash, replaying the log restores every committed change.

📌 **Interview term: durability** — the D in ACID: once the database says "committed", the change survives a crash or power loss. The WAL is how almost every database delivers it.

## 2. The Rule, Step by Step

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Write path: the change is appended to the log and flushed, then the commit is acknowledged; data pages are written later in the background">
  <defs>
    <marker id="sd07q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="140" height="60" rx="10"/>
  <text class="d-text" x="100" y="76" text-anchor="middle">client</text>
  <rect class="d-box" x="300" y="40" width="160" height="60" rx="10"/>
  <text class="d-text" x="380" y="76" text-anchor="middle">memory pages</text>
  <rect class="d-box-accent" x="580" y="40" width="150" height="60" rx="10"/>
  <text class="d-text" x="655" y="76" text-anchor="middle">WAL on disk</text>
  <rect class="d-box-muted" x="300" y="230" width="160" height="60" rx="10"/>
  <text class="d-text" x="380" y="266" text-anchor="middle">data files</text>
  <line class="d-edge" x1="170" y1="70" x2="296" y2="70" marker-end="url(#sd07q4-arrow)"/>
  <text class="d-sub" x="233" y="55" text-anchor="middle">1 change</text>
  <line class="d-edge-accent" x1="460" y1="70" x2="576" y2="70" marker-end="url(#sd07q4-arrow)"/>
  <text class="d-sub" x="518" y="55" text-anchor="middle">2 append</text>
  <line class="d-edge-accent" x1="655" y1="100" x2="655" y2="160"/>
  <line class="d-edge-accent" x1="655" y1="160" x2="100" y2="160"/>
  <line class="d-edge-accent" x1="100" y1="160" x2="100" y2="104" marker-end="url(#sd07q4-arrow)"/>
  <text class="d-sub" x="240" y="148" text-anchor="middle">3 fsync, then commit ok</text>
  <line class="d-edge-dashed" x1="380" y1="100" x2="380" y2="226" marker-end="url(#sd07q4-arrow)"/>
  <text class="d-sub" x="396" y="205" text-anchor="start">4 later: checkpoint</text>
</svg>

The commit is acknowledged only after step 3. Step 4 can happen seconds or minutes later, because the log already holds everything needed to redo it.

1. The transaction changes pages **in memory** (the buffer pool) and appends a record describing each change to the log buffer.
2. At **COMMIT**, the engine appends a commit record and forces the log to disk with \`fsync\` (or \`fdatasync\`).
3. Only when the flush returns does the client get "committed".
4. The changed data pages stay "dirty" in memory and are written to the data files later, in the background, in any order.

📌 **Interview term: fsync** — the operating-system call that forces a file's buffered writes onto the physical device and waits until they are there. Until it returns, a power failure can lose the data even though \`write()\` succeeded. On the local PostgreSQL 16.15 server, \`SHOW wal_sync_method\` returned \`fdatasync\`.

📌 **Interview term: LSN (log sequence number)** — the position of a record in the log, always increasing. In PostgreSQL it is a byte position printed like \`1/4BB6E748\` (from \`pg_current_wal_lsn()\` on the local server). Every data page also stores the LSN of the last change applied to it, the **page LSN**.

**Why not just write the data pages directly?** Three reasons:

- **Atomicity across pages.** A transaction touches several pages in different places. There is no disk operation that writes several places atomically; there is one that appends to one place in order.
- **Sequential beats random.** The log is one file written front to back; data pages are scattered. Appending is much cheaper for disks and still cheaper for SSDs than many small random writes.
- **Write once, flush later.** A hot page changed 1,000 times between checkpoints is written to the data file once, not 1,000 times; only the small log records are flushed per commit.

## 3. Crash Recovery: What Happens After the Lights Go Out

The example **"A write-ahead log from scratch: crash, redo recovery, torn record, checkpoint, group commit"** stores three balances (1,000 each) as pages and writes log records of the form \`[lsn][length][text][crc32]\`.

Without a log, a transfer interrupted between its two page writes left **total 2900: 100 vanished**.

With the log, it runs three transfers: tx1 (alice → bob, 100) and tx2 (bob → carol, 50) commit; alice's page happens to be flushed early. tx3 (carol → alice, 30) is being written when the power fails: only its first record reaches the disk, and that record is torn. At restart the data files say alice=900, bob=1000, carol=1000 (total 2900) and the log is 175 bytes long. Recovery then:

| Step | Record | Decision |
| :--- | :--- | :--- |
| Scan | lsn 7 (tx3) | **checksum mismatch: torn write, stop scanning here** |
| Redo | lsn 1: tx1 SET alice 900 | page LSN already ≥ 1: **skip** |
| Redo | lsn 2: tx1 SET bob 1100 | **redo** |
| Redo | lsn 4: tx2 SET bob 1050 | **redo** |
| Redo | lsn 5: tx2 SET carol 1050 | **redo** |

Result: alice=900, bob=1050, carol=1050, **total 3000**. tx3 never committed (its COMMIT record never reached the disk), so its client never got a success, and it simply disappears. Running recovery a second time redid 0 records and skipped 4: recovery is safe to repeat if the machine crashes again in the middle of it.

📌 **Interview term: redo** — re-applying a logged change to a data page during recovery. Comparing the record LSN with the page LSN makes it **idempotent**: a change already on the page is skipped.

📌 **Interview term: undo** — reverting a change that an uncommitted transaction managed to write to a data page. Engines that let dirty pages of uncommitted transactions reach disk (a **steal** policy) need undo; the example uses the simpler no-steal policy and needs only redo.

📌 **Interview term: torn write** — a write interrupted part-way, leaving a mix of old and new bytes. A **checksum** on every log record lets recovery recognise the torn tail and stop there.

The classic recovery algorithm in real databases is **ARIES** (C. Mohan et al., ACM Transactions on Database Systems, March 1992): an analysis pass, a redo pass that "repeats history" for all logged changes, then an undo pass for transactions that never committed, with page LSNs tying each page to the log.

## 4. Checkpoints: Keeping Recovery Short

If recovery always started at the beginning of the log, both the log and the restart time would grow forever. A **checkpoint** writes all dirty pages to the data files and records "everything before this LSN is on disk". Recovery starts from the last checkpoint, and older log can be recycled.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="A log with a checkpoint: records before it can be recycled, recovery replays only the records after it">
  <rect class="d-box-muted" x="30" y="60" width="440" height="60" rx="8"/>
  <text class="d-sub" x="250" y="96" text-anchor="middle">before checkpoint: recyclable</text>
  <rect class="d-box-accent" x="490" y="40" width="40" height="100" rx="6"/>
  <text class="d-text" x="510" y="170" text-anchor="middle">checkpoint</text>
  <rect class="d-box" x="550" y="60" width="180" height="60" rx="8"/>
  <text class="d-text" x="640" y="96" text-anchor="middle">replay these</text>
</svg>

In the run, 3,000 transfers produced a 255,699-byte log of 9,001 records, with a checkpoint after transfer 2,500. Recovery scanned only **1,500 records** (the last 500 transfers, redoing 1,000 SET records), and the **212,511 bytes** before the checkpoint could be recycled. Without the checkpoint it would read all 9,001.

📌 **Interview term: checkpoint** — flushing dirty pages and recording the log position from which recovery must start, which bounds both recovery time and log size.

The trade-off is real: frequent checkpoints mean faster recovery but more page writes during normal operation. On the local PostgreSQL 16.15 server, \`SHOW\` returned \`checkpoint_timeout = 5min\` and \`max_wal_size = 1GB\` (a checkpoint happens when either is reached), and \`wal_segment_size = 16MB\`, the size of each WAL file.

PostgreSQL also has \`full_page_writes\` (\`on\` on the local server): the first change to a page after each checkpoint logs the whole page, because a crash during an operating-system page write can leave a page that is half old and half new, and row-level log records alone cannot repair it (PostgreSQL manual, WAL configuration).

## 5. Making Commits Cheap: Group Commit

Every commit waits for an fsync, and an fsync is the slowest step on the path. **Group commit** lets transactions that commit at about the same time share one flush. With an assumed 2 ms per fsync, the run computed:

| Commits per fsync | Flushes for 1,000 commits | Time spent flushing | Commit ceiling |
| ---: | ---: | ---: | ---: |
| 1 | 1,000 | 2,000 ms | 500 /s |
| 10 | 100 | 200 ms | 5,000 /s |
| 50 | 20 | 40 ms | 25,000 /s |

📌 **Interview term: group commit** — batching the log flushes of several concurrent transactions into one fsync, so the durable-commit rate is no longer limited to one transaction per flush.

The other lever is to relax durability on purpose. PostgreSQL \`synchronous_commit\` (\`on\` by default, confirmed on the local server) can be set to \`off\` per transaction: commit returns before the flush, so a crash can lose the last few commits (the manual bounds the delay at three times \`wal_writer_delay\`, which was \`200ms\` on the local server), but the database is never left inconsistent. That is a fair trade for, say, analytics events, not for payments.

## 6. The Same Log, Many Jobs

Once every change exists as an ordered log, other uses follow:

- **Replication.** Ship the WAL to followers and have them replay it; PostgreSQL streaming replication works this way (\`wal_level = replica\` on the local server). See [database replication](/interview-question/what-is-database-replication).
- **Point-in-time recovery.** Archive WAL files next to a base backup and replay up to any moment, for example to just before someone ran a bad \`DELETE\`.
- **Change data capture.** Read the log to publish every change to a search index, cache or event stream without dual writes; see [CDC with Debezium](/interview-question/how-does-cdc-with-debezium-keep-search-and-cache-in-sync-with-postgres) and the [outbox pattern](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure).
- **LSM-tree databases.** Cassandra and RocksDB append each write to a commit log before putting it in an in-memory table, so the memory table can be rebuilt after a crash.
- **SQLite.** \`PRAGMA journal_mode=WAL\` switches SQLite to a WAL. In a quick check with SQLite 3.45.1, one committed insert created a \`t.db-wal\` file of 12,392 bytes next to the database, and \`PRAGMA wal_checkpoint(TRUNCATE)\` copied it into the database and shrank it to 0 bytes.
- **Consensus and messaging.** A Raft log is a replicated WAL (see [leader election](/interview-question/what-is-leader-election-in-distributed-systems)), and Kafka is a log offered as a product, see [Kafka vs SQS](/interview-question/kafka-vs-sqs-how-do-you-choose-for-an-event-driven-system-in-2025). Event sourcing makes the log the primary data, see [event sourcing and CQRS](/interview-question/what-are-event-sourcing-and-cqrs).

## 7. Verified: Running the Code

Each record is \`[lsn u32][length u16][UTF-8 text][crc32]\`, built with Node's \`zlib.crc32\` and Python's \`zlib.crc32\`, which agree byte for byte. A transfer appends two \`SET\` records and a \`COMMIT\` record and updates pages only in memory; \`flushPage\` copies one page, with its page LSN, to the "disk". The crash is simulated by keeping only part of the log and flipping one byte of the last record. Recovery scans until the first bad or incomplete record, collects committed transaction ids, and redoes each committed \`SET\` whose LSN is newer than the page LSN.

The key part:

~~~js
const want = this.log.readUInt32BE(off + 6 + len), got = zlib.crc32(this.log.subarray(off, off + 6 + len));
if (want !== got) { lines.push("lsn " + lsn + ": checksum stored " + hex(want) + " computed " + hex(got) + " -> torn write, stop"); break; }
// ...
if (this.disk[k].pageLsn >= lsn) { skipped++; continue; }    // already on the page: redo is idempotent
this.disk[k] = { value: Number(v), pageLsn: lsn }; redone++;  // redo the committed change
~~~

What the simulation stands for: the "disk" is a JavaScript object and a byte buffer, and fsync is implicit at each COMMIT. It leaves out real files and fsync, undo of uncommitted page writes, concurrent transactions and the buffer pool's eviction policy. The group-commit table is arithmetic on an assumed 2 ms fsync, not a measurement.

Full output (identical in Node and Python):

~~~text
== 1. No log: update pages in place, crash between the two writes ==
   after restart: alice=900 bob=1000 carol=1000 (total 2900, 100 vanished)

== 2. With a WAL: two committed transfers, a third torn mid-write ==
   log on disk: 175 bytes; data pages on disk: alice=900 bob=1000 carol=1000 (total 2900)
   recovery:
     lsn 7: checksum stored 0x0469202c computed 0x296bcfa1 -> torn write, stop
     lsn 1: tx1 SET alice 900 -> page already has it, skip
     lsn 2: tx1 SET bob 1100 -> redo
     lsn 4: tx2 SET bob 1050 -> redo
     lsn 5: tx2 SET carol 1050 -> redo
   after recovery: alice=900 bob=1050 carol=1050 (total 3000)
   recovery run a second time: redo 0, skip 4 -> alice=900 bob=1050 carol=1050 (total 3000)

== 3. Checkpoints bound recovery time ==
   3000 transfers: log 255699 bytes, 9001 records; checkpoint after transfer 2500
   recovery starts at the checkpoint: scans 1500 records, redoes 1000; total 3000000
   the 212511 bytes before the checkpoint can be recycled; without it recovery reads all 9001 records

== 4. Group commit (assume one fsync takes 2 ms) ==
    1 commits per fsync: 1000 commits need 1000 fsyncs = 2000 ms of flushing, ceiling   500 commits/s
   10 commits per fsync: 1000 commits need  100 fsyncs =  200 ms of flushing, ceiling  5000 commits/s
   50 commits per fsync: 1000 commits need   20 fsyncs =   40 ms of flushing, ceiling 25000 commits/s
~~~

## 8. Edge Cases Worth Knowing

- **Disks that lie.** A drive with a volatile write cache can report a write complete before it is durable. Databases rely on fsync reaching stable storage; use drives with power-loss protection or disable the volatile cache.
- **The log fills the disk.** If checkpoints, archiving or a slow replica stop old WAL from being recycled (for example a forgotten replication slot), the WAL directory grows until the disk is full and the database stops.
- **Recovery time after a long gap.** A huge \`max_wal_size\` means fewer checkpoints and less write load, but a crash then replays more log before the database opens.
- **The log is not a backup on its own.** Replaying WAL needs a base copy of the data to replay onto; point-in-time recovery needs both.
- **Turning off fsync is not the same as \`synchronous_commit = off\`.** Disabling fsync can corrupt the database after a crash; relaxing synchronous commit only risks losing the most recent commits.

## Common Pitfalls

- **Saying the WAL is written after the data.** The whole point is the order: log first, flushed, then commit, then data pages whenever.
- **Thinking "committed" means the data files are updated.** In the run, the data files still said total 2900 at the crash; only the log held the committed state.
- **Forgetting checksums.** Without them, recovery cannot tell a torn tail record from a real one.
- **Assuming recovery must replay everything.** Checkpoints cut the replay from 9,001 to 1,500 records in the run.
- **Ignoring idempotence.** Redo must be safe to repeat; page LSNs make it so (the second recovery redid 0 records).
- **Calling fsync per transaction a fixed cost.** Group commit turned 1,000 flushes into 20.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">write-ahead log</strong> is an append-only file of change records. Before a transaction is reported committed, its records and a commit record are appended and <strong style="color:#ffca28;">fsynced</strong>; the data pages are written later. Log first, data later.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is safe:</strong> <span style="color:#f0e2c8;">A crash loses memory and can leave half-written pages, but recovery replays the log: committed changes are <strong style="color:#ffca28;">redone</strong>, uncommitted ones ignored or undone. In my run, a crash left the data files at total 2900; replaying the log restored 3000, and a torn tail record was caught by its CRC32 and discarded.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is fast:</strong> <span style="color:#f0e2c8;">Commits become sequential appends instead of random page writes, a hot page is written once per checkpoint instead of once per change, and <strong style="color:#ffca28;">group commit</strong> shares one fsync among many transactions: 50 per flush turned 1,000 fsyncs into 20.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The details:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">LSNs</strong> order the log; each page stores its page LSN, so redo skips changes already applied and is idempotent (a second recovery redid 0 records). <strong style="color:#ffca28;">Checkpoints</strong> flush pages and bound recovery: replay dropped from 9,001 records to 1,500. ARIES is the classic algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Other uses:</strong> <span style="color:#f0e2c8;">The same log drives <strong style="color:#ffca28;">replication</strong> (ship and replay WAL), point-in-time recovery, and <strong style="color:#ffca28;">change data capture</strong> such as Debezium on PostgreSQL. LSM-tree commit logs, Raft logs and Kafka are the same idea; PostgreSQL knobs like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">synchronous_commit</code> trade the last few commits for latency.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to a transaction that was in progress during the crash?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its commit record never reached the durable log, so its client never got success. Recovery treats it as never committed: with no-steal it is simply ignored, and with steal (dirty pages may be written early) its changes on disk are rolled back in the undo pass using the log.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does PostgreSQL log full pages after a checkpoint?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because an operating-system crash during a page write can leave a torn page, half old and half new, and a row-level log record cannot repair that. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">full_page_writes</code> on, the first change to each page after a checkpoint logs the whole page image, so recovery can restore it completely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is the WAL used for replication?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The primary streams WAL records to replicas, which replay them exactly as crash recovery would, staying a short distance behind. Synchronous replication waits for a replica to confirm it has flushed the WAL before acknowledging the commit; asynchronous does not, which is faster but can lose recent commits on failover.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a WAL and an LSM-tree commit log?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same principle, different role. In a B-tree database the WAL protects in-place page updates. In an LSM tree the commit log protects the in-memory table; once that table is flushed to an immutable sorted file, the corresponding log segment is deleted. Both are append-only, fsynced, and replayed on restart.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make commits faster without losing durability?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use group commit (PostgreSQL batches flushes naturally under concurrency, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">commit_delay</code> can widen the window), put the WAL on a fast, power-loss-protected device, keep records small, and batch writes in larger transactions. Relaxing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">synchronous_commit</code> is faster still, but that does give up the last few commits.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Write-ahead log (WAL) | Append-only change log flushed before commit and before data pages |
| Durability | Committed changes survive crashes |
| fsync | System call that forces buffered writes onto the device |
| LSN / page LSN | Increasing log position; the page records the last LSN applied to it |
| Redo | Re-applying logged committed changes during recovery |
| Undo | Reverting changes of transactions that never committed |
| Torn write | A partially completed write, detected with checksums |
| Checkpoint | Flush dirty pages and mark where recovery must start |
| Group commit | One fsync shared by several committing transactions |

**Conclusion:** A write-ahead log turns the hardest problem in storage, surviving a crash in the middle of a multi-page change, into an ordered append: record the change, flush the log, then say "committed", and write the real data pages whenever convenient. The run showed both halves. Without a log a crash lost 100 of 3,000; with one, recovery redid exactly the committed records, skipped what pages already held, rejected a torn record by its checksum, and was safe to repeat. Checkpoints kept replay to 1,500 of 9,001 records, and group commit turned 1,000 fsyncs into 20. Because the log is the authoritative, ordered history of every change, the same structure also powers replication, point-in-time recovery, change data capture, LSM trees and consensus logs.`,
    examples: [
      {
        label: `A write-ahead log from scratch: crash, redo recovery, torn record, checkpoint, group commit`,
        variants: [
          { tech: "node", code: `// A write-ahead log from scratch: bank balances in "pages", a log of checksummed records,
// a crash, redo recovery, a torn tail record, a checkpoint and group commit. All in memory.
const zlib = require("zlib");

function record(lsn, text) { // [lsn u32][len u16][payload][crc32 of everything before]
  const p = Buffer.from(text, "utf8"), b = Buffer.alloc(10 + p.length);
  b.writeUInt32BE(lsn, 0); b.writeUInt16BE(p.length, 4); p.copy(b, 6);
  b.writeUInt32BE(zlib.crc32(b.subarray(0, 6 + p.length)), 6 + p.length);
  return b;
}
const hex = (n) => "0x" + n.toString(16).padStart(8, "0");

class Db {
  constructor() { this.disk = {}; this.log = Buffer.alloc(0); this.lsn = 0; this.mem = {}; }
  load(balances) { for (const k of Object.keys(balances)) this.disk[k] = { value: balances[k], pageLsn: 0 }; this.mem = JSON.parse(JSON.stringify(this.disk)); }
  append(text) { this.lsn++; this.log = Buffer.concat([this.log, record(this.lsn, text)]); return this.lsn; }
  transfer(tx, from, to, amt) { // log first, fsync at COMMIT, change pages only in memory
    for (const [k, v] of [[from, this.mem[from].value - amt], [to, this.mem[to].value + amt]]) {
      const lsn = this.append(tx + " SET " + k + " " + v);
      this.mem[k] = { value: v, pageLsn: lsn };
    }
    this.append(tx + " COMMIT");
  }
  flushPage(k) { this.disk[k] = { ...this.mem[k] }; }
  recover(quiet) { // scan, verify checksums, redo committed changes newer than each page
    const recs = [], lines = [];
    let off = 0, startLsn = 0;
    while (off + 10 <= this.log.length) {
      const lsn = this.log.readUInt32BE(off), len = this.log.readUInt16BE(off + 4);
      if (off + 10 + len > this.log.length) { lines.push("lsn " + lsn + ": incomplete record, end of log"); break; }
      const want = this.log.readUInt32BE(off + 6 + len), got = zlib.crc32(this.log.subarray(off, off + 6 + len));
      if (want !== got) { lines.push("lsn " + lsn + ": checksum stored " + hex(want) + " computed " + hex(got) + " -> torn write, stop"); break; }
      const text = this.log.subarray(off + 6, off + 6 + len).toString("utf8");
      if (text.startsWith("CHECKPOINT")) startLsn = lsn;
      recs.push([lsn, text]); off += 10 + len;
    }
    const committed = new Set(recs.filter(([, t]) => t.endsWith(" COMMIT")).map(([, t]) => t.split(" ")[0]));
    let redone = 0, skipped = 0, ignored = 0, scanned = 0;
    for (const [lsn, text] of recs) {
      if (lsn <= startLsn) continue;
      scanned++;
      const [tx, op, k, v] = text.split(" ");
      if (op !== "SET") continue;
      if (!committed.has(tx)) { ignored++; lines.push("lsn " + lsn + ": " + text + " -> " + tx + " never committed, ignore"); continue; }
      if (this.disk[k].pageLsn >= lsn) { skipped++; lines.push("lsn " + lsn + ": " + text + " -> page already has it, skip"); continue; }
      this.disk[k] = { value: Number(v), pageLsn: lsn }; redone++;
      lines.push("lsn " + lsn + ": " + text + " -> redo");
    }
    if (!quiet) for (const l of lines) console.log("     " + l);
    this.mem = JSON.parse(JSON.stringify(this.disk));
    return { scanned, redone, skipped, ignored };
  }
  total() { return Object.values(this.disk).reduce((s, p) => s + p.value, 0); }
  show() { return Object.keys(this.disk).sort().map((k) => k + "=" + this.disk[k].value).join(" ") + " (total " + this.total() + ")"; }
}

console.log("== 1. No log: update pages in place, crash between the two writes ==");
const raw = { alice: 1000, bob: 1000, carol: 1000 };
raw.alice -= 100; // page for alice written to disk ... crash before bob is written
console.log("   after restart: alice=" + raw.alice + " bob=" + raw.bob + " carol=" + raw.carol + " (total " + (raw.alice + raw.bob + raw.carol) + ", 100 vanished)");

console.log("\\n== 2. With a WAL: two committed transfers, a third torn mid-write ==");
const db = new Db();
db.load({ alice: 1000, bob: 1000, carol: 1000 });
db.transfer("tx1", "alice", "bob", 100);
db.flushPage("alice"); // the buffer pool happened to write alice's page early
db.transfer("tx2", "bob", "carol", 50);
const before = db.log.length;
db.transfer("tx3", "carol", "alice", 30);
db.log = Buffer.from(db.log.subarray(0, before + 28)); // only tx3's first record reached the disk before power failed
db.log[db.log.length - 5] ^= 0xff; // and that record is torn: one of its bytes never made it
console.log("   log on disk: " + db.log.length + " bytes; data pages on disk: " + db.show());
console.log("   recovery:");
db.recover(false);
console.log("   after recovery: " + db.show());
const again = db.recover(true);
console.log("   recovery run a second time: redo " + again.redone + ", skip " + again.skipped + " -> " + db.show());

console.log("\\n== 3. Checkpoints bound recovery time ==");
const big = new Db();
big.load({ alice: 1000000, bob: 1000000, carol: 1000000 });
const names = ["alice", "bob", "carol"];
let ckptOffset = 0;
for (let i = 1; i <= 3000; i++) {
  if (i === 2501) { for (const k of names) big.flushPage(k); ckptOffset = big.log.length; big.append("CHECKPOINT"); }
  big.transfer("t" + i, names[i % 3], names[(i + 1) % 3], 1);
}
let all = 0;
for (let off = 0; off + 10 <= big.log.length; off += 10 + big.log.readUInt16BE(off + 4)) all++;
const copy = new Db(); copy.disk = JSON.parse(JSON.stringify(big.disk)); copy.log = big.log; // crash: memory lost
const r = copy.recover(true);
console.log("   3000 transfers: log " + big.log.length + " bytes, " + all + " records; checkpoint after transfer 2500");
console.log("   recovery starts at the checkpoint: scans " + r.scanned + " records, redoes " + r.redone + "; total " + copy.total());
console.log("   the " + ckptOffset + " bytes before the checkpoint can be recycled; without it recovery reads all " + all + " records");

console.log("\\n== 4. Group commit (assume one fsync takes 2 ms) ==");
for (const group of [1, 10, 50]) {
  const fsyncs = Math.ceil(1000 / group);
  console.log("   " + String(group).padStart(2) + " commits per fsync: 1000 commits need " + String(fsyncs).padStart(4) + " fsyncs = " +
    String(fsyncs * 2).padStart(4) + " ms of flushing, ceiling " + String(Math.floor(1000 / 2) * group).padStart(5) + " commits/s");
}` },
          { tech: "python", code: `# A write-ahead log from scratch: bank balances in "pages", a log of checksummed records,
# a crash, redo recovery, a torn tail record, a checkpoint and group commit. All in memory.
import copy as cp
import struct
import zlib


def record(lsn, text):  # [lsn u32][len u16][payload][crc32 of everything before]
    p = text.encode("utf8")
    head = struct.pack(">IH", lsn, len(p)) + p
    return head + struct.pack(">I", zlib.crc32(head))


def hx(n):
    return "0x" + format(n, "08x")


class Db:
    def __init__(self):
        self.disk, self.log, self.lsn, self.mem = {}, bytearray(), 0, {}

    def load(self, balances):
        for k, v in balances.items():
            self.disk[k] = {"value": v, "pageLsn": 0}
        self.mem = cp.deepcopy(self.disk)

    def append(self, text):
        self.lsn += 1
        self.log += record(self.lsn, text)
        return self.lsn

    def transfer(self, tx, frm, to, amt):  # log first, fsync at COMMIT, change pages only in memory
        for k, v in ((frm, self.mem[frm]["value"] - amt), (to, self.mem[to]["value"] + amt)):
            lsn = self.append(tx + " SET " + k + " " + str(v))
            self.mem[k] = {"value": v, "pageLsn": lsn}
        self.append(tx + " COMMIT")

    def flush_page(self, k):
        self.disk[k] = dict(self.mem[k])

    def recover(self, quiet):  # scan, verify checksums, redo committed changes newer than each page
        recs, lines, off, start = [], [], 0, 0
        log = self.log
        while off + 10 <= len(log):
            lsn, ln = struct.unpack_from(">IH", log, off)
            if off + 10 + ln > len(log):
                lines.append("lsn " + str(lsn) + ": incomplete record, end of log")
                break
            want = struct.unpack_from(">I", log, off + 6 + ln)[0]
            got = zlib.crc32(bytes(log[off:off + 6 + ln]))
            if want != got:
                lines.append("lsn " + str(lsn) + ": checksum stored " + hx(want) + " computed " + hx(got) + " -> torn write, stop")
                break
            text = bytes(log[off + 6:off + 6 + ln]).decode("utf8")
            if text.startswith("CHECKPOINT"):
                start = lsn
            recs.append((lsn, text))
            off += 10 + ln
        committed = {t.split(" ")[0] for _, t in recs if t.endswith(" COMMIT")}
        redone = skipped = ignored = scanned = 0
        for lsn, text in recs:
            if lsn <= start:
                continue
            scanned += 1
            parts = text.split(" ")
            if len(parts) < 4 or parts[1] != "SET":
                continue
            tx, _, k, v = parts
            if tx not in committed:
                ignored += 1
                lines.append("lsn " + str(lsn) + ": " + text + " -> " + tx + " never committed, ignore")
                continue
            if self.disk[k]["pageLsn"] >= lsn:
                skipped += 1
                lines.append("lsn " + str(lsn) + ": " + text + " -> page already has it, skip")
                continue
            self.disk[k] = {"value": int(v), "pageLsn": lsn}
            redone += 1
            lines.append("lsn " + str(lsn) + ": " + text + " -> redo")
        if not quiet:
            for l in lines:
                print("     " + l)
        self.mem = cp.deepcopy(self.disk)
        return {"scanned": scanned, "redone": redone, "skipped": skipped, "ignored": ignored}

    def total(self):
        return sum(p["value"] for p in self.disk.values())

    def show(self):
        return " ".join(k + "=" + str(self.disk[k]["value"]) for k in sorted(self.disk)) + " (total " + str(self.total()) + ")"


print("== 1. No log: update pages in place, crash between the two writes ==")
raw = {"alice": 1000, "bob": 1000, "carol": 1000}
raw["alice"] -= 100  # page for alice written to disk ... crash before bob is written
print("   after restart: alice=" + str(raw["alice"]) + " bob=" + str(raw["bob"]) + " carol=" + str(raw["carol"]) +
      " (total " + str(sum(raw.values())) + ", 100 vanished)")

print("\\n== 2. With a WAL: two committed transfers, a third torn mid-write ==")
db = Db()
db.load({"alice": 1000, "bob": 1000, "carol": 1000})
db.transfer("tx1", "alice", "bob", 100)
db.flush_page("alice")  # the buffer pool happened to write alice's page early
db.transfer("tx2", "bob", "carol", 50)
before = len(db.log)
db.transfer("tx3", "carol", "alice", 30)
db.log = bytearray(db.log[:before + 28])  # only tx3's first record reached the disk before power failed
db.log[len(db.log) - 5] ^= 0xFF  # and that record is torn: one of its bytes never made it
print("   log on disk: " + str(len(db.log)) + " bytes; data pages on disk: " + db.show())
print("   recovery:")
db.recover(False)
print("   after recovery: " + db.show())
again = db.recover(True)
print("   recovery run a second time: redo " + str(again["redone"]) + ", skip " + str(again["skipped"]) + " -> " + db.show())

print("\\n== 3. Checkpoints bound recovery time ==")
big = Db()
big.load({"alice": 1000000, "bob": 1000000, "carol": 1000000})
names = ["alice", "bob", "carol"]
ckpt_offset = 0
for i in range(1, 3001):
    if i == 2501:
        for k in names:
            big.flush_page(k)
        ckpt_offset = len(big.log)
        big.append("CHECKPOINT")
    big.transfer("t" + str(i), names[i % 3], names[(i + 1) % 3], 1)
count, off = 0, 0
while off + 10 <= len(big.log):
    count += 1
    off += 10 + struct.unpack_from(">H", big.log, off + 4)[0]
crashed = Db()
crashed.disk, crashed.log = cp.deepcopy(big.disk), big.log  # crash: memory lost
r = crashed.recover(True)
print("   3000 transfers: log " + str(len(big.log)) + " bytes, " + str(count) + " records; checkpoint after transfer 2500")
print("   recovery starts at the checkpoint: scans " + str(r["scanned"]) + " records, redoes " + str(r["redone"]) + "; total " + str(crashed.total()))
print("   the " + str(ckpt_offset) + " bytes before the checkpoint can be recycled; without it recovery reads all " + str(count) + " records")

print("\\n== 4. Group commit (assume one fsync takes 2 ms) ==")
for group in (1, 10, 50):
    fsyncs = -(-1000 // group)
    print("   " + str(group).rjust(2) + " commits per fsync: 1000 commits need " + str(fsyncs).rjust(4) + " fsyncs = " +
          str(fsyncs * 2).rjust(4) + " ms of flushing, ceiling " + str((1000 // 2) * group).rjust(5) + " commits/s")` },
        ],
      },
    ],
  },
  {
    title: `What is leader election in distributed systems?`,
    difficulty: "hard",
    seoDescription: `Leader election explained with a Raft-style simulation: terms, majority votes, randomized timeouts, split votes, stale leaders and fencing tokens.`,
    description: `**Question presented to candidate:**
"What is leader election in a distributed system? Why do so many systems want a single leader, how does a group of servers agree on one, and what goes wrong when the network misbehaves?"

**What a strong answer should cover:**
- Why a leader: one node orders writes, assigns work or owns a resource, which avoids conflicts; examples such as a database primary, the Kafka controller (KRaft) or a Kubernetes controller-manager
- The two properties: **safety** (at most one leader per term) and **liveness** (a leader is eventually elected); FLP-style limits mean liveness relies on timeouts
- The Raft-style mechanism: **heartbeats**, **election timeouts**, candidates asking for votes, **one vote per node per term**, **majority** wins, higher **term** always wins
- **Split votes** and why timeouts are **randomized**; how timeout ranges trade failover speed against repeated elections
- The **stale leader** problem: a paused or partitioned old leader still thinks it leads; majority commits stop it inside the cluster, **fencing tokens** stop it at external resources
- The practical options: built-in consensus (Raft, Paxos, ZAB), a coordination service (etcd, ZooKeeper, Kubernetes Leases) or a database lease, and why the bully algorithm is not partition-safe

**Code / implementation expected:** Optional — the election rules in pseudocode, or a small simulation; the example simulates a five-node Raft-style election with a crash, a partition and fencing.`,
    answer: `**Target Audience:** Engineers who know what a server, a network and a replica are; consensus is introduced from scratch, and every term is defined as it appears.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Election times, vote counts and failure behaviour come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

Five friends share one holiday budget in a group chat. If everybody books things on their own, two people book the same hotel and nobody books the flights. So they agree that one person, the organiser, makes all bookings, and the others send requests to the organiser.

Then the organiser goes quiet. Maybe their phone died, maybe they are on a plane, maybe they are just slow. The group cannot wait forever, so they agree on a rule: "If you have not heard from the organiser for a while, propose yourself as the new organiser. Anyone who has not already backed someone this round backs the first proposal they see. Whoever gets three of the five wins. Each round has a number, and a higher round number always beats a lower one."

Two awkward cases make this harder than it sounds. Two friends may propose themselves at the same moment and split the votes, so nobody wins. And the old organiser may come back from the plane, still believing they are in charge, and book a hotel with the old plan. Leader election is the set of rules that handles both, without a referee and with messages that can be late or lost.

📌 **Interview term: leader election** — the process by which nodes in a distributed system agree on exactly one node to act as the leader (also called primary, master, controller or coordinator), and agree on a new one when the leader fails.

## 2. Why Systems Want a Single Leader

A leader turns a hard problem, many nodes agreeing on every operation, into an easier one: everyone does what the leader says, and the group only has to agree on **who** the leader is.

- **Ordering writes.** A database primary decides the order of all writes and ships them to replicas, so there are no conflicting versions to merge; see [database replication](/interview-question/what-is-database-replication).
- **Owning a job or resource.** Exactly one scheduler instance should fire each cron job; exactly one controller should reconcile a Kubernetes resource; see [designing a distributed job scheduler](/interview-question/how-would-you-design-a-distributed-job-scheduler).
- **Cluster metadata.** Kafka elects a controller that owns partition leadership; since Apache Kafka 4.0 (March 2025) this runs only in KRaft mode, Kafka's own Raft-based quorum, after ZooKeeper support was removed (Apache Kafka 4.0 release coverage by Confluent and SoftwareMill).

The cost is that the leader is a bottleneck and a single point of failure, so electing a replacement quickly and safely is the whole game.

## 3. What a Correct Election Must Guarantee

📌 **Interview term: term (epoch)** — a number that increases with every election. Each term has at most one leader. Any node that sees a higher term than its own immediately adopts it and stops acting as leader or candidate.

📌 **Interview term: safety** — nothing bad ever happens: there are never two leaders **in the same term**, and so never two nodes whose commands the cluster accepts at once.

📌 **Interview term: liveness** — something good eventually happens: if a majority of nodes can talk to each other, a leader is eventually elected.

📌 **Interview term: majority (quorum)** — more than half of the nodes, 3 of 5 here. Any two majorities share at least one node, and each node votes only once per term, so two candidates cannot both win the same term. That overlap is what makes the election safe; see [read/write quorums](/interview-question/what-is-a-read-write-quorum) for the same arithmetic applied to data.

Safety must hold no matter how messages are delayed. Liveness cannot be guaranteed in a fully asynchronous network (the FLP impossibility result from 1985 says no deterministic consensus protocol can promise to terminate there), so practical systems get liveness from **timeouts** and **randomness**.

## 4. How a Raft-Style Election Works

Raft, from Diego Ongaro and John Ousterhout's paper "In Search of an Understandable Consensus Algorithm" (USENIX ATC 2014), is the protocol most engineers describe in interviews; etcd, Consul and Kafka KRaft all use Raft-based designs. Each node is in one of three roles:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Raft roles: follower times out and becomes candidate; candidate with a majority becomes leader; any node that sees a higher term becomes follower">
  <defs>
    <marker id="sd07q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="110" width="150" height="70" rx="12"/>
  <text class="d-text" x="105" y="150" text-anchor="middle">follower</text>
  <rect class="d-box" x="305" y="110" width="150" height="70" rx="12"/>
  <text class="d-text" x="380" y="150" text-anchor="middle">candidate</text>
  <rect class="d-box-accent" x="580" y="110" width="150" height="70" rx="12"/>
  <text class="d-text" x="655" y="150" text-anchor="middle">leader</text>
  <line class="d-edge-accent" x1="180" y1="130" x2="301" y2="130" marker-end="url(#sd07q5-arrow)"/>
  <text class="d-sub" x="240" y="100" text-anchor="middle">timeout</text>
  <line class="d-edge-accent" x1="455" y1="130" x2="576" y2="130" marker-end="url(#sd07q5-arrow)"/>
  <text class="d-sub" x="515" y="100" text-anchor="middle">majority</text>
  <path class="d-edge-dashed" d="M380,180 L380,250 L105,250 L105,184" fill="none" marker-end="url(#sd07q5-arrow)"/>
  <text class="d-sub" x="242" y="240" text-anchor="middle">sees higher term</text>
  <path class="d-edge-dashed" d="M655,180 L655,280 L120,280 L120,184" fill="none" marker-end="url(#sd07q5-arrow)"/>
  <text class="d-sub" x="515" y="270" text-anchor="middle">sees higher term</text>
</svg>

A candidate that times out again without a majority starts a new election with a higher term; a candidate that receives a heartbeat from a leader of its own term or higher steps back to follower.

1. **Followers** expect a **heartbeat** from the leader regularly (every 50 ms in the example). Each heartbeat resets the follower's **election timeout**.
2. If the timeout expires with no heartbeat, the follower becomes a **candidate**: it increments its term, votes for itself, and sends a vote request to every other node.
3. A node grants its vote if the request's term is at least its own and it has **not voted for anyone else in that term**. (Real Raft adds one more condition, not modelled in the example: the candidate's log must be at least as up to date as the voter's, so a node missing committed data can never win.)
4. A candidate with votes from a **majority** becomes **leader** and immediately sends heartbeats, which tell everyone else to stand down.
5. Anyone who sees a message with a **higher term** adopts it and becomes a follower, including an old leader.

📌 **Interview term: heartbeat** — a small periodic message from the leader that says "I am alive and still leading term T".

📌 **Interview term: election timeout** — how long a follower waits without a heartbeat before it starts an election. It is the cluster's failure detector, and the trade-off is the usual one: short timeouts fail over fast but trigger needless elections when the network is merely slow; see [how systems detect node failures](/interview-question/how-do-distributed-systems-detect-node-failures).

## 5. A Run: Cold Start, Crash, Partition

The example **"Raft-style leader election: terms, majority votes, randomized timeouts, split votes and fencing tokens"** runs five nodes on a simulated clock with 10 ms message delay, 50 ms heartbeats and election timeouts drawn at random from 150 to 300 ms (seed 42).

- **Cold start.** Node 4 timed out first at 156 ms and asked for votes; node 2 timed out at 159 ms and did the same. Node 4's requests arrived at 166 ms, before node 2's (169 ms), so nodes 0, 1 and 3 voted for node 4 (node 2 had already voted for itself). With its own vote plus the first two replies, node 4 won term 1 at **176 ms with 3 of 5 votes**.
- **Leader crash.** Node 4 crashed at 1,000 ms. Followers noticed only through missing heartbeats; node 0 timed out at 1,172 ms and won **term 2 at 1,192 ms**: 192 ms without a leader, set almost entirely by the election timeout.
- **Partition.** At 2,000 ms the network split into {0, 1} and {2, 3, 4} (node 4 had restarted as a follower). Node 0, the term-2 leader, kept sending heartbeats to node 1 and **still believed it was leader**. On the other side, node 3 won **term 3 at 2,161 ms**. For a while there were two nodes that each thought they led.

Inside the cluster, that is harmless:

| At 2,600 ms | Acknowledgements | Result |
| :--- | ---: | :--- |
| write via node 3 (term 3, majority side) | 3 of 5 | committed |
| write via node 0 (term 2, minority side) | 2 of 5 | **not committed** |

The old leader can accept a request, but it can never get a majority to agree, so nothing it does becomes durable. When the partition healed at 2,600 ms, node 0 received a term-3 heartbeat and **stepped down at 2,621 ms**.

📌 **Interview term: split brain** — two nodes acting as leader at the same time and both making changes that stick. Majority-based election prevents it inside the cluster; it can still happen at anything outside the cluster that trusts a leader without checking its term.

## 6. Split Votes, and Why Timeouts Are Random

If every node uses the same timeout, they all become candidates at the same moment, each votes for itself, and nobody reaches a majority. They all time out again together, forever. In the run, five nodes with a fixed 150 ms timeout started **65 elections in 2 seconds and elected no leader**.

📌 **Interview term: split vote** — an election round in which no candidate reaches a majority because the votes are divided among several candidates; the round is wasted and a new term starts.

📌 **Interview term: randomized election timeout** — each node picks its timeout at random from a range on every reset, so usually one node times out clearly first and collects votes before anyone else starts. The Raft paper gives 150 to 300 ms as its example range.

The run then measured 200 cold starts (seeds 1 to 200) for four ranges, with the 10 ms message delay:

| Timeout range | Avg time to a leader | Worst | Needed more than one term | No leader within 5 s |
| :--- | ---: | ---: | ---: | ---: |
| 150 to 155 ms | 2,147.4 ms | 4,728 ms | 184 | 16 |
| 150 to 200 ms | 185.4 ms | 483 ms | 9 | 0 |
| 150 to 300 ms | 193.7 ms | 343 ms | 1 | 0 |
| 150 to 450 ms | 213.7 ms | 377 ms | 0 | 0 |

(Averages are over the starts that elected a leader: 184 of 200 for the narrowest range, all 200 for the others.) The pattern is the important part: when the spread of timeouts (5 ms) is smaller than the time a vote request needs to arrive (10 ms), candidates collide almost every time. A spread several times the message delay makes split votes rare; a much wider spread removes them but makes the typical election a little slower. Pick the range from the network round-trip time, not by habit.

## 7. The Stale Leader and Fencing Tokens

Majority commits protect the cluster's own log. They do not protect an **external** resource: a file in object storage, a row in another database, a payment API. An old leader that was paused (a long garbage-collection stop, a frozen virtual machine) or partitioned can wake up and write to that resource, believing it still leads.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Fencing: the new leader writes with token 3; the stale leader writes with token 2 and the storage rejects it because it has already seen 3">
  <defs>
    <marker id="sd07q5-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="30" width="200" height="60" rx="10"/>
  <text class="d-text" x="130" y="66" text-anchor="middle">new leader, term 3</text>
  <rect class="d-box-muted" x="30" y="180" width="200" height="60" rx="10"/>
  <text class="d-text" x="130" y="216" text-anchor="middle">stale leader, term 2</text>
  <rect class="d-box" x="500" y="105" width="230" height="60" rx="10"/>
  <text class="d-text" x="615" y="141" text-anchor="middle">storage: highest 3</text>
  <line class="d-edge-accent" x1="230" y1="60" x2="496" y2="125" marker-end="url(#sd07q5-arrow2)"/>
  <text class="d-sub" x="365" y="70" text-anchor="middle">write, token 3: ok</text>
  <line class="d-edge-dashed" x1="230" y1="210" x2="496" y2="145" marker-end="url(#sd07q5-arrow2)"/>
  <text class="d-sub" x="365" y="225" text-anchor="middle">write, token 2: rejected</text>
</svg>

📌 **Interview term: fencing token** — a number that increases every time leadership (or a lock) is granted, such as the Raft term. The leader sends it with every write; the resource remembers the highest token it has seen and rejects any write with a lower one. Martin Kleppmann's "How to do distributed locking" (February 2016) made this the standard answer for locks used for correctness.

In the run, the term-3 leader wrote value A and then the stale term-2 leader wrote value B to the same storage:

| Storage | Token 3 (new leader) | Token 2 (stale leader) | Final value |
| :--- | :--- | :--- | :--- |
| without fencing | accepted | accepted | **B, the stale write wins** |
| with fencing | accepted | **rejected** | A |

The token only works if the resource checks it. If you cannot change the resource, the remaining defence is a lease: the leader stops acting before its lease can expire anywhere else, which depends on bounded clock drift and pause times.

📌 **Interview term: leader lease** — leadership granted for a fixed time; the holder must renew it before it expires, and others may take over only after it has expired. It lets a leader serve reads without asking a majority each time, at the cost of trusting clocks.

## 8. Ways to Get a Leader in Practice

You rarely implement Raft yourself. The usual options:

| Approach | How it works | Partition-safe? | Typical use |
| :--- | :--- | :--- | :--- |
| Built-in consensus (Raft, Multi-Paxos, ZAB) | Nodes run the protocol among themselves | Yes, with a majority | etcd, Consul, Kafka KRaft, CockroachDB ranges, ZooKeeper itself |
| Coordination service | Candidates race for a key or node in etcd or ZooKeeper; the service holds the lease | Yes, inherited from the service | Application services that need one active instance |
| Kubernetes Lease | Replicas compete to update a \`coordination.k8s.io\` Lease object and renew it | Yes, via etcd behind the API server | Controllers and operators with active/standby replicas |
| Database lease row | \`UPDATE leader SET owner = me, expires = now() + 15 s WHERE expires < now()\` | As safe as the database, plus clock assumptions | Small systems that already have a reliable database |
| Bully algorithm | Highest reachable id declares itself leader | **No**: both sides of a partition elect one | Textbook only |

The ZooKeeper recipe: each candidate creates an **ephemeral sequential** znode under an election path; the lowest sequence number is leader; every other candidate watches only the node just before its own, so a leader failure wakes one successor instead of the whole herd, and an ephemeral node disappears when its owner's session expires (Apache Solr LeaderElector documentation and ZooKeeper course notes). With etcd, candidates create a key attached to a lease and the lowest revision wins; etcd's own Raft cluster defaults to a 100 ms heartbeat interval and a 1,000 ms election timeout, and its tuning guide suggests a heartbeat around 0.5 to 1.5 times the round-trip time between members (etcd documentation, Tuning). For Kubernetes, client-go leader-election examples commonly use a 15 s lease duration, 10 s renew deadline and 2 s retry period; check the defaults of the version you vendor.

## 9. Verified: Running the Code

The simulation steps a millisecond clock. Each millisecond it delivers messages that are due (in send order), then lets each live node act: leaders send heartbeats every 50 ms, others start an election if their deadline has passed. A node grants a vote at most once per term, and any message with a higher term demotes the receiver. A partition is a group number per node; messages between groups are dropped. Timeouts come from a 32-bit xorshift generator so all four languages draw the same numbers.

The key part:

~~~js
if (m.term > n.term) { n.term = m.term; n.role = "follower"; n.voted = -1; } // higher term always wins
if (m.type === "voteReq") {
  const ok = m.term === n.term && (n.voted === -1 || n.voted === m.from);   // one vote per term
  if (ok) { n.voted = m.from; n.deadline = timeout(c); }
  send(c, n.id, m.from, "vote", n.term, ok);
}
~~~

What the simulation stands for: real nodes run on separate machines with variable network delay and persist their term and vote to disk; here delay is a constant 10 ms, there is no replicated log (so the up-to-date-log voting rule is left out), and "write acknowledgements" are counted as the number of live nodes reachable from the leader rather than sent as messages.

Full output (identical in Node, Python, Go and Java):

~~~text
== 1. Cold start, timeouts random in [150, 300) ms, seed 42 ==
t=156ms node 4 times out, candidate for term 1
t=159ms node 2 times out, candidate for term 1
t=176ms node 4 wins term 1 with 3 of 5 votes
t=1000ms leader node 4 crashes
t=1172ms node 0 times out, candidate for term 2
t=1174ms node 3 times out, candidate for term 2
t=1192ms node 0 wins term 2 with 3 of 5 votes
failover: node 0 leads term 2; old node 4 restarts as follower
t=2000ms partition: {0,1} cannot reach the other three
t=2141ms node 3 times out, candidate for term 3
t=2161ms node 3 wins term 3 with 3 of 5 votes
t=2600ms node 0 still thinks it leads term 2; node 3 leads term 3
  write via node 3: 3 of 5 acks, committed
  write via node 0: 2 of 5 acks, NOT committed
  storage without fencing: token 3 accepted, token 2 accepted; final value B
  storage with fencing: token 3 accepted, token 2 rejected; final value A
t=2600ms partition heals
t=2621ms node 0 steps down: saw term 3
leaders now: node 3 term 3

== 2. Every node uses the same fixed 150 ms timeout ==
elections started: 65, leaders elected: 0

== 3. 200 cold starts per timeout range (seeds 1..200) ==
[150, 155) ms: avg 2147.4 ms to a leader, max 4728 ms, needed more than one term: 184, no leader in 5 s: 16
[150, 200) ms: avg 185.4 ms to a leader, max 483 ms, needed more than one term: 9, no leader in 5 s: 0
[150, 300) ms: avg 193.7 ms to a leader, max 343 ms, needed more than one term: 1, no leader in 5 s: 0
[150, 450) ms: avg 213.7 ms to a leader, max 377 ms, needed more than one term: 0, no leader in 5 s: 0
~~~

## 10. Edge Cases Worth Knowing

- **Even cluster sizes buy nothing.** Four nodes need 3 votes and tolerate one failure, the same as three nodes. Use 3 or 5 (or 7) voters.
- **Two-node clusters cannot elect safely.** A majority of 2 is 2, so losing either node stops elections; add a lightweight third voter (a witness or arbiter).
- **Persist the term and vote.** A node that forgets it voted, after a restart, could vote twice in one term and allow two leaders. Raft writes both to disk before answering.
- **Flapping.** A leader with a slow disk or overloaded CPU may miss heartbeats, lose leadership, win it back, and repeat. Pre-vote (asking whether an election could succeed before bumping the term) and check-quorum (a leader that cannot reach a majority steps down) reduce disruption.
- **Leadership is not the same as being up to date.** Without Raft's log rule, a node that missed recent commits could win and discard them.
- **Long pauses defeat leases.** A process frozen longer than its lease will wake up believing it still leads; that is exactly what fencing tokens are for.

## Common Pitfalls

- **Electing by "highest id wins" without a majority.** It is simple, and during a partition both sides elect a leader.
- **Using the same timeout on every node.** The run started 65 elections in 2 s with no winner.
- **Choosing a timeout spread smaller than the message delay.** A 5 ms spread with 10 ms messages failed to elect anyone within 5 s in 16 of 200 starts.
- **Trusting that the old leader knows it was replaced.** It does not until it hears a higher term; in the run it kept acting as leader for the whole 600 ms partition, 460 ms of it after term 3 already had a leader.
- **Protecting external resources with leadership alone.** Without a fencing check, the stale leader's write overwrote the new leader's.
- **Forgetting that failover time is mostly the election timeout.** The crash cost 192 ms of no leader with a 150 to 300 ms timeout; production values of seconds mean seconds of unavailability for writes.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What and why:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Leader election</strong> is how nodes agree on exactly one leader, and on a new one when it fails. One leader orders writes or owns a job, so nodes never conflict: a database primary, the Kafka controller in KRaft, a Kubernetes controller-manager.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The mechanism:</strong> <span style="color:#f0e2c8;">Raft-style: the leader sends <strong style="color:#ffca28;">heartbeats</strong>; a follower that hears nothing for its <strong style="color:#ffca28;">election timeout</strong> becomes a candidate, increments the <strong style="color:#ffca28;">term</strong> and asks for votes; each node votes once per term; a <strong style="color:#ffca28;">majority</strong> wins; any higher term demotes a leader. Two majorities always overlap, so there is at most one leader per term.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Split votes:</strong> <span style="color:#f0e2c8;">Timeouts are <strong style="color:#ffca28;">randomized</strong> so one node usually starts first. In my five-node simulation, identical 150 ms timeouts started 65 elections in 2 s with no leader; a 150 to 300 ms range elected a leader in 193.7 ms on average over 200 starts, and only 1 needed a second term.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The stale leader:</strong> <span style="color:#f0e2c8;">After a partition, the old leader still believed it led, but its write got 2 of 5 acks and never committed; it stepped down as soon as it heard term 3. For anything outside the cluster, use a <strong style="color:#ffca28;">fencing token</strong> (the term): without it the stale write overwrote the new one, with it the storage rejected token 2.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In practice:</strong> <span style="color:#f0e2c8;">I would not hand-roll it: use etcd or ZooKeeper (ephemeral sequential nodes, watch your predecessor), a Kubernetes Lease, or the consensus built into the database. Tune the timeout to the network: etcd defaults to 100 ms heartbeats and a 1 s election timeout, and failover time is roughly that timeout.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just let the node with the highest id be leader (the bully algorithm)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it needs no majority. During a partition each side sees a different highest id and elects its own leader, which is split brain. It also lets a flapping high-id node repeatedly take over. Majority votes with terms avoid both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Raft make sure the new leader has all committed data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A voter refuses a candidate whose log is less up to date than its own (compared by the last entry's term, then index). Since a committed entry is on a majority, and a winner needs a majority of votes, at least one voter has it and would refuse a candidate that lacks it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How long does failover take, and how would you speed it up?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Roughly detection plus one election round: the election timeout, plus a few message round trips. In the run, 192 ms. Shorter timeouts speed it up but cause spurious elections on a slow network, so tie them to measured round-trip times, and use pre-vote and check-quorum to avoid disruptive elections.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a fencing token, and where does it come from?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A number that increases with each leadership or lock grant, such as the Raft term or a ZooKeeper zxid. The leader attaches it to every write, and the resource rejects anything lower than the highest it has seen, so a paused old leader cannot overwrite the new leader. It only works if the resource checks it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does leader election relate to the CAP theorem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Majority-based election is a CP design: the minority side of a partition cannot elect a leader or commit writes, so it gives up availability to keep a single history. An AP system avoids a single leader altogether and merges concurrent writes afterwards.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Leader election | Agreeing on exactly one leader, and on a successor when it fails |
| Term (epoch) | Increasing election number; at most one leader per term |
| Safety | Never two leaders in the same term |
| Liveness | A leader is eventually elected while a majority can communicate |
| Majority (quorum) | More than half the nodes; any two majorities overlap |
| Heartbeat | Periodic "still leading term T" message from the leader |
| Election timeout | Silence after which a follower starts an election |
| Split brain | Two leaders whose actions both take effect |
| Split vote | An election round in which nobody reaches a majority |
| Randomized election timeout | Random per-node timeout that makes split votes rare |
| Fencing token | Increasing number checked by a resource to reject stale leaders |
| Leader lease | Time-limited leadership that must be renewed |

**Conclusion:** Leader election lets a cluster replace "everyone agrees on everything" with "everyone agrees on who decides", and it rests on three ideas: terms that only increase, one vote per node per term, and a majority to win, which together guarantee at most one leader per term. Timeouts and randomness supply liveness: the run elected a leader in 176 ms, failed over in 192 ms after a crash, and showed why the randomness matters, with identical timeouts producing 65 elections and no leader. The hard part is the leader that does not know it has been replaced; inside the cluster majority commits neutralise it, as its write reached only 2 of 5 nodes, and outside the cluster a fencing token is what stopped its write from overwriting the new leader's. In practice, borrow all of this from etcd, ZooKeeper, a Kubernetes Lease or your database's consensus layer, and tune its timeouts to your network.`,
    examples: [
      {
        label: `Raft-style leader election: terms, majority votes, randomized timeouts, split votes and fencing tokens`,
        variants: [
          { tech: "node", code: `// Raft-style leader election on a fake clock: terms, majority votes,
// randomized timeouts, a crash, a partition and a fencing token.
const N = 5, LAT = 10, HB = 50; // nodes, one-way message delay (ms), heartbeat interval (ms)
let seed = 1;
function rnd() { // xorshift32, identical in every language
  seed = (seed ^ (seed << 13)) >>> 0;
  seed = (seed ^ (seed >>> 17)) >>> 0;
  seed = (seed ^ (seed << 5)) >>> 0;
  return seed;
}
function cluster(lo, hi, s, verbose) {
  seed = s;
  const c = { now: 0, lo, hi, verbose, msgs: [], group: [0, 0, 0, 0, 0], elections: 0, firstLeader: -1, winTerm: 0, nodes: [] };
  for (let i = 0; i < N; i++) c.nodes.push({ id: i, role: "follower", term: 0, voted: -1, votes: 0, alive: true, deadline: 0, nextHb: 0 });
  for (const n of c.nodes) n.deadline = timeout(c);
  return c;
}
function timeout(c) { return c.now + c.lo + (rnd() % (c.hi - c.lo)); }
function say(c, s) { if (c.verbose) console.log("t=" + c.now + "ms " + s); }
function send(c, from, to, type, term, ok) {
  if (c.group[from] === c.group[to]) c.msgs.push({ at: c.now + LAT, from, to, type, term, ok });
}
function broadcast(c, n, type) { for (let j = 0; j < N; j++) if (j !== n.id) send(c, n.id, j, type, n.term, false); }
function handle(c, n, m) {
  if (m.term > n.term) {
    if (n.role === "leader") say(c, "node " + n.id + " steps down: saw term " + m.term);
    n.term = m.term; n.role = "follower"; n.voted = -1;
  }
  if (m.type === "voteReq") {
    const ok = m.term === n.term && (n.voted === -1 || n.voted === m.from);
    if (ok) { n.voted = m.from; n.deadline = timeout(c); }
    send(c, n.id, m.from, "vote", n.term, ok);
  } else if (m.type === "vote") {
    if (n.role === "candidate" && m.term === n.term && m.ok) {
      n.votes++;
      if (2 * n.votes > N) {
        n.role = "leader"; n.nextHb = c.now;
        if (c.firstLeader < 0) { c.firstLeader = c.now; c.winTerm = n.term; }
        say(c, "node " + n.id + " wins term " + n.term + " with " + n.votes + " of " + N + " votes");
      }
    }
  } else if (m.type === "hb") {
    if (m.term === n.term) { n.role = "follower"; n.deadline = timeout(c); }
    else send(c, n.id, m.from, "hbReject", n.term, false);
  }
}
function run(c, until) {
  while (c.now < until) {
    while (c.msgs.length && c.msgs[0].at <= c.now) {
      const m = c.msgs.shift(), n = c.nodes[m.to];
      if (n.alive && c.group[m.from] === c.group[m.to]) handle(c, n, m);
    }
    for (const n of c.nodes) {
      if (!n.alive) continue;
      if (n.role === "leader") {
        if (c.now >= n.nextHb) { n.nextHb = c.now + HB; broadcast(c, n, "hb"); }
      } else if (c.now >= n.deadline) {
        n.role = "candidate"; n.term++; n.voted = n.id; n.votes = 1; n.deadline = timeout(c); c.elections++;
        say(c, "node " + n.id + " times out, candidate for term " + n.term);
        broadcast(c, n, "voteReq");
      }
    }
    c.now++;
  }
}
function leaderOf(c, g) {
  let best = -1;
  for (const n of c.nodes) if (n.alive && n.role === "leader" && c.group[n.id] === g && (best < 0 || n.term > c.nodes[best].term)) best = n.id;
  return best;
}

console.log("== 1. Cold start, timeouts random in [150, 300) ms, seed 42 ==");
const c = cluster(150, 300, 42, true);
run(c, 1000);
const l1 = leaderOf(c, 0);
console.log("t=1000ms leader node " + l1 + " crashes");
c.nodes[l1].alive = false;
run(c, 1600);
const l2 = leaderOf(c, 0);
console.log("failover: node " + l2 + " leads term " + c.nodes[l2].term + "; old node " + l1 + " restarts as follower");
c.nodes[l1].alive = true; c.nodes[l1].role = "follower"; c.nodes[l1].deadline = timeout(c);
run(c, 2000);
const buddy = l2 === 0 ? 1 : 0;
console.log("t=2000ms partition: {" + l2 + "," + buddy + "} cannot reach the other three");
c.group[l2] = 1; c.group[buddy] = 1;
run(c, 2600);
const l3 = leaderOf(c, 0);
console.log("t=2600ms node " + l2 + " still thinks it leads term " + c.nodes[l2].term + "; node " + l3 + " leads term " + c.nodes[l3].term);
for (const id of [l3, l2]) {
  let reach = 0;
  for (const n of c.nodes) if (n.alive && c.group[n.id] === c.group[id]) reach++;
  console.log("  write via node " + id + ": " + reach + " of 5 acks, " + (2 * reach > N ? "committed" : "NOT committed"));
}
for (const fenced of [false, true]) {
  let highest = 0, value = "none";
  const out = [];
  for (const [id, v] of [[l3, "A"], [l2, "B"]]) {
    const token = c.nodes[id].term;
    if (!fenced || token >= highest) { highest = Math.max(highest, token); value = v; out.push("token " + token + " accepted"); }
    else out.push("token " + token + " rejected");
  }
  console.log("  storage " + (fenced ? "with" : "without") + " fencing: " + out.join(", ") + "; final value " + value);
}
console.log("t=2600ms partition heals");
c.group[l2] = 0; c.group[buddy] = 0;
run(c, 2800);
console.log("leaders now: " + c.nodes.filter((n) => n.role === "leader").map((n) => "node " + n.id + " term " + n.term).join(", "));

console.log("\\n== 2. Every node uses the same fixed 150 ms timeout ==");
const f = cluster(150, 151, 7, false);
run(f, 2000);
console.log("elections started: " + f.elections + ", leaders elected: " + (f.firstLeader < 0 ? 0 : 1));

console.log("\\n== 3. 200 cold starts per timeout range (seeds 1..200) ==");
for (const [lo, hi] of [[150, 155], [150, 200], [150, 300], [150, 450]]) {
  let sum = 0, max = 0, retry = 0, failed = 0;
  for (let s = 1; s <= 200; s++) {
    const t = cluster(lo, hi, s, false);
    while (t.firstLeader < 0 && t.now < 5000) run(t, t.now + 1);
    if (t.firstLeader < 0) { failed++; continue; }
    sum += t.firstLeader; max = Math.max(max, t.firstLeader);
    if (t.winTerm > 1) retry++;
  }
  const ok = 200 - failed, avg10 = Math.floor((sum * 10 + Math.floor(ok / 2)) / ok);
  console.log("[" + lo + ", " + hi + ") ms: avg " + Math.floor(avg10 / 10) + "." + (avg10 % 10) + " ms to a leader, max " + max + " ms, needed more than one term: " + retry + ", no leader in 5 s: " + failed);
}` },
          { tech: "python", code: `# Raft-style leader election on a fake clock: terms, majority votes,
# randomized timeouts, a crash, a partition and a fencing token.
N, LAT, HB = 5, 10, 50  # nodes, one-way message delay (ms), heartbeat interval (ms)
seed = 1


def rnd():  # xorshift32, identical in every language
    global seed
    seed = (seed ^ (seed << 13)) & 0xFFFFFFFF
    seed = (seed ^ (seed >> 17)) & 0xFFFFFFFF
    seed = (seed ^ (seed << 5)) & 0xFFFFFFFF
    return seed


class Node:
    def __init__(self, i):
        self.id, self.role, self.term, self.voted, self.votes = i, "follower", 0, -1, 0
        self.alive, self.deadline, self.next_hb = True, 0, 0


class Cluster:
    def __init__(self, lo, hi, s, verbose):
        global seed
        seed = s
        self.now, self.lo, self.hi, self.verbose = 0, lo, hi, verbose
        self.msgs, self.group, self.elections, self.first_leader, self.win_term = [], [0] * N, 0, -1, 0
        self.nodes = [Node(i) for i in range(N)]
        for n in self.nodes:
            n.deadline = self.timeout()

    def timeout(self):
        return self.now + self.lo + (rnd() % (self.hi - self.lo))

    def say(self, s):
        if self.verbose:
            print("t=" + str(self.now) + "ms " + s)

    def send(self, frm, to, typ, term, ok):
        if self.group[frm] == self.group[to]:
            self.msgs.append((self.now + LAT, frm, to, typ, term, ok))

    def broadcast(self, n, typ):
        for j in range(N):
            if j != n.id:
                self.send(n.id, j, typ, n.term, False)

    def handle(self, n, m):
        _, frm, _, typ, term, ok = m
        if term > n.term:
            if n.role == "leader":
                self.say("node " + str(n.id) + " steps down: saw term " + str(term))
            n.term, n.role, n.voted = term, "follower", -1
        if typ == "voteReq":
            grant = term == n.term and (n.voted == -1 or n.voted == frm)
            if grant:
                n.voted = frm
                n.deadline = self.timeout()
            self.send(n.id, frm, "vote", n.term, grant)
        elif typ == "vote":
            if n.role == "candidate" and term == n.term and ok:
                n.votes += 1
                if 2 * n.votes > N:
                    n.role, n.next_hb = "leader", self.now
                    if self.first_leader < 0:
                        self.first_leader, self.win_term = self.now, n.term
                    self.say("node " + str(n.id) + " wins term " + str(n.term) + " with " + str(n.votes) + " of " + str(N) + " votes")
        elif typ == "hb":
            if term == n.term:
                n.role = "follower"
                n.deadline = self.timeout()
            else:
                self.send(n.id, frm, "hbReject", n.term, False)

    def run(self, until):
        while self.now < until:
            while self.msgs and self.msgs[0][0] <= self.now:
                m = self.msgs.pop(0)
                n = self.nodes[m[2]]
                if n.alive and self.group[m[1]] == self.group[m[2]]:
                    self.handle(n, m)
            for n in self.nodes:
                if not n.alive:
                    continue
                if n.role == "leader":
                    if self.now >= n.next_hb:
                        n.next_hb = self.now + HB
                        self.broadcast(n, "hb")
                elif self.now >= n.deadline:
                    n.role, n.term, n.voted, n.votes = "candidate", n.term + 1, n.id, 1
                    n.deadline = self.timeout()
                    self.elections += 1
                    self.say("node " + str(n.id) + " times out, candidate for term " + str(n.term))
                    self.broadcast(n, "voteReq")
            self.now += 1

    def leader_of(self, g):
        best = -1
        for n in self.nodes:
            if n.alive and n.role == "leader" and self.group[n.id] == g and (best < 0 or n.term > self.nodes[best].term):
                best = n.id
        return best


print("== 1. Cold start, timeouts random in [150, 300) ms, seed 42 ==")
c = Cluster(150, 300, 42, True)
c.run(1000)
l1 = c.leader_of(0)
print("t=1000ms leader node " + str(l1) + " crashes")
c.nodes[l1].alive = False
c.run(1600)
l2 = c.leader_of(0)
print("failover: node " + str(l2) + " leads term " + str(c.nodes[l2].term) + "; old node " + str(l1) + " restarts as follower")
c.nodes[l1].alive, c.nodes[l1].role = True, "follower"
c.nodes[l1].deadline = c.timeout()
c.run(2000)
buddy = 1 if l2 == 0 else 0
print("t=2000ms partition: {" + str(l2) + "," + str(buddy) + "} cannot reach the other three")
c.group[l2] = c.group[buddy] = 1
c.run(2600)
l3 = c.leader_of(0)
print("t=2600ms node " + str(l2) + " still thinks it leads term " + str(c.nodes[l2].term) + "; node " + str(l3) + " leads term " + str(c.nodes[l3].term))
for i in (l3, l2):
    reach = sum(1 for n in c.nodes if n.alive and c.group[n.id] == c.group[i])
    print("  write via node " + str(i) + ": " + str(reach) + " of 5 acks, " + ("committed" if 2 * reach > N else "NOT committed"))
for fenced in (False, True):
    highest, value, out = 0, "none", []
    for i, v in ((l3, "A"), (l2, "B")):
        token = c.nodes[i].term
        if not fenced or token >= highest:
            highest, value = max(highest, token), v
            out.append("token " + str(token) + " accepted")
        else:
            out.append("token " + str(token) + " rejected")
    print("  storage " + ("with" if fenced else "without") + " fencing: " + ", ".join(out) + "; final value " + value)
print("t=2600ms partition heals")
c.group[l2] = c.group[buddy] = 0
c.run(2800)
print("leaders now: " + ", ".join("node " + str(n.id) + " term " + str(n.term) for n in c.nodes if n.role == "leader"))

print("\\n== 2. Every node uses the same fixed 150 ms timeout ==")
f = Cluster(150, 151, 7, False)
f.run(2000)
print("elections started: " + str(f.elections) + ", leaders elected: " + ("0" if f.first_leader < 0 else "1"))

print("\\n== 3. 200 cold starts per timeout range (seeds 1..200) ==")
for lo, hi in ((150, 155), (150, 200), (150, 300), (150, 450)):
    total = mx = retry = failed = 0
    for s in range(1, 201):
        t = Cluster(lo, hi, s, False)
        while t.first_leader < 0 and t.now < 5000:
            t.run(t.now + 1)
        if t.first_leader < 0:
            failed += 1
            continue
        total += t.first_leader
        mx = max(mx, t.first_leader)
        if t.win_term > 1:
            retry += 1
    ok = 200 - failed
    avg10 = (total * 10 + ok // 2) // ok
    print("[" + str(lo) + ", " + str(hi) + ") ms: avg " + str(avg10 // 10) + "." + str(avg10 % 10) + " ms to a leader, max " + str(mx) + " ms, needed more than one term: " + str(retry) + ", no leader in 5 s: " + str(failed))` },
          { tech: "go", code: `// Raft-style leader election on a fake clock: terms, majority votes,
// randomized timeouts, a crash, a partition and a fencing token.
package main

import (
	"fmt"
	"strings"
)

const N, LAT, HB = 5, 10, 50 // nodes, one-way message delay (ms), heartbeat interval (ms)

var seed uint32 = 1

func rnd() uint32 { // xorshift32, identical in every language
	seed ^= seed << 13
	seed ^= seed >> 17
	seed ^= seed << 5
	return seed
}

type Node struct {
	id, term, voted, votes, deadline, nextHb int
	role                                     string
	alive                                    bool
}
type Msg struct {
	at, from, to, term int
	typ                string
	ok                 bool
}
type Cluster struct {
	now, lo, hi, elections, firstLeader, winTerm int
	verbose                                      bool
	msgs                                         []Msg
	group                                        [N]int
	nodes                                        []*Node
}

func newCluster(lo, hi int, s uint32, verbose bool) *Cluster {
	seed = s
	c := &Cluster{lo: lo, hi: hi, verbose: verbose, firstLeader: -1}
	for i := 0; i < N; i++ {
		c.nodes = append(c.nodes, &Node{id: i, role: "follower", voted: -1, alive: true})
	}
	for _, n := range c.nodes {
		n.deadline = c.timeout()
	}
	return c
}
func (c *Cluster) timeout() int { return c.now + c.lo + int(rnd()%uint32(c.hi-c.lo)) }
func (c *Cluster) say(s string) {
	if c.verbose {
		fmt.Printf("t=%dms %s\\n", c.now, s)
	}
}
func (c *Cluster) send(from, to int, typ string, term int, ok bool) {
	if c.group[from] == c.group[to] {
		c.msgs = append(c.msgs, Msg{c.now + LAT, from, to, term, typ, ok})
	}
}
func (c *Cluster) broadcast(n *Node, typ string) {
	for j := 0; j < N; j++ {
		if j != n.id {
			c.send(n.id, j, typ, n.term, false)
		}
	}
}
func (c *Cluster) handle(n *Node, m Msg) {
	if m.term > n.term {
		if n.role == "leader" {
			c.say(fmt.Sprintf("node %d steps down: saw term %d", n.id, m.term))
		}
		n.term, n.role, n.voted = m.term, "follower", -1
	}
	switch m.typ {
	case "voteReq":
		ok := m.term == n.term && (n.voted == -1 || n.voted == m.from)
		if ok {
			n.voted = m.from
			n.deadline = c.timeout()
		}
		c.send(n.id, m.from, "vote", n.term, ok)
	case "vote":
		if n.role == "candidate" && m.term == n.term && m.ok {
			n.votes++
			if 2*n.votes > N {
				n.role, n.nextHb = "leader", c.now
				if c.firstLeader < 0 {
					c.firstLeader, c.winTerm = c.now, n.term
				}
				c.say(fmt.Sprintf("node %d wins term %d with %d of %d votes", n.id, n.term, n.votes, N))
			}
		}
	case "hb":
		if m.term == n.term {
			n.role = "follower"
			n.deadline = c.timeout()
		} else {
			c.send(n.id, m.from, "hbReject", n.term, false)
		}
	}
}
func (c *Cluster) run(until int) {
	for c.now < until {
		for len(c.msgs) > 0 && c.msgs[0].at <= c.now {
			m := c.msgs[0]
			c.msgs = c.msgs[1:]
			n := c.nodes[m.to]
			if n.alive && c.group[m.from] == c.group[m.to] {
				c.handle(n, m)
			}
		}
		for _, n := range c.nodes {
			if !n.alive {
				continue
			}
			if n.role == "leader" {
				if c.now >= n.nextHb {
					n.nextHb = c.now + HB
					c.broadcast(n, "hb")
				}
			} else if c.now >= n.deadline {
				n.role, n.term, n.voted, n.votes = "candidate", n.term+1, n.id, 1
				n.deadline = c.timeout()
				c.elections++
				c.say(fmt.Sprintf("node %d times out, candidate for term %d", n.id, n.term))
				c.broadcast(n, "voteReq")
			}
		}
		c.now++
	}
}
func (c *Cluster) leaderOf(g int) int {
	best := -1
	for _, n := range c.nodes {
		if n.alive && n.role == "leader" && c.group[n.id] == g && (best < 0 || n.term > c.nodes[best].term) {
			best = n.id
		}
	}
	return best
}

func main() {
	fmt.Println("== 1. Cold start, timeouts random in [150, 300) ms, seed 42 ==")
	c := newCluster(150, 300, 42, true)
	c.run(1000)
	l1 := c.leaderOf(0)
	fmt.Printf("t=1000ms leader node %d crashes\\n", l1)
	c.nodes[l1].alive = false
	c.run(1600)
	l2 := c.leaderOf(0)
	fmt.Printf("failover: node %d leads term %d; old node %d restarts as follower\\n", l2, c.nodes[l2].term, l1)
	c.nodes[l1].alive, c.nodes[l1].role = true, "follower"
	c.nodes[l1].deadline = c.timeout()
	c.run(2000)
	buddy := 0
	if l2 == 0 {
		buddy = 1
	}
	fmt.Printf("t=2000ms partition: {%d,%d} cannot reach the other three\\n", l2, buddy)
	c.group[l2], c.group[buddy] = 1, 1
	c.run(2600)
	l3 := c.leaderOf(0)
	fmt.Printf("t=2600ms node %d still thinks it leads term %d; node %d leads term %d\\n", l2, c.nodes[l2].term, l3, c.nodes[l3].term)
	for _, id := range []int{l3, l2} {
		reach := 0
		for _, n := range c.nodes {
			if n.alive && c.group[n.id] == c.group[id] {
				reach++
			}
		}
		res := "NOT committed"
		if 2*reach > N {
			res = "committed"
		}
		fmt.Printf("  write via node %d: %d of 5 acks, %s\\n", id, reach, res)
	}
	for _, fenced := range []bool{false, true} {
		highest, value, out := 0, "none", []string{}
		ids, vals := []int{l3, l2}, []string{"A", "B"}
		for k, id := range ids {
			token := c.nodes[id].term
			if !fenced || token >= highest {
				highest, value = max(highest, token), vals[k]
				out = append(out, fmt.Sprintf("token %d accepted", token))
			} else {
				out = append(out, fmt.Sprintf("token %d rejected", token))
			}
		}
		w := "without"
		if fenced {
			w = "with"
		}
		fmt.Printf("  storage %s fencing: %s; final value %s\\n", w, strings.Join(out, ", "), value)
	}
	fmt.Println("t=2600ms partition heals")
	c.group[l2], c.group[buddy] = 0, 0
	c.run(2800)
	ls := []string{}
	for _, n := range c.nodes {
		if n.role == "leader" {
			ls = append(ls, fmt.Sprintf("node %d term %d", n.id, n.term))
		}
	}
	fmt.Println("leaders now: " + strings.Join(ls, ", "))

	fmt.Println("\\n== 2. Every node uses the same fixed 150 ms timeout ==")
	f := newCluster(150, 151, 7, false)
	f.run(2000)
	won := 0
	if f.firstLeader >= 0 {
		won = 1
	}
	fmt.Printf("elections started: %d, leaders elected: %d\\n", f.elections, won)

	fmt.Println("\\n== 3. 200 cold starts per timeout range (seeds 1..200) ==")
	for _, r := range [][2]int{{150, 155}, {150, 200}, {150, 300}, {150, 450}} {
		sum, mx, retry, failed := 0, 0, 0, 0
		for s := uint32(1); s <= 200; s++ {
			t := newCluster(r[0], r[1], s, false)
			for t.firstLeader < 0 && t.now < 5000 {
				t.run(t.now + 1)
			}
			if t.firstLeader < 0 {
				failed++
				continue
			}
			sum += t.firstLeader
			mx = max(mx, t.firstLeader)
			if t.winTerm > 1 {
				retry++
			}
		}
		ok := 200 - failed
		avg10 := (sum*10 + ok/2) / ok
		fmt.Printf("[%d, %d) ms: avg %d.%d ms to a leader, max %d ms, needed more than one term: %d, no leader in 5 s: %d\\n", r[0], r[1], avg10/10, avg10%10, mx, retry, failed)
	}
}` },
          { tech: "java", code: `// Raft-style leader election on a fake clock: terms, majority votes,
// randomized timeouts, a crash, a partition and a fencing token.
import java.util.*;

public class Main {
    static final int N = 5, LAT = 10, HB = 50; // nodes, one-way message delay (ms), heartbeat interval (ms)
    static long seed = 1;

    static long rnd() { // xorshift32, identical in every language
        seed = (seed ^ (seed << 13)) & 0xFFFFFFFFL;
        seed = (seed ^ (seed >>> 17)) & 0xFFFFFFFFL;
        seed = (seed ^ (seed << 5)) & 0xFFFFFFFFL;
        return seed;
    }

    static class Node {
        int id, term = 0, voted = -1, votes = 0, deadline = 0, nextHb = 0;
        String role = "follower";
        boolean alive = true;
        Node(int i) { id = i; }
    }

    record Msg(int at, int from, int to, String typ, int term, boolean ok) {}

    static class Cluster {
        int now = 0, lo, hi, elections = 0, firstLeader = -1, winTerm = 0;
        boolean verbose;
        ArrayDeque<Msg> msgs = new ArrayDeque<>();
        int[] group = new int[N];
        Node[] nodes = new Node[N];

        Cluster(int lo, int hi, long s, boolean verbose) {
            seed = s;
            this.lo = lo; this.hi = hi; this.verbose = verbose;
            for (int i = 0; i < N; i++) nodes[i] = new Node(i);
            for (Node n : nodes) n.deadline = timeout();
        }
        int timeout() { return now + lo + (int) (rnd() % (hi - lo)); }
        void say(String s) { if (verbose) System.out.println("t=" + now + "ms " + s); }
        void send(int from, int to, String typ, int term, boolean ok) {
            if (group[from] == group[to]) msgs.addLast(new Msg(now + LAT, from, to, typ, term, ok));
        }
        void broadcast(Node n, String typ) { for (int j = 0; j < N; j++) if (j != n.id) send(n.id, j, typ, n.term, false); }
        void handle(Node n, Msg m) {
            if (m.term() > n.term) {
                if (n.role.equals("leader")) say("node " + n.id + " steps down: saw term " + m.term());
                n.term = m.term(); n.role = "follower"; n.voted = -1;
            }
            if (m.typ().equals("voteReq")) {
                boolean ok = m.term() == n.term && (n.voted == -1 || n.voted == m.from());
                if (ok) { n.voted = m.from(); n.deadline = timeout(); }
                send(n.id, m.from(), "vote", n.term, ok);
            } else if (m.typ().equals("vote")) {
                if (n.role.equals("candidate") && m.term() == n.term && m.ok()) {
                    n.votes++;
                    if (2 * n.votes > N) {
                        n.role = "leader"; n.nextHb = now;
                        if (firstLeader < 0) { firstLeader = now; winTerm = n.term; }
                        say("node " + n.id + " wins term " + n.term + " with " + n.votes + " of " + N + " votes");
                    }
                }
            } else if (m.typ().equals("hb")) {
                if (m.term() == n.term) { n.role = "follower"; n.deadline = timeout(); }
                else send(n.id, m.from(), "hbReject", n.term, false);
            }
        }
        void run(int until) {
            while (now < until) {
                while (!msgs.isEmpty() && msgs.peekFirst().at() <= now) {
                    Msg m = msgs.pollFirst();
                    Node n = nodes[m.to()];
                    if (n.alive && group[m.from()] == group[m.to()]) handle(n, m);
                }
                for (Node n : nodes) {
                    if (!n.alive) continue;
                    if (n.role.equals("leader")) {
                        if (now >= n.nextHb) { n.nextHb = now + HB; broadcast(n, "hb"); }
                    } else if (now >= n.deadline) {
                        n.role = "candidate"; n.term++; n.voted = n.id; n.votes = 1; n.deadline = timeout(); elections++;
                        say("node " + n.id + " times out, candidate for term " + n.term);
                        broadcast(n, "voteReq");
                    }
                }
                now++;
            }
        }
        int leaderOf(int g) {
            int best = -1;
            for (Node n : nodes) if (n.alive && n.role.equals("leader") && group[n.id] == g && (best < 0 || n.term > nodes[best].term)) best = n.id;
            return best;
        }
    }

    public static void main(String[] args) {
        System.out.println("== 1. Cold start, timeouts random in [150, 300) ms, seed 42 ==");
        Cluster c = new Cluster(150, 300, 42, true);
        c.run(1000);
        int l1 = c.leaderOf(0);
        System.out.println("t=1000ms leader node " + l1 + " crashes");
        c.nodes[l1].alive = false;
        c.run(1600);
        int l2 = c.leaderOf(0);
        System.out.println("failover: node " + l2 + " leads term " + c.nodes[l2].term + "; old node " + l1 + " restarts as follower");
        c.nodes[l1].alive = true; c.nodes[l1].role = "follower"; c.nodes[l1].deadline = c.timeout();
        c.run(2000);
        int buddy = l2 == 0 ? 1 : 0;
        System.out.println("t=2000ms partition: {" + l2 + "," + buddy + "} cannot reach the other three");
        c.group[l2] = 1; c.group[buddy] = 1;
        c.run(2600);
        int l3 = c.leaderOf(0);
        System.out.println("t=2600ms node " + l2 + " still thinks it leads term " + c.nodes[l2].term + "; node " + l3 + " leads term " + c.nodes[l3].term);
        for (int id : new int[] {l3, l2}) {
            int reach = 0;
            for (Node n : c.nodes) if (n.alive && c.group[n.id] == c.group[id]) reach++;
            System.out.println("  write via node " + id + ": " + reach + " of 5 acks, " + (2 * reach > N ? "committed" : "NOT committed"));
        }
        for (boolean fenced : new boolean[] {false, true}) {
            int highest = 0;
            String value = "none";
            List<String> out = new ArrayList<>();
            int[] ids = {l3, l2};
            String[] vals = {"A", "B"};
            for (int k = 0; k < 2; k++) {
                int token = c.nodes[ids[k]].term;
                if (!fenced || token >= highest) { highest = Math.max(highest, token); value = vals[k]; out.add("token " + token + " accepted"); }
                else out.add("token " + token + " rejected");
            }
            System.out.println("  storage " + (fenced ? "with" : "without") + " fencing: " + String.join(", ", out) + "; final value " + value);
        }
        System.out.println("t=2600ms partition heals");
        c.group[l2] = 0; c.group[buddy] = 0;
        c.run(2800);
        List<String> ls = new ArrayList<>();
        for (Node n : c.nodes) if (n.role.equals("leader")) ls.add("node " + n.id + " term " + n.term);
        System.out.println("leaders now: " + String.join(", ", ls));

        System.out.println("\\n== 2. Every node uses the same fixed 150 ms timeout ==");
        Cluster f = new Cluster(150, 151, 7, false);
        f.run(2000);
        System.out.println("elections started: " + f.elections + ", leaders elected: " + (f.firstLeader < 0 ? 0 : 1));

        System.out.println("\\n== 3. 200 cold starts per timeout range (seeds 1..200) ==");
        for (int[] r : new int[][] {{150, 155}, {150, 200}, {150, 300}, {150, 450}}) {
            int sum = 0, mx = 0, retry = 0, failed = 0;
            for (int s = 1; s <= 200; s++) {
                Cluster t = new Cluster(r[0], r[1], s, false);
                while (t.firstLeader < 0 && t.now < 5000) t.run(t.now + 1);
                if (t.firstLeader < 0) { failed++; continue; }
                sum += t.firstLeader; mx = Math.max(mx, t.firstLeader);
                if (t.winTerm > 1) retry++;
            }
            int ok = 200 - failed, avg10 = (sum * 10 + ok / 2) / ok;
            System.out.println("[" + r[0] + ", " + r[1] + ") ms: avg " + (avg10 / 10) + "." + (avg10 % 10) + " ms to a leader, max " + mx + " ms, needed more than one term: " + retry + ", no leader in 5 s: " + failed);
        }
    }
}` },
        ],
      },
    ],
  },
];

export default augments;
