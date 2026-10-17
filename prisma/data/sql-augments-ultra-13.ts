/**
 * SQL ULTRA — batch 13: Concurrency and locking (deadlocks, serializable
 * isolation pitfalls, FOR UPDATE / NOWAIT / SKIP LOCKED, SKIP LOCKED job
 * queues, what an UPSERT is). Every example was run by
 * scripts/verify-sql-examples.ts (sql.js 1.10.2 like the page, PostgreSQL 16
 * for postgres examples); quoted output is that run's output. Two-session
 * timelines were run with two psql sessions on PostgreSQL 16.15.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `What is a deadlock and how do you prevent it?`,
    difficulty: "hard",
    seoDescription: `What a SQL deadlock is, how PostgreSQL, MySQL and SQL Server detect and break one, and how lock ordering and short transactions prevent it.`,
    description: `**Question presented to candidate:**
"Two of our payment workers sometimes fail with a 'deadlock detected' error. What is a deadlock, how does the database find and break one, and what would you change in the code so it stops happening?"

**What a strong answer should cover:**
- Definition: two or more transactions each hold a lock the other needs, so every one of them waits forever; a cycle in the waits-for graph
- The difference from ordinary blocking: a lock wait ends when the holder commits, a deadlock never ends on its own
- Detection: PostgreSQL runs its deadlock check after \`deadlock_timeout\` (default 1s) and aborts one transaction with SQLSTATE \`40P01\`; InnoDB detects immediately by default (error 1213); SQL Server picks a victim with error 1205
- Prevention: lock rows in one consistent order (sort the keys, \`ORDER BY id FOR UPDATE\`), keep transactions short, take the strongest lock first, touch fewer rows (good indexes)
- Handling: deadlocks can never be ruled out completely, so the application retries the whole transaction on \`40P01\`; \`lock_timeout\` bounds ordinary waits
- Diagnosis: the error DETAIL, the server log, \`pg_locks\` and \`pg_blocking_pids()\`

**Clarifying questions expected:**
- Which database engine, and do we have the full error text or server log for one occurrence?
- Do the two workers touch the same rows in a different order (for example a transfer A to B and a transfer B to A)?

**Code / implementation expected:** Yes — reproduce the deadlock with two sessions, then fix it by locking rows in a consistent order.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  owner TEXT NOT NULL,
  balance NUMERIC NOT NULL
);
INSERT INTO accounts (id, owner, balance) VALUES
  (1, 'Alice', 500),
  (2, 'Bob',   300),
  (3, 'Carol', 200),
  (4, 'Dev',   150);
CREATE TABLE transfers (
  id INTEGER PRIMARY KEY,
  from_id INTEGER NOT NULL,
  to_id INTEGER NOT NULL,
  amount NUMERIC NOT NULL
);
INSERT INTO transfers (id, from_id, to_id, amount) VALUES
  (101, 1, 2, 50),
  (102, 2, 1, 20),
  (103, 3, 1, 10),
  (104, 4, 3, 25),
  (105, 2, 4, 15);
CREATE TABLE lock_waits (
  waiter TEXT NOT NULL,
  holder TEXT NOT NULL,
  resource TEXT NOT NULL
);
INSERT INTO lock_waits (waiter, holder, resource) VALUES
  ('T1', 'T2', 'accounts row 2'),
  ('T2', 'T1', 'accounts row 1'),
  ('T3', 'T1', 'accounts row 1'),
  ('T4', 'T5', 'accounts row 4'),
  ('T5', 'T6', 'accounts row 3');
\`\`\``,
    answer: `**Target Audience:** Developers who have seen \`deadlock detected\` in a log and want to understand it from zero; candidates who need the precise detection and prevention story for an interview.
**Difficulty:** Hard
**Engines:** PostgreSQL 16.15 (two real \`psql\` sessions for the deadlock itself, the verifier for the plan and \`pg_locks\` examples) and SQLite 3.45 (sql.js 1.10.2 for the runnable examples, Python sqlite3 3.45.1 for the two-connection check). MySQL and SQL Server facts are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result, plan and error message below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Two people are cooking in a small kitchen with one knife and one cutting board. Asha grabs the knife and reaches for the board. At the same moment Ben grabs the board and reaches for the knife. Asha will not put the knife down until she has the board; Ben will not put the board down until he has the knife. Both stand there politely, forever.

Nobody did anything wrong on their own. The problem is the *order*: each grabbed one thing and then waited for the thing the other one holds. If the house rule were "always take the knife first", Ben would simply wait for Asha to finish, and then cook.

A database is that kitchen. Rows are the knife and the board, transactions are the cooks, and the house rule is the fix this page is about.

## 2. Locks and Waiting, the Short Version

When a transaction changes a row (UPDATE, DELETE, or \`SELECT ... FOR UPDATE\`), the database puts a lock on that row and keeps it **until the transaction ends** with COMMIT or ROLLBACK. Another transaction that wants to change the same row has to wait. Plain reads do not wait in PostgreSQL: they see the last committed version of the row.

📌 **Interview term: row lock** — a lock on one row taken by a write or a locking read, held until the end of the transaction. Its exact modes are covered in [FOR UPDATE vs FOR UPDATE NOWAIT vs FOR UPDATE SKIP LOCKED — which to use when?](/interview-question/for-update-vs-for-update-nowait-vs-for-update-skip-locked-which-to-use-when).

You can see the locks a transaction holds. After one UPDATE, PostgreSQL 16 listed these for the session (the row lock itself lives in the row header, not in \`pg_locks\`; what you see is the table and index lock plus the transaction id that other sessions wait on):

~~~sql
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 1;
SELECT locktype, relation::regclass AS relation, mode, granted
FROM pg_locks
WHERE pid = pg_backend_pid()
  AND locktype IN ('relation', 'transactionid')
  AND (relation IS NULL OR relation::regclass::text LIKE 'accounts%')
ORDER BY locktype, relation::regclass::text;
ROLLBACK;
~~~

~~~text
locktype | relation | mode | granted
relation | accounts | RowExclusiveLock | t
relation | accounts_pkey | RowExclusiveLock | t
transactionid | NULL | ExclusiveLock | t
~~~

📌 **Interview term: lock wait (blocking)** — a transaction waiting for a lock that another transaction holds. It ends by itself when the holder commits or rolls back. Waiting is normal; it is how the database keeps two writers from overwriting each other.

## 3. What a Deadlock Is

A deadlock is waiting that can *never* end, because the waits form a circle.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Deadlock cycle: transaction A holds row 1 and waits for row 2, transaction B holds row 2 and waits for row 1">
  <defs>
    <marker id="sql13q1-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="200" height="70" rx="8"/>
  <text class="d-text" x="140" y="70" text-anchor="middle">Transaction A</text>
  <text class="d-sub" x="140" y="94" text-anchor="middle">transfer 1 to 2</text>
  <rect class="d-box-accent" x="520" y="40" width="200" height="70" rx="8"/>
  <text class="d-text" x="620" y="70" text-anchor="middle">Transaction B</text>
  <text class="d-sub" x="620" y="94" text-anchor="middle">transfer 2 to 1</text>
  <rect class="d-box" x="40" y="230" width="200" height="60" rx="8"/>
  <text class="d-text" x="140" y="266" text-anchor="middle">accounts row 1</text>
  <rect class="d-box" x="520" y="230" width="200" height="60" rx="8"/>
  <text class="d-text" x="620" y="266" text-anchor="middle">accounts row 2</text>
  <path class="d-edge" d="M 140 226 L 140 116" marker-end="url(#sql13q1-a)"/>
  <text class="d-sub" x="90" y="175" text-anchor="middle">held by A</text>
  <path class="d-edge" d="M 620 226 L 620 116" marker-end="url(#sql13q1-a)"/>
  <text class="d-sub" x="670" y="175" text-anchor="middle">held by B</text>
  <path class="d-edge-accent" d="M 242 100 L 516 236" marker-end="url(#sql13q1-a)"/>
  <text class="d-accent" x="330" y="122" text-anchor="middle">A waits</text>
  <path class="d-edge-accent" d="M 518 100 L 244 236" marker-end="url(#sql13q1-a)"/>
  <text class="d-accent" x="430" y="122" text-anchor="middle">B waits</text>
</svg>

Transaction A holds row 1 and waits for row 2. Transaction B holds row 2 and waits for row 1. Each is waiting for the other to finish, and neither can finish.

📌 **Interview term: deadlock** — two or more transactions that each wait for a lock held by another member of the group, so that none of them can proceed. Also called a *deadly embrace*.

📌 **Interview term: waits-for graph** — a graph where each transaction is a node and an arrow \`A -> B\` means "A waits for a lock B holds". A deadlock is exactly a **cycle** in this graph. Plain blocking is a chain without a cycle.

Here is that idea as data. The table \`lock_waits\` is a snapshot of who waits for whom. T3 waits for T1 and T4 waits for T5, but only T1 and T2 wait for *each other*. A recursive walk (see [How do recursive CTEs work?](/interview-question/how-do-recursive-ctes-work)) that follows the arrows and stops when it comes back to where it started finds exactly that cycle:

~~~sql
WITH RECURSIVE chain(start, current, path, depth) AS (
  SELECT waiter, holder, waiter || ' -> ' || holder, 1
  FROM lock_waits
  UNION ALL
  SELECT c.start, w.holder, c.path || ' -> ' || w.holder, c.depth + 1
  FROM chain AS c
  JOIN lock_waits AS w ON w.waiter = c.current
  WHERE c.current <> c.start AND c.depth < 10
)
SELECT start AS txn, path AS cycle
FROM chain
WHERE current = start
ORDER BY txn;
~~~

~~~text
txn | cycle
T1 | T1 -> T2 -> T1
T2 | T2 -> T1 -> T2
~~~

T3, T4 and T5 are blocked but not deadlocked: as soon as T1 or T6 finishes, they move on. A real deadlock detector does the same walk over the lock manager's internal state.

## 4. Watching One Happen in PostgreSQL

Two \`psql\` sessions against a scratch PostgreSQL 16.15 database, both running a money transfer, in opposite directions. Session A moves 50 from account 1 to account 2; session B moves 20 from account 2 to account 1. Each debits first, then credits.

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` | \`BEGIN;\` |
| 2 | \`UPDATE accounts SET balance = balance - 50 WHERE id = 1;\` locks row 1 | |
| 3 | | \`UPDATE accounts SET balance = balance - 20 WHERE id = 2;\` locks row 2 |
| 4 | \`UPDATE accounts SET balance = balance + 50 WHERE id = 2;\` **waits** for B | |
| 5 | | \`UPDATE accounts SET balance = balance + 20 WHERE id = 1;\` waits for A: cycle |
| 6 | (about 1 second later) A is unblocked | \`ERROR: deadlock detected\` |
| 7 | \`COMMIT;\` | \`COMMIT;\` (actually a rollback: the transaction is aborted) |

Session B printed this (process numbers replaced with \`<pid A>\` and \`<pid B>\`, transaction ids with \`<xid>\`):

~~~text
ERROR:  deadlock detected
DETAIL:  Process <pid B> waits for ShareLock on transaction <xid A>; blocked by process <pid A>.
Process <pid A> waits for ShareLock on transaction <xid B>; blocked by process <pid B>.
HINT:  See server log for query details.
CONTEXT:  while updating tuple (0,1) in relation "accounts"
~~~

and after both COMMITs the balances showed only A's transfer:

~~~text
id | balance
1 | 450
2 | 350
3 | 200
~~~

Three details worth saying out loud in an interview:

- The DETAIL lines *are* the waits-for graph: B waits for A, A waits for B.
- "ShareLock on transaction" is how PostgreSQL implements a row wait: the waiter waits for the holder's transaction id to finish.
- Only B's work was lost. A continued the moment B was aborted. With \`\\set VERBOSITY verbose\` the same error showed its SQLSTATE: \`ERROR:  40P01: deadlock detected\`.

📌 **Interview term: deadlock victim** — the transaction the database aborts to break the cycle. Its locks are released, so the others can continue. Its whole transaction is rolled back, not only the last statement.

📌 **Interview term: SQLSTATE 40P01** — PostgreSQL error code \`deadlock_detected\`. Class \`40\` means "transaction rollback": the right reaction is to retry the transaction.

## 5. How the Engine Finds and Breaks the Cycle

Checking for cycles costs effort, so PostgreSQL does not do it on every wait. A waiting session sleeps; if it is still waiting after \`deadlock_timeout\`, it runs the check. If it finds a cycle that includes itself, it aborts itself. The defaults in PostgreSQL 16.15 (boot values from \`pg_settings\`):

~~~sql
SELECT name, boot_val AS default_value, unit
FROM pg_settings
WHERE name IN ('deadlock_timeout', 'lock_timeout', 'log_lock_waits')
ORDER BY name;
~~~

~~~text
name | default_value | unit
deadlock_timeout | 1000 | ms
lock_timeout | 0 | ms
log_lock_waits | off | NULL
~~~

So a deadlock costs about one second of waiting before the victim gets its error, \`lock_timeout\` is off (wait forever for an ordinary lock), and lock waits are not logged unless you turn \`log_lock_waits\` on (it logs any wait longer than \`deadlock_timeout\`).

📌 **Interview term: deadlock_timeout** — PostgreSQL setting: how long a session waits on a lock before it checks for a deadlock. Default \`1s\`. It is not a limit on waiting; for that, use \`lock_timeout\`.

Other engines differ, which is a common follow-up:

| Engine | When it detects | Victim | Error |
| :--- | :--- | :--- | :--- |
| PostgreSQL 16 | after \`deadlock_timeout\` (1s), checked by the waiting session (run here) | the session that found the cycle | \`40P01 deadlock detected\` |
| MySQL InnoDB | immediately, when detection is on (the default); it prefers to roll back the smaller transaction ([MySQL manual, deadlock detection](https://dev.mysql.com/doc/refman/5.7/en/innodb-deadlock-detection.html)) | the "smaller" transaction (fewer rows changed) | 1213 \`Deadlock found when trying to get lock\` ([Netdata guide](https://www.netdata.cloud/guides/mysql/mysql-deadlock-found/)) |
| SQL Server | a background lock monitor, about every 5 seconds by default ([Netdata guide](https://www.netdata.cloud/guides/microsoft-sql-server/microsoft-sql-server-error-1205-deadlock-victim/)) | lowest \`DEADLOCK_PRIORITY\`, then cheapest to roll back ([Redgate Simple Talk](https://www.red-gate.com/simple-talk/sql/performance/sql-server-deadlocks-by-example/)) | 1205 \`chosen as the deadlock victim\` |
| SQLite | no row locks; one writer at a time (run here, see section 8) | the connection that would deadlock gets \`database is locked\` at once | \`SQLITE_BUSY\` |

## 6. Prevention 1: Lock in One Consistent Order

The cycle in section 4 exists only because A locked 1 then 2 while B locked 2 then 1. Make both lock the lower id first and the cycle cannot form: whoever gets row 1 first also gets row 2, and the other waits in line.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Ordered locking: both transactions ask for row 1 first, so B queues behind A and no cycle can form">
  <defs>
    <marker id="sql13q1-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="40" width="180" height="70" rx="8"/>
  <text class="d-text" x="120" y="70" text-anchor="middle">Transaction A</text>
  <text class="d-sub" x="120" y="94" text-anchor="middle">locks 1, then 2</text>
  <rect class="d-box" x="290" y="40" width="180" height="70" rx="8"/>
  <text class="d-text" x="380" y="70" text-anchor="middle">row 1</text>
  <text class="d-sub" x="380" y="94" text-anchor="middle">lowest id first</text>
  <rect class="d-box" x="550" y="40" width="180" height="70" rx="8"/>
  <text class="d-text" x="640" y="70" text-anchor="middle">row 2</text>
  <text class="d-sub" x="640" y="94" text-anchor="middle">second</text>
  <rect class="d-box-muted" x="290" y="200" width="180" height="70" rx="8"/>
  <text class="d-text" x="380" y="230" text-anchor="middle">Transaction B</text>
  <text class="d-sub" x="380" y="254" text-anchor="middle">waits in line for 1</text>
  <path class="d-edge" d="M 212 75 L 284 75" marker-end="url(#sql13q1-b)"/>
  <path class="d-edge" d="M 472 75 L 544 75" marker-end="url(#sql13q1-b)"/>
  <path class="d-edge-dashed" d="M 380 196 L 380 116" marker-end="url(#sql13q1-b)"/>
  <text class="d-sub" x="560" y="225" text-anchor="middle">runs after A</text>
  <text class="d-sub" x="560" y="247" text-anchor="middle">commits</text>
</svg>

B is blocked for a moment, which is ordinary waiting, and finishes after A. For each transfer the rule is simple to compute:

~~~sql
SELECT id AS transfer,
       from_id,
       to_id,
       CASE WHEN from_id < to_id THEN from_id ELSE to_id END AS lock_first,
       CASE WHEN from_id < to_id THEN to_id ELSE from_id END AS lock_second
FROM transfers
ORDER BY id;
~~~

~~~text
transfer | from_id | to_id | lock_first | lock_second
101 | 1 | 2 | 1 | 2
102 | 2 | 1 | 1 | 2
103 | 3 | 1 | 1 | 3
104 | 4 | 3 | 3 | 4
105 | 2 | 4 | 2 | 4
~~~

Transfers 101 and 102 go in opposite directions but now both lock account 1 first. (In PostgreSQL and MySQL you can write \`LEAST(from_id, to_id)\` and \`GREATEST(...)\`; the \`CASE\` form runs everywhere, including SQLite, whose two-argument \`MIN(a, b)\` does not exist in PostgreSQL 16: \`function min(integer, integer) does not exist\`.)

The same two sessions, with B also updating row 1 before row 2:

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` \`UPDATE ... WHERE id = 1;\` | \`BEGIN;\` |
| 2 | | \`UPDATE ... WHERE id = 1;\` **waits** |
| 3 | \`UPDATE ... WHERE id = 2;\` \`COMMIT;\` | unblocked |
| 4 | | \`UPDATE ... WHERE id = 2;\` \`COMMIT;\` |

Both committed, no error, and the final balances included both transfers (1: 470, 2: 330).

In application code the cleanest way is to take all the locks in one statement, in sorted order, before changing anything:

~~~sql
BEGIN;
SELECT id, balance FROM accounts WHERE id IN (2, 1) ORDER BY id FOR UPDATE;
-- now update both rows in any order
COMMIT;
~~~

\`ORDER BY\` decides the locking order because PostgreSQL locks rows as they come out of the sort. The plan shows it, \`LockRows\` sitting above \`Sort\`:

~~~text
QUERY PLAN
LockRows
  ->  Sort
        Sort Key: id
        ->  Bitmap Heap Scan on accounts
              Recheck Cond: (id = ANY ('{2,1}'::integer[]))
              ->  Bitmap Index Scan on accounts_pkey
                    Index Cond: (id = ANY ('{2,1}'::integer[]))
~~~

(The planner may choose another scan on other data; the \`LockRows\` above \`Sort\` shape is what matters.)

📌 **Interview term: lock ordering** — the rule that every code path acquires locks on the same kinds of resources in the same global order (for example ascending primary key, or table \`orders\` before table \`payments\`). It makes a waits-for cycle impossible.

## 7. Prevention 2: Everything Else That Helps

**Keep transactions short.** Locks are held until COMMIT, so a transaction that calls an HTTP API or waits for user input in the middle holds its locks for seconds, and the window for a cycle grows. Do the slow work before \`BEGIN\` or after \`COMMIT\`. See [When would you use a transaction explicitly?](/interview-question/when-would-you-use-a-transaction-explicitly).

**Take the strong lock first.** A transaction that reads a row with \`FOR SHARE\` and later updates it has to *upgrade* its lock. Two sessions doing that on the same row deadlock with each other, even though only one row is involved: in the PostgreSQL 16 run, both sessions read row 1 \`FOR SHARE\`, both then ran an UPDATE of it, and the second one got \`deadlock detected\`. Lock with \`FOR UPDATE\` from the start when you know you will write.

**Touch fewer rows.** An \`UPDATE ... WHERE email = ?\` without an index on \`email\` has to look at many rows; InnoDB, for example, generally sets record locks on every index record an UPDATE or locking read scans ([MySQL manual, locks set by statements](https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html)), so a missing index means many more locks and more chances of overlap. Index the columns in your WHERE clauses.

**Bound the waits.** \`SET lock_timeout = '2s'\` turns a long wait into error \`55P03 canceling statement due to lock timeout\`, so one stuck transaction cannot pile up everybody behind it. This does not prevent deadlocks (the check still runs after \`deadlock_timeout\`) but it limits the damage of ordinary blocking.

**Retry on 40P01.** Even with all of the above, some deadlocks come from places you do not control (foreign key checks, triggers, other teams). The application catches SQLSTATE \`40P01\` (and \`40001\` if you use SERIALIZABLE), rolls back, waits a short random time and runs the *whole* transaction again, a few times at most. The retry loop and its pitfalls are in [Serializable isolation pitfalls — write skew, retry storms, and when advisory locks beat SSI?](/interview-question/serializable-isolation-pitfalls-write-skew-retry-storms-and-when-advisory-locks-).

📌 **Interview term: lock_timeout** — PostgreSQL setting: the longest one statement waits for a lock before it is cancelled with \`55P03\`. Default \`0\` (no limit).

## 8. Diagnosing a Deadlock After the Fact

1. **Read the error DETAIL.** It names the processes and what each waited for; the server log (the HINT says so) also prints each query.
2. **Turn on \`log_lock_waits\`** so waits longer than \`deadlock_timeout\` are logged even when they are not deadlocks.
3. **Look at live blocking** with \`pg_blocking_pids(pid)\`, which returns the processes a session waits on, and \`pg_stat_activity\` for their queries. In the two-session run, after the deadlock was broken, session A checked \`SELECT pg_blocking_pids(pg_backend_pid()) = '{}'\` and got \`t\`: nothing blocked it any more.
4. **Find the two code paths** that touch the same tables, and compare the order in which they lock.

**SQLite is a special case.** It has no row locks: a write locks the whole database file. With Python's sqlite3 module (SQLite 3.45.1) two connections each ran \`BEGIN\`, read the table, then tried to write. The second writer got \`database is locked\` after 0.0 seconds, without waiting for its 2-second timeout: SQLite saw that waiting could never succeed and refused at once. With \`BEGIN IMMEDIATE\` (take the write lock at the start), the second connection simply waited 1.0 second until the first committed, and both updates landed.

## 9. Verified: Running the Code

The four examples were run by the project verifier: the first two on sql.js 1.10.2 (SQLite) seeded with the schema above, the last two on PostgreSQL 16.15 in a throwaway database seeded with the same schema. The lock-order query printed:

~~~text
transfer | from_id | to_id | lock_first | lock_second
101 | 1 | 2 | 1 | 2
102 | 2 | 1 | 1 | 2
103 | 3 | 1 | 1 | 3
104 | 4 | 3 | 3 | 4
105 | 2 | 4 | 2 | 4
~~~

The waits-for cycle query printed:

~~~text
txn | cycle
T1 | T1 -> T2 -> T1
T2 | T2 -> T1 -> T2
~~~

The PostgreSQL plan for the ordered \`FOR UPDATE\` printed:

~~~text
QUERY PLAN
LockRows
  ->  Sort
        Sort Key: id
        ->  Bitmap Heap Scan on accounts
              Recheck Cond: (id = ANY ('{2,1}'::integer[]))
              ->  Bitmap Index Scan on accounts_pkey
                    Index Cond: (id = ANY ('{2,1}'::integer[]))
~~~

The \`pg_locks\` query inside an open transaction printed:

~~~text
locktype | relation | mode | granted
relation | accounts | RowExclusiveLock | t
relation | accounts_pkey | RowExclusiveLock | t
transactionid | NULL | ExclusiveLock | t
~~~

The two-session timelines in sections 4 and 6 were run with two real \`psql\` sessions against a scratch PostgreSQL 16.15 database (\`sqlw_b13\`, dropped afterwards); the error text is copied from that run with only process and transaction ids replaced. The \`pg_settings\` query and the lock-order query also ran on PostgreSQL 16.15 with the same rows.

## Common Pitfalls

- **Locking in input order.** \`for id in [to, from]\` in application code, or two services that update \`orders\` then \`payments\` versus \`payments\` then \`orders\`. Sort the keys, and agree on a table order.
- **Retrying only the failed statement.** The victim's whole transaction was rolled back. Re-running just the last UPDATE applies half a transfer. Retry from \`BEGIN\`.
- **Treating \`deadlock_timeout\` as a fix.** Changing it changes when the victim is chosen, not whether there is one.
- **Long transactions around slow work.** Network calls, file uploads or sleeps between \`BEGIN\` and \`COMMIT\` hold locks the whole time.
- **Read, then upgrade.** \`FOR SHARE\` followed by an UPDATE of the same row in two sessions deadlocks on a single row (run on PostgreSQL 16 for this page). Lock \`FOR UPDATE\` up front.
- **Assuming one statement is safe.** A multi-row \`UPDATE ... WHERE id IN (...)\` locks in plan order; two of them can deadlock. Lock with \`ORDER BY ... FOR UPDATE\` first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A deadlock is a cycle of lock waits: transaction A holds row 1 and wants row 2, transaction B holds row 2 and wants row 1. Neither can ever finish, unlike normal blocking, which ends when the holder commits.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How the database breaks it:</strong> <span style="color:#f0e2c8;">PostgreSQL waits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deadlock_timeout</code> (1s by default), then checks the waits-for graph; if it finds a cycle it aborts one transaction with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">40P01 deadlock detected</code> and the other continues. InnoDB detects immediately (error 1213), SQL Server picks a victim (error 1205).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Root cause:</strong> <span style="color:#f0e2c8;">Almost always two code paths locking the same rows in different orders, for example a transfer 1 to 2 running at the same time as a transfer 2 to 1, or a batch update touching rows in a different order than a single-row update.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Prevention:</strong> <span style="color:#f0e2c8;">Lock in one global order: sort the ids and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT ... WHERE id IN (...) ORDER BY id FOR UPDATE</code> before updating. Keep transactions short, take the lock you will need up front instead of upgrading later, and index the WHERE columns so statements lock fewer rows.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Handling:</strong> <span style="color:#f0e2c8;">Deadlocks cannot be ruled out entirely, so the app retries the whole transaction on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">40P01</code> with a small random backoff, and logs it. I would also set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">log_lock_waits</code> and a sensible <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lock_timeout</code> so long waits show up before they become incidents.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which transaction does PostgreSQL abort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The one whose deadlock check found the cycle, which is normally the one that started waiting last, after its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deadlock_timeout</code> expired. In the run on this page the second session to wait got <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">40P01</code> and the first one continued immediately. PostgreSQL does not let you set a priority; SQL Server does with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET DEADLOCK_PRIORITY</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a deadlock the same as a long lock wait?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A wait ends when the other transaction commits or rolls back; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lock_timeout</code> turns a too-long wait into error <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">55P03</code>. A deadlock can never end by waiting, so the engine must abort someone. Different errors, different fixes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just raise <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">deadlock_timeout</code> or lower it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only controls how soon the (relatively expensive) check runs. Lower means victims are chosen sooner; higher means fewer checks on a busy system. Neither prevents deadlocks; only consistent lock order and shorter transactions do.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a single UPDATE statement deadlock?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE accounts SET ... WHERE id IN (1, 2)</code> locks rows in whatever order the plan visits them, so two such statements with different plans or different orders can deadlock. Locking first with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY id FOR UPDATE</code> makes the order explicit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does SQLite have deadlocks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not row deadlocks, since it has one writer at a time. But two connections that both start with a read and then try to write can block each other; SQLite returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">database is locked</code> immediately to one of them instead of waiting. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN IMMEDIATE</code> takes the write lock up front and avoids it, which I checked with Python sqlite3 3.45.1.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Row lock | Lock on one row from a write or locking read, held until the transaction ends |
| Lock wait (blocking) | Waiting for a lock another transaction holds; ends when it commits or rolls back |
| Deadlock | A cycle of transactions each waiting for a lock another one holds |
| Waits-for graph | Graph of "A waits for B" arrows; a deadlock is a cycle in it |
| Deadlock victim | The transaction the engine aborts to break the cycle |
| SQLSTATE 40P01 | PostgreSQL \`deadlock_detected\` error code; retry the transaction |
| deadlock_timeout | How long PostgreSQL waits before running the deadlock check (default 1s) |
| Lock ordering | Every code path takes locks in the same global order, so no cycle can form |
| lock_timeout | Maximum time one statement waits for a lock (default 0, no limit) |

**Conclusion:** A deadlock is not a slow query; it is a circle of transactions each holding what the next one needs, which no amount of waiting can resolve. The database finds the circle in its waits-for graph (PostgreSQL after \`deadlock_timeout\`, InnoDB at once, SQL Server through its lock monitor) and aborts one victim, which in the run on this page cost session B its whole transaction with \`40P01\` while session A carried on. The cure is mostly discipline: lock rows in one global order (\`ORDER BY id FOR UPDATE\`), keep transactions short, lock strongly from the start, and because some deadlocks always remain, retry the whole transaction when one happens.`,
    examples: [
      {
        label: `Pick one lock order for every transfer: lowest account id first`,
        code: `SELECT id AS transfer,
       from_id,
       to_id,
       CASE WHEN from_id < to_id THEN from_id ELSE to_id END AS lock_first,
       CASE WHEN from_id < to_id THEN to_id ELSE from_id END AS lock_second
FROM transfers
ORDER BY id;`,
      },
      {
        label: `Find the cycle in a waits-for graph, the way a deadlock detector does`,
        code: `WITH RECURSIVE chain(start, current, path, depth) AS (
  SELECT waiter, holder, waiter || ' -> ' || holder, 1
  FROM lock_waits
  UNION ALL
  SELECT c.start, w.holder, c.path || ' -> ' || w.holder, c.depth + 1
  FROM chain AS c
  JOIN lock_waits AS w ON w.waiter = c.current
  WHERE c.current <> c.start AND c.depth < 10
)
SELECT start AS txn, path AS cycle
FROM chain
WHERE current = start
ORDER BY txn;`,
      },
      {
        label: `PostgreSQL: ORDER BY ... FOR UPDATE locks rows in sorted order (LockRows above Sort)`,
        code: `EXPLAIN (COSTS OFF)
SELECT id, balance
FROM accounts
WHERE id IN (2, 1)
ORDER BY id
FOR UPDATE;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: the locks one UPDATE holds until COMMIT, from pg_locks`,
        code: `BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 1;
SELECT locktype, relation::regclass AS relation, mode, granted
FROM pg_locks
WHERE pid = pg_backend_pid()
  AND locktype IN ('relation', 'transactionid')
  AND (relation IS NULL OR relation::regclass::text LIKE 'accounts%')
ORDER BY locktype, relation::regclass::text;
ROLLBACK;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `Serializable isolation pitfalls — write skew, retry storms, and when advisory locks beat SSI?`,
    difficulty: "hard",
    seoDescription: `Write skew, how PostgreSQL SERIALIZABLE (SSI) aborts it with 40001, false positives and retry storms, and when FOR UPDATE or advisory locks win.`,
    description: `**Question presented to candidate:**
"We moved a critical booking flow to SERIALIZABLE to stop a write-skew bug, and now under load we see lots of 'could not serialize access' errors and slow retries. Explain what write skew is, why SERIALIZABLE throws these errors, and when you would use an explicit lock such as an advisory lock instead."

**What a strong answer should cover:**
- Write skew: two transactions read the same data, each writes a different row based on what it read, and together they break a rule neither broke alone; REPEATABLE READ (snapshot isolation) allows it
- How PostgreSQL SERIALIZABLE (SSI) catches it: it tracks read/write dependencies with SIRead predicate locks and aborts one transaction with SQLSTATE \`40001\`; it never blocks to do so
- The contract SSI imposes: every transaction involved must run at SERIALIZABLE, and the application must retry the whole transaction on \`40001\`
- Pitfalls: false positives from coarse predicate locks (whole relation on a sequential scan, pages on small indexes), retry storms on hot rows, side effects repeated on retry
- Alternatives: \`SELECT ... FOR UPDATE\` on the rows the decision depends on, \`pg_advisory_xact_lock\` on a key that names the rule (works even when the rows do not exist yet), or a constraint when the rule can be expressed as one
- How to choose: SSI for many varied, rarely conflicting rules; explicit locks for a few known, hot invariants

**Clarifying questions expected:**
- Which invariant is being protected, and does it depend on rows that might not exist yet (no row to lock)?
- How hot is the contention: many writers on the same key, or occasional overlaps?
- Are there side effects (emails, payments, external calls) inside the transaction that a retry would repeat?

**Code / implementation expected:** Yes — reproduce write skew under REPEATABLE READ, show SERIALIZABLE rejecting it, and show the same rule enforced with an advisory lock.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE doctors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  shift_date TEXT NOT NULL,
  on_call INTEGER NOT NULL
);
INSERT INTO doctors (id, name, shift_date, on_call) VALUES
  (1, 'Alice', '2026-10-20', 1),
  (2, 'Bob',   '2026-10-20', 1),
  (3, 'Carol', '2026-10-20', 0),
  (4, 'Dan',   '2026-10-21', 1),
  (5, 'Erin',  '2026-10-21', 1),
  (6, 'Farid', '2026-10-21', 1);
\`\`\``,
    answer: `**Target Audience:** Developers who know what a transaction is and have heard of isolation levels, meeting write skew and SERIALIZABLE retries for the first time; and candidates who must defend a locking strategy in a design interview.
**Difficulty:** Hard
**Engines:** PostgreSQL 16.15 (two real \`psql\` sessions for every anomaly and error, \`pgbench\` 16 for the retry numbers, the verifier for the examples) and SQLite via sql.js 1.10.2 for the runnable examples. MySQL is mentioned only where cited.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result, plan and error message below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A hospital rule says: every night at least one doctor must be on call. Tonight Alice and Bob are both on call. Both feel unwell. Alice opens the scheduling app, sees "2 doctors on call", and clicks "go off call": fine, Bob is still there. At the same second Bob, on his phone, sees "2 doctors on call" and does the same: fine, Alice is still there.

Each made a correct decision from what they saw. Nobody overwrote anybody: Alice changed her own row, Bob changed his. And yet the hospital now has nobody on call.

That is **write skew**, and it is the bug that pushes teams to SERIALIZABLE. This page is about what SERIALIZABLE then costs you, and when a plain, deliberate lock is the better tool.

The isolation levels themselves (what READ COMMITTED, REPEATABLE READ and SERIALIZABLE each prevent) have their own pages: [What are transaction isolation levels?](/interview-question/what-are-transaction-isolation-levels) and [Transaction isolation levels in Postgres — what anomalies does each level prevent?](/interview-question/transaction-isolation-levels-in-postgres-what-anomalies-does-each-level-prevent). Here we start where those stop.

## 2. Write Skew, Precisely

The rule, as a query you can run:

~~~sql
SELECT shift_date,
       SUM(on_call) AS doctors_on_call,
       CASE WHEN SUM(on_call) >= 1 THEN 'ok' ELSE 'VIOLATED' END AS rule
FROM doctors
GROUP BY shift_date
ORDER BY shift_date;
~~~

~~~text
shift_date | doctors_on_call | rule
2026-10-20 | 2 | ok
2026-10-21 | 3 | ok
~~~

📌 **Interview term: invariant** — a rule about the data that must always hold, here "at least one doctor on call per shift". The interesting invariants span *several rows*, so no single-row CHECK constraint can enforce them.

Now two sessions on PostgreSQL 16.15, both at REPEATABLE READ:

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN ISOLATION LEVEL REPEATABLE READ;\` | \`BEGIN ISOLATION LEVEL REPEATABLE READ;\` |
| 2 | count on call for 2026-10-20: **2** | |
| 3 | | count on call for 2026-10-20: **2** |
| 4 | \`UPDATE doctors SET on_call = 0 WHERE name = 'Alice' ...;\` | |
| 5 | | \`UPDATE doctors SET on_call = 0 WHERE name = 'Bob' ...;\` |
| 6 | \`COMMIT;\` succeeds | \`COMMIT;\` succeeds |

Both commits succeeded. Afterwards the count was:

~~~text
on_call
0
~~~

The end state is the same as running the two UPDATEs back to back, which is what this example replays:

~~~sql
-- Transaction A read 2 on call for 2026-10-20 and removed Alice.
UPDATE doctors SET on_call = 0 WHERE name = 'Alice' AND shift_date = '2026-10-20';
-- Transaction B read the same 2 (its snapshot) and removed Bob.
UPDATE doctors SET on_call = 0 WHERE name = 'Bob' AND shift_date = '2026-10-20';

SELECT shift_date,
       SUM(on_call) AS doctors_on_call,
       CASE WHEN SUM(on_call) >= 1 THEN 'ok' ELSE 'VIOLATED' END AS rule
FROM doctors
GROUP BY shift_date
ORDER BY shift_date;
~~~

~~~text
shift_date | doctors_on_call | rule
2026-10-20 | 0 | VIOLATED
2026-10-21 | 3 | ok
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 760 340" role="img" aria-label="Write skew: transactions A and B both read two doctors on call from the same snapshot, A takes Alice off, B takes Bob off, and after both commit nobody is on call">
  <defs>
    <marker id="sql13q2-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="270" y="20" width="220" height="64" rx="8"/>
  <text class="d-text" x="380" y="48" text-anchor="middle">Snapshot</text>
  <text class="d-sub" x="380" y="70" text-anchor="middle">2 doctors on call</text>
  <rect class="d-box-accent" x="40" y="140" width="220" height="70" rx="8"/>
  <text class="d-text" x="150" y="170" text-anchor="middle">Transaction A</text>
  <text class="d-sub" x="150" y="194" text-anchor="middle">sees 2, removes Alice</text>
  <rect class="d-box-accent" x="500" y="140" width="220" height="70" rx="8"/>
  <text class="d-text" x="610" y="170" text-anchor="middle">Transaction B</text>
  <text class="d-sub" x="610" y="194" text-anchor="middle">sees 2, removes Bob</text>
  <rect class="d-box" x="270" y="262" width="220" height="64" rx="8"/>
  <text class="d-text" x="380" y="290" text-anchor="middle">After both commit</text>
  <text class="d-accent" x="380" y="312" text-anchor="middle">0 on call</text>
  <path class="d-edge-dashed" d="M 300 86 L 190 136" marker-end="url(#sql13q2-a)"/>
  <path class="d-edge-dashed" d="M 460 86 L 570 136" marker-end="url(#sql13q2-a)"/>
  <path class="d-edge" d="M 190 212 L 300 258" marker-end="url(#sql13q2-a)"/>
  <path class="d-edge" d="M 570 212 L 460 258" marker-end="url(#sql13q2-a)"/>
</svg>

Each transaction read a snapshot in which the rule held, and wrote a row the other did not write. REPEATABLE READ in PostgreSQL only complains when two transactions update the *same* row, so it saw nothing wrong.

📌 **Interview term: write skew** — an anomaly where two concurrent transactions read an overlapping set of rows, each updates a *different* row based on what it read, and the combined result violates an invariant that each transaction alone preserved. It is allowed by snapshot isolation.

📌 **Interview term: snapshot isolation** — each transaction reads from a fixed snapshot taken at its start and is rejected only on write-write conflicts on the same row. It is what PostgreSQL calls REPEATABLE READ.

## 3. How SERIALIZABLE Catches It (SSI)

Same timeline, both sessions at \`SERIALIZABLE\`. Every statement behaved the same until the second commit:

~~~text
ERROR:  could not serialize access due to read/write dependencies among transactions
DETAIL:  Reason code: Canceled on identification as a pivot, during commit attempt.
HINT:  The transaction might succeed if retried.
~~~

The count afterwards was \`1\`: only A's change survived, and the rule held.

PostgreSQL implements SERIALIZABLE as **Serializable Snapshot Isolation**, introduced in PostgreSQL 9.1 ([PostgreSQL 9.1 release announcement](https://www.postgresql.org/about/news/1349)). It keeps snapshot isolation and adds bookkeeping: every read leaves a marker saying "this transaction depended on these rows (or pages, or the whole table)".

~~~sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
CREATE TEMP TABLE seen AS
  SELECT count(*) AS on_call FROM doctors
  WHERE shift_date = '2026-10-20' AND on_call = 1;
SELECT locktype, relation::regclass AS relation, page, tuple, mode
FROM pg_locks
WHERE mode = 'SIReadLock' AND pid = pg_backend_pid()
ORDER BY locktype, page, tuple;
COMMIT;
~~~

~~~text
locktype | relation | page | tuple | mode
relation | doctors | NULL | NULL | SIReadLock
~~~

📌 **Interview term: SIRead lock (predicate lock)** — the marker SSI leaves for every read. It blocks nobody; it only records "this transaction read this table, page or row". It shows in \`pg_locks\` with mode \`SIReadLock\`, and it outlives the transaction until every overlapping transaction has finished.

When B writes Bob's row, PostgreSQL sees that A holds an SIRead lock covering it: A read something B changed. When A writes Alice's row, it sees the reverse. That makes two *read/write dependencies* in a circle:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 280" role="img" aria-label="SSI view of write skew: A read rows that B later wrote and B read rows that A later wrote, two read write dependencies forming a cycle, so one transaction is aborted">
  <defs>
    <marker id="sql13q2-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="60" y="100" width="200" height="80" rx="8"/>
  <text class="d-text" x="160" y="134" text-anchor="middle">Transaction A</text>
  <text class="d-sub" x="160" y="158" text-anchor="middle">SIRead on doctors</text>
  <rect class="d-box-accent" x="500" y="100" width="200" height="80" rx="8"/>
  <text class="d-text" x="600" y="134" text-anchor="middle">Transaction B</text>
  <text class="d-sub" x="600" y="158" text-anchor="middle">SIRead on doctors</text>
  <path class="d-edge-accent" d="M 262 120 C 360 50, 400 50, 496 120" marker-end="url(#sql13q2-b)"/>
  <text class="d-accent" x="380" y="44" text-anchor="middle">A read, B wrote Bob</text>
  <path class="d-edge-accent" d="M 496 162 C 400 232, 360 232, 262 162" marker-end="url(#sql13q2-b)"/>
  <text class="d-accent" x="380" y="250" text-anchor="middle">B read, A wrote Alice</text>
</svg>

📌 **Interview term: rw-antidependency** — "T1 read a version of data that T2 later overwrote". SSI aborts a transaction when it finds two of these in a row (the *dangerous structure*); the transaction in the middle is the *pivot*, which is the word in the error DETAIL.

📌 **Interview term: serialization failure (SQLSTATE 40001)** — the error SERIALIZABLE (and REPEATABLE READ on a same-row conflict) raises instead of allowing an anomaly. The HINT says it: the transaction might succeed if retried. It can come from any statement, including COMMIT.

Two properties to state in the interview:

- **It never blocks.** Both transactions ran to the end at full speed; one was rejected. That is optimistic concurrency control.
- **It only protects transactions that use it.** With A at SERIALIZABLE and B at READ COMMITTED, the same timeline committed both and the count was \`0\` again. A single code path or admin script at the default level opens the hole.

## 4. Pitfall 1: False Positives From Coarse Predicate Locks

SSI does not record "A read the rows where \`shift_date = '2026-10-20'\`" as an exact condition. It records a lock on whatever the scan touched. A sequential scan touched the whole table, so the SIRead lock above covers the whole \`doctors\` relation.

The consequence, run with two sessions: A takes Alice off the 2026-10-20 shift, B takes Dan off the **2026-10-21** shift. Different shifts, different rules, no anomaly possible. B still got:

~~~text
ERROR:  could not serialize access due to read/write dependencies among transactions
DETAIL:  Reason code: Canceled on identification as a pivot, during commit attempt.
~~~

An index helps, but granularity is still pages. With \`CREATE INDEX doctors_shift_idx ON doctors (shift_date)\` and the plan forced onto the index (\`SET enable_seqscan = off\`, needed on a six-row table), the read took page locks:

~~~text
locktype | relation | page | tuple | mode
page | doctors | 0 | NULL | SIReadLock
page | doctors_shift_idx | 1 | NULL | SIReadLock
~~~

All six doctors live on heap page 0 and index page 1, so the two shifts still shared locks and B was still cancelled with the same error. On a real table the rows of different shifts sit on different pages and the false positives mostly disappear; on small hot tables they do not.

📌 **Interview term: false positive (SSI)** — a serialization failure where no anomaly would really have happened, caused by predicate locks being coarser than the actual condition. PostgreSQL also promotes many row locks into a page or relation lock to save memory, which adds more.

## 5. Pitfall 2: Retries, and Retry Storms

With SSI, \`40001\` is not an exception, it is part of the protocol. The application has to:

1. catch SQLSTATE \`40001\` (and \`40P01\` for deadlocks),
2. roll back,
3. wait a random, growing delay (exponential backoff with jitter),
4. run the **entire** transaction again, including its reads, because the decision depended on them,
5. give up after a few attempts and report an error.

A sketch of that loop, not run here because it depends on your driver:

~~~text
for attempt in 1..5:
    try:
        BEGIN ISOLATION LEVEL SERIALIZABLE
        ... all reads and writes ...
        COMMIT
        return ok
    except sqlstate in ('40001', '40P01'):
        ROLLBACK
        sleep(random(0, 10ms * 2^attempt))
raise "gave up after 5 attempts"
~~~

The trouble starts when many clients fight over the same rows. Each retry redoes all the work and is likely to collide again. To put a number on it, \`pgbench\` ran a one-line "increment a counter row" transaction with 8 clients for 5 seconds, using \`--max-tries=20\` (pgbench retries serialization failures itself; the option arrived in PostgreSQL 15 per the [commit thread](https://www.postgresql.org/message-id/E1nWxtC-0010KS-07%40gemulon.postgresql.org)):

| Variant (8 clients, 5 s, one hot row) | Committed | Retried transactions | Total retries | Gave up after 20 tries |
| :--- | :--- | :--- | :--- | :--- |
| \`SERIALIZABLE\`: read the row, then update it | 5,847 | 3,695 (58.2%) | 30,578 | 506 (8.0%) |
| \`READ COMMITTED\` + \`SELECT ... FOR UPDATE\` | 6,285 | 0 | 0 | 0 |

These are one run on a 4-core sandbox; your numbers will differ, the shape will not. With SSI more than half the transactions had to be redone at least once, about five retries per success on average, and 8% failed outright even after 20 tries. With an explicit row lock, the clients simply queued: no retries and no failures. (On a single hot row the error under SERIALIZABLE is the same-row variant, \`could not serialize access due to concurrent update\`; it is still SQLSTATE 40001.)

📌 **Interview term: retry storm** — under heavy contention, aborted transactions retry, collide again and abort again, so the system spends more and more of its time on work that is thrown away. Backoff with jitter spreads them out; reducing contention fixes the cause.

**Side effects make retries dangerous.** If the transaction sends an email or charges a card before COMMIT, a retry does it twice. Do those after a successful COMMIT, or use an outbox table written inside the transaction.

**Long read-only reports.** PostgreSQL documents \`BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE\` for long reports: the transaction waits for a safe snapshot and then cannot fail with a serialization error ([PostgreSQL 16 docs, transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html)). It was not exercised under load for this page.

## 6. The Alternative: Lock Deliberately

SSI says "run everyone in parallel, then reject the ones that conflicted". An explicit lock says "make the ones that might conflict take turns". For a small number of known, hot invariants, taking turns is cheaper.

### Option A: lock the rows the decision depends on

The decision "may I go off call?" depends on every doctor of that shift. Lock them all before counting (at the default READ COMMITTED):

~~~sql
BEGIN;
SELECT id, name, on_call
FROM doctors
WHERE shift_date = '2026-10-20'
ORDER BY id
FOR UPDATE;
-- count in the application; update only if another doctor is still on call
COMMIT;
~~~

Run with two sessions: B's \`SELECT ... FOR UPDATE\` waited until A committed, and then returned the **current** rows, with Alice already off call, so B's application logic saw only Bob left and refused:

~~~text
id | name | on_call
1 | Alice | 0
2 | Bob | 1
3 | Carol | 0
~~~

You cannot write \`SELECT count(*) ... FOR UPDATE\` directly; PostgreSQL 16 said \`ERROR:  FOR UPDATE is not allowed with aggregate functions\`. Lock the rows, then count. The lock modes are compared in [FOR UPDATE vs FOR UPDATE NOWAIT vs FOR UPDATE SKIP LOCKED — which to use when?](/interview-question/for-update-vs-for-update-nowait-vs-for-update-skip-locked-which-to-use-when).

This fails when the rule is about rows that **do not exist yet**: "no two bookings for the same room may overlap" has nothing to lock before the first booking is inserted.

### Option B: an advisory lock that names the rule

An advisory lock is a lock on a number that means whatever your application says it means. PostgreSQL does not attach it to any row; it only guarantees that two transactions cannot hold the same key at once.

~~~sql
BEGIN;
SELECT hashtext('oncall:2026-10-20') AS lock_key,
       pg_try_advisory_xact_lock(hashtext('oncall:2026-10-20')) AS got_lock;
COMMIT;
~~~

~~~text
lock_key | got_lock
712409696 | t
~~~

\`hashtext\` turns the readable name \`oncall:2026-10-20\` into the integer key. With two sessions using the blocking form \`pg_advisory_xact_lock\`:

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` \`SELECT pg_advisory_xact_lock(hashtext('oncall:2026-10-20'));\` | \`BEGIN;\` |
| 2 | count on call: **2** | |
| 3 | | \`SELECT pg_advisory_xact_lock(...same key...);\` **waits** |
| 4 | \`UPDATE ... Alice off call;\` \`COMMIT;\` | unblocked |
| 5 | | count on call: **1**, so B refuses; \`COMMIT;\` |

The final count was \`1\`. No error, no retry: B simply waited its turn and then saw the truth.

📌 **Interview term: advisory lock** — an application-defined lock on a 64-bit key (or two 32-bit keys) in PostgreSQL. \`pg_advisory_xact_lock\` waits and releases at transaction end; \`pg_try_advisory_xact_lock\` returns \`true\`/\`false\` immediately; \`pg_advisory_lock\` is the session-level form.

Advisory lock rules that interviewers probe:

- **Use the transaction-level functions.** In a test, a \`pg_advisory_lock(42)\` taken inside a transaction was still held after COMMIT, and \`pg_advisory_unlock(43)\` on a key held only by the already-committed \`pg_advisory_xact_lock(43)\` returned \`false\` with \`WARNING:  you don't own a lock of type ExclusiveLock\`. Session locks that outlive transactions stay with the *connection*, which behind a transaction-mode pooler is shared with other clients.
- **Everyone must use it.** Like SSI, it protects only code that takes the lock. A script that updates \`doctors\` directly bypasses it.
- **Hash collisions are harmless but real.** \`hashtext\` returns 32 bits, so two different rule names can share a key; the only effect is unnecessary waiting.

### Option C: a constraint, when the rule fits one

If the rule can be written as a UNIQUE constraint, a partial unique index or an exclusion constraint (for example on overlapping time ranges), use that: the database enforces it for every writer, at every isolation level. "At least one on call" cannot be written that way, which is why it is the textbook write-skew example.

## 7. Choosing: SSI or an Explicit Lock?

| Situation | Better choice | Why |
| :--- | :--- | :--- |
| Many different multi-row rules, conflicts rare | SERIALIZABLE everywhere + retry loop | No need to know every rule in advance; aborts are rare and cheap |
| One known rule, many writers on the same key | \`FOR UPDATE\` or advisory lock | Writers queue instead of aborting and redoing work (see the pgbench table) |
| Rule about rows that may not exist yet | Advisory lock on the rule key, or a constraint | There is no row to \`FOR UPDATE\` |
| Transactions with external side effects | Explicit lock, or side effects after COMMIT | A retry would repeat the side effect |
| Some writers outside your control (scripts, other services) | A constraint | SSI and advisory locks only protect transactions that opt in |

Many teams combine them: SERIALIZABLE as the general safety net, with an advisory lock in front of the two or three hottest invariants so those queue instead of storming.

## 8. Verified: Running the Code

The four examples were run by the project verifier: the first two on sql.js 1.10.2 (SQLite) seeded with the schema above, the last two on PostgreSQL 16.15 in a throwaway database seeded with the same schema. The rule check printed:

~~~text
shift_date | doctors_on_call | rule
2026-10-20 | 2 | ok
2026-10-21 | 3 | ok
~~~

The write-skew replay printed:

~~~text
shift_date | doctors_on_call | rule
2026-10-20 | 0 | VIOLATED
2026-10-21 | 3 | ok
~~~

The SIRead lock query printed:

~~~text
locktype | relation | page | tuple | mode
relation | doctors | NULL | NULL | SIReadLock
~~~

The advisory lock query printed:

~~~text
lock_key | got_lock
712409696 | t
~~~

The index variant of the SIRead query in section 4 was run the same way with the index added to the schema. Every two-session timeline (REPEATABLE READ, SERIALIZABLE, mixed levels, different shifts with and without the index, \`FOR UPDATE\`, advisory lock) was run with two real \`psql\` sessions against a scratch PostgreSQL 16.15 database (\`sqlw_b13\`, dropped afterwards), and the pgbench numbers come from one 5-second run per variant against the same server. The first two queries also ran on PostgreSQL with the same rows.

## Common Pitfalls

- **Turning on SERIALIZABLE without a retry loop.** Every \`40001\` then becomes a user-facing error. The retry is part of the design, not an afterthought.
- **Retrying only the last statement.** The decision depended on the reads; re-run the whole transaction from \`BEGIN\`.
- **Mixing levels.** One READ COMMITTED writer (a migration, an admin endpoint) reopens the write-skew hole even when everything else is SERIALIZABLE, as the mixed-level run showed.
- **Ignoring false positives.** Sequential scans lock whole tables for SSI; missing indexes turn into aborts of unrelated work.
- **Using SSI for a hot counter or a single hot key.** Retries multiply the work; queue writers with \`FOR UPDATE\` or an advisory lock instead.
- **Session-level advisory locks with a connection pool.** Prefer \`pg_advisory_xact_lock\`, which cannot leak past COMMIT or ROLLBACK.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Write skew:</strong> <span style="color:#f0e2c8;">Two transactions read the same rows, each decides it is safe to change a *different* row, and together they break a rule. Classic case: two doctors on call, each goes off call because the other is still on. REPEATABLE READ allows it because neither wrote a row the other wrote.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How SSI stops it:</strong> <span style="color:#f0e2c8;">PostgreSQL SERIALIZABLE records what each transaction read with <strong style="color:#ffca28;">SIRead predicate locks</strong>, notices the two read/write dependencies pointing at each other, and aborts one with SQLSTATE <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">40001</code>. It never blocks; it lets both run and rejects one at the end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The contract:</strong> <span style="color:#f0e2c8;">Every transaction that touches the rule must run at SERIALIZABLE, and the app must retry the whole transaction on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">40001</code> with backoff. In my test a READ COMMITTED writer slipped past a SERIALIZABLE one and the rule broke anyway.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The pitfalls:</strong> <span style="color:#f0e2c8;">Predicate locks can be coarse, so unrelated work aborts too: a sequential scan locks the whole table. On one hot row, retries pile up: my 8-client pgbench run needed 30,578 retries for 5,847 successful increments, and 506 transactions gave up after 20 tries.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When explicit locks win:</strong> <span style="color:#f0e2c8;">For a few known, hot invariants I lock deliberately: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR UPDATE</code> on the rows the decision depends on, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_advisory_xact_lock(hashtext('oncall:' || shift))</code> when the rows might not exist yet. Waiting in a queue beats aborting and redoing work. SSI stays the safety net for everything else.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does REPEATABLE READ not catch write skew when it catches lost updates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL REPEATABLE READ is snapshot isolation: it raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">40001</code> only when two transactions update the *same row*. In write skew they update different rows (Alice and Bob), so there is no write-write conflict to detect. Only the read dependencies show the problem, and only SSI tracks those.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is SSI pessimistic or optimistic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Optimistic. It takes SIRead locks that never block anyone; they are bookkeeping. Conflicts are found by looking at dependencies and resolved by aborting. That is why it scales well when conflicts are rare and badly when they are frequent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a false positive in SSI and how do you reduce it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An abort where no real anomaly happened, because predicate locks are tracked at relation or page level. In my run, two doctors on different shifts still conflicted, first with a seq scan (relation lock) and then with an index on a tiny table (one shared page). Indexes on the filtered columns, small transactions and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">READ ONLY</code> where possible reduce them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Advisory lock: session or transaction level?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Transaction level, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_advisory_xact_lock</code>, almost always: it is released at COMMIT or ROLLBACK automatically. A session lock from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_advisory_lock</code> survived COMMIT in my test and must be unlocked by hand, which leaks badly behind a transaction-mode connection pooler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you write the retry loop correctly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Catch SQLSTATE <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">40001</code> (and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">40P01</code>), roll back, sleep a random backoff that grows with each attempt, re-run the entire transaction including its reads, cap the attempts, and keep side effects such as emails outside the transaction or make them idempotent.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Invariant | A rule over the data that must always hold, often spanning several rows |
| Write skew | Two transactions read overlapping data, write different rows, and together break an invariant |
| Snapshot isolation | Reads from a fixed snapshot, rejects only same-row write conflicts (PostgreSQL REPEATABLE READ) |
| SIRead lock (predicate lock) | Non-blocking marker SSI keeps for every read, at row, page or relation level |
| rw-antidependency | T1 read data that T2 later overwrote; two in a row form the dangerous structure |
| Serialization failure (40001) | The error SSI raises instead of allowing an anomaly; retry the transaction |
| False positive (SSI) | An abort with no real anomaly, caused by coarse predicate locks |
| Retry storm | Contended transactions repeatedly abort and retry, wasting most of the work |
| Advisory lock | PostgreSQL lock on an application-chosen integer key, not tied to any row |

**Conclusion:** Write skew is what happens when two careful transactions each read a valid state and each change a different row: snapshot isolation sees no conflict, and the hospital ends up with nobody on call. PostgreSQL SERIALIZABLE fixes it by tracking what every transaction read and aborting one with \`40001\`, without ever blocking, but that only works if every writer uses it and the application retries the whole transaction. Its costs are false positives from coarse predicate locks and, on hot keys, retry storms (30,578 retries for 5,847 commits in the pgbench run on this page). When you know the rule and it is hot, a deliberate lock, \`FOR UPDATE\` on the rows or \`pg_advisory_xact_lock\` on a key naming the rule, makes writers take turns instead, and a constraint beats both whenever the rule can be written as one.`,
    examples: [
      {
        label: `The rule to protect: at least one doctor on call per shift`,
        code: `SELECT shift_date,
       SUM(on_call) AS doctors_on_call,
       CASE WHEN SUM(on_call) >= 1 THEN 'ok' ELSE 'VIOLATED' END AS rule
FROM doctors
GROUP BY shift_date
ORDER BY shift_date;`,
      },
      {
        label: `What write skew leaves behind: both updates applied, the rule broken`,
        code: `-- Transaction A read 2 on call for 2026-10-20 and removed Alice.
UPDATE doctors SET on_call = 0 WHERE name = 'Alice' AND shift_date = '2026-10-20';
-- Transaction B read the same 2 (its snapshot) and removed Bob.
UPDATE doctors SET on_call = 0 WHERE name = 'Bob' AND shift_date = '2026-10-20';

SELECT shift_date,
       SUM(on_call) AS doctors_on_call,
       CASE WHEN SUM(on_call) >= 1 THEN 'ok' ELSE 'VIOLATED' END AS rule
FROM doctors
GROUP BY shift_date
ORDER BY shift_date;`,
      },
      {
        label: `PostgreSQL: the SIRead predicate lock a SERIALIZABLE read takes (whole table on a seq scan)`,
        code: `BEGIN ISOLATION LEVEL SERIALIZABLE;
CREATE TEMP TABLE seen AS
  SELECT count(*) AS on_call FROM doctors
  WHERE shift_date = '2026-10-20' AND on_call = 1;
SELECT locktype, relation::regclass AS relation, page, tuple, mode
FROM pg_locks
WHERE mode = 'SIReadLock' AND pid = pg_backend_pid()
ORDER BY locktype, page, tuple;
COMMIT;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: an advisory lock key that names the rule, taken for this transaction only`,
        code: `BEGIN;
SELECT hashtext('oncall:2026-10-20') AS lock_key,
       pg_try_advisory_xact_lock(hashtext('oncall:2026-10-20')) AS got_lock;
COMMIT;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `FOR UPDATE vs FOR UPDATE NOWAIT vs FOR UPDATE SKIP LOCKED — which to use when?`,
    difficulty: "medium",
    seoDescription: `What FOR UPDATE, NOWAIT and SKIP LOCKED each do when a row is already locked, shown with two PostgreSQL sessions, and which to use for which job.`,
    description: `**Question presented to candidate:**
"You need to lock a row before you change it. PostgreSQL gives you \`FOR UPDATE\`, \`FOR UPDATE NOWAIT\` and \`FOR UPDATE SKIP LOCKED\`. What does each one do when the row is already locked, and which would you pick for a seat-booking page, a background job queue and a money transfer?"

**What a strong answer should cover:**
- \`FOR UPDATE\` locks the selected rows until the transaction ends; a second locker **waits** for the first to commit or roll back
- \`NOWAIT\` turns that wait into an immediate error, SQLSTATE \`55P03\`; \`SKIP LOCKED\` silently leaves locked rows out of the result
- Plain SELECTs are never blocked by any of them (MVCC); only other locking reads and writes are
- Use cases: plain \`FOR UPDATE\` when every caller must see and process this exact row (transfers, with a consistent lock order); \`NOWAIT\` for "someone else is editing, try later" in interactive flows; \`SKIP LOCKED\` for queues and pools where any free row will do
- Details: \`lock_timeout\` as the middle ground between waiting forever and failing at once; after waiting, READ COMMITTED re-checks the WHERE clause on the new row version; \`FOR NO KEY UPDATE\` is weaker and does not block foreign-key inserts
- Engines: PostgreSQL has had SKIP LOCKED since 9.5, MySQL 8.0 has NOWAIT and SKIP LOCKED, SQL Server uses \`UPDLOCK, READPAST\` hints, SQLite has no row locks at all

**Code / implementation expected:** Yes — the three clauses on the same locked row, with what each one returns.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE seats (
  id INTEGER PRIMARY KEY,
  flight TEXT NOT NULL,
  seat_no TEXT NOT NULL,
  status TEXT NOT NULL,
  held_by TEXT
);
INSERT INTO seats (id, flight, seat_no, status, held_by) VALUES
  (1, 'CP101', '1A', 'free', NULL),
  (2, 'CP101', '1B', 'free', NULL),
  (3, 'CP101', '1C', 'sold', 'Maya'),
  (4, 'CP101', '2A', 'free', NULL),
  (5, 'CP101', '2B', 'free', NULL),
  (6, 'CP101', '2C', 'sold', 'Omar'),
  (7, 'CP202', '1A', 'free', NULL),
  (8, 'CP202', '1B', 'free', NULL);
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  seat_id INTEGER NOT NULL REFERENCES seats (id),
  passenger TEXT NOT NULL
);
INSERT INTO bookings (id, seat_id, passenger) VALUES
  (1, 3, 'Maya'),
  (2, 6, 'Omar');
\`\`\``,
    answer: `**Target Audience:** Developers who know basic transactions and want to understand locking reads from zero; candidates who need a crisp "which one when" answer.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 (two real \`psql\` sessions for every locking behaviour, the verifier for the examples), SQLite via sql.js 1.10.2 for the runnable query and to confirm it has no \`FOR UPDATE\`. MySQL and SQL Server facts are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result, plan and error message below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Three shoppers walk up to a market stall where one customer is already holding the last melon and thinking.

- The first shopper **waits** patiently behind them. If the customer puts the melon back, she takes it; if they buy it, she goes home without one. She always gets a definite answer, but she might wait a long time.
- The second shopper glances, sees the melon is taken, and **leaves immediately**: "I will come back later."
- The third shopper does not care about that particular melon. He **skips** it and picks up a different one from the pile.

\`FOR UPDATE\`, \`FOR UPDATE NOWAIT\` and \`FOR UPDATE SKIP LOCKED\` are those three shoppers. All of them want to hold something exclusively; they differ only in what they do when someone else is already holding it.

## 2. What a Locking Read Is

A normal \`SELECT\` in PostgreSQL takes no row locks: it reads the last committed version, and writers do not block it. That is great for reports and terrible for "read, decide, then write" logic, because between your read and your write someone else may change the row.

Adding \`FOR UPDATE\` turns the read into a claim: the rows it returns are locked until your transaction commits or rolls back.

~~~sql
BEGIN;
SELECT id, seat_no FROM seats WHERE id = 1 FOR UPDATE;
-- decide, then
UPDATE seats SET status = 'held', held_by = 'Ana' WHERE id = 1;
COMMIT;
~~~

📌 **Interview term: locking read** — a SELECT with a locking clause (\`FOR UPDATE\`, \`FOR NO KEY UPDATE\`, \`FOR SHARE\`, \`FOR KEY SHARE\`) that locks every row it returns until the transaction ends. Also called *pessimistic locking*: assume a conflict and prevent it, instead of detecting it afterwards.

Readers are not affected. While session A held \`FOR UPDATE\` on seat 1, session B ran a plain \`SELECT id, seat_no FROM seats WHERE id = 1;\` and got the row immediately:

~~~text
id | seat_no
1 | 1A
~~~

SQLite has no row locks at all (one writer locks the whole database), and sql.js 1.10.2 rejects the clause: \`near "UPDATE": syntax error\`. The examples that lock therefore run on PostgreSQL. The query being locked is ordinary SQL:

~~~sql
SELECT id, seat_no, status
FROM seats
WHERE flight = 'CP101' AND status = 'free'
ORDER BY seat_no;
~~~

~~~text
id | seat_no | status
1 | 1A | free
2 | 1B | free
4 | 2A | free
5 | 2B | free
~~~

## 3. The Three Behaviours on a Locked Row

All of the following come from one experiment with two \`psql\` sessions on PostgreSQL 16.15. Session A ran \`BEGIN; SELECT id, seat_no FROM seats WHERE id = 1 FOR UPDATE;\` and kept its transaction open. Session B then tried each variant.

### FOR UPDATE: wait

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="FOR UPDATE: session B asks for seat 1A, which session A has locked, and waits">
  <defs>
    <marker id="sql13q3-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="45" width="190" height="80" rx="8"/>
  <text class="d-text" x="115" y="78" text-anchor="middle">Session B</text>
  <text class="d-sub" x="115" y="102" text-anchor="middle">FOR UPDATE</text>
  <rect class="d-box" x="285" y="45" width="190" height="80" rx="8"/>
  <text class="d-text" x="380" y="78" text-anchor="middle">Seat 1A</text>
  <text class="d-sub" x="380" y="102" text-anchor="middle">locked by A</text>
  <rect class="d-box" x="550" y="45" width="190" height="80" rx="8"/>
  <text class="d-text" x="645" y="78" text-anchor="middle">Waits</text>
  <text class="d-sub" x="645" y="102" text-anchor="middle">until A commits</text>
  <path class="d-edge" d="M 212 85 L 279 85" marker-end="url(#sql13q3-a)"/>
  <path class="d-edge-accent" d="M 477 85 L 544 85" marker-end="url(#sql13q3-a)"/>
</svg>

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` \`SELECT ... WHERE id = 1 FOR UPDATE;\` | |
| 2 | | \`BEGIN;\` \`SELECT id, seat_no FROM seats WHERE id = 1 FOR UPDATE;\` **waits** |
| 3 | \`UPDATE seats SET status = 'held', held_by = 'Ana' WHERE id = 1;\` \`COMMIT;\` | unblocked, returns \`1 | 1A\` |

B gets a definite answer, but only after A is done, and with no limit on how long that takes.

📌 **Interview term: FOR UPDATE** — lock the selected rows exclusively; if another transaction holds a conflicting lock, wait until it ends.

**What B sees after waiting.** At READ COMMITTED, PostgreSQL does not hand B the version it would have seen before waiting. It re-reads the newest version and re-checks the WHERE clause. In a separate run, A sold seat 1 (\`UPDATE seats SET status = 'sold' ...\`) while B waited on \`SELECT id, seat_no, status FROM seats WHERE id = 1 AND status = 'free' FOR UPDATE;\`. When A committed, B's result was empty:

~~~text
id | seat_no | status
~~~

That re-check is what makes "lock, then decide" safe: B never acts on a seat that is no longer free.

### NOWAIT: fail immediately

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="FOR UPDATE NOWAIT: session B asks for seat 1A, which session A has locked, and error 55p03">
  <defs>
    <marker id="sql13q3-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="45" width="190" height="80" rx="8"/>
  <text class="d-text" x="115" y="78" text-anchor="middle">Session B</text>
  <text class="d-sub" x="115" y="102" text-anchor="middle">FOR UPDATE NOWAIT</text>
  <rect class="d-box" x="285" y="45" width="190" height="80" rx="8"/>
  <text class="d-text" x="380" y="78" text-anchor="middle">Seat 1A</text>
  <text class="d-sub" x="380" y="102" text-anchor="middle">locked by A</text>
  <rect class="d-box-accent" x="550" y="45" width="190" height="80" rx="8"/>
  <text class="d-text" x="645" y="78" text-anchor="middle">Error 55P03</text>
  <text class="d-sub" x="645" y="102" text-anchor="middle">at once</text>
  <path class="d-edge" d="M 212 85 L 279 85" marker-end="url(#sql13q3-b)"/>
  <path class="d-edge-accent" d="M 477 85 L 544 85" marker-end="url(#sql13q3-b)"/>
</svg>

Same setup, B runs \`SELECT id, seat_no FROM seats WHERE id = 1 FOR UPDATE NOWAIT;\` and gets, at once:

~~~text
ERROR:  could not obtain lock on row in relation "seats"
~~~

With \`\\set VERBOSITY verbose\` the code shows: \`ERROR:  55P03: could not obtain lock on row in relation "seats"\`. The error aborts B's transaction, so B must \`ROLLBACK\` before doing anything else (or wrap the statement in a SAVEPOINT, see [What are COMMIT, ROLLBACK, and SAVEPOINT?](/interview-question/what-are-commit-rollback-and-savepoint)).

📌 **Interview term: NOWAIT** — do not wait for a row lock; raise SQLSTATE \`55P03\` (\`lock_not_available\`) immediately if any selected row is locked.

### SKIP LOCKED: leave locked rows out

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="FOR UPDATE SKIP LOCKED: session B asks for seat 1A, which session A has locked, and skips the row">
  <defs>
    <marker id="sql13q3-c" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="45" width="190" height="80" rx="8"/>
  <text class="d-text" x="115" y="78" text-anchor="middle">Session B</text>
  <text class="d-sub" x="115" y="102" text-anchor="middle">SKIP LOCKED</text>
  <rect class="d-box" x="285" y="45" width="190" height="80" rx="8"/>
  <text class="d-text" x="380" y="78" text-anchor="middle">Seat 1A</text>
  <text class="d-sub" x="380" y="102" text-anchor="middle">locked by A</text>
  <rect class="d-box-accent" x="550" y="45" width="190" height="80" rx="8"/>
  <text class="d-text" x="645" y="78" text-anchor="middle">Skips the row</text>
  <text class="d-sub" x="645" y="102" text-anchor="middle">returns 1B and 2A</text>
  <path class="d-edge" d="M 212 85 L 279 85" marker-end="url(#sql13q3-c)"/>
  <path class="d-edge-accent" d="M 477 85 L 544 85" marker-end="url(#sql13q3-c)"/>
</svg>

B runs \`SELECT id, seat_no FROM seats WHERE flight = 'CP101' AND status = 'free' ORDER BY seat_no LIMIT 2 FOR UPDATE SKIP LOCKED;\` and gets, at once:

~~~text
id | seat_no
2 | 1B
4 | 2A
~~~

Seat 1A is free but locked by A, so it is silently missing; B received the next two free seats and now holds them. Without anyone else holding a lock, the same query returns 1A and 1B (the second example on this page).

📌 **Interview term: SKIP LOCKED** — return only rows that can be locked immediately, skipping those locked by others. Added in PostgreSQL 9.5 ([2ndQuadrant: What is SKIP LOCKED for in PostgreSQL 9.5?](https://blog.2ndquadrant.com/tag/queue/)). The result is deliberately an *inconsistent* view of the table: perfect for handing out work, wrong for reporting.

### The middle ground: lock_timeout

\`NOWAIT\` is "wait zero"; plain \`FOR UPDATE\` is "wait forever". \`lock_timeout\` is "wait at most this long", and it applies to every statement in the session:

~~~sql
SET lock_timeout = '500ms';
SELECT id, seat_no FROM seats WHERE id = 1 FOR UPDATE;
~~~

~~~text
ERROR:  canceling statement due to lock timeout
CONTEXT:  while locking tuple (0,1) in relation "seats"
~~~

Verbose mode showed the same SQLSTATE as NOWAIT, \`55P03\`, so one error handler covers both.

📌 **Interview term: lock_timeout** — the longest any one statement waits for a lock before it is cancelled with \`55P03\`. Default \`0\`, no limit. Often set per transaction with \`SET LOCAL lock_timeout = '2s'\`.

## 4. Which One When

| You need | Use | Example |
| :--- | :--- | :--- |
| This exact row, and you can wait | \`FOR UPDATE\` (with a consistent lock order and maybe \`lock_timeout\`) | both accounts of a transfer; an order you are about to ship |
| This exact row, but a human is waiting | \`FOR UPDATE NOWAIT\` | "This seat is being booked by someone else, try another" |
| Any one of many equivalent rows | \`FOR UPDATE SKIP LOCKED\` | job queues, assigning the next free seat or coupon code |
| A consistent view, no claim | plain \`SELECT\` | reports, dashboards, totals |

Two warnings that come up in follow-ups:

- **Plain \`FOR UPDATE\` on several rows can deadlock** if two transactions lock them in different orders. Lock with \`ORDER BY id FOR UPDATE\`. See [What is a deadlock and how do you prevent it?](/interview-question/what-is-a-deadlock-and-how-do-you-prevent-it).
- **\`SKIP LOCKED\` can return fewer rows than \`LIMIT\`, or none**, when not enough unlocked candidates remain (the plan is \`Limit\` over \`LockRows\`, so locked rows are skipped and the next candidates are tried). Treat an empty result as "nothing available right now". The full queue pattern, including why plain \`FOR UPDATE\` serialises workers, is in [SKIP LOCKED for job queues — how do you build a concurrent queue without race conditions?](/interview-question/skip-locked-for-job-queues-how-do-you-build-a-concurrent-queue-without-race-cond).

## 5. The Other Lock Strengths

\`FOR UPDATE\` is the strongest of four row-lock modes, and the waiting clauses (\`NOWAIT\`, \`SKIP LOCKED\`) work with all four. Inside one transaction, the \`pgrowlocks\` extension shows which mode each row holds:

~~~sql
CREATE EXTENSION IF NOT EXISTS pgrowlocks;
BEGIN;
DO $$ BEGIN
  PERFORM 1 FROM seats WHERE id IN (1, 2) FOR UPDATE;
  PERFORM 1 FROM seats WHERE id = 4 FOR NO KEY UPDATE;
  PERFORM 1 FROM seats WHERE id = 5 FOR SHARE;
END $$;
SELECT s.id, s.seat_no, r.modes
FROM pgrowlocks('seats') AS r
JOIN seats AS s ON s.ctid = r.locked_row
ORDER BY s.id;
ROLLBACK;
~~~

~~~text
id | seat_no | modes
1 | 1A | {"For Update"}
2 | 1B | {"For Update"}
4 | 2A | {"For No Key Update"}
5 | 2B | {"For Share"}
~~~

📌 **Interview term: row-level lock modes** — PostgreSQL has \`FOR UPDATE\` (exclusive, may delete or change the key), \`FOR NO KEY UPDATE\` (exclusive but promises not to change the key; what an ordinary UPDATE takes), \`FOR SHARE\` (shared, blocks writers) and \`FOR KEY SHARE\` (weakest; what a foreign-key check takes on the referenced row). The full conflict table is in the [PostgreSQL 16 docs, explicit locking](https://www.postgresql.org/docs/16/explicit-locking.html).

Why it matters, from the two-session runs:

| A holds on seat 1 | B does | Result |
| :--- | :--- | :--- |
| \`FOR UPDATE\` | \`INSERT INTO bookings (..., seat_id, ...) VALUES (3, 1, 'Lena')\` (foreign key to seats) | **waits**: the FK check needs \`FOR KEY SHARE\`, which conflicts with \`FOR UPDATE\` |
| \`FOR NO KEY UPDATE\` | the same INSERT | succeeds at once |
| \`FOR UPDATE\` | \`SELECT ... FOR SHARE NOWAIT\` | \`55P03\` |
| \`FOR UPDATE\` | \`SELECT ... FOR KEY SHARE NOWAIT\` | \`55P03\` |
| \`FOR UPDATE\` | plain \`SELECT\` | returns at once |

So if you lock a parent row only to change its non-key columns, \`FOR NO KEY UPDATE\` avoids blocking every insert of a child row that references it.

## 6. Other Engines

| Engine | Wait | Fail fast | Skip locked |
| :--- | :--- | :--- | :--- |
| PostgreSQL 16 (run) | \`FOR UPDATE\` | \`FOR UPDATE NOWAIT\`, \`lock_timeout\` | \`FOR UPDATE SKIP LOCKED\` |
| MySQL 8.0 InnoDB | \`FOR UPDATE\` | \`FOR UPDATE NOWAIT\` | \`FOR UPDATE SKIP LOCKED\`; both added in 8.0.1 ([MySQL blog: Using SKIP LOCKED and NOWAIT](https://dev.mysql.com/blog-archive/mysql-8-0-1-using-skip-locked-and-nowait-to-handle-hot-rows/)) |
| SQL Server | \`WITH (UPDLOCK)\` table hint | \`SET LOCK_TIMEOUT 0\` or the \`NOWAIT\` hint | \`WITH (UPDLOCK, READPAST)\`; READPAST skips locked rows and, in most cases, pages ([Microsoft Learn, table hints](https://learn.microsoft.com/pl-pl/sql/t-sql/queries/hints-transact-sql-table)) |
| SQLite (run) | none: \`near "UPDATE": syntax error\`; the whole database has one writer | \`busy_timeout\` 0 | none |

## 7. Verified: Running the Code

The three examples were run by the project verifier: the first on sql.js 1.10.2 (SQLite) seeded with the schema above, the other two on PostgreSQL 16.15 in a throwaway database seeded with the same schema. The free-seat query printed:

~~~text
id | seat_no | status
1 | 1A | free
2 | 1B | free
4 | 2A | free
5 | 2B | free
~~~

\`SKIP LOCKED\` with no competing session printed:

~~~text
id | seat_no | status
1 | 1A | free
2 | 1B | free
~~~

The \`pgrowlocks\` query printed:

~~~text
id | seat_no | modes
1 | 1A | {"For Update"}
2 | 1B | {"For Update"}
4 | 2A | {"For No Key Update"}
5 | 2B | {"For Share"}
~~~

Every two-session behaviour in sections 2, 3 and 5 (wait, NOWAIT, SKIP LOCKED, lock_timeout, the re-check after waiting, the foreign-key insert, the weaker modes) was run with two real \`psql\` sessions against a scratch PostgreSQL 16.15 database (\`sqlw_b13\`, dropped afterwards); the errors and rows are copied from that run.

## Common Pitfalls

- **Locking outside a transaction.** In autocommit mode \`SELECT ... FOR UPDATE\` releases its lock as soon as the statement ends. Wrap the read and the write in one \`BEGIN ... COMMIT\`.
- **Using SKIP LOCKED for anything that must see every row.** Totals, exports and validations silently miss locked rows.
- **Forgetting that NOWAIT aborts the transaction.** After \`55P03\` you must roll back (or roll back to a savepoint) before the next statement.
- **Plain FOR UPDATE in an HTTP request with no limit.** One stuck transaction makes every request queue behind it; set \`lock_timeout\` or use NOWAIT.
- **FOR UPDATE when NO KEY UPDATE would do.** The strongest mode also blocks foreign-key inserts that reference the row.
- **Locking more rows than you need.** \`FOR UPDATE\` without a selective WHERE (or with a join) locks every returned row; use \`FOR UPDATE OF table\` to limit it to one table in a join.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they share:</strong> <span style="color:#f0e2c8;">All three are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT ... FOR UPDATE</code>: lock the rows I read until my transaction ends, so nobody else can change or lock them in between. They differ only in what happens when a row is <strong style="color:#ffca28;">already locked</strong> by someone else.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. FOR UPDATE:</strong> <span style="color:#f0e2c8;">Waits. The second session blocks until the first commits or rolls back, then (at READ COMMITTED) re-checks the row and continues. Right when you must process *that* row, such as both accounts of a transfer, locked in id order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. NOWAIT:</strong> <span style="color:#f0e2c8;">Fails at once with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">55P03 could not obtain lock on row</code>. Right for interactive flows: tell the user the seat or document is being edited and let them try again, instead of hanging a web request.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. SKIP LOCKED:</strong> <span style="color:#f0e2c8;">Leaves locked rows out of the result. Right when any free row will do: job queues, ticket pools, assigning the next free seat. Each worker gets a different row with no waiting. Wrong when you need a consistent view, because results silently omit rows.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;">Plain SELECTs are never blocked. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lock_timeout</code> sits between waiting forever and NOWAIT. And <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR NO KEY UPDATE</code>, which a plain UPDATE takes, is weaker: it does not block inserts that reference the row through a foreign key, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR UPDATE</code> does.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the locked row changes while I wait with plain <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">FOR UPDATE</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At READ COMMITTED PostgreSQL re-reads the new version and re-checks the WHERE clause. In my test, B waited for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">... WHERE id = 1 AND status = 'free' FOR UPDATE</code> while A sold the seat; after A committed, B got zero rows instead of a stale free seat.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is NOWAIT different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lock_timeout</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">NOWAIT applies to one statement and fails immediately. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET lock_timeout = '500ms'</code> lets any statement wait up to that long, then fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">55P03 canceling statement due to lock timeout</code>. Same SQLSTATE, so one handler covers both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can SKIP LOCKED return fewer rows than LIMIT?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code> counts only rows that could be locked: the lock step skips locked rows and the limit keeps pulling more candidates. If fewer unlocked candidates exist than the limit, you get fewer, and if all are locked you get none. Callers must treat an empty result as "nothing available right now", not "nothing exists".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does FOR UPDATE block readers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. In my run, while A held <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR UPDATE</code> on seat 1, B could still <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code> it normally and saw the committed values. Only other locking reads, UPDATEs and DELETEs wait.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you use in MySQL or SQL Server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">MySQL 8.0 has the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR UPDATE NOWAIT</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR UPDATE SKIP LOCKED</code> on InnoDB. SQL Server has no clause; the usual equivalent is the table hint <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WITH (UPDLOCK, READPAST, ROWLOCK)</code> for skip-locked, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET LOCK_TIMEOUT 0</code> or the NOWAIT hint for fail-fast.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Locking read | A SELECT with a locking clause; its rows stay locked until the transaction ends |
| FOR UPDATE | Lock rows exclusively; wait if another transaction holds a conflicting lock |
| NOWAIT | Raise \`55P03\` immediately instead of waiting |
| SKIP LOCKED | Return only rows that can be locked right now, skipping the rest |
| lock_timeout | Maximum wait for a lock per statement, then \`55P03\` |
| Row-level lock modes | FOR UPDATE, FOR NO KEY UPDATE, FOR SHARE, FOR KEY SHARE, strongest to weakest |

**Conclusion:** The three clauses lock the same way and differ only when the row is already taken: \`FOR UPDATE\` waits (and at READ COMMITTED re-checks the row, so in the run above a seat sold in the meantime simply disappeared from B's result), \`NOWAIT\` fails at once with \`55P03\`, and \`SKIP LOCKED\` quietly hands you a different row. Pick by what the caller needs: this exact row and time to wait, this exact row and a human waiting, or any free row. Add \`lock_timeout\` for a bounded wait, lock in a consistent order, and use the weaker \`FOR NO KEY UPDATE\` when you are not touching the key.`,
    examples: [
      {
        label: `The rows you would lock: free seats on flight CP101`,
        code: `SELECT id, seat_no, status
FROM seats
WHERE flight = 'CP101' AND status = 'free'
ORDER BY seat_no;`,
      },
      {
        label: `PostgreSQL: take two free seats with FOR UPDATE SKIP LOCKED (nobody else holds a lock here)`,
        code: `SELECT id, seat_no, status
FROM seats
WHERE flight = 'CP101' AND status = 'free'
ORDER BY seat_no
LIMIT 2
FOR UPDATE SKIP LOCKED;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: the four row-lock strengths, seen with pgrowlocks inside one transaction`,
        code: `CREATE EXTENSION IF NOT EXISTS pgrowlocks;
BEGIN;
DO $$ BEGIN
  PERFORM 1 FROM seats WHERE id IN (1, 2) FOR UPDATE;
  PERFORM 1 FROM seats WHERE id = 4 FOR NO KEY UPDATE;
  PERFORM 1 FROM seats WHERE id = 5 FOR SHARE;
END $$;
SELECT s.id, s.seat_no, r.modes
FROM pgrowlocks('seats') AS r
JOIN seats AS s ON s.ctid = r.locked_row
ORDER BY s.id;
ROLLBACK;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `SKIP LOCKED for job queues — how do you build a concurrent queue without race conditions?`,
    difficulty: "hard",
    seoDescription: `Build a PostgreSQL job queue with FOR UPDATE SKIP LOCKED: the atomic claim, why naive claims double-process, leases, reapers and crash safety.`,
    description: `**Question presented to candidate:**
"We want to run background jobs from a PostgreSQL table instead of adding a message broker. Several workers will poll the same table. How do you make sure each job is picked up by exactly one worker, workers do not block each other, and a job is not lost when a worker crashes?"

**What a strong answer should cover:**
- Why the naive "SELECT the oldest queued job, then UPDATE it" double-claims under concurrency, and why plain \`FOR UPDATE\` is correct but makes workers queue one behind another
- The claim statement: \`SELECT ... ORDER BY ... LIMIT 1 FOR UPDATE SKIP LOCKED\` inside a CTE that \`UPDATE ... RETURNING\` the job, so claiming is one atomic step
- Crash safety: either keep the transaction open while working (a crash rolls back and releases the row) or commit a lease (\`locked_until\`) and have a reaper re-queue expired jobs; attempts counter and a dead-letter state
- Indexing: a partial index on the ready jobs so each claim is an index lookup, not a scan of finished rows; table bloat and vacuum on a busy queue
- Engine notes: SKIP LOCKED since PostgreSQL 9.5 and in MySQL 8.0; SQLite has one writer, so a single \`UPDATE ... RETURNING\` claim is safe there but does not scale out
- Limits: ordering is only approximate with SKIP LOCKED, at-least-once delivery means handlers must be idempotent, LISTEN/NOTIFY can replace tight polling

**Clarifying questions expected:**
- How many jobs per second and how long does a job take (seconds or minutes)? That decides between holding the transaction open and using a lease.
- Is strict ordering required, or is "roughly oldest first" acceptable?
- What should happen to a job that keeps failing?

**Code / implementation expected:** Yes — the jobs table, the claim query, the completion and the reaper for expired leases.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY,
  queue TEXT NOT NULL,
  priority INTEGER NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  run_after TEXT NOT NULL,
  locked_by TEXT,
  locked_until TEXT,
  payload TEXT NOT NULL
);
CREATE INDEX jobs_ready_idx ON jobs (queue, priority, id) WHERE status = 'queued';
INSERT INTO jobs (id, queue, priority, status, attempts, run_after, locked_by, locked_until, payload) VALUES
  (1, 'email', 1, 'done',    1, '2026-10-17 09:00', NULL,       NULL,               'welcome mail to Ana'),
  (2, 'email', 1, 'queued',  0, '2026-10-17 09:05', NULL,       NULL,               'receipt for order 1001'),
  (3, 'email', 2, 'queued',  0, '2026-10-17 09:06', NULL,       NULL,               'password reset for Bo'),
  (4, 'email', 1, 'running', 1, '2026-10-17 09:07', 'worker-c', '2026-10-17 09:12', 'receipt for order 1002'),
  (5, 'email', 1, 'queued',  0, '2026-10-17 09:08', NULL,       NULL,               'receipt for order 1003'),
  (6, 'email', 3, 'queued',  2, '2026-10-17 09:30', NULL,       NULL,               'digest for Cy'),
  (7, 'video', 1, 'queued',  0, '2026-10-17 09:09', NULL,       NULL,               'transcode clip 77'),
  (8, 'email', 1, 'running', 5, '2026-10-17 08:00', 'worker-d', '2026-10-17 08:05', 'bounce report');
\`\`\``,
    answer: `**Target Audience:** Backend developers who want a reliable job queue on PostgreSQL without a broker, and candidates asked to design one in an interview.
**Difficulty:** Hard
**Engines:** PostgreSQL 16.15 (two real \`psql\` sessions for every race, the verifier for the claim and plan) and SQLite via sql.js 1.10.2 for the runnable claim and reaper. MySQL facts are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result, plan and error message below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A restaurant kitchen has a rail of order tickets and four cooks. The rule is simple: take the oldest ticket and cook it.

If two cooks look at the rail at the same moment, both see the same oldest ticket, both start cooking it, and table 12 gets two steaks while table 13 gets nothing. If instead the rule is "one cook at a time may touch the rail", nobody doubles up, but three cooks stand in line while one reads tickets. The kitchen that works has a third rule: **if a ticket is already in somebody's hand, skip it and take the next one**.

That third rule is \`SKIP LOCKED\`. The lock modes themselves are compared in [FOR UPDATE vs FOR UPDATE NOWAIT vs FOR UPDATE SKIP LOCKED — which to use when?](/interview-question/for-update-vs-for-update-nowait-vs-for-update-skip-locked-which-to-use-when); this page builds the full queue.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many jobs per second, and how long does one take? | Short jobs can keep the claiming transaction open; long ones need a lease and a reaper |
| Must jobs run in strict order? | SKIP LOCKED gives roughly-oldest-first, not strict FIFO; strict order means one consumer per key |
| What happens on failure, and how many retries? | Decides the \`attempts\` column, backoff via \`run_after\` and a \`failed\` (dead-letter) state |
| Can a job safely run twice? | Every crash-safe queue is at least once; non-idempotent handlers need a dedupe key |
| Is a broker already available? | Above some throughput a dedicated broker is simpler; the table queue wins on transactional enqueue |

## 3. The Table

The schema above has one row per job: which \`queue\` it belongs to, a \`priority\` (1 is most urgent), a \`status\` (\`queued\`, \`running\`, \`done\`, \`failed\`), an \`attempts\` counter, \`run_after\` (do not start before this time; used for delays and retry backoff), and who holds it (\`locked_by\`) until when (\`locked_until\`).

📌 **Interview term: transactional outbox / table queue** — storing jobs in a database table. Its big advantage over a broker: enqueuing a job is part of the same transaction as the business change (insert the order *and* its "send receipt" job, or neither).

The partial index covers only queued rows, so it stays small no matter how many done jobs accumulate:

~~~sql
CREATE INDEX jobs_ready_idx ON jobs (queue, priority, id) WHERE status = 'queued';
~~~

📌 **Interview term: partial index** — an index with a WHERE clause; only matching rows are indexed. Both PostgreSQL and SQLite support it, and the schema above created it on both.

## 4. Two Wrong Ways, Run for Real

### Wrong 1: read, then update

Each worker reads the oldest queued job, then marks it running. Two sessions on PostgreSQL 16.15 at the default READ COMMITTED:

| Step | worker-a | worker-b |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` | \`BEGIN;\` |
| 2 | \`SELECT id FROM jobs WHERE queue = 'email' AND status = 'queued' ORDER BY priority, id LIMIT 1;\` returns **2** | |
| 3 | | same SELECT returns **2** |
| 4 | \`UPDATE jobs SET status = 'running', locked_by = 'worker-a' WHERE id = 2;\` \`COMMIT;\` | |
| 5 | | \`UPDATE jobs SET status = 'running', locked_by = 'worker-b' WHERE id = 2;\` \`COMMIT;\` |

Both workers believe they own job 2 and both send receipt 1001. Afterwards the row only remembers the last writer:

~~~text
id | status | locked_by
2 | running | worker-b
~~~

📌 **Interview term: race condition (double claim)** — two workers both decide the same job is free because each checked before the other changed it. The check and the change must be one atomic step.

### Wrong 2: one statement, but no lock

\`UPDATE ... WHERE id = (SELECT id ... LIMIT 1) RETURNING id\` looks atomic. It is not, in PostgreSQL: the subquery reads a snapshot without taking a lock.

| Step | worker-a | worker-b |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` \`UPDATE jobs SET status = 'running', locked_by = 'worker-a' WHERE id = (SELECT id FROM jobs WHERE queue = 'email' AND status = 'queued' ORDER BY priority, id LIMIT 1) RETURNING id, locked_by;\` returns \`2 | worker-a\` | |
| 2 | | \`BEGIN;\` same statement with \`worker-b\`: **waits** on row 2 |
| 3 | \`COMMIT;\` | unblocked, returns \`2 | worker-b\` |

The subquery in B had already chosen id 2 from its snapshot; after waiting, PostgreSQL re-checked the outer condition \`id = 2\`, which still held, and B claimed job 2 a second time. Adding \`AND status = 'queued'\` to the outer WHERE stopped the double claim, but B then returned **zero rows**: it had waited for nothing and did not move on to job 5.

### Correct but slow: plain FOR UPDATE

\`SELECT id ... ORDER BY priority, id LIMIT 1 FOR UPDATE\` is correct: in the run, worker-b waited while worker-a held job 2, and after A committed it received job **5**. But "waited" is the problem: with plain \`FOR UPDATE\` every worker queues behind the one that holds the head of the queue, so ten workers process jobs about as fast as one.

## 5. The Right Claim: FOR UPDATE SKIP LOCKED

Select and lock the next ready job, skipping anything another worker holds, and mark it in the same statement:

~~~sql
WITH next_job AS (
  SELECT id
  FROM jobs
  WHERE queue = 'email'
    AND status = 'queued'
    AND run_after <= '2026-10-17 09:10'
  ORDER BY priority, id
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE jobs
SET status = 'running',
    attempts = attempts + 1,
    locked_by = 'worker-a',
    locked_until = '2026-10-17 09:15'
FROM next_job
WHERE jobs.id = next_job.id
RETURNING jobs.id, jobs.payload, jobs.attempts, jobs.locked_by;
~~~

~~~text
id | payload | attempts | locked_by
2 | receipt for order 1001 | 1 | worker-a
~~~

📌 **Interview term: claim (dequeue) query** — the single statement that picks a job and marks it as taken. With \`SKIP LOCKED\` inside a CTE and \`UPDATE ... RETURNING\` outside, picking and marking cannot be separated.

Two workers running it concurrently, each in an open transaction:

| Step | worker-a | worker-b |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` claim returns \`2 | receipt for order 1001 | worker-a\` | |
| 2 | | \`BEGIN;\` claim returns \`5 | receipt for order 1003 | worker-b\` **at once** |
| 3 | \`COMMIT;\` | \`COMMIT;\` |

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Two workers run the same claim query at the same moment; SKIP LOCKED gives worker A job 2 and worker B job 5, so neither waits and no job is claimed twice">
  <defs>
    <marker id="sql13q4-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="180" height="70" rx="8"/>
  <text class="d-text" x="120" y="70" text-anchor="middle">worker-a</text>
  <text class="d-sub" x="120" y="94" text-anchor="middle">claim query</text>
  <rect class="d-box-muted" x="30" y="220" width="180" height="70" rx="8"/>
  <text class="d-text" x="120" y="250" text-anchor="middle">worker-b</text>
  <text class="d-sub" x="120" y="274" text-anchor="middle">same query</text>
  <rect class="d-box-accent" x="470" y="40" width="250" height="60" rx="8"/>
  <text class="d-text" x="595" y="76" text-anchor="middle">job 2, locked by A</text>
  <rect class="d-box" x="470" y="135" width="250" height="60" rx="8"/>
  <text class="d-text" x="595" y="171" text-anchor="middle">job 3, priority 2</text>
  <rect class="d-box-accent" x="470" y="230" width="250" height="60" rx="8"/>
  <text class="d-text" x="595" y="266" text-anchor="middle">job 5, locked by B</text>
  <path class="d-edge-accent" d="M 212 72 L 464 70" marker-end="url(#sql13q4-a)"/>
  <path class="d-edge-dashed" d="M 212 245 L 464 82" marker-end="url(#sql13q4-a)"/>
  <text class="d-sub" x="300" y="170" text-anchor="middle">skips 2</text>
  <path class="d-edge-accent" d="M 212 262 L 464 262" marker-end="url(#sql13q4-a)"/>
</svg>

B skipped job 2 (locked by A) and job 3 (priority 2 comes after priority 1), and took job 5. No waiting, no double claim. Jobs 6 (\`run_after\` 09:30 is in the future) and 7 (the \`video\` queue) were never candidates.

📌 **Interview term: SKIP LOCKED** — a locking-read option that leaves out rows another transaction has locked. PostgreSQL added it in 9.5 ([2ndQuadrant: What is SKIP LOCKED for in PostgreSQL 9.5?](https://blog.2ndquadrant.com/tag/queue/)); MySQL added it in 8.0.1 ([MySQL blog](https://dev.mysql.com/blog-archive/mysql-8-0-1-using-skip-locked-and-nowait-to-handle-hot-rows/)).

The plan (simplified query, \`enable_seqscan\` off because the table has 8 rows) shows the order that makes it work: the index produces candidates in \`priority, id\` order, \`LockRows\` tries to lock each one and drops those it cannot, and \`Limit\` stops at the first success:

~~~text
QUERY PLAN
Limit
  ->  LockRows
        ->  Index Scan using jobs_ready_idx on jobs
              Index Cond: (queue = 'email'::text)
              Filter: (status = 'queued'::text)
~~~

The planner may pick another plan on other data; on a real queue the partial index keeps this a few index pages per claim.

## 6. Crash Safety: Two Designs

What if a worker dies halfway through a job?

### Design 1: keep the transaction open while working

\`BEGIN\`, claim, do the work, mark \`done\`, \`COMMIT\`. If the worker crashes, PostgreSQL rolls the transaction back: the status returns to \`queued\` and the row lock disappears. Tested by terminating worker-a's session (\`pg_terminate_backend\`) while it held job 2; worker-b's claim immediately returned:

~~~text
id | payload | attempts | locked_by
2 | receipt for order 1001 | 1 | worker-b
~~~

Simple and exactly right for jobs of a few seconds. The costs: one open connection and one open transaction per busy worker, and long transactions hold back vacuum on every table.

### Design 2: commit the claim, hold a lease

Claim and \`COMMIT\` at once (the claim sets \`locked_until\`), do the work outside any transaction, then \`UPDATE jobs SET status = 'done' WHERE id = ? AND locked_by = ?\`. A crashed worker leaves its job \`running\` with an old lease, so a reaper puts expired leases back:

~~~sql
UPDATE jobs
SET status = CASE WHEN attempts >= 5 THEN 'failed' ELSE 'queued' END,
    locked_by = NULL,
    locked_until = NULL
WHERE status = 'running'
  AND locked_until < '2026-10-17 09:20';

SELECT id, status, attempts, locked_by, payload
FROM jobs
WHERE id IN (4, 8)
ORDER BY id;
~~~

~~~text
id | status | attempts | locked_by | payload
4 | queued | 1 | NULL | receipt for order 1002
8 | failed | 5 | NULL | bounce report
~~~

Job 4's lease (09:12) had expired, so it is queued again; job 8 had used all 5 attempts, so it moved to \`failed\` instead of looping forever.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Job life cycle: queued, claimed to running with a lease, then done; an expired lease returns the job to queued, and too many attempts move it to failed">
  <defs>
    <marker id="sql13q4-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="95" y="76" text-anchor="middle">queued</text>
  <rect class="d-box-accent" x="300" y="40" width="160" height="60" rx="8"/>
  <text class="d-text" x="380" y="76" text-anchor="middle">running</text>
  <rect class="d-box" x="590" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="665" y="76" text-anchor="middle">done</text>
  <rect class="d-box-muted" x="590" y="170" width="150" height="60" rx="8"/>
  <text class="d-text" x="665" y="206" text-anchor="middle">failed</text>
  <path class="d-edge" d="M 172 62 L 294 62" marker-end="url(#sql13q4-b)"/>
  <text class="d-sub" x="233" y="40" text-anchor="middle">claim</text>
  <path class="d-edge" d="M 462 70 L 584 70" marker-end="url(#sql13q4-b)"/>
  <text class="d-sub" x="523" y="48" text-anchor="middle">finish</text>
  <path class="d-edge-dashed" d="M 340 102 L 340 150 L 95 150 L 95 106" marker-end="url(#sql13q4-b)"/>
  <text class="d-sub" x="218" y="175" text-anchor="middle">lease expired</text>
  <path class="d-edge-dashed" d="M 420 102 L 420 200 L 584 200" marker-end="url(#sql13q4-b)"/>
  <text class="d-sub" x="500" y="225" text-anchor="middle">attempts used up</text>
</svg>

📌 **Interview term: lease (visibility timeout)** — a time limit on a claim. If the worker does not finish or renew it in time, the job becomes available again. The same idea as SQS visibility timeouts.

📌 **Interview term: at-least-once delivery** — any crash-safe queue can run a job twice (the worker finished the work but died before marking it done). Handlers must be **idempotent**, for example by recording a dedupe key in the same transaction as their effect.

📌 **Interview term: dead-letter state** — where jobs go after too many failed attempts (\`failed\` here), so one poisoned job cannot block or loop forever.

For retries with a delay, set \`run_after\` to now plus a backoff when a job fails; the claim query only picks jobs whose \`run_after\` has passed.

## 7. The Same Claim on SQLite

SQLite allows only one writer at a time for the whole database, so the subquery race from section 4 cannot happen there: the whole \`UPDATE\` runs while holding the write lock. A single \`UPDATE ... RETURNING\` (RETURNING arrived in SQLite 3.35.0, per the [SQLite RETURNING docs](https://www2.sqlite.org/lang_returning.html); sql.js 1.10.2 ships 3.45) is a correct claim:

~~~sql
UPDATE jobs
SET status = 'running',
    attempts = attempts + 1,
    locked_by = 'worker-a',
    locked_until = '2026-10-17 09:15'
WHERE id = (
  SELECT id FROM jobs
  WHERE queue = 'email'
    AND status = 'queued'
    AND run_after <= '2026-10-17 09:10'
  ORDER BY priority, id
  LIMIT 1
)
RETURNING id, payload, attempts, locked_by;
~~~

~~~text
id | payload | attempts | locked_by
2 | receipt for order 1001 | 1 | worker-a
~~~

Correct, but every worker is serialised by the database lock, which is fine for one process and not for a fleet. Do not copy this statement to PostgreSQL: section 4 showed it double-claims there.

## 8. Operating It

- **Index the ready set** (the partial index above) and keep \`ORDER BY\` matching it.
- **Remove finished jobs.** Delete or move \`done\` rows regularly. A queue table is updated constantly, so it relies on autovacuum; watch for dead tuples.
- **Batch claims** with \`LIMIT 10\` when jobs are tiny, to cut round trips.
- **Avoid tight polling.** Sleep with backoff when the claim returns nothing; optionally \`LISTEN\` on a channel that the enqueuing transaction \`NOTIFY\`s.
- **Know when to stop.** At high throughput, or with many consumers that need fan-out, a dedicated broker is simpler. The table queue wins when enqueue must be atomic with the business write.

## 9. Verified: Running the Code

The four examples were run by the project verifier: the first two on sql.js 1.10.2 (SQLite) seeded with the schema above, the last two on PostgreSQL 16.15 in a throwaway database seeded with the same schema. The SQLite claim printed:

~~~text
id | payload | attempts | locked_by
2 | receipt for order 1001 | 1 | worker-a
~~~

The reaper printed:

~~~text
id | status | attempts | locked_by | payload
4 | queued | 1 | NULL | receipt for order 1002
8 | failed | 5 | NULL | bounce report
~~~

The PostgreSQL SKIP LOCKED claim printed:

~~~text
id | payload | attempts | locked_by
2 | receipt for order 1001 | 1 | worker-a
~~~

The claim plan printed:

~~~text
QUERY PLAN
Limit
  ->  LockRows
        ->  Index Scan using jobs_ready_idx on jobs
              Index Cond: (queue = 'email'::text)
              Filter: (status = 'queued'::text)
~~~

Every two-session timeline (read-then-update, the unlocked subquery with and without the status re-check, plain \`FOR UPDATE\`, the concurrent SKIP LOCKED claim, the terminated worker) was run with two real \`psql\` sessions against a scratch PostgreSQL 16.15 database (\`sqlw_b13\`, dropped afterwards). The SQLite claim and the reaper also ran on PostgreSQL with the same rows.

## Common Pitfalls

- **Claiming in two statements.** SELECT then UPDATE without a lock double-claims; the run above gave job 2 to both workers.
- **Trusting \`WHERE id = (SELECT ... LIMIT 1)\` on PostgreSQL.** The subquery does not lock; add \`FOR UPDATE SKIP LOCKED\` inside it (or use the CTE form).
- **Plain \`FOR UPDATE\` for a queue.** Correct, but workers queue behind each other and throughput collapses to one.
- **No lease or no reaper with committed claims.** A crashed worker leaves its job \`running\` forever.
- **Non-idempotent handlers.** At-least-once delivery means a job can run twice; make the effect safe to repeat.
- **Letting done rows pile up without an index on the ready set.** Every claim then scans history; use a partial index and archive old jobs.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">Several workers poll one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jobs</code> table. A naive read-then-update lets two workers read the same queued job and both process it; plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR UPDATE</code> fixes that but makes every worker wait for the one ahead of it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The claim:</strong> <span style="color:#f0e2c8;">One statement: a CTE selects the next ready job <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY priority, id LIMIT 1 FOR UPDATE SKIP LOCKED</code>, and the outer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... SET status = 'running' ... RETURNING</code> marks and returns it. Locked jobs are skipped, so concurrent workers each get a different job with no waiting.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Crash safety:</strong> <span style="color:#f0e2c8;">Short jobs: keep the transaction open while working; if the worker dies, the transaction rolls back and the job is back. Long jobs: commit the claim with a lease <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">locked_until</code>, and a reaper re-queues expired leases, counting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attempts</code> and moving a job to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">failed</code> after N tries.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Performance:</strong> <span style="color:#f0e2c8;">A partial index on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(queue, priority, id) WHERE status = 'queued'</code> keeps each claim an index lookup no matter how many finished jobs pile up. Delete or archive done jobs, and watch vacuum, because a queue table is updated constantly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Honest limits:</strong> <span style="color:#f0e2c8;">Delivery is at least once, so handlers must be idempotent. Order is roughly priority-then-age, not strict. For very high throughput a broker may still be better; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LISTEN/NOTIFY</code> can wake workers instead of tight polling.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UPDATE jobs SET status = 'running' WHERE id = (SELECT id ... LIMIT 1) RETURNING id</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL that subquery reads a snapshot without locking. In my two-session run both workers picked job 2; the second waited for the first, then re-checked only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id = 2</code>, which still matched, and claimed it again. Adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status = 'queued'</code> to the outer WHERE stopped the double claim, but then the second worker got zero rows instead of the next job.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does SKIP LOCKED cost you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A consistent view. Each worker sees the queue minus whatever others hold locked, so you lose strict FIFO and you must never use the same query for counting or reporting.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Hold the transaction open or use a lease?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Holding it open is simplest and crash-safe: in my test, killing the worker session released job 2 and the next worker claimed it at once. But a long-open transaction holds back vacuum and a connection per worker. For jobs longer than a few seconds, commit the claim and use a lease plus a reaper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid workers polling in a tight loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sleep with backoff when a claim returns no row, and optionally <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LISTEN jobs</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOTIFY</code> on insert to wake idle workers. The SKIP LOCKED claim stays the source of truth; notifications are only hints.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you do this on SQLite or MySQL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">MySQL 8.0 InnoDB supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR UPDATE SKIP LOCKED</code>, so the same design works with its own syntax. SQLite has a single writer, so one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... RETURNING</code> claim is atomic and safe, but workers are serialised by the database lock; fine for one process, not a fleet.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Transactional outbox / table queue | Jobs stored as rows, enqueued in the same transaction as the business change |
| Partial index | An index that covers only rows matching its WHERE clause |
| Race condition (double claim) | Two workers both take the same job because check and change were separate |
| Claim (dequeue) query | One statement that picks and marks a job atomically |
| SKIP LOCKED | Locking-read option that leaves out rows other transactions hold |
| Lease (visibility timeout) | Time limit on a claim, after which the job becomes available again |
| At-least-once delivery | A job may run more than once, so handlers must be idempotent |
| Dead-letter state | Where a job goes after its attempts are used up |

**Conclusion:** A PostgreSQL job queue is safe when picking a job and marking it are one statement, and fast when workers never wait for each other: a CTE that selects the next ready job \`FOR UPDATE SKIP LOCKED\` and an \`UPDATE ... RETURNING\` that claims it. The runs on this page showed the alternatives failing in exactly the ways interviewers ask about: read-then-update and the unlocked subquery both handed job 2 to two workers, and plain \`FOR UPDATE\` made the second worker wait. Add crash safety (an open transaction for short jobs, a lease and a reaper for long ones), an attempts limit with a failed state, a partial index on the ready set and idempotent handlers, and the table is a dependable queue.`,
    examples: [
      {
        label: `SQLite: claim the next ready email job in one UPDATE ... RETURNING`,
        code: `UPDATE jobs
SET status = 'running',
    attempts = attempts + 1,
    locked_by = 'worker-a',
    locked_until = '2026-10-17 09:15'
WHERE id = (
  SELECT id FROM jobs
  WHERE queue = 'email'
    AND status = 'queued'
    AND run_after <= '2026-10-17 09:10'
  ORDER BY priority, id
  LIMIT 1
)
RETURNING id, payload, attempts, locked_by;`,
      },
      {
        label: `Re-queue jobs whose lease expired, or fail them after 5 attempts`,
        code: `UPDATE jobs
SET status = CASE WHEN attempts >= 5 THEN 'failed' ELSE 'queued' END,
    locked_by = NULL,
    locked_until = NULL
WHERE status = 'running'
  AND locked_until < '2026-10-17 09:20';

SELECT id, status, attempts, locked_by, payload
FROM jobs
WHERE id IN (4, 8)
ORDER BY id;`,
      },
      {
        label: `PostgreSQL: the concurrent claim with FOR UPDATE SKIP LOCKED inside a CTE`,
        code: `WITH next_job AS (
  SELECT id
  FROM jobs
  WHERE queue = 'email'
    AND status = 'queued'
    AND run_after <= '2026-10-17 09:10'
  ORDER BY priority, id
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE jobs
SET status = 'running',
    attempts = attempts + 1,
    locked_by = 'worker-a',
    locked_until = '2026-10-17 09:15'
FROM next_job
WHERE jobs.id = next_job.id
RETURNING jobs.id, jobs.payload, jobs.attempts, jobs.locked_by;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: the claim plan, LockRows under Limit over the partial index`,
        code: `SET enable_seqscan = off;
EXPLAIN (COSTS OFF)
SELECT id
FROM jobs
WHERE queue = 'email' AND status = 'queued'
ORDER BY priority, id
LIMIT 1
FOR UPDATE SKIP LOCKED;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is an UPSERT?`,
    difficulty: "medium",
    seoDescription: `What an UPSERT is, why it beats check-then-insert, and how to write it in PostgreSQL, SQLite, MySQL and SQL Server, with INSERT OR REPLACE and MERGE traps.`,
    description: `**Question presented to candidate:**
"What is an UPSERT? Show me how you would write one, and tell me why it is better than checking whether the row exists first."

**What a strong answer should cover:**
- Definition: insert a row, or update it if a row with the same key already exists, as one statement
- Why not "SELECT, then INSERT or UPDATE": two sessions can both see no row and both insert; one fails with a unique violation or a write is lost
- It needs a unique constraint or primary key to decide what "already exists" means; the conflict target must match one
- Syntax by engine: PostgreSQL and SQLite \`INSERT ... ON CONFLICT (key) DO UPDATE SET col = excluded.col\` or \`DO NOTHING\`; MySQL \`INSERT ... ON DUPLICATE KEY UPDATE\`; SQL Server and Oracle \`MERGE\`; PostgreSQL also has \`MERGE\` since 15
- Pitfalls: SQLite \`INSERT OR REPLACE\` deletes and re-inserts (other columns reset), duplicate keys within one statement, MERGE is not a race-free upsert

**Code / implementation expected:** Yes — a counter upsert with \`ON CONFLICT DO UPDATE\`, and \`DO NOTHING\`.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE page_views (
  page TEXT PRIMARY KEY,
  views INTEGER NOT NULL,
  last_seen TEXT NOT NULL
);
INSERT INTO page_views (page, views, last_seen) VALUES
  ('/home',    120, '2026-10-16'),
  ('/pricing',  45, '2026-10-16'),
  ('/blog',     30, '2026-10-15');
CREATE TABLE products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  updated_on TEXT NOT NULL
);
INSERT INTO products (sku, name, price, stock, updated_on) VALUES
  ('KB-01', 'Keyboard', 49.00, 12, '2026-10-01'),
  ('MS-02', 'Mouse',    19.00, 40, '2026-10-01'),
  ('HD-03', 'Headset',  89.00,  5, '2026-10-01');
CREATE TABLE price_feed (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL
);
INSERT INTO price_feed (sku, name, price) VALUES
  ('KB-01', 'Keyboard', 45.00),
  ('MS-02', 'Mouse',    19.00),
  ('CM-04', 'Webcam',   59.00);
\`\`\``,
    answer: `**Target Audience:** Beginners who know INSERT and UPDATE and want to learn UPSERT from zero; candidates who need the one-minute answer and the engine differences.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, which runs the examples on this page) and PostgreSQL 16.15 (the same examples plus MERGE, and two real \`psql\` sessions for the race). MySQL and SQL Server facts are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A library keeps a card for every member. When someone walks in, the librarian does one of two things: if the member already has a card, she updates the "last visit" date on it; if not, she writes a new card. Simple, as long as there is one librarian.

Now put two librarians at two desks, and let the same new member show up at both desks at the same moment (a phone app and a website, say). Both librarians check the drawer, both find no card, both write one. The library now has two cards for one person, or, if the drawer refuses duplicates, one librarian gets an angry error.

An UPSERT is the librarian saying "insert this card, and if one already exists for this member, update that one instead", as a single action the drawer itself enforces.

## 2. The Definition

📌 **Interview term: UPSERT** — a single statement that inserts a row or, if a row with the same unique key already exists, updates that row (or does nothing). The word is *update* + *insert*. It is not one standard SQL keyword: every engine spells it differently.

📌 **Interview term: conflict target** — the column(s) of a primary key or unique constraint that decide whether the new row "already exists". In \`ON CONFLICT (page)\` the target is \`page\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="UPSERT decision: try to insert the row; if no row has that key it is inserted; if the key exists, DO UPDATE changes the existing row or DO NOTHING leaves it">
  <defs>
    <marker id="sql13q5-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="115" width="170" height="70" rx="8"/>
  <text class="d-text" x="105" y="145" text-anchor="middle">INSERT row</text>
  <text class="d-sub" x="105" y="169" text-anchor="middle">page = /pricing</text>
  <rect class="d-box" x="270" y="115" width="190" height="70" rx="8"/>
  <text class="d-text" x="365" y="145" text-anchor="middle">Key exists?</text>
  <text class="d-sub" x="365" y="169" text-anchor="middle">unique index check</text>
  <rect class="d-box" x="550" y="20" width="190" height="70" rx="8"/>
  <text class="d-text" x="645" y="50" text-anchor="middle">No: insert it</text>
  <text class="d-sub" x="645" y="74" text-anchor="middle">new row</text>
  <rect class="d-box-accent" x="550" y="210" width="190" height="70" rx="8"/>
  <text class="d-text" x="645" y="240" text-anchor="middle">Yes: conflict</text>
  <text class="d-sub" x="645" y="264" text-anchor="middle">DO UPDATE or NOTHING</text>
  <path class="d-edge" d="M 192 150 L 264 150" marker-end="url(#sql13q5-a)"/>
  <path class="d-edge" d="M 462 135 L 544 62" marker-end="url(#sql13q5-a)"/>
  <path class="d-edge-accent" d="M 462 165 L 544 238" marker-end="url(#sql13q5-a)"/>
</svg>

The database tries the insert, and the unique index tells it whether that key is taken. The decision is made at the index, at the moment of the write, which is what makes it safe.

## 3. Why Not Just Check First?

The version most people write first:

~~~sql
SELECT views FROM page_views WHERE page = '/docs';
-- if no row: INSERT ...; else: UPDATE ...
~~~

Two sessions on PostgreSQL 16.15, both counting a view of the new page \`/docs\`:

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` \`SELECT views FROM page_views WHERE page = '/docs';\` no row | \`BEGIN;\` same SELECT, no row |
| 2 | \`INSERT INTO page_views ... VALUES ('/docs', 1, '2026-10-17');\` | |
| 3 | | same INSERT: **waits** on the unique index |
| 4 | \`COMMIT;\` | fails |

Session B got:

~~~text
ERROR:  duplicate key value violates unique constraint "page_views_pkey"
DETAIL:  Key (page)=(/docs) already exists.
~~~

and the counter ended at \`1\` although two views happened. Without the primary key, the table would simply have two \`/docs\` rows. The fix is not a stricter isolation level for this one case; it is to let the database do the check and the write together.

📌 **Interview term: check-then-act race** — a bug where the decision ("no row exists") is made from a read that is already stale by the time you act on it. UPSERT removes the gap.

## 4. ON CONFLICT DO UPDATE (PostgreSQL and SQLite)

PostgreSQL added \`INSERT ... ON CONFLICT\` in 9.5 ([Nordeus engineering: what PostgreSQL 9.5 brings](https://engineering.nordeus.com/what-does-postgres-9-5-bring-to-developers/)), and SQLite copied the syntax in 3.24.0, released 2018-06-04 ([SQLite UPSERT docs](https://www3.sqlite.org/lang_UPSERT.html)). This counts one visit to \`/pricing\` (exists) and one to \`/docs\` (new) in one statement:

~~~sql
INSERT INTO page_views (page, views, last_seen)
VALUES ('/pricing', 1, '2026-10-17'),
       ('/docs',    1, '2026-10-17')
ON CONFLICT (page) DO UPDATE
SET views = page_views.views + excluded.views,
    last_seen = excluded.last_seen;

SELECT page, views, last_seen FROM page_views ORDER BY page;
~~~

~~~text
page | views | last_seen
/blog | 30 | 2026-10-15
/docs | 1 | 2026-10-17
/home | 120 | 2026-10-16
/pricing | 46 | 2026-10-17
~~~

\`/pricing\` went from 45 to 46 and got a new \`last_seen\`; \`/docs\` was inserted with 1. \`/home\` and \`/blog\` were not touched.

📌 **Interview term: excluded** — the pseudo-table that holds the row the INSERT *tried* to write. In the \`DO UPDATE\` part, \`page_views.views\` is the existing row and \`excluded.views\` is the proposed one. Same name in PostgreSQL and SQLite.

The same two sessions as in section 3, now each running this statement for \`/docs\`: session B waited for A's insert, then took the update branch, with no error. The counter ended at:

~~~text
page | views
/docs | 2
~~~

That is the whole point: the unique index serialises the two writers and each one gets a defined outcome. Why exactly this is race-free, and what \`DO UPDATE ... WHERE\` adds, is the subject of [UPSERT with INSERT … ON CONFLICT — how do you insert or update atomically without races?](/interview-question/upsert-with-insert-on-conflict-how-do-you-insert-or-update-atomically-without-ra).

## 5. ON CONFLICT DO NOTHING

Sometimes you only want "insert if absent":

~~~sql
INSERT INTO page_views (page, views, last_seen)
VALUES ('/home', 1, '2026-10-17'),
       ('/about', 1, '2026-10-17')
ON CONFLICT (page) DO NOTHING;

SELECT page, views, last_seen FROM page_views ORDER BY page;
~~~

~~~text
page | views | last_seen
/about | 1 | 2026-10-17
/blog | 30 | 2026-10-15
/home | 120 | 2026-10-16
/pricing | 45 | 2026-10-16
~~~

\`/about\` was new and inserted; \`/home\` existed and was left exactly as it was (120 views, not 1). Typical uses: recording that an event was processed, seeding reference data, idempotent API calls with a client-generated key.

📌 **Interview term: idempotent insert** — an insert that can be repeated safely; the second and later runs change nothing. \`ON CONFLICT DO NOTHING\` on a unique key is the standard way to write one.

## 6. You Need a Unique Constraint

The conflict target must match a primary key or unique constraint (or unique index). Asking for a conflict on \`price_feed.name\`, which has none:

~~~text
PostgreSQL 16:  ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification
SQLite 3.45:    ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint
~~~

So an UPSERT is only as good as the key behind it: decide what "the same row" means, and enforce it with a constraint. See [What is the difference between a primary key and a unique constraint?](/interview-question/what-is-the-difference-between-a-primary-key-and-a-unique-constraint).

## 7. Other Spellings, and Their Traps

| Engine | UPSERT syntax | Notes |
| :--- | :--- | :--- |
| PostgreSQL 9.5+ | \`INSERT ... ON CONFLICT (key) DO UPDATE SET ... / DO NOTHING\` | run here; race-free on the unique index |
| SQLite 3.24+ | same as PostgreSQL; also \`INSERT OR REPLACE\` | run here; \`OR REPLACE\` deletes and re-inserts |
| MySQL | \`INSERT ... ON DUPLICATE KEY UPDATE col = new.col\` | row alias \`AS new\` since 8.0.19; \`VALUES(col)\` in the update clause deprecated since 8.0.20 ([MySQL 8.0 manual](https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html)) |
| SQL Server, Oracle | \`MERGE ... WHEN MATCHED ... WHEN NOT MATCHED ...\` | in SQL Server, concurrent MERGEs can hit key violations unless the target gets \`WITH (HOLDLOCK)\` ([Dan Guzman: UPSERT race condition with MERGE](https://weblogs.sqlteam.com/dang/2009/01/31/upsert-race-condition-with-merge/)) |
| PostgreSQL 15+ | \`MERGE\` as well; \`RETURNING\` on MERGE since 17 ([depesz](https://www.depesz.com/2024/03/19/waiting-for-postgresql-17-add-returning-support-to-merge/)) | not a replacement for \`ON CONFLICT\` under concurrency (run below) |

### The SQLite trap: INSERT OR REPLACE

\`INSERT OR REPLACE\` looks like an upsert, but on a conflict it **deletes** the old row and inserts the new one. Columns you did not list get their defaults:

~~~sql
INSERT OR REPLACE INTO products (sku, name, price, updated_on)
VALUES ('KB-01', 'Keyboard', 45.00, '2026-10-17');

SELECT sku, name, price, stock, updated_on FROM products ORDER BY sku;
~~~

~~~text
sku | name | price | stock | updated_on
HD-03 | Headset | 89 | 5 | 2026-10-01
KB-01 | Keyboard | 45 | 0 | 2026-10-17
MS-02 | Mouse | 19 | 40 | 2026-10-01
~~~

The keyboard price was updated, but its \`stock\` silently dropped from 12 to 0, the column default. (PostgreSQL rejects the statement outright: \`syntax error at or near "OR"\`.) Use \`ON CONFLICT ... DO UPDATE\` instead.

📌 **Interview term: REPLACE semantics** — delete-then-insert on a key conflict (SQLite \`INSERT OR REPLACE\`, MySQL \`REPLACE INTO\`). Different from UPSERT's update-in-place: the old row's other values are lost.

### MERGE in PostgreSQL

\`MERGE\` compares a whole source with a target and runs a branch per row. It shines for syncing a feed:

~~~sql
MERGE INTO products AS p
USING price_feed AS f ON p.sku = f.sku
WHEN MATCHED AND p.price <> f.price THEN
  UPDATE SET price = f.price, updated_on = '2026-10-17'
WHEN NOT MATCHED THEN
  INSERT (sku, name, price, stock, updated_on)
  VALUES (f.sku, f.name, f.price, 0, '2026-10-17');

SELECT sku, name, price, stock, updated_on FROM products ORDER BY sku;
~~~

~~~text
sku | name | price | stock | updated_on
CM-04 | Webcam | 59.00 | 0 | 2026-10-17
HD-03 | Headset | 89.00 | 5 | 2026-10-01
KB-01 | Keyboard | 45.00 | 12 | 2026-10-17
MS-02 | Mouse | 19.00 | 40 | 2026-10-01
~~~

The keyboard price changed (49 to 45), the mouse matched with the same price and was left alone, the webcam was inserted, and the headset (not in the feed) was untouched. But MERGE is not the race-free tool: two sessions running a MERGE for the same new key \`/docs\` on PostgreSQL 16.15 both took the \`NOT MATCHED\` branch, and the second failed after waiting:

~~~text
ERROR:  duplicate key value violates unique constraint "page_views_pkey"
DETAIL:  Key (page)=(/docs) already exists.
~~~

For concurrent single-row upserts in PostgreSQL, use \`ON CONFLICT\`. (SQLite 3.45 has no MERGE: \`near "MERGE": syntax error\`.) For updating from another table without inserts, see [How do you update a table based on another table?](/interview-question/how-do-you-update-a-table-based-on-another-table).

📌 **Interview term: MERGE** — the SQL-standard statement that joins a source to a target and runs \`WHEN MATCHED\` / \`WHEN NOT MATCHED\` actions (update, insert, delete). Powerful for batch syncs; not by itself a concurrency-safe upsert.

## 8. Edge Cases

**The same key twice in one statement.** \`VALUES ('/x', ...), ('/x', ...)\` with \`ON CONFLICT (page) DO UPDATE\`:

~~~text
PostgreSQL 16:  ERROR:  ON CONFLICT DO UPDATE command cannot affect row a second time
                HINT:  Ensure that no rows proposed for insertion within the same command have duplicate constrained values.
SQLite 3.45:    no error; the second row updated the first, and /x ended with views 2
~~~

Deduplicate the input (for example with \`GROUP BY\` or \`DISTINCT ON\`) before the upsert if the code must run on both.

**SQLite parsing quirk.** With \`INSERT ... SELECT ... ON CONFLICT\`, SQLite's documentation notes a parsing ambiguity and recommends adding \`WHERE true\` to the SELECT ([SQLite UPSERT docs](https://www3.sqlite.org/lang_UPSERT.html)). The \`VALUES\` form used here has no such issue.

**Knowing whether it inserted or updated.** PostgreSQL can tell you with \`RETURNING\` and the \`xmax\` trick, and a \`DO UPDATE ... WHERE\` can skip no-op updates; both are in [Advanced UPSERT patterns — conditional updates, xmax detection, and soft-delete-aware indexes?](/interview-question/advanced-upsert-patterns-conditional-updates-xmax-detection-and-soft-delete-awar).

## 9. Verified: Running the Code

The four examples were run by the project verifier: the first three on sql.js 1.10.2 (SQLite 3.45.0) seeded with the schema above, MERGE on PostgreSQL 16.15 in a throwaway database seeded with the same schema. \`ON CONFLICT DO UPDATE\` printed:

~~~text
page | views | last_seen
/blog | 30 | 2026-10-15
/docs | 1 | 2026-10-17
/home | 120 | 2026-10-16
/pricing | 46 | 2026-10-17
~~~

\`ON CONFLICT DO NOTHING\` printed:

~~~text
page | views | last_seen
/about | 1 | 2026-10-17
/blog | 30 | 2026-10-15
/home | 120 | 2026-10-16
/pricing | 45 | 2026-10-16
~~~

\`INSERT OR REPLACE\` printed:

~~~text
sku | name | price | stock | updated_on
HD-03 | Headset | 89 | 5 | 2026-10-01
KB-01 | Keyboard | 45 | 0 | 2026-10-17
MS-02 | Mouse | 19 | 40 | 2026-10-01
~~~

MERGE printed:

~~~text
sku | name | price | stock | updated_on
CM-04 | Webcam | 59.00 | 0 | 2026-10-17
HD-03 | Headset | 89.00 | 5 | 2026-10-01
KB-01 | Keyboard | 45.00 | 12 | 2026-10-17
MS-02 | Mouse | 19.00 | 40 | 2026-10-01
~~~

The first two examples also ran on PostgreSQL 16.15 with identical rows. The check-then-insert race, the concurrent \`ON CONFLICT\` and the concurrent MERGE were run with two real \`psql\` sessions against a scratch PostgreSQL 16.15 database (\`sqlw_b13\`, dropped afterwards); the error messages in sections 6 and 8 come from single runs on both engines.

## Common Pitfalls

- **Check-then-insert in application code.** Two requests both see "no row"; one fails or a duplicate appears. Use one UPSERT statement.
- **No unique constraint behind the conflict target.** PostgreSQL and SQLite reject the statement; define the key first.
- **\`INSERT OR REPLACE\` / \`REPLACE INTO\` as an upsert.** It deletes the old row; unlisted columns reset to their defaults.
- **Overwriting with stale data.** \`SET views = excluded.views\` replaces the count instead of adding to it; for counters write \`page_views.views + excluded.views\`.
- **Duplicate keys in one batch.** PostgreSQL rejects the whole statement; deduplicate first.
- **Treating MERGE as concurrency-safe.** Concurrent MERGEs can both insert; prefer \`ON CONFLICT\` in PostgreSQL, \`HOLDLOCK\` in SQL Server.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An UPSERT inserts a row, or updates the existing row if one with the same key is already there, in <strong style="color:#ffca28;">one statement</strong>. The name is update plus insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why one statement:</strong> <span style="color:#f0e2c8;">The obvious version, SELECT to check and then INSERT or UPDATE, has a gap between check and write. Two sessions both see no row and both insert; in my PostgreSQL run the second one failed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">duplicate key value violates unique constraint</code>. An UPSERT does the check and the write atomically against the unique index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Syntax:</strong> <span style="color:#f0e2c8;">PostgreSQL and SQLite: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT ... ON CONFLICT (page) DO UPDATE SET views = page_views.views + excluded.views</code>, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">excluded</code> is the row you tried to insert, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DO NOTHING</code>. MySQL: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT ... ON DUPLICATE KEY UPDATE</code>. SQL Server and Oracle use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MERGE</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Requirement:</strong> <span style="color:#f0e2c8;">It needs a primary key or unique constraint to define "same row". <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT (name)</code> without a unique index on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name</code> is an error in both PostgreSQL and SQLite.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Traps:</strong> <span style="color:#f0e2c8;">SQLite <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT OR REPLACE</code> is not an update: it deletes and re-inserts, so columns you did not mention go back to their defaults. And <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MERGE</code> is not a race-free upsert: two concurrent MERGEs can both take the insert branch, so prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT</code> in PostgreSQL.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">excluded</code> table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A pseudo-table holding the row the INSERT proposed. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DO UPDATE</code> you refer to the existing row by the table name (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">page_views.views</code>) and to the new values as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">excluded.views</code>. Same spelling in PostgreSQL and SQLite; MySQL 8.0.19+ uses a row alias such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AS new</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when two sessions upsert the same new key at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT DO UPDATE</code> in PostgreSQL, the second waits for the first, then takes the update branch. In my two-session run the counter ended at 2, no error. With check-then-insert the second session got a unique violation instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can one statement upsert the same key twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in PostgreSQL 16: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT DO UPDATE command cannot affect row a second time</code>. SQLite 3.45 accepted it and applied both rows, ending at views 2. Deduplicate the input first if you need portable code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">DO NOTHING</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For idempotent inserts: recording an event or a dedupe key that must exist once, where a second insert should be silently ignored. Note that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DO NOTHING</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RETURNING</code> returns no row for the skipped input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">UPSERT or MERGE?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">UPSERT when the source is one row or a list of rows keyed by a unique constraint and concurrency matters. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MERGE</code> (PostgreSQL 15+) when you sync a whole source table with several conditional branches, including deletes, and can tolerate or serialise concurrent runs.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| UPSERT | Insert a row, or update the existing one with the same key, in one statement |
| Conflict target | The unique or primary-key column(s) that decide whether the row exists |
| Check-then-act race | Deciding from a read that is already stale when you write |
| excluded | Pseudo-table holding the row the INSERT proposed |
| Idempotent insert | An insert that changes nothing when repeated (\`DO NOTHING\`) |
| REPLACE semantics | Delete-then-insert on conflict; other column values are lost |
| MERGE | Standard statement running matched / not-matched actions from a source; not race-free by itself |

**Conclusion:** An UPSERT is "insert, or update if this key already exists", done as one statement so the database checks and writes against the unique index in a single step. That is why it beats checking first: in the two-session run, check-then-insert ended in a duplicate-key error and a lost count, while \`ON CONFLICT DO UPDATE\` made the second writer wait and then add to the count. Write it as \`INSERT ... ON CONFLICT (key) DO UPDATE SET ... excluded...\` in PostgreSQL and SQLite, \`ON DUPLICATE KEY UPDATE\` in MySQL, and \`MERGE\` with care in SQL Server; always have a unique constraint behind it, and avoid SQLite \`INSERT OR REPLACE\`, which quietly reset the keyboard stock to 0 in the example above.`,
    examples: [
      {
        label: `Count page views: insert new pages, add to existing ones (ON CONFLICT DO UPDATE)`,
        code: `INSERT INTO page_views (page, views, last_seen)
VALUES ('/pricing', 1, '2026-10-17'),
       ('/docs',    1, '2026-10-17')
ON CONFLICT (page) DO UPDATE
SET views = page_views.views + excluded.views,
    last_seen = excluded.last_seen;

SELECT page, views, last_seen FROM page_views ORDER BY page;`,
      },
      {
        label: `Insert only if absent: ON CONFLICT DO NOTHING`,
        code: `INSERT INTO page_views (page, views, last_seen)
VALUES ('/home', 1, '2026-10-17'),
       ('/about', 1, '2026-10-17')
ON CONFLICT (page) DO NOTHING;

SELECT page, views, last_seen FROM page_views ORDER BY page;`,
      },
      {
        label: `SQLite pitfall: INSERT OR REPLACE deletes the old row, so stock resets to its default`,
        code: `INSERT OR REPLACE INTO products (sku, name, price, updated_on)
VALUES ('KB-01', 'Keyboard', 45.00, '2026-10-17');

SELECT sku, name, price, stock, updated_on FROM products ORDER BY sku;`,
      },
      {
        label: `PostgreSQL 15+: sync products from a price feed with MERGE`,
        code: `MERGE INTO products AS p
USING price_feed AS f ON p.sku = f.sku
WHEN MATCHED AND p.price <> f.price THEN
  UPDATE SET price = f.price, updated_on = '2026-10-17'
WHEN NOT MATCHED THEN
  INSERT (sku, name, price, stock, updated_on)
  VALUES (f.sku, f.name, f.price, 0, '2026-10-17');

SELECT sku, name, price, stock, updated_on FROM products ORDER BY sku;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
