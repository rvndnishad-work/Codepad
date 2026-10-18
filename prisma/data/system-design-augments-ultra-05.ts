/**
 * SYSTEM DESIGN ULTRA — batch 05: Databases I. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `When would you choose SQL vs NoSQL?`,
    difficulty: "medium",
    seoDescription: `Choose SQL or NoSQL from access patterns, consistency and scale: joins vs embedded documents, transactions, sharding and the four NoSQL families.`,
    description: `**Question presented to candidate:**
"You are picking the main database for a new service. Walk me through how you would decide between a relational SQL database and a NoSQL store. What does each give you, what does each cost you, and can you give me a concrete case where you would pick each one?"

**What a strong answer should cover:**
- The decision is driven by **access patterns**, **consistency needs** and **scale**, not by fashion: SQL gives a fixed **schema**, **joins**, ad-hoc queries and multi-row **ACID transactions**; NoSQL trades some of those for a data model shaped around known queries and easier **horizontal scaling**
- "NoSQL" is four different families — **key-value**, **document**, **wide-column**, **graph** — each with its own sweet spot
- **Normalization vs denormalization**: one fact in one place (cheap updates, joins on read) vs data embedded where it is read (one read, many writes on change)
- Sharding: NoSQL stores are usually built around a **partition key**, so single-key reads hit one node; normalized tables spread one page across shards
- The lines have blurred: PostgreSQL has JSONB, MongoDB has multi-document transactions (replica sets since 4.0, sharded clusters since 4.2), DynamoDB has \`TransactWriteItems\` (up to 100 actions) — and most real systems use **polyglot persistence**
- A sane default: start relational unless a specific, measured need (write volume, a key-only access pattern, a graph traversal) says otherwise

**Clarifying questions expected:**
- What are the main read and write queries, and how many per second at peak?
- Which operations must be atomic across several records (money, stock, bookings)?
- Are the queries known up front, or will analysts ask new questions later?

**Code / implementation expected:** No — a reasoned comparison with examples is enough; the example measures the trade-offs on one in-memory data set.`,
    answer: `**Target Audience:** Beginners to system design — you have used a spreadsheet or a database table; no database internals assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Behaviour shown comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

Picture two ways to keep the paperwork of a small shop.

**The filing cabinet.** One drawer for customers, one for products, one for orders. An order card only says "customer #57 bought 2 of product #3". To print an invoice you pull the order card, then walk to the customer drawer and the product drawer to look up names and prices. Slower to read — but if a product is renamed you fix *one* card, and every invoice printed afterwards is right.

**The shoebox per order.** Each order goes in its own box with a full photocopy of everything: the customer name, each product name and price. Printing an invoice is instant — open one box. But rename a product and you must open every box that mentions it, or accept that old boxes show the old name. And if the shop grows to ten rooms, you can put each box in any room, because a box never needs anything from another box.

The filing cabinet is a **relational (SQL) database**. The shoebox is a **document (NoSQL) database**. Neither is better: they make different operations cheap. The interview question is really "which operations does *your* system do most, and which mistakes can it not afford?"

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What are the top 3-5 queries, and are they by key or by many different filters? | Key-only access is the NoSQL sweet spot; many filters and ad-hoc reports favour SQL |
| Peak reads and writes per second, and data size in a year? | Decides whether one machine (plus replicas) is enough or you must shard from day one |
| Which operations must be all-or-nothing across records? | Multi-row ACID transactions are the core strength of relational databases |
| How often does the shape of the data change? | Frequent, per-record variation favours a flexible document model |
| Is stale data for a second acceptable on some reads? | Opens the door to eventually consistent stores and replicas |
| What does the team already run and know well? | Operational experience is a real cost; a well-run Postgres beats a badly run anything |

## 3. What "SQL" Gives You

📌 **Interview term: relational database** — data lives in **tables** of rows and columns; rows in different tables refer to each other by key, and you query with SQL. PostgreSQL, MySQL, SQL Server and SQLite are relational.

📌 **Interview term: schema** — the declared shape of each table: column names, types, constraints (\`NOT NULL\`, \`UNIQUE\`, foreign keys). The database rejects rows that break it, which catches bugs at write time ("schema-on-write").

📌 **Interview term: normalization** — storing each fact exactly once (the product name lives only in \`products\`) and linking with keys. Updates are cheap and cannot disagree with each other.

📌 **Interview term: join** — combining rows from several tables at read time (\`orders JOIN order_items JOIN products\`). The price of normalization is paid here, on every read.

📌 **Interview term: ACID transaction** — a group of writes that is **A**tomic (all or none), **C**onsistent (constraints hold), **I**solated (concurrent transactions do not see each other half-done) and **D**urable (survives a crash once committed).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Normalized tables: orders and order items refer to users and products by id">
  <defs>
    <marker id="sd05q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="95" y="58" text-anchor="middle">users</text>
  <text class="d-sub" x="95" y="80" text-anchor="middle">id, name</text>
  <rect class="d-box-accent" x="280" y="30" width="160" height="64" rx="10"/>
  <text class="d-text" x="360" y="58" text-anchor="middle">orders</text>
  <text class="d-sub" x="360" y="80" text-anchor="middle">id, user_id</text>
  <rect class="d-box-accent" x="280" y="150" width="160" height="64" rx="10"/>
  <text class="d-text" x="360" y="178" text-anchor="middle">order_items</text>
  <text class="d-sub" x="360" y="200" text-anchor="middle">order_id, product_id</text>
  <rect class="d-box" x="550" y="150" width="150" height="64" rx="10"/>
  <text class="d-text" x="625" y="178" text-anchor="middle">products</text>
  <text class="d-sub" x="625" y="200" text-anchor="middle">id, name, stock</text>
  <path class="d-edge" d="M 280 62 L 176 62" marker-end="url(#sd05q1-arrow)"/>
  <path class="d-edge" d="M 360 150 L 360 100" marker-end="url(#sd05q1-arrow)"/>
  <path class="d-edge" d="M 440 182 L 544 182" marker-end="url(#sd05q1-arrow)"/>
</svg>

Each arrow is a foreign key: a row points at the one place a fact is stored. Reading an order page means following every arrow — a join.

## 4. What "NoSQL" Gives You

"NoSQL" is not one thing. It is a family of databases that dropped some relational features (usually joins and cross-record transactions, at least originally) to get a data model that matches one access pattern and spreads across many machines easily.

| Family | Shape | Good at | Examples |
| :--- | :--- | :--- | :--- |
| Key-value | \`key -> opaque value\` | sessions, carts, caches, feature flags: get/put by key at huge rates | Redis, DynamoDB (also document-like) |
| Document | \`key -> JSON-like document\` with nested fields | aggregates read as one unit: a product page, an order, a user profile | MongoDB, Couchbase, Firestore |
| Wide-column | rows grouped by a **partition key**, sorted by a clustering key | huge append-heavy data: telemetry, messages, time series | Cassandra, ScyllaDB, HBase, Bigtable |
| Graph | nodes and edges | many-hop relationship queries: friends of friends, fraud rings | Neo4j, Amazon Neptune |

📌 **Interview term: denormalization** — deliberately copying data into the place it is read (the product name inside each order document) so a read needs no join. The cost moves to writes: a change must be copied everywhere, or the copies are treated as historical snapshots.

📌 **Interview term: partition key** — the field a distributed store hashes to decide which machine holds a record. Reads that give the partition key go to one machine; reads that do not must ask all of them. See [consistent hashing](/interview-question/what-is-consistent-hashing) for how the key maps to a node.

📌 **Interview term: eventual consistency** — replicas may briefly disagree after a write and converge later. Many NoSQL stores default to it and offer stronger modes per request; see [strong vs eventual consistency](/interview-question/what-is-the-difference-between-strong-and-eventual-consistency).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 210" role="img" aria-label="One order document with the user name and line items embedded inside it">
  <rect class="d-box-accent" x="200" y="20" width="320" height="170" rx="12"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">order 17 document</text>
  <rect class="d-box-muted" x="230" y="70" width="260" height="36" rx="8"/>
  <text class="d-sub" x="360" y="93" text-anchor="middle">user: 65, name: user65</text>
  <rect class="d-box-muted" x="230" y="124" width="260" height="46" rx="8"/>
  <text class="d-sub" x="360" y="152" text-anchor="middle">items: product6 x1, product7 x3</text>
</svg>

Everything the order page needs sits in one record, read in one request, stored on one machine.

## 5. The Trade-offs, Measured

The example builds one shop (200 users, 50 products, 1000 orders) twice: as normalized tables and as one document per order. It then runs the same five tasks against both. These are in-memory maps standing in for a real database, so they count *operations*, not milliseconds.

~~~text
Data: 200 users, 50 products, 1000 orders, 2455 order lines

1) Render the page for order 17
  relational: 6 row lookups across 4 tables (a join)
  document:   1 read of order 17 (2 lines embedded)

2) Rename product 7
  relational: 1 row updated; every join sees the new name at once
  document:   41 order documents rewritten (or the old name stays as a snapshot)
~~~

**Reads favour documents, updates favour tables.** The order page costs 6 row lookups in four tables versus one document read. Renaming product 7 is one row in SQL, but 41 order documents carry a copy of the name. In a real store you often *want* that copy — an invoice should show the name at the time of purchase — so the honest answer is "decide per field whether a copy is a snapshot or must stay in sync".

~~~text
3) Checkout of 2 x product 3, crash after the stock write, before the order write
  single-row writes, no transaction: stock=98 orders_written=0  <- 2 units lost
  one ACID transaction:              stock=100 orders_written=0  <- all or nothing
~~~

**Atomicity across records.** Checkout must take stock *and* write the order. Done as two independent single-record writes, a crash between them loses 2 units of stock forever. Inside one transaction the half-done work is rolled back. Relational databases make this the default. Document stores guarantee atomicity for one document; across documents you need the store transaction feature where it exists — MongoDB added multi-document transactions for replica sets in 4.0 and for sharded clusters in 4.2 (MongoDB docs), DynamoDB \`TransactWriteItems\` groups up to 100 actions in one all-or-nothing request within one account and Region (AWS API reference) — or a [saga](/interview-question/what-is-the-saga-pattern-for-distributed-transactions).

~~~text
4) Spread over 4 shards; how many shards does the order 17 page touch?
  relational, each table sharded by its own id: 3 shards
  document, sharded by order id:               1 shard

5) Ad-hoc question nobody planned for: units sold per product, top 3
  SQL GROUP BY over 2455 lines: product38=137 product13=135 product17=127
  key-value store with no secondary index: read all 1000 documents, or keep a counter from day one
~~~

**Sharding and unplanned questions pull in opposite directions.** With 4 shards, the normalized order page touches 3 shards (order, user and products live wherever their own ids hash), while the document lives entirely on the shard of its key. But when someone asks a question nobody designed for — units sold per product — SQL answers with one \`GROUP BY\` over the 2455 lines, while a key-value store without a secondary index must read all 1000 documents, or you must have been maintaining a counter since day one. This is the core NoSQL rule: **design the data model around the queries**, because the store will not do arbitrary queries efficiently for you. See [database sharding](/interview-question/what-is-database-sharding) for how relational systems shard anyway (pick a shard key such as \`tenant_id\` so most joins stay inside one shard).

## 6. Choosing: A Decision Guide

| Choose relational (SQL) when... | Choose a NoSQL family when... |
| :--- | :--- |
| Money, stock, bookings: several records must change together | Access is overwhelmingly by one key (sessions, carts, profiles) |
| Data is naturally related and queried from many angles | Each read wants one self-contained aggregate (document) |
| Analysts and new features will ask unplanned questions | Write volume or data size exceeds what one primary can take, and the partition key is obvious |
| Constraints (unique email, valid foreign keys) must be enforced by the database | Records vary a lot in shape, and the app owns validation |
| Data fits on one primary plus [read replicas](/interview-question/what-is-database-replication) for years | You need many-hop relationship queries (graph) |

### Three worked choices

- **Payments ledger** — debits and credits must balance in one atomic step, auditors run ad-hoc queries. Relational, without hesitation. (See [payment system design](/interview-question/how-would-you-design-a-payment-system-573c).)
- **IoT telemetry** — assume 1,000,000 devices each send one 200-byte reading every 10 seconds. That is 1,000,000 / 10 = 100,000 writes per second, 100,000 x 200 = 20 MB/s, and 20 MB/s x 86,400 s = about 1.73 TB per day before replication. Always queried as "device X between time A and B". A wide-column store partitioned by device and clustered by time fits that shape; a single relational primary would struggle with the write rate.
- **Shopping cart** — read and written only by \`cart_id\`, small, short-lived, a lost update is an annoyance rather than a disaster. Key-value.

Most real systems mix them: Postgres for orders, Redis for sessions, a search engine for full-text, a warehouse for analytics.

📌 **Interview term: polyglot persistence** — using several database types in one system, each for the access pattern it serves best, and accepting the cost of keeping them in sync (often with change data capture; see [CDC with Debezium](/interview-question/how-does-cdc-with-debezium-keep-search-and-cache-in-sync-with-postgres)).

### The lines have blurred

- PostgreSQL stores and indexes JSON documents in \`jsonb\` columns, so "I need flexible fields" alone is not a reason to leave SQL.
- Document and key-value stores now offer transactions (with limits, above) and secondary indexes.
- Distributed SQL databases (Google Spanner, CockroachDB, YugabyteDB) shard relational tables across machines while keeping SQL and transactions, at the cost of higher write latency from cross-node coordination.

So the modern question is less "SQL or NoSQL?" and more "which **data model** and which **consistency and scaling guarantees** does each part of the system need?"

## 7. Verified: Running the Code

The example **"One shop, two data models: joins vs embedded documents, transactions, shards, ad-hoc queries"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Data: 200 users, 50 products, 1000 orders, 2455 order lines

1) Render the page for order 17
  relational: 6 row lookups across 4 tables (a join)
  document:   1 read of order 17 (2 lines embedded)

2) Rename product 7
  relational: 1 row updated; every join sees the new name at once
  document:   41 order documents rewritten (or the old name stays as a snapshot)

3) Checkout of 2 x product 3, crash after the stock write, before the order write
  single-row writes, no transaction: stock=98 orders_written=0  <- 2 units lost
  one ACID transaction:              stock=100 orders_written=0  <- all or nothing

4) Spread over 4 shards; how many shards does the order 17 page touch?
  relational, each table sharded by its own id: 3 shards
  document, sharded by order id:               1 shard

5) Ad-hoc question nobody planned for: units sold per product, top 3
  SQL GROUP BY over 2455 lines: product38=137 product13=135 product17=127
  key-value store with no secondary index: read all 1000 documents, or keep a counter from day one
~~~

What the simulation stands for and what it leaves out: \`Map\`s stand in for tables and collections, a counter of lookups stands in for I/O, and "shard" is \`id % 4\`. A real database adds indexes, caching, query planning and network round trips, so the *relative* costs are the lesson, not absolute numbers. The crash is simulated by throwing an exception between two writes; the "transaction" stages writes and applies them only at commit, which is the externally visible behaviour of a real one.

## Edge Cases Worth Knowing

- **Hot partitions.** A NoSQL store scales only as well as its partition key spreads load; one celebrity user or one "today" partition can melt a single node.
- **Schema-less is not schema-free.** The schema moves into application code; old documents in old shapes live forever unless you migrate them.
- **Secondary indexes in distributed stores** are often eventually consistent or partitioned differently from the table, so a read by a non-key field may be stale or fan out to every node.
- **Joins at scale in SQL** are fine when they use indexes and stay inside one shard; the problem is cross-shard joins, which is why multi-tenant SaaS shards by tenant.

## Common Pitfalls

- **Choosing NoSQL "because it scales"** for a workload that fits on one Postgres primary for the next five years — you pay the modelling cost and lose joins and transactions for nothing.
- **Modelling NoSQL like SQL** (one collection per entity, joins done in application code) — you get the cost of both and the benefit of neither. Start from the list of queries.
- **Forgetting the multi-record write.** The run lost 2 units of stock to a crash between two single-record writes; any flow that touches several records needs a transaction or a saga.
- **Denormalizing without deciding snapshot vs sync** — then a product rename leaves 41 orders inconsistent and nobody knows whether that is a bug.
- **Saying NoSQL means "no transactions" or "eventual consistency only"** — that was true of early systems, not of current MongoDB, DynamoDB or Cassandra lightweight transactions. Name the actual guarantee you need.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame the decision:</strong> <span style="color:#f0e2c8;">I choose by <strong style="color:#ffca28;">access patterns</strong>, <strong style="color:#ffca28;">consistency needs</strong> and <strong style="color:#ffca28;">scale</strong>. SQL gives schema, joins, ad-hoc queries and multi-row <strong style="color:#ffca28;">ACID transactions</strong>; NoSQL gives a data model shaped around known queries and easier horizontal scaling.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the families:</strong> <span style="color:#f0e2c8;">NoSQL is four families: <strong style="color:#ffca28;">key-value</strong> for get/put by key, <strong style="color:#ffca28;">document</strong> for self-contained aggregates, <strong style="color:#ffca28;">wide-column</strong> for huge append-heavy partitioned data, <strong style="color:#ffca28;">graph</strong> for many-hop relationships.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The core trade-off:</strong> <span style="color:#f0e2c8;">Normalized tables store each fact once, so updates are cheap and reads join. Documents copy data where it is read, so reads are one lookup and updates fan out. In my example the order page was 6 lookups vs 1, and a rename was 1 row vs 41 documents.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scaling and transactions:</strong> <span style="color:#f0e2c8;">A document keyed by its partition key lives on one shard; normalized rows spread one page over several shards. But atomic changes across records are natural in SQL and limited elsewhere: MongoDB since 4.0, DynamoDB up to 100 actions per transaction.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My default:</strong> <span style="color:#f0e2c8;">Start relational unless a measured need says otherwise, then add specialised stores per access pattern — polyglot persistence — for example Postgres for orders, Redis for sessions, Cassandra for telemetry.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Postgres has JSONB. Why would anyone need MongoDB?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JSONB covers flexible fields inside a relational system. A document database adds built-in sharding by key, a document-native query and update language, and an operational model built around documents. If you need relational integrity plus some flexible fields, JSONB is usually enough.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you do a join in a store that has no joins?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either denormalize so the read needs no join, do two lookups in the application (acceptable when both are by key), or keep a precomputed view updated on write. Design the model from the query list so this is rare.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a relational database scale to millions of writes per second?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One primary cannot, but sharded relational setups (application sharding by tenant, Vitess, Citus) and distributed SQL (Spanner, CockroachDB) do. The cost is choosing a shard key and avoiding cross-shard transactions, or paying coordination latency for them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you use for a social graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For one-hop queries (followers of X) a relational adjacency table with an index, or a wide-column store keyed by user, works well. For many-hop traversals and pattern matching, a graph database avoids repeated self-joins.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which consistency would you need for a shopping cart vs a bank balance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A cart can tolerate eventual consistency and even merge conflicting versions. A balance needs strongly consistent, atomic updates, so it belongs in a store with ACID transactions on that path.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Relational database | Tables of rows linked by keys, queried with SQL |
| Schema | Declared shape and constraints the database enforces |
| Normalization | Store each fact once and link with keys |
| Join | Combine rows from several tables at read time |
| ACID transaction | All-or-nothing, isolated, durable group of writes |
| Denormalization | Copy data to where it is read to avoid joins |
| Partition key | Field that decides which machine stores a record |
| Eventual consistency | Replicas converge after a delay instead of instantly |
| Polyglot persistence | Several database types in one system, one per access pattern |

**Conclusion:** SQL versus NoSQL is a choice between making joins, constraints and multi-record transactions cheap, or making single-key reads and horizontal scaling cheap. The run showed both sides in numbers: one document read instead of six lookups and one shard instead of three, against 41 documents to fix on a rename, stock lost without a transaction, and a full scan for an unplanned question. Start from the queries and the guarantees each part of the system needs, default to relational when nothing forces otherwise, and add specialised stores where a specific access pattern earns them.`,
    examples: [
      {
        label: `One shop, two data models: joins vs embedded documents, transactions, shards, ad-hoc queries`,
        variants: [
          { tech: "node", code: `// The same shop stored two ways: normalized tables (relational) vs one document per order.
let seed = 42;
function rand(n) { seed = (seed * 48271) % 2147483647; return seed % n; } // deterministic MINSTD

// Relational: four tables, each a Map from primary key to row.
const users = new Map(), products = new Map(), orders = new Map(), items = [];
for (let u = 1; u <= 200; u++) users.set(u, { id: u, name: \`user\${u}\` });
for (let p = 1; p <= 50; p++) products.set(p, { id: p, name: \`product\${p}\`, stock: 100 });
for (let o = 1; o <= 1000; o++) {
  orders.set(o, { id: o, userId: 1 + rand(200) });
  const n = 1 + rand(4);
  for (let k = 0; k < n; k++) items.push({ orderId: o, productId: 1 + rand(50), qty: 1 + rand(3) });
}
const itemsByOrder = new Map(); // a secondary index on order_items(order_id)
for (const it of items) {
  if (!itemsByOrder.has(it.orderId)) itemsByOrder.set(it.orderId, []);
  itemsByOrder.get(it.orderId).push(it);
}

// Document store: each order embeds its user name and product names (denormalized).
const docs = new Map();
for (const [id, o] of orders) {
  docs.set(id, {
    _id: id, userId: o.userId, userName: users.get(o.userId).name,
    items: itemsByOrder.get(id).map((it) => ({ productId: it.productId, name: products.get(it.productId).name, qty: it.qty })),
  });
}
console.log(\`Data: \${users.size} users, \${products.size} products, \${orders.size} orders, \${items.length} order lines\`);

console.log("\\n1) Render the page for order 17");
const lines = itemsByOrder.get(17);
const rowsRead = 1 + 1 + lines.length + lines.length; // order + user + its lines + one product per line
console.log(\`  relational: \${rowsRead} row lookups across 4 tables (a join)\`);
console.log(\`  document:   1 read of order 17 (\${docs.get(17).items.length} lines embedded)\`);

console.log("\\n2) Rename product 7");
let docsTouched = 0;
for (const d of docs.values()) {
  let hit = false;
  for (const it of d.items) if (it.productId === 7) { it.name = "product7-v2"; hit = true; }
  if (hit) docsTouched++;
}
products.get(7).name = "product7-v2";
console.log("  relational: 1 row updated; every join sees the new name at once");
console.log(\`  document:   \${docsTouched} order documents rewritten (or the old name stays as a snapshot)\`);

console.log("\\n3) Checkout of 2 x product 3, crash after the stock write, before the order write");
function checkout(useTransaction) {
  const db = { stock: 100, orders: 0 };
  const steps = [(d) => { d.stock -= 2; }, (d) => { d.orders += 1; }];
  const staged = []; // with a transaction, writes become visible only at commit
  try {
    for (let i = 0; i < steps.length; i++) {
      if (i === 1) throw new Error("process crashed");
      if (useTransaction) staged.push(steps[i]); else steps[i](db);
    }
    for (const w of staged) w(db); // commit
  } catch (e) {
    staged.length = 0; // never committed, so rolled back
  }
  return \`stock=\${db.stock} orders_written=\${db.orders}\`;
}
console.log(\`  single-row writes, no transaction: \${checkout(false)}  <- 2 units lost\`);
console.log(\`  one ACID transaction:              \${checkout(true)}  <- all or nothing\`);

console.log("\\n4) Spread over 4 shards; how many shards does the order 17 page touch?");
const shard = (key) => key % 4;
const touched = new Set([shard(17), shard(orders.get(17).userId)]);
for (const it of lines) touched.add(shard(it.productId));
console.log(\`  relational, each table sharded by its own id: \${touched.size} shards\`);
console.log(\`  document, sharded by order id:               1 shard\`);

console.log("\\n5) Ad-hoc question nobody planned for: units sold per product, top 3");
const units = new Map();
for (const it of items) units.set(it.productId, (units.get(it.productId) || 0) + it.qty);
const top = [...units.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3);
console.log(\`  SQL GROUP BY over \${items.length} lines: \${top.map(([p, u]) => \`product\${p}=\${u}\`).join(" ")}\`);
console.log(\`  key-value store with no secondary index: read all \${docs.size} documents, or keep a counter from day one\`);` },
          { tech: "python", code: `# The same shop stored two ways: normalized tables (relational) vs one document per order.
seed = 42


def rand(n):
    global seed
    seed = (seed * 48271) % 2147483647  # deterministic MINSTD
    return seed % n


# Relational: four tables, each a dict from primary key to row.
users, products, orders, items = {}, {}, {}, []
for u in range(1, 201):
    users[u] = {"id": u, "name": f"user{u}"}
for p in range(1, 51):
    products[p] = {"id": p, "name": f"product{p}", "stock": 100}
for o in range(1, 1001):
    orders[o] = {"id": o, "userId": 1 + rand(200)}
    n = 1 + rand(4)
    for _ in range(n):
        items.append({"orderId": o, "productId": 1 + rand(50), "qty": 1 + rand(3)})
items_by_order = {}  # a secondary index on order_items(order_id)
for it in items:
    items_by_order.setdefault(it["orderId"], []).append(it)

# Document store: each order embeds its user name and product names (denormalized).
docs = {}
for oid, o in orders.items():
    docs[oid] = {
        "_id": oid, "userId": o["userId"], "userName": users[o["userId"]]["name"],
        "items": [{"productId": it["productId"], "name": products[it["productId"]]["name"], "qty": it["qty"]}
                  for it in items_by_order[oid]],
    }
print(f"Data: {len(users)} users, {len(products)} products, {len(orders)} orders, {len(items)} order lines")

print("\\n1) Render the page for order 17")
lines = items_by_order[17]
rows_read = 1 + 1 + len(lines) + len(lines)  # order + user + its lines + one product per line
print(f"  relational: {rows_read} row lookups across 4 tables (a join)")
print(f"  document:   1 read of order 17 ({len(docs[17]['items'])} lines embedded)")

print("\\n2) Rename product 7")
docs_touched = 0
for d in docs.values():
    hit = False
    for it in d["items"]:
        if it["productId"] == 7:
            it["name"] = "product7-v2"
            hit = True
    if hit:
        docs_touched += 1
products[7]["name"] = "product7-v2"
print("  relational: 1 row updated; every join sees the new name at once")
print(f"  document:   {docs_touched} order documents rewritten (or the old name stays as a snapshot)")

print("\\n3) Checkout of 2 x product 3, crash after the stock write, before the order write")


def checkout(use_transaction):
    db = {"stock": 100, "orders": 0}

    def take_stock(d):
        d["stock"] -= 2

    def add_order(d):
        d["orders"] += 1

    steps = [take_stock, add_order]
    staged = []  # with a transaction, writes become visible only at commit
    try:
        for i in range(len(steps)):
            if i == 1:
                raise RuntimeError("process crashed")
            if use_transaction:
                staged.append(steps[i])
            else:
                steps[i](db)
        for w in staged:  # commit
            w(db)
    except RuntimeError:
        staged.clear()  # never committed, so rolled back
    return f"stock={db['stock']} orders_written={db['orders']}"


print(f"  single-row writes, no transaction: {checkout(False)}  <- 2 units lost")
print(f"  one ACID transaction:              {checkout(True)}  <- all or nothing")

print("\\n4) Spread over 4 shards; how many shards does the order 17 page touch?")


def shard(key):
    return key % 4


touched = {shard(17), shard(orders[17]["userId"])}
for it in lines:
    touched.add(shard(it["productId"]))
print(f"  relational, each table sharded by its own id: {len(touched)} shards")
print("  document, sharded by order id:               1 shard")

print("\\n5) Ad-hoc question nobody planned for: units sold per product, top 3")
units = {}
for it in items:
    units[it["productId"]] = units.get(it["productId"], 0) + it["qty"]
top = sorted(units.items(), key=lambda kv: (-kv[1], kv[0]))[:3]
print(f"  SQL GROUP BY over {len(items)} lines: " + " ".join(f"product{p}={u}" for p, u in top))
print(f"  key-value store with no secondary index: read all {len(docs)} documents, or keep a counter from day one")` },
        ],
      },
    ],
  },
  {
    title: `Explain database indexing and B-trees`,
    difficulty: "medium",
    seoDescription: `How a database index works, and why it is a B+tree: pages, fan-out, height, page splits, point lookups, range scans, and the cost on writes.`,
    description: `**Question presented to candidate:**
"A query on a 50-million-row table takes seconds, and adding an index makes it take a millisecond. Explain what an index actually is, why databases use B-trees for it, and what a lookup and a range query do inside the tree. What does the index cost you?"

**What a strong answer should cover:**
- An **index** is a separate sorted structure mapping column values to row locations, so the database avoids a **full table scan**
- Why a **B+tree**: nodes are disk **pages** with high **fan-out**, so the tree is only 3-4 levels deep even for a billion keys; lookups cost O(log n) page reads, and the top levels sit in memory
- Keys live in sorted, **linked leaves**, so one tree serves equality, ranges, \`ORDER BY\` and prefix matches — a **hash index** serves only equality
- Inserts keep the tree balanced by **page splits**; sequential keys and random keys fill pages differently
- The cost: every insert, update of an indexed column and delete must maintain every index (**write amplification**), plus storage; **clustered** (InnoDB primary key) vs **secondary** indexes
- Contrast with **LSM trees** (RocksDB, Cassandra) as the write-optimised alternative

**Code / implementation expected:** Optional — explaining the tree is enough; the example builds a B+tree and counts the pages each operation reads.`,
    answer: `**Target Audience:** Beginners to databases — you know what a table and a row are; no data-structures background needed beyond "sorted lists are easy to search".
**Difficulty:** Medium
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Behaviour shown comes from running the example; the **Verified** section quotes the full output.

This page is about *what an index is and how the B-tree works inside*. For *which* indexes to create for real queries — composite column order, covering and partial indexes, selectivity — see the companion page [What indexing strategies improve database performance?](/interview-question/what-indexing-strategies-improve-database-performance).

## 1. Why This Even Matters — A Story First

You want every mention of "volcano" in a 900-page encyclopedia. Without help you read all 900 pages. With the **index at the back** you flip to V, find "volcano: 212, 488, 731", and read three pages.

Now imagine the index itself is huge — 40 pages. You still do not read it from page one: the top of each index page says which words it covers ("Valve – Vortex"), so you jump almost straight to the right one. That two-level trick — a guide to the index, then the index, then the real page — is exactly a B-tree. Databases just go one or two levels deeper.

📌 **Interview term: index** — a separate data structure, kept sorted by one or more columns, whose entries point to where each row lives. The table itself (the **heap** in PostgreSQL) stays unsorted.

📌 **Interview term: full table scan** — reading every row of the table to find matches. Fine for small tables and for queries that need most rows; terrible for "find one row in fifty million".

## 2. Why Not Just a Sorted Array or a Binary Tree?

The database stores data on disk (or SSD) in fixed-size blocks.

📌 **Interview term: page** — the unit a database reads and writes: 8 kB by default in PostgreSQL (fixed when it is compiled). Reading one byte costs reading its whole page, so the real cost of a query is **how many pages it touches**.

A binary search tree has two children per node, so a billion keys need about 30 levels — 30 page reads. A sorted array needs about 30 binary-search probes too, and inserting into the middle means shifting everything after it. A **B-tree** fixes both: each node *is* a page and holds hundreds of keys, so each step down the tree keeps only about one in several hundred of the remaining keys.

📌 **Interview term: fan-out** — how many children an internal node has. With 8 kB pages and roughly 20 bytes per entry (key, child pointer, overhead), one page holds about 8192 / 20 = 409 entries. Fan-out in the hundreds is what makes the tree shallow.

📌 **Interview term: B+tree** — the variant every major relational database uses for its default index. Internal nodes hold only **separator keys** that route the search; all real entries live in the **leaves**, and the leaves are **linked** left to right in key order. People say "B-tree" and mean this.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="A B+tree: a root page with separators 30 and 60, three leaf pages linked left to right">
  <defs>
    <marker id="sd05q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="290" y="20" width="180" height="56" rx="10"/>
  <text class="d-text" x="380" y="45" text-anchor="middle">root: 30 | 60</text>
  <text class="d-sub" x="380" y="66" text-anchor="middle">separators only</text>
  <rect class="d-box" x="30" y="170" width="170" height="56" rx="10"/>
  <text class="d-text" x="115" y="196" text-anchor="middle">10 | 20 | 25</text>
  <text class="d-sub" x="115" y="216" text-anchor="middle">leaf: key + row id</text>
  <rect class="d-box" x="295" y="170" width="170" height="56" rx="10"/>
  <text class="d-text" x="380" y="196" text-anchor="middle">30 | 41 | 52</text>
  <text class="d-sub" x="380" y="216" text-anchor="middle">leaf: key + row id</text>
  <rect class="d-box" x="560" y="170" width="170" height="56" rx="10"/>
  <text class="d-text" x="645" y="196" text-anchor="middle">60 | 77 | 85</text>
  <text class="d-sub" x="645" y="216" text-anchor="middle">leaf: key + row id</text>
  <path class="d-edge" d="M 320 76 L 140 164" marker-end="url(#sd05q2-arrow)"/>
  <path class="d-edge" d="M 380 76 L 380 164" marker-end="url(#sd05q2-arrow)"/>
  <path class="d-edge" d="M 440 76 L 620 164" marker-end="url(#sd05q2-arrow)"/>
  <path class="d-edge-accent" d="M 200 198 L 289 198" marker-end="url(#sd05q2-arrow)"/>
  <path class="d-edge-accent" d="M 465 198 L 554 198" marker-end="url(#sd05q2-arrow)"/>
</svg>

To find 41, compare against the root separators (30 is not more than 41, 60 is), take the middle child, and search that leaf. To read 25 through 77, find 25 the same way and then follow the accent-coloured sibling links rightwards — no need to go back up the tree.

## 3. Lookups, Ranges and Ordering — Measured

The example inserts 10,007 keys (0 to 10,006, in a scrambled but deterministic order) into a B+tree and counts the pages every operation reads. First with a tiny page that holds at most 4 keys, then with 64.

~~~text
B+tree, 10007 keys inserted in scrambled order, max 4 keys per page
  height=8 internal=1276 leaves=3307 leaf_fill=75%
  lookup 4242: found=true pages_read=8
  lookup 20000: found=false pages_read=8
  range 5000..5049: rows=50 pages_read=23
  ORDER BY key LIMIT 5, walked from the leftmost leaf: 0,1,2,3,4
B+tree, 10007 keys inserted in scrambled order, max 64 keys per page
  height=3 internal=7 leaves=256 leaf_fill=61%
  lookup 4242: found=true pages_read=3
  lookup 20000: found=false pages_read=3
  range 5000..5049: rows=50 pages_read=4
  ORDER BY key LIMIT 5, walked from the leftmost leaf: 0,1,2,3,4
Full table scan for the same lookup: rows_read=10007
~~~

- **Height drives lookup cost.** With 4 keys per page the tree is 8 levels deep, so every lookup reads 8 pages — even for key 20000, which does not exist (a miss costs the same as a hit). With 64 keys per page it is 3 levels and 3 pages. A full scan reads all 10,007 rows.
- **Ranges are cheap because leaves are linked.** Fifty consecutive keys cost 3 pages to descend plus a short walk along the leaf chain: 4 pages in total with the 64-key tree.
- **Sorted for free.** \`ORDER BY key LIMIT 5\` starts at the leftmost leaf and walks; no sort step is needed. This is why an index on the \`ORDER BY\` column can turn a sort of millions of rows into reading a few pages.

📌 **Interview term: tree height** — the number of levels from root to leaf; a point lookup reads one page per level. It grows with log base fan-out of the row count:

~~~text
Levels needed for 1,000,000,000 keys (fan-out ^ levels >= keys)
  fan-out 4: 15 levels
  fan-out 64: 5 levels
  fan-out 400: 4 levels
~~~

With realistic fan-out in the hundreds, a billion keys need 4 levels, and because the root and the next level are read constantly they stay in the buffer cache — a lookup usually costs one or two real disk reads.

## 4. How the Tree Stays Balanced: Page Splits

New keys always go into a leaf. When a leaf overflows, it splits in two and pushes a separator key up to its parent; if the parent overflows it splits too, and if the root splits, a new root is created above it. That is the only way the tree grows taller, so **every leaf is always at the same depth**.

📌 **Interview term: page split** — dividing an overfull page into two half-full pages and inserting a new separator into the parent. Splits cost extra writes and leave free space behind.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="A full leaf receives key 45, splits into two leaves, and the separator 41 moves up to the parent">
  <defs>
    <marker id="sd05q2-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="100" width="240" height="56" rx="10"/>
  <text class="d-text" x="150" y="126" text-anchor="middle">30 | 35 | 41 | 52</text>
  <text class="d-sub" x="150" y="146" text-anchor="middle">full leaf, insert 45</text>
  <rect class="d-box-accent" x="480" y="20" width="200" height="50" rx="10"/>
  <text class="d-text" x="580" y="50" text-anchor="middle">parent gets 41</text>
  <rect class="d-box" x="400" y="170" width="160" height="56" rx="10"/>
  <text class="d-text" x="480" y="203" text-anchor="middle">30 | 35</text>
  <rect class="d-box" x="600" y="170" width="140" height="56" rx="10"/>
  <text class="d-text" x="670" y="203" text-anchor="middle">41 | 45 | 52</text>
  <path class="d-edge-dashed" d="M 270 128 L 394 190" marker-end="url(#sd05q2-arrow2)"/>
  <path class="d-edge" d="M 540 70 L 490 164" marker-end="url(#sd05q2-arrow2)"/>
  <path class="d-edge" d="M 620 70 L 664 164" marker-end="url(#sd05q2-arrow2)"/>
</svg>

After the split both halves have room for future inserts, and the parent now routes keys below 41 to the left page and 41 or more to the right.

The core of the split in the example (the leaf case; internal nodes do the same but move the middle key up instead of copying it):

~~~js
if (node.keys.length <= max) return null;          // still fits: done
const mid = Math.floor(node.keys.length / 2);
const right = newNode(node.leaf);
if (node.leaf) {
  right.keys = node.keys.slice(mid);               // upper half moves to a new page
  node.keys = node.keys.slice(0, mid);
  right.next = node.next;                          // keep the leaf chain intact
  node.next = right;
  return [right.keys[0], right];                   // separator for the parent
}
~~~

**Insert order changes how full the pages are.** A 50/50 split of the rightmost leaf, when keys always arrive in increasing order (an auto-increment id or a timestamp), leaves every left half permanently half empty, because no smaller key will ever arrive to fill it:

~~~text
B+tree, 10007 keys inserted in scrambled order, max 64 keys per page
  height=3 internal=7 leaves=256 leaf_fill=61%
Sequential inserts (like an auto-increment id), max 64 keys per page
  height=3 internal=10 leaves=312 leaf_fill=50%
~~~

Same 10,007 keys, same page size: scrambled inserts give 256 leaves at 61% full, sequential inserts give 312 leaves at exactly 50% — 22% more pages to cache and scan. Real engines special-case this: PostgreSQL splits the *rightmost* leaf so the left page is packed to the index fillfactor (default 90 for B-tree leaves) and divides other pages equally (PostgreSQL \`nbtree.h\` source comments).

## 5. Where the Row Actually Is: Clustered vs Secondary

📌 **Interview term: secondary index** — an index whose leaves point at the row somewhere else. In PostgreSQL every index is like this: leaves hold a tuple id (page number, slot) into the unordered heap.

📌 **Interview term: clustered index** — the table itself stored as a B+tree ordered by the primary key, with full rows in the leaves. InnoDB (MySQL) works this way, and each InnoDB secondary index entry stores the primary key columns, which InnoDB then looks up in the clustered index — so a long primary key makes every secondary index bigger (MySQL reference manual, "Clustered and Secondary Indexes").

The consequence: in InnoDB a lookup via a secondary index is *two* tree descents (secondary, then primary). In PostgreSQL it is one descent plus a heap page read. Either way, if the index already contains every column the query needs, the database can skip the row entirely — a covering index, explained on the [indexing strategies](/interview-question/what-indexing-strategies-improve-database-performance) page.

## 6. Other Index Structures, and When They Win

| Structure | Equality | Range / ORDER BY | Writes | Used by |
| :--- | :--- | :--- | :--- | :--- |
| Full table scan | O(n) | O(n) plus a sort | cheapest (no index) | any table without an index |
| B+tree | O(log n) pages | O(log n) + matching leaves | each insert updates the tree in place, sometimes splits | default index in PostgreSQL, MySQL, SQL Server, SQLite |
| Hash index | O(1) bucket | not supported | cheap | PostgreSQL \`USING hash\` (crash-safe and replicated only since PostgreSQL 10), in-memory stores |
| LSM tree | several sorted runs to check (Bloom filters help) | merge of sorted runs | very cheap: append to memory, flush sorted files, compact later | RocksDB, Cassandra, ScyllaDB |

📌 **Interview term: LSM tree (log-structured merge tree)** — writes go to an in-memory sorted buffer (memtable), which is flushed to immutable sorted files (SSTables) that are merged in the background (compaction). It turns random writes into sequential ones, which is why write-heavy stores use it; reads may check several files, and compaction rewrites data many times. The [Bloom filter](/interview-question/what-is-a-bloom-filter-and-when-is-it-useful) page shows how LSM stores skip files that cannot contain a key.

📌 **Interview term: write amplification** — one logical write causing several physical writes: the row, one entry in every index, occasional page splits, plus the [write-ahead log](/interview-question/what-is-a-write-ahead-log-wal). Each extra index on a table adds to it.

## 7. Verified: Running the Code

The example **"A B+tree from scratch: page splits, height, point lookups and range scans"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and \`javac Main.java && java Main\` (Java 21). All four print exactly this:

~~~text
B+tree, 10007 keys inserted in scrambled order, max 4 keys per page
  height=8 internal=1276 leaves=3307 leaf_fill=75%
  lookup 4242: found=true pages_read=8
  lookup 20000: found=false pages_read=8
  range 5000..5049: rows=50 pages_read=23
  ORDER BY key LIMIT 5, walked from the leftmost leaf: 0,1,2,3,4
B+tree, 10007 keys inserted in scrambled order, max 64 keys per page
  height=3 internal=7 leaves=256 leaf_fill=61%
  lookup 4242: found=true pages_read=3
  lookup 20000: found=false pages_read=3
  range 5000..5049: rows=50 pages_read=4
  ORDER BY key LIMIT 5, walked from the leftmost leaf: 0,1,2,3,4
Full table scan for the same lookup: rows_read=10007
Sequential inserts (like an auto-increment id), max 64 keys per page
  height=3 internal=10 leaves=312 leaf_fill=50%
Levels needed for 1,000,000,000 keys (fan-out ^ levels >= keys)
  fan-out 4: 15 levels
  fan-out 64: 5 levels
  fan-out 400: 4 levels
~~~

What the simulation stands for and what it leaves out: each node object stands for one disk page, and "pages read" counts node visits. A real B+tree stores variable-length keys in bytes, keeps row pointers in the leaves, caches hot pages, handles deletes and merges, and uses latches so many sessions can read and write at once. The maximum keys per page here (4 and 64) is far below real fan-out to make the levels visible.

## Edge Cases Worth Knowing

- **NULLs and indexes.** PostgreSQL B-trees store NULLs and can answer \`IS NULL\`; behaviour differs between engines, so check before relying on it.
- **Low-cardinality columns** (a boolean, a status with three values) make poor stand-alone B-tree indexes: one key matches a huge share of rows, and the planner prefers a scan.
- **Random keys such as UUIDv4** spread inserts over every leaf, so the whole index must stay hot in memory; time-ordered ids (UUIDv7, snowflake ids) keep inserts at the right edge. See [unique ID generator design](/interview-question/how-would-you-design-a-unique-id-generator-at-scale-5739).
- **Bloat.** Deletes and updates leave dead entries until vacuum (PostgreSQL) or purge (InnoDB) cleans them; heavily churned indexes can need a rebuild (\`REINDEX CONCURRENTLY\` in PostgreSQL).

## Common Pitfalls

- **Saying an index makes "everything" faster.** It speeds reads that can use it and slows every write that must maintain it, including the occasional page split.
- **Claiming lookups are O(1).** A B-tree lookup is O(log n) page reads — small because fan-out is large, not constant. Only hash indexes give O(1), and they cannot do ranges.
- **Forgetting the leaf chain.** Range scans and \`ORDER BY\` work because leaves are sorted and linked; that is the main reason B-trees beat hash indexes as the default.
- **Ignoring insert order.** Sequential keys produced 50% full leaves in the run with a naive split; random keys keep the whole index hot. Know which one your primary key is.
- **Mixing up clustered and secondary.** In InnoDB a secondary lookup also descends the primary key tree; in PostgreSQL it reads a heap page. Both explain why covering indexes help.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What an index is:</strong> <span style="color:#f0e2c8;">An index is a separate structure, sorted by the indexed columns, whose entries point to the rows. It replaces a <strong style="color:#ffca28;">full table scan</strong> with a search that reads only a few <strong style="color:#ffca28;">pages</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why a B+tree:</strong> <span style="color:#f0e2c8;">Each node is a disk page with <strong style="color:#ffca28;">fan-out</strong> in the hundreds, so even a billion keys need about 4 levels. A lookup reads one page per level, and the top levels stay cached.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Ranges and order:</strong> <span style="color:#f0e2c8;">All entries live in <strong style="color:#ffca28;">sorted, linked leaves</strong>, so the same tree serves equality, ranges, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> and prefix matches. A hash index only does equality.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Staying balanced:</strong> <span style="color:#f0e2c8;">Inserts go into leaves; a full leaf <strong style="color:#ffca28;">splits</strong> and pushes a separator to its parent, so all leaves stay at the same depth. Sequential keys fill pages differently from random ones.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The cost:</strong> <span style="color:#f0e2c8;">Every index must be updated on every insert, delete and update of its columns — <strong style="color:#ffca28;">write amplification</strong> plus storage. Write-heavy stores use <strong style="color:#ffca28;">LSM trees</strong> instead, trading read work for cheap sequential writes.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a binary search tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two children per node means about 30 levels for a billion keys, so 30 page reads. A B-tree packs hundreds of keys into one page and gets the same search in 3-4 page reads.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">B-tree vs B+tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A classic B-tree stores entries in internal nodes too. A B+tree keeps all entries in the leaves and links them, so internal nodes hold more separators (higher fan-out) and range scans just walk the leaf chain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to the index when a row is updated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If an indexed column changes, the old entry is removed or marked dead and a new one inserted in its sorted place. PostgreSQL can skip index updates entirely with a HOT update when no indexed column changed and the new row version fits on the same page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Clustered vs non-clustered index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A clustered index stores the rows themselves in key order (InnoDB primary key). A non-clustered or secondary index stores pointers; in InnoDB that pointer is the primary key value, so the lookup descends two trees.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you prefer an LSM tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For write-heavy workloads such as telemetry, logs or messaging, where sequential appends and background compaction beat in-place page updates. You pay with reads that may check several files and with compaction I/O.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Index | Sorted structure pointing from column values to rows |
| Full table scan | Reading every row to find matches |
| Page | Fixed-size block the database reads and writes (8 kB in PostgreSQL) |
| Fan-out | Number of children per internal node |
| B+tree | Balanced tree with entries only in linked leaves |
| Tree height | Levels from root to leaf; page reads per lookup |
| Page split | Dividing a full page and adding a separator to the parent |
| Secondary index | Index whose entries point to rows stored elsewhere |
| Clustered index | Table stored in primary-key order inside the B+tree |
| LSM tree | Write-optimised structure of memtable plus merged sorted files |
| Write amplification | One logical write causing many physical writes |

**Conclusion:** An index is a sorted copy of some columns that points back to the rows, and the B+tree is how databases keep that copy sorted on disk: wide pages give a tree only a few levels deep, linked leaves make ranges and ordering cheap, and page splits keep it balanced as data arrives. The run made the costs concrete — 8 levels with tiny pages versus 3 with bigger ones, 4 pages for a 50-key range against a 10,007-row scan, and 22% more pages when keys arrive in order. Every index is paid for on every write, which is why choosing *which* ones to build is its own skill.`,
    examples: [
      {
        label: `A B+tree from scratch: page splits, height, point lookups and range scans`,
        variants: [
          { tech: "node", code: `// A small B+tree: every node is a "page" holding at most MAX keys.
// Leaves hold the keys (and would hold row pointers); internal nodes hold separators.
function newNode(leaf) { return { leaf, keys: [], kids: [], next: null }; }

function insert(node, key, max) {
  // Returns null, or [separator, newRightNode] when this node split.
  let i = 0;
  while (i < node.keys.length && node.keys[i] < key) i++;
  if (node.leaf) {
    node.keys.splice(i, 0, key);
  } else {
    if (i < node.keys.length && node.keys[i] === key) i++;
    const split = insert(node.kids[i], key, max);
    if (split === null) return null;
    node.keys.splice(i, 0, split[0]);
    node.kids.splice(i + 1, 0, split[1]);
  }
  if (node.keys.length <= max) return null;
  const mid = Math.floor(node.keys.length / 2);
  const right = newNode(node.leaf);
  if (node.leaf) {
    right.keys = node.keys.slice(mid);
    node.keys = node.keys.slice(0, mid);
    right.next = node.next;
    node.next = right;
    return [right.keys[0], right];
  }
  const sep = node.keys[mid];
  right.keys = node.keys.slice(mid + 1);
  right.kids = node.kids.slice(mid + 1);
  node.keys = node.keys.slice(0, mid);
  node.kids = node.kids.slice(0, mid + 1);
  return [sep, right];
}

function build(keys, max) {
  let root = newNode(true);
  for (const k of keys) {
    const split = insert(root, k, max);
    if (split !== null) {
      const r = newNode(false);
      r.keys = [split[0]];
      r.kids = [root, split[1]];
      root = r;
    }
  }
  return root;
}

function stats(root, max) {
  let height = 0, internal = 0, leaves = 0, leafKeys = 0;
  let level = [root];
  while (level.length > 0) {
    height++;
    const nextLevel = [];
    for (const n of level) {
      if (n.leaf) { leaves++; leafKeys += n.keys.length; } else { internal++; nextLevel.push(...n.kids); }
    }
    level = nextLevel;
  }
  const fill = Math.floor((leafKeys * 100) / (leaves * max));
  return \`height=\${height} internal=\${internal} leaves=\${leaves} leaf_fill=\${fill}%\`;
}

function descend(root, key) {
  let node = root, pages = 1;
  while (!node.leaf) {
    let i = 0;
    while (i < node.keys.length && key >= node.keys[i]) i++;
    node = node.kids[i];
    pages++;
  }
  return [node, pages];
}

function lookup(root, key) {
  const [leaf, pages] = descend(root, key);
  return \`lookup \${key}: found=\${leaf.keys.includes(key)} pages_read=\${pages}\`;
}

function range(root, lo, hi) {
  let [leaf, pages] = descend(root, lo);
  let rows = 0;
  while (leaf !== null) {
    let past = false;
    for (const k of leaf.keys) {
      if (k > hi) { past = true; break; }
      if (k >= lo) rows++;
    }
    if (past || leaf.next === null) break;
    leaf = leaf.next;
    pages++;
  }
  return \`range \${lo}..\${hi}: rows=\${rows} pages_read=\${pages}\`;
}

function firstKeys(root, n) {
  let node = root;
  while (!node.leaf) node = node.kids[0];
  const out = [];
  while (node !== null && out.length < n) { for (const k of node.keys) if (out.length < n) out.push(k); node = node.next; }
  return out.join(",");
}

const N = 10007; // prime, so (i * 7919) % N visits every key 0..N-1 once, in scrambled order
const scrambled = [];
for (let i = 0; i < N; i++) scrambled.push((i * 7919) % N);
const sequential = [];
for (let i = 0; i < N; i++) sequential.push(i);

for (const max of [4, 64]) {
  const t = build(scrambled, max);
  console.log(\`B+tree, \${N} keys inserted in scrambled order, max \${max} keys per page\`);
  console.log("  " + stats(t, max));
  console.log("  " + lookup(t, 4242));
  console.log("  " + lookup(t, 20000));
  console.log("  " + range(t, 5000, 5049));
  console.log("  ORDER BY key LIMIT 5, walked from the leftmost leaf: " + firstKeys(t, 5));
}
console.log(\`Full table scan for the same lookup: rows_read=\${N}\`);

const seq = build(sequential, 64);
console.log("Sequential inserts (like an auto-increment id), max 64 keys per page");
console.log("  " + stats(seq, 64));

console.log("Levels needed for 1,000,000,000 keys (fan-out ^ levels >= keys)");
for (const fanout of [4, 64, 400]) {
  let levels = 0, reach = 1;
  while (reach < 1000000000) { reach *= fanout; levels++; }
  console.log(\`  fan-out \${fanout}: \${levels} levels\`);
}` },
          { tech: "python", code: `# A small B+tree: every node is a "page" holding at most MAX keys.
# Leaves hold the keys (and would hold row pointers); internal nodes hold separators.
class Node:
    def __init__(self, leaf):
        self.leaf = leaf
        self.keys = []
        self.kids = []
        self.next = None


def insert(node, key, mx):
    # Returns None, or (separator, new_right_node) when this node split.
    i = 0
    while i < len(node.keys) and node.keys[i] < key:
        i += 1
    if node.leaf:
        node.keys.insert(i, key)
    else:
        if i < len(node.keys) and node.keys[i] == key:
            i += 1
        split = insert(node.kids[i], key, mx)
        if split is None:
            return None
        node.keys.insert(i, split[0])
        node.kids.insert(i + 1, split[1])
    if len(node.keys) <= mx:
        return None
    mid = len(node.keys) // 2
    right = Node(node.leaf)
    if node.leaf:
        right.keys = node.keys[mid:]
        node.keys = node.keys[:mid]
        right.next = node.next
        node.next = right
        return (right.keys[0], right)
    sep = node.keys[mid]
    right.keys = node.keys[mid + 1:]
    right.kids = node.kids[mid + 1:]
    node.keys = node.keys[:mid]
    node.kids = node.kids[:mid + 1]
    return (sep, right)


def build(keys, mx):
    root = Node(True)
    for k in keys:
        split = insert(root, k, mx)
        if split is not None:
            r = Node(False)
            r.keys = [split[0]]
            r.kids = [root, split[1]]
            root = r
    return root


def stats(root, mx):
    height = internal = leaves = leaf_keys = 0
    level = [root]
    while level:
        height += 1
        next_level = []
        for n in level:
            if n.leaf:
                leaves += 1
                leaf_keys += len(n.keys)
            else:
                internal += 1
                next_level.extend(n.kids)
        level = next_level
    fill = (leaf_keys * 100) // (leaves * mx)
    return f"height={height} internal={internal} leaves={leaves} leaf_fill={fill}%"


def descend(root, key):
    node, pages = root, 1
    while not node.leaf:
        i = 0
        while i < len(node.keys) and key >= node.keys[i]:
            i += 1
        node = node.kids[i]
        pages += 1
    return node, pages


def lookup(root, key):
    leaf, pages = descend(root, key)
    found = "true" if key in leaf.keys else "false"
    return f"lookup {key}: found={found} pages_read={pages}"


def range_scan(root, lo, hi):
    leaf, pages = descend(root, lo)
    rows = 0
    while leaf is not None:
        past = False
        for k in leaf.keys:
            if k > hi:
                past = True
                break
            if k >= lo:
                rows += 1
        if past or leaf.next is None:
            break
        leaf = leaf.next
        pages += 1
    return f"range {lo}..{hi}: rows={rows} pages_read={pages}"


def first_keys(root, n):
    node = root
    while not node.leaf:
        node = node.kids[0]
    out = []
    while node is not None and len(out) < n:
        for k in node.keys:
            if len(out) < n:
                out.append(k)
        node = node.next
    return ",".join(str(k) for k in out)


N = 10007  # prime, so (i * 7919) % N visits every key 0..N-1 once, in scrambled order
scrambled = [(i * 7919) % N for i in range(N)]
sequential = list(range(N))

for mx in (4, 64):
    t = build(scrambled, mx)
    print(f"B+tree, {N} keys inserted in scrambled order, max {mx} keys per page")
    print("  " + stats(t, mx))
    print("  " + lookup(t, 4242))
    print("  " + lookup(t, 20000))
    print("  " + range_scan(t, 5000, 5049))
    print("  ORDER BY key LIMIT 5, walked from the leftmost leaf: " + first_keys(t, 5))
print(f"Full table scan for the same lookup: rows_read={N}")

seq = build(sequential, 64)
print("Sequential inserts (like an auto-increment id), max 64 keys per page")
print("  " + stats(seq, 64))

print("Levels needed for 1,000,000,000 keys (fan-out ^ levels >= keys)")
for fanout in (4, 64, 400):
    levels, reach = 0, 1
    while reach < 1000000000:
        reach *= fanout
        levels += 1
    print(f"  fan-out {fanout}: {levels} levels")` },
          { tech: "go", code: `// A small B+tree: every node is a "page" holding at most MAX keys.
// Leaves hold the keys (and would hold row pointers); internal nodes hold separators.
package main

import (
	"fmt"
	"strconv"
	"strings"
)

type Node struct {
	leaf bool
	keys []int
	kids []*Node
	next *Node
}

func insertAt[T any](s []T, i int, v T) []T {
	s = append(s, v)
	copy(s[i+1:], s[i:])
	s[i] = v
	return s
}

// insert returns (separator, newRightNode, true) when this node split.
func insert(node *Node, key, max int) (int, *Node, bool) {
	i := 0
	for i < len(node.keys) && node.keys[i] < key {
		i++
	}
	if node.leaf {
		node.keys = insertAt(node.keys, i, key)
	} else {
		if i < len(node.keys) && node.keys[i] == key {
			i++
		}
		sep, right, split := insert(node.kids[i], key, max)
		if !split {
			return 0, nil, false
		}
		node.keys = insertAt(node.keys, i, sep)
		node.kids = insertAt(node.kids, i+1, right)
	}
	if len(node.keys) <= max {
		return 0, nil, false
	}
	mid := len(node.keys) / 2
	right := &Node{leaf: node.leaf}
	if node.leaf {
		right.keys = append([]int{}, node.keys[mid:]...)
		node.keys = append([]int{}, node.keys[:mid]...)
		right.next = node.next
		node.next = right
		return right.keys[0], right, true
	}
	sep := node.keys[mid]
	right.keys = append([]int{}, node.keys[mid+1:]...)
	right.kids = append([]*Node{}, node.kids[mid+1:]...)
	node.keys = append([]int{}, node.keys[:mid]...)
	node.kids = append([]*Node{}, node.kids[:mid+1]...)
	return sep, right, true
}

func build(keys []int, max int) *Node {
	root := &Node{leaf: true}
	for _, k := range keys {
		if sep, right, split := insert(root, k, max); split {
			root = &Node{keys: []int{sep}, kids: []*Node{root, right}}
		}
	}
	return root
}

func stats(root *Node, max int) string {
	height, internal, leaves, leafKeys := 0, 0, 0, 0
	level := []*Node{root}
	for len(level) > 0 {
		height++
		var nextLevel []*Node
		for _, n := range level {
			if n.leaf {
				leaves++
				leafKeys += len(n.keys)
			} else {
				internal++
				nextLevel = append(nextLevel, n.kids...)
			}
		}
		level = nextLevel
	}
	fill := (leafKeys * 100) / (leaves * max)
	return fmt.Sprintf("height=%d internal=%d leaves=%d leaf_fill=%d%%", height, internal, leaves, fill)
}

func descend(root *Node, key int) (*Node, int) {
	node, pages := root, 1
	for !node.leaf {
		i := 0
		for i < len(node.keys) && key >= node.keys[i] {
			i++
		}
		node = node.kids[i]
		pages++
	}
	return node, pages
}

func lookup(root *Node, key int) string {
	leaf, pages := descend(root, key)
	found := false
	for _, k := range leaf.keys {
		if k == key {
			found = true
		}
	}
	return fmt.Sprintf("lookup %d: found=%t pages_read=%d", key, found, pages)
}

func rangeScan(root *Node, lo, hi int) string {
	leaf, pages := descend(root, lo)
	rows := 0
	for leaf != nil {
		past := false
		for _, k := range leaf.keys {
			if k > hi {
				past = true
				break
			}
			if k >= lo {
				rows++
			}
		}
		if past || leaf.next == nil {
			break
		}
		leaf = leaf.next
		pages++
	}
	return fmt.Sprintf("range %d..%d: rows=%d pages_read=%d", lo, hi, rows, pages)
}

func firstKeys(root *Node, n int) string {
	node := root
	for !node.leaf {
		node = node.kids[0]
	}
	var out []string
	for node != nil && len(out) < n {
		for _, k := range node.keys {
			if len(out) < n {
				out = append(out, strconv.Itoa(k))
			}
		}
		node = node.next
	}
	return strings.Join(out, ",")
}

func main() {
	N := 10007 // prime, so (i * 7919) % N visits every key 0..N-1 once, in scrambled order
	scrambled := make([]int, N)
	sequential := make([]int, N)
	for i := 0; i < N; i++ {
		scrambled[i] = (i * 7919) % N
		sequential[i] = i
	}
	for _, max := range []int{4, 64} {
		t := build(scrambled, max)
		fmt.Printf("B+tree, %d keys inserted in scrambled order, max %d keys per page\\n", N, max)
		fmt.Println("  " + stats(t, max))
		fmt.Println("  " + lookup(t, 4242))
		fmt.Println("  " + lookup(t, 20000))
		fmt.Println("  " + rangeScan(t, 5000, 5049))
		fmt.Println("  ORDER BY key LIMIT 5, walked from the leftmost leaf: " + firstKeys(t, 5))
	}
	fmt.Printf("Full table scan for the same lookup: rows_read=%d\\n", N)
	seq := build(sequential, 64)
	fmt.Println("Sequential inserts (like an auto-increment id), max 64 keys per page")
	fmt.Println("  " + stats(seq, 64))
	fmt.Println("Levels needed for 1,000,000,000 keys (fan-out ^ levels >= keys)")
	for _, fanout := range []int64{4, 64, 400} {
		levels, reach := 0, int64(1)
		for reach < 1000000000 {
			reach *= fanout
			levels++
		}
		fmt.Printf("  fan-out %d: %d levels\\n", fanout, levels)
	}
}` },
          { tech: "java", code: `// A small B+tree: every node is a "page" holding at most MAX keys.
// Leaves hold the keys (and would hold row pointers); internal nodes hold separators.
import java.util.ArrayList;
import java.util.List;

public class Main {
    static class Node {
        boolean leaf;
        List<Integer> keys = new ArrayList<>();
        List<Node> kids = new ArrayList<>();
        Node next;
        Node(boolean leaf) { this.leaf = leaf; }
    }

    record Split(int sep, Node right) {}

    static Split insert(Node node, int key, int max) {
        int i = 0;
        while (i < node.keys.size() && node.keys.get(i) < key) i++;
        if (node.leaf) {
            node.keys.add(i, key);
        } else {
            if (i < node.keys.size() && node.keys.get(i) == key) i++;
            Split s = insert(node.kids.get(i), key, max);
            if (s == null) return null;
            node.keys.add(i, s.sep());
            node.kids.add(i + 1, s.right());
        }
        if (node.keys.size() <= max) return null;
        int mid = node.keys.size() / 2;
        Node right = new Node(node.leaf);
        if (node.leaf) {
            right.keys = new ArrayList<>(node.keys.subList(mid, node.keys.size()));
            node.keys = new ArrayList<>(node.keys.subList(0, mid));
            right.next = node.next;
            node.next = right;
            return new Split(right.keys.get(0), right);
        }
        int sep = node.keys.get(mid);
        right.keys = new ArrayList<>(node.keys.subList(mid + 1, node.keys.size()));
        right.kids = new ArrayList<>(node.kids.subList(mid + 1, node.kids.size()));
        node.keys = new ArrayList<>(node.keys.subList(0, mid));
        node.kids = new ArrayList<>(node.kids.subList(0, mid + 1));
        return new Split(sep, right);
    }

    static Node build(int[] keys, int max) {
        Node root = new Node(true);
        for (int k : keys) {
            Split s = insert(root, k, max);
            if (s != null) {
                Node r = new Node(false);
                r.keys.add(s.sep());
                r.kids.add(root);
                r.kids.add(s.right());
                root = r;
            }
        }
        return root;
    }

    static String stats(Node root, int max) {
        int height = 0, internal = 0, leaves = 0, leafKeys = 0;
        List<Node> level = List.of(root);
        while (!level.isEmpty()) {
            height++;
            List<Node> nextLevel = new ArrayList<>();
            for (Node n : level) {
                if (n.leaf) { leaves++; leafKeys += n.keys.size(); } else { internal++; nextLevel.addAll(n.kids); }
            }
            level = nextLevel;
        }
        int fill = (leafKeys * 100) / (leaves * max);
        return "height=" + height + " internal=" + internal + " leaves=" + leaves + " leaf_fill=" + fill + "%";
    }

    static Object[] descend(Node root, int key) {
        Node node = root;
        int pages = 1;
        while (!node.leaf) {
            int i = 0;
            while (i < node.keys.size() && key >= node.keys.get(i)) i++;
            node = node.kids.get(i);
            pages++;
        }
        return new Object[] {node, pages};
    }

    static String lookup(Node root, int key) {
        Object[] d = descend(root, key);
        Node leaf = (Node) d[0];
        return "lookup " + key + ": found=" + leaf.keys.contains(key) + " pages_read=" + d[1];
    }

    static String range(Node root, int lo, int hi) {
        Object[] d = descend(root, lo);
        Node leaf = (Node) d[0];
        int pages = (Integer) d[1], rows = 0;
        while (leaf != null) {
            boolean past = false;
            for (int k : leaf.keys) {
                if (k > hi) { past = true; break; }
                if (k >= lo) rows++;
            }
            if (past || leaf.next == null) break;
            leaf = leaf.next;
            pages++;
        }
        return "range " + lo + ".." + hi + ": rows=" + rows + " pages_read=" + pages;
    }

    static String firstKeys(Node root, int n) {
        Node node = root;
        while (!node.leaf) node = node.kids.get(0);
        List<String> out = new ArrayList<>();
        while (node != null && out.size() < n) {
            for (int k : node.keys) if (out.size() < n) out.add(Integer.toString(k));
            node = node.next;
        }
        return String.join(",", out);
    }

    public static void main(String[] args) {
        int N = 10007; // prime, so (i * 7919) % N visits every key 0..N-1 once, in scrambled order
        int[] scrambled = new int[N], sequential = new int[N];
        for (int i = 0; i < N; i++) { scrambled[i] = (i * 7919) % N; sequential[i] = i; }
        for (int max : new int[] {4, 64}) {
            Node t = build(scrambled, max);
            System.out.println("B+tree, " + N + " keys inserted in scrambled order, max " + max + " keys per page");
            System.out.println("  " + stats(t, max));
            System.out.println("  " + lookup(t, 4242));
            System.out.println("  " + lookup(t, 20000));
            System.out.println("  " + range(t, 5000, 5049));
            System.out.println("  ORDER BY key LIMIT 5, walked from the leftmost leaf: " + firstKeys(t, 5));
        }
        System.out.println("Full table scan for the same lookup: rows_read=" + N);
        Node seq = build(sequential, 64);
        System.out.println("Sequential inserts (like an auto-increment id), max 64 keys per page");
        System.out.println("  " + stats(seq, 64));
        System.out.println("Levels needed for 1,000,000,000 keys (fan-out ^ levels >= keys)");
        for (long fanout : new long[] {4, 64, 400}) {
            int levels = 0;
            long reach = 1;
            while (reach < 1000000000L) { reach *= fanout; levels++; }
            System.out.println("  fan-out " + fanout + ": " + levels + " levels");
        }
    }
}` },
        ],
      },
    ],
  },
  {
    title: `What indexing strategies improve database performance?`,
    difficulty: "medium",
    seoDescription: `Practical indexing: composite column order, covering and partial indexes, expression indexes, skip scan, selectivity, and what every index costs on writes.`,
    description: `**Question presented to candidate:**
"Your API has a slow endpoint and the database is the bottleneck. Beyond 'add an index', what indexing strategies would you use? How do you decide which columns go in an index and in what order, and how do you know you have too many?"

**What a strong answer should cover:**
- Start from the workload: find the slow, frequent queries (\`pg_stat_statements\`, slow query log) and read the plan with \`EXPLAIN ANALYZE\` before and after
- **Composite indexes** and the **leftmost-prefix rule**: equality columns first, then the range or sort column; PostgreSQL 18 adds **skip scan** for some queries that omit the leading column
- **Covering indexes** (\`INCLUDE\`, PostgreSQL 11+) enable **index-only scans**; **partial indexes** index only the rows you query; **expression indexes** for \`lower(email)\`-style predicates
- **Selectivity**: the planner skips an index that matches a large share of rows, because random page reads cost more than a sequential scan
- Specialised types where they fit (GIN for \`jsonb\`, arrays and full-text; BRIN for huge append-only time-ordered tables; hash for equality only)
- Every index taxes writes and memory: measure usage and drop unused or duplicate indexes

**Clarifying questions expected:**
- Which exact queries are slow, and how often do they run compared with writes to the table?
- Is this OLTP traffic (many small queries) or reporting (few large scans)?

**Code / implementation expected:** Optional — \`CREATE INDEX\` statements with reasons are enough; the example counts the work each index design costs on one table.`,
    answer: `**Target Audience:** Developers who know what an index is and want to choose good ones. If "B-tree", "page" and "leaf" are new, read [Explain database indexing and B-trees](/interview-question/database-indexing-btrees) first; this page does not re-explain the tree.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output), plus real query plans from SQLite 3.45.1 via Python.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Behaviour shown comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A warehouse keeps its parcels on shelves in arrival order. The manager adds a printed list sorted by customer name. Great for "all parcels for Lee". Then someone asks "all parcels for Lee that arrived this week, oldest first" — and the list sorted only by name means reading every Lee parcel and sorting them by hand. A list sorted by *name, then date* answers it by reading exactly the right lines, in the right order. A list sorted by *date, then name* is nearly useless for it: Lee parcels are scattered across every date.

Then the manager prints a list for every possible question — and every new parcel now means updating twelve lists. Deliveries slow to a crawl.

That is the whole craft of indexing: the **order of columns** decides which questions an index answers, and **every index you add is paid for on every write**.

## 2. Start From the Workload, Not From the Schema

1. **Find the queries that matter.** In PostgreSQL the \`pg_stat_statements\` extension ranks queries by total time; MySQL has the slow query log. A query that runs 10,000 times a minute at 5 ms matters more than one nightly report at 30 s.
2. **Read the plan.** \`EXPLAIN ANALYZE\` shows whether the database did a sequential scan, an index scan, or an index-only scan, how many rows each step produced, and where time went.
3. **Change one thing, measure again.** Create the index (\`CREATE INDEX CONCURRENTLY\` in PostgreSQL avoids blocking writes on a live table), rerun the plan, compare.

📌 **Interview term: query plan** — the step-by-step strategy the database chose for a query (scan types, join order, sorts), shown by \`EXPLAIN\`. The optimizer picks it from table statistics, so the same SQL can get different plans on different data.

## 3. The Strategies, Measured on One Table

The example builds an \`orders\` table of 100,000 rows (200 tenants, 365 days, three statuses) and models each index as a sorted list. It counts **index entries read** and **heap fetches** — jumps from an index entry to the table row, which in a real database are random page reads.

📌 **Interview term: heap fetch** — following an index entry to the table to read the full row (or check its visibility). Usually the most expensive part of an index scan, because the rows are scattered over many pages.

### 3.1 Composite indexes and column order

~~~text
Q1: SELECT day, amount FROM orders WHERE tenant = 42 AND day >= 300 ORDER BY day
  no index (full table scan)           rows_read=100000 rows=88  (then sort)
  INDEX (tenant)                       entries=   530 heap_fetches=   530 rows=88
  INDEX (tenant, day)                  entries=    88 heap_fetches=    88 rows=88
  INDEX (day, tenant)  wrong order     entries= 17682 heap_fetches=    88 rows=88
  INDEX (tenant, day) INCLUDE (amount) entries=    88 heap_fetches=     0 rows=88
~~~

- A single-column index on \`tenant\` finds tenant 42 quickly but must fetch all 530 of its rows to check \`day\`, then sort — 530 heap fetches for 88 results.
- \`(tenant, day)\` puts the 88 matching entries **next to each other, already in day order**: 88 entries, 88 fetches, no sort.
- \`(day, tenant)\` has the same columns in the wrong order: the range \`day >= 300\` spans 17,682 entries, and tenant 42 is scattered inside it.

📌 **Interview term: composite (multi-column) index** — one index sorted by several columns, like a phone book sorted by last name, then first name.

📌 **Interview term: leftmost-prefix rule** — a composite index on \`(a, b, c)\` can seek on \`a\`, on \`a, b\`, or on \`a, b, c\`, but not directly on \`b\` or \`c\` alone. A practical ordering rule: **equality columns first, then the range or \`ORDER BY\` column**.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Index on tenant then day: the entries for tenant 42 from day 300 on form one contiguous run">
  <rect class="d-box-muted" x="20" y="60" width="150" height="56" rx="8"/>
  <text class="d-text" x="95" y="93" text-anchor="middle">41, any day</text>
  <rect class="d-box-muted" x="200" y="60" width="150" height="56" rx="8"/>
  <text class="d-text" x="275" y="93" text-anchor="middle">42, day 0-299</text>
  <rect class="d-box-accent" x="380" y="60" width="180" height="56" rx="8"/>
  <text class="d-text" x="470" y="93" text-anchor="middle">42, day 300-364</text>
  <rect class="d-box-muted" x="590" y="60" width="150" height="56" rx="8"/>
  <text class="d-text" x="665" y="93" text-anchor="middle">43, any day</text>
  <text class="d-sub" x="470" y="40" text-anchor="middle">one seek, then read 88 entries</text>
</svg>

With \`(tenant, day)\` the answer is one contiguous run of leaf entries: seek to (42, 300), read until the tenant changes.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Index on day then tenant: tenant 42 entries are scattered across every day from 300 to 364">
  <rect class="d-box-muted" x="20" y="60" width="150" height="56" rx="8"/>
  <text class="d-text" x="95" y="93" text-anchor="middle">day 0-299</text>
  <rect class="d-box" x="200" y="60" width="160" height="56" rx="8"/>
  <text class="d-text" x="280" y="85" text-anchor="middle">day 300</text>
  <text class="d-sub" x="280" y="105" text-anchor="middle">tenants 1-200</text>
  <rect class="d-box" x="390" y="60" width="160" height="56" rx="8"/>
  <text class="d-text" x="470" y="85" text-anchor="middle">day 301</text>
  <text class="d-sub" x="470" y="105" text-anchor="middle">tenants 1-200</text>
  <rect class="d-box" x="580" y="60" width="160" height="56" rx="8"/>
  <text class="d-text" x="660" y="85" text-anchor="middle">day 302 to 364</text>
  <text class="d-sub" x="660" y="105" text-anchor="middle">tenants 1-200</text>
  <text class="d-sub" x="470" y="40" text-anchor="middle">must read every tenant on every day</text>
</svg>

With \`(day, tenant)\` the database reads all 17,682 entries for days 300 to 364 and filters tenant 42 out of each day.

### 3.2 Covering indexes and index-only scans

The last line of the Q1 output is the same \`(tenant, day)\` index with \`amount\` added as a payload column: 0 heap fetches, because every column the query selects is in the index.

📌 **Interview term: covering index** — an index that contains every column a query needs, so the table is never read. In PostgreSQL 11 and later you add non-key payload columns with \`INCLUDE\`:

~~~sql
CREATE INDEX orders_tenant_day ON orders (tenant_id, day) INCLUDE (amount);
~~~

📌 **Interview term: index-only scan** — a scan answered entirely from the index. PostgreSQL still has to know each row is visible to your transaction; it skips the heap only for pages marked all-visible in the **visibility map**, so the docs note an index-only scan wins only when a large fraction of heap pages are all-visible (kept up to date by \`VACUUM\`). \`EXPLAIN ANALYZE\` reports the leftover \`Heap Fetches\`.

### 3.3 When the leading column is missing: skip scan

~~~text
Q2: SELECT * FROM orders WHERE day = 100   (leftmost-prefix rule)
  INDEX (tenant, day): no seek on day  entries=100000 heap_fetches=   294 rows=294
  INDEX (tenant, day) + skip scan      entries=   294 heap_fetches=   294 rows=294
  (the skip scan made 200 seeks, one per distinct tenant)
  INDEX (day, tenant)                  entries=   294 heap_fetches=   294 rows=294
~~~

A query on \`day\` alone cannot seek into \`(tenant, day)\`: classically it reads all 100,000 entries (or the planner scans the table). A **skip scan** does one seek per distinct value of the leading column — 200 seeks here — and reads only the 294 matching entries. PostgreSQL 18 (released 25 September 2025) added skip scan for multicolumn B-tree indexes; it helps when the omitted leading column has few distinct values (PostgreSQL 18 release notes). MySQL has had a skip scan access method since 8.0.13 (\`Using index for skip scan\` in \`EXPLAIN\`, per the MySQL range optimization docs). On older PostgreSQL, or with a high-cardinality leading column, you still need an index that starts with \`day\`.

📌 **Interview term: skip scan** — scanning a composite index whose leading column is not constrained by jumping to each distinct leading value and seeking inside it.

### 3.4 Partial indexes

~~~text
Q3: SELECT * FROM orders WHERE status = 'open' ORDER BY day
  INDEX (status, day)                  entries=  1977 heap_fetches=  1977 rows=1977
  INDEX (day) WHERE status = 'open'    entries=  1977 heap_fetches=  1977 rows=1977
  index sizes: full=100000 entries, partial=1977 entries
~~~

Only 2% of orders are \`open\`, and the work queue only ever asks for open ones. A full index on \`(status, day)\` and a partial index on \`day WHERE status = 'open'\` read the same 1,977 entries — but the partial index holds 1,977 entries instead of 100,000, so it is about 50 times smaller, stays in cache, and inserts of non-open rows never touch it.

📌 **Interview term: partial index** — an index over only the rows matching a \`WHERE\` condition. The query must include a condition the planner can prove implies the index predicate.

~~~sql
CREATE INDEX orders_open_by_day ON orders (day) WHERE status = 'open';
~~~

### 3.5 Selectivity: when the database ignores your index

~~~text
Q4: is the index worth using? (selectivity decides)
  id = 12345          matches=    1 ( 0.00%)  seq=5000  index=     4  -> index scan
  tenant = 42         matches=  530 ( 0.53%)  seq=5000  index=  2120  -> index scan
  status = 'open'     matches= 1977 ( 1.98%)  seq=5000  index=  7908  -> sequential scan
  status = 'shipped'  matches=70199 (70.20%)  seq=5000  index=280796  -> sequential scan
~~~

📌 **Interview term: selectivity** — the fraction of rows a condition matches. Low fraction = highly selective = index-friendly.

The example uses PostgreSQL default planner costs: reading a page in sequence costs \`seq_page_cost = 1.0\`, a random page \`random_page_cost = 4.0\` (PostgreSQL docs, "Planner Cost Constants"). With about 20 rows per 8 kB page, a full scan costs 5,000. If every match is a random page read, the index wins for 1 row or 530 rows (0.53%), and loses already at 1,977 rows (1.98%). Real planners are smarter — they use statistics about column correlation and **bitmap scans** that sort the heap pages before reading — but the shape holds: **an index on a column where one value covers a big share of the table is rarely used**, and lowering \`random_page_cost\` (common on SSDs with mostly cached data) moves the crossover.

### 3.6 Predicates that defeat an index

These were checked on a real planner (SQLite 3.45.1, through Python \`sqlite3\`, 20,000 rows, indexes on \`(tenant, day)\` and \`email\`):

~~~text
SELECT * FROM orders WHERE tenant = 42 AND day >= 300 => SEARCH orders USING INDEX ix_tenant_day (tenant=? AND day>?)
SELECT tenant, day FROM orders WHERE tenant = 42 => SEARCH orders USING COVERING INDEX ix_tenant_day (tenant=?)
SELECT * FROM orders WHERE email = 'User7@x.io' => SEARCH orders USING INDEX ix_email (email=?)
SELECT * FROM orders WHERE lower(email) = 'user7@x.io' => SCAN orders
SELECT * FROM orders WHERE email LIKE '%7@x.io' => SCAN orders
~~~

Wrapping the column in a function (\`lower(email)\`) or using a leading wildcard (\`LIKE '%...'\`) turns the search into a full scan, because the index is sorted by the raw value. After \`CREATE INDEX ix_lower_email ON orders(lower(email))\` the same planner reported \`SEARCH orders USING INDEX ix_lower_email (<expr>=?)\`.

📌 **Interview term: expression (functional) index** — an index on the result of an expression such as \`lower(email)\`; the query must use the same expression to match it. Implicit casts (comparing a text column with a number) can defeat an index the same way.

### 3.7 Specialised index types

| Index type | Use it for | Example |
| :--- | :--- | :--- |
| B-tree (default) | equality, ranges, sorting, prefix \`LIKE 'abc%'\` | \`(tenant_id, created_at)\` |
| Unique | enforcing a rule and fast lookups at once | \`UNIQUE (email)\` |
| GIN | "contains" queries on \`jsonb\`, arrays, full-text \`tsvector\` | \`USING gin (tags)\` |
| BRIN | very large, append-only tables whose rows arrive in column order (logs, events by time) | \`USING brin (created_at)\`, tiny compared with a B-tree |
| Hash | equality only on long values | \`USING hash (session_token)\` |

## 4. The Bill: What Every Index Costs

~~~text
Q5: cost of one INSERT as indexes pile up (each index is one more B-tree to update)
  0 indexes: 1 writes, 1 indexes: 2 writes, 3 indexes: 4 writes, 6 indexes: 7 writes
~~~

Each index is another B-tree to update on every insert and delete, and on every update that changes an indexed column — plus write-ahead log volume, cache memory and vacuum work. A table with six indexes does seven structure updates per insert. So:

- **Drop unused indexes.** In PostgreSQL, \`pg_stat_user_indexes.idx_scan = 0\` over a representative period is a strong hint (check replicas too — usage stats are per server).
- **Drop redundant ones.** An index on \`(tenant)\` is usually redundant next to \`(tenant, day)\`, which serves the same seeks.
- **Prefer one composite index serving several queries** over several single-column ones.

## 5. Verified: Running the Code

The example **"Index designs compared: composite order, covering, partial, skip scan and selectivity"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Q1: SELECT day, amount FROM orders WHERE tenant = 42 AND day >= 300 ORDER BY day
  no index (full table scan)           rows_read=100000 rows=88  (then sort)
  INDEX (tenant)                       entries=   530 heap_fetches=   530 rows=88
  INDEX (tenant, day)                  entries=    88 heap_fetches=    88 rows=88
  INDEX (day, tenant)  wrong order     entries= 17682 heap_fetches=    88 rows=88
  INDEX (tenant, day) INCLUDE (amount) entries=    88 heap_fetches=     0 rows=88

Q2: SELECT * FROM orders WHERE day = 100   (leftmost-prefix rule)
  INDEX (tenant, day): no seek on day  entries=100000 heap_fetches=   294 rows=294
  INDEX (tenant, day) + skip scan      entries=   294 heap_fetches=   294 rows=294
  (the skip scan made 200 seeks, one per distinct tenant)
  INDEX (day, tenant)                  entries=   294 heap_fetches=   294 rows=294

Q3: SELECT * FROM orders WHERE status = 'open' ORDER BY day
  INDEX (status, day)                  entries=  1977 heap_fetches=  1977 rows=1977
  INDEX (day) WHERE status = 'open'    entries=  1977 heap_fetches=  1977 rows=1977
  index sizes: full=100000 entries, partial=1977 entries

Q4: is the index worth using? (selectivity decides)
  id = 12345          matches=    1 ( 0.00%)  seq=5000  index=     4  -> index scan
  tenant = 42         matches=  530 ( 0.53%)  seq=5000  index=  2120  -> index scan
  status = 'open'     matches= 1977 ( 1.98%)  seq=5000  index=  7908  -> sequential scan
  status = 'shipped'  matches=70199 (70.20%)  seq=5000  index=280796  -> sequential scan

Q5: cost of one INSERT as indexes pile up (each index is one more B-tree to update)
  0 indexes: 1 writes, 1 indexes: 2 writes, 3 indexes: 4 writes, 6 indexes: 7 writes
~~~

What the simulation stands for and what it leaves out: each index is a sorted array searched with binary search, "entries" counts leaf entries read, and "heap fetches" counts row lookups. It does not model pages, caching, bitmap scans, visibility checks or the real cost model of any database; the cost line in Q4 uses PostgreSQL default cost constants as a simplified rule of thumb. The SQLite plans in section 3.6 are real planner output from a separate run.

## Edge Cases Worth Knowing

- **Multi-tenant tables** almost always want \`tenant_id\` as the leading column of most indexes, so each tenant data stays contiguous.
- **\`OR\` conditions** across different columns often need either two indexes combined by a bitmap scan or a rewrite as \`UNION\`.
- **Sorting direction.** An index on \`(a ASC, b DESC)\` serves \`ORDER BY a, b DESC\`; mixed directions need matching index directions.
- **Foreign keys** are not indexed automatically in PostgreSQL; an unindexed foreign key makes deletes on the parent table scan the child.
- **Statistics go stale.** After a bulk load, run \`ANALYZE\` so the planner knows the new distribution, or it may ignore a perfect index.

## Common Pitfalls

- **Wrong column order in a composite index** — the run showed \`(day, tenant)\` reading 17,682 entries where \`(tenant, day)\` read 88.
- **Indexing low-selectivity columns alone** (a boolean, a status) and wondering why the plan still says \`Seq Scan\`.
- **Functions and casts on the indexed column** (\`lower(email)\`, \`date(created_at)\`) silently disabling the index — use an expression index or rewrite the predicate as a range.
- **Adding an index per slow query** until writes slow down; check \`idx_scan\`, merge into composite indexes, delete the rest.
- **Trusting \`EXPLAIN\` without \`ANALYZE\`** — estimates can be far from reality; look at actual rows and heap fetches.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Start from evidence:</strong> <span style="color:#f0e2c8;">I find the expensive queries with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_stat_statements</code> or the slow log, read the plan with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code>, and design indexes for those queries, not for columns.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Composite order:</strong> <span style="color:#f0e2c8;">For a composite index I put <strong style="color:#ffca28;">equality columns first, then the range or sort column</strong>. In my example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(tenant, day)</code> read 88 entries for a query where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(day, tenant)</code> read 17,682 — the <strong style="color:#ffca28;">leftmost-prefix rule</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Avoid the table:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">covering index</strong> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INCLUDE</code> lets the database do an <strong style="color:#ffca28;">index-only scan</strong>: 0 heap fetches instead of 88. A <strong style="color:#ffca28;">partial index</strong> on only the rows I query was 50 times smaller.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Selectivity:</strong> <span style="color:#f0e2c8;">The planner ignores indexes that match a big share of rows, because random page reads cost about four times a sequential read by default. So I index selective columns, and I use expression indexes when the query wraps a column in a function.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Costs:</strong> <span style="color:#f0e2c8;">Every index is updated on every write, so I drop unused and redundant indexes, and prefer one composite index that serves several queries.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Index on (a, b): will WHERE b = 5 use it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with a normal seek, because entries are sorted by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> first. PostgreSQL 18 can use a skip scan when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> has few distinct values; otherwise you need an index that starts with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is my query doing a sequential scan even though there is an index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually low selectivity (too many matching rows), stale statistics, a function or cast on the column, a type mismatch, or a tiny table. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ANALYZE</code> on the table tells you which.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many indexes is too many?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When write latency, WAL volume or memory pressure hurt more than the reads gain. Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">idx_scan</code> per index; one that is never scanned only costs you.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Covering index vs just adding the column to the key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INCLUDE</code> columns are stored only in the leaves and are not part of the sort order, so the upper levels stay small and they do not affect uniqueness. Put a column in the key only if you filter or sort by it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add an index to a huge production table safely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE INDEX CONCURRENTLY</code> in PostgreSQL (or an online DDL tool in MySQL), watch replication lag and I/O while it builds, and verify the plan uses it before removing anything old.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Query plan | The strategy the optimizer chose, shown by \`EXPLAIN\` |
| Heap fetch | Jump from an index entry to the table row |
| Composite index | One index sorted by several columns |
| Leftmost-prefix rule | A composite index seeks only on its leading columns |
| Covering index | Index containing every column a query needs |
| Index-only scan | Query answered from the index without reading the table |
| Skip scan | One seek per distinct leading value when it is not in the query |
| Partial index | Index over only the rows matching a condition |
| Selectivity | Fraction of rows a condition matches |
| Expression index | Index on the result of an expression like \`lower(email)\` |

**Conclusion:** Good indexing is designing for specific queries: equality columns first and the range or sort column last, \`INCLUDE\` payload columns to avoid the table, partial indexes for the small subset you actually query, and expression indexes when the query transforms a column. The run put numbers on it — 88 entries against 17,682 for the same columns in a different order, zero heap fetches with a covering index, a partial index 50 times smaller — and showed why the planner ignores an index on an unselective column. Because every index is paid for on every write, the last strategy is deleting the ones that do not earn their keep.`,
    examples: [
      {
        label: `Index designs compared: composite order, covering, partial, skip scan and selectivity`,
        variants: [
          { tech: "node", code: `// One orders table, several index designs. We count the work each design costs:
// index entries read, and heap fetches (jumps from an index entry to the table row).
let seed = 7;
function rand(n) { seed = (seed * 48271) % 2147483647; return seed % n; }

const rows = [];
for (let id = 0; id < 100000; id++) {
  const r = rand(100);
  const status = r < 2 ? "open" : r < 30 ? "paid" : "shipped";
  rows.push({ id, tenant: 1 + rand(200), day: rand(365), status, amount: 1 + rand(500) });
}

function cmp(a, b) {
  for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; }
  return 0;
}
// An index is a sorted list of [key columns..., row id], built only over rows that pass \`where\`.
function makeIndex(cols, where = () => true) {
  const entries = rows.filter(where).map((r) => [...cols.map((c) => r[c]), r.id]);
  entries.sort(cmp);
  return entries;
}
function lowerBound(idx, prefix) {
  let lo = 0, hi = idx.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cmp(idx[mid].slice(0, prefix.length), prefix) < 0) lo = mid + 1; else hi = mid;
  }
  return lo;
}
// Seek to \`start\`, read entries while \`inRange\` holds, keep those passing \`filter\`.
// heap: "none" (covering), "hits" (fetch matching rows), "all" (filter needs a column the index lacks).
function scan(idx, start, inRange, filter, heap) {
  let read = 0, fetched = 0, hits = 0;
  for (let i = lowerBound(idx, start); i < idx.length && inRange(idx[i]); i++) {
    read++;
    if (heap === "all") fetched++;
    if (filter(idx[i])) { hits++; if (heap === "hits") fetched++; }
  }
  return { read, fetched, hits };
}
const show = (name, r) => console.log(\`  \${name.padEnd(36)} entries=\${String(r.read).padStart(6)} heap_fetches=\${String(r.fetched).padStart(6)} rows=\${r.hits}\`);

console.log("Q1: SELECT day, amount FROM orders WHERE tenant = 42 AND day >= 300 ORDER BY day");
let hits = rows.filter((r) => r.tenant === 42 && r.day >= 300).length;
console.log(\`  \${"no index (full table scan)".padEnd(36)} rows_read=\${rows.length} rows=\${hits}  (then sort)\`);
const byTenant = makeIndex(["tenant"]);
show("INDEX (tenant)", scan(byTenant, [42], (e) => e[0] === 42, (e) => rows[e[1]].day >= 300, "all"));
const tenantDay = makeIndex(["tenant", "day"]);
show("INDEX (tenant, day)", scan(tenantDay, [42, 300], (e) => e[0] === 42, () => true, "hits"));
const dayTenant = makeIndex(["day", "tenant"]);
show("INDEX (day, tenant)  wrong order", scan(dayTenant, [300], () => true, (e) => e[1] === 42, "hits"));
const covering = makeIndex(["tenant", "day", "amount"]);
show("INDEX (tenant, day) INCLUDE (amount)", scan(covering, [42, 300], (e) => e[0] === 42, () => true, "none"));

console.log("\\nQ2: SELECT * FROM orders WHERE day = 100   (leftmost-prefix rule)");
show("INDEX (tenant, day): no seek on day", scan(tenantDay, [], () => true, (e) => e[1] === 100, "hits"));
let skip = { read: 0, fetched: 0, hits: 0 };
for (let t = 1; t <= 200; t++) { // skip scan: one seek per distinct leading value
  const r = scan(tenantDay, [t, 100], (e) => e[0] === t && e[1] === 100, () => true, "hits");
  skip = { read: skip.read + r.read, fetched: skip.fetched + r.fetched, hits: skip.hits + r.hits };
}
show("INDEX (tenant, day) + skip scan", skip);
console.log("  (the skip scan made 200 seeks, one per distinct tenant)");
show("INDEX (day, tenant)", scan(dayTenant, [100], (e) => e[0] === 100, () => true, "hits"));

console.log("\\nQ3: SELECT * FROM orders WHERE status = 'open' ORDER BY day");
const byStatus = makeIndex(["status", "day"]);
const partial = makeIndex(["day"], (r) => r.status === "open");
show("INDEX (status, day)", scan(byStatus, ["open"], (e) => e[0] === "open", () => true, "hits"));
show("INDEX (day) WHERE status = 'open'", scan(partial, [], () => true, () => true, "hits"));
console.log(\`  index sizes: full=\${byStatus.length} entries, partial=\${partial.length} entries\`);

console.log("\\nQ4: is the index worth using? (selectivity decides)");
const PAGES = rows.length / 20; // about 20 rows per 8 kB page
const preds = [
  ["id = 12345", (r) => r.id === 12345],
  ["tenant = 42", (r) => r.tenant === 42],
  ["status = 'open'", (r) => r.status === "open"],
  ["status = 'shipped'", (r) => r.status === "shipped"],
];
for (const [label, pred] of preds) {
  const n = rows.filter(pred).length;
  const seqCost = PAGES * 1.0; // read every page in order: seq_page_cost = 1
  const idxCost = n * 4.0;     // worst case one random page per match: random_page_cost = 4
  const pick = idxCost < seqCost ? "index scan" : "sequential scan";
  console.log(\`  \${label.padEnd(19)} matches=\${String(n).padStart(5)} (\${(100 * n / rows.length).toFixed(2).padStart(5)}%)  seq=\${seqCost}  index=\${String(idxCost).padStart(6)}  -> \${pick}\`);
}

console.log("\\nQ5: cost of one INSERT as indexes pile up (each index is one more B-tree to update)");
const counts = [0, 1, 3, 6];
console.log("  " + counts.map((k) => \`\${k} indexes: \${1 + k} writes\`).join(", "));` },
          { tech: "python", code: `# One orders table, several index designs. We count the work each design costs:
# index entries read, and heap fetches (jumps from an index entry to the table row).
seed = 7


def rand(n):
    global seed
    seed = (seed * 48271) % 2147483647
    return seed % n


rows = []
for i in range(100000):
    r = rand(100)
    status = "open" if r < 2 else "paid" if r < 30 else "shipped"
    rows.append({"id": i, "tenant": 1 + rand(200), "day": rand(365), "status": status, "amount": 1 + rand(500)})


def make_index(cols, where=lambda r: True):
    # An index is a sorted list of (key columns..., row id), built only over rows that pass \`where\`.
    return sorted(tuple(r[c] for c in cols) + (r["id"],) for r in rows if where(r))


def lower_bound(idx, prefix):
    lo, hi, k = 0, len(idx), len(prefix)
    while lo < hi:
        mid = (lo + hi) >> 1
        if idx[mid][:k] < tuple(prefix):
            lo = mid + 1
        else:
            hi = mid
    return lo


def scan(idx, start, in_range, flt, heap):
    # Seek to \`start\`, read entries while \`in_range\` holds, keep those passing \`flt\`.
    # heap: "none" (covering), "hits" (fetch matching rows), "all" (filter needs a column the index lacks).
    read = fetched = hits = 0
    i = lower_bound(idx, start)
    while i < len(idx) and in_range(idx[i]):
        read += 1
        if heap == "all":
            fetched += 1
        if flt(idx[i]):
            hits += 1
            if heap == "hits":
                fetched += 1
        i += 1
    return {"read": read, "fetched": fetched, "hits": hits}


def show(name, r):
    print(f"  {name:<36} entries={r['read']:>6} heap_fetches={r['fetched']:>6} rows={r['hits']}")


print("Q1: SELECT day, amount FROM orders WHERE tenant = 42 AND day >= 300 ORDER BY day")
hits = sum(1 for r in rows if r["tenant"] == 42 and r["day"] >= 300)
print(f"  {'no index (full table scan)':<36} rows_read={len(rows)} rows={hits}  (then sort)")
by_tenant = make_index(["tenant"])
show("INDEX (tenant)", scan(by_tenant, [42], lambda e: e[0] == 42, lambda e: rows[e[1]]["day"] >= 300, "all"))
tenant_day = make_index(["tenant", "day"])
show("INDEX (tenant, day)", scan(tenant_day, [42, 300], lambda e: e[0] == 42, lambda e: True, "hits"))
day_tenant = make_index(["day", "tenant"])
show("INDEX (day, tenant)  wrong order", scan(day_tenant, [300], lambda e: True, lambda e: e[1] == 42, "hits"))
covering = make_index(["tenant", "day", "amount"])
show("INDEX (tenant, day) INCLUDE (amount)", scan(covering, [42, 300], lambda e: e[0] == 42, lambda e: True, "none"))

print("\\nQ2: SELECT * FROM orders WHERE day = 100   (leftmost-prefix rule)")
show("INDEX (tenant, day): no seek on day", scan(tenant_day, [], lambda e: True, lambda e: e[1] == 100, "hits"))
skip = {"read": 0, "fetched": 0, "hits": 0}
for t in range(1, 201):  # skip scan: one seek per distinct leading value
    r = scan(tenant_day, [t, 100], lambda e, t=t: e[0] == t and e[1] == 100, lambda e: True, "hits")
    skip = {k: skip[k] + r[k] for k in skip}
show("INDEX (tenant, day) + skip scan", skip)
print("  (the skip scan made 200 seeks, one per distinct tenant)")
show("INDEX (day, tenant)", scan(day_tenant, [100], lambda e: e[0] == 100, lambda e: True, "hits"))

print("\\nQ3: SELECT * FROM orders WHERE status = 'open' ORDER BY day")
by_status = make_index(["status", "day"])
partial = make_index(["day"], lambda r: r["status"] == "open")
show("INDEX (status, day)", scan(by_status, ["open"], lambda e: e[0] == "open", lambda e: True, "hits"))
show("INDEX (day) WHERE status = 'open'", scan(partial, [], lambda e: True, lambda e: True, "hits"))
print(f"  index sizes: full={len(by_status)} entries, partial={len(partial)} entries")

print("\\nQ4: is the index worth using? (selectivity decides)")
PAGES = len(rows) // 20  # about 20 rows per 8 kB page
preds = [
    ("id = 12345", lambda r: r["id"] == 12345),
    ("tenant = 42", lambda r: r["tenant"] == 42),
    ("status = 'open'", lambda r: r["status"] == "open"),
    ("status = 'shipped'", lambda r: r["status"] == "shipped"),
]
for label, pred in preds:
    n = sum(1 for r in rows if pred(r))
    seq_cost = PAGES * 1  # read every page in order: seq_page_cost = 1
    idx_cost = n * 4      # worst case one random page per match: random_page_cost = 4
    pick = "index scan" if idx_cost < seq_cost else "sequential scan"
    pct = f"{100 * n / len(rows):.2f}"
    print(f"  {label:<19} matches={n:>5} ({pct:>5}%)  seq={seq_cost}  index={idx_cost:>6}  -> {pick}")

print("\\nQ5: cost of one INSERT as indexes pile up (each index is one more B-tree to update)")
print("  " + ", ".join(f"{k} indexes: {1 + k} writes" for k in (0, 1, 3, 6)))` },
        ],
      },
    ],
  },
  {
    title: `What is database connection pooling?`,
    difficulty: "medium",
    seoDescription: `Why opening database connections is expensive, how a pool reuses them, how to size it with Little's Law, and when to put PgBouncer in front.`,
    description: `**Question presented to candidate:**
"Explain database connection pooling. Why is opening a connection per request a problem, how does a pool work, and how would you choose the pool size? What changes when you run fifty instances of the service, or run it on serverless functions?"

**What a strong answer should cover:**
- A connection is expensive to open (TCP handshake, TLS, authentication, and in PostgreSQL a whole new **backend process** per connection) and costs the server memory while it is open
- A **connection pool** keeps a set of open connections; requests **borrow** one, run their queries and **return** it; when all are busy, requests **wait in a queue** with an **acquire timeout**
- **Sizing**: more connections than the database can execute in parallel adds contention, not throughput; use **Little's Law** for the minimum and a small multiple of DB cores (HikariCP: \`cores * 2 + effective spindles\`) as a starting point, then measure
- Fleet math: instances x pool size must stay below the database \`max_connections\` (PostgreSQL default 100); with many instances or serverless, add an external pooler such as **PgBouncer**
- PgBouncer **session vs transaction vs statement** mode, and what transaction mode breaks (session state, \`LISTEN\`, SQL-level \`PREPARE\`)
- Hygiene: return connections promptly (never hold one across a slow HTTP call), max lifetime, idle timeout, leak detection, health checks

**Clarifying questions expected:**
- How many app instances, and how many concurrent requests per instance at peak?
- What database, and how many cores and \`max_connections\` does it have?

**Code / implementation expected:** Optional — a description of the pool and a sizing argument; the example simulates pool sizes on a fake clock.`,
    answer: `**Target Audience:** Backend beginners — you have written code that queries a database; no knowledge of database internals assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Behaviour shown comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A busy restaurant could hire a new waiter for every customer who walks in: interview them, train them, hand over a uniform, and dismiss them when the customer leaves. Each customer waits twenty minutes before ordering, and on a Friday night the kitchen is buried under three hundred waiters shouting orders at eight cooks.

A sane restaurant keeps ten trained waiters. A customer gets whichever waiter is free; if none is, they wait a minute at the door. The cooks see a steady, manageable stream of orders.

The waiters are **database connections**, the cooks are the database **CPU cores**, and the rule "keep a fixed set and share them" is a **connection pool**. The surprising part, which the example measures, is that *more waiters makes Friday night slower*, not faster.

## 2. What a Connection Costs

📌 **Interview term: database connection** — a long-lived network session between a client and the database, with its own authenticated user, transaction state and session settings. Every query runs on some connection.

Opening one involves:

1. A TCP handshake (one network round trip).
2. A TLS handshake if encrypted (one or two more round trips).
3. Authentication (for PostgreSQL SCRAM, several messages back and forth).
4. Server-side setup. PostgreSQL uses a **process per connection**: its supervisor process (postmaster) starts a new backend process for each incoming connection (PostgreSQL docs, "How Connections Are Established"). That process holds memory for as long as the connection is open.

Within one data centre this is typically milliseconds; across regions, tens of milliseconds — often far longer than the query itself. And the server cannot hold unlimited sessions: PostgreSQL \`max_connections\` defaults to 100, and the server sizes shared memory from it (PostgreSQL parameter reference).

## 3. How a Pool Works

📌 **Interview term: connection pool** — a set of already-open connections kept by the application (or a proxy). Code **borrows** (checks out) a connection, runs its queries, and **returns** it; the connection stays open for the next borrower.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 220" role="img" aria-label="Requests wait in a queue, borrow one of four pooled connections, and the pool talks to the database">
  <defs>
    <marker id="sd05q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="106" text-anchor="middle">requests</text>
  <text class="d-sub" x="95" y="126" text-anchor="middle">wait queue</text>
  <rect class="d-box-accent" x="250" y="30" width="250" height="160" rx="12"/>
  <text class="d-text" x="375" y="58" text-anchor="middle">pool, max size 4</text>
  <rect class="d-box" x="275" y="80" width="90" height="40" rx="8"/>
  <text class="d-sub" x="320" y="105" text-anchor="middle">busy</text>
  <rect class="d-box" x="385" y="80" width="90" height="40" rx="8"/>
  <text class="d-sub" x="430" y="105" text-anchor="middle">busy</text>
  <rect class="d-box" x="275" y="135" width="90" height="40" rx="8"/>
  <text class="d-sub" x="320" y="160" text-anchor="middle">idle</text>
  <rect class="d-box" x="385" y="135" width="90" height="40" rx="8"/>
  <text class="d-sub" x="430" y="160" text-anchor="middle">idle</text>
  <rect class="d-box" x="590" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="665" y="106" text-anchor="middle">database</text>
  <text class="d-sub" x="665" y="126" text-anchor="middle">8 cores</text>
  <path class="d-edge" d="M 170 110 L 244 110" marker-end="url(#sd05q4-arrow)"/>
  <path class="d-edge-accent" d="M 500 110 L 584 110" marker-end="url(#sd05q4-arrow)"/>
</svg>

A request takes an idle connection if there is one, otherwise waits in the queue; the database never sees more sessions than the pool size.

The knobs every pool library has (names vary: HikariCP, node-postgres \`Pool\`, SQLAlchemy, Go \`database/sql\`):

| Setting | What it does | Typical concern |
| :--- | :--- | :--- |
| max size | upper bound on open connections | the main sizing decision, below |
| min idle | connections kept open when quiet | avoids a cold start after idle periods |
| acquire (connection) timeout | how long a borrower waits before failing | fail fast instead of piling up threads |
| idle timeout | close connections unused for this long | frees server memory |
| max lifetime | recycle every connection after this age | survives failovers, DNS changes, server-side timeouts |
| validation / keepalive | check a connection still works | network devices silently drop idle TCP sessions |
| leak detection | warn when a connection is held too long | finds code that forgets to return it |

📌 **Interview term: connection leak** — code that borrows a connection and never returns it (an exception path that skips \`release()\`). The pool slowly empties and every request ends up timing out in the queue. Use \`try/finally\` or the library helper that releases automatically.

## 4. Sizing the Pool — Measured

The example runs a database with 8 cores where each query needs 4 ms of CPU, on a 1 ms fake clock. Load: a burst of 400 queries in 100 ms (4,000 per second, twice what 8 cores can do), then 1 per millisecond. When more queries run at once than there are cores, each gets a slice of CPU, and an assumed contention penalty (0.5% efficiency loss per query beyond the core count) stands in for context switches, lock waits and cache misses.

~~~text
Load: 1300 queries; burst of 400 in the first 100 ms, then 1 per ms until t=1000 ms
Database: 8 cores, 4 ms CPU per query; new connection = 20 ms handshake + 1 ms server CPU

pool size        p50 ms  p99 ms  max ms  all done at  peak DB connections
none (connect)     3678    3932    3932      4461 ms       1252
2                   952    1589    1602      2600 ms          2
8                     4     100     104      1003 ms          8
16                   11     128     131      1003 ms         16
64                   56     174     178      1003 ms         64
400                 837    1062    1064      1809 ms        400
~~~

Read it row by row:

- **No pool.** Every query pays a 20 ms connect, and nothing limits concurrency: peak open connections hit 1,252, every one of them fighting for 8 cores, and median latency is 3.7 seconds. A real PostgreSQL would have refused everything beyond \`max_connections\` with an error.
- **Pool of 2: too small.** Two connections can do 2 / 4 ms = 500 queries per second, so the queue grows; the last query finishes at 2,600 ms, which is exactly 1,300 queries x 4 ms / 2 connections.
- **Pool of 8 (= cores): best here.** Median 4 ms (no waiting at all for most queries), and the burst is absorbed by the app-side queue, which costs nothing on the database.
- **Pool of 16, 64, 400: worse and worse.** Admitting more queries at once does not create CPU; it shares the same 8 cores more thinly and adds contention. At 400, the median is 837 ms.

📌 **Interview term: Little's Law** — in a stable system, the average number of things in progress = arrival rate x time each spends inside. For a pool: concurrent connections needed = queries per second x seconds per query. Steady load of 1,000 per second x 0.004 s = **4** connections busy on average; the burst of 4,000 per second x 0.004 s = 16, more than the 8 cores can serve, so the extra must wait somewhere — and waiting in the app queue is cheaper than waiting inside the database.

And at light load, where nothing queues, the connect cost is the whole story:

~~~text
Light load: 100 queries, 1 every 10 ms (no queueing, no contention)
  pool none (connect): p50 25 ms, p99 25 ms
  pool 8: p50 4 ms, p99 4 ms
~~~

25 ms = 20 ms handshake + 1 ms session setup + 4 ms query, versus 4 ms with a warm pooled connection.

### A starting formula

The HikariCP project wiki ("About Pool Sizing") suggests starting near \`connections = (core_count * 2) + effective_spindle_count\`, where core count excludes hyper-threads and effective spindles is 0 when the working set is fully cached. It is explicitly a starting point to test around, and the same page cites an Oracle performance demo where cutting the pool from 2,048 to 96 connections improved results. For 8 cores and cached data that gives 16 — in the simulation 8 was best and 16 close behind, which is exactly why you measure rather than trust the formula. Queries that wait on disk or locks (not CPU) justify a somewhat larger pool.

## 5. Many Instances, Serverless, and External Poolers

A pool lives inside one process. Scale the service out and the pools multiply:

~~~text
Fleet arithmetic: why per-instance pools still overload the database
  40 app instances x pool 10 = 400 connections > max_connections 100
  with a transaction-mode pooler: 400 client connections share 20 server connections
  HikariCP starting point for 8 cores, data cached: 8 * 2 + 0 = 16 connections
~~~

Autoscaling makes it worse (instances x pool size grows with traffic), and serverless functions are the extreme case: each concurrent function instance may open its own connection.

📌 **Interview term: external connection pooler** — a proxy between applications and the database that accepts many client connections and multiplexes them onto a few real server connections. PgBouncer is the classic one for PostgreSQL; cloud equivalents include Amazon RDS Proxy.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 240" role="img" aria-label="Forty app instances with 400 client connections go through PgBouncer, which keeps 20 connections to PostgreSQL">
  <defs>
    <marker id="sd05q4-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="160" height="50" rx="10"/>
  <text class="d-text" x="100" y="50" text-anchor="middle">app 1 to 20</text>
  <rect class="d-box-muted" x="20" y="170" width="160" height="50" rx="10"/>
  <text class="d-text" x="100" y="200" text-anchor="middle">app 21 to 40</text>
  <rect class="d-box-accent" x="300" y="85" width="170" height="70" rx="10"/>
  <text class="d-text" x="385" y="115" text-anchor="middle">PgBouncer</text>
  <text class="d-sub" x="385" y="138" text-anchor="middle">400 clients in</text>
  <rect class="d-box" x="590" y="85" width="150" height="70" rx="10"/>
  <text class="d-text" x="665" y="115" text-anchor="middle">PostgreSQL</text>
  <text class="d-sub" x="665" y="138" text-anchor="middle">20 server conns</text>
  <path class="d-edge" d="M 180 45 L 294 105" marker-end="url(#sd05q4-arrow2)"/>
  <path class="d-edge" d="M 180 195 L 294 135" marker-end="url(#sd05q4-arrow2)"/>
  <path class="d-edge-accent" d="M 470 120 L 584 120" marker-end="url(#sd05q4-arrow2)"/>
</svg>

The applications keep their small local pools; PgBouncer decides how many real database sessions exist.

### Pooling modes

| Mode | A server connection is assigned to a client... | Breaks |
| :--- | :--- | :--- |
| session | for the whole client session | nothing, but saves little when clients stay connected |
| transaction | only for the duration of one transaction | session state: \`SET\` (non-local), session advisory locks, \`LISTEN/NOTIFY\`, temp tables kept across transactions, \`WITH HOLD\` cursors |
| statement | for one statement only | multi-statement transactions |

📌 **Interview term: transaction pooling** — the mode that gives the big win: a server connection returns to the pool at every \`COMMIT\`, so hundreds of mostly idle clients share a few sessions. The classic catch was protocol-level prepared statements, which ORMs use heavily; PgBouncer 1.21 added \`max_prepared_statements\` to track and re-create them on whichever server connection the next transaction lands on, while SQL-level \`PREPARE\` is still not supported in this mode (PgBouncer configuration docs and changelog; check the default for your version, sources disagree).

## 6. Verified: Running the Code

The example **"Connection pool sizing on a fake clock: no pool vs too small vs right-sized vs too big"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Load: 1300 queries; burst of 400 in the first 100 ms, then 1 per ms until t=1000 ms
Database: 8 cores, 4 ms CPU per query; new connection = 20 ms handshake + 1 ms server CPU

pool size        p50 ms  p99 ms  max ms  all done at  peak DB connections
none (connect)     3678    3932    3932      4461 ms       1252
2                   952    1589    1602      2600 ms          2
8                     4     100     104      1003 ms          8
16                   11     128     131      1003 ms         16
64                   56     174     178      1003 ms         64
400                 837    1062    1064      1809 ms        400

Light load: 100 queries, 1 every 10 ms (no queueing, no contention)
  pool none (connect): p50 25 ms, p99 25 ms
  pool 8: p50 4 ms, p99 4 ms

Fleet arithmetic: why per-instance pools still overload the database
  40 app instances x pool 10 = 400 connections > max_connections 100
  with a transaction-mode pooler: 400 client connections share 20 server connections
  HikariCP starting point for 8 cores, data cached: 8 * 2 + 0 = 16 connections
~~~

What the simulation stands for and what it leaves out: the database is 8 CPU-time servers shared equally among running queries, with a made-up contention penalty of 0.5% per query beyond the core count. Connect cost is a fixed 20 ms wait plus 1 ms of server CPU. There is no real network, no locks, no disk and no \`max_connections\` limit. The exact millisecond values depend on these assumptions; the shape — a minimum near the core count, and both too small and too large being worse — is the lesson, and it matches the HikariCP guidance above.

## Edge Cases Worth Knowing

- **Holding a connection during slow non-database work** (calling a payment API inside a transaction) turns a 4 ms borrow into a 2 s borrow; the pool drains under modest load. Do the remote call outside the transaction.
- **Nested borrowing deadlock.** A request that holds one connection and asks the pool for a second can deadlock when all connections are held by requests waiting for a second one. Use one connection per request, or size so this cannot starve.
- **Failover.** After the primary changes, pooled connections still point at the old server; max lifetime, validation and the pool reacting to errors get you onto the new one. See [database replication](/interview-question/what-is-database-replication).
- **Read replicas** get their own pool; route reads and writes to different pools rather than mixing them.

## Common Pitfalls

- **"Bigger pool = more throughput."** The run showed a pool of 400 with a median of 837 ms against 4 ms for a pool of 8 on the same 8-core database.
- **Forgetting fleet math.** 40 instances x 10 = 400 connections against a default \`max_connections\` of 100; autoscaling makes it worse at the worst moment.
- **No acquire timeout**, so requests wait forever in the pool queue instead of failing fast and letting a [circuit breaker](/interview-question/what-is-the-circuit-breaker-pattern) or [backpressure](/interview-question/what-is-backpressure-and-how-do-you-handle-it) kick in.
- **Turning on PgBouncer transaction mode** without checking for session state the app depends on (\`SET search_path\`, advisory locks, \`LISTEN\`).
- **Leaks on error paths** — release in \`finally\`, and enable the leak-detection threshold of the pool library in staging.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">Opening a connection costs network round trips for TCP, TLS and authentication, and in PostgreSQL a whole new <strong style="color:#ffca28;">backend process</strong>. Doing that per request adds latency and lets concurrency grow without limit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The mechanism:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">connection pool</strong> keeps open connections; a request <strong style="color:#ffca28;">borrows</strong> one, runs its queries, and <strong style="color:#ffca28;">returns</strong> it. When all are busy, requests wait in a queue with an <strong style="color:#ffca28;">acquire timeout</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sizing:</strong> <span style="color:#f0e2c8;">The database can only run as many queries in parallel as it has cores and disks, so extra connections add contention, not throughput. <strong style="color:#ffca28;">Little's Law</strong> gives the minimum; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cores * 2</code> is a starting point; then I measure. In my simulation, 8 connections on 8 cores gave a 4 ms median, 400 gave 837 ms.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. At fleet scale:</strong> <span style="color:#f0e2c8;">Instances times pool size must stay under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_connections</code>, which defaults to 100 in PostgreSQL. With many instances or serverless I put <strong style="color:#ffca28;">PgBouncer</strong> or RDS Proxy in front in <strong style="color:#ffca28;">transaction mode</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Hygiene:</strong> <span style="color:#f0e2c8;">Release in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code>, never hold a connection across a slow remote call, set max lifetime and idle timeout, and watch pool wait time as a first-class metric.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just raise max_connections to 5000?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each PostgreSQL connection is a process with its own memory, and thousands of active sessions contend for the same cores and locks. Throughput drops; a pooler that keeps a few dozen server connections busy does better.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What metric tells you the pool is too small?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Time spent waiting to acquire a connection (and the queue length) rising while the database CPU is not saturated. If the database is already saturated, a bigger pool will not help.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks in PgBouncer transaction mode?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Anything that assumes the same server session across transactions: session-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET</code>, session advisory locks, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LISTEN/NOTIFY</code>, temp tables across transactions, and SQL-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PREPARE</code>. Protocol-level prepared statements work from PgBouncer 1.21 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_prepared_statements</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do serverless functions connect to Postgres safely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Through a pooler (PgBouncer, RDS Proxy, or a provider HTTP or pooled endpoint), with one connection per function instance and a small limit on concurrent instances, so a traffic spike cannot open thousands of sessions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does pooling help with a slow query?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Pooling removes connect overhead and caps concurrency; a slow query needs an index or a rewrite. A slow query does hold a connection longer, which is why it can empty the pool for everyone.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Database connection | Authenticated session between a client and the database |
| Connection pool | Reusable set of open connections that requests borrow and return |
| Connection leak | A borrowed connection that is never returned |
| Little's Law | In-progress = arrival rate x time in system |
| External connection pooler | Proxy multiplexing many clients onto few server connections |
| Transaction pooling | Server connection assigned only for one transaction |

**Conclusion:** A connection pool exists because connections are expensive to open and the database can only do so much at once. Reusing a few warm connections removes the handshake (25 ms down to 4 ms at light load in the run), and capping them keeps the database at its efficient concurrency — the simulation was fastest at 8 connections for 8 cores and degraded steadily as the pool grew to 400. Size from Little's Law and the core count, then measure; and when many instances or serverless functions multiply the pools, put PgBouncer or a managed proxy in front so the database still sees a small, steady number of sessions.`,
    examples: [
      {
        label: `Connection pool sizing on a fake clock: no pool vs too small vs right-sized vs too big`,
        variants: [
          { tech: "node", code: `// Discrete simulation with a 1 ms fake clock: an app sends queries to a database
// with 8 CPU cores. Each query needs 4 ms of CPU. Running more queries at once than
// there are cores does not add capacity; it adds contention (context switches, locks).
const CORES = 8, WORK = 4, CONNECT_MS = 20, CONNECT_CPU = 1, CONTENTION = 0.005;

function arrivals(light) {
  const out = [];
  if (light) { for (let t = 0; t < 1000; t += 10) out.push(t); return out; } // 100 req/s
  for (let t = 0; t < 100; t++) for (let k = 0; k < 4; k++) out.push(t); // burst: 4000 req/s for 100 ms
  for (let t = 100; t < 1000; t++) out.push(t);                         // then 1000 req/s
  return out;
}

function simulate(poolSize, light) {          // poolSize 0 means: open a new connection per request
  const reqs = arrivals(light);
  const queue = [], connecting = [], active = [], latencies = [];
  let next = 0, free = poolSize, maxConns = 0, t = 0;
  while (latencies.length < reqs.length) {
    while (next < reqs.length && reqs[next] === t) {
      if (poolSize === 0) connecting.push({ arrived: t, ready: t + CONNECT_MS });
      else queue.push({ arrived: t });
      next++;
    }
    while (connecting.length > 0 && connecting[0].ready === t) {
      const r = connecting.shift();
      active.push({ arrived: r.arrived, work: WORK + CONNECT_CPU }); // the server also pays to set up a session
    }
    while (poolSize > 0 && free > 0 && queue.length > 0) {
      active.push({ arrived: queue.shift().arrived, work: WORK });
      free--;
    }
    maxConns = Math.max(maxConns, poolSize === 0 ? connecting.length + active.length : poolSize - free);
    const k = active.length;
    if (k > 0) {
      const efficiency = 1 / (1 + CONTENTION * Math.max(0, k - CORES));
      const share = Math.min(1, (CORES * efficiency) / k);
      for (const q of active) q.work -= share;
      for (let i = active.length - 1; i >= 0; i--) {
        if (active[i].work <= 1e-9) {
          latencies.push(t + 1 - active[i].arrived);
          active.splice(i, 1);
          if (poolSize > 0) free++;
        }
      }
    }
    t++;
  }
  latencies.sort((a, b) => a - b);
  const pct = (q) => latencies[Math.ceil(q * latencies.length) - 1];
  return { p50: pct(0.5), p99: pct(0.99), max: latencies[latencies.length - 1], done: t, maxConns };
}

console.log(\`Load: \${arrivals().length} queries; burst of 400 in the first 100 ms, then 1 per ms until t=1000 ms\`);
console.log(\`Database: \${CORES} cores, \${WORK} ms CPU per query; new connection = \${CONNECT_MS} ms handshake + \${CONNECT_CPU} ms server CPU\`);
console.log("");
console.log("pool size        p50 ms  p99 ms  max ms  all done at  peak DB connections");
for (const size of [0, 2, 8, 16, 64, 400]) {
  const r = simulate(size, false);
  const name = size === 0 ? "none (connect)" : String(size);
  console.log(\`\${name.padEnd(15)} \${String(r.p50).padStart(7)} \${String(r.p99).padStart(7)} \${String(r.max).padStart(7)} \${String(r.done).padStart(9)} ms \${String(r.maxConns).padStart(10)}\`);
}

console.log("");
console.log(\`Light load: \${arrivals(true).length} queries, 1 every 10 ms (no queueing, no contention)\`);
for (const size of [0, 8]) {
  const r = simulate(size, true);
  console.log(\`  pool \${size === 0 ? "none (connect)" : size}: p50 \${r.p50} ms, p99 \${r.p99} ms\`);
}

console.log("");
console.log("Fleet arithmetic: why per-instance pools still overload the database");
const instances = 40, perInstance = 10, maxConnections = 100;
console.log(\`  \${instances} app instances x pool \${perInstance} = \${instances * perInstance} connections > max_connections \${maxConnections}\`);
const poolerServerSide = 20;
console.log(\`  with a transaction-mode pooler: \${instances * perInstance} client connections share \${poolerServerSide} server connections\`);
console.log(\`  HikariCP starting point for \${CORES} cores, data cached: \${CORES} * 2 + 0 = \${CORES * 2} connections\`);` },
          { tech: "python", code: `# Discrete simulation with a 1 ms fake clock: an app sends queries to a database
# with 8 CPU cores. Each query needs 4 ms of CPU. Running more queries at once than
# there are cores does not add capacity; it adds contention (context switches, locks).
import math

CORES, WORK, CONNECT_MS, CONNECT_CPU, CONTENTION = 8, 4, 20, 1, 0.005


def arrivals(light=False):
    if light:
        return list(range(0, 1000, 10))  # 100 req/s
    out = [t for t in range(100) for _ in range(4)]  # burst: 4000 req/s for 100 ms
    out += list(range(100, 1000))  # then 1000 req/s
    return out


def simulate(pool_size, light):  # pool_size 0 means: open a new connection per request
    reqs = arrivals(light)
    queue, connecting, active, latencies = [], [], [], []
    nxt, free, max_conns, t = 0, pool_size, 0, 0
    while len(latencies) < len(reqs):
        while nxt < len(reqs) and reqs[nxt] == t:
            if pool_size == 0:
                connecting.append({"arrived": t, "ready": t + CONNECT_MS})
            else:
                queue.append({"arrived": t})
            nxt += 1
        while connecting and connecting[0]["ready"] == t:
            r = connecting.pop(0)
            active.append({"arrived": r["arrived"], "work": WORK + CONNECT_CPU})  # the server also pays to set up a session
        while pool_size > 0 and free > 0 and queue:
            active.append({"arrived": queue.pop(0)["arrived"], "work": WORK})
            free -= 1
        max_conns = max(max_conns, len(connecting) + len(active) if pool_size == 0 else pool_size - free)
        k = len(active)
        if k > 0:
            efficiency = 1 / (1 + CONTENTION * max(0, k - CORES))
            share = min(1, (CORES * efficiency) / k)
            for q in active:
                q["work"] -= share
            for i in range(len(active) - 1, -1, -1):
                if active[i]["work"] <= 1e-9:
                    latencies.append(t + 1 - active[i]["arrived"])
                    active.pop(i)
                    if pool_size > 0:
                        free += 1
        t += 1
    latencies.sort()

    def pct(q):
        return latencies[math.ceil(q * len(latencies)) - 1]

    return {"p50": pct(0.5), "p99": pct(0.99), "max": latencies[-1], "done": t, "max_conns": max_conns}


print(f"Load: {len(arrivals())} queries; burst of 400 in the first 100 ms, then 1 per ms until t=1000 ms")
print(f"Database: {CORES} cores, {WORK} ms CPU per query; new connection = {CONNECT_MS} ms handshake + {CONNECT_CPU} ms server CPU")
print("")
print("pool size        p50 ms  p99 ms  max ms  all done at  peak DB connections")
for size in (0, 2, 8, 16, 64, 400):
    r = simulate(size, False)
    name = "none (connect)" if size == 0 else str(size)
    print(f"{name:<15} {r['p50']:>7} {r['p99']:>7} {r['max']:>7} {r['done']:>9} ms {r['max_conns']:>10}")

print("")
print(f"Light load: {len(arrivals(True))} queries, 1 every 10 ms (no queueing, no contention)")
for size in (0, 8):
    r = simulate(size, True)
    print(f"  pool {'none (connect)' if size == 0 else size}: p50 {r['p50']} ms, p99 {r['p99']} ms")

print("")
print("Fleet arithmetic: why per-instance pools still overload the database")
instances, per_instance, max_connections = 40, 10, 100
print(f"  {instances} app instances x pool {per_instance} = {instances * per_instance} connections > max_connections {max_connections}")
pooler_server_side = 20
print(f"  with a transaction-mode pooler: {instances * per_instance} client connections share {pooler_server_side} server connections")
print(f"  HikariCP starting point for {CORES} cores, data cached: {CORES} * 2 + 0 = {CORES * 2} connections")` },
        ],
      },
    ],
  },
  {
    title: `What is database replication?`,
    difficulty: "medium",
    seoDescription: `Database replication explained: leader-follower, sync vs async commit, replication lag, read-your-writes, failover data loss, multi-leader and leaderless.`,
    description: `**Question presented to candidate:**
"What is database replication and why do we use it? Explain how a leader and its followers stay in sync, the difference between synchronous and asynchronous replication, and what can go wrong for users and for your data when replicas lag or the leader dies."

**What a strong answer should cover:**
- Replication keeps copies of the same data on several machines for **high availability**, **read scaling** and **locality** — and is not a backup (it copies mistakes too)
- **Single-leader**: all writes go to the leader, which streams its change log (the **WAL** / binlog) to followers; reads may go to followers
- **Synchronous vs asynchronous** commit: wait for a replica (slower writes, no loss of acknowledged writes if that replica is promoted) vs do not wait (fast, but a failover can lose recent acknowledged writes); quorum and semi-sync in between
- **Replication lag** anomalies and fixes: **read-your-writes** (route to leader or track the write position), **monotonic reads** (stick a user to one replica)
- **Failover**: detect, promote the most up-to-date follower, redirect clients, **fence** the old leader to avoid **split brain**
- **Multi-leader** and **leaderless** (quorum) replication, and why they need conflict resolution

**Clarifying questions expected:**
- Is losing the last second of acknowledged writes acceptable, or must every acknowledged write survive a failover?
- Are users in one region or several, and what read and write volume is expected?

**Code / implementation expected:** Optional — a clear explanation with examples; the example simulates a leader and two followers on a fake clock.`,
    answer: `**Target Audience:** Beginners to distributed data — you know what a database server is; no prior knowledge of replication assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Behaviour shown comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A school keeps its official grade book in the head teacher office. Parents in three towns keep phoning to ask about grades, so the school pins photocopies on noticeboards in each town and a runner updates them every afternoon.

- Parents get answers locally and the head teacher is no longer overwhelmed: **read scaling** and **locality**.
- If the office floods, a noticeboard copy can become the new official book: **availability**.
- But a parent who just heard "your daughter got an A" might walk to the noticeboard and still see the old B: **replication lag**.
- And if the office floods before the runner leaves, today's changes exist nowhere else: **data loss on failover**.

Database replication is that runner, made fast and automatic. The interview is about the last two bullets.

📌 **Interview term: replication** — keeping a copy of the same data on several machines (replicas) and propagating every change to all of them.

📌 **Interview term: replica** — one machine holding a copy. Not a backup: a \`DELETE\` without a \`WHERE\` replicates to every replica within milliseconds. You still need backups and point-in-time recovery.

## 2. Single-Leader Replication: The Default

📌 **Interview term: leader and follower** (also primary/replica, historically master/slave) — one node, the leader, accepts all writes; followers apply the leader stream of changes and serve reads.

The leader already writes every change to its [write-ahead log (WAL)](/interview-question/what-is-a-write-ahead-log-wal) before applying it, for crash safety. Replication reuses that log: followers receive the log records in order and replay them. PostgreSQL streaming replication ships WAL; MySQL ships its binary log (binlog); logical replication ships row changes instead of physical page changes, which allows different versions or a subset of tables.

📌 **Interview term: log sequence number (LSN)** — the position of a record in the log. "Follower f2 has applied up to LSN 1" is how you measure how far behind it is.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Single leader: clients write to the leader, which streams its log to two followers that serve reads">
  <defs>
    <marker id="sd05q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="95" width="130" height="50" rx="10"/>
  <text class="d-text" x="85" y="125" text-anchor="middle">writes</text>
  <rect class="d-box-accent" x="240" y="85" width="160" height="70" rx="10"/>
  <text class="d-text" x="320" y="115" text-anchor="middle">leader</text>
  <text class="d-sub" x="320" y="138" text-anchor="middle">appends to WAL</text>
  <rect class="d-box" x="520" y="20" width="180" height="56" rx="10"/>
  <text class="d-text" x="610" y="45" text-anchor="middle">follower f1</text>
  <text class="d-sub" x="610" y="65" text-anchor="middle">15 ms away, reads</text>
  <rect class="d-box" x="520" y="164" width="180" height="56" rx="10"/>
  <text class="d-text" x="610" y="189" text-anchor="middle">follower f2</text>
  <text class="d-sub" x="610" y="209" text-anchor="middle">60 ms away, reads</text>
  <path class="d-edge" d="M 150 120 L 234 120" marker-end="url(#sd05q5-arrow)"/>
  <path class="d-edge-dashed" d="M 400 105 L 514 50" marker-end="url(#sd05q5-arrow)"/>
  <path class="d-edge-dashed" d="M 400 135 L 514 190" marker-end="url(#sd05q5-arrow)"/>
</svg>

Dashed arrows are the log stream. These are the delays used in the example: f1 in the same region, f2 in another.

## 3. When Does the Client Hear "OK"? Sync vs Async

~~~text
1) Commit latency: when does the client hear OK?
  async (leader fsync only):      1 ms
  sync, wait for f1:              31 ms
  sync, wait for f1 AND f2:       121 ms
  quorum, any 1 of (f1, f2):      31 ms
~~~

📌 **Interview term: asynchronous replication** — the leader commits locally and acknowledges the client at once; followers catch up later. Fastest writes (1 ms here), but a write acknowledged a moment ago may exist only on the leader.

📌 **Interview term: synchronous replication** — the leader waits until a follower confirms it has the record before acknowledging. Costs one round trip to that follower per commit (31 ms for f1, 121 ms if it must wait for the far f2 too), and if that follower is down, writes stall unless the system falls back.

📌 **Interview term: semi-synchronous / quorum commit** — wait for *some* followers, not all: "any 1 of f1, f2" returns as soon as the faster one confirms (31 ms). This is the same idea as a [read/write quorum](/interview-question/what-is-a-read-write-quorum).

PostgreSQL makes this a setting: \`synchronous_standby_names\` lists which standbys count, with \`FIRST n (...)\` for priority order or \`ANY n (...)\` for a quorum, and \`synchronous_commit\` chooses what to wait for — \`remote_write\` (standby received it into OS memory), \`on\` (standby flushed it to disk), \`remote_apply\` (standby applied it, so reads there see it) — or \`local\` to skip waiting (PostgreSQL docs on \`synchronous_commit\`, via EDB and 2ndQuadrant write-ups). It can even be set per transaction, so a payment can wait while a page-view counter does not.

## 4. Replication Lag: What Users See

Ana edits her bio at t=1000 ms and reloads 30 ms later, and the load balancer sends the read to a random replica:

~~~text
2) Replication lag: Ana edits her bio at t=1000, then reloads at t=1030
  read from leader at t=1030: "v2 new job"  (applied lsn 2)
  read from f1     at t=1030: "v2 new job"  (applied lsn 2)
  read from f2     at t=1030: "v1 hello"  (applied lsn 1)
~~~

f2 has not received LSN 2 yet, so Ana sees her old bio and thinks the save failed.

📌 **Interview term: replication lag** — how far a follower is behind the leader, in time or bytes of log. Normally milliseconds; under heavy write load, a long-running query on the replica, or a network problem, it can grow to minutes.

📌 **Interview term: read-your-writes consistency** — a user always sees their own writes. Two common fixes: send that user reads to the leader for a short window after they write, or remember the LSN of their last write (in a cookie or session) and read only from a replica that has applied at least that position:

~~~text
  read-your-writes (token lsn 2) at t=1030: served by f1, "v2 new job"
  read-your-writes (token lsn 2) at t=1070: served by f2, "v2 new job"
~~~

At t=1030 only f1 has LSN 2, so it serves the read; at t=1070 f2 has caught up and can serve it too. Nothing had to go to the leader.

~~~text
3) Monotonic reads: two reloads land on different replicas
  t=1040 via f1: "v2 new job"
  t=1045 via f2: "v1 hello"   <- the page went back in time
~~~

📌 **Interview term: monotonic reads** — a user never sees data go backwards. Here two reloads hit different replicas and the new bio disappears again. Fix: pin each user to one replica (for example by hashing the user id), or apply the same LSN-token rule to every read.

When to send reads to a replica at all versus putting a cache in front is its own question: see [read replica vs cache](/interview-question/when-do-you-use-a-read-replica-vs-a-cache).

## 5. Failover: What Happens to Data When the Leader Dies

Writes arrive every 5 ms; the leader crashes at t=2200 ms; a follower is promoted.

~~~text
4) Failover: writes every 5 ms from t=2000; the leader dies at t=2200
  async      promote f1: 40 writes acknowledged, 2 of them missing on the new leader
  async      promote f2: 40 writes acknowledged, 11 of them missing on the new leader
  sync to f1 promote f1: 34 writes acknowledged, 0 of them missing on the new leader
  sync to f1 promote f2: 34 writes acknowledged, 5 of them missing on the new leader
~~~

- **Async, promote f1:** 40 writes were acknowledged to clients, but f1 had only received up to t=2185, so 2 acknowledged writes vanish. Promote the far f2 and 11 vanish. Always promote the most up-to-date follower.
- **Sync to f1, promote f1:** clients only got OK once f1 had each write, so 0 acknowledged writes are lost. The 6 writes in flight at the crash were never acknowledged; clients see an error or timeout and must retry, which is why writes should be [idempotent](/interview-question/what-is-idempotency-and-why-does-it-matter).
- **Sync to f1, promote f2:** 5 acknowledged writes lost. Synchronous replication protects you only if the failover promotes the replica that was synchronous.

📌 **Interview term: failover** — replacing a failed leader: detect the failure (heartbeats and timeouts, see [failure detection](/interview-question/how-do-distributed-systems-detect-node-failures)), choose and promote a follower, repoint clients and the other followers, and keep the old leader from coming back as a leader.

📌 **Interview term: RPO (recovery point objective)** — how much recent data you may lose in a failure. Async replication gives RPO > 0 (the lag at the moment of failure); sync to the promoted replica gives RPO = 0 for acknowledged writes.

📌 **Interview term: split brain** — two nodes both believe they are leader and both accept writes, so the data diverges. It happens when the old leader was only cut off, not dead. Prevention is **fencing**: the old leader must lose the right to write (a revoked lease, an epoch or term number that storage rejects, or forcibly cutting it off) before the new one takes over. Choosing exactly one leader safely is the subject of [leader election](/interview-question/what-is-leader-election-in-distributed-systems).

A real example: in the GitHub incident of 21 October 2018, a 43-second loss of connectivity let the US East Coast data center accept writes that had not replicated to the US West Coast, while the failover tooling (Orchestrator) redirected all writes to the West Coast. The two sites had diverged, service was degraded for 24 hours and 11 minutes while GitHub restored consistency, and a few seconds of writes needed manual reconciliation (GitHub "October 21 post-incident analysis").

## 6. Other Topologies

**Multi-leader.** Each region has a leader that accepts local writes and replicates to the others asynchronously. Low write latency everywhere and survives a region outage, but two regions can change the same row at the same time, so the system needs **conflict resolution**.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="Multi-leader: two regional leaders each take local writes and replicate to each other in both directions">
  <defs>
    <marker id="sd05q5-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="60" y="50" width="200" height="70" rx="10"/>
  <text class="d-text" x="160" y="80" text-anchor="middle">leader EU</text>
  <text class="d-sub" x="160" y="102" text-anchor="middle">local writes</text>
  <rect class="d-box-accent" x="460" y="50" width="200" height="70" rx="10"/>
  <text class="d-text" x="560" y="80" text-anchor="middle">leader US</text>
  <text class="d-sub" x="560" y="102" text-anchor="middle">local writes</text>
  <path class="d-edge-dashed" d="M 260 72 L 454 72" marker-end="url(#sd05q5-arrow2)"/>
  <path class="d-edge-dashed" d="M 460 100 L 266 100" marker-end="url(#sd05q5-arrow2)"/>
</svg>

Both arrows are asynchronous, so the same row can be changed on both sides before either hears of the other.

📌 **Interview term: conflict resolution** — deciding the outcome when replicas accepted concurrent writes to the same data: **last-writer-wins** by timestamp (simple, silently drops one write), application merge rules, or CRDTs (data types whose concurrent updates always merge).

**Leaderless.** Clients (or a coordinator) send each write to several replicas and read from several, succeeding when enough of them answer — Dynamo-style stores such as Cassandra work this way. With N replicas, W write acks and R read replies, choosing R + W > N makes reads overlap the latest write. Details on the [read/write quorum](/interview-question/what-is-a-read-write-quorum) page.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Leaderless: a client sends a write to three replicas and succeeds once two acknowledge">
  <defs>
    <marker id="sd05q5-arrow3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="85" width="160" height="60" rx="10"/>
  <text class="d-text" x="120" y="112" text-anchor="middle">client</text>
  <text class="d-sub" x="120" y="132" text-anchor="middle">needs W = 2</text>
  <rect class="d-box" x="480" y="10" width="170" height="50" rx="10"/>
  <text class="d-text" x="565" y="40" text-anchor="middle">replica A: ack</text>
  <rect class="d-box" x="480" y="90" width="170" height="50" rx="10"/>
  <text class="d-text" x="565" y="120" text-anchor="middle">replica B: ack</text>
  <rect class="d-box-muted" x="480" y="170" width="170" height="50" rx="10"/>
  <text class="d-text" x="565" y="200" text-anchor="middle">replica C: slow</text>
  <path class="d-edge-accent" d="M 200 105 L 474 35" marker-end="url(#sd05q5-arrow3)"/>
  <path class="d-edge-accent" d="M 200 115 L 474 115" marker-end="url(#sd05q5-arrow3)"/>
  <path class="d-edge-dashed" d="M 200 125 L 474 195" marker-end="url(#sd05q5-arrow3)"/>
</svg>

No failover step at all: a slow or dead replica is simply outvoted, and it is repaired later by read repair or anti-entropy.

| | Single-leader | Multi-leader | Leaderless |
| :--- | :--- | :--- | :--- |
| Writes accepted at | one node | one leader per region | any of several replicas |
| Write conflicts | none (one order of writes) | yes, must be resolved | yes, versioned and resolved |
| Failover | needed, risky | per region | not needed |
| Typical systems | PostgreSQL, MySQL, MongoDB replica sets | multi-region active-active setups, offline-first apps | Cassandra, ScyllaDB, Dynamo-style stores |
| Choose when | the default; strong consistency on the leader | writes must be local in several regions | very high availability, tunable consistency |

Replication copies *all* the data to every replica; to split data across machines because it does not fit or writes exceed one leader, you need [sharding](/interview-question/what-is-database-sharding) — usually combined with replication of each shard. How replication interacts with consistency guarantees during partitions is the [CAP theorem](/interview-question/what-is-the-cap-theorem).

## 7. Verified: Running the Code

The example **"Leader-follower replication: commit latency, stale reads, read-your-writes and failover loss"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
1) Commit latency: when does the client hear OK?
  async (leader fsync only):      1 ms
  sync, wait for f1:              31 ms
  sync, wait for f1 AND f2:       121 ms
  quorum, any 1 of (f1, f2):      31 ms

2) Replication lag: Ana edits her bio at t=1000, then reloads at t=1030
  read from leader at t=1030: "v2 new job"  (applied lsn 2)
  read from f1     at t=1030: "v2 new job"  (applied lsn 2)
  read from f2     at t=1030: "v1 hello"  (applied lsn 1)
  read-your-writes (token lsn 2) at t=1030: served by f1, "v2 new job"
  read-your-writes (token lsn 2) at t=1070: served by f2, "v2 new job"

3) Monotonic reads: two reloads land on different replicas
  t=1040 via f1: "v2 new job"
  t=1045 via f2: "v1 hello"   <- the page went back in time

4) Failover: writes every 5 ms from t=2000; the leader dies at t=2200
  async      promote f1: 40 writes acknowledged, 2 of them missing on the new leader
  async      promote f2: 40 writes acknowledged, 11 of them missing on the new leader
  sync to f1 promote f1: 34 writes acknowledged, 0 of them missing on the new leader
  sync to f1 promote f2: 34 writes acknowledged, 5 of them missing on the new leader
~~~

What the simulation stands for and what it leaves out: the leader log is an array of \`{lsn, t, key, value}\`, and a follower "has" an entry once its fixed one-way delay has passed. Acknowledgement times follow the commit rule (local fsync of 1 ms, plus a round trip when waiting for a follower). There is no real network, no variable lag, no disk, no failure detector and no fencing; the crash is a cut-off time.

## Edge Cases Worth Knowing

- **Long queries on a replica** can conflict with log replay (the leader vacuumed rows the query still needs); PostgreSQL either delays replay (growing lag) or cancels the query, depending on settings such as \`hot_standby_feedback\` and \`max_standby_streaming_delay\`.
- **Replication slots** keep WAL on the leader until a follower consumes it; an abandoned slot can fill the leader disk.
- **Cascading replication** (followers of followers) reduces load on the leader at the cost of more lag at the far end.
- **Clock-based last-writer-wins** across regions loses writes when clocks drift; prefer version vectors or application merges for important data.

## Common Pitfalls

- **Treating replicas as backups.** A bad migration or \`DELETE\` replicates instantly; keep point-in-time recovery.
- **Reading from replicas without a lag strategy** — the run showed Ana seeing her old bio 30 ms after saving, and a page "going back in time" across two replicas.
- **Assuming async replication loses nothing on failover** — 2 acknowledged writes were lost even when promoting the closest follower, 11 when promoting the far one.
- **Turning on synchronous replication to one replica, then failing over to another** — the run lost 5 acknowledged writes that way.
- **Automatic failover without fencing**, which turns a network blip into split brain and days of reconciliation.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What and why:</strong> <span style="color:#f0e2c8;">Replication keeps copies of the data on several machines for <strong style="color:#ffca28;">availability</strong>, <strong style="color:#ffca28;">read scaling</strong> and <strong style="color:#ffca28;">locality</strong>. It is not a backup: mistakes replicate too.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">In <strong style="color:#ffca28;">single-leader</strong> replication all writes go to the leader, which streams its <strong style="color:#ffca28;">WAL</strong> or binlog to followers in order; followers replay it and can serve reads.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sync vs async:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Async</strong> acknowledges after the local commit: fast, but failover can lose recent acknowledged writes. <strong style="color:#ffca28;">Sync</strong> waits for a replica: one round trip slower, no acknowledged-write loss if that replica is promoted. <strong style="color:#ffca28;">Quorum</strong> commit waits for any k of n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Lag:</strong> <span style="color:#f0e2c8;">Followers lag, so users can miss their own writes. I fix it with <strong style="color:#ffca28;">read-your-writes</strong> (route to the leader briefly, or carry the write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LSN</code> and read only from a replica past it) and <strong style="color:#ffca28;">monotonic reads</strong> (pin a user to one replica).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Failover:</strong> <span style="color:#f0e2c8;">Detect the failure, promote the <strong style="color:#ffca28;">most up-to-date</strong> follower, repoint clients, and <strong style="color:#ffca28;">fence</strong> the old leader to prevent <strong style="color:#ffca28;">split brain</strong>. For multi-region writes I would consider multi-leader or leaderless, accepting conflict resolution.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you measure replication lag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare log positions: on PostgreSQL the leader <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_stat_replication</code> view shows each standby sent, flushed and replayed positions, and the replica can report the time of the last replayed transaction. Alert on both bytes and seconds behind.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can synchronous replication still lose data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not acknowledged writes, if you promote the synchronous replica and it truly flushed the record. If failover picks another replica, or the setting only waits for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remote_write</code> to memory and both machines fail together, it can.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not make every replica synchronous?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every commit would wait for the slowest replica (121 ms instead of 31 ms in the example), and any one replica being down would stall all writes. Quorum commit to the nearest k replicas is the usual compromise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does replication differ from sharding?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replication copies the same data to more machines, which scales reads and availability but not write capacity or data size. Sharding splits the data so each machine holds a part; production systems usually replicate each shard.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a user see their own write right after saving if reads go to replicas?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the LSN returned by the write in the session and send the read to a replica whose replayed position is at least that LSN, or to the leader if none is. In the run, the read at t=1030 was served by f1, which had caught up.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Replication | Keeping copies of data on several machines |
| Replica | One machine holding a copy |
| Leader and follower | One node takes writes; others replay its log |
| Log sequence number (LSN) | Position in the change log |
| Asynchronous replication | Acknowledge before followers have the change |
| Synchronous replication | Acknowledge only after a follower confirms |
| Semi-synchronous / quorum commit | Wait for some followers, not all |
| Replication lag | How far a follower is behind |
| Read-your-writes consistency | A user always sees their own writes |
| Monotonic reads | A user never sees data go backwards |
| Failover | Promoting a follower when the leader fails |
| RPO | How much recent data a failure may lose |
| Split brain | Two nodes both acting as leader |
| Conflict resolution | Deciding the result of concurrent writes |

**Conclusion:** Replication copies every change from a leader log to followers so the data survives a machine loss and reads can spread out — and almost every interview follow-up is about the gap between the copies. The run showed the trade-offs in numbers: 1 ms async commits against 31 ms sync ones, a user missing their own edit 30 ms after saving, fixed by carrying the write LSN, and failovers that lost 2, 11 or 0 acknowledged writes depending on the commit mode and on which follower was promoted. Choose the commit mode from how much data you may lose, give readers a lag strategy, and never fail over without fencing.`,
    examples: [
      {
        label: `Leader-follower replication: commit latency, stale reads, read-your-writes and failover loss`,
        variants: [
          { tech: "node", code: `// Single-leader replication on a fake clock (ms). The leader appends every write to its
// log (WAL) and streams it; a follower has applied an entry once \`delay\` ms have passed.
const FSYNC = 1;
const followers = { f1: 15, f2: 60 }; // one-way delay: f1 same region, f2 another region
const log = [];                        // entries: { lsn, t, key, value }

function write(t, key, value) { log.push({ lsn: log.length + 1, t, key, value }); return log.length; }
function appliedLsn(node, now) {
  if (node === "leader") return log.length ? log[log.length - 1].lsn : 0;
  let lsn = 0;
  for (const e of log) if (e.t + followers[node] <= now) lsn = e.lsn;
  return lsn;
}
function read(node, key, now) {
  const upTo = appliedLsn(node, now);
  let value = "(none)";
  for (const e of log) if (e.lsn <= upTo && e.key === key) value = e.value;
  return value;
}

console.log("1) Commit latency: when does the client hear OK?");
const rtt = (f) => 2 * followers[f];
console.log(\`  async (leader fsync only):      \${FSYNC} ms\`);
console.log(\`  sync, wait for f1:              \${FSYNC + rtt("f1")} ms\`);
console.log(\`  sync, wait for f1 AND f2:       \${FSYNC + Math.max(rtt("f1"), rtt("f2"))} ms\`);
console.log(\`  quorum, any 1 of (f1, f2):      \${FSYNC + Math.min(rtt("f1"), rtt("f2"))} ms\`);

console.log("\\n2) Replication lag: Ana edits her bio at t=1000, then reloads at t=1030");
write(0, "bio:ana", "v1 hello");
const myLsn = write(1000, "bio:ana", "v2 new job");
for (const node of ["leader", "f1", "f2"]) {
  console.log(\`  read from \${node.padEnd(6)} at t=1030: "\${read(node, "bio:ana", 1030)}"  (applied lsn \${appliedLsn(node, 1030)})\`);
}
function readYourWrites(key, now, tokenLsn) {
  for (const node of ["f2", "f1"]) if (appliedLsn(node, now) >= tokenLsn) return [node, read(node, key, now)];
  return ["leader", read("leader", key, now)];
}
for (const now of [1030, 1070]) {
  const [node, v] = readYourWrites("bio:ana", now, myLsn);
  console.log(\`  read-your-writes (token lsn \${myLsn}) at t=\${now}: served by \${node}, "\${v}"\`);
}

console.log("\\n3) Monotonic reads: two reloads land on different replicas");
console.log(\`  t=1040 via f1: "\${read("f1", "bio:ana", 1040)}"\`);
console.log(\`  t=1045 via f2: "\${read("f2", "bio:ana", 1045)}"   <- the page went back in time\`);

console.log("\\n4) Failover: writes every 5 ms from t=2000; the leader dies at t=2200");
for (let t = 2000; t < 2200; t += 5) write(t, \`order:\${t}\`, "paid");
const CRASH = 2200;
for (const mode of ["async", "sync to f1"]) {
  // A write is acknowledged once the commit rule above is satisfied before the crash.
  const ackDelay = mode === "async" ? FSYNC : FSYNC + rtt("f1");
  const acked = log.filter((e) => e.t >= 2000 && e.t + ackDelay <= CRASH);
  for (const promoted of ["f1", "f2"]) {
    const has = appliedLsn(promoted, CRASH);
    const lost = acked.filter((e) => e.lsn > has).length;
    console.log(\`  \${mode.padEnd(10)} promote \${promoted}: \${acked.length} writes acknowledged, \${lost} of them missing on the new leader\`);
  }
}` },
          { tech: "python", code: `# Single-leader replication on a fake clock (ms). The leader appends every write to its
# log (WAL) and streams it; a follower has applied an entry once \`delay\` ms have passed.
FSYNC = 1
followers = {"f1": 15, "f2": 60}  # one-way delay: f1 same region, f2 another region
log = []  # entries: {lsn, t, key, value}


def write(t, key, value):
    log.append({"lsn": len(log) + 1, "t": t, "key": key, "value": value})
    return len(log)


def applied_lsn(node, now):
    if node == "leader":
        return log[-1]["lsn"] if log else 0
    lsn = 0
    for e in log:
        if e["t"] + followers[node] <= now:
            lsn = e["lsn"]
    return lsn


def read(node, key, now):
    up_to = applied_lsn(node, now)
    value = "(none)"
    for e in log:
        if e["lsn"] <= up_to and e["key"] == key:
            value = e["value"]
    return value


def rtt(f):
    return 2 * followers[f]


print("1) Commit latency: when does the client hear OK?")
print(f"  async (leader fsync only):      {FSYNC} ms")
print(f"  sync, wait for f1:              {FSYNC + rtt('f1')} ms")
print(f"  sync, wait for f1 AND f2:       {FSYNC + max(rtt('f1'), rtt('f2'))} ms")
print(f"  quorum, any 1 of (f1, f2):      {FSYNC + min(rtt('f1'), rtt('f2'))} ms")

print("\\n2) Replication lag: Ana edits her bio at t=1000, then reloads at t=1030")
write(0, "bio:ana", "v1 hello")
my_lsn = write(1000, "bio:ana", "v2 new job")
for node in ("leader", "f1", "f2"):
    print(f'  read from {node:<6} at t=1030: "{read(node, "bio:ana", 1030)}"  (applied lsn {applied_lsn(node, 1030)})')


def read_your_writes(key, now, token_lsn):
    for node in ("f2", "f1"):
        if applied_lsn(node, now) >= token_lsn:
            return node, read(node, key, now)
    return "leader", read("leader", key, now)


for now in (1030, 1070):
    node, v = read_your_writes("bio:ana", now, my_lsn)
    print(f'  read-your-writes (token lsn {my_lsn}) at t={now}: served by {node}, "{v}"')

print("\\n3) Monotonic reads: two reloads land on different replicas")
print(f'  t=1040 via f1: "{read("f1", "bio:ana", 1040)}"')
print(f'  t=1045 via f2: "{read("f2", "bio:ana", 1045)}"   <- the page went back in time')

print("\\n4) Failover: writes every 5 ms from t=2000; the leader dies at t=2200")
for t in range(2000, 2200, 5):
    write(t, f"order:{t}", "paid")
CRASH = 2200
for mode in ("async", "sync to f1"):
    # A write is acknowledged once the commit rule above is satisfied before the crash.
    ack_delay = FSYNC if mode == "async" else FSYNC + rtt("f1")
    acked = [e for e in log if e["t"] >= 2000 and e["t"] + ack_delay <= CRASH]
    for promoted in ("f1", "f2"):
        has = applied_lsn(promoted, CRASH)
        lost = sum(1 for e in acked if e["lsn"] > has)
        print(f"  {mode:<10} promote {promoted}: {len(acked)} writes acknowledged, {lost} of them missing on the new leader")` },
        ],
      },
    ],
  },
];

export default augments;
