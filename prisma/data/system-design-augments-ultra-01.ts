/**
 * SYSTEM DESIGN ULTRA — batch 01: Scaling fundamentals. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `What is the difference between horizontal and vertical scaling?`,
    difficulty: "medium",
    seoDescription: `Vertical scaling buys a bigger machine; horizontal scaling adds more machines. Learn the ceilings, failure modes and the maths behind each.`,
    description: `**Question presented to candidate:**
"Our API is running hot on a single server and traffic keeps growing. You could move it to a bigger machine, or run several copies behind a load balancer. Walk me through the difference between vertical and horizontal scaling, when you would pick each, and what the second option forces you to change."

**What a strong answer should cover:**
- Clear definitions: **vertical scaling (scale up)** adds CPU, RAM or faster disks to one machine; **horizontal scaling (scale out)** adds more machines and spreads load across them
- Vertical needs no code change but has a hard hardware ceiling, usually needs a restart to resize, and stays a **single point of failure**
- Horizontal gives redundancy and near-elastic capacity, but only if the service is **stateless** (or the data is partitioned) and a load balancer sits in front
- Scaling out is not free: shared bottlenecks (a lock, one primary database) and coordination cost make throughput flatten or even fall (**Amdahl's law**, **Universal Scalability Law**)
- Availability arithmetic: one node at 99.5% vs N+1 nodes where one may fail; and the usual real path — scale the database up first, scale the stateless tier out, then add replicas and shards

**Clarifying questions expected:**
- Which tier is the bottleneck: the stateless web/API tier or the stateful database?
- Is the problem throughput, latency, or availability (do we also need to survive a machine failure)?

**Code / implementation expected:** Optional — the throughput and availability arithmetic (as in the example) is more useful than code; no implementation is required.`,
    answer: `**Target Audience:** Beginners to system design — you know what a server and a database are, nothing more.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (the example prints the same table in both).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every number below comes from actually running the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

You run a small pizza shop with one oven and one cook. On Friday nights the orders pile up. You have two options.

**Option one: a bigger kitchen.** Buy a huge oven, hire a cook who works twice as fast. Nothing else about the shop changes — same phone number, same counter, same recipe book. But there is a largest oven you can buy, the shop is closed while the new one is installed, and if that one cook calls in sick, nobody gets pizza.

**Option two: more kitchens.** Open three small kitchens with an ordinary oven and cook each, and put someone at the door who sends each order to whichever kitchen is free. You can keep opening kitchens, and if one burns down the other two keep serving. But now the kitchens must share things: the same recipe book, the same list of who ordered what. If every kitchen has to phone the head office before each pizza, the head office becomes the new queue.

That is the whole question. Option one is **vertical scaling**, option two is **horizontal scaling**, and the hard part of option two is everything the kitchens have to share.

## 2. The Two Definitions

📌 **Interview term: vertical scaling (scale up)** — making one machine more powerful: more CPU cores, more RAM, faster disks or network. The software does not change; it just runs on a bigger box.

📌 **Interview term: horizontal scaling (scale out)** — adding more machines (often called **nodes** or **instances**) that run the same software, with a **load balancer** in front that spreads requests across them. See [What is a load balancer and what strategies does it use?](/interview-question/what-is-a-load-balancer-and-what-strategies-does-it-use)

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Vertical scaling replaces one server with a bigger one, three times, and it is still one machine">
  <defs>
    <marker id="sd01q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="130" width="120" height="70" rx="10"/>
  <text class="d-text" x="100" y="160" text-anchor="middle">Server</text>
  <text class="d-sub" x="100" y="184" text-anchor="middle">4 vCPU, 16 GB</text>
  <rect class="d-box" x="260" y="95" width="170" height="105" rx="10"/>
  <text class="d-text" x="345" y="140" text-anchor="middle">Server</text>
  <text class="d-sub" x="345" y="168" text-anchor="middle">16 vCPU, 64 GB</text>
  <rect class="d-box-accent" x="520" y="40" width="170" height="160" rx="10"/>
  <text class="d-text" x="605" y="100" text-anchor="middle">Server</text>
  <text class="d-sub" x="605" y="128" text-anchor="middle">64 vCPU, 256 GB</text>
  <text class="d-sub" x="605" y="160" text-anchor="middle">still one machine</text>
  <text class="d-sub" x="209" y="122" text-anchor="middle">resize</text>
  <path class="d-edge" d="M 166 165 L 252 150" marker-end="url(#sd01q1-arrow)"/>
  <text class="d-sub" x="475" y="100" text-anchor="middle">resize</text>
  <path class="d-edge" d="M 436 145 L 512 125" marker-end="url(#sd01q1-arrow)"/>
</svg>

Scaling up: each step is a bigger machine running the same code. Simple, but every step usually means a restart, the steps get expensive, and the last box is still a single machine.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Horizontal scaling puts a load balancer in front of several identical servers, and a fourth server is added live">
  <defs>
    <marker id="sd01q1-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="280" y="20" width="160" height="50" rx="10"/>
  <text class="d-text" x="360" y="51" text-anchor="middle">Clients</text>
  <rect class="d-box-accent" x="260" y="110" width="200" height="56" rx="10"/>
  <text class="d-text" x="360" y="144" text-anchor="middle">Load balancer</text>
  <rect class="d-box" x="40" y="220" width="120" height="60" rx="10"/>
  <text class="d-text" x="100" y="256" text-anchor="middle">Server 1</text>
  <rect class="d-box" x="210" y="220" width="120" height="60" rx="10"/>
  <text class="d-text" x="270" y="256" text-anchor="middle">Server 2</text>
  <rect class="d-box" x="390" y="220" width="120" height="60" rx="10"/>
  <text class="d-text" x="450" y="256" text-anchor="middle">Server 3</text>
  <rect class="d-box-muted" x="560" y="220" width="120" height="60" rx="10"/>
  <text class="d-text" x="620" y="246" text-anchor="middle">Server 4</text>
  <text class="d-sub" x="620" y="268" text-anchor="middle">added live</text>
  <path class="d-edge" d="M 360 70 L 360 104" marker-end="url(#sd01q1-arrow2)"/>
  <path class="d-edge" d="M 330 166 L 108 214" marker-end="url(#sd01q1-arrow2)"/>
  <path class="d-edge" d="M 350 166 L 274 214" marker-end="url(#sd01q1-arrow2)"/>
  <path class="d-edge" d="M 370 166 L 446 214" marker-end="url(#sd01q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 390 166 L 612 214" marker-end="url(#sd01q1-arrow2)"/>
</svg>

Scaling out: identical copies behind a load balancer. A new copy joins without stopping the others, and losing one copy loses only its share of capacity.

## 3. Side by Side

| | Vertical (scale up) | Horizontal (scale out) |
| :--- | :--- | :--- |
| What you add | a bigger machine | more machines |
| Code changes | none | service must be stateless or data must be partitioned |
| Ceiling | the largest machine you can buy or rent | very high, but limited by shared bottlenecks (section 4) |
| Failure | one machine = **single point of failure** | one node fails, the rest keep serving |
| Changing size | usually a restart (downtime unless you fail over) | add or remove nodes while running |
| Cost curve | top-end hardware costs more per unit of capacity | roughly linear, uses ordinary machines |
| Operational load | one box to patch and watch | many boxes, a load balancer, deploys, service discovery |
| Consistency | trivial — one memory, one disk | needs coordination for anything shared |

📌 **Interview term: single point of failure (SPOF)** — a component whose failure takes the whole system down. A single big server is one; so is a single load balancer or a single primary database if nothing takes over.

📌 **Interview term: elasticity** — the ability to add and remove capacity as load changes, usually automatically (**autoscaling**). It is a property of horizontal scaling: you cannot add half a CPU to a running machine on most platforms, but you can add a fifth instance.

### How big can "up" go?

Bigger than most people expect, which is why vertical scaling is a respectable first move. In December 2024 AWS announced the EC2 **U7inh** high-memory instance with **1,920 vCPUs and 32 TB of memory**, built for large in-memory databases such as SAP HANA (source: AWS "What's New", *Introducing Amazon EC2 High Memory U7inh Instance*, December 2024). That is the extreme end; the point is that "one machine" can hold a surprising amount.

The catch is the change itself. On AWS, an EBS-backed instance **must be stopped** before its instance type can be changed, so a resize is a planned outage for that machine unless something else takes its traffic (source: AWS EC2 documentation on changing the instance type). Instance-store data and an auto-assigned public IP are lost on stop.

## 4. Why Scaling Out Is Not Free: Contention and Coherency

If you had 10 servers and the work split perfectly, you would get 10 times the throughput. Real systems do not, for two reasons:

- **Contention**: some part of the work can only be done by one thing at a time — a lock, a single primary database, a counter everyone updates. Requests queue for it no matter how many servers you add.
- **Coherency**: nodes have to keep each other up to date — cache invalidations, distributed locks, replication, cluster membership chatter. This cost grows with the *number of pairs* of nodes, so it grows faster than the node count.

📌 **Interview term: Amdahl's law** — if a fraction σ of the work is serial, the speed-up from N workers is at most N / (1 + σ(N − 1)), which can never exceed 1/σ. With 3% serial work, no number of servers gets you past about 33x.

📌 **Interview term: Universal Scalability Law (USL)** — Neil Gunther's extension of Amdahl's law that adds a coherency term κ: throughput(N) = N / (1 + σ(N − 1) + κN(N − 1)). With κ > 0 the curve has a peak at N = √((1 − σ)/κ), and adding nodes beyond it makes the system **slower**. (Gunther's own notation uses α and β for the same two parameters; the formula and the peak are from *Guerrilla Capacity Planning* as summarised in the R \`usl\` package documentation.)

The example program puts numbers on this. One node does 1,000 requests per second; σ = 0.03 (3% contention) and κ = 0.0005 (coherency) are assumptions, the kind you would fit from a real load test:

~~~js
const usl = (n, s, k) => (ONE_NODE * n) / (1 + s * (n - 1) + k * n * (n - 1));
for (const n of [1, 2, 4, 8, 16, 32, 44, 64, 128]) { /* print linear, amdahl, usl */ }
const peak = Math.sqrt((1 - SIGMA) / KAPPA);
~~~

~~~text
nodes  linear  amdahl(k=0)  usl
    1    1000         1000   1000
    8    8000         6612   6462
   32   32000        16580  13190
   44   44000        19214  13597
   64   64000        22145  13045
  128  128000        26611   9893
~~~

What the run shows:

- At 8 nodes you still get about 81% of linear (6,462 of 8,000). Scaling out works well at small counts.
- At 32 nodes you get 13,190 — less than half of linear.
- The peak is at **44 nodes** (13,597 req/s). At 64 nodes throughput is *lower* (13,045), and at 128 nodes it has fallen to 9,893. More hardware, less work done.

This is the honest answer to "horizontal scales without limit": it does only if you remove the shared bottleneck. That is why scaling out a web tier is easy (no shared state between requests — see [Why prefer stateless services and how do you handle sessions?](/interview-question/why-prefer-stateless-services-and-how-do-you-handle-sessions)), while scaling out a database means splitting the data so that each node owns a separate part ([What is database sharding?](/interview-question/what-is-database-sharding)).

<div style="background:#0f1a24;border-left:4px solid #4fc3f7;border-radius:6px;padding:14px 18px;margin:18px 0;color:#d6e6f2;"><strong style="color:#4fc3f7;">Key insight:</strong> <span style="color:#d6e6f2;">Horizontal scaling multiplies whatever is not shared. The design work is finding what is shared (a session, a lock, one database primary) and either removing it, moving it into a component built to scale, or partitioning it so each node owns its own slice.</span></div>

## 5. Availability: One Big Box vs Several Small Ones

Scaling out changes failure behaviour as much as capacity. Suppose every machine, big or small, is up 99.5% of the time and failures are independent (both assumptions — 99.5% happens to be the per-instance figure in the AWS Compute SLA, which is a credit threshold, not a promise). The example computes the probability that *enough* nodes are up:

~~~text
1 big node (scale up)               99.5000%    43.80 h/yr down
3 nodes, need 2 (N+1)               99.9925%     0.65 h/yr down
3 nodes, need all 3 (no spare)      98.5075%   130.74 h/yr down
~~~

📌 **Interview term: N+1 redundancy** — run one more node than the load needs, so any single node can fail (or be taken down for a deploy) without dropping capacity below what is required.

Two lessons in three lines:

- Three nodes sized so that **two can carry the load** take you from about 44 hours of downtime a year to well under one hour.
- Three nodes that **all** must be up are *worse* than one big node (130.74 h). Scaling out without spare capacity multiplies the ways to fail. Horizontal scaling only buys availability when you keep headroom.

The real figures are lower than this because failures are *not* independent — a bad deploy, a full availability zone or a shared database takes several nodes at once. That is the subject of [How do you design for high availability?](/interview-question/how-do-you-design-for-high-availability)

## 6. Which Tier Scales Which Way

Real systems use both, chosen per tier:

| Tier | Usual move | Why |
| :--- | :--- | :--- |
| Web / API servers | scale out | no data lives there once sessions are externalised; add instances behind the load balancer |
| Cache (Redis, Memcached) | scale up first, then shard | one node goes far; partition keys across nodes when memory runs out |
| Relational database | scale up first, then read replicas, then shard | writes go to one primary; sharding is expensive to build and run |
| Background workers | scale out | they pull jobs from a queue; more workers drain it faster |
| Stateful streams / search | scale out by partition | the data is already split into partitions or shards |

📌 **Interview term: diagonal scaling** — scaling up until the next step stops being cost-effective, then scaling out with those larger nodes. Most production databases follow this path: a bigger primary, then [read replicas](/interview-question/when-do-you-use-a-read-replica-vs-a-cache), then [sharding](/interview-question/what-is-database-sharding) with [consistent hashing](/interview-question/what-is-consistent-hashing) when one primary cannot take the writes.

Before scaling either way, check the cheaper fixes: a missing index, a cache in front of hot reads ([How does caching improve system performance?](/interview-question/how-does-caching-improve-system-performance)), or an N+1 query pattern can be worth more than a bigger machine.

## 7. Verified: Running the Code

