---
slug: postgres-composite-indexes-column-order-skip-scan
title: "Postgres Composite Indexes: Column Order, Covering Indexes and Skip Scan, Measured on 5 Million Rows"
excerpt: Why the same two columns can make a query 1,000 times faster or barely help, depending on their order. Measured with EXPLAIN on PostgreSQL 16 and 18, including INCLUDE, partial and expression indexes, the new skip scan, and what every extra index costs on writes.
tags: ["backend", "databases", "postgresql", "sql", "performance"]
cover: /blog-images/postgres-composite-indexes-column-order-skip-scan/cover.png
---

"Add an index" is the first answer to every slow query, and it is often only half right. An index on the right columns in the wrong order can leave a query almost as slow as before. An index the query cannot use at all looks fine in code review. And every index you add makes every insert slower.

This post measures those cases instead of describing them. I loaded 5 million orders into PostgreSQL 16.15 and PostgreSQL 18.4. Then I ran the same queries against different indexes and recorded what `EXPLAIN` reported: the plan, the time, and the number of pages read.

A few terms first:

- A **B-tree index** is Postgres's default index. It keeps a copy of some columns, sorted, in a tree of 8 KB **pages**. Finding a value means walking from the root to one leaf page, and reading a range means following the leaves in order.
- A **composite index** (also called a **multicolumn index**) is a B-tree on several columns, sorted by the first column, then by the second within equal first values, and so on. It works like a phone book sorted by last name, then first name.
- The **heap** is the table itself: the pages that hold the full rows. An index entry points to a row in the heap.
- `EXPLAIN (ANALYZE, BUFFERS)` runs the query and shows the plan it used, the real time, and **buffers**: how many 8 KB pages it touched. Pages read is the most stable number to compare. Timings depend on the machine and the cache, but pages read depends only on the plan.

## The test setup

> One table, 5 million rows, two Postgres versions with the same settings, all queries run warm.

```sql
CREATE TABLE orders (
  id          bigserial PRIMARY KEY,
  customer_id int           NOT NULL,  -- 50,000 customers, about 100 orders each
  region      text          NOT NULL,  -- 4 values: us, eu, apac, latam
  status      text          NOT NULL,  -- 96% shipped, 3% cancelled, 1% pending
  email       text          NOT NULL,  -- mixed case, e.g. User4242@Example.com
  total       numeric(10,2) NOT NULL,
  created_at  timestamptz   NOT NULL   -- spread over 2025 and 2026
);

INSERT INTO orders (customer_id, region, status, email, total, created_at)
SELECT c,
       (ARRAY['us','eu','apac','latam'])[1 + (g % 4)],
       CASE WHEN r < 0.01 THEN 'pending' WHEN r < 0.04 THEN 'cancelled' ELSE 'shipped' END,
       'User' || c || '@Example.com',
       round((random() * 500)::numeric, 2),
       timestamptz '2025-01-01' + (random() * interval '730 days')
FROM (SELECT g, 1 + floor(random() * 50000)::int AS c, random() AS r
      FROM generate_series(1, 5000000) g) s;

VACUUM ANALYZE orders;
```

The table is 56,819 pages (about 444 MB). Both servers ran on the same 4-core machine with `shared_buffers = 1GB`, and parallel query was turned off (`max_parallel_workers_per_gather = 0`) so that plans compare one process to one process. Every number below is the median of seven runs of `EXPLAIN (ANALYZE, BUFFERS)` after the data was in memory, measured on PostgreSQL 18.4 unless it says otherwise.

## 1. Column order decides whether an index helps

> Put the columns you filter with `=` first, and the column you sort or range over after them.

The query is the one behind every "my orders" page: the 20 newest orders of one customer.

```sql
SELECT id, created_at, total
FROM orders
WHERE customer_id = 4242
ORDER BY created_at DESC
LIMIT 20;
```

Here is what it cost with each index:

| Index | Plan | Pages read | Time |
|---|---|---:|---:|
| none | Seq Scan, then Sort | 56,819 | 220 ms |
| `(created_at, customer_id)` | Index Scan Backward | 4,668 | 18.8 ms |
| `(customer_id)` | Bitmap Index Scan, then Sort | 112 | 0.075 ms |
| `(customer_id, created_at)` | Index Scan Backward | 23 | 0.016 ms |

Both composite indexes hold the same two columns. One reads 23 pages and the other reads 4,668, a 200-fold difference.

