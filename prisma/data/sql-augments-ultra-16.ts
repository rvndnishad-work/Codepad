/**
 * SQL ULTRA — batch 16: Performance and architecture (diagnosing a Seq Scan on a
 * huge table, optimising a slow query, table partitioning, OLTP vs OLAP).
 * Every example was run by scripts/verify-sql-examples.ts (sql.js 1.10.2 like the
 * page, PostgreSQL 16 for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `EXPLAIN ANALYZE shows Seq Scan on a 10M-row table — how do you diagnose and fix it?`,
    difficulty: "medium",
    seoDescription: `Diagnose a Seq Scan on a huge table: check selectivity, find non-sargable predicates and stale statistics, add the right index CONCURRENTLY, re-measure.`,
    description: `**Question presented to candidate:**
"You run \`EXPLAIN ANALYZE\` on a slow query against a 10-million-row orders table and the plan says \`Seq Scan\`. Walk me through how you decide whether that is actually wrong, how you find the cause, and how you fix it safely in production."

**What a strong answer should cover:**
- A Seq Scan is not automatically a bug: compare the rows the query returns with the rows in the table, and the planner estimate (\`rows=\`) with the actual count; for a large share of the table a Seq Scan is the cheapest plan
- The signal that an index is missing or unusable: very few \`actual rows\` but a huge \`Rows Removed by Filter\` and a buffer count close to the whole table
- The common causes: no index on the filtered column; an index that cannot be used because the column is wrapped in a function, cast or wrong-typed literal (non-sargable predicate), a leading-wildcard \`LIKE\`, an \`OR\` across columns, the wrong column order in a composite index; stale statistics that make the planner over-estimate the matching rows
- The fixes: a matching (or expression / composite / partial) index built with \`CREATE INDEX CONCURRENTLY\`, rewriting the predicate so the bare column is compared, \`ANALYZE\` and a higher statistics target, then re-running \`EXPLAIN (ANALYZE, BUFFERS)\` to prove the change
- Using \`SET enable_seqscan = off\` only as a diagnostic in one session, never as the fix; checking cost settings such as \`random_page_cost\` on SSD storage

**Clarifying questions expected:**
- How many rows does the query return, and how many rows does the table have?
- Is this query new or did it get slow recently (data growth, a deploy, a bulk load)?
- Can we add an index on this table online, and how write-heavy is it?

**Code / implementation expected:** Yes — read the plan, create the right index (or rewrite the predicate, or \`ANALYZE\`) and show the plan change.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  country TEXT NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TEXT NOT NULL
);
INSERT INTO users (id, email, country) VALUES
  (1, 'Alice@Example.com', 'IN'),
  (2, 'bob@example.com', 'US'),
  (3, 'chen@example.com', 'SG'),
  (4, 'dana@example.com', 'US'),
  (5, 'eve@example.com', 'IN'),
  (6, 'farid@example.com', 'AE');
INSERT INTO orders (id, user_id, status, amount, created_at) VALUES
  (1, 1, 'shipped', 120, '2024-01-05'),
  (2, 2, 'shipped', 80, '2024-01-09'),
  (3, 3, 'pending', 45, '2024-02-11'),
  (4, 1, 'shipped', 300, '2024-02-14'),
  (5, 4, 'cancelled', 60, '2024-03-02'),
  (6, 5, 'shipped', 95, '2024-03-08'),
  (7, 3, 'shipped', 210, '2024-03-21'),
  (8, 6, 'pending', 30, '2024-04-01'),
  (9, 2, 'shipped', 150, '2024-04-03'),
  (10, 1, 'pending', 75, '2024-04-07');
\`\`\``,
    answer: `**Target Audience:** Developers who have just seen \`Seq Scan\` in a plan and want a repeatable way to decide whether it is a problem, and candidates preparing for the "walk me through it" version of this question.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 (all plans on this page were produced on it) and SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable example on this page uses). The diagnosis applies to MySQL and SQL Server too (\`EXPLAIN\` / actual execution plans); their plan wording differs.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every plan and error shown was produced by running it; the **Verified** section quotes the example output in full. The tables here have 200,000 rows, not 10 million, so the examples run in a second; the plan shapes are the same, and section 7 says what changes at 10M.

This page is the applied, step-by-step scenario. For the theory of why the planner picks each scan type, see [Seq Scan vs Index Scan vs Index-Only Scan — when does Postgres choose each?](/interview-question/seq-scan-vs-index-scan-vs-index-only-scan-when-does-postgres-choose-each); for reading every field of the output, see [How do you read EXPLAIN ANALYZE — cost, actual time, rows, and Buffers?](/interview-question/how-do-you-read-explain-analyze-cost-actual-time-rows-and-buffers).

## 1. Why This Even Matters — A Story First

You ask a librarian for the 10 books written by one author. She walks every aisle of a library of 10 million books, picks up each one, reads the spine and puts back 9,999,990 of them. You get your 10 books an hour later.

There are three possible explanations, and each has a different fix:

1. **There is no author catalogue.** She has no choice. Build the catalogue (an index).
2. **There is a catalogue, but you asked the wrong way.** You asked for "authors whose name, written in lower case, is ..." and the catalogue is sorted by the name as printed. She cannot use it. Ask the way the catalogue is sorted, or build a lower-case catalogue.
3. **She believes the author wrote half the library.** Her notes about the collection are a year old. If half the books really matched, walking the aisles would be the right call. Update her notes (statistics).

And sometimes there is a fourth answer: you really did ask for half the library, and walking the aisles **is** the fastest way. The job is to tell these cases apart before changing anything.

📌 **Interview term: Seq Scan (sequential scan)** — a plan node that reads every page of the table in physical order and tests each row against the filter. Its cost grows with the table size, not with the number of rows returned.

📌 **Interview term: Index Scan / Bitmap Heap Scan** — plan nodes that first look up matching row locations in an index, then fetch only those table pages. A Bitmap Heap Scan collects the locations first and reads the pages in physical order; PostgreSQL prefers it when more than a handful of rows match.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 300" role="img" aria-label="Seq Scan reads every page of the table to return 10 rows. An index lookup reads a few index pages and then only the table pages that hold the 10 rows">
  <defs>
    <marker id="sql16q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="200" y="30" text-anchor="middle">Seq Scan</text>
  <rect class="d-box-accent" x="40" y="50" width="320" height="110" rx="10"/>
  <text class="d-text" x="200" y="95" text-anchor="middle">read all 1471 pages</text>
  <text class="d-sub" x="200" y="125" text-anchor="middle">test every row against the filter</text>
  <rect class="d-box-muted" x="100" y="210" width="200" height="60" rx="10"/>
  <text class="d-text" x="200" y="245" text-anchor="middle">10 rows kept</text>
  <line class="d-edge-accent" x1="200" y1="164" x2="200" y2="202" marker-end="url(#sql16q1-arrow)"/>
  <text class="d-text" x="620" y="30" text-anchor="middle">Index lookup</text>
  <rect class="d-box" x="460" y="50" width="320" height="110" rx="10"/>
  <text class="d-text" x="620" y="95" text-anchor="middle">2 index pages</text>
  <text class="d-sub" x="620" y="125" text-anchor="middle">then 10 table pages</text>
  <rect class="d-box-muted" x="520" y="210" width="200" height="60" rx="10"/>
  <text class="d-text" x="620" y="245" text-anchor="middle">10 rows kept</text>
  <line class="d-edge" x1="620" y1="164" x2="620" y2="202" marker-end="url(#sql16q1-arrow)"/>
</svg>

The numbers are from the 200,000-row table used below: the Seq Scan touched 1,471 table pages (\`Buffers: shared hit=1471\`), the index lookup 2 index pages plus 10 table pages (\`Buffers: shared hit=10 read=2\`).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many rows does the query return, out of how many? | If it returns 30% of the table, the Seq Scan is probably correct and an index will not help |
| Did it get slow suddenly? | Sudden means a changed plan: a bulk load, a deploy that changed the predicate, or stale statistics |
| What does the full \`WHERE\` clause look like, including how the app passes parameters? | Casts, functions and type mismatches make an existing index unusable |
| Can we build an index online, and how write-heavy is the table? | Each index slows every write; on a busy table it must be built with \`CONCURRENTLY\` |
| Is the plan from production data or a small dev copy? | On a tiny table the planner picks a Seq Scan on purpose; the plan on dev says nothing about prod |

## 3. Step 1 — Is the Seq Scan Actually Wrong?

Read three numbers in the Seq Scan node of \`EXPLAIN (ANALYZE, BUFFERS)\`:

- **\`actual rows\`** — rows this node returned.
- **\`Rows Removed by Filter\`** — rows it read and threw away.
- **\`Buffers\`** — pages it touched (one page is 8 kB in PostgreSQL).

The second example builds a 200,000-row \`big_orders\` table (20,000 users, 10 orders each) with no index on \`user_id\`, and asks for one user:

~~~sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, amount FROM big_orders WHERE user_id = 4242;
~~~

~~~text
QUERY PLAN
Seq Scan on big_orders (actual rows=10 loops=1)
  Filter: (user_id = 4242)
  Rows Removed by Filter: 199990
~~~

10 rows kept, 199,990 removed: the query needs 0.005% of the table and reads 100% of it. That ratio is the red flag. With \`BUFFERS\` and timing on, the same run showed \`Buffers: shared hit=1471\` and \`Execution Time: 9.600 ms\`; after the index from step 2, \`Buffers: shared hit=10 read=2\` and \`Execution Time: 0.070 ms\`. Timings vary run to run; the page counts are the reliable comparison.

📌 **Interview term: selectivity** — the fraction of rows a condition keeps. \`user_id = 4242\` keeps 10 of 200,000 (highly selective). \`status = 'shipped'\` keeps 190,000 of 200,000 (not selective).

Now the opposite case, run on the same table with an index on \`status\`:

~~~text
Aggregate (actual rows=1 loops=1)
  Buffers: shared hit=1471
  ->  Seq Scan on big_orders (actual rows=190000 loops=1)
        Filter: (status = 'shipped'::text)
        Rows Removed by Filter: 10000
        Buffers: shared hit=1471
~~~

The index exists and the planner ignores it, correctly: 95% of rows match. Forcing the index with \`SET enable_seqscan = off\` gave a Bitmap Heap Scan that read the same 1,471 table pages **plus** 162 index pages (\`Buffers: shared hit=1471 read=162\`), and the planner's own estimate went from \`cost=4446\` to \`cost=6446\`. Here the Seq Scan is the right plan; the fix, if the query is still too slow, is to read less (a summary table, a narrower question), not an index.

📌 **Interview term: Rows Removed by Filter** — the count of rows a node read but discarded because they failed a condition that was not used to find them. Large numbers next to a small \`actual rows\` mean the condition is not being answered by an index.

## 4. Step 2 — Is There a Usable Index?

The quickest way to see whether an index can serve a predicate is to look at where the condition appears in the plan: under \`Index Cond\` (the index answers it) or under \`Filter\` (it is tested row by row after reading).

The first example runs the same idea on SQLite, where \`EXPLAIN QUERY PLAN\` says \`SCAN\` (read everything) or \`SEARCH\` (use an index to jump to the rows):

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN orders

id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX idx_orders_user_id (user_id=?)

id | parent | notused | detail
2 | 0 | 0 | SCAN users USING COVERING INDEX idx_users_email

id | parent | notused | detail
3 | 0 | 0 | SEARCH users USING INDEX idx_users_lower_email (<expr>=?)
~~~

1. No index on \`orders.user_id\`: \`SCAN orders\`.
2. After \`CREATE INDEX ... (user_id)\`: \`SEARCH ... USING INDEX idx_orders_user_id (user_id=?)\`.
3. An index on \`email\` exists, but the query asks for \`lower(email)\`. SQLite cannot search by it; it scans the whole index (\`SCAN users USING COVERING INDEX\`) and computes \`lower()\` for every entry.
4. An index on the expression \`lower(email)\` makes it a \`SEARCH\` again (\`<expr>=?\`).

The third example does the same on PostgreSQL and collects five plans into one result set (the \`plan()\` helper turns \`EXPLAIN\` output into rows):

~~~text
step | plan_line
1 no index | Seq Scan on big_orders
1 no index |   Filter: (user_id = 4242)
2 index on user_id | Bitmap Heap Scan on big_orders
2 index on user_id |   Recheck Cond: (user_id = 4242)
2 index on user_id |   ->  Bitmap Index Scan on big_orders_user_id_idx
2 index on user_id |         Index Cond: (user_id = 4242)
3 cast hides column | Seq Scan on big_orders
3 cast hides column |   Filter: ((user_id)::text = '4242'::text)
4 lower(email) | Seq Scan on big_users
4 lower(email) |   Filter: (lower(email) = 'user4243@example.com'::text)
5 expression index | Index Scan using big_users_lower_email_idx on big_users
5 expression index |   Index Cond: (lower(email) = 'user4243@example.com'::text)
~~~

- **Step 1 → 2:** adding the index turns \`Filter\` into \`Index Cond\`.
- **Step 3:** the index is there, but \`user_id::text = '4242'\` compares a transformed value, so the planner is back to a Seq Scan. Casts often come from an ORM or a driver sending the parameter as the wrong type.
- **Step 4:** a plain index on \`email\` does not serve \`lower(email)\`.
- **Step 5:** an expression index on \`lower(email)\` does.

📌 **Interview term: sargable predicate** — a condition of the form \`column operator value\` that an index on \`column\` can answer ("Search ARGument ABLE"). Wrapping the column in a function, a cast or arithmetic (\`user_id + 0 = 4242\`) makes it non-sargable.

📌 **Interview term: expression index** — an index on the result of an expression, such as \`CREATE INDEX ON users (lower(email))\`. The query must use the same expression for the planner to match it.

Other non-sargable shapes I ran against the same table, each with an index on the column, each giving \`Seq Scan\`:

| Predicate | What the plan showed | Fix |
| :--- | :--- | :--- |
| \`user_id = 4242.0\` (int column, numeric literal) | \`Filter: ((user_id)::numeric = 4242.0)\` | Pass an integer parameter (\`4242::bigint\` still used the index) |
| \`user_id + 0 = 4242\` | \`Filter: ((user_id + 0) = 4242)\` | Move arithmetic to the constant side |
| \`user_id = 4242 OR amount = 7\` (index only on \`user_id\`) | \`Filter: ((user_id = 4242) OR (amount = '7'::numeric))\` | Index both columns (PostgreSQL can then BitmapOr them) or split into \`UNION\` |
| \`email LIKE '%4243@Example.com'\` (leading wildcard) | \`Filter: (email ~~ '%4243@Example.com'::text)\` | A trigram (\`pg_trgm\`) GIN index, or a reversed-string expression index |
| \`email LIKE 'user4243@%'\` with a \`text_pattern_ops\` index | \`Index Scan ... Index Cond: ((email ~>=~ 'user4243@'::text) AND (email ~<~ 'user4243A'::text))\` | Works: a prefix is sargable when the index supports pattern matching |

The composite-index case (an index on \`(country, created_at)\` cannot find rows by \`created_at\` alone efficiently) has its own page: [Why does column order matter in a composite index?](/interview-question/why-does-column-order-matter-in-a-composite-index)

## 5. Step 3 — Are the Statistics Fresh?

The planner does not count rows before choosing a plan; it estimates them from statistics collected by \`ANALYZE\` (or autovacuum). When those are wrong, it can choose a Seq Scan because it believes many rows match.

The fourth example simulates a job queue. When statistics were gathered, 80% of the 30,000 jobs were \`pending\`. Then workers finished nearly all of them; 30 remain. Autovacuum is disabled on the table so that nothing refreshes the statistics in between. The \`est()\` helper reads the planner estimate and the actual count from \`EXPLAIN (ANALYZE, FORMAT JSON)\`:

~~~text
stats | plan_node | estimated_rows | actual_rows
stale | Seq Scan | 42994 | 30
fresh | Index Scan | 30 | 30
~~~

With stale statistics the planner expected 42,994 matching rows (more than the table ever had: the update left dead row versions, so the table has more pages, and the planner scales its row estimate by the current page count), so it read the whole table to return 30. After \`ANALYZE jobs\`, the estimate is exact and the plan is an Index Scan. Same index, same query, different plan.

📌 **Interview term: planner statistics** — per-column summaries kept in \`pg_statistic\` (readable through the \`pg_stats\` view): the fraction of NULLs, the number of distinct values, the most common values with their frequencies, and a histogram. \`ANALYZE\` refreshes them from a sample of rows.

📌 **Interview term: estimate vs actual** — in \`EXPLAIN ANALYZE\`, each node shows the planner estimate (\`rows=\` in the cost part) and the real count (\`actual rows=\`). A gap of 10x or more points to bad statistics, correlated columns or an unusual value distribution.

Fixes for estimate problems:

- \`ANALYZE table_name;\` now, and check why autovacuum did not (bulk loads in one transaction, autovacuum disabled, thresholds too high for a huge table).
- For a skewed column, raise the sample size: \`ALTER TABLE jobs ALTER COLUMN status SET STATISTICS 1000;\` then \`ANALYZE\` (the default target on this server is \`default_statistics_target = 100\`).
- For two columns that depend on each other (city and postcode), \`CREATE STATISTICS ... (dependencies) ON city, postcode FROM addresses;\` lets the planner stop multiplying their selectivities as if they were independent.
- For a queue, a **partial index** such as \`CREATE INDEX ON jobs (id) WHERE status = 'pending'\` stays tiny and is used for exactly this query.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 200" role="img" aria-label="Diagnosis in four steps: is the Seq Scan justified, is there a usable index, are the statistics fresh, then fix and re-measure">
  <defs>
    <marker id="sql16q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="50" width="170" height="100" rx="10"/>
  <text class="d-text" x="95" y="92" text-anchor="middle">1. Justified?</text>
  <text class="d-sub" x="95" y="120" text-anchor="middle">rows kept vs total</text>
  <rect class="d-box" x="230" y="50" width="170" height="100" rx="10"/>
  <text class="d-text" x="315" y="92" text-anchor="middle">2. Usable index?</text>
  <text class="d-sub" x="315" y="120" text-anchor="middle">bare column match</text>
  <rect class="d-box" x="450" y="50" width="170" height="100" rx="10"/>
  <text class="d-text" x="535" y="92" text-anchor="middle">3. Fresh stats?</text>
  <text class="d-sub" x="535" y="120" text-anchor="middle">estimate vs actual</text>
  <rect class="d-box-accent" x="670" y="50" width="170" height="100" rx="10"/>
  <text class="d-text" x="755" y="92" text-anchor="middle">4. Fix, re-run</text>
  <text class="d-sub" x="755" y="120" text-anchor="middle">EXPLAIN ANALYZE</text>
  <line class="d-edge" x1="184" y1="100" x2="222" y2="100" marker-end="url(#sql16q1-arrow2)"/>
  <line class="d-edge" x1="404" y1="100" x2="442" y2="100" marker-end="url(#sql16q1-arrow2)"/>
  <line class="d-edge" x1="624" y1="100" x2="662" y2="100" marker-end="url(#sql16q1-arrow2)"/>
</svg>

## 6. Step 4 — Fix It Safely, Then Prove It

A plain \`CREATE INDEX\` blocks writes to the table while it builds, which on 10M rows can be minutes. In production use:

~~~sql
CREATE INDEX CONCURRENTLY big_orders_user_id_idx ON big_orders (user_id);
~~~

It takes longer and does not block inserts, updates or deletes. It cannot run inside a transaction block; on PostgreSQL 16 the attempt fails with:

~~~text
ERROR:  CREATE INDEX CONCURRENTLY cannot run inside a transaction block
~~~

If a concurrent build fails part way, it leaves an \`INVALID\` index behind that must be dropped and rebuilt (\`\\d table\` in \`psql\` marks it). Migration tools that wrap every migration in a transaction need a per-migration opt-out for this.

📌 **Interview term: CREATE INDEX CONCURRENTLY** — builds an index without taking a lock that blocks writes, by scanning the table twice and waiting for running transactions. Slower, but safe on a live table.

Then measure again with the same parameters: \`EXPLAIN (ANALYZE, BUFFERS)\` should show \`Index Cond\`, a small \`Buffers\` count and a lower execution time. Afterwards, \`pg_stat_user_indexes.idx_scan\` tells you whether production queries actually use the new index; an index with zero scans after a week is pure write cost.

**Diagnostic only:** \`SET enable_seqscan = off;\` in your own session makes the planner avoid Seq Scans where it can. If the forced plan is much faster, the planner's cost model or statistics are wrong; investigate those. Never set it globally. On SSD storage, a \`random_page_cost\` close to \`seq_page_cost\` (this server has the defaults 4 and 1) can also tilt the planner toward indexes; change it only with measurements.

## 7. What Changes at 10 Million Rows

- The page count scales with the rows: this table was 1,471 pages (11 MB) for 200,000 rows, so the same row width at 10M rows is about 73,500 pages, roughly 575 MB, read on every query. Whether that comes from RAM or disk decides whether it takes tens of milliseconds or seconds.
- PostgreSQL will usually run a **Parallel Seq Scan** under a \`Gather\` node on a table this size; the examples here set \`max_parallel_workers_per_gather = 0\` to keep the plan simple. Parallel workers make the scan faster, not cheaper: the same pages are still read.
- \`ANALYZE\` reads a sample of 300 × the statistics target rows (30,000 at the default target; the factor comes from a comment in \`analyze.c\`, [discussed on pgsql-hackers](https://www.postgresql.org/message-id/27010.1020524887%40sss.pgh.pa.us)), not the whole table, so rare values on a 10M-row table are more likely to be missed; this is when raising the target helps.

## 8. Verified: Running the Code

The SQLite example was run the way this page runs it (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The three PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database seeded with the same schema; each builds its own large table with \`generate_series\`, so the row counts are deterministic. The \`BUFFERS\`, timing, forced-plan and non-sargable results quoted in prose came from the same server with \`psql\`.

Example 1, SQLite \`EXPLAIN QUERY PLAN\`:

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN orders

id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX idx_orders_user_id (user_id=?)

id | parent | notused | detail
2 | 0 | 0 | SCAN users USING COVERING INDEX idx_users_email

id | parent | notused | detail
3 | 0 | 0 | SEARCH users USING INDEX idx_users_lower_email (<expr>=?)
~~~

Example 2, the Seq Scan symptom:

~~~text
QUERY PLAN
Seq Scan on big_orders (actual rows=10 loops=1)
  Filter: (user_id = 4242)
  Rows Removed by Filter: 199990
~~~

Example 3, five plans side by side:

~~~text
step | plan_line
1 no index | Seq Scan on big_orders
1 no index |   Filter: (user_id = 4242)
2 index on user_id | Bitmap Heap Scan on big_orders
2 index on user_id |   Recheck Cond: (user_id = 4242)
2 index on user_id |   ->  Bitmap Index Scan on big_orders_user_id_idx
2 index on user_id |         Index Cond: (user_id = 4242)
3 cast hides column | Seq Scan on big_orders
3 cast hides column |   Filter: ((user_id)::text = '4242'::text)
4 lower(email) | Seq Scan on big_users
4 lower(email) |   Filter: (lower(email) = 'user4243@example.com'::text)
5 expression index | Index Scan using big_users_lower_email_idx on big_users
5 expression index |   Index Cond: (lower(email) = 'user4243@example.com'::text)
~~~

Example 4, stale statistics:

~~~text
stats | plan_node | estimated_rows | actual_rows
stale | Seq Scan | 42994 | 30
fresh | Index Scan | 30 | 30
~~~

## 9. Cause → Symptom → Fix

| Cause | What the plan shows | Fix |
| :--- | :--- | :--- |
| Query returns a large share of rows | \`actual rows\` large, few removed | None needed; read less data (summary table, pagination) |
| No index on the filtered column | \`Filter:\` on the column, huge \`Rows Removed by Filter\` | \`CREATE INDEX CONCURRENTLY\` on it (composite if several columns filter) |
| Column wrapped in a function or cast | \`Filter: (lower(email) = ...)\` / \`((col)::text = ...)\` | Rewrite as bare column, or an expression index |
| Wrong composite column order | Index used only partly, or not at all | Equality columns first, then range; see the composite-index page |
| Stale or too-coarse statistics | \`rows=\` estimate far from \`actual rows\` | \`ANALYZE\`, \`SET STATISTICS\`, \`CREATE STATISTICS\` |
| Tiny table in dev | Seq Scan on a 3-page table | Nothing: test on realistic data volumes |

## Edge Cases

- **Prepared statements.** PostgreSQL plans the first five executions of a prepared statement with the actual values, then may switch to a generic plan that does not know the parameter value if its estimated cost is not clearly worse ([PostgreSQL 16: PREPARE](https://www.postgresql.org/docs/16/sql-prepare.html)); for a skewed column that plan can be a Seq Scan. Compare \`EXPLAIN EXECUTE\` with a literal-value \`EXPLAIN\`, and see \`plan_cache_mode\`.
- **\`ORDER BY ... LIMIT\`.** A Seq Scan feeding a \`Sort\` for "latest 10 rows" means there is no index matching the sort order; the fix is an index on the \`ORDER BY\` columns. See [How do you optimize a slow SQL query?](/interview-question/how-do-you-optimize-a-slow-sql-query) for that run.
- **Index-only scans need a vacuumed table.** A covering index still visits the table for pages not marked all-visible: [What is a covering index?](/interview-question/what-is-a-covering-index)
- **Write cost.** Every index adds work to every \`INSERT\` and \`UPDATE\` of an indexed column; on a write-heavy table, one composite index is better than three single-column ones that are rarely used.

## Common Pitfalls

- **Treating every Seq Scan as a bug.** Check selectivity first; for a large share of rows, forcing an index makes the query slower (shown above: 1,471 + 162 pages instead of 1,471).
- **Creating the index without \`CONCURRENTLY\` on a live table.** A plain \`CREATE INDEX\` blocks writes for the whole build.
- **Adding an index that the query cannot use.** An index on \`email\` does nothing for \`lower(email) = ...\`; the plan must show \`Index Cond\` after the change.
- **Testing on a dev database with 1,000 rows.** The planner rightly picks Seq Scans on small tables; reproduce on production-sized data or read the production plan.
- **Leaving \`enable_seqscan = off\` in a config file.** It is a diagnostic switch; globally it breaks plans that genuinely need a full scan.
- **Ignoring estimate vs actual.** If the estimate is 1,000x off, an index will not fix the root cause; refresh statistics first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Check if it is wrong:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">Seq Scan</strong> is only a problem if the query needs a small fraction of the table. I compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">actual rows</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Rows Removed by Filter</code> and the buffer count. 10 rows kept and 10 million removed is the red flag; 30% of the table kept means the scan is correct.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Look for a usable index:</strong> <span style="color:#f0e2c8;">If the condition shows under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Filter</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Index Cond</code>, either there is no index or the predicate is not <strong style="color:#ffca28;">sargable</strong>: a function like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower(email)</code>, a cast, a numeric literal against an int column, a leading wildcard, or the wrong composite-index order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Check the estimate:</strong> <span style="color:#f0e2c8;">I compare the planner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rows=</code> estimate with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">actual rows</code>. If the planner expected 40,000 rows and got 30, statistics are stale: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ANALYZE</code>, a higher statistics target, or extended statistics for correlated columns.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Fix safely:</strong> <span style="color:#f0e2c8;">Create the matching index with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE INDEX CONCURRENTLY</code> so writes are not blocked, or an expression or partial index, or rewrite the predicate to compare the bare column.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">Re-run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN (ANALYZE, BUFFERS)</code> with the same parameters and look for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Index Cond</code> and a page count that dropped from the whole table to a handful; then watch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_stat_user_indexes</code> to confirm production uses it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would Postgres ignore an index that exists on the column?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either the query returns too many rows for the index to be cheaper (95% matching made the forced index plan read more pages), or the predicate cannot use it: a cast, a function, an implicit type conversion, or statistics that over-estimate the matches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is SET enable_seqscan = off a fix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is a diagnostic. It only makes Seq Scans look very expensive in this session. If the forced plan is much faster, the problem is statistics or cost settings such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">random_page_cost</code>, and that is what you fix.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add an index to a 10M-row table without downtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE INDEX CONCURRENTLY</code>. It does not block writes, but it cannot run inside a transaction block, takes longer, and can leave an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INVALID</code> index if it fails, which you drop and rebuild.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The query uses lower(email) = $1. What index do you create?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An expression index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE INDEX ON users (lower(email))</code>, and the query must use exactly that expression. Alternatives are storing a normalised column or using a case-insensitive type such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">citext</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the plan is fine with a literal but bad from the application?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Likely a prepared statement on a generic plan or a parameter sent with the wrong type, which adds a cast. Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN EXECUTE</code> with the literal plan, check the parameter types the driver sends, and look at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">plan_cache_mode</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Seq Scan | Read every page of the table and test each row |
| Index Scan / Bitmap Heap Scan | Find row locations in an index, then fetch only those pages |
| Selectivity | The fraction of rows a condition keeps |
| Rows Removed by Filter | Rows read and discarded because a non-index condition failed |
| Sargable predicate | A \`column op value\` condition an index on that column can answer |
| Expression index | An index on a computed value such as \`lower(email)\` |
| Planner statistics | Per-column summaries from \`ANALYZE\` used to estimate row counts |
| Estimate vs actual | Planner \`rows=\` compared with \`actual rows=\` in \`EXPLAIN ANALYZE\` |
| CREATE INDEX CONCURRENTLY | Building an index without blocking writes |

**Conclusion:** A Seq Scan on a 10M-row table is a question, not an answer. First compare what the query returns with what it reads: if it keeps most rows, the scan is right and you need to read less. If it keeps a handful and removes millions, find out why no index is used: there is none, the predicate hides the column behind a function, cast or wildcard, or stale statistics make the planner expect far more rows than really match. Fix the cause with a matching index built \`CONCURRENTLY\`, a sargable rewrite or a fresh \`ANALYZE\`, then prove it with \`EXPLAIN (ANALYZE, BUFFERS)\` showing \`Index Cond\` and a page count that dropped from the whole table to a few pages.`,
    examples: [
      {
        label: `SQLite: SCAN vs SEARCH — no index, an index, and a function that hides the column`,
        code: `EXPLAIN QUERY PLAN
SELECT id, amount FROM orders WHERE user_id = 3;

CREATE INDEX idx_orders_user_id ON orders (user_id);

EXPLAIN QUERY PLAN
SELECT id, amount FROM orders WHERE user_id = 3;

CREATE INDEX idx_users_email ON users (email);

EXPLAIN QUERY PLAN
SELECT id FROM users WHERE lower(email) = 'alice@example.com';

CREATE INDEX idx_users_lower_email ON users (lower(email));

EXPLAIN QUERY PLAN
SELECT id FROM users WHERE lower(email) = 'alice@example.com';`,
      },
      {
        label: `PostgreSQL: the symptom — a Seq Scan that throws away 199,990 of 200,000 rows`,
        code: `SET max_parallel_workers_per_gather = 0;
CREATE TABLE big_orders (
  id bigint PRIMARY KEY,
  user_id int NOT NULL,
  status text NOT NULL,
  amount numeric NOT NULL,
  created_at date NOT NULL
) WITH (autovacuum_enabled = off);
INSERT INTO big_orders
SELECT g, (g % 20000) + 1,
       CASE WHEN g % 20 = 0 THEN 'cancelled' ELSE 'shipped' END,
       (g % 500) + 1, DATE '2024-01-01' + (g % 366)
FROM generate_series(1, 200000) AS g;
ANALYZE big_orders;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, amount FROM big_orders WHERE user_id = 4242;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: five plans side by side — add an index, break it with a cast, fix with an expression index`,
        code: `SET max_parallel_workers_per_gather = 0;
CREATE TABLE big_orders (
  id bigint PRIMARY KEY,
  user_id int NOT NULL,
  status text NOT NULL,
  amount numeric NOT NULL,
  created_at date NOT NULL
) WITH (autovacuum_enabled = off);
INSERT INTO big_orders
SELECT g, (g % 20000) + 1,
       CASE WHEN g % 20 = 0 THEN 'cancelled' ELSE 'shipped' END,
       (g % 500) + 1, DATE '2024-01-01' + (g % 366)
FROM generate_series(1, 200000) AS g;
CREATE TABLE big_users (
  id int PRIMARY KEY,
  email text NOT NULL
) WITH (autovacuum_enabled = off);
INSERT INTO big_users
SELECT g, CASE WHEN g % 2 = 0 THEN 'User' ELSE 'user' END || g || '@Example.com'
FROM generate_series(1, 20000) AS g;
ANALYZE big_orders;
ANALYZE big_users;
-- plan(q): the plan of q as rows, so several plans fit in one result set
CREATE FUNCTION plan(q text) RETURNS SETOF text LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN EXECUTE 'EXPLAIN (COSTS OFF) ' || q LOOP
    RETURN NEXT r."QUERY PLAN";
  END LOOP;
END $$;
CREATE TABLE steps (n serial, step text, plan_line text);

INSERT INTO steps (step, plan_line)
SELECT '1 no index', plan('SELECT id FROM big_orders WHERE user_id = 4242');

CREATE INDEX big_orders_user_id_idx ON big_orders (user_id);
INSERT INTO steps (step, plan_line)
SELECT '2 index on user_id', plan('SELECT id FROM big_orders WHERE user_id = 4242');

INSERT INTO steps (step, plan_line)
SELECT '3 cast hides column', plan('SELECT id FROM big_orders WHERE user_id::text = ''4242''');

CREATE INDEX big_users_email_idx ON big_users (email);
INSERT INTO steps (step, plan_line)
SELECT '4 lower(email)', plan('SELECT id FROM big_users WHERE lower(email) = ''user4243@example.com''');

CREATE INDEX big_users_lower_email_idx ON big_users (lower(email));
ANALYZE big_users;
INSERT INTO steps (step, plan_line)
SELECT '5 expression index', plan('SELECT id FROM big_users WHERE lower(email) = ''user4243@example.com''');

SELECT step, plan_line FROM steps ORDER BY n;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: stale statistics — the planner expects 42,994 rows, gets 30, and picks a Seq Scan until ANALYZE`,
        code: `SET max_parallel_workers_per_gather = 0;
-- A job queue: when statistics were last gathered, most jobs were pending
CREATE TABLE jobs (
  id int PRIMARY KEY,
  status text NOT NULL
) WITH (autovacuum_enabled = off);
INSERT INTO jobs SELECT g, CASE WHEN g % 5 = 0 THEN 'done' ELSE 'pending' END
FROM generate_series(1, 30000) AS g;
CREATE INDEX jobs_status_idx ON jobs (status);
ANALYZE jobs;
-- Workers then finished almost everything: 30 pending jobs remain
UPDATE jobs SET status = 'done' WHERE status = 'pending' AND id > 37;

CREATE FUNCTION est(q text) RETURNS TABLE (plan_node text, estimated_rows numeric, actual_rows numeric)
LANGUAGE plpgsql AS $$
DECLARE j json;
BEGIN
  EXECUTE 'EXPLAIN (ANALYZE, FORMAT JSON) ' || q INTO j;
  plan_node := j->0->'Plan'->>'Node Type';
  estimated_rows := (j->0->'Plan'->>'Plan Rows')::numeric;
  actual_rows := (j->0->'Plan'->>'Actual Rows')::numeric;
  RETURN NEXT;
END $$;

CREATE TABLE seen (n serial, stats text, plan_node text, estimated_rows numeric, actual_rows numeric);
INSERT INTO seen (stats, plan_node, estimated_rows, actual_rows)
SELECT 'stale', * FROM est('SELECT id FROM jobs WHERE status = ''pending''');
ANALYZE jobs;
INSERT INTO seen (stats, plan_node, estimated_rows, actual_rows)
SELECT 'fresh', * FROM est('SELECT id FROM jobs WHERE status = ''pending''');
SELECT stats, plan_node, estimated_rows, actual_rows FROM seen ORDER BY n;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `How do you optimize a slow SQL query?`,
    difficulty: "hard",
    seoDescription: `A method for slow SQL: measure, read EXPLAIN ANALYZE, then read fewer rows, do less work, avoid spills or change the data, with real before/after plans.`,
    description: `**Question presented to candidate:**
"A report query that used to take 200 milliseconds now takes 30 seconds. Nobody knows why. How do you approach making it fast again — what do you look at first, and what kinds of fixes do you reach for?"

**What a strong answer should cover:**
- Measure before changing anything: find the slow statements (\`pg_stat_statements\`, the slow query log), reproduce with real parameters, and read \`EXPLAIN (ANALYZE, BUFFERS)\` to find the node where the time and the pages go
- Read fewer rows: a missing or unusable index, a non-sargable predicate (function or cast on the column), an \`ORDER BY ... LIMIT\` without a matching index, stale statistics
- Do less work per row: correlated subqueries or N+1 loops from the application, needless \`DISTINCT\` or sorts, joins that multiply rows before aggregating
- Avoid spills and wasted transfer: sorts and hashes exceeding \`work_mem\` go to disk; \`SELECT *\` and unbounded result sets move data nobody uses; \`OFFSET\` pagination reads and discards rows
- When the query is already as good as it gets: change the data shape (summary table, materialized view, partitioning, denormalisation) or the workload (cache, move analytics off the OLTP primary)
- Verify every change with the same measurement, one change at a time, and weigh the cost (an index slows writes)

**Clarifying questions expected:**
- How slow, how often does it run, and what is the target?
- What changed: data volume, a deploy, a new filter, a database upgrade?
- Is it a read on a busy OLTP database or a report that could run somewhere else?

**Code / implementation expected:** Yes — read a plan, rewrite one query (sargable range, aggregate-then-join, index for \`ORDER BY ... LIMIT\`) and show the before/after plans.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  order_date TEXT NOT NULL,
  amount NUMERIC NOT NULL
);
CREATE INDEX idx_orders_order_date ON orders (order_date);
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
INSERT INTO customers (id, name, country) VALUES
  (1, 'Asha', 'IN'),
  (2, 'Ben', 'US'),
  (3, 'Chen', 'SG'),
  (4, 'Dana', 'US'),
  (5, 'Emeka', 'NG');
INSERT INTO orders (id, customer_id, order_date, amount) VALUES
  (1, 1, '2023-11-20', 40),
  (2, 2, '2023-12-31', 75),
  (3, 1, '2024-01-04', 120),
  (4, 3, '2024-01-19', 60),
  (5, 2, '2024-02-02', 210),
  (6, 1, '2024-03-15', 35),
  (7, 4, '2024-05-09', 90),
  (8, 3, '2024-07-21', 150),
  (9, 2, '2024-12-30', 55),
  (10, 4, '2025-01-02', 300),
  (11, 5, '2025-01-15', 20);
\`\`\``,
    answer: `**Target Audience:** Developers who own a slow query and want a method instead of guesses, and candidates facing the open-ended "how would you optimise this?" interview question.
**Difficulty:** Hard
**Engines:** PostgreSQL 16.15 (plans and timings quoted here were produced on it) and SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use). The method is the same on MySQL (\`EXPLAIN ANALYZE\` since 8.0.18, per the [MySQL blog announcing it](https://dev.mysql.com/blog-archive/mysql-explain-analyze/)) and SQL Server (actual execution plans); only the plan vocabulary differs.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every plan, result and timing shown was produced by running it; the **Verified** section quotes the example output in full. Timings are from one machine and vary between runs; the row and page counts are the stable part.

This page is the general method. The common special case — one Seq Scan on a huge table — has its own walkthrough: [EXPLAIN ANALYZE shows Seq Scan on a 10M-row table — how do you diagnose and fix it?](/interview-question/explain-analyze-shows-seq-scan-on-a-10m-row-table-how-do-you-diagnose-and-fix-it)

## 1. Why This Even Matters — A Story First

A delivery company's vans are late. The new manager could buy faster vans, hire more drivers or repaint the depot. Instead she rides along for a day and writes down where the minutes go: 10 minutes driving, 50 minutes circling the block looking for parking at one customer who is always out. The fix is a parcel locker at that one address. No new vans.

Query tuning is the same. A query is a sequence of steps (scan, join, sort, aggregate), and usually one step eats most of the time. The plan with actual timings is the ride-along. Fixing anything else first is repainting the depot.

📌 **Interview term: query plan (execution plan)** — the tree of steps the database chose to run a query: which tables to read and how (scan or index), in which order to join them and with which algorithm, where to sort and aggregate. \`EXPLAIN\` shows the plan; \`EXPLAIN ANALYZE\` runs the query and adds what really happened. Reading one is covered in depth in [How do you read an EXPLAIN query plan?](/interview-question/how-do-you-read-an-explain-query-plan) and [How do you read EXPLAIN ANALYZE — cost, actual time, rows, and Buffers?](/interview-question/how-do-you-read-explain-analyze-cost-actual-time-rows-and-buffers)

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How slow is it, how often does it run, and what is fast enough? | A 2 s report run once a day and a 50 ms query run 5,000 times a second need different fixes |
| Did it get slow suddenly or gradually? | Sudden: a plan change (stats, a deploy, an upgrade). Gradual: data growth outran the design |
| Can I see the exact SQL with real parameter values? | ORMs add casts, \`OR\` branches and \`SELECT *\`; the plan depends on the values |
| Can we change the schema (indexes, summary tables), or only the query? | Decides which fixes are on the table |
| Is it a read or a write, and on a primary that also serves users? | Heavy analytics on an OLTP primary may belong on a replica or warehouse |

## 3. Step 1 — Measure: Find the Query and Reproduce It

- **Find the expensive statements.** In PostgreSQL, the \`pg_stat_statements\` extension records total and mean time per normalised query. It must be listed in \`shared_preload_libraries\` (a restart) before \`CREATE EXTENSION pg_stat_statements\` works ([PostgreSQL docs: pg_stat_statements](https://www.postgresql.org/docs/16/pgstatstatements.html)). Sort by \`total_exec_time\`: a 5 ms query run a million times can matter more than one 10 s report. MySQL has the slow query log and the Performance Schema; SQL Server has Query Store.
- **Reproduce with the real parameters** on production-sized data. A plan from a 1,000-row dev table tells you nothing about a 50-million-row table.
- **Run \`EXPLAIN (ANALYZE, BUFFERS)\`.** \`ANALYZE\` executes the query (wrap writes in \`BEGIN ... ROLLBACK\`); \`BUFFERS\` shows how many 8 kB pages each step touched.

📌 **Interview term: pg_stat_statements** — a PostgreSQL extension that aggregates statistics (calls, total time, mean time, rows, buffers) per query shape, with literals replaced by placeholders.

## 4. Step 2 — Find the Expensive Node

Read the plan from the innermost (most indented) nodes outward and look for:

- the node with the largest \`actual time\` (it includes its children, so subtract them),
- a big gap between the estimate \`rows=\` and \`actual rows=\` (bad statistics → bad join order or scan choice),
- \`loops=\` multiplying a small cost into a big one (a nested loop or subplan run thousands of times),
- \`Rows Removed by Filter\` much larger than the rows kept,
- \`Sort Method: external merge  Disk:\` or hash \`Batches:\` above 1 (spilling to disk).

<svg class="iq-diagram" width="100%" viewBox="0 0 860 210" role="img" aria-label="The tuning loop: measure, find the expensive plan node, change one thing, measure again">
  <defs>
    <marker id="sql16q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="10" y="40" width="170" height="90" rx="10"/>
  <text class="d-text" x="95" y="78" text-anchor="middle">1. Measure</text>
  <text class="d-sub" x="95" y="104" text-anchor="middle">which query, how slow</text>
  <rect class="d-box" x="230" y="40" width="170" height="90" rx="10"/>
  <text class="d-text" x="315" y="78" text-anchor="middle">2. Read the plan</text>
  <text class="d-sub" x="315" y="104" text-anchor="middle">ANALYZE, BUFFERS</text>
  <rect class="d-box" x="450" y="40" width="170" height="90" rx="10"/>
  <text class="d-text" x="535" y="78" text-anchor="middle">3. Find the node</text>
  <text class="d-sub" x="535" y="104" text-anchor="middle">most time or pages</text>
  <rect class="d-box" x="670" y="40" width="170" height="90" rx="10"/>
  <text class="d-text" x="755" y="78" text-anchor="middle">4. Change one thing</text>
  <text class="d-sub" x="755" y="104" text-anchor="middle">index, rewrite, stats</text>
  <line class="d-edge" x1="184" y1="85" x2="222" y2="85" marker-end="url(#sql16q2-arrow)"/>
  <line class="d-edge" x1="404" y1="85" x2="442" y2="85" marker-end="url(#sql16q2-arrow)"/>
  <line class="d-edge" x1="624" y1="85" x2="662" y2="85" marker-end="url(#sql16q2-arrow)"/>
  <path class="d-edge-dashed" d="M755,134 L755,180 L95,180 L95,138" fill="none" marker-end="url(#sql16q2-arrow)"/>
</svg>

Change one thing, measure again with the same parameters, keep the change only if the numbers improve. Changing three things at once leaves you not knowing which one helped, or which one hurt.

## 5. Fix Family A — Read Fewer Rows

**Make the predicate sargable.** The first example filters orders from 2024. Written as \`substr(order_date, 1, 4) = '2024'\`, the index on \`order_date\` cannot help, because the index is sorted by the date, not by the result of \`substr\`. Written as a half-open range on the bare column, it can:

~~~sql
-- slow shape
WHERE substr(order_date, 1, 4) = '2024'
-- fast shape, same rows
WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'
~~~

~~~text
id | parent | notused | detail
3 | 0 | 0 | SCAN orders

id | parent | notused | detail
4 | 0 | 0 | SEARCH orders USING INDEX idx_orders_order_date (order_date>? AND order_date<?)

version | orders_2024 | revenue_2024
substr | 7 | 720
range | 7 | 720
~~~

\`SCAN orders\` became \`SEARCH orders USING INDEX idx_orders_order_date\`, and the last result set proves both versions return the same 7 orders and 720 revenue. PostgreSQL shows the same pattern on this schema (\`Filter: (substr(order_date, 1, 4) = '2024'::text)\` under a Seq Scan versus \`Index Cond: ((order_date >= '2024-01-01'::text) AND (order_date < '2025-01-01'::text))\`). The same applies to \`YEAR(created_at) = 2024\` in MySQL and \`DATE(created_at) = ...\` everywhere.

📌 **Interview term: sargable** — a predicate of the form \`column operator constant\` that an index on the column can answer. Functions, casts and arithmetic on the column side make it non-sargable.

📌 **Interview term: half-open range** — \`>= start AND < next_start\`. It covers every time of day on the last date and never double-counts the boundary, unlike \`BETWEEN '2024-01-01' AND '2024-12-31'\` on a timestamp column.

**Give \`ORDER BY ... LIMIT\` an index in the same order.** The fourth example fetches the 10 latest orders from 200,000:

~~~text
step | plan_line
no index | Limit (actual rows=10 loops=1)
no index |   ->  Sort (actual rows=10 loops=1)
no index |         Sort Key: order_date DESC, id DESC
no index |         Sort Method: top-N heapsort  Memory: 25kB
no index |         ->  Seq Scan on big_orders (actual rows=200000 loops=1)
index (order_date, id) | Limit (actual rows=10 loops=1)
index (order_date, id) |   ->  Index Scan Backward using big_orders_date_id_idx on big_orders (actual rows=10 loops=1)
~~~

Without an index, PostgreSQL reads all 200,000 rows and keeps the top 10 in a small heap (\`top-N heapsort  Memory: 25kB\`): cheap on memory, but every row is still read. With an index on \`(order_date, id)\` it walks the index backwards and stops after 10 rows. With \`BUFFERS\` and timing on, the same two runs read 1,274 pages in 39.974 ms versus 13 pages in 0.094 ms. This is also why keyset pagination beats \`OFFSET\`: [How do you paginate efficiently in SQL?](/interview-question/how-do-you-paginate-efficiently-in-sql)

Other "read fewer rows" fixes, each with its own page: the right index ([What is an index and how does it speed up queries?](/interview-question/what-is-an-index-and-how-does-it-speed-up-queries)), the right column order ([Why does column order matter in a composite index?](/interview-question/why-does-column-order-matter-in-a-composite-index)), an index that answers the query alone ([What is a covering index?](/interview-question/what-is-a-covering-index)), and fresh statistics (\`ANALYZE\`).

## 6. Fix Family B — Do Less Work Per Row

**Correlated subqueries.** The second example asks for customers who spent more than 100. The first version computes each customer total in a subquery, and because it is written twice (in \`SELECT\` and in \`WHERE\`), SQLite runs two correlated subqueries per customer; the rewrite aggregates \`orders\` once and joins:

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN c
5 | 0 | 0 | CORRELATED SCALAR SUBQUERY 2
11 | 5 | 0 | SEARCH o USING INDEX idx_orders_customer_id (customer_id=?)
26 | 0 | 0 | CORRELATED SCALAR SUBQUERY 1
32 | 26 | 0 | SEARCH o USING INDEX idx_orders_customer_id (customer_id=?)

id | parent | notused | detail
2 | 0 | 0 | CO-ROUTINE t
9 | 2 | 0 | SCAN orders USING INDEX idx_orders_customer_id
42 | 0 | 0 | SCAN t
47 | 0 | 0 | SEARCH c USING INTEGER PRIMARY KEY (rowid=?)

name | total
Asha | 195
Ben | 340
Chen | 210
Dana | 390
~~~

\`CORRELATED SCALAR SUBQUERY\` appears twice in the first plan: a subquery executed again for every outer row. The rewrite has a single pass over \`orders\` (\`CO-ROUTINE t\`). The original returns the same rows:

~~~text
name | total
Asha | 195
Ben | 340
Chen | 210
Dana | 390
~~~

📌 **Interview term: correlated subquery** — a subquery that refers to a column of the outer query (\`o.customer_id = c.id\`), so it is logically evaluated once per outer row. See [What is a subquery and what is a correlated subquery?](/interview-question/what-is-a-subquery-and-what-is-a-correlated-subquery)

The cost depends on what the subquery has to read, and the right rewrite depends on how many outer rows there are. On PostgreSQL 16 with the 200,000-row orders table and 50 customers:

| Shape | Index on \`orders.customer_id\`? | Plan | Execution time |
| :--- | :--- | :--- | :--- |
| Correlated subquery | No | \`SubPlan\` with \`Seq Scan ... loops=50\`, \`Rows Removed by Filter: 199960\` per loop | 2761.847 ms |
| Aggregate once, then join | No | \`HashAggregate\` over all 200,000 rows, then \`Hash Join\` | 40.841 ms |
| Correlated subquery | Yes | \`SubPlan\` with \`Bitmap Index Scan ... loops=50\` | 2.358 ms |

Without an index, the per-row subquery scanned the whole table 50 times; aggregating once was 68× faster. With an index on the correlation column, the per-row lookup was the fastest of all, because it touches only those 50 customers' orders while the aggregate-once version still totals all 5,000 customers. "Never use correlated subqueries" is the wrong lesson; "never make the database repeat a full scan per row" is the right one.

**The N+1 problem** is the same mistake made in application code: one query for 100 customers, then 100 queries for their orders, each paying a network round trip. Fetch them in one query with a join or \`WHERE customer_id = ANY($1)\` (PostgreSQL) / \`IN (...)\`.

📌 **Interview term: N+1 query problem** — running one query to get a list and then one more query per item in the list, typically from an ORM's lazy loading.

Other "less work" fixes: drop a \`DISTINCT\` that only hides a join that multiplies rows ([What does DISTINCT do and what is its cost?](/interview-question/what-does-distinct-do-and-what-is-its-cost)); aggregate before joining when the join would multiply rows; use \`EXISTS\` instead of a join plus \`DISTINCT\` for "has at least one" ([Why might EXISTS outperform a JOIN for existence checks?](/interview-question/why-might-exists-outperform-a-join-for-existence-checks)); use \`UNION ALL\` instead of \`UNION\` when duplicates are impossible.

## 7. Fix Family C — Avoid Spills and Wasted Transfer

Sorts and hash tables get \`work_mem\` of memory each (4MB by default on this server). Bigger inputs spill to temporary files. The third example sorts all 200,000 rows at two settings:

~~~text
step | plan_line
work_mem 1MB | Sort (actual rows=200000 loops=1)
work_mem 1MB |   Sort Key: amount DESC, id
work_mem 1MB |   Sort Method: external merge  Disk: 3744kB
work_mem 1MB |   ->  Seq Scan on big_orders (actual rows=200000 loops=1)
work_mem 64MB | Sort (actual rows=200000 loops=1)
work_mem 64MB |   Sort Key: amount DESC, id
work_mem 64MB |   Sort Method: quicksort  Memory: 13957kB
work_mem 64MB |   ->  Seq Scan on big_orders (actual rows=200000 loops=1)
~~~

📌 **Interview term: work_mem** — the memory PostgreSQL allows each sort or hash operation before it writes to temporary files. It is per operation, not per query: one query can use it several times, and every connection can.

\`external merge  Disk: 3744kB\` is the spill; at 64MB it became \`quicksort  Memory: 13957kB\`. An honest note from this run: the timings were close (163 ms spilled vs 190 ms in memory), because a 4 MB temp file on this machine stayed in the OS file cache. On a busy server with gigabytes spilled, the difference is large. Treat \`Disk:\` in a plan as a signal to check, not proof of the bottleneck. Raise \`work_mem\` for one session or one role (\`SET work_mem = '64MB'\` before a heavy report), not globally: 200 connections × several operations × a large \`work_mem\` can exhaust RAM.

Wasted transfer:

- \`SELECT *\` sends every column, prevents index-only scans, and drags large text or JSON columns over the network. Select the columns you use.
- Unbounded results: a report that returns 2 million rows to an app that shows 50 needs \`LIMIT\` and keyset pagination.

## 8. Fix Family D — Change the Data, Not the Query

When the plan is already reasonable and still too slow, the query is doing honest work on too much data:

- **Precompute.** A summary table or a materialized view refreshed on a schedule turns "aggregate 50 million rows" into "read 365 rows": [What is a view and a materialized view?](/interview-question/what-is-a-view-and-a-materialized-view)
- **Partition** time-series tables so queries touch only recent partitions and old data is dropped cheaply: [What is table partitioning?](/interview-question/what-is-table-partitioning)
- **Denormalise** a hot join: [What is denormalization and when should you use it?](/interview-question/what-is-denormalization-and-when-should-you-use-it)
- **Move the workload.** Heavy analytics on the OLTP primary compete with user traffic; a read replica or a column-store warehouse is the structural fix: [What is the difference between OLTP and OLAP databases?](/interview-question/what-is-the-difference-between-oltp-and-olap-databases)

## 9. Verified: Running the Code

The two SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The two PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database with the same schema; each builds a 200,000-row table with \`generate_series\`. The correlated-subquery timing table, the \`BUFFERS\` counts and the sort timings in prose came from the same server via \`psql\` with \`max_parallel_workers_per_gather = 0\`.

Example 1, sargable rewrite:

~~~text
id | parent | notused | detail
3 | 0 | 0 | SCAN orders

id | parent | notused | detail
4 | 0 | 0 | SEARCH orders USING INDEX idx_orders_order_date (order_date>? AND order_date<?)

version | orders_2024 | revenue_2024
substr | 7 | 720
range | 7 | 720
~~~

Example 2, correlated subquery vs aggregate-then-join:

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN c
5 | 0 | 0 | CORRELATED SCALAR SUBQUERY 2
11 | 5 | 0 | SEARCH o USING INDEX idx_orders_customer_id (customer_id=?)
26 | 0 | 0 | CORRELATED SCALAR SUBQUERY 1
32 | 26 | 0 | SEARCH o USING INDEX idx_orders_customer_id (customer_id=?)

id | parent | notused | detail
2 | 0 | 0 | CO-ROUTINE t
9 | 2 | 0 | SCAN orders USING INDEX idx_orders_customer_id
42 | 0 | 0 | SCAN t
47 | 0 | 0 | SEARCH c USING INTEGER PRIMARY KEY (rowid=?)

name | total
Asha | 195
Ben | 340
Chen | 210
Dana | 390
~~~

Example 3, sort spill:

~~~text
step | plan_line
work_mem 1MB | Sort (actual rows=200000 loops=1)
work_mem 1MB |   Sort Key: amount DESC, id
work_mem 1MB |   Sort Method: external merge  Disk: 3744kB
work_mem 1MB |   ->  Seq Scan on big_orders (actual rows=200000 loops=1)
work_mem 64MB | Sort (actual rows=200000 loops=1)
work_mem 64MB |   Sort Key: amount DESC, id
work_mem 64MB |   Sort Method: quicksort  Memory: 13957kB
work_mem 64MB |   ->  Seq Scan on big_orders (actual rows=200000 loops=1)
~~~

Example 4, top-N with and without an index:

~~~text
step | plan_line
no index | Limit (actual rows=10 loops=1)
no index |   ->  Sort (actual rows=10 loops=1)
no index |         Sort Key: order_date DESC, id DESC
no index |         Sort Method: top-N heapsort  Memory: 25kB
no index |         ->  Seq Scan on big_orders (actual rows=200000 loops=1)
index (order_date, id) | Limit (actual rows=10 loops=1)
index (order_date, id) |   ->  Index Scan Backward using big_orders_date_id_idx on big_orders (actual rows=10 loops=1)
~~~

## 10. Symptom → Fix Cheat Sheet

| Plan symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| Seq Scan, huge \`Rows Removed by Filter\`, few rows kept | Missing or unusable index | Index; sargable rewrite; expression index |
| Estimate \`rows=\` 100× off from \`actual rows\` | Stale or weak statistics | \`ANALYZE\`; \`SET STATISTICS\`; \`CREATE STATISTICS\` |
| \`loops=\` in the thousands on an expensive inner node | Nested loop or correlated subquery repeating a scan | Index on the inner join key, or aggregate once and hash join |
| \`Sort\` over all rows feeding \`Limit\` | No index in \`ORDER BY\` order | Composite index matching \`ORDER BY\`; keyset pagination |
| \`Sort Method: external merge  Disk:\` | Sort larger than \`work_mem\` | Session-level \`work_mem\`, or avoid the sort with an index |
| Plan is fine, query still slow | Too much data for the question | Summary table, materialized view, partitioning, warehouse |
| Many identical fast queries | N+1 from the application | One query with a join or \`= ANY($1)\` |

## Edge Cases

- **Fast in \`psql\`, slow from the app.** Different parameter types (an implicit cast), a generic prepared-statement plan, or a different \`search_path\`/settings. Capture the app's exact statement.
- **Fast the second time.** The first run read from disk, the second from cache. Compare \`Buffers: shared read\` (from disk or OS cache) with \`shared hit\` (already in PostgreSQL memory).
- **Slow only sometimes.** Lock waits, not the plan. Check \`pg_stat_activity.wait_event\` and \`pg_locks\` while it is slow.
- **Writes are slow.** Too many indexes, triggers, foreign keys without an index on the referencing column (each parent delete scans the child), or a long transaction blocking vacuum.

## Common Pitfalls

- **Tuning without measuring.** Adding indexes "just in case" costs every write and often does not touch the real bottleneck.
- **Optimising the wrong query.** The slowest single query is not always the most expensive one; total time across all calls is what \`pg_stat_statements\` sorts by.
- **Trusting a plan from tiny dev data.** Plans change with table size and statistics.
- **Raising \`work_mem\` globally.** It is per sort or hash, per connection; a large global value can run the server out of memory under load.
- **Rewriting by rule instead of by plan.** "Joins are always faster than correlated subqueries" was false in the indexed case above (2.358 ms vs 40.841 ms).
- **Forgetting the result is the contract.** Every rewrite must return the same rows; compare results, including NULL and duplicate cases, before shipping.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Measure first:</strong> <span style="color:#f0e2c8;">I find the statements that cost the most in total with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_stat_statements</code> or the slow query log, then reproduce the slow one with its real parameters on production-sized data.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Read the plan:</strong> <span style="color:#f0e2c8;">I run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN (ANALYZE, BUFFERS)</code> and find the node where time and pages pile up: a big <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Rows Removed by Filter</code>, an estimate far from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">actual rows</code>, a high <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loops=</code> count, or a sort that spills to disk.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Read fewer rows:</strong> <span style="color:#f0e2c8;">Most fixes are here: make the predicate <strong style="color:#ffca28;">sargable</strong> (a date range instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">YEAR(col)</code>), add the index that matches the filter or the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY ... LIMIT</code>, refresh statistics with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ANALYZE</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Do less work:</strong> <span style="color:#f0e2c8;">Remove repeated work: a correlated subquery scanning a big table per row, N+1 queries from the ORM, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code> hiding a row-multiplying join; size <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">work_mem</code> per session for big sorts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verify and escalate:</strong> <span style="color:#f0e2c8;">One change at a time, same measurement, same results. If the plan is already good and still slow, I change the data: a summary table or materialized view, partitioning, or moving analytics off the OLTP primary.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The query is fast in psql but slow from the application. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually the app sends something different: a parameter type that adds a cast and blocks the index, a generic prepared-statement plan, or different session settings. I capture the exact statement and parameters and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN</code> that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are correlated subqueries always slower than joins?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Without an index the subquery scanned 200,000 rows per customer and took 2.8 s for 50 customers; aggregate-then-join took 41 ms. With an index on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">customer_id</code> the correlated version took 2.4 ms because it only touched those customers. The plan decides.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not add an index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the query returns a large share of the table, when the table is write-heavy and the query is rare, or when an existing composite index already serves it. Every index costs every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> of its columns.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does Sort Method: external merge Disk mean, and how do you fix it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The sort did not fit in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">work_mem</code> and spilled to temp files. Raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">work_mem</code> for that session or role, or remove the sort with an index in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> order. Raising it globally risks running out of memory because it applies per operation per connection.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find which queries to optimise in the first place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Enable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_stat_statements</code> (it needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shared_preload_libraries</code> and a restart) and sort by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total_exec_time</code>; a 5 ms query called a million times can cost more than one slow report. The MySQL equivalents are the slow query log and Performance Schema.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Query plan | The tree of scans, joins, sorts and aggregates the database chose |
| pg_stat_statements | PostgreSQL extension that records time and calls per query shape |
| Sargable | A predicate an index on the column can answer directly |
| Half-open range | \`>= start AND < next_start\`, the safe way to filter dates |
| Correlated subquery | A subquery that references the outer row and runs per outer row |
| N+1 query problem | One query for a list plus one query per item |
| work_mem | Memory per sort or hash operation before spilling to disk |

**Conclusion:** Optimising a slow query is a loop, not a bag of tricks: find the statement that costs the most, run \`EXPLAIN (ANALYZE, BUFFERS)\` with real parameters, locate the node where the rows, pages or time pile up, change one thing and measure again. Most fixes fall into four families: read fewer rows (sargable predicates, the right index, fresh statistics), do less work per row (no repeated scans per row, no N+1, no needless \`DISTINCT\`), avoid spills and wasted transfer (\`work_mem\` per session, no \`SELECT *\`, keyset pagination), and, when the query is already honest, change the data with summary tables, partitioning or a separate analytics store. The runs above show why the plan has to decide: the same correlated subquery was the slowest shape without an index and the fastest with one.`,
    examples: [
      {
        label: `SQLite: a function on the indexed date column forces a SCAN; a half-open range gives the same answer with SEARCH`,
        code: `-- Slow shape: a function wrapped around the indexed column
EXPLAIN QUERY PLAN
SELECT COUNT(*) AS orders_2024, SUM(amount) AS revenue_2024
FROM orders WHERE substr(order_date, 1, 4) = '2024';

-- Fast shape: a half-open range on the bare column
EXPLAIN QUERY PLAN
SELECT COUNT(*) AS orders_2024, SUM(amount) AS revenue_2024
FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';

-- Same answer both ways
SELECT 'substr' AS version, COUNT(*) AS orders_2024, SUM(amount) AS revenue_2024
FROM orders WHERE substr(order_date, 1, 4) = '2024'
UNION ALL
SELECT 'range', COUNT(*), SUM(amount)
FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';`,
      },
      {
        label: `SQLite: a correlated subquery run twice per customer, rewritten as aggregate-once-then-join`,
        code: `-- Slow shape: the subquery runs once per customer row
EXPLAIN QUERY PLAN
SELECT c.name,
       (SELECT SUM(o.amount) FROM orders o WHERE o.customer_id = c.id) AS total
FROM customers c
WHERE (SELECT SUM(o.amount) FROM orders o WHERE o.customer_id = c.id) > 100;

-- Rewrite: aggregate orders once, then join
EXPLAIN QUERY PLAN
SELECT c.name, t.total
FROM customers c
JOIN (SELECT customer_id, SUM(amount) AS total
      FROM orders GROUP BY customer_id) AS t ON t.customer_id = c.id
WHERE t.total > 100;

SELECT c.name, t.total
FROM customers c
JOIN (SELECT customer_id, SUM(amount) AS total
      FROM orders GROUP BY customer_id) AS t ON t.customer_id = c.id
WHERE t.total > 100
ORDER BY c.name;`,
      },
      {
        label: `PostgreSQL: a sort that spills to disk at work_mem 1MB and stays in memory at 64MB`,
        code: `SET max_parallel_workers_per_gather = 0;
CREATE TABLE big_orders (
  id int PRIMARY KEY,
  customer_id int NOT NULL,
  order_date date NOT NULL,
  amount numeric NOT NULL
) WITH (autovacuum_enabled = off);
INSERT INTO big_orders
SELECT g, (g * 7919) % 5000 + 1, DATE '2024-01-01' + (g * 31) % 366, (g * 37) % 1000 + 1
FROM generate_series(1, 200000) AS g;
ANALYZE big_orders;
CREATE FUNCTION plan_analyze(q text) RETURNS SETOF text LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN EXECUTE 'EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) ' || q LOOP
    RETURN NEXT r."QUERY PLAN";
  END LOOP;
END $$;
CREATE TABLE steps (n serial, step text, plan_line text);

SET work_mem = '1MB';
INSERT INTO steps (step, plan_line)
SELECT 'work_mem 1MB', plan_analyze('SELECT id, amount FROM big_orders ORDER BY amount DESC, id');

SET work_mem = '64MB';
INSERT INTO steps (step, plan_line)
SELECT 'work_mem 64MB', plan_analyze('SELECT id, amount FROM big_orders ORDER BY amount DESC, id');

SELECT step, plan_line FROM steps ORDER BY n;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: latest 10 orders — reading 200,000 rows to sort vs 10 rows from a matching index`,
        code: `SET max_parallel_workers_per_gather = 0;
CREATE TABLE big_orders (
  id int PRIMARY KEY,
  customer_id int NOT NULL,
  order_date date NOT NULL,
  amount numeric NOT NULL
) WITH (autovacuum_enabled = off);
INSERT INTO big_orders
SELECT g, (g * 7919) % 5000 + 1, DATE '2024-01-01' + (g * 31) % 366, (g * 37) % 1000 + 1
FROM generate_series(1, 200000) AS g;
ANALYZE big_orders;
CREATE FUNCTION plan_analyze(q text) RETURNS SETOF text LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN EXECUTE 'EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) ' || q LOOP
    RETURN NEXT r."QUERY PLAN";
  END LOOP;
END $$;
CREATE TABLE steps (n serial, step text, plan_line text);

INSERT INTO steps (step, plan_line)
SELECT 'no index', plan_analyze('SELECT id, order_date, amount FROM big_orders ORDER BY order_date DESC, id DESC LIMIT 10');

CREATE INDEX big_orders_date_id_idx ON big_orders (order_date, id);
INSERT INTO steps (step, plan_line)
SELECT 'index (order_date, id)', plan_analyze('SELECT id, order_date, amount FROM big_orders ORDER BY order_date DESC, id DESC LIMIT 10');

SELECT step, plan_line FROM steps ORDER BY n;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is table partitioning?`,
    difficulty: "hard",
    seoDescription: `Table partitioning explained: RANGE, LIST and HASH in PostgreSQL, partition pruning, cheap retention with DETACH and DROP, and the rules that bite.`,
    description: `**Question presented to candidate:**
"Our events table has a few billion rows, and most queries only look at the last few days. Someone suggested partitioning it. What is table partitioning, how does it work in PostgreSQL, and what does it actually buy us — and cost us?"

**What a strong answer should cover:**
- Definition: one logical table stored as several physical tables (partitions), each holding the rows for one range, list of values or hash bucket of a partition key; queries and inserts still target the parent
- The three methods (RANGE, LIST, HASH) and when each fits; a DEFAULT partition for rows that match no partition
- The real benefits: partition pruning (scanning only the partitions the \`WHERE\` clause can match), cheap retention by detaching or dropping a whole partition instead of a huge \`DELETE\`, smaller per-partition indexes and maintenance
- The costs and rules: primary keys and unique constraints must include the partition key, queries without the key scan every partition, too many partitions slow planning, partitions must be created ahead of the data
- How it differs from sharding (partitions live on one server) and from indexing (an index does not make old data cheap to drop)
- Engine facts: PostgreSQL declarative partitioning since version 10 (HASH and DEFAULT since 11); MySQL partitioned InnoDB tables cannot have foreign keys; SQLite has no partitioning

**Clarifying questions expected:**
- Which column do almost all queries filter on, and how is old data removed today?
- How many rows per day, and how long must data be kept?

**Code / implementation expected:** Optional — a \`PARTITION BY RANGE\` table with monthly partitions, a pruned plan, and a detach-and-drop for retention.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  event_date TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL
);
INSERT INTO events (id, event_date, user_id, kind) VALUES
  (1, '2024-01-03', 1, 'login'),
  (2, '2024-01-17', 2, 'purchase'),
  (3, '2024-01-28', 1, 'logout'),
  (4, '2024-02-02', 3, 'login'),
  (5, '2024-02-14', 2, 'purchase'),
  (6, '2024-02-20', 3, 'purchase'),
  (7, '2024-02-29', 1, 'login'),
  (8, '2024-03-05', 2, 'login'),
  (9, '2024-03-18', 3, 'logout'),
  (10, '2024-03-30', 1, 'purchase');
\`\`\``,
    answer: `**Target Audience:** Developers whose biggest table keeps growing and who keep hearing "just partition it", and candidates who need to explain what partitioning does and does not solve.
**Difficulty:** Hard
**Engines:** PostgreSQL 16.15 (declarative partitioning; every plan and error here was produced on it) and SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable example uses; it has no partitioning, so the example builds it by hand). MySQL facts are from its manual and marked as not run here.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result, plan and error shown was produced by running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

An accountant keeps every receipt the company ever received in one enormous box. To find March's receipts she digs through ten years of paper. To throw away receipts older than seven years, she has to pick through the whole box, one receipt at a time.

So she switches to one folder per month. Finding March means opening one folder. Throwing away old years means taking the oldest folders off the shelf and shredding them whole. Anyone who asks "show me all receipts" still gets them: she just opens every folder.

That is table partitioning. The folders are partitions, the date written on each receipt is the partition key, and the shelf label "receipts" is the parent table that everyone keeps using.

📌 **Interview term: table partitioning** — storing one logical table as several physical tables, each holding the rows whose partition key falls in that partition's range, list or hash bucket. Applications query and insert into the parent; the database routes rows and skips irrelevant partitions.

📌 **Interview term: partition key** — the column (or expression) that decides which partition a row lives in, such as \`event_date\`.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which column do nearly all queries filter on? | Pruning only works when queries filter on the partition key; otherwise every partition is scanned |
| How is old data removed today, and how long is it kept? | Cheap retention (drop a partition) is often the biggest win |
| How many rows per day, and how big is the table? | Decides the partition size: daily, monthly or yearly |
| Do other tables reference this one with foreign keys, and what is the primary key? | Unique keys must include the partition key; MySQL forbids foreign keys on partitioned InnoDB tables |
| Is the problem one server running out of capacity? | Then you need sharding or a different store, not partitioning |

## 3. The Idea Without a Partitioning Feature

SQLite has no partitioning, which makes it a good place to see what the feature does underneath. The first example splits \`events\` into one table per month, each with a \`CHECK\` on its date range, and puts a \`UNION ALL\` view on top:

~~~text
part | row_count | first_day | last_day
events_2024_01 | 3 | 2024-01-03 | 2024-01-28
events_2024_02 | 4 | 2024-02-02 | 2024-02-29
events_2024_03 | 3 | 2024-03-05 | 2024-03-30

id | parent | notused | detail
2 | 0 | 0 | CO-ROUTINE all_events
3 | 2 | 0 | COMPOUND QUERY
4 | 3 | 0 | LEFT-MOST SUBQUERY
6 | 4 | 0 | SCAN events_2024_01
19 | 3 | 0 | UNION ALL
21 | 19 | 0 | SCAN events_2024_02
34 | 3 | 0 | UNION ALL
36 | 34 | 0 | SCAN events_2024_03
51 | 0 | 0 | SCAN all_events

part | row_count
events_2024_02 | 4
events_2024_03 | 3
~~~

Three things show up:

1. **Readers see one table.** The \`all_events\` view returns every row, with each month in its own physical table.
2. **SQLite does not skip tables.** The plan for a February-only count still has \`SCAN events_2024_01\`, \`SCAN events_2024_02\` and \`SCAN events_2024_03\`: the \`CHECK\` constraints are not used to avoid tables. Skipping irrelevant partitions is exactly what a real partitioning feature adds.
3. **Retention is a \`DROP TABLE\`.** January disappears without deleting row by row.

This "tables plus a view" pattern (or table inheritance plus triggers) is how PostgreSQL users partitioned before version 10. PostgreSQL 10 introduced declarative partitioning with RANGE and LIST; PostgreSQL 11 added HASH partitioning and the DEFAULT partition ([PostgreSQL wiki: Table partitioning](https://wiki.postgresql.org/wiki/Table_partitioning); [pgDash: partitioning in PostgreSQL 11](https://pgdash.io/blog/partition-postgres-11.html)).

## 4. Declarative Partitioning in PostgreSQL

The PostgreSQL examples create this table (the \`events\` rows from the schema are copied into it):

~~~sql
CREATE TABLE events_part (
  id int NOT NULL,
  event_date date NOT NULL,
  user_id int NOT NULL,
  kind text NOT NULL,
  PRIMARY KEY (id, event_date)
) PARTITION BY RANGE (event_date);
CREATE TABLE events_part_2024_01 PARTITION OF events_part
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE events_part_2024_02 PARTITION OF events_part
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE events_part_2024_03 PARTITION OF events_part
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE events_part_default PARTITION OF events_part DEFAULT;
~~~

The parent \`events_part\` stores no rows itself. Range bounds are **inclusive at \`FROM\` and exclusive at \`TO\`**, so \`2024-02-01\` belongs to February only.

<svg class="iq-diagram" width="100%" viewBox="0 0 840 330" role="img" aria-label="Queries and inserts go to the parent table events_part, which stores no rows. Rows are routed by event_date to monthly partitions for January, February, March and a default partition">
  <defs>
    <marker id="sql16q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="270" y="30" width="300" height="80" rx="12"/>
  <text class="d-text" x="420" y="64" text-anchor="middle">events_part (parent)</text>
  <text class="d-sub" x="420" y="90" text-anchor="middle">PARTITION BY RANGE (event_date)</text>
  <rect class="d-box" x="10" y="210" width="190" height="90" rx="10"/>
  <text class="d-text" x="105" y="246" text-anchor="middle">2024_01</text>
  <text class="d-sub" x="105" y="272" text-anchor="middle">Jan 1 to Feb 1</text>
  <rect class="d-box" x="225" y="210" width="190" height="90" rx="10"/>
  <text class="d-text" x="320" y="246" text-anchor="middle">2024_02</text>
  <text class="d-sub" x="320" y="272" text-anchor="middle">Feb 1 to Mar 1</text>
  <rect class="d-box" x="440" y="210" width="190" height="90" rx="10"/>
  <text class="d-text" x="535" y="246" text-anchor="middle">2024_03</text>
  <text class="d-sub" x="535" y="272" text-anchor="middle">Mar 1 to Apr 1</text>
  <rect class="d-box-muted" x="655" y="210" width="175" height="90" rx="10"/>
  <text class="d-text" x="742" y="246" text-anchor="middle">default</text>
  <text class="d-sub" x="742" y="272" text-anchor="middle">anything else</text>
  <line class="d-edge" x1="360" y1="114" x2="120" y2="202" marker-end="url(#sql16q3-arrow)"/>
  <line class="d-edge" x1="400" y1="114" x2="325" y2="202" marker-end="url(#sql16q3-arrow)"/>
  <line class="d-edge" x1="440" y1="114" x2="525" y2="202" marker-end="url(#sql16q3-arrow)"/>
  <line class="d-edge-dashed" x1="480" y1="114" x2="725" y2="202" marker-end="url(#sql16q3-arrow)"/>
</svg>

The second example inserts the ten rows plus one from April, and asks each row where it was stored (\`tableoid::regclass\` is the physical table a row came from):

~~~text
stored_in | row_count | first_day | last_day
events_part_2024_01 | 3 | 2024-01-03 | 2024-01-28
events_part_2024_02 | 4 | 2024-02-02 | 2024-02-29
events_part_2024_03 | 3 | 2024-03-05 | 2024-03-30
events_part_default | 1 | 2024-04-02 | 2024-04-02
~~~

The April row has no monthly partition, so it went to the DEFAULT partition. Without a default partition, the insert fails. On PostgreSQL 16:

~~~text
ERROR:  no partition of relation "ev" found for row
DETAIL:  Partition key of the failing row contains (d) = (2024-05-05).
~~~

📌 **Interview term: tuple routing** — the database choosing the partition for each inserted row from its partition key. An \`UPDATE\` that changes the key moves the row to the right partition (I ran one on PostgreSQL 16: the row moved from the default partition to February).

📌 **Interview term: DEFAULT partition** — a catch-all partition for rows that match no other partition. Useful as a safety net, but it has costs: creating a new partition must check the default for rows in that range (\`ERROR:  updated partition constraint for default partition "ev_def" would be violated by some row\` when it holds some), and \`DETACH ... CONCURRENTLY\` refuses to run while one exists.

### The three methods

| Method | Rows go by | Good for | Example bound |
| :--- | :--- | :--- | :--- |
| RANGE | A continuous range of the key | Time series, retention by age | \`FOR VALUES FROM ('2024-02-01') TO ('2024-03-01')\` |
| LIST | An explicit list of values | Region, tenant tier, status | \`FOR VALUES IN ('EU', 'UK')\` |
| HASH | Hash of the key modulo N | Spreading writes and vacuum evenly when there is no natural range | \`FOR VALUES WITH (MODULUS 3, REMAINDER 0)\` |

A HASH split of 30,000 sequential \`user_id\` values into 3 partitions on PostgreSQL 16 gave 9,937 / 10,148 / 9,915 rows: even, but not exact. Hash partitions do not make retention cheap, because every partition contains old and new rows.

Partitions can themselves be partitioned (by month, then by region), which is called sub-partitioning. Use it sparingly: the partition count multiplies.

## 5. Partition Pruning: Why Queries Get Faster

📌 **Interview term: partition pruning** — the planner or executor proving from the \`WHERE\` clause that some partitions cannot contain matching rows and not scanning them at all.

The third example compares a February filter with a filter that does not mention the key:

~~~text
query | plan_line
February only | Aggregate
February only |   ->  Seq Scan on events_part_2024_02 events_part
February only |         Filter: ((event_date >= '2024-02-01'::date) AND (event_date < '2024-03-01'::date))
no date filter | Aggregate
no date filter |   ->  Append
no date filter |         ->  Seq Scan on events_part_2024_01 events_part_1
no date filter |               Filter: (user_id = 2)
no date filter |         ->  Seq Scan on events_part_2024_02 events_part_2
no date filter |               Filter: (user_id = 2)
no date filter |         ->  Seq Scan on events_part_2024_03 events_part_3
no date filter |               Filter: (user_id = 2)
no date filter |         ->  Seq Scan on events_part_default events_part_4
no date filter |               Filter: (user_id = 2)
~~~

- **February only:** the plan contains only \`events_part_2024_02\`. January, March and the default partition are not in the plan at all.
- **No date filter:** an \`Append\` over all four partitions. Partitioning made this query no faster; with many partitions it is slower than one table with a good index on \`user_id\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 840 230" role="img" aria-label="Partition pruning: a query for February scans only the February partition and skips the January, March and default partitions">
  <rect class="d-box-muted" x="10" y="40" width="190" height="80" rx="10"/>
  <text class="d-text" x="105" y="76" text-anchor="middle">2024_01</text>
  <text class="d-sub" x="105" y="100" text-anchor="middle">skipped</text>
  <rect class="d-box-accent" x="225" y="40" width="190" height="80" rx="10"/>
  <text class="d-text" x="320" y="76" text-anchor="middle">2024_02</text>
  <text class="d-sub" x="320" y="100" text-anchor="middle">scanned</text>
  <rect class="d-box-muted" x="440" y="40" width="190" height="80" rx="10"/>
  <text class="d-text" x="535" y="76" text-anchor="middle">2024_03</text>
  <text class="d-sub" x="535" y="100" text-anchor="middle">skipped</text>
  <rect class="d-box-muted" x="655" y="40" width="175" height="80" rx="10"/>
  <text class="d-text" x="742" y="76" text-anchor="middle">default</text>
  <text class="d-sub" x="742" y="100" text-anchor="middle">skipped</text>
  <rect class="d-box" x="170" y="160" width="500" height="50" rx="10"/>
  <text class="d-text" x="420" y="190" text-anchor="middle">WHERE event_date in February</text>
  <line class="d-edge-accent" x1="320" y1="156" x2="320" y2="124"/>
</svg>

Pruning also works at execution time, when the value is only known then (a prepared-statement parameter, a subquery result). With a forced generic plan on PostgreSQL 16 the plan showed:

~~~text
Aggregate (actual rows=1 loops=1)
  ->  Append (actual rows=0 loops=1)
        Subplans Removed: 2
        ->  Seq Scan on ev_02 ev_1 (actual rows=0 loops=1)
              Filter: (d = $1)
~~~

\`Subplans Removed: 2\` is runtime pruning. Plan-time and execution-time pruning were improved in PostgreSQL 11 ([PostgreSQL 11 release notes](https://www.postgresql.org/docs/release/11.0/)); it is controlled by \`enable_partition_pruning\` (\`on\` on this server).

📌 **Interview term: Append node** — the plan node that concatenates the results of scanning several partitions. Count its children to see how many partitions a query really touches.

## 6. Retention and Growth: the Biggest Practical Win

Deleting a month from a single big table means \`DELETE ... WHERE event_date < ...\`: millions of row versions marked dead, a large WAL volume, index entries to clean up, and a long vacuum afterwards. With partitions it is a metadata operation. The fourth example drops January and adds April:

~~~sql
ALTER TABLE events_part DETACH PARTITION events_part_2024_01;
DROP TABLE events_part_2024_01;
CREATE TABLE events_part_2024_04 PARTITION OF events_part
  FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
~~~

~~~text
partition_name | bounds
events_part_2024_02 | FOR VALUES FROM ('2024-02-01') TO ('2024-03-01')
events_part_2024_03 | FOR VALUES FROM ('2024-03-01') TO ('2024-04-01')
events_part_2024_04 | FOR VALUES FROM ('2024-04-01') TO ('2024-05-01')
events_part_default | DEFAULT
~~~

📌 **Interview term: DETACH PARTITION** — turning a partition back into a standalone table. You can then drop it, archive it, or move it to cheaper storage. PostgreSQL 14 added \`DETACH PARTITION ... CONCURRENTLY\`, which takes a weaker lock so queries on the parent keep running; it cannot run inside a transaction block and, as noted above, not when a default partition exists ([PostgreSQL 16: ALTER TABLE](https://www.postgresql.org/docs/16/sql-altertable.html)).

Partitions must exist **before** their rows arrive. Production systems create next month's partition ahead of time with a scheduled job or an extension such as \`pg_partman\`, and alert when the newest partition is close to running out.

## 7. The Rules That Bite

**Unique keys must include the partition key.** Each partition enforces uniqueness only on its own rows, so PostgreSQL requires the key columns in every primary key and unique constraint. On PostgreSQL 16:

~~~text
ERROR:  unique constraint on partitioned table must include all partitioning columns
DETAIL:  PRIMARY KEY constraint on table "bad" lacks column "d" which is part of the partition key.
~~~

That is why the example uses \`PRIMARY KEY (id, event_date)\`. A globally unique \`id\` alone cannot be enforced; a sequence or UUID makes collisions unlikely, but the database no longer guarantees it.

**Partitions must not overlap:** \`ERROR:  partition "ev_01b" would overlap partition "ev_01"\`.

**Indexes are per partition.** \`CREATE INDEX ON ev (d)\` on the parent created \`ev_01_d_idx\`, \`ev_02_d_idx\` and \`ev_def_d_idx\` on PostgreSQL 16, one per partition, and new partitions get one automatically. Smaller per-partition indexes are a benefit: recent partitions' indexes stay in memory.

**Foreign keys.** In PostgreSQL 16 another table can reference a partitioned table if the referenced columns form its primary key (I created one referencing \`(id, d)\`). In MySQL, partitioned InnoDB tables cannot have foreign keys or be referenced by them ([MySQL 8.0: restrictions on partitioning](https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations.html); not run here).

**Too many partitions** make planning slower and use more memory per query: every query on the parent has to consider all of them before pruning. Thousands of tiny daily partitions for a table that only needs monthly ones is a common mistake.

## 8. Partitioning vs Indexing vs Sharding

| | Index | Partitioning | Sharding |
| :--- | :--- | :--- | :--- |
| What it splits | Nothing; adds a lookup structure | One table into several tables | Data across several servers |
| Makes point lookups fast | Yes | Only with an index inside the partition | Only if the shard key is in the query |
| Makes dropping old data cheap | No | Yes (drop a partition) | Sometimes |
| Adds write or storage capacity | No | No (same server) | Yes |
| Query without the key | Seq Scan if no other index | Scans all partitions | Asks all shards |

Partitioning is a tool for **large tables with a dominant filter column and data that ages out**. For a 5-million-row table without a retention need, a good index is usually enough. For a database that has outgrown one server, it is sharding (for example the Citus extension, which distributes tables across PostgreSQL nodes) or a different store.

## 9. Verified: Running the Code

The SQLite example was run the way this page runs it (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The three PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database seeded with the same schema. The error messages, the runtime-pruning plan, the hash distribution, the row-moving \`UPDATE\`, the per-partition index names and the foreign key in prose were produced on the same server with \`psql\`.

Example 1, partitioning by hand in SQLite:

~~~text
part | row_count | first_day | last_day
events_2024_01 | 3 | 2024-01-03 | 2024-01-28
events_2024_02 | 4 | 2024-02-02 | 2024-02-29
events_2024_03 | 3 | 2024-03-05 | 2024-03-30

id | parent | notused | detail
2 | 0 | 0 | CO-ROUTINE all_events
3 | 2 | 0 | COMPOUND QUERY
4 | 3 | 0 | LEFT-MOST SUBQUERY
6 | 4 | 0 | SCAN events_2024_01
19 | 3 | 0 | UNION ALL
21 | 19 | 0 | SCAN events_2024_02
34 | 3 | 0 | UNION ALL
36 | 34 | 0 | SCAN events_2024_03
51 | 0 | 0 | SCAN all_events

part | row_count
events_2024_02 | 4
events_2024_03 | 3
~~~

Example 2, tuple routing:

~~~text
stored_in | row_count | first_day | last_day
events_part_2024_01 | 3 | 2024-01-03 | 2024-01-28
events_part_2024_02 | 4 | 2024-02-02 | 2024-02-29
events_part_2024_03 | 3 | 2024-03-05 | 2024-03-30
events_part_default | 1 | 2024-04-02 | 2024-04-02
~~~

Example 3, partition pruning:

~~~text
query | plan_line
February only | Aggregate
February only |   ->  Seq Scan on events_part_2024_02 events_part
February only |         Filter: ((event_date >= '2024-02-01'::date) AND (event_date < '2024-03-01'::date))
no date filter | Aggregate
no date filter |   ->  Append
no date filter |         ->  Seq Scan on events_part_2024_01 events_part_1
no date filter |               Filter: (user_id = 2)
no date filter |         ->  Seq Scan on events_part_2024_02 events_part_2
no date filter |               Filter: (user_id = 2)
no date filter |         ->  Seq Scan on events_part_2024_03 events_part_3
no date filter |               Filter: (user_id = 2)
no date filter |         ->  Seq Scan on events_part_default events_part_4
no date filter |               Filter: (user_id = 2)
~~~

Example 4, retention and growth:

~~~text
partition_name | bounds
events_part_2024_02 | FOR VALUES FROM ('2024-02-01') TO ('2024-03-01')
events_part_2024_03 | FOR VALUES FROM ('2024-03-01') TO ('2024-04-01')
events_part_2024_04 | FOR VALUES FROM ('2024-04-01') TO ('2024-05-01')
events_part_default | DEFAULT
~~~

## Edge Cases

- **Functions on the key defeat pruning**, just as they defeat indexes: on PostgreSQL 16, \`WHERE date_trunc('month', event_date) = '2024-02-01'\` scanned all four partitions, while the equivalent range on \`event_date\` scanned one. Filter on the bare key.
- **Moving a table to partitioning is a migration.** You cannot \`ALTER\` an existing plain table into a partitioned one; you create the partitioned table, copy or attach existing data, and swap names. \`ALTER TABLE ... ATTACH PARTITION plain_apr FOR VALUES FROM ('2024-04-01') TO ('2024-05-01')\` turned an existing plain table into a partition on PostgreSQL 16 (it checks that every row fits the bounds; a matching \`CHECK\` constraint added beforehand lets it skip that scan).
- **Global ordering.** With an index on \`event_date\`, \`ORDER BY event_date LIMIT 3\` on PostgreSQL 16 ran as \`Limit -> Merge Append\` over one index scan per partition, merging them in order instead of sorting everything.
- **Statistics are per partition.** \`ANALYZE\` on the parent gathers statistics for the hierarchy; autovacuum processes partitions as separate tables.

## Common Pitfalls

- **Partitioning a table whose queries do not filter on the key.** Every query becomes an \`Append\` over all partitions, which is slower, not faster.
- **Expecting partitioning to replace indexes.** Pruning picks the partitions; inside a partition you still need indexes for selective lookups.
- **Forgetting to create future partitions.** Without a default partition, inserts fail at midnight on the first day of the month; with one, rows pile into the default and make the next \`CREATE ... PARTITION OF\` fail.
- **Choosing too many, too small partitions.** Planning time and memory grow with the partition count.
- **Assuming a primary key on \`id\` alone.** It must include the partition key, so global uniqueness of \`id\` is no longer enforced.
- **Confusing it with sharding.** All partitions are on one server; it adds no write capacity.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">Partitioning stores one logical table as several physical tables, split by a <strong style="color:#ffca28;">partition key</strong>. Applications still query and insert into the parent; the database routes each row to its partition.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Methods:</strong> <span style="color:#f0e2c8;">RANGE for time series (one partition per month), LIST for discrete values such as region, HASH to spread rows evenly when there is no natural range. PostgreSQL has declarative partitioning since 10, with HASH and DEFAULT partitions since 11.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What it buys:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Partition pruning</strong>: a query that filters on the key scans only matching partitions, so a February query touches one partition. And cheap retention: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DETACH</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DROP</code> a month instead of a huge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE</code> that bloats the table and WAL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What it costs:</strong> <span style="color:#f0e2c8;">Unique keys must include the partition key, queries without the key scan every partition, partitions must be created ahead of the data, and thousands of partitions slow planning. MySQL also forbids foreign keys on partitioned InnoDB tables.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When I use it:</strong> <span style="color:#f0e2c8;">Large, time-ordered tables where nearly every query filters on the key and old data ages out. Otherwise an index is enough; and if one server is too small, that is sharding, not partitioning.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the primary key include the partition key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each partition has its own index and can only enforce uniqueness on its own rows. Including the key guarantees duplicates would land in the same partition. PostgreSQL rejects a primary key without it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unique constraint on partitioned table must include all partitioning columns</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to a query that does not filter on the partition key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It scans every partition through an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Append</code> node, one child per partition. That is no faster than one table and can be slower, so indexes on the other filter columns still matter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you delete data older than a year from a partitioned table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ALTER TABLE ... DETACH PARTITION</code> the old partitions and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DROP</code> them, or archive them first. No row-by-row delete, no dead rows to vacuum. On PostgreSQL 14+ <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DETACH ... CONCURRENTLY</code> avoids blocking queries, but not inside a transaction or with a default partition.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between partitioning and sharding?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Partitioning splits a table into pieces on the same server. Sharding spreads data across several servers to add capacity. Both use a key, and both make queries without that key touch every piece.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when a row arrives for a month with no partition?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without a DEFAULT partition the insert fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">no partition of relation ... found for row</code>. With one, the row lands there, and later creating that month partition fails until those rows are moved. Create partitions ahead of time with a job or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_partman</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Table partitioning | One logical table stored as several physical tables split by a key |
| Partition key | The column or expression that decides which partition a row goes to |
| Tuple routing | The database placing each inserted or updated row in the right partition |
| DEFAULT partition | Catch-all partition for rows that match no other partition |
| Partition pruning | Skipping partitions the \`WHERE\` clause proves cannot match |
| Append node | Plan node that concatenates results from several partitions |
| DETACH PARTITION | Turning a partition into a standalone table, e.g. before dropping it |

**Conclusion:** Partitioning splits one big table into many smaller physical tables by a partition key, while applications keep using the parent. In PostgreSQL that means \`PARTITION BY RANGE\`, \`LIST\` or \`HASH\`, rows routed automatically, and partition pruning that leaves irrelevant partitions out of the plan, as the February query showed. The biggest practical win is usually retention: dropping a month is a metadata change instead of a massive \`DELETE\`. The price is a set of rules: unique keys must include the partition key, queries without the key scan every partition, partitions must be created ahead of the data, and too many partitions slow planning. It is the right tool for large, time-ordered tables with a dominant filter column; it does not add capacity like sharding, and it does not replace indexes.`,
    examples: [
      {
        label: `SQLite: partitioning by hand — one table per month, a UNION ALL view, and a cheap DROP for retention`,
        code: `-- Partitioning by hand: one table per month, each with a CHECK on its range
CREATE TABLE events_2024_01 (id INTEGER PRIMARY KEY, event_date TEXT NOT NULL
  CHECK (event_date >= '2024-01-01' AND event_date < '2024-02-01'), user_id INTEGER, kind TEXT);
CREATE TABLE events_2024_02 (id INTEGER PRIMARY KEY, event_date TEXT NOT NULL
  CHECK (event_date >= '2024-02-01' AND event_date < '2024-03-01'), user_id INTEGER, kind TEXT);
CREATE TABLE events_2024_03 (id INTEGER PRIMARY KEY, event_date TEXT NOT NULL
  CHECK (event_date >= '2024-03-01' AND event_date < '2024-04-01'), user_id INTEGER, kind TEXT);
INSERT INTO events_2024_01 SELECT * FROM events WHERE event_date < '2024-02-01';
INSERT INTO events_2024_02 SELECT * FROM events WHERE event_date >= '2024-02-01' AND event_date < '2024-03-01';
INSERT INTO events_2024_03 SELECT * FROM events WHERE event_date >= '2024-03-01';

-- One logical table for readers
CREATE VIEW all_events AS
  SELECT 'events_2024_01' AS part, * FROM events_2024_01
  UNION ALL SELECT 'events_2024_02', * FROM events_2024_02
  UNION ALL SELECT 'events_2024_03', * FROM events_2024_03;

SELECT part, COUNT(*) AS row_count, MIN(event_date) AS first_day, MAX(event_date) AS last_day
FROM all_events GROUP BY part ORDER BY part;

-- SQLite does not use the CHECKs to skip tables: all three are still scanned
EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM all_events
WHERE event_date >= '2024-02-01' AND event_date < '2024-03-01';

-- Retention is cheap: dropping a month is a metadata change, not a big DELETE
DROP VIEW all_events;
DROP TABLE events_2024_01;
CREATE VIEW all_events AS
  SELECT 'events_2024_02' AS part, * FROM events_2024_02
  UNION ALL SELECT 'events_2024_03', * FROM events_2024_03;
SELECT part, COUNT(*) AS row_count FROM all_events GROUP BY part ORDER BY part;`,
      },
      {
        label: `PostgreSQL: a RANGE-partitioned table routes each row to its month (and an April row to DEFAULT)`,
        code: `CREATE TABLE events_part (
  id int NOT NULL,
  event_date date NOT NULL,
  user_id int NOT NULL,
  kind text NOT NULL,
  PRIMARY KEY (id, event_date)
) PARTITION BY RANGE (event_date);
CREATE TABLE events_part_2024_01 PARTITION OF events_part
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE events_part_2024_02 PARTITION OF events_part
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE events_part_2024_03 PARTITION OF events_part
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE events_part_default PARTITION OF events_part DEFAULT;

INSERT INTO events_part SELECT id, event_date::date, user_id, kind FROM events;
INSERT INTO events_part VALUES (11, '2024-04-02', 2, 'login');

SELECT tableoid::regclass AS stored_in, COUNT(*) AS row_count,
       MIN(event_date) AS first_day, MAX(event_date) AS last_day
FROM events_part
GROUP BY tableoid
ORDER BY first_day;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: partition pruning — a February filter scans one partition, a filter without the key scans all`,
        code: `CREATE TABLE events_part (
  id int NOT NULL,
  event_date date NOT NULL,
  user_id int NOT NULL,
  kind text NOT NULL,
  PRIMARY KEY (id, event_date)
) PARTITION BY RANGE (event_date);
CREATE TABLE events_part_2024_01 PARTITION OF events_part
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE events_part_2024_02 PARTITION OF events_part
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE events_part_2024_03 PARTITION OF events_part
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE events_part_default PARTITION OF events_part DEFAULT;
INSERT INTO events_part SELECT id, event_date::date, user_id, kind FROM events;
ANALYZE events_part;
CREATE FUNCTION plan(q text) RETURNS SETOF text LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN EXECUTE 'EXPLAIN (COSTS OFF) ' || q LOOP
    RETURN NEXT r."QUERY PLAN";
  END LOOP;
END $$;
CREATE TABLE steps (n serial, query text, plan_line text);

INSERT INTO steps (query, plan_line)
SELECT 'February only', plan('SELECT COUNT(*) FROM events_part WHERE event_date >= ''2024-02-01'' AND event_date < ''2024-03-01''');

INSERT INTO steps (query, plan_line)
SELECT 'no date filter', plan('SELECT COUNT(*) FROM events_part WHERE user_id = 2');

SELECT query, plan_line FROM steps ORDER BY n;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: retention and growth — DETACH and DROP January, CREATE April, list the partitions`,
        code: `CREATE TABLE events_part (
  id int NOT NULL,
  event_date date NOT NULL,
  user_id int NOT NULL,
  kind text NOT NULL,
  PRIMARY KEY (id, event_date)
) PARTITION BY RANGE (event_date);
CREATE TABLE events_part_2024_01 PARTITION OF events_part
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE events_part_2024_02 PARTITION OF events_part
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE events_part_2024_03 PARTITION OF events_part
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE events_part_default PARTITION OF events_part DEFAULT;
INSERT INTO events_part SELECT id, event_date::date, user_id, kind FROM events;

-- Retention: remove January without a DELETE
ALTER TABLE events_part DETACH PARTITION events_part_2024_01;
DROP TABLE events_part_2024_01;

-- Next month: create the partition before its rows arrive
CREATE TABLE events_part_2024_04 PARTITION OF events_part
  FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

SELECT c.relname AS partition_name,
       pg_get_expr(c.relpartbound, c.oid) AS bounds
FROM pg_inherits i
JOIN pg_class c ON c.oid = i.inhrelid
WHERE i.inhparent = 'events_part'::regclass
ORDER BY c.relname;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the difference between OLTP and OLAP databases?`,
    difficulty: "medium",
    seoDescription: `OLTP vs OLAP: short key-based transactions vs large scans and aggregates, row vs column storage, star schemas, ETL and CDC, with verified examples.`,
    description: `**Question presented to candidate:**
"People talk about OLTP databases and OLAP databases as if they were different things. What is the difference, why can't one database just do both well, and how would a typical company set them up?"

**What a strong answer should cover:**
- OLTP (online transaction processing): many small, short read/write transactions touching a few rows by key — placing an order, updating stock; needs low latency, high concurrency, ACID, a normalised schema and B-tree indexes
- OLAP (online analytical processing): fewer, large read-mostly queries scanning and aggregating millions of rows — revenue by month and region; needs throughput, a denormalised star schema, and usually columnar storage with compression
- Why the storage layout differs: row stores read whole rows (good for "fetch order 7"), column stores read only the columns a query uses (good for "sum one column over a billion rows")
- How they connect: data is copied from OLTP systems into a warehouse by ETL/ELT or change data capture, so analytics do not slow down user-facing transactions
- Examples of each kind (PostgreSQL, MySQL, SQL Server for OLTP; Snowflake, BigQuery, Redshift, ClickHouse for OLAP) and the HTAP middle ground

**Code / implementation expected:** Optional — an OLTP transaction and point lookup next to an OLAP aggregation, or a small fact/dimension example.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INTEGER NOT NULL CHECK (stock >= 0)
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer TEXT NOT NULL,
  region TEXT NOT NULL,
  order_date TEXT NOT NULL
);
CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
INSERT INTO products (id, name, category, price, stock) VALUES
  (1, 'Keyboard', 'accessories', 40, 25),
  (2, 'Mouse', 'accessories', 20, 50),
  (3, 'Monitor', 'displays', 180, 8),
  (4, 'Laptop', 'computers', 900, 5);
INSERT INTO orders (id, customer, region, order_date) VALUES
  (1, 'Asha', 'APAC', '2024-01-05'),
  (2, 'Ben', 'NA', '2024-01-20'),
  (3, 'Chen', 'APAC', '2024-02-03'),
  (4, 'Dana', 'NA', '2024-02-17'),
  (5, 'Asha', 'APAC', '2024-02-25'),
  (6, 'Emil', 'EU', '2024-03-09');
INSERT INTO order_items (order_id, product_id, qty, unit_price) VALUES
  (1, 1, 1, 40), (1, 2, 2, 20),
  (2, 4, 1, 900),
  (3, 3, 2, 180), (3, 2, 1, 20),
  (4, 1, 3, 40),
  (5, 4, 1, 900), (5, 3, 1, 180),
  (6, 2, 4, 20);
\`\`\``,
    answer: `**Target Audience:** Beginners who hear "OLTP" and "OLAP" in architecture discussions, and candidates who need to explain why companies run a separate data warehouse.
**Difficulty:** Medium
**Engines:** The SQL examples run on SQLite 3.45.0 (sql.js 1.10.2, the engine this page uses) and returned the same rows on PostgreSQL 16.15; the plan comparison ran on PostgreSQL 16.15. Facts about warehouse products are cited from their documentation, not run here.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and plan shown was produced by running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A supermarket has two kinds of work.

At the checkout, hundreds of cashiers each scan a few items, take a payment and print a receipt, all day, every few seconds. Each sale must be fast, must never be lost, and two cashiers must never sell the last bottle of milk twice.

In the back office, once a week, an analyst asks: "Which product categories grew fastest in each region over the last two years?" To answer, she needs every sale ever made, but only three facts about each: date, region, category. She does not care about the cashier's name or the receipt number.

If the analyst ran her question on the checkout tills, every till would freeze while it searched through two years of receipts. So the supermarket copies the sales to a separate archive every night, organised for her kind of question. The tills are OLTP. The archive is OLAP.

📌 **Interview term: OLTP (online transaction processing)** — the workload of an application's day-to-day operations: many short transactions that each read or write a few rows, usually by primary key, with strict correctness (ACID) and low latency.

📌 **Interview term: OLAP (online analytical processing)** — the workload of analysis and reporting: fewer, long-running, read-mostly queries that scan and aggregate large amounts of history. The term was coined by E. F. Codd in 1993 ([Wikipedia: Edgar F. Codd](https://en.wikipedia.org/wiki/Edgar_F._Codd); the paper was sponsored by an OLAP vendor, Arbor Software, which drew criticism).

## 2. The Two Workloads Side by Side

The first example is OLTP: one customer places one order. Three small writes in one transaction, then a lookup by key:

~~~sql
BEGIN;
INSERT INTO orders (id, customer, region, order_date) VALUES (7, 'Farah', 'EU', '2024-03-12');
INSERT INTO order_items (order_id, product_id, qty, unit_price) VALUES (7, 3, 1, 180);
UPDATE products SET stock = stock - 1 WHERE id = 3;
COMMIT;
~~~

~~~text
id | customer | name | qty | unit_price | stock_left
7 | Farah | Monitor | 1 | 180 | 7
~~~

The transaction touched one row in each of three tables. The \`CHECK (stock >= 0)\` constraint and the transaction protect correctness: the stock cannot go negative and the order never exists without its line item. A real shop runs thousands of these per second; each must finish in milliseconds.

📌 **Interview term: point query** — a query that finds a few rows by a key (\`WHERE o.id = 7\`) through an index. The defining query shape of OLTP.

The second example is OLAP: revenue per month and category over all orders:

~~~text
month | category | revenue | orders
2024-01 | computers | 900 | 1
2024-01 | accessories | 80 | 1
2024-02 | computers | 900 | 1
2024-02 | displays | 540 | 2
2024-02 | accessories | 140 | 2
2024-03 | accessories | 80 | 1
~~~

It reads every order and every line item to produce six summary rows. Nothing is written. On a real system it might read a billion rows, and taking 5 seconds is fine; it runs a few times an hour, not thousands of times a second.

The fourth example shows the difference in the plans on a 200,000-row \`sales\` table in PostgreSQL:

~~~text
workload | plan_line
OLTP lookup | Index Scan using sales_pkey on sales (actual rows=1 loops=1)
OLTP lookup |   Index Cond: (id = 4242)
OLAP report | HashAggregate (actual rows=3 loops=1)
OLAP report |   Group Key: region
OLAP report |   Batches: 1  Memory Usage: 24kB
OLAP report |   ->  Seq Scan on sales (actual rows=200000 loops=1)
~~~

The OLTP lookup used the primary-key index and read 1 row. The OLAP report read all 200,000 rows to produce 3. Row stores with B-tree indexes are built for the first shape. The second shape is what OLAP systems are built for.

## 3. Why One Database Struggles to Do Both

| | OLTP | OLAP |
| :--- | :--- | :--- |
| Typical query | Read or write a few rows by key | Scan and aggregate millions of rows |
| Concurrency | Thousands of short transactions | Few long queries |
| Latency target | Milliseconds | Seconds to minutes |
| Writes | Constant small inserts and updates | Bulk loads (hourly, nightly, or streamed) |
| Schema | Normalised (3NF): no duplicated facts | Denormalised: star or snowflake schema |
| Storage layout | Row store | Usually column store with compression |
| Indexes | Many B-tree indexes for lookups | Few; relies on scanning compressed columns, partition and min/max pruning |
| Data | Current state | History over years |
| Users | The application, customers | Analysts, dashboards, data science |
| Examples | PostgreSQL, MySQL, SQL Server, Oracle | Snowflake, BigQuery, Redshift, ClickHouse |

Running heavy analytics on the OLTP database hurts in three ways: the big scans compete for CPU, memory and disk with the user-facing transactions; long-running queries hold old snapshots, which in PostgreSQL delays vacuum cleanup; and the normalised schema forces many joins for every report.

### Row store vs column store

📌 **Interview term: row-oriented storage (row store)** — all columns of a row are stored together on the same page. Reading one whole order is one page; summing one column still reads every column of every row.

📌 **Interview term: column-oriented storage (column store)** — each column is stored separately. \`SUM(amount)\` reads only the \`amount\` column; values of the same type sit together and compress very well. Reconstructing one full row is more expensive.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 270" role="img" aria-label="Row store keeps each order together, so reading one order is one place. Column store keeps each column together, so summing amount reads only the amount column">
  <text class="d-text" x="200" y="30" text-anchor="middle">Row store</text>
  <rect class="d-box-accent" x="40" y="50" width="320" height="50" rx="8"/>
  <text class="d-sub" x="200" y="80" text-anchor="middle">7, Farah, EU, 2024-03-12, 180</text>
  <rect class="d-box" x="40" y="120" width="320" height="50" rx="8"/>
  <text class="d-sub" x="200" y="150" text-anchor="middle">8, Ben, NA, 2024-03-13, 40</text>
  <rect class="d-box" x="40" y="190" width="320" height="50" rx="8"/>
  <text class="d-sub" x="200" y="220" text-anchor="middle">9, Chen, APAC, 2024-03-14, 900</text>
  <text class="d-text" x="660" y="30" text-anchor="middle">Column store</text>
  <rect class="d-box" x="480" y="50" width="100" height="190" rx="8"/>
  <text class="d-sub" x="530" y="110" text-anchor="middle">customer</text>
  <text class="d-sub" x="530" y="140" text-anchor="middle">Farah</text>
  <text class="d-sub" x="530" y="165" text-anchor="middle">Ben</text>
  <text class="d-sub" x="530" y="190" text-anchor="middle">Chen</text>
  <rect class="d-box" x="610" y="50" width="100" height="190" rx="8"/>
  <text class="d-sub" x="660" y="110" text-anchor="middle">region</text>
  <text class="d-sub" x="660" y="140" text-anchor="middle">EU</text>
  <text class="d-sub" x="660" y="165" text-anchor="middle">NA</text>
  <text class="d-sub" x="660" y="190" text-anchor="middle">APAC</text>
  <rect class="d-box-accent" x="740" y="50" width="100" height="190" rx="8"/>
  <text class="d-sub" x="790" y="110" text-anchor="middle">amount</text>
  <text class="d-sub" x="790" y="140" text-anchor="middle">180</text>
  <text class="d-sub" x="790" y="165" text-anchor="middle">40</text>
  <text class="d-sub" x="790" y="190" text-anchor="middle">900</text>
</svg>

On the left, fetching order 7 reads one stored row. On the right, \`SUM(amount)\` reads only the highlighted \`amount\` column and never touches \`customer\` or \`region\`.

ClickHouse's own documentation describes this trade-off: a column layout makes reading individual rows harder but speeds up filters and aggregations compared with row-oriented databases ([ClickHouse docs: what is ClickHouse](https://clickhouse.com/docs/get-started/about/intro)). PostgreSQL, MySQL InnoDB, SQLite and SQL Server's default tables are row stores; SQL Server also offers columnstore indexes, and PostgreSQL has columnar extensions.

## 4. How Data Gets From OLTP to OLAP

<svg class="iq-diagram" width="100%" viewBox="0 0 860 275" role="img" aria-label="Application writes go to the OLTP database. An ETL or CDC pipeline copies data into the OLAP warehouse, which serves dashboards and analysts">
  <defs>
    <marker id="sql16q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="80" width="150" height="90" rx="10"/>
  <text class="d-text" x="85" y="118" text-anchor="middle">App users</text>
  <text class="d-sub" x="85" y="144" text-anchor="middle">orders, payments</text>
  <rect class="d-box-accent" x="220" y="70" width="180" height="110" rx="12"/>
  <text class="d-text" x="310" y="115" text-anchor="middle">OLTP database</text>
  <text class="d-sub" x="310" y="143" text-anchor="middle">row store</text>
  <rect class="d-box" x="460" y="80" width="150" height="90" rx="10"/>
  <text class="d-text" x="535" y="118" text-anchor="middle">ETL or CDC</text>
  <text class="d-sub" x="535" y="144" text-anchor="middle">copy and reshape</text>
  <rect class="d-box-accent" x="670" y="70" width="180" height="110" rx="12"/>
  <text class="d-text" x="760" y="115" text-anchor="middle">OLAP warehouse</text>
  <text class="d-sub" x="760" y="143" text-anchor="middle">column store</text>
  <line class="d-edge" x1="164" y1="125" x2="212" y2="125" marker-end="url(#sql16q4-arrow)"/>
  <line class="d-edge" x1="404" y1="125" x2="452" y2="125" marker-end="url(#sql16q4-arrow)"/>
  <line class="d-edge" x1="614" y1="125" x2="662" y2="125" marker-end="url(#sql16q4-arrow)"/>
  <rect class="d-box-muted" x="680" y="215" width="160" height="40" rx="8"/>
  <text class="d-sub" x="760" y="240" text-anchor="middle">dashboards, analysts</text>
  <line class="d-edge-dashed" x1="760" y1="184" x2="760" y2="211"/>
</svg>

📌 **Interview term: ETL / ELT** — Extract, Transform, Load: copy data out of the source systems, reshape it, and load it into the warehouse. ELT loads raw data first and transforms it inside the warehouse with SQL, which is the common approach with cloud warehouses.

📌 **Interview term: CDC (change data capture)** — streaming every insert, update and delete from the OLTP database's log (PostgreSQL logical replication, the MySQL binlog) to the warehouse, so analytics are minutes behind instead of a day.

The third example is a miniature ETL step. It copies the normalised orders into a denormalised **fact table** and a **dimension table**, then answers an analyst question with one join:

~~~text
region | category | units | revenue
APAC | computers | 1 | 900
APAC | displays | 3 | 540
APAC | accessories | 4 | 100
EU | accessories | 4 | 80
NA | computers | 1 | 900
NA | accessories | 3 | 120
~~~

📌 **Interview term: star schema** — the classic warehouse layout: a central fact table with one row per business event (a sale line: date, region, product key, quantity, revenue) surrounded by dimension tables that describe the keys (product, date, customer, store). Queries join the fact table to a few small dimensions and aggregate. When dimensions are themselves normalised into sub-tables, it is a snowflake schema.

📌 **Interview term: fact table / dimension table** — facts are the measurable events (many rows, mostly numbers and foreign keys); dimensions are the descriptive context used to filter and group (fewer rows, many text attributes).

The fact table stores \`revenue\` precomputed and \`month\` already extracted: duplicated data that a normalised OLTP schema would avoid ([What is database normalization?](/interview-question/what-is-database-normalization)), but a warehouse accepts because it is loaded in bulk and rarely updated ([What is denormalization and when should you use it?](/interview-question/what-is-denormalization-and-when-should-you-use-it)).

## 5. The Middle Ground

- **Read replicas.** Running reports on a PostgreSQL or MySQL replica takes the load off the primary, but it is still a row store; it helps with moderate reporting, not billion-row analytics.
- **Materialized views and summary tables** inside the OLTP database precompute the heavy aggregates on a schedule: [What is a view and a materialized view?](/interview-question/what-is-a-view-and-a-materialized-view)
- **Partitioning** keeps big history tables manageable and prunes old data: [What is table partitioning?](/interview-question/what-is-table-partitioning)
- **HTAP (hybrid transactional/analytical processing).** Systems that try to serve both workloads on fresh data, often by keeping a row copy and a column copy of the same tables. Gartner introduced the term in a 2014 report ([Wikipedia: HTAP](https://en.wikipedia.org/wiki/Hybrid_transactional/analytical_processing)).

📌 **Interview term: HTAP** — one system that handles OLTP transactions and OLAP queries on the same, current data, removing the copy step at the price of a more complex engine.

## 6. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above) and returned identical rows on PostgreSQL 16.15. The PostgreSQL example ran on PostgreSQL 16.15 in a scratch database with the same schema; it builds its 200,000-row \`sales\` table with \`generate_series\` and sets \`max_parallel_workers_per_gather = 0\` to keep the plan simple.

Example 1, an OLTP transaction and point lookup:

~~~text
id | customer | name | qty | unit_price | stock_left
7 | Farah | Monitor | 1 | 180 | 7
~~~

Example 2, an OLAP aggregation:

~~~text
month | category | revenue | orders
2024-01 | computers | 900 | 1
2024-01 | accessories | 80 | 1
2024-02 | computers | 900 | 1
2024-02 | displays | 540 | 2
2024-02 | accessories | 140 | 2
2024-03 | accessories | 80 | 1
~~~

Example 3, ETL into a star schema:

~~~text
region | category | units | revenue
APAC | computers | 1 | 900
APAC | displays | 3 | 540
APAC | accessories | 4 | 100
EU | accessories | 4 | 80
NA | computers | 1 | 900
NA | accessories | 3 | 120
~~~

Example 4, the two plans:

~~~text
workload | plan_line
OLTP lookup | Index Scan using sales_pkey on sales (actual rows=1 loops=1)
OLTP lookup |   Index Cond: (id = 4242)
OLAP report | HashAggregate (actual rows=3 loops=1)
OLAP report |   Group Key: region
OLAP report |   Batches: 1  Memory Usage: 24kB
OLAP report |   ->  Seq Scan on sales (actual rows=200000 loops=1)
~~~

## Edge Cases

- **Small companies use one database for both** and are right to: a few million rows of reporting on PostgreSQL is fine with good indexes or a replica. The split becomes worth its cost when analytics slow down the application or need years of history.
- **Freshness.** A nightly ETL means dashboards are up to a day old. If the business needs minutes, use CDC; if it needs seconds on current data, look at HTAP or operational analytics on the OLTP side.
- **Warehouses are not transactional databases.** They support SQL and often transactions, but many single-row updates per second are slow or expensive on column stores. Do not put the shopping cart in the warehouse.
- **Different SQL dialects.** Warehouse SQL (BigQuery, Snowflake) mostly follows the standard but differs in types, \`MERGE\`, date functions and costs (BigQuery's on-demand pricing bills by the bytes processed in the columns a query reads, even with a \`LIMIT\`, so \`SELECT *\` costs money: [BigQuery pricing](https://cloud.google.com/bigquery/pricing)).

## Common Pitfalls

- **Defining OLTP vs OLAP by size alone.** The difference is the access pattern: many small key-based transactions vs few large scans and aggregations.
- **Running analysts' queries on the production primary.** A single full scan can evict hot pages from cache and slow every user request.
- **Normalising the warehouse like the OLTP schema.** Twenty joins per report defeats the purpose; model facts and dimensions.
- **Assuming a column store is faster for everything.** Fetching or updating one full row is the row store's strength.
- **Forgetting that the warehouse is a copy.** It can be stale or out of sync; reports must say how fresh their data is.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define both:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">OLTP</strong> is the operational workload: many short transactions, each reading or writing a few rows by key, such as placing an order. <strong style="color:#ffca28;">OLAP</strong> is the analytical workload: few large queries that scan and aggregate history, such as revenue by month and region.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Different needs:</strong> <span style="color:#f0e2c8;">OLTP needs low latency, high concurrency, ACID and a normalised schema with B-tree indexes. OLAP needs scan throughput: a denormalised star schema and usually column storage with compression.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why storage differs:</strong> <span style="color:#f0e2c8;">A row store keeps a whole row together, ideal for fetching order 7. A column store reads only the columns a query uses, ideal for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(amount)</code> over a billion rows, but slower for single-row updates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. How they connect:</strong> <span style="color:#f0e2c8;">Companies copy data from the OLTP databases into a warehouse such as Snowflake, BigQuery, Redshift or ClickHouse through <strong style="color:#ffca28;">ETL/ELT</strong> or change data capture, so reports never compete with user traffic.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Nuance:</strong> <span style="color:#f0e2c8;">Small systems are fine on one PostgreSQL with a read replica or materialized views. The split pays off when analytics slow the app or need years of history; HTAP systems try to serve both on fresh data.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a star schema and why do warehouses use it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A central fact table with one row per event, holding measures and foreign keys, surrounded by dimension tables such as product, date and customer. Reports join a few small dimensions to one big fact table and aggregate, which is simpler and faster than joining a fully normalised schema.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just run reports on the production database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Big scans compete with user transactions for CPU, memory and I/O, can push hot pages out of cache, and long queries hold old snapshots that delay vacuum in PostgreSQL. A replica helps for moderate reporting; a warehouse for heavy analytics.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between ETL and CDC?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">ETL copies data in batches, often nightly, transforming it on the way. CDC streams each insert, update and delete from the database log continuously, so the warehouse is minutes behind instead of a day.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are column stores fast for analytics?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A query reading 3 of 50 columns only reads those 3, and values of one column compress well because they are similar. Many engines also skip blocks using per-block min and max values. The cost is that reading or updating a full row touches every column file.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is HTAP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Hybrid transactional/analytical processing, a term Gartner introduced in 2014: one system that handles both workloads on current data, often by keeping row and column copies of the same tables, removing the ETL delay at the price of a more complex engine.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| OLTP | Many short read/write transactions on a few rows each, by key |
| OLAP | Few large read-mostly queries that scan and aggregate history |
| Point query | A query that finds a few rows by a key through an index |
| Row store | Storage that keeps all columns of a row together |
| Column store | Storage that keeps each column together, compressed |
| ETL / ELT | Copying and reshaping data from source systems into a warehouse |
| CDC | Streaming changes from the database log to another system |
| Star schema | A fact table surrounded by dimension tables |
| Fact / dimension table | Measurable events vs the descriptive context used to group them |
| HTAP | One system serving both transactional and analytical workloads |

**Conclusion:** OLTP and OLAP are two workloads with opposite needs. OLTP is the application itself: thousands of short ACID transactions that read and write a few rows by key, served best by a normalised schema in a row store with B-tree indexes, as the order example and its single-row index lookup showed. OLAP is analysis: a few large queries that scan years of history and aggregate a handful of columns, served best by a denormalised star schema in a compressed column store, like the report that read all 200,000 rows to produce three. Most companies keep them apart and connect them with ETL or change data capture, so analytics never slow down the checkout; replicas, materialized views and HTAP systems are the middle ground when a full warehouse is not yet worth it.`,
    examples: [
      {
        label: `OLTP: place one order in a short transaction, then fetch it by key`,
        code: `-- OLTP: one customer places one order. Small, short, many of these per second.
BEGIN;
INSERT INTO orders (id, customer, region, order_date) VALUES (7, 'Farah', 'EU', '2024-03-12');
INSERT INTO order_items (order_id, product_id, qty, unit_price) VALUES (7, 3, 1, 180);
UPDATE products SET stock = stock - 1 WHERE id = 3;
COMMIT;

-- OLTP read: fetch one order by its key (touches a handful of rows)
SELECT o.id, o.customer, p.name, i.qty, i.unit_price, p.stock AS stock_left
FROM orders o
JOIN order_items i ON i.order_id = o.id
JOIN products p ON p.id = i.product_id
WHERE o.id = 7;`,
      },
      {
        label: `OLAP: revenue per month and category over all orders`,
        code: `-- OLAP: revenue per month and category over all history (touches every row)
SELECT substr(o.order_date, 1, 7) AS month,
       p.category,
       SUM(i.qty * i.unit_price) AS revenue,
       COUNT(DISTINCT o.id) AS orders
FROM orders o
JOIN order_items i ON i.order_id = o.id
JOIN products p ON p.id = i.product_id
GROUP BY month, p.category
ORDER BY month, revenue DESC;`,
      },
      {
        label: `ETL into a tiny star schema (fact_sales + dim_product), then an analyst query`,
        code: `-- ETL step: copy OLTP rows into a denormalised fact table (a tiny star schema)
CREATE TABLE dim_product AS
  SELECT id AS product_key, name, category FROM products;
CREATE TABLE fact_sales AS
  SELECT o.order_date AS date_key,
         substr(o.order_date, 1, 7) AS month,
         o.region,
         i.product_id AS product_key,
         i.qty,
         i.qty * i.unit_price AS revenue
  FROM orders o JOIN order_items i ON i.order_id = o.id;

-- Analysts query the fact table: one join to a small dimension, then aggregate
SELECT f.region, d.category, SUM(f.qty) AS units, SUM(f.revenue) AS revenue
FROM fact_sales f
JOIN dim_product d ON d.product_key = f.product_key
GROUP BY f.region, d.category
ORDER BY f.region, revenue DESC;`,
      },
      {
        label: `PostgreSQL: on 200,000 rows the OLTP lookup reads 1 row by index, the OLAP report scans all 200,000`,
        code: `SET max_parallel_workers_per_gather = 0;
CREATE TABLE sales (
  id int PRIMARY KEY,
  region text NOT NULL,
  product_id int NOT NULL,
  sold_on date NOT NULL,
  amount numeric NOT NULL
) WITH (autovacuum_enabled = off);
INSERT INTO sales
SELECT g, (ARRAY['APAC', 'EU', 'NA'])[g % 3 + 1], g % 50 + 1,
       DATE '2024-01-01' + g % 366, g % 200 + 1
FROM generate_series(1, 200000) AS g;
ANALYZE sales;
CREATE FUNCTION plan_analyze(q text) RETURNS SETOF text LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN EXECUTE 'EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) ' || q LOOP
    RETURN NEXT r."QUERY PLAN";
  END LOOP;
END $$;
CREATE TABLE steps (n serial, workload text, plan_line text);

INSERT INTO steps (workload, plan_line)
SELECT 'OLTP lookup', plan_analyze('SELECT * FROM sales WHERE id = 4242');

INSERT INTO steps (workload, plan_line)
SELECT 'OLAP report', plan_analyze('SELECT region, SUM(amount) FROM sales GROUP BY region');

SELECT workload, plan_line FROM steps ORDER BY n;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