The example **"Scale up vs scale out: USL throughput and N+1 availability"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`; both print exactly this:

~~~text
Throughput (req/s) as nodes are added
nodes  linear  amdahl(k=0)  usl
    1    1000         1000   1000
    2    2000         1942   1940
    4    4000         3670   3650
    8    8000         6612   6462
   16   16000        11034  10191
   32   32000        16580  13190
   44   44000        19214  13597
   64   64000        22145  13045
  128  128000        26611   9893
USL peak at sqrt((1-sigma)/kappa) = 44.0 nodes

Availability with each node at 99.5%
1 big node (scale up)               99.5000%    43.80 h/yr down
2 nodes, need 1 (active-passive)    99.9975%     0.22 h/yr down
3 nodes, need 2 (N+1)               99.9925%     0.65 h/yr down
4 nodes, need 3 (N+1)               99.9851%     1.31 h/yr down
3 nodes, need all 3 (no spare)      98.5075%   130.74 h/yr down
~~~

What it simulates and what it leaves out: the throughput table is the USL formula with assumed σ and κ, not a measurement; in practice you fit σ and κ from load-test results at a few node counts. The availability table assumes independent failures, which real systems do not have.

## Edge Cases Worth Knowing

- **Vertical can win on latency.** Data that fits in one machine's memory is served without network hops; splitting it across nodes adds a round trip for anything that spans two of them.
- **Licences priced per core or per node** change the cost comparison in either direction.
- **Some workloads do not split.** A single large transaction, a graph traversal or one hot key cannot be spread across nodes by adding nodes.
- **Scaling in** (removing nodes) needs care too: drain connections first, and be sure no node holds work or state that is lost when it goes.

## Common Pitfalls

- **Saying horizontal scaling is unlimited.** It is limited by whatever is shared; the USL run peaks at 44 nodes and declines after.
- **Scaling out a stateful service as if it were stateless.** In-memory sessions or local file uploads break as soon as a second instance exists.
- **Counting nodes without spare capacity.** Three nodes that all must be up are less available than one node.
- **Forgetting the load balancer and database are part of the system.** One load balancer or one primary database in front of twenty web servers is still a single point of failure.
- **Jumping to sharding first.** A bigger database machine plus read replicas is far cheaper to run than a sharded cluster; shard when the write rate or data size forces it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definitions:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Vertical scaling</strong> makes one machine bigger — more CPU, RAM, faster disk. <strong style="color:#ffca28;">Horizontal scaling</strong> adds more machines running the same code behind a load balancer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Vertical trade-off:</strong> <span style="color:#f0e2c8;">No code change and no coordination, but a hardware ceiling, usually a restart to resize, and it stays a <strong style="color:#ffca28;">single point of failure</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Horizontal trade-off:</strong> <span style="color:#f0e2c8;">Near-elastic capacity and redundancy, but the service must be <strong style="color:#ffca28;">stateless</strong> or the data partitioned, and you now run a load balancer, deploys and service discovery.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Limits:</strong> <span style="color:#f0e2c8;">Scaling out is capped by what is shared: Amdahl's law for serial work and the <strong style="color:#ffca28;">Universal Scalability Law</strong> for coordination cost, which can make throughput fall past a peak.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In practice:</strong> <span style="color:#f0e2c8;">Scale the stateless tier out with N+1 spare capacity, scale the database up first, then add read replicas, and shard only when writes or data size force it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you deliberately choose vertical scaling?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the bottleneck is a stateful component that is hard to split, usually the primary database, and a bigger machine buys enough headroom. It is also the fastest fix in an incident, as long as you can afford the restart or have a replica to fail over to.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does adding servers sometimes make the system slower?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Coordination cost. Each node must stay consistent with the others — cache invalidations, locks, replication — and that cost grows with pairs of nodes. In the USL model with 3% contention and κ = 0.0005, throughput peaks at 44 nodes and drops to 9,893 req/s at 128.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does horizontal scaling automatically improve availability?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only with spare capacity. Three nodes where two can carry the load reach 99.9925% from 99.5% nodes; three nodes that must all be up give 98.5075%, worse than one machine. Correlated failures like a bad deploy reduce both figures.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you have to change in an application before you can scale it out?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move per-user state out of process memory (sessions to a shared store or signed token), put files in object storage instead of local disk, make background jobs safe to run on many nodes, and make requests safe to retry on a different node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you scale a database horizontally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reads first, with <strong style="color:#ffca28;">read replicas</strong>. For writes, <strong style="color:#ffca28;">shard</strong>: split the data by a key so each node owns a slice, usually with consistent hashing so adding a node moves only a fraction of the keys. Cross-shard queries and transactions are the cost.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Vertical scaling (scale up) | Making one machine more powerful |
| Horizontal scaling (scale out) | Adding more machines that share the load |
| Single point of failure (SPOF) | A component whose failure stops the whole system |
| Elasticity | Adding and removing capacity as load changes, often automatically |
| Amdahl's law | Speed-up is capped by the fraction of work that must run serially |
| Universal Scalability Law (USL) | Amdahl's law plus a coordination term; throughput peaks and then falls |
| N+1 redundancy | One more node than the load needs, so one can fail without losing capacity |
| Diagonal scaling | Scale up until it stops paying off, then scale out with the larger nodes |

**Conclusion:** Vertical scaling makes one machine bigger: it needs no code changes and no coordination, but it has a ceiling, usually needs a restart, and leaves a single point of failure. Horizontal scaling adds machines behind a load balancer: it gives redundancy and room to grow, but only for work that does not share state, and coordination cost (the USL) means more nodes can eventually do less. A strong answer names both trade-offs, shows the availability effect of N+1 spare capacity, and describes the usual mix — stateless tiers scaled out, the database scaled up first and then replicated and sharded.`,
    examples: [
      {
        label: `Scale up vs scale out: USL throughput and N+1 availability`,
        variants: [
          { tech: "node", code: `// Two numbers that decide "scale up or scale out":
// 1. How throughput grows with node count (Universal Scalability Law).
// 2. How availability changes when one big box becomes several small ones.

const ONE_NODE = 1000; // requests/s one node handles alone (assumption)
const SIGMA = 0.03;    // contention: 3% of the work is serialised (a lock, a primary DB)
const KAPPA = 0.0005;  // coherency: cost of nodes keeping each other in sync

const round = (x) => Math.floor(x + 0.5);
const usl = (n, s, k) => (ONE_NODE * n) / (1 + s * (n - 1) + k * n * (n - 1));

console.log("Throughput (req/s) as nodes are added");
console.log("nodes  linear  amdahl(k=0)  usl");
for (const n of [1, 2, 4, 8, 16, 32, 44, 64, 128]) {
  console.log(
    String(n).padStart(5) +
    String(ONE_NODE * n).padStart(8) +
    String(round(usl(n, SIGMA, 0))).padStart(13) +
    String(round(usl(n, SIGMA, KAPPA))).padStart(7)
  );
}
const peak = Math.sqrt((1 - SIGMA) / KAPPA);
console.log("USL peak at sqrt((1-sigma)/kappa) = " + peak.toFixed(1) + " nodes");
console.log("");

// Availability: each node is up 99.5% of the time, failures independent (assumption).
const A = 0.995;
const HOURS = 365 * 24;
function choose(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}
// probability that at least \`need\` of \`n\` nodes are up
function atLeast(n, need, a) {
  let p = 0;
  for (let up = need; up <= n; up++) p += choose(n, up) * a ** up * (1 - a) ** (n - up);
  return p;
}
function show(label, p) {
  console.log(
    label.padEnd(34) + (p * 100).toFixed(4).padStart(9) + "%" +
    ((1 - p) * HOURS).toFixed(2).padStart(9) + " h/yr down"
  );
}
console.log("Availability with each node at 99.5%");
show("1 big node (scale up)", atLeast(1, 1, A));
show("2 nodes, need 1 (active-passive)", atLeast(2, 1, A));
show("3 nodes, need 2 (N+1)", atLeast(3, 2, A));
show("4 nodes, need 3 (N+1)", atLeast(4, 3, A));
show("3 nodes, need all 3 (no spare)", atLeast(3, 3, A));` },
          { tech: "python", code: `# Two numbers that decide "scale up or scale out":
# 1. How throughput grows with node count (Universal Scalability Law).
# 2. How availability changes when one big box becomes several small ones.
import math

ONE_NODE = 1000  # requests/s one node handles alone (assumption)
SIGMA = 0.03     # contention: 3% of the work is serialised (a lock, a primary DB)
KAPPA = 0.0005   # coherency: cost of nodes keeping each other in sync


def rnd(x):
    return math.floor(x + 0.5)


def usl(n, s, k):
    return (ONE_NODE * n) / (1 + s * (n - 1) + k * n * (n - 1))


print("Throughput (req/s) as nodes are added")
print("nodes  linear  amdahl(k=0)  usl")
for n in [1, 2, 4, 8, 16, 32, 44, 64, 128]:
    print(str(n).rjust(5) + str(ONE_NODE * n).rjust(8)
          + str(rnd(usl(n, SIGMA, 0))).rjust(13)
          + str(rnd(usl(n, SIGMA, KAPPA))).rjust(7))
peak = math.sqrt((1 - SIGMA) / KAPPA)
print(f"USL peak at sqrt((1-sigma)/kappa) = {peak:.1f} nodes")
print("")

# Availability: each node is up 99.5% of the time, failures independent (assumption).
A = 0.995
HOURS = 365 * 24


def choose(n, k):
    r = 1
    for i in range(1, k + 1):
        r = (r * (n - k + i)) / i
    return r


def at_least(n, need, a):
    """probability that at least \`need\` of \`n\` nodes are up"""
    p = 0
    for up in range(need, n + 1):
        p += choose(n, up) * a ** up * (1 - a) ** (n - up)
    return p


def show(label, p):
    print(label.ljust(34) + f"{p * 100:.4f}".rjust(9) + "%"
          + f"{(1 - p) * HOURS:.2f}".rjust(9) + " h/yr down")


print("Availability with each node at 99.5%")
show("1 big node (scale up)", at_least(1, 1, A))
show("2 nodes, need 1 (active-passive)", at_least(2, 1, A))
show("3 nodes, need 2 (N+1)", at_least(3, 2, A))
show("4 nodes, need 3 (N+1)", at_least(4, 3, A))
show("3 nodes, need all 3 (no spare)", at_least(3, 3, A))` },
        ],
      },
    ],
  },
  {
    title: `Why prefer stateless services and how do you handle sessions?`,
    difficulty: "medium",
    seoDescription: `Stateless services let any instance serve any request. Compare in-memory, sticky, shared-store and signed-token sessions, with revocation trade-offs.`,
    description: `**Question presented to candidate:**
"We want to run our web app on many instances behind a load balancer and autoscale it. Why does everyone say the instances should be stateless? Users still log in and have carts, so where does that session data go, and what are the trade-offs between the options?"

**What a strong answer should cover:**
- Definition: a **stateless service** keeps nothing about a client in process memory between requests, so any instance can serve any request and instances can be added, killed or replaced freely
- What breaks with in-memory sessions: round-robin sends the next request to an instance that never saw the login; **sticky sessions** patch that but lose sessions when the instance dies and skew load
- The two real answers: a **shared session store** (session ID in a cookie, data in Redis or a database — central and revocable, one lookup per request) or a **signed token** such as a JWT (no lookup, but hard to revoke before it expires and sent on every request)
- Token details: HMAC vs public-key signatures, short \`exp\` plus refresh tokens, a \`jti\` denylist for logout, \`HttpOnly\`/\`Secure\`/\`SameSite\` cookies, the roughly 4 KB per-cookie budget
- The other hidden state to move out: uploaded files, local caches that must be consistent, scheduled jobs, rate-limit counters, open WebSocket connections

**Clarifying questions expected:**
- Do we need instant logout or permission revocation (for example banking or admin roles)?
- Is this browser traffic, mobile apps, service-to-service calls, or long-lived WebSockets?

**Code / implementation expected:** Optional — sketching the session lookup or a token sign/verify step helps; the example simulates all four approaches.`,
    answer: `**Target Audience:** Beginners to system design — you have built a web app with a login, nothing more.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (the example prints the same output, byte for byte, including the token).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A music festival has three entrance gates. On day one you buy a ticket at gate 1 and the guard there *remembers your face*. On day two you walk up to gate 2. That guard has never seen you: "Sorry, no ticket." Annoying, but you go back to gate 1 — and that works, until the gate 1 guard goes home sick. Now nobody remembers you.

The festival tries two fixes. **Fix one:** a central list. Every guard radios the ticket office with your name and gets a yes or no. Any gate works, a guard going home loses nothing, and the office can cancel your ticket instantly — but every entry costs a radio call, and if the office is down nobody gets in. **Fix two:** a tamper-proof wristband with your name and the expiry date printed on it, sealed with a stamp only the festival owns. Any guard can check the stamp in a second without calling anyone. The downside: if you are thrown out, your wristband still looks valid until the date printed on it.

The guard with a memory is a **stateful** server. The central list is a **shared session store**. The wristband is a **signed token**. Everything in this question is choosing between those three.

## 2. What "Stateless" Means

📌 **Interview term: stateless service** — a service instance that keeps no information about a particular client in its own memory between requests. Everything needed to handle a request arrives *with* the request (a token) or is fetched from a shared system (a database, a cache). Any instance can handle any request.

📌 **Interview term: session state** — what the server needs to remember about a user across requests: who they are, their roles, a cart, a CSRF token, a multi-step form in progress.

"Stateless" does not mean the *system* has no state — it means the state lives somewhere built to hold it, not in the memory of one interchangeable web server. What you get:

- **Horizontal scaling**: add instances and the load balancer can use them immediately, with any algorithm. See [What is the difference between horizontal and vertical scaling?](/interview-question/what-is-the-difference-between-horizontal-and-vertical-scaling)
- **Free failover and deploys**: kill an instance, roll a new version, scale in at night — no user notices, because no instance held anything unique.
- **Even load**: the load balancer is not forced to send a user back to the same instance, so it can pick the least loaded one. See [What is a load balancer and what strategies does it use?](/interview-question/what-is-a-load-balancer-and-what-strategies-does-it-use)

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Sticky load balancing pins a user to the one instance that holds the session in memory">
  <defs>
    <marker id="sd01q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="105" width="160" height="60" rx="10"/>
  <text class="d-text" x="120" y="140" text-anchor="middle">Load balancer</text>
  <rect class="d-box-accent" x="440" y="20" width="240" height="64" rx="10"/>
  <text class="d-text" x="560" y="46" text-anchor="middle">Instance 1</text>
  <text class="d-sub" x="560" y="70" text-anchor="middle">session of alice in memory</text>
  <rect class="d-box-muted" x="440" y="115" width="240" height="56" rx="10"/>
  <text class="d-text" x="560" y="148" text-anchor="middle">Instance 2</text>
  <rect class="d-box-muted" x="440" y="200" width="240" height="56" rx="10"/>
  <text class="d-text" x="560" y="233" text-anchor="middle">Instance 3</text>
  <path class="d-edge-accent" d="M 200 122 L 432 56" marker-end="url(#sd01q2-arrow)"/>
  <text class="d-sub" x="290" y="62" text-anchor="middle">sticky: always here</text>
  <path class="d-edge-dashed" d="M 200 138 L 432 143" marker-end="url(#sd01q2-arrow)"/>
  <path class="d-edge-dashed" d="M 200 152 L 432 226" marker-end="url(#sd01q2-arrow)"/>
</svg>

With sessions in process memory, the load balancer must pin each user to one instance. If Instance 1 restarts, alice is logged out, and if many heavy users happen to be pinned to it, it runs hot while the others idle.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Stateless instances all read sessions from one shared store, so any instance can serve any request">
  <defs>
    <marker id="sd01q2-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="280" y="20" width="160" height="50" rx="10"/>
  <text class="d-text" x="360" y="51" text-anchor="middle">Load balancer</text>
  <rect class="d-box" x="60" y="120" width="150" height="50" rx="10"/>
  <text class="d-text" x="135" y="151" text-anchor="middle">Instance 1</text>
  <rect class="d-box" x="285" y="120" width="150" height="50" rx="10"/>
  <text class="d-text" x="360" y="151" text-anchor="middle">Instance 2</text>
  <rect class="d-box" x="510" y="120" width="150" height="50" rx="10"/>
  <text class="d-text" x="585" y="151" text-anchor="middle">Instance 3</text>
  <rect class="d-box-accent" x="230" y="240" width="260" height="60" rx="10"/>
  <text class="d-text" x="360" y="265" text-anchor="middle">Shared session store</text>
  <text class="d-sub" x="360" y="287" text-anchor="middle">Redis or a database</text>
  <path class="d-edge" d="M 340 70 L 143 114" marker-end="url(#sd01q2-arrow2)"/>
  <path class="d-edge" d="M 360 70 L 360 114" marker-end="url(#sd01q2-arrow2)"/>
  <path class="d-edge" d="M 380 70 L 577 114" marker-end="url(#sd01q2-arrow2)"/>
  <path class="d-edge-dashed" d="M 150 170 L 300 234" marker-end="url(#sd01q2-arrow2)"/>
  <path class="d-edge-dashed" d="M 360 170 L 360 234" marker-end="url(#sd01q2-arrow2)"/>
  <path class="d-edge-dashed" d="M 570 170 L 420 234" marker-end="url(#sd01q2-arrow2)"/>
</svg>

With the session in a shared store, every instance is interchangeable. The store is now the thing that must be fast and highly available.

## 3. Four Places a Session Can Live — Simulated

The example builds a three-instance cluster in one process: instances are objects, the load balancer is a function, and a \`Map\` stands in for Redis. It then logs alice in and sends her next requests under each approach.

### A) In instance memory, round-robin load balancer

~~~text
A) Session in instance memory, round-robin LB
  login  -> inst-1 stores sess-1
  /cart  -> inst-2 401 who are you?
  /cart  -> inst-3 401 who are you?
  /cart  -> inst-1 200 alice
~~~

Two out of three requests fail. This is what happens the first time someone adds a second instance to an app that kept sessions in memory (the default in many frameworks).

### B) In instance memory, sticky load balancer

📌 **Interview term: sticky sessions (session affinity)** — the load balancer sends every request from one client to the same instance, usually by setting its own cookie or hashing the client IP.

~~~text
B) Session in instance memory, sticky LB
  login  -> inst-1 stores sess-2
  /cart  -> inst-1 200 alice
  inst-1 crashes (deploy, OOM, scale-in)
  /cart  -> inst-2 401 session lost
~~~

Stickiness hides the problem until an instance goes away — which in an autoscaled fleet with daily deploys is every day. On AWS, an Application Load Balancer implements duration-based stickiness with a load-balancer cookie named \`AWSALB\` (application-cookie stickiness uses \`AWSALBAPP\`), and when the target becomes unhealthy the request is routed to another target — the session in memory does not come with it (source: AWS Prescriptive Guidance, *Sticky sessions with load balancer generated cookies*). AWS also documents that the \`weighted_random\` routing algorithm cannot be combined with sticky sessions, and that with stickiness the algorithm is only used to choose the first target (source: AWS ELB docs, *Edit target group attributes*). Stickiness constrains load balancing itself.

### C) In a shared session store

📌 **Interview term: shared (external) session store** — the browser holds only an opaque, random **session ID** in a cookie; the session data lives in a store every instance can reach, typically Redis with a TTL (\`SET sess:abc {...} EX 1800\`) or a database table.

~~~text
C) Session in a shared store, any instance
  login  -> inst-1 writes sess-3 to the store
  inst-1 crashes
  /cart  -> inst-2 200 alice
  /cart  -> inst-3 200 alice
  logout deletes the key; /cart -> inst-2 401
~~~

The crash costs nothing, and logout is immediate: delete the key and the next request is rejected everywhere. The price is one network round trip to the store on every request (sub-millisecond inside one datacenter — see [What latency numbers and availability targets should every engineer know?](/interview-question/what-latency-numbers-and-availability-targets-should-every-engineer-know)), and the store becomes critical infrastructure: run it replicated, because if it is down, nobody is logged in.

### D) In a signed token

📌 **Interview term: signed token / JWT** — the server puts the claims (user ID, roles, expiry) in the token itself and signs them. Any instance with the key can verify the signature and trust the claims with no lookup. A JSON Web Token is the standard format: \`header.payload.signature\`, each part base64url-encoded (RFC 7519, published by the IETF in May 2015).

~~~text
D) Signed token (JWT-shaped, HS256), nothing stored server-side
  token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxOTAwLCJqdGkiOiJ0LTEifQ.y2b3OZqrqCTfiFN1ZvUmuhQp-licKbVLVTvI3zhtTrE
  bytes in every request: 151
  inst-2 verifies at t=1000: 200 alice (user)
  role changed to admin:    401 bad signature
  user logs out at t=1100, token still: 200 alice (user)
  with jti on a denylist:   401 revoked
  at t=1900 (exp reached):  401 expired
~~~

The core of verification is two lines — recompute the HMAC over \`header.payload\` and compare it in constant time:

~~~js
const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
if (!crypto.timingSafeEqual(Buffer.from(sign(h + "." + p)), Buffer.from(sig))) return "401 bad signature";
~~~

What the run shows:

- **Tampering fails.** Changing \`role\` to \`admin\` changes the payload, so the signature no longer matches: \`401 bad signature\`. The payload is only *encoded*, not encrypted — anyone can read it, so never put secrets in it.
- **Logout does not work by itself.** After logout the same token still verifies (\`200 alice\`), because nothing on the server changed. That is the central weakness of self-contained tokens.
- **Revocation needs state again.** Checking the token ID (\`jti\`) against a denylist fixes logout — but the denylist is a shared store lookup, which is what tokens were meant to avoid. The usual compromise is a short expiry so the denylist only has to hold entries until they would expire anyway.

The token here is built by hand to show the mechanism; it follows the HS256 layout but was not checked against a JWT library. In production use a maintained library and pin the accepted algorithm.

## 4. The Options Compared

| | In memory + sticky | Shared store (Redis/DB) | Signed token (JWT) |
| :--- | :--- | :--- | :--- |
| Survives instance loss | no | yes | yes |
| Per-request cost | none | one store lookup | signature check (CPU only) |
| Logout / revoke now | yes, on that instance | yes — delete the key | no, unless you add a denylist |
| Load balancing | constrained | free | free |
| Size on the wire | small cookie | small cookie (random ID) | grows with claims; sent on every request |
| New dependency | none | the store must be highly available | key management and rotation |
| Good fit | prototypes, a single instance | most web apps with logins | service-to-service calls, APIs across many services, short-lived access tokens |

A common production pattern combines them: a **short-lived access token** (minutes) that services verify without lookups, plus a **refresh token** stored server-side that can be revoked and is exchanged for new access tokens. Revocation then takes effect within one access-token lifetime.

📌 **Interview term: refresh token** — a longer-lived credential, checked against server-side state, used only to obtain new short-lived access tokens. Rotating it on every use lets you detect a stolen copy being replayed.

## 5. Token Details Interviewers Probe

- **HMAC vs public-key signatures.** \`HS256\` (HMAC-SHA256, used above) needs the same secret on every verifier, so every service that can verify can also *mint* tokens. \`RS256\`/\`ES256\` sign with a private key held only by the auth service and verify with a public key, which is the safer choice when many services verify.
- **Always check \`exp\`.** RFC 7519 defines \`exp\` as the time after which the token must not be accepted, and allows a small leeway for clock skew. The example rejects at \`t=1900\`.
- **Where the browser keeps it.** An \`HttpOnly; Secure; SameSite\` cookie cannot be read by page JavaScript, which limits what an XSS bug can steal; tokens in \`localStorage\` can be read by any script on the page. Cookies, in turn, need CSRF protection when \`SameSite\` does not cover the case.
- **Size budget.** RFC 6265 only requires browsers to support *at least* 4,096 bytes per cookie (name, value and attributes), so a token stuffed with permissions can silently stop being stored. Every byte also travels on every request; the small token above is already 151 bytes.

## 6. The Other State Hiding in "Stateless" Services

Sessions are the famous one. A real audit also finds:

| Hidden state | Problem when scaled out | Move it to |
| :--- | :--- | :--- |
| Uploaded files on local disk | only one instance has the file | object storage (S3-style) |
| In-process cache that must be consistent | instances disagree after a write | a shared cache, or accept staleness with short TTLs — see [How would you design a distributed cache?](/interview-question/how-would-you-design-a-distributed-cache) |
| Cron jobs in the app | every instance runs the job | a scheduler or a single elected runner — [leader election](/interview-question/what-is-leader-election-in-distributed-systems) |
| In-memory rate-limit counters | each instance allows the full limit | a shared counter — [How would you design a rate limiter?](/interview-question/how-would-you-design-a-rate-limiter) |
| Open WebSocket connections | a connection lives on exactly one instance | a pub/sub layer between instances — [WebSocket presence, sticky sessions, and resume](/interview-question/websocket-presence-sticky-sessions-and-resume-do-you-need-sticky-lb) |
| Requests in flight at shutdown | killed mid-request on scale-in | **connection draining**: stop new traffic, finish current requests, then exit |

A purely local cache of data that is allowed to be slightly stale is fine — losing it costs a few cache misses, not correctness.

## 7. Verified: Running the Code

The example **"Where the session lives: memory, sticky, shared store, signed token"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this (the HMAC is deterministic, so the token is identical too):

~~~text
A) Session in instance memory, round-robin LB
  login  -> inst-1 stores sess-1
  /cart  -> inst-2 401 who are you?
  /cart  -> inst-3 401 who are you?
  /cart  -> inst-1 200 alice
B) Session in instance memory, sticky LB
  login  -> inst-1 stores sess-2
  /cart  -> inst-1 200 alice
  inst-1 crashes (deploy, OOM, scale-in)
  /cart  -> inst-2 401 session lost
C) Session in a shared store, any instance
  login  -> inst-1 writes sess-3 to the store
  inst-1 crashes
  /cart  -> inst-2 200 alice
  /cart  -> inst-3 200 alice
  logout deletes the key; /cart -> inst-2 401
D) Signed token (JWT-shaped, HS256), nothing stored server-side
  token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxOTAwLCJqdGkiOiJ0LTEifQ.y2b3OZqrqCTfiFN1ZvUmuhQp-licKbVLVTvI3zhtTrE
  bytes in every request: 151
  inst-2 verifies at t=1000: 200 alice (user)
  role changed to admin:    401 bad signature
  user logs out at t=1100, token still: 200 alice (user)
  with jti on a denylist:   401 revoked
  at t=1900 (exp reached):  401 expired
~~~

What the simulation stands for and leaves out: the instances, load balancer and Redis are in-process objects, so there is no network latency, no store outage and no cookie handling. "Time" is a number passed to \`verify\`, not a real clock.

## Edge Cases Worth Knowing

- **Session fixation:** issue a new session ID on login; never keep the anonymous ID after authentication.
- **Store failover:** if the Redis primary fails and a replica that missed the last writes takes over, recently created sessions can disappear. Decide whether that is acceptable or use a store with stronger durability.
- **Key rotation for tokens:** put a key ID (\`kid\`) in the header and accept the old and new keys during the rotation window.
- **Clock skew:** instances with drifting clocks disagree on \`exp\`; allow a small leeway and keep clocks synchronised.

## Common Pitfalls

- **Treating sticky sessions as the solution.** They hide in-memory state until a deploy or scale-in logs users out, and they defeat smarter load-balancing algorithms.
- **Using JWTs and promising instant logout.** Without a denylist or very short expiry, a logged-out or banned user's token keeps working until \`exp\`.
- **Putting secrets or large data in the token.** The payload is readable by anyone, and every byte is sent on every request.
- **Forgetting that the session store is now critical.** A single unreplicated Redis node is a new single point of failure for every logged-in user.
- **Missing the non-session state.** Local uploads, cron jobs and in-memory rate limits break just as badly when a second instance appears.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">stateless service</strong> keeps nothing about a client in its own memory between requests, so any instance can serve any request and instances can be added, killed or replaced freely.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it matters:</strong> <span style="color:#f0e2c8;">That is what makes horizontal scaling, autoscaling, rolling deploys and failover free, and lets the load balancer route by load instead of by user.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where sessions go:</strong> <span style="color:#f0e2c8;">Either a <strong style="color:#ffca28;">shared store</strong> — a random session ID in a cookie, the data in replicated Redis or a database — or a <strong style="color:#ffca28;">signed token</strong> like a JWT that carries the claims and is verified with a key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Trade-off:</strong> <span style="color:#f0e2c8;">The store costs one lookup per request but logout is instant. The token needs no lookup but cannot be revoked before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exp</code> without a denylist, and it grows every request.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In practice:</strong> <span style="color:#f0e2c8;">Short-lived access tokens plus a revocable refresh token, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpOnly</code> secure cookies for browsers, and move the other hidden state too: files, cron jobs, rate-limit counters.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just turn on sticky sessions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the session still lives in one instance. When that instance is deployed, crashes or is scaled in, those users are logged out, and pinning users means heavy users can overload one instance while others idle. Stickiness also restricts the algorithm — on AWS ALB, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weighted_random</code> cannot be used with it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you log a user out if you use JWTs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Delete the refresh token server-side so no new access tokens are issued, and either accept that the current access token lives until its short <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exp</code>, or check its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jti</code> against a denylist kept until that expiry. Instant revocation always needs some shared state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Redis as a session store not just moving the single point of failure?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is moving state to a component designed to be replicated and failed over, instead of leaving it on disposable web instances. Run it with replicas and automatic failover, and decide what a failover that loses the last writes means for users.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is sticky routing legitimate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the connection itself is the state, like WebSockets or long-lived streams, or for cache locality where losing affinity only costs performance. The rule is that losing the instance must not lose correctness.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">HS256 or RS256?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HS256</code> shares one secret among all verifiers, so any of them could mint tokens. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RS256</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ES256</code> keeps the private key in the auth service and gives verifiers only the public key, which is better once several services verify tokens.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Stateless service | An instance that keeps no per-client data in memory between requests |
| Session state | What the server remembers about a user across requests |
| Sticky sessions (session affinity) | The load balancer pins a client to one instance |
| Shared (external) session store | Session data in Redis or a database, keyed by a random ID in a cookie |
| Signed token / JWT | Claims plus a signature, verified with a key and no lookup (RFC 7519) |
| Refresh token | A revocable, server-checked credential used to get new short-lived access tokens |

**Conclusion:** Stateless services are preferred because they make every instance interchangeable: you can add, remove, deploy and lose instances without users noticing, and the load balancer can route purely by load. Sessions do not disappear — they move out of process memory into a shared, replicated store (simple, instantly revocable, one lookup per request) or into a signed token (no lookup, but revocation needs short expiry plus a denylist). Sticky sessions only postpone the problem until the first deploy. A complete answer also names the other hidden state — files, cron jobs, rate-limit counters, WebSockets — and where each one should live.`,
    examples: [
      {
        label: `Where the session lives: memory, sticky, shared store, signed token`,
        variants: [
          { tech: "node", code: `// Where does the session live? Four answers, simulated in one process.
// "Instances" are objects, the "load balancer" is a function, the shared
// store is a Map standing in for Redis. No network, no real HTTP.
const crypto = require("crypto");

function makeCluster() {
  return [1, 2, 3].map((n) => ({ name: "inst-" + n, up: true, memory: new Map() }));
}
let counter = 0;
const newId = () => "sess-" + ++counter;

function roundRobin(cluster) {
  let i = 0;
  return () => {
    for (;;) { const inst = cluster[i++ % cluster.length]; if (inst.up) return inst; }
  };
}
function crash(inst) { inst.up = false; inst.memory.clear(); }

console.log("A) Session in instance memory, round-robin LB");
let cluster = makeCluster(), pick = roundRobin(cluster);
let inst = pick(), sid = newId();
inst.memory.set(sid, { user: "alice" });
console.log("  login  -> " + inst.name + " stores " + sid);
for (let i = 0; i < 3; i++) {
  inst = pick();
  console.log("  /cart  -> " + inst.name + (inst.memory.has(sid) ? " 200 alice" : " 401 who are you?"));
}

console.log("B) Session in instance memory, sticky LB");
cluster = makeCluster(); pick = roundRobin(cluster);
const sticky = new Map(); // session id -> instance (what a sticky cookie encodes)
const route = (id) => { const s = sticky.get(id); if (s && s.up) return s; const n = pick(); sticky.set(id, n); return n; };
sid = newId();
inst = route(sid); inst.memory.set(sid, { user: "alice" });
console.log("  login  -> " + inst.name + " stores " + sid);
inst = route(sid); console.log("  /cart  -> " + inst.name + (inst.memory.has(sid) ? " 200 alice" : " 401"));
crash(cluster[0]); console.log("  inst-1 crashes (deploy, OOM, scale-in)");
inst = route(sid); console.log("  /cart  -> " + inst.name + (inst.memory.has(sid) ? " 200 alice" : " 401 session lost"));

console.log("C) Session in a shared store, any instance");
cluster = makeCluster(); pick = roundRobin(cluster);
const store = new Map(); // stands in for Redis: SET sid value EX ttl
sid = newId(); inst = pick(); store.set(sid, { user: "alice" });
console.log("  login  -> " + inst.name + " writes " + sid + " to the store");
crash(cluster[0]); console.log("  inst-1 crashes");
for (let i = 0; i < 2; i++) {
  inst = pick();
  console.log("  /cart  -> " + inst.name + (store.has(sid) ? " 200 " + store.get(sid).user : " 401"));
}
store.delete(sid); inst = pick();
console.log("  logout deletes the key; /cart -> " + inst.name + (store.has(sid) ? " 200" : " 401"));

console.log("D) Signed token (JWT-shaped, HS256), nothing stored server-side");
const SECRET = "demo-secret-shared-by-all-instances";
const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
function issue(claims) {
  const body = b64(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + b64(JSON.stringify(claims));
  return body + "." + sign(body);
}
const denylist = new Set();
function verify(token, now) {
  const [h, p, sig] = token.split(".");
  const good = Buffer.from(sign(h + "." + p)), got = Buffer.from(sig);
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return "401 bad signature";
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  if (now >= claims.exp) return "401 expired";
  if (denylist.has(claims.jti)) return "401 revoked";
  return "200 " + claims.sub + " (" + claims.role + ")";
}
const token = issue({ sub: "alice", role: "user", exp: 1900, jti: "t-1" });
console.log("  token: " + token);
console.log("  bytes in every request: " + token.length);
console.log("  inst-2 verifies at t=1000: " + verify(token, 1000));
const [h, , s] = token.split(".");
const forged = h + "." + b64(JSON.stringify({ sub: "alice", role: "admin", exp: 1900, jti: "t-1" })) + "." + s;
console.log("  role changed to admin:    " + verify(forged, 1000));
console.log("  user logs out at t=1100, token still: " + verify(token, 1100));
denylist.add("t-1");
console.log("  with jti on a denylist:   " + verify(token, 1100));
denylist.clear();
console.log("  at t=1900 (exp reached):  " + verify(token, 1900));` },
          { tech: "python", code: `# Where does the session live? Four answers, simulated in one process.
# "Instances" are dicts, the "load balancer" is a function, the shared
# store is a dict standing in for Redis. No network, no real HTTP.
import base64
import hashlib
import hmac
import json


def make_cluster():
    return [{"name": f"inst-{n}", "up": True, "memory": {}} for n in (1, 2, 3)]


counter = 0


def new_id():
    global counter
    counter += 1
    return f"sess-{counter}"


def round_robin(cluster):
    state = {"i": 0}

    def pick():
        while True:
            inst = cluster[state["i"] % len(cluster)]
            state["i"] += 1
            if inst["up"]:
                return inst
    return pick


def crash(inst):
    inst["up"] = False
    inst["memory"].clear()


print("A) Session in instance memory, round-robin LB")
cluster = make_cluster(); pick = round_robin(cluster)
inst = pick(); sid = new_id()
inst["memory"][sid] = {"user": "alice"}
print(f"  login  -> {inst['name']} stores {sid}")
for _ in range(3):
    inst = pick()
    print(f"  /cart  -> {inst['name']}" + (" 200 alice" if sid in inst["memory"] else " 401 who are you?"))

print("B) Session in instance memory, sticky LB")
cluster = make_cluster(); pick = round_robin(cluster)
sticky = {}  # session id -> instance (what a sticky cookie encodes)


def route(sid):
    s = sticky.get(sid)
    if s and s["up"]:
        return s
    n = pick(); sticky[sid] = n
    return n


sid = new_id()
inst = route(sid); inst["memory"][sid] = {"user": "alice"}
print(f"  login  -> {inst['name']} stores {sid}")
inst = route(sid); print(f"  /cart  -> {inst['name']}" + (" 200 alice" if sid in inst["memory"] else " 401"))
crash(cluster[0]); print("  inst-1 crashes (deploy, OOM, scale-in)")
inst = route(sid); print(f"  /cart  -> {inst['name']}" + (" 200 alice" if sid in inst["memory"] else " 401 session lost"))

print("C) Session in a shared store, any instance")
cluster = make_cluster(); pick = round_robin(cluster)
store = {}  # stands in for Redis: SET sid value EX ttl
sid = new_id(); inst = pick(); store[sid] = {"user": "alice"}
print(f"  login  -> {inst['name']} writes {sid} to the store")
crash(cluster[0]); print("  inst-1 crashes")
for _ in range(2):
    inst = pick()
    print(f"  /cart  -> {inst['name']}" + (f" 200 {store[sid]['user']}" if sid in store else " 401"))
del store[sid]; inst = pick()
print(f"  logout deletes the key; /cart -> {inst['name']}" + (" 200" if sid in store else " 401"))

print("D) Signed token (JWT-shaped, HS256), nothing stored server-side")
SECRET = b"demo-secret-shared-by-all-instances"


def b64(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def unb64(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def sign(data):
    return b64(hmac.new(SECRET, data.encode(), hashlib.sha256).digest())


def enc(obj):
    return b64(json.dumps(obj, separators=(",", ":")).encode())


def issue(claims):
    body = enc({"alg": "HS256", "typ": "JWT"}) + "." + enc(claims)
    return body + "." + sign(body)


denylist = set()


def verify(token, now):
    h, p, sig = token.split(".")
    if not hmac.compare_digest(sign(h + "." + p), sig):
        return "401 bad signature"
    claims = json.loads(unb64(p))
    if now >= claims["exp"]:
        return "401 expired"
    if claims["jti"] in denylist:
        return "401 revoked"
    return f"200 {claims['sub']} ({claims['role']})"


token = issue({"sub": "alice", "role": "user", "exp": 1900, "jti": "t-1"})
print("  token: " + token)
print(f"  bytes in every request: {len(token)}")
print("  inst-2 verifies at t=1000: " + verify(token, 1000))
h, _, s = token.split(".")
forged = h + "." + enc({"sub": "alice", "role": "admin", "exp": 1900, "jti": "t-1"}) + "." + s
print("  role changed to admin:    " + verify(forged, 1000))
print("  user logs out at t=1100, token still: " + verify(token, 1100))
denylist.add("t-1")
print("  with jti on a denylist:   " + verify(token, 1100))
denylist.clear()
print("  at t=1900 (exp reached):  " + verify(token, 1900))` },
        ],
      },
    ],
  },
  {
    title: `What is a load balancer and what strategies does it use?`,
    difficulty: "medium",
    seoDescription: `A load balancer spreads requests over healthy servers. Learn L4 vs L7, health checks, and round robin, least connections, P2C and hashing, simulated.`,
    description: `**Question presented to candidate:**
"Explain what a load balancer actually does in front of a fleet of servers. Then walk me through the main algorithms it can use to pick a server — round robin, least connections, hashing and so on — and tell me when each one is the right choice and when it goes wrong."

**What a strong answer should cover:**
- The jobs: spread requests over a **backend pool**, run **health checks** and stop sending to failed servers, give clients one stable address, often terminate TLS, and drain connections during deploys
- **Layer 4 vs Layer 7**: L4 balances TCP/UDP connections by address and port; L7 understands HTTP and can route by path, header or cookie, at more CPU per request
- Static algorithms (**round robin**, **weighted round robin**, random, hash) vs dynamic ones (**least connections / least outstanding requests**, **power of two choices**), and the failure mode of each: round robin piles up on uneven request costs, plain hash mod N reshuffles almost every key when N changes
- Why power of two random choices is the default in modern proxies: nearly as good as least connections with no global state, and it avoids herding when many balancers share stale load data
- The load balancer itself must not be a single point of failure: redundant pairs, multiple addresses in DNS, anycast, or a managed multi-zone service

**Code / implementation expected:** Optional — describing the algorithms precisely is enough; implementing one or two (as in the example) is a strong signal.`,
    answer: `**Target Audience:** Beginners to system design — you know what a web server is; no networking background assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All numbers come from actually running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A supermarket has six checkout lanes. Without anyone directing traffic, shoppers pick the lane nearest the entrance and it backs up while lane six is empty. So the store puts a person at the front who points each shopper to a lane.

How should that person choose? "Next lane in turn" is fair if every cart is the same size — but the shopper with two hundred items lands in lane three and everyone sent there after them waits. "The lane with the fewest people" is better, but the director has to see every lane. And if a cashier collapses, the director had better notice and stop sending people there.

The director is a **load balancer**. "Next in turn" is **round robin**, "fewest people" is **least connections**, and noticing the collapsed cashier is a **health check**. The rest of this doc is about doing those three things well at a few hundred thousand requests a second.

## 2. What a Load Balancer Does

📌 **Interview term: load balancer (LB)** — a component that receives client traffic on one address and forwards each connection or request to one server in a pool, chosen by an algorithm. It is a kind of reverse proxy; see [What is the difference between a reverse proxy and a forward proxy?](/interview-question/what-is-the-difference-between-a-reverse-proxy-and-a-forward-proxy)

📌 **Interview term: backend pool (target group, upstream)** — the set of servers the load balancer may send to. Different products use different names: AWS says *target group*, nginx says *upstream*, Envoy says *cluster*.

Its jobs, in order of importance:

1. **Spread the load** so no server is overwhelmed while others idle.
2. **Hide failures.** 📌 **Interview term: health check** — the LB probes each server (an *active* check such as \`GET /healthz\` every few seconds) and/or watches real responses (*passive* checks, which Envoy calls *outlier detection*). After a configured number of failures the server is taken out of rotation; after enough successes it is put back.
3. **Give clients one stable address**, so servers can be added, removed or replaced behind it — the basis of [horizontal scaling](/interview-question/what-is-the-difference-between-horizontal-and-vertical-scaling).
4. **Do shared edge work**: TLS termination, compression, request limits, sometimes authentication (at which point it overlaps with an [API gateway](/interview-question/what-is-an-api-gateway)).
5. **Drain for deploys.** 📌 **Interview term: connection draining (deregistration delay)** — stop sending *new* requests to a server being removed, but let its in-flight requests finish before it shuts down.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A load balancer sends traffic to two healthy servers and stops sending to a third that failed its health check">
  <defs>
    <marker id="sd01q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="120" width="130" height="56" rx="10"/>
  <text class="d-text" x="95" y="153" text-anchor="middle">Clients</text>
  <rect class="d-box-accent" x="250" y="110" width="170" height="76" rx="10"/>
  <text class="d-text" x="335" y="142" text-anchor="middle">Load balancer</text>
  <text class="d-sub" x="335" y="166" text-anchor="middle">probes /healthz</text>
  <rect class="d-box" x="520" y="20" width="170" height="56" rx="10"/>
  <text class="d-text" x="605" y="53" text-anchor="middle">Server 1</text>
  <rect class="d-box" x="520" y="122" width="170" height="56" rx="10"/>
  <text class="d-text" x="605" y="155" text-anchor="middle">Server 2</text>
  <rect class="d-box-muted" x="520" y="224" width="170" height="60" rx="10"/>
  <text class="d-text" x="605" y="248" text-anchor="middle">Server 3</text>
  <text class="d-sub" x="605" y="270" text-anchor="middle">failed check, removed</text>
  <path class="d-edge" d="M 160 148 L 244 148" marker-end="url(#sd01q3-arrow)"/>
  <path class="d-edge" d="M 420 130 L 514 52" marker-end="url(#sd01q3-arrow)"/>
  <path class="d-edge" d="M 420 148 L 514 150" marker-end="url(#sd01q3-arrow)"/>
  <path class="d-edge-dashed" d="M 420 166 L 514 252" marker-end="url(#sd01q3-arrow)"/>
</svg>

Clients only know the load balancer address. When Server 3 fails its health checks, the balancer simply stops choosing it; clients never see the change except for requests that were already on Server 3.

## 3. Layer 4 vs Layer 7

The "layer" refers to the OSI networking model: layer 4 is the transport layer (TCP, UDP), layer 7 is the application layer (HTTP, gRPC).

📌 **Interview term: Layer 4 (L4) load balancing** — balances **connections** using only IP addresses and ports. It never reads the request, so it is fast, works for any TCP/UDP protocol, and can pass TLS through untouched. Every request on one connection goes to the same server.

📌 **Interview term: Layer 7 (L7) load balancing** — terminates the connection, parses the HTTP request and balances **requests**. It can route by path, host, header or cookie, retry a failed request on another server, and spread the requests of one long-lived HTTP/2 connection over many servers. Costs more CPU per request.

📌 **Interview term: TLS termination** — the load balancer decrypts HTTPS, so certificates live in one place and it can read the request; traffic to the backends is then plain or re-encrypted.

| | L4 | L7 |
| :--- | :--- | :--- |
| Sees | source/destination IP and port | full HTTP request: method, path, headers, cookies |
| Unit balanced | connection | request |
| Can route by URL or header | no | yes |
| TLS | passes through (or terminates) | usually terminates |
| Protocols | any TCP/UDP (databases, MQTT, game traffic) | HTTP, HTTP/2, gRPC, WebSocket upgrade |
| Cost | very low | higher; parses every request |
| Examples | AWS Network Load Balancer, HAProxy in TCP mode | AWS Application Load Balancer, nginx \`http\`, Envoy |

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="A layer 7 load balancer routes requests for the API path to one pool and requests for assets to another pool">
  <defs>
    <marker id="sd01q3-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="100" width="120" height="56" rx="10"/>
  <text class="d-text" x="90" y="133" text-anchor="middle">Client</text>
  <rect class="d-box-accent" x="230" y="92" width="180" height="72" rx="10"/>
  <text class="d-text" x="320" y="124" text-anchor="middle">L7 load balancer</text>
  <text class="d-sub" x="320" y="146" text-anchor="middle">reads path and headers</text>
  <rect class="d-box" x="500" y="20" width="190" height="64" rx="10"/>
  <text class="d-text" x="595" y="46" text-anchor="middle">API pool</text>
  <text class="d-sub" x="595" y="68" text-anchor="middle">path /api/*</text>
  <rect class="d-box" x="500" y="172" width="190" height="64" rx="10"/>
  <text class="d-text" x="595" y="198" text-anchor="middle">Static pool</text>
  <text class="d-sub" x="595" y="220" text-anchor="middle">path /assets/*</text>
  <path class="d-edge" d="M 150 128 L 224 128" marker-end="url(#sd01q3-arrow2)"/>
  <path class="d-edge" d="M 410 112 L 494 56" marker-end="url(#sd01q3-arrow2)"/>
  <path class="d-edge" d="M 410 146 L 494 202" marker-end="url(#sd01q3-arrow2)"/>
</svg>

Content-based routing is something only an L7 balancer can do, because only it reads the request. An L4 balancer would have to send both kinds of traffic to the same pool.

## 4. The Algorithms

Split them by what they need to know.

**Static** — decide without looking at server load:

| Algorithm | Picks | Good when | Goes wrong when |
| :--- | :--- | :--- | :--- |
| Round robin | the next server in order | equal servers, similar requests | request costs vary (section 5) |
| Weighted round robin | in order, in proportion to a weight | servers of different sizes | weights are guessed, not measured |
| Random | uniformly at random | many independent balancers | small samples are lumpy |
| Hash (IP, header, key) | \`hash(key)\` decides the server | you need the same client or key on the same server (cache locality) | the pool changes size: with \`mod N\`, most keys move |

**Dynamic** — use live load information:

| Algorithm | Picks | Good when | Goes wrong when |
| :--- | :--- | :--- | :--- |
| Least connections / least outstanding requests | the server with the fewest in-flight requests | request costs vary, long-lived connections | a new or restarted server looks idle and gets flooded |
| Least response time | fastest recent responses, often combined with connections | latency-sensitive services | a server failing fast looks quickest |
| Power of two choices (P2C) | two random servers, the less loaded of them | large pools, many balancers | load data is very stale |

📌 **Interview term: least connections / least outstanding requests** — choose the backend with the fewest requests currently being processed. On HTTP the useful measure is *outstanding requests* rather than TCP connections, because one connection can carry many requests.

📌 **Interview term: power of two choices (P2C)** — pick two servers at random and send the request to the less loaded one. It needs only two load readings per decision, not a scan of the whole pool.

## 5. What Actually Happens — The Simulation

The example (in Node, Python, Go and Java) runs three experiments.

### Weighted round robin, the nginx way

Naive weighted round robin with weights A=5, B=1, C=1 sends five requests in a row to A. nginx uses **smooth weighted round robin**: on each pick, add every server's weight to its running score, choose the highest score, and subtract the total weight from the winner.

~~~js
for (let i = 0; i < names.length; i++) {
  current[i] += weights[i];
  if (current[i] > current[best]) best = i;
}
current[best] -= total;
~~~

~~~text
Part 1: smooth weighted round robin, weights A=5 B=1 C=1
  picks: A A B A C A A
~~~

Same 5:1:1 ratio, but interleaved. That exact sequence is the one documented in the nginx commit that introduced the algorithm, which replaced the older \`c b a a a a a\` order.

### Uneven request costs

Three equal servers get 300 requests, one per tick. Every third request is slow (30 ticks); the rest take 3 ticks. "Peak open" is the most requests one server was handling at once; "busy ticks" is the total work it was given.

~~~text
Part 2: 300 requests, 1 per tick, every 3rd takes 30 ticks, others 3
  round robin       peak open per server [1, 1, 10]  busy ticks [300, 300, 3000]
  random            peak open per server [8, 8, 6]  busy ticks [1278, 1200, 1122]
  least connections peak open per server [4, 4, 4]  busy ticks [1200, 1200, 1200]
  power of two      peak open per server [5, 5, 6]  busy ticks [1191, 1197, 1212]
~~~

What the run shows:

- **Round robin is worst here, not best.** With three servers and a slow request every third arrival, round robin sends *every* slow request to server 3: 3,000 busy ticks against 300, and 10 open requests against 1. Patterns in traffic (a batch client, a retry loop, a page that always makes three calls) can line up with the rotation like this. Round robin is only fair when requests cost the same.
- **Least connections reacts to real load**: a perfect 1,200 / 1,200 / 1,200 split and never more than 4 open requests on any server.
- **Power of two choices** gets within a few percent of least connections (peaks 5, 5, 6) while reading only two servers per decision.
- **Pure random** is fair on average but lumpy: up to 8 open on a server.

### Why P2C instead of "least connections everywhere"

Two reasons, one theoretical and one practical.

The theory: throw n requests at n servers at random and the busiest server ends up with about log n / log log n of them. Let each request pick the less loaded of **two** random servers and the maximum drops to about log log n / log 2 — an exponential improvement — while a third choice only improves it by a constant factor (Azar, Broder, Karlin and Upfal; surveyed by Mitzenmacher, Richa and Sitaraman, *The Power of Two Random Choices*, 2001).

The practice: real deployments have **many** load balancers, each with a slightly stale view of backend load. If every one of them sends to "the least loaded server", they all pick the same one at the same moment and flood it — **herding**. Randomising between two candidates breaks the stampede. Envoy's documentation says P2C is used for this reason ("resistance to herding behavior"), and the nginx docs recommend \`random\` for setups where several balancers send to the same backends.

📌 **Interview term: herding (thundering herd)** — many independent clients reacting to the same signal at once, so the "best" choice is instantly overloaded.

### Hashing, and why \`mod N\` is a trap

Hashing sends the same key (a client IP, a user ID) to the same server, which is useful for cache locality. nginx's \`ip_hash\` uses the first three octets of an IPv4 address (or the whole IPv6 address) as the key, per the nginx docs. The problem is changing the pool size:

~~~text
Part 3: hash(key) mod N, going from 4 to 5 servers
  keys that change server: 8009 of 10000 (80.1%)
~~~

Adding one server sent 80% of keys somewhere new — a cold cache everywhere at the moment you were adding capacity. The fix is **consistent hashing**, which moves only about 1/N of the keys; Envoy's *ring hash* and *Maglev* balancers are consistent-hashing implementations. The details are in [What is consistent hashing?](/interview-question/what-is-consistent-hashing) and the comparison of variants in [Consistent hashing vs rendezvous (HRW) hashing](/interview-question/consistent-hashing-vs-rendezvous-hrw-hashing-which-for-what-scale).

## 6. What Real Products Offer

| Product | Algorithms (as documented) |
| :--- | :--- |
| nginx (\`upstream\`) | round robin (default, weighted), \`least_conn\`, \`ip_hash\`, \`hash\` (optionally \`consistent\`), \`random\` with an optional \`two least_conn\` mode; \`random\` reached open-source nginx in 1.15.1 according to the NGINX blog |
| AWS Application Load Balancer | \`round_robin\` (default), \`least_outstanding_requests\` (added November 2019), \`weighted_random\` with Automatic Target Weights anomaly mitigation; least outstanding requests cannot be combined with slow-start mode |
| Envoy | weighted round robin, least request (P2C: two random hosts by default, fewer active requests wins), ring hash, Maglev, random |

Sources: nginx admin guide *HTTP Load Balancing*; AWS ELB docs *Edit target group attributes* and the 2019 AWS "What's New" post; Envoy docs *Supported load balancers*.

📌 **Interview term: slow start** — ramping a newly added server from a small share of traffic up to its full share over a set period, so least-connections does not flood a cold server (empty caches, JIT not warmed up) the instant it appears idle.

## 7. Who Balances the Load Balancer?

A single load balancer in front of 50 servers is a [single point of failure](/interview-question/how-do-you-design-for-high-availability). The usual answers:

- **An active-passive pair** sharing a floating IP address that moves to the standby when the active one stops sending heartbeats.
- **Several active balancers** with all their addresses published in DNS, so clients spread across them (and DNS stops returning a dead one after health checks). See [How does DNS resolution work?](/interview-question/how-does-dns-resolution-work)
- **Anycast**: the same IP address announced from many locations, so the network routes each client to the nearest healthy one — how CDNs front their edges ([What is a CDN and how does it work?](/interview-question/what-is-a-cdn-and-how-does-it-work)).
- **A managed load balancer** that the provider runs across several availability zones.

In a large system these stack: DNS or anycast picks a region, an L4 tier spreads connections, an L7 tier routes requests, and a service mesh balances calls between services.

## 8. Verified: Running the Code

The example **"Load-balancing strategies: smooth WRR, least connections, P2C, hash mod N"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and \`javac Main.java && java Main\` (Java 21). All four print exactly this:

~~~text
Part 1: smooth weighted round robin, weights A=5 B=1 C=1
  picks: A A B A C A A
Part 2: 300 requests, 1 per tick, every 3rd takes 30 ticks, others 3
  round robin       peak open per server [1, 1, 10]  busy ticks [300, 300, 3000]
  random            peak open per server [8, 8, 6]  busy ticks [1278, 1200, 1122]
  least connections peak open per server [4, 4, 4]  busy ticks [1200, 1200, 1200]
  power of two      peak open per server [5, 5, 6]  busy ticks [1191, 1197, 1212]
Part 3: hash(key) mod N, going from 4 to 5 servers
  keys that change server: 8009 of 10000 (80.1%)
~~~

What the simulation stands for and leaves out: there is no network; "servers" are lists of request end times and one tick is one arrival. Randomness comes from a fixed-seed 32-bit LCG so every language makes the same choices, and the hash is 32-bit FNV-1a. Real balancers also deal with health checks, retries, connection reuse and stale load data, which this does not model.

## Edge Cases Worth Knowing

- **Deep health checks can take everything down.** If \`/healthz\` also checks the database, a database blip makes every server fail its check at once and the balancer removes the whole pool. Keep liveness checks shallow, and have the balancer fail open (keep sending) when every target is unhealthy.
- **Long-lived connections defeat request balancing at L4.** gRPC and HTTP/2 multiplex many requests on one connection; an L4 balancer pins all of them to one server. Use an L7 balancer or client-side balancing.
- **Retries multiply load.** A balancer that retries every failed request doubles traffic to a struggling backend; cap retries and pair them with a [circuit breaker](/interview-question/what-is-the-circuit-breaker-pattern).
- **Idle timeouts close WebSockets.** Balancers close idle connections after a timeout; long-lived connections need heartbeats. See [When would you use WebSockets vs polling vs SSE?](/interview-question/when-would-you-use-websockets-vs-polling-vs-sse)

## Common Pitfalls

- **Assuming round robin is fair.** It is fair in *count*, not in *work*; the simulation put 10 times the work on one server.
- **Forgetting the balancer is a component that can fail.** Name how it is made redundant.
- **Using \`hash mod N\` for stickiness or cache locality.** Adding one server moved 80.1% of keys; use consistent hashing.
- **Leaning on sticky sessions** instead of making services stateless — see [Why prefer stateless services and how do you handle sessions?](/interview-question/why-prefer-stateless-services-and-how-do-you-handle-sessions)
- **No slow start or warm-up** with least connections, so new instances are flooded at the worst moment.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">load balancer</strong> gives clients one address and forwards each connection or request to a healthy server in a pool, using <strong style="color:#ffca28;">health checks</strong> to drop failed servers and <strong style="color:#ffca28;">connection draining</strong> for deploys.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. L4 vs L7:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">L4</strong> balances TCP/UDP connections by IP and port — fast and protocol-agnostic. <strong style="color:#ffca28;">L7</strong> parses HTTP, so it can route by path or header, terminate TLS and balance individual requests.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Static algorithms:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Round robin</strong> and weighted round robin are fine when requests cost the same; <strong style="color:#ffca28;">hashing</strong> keeps a key on one server for cache locality, but use consistent hashing, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mod N</code> moves most keys when the pool changes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Dynamic algorithms:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Least outstanding requests</strong> handles uneven request costs; <strong style="color:#ffca28;">power of two choices</strong> gets close to it while reading only two servers, and avoids herding when many balancers share stale load data.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Reliability:</strong> <span style="color:#f0e2c8;">The balancer must not be a single point of failure: redundant pairs, multiple DNS records or anycast, or a managed multi-zone service. Add slow start for new servers and keep health checks shallow.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Round robin versus least connections — when does the difference matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When request costs vary. In the simulation, a slow request every third arrival made round robin give one of three servers 3,000 busy ticks against 300 for the others; least connections split the same traffic 1,200 / 1,200 / 1,200.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not always use least connections?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It needs an accurate, current view of every server. With many balancers the views are stale and all of them pick the same idle server at once. A freshly started server also looks idle and gets flooded. P2C with slow start handles both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you keep a user on the same server, and should you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A load-balancer cookie or a consistent hash of a user ID does it. It is legitimate for cache locality or a connection that is itself the state, like a WebSocket. For login sessions it is a smell: move the session to a shared store so any server can answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do health checks work and what can go wrong?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The balancer probes each server on an interval and removes it after N consecutive failures, adding it back after M successes; passive checks also watch real error rates. If the check depends on a shared database, one database blip fails every server, so keep it shallow.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to in-flight requests when you remove a server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <strong style="color:#ffca28;">connection draining</strong> the balancer stops sending new requests to it and waits for current ones to finish, up to a timeout, before it is shut down. Without it, a deploy produces a burst of errors.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Load balancer | Receives traffic on one address and forwards it to a server in a pool |
| Backend pool (target group, upstream) | The servers a balancer may choose from |
| Health check | A probe (active) or traffic observation (passive) that removes failed servers |
| Connection draining | Finish in-flight requests on a server before removing it |
| Layer 4 load balancing | Balances connections by IP and port without reading the request |
| Layer 7 load balancing | Parses HTTP and balances requests; can route by content |
| TLS termination | Decrypting HTTPS at the balancer |
| Least connections / outstanding requests | Pick the server with the fewest in-flight requests |
| Power of two choices (P2C) | Pick two servers at random, use the less loaded |
| Herding | Many balancers choosing the same "best" server at once |
| Slow start | Ramping traffic to a new server gradually |

**Conclusion:** A load balancer gives clients one address, spreads their traffic over a pool and hides failures through health checks and connection draining. Layer 4 balances connections cheaply; layer 7 reads requests and can route by content. Round robin is right only when requests cost the same — the simulation showed it piling ten times the work on one server — while least outstanding requests follows real load and power of two choices gets close to it with almost no information and no herding. Hashing gives locality but needs consistent hashing to survive pool changes, and the balancer itself has to be redundant, or it is the single point of failure you were trying to remove.`,
    examples: [
      {
        label: `Load-balancing strategies: smooth WRR, least connections, P2C, hash mod N`,
        variants: [
          { tech: "node", code: `// Load-balancing strategies, simulated in-process (no real network).
// Part 1: smooth weighted round robin (the nginx algorithm).
// Part 2: 3 equal servers, uneven request durations: who piles up?
// Part 3: hash(key) mod N when a 5th server is added.

// Deterministic 32-bit LCG so every language draws the same "random" numbers.
let seed = 42;
function rand(n) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return (seed >>> 16) % n;
}

// Part 1 ----------------------------------------------------------------
function smoothWeighted(names, weights, picks) {
  const current = names.map(() => 0);
  const total = weights.reduce((a, b) => a + b, 0);
  const out = [];
  for (let p = 0; p < picks; p++) {
    let best = 0;
    for (let i = 0; i < names.length; i++) {
      current[i] += weights[i];
      if (current[i] > current[best]) best = i;
    }
    current[best] -= total;
    out.push(names[best]);
  }
  return out;
}
console.log("Part 1: smooth weighted round robin, weights A=5 B=1 C=1");
console.log("  picks: " + smoothWeighted(["A", "B", "C"], [5, 1, 1], 7).join(" "));

// Part 2 ----------------------------------------------------------------
const N = 3, REQUESTS = 300;
const duration = (i) => (i % 3 === 2 ? 30 : 3); // every 3rd request is slow

function simulate(name, choose) {
  seed = 42;
  const ends = Array.from({ length: N }, () => []); // end ticks of open requests
  const peak = new Array(N).fill(0);
  const work = new Array(N).fill(0);
  let rr = 0;
  for (let t = 0; t < REQUESTS; t++) {
    for (let s = 0; s < N; s++) ends[s] = ends[s].filter((e) => e > t);
    const active = ends.map((e) => e.length);
    const s = choose(active, () => rr++ % N);
    ends[s].push(t + duration(t));
    work[s] += duration(t);
    peak[s] = Math.max(peak[s], ends[s].length);
  }
  console.log(
    "  " + name.padEnd(18) +
    "peak open per server [" + peak.join(", ") + "]" +
    "  busy ticks [" + work.join(", ") + "]"
  );
}

function leastIndex(active) {
  let best = 0;
  for (let i = 1; i < active.length; i++) if (active[i] < active[best]) best = i;
  return best;
}

console.log("Part 2: 300 requests, 1 per tick, every 3rd takes 30 ticks, others 3");
simulate("round robin", (active, next) => next());
simulate("random", () => rand(N));
simulate("least connections", (active) => leastIndex(active));
simulate("power of two", (active) => {
  const a = rand(N);
  let b = rand(N - 1);
  if (b >= a) b++;
  return active[b] < active[a] ? b : a;
});

// Part 3 ----------------------------------------------------------------
function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
let moved = 0;
const KEYS = 10000;
for (let i = 0; i < KEYS; i++) {
  const h = fnv1a("user-" + i);
  if (h % 4 !== h % 5) moved++;
}
console.log("Part 3: hash(key) mod N, going from 4 to 5 servers");
console.log("  keys that change server: " + moved + " of " + KEYS + " (" + (moved * 100 / KEYS).toFixed(1) + "%)");` },
          { tech: "python", code: `# Load-balancing strategies, simulated in-process (no real network).
# Part 1: smooth weighted round robin (the nginx algorithm).
# Part 2: 3 equal servers, uneven request durations: who piles up?
# Part 3: hash(key) mod N when a 5th server is added.

# Deterministic 32-bit LCG so every language draws the same "random" numbers.
seed = 42


def rand(n):
    global seed
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
    return (seed >> 16) % n


# Part 1 ----------------------------------------------------------------
def smooth_weighted(names, weights, picks):
    current = [0] * len(names)
    total = sum(weights)
    out = []
    for _ in range(picks):
        best = 0
        for i in range(len(names)):
            current[i] += weights[i]
            if current[i] > current[best]:
                best = i
        current[best] -= total
        out.append(names[best])
    return out


print("Part 1: smooth weighted round robin, weights A=5 B=1 C=1")
print("  picks: " + " ".join(smooth_weighted(["A", "B", "C"], [5, 1, 1], 7)))

# Part 2 ----------------------------------------------------------------
N, REQUESTS = 3, 300


def duration(i):
    return 30 if i % 3 == 2 else 3  # every 3rd request is slow


def simulate(name, choose):
    global seed
    seed = 42
    ends = [[] for _ in range(N)]  # end ticks of open requests
    peak = [0] * N
    work = [0] * N
    rr = [0]

    def next_rr():
        v = rr[0] % N
        rr[0] += 1
        return v

    for t in range(REQUESTS):
        for s in range(N):
            ends[s] = [e for e in ends[s] if e > t]
        active = [len(e) for e in ends]
        s = choose(active, next_rr)
        ends[s].append(t + duration(t))
        work[s] += duration(t)
        peak[s] = max(peak[s], len(ends[s]))
    print("  " + name.ljust(18)
          + "peak open per server [" + ", ".join(map(str, peak)) + "]"
          + "  busy ticks [" + ", ".join(map(str, work)) + "]")


def least_index(active):
    best = 0
    for i in range(1, len(active)):
        if active[i] < active[best]:
            best = i
    return best


def power_of_two(active, _next):
    a = rand(N)
    b = rand(N - 1)
    if b >= a:
        b += 1
    return b if active[b] < active[a] else a


print("Part 2: 300 requests, 1 per tick, every 3rd takes 30 ticks, others 3")
simulate("round robin", lambda active, nxt: nxt())
simulate("random", lambda active, nxt: rand(N))
simulate("least connections", lambda active, nxt: least_index(active))
simulate("power of two", power_of_two)


# Part 3 ----------------------------------------------------------------
def fnv1a(s):
    h = 2166136261
    for ch in s.encode():
        h ^= ch
        h = (h * 16777619) & 0xFFFFFFFF
    return h


moved = 0
KEYS = 10000
for i in range(KEYS):
    h = fnv1a("user-" + str(i))
    if h % 4 != h % 5:
        moved += 1
print("Part 3: hash(key) mod N, going from 4 to 5 servers")
print(f"  keys that change server: {moved} of {KEYS} ({moved * 100 / KEYS:.1f}%)")` },
          { tech: "go", code: `// Load-balancing strategies, simulated in-process (no real network).
// Part 1: smooth weighted round robin (the nginx algorithm).
// Part 2: 3 equal servers, uneven request durations: who piles up?
// Part 3: hash(key) mod N when a 5th server is added.
package main

import (
	"fmt"
	"strconv"
	"strings"
)

// Deterministic 32-bit LCG so every language draws the same "random" numbers.
var seed uint32 = 42

func rand(n int) int {
	seed = seed*1664525 + 1013904223
	return int(seed>>16) % n
}

func smoothWeighted(names []string, weights []int, picks int) []string {
	current := make([]int, len(names))
	total := 0
	for _, w := range weights {
		total += w
	}
	out := []string{}
	for p := 0; p < picks; p++ {
		best := 0
		for i := range names {
			current[i] += weights[i]
			if current[i] > current[best] {
				best = i
			}
		}
		current[best] -= total
		out = append(out, names[best])
	}
	return out
}

const N, REQUESTS = 3, 300

func duration(i int) int {
	if i%3 == 2 {
		return 30 // every 3rd request is slow
	}
	return 3
}

func join(xs []int) string {
	parts := make([]string, len(xs))
	for i, x := range xs {
		parts[i] = strconv.Itoa(x)
	}
	return strings.Join(parts, ", ")
}

func simulate(name string, choose func(active []int, next func() int) int) {
	seed = 42
	ends := make([][]int, N) // end ticks of open requests
	peak := make([]int, N)
	work := make([]int, N)
	rr := 0
	next := func() int { v := rr % N; rr++; return v }
	for t := 0; t < REQUESTS; t++ {
		active := make([]int, N)
		for s := 0; s < N; s++ {
			kept := []int{}
			for _, e := range ends[s] {
				if e > t {
					kept = append(kept, e)
				}
			}
			ends[s] = kept
			active[s] = len(kept)
		}
		s := choose(active, next)
		ends[s] = append(ends[s], t+duration(t))
		work[s] += duration(t)
		if len(ends[s]) > peak[s] {
			peak[s] = len(ends[s])
		}
	}
	fmt.Printf("  %-18speak open per server [%s]  busy ticks [%s]\\n", name, join(peak), join(work))
}

func leastIndex(active []int) int {
	best := 0
	for i := 1; i < len(active); i++ {
		if active[i] < active[best] {
			best = i
		}
	}
	return best
}

func fnv1a(s string) uint32 {
	var h uint32 = 2166136261
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 16777619
	}
	return h
}

func main() {
	fmt.Println("Part 1: smooth weighted round robin, weights A=5 B=1 C=1")
	fmt.Println("  picks: " + strings.Join(smoothWeighted([]string{"A", "B", "C"}, []int{5, 1, 1}, 7), " "))

	fmt.Println("Part 2: 300 requests, 1 per tick, every 3rd takes 30 ticks, others 3")
	simulate("round robin", func(a []int, next func() int) int { return next() })
	simulate("random", func(a []int, next func() int) int { return rand(N) })
	simulate("least connections", func(a []int, next func() int) int { return leastIndex(a) })
	simulate("power of two", func(a []int, next func() int) int {
		x := rand(N)
		y := rand(N - 1)
		if y >= x {
			y++
		}
		if a[y] < a[x] {
			return y
		}
		return x
	})

	moved, keys := 0, 10000
	for i := 0; i < keys; i++ {
		h := fnv1a("user-" + strconv.Itoa(i))
		if h%4 != h%5 {
			moved++
		}
	}
	fmt.Println("Part 3: hash(key) mod N, going from 4 to 5 servers")
	fmt.Printf("  keys that change server: %d of %d (%.1f%%)\\n", moved, keys, float64(moved)*100/float64(keys))
}` },
          { tech: "java", code: `// Load-balancing strategies, simulated in-process (no real network).
// Part 1: smooth weighted round robin (the nginx algorithm).
// Part 2: 3 equal servers, uneven request durations: who piles up?
// Part 3: hash(key) mod N when a 5th server is added.
import java.util.*;
import java.util.function.*;

public class Main {
    // Deterministic 32-bit LCG so every language draws the same "random" numbers.
    static long seed = 42;

    static int rand(int n) {
        seed = (seed * 1664525L + 1013904223L) & 0xFFFFFFFFL;
        return (int) ((seed >>> 16) % n);
    }

    static List<String> smoothWeighted(String[] names, int[] weights, int picks) {
        int[] current = new int[names.length];
        int total = Arrays.stream(weights).sum();
        List<String> out = new ArrayList<>();
        for (int p = 0; p < picks; p++) {
            int best = 0;
            for (int i = 0; i < names.length; i++) {
                current[i] += weights[i];
                if (current[i] > current[best]) best = i;
            }
            current[best] -= total;
            out.add(names[best]);
        }
        return out;
    }

    static final int N = 3, REQUESTS = 300;

    static int duration(int i) { return i % 3 == 2 ? 30 : 3; } // every 3rd request is slow

    static String join(int[] xs) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < xs.length; i++) sb.append(i == 0 ? "" : ", ").append(xs[i]);
        return sb.toString();
    }

    static void simulate(String name, BiFunction<int[], IntSupplier, Integer> choose) {
        seed = 42;
        List<List<Integer>> ends = new ArrayList<>(); // end ticks of open requests
        for (int s = 0; s < N; s++) ends.add(new ArrayList<>());
        int[] peak = new int[N], work = new int[N];
        int[] rr = {0};
        IntSupplier next = () -> rr[0]++ % N;
        for (int t = 0; t < REQUESTS; t++) {
            final int now = t;
            int[] active = new int[N];
            for (int s = 0; s < N; s++) {
                ends.get(s).removeIf(e -> e <= now);
                active[s] = ends.get(s).size();
            }
            int s = choose.apply(active, next);
            ends.get(s).add(t + duration(t));
            work[s] += duration(t);
            peak[s] = Math.max(peak[s], ends.get(s).size());
        }
        System.out.printf("  %-18speak open per server [%s]  busy ticks [%s]%n", name, join(peak), join(work));
    }

    static int leastIndex(int[] active) {
        int best = 0;
        for (int i = 1; i < active.length; i++) if (active[i] < active[best]) best = i;
        return best;
    }

    static long fnv1a(String s) {
        long h = 2166136261L;
        for (byte b : s.getBytes()) {
            h ^= (b & 0xFF);
            h = (h * 16777619L) & 0xFFFFFFFFL;
        }
        return h;
    }

    public static void main(String[] args) {
        System.out.println("Part 1: smooth weighted round robin, weights A=5 B=1 C=1");
        System.out.println("  picks: " + String.join(" ", smoothWeighted(new String[]{"A", "B", "C"}, new int[]{5, 1, 1}, 7)));

        System.out.println("Part 2: 300 requests, 1 per tick, every 3rd takes 30 ticks, others 3");
        simulate("round robin", (a, next) -> next.getAsInt());
        simulate("random", (a, next) -> rand(N));
        simulate("least connections", (a, next) -> leastIndex(a));
        simulate("power of two", (a, next) -> {
            int x = rand(N);
            int y = rand(N - 1);
            if (y >= x) y++;
            return a[y] < a[x] ? y : x;
        });

        int moved = 0, keys = 10000;
        for (int i = 0; i < keys; i++) {
            long h = fnv1a("user-" + i);
            if (h % 4 != h % 5) moved++;
        }
        System.out.println("Part 3: hash(key) mod N, going from 4 to 5 servers");
        System.out.printf("  keys that change server: %d of %d (%.1f%%)%n", moved, keys, moved * 100.0 / keys);
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How do you approach back-of-the-envelope capacity estimation?`,
    difficulty: "medium",
    seoDescription: `A repeatable method for capacity estimates: traffic, storage, bandwidth, cache and servers from stated assumptions, with a fully worked, run example.`,
    description: `**Question presented to candidate:**
"Before you draw any boxes, estimate the scale. Say we are building a Pastebin-style service where people share text snippets. How many requests per second, how much storage over five years, how much bandwidth and cache, and roughly how many servers? Talk me through how you get there."

**What a strong answer should cover:**
- Start from **stated assumptions** (daily active users, actions per user, read:write ratio, object size, retention) and say them out loud before computing
- Convert per-day volumes to **QPS** with 86,400 s/day (or the 10^5 shortcut, about 14% low), separate **reads and writes**, and apply a **peak-to-average** factor
- Storage = items per day × size (including metadata) × retention × **replication factor**; bandwidth = QPS × payload, and keep bits and bytes apart
- Cache sizing from the **working set** (a hot fraction of what is read per day), and server count from per-server capacity with headroom; **Little's law** for concurrency
- Interpret the result: which resource dominates (here storage, not compute), what that decides in the design, and what breaks first at 10x

**Clarifying questions expected:**
- How many daily active users, and what is the read:write ratio?
- How large is a typical item, and how long must it be kept?
- Is traffic spiky (launches, time zones) or flat?

**Code / implementation expected:** No — arithmetic on a whiteboard; the example shows the same calculation as a script.`,
    answer: `**Target Audience:** Beginners to system design — you can multiply and divide; nothing else assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (the calculator prints the same output in both).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every number in the worked example was computed by the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

You are catering a wedding. You do not need to know that guests will drink exactly 437 glasses of water. You need to know whether to bring *one* case or *twenty*, whether the van is big enough, and whether you need one bartender or five. So you reason: about 200 guests, maybe three drinks each over the evening, most of them in the hour after dinner. That gives you 600 drinks, a rush of perhaps 300 in one hour, so two bartenders, not one.

That is a back-of-the-envelope estimate: a few honest assumptions, simple arithmetic, rounded hard, and a decision at the end. In an interview it does the same job. It tells you — and the interviewer — whether this system fits on one machine or needs a thousand, and which resource (CPU, storage, memory, network) will drive the design.

📌 **Interview term: back-of-the-envelope estimation** — an order-of-magnitude calculation from stated assumptions, good to within a factor of two or so, done to choose between designs rather than to buy hardware.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many daily active users (DAU)? | Every other number scales from it. |
| What does a user do per day — how many writes, how many reads? | Gives the **read:write ratio**, which decides caching and replication. |
| How big is one item, including metadata? | Drives storage and bandwidth. A 10 KB text and a 2 MB photo lead to different designs. |
| How long do we keep data? | Storage grows with retention; five years of data is 1,825 days of writes. |
| How spiky is traffic? | You size for the **peak**, not the average. |
| What latency or availability target? | Decides headroom and how many spare servers you keep. |

If the interviewer says "you choose", pick round, plausible numbers and say them out loud. They care about the method.

## 3. The Method: Five Estimates, in Order

1. **Traffic** — requests per day for reads and writes separately, then average QPS, then peak QPS.
2. **Storage** — bytes per write × writes per day × retention, × replication.
3. **Bandwidth** — QPS × bytes per request, in and out separately.
4. **Memory (cache)** — the hot working set you want served from RAM.
5. **Compute** — peak QPS ÷ what one server handles, with headroom; concurrency via Little's law.

📌 **Interview term: QPS (queries per second)** — requests per second hitting a component. Interviewers use QPS and RPS interchangeably.

📌 **Interview term: peak-to-average ratio** — how much busier the busiest period is than the daily average. Traffic follows the sun, so 2-3x is a common assumption for a consumer app; event-driven products (ticket sales, live sports) can see far more.

📌 **Interview term: read:write ratio** — how many reads there are per write. Read-heavy systems (100:1 is common for content) benefit from caches and read replicas; write-heavy ones need partitioning.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="From daily users to requests per day to average and then peak requests per second">
  <defs>
    <marker id="sd01q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="100" width="130" height="64" rx="10"/>
  <text class="d-text" x="85" y="126" text-anchor="middle">Daily users</text>
  <text class="d-sub" x="85" y="149" text-anchor="middle">10M</text>
  <rect class="d-box" x="205" y="100" width="130" height="64" rx="10"/>
  <text class="d-text" x="270" y="126" text-anchor="middle">Reads per day</text>
  <text class="d-sub" x="270" y="149" text-anchor="middle">50M</text>
  <rect class="d-box" x="390" y="100" width="130" height="64" rx="10"/>
  <text class="d-text" x="455" y="126" text-anchor="middle">Average QPS</text>
  <text class="d-sub" x="455" y="149" text-anchor="middle">579</text>
  <rect class="d-box-accent" x="575" y="100" width="130" height="64" rx="10"/>
  <text class="d-text" x="640" y="126" text-anchor="middle">Peak QPS</text>
  <text class="d-sub" x="640" y="149" text-anchor="middle">1,736</text>
  <text class="d-sub" x="177" y="70" text-anchor="middle">x 5 reads</text>
  <path class="d-edge" d="M 152 132 L 199 132" marker-end="url(#sd01q4-arrow)"/>
  <text class="d-sub" x="362" y="40" text-anchor="middle">/ 86,400</text>
  <path class="d-edge" d="M 337 132 L 384 132" marker-end="url(#sd01q4-arrow)"/>
  <text class="d-sub" x="547" y="70" text-anchor="middle">x 3 peak</text>
  <path class="d-edge" d="M 522 132 L 569 132" marker-end="url(#sd01q4-arrow)"/>
</svg>

The read path of the worked example below: 10 million users producing 50 million reads a day (one write per ten users, fifty reads per write, which is five reads per user) is only 579 requests per second on average and about 1,736 at peak.

## 4. Numbers Worth Memorising

| Quantity | Value | Use |
| :--- | :--- | :--- |
| Seconds in a day | 86,400 | per day → per second |
| Shortcut | 10^5 s/day | quick mental division; 13.6% low (computed below) |
| 1 million per day | about 12 per second | the most useful conversion of all |
| 2^10, 2^20, 2^30, 2^40 | about 10^3, 10^6, 10^9, 10^12 | KB, MB, GB, TB |
| ASCII character | 1 byte | text sizes |
| 64-bit integer or timestamp | 8 bytes | IDs, times |
| UUID | 16 bytes binary, 36 as text | keys |
| 1 Gbit/s | 125 MB/s | bits vs bytes: divide by 8 |
| Days in 5 years | 1,825 | retention |

For latency (memory vs SSD vs network round trip) and the "nines" of availability, see the companion question [What latency numbers and availability targets should every engineer know?](/interview-question/what-latency-numbers-and-availability-targets-should-every-engineer-know)

## 5. Worked Example: A Pastebin-Style Service

The example program is a calculator: every input is in one object, each labelled as an assumption, and each step prints its result.

~~~js
const A = {
  dau: 10e6, writesPerUserDay: 0.1, readWriteRatio: 50,
  pasteBytes: 10e3, metaBytes: 500, years: 5, replicas: 3,
  peakFactor: 3, hotFraction: 0.2, serverRps: 2000, targetUtil: 0.5, latencySec: 0.05,
};
~~~

### Step 1 — Traffic

~~~text
1. Traffic
  writes per day                    1,000,000
  reads per day                     50,000,000
  average write QPS                 12
  average read QPS                  579
  peak write QPS (x3)               35
  peak read QPS (x3)                1,736
  shortcut: reads/1e5 per day       500 QPS (13.6% low)
~~~

1,000,000 writes a day is only 12 per second. Saying that number out loud is valuable: it rules out any talk of exotic write paths. The 10^5 shortcut gives 500 instead of 579 — fine for an interview, as long as you know it under-estimates.

### Step 2 — Storage

~~~text
2. Storage
  new data per day                  10.5 GB
  raw, 5 years                      19.2 TB
  with 3 replicas                   57.5 TB
  paste count, 5 years              1,825,000,000
~~~

10,500 bytes × 1,000,000 a day × 1,825 days = 19.2 TB, and three copies make 57.5 TB. Two things to notice: the **metadata** (500 bytes) is 5% here but can dominate for small items, and **replication** triples the total. 1.8 billion pastes is close to the 2,147,483,647 limit of a signed 32-bit integer, so the ID should be 64-bit — see [How would you design a unique ID generator at scale?](/interview-question/how-would-you-design-a-unique-id-generator-at-scale-5739)

📌 **Interview term: replication factor** — how many copies of each byte you store for durability and availability; 3 is a common default for distributed storage.

### Step 3 — Bandwidth

~~~text
3. Bandwidth (average / peak)
  ingress                           121.5 KB/s / 364.6 KB/s
  egress                            5.8 MB/s / 17.4 MB/s
  egress in bits at peak            0.14 Gbit/s
~~~

Network links are sold in **bits** per second, storage in **bytes**. 17.4 MB/s is 0.14 Gbit/s — a fraction of one server network card. (A photo service with 2 MB objects would be 200 times this, and bandwidth would drive the design towards a CDN.)

### Step 4 — Cache

~~~text
4. Cache
  distinct pastes read per day      5,000,000
  hot set to cache (20%)            10.0 GB
~~~

📌 **Interview term: working set** — the data that is actually being accessed in a period. Assuming each paste read today is read about 10 times gives 5 million distinct pastes; caching the hottest 20% (the classic 80/20 assumption) is 10 GB, which fits in one cache node's RAM. See [How does caching improve system performance?](/interview-question/how-does-caching-improve-system-performance)

### Step 5 — Servers and concurrency

~~~text
5. Servers and concurrency
  peak total QPS                    1,771
  app servers at 50% target         2 (+1 spare = 3)
  in flight (Little: L = QPS x W)   89 requests
~~~

If a load test shows one app server handles 2,000 requests per second (an assumption you would replace with a measurement), running each at 50% to absorb spikes and a lost server means 2 servers, plus one spare for [N+1 redundancy](/interview-question/what-is-the-difference-between-horizontal-and-vertical-scaling).

📌 **Interview term: Little's law** — in a stable system, the average number of requests in flight L equals the arrival rate λ times the average time each spends in the system W: **L = λW**. At 1,771 QPS and 50 ms per request, about 89 requests are in flight at once. That is how you size thread pools and database connection pools ([What is database connection pooling?](/interview-question/what-is-database-connection-pooling)).

📌 **Interview term: headroom** — capacity you deliberately leave unused so a traffic spike or a failed server does not push the rest past their limit. Running at 50-70% of measured capacity is a common target.

## 6. Read the Result — That Is the Point

The numbers are an input to design decisions. From this run:

| Finding | Design consequence |
| :--- | :--- |
| Compute is tiny: 1,771 QPS at peak, 3 servers | no need for a complex service split; one stateless tier behind a load balancer |
| Storage is the growing resource: 57.5 TB in 5 years | store paste bodies in object storage, keep only metadata in the database |
| Reads are 50x writes and the hot set is 10 GB | a cache in front of reads takes most of the load off storage |
| 1.8 billion items | 64-bit IDs (signed 32-bit tops out at 2.1 billion); the metadata table will eventually want partitioning |
| 0.14 Gbit/s egress | bandwidth is not a concern at this size |

### What breaks first at 10x?

~~~text
6. What changes at 10x users
  peak total QPS                    17,708
  app servers at 50% target         18
  storage with replicas, 5 years    574.9 TB
  hot set to cache                  100.0 GB
  peak write QPS                    347
~~~

Everything grows linearly here, but not every component scales the same way. 18 stateless servers is routine. 100 GB of cache is now several cache nodes, so the cache must be partitioned. 347 writes per second is still easy for one database primary, but 575 TB is not something one database holds — the body/metadata split from the previous table stops being optional. This is the kind of "what changes at 10x" reasoning interviewers ask for.

## 7. Presenting an Estimate Well

- **Say each assumption before you use it**, and write it down where the interviewer can see it.
- **Round aggressively**: 86,400 → 10^5 when doing it in your head, 579 → "about 600".
- **Keep units on every number**, and convert bits ↔ bytes explicitly.
- **Sanity-check against something known**: a single modern server handling thousands of simple requests per second is normal; one handling millions is not.
- **Stop when you can decide.** You need the order of magnitude and the dominant resource, not three significant figures.

For complete designs that start from this kind of estimate, see [How would you design a URL shortener like TinyURL?](/interview-question/how-would-you-design-a-url-shortener-like-tinyurl) and [How would you design Instagram?](/interview-question/how-would-you-design-instagram)

## 8. Verified: Running the Code

The example **"Capacity estimate for a Pastebin-style service, step by step"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`; both print exactly this:

~~~text
1. Traffic
  writes per day                    1,000,000
  reads per day                     50,000,000
  average write QPS                 12
  average read QPS                  579
  peak write QPS (x3)               35
  peak read QPS (x3)                1,736
  shortcut: reads/1e5 per day       500 QPS (13.6% low)
2. Storage
  new data per day                  10.5 GB
  raw, 5 years                      19.2 TB
  with 3 replicas                   57.5 TB
  paste count, 5 years              1,825,000,000
3. Bandwidth (average / peak)
  ingress                           121.5 KB/s / 364.6 KB/s
  egress                            5.8 MB/s / 17.4 MB/s
  egress in bits at peak            0.14 Gbit/s
4. Cache
  distinct pastes read per day      5,000,000
  hot set to cache (20%)            10.0 GB
5. Servers and concurrency
  peak total QPS                    1,771
  app servers at 50% target         2 (+1 spare = 3)
  in flight (Little: L = QPS x W)   89 requests
6. What changes at 10x users
  peak total QPS                    17,708
  app servers at 50% target         18
  storage with replicas, 5 years    574.9 TB
  hot set to cache                  100.0 GB
  peak write QPS                    347
~~~

Decimal units are used throughout (1 KB = 1,000 bytes), as is usual for storage and network sizing. Every input is an assumption chosen for the example, not a measurement of a real service.

## Common Pitfalls

- **Sizing for the average.** Servers fall over at the peak; apply a peak factor and keep headroom.
- **Mixing bits and bytes.** A "1 Gbit" link moves 125 MB/s, not 1 GB/s.
- **Forgetting replication, metadata and indexes.** Three replicas triple storage; indexes and small-item metadata can add tens of percent.
- **Not separating reads and writes.** They scale differently: reads with caches and replicas, writes with partitioning.
- **False precision.** "1,736.1 QPS" signals you missed the point; "about 2,000 at peak" is the right register.
- **Never interpreting the numbers.** An estimate that does not change a design decision was wasted time.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Assumptions first:</strong> <span style="color:#f0e2c8;">I state DAU, actions per user, the <strong style="color:#ffca28;">read:write ratio</strong>, item size, retention and peak factor out loud, rounding to friendly numbers, and ask the interviewer to correct any that are off.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Traffic:</strong> <span style="color:#f0e2c8;">Per day ÷ 86,400 — about 10^5 — gives average <strong style="color:#ffca28;">QPS</strong>, reads and writes separately; I multiply by a 2-3x peak factor. One million a day is about 12 per second.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Storage and bandwidth:</strong> <span style="color:#f0e2c8;">Storage is size × items per day × retention × <strong style="color:#ffca28;">replication factor</strong>; bandwidth is QPS × payload, and I convert bytes to bits for network links.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Memory and compute:</strong> <span style="color:#f0e2c8;">The cache holds the hot <strong style="color:#ffca28;">working set</strong>, often 20% of what is read daily; servers are peak QPS ÷ measured per-server capacity at 50-70% utilisation, plus one spare; <strong style="color:#ffca28;">Little's law</strong> gives concurrency.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Interpret:</strong> <span style="color:#f0e2c8;">Then I say which resource dominates and what it decides — here storage, so bodies go to object storage — and what breaks first at 10x.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why separate reads from writes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They scale with different tools. Reads are handled by caches and read replicas; writes go to a primary and eventually need partitioning. In the example, reads were 1,736 QPS at peak but writes only 35, which says caching matters and write scaling does not yet.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What peak factor would you use, and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">2-3x the daily average for a consumer app with a normal day/night curve. For launch events, flash sales or sports, much higher, and I would ask the interviewer about known spikes rather than guess.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know what one server can handle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In real life, from a load test of this service. In an interview I state an assumption — say 1,000-2,000 simple requests per second per server — and make it an explicit input so it is easy to revisit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you size a connection pool from these numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Little's law: connections in use = query rate × average query time. 1,000 queries per second at 5 ms each keeps about 5 connections busy on average; add headroom for bursts and slow queries, and spread it across the app instances.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The interviewer says your estimate is off by 2x. Does it matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually not. The estimate is for choosing a design: one machine versus a hundred, cache or no cache. A factor of two rarely changes those decisions; a factor of ten would, so I check which assumptions could be ten times wrong.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Back-of-the-envelope estimation | Order-of-magnitude arithmetic from stated assumptions |
| QPS | Requests per second hitting a component |
| Peak-to-average ratio | How much busier the busiest period is than the average |
| Read:write ratio | Reads per write; decides caching vs partitioning |
| Replication factor | Number of stored copies of each byte |
| Working set | Data actually accessed in a period; what the cache should hold |
| Little's law | Requests in flight = arrival rate × time in system (L = λW) |
| Headroom | Unused capacity kept for spikes and failures |

**Conclusion:** A capacity estimate is five small calculations — traffic, storage, bandwidth, cache and compute — built on assumptions you say out loud and round hard. Convert per-day numbers with 86,400 seconds (10^5 is the 14%-low shortcut), keep reads and writes apart, size for the peak with headroom, and remember replication and bits versus bytes. Then read the result: in the Pastebin example the compute was three servers but storage reached 57.5 TB, which is what pushed paste bodies into object storage. The arithmetic matters less than that last step.`,
    examples: [
      {
        label: `Capacity estimate for a Pastebin-style service, step by step`,
        variants: [
          { tech: "node", code: `// Back-of-the-envelope estimate for a Pastebin-style text-snippet service.
// Every input is an ASSUMPTION you would say out loud in the interview.
const A = {
  dau: 10e6,              // daily active users
  writesPerUserDay: 0.1,  // 1 in 10 users creates a paste each day
  readWriteRatio: 50,     // reads per write
  pasteBytes: 10e3,       // average paste body: 10 KB
  metaBytes: 500,         // id, owner, timestamps, expiry
  years: 5,               // retention
  replicas: 3,            // copies of every byte
  peakFactor: 3,          // busiest minute vs daily average
  hotFraction: 0.2,       // 20% of the distinct pastes read today get most reads
  serverRps: 2000,        // one app server, from a load test (assumption)
  targetUtil: 0.5,        // run servers at 50% so one failure or spike fits
  latencySec: 0.05,       // average time a request is in flight
};
const DAY = 86400;
const round = (x) => Math.floor(x + 0.5);
const fmt = (n) => String(round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
function bytes(b) {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  while (b >= 1000 && i < units.length - 1) { b /= 1000; i++; }
  return b.toFixed(1) + " " + units[i];
}
const line = (k, v) => console.log("  " + k.padEnd(34) + v);

console.log("1. Traffic");
const writesDay = A.dau * A.writesPerUserDay;
const readsDay = writesDay * A.readWriteRatio;
const writeQps = writesDay / DAY, readQps = readsDay / DAY;
line("writes per day", fmt(writesDay));
line("reads per day", fmt(readsDay));
line("average write QPS", fmt(writeQps));
line("average read QPS", fmt(readQps));
line("peak write QPS (x" + A.peakFactor + ")", fmt(writeQps * A.peakFactor));
line("peak read QPS (x" + A.peakFactor + ")", fmt(readQps * A.peakFactor));
line("shortcut: reads/1e5 per day", fmt(readsDay / 1e5) + " QPS (" + ((DAY / 1e5 - 1) * -100).toFixed(1) + "% low)");

console.log("2. Storage");
const perWrite = A.pasteBytes + A.metaBytes;
const perDay = writesDay * perWrite;
const raw = perDay * 365 * A.years;
line("new data per day", bytes(perDay));
line("raw, " + A.years + " years", bytes(raw));
line("with " + A.replicas + " replicas", bytes(raw * A.replicas));
line("paste count, " + A.years + " years", fmt(writesDay * 365 * A.years));

console.log("3. Bandwidth (average / peak)");
line("ingress", bytes(writeQps * perWrite) + "/s / " + bytes(writeQps * perWrite * A.peakFactor) + "/s");
line("egress", bytes(readQps * A.pasteBytes) + "/s / " + bytes(readQps * A.pasteBytes * A.peakFactor) + "/s");
line("egress in bits at peak", ((readQps * A.pasteBytes * A.peakFactor * 8) / 1e9).toFixed(2) + " Gbit/s");

console.log("4. Cache");
const distinctReadDay = readsDay / 10; // assume each paste read today is read ~10 times
line("distinct pastes read per day", fmt(distinctReadDay));
line("hot set to cache (20%)", bytes(distinctReadDay * A.hotFraction * A.pasteBytes));

console.log("5. Servers and concurrency");
const peakTotal = (writeQps + readQps) * A.peakFactor;
const servers = Math.ceil(peakTotal / (A.serverRps * A.targetUtil));
line("peak total QPS", fmt(peakTotal));
line("app servers at 50% target", servers + " (+1 spare = " + (servers + 1) + ")");
line("in flight (Little: L = QPS x W)", fmt(peakTotal * A.latencySec) + " requests");

console.log("6. What changes at 10x users");
const k = 10;
const peak10 = peakTotal * k;
line("peak total QPS", fmt(peak10));
line("app servers at 50% target", String(Math.ceil(peak10 / (A.serverRps * A.targetUtil))));
line("storage with replicas, 5 years", bytes(raw * A.replicas * k));
line("hot set to cache", bytes(distinctReadDay * A.hotFraction * A.pasteBytes * k));
line("peak write QPS", fmt(writeQps * A.peakFactor * k));` },
          { tech: "python", code: `# Back-of-the-envelope estimate for a Pastebin-style text-snippet service.
# Every input is an ASSUMPTION you would say out loud in the interview.
import math

A = {
    "dau": 10e6,              # daily active users
    "writesPerUserDay": 0.1,  # 1 in 10 users creates a paste each day
    "readWriteRatio": 50,     # reads per write
    "pasteBytes": 10e3,       # average paste body: 10 KB
    "metaBytes": 500,         # id, owner, timestamps, expiry
    "years": 5,               # retention
    "replicas": 3,            # copies of every byte
    "peakFactor": 3,          # busiest minute vs daily average
    "hotFraction": 0.2,       # 20% of the distinct pastes read today get most reads
    "serverRps": 2000,        # one app server, from a load test (assumption)
    "targetUtil": 0.5,        # run servers at 50% so one failure or spike fits
    "latencySec": 0.05,       # average time a request is in flight
}
DAY = 86400


def rnd(x):
    return math.floor(x + 0.5)


def fmt(n):
    return f"{rnd(n):,}"


def nbytes(b):
    units = ["B", "KB", "MB", "GB", "TB", "PB"]
    i = 0
    while b >= 1000 and i < len(units) - 1:
        b /= 1000
        i += 1
    return f"{b:.1f} {units[i]}"


def line(k, v):
    print("  " + k.ljust(34) + v)


print("1. Traffic")
writes_day = A["dau"] * A["writesPerUserDay"]
reads_day = writes_day * A["readWriteRatio"]
write_qps, read_qps = writes_day / DAY, reads_day / DAY
pf = A["peakFactor"]
line("writes per day", fmt(writes_day))
line("reads per day", fmt(reads_day))
line("average write QPS", fmt(write_qps))
line("average read QPS", fmt(read_qps))
line(f"peak write QPS (x{pf})", fmt(write_qps * pf))
line(f"peak read QPS (x{pf})", fmt(read_qps * pf))
line("shortcut: reads/1e5 per day", fmt(reads_day / 1e5) + f" QPS ({(DAY / 1e5 - 1) * -100:.1f}% low)")

print("2. Storage")
per_write = A["pasteBytes"] + A["metaBytes"]
per_day = writes_day * per_write
raw = per_day * 365 * A["years"]
line("new data per day", nbytes(per_day))
line(f"raw, {A['years']} years", nbytes(raw))
line(f"with {A['replicas']} replicas", nbytes(raw * A["replicas"]))
line(f"paste count, {A['years']} years", fmt(writes_day * 365 * A["years"]))

print("3. Bandwidth (average / peak)")
line("ingress", nbytes(write_qps * per_write) + "/s / " + nbytes(write_qps * per_write * pf) + "/s")
line("egress", nbytes(read_qps * A["pasteBytes"]) + "/s / " + nbytes(read_qps * A["pasteBytes"] * pf) + "/s")
line("egress in bits at peak", f"{(read_qps * A['pasteBytes'] * pf * 8) / 1e9:.2f} Gbit/s")

print("4. Cache")
distinct_read_day = reads_day / 10  # assume each paste read today is read ~10 times
line("distinct pastes read per day", fmt(distinct_read_day))
line("hot set to cache (20%)", nbytes(distinct_read_day * A["hotFraction"] * A["pasteBytes"]))

print("5. Servers and concurrency")
peak_total = (write_qps + read_qps) * pf
servers = math.ceil(peak_total / (A["serverRps"] * A["targetUtil"]))
line("peak total QPS", fmt(peak_total))
line("app servers at 50% target", f"{servers} (+1 spare = {servers + 1})")
line("in flight (Little: L = QPS x W)", fmt(peak_total * A["latencySec"]) + " requests")

print("6. What changes at 10x users")
k = 10
peak10 = peak_total * k
line("peak total QPS", fmt(peak10))
line("app servers at 50% target", str(math.ceil(peak10 / (A["serverRps"] * A["targetUtil"]))))
line("storage with replicas, 5 years", nbytes(raw * A["replicas"] * k))
line("hot set to cache", nbytes(distinct_read_day * A["hotFraction"] * A["pasteBytes"] * k))
line("peak write QPS", fmt(write_qps * pf * k))` },
        ],
      },
    ],
  },
  {
    title: `What latency numbers and availability targets should every engineer know?`,
    difficulty: "easy",
    seoDescription: `The latency ladder from L1 cache to cross-continent round trips, what each nine of availability allows, and how SLOs, error budgets and fan-out add up.`,
    description: `**Question presented to candidate:**
"Without looking anything up: roughly how long does a memory read take compared with an SSD read, a network round trip inside a datacenter, and one across an ocean? And if a service promises three nines, or four, how much downtime is that a month? How do those numbers change the way you design?"

**What a strong answer should cover:**
- The latency ladder in orders of magnitude: L1 cache about 0.5 ns, main memory about 100 ns, random SSD read about 150 µs, datacenter round trip about 0.5 ms, disk seek about 10 ms, California–Netherlands round trip about 150 ms (the classic, dated ~2012 table)
- What follows: avoid sequential network calls and random disk I/O on the request path; batch, parallelise, cache, and put data near users
- Percentiles and **tail latency**: with fan-out, the slowest backend sets the response time (1% slow per backend means 63% of requests slow at 100 backends)
- The nines: 99.9% is about 43 minutes a month, 99.99% about 4 minutes, 99.999% about 26 seconds; and the vocabulary **SLI, SLO, SLA, error budget**
- Composition: dependencies in series multiply availabilities (always lower), redundant copies in parallel raise it; availability = MTBF / (MTBF + MTTR), so faster recovery buys nines

**Code / implementation expected:** No — the arithmetic is the answer; the example computes every number quoted.`,
    answer: `**Target Audience:** Beginners — no hardware or operations background assumed.
**Difficulty:** Easy
**Verified with:** Node 22.22 and Python 3.12 (the calculator prints the same output in both).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every derived number was computed by the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

The famous latency table uses nanoseconds, which mean nothing to a human. So stretch time: pretend that reading from the CPU's L1 cache — the fastest memory there is — takes **one second**. The example program does that conversion:

~~~text
0. If an L1 cache read (0.5 ns) took one second
  main memory read                    200 seconds
  round trip in one datacenter        11.6 days
  disk seek                           231.5 days
  California-Netherlands round trip   9.5 years
~~~

On that scale, fetching from RAM is a short walk to the kitchen. Asking another server in the same building is a holiday of almost two weeks. A spinning-disk seek is most of a year, and a round trip across the Atlantic is nine and a half years.

That is why design rules like "cache it", "batch it" and "do not call the database in a loop" exist: each network hop or disk seek costs as much as millions of memory operations. Availability targets have the same flavour: "99.9%" sounds nearly perfect until you work out it allows 43 minutes of outage every month.

## 2. Latency Vocabulary

📌 **Interview term: latency** — how long one operation takes, start to finish. **Throughput** is how many operations complete per second. They are different: a highway can carry many cars (high throughput) while each trip still takes an hour (high latency).

📌 **Interview term: percentile (p50, p99)** — sort all request times; p50 is the median, p99 is the time that 99% of requests beat. Averages hide the slow requests that users notice, so latency targets are written as percentiles: "p99 under 200 ms".

📌 **Interview term: tail latency** — the slow end of the distribution (p99, p99.9). It matters more than the average once one user action depends on many backend calls (section 5).

## 3. The Latency Ladder

These are the widely quoted figures from *Latency Numbers Every Programmer Should Know*, credited to Jeff Dean and originally Peter Norvig, in the version labelled "~2012" (source: jboner's GitHub gist). They are **approximate and dated** — Colin Scott (UC Berkeley) published an interactive version that extrapolates them by year — so treat them as orders of magnitude, not specs.

| Operation | Approx. time | Order |
| :--- | :--- | :--- |
| L1 cache reference | 0.5 ns | nanoseconds |
| Branch mispredict | 5 ns | |
| L2 cache reference | 7 ns | |
| Mutex lock/unlock | 25 ns | |
| Main memory reference | 100 ns | |
| Compress 1 KB with a fast compressor | 3 µs | microseconds |
| Send 1 KB over a 1 Gbps network | 10 µs | |
| Read 4 KB randomly from SSD | 150 µs | |
| Read 1 MB sequentially from memory | 250 µs | |
| Round trip within the same datacenter | 500 µs | |
| Read 1 MB sequentially from SSD | 1 ms | milliseconds |
| Disk seek | 10 ms | |
| Read 1 MB sequentially from disk | 20 ms | |
| Packet California → Netherlands → California | 150 ms | |

<svg class="iq-diagram" width="100%" viewBox="0 0 780 290" role="img" aria-label="Latency ladder on a log scale from L1 cache to a transatlantic round trip, each bar ten times longer per step">
  <text class="d-text" x="20" y="37">L1 cache read, 0.5 ns</text>
  <rect class="d-box-muted" x="330" y="20" width="32" height="24" rx="4"/>
  <text class="d-text" x="20" y="81">Main memory read, 100 ns</text>
  <rect class="d-box-muted" x="330" y="64" width="135" height="24" rx="4"/>
  <text class="d-text" x="20" y="125">SSD random 4 KB read, 150 µs</text>
  <rect class="d-box" x="330" y="108" width="278" height="24" rx="4"/>
  <text class="d-text" x="20" y="169">Datacenter round trip, 500 µs</text>
  <rect class="d-box" x="330" y="152" width="302" height="24" rx="4"/>
  <text class="d-text" x="20" y="213">Disk seek, 10 ms</text>
  <rect class="d-box-accent" x="330" y="196" width="360" height="24" rx="4"/>
  <text class="d-text" x="20" y="257">CA to Netherlands round trip, 150 ms</text>
  <rect class="d-box-accent" x="330" y="240" width="413" height="24" rx="4"/>
</svg>

The bars are on a logarithmic scale: each extra 45 units of length is ten times longer in real time, so the transatlantic bar represents 300 million times the L1 bar.

The patterns that matter more than any single number:

- **Memory is about a thousand times faster than an SSD random read** (100 ns vs 150 µs), which is why caches pay off — [How does caching improve system performance?](/interview-question/how-does-caching-improve-system-performance)
- **A datacenter round trip costs about as much as an SSD read.** Calling another service is cheap in absolute terms but expensive compared with local work, so chatty services add up.
- **Sequential beats random**, dramatically on disks: one seek costs as much as reading half a megabyte sequentially from that disk.
- **Distance is physics.** No software makes California to Europe faster than about 150 ms round trip; the fix is putting data closer to the user — [What is a CDN and how does it work?](/interview-question/what-is-a-cdn-and-how-does-it-work)

Modern NVMe SSDs and networks are generally faster than these 2012 rows; measure your own hardware when it matters.

## 4. Latency Budgets: Adding Up a Request

~~~text
4. Latency budget for one user request (approximate numbers, ~2012 table)
  6 sequential calls in one datacenter: 3.000 ms
  6 calls in parallel (one round trip): 0.500 ms
  1 California-Netherlands round trip:  150.000 ms
  1,000 random SSD reads, sequential:   150.000 ms
  1,000 random disk seeks, sequential:  10000.000 ms
  1,000 memory reads:                   0.100 ms
~~~

What to take from it:

- **Sequential calls add; parallel calls take the slowest one.** Six dependent calls cost 6 round trips; six independent calls in parallel cost about one.
- **One cross-ocean round trip costs as much as a thousand random SSD reads.** A page that makes three sequential calls to another continent has spent nearly half a second before doing any work.
- **Loops over I/O are where latency hides.** A thousand random disk seeks is ten seconds — the classic "N+1 queries" problem, where code fetches a list and then queries once per item. Batch it into one query or cache it.

## 5. Tail Latency and Fan-Out

When one user request fans out to many backends and waits for all of them, the user waits for the **slowest**. If each backend is slow 1% of the time:

~~~text
5. Tail at scale: each backend is slow on 1% of calls
  fan-out to    1 backends:   1.0% of user requests hit a slow one
  fan-out to   10 backends:   9.6% of user requests hit a slow one
  fan-out to  100 backends:  63.4% of user requests hit a slow one
  fan-out to  500 backends:  99.3% of user requests hit a slow one
~~~

The formula is 1 − 0.99^N. This is the example in Dean and Barroso's paper *The Tail at Scale* (Communications of the ACM, 2013): a server with a 10 ms typical response and a one-second p99, used by a request that fans out to 100 servers, makes about 63% of user requests take over a second. Their remedies include **hedged requests** (send a second copy of a slow request to another replica and use whichever answers first) and keeping fan-out small.

## 6. Availability Vocabulary

📌 **Interview term: availability** — the fraction of time (or of requests) the service works correctly. Usually written in **nines**: 99.9% is "three nines".

📌 **Interview term: SLI, SLO, SLA** — an **SLI** (service level *indicator*) is the measurement, such as "fraction of requests answered successfully within 300 ms". An **SLO** (*objective*) is the internal target for it, such as 99.9% over 30 days. An **SLA** (*agreement*) is a contract with customers, usually looser than the SLO, with credits or refunds when it is missed.

📌 **Interview term: error budget** — 100% minus the SLO: the amount of failure you are allowed. A 99.9% SLO gives a 0.1% error budget to spend on deploys, experiments and incidents; when it is used up, teams slow down releases.

📌 **Interview term: MTBF and MTTR** — mean time between failures and mean time to repair. Availability ≈ MTBF / (MTBF + MTTR), so you get more nines either by failing less often or by **recovering faster**.

### What each nine allows

~~~text
1. Allowed downtime
  target       per year    per month     per week   per day
  99%        3d 15h 36m       7h 12m   1h 40m 48s   14m 24s
  99.5%      1d 19h 48m       3h 36m      50m 24s    7m 12s
  99.9%      8h 45m 36s      43m 12s       10m 5s    1m 26s
  99.95%     4h 22m 48s      21m 36s        5m 2s       43s
  99.99%        52m 34s       4m 19s           1m        9s
  99.999%        5m 15s          26s           6s        1s
~~~

(365-day year, 30-day month.) The useful anchors: **three nines is about 43 minutes a month, four nines about 4 minutes, five nines about 26 seconds.** Four and five nines are beyond what a human can react to; they require automated failover, because by the time someone is paged the budget is gone.

## 7. How Availability Composes

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="Components in series must all work, components in parallel need only one to work">
  <defs>
    <marker id="sd01q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="190" y="30" text-anchor="middle">In series: all must work</text>
  <rect class="d-box" x="20" y="100" width="100" height="50" rx="8"/>
  <text class="d-text" x="70" y="131" text-anchor="middle">LB</text>
  <rect class="d-box" x="160" y="100" width="100" height="50" rx="8"/>
  <text class="d-text" x="210" y="131" text-anchor="middle">App</text>
  <rect class="d-box" x="300" y="100" width="100" height="50" rx="8"/>
  <text class="d-text" x="350" y="131" text-anchor="middle">DB</text>
  <path class="d-edge" d="M 120 125 L 154 125" marker-end="url(#sd01q5-arrow)"/>
  <path class="d-edge" d="M 260 125 L 294 125" marker-end="url(#sd01q5-arrow)"/>
  <text class="d-text" x="590" y="30" text-anchor="middle">In parallel: any one works</text>
  <rect class="d-box-accent" x="530" y="60" width="120" height="50" rx="8"/>
  <text class="d-text" x="590" y="91" text-anchor="middle">Copy 1</text>
  <rect class="d-box-accent" x="530" y="170" width="120" height="50" rx="8"/>
  <text class="d-text" x="590" y="201" text-anchor="middle">Copy 2</text>
  <path class="d-edge" d="M 460 140 L 524 88" marker-end="url(#sd01q5-arrow)"/>
  <path class="d-edge" d="M 460 140 L 524 192" marker-end="url(#sd01q5-arrow)"/>
</svg>

Series multiplies availabilities, so every dependency lowers the total. Parallel multiplies the *failure* probabilities, so each redundant copy raises it.

~~~text
2. Composition
  in series (all must work): 99.99% x 99.95% x 99.95% x 99.9% = 99.790% (18h 23m/yr)
  1 x 99.9% in parallel (any one enough): 99.9000000%
  2 x 99.9% in parallel (any one enough): 99.9999000%
  3 x 99.9% in parallel (any one enough): 99.9999999%
~~~

- Four components that are each at least three nines give **less than three nines together** (99.790%). Your availability can never exceed that of your least available hard dependency, so count your dependencies.
- Two independent 99.9% copies give six nines *on paper*. In reality copies fail together — same deploy, same config, same zone, same database — so redundancy only helps as far as failures really are independent. That is the core of [How do you design for high availability?](/interview-question/how-do-you-design-for-high-availability)

### Error budgets and repair time

~~~text
3. Error budget (SLO 99.9%, 30 days, 2,000,000 requests/day) and repair time
  failed requests allowed: 60000 of 60000000
  full-outage minutes allowed: 43.2
  one 25-minute outage burns 57.9% of the budget
  MTBF 30 days, MTTR 1 hour: 99.861%; MTTR 6 minutes: 99.986%
~~~

One 25-minute incident spends more than half of a month's 99.9% budget. And a component that fails once a month goes from below three nines to almost four just by **recovering in 6 minutes instead of an hour** — which is why fast detection, automated failover and quick rollbacks are worth as much as preventing failures. Measuring those SLIs is covered in [What are the three pillars of observability?](/interview-question/what-are-the-three-pillars-of-observability)

### What providers actually commit to

- The **Amazon Compute SLA** commits to a 99.99% monthly uptime percentage per region when instances run across two or more availability zones, and 99.5% for a single EC2 instance; missing them earns service credits (source: AWS, *Amazon Compute Service Level Agreement*).
- **Amazon S3 Standard** is designed for 99.999999999% (eleven nines) **durability** and 99.99% **availability** over a year (source: AWS S3 docs, *Data protection in Amazon S3*). Durability (not losing the data) and availability (being able to read it right now) are different promises.

A single instance at 99.5% allows about 3.6 hours of downtime a month — the cloud does not make a single machine highly available; redundancy across zones does.

## 8. Verified: Running the Code

The example **"Nines, dependency chains, error budgets and tail latency"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`; both print exactly this:

~~~text
0. If an L1 cache read (0.5 ns) took one second
  main memory read                    200 seconds
  round trip in one datacenter        11.6 days
  disk seek                           231.5 days
  California-Netherlands round trip   9.5 years
1. Allowed downtime
  target       per year    per month     per week   per day
  99%        3d 15h 36m       7h 12m   1h 40m 48s   14m 24s
  99.5%      1d 19h 48m       3h 36m      50m 24s    7m 12s
  99.9%      8h 45m 36s      43m 12s       10m 5s    1m 26s
  99.95%     4h 22m 48s      21m 36s        5m 2s       43s
  99.99%        52m 34s       4m 19s           1m        9s
  99.999%        5m 15s          26s           6s        1s
2. Composition
  in series (all must work): 99.99% x 99.95% x 99.95% x 99.9% = 99.790% (18h 23m/yr)
  1 x 99.9% in parallel (any one enough): 99.9000000%
  2 x 99.9% in parallel (any one enough): 99.9999000%
  3 x 99.9% in parallel (any one enough): 99.9999999%
3. Error budget (SLO 99.9%, 30 days, 2,000,000 requests/day) and repair time
  failed requests allowed: 60000 of 60000000
  full-outage minutes allowed: 43.2
  one 25-minute outage burns 57.9% of the budget
  MTBF 30 days, MTTR 1 hour: 99.861%; MTTR 6 minutes: 99.986%
4. Latency budget for one user request (approximate numbers, ~2012 table)
  6 sequential calls in one datacenter: 3.000 ms
  6 calls in parallel (one round trip): 0.500 ms
  1 California-Netherlands round trip:  150.000 ms
  1,000 random SSD reads, sequential:   150.000 ms
  1,000 random disk seeks, sequential:  10000.000 ms
  1,000 memory reads:                   0.100 ms
5. Tail at scale: each backend is slow on 1% of calls
  fan-out to    1 backends:   1.0% of user requests hit a slow one
  fan-out to   10 backends:   9.6% of user requests hit a slow one
  fan-out to  100 backends:  63.4% of user requests hit a slow one
  fan-out to  500 backends:  99.3% of user requests hit a slow one
~~~

The program does arithmetic only; it measures nothing. The latency inputs are the ~2012 table values, and the availability inputs are illustrative, not any provider's figures.

## Common Pitfalls

- **Quoting the table as current hardware specs.** It is a 2012-era order-of-magnitude guide; the ratios matter, not the digits.
- **Designing to averages.** Users feel p99, and fan-out turns a 1% tail into a majority of requests.
- **Ignoring dependencies in series.** Four "three nines" components together are below three nines.
- **Counting redundant copies as independent.** Shared deploys, configs and zones make copies fail together.
- **Confusing SLA, SLO and SLI**, or durability with availability.
- **Promising four or five nines with manual recovery.** Four nines allows about 4 minutes a month — less than the time to page someone.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The ladder:</strong> <span style="color:#f0e2c8;">Roughly: L1 cache 0.5 ns, RAM 100 ns, random SSD read 150 µs, datacenter round trip 0.5 ms, disk seek 10 ms, California to Europe and back 150 ms — the ~2012 Dean/Norvig table, so orders of magnitude, not specs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Design rules:</strong> <span style="color:#f0e2c8;">Memory is about a thousand times faster than SSD, so cache hot data; avoid sequential network calls and I/O in loops; batch and parallelise; put data near users with CDNs and regional replicas.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Tails:</strong> <span style="color:#f0e2c8;">Targets are percentiles, not averages. With fan-out the slowest backend wins: 1% slow per backend means about <strong style="color:#ffca28;">63% of requests slow at 100 backends</strong>, so keep fan-out small and use hedged requests.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Nines:</strong> <span style="color:#f0e2c8;">Three nines is about 43 minutes a month, four nines about 4 minutes, five nines about 26 seconds. An <strong style="color:#ffca28;">SLI</strong> is the measurement, the <strong style="color:#ffca28;">SLO</strong> the target, the <strong style="color:#ffca28;">SLA</strong> the contract, and the <strong style="color:#ffca28;">error budget</strong> is 100% minus the SLO.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Composition:</strong> <span style="color:#f0e2c8;">Dependencies in series multiply, so the total is below the weakest part; redundancy in parallel raises it only if failures are independent; and availability ≈ MTBF / (MTBF + MTTR), so faster recovery buys nines.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a datacenter round trip matter if it is only half a millisecond?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is about 5,000 memory reads, and calls add up when they are sequential. Six dependent service calls are 3 ms before any work; a loop that makes a call per item turns that into seconds. Batch or parallelise them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your service depends on four others at 99.95% each. What can you promise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most their product, about 99.8%, if all four are hard dependencies. To promise more, make some of them soft: serve from a cache or degrade gracefully when one is down, so its failure is no longer your failure.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is an error budget used for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It turns the SLO into a spending decision. While budget remains, the team ships features and takes risks; when an incident uses it up, releases slow down and reliability work takes priority. With a 99.9% SLO a single 25-minute outage spends about 58% of a month.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get from three nines to four?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Remove single points of failure across zones, automate failover and rollback so recovery takes minutes not an hour, make deploys gradual with canaries, and make dependencies soft. Four nines leaves about 4 minutes a month, so nothing manual can be on the critical path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is durability the same as availability?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Durability is the chance data is not lost — S3 Standard is designed for eleven nines. Availability is whether you can reach it now — S3 Standard is designed for 99.99%. Data can be perfectly safe and temporarily unreachable.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Latency | Time for one operation, start to finish |
| Percentile (p50, p99) | The time that 50% or 99% of requests beat |
| Tail latency | The slow end of the distribution, p99 and beyond |
| Availability | Fraction of time or requests the service works |
| SLI / SLO / SLA | Measurement / internal target / contract with penalties |
| Error budget | 100% minus the SLO: the failure you are allowed |
| MTBF / MTTR | Mean time between failures / mean time to repair |

**Conclusion:** Know the latency ladder in orders of magnitude — RAM in nanoseconds, SSD and datacenter round trips in hundreds of microseconds, disk seeks in milliseconds, intercontinental round trips in a hundred-plus milliseconds — and let it drive the obvious rules: cache, batch, parallelise and move data close to users. Know what the nines mean in minutes, that targets are percentiles and SLOs with an error budget, that dependencies in series multiply down while independent redundancy multiplies up, and that recovering faster is often the cheapest way to add a nine.`,
    examples: [
      {
        label: `Nines, dependency chains, error budgets and tail latency`,
        variants: [
          { tech: "node", code: `// The arithmetic behind "nines", dependency chains, error budgets and tail latency.
// Year = 365 days, month = 30 days (state this when you quote downtime).
const round = (x) => Math.floor(x + 0.5);
function dur(sec) {
  let s = round(sec);
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const parts = [];
  if (d) parts.push(d + "d");
  if (h) parts.push(h + "h");
  if (m) parts.push(m + "m");
  if (s || !parts.length) parts.push(s + "s");
  return parts.join(" ");
}
const YEAR = 365 * 86400, MONTH = 30 * 86400, WEEK = 7 * 86400, DAY = 86400;

console.log("0. If an L1 cache read (0.5 ns) took one second");
const human = [["main memory read", 100], ["round trip in one datacenter", 500e3], ["disk seek", 10e6], ["California-Netherlands round trip", 150e6]];
for (const [what, ns] of human) {
  const sec = ns / 0.5;
  const text = sec < 3600 ? round(sec) + " seconds" : sec < 86400 * 365 ? (sec / 86400).toFixed(1) + " days" : (sec / YEAR).toFixed(1) + " years";
  console.log("  " + what.padEnd(36) + text);
}

console.log("1. Allowed downtime");
console.log("  target       per year    per month     per week   per day");
for (const a of ["99", "99.5", "99.9", "99.95", "99.99", "99.999"]) {
  const down = 1 - Number(a) / 100;
  console.log(
    "  " + (a + "%").padEnd(9) + dur(down * YEAR).padStart(12) + dur(down * MONTH).padStart(13) +
    dur(down * WEEK).padStart(13) + dur(down * DAY).padStart(10)
  );
}

console.log("2. Composition");
const chain = [["load balancer", 99.99], ["app", 99.95], ["database", 99.95], ["cache", 99.9]];
let serial = 1;
for (const [, a] of chain) serial *= a / 100;
console.log("  in series (all must work): " + chain.map((c) => c[1] + "%").join(" x ") +
  " = " + (serial * 100).toFixed(3) + "% (" + dur((1 - serial) * YEAR) + "/yr)");
for (const n of [1, 2, 3]) {
  const p = 1 - (1 - 0.999) ** n;
  console.log("  " + n + " x 99.9% in parallel (any one enough): " + (p * 100).toFixed(7) + "%");
}

console.log("3. Error budget (SLO 99.9%, 30 days, 2,000,000 requests/day) and repair time");
const total = 2e6 * 30, budget = total * (1 - 0.999);
console.log("  failed requests allowed: " + round(budget) + " of " + round(total));
console.log("  full-outage minutes allowed: " + ((1 - 0.999) * MONTH / 60).toFixed(1));
const used = 25 / ((1 - 0.999) * MONTH / 60);
console.log("  one 25-minute outage burns " + (used * 100).toFixed(1) + "% of the budget");

console.log("  MTBF 30 days, MTTR 1 hour: " + ((720 / (720 + 1)) * 100).toFixed(3) + "%; MTTR 6 minutes: " + ((720 / (720 + 0.1)) * 100).toFixed(3) + "%");

console.log("4. Latency budget for one user request (approximate numbers, ~2012 table)");
const NS = { mem: 100, ssd4k: 150e3, dcRtt: 500e3, diskSeek: 10e6, transatlantic: 150e6 };
const ms = (ns) => (ns / 1e6).toFixed(3) + " ms";
console.log("  6 sequential calls in one datacenter: " + ms(6 * NS.dcRtt));
console.log("  6 calls in parallel (one round trip): " + ms(NS.dcRtt));
console.log("  1 California-Netherlands round trip:  " + ms(NS.transatlantic));
console.log("  1,000 random SSD reads, sequential:   " + ms(1000 * NS.ssd4k));
console.log("  1,000 random disk seeks, sequential:  " + ms(1000 * NS.diskSeek));
console.log("  1,000 memory reads:                   " + ms(1000 * NS.mem));

console.log("5. Tail at scale: each backend is slow on 1% of calls");
for (const n of [1, 10, 100, 500]) {
  console.log("  fan-out to " + String(n).padStart(4) + " backends: " +
    ((1 - 0.99 ** n) * 100).toFixed(1).padStart(5) + "% of user requests hit a slow one");
}` },
          { tech: "python", code: `# The arithmetic behind "nines", dependency chains, error budgets and tail latency.
# Year = 365 days, month = 30 days (state this when you quote downtime).
import math


def rnd(x):
    return math.floor(x + 0.5)


def dur(sec):
    s = rnd(sec)
    d = s // 86400; s -= d * 86400
    h = s // 3600; s -= h * 3600
    m = s // 60; s -= m * 60
    parts = []
    if d:
        parts.append(f"{d}d")
    if h:
        parts.append(f"{h}h")
    if m:
        parts.append(f"{m}m")
    if s or not parts:
        parts.append(f"{s}s")
    return " ".join(parts)


YEAR, MONTH, WEEK, DAY = 365 * 86400, 30 * 86400, 7 * 86400, 86400

print("0. If an L1 cache read (0.5 ns) took one second")
human = [("main memory read", 100), ("round trip in one datacenter", 500e3), ("disk seek", 10e6), ("California-Netherlands round trip", 150e6)]
for what, ns in human:
    sec = ns / 0.5
    if sec < 3600:
        text = f"{rnd(sec)} seconds"
    elif sec < 86400 * 365:
        text = f"{sec / 86400:.1f} days"
    else:
        text = f"{sec / YEAR:.1f} years"
    print("  " + what.ljust(36) + text)

print("1. Allowed downtime")
print("  target       per year    per month     per week   per day")
for a in ["99", "99.5", "99.9", "99.95", "99.99", "99.999"]:
    down = 1 - float(a) / 100
    print("  " + (a + "%").ljust(9) + dur(down * YEAR).rjust(12) + dur(down * MONTH).rjust(13)
          + dur(down * WEEK).rjust(13) + dur(down * DAY).rjust(10))

print("2. Composition")
chain = [("load balancer", 99.99), ("app", 99.95), ("database", 99.95), ("cache", 99.9)]
serial = 1
for _, a in chain:
    serial *= a / 100
print("  in series (all must work): " + " x ".join(f"{c[1]}%" for c in chain)
      + f" = {serial * 100:.3f}% ({dur((1 - serial) * YEAR)}/yr)")
for n in [1, 2, 3]:
    p = 1 - (1 - 0.999) ** n
    print(f"  {n} x 99.9% in parallel (any one enough): {p * 100:.7f}%")

print("3. Error budget (SLO 99.9%, 30 days, 2,000,000 requests/day) and repair time")
total = 2e6 * 30
budget = total * (1 - 0.999)
print(f"  failed requests allowed: {rnd(budget)} of {rnd(total)}")
print(f"  full-outage minutes allowed: {(1 - 0.999) * MONTH / 60:.1f}")
used = 25 / ((1 - 0.999) * MONTH / 60)
print(f"  one 25-minute outage burns {used * 100:.1f}% of the budget")

print(f"  MTBF 30 days, MTTR 1 hour: {(720 / (720 + 1)) * 100:.3f}%; MTTR 6 minutes: {(720 / (720 + 0.1)) * 100:.3f}%")

print("4. Latency budget for one user request (approximate numbers, ~2012 table)")
NS = {"mem": 100, "ssd4k": 150e3, "dcRtt": 500e3, "diskSeek": 10e6, "transatlantic": 150e6}


def ms(ns):
    return f"{ns / 1e6:.3f} ms"


print("  6 sequential calls in one datacenter: " + ms(6 * NS["dcRtt"]))
print("  6 calls in parallel (one round trip): " + ms(NS["dcRtt"]))
print("  1 California-Netherlands round trip:  " + ms(NS["transatlantic"]))
print("  1,000 random SSD reads, sequential:   " + ms(1000 * NS["ssd4k"]))
print("  1,000 random disk seeks, sequential:  " + ms(1000 * NS["diskSeek"]))
print("  1,000 memory reads:                   " + ms(1000 * NS["mem"]))

print("5. Tail at scale: each backend is slow on 1% of calls")
for n in [1, 10, 100, 500]:
    print(f"  fan-out to {str(n).rjust(4)} backends: " + f"{(1 - 0.99 ** n) * 100:.1f}".rjust(5)
          + "% of user requests hit a slow one")` },
        ],
      },
    ],
  },
];

export default augments;
