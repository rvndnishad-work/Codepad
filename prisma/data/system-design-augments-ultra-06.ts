/**
 * SYSTEM DESIGN ULTRA — batch 06: Partitioning data. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `What is database sharding?`,
    difficulty: "medium",
    seoDescription: `Database sharding explained from zero: shard keys, range vs hash vs directory sharding, hot shards, cross-shard queries and resharding with logical shards.`,
    description: `**Question presented to candidate:**
"Our main Postgres database is running out of room and write capacity, even with read replicas. Someone suggested sharding. What is sharding, how would you choose how to split the data, and what gets harder once you do it?"

**What a strong answer should cover:**
- Sharding is **horizontal partitioning across machines**: each shard holds a subset of rows and is the only writer for them, so it scales **writes and storage**, which read replicas do not
- The **shard key** decides everything: high cardinality, even spread, and aligned with the main query so most requests touch **one shard**
- The strategies and their failure modes: **range** (good scans, hot tail on monotonic keys), **hash** (even spread, scatter-gather for ranges), **directory / lookup** (flexible, but the map is a dependency)
- What gets harder: **cross-shard queries, joins and transactions**, global unique constraints and IDs, **hot keys** that no key choice fixes
- **Resharding**: \`hash % N\` moves most rows when N changes; fixed **logical shards** (or consistent hashing) move only the data that must move
- When not to shard yet: vertical scaling, replicas, caching and archiving come first

**Clarifying questions expected:**
- What is the dominant access pattern: by user, by tenant, by time?
- Is the pressure on storage, write throughput, or both, and how fast is it growing?
- Which queries must stay transactional across entities?

**Code / implementation expected:** Optional — the choice of shard key with its trade-offs matters most; the example measures range vs hash on one workload and the cost of resharding.`,
    answer: `**Target Audience:** Beginners to system design who know what a database table is; no distributed-systems background assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Notion figures are cited from the Notion engineering blog; DynamoDB limits from the AWS DynamoDB developer guide.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Numbers come from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A town library keeps every member card in one filing cabinet. The town grows; the cabinet fills, and the queue at the single clerk gets long. Buying a bigger cabinet works for a while (**vertical scaling**), and hiring helpers who only *read* cards from photocopies helps lookups (**read replicas**). But every new card and every change still goes through the one clerk and the one cabinet.

So the library buys four cabinets and puts a sign on the door: *surnames A–F in cabinet 1, G–L in cabinet 2...* Each cabinet has its own clerk. Four clerks write at the same time, and no cabinet holds more than a quarter of the cards. That is sharding.

The sign on the door is the hard part. If most new members are called Smith, one cabinet is swamped. If you ask "list everyone who joined last Tuesday", you must open all four cabinets. And when you buy a fifth cabinet, you have to decide which cards to carry across.

## 2. Sharding, Defined

📌 **Interview term: sharding (horizontal partitioning)** — splitting the rows of one logical table across several independent database servers. Each server, a **shard**, stores a disjoint subset of rows and is the only place those rows are written. Together the shards hold the whole table.

It helps to separate three things people mix up:

| Technique | What is copied or split | What it scales |
| :--- | :--- | :--- |
| Read replica | the **whole** dataset, copied | reads only; every write still hits the primary |
| Vertical partitioning | different **tables or columns** on different servers | a little, until one table is too big |
| Sharding | the **rows of one table** split | writes, storage and reads |

Replication and sharding are combined in practice: each shard is usually a primary with its own replicas. See [What is database replication?](/interview-question/what-is-database-replication) for that layer.

📌 **Interview term: shard key (partition key)** — the column whose value decides which shard a row lives on, for example \`user_id\` or \`tenant_id\`. Every query that includes the shard key can be sent to one shard; a query that does not must ask all of them.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="An application sends each query to a router, which uses the shard key to pick one of four shards">
  <defs>
    <marker id="sd06q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="130" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="160" text-anchor="middle">App server</text>
  <text class="d-sub" x="90" y="182" text-anchor="middle">user_id = 4217</text>
  <rect class="d-box-accent" x="240" y="120" width="170" height="90" rx="10"/>
  <text class="d-text" x="325" y="155" text-anchor="middle">Shard router</text>
  <text class="d-sub" x="325" y="178" text-anchor="middle">key to shard map</text>
  <path class="d-edge" d="M 166 165 L 234 165" marker-end="url(#sd06q1-arrow)"/>
  <rect class="d-box" x="520" y="20" width="180" height="56" rx="10"/>
  <text class="d-text" x="610" y="53" text-anchor="middle">Shard 0</text>
  <rect class="d-box-accent" x="520" y="100" width="180" height="56" rx="10"/>
  <text class="d-text" x="610" y="133" text-anchor="middle">Shard 1</text>
  <rect class="d-box" x="520" y="180" width="180" height="56" rx="10"/>
  <text class="d-text" x="610" y="213" text-anchor="middle">Shard 2</text>
  <rect class="d-box" x="520" y="260" width="180" height="56" rx="10"/>
  <text class="d-text" x="610" y="293" text-anchor="middle">Shard 3</text>
  <path class="d-edge-dashed" d="M 416 140 L 514 50"/>
  <path class="d-edge-accent" d="M 416 155 L 514 128" marker-end="url(#sd06q1-arrow)"/>
  <path class="d-edge-dashed" d="M 416 180 L 514 208"/>
  <path class="d-edge-dashed" d="M 416 195 L 514 288"/>
</svg>

The router can be a library inside the application, a proxy in front of the databases (the VTGate layer of Vitess, for MySQL), a coordinator node (the Citus extension, for Postgres), or the database itself (Cassandra and DynamoDB route internally). Wherever it lives, it answers one question per query: which shard owns this key?

## 3. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What do most queries filter on? | The shard key should be that field, so most queries hit one shard. |
| Is the bottleneck storage, writes, or reads? | Reads alone are cheaper to fix with replicas or a cache. |
| How fast does data grow, and is old data still read? | Decides the shard count and whether archiving buys time. |
| Which operations must be atomic across entities? | Cross-shard transactions are slow or unavailable; keep them inside one shard. |
| Are there very large tenants or celebrity users? | One huge key can overload a shard no matter how you split. |

## 4. How Rows Are Assigned: Three Strategies

### Range sharding

Each shard owns a contiguous range of key values: user IDs 1–3000 on shard 0, 3001–6000 on shard 1, and so on.

📌 **Interview term: range sharding** — partitioning by contiguous key ranges. Range scans ("users 5000 to 5999", "orders from March") stay on one shard, and splitting a hot range is easy. The weakness: a **monotonic key** (auto-increment ID, timestamp) sends every new row to the last range.

### Hash sharding

The router hashes the key and maps the hash to a shard, for example \`hash(user_id) % 4\`.

📌 **Interview term: hash sharding** — partitioning by a hash of the key. Neighbouring keys land on unrelated shards, so load spreads evenly even when keys are sequential. Range queries now touch every shard.

### Directory (lookup) sharding

A small table maps each key, or each tenant, to a shard: \`tenant 17 → shard 3\`.

📌 **Interview term: directory-based sharding** — keeping an explicit key-to-shard map. You can move one tenant at a time and put a giant tenant on its own hardware. The map becomes a critical dependency that must be cached, replicated and kept consistent.

## 5. Measured: Range vs Hash on the Same Users

The example puts 12,000 users on 4 shards and replays the same traffic against both strategies. The first test assumes, as in most products, that the newest users are the most active:

~~~text
1) 20000 writes, all from the 3000 newest users:
  range by id      0.0%   0.0%   0.0% 100.0%   busiest 100.0%
  hash of id      25.1%  25.2%  25.8%  23.7%   busiest 25.8%
~~~

Range sharding by ID sent **100% of writes to shard 3**, because the 3,000 newest users all have the highest IDs. Hash sharding spread the same writes so the busiest shard took 25.8%, close to the fair 25%.

📌 **Interview term: hot shard (hotspot)** — a shard that receives far more than its share of traffic, so it saturates while the others idle. The cluster is only as fast as its hottest shard.

Hashing does not fix every hotspot. If one key is hot, every request for it still goes to one shard:

~~~text
2) 20000 reads, 30% of them for one celebrity, user 777:
  hash of id      17.4%  17.3%  17.9%  47.2%   busiest 47.2%
~~~

📌 **Interview term: hot key (celebrity problem)** — a single key with so much traffic that its shard is overloaded, whatever the sharding scheme. Here 30% of reads went to user 777 and its shard carried 47.2%. Fixes are per key: cache it, add read replicas for that shard, or split the key itself (append a suffix \`777#0..777#9\` to spread writes, then merge on read).

And the price of hashing is paid on range queries:

~~~text
3) Shards a query must touch:
  get user 4217:            range 1, hash 1
  users with id 5000-5999:  range 1, hash 4
~~~

📌 **Interview term: scatter-gather** — sending a query to every shard and merging the answers. Latency becomes the slowest shard plus the merge, and every shard does work for every such query.

## 6. What Gets Harder After Sharding

- **Joins across shards.** A join between rows on different shards has no single database to run it. Choose the key so related rows share it: shard orders, payments and addresses by \`user_id\` too, and they live together.
- **Transactions across shards.** Moving money between two users on different shards needs a distributed protocol; see [What is two-phase commit and its drawbacks?](/interview-question/what-is-two-phase-commit-and-its-drawbacks) and [What is the saga pattern for distributed transactions?](/interview-question/what-is-the-saga-pattern-for-distributed-transactions).
- **Unique IDs.** Auto-increment is per shard, so two shards hand out the same ID. Use globally unique IDs, covered in [How would you design a unique ID generator at scale?](/interview-question/how-would-you-design-a-unique-id-generator-at-scale-5739).
- **Secondary lookups.** "Find the user with this email" has no shard key. Keep a separate index table sharded by email that maps email to \`user_id\`.
- **Operations.** Backups, schema migrations and monitoring now run N times, and N partial outages are possible.

📌 **Interview term: co-location** — putting rows that are queried or updated together on the same shard by giving them the same shard key. It turns most joins and transactions back into single-shard operations.

## 7. Resharding: Plan for Growth on Day One

When four databases are no longer enough, rows must move. How many depends on the mapping:

~~~text
4) Grow from 4 to 6 physical databases:
  hash % N (4 -> 6):        8007 of 12000 users move (66.7%)
  48 logical shards:        16 logical shards copied whole, 3996 of 12000 users move (33.3%)
  logical shards per host after: 8 8 8 8 8 8
~~~

With \`hash % N\`, going from 4 to 6 databases moved **66.7%** of users: the remainder changes for most hashes when N changes. The alternative is to fix the number of **logical shards** up front (48 here) and map logical shards to physical hosts. Growing then means copying 16 whole logical shards to the new hosts; 33.3% of users moved, which is the third of the data the two new hosts must end up holding anyway, and no key is re-hashed.

📌 **Interview term: logical shards (virtual shards)** — many more partitions than servers, each a self-contained unit (a schema or a database) that can be moved between hosts. The key-to-logical-shard function never changes; only the logical-to-physical map does.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="Keys hash to a fixed set of logical shards; a small map assigns logical shards to physical hosts and only that map changes when hosts are added">
  <defs>
    <marker id="sd06q1-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="100" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="130" text-anchor="middle">user_id</text>
  <text class="d-sub" x="95" y="152" text-anchor="middle">hash mod 48</text>
  <rect class="d-box-accent" x="260" y="100" width="190" height="70" rx="10"/>
  <text class="d-text" x="355" y="130" text-anchor="middle">Logical shard 0..47</text>
  <text class="d-sub" x="355" y="152" text-anchor="middle">never changes</text>
  <path class="d-edge" d="M 176 135 L 254 135" marker-end="url(#sd06q1-arrow2)"/>
  <rect class="d-box" x="540" y="20" width="160" height="60" rx="10"/>
  <text class="d-text" x="620" y="55" text-anchor="middle">Host 0..3</text>
  <rect class="d-box-muted" x="540" y="190" width="160" height="60" rx="10"/>
  <text class="d-text" x="620" y="225" text-anchor="middle">New host 4, 5</text>
  <path class="d-edge" d="M 456 115 L 534 55" marker-end="url(#sd06q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 456 155 L 534 215" marker-end="url(#sd06q1-arrow2)"/>
  <text class="d-sub" x="470" y="70" text-anchor="middle">32 stay</text>
  <text class="d-sub" x="470" y="210" text-anchor="middle">16 move</text>
</svg>

This is what Notion did when it sharded Postgres: per the Notion engineering blog ("Herding elephants: lessons learned from sharding Postgres at Notion"), it created **480 logical shards on 32 physical databases** (15 schemas each), partitioned by workspace ID, and chose 480 because it divides evenly into many host counts. A later Notion post reports growing to 96 physical instances with 5 logical shards each, still 480 in total.

Consistent hashing is the other way to make resharding cheap, especially for caches and leaderless stores; it has its own page: [What is consistent hashing?](/interview-question/what-is-consistent-hashing).

## 8. How Many Shards? A Worked Estimate

Assumptions for an orders table (state them in the interview; the method matters more than the inputs):

- 200 million users, 50 orders each on average, 1,000 bytes per order including indexes
- peak 30,000 writes per second
- each shard should hold at most **2 TB** (so a restore or a replica rebuild finishes in hours, not days) and sustain about **5,000 writes per second** on the chosen hardware

~~~text
5) Capacity estimate (assumptions in the doc):
  data 10 TB / 2 TB per shard = 5 shards; peak 30000 writes/s / 5000 per shard = 6 shards
  need max(5, 6) = 6 shards today; with 2x headroom plan 12
~~~

Writes, not storage, set the count here. Plan for the doubled number, or better, create many logical shards (say 96 or 120) on 12 hosts so the next growth step is a copy, not a rewrite. For the method behind these numbers, see [How do you approach back-of-the-envelope capacity estimation?](/interview-question/how-do-you-approach-back-of-the-envelope-capacity-estimation).

Managed stores have the same ceiling per partition. The AWS DynamoDB developer guide states that one partition serves at most **3,000 read capacity units or 1,000 write capacity units per second**, so a low-cardinality partition key throttles even when the table as a whole has spare capacity.

## 9. Before You Shard

Sharding is a one-way door that adds permanent complexity. Exhaust the cheaper steps first: a bigger machine ([What is the difference between horizontal and vertical scaling?](/interview-question/what-is-the-difference-between-horizontal-and-vertical-scaling)), read replicas or a cache for read load ([When do you use a read replica vs a cache?](/interview-question/when-do-you-use-a-read-replica-vs-a-cache)), better indexes, and archiving cold rows. Shard when writes or data size will outgrow the largest single machine you can run reliably, and do it before you are in an emergency, because moving live data takes months.

## 10. Verified: Running the Code

The example **"Range vs hash sharding on one workload: hot shard, celebrity key, scatter-gather, resharding cost, capacity"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Users 1..12000 on 4 shards. Share of traffic per shard (s0 s1 s2 s3):
1) 20000 writes, all from the 3000 newest users:
  range by id      0.0%   0.0%   0.0% 100.0%   busiest 100.0%
  hash of id      25.1%  25.2%  25.8%  23.7%   busiest 25.8%
2) 20000 reads, 30% of them for one celebrity, user 777:
  hash of id      17.4%  17.3%  17.9%  47.2%   busiest 47.2%
3) Shards a query must touch:
  get user 4217:            range 1, hash 1
  users with id 5000-5999:  range 1, hash 4
4) Grow from 4 to 6 physical databases:
  hash % N (4 -> 6):        8007 of 12000 users move (66.7%)
  48 logical shards:        16 logical shards copied whole, 3996 of 12000 users move (33.3%)
  logical shards per host after: 8 8 8 8 8 8
5) Capacity estimate (assumptions in the doc):
  data 10 TB / 2 TB per shard = 5 shards; peak 30000 writes/s / 5000 per shard = 6 shards
  need max(5, 6) = 6 shards today; with 2x headroom plan 12
~~~

The core of the comparison is two one-line mapping functions applied to the same user IDs:

~~~js
const byRange = (id) => Math.floor((id - 1) / (USERS / SHARDS)); // ids 1-3000 -> 0, 3001-6000 -> 1, ...
const byHash = (id) => h32("user:" + id) % SHARDS;
~~~

What the simulation stands for and leaves out: shards are array slots and "traffic" is a count of requests per slot, so there is no network, no replication and no data copy. The hash is FNV-1a with the murmur3 finalizer, chosen so every language prints the same numbers; production systems use MurmurHash3, xxHash or similar. The capacity inputs are assumptions, not benchmarks.

## Edge Cases Worth Knowing

- **Tenants of very different sizes.** Sharding by \`tenant_id\` puts your largest customer on one shard. Directory sharding lets you give it a dedicated shard.
- **Time-series data.** Sharding by timestamp alone makes today the hot shard. Combine a hash of the source with the time bucket.
- **Unique constraints.** A \`UNIQUE(email)\` constraint cannot be enforced across shards by the database; enforce it through a separate table sharded by email.
- **Moving data while it is written.** Resharding needs a copy, a catch-up from the change log, a short write freeze or dual write, and a cut-over of the router map.

## Common Pitfalls

- **Sharding on an auto-increment ID or timestamp with range sharding.** In the run every write landed on the last shard.
- **Picking a key that no query uses.** Then every query is scatter-gather and sharding made reads slower.
- **Using \`hash % N\` with no plan for N to change.** Going from 4 to 6 moved two thirds of the rows.
- **Assuming hash sharding fixes hot keys.** One celebrity key still pinned 47.2% of reads on one shard.
- **Splitting data that is updated together.** Orders on one shard and their payments on another turns every checkout into a distributed transaction.
- **Sharding too early.** A single well-indexed Postgres or MySQL instance handles more than most products ever need.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Sharding splits the <strong style="color:#ffca28;">rows</strong> of one table across independent databases; each shard owns a subset and is its only writer, so it scales <strong style="color:#ffca28;">writes and storage</strong>, which read replicas cannot.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Shard key:</strong> <span style="color:#f0e2c8;">The key decides everything: high cardinality, even spread, and present in the main queries so they hit <strong style="color:#ffca28;">one shard</strong>. Co-locate rows that change together, such as a user with their orders.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Strategies:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Range</strong> keeps scans local but a monotonic key made one shard take 100% of writes in my run; <strong style="color:#ffca28;">hash</strong> spread them to 25.8% at most but turns range queries into <strong style="color:#ffca28;">scatter-gather</strong> over all shards; a <strong style="color:#ffca28;">directory</strong> maps keys explicitly and handles giant tenants.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Costs:</strong> <span style="color:#f0e2c8;">Cross-shard joins and transactions, global unique IDs and constraints, hot keys that no scheme fixes, and N times the operational work.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Growth:</strong> <span style="color:#f0e2c8;">Never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash % N</code> alone: 4 to 6 databases moved 66.7% of rows. Use fixed <strong style="color:#ffca28;">logical shards</strong> mapped to hosts (Notion: 480 on 32 databases) or consistent hashing, so only a third of the data moves.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is sharding different from partitioning and replication?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Partitioning splits a table into pieces; sharding is partitioning where the pieces live on <strong style="color:#ffca28;">different servers</strong>. Replication copies the whole dataset for availability and read scale. Real systems do both: each shard is a primary with replicas.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you pick the shard key for an e-commerce orders table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user_id</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tenant_id</code> for B2B): high cardinality, present in almost every query, and it co-locates a user with their orders and payments. Order-by-date reports then become scatter-gather, which is fine for an analytics replica or warehouse.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">One celebrity account is melting its shard. What do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Hashing cannot help one key. Cache its reads, add replicas to that shard, or split the key with a suffix so writes spread over several shards and reads merge them. Directory sharding can also move that one key to dedicated hardware.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add shards without downtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Copy the logical shards that move to the new host, stream the changes made during the copy from the change log, briefly pause writes to those shards, switch the router map, and resume. Logical shards make this a copy of whole units with no re-hashing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you query by a field that is not the shard key, like email?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a lookup table sharded by email that stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">email -&gt; user_id</code>, then read the user from its shard. That is two single-shard reads instead of one scatter-gather.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Sharding (horizontal partitioning) | Splitting the rows of a table across independent database servers |
| Shard key (partition key) | The column whose value decides which shard owns a row |
| Range sharding | Assigning contiguous key ranges to shards |
| Hash sharding | Assigning rows by a hash of the key |
| Directory-based sharding | An explicit map from key or tenant to shard |
| Hot shard (hotspot) | A shard receiving far more than its share of traffic |
| Hot key (celebrity problem) | One key so busy that its shard overloads under any scheme |
| Scatter-gather | Sending a query to all shards and merging the results |
| Co-location | Giving related rows the same shard key so they live together |
| Logical shards (virtual shards) | A fixed, large number of partitions mapped onto fewer physical hosts |

**Conclusion:** Sharding is how a database grows past one machine for writes and storage: split the rows by a shard key and give each shard sole ownership of its slice. The choice of key decides whether queries stay on one shard, whether load is even, and which operations become distributed. Range sharding keeps scans cheap but heats the newest range; hashing evens load but scatters range queries; neither fixes a single hot key. Plan for growth from the start with logical shards or consistent hashing so adding hardware moves only the data that has to move, and do not shard at all until simpler scaling steps are exhausted.`,
    examples: [
      {
        label: `Range vs hash sharding on one workload: hot shard, celebrity key, scatter-gather, resharding cost, capacity`,
        variants: [
          { tech: "node", code: `// Sharding a users table four ways: range vs hash on the same workload, a hot key,
// and what resharding costs with hash % N versus fixed logical shards.
function h32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
const pct = (num, den) => { const v = Math.floor((num * 1000) / den); return Math.floor(v / 10) + "." + (v % 10) + "%"; };
const USERS = 12000, SHARDS = 4;
const byRange = (id) => Math.floor((id - 1) / (USERS / SHARDS)); // ids 1-3000 -> 0, 3001-6000 -> 1, ...
const byHash = (id) => h32("user:" + id) % SHARDS;
const row = (label, counts, total) => console.log(\`  \${label.padEnd(14)}\` + counts.map((c) => pct(c, total).padStart(7)).join("") + \`   busiest \${pct(Math.max(...counts), total)}\`);
const tally = (ids, f) => { const c = new Array(SHARDS).fill(0); for (const id of ids) c[f(id)]++; return c; };

console.log("Users 1..12000 on 4 shards. Share of traffic per shard (s0 s1 s2 s3):");
const writes = []; for (let i = 0; i < 20000; i++) writes.push(9001 + ((i * 7919) % 3000)); // newest users are the active ones
console.log("1) 20000 writes, all from the 3000 newest users:");
row("range by id", tally(writes, byRange), writes.length);
row("hash of id", tally(writes, byHash), writes.length);

const reads = []; for (let i = 0; i < 20000; i++) reads.push(i % 10 < 3 ? 777 : 1 + ((i * 104729) % USERS));
console.log("2) 20000 reads, 30% of them for one celebrity, user 777:");
row("hash of id", tally(reads, byHash), reads.length);

const touched = (ids, f) => new Set(ids.map(f)).size;
const scan = []; for (let id = 5000; id <= 5999; id++) scan.push(id);
console.log("3) Shards a query must touch:");
console.log(\`  get user 4217:            range \${touched([4217], byRange)}, hash \${touched([4217], byHash)}\`);
console.log(\`  users with id 5000-5999:  range \${touched(scan, byRange)}, hash \${touched(scan, byHash)}\`);

console.log("4) Grow from 4 to 6 physical databases:");
let modMoved = 0; for (let id = 1; id <= USERS; id++) { const h = h32("user:" + id); if (h % 4 !== h % 6) modMoved++; }
console.log(\`  hash % N (4 -> 6):        \${modMoved} of \${USERS} users move (\${pct(modMoved, USERS)})\`);
const LOGICAL = 48;
const before = []; for (let l = 0; l < LOGICAL; l++) before.push(Math.floor(l / 12)); // 12 logical shards per host
const after = before.slice(); let n = 0;
for (let host = 0; host < 4; host++) for (let j = 8; j < 12; j++) after[host * 12 + j] = 4 + (n++ % 2); // hand 4 from each host to the new ones
let logicalMoved = 0, shardsMoved = 0;
for (let l = 0; l < LOGICAL; l++) if (before[l] !== after[l]) shardsMoved++;
for (let id = 1; id <= USERS; id++) { const l = h32("user:" + id) % LOGICAL; if (before[l] !== after[l]) logicalMoved++; }
const perHost = new Array(6).fill(0); for (const h of after) perHost[h]++;
console.log(\`  48 logical shards:        \${shardsMoved} logical shards copied whole, \${logicalMoved} of \${USERS} users move (\${pct(logicalMoved, USERS)})\`);
console.log(\`  logical shards per host after: \${perHost.join(" ")}\`);

console.log("5) Capacity estimate (assumptions in the doc):");
const usersM = 200, ordersPerUser = 50, rowBytes = 1000, peakWrites = 30000;
const dataTB = Math.floor((usersM * 1000000 * ordersPerUser * rowBytes) / 1e12);
const perShardTB = 2, perShardWrites = 5000;
const byData = Math.ceil(dataTB / perShardTB), byWrites = Math.ceil(peakWrites / perShardWrites);
console.log(\`  data \${dataTB} TB / \${perShardTB} TB per shard = \${byData} shards; peak \${peakWrites} writes/s / \${perShardWrites} per shard = \${byWrites} shards\`);
console.log(\`  need max(\${byData}, \${byWrites}) = \${Math.max(byData, byWrites)} shards today; with 2x headroom plan \${2 * Math.max(byData, byWrites)}\`);` },
          { tech: "python", code: `# Sharding a users table four ways: range vs hash on the same workload, a hot key,
# and what resharding costs with hash % N versus fixed logical shards.
M = 0xFFFFFFFF


def h32(s):
    h = 0x811C9DC5
    for ch in s.encode():
        h ^= ch
        h = (h * 0x01000193) & M
    h ^= h >> 16
    h = (h * 0x85EBCA6B) & M
    h ^= h >> 13
    h = (h * 0xC2B2AE35) & M
    h ^= h >> 16
    return h


def pct(num, den):
    v = num * 1000 // den
    return f"{v // 10}.{v % 10}%"


USERS, SHARDS = 12000, 4
by_range = lambda i: (i - 1) // (USERS // SHARDS)  # ids 1-3000 -> 0, 3001-6000 -> 1, ...
by_hash = lambda i: h32(f"user:{i}") % SHARDS


def row(label, counts, total):
    print(f"  {label:<14}" + "".join(f"{pct(c, total):>7}" for c in counts) + f"   busiest {pct(max(counts), total)}")


def tally(ids, f):
    c = [0] * SHARDS
    for i in ids:
        c[f(i)] += 1
    return c


print("Users 1..12000 on 4 shards. Share of traffic per shard (s0 s1 s2 s3):")
writes = [9001 + (i * 7919) % 3000 for i in range(20000)]  # newest users are the active ones
print("1) 20000 writes, all from the 3000 newest users:")
row("range by id", tally(writes, by_range), len(writes))
row("hash of id", tally(writes, by_hash), len(writes))

reads = [777 if i % 10 < 3 else 1 + (i * 104729) % USERS for i in range(20000)]
print("2) 20000 reads, 30% of them for one celebrity, user 777:")
row("hash of id", tally(reads, by_hash), len(reads))

touched = lambda ids, f: len({f(i) for i in ids})
scan = list(range(5000, 6000))
print("3) Shards a query must touch:")
print(f"  get user 4217:            range {touched([4217], by_range)}, hash {touched([4217], by_hash)}")
print(f"  users with id 5000-5999:  range {touched(scan, by_range)}, hash {touched(scan, by_hash)}")

print("4) Grow from 4 to 6 physical databases:")
mod_moved = sum(1 for i in range(1, USERS + 1) if h32(f"user:{i}") % 4 != h32(f"user:{i}") % 6)
print(f"  hash % N (4 -> 6):        {mod_moved} of {USERS} users move ({pct(mod_moved, USERS)})")
LOGICAL = 48
before = [l // 12 for l in range(LOGICAL)]  # 12 logical shards per host
after = before[:]
n = 0
for host in range(4):
    for j in range(8, 12):  # hand 4 from each host to the new ones
        after[host * 12 + j] = 4 + n % 2
        n += 1
shards_moved = sum(1 for l in range(LOGICAL) if before[l] != after[l])
logical_moved = sum(1 for i in range(1, USERS + 1) if before[h32(f"user:{i}") % LOGICAL] != after[h32(f"user:{i}") % LOGICAL])
per_host = [after.count(h) for h in range(6)]
print(f"  48 logical shards:        {shards_moved} logical shards copied whole, {logical_moved} of {USERS} users move ({pct(logical_moved, USERS)})")
print("  logical shards per host after: " + " ".join(str(x) for x in per_host))

print("5) Capacity estimate (assumptions in the doc):")
users_m, orders_per_user, row_bytes, peak_writes = 200, 50, 1000, 30000
data_tb = users_m * 1000000 * orders_per_user * row_bytes // 10**12
per_shard_tb, per_shard_writes = 2, 5000
by_data = -(-data_tb // per_shard_tb)
by_writes = -(-peak_writes // per_shard_writes)
print(f"  data {data_tb} TB / {per_shard_tb} TB per shard = {by_data} shards; peak {peak_writes} writes/s / {per_shard_writes} per shard = {by_writes} shards")
print(f"  need max({by_data}, {by_writes}) = {max(by_data, by_writes)} shards today; with 2x headroom plan {2 * max(by_data, by_writes)}")` },
        ],
      },
    ],
  },
  {
    title: `What is consistent hashing?`,
    difficulty: "medium",
    seoDescription: `Consistent hashing from zero: why hash mod N reshuffles almost every key, how the hash ring works, measured key movement, and where it is used.`,
    description: `**Question presented to candidate:**
"We spread cache keys over servers with \`hash(key) % N\`. Every time we add or lose a server, the hit rate collapses. What is consistent hashing, how does it fix this, and what problem does it still have?"

**What a strong answer should cover:**
- Why \`hash % N\` breaks: changing N changes the remainder for most keys, about **N/(N+1)** of them when one server is added
- The **hash ring**: servers and keys are hashed onto the same circular space; a key belongs to the **first server clockwise**
- Adding or removing a server moves only the keys on **one arc**, on average **1/N** of them, and they move only to or from that server
- Lookup is a **binary search** over sorted server positions, O(log n)
- The remaining problem: with one position per server, arcs are very **uneven**; the standard fix is **virtual nodes**
- Where it is used: distributed caches, Dynamo-style stores (Dynamo, Cassandra), and load balancers that need sticky placement

**Code / implementation expected:** Optional — a ring with a sorted array and binary search is a common whiteboard ask; the example measures movement against \`hash % N\`.`,
    answer: `**Target Audience:** Beginners to system design who know what a hash function and a cache are; no distributed-systems background assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). History is cited from Karger et al., STOC 1997; system usage from the Dynamo paper (SOSP 2007) and the Apache Cassandra documentation.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Numbers come from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A school puts students into lockers by a simple rule: take the student number, divide by the number of locker rooms, and the remainder is your room. With 4 rooms, student 13 goes to room 1. It works perfectly until the school builds a fifth room. Now student 13 belongs in room 3, and so does nearly everyone else. Four out of five students have to carry everything to a different room on the same morning.

Now picture a round corridor with locker rooms along it. Each student also has a spot on the corridor, fixed by their number, and uses the first room they reach walking clockwise. When a new room is built, only the students between the new room and the previous room walk to it. Everyone else stays put.

In a cache, "carrying your things to another room" means a **cache miss**: the key is looked up on a server that does not have it, and the request falls through to the database. Moving 80% of keys at once can take the database down. Consistent hashing is the round corridor.

## 2. The Problem With \`hash(key) % N\`

📌 **Interview term: modulo hashing** — placing a key on server \`hash(key) % N\`. Load spreads evenly, but the mapping depends on N. When N becomes N+1, a key keeps its server only if both remainders happen to be equal, which is true for about 1 key in N+1. So adding one server to four moves about **80%** of keys, and removing one of four moves about **75%**.

That is fine for a fixed set of servers that never changes. It is a disaster for a cache cluster that scales up and down, or where servers fail.

## 3. The Hash Ring

Take the full range of a 32-bit hash, 0 to 2^32 − 1, and bend it into a circle so the largest value sits next to 0.

1. Hash each **server** name (for example \`"node-A"\`) to a position on the circle.
2. Hash each **key** to a position on the same circle.
3. A key belongs to the **first server at or after its position**, walking clockwise; past the top, wrap around to the start.

📌 **Interview term: consistent hashing** — a scheme where both keys and servers are hashed onto the same circular space and each key is owned by the next server clockwise. Introduced by Karger, Lehman, Leighton, Levine, Lewin and Panigrahy in "Consistent Hashing and Random Trees" (STOC 1997) to spread web caching load without hot spots.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 340" role="img" aria-label="A hash ring with four servers; key k sits between A and B and belongs to B, the first server clockwise">
  <defs>
    <marker id="sd06q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <circle class="d-edge" cx="360" cy="170" r="110" fill="none"/>
  <circle class="d-box-accent" cx="360" cy="60" r="22"/>
  <text class="d-text" x="360" y="65" text-anchor="middle">A</text>
  <circle class="d-box-accent" cx="470" cy="170" r="22"/>
  <text class="d-text" x="470" y="175" text-anchor="middle">B</text>
  <circle class="d-box-accent" cx="360" cy="280" r="22"/>
  <text class="d-text" x="360" y="285" text-anchor="middle">C</text>
  <circle class="d-box-accent" cx="250" cy="170" r="22"/>
  <text class="d-text" x="250" y="175" text-anchor="middle">D</text>
  <circle class="d-box" cx="438" cy="92" r="7"/>
  <text class="d-sub" x="520" y="78">key k</text>
  <path class="d-edge-accent" d="M 447 102 A 110 110 0 0 1 467 143" fill="none" marker-end="url(#sd06q2-arrow)"/>
  <text class="d-sub" x="360" y="165" text-anchor="middle">positions 0 to 2^32</text>
  <text class="d-sub" x="360" y="190" text-anchor="middle">clockwise</text>
</svg>

Key k hashes to a point between A and B. Walking clockwise, the first server it meets is B, so B owns it. Every key on the arc from A to B belongs to B.

📌 **Interview term: token (ring position)** — the point on the ring where a server sits. A server owns the arc that ends at its token and starts just after the previous server token.

### Looking a key up

Keep the server tokens in a **sorted array**. To find a key, hash it and binary-search for the first token greater than or equal to the hash; if you run off the end, use the first token. That is O(log n) for n tokens:

~~~js
function owner(ring, hk) { // first node clockwise at or after the key position
  let lo = 0, hi = ring.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ring[mid][0] < hk) lo = mid + 1; else hi = mid; }
  return ring[lo === ring.length ? 0 : lo][1];
}
~~~

## 4. Adding and Removing a Server

When server E joins, it lands somewhere on the ring, say between A and B. Only the keys on the arc from A to E change owner, and they all move **to E**. Nothing else moves, because no other server boundary changed.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 340" role="img" aria-label="Server E joins between A and B; only the keys on the arc from A to E move, and they move to E">
  <circle class="d-edge" cx="360" cy="170" r="110" fill="none"/>
  <path class="d-edge-accent" d="M 383 62 A 110 110 0 0 1 420 78" fill="none" stroke-width="6"/>
  <circle class="d-box" cx="360" cy="60" r="22"/>
  <text class="d-text" x="360" y="65" text-anchor="middle">A</text>
  <circle class="d-box-accent" cx="438" cy="92" r="22"/>
  <text class="d-text" x="438" y="97" text-anchor="middle">E</text>
  <circle class="d-box" cx="470" cy="170" r="22"/>
  <text class="d-text" x="470" y="175" text-anchor="middle">B</text>
  <circle class="d-box" cx="360" cy="280" r="22"/>
  <text class="d-text" x="360" y="285" text-anchor="middle">C</text>
  <circle class="d-box" cx="250" cy="170" r="22"/>
  <text class="d-text" x="250" y="175" text-anchor="middle">D</text>
  <text class="d-accent" x="500" y="60">this arc moves to E</text>
</svg>

When a server leaves, its arc is absorbed by the next server clockwise. Again only that one arc moves.

📌 **Interview term: minimal disruption (monotonicity)** — the property that a membership change moves only the keys that must move: keys move to a new server, or away from a removed one, never between two servers that did not change. On average that is **K/N** keys for K keys and N servers.

## 5. Measured: Ring vs Modulo

The example hashes 10,000 keys onto four servers with one token each, then adds node-E and, separately, removes node-B:

~~~text
Add node-E (4 -> 5 nodes):
  hash % N       moved  7961 of 10000 keys (79.61%)
  hash ring      moved   663 of 10000 keys (6.63%)
  ring keys moved to: node-E=663

Remove node-B (4 -> 3 nodes):
  hash % N       moved  7474 of 10000 keys (74.74%)
  hash ring      moved  1013 of 10000 keys (10.13%)
  ring keys moved to: node-D=1013
~~~

- **Modulo moved 79.61%** of keys when a fifth server was added and **74.74%** when one was removed, matching the 80% and 75% from the arithmetic above.
- **The ring moved 6.63%** on the join, every one of them to node-E, and **10.13%** on the removal, every one of them to node-D, the next server clockwise from node-B.

For a cache, that is the difference between a hit rate that dips slightly and one that falls to about 20%.

## 6. The Catch: One Token per Server Is Very Uneven

The same run shows where each server landed:

~~~text
Ring with one position per node:
  node-C at 17.42% of the ring, owns arc 60.08%, keys 5997
  node-B at 27.75% of the ring, owns arc 10.32%, keys 1013
  node-D at 55.63% of the ring, owns arc 27.87%, keys 2820
  node-A at 57.34% of the ring, owns arc  1.71%, keys 170
~~~

Four servers should own 25% each. Instead node-C owns **60.08%** of the ring and 5,997 of the keys, while node-A owns **1.71%** and 170 keys. The positions are random, and with only four random points the gaps between them are wildly unequal. It also explains the join: node-E happened to land on a short arc, so it took only 6.63% instead of a fair 20%.

The same unevenness hurts on failure: when node-B died, all of its keys went to **one** neighbour, node-D, which suddenly carried its own load plus node-B's.

📌 **Interview term: virtual nodes (vnodes)** — giving each physical server many tokens on the ring (tens to hundreds), so its share is the sum of many small arcs and evens out. It also spreads a failed server's keys over many neighbours. This is the standard fix, measured in detail in [What is consistent hashing with virtual nodes and when do you need it?](/interview-question/what-is-consistent-hashing-with-virtual-nodes-and-when-do-you-need-it).

## 7. Where It Is Used

- **Distributed caches.** Client libraries place keys on cache servers with a ring so a server change costs only its share of misses. See [How would you design a distributed cache?](/interview-question/how-would-you-design-a-distributed-cache).
- **Dynamo-style databases.** Amazon Dynamo (SOSP 2007) partitions keys with consistent hashing over virtual nodes and replicates each key on N nodes taken from the ring, with N, R and W tunable; Apache Cassandra assigns tokens on a ring in the same way. See [How would you design a distributed key-value store?](/interview-question/how-would-you-design-a-distributed-key-value-store).
- **Sharding with frequent membership changes.** For a database with rare, planned growth, fixed logical shards are often simpler; see [What is database sharding?](/interview-question/what-is-database-sharding).

It is not the only consistent mapping. **Rendezvous (highest-random-weight) hashing** gives each key a score per server and picks the highest, with no ring at all, and Google's **jump consistent hash** (Lamping and Veach, 2014) needs no memory but only works for numbered buckets. The trade-offs are compared in [Consistent hashing vs rendezvous (HRW) hashing — which for what scale?](/interview-question/consistent-hashing-vs-rendezvous-hrw-hashing-which-for-what-scale).

## 8. Verified: Running the Code

The example **"A consistent hashing ring vs hash % N: keys moved when a node joins or leaves"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and \`javac Main.java && java Main\` (Java 21). All four print exactly this:

~~~text
Ring with one position per node:
  node-C at 17.42% of the ring, owns arc 60.08%, keys 5997
  node-B at 27.75% of the ring, owns arc 10.32%, keys 1013
  node-D at 55.63% of the ring, owns arc 27.87%, keys 2820
  node-A at 57.34% of the ring, owns arc  1.71%, keys 170

Add node-E (4 -> 5 nodes):
  hash % N       moved  7961 of 10000 keys (79.61%)
  hash ring      moved   663 of 10000 keys (6.63%)
  ring keys moved to: node-E=663

Remove node-B (4 -> 3 nodes):
  hash % N       moved  7474 of 10000 keys (74.74%)
  hash ring      moved  1013 of 10000 keys (10.13%)
  ring keys moved to: node-D=1013
~~~

What the simulation stands for and leaves out: servers are names and "moving a key" means its owner changed; no data is copied. The hash is FNV-1a with the murmur3 finalizer, written out in each language so all four print the same positions (production rings typically use MurmurHash3 or MD5-derived tokens). The node positions depend on the hash, so another hash gives different arcs, but the same pattern: very uneven arcs with one token per server.

## Edge Cases Worth Knowing

- **Wrap-around.** A key hashing past the last token belongs to the first token. Forgetting this sends the top slice of the ring nowhere.
- **Hash collisions between tokens.** Two tokens at the same position need a deterministic tie-break (for example by server name), or different clients disagree on the owner.
- **Clients must agree on membership.** If two clients have different server lists, they map the same key differently. Membership comes from one source: a config service, gossip, or a coordinator.
- **Replicas.** To store a key on 3 servers, walk clockwise and take the next 3 **distinct physical** servers; with virtual nodes, consecutive tokens may belong to the same machine.
- **Movement is not free.** Even the minimal 1/N of keys must be copied (for a database) or re-warmed (for a cache); throttle it.

## Common Pitfalls

- **Saying consistent hashing balances load.** It minimises movement. With one token per server the run gave one server 60.08% of the ring and another 1.71%.
- **Forgetting virtual nodes.** Without them, a failed server dumps its whole load on one neighbour, as node-B did onto node-D.
- **Using a weak or language-specific hash.** \`String.hashCode\` or a per-process randomised hash makes clients in different languages, or different processes, disagree.
- **Recomputing the ring on every request.** Build the sorted token array once per membership change, then binary-search it.
- **Claiming zero data moves.** The fair share, about 1/N of the keys, still moves on every change.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash % N</code>, changing N changes the remainder for most keys: about N/(N+1) of them. In my run, adding a fifth server moved <strong style="color:#ffca28;">79.61%</strong> of keys, so a cache cluster would lose most of its hits at once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The ring:</strong> <span style="color:#f0e2c8;">Hash servers and keys onto the same circle, 0 to 2^32. A key belongs to the <strong style="color:#ffca28;">first server clockwise</strong>; lookup is a binary search over the sorted server tokens.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it helps:</strong> <span style="color:#f0e2c8;">A join or leave changes one boundary, so only one arc moves, on average <strong style="color:#ffca28;">1/N</strong> of the keys, and only to or from that server. The same run moved <strong style="color:#ffca28;">6.63%</strong>, all to the new node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The catch:</strong> <span style="color:#f0e2c8;">One random token per server gives very uneven arcs: one server owned 60% of the ring, another under 2%, and a failure dumps everything on one neighbour. <strong style="color:#ffca28;">Virtual nodes</strong> fix that.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Where:</strong> <span style="color:#f0e2c8;">Distributed caches, Dynamo and Cassandra partitioning, and placement anywhere servers come and go. Alternatives: rendezvous hashing, jump hash for numbered buckets.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you implement the lookup efficiently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the tokens in a sorted array, hash the key, and binary-search for the first token at or after it, wrapping to index 0. That is O(log n) per lookup, and the array is rebuilt only when membership changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many keys move when you add a server, exactly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The keys on the arc between the new server and its predecessor. On average that is K/N, but with one token per server the arc can be tiny or huge; in the run it was 6.63% instead of a fair 20%. Virtual nodes make it close to the average.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you place 3 replicas of a key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk clockwise from the key and take the next 3 distinct physical servers, skipping extra tokens of a server already chosen, so a single machine never holds two copies.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if two clients have different server lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They compute different owners for the same keys, so writes and reads go to different places. Membership must come from one source of truth, such as a config service or gossip, and changes must propagate quickly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is consistent hashing a good fit for sharding a relational database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works, but database growth is rare and planned, so many teams use a fixed number of logical shards mapped to hosts, which is easier to reason about and to move. Consistent hashing shines where membership changes often, like caches and leaderless stores.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Modulo hashing | Placing a key on server \`hash(key) % N\`; most keys move when N changes |
| Consistent hashing | Keys and servers hashed onto one ring; a key belongs to the next server clockwise |
| Token (ring position) | The point on the ring where a server sits |
| Minimal disruption (monotonicity) | Only keys that must move do move, about K/N per change |
| Virtual nodes (vnodes) | Many tokens per physical server to even out arcs and spread failures |

**Conclusion:** Consistent hashing solves one specific problem: placing keys on a changing set of servers without reshuffling them all. By hashing servers and keys onto the same ring and giving each key to the next server clockwise, a membership change moves only one arc of keys instead of most of them, as the run showed with 6.63% moved against 79.61% for modulo hashing. It does not by itself balance load: with one token per server the arcs are badly uneven, which is why every real deployment adds virtual nodes. Know the ring, the binary-search lookup, the 1/N movement claim and its caveat, and you can answer the question and its follow-ups.`,
    examples: [
      {
        label: `A consistent hashing ring vs hash % N: keys moved when a node joins or leaves`,
        variants: [
          { tech: "node", code: `// Consistent hashing ring vs hash(key) % N: how many keys move when a node joins or leaves.
// Hash: FNV-1a 32-bit plus the murmur3 finalizer, so every language gets the same numbers.
function h32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
const RING = 4294967296; // 2^32 positions
const pct = (num, den) => { const v = Math.floor((num * 10000) / den); return Math.floor(v / 100) + "." + String(v % 100).padStart(2, "0") + "%"; };

function buildRing(nodes) {
  return nodes.map((n) => [h32(n), n]).sort((a, b) => a[0] - b[0]);
}
function owner(ring, hk) { // first node clockwise at or after the key position
  let lo = 0, hi = ring.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ring[mid][0] < hk) lo = mid + 1; else hi = mid; }
  return ring[lo === ring.length ? 0 : lo][1];
}
const keys = []; for (let i = 0; i < 10000; i++) keys.push("user:" + i);
const hashes = keys.map(h32);

const four = ["node-A", "node-B", "node-C", "node-D"];
const ring4 = buildRing(four);
console.log("Ring with one position per node:");
for (let i = 0; i < ring4.length; i++) {
  const [pos, name] = ring4[i];
  const prev = ring4[(i + ring4.length - 1) % ring4.length][0];
  const arc = (pos - prev + RING) % RING;
  const count = hashes.filter((hk) => owner(ring4, hk) === name).length;
  console.log(\`  \${name} at \${pct(pos, RING).padStart(6)} of the ring, owns arc \${pct(arc, RING).padStart(6)}, keys \${count}\`);
}

function compare(label, before, after, nodesBefore, nodesAfter) {
  const ringB = buildRing(before), ringA = buildRing(after);
  let ringMoved = 0, modMoved = 0; const dest = {};
  for (const hk of hashes) {
    const a = owner(ringB, hk), b = owner(ringA, hk);
    if (a !== b) { ringMoved++; dest[b] = (dest[b] || 0) + 1; }
    if (nodesBefore[hk % nodesBefore.length] !== nodesAfter[hk % nodesAfter.length]) modMoved++;
  }
  console.log(\`\\n\${label}\`);
  console.log(\`  hash % N       moved \${String(modMoved).padStart(5)} of 10000 keys (\${pct(modMoved, 10000)})\`);
  console.log(\`  hash ring      moved \${String(ringMoved).padStart(5)} of 10000 keys (\${pct(ringMoved, 10000)})\`);
  console.log("  ring keys moved to: " + Object.keys(dest).sort().map((k) => \`\${k}=\${dest[k]}\`).join(", "));
}
compare("Add node-E (4 -> 5 nodes):", four, [...four, "node-E"], four, [...four, "node-E"]);
compare("Remove node-B (4 -> 3 nodes):", four, ["node-A", "node-C", "node-D"], four, ["node-A", "node-C", "node-D"]);` },
          { tech: "python", code: `# Consistent hashing ring vs hash(key) % N: how many keys move when a node joins or leaves.
# Hash: FNV-1a 32-bit plus the murmur3 finalizer, so every language gets the same numbers.
import bisect

M = 0xFFFFFFFF


def h32(s):
    h = 0x811C9DC5
    for ch in s.encode():
        h ^= ch
        h = (h * 0x01000193) & M
    h ^= h >> 16
    h = (h * 0x85EBCA6B) & M
    h ^= h >> 13
    h = (h * 0xC2B2AE35) & M
    h ^= h >> 16
    return h


RING = 4294967296  # 2^32 positions


def pct(num, den):
    v = num * 10000 // den
    return f"{v // 100}.{v % 100:02d}%"


def build_ring(nodes):
    return sorted((h32(n), n) for n in nodes)


def owner(ring, positions, hk):  # first node clockwise at or after the key position
    i = bisect.bisect_left(positions, hk)
    return ring[0 if i == len(ring) else i][1]


hashes = [h32(f"user:{i}") for i in range(10000)]

four = ["node-A", "node-B", "node-C", "node-D"]
ring4 = build_ring(four)
pos4 = [p for p, _ in ring4]
print("Ring with one position per node:")
for i, (pos, name) in enumerate(ring4):
    prev = ring4[(i + len(ring4) - 1) % len(ring4)][0]
    arc = (pos - prev + RING) % RING
    count = sum(1 for hk in hashes if owner(ring4, pos4, hk) == name)
    print(f"  {name} at {pct(pos, RING):>6} of the ring, owns arc {pct(arc, RING):>6}, keys {count}")


def compare(label, before, after):
    rb, ra = build_ring(before), build_ring(after)
    pb, pa = [p for p, _ in rb], [p for p, _ in ra]
    ring_moved = mod_moved = 0
    dest = {}
    for hk in hashes:
        a, b = owner(rb, pb, hk), owner(ra, pa, hk)
        if a != b:
            ring_moved += 1
            dest[b] = dest.get(b, 0) + 1
        if before[hk % len(before)] != after[hk % len(after)]:
            mod_moved += 1
    print(f"\\n{label}")
    print(f"  hash % N       moved {mod_moved:>5} of 10000 keys ({pct(mod_moved, 10000)})")
    print(f"  hash ring      moved {ring_moved:>5} of 10000 keys ({pct(ring_moved, 10000)})")
    print("  ring keys moved to: " + ", ".join(f"{k}={dest[k]}" for k in sorted(dest)))


compare("Add node-E (4 -> 5 nodes):", four, four + ["node-E"])
compare("Remove node-B (4 -> 3 nodes):", four, ["node-A", "node-C", "node-D"])` },
          { tech: "go", code: `// Consistent hashing ring vs hash(key) % N: how many keys move when a node joins or leaves.
// Hash: FNV-1a 32-bit plus the murmur3 finalizer, so every language gets the same numbers.
package main

import (
	"fmt"
	"sort"
	"strings"
)

func h32(s string) uint32 {
	h := uint32(0x811c9dc5)
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 0x01000193
	}
	h ^= h >> 16
	h *= 0x85ebca6b
	h ^= h >> 13
	h *= 0xc2b2ae35
	h ^= h >> 16
	return h
}

const RING = uint64(4294967296) // 2^32 positions

func pct(num, den uint64) string {
	v := num * 10000 / den
	return fmt.Sprintf("%d.%02d%%", v/100, v%100)
}

type point struct {
	pos  uint32
	name string
}

func buildRing(nodes []string) []point {
	r := []point{}
	for _, n := range nodes {
		r = append(r, point{h32(n), n})
	}
	sort.Slice(r, func(a, b int) bool { return r[a].pos < r[b].pos })
	return r
}

// first node clockwise at or after the key position
func owner(ring []point, hk uint32) string {
	i := sort.Search(len(ring), func(i int) bool { return ring[i].pos >= hk })
	if i == len(ring) {
		i = 0
	}
	return ring[i].name
}

var hashes []uint32

func compare(label string, before, after []string) {
	rb, ra := buildRing(before), buildRing(after)
	ringMoved, modMoved := 0, 0
	dest := map[string]int{}
	for _, hk := range hashes {
		a, b := owner(rb, hk), owner(ra, hk)
		if a != b {
			ringMoved++
			dest[b]++
		}
		if before[hk%uint32(len(before))] != after[hk%uint32(len(after))] {
			modMoved++
		}
	}
	fmt.Printf("\\n%s\\n", label)
	fmt.Printf("  hash %% N       moved %5d of 10000 keys (%s)\\n", modMoved, pct(uint64(modMoved), 10000))
	fmt.Printf("  hash ring      moved %5d of 10000 keys (%s)\\n", ringMoved, pct(uint64(ringMoved), 10000))
	names := []string{}
	for k := range dest {
		names = append(names, k)
	}
	sort.Strings(names)
	parts := []string{}
	for _, k := range names {
		parts = append(parts, fmt.Sprintf("%s=%d", k, dest[k]))
	}
	fmt.Println("  ring keys moved to: " + strings.Join(parts, ", "))
}

func main() {
	for i := 0; i < 10000; i++ {
		hashes = append(hashes, h32(fmt.Sprintf("user:%d", i)))
	}
	four := []string{"node-A", "node-B", "node-C", "node-D"}
	ring4 := buildRing(four)
	fmt.Println("Ring with one position per node:")
	for i, p := range ring4 {
		prev := ring4[(i+len(ring4)-1)%len(ring4)].pos
		arc := (uint64(p.pos) - uint64(prev) + RING) % RING
		count := 0
		for _, hk := range hashes {
			if owner(ring4, hk) == p.name {
				count++
			}
		}
		fmt.Printf("  %s at %6s of the ring, owns arc %6s, keys %d\\n", p.name, pct(uint64(p.pos), RING), pct(arc, RING), count)
	}
	compare("Add node-E (4 -> 5 nodes):", four, append(append([]string{}, four...), "node-E"))
	compare("Remove node-B (4 -> 3 nodes):", four, []string{"node-A", "node-C", "node-D"})
}` },
          { tech: "java", code: `// Consistent hashing ring vs hash(key) % N: how many keys move when a node joins or leaves.
// Hash: FNV-1a 32-bit plus the murmur3 finalizer, so every language gets the same numbers.
import java.util.*;

public class Main {
    static long h32(String s) {
        int h = 0x811c9dc5;
        for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h *= 0x01000193; }
        h ^= h >>> 16; h *= 0x85ebca6b; h ^= h >>> 13; h *= 0xc2b2ae35; h ^= h >>> 16;
        return Integer.toUnsignedLong(h);
    }

    static final long RING = 4294967296L; // 2^32 positions

    static String pct(long num, long den) {
        long v = num * 10000 / den;
        return String.format("%d.%02d%%", v / 100, v % 100);
    }

    record Point(long pos, String name) {}

    static List<Point> buildRing(List<String> nodes) {
        List<Point> r = new ArrayList<>();
        for (String n : nodes) r.add(new Point(h32(n), n));
        r.sort(Comparator.comparingLong(Point::pos));
        return r;
    }

    // first node clockwise at or after the key position
    static String owner(List<Point> ring, long hk) {
        int lo = 0, hi = ring.size();
        while (lo < hi) { int mid = (lo + hi) >>> 1; if (ring.get(mid).pos() < hk) lo = mid + 1; else hi = mid; }
        return ring.get(lo == ring.size() ? 0 : lo).name();
    }

    static long[] hashes = new long[10000];

    static void compare(String label, List<String> before, List<String> after) {
        List<Point> rb = buildRing(before), ra = buildRing(after);
        int ringMoved = 0, modMoved = 0;
        TreeMap<String, Integer> dest = new TreeMap<>();
        for (long hk : hashes) {
            String a = owner(rb, hk), b = owner(ra, hk);
            if (!a.equals(b)) { ringMoved++; dest.merge(b, 1, Integer::sum); }
            if (!before.get((int) (hk % before.size())).equals(after.get((int) (hk % after.size())))) modMoved++;
        }
        System.out.printf("%n%s%n", label);
        System.out.printf("  hash %% N       moved %5d of 10000 keys (%s)%n", modMoved, pct(modMoved, 10000));
        System.out.printf("  hash ring      moved %5d of 10000 keys (%s)%n", ringMoved, pct(ringMoved, 10000));
        List<String> parts = new ArrayList<>();
        for (var e : dest.entrySet()) parts.add(e.getKey() + "=" + e.getValue());
        System.out.println("  ring keys moved to: " + String.join(", ", parts));
    }

    public static void main(String[] args) {
        for (int i = 0; i < 10000; i++) hashes[i] = h32("user:" + i);
        List<String> four = List.of("node-A", "node-B", "node-C", "node-D");
        List<Point> ring4 = buildRing(four);
        System.out.println("Ring with one position per node:");
        for (int i = 0; i < ring4.size(); i++) {
            Point p = ring4.get(i);
            long prev = ring4.get((i + ring4.size() - 1) % ring4.size()).pos();
            long arc = (p.pos() - prev + RING) % RING;
            int count = 0;
            for (long hk : hashes) if (owner(ring4, hk).equals(p.name())) count++;
            System.out.printf("  %s at %6s of the ring, owns arc %6s, keys %d%n", p.name(), pct(p.pos(), RING), pct(arc, RING), count);
        }
        List<String> five = new ArrayList<>(four); five.add("node-E");
        compare("Add node-E (4 -> 5 nodes):", four, five);
        compare("Remove node-B (4 -> 3 nodes):", four, List.of("node-A", "node-C", "node-D"));
    }
}` },
        ],
      },
    ],
  },
  {
    title: `What is consistent hashing with virtual nodes and when do you need it?`,
    difficulty: "medium",
    seoDescription: `Virtual nodes in consistent hashing, measured: load balance at 1 to 1000 vnodes, spreading a failed node, weighting big servers, and the costs.`,
    description: `**Question presented to candidate:**
"You have a consistent hashing ring for a cache or a key-value store. Explain virtual nodes: what problem they solve, how many you would use, and in which situations you would or would not bother with them."

**What a strong answer should cover:**
- The problem: with **one token per server**, the ring arcs are random and very unequal, so load is uneven and a failed server dumps all its keys on **one neighbour**
- **Virtual nodes**: each physical server gets many tokens; its share is the sum of many small arcs, so imbalance shrinks roughly with the square root of the token count
- Second benefit: a failed or joining server exchanges data with **many** peers in parallel, not one
- Third benefit: **weighting** heterogeneous servers by giving bigger machines more tokens
- Costs: a bigger routing table, more ranges to stream and repair, and in replicated stores more node pairs sharing data; a real data point such as Cassandra lowering \`num_tokens\` from 256 to 16 in 4.0 with a smarter token allocator
- When you do not need them: fixed logical partitions, rendezvous hashing, or a static set of identical servers

**Clarifying questions expected:**
- How many servers, and do they differ in size?
- Is this a cache (movement costs misses) or a replicated store (movement costs streaming and repair)?

**Code / implementation expected:** Optional — a ring with N tokens per server and the measured imbalance; the example runs 1 to 1000 vnodes.`,
    answer: `**Target Audience:** Readers who know the basic hash ring; if you do not, read [What is consistent hashing?](/interview-question/what-is-consistent-hashing) first, as this page builds on it.
**Difficulty:** Medium
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). Cassandra facts are cited from The Last Pickle, Instaclustr and the Apache Cassandra 4.0 production docs.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Numbers come from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

Ten friends share a large round pizza, and each one makes a single cut at a random spot; everyone gets the slice that ends at their cut. One friend ends up with a third of the pizza and another with a sliver. Now let each friend make a hundred random cuts and collect the hundred little pieces that end at their cuts. Big and small pieces average out, and everyone ends up with roughly a tenth.

When a friend leaves the table, a single cut means one neighbour inherits their whole slice. With a hundred cuts, their hundred pieces go to whoever is next to each piece, so nine friends each get a little extra.

That is virtual nodes: many small random cuts per server instead of one.

## 2. The Problem Virtual Nodes Solve

On a plain ring each server has one **token** (position), and it owns the arc from the previous token to its own. With few random tokens, those arcs vary enormously. In the basic ring example, four servers owned between **1.71% and 60.08%** of the ring.

Two things go wrong:

1. **Uneven load.** The busiest server sets the capacity of the cluster; servers with tiny arcs sit idle.
2. **Uneven recovery.** A failed server's whole arc falls to the next server clockwise. That server's load jumps, and in a database, all re-replication streams from or to one machine.

📌 **Interview term: virtual node (vnode)** — one of many tokens that a physical server places on the ring, each usually hashed from a name like \`node-3#17\`. The server owns every arc ending at any of its tokens. The ring still maps keys to tokens; a token-to-server table maps tokens to machines.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="On the left each server has one position on the ring; on the right each server has several interleaved positions">
  <circle class="d-edge" cx="180" cy="170" r="110" fill="none"/>
  <circle class="d-box-accent" cx="180" cy="60" r="18"/>
  <text class="d-text" x="180" y="65" text-anchor="middle">A</text>
  <circle class="d-box" cx="290" cy="170" r="18"/>
  <text class="d-text" x="290" y="175" text-anchor="middle">B</text>
  <circle class="d-box-muted" cx="102" cy="248" r="18"/>
  <text class="d-text" x="102" y="253" text-anchor="middle">C</text>
  <text class="d-sub" x="180" y="175" text-anchor="middle">1 token each</text>
  <circle class="d-edge" cx="540" cy="170" r="110" fill="none"/>
  <circle class="d-box-accent" cx="540" cy="60" r="14"/>
  <text class="d-sub" x="540" y="65" text-anchor="middle">A</text>
  <circle class="d-box" cx="618" cy="92" r="14"/>
  <text class="d-sub" x="618" y="97" text-anchor="middle">B</text>
  <circle class="d-box-muted" cx="650" cy="170" r="14"/>
  <text class="d-sub" x="650" y="175" text-anchor="middle">C</text>
  <circle class="d-box-accent" cx="618" cy="248" r="14"/>
  <text class="d-sub" x="618" y="253" text-anchor="middle">A</text>
  <circle class="d-box" cx="540" cy="280" r="14"/>
  <text class="d-sub" x="540" y="285" text-anchor="middle">B</text>
  <circle class="d-box-muted" cx="462" cy="248" r="14"/>
  <text class="d-sub" x="462" y="253" text-anchor="middle">C</text>
  <circle class="d-box-accent" cx="430" cy="170" r="14"/>
  <text class="d-sub" x="430" y="175" text-anchor="middle">A</text>
  <circle class="d-box" cx="462" cy="92" r="14"/>
  <text class="d-sub" x="462" y="97" text-anchor="middle">B</text>
  <text class="d-sub" x="540" y="175" text-anchor="middle">many tokens each</text>
</svg>

On the left, each server owns one arc whose size is luck. On the right, each server owns several interleaved arcs, so the sizes average out and every server has many different neighbours.

## 3. Measured: How Many Vnodes Until Load Is Even?

The example puts 100,000 keys on 10 servers and repeats the run with 1, 10, 100 and 1000 tokens per server. Fair share is 10,000 keys:

~~~text
10 nodes, 100000 keys. Fair share = 10000 keys per node.
vnodes  ring entries  busiest node     idlest node
1       10             29412 (2.94x)     358 (0.03x)
10      100            14256 (1.42x)    5355 (0.53x)
100     1000           11605 (1.16x)    7419 (0.74x)
1000    10000          10315 (1.03x)    9645 (0.96x)
~~~

- **1 vnode:** the busiest server held **2.94x** its fair share and the idlest **0.03x**, a ratio of about 82 to 1.
- **10 vnodes:** busiest 1.42x, idlest 0.53x. Better, but one server still does almost three times the work of another.
- **100 vnodes:** busiest **1.16x**. Note that 100 random tokens is *not* perfect: the cluster must still be sized for a server running 16% hot.
- **1000 vnodes:** busiest 1.03x, idlest 0.96x.

📌 **Interview term: load imbalance (peak-to-average ratio)** — the busiest server's load divided by the average. Capacity planning uses the peak, so a ratio of 1.16 means paying for 16% more hardware than perfectly even placement would need. With random tokens it falls roughly with the square root of the number of tokens per server, which is why going from 100 to 1000 tokens only took it from 1.16 to 1.03.

## 4. Measured: Where a Failed Server's Keys Go

~~~text
node-3 fails. Where do its keys go?
  vnodes=1    2028 keys moved to 1 node(s), largest receiver took 2028
  vnodes=100  9980 keys moved to 9 node(s), largest receiver took 1568
~~~

With one token, all 2,028 keys of node-3 went to **one** server. With 100 tokens, node-3 held 9,980 keys and they went to **9** servers, the largest receiving 1,568, about a sixth of the lost load. In a cache that spreads the extra misses; in a database it means the lost replicas are rebuilt by many machines streaming in parallel, so recovery is faster and no single survivor is overloaded.

The program also checks that no key that was not on node-3 moved, so the minimal-movement property of the ring is kept with vnodes.

## 5. Measured: Weighting Bigger Servers

Give a server more tokens and it gets a bigger share. node-9 is twice as big, so it gets 200 tokens while the others get 100:

~~~text
node-9 is a server twice as big, so it gets 200 vnodes; the rest get 100:
  node-9 keys 16629, average other node 9263, ratio 1.79x
~~~

📌 **Interview term: weighted consistent hashing** — giving each server a number of tokens proportional to its capacity, so a machine with twice the memory or CPU receives about twice the keys. In the run it came out at **1.79x**, not 2.00x: the same randomness that left 16% imbalance at 100 tokens also blurs the weights. More tokens, or a deliberate token allocator, tightens it.

## 6. What Vnodes Cost

- **A bigger routing table.** Every client keeps all tokens sorted: 1,000 servers with 256 tokens each is 256,000 entries, about 3.9 MiB at 16 bytes per entry, and a binary search of 18 steps. Fine for a server process, noticeable for a small client or a load balancer data plane.
- **More ranges to manage.** A replicated store streams, repairs and tracks every range separately. Instaclustr notes that a large number of vnodes adds overhead to operational tasks such as repair.
- **More neighbours sharing data.** With many tokens, each server shares replica ranges with almost every other server, so with replication factor 3 almost any two simultaneous failures leave some range with only one live copy. With few tokens, two failures only hurt if the two servers are neighbours.
- **Random tokens with low counts are poor.** The run shows 10 random tokens leaving a 1.42x peak.

That is why **Apache Cassandra 4.0 lowered the default \`num_tokens\` from 256 to 16** (CASSANDRA-13701, described by The Last Pickle), paired with the token allocation algorithm enabled by \`allocate_tokens_for_local_replication_factor: 3\`, which chooses tokens to balance load instead of picking them at random. Instaclustr's testing likewise found 16 works well with the allocator, while the old random allocator still needs around 256 tokens to balance. The Last Pickle also warns that \`num_tokens\` must not be changed on a node that has already joined, because the node fails on restart.

📌 **Interview term: token allocation algorithm** — choosing each new token deliberately (to split the most loaded ranges) rather than by random hashing. It gets good balance with far fewer tokens, which keeps the routing table small and limits how many servers share each range.

## 7. When Do You Need Them?

| Situation | Vnodes? | Why |
| :--- | :--- | :--- |
| Ring with few servers (under ~50) and random tokens | Yes, 100+ | One token per server gave a 2.94x peak in the run |
| Servers of different sizes | Yes | Weight by token count |
| Replicated store where rebuild speed matters | Yes, moderate count | Many peers stream a lost node back in parallel |
| Very large cluster, routing table on many small clients | Fewer, or allocated tokens | Table size and per-range overhead grow with the token count |
| Fixed partitions mapped to nodes (Kafka partitions, logical shards) | No | Balance comes from the partition-to-node assignment, not the hash |
| Rendezvous (HRW) hashing | No | Every key scores every server, so balance needs no extra tokens |
| Static set of identical servers that never changes | Usually no | \`hash % N\` or jump hash is simpler |

A close relative is the **fixed-partition** scheme: split the key space into Q equal partitions up front and hand Q/S of them to each of S servers. Course material on the Dynamo paper describes this as its "strategy 3" and notes that it decouples partitioning from placement and keeps the routing table at Q entries. It is the same idea as the logical shards in [What is database sharding?](/interview-question/what-is-database-sharding).

For the comparison with rendezvous hashing, see [Consistent hashing vs rendezvous (HRW) hashing — which for what scale?](/interview-question/consistent-hashing-vs-rendezvous-hrw-hashing-which-for-what-scale).

## 8. Verified: Running the Code

The example **"Virtual nodes: load balance at 1, 10, 100 and 1000 vnodes, failure spread, weighted capacity"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and \`javac Main.java && java Main\` (Java 21). All four print exactly this:

~~~text
10 nodes, 100000 keys. Fair share = 10000 keys per node.
vnodes  ring entries  busiest node     idlest node
1       10             29412 (2.94x)     358 (0.03x)
10      100            14256 (1.42x)    5355 (0.53x)
100     1000           11605 (1.16x)    7419 (0.74x)
1000    10000          10315 (1.03x)    9645 (0.96x)

node-3 fails. Where do its keys go?
  vnodes=1    2028 keys moved to 1 node(s), largest receiver took 2028
  vnodes=100  9980 keys moved to 9 node(s), largest receiver took 1568

node-9 is a server twice as big, so it gets 200 vnodes; the rest get 100:
  node-9 keys 16629, average other node 9263, ratio 1.79x
~~~

The only change from a plain ring is how tokens are created, one per \`name#index\`:

~~~js
for (const [name, count] of tokensPerNode) for (let t = 0; t < count; t++) r.push([h32(name + "#" + t), name]);
~~~

What the simulation stands for and leaves out: tokens are random hashes (the old Cassandra-style random allocator), not allocated deliberately, and all keys have equal traffic. Real workloads also have hot keys, which no number of vnodes fixes. The hash is FNV-1a with the murmur3 finalizer, written out in each language for identical output; a different hash gives different exact numbers but the same trend.

## Edge Cases Worth Knowing

- **Replica placement must skip duplicate machines.** Walking clockwise for 3 replicas can hit two tokens of the same server; skip to the next distinct physical server (and, ideally, distinct rack or zone).
- **Changing the token count of a live server** changes which ranges it owns and forces large data movement; in Cassandra it is not supported on a joined node.
- **Weighted tokens and failures.** A big server with many tokens is also a big hole when it fails; capacity planning must cover losing the largest machine.
- **Hot keys.** Vnodes balance the key *count*. A single key with heavy traffic still lands on one server.

## Common Pitfalls

- **Assuming 100 vnodes means perfect balance.** The run still showed a 1.16x peak; size for the peak.
- **Using vnodes but placing replicas on consecutive tokens.** Two copies can land on one machine.
- **Picking thousands of tokens by default.** Routing tables, streaming and repair all grow; balance improves only with the square root.
- **Forgetting weights for mixed hardware.** Equal tokens on unequal machines overloads the small ones.
- **Adding vnodes where partitions are fixed.** If balance comes from assigning partitions, vnodes add nothing but complexity.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">With one random token per server, ring arcs are very unequal. In my run, 10 servers ranged from <strong style="color:#ffca28;">2.94x</strong> to <strong style="color:#ffca28;">0.03x</strong> of their fair share, and a failed server dumped all its keys on <strong style="color:#ffca28;">one</strong> neighbour.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The fix:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Virtual nodes</strong>: each server places many tokens, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node-3#0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node-3#1</code> and so on, and owns the sum of many small arcs. At 100 tokens the peak fell to <strong style="color:#ffca28;">1.16x</strong>, at 1000 to <strong style="color:#ffca28;">1.03x</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Other wins:</strong> <span style="color:#f0e2c8;">A failed server's keys spread over many survivors (9 receivers instead of 1 in the run), so recovery is parallel; and <strong style="color:#ffca28;">weighting</strong> by token count gives a bigger machine a bigger share.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Costs:</strong> <span style="color:#f0e2c8;">Bigger routing table, more ranges to stream and repair, and more servers sharing each range. Cassandra 4.0 cut the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">num_tokens</code> from 256 to 16 and relies on a token allocator instead of random tokens.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When:</strong> <span style="color:#f0e2c8;">Use them on any ring with few servers or mixed hardware. Skip them with fixed logical partitions, rendezvous hashing, or a static set of identical servers.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many vnodes would you choose?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With random tokens, on the order of 100 to 256 per server, accepting about 10 to 15% imbalance. With a token allocator, as in Cassandra 4.0, 16 is the documented default. The trade is balance against routing table size and per-range overhead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does balance improve so slowly with more vnodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each server's share is a sum of random arc lengths, and the relative spread of such a sum shrinks roughly with the square root of the count. Ten times more tokens, from 100 to 1000, took the peak from 1.16x to 1.03x.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do vnodes interact with replication?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replicas are the next distinct physical servers clockwise, so placement must skip duplicate tokens of the same machine. Many tokens also mean each server shares ranges with almost every other one, so two simultaneous failures are more likely to leave some range under-replicated.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do vnodes fix hot keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. They balance how many keys each server owns, not traffic per key. A celebrity key still lands on one server; cache it, replicate it for reads, or split it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you use instead of vnodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fixed partitions assigned to servers (Kafka partitions, logical shards, Dynamo strategy 3), where balance comes from the assignment, or rendezvous hashing, which balances without extra tokens at the cost of scoring every server per lookup.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Virtual node (vnode) | One of many ring tokens that a physical server owns |
| Load imbalance (peak-to-average ratio) | Busiest server load divided by the average |
| Weighted consistent hashing | Token count proportional to server capacity |
| Token allocation algorithm | Choosing tokens deliberately to balance load instead of hashing them at random |

**Conclusion:** Virtual nodes fix the one weakness of the basic hash ring: random single tokens give random, very unequal arcs. By giving each server many tokens, load evens out (from a 2.94x peak to 1.16x at 100 tokens and 1.03x at 1000 in the run), a failed server's keys spread across many survivors, and bigger machines can take a proportionally bigger share. The cost is a larger routing table and more ranges to move, repair and reason about, which is why modern systems such as Cassandra use fewer, deliberately allocated tokens. Use vnodes on any consistent hashing ring with few or unequal servers; skip them when balance already comes from fixed partitions or rendezvous hashing.`,
    examples: [
      {
        label: `Virtual nodes: load balance at 1, 10, 100 and 1000 vnodes, failure spread, weighted capacity`,
        variants: [
          { tech: "node", code: `// Virtual nodes: how many ring positions per server you need before load evens out,
// where a dead server's keys go, and how weights give a big server a bigger share.
function h32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
const x2 = (num, den) => { const v = Math.floor((num * 100) / den); return Math.floor(v / 100) + "." + String(v % 100).padStart(2, "0") + "x"; };

function buildRing(tokensPerNode) { // tokensPerNode: array of [name, count]
  const r = [];
  for (const [name, count] of tokensPerNode) for (let t = 0; t < count; t++) r.push([h32(name + "#" + t), name]);
  return r.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
}
function owner(ring, hk) {
  let lo = 0, hi = ring.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ring[mid][0] < hk) lo = mid + 1; else hi = mid; }
  return ring[lo === ring.length ? 0 : lo][1];
}
const KEYS = 100000;
const hashes = []; for (let i = 0; i < KEYS; i++) hashes.push(h32("user:" + i));
const nodes = []; for (let i = 0; i < 10; i++) nodes.push("node-" + i);
const counts = (ring) => { const c = {}; for (const n of nodes) c[n] = 0; for (const hk of hashes) c[owner(ring, hk)]++; return c; };

console.log("10 nodes, 100000 keys. Fair share = 10000 keys per node.");
console.log("vnodes  ring entries  busiest node     idlest node");
for (const v of [1, 10, 100, 1000]) {
  const c = counts(buildRing(nodes.map((n) => [n, v])));
  const vals = nodes.map((n) => c[n]);
  const max = Math.max(...vals), min = Math.min(...vals);
  console.log(\`\${String(v).padEnd(8)}\${String(v * 10).padEnd(14)}\${String(max).padStart(6)} (\${x2(max * 10, KEYS)})  \${String(min).padStart(6)} (\${x2(min * 10, KEYS)})\`);
}

console.log("\\nnode-3 fails. Where do its keys go?");
for (const v of [1, 100]) {
  const before = buildRing(nodes.map((n) => [n, v]));
  const after = buildRing(nodes.filter((n) => n !== "node-3").map((n) => [n, v]));
  const got = {}; let moved = 0;
  for (const hk of hashes) {
    const a = owner(before, hk);
    if (a === "node-3") { moved++; const b = owner(after, hk); got[b] = (got[b] || 0) + 1; }
    else if (owner(after, hk) !== a) throw new Error("a key not on node-3 moved");
  }
  const top = Math.max(...Object.values(got));
  console.log(\`  vnodes=\${String(v).padEnd(4)} \${moved} keys moved to \${Object.keys(got).length} node(s), largest receiver took \${top}\`);
}

console.log("\\nnode-9 is a server twice as big, so it gets 200 vnodes; the rest get 100:");
const c = counts(buildRing(nodes.map((n) => [n, n === "node-9" ? 200 : 100])));
const others = nodes.filter((n) => n !== "node-9").map((n) => c[n]);
const avg = Math.floor(others.reduce((a, b) => a + b, 0) / others.length);
console.log(\`  node-9 keys \${c["node-9"]}, average other node \${avg}, ratio \${x2(c["node-9"], avg)}\`);` },
          { tech: "python", code: `# Virtual nodes: how many ring positions per server you need before load evens out,
# where a dead server's keys go, and how weights give a big server a bigger share.
import bisect

M = 0xFFFFFFFF


def h32(s):
    h = 0x811C9DC5
    for ch in s.encode():
        h ^= ch
        h = (h * 0x01000193) & M
    h ^= h >> 16
    h = (h * 0x85EBCA6B) & M
    h ^= h >> 13
    h = (h * 0xC2B2AE35) & M
    h ^= h >> 16
    return h


def x2(num, den):
    v = num * 100 // den
    return f"{v // 100}.{v % 100:02d}x"


def build_ring(tokens_per_node):  # list of (name, count)
    r = sorted((h32(f"{name}#{t}"), name) for name, count in tokens_per_node for t in range(count))
    return [p for p, _ in r], [n for _, n in r]


def owner(ring, hk):
    pos, names = ring
    i = bisect.bisect_left(pos, hk)
    return names[0 if i == len(pos) else i]


KEYS = 100000
hashes = [h32(f"user:{i}") for i in range(KEYS)]
nodes = [f"node-{i}" for i in range(10)]


def counts(ring):
    c = {n: 0 for n in nodes}
    for hk in hashes:
        c[owner(ring, hk)] += 1
    return c


print("10 nodes, 100000 keys. Fair share = 10000 keys per node.")
print("vnodes  ring entries  busiest node     idlest node")
for v in [1, 10, 100, 1000]:
    c = counts(build_ring([(n, v) for n in nodes]))
    vals = [c[n] for n in nodes]
    mx, mn = max(vals), min(vals)
    print(f"{v:<8}{v * 10:<14}{mx:>6} ({x2(mx * 10, KEYS)})  {mn:>6} ({x2(mn * 10, KEYS)})")

print("\\nnode-3 fails. Where do its keys go?")
for v in [1, 100]:
    before = build_ring([(n, v) for n in nodes])
    after = build_ring([(n, v) for n in nodes if n != "node-3"])
    got = {}
    moved = 0
    for hk in hashes:
        a = owner(before, hk)
        if a == "node-3":
            moved += 1
            b = owner(after, hk)
            got[b] = got.get(b, 0) + 1
        elif owner(after, hk) != a:
            raise RuntimeError("a key not on node-3 moved")
    top = max(got.values())
    print(f"  vnodes={v:<4} {moved} keys moved to {len(got)} node(s), largest receiver took {top}")

print("\\nnode-9 is a server twice as big, so it gets 200 vnodes; the rest get 100:")
c = counts(build_ring([(n, 200 if n == "node-9" else 100) for n in nodes]))
others = [c[n] for n in nodes if n != "node-9"]
avg = sum(others) // len(others)
print(f"  node-9 keys {c['node-9']}, average other node {avg}, ratio {x2(c['node-9'], avg)}")` },
          { tech: "go", code: `// Virtual nodes: how many ring positions per server you need before load evens out,
// where a dead server's keys go, and how weights give a big server a bigger share.
package main

import (
	"fmt"
	"sort"
)

func h32(s string) uint32 {
	h := uint32(0x811c9dc5)
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 0x01000193
	}
	h ^= h >> 16
	h *= 0x85ebca6b
	h ^= h >> 13
	h *= 0xc2b2ae35
	h ^= h >> 16
	return h
}

func x2(num, den int) string {
	v := num * 100 / den
	return fmt.Sprintf("%d.%02dx", v/100, v%100)
}

type point struct {
	pos  uint32
	name string
}
type weight struct {
	name  string
	count int
}

func buildRing(tokens []weight) []point {
	r := []point{}
	for _, w := range tokens {
		for t := 0; t < w.count; t++ {
			r = append(r, point{h32(fmt.Sprintf("%s#%d", w.name, t)), w.name})
		}
	}
	sort.Slice(r, func(a, b int) bool {
		if r[a].pos != r[b].pos {
			return r[a].pos < r[b].pos
		}
		return r[a].name < r[b].name
	})
	return r
}

func owner(ring []point, hk uint32) string {
	i := sort.Search(len(ring), func(i int) bool { return ring[i].pos >= hk })
	if i == len(ring) {
		i = 0
	}
	return ring[i].name
}

const KEYS = 100000

var hashes []uint32
var nodes []string

func counts(ring []point) map[string]int {
	c := map[string]int{}
	for _, hk := range hashes {
		c[owner(ring, hk)]++
	}
	return c
}

func uniform(v int, skip string) []weight {
	w := []weight{}
	for _, n := range nodes {
		if n != skip {
			w = append(w, weight{n, v})
		}
	}
	return w
}

func main() {
	for i := 0; i < KEYS; i++ {
		hashes = append(hashes, h32(fmt.Sprintf("user:%d", i)))
	}
	for i := 0; i < 10; i++ {
		nodes = append(nodes, fmt.Sprintf("node-%d", i))
	}
	fmt.Println("10 nodes, 100000 keys. Fair share = 10000 keys per node.")
	fmt.Println("vnodes  ring entries  busiest node     idlest node")
	for _, v := range []int{1, 10, 100, 1000} {
		c := counts(buildRing(uniform(v, "")))
		mx, mn := -1, 1<<30
		for _, n := range nodes {
			if c[n] > mx {
				mx = c[n]
			}
			if c[n] < mn {
				mn = c[n]
			}
		}
		fmt.Printf("%-8d%-14d%6d (%s)  %6d (%s)\\n", v, v*10, mx, x2(mx*10, KEYS), mn, x2(mn*10, KEYS))
	}

	fmt.Println("\\nnode-3 fails. Where do its keys go?")
	for _, v := range []int{1, 100} {
		before := buildRing(uniform(v, ""))
		after := buildRing(uniform(v, "node-3"))
		got := map[string]int{}
		moved := 0
		for _, hk := range hashes {
			a := owner(before, hk)
			if a == "node-3" {
				moved++
				got[owner(after, hk)]++
			} else if owner(after, hk) != a {
				panic("a key not on node-3 moved")
			}
		}
		top := 0
		for _, n := range got {
			if n > top {
				top = n
			}
		}
		fmt.Printf("  vnodes=%-4d %d keys moved to %d node(s), largest receiver took %d\\n", v, moved, len(got), top)
	}

	fmt.Println("\\nnode-9 is a server twice as big, so it gets 200 vnodes; the rest get 100:")
	w := []weight{}
	for _, n := range nodes {
		if n == "node-9" {
			w = append(w, weight{n, 200})
		} else {
			w = append(w, weight{n, 100})
		}
	}
	c := counts(buildRing(w))
	sum := 0
	for _, n := range nodes {
		if n != "node-9" {
			sum += c[n]
		}
	}
	avg := sum / 9
	fmt.Printf("  node-9 keys %d, average other node %d, ratio %s\\n", c["node-9"], avg, x2(c["node-9"], avg))
}` },
          { tech: "java", code: `// Virtual nodes: how many ring positions per server you need before load evens out,
// where a dead server's keys go, and how weights give a big server a bigger share.
import java.util.*;

public class Main {
    static long h32(String s) {
        int h = 0x811c9dc5;
        for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h *= 0x01000193; }
        h ^= h >>> 16; h *= 0x85ebca6b; h ^= h >>> 13; h *= 0xc2b2ae35; h ^= h >>> 16;
        return Integer.toUnsignedLong(h);
    }

    static String x2(long num, long den) {
        long v = num * 100 / den;
        return String.format("%d.%02dx", v / 100, v % 100);
    }

    static final class Ring {
        long[] pos; String[] names;
        Ring(Map<String, Integer> tokens) {
            List<Object[]> r = new ArrayList<>();
            for (var e : tokens.entrySet())
                for (int t = 0; t < e.getValue(); t++) r.add(new Object[]{h32(e.getKey() + "#" + t), e.getKey()});
            r.sort((a, b) -> {
                int c = Long.compare((Long) a[0], (Long) b[0]);
                return c != 0 ? c : ((String) a[1]).compareTo((String) b[1]);
            });
            pos = new long[r.size()]; names = new String[r.size()];
            for (int i = 0; i < r.size(); i++) { pos[i] = (Long) r.get(i)[0]; names[i] = (String) r.get(i)[1]; }
        }
        String owner(long hk) {
            int lo = 0, hi = pos.length;
            while (lo < hi) { int mid = (lo + hi) >>> 1; if (pos[mid] < hk) lo = mid + 1; else hi = mid; }
            return names[lo == pos.length ? 0 : lo];
        }
    }

    static final int KEYS = 100000;
    static long[] hashes = new long[KEYS];
    static List<String> nodes = new ArrayList<>();

    static Map<String, Integer> uniform(int v, String skip) {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (String n : nodes) if (!n.equals(skip)) m.put(n, v);
        return m;
    }

    static Map<String, Integer> counts(Ring ring) {
        Map<String, Integer> c = new HashMap<>();
        for (String n : nodes) c.put(n, 0);
        for (long hk : hashes) c.merge(ring.owner(hk), 1, Integer::sum);
        return c;
    }

    public static void main(String[] args) {
        for (int i = 0; i < KEYS; i++) hashes[i] = h32("user:" + i);
        for (int i = 0; i < 10; i++) nodes.add("node-" + i);
        System.out.println("10 nodes, 100000 keys. Fair share = 10000 keys per node.");
        System.out.println("vnodes  ring entries  busiest node     idlest node");
        for (int v : new int[]{1, 10, 100, 1000}) {
            Map<String, Integer> c = counts(new Ring(uniform(v, "")));
            int mx = Collections.max(c.values()), mn = Collections.min(c.values());
            System.out.printf("%-8d%-14d%6d (%s)  %6d (%s)%n", v, v * 10, mx, x2(mx * 10L, KEYS), mn, x2(mn * 10L, KEYS));
        }

        System.out.println("\\nnode-3 fails. Where do its keys go?");
        for (int v : new int[]{1, 100}) {
            Ring before = new Ring(uniform(v, "")), after = new Ring(uniform(v, "node-3"));
            Map<String, Integer> got = new HashMap<>();
            int moved = 0;
            for (long hk : hashes) {
                String a = before.owner(hk);
                if (a.equals("node-3")) { moved++; got.merge(after.owner(hk), 1, Integer::sum); }
                else if (!after.owner(hk).equals(a)) throw new RuntimeException("a key not on node-3 moved");
            }
            int top = Collections.max(got.values());
            System.out.printf("  vnodes=%-4d %d keys moved to %d node(s), largest receiver took %d%n", v, moved, got.size(), top);
        }

        System.out.println("\\nnode-9 is a server twice as big, so it gets 200 vnodes; the rest get 100:");
        Map<String, Integer> w = uniform(100, "");
        w.put("node-9", 200);
        Map<String, Integer> c = counts(new Ring(w));
        int sum = 0;
        for (String n : nodes) if (!n.equals("node-9")) sum += c.get(n);
        int avg = sum / 9;
        System.out.printf("  node-9 keys %d, average other node %d, ratio %s%n", c.get("node-9"), avg, x2(c.get("node-9"), avg));
    }
}` },
        ],
      },
    ],
  },
  {
    title: `Consistent hashing vs rendezvous (HRW) hashing — which for what scale?`,
    difficulty: "hard",
    seoDescription: `Ring consistent hashing vs rendezvous (HRW) hashing, measured: balance, key movement, cost per lookup, replica sets, and which one fits what scale.`,
    description: `**Question presented to candidate:**
"Two ways to map keys to a changing set of servers: a consistent hashing ring with virtual nodes, or rendezvous hashing, also called highest random weight. How does each work, how do they compare on balance, movement and lookup cost, and which would you pick for 10 servers, for 1,000, and for a load balancer making a decision per packet?"

**What a strong answer should cover:**
- **Rendezvous (HRW)**: score every server with \`hash(server, key)\` and pick the highest; a ring maps the key to the next token clockwise
- Both give **minimal disruption**: a join takes about 1/(N+1) of keys, a leave moves only that server's keys, spread over the survivors
- **Balance**: HRW is even with no extra state; a ring needs **many virtual nodes** to get close
- **Cost**: HRW is **O(N) hashes per lookup**; a ring is one hash plus an **O(log(N·V))** binary search, at the price of an N·V-entry table
- **Replicas**: HRW top-k scores give k replicas directly, and losing a server swaps exactly one member of each affected set
- The scale rule: HRW for small and medium N or when lookups are cached or precomputed; ring, jump hash or a precomputed table when N is large and lookups are hot

**Clarifying questions expected:**
- How many servers, and how often does the set change?
- How many lookups per second, and can the result be cached per key?

**Code / implementation expected:** Optional — both are a few lines; the example measures them side by side on the same keys.`,
    answer: `**Target Audience:** Readers who know the basic hash ring and virtual nodes; see [What is consistent hashing?](/interview-question/what-is-consistent-hashing) and [What is consistent hashing with virtual nodes and when do you need it?](/interview-question/what-is-consistent-hashing-with-virtual-nodes-and-when-do-you-need-it) if not.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). History is cited from Thaler and Ravishankar (University of Michigan report, 1996; IEEE/ACM Transactions on Networking, 1998); GitHub GLB from the GitHub engineering blog.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Numbers come from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A parcel arrives and one of ten couriers must take it. Two dispatch rules:

**The clock face.** Each courier has a few stickers on a big clock. The parcel gets a time from its address, and the dispatcher walks clockwise to the first sticker. One glance at a sorted board, very fast, but if the stickers are badly spaced some couriers get far more parcels, so you need lots of stickers per courier.

**The lottery.** For each parcel, every courier draws a ticket whose number depends only on the courier and the address. Highest ticket wins. Everyone gets a fair share automatically, and if a courier is off sick, only their parcels go to whoever drew second-highest. But every parcel needs ten draws, and with a thousand couriers, a thousand.

Both rules agree on the important part: when one courier joins or leaves, almost every parcel keeps its courier. They differ on the cost of a decision and on what they must remember.

## 2. Rendezvous Hashing in Three Lines

For key k and servers S1..Sn, compute a score \`hash(Si, k)\` for every server and choose the server with the highest score.

📌 **Interview term: rendezvous hashing (highest random weight, HRW)** — a mapping where every server gets a pseudo-random score for each key and the key goes to the top scorer. Invented by David Thaler and Chinya Ravishankar at the University of Michigan in 1996 and published as "Using Name-Based Mappings to Increase Hit Rates" in IEEE/ACM Transactions on Networking (1998), a year or so before consistent hashing.

~~~js
function rank(nodes, key) { // every node gets a score for this key; highest wins
  return nodes.map((n) => [h32(n + "/" + key), n]).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1)).map((p) => p[1]);
}
~~~

Why it is consistent: removing server X changes nothing for keys where X was not the top scorer, and for keys where X was top, the runner-up takes over. Adding X only steals the keys where X scores highest, about 1/(N+1) of them, and only from their previous owners.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Rendezvous hashing: each of four servers gets a score for key k and the highest score, server C, wins">
  <rect class="d-box" x="20" y="120" width="130" height="60" rx="10"/>
  <text class="d-text" x="85" y="155" text-anchor="middle">key k</text>
  <rect class="d-box" x="300" y="20" width="200" height="50" rx="10"/>
  <text class="d-text" x="400" y="50" text-anchor="middle">A score 31</text>
  <rect class="d-box" x="300" y="90" width="200" height="50" rx="10"/>
  <text class="d-text" x="400" y="120" text-anchor="middle">B score 77</text>
  <rect class="d-box-accent" x="300" y="160" width="200" height="50" rx="10"/>
  <text class="d-text" x="400" y="190" text-anchor="middle">C score 94</text>
  <rect class="d-box" x="300" y="230" width="200" height="50" rx="10"/>
  <text class="d-text" x="400" y="260" text-anchor="middle">D score 12</text>
  <path class="d-edge" d="M 156 140 L 294 45"/>
  <path class="d-edge" d="M 156 145 L 294 115"/>
  <path class="d-edge-accent" d="M 156 160 L 294 185"/>
  <path class="d-edge" d="M 156 165 L 294 255"/>
  <rect class="d-box-accent" x="570" y="160" width="130" height="50" rx="10"/>
  <text class="d-text" x="635" y="190" text-anchor="middle">owner C</text>
  <path class="d-edge-accent" d="M 506 185 L 564 185"/>
</svg>

The scores are illustrative. If C leaves, the same key goes to B, the runner-up, and keys that never ranked C first do not move at all.

📌 **Interview term: top-k selection** — taking the k highest-scoring servers as the k replicas of a key. The replica set falls out of the same computation, with no ring walk and no skipping of duplicate tokens.

## 3. Measured: Same Keys, Three Schemes

The example maps 20,000 keys to 10 servers with a ring of 1 token per server, a ring of 100 tokens per server, and HRW. Then it adds node-10, and separately removes node-4:

~~~text
10 nodes, 20000 keys (fair share 2000). Then add node-10, or remove node-4.
scheme             busiest/fair  add: moved  to new node  remove: moved  receivers  hashes/lookup  search steps
ring, 1 vnode             2.93x          44           44           5873          1              1          3.34
ring, 100 vnodes          1.18x        1939         1939           2374          9              1          9.98
rendezvous (HRW)          1.04x        1814         1814           2026          9             10             -
~~~

Reading the columns:

- **Balance.** HRW's busiest server held **1.04x** its fair share with no extra state. The ring needed 100 tokens per server to reach **1.18x**; with 1 token it was 2.93x.
- **Join.** A fair share for the newcomer is 20,000 / 11, about 1,818 keys. HRW moved **1,814**, all to node-10. The 100-token ring moved 1,939, also all to node-10. The 1-token ring moved only 44, because node-10 landed on a tiny arc and is now nearly idle.
- **Leave.** HRW moved node-4's 2,026 keys and spread them over all **9** survivors. The 1-token ring moved 5,873 keys (node-4 owned a huge arc) to **1** neighbour.
- **Work per lookup.** The ring does **1 hash** and a binary search (about 3 steps over 10 tokens, 10 steps over 1,000). HRW does **10 hashes**, one per server.

📌 **Interview term: lookup cost** — the work to map one key. Ring: one hash plus O(log T) comparisons over T tokens. HRW: N hashes and a max over N servers.

## 4. Measured: Replica Sets

~~~text
Replica sets with HRW: the top 3 scores are the 3 replicas.
  user:3 on 10 nodes:     node-0, node-2, node-4
  user:3 without node-4: node-0, node-2, node-7
  removing node-4 changed 6015 of 20000 replica sets; 6015 of them swapped exactly one member
~~~

user:3 had replicas node-0, node-2, node-4. With node-4 gone, its replicas became node-0, node-2, node-7: the two survivors stayed and the 4th-ranked server stepped in. Over all keys, removing node-4 changed **6,015 of 20,000** replica sets (about 3 in 10, as expected when each set holds 3 of 10 servers), and **every one** of them swapped exactly one member. That is the property a replicated store needs: losing one server re-replicates one copy per affected key, and no surviving replica moves.

A ring gives the same property if replicas are the next distinct physical servers clockwise; it just needs the extra rule to skip duplicate tokens.

## 5. How Cost Grows With Scale

~~~text
Work per lookup as the cluster grows (ring with 100 vnodes per node):
nodes   HRW hashes  ring entries  ring search steps
10              10          1000                 10
100            100         10000                 14
1000          1000        100000                 17
10000        10000       1000000                 20
~~~

This is the whole "which for what scale" answer in one table:

- At **10 servers**, HRW does 10 hashes of a short string per lookup, which is cheap, and it needs no token table at all.
- At **1,000 servers**, HRW needs 1,000 hashes per lookup, while a 100-token ring needs a 100,000-entry table and about 17 comparisons. If you look keys up millions of times per second, the ring wins.
- At **10,000 servers**, plain HRW is 10,000 hashes per lookup; the ring is 1,000,000 entries and 20 comparisons.

There are ways to keep HRW at large N:

📌 **Interview term: hierarchical (skeleton) rendezvous hashing** — grouping servers into clusters and running HRW first over clusters, then within the chosen cluster, so a lookup costs about O(log N) score computations. Libraries such as the Elixir \`hrw\` package ship a skeleton mode for large node sets; academic work such as the ASURA paper notes plain weighted rendezvous hashing is O(N) per lookup.

📌 **Interview term: precomputed lookup table** — running the expensive mapping once per membership change to fill a fixed-size table, then hashing each request to a row. GitHub's GLB Director does this: per the GitHub engineering blog, it fills a fixed-size forwarding table using the ordering of rendezvous hashing, so each row lists a primary and a secondary proxy, and every director server shares the same table. Per-packet work is one hash and an array index; the O(N) cost is paid only when servers change.

## 6. Side-by-Side Comparison

| | Ring + virtual nodes | Rendezvous (HRW) |
| :--- | :--- | :--- |
| Lookup | 1 hash + O(log(N·V)) search | N hashes + max (or O(log N) skeleton) |
| State per client | sorted table of N·V tokens | list of N servers |
| Balance | improves slowly with V (1.18x at V=100 in the run) | even by construction (1.04x in the run) |
| Join / leave movement | minimal; fair only with enough vnodes | minimal and fair |
| Where a failed server's keys go | next tokens clockwise (many servers with vnodes) | each key to its runner-up (all survivors) |
| Replicas | walk clockwise, skip duplicate servers | top-k scores |
| Weights | more tokens for bigger servers | weighted score function |
| Best fit | large N, very hot lookups, existing ring-based systems | small to medium N, replica selection, lookups cached or precomputed |

Two other names come up:

- **Jump consistent hash** (Lamping and Veach, Google, arXiv 2014) uses no memory and is very fast, but servers must be numbered 0..N−1 and can only be added or removed at the end, so it suits numbered shards, not arbitrary server failures.
- **Fixed partitions** (Kafka partitions, logical shards) avoid the question: keys map to a fixed partition by \`hash % P\`, and only the small partition-to-server table changes. See [What is database sharding?](/interview-question/what-is-database-sharding).

## 7. A Decision Rule

1. **Servers numbered and only grow or shrink at the end?** Jump hash.
2. **Up to a few hundred servers, or lookups you can cache per key?** HRW: simplest code, perfect balance, replicas from top-k, no tokens to tune.
3. **Thousands of servers, or a per-request decision on a hot path?** A ring with vnodes, a skeleton HRW, or HRW used offline to fill a lookup table (the GLB approach).
4. **A system that already ships a ring** (Cassandra-style stores): keep it and tune the token count.

For where this choice sits inside a full design, see [How would you design a distributed cache?](/interview-question/how-would-you-design-a-distributed-cache) and [What is a load balancer and what strategies does it use?](/interview-question/what-is-a-load-balancer-and-what-strategies-does-it-use).

## 8. Verified: Running the Code

The example **"Ring vs rendezvous (HRW) hashing: balance, movement, work per lookup, replica sets"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and \`javac Main.java && java Main\` (Java 21). All four print exactly this:

~~~text
10 nodes, 20000 keys (fair share 2000). Then add node-10, or remove node-4.
scheme             busiest/fair  add: moved  to new node  remove: moved  receivers  hashes/lookup  search steps
ring, 1 vnode             2.93x          44           44           5873          1              1          3.34
ring, 100 vnodes          1.18x        1939         1939           2374          9              1          9.98
rendezvous (HRW)          1.04x        1814         1814           2026          9             10             -

Replica sets with HRW: the top 3 scores are the 3 replicas.
  user:3 on 10 nodes:     node-0, node-2, node-4
  user:3 without node-4: node-0, node-2, node-7
  removing node-4 changed 6015 of 20000 replica sets; 6015 of them swapped exactly one member

Work per lookup as the cluster grows (ring with 100 vnodes per node):
nodes   HRW hashes  ring entries  ring search steps
10              10          1000                 10
100            100         10000                 14
1000          1000        100000                 17
10000        10000       1000000                 20
~~~

What the simulation stands for and leaves out: the program counts hash calls and binary-search steps instead of measuring time, so the result is deterministic and identical in every language; the scaling table is computed (HRW hashes = N, ring entries = 100·N, search steps = ceiling of log2 of the entries), not timed. Every key has equal traffic. The hash is FNV-1a with the murmur3 finalizer applied to \`node/key\` for HRW scores; production HRW often uses a 64-bit hash such as xxHash or MurmurHash3 on the pair.

## Edge Cases Worth Knowing

- **Score ties.** Two servers can get the same score; break ties by server name so every client agrees.
- **Hash quality matters more for HRW.** Scores for one key across servers must be independent; a weak hash of \`server + key\` can correlate them and favour some servers.
- **Membership agreement.** Both schemes require every client to see the same server list.
- **Weighted HRW** needs a score transform, not just a multiplier on the raw hash. A form that works is \`score = -w / ln(h)\` with \`h\` the hash scaled into (0, 1). In a separate quick simulation (200,000 random keys, weights 1 and 2), multiplying the hash by the weight split keys about 3 to 1, while the log form split them 2 to 1 as intended.
- **Caching the result.** HRW cost disappears when a client caches key-to-server results, but the cache must be invalidated on every membership change.

## Common Pitfalls

- **Calling HRW slow without saying at what N.** At 10 servers it is 10 hashes; it only matters at thousands of servers on a hot path.
- **Comparing HRW to a ring without vnodes.** The fair comparison is against a ring with enough tokens, which then needs a large table.
- **Forgetting that HRW gives replicas for free.** Top-k scores are a clean, ring-free replica placement.
- **Using jump hash for servers that fail at random.** It only supports adding and removing the highest-numbered bucket.
- **Claiming either scheme balances hot keys.** Both balance key counts, not per-key traffic.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two mechanisms:</strong> <span style="color:#f0e2c8;">A ring hashes servers to tokens and gives a key to the <strong style="color:#ffca28;">next token clockwise</strong>. Rendezvous hashing scores every server with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash(server, key)</code> and picks the <strong style="color:#ffca28;">highest</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What they share:</strong> <span style="color:#f0e2c8;">Both move only what must move: a join takes about 1/(N+1) of keys, a leave reassigns only that server's keys. In my run HRW moved <strong style="color:#ffca28;">1,814</strong> keys to a new 11th server against a fair 1,818.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where they differ:</strong> <span style="color:#f0e2c8;">HRW is balanced by construction (<strong style="color:#ffca28;">1.04x</strong> peak, no extra state) and its top-k scores give replica sets directly. A ring needs ~100 vnodes to reach <strong style="color:#ffca28;">1.18x</strong>, but costs <strong style="color:#ffca28;">1 hash + a binary search</strong> per lookup instead of <strong style="color:#ffca28;">N hashes</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scale:</strong> <span style="color:#f0e2c8;">Up to a few hundred servers HRW is simplest. At 1,000 servers that is 1,000 hashes per lookup against ~17 comparisons on a 100,000-entry ring, so for hot lookups use a ring, a skeleton HRW, or HRW offline to fill a table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Real example:</strong> <span style="color:#f0e2c8;">GitHub GLB Director fills a fixed forwarding table using rendezvous ordering, so each packet costs one hash and an index; jump hash is the memory-free option when servers are numbered.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is HRW consistent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A key only changes owner if the change involves its top scorer. Remove server X: only keys that ranked X first move, each to its runner-up. Add X: only keys where X now scores highest move, each from its previous owner to X.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get 3 replicas with each scheme?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">HRW: take the 3 highest scores. Ring: walk clockwise and take the next 3 distinct physical servers, skipping extra tokens of a server already chosen. In the run, removing one server from 10 changed 6,015 of 20,000 HRW replica sets, each by exactly one member.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your cluster has 5,000 cache servers and 2 million lookups per second. Which do you choose?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain HRW would be 10 billion hashes per second, so no. A ring with moderate vnodes, or HRW grouped into a skeleton, or HRW precomputed into a lookup table rebuilt on membership changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you weight servers of different sizes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Ring: proportionally more tokens. HRW: a weighted score such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-w / ln(h)</code> with the hash scaled into (0, 1). A plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w * h</code> does not give proportional shares; with weights 1 and 2 it splits keys about 3 to 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does jump consistent hash fit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It maps a key to a bucket number in 0..N−1 with no memory and near-perfect balance, but buckets can only be added or removed at the end. Good for numbered shards that only grow; not for arbitrary server failures.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rendezvous hashing (highest random weight, HRW) | Score every server for the key and pick the highest |
| Top-k selection | The k highest-scoring servers become the k replicas |
| Lookup cost | Work to map one key: ring O(log T) after one hash, HRW N hashes |
| Hierarchical (skeleton) rendezvous hashing | HRW over groups, then within the group, for about O(log N) per lookup |
| Precomputed lookup table | Run the mapping once per membership change, then index per request |

**Conclusion:** Ring consistent hashing and rendezvous hashing solve the same problem with the same minimal-movement guarantee, and differ in where they put the cost. HRW puts it in the lookup, N hashes per key, and in return needs no tokens, balances evenly (1.04x against the ring's 1.18x at 100 vnodes in the run) and yields replica sets from its top scores. The ring puts it in state, a table of N·V tokens, and in return answers with one hash and a binary search. Choose HRW for small and medium clusters, replica selection, or when lookups can be cached or precomputed into a table; choose a ring, a skeleton HRW or a precomputed table when thousands of servers meet a hot lookup path; and choose jump hash when servers are simply numbered.`,
    examples: [
      {
        label: `Ring vs rendezvous (HRW) hashing: balance, movement, work per lookup, replica sets`,
        variants: [
          { tech: "node", code: `// Ring (with and without vnodes) vs rendezvous / highest-random-weight hashing:
// balance, keys moved on join and leave, work per lookup, and replica sets.
function h32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
const x2 = (num, den) => { const v = Math.floor((num * 100) / den); return Math.floor(v / 100) + "." + String(v % 100).padStart(2, "0"); };
const KEYS = 20000;
const keys = []; for (let i = 0; i < KEYS; i++) keys.push("user:" + i);
const names = (n) => { const r = []; for (let i = 0; i < n; i++) r.push("node-" + i); return r; };
let steps = 0, hashCalls = 0;

function ring(nodes, v) {
  const r = [];
  for (const n of nodes) for (let t = 0; t < v; t++) r.push([h32(n + "#" + t), n]);
  r.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return (key) => {
    hashCalls++; const hk = h32(key);
    let lo = 0, hi = r.length;
    while (lo < hi) { steps++; const mid = (lo + hi) >> 1; if (r[mid][0] < hk) lo = mid + 1; else hi = mid; }
    return r[lo === r.length ? 0 : lo][1];
  };
}
function rank(nodes, key) { // every node gets a score for this key; highest wins
  hashCalls += nodes.length;
  return nodes.map((n) => [h32(n + "/" + key), n]).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1)).map((p) => p[1]);
}
const hrw = (nodes) => (key) => rank(nodes, key)[0];

const schemes = [["ring, 1 vnode", (ns) => ring(ns, 1), true], ["ring, 100 vnodes", (ns) => ring(ns, 100), true], ["rendezvous (HRW)", hrw, false]];
const ten = names(10), eleven = names(11), nine = ten.filter((n) => n !== "node-4");
console.log("10 nodes, 20000 keys (fair share 2000). Then add node-10, or remove node-4.");
console.log("scheme             busiest/fair  add: moved  to new node  remove: moved  receivers  hashes/lookup  search steps");
for (const [label, make, isRing] of schemes) {
  steps = 0; hashCalls = 0;
  const f10 = make(ten);
  const own = keys.map(f10);
  const perLookupHash = hashCalls / KEYS, perLookupSteps = isRing ? x2(steps, KEYS) : "-";
  const c = {}; for (const o of own) c[o] = (c[o] || 0) + 1;
  const busiest = Math.max(...Object.values(c));
  const f11 = make(eleven), f9 = make(nine);
  let addMoved = 0, toNew = 0, remMoved = 0; const recv = new Set();
  keys.forEach((k, i) => {
    const a = f11(k); if (a !== own[i]) { addMoved++; if (a === "node-10") toNew++; }
    const b = f9(k); if (b !== own[i]) { remMoved++; recv.add(b); }
  });
  console.log(\`\${label.padEnd(19)}\${(x2(busiest * 10, KEYS) + "x").padStart(12)}  \${String(addMoved).padStart(10)}  \${String(toNew).padStart(11)}  \${String(remMoved).padStart(13)}  \${String(recv.size).padStart(9)}  \${String(perLookupHash).padStart(13)}  \${perLookupSteps.padStart(12)}\`);
}

console.log("\\nReplica sets with HRW: the top 3 scores are the 3 replicas.");
let sample = 0; while (!rank(ten, "user:" + sample).slice(0, 3).includes("node-4")) sample++;
console.log(\`  user:\${sample} on 10 nodes:     \` + rank(ten, "user:" + sample).slice(0, 3).join(", "));
console.log(\`  user:\${sample} without node-4: \` + rank(nine, "user:" + sample).slice(0, 3).join(", "));
let changed = 0, oneSwap = 0;
for (const k of keys) {
  const a = rank(ten, k).slice(0, 3), b = rank(nine, k).slice(0, 3);
  if (a.join() !== b.join()) { changed++; if (a.filter((n) => !b.includes(n)).length === 1) oneSwap++; }
}
console.log(\`  removing node-4 changed \${changed} of \${KEYS} replica sets; \${oneSwap} of them swapped exactly one member\`);

console.log("\\nWork per lookup as the cluster grows (ring with 100 vnodes per node):");
console.log("nodes   HRW hashes  ring entries  ring search steps");
for (const n of [10, 100, 1000, 10000]) {
  let s = 0; while ((1 << s) < n * 100) s++;
  console.log(\`\${String(n).padEnd(8)}\${String(n).padStart(10)}  \${String(n * 100).padStart(12)}  \${String(s).padStart(17)}\`);
}` },
          { tech: "python", code: `# Ring (with and without vnodes) vs rendezvous / highest-random-weight hashing:
# balance, keys moved on join and leave, work per lookup, and replica sets.
M = 0xFFFFFFFF


def h32(s):
    h = 0x811C9DC5
    for ch in s.encode():
        h ^= ch
        h = (h * 0x01000193) & M
    h ^= h >> 16
    h = (h * 0x85EBCA6B) & M
    h ^= h >> 13
    h = (h * 0xC2B2AE35) & M
    h ^= h >> 16
    return h


def x2(num, den):
    v = num * 100 // den
    return f"{v // 100}.{v % 100:02d}"


KEYS = 20000
keys = [f"user:{i}" for i in range(KEYS)]
names = lambda n: [f"node-{i}" for i in range(n)]
stats = {"steps": 0, "hashes": 0}


def ring(nodes, v):
    r = sorted((h32(f"{n}#{t}"), n) for n in nodes for t in range(v))

    def lookup(key):
        stats["hashes"] += 1
        hk = h32(key)
        lo, hi = 0, len(r)
        while lo < hi:
            stats["steps"] += 1
            mid = (lo + hi) >> 1
            if r[mid][0] < hk:
                lo = mid + 1
            else:
                hi = mid
        return r[0 if lo == len(r) else lo][1]

    return lookup


def rank(nodes, key):  # every node gets a score for this key; highest wins
    stats["hashes"] += len(nodes)
    return [n for _, n in sorted(((h32(f"{n}/{key}"), n) for n in nodes), key=lambda p: (-p[0], p[1]))]


def hrw(nodes):
    return lambda key: rank(nodes, key)[0]


schemes = [("ring, 1 vnode", lambda ns: ring(ns, 1), True), ("ring, 100 vnodes", lambda ns: ring(ns, 100), True),
           ("rendezvous (HRW)", hrw, False)]
ten, eleven = names(10), names(11)
nine = [n for n in ten if n != "node-4"]
print("10 nodes, 20000 keys (fair share 2000). Then add node-10, or remove node-4.")
print("scheme             busiest/fair  add: moved  to new node  remove: moved  receivers  hashes/lookup  search steps")
for label, make, is_ring in schemes:
    stats["steps"] = stats["hashes"] = 0
    f10 = make(ten)
    own = [f10(k) for k in keys]
    per_hash = stats["hashes"] // KEYS
    per_steps = x2(stats["steps"], KEYS) if is_ring else "-"
    c = {}
    for o in own:
        c[o] = c.get(o, 0) + 1
    busiest = max(c.values())
    f11, f9 = make(eleven), make(nine)
    add_moved = to_new = rem_moved = 0
    recv = set()
    for i, k in enumerate(keys):
        a = f11(k)
        if a != own[i]:
            add_moved += 1
            if a == "node-10":
                to_new += 1
        b = f9(k)
        if b != own[i]:
            rem_moved += 1
            recv.add(b)
    print(f"{label:<19}{x2(busiest * 10, KEYS) + 'x':>12}  {add_moved:>10}  {to_new:>11}  {rem_moved:>13}  {len(recv):>9}  {per_hash:>13}  {per_steps:>12}")

print("\\nReplica sets with HRW: the top 3 scores are the 3 replicas.")
sample = 0
while "node-4" not in rank(ten, f"user:{sample}")[:3]:
    sample += 1
print(f"  user:{sample} on 10 nodes:     " + ", ".join(rank(ten, f"user:{sample}")[:3]))
print(f"  user:{sample} without node-4: " + ", ".join(rank(nine, f"user:{sample}")[:3]))
changed = one_swap = 0
for k in keys:
    a, b = rank(ten, k)[:3], rank(nine, k)[:3]
    if a != b:
        changed += 1
        if len([n for n in a if n not in b]) == 1:
            one_swap += 1
print(f"  removing node-4 changed {changed} of {KEYS} replica sets; {one_swap} of them swapped exactly one member")

print("\\nWork per lookup as the cluster grows (ring with 100 vnodes per node):")
print("nodes   HRW hashes  ring entries  ring search steps")
for n in [10, 100, 1000, 10000]:
    s = 0
    while (1 << s) < n * 100:
        s += 1
    print(f"{n:<8}{n:>10}  {n * 100:>12}  {s:>17}")` },
          { tech: "go", code: `// Ring (with and without vnodes) vs rendezvous / highest-random-weight hashing:
// balance, keys moved on join and leave, work per lookup, and replica sets.
package main

import (
	"fmt"
	"sort"
	"strings"
)

func h32(s string) uint32 {
	h := uint32(0x811c9dc5)
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 0x01000193
	}
	h ^= h >> 16
	h *= 0x85ebca6b
	h ^= h >> 13
	h *= 0xc2b2ae35
	h ^= h >> 16
	return h
}

func x2(num, den int) string {
	v := num * 100 / den
	return fmt.Sprintf("%d.%02d", v/100, v%100)
}

const KEYS = 20000

var steps, hashCalls int

type point struct {
	pos  uint32
	name string
}

func names(n int) []string {
	r := []string{}
	for i := 0; i < n; i++ {
		r = append(r, fmt.Sprintf("node-%d", i))
	}
	return r
}

func ring(nodes []string, v int) func(string) string {
	r := []point{}
	for _, n := range nodes {
		for t := 0; t < v; t++ {
			r = append(r, point{h32(fmt.Sprintf("%s#%d", n, t)), n})
		}
	}
	sort.Slice(r, func(a, b int) bool {
		if r[a].pos != r[b].pos {
			return r[a].pos < r[b].pos
		}
		return r[a].name < r[b].name
	})
	return func(key string) string {
		hashCalls++
		hk := h32(key)
		lo, hi := 0, len(r)
		for lo < hi {
			steps++
			mid := (lo + hi) >> 1
			if r[mid].pos < hk {
				lo = mid + 1
			} else {
				hi = mid
			}
		}
		if lo == len(r) {
			lo = 0
		}
		return r[lo].name
	}
}

// every node gets a score for this key; highest wins
func rank(nodes []string, key string) []string {
	hashCalls += len(nodes)
	ps := []point{}
	for _, n := range nodes {
		ps = append(ps, point{h32(n + "/" + key), n})
	}
	sort.Slice(ps, func(a, b int) bool {
		if ps[a].pos != ps[b].pos {
			return ps[a].pos > ps[b].pos
		}
		return ps[a].name < ps[b].name
	})
	out := []string{}
	for _, p := range ps {
		out = append(out, p.name)
	}
	return out
}

func hrw(nodes []string) func(string) string {
	return func(key string) string { return rank(nodes, key)[0] }
}

func contains(xs []string, x string) bool {
	for _, y := range xs {
		if y == x {
			return true
		}
	}
	return false
}

func main() {
	keys := []string{}
	for i := 0; i < KEYS; i++ {
		keys = append(keys, fmt.Sprintf("user:%d", i))
	}
	ten, eleven := names(10), names(11)
	nine := []string{}
	for _, n := range ten {
		if n != "node-4" {
			nine = append(nine, n)
		}
	}
	type scheme struct {
		label  string
		make   func([]string) func(string) string
		isRing bool
	}
	schemes := []scheme{
		{"ring, 1 vnode", func(ns []string) func(string) string { return ring(ns, 1) }, true},
		{"ring, 100 vnodes", func(ns []string) func(string) string { return ring(ns, 100) }, true},
		{"rendezvous (HRW)", hrw, false},
	}
	fmt.Println("10 nodes, 20000 keys (fair share 2000). Then add node-10, or remove node-4.")
	fmt.Println("scheme             busiest/fair  add: moved  to new node  remove: moved  receivers  hashes/lookup  search steps")
	for _, s := range schemes {
		steps, hashCalls = 0, 0
		f10 := s.make(ten)
		own := []string{}
		for _, k := range keys {
			own = append(own, f10(k))
		}
		perHash := hashCalls / KEYS
		perSteps := "-"
		if s.isRing {
			perSteps = x2(steps, KEYS)
		}
		c := map[string]int{}
		busiest := 0
		for _, o := range own {
			c[o]++
			if c[o] > busiest {
				busiest = c[o]
			}
		}
		f11, f9 := s.make(eleven), s.make(nine)
		addMoved, toNew, remMoved := 0, 0, 0
		recv := map[string]bool{}
		for i, k := range keys {
			if a := f11(k); a != own[i] {
				addMoved++
				if a == "node-10" {
					toNew++
				}
			}
			if b := f9(k); b != own[i] {
				remMoved++
				recv[b] = true
			}
		}
		fmt.Printf("%-19s%12s  %10d  %11d  %13d  %9d  %13d  %12s\\n", s.label, x2(busiest*10, KEYS)+"x", addMoved, toNew, remMoved, len(recv), perHash, perSteps)
	}

	fmt.Println("\\nReplica sets with HRW: the top 3 scores are the 3 replicas.")
	sample := 0
	for !contains(rank(ten, fmt.Sprintf("user:%d", sample))[:3], "node-4") {
		sample++
	}
	sk := fmt.Sprintf("user:%d", sample)
	fmt.Printf("  %s on 10 nodes:     %s\\n", sk, strings.Join(rank(ten, sk)[:3], ", "))
	fmt.Printf("  %s without node-4: %s\\n", sk, strings.Join(rank(nine, sk)[:3], ", "))
	changed, oneSwap := 0, 0
	for _, k := range keys {
		a, b := rank(ten, k)[:3], rank(nine, k)[:3]
		if strings.Join(a, ",") != strings.Join(b, ",") {
			changed++
			gone := 0
			for _, n := range a {
				if !contains(b, n) {
					gone++
				}
			}
			if gone == 1 {
				oneSwap++
			}
		}
	}
	fmt.Printf("  removing node-4 changed %d of %d replica sets; %d of them swapped exactly one member\\n", changed, KEYS, oneSwap)

	fmt.Println("\\nWork per lookup as the cluster grows (ring with 100 vnodes per node):")
	fmt.Println("nodes   HRW hashes  ring entries  ring search steps")
	for _, n := range []int{10, 100, 1000, 10000} {
		s := 0
		for (1 << s) < n*100 {
			s++
		}
		fmt.Printf("%-8d%10d  %12d  %17d\\n", n, n, n*100, s)
	}
}` },
          { tech: "java", code: `// Ring (with and without vnodes) vs rendezvous / highest-random-weight hashing:
// balance, keys moved on join and leave, work per lookup, and replica sets.
import java.util.*;
import java.util.function.Function;

public class Main {
    static long h32(String s) {
        int h = 0x811c9dc5;
        for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h *= 0x01000193; }
        h ^= h >>> 16; h *= 0x85ebca6b; h ^= h >>> 13; h *= 0xc2b2ae35; h ^= h >>> 16;
        return Integer.toUnsignedLong(h);
    }

    static String x2(long num, long den) {
        long v = num * 100 / den;
        return String.format("%d.%02d", v / 100, v % 100);
    }

    static final int KEYS = 20000;
    static long steps = 0, hashCalls = 0;

    record Point(long pos, String name) {}

    static List<String> names(int n) {
        List<String> r = new ArrayList<>();
        for (int i = 0; i < n; i++) r.add("node-" + i);
        return r;
    }

    static Function<String, String> ring(List<String> nodes, int v) {
        List<Point> r = new ArrayList<>();
        for (String n : nodes) for (int t = 0; t < v; t++) r.add(new Point(h32(n + "#" + t), n));
        r.sort(Comparator.comparingLong(Point::pos).thenComparing(Point::name));
        long[] pos = new long[r.size()];
        for (int i = 0; i < pos.length; i++) pos[i] = r.get(i).pos();
        return key -> {
            hashCalls++;
            long hk = h32(key);
            int lo = 0, hi = pos.length;
            while (lo < hi) { steps++; int mid = (lo + hi) >>> 1; if (pos[mid] < hk) lo = mid + 1; else hi = mid; }
            return r.get(lo == pos.length ? 0 : lo).name();
        };
    }

    // every node gets a score for this key; highest wins
    static List<String> rank(List<String> nodes, String key) {
        hashCalls += nodes.size();
        List<Point> ps = new ArrayList<>();
        for (String n : nodes) ps.add(new Point(h32(n + "/" + key), n));
        ps.sort((a, b) -> a.pos() != b.pos() ? Long.compare(b.pos(), a.pos()) : a.name().compareTo(b.name()));
        List<String> out = new ArrayList<>();
        for (Point p : ps) out.add(p.name());
        return out;
    }

    static Function<String, String> hrw(List<String> nodes) { return key -> rank(nodes, key).get(0); }

    public static void main(String[] args) {
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < KEYS; i++) keys.add("user:" + i);
        List<String> ten = names(10), eleven = names(11), nine = new ArrayList<>(ten);
        nine.remove("node-4");
        String[] labels = {"ring, 1 vnode", "ring, 100 vnodes", "rendezvous (HRW)"};
        List<Function<List<String>, Function<String, String>>> makers = List.of(ns -> ring(ns, 1), ns -> ring(ns, 100), Main::hrw);
        System.out.println("10 nodes, 20000 keys (fair share 2000). Then add node-10, or remove node-4.");
        System.out.println("scheme             busiest/fair  add: moved  to new node  remove: moved  receivers  hashes/lookup  search steps");
        for (int s = 0; s < 3; s++) {
            steps = 0; hashCalls = 0;
            Function<String, String> f10 = makers.get(s).apply(ten);
            List<String> own = new ArrayList<>();
            for (String k : keys) own.add(f10.apply(k));
            long perHash = hashCalls / KEYS;
            String perSteps = s < 2 ? x2(steps, KEYS) : "-";
            Map<String, Integer> c = new HashMap<>();
            for (String o : own) c.merge(o, 1, Integer::sum);
            int busiest = Collections.max(c.values());
            Function<String, String> f11 = makers.get(s).apply(eleven), f9 = makers.get(s).apply(nine);
            int addMoved = 0, toNew = 0, remMoved = 0;
            Set<String> recv = new HashSet<>();
            for (int i = 0; i < KEYS; i++) {
                String a = f11.apply(keys.get(i));
                if (!a.equals(own.get(i))) { addMoved++; if (a.equals("node-10")) toNew++; }
                String b = f9.apply(keys.get(i));
                if (!b.equals(own.get(i))) { remMoved++; recv.add(b); }
            }
            System.out.printf("%-19s%12s  %10d  %11d  %13d  %9d  %13d  %12s%n", labels[s], x2(busiest * 10L, KEYS) + "x", addMoved, toNew, remMoved, recv.size(), perHash, perSteps);
        }

        System.out.println("\\nReplica sets with HRW: the top 3 scores are the 3 replicas.");
        int sample = 0;
        while (!rank(ten, "user:" + sample).subList(0, 3).contains("node-4")) sample++;
        String sk = "user:" + sample;
        System.out.println("  " + sk + " on 10 nodes:     " + String.join(", ", rank(ten, sk).subList(0, 3)));
        System.out.println("  " + sk + " without node-4: " + String.join(", ", rank(nine, sk).subList(0, 3)));
        int changed = 0, oneSwap = 0;
        for (String k : keys) {
            List<String> a = rank(ten, k).subList(0, 3), b = rank(nine, k).subList(0, 3);
            if (!a.equals(b)) {
                changed++;
                int gone = 0;
                for (String n : a) if (!b.contains(n)) gone++;
                if (gone == 1) oneSwap++;
            }
        }
        System.out.printf("  removing node-4 changed %d of %d replica sets; %d of them swapped exactly one member%n", changed, KEYS, oneSwap);

        System.out.println("\\nWork per lookup as the cluster grows (ring with 100 vnodes per node):");
        System.out.println("nodes   HRW hashes  ring entries  ring search steps");
        for (int n : new int[]{10, 100, 1000, 10000}) {
            int s = 0;
            while ((1L << s) < n * 100L) s++;
            System.out.printf("%-8d%10d  %12d  %17d%n", n, n, n * 100, s);
        }
    }
}` },
        ],
      },
    ],
  },
  {
    title: `What is a read/write quorum?`,
    difficulty: "medium",
    seoDescription: `Read/write quorums explained and measured: why W + R > N makes reads see the latest write, availability per setting, read repair and sloppy quorums.`,
    description: `**Question presented to candidate:**
"In a replicated key-value store like Dynamo or Cassandra, each key lives on N replicas, and you configure how many must acknowledge a write (W) and answer a read (R). What is a quorum, why does W + R > N matter, and how would you set W and R for different workloads?"

**What a strong answer should cover:**
- Definitions: **N** replicas per key, a write succeeds after **W** acknowledgements, a read waits for **R** answers and returns the newest **version**
- The overlap rule: **W + R > N** forces every read set to share at least one replica with every write set, so a read meets the latest acknowledged write
- The trade-off: lower W or R means faster, more available operations and possible **stale reads**; the common default is a **majority** for both (N=3, W=2, R=2), which survives one failure
- How replicas converge: **read repair**, anti-entropy, and versions (timestamps or vector clocks) to pick the winner
- Limits: **sloppy quorums** with hinted handoff break the overlap guarantee; quorums alone are not linearizable under concurrent or partially failed writes
- Real knobs: Cassandra \`ONE\`, \`QUORUM\` (floor of RF/2, plus 1), \`LOCAL_QUORUM\`, \`ALL\`

**Code / implementation expected:** Optional — the overlap rule and availability table matter most; the example enumerates every write and read set for N=3.`,
    answer: `**Target Audience:** Beginners to distributed systems who know that databases can keep copies of data on several machines.
**Difficulty:** Medium
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). Cassandra consistency levels are cited from the DataStax Cassandra documentation; Dynamo techniques from the Dynamo paper (SOSP 2007) as summarised in course material.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Numbers come from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

Three friends each keep a copy of the group's holiday plan. When the plan changes, you text the change, but you only wait until **two** of them reply "got it" before you move on; the third may be on a plane. Later, someone wants to know the current plan. They ask **two** friends and trust the newer of the two answers.

Because two plus two is more than three, the two people you asked must include at least one of the two who confirmed the change. You cannot pick two friends who both missed it, so you always see the latest plan, even though one copy is out of date.

If you had waited for only one reply, and later asked only one friend, you could easily ask someone who never got the update. That is the whole idea of a quorum: choose how many copies must agree on the way in and on the way out, so the two groups are forced to overlap.

## 2. The Three Numbers

📌 **Interview term: replication factor (N)** — how many replicas store each key. N=3 is the usual choice.

📌 **Interview term: write quorum (W)** — how many replicas must acknowledge a write before the client is told it succeeded. The write is still sent to all N; W only decides when to stop waiting.

📌 **Interview term: read quorum (R)** — how many replicas must answer a read. The coordinator compares their **versions** and returns the newest.

📌 **Interview term: quorum intersection (W + R > N)** — if W + R is larger than N, any set of W replicas and any set of R replicas share at least one member, by counting: there are not enough replicas for the two sets to be disjoint. That shared replica holds the latest acknowledged write, and the newest-version rule makes the read return it.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Three replicas; the write reached r1 and r2, the read asked r2 and r3, and r2 is in both sets">
  <rect class="d-box-accent" x="60" y="110" width="150" height="70" rx="10"/>
  <text class="d-text" x="135" y="140" text-anchor="middle">r1</text>
  <text class="d-sub" x="135" y="162" text-anchor="middle">v2 green</text>
  <rect class="d-box-accent" x="285" y="110" width="150" height="70" rx="10"/>
  <text class="d-text" x="360" y="140" text-anchor="middle">r2</text>
  <text class="d-sub" x="360" y="162" text-anchor="middle">v2 green</text>
  <rect class="d-box-muted" x="510" y="110" width="150" height="70" rx="10"/>
  <text class="d-text" x="585" y="140" text-anchor="middle">r3</text>
  <text class="d-sub" x="585" y="162" text-anchor="middle">v1 blue</text>
  <path class="d-edge-accent" d="M 60 80 L 435 80"/>
  <text class="d-accent" x="248" y="60" text-anchor="middle">write set W = 2</text>
  <path class="d-edge-dashed" d="M 285 210 L 660 210"/>
  <text class="d-sub" x="472" y="240" text-anchor="middle">read set R = 2</text>
</svg>

The write reached r1 and r2; the read asked r2 and r3. They overlap on r2, which returns v2, and v2 beats r3's v1 by version.

## 3. Measured: Every Write Set Against Every Read Set

The example starts with all three replicas holding v1, writes v2 to exactly W replicas, then reads from R replicas. It tries **every** possible write set and **every** possible read set:

~~~text
1) All replicas hold v1=blue. Then v2=green is written to exactly W replicas.
   Every possible write set x every possible read set:
W  R  W+R>N  stale reads
1  1  false  6 of 9
1  2  false  3 of 9
2  1  false  3 of 9
2  2  true   0 of 9
3  1  true   0 of 3
1  3  true   0 of 3
~~~

- **W=1, R=1:** 6 of the 9 combinations read stale data. A read only sees the new value if it happens to ask the one replica that took the write.
- **W=1, R=2** and **W=2, R=1:** W + R = 3 is not greater than N, and 3 of 9 combinations are stale. Close is not enough.
- **W=2, R=2**, **W=3, R=1**, **W=1, R=3:** W + R > N and **0** combinations are stale. The rule holds for every possible choice of replicas.

📌 **Interview term: stale read** — a read that returns an older version than the latest acknowledged write. With W + R ≤ N it is possible whenever the read set misses the write set.

## 4. Measured: What Each Setting Costs in Availability

A quorum also has to be reachable. With some replicas down, an operation succeeds only if at least W (or R) replicas are up:

~~~text
2) Availability: can the operation still reach enough replicas?
W  R  1 down: write/read   2 down: write/read
1  1  ok/ok                ok/ok
1  2  ok/ok                ok/FAIL
2  1  ok/ok                FAIL/ok
2  2  ok/ok                FAIL/FAIL
3  1  FAIL/ok              FAIL/ok
1  3  ok/FAIL              ok/FAIL
~~~

- **W=2, R=2** survives **one** failure for both reads and writes; with two down, both fail. That is why N=3 with majority quorums is the common default: it tolerates one replica down, for maintenance or a crash.
- **W=3, R=1** gives the cheapest reads, but a single dead replica blocks **all writes**.
- **W=1, R=3** is the mirror image: writes always succeed, a single dead replica blocks reads.
- **W=1, R=1** is always available here and gives up the overlap guarantee completely.

Latency follows the same logic: a coordinator that needs W acknowledgements waits for the W-th fastest replica, so W=2 of 3 ignores the slowest replica and W=3 waits for it.

📌 **Interview term: majority quorum** — W and R both equal to floor(N/2) + 1. Any two majorities overlap, and a majority remains reachable as long as fewer than half of the replicas are down. Consensus protocols such as Raft and Paxos rely on the same majority-overlap argument; see [What is leader election in distributed systems?](/interview-question/what-is-leader-election-in-distributed-systems).

## 5. How Stale Replicas Catch Up

A W=2 write leaves one replica behind. Something must fix it, or the system gets one failure away from losing the latest value.

~~~text
3) N=3, W=2, R=2 with read repair.
   after write v2 (r3 missed it): r1=v2:green r2=v2:green r3=v1:blue
   read from r2,r3 -> v2:green (r3 answered v1, newer version wins)
   after read repair:              r1=v2:green r2=v2:green r3=v2:green
~~~

📌 **Interview term: read repair** — when a read sees replicas with different versions, the coordinator writes the newest version back to the stale ones. Above, the read from r2 and r3 returned v2 and then repaired r3.

📌 **Interview term: anti-entropy** — a background process that compares replicas and copies missing data, so keys that are never read still converge. Dynamo uses Merkle trees (hash trees of key ranges) to find differences without comparing every key.

📌 **Interview term: version (timestamp or vector clock)** — what lets a reader decide which answer is newer. Cassandra uses per-write timestamps with last-write-wins; the Dynamo paper used vector clocks and could return conflicting siblings for the application to merge.

## 6. Sloppy Quorums: Availability First

When too many of a key's home replicas are down, a strict quorum write fails. Dynamo-style stores can instead accept the write on other healthy nodes:

~~~text
4) Sloppy quorum: r1 and r2 are down, W=2.
   strict quorum write v3: FAIL, only 1 of the 3 home replicas is up
   sloppy quorum write v3: ok, stored on r3 and on stand-in node h4 with a hint for r1
   r1 and r2 recover; read from r1,r2 -> v2:green (stale: the overlap was on h4, not a home replica)
   hinted handoff h4 -> r1; read from r1,r2 -> v3:red
~~~

📌 **Interview term: sloppy quorum** — counting acknowledgements from any W healthy nodes, not only the key's N home replicas, so writes stay available during failures.

📌 **Interview term: hinted handoff** — the stand-in node stores the write with a hint naming the intended replica and delivers it when that replica recovers.

The run shows the price: after r1 and r2 came back, a two-replica read from r1 and r2 returned the old v2, because the "overlap" was on stand-in node h4, which is not a home replica. Only after the hinted handoff did reads see v3. A sloppy quorum keeps writes available but **suspends the W + R > N guarantee** until the hints are delivered.

## 7. In Real Systems

Apache Cassandra exposes quorums as per-request **consistency levels**. The DataStax documentation defines \`QUORUM\` as the sum of replication factors across datacenters, divided by 2, plus 1, rounded down: with RF=3 that is 2 replicas, with RF=6 it is 4. \`LOCAL_QUORUM\` uses only the replication factor of the coordinator datacenter, so with two datacenters of RF=3 each, \`QUORUM\` needs 4 acknowledgements but \`LOCAL_QUORUM\` needs 2 local ones and avoids a cross-region round trip. \`ONE\` and \`ALL\` are the extremes.

Typical settings:

| Goal | Setting (N=3) | Effect |
| :--- | :--- | :--- |
| Read-your-writes, survive one failure | W=2, R=2 | the default for most data |
| Very fast reads, rare writes | W=3, R=1 | one dead replica blocks writes |
| Always accept writes (logs, metrics) | W=1, R=1 | stale reads possible; rely on repair |
| Multi-region, low latency | \`LOCAL_QUORUM\` both ways | consistent within a region, not across regions |

Where quorums fit in the bigger picture is covered in [What is the difference between strong and eventual consistency?](/interview-question/what-is-the-difference-between-strong-and-eventual-consistency), [What is the CAP theorem?](/interview-question/what-is-the-cap-theorem) and [What is database replication?](/interview-question/what-is-database-replication); a full design that uses them is [How would you design a distributed key-value store?](/interview-question/how-would-you-design-a-distributed-key-value-store).

## 8. What W + R > N Does Not Give You

- **Not linearizability on its own.** If a write is in flight, one reader can see the new value from an overlapping replica while a second reader, a moment later, hits a different quorum that has not received it yet. Read repair that completes before returning narrows this, but strict linearizability needs more (for example a consensus protocol).
- **Failed writes can still appear.** A write that reached only one replica and then reported failure to the client is not rolled back; a later read may return it.
- **Concurrent writes conflict.** Two clients writing the same key at once both succeed on overlapping quorums; last-write-wins silently drops one, and clock skew decides which.
- **Membership changes.** While replicas are being added or moved, "the N replicas" of a key are briefly ambiguous.

## 9. Verified: Running the Code

The example **"N=3 quorums: stale reads for every W and R, availability under failures, read repair, sloppy quorum"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and \`javac Main.java && java Main\` (Java 21). All four print exactly this:

~~~text
1) All replicas hold v1=blue. Then v2=green is written to exactly W replicas.
   Every possible write set x every possible read set:
W  R  W+R>N  stale reads
1  1  false  6 of 9
1  2  false  3 of 9
2  1  false  3 of 9
2  2  true   0 of 9
3  1  true   0 of 3
1  3  true   0 of 3

2) Availability: can the operation still reach enough replicas?
W  R  1 down: write/read   2 down: write/read
1  1  ok/ok                ok/ok
1  2  ok/ok                ok/FAIL
2  1  ok/ok                FAIL/ok
2  2  ok/ok                FAIL/FAIL
3  1  FAIL/ok              FAIL/ok
1  3  ok/FAIL              ok/FAIL

3) N=3, W=2, R=2 with read repair.
   after write v2 (r3 missed it): r1=v2:green r2=v2:green r3=v1:blue
   read from r2,r3 -> v2:green (r3 answered v1, newer version wins)
   after read repair:              r1=v2:green r2=v2:green r3=v2:green

4) Sloppy quorum: r1 and r2 are down, W=2.
   strict quorum write v3: FAIL, only 1 of the 3 home replicas is up
   sloppy quorum write v3: ok, stored on r3 and on stand-in node h4 with a hint for r1
   r1 and r2 recover; read from r1,r2 -> v2:green (stale: the overlap was on h4, not a home replica)
   hinted handoff h4 -> r1; read from r1,r2 -> v3:red
~~~

The heart of a quorum read is one loop that keeps the highest version:

~~~js
function read(reps, set) { // newest version among the replicas that answered
  let best = null;
  for (const i of set) if (best === null || reps[i].version > best.version) best = reps[i];
  return best;
}
~~~

What the simulation stands for and leaves out: replicas are in-memory objects, "down" and "missed the write" are chosen explicitly, and versions are integers rather than timestamps or vector clocks. There is no network, no timeout and no concurrency, so section 8's anomalies are explained, not simulated. The sloppy-quorum stand-in node h4 is modelled only by its hint.

## Edge Cases Worth Knowing

- **N counts replicas of a key, not servers in the cluster.** A 100-node cluster with RF=3 has N=3 for every key.
- **Even N.** With N=4, a majority is 3, so a 4th replica adds storage cost without tolerating an extra failure; odd N is preferred.
- **Multi-datacenter QUORUM is slow.** It needs acknowledgements across regions; \`LOCAL_QUORUM\` keeps the overlap within a region.
- **R=1 is often fine** for data written once and never changed, such as immutable blobs addressed by hash.
- **Tombstones.** Deletes are writes of a delete marker; if repair does not run before markers expire, a stale replica can bring deleted data back.

## Common Pitfalls

- **Thinking W=1, R=2 is "almost" safe.** W + R = N gave 3 stale combinations of 9 in the run; the inequality must be strict.
- **Setting W=N for safety.** One dead replica then blocks every write.
- **Forgetting repair.** Without read repair or anti-entropy, the replica that missed a write stays stale until the next failure makes it matter.
- **Assuming sloppy quorums keep the guarantee.** The run returned stale v2 until hinted handoff delivered v3.
- **Equating quorum with strong consistency.** In-flight, failed and concurrent writes still produce anomalies.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definitions:</strong> <span style="color:#f0e2c8;">Each key has <strong style="color:#ffca28;">N</strong> replicas. A write succeeds after <strong style="color:#ffca28;">W</strong> acknowledgements; a read waits for <strong style="color:#ffca28;">R</strong> answers and returns the newest version.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The rule:</strong> <span style="color:#f0e2c8;">If <strong style="color:#ffca28;">W + R &gt; N</strong>, every read set overlaps every write set, so a read always meets the latest acknowledged write. For N=3 my run tried every combination: W=2, R=2 gave <strong style="color:#ffca28;">0 of 9</strong> stale reads, W=1, R=1 gave <strong style="color:#ffca28;">6 of 9</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Trade-off:</strong> <span style="color:#f0e2c8;">Lower W or R means lower latency and more availability. W=2, R=2 survives one failure for both; W=3, R=1 makes reads cheap but one dead replica blocks all writes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Convergence:</strong> <span style="color:#f0e2c8;">Replicas that missed a write are fixed by <strong style="color:#ffca28;">read repair</strong> and background <strong style="color:#ffca28;">anti-entropy</strong> (Merkle trees in Dynamo), using versions to pick the winner.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Sloppy quorums</strong> with hinted handoff keep writes available but suspend the overlap guarantee, and quorums alone are not linearizable under concurrent or partially failed writes. In Cassandra the knobs are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ONE</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">QUORUM</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOCAL_QUORUM</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ALL</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does W + R &gt; N guarantee overlap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By counting. If the W replicas and the R replicas were disjoint, there would be at least W + R distinct replicas, which is more than N. So at least one replica is in both sets, and it has the latest acknowledged write.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you set for a shopping cart, and for a metrics stream?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cart: N=3, W=2, R=2 so users read their own writes and one replica can be down. Metrics: W=1, R=1 because availability and write speed matter more than reading the very latest point, and repair converges replicas later.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a sloppy quorum, and what does it cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Writes count acknowledgements from any healthy nodes, not only the home replicas, and stand-ins hold hints to deliver later. It keeps writes available during failures but a read from the home replicas can be stale until handoff completes, as the run showed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is QUORUM in Cassandra strongly consistent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It gives read-your-writes when both reads and writes use QUORUM, because the sets overlap. It is not linearizable: concurrent writes resolve by timestamp (last-write-wins), and a failed write that reached one replica may still appear. Lightweight transactions use Paxos when you need compare-and-set.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do quorums behave across two datacenters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">QUORUM</code> counts replicas in all datacenters, so with RF=3 in each it needs 4 acknowledgements and crosses regions. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOCAL_QUORUM</code> needs 2 in the local datacenter, which is fast and consistent within a region but not across regions.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Replication factor (N) | How many replicas store each key |
| Write quorum (W) | Acknowledgements needed before a write succeeds |
| Read quorum (R) | Replies needed before a read returns the newest version |
| Quorum intersection (W + R > N) | Any write set and any read set share a replica |
| Stale read | A read that returns an older version than the latest acknowledged write |
| Majority quorum | W and R both floor(N/2) + 1 |
| Read repair | Writing the newest version back to stale replicas seen during a read |
| Anti-entropy | Background comparison and repair of replicas |
| Version (timestamp or vector clock) | What decides which replica answer is newer |
| Sloppy quorum | Counting acknowledgements from any healthy nodes during failures |
| Hinted handoff | A stand-in node later delivering a write to its intended replica |

**Conclusion:** A quorum is a counting trick: store each key on N replicas, wait for W of them on writes and R of them on reads, and if W + R > N the two groups must share a replica that holds the latest acknowledged write. The run confirmed it for every combination on three replicas, and showed the other side of the dial: each choice of W and R decides how many failures reads and writes survive and how slow they are. Real stores add read repair and anti-entropy to converge the replicas a quorum leaves behind, and sloppy quorums to stay writable during failures, at the cost of the overlap guarantee. Know the inequality, the availability table and the limits, and you can set W and R for any workload.`,
    examples: [
      {
        label: `N=3 quorums: stale reads for every W and R, availability under failures, read repair, sloppy quorum`,
        variants: [
          { tech: "node", code: `// Read/write quorums on N = 3 replicas: when W + R > N a read always meets the newest write.
// Replicas are in-process objects {version, value}; "down" and "missed the write" are flags.
const N = 3;
const names = ["r1", "r2", "r3"];
function subsets(k) { // every set of k replica indexes, in lexicographic order
  const out = [];
  const go = (start, cur) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = start; i < N; i++) { cur.push(i); go(i + 1, cur); cur.pop(); } };
  go(0, []); return out;
}
function read(reps, set) { // newest version among the replicas that answered
  let best = null;
  for (const i of set) if (best === null || reps[i].version > best.version) best = reps[i];
  return best;
}
const configs = [[1, 1], [1, 2], [2, 1], [2, 2], [3, 1], [1, 3]];

console.log("1) All replicas hold v1=blue. Then v2=green is written to exactly W replicas.");
console.log("   Every possible write set x every possible read set:");
console.log("W  R  W+R>N  stale reads");
for (const [W, R] of configs) {
  let stale = 0, total = 0;
  for (const ws of subsets(W)) for (const rs of subsets(R)) {
    const reps = names.map((_, i) => (ws.includes(i) ? { version: 2, value: "green" } : { version: 1, value: "blue" }));
    total++; if (read(reps, rs).version !== 2) stale++;
  }
  console.log(\`\${W}  \${R}  \${String(W + R > N).padEnd(5)}  \${stale} of \${total}\`);
}

console.log("\\n2) Availability: can the operation still reach enough replicas?");
console.log("W  R  1 down: write/read   2 down: write/read");
for (const [W, R] of configs) {
  const ok = (need, down) => (N - down >= need ? "ok" : "FAIL");
  console.log(\`\${W}  \${R}  \${(ok(W, 1) + "/" + ok(R, 1)).padEnd(19)}  \${ok(W, 2)}/\${ok(R, 2)}\`);
}

const show = (reps) => reps.map((r, i) => \`\${names[i]}=v\${r.version}:\${r.value}\`).join(" ");
console.log("\\n3) N=3, W=2, R=2 with read repair.");
let reps = names.map(() => ({ version: 1, value: "blue" }));
reps[0] = { version: 2, value: "green" }; reps[1] = { version: 2, value: "green" }; // r3 was partitioned
console.log("   after write v2 (r3 missed it): " + show(reps));
const got = read(reps, [1, 2]);
console.log(\`   read from r2,r3 -> v\${got.version}:\${got.value} (r3 answered v1, newer version wins)\`);
for (const i of [1, 2]) if (reps[i].version < got.version) reps[i] = { ...got };
console.log("   after read repair:              " + show(reps));

console.log("\\n4) Sloppy quorum: r1 and r2 are down, W=2.");
reps = names.map(() => ({ version: 2, value: "green" }));
const up = [2], W4 = 2;
console.log(\`   strict quorum write v3: \${up.length >= W4 ? "ok" : "FAIL"}, only \${up.length} of the 3 home replicas is up\`);
for (const i of up) reps[i] = { version: 3, value: "red" };
const hint = { version: 3, value: "red", for: "r1" };
console.log("   sloppy quorum write v3: ok, stored on r3 and on stand-in node h4 with a hint for r1");
console.log(\`   r1 and r2 recover; read from r1,r2 -> v\${read(reps, [0, 1]).version}:\${read(reps, [0, 1]).value} (stale: the overlap was on h4, not a home replica)\`);
reps[0] = { version: hint.version, value: hint.value };
console.log(\`   hinted handoff h4 -> \${hint.for}; read from r1,r2 -> v\${read(reps, [0, 1]).version}:\${read(reps, [0, 1]).value}\`);` },
          { tech: "python", code: `# Read/write quorums on N = 3 replicas: when W + R > N a read always meets the newest write.
# Replicas are in-process dicts {version, value}; "down" and "missed the write" are flags.
from itertools import combinations

N = 3
names = ["r1", "r2", "r3"]


def subsets(k):  # every set of k replica indexes, in lexicographic order
    return [list(c) for c in combinations(range(N), k)]


def read(reps, idx):  # newest version among the replicas that answered
    best = None
    for i in idx:
        if best is None or reps[i]["version"] > best["version"]:
            best = reps[i]
    return best


configs = [(1, 1), (1, 2), (2, 1), (2, 2), (3, 1), (1, 3)]

print("1) All replicas hold v1=blue. Then v2=green is written to exactly W replicas.")
print("   Every possible write set x every possible read set:")
print("W  R  W+R>N  stale reads")
for W, R in configs:
    stale = total = 0
    for ws in subsets(W):
        for rs in subsets(R):
            reps = [{"version": 2, "value": "green"} if i in ws else {"version": 1, "value": "blue"} for i in range(N)]
            total += 1
            if read(reps, rs)["version"] != 2:
                stale += 1
    print(f"{W}  {R}  {str(W + R > N).lower():<5}  {stale} of {total}")

print("\\n2) Availability: can the operation still reach enough replicas?")
print("W  R  1 down: write/read   2 down: write/read")
for W, R in configs:
    ok = lambda need, down: "ok" if N - down >= need else "FAIL"
    print(f"{W}  {R}  {ok(W, 1) + '/' + ok(R, 1):<19}  {ok(W, 2)}/{ok(R, 2)}")


def show(reps):
    return " ".join(f"{names[i]}=v{r['version']}:{r['value']}" for i, r in enumerate(reps))


print("\\n3) N=3, W=2, R=2 with read repair.")
reps = [{"version": 1, "value": "blue"} for _ in names]
reps[0] = {"version": 2, "value": "green"}
reps[1] = {"version": 2, "value": "green"}  # r3 was partitioned
print("   after write v2 (r3 missed it): " + show(reps))
got = read(reps, [1, 2])
print(f"   read from r2,r3 -> v{got['version']}:{got['value']} (r3 answered v1, newer version wins)")
for i in [1, 2]:
    if reps[i]["version"] < got["version"]:
        reps[i] = dict(got)
print("   after read repair:              " + show(reps))

print("\\n4) Sloppy quorum: r1 and r2 are down, W=2.")
reps = [{"version": 2, "value": "green"} for _ in names]
up, W4 = [2], 2
print(f"   strict quorum write v3: {'ok' if len(up) >= W4 else 'FAIL'}, only {len(up)} of the 3 home replicas is up")
for i in up:
    reps[i] = {"version": 3, "value": "red"}
hint = {"version": 3, "value": "red", "for": "r1"}
print("   sloppy quorum write v3: ok, stored on r3 and on stand-in node h4 with a hint for r1")
r = read(reps, [0, 1])
print(f"   r1 and r2 recover; read from r1,r2 -> v{r['version']}:{r['value']} (stale: the overlap was on h4, not a home replica)")
reps[0] = {"version": hint["version"], "value": hint["value"]}
r = read(reps, [0, 1])
print(f"   hinted handoff h4 -> {hint['for']}; read from r1,r2 -> v{r['version']}:{r['value']}")` },
          { tech: "go", code: `// Read/write quorums on N = 3 replicas: when W + R > N a read always meets the newest write.
// Replicas are in-process structs {version, value}; "down" and "missed the write" are flags.
package main

import (
	"fmt"
	"strings"
)

const N = 3

var names = []string{"r1", "r2", "r3"}

type rep struct {
	version int
	value   string
}

// every set of k replica indexes, in lexicographic order
func subsets(k int) [][]int {
	out := [][]int{}
	var gen func(start int, cur []int)
	gen = func(start int, cur []int) {
		if len(cur) == k {
			out = append(out, append([]int{}, cur...))
			return
		}
		for i := start; i < N; i++ {
			gen(i+1, append(cur, i))
		}
	}
	gen(0, []int{})
	return out
}

// newest version among the replicas that answered
func read(reps []rep, idx []int) rep {
	best := rep{-1, ""}
	for _, i := range idx {
		if reps[i].version > best.version {
			best = reps[i]
		}
	}
	return best
}

func has(xs []int, x int) bool {
	for _, y := range xs {
		if y == x {
			return true
		}
	}
	return false
}

func ok(need, down int) string {
	if N-down >= need {
		return "ok"
	}
	return "FAIL"
}

func show(reps []rep) string {
	parts := []string{}
	for i, r := range reps {
		parts = append(parts, fmt.Sprintf("%s=v%d:%s", names[i], r.version, r.value))
	}
	return strings.Join(parts, " ")
}

func main() {
	configs := [][2]int{{1, 1}, {1, 2}, {2, 1}, {2, 2}, {3, 1}, {1, 3}}
	fmt.Println("1) All replicas hold v1=blue. Then v2=green is written to exactly W replicas.")
	fmt.Println("   Every possible write set x every possible read set:")
	fmt.Println("W  R  W+R>N  stale reads")
	for _, c := range configs {
		W, R := c[0], c[1]
		stale, total := 0, 0
		for _, ws := range subsets(W) {
			for _, rs := range subsets(R) {
				reps := make([]rep, N)
				for i := 0; i < N; i++ {
					if has(ws, i) {
						reps[i] = rep{2, "green"}
					} else {
						reps[i] = rep{1, "blue"}
					}
				}
				total++
				if read(reps, rs).version != 2 {
					stale++
				}
			}
		}
		fmt.Printf("%d  %d  %-5t  %d of %d\\n", W, R, W+R > N, stale, total)
	}

	fmt.Println("\\n2) Availability: can the operation still reach enough replicas?")
	fmt.Println("W  R  1 down: write/read   2 down: write/read")
	for _, c := range configs {
		W, R := c[0], c[1]
		fmt.Printf("%d  %d  %-19s  %s/%s\\n", W, R, ok(W, 1)+"/"+ok(R, 1), ok(W, 2), ok(R, 2))
	}

	fmt.Println("\\n3) N=3, W=2, R=2 with read repair.")
	reps := []rep{{2, "green"}, {2, "green"}, {1, "blue"}} // r3 was partitioned
	fmt.Println("   after write v2 (r3 missed it): " + show(reps))
	got := read(reps, []int{1, 2})
	fmt.Printf("   read from r2,r3 -> v%d:%s (r3 answered v1, newer version wins)\\n", got.version, got.value)
	for _, i := range []int{1, 2} {
		if reps[i].version < got.version {
			reps[i] = got
		}
	}
	fmt.Println("   after read repair:              " + show(reps))

	fmt.Println("\\n4) Sloppy quorum: r1 and r2 are down, W=2.")
	reps = []rep{{2, "green"}, {2, "green"}, {2, "green"}}
	up, W4 := []int{2}, 2
	status := "FAIL"
	if len(up) >= W4 {
		status = "ok"
	}
	fmt.Printf("   strict quorum write v3: %s, only %d of the 3 home replicas is up\\n", status, len(up))
	for _, i := range up {
		reps[i] = rep{3, "red"}
	}
	hint, hintFor := rep{3, "red"}, "r1"
	fmt.Println("   sloppy quorum write v3: ok, stored on r3 and on stand-in node h4 with a hint for r1")
	r := read(reps, []int{0, 1})
	fmt.Printf("   r1 and r2 recover; read from r1,r2 -> v%d:%s (stale: the overlap was on h4, not a home replica)\\n", r.version, r.value)
	reps[0] = hint
	r = read(reps, []int{0, 1})
	fmt.Printf("   hinted handoff h4 -> %s; read from r1,r2 -> v%d:%s\\n", hintFor, r.version, r.value)
}` },
          { tech: "java", code: `// Read/write quorums on N = 3 replicas: when W + R > N a read always meets the newest write.
// Replicas are in-process records {version, value}; "down" and "missed the write" are flags.
import java.util.*;

public class Main {
    static final int N = 3;
    static final String[] NAMES = {"r1", "r2", "r3"};

    record Rep(int version, String value) {}

    // every set of k replica indexes, in lexicographic order
    static List<List<Integer>> subsets(int k) {
        List<List<Integer>> out = new ArrayList<>();
        gen(0, k, new ArrayList<>(), out);
        return out;
    }

    static void gen(int start, int k, List<Integer> cur, List<List<Integer>> out) {
        if (cur.size() == k) { out.add(new ArrayList<>(cur)); return; }
        for (int i = start; i < N; i++) { cur.add(i); gen(i + 1, k, cur, out); cur.remove(cur.size() - 1); }
    }

    // newest version among the replicas that answered
    static Rep read(Rep[] reps, int... idx) {
        Rep best = null;
        for (int i : idx) if (best == null || reps[i].version() > best.version()) best = reps[i];
        return best;
    }

    static String ok(int need, int down) { return N - down >= need ? "ok" : "FAIL"; }

    static String show(Rep[] reps) {
        List<String> parts = new ArrayList<>();
        for (int i = 0; i < N; i++) parts.add(NAMES[i] + "=v" + reps[i].version() + ":" + reps[i].value());
        return String.join(" ", parts);
    }

    public static void main(String[] args) {
        int[][] configs = {{1, 1}, {1, 2}, {2, 1}, {2, 2}, {3, 1}, {1, 3}};
        System.out.println("1) All replicas hold v1=blue. Then v2=green is written to exactly W replicas.");
        System.out.println("   Every possible write set x every possible read set:");
        System.out.println("W  R  W+R>N  stale reads");
        for (int[] c : configs) {
            int W = c[0], R = c[1], stale = 0, total = 0;
            for (List<Integer> ws : subsets(W)) for (List<Integer> rs : subsets(R)) {
                Rep[] reps = new Rep[N];
                for (int i = 0; i < N; i++) reps[i] = ws.contains(i) ? new Rep(2, "green") : new Rep(1, "blue");
                total++;
                if (read(reps, rs.stream().mapToInt(Integer::intValue).toArray()).version() != 2) stale++;
            }
            System.out.printf("%d  %d  %-5s  %d of %d%n", W, R, String.valueOf(W + R > N), stale, total);
        }

        System.out.println("\\n2) Availability: can the operation still reach enough replicas?");
        System.out.println("W  R  1 down: write/read   2 down: write/read");
        for (int[] c : configs) {
            int W = c[0], R = c[1];
            System.out.printf("%d  %d  %-19s  %s/%s%n", W, R, ok(W, 1) + "/" + ok(R, 1), ok(W, 2), ok(R, 2));
        }

        System.out.println("\\n3) N=3, W=2, R=2 with read repair.");
        Rep[] reps = {new Rep(2, "green"), new Rep(2, "green"), new Rep(1, "blue")}; // r3 was partitioned
        System.out.println("   after write v2 (r3 missed it): " + show(reps));
        Rep got = read(reps, 1, 2);
        System.out.printf("   read from r2,r3 -> v%d:%s (r3 answered v1, newer version wins)%n", got.version(), got.value());
        for (int i : new int[]{1, 2}) if (reps[i].version() < got.version()) reps[i] = got;
        System.out.println("   after read repair:              " + show(reps));

        System.out.println("\\n4) Sloppy quorum: r1 and r2 are down, W=2.");
        reps = new Rep[]{new Rep(2, "green"), new Rep(2, "green"), new Rep(2, "green")};
        int[] up = {2};
        int w4 = 2;
        System.out.printf("   strict quorum write v3: %s, only %d of the 3 home replicas is up%n", up.length >= w4 ? "ok" : "FAIL", up.length);
        for (int i : up) reps[i] = new Rep(3, "red");
        Rep hint = new Rep(3, "red");
        String hintFor = "r1";
        System.out.println("   sloppy quorum write v3: ok, stored on r3 and on stand-in node h4 with a hint for r1");
        Rep r = read(reps, 0, 1);
        System.out.printf("   r1 and r2 recover; read from r1,r2 -> v%d:%s (stale: the overlap was on h4, not a home replica)%n", r.version(), r.value());
        reps[0] = hint;
        r = read(reps, 0, 1);
        System.out.printf("   hinted handoff h4 -> %s; read from r1,r2 -> v%d:%s%n", hintFor, r.version(), r.value());
    }
}` },
        ],
      },
    ],
  },
];

export default augments;