![Sorted by customer first, all of customer 42 sits together, so Postgres jumps to it and reads 20 entries. Sorted by date first, customer 42 is scattered, so Postgres walks from the newest date and checks every entry.](/blog-images/postgres-composite-indexes-column-order-skip-scan/column-order.svg)

With `(customer_id, created_at)`, all of customer 4242's entries sit next to each other, already sorted by date. Postgres walks the tree to the newest entry for 4242 and reads backwards until it has 20 rows. A B-tree can be read in either direction, so `DESC` does not need a `DESC` index: the plan says `Index Scan Backward`.

With `(created_at, customer_id)`, the index is sorted by date. Customer 4242's orders are spread across two years of entries. The planner still picks this index because it hands back rows in date order, which saves a sort. But it has to start at the newest date and check `customer_id` on every entry until it has collected 20 matches:

```text
 Limit (actual time=0.453..17.738 rows=20.00 loops=1)
   Buffers: shared hit=4668
   ->  Index Scan Backward using ix_ca_cust on orders (actual time=0.452..17.731 rows=20.00 loops=1)
         Index Cond: (customer_id = 4242)
         Index Searches: 1
         Buffers: shared hit=4668
 Planning Time: 0.066 ms
 Execution Time: 17.751 ms
```

The `Index Cond` line looks reassuring, but it is misleading. The condition is checked inside the index, yet nothing limits which part of the index gets scanned. Compare the right order:

```text
 Limit (actual time=0.011..0.033 rows=20.00 loops=1)
   Buffers: shared hit=23
   ->  Index Scan Backward using ix_cust_ca on orders (actual time=0.011..0.031 rows=20.00 loops=1)
         Index Cond: (customer_id = 4242)
         Index Searches: 1
         Buffers: shared hit=23
 Planning Time: 0.048 ms
 Execution Time: 0.043 ms
```

The same plan shape and the same `Index Cond`, with 200 times fewer pages read. **Read the `Buffers` line, not just the node name.**

The single-column `(customer_id)` index did well here too, because each customer has only about 100 orders: Postgres fetches all of them and sorts 100 rows. My expectation, which I did not measure, is that the sort grows with the number of orders per customer. The composite index always stops after 20.

You can see the same effect without a database. This models both indexes as sorted arrays, 200,000 rows and 2,000 customers, and counts the entries each one examines:

```javascript-run
// A B-tree keeps entries sorted by its columns, left to right.
// Model two "indexes" as sorted arrays and count how many entries
// each one has to look at to answer the same query.
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

const rows = [];
for (let id = 1; id <= 200000; id++) {
  rows.push({ id, customer: 1 + Math.floor(rand() * 2000), day: Math.floor(rand() * 730) });
}

const byCustomerDay = [...rows].sort((a, b) => a.customer - b.customer || a.day - b.day);
const byDayCustomer = [...rows].sort((a, b) => a.day - b.day || a.customer - b.customer);

// Query: newest 20 orders of customer 42
function newest20(index, canSeek) {
  let examined = 0;
  const found = [];
  if (canSeek) {
    // Binary search to the last entry for customer 42, then walk backwards.
    let lo = 0, hi = index.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      examined++;
      if (index[mid].customer <= 42) lo = mid + 1; else hi = mid;
    }
    for (let i = lo - 1; i >= 0 && found.length < 20; i--) {
      examined++;
      if (index[i].customer !== 42) break;
      found.push(index[i]);
    }
  } else {
    // Sorted by day first: walk from the newest day, filtering on customer.
    for (let i = index.length - 1; i >= 0 && found.length < 20; i--) {
      examined++;
      if (index[i].customer === 42) found.push(index[i]);
    }
  }
  return { examined, newestDay: found[0].day };
}

for (const [name, index, canSeek] of [["(customer, day)", byCustomerDay, true], ["(day, customer)", byDayCustomer, false]]) {
  const r = newest20(index, canSeek);
  console.log(`${name}: examined ${r.examined} entries, newest day ${r.newestDay}`);
}
```

Output:

```text
(customer, day): examined 38 entries, newest day 607
(day, customer): examined 33639 entries, newest day 607
```

Both return the same answer. One looks at 38 entries, the other at 33,639.

## 2. Equality first, range second

> The index is only narrowed by `=` conditions on the leading columns, plus one range condition on the next column.

The same rule shows up even more clearly with a range. Count one customer's orders in October 2026:

