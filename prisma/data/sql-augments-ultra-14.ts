/**
 * SQL ULTRA — batch 14: Upserts and indexes (INSERT ... ON CONFLICT and its
 * race-free behaviour, advanced upsert patterns, what an index is, clustered vs
 * non-clustered indexes, composite index column order). Every example was run by
 * scripts/verify-sql-examples.ts (sql.js 1.10.2 like the page, PostgreSQL 16
 * for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `UPSERT with INSERT … ON CONFLICT — how do you insert or update atomically without races?`,
    difficulty: "medium",
    seoDescription: `Why SELECT-then-INSERT races, how INSERT ... ON CONFLICT DO UPDATE fixes it, and what PostgreSQL does when two upserts collide, tested with two sessions.`,
    description: `**Question presented to candidate:**
"Two API servers receive the same 'add 5 units of SKU G-700' message at the same moment. Today the code does SELECT to see if the row exists, then INSERT or UPDATE. Why does that break under concurrency, and how would you write it with INSERT ... ON CONFLICT so it is atomic? What exactly does PostgreSQL do when the two statements collide?"

**What a strong answer should cover:**
- Why check-then-act races: both sessions see "no row" in their own snapshot, both INSERT, the loser gets a unique violation (or, without a constraint, a duplicate row)
- \`INSERT ... ON CONFLICT (key) DO UPDATE SET col = excluded.col\` (or \`DO NOTHING\`): one statement, decided at the unique index, so exactly one outcome per key
- The conflict target must match a unique index or constraint; \`excluded\` is the row that was proposed; reference the old value with the table name (\`inventory.qty + excluded.qty\`)
- What happens on a collision in PostgreSQL READ COMMITTED: the second session **waits** for the first to commit, then updates the committed row (or inserts if the first rolled back); under REPEATABLE READ it fails with a serialization error instead
- Limits: one statement cannot touch the same key twice (deduplicate the batch first), \`MERGE\` is not a race-free replacement in PostgreSQL, and the syntax differs per engine (MySQL \`ON DUPLICATE KEY UPDATE\`, SQL Server \`MERGE\` plus locking hints)

**Clarifying questions expected:**
- Is there already a unique constraint on the business key (here \`sku\`), or does it have to be added first?
- On conflict, should the new value replace the old one, add to it, or be ignored?
- Which isolation level does the application run at?

**Code / implementation expected:** Yes — an upsert with \`ON CONFLICT ... DO UPDATE\` and \`excluded\`, and an explanation (ideally a timeline) of two sessions colliding.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE inventory (
  sku        TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  qty        INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO inventory VALUES ('A-100', 'USB-C cable', 40, '2024-05-01');
INSERT INTO inventory VALUES ('B-200', 'HDMI adapter', 12, '2024-05-01');
INSERT INTO inventory VALUES ('C-300', 'Laptop stand', 5, '2024-05-02');
INSERT INTO inventory VALUES ('D-400', 'Webcam', 0, '2024-05-03');
CREATE TABLE page_views (
  page  TEXT NOT NULL,
  day   TEXT NOT NULL,
  views INTEGER NOT NULL,
  PRIMARY KEY (page, day)
);
INSERT INTO page_views VALUES ('/home', '2024-05-10', 120);
INSERT INTO page_views VALUES ('/pricing', '2024-05-10', 31);
INSERT INTO page_views VALUES ('/home', '2024-05-11', 98);
\`\`\``,
    answer: `**Target Audience:** Backend developers who write "create or update" code and candidates who will be asked why the naive version is unsafe.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 (concurrency tests, the batch example) and SQLite 3.45.0 through sql.js 1.10.2 (the runnable examples on this page). MySQL and SQL Server syntax notes are cited from their documentation, not run.

> **How to read this doc:** Every idea is explained in plain language first. Then a \`📌 Interview term:\` callout gives the precise vocabulary an interviewer expects to hear. Every query result, error message and timing below comes from an actual run, and the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Two cashiers share one paper guest list at a party entrance. A guest called Priya walks up to cashier A while her twin walks up to cashier B with the same name on the ticket. Both cashiers glance at the list: "Priya? Not there yet." Both write her name down. Now the list says Priya twice, or, if the list has a rule "each name once", the second cashier is told off halfway through writing.

The problem is not that the cashiers were careless. It is that **looking** and **writing** were two separate steps, and the world changed in between. The fix is a list where "write the name, or if it is already there, put a tick next to it" is one single action that only one cashier can do at a time for a given name.

That single action is an upsert. The basic idea of an upsert (and the different spellings across databases) has its own page, [What is an UPSERT?](/interview-question/what-is-an-upsert). This page is about the part interviewers push on: **why the two-step version races, and what the one-step version actually does when two sessions collide.**

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is there a unique constraint on the business key? | \`ON CONFLICT\` only works against a unique index or constraint; without one there is nothing to conflict with. |
| On conflict: replace, add, or ignore? | Decides between \`SET col = excluded.col\`, \`SET col = t.col + excluded.col\` and \`DO NOTHING\`. |
| Single rows or batches? | A batch with the same key twice fails in PostgreSQL and must be deduplicated first. |
| Which isolation level? | READ COMMITTED waits and then updates; REPEATABLE READ can fail and needs a retry. |
| Which database? | PostgreSQL and SQLite share \`ON CONFLICT\`; MySQL and SQL Server use other syntax. |

## 3. The Race in the Naive Version

The usual first attempt looks like this (application pseudo-code around two SQL statements):

~~~sql
-- step 1
SELECT count(*) FROM inventory WHERE sku = 'G-700';
-- step 2, if the count was 0
INSERT INTO inventory VALUES ('G-700', 'Monitor arm', 3, '2024-05-20');
-- otherwise
UPDATE inventory SET qty = qty + 3 WHERE sku = 'G-700';
~~~

📌 **Interview term: check-then-act race** (also "time-of-check to time-of-use") — a decision is made on data read in one step and acted on in a later step, and another session changes the data in between.

I ran this with two \`psql\` sessions against a scratch PostgreSQL 16 database (default READ COMMITTED). Session A ran its SELECT and INSERT inside a transaction and then slept 3 seconds before committing; session B started one second later:

| Time | Session A | Session B |
| :--- | :--- | :--- |
| t0 | \`BEGIN;\` \`SELECT count(*) ... 'G-700'\` returns \`0\` | |
| t0 | \`INSERT ... ('G-700', ..., 3, ...)\` succeeds (not yet committed) | |
| t1 | (sleeping) | \`BEGIN;\` \`SELECT count(*) ... 'G-700'\` returns \`0\` — A has not committed, so B cannot see the row |
| t1 | | \`INSERT ... ('G-700', ..., 2, ...)\` **blocks** on the unique index |
| t3 | \`COMMIT;\` | unblocks: \`ERROR: duplicate key value violates unique constraint "inventory_pkey"\` / \`DETAIL: Key (sku)=(G-700) already exists.\` |

B waited about 2 seconds and then failed; the table ended up with qty 3, and B's 2 units were lost unless the application retries.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Check then insert race. Session A and session B both run SELECT and both see zero rows. Both run INSERT. A commits first and B fails with a duplicate key error">
  <defs>
    <marker id="sql14q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="140" y="30" text-anchor="middle">Session A</text>
  <text class="d-text" x="620" y="30" text-anchor="middle">Session B</text>
  <rect class="d-box" x="40" y="50" width="200" height="56" rx="10"/>
  <text class="d-text" x="140" y="76" text-anchor="middle">SELECT G-700</text>
  <text class="d-sub" x="140" y="96" text-anchor="middle">0 rows</text>
  <rect class="d-box" x="520" y="50" width="200" height="56" rx="10"/>
  <text class="d-text" x="620" y="76" text-anchor="middle">SELECT G-700</text>
  <text class="d-sub" x="620" y="96" text-anchor="middle">0 rows</text>
  <rect class="d-box" x="40" y="150" width="200" height="56" rx="10"/>
  <text class="d-text" x="140" y="176" text-anchor="middle">INSERT G-700</text>
  <text class="d-sub" x="140" y="196" text-anchor="middle">succeeds</text>
  <rect class="d-box-muted" x="520" y="150" width="200" height="56" rx="10"/>
  <text class="d-text" x="620" y="176" text-anchor="middle">INSERT G-700</text>
  <text class="d-sub" x="620" y="196" text-anchor="middle">waits for A</text>
  <rect class="d-box-accent" x="40" y="250" width="200" height="56" rx="10"/>
  <text class="d-text" x="140" y="282" text-anchor="middle">COMMIT</text>
  <rect class="d-box-accent" x="520" y="250" width="200" height="56" rx="10"/>
  <text class="d-text" x="620" y="276" text-anchor="middle">ERROR</text>
  <text class="d-sub" x="620" y="296" text-anchor="middle">duplicate key</text>
  <line class="d-edge" x1="140" y1="110" x2="140" y2="142" marker-end="url(#sql14q1-arrow)"/>
  <line class="d-edge" x1="140" y1="210" x2="140" y2="242" marker-end="url(#sql14q1-arrow)"/>
  <line class="d-edge" x1="620" y1="110" x2="620" y2="142" marker-end="url(#sql14q1-arrow)"/>
  <line class="d-edge-dashed" x1="620" y1="210" x2="620" y2="242" marker-end="url(#sql14q1-arrow)"/>
  <line class="d-edge-dashed" x1="244" y1="278" x2="512" y2="278" marker-end="url(#sql14q1-arrow)"/>
</svg>

The unique key is what turned a silent duplicate into a loud error. Without a primary key or unique constraint on \`sku\`, both INSERTs would have succeeded and the table would hold two G-700 rows. Putting the two steps in one transaction does not help at READ COMMITTED, because B's SELECT still cannot see A's uncommitted row.

## 4. The Fix: One Statement That Decides at the Index

~~~sql
INSERT INTO inventory (sku, name, qty, updated_at)
VALUES ('A-100', 'USB-C cable', 10, '2024-05-20'),
       ('E-500', 'Desk lamp',    7, '2024-05-20')
ON CONFLICT (sku) DO UPDATE
SET qty        = inventory.qty + excluded.qty,
    updated_at = excluded.updated_at;
~~~

~~~text
sku | name | qty | updated_at
A-100 | USB-C cable | 50 | 2024-05-20
B-200 | HDMI adapter | 12 | 2024-05-01
C-300 | Laptop stand | 5 | 2024-05-02
D-400 | Webcam | 0 | 2024-05-03
E-500 | Desk lamp | 7 | 2024-05-20
~~~

A-100 existed with 40, so it became 40 + 10 = 50; E-500 did not exist, so it was inserted with 7. The other rows were not touched.

📌 **Interview term: conflict target** — the \`(sku)\` after \`ON CONFLICT\`. It names the columns of a unique index or constraint; the database uses it to decide "does this row already exist?". \`ON CONFLICT ON CONSTRAINT inventory_pkey\` names the constraint directly.

📌 **Interview term: \`excluded\`** — a pseudo-table holding the row that was proposed for insertion and was "excluded" by the conflict. Inside \`DO UPDATE\`, \`inventory.qty\` is the value already stored and \`excluded.qty\` is the incoming value.

📌 **Interview term: atomic upsert** — insert-or-update decided and performed as one indivisible operation on the key, so no other session can slip in between the check and the write.

If the conflict target does not match any unique index, both engines refuse the statement. On the schema above, \`ON CONFLICT (name) DO NOTHING\` failed on PostgreSQL 16 with:

~~~text
ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification
~~~

and on SQLite with \`ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint\`. The fix is to add the constraint first; see [What is the difference between a primary key and a unique constraint?](/interview-question/what-is-the-difference-between-a-primary-key-and-a-unique-constraint).

### Counters with RETURNING

~~~sql
INSERT INTO page_views (page, day, views) VALUES ('/home', '2024-05-11', 1)
ON CONFLICT (page, day) DO UPDATE SET views = page_views.views + 1
RETURNING page, day, views;

INSERT INTO page_views (page, day, views) VALUES ('/blog', '2024-05-11', 1)
ON CONFLICT (page, day) DO UPDATE SET views = page_views.views + 1
RETURNING page, day, views;
~~~

~~~text
page | day | views
/home | 2024-05-11 | 99

page | day | views
/blog | 2024-05-11 | 1
~~~

The conflict target can be a composite key, here \`(page, day)\`. \`/home\` on 2024-05-11 went from 98 to 99; \`/blog\` had no row and was created with 1. \`RETURNING\` (PostgreSQL, and SQLite since 3.35.0, [SQLite: RETURNING](https://www.sqlite.org/lang_returning.html)) hands back the final row, so the application does not need a second SELECT. Telling an insert apart from an update in that output is covered in [Advanced UPSERT patterns](/interview-question/advanced-upsert-patterns-conditional-updates-xmax-detection-and-soft-delete-awar).

### Ignore duplicates with DO NOTHING

~~~sql
INSERT INTO inventory (sku, name, qty, updated_at)
VALUES ('B-200', 'HDMI adapter v2', 99, '2024-05-20')
ON CONFLICT (sku) DO NOTHING;

SELECT changes() AS rows_written;

SELECT sku, name, qty FROM inventory WHERE sku = 'B-200';
~~~

~~~text
rows_written
0

sku | name | qty
B-200 | HDMI adapter | 12
~~~

\`changes()\` is SQLite's "rows affected by the last statement": 0, and B-200 kept its old name and quantity. In PostgreSQL the client sees the command tag \`INSERT 0 0\`. \`DO NOTHING\` is the tool for idempotent ingestion ("process this event at most once") and may omit the conflict target, in which case any unique violation is ignored. \`DO UPDATE\` always needs a target.

📌 **Interview term: idempotent** — running the operation twice leaves the same state as running it once. \`DO NOTHING\` on an event id makes a consumer idempotent.

## 5. What Actually Happens When Two Upserts Collide

Here is the same two-session test with the upsert instead of SELECT-then-INSERT. A ran the upsert inside a transaction and slept 3 seconds before committing; B ran the same statement one second later with \`RETURNING sku, qty, (xmax = 0) AS inserted\`:

| Time | Session A | Session B |
| :--- | :--- | :--- |
| t0 | \`BEGIN;\` \`INSERT ... ('G-700', ..., 3, ...) ON CONFLICT (sku) DO UPDATE SET qty = inventory.qty + excluded.qty;\` inserts | |
| t1 | (sleeping) | same upsert with qty 2: **blocks** |
| t3 | \`COMMIT;\` | unblocks and returns \`G-700 \\| 5 \\| f\` (updated, not inserted) |

Final row: \`G-700 | Monitor arm | 5\`. Nobody got an error and no units were lost. I repeated it with A ending in \`ROLLBACK\` instead: B unblocked and returned \`G-700 | 2 | t\`, an insert, because the row it had been waiting on never came to exist.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="ON CONFLICT flow. Try to insert into the unique index. If no conflicting key exists the row is inserted. If a committed row exists it is locked and the DO UPDATE runs. If another transaction holds the key, wait for it and then decide again">
  <defs>
    <marker id="sql14q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="260" y="20" width="240" height="64" rx="10"/>
  <text class="d-text" x="380" y="48" text-anchor="middle">check the unique index</text>
  <text class="d-sub" x="380" y="70" text-anchor="middle">for sku G-700</text>
  <rect class="d-box-accent" x="20" y="190" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="220" text-anchor="middle">no such key</text>
  <text class="d-sub" x="120" y="242" text-anchor="middle">INSERT the row</text>
  <rect class="d-box-accent" x="280" y="190" width="200" height="70" rx="10"/>
  <text class="d-text" x="380" y="220" text-anchor="middle">committed row</text>
  <text class="d-sub" x="380" y="242" text-anchor="middle">lock it, DO UPDATE</text>
  <rect class="d-box-muted" x="540" y="190" width="200" height="70" rx="10"/>
  <text class="d-text" x="640" y="220" text-anchor="middle">in-flight row</text>
  <text class="d-sub" x="640" y="242" text-anchor="middle">wait, then retry</text>
  <line class="d-edge" x1="320" y1="88" x2="150" y2="182" marker-end="url(#sql14q1-arrow2)"/>
  <line class="d-edge" x1="380" y1="88" x2="380" y2="182" marker-end="url(#sql14q1-arrow2)"/>
  <line class="d-edge-dashed" x1="440" y1="88" x2="610" y2="182" marker-end="url(#sql14q1-arrow2)"/>
</svg>

In plain words: the INSERT goes to the unique index first. If no entry for the key exists, it inserts. If a committed row exists, it locks that row and runs \`DO UPDATE\` against the latest committed version, even if that version is newer than the statement's snapshot. If another transaction has inserted the key but not finished, it waits for that transaction and then decides again. Either way the statement ends with exactly one of "inserted" or "updated" (or "did nothing").

📌 **Interview term: speculative insertion** — PostgreSQL's internal name for this mechanism (added with \`ON CONFLICT\` in 9.5, [Michael Paquier: Postgres 9.5 feature highlight, upsert](https://paquier.xyz/postgresql-2/postgres-9-5-feature-highlight-upsert/)): the row is inserted tentatively and "confirmed" only if no conflicting index entry turned up, otherwise it is backed out and the conflict action runs instead.

### Under REPEATABLE READ it fails instead of waiting-then-updating

Same test, with B running \`BEGIN ISOLATION LEVEL REPEATABLE READ;\` and a first query to take its snapshot before A committed:

~~~text
ERROR:  could not serialize access due to concurrent update
~~~

B again waited about 2 seconds, then failed, and the row stayed at 3. At REPEATABLE READ or SERIALIZABLE, an upsert cannot update a row committed after its snapshot, so the application must retry the transaction. See [Transaction isolation levels in Postgres](/interview-question/transaction-isolation-levels-in-postgres-what-anomalies-does-each-level-prevent).

### MERGE is not a race-free substitute

PostgreSQL 15 added \`MERGE\`. I ran it as session B while A was inserting G-700:

~~~sql
MERGE INTO inventory AS t
USING (VALUES ('G-700', 'Monitor arm', 2, '2024-05-20')) AS s(sku, name, qty, updated_at)
ON t.sku = s.sku
WHEN MATCHED THEN UPDATE SET qty = t.qty + s.qty
WHEN NOT MATCHED THEN INSERT VALUES (s.sku, s.name, s.qty, s.updated_at);
~~~

It waited about 2 seconds and then failed with \`ERROR: duplicate key value violates unique constraint "inventory_pkey"\`: MERGE decided "not matched" from its snapshot and went down the INSERT branch. The MERGE documentation itself suggests \`INSERT ... ON CONFLICT\` when concurrent inserts are expected ([pganalyze: MERGE vs INSERT ON CONFLICT](https://pganalyze.com/blog/5mins-postgres-15-merge-vs-insert-on-conflict)).

## 6. Batches: the Same Key Twice in One Statement

~~~sql
INSERT INTO inventory (sku, name, qty, updated_at)
VALUES ('A-100', 'USB-C cable', 1, '2024-05-20'),
       ('A-100', 'USB-C cable', 2, '2024-05-20')
ON CONFLICT (sku) DO UPDATE SET qty = inventory.qty + excluded.qty;
~~~

PostgreSQL 16 rejects it:

~~~text
ERROR:  ON CONFLICT DO UPDATE command cannot affect row a second time
HINT:  Ensure that no rows proposed for insertion within the same command have duplicate constrained values.
~~~

SQLite runs it and applies the two rows one after the other (A-100 went from 40 to 43). Code that passes its tests on SQLite can therefore fail in production on PostgreSQL. The fix is to aggregate the batch first:

~~~sql
WITH batch(sku, name, qty, updated_at) AS (
  VALUES ('A-100', 'USB-C cable', 1, '2024-05-20'),
         ('A-100', 'USB-C cable', 2, '2024-05-21'),
         ('F-600', 'Mouse pad',   4, '2024-05-21')
), up AS (
  INSERT INTO inventory (sku, name, qty, updated_at)
  SELECT sku, MIN(name), SUM(qty), MAX(updated_at)
  FROM batch
  GROUP BY sku
  ON CONFLICT (sku) DO UPDATE
  SET qty        = inventory.qty + excluded.qty,
      updated_at = excluded.updated_at
  RETURNING sku, qty, updated_at
)
SELECT sku, qty, updated_at FROM up ORDER BY sku;
~~~

~~~text
sku | qty | updated_at
A-100 | 43 | 2024-05-21
F-600 | 4 | 2024-05-21
~~~

A-100 got 40 + (1 + 2) = 43 in one hit; F-600 was inserted. The outer \`SELECT ... ORDER BY\` is there because \`RETURNING\` itself does not promise an order.

## 7. The Same Idea in Other Engines

| Engine | Syntax | Notes |
| :--- | :--- | :--- |
| PostgreSQL 9.5+ | \`INSERT ... ON CONFLICT (cols) DO UPDATE / DO NOTHING\` | Waits on in-flight conflicts; tested above on 16.15. |
| SQLite 3.24+ | Same \`ON CONFLICT\` syntax, lowercase \`excluded\` works | Added in 3.24.0, 2018-06-04 ([SQLite: UPSERT](https://www.sqlite.org/lang_upsert.html)). One writer at a time, so no in-flight conflict to wait on. |
| MySQL | \`INSERT ... ON DUPLICATE KEY UPDATE col = new.col\` | Row alias \`AS new\` since 8.0.19; \`VALUES(col)\` in the update is deprecated since 8.0.20 ([MySQL manual](https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html)). It fires on **any** unique key, not a chosen one. |
| SQL Server | \`MERGE\` (usually with \`WITH (HOLDLOCK)\`) or UPDATE-then-INSERT in a serializable transaction | No \`ON CONFLICT\`; not tested here. |

## 8. Verified: Running the Code

The three runnable examples were run on sql.js 1.10.2 (SQLite 3.45.0), exactly as the page runs them, after the schema in the question. The batch example ran on PostgreSQL 16.15 in a scratch database with the same schema. The first two also return identical rows on PostgreSQL (I ran them there too). Outputs, copied from those runs:

Restock upsert (SQLite):

~~~text
sku | name | qty | updated_at
A-100 | USB-C cable | 50 | 2024-05-20
B-200 | HDMI adapter | 12 | 2024-05-01
C-300 | Laptop stand | 5 | 2024-05-02
D-400 | Webcam | 0 | 2024-05-03
E-500 | Desk lamp | 7 | 2024-05-20
~~~

Page-view counter with RETURNING (SQLite):

~~~text
page | day | views
/home | 2024-05-11 | 99

page | day | views
/blog | 2024-05-11 | 1
~~~

DO NOTHING (SQLite):

~~~text
rows_written
0

sku | name | qty
B-200 | HDMI adapter | 12
~~~

Deduplicated batch upsert (PostgreSQL 16):

~~~text
sku | qty | updated_at
A-100 | 43 | 2024-05-21
F-600 | 4 | 2024-05-21
~~~

The two-session timelines in sections 3 and 5 were run with two concurrent \`psql\` sessions against my own scratch database (session A sleeping 3 seconds inside its transaction, session B starting 1 second later); the error texts are copied from that run.

## 9. Edge Cases

- **\`DO UPDATE\` with a \`WHERE\`.** Adding \`WHERE excluded.updated_at > inventory.updated_at\` skips stale writes; the row is still locked. Covered in [Advanced UPSERT patterns](/interview-question/advanced-upsert-patterns-conditional-updates-xmax-detection-and-soft-delete-awar).
- **Several unique constraints.** \`ON CONFLICT (sku)\` only handles conflicts on \`sku\`; a violation of another unique constraint still raises an error. MySQL's \`ON DUPLICATE KEY\` reacts to any of them, which can update the wrong row.
- **Sequences.** In PostgreSQL a \`serial\`/identity column consumes a value even when the row ends up updated, so ids get gaps. In my PostgreSQL 16 test, insert \`a\`, upsert \`a\` again (an update), then insert \`b\` gave \`b\` the id 3, not 2. That is normal.
- **Triggers.** BEFORE INSERT triggers fire even when the row ends up as an update. On PostgreSQL 16 a logging trigger recorded \`INSERT BEFORE\` and then \`UPDATE BEFORE\` for one upsert that took the update path.
- **Deadlocks.** Two batches that upsert the same keys in different orders can deadlock; sort the batch by key. See [What is a deadlock and how do you prevent it?](/interview-question/what-is-a-deadlock-and-how-do-you-prevent-it).

## Common Pitfalls

- **Keeping SELECT-then-INSERT "because it is in a transaction".** At READ COMMITTED the second session cannot see the first session's uncommitted row, so the race is still there.
- **Writing \`SET qty = qty + excluded.qty\` and expecting it to mean the stored value.** Be explicit: \`inventory.qty + excluded.qty\`. Writing \`SET qty = excluded.qty\` on a stock table silently overwrites instead of adding.
- **No unique constraint on the conflict columns.** The statement is rejected; there is no "conflict" without a unique index.
- **Sending a batch with duplicate keys** to PostgreSQL and getting \`cannot affect row a second time\`; aggregate or \`DISTINCT ON\` first.
- **Replacing ON CONFLICT with MERGE for "standard SQL".** In PostgreSQL MERGE can still raise a duplicate key error under concurrency.
- **Forgetting retries at REPEATABLE READ / SERIALIZABLE**, where the upsert reports a serialization failure instead of updating.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why check-then-insert breaks:</strong> <span style="color:#f0e2c8;">Two sessions both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code>, both see no row in their snapshot, both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT</code>. With a unique key the loser gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">duplicate key value violates unique constraint</code>; without one you get two rows. Wrapping it in a transaction at READ COMMITTED does not fix it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The fix:</strong> <span style="color:#f0e2c8;">One statement: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT ... ON CONFLICT (sku) DO UPDATE SET qty = inventory.qty + excluded.qty</code>. The decision is made at the <strong style="color:#ffca28;">unique index</strong>, so there is exactly one row per key and every caller gets an outcome.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The rules:</strong> <span style="color:#f0e2c8;">The conflict target must match a unique index or constraint. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">excluded</code> is the proposed row; the table name refers to the existing row. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DO NOTHING</code> ignores duplicates; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RETURNING</code> hands back the final row.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What happens on a collision:</strong> <span style="color:#f0e2c8;">In PostgreSQL READ COMMITTED the second statement <strong style="color:#ffca28;">waits</strong> for the first transaction. If it commits, the second one updates the committed row (I saw qty 3 become 5); if it rolls back, the second one inserts. Under REPEATABLE READ it fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">could not serialize access due to concurrent update</code> instead, so retry.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits and other engines:</strong> <span style="color:#f0e2c8;">One statement may not hit the same key twice (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cannot affect row a second time</code>), so deduplicate the batch. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MERGE</code> is not a drop-in race-free upsert in PostgreSQL. MySQL uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON DUPLICATE KEY UPDATE</code>; SQLite 3.24+ uses the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT</code> syntax.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just catch the duplicate-key error and retry as an UPDATE?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works but costs a round trip, and in PostgreSQL the error aborts the whole transaction unless you wrap the INSERT in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SAVEPOINT</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT</code> does the same thing inside the engine, without an error and without aborting anything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does ON CONFLICT need SERIALIZABLE to be safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is designed for READ COMMITTED: it waits on the conflicting in-flight row and then acts on the committed version. At REPEATABLE READ or SERIALIZABLE it can raise a serialization failure when the conflicting row was committed after your snapshot, so the client needs a retry loop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">MERGE</code> the same thing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not under concurrency. In my PostgreSQL 16 test, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MERGE</code> that ran while another session was inserting the same key waited and then failed with a duplicate key error, because MERGE decided <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT MATCHED</code> from its snapshot. The PostgreSQL docs point to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT ... ON CONFLICT</code> for that case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">excluded</code> mean, and why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inventory.qty</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">excluded</code> is a pseudo-table holding the row you tried to insert. Inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DO UPDATE</code> a bare column name is ambiguous in intent, so write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inventory.qty + excluded.qty</code>: old stored value plus the new delta. That is what makes counters and stock increments correct.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with a batch that contains the same key twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT DO UPDATE command cannot affect row a second time</code>. Aggregate the batch first, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY sku</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(qty)</code>. SQLite applies the rows one by one and does not complain, so this is a portability trap.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Check-then-act race | Deciding on data read in one step and writing in a later step, while another session changes it in between. |
| Conflict target | The unique columns (or named constraint) after \`ON CONFLICT\` that define "the row already exists". |
| \`excluded\` | Pseudo-table holding the proposed row inside \`DO UPDATE\`. |
| Atomic upsert | Insert-or-update decided and done as one indivisible operation per key. |
| Idempotent | Running it twice leaves the same state as running it once. |
| Speculative insertion | PostgreSQL mechanism behind ON CONFLICT: insert tentatively, back out and run the conflict action if a conflicting key is found. |

**Conclusion:** SELECT-then-INSERT races because the check and the write are separate steps and another session can insert in between; the unique key turns that into an error, and without one it becomes a duplicate. \`INSERT ... ON CONFLICT (key) DO UPDATE SET col = table.col + excluded.col\` moves the decision into the unique index, so each key gets exactly one outcome. In PostgreSQL at READ COMMITTED a colliding upsert waits for the other transaction and then updates or inserts, as the two-session test showed; at higher isolation levels it reports a serialization failure that the client must retry. Deduplicate batches, keep the unique constraint, and do not swap in MERGE expecting the same guarantee.`,
    examples: [
      {
        label: `Restock: add to existing SKUs, insert new ones (ON CONFLICT DO UPDATE with excluded)`,
        code: `INSERT INTO inventory (sku, name, qty, updated_at)
VALUES ('A-100', 'USB-C cable', 10, '2024-05-20'),
       ('E-500', 'Desk lamp',    7, '2024-05-20')
ON CONFLICT (sku) DO UPDATE
SET qty        = inventory.qty + excluded.qty,
    updated_at = excluded.updated_at;

SELECT sku, name, qty, updated_at
FROM inventory
ORDER BY sku;`,
      },
      {
        label: `Page-view counter: one statement increments or creates, RETURNING shows the result`,
        code: `INSERT INTO page_views (page, day, views) VALUES ('/home', '2024-05-11', 1)
ON CONFLICT (page, day) DO UPDATE SET views = page_views.views + 1
RETURNING page, day, views;

INSERT INTO page_views (page, day, views) VALUES ('/blog', '2024-05-11', 1)
ON CONFLICT (page, day) DO UPDATE SET views = page_views.views + 1
RETURNING page, day, views;`,
      },
      {
        label: `DO NOTHING: an existing key is left untouched and nothing is written`,
        code: `INSERT INTO inventory (sku, name, qty, updated_at)
VALUES ('B-200', 'HDMI adapter v2', 99, '2024-05-20')
ON CONFLICT (sku) DO NOTHING;

SELECT changes() AS rows_written;

SELECT sku, name, qty FROM inventory WHERE sku = 'B-200';`,
      },
      {
        label: `PostgreSQL: deduplicate a batch with GROUP BY before the upsert`,
        code: `WITH batch(sku, name, qty, updated_at) AS (
  VALUES ('A-100', 'USB-C cable', 1, '2024-05-20'),
         ('A-100', 'USB-C cable', 2, '2024-05-21'),
         ('F-600', 'Mouse pad',   4, '2024-05-21')
), up AS (
  INSERT INTO inventory (sku, name, qty, updated_at)
  SELECT sku, MIN(name), SUM(qty), MAX(updated_at)
  FROM batch
  GROUP BY sku
  ON CONFLICT (sku) DO UPDATE
  SET qty        = inventory.qty + excluded.qty,
      updated_at = excluded.updated_at
  RETURNING sku, qty, updated_at
)
SELECT sku, qty, updated_at FROM up ORDER BY sku;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `Advanced UPSERT patterns — conditional updates, xmax detection, and soft-delete-aware indexes?`,
    difficulty: "medium",
    seoDescription: `Conditional ON CONFLICT DO UPDATE, telling inserts from updates with xmax or a version column, and partial unique indexes for soft-deleted rows.`,
    description: `**Question presented to candidate:**
"Your price feed sends events out of order, and an older price sometimes overwrites a newer one. Separately, product wants a 'welcome' email only when a customer row is created, not when it is updated, and customers are soft-deleted with a deleted_at column, so a person who deleted their account must be able to sign up again with the same email. How do you handle all three with upserts?"

**What a strong answer should cover:**
- Conditional upsert: \`ON CONFLICT ... DO UPDATE SET ... WHERE excluded.source_ts > prices.source_ts\` (newest wins) or \`WHERE t.col IS DISTINCT FROM excluded.col\` (skip no-op writes); rows whose \`WHERE\` is false are not updated and not returned by \`RETURNING\`, but they are still locked
- Insert-or-update detection in PostgreSQL: \`RETURNING (xmax = 0) AS inserted\`; what \`xmax\` is, why it is 0 for a new row and non-zero after the \`DO UPDATE\` path, and that this is an implementation detail rather than a documented API
- Portable alternatives: a \`version\` (or \`created_at = updated_at\`) column, or \`MERGE ... RETURNING merge_action()\` on PostgreSQL 17+
- Soft delete: a **partial unique index** \`UNIQUE (email) WHERE deleted_at IS NULL\`, and an upsert whose conflict target repeats the predicate: \`ON CONFLICT (email) WHERE deleted_at IS NULL\`
- What breaks: a conflict target without the predicate does not match the partial index and is rejected; a plain \`UNIQUE (email)\` constraint would block re-signup

**Clarifying questions expected:**
- Does every event carry a reliable timestamp or version to compare against?
- Does "created" need to be known only in the same statement, or later too?
- Should a re-signup revive the old soft-deleted row or create a new one?

**Code / implementation expected:** Yes — a conditional \`DO UPDATE ... WHERE\`, a \`RETURNING\` that tells inserts from updates, and a partial unique index used as a conflict target.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE prices (
  sku         TEXT PRIMARY KEY,
  price_cents INTEGER NOT NULL,
  source_ts   TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1
);
INSERT INTO prices (sku, price_cents, source_ts) VALUES ('P-1', 1999, '2024-06-01 10:00');
INSERT INTO prices (sku, price_cents, source_ts) VALUES ('P-2', 4500, '2024-06-01 10:00');
INSERT INTO prices (sku, price_cents, source_ts) VALUES ('P-3', 750, '2024-06-03 09:30');
CREATE TABLE customers (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL,
  plan       TEXT NOT NULL,
  deleted_at TEXT
);
CREATE UNIQUE INDEX customers_live_email ON customers (email) WHERE deleted_at IS NULL;
INSERT INTO customers VALUES (1, 'ana@example.com', 'Ana', 'pro', NULL);
INSERT INTO customers VALUES (2, 'ben@example.com', 'Ben', 'free', '2024-04-01');
INSERT INTO customers VALUES (3, 'cara@example.com', 'Cara', 'free', NULL);
INSERT INTO customers VALUES (4, 'dev@example.com', 'Dev', 'pro', '2024-05-15');
\`\`\``,
    answer: `**Target Audience:** Developers who already use \`INSERT ... ON CONFLICT\` and now hit the follow-ups: stale overwrites, "was it created?", and soft-deleted rows.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 (\`xmax\`, locking behaviour) and SQLite 3.45.0 through sql.js 1.10.2 (the runnable examples). PostgreSQL 17 \`MERGE ... RETURNING\` is cited, not run (the local server is 16).

> **How to read this doc:** Plain language first, then a \`📌 Interview term:\` callout with the precise vocabulary. All outputs, error messages and lock waits below come from real runs; the **Verified** section quotes every example output in full.

## 1. Why This Even Matters — A Story First

A shop window shows today's price on a chalkboard. Head office sends price updates by courier, and couriers get stuck in traffic. At 10:05 a courier arrives with "Monitor arm: 49" written at 08:00, but the board already says 45, written from a note dated 09:30. A careful shopkeeper checks the date on the note before wiping the board. A careless one just copies whatever arrives last.

The same shopkeeper keeps a membership book. When a member leaves, she does not tear out the page: she writes "left on 1 April" across it. When the same person comes back, the book rule "each email once" must not count the crossed-out page.

The basic atomic upsert is covered in [UPSERT with INSERT … ON CONFLICT](/interview-question/upsert-with-insert-on-conflict-how-do-you-insert-or-update-atomically-without-ra). This page adds three things on top: check before you overwrite, know whether you created or changed the row, and make uniqueness ignore deleted rows.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do events carry a timestamp or version? | Newest-wins needs something to compare; a per-entity version beats wall-clock time. |
| Is "was it inserted?" needed only right now? | \`RETURNING\` answers it for this statement; later questions need a stored column. |
| PostgreSQL version? | 17+ has \`MERGE ... RETURNING merge_action()\`; earlier versions need \`xmax\` or a version column. |
| Re-signup: new row or revive the old one? | Decides between an insert against a partial unique index and an UPDATE. |

## 3. Pattern 1 — Conditional DO UPDATE (Newest Wins)

The feed sends four events. P-1 and P-3 are newer than what is stored, P-2 is **older** (2024-05-30 against a stored 2024-06-01), and P-4 is new:

~~~sql
INSERT INTO prices (sku, price_cents, source_ts)
VALUES ('P-1', 1799, '2024-06-02 08:00'),
       ('P-2', 4900, '2024-05-30 23:00'),
       ('P-3', 750,  '2024-06-04 12:00'),
       ('P-4', 300,  '2024-06-02 08:00')
ON CONFLICT (sku) DO UPDATE
SET price_cents = excluded.price_cents,
    source_ts   = excluded.source_ts,
    version     = prices.version + 1
WHERE excluded.source_ts > prices.source_ts;
~~~

~~~text
sku | price_cents | source_ts | version
P-1 | 1799 | 2024-06-02 08:00 | 2
P-2 | 4500 | 2024-06-01 10:00 | 1
P-3 | 750 | 2024-06-04 12:00 | 2
P-4 | 300 | 2024-06-02 08:00 | 1
~~~

P-2 kept 4500 and version 1: the stale event was ignored. P-3's price did not change but its timestamp did, so it was still updated (version 2).

📌 **Interview term: conditional upsert** — an \`ON CONFLICT ... DO UPDATE\` with a \`WHERE\` clause; the update only happens when the condition is true for the existing row and the proposed (\`excluded\`) row.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Conditional upsert. A proposed row either finds no key and is inserted, or finds an existing row. The existing row is locked. If the WHERE condition is true the row is updated and returned. If it is false the row is left unchanged and not returned">
  <defs>
    <marker id="sql14q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="200" height="64" rx="10"/>
  <text class="d-text" x="120" y="58" text-anchor="middle">proposed row</text>
  <text class="d-sub" x="120" y="80" text-anchor="middle">P-2 at 2024-05-30</text>
  <rect class="d-box-accent" x="20" y="200" width="200" height="64" rx="10"/>
  <text class="d-text" x="120" y="228" text-anchor="middle">no key</text>
  <text class="d-sub" x="120" y="250" text-anchor="middle">INSERT, returned</text>
  <rect class="d-box" x="290" y="30" width="200" height="64" rx="10"/>
  <text class="d-text" x="390" y="58" text-anchor="middle">key exists</text>
  <text class="d-sub" x="390" y="80" text-anchor="middle">row is locked</text>
  <rect class="d-box-accent" x="540" y="30" width="200" height="64" rx="10"/>
  <text class="d-text" x="640" y="58" text-anchor="middle">WHERE true</text>
  <text class="d-sub" x="640" y="80" text-anchor="middle">UPDATE, returned</text>
  <rect class="d-box-muted" x="540" y="200" width="200" height="64" rx="10"/>
  <text class="d-text" x="640" y="228" text-anchor="middle">WHERE false</text>
  <text class="d-sub" x="640" y="250" text-anchor="middle">unchanged, not returned</text>
  <line class="d-edge" x1="120" y1="98" x2="120" y2="192" marker-end="url(#sql14q2-arrow)"/>
  <line class="d-edge" x1="224" y1="62" x2="282" y2="62" marker-end="url(#sql14q2-arrow)"/>
  <line class="d-edge-accent" x1="494" y1="62" x2="532" y2="62" marker-end="url(#sql14q2-arrow)"/>
  <line class="d-edge-dashed" x1="440" y1="98" x2="580" y2="192" marker-end="url(#sql14q2-arrow)"/>
</svg>

The dashed path is the subtle one: when the \`WHERE\` is false the row is untouched, \`RETURNING\` leaves it out, and in PostgreSQL the row is **still locked** until the transaction ends. I verified the lock with two \`psql\` sessions on PostgreSQL 16:

| Time | Session A | Session B |
| :--- | :--- | :--- |
| t0 | \`BEGIN;\` upsert P-2 with the older timestamp (WHERE is false, 0 rows changed) | |
| t1 | (sleeping) | \`UPDATE prices SET price_cents = 4700 WHERE sku = 'P-2';\` **blocks** |
| t3 | \`COMMIT;\` | unblocks and updates (it had waited about 2 seconds) |

So a conditional upsert that "does nothing" still takes row locks; keep those transactions short.

### Skipping no-op writes

The same mechanism avoids writing a new row version when nothing changed (in PostgreSQL every UPDATE writes a new tuple, fires triggers and bloats the table even if values are identical):

~~~sql
WITH up AS (
  INSERT INTO prices (sku, price_cents, source_ts)
  VALUES ('P-1', 1999, '2024-06-05 08:00'),
         ('P-2', 4600, '2024-06-05 08:00')
  ON CONFLICT (sku) DO UPDATE
  SET price_cents = excluded.price_cents,
      source_ts   = excluded.source_ts,
      version     = prices.version + 1
  WHERE prices.price_cents IS DISTINCT FROM excluded.price_cents
  RETURNING sku, price_cents, version
)
SELECT sku, price_cents, version FROM up ORDER BY sku;
~~~

~~~text
sku | price_cents | version
P-2 | 4600 | 2
~~~

(PostgreSQL 16.) P-1 already cost 1999, so it was skipped; only P-2 was written. \`IS DISTINCT FROM\` is used instead of \`<>\` so that a change from or to NULL also counts as a change ([How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)). The data-modifying CTE wrapper is PostgreSQL only; SQLite does not allow INSERT inside \`WITH\`.

## 4. Pattern 2 — Was It Inserted or Updated?

### PostgreSQL: the xmax trick

📌 **Interview term: \`xmax\`** — a hidden system column on every PostgreSQL row version. The documentation defines it as "the identity (transaction ID) of the deleting transaction, or zero for an undeleted row version" and notes it can be non-zero on a visible row ([PostgreSQL: System Columns](https://www.postgresql.org/docs/current/ddl-system-columns.html)). It is also where row locks are recorded ([Cybertec: what's in an xmax](https://www.cybertec-postgresql.com/en/whats-in-an-xmax/)).

📌 **Interview term: MVCC** — multi-version concurrency control: an UPDATE does not overwrite a row in place, it writes a new version and marks the old one as deleted. \`xmin\` and \`xmax\` are the transaction ids that created and deleted (or locked) a version.

~~~sql
WITH up AS (
  INSERT INTO prices (sku, price_cents, source_ts)
  VALUES ('P-1', 1799, '2024-06-02 08:00'),
         ('P-2', 4900, '2024-05-30 23:00'),
         ('P-3', 750,  '2024-06-04 12:00'),
         ('P-4', 300,  '2024-06-02 08:00')
  ON CONFLICT (sku) DO UPDATE
  SET price_cents = excluded.price_cents,
      source_ts   = excluded.source_ts,
      version     = prices.version + 1
  WHERE excluded.source_ts > prices.source_ts
  RETURNING sku, price_cents, version, (xmax = 0) AS inserted
)
SELECT sku, price_cents, version,
       CASE WHEN inserted THEN 'inserted' ELSE 'updated' END AS action
FROM up
ORDER BY sku;
~~~

~~~text
sku | price_cents | version | action
P-1 | 1799 | 2 | updated
P-3 | 750 | 2 | updated
P-4 | 300 | 1 | inserted
~~~

P-4 is the new row; P-1 and P-3 took the update path; P-2 is missing because its \`WHERE\` was false. To see why this works, I ran one upsert and one plain UPDATE in the same transaction and returned the raw values (transaction ids differ on every run; these are from mine):

| Row | How it was written | \`xmin\` | \`xmax\` |
| :--- | :--- | :--- | :--- |
| P-9 | inserted by the upsert | 71944 | 0 |
| P-1 | updated through \`ON CONFLICT DO UPDATE\` | 71944 | 71944 |
| P-2 | updated by a plain \`UPDATE\` | 71944 | 0 |

The ON CONFLICT path locks the existing row before it updates it, and that lock leaves the current transaction id in the new version's \`xmax\`. A plain UPDATE does not, so "\`xmax\` is non-zero because the row was updated" is the wrong explanation. After \`COMMIT\`, P-1 still showed \`xmax\` 71944 in a later SELECT, which is why \`xmax\` only answers the question inside the \`RETURNING\` of the statement itself. It is undocumented behaviour that has been stable for years, but not a promise: use it behind a test.

### Portable: a version (or created_at) column

~~~sql
INSERT INTO prices (sku, price_cents, source_ts)
VALUES ('P-1', 1799, '2024-06-02 08:00'),
       ('P-5', 1250, '2024-06-02 08:00')
ON CONFLICT (sku) DO UPDATE
SET price_cents = excluded.price_cents,
    source_ts   = excluded.source_ts,
    version     = prices.version + 1
RETURNING sku, price_cents, version,
          CASE WHEN version = 1 THEN 'inserted' ELSE 'updated' END AS action;
~~~

~~~text
sku | price_cents | version | action
P-1 | 1799 | 2 | updated
P-5 | 1250 | 1 | inserted
~~~

The new row gets the default version 1; every update path increments it, so \`version = 1\` in \`RETURNING\` means "just inserted". This runs unchanged on SQLite and PostgreSQL (same output on both in my runs) and doubles as an optimistic-locking counter. A \`created_at = updated_at\` comparison works the same way when the update sets \`updated_at\`.

📌 **Interview term: optimistic locking** — detecting concurrent changes by comparing a version number at write time instead of holding locks while the user thinks.

### PostgreSQL 17+: MERGE with RETURNING

PostgreSQL 17 added \`RETURNING\` to \`MERGE\`, with the \`merge_action()\` function reporting \`INSERT\`, \`UPDATE\` or \`DELETE\` per row ([Percona: two small PostgreSQL 17 improvements](https://www.percona.com/blog/postgresql-17-two-small-improvements-that-will-have-a-major-impact/)). Not run here (the local server is 16):

~~~sql
MERGE INTO prices AS t
USING (VALUES ('P-1', 1799, '2024-06-02 08:00')) AS s(sku, price_cents, source_ts)
ON t.sku = s.sku
WHEN MATCHED THEN UPDATE SET price_cents = s.price_cents, source_ts = s.source_ts
WHEN NOT MATCHED THEN INSERT (sku, price_cents, source_ts) VALUES (s.sku, s.price_cents, s.source_ts)
RETURNING merge_action(), t.sku;
~~~

It is the documented answer to "inserted or updated", but MERGE is not race-free the way ON CONFLICT is: a concurrent insert of the same key can make it fail with a duplicate key error (shown with two sessions in [UPSERT with INSERT … ON CONFLICT](/interview-question/upsert-with-insert-on-conflict-how-do-you-insert-or-update-atomically-without-ra)).

## 5. Pattern 3 — Soft-Delete-Aware Uniqueness

📌 **Interview term: soft delete** — marking a row as deleted (\`deleted_at\` set) instead of removing it, so history and foreign keys survive.

📌 **Interview term: partial index** — an index over only the rows that satisfy a \`WHERE\` predicate. A **partial unique index** enforces uniqueness only among those rows. PostgreSQL and SQLite both support it; MySQL has no partial indexes, the usual workaround being an indexed generated column ([Ipsator: partial indexes](https://ipsator.com/blog/partial-indexes)).

The schema has \`CREATE UNIQUE INDEX customers_live_email ON customers (email) WHERE deleted_at IS NULL\`. Ben (id 2) and Dev (id 4) are soft-deleted:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Partial unique index on email where deleted_at is null. Live rows for ana, cara and the new ben row are in the index. Soft deleted rows for ben and dev are in the table but not in the index, so they cannot conflict">
  <rect class="d-box" x="20" y="20" width="330" height="230" rx="12"/>
  <text class="d-text" x="185" y="50" text-anchor="middle">customers table</text>
  <rect class="d-box-accent" x="44" y="72" width="282" height="34" rx="8"/>
  <text class="d-sub" x="185" y="94" text-anchor="middle">1 ana, live</text>
  <rect class="d-box-muted" x="44" y="114" width="282" height="34" rx="8"/>
  <text class="d-sub" x="185" y="136" text-anchor="middle">2 ben, deleted 2024-04-01</text>
  <rect class="d-box-accent" x="44" y="156" width="282" height="34" rx="8"/>
  <text class="d-sub" x="185" y="178" text-anchor="middle">3 cara, live</text>
  <rect class="d-box-muted" x="44" y="198" width="282" height="34" rx="8"/>
  <text class="d-sub" x="185" y="220" text-anchor="middle">4 dev, deleted 2024-05-15</text>
  <rect class="d-box-accent" x="430" y="20" width="310" height="230" rx="12"/>
  <text class="d-text" x="585" y="50" text-anchor="middle">customers_live_email</text>
  <text class="d-sub" x="585" y="72" text-anchor="middle">WHERE deleted_at IS NULL</text>
  <rect class="d-box" x="460" y="100" width="250" height="34" rx="8"/>
  <text class="d-sub" x="585" y="122" text-anchor="middle">ana@example.com</text>
  <rect class="d-box" x="460" y="156" width="250" height="34" rx="8"/>
  <text class="d-sub" x="585" y="178" text-anchor="middle">cara@example.com</text>
</svg>

Only live rows are entries in the index, so a deleted Ben cannot conflict with a new Ben. Now Ben signs up again and Ana upgrades her plan, in one upsert:

~~~sql
INSERT INTO customers (id, email, name, plan)
VALUES (5, 'ben@example.com', 'Ben', 'pro'),
       (6, 'ana@example.com', 'Ana', 'team')
ON CONFLICT (email) WHERE deleted_at IS NULL DO UPDATE
SET plan = excluded.plan;
~~~

~~~text
id | email | plan | deleted_at
1 | ana@example.com | team | NULL
2 | ben@example.com | free | 2024-04-01
3 | cara@example.com | free | NULL
4 | dev@example.com | pro | 2024-05-15
5 | ben@example.com | pro | NULL
~~~

Ben got a new live row (id 5) next to his old deleted one; Ana's live row was updated in place, and the proposed id 6 was never used. Same result on PostgreSQL 16.

📌 **Interview term: arbiter index (index inference)** — the unique index PostgreSQL picks to detect the conflict. It is inferred from the conflict target's columns **and** its \`WHERE\` predicate, which must imply the partial index's predicate.

Leave the predicate out and the statement is rejected, because no full unique index on \`email\` exists:

~~~sql
INSERT INTO customers (id, email, name, plan)
VALUES (7, 'cara@example.com', 'Cara', 'pro')
ON CONFLICT (email) DO UPDATE SET plan = excluded.plan;
~~~

PostgreSQL 16:

~~~text
ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification
~~~

SQLite 3.45: \`ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint\`. Also note that \`ON CONFLICT ON CONSTRAINT customers_live_email\` does not work either: PostgreSQL 16 answered \`constraint "customers_live_email" for table "customers" does not exist\`, because a partial unique index is an index, not a table constraint (SQLite has no \`ON CONSTRAINT\` form at all). Inference with the predicate is the only way.

## 6. Verified: Running the Code

The three runnable examples ran on sql.js 1.10.2 (SQLite 3.45.0), as the page runs them, after the schema in the question; I also ran them on PostgreSQL 16.15 and got identical rows. The \`xmax\` example ran on PostgreSQL 16.15 in a scratch database with the same schema. Outputs copied from those runs:

Newest wins (SQLite):

~~~text
sku | price_cents | source_ts | version
P-1 | 1799 | 2024-06-02 08:00 | 2
P-2 | 4500 | 2024-06-01 10:00 | 1
P-3 | 750 | 2024-06-04 12:00 | 2
P-4 | 300 | 2024-06-02 08:00 | 1
~~~

Soft-delete-aware upsert (SQLite):

~~~text
id | email | plan | deleted_at
1 | ana@example.com | team | NULL
2 | ben@example.com | free | 2024-04-01
3 | cara@example.com | free | NULL
4 | dev@example.com | pro | 2024-05-15
5 | ben@example.com | pro | NULL
~~~

Version column flag (SQLite):

~~~text
sku | price_cents | version | action
P-1 | 1799 | 2 | updated
P-5 | 1250 | 1 | inserted
~~~

\`xmax\` detection with a conditional update (PostgreSQL 16):

~~~text
sku | price_cents | version | action
P-1 | 1799 | 2 | updated
P-3 | 750 | 2 | updated
P-4 | 300 | 1 | inserted
~~~

The lock-wait timeline in section 3 and the \`xmin\`/\`xmax\` table in section 4 come from my own runs on a scratch PostgreSQL 16 database (two \`psql\` sessions for the timeline).

## 7. Edge Cases

- **Equal timestamps.** \`>\` ignores an event with the same timestamp; decide whether ties should apply (\`>=\`) and make it deterministic.
- **The target predicate does not filter rows.** It is only used to choose the arbiter index. On PostgreSQL 16 a target \`ON CONFLICT (email) WHERE deleted_at IS NULL AND plan = 'pro'\` was accepted (it implies the index predicate) and still updated Cara, whose plan was \`free\`. To filter, put the condition in \`DO UPDATE ... WHERE\`.
- **Reviving instead of inserting.** After live Ben (id 5) exists, \`UPDATE customers SET deleted_at = NULL WHERE id = 2\` failed on PostgreSQL 16 with \`duplicate key value violates unique constraint "customers_live_email"\`, because the revived row would join the partial index.
- **Conditional upserts and counters.** \`WHERE\` false means the row is not returned, so an application that counts \`RETURNING\` rows as "processed" will under-count skipped events.
- **Other engines.** MySQL's \`ON DUPLICATE KEY UPDATE\` has no \`WHERE\`; the usual workaround is \`SET col = IF(new.ts > ts, new.col, col)\` per column. Not run here.

## Common Pitfalls

- **Assuming a false \`DO UPDATE ... WHERE\` takes no locks.** It still locks the existing row until commit, as the two-session test showed.
- **Explaining \`xmax <> 0\` as "the row was updated".** A plain UPDATE leaves the new version's \`xmax\` at 0; the non-zero value comes from the ON CONFLICT row lock. Use it only in \`RETURNING\`, never as a stored flag.
- **Keeping \`UNIQUE (email)\` on a soft-delete table**, so a returning user can never sign up again.
- **Writing \`ON CONFLICT (email)\` against a partial unique index** without repeating \`WHERE deleted_at IS NULL\`, and getting "no unique or exclusion constraint matching".
- **Comparing wall-clock timestamps from different producers** for newest-wins; clock skew lets stale data win. Compare a version from the source.
- **Using \`<>\` instead of \`IS DISTINCT FROM\`** in a skip-no-op condition, which silently ignores changes to or from NULL.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Conditional update:</strong> <span style="color:#f0e2c8;">Add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> to the conflict action: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DO UPDATE SET ... WHERE excluded.source_ts &gt; prices.source_ts</code>. A late, older event then changes nothing. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE prices.price_cents IS DISTINCT FROM excluded.price_cents</code> skips no-op writes the same way.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What a false WHERE does:</strong> <span style="color:#f0e2c8;">The row is <strong style="color:#ffca28;">not updated and not returned</strong> by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RETURNING</code>, but PostgreSQL still <strong style="color:#ffca28;">locks</strong> it until commit. I watched a plain UPDATE on that row wait 2 seconds for the upsert transaction.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Insert or update?:</strong> <span style="color:#f0e2c8;">In PostgreSQL, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RETURNING (xmax = 0) AS inserted</code>. A fresh row has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xmax</code> 0; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DO UPDATE</code> path leaves the new row version with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xmax</code> set to the current transaction id, because it locked the old row first. It works, but it is an implementation detail, so I would wrap it and test it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Portable alternative:</strong> <span style="color:#f0e2c8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">version</code> column that starts at 1 and is incremented in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DO UPDATE</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RETURNING version = 1</code> means inserted. On PostgreSQL 17+, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MERGE ... RETURNING merge_action()</code> reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> officially.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Soft delete:</strong> <span style="color:#f0e2c8;">A plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE (email)</code> blocks re-signup. Use a partial unique index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE (email) WHERE deleted_at IS NULL</code> and repeat the predicate in the target: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT (email) WHERE deleted_at IS NULL</code>. Without the predicate both PostgreSQL and SQLite reject the statement.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">xmax</code> not zero after an update through ON CONFLICT, when a plain UPDATE leaves it zero?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In my PostgreSQL 16 run, the row updated via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT</code> had <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xmax</code> equal to my own transaction id, while a row changed by a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> in the same transaction had <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xmax</code> 0. ON CONFLICT takes a row lock on the existing row before updating it, and that lock is carried on the new version. That mechanism is exactly why the trick is undocumented behaviour, not an API.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I check <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">xmax</code> later, in another query, to see whether a row was ever updated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. After commit the updated row still showed a non-zero <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xmax</code>, and plain updates, row locks and vacuum change it too. It is only meaningful in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RETURNING</code> of the statement that just ran. If you need history, store it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">created_at</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">version</code>, or an audit table.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does ON CONFLICT need the WHERE predicate for a partial index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Index inference: PostgreSQL picks the arbiter index by matching the columns <strong style="color:#ffca28;">and</strong> the predicate. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT (email)</code> alone asks for a full unique index on email, finds none, and fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">there is no unique or exclusion constraint matching the ON CONFLICT specification</code>. Partial unique indexes cannot be named with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONSTRAINT</code> either: PostgreSQL reports the constraint does not exist, because it is an index, not a constraint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Newest-wins with timestamps from different servers: any risk?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Clock skew. Two producers with skewed clocks can make an older change look newer. Prefer a monotonic version from the source of truth (a sequence, a per-entity counter, a Kafka offset) and compare that: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE excluded.version &gt; t.version</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Revive the soft-deleted row or insert a new one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both work with the partial index. Inserting a new row keeps the old one as history (what the example does). Reviving means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... SET deleted_at = NULL</code> on the old row, which is not an upsert at all, and it fails if a live row with that email already exists, because the revived row joins the partial index.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Conditional upsert | \`DO UPDATE ... WHERE\`: update only when a condition on the old and proposed row holds. |
| \`xmax\` | PostgreSQL system column: deleting or locking transaction id of a row version, 0 if none. |
| MVCC | Updates write new row versions instead of overwriting; \`xmin\`/\`xmax\` mark their lifetimes. |
| Optimistic locking | Detect concurrent changes with a version number compared at write time. |
| Soft delete | Mark a row deleted with \`deleted_at\` instead of removing it. |
| Partial index | Index over only rows matching a predicate; a partial unique index enforces uniqueness among them. |
| Arbiter index (index inference) | The unique index ON CONFLICT uses, inferred from target columns and predicate. |

**Conclusion:** Three small additions turn a basic upsert into a production one. A \`WHERE\` on \`DO UPDATE\` stops stale or no-op writes, at the cost of still locking the row. \`RETURNING (xmax = 0)\` tells inserts from updates in PostgreSQL because the ON CONFLICT path leaves its lock in the new version's \`xmax\`, which also means it is an implementation detail; a \`version\` column or PostgreSQL 17's \`MERGE ... RETURNING merge_action()\` are the documented ways. And a partial unique index \`WHERE deleted_at IS NULL\`, matched by \`ON CONFLICT (email) WHERE deleted_at IS NULL\`, makes uniqueness apply only to live rows so soft-deleted users can come back.`,
    examples: [
      {
        label: `Newest wins: DO UPDATE ... WHERE excluded.source_ts > prices.source_ts`,
        code: `INSERT INTO prices (sku, price_cents, source_ts)
VALUES ('P-1', 1799, '2024-06-02 08:00'),
       ('P-2', 4900, '2024-05-30 23:00'),
       ('P-3', 750,  '2024-06-04 12:00'),
       ('P-4', 300,  '2024-06-02 08:00')
ON CONFLICT (sku) DO UPDATE
SET price_cents = excluded.price_cents,
    source_ts   = excluded.source_ts,
    version     = prices.version + 1
WHERE excluded.source_ts > prices.source_ts;

SELECT sku, price_cents, source_ts, version
FROM prices
ORDER BY sku;`,
      },
      {
        label: `Soft delete: partial unique index as the conflict target lets Ben sign up again`,
        code: `INSERT INTO customers (id, email, name, plan)
VALUES (5, 'ben@example.com', 'Ben', 'pro'),
       (6, 'ana@example.com', 'Ana', 'team')
ON CONFLICT (email) WHERE deleted_at IS NULL DO UPDATE
SET plan = excluded.plan;

SELECT id, email, plan, deleted_at
FROM customers
ORDER BY id;`,
      },
      {
        label: `Portable insert-or-update flag: a version column read back with RETURNING`,
        code: `INSERT INTO prices (sku, price_cents, source_ts)
VALUES ('P-1', 1799, '2024-06-02 08:00'),
       ('P-5', 1250, '2024-06-02 08:00')
ON CONFLICT (sku) DO UPDATE
SET price_cents = excluded.price_cents,
    source_ts   = excluded.source_ts,
    version     = prices.version + 1
RETURNING sku, price_cents, version,
          CASE WHEN version = 1 THEN 'inserted' ELSE 'updated' END AS action;`,
      },
      {
        label: `PostgreSQL: RETURNING (xmax = 0) AS inserted, with a conditional update`,
        code: `WITH up AS (
  INSERT INTO prices (sku, price_cents, source_ts)
  VALUES ('P-1', 1799, '2024-06-02 08:00'),
         ('P-2', 4900, '2024-05-30 23:00'),
         ('P-3', 750,  '2024-06-04 12:00'),
         ('P-4', 300,  '2024-06-02 08:00')
  ON CONFLICT (sku) DO UPDATE
  SET price_cents = excluded.price_cents,
      source_ts   = excluded.source_ts,
      version     = prices.version + 1
  WHERE excluded.source_ts > prices.source_ts
  RETURNING sku, price_cents, version, (xmax = 0) AS inserted
)
SELECT sku, price_cents, version,
       CASE WHEN inserted THEN 'inserted' ELSE 'updated' END AS action
FROM up
ORDER BY sku;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is an index and how does it speed up queries?`,
    difficulty: "medium",
    seoDescription: `What a database index is, how a B-tree turns a full table scan into a few page reads, what indexes cost, and when the planner ignores them.`,
    description: `**Question presented to candidate:**
"What is a database index, and how does it actually make a query faster? Walk me through what the database does for \`WHERE email = ...\` with and without one, and tell me what an index costs."

**What a strong answer should cover:**
- An index is a separate, sorted data structure (by default a B-tree) that maps column values to the location of the matching rows, so the engine can jump to them instead of reading the whole table
- Without an index the engine does a full table scan (SQLite \`SCAN\`, PostgreSQL \`Seq Scan\`), reading every row; with one it does a search (\`SEARCH ... USING INDEX\`, \`Index Scan\`) in a few page reads, O(log n)
- Indexes also serve \`ORDER BY\`, range conditions, joins and \`MIN\`/\`MAX\` because the entries are kept in order
- Costs: extra disk space, slower \`INSERT\`/\`UPDATE\`/\`DELETE\` (every index is maintained on every write), and memory pressure
- When an index is not used: a function or expression on the column, a leading-wildcard \`LIKE\`, low selectivity (most of the table matches), or a missing leading column of a composite index; prove it with \`EXPLAIN\`

**Code / implementation expected:** Optional — \`CREATE INDEX\` and an \`EXPLAIN\` / \`EXPLAIN QUERY PLAN\` before and after.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL,
  country    TEXT NOT NULL,
  created_at TEXT NOT NULL
);
INSERT INTO users VALUES (1, 'ana@example.com', 'Ana', 'PT', '2024-01-05');
INSERT INTO users VALUES (2, 'ben@example.com', 'Ben', 'US', '2024-01-09');
INSERT INTO users VALUES (3, 'cara@example.com', 'Cara', 'IN', '2024-02-11');
INSERT INTO users VALUES (4, 'dev@example.com', 'Dev', 'IN', '2024-02-20');
INSERT INTO users VALUES (5, 'eli@example.com', 'Eli', 'US', '2024-03-02');
INSERT INTO users VALUES (6, 'fay@example.com', 'Fay', 'DE', '2024-03-15');
INSERT INTO users VALUES (7, 'gus@example.com', 'Gus', 'US', '2024-04-01');
INSERT INTO users VALUES (8, 'hana@example.com', 'Hana', 'JP', '2024-04-18');
\`\`\``,
    answer: `**Target Audience:** Beginners who have written SELECT queries but never looked at how the database finds rows; anyone preparing for the first indexing question in an interview.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 through sql.js 1.10.2 (the runnable examples) and PostgreSQL 16.15 (plans on 100,000 rows, sizes, timings). The ideas hold for MySQL and SQL Server too; their specifics are not covered here.

> **How to read this doc:** Every idea is in plain language first, then a \`📌 Interview term:\` callout gives the precise word an interviewer expects. All plans, sizes and timings are from real runs; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

You have a 900-page cookbook and want the recipe for "paneer tikka". Without an index you start at page 1 and read every page until you find it, and then keep going, because there might be a second paneer tikka recipe. With the index at the back, you flip to "P", run your finger down a sorted list, see "paneer tikka ... 412", and open page 412. Two minutes become ten seconds.

The index did not make the book shorter. It is **extra pages** that someone had to write, and every time a new recipe is added, the index has to be updated too. That is the whole trade-off of database indexes in one picture: much faster lookups in exchange for extra storage and extra work on every write.

## 2. The Core Idea

📌 **Interview term: index** — a separate data structure, kept in sorted order, that stores the values of one or more columns together with a pointer to each matching row. The table itself is unchanged; the index is an extra lookup path into it.

📌 **Interview term: full table scan** — reading every row of the table and testing the condition on each. SQLite's plan says \`SCAN users\`; PostgreSQL's says \`Seq Scan\` (sequential scan).

📌 **Interview term: B-tree** — the default index structure in PostgreSQL, SQLite, MySQL InnoDB and SQL Server. It is a balanced tree of pages: the root and internal pages hold key ranges that say which child to go to, and the leaf pages hold every key in sorted order with a pointer to its row. All leaves are at the same depth, so every lookup costs the same few page reads.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="B-tree index on email. The root page splits the keys into ranges. An internal page narrows the range. A leaf page holds sorted emails with a pointer to the table row. A lookup for dev at example dot com follows one path from root to leaf and then reads one table row">
  <defs>
    <marker id="sql14q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="270" y="20" width="220" height="60" rx="10"/>
  <text class="d-text" x="380" y="46" text-anchor="middle">root page</text>
  <text class="d-sub" x="380" y="66" text-anchor="middle">a to e, f to z</text>
  <rect class="d-box-accent" x="80" y="130" width="220" height="60" rx="10"/>
  <text class="d-text" x="190" y="156" text-anchor="middle">internal page</text>
  <text class="d-sub" x="190" y="176" text-anchor="middle">a to c, d to e</text>
  <rect class="d-box-muted" x="460" y="130" width="220" height="60" rx="10"/>
  <text class="d-text" x="570" y="156" text-anchor="middle">internal page</text>
  <text class="d-sub" x="570" y="176" text-anchor="middle">f to g, h to z</text>
  <rect class="d-box-accent" x="20" y="250" width="300" height="60" rx="10"/>
  <text class="d-text" x="170" y="276" text-anchor="middle">leaf: dev, eli</text>
  <text class="d-sub" x="170" y="296" text-anchor="middle">each entry points to a row</text>
  <rect class="d-box" x="440" y="250" width="300" height="60" rx="10"/>
  <text class="d-text" x="590" y="276" text-anchor="middle">table row id 4</text>
  <text class="d-sub" x="590" y="296" text-anchor="middle">Dev, IN, 2024-02-20</text>
  <line class="d-edge-accent" x1="330" y1="84" x2="230" y2="124" marker-end="url(#sql14q3-arrow)"/>
  <line class="d-edge" x1="430" y1="84" x2="530" y2="124" marker-end="url(#sql14q3-arrow)"/>
  <line class="d-edge-accent" x1="190" y1="194" x2="180" y2="244" marker-end="url(#sql14q3-arrow)"/>
  <line class="d-edge-accent" x1="324" y1="280" x2="432" y2="280" marker-end="url(#sql14q3-arrow)"/>
</svg>

Finding \`dev@example.com\` means reading the root page, one internal page and one leaf, then the single table row: four page reads, whether the table has eight rows or eight million. Each page holds hundreds of keys, so the tree stays shallow. I checked on PostgreSQL 16 with the \`pageinspect\` extension: an index on 1,000,000 email addresses (4,961 pages) had its root at level 2, which means only three levels from root to leaf.

📌 **Interview term: O(log n)** — the cost grows with the logarithm of the number of rows, i.e. with the depth of the tree, not with the table size. A full scan is O(n).

## 3. See It: SCAN vs SEARCH in SQLite

\`EXPLAIN QUERY PLAN\` asks SQLite how it would run a query without running it. Here it is before and after creating an index:

~~~sql
EXPLAIN QUERY PLAN
SELECT id, name FROM users WHERE email = 'dev@example.com';

CREATE INDEX users_email_idx ON users (email);

EXPLAIN QUERY PLAN
SELECT id, name FROM users WHERE email = 'dev@example.com';

SELECT id, name FROM users WHERE email = 'dev@example.com';
~~~

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN users

id | parent | notused | detail
3 | 0 | 0 | SEARCH users USING INDEX users_email_idx (email=?)

id | name
4 | Dev
~~~

Read the \`detail\` column: first \`SCAN users\` (every row), then \`SEARCH users USING INDEX users_email_idx (email=?)\` (a tree lookup on email). The answer is the same either way; only the work changes. Indexes never change results, only speed.

📌 **Interview term: query plan** — the step-by-step strategy the database chose to run a query. \`EXPLAIN\` shows it; reading plans has its own page, [How do you read an EXPLAIN query plan?](/interview-question/how-do-you-read-an-explain-query-plan).

## 4. See It at Scale: PostgreSQL on 100,000 Rows

Eight rows are too few to feel the difference, so the PostgreSQL examples build a 100,000-row table. Without an index:

~~~text
QUERY PLAN
Seq Scan on big_users (actual rows=1 loops=1)
  Filter: (email = 'user4242@example.com'::text)
  Rows Removed by Filter: 99999
~~~

PostgreSQL read all 100,000 rows to return one: \`Rows Removed by Filter: 99999\`. With \`CREATE INDEX big_users_email_idx ON big_users (email)\`:

~~~text
QUERY PLAN
Index Scan using big_users_email_idx on big_users (actual rows=1 loops=1)
  Index Cond: (email = 'user4242@example.com'::text)
~~~

\`Index Cond\` means the condition was answered by the index itself; no rows were read and thrown away. (Plans are from \`EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)\`; on other data or settings the planner may choose differently. Different scan types are compared in [Seq Scan vs Index Scan vs Index-Only Scan](/interview-question/seq-scan-vs-index-scan-vs-index-only-scan-when-does-postgres-choose-each).)

## 5. Indexes Also Sort

Because the leaf entries are already in order, an index can hand back rows in order without a separate sort step. "The 3 newest users":

~~~sql
EXPLAIN QUERY PLAN
SELECT name, created_at FROM users ORDER BY created_at DESC LIMIT 3;

CREATE INDEX users_created_idx ON users (created_at);

EXPLAIN QUERY PLAN
SELECT name, created_at FROM users ORDER BY created_at DESC LIMIT 3;

SELECT name, created_at FROM users ORDER BY created_at DESC LIMIT 3;
~~~

~~~text
id | parent | notused | detail
4 | 0 | 0 | SCAN users
16 | 0 | 0 | USE TEMP B-TREE FOR ORDER BY

id | parent | notused | detail
5 | 0 | 0 | SCAN users USING INDEX users_created_idx

name | created_at
Hana | 2024-04-18
Gus | 2024-04-01
Fay | 2024-03-15
~~~

(SQLite.) Before: \`SCAN users\` plus \`USE TEMP B-TREE FOR ORDER BY\`, i.e. read everything and sort it. After: walk the index backwards and stop after 3 rows. The same property serves range conditions (\`created_at >= '2024-03-01'\`), \`MIN\`/\`MAX\`, merge joins, and [efficient pagination](/interview-question/how-do-you-paginate-efficiently-in-sql).

## 6. When the Index Cannot Help

~~~sql
CREATE INDEX users_email_idx ON users (email);

EXPLAIN QUERY PLAN
SELECT id, name FROM users WHERE lower(email) = 'dev@example.com';

EXPLAIN QUERY PLAN
SELECT id, name FROM users WHERE email LIKE '%dev%';

CREATE INDEX users_email_lower_idx ON users (lower(email));

EXPLAIN QUERY PLAN
SELECT id, name FROM users WHERE lower(email) = 'dev@example.com';
~~~

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN users

id | parent | notused | detail
2 | 0 | 0 | SCAN users

id | parent | notused | detail
3 | 0 | 0 | SEARCH users USING INDEX users_email_lower_idx (<expr>=?)
~~~

- **A function on the column.** The index is sorted by \`email\`, not by \`lower(email)\`, so it cannot be searched for \`lower(email) = ...\`: \`SCAN users\`. An **expression index** on \`lower(email)\` fixes it: \`SEARCH ... USING INDEX users_email_lower_idx (<expr>=?)\`.
- **A leading wildcard.** \`LIKE '%dev%'\` can start anywhere in the string, so the sort order is useless. (A prefix pattern like \`'dev%'\` can use a B-tree; in PostgreSQL with a non-C collation that needs an index with the \`text_pattern_ops\` operator class ([pgsql-general: text_pattern_ops](https://postgresql.org/message-id/87r6f13wtm.fsf%40oxford.xeocode.com)). Substring search needs a different index type, such as a trigram GIN index; not run here.)
- **Low selectivity.** If most rows match, a scan is cheaper than jumping back and forth. On the 100,000-row PostgreSQL table with an index on \`country\` (five countries), asking for four of them gave:

~~~text
QUERY PLAN
Seq Scan on big_users
  Filter: (country = ANY ('{US,IN,DE,PT}'::text[]))
~~~

A single country (20% of rows) gave a Bitmap Heap Scan on the index instead.

📌 **Interview term: selectivity** — the fraction of rows a condition matches. The lower the fraction, the more an index helps.

📌 **Interview term: expression index** — an index on the result of an expression such as \`lower(email)\`; the query must use the same expression to benefit. Supported by PostgreSQL and SQLite.

Other reasons an index is skipped: comparing a column to a value of a different type, skipping the first column of a composite index ([Why does column order matter in a composite index?](/interview-question/why-does-column-order-matter-in-a-composite-index)), and stale planner statistics.

## 7. What an Index Costs

I measured on PostgreSQL 16 (one machine, warm cache, second of two runs; treat as ratios): inserting 500,000 rows into a table with no index and into an identical table with three single-column indexes (email, country, created_at).

| | No index | Three indexes |
| :--- | :--- | :--- |
| \`INSERT\` of 500,000 rows | ~0.56 s | ~3.1 s |
| Size | table 33 MB | table 33 MB + indexes 56 MB |

The email index alone was 34 MB, bigger than the table's email column suggests, because each entry also stores a row pointer and pages are kept partly free. (The low-cardinality country index was only 3.2 MB, thanks to B-tree deduplication, added in PostgreSQL 13 ([PostgreSQL 13.0 release notes](https://www.postgresql.org/docs/release/13.0/)).) Every index is also maintained on every UPDATE of its columns and on DELETE, and competes for memory with the table.

📌 **Interview term: write amplification** — one logical write turning into many physical writes: the table row plus one entry in every index.

## 8. Verified: Running the Code

The SQLite examples ran on sql.js 1.10.2 (SQLite 3.45.0), as the page runs them, after the schema in the question. The PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database. Outputs copied from those runs:

SCAN, then SEARCH after \`CREATE INDEX\` (SQLite):

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN users

id | parent | notused | detail
3 | 0 | 0 | SEARCH users USING INDEX users_email_idx (email=?)

id | name
4 | Dev
~~~

Function, wildcard and the expression index (SQLite):

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN users

id | parent | notused | detail
2 | 0 | 0 | SCAN users

id | parent | notused | detail
3 | 0 | 0 | SEARCH users USING INDEX users_email_lower_idx (<expr>=?)
~~~

No index, 100,000 rows (PostgreSQL 16):

~~~text
QUERY PLAN
Seq Scan on big_users (actual rows=1 loops=1)
  Filter: (email = 'user4242@example.com'::text)
  Rows Removed by Filter: 99999
~~~

With the index (PostgreSQL 16):

~~~text
QUERY PLAN
Index Scan using big_users_email_idx on big_users (actual rows=1 loops=1)
  Index Cond: (email = 'user4242@example.com'::text)
~~~

The size and timing table in section 7 and the tree depth in section 2 come from separate runs in my own scratch database.

## 9. Index Types in One Table

| Type | Good for | Engines |
| :--- | :--- | :--- |
| B-tree (default) | \`=\`, \`<\`, \`>\`, \`BETWEEN\`, \`ORDER BY\`, prefix \`LIKE\` | All |
| Hash | \`=\` only | PostgreSQL (support in other engines varies; not checked here) |
| GIN | elements inside a value: JSONB, arrays, full-text | PostgreSQL |
| GiST / SP-GiST / BRIN | geometry, ranges, very large naturally ordered tables | PostgreSQL |
| Partial / expression | a subset of rows, a computed value | PostgreSQL, SQLite |

Related designs have their own pages: [What is a covering index?](/interview-question/what-is-a-covering-index), [clustered vs non-clustered](/interview-question/what-is-the-difference-between-a-clustered-and-non-clustered-index), and [composite index column order](/interview-question/why-does-column-order-matter-in-a-composite-index).

## Common Pitfalls

- **Indexing every column "just in case".** Writes slow down and memory fills with indexes no query uses.
- **Wrapping the indexed column in a function** (\`lower(email)\`, \`date(created_at)\`, \`amount * 1.1\`) and wondering why the plan says scan. Rewrite the condition or create an expression index.
- **Expecting an index on a low-selectivity column to help** a query that matches most of the table.
- **Forgetting foreign-key columns.** PostgreSQL does not index them automatically; joins and \`ON DELETE CASCADE\` then scan the child table.
- **Assuming an index is used without checking** \`EXPLAIN\` (or \`EXPLAIN QUERY PLAN\` in SQLite) on realistic data. Eight test rows and eight million production rows can get different plans.
- **Thinking indexes change results.** They never do; if results change, the query changed.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An index is a separate, <strong style="color:#ffca28;">sorted</strong> structure, by default a B-tree, holding the indexed column values and a pointer to each row. Like the index at the back of a book: look up the word, get the page.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Without vs with:</strong> <span style="color:#f0e2c8;">Without it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE email = ?</code> reads every row: SQLite says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SCAN users</code>, PostgreSQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Seq Scan</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Rows Removed by Filter: 99999</code>. With it, the engine walks root to leaf, a handful of pages, and reads only matching rows: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SEARCH ... USING INDEX</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Index Scan</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is fast:</strong> <span style="color:#f0e2c8;">Lookup cost grows with the <strong style="color:#ffca28;">depth</strong> of the tree, O(log n), not with the table size. My 1,000,000-row email index in PostgreSQL had just three levels. Being sorted, the same index also serves ranges, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY ... LIMIT</code>, joins and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MIN</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What it costs:</strong> <span style="color:#f0e2c8;">Space and write speed. Every INSERT, UPDATE of an indexed column and DELETE must maintain every index. In my test 500,000 inserts took about 0.56 s with no index and 3.1 s with three, and the three indexes were bigger than the table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When it is not used:</strong> <span style="color:#f0e2c8;">A function on the column (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower(email)</code>), a leading wildcard (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIKE '%dev%'</code>), a condition matching most of the table, or skipping the first column of a composite index. Fixes: an expression index, a different index type, or accepting the scan. I always check with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not index every column?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each index slows every write and uses disk and cache. Index the columns that real, frequent queries filter, join or sort on, and drop indexes no query uses (PostgreSQL shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">idx_scan = 0</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_stat_user_indexes</code>).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did PostgreSQL ignore my index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually because a Seq Scan is cheaper: when a condition matches most of the table, reading it sequentially beats jumping between index and table. In my test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">country IN (4 of 5 countries)</code> used a Seq Scan even with an index. Other reasons: a function on the column, a type mismatch, or stale statistics (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ANALYZE</code>).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is selectivity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The fraction of rows a condition matches. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">email = ?</code> matches one row in 100,000, very selective, perfect for an index. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">country = 'DE'</code> matches 20%, which PostgreSQL served with a Bitmap Heap Scan; matching 80% gave a Seq Scan.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">B-tree vs hash vs GIN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">B-tree (the default) handles equality, ranges and sorting. Hash handles only equality. GIN indexes the elements inside a value (JSONB keys, array items, words) for containment and full-text search. See [JSONB querying and GIN indexing](/interview-question/jsonb-querying-and-gin-indexing-how-do-you-query-and-index-schemaless-data-effic).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do primary keys and unique constraints create indexes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. PostgreSQL, SQLite and MySQL all build a unique index to enforce them, which is why you do not need a second index on a primary key. Foreign keys are different: PostgreSQL does <strong style="color:#ffca28;">not</strong> index the referencing column automatically (in my PostgreSQL 16 run a table with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user_id REFERENCES users(id)</code> had only its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_pkey</code> index).</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Index | A separate sorted structure mapping column values to row locations. |
| Full table scan | Reading every row and testing the condition (\`SCAN\`, \`Seq Scan\`). |
| B-tree | Balanced tree of pages; the default index structure in all major engines. |
| O(log n) | Cost grows with tree depth, not table size. |
| Query plan | The strategy the engine chose; shown by \`EXPLAIN\`. |
| Selectivity | Fraction of rows a condition matches; low is good for indexes. |
| Expression index | Index on a computed value such as \`lower(email)\`. |
| Write amplification | One logical write becoming a table write plus one write per index. |

**Conclusion:** An index is a sorted side structure, normally a B-tree, that lets the database walk a few pages to the rows it needs instead of reading the whole table: SQLite's plan changes from \`SCAN\` to \`SEARCH ... USING INDEX\`, and PostgreSQL's from a Seq Scan discarding 99,999 rows to an Index Scan returning one. Because it is sorted, the same index serves ranges and \`ORDER BY ... LIMIT\`. It costs disk, memory and write time, measured here at several times slower bulk inserts with three indexes, and it is skipped when the query hides the column behind a function, starts with a wildcard, or matches most of the table. Create indexes for real query patterns and confirm each one with \`EXPLAIN\`.`,
    examples: [
      {
        label: `SQLite: SCAN without an index, SEARCH USING INDEX after CREATE INDEX`,
        code: `EXPLAIN QUERY PLAN
SELECT id, name FROM users WHERE email = 'dev@example.com';

CREATE INDEX users_email_idx ON users (email);

EXPLAIN QUERY PLAN
SELECT id, name FROM users WHERE email = 'dev@example.com';

SELECT id, name FROM users WHERE email = 'dev@example.com';`,
      },
      {
        label: `When the index cannot help: a function on the column or a leading wildcard, and the expression-index fix`,
        code: `CREATE INDEX users_email_idx ON users (email);

EXPLAIN QUERY PLAN
SELECT id, name FROM users WHERE lower(email) = 'dev@example.com';

EXPLAIN QUERY PLAN
SELECT id, name FROM users WHERE email LIKE '%dev%';

CREATE INDEX users_email_lower_idx ON users (lower(email));

EXPLAIN QUERY PLAN
SELECT id, name FROM users WHERE lower(email) = 'dev@example.com';`,
      },
      {
        label: `PostgreSQL, 100,000 rows, no index: Seq Scan reads and discards 99,999 rows`,
        code: `CREATE TABLE big_users AS
SELECT g AS id,
       'user' || g || '@example.com' AS email,
       (ARRAY['US','IN','DE','PT','JP'])[1 + g % 5] AS country
FROM generate_series(1, 100000) AS g;
ANALYZE big_users;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, country FROM big_users WHERE email = 'user4242@example.com';`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL, same table with an index: Index Scan goes straight to the one row`,
        code: `CREATE TABLE big_users AS
SELECT g AS id,
       'user' || g || '@example.com' AS email,
       (ARRAY['US','IN','DE','PT','JP'])[1 + g % 5] AS country
FROM generate_series(1, 100000) AS g;
CREATE INDEX big_users_email_idx ON big_users (email);
ANALYZE big_users;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, country FROM big_users WHERE email = 'user4242@example.com';`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the difference between a clustered and non-clustered index?`,
    difficulty: "hard",
    seoDescription: `Clustered vs non-clustered indexes: what each stores, row locators in SQL Server, InnoDB and PostgreSQL, and why PostgreSQL CLUSTER is a one-time reorder.`,
    description: `**Question presented to candidate:**
"What is the difference between a clustered and a non-clustered index? Why can a table have only one clustered index, what does a non-clustered index actually store, and how does this look in SQL Server, MySQL InnoDB and PostgreSQL?"

**What a strong answer should cover:**
- A clustered index **is** the table: its leaf pages hold the full rows, stored in key order, so there can be only one; a non-clustered (secondary) index is a separate structure whose leaves hold the key plus a pointer to the row
- What the pointer is: in SQL Server the clustering key (or a RID on a heap), in InnoDB the primary key, in PostgreSQL a physical tuple address (\`ctid\`); a secondary lookup is therefore two searches on InnoDB and SQL Server clustered tables
- Consequences: range scans and \`ORDER BY\` on the clustering key read neighbouring pages; a wide or random clustering key (for example a random UUID) bloats every secondary index and causes page splits
- PostgreSQL has no clustered indexes: tables are heaps and every index is secondary; \`CLUSTER\` reorders the table once and is not maintained, and it takes an \`ACCESS EXCLUSIVE\` lock
- SQLite: ordinary tables are B-trees keyed by \`rowid\` (an \`INTEGER PRIMARY KEY\` is the rowid), and \`WITHOUT ROWID\` tables are clustered on their primary key

**Code / implementation expected:** Optional — plans or physical row locations that show the difference between a lookup by the clustering key and by a secondary index.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  sku   TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL,
  price_cents INTEGER NOT NULL
);
INSERT INTO products VALUES (1, 'KB-01', 'Keyboard', 4900);
INSERT INTO products VALUES (2, 'MS-02', 'Mouse', 1900);
INSERT INTO products VALUES (3, 'MN-03', 'Monitor', 18900);
INSERT INTO products VALUES (4, 'HD-04', 'Headset', 5900);
INSERT INTO products VALUES (5, 'CB-05', 'Cable', 900);
INSERT INTO products VALUES (6, 'DK-06', 'Dock', 12900);
\`\`\``,
    answer: `**Target Audience:** Developers who know what an index is and now need the storage-level picture that interviewers probe with "clustered vs non-clustered".
**Difficulty:** Hard
**Engines:** SQLite 3.45.0 through sql.js 1.10.2 (runnable examples) and PostgreSQL 16.15 (\`ctid\`, \`CLUSTER\`, heap-page counts). SQL Server and MySQL InnoDB behaviour is cited from their documentation; I could not run either here.

> **How to read this doc:** Plain language first, then a \`📌 Interview term:\` callout with the exact vocabulary. Every plan and row location below is from a real run; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

A phone book is sorted by surname, and the entries **are** the book: once you find "Sharma" you are already looking at the address and the number. That is a clustered index. There can only be one, because the pages of a printed book can only be in one order.

Now the library adds a card file sorted by street. Each card says "Sharma, page 212". To get the phone number you find the card, then go to page 212 of the phone book. That is a non-clustered index: a separate sorted list that points back into the real thing. The library can have as many card files as it likes (by street, by first name, by postcode), but every one of them costs a second step.

If the basics of indexes are new, start with [What is an index and how does it speed up queries?](/interview-question/what-is-an-index-and-how-does-it-speed-up-queries).

## 2. The Two Shapes

📌 **Interview term: clustered index** — an index whose leaf level holds the complete table rows, stored in index-key order. The index and the table are the same structure.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Clustered index. The root page points to leaf pages, and the leaf pages contain the full rows in key order: ids 1 to 3 with all columns, then ids 4 to 6 with all columns. There is no separate table">
  <defs>
    <marker id="sql14q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="270" y="20" width="220" height="60" rx="10"/>
  <text class="d-text" x="380" y="46" text-anchor="middle">root page</text>
  <text class="d-sub" x="380" y="66" text-anchor="middle">id 1 to 3, id 4 to 6</text>
  <rect class="d-box-accent" x="40" y="150" width="310" height="120" rx="10"/>
  <text class="d-text" x="195" y="178" text-anchor="middle">leaf page = table rows</text>
  <text class="d-sub" x="195" y="204" text-anchor="middle">1 KB-01 Keyboard 4900</text>
  <text class="d-sub" x="195" y="226" text-anchor="middle">2 MS-02 Mouse 1900</text>
  <text class="d-sub" x="195" y="248" text-anchor="middle">3 MN-03 Monitor 18900</text>
  <rect class="d-box-accent" x="410" y="150" width="310" height="120" rx="10"/>
  <text class="d-text" x="565" y="178" text-anchor="middle">leaf page = table rows</text>
  <text class="d-sub" x="565" y="204" text-anchor="middle">4 HD-04 Headset 5900</text>
  <text class="d-sub" x="565" y="226" text-anchor="middle">5 CB-05 Cable 900</text>
  <text class="d-sub" x="565" y="248" text-anchor="middle">6 DK-06 Dock 12900</text>
  <line class="d-edge" x1="330" y1="84" x2="220" y2="142" marker-end="url(#sql14q4-arrow)"/>
  <line class="d-edge" x1="430" y1="84" x2="540" y2="142" marker-end="url(#sql14q4-arrow)"/>
</svg>

A lookup or range scan by \`id\` ends on the leaf page that holds the row itself; there is nowhere else to go. Rows with neighbouring ids sit on the same or neighbouring pages.

📌 **Interview term: non-clustered (secondary) index** — a separate B-tree whose leaves hold the indexed columns plus a **row locator** that says where the full row lives.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="Non clustered index on sku. Its leaf holds sorted sku values, each with a row locator. The locator is the primary key in InnoDB and SQL Server clustered tables, which needs a second search, or a physical address such as a ctid or RID on a heap">
  <defs>
    <marker id="sql14q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="230" height="230" rx="12"/>
  <text class="d-text" x="135" y="60" text-anchor="middle">index on sku</text>
  <text class="d-sub" x="135" y="96" text-anchor="middle">CB-05 to id 5</text>
  <text class="d-sub" x="135" y="126" text-anchor="middle">DK-06 to id 6</text>
  <text class="d-sub" x="135" y="156" text-anchor="middle">HD-04 to id 4</text>
  <text class="d-sub" x="135" y="186" text-anchor="middle">KB-01 to id 1</text>
  <text class="d-sub" x="135" y="216" text-anchor="middle">MN-03 to id 3</text>
  <rect class="d-box-accent" x="460" y="30" width="280" height="90" rx="12"/>
  <text class="d-text" x="600" y="64" text-anchor="middle">clustered index on id</text>
  <text class="d-sub" x="600" y="90" text-anchor="middle">InnoDB, SQL Server</text>
  <rect class="d-box-muted" x="460" y="170" width="280" height="90" rx="12"/>
  <text class="d-text" x="600" y="204" text-anchor="middle">heap page and slot</text>
  <text class="d-sub" x="600" y="230" text-anchor="middle">PostgreSQL ctid, SQL Server RID</text>
  <line class="d-edge-accent" x1="254" y1="110" x2="452" y2="80" marker-end="url(#sql14q4-arrow2)"/>
  <line class="d-edge-dashed" x1="254" y1="190" x2="452" y2="214" marker-end="url(#sql14q4-arrow2)"/>
  <text class="d-sub" x="350" y="58" text-anchor="middle">second search</text>
  <text class="d-sub" x="350" y="252" text-anchor="middle">direct address</text>
</svg>

What the locator is depends on the engine, and that is the part interviewers like:

| Engine | Table storage | Non-clustered index stores | Cost of a secondary lookup |
| :--- | :--- | :--- | :--- |
| SQL Server, clustered table | clustered index | the clustering key (plus a hidden uniqueifier if it is not unique) | seek the index, then seek the clustered index ("key lookup") |
| SQL Server, heap | unordered heap | a RID: file, page, slot | seek the index, then one page read ("RID lookup") |
| MySQL InnoDB | always clustered on the primary key | the primary key columns | two B-tree searches |
| PostgreSQL | heap, always | a \`ctid\`: page, slot | seek the index, then one heap page read |
| SQLite rowid table | B-tree keyed by \`rowid\` | the \`rowid\` | seek the index, then seek the table B-tree |
| SQLite \`WITHOUT ROWID\` | B-tree keyed by the primary key | the primary key | two B-tree searches |

Sources: Microsoft, [Clustered and nonclustered indexes described](https://learn.microsoft.com/he-il/sql/relational-databases/indexes/clustered-and-nonclustered-indexes-described?view=sql-server-2017) and [Nonclustered index structures](https://msdn.microsoft.com/library/ms177484.aspx) (row locators, RID, uniqueifier), and [EF Core: SQL Server indexes](https://learn.microsoft.com/en-us/ef/core/providers/sql-server/indexes) (the primary key is clustered by default); MySQL, [Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html) (secondary records contain the primary key; \`GEN_CLUST_INDEX\` with a 6-byte row id when there is no suitable key); SQLite, [Clustered Indexes and the WITHOUT ROWID Optimization](https://www.sqlite.org/withoutrowid.html).

📌 **Interview term: row locator** — what a non-clustered index entry stores to find its row: a clustering key or a physical address.

📌 **Interview term: heap** — a table stored as unordered pages, with rows placed wherever there is room. PostgreSQL tables are always heaps; SQL Server tables without a clustered index are heaps.

## 3. See It in SQLite: Clustered Key vs Secondary Index

SQLite's ordinary tables are themselves B-trees keyed by \`rowid\`, and a column declared \`INTEGER PRIMARY KEY\` becomes that rowid. So \`products.id\` behaves like a clustering key, and the \`UNIQUE\` constraint on \`sku\` creates a secondary index (\`sqlite_autoindex_products_1\`):

~~~sql
EXPLAIN QUERY PLAN
SELECT name FROM products WHERE id = 3;

EXPLAIN QUERY PLAN
SELECT name FROM products WHERE sku = 'MN-03';

EXPLAIN QUERY PLAN
SELECT id FROM products WHERE sku = 'MN-03';
~~~

~~~text
id | parent | notused | detail
2 | 0 | 0 | SEARCH products USING INTEGER PRIMARY KEY (rowid=?)

id | parent | notused | detail
3 | 0 | 0 | SEARCH products USING INDEX sqlite_autoindex_products_1 (sku=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH products USING COVERING INDEX sqlite_autoindex_products_1 (sku=?)
~~~

1. \`USING INTEGER PRIMARY KEY (rowid=?)\`: one search in the table B-tree, and the row is right there.
2. \`USING INDEX sqlite_autoindex_products_1 (sku=?)\`: search the sku index, get the rowid, then search the table B-tree for \`name\`. Two searches, exactly like an InnoDB secondary lookup.
3. \`USING COVERING INDEX\`: asking only for \`id\` needs no second search, because the secondary index already stores the rowid as its locator. InnoDB behaves the same way for primary-key columns, which is why "the primary key is in every secondary index" is a performance fact, not trivia.

📌 **Interview term: key lookup (bookmark lookup)** — the second step of a non-clustered seek, from the index entry to the full row; SQL Server shows it as a Key Lookup or RID Lookup operator in its plans.

### WITHOUT ROWID: clustered on a composite primary key

~~~sql
CREATE TABLE stock (
  warehouse TEXT NOT NULL,
  sku       TEXT NOT NULL,
  qty       INTEGER NOT NULL,
  PRIMARY KEY (warehouse, sku)
) WITHOUT ROWID;
INSERT INTO stock VALUES ('DEL', 'MS-02', 40), ('BLR', 'MN-03', 7), ('BLR', 'CB-05', 120),
                         ('DEL', 'KB-01', 15), ('BLR', 'KB-01', 22), ('DEL', 'DK-06', 3);

EXPLAIN QUERY PLAN
SELECT sku, qty FROM stock WHERE warehouse = 'BLR' ORDER BY sku;

SELECT sku, qty FROM stock WHERE warehouse = 'BLR' ORDER BY sku;

EXPLAIN QUERY PLAN
SELECT sku, name FROM products ORDER BY name;
~~~

~~~text
id | parent | notused | detail
3 | 0 | 0 | SEARCH stock USING PRIMARY KEY (warehouse=?)

sku | qty
CB-05 | 120
KB-01 | 22
MN-03 | 7

id | parent | notused | detail
3 | 0 | 0 | SCAN products
10 | 0 | 0 | USE TEMP B-TREE FOR ORDER BY
~~~

The \`stock\` rows are stored in \`(warehouse, sku)\` order, so \`WHERE warehouse = 'BLR' ORDER BY sku\` is one \`SEARCH ... USING PRIMARY KEY\` with no sort step: the rows come out of the clustered B-tree already in order. Ordering \`products\` by \`name\`, which no index covers, needs \`USE TEMP B-TREE FOR ORDER BY\`. (\`WITHOUT ROWID\` is SQLite syntax; the table is created inside the example because PostgreSQL would reject it in the shared schema.)

## 4. PostgreSQL: Everything Is a Heap

PostgreSQL has no clustered indexes. Rows go into heap pages wherever there is room, and every index, including the primary key, is a secondary index pointing at a \`ctid\`.

📌 **Interview term: \`ctid\`** — the physical address of a row version in a PostgreSQL heap, written \`(page, slot)\`. It changes whenever the row is updated or the table is rewritten, so it is never a stable identifier.

Copy the products into a PostgreSQL table in price order and add a primary key:

~~~sql
CREATE TABLE pg_products AS SELECT * FROM products ORDER BY price_cents;
ALTER TABLE pg_products ADD PRIMARY KEY (id);
SELECT id, name, price_cents, ctid FROM pg_products ORDER BY id;
~~~

~~~text
id | name | price_cents | ctid
1 | Keyboard | 4900 | (0,3)
2 | Mouse | 1900 | (0,2)
3 | Monitor | 18900 | (0,6)
4 | Headset | 5900 | (0,4)
5 | Cable | 900 | (0,1)
6 | Dock | 12900 | (0,5)
~~~

The primary key did not move anything: rows sit in the order they were inserted (cheapest first), so id 1 is in slot 3 and id 5 in slot 1. Now run \`CLUSTER\` and then one ordinary UPDATE:

~~~sql
CREATE TABLE pg_products AS SELECT * FROM products ORDER BY price_cents;
ALTER TABLE pg_products ADD PRIMARY KEY (id);
CLUSTER pg_products USING pg_products_pkey;
UPDATE pg_products SET price_cents = 4500 WHERE id = 2;
SELECT id, name, ctid FROM pg_products ORDER BY id;
~~~

~~~text
id | name | ctid
1 | Keyboard | (0,1)
2 | Mouse | (0,7)
3 | Monitor | (0,3)
4 | Headset | (0,4)
5 | Cable | (0,5)
6 | Dock | (0,6)
~~~

\`CLUSTER\` rewrote the table in id order (ids 1 to 6 in slots 1 to 6), but the UPDATE wrote a new version of id 2 into slot 7, at the end. The documentation says it directly: "Clustering is a one-time operation: when the table is subsequently updated, the changes are not clustered", and \`CLUSTER\` takes an \`ACCESS EXCLUSIVE\` lock that blocks reads and writes while it runs ([PostgreSQL: CLUSTER](https://www.postgresql.org/docs/current/sql-cluster.html)). PostgreSQL does remember the choice, for the next bare \`CLUSTER\`:

~~~text
index_name | is_primary | marked_clustered
pg_products_pkey | t | t
~~~

📌 **Interview term: \`CLUSTER\` (PostgreSQL)** — a command that rewrites a table in the order of one index, once. It is a maintenance operation, not a kind of index.

### Why physical order matters: pages touched by a range

Two 100,000-row tables with the same data: one with rows inserted in a scrambled order, one after \`CLUSTER\` on the primary key. The query counts ids 1 to 2,000. (I turned off plain index scans so both plans use a bitmap scan, which reports how many heap pages it visited.) Scrambled:

~~~text
QUERY PLAN
Aggregate (actual rows=1 loops=1)
  ->  Bitmap Heap Scan on events (actual rows=2000 loops=1)
        Recheck Cond: ((id >= 1) AND (id <= 2000))
        Heap Blocks: exact=1001
        ->  Bitmap Index Scan on events_pkey (actual rows=2000 loops=1)
              Index Cond: ((id >= 1) AND (id <= 2000))
~~~

After \`CLUSTER\`:

~~~text
QUERY PLAN
Aggregate (actual rows=1 loops=1)
  ->  Bitmap Heap Scan on events (actual rows=2000 loops=1)
        Recheck Cond: ((id >= 1) AND (id <= 2000))
        Heap Blocks: exact=25
        ->  Bitmap Index Scan on events_pkey (actual rows=2000 loops=1)
              Index Cond: ((id >= 1) AND (id <= 2000))
~~~

Same index, same 2,000 rows: **1,001** heap pages when the rows were scattered, **25** when they were stored in id order. That is what a clustered index gives you permanently and what PostgreSQL's \`CLUSTER\` gives you until the data changes. The planner may choose other plans on other data or settings.

📌 **Interview term: correlation** — PostgreSQL's statistic (in \`pg_stats\`) for how closely the physical row order follows a column's sort order, from -1 to 1. High correlation makes index range scans cheaper, and the planner uses it.

## 5. Choosing a Clustering Key (InnoDB and SQL Server)

What makes a good clustering key, according to the MySQL and Microsoft documentation above and the mechanics shown here:

- **Narrow.** It is copied into every non-clustered index entry. A short primary key keeps every secondary index small (the MySQL manual says exactly this).
- **Ever-increasing.** New rows append at the end of the B-tree instead of splitting pages in the middle. Identity / auto-increment integers and time-ordered ids are good; random UUIDv4 values are the classic bad choice.
- **Stable.** Changing a clustering key moves the row and rewrites every secondary index entry that points to it.
- **Matches the main range query** when there is one, such as \`(customer_id, created_at)\` for "orders of this customer by date".

📌 **Interview term: page split** — when a new entry must go into a full B-tree page, the page is split in two, leaving half-empty pages and extra writes. Random keys cause splits all over the index.

## 6. Verified: Running the Code

The SQLite examples ran on sql.js 1.10.2 (SQLite 3.45.0), as the page runs them, after the schema in the question. The PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database seeded with the same schema. Outputs copied from those runs:

Clustering key, secondary index, covering lookup (SQLite):

~~~text
id | parent | notused | detail
2 | 0 | 0 | SEARCH products USING INTEGER PRIMARY KEY (rowid=?)

id | parent | notused | detail
3 | 0 | 0 | SEARCH products USING INDEX sqlite_autoindex_products_1 (sku=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH products USING COVERING INDEX sqlite_autoindex_products_1 (sku=?)
~~~

WITHOUT ROWID table (SQLite):

~~~text
id | parent | notused | detail
3 | 0 | 0 | SEARCH stock USING PRIMARY KEY (warehouse=?)

sku | qty
CB-05 | 120
KB-01 | 22
MN-03 | 7

id | parent | notused | detail
3 | 0 | 0 | SCAN products
10 | 0 | 0 | USE TEMP B-TREE FOR ORDER BY
~~~

CLUSTER, then an UPDATE (PostgreSQL 16):

~~~text
id | name | ctid
1 | Keyboard | (0,1)
2 | Mouse | (0,7)
3 | Monitor | (0,3)
4 | Headset | (0,4)
5 | Cable | (0,5)
6 | Dock | (0,6)
~~~

Heap pages for a 2,000-row range after CLUSTER (PostgreSQL 16):

~~~text
QUERY PLAN
Aggregate (actual rows=1 loops=1)
  ->  Bitmap Heap Scan on events (actual rows=2000 loops=1)
        Recheck Cond: ((id >= 1) AND (id <= 2000))
        Heap Blocks: exact=25
        ->  Bitmap Index Scan on events_pkey (actual rows=2000 loops=1)
              Index Cond: ((id >= 1) AND (id <= 2000))
~~~

## 7. Clustered vs Non-Clustered at a Glance

| | Clustered | Non-clustered |
| :--- | :--- | :--- |
| Leaf pages hold | the full rows | key + row locator |
| How many per table | at most one | many |
| Lookup by its key | one search, row is there | search, then follow the locator |
| Range scan on its key | neighbouring pages | can jump all over the table |
| Write cost | rows move on key change, page splits on random keys | one extra entry per index per row |
| PostgreSQL | does not exist (\`CLUSTER\` is a one-off reorder) | every index |

## Common Pitfalls

- **Saying "PostgreSQL's primary key is a clustered index".** It is a secondary B-tree over a heap; the \`ctid\` example above shows rows in insertion order.
- **Assuming \`CLUSTER\` is maintained.** The very next UPDATE put row 2 at slot 7. Re-run it, and remember it locks the table exclusively.
- **Picking a wide or random clustering key** in InnoDB or SQL Server, which bloats every secondary index and causes page splits.
- **Ignoring key lookups.** A non-clustered index that matches the \`WHERE\` but not the selected columns can cost one extra search per row; on many rows a scan may win, or add a covering index.
- **Treating \`ctid\` as a row id.** It changes on every update and every table rewrite.
- **Saying "a table must have a clustered index".** SQL Server heaps and every PostgreSQL table have none.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clustered:</strong> <span style="color:#f0e2c8;">A clustered index <strong style="color:#ffca28;">is</strong> the table: its leaf pages contain the whole rows, kept in key order. Rows can be physically sorted only one way, so there is <strong style="color:#ffca28;">at most one</strong> per table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Non-clustered:</strong> <span style="color:#f0e2c8;">A separate B-tree whose leaves hold the indexed key plus a <strong style="color:#ffca28;">row locator</strong>. You can have many. A lookup finds the key, then follows the locator to fetch the rest of the row.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What the locator is:</strong> <span style="color:#f0e2c8;">InnoDB: the primary key, so a secondary lookup is two B-tree searches. SQL Server: the clustering key, or a RID (file, page, slot) on a heap. PostgreSQL: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ctid</code> (page, slot), because PostgreSQL tables are heaps and <strong style="color:#ffca28;">every</strong> index is non-clustered.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it matters:</strong> <span style="color:#f0e2c8;">Range scans on the clustering key read neighbouring pages: in my PostgreSQL test a 2,000-row id range touched 1,001 table pages when rows were scattered and 25 after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CLUSTER</code>. The flip side: a wide or random clustering key (random UUID) makes every secondary index bigger and inserts split pages.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. PostgreSQL and SQLite:</strong> <span style="color:#f0e2c8;">PostgreSQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CLUSTER</code> reorders the heap once, under an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ACCESS EXCLUSIVE</code> lock, and is not maintained: my next UPDATE put the row at the end. SQLite tables are B-trees on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rowid</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WITHOUT ROWID</code> tables are clustered on their primary key.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can there be only one clustered index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is the physical order of the rows themselves, and the rows can only be stored in one order. Any other ordering has to be a separate structure pointing at those rows, which is by definition a non-clustered index.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the primary key always the clustered index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In InnoDB yes: the primary key is the clustered index; with none, the first suitable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE NOT NULL</code> index is used, else a hidden 6-byte row id (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GEN_CLUST_INDEX</code>). In SQL Server the primary key is clustered by default (when no clustered index exists yet), but you can declare it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NONCLUSTERED</code> and cluster on another column, or have none (a heap). In PostgreSQL there is no clustered index at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are random UUID primary keys a problem in InnoDB?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">New keys land at random places in the clustered B-tree, so inserts split pages all over the table instead of appending at the end, and every secondary index stores that 16-byte key as its locator. Time-ordered ids (bigint identity, UUIDv7) avoid most of that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a key lookup / bookmark lookup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SQL Server term for the second step of a non-clustered seek: going from the index entry to the clustered index to fetch columns the index does not have. Many of them are expensive; a [covering index](/interview-question/what-is-a-covering-index) with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INCLUDE</code> columns removes them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get clustered-like behaviour in PostgreSQL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CLUSTER table USING index</code> periodically (it blocks reads and writes while it runs), or rely on insertion order for append-only data such as time series, and use index-only scans with covering indexes. A lower <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fillfactor</code> helps keep updated rows on the same page.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Clustered index | Index whose leaf level is the table rows, in key order; at most one per table. |
| Non-clustered (secondary) index | Separate B-tree of key + row locator; many per table. |
| Row locator | What a secondary entry stores to find the row: a clustering key or a physical address. |
| Heap | Unordered table storage; all PostgreSQL tables, SQL Server tables without a clustered index. |
| Key lookup (bookmark lookup) | Second step of a non-clustered seek, fetching the full row. |
| \`ctid\` | PostgreSQL physical row address \`(page, slot)\`; changes on update. |
| \`CLUSTER\` (PostgreSQL) | One-time rewrite of a table in index order; not maintained. |
| Correlation | How closely physical order follows a column's order. |
| Page split | Splitting a full B-tree page to fit a new entry. |

**Conclusion:** A clustered index is the table itself stored as a B-tree in key order, so there can be only one and lookups or range scans on its key land directly on the rows; a non-clustered index is a separate B-tree of keys and row locators, and you can have many at the price of a second step per row. What the locator is decides the details: the primary key in InnoDB (two searches, and a wide key bloats every index), the clustering key or a RID in SQL Server, and a \`ctid\` in PostgreSQL, where every table is a heap, every index is secondary, and \`CLUSTER\` only reorders the table once, as the slot-7 UPDATE showed. The measured payoff of physical order, 25 heap pages instead of 1,001 for the same range, is the reason the distinction matters.`,
    examples: [
      {
        label: `SQLite rowid table: lookup by the clustering key vs by a secondary index vs a covering lookup`,
        code: `EXPLAIN QUERY PLAN
SELECT name FROM products WHERE id = 3;

EXPLAIN QUERY PLAN
SELECT name FROM products WHERE sku = 'MN-03';

EXPLAIN QUERY PLAN
SELECT id FROM products WHERE sku = 'MN-03';`,
      },
      {
        label: `SQLite WITHOUT ROWID: the table is clustered on its primary key, so a prefix search comes back sorted`,
        code: `CREATE TABLE stock (
  warehouse TEXT NOT NULL,
  sku       TEXT NOT NULL,
  qty       INTEGER NOT NULL,
  PRIMARY KEY (warehouse, sku)
) WITHOUT ROWID;
INSERT INTO stock VALUES ('DEL', 'MS-02', 40), ('BLR', 'MN-03', 7), ('BLR', 'CB-05', 120),
                         ('DEL', 'KB-01', 15), ('BLR', 'KB-01', 22), ('DEL', 'DK-06', 3);

EXPLAIN QUERY PLAN
SELECT sku, qty FROM stock WHERE warehouse = 'BLR' ORDER BY sku;

SELECT sku, qty FROM stock WHERE warehouse = 'BLR' ORDER BY sku;

EXPLAIN QUERY PLAN
SELECT sku, name FROM products ORDER BY name;`,
      },
      {
        label: `PostgreSQL: CLUSTER orders the heap by the index once; the next UPDATE moves the row to a new place`,
        code: `CREATE TABLE pg_products AS SELECT * FROM products ORDER BY price_cents;
ALTER TABLE pg_products ADD PRIMARY KEY (id);
CLUSTER pg_products USING pg_products_pkey;
UPDATE pg_products SET price_cents = 4500 WHERE id = 2;
SELECT id, name, ctid FROM pg_products ORDER BY id;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: after CLUSTER a 2,000-row range touches 25 table pages`,
        code: `CREATE TABLE events AS
SELECT g AS id, repeat('x', 60) AS payload
FROM generate_series(1, 100000) AS g
ORDER BY md5(g::text);
ALTER TABLE events ADD PRIMARY KEY (id);
CLUSTER events USING events_pkey;
VACUUM ANALYZE events;
SET enable_indexscan = off;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT count(*) FROM events WHERE id BETWEEN 1 AND 2000;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `Why does column order matter in a composite index?`,
    difficulty: "hard",
    seoDescription: `How a composite index is sorted, the leftmost-prefix rule, equality-before-range, ORDER BY direction and skip scan, shown with SQLite and PostgreSQL plans.`,
    description: `**Question presented to candidate:**
"We have an index on orders (customer_id, status, created_at). Which of these queries can use it, and how well: filter on customer_id; on customer_id and status; on status alone; on customer_id with a date range; and 'customer 10, paid, newest first'? If you could rebuild the index, how would you choose the column order?"

**What a strong answer should cover:**
- A composite B-tree index is sorted by the first column, then by the second within equal first values, and so on, like a phone book sorted by surname then first name
- The **leftmost-prefix rule**: the index can be searched on any leading prefix (\`a\`, \`a,b\`, \`a,b,c\`); skipping the first column usually means a full scan of the table or of the index
- Equality columns first, then **one** range column; columns after the first range can no longer narrow the search, they only filter
- The index order also serves \`ORDER BY\` (including backwards scans); mixed directions need matching \`ASC\`/\`DESC\` in the index
- Engine details: skip scan (Oracle, MySQL 8.0.13+, SQLite with statistics, PostgreSQL 18) can use a missing leading column only when it has few distinct values; PostgreSQL 16 cannot. "Most selective column first" is a myth when all columns are compared with \`=\`

**Clarifying questions expected:**
- Which queries run most often, and which use equality versus ranges on each column?
- Do the queries also sort or paginate, and in which direction?
- Which database and version (skip-scan support differs)?

**Code / implementation expected:** Optional — \`EXPLAIN\` output for each query shape, showing which columns become seek conditions.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  status      TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  amount      INTEGER NOT NULL
);
INSERT INTO orders VALUES (1, 10, 'paid', '2024-03-01', 120);
INSERT INTO orders VALUES (2, 11, 'paid', '2024-03-02', 75);
INSERT INTO orders VALUES (3, 10, 'refunded', '2024-03-05', 40);
INSERT INTO orders VALUES (4, 12, 'pending', '2024-03-06', 300);
INSERT INTO orders VALUES (5, 10, 'paid', '2024-03-09', 60);
INSERT INTO orders VALUES (6, 11, 'pending', '2024-03-11', 95);
INSERT INTO orders VALUES (7, 12, 'paid', '2024-03-12', 210);
INSERT INTO orders VALUES (8, 10, 'pending', '2024-03-15', 33);
INSERT INTO orders VALUES (9, 13, 'paid', '2024-03-18', 150);
INSERT INTO orders VALUES (10, 11, 'paid', '2024-03-20', 80);
CREATE INDEX orders_cust_status_created ON orders (customer_id, status, created_at);
\`\`\``,
    answer: `**Target Audience:** Developers who create multi-column indexes and want to predict which queries they help; candidates facing the classic "will this index be used?" quiz.
**Difficulty:** Hard
**Engines:** SQLite 3.45.0 through sql.js 1.10.2 (runnable plans) and PostgreSQL 16.15 (200,000-row plans). Skip-scan support in MySQL and PostgreSQL 18 is cited, not run.

> **How to read this doc:** Plain language first, then a \`📌 Interview term:\` callout with the exact vocabulary. Every plan and count is from a real run; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

A phone book is sorted by surname, and within each surname by first name. Finding "Sharma, Priya" is instant: jump to Sharma, then to Priya. Finding every "Sharma" is easy too: they are all together. But finding everyone called "Priya", whatever the surname, means reading the whole book, because the Priyas are spread across every surname.

Nothing about the book changed between those three questions. Only the **order** of the sort keys decided whether the question was easy. A composite index is exactly that phone book, and choosing its column order is choosing which questions will be easy.

If indexes in general are new, start with [What is an index and how does it speed up queries?](/interview-question/what-is-an-index-and-how-does-it-speed-up-queries).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which queries matter most, and how often? | One index should serve the most important prefixes. |
| Equality or range on each column? | Equalities go first; only one range can be searched efficiently. |
| Does the query sort or paginate? | The sort column should follow the equality columns, in the right direction. |
| Which engine and version? | Skip scan exists in MySQL 8.0.13+, SQLite (with statistics) and PostgreSQL 18, not in PostgreSQL 16. |

## 3. How a Composite Index Is Sorted

📌 **Interview term: composite (multi-column) index** — one index over several columns, sorted lexicographically: by the first column, then by the second among equal first values, and so on.

The schema creates \`orders_cust_status_created ON orders (customer_id, status, created_at)\`. Its entries, in order:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 320" role="img" aria-label="Index entries on customer_id, status, created_at in sorted order. Customer 10 entries are together and inside them paid entries are together and sorted by date. Paid entries of all customers are spread across the index">
  <rect class="d-box" x="20" y="20" width="720" height="280" rx="12"/>
  <text class="d-text" x="380" y="50" text-anchor="middle">index entries, in sorted order</text>
  <rect class="d-box-accent" x="50" y="74" width="300" height="34" rx="8"/>
  <text class="d-sub" x="200" y="96" text-anchor="middle">10, paid, 2024-03-01</text>
  <rect class="d-box-accent" x="50" y="114" width="300" height="34" rx="8"/>
  <text class="d-sub" x="200" y="136" text-anchor="middle">10, paid, 2024-03-09</text>
  <rect class="d-box" x="50" y="154" width="300" height="34" rx="8"/>
  <text class="d-sub" x="200" y="176" text-anchor="middle">10, pending, 2024-03-15</text>
  <rect class="d-box" x="50" y="194" width="300" height="34" rx="8"/>
  <text class="d-sub" x="200" y="216" text-anchor="middle">10, refunded, 2024-03-05</text>
  <rect class="d-box-muted" x="410" y="74" width="300" height="34" rx="8"/>
  <text class="d-sub" x="560" y="96" text-anchor="middle">11, paid, 2024-03-02</text>
  <rect class="d-box-muted" x="410" y="114" width="300" height="34" rx="8"/>
  <text class="d-sub" x="560" y="136" text-anchor="middle">11, paid, 2024-03-20</text>
  <rect class="d-box" x="410" y="154" width="300" height="34" rx="8"/>
  <text class="d-sub" x="560" y="176" text-anchor="middle">11, pending, 2024-03-11</text>
  <rect class="d-box-muted" x="410" y="194" width="300" height="34" rx="8"/>
  <text class="d-sub" x="560" y="216" text-anchor="middle">12, paid, 2024-03-12</text>
  <text class="d-sub" x="200" y="270" text-anchor="middle">customer 10: one block</text>
  <text class="d-sub" x="560" y="270" text-anchor="middle">paid: scattered</text>
</svg>

All of customer 10 is one block, and inside it all of \`(10, paid)\` is a smaller block already sorted by date. The \`paid\` entries of all customers are scattered, one group per customer.

## 4. The Leftmost-Prefix Rule, Shown

~~~sql
EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 10;

EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 10 AND status = 'paid';

EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 10 AND status = 'paid' AND created_at >= '2024-03-05';

EXPLAIN QUERY PLAN
SELECT id, amount FROM orders WHERE status = 'paid';

EXPLAIN QUERY PLAN
SELECT id, amount FROM orders WHERE customer_id = 10 AND created_at >= '2024-03-05';
~~~

~~~text
id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_cust_status_created (customer_id=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_cust_status_created (customer_id=? AND status=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_cust_status_created (customer_id=? AND status=? AND created_at>?)

id | parent | notused | detail
2 | 0 | 0 | SCAN orders

id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_cust_status_created (customer_id=?)
~~~

The part in parentheses is what the index was **searched** on:

| Query filters on | Seek uses | Why |
| :--- | :--- | :--- |
| \`customer_id\` | \`customer_id=?\` | first column: a prefix |
| \`customer_id\`, \`status\` | \`customer_id=? AND status=?\` | first two columns |
| \`customer_id\`, \`status\`, date range | all three | equalities, then the range on the last column |
| \`status\` only | nothing: \`SCAN orders\` | first column missing |
| \`customer_id\`, date range | \`customer_id=?\` only | \`status\` is skipped, so the date cannot narrow the search; it is checked row by row |

(SQLite prints the range \`>=\` as \`created_at>?\`; the comparison itself is \`>=\`.) The first three plans say \`COVERING INDEX\` because \`id\` is the rowid, which every SQLite index stores; see [clustered vs non-clustered](/interview-question/what-is-the-difference-between-a-clustered-and-non-clustered-index).

📌 **Interview term: leftmost-prefix rule** — a composite index can be searched using any leading run of its columns, \`(a)\`, \`(a, b)\`, \`(a, b, c)\`, but not on \`(b)\` or \`(c)\` alone, and not on \`(a, c)\` beyond the \`a\` part.

📌 **Interview term: index seek condition vs filter** — a seek condition narrows the range of index entries read (PostgreSQL \`Index Cond\`); a filter is checked on each entry or row after it has been read (\`Filter\`). Only seek conditions save reads.

The order of conditions in the \`WHERE\` clause is irrelevant. With the index rebuilt as \`(status, customer_id)\`:

~~~sql
CREATE INDEX orders_status_cust ON orders (status, customer_id);
DROP INDEX orders_cust_status_created;

EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 10;

EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE status = 'paid' AND customer_id = 10;

EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 10 AND status = 'paid';
~~~

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN orders USING COVERING INDEX orders_status_cust

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_status_cust (status=? AND customer_id=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_status_cust (status=? AND customer_id=?)
~~~

Now \`customer_id\` alone is the query that cannot seek (it scans the whole index, which here is still cheaper than the table because the index covers \`id\`), and both spellings of the two-column filter produce the same seek.

PostgreSQL 16 behaves the same way at scale. On 200,000 orders with only \`(customer_id, created_at)\` indexed, a filter on \`created_at\` alone:

~~~text
QUERY PLAN
Seq Scan on big_orders (actual rows=546 loops=1)
  Filter: (created_at = '2024-12-01'::date)
  Rows Removed by Filter: 199454
~~~

A Seq Scan that discards 199,454 rows: the index is no help without its first column.

## 5. Equality First, Then One Range

📌 **Interview term: equality-then-range** — the guideline to put columns compared with \`=\` (or \`IN\`) before the single column compared with \`<\`, \`>\`, \`BETWEEN\` or used for sorting. After the first range column, later columns cannot narrow the seek.

Take \`WHERE customer_id = 42 AND created_at >= '2024-12-01'\` on 200,000 orders (2,000 customers, dates spread over 2024). Both possible two-column indexes contain the same entries; the question is how far apart the matches are:

~~~sql
SELECT relname AS index_name, relpages AS index_pages,
       CASE relname
         WHEN 'big_orders_cust_created' THEN
           (SELECT count(*) FROM big_orders WHERE customer_id = 42 AND created_at >= DATE '2024-12-01')
         ELSE
           (SELECT count(*) FROM big_orders WHERE created_at >= DATE '2024-12-01')
       END AS entries_in_scanned_range
FROM pg_class
WHERE relname IN ('big_orders_cust_created', 'big_orders_created_cust')
ORDER BY relname;
~~~

~~~text
index_name | index_pages | entries_in_scanned_range
big_orders_created_cust | 551 | 16926
big_orders_cust_created | 551 | 8
~~~

The two indexes are the same size (551 pages). With \`(customer_id, created_at)\` the engine seeks to \`(42, 2024-12-01)\` and reads 8 consecutive entries. With \`(created_at, customer_id)\` the seek can only use the date: it starts at \`2024-12-01\` and walks every entry to the end of the year, 16,926 of them, keeping those for customer 42.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="Equality then range: index on customer_id then created_at puts the 8 matching entries next to each other. Range then equality: index on created_at then customer_id must walk 16926 entries for the whole December range and filter customer 42">
  <rect class="d-box-accent" x="20" y="30" width="330" height="200" rx="12"/>
  <text class="d-text" x="185" y="66" text-anchor="middle">(customer_id, created_at)</text>
  <text class="d-sub" x="185" y="100" text-anchor="middle">seek to 42 and 2024-12-01</text>
  <text class="d-sub" x="185" y="134" text-anchor="middle">read until customer 43</text>
  <text class="d-text" x="185" y="186" text-anchor="middle">8 entries</text>
  <rect class="d-box-muted" x="410" y="30" width="330" height="200" rx="12"/>
  <text class="d-text" x="575" y="66" text-anchor="middle">(created_at, customer_id)</text>
  <text class="d-sub" x="575" y="100" text-anchor="middle">seek to 2024-12-01</text>
  <text class="d-sub" x="575" y="134" text-anchor="middle">read to the end, keep 42</text>
  <text class="d-text" x="575" y="186" text-anchor="middle">16926 entries</text>
</svg>

The plans confirm it. \`(customer_id, created_at)\`:

~~~text
QUERY PLAN
Bitmap Heap Scan on big_orders (actual rows=8 loops=1)
  Recheck Cond: ((customer_id = 42) AND (created_at >= '2024-12-01'::date))
  Heap Blocks: exact=8
  Buffers: shared hit=8 read=3
  ->  Bitmap Index Scan on big_orders_cust_created (actual rows=8 loops=1)
        Index Cond: ((customer_id = 42) AND (created_at >= '2024-12-01'::date))
        Buffers: shared read=3
Planning:
  Buffers: shared hit=23
~~~

\`(created_at, customer_id)\`:

~~~text
QUERY PLAN
Index Scan using big_orders_created_cust on big_orders (actual rows=8 loops=1)
  Index Cond: ((created_at >= '2024-12-01'::date) AND (customer_id = 42))
  Buffers: shared hit=8 read=49
Planning:
  Buffers: shared hit=23
~~~

Both list both columns in \`Index Cond\` and both return 8 rows, so the plan text alone hides the difference; the \`Buffers\` lines show it. The good order touched 11 buffers in total: 3 index pages (\`Bitmap Index Scan ... shared read=3\`) plus the 8 heap pages holding the rows. The bad order touched 57 (\`hit=8 read=49\`): the same 8 heap pages plus about 49 index pages walked through December. On a busier cache the hit/read split will differ, but the totals follow the entry counts above. The planner may choose other plans on other data.

## 6. Column Order and ORDER BY

~~~sql
EXPLAIN QUERY PLAN
SELECT id, created_at, amount FROM orders
WHERE customer_id = 10 AND status = 'paid'
ORDER BY created_at DESC;

EXPLAIN QUERY PLAN
SELECT id, created_at, amount FROM orders
WHERE customer_id = 10
ORDER BY created_at DESC;

SELECT id, created_at, amount FROM orders
WHERE customer_id = 10 AND status = 'paid'
ORDER BY created_at DESC;
~~~

~~~text
id | parent | notused | detail
4 | 0 | 0 | SEARCH orders USING INDEX orders_cust_status_created (customer_id=? AND status=?)

id | parent | notused | detail
4 | 0 | 0 | SEARCH orders USING INDEX orders_cust_status_created (customer_id=?)
15 | 0 | 0 | USE TEMP B-TREE FOR ORDER BY

id | created_at | amount
5 | 2024-03-09 | 60
1 | 2024-03-01 | 120
~~~

With \`customer_id\` and \`status\` fixed, the entries are already in \`created_at\` order, and reading them backwards gives \`DESC\` for free: no sort step. With only \`customer_id\` fixed, the dates are sorted **within each status**, not overall, so SQLite needs \`USE TEMP B-TREE FOR ORDER BY\`. This is why "newest orders of a customer" pagination wants \`(customer_id, created_at)\`; see [How do you paginate efficiently in SQL?](/interview-question/how-do-you-paginate-efficiently-in-sql).

Mixed directions are the other trap. \`ORDER BY status, created_at DESC\` cannot come from an all-ascending index read in either direction:

~~~sql
EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 10 ORDER BY status, created_at DESC;

CREATE INDEX orders_cust_status_created_desc ON orders (customer_id, status, created_at DESC);

EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 10 ORDER BY status, created_at DESC;
~~~

~~~text
id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_cust_status_created (customer_id=?)
19 | 0 | 0 | USE TEMP B-TREE FOR RIGHT PART OF ORDER BY

id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_cust_status_created_desc (customer_id=?)
~~~

(SQLite.) \`USE TEMP B-TREE FOR RIGHT PART OF ORDER BY\` disappears once the index declares \`created_at DESC\`. PostgreSQL supports the same \`DESC\` index columns.

## 7. Skip Scan: When the First Column Can Be Missing

📌 **Interview term: skip scan** — a plan that treats a missing leading column as "for each distinct value of it", seeking once per value. It only pays when the leading column has few distinct values.

SQLite does it when it has statistics showing the leading column is low-cardinality. Here the table gets about 2,000 rows with three statuses, the index is \`(status, customer_id)\`, and \`ANALYZE\` is run:

~~~sql
WITH RECURSIVE n(i) AS (SELECT 11 UNION ALL SELECT i + 1 FROM n WHERE i < 2000)
INSERT INTO orders (id, customer_id, status, created_at, amount)
SELECT i, 10 + i % 200, CASE i % 3 WHEN 0 THEN 'paid' WHEN 1 THEN 'pending' ELSE 'refunded' END,
       '2024-04-01', i % 90
FROM n;
DROP INDEX orders_cust_status_created;
CREATE INDEX orders_status_cust ON orders (status, customer_id);
ANALYZE;

EXPLAIN QUERY PLAN
SELECT id, amount FROM orders WHERE customer_id = 10;
~~~

~~~text
id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_status_cust (ANY(status) AND customer_id=?)
~~~

\`ANY(status) AND customer_id=?\` is SQLite's skip scan: three seeks, one per status, instead of a table scan. Without \`ANALYZE\` (section 4) the same shape was a full scan.

Other engines: MySQL added skip scan in 8.0.13, shown as \`Using index for skip scan\` in EXPLAIN ([MySQL worklog 11322](https://dev.mysql.com/worklog/task/?id=11322), [MySQL manual: range optimization](https://dev.mysql.com/doc/refman/8.0/en/range-optimization.html)); PostgreSQL added B-tree skip scan in version 18, released 2025-09-25 ([PostgreSQL 18 release notes](https://www.postgresql.org/docs/release/18/)). PostgreSQL 16, used here, does not have it, as the Seq Scan in section 4 shows. Skip scan is a rescue for a low-cardinality first column, not a reason to ignore column order.

## 8. Verified: Running the Code

The SQLite examples ran on sql.js 1.10.2 (SQLite 3.45.0), as the page runs them, after the schema in the question. The PostgreSQL example ran on PostgreSQL 16.15 in a scratch database seeded with the same schema. Outputs copied from those runs:

Leftmost prefix (SQLite):

~~~text
id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_cust_status_created (customer_id=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_cust_status_created (customer_id=? AND status=?)

id | parent | notused | detail
2 | 0 | 0 | SEARCH orders USING COVERING INDEX orders_cust_status_created (customer_id=? AND status=? AND created_at>?)

id | parent | notused | detail
2 | 0 | 0 | SCAN orders

id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_cust_status_created (customer_id=?)
~~~

ORDER BY from the index (SQLite):

~~~text
id | parent | notused | detail
4 | 0 | 0 | SEARCH orders USING INDEX orders_cust_status_created (customer_id=? AND status=?)

id | parent | notused | detail
4 | 0 | 0 | SEARCH orders USING INDEX orders_cust_status_created (customer_id=?)
15 | 0 | 0 | USE TEMP B-TREE FOR ORDER BY

id | created_at | amount
5 | 2024-03-09 | 60
1 | 2024-03-01 | 120
~~~

Skip scan after ANALYZE (SQLite):

~~~text
id | parent | notused | detail
3 | 0 | 0 | SEARCH orders USING INDEX orders_status_cust (ANY(status) AND customer_id=?)
~~~

Entries in the scanned range per column order (PostgreSQL 16):

~~~text
index_name | index_pages | entries_in_scanned_range
big_orders_created_cust | 551 | 16926
big_orders_cust_created | 551 | 8
~~~

The other plans in sections 4 to 6 were produced by the same runner on the same engines.

## 9. A Recipe for Choosing the Order

1. Write down the important queries with their \`WHERE\`, \`ORDER BY\` and frequency.
2. Columns compared with \`=\` (or a short \`IN\` list) go first. Among them, pick the one that the **most queries** filter on as the leading column, so the most queries share the prefix.
3. Then the **one** column used for a range or for sorting.
4. Then, optionally, columns that are only selected, to make it [covering](/interview-question/what-is-a-covering-index) (or use \`INCLUDE\`).
5. Check for redundancy: \`(a, b)\` makes a separate \`(a)\` unnecessary.
6. Verify each important query with \`EXPLAIN\` on realistic data, looking for the columns in the seek condition ([How do you read an EXPLAIN query plan?](/interview-question/how-do-you-read-an-explain-query-plan)).

## Common Pitfalls

- **Putting the range column first** (\`(created_at, customer_id)\` for "customer X since date Y"), turning an 8-entry seek into a 16,926-entry walk.
- **Expecting \`(a, b, c)\` to serve a query on \`b\` or \`c\`** in PostgreSQL 16 or other engines without skip scan.
- **Following "most selective column first" blindly.** With all equalities the order hardly matters for that query; prefix sharing and the range column decide.
- **Creating \`(a)\`, \`(a, b)\` and \`(a, b, c)\` separately.** The longest one serves all three prefixes; the others only cost writes.
- **Forgetting sort direction.** \`ORDER BY x, y DESC\` needs \`(x, y DESC)\`; otherwise there is an extra sort step.
- **Reading only the plan's node name.** Both bad and good orders show "Index Scan"; check what is in \`Index Cond\`, and the rows or buffers read.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. How it is sorted:</strong> <span style="color:#f0e2c8;">A composite B-tree on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(customer_id, status, created_at)</code> is sorted by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">customer_id</code>, then by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> inside each customer, then by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">created_at</code> inside each status. Like a phone book: surname, then first name.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Leftmost prefix:</strong> <span style="color:#f0e2c8;">It can seek on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">customer_id</code>, on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">customer_id + status</code>, or on all three. A query on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> alone finds paid orders scattered through every customer block, so it usually scans: SQLite showed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SCAN orders</code>, PostgreSQL 16 a Seq Scan.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Equality first, then one range:</strong> <span style="color:#f0e2c8;">After the first range column the search cannot narrow further. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">customer_id = 42 AND created_at &gt;= '2024-12-01'</code> on 200,000 orders, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(customer_id, created_at)</code> has the 8 matches side by side; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(created_at, customer_id)</code> must walk 16,926 entries and filter.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sorting:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE customer_id = 10 AND status = 'paid' ORDER BY created_at DESC</code> needs no sort step: the index is read backwards. Skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> and SQLite adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">USE TEMP B-TREE FOR ORDER BY</code>. Mixed directions need a matching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DESC</code> column in the index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing the order:</strong> <span style="color:#f0e2c8;">List the important queries; put columns compared with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code> first (the order among them matters little for those queries), the range or sort column last, and pick the leading column so the most queries share the prefix. Skip scan (MySQL 8.0.13+, SQLite with ANALYZE, PostgreSQL 18) only rescues a low-cardinality leading column.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should the most selective column always go first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for equality lookups: with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a = ? AND b = ?</code> the engine seeks straight to the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b)</code> pair whichever is first. What decides the order is which <strong style="color:#ffca28;">prefixes</strong> other queries need and where the range column is. Selectivity matters when choosing between indexes, not within one used with all equalities.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the order of conditions in the WHERE clause matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE status = 'paid' AND customer_id = 10</code> and the reverse produce the same plan; in my SQLite run both became <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(status=? AND customer_id=?)</code> on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(status, customer_id)</code> index. The planner matches conditions to index columns, not to the text order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When can an index be used without its first column?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With skip scan: the engine loops over each distinct value of the first column and seeks inside each. MySQL has it since 8.0.13 (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Using index for skip scan</code>), SQLite after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ANALYZE</code> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ANY(status)</code> in the plan), PostgreSQL since 18. It pays only when the first column has few distinct values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do I need both (a, b) and (a)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b)</code> already serves queries on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> alone, so a separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a)</code> index is usually redundant. You may need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(b)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(b, a)</code> for queries on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>. Each extra index costs writes, so consolidate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to covering indexes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Adding the selected columns at the end (or with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INCLUDE</code> in PostgreSQL and SQL Server) lets the query be answered from the index alone, which is why SQLite reported <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">USING COVERING INDEX</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT id ...</code>. They go after the search columns, because they are not searched on. See [What is a covering index?](/interview-question/what-is-a-covering-index).</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Composite index | One index over several columns, sorted by the first, then the second, and so on. |
| Leftmost-prefix rule | Only leading runs of the index columns can be used for a seek. |
| Seek condition vs filter | Narrows the entries read vs checked after reading; only the first saves work. |
| Equality-then-range | Put \`=\` columns first and a single range or sort column after them. |
| Skip scan | Seeking once per distinct value of a missing low-cardinality leading column. |

**Conclusion:** A composite index is sorted by its first column, then its second, then its third, so it answers fast only the questions that fix a leading run of those columns: \`(customer_id, status, created_at)\` seeks on customer, customer plus status, or all three, and SQLite and PostgreSQL 16 both fall back to a scan for status alone. Put equality columns first and a single range or sort column last: on 200,000 orders that is the difference between reading 8 adjacent entries and walking 16,926. The same order lets the index deliver \`ORDER BY\` without a sort, if the directions match. Skip scan in SQLite, MySQL 8.0.13+ and PostgreSQL 18 softens the rule for a low-cardinality first column, but the recipe stays the same: list the queries, share prefixes, and confirm with \`EXPLAIN\`.`,
    examples: [
      {
        label: `Leftmost prefix: which WHERE clauses become seek conditions on (customer_id, status, created_at)`,
        code: `EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 10;

EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 10 AND status = 'paid';

EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 10 AND status = 'paid' AND created_at >= '2024-03-05';

EXPLAIN QUERY PLAN
SELECT id, amount FROM orders WHERE status = 'paid';

EXPLAIN QUERY PLAN
SELECT id, amount FROM orders WHERE customer_id = 10 AND created_at >= '2024-03-05';`,
      },
      {
        label: `The index order also serves ORDER BY, but only when the columns before it are fixed by equality`,
        code: `EXPLAIN QUERY PLAN
SELECT id, created_at, amount FROM orders
WHERE customer_id = 10 AND status = 'paid'
ORDER BY created_at DESC;

EXPLAIN QUERY PLAN
SELECT id, created_at, amount FROM orders
WHERE customer_id = 10
ORDER BY created_at DESC;

SELECT id, created_at, amount FROM orders
WHERE customer_id = 10 AND status = 'paid'
ORDER BY created_at DESC;`,
      },
      {
        label: `SQLite skip-scan: after ANALYZE, a missing low-cardinality first column can be skipped`,
        code: `WITH RECURSIVE n(i) AS (SELECT 11 UNION ALL SELECT i + 1 FROM n WHERE i < 2000)
INSERT INTO orders (id, customer_id, status, created_at, amount)
SELECT i, 10 + i % 200, CASE i % 3 WHEN 0 THEN 'paid' WHEN 1 THEN 'pending' ELSE 'refunded' END,
       '2024-04-01', i % 90
FROM n;
DROP INDEX orders_cust_status_created;
CREATE INDEX orders_status_cust ON orders (status, customer_id);
ANALYZE;

EXPLAIN QUERY PLAN
SELECT id, amount FROM orders WHERE customer_id = 10;`,
      },
      {
        label: `PostgreSQL, 200,000 orders: index entries inside the scanned range for each column order`,
        code: `CREATE TABLE big_orders AS
SELECT g AS id,
       1 + g % 2000 AS customer_id,
       DATE '2024-01-01' + (g % 366) AS created_at,
       (g * 37) % 500 AS amount
FROM generate_series(1, 200000) AS g;
CREATE INDEX big_orders_cust_created ON big_orders (customer_id, created_at);
CREATE INDEX big_orders_created_cust ON big_orders (created_at, customer_id);
VACUUM ANALYZE big_orders;

SELECT relname AS index_name, relpages AS index_pages,
       CASE relname
         WHEN 'big_orders_cust_created' THEN
           (SELECT count(*) FROM big_orders WHERE customer_id = 42 AND created_at >= DATE '2024-12-01')
         ELSE
           (SELECT count(*) FROM big_orders WHERE created_at >= DATE '2024-12-01')
       END AS entries_in_scanned_range
FROM pg_class
WHERE relname IN ('big_orders_cust_created', 'big_orders_created_cust')
ORDER BY relname;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
