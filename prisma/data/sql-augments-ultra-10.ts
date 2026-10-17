/**
 * SQL ULTRA — batch 10: Top-N, pagination and server-side objects (LATERAL vs
 * window vs correlated subquery, pagination, views and materialized views,
 * stored procedures, triggers). Every example was run by
 * scripts/verify-sql-examples.ts (sql.js 1.10.2 like the page, PostgreSQL 16
 * for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `LATERAL vs Window Function vs Correlated Subquery for top-N per group — which scales when?`,
    difficulty: "hard",
    seoDescription: `Compare window functions, LATERAL joins and correlated subqueries for top-N per group, with PostgreSQL plans and timings showing which scales when.`,
    description: `**Question presented to candidate:**
"You need the 3 most recent orders for every customer. You could write it with ROW_NUMBER() OVER (PARTITION BY ...), with a LATERAL join, or with a correlated subquery. They all return the same rows, so which one would you ship, and how does the answer change when there are 100 customers versus 200,000 customers on the same 1 million orders?"

**What a strong answer should cover:**
- All three return the same rows when they use the same order and tiebreaker; the difference is how much data each one reads
- Window function: reads every row of the table once (sorted, or in index order), cost grows with the total number of rows, not with N; PostgreSQL 15+ adds a Run Condition but still reads all rows
- LATERAL (\`CROSS JOIN LATERAL\` / SQL Server \`CROSS APPLY\`): one index seek plus N rows per group, cost grows with groups x N; needs an index on \`(group_key, sort_key)\` and a cheap list of groups
- Correlated subquery: \`IN (... LIMIT N)\` runs once per outer row (not per group), and the \`COUNT(*)\` form is quadratic inside each group; it is the portable fallback, rarely the fast one
- The decision rule: few groups with many rows each and a matching index means LATERAL; many small groups, no index, or "rank everything anyway" means the window; prove it with \`EXPLAIN ANALYZE\` (loops and rows)

**Clarifying questions expected:**
- How many groups are there, and how many rows per group (the ratio decides it)?
- Is there an index on \`(customer_id, ordered_at DESC)\`, and is there a separate customers table to drive the loop?
- Do ties need to be handled (exactly N rows, or every row tied at the cut)?

**Code / implementation expected:** Yes — the same top-N query written all three ways, plus the plans that explain why one reads 10 rows and another reads 100,000.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  ordered_at  TEXT NOT NULL,
  amount      INTEGER NOT NULL
);
CREATE INDEX orders_customer_recent ON orders (customer_id, ordered_at DESC, id DESC);
INSERT INTO customers (id, name) VALUES
  (1, 'Asha'), (2, 'Ben'), (3, 'Chen'), (4, 'Dara'), (5, 'Eli');
INSERT INTO orders (id, customer_id, ordered_at, amount) VALUES
  (101, 1, '2024-01-05', 40),
  (102, 1, '2024-02-11', 25),
  (103, 1, '2024-03-02', 90),
  (104, 1, '2024-03-20', 15),
  (105, 2, '2024-01-17', 60),
  (106, 2, '2024-02-28', 35),
  (107, 3, '2024-01-09', 70),
  (108, 3, '2024-02-14', 20),
  (109, 3, '2024-02-14', 55),
  (110, 3, '2024-03-30', 10),
  (111, 4, '2024-03-12', 80),
  (112, 1, '2024-04-01', 50),
  (113, 2, '2024-04-03', 45),
  (114, 3, '2024-04-05', 30);
\`\`\``,
    answer: `**Target Audience:** Developers who can already write a top-N-per-group query and now need to choose the version that stays fast at scale; candidates preparing for the "which one would you ship" follow-up.
**Difficulty:** Hard
**Engines:** PostgreSQL 16.15 (plans and timings) and SQLite 3.45.0 through sql.js 1.10.2 (the runnable examples on this page). Notes on MySQL and SQL Server syntax are cited from their documentation.

> **How to read this doc:** Ideas come first in plain language, then a \`📌 Interview term:\` callout gives the exact vocabulary an interviewer expects. Every result, plan and timing below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A librarian is asked: "for each of our 5 branches, which 2 books were returned most recently?" She has one giant returns ledger with 100,000 lines, sorted by branch and then by date, newest first.

**Plan A:** start at line 1 and read the whole ledger, putting a counter next to every line ("1st for this branch, 2nd, 3rd ...") and copying out lines numbered 1 and 2. She reads 100,000 lines to copy 10.

**Plan B:** for each branch, flip straight to where that branch starts (the ledger is sorted, so she can jump), copy the first 2 lines, and move to the next branch. She reads 10 lines.

**Plan C:** for every single line in the ledger, walk over to the branch section and check whether that line is among its first 2. That is 100,000 trips.

Plan A is the window function, Plan B is the LATERAL join, Plan C is the correlated subquery. All three produce the same list. Which one is quickest depends on how many branches there are, how many lines each has, and whether the ledger is sorted (indexed) at all. That is exactly what the interviewer wants you to reason about.

The basic top-N pattern has its own page: [Top-N per group with RANK() OVER (PARTITION BY)](/interview-question/top-n-per-group-with-rank-over-partition-by-how-do-you-get-top-2-per-department-), and the LATERAL syntax is covered in [What is a LATERAL join?](/interview-question/what-is-a-lateral-join) and [LATERAL JOIN — how do you fetch the top 3 orders per customer efficiently?](/interview-question/lateral-join-how-do-you-fetch-the-top-3-orders-per-customer-efficiently). This page is about **cost**.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many groups, and how many rows per group? | The ratio decides it: LATERAL costs groups x N, the window costs total rows. |
| Is there an index on \`(customer_id, ordered_at DESC)\`? | Without it LATERAL does one full scan per group and loses badly. |
| Is there a separate table listing the groups? | LATERAL needs something to loop over; \`SELECT DISTINCT\` from the big table costs a full pass. |
| What happens on ties at the Nth place? | \`LIMIT\` and \`ROW_NUMBER()\` give exactly N; \`RANK()\` keeps all tied rows. |
| Is this a hot API path or a nightly report? | A report that ranks everything anyway is fine with a window. |

## 3. Same Answer Three Ways

All three versions below ask for each customer 2 most recent orders, newest first, with \`id DESC\` as the tiebreaker (Chen has two orders on 2024-02-14, so the tiebreaker matters).

### 3a. The window function

📌 **Interview term: window function** — computes a value for each row from a set of related rows without merging them. Here \`ROW_NUMBER()\` numbers each customer orders 1, 2, 3 ... ([What are window functions?](/interview-question/what-are-window-functions))

~~~sql
WITH ranked AS (
  SELECT o.customer_id, o.id AS order_id, o.ordered_at, o.amount,
         ROW_NUMBER() OVER (PARTITION BY o.customer_id
                            ORDER BY o.ordered_at DESC, o.id DESC) AS rn
  FROM orders o
)
SELECT c.name, r.order_id, r.ordered_at, r.amount, r.rn
FROM customers c
JOIN ranked r ON r.customer_id = c.id
WHERE r.rn <= 2
ORDER BY c.name, r.rn;
~~~

~~~text
name | order_id | ordered_at | amount | rn
Asha | 112 | 2024-04-01 | 50 | 1
Asha | 104 | 2024-03-20 | 15 | 2
Ben | 113 | 2024-04-03 | 45 | 1
Ben | 106 | 2024-02-28 | 35 | 2
Chen | 114 | 2024-04-05 | 30 | 1
Chen | 110 | 2024-03-30 | 10 | 2
Dara | 111 | 2024-03-12 | 80 | 1
~~~

The window has to see **every** order of a customer to number it, so it reads the whole table. Eli has no orders and does not appear, because the join is an inner join.

### 3b. The LATERAL join

📌 **Interview term: LATERAL** — a subquery in \`FROM\` that may refer to columns of tables listed before it, so it runs once per outer row, like a for-each loop. SQL Server spells it \`CROSS APPLY\` / \`OUTER APPLY\` ([Microsoft: FROM clause with APPLY](https://learn.microsoft.com/he-il/sql/t-sql/queries/from-transact-sql?view=aps-pdw-2016)); MySQL supports \`LATERAL\` from 8.0.14 ([MySQL manual: lateral derived tables](https://dev.mysql.com/doc/refman/8.0/en/lateral-derived-tables.html)); SQLite has neither.

~~~sql
SELECT c.name, t.order_id, t.ordered_at, t.amount
FROM customers c
LEFT JOIN LATERAL (
  SELECT o.id AS order_id, o.ordered_at, o.amount
  FROM orders o
  WHERE o.customer_id = c.id
  ORDER BY o.ordered_at DESC, o.id DESC
  LIMIT 2
) t ON true
ORDER BY c.name, t.ordered_at DESC NULLS LAST, t.order_id DESC;
~~~

~~~text
name | order_id | ordered_at | amount
Asha | 112 | 2024-04-01 | 50
Asha | 104 | 2024-03-20 | 15
Ben | 113 | 2024-04-03 | 45
Ben | 106 | 2024-02-28 | 35
Chen | 114 | 2024-04-05 | 30
Chen | 110 | 2024-03-30 | 10
Dara | 111 | 2024-03-12 | 80
Eli | NULL | NULL | NULL
~~~

(PostgreSQL 16.) \`LEFT JOIN LATERAL ... ON true\` keeps Eli with NULLs; \`CROSS JOIN LATERAL\` would drop him, like the inner join in 3a.

### 3c. The correlated subquery

📌 **Interview term: correlated subquery** — a subquery that refers to the current row of the outer query, so it is logically re-evaluated for every outer row. ([What is a subquery and what is a correlated subquery?](/interview-question/what-is-a-subquery-and-what-is-a-correlated-subquery))

The closest thing to LATERAL on SQLite: keep an order when its id is among that customer top 2.

~~~sql
SELECT c.name, o.id AS order_id, o.ordered_at, o.amount
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.id IN (
  SELECT o2.id
  FROM orders o2
  WHERE o2.customer_id = c.id
  ORDER BY o2.ordered_at DESC, o2.id DESC
  LIMIT 2
)
ORDER BY c.name, o.ordered_at DESC, o.id DESC;
~~~

~~~text
name | order_id | ordered_at | amount
Asha | 112 | 2024-04-01 | 50
Asha | 104 | 2024-03-20 | 15
Ben | 113 | 2024-04-03 | 45
Ben | 106 | 2024-02-28 | 35
Chen | 114 | 2024-04-05 | 30
Chen | 110 | 2024-03-30 | 10
Dara | 111 | 2024-03-12 | 80
~~~

The older, fully portable form counts how many orders of the same customer are newer (with the tiebreaker spelled out), and keeps rows with fewer than 2:

~~~sql
SELECT c.name, o.id AS order_id, o.ordered_at, o.amount
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE (
  SELECT COUNT(*)
  FROM orders o2
  WHERE o2.customer_id = o.customer_id
    AND (o2.ordered_at > o.ordered_at
         OR (o2.ordered_at = o.ordered_at AND o2.id > o.id))
) < 2
ORDER BY c.name, o.ordered_at DESC, o.id DESC;
~~~

~~~text
name | order_id | ordered_at | amount
Asha | 112 | 2024-04-01 | 50
Asha | 104 | 2024-03-20 | 15
Ben | 113 | 2024-04-03 | 45
Ben | 106 | 2024-02-28 | 35
Chen | 114 | 2024-04-05 | 30
Chen | 110 | 2024-03-30 | 10
Dara | 111 | 2024-03-12 | 80
~~~

Same rows again (SQLite and PostgreSQL both). Note the portability catch: MySQL rejects \`LIMIT\` inside an \`IN (...)\` subquery with error 1235 ([MySQL manual: subquery errors](https://dev.mysql.com/doc/refman/8.4/en/subquery-errors.html)), so on MySQL the \`IN ... LIMIT\` form needs rewriting.

## 4. Why They Cost Different Amounts: The Plans

Five orders per customer hide every difference, so the two PostgreSQL examples generate 100,000 orders, 20,000 for each of the 5 customers, with the index \`(customer_id, ordered_at DESC, id DESC)\`. Then they ask for the top 2 per customer.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Window function path: read all 100000 index entries in order, number them, keep 10. LATERAL path: for each of 5 customers seek the index and read 2 entries, 10 entries in total">
  <defs>
    <marker id="sql10q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="34">Window function</text>
  <rect class="d-box-muted" x="20" y="54" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="84" text-anchor="middle">read all rows</text>
  <text class="d-sub" x="120" y="106" text-anchor="middle">100000 entries</text>
  <rect class="d-box" x="290" y="54" width="180" height="70" rx="10"/>
  <text class="d-text" x="380" y="84" text-anchor="middle">number them</text>
  <text class="d-sub" x="380" y="106" text-anchor="middle">per customer</text>
  <rect class="d-box-accent" x="540" y="54" width="200" height="70" rx="10"/>
  <text class="d-text" x="640" y="84" text-anchor="middle">keep rn 1 and 2</text>
  <text class="d-sub" x="640" y="106" text-anchor="middle">10 rows out</text>
  <line class="d-edge" x1="224" y1="89" x2="282" y2="89" marker-end="url(#sql10q1-arrow)"/>
  <line class="d-edge" x1="474" y1="89" x2="532" y2="89" marker-end="url(#sql10q1-arrow)"/>
  <text class="d-text" x="20" y="184">LATERAL</text>
  <rect class="d-box-muted" x="20" y="204" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="234" text-anchor="middle">5 customers</text>
  <text class="d-sub" x="120" y="256" text-anchor="middle">outer loop</text>
  <rect class="d-box" x="290" y="204" width="180" height="70" rx="10"/>
  <text class="d-text" x="380" y="234" text-anchor="middle">index seek</text>
  <text class="d-sub" x="380" y="256" text-anchor="middle">read 2, stop</text>
  <rect class="d-box-accent" x="540" y="204" width="200" height="70" rx="10"/>
  <text class="d-text" x="640" y="234" text-anchor="middle">10 entries read</text>
  <text class="d-sub" x="640" y="256" text-anchor="middle">10 rows out</text>
  <line class="d-edge-accent" x1="224" y1="239" x2="282" y2="239" marker-end="url(#sql10q1-arrow)"/>
  <line class="d-edge-accent" x1="474" y1="239" x2="532" y2="239" marker-end="url(#sql10q1-arrow)"/>
</svg>

The two paths return the same 10 rows; the plans below show how many index entries each one touches.

**LATERAL:**

~~~text
QUERY PLAN
Nested Loop (actual rows=10 loops=1)
  ->  Seq Scan on customers c (actual rows=5 loops=1)
  ->  Limit (actual rows=2 loops=5)
        ->  Index Only Scan using big_orders_recent on big_orders o (actual rows=2 loops=5)
              Index Cond: (customer_id = c.id)
              Heap Fetches: 0
~~~

📌 **Interview term: Nested Loop** — a join that runs its inner side once per outer row. \`loops=5\` means the inner \`Limit\` ran once per customer, and \`actual rows=2 loops=5\` means each run read just 2 index entries. Total: 10.

📌 **Interview term: Index Only Scan** — the index alone had every column the subquery needed, so the table itself was not visited (\`Heap Fetches: 0\` after \`VACUUM\`). See [What is a covering index?](/interview-question/what-is-a-covering-index)

**Window function:**

~~~text
QUERY PLAN
Subquery Scan on ranked (actual rows=10 loops=1)
  ->  WindowAgg (actual rows=10 loops=1)
        Run Condition: (row_number() OVER (?) <= 2)
        ->  Index Only Scan using big_orders_recent on big_orders o (actual rows=100000 loops=1)
              Heap Fetches: 0
~~~

📌 **Interview term: Run Condition** — added in PostgreSQL 15: the planner pushes \`rn <= 2\` into the \`WindowAgg\` node so it stops computing numbers once a partition is past the cut ([commit "Teach planner and executor about monotonic window funcs"](https://www.postgresql.org/message-id/E1ncaj6-000nex-Sn@gemulon.postgresql.org); [Percona: window function improvements in PostgreSQL 15](https://www.percona.com/blog/introducing-performance-improvement-of-window-functions-in-postgresql-15/)). It saves work, but the scan below it still returned \`actual rows=100000\`: the window must read every row to find where the next customer starts.

The index helps both: because its order matches \`PARTITION BY customer_id ORDER BY ordered_at DESC, id DESC\`, there is no Sort node in the window plan. Without the index the window plan gains a full sort. (Column order matters for that match: [Why does column order matter in a composite index?](/interview-question/why-does-column-order-matter-in-a-composite-index).) On other data or settings the planner may choose a different plan; always read your own.

## 5. Which Scales When: Measured

I ran each query on PostgreSQL 16 on 1,000,000 generated orders, top 3 per customer, in two shapes, with the index above and \`VACUUM ANALYZE\` done. Times are from psql \`\\timing\`, warm cache, on one machine; treat them as ratios, not as promises.

| Shape | Window \`ROW_NUMBER\` | \`CROSS JOIN LATERAL\` | Correlated \`IN (... LIMIT)\` | Correlated \`COUNT(*)\` |
| :--- | :--- | :--- | :--- | :--- |
| 100 customers x 10,000 orders, indexed | ~140-170 ms | **~1.5-2 ms** | ~5.1 s | cancelled after 60 s |
| 200,000 customers x 5 orders, indexed | **~280-315 ms** | ~295-445 ms | ~1.75 s | ~2.1 s |
| 100 customers x 10,000 orders, **no index** | **~715 ms** | ~4.2 s | not run | not run |

What the numbers say:

- **Few big groups + index:** LATERAL reads 300 index entries, the window reads 1,000,000. Two orders of magnitude.
- **Many tiny groups:** with 5 orders per customer and N = 3, LATERAL does 200,000 index seeks to return 600,000 rows. Each seek costs more than reading the next entry in a scan, so the two end up close; the window is simpler and at least as fast.
- **No index:** each LATERAL iteration is a full scan plus a top-N sort. 100 of them lose to one sort.
- **Correlated subqueries:** the \`IN (... LIMIT)\` form runs its subquery once per **order row** (1,000,000 times), not per customer. The \`COUNT(*)\` form compares each order with every other order of the same customer: roughly 10,000 x 10,000 / 2 comparisons per customer in the first shape, which is why it never finished.
- **No driving table:** replacing \`customers\` with \`(SELECT DISTINCT customer_id FROM orders)\` took the first-shape LATERAL from ~2 ms to ~70 ms in my run, because finding the distinct customers reads the whole index.

📌 **Interview term: driving table** — the outer side of a nested loop, the set of rows the loop iterates over. For LATERAL top-N it should be a small table of groups, not the big table itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Decision guide: many rows per group with an index favours LATERAL, few rows per group or no index favours the window function">
  <defs>
    <marker id="sql10q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="250" y="20" width="260" height="70" rx="10"/>
  <text class="d-text" x="380" y="50" text-anchor="middle">rows per group vs N</text>
  <text class="d-sub" x="380" y="72" text-anchor="middle">and is there an index</text>
  <rect class="d-box-accent" x="20" y="160" width="300" height="70" rx="10"/>
  <text class="d-text" x="170" y="190" text-anchor="middle">LATERAL plus index</text>
  <text class="d-sub" x="170" y="212" text-anchor="middle">many rows per group, small N</text>
  <rect class="d-box-muted" x="440" y="160" width="300" height="70" rx="10"/>
  <text class="d-text" x="590" y="190" text-anchor="middle">window function</text>
  <text class="d-sub" x="590" y="212" text-anchor="middle">few rows per group, no index</text>
  <line class="d-edge-accent" x1="320" y1="94" x2="200" y2="154" marker-end="url(#sql10q1-arrow2)"/>
  <line class="d-edge" x1="440" y1="94" x2="560" y2="154" marker-end="url(#sql10q1-arrow2)"/>
</svg>

The rule of thumb: compare **groups x N** (what LATERAL reads) with **total rows** (what the window reads), then check that an index makes each LATERAL step a seek.

## 6. Verified: Running the Code

The two runnable examples were run on sql.js 1.10.2 (SQLite 3.45.0), the same engine the page uses, after the schema in the question. The two PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database seeded with the same schema. The outputs below are copied from those runs.

Window function (SQLite; PostgreSQL returns the same rows):

~~~text
name | order_id | ordered_at | amount | rn
Asha | 112 | 2024-04-01 | 50 | 1
Asha | 104 | 2024-03-20 | 15 | 2
Ben | 113 | 2024-04-03 | 45 | 1
Ben | 106 | 2024-02-28 | 35 | 2
Chen | 114 | 2024-04-05 | 30 | 1
Chen | 110 | 2024-03-30 | 10 | 2
Dara | 111 | 2024-03-12 | 80 | 1
~~~

Correlated \`IN (... LIMIT 2)\` (SQLite):

~~~text
name | order_id | ordered_at | amount
Asha | 112 | 2024-04-01 | 50
Asha | 104 | 2024-03-20 | 15
Ben | 113 | 2024-04-03 | 45
Ben | 106 | 2024-02-28 | 35
Chen | 114 | 2024-04-05 | 30
Chen | 110 | 2024-03-30 | 10
Dara | 111 | 2024-03-12 | 80
~~~

LATERAL plan on 100,000 orders (PostgreSQL 16):

~~~text
QUERY PLAN
Nested Loop (actual rows=10 loops=1)
  ->  Seq Scan on customers c (actual rows=5 loops=1)
  ->  Limit (actual rows=2 loops=5)
        ->  Index Only Scan using big_orders_recent on big_orders o (actual rows=2 loops=5)
              Index Cond: (customer_id = c.id)
              Heap Fetches: 0
~~~

Window plan on the same data (PostgreSQL 16):

~~~text
QUERY PLAN
Subquery Scan on ranked (actual rows=10 loops=1)
  ->  WindowAgg (actual rows=10 loops=1)
        Run Condition: (row_number() OVER (?) <= 2)
        ->  Index Only Scan using big_orders_recent on big_orders o (actual rows=100000 loops=1)
              Heap Fetches: 0
~~~

The timing table in section 5 comes from separate runs in my own scratch database with \`\\timing on\`, each query run two or three times.

## 7. Edge Cases

- **Ties at the cut.** All three versions above return exactly N rows because they share a unique tiebreaker (\`id\`). Drop the tiebreaker and \`LIMIT\`/\`ROW_NUMBER()\` may pick different tied rows from run to run. To keep every tied row, use \`RANK()\` in the window or \`FETCH FIRST 2 ROWS WITH TIES\` in the LATERAL subquery (added in PostgreSQL 13, [release announcement](https://www.postgresql.org/about/news/2077/)). Ordered by date only (oldest first), Chen's second place is a tie between orders 108 and 109, both on 2024-02-14, so asking for the first 2 returns 3 rows:

~~~sql
SELECT c.name, t.id
FROM customers c
CROSS JOIN LATERAL (
  SELECT o.id FROM orders o
  WHERE o.customer_id = c.id
  ORDER BY o.ordered_at
  FETCH FIRST 2 ROWS WITH TIES
) t
WHERE c.id = 3
ORDER BY t.id;
~~~

~~~text
name | id
Chen | 107
Chen | 108
Chen | 109
~~~

- **Groups with no rows.** \`CROSS JOIN LATERAL\` and inner joins drop them; \`LEFT JOIN LATERAL ... ON true\` keeps them with NULLs.
- **Large N.** As N approaches the group size, LATERAL reads almost every row anyway, and its per-group overhead makes the window the better choice.
- **Only one group.** Then it is just \`ORDER BY ... LIMIT N\`; no window, no LATERAL.
- **Filtering the groups.** "Top 3 orders for customers in Germany" helps LATERAL a lot (fewer loops), while the window still has to rank every order unless the filter is pushed below it.

## Common Pitfalls

- **Claiming one method is always fastest.** The honest answer is "it depends on groups x N versus total rows, and on the index" — and then showing the plan.
- **Writing LATERAL without the composite index.** Without \`(customer_id, ordered_at DESC)\`, every loop is a full scan and the query is many times slower than the window.
- **Driving LATERAL from \`SELECT DISTINCT\` on the big table** and assuming it is still cheap; that DISTINCT reads every row.
- **Assuming PostgreSQL 15 Run Condition makes the window free.** It stops computing, not reading: \`actual rows=100000\` under the \`WindowAgg\` tells the truth.
- **Leaving out a unique tiebreaker**, so the three versions return different rows on ties and the "same answer" comparison is not even valid.
- **Using \`IN (... LIMIT)\` on MySQL**, which rejects it with error 1235.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Same rows, different work:</strong> <span style="color:#f0e2c8;">All three return identical rows if they share the order and a unique tiebreaker such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code>. The question is how many rows each one <strong style="color:#ffca28;">reads</strong> to produce them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Window function:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY ordered_at DESC, id DESC)</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE rn &lt;= 3</code>. One pass over the whole table: cost tracks total rows. PostgreSQL 15+ adds a Run Condition, but it still reads every row.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. LATERAL:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FROM customers c CROSS JOIN LATERAL (... WHERE o.customer_id = c.id ORDER BY ... LIMIT 3)</code>. With an index on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(customer_id, ordered_at DESC, id DESC)</code> it is one seek plus 3 entries per customer: cost tracks groups times N.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Correlated subquery:</strong> <span style="color:#f0e2c8;">The portable fallback. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN (SELECT ... LIMIT 3)</code> re-runs per <strong style="color:#ffca28;">order row</strong>, not per customer, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> form compares every pair inside a group. On my 1M-row test it was the slowest in both shapes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The rule:</strong> <span style="color:#f0e2c8;">Few groups with many rows each plus the index: LATERAL (2 ms vs 140 ms in my test). Many tiny groups or no index: the window wins or ties. I confirm with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code>, looking at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loops</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">actual rows</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if there is no customers table, only orders?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then LATERAL needs a list of groups first, usually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT DISTINCT customer_id FROM orders</code>, and that itself reads the whole index. In my test that took the LATERAL query from about 2 ms to about 70 ms: still faster than the window here, but the gap shrinks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does LATERAL lose when there is no index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each of the outer rows runs its own scan plus top-N sort of the orders table. With 100 customers and 1M orders that was 100 full scans: about 4.2 s, against 0.7 s for the window, which sorts once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does PostgreSQL stop the window early?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since PostgreSQL 15 the plan shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Run Condition: (row_number() OVER (?) &lt;= 2)</code>, so it stops computing numbers past the cut in each partition. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PARTITION BY</code> it still has to read every row to find the next partition, as the plan with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">actual rows=100000</code> shows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you write LATERAL in MySQL or SQL Server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">MySQL 8.0.14+ supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LATERAL</code> derived tables. SQL Server uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS APPLY</code> (and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OUTER APPLY</code> for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN LATERAL ... ON true</code> form that keeps customers with no orders). SQLite has neither, so there the correlated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN (... LIMIT)</code> form plays that role.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about ties at the Nth place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">LATERAL with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER()</code> both return exactly N, so give them the same unique tiebreaker. If ties must all be kept, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK()</code> in the window, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FETCH FIRST 3 ROWS WITH TIES</code> inside the LATERAL subquery on PostgreSQL 13+.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Window function | Computes a per-row value over related rows without merging them. |
| LATERAL | A \`FROM\` subquery that can reference earlier tables; runs once per outer row. SQL Server: \`CROSS APPLY\`. |
| Correlated subquery | A subquery that uses the current outer row, so it is re-evaluated per outer row. |
| Nested Loop | Join that runs its inner side once per outer row; \`loops=\` in the plan counts the runs. |
| Index Only Scan | Answers from the index alone, without visiting the table. |
| Run Condition | PostgreSQL 15+ optimisation that stops a window function early once its filter can no longer match. |
| Driving table | The outer, iterated side of a nested loop. |

**Conclusion:** The window function, LATERAL and the correlated subquery are three spellings of the same top-N-per-group result, but they read very different amounts of data. The window reads every row once, so its cost follows the table size; LATERAL seeks into an index once per group and reads N entries, so its cost follows groups x N and collapses without the right composite index; correlated subqueries are the portable fallback and were the slowest in every shape measured here. Pick by comparing groups x N with total rows, then prove it with \`EXPLAIN ANALYZE\` — the \`loops\` and \`actual rows\` columns make the argument for you ([How do you read EXPLAIN ANALYZE?](/interview-question/how-do-you-read-explain-analyze-cost-actual-time-rows-and-buffers)).`,
    examples: [
      {
        label: `Window function: ROW_NUMBER() per customer, keep rn <= 2`,
        code: `WITH ranked AS (
  SELECT o.customer_id, o.id AS order_id, o.ordered_at, o.amount,
         ROW_NUMBER() OVER (PARTITION BY o.customer_id
                            ORDER BY o.ordered_at DESC, o.id DESC) AS rn
  FROM orders o
)
SELECT c.name, r.order_id, r.ordered_at, r.amount, r.rn
FROM customers c
JOIN ranked r ON r.customer_id = c.id
WHERE r.rn <= 2
ORDER BY c.name, r.rn;`,
      },
      {
        label: `Correlated subquery: keep an order if it is in that customer top 2 (IN ... LIMIT)`,
        code: `SELECT c.name, o.id AS order_id, o.ordered_at, o.amount
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.id IN (
  SELECT o2.id
  FROM orders o2
  WHERE o2.customer_id = c.id
  ORDER BY o2.ordered_at DESC, o2.id DESC
  LIMIT 2
)
ORDER BY c.name, o.ordered_at DESC, o.id DESC;`,
      },
      {
        label: `PostgreSQL: LATERAL on 100,000 orders reads 2 index entries per customer`,
        code: `-- 100,000 generated orders: 20,000 for each of the 5 customers
CREATE TABLE big_orders AS
SELECT g AS id, (g % 5) + 1 AS customer_id,
       DATE '2024-01-01' + (g % 365) AS ordered_at
FROM generate_series(1, 100000) AS g;
CREATE INDEX big_orders_recent ON big_orders (customer_id, ordered_at DESC, id DESC);
VACUUM ANALYZE big_orders;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT c.name, t.id, t.ordered_at
FROM customers c
CROSS JOIN LATERAL (
  SELECT o.id, o.ordered_at
  FROM big_orders o
  WHERE o.customer_id = c.id
  ORDER BY o.ordered_at DESC, o.id DESC
  LIMIT 2
) t;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: the window version of the same query reads all 100,000 entries`,
        code: `-- the same 100,000 generated orders
CREATE TABLE big_orders AS
SELECT g AS id, (g % 5) + 1 AS customer_id,
       DATE '2024-01-01' + (g % 365) AS ordered_at
FROM generate_series(1, 100000) AS g;
CREATE INDEX big_orders_recent ON big_orders (customer_id, ordered_at DESC, id DESC);
VACUUM ANALYZE big_orders;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT customer_id, id, ordered_at
FROM (
  SELECT o.customer_id, o.id, o.ordered_at,
         ROW_NUMBER() OVER (PARTITION BY o.customer_id
                            ORDER BY o.ordered_at DESC, o.id DESC) AS rn
  FROM big_orders o
) ranked
WHERE rn <= 2;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `How do you paginate efficiently in SQL?`,
    difficulty: "medium",
    seoDescription: `Why LIMIT/OFFSET pagination gets slow and repeats rows, and how keyset (seek) pagination with a tiebreaker and matching index fixes both.`,
    description: `**Question presented to candidate:**
"Our article feed uses LIMIT 20 OFFSET n and the deep pages are getting slow; users also report seeing the same article twice when they click next. What is going on, and how would you paginate this efficiently?"

**What a strong answer should cover:**
- Why \`OFFSET n\` is slow on deep pages: the database still produces and throws away the first n rows, so page cost grows with page depth even with an index
- Why \`OFFSET\` pages drift: rows inserted or deleted between requests shift every later page, so rows repeat or are skipped
- Keyset (seek) pagination: remember the sort key of the last row seen and ask for rows after it, \`WHERE (published_at, id) < (:last_date, :last_id) ORDER BY published_at DESC, id DESC LIMIT 20\`
- A unique tiebreaker in both the \`ORDER BY\` and the cursor, and a composite index in exactly that order, so the next page is one index seek
- Trade-offs: keyset cannot jump to page 517 and needs an opaque cursor in the API; total counts (\`COUNT(*)\`) are a separate, full-cost query; row-value syntax differs by engine

**Clarifying questions expected:**
- Do users need to jump to an arbitrary page number, or only next / previous (infinite scroll)?
- What is the sort order, and is it unique? If not, what is the tiebreaker?
- Do we need an exact total count, or is "more results" enough?

**Code / implementation expected:** Yes — the OFFSET query, the keyset query with a tiebreaker, the index that supports it, and ideally a plan showing the difference.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE articles (
  id           INTEGER PRIMARY KEY,
  title        TEXT NOT NULL,
  published_at TEXT NOT NULL
);
CREATE INDEX articles_feed ON articles (published_at DESC, id DESC);
INSERT INTO articles (id, title, published_at) VALUES
  (1,  'Intro to SQL',        '2024-05-01'),
  (2,  'Joins explained',     '2024-05-02'),
  (3,  'GROUP BY basics',     '2024-05-03'),
  (4,  'NULL traps',          '2024-05-03'),
  (5,  'Window functions',    '2024-05-04'),
  (6,  'CTEs',                '2024-05-05'),
  (7,  'Indexes 101',         '2024-05-05'),
  (8,  'EXPLAIN plans',       '2024-05-05'),
  (9,  'Transactions',        '2024-05-06'),
  (10, 'Isolation levels',    '2024-05-07'),
  (11, 'Deadlocks',           '2024-05-08'),
  (12, 'Partitioning',        '2024-05-09');
\`\`\``,
    answer: `**Target Audience:** Developers building list screens, feeds and APIs who have used \`LIMIT\`/\`OFFSET\` and want to know why deep pages get slow and rows repeat; candidates preparing for a pagination design question.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the runnable examples) and PostgreSQL 16.15 (plans and timings), both run for this page. \`LIMIT\`/\`OFFSET\` works on both; SQL Server uses \`OFFSET ... FETCH NEXT ...\`.

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the vocabulary an interviewer expects. All outputs and timings were produced by actually running the queries; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

You are reading a very long book and stop for the night. There are two ways to find your place the next day.

**The page-count way:** "I was on page 412." Tomorrow you open the book at the start and count 412 pages forward. That is fine for page 3 and miserable for page 412. Worse, if someone glued a new chapter into the front of the book overnight, page 412 is now a different page and you re-read something.

**The bookmark way:** you leave a bookmark at the last sentence you read. Tomorrow you open straight at the bookmark. It does not matter how deep in the book you are, and new pages glued into the front do not move your bookmark.

\`OFFSET\` is the page-count way. **Keyset pagination** is the bookmark.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do users jump to page N, or only next/previous? | Keyset cannot jump to an arbitrary page; infinite scroll is its natural fit. |
| What is the sort order, and is it unique? | Keyset needs a unique order; add \`id\` as a tiebreaker if not. |
| How deep do people go, and how big is the table? | For 3 pages of a 500-row table OFFSET is fine. |
| Do we need an exact total? | \`COUNT(*)\` is a separate query that reads every matching row. |
| Can rows be inserted or deleted while someone pages? | That is what makes OFFSET pages repeat or skip rows. |

## 3. OFFSET Pagination

📌 **Interview term: LIMIT / OFFSET** — \`LIMIT k\` returns at most k rows; \`OFFSET n\` first skips n rows of the sorted result. Page p of size k is \`LIMIT k OFFSET (p - 1) * k\`. Standard SQL spells it \`OFFSET n ROWS FETCH NEXT k ROWS ONLY\`, which PostgreSQL accepts (checked) and SQL Server uses; SQLite rejects it with \`near "OFFSET": syntax error\` (checked), so on SQLite use \`LIMIT ... OFFSET\`.

~~~sql
-- Page 2 of the feed, 4 articles per page: skip 4, take 4
SELECT id, title, published_at
FROM articles
ORDER BY published_at DESC, id DESC
LIMIT 4 OFFSET 4;
~~~

~~~text
id | title | published_at
8 | EXPLAIN plans | 2024-05-05
7 | Indexes 101 | 2024-05-05
6 | CTEs | 2024-05-05
5 | Window functions | 2024-05-04
~~~

It is simple and it supports "go to page 7". It has two problems: cost and drift.

### Problem 1: deep pages read everything before them

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="OFFSET reads the skipped rows and discards them before returning the page. Keyset seeks straight to the last seen key and reads only the page">
  <defs>
    <marker id="sql10q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="34">LIMIT 20 OFFSET 99980</text>
  <rect class="d-box-muted" x="20" y="54" width="520" height="60" rx="8"/>
  <text class="d-text" x="280" y="81" text-anchor="middle">99980 rows read, then discarded</text>
  <text class="d-sub" x="280" y="101" text-anchor="middle">work grows with page depth</text>
  <rect class="d-box-accent" x="600" y="54" width="140" height="60" rx="8"/>
  <text class="d-text" x="670" y="90" text-anchor="middle">20 returned</text>
  <line class="d-edge" x1="544" y1="84" x2="592" y2="84" marker-end="url(#sql10q2-arrow)"/>
  <text class="d-text" x="20" y="184">WHERE key less than last key</text>
  <rect class="d-box" x="20" y="204" width="260" height="60" rx="8"/>
  <text class="d-text" x="150" y="231" text-anchor="middle">index seek</text>
  <text class="d-sub" x="150" y="251" text-anchor="middle">jump to last seen key</text>
  <rect class="d-box-accent" x="600" y="204" width="140" height="60" rx="8"/>
  <text class="d-text" x="670" y="240" text-anchor="middle">20 returned</text>
  <line class="d-edge-accent" x1="284" y1="234" x2="592" y2="234" marker-end="url(#sql10q2-arrow)"/>
</svg>

The database cannot know which row is the 99,981st without producing the first 99,980 in order; \`OFFSET\` only discards rows *after* they are produced. The PostgreSQL example generates 100,000 posts with an index on \`(created_at DESC, id DESC)\` and asks for the last page:

~~~text
QUERY PLAN
Limit (actual rows=20 loops=1)
  ->  Index Scan using posts_feed on posts (actual rows=100000 loops=1)
~~~

📌 **Interview term: actual rows** — in \`EXPLAIN ANALYZE\`, how many rows a plan node really produced. The \`Index Scan\` produced 100,000 rows so that \`Limit\` could return 20. The index removes the sort, not the walk.

Timings on 1,000,000 rows (PostgreSQL 16, same index, warm cache, \`\\timing\` in psql, two runs each):

| Query | Time |
| :--- | :--- |
| \`LIMIT 20 OFFSET 0\` | ~0.25-0.7 ms |
| \`LIMIT 20 OFFSET 10000\` | ~1.1-1.3 ms |
| \`LIMIT 20 OFFSET 100000\` | ~7.5-9.4 ms |
| \`LIMIT 20 OFFSET 900000\` | ~70-110 ms |
| Keyset, same depth as \`OFFSET 900000\` | **~0.5-0.6 ms** |

The cost grows roughly linearly with the offset. On a table without a usable index each page is a full sort of the matching rows, which is far worse.

### Problem 2: pages drift when data changes

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="A new row at the top pushes every row down one place, so OFFSET 4 now starts at the row that ended page 1">
  <defs>
    <marker id="sql10q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="30">Before the insert</text>
  <rect class="d-box-accent" x="20" y="48" width="330" height="50" rx="8"/>
  <text class="d-text" x="185" y="79" text-anchor="middle">page 1: ids 12, 11, 10, 9</text>
  <rect class="d-box" x="410" y="48" width="330" height="50" rx="8"/>
  <text class="d-text" x="575" y="79" text-anchor="middle">rows 5 to 8: ids 8, 7, 6, 5</text>
  <text class="d-text" x="20" y="150">After id 13 is inserted</text>
  <rect class="d-box-muted" x="20" y="168" width="330" height="50" rx="8"/>
  <text class="d-text" x="185" y="199" text-anchor="middle">rows 1 to 4: ids 13, 12, 11, 10</text>
  <rect class="d-box" x="410" y="168" width="330" height="50" rx="8"/>
  <text class="d-text" x="575" y="199" text-anchor="middle">OFFSET 4: ids 9, 8, 7, 6</text>
  <line class="d-edge-dashed" x1="575" y1="102" x2="575" y2="160" marker-end="url(#sql10q2-arrow2)"/>
</svg>

A new article arriving at the top pushes every row down one position, so \`OFFSET 4\` now begins with the article that ended page 1. The runnable example plays that out: load page 1, insert id 13, load page 2 both ways.

~~~sql
-- The reader loads page 1 ...
SELECT 'page 1' AS step, id, title FROM (
  SELECT id, title FROM articles
  ORDER BY published_at DESC, id DESC LIMIT 4 OFFSET 0
) AS p;
-- ... a new article is published before they click "next" ...
INSERT INTO articles (id, title, published_at) VALUES (13, 'Breaking news', '2024-05-10');
-- ... and page 2 with OFFSET repeats the last row of page 1
SELECT 'page 2 (OFFSET)' AS step, id, title FROM (
  SELECT id, title FROM articles
  ORDER BY published_at DESC, id DESC LIMIT 4 OFFSET 4
) AS p;
-- while page 2 with a keyset continues exactly after id 9
SELECT 'page 2 (keyset)' AS step, id, title FROM (
  SELECT id, title FROM articles
  WHERE (published_at, id) < ('2024-05-06', 9)
  ORDER BY published_at DESC, id DESC LIMIT 4
) AS p;
~~~

~~~text
step | id | title
page 1 | 12 | Partitioning
page 1 | 11 | Deadlocks
page 1 | 10 | Isolation levels
page 1 | 9 | Transactions

step | id | title
page 2 (OFFSET) | 9 | Transactions
page 2 (OFFSET) | 8 | EXPLAIN plans
page 2 (OFFSET) | 7 | Indexes 101
page 2 (OFFSET) | 6 | CTEs

step | id | title
page 2 (keyset) | 8 | EXPLAIN plans
page 2 (keyset) | 7 | Indexes 101
page 2 (keyset) | 6 | CTEs
page 2 (keyset) | 5 | Window functions
~~~

📌 **Interview term: page drift** — rows repeating or going missing between pages because \`OFFSET\` addresses positions, and positions move when rows are inserted or deleted. Insert above the reader: a repeat (Transactions appears twice above). Delete above the reader: a skipped row.

## 4. Keyset (Seek) Pagination

📌 **Interview term: keyset pagination** (also *seek method* or *cursor pagination*) — instead of "skip n rows", ask for "rows that come after the last row I showed", using that row sort key as a bookmark.

Page 1 ended at \`(published_at, id) = ('2024-05-06', 9)\`. Page 2:

~~~sql
SELECT id, title, published_at
FROM articles
WHERE (published_at, id) < ('2024-05-06', 9)
ORDER BY published_at DESC, id DESC
LIMIT 4;
~~~

~~~text
id | title | published_at
8 | EXPLAIN plans | 2024-05-05
7 | Indexes 101 | 2024-05-05
6 | CTEs | 2024-05-05
5 | Window functions | 2024-05-04
~~~

Same rows as \`OFFSET 4\` on unchanged data, and the drift example above shows it stays correct when rows are added.

📌 **Interview term: row-value comparison** — \`(a, b) < (x, y)\` compares tuples left to right: true when \`a < x\`, or \`a = x AND b < y\`. PostgreSQL supports it, and SQLite has since 3.15.0 ([SQLite 3.15.0 release log](https://sqlite.org/releaselog/3_15_0.html)). SQL Server does not support row constructors in comparisons ([Itzik Ben-Gan on row value constructors](https://itprotoday.com/sql-server/row-value-constructor)), so there you write the expanded form:

~~~sql
SELECT id, title, published_at
FROM articles
WHERE published_at < '2024-05-06'
   OR (published_at = '2024-05-06' AND id < 9)
ORDER BY published_at DESC, id DESC
LIMIT 4;
~~~

~~~text
id | title | published_at
8 | EXPLAIN plans | 2024-05-05
7 | Indexes 101 | 2024-05-05
6 | CTEs | 2024-05-05
5 | Window functions | 2024-05-04
~~~

Same four rows (SQLite and PostgreSQL both).

### The cost: one seek, whatever the depth

The PostgreSQL example asks for the same last page with a keyset:

~~~text
QUERY PLAN
Limit (actual rows=20 loops=1)
  ->  Index Scan using posts_feed on posts (actual rows=20 loops=1)
        Index Cond: (ROW(created_at, id) < ROW('2024-01-01 00:21:00'::timestamp without time zone, 21))
~~~

📌 **Interview term: Index Cond** — the part of the \`WHERE\` clause the index uses to *start* the scan at the right place, rather than filtering rows after reading them. Here the whole row comparison became the index condition, so the scan read 20 entries instead of 100,000. The planner may pick other plans on other data; check yours with [EXPLAIN ANALYZE](/interview-question/how-do-you-read-explain-analyze-cost-actual-time-rows-and-buffers).

### The index has to match the sort

The keyset query is only fast if an index is ordered exactly like the \`ORDER BY\`: \`(published_at DESC, id DESC)\` here (an index on \`(published_at, id)\` also works, scanned backwards). A different column order, or an index on \`published_at\` alone, cannot serve the tiebreaker. More on that: [Why does column order matter in a composite index?](/interview-question/why-does-column-order-matter-in-a-composite-index). If the index also holds every selected column, the page is served from the index alone: [What is a covering index?](/interview-question/what-is-a-covering-index)

## 5. The Tiebreaker Is Not Optional

Three articles share the date 2024-05-05. Suppose page 1 was 6 rows long:

~~~text
id | title
12 | Partitioning
11 | Deadlocks
10 | Isolation levels
9 | Transactions
8 | EXPLAIN plans
7 | Indexes 101
~~~

It ended at id 7, dated 2024-05-05. A cursor built from the date alone asks for \`published_at < '2024-05-05'\`:

~~~sql
SELECT id, title, published_at
FROM articles
WHERE published_at < '2024-05-05'
ORDER BY published_at DESC, id DESC
LIMIT 4;
~~~

~~~text
id | title | published_at
5 | Window functions | 2024-05-04
4 | NULL traps | 2024-05-03
3 | GROUP BY basics | 2024-05-03
2 | Joins explained | 2024-05-02
~~~

Article 6 ("CTEs"), also dated 2024-05-05, never appears on any page. With \`(published_at, id) < ('2024-05-05', 7)\` it would be the first row of page 2.

📌 **Interview term: tiebreaker** — an extra, unique column (usually the primary key) appended to the sort so that every row has exactly one position. Without it, both OFFSET and keyset pages are not deterministic on ties.

## 6. OFFSET vs Keyset

| | \`LIMIT/OFFSET\` | Keyset |
| :--- | :--- | :--- |
| Cost of page p | Grows with p (reads all earlier rows) | Constant: one index seek + page size |
| Jump to page 517 | Yes | No (next / previous only) |
| Inserts and deletes between requests | Rows repeat or are skipped | Stable |
| Needs a unique sort + matching index | Helps | Required |
| API shape | \`?page=7\` | \`?after=<opaque cursor>\` |
| Good for | Small tables, admin screens, shallow pages | Feeds, infinite scroll, APIs, exports |

A hybrid is common: keyset for the main navigation and a capped OFFSET (for example, at most 50 pages) when users really need page numbers.

## 7. Verified: Running the Code

The two runnable examples ran on sql.js 1.10.2 (SQLite 3.45.0), the engine the page uses, after the schema in the question. The two PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database with the same schema. Outputs copied from those runs:

OFFSET page 2 (SQLite; PostgreSQL returns the same rows):

~~~text
id | title | published_at
8 | EXPLAIN plans | 2024-05-05
7 | Indexes 101 | 2024-05-05
6 | CTEs | 2024-05-05
5 | Window functions | 2024-05-04
~~~

Drift: page 1, then a new row, then page 2 with OFFSET and with keyset (SQLite):

~~~text
step | id | title
page 1 | 12 | Partitioning
page 1 | 11 | Deadlocks
page 1 | 10 | Isolation levels
page 1 | 9 | Transactions

step | id | title
page 2 (OFFSET) | 9 | Transactions
page 2 (OFFSET) | 8 | EXPLAIN plans
page 2 (OFFSET) | 7 | Indexes 101
page 2 (OFFSET) | 6 | CTEs

step | id | title
page 2 (keyset) | 8 | EXPLAIN plans
page 2 (keyset) | 7 | Indexes 101
page 2 (keyset) | 6 | CTEs
page 2 (keyset) | 5 | Window functions
~~~

PostgreSQL, OFFSET to the last of 100,000 rows:

~~~text
QUERY PLAN
Limit (actual rows=20 loops=1)
  ->  Index Scan using posts_feed on posts (actual rows=100000 loops=1)
~~~

PostgreSQL, keyset to the same page:

~~~text
QUERY PLAN
Limit (actual rows=20 loops=1)
  ->  Index Scan using posts_feed on posts (actual rows=20 loops=1)
        Index Cond: (ROW(created_at, id) < ROW('2024-01-01 00:21:00'::timestamp without time zone, 21))
~~~

The timing table in section 3 came from separate runs on 1,000,000 generated rows in my own scratch database.

## 8. Edge Cases

- **Previous page.** Flip the operator and the sort (\`> ... ORDER BY published_at ASC, id ASC LIMIT k\`) and reverse the rows afterwards.
- **Sort on a nullable column.** \`NULL\` breaks \`<\` comparisons (the result is unknown, so the row is filtered out). Use \`COALESCE\` with a sentinel in both the index expression and the query, or keep the sort column \`NOT NULL\`. SQLite and PostgreSQL also disagree on where NULLs sort by default ([How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)).
- **Mixed directions** such as \`ORDER BY score DESC, id ASC\` cannot use a single row comparison; expand the condition by hand and build a matching index \`(score DESC, id ASC)\`.
- **Filters.** \`WHERE author_id = 42\` plus keyset needs the index \`(author_id, published_at DESC, id DESC)\`: equality columns first.
- **Rows that change their sort key** while someone pages (a post bumped to the top) can still appear twice or never; keyset only guarantees stability for rows whose keys do not move.

## Common Pitfalls

- **Keyset on a non-unique column**, which silently skips rows that tie with the last one (Article 6 above).
- **No index matching the \`ORDER BY\`**, so the keyset query still sorts the whole table every page.
- **Running \`COUNT(*)\` on every page request** to show "page 3 of 5,000"; it costs as much as reading every matching row each time.
- **Building the cursor by string concatenation** into SQL; it is user input and must be bound as parameters ([What is SQL injection?](/interview-question/what-is-sql-injection-and-how-do-parameterized-queries-prevent-it)).
- **Assuming the index makes OFFSET cheap.** It removes the sort, but the \`Index Scan\` still reads every skipped row (\`actual rows=100000\` above).
- **OFFSET without a deterministic \`ORDER BY\`**, which is allowed to return rows in a different order on every call.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem with OFFSET:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT 20 OFFSET 100000</code> still produces the first 100,020 rows in order and throws 100,000 away. With an index that is a long index walk; without one it is a full sort. Cost grows with how deep the page is.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The drift problem:</strong> <span style="color:#f0e2c8;">OFFSET counts positions, not rows. If a row is inserted above the reader between two requests, everything shifts down and the next page <strong style="color:#ffca28;">repeats</strong> a row; a delete makes it <strong style="color:#ffca28;">skip</strong> one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keyset pagination:</strong> <span style="color:#f0e2c8;">Remember the sort key of the last row and continue after it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE (published_at, id) &lt; (:last_date, :last_id) ORDER BY published_at DESC, id DESC LIMIT 20</code>. It is one index seek however deep you are.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Make it correct:</strong> <span style="color:#f0e2c8;">The sort must be unique, so I add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code> as a tiebreaker to both the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> and the cursor, and build the index in exactly that order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(published_at DESC, id DESC)</code>. A cursor on the date alone silently skips rows that share a date.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-offs:</strong> <span style="color:#f0e2c8;">Keyset gives next/previous, not "jump to page 517", and the API returns an opaque cursor instead of a page number. Totals are a separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> that reads every matching row, so I avoid or cache it. Small admin tables can keep OFFSET.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you build the Previous button?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Flip the comparison and the sort: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE (published_at, id) &gt; (:first_date, :first_id) ORDER BY published_at ASC, id ASC LIMIT 20</code>, then reverse the 20 rows in the application (or wrap it in an outer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY ... DESC</code>).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the engine has no row-value comparison?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Expand it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">published_at &lt; :d OR (published_at = :d AND id &lt; :id)</code>. It returns the same rows (checked on SQLite and PostgreSQL here). PostgreSQL turns the row form into one index condition, which is why I prefer it where supported.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes in the cursor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The last row sort values, usually base64-encoded JSON such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{published_at, id}</code>, so clients treat it as opaque and you can change the sort later. Never trust it blindly: it is user input, so bind it as parameters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is OFFSET ever fine?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, for small or bounded result sets, back-office tables, or when users really need page numbers and rarely go deep. Many products cap the page depth for exactly this reason.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show a total count cheaply?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exact <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> reads every matching row (about 25-30 ms per million rows in my PostgreSQL test, every request). Options: show "more results" only, fetch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT 21</code> to know whether a next page exists, cache the count, or use the planner estimate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_class.reltuples</code> for an approximate total.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| LIMIT / OFFSET | Return k rows after skipping n rows of the sorted result. |
| actual rows | Rows a plan node really produced in \`EXPLAIN ANALYZE\`. |
| Page drift | Rows repeating or disappearing between OFFSET pages when data changes. |
| Keyset pagination | Continue after the last row sort key instead of skipping rows; also seek or cursor pagination. |
| Row-value comparison | \`(a, b) < (x, y)\`, compared left to right. |
| Index Cond | The condition an index uses to start the scan at the right place. |
| Tiebreaker | A unique column appended to the sort so every row has one position. |

**Conclusion:** \`OFFSET\` pagination is easy and supports page numbers, but it makes the database produce and discard every row before the page, so deep pages get slower in proportion to their depth, and it addresses positions, so pages repeat or skip rows when data changes. Keyset pagination remembers the last row sort key, adds a unique tiebreaker, and lets a matching composite index seek straight to the next page: in the runs above, 20 rows read instead of 100,000 and about half a millisecond instead of 70-110 ms at depth. Use keyset for feeds and APIs, keep OFFSET for small or shallow lists, and treat the total count as a separate cost.`,
    examples: [
      {
        label: `OFFSET pagination: page 2 of the feed, 4 per page`,
        code: `-- Page 2 of the feed, 4 articles per page: skip 4, take 4
SELECT id, title, published_at
FROM articles
ORDER BY published_at DESC, id DESC
LIMIT 4 OFFSET 4;`,
      },
      {
        label: `A row inserted between requests: OFFSET repeats a row, keyset does not`,
        code: `-- The reader loads page 1 ...
SELECT 'page 1' AS step, id, title FROM (
  SELECT id, title FROM articles
  ORDER BY published_at DESC, id DESC LIMIT 4 OFFSET 0
) AS p;
-- ... a new article is published before they click "next" ...
INSERT INTO articles (id, title, published_at) VALUES (13, 'Breaking news', '2024-05-10');
-- ... and page 2 with OFFSET repeats the last row of page 1
SELECT 'page 2 (OFFSET)' AS step, id, title FROM (
  SELECT id, title FROM articles
  ORDER BY published_at DESC, id DESC LIMIT 4 OFFSET 4
) AS p;
-- while page 2 with a keyset continues exactly after id 9
SELECT 'page 2 (keyset)' AS step, id, title FROM (
  SELECT id, title FROM articles
  WHERE (published_at, id) < ('2024-05-06', 9)
  ORDER BY published_at DESC, id DESC LIMIT 4
) AS p;`,
      },
      {
        label: `PostgreSQL: OFFSET on the last page reads all 100,000 index entries`,
        code: `-- 100,000 generated posts, then ask for "page 5,001" (20 per page)
CREATE TABLE posts AS
SELECT g AS id, 'post ' || g AS title,
       TIMESTAMP '2024-01-01' + g * INTERVAL '1 minute' AS created_at
FROM generate_series(1, 100000) AS g;
CREATE INDEX posts_feed ON posts (created_at DESC, id DESC);
VACUUM ANALYZE posts;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, title, created_at
FROM posts
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 100000 - 20;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: keyset on the same page reads 20`,
        code: `-- The same 100,000 posts; the client sends the last key it saw
CREATE TABLE posts AS
SELECT g AS id, 'post ' || g AS title,
       TIMESTAMP '2024-01-01' + g * INTERVAL '1 minute' AS created_at
FROM generate_series(1, 100000) AS g;
CREATE INDEX posts_feed ON posts (created_at DESC, id DESC);
VACUUM ANALYZE posts;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, title, created_at
FROM posts
WHERE (created_at, id) < (TIMESTAMP '2024-01-01' + 21 * INTERVAL '1 minute', 21)
ORDER BY created_at DESC, id DESC
LIMIT 20;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is a view and a materialized view?`,
    difficulty: "medium",
    seoDescription: `What views and materialized views are, how each behaves when data changes, how REFRESH and CONCURRENTLY work, and which engines support them.`,
    description: `**Question presented to candidate:**
"What is a view, what is a materialized view, and how do you decide which one to use? What happens to each when the underlying table changes?"

**What a strong answer should cover:**
- A view is a saved, named query: it stores no rows, and every query against it runs the definition again, so it is always current; the planner inlines it into the outer query
- A materialized view stores the result rows on disk like a table: reads are as fast as reading a small table, but the data is a snapshot that is stale until \`REFRESH MATERIALIZED VIEW\`
- Uses: views for reuse, simpler queries, a stable interface and column-level security; materialized views for expensive aggregates read far more often than the data changes (dashboards, reports)
- Refresh behaviour in PostgreSQL: a plain refresh blocks readers; \`CONCURRENTLY\` (9.4+) lets reads continue but needs a unique index; there is no built-in automatic or incremental refresh
- Engine differences: SQLite and MySQL have views but no materialized views; SQL Server has indexed views; simple views can be updatable, aggregate views are not

**Code / implementation expected:** Optional — \`CREATE VIEW\`, \`CREATE MATERIALIZED VIEW\`, \`REFRESH\`, and a demonstration that one is live and the other is a snapshot.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE orders (
  id       INTEGER PRIMARY KEY,
  customer TEXT NOT NULL,
  region   TEXT NOT NULL,
  status   TEXT NOT NULL,
  amount   INTEGER NOT NULL
);
INSERT INTO orders (id, customer, region, status, amount) VALUES
  (1,  'Asha', 'EU', 'paid',     120),
  (2,  'Ben',  'EU', 'paid',      80),
  (3,  'Chen', 'US', 'paid',     200),
  (4,  'Dara', 'US', 'refunded',  50),
  (5,  'Eli',  'US', 'paid',      70),
  (6,  'Fay',  'APAC', 'paid',    90),
  (7,  'Gus',  'APAC', 'pending', 40),
  (8,  'Hana', 'EU', 'paid',      30),
  (9,  'Ivan', 'APAC', 'paid',    60),
  (10, 'Jo',   'US', 'pending',  110);
\`\`\``,
    answer: `**Target Audience:** Beginners who have written \`SELECT\` queries and keep seeing \`CREATE VIEW\` in schemas; candidates who need to explain freshness, refresh and engine differences.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the runnable examples) and PostgreSQL 16.15 (materialized views, plans, locking test), both run for this page. MySQL and SQL Server notes are cited.

> **How to read this doc:** Each idea is in plain words first, then tagged \`📌 Interview term:\` with the precise vocabulary. Every result and error message below came from an actual run; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A café owner wants to know "revenue per region" several times a day.

She could pin a **recipe card** on the wall: "add up all paid receipts, grouped by region". Anyone who wants the number follows the recipe, right now, using today's receipts. The answer is always current, but someone has to do the adding every time. That card is a **view**.

Or every evening she could do the sum once and write the totals on a **whiteboard**. Reading the whiteboard is instant. But a big order that arrives at 10am is not on the whiteboard until she redoes the sums. That whiteboard is a **materialized view**, and "redoing the sums" is a **refresh**.

Neither is better. The recipe is always right but costs work each time; the whiteboard is fast but can be out of date.

## 2. The View: A Saved Query

📌 **Interview term: view** — a named query stored in the database catalog. It holds no rows. Querying it is the same as querying its definition: the database substitutes the definition into your statement.

~~~sql
CREATE VIEW paid_revenue AS
SELECT region, COUNT(*) AS paid_orders, SUM(amount) AS revenue
FROM orders
WHERE status = 'paid'
GROUP BY region;

SELECT 'before' AS step, region, paid_orders, revenue
FROM paid_revenue ORDER BY region;

-- a new paid order arrives
INSERT INTO orders (id, customer, region, status, amount)
VALUES (11, 'Kai', 'EU', 'paid', 500);

-- the view runs its query again: EU already includes Kai
SELECT 'after' AS step, region, paid_orders, revenue
FROM paid_revenue ORDER BY region;
~~~

~~~text
step | region | paid_orders | revenue
before | APAC | 2 | 150
before | EU | 3 | 230
before | US | 2 | 270

step | region | paid_orders | revenue
after | APAC | 2 | 150
after | EU | 4 | 730
after | US | 2 | 270
~~~

EU went from 3 orders / 230 to 4 orders / 730 the moment Kai's order was inserted. Nothing had to be refreshed, because there is nothing stored to refresh.

📌 **Interview term: view inlining** (also *view expansion*) — the planner replaces the view name with its definition and optimises the combined query as one. The PostgreSQL example queries a view of paid orders with an extra filter:

~~~text
QUERY PLAN
Seq Scan on orders
  Filter: ((status = 'paid'::text) AND (region = 'EU'::text))
~~~

One scan of \`orders\`, with the view filter (\`status = 'paid'\`) and the outer filter (\`region = 'EU'\`) merged into one \`Filter\`. The view did not add a step, and it did not save one either: **a plain view is not a performance feature**. It is the same as a CTE you can reuse across queries ([What is a CTE?](/interview-question/what-is-a-cte-common-table-expression)).

What views are for:

- **Reuse and readability:** a five-table join gets a name, and every report uses the same definition.
- **A stable interface:** the application reads \`customer_summary\`; you can reorganise the tables underneath and keep the view shape.
- **Security:** grant a role \`SELECT\` on a view that leaves out salary or email columns, and no access to the base table.

## 3. The Materialized View: A Stored Result

📌 **Interview term: materialized view** — a query whose result rows are computed once and stored on disk like a table. Reads return the stored rows; the base tables are only read again when the view is refreshed. PostgreSQL added them in 9.3 ([Michael Paquier on 9.3 / 9.4 materialized views](https://paquier.xyz/postgresql-2/postgres-9-4-feature-highlight-refresh-concurrently-a-materialized-view/)).

📌 **Interview term: REFRESH MATERIALIZED VIEW** — re-runs the stored query and replaces the stored rows.

~~~sql
CREATE MATERIALIZED VIEW paid_revenue_mv AS
SELECT region, COUNT(*) AS paid_orders, SUM(amount) AS revenue
FROM orders WHERE status = 'paid' GROUP BY region;

INSERT INTO orders (id, customer, region, status, amount)
VALUES (11, 'Kai', 'EU', 'paid', 500);

-- keep what the materialized view says now, before refreshing it
CREATE TEMP TABLE before_refresh AS SELECT * FROM paid_revenue_mv;

REFRESH MATERIALIZED VIEW paid_revenue_mv;

SELECT 'before refresh' AS step, region, paid_orders, revenue FROM before_refresh
UNION ALL
SELECT 'after refresh', region, paid_orders, revenue FROM paid_revenue_mv
ORDER BY step DESC, region;
~~~

~~~text
step | region | paid_orders | revenue
before refresh | APAC | 2 | 150
before refresh | EU | 3 | 230
before refresh | US | 2 | 270
after refresh | APAC | 2 | 150
after refresh | EU | 4 | 730
after refresh | US | 2 | 270
~~~

Before the refresh the materialized view still said EU = 230 even though Kai's 500 order was already committed. After \`REFRESH\` it says 730.

📌 **Interview term: staleness** — how far the stored result lags behind the real data. With a materialized view, staleness is the time since the last refresh, and choosing an acceptable staleness is a business decision.

On 2,000,000 generated orders in my PostgreSQL test, the aggregate through a plain view took ~117-131 ms per query, reading the materialized view took ~0.2-0.5 ms, and each refresh took ~130-160 ms. That is the trade: pay the full query cost once per refresh instead of once per read.

### SQLite and MySQL: build it yourself

SQLite has views but no materialized views, and neither does MySQL ([Wikipedia: materialized view, DBMS support](https://en.wikipedia.org/wiki/Materialized_view)). The manual equivalent is a summary table that you rebuild on a schedule (or maintain with triggers):

~~~sql
-- SQLite has no materialized views: a summary table is the manual version
CREATE TABLE paid_revenue_snapshot AS
SELECT region, COUNT(*) AS paid_orders, SUM(amount) AS revenue
FROM orders WHERE status = 'paid' GROUP BY region;

INSERT INTO orders (id, customer, region, status, amount)
VALUES (11, 'Kai', 'EU', 'paid', 500);

-- the stored copy is stale until someone rebuilds it
SELECT 'snapshot' AS source, region, paid_orders, revenue
FROM paid_revenue_snapshot WHERE region = 'EU'
UNION ALL
SELECT 'live query', region, COUNT(*), SUM(amount)
FROM orders WHERE status = 'paid' AND region = 'EU' GROUP BY region
ORDER BY source DESC;
~~~

~~~text
source | region | paid_orders | revenue
snapshot | EU | 3 | 230
live query | EU | 4 | 730
~~~

Exactly the same staleness as the PostgreSQL materialized view, without the convenient \`REFRESH\` command. Keeping it current row by row is the job of triggers: [What is a database trigger?](/interview-question/what-is-a-database-trigger)

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="A query on a view is rewritten into a query on the base table and runs every time. A query on a materialized view reads stored rows that a refresh rebuilt from the base table">
  <defs>
    <marker id="sql10q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="34">View</text>
  <rect class="d-box" x="20" y="54" width="180" height="70" rx="10"/>
  <text class="d-text" x="110" y="84" text-anchor="middle">your query</text>
  <text class="d-sub" x="110" y="106" text-anchor="middle">FROM paid_revenue</text>
  <rect class="d-box-muted" x="280" y="54" width="200" height="70" rx="10"/>
  <text class="d-text" x="380" y="84" text-anchor="middle">view definition</text>
  <text class="d-sub" x="380" y="106" text-anchor="middle">inlined, no rows stored</text>
  <rect class="d-box-accent" x="560" y="54" width="180" height="70" rx="10"/>
  <text class="d-text" x="650" y="84" text-anchor="middle">orders</text>
  <text class="d-sub" x="650" y="106" text-anchor="middle">read every time</text>
  <line class="d-edge" x1="204" y1="89" x2="272" y2="89" marker-end="url(#sql10q3-arrow)"/>
  <line class="d-edge" x1="484" y1="89" x2="552" y2="89" marker-end="url(#sql10q3-arrow)"/>
  <text class="d-text" x="20" y="184">Materialized view</text>
  <rect class="d-box" x="20" y="204" width="180" height="70" rx="10"/>
  <text class="d-text" x="110" y="234" text-anchor="middle">your query</text>
  <text class="d-sub" x="110" y="256" text-anchor="middle">FROM paid_revenue_mv</text>
  <rect class="d-box-accent" x="280" y="204" width="200" height="70" rx="10"/>
  <text class="d-text" x="380" y="234" text-anchor="middle">stored rows</text>
  <text class="d-sub" x="380" y="256" text-anchor="middle">snapshot on disk</text>
  <rect class="d-box-muted" x="560" y="204" width="180" height="70" rx="10"/>
  <text class="d-text" x="650" y="234" text-anchor="middle">orders</text>
  <text class="d-sub" x="650" y="256" text-anchor="middle">read only on REFRESH</text>
  <line class="d-edge-accent" x1="204" y1="239" x2="272" y2="239" marker-end="url(#sql10q3-arrow)"/>
  <line class="d-edge-dashed" x1="556" y1="239" x2="488" y2="239" marker-end="url(#sql10q3-arrow)"/>
</svg>

The solid arrows run on every read; the dashed arrow runs only on refresh.

## 4. Refreshing Without Blocking Readers

A plain \`REFRESH MATERIALIZED VIEW\` takes a lock that blocks reads of the view while it runs. I checked with two psql sessions on PostgreSQL 16:

| Time | Session A | Session B |
| :--- | :--- | :--- |
| t1 | \`BEGIN; REFRESH MATERIALIZED VIEW mv;\` (transaction kept open) | |
| t2 | | \`SET lock_timeout = '1s'; SELECT ... FROM mv;\` |
| t3 | | \`ERROR:  canceling statement due to lock timeout\` |
| t4 | \`COMMIT;\` | |

Repeating it with \`REFRESH MATERIALIZED VIEW CONCURRENTLY mv\` (and a unique index on \`mv\`), session B returned the rows immediately.

📌 **Interview term: REFRESH ... CONCURRENTLY** — PostgreSQL 9.4+ ([REFRESH MATERIALIZED VIEW docs](https://www.postgresql.org/docs/9.4/sql-refreshmaterializedview.html)): builds the new result separately and applies only the differences, so readers keep seeing the old rows meanwhile. It needs a unique index; without one, PostgreSQL 16 said:

~~~text
ERROR:  cannot refresh materialized view "public.mv" concurrently
HINT:  Create a unique index with no WHERE clause on one or more columns of the materialized view.
~~~

It still re-runs the entire query (it is not incremental), and it is usually slower than a plain refresh (~158 ms vs ~129 ms in my test above). Only one refresh of a given view can run at a time.

Other things I saw on PostgreSQL 16:

- Writing to a materialized view directly fails: \`ERROR:  cannot change materialized view "mv"\`.
- \`CREATE MATERIALIZED VIEW ... WITH NO DATA\` creates it empty, and reading it before the first refresh fails with \`ERROR:  materialized view "mv2" has not been populated\`.
- In the catalog a view is \`relkind = 'v'\` and a materialized view \`relkind = 'm'\`: one is just a stored query, the other has storage.

## 5. Writing Through a View

📌 **Interview term: updatable view** — a view you can \`INSERT\`, \`UPDATE\` or \`DELETE\` through, with the change applied to the base table. PostgreSQL makes simple views automatically updatable since 9.3 ([PostgreSQL 9.3 beta announcement](https://www.postgresql.org/about/news/postgresql-93-beta-1-released-1463/)). Results from my runs:

- \`UPDATE eu_orders SET amount = amount + 1 WHERE id = 1\` through a single-table view **worked** on PostgreSQL 16 (Asha's order went from 120 to 121).
- \`INSERT\` into the \`GROUP BY\` view failed: \`ERROR:  cannot insert into view "paid_revenue"\` / \`DETAIL:  Views containing GROUP BY are not automatically updatable.\`
- On SQLite every view is read-only: \`cannot modify eu_orders because it is a view\`. An \`INSTEAD OF\` trigger can make it writable.

📌 **Interview term: WITH CHECK OPTION** — rejects writes through a view that would create rows the view cannot see. Through a plain \`WHERE region = 'EU'\` view, inserting a US order succeeded and the row silently was not visible in the view. With \`WITH CHECK OPTION\`: \`ERROR:  new row violates check option for view "eu_orders_checked"\`.

## 6. View vs Materialized View

| | View | Materialized view |
| :--- | :--- | :--- |
| Stores rows | No (only the query) | Yes, on disk |
| Freshness | Always current | Stale until refreshed |
| Read cost | Cost of the underlying query | Cost of reading a small table |
| Write cost on base tables | None | None until refresh, then the full query |
| Can be indexed | No (index the base tables) | Yes |
| Typical use | Reuse, interface, security | Dashboards, reports, expensive aggregates |
| SQLite / MySQL | Yes | No (use a summary table) |
| SQL Server | Yes | Indexed view (\`WITH SCHEMABINDING\` + unique clustered index), maintained on every write ([Redgate: indexed views basics](https://www.red-gate.com/simple-talk/databases/sql-server/learn/sql-server-indexed-views-the-basics/)) |

## 7. Verified: Running the Code

The two runnable examples ran on sql.js 1.10.2 (SQLite 3.45.0), the engine this page uses, after the schema in the question; the two PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database with the same schema. Copied output:

A view is live (SQLite; PostgreSQL gives the same rows):

~~~text
step | region | paid_orders | revenue
before | APAC | 2 | 150
before | EU | 3 | 230
before | US | 2 | 270

step | region | paid_orders | revenue
after | APAC | 2 | 150
after | EU | 4 | 730
after | US | 2 | 270
~~~

A summary table goes stale (SQLite):

~~~text
source | region | paid_orders | revenue
snapshot | EU | 3 | 230
live query | EU | 4 | 730
~~~

Materialized view before and after \`REFRESH\` (PostgreSQL 16):

~~~text
step | region | paid_orders | revenue
before refresh | APAC | 2 | 150
before refresh | EU | 3 | 230
before refresh | US | 2 | 270
after refresh | APAC | 2 | 150
after refresh | EU | 4 | 730
after refresh | US | 2 | 270
~~~

The view is inlined (PostgreSQL 16; the planner may pick another plan on other data):

~~~text
QUERY PLAN
Seq Scan on orders
  Filter: ((status = 'paid'::text) AND (region = 'EU'::text))
~~~

The locking timeline in section 4 and the error messages in sections 4 and 5 come from separate runs against my own scratch database.

## 8. Edge Cases

- **\`SELECT *\` in a view definition** is expanded when the view is created in PostgreSQL, so a column added to the base table later does not appear in the view until you recreate it (checked: after \`ALTER TABLE orders ADD COLUMN note\`, a \`SELECT *\` view still had 5 columns).
- **Dropping a base table or column** a view depends on fails in PostgreSQL unless you use \`CASCADE\`, which drops the view too (checked: \`cannot drop column region of table orders because other objects depend on it\`).
- **Views on views** are all inlined into one plan; deep stacks make plans hard to read but are not slower by themselves.
- **Security definer semantics:** in PostgreSQL a view reads base tables with the view owner's privileges by default; the \`security_invoker\` view option, added in version 15, checks the caller's privileges instead ([Cybertec: view permissions and row-level security](https://cybertec-postgresql.com/en/view-permissions-and-row-level-security-in-postgresql)); \`CREATE VIEW ... WITH (security_invoker = true)\` was accepted on 16 here.
- **Refreshing inside a busy write path** (for example in a trigger after every insert) recomputes the whole query each time and defeats the point.

## Common Pitfalls

- **Expecting a plain view to speed things up.** It is inlined; the plan is the same as the expanded query.
- **Forgetting to schedule the refresh**, so a dashboard quietly shows last week's numbers.
- **Plain \`REFRESH\` on a view users read all day**, which blocks their queries for the length of the refresh; use \`CONCURRENTLY\` with a unique index.
- **Assuming \`CONCURRENTLY\` is incremental.** It still runs the full query; it only avoids blocking readers.
- **Writing through a filtered view without \`WITH CHECK OPTION\`**, creating rows the view hides.
- **Using a materialized view for data that must be exact right now**, such as account balances.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. View:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">view</strong> is a named, saved <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code>. It stores no rows; when you query it the planner substitutes the definition into your query, so it always shows current data and costs what the underlying query costs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Materialized view:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">materialized view</strong> runs the query once and stores the result rows on disk. Reading it is reading a small table, so it is fast, but it is a snapshot: it is stale until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REFRESH MATERIALIZED VIEW</code> runs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When to use which:</strong> <span style="color:#f0e2c8;">Views for reuse, hiding joins, a stable interface for apps, and limiting which columns a role sees. Materialized views for expensive aggregates read much more often than the data changes: dashboards, reports, search summaries.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Refresh is the hard part:</strong> <span style="color:#f0e2c8;">In PostgreSQL a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REFRESH</code> takes a lock that blocks readers. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REFRESH ... CONCURRENTLY</code> (9.4+) lets reads continue but needs a unique index on the view, and still recomputes the whole query. There is no built-in automatic or incremental refresh: you schedule it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Engines:</strong> <span style="color:#f0e2c8;">SQLite and MySQL have views but no materialized views, so you build a summary table yourself. SQL Server has <strong style="color:#ffca28;">indexed views</strong>, kept in sync automatically on every write. Oracle has materialized views with refresh options.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a view faster than writing the query out?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A plain view is inlined, so the plan is the same as if you had written the query out. In the PostgreSQL plan above the view filter and your filter merged into one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Seq Scan</code>. Views help readability and security, not speed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you insert into a view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Simple single-table views without aggregates are automatically updatable in PostgreSQL (since 9.3). A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> view is not: PostgreSQL says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Views containing GROUP BY are not automatically updatable</code>. SQLite views are read-only unless you add an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSTEAD OF</code> trigger.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does WITH CHECK OPTION do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It stops writes through a view from creating rows the view itself cannot see. Without it, inserting a US order through an EU-only view succeeds and the row vanishes from the view; with it PostgreSQL raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new row violates check option</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep a materialized view fresh?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Schedule <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REFRESH MATERIALIZED VIEW CONCURRENTLY</code> (cron, pg_cron, a job runner) at the staleness the business accepts. For near-real-time totals, maintain a summary table with triggers or in the application instead, and accept the extra write cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you index a materialized view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it is stored like a table, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE INDEX</code> works on it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CONCURRENTLY</code> requires a unique one. A plain view cannot be indexed in PostgreSQL; you index the base tables instead.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| View | A named, stored query with no rows of its own. |
| View inlining | The planner substitutes the view definition into the outer query. |
| Materialized view | A query whose result rows are stored on disk. |
| REFRESH MATERIALIZED VIEW | Re-runs the stored query and replaces the stored rows. |
| Staleness | How far the stored result lags behind the base data. |
| REFRESH ... CONCURRENTLY | Refresh that keeps readers unblocked; needs a unique index. |
| Updatable view | A view whose writes are applied to the base table. |
| WITH CHECK OPTION | Rejects writes through a view that the view could not see. |

**Conclusion:** A view is a saved query: it stores nothing, is inlined into every query that uses it, and is therefore always current and never faster than the query it hides; its value is reuse, a stable interface and security. A materialized view stores the result, so reads are cheap, but the data is a snapshot until \`REFRESH\`, and in PostgreSQL a plain refresh blocks readers while \`CONCURRENTLY\` does not but needs a unique index. Choose by how fresh the data must be versus how expensive the query is, and remember that SQLite and MySQL have no materialized views, so there you maintain a summary table yourself.`,
    examples: [
      {
        label: `A view is live: insert a row and the view result changes immediately`,
        code: `CREATE VIEW paid_revenue AS
SELECT region, COUNT(*) AS paid_orders, SUM(amount) AS revenue
FROM orders
WHERE status = 'paid'
GROUP BY region;

SELECT 'before' AS step, region, paid_orders, revenue
FROM paid_revenue ORDER BY region;

-- a new paid order arrives
INSERT INTO orders (id, customer, region, status, amount)
VALUES (11, 'Kai', 'EU', 'paid', 500);

-- the view runs its query again: EU already includes Kai
SELECT 'after' AS step, region, paid_orders, revenue
FROM paid_revenue ORDER BY region;`,
      },
      {
        label: `SQLite has no materialized views: a summary table goes stale the same way`,
        code: `-- SQLite has no materialized views: a summary table is the manual version
CREATE TABLE paid_revenue_snapshot AS
SELECT region, COUNT(*) AS paid_orders, SUM(amount) AS revenue
FROM orders WHERE status = 'paid' GROUP BY region;

INSERT INTO orders (id, customer, region, status, amount)
VALUES (11, 'Kai', 'EU', 'paid', 500);

-- the stored copy is stale until someone rebuilds it
SELECT 'snapshot' AS source, region, paid_orders, revenue
FROM paid_revenue_snapshot WHERE region = 'EU'
UNION ALL
SELECT 'live query', region, COUNT(*), SUM(amount)
FROM orders WHERE status = 'paid' AND region = 'EU' GROUP BY region
ORDER BY source DESC;`,
      },
      {
        label: `PostgreSQL: a materialized view is stale until REFRESH`,
        code: `CREATE MATERIALIZED VIEW paid_revenue_mv AS
SELECT region, COUNT(*) AS paid_orders, SUM(amount) AS revenue
FROM orders WHERE status = 'paid' GROUP BY region;

INSERT INTO orders (id, customer, region, status, amount)
VALUES (11, 'Kai', 'EU', 'paid', 500);

-- keep what the materialized view says now, before refreshing it
CREATE TEMP TABLE before_refresh AS SELECT * FROM paid_revenue_mv;

REFRESH MATERIALIZED VIEW paid_revenue_mv;

SELECT 'before refresh' AS step, region, paid_orders, revenue FROM before_refresh
UNION ALL
SELECT 'after refresh', region, paid_orders, revenue FROM paid_revenue_mv
ORDER BY step DESC, region;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: the planner inlines a view into the outer query`,
        code: `CREATE VIEW paid_orders AS
SELECT id, customer, region, amount
FROM orders
WHERE status = 'paid';

-- the planner inlines the view: one scan of orders, both filters merged
EXPLAIN (COSTS OFF)
SELECT customer, amount
FROM paid_orders
WHERE region = 'EU';`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is a stored procedure?`,
    difficulty: "medium",
    seoDescription: `What a stored procedure is, how it differs from a function in PostgreSQL, CALL and INOUT, SECURITY DEFINER, and when logic belongs in the database.`,
    description: `**Question presented to candidate:**
"What is a stored procedure? How is it different from a function, and when would you put logic in the database instead of in the application?"

**What a strong answer should cover:**
- A stored procedure is named code stored in the database (SQL plus control flow such as variables, \`IF\`, loops, error handling) that clients run with one call, \`CALL transfer(1, 3, 30)\`
- Procedure vs function in PostgreSQL: a function returns a value and is used inside queries (\`SELECT ... FROM f()\`); a procedure is invoked with \`CALL\`, returns results only through \`INOUT\` parameters, and (since PostgreSQL 11) may \`COMMIT\` / \`ROLLBACK\` inside
- Benefits: one round trip for a multi-step operation, logic and invariants enforced next to the data for every client, permission control with \`GRANT EXECUTE\` and \`SECURITY DEFINER\`
- Costs: harder to version, test, debug and deploy than application code; vendor lock-in (PL/pgSQL, T-SQL, MySQL syntax all differ); database CPU is the hardest tier to scale
- Correct the myth: "precompiled" is not a unique advantage; PL/pgSQL caches statement plans per session, and prepared statements from the application get plan reuse too; SQLite has no stored procedures at all

**Code / implementation expected:** Optional — a small \`CREATE PROCEDURE\` with parameters and a \`CALL\`, and the difference from a function.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE accounts (
  id      INTEGER PRIMARY KEY,
  owner   TEXT NOT NULL,
  balance INTEGER NOT NULL CHECK (balance >= 0)
);
CREATE TABLE transfers (
  id         INTEGER PRIMARY KEY,
  from_id    INTEGER NOT NULL REFERENCES accounts(id),
  to_id      INTEGER NOT NULL REFERENCES accounts(id),
  amount     INTEGER NOT NULL CHECK (amount > 0)
);
INSERT INTO accounts (id, owner, balance) VALUES
  (1, 'Asha', 100),
  (2, 'Ben',   50),
  (3, 'Chen',   0),
  (4, 'Dara', 300),
  (5, 'Eli',   75);
\`\`\``,
    answer: `**Target Audience:** Beginners who have run single SQL statements and hear "put it in a stored procedure"; candidates who need to discuss procedure vs function and the real trade-offs.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 (all procedure and function examples, error messages and permission test) and SQLite 3.45.0 through sql.js 1.10.2 (the runnable example). SQLite has no stored procedures; MySQL and SQL Server are described, not run.

> **How to read this doc:** Each idea comes in plain words first, then a \`📌 Interview term:\` callout gives the precise vocabulary. Every output and error message here comes from an actual run; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

You call your bank and ask to move 30 from your account to a friend's. One way: the call-centre agent reads you each step and waits for you to confirm — "subtract 30 from account 1?" "yes" "add 30 to account 3?" "yes" "write it in the log?" "yes". Four back-and-forths, and if the line drops after step one, the money is in limbo.

The other way: the bank has a **standard form** called "transfer". You hand over one form with three blanks filled in (from, to, amount) and the bank clerk follows the steps behind the counter, the same way for every customer, and either all of it happens or none of it does.

That standard form, stored at the bank and run by the bank, is a **stored procedure**.

## 2. A Stored Procedure in PostgreSQL

📌 **Interview term: stored procedure** — a named routine stored in the database catalog, written in SQL or a procedural language, that takes parameters and is run by the server when a client calls it.

📌 **Interview term: PL/pgSQL** — PostgreSQL's built-in procedural language: SQL plus variables, \`IF\`, loops, \`RAISE\` for errors, and \`FOUND\` to check whether the last statement touched a row. Other databases have their own: T-SQL (SQL Server), PL/SQL (Oracle), MySQL's compound statements.

📌 **Interview term: CALL** — the statement that runs a procedure.

~~~sql
CREATE PROCEDURE transfer(p_from INTEGER, p_to INTEGER, p_amount INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE accounts SET balance = balance - p_amount
  WHERE id = p_from AND balance >= p_amount;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'account % cannot pay %', p_from, p_amount;
  END IF;

  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;

  INSERT INTO transfers (id, from_id, to_id, amount)
  VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM transfers), p_from, p_to, p_amount);
END;
$$;

CALL transfer(1, 3, 30);   -- Asha pays Chen 30
CALL transfer(4, 2, 120);  -- Dara pays Ben 120

SELECT a.id, a.owner, a.balance,
       (SELECT COUNT(*) FROM transfers t WHERE a.id IN (t.from_id, t.to_id)) AS transfers
FROM accounts a
ORDER BY a.id;
~~~

~~~text
id | owner | balance | transfers
1 | Asha | 70 | 1
2 | Ben | 170 | 1
3 | Chen | 30 | 1
4 | Dara | 180 | 1
5 | Eli | 75 | 0
~~~

Two transfers, each a single \`CALL\`, each doing three writes inside. Asha went 100 → 70, Chen 0 → 30, Dara 300 → 180, Ben 50 → 170, and two rows were logged.

The guard is in the procedure, so every client gets it. Calling \`CALL transfer(2, 3, 999)\` (Ben has 50) on PostgreSQL 16 gave:

~~~text
ERROR:  account 2 cannot pay 999
CONTEXT:  PL/pgSQL function transfer(integer,integer,integer) line 6 at RAISE
~~~

and Ben and Chen still had 50 and 0: the error aborted the statement, so nothing it did was kept. Note that the \`CONTEXT\` line calls it a "function": internally PostgreSQL stores procedures in the same catalog as functions (\`pg_proc.prokind = 'p'\` for a procedure, \`'f'\` for a function, both checked).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Without a procedure the application sends four statements, four round trips. With a procedure it sends one CALL and the database runs the steps itself">
  <defs>
    <marker id="sql10q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="34">From the application</text>
  <rect class="d-box" x="20" y="54" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="88" text-anchor="middle">application</text>
  <text class="d-sub" x="110" y="112" text-anchor="middle">sends each step</text>
  <rect class="d-box-muted" x="540" y="54" width="200" height="80" rx="10"/>
  <text class="d-text" x="640" y="88" text-anchor="middle">database</text>
  <text class="d-sub" x="640" y="112" text-anchor="middle">runs one at a time</text>
  <line class="d-edge" x1="204" y1="92" x2="532" y2="92" marker-end="url(#sql10q4-arrow)"/>
  <line class="d-edge" x1="532" y1="116" x2="204" y2="116" marker-end="url(#sql10q4-arrow)"/>
  <text class="d-sub" x="370" y="70" text-anchor="middle">4 round trips</text>
  <text class="d-text" x="20" y="194">Stored procedure</text>
  <rect class="d-box" x="20" y="204" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="238" text-anchor="middle">application</text>
  <text class="d-sub" x="110" y="262" text-anchor="middle">CALL transfer</text>
  <rect class="d-box-accent" x="540" y="204" width="200" height="80" rx="10"/>
  <text class="d-text" x="640" y="238" text-anchor="middle">procedure</text>
  <text class="d-sub" x="640" y="262" text-anchor="middle">all steps inside</text>
  <line class="d-edge-accent" x1="204" y1="244" x2="532" y2="244" marker-end="url(#sql10q4-arrow)"/>
  <text class="d-sub" x="370" y="222" text-anchor="middle">1 round trip</text>
</svg>

One round trip instead of four is the benefit you can measure; it matters most when the database is far away or the operation has many steps.

## 3. Procedure vs Function

📌 **Interview term: function** (user-defined function) — a routine that **returns a value** (a scalar, a row, or a set of rows) and can therefore be used inside a query, in \`SELECT\`, \`WHERE\` or \`FROM\`.

~~~sql
-- A function returns a value, so it can sit inside a query
CREATE FUNCTION rich_accounts(p_min INTEGER)
RETURNS TABLE (owner TEXT, balance INTEGER)
LANGUAGE sql STABLE
AS $$
  SELECT owner, balance FROM accounts WHERE balance >= p_min
$$;

SELECT owner, balance, balance >= 100 AS is_vip
FROM rich_accounts(75)
ORDER BY balance DESC;
~~~

~~~text
owner | balance | is_vip
Dara | 300 | t
Asha | 100 | t
Eli | 75 | f
~~~

A function result is just another table to the query: it was filtered, sorted and extended with \`is_vip\`. A procedure cannot be used this way. \`SELECT transfer(1, 3, 10)\` gave:

~~~text
ERROR:  transfer(integer, integer, integer) is a procedure
LINE 1: SELECT transfer(1, 3, 10);
               ^
HINT:  To call a procedure, use CALL.
~~~

📌 **Interview term: INOUT parameter** — a procedure parameter that both passes a value in and hands a value back; \`CALL\` returns the INOUT values as one row. It is how a PostgreSQL procedure returns data.

~~~sql
-- A procedure hands results back through INOUT parameters: CALL returns them as one row
CREATE PROCEDURE total_balance(INOUT p_total INTEGER DEFAULT NULL, INOUT p_accounts INTEGER DEFAULT NULL)
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT SUM(balance), COUNT(*) INTO p_total, p_accounts FROM accounts;
END;
$$;

CALL total_balance();
~~~

~~~text
p_total | p_accounts
525 | 5
~~~

📌 **Interview term: transaction control in procedures** — PostgreSQL 11 added \`CREATE PROCEDURE\` and \`CALL\`; unlike functions, procedures may run \`COMMIT\` and \`ROLLBACK\` inside their body ([2ndQuadrant: PostgreSQL 11 server-side procedures](https://www.2ndquadrant.com/en/?p=5600); [dbi services: procedures and transaction control](https://www.dbi-services.com/blog/postgresql-11-procedures-and-transaction-control/)). That is what makes them useful for batch jobs that commit every few thousand rows. What I saw on PostgreSQL 16:

- A procedure that does \`UPDATE ...; COMMIT; UPDATE ...; ROLLBACK;\` called at top level kept the first update and discarded the second (Eli's balance went 75 → 76, not 77).
- The same procedure called inside \`BEGIN; CALL batch_commit();\` failed: \`ERROR:  invalid transaction termination\`.
- A function containing \`COMMIT\` failed the same way when called with \`SELECT\`.

| | Function | Procedure |
| :--- | :--- | :--- |
| Invoked with | Inside a query: \`SELECT f()\`, \`FROM f()\` | \`CALL p()\` |
| Returns | A value, row or set of rows | Nothing, or \`INOUT\` values as one row |
| Usable in \`WHERE\` / \`JOIN\` | Yes | No |
| \`COMMIT\` / \`ROLLBACK\` inside | No | Yes, when called at top level (PostgreSQL 11+) |
| Typical use | Computations, reusable queries, trigger functions | Multi-step changes, batch jobs |

Before PostgreSQL 11, people wrote "procedures" as functions returning \`void\`, so older codebases often use the word for both.

## 4. SQLite: No Procedures, So the Application Does It

SQLite has no stored procedures; when users ask for them on the SQLite forum, the usual answer is that the host application, which embeds SQLite in its own process, should run that logic itself ([SQLite forum: "Feature request: Stored Procedures"](https://sqlite.org/forum/forumpost/28c03d56a1?t=h&hist)). In an embedded database there is no network round trip to save. The same transfer as application-sent statements in one transaction:

~~~sql
-- SQLite has no stored procedures: the application sends the same steps
-- itself, inside one transaction, and checks the rows affected after each one
BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 1 AND balance >= 30;
UPDATE accounts SET balance = balance + 30 WHERE id = 3;
INSERT INTO transfers (id, from_id, to_id, amount) VALUES (1, 1, 3, 30);
COMMIT;

SELECT a.id, a.owner, a.balance, (SELECT COUNT(*) FROM transfers) AS transfers_logged
FROM accounts a
WHERE a.id IN (1, 3)
ORDER BY a.id;
~~~

~~~text
id | owner | balance | transfers_logged
1 | Asha | 70 | 1
3 | Chen | 30 | 1
~~~

The application must also do the check the procedure did with \`IF NOT FOUND\`: read the rows-affected count of the first \`UPDATE\` and roll back if it is 0. The transaction is what makes the steps all-or-nothing ([When would you use a transaction explicitly?](/interview-question/when-would-you-use-a-transaction-explicitly)); the procedure only moves where the steps run.

## 5. Security: GRANT EXECUTE and SECURITY DEFINER

📌 **Interview term: SECURITY DEFINER** — the routine runs with the privileges of its **owner**, not of the caller. Combined with \`GRANT EXECUTE\`, it lets a role perform one controlled operation on a table it cannot otherwise touch.

I tested it on PostgreSQL 16 with a role that had no privileges on \`accounts\`:

~~~sql
ALTER PROCEDURE transfer(INTEGER, INTEGER, INTEGER) SECURITY DEFINER SET search_path = public;
REVOKE ALL ON PROCEDURE transfer(INTEGER, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE transfer(INTEGER, INTEGER, INTEGER) TO app_role;
~~~

As that role, \`UPDATE accounts SET balance = 1000000 WHERE id = 2\` failed with \`ERROR:  permission denied for table accounts\`, while \`CALL transfer(4, 2, 10)\` succeeded (Dara 300 → 290, Ben 50 → 60). The role can move money only through the rules in the procedure. Always pin \`search_path\` on a \`SECURITY DEFINER\` routine so a caller cannot substitute their own tables or functions.

## 6. The "Precompiled" Myth and Real Performance

Older answers say procedures are faster because they are "precompiled". In PostgreSQL that is mostly not the reason:

📌 **Interview term: plan caching** — PL/pgSQL prepares each SQL statement in a routine the first time it runs in a session and can reuse the plan afterwards ([PostgreSQL docs: PL/pgSQL under the hood, plan caching](https://www.postgresql.org/docs/current/plpgsql-implementation.html)). Application code using **prepared statements** gets the same kind of plan reuse, so this is not unique to procedures.

What does differ:

- **Round trips:** one \`CALL\` instead of N statements. For a loop of many small statements this is the dominant cost.
- **Data locality:** set-based work over many rows that would otherwise be shipped to the application and back.
- **Scaling:** the flip side. Application servers scale out easily; the primary database does not, so heavy CPU work inside procedures competes with every other query.

## 7. When to Use One

| Put it in a procedure when... | Keep it in the application when... |
| :--- | :--- |
| Many clients or services must apply the same rule | One service owns the data |
| An operation needs many round trips | It is one or two statements |
| A role must be allowed one operation but not raw table access | Normal table privileges are enough |
| Batch jobs need to commit in chunks inside the database | The job runner already batches |
| The team can review, test and migrate database code | Database code would escape code review and CI |

## 8. Verified: Running the Code

The PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database seeded with the schema in the question; the runnable example ran on sql.js 1.10.2 (SQLite 3.45.0), the engine the page uses. Outputs copied from those runs:

The transfer procedure, two \`CALL\`s (PostgreSQL 16):

~~~text
id | owner | balance | transfers
1 | Asha | 70 | 1
2 | Ben | 170 | 1
3 | Chen | 30 | 1
4 | Dara | 180 | 1
5 | Eli | 75 | 0
~~~

A set-returning function used in a query (PostgreSQL 16):

~~~text
owner | balance | is_vip
Dara | 300 | t
Asha | 100 | t
Eli | 75 | f
~~~

A procedure returning \`INOUT\` values (PostgreSQL 16):

~~~text
p_total | p_accounts
525 | 5
~~~

The application-side transfer in a transaction (SQLite):

~~~text
id | owner | balance | transfers_logged
1 | Asha | 70 | 1
3 | Chen | 30 | 1
~~~

The error messages, the commit-inside-procedure behaviour and the \`SECURITY DEFINER\` test came from separate runs against my own scratch database.

## 9. Edge Cases

- **Overloading:** PostgreSQL identifies routines by name plus argument types, so \`transfer(int, int, int)\` and \`transfer(int, int, numeric)\` are different objects; \`GRANT\` and \`DROP\` need the full signature.
- **Dynamic SQL inside a procedure** (\`EXECUTE 'SELECT ... ' || input\`) is as injectable as string-built SQL anywhere else; use \`format()\` with \`%I\` / \`%L\` or \`EXECUTE ... USING\` ([What is SQL injection?](/interview-question/what-is-sql-injection-and-how-do-parameterized-queries-prevent-it)).
- **Concurrent calls:** a procedure does not serialise callers. Two transfers from the same account at once rely on row locks and the \`balance >= p_amount\` condition in the \`UPDATE\`, exactly as plain SQL would.
- **Schema changes:** PL/pgSQL bodies are not dependency-tracked. \`ALTER TABLE transfers DROP COLUMN amount\` succeeded with the procedure in place, and the next \`CALL transfer(1, 3, 5)\` failed with \`column "amount" of relation "transfers" does not exist\`. Tests are the safety net (compare views, which block such a drop).

## Common Pitfalls

- **Calling a procedure with \`SELECT\`**, or expecting it to return a result set like SQL Server's: in PostgreSQL use a function for that, or \`INOUT\` parameters.
- **Believing "precompiled" is the main benefit**; the measurable win is fewer round trips.
- **Putting all business logic in procedures** that nobody versions, reviews or tests, then being unable to change them safely.
- **\`SECURITY DEFINER\` without a fixed \`search_path\`**, which lets a caller hijack object names.
- **\`COMMIT\` inside a procedure called from inside an explicit transaction**, which fails with \`invalid transaction termination\`.
- **Assuming the syntax ports.** PL/pgSQL, T-SQL and MySQL procedures are different languages.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">stored procedure</strong> is named code stored in the database, SQL plus control flow such as variables, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IF</code>, loops and error handling, that a client runs with one statement: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CALL transfer(1, 3, 30)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Procedure vs function:</strong> <span style="color:#f0e2c8;">In PostgreSQL a <strong style="color:#ffca28;">function</strong> returns a value and is used inside a query, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT * FROM rich_accounts(75)</code>. A <strong style="color:#ffca28;">procedure</strong> is run with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CALL</code>, returns data only through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INOUT</code> parameters, and since PostgreSQL 11 may <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COMMIT</code> inside itself. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT transfer(...)</code> fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is a procedure</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why use one:</strong> <span style="color:#f0e2c8;">One round trip for a multi-step operation, the rule lives next to the data so every client obeys it, and security: grant <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXECUTE</code> on the procedure without granting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> on the table, using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SECURITY DEFINER</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why not:</strong> <span style="color:#f0e2c8;">The code is harder to version, test, review and deploy than application code, every vendor language differs (PL/pgSQL, T-SQL, MySQL), and the database is the hardest tier to scale out. SQLite has no procedures at all.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My default:</strong> <span style="color:#f0e2c8;">Keep business logic in the application, run multi-statement changes in one transaction, and use a procedure where the round trips or the permission boundary really matter, for example a ledger transfer called by several services.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are stored procedures faster because they are precompiled?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mostly a myth today. PL/pgSQL prepares and caches each statement plan per session the first time it runs, but an application using prepared statements gets plan reuse too. The real speed win is fewer <strong style="color:#ffca28;">network round trips</strong>, which matters for chatty, many-step operations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a procedure raises an error halfway?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The statement fails and its changes roll back. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CALL transfer(2, 3, 999)</code> raised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">account 2 cannot pay 999</code> and both balances were unchanged, because the debit's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> matched no row and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RAISE</code> aborted before any write committed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a procedure commit inside a transaction the caller opened?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Transaction control only works when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CALL</code> runs at the top level. Inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN; CALL batch_commit();</code> PostgreSQL 16 raised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">invalid transaction termination</code>, and a function that tries <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COMMIT</code> fails the same way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do stored procedures prevent SQL injection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only when their parameters are used as values. Building SQL strings inside the procedure and running them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXECUTE</code> is just as injectable; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">format()</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%L</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%I</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXECUTE ... USING</code>. See the SQL injection page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this done in other databases?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">MySQL has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE PROCEDURE ... BEGIN ... END</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CALL</code>; SQL Server uses T-SQL with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXEC</code> and procedures can return result sets directly; Oracle uses PL/SQL. SQLite has none, so the logic lives in the application or in triggers.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Stored procedure | Named routine stored in the database and run by the server on \`CALL\`. |
| PL/pgSQL | PostgreSQL's procedural language: SQL plus variables, control flow and errors. |
| CALL | Statement that runs a procedure. |
| Function | Routine that returns a value and can be used inside a query. |
| INOUT parameter | Parameter that passes a value in and returns one out. |
| Transaction control in procedures | \`COMMIT\` / \`ROLLBACK\` inside a procedure called at top level (PostgreSQL 11+). |
| SECURITY DEFINER | Routine runs with its owner's privileges. |
| Plan caching | Reusing a prepared statement plan instead of planning again. |

**Conclusion:** A stored procedure is named code that lives and runs inside the database, called with \`CALL\`, so a multi-step operation becomes one round trip and its rules apply to every client. In PostgreSQL it differs from a function in that it returns no value (only \`INOUT\` parameters), cannot be used inside a query, and can commit inside itself when called at top level; \`SECURITY DEFINER\` plus \`GRANT EXECUTE\` turns it into a permission boundary. The costs are real — harder testing and deployment, vendor-specific languages, and CPU on the hardest tier to scale — and the old "precompiled, so faster" argument mostly does not hold, so use procedures where round trips, shared invariants or permissions justify them, and remember SQLite has none.`,
    examples: [
      {
        label: `PostgreSQL: a transfer procedure, called twice with CALL`,
        code: `CREATE PROCEDURE transfer(p_from INTEGER, p_to INTEGER, p_amount INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE accounts SET balance = balance - p_amount
  WHERE id = p_from AND balance >= p_amount;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'account % cannot pay %', p_from, p_amount;
  END IF;

  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;

  INSERT INTO transfers (id, from_id, to_id, amount)
  VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM transfers), p_from, p_to, p_amount);
END;
$$;

CALL transfer(1, 3, 30);   -- Asha pays Chen 30
CALL transfer(4, 2, 120);  -- Dara pays Ben 120

SELECT a.id, a.owner, a.balance,
       (SELECT COUNT(*) FROM transfers t WHERE a.id IN (t.from_id, t.to_id)) AS transfers
FROM accounts a
ORDER BY a.id;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: a function returns rows, so it can be used inside a query`,
        code: `-- A function returns a value, so it can sit inside a query
CREATE FUNCTION rich_accounts(p_min INTEGER)
RETURNS TABLE (owner TEXT, balance INTEGER)
LANGUAGE sql STABLE
AS $$
  SELECT owner, balance FROM accounts WHERE balance >= p_min
$$;

SELECT owner, balance, balance >= 100 AS is_vip
FROM rich_accounts(75)
ORDER BY balance DESC;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: a procedure returns values through INOUT parameters`,
        code: `-- A procedure hands results back through INOUT parameters: CALL returns them as one row
CREATE PROCEDURE total_balance(INOUT p_total INTEGER DEFAULT NULL, INOUT p_accounts INTEGER DEFAULT NULL)
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT SUM(balance), COUNT(*) INTO p_total, p_accounts FROM accounts;
END;
$$;

CALL total_balance();`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `SQLite (no procedures): the same transfer sent by the application in one transaction`,
        code: `-- SQLite has no stored procedures: the application sends the same steps
-- itself, inside one transaction, and checks the rows affected after each one
BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 1 AND balance >= 30;
UPDATE accounts SET balance = balance + 30 WHERE id = 3;
INSERT INTO transfers (id, from_id, to_id, amount) VALUES (1, 1, 3, 30);
COMMIT;

SELECT a.id, a.owner, a.balance, (SELECT COUNT(*) FROM transfers) AS transfers_logged
FROM accounts a
WHERE a.id IN (1, 3)
ORDER BY a.id;`,
      },
    ],
  },
  {
    title: `What is a database trigger?`,
    difficulty: "medium",
    seoDescription: `What a database trigger is: BEFORE vs AFTER vs INSTEAD OF, row vs statement level, OLD and NEW, with SQLite and PostgreSQL examples and trade-offs.`,
    description: `**Question presented to candidate:**
"What is a database trigger? Walk me through BEFORE versus AFTER, row-level versus statement-level, and tell me when you would and would not use one."

**What a strong answer should cover:**
- A trigger is code the database runs automatically when an \`INSERT\`, \`UPDATE\` or \`DELETE\` (in PostgreSQL also \`TRUNCATE\`) happens on a table; nobody calls it, and it runs inside the same transaction as the statement
- Timing: \`BEFORE\` can change or reject the incoming row (\`NEW\`), \`AFTER\` sees the final row and is used for audit logs and side tables, \`INSTEAD OF\` makes views writable
- Granularity: \`FOR EACH ROW\` fires once per affected row with \`OLD\` / \`NEW\`; \`FOR EACH STATEMENT\` fires once per statement, even for zero rows (PostgreSQL; SQLite only has row triggers)
- Good uses: audit trails, \`updated_at\` stamps, keeping a denormalized counter or summary table in sync, enforcing a rule a \`CHECK\` cannot express
- Costs: hidden logic that surprises readers, per-row overhead on bulk writes, cascades and recursion, ordering between several triggers, engine differences (MySQL error 1442)

**Code / implementation expected:** Optional — a small audit trigger with \`OLD\` / \`NEW\`, and an explanation of what fires when.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL
);
CREATE TABLE price_history (
  id         INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  old_price  INTEGER NOT NULL,
  new_price  INTEGER NOT NULL
);
CREATE TABLE trigger_log (
  level TEXT PRIMARY KEY,
  fires INTEGER NOT NULL
);
INSERT INTO products (id, name, price, stock) VALUES
  (1, 'Keyboard', 50, 10),
  (2, 'Mouse',    20, 25),
  (3, 'Monitor', 180,  4),
  (4, 'Webcam',   60,  0),
  (5, 'Headset',  80,  7);
INSERT INTO trigger_log (level, fires) VALUES ('row', 0), ('statement', 0);
\`\`\``,
    answer: `**Target Audience:** Beginners who know \`INSERT\` / \`UPDATE\` / \`DELETE\` and want to understand code that runs "by itself"; candidates who need BEFORE vs AFTER, row vs statement and the trade-offs.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the runnable examples) and PostgreSQL 16.15 (statement-level triggers, PL/pgSQL trigger functions, ordering, TRUNCATE and timing tests), both run for this page. MySQL notes are cited.

> **How to read this doc:** Each idea is explained in plain words first, then tagged \`📌 Interview term:\` with the vocabulary interviewers use. Every result and error below came from an actual run; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A shop has a rule: "whenever anyone changes a price tag, write the old and new price in the logbook". The staff are busy and forget. So the owner installs a little machine on the price-tag printer: every time a new tag is printed, the machine writes the logbook line by itself. Nobody has to remember, nobody can skip it, and if the logbook is full, the tag does not get printed either.

That machine is a **trigger**. It is attached to a table, it watches for a kind of change, and it runs automatically, inside the same unit of work as the change.

## 2. The Building Blocks

📌 **Interview term: trigger** — a database object attached to a table (or view) that runs a piece of code automatically when a given event happens on it. It runs in the same transaction as the statement that fired it ([What are ACID properties?](/interview-question/what-are-acid-properties)).

📌 **Interview term: triggering event** — \`INSERT\`, \`UPDATE\` (optionally \`UPDATE OF column\`), \`DELETE\`, and in PostgreSQL \`TRUNCATE\`.

📌 **Interview term: BEFORE / AFTER / INSTEAD OF** — when it runs. \`BEFORE\`: before the row is written, so it can change or reject it. \`AFTER\`: once the row is written, so it sees the final values. \`INSTEAD OF\`: on views, replaces the write entirely ([What is a view and a materialized view?](/interview-question/what-is-a-view-and-a-materialized-view)).

📌 **Interview term: row-level vs statement-level** — \`FOR EACH ROW\` runs once per affected row; \`FOR EACH STATEMENT\` runs once per statement however many rows it touched. SQLite supports only \`FOR EACH ROW\`.

📌 **Interview term: OLD and NEW** — in a row-level trigger, the row before the change and the row after it. \`INSERT\` has only \`NEW\`, \`DELETE\` only \`OLD\`, \`UPDATE\` both.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="An UPDATE statement runs BEFORE ROW triggers, then writes the row, then runs AFTER ROW triggers, and finally AFTER STATEMENT triggers, all in one transaction">
  <defs>
    <marker id="sql10q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="130" height="80" rx="10"/>
  <text class="d-text" x="85" y="94" text-anchor="middle">UPDATE</text>
  <text class="d-sub" x="85" y="118" text-anchor="middle">statement</text>
  <rect class="d-box" x="210" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="280" y="94" text-anchor="middle">BEFORE row</text>
  <text class="d-sub" x="280" y="118" text-anchor="middle">may edit NEW</text>
  <rect class="d-box-accent" x="410" y="60" width="130" height="80" rx="10"/>
  <text class="d-text" x="475" y="94" text-anchor="middle">row written</text>
  <text class="d-sub" x="475" y="118" text-anchor="middle">constraints</text>
  <rect class="d-box" x="600" y="60" width="140" height="80" rx="10"/>
  <text class="d-text" x="670" y="94" text-anchor="middle">AFTER row</text>
  <text class="d-sub" x="670" y="118" text-anchor="middle">audit, sync</text>
  <line class="d-edge" x1="154" y1="100" x2="202" y2="100" marker-end="url(#sql10q5-arrow)"/>
  <line class="d-edge" x1="354" y1="100" x2="402" y2="100" marker-end="url(#sql10q5-arrow)"/>
  <line class="d-edge" x1="544" y1="100" x2="592" y2="100" marker-end="url(#sql10q5-arrow)"/>
  <text class="d-sub" x="380" y="30" text-anchor="middle">one transaction</text>
  <line class="d-edge-dashed" x1="20" y1="170" x2="740" y2="170"/>
  <text class="d-sub" x="380" y="196" text-anchor="middle">then AFTER STATEMENT, once</text>
</svg>

Every step above is part of the statement transaction: if any trigger raises an error, the whole statement, including the rows already written, is rolled back. Statement-level \`BEFORE\` triggers (not drawn) run once, before the first row.

## 3. An Audit Trail with an AFTER Trigger

~~~sql
CREATE TRIGGER log_price_change
AFTER UPDATE OF price ON products
FOR EACH ROW
WHEN OLD.price <> NEW.price
BEGIN
  INSERT INTO price_history (product_id, old_price, new_price)
  VALUES (OLD.id, OLD.price, NEW.price);
END;

UPDATE products SET price = price + 5 WHERE id IN (1, 2);  -- two real changes
UPDATE products SET price = 180 WHERE id = 3;              -- same value: WHEN skips it
UPDATE products SET stock = stock - 1 WHERE id = 5;        -- price not in SET: never fires

SELECT h.id, p.name, h.old_price, h.new_price
FROM price_history h
JOIN products p ON p.id = h.product_id
ORDER BY h.id;
~~~

~~~text
id | name | old_price | new_price
1 | Keyboard | 50 | 55
2 | Mouse | 20 | 25
~~~

Three \`UPDATE\`s ran, one history row per *real* price change:

- \`UPDATE ... WHERE id IN (1, 2)\` changed two prices → two rows.
- Setting the Monitor price to 180 again matched a row, so the trigger was considered, but \`WHEN OLD.price <> NEW.price\` was false → nothing logged.
- The stock update did not mention \`price\`, and \`AFTER UPDATE OF price\` only fires when that column is in the \`SET\` list → nothing logged.

📌 **Interview term: WHEN clause** — a condition on \`OLD\` / \`NEW\` that decides whether a row-level trigger body runs at all. It is cheaper and clearer than an \`IF\` inside the body. (PostgreSQL requires parentheses: \`WHEN (OLD.price IS DISTINCT FROM NEW.price)\`; the SQLite form above without parentheses is a syntax error there, checked.)

## 4. Validating or Fixing Rows with a BEFORE Trigger

On SQLite, \`RAISE(IGNORE)\` inside a \`BEFORE\` trigger quietly skips the current row:

~~~sql
CREATE TRIGGER skip_negative_stock
BEFORE INSERT ON products
FOR EACH ROW
WHEN NEW.stock < 0
BEGIN
  SELECT RAISE(IGNORE);
END;

INSERT INTO products (id, name, price, stock) VALUES (6, 'Cable', 5, 100);
INSERT INTO products (id, name, price, stock) VALUES (7, 'Broken', 9, -3);

SELECT id, name, stock FROM products WHERE id >= 5 ORDER BY id;
~~~

~~~text
id | name | stock
5 | Headset | 7
6 | Cable | 100
~~~

The 'Broken' row with stock -3 never arrived, and no error was reported. Silent skipping is rarely what you want; \`RAISE(ABORT, 'message')\` fails the statement instead. With such a trigger on \`UPDATE OF stock\`, \`UPDATE products SET stock = stock - 1 WHERE id = 4\` (the webcam, stock 0) failed on SQLite with:

~~~text
stock cannot go negative
~~~

In PostgreSQL the body is a separate **trigger function** written in PL/pgSQL; a \`BEFORE\` row trigger returns the row to write, and may change it first:

~~~sql
CREATE FUNCTION tidy_product() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name := initcap(trim(NEW.name));   -- a BEFORE trigger may rewrite the row
  IF NEW.stock < 0 THEN
    RAISE EXCEPTION 'stock cannot be negative for %', NEW.name;
  END IF;
  RETURN NEW;                            -- returning NULL would skip the row
END;
$$;

CREATE TRIGGER tidy_before_write
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION tidy_product();

INSERT INTO products (id, name, price, stock) VALUES (6, '   usb HUB  ', 25, 12);
UPDATE products SET name = 'wireless mouse' WHERE id = 2;

SELECT id, name, price, stock FROM products WHERE id IN (2, 6) ORDER BY id;
~~~

~~~text
id | name | price | stock
2 | Wireless Mouse | 20 | 25
6 | Usb Hub | 25 | 12
~~~

📌 **Interview term: trigger function** — in PostgreSQL, a function declared \`RETURNS trigger\` that holds the trigger body. The trigger itself (\`CREATE TRIGGER ... EXECUTE FUNCTION tidy_product()\`) only says when to call it; one function can serve many triggers.

The same function rejected a bad row: \`INSERT ... VALUES (7, 'bad', 1, -1)\` failed with \`ERROR:  stock cannot be negative for Bad\` (note the name had already been tidied to "Bad"). A plain \`CHECK (stock >= 0)\` would be the better tool for that particular rule ([What is a CHECK constraint?](/interview-question/what-is-a-check-constraint)); triggers earn their place when the rule needs other rows or other tables.

## 5. Row-Level vs Statement-Level

~~~sql
CREATE FUNCTION count_fires() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE trigger_log SET fires = fires + 1 WHERE level = lower(TG_LEVEL);
  RETURN NULL;  -- the return value of an AFTER trigger is ignored
END;
$$;

CREATE TRIGGER per_row AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION count_fires();
CREATE TRIGGER per_statement AFTER UPDATE ON products
  FOR EACH STATEMENT EXECUTE FUNCTION count_fires();

UPDATE products SET price = price + 1 WHERE price < 100;  -- 4 rows, 1 statement
UPDATE products SET price = price + 1 WHERE id = 99;      -- 0 rows, 1 statement

SELECT level, fires FROM trigger_log ORDER BY level;
~~~

~~~text
level | fires
row | 4
statement | 2
~~~

The first \`UPDATE\` touched 4 rows (every price under 100): the row trigger fired 4 times, the statement trigger once. The second \`UPDATE\` matched **no** rows: the row trigger did not fire, but the statement trigger still fired. That is the rule: statement-level triggers fire once per statement, even for zero rows.

📌 **Interview term: transition table** — in PostgreSQL 10+, a statement-level \`AFTER\` trigger can declare \`REFERENCING NEW TABLE AS new_rows\` (and/or \`OLD TABLE\`) and read every changed row as a table ([EDB: accessing modified rows in statement-level triggers](https://www.enterprisedb.com/index.php/postgres-tutorials/can-modified-tuples-be-accessed-using-statement-level-trigger-postgres); [PostgreSQL CREATE TRIGGER](https://postgresql.org/docs/18/sql-createtrigger.html)). That turns per-row work into one set-based statement.

### What triggers cost on bulk writes

I inserted 200,000 rows with \`INSERT ... SELECT FROM generate_series\` into three tables on PostgreSQL 16, three runs each:

| Table | Time |
| :--- | :--- |
| No trigger | ~150-230 ms |
| \`AFTER INSERT FOR EACH ROW\` trigger copying each row to an audit table | ~1.0-1.5 s |
| \`AFTER INSERT FOR EACH STATEMENT\` trigger with a transition table, one \`INSERT ... SELECT\` | ~350-720 ms |

Both audit versions wrote the same 200,000 audit rows (checked). The row trigger pays a function call per row; the statement version does the copy as one set operation. Treat the numbers as ratios on one machine.

## 6. Ordering, Recursion and Things That Do Not Fire

**Several triggers on one event.** I created \`b_trg\`, then \`a_trg\`, then \`c_trg\`, all \`AFTER INSERT\`, each recording its own name:

- PostgreSQL 16 fired \`a_trg\`, \`b_trg\`, \`c_trg\`: alphabetical by name, whatever the creation order.
- SQLite (sql.js 1.10.2) recorded them newest first:

~~~text
rowid | n
1 | c_trg
2 | a_trg
3 | b_trg
~~~

I did not find this order documented for SQLite, so do not rely on it; if order matters, use one trigger.

**Recursion.** A trigger that updates its own table can fire itself again. On SQLite this trigger adds 1 to stock whenever stock is set below 15:

~~~sql
CREATE TRIGGER bump AFTER UPDATE OF stock ON products WHEN NEW.stock < 15
BEGIN UPDATE products SET stock = stock + 1 WHERE id = NEW.id; END;
UPDATE products SET stock = 10 WHERE id = 1;
SELECT 'default' AS mode, stock FROM products WHERE id = 1;
PRAGMA recursive_triggers = ON;
UPDATE products SET stock = 10 WHERE id = 1;
SELECT 'recursive_triggers on' AS mode, stock FROM products WHERE id = 1;
~~~

~~~text
mode | stock
default | 11

mode | stock
recursive_triggers on | 15
~~~

By default SQLite did not re-fire the trigger from inside itself (stock stopped at 11). With \`PRAGMA recursive_triggers = ON\` it kept firing until the \`WHEN\` condition went false at 15. PostgreSQL re-fires by default: the same trigger written in PL/pgSQL took stock from 10 to 15 with no setting changed, so a trigger that updates its own table needs a guard (a condition, or \`pg_trigger_depth()\`). MySQL refuses outright: a trigger may not modify a table that the triggering statement is using, error 1442 ([MySQL bug #63416 quoting the manual](https://bugs.mysql.com/bug.php?id=63416)).

**What does not fire.** On PostgreSQL 16, \`TRUNCATE price_history\` did **not** fire a row-level \`AFTER DELETE\` trigger (0 firings recorded); \`TRUNCATE\` has its own statement-level \`ON TRUNCATE\` trigger event. Bulk loaders and maintenance tools that bypass normal DML are the usual audit gaps.

## 7. When to Use a Trigger (and When Not)

| Good fit | Better elsewhere |
| :--- | :--- |
| Audit log that must not be skippable | Sending emails or calling APIs (do it after commit, from the app or a queue) |
| \`updated_at\` / \`version\` columns | Simple per-row rules: use \`CHECK\`, \`NOT NULL\`, foreign keys |
| Keeping a counter or summary table in sync | Complex business workflows that need tests and code review |
| Making a view writable (\`INSTEAD OF\`) | Heavy work on bulk-loaded tables (use statement-level or batch jobs) |

A trigger is a good place for something that must happen on **every** write regardless of which application made it, and a bad place for logic a teammate reading the \`UPDATE\` needs to know about.

## 8. Verified: Running the Code

The two runnable examples ran on sql.js 1.10.2 (SQLite 3.45.0), the engine the page uses, after the schema in the question; the two PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database with the same schema. Outputs copied from those runs:

Audit trigger (SQLite):

~~~text
id | name | old_price | new_price
1 | Keyboard | 50 | 55
2 | Mouse | 20 | 25
~~~

\`RAISE(IGNORE)\` skips a row (SQLite):

~~~text
id | name | stock
5 | Headset | 7
6 | Cable | 100
~~~

Row vs statement firings (PostgreSQL 16):

~~~text
level | fires
row | 4
statement | 2
~~~

A \`BEFORE\` trigger rewrites rows (PostgreSQL 16):

~~~text
id | name | price | stock
2 | Wireless Mouse | 20 | 25
6 | Usb Hub | 25 | 12
~~~

The ordering, recursion, \`TRUNCATE\`, error-message and timing results came from separate runs against my own scratch databases.

## 9. Edge Cases

- **Error inside an AFTER trigger** rolls back the statement that fired it, including rows already written; a buggy audit trigger can block all writes to a table.
- **\`UPDATE\` that sets a column to its current value** still fires \`UPDATE\` triggers (checked on PostgreSQL 16: \`SET price = price\` fired a row trigger once); use \`WHEN (OLD.x IS DISTINCT FROM NEW.x)\` to ignore no-op changes.
- **Foreign key cascades** fire the child table's triggers too (checked on PostgreSQL 16 with \`ON DELETE CASCADE\` and an \`AFTER DELETE\` trigger on the child; [What are foreign key cascade options?](/interview-question/what-are-foreign-key-cascade-options)).
- **Triggers in SQLite run per row only**; there is no statement-level trigger to batch work.

## Common Pitfalls

- **Hidden side effects:** someone reads \`UPDATE products SET price = ...\` and has no idea it also writes history rows and updates a summary table.
- **Doing slow or external work in a trigger** (HTTP calls, emails) inside the transaction, holding locks and making writes fail when the service is down.
- **Row-level triggers on bulk-loaded tables**, multiplying the cost of every import; use statement-level with transition tables.
- **Forgetting \`TRUNCATE\`** and other paths that do not fire \`DELETE\` triggers, leaving gaps in the audit log.
- **Relying on trigger order** between several triggers on the same event, especially on SQLite where it is not documented.
- **Infinite recursion** from a trigger that updates its own table without a guard.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">trigger</strong> is code attached to a table that the database runs automatically on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE</code> (PostgreSQL also <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TRUNCATE</code>). Nobody calls it, and it runs inside the same transaction, so if it fails the statement fails.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Timing:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEFORE</code> runs before the row is written and may change <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NEW</code> or reject it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AFTER</code> sees the final row and is used for audit logs and keeping other tables in sync. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSTEAD OF</code> replaces the write and is how you make a view writable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Granularity:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR EACH ROW</code> fires once per affected row with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OLD</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NEW</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR EACH STATEMENT</code> fires once per statement, even when zero rows match: in my run, 4 row firings and 2 statement firings for two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code>s. SQLite only has row triggers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Good uses:</strong> <span style="color:#f0e2c8;">Audit trails, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updated_at</code> stamps, maintaining a summary or counter table, and rules a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHECK</code> constraint cannot express because they look at other rows or tables.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Costs:</strong> <span style="color:#f0e2c8;">The logic is invisible to someone reading the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code>, every row pays for it (a row trigger made a 200,000-row insert several times slower in my test), triggers can cascade or recurse, and behaviour differs by engine. I keep them small and documented.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are OLD and NEW?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Row variables available in row-level triggers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OLD</code> is the row before the change (UPDATE, DELETE), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NEW</code> the row after (INSERT, UPDATE). A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEFORE</code> trigger in PostgreSQL returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NEW</code> (possibly modified) to write it, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULL</code> to skip the row.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If two triggers fire on the same event, which runs first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL runs them in alphabetical order of name: triggers created as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b_trg</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a_trg</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c_trg</code> fired <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a_trg</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b_trg</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c_trg</code>. SQLite, in my run, fired them newest first (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c_trg</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a_trg</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b_trg</code>); I would not rely on SQLite's order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does TRUNCATE fire DELETE triggers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. In PostgreSQL a row-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AFTER DELETE</code> trigger did not fire at all for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TRUNCATE</code>; you need a separate statement-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON TRUNCATE</code> trigger. Bulk deletes that bypass triggers are a common audit gap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid the per-row cost on bulk writes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL use a statement-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AFTER</code> trigger with a transition table, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REFERENCING NEW TABLE AS new_rows</code> (PostgreSQL 10+), and process all changed rows in one set-based <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT ... SELECT</code>. In my test it was roughly half the row-trigger time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a trigger update the table it is defined on?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL and SQLite, yes, but watch recursion: SQLite does not re-fire the trigger by default (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">recursive_triggers</code> is off), PostgreSQL does re-fire. MySQL refuses with error 1442 when a trigger modifies the table the statement is using.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Trigger | Code the database runs automatically on a table event, in the same transaction. |
| Triggering event | \`INSERT\`, \`UPDATE [OF col]\`, \`DELETE\`, \`TRUNCATE\` (PostgreSQL). |
| BEFORE / AFTER / INSTEAD OF | Run before the write, after it, or in place of it (views). |
| Row-level vs statement-level | Once per affected row, or once per statement. |
| OLD and NEW | The row before and after the change. |
| WHEN clause | Condition that decides whether a row trigger runs. |
| Trigger function | PostgreSQL function \`RETURNS trigger\` holding the body. |
| Transition table | All rows changed by the statement, readable in a statement-level trigger (PostgreSQL 10+). |

**Conclusion:** A trigger is code the database runs by itself when rows are inserted, updated or deleted, inside the same transaction, so it cannot be skipped by any client. \`BEFORE\` triggers can fix or reject the incoming row, \`AFTER\` triggers see the final row and suit audit logs and summary tables, and \`INSTEAD OF\` makes views writable; row-level triggers run per row with \`OLD\` and \`NEW\`, statement-level ones once per statement, even for zero rows. They are excellent for small, must-always-happen rules and costly when they hide logic, slow bulk writes, recurse, or depend on firing order — so keep them small, documented, and prefer constraints where a constraint can do the job.`,
    examples: [
      {
        label: `AFTER UPDATE trigger: write every real price change to an audit table`,
        code: `CREATE TRIGGER log_price_change
AFTER UPDATE OF price ON products
FOR EACH ROW
WHEN OLD.price <> NEW.price
BEGIN
  INSERT INTO price_history (product_id, old_price, new_price)
  VALUES (OLD.id, OLD.price, NEW.price);
END;

UPDATE products SET price = price + 5 WHERE id IN (1, 2);  -- two real changes
UPDATE products SET price = 180 WHERE id = 3;              -- same value: WHEN skips it
UPDATE products SET stock = stock - 1 WHERE id = 5;        -- price not in SET: never fires

SELECT h.id, p.name, h.old_price, h.new_price
FROM price_history h
JOIN products p ON p.id = h.product_id
ORDER BY h.id;`,
      },
      {
        label: `BEFORE INSERT trigger with WHEN and RAISE(IGNORE): silently skip bad rows`,
        code: `CREATE TRIGGER skip_negative_stock
BEFORE INSERT ON products
FOR EACH ROW
WHEN NEW.stock < 0
BEGIN
  SELECT RAISE(IGNORE);
END;

INSERT INTO products (id, name, price, stock) VALUES (6, 'Cable', 5, 100);
INSERT INTO products (id, name, price, stock) VALUES (7, 'Broken', 9, -3);

SELECT id, name, stock FROM products WHERE id >= 5 ORDER BY id;`,
      },
      {
        label: `PostgreSQL: a row-level trigger fires per row, a statement-level trigger once per statement`,
        code: `CREATE FUNCTION count_fires() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE trigger_log SET fires = fires + 1 WHERE level = lower(TG_LEVEL);
  RETURN NULL;  -- the return value of an AFTER trigger is ignored
END;
$$;

CREATE TRIGGER per_row AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION count_fires();
CREATE TRIGGER per_statement AFTER UPDATE ON products
  FOR EACH STATEMENT EXECUTE FUNCTION count_fires();

UPDATE products SET price = price + 1 WHERE price < 100;  -- 4 rows, 1 statement
UPDATE products SET price = price + 1 WHERE id = 99;      -- 0 rows, 1 statement

SELECT level, fires FROM trigger_log ORDER BY level;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: a BEFORE trigger rewrites the incoming row`,
        code: `CREATE FUNCTION tidy_product() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name := initcap(trim(NEW.name));   -- a BEFORE trigger may rewrite the row
  IF NEW.stock < 0 THEN
    RAISE EXCEPTION 'stock cannot be negative for %', NEW.name;
  END IF;
  RETURN NEW;                            -- returning NULL would skip the row
END;
$$;

CREATE TRIGGER tidy_before_write
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION tidy_product();

INSERT INTO products (id, name, price, stock) VALUES (6, '   usb HUB  ', 25, 12);
UPDATE products SET name = 'wireless mouse' WHERE id = 2;

SELECT id, name, price, stock FROM products WHERE id IN (2, 6) ORDER BY id;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