```sql
SELECT count(*) FROM orders
WHERE customer_id = 4242
  AND created_at >= '2026-10-01' AND created_at < '2026-11-01';
```

| Index | Plan | Pages read | Time |
|---|---|---:|---:|
| `(customer_id, created_at)` | Index Only Scan | 6 | 0.012 ms |
| `(created_at, customer_id)` | Index Only Scan | 820 | 2.86 ms |

With customer first, the matching entries are one contiguous run: customer 4242, from October 1 to November 1. With date first, Postgres reads every order from every customer in October (212,343 entries) and keeps the ones for customer 4242.

The [PostgreSQL docs on multicolumn indexes](https://www.postgresql.org/docs/18/indexes-multicolumn.html) state the rule exactly: "equality constraints on leading columns, plus any inequality constraints on the first column that does not have an equality constraint, will always be used to limit the portion of the index that is scanned." Conditions on columns to the right of the first range are still checked, but they do not shrink the scan.

So the ordering rule for a composite index is:

1. Columns compared with `=` (or `IN`) first.
2. Then the one column used for a range (`<`, `>`, `BETWEEN`) or for `ORDER BY`.
3. Anything after that is only checked, not used to narrow the scan.

"Most selective column first" is a common rule of thumb. It matters much less than this rule. An index that starts with a very selective column but puts the range column first still scans the whole range.

## 3. Skip scan: what changed in PostgreSQL 18

> PostgreSQL 18 can use a composite index even with no condition on its first column, as long as that column has few distinct values.

Before version 18, a query with no condition on the leading column could not narrow a B-tree scan at all. Take an index on `(region, created_at)` and a query that only filters on time:

```sql
-- index: CREATE INDEX ix_reg_ca ON orders (region, created_at);
SELECT count(*) FROM orders
WHERE created_at >= '2026-06-01' AND created_at < '2026-06-01 06:00';
```

PostgreSQL 18, [released on 2025-09-25](https://www.postgresql.org/docs/current/release-18.html), added "skip scans of btree indexes". The release notes say this lets the index be used "when there are no restrictions on the first or early indexed columns (or there are non-equality ones), and there are useful restrictions on later indexed columns." Here is the same query on both versions:

| Version | Index | Pages read | Time | Index searches |
|---|---|---:|---:|---:|
| PostgreSQL 16.15 | `(region, created_at)` | 19,992 | 77 ms | not reported |
| PostgreSQL 18.4 | `(region, created_at)` | 905 | 0.36 ms | 9 |
| PostgreSQL 18.4 | `(created_at)` alone | 846 | 0.29 ms | 1 |

![Postgres 16 reads the whole index and checks the time on every entry. Postgres 18 jumps once per region and reads only the matching six-hour slice of each.](/blog-images/postgres-composite-indexes-column-order-skip-scan/skip-scan.svg)

On version 16, the plan is still an `Index Only Scan`, so it looks fine at a glance. But it reads all 19,992 pages of the index, because the time range is not contiguous: there is one slice per region. Version 18 jumps to each region and reads only that region's slice. The new `Index Searches: 9` line in the plan shows how many times it went back into the tree. The result is almost as cheap as a dedicated `(created_at)` index:

```text
 Aggregate (actual time=0.337..0.337 rows=1.00 loops=1)
   Buffers: shared hit=905
   ->  Index Only Scan using ix_reg_ca on orders (actual time=0.014..0.269 rows=1701.00 loops=1)
         Index Cond: ((created_at >= '2026-06-01 00:00:00+00'::timestamp with time zone) AND (created_at < '2026-06-01 06:00:00+00'::timestamp with time zone))
         Heap Fetches: 0
         Index Searches: 9
         Buffers: shared hit=905
 Planning Time: 0.032 ms
 Execution Time: 0.346 ms
```

The catch is in the [multicolumn docs](https://www.postgresql.org/docs/18/indexes-multicolumn.html): skip scan "is generally only taken when there are so few distinct `x` values that the planner expects the scan to skip over most of the index." I checked this with a leading column that has many values. On an index on `(customer_id, created_at)`, which has 50,000 distinct customers, the same time-window query read 20,431 pages in 86 ms on version 18, with 201 index searches. It was no better than version 16 (20,015 pages, 50 ms). Skip scan rescues a leading column like region, status or tenant type, not a leading column like user ID.

What this means in practice: after upgrading to 18, an index you thought was useless for a query may now serve it, which can let you drop a redundant index. It does not change the rule for designing new indexes.

## 4. Covering indexes and the visibility map

> `INCLUDE` adds columns to the index so a query can be answered without reading the table, but only for pages that VACUUM has marked all-visible.

An **index-only scan** answers the query from the index alone, with no visit to the heap. It needs every column the query uses to be in the index. Let's change the "my orders" query to return only columns we can cover:

```sql
SELECT created_at, total FROM orders
WHERE customer_id = 4242
ORDER BY created_at DESC
LIMIT 20;

-- covering version of the index:
CREATE INDEX ix_cust_ca_inc ON orders (customer_id, created_at) INCLUDE (total);
```

`INCLUDE (total)` stores `total` in the index leaf entries without making it part of the sort key. The [docs](https://www.postgresql.org/docs/18/indexes-index-only-scans.html) call these columns "payload": they are "not part of the search key". You add a column with `INCLUDE` when queries need to read it but never search or sort by it.

| Index and table state | Plan | Heap fetches | Pages read |
|---|---|---:|---:|
| `(customer_id, created_at)` | Index Scan | (all 20 rows) | 23 |
| `... INCLUDE (total)`, after VACUUM | Index Only Scan | 0 | 14 |
| same, after updating 10% of rows, before VACUUM | Index Only Scan | 20 | 32 |
| same, after VACUUM again | Index Only Scan | 0 | 12 |

The third row is the trap. The plan still says `Index Only Scan`, but `Heap Fetches: 20` means it visited the table for every single row, and it read more pages than the plain index did.

![For each entry, an index-only scan checks the visibility map. If the heap page is marked all-visible it answers from the index. Otherwise it reads the table page to check the row.](/blog-images/postgres-composite-indexes-column-order-skip-scan/covering.svg)

The reason is how Postgres handles concurrent transactions. An index entry does not record whether the row it points to is visible to your transaction. Postgres keeps a **visibility map**: one bit per heap page that says whether every row on that page is visible to all transactions. The docs put it this way: "If it's set, the row is known visible and so the data can be returned with no further work. If it's not set, the heap entry must be visited to find out whether it's visible." `VACUUM` sets the bits, and any update or delete on a page clears its bit.

My update touched only 10% of rows, but rows are spread across pages, about 88 per page. Updating every tenth row clears the bit on almost every page, so all 20 rows needed a heap fetch. On a table with a lot of writes, index-only scans depend on autovacuum keeping up. If you rely on them, watch `Heap Fetches` in your plans.

## 5. Indexes a query cannot use

> An index on `email` does not help `WHERE lower(email) = ...`. A query that matches most of the table should not use an index at all.

**Functions on the column.** An index stores the column's values, not the result of a function applied to them:

| Query | Index | Plan | Pages read | Time |
|---|---|---|---:|---:|
| `WHERE lower(email) = 'user4242@example.com'` | `(email)` | Index Only Scan over the entire index | 104,460 | 1,214 ms |
| same | `(lower(email))` | Bitmap Index Scan | 112 | 0.059 ms |

The first plan is worse than useless. The planner chose to scan the whole `email` index, because it is smaller than the table, and called `lower()` on all 5 million values. An **expression index** such as `CREATE INDEX ON orders (lower(email))` stores the computed value, so the same query becomes a direct lookup. The expression in the query must match the expression in the index. The same applies to `date(created_at)`, `created_at::date` and JSON extraction.

**Low selectivity.** **Selectivity** is the fraction of rows a condition matches. With an index on `(status, created_at)`, `count(*) WHERE status = 'shipped'` still ran as a sequential scan (599 ms). That is the right choice: 96% of rows match, and reading the whole table in order is cheaper than jumping between index and heap for 4.8 million rows. An index on a low-selectivity column only helps when you query for the rare values.

## 6. Partial indexes for the rare rows

> When you only ever query a small subset of rows, index only that subset.

The queue query, "the 50 oldest pending orders", only cares about the 1% of rows that are pending:

```sql
SELECT id, customer_id, created_at FROM orders
WHERE status = 'pending'
ORDER BY created_at
LIMIT 50;

CREATE INDEX ix_pending ON orders (created_at) WHERE status = 'pending';
```

| Index | Pages read | Time | Index size |
|---|---:|---:|---:|
| full `(status, created_at)` | 53 | 0.029 ms | 152 MB |
| partial `(created_at) WHERE status = 'pending'` | 52 | 0.026 ms | 1.1 MB |

Both are fast. The partial index is about 140 times smaller, because it holds only the 50,020 pending rows. It also costs nothing when a shipped order is inserted, since that row is not part of the index. The query's `WHERE` must imply the index's `WHERE` for the planner to use it, so `status = 'pending'` has to appear in the query.

## 7. What every index costs on writes

> Each index is another B-tree to update on every insert, and on every update that changes an indexed column.

To measure the cost, I inserted the first 500,000 orders into an empty copy of the table with a primary key and zero to five secondary indexes. Times are the median of three runs on PostgreSQL 18.4:

| Secondary indexes | Insert time | Total index size |
|---:|---:|---:|
| 0 (primary key only) | 666 ms | 11 MB |
| 1 `(customer_id, created_at)` | 1,718 ms | 30 MB |
| 2 `+ (created_at)` | 2,360 ms | 44 MB |
| 3 `+ (status, created_at)` | 3,595 ms | 63 MB |
| 4 `+ (lower(email))` | 5,543 ms | 70 MB |
| 5 `+ (region, created_at)` | 8,504 ms | 90 MB |

![Insert time grows from 666 ms with only the primary key to 8,504 ms with five secondary indexes.](/blog-images/postgres-composite-indexes-column-order-skip-scan/write-cost.svg)

Five secondary indexes made the bulk insert almost 13 times slower and added 79 MB of index on a 44 MB table. These indexes are expensive in part because their keys arrive in random order: every insert lands on a different leaf page. The primary key on an increasing `id` always appends to the last page, which is why it is so cheap. These numbers come from one machine and one bulk insert, so treat the ratios as the lesson, not the milliseconds.

Two practical consequences follow:

- **Remove indexes nobody uses.** `pg_stat_user_indexes.idx_scan` counts how often each index has been used since statistics were last reset. An index with `idx_scan = 0` after weeks of production traffic is pure write cost.
- **Prefer one composite index over two single-column ones.** `(customer_id, created_at)` serves `WHERE customer_id = ?` on its own, because that is its leading column, as well as the combined query. A separate `(customer_id)` index on top of it is redundant.

## How to check your own queries

1. Run `EXPLAIN (ANALYZE, BUFFERS)` on the real query with realistic parameters, on a copy of production-sized data. Plans on a 100-row development table tell you nothing.
2. Look at `Buffers` first. Thousands of pages to return 20 rows means the index is not narrowing the scan, even when the plan says `Index Scan`.
3. Check that the `Index Cond` covers your `=` columns and then one range or sort column, in index order.
4. For `Index Only Scan`, check `Heap Fetches`. A value near the row count means the visibility map is stale.
5. On PostgreSQL 18, `Index Searches` shows how many times the scan went back into the tree. A large number means a skip scan over a leading column with many values, which is not much better than a full scan.

## Cheat sheet

| Situation | What to do | Measured here |
|---|---|---|
| `WHERE a = ? ORDER BY b LIMIT n` | index `(a, b)` | 23 pages vs 4,668 for `(b, a)` |
| `WHERE a = ? AND b BETWEEN ...` | equality column first: `(a, b)` | 6 pages vs 820 |
| no filter on the leading column | PG 18 skip scan works if that column has few values | 905 vs 19,992 pages (4 regions); no gain with 50,000 customers |
| query reads a column it never filters on | `INCLUDE (col)` for an index-only scan | 14 pages vs 23 |
| index-only scan with `Heap Fetches` high | VACUUM, tune autovacuum | 20 of 20 rows fetched after updating 10% of rows |
| `WHERE lower(col) = ?` | expression index on `lower(col)` | 112 pages vs 104,460 |
| query only hits a rare value | partial index `WHERE status = 'pending'` | 1.1 MB vs 152 MB, same speed |
| condition matches most rows | no index; a sequential scan is correct | 96% of rows: Seq Scan |
| adding an index | budget the write cost | 666 ms to 8,504 ms for 0 to 5 indexes |

If you want to practise the transaction side of the same table, the post on [transaction isolation levels in Postgres](/blog/transaction-isolation-levels-postgres) uses two real sessions, and [offset vs cursor pagination](/blog/offset-vs-cursor-pagination) uses the same idea, a sorted index the query can jump into, to make deep pages fast.
