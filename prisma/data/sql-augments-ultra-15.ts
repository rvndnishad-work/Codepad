/**
 * SQL ULTRA — batch 15: Indexes and query plans (covering indexes, INCLUDE and
 * Bitmap Heap Scans, Seq vs Index vs Index-Only Scan, reading EXPLAIN and EXPLAIN ANALYZE).
 * Every example was run by scripts/verify-sql-examples.ts (sql.js 1.10.2 like the
 * page, PostgreSQL 16 for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `What is a covering index?`,
    difficulty: "medium",
    seoDescription: `What a covering index is, why skipping the table lookup makes it fast, key columns vs INCLUDE, and how SQLite and PostgreSQL plans prove it.`,
    description: `**Question presented to candidate:**
"What is a covering index? Give me an example of a query that a covering index helps, and explain why it is faster than an ordinary index on the same column."

**What a strong answer should cover:**
- A covering index is not a special index type: it is an index that contains **every column a particular query needs** (filter, join, sort and select list), so the engine answers that query from the index alone and never visits the table rows
- Why it is faster: an ordinary index finds the matching keys, then does one extra lookup per row into the table; a covering index removes that lookup, which on a large table is the random I/O that dominates the cost
- How to build one: put the filter columns in the key in the right order, then add the selected columns either as trailing key columns or as non-key payload with \`INCLUDE\` (PostgreSQL 11+, SQL Server); SQLite and MySQL have no \`INCLUDE\`, so you append them to the key
- How to prove it: SQLite says \`USING COVERING INDEX\` in \`EXPLAIN QUERY PLAN\`, PostgreSQL says \`Index Only Scan\` (and \`Heap Fetches\`), MySQL says \`Using index\` in the \`Extra\` column
- Engine details: in SQLite and InnoDB the row id or primary key is stored in every secondary index, so it is covered for free; in PostgreSQL an Index Only Scan still checks the visibility map and may fetch heap pages
- Trade-offs: a wider index is bigger, slower to write and needs maintaining; cover the few hot queries, not every query

**Code / implementation expected:** Optional — an index, the query it covers, and the plan line that proves the table was not read.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  status      TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  created_at  TEXT NOT NULL,
  note        TEXT
);
INSERT INTO orders (id, customer_id, status, amount, created_at, note) VALUES
  (1, 101, 'paid',     40.00, '2025-03-01', 'gift wrap'),
  (2, 102, 'paid',     15.50, '2025-03-01', NULL),
  (3, 101, 'shipped',  99.90, '2025-03-02', 'leave at door'),
  (4, 103, 'pending',  12.00, '2025-03-03', NULL),
  (5, 104, 'paid',     60.00, '2025-03-03', NULL),
  (6, 102, 'refunded', 15.50, '2025-03-04', 'damaged'),
  (7, 101, 'paid',     25.00, '2025-03-05', NULL),
  (8, 105, 'pending',  80.00, '2025-03-06', NULL),
  (9, 103, 'paid',     45.00, '2025-03-07', NULL),
  (10, 104, 'shipped', 33.00, '2025-03-08', NULL);
CREATE INDEX orders_customer_idx ON orders (customer_id);
\`\`\``,
    answer: `**Target Audience:** Beginners who know what an index is and keep hearing "make it a covering index", plus candidates who need to prove it with a query plan.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 through sql.js 1.10.2 (the runnable examples, plans from \`EXPLAIN QUERY PLAN\`) and PostgreSQL 16.15 (the Index Only Scan example). SQL Server and MySQL are described from their documentation and were not run here.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every plan and result shown was produced by running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

A library has a card catalogue sorted by author. You want to know the *titles* of every book by one author. With an ordinary catalogue card that says only "author, shelf number", you find the right cards quickly, then walk to the shelves once per book to read its title. Twenty books, twenty walks.

Now imagine the card itself also prints the title. You find the cards, read the titles off them, and never walk to a shelf. The catalogue did not get smarter; it just **already contains everything your question needs**.

That is a covering index. The catalogue is the index, the shelves are the table, and the walks are the extra row lookups an ordinary index costs. On a table of a hundred million rows those walks are random disk reads, and removing them is often the cheapest big speed-up available. If you need the basics of what an index is first, read [What is an index and how does it speed up queries?](/interview-question/what-is-an-index-and-how-does-it-speed-up-queries).

## 2. The Core Idea: Index Lookup vs Index-Only Read

<svg class="iq-diagram" width="100%" viewBox="0 0 760 190" role="img" aria-label="Ordinary index: the index finds the row id, then the engine looks up each row in the table">
  <defs>
    <marker id="sql15q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="55" width="170" height="80" rx="10"/>
  <text class="d-text" x="105" y="88" text-anchor="middle">query</text>
  <text class="d-sub" x="105" y="112" text-anchor="middle">customer_id = 101</text>
  <rect class="d-box" x="290" y="55" width="170" height="80" rx="10"/>
  <text class="d-text" x="375" y="88" text-anchor="middle">index</text>
  <text class="d-sub" x="375" y="112" text-anchor="middle">customer_id, rowid</text>
  <rect class="d-box-muted" x="560" y="55" width="180" height="80" rx="10"/>
  <text class="d-text" x="650" y="88" text-anchor="middle">table rows</text>
  <text class="d-sub" x="650" y="112" text-anchor="middle">one lookup per match</text>
  <path class="d-edge" d="M 194 95 L 284 95" marker-end="url(#sql15q1-arrow)"/>
  <path class="d-edge-dashed" d="M 464 95 L 554 95" marker-end="url(#sql15q1-arrow)"/>
</svg>

An ordinary index on \`customer_id\` stores the key and a pointer to the row (the rowid in SQLite, a tuple id in PostgreSQL). Finding customer 101 in the index is fast, but the query also asks for \`amount\`, which is only in the table, so the engine follows the pointer for every match.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 190" role="img" aria-label="Covering index: the index already holds every needed column, so the table is skipped">
  <defs>
    <marker id="sql15q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="55" width="170" height="80" rx="10"/>
  <text class="d-text" x="105" y="88" text-anchor="middle">query</text>
  <text class="d-sub" x="105" y="112" text-anchor="middle">customer_id, amount</text>
  <rect class="d-box-accent" x="290" y="55" width="190" height="80" rx="10"/>
  <text class="d-text" x="385" y="88" text-anchor="middle">covering index</text>
  <text class="d-sub" x="385" y="112" text-anchor="middle">customer_id, amount</text>
  <rect class="d-box" x="580" y="55" width="160" height="80" rx="10"/>
  <text class="d-text" x="660" y="88" text-anchor="middle">result</text>
  <text class="d-sub" x="660" y="112" text-anchor="middle">table not read</text>
  <path class="d-edge" d="M 194 95 L 284 95" marker-end="url(#sql15q1-arrow2)"/>
  <path class="d-edge-accent" d="M 484 95 L 574 95" marker-end="url(#sql15q1-arrow2)"/>
</svg>

Put \`amount\` into the index as well, and the same query reads the index and stops there.

📌 **Interview term: covering index** — an index that contains every column a specific query references (in \`WHERE\`, \`JOIN\`, \`ORDER BY\`, \`GROUP BY\` and the select list), so the query can be answered from the index alone. It is a property of an index *for a query*, not a separate kind of index.

📌 **Interview term: table lookup** (also *bookmark lookup*, *key lookup* in SQL Server, *heap fetch* in PostgreSQL) — the extra read from index entry to table row to fetch columns the index does not have.

## 3. Watching It Happen in SQLite

The schema above has 10 orders and one index, \`orders_customer_idx\` on \`customer_id\`. \`EXPLAIN QUERY PLAN\` asks SQLite how it will run a query without running it. The first example shows the same query three times:

~~~sql
EXPLAIN QUERY PLAN
SELECT customer_id, amount FROM orders WHERE customer_id = 101;

CREATE INDEX orders_customer_amount_idx ON orders (customer_id, amount);

EXPLAIN QUERY PLAN
SELECT customer_id, amount FROM orders WHERE customer_id = 101;

EXPLAIN QUERY PLAN
SELECT customer_id, amount, note FROM orders WHERE customer_id = 101;
~~~

~~~text
id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_customer_idx (customer_id=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_customer_amount_idx (customer_id=?)

id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_customer_amount_idx (customer_id=?)
~~~

Read the \`detail\` column:

- \`SEARCH orders USING INDEX orders_customer_idx\` — the index is used to find rows, then the table is read for \`amount\`.
- \`SEARCH orders USING COVERING INDEX orders_customer_amount_idx\` — the word **COVERING** means the table is not touched at all.
- Add \`note\` and it is back to \`USING INDEX\`: the index still finds the rows, but \`note\` lives only in the table. Covering is that fragile — **one extra column in the select list breaks it**.

📌 **Interview term: EXPLAIN QUERY PLAN** — SQLite's command for showing the chosen plan. \`SCAN\` means reading a whole table or index; \`SEARCH\` means jumping to a subset through an index. PostgreSQL's equivalent is \`EXPLAIN\` ([how to read one](/interview-question/how-do-you-read-an-explain-query-plan)).

### Some queries are covered for free

~~~text
id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_customer_idx (customer_id=?)

id | parent | notused | detail
4 | 0 | 0 | SCAN orders USING COVERING INDEX orders_customer_idx

id | parent | notused | detail
2 | 0 | 0 | SCAN orders
~~~

- \`SELECT id ... WHERE customer_id = 101\` is covered by the single-column index. The \`id\` column is an \`INTEGER PRIMARY KEY\`, which in SQLite *is* the rowid, and every index entry stores the rowid to point back at the row.
- \`COUNT(*)\` scans \`orders_customer_idx\` instead of the table: it just counts entries, and the index is smaller than the table.
- A filter on \`amount\` with no index on \`amount\` is a plain \`SCAN orders\`.

📌 **Interview term: rowid / clustered key in secondary indexes** — SQLite stores the rowid in every index, and MySQL InnoDB stores the primary key in every secondary index, so the primary key is always "covered". PostgreSQL indexes store a physical tuple id (\`ctid\`) instead, which is not a column you select, so PostgreSQL gets no such freebie. See [clustered vs non-clustered indexes](/interview-question/what-is-the-difference-between-a-clustered-and-non-clustered-index).

### Order of the columns still matters

The covering index must also be *usable* for the filter. Covering with the columns in the wrong order still helps a little but loses the seek:

~~~sql
CREATE INDEX orders_amount_customer_idx ON orders (amount, customer_id);
DROP INDEX orders_customer_idx;
EXPLAIN QUERY PLAN
SELECT customer_id, amount FROM orders WHERE customer_id = 101;
~~~

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN orders USING COVERING INDEX orders_amount_customer_idx
~~~

\`SCAN ... USING COVERING INDEX\` reads every index entry (no table reads, but no jump to customer 101 either). With \`(customer_id, amount)\` it was a \`SEARCH\`. Put equality filter columns first, as explained in [why column order matters in a composite index](/interview-question/why-does-column-order-matter-in-a-composite-index). A bonus of the right order: \`(customer_id, amount)\` is already sorted by amount within a customer, so \`ORDER BY amount\` needs no sort step:

~~~text
id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_customer_amount_idx (customer_id=?)
~~~

No \`USE TEMP B-TREE FOR ORDER BY\` line appears: the index delivered the rows in order.

## 4. The Same Idea in PostgreSQL: Index Only Scan

PostgreSQL calls a covered read an **Index Only Scan**. The fourth example generates 100000 orders (20 per customer, each row padded with an 80-character note so the table is realistic in width), indexes \`(customer_id, amount)\`, runs \`VACUUM ANALYZE\`, and runs the query with \`EXPLAIN ANALYZE\`:

~~~text
QUERY PLAN
Index Only Scan using big_orders_customer_amount_idx on big_orders (actual rows=20 loops=1)
  Index Cond: (customer_id = 42)
  Heap Fetches: 0
~~~

📌 **Interview term: Index Only Scan** — PostgreSQL's plan node for answering a query from the index. \`actual rows=20\` is the 20 orders of customer 42.

📌 **Interview term: Heap Fetches** — how many times the Index Only Scan still had to read the table (the *heap*). PostgreSQL indexes do not record whether a row version is visible to your transaction, so for each entry it checks the **visibility map**, a small per-table bitmap of pages whose rows are all visible to everyone. \`Heap Fetches: 0\` means every page was marked, which is why the example runs \`VACUUM\` first: \`VACUUM\` sets those bits. The full story, including what happens after updates, is in [Covering indexes (INCLUDE) and Bitmap Heap Scans](/interview-question/covering-indexes-include-and-bitmap-heap-scans-how-do-you-eliminate-heap-fetches).

Ask for one column the index does not hold and the plan changes:

~~~sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT customer_id, amount, note FROM big_orders WHERE customer_id = 42;
~~~

~~~text
QUERY PLAN
Bitmap Heap Scan on big_orders (actual rows=20 loops=1)
  Recheck Cond: (customer_id = 42)
  Heap Blocks: exact=20
  ->  Bitmap Index Scan on big_orders_customer_amount_idx (actual rows=20 loops=1)
        Index Cond: (customer_id = 42)
~~~

The index still finds the 20 entries (\`Bitmap Index Scan\`), but \`Heap Blocks: exact=20\` shows 20 table pages read: customer 42 orders are spread across the table, one per page. That is the "one walk to the shelf per book" from the story.

## 5. Key Columns vs INCLUDE Columns

There are two ways to add the extra column:

| | Trailing key column \`(customer_id, amount)\` | Non-key payload \`(customer_id) INCLUDE (amount)\` |
| :--- | :--- | :--- |
| Supported in | Every engine | PostgreSQL 11+, SQL Server; not SQLite or MySQL |
| Sorted, usable for range filter or \`ORDER BY\` | Yes | No |
| Stored in | Every level of the B-tree | Leaf entries only |
| Part of a \`UNIQUE\` check | Yes (changes what is unique) | No (unique on the key only) |
| Needs a sort operator for the type | Yes | No |

PostgreSQL added \`INCLUDE\` in version 11, where the release notes list "covering indexes can now be created, using the INCLUDE clause" ([PostgreSQL 11 release notes](https://www.postgresql.org/docs/release/11.0/)). SQL Server documents included (non-key) columns on nonclustered indexes back to SQL Server 2005 ([Microsoft: Creating Indexes with Included Columns](https://technet.microsoft.com/library/ms189607(v=sql.90))). On PostgreSQL 16 the \`INCLUDE\` version of the index gives the same plan as the composite one:

~~~text
QUERY PLAN
Index Only Scan using big_orders_customer_incl on big_orders
  Index Cond: (customer_id = 42)
~~~

SQLite rejects the syntax:

~~~text
Error: near "INCLUDE": syntax error
~~~

So in SQLite and MySQL you append the column to the key. MySQL reports a covered read as \`Using index\` in the \`Extra\` column of \`EXPLAIN\` ([MySQL 8.0 manual: EXPLAIN output](https://dev.mysql.com/doc/refman/8.0/en/explain-output.html); not run here).

## 6. Verified: Running the Code

Examples 1 to 3 ran on sql.js 1.10.2 (SQLite 3.45.0) against the schema above, exactly as the page runs them. Example 4 ran on PostgreSQL 16.15 in a throwaway database. Output, exactly as printed:

**Example 1 — before and after the index covers the query:**

~~~text
id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_customer_idx (customer_id=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_customer_amount_idx (customer_id=?)

id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_customer_amount_idx (customer_id=?)
~~~

**Example 2 — covered for free by the rowid:**

~~~text
id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_customer_idx (customer_id=?)

id | parent | notused | detail
4 | 0 | 0 | SCAN orders USING COVERING INDEX orders_customer_idx

id | parent | notused | detail
2 | 0 | 0 | SCAN orders
~~~

**Example 3 — the covered query result:**

~~~text
customer_id | amount
101 | 25
101 | 40
101 | 99.9
~~~

**Example 4 — PostgreSQL Index Only Scan:**

~~~text
QUERY PLAN
Index Only Scan using big_orders_customer_amount_idx on big_orders (actual rows=20 loops=1)
  Index Cond: (customer_id = 42)
  Heap Fetches: 0
~~~

The planner may pick a different plan on different data or settings; check your own with \`EXPLAIN\`.

## 7. Edge Cases

- **\`SELECT *\` is never covered** unless the index contains every column, which is just a second copy of the table.
- **Expressions:** PostgreSQL 16 refuses an expression as an included column (\`INCLUDE (lower(note))\` failed here with \`ERROR:  expressions are not supported in included columns\`). Expression indexes can sometimes serve index-only scans, but check the plan rather than assuming.
- **Write-heavy columns:** 📌 **Interview term: HOT update** — in PostgreSQL, a HOT update (a new row version on the same page with no new index entries) is only possible when no indexed column changes, and \`INCLUDE\` columns count. Checked on PostgreSQL 16 with \`pg_stat_user_tables\`: 100 updates of an unindexed column were all HOT (\`n_tup_hot_upd\` 100 of 100), while 100 updates of the \`INCLUDE\` column added none.
- **MVCC engines and fresh changes:** PostgreSQL needs the visibility map; InnoDB can also fall back to the clustered index for rows changed by recent transactions. A covering index helps most on data that is read far more than it is written.

## Common Pitfalls

- **Assuming an index is covering without reading the plan.** \`USING INDEX\` (SQLite) or \`Index Scan\` (PostgreSQL) is not covered; look for \`COVERING INDEX\` or \`Index Only Scan\`.
- **Adding one column to the select list later** and silently losing the covered plan. Hot covered queries deserve a comment or a plan regression test.
- **Putting the payload column first.** \`(amount, customer_id)\` still covers, but it scans the whole index instead of seeking to the customer.
- **Covering every query.** Each wide index costs disk, cache and write time; five overlapping covering indexes on one table usually means one or two good ones were enough.
- **Forgetting \`VACUUM\` in PostgreSQL** and wondering why an Index Only Scan has thousands of \`Heap Fetches\`.
- **Using \`INCLUDE\` where a sort is needed.** An included column cannot satisfy \`ORDER BY amount\` or a range filter on \`amount\`; that needs a key column.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">covering index</strong> is an index that holds every column one query needs, in its filter, join, sort and select list. The engine answers the query from the index alone and never touches the table rows.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is faster:</strong> <span style="color:#f0e2c8;">An ordinary index finds matching keys, then does <strong style="color:#ffca28;">one table lookup per row</strong> to fetch the other columns. On a big table those lookups are random reads and dominate the cost. Covering removes them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How to build it:</strong> <span style="color:#f0e2c8;">Filter columns go first in the key, in the order the query uses them; the selected columns go after them, either as extra key columns or, in PostgreSQL 11+ and SQL Server, as non-key payload with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INCLUDE (amount)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. How to prove it:</strong> <span style="color:#f0e2c8;">Read the plan: SQLite prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">USING COVERING INDEX</code>, PostgreSQL prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Index Only Scan</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Heap Fetches: 0</code>, MySQL prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Using index</code> in Extra. Add one more column to the select list and it falls back to a normal index lookup.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The cost:</strong> <span style="color:#f0e2c8;">A covering index is a bigger index: more disk, more memory, slower writes. I cover the few hot, narrow queries that run thousands of times, and I do not stuff wide or frequently updated columns into it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a covering index a different kind of index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is an ordinary B-tree; <strong style="color:#ffca28;">covering</strong> describes the relationship between one index and one query. The same index covers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT customer_id, amount</code> and does not cover <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT note</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">SELECT id</code> use a covering index in SQLite without you adding id?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every SQLite index entry stores the <strong style="color:#ffca28;">rowid</strong>, and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INTEGER PRIMARY KEY</code> is the rowid. InnoDB does the same with the primary key in every secondary index. So the key column plus the primary key are always covered.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between adding a key column and using INCLUDE?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A key column is sorted and searchable, so it can serve a range filter or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code>. An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INCLUDE</code> column is only stored in the leaf entries: it cannot be searched, does not need a sort operator, and does not count towards key size limits. See the [INCLUDE deep dive](/interview-question/covering-indexes-include-and-bitmap-heap-scans-how-do-you-eliminate-heap-fetches).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">PostgreSQL says Index Only Scan but still reads the table. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL indexes do not store row visibility. The <strong style="color:#ffca28;">visibility map</strong> marks pages where every row is visible to everyone; for other pages it must fetch the heap row, which shows up as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Heap Fetches</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VACUUM</code> sets the map, so a recently changed table gets fewer real index-only reads.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not add a covering index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the query is rare, the extra columns are wide (long text, JSON), the table is write heavy, or another index already nearly covers it. Every index is maintained on every insert and on updates of its columns.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Covering index | An index holding every column one query needs, so the table is not read |
| Table lookup / heap fetch | The extra read from an index entry to its table row |
| EXPLAIN QUERY PLAN | SQLite command that shows the chosen plan (\`SCAN\`, \`SEARCH\`, \`COVERING INDEX\`) |
| Rowid in secondary indexes | SQLite (rowid) and InnoDB (primary key) store the row key in every index entry |
| Index Only Scan | PostgreSQL plan node that reads only the index |
| Heap Fetches | Rows an Index Only Scan still had to check in the table |
| HOT update | PostgreSQL update that adds no index entries; impossible when an indexed or included column changes |
| Visibility map | PostgreSQL bitmap of all-visible pages that lets index-only scans skip the heap |
| INCLUDE column | A non-key column stored only in index leaf entries (PostgreSQL 11+, SQL Server) |

**Conclusion:** A covering index is just an index that happens to contain every column a query touches, which lets the engine skip the per-row table lookup that makes ordinary index reads expensive. Build it with the filter columns first and the selected columns after them (as key columns, or with \`INCLUDE\` where the engine supports it), prove it with the plan (\`USING COVERING INDEX\`, \`Index Only Scan\` with low \`Heap Fetches\`, \`Using index\`), and spend it only on hot, narrow queries, because every extra column makes the index bigger and every write slower.`,
    examples: [
      {
        label: `SQLite: the same query before and after the index covers it`,
        code: `-- only orders_customer_idx exists: it finds the rows, then reads the table for amount
EXPLAIN QUERY PLAN
SELECT customer_id, amount FROM orders WHERE customer_id = 101;

-- add amount to the index key
CREATE INDEX orders_customer_amount_idx ON orders (customer_id, amount);

-- now every column the query needs is in the index
EXPLAIN QUERY PLAN
SELECT customer_id, amount FROM orders WHERE customer_id = 101;

-- ask for one more column (note) and the index stops covering
EXPLAIN QUERY PLAN
SELECT customer_id, amount, note FROM orders WHERE customer_id = 101;`,
      },
      {
        label: `SQLite: the row id is in every index, so some queries are covered for free`,
        code: `-- id is the INTEGER PRIMARY KEY (the rowid), stored in every index entry
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE customer_id = 101;

-- COUNT(*) only needs to count entries: the smaller index is read instead of the table
EXPLAIN QUERY PLAN SELECT COUNT(*) FROM orders;

-- a filter on a column that no index holds still scans the table
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE amount > 50;`,
      },
      {
        label: `SQLite: the covered query returns the normal result`,
        code: `CREATE INDEX orders_customer_amount_idx ON orders (customer_id, amount);

SELECT customer_id, amount
FROM orders
WHERE customer_id = 101
ORDER BY amount;`,
      },
      {
        label: `PostgreSQL: Index Only Scan with Heap Fetches: 0 on 100000 rows`,
        code: `-- 100000 generated orders: 5000 customers with 20 orders each
CREATE TABLE big_orders WITH (autovacuum_enabled = false) AS
SELECT g AS id,
       g % 5000 AS customer_id,
       (g % 997) + 0.5 AS amount,
       repeat('x', 80) AS note
FROM generate_series(1, 100000) AS g;
CREATE INDEX big_orders_customer_amount_idx ON big_orders (customer_id, amount);
VACUUM ANALYZE big_orders;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT customer_id, amount FROM big_orders WHERE customer_id = 42;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `Covering indexes (INCLUDE) and Bitmap Heap Scans — how do you eliminate heap fetches in 2025?`,
    difficulty: "medium",
    seoDescription: `How Bitmap Heap Scans work, why they can still read the whole table, and how INCLUDE indexes plus VACUUM give Index Only Scans with zero heap fetches.`,
    description: `**Question presented to candidate:**
"Your query uses an index but still shows a Bitmap Heap Scan reading thousands of table pages. How would you use a covering index with INCLUDE to get rid of those heap fetches, and what has to be true for PostgreSQL to actually skip the table?"

**What a strong answer should cover:**
- What a Bitmap Heap Scan is: a Bitmap Index Scan collects matching row locations, sorts them by page, then the heap is read page by page; it sits between an Index Scan and a Seq Scan, can combine indexes with BitmapAnd / BitmapOr, and goes **lossy** (page-level, with \`Rows Removed by Index Recheck\`) when the bitmap exceeds \`work_mem\`
- Why it can be slow: a few percent of rows scattered across the table can touch nearly every page, so the "index" plan reads most of the table anyway
- The fix: a covering index such as \`CREATE INDEX ... (score) INCLUDE (id)\` (PostgreSQL 11+) so the planner can choose an **Index Only Scan**; \`INCLUDE\` columns ride in the leaf entries, are not searchable or sorted, and do not change what a \`UNIQUE\` index enforces
- The catch: Index Only Scans depend on the **visibility map**; until \`VACUUM\` marks pages all-visible the planner may not even choose one, and recently updated pages show up as \`Heap Fetches\`; tune autovacuum on hot tables
- Costs: \`INCLUDE\` indexes are never deduplicated and are bigger, updates of an included column cannot be HOT; check \`Heap Fetches\` and \`Buffers\` with \`EXPLAIN (ANALYZE, BUFFERS)\` before and after

**Clarifying questions expected:**
- Which columns does the query select, filter and sort on, and how many rows does it return?
- How write-heavy is the table, and is autovacuum keeping up (when was it last vacuumed)?
- Which PostgreSQL version (INCLUDE needs 11+)?

**Code / implementation expected:** Yes — the plan before, the INCLUDE index, the plan after with \`Heap Fetches\`, and how VACUUM changes it.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  status      TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  created_at  TEXT NOT NULL,
  note        TEXT
);
INSERT INTO orders (id, customer_id, status, amount, created_at, note) VALUES
  (1, 101, 'paid',     40.00, '2025-03-01', 'gift wrap'),
  (2, 102, 'paid',     15.50, '2025-03-01', NULL),
  (3, 101, 'shipped',  99.90, '2025-03-02', 'leave at door'),
  (4, 103, 'pending',  12.00, '2025-03-03', NULL),
  (5, 104, 'paid',     60.00, '2025-03-03', NULL),
  (6, 102, 'refunded', 15.50, '2025-03-04', 'damaged'),
  (7, 101, 'paid',     25.00, '2025-03-05', NULL),
  (8, 105, 'pending',  80.00, '2025-03-06', NULL),
  (9, 103, 'paid',     45.00, '2025-03-07', NULL),
  (10, 104, 'shipped', 33.00, '2025-03-08', NULL);
CREATE INDEX orders_customer_idx ON orders (customer_id);
\`\`\``,
    answer: `**Target Audience:** Developers who already know [what a covering index is](/interview-question/what-is-a-covering-index) and now face a real PostgreSQL plan with a Bitmap Heap Scan they want gone.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 for every plan here (100000 generated rows per example, run in a throwaway database), and SQLite 3.45.0 through sql.js 1.10.2 for the runnable example. Version facts for PostgreSQL 11 and 18 are cited from the release notes.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every plan shown was produced by running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

A warehouse picker gets a list of 5000 parcels to collect. A clever picker first sorts the list by aisle, then walks the aisles once in order instead of zig-zagging. That is much better than one trip per parcel. But if the 5000 parcels are spread over almost every aisle, the "clever" walk still visits the whole warehouse.

Now suppose the picker only needs each parcel *label number*, and the list already prints it. No walk at all.

The sorted walk is PostgreSQL's **Bitmap Heap Scan**. The printed list is a **covering index**. And the twist in PostgreSQL is a rule that the picker must still check a "has anything moved in this aisle?" board before trusting the list: the **visibility map**. This question is about all three.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which columns does the query select, filter and sort on? | Decides the key columns and the \`INCLUDE\` columns |
| How many rows does it return, and how scattered are they? | Few rows on few pages: a plain Index Scan is fine; many scattered rows: the heap visit is the cost |
| How often are those rows updated? | Updates clear visibility map bits and bring heap fetches back |
| Is autovacuum keeping up? Any long transactions? | An Index Only Scan is only as good as the visibility map |
| Which PostgreSQL version? | \`INCLUDE\` needs PostgreSQL 11 or later |

## 3. The Bitmap Heap Scan, Explained

<svg class="iq-diagram" width="100%" viewBox="0 0 780 200" role="img" aria-label="Bitmap Heap Scan: index entries become a bitmap of pages, then the pages are read in physical order">
  <defs>
    <marker id="sql15q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="115" y="93" text-anchor="middle">Bitmap Index Scan</text>
  <text class="d-sub" x="115" y="117" text-anchor="middle">matching row ids</text>
  <rect class="d-box-accent" x="295" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="390" y="93" text-anchor="middle">bitmap of pages</text>
  <text class="d-sub" x="390" y="117" text-anchor="middle">sorted by page number</text>
  <rect class="d-box-muted" x="570" y="60" width="190" height="80" rx="10"/>
  <text class="d-text" x="665" y="93" text-anchor="middle">Bitmap Heap Scan</text>
  <text class="d-sub" x="665" y="117" text-anchor="middle">each page read once</text>
  <path class="d-edge" d="M 214 100 L 289 100" marker-end="url(#sql15q2-arrow)"/>
  <path class="d-edge" d="M 489 100 L 564 100" marker-end="url(#sql15q2-arrow)"/>
</svg>

📌 **Interview term: Bitmap Index Scan** — reads the index and records the location of every matching row in an in-memory bitmap, without touching the table.

📌 **Interview term: Bitmap Heap Scan** — takes that bitmap, which is ordered by page number, and reads each needed table page once, in physical order. It turns many random reads into one forward pass. It sits between an Index Scan (one heap read per row, in index order) and a Seq Scan (every page).

📌 **Interview term: heap** — PostgreSQL's name for the table storage itself, as opposed to its indexes.

The second example asks for \`id, score\` where \`score < 5000\`. That is 5000 of 100000 rows (5%), and \`score\` is scattered across the table:

~~~text
QUERY PLAN
Bitmap Heap Scan on big_orders (actual rows=5000 loops=1)
  Recheck Cond: (score < 5000)
  Heap Blocks: exact=1539
  Buffers: shared hit=1539 read=15
  ->  Bitmap Index Scan on big_orders_score_idx (actual rows=5000 loops=1)
        Index Cond: (score < 5000)
        Buffers: shared read=15
Planning:
  Buffers: shared hit=9
~~~

How to read it:

- \`actual rows=5000\` — 5% of the table matched.
- \`Heap Blocks: exact=1539\` — those rows sat on 1539 different table pages. The table stores its rows on 1539 pages (counted with the \`pg_visibility\` extension in section 5), so the index plan read **every page of the table**.
- \`Buffers: shared hit=1539 read=15\` — 1554 page visits in total: the 1539 heap pages plus the 15 index pages read by the Bitmap Index Scan (\`shared read=15\`). See [how to read Buffers](/interview-question/how-do-you-read-explain-analyze-cost-actual-time-rows-and-buffers).
- \`Recheck Cond\` — the condition the heap scan re-applies to rows on each page; it matters when the bitmap is lossy (next).

### Lossy bitmaps

If the bitmap does not fit in \`work_mem\`, PostgreSQL degrades part of it to "some row on this page matches" and rechecks every row on those pages:

~~~sql
SET work_mem = '64kB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, note FROM big_orders WHERE score < 5000;
~~~

~~~text
QUERY PLAN
Bitmap Heap Scan on big_orders (actual rows=5000 loops=1)
  Recheck Cond: (score < 5000)
  Rows Removed by Index Recheck: 32114
  Heap Blocks: exact=1018 lossy=521
  ->  Bitmap Index Scan on big_orders_score_idx (actual rows=5000 loops=1)
        Index Cond: (score < 5000)
~~~

📌 **Interview term: lossy heap block** — a page the bitmap tracks only as a whole page. \`Rows Removed by Index Recheck: 32114\` is the price: rows read and thrown away because their page was lossy. The fix is more \`work_mem\` for that query, or a more selective plan.

### Combining indexes: BitmapOr and BitmapAnd

Bitmaps are also how PostgreSQL uses **two indexes for one query**. An \`OR\` of two indexed conditions:

~~~text
QUERY PLAN
Bitmap Heap Scan on big_orders (actual rows=120 loops=1)
  Recheck Cond: ((customer_id = 42) OR (score < 100))
  Heap Blocks: exact=119
  ->  BitmapOr (actual rows=0 loops=1)
        ->  Bitmap Index Scan on big_orders_customer_idx (actual rows=20 loops=1)
              Index Cond: (customer_id = 42)
        ->  Bitmap Index Scan on big_orders_score_idx (actual rows=100 loops=1)
              Index Cond: (score < 100)
~~~

📌 **Interview term: BitmapOr / BitmapAnd** — merge the bitmaps of several Bitmap Index Scans (union for \`OR\`, intersection for \`AND\`) before visiting the heap. A BitmapOr node prints \`actual rows=0\` because it passes a bitmap, not rows.

## 4. Eliminating the Heap Visit: INCLUDE

The query selects \`id\` and filters on \`score\`. Give the index both, with \`score\` as the searchable key and \`id\` as payload:

~~~sql
CREATE INDEX big_orders_score_incl ON big_orders (score) INCLUDE (id);
VACUUM ANALYZE big_orders;
~~~

The third example:

~~~text
QUERY PLAN
Index Only Scan using big_orders_score_incl on big_orders (actual rows=5000 loops=1)
  Index Cond: (score < 5000)
  Heap Fetches: 0
  Buffers: shared hit=1 read=15
Planning:
  Buffers: shared hit=10
~~~

- \`Index Only Scan\` — the table is not read for row data.
- \`Heap Fetches: 0\` — not a single heap page was needed for visibility either.
- \`Buffers: shared hit=1 read=15\` — **16 page visits instead of 1554**. Same rows, same result.

📌 **Interview term: INCLUDE (non-key) column** — a column stored only in the leaf entries of a B-tree. It cannot be searched or sorted on, but it can be returned by an Index Only Scan. PostgreSQL 11 introduced it: "covering indexes can now be created, using the INCLUDE clause" ([PostgreSQL 11 release notes](https://www.postgresql.org/docs/release/11.0/)). At launch only B-tree supported it; check the \`CREATE INDEX\` page of your version for others.

### Key column vs INCLUDE, measured

Both \`(customer_id, score)\` and \`(customer_id) INCLUDE (score)\` cover a query on customer. What do they cost? Four indexes on the same 100000 rows:

~~~text
index_name | size
idx_plain | 776 kB
idx_two_keys | 2208 kB
idx_include | 2224 kB
idx_plain_nodedup | 2224 kB
~~~

The plain single-column index is the smallest because PostgreSQL 13+ B-trees **deduplicate** repeated keys (each \`customer_id\` appears 20 times); building it with \`deduplicate_items = off\` makes it 2.9 times bigger (2224 kB vs 776 kB), the same size as the \`INCLUDE\` index. The PostgreSQL documentation states that deduplication is never used with indexes that have a non-key column ([PostgreSQL docs: B-Tree implementation](https://www.postgresql.org/docs/13/btree-implementation.html)), so \`INCLUDE\` loses that saving: the payload costs real space.

\`INCLUDE\` also does not change what a \`UNIQUE\` index enforces. The key alone is unique:

~~~sql
CREATE UNIQUE INDEX orders_day_uniq ON orders (created_at) INCLUDE (customer_id);
~~~

~~~text
ERROR:  could not create unique index "orders_day_uniq"
DETAIL:  Key (created_at)=(2025-03-01) is duplicated.
~~~

That is the classic use: keep a \`UNIQUE\` constraint on \`email\` and still cover \`SELECT name WHERE email = ...\` with \`INCLUDE (name)\`.

## 5. The Visibility Map: Why VACUUM Decides Everything

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="Index Only Scan: for each index entry check the visibility map; all-visible pages return from the index, other pages need a heap fetch">
  <defs>
    <marker id="sql15q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="110" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="143" text-anchor="middle">index entry</text>
  <text class="d-sub" x="110" y="167" text-anchor="middle">key plus INCLUDE</text>
  <rect class="d-box-accent" x="290" y="110" width="200" height="80" rx="10"/>
  <text class="d-text" x="390" y="143" text-anchor="middle">visibility map</text>
  <text class="d-sub" x="390" y="167" text-anchor="middle">page all-visible?</text>
  <rect class="d-box" x="580" y="20" width="180" height="80" rx="10"/>
  <text class="d-text" x="670" y="53" text-anchor="middle">yes</text>
  <text class="d-sub" x="670" y="77" text-anchor="middle">answer from index</text>
  <rect class="d-box-muted" x="580" y="200" width="180" height="80" rx="10"/>
  <text class="d-text" x="670" y="233" text-anchor="middle">no</text>
  <text class="d-sub" x="670" y="257" text-anchor="middle">heap fetch</text>
  <path class="d-edge" d="M 204 150 L 284 150" marker-end="url(#sql15q2-arrow2)"/>
  <path class="d-edge-accent" d="M 494 135 L 574 70" marker-end="url(#sql15q2-arrow2)"/>
  <path class="d-edge-dashed" d="M 494 165 L 574 230" marker-end="url(#sql15q2-arrow2)"/>
</svg>

📌 **Interview term: visibility map** — a tiny bitmap per table, with bits per heap page, including one that means "every row on this page is visible to every transaction". \`VACUUM\` sets the bit; any insert, update or delete on the page clears it.

PostgreSQL indexes do not store whether an entry's row version is visible to your snapshot (that is MVCC: old and new versions coexist). So for every entry an Index Only Scan reads, it checks the page bit: set means the index value can be returned directly; clear means a **heap fetch** to check the row.

**Before any VACUUM**, the same covering index did not even get chosen. With only \`ANALYZE\` run:

~~~text
QUERY PLAN
Bitmap Heap Scan on big_orders (actual rows=5000 loops=1)
  Recheck Cond: (score < 5000)
  Heap Blocks: exact=1539
  ->  Bitmap Index Scan on big_orders_score_incl (actual rows=5000 loops=1)
        Index Cond: (score < 5000)
~~~

The planner knows the map is empty (\`relallvisible = 0\`), so it expects an Index Only Scan to visit the heap anyway and prefers the bitmap. Bulk-loaded tables are exactly this case until (auto)vacuum runs. The examples create the table with \`autovacuum_enabled = false\` so the background worker cannot change this mid-demo.

**After updates**, the fourth example vacuums, then updates 500 of the matching rows:

~~~text
QUERY PLAN
Index Only Scan using big_orders_score_incl on big_orders (actual rows=5000 loops=1)
  Index Cond: (score < 5000)
  Heap Fetches: 1583
~~~

\`Heap Fetches: 1583\` for 500 updated rows. The visibility map works per **page**, so one updated row makes every matching entry on its page need a heap check. Counting pages with the \`pg_visibility\` extension (part of the PostgreSQL contrib modules) and the page number inside each row \`ctid\`:

~~~text
step | all_visible_pages | pages_with_rows
after VACUUM | 1539 | 1539
after 500 updates | 1062 | 1539
~~~

The 500 updates landed on 477 pages and cleared their all-visible bit. Each page holds about 3 of the 5000 matching rows, so roughly 477 x 3.3 entries now need a heap check: that is where 1583 comes from. The planner still chose the Index Only Scan because two thirds of the pages are still marked. Run \`VACUUM\` again and the fetches go back to zero:

~~~text
QUERY PLAN
Index Only Scan using big_orders_score_incl on big_orders (actual rows=5000 loops=1)
  Index Cond: (score < 5000)
  Heap Fetches: 0
~~~

📌 **Interview term: Heap Fetches** — the number of index entries for which an Index Only Scan had to visit the heap. It is the number to watch: an "Index Only Scan" with Heap Fetches close to \`actual rows\` is an Index Scan in disguise.

### Keeping it at zero in production

- Autovacuum triggers on a fraction of changed rows (\`autovacuum_vacuum_scale_factor\`, 0.2 on this PostgreSQL 16 server, i.e. 20% of the table), which on a large table is a long wait. Lower it per table: \`ALTER TABLE big_orders SET (autovacuum_vacuum_scale_factor = 0.01);\`.
- Insert-only tables also need vacuum to set the bits; PostgreSQL 13 added insert-triggered autovacuum, \`autovacuum_vacuum_insert_threshold\` (default 1000) and \`autovacuum_vacuum_insert_scale_factor\` (default 0.2) ([PostgreSQL 13 release notes](https://www.postgresql.org/docs/release/13.0)); the defaults shown are what PostgreSQL 16 reports here.
- A long-running transaction (or an abandoned replication slot) holds back the cleanup horizon, so vacuum cannot mark pages all-visible. Check \`pg_stat_activity\` for old \`xact_start\` values.

## 6. Bitmap vs Index Only Scan, Side by Side

| | Bitmap Heap Scan (no covering index) | Index Only Scan (covering + vacuumed) |
| :--- | :--- | :--- |
| Index read | Bitmap Index Scan, all matches | Index entries in key order |
| Heap read | Every page with a match (1539 here) | Only pages not all-visible (0 here) |
| Page visits for 5000 rows | 1554 | 16 |
| Output order | Physical order, not index order | Index key order, so it can satisfy \`ORDER BY\` |
| Combines several indexes | Yes (BitmapAnd / BitmapOr) | No, one index |
| Sensitive to | \`work_mem\` (lossy), physical scatter | Visibility map freshness, index width |

## 7. In 2025 and Later

The title says "in 2025". What changed recently, from the official release notes (not run here, since this machine runs PostgreSQL 16):

- **PostgreSQL 18** (released 2025-09-25) adds **skip scan** for multicolumn B-tree indexes, so an index can be used in more cases where the query has no \`=\` condition on the leading column ([PostgreSQL 18 release notes](https://www.postgresql.org/docs/release/18/)). That makes multicolumn covering indexes more reusable, but it does not remove the visibility map rule.
- PostgreSQL 18 also turns \`BUFFERS\` on by default for \`EXPLAIN ANALYZE\` ([depesz: Enable BUFFERS with EXPLAIN ANALYZE by default](https://www.depesz.com/2025/01/15/waiting-for-postgresql-18-enable-buffers-with-explain-analyze-by-default/)), which makes heap visits easier to spot.

The core technique is the same as since PostgreSQL 11: cover the hot query, keep vacuum healthy, and read \`Heap Fetches\`.

## 8. SQLite: No INCLUDE, Same Idea

SQLite has no \`INCLUDE\` (it rejects the syntax; see [What is a covering index?](/interview-question/what-is-a-covering-index)), and no bitmap scans or visibility map. You append the payload to the key. The first example puts the equality column first, the sort column second and the payload last:

~~~text
id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_status_cust_amount_idx (status=?)

customer_id | amount
101 | 25
101 | 40
102 | 15.5
103 | 45
104 | 60
~~~

\`USING COVERING INDEX\` with no \`USE TEMP B-TREE FOR ORDER BY\` line: no table reads and no sort.

## 9. Verified: Running the Code

Example 1 ran on sql.js 1.10.2 (SQLite 3.45.0) on the schema above; examples 2 to 4 ran on PostgreSQL 16.15, each in a fresh throwaway database seeded with the same schema. The generated tables are deterministic (\`generate_series\`), and these outputs were identical across repeated runs.

**Example 1 — SQLite covering index without INCLUDE:**

~~~text
id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_status_cust_amount_idx (status=?)

customer_id | amount
101 | 25
101 | 40
102 | 15.5
103 | 45
104 | 60
~~~

**Example 2 — Bitmap Heap Scan without a covering index:**

~~~text
QUERY PLAN
Bitmap Heap Scan on big_orders (actual rows=5000 loops=1)
  Recheck Cond: (score < 5000)
  Heap Blocks: exact=1539
  Buffers: shared hit=1539 read=15
  ->  Bitmap Index Scan on big_orders_score_idx (actual rows=5000 loops=1)
        Index Cond: (score < 5000)
        Buffers: shared read=15
Planning:
  Buffers: shared hit=9
~~~

**Example 3 — INCLUDE index, vacuumed:**

~~~text
QUERY PLAN
Index Only Scan using big_orders_score_incl on big_orders (actual rows=5000 loops=1)
  Index Cond: (score < 5000)
  Heap Fetches: 0
  Buffers: shared hit=1 read=15
Planning:
  Buffers: shared hit=10
~~~

**Example 4 — after 500 updates:**

~~~text
QUERY PLAN
Index Only Scan using big_orders_score_incl on big_orders (actual rows=5000 loops=1)
  Index Cond: (score < 5000)
  Heap Fetches: 1583
~~~

The planner may choose differently on other data, hardware settings or versions; verify on yours.

## Common Pitfalls

- **Celebrating \`Index Only Scan\` without reading \`Heap Fetches\`.** If fetches are near \`actual rows\`, the heap is still being read.
- **Benchmarking right after a bulk load.** Until \`VACUUM\`, the planner will not trust the covering index (section 5 showed it choosing a bitmap).
- **Including wide or hot columns.** A \`text\` payload bloats the index; an updated included column blocks HOT updates and adds index writes.
- **Expecting an \`INCLUDE\` column to help a filter or \`ORDER BY\`.** Only key columns are searchable and sorted.
- **Ignoring \`lossy\` heap blocks.** \`Rows Removed by Index Recheck\` in the tens of thousands means the query needs more \`work_mem\`.
- **Assuming the index helps because it is used.** A Bitmap Heap Scan with \`Heap Blocks\` close to \`relpages\` reads the whole table in a roundabout way.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The symptom:</strong> <span style="color:#f0e2c8;">A query uses an index, yet the plan is a <strong style="color:#ffca28;">Bitmap Heap Scan</strong> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Heap Blocks: exact=1539</code> on a table whose rows fill 1539 pages. The index found 5% of the rows, but they are scattered, so almost every table page is read anyway.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The fix:</strong> <span style="color:#f0e2c8;">Make the index cover the query: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE INDEX ... ON big_orders (score) INCLUDE (id)</code>. The key stays the searchable column; the selected column rides along in the leaf entries. The planner can now pick an <strong style="color:#ffca28;">Index Only Scan</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The catch:</strong> <span style="color:#f0e2c8;">PostgreSQL indexes do not store visibility, so an Index Only Scan checks the <strong style="color:#ffca28;">visibility map</strong>. Before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VACUUM</code> the planner did not even choose it; after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VACUUM</code> it showed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Heap Fetches: 0</code>; after updating 500 of the 5000 rows it showed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Heap Fetches: 1583</code>, because visibility is tracked per page, not per row.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Operations:</strong> <span style="color:#f0e2c8;">So the covering index only works as well as vacuum does. On hot tables I lower <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">autovacuum_vacuum_scale_factor</code> or set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">autovacuum_vacuum_insert_scale_factor</code>, and I watch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Heap Fetches</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Buffers</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN (ANALYZE, BUFFERS)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-offs:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INCLUDE</code> indexes are bigger (no B-tree deduplication), updating an included column is never a <strong style="color:#ffca28;">HOT</strong> update, and the included column cannot serve a filter or sort. I include only small, rarely updated columns that a hot query selects.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does PostgreSQL choose a Bitmap Heap Scan over an Index Scan?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the estimated matches are too many for one random heap read per row but too few for a full Seq Scan, or when it needs to combine indexes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BitmapAnd</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BitmapOr</code>. Sorting row ids by page turns random reads into one ordered pass. The thresholds are in the [scan-choice deep dive](/interview-question/seq-scan-vs-index-scan-vs-index-only-scan-when-does-postgres-choose-each).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lossy</code> in Heap Blocks mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The bitmap outgrew <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">work_mem</code>, so some pages are remembered only as "something on this page matches". Every row on a lossy page is rechecked against the condition, shown as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Rows Removed by Index Recheck</code>. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">work_mem = 64kB</code> the same query went from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exact=1539</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exact=1018 lossy=521</code>, and rechecked away 32114 rows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just add the column as a second key column?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That also covers the query, and is the only option in SQLite and MySQL. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INCLUDE</code> keeps the upper B-tree levels small, needs no sort operator for the type, and keeps a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE</code> index unique on the key alone: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE (created_at) INCLUDE (customer_id)</code> still rejects two orders on the same day.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The plan says Index Only Scan but Heap Fetches is in the thousands. What now?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The visibility map is stale. Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">relallvisible</code> against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">relpages</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_class</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last_autovacuum</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_stat_user_tables</code>; run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VACUUM</code> and make autovacuum more aggressive for that table. Long-running transactions can also stop vacuum from marking pages.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did 500 updated rows cause 1583 heap fetches?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Visibility is tracked per heap <strong style="color:#ffca28;">page</strong>. Each update clears the all-visible bit of its page. Here 500 updates cleared 477 pages, and every matching index entry pointing into those pages (about 3 per page) needs a heap check until the next vacuum, so fetches grew three times faster than updated rows.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Heap | PostgreSQL table storage, as opposed to indexes |
| Bitmap Index Scan | Index read that collects matching row locations into a bitmap |
| Bitmap Heap Scan | Reads the pages in that bitmap once each, in physical order |
| Lossy heap block | A page tracked only as a whole page because the bitmap outgrew \`work_mem\` |
| BitmapOr / BitmapAnd | Union / intersection of several index bitmaps |
| INCLUDE column | Non-key payload stored in B-tree leaf entries (PostgreSQL 11+) |
| Visibility map | Per-page bits marking pages whose rows are visible to all transactions |
| Heap Fetches | Index entries for which an Index Only Scan still visited the heap |

**Conclusion:** A Bitmap Heap Scan is PostgreSQL being clever about reading many scattered rows, but when a few percent of rows land on nearly every page it still reads most of the table. A covering index with \`INCLUDE\` lets the planner answer from the index instead, and in this test cut 1554 page visits to 16, but only because \`VACUUM\` had marked the pages all-visible: before vacuum the planner ignored the index, and after 500 updates it paid 1583 heap fetches. So the full answer is the index plus the maintenance: include only small, stable columns, keep autovacuum aggressive on that table, and judge the result by \`Heap Fetches\` and \`Buffers\`, not by the plan node name.`,
    examples: [
      {
        label: `SQLite has no INCLUDE: append the selected column to the key instead`,
        code: `-- equality column first, then the sort column, then the payload
CREATE INDEX orders_status_cust_amount_idx ON orders (status, customer_id, amount);

-- COVERING INDEX and no TEMP B-TREE: no table reads and no sort step
EXPLAIN QUERY PLAN
SELECT customer_id, amount FROM orders WHERE status = 'paid' ORDER BY customer_id;

SELECT customer_id, amount FROM orders WHERE status = 'paid' ORDER BY customer_id, amount;`,
      },
      {
        label: `PostgreSQL: 5% of the rows, but the Bitmap Heap Scan touches almost every page`,
        code: `-- 100000 generated orders; score is scattered across the whole table
CREATE TABLE big_orders WITH (autovacuum_enabled = false) AS
SELECT g AS id,
       g % 5000 AS customer_id,
       (g * 7919) % 100000 AS score,
       repeat('x', 80) AS note
FROM generate_series(1, 100000) AS g;
CREATE INDEX big_orders_score_idx ON big_orders (score);
VACUUM ANALYZE big_orders;

EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, score FROM big_orders WHERE score < 5000;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: an INCLUDE index plus VACUUM gives an Index Only Scan with 0 heap fetches`,
        code: `-- 100000 generated orders; score is scattered across the whole table
CREATE TABLE big_orders WITH (autovacuum_enabled = false) AS
SELECT g AS id,
       g % 5000 AS customer_id,
       (g * 7919) % 100000 AS score,
       repeat('x', 80) AS note
FROM generate_series(1, 100000) AS g;
CREATE INDEX big_orders_score_idx ON big_orders (score);
CREATE INDEX big_orders_score_incl ON big_orders (score) INCLUDE (id);
VACUUM ANALYZE big_orders;

EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, score FROM big_orders WHERE score < 5000;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: updates clear visibility map bits and heap fetches come back`,
        code: `-- 100000 generated orders; score is scattered across the whole table
CREATE TABLE big_orders WITH (autovacuum_enabled = false) AS
SELECT g AS id,
       g % 5000 AS customer_id,
       (g * 7919) % 100000 AS score,
       repeat('x', 80) AS note
FROM generate_series(1, 100000) AS g;
CREATE INDEX big_orders_score_idx ON big_orders (score);
CREATE INDEX big_orders_score_incl ON big_orders (score) INCLUDE (id);
VACUUM ANALYZE big_orders;

-- touch 500 of the matching rows (note is not indexed)
UPDATE big_orders SET note = 'changed' WHERE score < 5000 AND id % 10 = 0;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, score FROM big_orders WHERE score < 5000;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `Seq Scan vs Index Scan vs Index-Only Scan — when does Postgres choose each?`,
    difficulty: "medium",
    seoDescription: `How the PostgreSQL planner chooses Seq Scan, Index Scan, Bitmap Heap Scan or Index Only Scan, with measured switch points and the knobs that move them.`,
    description: `**Question presented to candidate:**
"You add an index, but EXPLAIN still shows a Seq Scan. Another query on the same column gets a Bitmap Heap Scan, and a third gets an Index Only Scan. How does PostgreSQL decide between a Seq Scan, an Index Scan, a Bitmap Heap Scan and an Index-Only Scan?"

**What a strong answer should cover:**
- The planner is cost-based: it estimates how many rows match (selectivity, from \`ANALYZE\` statistics) and prices each access path in page reads and CPU, then picks the cheapest; an index is a choice, never a rule
- What each scan does and when it wins: Seq Scan (read every page in order; wins for large fractions or tiny tables), Index Scan (walk the index, one heap visit per row; wins for very few rows, or for \`ORDER BY ... LIMIT\`), Bitmap Heap Scan (collect matches, read pages in physical order; the middle ground), Index Only Scan (all needed columns in the index and pages all-visible)
- The knobs in the cost model: \`random_page_cost\` (default 4) vs \`seq_page_cost\` (1), \`effective_cache_size\`, and the column **correlation** between index order and physical order, which can keep an Index Scan cheap up to a large fraction
- Reasons an index is not used at all: low selectivity, a tiny table, a function or cast on the column, a type mismatch, stale statistics
- How to investigate: \`EXPLAIN\` / \`EXPLAIN ANALYZE\`, compare estimated and actual rows, and use \`enable_seqscan = off\` only as a diagnostic to see the alternative cost, not as a fix

**Code / implementation expected:** Optional — EXPLAIN output for the same table with different predicates, showing the plan switching.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  status      TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  created_at  TEXT NOT NULL,
  note        TEXT
);
INSERT INTO orders (id, customer_id, status, amount, created_at, note) VALUES
  (1, 101, 'paid',     40.00, '2025-03-01', 'gift wrap'),
  (2, 102, 'paid',     15.50, '2025-03-01', NULL),
  (3, 101, 'shipped',  99.90, '2025-03-02', 'leave at door'),
  (4, 103, 'pending',  12.00, '2025-03-03', NULL),
  (5, 104, 'paid',     60.00, '2025-03-03', NULL),
  (6, 102, 'refunded', 15.50, '2025-03-04', 'damaged'),
  (7, 101, 'paid',     25.00, '2025-03-05', NULL),
  (8, 105, 'pending',  80.00, '2025-03-06', NULL),
  (9, 103, 'paid',     45.00, '2025-03-07', NULL),
  (10, 104, 'shipped', 33.00, '2025-03-08', NULL);
CREATE INDEX orders_customer_idx ON orders (customer_id);
\`\`\``,
    answer: `**Target Audience:** Developers who have added an index and been surprised by the plan, and candidates who need to explain the planner choice with real thresholds instead of "it depends".
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 for every plan (a deterministic 100000-row table generated inside each example), plus SQLite 3.45.0 through sql.js 1.10.2 for the runnable example. The exact switch points are from this data and these settings; other data will switch at other points.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every plan shown was produced by running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

You need to find books in a library. If you want one specific book, you look it up in the catalogue and walk straight to its shelf. If you want twenty books, you might write down all their shelf numbers first, sort the list, and walk the aisles once. And if you want *every book with a blue cover*, which is half the library, the catalogue is useless: you just walk every aisle and look.

Nobody would call the last approach "not using the catalogue properly". It is simply cheaper. PostgreSQL makes exactly this choice for every table in every query, and it chooses with arithmetic, not rules of thumb. Knowing that arithmetic is what lets you answer "why is my index not used?" in an interview, and in production.

## 2. The Four Ways to Read a Table

📌 **Interview term: Seq Scan** (sequential scan) — read every page of the table from start to end and test each row. Cost grows with table size, not with the number of matches. Sequential reads are the cheapest kind of I/O.

📌 **Interview term: Index Scan** — walk the B-tree to the first matching entry, then for each entry visit its row in the table (the heap). Rows come out in index order. Each heap visit may be a **random page read**.

📌 **Interview term: Bitmap Heap Scan** — first a Bitmap Index Scan collects every matching row location, sorted by page; then the heap pages are read in physical order, each once. The middle ground, and the only way to combine two indexes (BitmapAnd / BitmapOr). Details in [Covering indexes and Bitmap Heap Scans](/interview-question/covering-indexes-include-and-bitmap-heap-scans-how-do-you-eliminate-heap-fetches).

📌 **Interview term: Index Only Scan** — answer from the index alone, visiting the heap only for pages not marked all-visible. Needs a [covering index](/interview-question/what-is-a-covering-index).

📌 **Interview term: selectivity** — the fraction of rows a condition keeps. \`id = 42\` is highly selective (1 row); \`status = 'paid'\` on a table where 90% are paid is not.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 230" role="img" aria-label="As the fraction of matching rows grows the planner moves from Index Scan to Bitmap Heap Scan to Seq Scan">
  <defs>
    <marker id="sql15q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="200" height="80" rx="10"/>
  <text class="d-text" x="120" y="73" text-anchor="middle">Index Scan</text>
  <text class="d-sub" x="120" y="97" text-anchor="middle">a handful of rows</text>
  <rect class="d-box" x="290" y="40" width="200" height="80" rx="10"/>
  <text class="d-text" x="390" y="73" text-anchor="middle">Bitmap Heap Scan</text>
  <text class="d-sub" x="390" y="97" text-anchor="middle">some rows, many pages</text>
  <rect class="d-box-muted" x="560" y="40" width="200" height="80" rx="10"/>
  <text class="d-text" x="660" y="73" text-anchor="middle">Seq Scan</text>
  <text class="d-sub" x="660" y="97" text-anchor="middle">a large share</text>
  <path class="d-edge-accent" d="M 30 180 L 750 180" marker-end="url(#sql15q3-arrow)"/>
  <text class="d-sub" x="30" y="210" text-anchor="start">0 percent</text>
  <text class="d-sub" x="740" y="210" text-anchor="end">100 percent of rows match</text>
</svg>

The more rows match, the more a per-row index plan pays in scattered page reads, until reading everything in order is cheaper.

## 3. How the Planner Prices Each Path

📌 **Interview term: cost-based optimizer** — the planner estimates the number of rows each step produces (using statistics gathered by \`ANALYZE\`), multiplies by unit costs, and picks the plan with the lowest total. The unit costs on this server:

~~~text
name | setting
cpu_index_tuple_cost | 0.005
cpu_operator_cost | 0.0025
cpu_tuple_cost | 0.01
effective_cache_size | 524288
random_page_cost | 4
seq_page_cost | 1
~~~

\`effective_cache_size\` is in 8 kB pages (524288 pages = 4 GB). \`seq_page_cost = 1\` and \`random_page_cost = 4\` say that a random page read is assumed four times as expensive as a sequential one. A Seq Scan pays \`pages x 1 + rows x cpu_tuple_cost\`; an Index Scan pays roughly \`matching rows x random page reads\`. That is the whole trade-off in two lines. Section 3 of [How do you read an EXPLAIN query plan?](/interview-question/how-do-you-read-an-explain-query-plan) computes a Seq Scan cost by hand.

The test table (generated in examples 2 to 4) has 100000 orders with two indexed columns that hold the same kind of values but are stored very differently:

- \`score\` is a scrambled number, so rows with consecutive scores are scattered all over the table.
- \`created_at\` increases with the row id, so rows with consecutive dates sit on consecutive pages.

\`ANALYZE\` measures that as **correlation**:

~~~text
attname | correlation
created_at | 1.000
id | 1.000
score | 0.000
~~~

📌 **Interview term: correlation** — the statistic in \`pg_stats\` (from -1 to 1) that says how well the physical row order follows the column order. Near 1 or -1, an Index Scan over a range reads pages almost sequentially; near 0, every entry can be a different random page. The planner uses it to interpolate the Index Scan cost.

The examples set the statistics target to 1000 so that \`ANALYZE\` samples every row (it samples 300 x target rows) and the estimates, and therefore the plans, are identical on every run. With the default target, the row estimates for this table came out slightly different on each run (40183 and 40243 for the same 40000-row condition).

## 4. The Switch Points, Measured

The second example asks for the first scan node of \`SELECT * ... WHERE score < N\` and \`WHERE created_at < date\` at increasing fractions of the table. The helper \`scan_of\` runs \`EXPLAIN (COSTS OFF)\` and returns the scan line:

~~~text
column_filtered | rows_matched | plan
score (scattered) | 0.001% | Index Scan using big_orders_score_idx
score (scattered) | 0.01% | Bitmap Heap Scan
score (scattered) | 1% | Bitmap Heap Scan
score (scattered) | 10% | Bitmap Heap Scan
score (scattered) | 30% | Bitmap Heap Scan
score (scattered) | 40% | Seq Scan
created_at (in order) | 1% | Index Scan using big_orders_created_idx
created_at (in order) | 10% | Index Scan using big_orders_created_idx
created_at (in order) | 50% | Index Scan using big_orders_created_idx
created_at (in order) | 70% | Index Scan using big_orders_created_idx
created_at (in order) | 80% | Seq Scan
~~~

Reading it:

- **Scattered column (\`score\`):** 1 row gets an Index Scan. From 10 rows (0.01%) the planner already prefers a Bitmap Heap Scan, because sorting even a few heap visits by page is cheaper. At 40% a Seq Scan wins.
- **Ordered column (\`created_at\`):** the Index Scan survives up to 70% of the table, because its heap visits are nearly sequential. At 80% the Seq Scan wins.

Why 40% for \`score\`? The estimated costs at that point, with each alternative forced in turn by switching the cheaper one off:

~~~text
QUERY PLAN
Seq Scan on big_orders  (cost=0.00..2914.00 rows=40000 width=97)
  Filter: (score < 40000)
QUERY PLAN
Bitmap Heap Scan on big_orders  (cost=754.29..2918.29 rows=40000 width=97)
  Recheck Cond: (score < 40000)
  ->  Bitmap Index Scan on big_orders_score_idx  (cost=0.00..744.29 rows=40000 width=0)
        Index Cond: (score < 40000)
QUERY PLAN
Index Scan using big_orders_score_idx on big_orders  (cost=0.29..7800.29 rows=40000 width=97)
  Index Cond: (score < 40000)
~~~

Seq Scan 2914.00, Bitmap Heap Scan 2918.29, Index Scan 7800.29. The bitmap lost by less than 0.2%, which is why the switch points sit where they do: a few percent of rows in either direction would flip it. The planner does not chase "about 5%" or any other fixed rule; it compares totals like these.

## 5. The Biggest Knob: random_page_cost

The default \`random_page_cost = 4\` dates from spinning disks. On SSDs or a well-cached database many teams set it closer to 1. The third example repeats the scattered sweep at 1.1:

~~~text
rows_matched | plan_at_1_1
0.001% | Index Scan using big_orders_score_idx
0.01% | Index Scan using big_orders_score_idx
0.1% | Bitmap Heap Scan
1% | Bitmap Heap Scan
10% | Bitmap Heap Scan
30% | Bitmap Heap Scan
40% | Bitmap Heap Scan
60% | Seq Scan
~~~

The Index Scan now wins up to 10 rows (0.01%) and the bitmap holds up to 40%; the Seq Scan only takes over at 60%. Same data, same indexes, different hardware assumption. Change it with \`ALTER SYSTEM\`, per database or per role after measuring, never as a per-query hack.

📌 **Interview term: effective_cache_size** — the planner's guess of how much of the data is cached (shared buffers plus OS cache). It does not allocate memory; a bigger value makes repeated index page reads look cheaper.

## 6. Index Only Scan and the Other Special Cases

<svg class="iq-diagram" width="100%" viewBox="0 0 780 200" role="img" aria-label="Index Only Scan needs two things: every needed column in the index, and pages marked all-visible by VACUUM">
  <defs>
    <marker id="sql15q3-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="230" height="70" rx="10"/>
  <text class="d-text" x="135" y="50" text-anchor="middle">all columns in index</text>
  <text class="d-sub" x="135" y="72" text-anchor="middle">select, filter, sort</text>
  <rect class="d-box" x="20" y="120" width="230" height="70" rx="10"/>
  <text class="d-text" x="135" y="150" text-anchor="middle">pages all-visible</text>
  <text class="d-sub" x="135" y="172" text-anchor="middle">set by VACUUM</text>
  <rect class="d-box-accent" x="510" y="65" width="250" height="80" rx="10"/>
  <text class="d-text" x="635" y="98" text-anchor="middle">Index Only Scan</text>
  <text class="d-sub" x="635" y="122" text-anchor="middle">cheap, few heap fetches</text>
  <path class="d-edge" d="M 254 55 L 504 95" marker-end="url(#sql15q3-arrow2)"/>
  <path class="d-edge" d="M 254 155 L 504 115" marker-end="url(#sql15q3-arrow2)"/>
</svg>

The fourth example runs six queries that each teach one rule:

~~~text
label | plan
SELECT score ... score < 90000 (90%) | Index Only Scan using big_orders_score_idx
SELECT * ... ORDER BY score LIMIT 10 | Index Scan using big_orders_score_idx
SELECT * ... WHERE score + 0 = 7 | Seq Scan
SELECT * ... WHERE id = 42 | Index Scan using big_orders_pkey
SELECT count(*) FROM big_orders | Index Only Scan using big_orders_created_idx
SELECT * ... WHERE note = 'y' | Seq Scan
~~~

1. **Index Only Scan at 90% of the rows.** The query needs only \`score\`, which is in the index, and the table was vacuumed, so the narrow index is cheaper to read than the wide table. Before \`VACUUM\` (only \`ANALYZE\` run) the same query got:

~~~text
plan_before_vacuum
Seq Scan
~~~

   A Seq Scan. With no page marked all-visible, an Index Only Scan would visit the heap for every row, so the planner did not choose it.
2. **\`ORDER BY score LIMIT 10\`** uses an Index Scan on a 100000-row table: the index is already sorted, so it stops after 10 entries instead of sorting everything.
3. **\`score + 0 = 7\`** is a Seq Scan: an expression on the column is not what the index stores.
4. **Primary key equality** is a plain Index Scan on \`big_orders_pkey\`.
5. **\`count(*)\`** reads the smallest index instead of the table: \`big_orders_created_idx\` is 91 pages (a date repeated 1000 times, which B-tree deduplication compresses), against 276 for the other indexes and 1664 for the table, measured with \`pg_relation_size\`.
6. **No index on \`note\`**: Seq Scan, of course.

### Tiny tables

On the 10-row \`orders\` table from the schema, after \`ANALYZE\`, even a primary key lookup is a Seq Scan:

~~~text
QUERY PLAN
Seq Scan on orders  (cost=0.00..1.12 rows=1 width=40)
  Filter: (id = 3)
~~~

Forcing the index with \`enable_seqscan = off\` shows why:

~~~text
QUERY PLAN
Index Scan using orders_pkey on orders  (cost=0.14..8.15 rows=1 width=40)
  Index Cond: (id = 3)
~~~

1.12 against 8.15. The whole table is one page; an index lookup costs more than reading it. This is why "index not used" on a development database with a few rows proves nothing.

## 7. SQLite: Same Choices, Different Words

SQLite has no bitmap scans, but its plan shows the same decisions:

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN orders

id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_customer_idx (customer_id=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_customer_idx (customer_id=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING INTEGER PRIMARY KEY (rowid=?)

id | parent | notused | detail
2 | 0 | 0 | SCAN orders
~~~

| SQLite \`EXPLAIN QUERY PLAN\` | PostgreSQL equivalent |
| :--- | :--- |
| \`SCAN orders\` | Seq Scan |
| \`SEARCH orders USING INDEX ...\` | Index Scan |
| \`SEARCH orders USING COVERING INDEX ...\` | Index Only Scan |
| \`SEARCH orders USING INTEGER PRIMARY KEY (rowid=?)\` | Index Scan on the primary key (in SQLite the table itself is the rowid B-tree) |
| (none) | Bitmap Heap Scan |

The last query, \`customer_id + 0 = 101\`, is a \`SCAN\`: the same "expression hides the column" rule as PostgreSQL.

## 8. Verified: Running the Code

Example 1 ran on sql.js 1.10.2 (SQLite 3.45.0) on the schema above. Examples 2 to 4 ran on PostgreSQL 16.15, each in a fresh throwaway database; each generates the same 100000-row table with \`generate_series\`, vacuums it and samples every row for statistics, so the output was identical across repeated runs.

**Example 1 — SQLite plans:**

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN orders

id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_customer_idx (customer_id=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_customer_idx (customer_id=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING INTEGER PRIMARY KEY (rowid=?)

id | parent | notused | detail
2 | 0 | 0 | SCAN orders
~~~

**Example 2 — the selectivity sweep:**

~~~text
column_filtered | rows_matched | plan
score (scattered) | 0.001% | Index Scan using big_orders_score_idx
score (scattered) | 0.01% | Bitmap Heap Scan
score (scattered) | 1% | Bitmap Heap Scan
score (scattered) | 10% | Bitmap Heap Scan
score (scattered) | 30% | Bitmap Heap Scan
score (scattered) | 40% | Seq Scan
created_at (in order) | 1% | Index Scan using big_orders_created_idx
created_at (in order) | 10% | Index Scan using big_orders_created_idx
created_at (in order) | 50% | Index Scan using big_orders_created_idx
created_at (in order) | 70% | Index Scan using big_orders_created_idx
created_at (in order) | 80% | Seq Scan
~~~

**Example 3 — random_page_cost = 1.1:**

~~~text
rows_matched | plan_at_1_1
0.001% | Index Scan using big_orders_score_idx
0.01% | Index Scan using big_orders_score_idx
0.1% | Bitmap Heap Scan
1% | Bitmap Heap Scan
10% | Bitmap Heap Scan
30% | Bitmap Heap Scan
40% | Bitmap Heap Scan
60% | Seq Scan
~~~

**Example 4 — special cases:**

~~~text
label | plan
SELECT score ... score < 90000 (90%) | Index Only Scan using big_orders_score_idx
SELECT * ... ORDER BY score LIMIT 10 | Index Scan using big_orders_score_idx
SELECT * ... WHERE score + 0 = 7 | Seq Scan
SELECT * ... WHERE id = 42 | Index Scan using big_orders_pkey
SELECT count(*) FROM big_orders | Index Only Scan using big_orders_created_idx
SELECT * ... WHERE note = 'y' | Seq Scan
~~~

On your data the switch points will differ; the planner may pick other plans on other data, versions or settings. That is the point of the question.

## 9. Summary Table

| Scan | Reads | Wins when | Watch for |
| :--- | :--- | :--- | :--- |
| Seq Scan | Every page, in order | Large share of rows, tiny tables, no usable index | Big tables with a selective predicate (missing index or bad estimate) |
| Index Scan | Index plus one heap visit per row | Very few rows, high correlation, \`ORDER BY ... LIMIT\` | Many rows on a scattered column |
| Bitmap Heap Scan | Index, then matching pages in page order | Hundreds to many thousands of scattered rows, \`OR\` / \`AND\` of indexes | Lossy blocks when \`work_mem\` is small; Heap Blocks near the table size |
| Index Only Scan | Index, heap only for non-all-visible pages | Covering index on a vacuumed table | High \`Heap Fetches\` |

## Common Pitfalls

- **Testing on a tiny dev table** and concluding the index does not work. Below a few pages the Seq Scan is genuinely cheaper.
- **Believing a fixed percentage rule** ("indexes stop helping at 5%"). Here the line was at 0.001% for an Index Scan, 40% for a Bitmap, and 70% for a correlated column.
- **Wrapping the indexed column** in a function, arithmetic, a cast or \`COALESCE\` and losing the index.
- **Leaving \`random_page_cost = 4\` on SSD storage** and wondering why the planner avoids indexes.
- **Using \`enable_seqscan = off\` in production** to "fix" a plan. Fix the estimate (statistics, \`ANALYZE\`) or the index instead.
- **Stale statistics after a bulk load.** Wrong row estimates lead to the wrong scan; compare estimated and actual rows with [EXPLAIN ANALYZE](/interview-question/how-do-you-read-explain-analyze-cost-actual-time-rows-and-buffers).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Cost-based:</strong> <span style="color:#f0e2c8;">PostgreSQL does not "use the index if there is one". It estimates how many rows match from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ANALYZE</code> statistics, prices every possible path in page reads and CPU, and runs the cheapest. A Seq Scan with an index present is often the right answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The four scans:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Seq Scan</strong> reads every page in order. <strong style="color:#ffca28;">Index Scan</strong> walks the index and visits the table once per row. <strong style="color:#ffca28;">Bitmap Heap Scan</strong> collects the matches first and reads their pages in physical order. <strong style="color:#ffca28;">Index Only Scan</strong> never needs the table, if the index has every column and the pages are all-visible.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The numbers:</strong> <span style="color:#f0e2c8;">On 100000 scattered rows I measured: Index Scan for 1 row, Bitmap from 10 rows up to 30%, Seq Scan from 40%. On a column stored in index order (correlation 1) the Index Scan stayed cheapest up to 70%.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The knobs:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">random_page_cost</code> (default 4) tells the planner how much worse a random page read is than a sequential one. At 1.1, typical for SSDs, the same table used an Index Scan for 10 rows and kept the bitmap up to 40%. <strong style="color:#ffca28;">Correlation</strong> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effective_cache_size</code> also move the line.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Diagnosing:</strong> <span style="color:#f0e2c8;">When the index is ignored I check: is the predicate selective, is the table tiny, is there a function or cast on the column, are the statistics stale (estimate vs actual rows in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code>). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET enable_seqscan = off</code> shows the alternative cost, but it is a diagnostic, not a fix.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would PostgreSQL ignore an index on a 10-row table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The whole table is one page. A Seq Scan costs one page read plus 10 row checks; an Index Scan costs an index page plus a heap page. With statistics the 10-row <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">orders</code> table got <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Seq Scan ... cost=0.00..1.12</code>, versus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cost=0.14..8.15</code> when the seq scan was disabled.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is correlation and why does it matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_stats.correlation</code> measures how closely the physical row order follows the column order, from -1 to 1. At 1, consecutive index entries point to the same or the next page, so an Index Scan reads pages almost sequentially and stays cheap for large ranges. At 0 every entry may be a different random page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ORDER BY score LIMIT 10</code> use an Index Scan even on a big table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The index is already sorted, so the scan can stop after 10 entries; the startup cost is near zero. A Seq Scan would have to read and sort all 100000 rows to find the first 10. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code> changes the cheapest plan.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">WHERE score + 0 = 7</code> not use the index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The index stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score + 0</code>. Any function, arithmetic or cast on the indexed column makes it a different expression. Rewrite the predicate (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score = 7</code>) or create an [expression index](/interview-question/what-is-an-index-and-how-does-it-speed-up-queries) on exactly that expression.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does the planner pick an Index Only Scan even for 90% of the rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the index holds every needed column and the visibility map says the pages are all-visible, it reads the index, which is much narrower than the table. Here <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT score WHERE score &lt; 90000</code> used one. Before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VACUUM</code> the same query got a Seq Scan because no page was marked all-visible.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Seq Scan | Reads every table page in order |
| Index Scan | Walks the index and visits the heap once per matching row |
| Bitmap Heap Scan | Collects matches in a bitmap, then reads their pages in physical order |
| Index Only Scan | Answers from the index; heap only for pages not all-visible |
| Selectivity | Fraction of rows a condition keeps |
| Cost-based optimizer | Estimates rows, prices each plan, picks the cheapest |
| Correlation | How well physical row order follows a column order (-1 to 1) |
| effective_cache_size | Planner hint for how much data is cached; allocates nothing |

**Conclusion:** PostgreSQL chooses between Seq Scan, Index Scan, Bitmap Heap Scan and Index Only Scan by estimating how many rows match and pricing each path, so the answer to "when" is a set of numbers, not a rule. On this 100000-row table a scattered column got an Index Scan for a single row, a Bitmap Heap Scan up to 30% and a Seq Scan from 40%; a column stored in order kept its Index Scan to 70%; lowering \`random_page_cost\` to 1.1 moved the lines; and an Index Only Scan won even at 90% because the index covered the query and the table was vacuumed. When an index is ignored, check selectivity, table size, expressions on the column and stale statistics before reaching for planner switches.`,
    examples: [
      {
        label: `SQLite: full scan, index search, covering index and rowid lookup on one table`,
        code: `-- no index on status: read the whole table
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE status = 'paid';

-- index finds the rows, the table supplies the other columns
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 101;

-- the index alone answers it (id is the rowid, stored in every index)
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE customer_id = 101;

-- direct lookup by the INTEGER PRIMARY KEY
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE id = 7;

-- an expression on the column hides it from the index
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id + 0 = 101;`,
      },
      {
        label: `PostgreSQL: the plan switches as more rows match, and correlation moves the line`,
        code: `-- 100000 generated orders, created in date order
CREATE TABLE big_orders WITH (autovacuum_enabled = false) AS
SELECT g AS id,
       g % 5000 AS customer_id,
       (g * 7919) % 100000 AS score,                -- scattered over the table
       DATE '2025-01-01' + (g / 1000) AS created_at, -- follows physical order
       repeat('x', 80) AS note
FROM generate_series(1, 100000) AS g;
ALTER TABLE big_orders ADD PRIMARY KEY (id);
CREATE INDEX big_orders_score_idx ON big_orders (score);
CREATE INDEX big_orders_created_idx ON big_orders (created_at);
-- sample every row so the statistics (and so the plans) are the same on every run
ALTER TABLE big_orders ALTER COLUMN score SET STATISTICS 1000;
VACUUM ANALYZE big_orders;

-- returns the first scan node of a plan
CREATE FUNCTION scan_of(q text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN EXECUTE 'EXPLAIN (COSTS OFF) ' || q LOOP
    IF r."QUERY PLAN" LIKE '%Scan%' THEN
      RETURN regexp_replace(ltrim(r."QUERY PLAN", ' ->'), ' on big_orders$', '');
    END IF;
  END LOOP;
END $$;

SELECT column_filtered, rows_matched, plan FROM (
  SELECT 'score (scattered)' AS column_filtered, pct, pct || '%' AS rows_matched,
         scan_of('SELECT * FROM big_orders WHERE score < ' || (pct * 1000)::int) AS plan
  FROM unnest(ARRAY[0.001, 0.01, 1, 10, 30, 40]) AS pct
  UNION ALL
  SELECT 'created_at (in order)', pct, pct || '%',
         scan_of('SELECT * FROM big_orders WHERE created_at < DATE ''2025-01-01'' + ' || pct)
  FROM unnest(ARRAY[1, 10, 50, 70, 80]) AS pct
) AS s
ORDER BY column_filtered DESC, pct;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: with random_page_cost = 1.1 (SSD-style) the index wins for more rows`,
        code: `-- 100000 generated orders, created in date order
CREATE TABLE big_orders WITH (autovacuum_enabled = false) AS
SELECT g AS id,
       g % 5000 AS customer_id,
       (g * 7919) % 100000 AS score,                -- scattered over the table
       DATE '2025-01-01' + (g / 1000) AS created_at, -- follows physical order
       repeat('x', 80) AS note
FROM generate_series(1, 100000) AS g;
ALTER TABLE big_orders ADD PRIMARY KEY (id);
CREATE INDEX big_orders_score_idx ON big_orders (score);
CREATE INDEX big_orders_created_idx ON big_orders (created_at);
-- sample every row so the statistics (and so the plans) are the same on every run
ALTER TABLE big_orders ALTER COLUMN score SET STATISTICS 1000;
VACUUM ANALYZE big_orders;

-- returns the first scan node of a plan
CREATE FUNCTION scan_of(q text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN EXECUTE 'EXPLAIN (COSTS OFF) ' || q LOOP
    IF r."QUERY PLAN" LIKE '%Scan%' THEN
      RETURN regexp_replace(ltrim(r."QUERY PLAN", ' ->'), ' on big_orders$', '');
    END IF;
  END LOOP;
END $$;

SET random_page_cost = 1.1;

SELECT pct || '%' AS rows_matched,
       scan_of('SELECT * FROM big_orders WHERE score < ' || (pct * 1000)::int) AS plan_at_1_1
FROM unnest(ARRAY[0.001, 0.01, 0.1, 1, 10, 30, 40, 60]) AS pct
ORDER BY pct;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: Index Only Scans, ORDER BY LIMIT, and queries that cannot use the index`,
        code: `-- 100000 generated orders, created in date order
CREATE TABLE big_orders WITH (autovacuum_enabled = false) AS
SELECT g AS id,
       g % 5000 AS customer_id,
       (g * 7919) % 100000 AS score,                -- scattered over the table
       DATE '2025-01-01' + (g / 1000) AS created_at, -- follows physical order
       repeat('x', 80) AS note
FROM generate_series(1, 100000) AS g;
ALTER TABLE big_orders ADD PRIMARY KEY (id);
CREATE INDEX big_orders_score_idx ON big_orders (score);
CREATE INDEX big_orders_created_idx ON big_orders (created_at);
-- sample every row so the statistics (and so the plans) are the same on every run
ALTER TABLE big_orders ALTER COLUMN score SET STATISTICS 1000;
VACUUM ANALYZE big_orders;

-- returns the first scan node of a plan
CREATE FUNCTION scan_of(q text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN EXECUTE 'EXPLAIN (COSTS OFF) ' || q LOOP
    IF r."QUERY PLAN" LIKE '%Scan%' THEN
      RETURN regexp_replace(ltrim(r."QUERY PLAN", ' ->'), ' on big_orders$', '');
    END IF;
  END LOOP;
END $$;

SELECT label, scan_of(q) AS plan FROM (VALUES
  (1, 'SELECT score ... score < 90000 (90%)', 'SELECT score FROM big_orders WHERE score < 90000'),
  (2, 'SELECT * ... ORDER BY score LIMIT 10', 'SELECT * FROM big_orders ORDER BY score LIMIT 10'),
  (3, 'SELECT * ... WHERE score + 0 = 7', 'SELECT * FROM big_orders WHERE score + 0 = 7'),
  (4, 'SELECT * ... WHERE id = 42', 'SELECT * FROM big_orders WHERE id = 42'),
  (5, 'SELECT count(*) FROM big_orders', 'SELECT count(*) FROM big_orders'),
  (6, 'SELECT * ... WHERE note = ''y''', 'SELECT * FROM big_orders WHERE note = ''y''')
) AS v(n, label, q)
ORDER BY n;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `How do you read an EXPLAIN query plan?`,
    difficulty: "medium",
    seoDescription: `How to read an EXPLAIN plan: the node tree, startup and total cost, rows and width, join and scan nodes, and SQLite and MySQL equivalents.`,
    description: `**Question presented to candidate:**
"Here is the output of EXPLAIN for a slow query. Walk me through how you read it: what are the nodes, what do the numbers mean, and what would you look for first?"

**What a strong answer should cover:**
- \`EXPLAIN\` shows the plan the optimizer chose **without running the query**; the plan is a tree of nodes, and you read it from the most indented (leaf) nodes up, because children produce rows for their parent
- Every node line: \`cost=startup..total\` in arbitrary planner units (based on \`seq_page_cost = 1\`), \`rows\` = estimated rows output, \`width\` = estimated bytes per row; a parent cost includes its children
- The common nodes: scans (Seq, Index, Index Only, Bitmap), joins (Nested Loop, Hash Join, Merge Join), and Sort, Aggregate / HashAggregate, Limit; plus the detail lines \`Filter\`, \`Index Cond\`, \`Hash Cond\`, \`Sort Key\`
- That estimates are only estimates: to see what really happened use \`EXPLAIN ANALYZE\` (actual rows, loops, time) and compare estimated vs actual rows
- Engine differences: SQLite \`EXPLAIN QUERY PLAN\` (SCAN / SEARCH / USE TEMP B-TREE), MySQL \`EXPLAIN\` as a table (\`type\`, \`key\`, \`rows\`, \`Extra\`) and \`EXPLAIN ANALYZE\` since 8.0.18, SQL Server graphical / showplan
- What to look for first: the node with the largest cost jump, a Seq Scan on a big table with a selective filter, row estimates far off, sorts and nested loops over many rows

**Code / implementation expected:** Optional — reading a real EXPLAIN tree for a join with an aggregate.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  country TEXT NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status      TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  created_at  TEXT NOT NULL
);
INSERT INTO customers (id, name, country) VALUES
  (1, 'Asha', 'IN'), (2, 'Ben', 'US'), (3, 'Chen', 'DE'), (4, 'Dara', 'IN'), (5, 'Eli', 'US');
INSERT INTO orders (id, customer_id, status, amount, created_at) VALUES
  (1, 1, 'paid', 40.00, '2025-03-01'),
  (2, 2, 'paid', 15.50, '2025-03-01'),
  (3, 1, 'shipped', 99.90, '2025-03-02'),
  (4, 3, 'pending', 12.00, '2025-03-03'),
  (5, 4, 'paid', 60.00, '2025-03-03'),
  (6, 2, 'refunded', 15.50, '2025-03-04'),
  (7, 1, 'paid', 25.00, '2025-03-05'),
  (8, 5, 'pending', 80.00, '2025-03-06'),
  (9, 3, 'paid', 45.00, '2025-03-07'),
  (10, 4, 'shipped', 33.00, '2025-03-08');
CREATE INDEX orders_customer_idx ON orders (customer_id);
\`\`\``,
    answer: `**Target Audience:** Beginners who have been handed an \`EXPLAIN\` output and do not know where to start, and candidates who need to walk an interviewer through a plan line by line.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 for every PostgreSQL plan (tables generated inside each example, small enough that statistics are exact), SQLite 3.45.0 through sql.js 1.10.2 for the runnable example. MySQL and SQL Server are described from their documentation, not run here.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every plan shown was produced by running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

You ask a satnav to get you across town. Before you drive, it shows the route: "take the ring road, then the bridge, estimated 23 minutes". You have not moved yet; that is a *plan* with *estimates*. If the trip then takes an hour, you compare the plan with what happened and find the jam.

SQL is declarative: you say *what* you want, and the database decides *how*. \`EXPLAIN\` is the satnav screen. It shows which tables are read in which way, which joins and sorts happen, and how expensive each step is expected to be. Every "why is this query slow?" conversation starts here, which is why interviewers love to paste a plan and ask you to read it. (What happens when you actually drive, \`EXPLAIN ANALYZE\`, has [its own page](/interview-question/how-do-you-read-explain-analyze-cost-actual-time-rows-and-buffers).)

## 2. A Plan Is a Tree

📌 **Interview term: query plan / execution plan** — the step-by-step strategy the optimizer chose for a query. Each step is a **plan node**; nodes form a tree where every node pulls rows from its children.

📌 **Interview term: EXPLAIN** — the command that shows the plan without running the query. In PostgreSQL the output is indented text; \`->\` marks a child node.

The second example joins 20000 orders with 2000 customers, sums paid revenue per country and sorts:

~~~sql
EXPLAIN
SELECT c.country, COUNT(*) AS orders, SUM(o.amount) AS revenue
FROM gen_orders o JOIN gen_customers c ON c.id = o.customer_id
WHERE o.status = 'paid'
GROUP BY c.country
ORDER BY revenue DESC;
~~~

~~~text
QUERY PLAN
Sort  (cost=627.61..627.62 rows=5 width=43)
  Sort Key: (sum(o.amount)) DESC
  ->  HashAggregate  (cost=627.49..627.55 rows=5 width=43)
        Group Key: c.country
        ->  Hash Join  (cost=57.00..484.99 rows=19000 width=9)
              Hash Cond: (o.customer_id = c.id)
              ->  Seq Scan on gen_orders o  (cost=0.00..378.00 rows=19000 width=10)
                    Filter: (status = 'paid'::text)
              ->  Hash  (cost=32.00..32.00 rows=2000 width=7)
                    ->  Seq Scan on gen_customers c  (cost=0.00..32.00 rows=2000 width=7)
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 760 560" role="img" aria-label="The plan tree for the join query: two Seq Scans feed a Hash and a Hash Join, then HashAggregate, then Sort at the top">
  <defs>
    <marker id="sql15q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="270" y="20" width="220" height="64" rx="10"/>
  <text class="d-text" x="380" y="47" text-anchor="middle">Sort</text>
  <text class="d-sub" x="380" y="69" text-anchor="middle">rows=5, total 627.62</text>
  <rect class="d-box" x="270" y="134" width="220" height="64" rx="10"/>
  <text class="d-text" x="380" y="161" text-anchor="middle">HashAggregate</text>
  <text class="d-sub" x="380" y="183" text-anchor="middle">group by country</text>
  <rect class="d-box" x="270" y="248" width="220" height="64" rx="10"/>
  <text class="d-text" x="380" y="275" text-anchor="middle">Hash Join</text>
  <text class="d-sub" x="380" y="297" text-anchor="middle">rows=19000</text>
  <rect class="d-box-muted" x="40" y="362" width="240" height="64" rx="10"/>
  <text class="d-text" x="160" y="389" text-anchor="middle">Seq Scan gen_orders</text>
  <text class="d-sub" x="160" y="411" text-anchor="middle">outer, probes the hash</text>
  <rect class="d-box" x="480" y="362" width="240" height="64" rx="10"/>
  <text class="d-text" x="600" y="389" text-anchor="middle">Hash</text>
  <text class="d-sub" x="600" y="411" text-anchor="middle">built from customers</text>
  <rect class="d-box-muted" x="480" y="480" width="240" height="56" rx="10"/>
  <text class="d-text" x="600" y="514" text-anchor="middle">Seq Scan gen_customers</text>
  <path class="d-edge" d="M 380 130 L 380 90" marker-end="url(#sql15q4-arrow)"/>
  <path class="d-edge" d="M 380 244 L 380 204" marker-end="url(#sql15q4-arrow)"/>
  <path class="d-edge" d="M 190 358 L 320 318" marker-end="url(#sql15q4-arrow)"/>
  <path class="d-edge" d="M 570 358 L 440 318" marker-end="url(#sql15q4-arrow)"/>
  <path class="d-edge" d="M 600 476 L 600 432" marker-end="url(#sql15q4-arrow)"/>
</svg>

**Read it from the leaves up** (most indented first), because that is the order data flows:

1. \`Seq Scan on gen_customers c\` reads all 2000 customers.
2. \`Hash\` builds an in-memory hash table of them, keyed on \`c.id\`.
3. \`Seq Scan on gen_orders o\` reads all orders and keeps those passing \`Filter: (status = 'paid'::text)\`, estimated 19000.
4. \`Hash Join\` probes the hash for each order using \`Hash Cond: (o.customer_id = c.id)\`, giving 19000 joined rows.
5. \`HashAggregate\` groups them by \`c.country\` (\`Group Key\`) into 5 rows.
6. \`Sort\` orders those 5 rows by \`Sort Key: (sum(o.amount)) DESC\`. It is the root: its output is the query result.

Notice the order does not match the SQL text: \`ORDER BY\` is written last and executed last, \`FROM\` is written first and executed first; the [logical order of execution](/interview-question/what-is-the-logical-order-of-execution-of-a-sql-query) explains why.

## 3. What the Numbers Mean

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Anatomy of one plan line: node name, then startup cost, total cost, estimated rows and width">
  <rect class="d-box-accent" x="20" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="60" text-anchor="middle">Seq Scan on t</text>
  <text class="d-sub" x="120" y="82" text-anchor="middle">node type and table</text>
  <rect class="d-box" x="250" y="30" width="150" height="70" rx="10"/>
  <text class="d-text" x="325" y="60" text-anchor="middle">0.00</text>
  <text class="d-sub" x="325" y="82" text-anchor="middle">startup cost</text>
  <rect class="d-box" x="430" y="30" width="150" height="70" rx="10"/>
  <text class="d-text" x="505" y="60" text-anchor="middle">378.00</text>
  <text class="d-sub" x="505" y="82" text-anchor="middle">total cost</text>
  <rect class="d-box" x="610" y="30" width="130" height="70" rx="10"/>
  <text class="d-text" x="675" y="60" text-anchor="middle">1000 / 19</text>
  <text class="d-sub" x="675" y="82" text-anchor="middle">rows / width</text>
</svg>

Every node line has the shape \`(cost=startup..total rows=N width=W)\`:

📌 **Interview term: startup cost** — the estimated cost before the node can return its first row. A Seq Scan is 0.00 (it can return the first row immediately); a \`Hash\` or \`Sort\` must consume its whole input first, so its startup is close to its total. The Hash Join cannot start until its hash is built, so its startup (57.00) is above the Hash total (32.00).

📌 **Interview term: total cost** — the estimated cost to return all rows. **A parent includes its children**: the root Sort total (627.62) is the estimated cost of the whole query.

📌 **Interview term: rows (estimated)** — how many rows the node is expected to output, from statistics. \`rows=19000\` after the filter is 95% of 20000, because \`ANALYZE\` saw that 1 in 20 orders is refunded.

📌 **Interview term: width** — the estimated average size in bytes of one output row.

### Cost units are arithmetic, not milliseconds

Costs are in abstract units where reading one page sequentially costs \`seq_page_cost = 1.0\`. The third example recomputes a Seq Scan by hand: pages x \`seq_page_cost\` + rows x \`cpu_tuple_cost\` (0.01), plus rows x \`cpu_operator_cost\` (0.0025) for one \`WHERE\` comparison:

~~~text
pages | row_estimate | cost_by_hand | planner_cost | filtered_by_hand | filtered_planner
128 | 20000 | 328.00 | 328.00 | 378.0000 | 378.00
~~~

\`128 + 20000 x 0.01 = 328\` and \`128 + 20000 x 0.0125 = 378\`, both exactly what the planner printed. The same query with a filter, as plain EXPLAIN:

~~~text
QUERY PLAN
Seq Scan on gen_orders  (cost=0.00..378.00 rows=1000 width=19)
  Filter: (status = 'refunded'::text)
~~~

Note \`rows=1000\` with the same total cost: the filter does not make the scan cheaper, it still reads every page. This is why cost numbers only make sense **compared with each other** for the same query on the same server; they are not a time.

## 4. The Node Types You Must Know

| Node | What it does | Typical cue |
| :--- | :--- | :--- |
| Seq Scan | Reads the whole table | \`Filter:\` line underneath |
| Index Scan | Walks an index, visits rows | \`Index Cond:\` |
| Index Only Scan | Reads only the index | \`Heap Fetches\` (with ANALYZE) |
| Bitmap Index / Heap Scan | Collects matches, then reads pages in order | \`Recheck Cond:\` |
| Nested Loop | For each outer row, runs the inner side | Good for few outer rows with an indexed inner side |
| Hash Join | Builds a hash on one input, probes with the other | \`Hash Cond:\`, a \`Hash\` child |
| Merge Join | Merges two inputs sorted on the join key | \`Merge Cond:\`, often \`Sort\` children |
| Sort | Sorts its input | \`Sort Key:\` |
| HashAggregate / GroupAggregate | \`GROUP BY\` via a hash table or sorted input | \`Group Key:\` |
| Limit | Stops after N rows | Makes low startup cost matter |

How the scans are chosen is covered in [Seq Scan vs Index Scan vs Index-Only Scan](/interview-question/seq-scan-vs-index-scan-vs-index-only-scan-when-does-postgres-choose-each).

📌 **Interview term: Nested Loop** — for every row of the outer (first) child, run the inner (second) child once. Cheap when the outer side is small and the inner side is an index lookup. The fourth example asks for one customer and their orders:

~~~text
QUERY PLAN
Nested Loop  (cost=4.64..44.50 rows=10 width=19)
  ->  Index Scan using gen_customers_pkey on gen_customers c  (cost=0.28..8.29 rows=1 width=13)
        Index Cond: (id = 42)
  ->  Bitmap Heap Scan on gen_orders o  (cost=4.37..36.10 rows=10 width=14)
        Recheck Cond: (customer_id = 42)
        ->  Bitmap Index Scan on gen_orders_customer_idx  (cost=0.00..4.36 rows=10 width=0)
              Index Cond: (customer_id = 42)
~~~

The outer side finds customer 42 by primary key (\`rows=1\`), so the inner side runs once, using the orders index. Look at the inner \`Recheck Cond: (customer_id = 42)\`: the planner knew \`c.id = 42\` and \`o.customer_id = c.id\`, so it derived \`o.customer_id = 42\` itself.

📌 **Interview term: Hash Join** — build a hash table from one input (the child under \`Hash\`, usually the smaller one), then stream the other input and probe it. Best for large equi-joins without useful indexes, as in section 2.

📌 **Interview term: Merge Join** — merge two inputs already sorted on the join key, like zipping two sorted lists. With hash joins disabled (a diagnostic switch, used here only to show the node), the same aggregate join becomes:

~~~text
QUERY PLAN
HashAggregate
  Group Key: c.country
  ->  Merge Join
        Merge Cond: (o.customer_id = c.id)
        ->  Index Only Scan using gen_orders_customer_idx on gen_orders o
        ->  Index Scan using gen_customers_pkey on gen_customers c
~~~

Both inputs arrive already sorted on the join key, straight from indexes: orders from an Index Only Scan of \`gen_orders_customer_idx\` (this query needs only \`customer_id\` from orders) and customers from their primary key. When an input is not sorted, a \`Sort\` node appears under the Merge Join instead.

## 5. Other Output Formats

\`EXPLAIN (FORMAT JSON)\` returns the same tree as JSON, which tools such as plan visualizers consume and which you can query in SQL (the third example reads \`Total Cost\` from it):

~~~text
QUERY PLAN
[
  {
    "Plan": {
      "Node Type": "Seq Scan",
      "Parallel Aware": false,
      "Async Capable": false,
      "Relation Name": "gen_orders",
      "Alias": "gen_orders",
      "Startup Cost": 0.00,
      "Total Cost": 378.00,
      "Plan Rows": 1000,
      "Plan Width": 19,
      "Filter": "(status = 'refunded'::text)"
    }
  }
]
~~~

Useful options in PostgreSQL 16: \`ANALYZE\` (run it and show actual numbers), \`BUFFERS\` (page reads, with ANALYZE), \`VERBOSE\` (output columns, schema-qualified names), \`COSTS OFF\` (hide costs, used in docs and tests to keep output stable), \`SETTINGS\` (non-default planner settings).

## 6. Other Engines

**SQLite** prints a compact tree with \`EXPLAIN QUERY PLAN\`. The first example:

~~~text
id | parent | notused | detail
8 | 0 | 0 | SCAN o
12 | 0 | 0 | SEARCH c USING INTEGER PRIMARY KEY (rowid=?)
15 | 0 | 0 | USE TEMP B-TREE FOR GROUP BY
55 | 0 | 0 | USE TEMP B-TREE FOR ORDER BY

id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_customer_idx (customer_id=?)
7 | 0 | 0 | LIST SUBQUERY 1
9 | 7 | 0 | SCAN customers
~~~

- \`SCAN o\` reads the orders table; \`SEARCH c USING INTEGER PRIMARY KEY (rowid=?)\` looks each customer up by key: a nested loop, written as two lines in join order.
- \`USE TEMP B-TREE FOR GROUP BY\` and \`... FOR ORDER BY\` are SQLite's sort steps.
- In the second plan the \`parent\` column builds the tree: \`SCAN customers\` (id 9, parent 7) belongs to \`LIST SUBQUERY 1\` (id 7), the list the \`IN\` reads from.

**MySQL** \`EXPLAIN\` returns one row per table in join order, with columns such as \`type\` (access type, \`ALL\` meaning a full table scan), \`key\` (index used), \`rows\` (estimate) and \`Extra\` ([MySQL 8.0 manual: EXPLAIN output format](https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)). \`EXPLAIN FORMAT=TREE\` (MySQL 8.0.16+) and \`EXPLAIN ANALYZE\` (MySQL 8.0.18+, which runs the query) print a PostgreSQL-like tree ([MySQL blog: MySQL EXPLAIN ANALYZE](https://dev.mysql.com/blog-archive/mysql-explain-analyze/)). **SQL Server** shows graphical or XML showplans (\`SET SHOWPLAN_XML ON\` for the estimated plan). None of these were run here.

## 7. Verified: Running the Code

Example 1 ran on sql.js 1.10.2 (SQLite 3.45.0) on the schema above. Examples 2 to 4 ran on PostgreSQL 16.15 in a fresh throwaway database each; the generated tables have fewer than 30000 rows, so \`ANALYZE\` reads all of them and the estimates are identical on every run.

**Example 1 — SQLite EXPLAIN QUERY PLAN:**

~~~text
id | parent | notused | detail
8 | 0 | 0 | SCAN o
12 | 0 | 0 | SEARCH c USING INTEGER PRIMARY KEY (rowid=?)
15 | 0 | 0 | USE TEMP B-TREE FOR GROUP BY
55 | 0 | 0 | USE TEMP B-TREE FOR ORDER BY

id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_customer_idx (customer_id=?)
7 | 0 | 0 | LIST SUBQUERY 1
9 | 7 | 0 | SCAN customers
~~~

**Example 2 — the join + aggregate + sort plan:**

~~~text
QUERY PLAN
Sort  (cost=627.61..627.62 rows=5 width=43)
  Sort Key: (sum(o.amount)) DESC
  ->  HashAggregate  (cost=627.49..627.55 rows=5 width=43)
        Group Key: c.country
        ->  Hash Join  (cost=57.00..484.99 rows=19000 width=9)
              Hash Cond: (o.customer_id = c.id)
              ->  Seq Scan on gen_orders o  (cost=0.00..378.00 rows=19000 width=10)
                    Filter: (status = 'paid'::text)
              ->  Hash  (cost=32.00..32.00 rows=2000 width=7)
                    ->  Seq Scan on gen_customers c  (cost=0.00..32.00 rows=2000 width=7)
~~~

**Example 3 — Seq Scan cost by hand:**

~~~text
pages | row_estimate | cost_by_hand | planner_cost | filtered_by_hand | filtered_planner
128 | 20000 | 328.00 | 328.00 | 378.0000 | 378.00
~~~

**Example 4 — Nested Loop:**

~~~text
QUERY PLAN
Nested Loop  (cost=4.64..44.50 rows=10 width=19)
  ->  Index Scan using gen_customers_pkey on gen_customers c  (cost=0.28..8.29 rows=1 width=13)
        Index Cond: (id = 42)
  ->  Bitmap Heap Scan on gen_orders o  (cost=4.37..36.10 rows=10 width=14)
        Recheck Cond: (customer_id = 42)
        ->  Bitmap Index Scan on gen_orders_customer_idx  (cost=0.00..4.36 rows=10 width=0)
              Index Cond: (customer_id = 42)
~~~

The planner may pick a different plan on other data, versions or settings; always read the plan from your own database.

## 8. A Reading Checklist

1. Find the root and the overall cost; then find the **largest cost jump** between a node and its children. That node is where the work is.
2. Look at the leaves: which tables are scanned how? A Seq Scan with a selective \`Filter\` on a large table is the classic missing-index sign.
3. Check the join types against the row counts: a Nested Loop whose outer side is estimated at thousands of rows deserves a second look.
4. Check \`rows\`: does each estimate look plausible for your data? If not, run \`EXPLAIN ANALYZE\` and compare with actual rows.
5. Look for Sorts and Hashes over big inputs; they may spill to disk (visible only with ANALYZE).

## Common Pitfalls

- **Reading top to bottom as if it were the execution order.** Data flows from the most indented nodes up.
- **Treating cost as milliseconds** or comparing costs across different queries or servers.
- **Trusting \`rows\` blindly.** They are estimates from statistics; a bad estimate is the most common root cause of a bad plan, and only \`EXPLAIN ANALYZE\` reveals it.
- **Running EXPLAIN on a tiny dev database** and expecting the production plan. Plans depend on table sizes and statistics.
- **Forgetting that a parent cost includes its children**, and blaming the root node for work its children did.
- **Running \`EXPLAIN ANALYZE\` on an \`UPDATE\` or \`DELETE\` to "just look"**: ANALYZE executes the statement. Wrap it in \`BEGIN ... ROLLBACK\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN</code> prints the plan the optimizer chose, <strong style="color:#ffca28;">without running the query</strong>. The plan is a tree: each node produces rows for the node above it, so I read from the most indented lines upwards.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Each line:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cost=0.00..378.00 rows=1000 width=19</code>: startup cost (before the first row), total cost (all rows), estimated output rows and bytes per row. Costs are planner units anchored on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seq_page_cost = 1</code>, not milliseconds, and a parent includes its children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The nodes:</strong> <span style="color:#f0e2c8;">Scans read tables (Seq, Index, Index Only, Bitmap). Joins combine two children: <strong style="color:#ffca28;">Nested Loop</strong> (for each outer row probe the inner), <strong style="color:#ffca28;">Hash Join</strong> (build a hash on one side, probe with the other), <strong style="color:#ffca28;">Merge Join</strong> (merge two sorted inputs). Then Sort, Aggregate and Limit on top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What to look for:</strong> <span style="color:#f0e2c8;">The node where the cost jumps most; a Seq Scan on a big table under a selective <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Filter</code>; a Sort or Nested Loop over many rows; and estimated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rows</code> that look wrong, which I confirm with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Proof it is arithmetic:</strong> <span style="color:#f0e2c8;">On a 128-page, 20000-row table the Seq Scan cost is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">128 x 1.0 + 20000 x 0.01 = 328</code>, exactly what EXPLAIN printed, and adding a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">20000 x 0.0025 = 50</code> for 378. Knowing that tells you what the planner thinks is expensive.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is cost measured in milliseconds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is in arbitrary units where one sequential page read costs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seq_page_cost</code> (1.0 by default). It is only useful for comparing plans of the same query on the same server. For real time use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code>, which runs the query.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between startup cost and total cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Startup is the cost before the node can emit its first row; total is the cost to emit all of them. A Sort or a Hash has a high startup (it must consume its whole input first); a Seq Scan starts at 0. With a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code> the planner favours plans with low startup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which side of a Hash Join is built into the hash?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The inner child, shown under the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Hash</code> node. The planner normally hashes the smaller input (2000 customers here) and streams the larger one (orders) past it, probing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Hash Cond</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Filter</code> vs <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Index Cond</code> tell you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Index Cond</code> is used to navigate the index, so only matching entries are read. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Filter</code> is applied after rows are read, so everything is read and the non-matching rows are thrown away; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code> shows how many as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Rows Removed by Filter</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you read a plan in MySQL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">MySQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN</code> prints one row per table in join order with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> (from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> down to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ALL</code>, a full scan), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code>, estimated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rows</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Extra</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN FORMAT=TREE</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code> (MySQL 8.0.18+) print a PostgreSQL-like tree.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Query plan | The tree of steps the optimizer chose for a query |
| EXPLAIN | Shows the plan without running the query |
| Startup cost | Estimated cost before a node returns its first row |
| Total cost | Estimated cost to return all rows, including children |
| Rows (estimated) | Rows the node is expected to output |
| Width | Estimated bytes per output row |
| Nested Loop | Runs the inner child once per outer row |
| Hash Join | Hashes one input, probes it with the other |
| Merge Join | Merges two inputs sorted on the join key |

**Conclusion:** An \`EXPLAIN\` plan is a tree read from the leaves up: scans at the bottom produce rows, joins combine them, and aggregates, sorts and limits shape the result at the root. Each line gives a startup and total cost in planner units (a Seq Scan here was exactly \`128 x 1.0 + 20000 x 0.01 = 328\`), an estimated row count and a row width, and every parent includes its children. Find the node with the biggest cost jump, check how the big tables are read and joined, and treat every \`rows\` number as a claim to verify with \`EXPLAIN ANALYZE\`.`,
    examples: [
      {
        label: `SQLite: EXPLAIN QUERY PLAN for a join with GROUP BY and ORDER BY, and a subquery tree`,
        code: `EXPLAIN QUERY PLAN
SELECT c.country, COUNT(*) AS orders, SUM(o.amount) AS revenue
FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'paid'
GROUP BY c.country
ORDER BY revenue DESC;

-- parent column links child steps to the step they belong to
EXPLAIN QUERY PLAN
SELECT * FROM orders
WHERE customer_id IN (SELECT id FROM customers WHERE country = 'IN');`,
      },
      {
        label: `PostgreSQL: EXPLAIN of a join + aggregate + sort, read from the leaves up`,
        code: `-- 2000 customers and 20000 orders (under 30000 rows, so ANALYZE reads every row)
CREATE TABLE gen_customers AS
SELECT g AS id, 'cust_' || g AS name,
       (ARRAY['IN','US','DE','BR','JP'])[1 + g % 5] AS country
FROM generate_series(1, 2000) AS g;
CREATE TABLE gen_orders AS
SELECT g AS id, 1 + (g * 37) % 2000 AS customer_id,
       (g % 500) + 0.99 AS amount,
       CASE WHEN g % 20 = 0 THEN 'refunded' ELSE 'paid' END AS status
FROM generate_series(1, 20000) AS g;
ALTER TABLE gen_customers ADD PRIMARY KEY (id);
ALTER TABLE gen_orders ADD PRIMARY KEY (id);
CREATE INDEX gen_orders_customer_idx ON gen_orders (customer_id);
VACUUM ANALYZE gen_customers, gen_orders;

EXPLAIN
SELECT c.country, COUNT(*) AS orders, SUM(o.amount) AS revenue
FROM gen_orders o JOIN gen_customers c ON c.id = o.customer_id
WHERE o.status = 'paid'
GROUP BY c.country
ORDER BY revenue DESC;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: recompute a Seq Scan cost by hand from pages, rows and the cost settings`,
        code: `-- 2000 customers and 20000 orders (under 30000 rows, so ANALYZE reads every row)
CREATE TABLE gen_customers AS
SELECT g AS id, 'cust_' || g AS name,
       (ARRAY['IN','US','DE','BR','JP'])[1 + g % 5] AS country
FROM generate_series(1, 2000) AS g;
CREATE TABLE gen_orders AS
SELECT g AS id, 1 + (g * 37) % 2000 AS customer_id,
       (g % 500) + 0.99 AS amount,
       CASE WHEN g % 20 = 0 THEN 'refunded' ELSE 'paid' END AS status
FROM generate_series(1, 20000) AS g;
ALTER TABLE gen_customers ADD PRIMARY KEY (id);
ALTER TABLE gen_orders ADD PRIMARY KEY (id);
CREATE INDEX gen_orders_customer_idx ON gen_orders (customer_id);
VACUUM ANALYZE gen_customers, gen_orders;

-- reads Total Cost out of EXPLAIN (FORMAT JSON)
CREATE FUNCTION plan_cost(q text) RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE j json;
BEGIN
  EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO j;
  RETURN (j -> 0 -> 'Plan' ->> 'Total Cost')::numeric;
END $$;

SELECT c.relpages AS pages,
       c.reltuples::bigint AS row_estimate,
       c.relpages * current_setting('seq_page_cost')::numeric
         + c.reltuples::numeric * current_setting('cpu_tuple_cost')::numeric AS cost_by_hand,
       plan_cost('SELECT * FROM gen_orders') AS planner_cost,
       c.relpages * current_setting('seq_page_cost')::numeric
         + c.reltuples::numeric * (current_setting('cpu_tuple_cost')::numeric
                                   + current_setting('cpu_operator_cost')::numeric) AS filtered_by_hand,
       plan_cost('SELECT * FROM gen_orders WHERE status = ''refunded''') AS filtered_planner
FROM pg_class c WHERE c.relname = 'gen_orders';`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: a selective join becomes a Nested Loop over two index lookups`,
        code: `-- 2000 customers and 20000 orders (under 30000 rows, so ANALYZE reads every row)
CREATE TABLE gen_customers AS
SELECT g AS id, 'cust_' || g AS name,
       (ARRAY['IN','US','DE','BR','JP'])[1 + g % 5] AS country
FROM generate_series(1, 2000) AS g;
CREATE TABLE gen_orders AS
SELECT g AS id, 1 + (g * 37) % 2000 AS customer_id,
       (g % 500) + 0.99 AS amount,
       CASE WHEN g % 20 = 0 THEN 'refunded' ELSE 'paid' END AS status
FROM generate_series(1, 20000) AS g;
ALTER TABLE gen_customers ADD PRIMARY KEY (id);
ALTER TABLE gen_orders ADD PRIMARY KEY (id);
CREATE INDEX gen_orders_customer_idx ON gen_orders (customer_id);
VACUUM ANALYZE gen_customers, gen_orders;

EXPLAIN
SELECT c.name, o.id, o.amount
FROM gen_customers c JOIN gen_orders o ON o.customer_id = c.id
WHERE c.id = 42;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `How do you read EXPLAIN ANALYZE — cost, actual time, rows, and Buffers?`,
    difficulty: "medium",
    seoDescription: `Reading PostgreSQL EXPLAIN ANALYZE: estimates vs actual rows, per-loop time, Buffers hit and read, spills, and how to fix a bad row estimate.`,
    description: `**Question presented to candidate:**
"You run EXPLAIN ANALYZE on a slow query. Explain every number on a node line — cost, actual time, rows, loops — and what the Buffers lines tell you. What patterns tell you where the problem is?"

**What a strong answer should cover:**
- \`EXPLAIN ANALYZE\` **executes** the query and prints, next to each estimate, what really happened: \`actual time=first..last\` in milliseconds, \`rows\` and \`loops\`; \`cost\` and the first \`rows\` are still the planner estimates
- \`rows\` and \`time\` are **per loop**: a node with \`rows=10 loops=5\` produced 50 rows; the inner side of a Nested Loop is where loops matter
- The most useful signal is an **estimate vs actual mismatch** (e.g. 40 expected, 200 actual), usually from stale or missing statistics or correlated columns; fixes are \`ANALYZE\`, a higher statistics target, or \`CREATE STATISTICS\` (PostgreSQL 10+)
- \`BUFFERS\`: \`shared hit\` (found in PostgreSQL shared buffers), \`read\` (fetched from the OS / disk), \`dirtied\`, \`written\`, and \`temp read/written\` for spills; each buffer is an 8 kB page; PostgreSQL 18 shows BUFFERS by default with ANALYZE
- Other lines to read: \`Rows Removed by Filter\`, \`Sort Method: external merge  Disk\` vs \`quicksort  Memory\` (\`work_mem\`), \`Heap Fetches\`, \`Batches\` on a Hash, \`Planning Time\` / \`Execution Time\`
- Cautions: ANALYZE really runs \`INSERT\`/\`UPDATE\`/\`DELETE\` (wrap in \`BEGIN ... ROLLBACK\`), timing has overhead (\`TIMING OFF\`), and the first run may read from disk while later runs hit cache

**Code / implementation expected:** Optional — an EXPLAIN (ANALYZE, BUFFERS) output read line by line, with a misestimate and its fix.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  country TEXT NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status      TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  created_at  TEXT NOT NULL
);
INSERT INTO customers (id, name, country) VALUES
  (1, 'Asha', 'IN'), (2, 'Ben', 'US'), (3, 'Chen', 'DE'), (4, 'Dara', 'IN'), (5, 'Eli', 'US');
INSERT INTO orders (id, customer_id, status, amount, created_at) VALUES
  (1, 1, 'paid', 40.00, '2025-03-01'),
  (2, 2, 'paid', 15.50, '2025-03-01'),
  (3, 1, 'shipped', 99.90, '2025-03-02'),
  (4, 3, 'pending', 12.00, '2025-03-03'),
  (5, 4, 'paid', 60.00, '2025-03-03'),
  (6, 2, 'refunded', 15.50, '2025-03-04'),
  (7, 1, 'paid', 25.00, '2025-03-05'),
  (8, 5, 'pending', 80.00, '2025-03-06'),
  (9, 3, 'paid', 45.00, '2025-03-07'),
  (10, 4, 'shipped', 33.00, '2025-03-08');
CREATE INDEX orders_customer_idx ON orders (customer_id);
\`\`\``,
    answer: `**Target Audience:** Developers who can read a plain [EXPLAIN plan](/interview-question/how-do-you-read-an-explain-query-plan) and now need to interpret the actual-execution numbers, and candidates who will be handed an EXPLAIN ANALYZE output in an interview.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 for every EXPLAIN ANALYZE output (tables generated inside each example), SQLite 3.45.0 through sql.js 1.10.2 for the runnable example. Facts about PostgreSQL 10 and 18 are cited from the release notes.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by running it; the **Verified** section quotes each example output in full. Timing is switched off in the verified examples (\`TIMING OFF\`) so that the output is the same on every run; one real timed run is shown separately in section 3.

## 1. Why This Even Matters — A Story First

A builder quotes you three days for a kitchen. That is \`EXPLAIN\`: a plan with estimates. Afterwards you get a timesheet: "day one, plumbing, took two days because the pipes were in a different place than the drawings showed". That is \`EXPLAIN ANALYZE\`.

The timesheet is useful not because it is long, but because you can lay it next to the quote and see **where reality and the plan disagreed**. The drawings were wrong (bad statistics), so the plumbing (one plan node) blew up and everything after it was late. Reading EXPLAIN ANALYZE well is exactly that comparison, done node by node.

## 2. Estimate and Actual on One Line

<svg class="iq-diagram" width="100%" viewBox="0 0 780 200" role="img" aria-label="One EXPLAIN ANALYZE line has two halves: the planner estimate in the first parentheses and what really happened in the second">
  <rect class="d-box-muted" x="20" y="30" width="350" height="140" rx="12"/>
  <text class="d-text" x="195" y="62" text-anchor="middle">estimate (planner)</text>
  <text class="d-sub" x="195" y="96" text-anchor="middle">cost = startup .. total</text>
  <text class="d-sub" x="195" y="120" text-anchor="middle">rows = expected rows</text>
  <text class="d-sub" x="195" y="144" text-anchor="middle">width = bytes per row</text>
  <rect class="d-box-accent" x="410" y="30" width="350" height="140" rx="12"/>
  <text class="d-text" x="585" y="62" text-anchor="middle">actual (execution)</text>
  <text class="d-sub" x="585" y="96" text-anchor="middle">time = first row .. last row, ms</text>
  <text class="d-sub" x="585" y="120" text-anchor="middle">rows = real rows per loop</text>
  <text class="d-sub" x="585" y="144" text-anchor="middle">loops = times the node ran</text>
</svg>

📌 **Interview term: EXPLAIN ANALYZE** — runs the statement for real, discards the result rows, and prints the plan with actual measurements next to the estimates. In PostgreSQL it is written \`EXPLAIN (ANALYZE)\` or \`EXPLAIN ANALYZE\`; options combine as \`EXPLAIN (ANALYZE, BUFFERS)\`.

The second example joins 5 customers to their orders. With \`TIMING OFF\` the actual part shows only rows and loops:

~~~text
QUERY PLAN
Nested Loop  (cost=4.64..175.53 rows=50 width=19) (actual rows=50 loops=1)
  Buffers: shared hit=62 read=1
  ->  Index Scan using gen_customers_pkey on gen_customers c  (cost=0.28..8.38 rows=5 width=13) (actual rows=5 loops=1)
        Index Cond: ((id >= 100) AND (id <= 104))
        Buffers: shared hit=3
  ->  Bitmap Heap Scan on gen_orders o  (cost=4.37..33.33 rows=10 width=14) (actual rows=10 loops=5)
        Recheck Cond: (c.id = customer_id)
        Heap Blocks: exact=50
        Buffers: shared hit=59 read=1
        ->  Bitmap Index Scan on gen_orders_customer_idx  (cost=0.00..4.36 rows=10 width=0) (actual rows=10 loops=5)
              Index Cond: (customer_id = c.id)
              Buffers: shared hit=9 read=1
Planning:
  Buffers: shared hit=76 read=6
~~~

Read the inner \`Bitmap Heap Scan on gen_orders o\`:

- \`(cost=4.37..33.33 rows=10 width=14)\` — the **estimate**: about 10 orders per customer.
- \`(actual rows=10 loops=5)\` — it ran **5 times** (once per customer from the outer Index Scan) and returned **10 rows per run**, so 50 in total, which is what the Nested Loop reports (\`actual rows=50\`).

📌 **Interview term: loops** — how many times a node was executed. \`actual rows\` and \`actual time\` are **averages per loop**, so multiply by \`loops\` for the node total. This matters most on the inner side of a Nested Loop, where a "fast" node can run a million times.

📌 **Interview term: actual rows** — rows the node really produced (per loop). Comparing it with the estimated \`rows\` is the single most useful check in EXPLAIN ANALYZE.

Here every estimate matched (rows=5 vs 5, rows=10 vs 10, rows=50 vs 50), because the generated tables are small enough for \`ANALYZE\` to read every row. Real tables are rarely this kind.

## 3. Actual Time, Planning Time, Execution Time

A sort of all 20000 orders with timing on (one real run on this machine; the times will differ on every run and every machine):

~~~sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM gen_orders ORDER BY amount;
~~~

~~~text
QUERY PLAN
Sort  (cost=1756.77..1806.77 rows=20000 width=19) (actual time=5.003..5.900 rows=20000 loops=1)
  Sort Key: amount
  Sort Method: quicksort  Memory: 1706kB
  Buffers: shared hit=128
  ->  Seq Scan on gen_orders  (cost=0.00..328.00 rows=20000 width=19) (actual time=0.002..1.162 rows=20000 loops=1)
        Buffers: shared hit=128
Planning:
  Buffers: shared hit=27
Planning Time: 0.085 ms
Execution Time: 6.711 ms
~~~

📌 **Interview term: actual time** — \`actual time=first..last\` in **milliseconds, per loop**: time until the node returned its first row, and until it returned its last. The Sort first-row time is close to its last-row time because it must read and sort all its input before emitting anything; the Seq Scan starts emitting almost at once. A parent time includes its children, so the Sort time minus the Seq Scan time is roughly the sorting itself.

📌 **Interview term: Planning Time / Execution Time** — time spent choosing the plan, and time spent running it (including the per-node timing overhead). These are the \`SUMMARY\` lines, which the verified examples switch off.

Timing every row has a cost of its own. \`TIMING OFF\` keeps the row counts and loops but skips the per-node clock calls, which is why the documentation-style examples here use it.

## 4. When Estimates Are Wrong

The third example filters customers on two columns that are not independent: in this data the city decides the country (every Mumbai customer is in IN):

~~~text
QUERY PLAN
Seq Scan on gen_customers  (cost=0.00..43.00 rows=40 width=4) (actual rows=200 loops=1)
  Filter: ((country = 'IN'::text) AND (city = 'Mumbai'::text))
  Rows Removed by Filter: 1800
~~~

- Estimated \`rows=40\`, actual \`rows=200\`: **a 5x underestimate**.
- Why 40: the planner knows \`country = 'IN'\` keeps 1/5 of the 2000 rows and \`city = 'Mumbai'\` keeps 1/10, and by default multiplies them as if they were unrelated: 2000 x 1/5 x 1/10 = 40. But all 200 Mumbai rows are IN rows.
- \`Rows Removed by Filter: 1800\` — rows read and discarded by the \`Filter\`.

📌 **Interview term: cardinality estimate** — the planner's guess of how many rows a node returns. When it is wrong, everything above it is planned for the wrong size: a Nested Loop chosen for "40 rows" may run against 200 thousand.

📌 **Interview term: extended statistics** — \`CREATE STATISTICS\` tells \`ANALYZE\` to measure relationships between columns (\`dependencies\`, \`ndistinct\`, \`mcv\`). Added in PostgreSQL 10 together with the \`CREATE STATISTICS\` command ([pgsql-hackers: v10 release notes for extended stats](https://www.postgresql.org/message-id/20201219193927.GD30237%40telsasoft.com)); the three kinds are documented in [CREATE STATISTICS](https://www.postgresql.org/docs/18/sql-createstatistics.html). With a dependency statistic:

~~~sql
CREATE STATISTICS gen_customers_geo (dependencies) ON country, city FROM gen_customers;
ANALYZE gen_customers;
~~~

~~~text
QUERY PLAN
Seq Scan on gen_customers  (cost=0.00..43.00 rows=200 width=4) (actual rows=200 loops=1)
  Filter: ((country = 'IN'::text) AND (city = 'Mumbai'::text))
  Rows Removed by Filter: 1800
~~~

The estimate is now exactly 200. On a 20-row lookup that changes nothing; feeding a join, it can change the join type and the whole plan. The documentation notes that extended statistics are not used for join selectivity estimates.

**How to find the problem in a big plan:** go to the lowest (most indented) node where estimated and actual rows differ by an order of magnitude. Above that node, everything is planned on wrong numbers, so fix the lowest one first. The usual causes: statistics not refreshed after a bulk load (run \`ANALYZE\`), skewed values that the default sample misses (raise the column statistics target), correlated columns (extended statistics), and functions or casts in the filter (an expression index gives the planner statistics on the expression).

## 5. Buffers: Counting Pages, Not Milliseconds

<svg class="iq-diagram" width="100%" viewBox="0 0 780 200" role="img" aria-label="Where a page comes from: shared buffers is a hit, otherwise a read from the operating system cache or disk">
  <defs>
    <marker id="sql15q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="93" text-anchor="middle">plan node</text>
  <text class="d-sub" x="110" y="117" text-anchor="middle">needs a page</text>
  <rect class="d-box-accent" x="290" y="60" width="200" height="80" rx="10"/>
  <text class="d-text" x="390" y="93" text-anchor="middle">shared buffers</text>
  <text class="d-sub" x="390" y="117" text-anchor="middle">found: shared hit</text>
  <rect class="d-box-muted" x="580" y="60" width="180" height="80" rx="10"/>
  <text class="d-text" x="670" y="93" text-anchor="middle">OS cache or disk</text>
  <text class="d-sub" x="670" y="117" text-anchor="middle">missing: read</text>
  <path class="d-edge" d="M 204 100 L 284 100" marker-end="url(#sql15q5-arrow)"/>
  <path class="d-edge-dashed" d="M 494 100 L 574 100" marker-end="url(#sql15q5-arrow)"/>
</svg>

📌 **Interview term: shared buffers** — PostgreSQL own page cache in shared memory. Each buffer holds one 8 kB page.

📌 **Interview term: Buffers: shared hit / read / dirtied / written** — per node, the pages found in shared buffers (**hit**), requested from the operating system because they were not (**read**; the OS may still have had them cached), modified by this query (**dirtied**), and written out by this query to make room (**written**).

In the second example, \`Buffers: shared hit=62 read=1\` on the Nested Loop means 63 page visits for 50 rows: 3 for the customer index scan, 59 hits and 1 read for the five bitmap scans of orders (9 hits and 1 read of them on the index). \`Heap Blocks: exact=50\` says the 50 orders were on 50 different pages, so each order cost one page. The \`Planning:\` section reports buffers used while planning (catalog lookups).

Compare a Hash Join over 19 customers (an extra run):

~~~text
QUERY PLAN
Hash Join  (cost=8.85..389.46 rows=190 width=19) (actual rows=190 loops=1)
  Hash Cond: (o.customer_id = c.id)
  Buffers: shared hit=131
  ->  Seq Scan on gen_orders o  (cost=0.00..328.00 rows=20000 width=14) (actual rows=20000 loops=1)
        Buffers: shared hit=128
  ->  Hash  (cost=8.61..8.61 rows=19 width=13) (actual rows=19 loops=1)
        Buckets: 1024  Batches: 1  Memory Usage: 9kB
        Buffers: shared hit=3
        ->  Index Scan using gen_customers_pkey on gen_customers c  (cost=0.28..8.61 rows=19 width=13) (actual rows=19 loops=1)
              Index Cond: (id < 20)
              Buffers: shared hit=3
Planning:
  Buffers: shared hit=76 read=6
~~~

\`shared hit=128\` on the Seq Scan is the entire 128-page orders table, read to find 190 rows. That one number says "full scan" more clearly than any timing could. The Hash line also shows \`Buckets: 1024  Batches: 1  Memory Usage: 9kB\`: one batch means the hash fit in \`work_mem\`; more than one batch means it spilled to disk.

Why buffers beat time for comparing plans: time depends on machine load and on how warm the cache is; page counts depend only on the plan and the data. A plan that touches 63 pages beats one that touches 131, on any machine. (The counts here were the same on every run in a fresh database; on a busy server hit vs read will shift as the cache changes, but their sum will not.)

PostgreSQL 18 makes \`BUFFERS\` the default for \`EXPLAIN ANALYZE\`, so on 18 and later these lines appear without asking ([depesz: Enable BUFFERS with EXPLAIN ANALYZE by default](https://www.depesz.com/2025/01/15/waiting-for-postgresql-18-enable-buffers-with-explain-analyze-by-default/)). On PostgreSQL 16, as here, you must write \`BUFFERS\`.

### Temp buffers: spills

The fourth example sorts 20000 orders with only 64 kB of \`work_mem\`:

~~~text
QUERY PLAN
Sort (actual rows=20000 loops=1)
  Sort Key: amount
  Sort Method: external merge  Disk: 608kB
  Buffers: shared hit=128, temp read=151 written=173
  ->  Seq Scan on gen_orders (actual rows=20000 loops=1)
        Buffers: shared hit=128
Planning:
  Buffers: shared hit=27
~~~

📌 **Interview term: Sort Method** — how the sort ran. \`external merge  Disk: 608kB\` means the data did not fit in \`work_mem\`, so PostgreSQL wrote sorted runs to temporary files and merged them, shown as \`temp read=151 written=173\` buffers. With the default \`work_mem\` the same sort stayed in memory:

~~~text
QUERY PLAN
Sort (actual rows=20000 loops=1)
  Sort Key: amount
  Sort Method: quicksort  Memory: 1706kB
  Buffers: shared hit=128
  ->  Seq Scan on gen_orders (actual rows=20000 loops=1)
        Buffers: shared hit=128
Planning:
  Buffers: shared hit=27
~~~

\`quicksort  Memory: 1706kB\`, and no temp buffers. A spill is not always wrong, but an \`external merge\` on a hot query is a signal to raise \`work_mem\` for that query or sort fewer rows.

## 6. EXPLAIN ANALYZE Runs the Statement

For \`INSERT\`, \`UPDATE\` and \`DELETE\`, ANALYZE really changes the data. Wrap it in a transaction and roll back:

~~~sql
BEGIN;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
DELETE FROM gen_orders WHERE status = 'refunded';
ROLLBACK;
SELECT count(*) AS refunded_still_there FROM gen_orders WHERE status = 'refunded';
~~~

~~~text
QUERY PLAN
Delete on gen_orders (actual rows=0 loops=1)
  ->  Seq Scan on gen_orders (actual rows=1000 loops=1)
        Filter: (status = 'refunded'::text)
        Rows Removed by Filter: 19000
refunded_still_there
1000
~~~

The Seq Scan fed 1000 rows to the \`Delete\` node (which returns no rows itself, hence its \`rows=0\`), so the delete really happened; after the rollback all 1000 are still there. Any triggers and foreign key checks also run during the ANALYZE execution.

## 7. SQLite: Statistics Without EXPLAIN ANALYZE

SQLite has no EXPLAIN ANALYZE, and sql.js exposes no per-step counters; you time the statement from the application. What it shares with PostgreSQL is the source of its estimates: \`ANALYZE\` writes statistics that the planner reads. The first example:

~~~text
tbl | idx | stat
customers | NULL | 5
orders | orders_customer_idx | 10 2

id | parent | notused | detail
4 | 0 | 0 | SCAN c
8 | 0 | 0 | SEARCH o USING INDEX orders_customer_idx (customer_id=?)
~~~

\`customers | NULL | 5\` is the row count of a table without other indexes; \`orders | orders_customer_idx | 10 2\` means 10 rows and about 2 rows per \`customer_id\` value. That "2 rows per key" is SQLite's equivalent of PostgreSQL's estimated \`rows\`, and it is why the plan searches orders through the index once per customer.

## 8. Verified: Running the Code

Example 1 ran on sql.js 1.10.2 (SQLite 3.45.0) on the schema above. Examples 2 to 4 ran on PostgreSQL 16.15, each in a fresh throwaway database; the generated tables are under 30000 rows so \`ANALYZE\` reads them fully, \`TIMING OFF\` and \`SUMMARY OFF\` remove the timings, and the outputs were identical on repeated runs.

**Example 1 — SQLite statistics:**

~~~text
tbl | idx | stat
customers | NULL | 5
orders | orders_customer_idx | 10 2

id | parent | notused | detail
4 | 0 | 0 | SCAN c
8 | 0 | 0 | SEARCH o USING INDEX orders_customer_idx (customer_id=?)
~~~

**Example 2 — Nested Loop with loops and buffers:**

~~~text
QUERY PLAN
Nested Loop  (cost=4.64..175.53 rows=50 width=19) (actual rows=50 loops=1)
  Buffers: shared hit=62 read=1
  ->  Index Scan using gen_customers_pkey on gen_customers c  (cost=0.28..8.38 rows=5 width=13) (actual rows=5 loops=1)
        Index Cond: ((id >= 100) AND (id <= 104))
        Buffers: shared hit=3
  ->  Bitmap Heap Scan on gen_orders o  (cost=4.37..33.33 rows=10 width=14) (actual rows=10 loops=5)
        Recheck Cond: (c.id = customer_id)
        Heap Blocks: exact=50
        Buffers: shared hit=59 read=1
        ->  Bitmap Index Scan on gen_orders_customer_idx  (cost=0.00..4.36 rows=10 width=0) (actual rows=10 loops=5)
              Index Cond: (customer_id = c.id)
              Buffers: shared hit=9 read=1
Planning:
  Buffers: shared hit=76 read=6
~~~

**Example 3 — misestimate from correlated columns:**

~~~text
QUERY PLAN
Seq Scan on gen_customers  (cost=0.00..43.00 rows=40 width=4) (actual rows=200 loops=1)
  Filter: ((country = 'IN'::text) AND (city = 'Mumbai'::text))
  Rows Removed by Filter: 1800
~~~

**Example 4 — sort spill:**

~~~text
QUERY PLAN
Sort (actual rows=20000 loops=1)
  Sort Key: amount
  Sort Method: external merge  Disk: 608kB
  Buffers: shared hit=128, temp read=151 written=173
  ->  Seq Scan on gen_orders (actual rows=20000 loops=1)
        Buffers: shared hit=128
Planning:
  Buffers: shared hit=27
~~~

The planner may pick a different plan on other data or settings; the reading technique is the same.

## 9. A Field Guide to EXPLAIN ANALYZE Lines

| You see | It means | First thing to try |
| :--- | :--- | :--- |
| Estimated rows far from actual rows | Bad cardinality estimate | \`ANALYZE\`, higher statistics target, \`CREATE STATISTICS\` |
| \`loops\` in the thousands on an inner node | Nested Loop over many outer rows | Check the outer estimate; consider a hash join or an index |
| \`Rows Removed by Filter\` close to rows read | Reading far more than needed | An index on the filter column |
| \`Sort Method: external merge  Disk\` | Sort spilled past \`work_mem\` | Raise \`work_mem\` for that query, or an index that delivers order |
| Hash \`Batches\` greater than 1 | Hash join spilled | More \`work_mem\`, or hash the smaller side |
| \`Heap Fetches\` near actual rows | Index Only Scan visiting the heap | \`VACUUM\` (see [INCLUDE and heap fetches](/interview-question/covering-indexes-include-and-bitmap-heap-scans-how-do-you-eliminate-heap-fetches)) |
| \`shared read\` large, \`hit\` small | Data not in cache | Normal on the first run; compare a second run |

For the full diagnosis flow on a big table, see [EXPLAIN ANALYZE shows Seq Scan on a 10M-row table](/interview-question/explain-analyze-shows-seq-scan-on-a-10m-row-table-how-do-you-diagnose-and-fix-it).

## Common Pitfalls

- **Forgetting that rows and time are per loop**, and missing that a node with \`rows=1\` ran 100000 times.
- **Running EXPLAIN ANALYZE on DML without a rollback.** It deletes the rows.
- **Comparing timings between a cold run and a warm run.** The first run reads pages; the second hits them. Compare buffer totals, or warm up first.
- **Fixing the top of the plan** when the root cause is the lowest node with a bad estimate.
- **Forgetting \`BUFFERS\` on PostgreSQL 17 and older**: without it you cannot tell a full scan from a cheap one except by time.
- **Using EXPLAIN ANALYZE on a query that takes an hour** to find out why it takes an hour. Start with plain \`EXPLAIN\`, then analyze a smaller version or use \`auto_explain\` on the server.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it adds:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code> <strong style="color:#ffca28;">runs</strong> the query and prints the actual numbers next to the estimates: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(cost=... rows=40 ...) (actual time=0.01..0.52 rows=200 loops=1)</code>. The first parentheses are the plan, the second are reality.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Per loop:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">actual rows</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">time</code> are <strong style="color:#ffca28;">averages per loop</strong>. A Bitmap Heap Scan with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rows=10 loops=5</code> returned 50 rows in total, once per outer customer of a Nested Loop. Always multiply before judging a node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Estimates vs actual:</strong> <span style="color:#f0e2c8;">The first thing I look for is the lowest node where estimated and actual rows diverge a lot. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">country = 'IN' AND city = 'Mumbai'</code> was estimated at 40 rows and returned 200, because the planner multiplies selectivities as if the columns were independent. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE STATISTICS ... (dependencies)</code> fixed it to 200.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Buffers:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BUFFERS</code> every node reports pages: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shared hit</code> (already in PostgreSQL memory), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> (fetched from the OS or disk), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dirtied</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">written</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">temp read/written</code> for spills. Pages are 8 kB, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hit=128</code> is 1 MB touched. Buffers do not vary with machine speed, which makes them better than time for comparing plans.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Other tells:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Rows Removed by Filter</code> in the millions means a missing index; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Sort Method: external merge  Disk</code> means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">work_mem</code> is too small for that sort; a Hash with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Batches</code> above 1 spilled too. And I remember ANALYZE executes DML, so I wrap it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN ... ROLLBACK</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can EXPLAIN ANALYZE make a query look slower than it is?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Timing every row has overhead, especially on systems with slow clocks and for nodes that produce millions of rows. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN (ANALYZE, TIMING OFF)</code> keeps row counts but drops per-node timing; the total execution time is still reported.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shared hit</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">read</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A hit was found in PostgreSQL shared buffers. A read was requested from the operating system, which may still have served it from its own page cache, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> does not prove a physical disk read. Run the query twice: the second run usually turns reads into hits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you fix a bad row estimate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">First <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ANALYZE</code> the table (stale statistics after a bulk load are the commonest cause). For skewed columns raise the target: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ALTER TABLE t ALTER COLUMN c SET STATISTICS 1000</code>. For correlated columns use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE STATISTICS</code> (PostgreSQL 10+). For expressions, an expression index also gets its own statistics.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">actual time</code> start at a non-zero value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first number is the time to the node first row, the second to its last row, in milliseconds, per loop. A Sort or Hash must read its whole input before emitting anything, so its first-row time is close to its last-row time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it safe to run EXPLAIN ANALYZE in production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code> it costs one real execution, so not for a query that takes an hour. For DML it changes data unless rolled back. Use plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN</code> first, run ANALYZE on a replica or a copy when possible, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto_explain</code> to capture plans of slow queries as they happen.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| EXPLAIN ANALYZE | Runs the statement and prints actual numbers next to the estimates |
| actual time | Milliseconds to first and last row, per loop |
| actual rows | Rows the node really returned, per loop |
| loops | Times the node was executed |
| Planning / Execution Time | Time to plan, and time to run |
| Cardinality estimate | The planner guess of rows returned |
| Extended statistics | \`CREATE STATISTICS\` on column relationships (PostgreSQL 10+) |
| Shared buffers | PostgreSQL page cache; one buffer is one 8 kB page |
| shared hit / read / dirtied / written | Pages found in cache / fetched from the OS / modified / written out |
| Sort Method | \`quicksort  Memory\` in \`work_mem\`, or \`external merge  Disk\` when it spilled |

**Conclusion:** \`EXPLAIN ANALYZE\` puts the planner estimate and the real execution side by side on every node: \`cost\` and the first \`rows\` are the plan, \`actual time\`, \`rows\` and \`loops\` are what happened, and rows and time are per loop. Read it bottom-up looking for the lowest node where estimated and actual rows diverge (here 40 vs 200, fixed by \`CREATE STATISTICS\`), then use \`BUFFERS\` to count the pages each node really touched (the full 128-page scan stands out at once), and watch for spills such as \`external merge  Disk\`. Wrap DML in a rollback, prefer buffers over milliseconds for comparisons, and remember that PostgreSQL 18 shows buffers by default.`,
    examples: [
      {
        label: `SQLite: no EXPLAIN ANALYZE, but ANALYZE stores the statistics its planner estimates from`,
        code: `-- gather statistics: rows per table and rows per distinct index key
ANALYZE;

-- 'orders_customer_idx | 10 2' means 10 rows, about 2 rows per customer_id
SELECT tbl, idx, stat FROM sqlite_stat1 ORDER BY tbl, idx;

EXPLAIN QUERY PLAN
SELECT c.name, o.amount
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.name = 'Asha';`,
      },
      {
        label: `PostgreSQL: EXPLAIN (ANALYZE, BUFFERS) on a Nested Loop: rows are per loop`,
        code: `-- 2000 customers (city decides country) and 20000 orders
CREATE TABLE gen_customers AS
SELECT g AS id, 'cust_' || g AS name,
       (ARRAY['IN','US','DE','BR','JP'])[1 + g % 5] AS country,
       (ARRAY['Pune','Austin','Berlin','Recife','Osaka','Mumbai','Boston','Munich','Rio','Kyoto'])[1 + g % 10] AS city
FROM generate_series(1, 2000) AS g;
CREATE TABLE gen_orders AS
SELECT g AS id, 1 + (g * 37) % 2000 AS customer_id,
       (g % 500) + 0.99 AS amount,
       CASE WHEN g % 20 = 0 THEN 'refunded' ELSE 'paid' END AS status
FROM generate_series(1, 20000) AS g;
ALTER TABLE gen_customers ADD PRIMARY KEY (id);
ALTER TABLE gen_orders ADD PRIMARY KEY (id);
CREATE INDEX gen_orders_customer_idx ON gen_orders (customer_id);
VACUUM ANALYZE gen_customers, gen_orders;

EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY OFF)
SELECT c.name, o.id, o.amount
FROM gen_customers c JOIN gen_orders o ON o.customer_id = c.id
WHERE c.id BETWEEN 100 AND 104;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: a 5x row misestimate from two correlated columns`,
        code: `-- 2000 customers (city decides country) and 20000 orders
CREATE TABLE gen_customers AS
SELECT g AS id, 'cust_' || g AS name,
       (ARRAY['IN','US','DE','BR','JP'])[1 + g % 5] AS country,
       (ARRAY['Pune','Austin','Berlin','Recife','Osaka','Mumbai','Boston','Munich','Rio','Kyoto'])[1 + g % 10] AS city
FROM generate_series(1, 2000) AS g;
CREATE TABLE gen_orders AS
SELECT g AS id, 1 + (g * 37) % 2000 AS customer_id,
       (g % 500) + 0.99 AS amount,
       CASE WHEN g % 20 = 0 THEN 'refunded' ELSE 'paid' END AS status
FROM generate_series(1, 20000) AS g;
ALTER TABLE gen_customers ADD PRIMARY KEY (id);
ALTER TABLE gen_orders ADD PRIMARY KEY (id);
CREATE INDEX gen_orders_customer_idx ON gen_orders (customer_id);
VACUUM ANALYZE gen_customers, gen_orders;

-- city decides country, but the planner assumes they are independent
EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF)
SELECT id FROM gen_customers WHERE country = 'IN' AND city = 'Mumbai';`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: a sort that does not fit in work_mem spills to disk (temp buffers)`,
        code: `-- 2000 customers (city decides country) and 20000 orders
CREATE TABLE gen_customers AS
SELECT g AS id, 'cust_' || g AS name,
       (ARRAY['IN','US','DE','BR','JP'])[1 + g % 5] AS country,
       (ARRAY['Pune','Austin','Berlin','Recife','Osaka','Mumbai','Boston','Munich','Rio','Kyoto'])[1 + g % 10] AS city
FROM generate_series(1, 2000) AS g;
CREATE TABLE gen_orders AS
SELECT g AS id, 1 + (g * 37) % 2000 AS customer_id,
       (g % 500) + 0.99 AS amount,
       CASE WHEN g % 20 = 0 THEN 'refunded' ELSE 'paid' END AS status
FROM generate_series(1, 20000) AS g;
ALTER TABLE gen_customers ADD PRIMARY KEY (id);
ALTER TABLE gen_orders ADD PRIMARY KEY (id);
CREATE INDEX gen_orders_customer_idx ON gen_orders (customer_id);
VACUUM ANALYZE gen_customers, gen_orders;

SET work_mem = '64kB';

EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT * FROM gen_orders ORDER BY amount;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
